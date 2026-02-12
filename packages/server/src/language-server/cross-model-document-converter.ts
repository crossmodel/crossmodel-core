/********************************************************************************
 * Copyright (c) 2026 CrossBreeze.
 ********************************************************************************/

import * as transfer from '@crossmodel/protocol';
import { AstNode, Reference, isReference } from 'langium';
import * as lsp from 'vscode-languageserver-protocol';
import { AstModelDocument } from '../model-server/open-text-document-manager.js';
import * as ast from './ast.js';
import { CrossModelDiagnostic } from './cross-model-document-validator.js';
import { CrossModelSharedServices } from './cross-model-module.js';

/**
 * Maps AST $type strings to their corresponding client model types.
 * Uses computed property keys from AST constants for compile-time safety.
 * If a type name changes in the grammar, TypeScript will catch the mismatch.
 */
export interface AstToTransferTypeMap {
   [ast.CrossModelRoot.$type]: transfer.CrossModelRoot;
   [ast.DataModel.$type]: transfer.DataModel;
   [ast.DataModelDependency.$type]: transfer.DataModelDependency;
   [ast.LogicalEntity.$type]: transfer.LogicalEntity;
   [ast.LogicalEntityAttribute.$type]: transfer.LogicalEntityAttribute;
   [ast.LogicalEntityNodeAttribute.$type]: transfer.LogicalEntityNodeAttribute;
   [ast.LogicalIdentifier.$type]: transfer.LogicalIdentifier;
   [ast.Relationship.$type]: transfer.Relationship;
   [ast.RelationshipAttribute.$type]: transfer.RelationshipAttribute;
   [ast.Mapping.$type]: transfer.Mapping;
   [ast.SourceObject.$type]: transfer.SourceObject;
   [ast.SourceObjectAttribute.$type]: transfer.SourceObjectAttribute;
   [ast.SourceObjectDependency.$type]: transfer.SourceObjectDependency;
   [ast.TargetObject.$type]: transfer.TargetObject;
   [ast.TargetObjectAttribute.$type]: transfer.TargetObjectAttribute;
   [ast.AttributeMapping.$type]: transfer.AttributeMapping;
   [ast.AttributeMappingExpression.$type]: transfer.AttributeMappingExpression;
   [ast.AttributeMappingSource.$type]: transfer.AttributeMappingSource;
   [ast.AttributeMappingTarget.$type]: transfer.AttributeMappingTarget;
   [ast.SystemDiagram.$type]: transfer.SystemDiagram;
   [ast.LogicalEntityNode.$type]: transfer.LogicalEntityNode;
   [ast.RelationshipEdge.$type]: transfer.RelationshipEdge;
   [ast.InheritanceEdge.$type]: transfer.InheritanceEdge;
   [ast.JoinCondition.$type]: transfer.JoinCondition;
   [ast.BinaryExpression.$type]: transfer.BinaryExpression;
   [ast.NumberLiteral.$type]: transfer.NumberLiteral;
   [ast.StringLiteral.$type]: transfer.StringLiteral;
   [ast.SourceObjectAttributeReference.$type]: transfer.SourceObjectAttributeReference;
   [ast.CustomProperty.$type]: transfer.CustomProperty;
}

/** All known AST type names that can be converted to client types. */
export type AstTypeName = keyof AstToTransferTypeMap;

/** Helper type to extract the transfer type for a given AST node based on its $type. */
export type TransferTypeFor<T extends AstNode> = T extends { readonly $type: infer U }
   ? U extends AstTypeName
      ? AstToTransferTypeMap[U]
      : transfer.CrossModelElement
   : transfer.CrossModelElement;

/** Serializable primitive types that can be sent over RPC. */
type SerializablePrimitive = string | number | boolean | undefined;

/** Type for values that can be converted - either primitive, reference, or nested AST node. */
type ConvertibleValue = SerializablePrimitive | AstNode | Reference<AstNode> | ConvertibleValue[];

