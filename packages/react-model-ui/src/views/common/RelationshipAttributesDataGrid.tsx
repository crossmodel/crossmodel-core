/********************************************************************************
 * Copyright (c) 2023 CrossBreeze.
 ********************************************************************************/
import { CrossReferenceContext, RelationshipAttribute, RelationshipAttributeType } from '@crossmodel/protocol';
import { AutoComplete, AutoCompleteCompleteEvent, AutoCompleteDropdownClickEvent, AutoCompleteSelectEvent } from 'primereact/autocomplete';
import { DataTableRowEditEvent } from 'primereact/datatable';
import * as React from 'react';
import { useDiagnosticsManager, useModelDispatch, useModelQueryApi, useReadonly, useRelationship } from '../../ModelContext';
import { ErrorView } from '../ErrorView';
import { GridColumn, PrimeDataGrid } from './PrimeDataGrid';
import { handleGridEditorKeyDown, wasSaveTriggeredByEnter } from './gridKeydownHandler';

export interface AttributePropertyProps {
   field: string;
   row: { idx: number };
   value: string;
}

export function AttributeProperty({ field, row, value }: AttributePropertyProps): React.ReactNode {
   const diagnostics = useDiagnosticsManager();
   const basePath = ['relationship', 'attributes'];
   const info = diagnostics.info(basePath, field, row.idx);
   const errorMessage = info.empty ? undefined : info.text();

   return (
      <div className={`grid-cell-container ${errorMessage ? 'p-invalid' : ''}`} title={errorMessage}>
         {value}
         {errorMessage && <p className='p-error block'>{errorMessage}</p>}
      </div>
   );
}

export interface RelationshipAttributeRow extends RelationshipAttribute {
   idx: number;
   id?: string;
   $rowKey: string;
   _uncommitted?: boolean;
}

interface RelationshipAttributeEditorProps {
   options: {
      value: string;
      editorCallback?: (value: string) => void;
      rowData: RelationshipAttributeRow;
   };
   isParent: boolean;
}

function RelationshipAttributeEditor(props: RelationshipAttributeEditorProps): React.ReactElement {
   const { options, isParent } = props;
   const { editorCallback } = options;
   const diagnostics = useDiagnosticsManager();
   const [errorMessage, setErrorMessage] = React.useState<string>('');
   const field = isParent ? 'parent' : 'child';

   React.useEffect(() => {
      // Check for field-level diagnostics
      const basePath = ['relationship', 'attributes'];
      const fieldInfo = diagnostics.info(basePath, field, options.rowData.idx);

      if (!fieldInfo.empty) {
         setErrorMessage(fieldInfo.text() || '');
      } else {
         setErrorMessage('');
      }
   }, [diagnostics, field, options.rowData.idx]);

   const [currentValue, setCurrentValue] = React.useState(options.value || '');
   const [suggestions, setSuggestions] = React.useState<string[]>([]);
   const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);
   const queryApi = useModelQueryApi();
   const relationship = useRelationship();
   const readonly = useReadonly();
   const isDropdownClicked = React.useRef(false);
   // eslint-disable-next-line no-null/no-null
   const autoCompleteRef = React.useRef<AutoComplete>(null);

   const referenceCtx: CrossReferenceContext = React.useMemo(
      () => ({
         container: { globalId: relationship?.id || '' },
         syntheticElements: [{ property: 'attributes', type: RelationshipAttributeType }],
         property: isParent ? 'parent' : 'child'
      }),
      [relationship, isParent]
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
         <div className={`p-field ${errorMessage ? 'p-error' : ''}`}>
            <AutoComplete
               ref={autoCompleteRef}
               value={currentValue ?? ''}
               suggestions={suggestions}
               completeMethod={search}
               dropdown
               className={`w-full ${isDropdownOpen ? 'autocomplete-dropdown-open' : ''} ${errorMessage ? 'p-invalid' : ''}`}
               onDropdownClick={handleDropdownClick}
               onChange={e => setCurrentValue(e.value)}
               onSelect={onSelect}
               onShow={onShow}
               onHide={onHide}
               disabled={readonly}
               autoFocus
               onKeyDown={handleGridEditorKeyDown}
            />
            {errorMessage && <small className='p-error block'>{errorMessage}</small>}
         </div>
      </div>
   );
}

