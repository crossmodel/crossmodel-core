/********************************************************************************
 * Copyright (c) 2023 CrossBreeze.
 ********************************************************************************/
import { findNextUnique, LogicalAttribute, toId } from '@crossmodel/protocol';
import { AutoComplete, AutoCompleteCompleteEvent } from 'primereact/autocomplete';
import { Checkbox } from 'primereact/checkbox';
import { DataTableRowEditEvent } from 'primereact/datatable';
import * as React from 'react';
import { useDiagnostics, useEntity, useModelDispatch, useReadonly } from '../../ModelContext';
import { GridColumn, PrimeDataGrid } from './PrimeDataGrid';
import { handleGridEditorKeyDown, wasSaveTriggeredByEnter } from './gridKeydownHandler';

export interface EntityAttributeRow extends LogicalAttribute {
   idx: number;
   name: string;
   datatype: string;
   description?: string;
   identifier?: boolean;
   _uncommitted?: boolean;
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
   const rawDiagnostics = useDiagnostics();
   const [editingRows, setEditingRows] = React.useState<Record<string, boolean>>({});
   const [validationErrors, setValidationErrors] = React.useState<Record<string, string>>({});
   const [gridData, setGridData] = React.useState<EntityAttributeRow[]>([]);

   // Process diagnostics into validation errors
   React.useEffect(() => {
      const errors: Record<string, string> = {};

      // Process server-side diagnostics
      rawDiagnostics.forEach(diagnostic => {
         entity?.attributes?.forEach((attr, idx) => {
            const rowId = (attr as EntityAttributeRow).id || `attr${idx}`;

            // Check for attribute-specific errors
            if (diagnostic.code?.toString().includes(`attributes[${idx}]`)) {
               if (diagnostic.message.includes('name')) {
                  errors[`${rowId}.name`] = diagnostic.message;
               } else if (diagnostic.message.includes('datatype')) {
                  errors[`${rowId}.datatype`] = diagnostic.message;
               }
            }
         });
      });

      // Add client-side validation for empty names
      gridData.forEach(row => {
         if (!row.name?.trim()) {
            errors[`${row.id}.name`] = 'Name is required';
         }
      });

      setValidationErrors(errors);
   }, [entity?.attributes, rawDiagnostics, gridData]);

   const defaultEntry = React.useMemo<EntityAttributeRow>(
      () => ({
         name: '',
         datatype: '',
         idx: -1,
         id: '', // ID will be assigned when adding the row
         description: '',
         identifier: false,
         $type: 'LogicalAttribute',
         $globalId: 'toBeAssigned'
      }),
      []
   );

   const handleAddAttribute = React.useCallback((): void => {
      // Clear any previous validation errors
      setValidationErrors({});

      // Clear any existing edit states first
      setEditingRows({});

      // Create a new uncommitted row with a unique temporary ID
      const tempRow: EntityAttributeRow = {
         ...defaultEntry,
         id: `temp-${Date.now()}-${Math.random().toString(36).substring(2)}`, // Ensure uniqueness
         _uncommitted: true
      };

      // Add to grid data and set it to editing mode
      setGridData(current => [...current, tempRow]);
      setEditingRows({ [tempRow.id]: true });
   }, [defaultEntry]);

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

   // Update grid data when attributes change, preserving any uncommitted rows
   React.useEffect(() => {
      setGridData(current => {
         // Map the committed attributes
         const committedData = (entity.attributes || []).map((attr: Partial<LogicalAttribute>, idx) => ({
            idx,
            name: attr.name || '',
            datatype: attr.datatype || '',
            description: attr.description || '',
            identifier: (attr as any).identifier || false,
            id: attr.id || '',
            $type: 'LogicalAttribute',
            $globalId: attr.id || ''
         })) as EntityAttributeRow[];

         // Preserve any uncommitted rows that are currently being edited
         const uncommittedRows = current.filter(row => row._uncommitted && editingRows[row.id]);

         return [...committedData, ...uncommittedRows];
      });
   }, [entity.attributes, editingRows]);

