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
import { useDiagnosticsManager, useMapping, useModelDispatch, useModelQueryApi, useReadonly } from '../../ModelContext';
import { GridColumn, handleGenericRowReorder, PrimeDataGrid } from './PrimeDataGrid';
import { handleGridEditorKeyDown, wasSaveTriggeredByEnter } from './gridKeydownHandler';

interface AttributeMappingSourceValueProps {
   row: { idx: number };
   mappingIdx: number;
   value: string;
}

function AttributeMappingSourceValue({ row, mappingIdx, value }: AttributeMappingSourceValueProps): React.ReactNode {
   const diagnostics = useDiagnosticsManager();
   const basePath = ['mapping', 'target', 'mappings@' + mappingIdx.toString(), 'sources@' + row.idx.toString()];
   const valueInfo = diagnostics.info(basePath, 'value');
   const errorMessage = valueInfo.empty ? undefined : valueInfo.text();

   return (
      <div className={`grid-cell-container ${errorMessage ? 'p-invalid' : ''}`} title={errorMessage}>
         {value}
         {errorMessage && <p className='p-error m-0'>{errorMessage}</p>}
      </div>
   );
}

interface AttributeMappingSourceEditorProps {
   options: {
      value: string;
      editorCallback?: (value: string) => void;
      rowData: AttributeMappingSourceRow;
   };
   mappingIdx: number;
}

function AttributeMappingSourceEditor(props: AttributeMappingSourceEditorProps): React.ReactElement {
   const mapping = useMapping();
   const { options } = props;
   const { editorCallback } = options;
   const diagnostics = useDiagnosticsManager();
   const [errorMessage, setErrorMessage] = React.useState<string>('');

   const [currentValue, setCurrentValue] = React.useState(options.value);
   const [suggestions, setSuggestions] = React.useState<ReferenceableElement[]>([]);
   const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);
   const queryApi = useModelQueryApi();
   const readonly = useReadonly();
   const isDropdownClicked = React.useRef(false);
   // eslint-disable-next-line no-null/no-null
   const autoCompleteRef = React.useRef<AutoComplete>(null);

   React.useEffect(() => {
      // Check for value-level diagnostics
      const basePath = ['mapping', 'target', 'mappings@' + props.mappingIdx.toString(), 'sources@' + options.rowData.idx.toString()];
      const valueInfo = diagnostics.info(basePath, 'value');

      if (!valueInfo.empty) {
         setErrorMessage(valueInfo.text() || '');
      } else {
         setErrorMessage('');
      }
   }, [diagnostics, props.mappingIdx, options.rowData.idx]);

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
      <div className='grid-editor-container'>
         <div className={`p-field ${errorMessage ? 'p-error' : ''}`}>
            <AutoComplete
               ref={autoCompleteRef}
               value={currentValue ?? ''}
               suggestions={suggestions}
               field='label'
               completeMethod={search}
               dropdown
               className={`w-full ${isDropdownOpen ? 'autocomplete-dropdown-open' : ''} ${errorMessage ? 'p-invalid' : ''}`}
               onDropdownClick={handleDropdownClick}
               onChange={onChange}
               onShow={onShow}
               onHide={onHide}
               disabled={readonly}
               autoFocus
               onKeyDown={handleGridEditorKeyDown}
            />
            {errorMessage && <small className='p-error block mt-1'>{errorMessage}</small>}
         </div>
      </div>
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
   const [selectedRows, setSelectedRows] = React.useState<AttributeMappingSourceRow[]>([]);
   const pendingDeleteIdsRef = React.useRef<Set<string>>(new Set());
   const sourcesRef = React.useRef<AttributeMappingSource[]>(attributeMapping.sources || []);

   const deriveSourceRowId = React.useCallback((source: Partial<AttributeMappingSource>, idx: number): string => {
      const globalId = (source as { $globalId?: string })?.$globalId;
      const value = source.value || 'source';
      return globalId ?? `${value}-${idx}`;
   }, []);

   const handleSelectionChange = React.useCallback((e: { value: AttributeMappingSourceRow[] }): void => {
      setSelectedRows(e.value);
   }, []);

   const defaultEntry = React.useMemo<Partial<AttributeMappingSourceRow>>(
      () => ({
         $type: AttributeMappingSourceType,
         value: '',
         id: ''
      }),
      []
   );

   const [gridData, setGridData] = React.useState<AttributeMappingSourceRow[]>([]);

   const handleRowReorder = React.useCallback(
      (e: { rows: AttributeMappingSourceRow[] }): void => {
         handleGenericRowReorder(
            e,
            pendingDeleteIdsRef.current,
            sourcesRef.current || [],
            deriveSourceRowId,
            reorderedSources => {
               dispatch({
                  type: 'attribute-mapping:source:reorder-sources',
                  mappingIdx,
                  sources: reorderedSources
               });
            }
         );
      },
      [dispatch, mappingIdx, deriveSourceRowId]
   );

   // Update grid data when sources change, preserving any uncommitted rows
   React.useEffect(() => {
      setGridData(current => {
         sourcesRef.current = attributeMapping.sources || [];
         const committedData = (attributeMapping.sources || []).map((source: AttributeMappingSource, idx: number) => ({
            ...source,
            idx,
            id: deriveSourceRowId(source, idx),
            value: String(source.value || '')
         })) as AttributeMappingSourceRow[];

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
   }, [attributeMapping.sources, editingRows, deriveSourceRowId]);

   const onSourceDelete = React.useCallback(
      (sourceToDelete: AttributeMappingSourceRow) => {
         if (sourceToDelete.id && !sourceToDelete._uncommitted) {
            pendingDeleteIdsRef.current.add(sourceToDelete.id);
         }

         setGridData(current => current.filter(row => row.id !== sourceToDelete.id));
         setSelectedRows(current => current.filter(row => row.id !== sourceToDelete.id));

         if (sourceToDelete._uncommitted) {
            if (sourceToDelete.id) {
               pendingDeleteIdsRef.current.delete(sourceToDelete.id);
            }
            return;
         }

         const sourceIdx = (attributeMapping.sources || []).findIndex(
            (source: AttributeMappingSource, idx: number) => deriveSourceRowId(source, idx) === sourceToDelete.id
         );
         if (sourceIdx === -1) {
            if (sourceToDelete.id) {
               pendingDeleteIdsRef.current.delete(sourceToDelete.id);
            }
            return;
         }

         dispatch({ type: 'attribute-mapping:delete-source', mappingIdx, sourceIdx });
      },
      [dispatch, mappingIdx, attributeMapping.sources, deriveSourceRowId]
   );

   const onSourceUpdate = React.useCallback(
      (sourceToUpdate: AttributeMappingSourceRow) => {
         if (sourceToUpdate._uncommitted) {
            // For uncommitted rows, check if anything actually changed
            const hasChanges = sourceToUpdate.value !== defaultEntry.value;

            

            if (!hasChanges) {
               // Remove the row if no changes
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

   const columns: GridColumn<AttributeMappingSourceRow>[] = React.useMemo(
      () => [
         {
            field: 'value',
            header: 'Value',
            body: rowData => <AttributeMappingSourceValue row={rowData} mappingIdx={mappingIdx} value={rowData.value || ''} />,
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
         onRowReorder={handleRowReorder}
         selectedRows={selectedRows}
         onSelectionChange={handleSelectionChange}
         defaultNewRow={defaultEntry}
         readonly={readonly}
         noDataMessage='No source expressions'
         addButtonLabel='Add Source'
         editingRows={editingRows}
         metaKeySelection={false}
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
