/********************************************************************************
 * Copyright (c) 2023 CrossBreeze.
 ********************************************************************************/
import { AddSourceObjectOperation, codiconCSSString } from '@crossmodel/protocol';
import { Args, CommandPaletteActionProvider, GModelElement, LabeledAction, Point } from '@eclipse-glsp/server';
import { inject, injectable } from 'inversify';
import { SourceObject } from '../../../language-server/generated/ast.js';
import { MappingModelState } from '../model/mapping-model-state.js';

@injectable()
export class MappingDiagramCommandPaletteActionProvider extends CommandPaletteActionProvider {
   @inject(MappingModelState) protected state!: MappingModelState;

   getPaletteActions(_selectedElementIds: string[], _selectedElements: GModelElement[], position: Point, args?: Args): LabeledAction[] {
      const completionItems = this.state.services.language.references.ScopeProvider.complete({
         container: { globalId: this.state.mapping.id! },
         syntheticElements: [{ property: 'sources', type: SourceObject }],
         property: 'entity'
      });
      return completionItems.map<LabeledAction>(item => ({
         label: item.label,
         actions: [AddSourceObjectOperation.create(item.label, position || Point.ORIGIN)],
         icon: codiconCSSString('inspect')
      }));
   }
}
