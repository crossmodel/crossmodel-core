/********************************************************************************
 * Copyright (c) 2025 CrossBreeze.
 ********************************************************************************/
import { CrossReferenceContext, EntityInherit, EntityInheritType, LogicalEntityType, toIdReference } from '@crossmodel/protocol';
import { AutoComplete, AutoCompleteCompleteEvent, AutoCompleteDropdownClickEvent, AutoCompleteSelectEvent } from 'primereact/autocomplete';
import { DataTableRowEditEvent } from 'primereact/datatable';
import * as React from 'react';
import { useDiagnosticsManager, useEntity, useModelDispatch, useModelQueryApi, useReadonly } from '../../ModelContext';
import { ErrorView } from '../ErrorView';
import { handleGridEditorKeyDown, wasSaveTriggeredByEnter } from './gridKeydownHandler';
import { GridColumn, PrimeDataGrid } from './PrimeDataGrid';

export interface EntityInheritRow extends EntityInherit {
   idx: number;
   id: string;
   parentId: string;
   _uncommitted?: boolean;
}

interface EntityInheritEditorProps {
   options: {
      value: string;
      field: string;
      rowData: EntityInheritRow;
      editorCallback: (value: string) => void;
   };
}

function EntityInheritEditor(props: EntityInheritEditorProps): React.ReactElement {
   const { options } = props;
   const { editorCallback, rowData } = options;

   const initialValue = rowData?.parentId;
   const [currentValue, setCurrentValue] = React.useState(initialValue || '');
   const [suggestions, setSuggestions] = React.useState<string[]>([]);
   const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);
   const queryApi = useModelQueryApi();
   const entity = useEntity();
   const readonly = useReadonly();
   const diagnostics = useDiagnosticsManager();
   const basePath = ['entity', 'superEntities'];
   const fieldInfo = diagnostics.info(basePath, 'superEntities', rowData.idx);
   const error = fieldInfo.empty ? undefined : fieldInfo.text();
   const isDropdownClicked = React.useRef(false);
   // eslint-disable-next-line no-null/no-null
   const autoCompleteRef = React.useRef<AutoComplete>(null);

   const referenceCtx: CrossReferenceContext = React.useMemo(
      () => ({
         container: { globalId: entity?.$globalId || '' },
         syntheticElements: [{ property: 'superEntities', type: LogicalEntityType }],
         property: 'superEntities'
      }),
      [entity.$globalId]
   );

   const search = React.useCallback(
      async (event: AutoCompleteCompleteEvent) => {
         const elements = await queryApi.findReferenceableElements(referenceCtx);
         const filteredSuggestions = elements
            .map(element => element.label || '')
            .filter(label =>
               isDropdownClicked.current ? true : event.query ? label.toLowerCase().includes(event.query.toLowerCase()) : true
            );
         setSuggestions(filteredSuggestions);
         isDropdownClicked.current = false;
      },
      [queryApi, referenceCtx]
   );

   const onSelect = (e: AutoCompleteSelectEvent): void => {
      setCurrentValue(e.value);
      if (editorCallback) {
         editorCallback(e.value);
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
         <div className={`p-field ${error ? 'p-error' : ''}`}>
            <AutoComplete
               ref={autoCompleteRef}
               value={currentValue ?? ''}
               suggestions={suggestions}
               completeMethod={search}
               dropdown
               className={`w-full ${isDropdownOpen ? 'autocomplete-dropdown-open' : ''} ${error ? 'p-invalid' : ''}`}
               onDropdownClick={handleDropdownClick}
               onChange={e => setCurrentValue(e.value)}
               onSelect={onSelect}
               onShow={onShow}
               onHide={onHide}
               disabled={readonly}
               autoFocus
               onKeyDown={handleGridEditorKeyDown}
            />
            {error && <small className='p-error block'>{error}</small>}
         </div>
      </div>
   );
}

function EntityInheritProperty({
   rowData,
   editingRows
}: {
   rowData: EntityInheritRow;
   editingRows: Record<string, boolean>;
}): React.ReactNode {
   const diagnostics = useDiagnosticsManager();
   const basePath = ['entity', 'superEntities'];
   const info = diagnostics.info(basePath, 'superEntities', rowData.idx);
   const error = info.empty ? undefined : info.text();

   const showInvalid = Boolean(error && !editingRows[rowData.id]);

   return (
      <div className={`grid-cell-container ${showInvalid ? 'p-invalid' : ''}`} title={error || undefined}>
         <span>{rowData.parentId || ''}</span>
         {error && !editingRows[rowData.id] && <p className='p-error m-0'>{error}</p>}
      </div>
   );
}

