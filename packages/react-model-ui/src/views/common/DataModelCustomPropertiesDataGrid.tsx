/********************************************************************************
 * Copyright (c) 2025 CrossBreeze.
 ********************************************************************************/
import { CustomProperty, CustomPropertyType, findNextUnique, toId } from '@crossmodel/protocol';
import { DataTableRowEditEvent } from 'primereact/datatable';
import * as React from 'react';
import { useDataModel, useModelDispatch, useReadonly } from '../../ModelContext';
import { ErrorView } from '../ErrorView';
import { GridColumn, PrimeDataGrid } from './PrimeDataGrid';

export interface CustomPropertyRow extends CustomProperty {
   idx: number;
   _uncommitted?: boolean;
}

export function DataModelCustomPropertiesDataGrid(): React.ReactElement {
   const dataModel = useDataModel();
   const dispatch = useModelDispatch();
   const readonly = useReadonly();
   const [editingRows, setEditingRows] = React.useState<Record<string, boolean>>({});
   const [validationErrors, setValidationErrors] = React.useState<Record<string, string>>({});
   const [gridData, setGridData] = React.useState<CustomPropertyRow[]>([]);

   // Update grid data when dataModel changes, preserving any uncommitted rows
   React.useEffect(() => {
      setGridData(current => {
         // Map the committed properties from the dataModel
         const committedData = (dataModel?.customProperties || []).map((prop, idx) => ({
            ...prop,
            idx
         }));

         // Preserve any uncommitted rows that are currently being edited
         const uncommittedRows = current.filter(row => row._uncommitted && editingRows[row.id]);

         return [...committedData, ...uncommittedRows];
      });
   }, [dataModel?.customProperties, editingRows]);

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
         name: findNextUnique('New custom property', dataModel?.customProperties || [], p => p.name || ''),
         id: findNextUnique('customProperty', dataModel?.customProperties || [], p => p.id || ''),
         value: '',
         description: '',
         idx: -1
      }),
      [dataModel?.customProperties]
   );

   const onRowDelete = React.useCallback(
      (customProperty: CustomPropertyRow) => {
         dispatch({
            type: 'datamodel:customProperty:delete-customProperty',
            customPropertyIdx: customProperty.idx
         });
      },
      [dispatch]
   );

   const onRowUpdate = React.useCallback(
      (customProperty: CustomPropertyRow) => {
         // Handle validation
         const errors = validateField(customProperty);
         if (Object.keys(errors).length > 0) {
            setValidationErrors(errors);
            return;
         }
         setValidationErrors({});

         if (customProperty._uncommitted) {
            // For uncommitted rows, check if anything actually changed
            const hasChanges =
               customProperty.name !== defaultEntry.name ||
               customProperty.value !== defaultEntry.value ||
               customProperty.description !== defaultEntry.description;

            if (!hasChanges) {
               // Remove the row if nothing changed
               setGridData(current => current.filter(row => row.id !== customProperty.id));
               setEditingRows({});
               return;
            }

            // Only dispatch if there are actual changes
            // Generate a proper ID for the new custom property
            const baseId = toId(customProperty.name || '');
            const newId = findNextUnique(baseId, dataModel?.customProperties || [], prop => prop.id || '');

            // Create the final property without temporary fields
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { _uncommitted, id: tempId, ...propertyData } = customProperty;
            const finalProperty = { ...propertyData, id: newId };

            // Add the new property through dispatch
            dispatch({
               type: 'datamodel:customProperty:add-customProperty',
               customProperty: finalProperty
            });
         } else {
            // This is an existing row being updated
            dispatch({
               type: 'datamodel:customProperty:update',
               customPropertyIdx: customProperty.idx,
               customProperty: customProperty
            });
         }

         // Clear editing state after successful update
         setEditingRows({});
      },
      [dispatch, defaultEntry, validateField, dataModel]
   );

   const onRowAdd = React.useCallback(() => {
      const newTempId = `new-temp-${Date.now()}`;
      const newProperty: CustomPropertyRow = {
         ...defaultEntry,
         id: newTempId,
         _uncommitted: true
      };
      setGridData(currentData => [...currentData, newProperty]);
      setEditingRows(prev => ({ ...prev, [newTempId]: true }));
   }, [defaultEntry]);

   const onRowMoveUp = React.useCallback(
      (customProperty: CustomPropertyRow) => {
         dispatch({
            type: 'datamodel:customProperty:move-customProperty-up',
            customPropertyIdx: customProperty.idx
         });
      },
      [dispatch]
   );

   const onRowMoveDown = React.useCallback(
      (customProperty: CustomPropertyRow) => {
         dispatch({
            type: 'datamodel:customProperty:move-customProperty-down',
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

   if (!dataModel) {
      return <ErrorView errorMessage='No data model available' />;
   }

   return (
      <PrimeDataGrid
         className='data-model-custom-properties-datatable'
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
