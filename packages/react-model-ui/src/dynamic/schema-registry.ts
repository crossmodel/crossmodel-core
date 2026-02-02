/********************************************************************************
 * Copyright (c) 2025 CrossBreeze.
 ********************************************************************************/
import {
   CrossModelRoot,
   DataModelDependencyType,
   EntityInheritType,
   LogicalAttributeType,
   LogicalEntityType,
   LogicalIdentifierType,
   ModelStructure,
   RelationshipAttributeType,
   findNextUnique,
   getSemanticRoot,
   toId,
   toIdReference
} from '@crossmodel/protocol';
import { DynamicFormSchema } from './schema';

// --- Helpers for EntityAttributes conditional columns ---

const isLengthApplicable = (datatype: string): boolean => {
   const dt = datatype?.toLowerCase();
   return dt === 'text' || dt === 'binary';
};

const isPrecisionApplicable = (datatype: string): boolean => {
   const dt = datatype?.toLowerCase();
   return dt === 'decimal' || dt === 'integer';
};

const isScaleApplicable = (datatype: string): boolean => {
   const dt = datatype?.toLowerCase();
   return dt === 'decimal' || dt === 'time' || dt === 'datetime';
};

const dataTypeOptions = [
   { label: 'Text', value: 'Text' },
   { label: 'Boolean', value: 'Boolean' },
   { label: 'Integer', value: 'Integer' },
   { label: 'Decimal', value: 'Decimal' },
   { label: 'Date', value: 'Date' },
   { label: 'Time', value: 'Time' },
   { label: 'DateTime', value: 'DateTime' },
   { label: 'Guid', value: 'Guid' },
   { label: 'Binary', value: 'Binary' },
   { label: 'Location', value: 'Location' }
];

const dataModelSchema: DynamicFormSchema = {
   rootKey: 'datamodel',
   rootType: 'DataModel',
   displayName: 'Data Model',
   iconClass: ModelStructure.DataModel.ICON_CLASS,
   diagnosticPath: 'datamodel',
   typeProperty: 'type',
   sections: [
      {
         label: 'General',
         fields: [
            { property: 'id', label: 'ID', fieldType: 'text', disabled: true },
            { property: 'name', label: 'Name', fieldType: 'text', required: true, undefinedIfEmpty: true },
            { property: 'description', label: 'Description', fieldType: 'textarea', undefinedIfEmpty: true },
            { property: 'type', label: 'Type', fieldType: 'reference', referenceProperty: 'type' },
            { property: 'version', label: 'Version', fieldType: 'text', undefinedIfEmpty: true }
         ]
      }
   ],
   collections: [
      {
         property: 'dependencies',
         label: 'Dependencies',
         renderMode: 'dynamic',
         itemType: DataModelDependencyType,
         addButtonLabel: 'Add Dependency',
         noDataMessage: 'No dependencies',
         columns: [
            {
               property: 'datamodel',
               header: 'Data Model',
               columnType: 'reference',
               required: true,
               filterType: 'multiselect',
               referenceConfig: {
                  syntheticType: DataModelDependencyType
               }
            },
            {
               property: 'version',
               header: 'Version',
               columnType: 'text',
               width: '150px',
               filterType: 'text'
            }
         ]
      },
      {
         property: 'customProperties',
         label: 'Custom properties',
         renderMode: 'custom-properties'
      }
   ]
};

