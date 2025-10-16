/********************************************************************************
 * Copyright (c) 2025 CrossBreeze.
 ********************************************************************************/
import { CustomProperty, CustomPropertyType, findNextUnique, toId } from '@crossmodel/protocol';
import { DataTableRowEditEvent } from 'primereact/datatable';
import * as React from 'react';
import { useEntity, useModelDispatch, useReadonly } from '../../ModelContext';
import { ErrorView } from '../ErrorView';
import { GridColumn, PrimeDataGrid } from './PrimeDataGrid';

export interface CustomPropertyRow extends CustomProperty {
   idx: number;
   _uncommitted?: boolean;
}

export function EntityCustomPropertiesDataGrid(): React.ReactElement {
   const entity = useEntity();
   const dispatch = useModelDispatch();
   const readonly = useReadonly();
   const [editingRows, setEditingRows] = React.useState<Record<string, boolean>>({});
   const [validationErrors, setValidationErrors] = React.useState<Record<string, string>>({});
   const [gridData, setGridData] = React.useState<CustomPropertyRow[]>([]);

   // Update grid data when entity changes, preserving any uncommitted rows
   React.useEffect(() => {
      setGridData(current => {
         // Map the committed properties from the entity
         const committedData = (entity.customProperties || []).map((prop, idx) => ({
            ...prop,
            idx
         }));

         // Preserve any uncommitted rows that are currently being edited
         const uncommittedRows = current.filter(row => row._uncommitted && editingRows[row.id]);

         return [...committedData, ...uncommittedRows];
      });
   }, [entity.customProperties, editingRows]);

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
         name: findNextUnique('New custom property', entity?.customProperties || [], p => p.name || ''),
         id: findNextUnique('customProperty', entity?.customProperties || [], p => p.id || ''),
         value: '',
         description: '',
         idx: -1
      }),
      [entity?.customProperties]
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

            if (!hasChanges || !customProperty.name) {
               // Remove the row if no changes or no name
               setGridData(current => current.filter(row => row.id !== customProperty.id));
               setEditingRows({});
               return;
            }

            // Only dispatch if there are actual changes
            // Generate a proper ID for the new custom property
            const newId = findNextUnique(toId(customProperty.name || ''), entity?.customProperties || [], prop => prop.id || '');

            // Create the final property without temporary fields
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { _uncommitted, id: tempId, ...propertyData } = customProperty;
            const finalProperty = { ...propertyData, id: newId };

            // Add the new property through dispatch
            dispatch({
               type: 'entity:customProperty:add-customProperty',
               customProperty: finalProperty
            });
         } else {
            // This is an existing row being updated
            dispatch({
               type: 'entity:customProperty:update',
               customPropertyIdx: customProperty.idx,
               customProperty: customProperty
            });
         }

         // Clear editing state after successful update
         setEditingRows({});
      },
      [dispatch, defaultEntry, validateField, entity]
   );

   const onRowAdd = React.useCallback((): void => {
      // Clear any previous validation errors
      setValidationErrors({});

      // Clear any existing edit states first
      setEditingRows({});

      // Create a new uncommitted row with a proper ID
      const tempRow: CustomPropertyRow = {
         ...defaultEntry,
         id: findNextUnique(toId(defaultEntry.name || ''), entity?.customProperties || [], prop => prop.id || ''),
         _uncommitted: true
      };

      // Add to grid data and set it to editing mode
      setGridData(current => [...current, tempRow]);
      setEditingRows({ [tempRow.id]: true });
   }, [defaultEntry, entity?.customProperties]);

   const onRowMoveUp = React.useCallback(
      (customProperty: CustomPropertyRow): void => {
         dispatch({
            type: 'entity:customProperty:move-customProperty-up',
            customPropertyIdx: customProperty.idx
         });
      },
      [dispatch]
   );

   const onRowMoveDown = React.useCallback(
      (customProperty: CustomPropertyRow): void => {
         dispatch({
            type: 'entity:customProperty:move-customProperty-down',
            customPropertyIdx: customProperty.idx
         });
      },
      [dispatch]
   );

   const onRowDelete = React.useCallback(
      (customProperty: CustomPropertyRow): void => {
         dispatch({
            type: 'entity:customProperty:delete-customProperty',
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

   if (!entity) {
      return <ErrorView errorMessage='No entity available' />;
   }

   return (
      <PrimeDataGrid
         className='entity-custom-properties-datatable'
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

            // If we're stopping editing a row (either by cancelling or completing)
            if (currentEditingId && !newEditingRows[currentEditingId]) {
               const currentRow = gridData.find(row => row.id === currentEditingId);

               // Always remove uncommitted rows when editing stops
               if (currentRow?._uncommitted) {
                  setGridData(current => current.filter(row => row.id !== currentEditingId));
               }

               // Clear validation errors
               setValidationErrors({});
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
