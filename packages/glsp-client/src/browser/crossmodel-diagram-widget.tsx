/********************************************************************************
 * Copyright (c) 2025 CrossBreeze.
 ********************************************************************************/

import { getAbsolutePosition } from '@eclipse-glsp/client';
import { GLSPDiagramWidget } from '@eclipse-glsp/theia-integration';
import { Message } from '@theia/core/lib/browser';
import { TreeWidgetSelection } from '@theia/core/lib/browser/tree/tree-widget-selection';
import { FileNavigatorWidget } from '@theia/navigator/lib/browser/navigator-widget';

import { DropFilesOperation } from '@crossmodel/protocol';
import { injectable } from '@theia/core/shared/inversify';
import { FileNode } from '@theia/filesystem/lib/browser';

/**
 * Customization of the default GLSP diagram widget that adds support for dropping files from the file navigator on the diagram.
 */
@injectable()
export class CrossModelDiagramWidget extends GLSPDiagramWidget {
   protected override onAfterAttach(msg: Message): void {
      // Add a DOM listener for the drop event on this node.
      // See https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener
      // and  https://developer.mozilla.org/en-US/docs/Web/Events for more details and possible events.
      this.addEventListener(this.node, 'drop', evt => this.onDrop(evt), true);
      super.onAfterAttach(msg);
   }

   protected onDrop(event: DragEvent): void {
      const selectedFilePaths = this.getSelectedFilePaths(event);
      if (selectedFilePaths.length > 0) {
         event.preventDefault();
         event.stopPropagation();
         const position = getAbsolutePosition(this.editorContext.modelRoot, event);
         this.actionDispatcher.dispatch(DropFilesOperation.create(selectedFilePaths, position));
      }
   }

   protected getSelectedFilePaths(event: DragEvent): string[] {
      const currentSelection = this.theiaSelectionService.selection;
      if (TreeWidgetSelection.is(currentSelection) && currentSelection.source instanceof FileNavigatorWidget) {
         // the data-key is defined in the tree implementation of Theia but not as a constant
         const data = event.dataTransfer?.getData('selected-tree-nodes');
         const selectedNodeIds: string[] = JSON.parse(data ?? '[]');
         const selectedFileNodes = selectedNodeIds.map(id => currentSelection.source.model.getNode(id)).filter(FileNode.is);
         return selectedFileNodes.map(node => node.uri.path.fsPath());
      }
      return [];
   }
}