const logicalEntitySchema: DynamicFormSchema = {
   rootKey: 'entity',
   rootType: 'LogicalEntity',
   displayName: 'Entity',
   iconClass: ModelStructure.LogicalEntity.ICON_CLASS,
   diagnosticPath: 'entity',
   typeProperty: 'type',
   sections: [
      {
         label: 'General',
         fields: [
            { property: 'id', label: 'ID', fieldType: 'text', disabled: true },
            { property: 'name', label: 'Name', fieldType: 'text', required: true, undefinedIfEmpty: true },
            { property: 'description', label: 'Description', fieldType: 'textarea', undefinedIfEmpty: true },
            { property: 'type', label: 'Type', fieldType: 'reference', referenceProperty: 'type' }
         ]
      }
   ],
   collections: [
      {
         property: 'superEntities',
         label: 'Inheritance',
         renderMode: 'dynamic',
         itemType: EntityInheritType,
         addButtonLabel: 'Add Parent Entity',
         noDataMessage: 'No parent entities',
         defaultCollapsed: true,
         columns: [
            {
               property: 'parentId',
               header: 'Parent Entity',
               columnType: 'reference',
               filterType: 'multiselect',
               referenceConfig: {
                  syntheticType: LogicalEntityType,
                  syntheticProperty: 'superEntities',
                  referenceProperty: 'superEntities'
               },
               // Deserialize: extract parentId from various model shapes
               deserialize: (modelValue: any, item: any): string => {
                  if (typeof item === 'string') {
                     return item;
                  }
                  return item?.parentId ?? item?.$refText ?? item?.ref?.id ?? item?.ref?.$globalId ?? '';
               },
               // Serialize: wrap parentId as { $refText: toIdReference(parentId) }
               serialize: (rowValue: any): any => rowValue
            }
         ],
         // Serialize the whole item as a reference object for proper langium serialization
         itemBuilder: (rowData: Record<string, any>): Record<string, any> => ({
            $refText: toIdReference(rowData.parentId || '')
         })
      },
      {
         property: 'attributes',
         label: 'Attributes',
         renderMode: 'dynamic',
         itemType: LogicalAttributeType,
         addButtonLabel: 'Add Attribute',
         noDataMessage: 'No attributes defined',
         resizableColumns: true,
         columnResizeMode: 'fit',
         idGenerator: (row: Record<string, any>, rootObj: any): string =>
            findNextUnique(toId(row.name || ''), rootObj.attributes || [], (attr: any) => attr.id || ''),
         itemBuilder: (rowData: Record<string, any>): Record<string, any> => ({
            ...rowData,
            $globalId: rowData.$globalId || rowData.id
         }),
         columns: [
            {
               property: 'name',
               header: 'Name',
               columnType: 'text',
               required: true,
               width: '20%',
               filterType: 'text'
            },
            {
               property: 'datatype',
               header: 'Data Type',
               columnType: 'dropdown',
               width: '15%',
               dropdownOptions: dataTypeOptions,
               filterType: 'multiselect',
               filterOptions: dataTypeOptions,
               showFilterMatchModes: false
            },
            {
               property: 'length',
               header: 'Length',
               columnType: 'number',
               dataType: 'numeric',
               headerStyle: { width: '70px' },
               style: { width: '70px' },
               headerTooltip: 'Length is applicable only for Text and Binary datatypes',
               dependency: {
                  sourceProperty: 'datatype',
                  isApplicable: isLengthApplicable,
                  disabledTooltip: 'Length is applicable only for Text and Binary datatypes'
               }
            },
            {
               property: 'precision',
               header: 'Precision',
               columnType: 'number',
               dataType: 'numeric',
               headerStyle: { width: '70px' },
               style: { width: '70px' },
               headerTooltip: 'Precision is applicable only for Decimal and Integer datatypes',
               dependency: {
                  sourceProperty: 'datatype',
                  isApplicable: isPrecisionApplicable,
                  disabledTooltip: 'Precision is applicable only for Decimal and Integer datatypes'
               }
            },
            {
               property: 'scale',
               header: 'Scale',
               columnType: 'number',
               dataType: 'numeric',
               headerStyle: { width: '70px' },
               style: { width: '70px' },
               headerTooltip: 'Scale is applicable only for Decimal, Time and DateTime datatypes',
               dependency: {
                  sourceProperty: 'datatype',
                  isApplicable: isScaleApplicable,
                  disabledTooltip: 'Scale is applicable only for Decimal, Time and DateTime datatypes'
               }
            },
            {
               property: 'mandatory',
               header: 'Mandatory',
               columnType: 'boolean',
               dataType: 'boolean',
               headerStyle: { width: '50px', textAlign: 'center' },
               style: { width: '50px', textAlign: 'center' },
               filterType: 'boolean',
               showFilterMatchModes: false
            },
            {
               property: 'description',
               header: 'Description',
               columnType: 'text',
               filterType: 'text'
            }
         ]
      },
      {
         property: 'identifiers',
         label: 'Identifiers',
         renderMode: 'dynamic',
         itemType: LogicalIdentifierType,
         addButtonLabel: 'Add Identifier',
         noDataMessage: 'No identifiers defined',
         idGenerator: (row: Record<string, any>, rootObj: any): string => {
            const identifierName = row.primary && !row.name ? 'Primary Identifier' : row.name || '';
            return findNextUnique(toId(identifierName), rootObj.identifiers || [], (id: any) => id.id || '');
         },
         itemBuilder: (rowData: Record<string, any>, rootObj: any): Record<string, any> => {
            const { attributeIds, name, primary, ...rest } = rowData;
            const identifierName = primary && !name ? 'Primary Identifier' : name || '';
            return {
               ...rest,
               name: identifierName,
               primary: Boolean(primary),
               // Map attributeIds back to the model's `attributes` array
               attributes: attributeIds || [],
               $type: LogicalIdentifierType,
               $globalId: rowData.$globalId || `${rootObj.id}.${rowData.id}`
            };
         },
         columns: [
            {
               property: 'name',
               header: 'Name',
               columnType: 'text',
               required: true,
               width: '20%',
               filterType: 'text'
            },
            {
               property: 'primary',
               header: 'Primary',
               columnType: 'boolean',
               dataType: 'boolean',
               headerStyle: { width: '10%' },
               filterType: 'boolean',
               showFilterMatchModes: false
            },
            {
               property: 'attributeIds',
               header: 'Attributes',
               columnType: 'multiselect',
               width: '30%',
               filterType: 'text',
               multiSelectConfig: {
                  optionsProvider: (rootObj: any) =>
                     (rootObj.attributes || []).map((attr: any) => ({
                        label: attr.name || attr.id || '',
                        value: attr.id
                     }))
               },
               // Deserialize: convert attribute references from model's `attributes` to string IDs
               // Note: modelValue is item['attributeIds'] which is undefined; we read from item.attributes
               deserialize: (_modelValue: any, item: any): string[] =>
                  (item.attributes || []).map((attr: any) => (typeof attr === 'object' ? attr.id : String(attr).replace(/^[-_]+/, ''))),
               // Serialize: pass through (itemBuilder maps attributeIds back to attributes)
               serialize: (rowValue: any): any => rowValue
            },
            {
               property: 'description',
               header: 'Description',
               columnType: 'text',
               width: '20%',
               filterType: 'text'
            }
         ]
      },
      {
         property: 'customProperties',
         label: 'Custom properties',
         renderMode: 'custom-properties'
      }
   ]
};

