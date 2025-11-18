/********************************************************************************
 * Copyright (c) 2025 CrossBreeze.
 ********************************************************************************/
import { findNextUnique, LogicalIdentifier, toId } from '@crossmodel/protocol';
import { DataTableRowEditEvent } from 'primereact/datatable';
import { MultiSelect, MultiSelectChangeEvent } from 'primereact/multiselect';
import * as React from 'react';
import { useEntity, useModelDispatch, useReadonly } from '../../ModelContext';
import { EditorContainer, EditorProperty, GenericCheckboxEditor, GenericTextEditor } from './GenericEditors';
import { GridColumn, PrimeDataGrid } from './PrimeDataGrid';
import { handleGridEditorKeyDown, wasSaveTriggeredByEnter } from './gridKeydownHandler';

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
      primary: Boolean(identifier.primary),
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
      $globalId: row.id
   };
}

export function EntityIdentifiersDataGrid(): React.ReactElement {
   const entity = useEntity();
   const dispatch = useModelDispatch();
   const readonly = useReadonly();
   const [editingRows, setEditingRows] = React.useState<Record<string, boolean>>({});
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

   const defaultEntry = React.useMemo<EntityIdentifierRow>(
      () => ({
         idx: -1,
         id: '',
         name: '',
         primary: false,
         attributeIds: [],
         description: '',
         $type: 'LogicalIdentifier',
         $globalId: 'toBeAssigned'
      }),
      []
   );

   // Map entity data to grid data with proper updates
   const mapToGridData = React.useCallback(() => {
      const committedData = (entity.identifiers || []).map((identifier, idx) => {
         const row = convertIdentifierToRow(identifier, idx);
         // Ensure primary status is current
         row.primary = identifier.primary || false;
         return row;
      });

      return committedData;
   }, [entity.identifiers]);

   // Update grid data whenever identifiers change
   React.useEffect(() => {
      // Immediate update of grid data
      const updateGridData = async (): Promise<void> => {
         const newData = mapToGridData();
         setGridData(current => {
            // Preserve any uncommitted rows that are currently being edited
            const uncommittedRows = current.filter(row => row._uncommitted && editingRows[row.id]);
            return [...newData, ...uncommittedRows];
         });
      };
      updateGridData();
   }, [entity.identifiers, entity.attributes, editingRows, mapToGridData]);

   const columns: GridColumn<EntityIdentifierRow>[] = React.useMemo(
      () => [
         {
            field: 'name',
            header: 'Name',
            body: (rowData: EntityIdentifierRow) => (
               <EditorProperty basePath={['entity', 'identifiers']} field='name' row={rowData} value={rowData.name || ''} />
            ),
            editor: (options: any) => <GenericTextEditor options={options} basePath={['entity', 'identifiers']} field='name' />,
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
            editor: (options: any) => <GenericCheckboxEditor options={options} basePath={['entity', 'identifiers']} field='primary' />,
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
               return <EditorProperty basePath={['entity', 'identifiers']} field='attributes' row={rowData} value={selectedAttributes} />;
            },
            editor: (options: any) => {
               const attributeOptions = entity.attributes.map(attr => ({
                  label: attr.name,
                  value: attr.id
               }));
               const rowIdx = options.rowData?.idx ?? -1;
               return (
                  <EditorContainer basePath={['entity', 'identifiers']} field='attributes' rowIdx={rowIdx}>
                     {({ invalid, error, className }) => (
                        <MultiSelect
                           value={options.value}
                           options={attributeOptions}
                           onChange={(e: MultiSelectChangeEvent) => options.editorCallback(e.value)}
                           onKeyDown={handleGridEditorKeyDown}
                           disabled={readonly}
                           className={`w-full ${className}`}
                           display='chip'
                        />
                     )}
                  </EditorContainer>
               );
            },
            filterType: 'text'
         },
         {
            field: 'description',
            header: 'Description',
            headerStyle: { width: '20%' },
            body: (rowData: EntityIdentifierRow) => (
               <EditorProperty basePath={['entity', 'identifiers']} field='description' row={rowData} value={rowData.description || ''} />
            ),
            editor: (options: any) => <GenericTextEditor options={options} basePath={['entity', 'identifiers']} field='description' />,
            filterType: 'text'
         }
      ],
      [readonly, entity.attributes]
   );

   const handleRowAdd = React.useCallback((): void => {
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
         // Ensure primary is always a boolean
         identifier.primary = Boolean(identifier.primary);
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

            // For primary identifier without a name, use 'Primary Identifier'
            const identifierName = identifier.primary && !identifier.name ? 'Primary Identifier' : identifier.name;

            // Generate unique ID using the same pattern as attributes grid, without ID_ prefix
            const newId = findNextUnique(toId(identifierName || ''), entity.identifiers || [], id => id.id || '');

            // Create the final identifier without temporary fields
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { _uncommitted: _, ...identifierData } = identifier;
            const finalIdentifier = {
               ...convertRowToIdentifier(identifierData),
               id: newId,
               name: identifierName || '',
               $globalId: `${entity.id}.${newId}`
            }; // If this will be primary, first unset any existing primary identifier and its attributes
            if (identifier.primary) {
               const currentPrimary = entity.identifiers?.find(i => i.primary);
               if (currentPrimary) {
                  // Update the existing primary identifier
                  dispatch({
                     type: 'entity:identifier:update',
                     identifierIdx: entity.identifiers.indexOf(currentPrimary),
                     identifier: {
                        ...currentPrimary,
                        primary: false
                     }
                  });

                  // Update its attributes to non-primary
                  currentPrimary.attributes.forEach(attrId => {
                     const attrIdx = entity.attributes.findIndex(attr => attr.id === (typeof attrId === 'string' ? attrId : attrId.id));
                     if (attrIdx !== -1) {
                        dispatch({
                           type: 'entity:attribute:update',
                           attributeIdx: attrIdx,
                           attribute: {
                              ...entity.attributes[attrIdx],
                              identifier: false
                           }
                        });
                     }
                  });
               }
            }

            // Set the identifier status on all selected attributes
            identifier.attributeIds.forEach(attrId => {
               const attrIdx = entity.attributes.findIndex(attr => attr.id === attrId);
               if (attrIdx !== -1) {
                  dispatch({
                     type: 'entity:attribute:update',
                     attributeIdx: attrIdx,
                     attribute: {
                        ...entity.attributes[attrIdx],
                        identifier: identifier.primary
                     }
                  });
               }
            });

            // Add the new identifier
            dispatch({
               type: 'entity:identifier:add-identifier',
               identifier: finalIdentifier
            });

            if (wasSaveTriggeredByEnter()) {
               const newTempRow: EntityIdentifierRow = {
                  ...defaultEntry,
                  id: `temp-${Date.now()}-${Math.random().toString(36).substring(2)}`,
                  _uncommitted: true
               };

               setTimeout(() => {
                  setGridData(current => [...current, newTempRow]);
                  // Clear editing state after successful update
                  setEditingRows({ [newTempRow.id]: true });
               }, 50);
            }
         } else {
            // For existing rows
            // If setting this as primary, first unset any existing primary
            if (identifier.primary) {
               const currentPrimary = entity.identifiers?.find(i => i.primary && i.id !== identifier.id);
               if (currentPrimary) {
                  // Update the existing primary identifier
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

            // Update this identifier
            dispatch({
               type: 'entity:identifier:update',
               identifierIdx: identifier.idx,
               identifier: convertRowToIdentifier(identifier)
            });
         }

         // Clear editing state after successful update
         setEditingRows({});
      },
      [dispatch, entity, defaultEntry]
   );

   if (!entity) {
      return <div className='p-error'>No Entity!</div>;
   }

   return (
      <PrimeDataGrid
         key={`identifiers-grid-${entity.identifiers?.length}-${gridData.length}`}
         className='entity-identifiers-datatable'
         columns={columns}
         data={gridData}
         keyField='id'
         height='auto'
         onRowAdd={handleRowAdd}
         onRowUpdate={handleRowUpdate}
         onRowDelete={handleIdentifierDelete}
         readonly={readonly}
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
            }

            // Update editing state
            setEditingRows(newEditingRows);
         }}
         globalFilterFields={['name', 'attributeIds']}
      />
   );
}
