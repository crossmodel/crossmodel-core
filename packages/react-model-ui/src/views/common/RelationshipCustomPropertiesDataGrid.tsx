/********************************************************************************
 * Copyright (c) 2025 CrossBreeze.
 ********************************************************************************/
import { CustomProperty, CustomPropertyType, findNextUnique, identifier, toId } from '@crossmodel/protocol';
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
   const [validationErrors, setValidationErrors] = React.useState<Record<string, string>>({});

   const onRowUpdate = React.useCallback(
      (customProperty: CustomPropertyRow) => {
         const errors = validateField(customProperty);
         if (Object.keys(errors).length > 0) {
            setValidationErrors(errors);
            return;
         }
         setValidationErrors({});
         dispatch({
            type: 'relationship:customProperty:update',
            customPropertyIdx: customProperty.idx,
            customProperty: customProperty
         });
      },
      [dispatch]
   );

   const onRowAdd = React.useCallback(
      (customProperty: CustomPropertyRow) => {
         // Clear any previous validation errors
         setValidationErrors({});

         if (customProperty.name) {
            // Create a new custom property with empty values
            const existingIds = relationship?.customProperties || [];
            const id = findNextUnique(toId(findNextUnique(customProperty.name, existingIds, identifier)), existingIds, identifier);

            dispatch({
               type: 'relationship:customProperty:add-customProperty',
               customProperty: { ...customProperty, id }
            });
         }
      },
      [dispatch, relationship?.customProperties]
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

   const validateField = React.useCallback((rowData: CustomPropertyRow): Record<string, string> => {
      const errors: Record<string, string> = {};
      if (!rowData.name) {
         errors.name = 'Invalid Name';
      }
      return errors;
   }, []);

   const columns = React.useMemo<GridColumn<CustomPropertyRow>[]>(
      () => [
         { field: 'name', header: 'Name', editor: !readonly, style: { width: '20%' } },
         { field: 'value', header: 'Value', editor: !readonly, style: { width: '20%' } },
         { field: 'description', header: 'Description', editor: !readonly }
      ],
      [readonly]
   );

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

   if (!relationship) {
      return <ErrorView errorMessage='No relationship available' />;
   }

   const gridData = React.useMemo(
      () =>
         (relationship.customProperties || []).map((prop, idx) => ({
            ...prop,
            idx
         })),
      [relationship.customProperties]
   );

   return (
      <PrimeDataGrid
         className='relationship-custom-properties-datatable'
         columns={columns}
         data={gridData}
         keyField='idx'
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
      />
   );
}