const relationshipSchema: DynamicFormSchema = {
   rootKey: 'relationship',
   rootType: 'Relationship',
   displayName: 'Relationship',
   iconClass: ModelStructure.Relationship.ICON_CLASS,
   diagnosticPath: 'relationship',
   typeProperty: 'type',
   sections: [
      {
         label: 'General',
         fields: [
            { property: 'id', label: 'ID', fieldType: 'text', disabled: true },
            { property: 'name', label: 'Name', fieldType: 'text', required: true, undefinedIfEmpty: true },
            { property: 'description', label: 'Description', fieldType: 'textarea', undefinedIfEmpty: true },
            { property: 'type', label: 'Type', fieldType: 'reference', referenceProperty: 'type' },
            { property: 'parent', label: 'Parent', fieldType: 'reference', referenceProperty: 'parent' },
            { property: 'child', label: 'Child', fieldType: 'reference', referenceProperty: 'child' },
            { property: 'parentRole', label: 'Parent Role', fieldType: 'text', undefinedIfEmpty: true },
            { property: 'childRole', label: 'Child Role', fieldType: 'text', undefinedIfEmpty: true },
            {
               property: 'parentCardinality',
               label: 'Parent Cardinality',
               fieldType: 'dropdown',
               dropdownOptions: [
                  { label: '0..1', value: '0..1' },
                  { label: '1..1', value: '1..1' },
                  { label: '0..N', value: '0..N' },
                  { label: '1..N', value: '1..N' }
               ]
            },
            {
               property: 'childCardinality',
               label: 'Child Cardinality',
               fieldType: 'dropdown',
               dropdownOptions: [
                  { label: '0..1', value: '0..1' },
                  { label: '1..1', value: '1..1' },
                  { label: '0..N', value: '0..N' },
                  { label: '1..N', value: '1..N' }
               ]
            }
         ]
      }
   ],
   collections: [
      {
         property: 'attributes',
         label: 'Attributes',
         renderMode: 'dynamic',
         itemType: RelationshipAttributeType,
         addButtonLabel: 'Add Attribute',
         noDataMessage: 'No attributes',
         columns: [
            {
               property: 'parent',
               header: 'Parent',
               columnType: 'reference',
               required: true,
               width: '40%',
               filterType: 'multiselect',
               referenceConfig: {
                  syntheticType: RelationshipAttributeType
               }
            },
            {
               property: 'child',
               header: 'Child',
               columnType: 'reference',
               required: true,
               filterType: 'multiselect',
               referenceConfig: {
                  syntheticType: RelationshipAttributeType
               }
            }
         ]
      },
      {
         property: 'customProperties',
         label: 'Custom properties',
         renderMode: 'custom-properties'
      }
   ]
};

const objectDefinitionSchema: DynamicFormSchema = {
   rootKey: 'objectDefinition',
   rootType: 'ObjectDefinition',
   displayName: 'Object Definition',
   iconClass: ModelStructure.ObjectDefinition.ICON_CLASS,
   diagnosticPath: 'objectDefinition',
   typeProperty: 'extends',
   sections: [
      {
         label: 'General',
         fields: [
            { property: 'id', label: 'ID', fieldType: 'text', disabled: true },
            { property: 'name', label: 'Name', fieldType: 'text', required: true, undefinedIfEmpty: true },
            { property: 'description', label: 'Description', fieldType: 'textarea', undefinedIfEmpty: true },
            { property: 'abstract', label: 'Abstract', fieldType: 'boolean' },
            { property: 'extends', label: 'Extends', fieldType: 'reference', referenceProperty: 'extends' }
         ]
      }
   ],
   collections: [
      {
         property: 'customProperties',
         label: 'Property Definitions',
         renderMode: 'custom-properties'
      }
   ]
};

