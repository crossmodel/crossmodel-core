/********************************************************************************
 * Copyright (c) 2026 CrossBreeze.
 ********************************************************************************/
import { CrossModelRoot, DataModelType, LogicalEntityType, MappingType, RelationshipType, SystemDiagramType } from './transfer-model';

export type RootObjectType = Exclude<CrossModelRoot[keyof CrossModelRoot], string | undefined>;
export type RootObjectTypeName = RootObjectType['$type'];

export interface DataModelTypeInfo {
   value: DataModelType;
   label: string;
   description: string;
}

export const DataModelTypeInfos = {
   conceptual: { value: 'conceptual', label: 'Conceptual', description: 'High-level conceptual data model' },
   logical: { value: 'logical', label: 'Logical', description: 'Logical data model with entities and relationships' },
   relational: { value: 'relational', label: 'Relational', description: 'Physical relational database model' }
} as const satisfies Record<DataModelType, DataModelTypeInfo>;

export const AllDataModelTypeInfos = Object.values(DataModelTypeInfos) as DataModelTypeInfo[];

export const ModelMemberPermissions = {
   logical: [LogicalEntityType, MappingType, RelationshipType, SystemDiagramType, DataModelType],
   relational: [DataModelType],
   conceptual: [DataModelType]
} as const satisfies Record<DataModelType, readonly RootObjectTypeName[]>;

export function isMemberPermittedInModel(packageType: string, memberType: string): boolean {
   const permittedTypes = ModelMemberPermissions[packageType as keyof typeof ModelMemberPermissions] as readonly string[] | undefined;
   return !!permittedTypes?.includes(memberType);
}

export function getSemanticRoot(root: CrossModelRoot): RootObjectType | undefined {
   return root.datamodel ?? root.entity ?? root.mapping ?? root.relationship ?? root.systemDiagram;
}
