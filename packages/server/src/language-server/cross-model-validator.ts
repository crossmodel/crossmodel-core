/********************************************************************************
 * Copyright (c) 2023 CrossBreeze.
 ********************************************************************************/
import {
   CrossModelValidationErrors,
   findAllExpressions,
   getExpression,
   getExpressionPosition,
   getExpressionText,
   getSemanticRoot,
   isMemberPermittedInModel,
   ModelFileExtensions,
   ModelMemberPermissions
} from '@crossmodel/protocol';
import { AstNode, AstUtils, GrammarUtils, Reference, UriUtils, ValidationAcceptor, ValidationChecks } from 'langium';
import { Diagnostic } from 'vscode-languageserver-protocol';
import type { CrossModelServices } from './cross-model-module.js';
import { ID_PROPERTY, IdentifiableAstNode } from './cross-model-naming.js';
import { getLocalName } from './cross-model-scope.js';
import {
   AttributeMapping,
   BinaryExpression,
   CrossModelAstType,
   CrossModelRoot,
   IdentifiedObject,
   InheritanceEdge,
   isCrossModelRoot,
   isCustomProperty,
   isIdentifiedObject,
   isLogicalEntity,
   isNamedObject,
   LogicalAttribute,
   LogicalEntity,
   Mapping,
   NamedObject,
   Relationship,
   RelationshipEdge,
   SourceObject,
   SourceObjectAttribute,
   SourceObjectCondition,
   SourceObjectDependency,
   TargetObject,
   TargetObjectAttribute,
   WithCustomProperties
} from './generated/ast.js';
import { findDocument, getOwner, isSemanticRoot } from './util/ast-util.js';

export interface FilenameNotMatchingDiagnostic extends Diagnostic {
   data: {
      code: typeof CrossModelValidationErrors.FilenameNotMatching;
   };
}

export namespace FilenameNotMatchingDiagnostic {
   export function is(diagnostic: Diagnostic): diagnostic is FilenameNotMatchingDiagnostic {
      return diagnostic.data?.code === CrossModelValidationErrors.FilenameNotMatching;
   }
}

/**
 * Register custom validation checks.
 */
export function registerValidationChecks(services: CrossModelServices): void {
   const registry = services.validation.ValidationRegistry;
   const validator = services.validation.CrossModelValidator;

   const checks: ValidationChecks<CrossModelAstType> = {
      AstNode: validator.checkNode,
      IdentifiedObject: validator.checkIdentifiedObject,
      AttributeMapping: validator.checkAttributeMapping,
      LogicalAttribute: validator.checkLogicalAttribute,
      LogicalEntity: validator.checkLogicalEntity,
      Mapping: validator.checkMapping,
      Relationship: validator.checkRelationship,
      RelationshipEdge: validator.checkRelationshipEdge,
      InheritanceEdge: validator.checkInheritanceEdge,
      SourceObject: validator.checkSourceObject,
      SourceObjectCondition: validator.checkSourceObjectCondition,
      SourceObjectDependency: validator.checkSourceObjectDependency,
      TargetObject: validator.checkTargetObject,
      NamedObject: validator.checkNamedObject,
      CrossModelRoot: validator.checkCrossModelRoot,
      WithCustomProperties: validator.checkUniqueCustomerPropertyId,
      BinaryExpression: validator.checkBinaryExpression
   };
   registry.register(checks, validator);
}

/**
 * Implementation of custom validations.
 */
export class CrossModelValidator {
   constructor(protected services: CrossModelServices) {}

   checkNamedObject(namedObject: NamedObject, accept: ValidationAcceptor): void {
      if (namedObject.name === undefined || namedObject.name.length === 0) {
         accept('error', 'The name cannot be empty', {
            node: namedObject,
            property: 'name',
            data: { code: CrossModelValidationErrors.toMissing('name') }
         });
      } else {
         this.checkUniqueGlobalName(namedObject, accept);
         // Skip local name check for CustomProperty as it's validated through checkUniqueCustomerPropertyId
         if (!isCustomProperty(namedObject)) {
            this.checkUniqueLocalName(namedObject, accept);
         }
      }
   }

