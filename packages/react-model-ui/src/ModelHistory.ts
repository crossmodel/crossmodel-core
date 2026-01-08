/********************************************************************************
 * Copyright (c) 2025 CrossBreeze.
 ********************************************************************************/

import { CrossModelRoot } from '@crossmodel/protocol';

export interface HistoryEntry {
   model: CrossModelRoot;
   reason: string;
}

/**
 * Manages undo/redo history for model changes in form editors.
 * Tracks model state changes and allows navigation through history.
 */
export class ModelHistory {
   private history: HistoryEntry[] = [];
   private currentIndex = -1;
   private maxHistorySize = 50;

   constructor(initialModel: CrossModelRoot, reason = 'initial') {
      this.push(initialModel, reason);
   }

   /**
    * Push a new model state to the history.
    * Clears any forward history if we're not at the end.
    */
   push(model: CrossModelRoot, reason: string): void {
      // Clone the model first to ensure it's a plain object (not an Immer proxy)
      const clonedModel = this.deepClone(model);

      // Don't push if the model hasn't actually changed
      if (this.currentIndex >= 0) {
         const currentModel = JSON.stringify(this.history[this.currentIndex].model);
         const newModel = JSON.stringify(clonedModel);
         if (currentModel === newModel) {
            return;
         }
      }

      // Remove any forward history
      this.history = this.history.slice(0, this.currentIndex + 1);

      // Add new entry
      this.history.push({ model: clonedModel, reason });
      this.currentIndex++;

      // Limit history size
      if (this.history.length > this.maxHistorySize) {
         this.history.shift();
         this.currentIndex--;
      }
   }

   /**
    * Move back in history and return the previous model state.
    */
   undo(): HistoryEntry | undefined {
      if (!this.canUndo()) {
         return undefined;
      }
      this.currentIndex--;
      return this.history[this.currentIndex];
   }

   /**
    * Move forward in history and return the next model state.
    */
   redo(): HistoryEntry | undefined {
      if (!this.canRedo()) {
         return undefined;
      }
      this.currentIndex++;
      return this.history[this.currentIndex];
   }

   /**
    * Check if undo is possible.
    */
   canUndo(): boolean {
      return this.currentIndex > 0;
   }

   /**
    * Check if redo is possible.
    */
   canRedo(): boolean {
      return this.currentIndex < this.history.length - 1;
   }

   /**
    * Get the current model state without changing history.
    */
   current(): HistoryEntry | undefined {
      return this.currentIndex >= 0 ? this.history[this.currentIndex] : undefined;
   }

   /**
    * Clear all history and reset with a new initial state.
    */
   reset(model: CrossModelRoot, reason = 'reset'): void {
      this.history = [{ model: this.deepClone(model), reason }];
      this.currentIndex = 0;
   }

   /**
    * Deep clone a model to prevent mutations affecting history.
    */
   private deepClone(model: CrossModelRoot): CrossModelRoot {
      return JSON.parse(JSON.stringify(model));
   }

   /**
    * Get history size for debugging.
    */
   size(): number {
      return this.history.length;
   }

   /**
    * Get current index for debugging.
    */
   getCurrentIndex(): number {
      return this.currentIndex;
   }
}
