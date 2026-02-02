/********************************************************************************
 * Copyright (c) 2025 CrossBreeze.
 ********************************************************************************/
import * as React from 'react';

/**
 * Supported field widget types for dynamic form rendering.
 */
export type FieldType = 'text' | 'textarea' | 'number' | 'boolean' | 'reference' | 'dropdown' | 'readonly';

/**
 * Describes a single scalar field in a dynamic form.
 */
export interface FieldDescriptor {
   /** The property name on the model object (e.g., 'name', 'description', 'parent'). */
   property: string;
   /** Human-readable label displayed next to the field. */
   label: string;
   /** What kind of widget to render. */
   fieldType: FieldType;
   /** Whether this field is required. */
   required?: boolean;
   /** For dropdown fields: static options. */
   dropdownOptions?: Array<{ label: string; value: string }>;
   /** For reference fields: the property name used to build CrossReferenceContext. Defaults to `property`. */
   referenceProperty?: string;
   /** If true, empty string values are converted to undefined before dispatch. */
   undefinedIfEmpty?: boolean;
   /** If true, the field is always disabled regardless of readonly mode. */
   disabled?: boolean;
   /** Dependency on another field that controls applicability (disabled/dimmed when not applicable). */
   dependency?: FieldDependency;
}

/**
 * Condition that determines whether a form field is applicable based on the value of another field.
 * When the field is not applicable, it is disabled and dimmed.
 */
export interface FieldDependency {
   /** The property name of the field whose value controls applicability (e.g., 'datatype'). */
   sourceProperty: string;
   /** Predicate that determines if the field is applicable given the source value. */
   isApplicable: (sourceValue: any) => boolean;
   /** Tooltip shown when the field is not applicable. */
   disabledTooltip?: string;
}

/**
 * Column type for dynamic grid rendering.
 */
export type GridColumnType = 'text' | 'number' | 'boolean' | 'dropdown' | 'reference' | 'multiselect';

/**
 * Configuration for reference columns that resolve cross-model references.
 */
export interface ReferenceConfig {
   /** The $type string for the synthetic element in CrossReferenceContext (e.g., 'RelationshipAttribute'). */
   syntheticType: string;
   /** The synthetic element property. Defaults to the collection's `property`. */
   syntheticProperty?: string;
   /** The property name in CrossReferenceContext. Defaults to the column's `property`. */
   referenceProperty?: string;
}

/**
 * Configuration for multiselect columns.
 */
export interface MultiSelectConfig {
   /** Function that returns the available options for the multiselect, given the root object. */
   optionsProvider: (rootObj: any) => Array<{ label: string; value: string }>;
   /** Optional function to format the display value from selected values. Defaults to comma-joined labels. */
   displayFormatter?: (selectedValues: any[], options: Array<{ label: string; value: string }>) => string;
}

/**
 * Condition that determines whether a column is applicable based on the value of another column.
 * When the column is not applicable, its editor is disabled and its body is dimmed.
 */
export interface ColumnDependency {
   /** The property name of the column whose value controls visibility (e.g., 'datatype'). */
   sourceProperty: string;
   /** Predicate that determines if the column is applicable given the source value. */
   isApplicable: (sourceValue: any) => boolean;
   /** Tooltip shown when the column is not applicable. */
   disabledTooltip?: string;
}

/**
 * Describes a single column in a DynamicDataGrid.
 */
export interface GridColumnDescriptor {
   /** The property name on the collection item (e.g., 'parent', 'datamodel', 'version'). */
   property: string;
   /** Column header label. */
   header: string;
   /** What kind of editor to render. */
   columnType: GridColumnType;
   /** Optional column width style (e.g., '40%', '150px'). */
   width?: string;
   /** Optional column style override. */
   style?: React.CSSProperties;
   /** Optional column header style override. */
   headerStyle?: React.CSSProperties;
   /** Header tooltip text. */
   headerTooltip?: string;
   /** For 'dropdown' columns: static options with label/value pairs. */
   dropdownOptions?: Array<{ label: string; value: string }>;
   /** For 'reference' columns: configuration for building the CrossReferenceContext. */
   referenceConfig?: ReferenceConfig;
   /** For 'multiselect' columns: configuration for options and display. */
   multiSelectConfig?: MultiSelectConfig;
   /** Filter type for the column. Defaults based on columnType if not set. */
   filterType?: 'text' | 'multiselect' | 'dropdown' | 'boolean';
   /** Static filter options (for multiselect/dropdown filter types). */
   filterOptions?: Array<{ label: string; value: string }>;
   /** Whether to show filter match modes. */
   showFilterMatchModes?: boolean;
   /** PrimeReact dataType for the column (e.g., 'numeric', 'boolean'). */
   dataType?: string;
   /** Whether this column is required. Required columns are always kept during serialization even if empty. */
   required?: boolean;
   /** Dependency on another column that controls applicability (disabled/dimmed when not applicable). */
   dependency?: ColumnDependency;
   /**
    * Deserializes the raw model value to the row value used for display and editing.
    * Called when syncing model data to grid rows.
    * @param modelValue The raw value from the model object.
    * @param item The full model item.
    * @returns The deserialized value for the grid row.
    */
   deserialize?: (modelValue: any, item: any) => any;
   /**
    * Serializes the row value back to the model value for persistence.
    * Called when saving row edits back to the model.
    * @param rowValue The value from the grid row.
    * @param row The full grid row data.
    * @returns The serialized value for the model.
    */
   serialize?: (rowValue: any, row: Record<string, any>) => any;
}

