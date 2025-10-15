/********************************************************************************
 * Copyright (c) 2025 CrossBreeze.
 ********************************************************************************/
import { CustomProperty, CustomPropertyType, findNextUnique, toId } from '@crossmodel/protocol';
import { DataTableRowEditEvent } from 'primereact/datatable';
import * as React from 'react';
import { useModelDispatch, useReadonly, useRelationship } from '../../ModelContext';
import { ErrorView } from '../ErrorView';
import { GridColumn, PrimeDataGrid } from './PrimeDataGrid';

export interface CustomPropertyRow extends CustomProperty {
   idx: number;
}

export function RelationshipCustomPropertiesDataGrid(): React.ReactElement {
   const relationship = useRelationship();
   const dispatch = useModelDispatch();
   const readonly = useReadonly();
   const [editingRows, setEditingRows] = React.useState<Record<string, boolean>>({});
   const [validationErrors, setValidationErrors] = React.useState<Record<string, string>>({});
   const [gridData, setGridData] = React.useState<CustomPropertyRow[]>([]);

   // Update grid data when relationship changes, preserving any rows being edited
   React.useEffect(() => {
      setGridData(current => {
         // Get any rows currently being edited
         const editingRow = editingRows ? Object.keys(editingRows)[0] : undefined;
         const currentEditingData = editingRow ? current.find(row => row.id === editingRow) : undefined;

         // Map the new properties
         const newData = (relationship?.customProperties || []).map((prop, idx) => ({
            ...prop,
            idx
         }));

         // If we have an editing row that's temporary (new-temp-), preserve it
         if (currentEditingData && currentEditingData.id.startsWith('new-temp-')) {
            return [...newData, currentEditingData];
         }

         return newData;
      });
   }, [relationship?.customProperties, editingRows]);

   const validateField = React.useCallback((rowData: CustomPropertyRow): Record<string, string> => {
      const errors: Record<string, string> = {};
      if (!rowData.name) {
         errors.name = 'Invalid Name';
      }
      return errors;
   }, []);

   const defaultEntry = React.useMemo<CustomPropertyRow>(
      () => ({
         $type: CustomPropertyType,
         $globalId: 'toBeAssigned',
         name: findNextUnique('New custom property', relationship?.customProperties || [], p => p.name || ''),
         id: findNextUnique('customProperty', relationship?.customProperties || [], p => p.id || ''),
         value: '',
         description: '',
         idx: -1
      }),
      [relationship?.customProperties]
   );

   const onRowUpdate = React.useCallback(
      (customProperty: CustomPropertyRow) => {
         const errors = validateField(customProperty);
         if (Object.keys(errors).length > 0) {
            setValidationErrors(errors);
            return;
         }
         setValidationErrors({});

         // Check if this is an update to an existing row or a new row
         const isNewRow = customProperty.id.startsWith('new-temp-');
         const existingRow = gridData.find(row => row.id === customProperty.id);

         if (isNewRow) {
            // This is a new row being added
            if (
               customProperty.name === defaultEntry.name &&
               customProperty.value === defaultEntry.value &&
               customProperty.description === defaultEntry.description
            ) {
               // If nothing was changed, just remove the temporary row
               setGridData(data => data.filter(row => row.id !== customProperty.id));
               setEditingRows({});
               return;
            }

            // Generate a proper ID for the new custom property that won't conflict with temporary IDs
            const baseId = toId(customProperty.name || '');
            // Ensure the generated ID doesn't start with 'new-' to avoid conflicts with temporary rows
            const safeBaseId = baseId.startsWith('new-') ? 'property-' + baseId.slice(4) : baseId;
            const newId = findNextUnique(safeBaseId, relationship?.customProperties || [], prop => prop.id || '');
            const finalProperty = { ...customProperty, id: newId };

            // Add the new property through dispatch
            dispatch({
               type: 'relationship:customProperty:add-customProperty',
               customProperty: finalProperty
            });
         } else if (existingRow) {
            // This is an existing row being updated
            dispatch({
               type: 'relationship:customProperty:update',
               customPropertyIdx: customProperty.idx,
               customProperty: customProperty
            });
         }

         // Clear editing state after successful update
         setEditingRows({});
      },
      [dispatch, defaultEntry, validateField, relationship, gridData]
   );

   const onRowAdd = React.useCallback((): void => {
      // Clear any previous validation errors
      setValidationErrors({});

      // Clear any existing edit states first
      setEditingRows({});

      // Create a temporary ID for the new row being edited
      const tempId = 'new-temp-' + Date.now();
      setEditingRows({ [tempId]: true });

      // Add a temporary row to the grid data without dispatching to the store
      const tempRow: CustomPropertyRow = { ...defaultEntry, id: tempId };
      setGridData(current => [...current, tempRow]);
   }, [defaultEntry]);

   const onRowMoveUp = React.useCallback(
      (customProperty: CustomPropertyRow) => {
         dispatch({
            type: 'relationship:customProperty:move-customProperty-up',
            customPropertyIdx: customProperty.idx
         });
      },
      [dispatch]
   );

   const onRowMoveDown = React.useCallback(
      (customProperty: CustomPropertyRow) => {
         dispatch({
            type: 'relationship:customProperty:move-customProperty-down',
            customPropertyIdx: customProperty.idx
         });
      },
      [dispatch]
   );

   const onRowDelete = React.useCallback(
      (customProperty: CustomPropertyRow) => {
         dispatch({
            type: 'relationship:customProperty:delete-customProperty',
            customPropertyIdx: customProperty.idx
         });
      },
      [dispatch]
   );

   const columns = React.useMemo<GridColumn<CustomPropertyRow>[]>(
      () => [
         { field: 'name', header: 'Name', editor: !readonly, style: { width: '20%' }, filterType: 'text' },
         { field: 'value', header: 'Value', editor: !readonly, style: { width: '20%' }, filterType: 'text' },
         { field: 'description', header: 'Description', editor: !readonly, filterType: 'text' }
      ],
      [readonly]
   );

   if (!relationship) {
      return <ErrorView errorMessage='No relationship available' />;
   }

   return (
      <PrimeDataGrid
         className='relationship-custom-properties-datatable'
         columns={columns}
         data={gridData}
         keyField='id'
         height='auto'
         onRowAdd={onRowAdd}
         onRowUpdate={onRowUpdate}
         onRowDelete={onRowDelete}
         onRowMoveUp={onRowMoveUp}
         onRowMoveDown={onRowMoveDown}
         defaultNewRow={defaultEntry}
         readonly={readonly}
         validationErrors={validationErrors}
         noDataMessage='No custom properties'
         addButtonLabel='Add Property'
         editingRows={editingRows}
         onRowEditChange={(e: DataTableRowEditEvent) => {
            const newEditingRows = e.data as Record<string, boolean>;
            const newEditingId = Object.keys(newEditingRows)[0];
            const currentEditingId = editingRows ? Object.keys(editingRows)[0] : undefined;

            // Handle cleanup of current editing state
            if (currentEditingId && !newEditingRows[currentEditingId]) {
               if (currentEditingId.startsWith('new-temp-')) {
                  // Remove temporary row from grid data immediately
                  setGridData(current => current.filter(row => row.id !== currentEditingId));
               }
               // Clear validation errors
               setValidationErrors({});
            }

            // Prevent editing a regular row as if it were new
            if (newEditingId && !newEditingId.startsWith('new-temp-')) {
               // Find the row in the current data
               const rowToEdit = gridData.find(row => row.id === newEditingId);
               if (rowToEdit) {
                  // Update editing state without modifying the row
                  setEditingRows(newEditingRows);
                  return;
               }
            }

            // Update editing state for new rows or cleared states
            setEditingRows(newEditingRows);

            // Clean up any stale temporary rows when starting to edit a new row
            if (newEditingId && newEditingId.startsWith('new-temp-')) {
               setGridData(current => current.filter(row => !row.id.startsWith('new-temp-') || row.id === newEditingId));
            }
         }}
         globalFilterFields={['name', 'value', 'description']}
      />
   );
}
