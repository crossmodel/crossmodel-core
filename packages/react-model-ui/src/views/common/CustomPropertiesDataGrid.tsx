/********************************************************************************
 * Copyright (c) 2025 CrossBreeze.
 ********************************************************************************/
import { CustomProperty, CustomPropertyType, findNextUnique, toId } from '@crossmodel/protocol';
import { DataTableRowEditEvent } from 'primereact/datatable';
import * as React from 'react';
import { useModelDispatch, useReadonly } from '../../ModelContext';
import { ErrorView } from '../ErrorView';
import { EditorProperty, GenericTextEditor } from './GenericEditors';
import { GridColumn, PrimeDataGrid } from './PrimeDataGrid';
import { wasSaveTriggeredByEnter } from './gridKeydownHandler';

export interface CustomPropertyRow extends CustomProperty {
   idx: number;
   _uncommitted?: boolean;
}

export interface CustomPropertiesDataGridProps {
   /** The context type (e.g., 'entity', 'relationship', 'datamodel') */
   contextType: 'entity' | 'relationship' | 'datamodel';
   /** The custom properties array from the current context */
   customProperties?: CustomProperty[];
   /** Error message to show when no context is available */
   errorMessage: string;
}

export function CustomPropertiesDataGrid({
   contextType,
   customProperties,
   errorMessage
}: CustomPropertiesDataGridProps): React.ReactElement {
   const dispatch = useModelDispatch();
   const readonly = useReadonly();
   const [editingRows, setEditingRows] = React.useState<Record<string, boolean>>({});
   const [gridData, setGridData] = React.useState<CustomPropertyRow[]>([]);
   const [selectedRows, setSelectedRows] = React.useState<CustomPropertyRow[]>([]);
   const pendingDeleteIdsRef = React.useRef<Set<string>>(new Set());

   const handleSelectionChange = React.useCallback((e: { value: CustomPropertyRow[] }): void => {
      setSelectedRows(e.value);
   }, []);

   // Update grid data when properties change, preserving any uncommitted rows
   React.useEffect(() => {
      setGridData(current => {
         // Map the committed properties
         const committedData = (customProperties || []).map((prop, idx) => ({
            ...prop,
            idx
         }));

         const currentIds = new Set(committedData.map(prop => prop.id).filter((id): id is string => Boolean(id)));
         pendingDeleteIdsRef.current.forEach(id => {
            if (!currentIds.has(id)) {
               pendingDeleteIdsRef.current.delete(id);
            }
         });

         // Preserve any uncommitted rows that are currently being edited
         const uncommittedRows = current.filter(row => row._uncommitted && editingRows[row.id]);

         return [...committedData, ...uncommittedRows];
      });
   }, [customProperties, editingRows]);

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
            const { _uncommitted, id: tempId, description, value, ...propertyData } = customProperty;
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
            // Remove empty fields before updating
            const { description, value, ...rest } = customProperty;
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
          if (!customProperties) {
             return;
          }
          const filteredRows = e.rows.filter(row => !pendingDeleteIdsRef.current.has(row.id));
          
          const propertyMap = new Map(customProperties.map(prop => [prop.id, prop]));
          const reorderedProperties: CustomProperty[] = [];

          filteredRows.forEach(row => {
             if (row._uncommitted) {
                return;
             }
             const existing = propertyMap.get(row.id);
             if (existing) {
                reorderedProperties.push(existing);
             }
          });

          if (reorderedProperties.length !== customProperties.length) {
             return;
          }

          dispatch({
             type: `${contextType}:customProperty:reorder-customProperties`,
             customProperties: reorderedProperties
          });
      },
      [dispatch, contextType, customProperties]
   );

   const onRowDelete = React.useCallback(
      (customProperty: CustomPropertyRow): void => {
         if (customProperty.id) {
            pendingDeleteIdsRef.current.add(customProperty.id);
         }

         setGridData(current => current.filter(row => row.id !== customProperty.id));
         setSelectedRows(current => current.filter(row => row.id !== customProperty.id));

         dispatch({
            type: `${contextType}:customProperty:delete-customProperty`,
            customPropertyIdx: customProperty.idx
         });
      },
      [dispatch, contextType]
   );

   const basePath = React.useMemo(() => [contextType, 'customProperties'], [contextType]);

   const columns = React.useMemo<GridColumn<CustomPropertyRow>[]>(
      () => [
         {
            field: 'name',
            header: 'Name',
            editor: (options: any) => <GenericTextEditor options={options} basePath={basePath} field='name' />,
            body: (rowData: CustomPropertyRow) => (
               <EditorProperty basePath={basePath} field='name' row={rowData} value={rowData.name || ''} />
            ),
            style: { width: '20%' },
            filterType: 'text'
         },
         {
            field: 'value',
            header: 'Value',
            editor: (options: any) => <GenericTextEditor options={options} basePath={basePath} field='value' />,
            body: (rowData: CustomPropertyRow) => (
               <EditorProperty basePath={basePath} field='value' row={rowData} value={rowData.value || ''} />
            ),
            style: { width: '20%' },
            filterType: 'text'
         },
         {
            field: 'description',
            header: 'Description',
            editor: (options: any) => <GenericTextEditor options={options} basePath={basePath} field='description' />,
            body: (rowData: CustomPropertyRow) => (
               <EditorProperty basePath={basePath} field='description' row={rowData} value={rowData.description || ''} />
            ),
            filterType: 'text'
         }
      ],
      [basePath]
   );

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
         onRowDelete={onRowDelete}
         onRowReorder={handleRowReorder}
         selectedRows={selectedRows}
         onSelectionChange={handleSelectionChange}
         defaultNewRow={defaultEntry}
         readonly={readonly}
         noDataMessage='No custom properties'
         addButtonLabel='Add Property'
         editingRows={editingRows}
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
         globalFilterFields={['name', 'value', 'description']}
      />
   );
}