   checkIdentifiedObject(identifiedObject: IdentifiedObject, accept: ValidationAcceptor): void {
      if (identifiedObject.id === undefined || identifiedObject.id.length === 0) {
         accept('error', 'The id cannot be empty', {
            node: identifiedObject,
            property: 'id',
            data: { code: CrossModelValidationErrors.toMissing('id') }
         });
      } else {
         // Only perform the following checks when the id is known
         this.checkUniqueGlobalId(identifiedObject, accept);
         this.checkUniqueLocalId(identifiedObject, accept);
         this.checkMatchingFilename(identifiedObject, accept);
      }
   }

   checkNode(node: AstNode, accept: ValidationAcceptor): void {
      this.checkFitsPackage(node, accept);
   }

   protected checkMatchingFilename(identifiedObject: IdentifiedObject, accept: ValidationAcceptor): void {
      if (!isSemanticRoot(identifiedObject)) {
         return;
      }
      const document = findDocument(identifiedObject);
      // Don't enforce filename requirement on untitled files: the name will be updated on save.
      if (!document || document.uri.scheme === 'untitled') {
         return;
      }
      const basename = UriUtils.basename(document.uri);
      const extname = ModelFileExtensions.getFileExtension(basename) ?? UriUtils.extname(document.uri);
      const basenameWithoutExt = basename.slice(0, -extname.length);
      if (basenameWithoutExt.toLowerCase() !== identifiedObject.id?.toLocaleLowerCase()) {
         accept('warning', `Filename should match element id: ${identifiedObject.id}`, {
            node: identifiedObject,
            property: ID_PROPERTY,
            data: { code: CrossModelValidationErrors.FilenameNotMatching }
         });
      }
   }

   // Check the uniqueness of ids of semantic root elements.
   protected checkUniqueGlobalId(identifiedObject: IdentifiedObject, accept: ValidationAcceptor): void {
      if (!isSemanticRoot(identifiedObject)) {
         return;
      }
      const globalId = this.services.references.IdProvider.getGlobalId(identifiedObject);
      if (!globalId) {
         accept('error', 'Missing required id field', {
            node: identifiedObject,
            property: ID_PROPERTY,
            data: { code: CrossModelValidationErrors.toMissing('id') }
         });
         return;
      }
      const document = findDocument(identifiedObject);
      const currentUri = document?.uri.toString().toLowerCase() ?? '';
      const currentPath = this.services.workspace.AstNodeLocator.getAstNodePath(identifiedObject);

      const allElements = this.services.shared.workspace.IndexManager.allElements(identifiedObject.$type);
      const distinctOrigins = new Set<string>();

      for (const description of allElements) {
         if (description.name !== globalId) {
            continue;
         }

         distinctOrigins.add(`${description.documentUri.toString().toLowerCase()}#${description.path}`);
      }

      distinctOrigins.add(`${currentUri}#${currentPath}`);

      if (distinctOrigins.size > 1) {
         accept('error', 'Must provide a unique id.', {
            node: identifiedObject,
            property: ID_PROPERTY,
            data: { code: CrossModelValidationErrors.toMalformed('id') }
         });
      }
   }

   checkCrossModelRoot(node: CrossModelRoot, accept: ValidationAcceptor): void {
      this.checkUniqueLocalId(node, accept);
   }

   protected checkUniqueLocalId(node: AstNode, accept: ValidationAcceptor): void {
      if (isLogicalEntity(node)) {
         this.markDuplicateIds(node.attributes, accept);
         this.markDuplicateIds(node.identifiers, accept);
      } else {
         const elements = AstUtils.streamContents(node).filter(isIdentifiedObject).toArray();
         this.markDuplicateIds(elements, accept);
      }
   }