// --- Item-level schemas (for row detail dialogs) ---

/** Shared rootKey for all item-level schemas used in the row detail dialog. */
export const ITEM_ROOT_KEY = 'item';

const logicalAttributeItemSchema: DynamicFormSchema = {
   rootKey: ITEM_ROOT_KEY,
   rootType: LogicalAttributeType,
   displayName: 'Attribute',
   iconClass: 'codicon codicon-symbol-field',
   diagnosticPath: ITEM_ROOT_KEY,
   typeProperty: 'type',
   sections: [
      {
         label: 'General',
         fields: [
            { property: 'id', label: 'ID', fieldType: 'text', disabled: true },
            { property: 'name', label: 'Name', fieldType: 'text', required: true, undefinedIfEmpty: true },
            { property: 'description', label: 'Description', fieldType: 'textarea', undefinedIfEmpty: true },
            { property: 'type', label: 'Type', fieldType: 'reference', referenceProperty: 'type' },
            {
               property: 'datatype',
               label: 'Data Type',
               fieldType: 'dropdown',
               dropdownOptions: dataTypeOptions
            },
            {
               property: 'length',
               label: 'Length',
               fieldType: 'number',
               dependency: {
                  sourceProperty: 'datatype',
                  isApplicable: isLengthApplicable,
                  disabledTooltip: 'Length is applicable only for Text and Binary datatypes'
               }
            },
            {
               property: 'precision',
               label: 'Precision',
               fieldType: 'number',
               dependency: {
                  sourceProperty: 'datatype',
                  isApplicable: isPrecisionApplicable,
                  disabledTooltip: 'Precision is applicable only for Decimal and Integer datatypes'
               }
            },
            {
               property: 'scale',
               label: 'Scale',
               fieldType: 'number',
               dependency: {
                  sourceProperty: 'datatype',
                  isApplicable: isScaleApplicable,
                  disabledTooltip: 'Scale is applicable only for Decimal, Time and DateTime datatypes'
               }
            },
            { property: 'mandatory', label: 'Mandatory', fieldType: 'boolean' }
         ]
      }
   ],
   collections: [
      {
         property: 'customProperties',
         label: 'Custom Properties',
         renderMode: 'custom-properties'
      }
   ]
};

const logicalIdentifierItemSchema: DynamicFormSchema = {
   rootKey: ITEM_ROOT_KEY,
   rootType: LogicalIdentifierType,
   displayName: 'Identifier',
   iconClass: 'codicon codicon-key',
   diagnosticPath: ITEM_ROOT_KEY,
   typeProperty: 'type',
   sections: [
      {
         label: 'General',
         fields: [
            { property: 'id', label: 'ID', fieldType: 'text', disabled: true },
            { property: 'name', label: 'Name', fieldType: 'text', required: true, undefinedIfEmpty: true },
            { property: 'description', label: 'Description', fieldType: 'textarea', undefinedIfEmpty: true },
            { property: 'type', label: 'Type', fieldType: 'reference', referenceProperty: 'type' },
            { property: 'primary', label: 'Primary', fieldType: 'boolean' }
         ]
      }
   ],
   collections: [
      {
         property: 'customProperties',
         label: 'Custom Properties',
         renderMode: 'custom-properties'
      }
   ]
};

// --- Schema Registry ---

const SCHEMA_REGISTRY = new Map<string, DynamicFormSchema>();
SCHEMA_REGISTRY.set('DataModel', dataModelSchema);
SCHEMA_REGISTRY.set('LogicalEntity', logicalEntitySchema);
SCHEMA_REGISTRY.set('Relationship', relationshipSchema);
SCHEMA_REGISTRY.set('ObjectDefinition', objectDefinitionSchema);
SCHEMA_REGISTRY.set(LogicalAttributeType, logicalAttributeItemSchema);
SCHEMA_REGISTRY.set(LogicalIdentifierType, logicalIdentifierItemSchema);

/**
 * Finds the appropriate DynamicFormSchema for a given CrossModelRoot.
 * Returns undefined if no schema is registered for the root's semantic object type.
 */
export function getSchemaForRoot(root: CrossModelRoot): DynamicFormSchema | undefined {
   const semanticRoot = getSemanticRoot(root);
   if (!semanticRoot) {
      return undefined;
   }
   return SCHEMA_REGISTRY.get(semanticRoot.$type);
}

/**
 * Finds the appropriate DynamicFormSchema for a collection item by its $type.
 * Used by the row detail dialog to render item-level forms.
 */
export function getSchemaForType(type: string): DynamicFormSchema | undefined {
   return SCHEMA_REGISTRY.get(type);
}
