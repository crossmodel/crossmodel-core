/********************************************************************************
 * Copyright (c) 2024 CrossBreeze.
 ********************************************************************************/

import { CrossModelWidget } from '@crossmodel/core/lib/browser';
import { FormEditorOpenHandler, FormEditorWidget } from '@crossmodel/form-client/lib/browser';
import { MappingDiagramManager, SystemDiagramManager } from '@crossmodel/glsp-client/lib/browser/';
import { MappingDiagramLanguage, SystemDiagramLanguage } from '@crossmodel/glsp-client/lib/common';
import { ModelService } from '@crossmodel/model-service/lib/common';
import { DataModelType, ModelFileExtensions, ModelFileType, codiconCSSString, getSemanticRoot } from '@crossmodel/protocol';
import { FocusStateChangedAction, SetDirtyStateAction, toTypeGuard } from '@eclipse-glsp/client';
import { GLSPDiagramWidget, GLSPDiagramWidgetContainer, GLSPDiagramWidgetOptions, GLSPSaveable } from '@eclipse-glsp/theia-integration';
import { GLSPDiagramLanguage } from '@eclipse-glsp/theia-integration/lib/common';
import { URI } from '@theia/core';
import {
   BaseWidget,
   BoxLayout,
   CompositeSaveable,
   LabelProvider,
   Message,
   Navigatable,
   NavigatableWidgetOptions,
   SaveOptions,
   Saveable,
   StatefulWidget,
   TabPanel,
   Widget,
   WidgetManager
} from '@theia/core/lib/browser';
import { BinaryBuffer } from '@theia/core/lib/common/buffer';
import { Deferred } from '@theia/core/lib/common/promise-util';
import { SelectionService } from '@theia/core/lib/common/selection-service';
import { inject, injectable, postConstruct } from '@theia/core/shared/inversify';
import { EditorPreviewWidget } from '@theia/editor-preview/lib/browser/editor-preview-widget';
import { EditorPreviewWidgetFactory } from '@theia/editor-preview/lib/browser/editor-preview-widget-factory';
import { EditorOpenerOptions, EditorWidget } from '@theia/editor/lib/browser';
import * as monaco from '@theia/monaco-editor-core';
import { MonacoEditorModel } from '@theia/monaco/lib/browser/monaco-editor-model';
import { CompositeEditorOptions, createCompositeEditorId } from './composite-editor-open-handler';
import { CrossModelEditorManager } from './cross-model-editor-manager';
import { CrossModelFileResourceResolver } from './cross-model-file-resource-resolver';
import { DefaultSaveAsSaveableSource } from './cross-model-saveable-service';

