/********************************************************************************
 * Copyright (c) 2025 CrossBreeze.
 ********************************************************************************/

import {
   ENTITY_NODE_TYPE,
   INHERITANCE_EDGE_TYPE,
   ModelFileExtensions,
   OpenCompositeEditorAction,
   RELATIONSHIP_EDGE_TYPE,
   SemanticUri,
   TriggerSystemEdgeCreationAction,
   TriggerSystemNodeCreationAction
} from '@crossmodel/protocol';
import {
   DeleteElementOperation,
   EditorContextService,
   GModelRoot,
   IContextMenuItemProvider,
   MenuItem,
   Point,
   SelectionService,
   isArgsAware,
   isDeletable
} from '@eclipse-glsp/client';
import { inject, injectable } from '@theia/core/shared/inversify';

import { CrossModelMousePositionTracker } from '../../cross-model-command-palette';

/**
 * Context menu provider for the system diagram.
 * Provides context-specific menu items based on the element type (entity, canvas, relationship, etc.).
 */
@injectable()
export class SystemDiagramContextMenuProvider implements IContextMenuItemProvider {
   @inject(CrossModelMousePositionTracker) protected readonly mousePositionTracker: CrossModelMousePositionTracker;
   @inject(EditorContextService) protected readonly editorContext: EditorContextService;
   @inject(SelectionService) protected readonly selectionService: SelectionService;

   async getItems(root: Readonly<GModelRoot>, lastMousePosition?: Point): Promise<MenuItem[]> {
      const readonly = this.editorContext.isReadonly;
      const triggerLocation = this.mousePositionTracker.clientPosition || Point.ORIGIN;
      const singleElement = this.selectionService.isSingleSelection() ? this.editorContext.selectedElements[0] : undefined;
      const singleUri = singleElement && isArgsAware(singleElement) ? SemanticUri.read(singleElement.args) : undefined;

      return [
         // canvas items (no selection) => show and creation
         {
            id: 'createEntity',
            label: 'Create Entity',
            actions: [
               TriggerSystemNodeCreationAction.create(ENTITY_NODE_TYPE, { triggerLocation, args: { type: 'create', singleUse: true } })
            ],
            icon: 'codicon codicon-add',
            group: '_0',
            sortString: '0',
            isVisible: () => !readonly && !this.selectionService.hasSelectedElements()
         },
         {
            id: 'showEntity',
            label: 'Show Entity',
            actions: [
               TriggerSystemNodeCreationAction.create(ENTITY_NODE_TYPE, { triggerLocation, args: { type: 'show', singleUse: true } })
            ],
            icon: 'codicon codicon-eye',
            group: '_0',
            sortString: '1',
            isVisible: () => !readonly && !this.selectionService.hasSelectedElements()
         },
         {
            id: 'createRelationship',
            label: 'Create Relationship',
            actions: [TriggerSystemEdgeCreationAction.create(RELATIONSHIP_EDGE_TYPE, { args: { type: 'create', singleUse: true } })],
            icon: 'codicon codicon-add',
            group: '_0',
            sortString: '2',
            isVisible: () => !readonly && !this.selectionService.hasSelectedElements()
         },
         {
            id: 'showRelationship',
            label: 'Show Relationship',
            actions: [
               TriggerSystemEdgeCreationAction.create(RELATIONSHIP_EDGE_TYPE, { triggerLocation, args: { type: 'show', singleUse: true } })
            ],
            icon: 'codicon codicon-eye',
            group: '_0',
            sortString: '3',
            isVisible: () => !readonly && !this.selectionService.hasSelectedElements()
         },
         {
            id: 'createInheritance',
            label: 'Create Inheritance',
            actions: [TriggerSystemEdgeCreationAction.create(INHERITANCE_EDGE_TYPE, { args: { type: 'create', singleUse: true } })],
            icon: 'codicon codicon-add',
            group: '_0',
            sortString: '4',
            isVisible: () => !readonly && !this.selectionService.hasSelectedElements()
         },
         // selected items => open, hide
         {
            id: 'openInFormEditor',
            label: 'Open in Form Editor',
            actions: [OpenCompositeEditorAction.create(singleUri!, { perspective: 'primary' })],
            icon: 'codicon codicon-edit',
            group: '_1',
            sortString: '0',
            isVisible: () => singleUri !== undefined && ModelFileExtensions.isFormFile(singleUri)
         },
         {
            id: 'openInCodeEditor',
            label: 'Open in Code Editor',
            actions: [OpenCompositeEditorAction.create(singleUri!, { perspective: 'code' })],
            icon: 'codicon codicon-code',
            group: '_1',
            sortString: '1',
            isVisible: () => singleUri !== undefined
         },
         {
            id: 'hide',
            label: 'Hide',
            actions: [DeleteElementOperation.create(this.editorContext.selectedElements.map(e => e.id))],
            icon: 'codicon codicon-eye-closed',
            group: '_2',
            sortString: '0',
            isVisible: () => !readonly && this.selectionService.getSelectedElements().some(isDeletable)
         }
      ];
   }
}
