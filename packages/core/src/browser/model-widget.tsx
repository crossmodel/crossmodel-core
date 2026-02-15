/********************************************************************************
 * Copyright (c) 2023 CrossBreeze.
 ********************************************************************************/

import { ModelService, ModelServiceClient } from '@crossmodel/model-service/lib/common';
import {
   AttributeMappingTargetType,
   AttributeMappingType,
   CrossModelDocument,
   CrossModelRoot,
   ModelDiagnostic,
   ModelUpdatedEvent,
   RenderProps
} from '@crossmodel/protocol';
import {
   DataModelComponent,
   EntityComponent,
   ErrorView,
   MappingComponent,
   MappingRenderProps,
   ModelProviderProps,
   NewMappingRenderProps,
   OpenCallback,
   RelationshipComponent,
   SaveCallback,
   SourceObjectComponent,
   SourceObjectRenderProps
} from '@crossmodel/react-model-ui';
import { Emitter, Event, ResourceProvider } from '@theia/core';
import { ApplicationShell, LabelProvider, Message, OpenerService, ReactWidget, Saveable, open } from '@theia/core/lib/browser';
import { ThemeService } from '@theia/core/lib/browser/theming';
import URI from '@theia/core/lib/common/uri';
import { inject, injectable, postConstruct } from '@theia/core/shared/inversify';
import debounce from '@theia/core/shared/lodash.debounce';
import * as React from '@theia/core/shared/react';
// MonacoEditorModel import removed; we use duck-typing to clear dirty state
import deepEqual from 'fast-deep-equal';

export const CrossModelWidgetOptions = Symbol('CrossModelWidgetOptions');
export interface CrossModelWidgetOptions {
   clientId: string;
   widgetId: string;
   uri?: string;
   version?: number;
}

@injectable()
export class CrossModelWidget extends ReactWidget implements Saveable {
   @inject(CrossModelWidgetOptions) protected options: CrossModelWidgetOptions;
   @inject(LabelProvider) protected labelProvider: LabelProvider;
   @inject(ModelService) protected readonly modelService: ModelService;
   @inject(ModelServiceClient) protected serviceClient: ModelServiceClient;
   @inject(ThemeService) protected readonly themeService: ThemeService;
   @inject(OpenerService) protected readonly openerService: OpenerService;
   @inject(ResourceProvider) protected readonly resourceProvider: ResourceProvider;
   @inject(ApplicationShell) protected readonly shell: ApplicationShell;

   protected readonly onDirtyChangedEmitter = new Emitter<void>();
   onDirtyChanged: Event<void> = this.onDirtyChangedEmitter.event;
   protected readonly onContentChangedEmitter = new Emitter<void>();
   onContentChanged: Event<void> = this.onContentChangedEmitter.event;
   dirty = false;

   protected document?: CrossModelDocument;
   protected error: string | undefined;

   @postConstruct()
   init(): void {
      this.id = this.options.widgetId;
      this.title.closable = true;

      this.setModel(this.options.uri);

      this.toDispose.pushAll([
         this.serviceClient.onModelUpdate(event => this.handleUpdate(event)),
         this.themeService.onDidColorThemeChange(() => this.update())
      ]);
   }

   protected async setModel(uri?: string): Promise<void> {
      if (this.document?.uri) {
         await this.closeModel(this.document.uri.toString());
      }
      this.document = uri ? await this.openModel(uri) : undefined;
      this.setDirty(false);
      this.update();
      this.focusInput();
   }

   protected async closeModel(uri: string): Promise<void> {
      this.document = undefined;
      await this.modelService.close({ clientId: this.options.clientId, uri });
   }

   protected async openModel(uri: string): Promise<CrossModelDocument | undefined> {
      try {
         const { clientId, version } = this.options;
         const documentUri = new URI(uri);
         const text =
            documentUri.scheme === 'file'
               ? undefined // The server can read files on disk.
               : await this.resourceProvider(documentUri).then(resource => resource.readContents());
         const document = await this.modelService.open({ clientId, version, text, uri });
         return document;
      } catch (error) {
         this.error = error instanceof Error ? error.message : (error?.toString() ?? 'Unknown error.');
         return undefined;
      }
   }

