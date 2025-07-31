/********************************************************************************
 * Copyright (c) 2025 CrossBreeze.
 ********************************************************************************/
import { CustomProperty, CustomPropertyType, findNextUnique, toId } from '@crossmodel/protocol';
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
         // Generate unique ID from name when it changes
         if (customProperty.name) {
            const existingIds = dataModel?.customProperties?.filter(prop => prop.id !== customProperty.id) || [];
            customProperty.id = findNextUnique(toId(customProperty.name), existingIds, prop => prop.id || '');
         }
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

         // Create a new custom property with empty values
         const name = customProperty.name || '';
         const existingIds = dataModel?.customProperties || [];
         const id = name ? findNextUnique(toId(name), existingIds, prop => prop.id || '') : '';

         const customPropertyData: CustomProperty = {
            $type: CustomPropertyType,
            name,
            value: customProperty.value || '',
            id,
            $globalId: '',
            description: ''
         };

         dispatch({
            type: 'datamodel:customProperty:add-customProperty',
            customProperty: customPropertyData
         });
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
         {
            field: 'name',
            header: 'Name',
            editor: true
         },
         {
            field: '$type',
            header: 'Data Type',
            editor: true
         },
         {
            field: 'value',
            header: 'Value',
            editor: true
         }
      ],
      []
   );

   const defaultEntry = React.useMemo<CustomPropertyRow>(
      () => ({
         $type: CustomPropertyType,
         $globalId: '',
         name: '',
         value: '',
         id: '',
         idx: -1
      }),
      []
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
         columns={columns}
         data={gridData}
         keyField='idx'
         height='300px'
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
