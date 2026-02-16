/******************************************************************************
 * Generated from the Langium AST — DO NOT EDIT MANUALLY!
 * Run: yarn --cwd packages/server generate:transfer-model
 ******************************************************************************/

/* eslint-disable */

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export type Reference<T> = string;

export interface CrossModelElement {
   readonly $type: string;
}

// --- Type Constants ---
export const AttributeMappingType = 'AttributeMapping';
export const AttributeMappingExpressionType = 'AttributeMappingExpression';
export const AttributeMappingSourceType = 'AttributeMappingSource';
export const AttributeMappingTargetType = 'AttributeMappingTarget';
export const BinaryExpressionType = 'BinaryExpression';
export const CrossModelEditionInfoType = 'CrossModelEditionInfo';
export const CrossModelRootType = 'CrossModelRoot';
export const CustomPropertyType = 'CustomProperty';
export const DataElementMappingType = 'DataElementMapping';
export const DataModelType = 'DataModel';
export const DataModelDependencyType = 'DataModelDependency';
export const InheritanceEdgeType = 'InheritanceEdge';
export const JoinConditionType = 'JoinCondition';
export const LogicalEntityType = 'LogicalEntity';
export const LogicalEntityAttributeType = 'LogicalEntityAttribute';
export const LogicalEntityNodeType = 'LogicalEntityNode';
export const LogicalEntityNodeAttributeType = 'LogicalEntityNodeAttribute';
export const LogicalIdentifierType = 'LogicalIdentifier';
export const MappingType = 'Mapping';
export const NumberLiteralType = 'NumberLiteral';
export const RelationshipType = 'Relationship';
export const RelationshipAttributeType = 'RelationshipAttribute';
export const RelationshipEdgeType = 'RelationshipEdge';
export const SourceObjectType = 'SourceObject';
export const SourceObjectAttributeType = 'SourceObjectAttribute';
export const SourceObjectAttributeReferenceType = 'SourceObjectAttributeReference';
export const SourceObjectDependencyType = 'SourceObjectDependency';
export const StringLiteralType = 'StringLiteral';
export const SystemDiagramType = 'SystemDiagram';
export const TargetObjectType = 'TargetObject';
export const TargetObjectAttributeType = 'TargetObjectAttribute';

// --- Type Aliases ---
export type CrossModelKeywordNames = | "!="
    | "."
    | "0..1"
    | "0..N"
    | "1..1"
    | "1..N"
    | ":"
    | "<"
    | "<="
    | "="
    | ">"
    | ">="
    | "TRUE"
    | "apply"
    | "attribute"
    | "attributes"
    | "backgroundColor"
    | "baseNode"
    | "borderColor"
    | "borderStyle"
    | "borderWeight"
    | "child"
    | "childCardinality"
    | "childRole"
    | "conceptual"
    | "conditions"
    | "cross-join"
    | "crossmodel"
    | "customProperties"
    | "datamodel"
    | "datatype"
    | "dependencies"
    | "description"
    | "diagram"
    | "edges"
    | "edition"
    | "entity"
    | "expression"
    | "expressions"
    | "fontColor"
    | "from"
    | "height"
    | "id"
    | "identifiers"
    | "inherits"
    | "inner-join"
    | "join"
    | "language"
    | "left-join"
    | "length"
    | "logical"
    | "mandatory"
    | "mapping"
    | "mappings"
    | "name"
    | "nodes"
    | "parent"
    | "parentCardinality"
    | "parentRole"
    | "precision"
    | "primary"
    | "relational"
    | "relationship"
    | "scale"
    | "sourceNode"
    | "sources"
    | "superNode"
    | "systemDiagram"
    | "target"
    | "targetNode"
    | "true"
    | "type"
    | "value"
    | "version"
    | "width"
    | "x"
    | "y";