/**
 * Describes a collection (array property) in a dynamic form.
 */
export interface CollectionDescriptor {
   /** The array property name on the model object (e.g., 'attributes', 'dependencies'). */
   property: string;
   /** Human-readable label for the section header and add button. */
   label: string;
   /**
    * Rendering strategy:
    * - 'existing': Delegate to an existing hand-coded DataGrid component.
    * - 'custom-properties': Use the existing CustomPropertiesDataGrid.
    * - 'dynamic': Render via DynamicDataGrid using column descriptors.
    */
   renderMode: 'existing' | 'custom-properties' | 'dynamic';
   /** For 'existing' mode: the React component to render. */
   existingComponent?: React.ComponentType<any>;
   /** Whether the section is collapsed by default. */
   defaultCollapsed?: boolean;
   /** For 'dynamic' mode: columns describing the grid layout. */
   columns?: GridColumnDescriptor[];
   /** For 'dynamic' mode: the $type string of the collection item (e.g., 'RelationshipAttribute'). */
   itemType?: string;
   /** For 'dynamic' mode: label for the add button (e.g., 'Add Attribute'). */
   addButtonLabel?: string;
   /** For 'dynamic' mode: message when no rows exist (e.g., 'No attributes'). */
   noDataMessage?: string;
   /**
    * For 'dynamic' mode: custom ID generator for new rows.
    * Receives the row data and the root object, returns a unique ID string.
    * If not provided, IDs are auto-derived from $globalId, id, or index.
    */
   idGenerator?: (row: Record<string, any>, rootObj: any) => string;
   /**
    * For 'dynamic' mode: custom function to build the item before dispatching add.
    * Receives the cleaned row data (without internal fields) and the root object.
    * Returns the final item to dispatch. Useful for setting $globalId, etc.
    */
   itemBuilder?: (rowData: Record<string, any>, rootObj: any) => Record<string, any>;
   /** For 'dynamic' mode: enables resizable columns. */
   resizableColumns?: boolean;
   /** For 'dynamic' mode: column resize mode ('fit' or 'expand'). */
   columnResizeMode?: 'fit' | 'expand';
}

/**
 * A group of fields rendered together in an accordion section.
 */
export interface FormSectionDescriptor {
   /** Section header label. */
   label: string;
   /** Fields in this section. */
   fields: FieldDescriptor[];
   /** Whether the section is collapsed by default. */
   defaultCollapsed?: boolean;
}

/**
 * Complete schema for dynamically rendering a form for a specific root object type.
 */
export interface DynamicFormSchema {
   /** Which key on CrossModelRoot (or synthetic wrapper) this schema applies to (e.g., 'datamodel', 'entity', 'item'). */
   rootKey: string;
   /** The $type value of the root object (e.g., 'DataModel', 'LogicalEntity'). */
   rootType: string;
   /** Display name for the form header. */
   displayName: string;
   /** CSS icon class for the form header. */
   iconClass: string;
   /** Diagnostic element path prefix (e.g., 'datamodel', 'entity'). */
   diagnosticPath: string;
   /**
    * The property on rootObj whose value is an ObjectDefinition reference used to resolve
    * inherited property definitions (via useTypeProperties). For instance forms (Entity, DataModel,
    * Relationship) this is 'type'; for ObjectDefinition forms this is 'extends'.
    * Omit or set to undefined if no type-based property inheritance applies.
    */
   typeProperty?: string;
   /** Top-level field sections. */
   sections: FormSectionDescriptor[];
   /** Collection/array properties. */
   collections: CollectionDescriptor[];
}