   setDirty(dirty: boolean): void {
      if (dirty === this.dirty) {
         return;
      }

      this.dirty = dirty;
      this.onDirtyChangedEmitter.fire();
      this.update();
   }

   async idle(): Promise<void> {
      // flush and await any pending updates
      await this.handleUpdateRequest.flush();
   }

   async save(): Promise<void> {
      await this.idle();
      return this.saveModel();
   }

   protected async handleUpdate({ document, reason, sourceClientId }: ModelUpdatedEvent): Promise<void> {
      if (
         this.document?.uri === document.uri &&
         (!deepEqual(this.document.root, document.root) || !deepEqual(this.document.diagnostics, document.diagnostics))
      ) {
         console.debug(`[${this.options.clientId}] Receive update from ${sourceClientId} due to '${reason}'`);
         if (sourceClientId !== this.options.clientId && reason !== 'saved') {
            // Save events are confirmations that the file was written to disk.
            // They never carry new content — only sync diagnostics.
            // The language client may also fire a save event (with sourceClientId='language-client')
            // when it detects the file change, which must not overwrite the form's React state.
            this.document = document;
            this.update();
         } else {
            this.document.diagnostics = document.diagnostics;
            this.update();
         }
      }
   }

   protected async sendUpdate(root: CrossModelRoot): Promise<void> {
      if (this.document && !deepEqual(this.document.root, root)) {
         this.document.root = root;
         this.setDirty(true);
         this.onContentChangedEmitter.fire();
         console.debug(`[${this.options.clientId}] Send update to server`);
         // Do not use the returned document to avoid overwriting keystrokes typed during the server round-trip.
         // Diagnostics are synced separately via the handleUpdate event listener.
         await this.modelService.update({ uri: this.document.uri, model: root, clientId: this.options.clientId });
      }
   }

   async revert(options?: Saveable.RevertOptions | undefined): Promise<void> {
      // empty implementation
   }

   protected async saveModel(doc = this.document): Promise<void> {
      if (doc === undefined) {
         throw new Error('Cannot save undefined model');
      }
      if (ModelDiagnostic.hasErrors(doc.diagnostics)) {
         // we do not support saving erroneous models in model widgets as we cannot deal with them properly, fixes are done via code editor
         console.debug(`[${this.options.clientId}] Abort Save as we have an erroneous model`);
         return;
      }
      console.debug(`[${this.options.clientId}] Save model`);
      try {
         await this.modelService.save({ uri: doc.uri.toString(), model: doc.root, clientId: this.options.clientId });
         // Mark this widget clean
         this.setDirty(false);
         // Also clear dirty state on diagram and editor saveables for the same URI
         const uriStr = doc.uri.toString();
         try {
            // Try to find the composite editor for this URI (id prefix used by open handler)
            const compositePrefix = 'cm-composite-editor-handler:' + uriStr;
            for (const w of this.shell.widgets) {
               const anyW: any = w as any;
               try {
                  if (
                     anyW &&
                     typeof anyW.id === 'string' &&
                     anyW.id.startsWith(compositePrefix) &&
                     anyW.tabPanel &&
                     Array.isArray(anyW.tabPanel.widgets)
                  ) {
                     for (const child of anyW.tabPanel.widgets) {
                        try {
                           const saveable = Saveable.get(child as any);
                           if (saveable && typeof (saveable as any).setDirty === 'function') {
                              (saveable as any).setDirty(false);
                           } else if (typeof (child as any).setDirty === 'function') {
                              (child as any).setDirty(false);
                           }
                        } catch (e) {
                           /* ignore child errors */
                        }
                     }
                  }
               } catch (e) {
                  /* ignore */
               }
            }
         } catch (e) {
            console.error('[CrossModelWidget] clearing other saveables failed', e);
         }
      } catch (e) {
         console.error(`[${this.options.clientId}] Save model failed for ${doc.uri}`, e);
         throw e;
      }
   }

