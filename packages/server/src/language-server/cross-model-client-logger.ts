/********************************************************************************
 * Copyright (c) 2023 CrossBreeze.
 ********************************************************************************/

import { CrossModelSharedServices } from './cross-model-module.js';

/**
 * Centralized logger.
 */
export class ClientLogger {
   constructor(
      protected services: CrossModelSharedServices,
      protected component?: string
   ) {}

   /**
    * Show an error message.
    *
    * @param message The message to show.
    */
   error(message?: string): void {
      this.send(msg => this.services.lsp.Connection?.console.error(msg), message);
   }

   /**
    * Show a warning message.
    *
    * @param message The message to show.
    */
   warn(message?: string): void {
      this.send(msg => this.services.lsp.Connection?.console.warn(msg), message);
   }

   /**
    * Show an information message.
    *
    * @param message The message to show.
    */
   info(message?: string): void {
      this.send(msg => this.services.lsp.Connection?.console.info(msg), message);
   }

   /**
    * Show a debug message.
    *
    * @param message The message to debug.
    */
   debug(message?: string): void {
      this.send(msg => this.services.lsp.Connection?.console.debug(msg), message);
   }

   /**
    * Log a message.
    *
    * @param message The message to log.
    */
   log(message?: string): void {
      this.send(msg => this.services.lsp.Connection?.console.log(msg), message);
   }

   protected send(consumer?: (msg: string) => void, message?: string): void {
      if (consumer && message) {
         consumer(this.component ? `[${this.component}] ${message}` : message);
      }
   }

   for(component: string): ClientLogger {
      return new ClientLogger(this.services, component);
   }
}
