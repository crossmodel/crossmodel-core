/********************************************************************************
 * Copyright (c) 2025 CrossBreeze.
 ********************************************************************************/
/* eslint-disable no-shadow */

/**
 * This module augments Langium-generated AST types with computed properties.
 * These properties are populated at runtime by the AST extension service
 * and provide derived information about the AST nodes.
 *
 * Derived properties use the `_` prefix convention. The `$` prefix is
 * reserved for Langium internals and is often filtered out.
 */
declare module './generated/ast.js' {
   interface IdentifiedObject {
      /** @derived Fully qualified id including data model id. */
      readonly _globalId?: string;
   }

   interface LogicalEntityNode {
      /** @derived Attributes derived from the referenced entity. */
      readonly _attributes: LogicalEntityNodeAttribute[];
   }

   interface LogicalEntityNodeAttribute {
      /** @narrowed Narrowed container reference. */
      $container: LogicalEntityNode;
   }

   interface SourceObject {
      /** @derived Attributes derived from the referenced entity. */
      readonly _attributes: SourceObjectAttribute[];
   }

   interface SourceObjectAttribute {
      /** @narrowed Narrowed container reference. */
      $container: SourceObject;
   }

   interface TargetObject {
      /** @derived Identifier derived from the referenced entity */
      readonly _id: string | undefined;
      /** @derived Attributes derived from the referenced entity. */
      readonly _attributes: TargetObjectAttribute[];
   }

   interface TargetObjectAttribute {
      /** @narrowed Narrowed container reference. */
      $container: TargetObject;
   }
}

// Re-export everything from the generated AST module
// eslint-disable-next-line no-restricted-imports
export * from './generated/ast.js';
