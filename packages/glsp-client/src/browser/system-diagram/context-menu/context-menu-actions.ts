/********************************************************************************
 * Copyright (c) 2025 CrossBreeze.
 ********************************************************************************/

import { Point } from '@eclipse-glsp/client';
import { Action, hasStringProp } from '@eclipse-glsp/protocol';

/**
 * Action to open an element in the form editor.
 */
export interface OpenInFormEditorAction extends Action {
   kind: typeof OpenInFormEditorAction.KIND;
   semanticUri?: string;
}

export namespace OpenInFormEditorAction {
   export const KIND = 'openInFormEditor';

   export function is(object: any): object is OpenInFormEditorAction {
      return Action.hasKind(object, KIND) && hasStringProp(object, 'semanticUri');
   }

   export function create(semanticUri?: string): OpenInFormEditorAction {
      return {
         kind: KIND,
         semanticUri
      };
   }
}

/**
 * Action to open an element in the code editor.
 */
export interface OpenInCodeEditorAction extends Action {
   kind: typeof OpenInCodeEditorAction.KIND;
   semanticUri?: string;
}

export namespace OpenInCodeEditorAction {
   export const KIND = 'openInCodeEditor';

   export function is(object: any): object is OpenInCodeEditorAction {
      return Action.hasKind(object, KIND) && hasStringProp(object, 'semanticUri');
   }

   export function create(semanticUri?: string): OpenInCodeEditorAction {
      return {
         kind: KIND,
         semanticUri
      };
   }
}

/**
 * Action to create a new entity at a specific location.
 */
export interface CreateEntityAction extends Action {
   kind: typeof CreateEntityAction.KIND;
   location: Point;
   screenLocation: Point;
   rootId: string;
}

export namespace CreateEntityAction {
   export const KIND = 'createEntity';

   export function is(action: Action): action is CreateEntityAction {
      return action.kind === KIND;
   }

   export function create(location: Point, screenLocation: Point, rootId: string): CreateEntityAction {
      return {
         kind: KIND,
         location,
         screenLocation,
         rootId
      };
   }
}

/**
 * Action to show an existing entity at a specific location.
 */
export interface ShowEntityAction extends Action {
   kind: typeof ShowEntityAction.KIND;
   location: Point;
   screenLocation: Point;
   diagramOffset: Point;
}

export namespace ShowEntityAction {
   export const KIND = 'showEntity';

   export function is(action: Action): action is ShowEntityAction {
      return action.kind === KIND;
   }

   export function create(location: Point, screenLocation: Point, diagramOffset: Point): ShowEntityAction {
      return {
         kind: KIND,
         location,
         screenLocation,
         diagramOffset
      };
   }
}

/**
 * Action to create a new relationship.
 */
export interface CreateRelationshipAction extends Action {
   kind: typeof CreateRelationshipAction.KIND;
}

export namespace CreateRelationshipAction {
   export const KIND = 'createRelationship';

   export function is(object: any): object is CreateRelationshipAction {
      return Action.hasKind(object, KIND);
   }

   export function create(): CreateRelationshipAction {
      return {
         kind: KIND
      };
   }
}

/**
 * Action to show an existing relationship.
 */
export interface ShowRelationshipAction extends Action {
   kind: typeof ShowRelationshipAction.KIND;
   location: Point;
   screenLocation: Point;
   diagramOffset: Point;
}

export namespace ShowRelationshipAction {
   export const KIND = 'showRelationship';

   export function is(object: any): object is ShowRelationshipAction {
      return Action.hasKind(object, KIND);
   }

   export function create(location: Point, screenLocation: Point, diagramOffset: Point): ShowRelationshipAction {
      return {
         kind: KIND,
         location,
         screenLocation,
         diagramOffset
      };
   }
}

/**
 * Action to create a new inheritance.
 */
export interface CreateInheritanceAction extends Action {
   kind: typeof CreateInheritanceAction.KIND;
}

export namespace CreateInheritanceAction {
   export const KIND = 'createInheritance';

   export function is(object: any): object is CreateInheritanceAction {
      return Action.hasKind(object, KIND);
   }

   export function create(): CreateInheritanceAction {
      return {
         kind: KIND
      };
   }
}