   protected checkUniqueGlobalName(namedObject: NamedObject, accept: ValidationAcceptor): void {
      if (!isSemanticRoot(namedObject)) {
         return;
      }
      const name = namedObject.name?.toLowerCase();
      if (!name) {
         return;
      }
      const document = findDocument(namedObject);
      const dataModelId = this.services.shared.workspace.DataModelManager.getDataModelIdByDocument(document);

      const allElements = this.services.shared.workspace.IndexManager.allElements(namedObject.$type);

      for (const description of allElements) {
         if (this.isSameNode(namedObject, description)) {
            continue;
         }
         const descDataModelId = this.services.shared.workspace.DataModelManager.getDataModelIdByUri(description.documentUri);
         if (descDataModelId !== dataModelId) {
            continue;
         }

         const descName = getLocalName(description)?.toLowerCase();
         if (descName === name) {
            const typeName = namedObject.$type.toLowerCase();
            accept('warning', `The ${typeName} name '${namedObject.name}' must be unique within the data model.`, {
               node: namedObject,
               property: 'name',
               data: { code: CrossModelValidationErrors.toMalformed('name') }
            });
            return;
         }
      }
   }

   protected checkUniqueLocalName(node: AstNode, accept: ValidationAcceptor): void {
      if (isLogicalEntity(node)) {
         this.markDuplicateNames(node.attributes, accept);
         this.markDuplicateNames(node.identifiers, accept);
      } else {
         const elements = AstUtils.streamContents(node).filter(isNamedObject).toArray();
         this.markDuplicateNames(elements, accept);
      }
   }

   checkUniqueCustomerPropertyId(node: WithCustomProperties, accept: ValidationAcceptor): void {
      this.markDuplicateIds(node.customProperties, accept);
      this.markDuplicateNames(node.customProperties, accept);
   }

   checkLogicalAttribute(attribute: LogicalAttribute, accept: ValidationAcceptor): void {
      const datatype = attribute.datatype?.toLowerCase();

      // length can only be set for text & binary data type
      if (attribute.length !== undefined && datatype !== 'text' && datatype !== 'binary') {
         accept('error', 'Length is only applicable to Text or Binary datatypes.', {
            node: attribute,
            property: 'length',
            data: { code: CrossModelValidationErrors.toMalformed('length') }
         });
      }

      // precision can be set for Decimal & Integer data type
      if (attribute.precision !== undefined && datatype !== 'decimal' && datatype !== 'integer') {
         accept('error', 'Precision is only applicable to Decimal or Integer datatypes.', {
            node: attribute,
            property: 'precision',
            data: { code: CrossModelValidationErrors.toMalformed('precision') }
         });
      }

      // scale can only be set for datatype Decimal, DateTime & Time
      if (attribute.scale !== undefined && datatype !== 'decimal' && datatype !== 'datetime' && datatype !== 'time') {
         accept('error', 'Scale is only applicable to Decimal, DateTime, or Time datatypes.', {
            node: attribute,
            property: 'scale',
            data: { code: CrossModelValidationErrors.toMalformed('scale') }
         });
      }

      // scale cannot be larger than precision
      if (attribute.scale !== undefined && attribute.precision !== undefined) {
         if (attribute.scale > attribute.precision) {
            accept('error', 'Scale cannot be larger than Precision.', {
               node: attribute,
               property: 'scale',
               data: { code: CrossModelValidationErrors.toMalformed('scale') }
            });
         }
      }
   }

   protected markDuplicateIds(nodes: IdentifiableAstNode[] = [], accept: ValidationAcceptor): void {
      const knownIds: string[] = [];
      for (const node of nodes) {
         if (node.id && knownIds.includes(node.id)) {
            accept('error', 'Must provide a unique id.', {
               node,
               property: ID_PROPERTY,
               data: { code: CrossModelValidationErrors.toMalformed('id') }
            });
         } else if (node.id) {
            knownIds.push(node.id);
         }
      }
   }

   protected markDuplicateNames(nodes: (AstNode & { name?: string })[] = [], accept: ValidationAcceptor): void {
      const knownNames: string[] = [];
      for (const node of nodes) {
         const name = node.name?.toLowerCase();
         if (name && knownNames.includes(name)) {
            accept('error', 'Must provide a unique name.', {
               node,
               property: 'name',
               data: { code: CrossModelValidationErrors.toMalformed('name') }
            });
         } else if (name) {
            knownNames.push(name);
         }
      }
   }