   const columns: GridColumn<EntityAttributeRow>[] = React.useMemo(
      () => [
         {
            field: 'name',
            header: 'Name',
            editor: !readonly,
            headerStyle: { width: '20%' },
            filterType: 'text',
            body: (rowData: EntityAttributeRow) => {
               const error = validationErrors[`${rowData.id}.name`];
               return (
                  <div className={`grid-cell-container ${error ? 'p-invalid' : ''}`} title={error || undefined}>
                     <span>{rowData.name || ''}</span>
                     {error && <p className='p-error m-0'>{error}</p>}
                  </div>
               );
            }
         },
         {
            field: 'datatype',
            header: 'Data Type',
            headerStyle: { width: '15%' },
            editor: (options: any) => {
               const [suggestions, setSuggestions] = React.useState<{ label: string; value: string }[]>([]);

               const search = (event: AutoCompleteCompleteEvent) => {
                  const query = event.query.toLowerCase();
                  const filtered = query ? dataTypeOptions.filter(opt => opt.label.toLowerCase().includes(query)) : dataTypeOptions;
                  setSuggestions(filtered);
               };

               const handleChange = (e: any) => {
                  const value = typeof e.value === 'object' && e.value !== null ? e.value.value : e.value;
                  options.editorCallback(value);
               };

               return (
                  <AutoComplete
                     value={options.value}
                     suggestions={suggestions}
                     completeMethod={search}
                     onChange={handleChange}
                     onSelect={handleChange}
                     onKeyDown={handleGridEditorKeyDown}
                     disabled={readonly}
                     className='w-full'
                     field='label'
                     dropdown
                     forceSelection={false}
                  />
               );
            },
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
      [readonly, validationErrors]
   );

   const handleRowUpdate = React.useCallback(
      (attribute: EntityAttributeRow) => {
         // Clear any existing validation errors for this row
         const rowId = attribute.id;
         setValidationErrors(current => {
            const updated = { ...current };
            Object.keys(updated).forEach(key => {
               if (key.startsWith(`${rowId}.`)) {
                  delete updated[key];
               }
            });
            return updated;
         });

         if (attribute._uncommitted) {
            // For uncommitted rows, check if anything actually changed
            const hasChanges =
               attribute.name !== defaultEntry.name ||
               attribute.datatype !== defaultEntry.datatype ||
               attribute.description !== defaultEntry.description ||
               attribute.identifier !== defaultEntry.identifier;

            if (!hasChanges || !attribute.name) {
               // Remove the row if no changes or no name
               setGridData(current => current.filter(row => row.id !== attribute.id));
               setEditingRows({});
               return;
            }

            // Generate a proper ID for the new attribute
            const newId = findNextUnique(toId(attribute.name || ''), entity.attributes || [], attr => attr.id || '');

            // Create the final attribute without temporary fields and empty fields
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { _uncommitted, id: tempId, description, ...attributeData } = attribute;
            const finalAttribute = {
               ...attributeData,
               id: newId,
               $globalId: newId,
               ...(description ? { description } : {})
            };

            // Add the new attribute through dispatch
            dispatch({
               type: 'entity:attribute:add-attribute',
               attribute: finalAttribute
            });

            // Create a new uncommitted row for continuous entry only if save was triggered by Enter key
            if (wasSaveTriggeredByEnter()) {
               const newTempRow: EntityAttributeRow = {
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
            // This is an existing row being updated
            // Remove empty fields before updating
            const { description, ...rest } = attribute;
            const updatedAttribute = {
               ...rest,
               ...(description ? { description } : {})
            };

            dispatch({
               type: 'entity:attribute:update',
               attributeIdx: attribute.idx,
               attribute: updatedAttribute
            });

            setEditingRows({});
         }
      },
      [dispatch, defaultEntry, entity.attributes]
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
         onRowEditChange={(e: DataTableRowEditEvent) => {
            const newEditingRows = e.data as Record<string, boolean>;
            const newEditingId = Object.keys(newEditingRows)[0];
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
            // Clean up any stale uncommitted rows
            if (newEditingId) {
               setGridData(current => {
                  // Keep all committed rows
                  const committedRows = current.filter(row => !row._uncommitted);
                  const activeUncommittedRow = current.find(row => row._uncommitted && row.id === newEditingId);
                  return activeUncommittedRow ? [...committedRows, activeUncommittedRow] : committedRows;
               });
            }
         }}
         globalFilterFields={['name', 'datatype', 'description']}
      />
   );
}