/**
 * Converts Langium AST nodes to serializable transfer model objects for client-server communication.
 *
 * The conversion performs two transformations:
 * 1. Strips Langium-internal `$`-prefixed properties (`$container`, `$document`, etc.), keeping only `$type`.
 * 2. Replaces `Reference<T>` objects with their `$refText` string representation to avoid sending object graphs.
 *
 * Derived `_`-prefixed properties (e.g. `_globalId`, `_attributes`) are populated by the
 * AST extension service during scope computation and copied by the generic loop without special handling.
 */
export class CrossModelClientConverter {
   constructor(protected services: CrossModelSharedServices) {}

   /**
    * Serializes a transfer model root back to its textual representation.
    * If the input is already a string, it is returned as-is.
    */
   toAstText(root: string | transfer.CrossModelRoot): string {
      return typeof root === 'string' ? root : this.services.ServiceRegistry.CrossModel.serializer.Serializer.serialize(root);
   }

   toTransferDocument(document: AstModelDocument): transfer.CrossModelDocument {
      return {
         uri: document.uri,
         diagnostics: document.diagnostics.map(diagnostic => this.toTransferDiagnostic(diagnostic)),
         root: this.toTransfer(document.root)!
      };
   }

   toTransferDiagnostic(diagnostic: CrossModelDiagnostic): transfer.ModelDiagnostic {
      const langiumCode = diagnostic.data?.code;
      return {
         message: diagnostic.message,
         element: diagnostic.element,
         property: diagnostic.property,
         severity:
            diagnostic.severity === lsp.DiagnosticSeverity.Error
               ? 'error'
               : diagnostic.severity === lsp.DiagnosticSeverity.Warning
                 ? 'warning'
                 : 'info',
         code: diagnostic.code ?? diagnostic.data?.code,
         type: langiumCode === 'lexing-error' ? 'lexing-error' : langiumCode === 'parsing-error' ? 'parsing-error' : 'validation-error'
      };
   }

   /**
    * Converts a Langium AST node to its corresponding transfer model type.
    *
    * All properties are copied generically via `Object.entries`, with references resolved to
    * their `$refText` and nested nodes converted recursively. Langium-internal `$`-prefixed
    * properties are skipped (only `$type` is kept). Derived `_`-prefixed properties are
    * populated by the AST extension service and copied by the generic loop.
    */
   toTransfer<T extends AstNode>(astNode: T): TransferTypeFor<T>;
   toTransfer<T extends AstNode>(astNode: T | undefined): TransferTypeFor<T> | undefined;
   toTransfer<T extends AstNode>(astNode: T | undefined): TransferTypeFor<T> | undefined {
      if (!astNode) {
         return undefined;
      }

      const result: Record<string, unknown> = { $type: astNode.$type };

      // Copy all properties, converting references to strings and recursing into nested nodes.
      // Skip `$`-prefixed Langium internals ($container, $document, $cstNode, etc.).
      // Derived `_`-prefixed properties (e.g. _globalId, _attributes) are set by the
      // AST extension service during scope computation and are copied here like any other property.
      for (const [key, value] of Object.entries(astNode)) {
         if (key.startsWith('$')) {
            continue;
         }
         result[key] = this.toTransferValue(value as ConvertibleValue);
      }

      return result as unknown as TransferTypeFor<T>;
   }

   /**
    * Recursively converts a single property value for the transfer model.
    * - Arrays: each element is converted recursively
    * - References: resolved to their `$refText` string
    * - Nested AST nodes: converted recursively via `toTransfer`
    * - Primitives (string, number, boolean, undefined): passed through unchanged
    */
   protected toTransferValue(value: ConvertibleValue): unknown {
      if (Array.isArray(value)) {
         return value.map(val => this.toTransferValue(val));
      }
      if (isReference(value)) {
         return value.$refText;
      }
      if (!!value && typeof value === 'object') {
         return this.toTransfer(value);
      }
      return value;
   }
}
