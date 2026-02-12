/********************************************************************************
 * Copyright (c) 2025 CrossBreeze.
 ********************************************************************************/
import { CustomProperty, LogicalIdentifier, findNextUnique, toId } from '@crossmodel/protocol';
import { DataTableRowEditEvent } from 'primereact/datatable';
import { MultiSelect, MultiSelectChangeEvent } from 'primereact/multiselect';
import * as React from 'react';
import { useEntity, useModelDispatch, useReadonly } from '../../ModelContext';
import { EditorContainer, EditorProperty, GenericCheckboxEditor, GenericTextEditor } from './GenericEditors';
import { GridColumn, PrimeDataGrid, handleGenericRowReorder } from './PrimeDataGrid';
import { focusTable } from './focusManagement';
import { handleGridEditorKeyDown, wasSaveTriggeredByEnter } from './gridKeydownHandler';

export interface EntityIdentifierRow {
   idx: number;
   id: string;
   name: string;
   primary: boolean;
   attributeIds: string[];
   description?: string;
   customProperties?: CustomProperty[];
   $type?: 'LogicalIdentifier';
   _globalId?: string;
   _uncommitted?: boolean;
}

const deriveIdentifierRowId = (identifier: Partial<LogicalIdentifier>, idx: number): string => {
   const persistedId = identifier.id as string | undefined;
   const globalId = identifier._globalId as string | undefined;
   return persistedId ?? globalId ?? `identifier-${idx}`;
};

function convertIdentifierToRow(identifier: LogicalIdentifier, idx: number): EntityIdentifierRow {
   const attributeIds = (identifier.attributes || []).map(attr => String(attr).replace(/^[-_]+/, ''));
   const id = deriveIdentifierRowId(identifier, idx);
   return {
      idx,
      id,
      name: identifier.name || '',
      primary: Boolean(identifier.primary),
      attributeIds,
      description: identifier.description || '',
      ...((identifier as any).customProperties ? { customProperties: (identifier as any).customProperties } : {})
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
      _globalId: row.id,
      customProperties: row.customProperties ?? []
   };
}

export function EntityIdentifiersDataGrid(): React.ReactElement {
   const entity = useEntity();
   const dispatch = useModelDispatch();
   const readonly = useReadonly();
   const [editingRows, setEditingRows] = React.useState<Record<string, boolean>>({});
   const [gridData, setGridData] = React.useState<EntityIdentifierRow[]>([]);
   const [selectedRows, setSelectedRows] = React.useState<EntityIdentifierRow[]>([]);
   const pendingDeleteIdsRef = React.useRef<Set<string>>(new Set());
   const identifiersRef = React.useRef(entity?.identifiers || []);

   const handleSelectionChange = React.useCallback((e: { value: EntityIdentifierRow[] }): void => {
      setSelectedRows(e.value);
   }, []);

   const handleIdentifierDelete = React.useCallback(
      (identifier: EntityIdentifierRow): void => {
         if (identifier.id && !identifier._uncommitted) {
            pendingDeleteIdsRef.current.add(identifier.id);
         }

         setGridData(current => current.filter(row => row.id !== identifier.id));
         setSelectedRows(current => current.filter(row => row.id !== identifier.id));

         if (identifier._uncommitted) {
            if (identifier.id) {
               pendingDeleteIdsRef.current.delete(identifier.id);
            }
            return;
         }

         const identifierIdx = (entity.identifiers || []).findIndex((item, idx) => deriveIdentifierRowId(item, idx) === identifier.id);
         if (identifierIdx === -1) {
            if (identifier.id) {
               pendingDeleteIdsRef.current.delete(identifier.id);
            }
            return;
         }

         dispatch({
            type: 'entity:identifier:delete-identifier',
            identifierIdx
         });

         // After delete action, ensure focus goes to the table/property widget for undo/redo
         // Use setTimeout to ensure focus is set after React updates
         setTimeout(() => {
            const table = (document.querySelector('.entity-identifiers-datatable') ?? undefined) as HTMLElement | undefined;
            focusTable(table);
         }, 0);
      },
      [dispatch, entity.identifiers]
   );

   const handleRowReorder = React.useCallback(
      (e: { rows: EntityIdentifierRow[] }): void => {
         handleGenericRowReorder(
            e,
            pendingDeleteIdsRef.current,
            identifiersRef.current || [],
            deriveIdentifierRowId,
            reorderedIdentifiers => {
               dispatch({
                  type: 'entity:identifier:reorder-identifiers',
                  identifiers: reorderedIdentifiers
               });
            }
         );
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
         _globalId: 'toBeAssigned'
      }),
      []
   );

   // Map entity data to grid data with proper updates
   const mapToGridData = React.useCallback(
      () =>
         (entity.identifiers || []).map((identifier, idx) => {
            const row = convertIdentifierToRow(identifier, idx);
            row.primary = identifier.primary || false;
            return row;
         }),
      [entity.identifiers]
   );

   // Update grid data whenever identifiers change
   React.useEffect(() => {
      // Immediate update of grid data
      const updateGridData = async (): Promise<void> => {
         const committedData = mapToGridData();
         setGridData(current => {
            identifiersRef.current = entity.identifiers || [];
            const committedIds = new Set(committedData.map(row => row.id));
            pendingDeleteIdsRef.current.forEach(id => {
               if (!committedIds.has(id)) {
                  pendingDeleteIdsRef.current.delete(id);
               }
            });

            const visibleCommittedData = committedData.filter(row => !pendingDeleteIdsRef.current.has(row.id));
            const uncommittedRows = current.filter(row => row._uncommitted && editingRows[row.id]);
            return [...visibleCommittedData, ...uncommittedRows];
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
                  .filter(attr => rowData.attributeIds.includes(attr.id!))
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
                           filter
                           filterBy='label'
                           filterPlaceholder='Search...'
                           filterMatchMode='contains'
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
               identifier.attributeIds.length > 0 ||
               identifier.primary !== defaultEntry.primary;

            if (!hasChanges) {
               // Remove the row if no changes
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
               _globalId: `${entity.id}.${newId}`
            }; // If this will be primary, first unset any existing primary identifier
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
               }
            }

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
         onRowReorder={handleRowReorder}
         selectedRows={selectedRows}
         onSelectionChange={handleSelectionChange}
         readonly={readonly}
         defaultNewRow={defaultEntry}
         noDataMessage='No identifiers defined'
         addButtonLabel='Add Identifier'
         editingRows={editingRows}
         metaKeySelection={false}
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
