/********************************************************************************
 * Copyright (c) 2025 CrossBreeze.
 ********************************************************************************/

import { FrontendApplicationContribution } from '@theia/core/lib/browser';
import { injectable } from '@theia/core/shared/inversify';
import { LibavoidLifecycle } from './libavoid';

@injectable()
export class LibAvoidInitializer implements FrontendApplicationContribution {
   async configure(): Promise<void> {
      LibavoidLifecycle.load();
   }
}