export class ReverseCompositeSaveable
   extends CompositeSaveable
   implements Required<Pick<Saveable, 'serialize' | 'createSnapshot' | 'applySnapshot'>>
{
   constructor(
      protected editor: CompositeEditor,
      protected fileResourceResolver: CrossModelFileResourceResolver
   ) {
      super();
   }

   override get saveables(): readonly Saveable[] {
      // reverse order so we save the text editor first as otherwise we'll get a message that something changed on the file system
      return Array.from(this.saveablesMap.keys()).reverse();
   }

   override async save(options?: SaveOptions): Promise<void> {
      // we do not want the overwrite dialog to appear since we are syncing manually
      await this.editor.idle();
      const autoOverwrite = this.fileResourceResolver.autoOverwrite;
      try {
         this.fileResourceResolver.autoOverwrite = true;
         const activeEditor = this.editor.activeWidget();
         const activeSaveable = Saveable.get(activeEditor);
         // If the active saveable is a GLSP diagram saveable, prefer a targeted
         // server-side save: request the current semantic model for the URI and
         // call modelService.save with clientId='save'. That ensures a single
         // server write persists the canonical model to disk even when the
         // diagram is active. If this path fails, fall back to saving all
         // individual saveables.
         if (activeSaveable instanceof GLSPSaveable) {
            try {
               const ok = await this.editor.saveSemanticModel('save');
               if (ok) {
                  // Clear dirty state for all saveables (including the active GLSPSaveable)
                  this.resetDirtyState();
                  return;
               }
            } catch (e) {
               console.error('[ReverseCompositeSaveable] server-side save failed, falling back to per-saveable saves', e);
               // fall through to per-saveable saving below
            }
         }

         // Fallback / default: save all saveables in reverse order (text editor first)
         for (const saveable of this.saveables) {
            try {
               await saveable.save(options);
            } catch (e) {
               console.error('[ReverseCompositeSaveable] save failed for', saveable, e);
            }
         }
         // After saving all saveables, ensure they are marked as not dirty.
         this.resetDirtyState(activeSaveable);
      } finally {
         this.fileResourceResolver.autoOverwrite = autoOverwrite;
      }
   }

   async serialize(): Promise<BinaryBuffer> {
      await this.editor.idle();
      for (const saveable of this.saveables) {
         if (typeof saveable.createSnapshot === 'function') {
            const snapshot = saveable.createSnapshot();
            return BinaryBuffer.fromString(Saveable.Snapshot.read(snapshot) ?? '');
         }
         if (typeof saveable.serialize === 'function') {
            return saveable.serialize();
         }
      }
      throw new Error('Found no serializable saveable!');
   }

   createSnapshot(): Saveable.Snapshot {
      for (const saveable of this.saveables) {
         if (typeof saveable.createSnapshot === 'function') {
            const snapshot = saveable.createSnapshot();
            // we read the value here to avoid read being disposed before the snapshot is applied, e.g., reading Monaco text model
            // eslint-disable-next-line no-null/no-null
            const value = Saveable.Snapshot.read(snapshot) ?? null;
            return { read: () => value };
         }
      }
      // eslint-disable-next-line no-null/no-null
      return { read: () => null };
   }

   async applySnapshot(snapshot: object): Promise<void> {
      await this.editor.idle();
      for (const saveable of this.saveables) {
         if (typeof saveable.applySnapshot === 'function') {
            saveable?.applySnapshot?.(snapshot);
            return;
         }
      }
   }

   /**
    * Delegate undo to the editor's undo method.
    */
   undo(): void {
      this.editor.undo();
   }

   /**
    * Delegate redo to the editor's redo method.
    */
   redo(): void {
      this.editor.redo();
   }

   /**
    * Reset the dirty state (without triggering an additional save) of the non-active saveables after a save operation.
    */
   protected resetDirtyState(activeSaveable?: Saveable): void {
      this.saveables
         .filter(saveable => saveable !== activeSaveable)
         .forEach(saveable => {
            if (saveable instanceof MonacoEditorModel) {
               saveable['setDirty'](false);
            } else if (saveable instanceof GLSPSaveable) {
               saveable['actionDispatcher'].dispatch(SetDirtyStateAction.create(false));
            } else if (saveable instanceof CrossModelWidget) {
               saveable.setDirty(false);
            }
         });
   }

   override async revert(options?: Saveable.RevertOptions): Promise<void> {
      await this.editor.idle();
      if (this.editor.getResourceUri().scheme === 'file') {
         // for file resources, we can revert to the last saved state
         return super.revert(options);
      }
      // for non-file, untitled resources, we do not care about the content and just reset the dirty state
      this.resetDirtyState();
   }
}

export interface CompositeWidgetOptions extends NavigatableWidgetOptions {
   version?: number;
}

