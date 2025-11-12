/********************************************************************************
 * Copyright (c) 2023 CrossBreeze.
 ********************************************************************************/
import {
   AttributeMapping,
   AttributeMappingSource,
   AttributeMappingSourceType,
   AttributeMappingType,
   CrossModelElement,
   CrossReferenceContext,
   ReferenceableElement,
   TargetObjectType
} from '@crossmodel/protocol';
import { AutoComplete, AutoCompleteChangeEvent, AutoCompleteCompleteEvent, AutoCompleteDropdownClickEvent } from 'primereact/autocomplete';
import { DataTableRowEditEvent } from 'primereact/datatable';
import * as React from 'react';
import { useMapping, useModelDispatch, useModelQueryApi, useReadonly } from '../../ModelContext';
import { GridColumn, PrimeDataGrid } from './PrimeDataGrid';
import { handleGridEditorKeyDown, wasSaveTriggeredByEnter } from './gridKeydownHandler';

interface AttributeMappingSourceEditorProps {
   options: any;
   mappingIdx: number;
}

function AttributeMappingSourceEditor(props: AttributeMappingSourceEditorProps): React.ReactElement {
   const mapping = useMapping();
   const { options } = props;
   const { editorCallback } = options;

   const [currentValue, setCurrentValue] = React.useState(options.value);
   const [suggestions, setSuggestions] = React.useState<ReferenceableElement[]>([]);
   const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);
   const queryApi = useModelQueryApi();
   const readonly = useReadonly();
   const isDropdownClicked = React.useRef(false);
   // eslint-disable-next-line no-null/no-null
   const autoCompleteRef = React.useRef<AutoComplete>(null);

   const referenceCtx: CrossReferenceContext = React.useMemo(
      () => ({
         container: { globalId: mapping.id },
         syntheticElements: [
            { property: 'target', type: TargetObjectType },
            { property: 'mappings', type: AttributeMappingType },
            { property: 'sources', type: AttributeMappingSourceType }
         ],
         property: 'value'
      }),
      [mapping]
   );

   const search = React.useCallback(
      async (event: AutoCompleteCompleteEvent) => {
         const elements = await queryApi.findReferenceableElements(referenceCtx);
         const filteredSuggestions = elements.filter(element =>
            isDropdownClicked.current ? true : event.query ? (element.label || '').toLowerCase().includes(event.query.toLowerCase()) : true
         );
         setSuggestions(filteredSuggestions);
         isDropdownClicked.current = false;
      },
      [queryApi, referenceCtx]
   );

   const onChange = (e: AutoCompleteChangeEvent): void => {
      const value = e.value;
      // eslint-disable-next-line no-null/no-null
      if (typeof value === 'object' && value !== null && value.label) {
         setCurrentValue(value.label);
         if (editorCallback) {
            editorCallback(value.label);
         }
      } else {
         setCurrentValue(value);
         if (editorCallback) {
            editorCallback(value);
         }
      }
   };

   const handleDropdownClick = (event: AutoCompleteDropdownClickEvent): void => {
      isDropdownClicked.current = true;

      // Check if dropdown is currently visible
      setTimeout(() => {
         const panel = autoCompleteRef.current?.getOverlay();
         // eslint-disable-next-line no-null/no-null
         const isVisible = panel && panel.style.display !== 'none' && panel.offsetParent !== null;

         if (isVisible) {
            // If visible, hide it
            autoCompleteRef.current?.hide();
            setIsDropdownOpen(false);
         } else {
            // If not visible, show it by triggering search with empty query
            autoCompleteRef.current?.search(event.originalEvent, '', 'dropdown');
            setIsDropdownOpen(true);
         }
      }, 10);
   };

   const onShow = (): void => {
      setIsDropdownOpen(true);
   };

   const onHide = (): void => {
      setIsDropdownOpen(false);
   };

   // Handle click outside to close dropdown
   React.useEffect(() => {
      const handleClickOutside = (event: MouseEvent): void => {
         if (autoCompleteRef.current && !autoCompleteRef.current.getElement()?.contains(event.target as Node)) {
            // Small delay to allow selection to complete first
            setTimeout(() => {
               const panel = autoCompleteRef.current?.getOverlay();
               if (panel && panel.style.display !== 'none') {
                  autoCompleteRef.current?.hide();
                  setIsDropdownOpen(false);
               }
            }, 100);
         }
      };

      document.addEventListener('mouseup', handleClickOutside);
      return () => {
         document.removeEventListener('mouseup', handleClickOutside);
      };
   }, []);

   return (
      <AutoComplete
         ref={autoCompleteRef}
         value={currentValue ?? ''}
         suggestions={suggestions}
         field='label'
         completeMethod={search}
         dropdown
         className={`w-full ${isDropdownOpen ? 'autocomplete-dropdown-open' : ''}`}
         onDropdownClick={handleDropdownClick}
         onChange={onChange}
         onShow={onShow}
         onHide={onHide}
         disabled={readonly}
         autoFocus
         onKeyDown={handleGridEditorKeyDown}
      />
   );
}

