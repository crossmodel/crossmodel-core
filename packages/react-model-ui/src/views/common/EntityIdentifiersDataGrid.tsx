/********************************************************************************
 * Copyright (c) 2025 CrossBreeze.
 ********************************************************************************/
import { findNextUnique, LogicalIdentifier, toId } from '@crossmodel/protocol';
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
   _uncommitted?: boolean;
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
   const [gridData, setGridData] = React.useState<EntityIdentifierRow[]>([]);

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

   // Update grid data when identifiers change, preserving any uncommitted rows
   React.useEffect(() => {
      setGridData(current => {
         // Map the committed identifiers
         const committedData = (entity.identifiers || []).map((identifier, idx) => convertIdentifierToRow(identifier, idx));

         // Preserve any uncommitted rows that are currently being edited
         const uncommittedRows = current.filter(row => row._uncommitted && editingRows[row.id]);

         return [...committedData, ...uncommittedRows];
      });
   }, [entity.identifiers, editingRows]);

   const columns: GridColumn<EntityIdentifierRow>[] = React.useMemo(
      () => [
         {
            field: 'name',
            header: 'Name',
            editor: !readonly,
            headerStyle: { width: '20%' },
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
            headerStyle: { width: '30%' },
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
            headerStyle: { width: '20%' },
            editor: true,
            filterType: 'text'
         }
      ],
      [readonly, entity.attributes, entity.identifiers]
   );

   const handleRowAdd = React.useCallback((): void => {
      // Clear any previous validation errors
      setValidationErrors({});

      // Clear any existing edit states first
      setEditingRows({});

      // Create a new uncommitted row with a unique temporary ID
      const tempId = `temp-${Date.now()}-${Math.random().toString(36).substring(2)}`;
      const tempRow: EntityIdentifierRow = {
         ...defaultEntry,
         id: tempId,
         _uncommitted: true
      };

      // Add to grid data and set it to editing mode
      setGridData(current => [...current, tempRow]);
      setEditingRows({ [tempId]: true });
   }, [defaultEntry]);

   const handleRowUpdate = React.useCallback(
      (identifier: EntityIdentifierRow): void => {
         const errors = validateField(identifier);
         if (Object.keys(errors).length > 0) {
            setValidationErrors(errors);
            return;
         }
         setValidationErrors({});

         if (identifier._uncommitted) {
            // For uncommitted rows, check if anything actually changed
            const hasChanges =
               identifier.name !== defaultEntry.name ||
               identifier.description !== defaultEntry.description ||
               identifier.attributeIds.length > 0;

            if (!hasChanges || !identifier.name) {
               // Remove the row if no changes or no name
               setGridData(current => current.filter(row => row.id !== identifier.id));
               setEditingRows({});
               return;
            }

            // Generate unique ID using the same pattern as attributes grid
            const newId = findNextUnique(toId(identifier.name || ''), entity.identifiers || [], id => id.id || '');

            // If this new identifier is marked as primary, first unset any existing primary
            if (identifier.primary) {
               const currentPrimary = entity.identifiers?.find(i => i.primary);
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

            // Create new identifier with unique ID
            const newIdentifier = {
               ...convertRowToIdentifier(identifier),
               id: newId,
               primary: identifier.primary,
               $globalId: `${entity.id}.${newId}`
            };

            // Add the new identifier
            dispatch({
               type: 'entity:identifier:add-identifier',
               identifier: newIdentifier
            });
         } else {
            // For existing rows
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
         }

         // Clear editing state after successful update
         setEditingRows({});
      },
      [dispatch, validateField, entity, defaultEntry]
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
         onRowEditChange={(e: DataTableRowEditEvent) => {
            const newEditingRows = e.data as Record<string, boolean>;
            const currentEditingId = editingRows ? Object.keys(editingRows)[0] : undefined;

            // If we're stopping editing a row (either by cancelling or completing)
            if (currentEditingId && !newEditingRows[currentEditingId]) {
               const currentRow = gridData.find(row => row.id === currentEditingId);

               // Always remove uncommitted rows when editing stops
               if (currentRow?._uncommitted) {
                  setGridData(current => current.filter(row => row.id !== currentEditingId));
               }

               // Clear validation errors
               setValidationErrors({});
            }

            // Update editing state
            setEditingRows(newEditingRows);
         }}
         globalFilterFields={['name', 'attributeIds']}
      />
   );
}
