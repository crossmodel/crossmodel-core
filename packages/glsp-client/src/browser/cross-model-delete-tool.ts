/********************************************************************************
 * Copyright (c) 2024 CrossBreeze.
 ********************************************************************************/

import {
   Action,
   DeleteElementOperation,
   DeleteToolMouseListener,
   GModelElement,
   MouseDeleteTool,
   findParentByFeature,
   isDeletable
} from '@eclipse-glsp/client';
import { injectable } from '@theia/core/shared/inversify';

export class CrossModelMouseDeleteTool extends MouseDeleteTool {
   protected override deleteToolMouseListener: DeleteToolMouseListener = new CrossModelDeleteMouseListener();
}

@injectable()
export class CrossModelDeleteMouseListener extends DeleteToolMouseListener {
   override mouseUp(target: GModelElement, event: MouseEvent): Action[] {
      // only handle main mouse button
      if (event.button !== 0) {
         return [];
      }
      const deletableParent = findParentByFeature(target, isDeletable);
      if (deletableParent === undefined) {
         return [];
      }
      const result: Action[] = [];
      result.push(DeleteElementOperation.create([deletableParent.id]));
      return result;
   }
}