interface AttributeMappingSourcesDataGridProps {
   attributeMapping: AttributeMapping;
   mappingIdx: number;
}

export interface AttributeMappingSourceRow extends Omit<AttributeMappingSource & CrossModelElement, 'value'> {
   idx: number;
   id: string;
   value: string;
   _uncommitted?: boolean;
}

export function AttributeMappingSourcesDataGrid({
   attributeMapping,
   mappingIdx
}: AttributeMappingSourcesDataGridProps): React.ReactElement {
   const dispatch = useModelDispatch();
   const readonly = useReadonly();
   const [editingRows, setEditingRows] = React.useState<Record<string, boolean>>({});
   const [validationErrors, setValidationErrors] = React.useState<Record<string, string>>({});

   const defaultEntry = React.useMemo<Partial<AttributeMappingSourceRow>>(
      () => ({
         $type: AttributeMappingSourceType,
         value: '',
         id: ''
      }),
      []
   );

   const [gridData, setGridData] = React.useState<AttributeMappingSourceRow[]>([]);

   // Update grid data when sources change, preserving any uncommitted rows
   React.useEffect(() => {
      setGridData(current => {
         // Map the committed sources
         const committedData = (attributeMapping.sources || []).map((source, idx) => ({
            ...source,
            idx,
            id: `source${idx}`,
            value: String(source.value || '')
         })) as AttributeMappingSourceRow[];

         // Preserve any uncommitted rows that are currently being edited
         const uncommittedRows = current.filter(row => row._uncommitted && editingRows[row.id]);

         return [...committedData, ...uncommittedRows];
      });
   }, [attributeMapping.sources, editingRows]);

   const onSourceDelete = React.useCallback(
      (sourceToDelete: AttributeMappingSourceRow) => {
         dispatch({ type: 'attribute-mapping:delete-source', mappingIdx, sourceIdx: sourceToDelete.idx });
      },
      [dispatch, mappingIdx]
   );

   const onSourceUpdate = React.useCallback(
      (sourceToUpdate: AttributeMappingSourceRow) => {
         // Clear any existing validation errors for this row
         const rowId = sourceToUpdate.id;
         setValidationErrors(current => {
            const updated = { ...current };
            Object.keys(updated).forEach(key => {
               if (key.startsWith(`${rowId}.`)) {
                  delete updated[key];
               }
            });
            return updated;
         });

         if (sourceToUpdate._uncommitted) {
            // For uncommitted rows, check if anything actually changed
            const hasChanges = sourceToUpdate.value !== defaultEntry.value;

            // Check if the value is valid (not empty or default value)
            const isValidValue =
               sourceToUpdate.value && sourceToUpdate.value.trim() !== '' && sourceToUpdate.value !== '_' && sourceToUpdate.value !== '-';

            if (!hasChanges || !isValidValue) {
               // Remove the row if no changes or invalid value
               setGridData(current => current.filter(row => row.id !== sourceToUpdate.id));
               setEditingRows({});
               return;
            }

            // Add the new source through dispatch
            dispatch({
               type: 'attribute-mapping:add-source',
               mappingIdx,
               source: {
                  $type: AttributeMappingSourceType,
                  value: sourceToUpdate.value
               }
            });

            if (wasSaveTriggeredByEnter()) {
               const newTempRow: AttributeMappingSourceRow = {
                  ...defaultEntry,
                  id: `temp-${Date.now()}-${Math.random().toString(36).substring(2)}`,
                  _uncommitted: true,
                  idx: -1
               } as AttributeMappingSourceRow;

               setTimeout(() => {
                  setGridData(current => [...current, newTempRow]);
                  setEditingRows({ [newTempRow.id]: true });
               }, 50);
            }
         } else {
            // This is an existing row being updated
            if (!sourceToUpdate.value?.trim() || sourceToUpdate.value === '_' || sourceToUpdate.value === '-') {
               // Invalid value, delete the row
               onSourceDelete(sourceToUpdate);
               return;
            }

            dispatch({
               type: 'attribute-mapping:update-source',
               mappingIdx,
               sourceIdx: sourceToUpdate.idx,
               source: {
                  $type: AttributeMappingSourceType,
                  value: sourceToUpdate.value
               }
            });
         }

         // Clear editing state after successful update
         setEditingRows({});
      },
      [dispatch, mappingIdx, onSourceDelete, defaultEntry]
   );

   const onSourceAdd = React.useCallback((): void => {
      // Clear any previous validation errors
      setValidationErrors({});

      // Clear any existing edit states first
      setEditingRows({});

      // Create a new uncommitted row with a unique temporary ID
      const tempRow: AttributeMappingSourceRow = {
         ...defaultEntry,
         id: `temp-${Date.now()}-${Math.random().toString(36).substring(2)}`, // Ensure uniqueness
         _uncommitted: true,
         idx: -1
      } as AttributeMappingSourceRow;

      // Add to grid data and set it to editing mode
      setGridData(current => [...current, tempRow]);
      setEditingRows({ [tempRow.id]: true });
   }, [defaultEntry]);

   const onSourceMoveUp = React.useCallback(
      (sourceToMove: AttributeMappingSourceRow) => {
         dispatch({ type: 'attribute-mapping:move-source-up', mappingIdx, sourceIdx: sourceToMove.idx });
      },
      [dispatch, mappingIdx]
   );

   const onSourceMoveDown = React.useCallback(
      (sourceToMove: AttributeMappingSourceRow) => {
         dispatch({ type: 'attribute-mapping:move-source-down', mappingIdx, sourceIdx: sourceToMove.idx });
      },
      [dispatch, mappingIdx]
   );

   const columns: GridColumn<AttributeMappingSourceRow>[] = React.useMemo(
      () => [
         {
            field: 'value',
            header: 'Value',
            body: rowData => rowData.value,
            editor: (options: any) => <AttributeMappingSourceEditor options={options} mappingIdx={mappingIdx} />
         }
      ],
      [mappingIdx]
   );

   if (!attributeMapping) {
      return <></>;
   }

   return (
      <PrimeDataGrid
         className='attribute-mapping-sources-datatable'
         columns={columns}
         data={gridData}
         keyField='id'
         height='auto'
         onRowAdd={onSourceAdd}
         onRowUpdate={onSourceUpdate}
         onRowDelete={onSourceDelete}
         onRowMoveUp={onSourceMoveUp}
         onRowMoveDown={onSourceMoveDown}
         defaultNewRow={defaultEntry}
         readonly={readonly}
         validationErrors={validationErrors}
         noDataMessage='No source expressions'
         addButtonLabel='Add Source'
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
            setGridData(current => {
               // Keep all committed rows
               const committedRows = current.filter(row => !row._uncommitted);

               // For uncommitted rows, only keep the one being edited (if any)
               const activeUncommittedRow = newEditingId ? current.find(row => row._uncommitted && row.id === newEditingId) : undefined;

               return activeUncommittedRow ? [...committedRows, activeUncommittedRow] : committedRows;
            });
         }}
         globalFilterFields={['value']}
      />
   );
}
