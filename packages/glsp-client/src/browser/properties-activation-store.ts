/********************************************************************************
 * Copyright (c) 2025 CrossBreeze.
 ********************************************************************************/
import { injectable } from '@theia/core/shared/inversify';

@injectable()
export class PropertiesActivationStore {
   protected readonly requestedElementIds = new Set<string>();

   request(elementId: string | undefined): void {
      if (elementId) {
         this.requestedElementIds.add(elementId);
      }
   }

   consume(selectedElementIds: string[]): boolean {
      let consumed = false;
      selectedElementIds.forEach(id => {
         if (this.requestedElementIds.delete(id)) {
            consumed = true;
         }
      });
      return consumed;
   }

   clear(): void {
      this.requestedElementIds.clear();
   }
}


