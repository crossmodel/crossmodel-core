/********************************************************************************
 * Copyright (c) 2024 CrossBreeze.
 ********************************************************************************/
import { LangiumCoreServices } from 'langium';
import { WorkerThreadAsyncParser } from 'langium/node';

const workerUrl = __dirname + '/language-server/parser/worker-thread.cjs';

export class CrossModelAsyncParser extends WorkerThreadAsyncParser {
   constructor(services: LangiumCoreServices) {
      super(services, workerUrl);
   }
}