@injectable()
export class CompositeEditor
   extends BaseWidget
   implements DefaultSaveAsSaveableSource, Navigatable, Partial<GLSPDiagramWidgetContainer>, StatefulWidget
{
   @inject(CompositeEditorOptions) protected options: CompositeEditorOptions;
   @inject(LabelProvider) protected labelProvider: LabelProvider;
   @inject(WidgetManager) protected widgetManager: WidgetManager;
   @inject(CrossModelEditorManager) protected editorManager: CrossModelEditorManager;
   @inject(CrossModelFileResourceResolver) protected fileResourceResolver: CrossModelFileResourceResolver;
   @inject(ModelService) protected readonly modelService: ModelService;
   @inject(SelectionService) protected readonly selectionService: SelectionService;

   protected tabPanel: TabPanel;
   saveable: ReverseCompositeSaveable;
   protected initialized = new Deferred<void>();

   protected _resourceUri?: URI;
   protected get resourceUri(): URI {
      if (!this._resourceUri) {
         this._resourceUri = new URI(this.options.uri);
      }
      return this._resourceUri;
   }

   get uri(): string {
      return this.options.uri;
   }

   get fileType(): Exclude<ModelFileType, 'Generic'> {
      return this.options.fileType;
   }

   get diagramWidget(): GLSPDiagramWidget | undefined {
      if (this.tabPanel.currentWidget instanceof GLSPDiagramWidget) {
         return this.tabPanel.currentWidget;
      }
      return undefined;
   }

   @postConstruct()
   protected init(): void {
      this.id = createCompositeEditorId(this.options.uri);
      this.addClass('cm-composite-editor');
      this.title.closable = true;
      this.title.label = this.labelProvider.getName(this.resourceUri);
      this.title.caption = this.resourceUri.path.fsPath();
      this.title.iconClass = ModelFileType.getIconClass(this.fileType) ?? '';
      this.saveable = new ReverseCompositeSaveable(this, this.fileResourceResolver);
      this.initializeContent();
   }

   protected async initializeContent(): Promise<void> {
      const layout = (this.layout = new BoxLayout({ direction: 'top-to-bottom', spacing: 0 }));
      this.tabPanel = new TabPanel({ tabPlacement: 'bottom', tabsMovable: false });
      this.tabPanel.tabBar.addClass('theia-app-centers');
      BoxLayout.setStretch(this.tabPanel, 1);
      this.tabPanel.currentChanged.connect((_, event) => this.handleCurrentWidgetChanged(event));
      layout.addWidget(this.tabPanel);

      // create code editor first as Monaco has it's own version number management
      const codeWidget = await this.createCodeWidget(this.options);
      const version = monaco.editor.getModel(monaco.Uri.parse(this.options.uri))?.getVersionId() ?? 0;
      const options: CompositeWidgetOptions = { ...this.options, version };
      const primaryWidget = await this.createPrimaryWidget(options);

      this.addWidget(primaryWidget);
      this.addWidget(codeWidget);

      if (this.options.perspective === 'code') {
         this.revealCodeTab();
      } else {
         this.tabPanel.currentWidget = primaryWidget;
      }

      this.update();
      this.initialized.resolve();
   }

   protected addWidget(widget: Widget): void {
      this.tabPanel.addWidget(widget);
      const saveable = Saveable.get(widget);
      if (saveable) {
         this.saveable.add(saveable);
      }
   }

   async idle(): Promise<void> {
      await this.initialized.promise;
      await Promise.all(this.getCrossModelWidgets().map(widget => widget.idle()));
   }

   getResourceUri(): URI {
      return new URI(this.options.uri);
   }

   /**
    * Helper to request the current semantic model for this composite resource
    * and persist it via the ModelService. Returns true on success.
    */
   async saveSemanticModel(clientId = 'save'): Promise<boolean> {
      try {
         const doc = await this.modelService.request(this.uri);
         if (!doc) {
            return false;
         }
         await this.modelService.save({ uri: this.uri, model: doc.root, clientId });
         return true;
      } catch (e) {
         console.error('[CompositeEditor] saveSemanticModel failed for', this.uri, e);
         return false;
      }
   }

   /** Updates ID of untitled editor to match user's name input. */
   async getSaveAsUri(): Promise<URI | undefined> {
      if (this.resourceUri.scheme === 'file') {
         return;
      }
      await this.idle();
      const uri = this.resourceUri.toString();
      const document = await this.modelService.open({ uri, clientId: 'save' });
      try {
         if (!document) {
            return;
         }
         const node = getSemanticRoot(document.root);
         if (!node) {
            return;
         }
         if (node.$type === DataModelType) {
            // replace the parent directory name of the file with the user-specified id
            return this.resourceUri.withScheme('file').parent.parent.resolve(node.id).resolve(this.resourceUri.path.base);
         } else {
            // replace the default base name of the file with the user-specified id
            return this.resourceUri.withScheme('file').parent.resolve(`${node.id}${ModelFileExtensions.getFileExtension(uri)}`);
         }
      } finally {
         await this.modelService.close({ uri, clientId: 'save' });
      }
   }

   protected override onActivateRequest(msg: Message): void {
      super.onActivateRequest(msg);
      this.initialized.promise.then(() => this.activeWidget()?.activate());
   }

   protected handleCurrentWidgetChanged(event: TabPanel.ICurrentChangedArgs): void {
      // Forward focus state changes to the diagram widget
      if (event.previousWidget instanceof GLSPDiagramWidget && event.previousWidget.hasFocus) {
         event.previousWidget.actionDispatcher.dispatch(FocusStateChangedAction.create(false));
      } else if (event.currentWidget instanceof GLSPDiagramWidget && !event.currentWidget.hasFocus) {
         event.currentWidget.actionDispatcher.dispatch(FocusStateChangedAction.create(true));
      }

      if (event.currentWidget instanceof CrossModelWidget) {
         const isAnyEditorDirty = this.saveable.saveables.some((saveable: Saveable) => saveable.dirty);
         if (isAnyEditorDirty && !event.currentWidget.dirty) {
            event.currentWidget.setDirty(true);
         }
      }
   }

   /**
    * Delegate undo to the currently active widget if it supports it.
    */
   undo(): void {
      const activeWidget = this.activeWidget();
      if (activeWidget && typeof (activeWidget as any).undo === 'function') {
         (activeWidget as any).undo();
      }
   }

   /**
    * Delegate redo to the currently active widget if it supports it.
    */
   redo(): void {
      const activeWidget = this.activeWidget();
      if (activeWidget && typeof (activeWidget as any).redo === 'function') {
         (activeWidget as any).redo();
      }
   }

   protected override onCloseRequest(msg: Message): void {
      this.selectionService.selection = undefined;
      this.tabPanel.widgets.forEach(widget => widget.close());
      super.onCloseRequest(msg);
      this.dispose();
      this.selectionService.selection = undefined;
   }

   protected createDiagramWidgetOptions(language: GLSPDiagramLanguage, label?: string): GLSPDiagramWidgetOptions {
      return {
         diagramType: language.diagramType,
         kind: 'navigatable',
         uri: this.uri,
         iconClass: language.iconClass ?? codiconCSSString('type-hierarchy-sub'),
         label: label ?? this.labelProvider.getName(this.resourceUri),
         editMode: 'editable'
      };
   }

   protected async createPrimaryWidget(options: CompositeWidgetOptions): Promise<Widget> {
      switch (this.fileType) {
         case 'DataModel':
            return this.createFormWidget(options);
         case 'LogicalEntity':
            return this.createFormWidget(options);
         case 'Relationship':
            return this.createFormWidget(options);
         case 'SystemDiagram':
            return this.createSystemDiagramWidget();
         case 'Mapping':
            return this.createMappingDiagramWidget();
      }
   }

   protected async createCodeWidget(options: CompositeWidgetOptions): Promise<Widget> {
      const codeWidget = await this.widgetManager.getOrCreateWidget<EditorPreviewWidget>(EditorPreviewWidgetFactory.ID, { ...options });
      codeWidget.title.label = 'Code Editor';
      codeWidget.title.iconClass = codiconCSSString('code');
      codeWidget.title.closable = false;
      return codeWidget;
   }

   protected async createFormWidget(options: CompositeWidgetOptions): Promise<Widget> {
      const formEditor = await this.widgetManager.getOrCreateWidget<FormEditorWidget>(FormEditorOpenHandler.ID, { ...options });
      formEditor.title.label = 'Form Editor';
      formEditor.title.iconClass = codiconCSSString('symbol-keyword');
      formEditor.title.closable = false;
      return formEditor;
   }

   protected async createSystemDiagramWidget(): Promise<Widget> {
      const diagramOptions = this.createDiagramWidgetOptions(SystemDiagramLanguage, 'Diagram');
      const widget = await this.widgetManager.getOrCreateWidget<GLSPDiagramWidget>(SystemDiagramManager.ID, diagramOptions);
      widget.title.closable = false;
      return widget;
   }

   protected async createMappingDiagramWidget(): Promise<Widget> {
      const diagramOptions = this.createDiagramWidgetOptions(MappingDiagramLanguage, 'Mapping Diagram');
      const widget = await this.widgetManager.getOrCreateWidget<GLSPDiagramWidget>(MappingDiagramManager.ID, diagramOptions);
      widget.title.closable = false;
      return widget;
   }

   getPrimaryWidget(): GLSPDiagramWidget | FormEditorWidget | undefined {
      return this.tabPanel.widgets.find(widget => widget instanceof GLSPDiagramWidget || widget instanceof FormEditorWidget);
   }

   getCodeWidget(): EditorWidget | undefined {
      return this.tabPanel.widgets.find<EditorWidget>(toTypeGuard(EditorWidget));
   }

   getCrossModelWidgets(): CrossModelWidget[] {
      return this.tabPanel.widgets.filter(toTypeGuard(CrossModelWidget));
   }

   createMoveToUri(resourceUri: URI): URI | undefined {
      return this.getResourceUri().withPath(resourceUri.path);
   }

   revealCodeTab(options?: EditorOpenerOptions): void {
      const codeWidget = this.getCodeWidget();
      if (codeWidget) {
         this.tabPanel.currentWidget = codeWidget;
         this.editorManager.revealSelection(codeWidget, this.resourceUri, options);
      }
   }

   activeWidget(): Widget | undefined {
      return this.tabPanel.currentWidget ?? undefined;
   }

   storeState(): object | undefined {
      return {
         primaryWidget: this.getPrimaryWidget()?.storeState(),
         codeWidget: this.getCodeWidget()?.storeState()
      };
   }

   async restoreState(oldState: any): Promise<void> {
      await this.idle();
      this.getPrimaryWidget()?.restoreState(oldState.primaryWidget);
      this.getCodeWidget()?.restoreState(oldState.codeWidget);
   }
}
