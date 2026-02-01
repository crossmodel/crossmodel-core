/********************************************************************************
 * Copyright (c) 2025 CrossBreeze.
 ********************************************************************************/
import { CustomProperty, CustomPropertyType, ResolvedPropertyDefinition, findNextUnique, toId } from '@crossmodel/protocol';
import { DataTableRowEditEvent } from 'primereact/datatable';
import { Tag } from 'primereact/tag';
import * as React from 'react';
import { useModelDispatch, useReadonly } from '../../ModelContext';
import { ErrorView } from '../ErrorView';
import { EditorProperty, GenericTextEditor } from './GenericEditors';
import { GridColumn, handleGenericRowReorder, PrimeDataGrid } from './PrimeDataGrid';
import { wasSaveTriggeredByEnter } from './gridKeydownHandler';

export interface CustomPropertyRow extends CustomProperty {
   idx: number;
   _uncommitted?: boolean;
   /** Source definition id for type-defined properties */
   _source?: string;
   /** Whether the property is inherited from a parent type definition */
   _inherited?: boolean;
   /** Whether this is a type-defined property row (not yet persisted locally, value-only editing) */
   _typeProperty?: boolean;
}

export interface CustomPropertiesDataGridProps {
   /** The context type used as prefix for dispatch action types and diagnostic paths. */
   contextType: string;
   /** The custom properties array from the current context */
   customProperties?: CustomProperty[];
   /** Error message to show when no context is available */
   errorMessage: string;
   /** Property definitions from the type's ObjectDefinition (resolved from the extends chain) */
   propertyDefinitions?: ResolvedPropertyDefinition[];
}

const deriveCustomPropertyRowId = (prop: Partial<CustomProperty>, idx: number): string => {
   const persistedId = prop.id as string | undefined;
   const globalId = prop.$globalId as string | undefined;
   return persistedId ?? globalId ?? `customProperty-${idx}`;
};

