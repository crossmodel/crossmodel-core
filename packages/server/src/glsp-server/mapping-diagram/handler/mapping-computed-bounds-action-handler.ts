/********************************************************************************
 * Copyright (c) 2025 CrossBreeze.
 ********************************************************************************/

import { ComputedBoundsAction, ComputedBoundsActionHandler, GModelRoot } from '@eclipse-glsp/server';
import { injectable } from 'inversify';

@injectable()
export class MappingComputedBoundsActionHandler extends ComputedBoundsActionHandler {
   protected override applyBounds(root: GModelRoot, action: ComputedBoundsAction): void {
      // We do not have the correct positions and sizes for the routes to be calculated correctly on the first iteration
      // We therefore remove all routes from the action and let the client re-calculate them
      action.routes = [];
      super.applyBounds(root, action);
   }
}
