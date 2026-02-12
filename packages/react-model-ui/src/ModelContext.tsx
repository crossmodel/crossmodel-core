/********************************************************************************
 * Copyright (c) 2023 CrossBreeze.
 ********************************************************************************/
import {
   CrossModelRoot,
   CrossReferenceContext,
   DataModel,
   FindIdArgs,
   LogicalEntity,
   Mapping,
   ModelDiagnostic,
   ReferenceableElement,
   Relationship
} from '@crossmodel/protocol';
import * as React from 'react';
import { DispatchAction, ModelReducer } from './ModelReducer';

export type SaveCallback = () => void;
export type OpenCallback = () => void;

export interface ModelQueryApi {
   findReferenceableElements(args: CrossReferenceContext): Promise<ReferenceableElement[]>;
   findNextId(args: FindIdArgs): Promise<string>;
}

export interface DiagnosticInfo {
   diagnostics: ModelDiagnostic[];
   empty: boolean;
   inputClasses(): string;
   text(): string | undefined;
}
export class DiagnosticManager {
   private result: Record<string, ModelDiagnostic[]> = {};

   constructor(protected diagnostics: ModelDiagnostic[]) {
      this.diagnostics.forEach(diagnostic => {
         const path = ModelDiagnostic.getPath(diagnostic);
         this.result[path] ??= [];
         this.result[path].push(diagnostic);
      });
   }

   list(elementPath: string | string[], property?: string, idx?: number): ModelDiagnostic[] {
      const singleElementPath = Array.isArray(elementPath) ? elementPath.join(ModelDiagnostic.ELEMENT_SEGMENT_SEPARATOR) : elementPath;
      const rootElementPath = singleElementPath.startsWith(ModelDiagnostic.ELEMENT_SEGMENT_SEPARATOR)
         ? singleElementPath
         : `${ModelDiagnostic.ELEMENT_SEGMENT_SEPARATOR}${singleElementPath}`;
      const indexedElementPath = idx !== undefined ? `${rootElementPath}${ModelDiagnostic.ELEMENT_INDEX_SEPARATOR}${idx}` : rootElementPath;
      const elementPathWithProperty = property
         ? `${indexedElementPath}${ModelDiagnostic.ELEMENT_PROPERTY_SEPARATOR}${property}`
         : indexedElementPath;
      // Primary lookup
      let res = this.result[elementPathWithProperty];
      if (res) {
         return res;
      }
      // Final flexible fallback: scan all keys for a match that contains the
      // requested index and ends with the requested property. This handles
      // any ordering of index/property the server may emit.
      const propSuffix = `${ModelDiagnostic.ELEMENT_PROPERTY_SEPARATOR}${property}`;
      const idxMarker = `${ModelDiagnostic.ELEMENT_INDEX_SEPARATOR}${idx}`;
      const keys = Object.keys(this.result);
      const candidateKey = keys.find(k => k.endsWith(propSuffix) && k.includes(idxMarker));
      if (candidateKey) {
         return this.result[candidateKey];
      }
      // Fallback: some server diagnostics encode the index directly on the parent
      // (e.g. '/entity@0^inherits') instead of on the property segment
      // ('/entity/inherits@0^inherits'). Try that variant as well.
      if (property !== undefined && idx !== undefined) {
         const idxSep = ModelDiagnostic.ELEMENT_INDEX_SEPARATOR;
         const propSep = ModelDiagnostic.ELEMENT_PROPERTY_SEPARATOR;
         const parentIndexPath = `${rootElementPath}${idxSep}${idx}${propSep}${property}`;
         res = this.result[parentIndexPath];
         if (res) {
            return res;
         }
         // Additional fallback: if elementPath was provided as a path with a property
         // (e.g. ['entity','inherits']), the server may have encoded the
         // index on the parent container instead of on the property segment
         // (i.e. '/entity@0^inherits'). Try that variant as well.
         const parts = singleElementPath.split(ModelDiagnostic.ELEMENT_SEGMENT_SEPARATOR);
         if (parts.length > 1) {
            const parentSingle = parts.slice(0, -1).join(ModelDiagnostic.ELEMENT_SEGMENT_SEPARATOR);
            const parentRoot = parentSingle.startsWith(ModelDiagnostic.ELEMENT_SEGMENT_SEPARATOR)
               ? parentSingle
               : `${ModelDiagnostic.ELEMENT_SEGMENT_SEPARATOR}${parentSingle}`;
            const parentVariant = `${parentRoot}${idxSep}${idx}${propSep}${property}`;
            res = this.result[parentVariant];
            if (res) {
               return res;
            }
         }
      }
      return [];
   }

   has(elementPath: string | string[], property?: string, idx?: number): boolean {
      return !this.info(elementPath, property, idx).empty;
   }

   cssClasses(elementPath: string | string[], property?: string, idx?: number): string {
      return this.info(elementPath, property, idx).inputClasses();
   }