export const CrossModelKeywordNamesValues = ['!=', '.', '0..1', '0..N', '1..1', '1..N', ':', '<', '<=', '=', '>', '>=', 'TRUE', 'apply', 'attribute', 'attributes', 'backgroundColor', 'baseNode', 'borderColor', 'borderStyle', 'borderWeight', 'child', 'childCardinality', 'childRole', 'conceptual', 'conditions', 'cross-join', 'crossmodel', 'customProperties', 'datamodel', 'datatype', 'dependencies', 'description', 'diagram', 'edges', 'edition', 'entity', 'expression', 'expressions', 'fontColor', 'from', 'height', 'id', 'identifiers', 'inherits', 'inner-join', 'join', 'language', 'left-join', 'length', 'logical', 'mandatory', 'mapping', 'mappings', 'name', 'nodes', 'parent', 'parentCardinality', 'parentRole', 'precision', 'primary', 'relational', 'relationship', 'scale', 'sourceNode', 'sources', 'superNode', 'systemDiagram', 'target', 'targetNode', 'true', 'type', 'value', 'version', 'width', 'x', 'y'] as const;
export type BooleanExpression = NumberLiteral | SourceObjectAttributeReference | StringLiteral;
export type Cardinality = '0..1' | '0..N' | '1..1' | '1..N';
export const CardinalityValues = ['0..1', '0..N', '1..1', '1..N'] as const;
export type DataModelType = 'conceptual' | 'logical' | 'relational';
export const DataModelTypeValues = ['conceptual', 'logical', 'relational'] as const;
export type JoinType = 'apply' | 'cross-join' | 'from' | 'inner-join' | 'left-join';
export const JoinTypeValues = ['apply', 'cross-join', 'from', 'inner-join', 'left-join'] as const;
export type SourceObjectCondition = JoinCondition;

