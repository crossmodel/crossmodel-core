/********************************************************************************
 * Copyright (c) 2025 CrossBreeze.
 ********************************************************************************/
import { CustomProperty, CustomPropertyType, findNextUnique, identifier, toId } from '@crossmodel/protocol';
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
            type: 'datamodel:customProperty:update',
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
            const existingIds = dataModel?.customProperties || [];
            const id = findNextUnique(toId(findNextUnique(customProperty.name, existingIds, identifier)), existingIds, identifier);

            dispatch({
               type: 'datamodel:customProperty:add-customProperty',
               customProperty: { ...customProperty, id }
            });
         }
      },
      [dispatch, dataModel?.customProperties]
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

   const onRowDelete = React.useCallback(
      (customProperty: CustomPropertyRow) => {
         dispatch({
            type: 'datamodel:customProperty:delete-customProperty',
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
         name: findNextUnique('New custom property', dataModel?.customProperties || [], p => p.name || ''),
         id: findNextUnique('customProperty', dataModel?.customProperties || [], p => p.id || ''),
         value: '',
         description: '',
         idx: -1
      }),
      [dataModel?.customProperties]
   );

   if (!dataModel) {
      return <ErrorView errorMessage='No data model available' />;
   }

   const gridData = React.useMemo(
      () =>
         (dataModel.customProperties || []).map((prop, idx) => ({
            ...prop,
            idx
         })),
      [dataModel.customProperties]
   );

   return (
      <PrimeDataGrid
         className='data-model-custom-properties-datatable'
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