   text(elementPath: string | string[], property?: string, idx?: number): string | undefined {
      return this.info(elementPath, property, idx).text();
   }

   info(elementPath: string | string[], property?: string, idx?: number): DiagnosticInfo {
      const diagnostics = this.list(elementPath, property, idx);
      return {
         diagnostics,
         empty: diagnostics.length === 0,
         inputClasses: () => (diagnostics.length > 0 ? 'p-invalid' : ''),
         text: () => (diagnostics.length > 0 ? diagnostics.map(diagnostic => diagnostic.message).join(', ') : undefined)
      };
   }
}

const DEFAULT_MODEL_ROOT: CrossModelRoot = { $type: 'CrossModelRoot' };
export const ModelContext = React.createContext(DEFAULT_MODEL_ROOT);

export type ActionDispatcher = React.Dispatch<React.ReducerAction<typeof ModelReducer>>;
export const DEFAULT_MODEL_REDUCER: ActionDispatcher = x => x;
export const ModelDispatchContext = React.createContext<ActionDispatcher>(DEFAULT_MODEL_REDUCER);

export const DEFAULT_OPEN_CALLBACK = (): void => console.log('Opening this model is not supported.');
export const OpenModelContext = React.createContext<OpenCallback | undefined>(undefined);

export const DEFAULT_SAVE_CALLBACK = (): void => console.log('Saving this model is not supported.');
export const SaveModelContext = React.createContext<SaveCallback | undefined>(undefined);

export const DEFAULT_QUERY_API: ModelQueryApi = { findReferenceableElements: async () => [], findNextId: () => Promise.resolve('') };
export const ModelQueryApiContext = React.createContext<ModelQueryApi>(DEFAULT_QUERY_API);

export const ModelDirtyContext = React.createContext<boolean>(false);

export const UntitledContext = React.createContext<boolean>(false);

export const UriContext = React.createContext<string>('');

export const ModelDiagnosticsContext = React.createContext<ModelDiagnostic[]>([]);

export const ModelDiagnosticsManager = React.createContext<DiagnosticManager>(new DiagnosticManager([]));

export function useModel(): CrossModelRoot {
   return React.useContext(ModelContext);
}

export function useModelDispatch(): React.Dispatch<DispatchAction> {
   return React.useContext(ModelDispatchContext);
}

export function useModelSave(): SaveCallback | undefined {
   return React.useContext(SaveModelContext);
}

export function useModelOpen(): OpenCallback | undefined {
   return React.useContext(OpenModelContext);
}

export function useModelQueryApi(): ModelQueryApi {
   return React.useContext(ModelQueryApiContext);
}

export function useDiagnostics(): ModelDiagnostic[] {
   return React.useContext(ModelDiagnosticsContext);
}

export function useDiagnosticsManager(): DiagnosticManager {
   return React.useContext(ModelDiagnosticsManager);
}

export function useDirty(): boolean {
   return React.useContext(ModelDirtyContext);
}

export function useReadonly(): boolean {
   return ModelDiagnostic.hasParseErrors(useDiagnostics());
}

export function useUri(): string {
   return React.useContext(UriContext);
}

export function useUntitled(): boolean {
   return React.useContext(UntitledContext);
}

export function useEntity(): LogicalEntity {
   return useModel().entity!;
}

export function useRelationship(): Relationship {
   return useModel().relationship!;
}

export function useMapping(): Mapping {
   return useModel().mapping!;
}

export function useDataModel(): DataModel {
   return useModel().datamodel!;
}

export type UndoCallback = () => boolean;
export type RedoCallback = () => boolean;
export type CanUndoCallback = () => boolean;
export type CanRedoCallback = () => boolean;

export const DEFAULT_UNDO_CALLBACK: UndoCallback = () => false;
export const DEFAULT_REDO_CALLBACK: RedoCallback = () => false;
export const DEFAULT_CAN_UNDO_CALLBACK: CanUndoCallback = () => false;
export const DEFAULT_CAN_REDO_CALLBACK: CanRedoCallback = () => false;

export const UndoContext = React.createContext<UndoCallback>(DEFAULT_UNDO_CALLBACK);
export const RedoContext = React.createContext<RedoCallback>(DEFAULT_REDO_CALLBACK);
export const CanUndoContext = React.createContext<CanUndoCallback>(DEFAULT_CAN_UNDO_CALLBACK);
export const CanRedoContext = React.createContext<CanRedoCallback>(DEFAULT_CAN_REDO_CALLBACK);

export function useUndo(): UndoCallback {
   return React.useContext(UndoContext);
}

export function useRedo(): RedoCallback {
   return React.useContext(RedoContext);
}

export function useCanUndo(): CanUndoCallback {
   return React.useContext(CanUndoContext);
}

export function useCanRedo(): CanRedoCallback {
   return React.useContext(CanRedoContext);
}