export function RelationshipAttributesDataGrid(): React.ReactElement {
   const relationship = useRelationship();
   const dispatch = useModelDispatch();
   const readonly = useReadonly();
   // Diagnostics are read directly in cell components; no centralized validationErrors map required.
   const [editingRows, setEditingRows] = React.useState<Record<string, boolean>>({});
   const [gridData, setGridData] = React.useState<RelationshipAttributeRow[]>([]);
   const [selectedRows, setSelectedRows] = React.useState<RelationshipAttributeRow[]>([]);
   const pendingDeleteKeysRef = React.useRef<Set<string>>(new Set());

   const handleSelectionChange = React.useCallback((e: { value: RelationshipAttributeRow[] }): void => {
      setSelectedRows(e.value);
   }, []);

   // Update grid data when attributes change, preserving any uncommitted rows
   React.useEffect(() => {
      setGridData(current => {
         const committedData = (relationship.attributes || []).map((attr, idx) => {
            const persistedId = (attr as any).id as string | undefined;
            const globalId = (attr as any).$globalId as string | undefined;
            const rowKey = persistedId ?? globalId ?? `attr-${idx}`;
            return {
               ...attr,
               idx,
               id: persistedId,
               $rowKey: rowKey
            };
         }) as RelationshipAttributeRow[];

         const committedKeys = new Set(committedData.map(row => row.$rowKey));
         pendingDeleteKeysRef.current.forEach(key => {
            if (!committedKeys.has(key)) {
               pendingDeleteKeysRef.current.delete(key);
            }
         });

         const uncommittedRows = current.filter(row => row._uncommitted && editingRows[row.$rowKey]);

         return [...committedData, ...uncommittedRows];
      });
   }, [relationship.attributes, editingRows]);

   const parentOptions = React.useMemo(() => {
      const uniqueParents = [...new Set(gridData.map(item => item.parent).filter(Boolean))];
      return uniqueParents.map(p => ({ label: p, value: p }));
   }, [gridData]);

   const childOptions = React.useMemo(() => {
      const uniqueChildren = [...new Set(gridData.map(item => item.child).filter(Boolean))];
      return uniqueChildren.map(c => ({ label: c, value: c }));
   }, [gridData]);

   const defaultEntry = React.useMemo<RelationshipAttributeRow>(
      () => ({
         $type: RelationshipAttributeType,
         parent: '',
         child: '',
         idx: -1,
         id: undefined,
         $rowKey: ''
      }),
      []
   );

   const onRowUpdate = React.useCallback(
      (attribute: RelationshipAttributeRow) => {
         if (attribute._uncommitted) {
            // For uncommitted rows, check if anything actually changed
            const hasChanges = attribute.parent !== defaultEntry.parent || attribute.child !== defaultEntry.child;

            if (!hasChanges) {
               // Remove the row if no changes
               setGridData(current => current.filter(row => row.id !== attribute.id));
               setEditingRows({});
               return;
            }

            // Create the final attribute without temporary fields
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { _uncommitted, $rowKey: _rowKey, ...attributeData } = attribute;

            // Add the new attribute through dispatch
            dispatch({
               type: 'relationship:attribute:add',
               attribute: attributeData
            });

            if (wasSaveTriggeredByEnter()) {
               const tempKey = `temp-${Date.now()}-${Math.random().toString(36).substring(2)}`;
               const newTempRow: RelationshipAttributeRow = {
                  ...defaultEntry,
                  $rowKey: tempKey,
                  _uncommitted: true
               };

               setTimeout(() => {
                  setGridData(current => [...current, newTempRow]);
                  setEditingRows({ [tempKey]: true });
               }, 50);
            }
         } else {
            // This is an existing row being updated
            dispatch({
               type: 'relationship:attribute:update',
               attributeIdx: attribute.idx,
               attribute: attribute
            });
         }

         // Clear editing state after successful update
         setEditingRows({});
      },
      [dispatch, defaultEntry]
   );

   const onRowAdd = React.useCallback((): void => {
      // Clear any existing edit states first
      setEditingRows({});

      // Create a new uncommitted row with a unique temporary ID
      const tempRow: RelationshipAttributeRow = {
         ...defaultEntry,
         $rowKey: `temp-${Date.now()}-${Math.random().toString(36).substring(2)}`,
         _uncommitted: true
      };

      // Add to grid data and set it to editing mode
      setGridData(current => [...current, tempRow]);
      setEditingRows({ [tempRow.$rowKey]: true });
   }, [defaultEntry]);

   const onRowDelete = React.useCallback(
      (attribute: RelationshipAttributeRow) => {
         if (!attribute._uncommitted) {
            pendingDeleteKeysRef.current.add(attribute.$rowKey);

            setGridData(current => current.filter(row => row.$rowKey !== attribute.$rowKey));
            setSelectedRows(current => current.filter(row => row.$rowKey !== attribute.$rowKey));

            dispatch({
               type: 'relationship:attribute:delete-attribute',
               attributeIdx: attribute.idx
            });
         } else {
            setGridData(current => current.filter(row => row.$rowKey !== attribute.$rowKey));
            setSelectedRows(current => current.filter(row => row.$rowKey !== attribute.$rowKey));
         }
      },
      [dispatch]
   );

   const onRowMoveUp = React.useCallback(
      (attribute: RelationshipAttributeRow) => {
         dispatch({
            type: 'relationship:attribute:move-attribute-up',
            attributeIdx: attribute.idx
         });
      },
      [dispatch]
   );

   const handleRowReorder = React.useCallback(
      (e: { rows: RelationshipAttributeRow[] }): void => {
         const filteredRows = e.rows.filter(row => !pendingDeleteKeysRef.current.has(row.$rowKey));
         
         const attributeMap = new Map<string, RelationshipAttribute>(
            (relationship.attributes || []).map((attr, idx) => {
               const persistedId = (attr as any).id as string | undefined;
               const globalId = (attr as any).$globalId as string | undefined;
               const key = persistedId ?? globalId ?? `attr-${idx}`;
               return [key, attr];
            })
         );

         const reorderedAttributes: RelationshipAttribute[] = [];
         filteredRows.forEach(row => {
            if (row._uncommitted) {
               return;
            }
            const existing = attributeMap.get(row.$rowKey);
            if (existing) {
               reorderedAttributes.push(existing);
            }
         });

         if (reorderedAttributes.length !== (relationship.attributes || []).length) {
            return;
         }

         dispatch({
            type: 'relationship:attribute:reorder-attributes',
            attributes: reorderedAttributes
         });
      },
      [dispatch, relationship.attributes]
   );

   const onRowMoveDown = React.useCallback(
      (attribute: RelationshipAttributeRow) => {
         dispatch({
            type: 'relationship:attribute:move-attribute-down',
            attributeIdx: attribute.idx
         });
      },
      [dispatch]
   );

   const columns = React.useMemo<GridColumn<RelationshipAttributeRow>[]>(
      () => [
         {
            field: 'parent',
            header: 'Parent',
            headerStyle: { width: '40%' },
            editor: (options: any) => (
               <div className='grid-editor-wrapper'>
                  <RelationshipAttributeEditor options={options} isParent={true} />
               </div>
            ),
            filterType: 'multiselect',
            filterOptions: parentOptions,
            showFilterMatchModes: false,
            body: (rowData: RelationshipAttributeRow) => (
               <div className='grid-cell-wrapper'>
                  <AttributeProperty field='parent' row={rowData} value={rowData.parent || ''} />
               </div>
            )
         },
         {
            field: 'child',
            header: 'Child',
            editor: (options: any) => (
               <div className='grid-editor-wrapper'>
                  <RelationshipAttributeEditor options={options} isParent={false} />
               </div>
            ),
            filterType: 'multiselect',
            filterOptions: childOptions,
            showFilterMatchModes: false,
            body: (rowData: RelationshipAttributeRow) => (
               <div className='grid-cell-wrapper'>
                  <AttributeProperty field='child' row={rowData} value={rowData.child || ''} />
               </div>
            )
         }
      ],
      [parentOptions, childOptions]
   );

   if (!relationship) {
      return <ErrorView errorMessage='No relationship available' />;
   }

   return (
      <PrimeDataGrid
         className='relationship-attributes-datatable'
         columns={columns}
         data={gridData}
         keyField='$rowKey'
         height='auto'
         onRowAdd={onRowAdd}
         onRowUpdate={onRowUpdate}
         onRowDelete={onRowDelete}
         onRowMoveUp={onRowMoveUp}
         onRowMoveDown={onRowMoveDown}
         onRowReorder={handleRowReorder}
         selectedRows={selectedRows}
         onSelectionChange={handleSelectionChange}
         defaultNewRow={defaultEntry}
         readonly={readonly}
         noDataMessage='No attributes'
         addButtonLabel='Add Attribute'
         editingRows={editingRows}
         onRowEditChange={(e: DataTableRowEditEvent) => {
            const newEditingRows = e.data as Record<string, boolean>;
            const newEditingId = Object.keys(newEditingRows)[0];
            const currentEditingId = editingRows ? Object.keys(editingRows)[0] : undefined;

            // If we're stopping editing a row (either by cancelling or completing)
            if (currentEditingId && !newEditingRows[currentEditingId]) {
               const currentRow = gridData.find(row => row.$rowKey === currentEditingId);

               // Always remove uncommitted rows when editing stops
               if (currentRow?._uncommitted) {
                  setGridData(current => current.filter(row => row.$rowKey !== currentEditingId));
               }
            }

            // Update editing state
            setEditingRows(newEditingRows);

            // Clean up any stale uncommitted rows
            setGridData(current => {
               // Keep all committed rows
               const committedRows = current.filter(row => !row._uncommitted);

               // For uncommitted rows, only keep the one being edited (if any)
               const activeUncommittedRow = newEditingId ? current.find(row => row._uncommitted && row.$rowKey === newEditingId) : undefined;

               return activeUncommittedRow ? [...committedRows, activeUncommittedRow] : committedRows;
            });
         }}
         globalFilterFields={['parent', 'child']}
      />
   );
}