export function CustomPropertiesDataGrid({
   contextType,
   customProperties,
   errorMessage,
   propertyDefinitions
}: CustomPropertiesDataGridProps): React.ReactElement {
   // Cast dispatch since this component constructs action types dynamically from contextType
   const dispatch = useModelDispatch() as (action: Record<string, any>) => void;
   const readonly = useReadonly();
   const [editingRows, setEditingRows] = React.useState<Record<string, boolean>>({});
   const [gridData, setGridData] = React.useState<CustomPropertyRow[]>([]);
   const [selectedRows, setSelectedRows] = React.useState<CustomPropertyRow[]>([]);
   const pendingDeleteIdsRef = React.useRef<Set<string>>(new Set());
   const propertiesRef = React.useRef(customProperties || []);

   const handleSelectionChange = React.useCallback((e: { value: CustomPropertyRow[] }): void => {
      setSelectedRows(e.value);
   }, []);

   // Build a map from property definition id to its metadata for quick lookups
   const propertyDefMap = React.useMemo(() => {
      const map = new Map<string, ResolvedPropertyDefinition>();
      if (propertyDefinitions) {
         for (const pd of propertyDefinitions) {
            const defId = pd.id ?? pd.name ?? '';
            if (defId) {
               map.set(defId, pd);
            }
         }
      }
      return map;
   }, [propertyDefinitions]);

   // Update grid data when properties change, preserving any uncommitted rows
   React.useEffect(() => {
      setGridData(current => {
         propertiesRef.current = customProperties || [];
         const props = customProperties || [];

         // Build committed rows from local custom properties, enriching with type definition metadata
         const localIds = new Set<string>();
         const committedData = props.map((prop, idx) => {
            const rowId = deriveCustomPropertyRowId(prop, idx);
            localIds.add(rowId);
            const pd = propertyDefMap.get(rowId);
            return {
               ...prop,
               idx,
               id: rowId,
               // If the property matches a type definition, enrich with source info
               ...(pd
                  ? {
                       _source: pd.sourceDefinitionId,
                       _inherited: pd.inherited,
                       _typeProperty: true,
                       // Fill in display-only fields from definition when not set locally
                       name: prop.name || pd.name || rowId,
                       description: prop.description || pd.description || ''
                    }
                  : {})
            };
         });

         const committedIds = new Set(committedData.map(prop => prop.id));
         pendingDeleteIdsRef.current.forEach(id => {
            if (!committedIds.has(id)) {
               pendingDeleteIdsRef.current.delete(id);
            }
         });

         const visibleCommittedData = committedData.filter(row => !pendingDeleteIdsRef.current.has(row.id));

         // Add type property rows for definitions that don't have a local custom property yet
         const typePropertyRows: CustomPropertyRow[] = [];
         if (propertyDefinitions) {
            for (const pd of propertyDefinitions) {
               const defId = pd.id ?? pd.name ?? '';
               if (defId && !localIds.has(defId)) {
                  typePropertyRows.push({
                     $type: CustomPropertyType,
                     $globalId: '',
                     id: defId,
                     name: pd.name ?? defId,
                     description: pd.description ?? '',
                     value: '',
                     idx: -1,
                     _source: pd.sourceDefinitionId,
                     _inherited: pd.inherited,
                     _typeProperty: true
                  });
               }
            }
         }

         const uncommittedRows = current.filter(row => row._uncommitted && editingRows[row.id]);

         return [...typePropertyRows, ...visibleCommittedData, ...uncommittedRows];
      });
   }, [customProperties, editingRows, propertyDefMap, propertyDefinitions]);

   const defaultEntry = React.useMemo<CustomPropertyRow>(
      () => ({
         $type: CustomPropertyType,
         $globalId: 'toBeAssigned',
         name: '',
         id: '', // ID will be assigned when adding the row
         value: '',
         description: '',
         idx: -1
      }),
      []
   );

   const onRowUpdate = React.useCallback(
      (customProperty: CustomPropertyRow) => {
         if (customProperty._typeProperty && !customProperty._uncommitted) {
            // Type-defined property row — only store id + value
            const hasValue = customProperty.value !== undefined && customProperty.value !== '';

            if (customProperty.idx >= 0) {
               if (hasValue) {
                  // Update existing local custom property — only store id and value
                  const existingProp = (customProperties ?? [])[customProperty.idx];
                  dispatch({
                     type: `${contextType}:customProperty:update`,
                     customPropertyIdx: customProperty.idx,
                     customProperty: {
                        $type: existingProp.$type,
                        $globalId: existingProp.$globalId,
                        id: existingProp.id,
                        value: customProperty.value
                     }
                  });
               } else {
                  // Value cleared — remove the custom property from the file
                  dispatch({
                     type: `${contextType}:customProperty:delete-customProperty`,
                     customPropertyIdx: customProperty.idx
                  });
               }
            } else if (hasValue) {
               // No local custom property yet — add a new one with only id and value
               const newProp: CustomProperty = {
                  $type: CustomPropertyType,
                  $globalId: 'toBeAssigned',
                  id: customProperty.id,
                  value: customProperty.value
               };
               dispatch({
                  type: `${contextType}:customProperty:add-customProperty`,
                  customProperty: newProp
               });
            }
            setEditingRows({});
            return;
         }

         if (customProperty._uncommitted) {
            // For uncommitted rows, check if anything actually changed
            const hasChanges =
               customProperty.name !== defaultEntry.name ||
               customProperty.value !== defaultEntry.value ||
               customProperty.description !== defaultEntry.description;

            if (!hasChanges) {
               // Remove the row if no changes
               setGridData(current => current.filter(row => row.id !== customProperty.id));
               setEditingRows({});
               return;
            }

            // Only dispatch if there are actual changes
            // Generate a proper ID for the new custom property
            const newId = findNextUnique(toId(customProperty.name || ''), customProperties || [], prop => prop.id || '');

            // Create the final property without temporary fields and empty fields
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { _uncommitted, id: tempId, description, value, _source, _inherited, _typeProperty, ...propertyData } = customProperty;
            const finalProperty = {
               ...propertyData,
               id: newId,
               ...(description ? { description } : {}),
               ...(value ? { value } : {})
            };

            // Add the new property through dispatch
            dispatch({
               type: `${contextType}:customProperty:add-customProperty`,
               customProperty: finalProperty
            });

            if (wasSaveTriggeredByEnter()) {
               const newTempRow: CustomPropertyRow = {
                  ...defaultEntry,
                  id: `temp-${Date.now()}-${Math.random().toString(36).substring(2)}`,
                  _uncommitted: true
               };

               setTimeout(() => {
                  setGridData(current => [...current, newTempRow]);
                  setEditingRows({ [newTempRow.id]: true });
               }, 50);
            }
         } else {
            // This is an existing row being updated
            // Remove empty fields and internal fields before updating
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { description, value, _source, _inherited, _typeProperty, ...rest } = customProperty;
            const updatedProperty = {
               ...rest,
               ...(description ? { description } : {}),
               ...(value ? { value } : {})
            };

            dispatch({
               type: `${contextType}:customProperty:update`,
               customPropertyIdx: customProperty.idx,
               customProperty: updatedProperty
            });
         }

         // Clear editing state after successful update
         setEditingRows({});
      },
      [dispatch, defaultEntry, customProperties, contextType]
   );

   const onRowAdd = React.useCallback((): void => {
      // Clear any existing edit states first
      setEditingRows({});

      // Create a new uncommitted row with a unique temporary ID
      const tempRow: CustomPropertyRow = {
         ...defaultEntry,
         id: `temp-${Date.now()}-${Math.random().toString(36).substring(2)}`, // Ensure uniqueness
         _uncommitted: true
      };

      // Add to grid data and set it to editing mode
      setGridData(current => [...current, tempRow]);
      setEditingRows({ [tempRow.id]: true });
   }, [defaultEntry]);

   const handleRowReorder = React.useCallback(
      (e: { rows: CustomPropertyRow[] }): void => {
         handleGenericRowReorder(
            e,
            pendingDeleteIdsRef.current,
            propertiesRef.current || [],
            deriveCustomPropertyRowId,
            reorderedProperties => {
               dispatch({
                  type: `${contextType}:customProperty:reorder-customProperties`,
                  customProperties: reorderedProperties
               });
            }
         );
      },
      [dispatch, contextType]
   );

   const handleRowDelete = React.useCallback(
      (customProperty: CustomPropertyRow): void => {
         if (customProperty.id && !customProperty._uncommitted) {
            pendingDeleteIdsRef.current.add(customProperty.id);
         }

         setGridData(current => current.filter(row => row.id !== customProperty.id));
         setSelectedRows(current => current.filter(row => row.id !== customProperty.id));

         if (customProperty._uncommitted) {
            if (customProperty.id) {
               pendingDeleteIdsRef.current.delete(customProperty.id);
            }
            return;
         }

         const customPropertyIdx =
            (customProperties || []).findIndex((prop, idx) => deriveCustomPropertyRowId(prop, idx) === customProperty.id);
         if (customPropertyIdx === -1) {
            if (customProperty.id) {
               pendingDeleteIdsRef.current.delete(customProperty.id);
            }
            return;
         }

         dispatch({
            type: `${contextType}:customProperty:delete-customProperty`,
            customPropertyIdx
         });
      },
      [dispatch, contextType, customProperties]
   );

   const basePath = React.useMemo(() => [contextType, 'customProperties'], [contextType]);

   const hasTypeProperties = propertyDefinitions && propertyDefinitions.length > 0;

   const nameBody = React.useCallback(
      (rowData: CustomPropertyRow) => {
         if (rowData._typeProperty) {
            // Type-defined property: show bold name for mandatory, with asterisk
            const pd = propertyDefMap.get(rowData.id);
            const isMandatory = pd?.mandatory ?? false;
            return (
               <span style={{ fontWeight: isMandatory ? 'bold' : 'normal' }}>
                  {rowData.name || rowData.id}
                  {isMandatory && <span style={{ color: 'var(--red-500)', marginLeft: '2px' }}>*</span>}
               </span>
            );
         }
         return <EditorProperty basePath={basePath} field='name' row={rowData} value={rowData.name || ''} />;
      },
      [basePath, propertyDefMap]
   );

   const nameEditor = React.useCallback(
      (options: any) => {
         const rowData = options.rowData as CustomPropertyRow;
         // Type-defined property rows: name is not editable
         if (rowData._typeProperty) {
            return <span>{rowData.name || rowData.id}</span>;
         }
         return <GenericTextEditor options={options} basePath={basePath} field='name' />;
      },
      [basePath]
   );

   const descriptionBody = React.useCallback(
      (rowData: CustomPropertyRow) => {
         if (rowData._typeProperty) {
            // Type-defined: description is read-only from the definition
            return <span>{rowData.description || ''}</span>;
         }
         return <EditorProperty basePath={basePath} field='description' row={rowData} value={rowData.description || ''} />;
      },
      [basePath]
   );

   const descriptionEditor = React.useCallback(
      (options: any) => {
         const rowData = options.rowData as CustomPropertyRow;
         if (rowData._typeProperty) {
            return <span>{rowData.description || ''}</span>;
         }
         return <GenericTextEditor options={options} basePath={basePath} field='description' />;
      },
      [basePath]
   );

   const valueBody = React.useCallback(
      (rowData: CustomPropertyRow) => {
         if (rowData._typeProperty && !rowData.value) {
            const pd = propertyDefMap.get(rowData.id);
            const defaultVal = pd?.resolvedDefaultValue;
            return (
               <span style={{ color: 'var(--text-color-secondary)', fontStyle: 'italic' }}>
                  {defaultVal !== undefined ? `${defaultVal} (default)` : '(not set)'}
               </span>
            );
         }
         return <EditorProperty basePath={basePath} field='value' row={rowData} value={rowData.value || ''} />;
      },
      [basePath, propertyDefMap]
   );

   const sourceBody = React.useCallback(
      (rowData: CustomPropertyRow) => {
         if (!rowData._source) {
            return <span>{'\u2014'}</span>;
         }
         return (
            <Tag
               value={rowData._source}
               severity={rowData._inherited ? 'info' : 'success'}
               style={{ fontSize: '0.75rem' }}
            />
         );
      },
      []
   );

   const columns = React.useMemo<GridColumn<CustomPropertyRow>[]>(() => {
      const cols: GridColumn<CustomPropertyRow>[] = [
         {
            field: 'name',
            header: 'Name',
            editor: nameEditor,
            body: nameBody,
            style: { width: '20%' },
            filterType: 'text'
         },
         {
            field: 'value',
            header: 'Value',
            editor: (options: any) => <GenericTextEditor options={options} basePath={basePath} field='value' />,
            body: valueBody,
            style: { width: '20%' },
            filterType: 'text'
         },
         {
            field: 'description',
            header: 'Description',
            editor: descriptionEditor,
            body: descriptionBody,
            filterType: 'text'
         }
      ];
      if (hasTypeProperties) {
         cols.push({
            field: '_source' as keyof CustomPropertyRow,
            header: 'Source',
            body: sourceBody,
            style: { width: '15%' },
            filterType: 'text'
         });
      }
      return cols;
   }, [basePath, nameEditor, nameBody, valueBody, descriptionEditor, descriptionBody, sourceBody, hasTypeProperties]);

   if (!customProperties) {
      return <ErrorView errorMessage={errorMessage} />;
   }

   return (
      <PrimeDataGrid
         className='custom-properties-datatable'
         columns={columns}
         data={gridData}
         keyField='id'
         height='auto'
         onRowAdd={onRowAdd}
         onRowUpdate={onRowUpdate}
         onRowDelete={handleRowDelete}
         onRowReorder={handleRowReorder}
         selectedRows={selectedRows}
         onSelectionChange={handleSelectionChange}
         defaultNewRow={defaultEntry}
         readonly={readonly}
         noDataMessage='No custom properties'
         addButtonLabel='Add Property'
         editingRows={editingRows}
         metaKeySelection={false}
         onRowEditChange={(e: DataTableRowEditEvent) => {
            const newEditingRows = e.data as Record<string, boolean>;
            const newEditingId = Object.keys(newEditingRows)[0];
            const currentEditingId = editingRows ? Object.keys(editingRows)[0] : undefined;

            // If we're stopping editing a row (either by cancelling or completing)
            if (currentEditingId && !newEditingRows[currentEditingId]) {
               const currentRow = gridData.find(row => row.id === currentEditingId);

               // Always remove uncommitted rows when editing stops
               if (currentRow?._uncommitted) {
                  setGridData(current => current.filter(row => row.id !== currentEditingId));
               }
            }

            // Update editing state
            setEditingRows(newEditingRows);

            // Clean up any stale uncommitted rows
            setGridData(current => {
               // Keep all committed rows
               const committedRows = current.filter(row => !row._uncommitted);

               // For uncommitted rows, only keep the one being edited (if any)
               const activeUncommittedRow = newEditingId ? current.find(row => row._uncommitted && row.id === newEditingId) : undefined;

               return activeUncommittedRow ? [...committedRows, activeUncommittedRow] : committedRows;
            });
         }}
         globalFilterFields={hasTypeProperties ? ['name', 'value', 'description', '_source'] : ['name', 'value', 'description']}
      />
   );
}
