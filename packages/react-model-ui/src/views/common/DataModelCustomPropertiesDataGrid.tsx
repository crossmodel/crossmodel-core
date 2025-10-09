/********************************************************************************
 * Copyright (c) 2025 CrossBreeze.
 ********************************************************************************/
import { CustomProperty, CustomPropertyType, findNextUnique, identifier, toId } from '@crossmodel/protocol';
import { DataTableRowEditEvent } from 'primereact/datatable';
import * as React from 'react';
import { useDataModel, useModelDispatch, useReadonly } from '../../ModelContext';
import { ErrorView } from '../ErrorView';
import { GridColumn, PrimeDataGrid } from './PrimeDataGrid';

export interface CustomPropertyRow extends CustomProperty {
   idx: number;
}

export function DataModelCustomPropertiesDataGrid(): React.ReactElement {
   const dataModel = useDataModel();
   const dispatch = useModelDispatch();
   const readonly = useReadonly();
   const [editingRows, setEditingRows] = React.useState<Record<string, boolean>>({});
   const [validationErrors, setValidationErrors] = React.useState<Record<string, string>>({});

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
         console.debug('Updating custom property:', customProperty);

         // Check if the property has a valid name
         const isValidProperty = customProperty.name && customProperty.name.trim() !== '';

         if (!isValidProperty) {
            console.debug('Not saving invalid custom property - no valid name');

            // If this was a new row (has default values), remove it
            if (
               customProperty.name === defaultEntry.name &&
               customProperty.value === defaultEntry.value &&
               customProperty.description === defaultEntry.description
            ) {
               console.debug('Removing invalid new custom property');
               onRowDelete(customProperty);
            }
            return;
         }

         const errors = validateField(customProperty);
         if (Object.keys(errors).length > 0) {
            setValidationErrors(errors);
            return;
         }
         setValidationErrors({});

         // Generate a unique ID based on the edited name if this is a new custom property
         if (customProperty.id.startsWith('new-')) {
            const newId = findNextUnique(toId(customProperty.name || ''), dataModel?.customProperties || [], prop => prop.id || '');
            customProperty = { ...customProperty, id: newId };
         }

         dispatch({
            type: 'datamodel:customProperty:update',
            customPropertyIdx: customProperty.idx,
            customProperty: customProperty
         });

         // Update editing rows with the new ID if it changed
         if (editingRows && Object.keys(editingRows).length > 0) {
            const oldId = Object.keys(editingRows)[0];
            if (oldId !== customProperty.id) {
               setEditingRows({ [customProperty.id]: true });
            }
         }
      },
      [dispatch, defaultEntry, validateField, onRowDelete, dataModel?.customProperties, editingRows]
   );

   const onRowAdd = React.useCallback(
      (customProperty: CustomPropertyRow) => {
         // Clear any previous validation errors
         setValidationErrors({});

         if (customProperty.name) {
            // Create a new custom property with empty values
            const existingIds = dataModel?.customProperties || [];
            const id = findNextUnique(toId(findNextUnique(customProperty.name, existingIds, identifier)), existingIds, identifier);
            // Use a temporary ID for the new custom property
            const tempId = 'new-' + id;

            dispatch({
               type: 'datamodel:customProperty:add-customProperty',
               customProperty: { ...customProperty, id: tempId }
            });
            setEditingRows({ [tempId]: true });
         }
      },
      [dispatch]
   );

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

   const gridData = React.useMemo(
      () =>
         (dataModel?.customProperties || []).map((prop, idx) => ({
            ...prop,
            idx
         })),
      [dataModel?.customProperties]
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
         onRowEditChange={(e: DataTableRowEditEvent) => setEditingRows(e.data as Record<string, boolean>)}
         globalFilterFields={['name', 'value', 'description']}
      />
   );
}