export function EntityInheritsDataGrid(): React.ReactElement {
   const entity = useEntity();
   const dispatch = useModelDispatch();
   const readonly = useReadonly();
   const [editingRows, setEditingRows] = React.useState<Record<string, boolean>>({});
   const [gridData, setGridData] = React.useState<EntityInheritRow[]>([]);

   // Update grid data when dependencies change, preserving any uncommitted rows
   React.useEffect(() => {
      setGridData(current => {
         const committedData = (entity?.superEntities || []).map((dep: any, idx: number) => {
            // dep can be either a string Reference or an object with different shapes
            const parentId =
               typeof dep === 'string' ? dep : (dep?.parentId ?? dep?.$refText ?? (dep?.ref && (dep.ref.id || dep.ref.$globalId)) ?? '');
            return {
               $type: EntityInheritType,
               parentId,
               idx,
               id: `dep${idx}`
            } as EntityInheritRow;
         }) as EntityInheritRow[];

         // Preserve any uncommitted rows that are currently being edited
         const uncommittedRows = current.filter(row => row._uncommitted && editingRows[row.id]);

         return [...committedData, ...uncommittedRows];
      });
   }, [entity?.superEntities, editingRows]);

   const filterOptions = React.useMemo(() => {
      const uniqueInheritances = [...new Set(gridData.map(item => item.parentId).filter(Boolean))];
      return uniqueInheritances.map(lbl => ({ label: lbl, value: lbl }));
   }, [gridData]);

   const defaultEntry = React.useMemo<Partial<EntityInheritRow>>(
      () => ({
         $type: EntityInheritType,
         parentId: '',
         id: '' // Default id for new entries
      }),
      []
   );

   const onRowDelete = React.useCallback(
      (row: EntityInheritRow) => {
         dispatch({ type: 'entity:inherit:delete', inheritIdx: row.idx });
      },
      [dispatch]
   );

   const onRowUpdate = React.useCallback(
      (row: EntityInheritRow) => {
         if (row._uncommitted) {
            // For uncommitted rows, check if anything actually changed
            const hasChanges = row.parentId && row.parentId.trim() !== '';

            if (!hasChanges) {
               // Remove the row if no changes
               setGridData(current => current.filter(r => r.id !== row.id));
               setEditingRows({});
               return;
            }

            // Create the final inheritance without temporary fields
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { _uncommitted, id: tempId, idx, ...inheritanceData } = row;

            // Add the new inheritance through dispatch as a reference object for proper serialization
            dispatch({
               type: 'entity:inherit:add',
               inherit: { $refText: toIdReference(inheritanceData.parentId) }
            });

            if (wasSaveTriggeredByEnter()) {
               // Create a new uncommitted row with a unique temporary ID
               const tempRow: EntityInheritRow = {
                  ...defaultEntry,
                  id: `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`, // Ensure uniqueness
                  _uncommitted: true
               } as EntityInheritRow;

               setTimeout(() => {
                  // Add to grid data and set it to editing mode
                  setGridData(current => [...current, tempRow]);
                  setEditingRows({ [tempRow.id]: true });
               }, 50);
            }
         } else {
            // This is an existing row being updated
            if (!row.parentId || row.parentId.trim() === '') {
               // Invalid inheritance, delete the row
               onRowDelete(row);
               return;
            }

            dispatch({
               type: 'entity:inherit:update',
               inheritIdx: row.idx,
               inherit: { $refText: toIdReference(row.parentId) }
            });
         }

         // Clear editing state after successful update
         setEditingRows({});
      },
      [dispatch, onRowDelete, defaultEntry]
   );

   const onRowAdd = React.useCallback(() => {
      // Clear any existing edit states first
      setEditingRows({});

      // Create a new uncommitted row with a unique temporary ID
      const tempRow: EntityInheritRow = {
         ...defaultEntry,
         id: `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`, // Ensure uniqueness
         _uncommitted: true
      } as EntityInheritRow;

      // Add to grid data and set it to editing mode
      setGridData(current => [...current, tempRow]);
      setEditingRows({ [tempRow.id]: true });
   }, [defaultEntry]);

   const columns = React.useMemo<GridColumn<EntityInheritRow>[]>(
      () => [
         {
            field: 'parentId',
            header: 'Parent Entity',
            editor: (options: any) => <EntityInheritEditor options={options} />,
            body: (rowData: EntityInheritRow) => <EntityInheritProperty rowData={rowData} editingRows={editingRows} />,
            filterType: 'multiselect',
            filterOptions: filterOptions,
            showFilterMatchModes: false
         }
      ],
      [editingRows, filterOptions]
   );

   if (!entity) {
      return <ErrorView errorMessage='No entity available' />;
   }

   return (
      <PrimeDataGrid
         className='entity-inherits-datatable'
         columns={columns}
         data={gridData}
         keyField='id'
         height='auto'
         onRowAdd={onRowAdd}
         onRowUpdate={onRowUpdate}
         onRowDelete={onRowDelete}
         defaultNewRow={defaultEntry}
         readonly={readonly}
         noDataMessage='No parent entities'
         addButtonLabel='Add Parent Entity'
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
         globalFilterFields={['parentId']}
      />
   );
}
