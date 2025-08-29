/********************************************************************************
 * Copyright (c) 2023 CrossBreeze.
 ********************************************************************************/
import { findNextUnique, identifier, LogicalAttribute, toId } from '@crossmodel/protocol';
import { Checkbox } from 'primereact/checkbox';
import { DataTableRowEditEvent } from 'primereact/datatable';
import { Dropdown } from 'primereact/dropdown';
import * as React from 'react';
import { useEntity, useModelDispatch, useReadonly } from '../../ModelContext';
import { GridColumn, PrimeDataGrid } from './PrimeDataGrid';

export interface EntityAttributeRow extends LogicalAttribute {
   idx: number;
   name: string;
   datatype: string;
   description?: string;
   identifier?: boolean;
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
   const [editingRows, setEditingRows] = React.useState<Record<string, boolean>>({});
   const [validationErrors, setValidationErrors] = React.useState<Record<string, string>>({});

   const handleAddAttribute = React.useCallback(
      (attribute: EntityAttributeRow): void => {
         // Clear any previous validation errors
         setValidationErrors({});

         console.log('Adding attribute:', attribute);

         if (attribute.name) {
            const id = findNextUnique(toId(findNextUnique(attribute.name, entity.attributes, identifier)), entity.attributes, identifier);

            dispatch({
               type: 'entity:attribute:add-attribute',
               attribute: { ...attribute, id }
            });
            setEditingRows(prev => ({ ...prev, [id]: true }));
         }
      },
      [dispatch, entity.attributes]
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
            identifier: (attr as any).identifier || false,
            id: attr.id || '',
            $type: 'LogicalAttribute',
            $globalId: attr.id || ''
         })) as EntityAttributeRow[],
      [entity.attributes]
   );

   const defaultEntry = React.useMemo<EntityAttributeRow>(
      () => ({
         name: findNextUnique('New Attribute', entity?.attributes || [], attr => attr.name || ''),
         datatype: 'Text',
         idx: -1,
         id: findNextUnique('Attribute', entity?.attributes || [], attr => attr.id!),
         description: '',
         identifier: false,
         $type: 'LogicalAttribute',
         $globalId: 'toBeAssigned'
      }),
      [entity.attributes]
   );

   const columns: GridColumn<EntityAttributeRow>[] = React.useMemo(
      () => [
         {
            field: 'name',
            header: 'Name',
            editor: !readonly,
            headerStyle: { width: '20%' },
            filterType: 'text'
         },
         {
            field: 'datatype',
            header: 'Data Type',
            headerStyle: { width: '15%' },
            editor: (options: any) => (
               <Dropdown
                  value={options.value}
                  options={dataTypeOptions}
                  onChange={e => options.editorCallback(e.value)}
                  disabled={readonly}
                  className='w-full'
               />
            ),
            filterType: 'multiselect',
            filterOptions: dataTypeOptions,
            showFilterMatchModes: false
         },
         {
            field: 'identifier',
            header: 'Key',
            dataType: 'boolean',
            headerStyle: { width: '10%' },
            body: (rowData: EntityAttributeRow) => (
               <div className='flex align-items-center justify-content-center'>{rowData.identifier && <i className='pi pi-check' />}</div>
            ),
            editor: (options: any) => (
               <div className='flex align-items-center justify-content-center'>
                  <Checkbox
                     checked={options.value ?? false}
                     onChange={e => options.editorCallback(e.checked ?? false)}
                     disabled={readonly}
                  />
               </div>
            ),
            filterType: 'boolean',
            showFilterMatchModes: false
         },
         {
            field: 'description',
            header: 'Description',
            editor: true,
            filterType: 'text'
         }
      ],
      [readonly]
   );

   if (!entity) {
      return <div className='p-error'>No Entity!</div>;
   }

   const handleRowUpdate = React.useCallback(
      (attribute: EntityAttributeRow): void => {
         // Prevent saving if the attribute name is still the default 'New Attribute'
         if (attribute.name === defaultEntry.name && attribute.datatype === defaultEntry.datatype) {
            console.log('Not saving default new attribute.');
            return;
         }

         console.log('Updating attribute:', attribute);
         const errors = validateField(attribute);
         if (Object.keys(errors).length > 0) {
            setValidationErrors(errors);
            return;
         }
         setValidationErrors({});

         dispatch({
            type: 'entity:attribute:update',
            attributeIdx: attribute.idx,
            attribute: attribute
         });
      },
      [dispatch, defaultEntry, validateField]
   );

   return (
      <PrimeDataGrid
         className='entity-attributes-datatable'
         columns={columns}
         data={gridData}
         keyField='id'
         height='auto'
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
         editingRows={editingRows}
         onRowEditChange={(e: DataTableRowEditEvent) => setEditingRows(e.data as Record<string, boolean>)}
      />
   );
}