   protected checkFitsPackage(node: AstNode, accept: ValidationAcceptor): void {
      if (!isCrossModelRoot(node)) {
         return;
      }
      const semanticRoot = getSemanticRoot(node);
      const info = this.services.shared.workspace.DataModelManager.getDataModelInfoByDocument(node.$document);
      const packageType = info?.type;
      // The problem is with the system type, not necessarily anything under it.
      if (!packageType || !(packageType in ModelMemberPermissions) || !semanticRoot) {
         return;
      }
      if (!isMemberPermittedInModel(packageType, semanticRoot.$type)) {
         this.services.shared.logger.ClientLogger.info('Issuing a warning: ' + Object.entries(node).join('\n\t'));
         accept('error', `Member of type '${semanticRoot?.$type}' is not permitted in a model of type '${packageType}'.`, { node });
      }
   }

   checkLogicalEntity(entity: LogicalEntity, accept: ValidationAcceptor): void {
      // Check that there is only one primary identifier
      const primaryIdentifiers = entity.identifiers.filter(identifier => identifier.primary === true);
      if (primaryIdentifiers.length > 1) {
         accept('error', `${primaryIdentifiers.length} primary identifiers defined, there should only be 1.`, {
            node: entity,
            property: 'identifiers'
         });
      }

      // Check each identifier has at least one attribute
      const identifiersWithoutAttributes = entity.identifiers.filter(identifier => identifier.attributes.length === 0);
      for (const identifier of identifiersWithoutAttributes) {
         accept('error', 'Identifier must have at least one attribute.', { node: identifier, property: 'attributes' });
      }

      const cycle = this.findInheritanceCycle(entity);
      if (cycle.length > 0) {
         const message = `Inheritance cycle detected: ${cycle.join(' -> ')}.`;
         for (let idx = 0; idx < entity.superEntities.length; idx++) {
            const superEntityRef = entity.superEntities[idx];
            const refEntity = superEntityRef.ref;
            if (refEntity && refEntity.id && cycle.includes(refEntity.id)) {
               // Provide the parent node plus the property and index. Langium's DiagnosticInfo
               // may include an index for elements in lists; our CrossModelDocumentValidator
               // will use that index to construct the element path. This avoids trying to
               // cast the reference object to an AstNode.
               accept('error', message, { node: entity, property: 'superEntities', index: idx });
            }
         }
      }
   }

   protected findInheritanceCycle(entity: LogicalEntity): string[] {
      const visited: Set<string> = new Set();
      const recursionStack: Set<string> = new Set();
      const path: string[] = [];

      function depthFirst(current: LogicalEntity): string[] {
         const currentId = current.id;

         if (currentId === undefined) {
            return [];
         }

         // Mark the current node as visited and add to recursion stack
         visited.add(currentId);
         recursionStack.add(currentId);
         path.push(currentId);

         for (const superEntityRef of current.superEntities) {
            const superEntity = superEntityRef.ref;
            if (!superEntity) {
               continue; // Ignore unresolved references
            }
            const superId = superEntity.id;
            if (superId === undefined) {
               continue; // Ignore reference without an id
            }

            if (!visited.has(superId)) {
               const cycle = depthFirst(superEntity);
               if (cycle.length > 0) {
                  return cycle; // Propagate the detected cycle up the recursion
               }
            } else if (recursionStack.has(superId)) {
               // Cycle detected
               const cycleStartIndex = path.indexOf(superId);
               const cycle = path.slice(cycleStartIndex);
               cycle.push(superId);
               return cycle;
            }
         }

         // Backtrack: remove the current node from recursion stack and path
         recursionStack.delete(currentId);
         path.pop();
         return []; // No cycle detected in this path
      }

      return depthFirst(entity);
   }