   protected async openModelInEditor(): Promise<void> {
      if (this.document?.uri === undefined) {
         throw new Error('Cannot open undefined model');
      }
      open(this.openerService, new URI(this.document.uri));
   }

   protected getModelProviderProps(): ModelProviderProps {
      return {
         document: this.document!,
         dirty: this.dirty,
         onModelUpdate: this.handleUpdateRequest,
         onModelSave: this.handleSaveRequest,
         onModelOpen: this.handleOpenRequest,
         modelQueryApi: this.modelService
      };
   }

   protected handleUpdateRequest = debounce(async (root: CrossModelRoot): Promise<void> => this.sendUpdate(root), 200);

   protected handleSaveRequest?: SaveCallback = () => this.save();

   protected handleOpenRequest?: OpenCallback = () => this.openModelInEditor();

   override close(): void {
      if (this.document) {
         this.closeModel(this.document.uri.toString());
      }
      super.close();
   }

   render(): React.ReactNode {
      if (this.document?.root?.datamodel) {
         return <DataModelComponent {...this.getModelProviderProps()} {...this.getRenderProperties()} />;
      }
      if (this.document?.root?.entity) {
         return <EntityComponent {...this.getModelProviderProps()} {...this.getRenderProperties()} />;
      }
      if (this.document?.root?.relationship) {
         return <RelationshipComponent {...this.getModelProviderProps()} {...this.getRenderProperties()} />;
      }
      if (this.document?.root?.mapping) {
         const renderProps = this.getRenderProperties();
         if (renderProps.mappingIndex !== undefined && renderProps.mappingIndex >= 0) {
            const mappingProps = renderProps as RenderProps & MappingRenderProps;
            return <MappingComponent {...this.getModelProviderProps()} {...mappingProps} />;
         }
         if (renderProps?.attributeId) {
            const mappingProps = renderProps as RenderProps & NewMappingRenderProps;
            let mappingIndex = this.document.root.mapping.target.mappings.findIndex(
               mapping => mapping.attribute?.value === mappingProps.attributeId
            );
            if (mappingIndex === -1) {
               this.document.root.mapping.target.mappings.push({
                  $type: AttributeMappingType,
                  sources: [],
                  expressions: [],
                  attribute: {
                     $type: AttributeMappingTargetType,
                     value: mappingProps.attributeId
                  },
                  customProperties: []
               });
               mappingIndex = this.document.root.mapping.target.mappings.length - 1;
            }
            return <MappingComponent {...this.getModelProviderProps()} {...mappingProps} mappingIndex={mappingIndex} />;
         }
         if (renderProps.sourceObjectIndex !== undefined && renderProps?.sourceObjectIndex >= 0) {
            const sourceObjectRenderProps = renderProps as RenderProps & SourceObjectRenderProps;
            return <SourceObjectComponent {...this.getModelProviderProps()} {...sourceObjectRenderProps} />;
         }
      }
      if (this.error) {
         return <ErrorView errorMessage={this.error} />;
      }
      return <div className='theia-widget-noInfo'>No properties available.</div>;
   }

   protected getRenderProperties(): RenderProps & Partial<MappingRenderProps & NewMappingRenderProps & SourceObjectRenderProps> {
      return {
         theme: this.themeService.getCurrentTheme().type
      };
   }

   protected focusInput(): void {
      setTimeout(() => {
         document.activeElement;
         const inputs = this.node.getElementsByTagName('input');
         if (inputs.length > 0) {
            inputs[0].focus();
         }
      }, 50);
   }

   protected override onActivateRequest(msg: Message): void {
      super.onActivateRequest(msg);
      this.focusInput();
   }
}
