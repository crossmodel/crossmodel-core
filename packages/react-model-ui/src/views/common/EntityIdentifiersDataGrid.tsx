/********************************************************************************
 * Copyright (c) 2025 CrossBreeze.
 ********************************************************************************/
import { LogicalIdentifier } from '@crossmodel/protocol';
import { Checkbox } from 'primereact/checkbox';
import { DataTableRowEditEvent } from 'primereact/datatable';
import { MultiSelect, MultiSelectChangeEvent } from 'primereact/multiselect';
import * as React from 'react';
import { useEntity, useModelDispatch, useReadonly } from '../../ModelContext';
import { GridColumn, PrimeDataGrid } from './PrimeDataGrid';
import { handleGridEditorKeyDown } from './gridKeydownHandler';

export interface EntityIdentifierRow {
   idx: number;
   id: string;
   name: string;
   primary: boolean;
   attributeIds: string[];
   description?: string;
   $type?: 'LogicalIdentifier';
   $globalId?: string;
}

function convertIdentifierToRow(identifier: LogicalIdentifier, idx: number): EntityIdentifierRow {
   const attributeIds = (identifier.attributes || []).map(attr =>
      typeof attr === 'object' ? attr.id : String(attr).replace(/^[-_]+/, '')
   );
   return {
      idx,
      id: identifier.id || '',
      name: identifier.name || '',
      primary: identifier.primary || false,
      attributeIds,
      description: identifier.description || ''
   };
}
function convertRowToIdentifier(row: EntityIdentifierRow): LogicalIdentifier {
   return {
      id: row.id,
      name: row.name,
      primary: row.primary,
      attributes: row.attributeIds as any,
      description: row.description,
      $type: 'LogicalIdentifier',
      customProperties: [],
      $globalId: row.id
   };
}

export function EntityIdentifiersDataGrid(): React.ReactElement {
   const entity = useEntity();
   const dispatch = useModelDispatch();
   const readonly = useReadonly();
   const [editingRows, setEditingRows] = React.useState<Record<string, boolean>>({});
   const [validationErrors, setValidationErrors] = React.useState<Record<string, string>>({});

   const handleIdentifierDelete = React.useCallback(
      (identifier: EntityIdentifierRow): void => {
         dispatch({
            type: 'entity:identifier:delete-identifier',
            identifierIdx: identifier.idx
         });
      },
      [dispatch]
   );

   const validateField = React.useCallback((rowData: EntityIdentifierRow): Record<string, string> => {
      const errors: Record<string, string> = {};
      if (!rowData.name) {
         errors.name = 'Invalid Name';
      }
      if (!rowData.attributeIds || rowData.attributeIds.length === 0) {
         errors.attributeIds = 'At least one attribute is required';
      }
      return errors;
   }, []);

   const defaultEntry = React.useMemo<EntityIdentifierRow>(
      () => ({
         idx: -1,
         id: `ID_${Date.now()}`,
         name: 'New Identifier',
         primary: !entity.identifiers || entity.identifiers.length === 0,
         attributeIds: [],
         description: '',
         $type: 'LogicalIdentifier',
         $globalId: 'toBeAssigned'
      }),
      [entity.identifiers]
   );

   const gridData = React.useMemo(
      () => (entity.identifiers || []).map((identifier, idx) => convertIdentifierToRow(identifier, idx)),
      [entity.identifiers]
   );

   const columns: GridColumn<EntityIdentifierRow>[] = React.useMemo(
      () => [
         {
            field: 'name',
            header: 'Name',
            editor: !readonly,
            headerStyle: { width: '30%' },
            filterType: 'text'
         },
         {
            field: 'primary',
            header: 'Primary',
            dataType: 'boolean',
            headerStyle: { width: '10%' },
            body: (rowData: EntityIdentifierRow) => (
               <div className='flex align-items-center justify-content-center'>{rowData.primary && <i className='pi pi-check' />}</div>
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
            field: 'attributeIds',
            header: 'Attributes',
            headerStyle: { width: '60%' },
            body: (rowData: EntityIdentifierRow) => {
               const selectedAttributes = entity.attributes
                  .filter(attr => rowData.attributeIds.includes(attr.id))
                  .map(attr => attr.name)
                  .join(', ');
               return <div className='flex align-items-center'>{selectedAttributes}</div>;
            },
            editor: (options: any) => {
               const attributeOptions = entity.attributes.map(attr => ({
                  label: attr.name,
                  value: attr.id
               }));
               return (
                  <MultiSelect
                     value={options.value}
                     options={attributeOptions}
                     onChange={(e: MultiSelectChangeEvent) => options.editorCallback(e.value)}
                     onKeyDown={handleGridEditorKeyDown}
                     disabled={readonly}
                     className='w-full'
                     display='chip'
                  />
               );
            },
            filterType: 'text'
         },
         {
            field: 'description',
            header: 'Description',
            editor: true,
            filterType: 'text'
         }
      ],
      [readonly, entity.attributes, entity.identifiers]
   );

   const handleRowAdd = React.useCallback(
      (identifier: EntityIdentifierRow): void => {
         // Clear any previous validation errors
         setValidationErrors({});

         if (identifier.name) {
            const newIdentifier = {
               ...convertRowToIdentifier(identifier),
               id: `ID_${identifier.name.replace(/\s+/g, '_')}`,
               primary: !entity.identifiers || entity.identifiers.length === 0,
               $globalId: `${entity.id}.${identifier.name.replace(/\s+/g, '_')}`
            };

            dispatch({
               type: 'entity:identifier:add-identifier',
               identifier: newIdentifier
            });

            // Set the row in edit mode
            setEditingRows({ [newIdentifier.id]: true });
         }
      },
      [dispatch, entity]
   );

   const handleRowUpdate = React.useCallback(
      (identifier: EntityIdentifierRow): void => {
         const errors = validateField(identifier);
         if (Object.keys(errors).length > 0) {
            setValidationErrors(errors);
            return;
         }
         setValidationErrors({});

         // If setting this as primary, first unset any existing primary
         if (identifier.primary) {
            const currentPrimary = entity.identifiers?.find(i => i.primary && i.id !== identifier.id);
            if (currentPrimary) {
               dispatch({
                  type: 'entity:identifier:update',
                  identifierIdx: entity.identifiers.indexOf(currentPrimary),
                  identifier: {
                     ...currentPrimary,
                     primary: false
                  }
               });
            }
         }

         // Then update this identifier
         dispatch({
            type: 'entity:identifier:update',
            identifierIdx: identifier.idx,
            identifier: convertRowToIdentifier(identifier)
         });
      },
      [dispatch, validateField, entity]
   );

   if (!entity) {
      return <div className='p-error'>No Entity!</div>;
   }

   return (
      <PrimeDataGrid
         className='entity-identifiers-datatable'
         columns={columns}
         data={gridData}
         keyField='id'
         height='auto'
         onRowAdd={handleRowAdd}
         onRowUpdate={handleRowUpdate}
         onRowDelete={handleIdentifierDelete}
         readonly={readonly}
         validationErrors={validationErrors}
         defaultNewRow={defaultEntry}
         noDataMessage='No identifiers defined'
         addButtonLabel='Add Identifier'
         editingRows={editingRows}
         onRowEditChange={(e: DataTableRowEditEvent) => setEditingRows(e.data as Record<string, boolean>)}
         globalFilterFields={['name', 'attributeIds']}
      />
   );
}
