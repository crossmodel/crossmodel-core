/********************************************************************************
 * Copyright (c) 2025 CrossBreeze.
 ********************************************************************************/
import { CustomProperty, CustomPropertyType, findNextUnique, identifier, toId } from '@crossmodel/protocol';
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
         if (
            customProperty.name === defaultEntry.name &&
            customProperty.value === defaultEntry.value &&
            customProperty.description === defaultEntry.description
         ) {
            console.log('Not saving default new custom property.');
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
            const newId = findNextUnique(toId(customProperty.name || ''), relationship?.customProperties || [], prop => prop.id || '');
            customProperty = { ...customProperty, id: newId };
         }

         dispatch({
            type: 'relationship:customProperty:update',
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
      [dispatch, defaultEntry, validateField, relationship?.customProperties, editingRows]
   );

   const onRowAdd = React.useCallback(
      (customProperty: CustomPropertyRow) => {
         // Clear any previous validation errors
         setValidationErrors({});

         if (customProperty.name) {
            // Create a new custom property with empty values
            const existingIds = relationship?.customProperties || [];
            const id = findNextUnique(toId(findNextUnique(customProperty.name, existingIds, identifier)), existingIds, identifier);
            // Use a temporary ID for the new custom property
            const tempId = 'new-' + id;

            dispatch({
               type: 'relationship:customProperty:add-customProperty',
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

   const gridData = React.useMemo(
      () =>
         (relationship?.customProperties || []).map((prop, idx) => ({
            ...prop,
            idx
         })),
      [relationship?.customProperties]
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
         onRowEditChange={(e: DataTableRowEditEvent) => setEditingRows(e.data as Record<string, boolean>)}
         globalFilterFields={['name', 'value', 'description']}
      />
   );
}
