/********************************************************************************
 * Copyright (c) 2025 CrossBreeze.
 ********************************************************************************/

import { ENTITY_NODE_TYPE, INHERITANCE_EDGE_TYPE, RELATIONSHIP_EDGE_TYPE } from '@crossmodel/protocol';
import {
   DeleteElementOperation,
   EditorContextService,
   GModelRoot,
   IContextMenuItemProvider,
   LabeledAction,
   Point,
   findParentByFeature,
   isDeletable
} from '@eclipse-glsp/client';
import { inject, injectable } from '@theia/core/shared/inversify';
import { EntityNode, InheritanceEdge, RelationshipEdge } from '../model';
import {
   CreateEntityAction,
   CreateInheritanceAction,
   CreateRelationshipAction,
   OpenInCodeEditorAction,
   OpenInFormEditorAction,
   ShowEntityAction,
   ShowRelationshipAction
} from './context-menu-actions';

import { CrossModelMousePositionTracker } from '../../cross-model-command-palette';

/**
 * Context menu provider for the system diagram.
 * Provides context-specific menu items based on the element type (entity, canvas, relationship, etc.).
 */
@injectable()
export class SystemDiagramContextMenuProvider implements IContextMenuItemProvider {
   @inject(CrossModelMousePositionTracker) protected readonly mousePositionTracker: CrossModelMousePositionTracker;
   @inject(EditorContextService) protected readonly editorContext: EditorContextService;

   async getItems(root: Readonly<GModelRoot>, lastMousePosition?: Point): Promise<LabeledAction[]> {
      if (!lastMousePosition) {
         return [];
      }

      const target = this.editorContext.selectedElements[0];

      if (!target || target.id === root.id) {
         return this.getCanvasMenuItems(root);
      }

      const entityNode = findParentByFeature(target, (element): element is EntityNode => element.type === ENTITY_NODE_TYPE);
      if (entityNode) {
         return this.getEntityMenuItems(entityNode, root);
      }
      const relationshipEdge = findParentByFeature(target,
         (element): element is RelationshipEdge => element.type === RELATIONSHIP_EDGE_TYPE);
      if (relationshipEdge) {
         return this.getRelationshipMenuItems(relationshipEdge, root);
      }

      const inheritanceEdge = findParentByFeature(target, (element): element is InheritanceEdge => element.type === INHERITANCE_EDGE_TYPE);
      if (inheritanceEdge) {
         return this.getInheritanceMenuItems(inheritanceEdge, root);
      }

      return [];
   }

   /**
    * Get menu items for relationship edges.
    */
   protected getRelationshipMenuItems(edge: RelationshipEdge, root: GModelRoot): LabeledAction[] {
      const items: LabeledAction[] = [];

      items.push({
         id: 'openInFormEditor',
         label: 'Open in Form Editor',
         actions: [OpenInFormEditorAction.create(edge.id, root.id)],
         icon: 'codicon codicon-edit',
         sortString: '0'
      } as any);

      items.push({
         id: 'openInCodeEditor',
         label: 'Open in Code Editor',
         actions: [OpenInCodeEditorAction.create(edge.id, root.id)],
         icon: 'codicon codicon-code',
         sortString: '1'
      } as any);

      if (isDeletable(edge)) {
         items.push({
            id: 'hideElement',
            label: 'Hide Relationship',
            actions: [DeleteElementOperation.create([edge.id])],
            icon: 'codicon codicon-eye-closed',
            sortString: '2'
         } as any);

         items.push({
            id: 'deleteElement',
            label: 'Delete Relationship',
            actions: [DeleteElementOperation.create([edge.id])],
            icon: 'codicon codicon-trash',
            sortString: '3'
         } as any);
      }

      return items;
   }

   /**
    * Get menu items for inheritance edges.
    */
   protected getInheritanceMenuItems(edge: InheritanceEdge, root: GModelRoot): LabeledAction[] {
      const items: LabeledAction[] = [];

      items.push({
         id: 'openInFormEditor',
         label: 'Open in Form Editor',
         actions: [OpenInFormEditorAction.create(edge.id, root.id)],
         icon: 'codicon codicon-edit',
         sortString: '0'
      } as any);

      items.push({
         id: 'openInCodeEditor',
         label: 'Open in Code Editor',
         actions: [OpenInCodeEditorAction.create(edge.id, root.id)],
         icon: 'codicon codicon-code',
         sortString: '1'
      } as any);

      if (isDeletable(edge)) {
         items.push({
            id: 'hideElement',
            label: 'Hide inheritance',
            actions: [DeleteElementOperation.create([edge.id])],
            icon: 'codicon codicon-eye-closed',
            sortString: '2'
         } as any);

         items.push({
            id: 'deleteElement',
            label: 'Delete inheritance',
            actions: [DeleteElementOperation.create([edge.id])],
            icon: 'codicon codicon-trash',
            sortString: '3'
         } as any);
      }

      return items;
   }

   /**
    * Get menu items for entity nodes.
    */
   protected getEntityMenuItems(entityNode: EntityNode, root: GModelRoot): LabeledAction[] {
      const items: LabeledAction[] = [];

      items.push({
         id: 'openInFormEditor',
         label: 'Open in Form Editor',
         actions: [OpenInFormEditorAction.create(entityNode.id, root.id)],
         icon: 'codicon codicon-edit',
         sortString: '0'
      } as any);

      items.push({
         id: 'openInCodeEditor',
         label: 'Open in Code Editor',
         actions: [OpenInCodeEditorAction.create(entityNode.id, root.id)],
         icon: 'codicon codicon-code',
         sortString: '1'
      } as any);

      if (isDeletable(entityNode)) {
         items.push({
            id: 'hideElement',
            label: 'Hide Entity',
            actions: [DeleteElementOperation.create([entityNode.id])],
            icon: 'codicon codicon-eye-closed',
            sortString: '2'
         } as any);

         items.push({
            id: 'deleteElement',
            label: 'Delete Entity',
            actions: [DeleteElementOperation.create([entityNode.id])],
            icon: 'codicon codicon-trash',
            sortString: '3'
         } as any);
      }

      return items;
   }

   /**
    * Get menu items for canvas (empty diagram area).
    */
   protected getCanvasMenuItems(root: GModelRoot): LabeledAction[] {
      const items: LabeledAction[] = [];
      const position = this.mousePositionTracker.lastPositionOnDiagram || { x: 0, y: 0 };
      const screenPosition = this.mousePositionTracker.clientPosition || { x: 0, y: 0 };

      items.push({
         id: 'createEntity',
         label: 'Create Entity',
         actions: [CreateEntityAction.create(position, screenPosition, root.id)],
         icon: 'codicon codicon-add',
         sortString: '0'
      } as any);

      items.push({
         id: 'showEntity',
         label: 'Show Entity',
         actions: [ShowEntityAction.create(position, screenPosition)],
         icon: 'codicon codicon-eye',
         sortString: '1'
      } as any);

      items.push({
         id: 'createRelationship',
         label: 'Create Relationship',
         actions: [CreateRelationshipAction.create()],
         icon: 'codicon codicon-add',
         sortString: '2'
      } as any);

      items.push({
         id: 'showRelationship',
         label: 'Show Relationship',
         actions: [ShowRelationshipAction.create()],
         icon: 'codicon codicon-eye',
         sortString: '3'
      } as any);

      items.push({
         id: 'createInheritance',
         label: 'Create Inheritance',
         actions: [CreateInheritanceAction.create()],
         icon: 'codicon codicon-add',
         sortString: '4'
      } as any);

      return items;
   }
}
