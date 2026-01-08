/********************************************************************************
 * Copyright (c) 2024 CrossBreeze.
 ********************************************************************************/
import {
   CrossReferenceContext,
   Mapping,
   ReferenceableElement,
   SourceObject,
   SourceObjectDependency,
   SourceObjectDependencyType
} from '@crossmodel/protocol';
import { AutoComplete, AutoCompleteChangeEvent, AutoCompleteCompleteEvent, AutoCompleteDropdownClickEvent } from 'primereact/autocomplete';
import { DataTableRowEditEvent } from 'primereact/datatable';
import * as React from 'react';
import {
   useCanRedo,
   useCanUndo,
   useDiagnosticsManager,
   useModelDispatch,
   useModelQueryApi,
   useReadonly,
   useRedo,
   useUndo
} from '../../ModelContext';
import { GridColumn, handleGenericRowReorder, PrimeDataGrid } from './PrimeDataGrid';
import { handleGridEditorKeyDown, handleUndoRedoKeys, wasSaveTriggeredByEnter } from './gridKeydownHandler';

interface SourceObjectDependencyEditorProps {
   options: any;
   sourceObject: SourceObject;
   sourceObjectIdx: number;
}

function SourceObjectDependencyEditor(props: SourceObjectDependencyEditorProps): React.ReactElement {
   const { options, sourceObject } = props;
   const { editorCallback } = options;

   const diagnostics = useDiagnosticsManager();
   const undo = useUndo();
   const redo = useRedo();
   const canUndo = useCanUndo();
   const canRedo = useCanRedo();

   const [currentValue, setCurrentValue] = React.useState(options.value || '');
   const [suggestions, setSuggestions] = React.useState<ReferenceableElement[]>([]);
   const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);
   const queryApi = useModelQueryApi();
   const readonly = useReadonly();

   const [errorMessage, setErrorMessage] = React.useState<string>('');

   // Process diagnostics for this field
   React.useEffect(() => {
      const basePath = ['mapping', 'sources@' + props.sourceObjectIdx.toString(), 'dependencies@' + options.rowData.idx.toString()];
      const fieldInfo = diagnostics.info(basePath, 'source');

      if (!fieldInfo.empty) {
         setErrorMessage(fieldInfo.text() || '');
      } else {
         setErrorMessage('');
      }
   }, [diagnostics, options.rowData.idx, props.sourceObjectIdx]);
   const isDropdownClicked = React.useRef(false);
   // eslint-disable-next-line no-null/no-null
   const autoCompleteRef = React.useRef<AutoComplete>(null);

   const referenceCtx: CrossReferenceContext = React.useMemo(
      () => ({
         container: { globalId: sourceObject.$globalId },
         syntheticElements: [{ property: 'dependencies', type: SourceObjectDependencyType }],
         property: 'source'
      }),
      [sourceObject.$globalId]
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
      let finalValue = ''; // Default value if nothing is selected

      if (typeof value === 'object' && value !== undefined && value.label) {
         finalValue = value.label;
      } else if (value) {
         finalValue = value;
      }

      setCurrentValue(finalValue);

      if (editorCallback) {
         editorCallback(finalValue);
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
               onKeyDown={e => {
                  handleGridEditorKeyDown(e);
                  handleUndoRedoKeys(e, canUndo, canRedo, undo, redo);
               }}
            />
            {errorMessage && <small className='p-error block'>{errorMessage}</small>}
         </div>
      </div>
   );
}

export interface SourceObjectDependencyRow extends SourceObjectDependency {
   idx: number;
   id: string;
   _uncommitted?: boolean;
}

export interface SourceObjectDependencyDataGridProps {
   mapping: Mapping;
   sourceObjectIdx: number;
}