// --- Terminal Patterns (anchored for validation) ---
export const CrossModelTerminals = {
   STRING: /^(?:"[^"]*"|'[^']*')$/,
   VERSION: /^(?:(\^|~)?(?:[0-9]+)\.(?:[0-9]+)\.(?:[0-9]+))$/,
   NUMBER: /^(?:-?(?:[0-9]+)(\.(?:[0-9]+))?)$/,
   ID: /^(?:\^?[_a-zA-Z][\w_\-~$#@/\d]*)$/,
   SL_COMMENT: /^(?:#[^\n\r]*)$/,
};

// --- Interfaces ---
export interface WithCustomProperties extends CrossModelElement {
   readonly $type: 'AttributeMapping' | 'DataModel' | 'LogicalAttribute' | 'LogicalEntity' | 'LogicalEntityAttribute' | 'LogicalEntityNodeAttribute' | 'LogicalIdentifier' | 'Mapping' | 'Relationship' | 'RelationshipAttribute' | 'SourceObject' | 'SourceObjectAttribute' | 'TargetObject' | 'TargetObjectAttribute' | 'WithCustomProperties';
   customProperties: Array<CustomProperty>;
}

export interface AttributeMapping extends WithCustomProperties {
   readonly $type: typeof AttributeMappingType;
   attribute?: AttributeMappingTarget;
   expressions: Array<AttributeMappingExpression>;
   sources: Array<AttributeMappingSource>;
}

export interface AttributeMappingExpression extends CrossModelElement {
   readonly $type: typeof AttributeMappingExpressionType;
   expression: string;
   language: string;
}

export interface AttributeMappingSource extends CrossModelElement {
   readonly $type: typeof AttributeMappingSourceType;
   value: Reference<SourceObjectAttribute>;
}

export interface AttributeMappingTarget extends CrossModelElement {
   readonly $type: typeof AttributeMappingTargetType;
   value: Reference<TargetObjectAttribute>;
}

export interface BinaryExpression extends CrossModelElement {
   readonly $type: typeof BinaryExpressionType;
   left: BooleanExpression;
   op: '!=' | '<' | '<=' | '=' | '>' | '>=';
   right: BooleanExpression;
}

export interface CrossModelEditionInfo extends CrossModelElement {
   readonly $type: typeof CrossModelEditionInfoType;
   edition: string;
   version: number;
}

export interface CrossModelRoot extends CrossModelElement {
   readonly $type: typeof CrossModelRootType;
   datamodel?: DataModel;
   entity?: LogicalEntity;
   mapping?: Mapping;
   relationship?: Relationship;
   systemDiagram?: SystemDiagram;
}

export interface IdentifiedObject extends CrossModelElement {
   readonly $type: 'CustomProperty' | 'DataElement' | 'DataElementContainer' | 'DataElementContainerLink' | 'DataElementContainerMapping' | 'DataElementMapping' | 'DataModel' | 'IdentifiedObject' | 'InheritanceEdge' | 'LogicalAttribute' | 'LogicalEntity' | 'LogicalEntityAttribute' | 'LogicalEntityNode' | 'LogicalEntityNodeAttribute' | 'LogicalIdentifier' | 'Mapping' | 'NamedObject' | 'Relationship' | 'RelationshipEdge' | 'SourceDataElementContainer' | 'SourceObject' | 'SourceObjectAttribute' | 'SystemDiagram' | 'SystemDiagramEdge' | 'TargetObjectAttribute';
   id?: string;
   /** @derived Fully qualified id including data model id. */
   readonly _globalId?: string;
}

export interface NamedObject extends IdentifiedObject {
   readonly $type: 'CustomProperty' | 'DataElement' | 'DataElementContainer' | 'DataElementContainerLink' | 'DataModel' | 'LogicalAttribute' | 'LogicalEntity' | 'LogicalEntityAttribute' | 'LogicalEntityNodeAttribute' | 'LogicalIdentifier' | 'NamedObject' | 'Relationship' | 'SourceObjectAttribute' | 'TargetObjectAttribute';
   description?: string;
   name?: string;
}

export interface CustomProperty extends NamedObject {
   readonly $type: typeof CustomPropertyType;
   value?: string;
}

export interface DataElement extends NamedObject {
   readonly $type: 'DataElement' | 'LogicalAttribute' | 'LogicalEntityAttribute' | 'LogicalEntityNodeAttribute' | 'SourceObjectAttribute' | 'TargetObjectAttribute';
   datatype?: string;
}

export interface DataElementContainer extends NamedObject {
   readonly $type: 'DataElementContainer' | 'LogicalEntity';
}

export interface DataElementContainerLink extends NamedObject {
   readonly $type: 'DataElementContainerLink' | 'Relationship';
}

export interface DataElementContainerMapping extends IdentifiedObject {
   readonly $type: 'DataElementContainerMapping' | 'Mapping';
}

export interface DataElementMapping extends IdentifiedObject {
   readonly $type: typeof DataElementMappingType;
}

export interface DataModel extends NamedObject, WithCustomProperties {
   readonly $type: typeof DataModelType;
   crossmodel?: CrossModelEditionInfo;
   dependencies: Array<DataModelDependency>;
   type: string;
   version?: string;
}

export interface DataModelDependency extends CrossModelElement {
   readonly $type: typeof DataModelDependencyType;
   datamodel: Reference<DataModel>;
   version?: string;
}

export interface SystemDiagramEdge extends IdentifiedObject {
   readonly $type: 'InheritanceEdge' | 'RelationshipEdge' | 'SystemDiagramEdge';
   borderColor?: string;
   borderStyle?: string;
   borderWeight?: number;
}

export interface InheritanceEdge extends SystemDiagramEdge {
   readonly $type: typeof InheritanceEdgeType;
   baseNode: Reference<LogicalEntityNode>;
   superNode: Reference<LogicalEntityNode>;
}

export interface JoinCondition extends CrossModelElement {
   readonly $type: typeof JoinConditionType;
   expression: BinaryExpression;
}

export interface LogicalAttribute extends DataElement, WithCustomProperties {
   readonly $type: 'LogicalAttribute' | 'LogicalEntityAttribute' | 'LogicalEntityNodeAttribute' | 'SourceObjectAttribute' | 'TargetObjectAttribute';
   length?: number;
   mandatory: boolean;
   precision?: number;
   scale?: number;
}

export interface LogicalEntity extends DataElementContainer, WithCustomProperties {
   readonly $type: typeof LogicalEntityType;
   attributes: Array<LogicalEntityAttribute>;
   identifiers: Array<LogicalIdentifier>;
   inherits: Array<Reference<LogicalEntity>>;
}

export interface LogicalEntityAttribute extends LogicalAttribute {
   readonly $type: typeof LogicalEntityAttributeType;
}

export interface LogicalEntityNode extends IdentifiedObject {
   readonly $type: typeof LogicalEntityNodeType;
   backgroundColor?: string;
   borderColor?: string;
   borderStyle?: string;
   borderWeight?: number;
   entity: Reference<LogicalEntity>;
   fontColor?: string;
   height: number;
   width: number;
   x: number;
   y: number;
   /** @derived Attributes derived from the referenced entity. */
   readonly _attributes: LogicalEntityNodeAttribute[];
}

export interface LogicalEntityNodeAttribute extends LogicalAttribute {
   readonly $type: typeof LogicalEntityNodeAttributeType;
}

export interface LogicalIdentifier extends NamedObject, WithCustomProperties {
   readonly $type: typeof LogicalIdentifierType;
   attributes: Array<Reference<LogicalEntityAttribute>>;
   primary: boolean;
}

export interface Mapping extends DataElementContainerMapping, WithCustomProperties {
   readonly $type: typeof MappingType;
   sources: Array<SourceObject>;
   target: TargetObject;
}

export interface NumberLiteral extends CrossModelElement {
   readonly $type: typeof NumberLiteralType;
   value: number;
}

export interface Relationship extends DataElementContainerLink, WithCustomProperties {
   readonly $type: typeof RelationshipType;
   attributes: Array<RelationshipAttribute>;
   child?: Reference<LogicalEntity>;
   childCardinality?: string;
   childRole?: string;
   parent?: Reference<LogicalEntity>;
   parentCardinality?: string;
   parentRole?: string;
}

export interface RelationshipAttribute extends WithCustomProperties {
   readonly $type: typeof RelationshipAttributeType;
   child?: Reference<LogicalEntityAttribute>;
   parent?: Reference<LogicalEntityAttribute>;
}

export interface RelationshipEdge extends SystemDiagramEdge {
   readonly $type: typeof RelationshipEdgeType;
   relationship: Reference<Relationship>;
   sourceNode: Reference<LogicalEntityNode>;
   targetNode: Reference<LogicalEntityNode>;
}

export interface SourceDataElementContainer extends IdentifiedObject {
   readonly $type: 'SourceDataElementContainer' | 'SourceObject';
}

export interface SourceObject extends SourceDataElementContainer, WithCustomProperties {
   readonly $type: typeof SourceObjectType;
   conditions: Array<SourceObjectCondition>;
   dependencies: Array<SourceObjectDependency>;
   entity?: Reference<LogicalEntity>;
   join?: string;
   /** @derived Attributes derived from the referenced entity. */
   readonly _attributes: SourceObjectAttribute[];
}

export interface SourceObjectAttribute extends LogicalAttribute {
   readonly $type: typeof SourceObjectAttributeType;
}

export interface SourceObjectAttributeReference extends CrossModelElement {
   readonly $type: typeof SourceObjectAttributeReferenceType;
   value: Reference<SourceObjectAttribute>;
}

export interface SourceObjectDependency extends CrossModelElement {
   readonly $type: typeof SourceObjectDependencyType;
   source: Reference<SourceObject>;
}

export interface StringLiteral extends CrossModelElement {
   readonly $type: typeof StringLiteralType;
   value: string;
}

export interface SystemDiagram extends IdentifiedObject {
   readonly $type: typeof SystemDiagramType;
   edges: Array<SystemDiagramEdge>;
   nodes: Array<LogicalEntityNode>;
}

export interface TargetObject extends WithCustomProperties {
   readonly $type: typeof TargetObjectType;
   entity?: Reference<LogicalEntity>;
   mappings: Array<AttributeMapping>;
   /** @derived Identifier derived from the referenced entity */
   readonly _id: string | undefined;
   /** @derived Attributes derived from the referenced entity. */
   readonly _attributes: TargetObjectAttribute[];
}

export interface TargetObjectAttribute extends LogicalAttribute {
   readonly $type: typeof TargetObjectAttributeType;
}

// --- Type Guards ---
export function isCrossModelElement(item: unknown): item is CrossModelElement {
   return !!item && typeof item === 'object' && '$type' in item && typeof (item as CrossModelElement).$type === 'string';
}

export function isWithCustomProperties(item: unknown): item is WithCustomProperties {
   return isCrossModelElement(item) && (item.$type === 'AttributeMapping' || item.$type === 'DataModel' || item.$type === 'LogicalAttribute' || item.$type === 'LogicalEntity' || item.$type === 'LogicalEntityAttribute' || item.$type === 'LogicalEntityNodeAttribute' || item.$type === 'LogicalIdentifier' || item.$type === 'Mapping' || item.$type === 'Relationship' || item.$type === 'RelationshipAttribute' || item.$type === 'SourceObject' || item.$type === 'SourceObjectAttribute' || item.$type === 'TargetObject' || item.$type === 'TargetObjectAttribute' || item.$type === 'WithCustomProperties');
}

export function isAttributeMapping(item: unknown): item is AttributeMapping {
   return isCrossModelElement(item) && item.$type === AttributeMappingType;
}

export function isAttributeMappingExpression(item: unknown): item is AttributeMappingExpression {
   return isCrossModelElement(item) && item.$type === AttributeMappingExpressionType;
}

export function isAttributeMappingSource(item: unknown): item is AttributeMappingSource {
   return isCrossModelElement(item) && item.$type === AttributeMappingSourceType;
}

export function isAttributeMappingTarget(item: unknown): item is AttributeMappingTarget {
   return isCrossModelElement(item) && item.$type === AttributeMappingTargetType;
}

export function isBinaryExpression(item: unknown): item is BinaryExpression {
   return isCrossModelElement(item) && item.$type === BinaryExpressionType;
}

export function isCrossModelEditionInfo(item: unknown): item is CrossModelEditionInfo {
   return isCrossModelElement(item) && item.$type === CrossModelEditionInfoType;
}

export function isCrossModelRoot(item: unknown): item is CrossModelRoot {
   return isCrossModelElement(item) && item.$type === CrossModelRootType;
}

export function isIdentifiedObject(item: unknown): item is IdentifiedObject {
   return isCrossModelElement(item) && (item.$type === 'CustomProperty' || item.$type === 'DataElement' || item.$type === 'DataElementContainer' || item.$type === 'DataElementContainerLink' || item.$type === 'DataElementContainerMapping' || item.$type === 'DataElementMapping' || item.$type === 'DataModel' || item.$type === 'IdentifiedObject' || item.$type === 'InheritanceEdge' || item.$type === 'LogicalAttribute' || item.$type === 'LogicalEntity' || item.$type === 'LogicalEntityAttribute' || item.$type === 'LogicalEntityNode' || item.$type === 'LogicalEntityNodeAttribute' || item.$type === 'LogicalIdentifier' || item.$type === 'Mapping' || item.$type === 'NamedObject' || item.$type === 'Relationship' || item.$type === 'RelationshipEdge' || item.$type === 'SourceDataElementContainer' || item.$type === 'SourceObject' || item.$type === 'SourceObjectAttribute' || item.$type === 'SystemDiagram' || item.$type === 'SystemDiagramEdge' || item.$type === 'TargetObjectAttribute');
}

export function isNamedObject(item: unknown): item is NamedObject {
   return isCrossModelElement(item) && (item.$type === 'CustomProperty' || item.$type === 'DataElement' || item.$type === 'DataElementContainer' || item.$type === 'DataElementContainerLink' || item.$type === 'DataModel' || item.$type === 'LogicalAttribute' || item.$type === 'LogicalEntity' || item.$type === 'LogicalEntityAttribute' || item.$type === 'LogicalEntityNodeAttribute' || item.$type === 'LogicalIdentifier' || item.$type === 'NamedObject' || item.$type === 'Relationship' || item.$type === 'SourceObjectAttribute' || item.$type === 'TargetObjectAttribute');
}

export function isCustomProperty(item: unknown): item is CustomProperty {
   return isCrossModelElement(item) && item.$type === CustomPropertyType;
}

export function isDataElement(item: unknown): item is DataElement {
   return isCrossModelElement(item) && (item.$type === 'DataElement' || item.$type === 'LogicalAttribute' || item.$type === 'LogicalEntityAttribute' || item.$type === 'LogicalEntityNodeAttribute' || item.$type === 'SourceObjectAttribute' || item.$type === 'TargetObjectAttribute');
}

export function isDataElementContainer(item: unknown): item is DataElementContainer {
   return isCrossModelElement(item) && (item.$type === 'DataElementContainer' || item.$type === 'LogicalEntity');
}

export function isDataElementContainerLink(item: unknown): item is DataElementContainerLink {
   return isCrossModelElement(item) && (item.$type === 'DataElementContainerLink' || item.$type === 'Relationship');
}

export function isDataElementContainerMapping(item: unknown): item is DataElementContainerMapping {
   return isCrossModelElement(item) && (item.$type === 'DataElementContainerMapping' || item.$type === 'Mapping');
}

export function isDataElementMapping(item: unknown): item is DataElementMapping {
   return isCrossModelElement(item) && item.$type === DataElementMappingType;
}

export function isDataModel(item: unknown): item is DataModel {
   return isCrossModelElement(item) && item.$type === DataModelType;
}

export function isDataModelDependency(item: unknown): item is DataModelDependency {
   return isCrossModelElement(item) && item.$type === DataModelDependencyType;
}

export function isSystemDiagramEdge(item: unknown): item is SystemDiagramEdge {
   return isCrossModelElement(item) && (item.$type === 'InheritanceEdge' || item.$type === 'RelationshipEdge' || item.$type === 'SystemDiagramEdge');
}

export function isInheritanceEdge(item: unknown): item is InheritanceEdge {
   return isCrossModelElement(item) && item.$type === InheritanceEdgeType;
}

export function isJoinCondition(item: unknown): item is JoinCondition {
   return isCrossModelElement(item) && item.$type === JoinConditionType;
}

export function isLogicalAttribute(item: unknown): item is LogicalAttribute {
   return isCrossModelElement(item) && (item.$type === 'LogicalAttribute' || item.$type === 'LogicalEntityAttribute' || item.$type === 'LogicalEntityNodeAttribute' || item.$type === 'SourceObjectAttribute' || item.$type === 'TargetObjectAttribute');
}

export function isLogicalEntity(item: unknown): item is LogicalEntity {
   return isCrossModelElement(item) && item.$type === LogicalEntityType;
}

export function isLogicalEntityAttribute(item: unknown): item is LogicalEntityAttribute {
   return isCrossModelElement(item) && item.$type === LogicalEntityAttributeType;
}

export function isLogicalEntityNode(item: unknown): item is LogicalEntityNode {
   return isCrossModelElement(item) && item.$type === LogicalEntityNodeType;
}

export function isLogicalEntityNodeAttribute(item: unknown): item is LogicalEntityNodeAttribute {
   return isCrossModelElement(item) && item.$type === LogicalEntityNodeAttributeType;
}

export function isLogicalIdentifier(item: unknown): item is LogicalIdentifier {
   return isCrossModelElement(item) && item.$type === LogicalIdentifierType;
}

export function isMapping(item: unknown): item is Mapping {
   return isCrossModelElement(item) && item.$type === MappingType;
}

export function isNumberLiteral(item: unknown): item is NumberLiteral {
   return isCrossModelElement(item) && item.$type === NumberLiteralType;
}

export function isRelationship(item: unknown): item is Relationship {
   return isCrossModelElement(item) && item.$type === RelationshipType;
}

export function isRelationshipAttribute(item: unknown): item is RelationshipAttribute {
   return isCrossModelElement(item) && item.$type === RelationshipAttributeType;
}

export function isRelationshipEdge(item: unknown): item is RelationshipEdge {
   return isCrossModelElement(item) && item.$type === RelationshipEdgeType;
}

export function isSourceDataElementContainer(item: unknown): item is SourceDataElementContainer {
   return isCrossModelElement(item) && (item.$type === 'SourceDataElementContainer' || item.$type === 'SourceObject');
}

export function isSourceObject(item: unknown): item is SourceObject {
   return isCrossModelElement(item) && item.$type === SourceObjectType;
}

export function isSourceObjectAttribute(item: unknown): item is SourceObjectAttribute {
   return isCrossModelElement(item) && item.$type === SourceObjectAttributeType;
}

export function isSourceObjectAttributeReference(item: unknown): item is SourceObjectAttributeReference {
   return isCrossModelElement(item) && item.$type === SourceObjectAttributeReferenceType;
}

export function isSourceObjectDependency(item: unknown): item is SourceObjectDependency {
   return isCrossModelElement(item) && item.$type === SourceObjectDependencyType;
}

export function isStringLiteral(item: unknown): item is StringLiteral {
   return isCrossModelElement(item) && item.$type === StringLiteralType;
}

export function isSystemDiagram(item: unknown): item is SystemDiagram {
   return isCrossModelElement(item) && item.$type === SystemDiagramType;
}

export function isTargetObject(item: unknown): item is TargetObject {
   return isCrossModelElement(item) && item.$type === TargetObjectType;
}

export function isTargetObjectAttribute(item: unknown): item is TargetObjectAttribute {
   return isCrossModelElement(item) && item.$type === TargetObjectAttributeType;
}

export function isCrossModelKeywordNames(item: unknown): item is CrossModelKeywordNames {
   return item === '!=' || item === '.' || item === '0..1' || item === '0..N' || item === '1..1' || item === '1..N' || item === ':' || item === '<' || item === '<=' || item === '=' || item === '>' || item === '>=' || item === 'TRUE' || item === 'apply' || item === 'attribute' || item === 'attributes' || item === 'backgroundColor' || item === 'baseNode' || item === 'borderColor' || item === 'borderStyle' || item === 'borderWeight' || item === 'child' || item === 'childCardinality' || item === 'childRole' || item === 'conceptual' || item === 'conditions' || item === 'cross-join' || item === 'crossmodel' || item === 'customProperties' || item === 'datamodel' || item === 'datatype' || item === 'dependencies' || item === 'description' || item === 'diagram' || item === 'edges' || item === 'edition' || item === 'entity' || item === 'expression' || item === 'expressions' || item === 'fontColor' || item === 'from' || item === 'height' || item === 'id' || item === 'identifiers' || item === 'inherits' || item === 'inner-join' || item === 'join' || item === 'language' || item === 'left-join' || item === 'length' || item === 'logical' || item === 'mandatory' || item === 'mapping' || item === 'mappings' || item === 'name' || item === 'nodes' || item === 'parent' || item === 'parentCardinality' || item === 'parentRole' || item === 'precision' || item === 'primary' || item === 'relational' || item === 'relationship' || item === 'scale' || item === 'sourceNode' || item === 'sources' || item === 'superNode' || item === 'systemDiagram' || item === 'target' || item === 'targetNode' || item === 'true' || item === 'type' || item === 'value' || item === 'version' || item === 'width' || item === 'x' || item === 'y';
}

export function isBooleanExpression(item: unknown): item is BooleanExpression {
   return isNumberLiteral(item) || isSourceObjectAttributeReference(item) || isStringLiteral(item);
}

export function isCardinality(item: unknown): item is Cardinality {
   return item === '0..1' || item === '0..N' || item === '1..1' || item === '1..N';
}

export function isDataModelType(item: unknown): item is DataModelType {
   return item === 'conceptual' || item === 'logical' || item === 'relational';
}

export function isJoinType(item: unknown): item is JoinType {
   return item === 'apply' || item === 'cross-join' || item === 'from' || item === 'inner-join' || item === 'left-join';
}

export function isSourceObjectCondition(item: unknown): item is SourceObjectCondition {
   return isJoinCondition(item);
}

