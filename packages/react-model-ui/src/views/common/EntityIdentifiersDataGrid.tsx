/********************************************************************************
 * Copyright (c) 2025 CrossBreeze.
 ********************************************************************************/
import { LogicalIdentifier } from '@crossmodel/protocol';
import { Checkbox } from 'primereact/checkbox';
import { DataTableRowEditEvent } from 'primereact/datatable';
import * as React from 'react';
import { useEntity, useModelDispatch, useReadonly } from '../../ModelContext';
import { GridColumn, PrimeDataGrid } from './PrimeDataGrid';
import { handleGridEditorKeyDown } from './gridKeydownHandler';

export interface EntityIdentifierRow {
   idx: number;
   id: string;
   name: string;
   primary: boolean;
   attributeId: string;
   $type?: 'LogicalIdentifier';
   $globalId?: string;
}

function convertIdentifierToRow(identifier: LogicalIdentifier, idx: number): EntityIdentifierRow {
   const attributeId = identifier.attributes?.[0];
   return {
      idx,
      id: identifier.id || '',
      name: identifier.name || '',
      primary: identifier.primary || false,
      // Get first attribute ID
      attributeId: typeof attributeId === 'object' ? attributeId.id : String(attributeId).replace(/^[-_]+/, '')
   };
}
function convertRowToIdentifier(row: EntityIdentifierRow): LogicalIdentifier {
   return {
      id: row.id,
      name: row.name,
      primary: row.primary,
      attributes: [row.attributeId] as any,
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
      if (!rowData.attributeId) {
         errors.attributeId = 'An attribute is required';
      }
      return errors;
   }, []);

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
            field: 'attributeId',
            header: 'Attribute',
            headerStyle: { width: '60%' },
            body: (rowData: EntityIdentifierRow) => {
               const attribute = entity.attributes.find(attr => attr.id === rowData.attributeId);
               return (
                  <div className='flex align-items-center'>
                     {attribute?.name}
                     {entity.identifiers?.find(identifier => identifier.primary)?.attributes.some(a => a.id === attribute?.id) && (
                        <i className='pi pi-key ml-1' style={{ fontSize: '0.8em' }} />
                     )}
                  </div>
               );
            },
            filterType: 'text'
         }
      ],
      [readonly, entity.attributes, entity.identifiers]
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
         onRowUpdate={handleRowUpdate}
         onRowDelete={handleIdentifierDelete}
         readonly={readonly}
         validationErrors={validationErrors}
         noDataMessage='No identifiers defined'
         editingRows={editingRows}
         onRowEditChange={(e: DataTableRowEditEvent) => setEditingRows(e.data as Record<string, boolean>)}
         globalFilterFields={['name', 'attributeId']}
      />
   );
}
