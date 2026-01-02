/********************************************************************************
 * Copyright (c) 2023 CrossBreeze.
 ********************************************************************************/

import { CrossModelRoot } from '@crossmodel/protocol';
import { URI } from '@theia/core';
import * as React from 'react';
import { useImmerReducer } from 'use-immer';
import {
   CanRedoContext,
   CanUndoContext,
   DiagnosticManager,
   ModelContext,
   ModelDiagnosticsContext,
   ModelDiagnosticsManager,
   ModelDirtyContext,
   ModelDispatchContext,
   ModelQueryApiContext,
   OpenModelContext,
   RedoContext,
   SaveModelContext,
   UndoContext,
   UntitledContext,
   UriContext
} from './ModelContext';
import { ModelHistory } from './ModelHistory';
import { DispatchAction, ModelReducer, ModelState } from './ModelReducer';
import { ModelProviderProps } from './ModelViewer';

export type UpdateCallback = (model: CrossModelRoot) => void;

/**
 * Represents the properties required by the ModelProvider component.
 */
export interface InternalModelProviderProps extends React.PropsWithChildren, ModelProviderProps {}

/**
 * Based on the following implementation: https://react.dev/learn/scaling-up-with-reducer-and-context
 *
 * Provides the model and dispatch contexts to its children components.
 *
 * @param props ModelProviderProps
 * @returns JSX element
 */
export function ModelProvider({
   document,
   dirty,
   onModelOpen,
   onModelSave,
   onModelUpdate,
   modelQueryApi,
   onUndoReady,
   children
}: InternalModelProviderProps): React.ReactElement {
   const [appState, dispatch] = useImmerReducer<ModelState, DispatchAction>(ModelReducer, {
      model: document.root,
      reason: 'model:initial'
   });

   // History manager for undo/redo
   const historyRef = React.useRef<ModelHistory>(new ModelHistory(document.root, 'model:initial'));
   const isUndoRedoOperationRef = React.useRef(false);
   const lastDocumentUriRef = React.useRef<string>(document.uri);

   React.useEffect(() => {
      // Same document URI: keep history; optionally sync state unless this is an undo/redo echo.
      const isExternalChange = lastDocumentUriRef.current !== document.uri;
      if (!isExternalChange) {
         if (isUndoRedoOperationRef.current) {
            isUndoRedoOperationRef.current = false;
            return;
         }

         dispatch({ type: 'model:update', model: document.root });
         return;
      }

      // New document URI: reset history and load new model
      historyRef.current.reset(document.root, 'model:update');
      lastDocumentUriRef.current = document.uri;

      dispatch({ type: 'model:update', model: document.root });
   }, [dispatch, document]);

   React.useEffect(() => {
      if (appState.reason !== 'model:initial' && appState.reason !== 'model:update' && !isUndoRedoOperationRef.current) {
         // triggered when the internal model is updated, pass update to callback
         onModelUpdate(appState.model);
         // Push to history for undo/redo support
         historyRef.current.push(appState.model, appState.reason);
      } else if (appState.reason === 'model:update' && isUndoRedoOperationRef.current) {
         // This is a state update from undo/redo, just notify without pushing to history
         onModelUpdate(appState.model);
      }
      // Reset flag after handling
      isUndoRedoOperationRef.current = false;
   }, [appState, onModelUpdate]);

   const handleUndo = React.useCallback(() => {
      const entry = historyRef.current.undo();
      if (entry) {
         isUndoRedoOperationRef.current = true;
         dispatch({ type: 'model:update', model: entry.model });
         return true;
      }
      return false;
   }, [dispatch]);

   const handleRedo = React.useCallback(() => {
      const entry = historyRef.current.redo();
      if (entry) {
         isUndoRedoOperationRef.current = true;
         dispatch({ type: 'model:update', model: entry.model });
         return true;
      }
      return false;
   }, [dispatch]);

   const canUndo = React.useCallback(() => historyRef.current.canUndo(), []);
   const canRedo = React.useCallback(() => historyRef.current.canRedo(), []);

   // Notify parent widget when undo/redo handlers are ready (only once on mount)
   React.useEffect(() => {
      if (onUndoReady) {
         onUndoReady(handleUndo, handleRedo, canUndo, canRedo);
      }
   }, [onUndoReady, handleUndo, handleRedo, canUndo, canRedo]);

   const isUntitled = React.useMemo(() => new URI(document.uri).scheme === 'untitled', [document.uri]);
   const diagnosticsManager = React.useMemo(() => new DiagnosticManager(document.diagnostics), [document.diagnostics]);

   return (
      <ModelContext.Provider value={appState.model}>
         <OpenModelContext.Provider value={onModelOpen}>
            <SaveModelContext.Provider value={onModelSave}>
               <ModelDispatchContext.Provider value={dispatch}>
                  <ModelDirtyContext.Provider value={dirty}>
                     <ModelDiagnosticsContext.Provider value={document.diagnostics}>
                        <ModelDiagnosticsManager.Provider value={diagnosticsManager}>
                           <UriContext.Provider value={document.uri}>
                              <UntitledContext.Provider value={isUntitled}>
                                 <ModelQueryApiContext.Provider value={modelQueryApi}>
                                    <UndoContext.Provider value={handleUndo}>
                                       <RedoContext.Provider value={handleRedo}>
                                          <CanUndoContext.Provider value={canUndo}>
                                             <CanRedoContext.Provider value={canRedo}>{children}</CanRedoContext.Provider>
                                          </CanUndoContext.Provider>
                                       </RedoContext.Provider>
                                    </UndoContext.Provider>
                                 </ModelQueryApiContext.Provider>
                              </UntitledContext.Provider>
                           </UriContext.Provider>
                        </ModelDiagnosticsManager.Provider>
                     </ModelDiagnosticsContext.Provider>
                  </ModelDirtyContext.Provider>
               </ModelDispatchContext.Provider>
            </SaveModelContext.Provider>
         </OpenModelContext.Provider>
      </ModelContext.Provider>
   );
}
