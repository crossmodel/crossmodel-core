/********************************************************************************
 * Copyright (c) 2024 CrossBreeze.
 ********************************************************************************/

import { ModelService } from '@crossmodel/model-service/lib/common';
import { ModelFileExtensions, ModelStructure } from '@crossmodel/protocol';
import { Emitter, MaybePromise } from '@theia/core';
import { DepthFirstTreeIterator, LabelProvider, LabelProviderContribution, Tree, TreeDecorator, TreeNode } from '@theia/core/lib/browser';
import { WidgetDecoration } from '@theia/core/lib/browser/widget-decoration';
import { inject, injectable, postConstruct } from '@theia/core/shared/inversify';
import { FileStatNode } from '@theia/filesystem/lib/browser';

@injectable()
export class CrossModelLabelProvider implements LabelProviderContribution, TreeDecorator {
   id = 'CrossModelLabelProvider';

   @inject(LabelProvider) protected readonly labelProvider: LabelProvider;
   @inject(ModelService) protected readonly modelService: ModelService;

   protected readonly decorationsChangedEmitter = new Emitter();
   readonly onDidChangeDecorations = this.decorationsChangedEmitter.event;

   @postConstruct()
   protected init(): void {
      this.modelService.onReady(() => this.fireDidChangeDecorations(tree => this.collectDecorators(tree)));
      this.modelService.onDataModelUpdate(() => this.fireDidChangeDecorations(tree => this.collectDecorators(tree)));
   }

   canHandle(element: object): number {
      return FileStatNode.is(element) ? 100 : 0;
   }

   getIcon(node: FileStatNode): string {
      if (this.isDataModelDirectory(node)) {
         return ModelStructure.DataModel.ICON_CLASS + ' default-folder-icon';
      }
      const modelFileIcon = ModelFileExtensions.getIconClass(node.uri.toString());
      return modelFileIcon ? modelFileIcon + ' default-file-icon' : this.labelProvider.getIcon(node.fileStat);
   }

   getName(node: FileStatNode): string | undefined {
      if (this.isDataModelDirectory(node)) {
         return this.modelService.dataModels.find(dataModel => dataModel.directory === node.fileStat.resource.path.fsPath())?.name;
      }
      return this.labelProvider.getName(node.fileStat);
   }

   protected fireDidChangeDecorations(event: (tree: Tree) => Map<string, WidgetDecoration.Data>): void {
      this.decorationsChangedEmitter.fire(event);
   }

   decorations(tree: Tree): MaybePromise<Map<string, WidgetDecoration.Data>> {
      return this.collectDecorators(tree);
   }

   // Add workspace root as caption suffix and italicize if PreviewWidget
   protected collectDecorators(tree: Tree): Map<string, WidgetDecoration.Data> {
      const result = new Map<string, WidgetDecoration.Data>();
      if (tree.root === undefined) {
         return result;
      }
      for (const node of new DepthFirstTreeIterator(tree.root)) {
         if (FileStatNode.is(node) && this.isDataModelDirectory(node)) {
            const decorations: WidgetDecoration.Data = {
               captionSuffixes: [{ data: 'Data Model' }]
            };
            result.set(node.id, decorations);
         }
      }
      return result;
   }

   protected isDataModelDirectory(node?: TreeNode): boolean {
      return (
         FileStatNode.is(node) &&
         node.fileStat.isDirectory &&
         this.modelService.dataModels.some(dataModel => dataModel.directory === node.fileStat.resource.path.fsPath())
      );
   }
}
