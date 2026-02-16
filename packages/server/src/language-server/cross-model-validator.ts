/********************************************************************************
 * Copyright (c) 2023 CrossBreeze.
 ********************************************************************************/
import {
   CrossModelValidationErrors,
   DATAMODEL_FILE,
   ModelFileExtensions,
   ModelMemberPermissions,
   findAllExpressions,
   getExpressionText,
   isMemberPermittedInModel
} from '@crossmodel/protocol';
import { AstNode, Reference, UriUtils, ValidationAcceptor, ValidationChecks } from 'langium';
import { Diagnostic } from 'vscode-languageserver-protocol';
import {
   AttributeMapping,
   AttributeMappingExpression,
   BinaryExpression,
   CrossModelAstType,
   DataModel,
   IdentifiedObject,
   InheritanceEdge,
   LogicalEntity,
   LogicalEntityAttribute,
   LogicalIdentifier,
   Mapping,
   NamedObject,
   Relationship,
   RelationshipAttribute,
   RelationshipEdge,
   SourceObject,
   SourceObjectAttribute,
   SourceObjectCondition,
   SourceObjectDependency,
   TargetObject,
   TargetObjectAttribute,
   isCrossModelRoot,
   isDataModel,
   isSourceObjectAttributeReference
} from './ast.js';
import type { CrossModelServices } from './cross-model-module.js';
import { ID_PROPERTY } from './cross-model-naming.js';
import { findDocument, findSemanticRoot, isSemanticRoot } from './util/ast-util.js';
import { isMissingCrossModelVersion, needsCrossModelMigration } from './util/crossmodel-version-util.js';
import { getAttributeMappingExpressionRefRange } from './util/expression-range.js';

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
      DataModel: validator.checkDataModel,
      IdentifiedObject: validator.checkIdentifiedObject,
      AttributeMapping: validator.checkAttributeMapping,
      LogicalEntityAttribute: validator.checkLogicalEntityAttribute,
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
      BinaryExpression: validator.checkBinaryExpression
   };
   registry.register(checks, validator);
}

/**
 * Implementation of custom validations.
 */
export class CrossModelValidator {
   constructor(
      protected services: CrossModelServices,
      protected logger = services.shared.client.Logger.for('Validator')
   ) {}

   checkDataModel(dataModel: DataModel, accept: ValidationAcceptor): void {
      if (isMissingCrossModelVersion(dataModel)) {
         accept('warning', 'This data model is missing a CrossModel version and needs migration.', { node: dataModel });
      } else if (needsCrossModelMigration(dataModel)) {
         accept('error', 'This data model was created with a different CrossModel version and needs migration.', { node: dataModel });
      }
   }

   checkNamedObject(namedObject: NamedObject, accept: ValidationAcceptor): void {
      if (namedObject.name === undefined || namedObject.name.length === 0) {
         accept('error', 'The name cannot be empty', {
            node: namedObject,
            property: NamedObject.name,
            data: { code: CrossModelValidationErrors.toMissing(NamedObject.name) }
         });
      } else {
         // Check name uniqueness at appropriate scope
         this.checkNameUniqueness(namedObject, accept);
      }
   }