   checkRelationship(relationship: Relationship, accept: ValidationAcceptor): void {
      // we check that each attribute actually belongs to their respective entity (parent, child)
      // and that each attribute is only used once
      const usedParentAttributes: LogicalAttribute[] = [];
      const usedChildAttributes: LogicalAttribute[] = [];
      if (!relationship.child) {
         accept('error', 'Child entity is required.', {
            node: relationship,
            property: 'child',
            data: { code: CrossModelValidationErrors.toMissing('child') }
         });
      }
      if (!relationship.parent) {
         accept('error', 'Parent entity is required.', {
            node: relationship,
            property: 'parent',
            data: { code: CrossModelValidationErrors.toMissing('parent') }
         });
      }

      relationship.attributes.forEach((attribute, index) => {
         if (!attribute.parent) {
            accept('error', 'Parent attribute is required.', {
               node: attribute,
               property: 'parent',
               data: { code: CrossModelValidationErrors.toMalformed(`attributes[${index}].parent`) }
            });
         } else if (attribute.parent.ref) {
            if (attribute.parent?.ref?.$container !== relationship.parent?.ref) {
               accept('error', 'Not a valid parent attribute.', {
                  node: attribute,
                  property: 'parent',
                  data: { code: CrossModelValidationErrors.toMalformed(`attributes[${index}].parent`) }
               });
            } else if (usedParentAttributes.includes(attribute.parent.ref)) {
               accept('error', 'Each parent attribute can only be referenced once.', {
                  node: attribute,
                  property: 'parent',
                  data: { code: CrossModelValidationErrors.toMalformed(`attributes[${index}].parent`) }
               });
            } else {
               usedParentAttributes.push(attribute.parent.ref);
            }
         }
         if (!attribute.child) {
            accept('error', 'Child attribute is required.', {
               node: attribute,
               property: 'child',
               data: { code: CrossModelValidationErrors.toMalformed(`attributes[${index}].child`) }
            });
         } else if (attribute.child.ref) {
            if (attribute.child?.ref?.$container !== relationship.child?.ref) {
               accept('error', 'Not a valid child attribute.', {
                  node: attribute,
                  property: 'child',
                  data: { code: CrossModelValidationErrors.toMalformed(`attributes[${index}].child`) }
               });
            } else if (usedChildAttributes.includes(attribute.child.ref)) {
               accept('error', 'Each child attribute can only be referenced once.', {
                  node: attribute,
                  property: 'child',
                  data: { code: CrossModelValidationErrors.toMalformed(`attributes[${index}].child`) }
               });
            } else {
               usedChildAttributes.push(attribute.child.ref);
            }
         }
      });
   }

   checkRelationshipEdge(edge: RelationshipEdge, accept: ValidationAcceptor): void {
      if (edge.sourceNode?.ref?.entity?.ref?.$type !== edge.relationship?.ref?.parent?.ref?.$type) {
         accept('error', 'Source must match type of parent.', { node: edge, property: 'sourceNode' });
      }
      if (edge.targetNode?.ref?.entity?.ref?.$type !== edge.relationship?.ref?.child?.ref?.$type) {
         accept('error', 'Target must match type of child.', { node: edge, property: 'targetNode' });
      }
   }

   checkInheritanceEdge(edge: InheritanceEdge, accept: ValidationAcceptor): void {
      const superEntities = edge.baseNode.ref?.entity.ref?.superEntities ?? [];
      if (!superEntities.some(entity => entity.ref === edge.superNode.ref?.entity.ref)) {
         accept('error', 'Base entity must inherit from super entity', { node: edge, property: 'superNode' });
      }
   }

   checkSourceObject(obj: SourceObject, accept: ValidationAcceptor): void {
      if (obj.join === 'from' && obj.dependencies.length > 0) {
         accept('error', 'Source objects with join type "from" cannot have dependencies.', { node: obj, property: 'dependencies' });
      }
      const knownRefs: string[] = [];
      for (const dependency of obj.dependencies) {
         if (knownRefs.includes(dependency.source.$refText)) {
            accept('warning', 'Avoid duplicate dependency entries.', { node: dependency });
         } else if (dependency.source.$refText) {
            knownRefs.push(dependency.source.$refText);
         }
      }
   }

