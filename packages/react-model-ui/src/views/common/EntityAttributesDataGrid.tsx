/********************************************************************************
 * Copyright (c) 2023 CrossBreeze.
 ********************************************************************************/
import { findNextUnique, LogicalAttribute, Reference, toId } from '@crossmodel/protocol';
import { Checkbox } from 'primereact/checkbox';
import { DataTableRowEditEvent } from 'primereact/datatable';
import { Dropdown } from 'primereact/dropdown';
import * as React from 'react';
import { useEntity, useModelDispatch, useReadonly } from '../../ModelContext';
import { GridColumn, PrimeDataGrid } from './PrimeDataGrid';
import { handleGridEditorKeyDown } from './gridKeydownHandler';

export interface EntityAttributeRow {
   $type: 'LogicalAttribute';
   $globalId: Reference<'LogicalAttribute'>;
   id: string;
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

         if (attribute.name) {
            const id = findNextUnique(
               toId(findNextUnique(attribute.name, entity.attributes, attr => attr.name || '')),
               entity.attributes,
               attr => attr.id || ''
            );

            dispatch({
               type: 'entity:attribute:add-attribute',
               attribute: { ...attribute, id }
            });
            setEditingRows({ [id]: true });
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
         // First find if this attribute is part of any identifier
         const identifierIdx = entity.identifiers?.findIndex(identifier =>
            identifier.attributes.some(attr => (typeof attr === 'string' ? attr === attribute.id : attr.id === attribute.id))
         );

         // If it is part of an identifier, delete the identifier first
         if (identifierIdx !== undefined && identifierIdx !== -1) {
            dispatch({
               type: 'entity:identifier:delete-identifier',
               identifierIdx
            });
         }

         // Then delete the attribute
         dispatch({
            type: 'entity:attribute:delete-attribute',
            attributeIdx: attribute.idx
         });
      },
      [dispatch, entity.identifiers]
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
         (entity.attributes || []).map((attr: LogicalAttribute, idx) => {
            // Check if this attribute is part of any identifier
            const isIdentifier =
               entity.identifiers?.some(identifier =>
                  identifier.attributes.some(a => (typeof a === 'string' ? a === attr.id : a.id === attr.id))
               ) || false;
            return {
               idx,
               name: attr.name || '',
               datatype: attr.datatype || 'string',
               description: attr.description || '',
               identifier: isIdentifier,
               id: attr.id,
               $type: 'LogicalAttribute',
               $globalId: attr.$globalId
            };
         }) as EntityAttributeRow[],
      [entity.attributes, entity.identifiers]
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
                  onKeyDown={handleGridEditorKeyDown}
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
                     onKeyDown={handleGridEditorKeyDown}
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

   const handleRowUpdate = React.useCallback(
      (attribute: EntityAttributeRow): void => {
         // Prevent saving if the attribute name is still the default 'New Attribute'
         if (attribute.name === defaultEntry.name && attribute.datatype === defaultEntry.datatype) {
            return;
         }

         const errors = validateField(attribute);
         if (Object.keys(errors).length > 0) {
            setValidationErrors(errors);
            return;
         }
         setValidationErrors({});

         // Get old attribute state
         const oldAttribute = entity.attributes[attribute.idx];

         // First update just the basic attribute properties
         dispatch({
            type: 'entity:attribute:update',
            attributeIdx: attribute.idx,
            attribute: {
               ...oldAttribute,
               name: attribute.name,
               datatype: attribute.datatype,
               description: attribute.description
            }
         });

         // Handle identifier changes separately
         const isCurrentlyIdentifier = entity.identifiers?.some(identifier =>
            identifier.attributes.some(attr => (typeof attr === 'string' ? attr === oldAttribute.id : attr.id === oldAttribute.id))
         );
         const identifierChanged = attribute.identifier !== isCurrentlyIdentifier;

         if (identifierChanged) {
            if (attribute.identifier) {
               // Add new identifier
               dispatch({
                  type: 'entity:identifier:add-identifier',
                  identifier: {
                     id: `ID_${oldAttribute.id}`,
                     name: `Identifier ${oldAttribute.name}`,
                     primary: !entity.identifiers || entity.identifiers.length === 0,
                     attributes: [oldAttribute.id] as any,
                     $type: 'LogicalIdentifier',
                     customProperties: [],
                     $globalId: `${entity.id}.${oldAttribute.id}`
                  }
               });
            } else {
               // Remove identifier that contains this attribute
               const identifierToRemove = entity.identifiers?.find(identifier =>
                  identifier.attributes.some(attr => (typeof attr === 'string' ? attr === oldAttribute.id : attr.id === oldAttribute.id))
               );
               if (identifierToRemove) {
                  dispatch({
                     type: 'entity:identifier:delete-identifier',
                     identifierIdx: entity.identifiers.indexOf(identifierToRemove)
                  });
               }
            }
         }
      },
      [dispatch, defaultEntry, validateField, entity]
   );

   if (!entity) {
      return <div className='p-error'>No Entity!</div>;
   }

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
         globalFilterFields={['name', 'datatype', 'description']}
      />
   );
}