   checkIdentifiedObject(identifiedObject: IdentifiedObject, accept: ValidationAcceptor): void {
      if (identifiedObject.id === undefined || identifiedObject.id.length === 0) {
         accept('error', 'The id cannot be empty', {
            node: identifiedObject,
            property: IdentifiedObject.id,
            data: { code: CrossModelValidationErrors.toMissing(IdentifiedObject.id) }
         });
      } else {
         // Only perform the following checks when the id is known
         this.checkIdUniqueness(identifiedObject, accept);
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
      if (isDataModel(identifiedObject)) {
         if (basename !== DATAMODEL_FILE) {
            accept('error', `Data models need to be placed in ${DATAMODEL_FILE} file to be effective.`, {
               node: identifiedObject,
               property: IdentifiedObject.id,
               data: { code: CrossModelValidationErrors.FilenameNotMatching }
            });
         }
      } else if (basenameWithoutExt.toLowerCase() !== identifiedObject.id?.toLocaleLowerCase()) {
         accept('warning', `Filename should match element id: ${identifiedObject.id}`, {
            node: identifiedObject,
            property: IdentifiedObject.id,
            data: { code: CrossModelValidationErrors.FilenameNotMatching }
         });
      }
   }

   checkLogicalEntityAttribute(attribute: LogicalEntityAttribute, accept: ValidationAcceptor): void {
      const datatype = attribute.datatype?.toLowerCase();

      // length can only be set for text & binary data type
      if (attribute.length !== undefined && datatype !== 'text' && datatype !== 'binary') {
         accept('error', 'Length is only applicable to Text or Binary datatypes.', {
            node: attribute,
            property: LogicalEntityAttribute.length,
            data: { code: CrossModelValidationErrors.toMalformed(LogicalEntityAttribute.length) }
         });
      }

      // precision can be set for Decimal & Integer data type
      if (attribute.precision !== undefined && datatype !== 'decimal' && datatype !== 'integer') {
         accept('error', 'Precision is only applicable to Decimal or Integer datatypes.', {
            node: attribute,
            property: LogicalEntityAttribute.precision,
            data: { code: CrossModelValidationErrors.toMalformed(LogicalEntityAttribute.precision) }
         });
      }

      // scale can only be set for datatype Decimal, DateTime & Time
      if (attribute.scale !== undefined && datatype !== 'decimal' && datatype !== 'datetime' && datatype !== 'time') {
         accept('error', 'Scale is only applicable to Decimal, DateTime, or Time datatypes.', {
            node: attribute,
            property: LogicalEntityAttribute.scale,
            data: { code: CrossModelValidationErrors.toMalformed(LogicalEntityAttribute.scale) }
         });
      }

      // scale cannot be larger than precision
      if (attribute.scale !== undefined && attribute.precision !== undefined) {
         if (attribute.scale > attribute.precision) {
            accept('error', 'Scale cannot be larger than Precision.', {
               node: attribute,
               property: LogicalEntityAttribute.scale,
               data: { code: CrossModelValidationErrors.toMalformed(LogicalEntityAttribute.scale) }
            });
         }
      }
   }

   protected checkFitsPackage(node: AstNode, accept: ValidationAcceptor): void {
      if (!isCrossModelRoot(node)) {
         return;
      }
      const semanticRoot = findSemanticRoot(node);
      const info = this.services.shared.workspace.DataModelManager.getDataModelInfoByDocument(node.$document);
      const packageType = info?.type;
      // The problem is with the system type, not necessarily anything under it.
      if (!packageType || !(packageType in ModelMemberPermissions) || !semanticRoot) {
         return;
      }
      if (!isMemberPermittedInModel(packageType, semanticRoot.$type)) {
         this.logger.info('Issuing a warning: ' + Object.entries(node).join('\n\t'));
         accept('error', `Member of type '${semanticRoot?.$type}' is not permitted in a model of type '${packageType}'.`, { node });
      }
   }

   checkLogicalEntity(entity: LogicalEntity, accept: ValidationAcceptor): void {
      // Check that there is only one primary identifier
      const primaryIdentifiers = entity.identifiers.filter(identifier => identifier.primary === true);
      if (primaryIdentifiers.length > 1) {
         accept('error', `${primaryIdentifiers.length} primary identifiers defined, there should only be 1.`, {
            node: entity,
            property: LogicalEntity.identifiers
         });
      }

      // Check each identifier has at least one attribute
      const identifiersWithoutAttributes = entity.identifiers.filter(identifier => identifier.attributes.length === 0);
      for (const identifier of identifiersWithoutAttributes) {
         accept('error', 'Identifier must have at least one attribute.', { node: identifier, property: LogicalIdentifier.attributes });
      }

      const cycle = this.findInheritanceCycle(entity);
      if (cycle.length > 0) {
         const message = `Inheritance cycle detected: ${cycle.join(' -> ')}.`;
         for (let idx = 0; idx < entity.inherits.length; idx++) {
            const superEntityRef = entity.inherits[idx];
            const refEntity = superEntityRef.ref;
            if (refEntity && refEntity.id && cycle.includes(refEntity.id)) {
               // Provide the parent node plus the property and index. Langium's DiagnosticInfo
               // may include an index for elements in lists; our CrossModelDocumentValidator
               // will use that index to construct the element path. This avoids trying to
               // cast the reference object to an AstNode.
               accept('error', message, { node: entity, property: LogicalEntity.inherits, index: idx });
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

         for (const superEntityRef of current.inherits) {
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
      const usedParentAttributes: LogicalEntityAttribute[] = [];
      const usedChildAttributes: LogicalEntityAttribute[] = [];
      if (!relationship.child) {
         accept('error', 'Child entity is required.', {
            node: relationship,
            property: Relationship.child,
            data: { code: CrossModelValidationErrors.toMissing(Relationship.child) }
         });
      }
      if (!relationship.parent) {
         accept('error', 'Parent entity is required.', {
            node: relationship,
            property: Relationship.parent,
            data: { code: CrossModelValidationErrors.toMissing(Relationship.parent) }
         });
      }

      relationship.attributes.forEach((attribute, index) => {
         if (!attribute.parent) {
            accept('error', 'Parent attribute is required.', {
               node: attribute,
               property: RelationshipAttribute.parent,
               data: {
                  code: CrossModelValidationErrors.toMalformed(`${Relationship.attributes}[${index}].${RelationshipAttribute.parent}`)
               }
            });
         } else if (attribute.parent.ref) {
            if (attribute.parent?.ref?.$container !== relationship.parent?.ref) {
               accept('error', 'Not a valid parent attribute.', {
                  node: attribute,
                  property: RelationshipAttribute.parent,
                  data: {
                     code: CrossModelValidationErrors.toMalformed(`${Relationship.attributes}[${index}].${RelationshipAttribute.parent}`)
                  }
               });
            } else if (usedParentAttributes.includes(attribute.parent.ref)) {
               accept('error', 'Each parent attribute can only be referenced once.', {
                  node: attribute,
                  property: RelationshipAttribute.parent,
                  data: {
                     code: CrossModelValidationErrors.toMalformed(`${Relationship.attributes}[${index}].${RelationshipAttribute.parent}`)
                  }
               });
            } else {
               usedParentAttributes.push(attribute.parent.ref);
            }
         }
         if (!attribute.child) {
            accept('error', 'Child attribute is required.', {
               node: attribute,
               property: RelationshipAttribute.child,
               data: { code: CrossModelValidationErrors.toMalformed(`${Relationship.attributes}[${index}].${RelationshipAttribute.child}`) }
            });
         } else if (attribute.child.ref) {
            if (attribute.child?.ref?.$container !== relationship.child?.ref) {
               accept('error', 'Not a valid child attribute.', {
                  node: attribute,
                  property: RelationshipAttribute.child,
                  data: {
                     code: CrossModelValidationErrors.toMalformed(`${Relationship.attributes}[${index}].${RelationshipAttribute.child}`)
                  }
               });
            } else if (usedChildAttributes.includes(attribute.child.ref)) {
               accept('error', 'Each child attribute can only be referenced once.', {
                  node: attribute,
                  property: RelationshipAttribute.child,
                  data: {
                     code: CrossModelValidationErrors.toMalformed(`${Relationship.attributes}[${index}].${RelationshipAttribute.child}`)
                  }
               });
            } else {
               usedChildAttributes.push(attribute.child.ref);
            }
         }
      });
   }

   checkRelationshipEdge(edge: RelationshipEdge, accept: ValidationAcceptor): void {
      if (edge.sourceNode?.ref?.entity?.ref?.$type !== edge.relationship?.ref?.parent?.ref?.$type) {
         accept('error', 'Source must match type of parent.', { node: edge, property: RelationshipEdge.sourceNode });
      }
      if (edge.targetNode?.ref?.entity?.ref?.$type !== edge.relationship?.ref?.child?.ref?.$type) {
         accept('error', 'Target must match type of child.', { node: edge, property: RelationshipEdge.targetNode });
      }
   }

   checkInheritanceEdge(edge: InheritanceEdge, accept: ValidationAcceptor): void {
      const superEntities = edge.baseNode.ref?.entity.ref?.inherits ?? [];
      if (!superEntities.some(entity => entity.ref === edge.superNode.ref?.entity.ref)) {
         accept('error', 'Base entity must inherit from super entity', { node: edge, property: InheritanceEdge.superNode });
      }
   }

   checkSourceObject(obj: SourceObject, accept: ValidationAcceptor): void {
      if (obj.join === 'from' && obj.dependencies.length > 0) {
         accept('error', 'Source objects with join type "from" cannot have dependencies.', {
            node: obj,
            property: SourceObject.dependencies
         });
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
      // Check that each language appears only once
      const languages = new Map<string, number>();
      for (let i = 0; i < mapping.expressions.length; i++) {
         const expr = mapping.expressions[i];
         if (languages.has(expr.language)) {
            accept('error', `Language '${expr.language}' appears more than once. Each language must be unique within the expressions.`, {
               node: expr,
               property: AttributeMappingExpression.language
            });
         } else {
            languages.set(expr.language, i);
         }
      }

      // Validate each expression references only valid sources
      const sources = mapping.sources.map(source => source.value.$refText);
      for (const expr of mapping.expressions) {
         if (!expr.expression) {
            continue;
         }
         const expressionsInExpr = findAllExpressions(expr.expression);
         for (const expressionMatch of expressionsInExpr) {
            const expressionText = getExpressionText(expressionMatch);
            if (!sources.includes(expressionText)) {
               const range = getAttributeMappingExpressionRefRange(expr, expressionMatch);
               if (range) {
                  accept('error', 'Only sources can be referenced in an expression.', {
                     node: expr,
                     property: AttributeMappingExpression.expression,
                     range
                  });
               } else {
                  // Fallback: highlight the expression property
                  accept('error', 'Only sources can be referenced in an expression.', {
                     node: expr,
                     property: AttributeMappingExpression.expression
                  });
               }
            }
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
                  property: SourceObject.join
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
         const referencedSourceObject = reference.ref.$container;
         return (
            referencedSourceObject === sourceObject ||
            !!sourceObject.dependencies.find(dependency => dependency.source.ref === referencedSourceObject)
         );
      };
      if (isSourceObjectAttributeReference(left) && !checkReference(left.value)) {
         accept('error', 'Can only reference attributes from source objects that are listed as dependency.', { node: left });
      }
      const right = condition.expression.right;
      if (isSourceObjectAttributeReference(right) && !checkReference(right.value)) {
         accept('error', 'Can only reference attributes from source objects that are listed as dependency.', { node: right });
      }
   }

   checkBinaryExpression(expression: BinaryExpression, accept: ValidationAcceptor): void {
      if (!expression.op || expression.op.trim() === '') {
         accept('error', 'Operator must have a valid value.', {
            node: expression,
            property: BinaryExpression.op,
            data: { code: CrossModelValidationErrors.toMalformed(BinaryExpression.op) }
         });
      }
   }

   /**
    * Validates that ID is unique within its appropriate scope.
    * Scope determination:
    * - Global: Workspace-wide (e.g., DataModels)
    * - Local: Within a DataModel (e.g., entities, relationships)
    * - Internal: Collections within a parent object (e.g., attributes within an entity)
    */
   protected checkIdUniqueness(identifiedObject: IdentifiedObject, accept: ValidationAcceptor): void {
      // Only DataModel semantic roots are checked at global scope
      if (isDataModel(identifiedObject)) {
         this.checkIdUniquenessGlobal(identifiedObject, accept);
         return;
      }

      // Semantic root elements are checked at local scope (within DataModel)
      if (isSemanticRoot(identifiedObject)) {
         const document = findDocument(identifiedObject);
         if (document) {
            const dataModelId = this.services.shared.workspace.DataModelManager.getDataModelIdByDocument(document);
            if (dataModelId && dataModelId !== 'unknown') {
               this.checkIdUniquenessLocal(identifiedObject, identifiedObject, accept);
            }
         }
      } else {
         // Non-semantic-root elements are checked at internal scope (within parent collections)
         this.checkIdUniquenessInternal(identifiedObject, accept);
      }
   }

   /**
    * Checks for duplicate IDs at the global scope (workspace-wide).
    * Currently applies to semantic root elements like DataModels.
    */
   protected checkIdUniquenessGlobal(identifiedObject: IdentifiedObject, accept: ValidationAcceptor): void {
      const globalId = this.services.references.IdProvider.getGlobalId(identifiedObject);
      if (!globalId) {
         accept('error', 'Missing required id field', {
            node: identifiedObject,
            property: ID_PROPERTY,
            data: { code: CrossModelValidationErrors.toMissing('id') }
         });
         return;
      }
      const allElements = Array.from(this.services.shared.workspace.IndexManager.allElements(identifiedObject.$type));
      const duplicates = allElements.filter(description => {
         // Skip comparing the element against itself
         if (this.isSameNode(identifiedObject, description)) {
            return false;
         }
         return description.name === globalId;
      });
      if (duplicates.length > 0) {
         accept('error', 'Must provide a unique id.', {
            node: identifiedObject,
            property: ID_PROPERTY,
            data: { code: CrossModelValidationErrors.toMalformed('id') }
         });
      }
   }

   /**
    * Checks for duplicate IDs at the local scope (within a DataModel).
    * Elements of the same type within a DataModel must have unique IDs.
    */
   protected checkIdUniquenessLocal(identifiedObject: IdentifiedObject, dataModel: AstNode, accept: ValidationAcceptor): void {
      const myId = identifiedObject.id;
      const myType = identifiedObject.$type;
      if (!myId || !myType) {
         return;
      }

      const document = findDocument(identifiedObject);
      if (!document) {
         return;
      }

      // Get the DataModel ID for this entity
      const myDataModelId = this.services.shared.workspace.DataModelManager.getDataModelIdByDocument(document);

      // Skip check if DataModel is unknown
      if (!myDataModelId || myDataModelId === 'unknown') {
         return;
      }

      // Get all elements of the same type within the same DataModel
      const elementsInDataModel = this.services.shared.workspace.IndexManager.allElementsInDataModelOfType(myDataModelId, myType);

      // Filter to elements with the same ID (case sensitive), excluding self
      const duplicatesInSameDataModel = Array.from(elementsInDataModel).filter(description => {
         // Skip comparing against the same node
         if (this.isSameNode(identifiedObject, description)) {
            return false;
         }

         // Check if IDs match (case-sensitive)
         return description.name === myId;
      });

      // If there are any other elements with the same ID in the same scope, it's a duplicate
      if (duplicatesInSameDataModel.length > 0) {
         accept('error', 'Must provide a unique id within this DataModel.', {
            node: identifiedObject,
            property: 'id',
            data: { code: CrossModelValidationErrors.toMalformed('id') }
         });
      }
   }

   /**
    * Checks for duplicate IDs at the internal scope (within parent collections).
    */
   protected checkIdUniquenessInternal(identifiedObject: IdentifiedObject, accept: ValidationAcceptor): void {
      const parent = identifiedObject.$container;
      if (parent && parent.$type) {
         const siblings = this.getIdentifiableSiblings(identifiedObject, parent);
         if (siblings.length > 1 && siblings[0] === identifiedObject) {
            this.checkDuplicatesInList(siblings, 'id', accept);
         }
      }
   }

   /**
    * Validates that name is unique within its appropriate scope.
    * Scope determination:
    * - Global: Workspace-wide (e.g., DataModels)
    * - Local: Within a DataModel (e.g., entities, relationships)
    * - Internal: Collections within a parent object (e.g., attributes within an entity)
    */
   protected checkNameUniqueness(namedObject: NamedObject, accept: ValidationAcceptor): void {
      // Only DataModel semantic roots are checked at global scope
      if (isDataModel(namedObject)) {
         this.checkNameUniquenessGlobal(namedObject, accept);
         return;
      }

      // Semantic root elements are checked at local scope (within DataModel)
      if (isSemanticRoot(namedObject)) {
         this.checkNameUniquenessLocal(namedObject, namedObject, accept);
      } else {
         // Nested elements are checked at internal scope (within parent collections)
         this.checkNameUniquenessInternal(namedObject, accept);
      }
   }

   /**
    * Checks for duplicate names at the global scope (workspace-wide).
    * For DataModels: checks workspace-wide uniqueness.
    * For other semantic roots: checks within-DataModel uniqueness.
    */
   protected checkNameUniquenessGlobal(namedObject: NamedObject, accept: ValidationAcceptor): void {
      const myName = namedObject.name?.toLowerCase();
      if (!myName) {
         return;
      }

      const document = findDocument(namedObject);

      // For DataModels, check workspace-wide uniqueness
      if (isDataModel(namedObject)) {
         const dataModelElements = Array.from(this.services.shared.workspace.IndexManager.allElements(namedObject.$type));
         const duplicates = dataModelElements.filter(description => {
            if (this.isSameNode(namedObject, description)) {
               return false;
            }
            const descName = this.getDescriptionName(description)?.toLowerCase();
            return descName === myName;
         });

         if (duplicates.length > 0) {
            accept('error', `The data model name '${namedObject.name}' must be unique within the workspace.`, {
               node: namedObject,
               property: 'name',
               data: { code: CrossModelValidationErrors.toMalformed('name') }
            });
         }
         return;
      }

      // For other semantic roots, check within-DataModel uniqueness
      const dataModelId = this.services.shared.workspace.DataModelManager.getDataModelIdByDocument(document);

      // Skip global uniqueness check for unknown DataModels
      if (!dataModelId || dataModelId === 'unknown') {
         return;
      }

      const allElements = this.services.shared.workspace.IndexManager.allElements(namedObject.$type);

      for (const description of allElements) {
         if (this.isSameNode(namedObject, description)) {
            continue;
         }
         const descDataModelId = this.services.shared.workspace.DataModelManager.getDataModelIdByUri(description.documentUri);
         if (descDataModelId !== dataModelId) {
            continue;
         }

         const descName = this.getDescriptionName(description)?.toLowerCase();
         if (descName === myName) {
            const typeName = this.getUserFriendlyTypeName(namedObject.$type);
            accept('error', `The ${typeName} name '${namedObject.name}' must be unique within the data model.`, {
               node: namedObject,
               property: 'name',
               data: { code: CrossModelValidationErrors.toMalformed('name') }
            });
            return;
         }
      }
   }

   /**
    * Checks for duplicate names at the local scope (within a DataModel).
    * Elements of the same type within a DataModel must have unique names.
    */
   protected checkNameUniquenessLocal(namedObject: NamedObject, dataModel: AstNode, accept: ValidationAcceptor): void {
      const myName = namedObject.name;
      const myType = namedObject.$type;
      if (!myName || !myType) {
         return;
      }

      const document = findDocument(namedObject);
      if (!document) {
         return;
      }

      // Get the DataModel ID for this entity
      const myDataModelId = this.services.shared.workspace.DataModelManager.getDataModelIdByDocument(document);

      // Skip check if DataModel is unknown
      if (!myDataModelId || myDataModelId === 'unknown') {
         return;
      }

      // Get all elements of the same type within the same DataModel
      const elementsInDataModel = this.services.shared.workspace.IndexManager.allElementsInDataModelOfType(myDataModelId, myType);

      // Filter to elements with the same name (case-insensitive), excluding self
      const duplicatesInSameDataModel = Array.from(elementsInDataModel).filter(description => {
         // Skip comparing against the same node
         if (this.isSameNode(namedObject, description)) {
            return false;
         }

         const theirName = this.getDescriptionName(description);
         return theirName?.toLowerCase() === myName.toLowerCase();
      });

      // If there are any other elements with the same name in the same scope, it's a duplicate
      if (duplicatesInSameDataModel.length > 0) {
         const typeName = this.getUserFriendlyTypeName(myType);
         accept('error', `The ${typeName} name '${namedObject.name}' must be unique within the data model.`, {
            node: namedObject,
            property: 'name',
            data: { code: CrossModelValidationErrors.toMalformed('name') }
         });
      }
   }

   /**
    * Compares a node to an indexed description to determine if they refer to the same element.
    */
   protected isSameNode(node: AstNode, description: import('langium').AstNodeDescription): boolean {
      return (
         UriUtils.equals(findDocument(node)?.uri, description.documentUri) &&
         this.services.workspace.AstNodeLocator.getAstNodePath(node) === description.path
      );
   }

   /**
    * Converts AST type names to user-friendly display names.
    */
   protected getUserFriendlyTypeName(astType: string): string {
      const typeMap: Record<string, string> = {
         LogicalEntity: 'entity',
         Relationship: 'relationship',
         Mapping: 'mapping',
         SystemDiagram: 'system diagram',
         DataModel: 'data model'
      };
      return typeMap[astType] || astType.toLowerCase();
   }

   /**
    * Retrieves the `name` property from a described node, ignoring id-based description names.
    */
   protected getDescriptionName(description: import('langium').AstNodeDescription): string | undefined {
      const directNode = description.node as NamedObject | undefined;
      if (directNode?.name) {
         return directNode.name;
      }
      const resolvedNode = this.services.shared.workspace.IndexManager.resolveElement(description) as NamedObject | undefined;
      return resolvedNode?.name;
   }

   /**
    * Checks for duplicate names at the internal scope (within parent collections).
    */
   protected checkNameUniquenessInternal(namedObject: NamedObject, accept: ValidationAcceptor): void {
      const parent = namedObject.$container;
      if (parent && parent.$type) {
         const siblings = this.getNamedSiblings(namedObject, parent);
         if (siblings.length > 1 && siblings[0] === namedObject) {
            this.checkDuplicatesInList(siblings, 'name', accept);
         }
      }
   }

   /**
    * Finds the DataModel container for a given node.
    */
   // Removed unused findDataModelContainer helper

   /**
    * Gets all identifiable siblings (same direct parent, same property).
    */
   protected getIdentifiableSiblings(node: IdentifiedObject, parent: AstNode): IdentifiedObject[] {
      const siblings: IdentifiedObject[] = [];

      // Determine which property of parent contains this node
      for (const key in parent) {
         if (Object.prototype.hasOwnProperty.call(parent, key)) {
            const value = (parent as any)[key];
            if (Array.isArray(value)) {
               const containsNode = value.some(item => item === node);
               if (containsNode) {
                  // Collect all identifiable items in this array
                  for (const item of value) {
                     if (item && typeof item === 'object' && 'id' in item) {
                        siblings.push(item as IdentifiedObject);
                     }
                  }
                  break;
               }
            }
         }
      }

      return siblings;
   }

   /**
    * Gets all named siblings (same direct parent, same property).
    */
   protected getNamedSiblings(node: NamedObject, parent: AstNode): NamedObject[] {
      const siblings: NamedObject[] = [];

      // Determine which property of parent contains this node
      for (const key in parent) {
         if (Object.prototype.hasOwnProperty.call(parent, key)) {
            const value = (parent as any)[key];
            if (Array.isArray(value)) {
               const containsNode = value.some(item => item === node);
               if (containsNode) {
                  // Collect all named items in this array
                  for (const item of value) {
                     if (item && typeof item === 'object' && 'name' in item) {
                        siblings.push(item as NamedObject);
                     }
                  }
                  break;
               }
            }
         }
      }

      return siblings;
   }

   /**
    * Generic method to check for duplicates in a list.
    */
   protected checkDuplicatesInList(list: AstNode[], property: 'id' | 'name', accept: ValidationAcceptor): void {
      const seen = new Map<string, AstNode>();

      for (const item of list) {
         const value = (item as any)[property];
         if (value) {
            // Use case-insensitive comparison for names
            const key = property === 'name' ? value.toLowerCase() : value;
            if (seen.has(key)) {
               accept('error', `Must provide a unique ${property}.`, {
                  node: item,
                  property,
                  data: { code: CrossModelValidationErrors.toMalformed(property) }
               });
            } else {
               seen.set(key, item);
            }
         }
      }
   }
}
