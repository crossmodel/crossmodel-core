/********************************************************************************
 * Copyright (c) 2023 CrossBreeze.
 ********************************************************************************/
import { Action, Operation, Point, hasArrayProp, hasObjectProp, hasStringProp } from '@eclipse-glsp/protocol';

export interface DropFilesOperation extends Operation {
   kind: typeof DropFilesOperation.KIND;

   /** Insert position for dropped entities. */
   position: Point;
   /** List of file paths that contain entities to be added.  */
   files: string[];
}

export namespace DropFilesOperation {
   export const KIND = 'dropFilesOperation';

   export function is(object: any): object is DropFilesOperation {
      return Operation.hasKind(object, KIND) && hasArrayProp(object, 'files') && hasObjectProp(object, 'position');
   }

   export function create(files: string[], position: Point): DropFilesOperation {
      return {
         kind: KIND,
         isOperation: true,
         files,
         position
      };
   }
}

export interface AddSourceObjectOperation extends Operation {
   kind: typeof AddSourceObjectOperation.KIND;

   /** Insert position for dropped entities. */
   position: Point;
   /** Name of the entity to be added. */
   entityName: string;
}

export namespace AddSourceObjectOperation {
   export const KIND = 'addSourceObjectOperation';

   export function is(object: any): object is AddSourceObjectOperation {
      return Operation.hasKind(object, KIND) && hasStringProp(object, 'entityName') && hasObjectProp(object, 'position');
   }

   export function create(entityName: string, position: Point): AddSourceObjectOperation {
      return {
         kind: KIND,
         isOperation: true,
         entityName,
         position
      };
   }
}

// Copy definitions from (default) client-local glsp tool actions that we want to send from the server as well
export interface EnableToolsAction extends Action {
   kind: typeof EnableToolsAction.KIND;
   toolIds: string[];
}

export namespace EnableToolsAction {
   export const KIND = 'enable-tools';

   export function is(object: unknown): object is EnableToolsAction {
      return Action.hasKind(object, KIND) && hasArrayProp(object, 'toolIds');
   }

   export function create(toolIds: string[]): EnableToolsAction {
      return {
         kind: KIND,
         toolIds
      };
   }
}

/**
 * Action to disable the currently active tools and enable the default tools instead.
 */
export interface EnableDefaultToolsAction extends Action {
   kind: typeof EnableDefaultToolsAction.KIND;
}

export namespace EnableDefaultToolsAction {
   export const KIND = 'enable-default-tools';

   export function is(object: unknown): object is EnableToolsAction {
      return Action.hasKind(object, KIND);
   }

   export function create(): EnableDefaultToolsAction {
      return {
         kind: KIND
      };
   }
}

/**
 * Action to set the visibility state of the UI extension with the specified `id`.
 */
export interface SetUIExtensionVisibilityAction extends Action {
   kind: typeof SetUIExtensionVisibilityAction.KIND;
   extensionId: string;
   visible: boolean;
   contextElementsId: string[];
}

export namespace SetUIExtensionVisibilityAction {
   export const KIND = 'setUIExtensionVisibility';

   export function create(options: {
      extensionId: string;
      visible: boolean;
      contextElementsId?: string[];
   }): SetUIExtensionVisibilityAction {
      return {
         kind: KIND,
         extensionId: options.extensionId,
         visible: options.visible,
         contextElementsId: options.contextElementsId ?? []
      };
   }
}

/**
 * Action that requests the frontend to open the property widget for the current selection.
 */
export interface ShowPropertiesAction extends Action {
   kind: typeof ShowPropertiesAction.KIND;
   elementId?: string;
}

export namespace ShowPropertiesAction {
   export const KIND = 'showProperties';

   export function is(object: unknown): object is ShowPropertiesAction {
      return Action.hasKind(object, KIND);
   }

   export function create(options?: { elementId?: string }): ShowPropertiesAction {
      return {
         kind: KIND,
         elementId: options?.elementId
      };
   }
}

export function activateDefaultToolsAction(): Action {
   return EnableDefaultToolsAction.create();
}

export function activateDeleteToolAction(): Action {
   return EnableToolsAction.create(['glsp.delete-mouse']);
}