   checkAttributeMapping(mapping: AttributeMapping, accept: ValidationAcceptor): void {
      const mappingExpression = GrammarUtils.findNodeForProperty(mapping.$cstNode, 'expression');
      if (!mappingExpression) {
         return;
      }
      const mappingExpressionRange = mappingExpression.range;
      const expressions = findAllExpressions(mapping.expression);
      const sources = mapping.sources.map(source => source.value.$refText);
      for (const expression of expressions) {
         const completeExpression = getExpression(expression);
         const expressionPosition = getExpressionPosition(expression);
         const expressionText = getExpressionText(expression);
         if (!sources.includes(expressionText)) {
            const startCharacter = mappingExpressionRange.start.character + expressionPosition + 1;
            accept('error', 'Only sources can be referenced in an expression.', {
               node: mapping,
               range: {
                  start: { line: mappingExpressionRange.start.line, character: startCharacter },
                  end: { line: mappingExpressionRange.end.line, character: startCharacter + completeExpression.length }
               }
            });
         }
      }
   }

   checkTargetObject(target: TargetObject, accept: ValidationAcceptor): void {
      const knownAttributes: TargetObjectAttribute[] = [];
      for (const mapping of target.mappings) {
         if (!mapping.attribute) {
            accept('error', 'Each attribute mapping must have a target attribute.', { node: mapping });
         } else if (mapping.attribute.value.ref && knownAttributes.includes(mapping.attribute.value.ref)) {
            accept('error', 'Each target attribute can only be mapped once.', { node: mapping.attribute });
         } else if (mapping.attribute.value.ref) {
            knownAttributes.push(mapping.attribute.value.ref);
         }
      }
   }

   checkMapping(mapping: Mapping, accept: ValidationAcceptor): void {
      let hasJoinSourceObject = false;
      for (const sourceObject of mapping.sources) {
         if (sourceObject.join === 'from') {
            if (!hasJoinSourceObject) {
               hasJoinSourceObject = true;
            } else {
               accept('error', 'Only one source object with join type "from" is allowed per mapping.', {
                  node: sourceObject,
                  property: 'join'
               });
            }
         }
      }
   }

   checkSourceObjectDependency(dependency: SourceObjectDependency, accept: ValidationAcceptor): void {
      if (dependency.source.ref && dependency.source.ref === dependency.$container) {
         accept('error', 'Cannot reference yourself as dependency.', { node: dependency });
      }
      if (dependency.source.ref && findDocument(dependency.source.ref)?.uri.toString() !== findDocument(dependency)?.uri.toString()) {
         accept('error', 'Can only reference source objects from the same mapping.', { node: dependency });
      }
   }

   checkSourceObjectCondition(condition: SourceObjectCondition, accept: ValidationAcceptor): void {
      const sourceObject = condition.$container;
      const left = condition.expression.left;
      const checkReference: (reference: Reference<SourceObjectAttribute>) => boolean = reference => {
         if (!reference.ref) {
            return true;
         }
         const referencedSourceObject = getOwner(reference.ref);
         return (
            referencedSourceObject === sourceObject ||
            !!sourceObject.dependencies.find(dependency => dependency.source.ref === referencedSourceObject)
         );
      };
      if (left.$type === 'SourceObjectAttributeReference' && !checkReference(left.value)) {
         accept('error', 'Can only reference attributes from source objects that are listed as dependency.', { node: left });
      }
      const right = condition.expression.right;
      if (right.$type === 'SourceObjectAttributeReference' && !checkReference(right.value)) {
         accept('error', 'Can only reference attributes from source objects that are listed as dependency.', { node: right });
      }
   }

   checkBinaryExpression(expression: BinaryExpression, accept: ValidationAcceptor): void {
      if (!expression.op || expression.op.trim() === '') {
         accept('error', 'Operator must have a valid value.', {
            node: expression,
            property: 'op',
            data: { code: CrossModelValidationErrors.toMalformed('operator') }
         });
      }
   }

   protected isSameNode(node: AstNode, description: import('langium').AstNodeDescription): boolean {
      return (
         UriUtils.equals(findDocument(node)?.uri, description.documentUri) &&
         this.services.workspace.AstNodeLocator.getAstNodePath(node) === description.path
      );
   }
}
