/********************************************************************************
 * Copyright (c) 2025 CrossBreeze.
 ********************************************************************************/
import { CustomProperty, CustomPropertyType, findNextUnique, identifier, toId } from '@crossmodel/protocol';
import * as React from 'react';
import { useEntity, useModelDispatch, useReadonly } from '../../ModelContext';
import { ErrorView } from '../ErrorView';
import { GridColumn, PrimeDataGrid } from './PrimeDataGrid';

export interface CustomPropertyRow extends CustomProperty {
   idx: number;
}

export function EntityCustomPropertiesDataGrid(): React.ReactElement {
   const entity = useEntity();
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
            type: 'entity:customProperty:update',
            customPropertyIdx: customProperty.idx,
            customProperty: customProperty
         });
      },
      [dispatch]
   );

   const onRowAdd = React.useCallback(
      (customProperty: CustomPropertyRow): void => {
         // Clear any previous validation errors
         setValidationErrors({});

         if (customProperty.name) {
            // Create a new custom property with empty values
            const existingIds = entity?.customProperties || [];
            const id = findNextUnique(toId(findNextUnique(customProperty.name, existingIds, identifier)), existingIds, identifier);

            dispatch({
               type: 'entity:customProperty:add-customProperty',
               customProperty: { ...customProperty, id }
            });
         }
      },
      [dispatch, entity?.customProperties]
   );

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
         { field: '$type', header: 'Data Type', editor: !readonly, style: { width: '15%' } },
         { field: 'value', header: 'Value', editor: !readonly, style: { width: '20%' } },
         { field: 'description', header: 'Description', editor: !readonly }
      ],
      [readonly]
   );

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

   if (!entity) {
      return <ErrorView errorMessage='No entity available' />;
   }

   const gridData = React.useMemo(
      () =>
         (entity.customProperties || []).map((prop, idx) => ({
            ...prop,
            idx
         })),
      [entity.customProperties]
   );

   return (
      <PrimeDataGrid
         className='entity-custom-properties-datatable'
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