export function SourceObjectDependencyDataGrid({ mapping, sourceObjectIdx }: SourceObjectDependencyDataGridProps): React.ReactElement {
   const dispatch = useModelDispatch();
   const readonly = useReadonly();
   const sourceObject = mapping.sources[sourceObjectIdx];
   const [editingRows, setEditingRows] = React.useState<Record<string, boolean>>({});
   const [gridData, setGridData] = React.useState<SourceObjectDependencyRow[]>([]);
   const [selectedRows, setSelectedRows] = React.useState<SourceObjectDependencyRow[]>([]);
   const pendingDeleteIdsRef = React.useRef<Set<string>>(new Set());
   const dependenciesRef = React.useRef(sourceObject.dependencies || []);

   const deriveDependencyRowId = React.useCallback((dependency: Partial<SourceObjectDependency>, idx: number): string => {
      const globalId = (dependency as { $globalId?: string })?.$globalId;
      const source = dependency.source || 'source';
      return globalId ?? `${source}-${idx}`;
   }, []);

   const handleSelectionChange = React.useCallback((e: { value: SourceObjectDependencyRow[] }): void => {
      setSelectedRows(e.value);
   }, []);

   // Update grid data when dependencies change, preserving any uncommitted rows
   React.useEffect(() => {
      setGridData(current => {
         dependenciesRef.current = sourceObject.dependencies || [];
         const committedData = (sourceObject.dependencies || []).map((dep, idx) => ({
            ...dep,
            idx,
            id: deriveDependencyRowId(dep, idx)
         })) as SourceObjectDependencyRow[];

         const committedIds = new Set(committedData.map(dep => dep.id));
         pendingDeleteIdsRef.current.forEach(id => {
            if (!committedIds.has(id)) {
               pendingDeleteIdsRef.current.delete(id);
            }
         });

         const visibleCommittedData = committedData.filter(row => !pendingDeleteIdsRef.current.has(row.id));
         const uncommittedRows = current.filter(row => row._uncommitted && editingRows[row.id]);

         return [...visibleCommittedData, ...uncommittedRows];
      });
   }, [sourceObject.dependencies, editingRows, deriveDependencyRowId]);

   const defaultEntry = React.useMemo<Partial<SourceObjectDependencyRow>>(
      () => ({
         $type: SourceObjectDependencyType,
         source: '',
         id: ''
      }),
      []
   );

   const sourceOptions = React.useMemo(() => {
      const uniqueSources = [...new Set(gridData.map(item => item.source).filter(Boolean))];
      return uniqueSources.map(s => ({ label: s, value: s }));
   }, [gridData]);

   const onRowDelete = React.useCallback(
      (dependency: SourceObjectDependencyRow) => {
         if (dependency.id && !dependency._uncommitted) {
            pendingDeleteIdsRef.current.add(dependency.id);
         }

         setGridData(current => current.filter(row => row.id !== dependency.id));
         setSelectedRows(current => current.filter(row => row.id !== dependency.id));

         if (dependency._uncommitted) {
            if (dependency.id) {
               pendingDeleteIdsRef.current.delete(dependency.id);
            }
            return;
         }

         const dependencyIdx = (sourceObject.dependencies || []).findIndex((dep, idx) => deriveDependencyRowId(dep, idx) === dependency.id);
         if (dependencyIdx === -1) {
            if (dependency.id) {
               pendingDeleteIdsRef.current.delete(dependency.id);
            }
            return;
         }

         dispatch({
            type: 'source-object:delete-dependency',
            sourceObjectIdx,
            dependencyIdx
         });
      },
      [dispatch, sourceObjectIdx, sourceObject.dependencies, deriveDependencyRowId]
   );

   const onRowUpdate = React.useCallback(
      (dependency: SourceObjectDependencyRow) => {
         if (dependency._uncommitted) {
            // For uncommitted rows, check if anything actually changed
            const hasChanges = dependency.source !== defaultEntry.source;

            if (!hasChanges) {
               // Remove the row if no changes
               setGridData(current => current.filter(row => row.id !== dependency.id));
               setEditingRows({});
               return;
            }

            // Add the new dependency through dispatch
            dispatch({
               type: 'source-object:add-dependency',
               sourceObjectIdx,
               dependency: {
                  $type: SourceObjectDependencyType,
                  source: dependency.source
               }
            });

            if (wasSaveTriggeredByEnter()) {
               const newTempRow: SourceObjectDependencyRow = {
                  ...defaultEntry,
                  id: `temp-${Date.now()}-${Math.random().toString(36).substring(2)}`,
                  _uncommitted: true,
                  idx: -1
               } as SourceObjectDependencyRow;

               setTimeout(() => {
                  setGridData(current => [...current, newTempRow]);
                  setEditingRows({ [newTempRow.id]: true });
               }, 50);
            }
         } else {
            // This is an existing row being updated
            if (!dependency.source?.trim() || dependency.source === '_' || dependency.source === '-') {
               // Invalid source, delete the row
               onRowDelete(dependency);
               return;
            }

            dispatch({
               type: 'source-object:update-dependency',
               sourceObjectIdx,
               dependencyIdx: dependency.idx,
               dependency: {
                  $type: SourceObjectDependencyType,
                  source: dependency.source
               }
            });
         }

         // Clear editing state after successful update
         setEditingRows({});
      },
      [dispatch, sourceObjectIdx, onRowDelete, defaultEntry]
   );

   const onRowAdd = React.useCallback((): void => {
      // Clear any existing edit states first
      setEditingRows({});

      // Create a new uncommitted row with a unique temporary ID
      const tempRow: SourceObjectDependencyRow = {
         ...defaultEntry,
         id: `temp-${Date.now()}-${Math.random().toString(36).substring(2)}`, // Ensure uniqueness
         _uncommitted: true,
         idx: -1
      } as SourceObjectDependencyRow;

      // Add to grid data and set it to editing mode
      setGridData(current => [...current, tempRow]);
      setEditingRows({ [tempRow.id]: true });
   }, [defaultEntry]);

   const handleRowReorder = React.useCallback(
      (e: { rows: SourceObjectDependencyRow[] }): void => {
         handleGenericRowReorder(
            e,
            pendingDeleteIdsRef.current,
            dependenciesRef.current || [],
            deriveDependencyRowId,
            reorderedDependencies => {
               dispatch({
                  type: 'source-object:reorder-dependencies',
                  sourceObjectIdx,
                  dependencies: reorderedDependencies
               });
            }
         );
      },
      [dispatch, sourceObjectIdx, deriveDependencyRowId]
   );

   function SourceObjectDependencyProperty({
      rowData,
      editingRows: editingRowsProp,
      sourceObjectIdx: sourceIdx
   }: {
      rowData: SourceObjectDependencyRow;
      editingRows: Record<string, boolean>;
      sourceObjectIdx: number;
   }): React.ReactNode {
      const diagnostics = useDiagnosticsManager();
      const basePath = ['mapping', 'sources@' + sourceIdx.toString(), 'dependencies@' + rowData.idx.toString()];
      const info = diagnostics.info(basePath, 'source');
      const error = info.empty ? undefined : info.text();

      return (
         <div className={`grid-cell-container ${error ? 'p-invalid' : ''}`} title={error || undefined}>
            {rowData.source}
            {error && <p className='p-error m-0'>{error}</p>}
         </div>
      );
   }

   const columns = React.useMemo<GridColumn<SourceObjectDependencyRow>[]>(
      () => [
         {
            field: 'source',
            header: 'Source',
            body: (rowData: SourceObjectDependencyRow) => (
               <SourceObjectDependencyProperty rowData={rowData} editingRows={editingRows} sourceObjectIdx={sourceObjectIdx} />
            ),
            editor: (options: any) => (
               <SourceObjectDependencyEditor options={options} sourceObject={sourceObject} sourceObjectIdx={sourceObjectIdx} />
            ),
            filterType: 'multiselect',
            filterOptions: sourceOptions,
            showFilterMatchModes: false
         }
      ],
      [sourceObject, sourceOptions, sourceObjectIdx, editingRows]
   );

   if (!mapping || !sourceObject) {
      return <div>No mapping or source object available</div>;
   }

   return (
      <div className='source-dependencies-container'>
         <PrimeDataGrid
            columns={columns}
            data={gridData}
            keyField='id'
            height='auto'
            onRowAdd={onRowAdd}
            onRowUpdate={onRowUpdate}
            onRowDelete={onRowDelete}
            onRowReorder={handleRowReorder}
            selectedRows={selectedRows}
            onSelectionChange={handleSelectionChange}
            defaultNewRow={defaultEntry}
            readonly={readonly}
            noDataMessage='No dependencies'
            addButtonLabel='Add Dependency'
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
            globalFilterFields={['source']}
         />
      </div>
   );
}
