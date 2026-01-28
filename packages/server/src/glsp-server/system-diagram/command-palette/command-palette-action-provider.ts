/********************************************************************************
 * Copyright (c) 2023 CrossBreeze.
 ********************************************************************************/
import { DropFilesOperation, ModelStructure } from '@crossmodel/protocol';
import { ContextActionsProvider, EditorContext, LabeledAction, ModelState, Point } from '@eclipse-glsp/server';
import { inject, injectable } from 'inversify';
import { URI } from 'vscode-uri';
import { LogicalEntityNode, RelationshipEdge } from '../../../language-server/generated/ast.js';
import { SystemModelState } from '../model/system-model-state.js';

/**
 * An action provider for the command palette (Ctrl+Space) to allow adding entities or relationships to an existing diagram.
 * Each action will trigger a 'DropFilesOperation' for the specific entity or relationship file.
 */
@injectable()
export class SystemDiagramCommandPaletteActionProvider implements ContextActionsProvider {
   contextId = 'command-palette';

   @inject(ModelState) protected state: SystemModelState;

   async getActions(editorContext: EditorContext): Promise<LabeledAction[]> {
      const entityItems = this.state.services.language.references.ScopeProvider.complete({
         container: { globalId: this.state.systemDiagram.id! },
         syntheticElements: [{ property: 'nodes', type: LogicalEntityNode.$type }],
         property: 'entity'
      }).map<LabeledAction>(item => ({
         label: item.label,
         actions: [DropFilesOperation.create([URI.parse(item.uri).fsPath], editorContext.lastMousePosition || Point.ORIGIN)],
         icon: ModelStructure.LogicalEntity.ICON_CLASS
      }));

      const relationshipItems = this.state.services.language.references.ScopeProvider.complete({
         container: { globalId: this.state.systemDiagram.id! },
         syntheticElements: [{ property: 'edges', type: RelationshipEdge.$type }],
         property: 'relationship'
      }).map<LabeledAction>(item => ({
         label: item.label,
         actions: [DropFilesOperation.create([URI.parse(item.uri).fsPath], editorContext.lastMousePosition || Point.ORIGIN)],
         icon: ModelStructure.Relationship.ICON_CLASS
      }));

      return entityItems.concat(relationshipItems);
   }
}
