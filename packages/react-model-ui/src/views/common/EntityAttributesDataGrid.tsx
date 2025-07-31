/********************************************************************************
 * Copyright (c) 2023 CrossBreeze.
 ********************************************************************************/
import { findNextUnique, LogicalAttribute, toId } from '@crossmodel/protocol';
import { Checkbox } from 'primereact/checkbox';
import { Dropdown } from 'primereact/dropdown';
import * as React from 'react';
import { useEntity, useModelDispatch, useReadonly } from '../../ModelContext';
import { GridColumn, PrimeDataGrid } from './PrimeDataGrid';

export interface EntityAttributeRow extends LogicalAttribute {
   idx: number;
   name: string;
   datatype: string;
   description: string;
   isKey?: boolean;
}

const dataTypeOptions = [
   // Basic data types
   { label: 'Text', value: 'Text' },
   { label: 'Boolean', value: 'Boolean' },
   { label: 'Integer', value: 'Integer' },
   { label: 'Decimal', value: 'Decimal' },

   // Date and time data types
   { label: 'Date', value: 'Date' },
   { label: 'Time', value: 'Time' },
   { label: 'DateTime', value: 'DateTime' },

   // Identifiers & key types
   { label: 'Guid', value: 'Guid' },

   // Specialized data types
   { label: 'Binary', value: 'Binary' },
   { label: 'Location', value: 'Location' }
];

export function EntityAttributesDataGrid(): React.ReactElement {
   const entity = useEntity();
   const dispatch = useModelDispatch();
   const readonly = useReadonly();
   const [validationErrors, setValidationErrors] = React.useState<Record<string, string>>({});

   const handleRowUpdate = React.useCallback(
      (attribute: EntityAttributeRow): void => {
         const errors = validateField(attribute);
         if (Object.keys(errors).length > 0) {
            setValidationErrors(errors);
            return;
         }
         setValidationErrors({});

         // Generate unique ID when name changes
         if (attribute.name) {
            const existingIds = entity.attributes?.filter(attr => attr.id !== attribute.id) || [];
            attribute.id = findNextUnique(toId(attribute.name), existingIds, attr => attr.id || '');
         }

         dispatch({
            type: 'entity:attribute:update',
            attributeIdx: attribute.idx,
            attribute: attribute
         });
      },
      [dispatch]
   );

   const handleAddAttribute = React.useCallback(
      (attribute: EntityAttributeRow): void => {
         // Clear any previous validation errors
         setValidationErrors({});

         // Create a new attribute with default values
         const name = attribute.name || '';
         const existingIds = entity.attributes || [];
         const id = name ? findNextUnique(toId(name), existingIds, attr => attr.id || '') : '';

         const attributeData: LogicalAttribute = {
            $type: 'LogicalAttribute',
            name,
            datatype: attribute.datatype || '',
            description: attribute.description || '',
            id,
            $globalId: ''
         };

         dispatch({
            type: 'entity:attribute:add-attribute',
            attribute: attributeData
         });
      },
      [dispatch]
   );

   const handleAttributeUpward = React.useCallback(
      (attribute: EntityAttributeRow): void => {
         dispatch({
            type: 'entity:attribute:move-attribute-up',
            attributeIdx: attribute.idx
         });
      },
      [dispatch]
   );

   const handleAttributeDownward = React.useCallback(
      (attribute: EntityAttributeRow): void => {
         dispatch({
            type: 'entity:attribute:move-attribute-down',
            attributeIdx: attribute.idx
         });
      },
      [dispatch]
   );

   const handleAttributeDelete = React.useCallback(
      (attribute: EntityAttributeRow): void => {
         dispatch({
            type: 'entity:attribute:delete-attribute',
            attributeIdx: attribute.idx
         });
      },
      [dispatch]
   );

   const validateField = React.useCallback((rowData: EntityAttributeRow): Record<string, string> => {
      const errors: Record<string, string> = {};
      if (!rowData.name) {
         errors.name = 'Invalid Name';
      }
      return errors;
   }, []);

   const gridData = React.useMemo(
      () =>
         (entity.attributes || []).map((attr: Partial<LogicalAttribute>, idx) => ({
            idx,
            name: attr.name || '',
            datatype: attr.datatype || 'string',
            description: attr.description || '',
            isKey: (attr as any).key || false,
            id: attr.id || '',
            $type: 'LogicalAttribute',
            $globalId: attr.id || ''
         })) as EntityAttributeRow[],
      [entity.attributes]
   );

   const defaultEntry = React.useMemo<EntityAttributeRow>(
      () => ({
         name: '',
         datatype: 'string',
         description: '',
         isKey: false,
         idx: -1,
         id: '',
         $type: 'LogicalAttribute',
         $globalId: ''
      }),
      []
   );

   const columns: GridColumn<EntityAttributeRow>[] = React.useMemo(
      () => [
         {
            field: 'name',
            header: 'Name',
            editor: true,
            sortable: true,
            style: { width: '200px' }
         },
         {
            field: 'datatype',
            header: 'Data Type',
            style: { width: '150px' },
            body: (rowData: EntityAttributeRow) => (
               <Dropdown
                  value={rowData.datatype}
                  options={dataTypeOptions}
                  onChange={e => handleRowUpdate({ ...rowData, datatype: e.value })}
                  disabled={readonly}
                  className='w-full'
               />
            )
         },
         {
            field: 'isKey',
            header: 'Key',
            style: { width: '80px' },
            body: (rowData: EntityAttributeRow) => (
               <div className='flex align-items-center justify-content-center'>
                  <Checkbox
                     checked={rowData.isKey ?? false}
                     onChange={e => handleRowUpdate({ ...rowData, isKey: e.checked ?? false })}
                     disabled={readonly}
                  />
               </div>
            )
         },
         {
            field: 'description',
            header: 'Description',
            editor: true,
            style: { width: '200px' }
         }
      ],
      [dataTypeOptions, handleRowUpdate, readonly]
   );

   if (!entity) {
      return <div className='p-error'>No Entity!</div>;
   }

   return (
      <PrimeDataGrid
         columns={columns}
         data={gridData}
         keyField='idx'
         height='400px'
         onRowAdd={handleAddAttribute}
         onRowUpdate={handleRowUpdate}
         onRowDelete={handleAttributeDelete}
         onRowMoveUp={handleAttributeUpward}
         onRowMoveDown={handleAttributeDownward}
         defaultNewRow={defaultEntry}
         readonly={readonly}
         validationErrors={validationErrors}
         noDataMessage='No attributes defined'
         addButtonLabel='Add Attribute'
      />
   );
}
