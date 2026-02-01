/********************************************************************************
 * Copyright (c) 2025 CrossBreeze.
 ********************************************************************************/
import { CrossReferenceContext } from '@crossmodel/protocol';
import {
   AutoComplete,
   AutoCompleteCompleteEvent,
   AutoCompleteDropdownClickEvent,
   AutoCompleteSelectEvent
} from 'primereact/autocomplete';
import { Button } from 'primereact/button';
import { DataTableRowEditEvent } from 'primereact/datatable';
import { MultiSelect, MultiSelectChangeEvent } from 'primereact/multiselect';
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
} from '../ModelContext';
import {
   EditorContainer,
   EditorProperty,
   GenericAutoCompleteEditor,
   GenericCheckboxEditor,
   GenericNumberEditor,
   GenericTextEditor
} from '../views/common/GenericEditors';
import { GridColumn, PrimeDataGrid, handleGenericRowReorder } from '../views/common/PrimeDataGrid';
import { handleGridEditorKeyDown, handleUndoRedoKeys, wasSaveTriggeredByEnter } from '../views/common/gridKeydownHandler';
import { refocusPropertyWidget } from '../views/common/focusManagement';
import { RowDetailDialog } from './RowDetailDialog';
import { CollectionDescriptor, DynamicFormSchema, GridColumnDescriptor } from './schema';
import { getSchemaForType } from './schema-registry';

/** Internal row type used by DynamicDataGrid. */
interface DynamicRow extends Record<string, any> {
   idx: number;
   id: string;
   _uncommitted?: boolean;
}

export interface DynamicDataGridProps {
   collection: CollectionDescriptor;
   schema: DynamicFormSchema;
   rootObj: any;
}

// --- Reference Editor ---

interface DynamicReferenceEditorProps {
   options: {
      value: string;
      field: string;
      rowData: DynamicRow;
      editorCallback: (value: string) => void;
   };
   descriptor: GridColumnDescriptor;
   collection: CollectionDescriptor;
   schema: DynamicFormSchema;
   rootObj: any;
}

function DynamicReferenceEditor(props: DynamicReferenceEditorProps): React.ReactElement {
   const { options, descriptor, collection, schema, rootObj } = props;
   const { editorCallback, rowData } = options;
   const queryApi = useModelQueryApi();
   const readonly = useReadonly();
   const diagnostics = useDiagnosticsManager();
   const undo = useUndo();
   const redo = useRedo();
   const canUndo = useCanUndo();
   const canRedo = useCanRedo();

   const refConfig = descriptor.referenceConfig!;
   const basePath = [schema.diagnosticPath, collection.property];
   const fieldInfo = diagnostics.info(basePath, descriptor.property, rowData.idx);
   const error = fieldInfo.empty ? undefined : fieldInfo.text();

   const [currentValue, setCurrentValue] = React.useState(rowData[descriptor.property] || '');
   const [suggestions, setSuggestions] = React.useState<string[]>([]);
   const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);
   const isDropdownClicked = React.useRef(false);
   // eslint-disable-next-line no-null/no-null
   const autoCompleteRef = React.useRef<AutoComplete>(null);

   const referenceCtx: CrossReferenceContext = React.useMemo(
      () => ({
         container: { globalId: rootObj.$globalId ?? rootObj.id ?? '' },
         syntheticElements: [
            {
               property: refConfig.syntheticProperty ?? collection.property,
               type: refConfig.syntheticType
            }
         ],
         property: refConfig.referenceProperty ?? descriptor.property
      }),
      [rootObj.$globalId, rootObj.id, refConfig, collection.property, descriptor.property]
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
      setTimeout(() => {
         const panel = autoCompleteRef.current?.getOverlay();
         // eslint-disable-next-line no-null/no-null
         const isVisible = panel && panel.style.display !== 'none' && panel.offsetParent !== null;
         if (isVisible) {
            autoCompleteRef.current?.hide();
            setIsDropdownOpen(false);
         } else {
            autoCompleteRef.current?.search(event.originalEvent, '', 'dropdown');
            setIsDropdownOpen(true);
         }
      }, 10);
   };

   const onShow = (): void => setIsDropdownOpen(true);

   const onHide = (): void => {
      setIsDropdownOpen(false);
      refocusPropertyWidget();
   };

   React.useEffect(() => {
      const handleClickOutside = (event: MouseEvent): void => {
         if (autoCompleteRef.current && !autoCompleteRef.current.getElement()?.contains(event.target as Node)) {
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
      return () => document.removeEventListener('mouseup', handleClickOutside);
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
               onChange={e => {
                  setCurrentValue(e.value);
                  if (editorCallback) {
                     editorCallback(e.value);
                  }
               }}
               onSelect={onSelect}
               onShow={onShow}
               onHide={onHide}
               onKeyDown={e => {
                  handleGridEditorKeyDown(e);
                  handleUndoRedoKeys(e, canUndo, canRedo, undo, redo);
               }}
               disabled={readonly}
               autoFocus
            />
            {error && <small className='p-error block'>{error}</small>}
         </div>
      </div>
   );
}

// --- Reference Property (read-only display) ---

function DynamicReferenceProperty({
   rowData,
   descriptor,
   basePath,
   editingRows
}: {
   rowData: DynamicRow;
   descriptor: GridColumnDescriptor;
   basePath: string[];
   editingRows: Record<string, boolean>;
}): React.ReactNode {
   const diagnostics = useDiagnosticsManager();
   const info = diagnostics.info(basePath, descriptor.property, rowData.idx);
   const error = info.empty ? undefined : info.text();
   const showInvalid = Boolean(error && !editingRows[rowData.id]);

   return (
      <div className={`grid-cell-container ${showInvalid ? 'p-invalid' : ''}`} title={error || undefined}>
         <span>{rowData[descriptor.property] || ''}</span>
         {error && !editingRows[rowData.id] && <p className='p-error m-0'>{error}</p>}
      </div>
   );
}

// --- Row ID Derivation ---

function deriveRowId(item: Record<string, any>, idx: number, collectionProperty: string): string {
   return item.$globalId ?? item.id ?? `${collectionProperty}-${idx}`;
}

// --- Serialize row back to model item ---

function serializeRow(row: DynamicRow, columns: GridColumnDescriptor[]): Record<string, any> {
   // Strip only DynamicDataGrid-internal fields; keep `id` as it may be a real model property.
   // eslint-disable-next-line @typescript-eslint/no-unused-vars
   const { _uncommitted, idx: _idx, ...itemData } = row;

   for (const col of columns) {
      const value = itemData[col.property];

      // Apply per-column serialize hooks
      if (col.serialize && col.property in itemData) {
         itemData[col.property] = col.serialize(value, row);
         continue;
      }

      // Clear values for inapplicable dependent columns
      if (col.dependency) {
         const sourceValue = row[col.dependency.sourceProperty];
         if (!col.dependency.isApplicable(sourceValue)) {
            delete itemData[col.property];
            continue;
         }
      }

      // Omit empty/falsy optional values — only keep properties that have meaningful content.
      // Required columns are always kept.
      if (!col.required) {
         if (value === '' || value === false || value === undefined || (Array.isArray(value) && value.length === 0)) {
            delete itemData[col.property];
         }
      }
   }

   return itemData;
}

// --- Main Component ---

export function DynamicDataGrid({ collection, schema, rootObj }: DynamicDataGridProps): React.ReactElement {
   const dispatch = useModelDispatch();
   const readonly = useReadonly();
   const [editingRows, setEditingRows] = React.useState<Record<string, boolean>>({});
   const [gridData, setGridData] = React.useState<DynamicRow[]>([]);
   const [selectedRows, setSelectedRows] = React.useState<DynamicRow[]>([]);
   // eslint-disable-next-line no-null/no-null
   const [detailRow, setDetailRow] = React.useState<DynamicRow | null>(null);
   const pendingDeleteIdsRef = React.useRef<Set<string>>(new Set());
   const collectionDataRef = React.useRef<any[]>(rootObj[collection.property] || []);

   const columns = collection.columns ?? [];
   const basePath = React.useMemo(() => [schema.diagnosticPath, collection.property], [schema.diagnosticPath, collection.property]);

   // Build default entry from column descriptors
   const defaultEntry = React.useMemo<DynamicRow>(() => {
      const entry: Record<string, any> = { $type: collection.itemType };
      for (const col of columns) {
         switch (col.columnType) {
            case 'boolean':
               entry[col.property] = false;
               break;
            case 'number':
               entry[col.property] = undefined;
               break;
            case 'multiselect':
               entry[col.property] = [];
               break;
            default:
               entry[col.property] = '';
               break;
         }
      }
      return { ...entry, idx: -1, id: '' } as DynamicRow;
   }, [columns, collection.itemType]);

   // Deserialize a model item to a grid row
   const deserializeItem = React.useCallback(
      (item: any, idx: number): DynamicRow => {
         const id = deriveRowId(item, idx, collection.property);
         const row: DynamicRow = { ...item, idx, id };
         // Apply per-column deserialize hooks
         for (const col of columns) {
            if (col.deserialize) {
               row[col.property] = col.deserialize(item[col.property], item);
            }
         }
         return row;
      },
      [columns, collection.property]
   );

   // Sync model data → gridData
   React.useEffect(() => {
      collectionDataRef.current = rootObj[collection.property] || [];
      setGridData(current => {
         const committedData: DynamicRow[] = (rootObj[collection.property] || []).map((item: any, idx: number) =>
            deserializeItem(item, idx)
         );

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
   }, [rootObj[collection.property], editingRows, collection.property, deserializeItem]);

   const handleSelectionChange = React.useCallback((e: { value: DynamicRow[] }): void => {
      setSelectedRows(e.value);
   }, []);

   const handleRowAdd = React.useCallback((): void => {
      setEditingRows({});
      const tempRow: DynamicRow = {
         ...defaultEntry,
         id: `temp-${Date.now()}-${Math.random().toString(36).substring(2)}`,
         _uncommitted: true
      };
      setGridData(current => [...current, tempRow]);
      setEditingRows({ [tempRow.id]: true });
   }, [defaultEntry]);

   const handleRowUpdate = React.useCallback(
      (row: DynamicRow) => {
         if (row._uncommitted) {
            // Check if anything changed from defaults
            const hasChanges = columns.some(col => {
               const defaultVal = defaultEntry[col.property];
               const currentVal = row[col.property];
               if (Array.isArray(defaultVal) && Array.isArray(currentVal)) {
                  return currentVal.length !== defaultVal.length;
               }
               return currentVal !== defaultVal;
            });

            if (!hasChanges) {
               setGridData(current => current.filter(r => r.id !== row.id));
               setEditingRows({});
               return;
            }

            // Serialize row data with column hooks
            let itemData = serializeRow(row, columns);

            // For new rows, remove the temporary tracking ID before dispatching
            if (typeof itemData.id === 'string' && itemData.id.startsWith('temp-')) {
               delete itemData.id;
            }

            // Apply custom ID generation
            if (collection.idGenerator) {
               const newId = collection.idGenerator(row, rootObj);
               itemData.id = newId;
               itemData.$globalId = newId;
            }

            // Apply custom item builder
            if (collection.itemBuilder) {
               itemData = collection.itemBuilder(itemData, rootObj);
            }

            dispatch({
               type: 'dynamic:collection:add',
               rootKey: schema.rootKey as string,
               collectionProperty: collection.property,
               item: itemData
            });

            if (wasSaveTriggeredByEnter()) {
               const newTempRow: DynamicRow = {
                  ...defaultEntry,
                  id: `temp-${Date.now()}-${Math.random().toString(36).substring(2)}`,
                  _uncommitted: true
               };
               setTimeout(() => {
                  setGridData(current => [...current, newTempRow]);
                  setEditingRows({ [newTempRow.id]: true });
               }, 50);
            }
         } else {
            // Serialize row data with column hooks
            let itemData = serializeRow(row, columns);

            // Apply custom item builder for updates too
            if (collection.itemBuilder) {
               itemData = collection.itemBuilder(itemData, rootObj);
            }

            dispatch({
               type: 'dynamic:collection:update',
               rootKey: schema.rootKey as string,
               collectionProperty: collection.property,
               itemIdx: row.idx,
               item: itemData
            });
         }

         setEditingRows({});
      },
      [dispatch, defaultEntry, columns, schema.rootKey, collection, rootObj]
   );

   const handleRowDelete = React.useCallback(
      (row: DynamicRow) => {
         if (row.id && !row._uncommitted) {
            pendingDeleteIdsRef.current.add(row.id);
         }

         setGridData(current => current.filter(r => r.id !== row.id));
         setSelectedRows(current => current.filter(r => r.id !== row.id));

         if (row._uncommitted) {
            if (row.id) {
               pendingDeleteIdsRef.current.delete(row.id);
            }
            return;
         }

         const currentItems = rootObj[collection.property] || [];
         const itemIdx = currentItems.findIndex((item: any, idx: number) => deriveRowId(item, idx, collection.property) === row.id);
         if (itemIdx === -1) {
            if (row.id) {
               pendingDeleteIdsRef.current.delete(row.id);
            }
            return;
         }

         dispatch({
            type: 'dynamic:collection:delete',
            rootKey: schema.rootKey as string,
            collectionProperty: collection.property,
            itemIdx
         });
      },
      [dispatch, rootObj, schema.rootKey, collection.property]
   );

   const handleRowReorder = React.useCallback(
      (e: { rows: DynamicRow[] }): void => {
         handleGenericRowReorder(
            e,
            pendingDeleteIdsRef.current,
            collectionDataRef.current || [],
            (item: any, idx: number) => deriveRowId(item, idx, collection.property),
            reorderedItems => {
               dispatch({
                  type: 'dynamic:collection:reorder',
                  rootKey: schema.rootKey as string,
                  collectionProperty: collection.property,
                  items: reorderedItems
               });
            }
         );
      },
      [dispatch, schema.rootKey, collection.property]
   );

   // Build PrimeDataGrid columns from descriptors
   const gridColumns = React.useMemo<GridColumn<DynamicRow>[]>(
      () =>
         columns.map(descriptor => {
            const colHeaderStyle = descriptor.headerStyle ?? (descriptor.width ? { width: descriptor.width } : undefined);
            const col: GridColumn<DynamicRow> = {
               field: descriptor.property as keyof DynamicRow,
               header: descriptor.header,
               headerStyle: colHeaderStyle,
               style: descriptor.style,
               filterType: descriptor.filterType,
               showFilterMatchModes: descriptor.showFilterMatchModes,
               editor: createColumnEditor(descriptor, collection, schema, rootObj, gridData, setGridData),
               body: createColumnBody(descriptor, collection, basePath, editingRows, rootObj)
            };

            if (descriptor.dataType) {
               (col as any).dataType = descriptor.dataType;
            }

            // Static filter options from descriptor
            if (descriptor.filterOptions) {
               col.filterOptions = descriptor.filterOptions;
            } else if (descriptor.filterType === 'multiselect' && !descriptor.filterOptions) {
               // Build filter options for multiselect from current grid data
               const uniqueValues = [...new Set(gridData.map(item => item[descriptor.property]).filter(Boolean))];
               col.filterOptions = uniqueValues.map(v => ({ label: String(v), value: v }));
            }

            if (descriptor.filterType === 'multiselect' || descriptor.filterType === 'boolean') {
               col.showFilterMatchModes = descriptor.showFilterMatchModes ?? false;
            }

            return col;
         }),
      [columns, collection, schema, rootObj, basePath, editingRows, gridData]
   );

   const globalFilterFields = React.useMemo(() => columns.map(c => c.property), [columns]);

   // --- Detail Dialog ---

   const handleDetailSave = React.useCallback(
      (updatedRow: Record<string, any>) => {
         const row = updatedRow as DynamicRow;
         handleRowUpdate(row);
         // eslint-disable-next-line no-null/no-null
         setDetailRow(null);
      },
      [handleRowUpdate]
   );

   // Only show detail button when an item-level schema is registered for the collection's item type
   const hasItemSchema = React.useMemo(() => Boolean(collection.itemType && getSchemaForType(collection.itemType)), [collection.itemType]);

   const customActions = React.useCallback(
      (rowData: DynamicRow): React.ReactElement[] => [
         <Button
            key='detail'
            icon='pi pi-external-link'
            className='p-button-text p-row-action-button'
            onClick={() => setDetailRow(rowData)}
            tooltip='Open detail'
         />
      ],
      []
   );

   const handleRowEditChange = React.useCallback(
      (e: DataTableRowEditEvent) => {
         const newEditingRows = e.data as Record<string, boolean>;
         const newEditingId = Object.keys(newEditingRows)[0];
         const currentEditingId = editingRows ? Object.keys(editingRows)[0] : undefined;

         if (currentEditingId && !newEditingRows[currentEditingId]) {
            const currentRow = gridData.find(row => row.id === currentEditingId);
            if (currentRow?._uncommitted) {
               setGridData(current => current.filter(row => row.id !== currentEditingId));
            }
         }

         setEditingRows(newEditingRows);

         if (newEditingId) {
            setGridData(current => {
               const committedRows = current.filter(row => !row._uncommitted);
               const activeUncommittedRow = current.find(row => row._uncommitted && row.id === newEditingId);
               return activeUncommittedRow ? [...committedRows, activeUncommittedRow] : committedRows;
            });
         }
      },
      [editingRows, gridData]
   );

   return (
      <>
         <PrimeDataGrid
            columns={gridColumns}
            data={gridData}
            keyField='id'
            height='auto'
            onRowAdd={handleRowAdd}
            onRowUpdate={handleRowUpdate}
            onRowDelete={handleRowDelete}
            onRowReorder={handleRowReorder}
            selectedRows={selectedRows}
            onSelectionChange={handleSelectionChange}
            defaultNewRow={defaultEntry}
            readonly={readonly}
            noDataMessage={collection.noDataMessage ?? `No ${collection.label.toLowerCase()}`}
            addButtonLabel={collection.addButtonLabel ?? `Add ${collection.label}`}
            editingRows={editingRows}
            metaKeySelection={false}
            onRowEditChange={handleRowEditChange}
            globalFilterFields={globalFilterFields}
            resizableColumns={collection.resizableColumns}
            columnResizeMode={collection.columnResizeMode}
            customActions={hasItemSchema ? customActions : undefined}
         />
         <RowDetailDialog
            visible={detailRow !== null}
            // eslint-disable-next-line no-null/no-null
            onHide={() => setDetailRow(null)}
            row={detailRow ?? undefined}
            collection={collection}
            onSave={handleDetailSave}
         />
      </>
   );
}

// --- Column Factory Functions ---

function createColumnEditor(
   descriptor: GridColumnDescriptor,
   collection: CollectionDescriptor,
   schema: DynamicFormSchema,
   rootObj: any,
   gridData: DynamicRow[],
   setGridData: React.Dispatch<React.SetStateAction<DynamicRow[]>>
): (options: any) => React.ReactNode {
   const basePath = [schema.diagnosticPath, collection.property];

   switch (descriptor.columnType) {
      case 'text':
         return (options: any) => <GenericTextEditor options={options} basePath={basePath} field={descriptor.property} />;
      case 'number': {
         if (descriptor.dependency) {
            const dep = descriptor.dependency;
            return (options: any) => {
               const currentRow = gridData.find(r => r.id === options.rowData.id);
               const sourceValue = currentRow?.[dep.sourceProperty] ?? options.rowData?.[dep.sourceProperty];
               const isApplicable = dep.isApplicable(sourceValue);
               return (
                  <GenericNumberEditor
                     options={options}
                     basePath={basePath}
                     field={descriptor.property}
                     disabled={!isApplicable}
                     value={isApplicable ? options.value : undefined}
                     showButtons={isApplicable}
                     tooltip={!isApplicable ? dep.disabledTooltip : undefined}
                     forceClear={!isApplicable}
                  />
               );
            };
         }
         return (options: any) => <GenericNumberEditor options={options} basePath={basePath} field={descriptor.property} />;
      }
      case 'boolean':
         return (options: any) => <GenericCheckboxEditor options={options} basePath={basePath} field={descriptor.property} />;
      case 'dropdown': {
         // If this column has dependents, wrap the editor to clear dependent values on change
         const dependentColumns = (collection.columns ?? []).filter(
            col => col.dependency && col.dependency.sourceProperty === descriptor.property
         );

         if (dependentColumns.length > 0) {
            return (options: any) => (
               <GenericAutoCompleteEditor
                  options={{
                     ...options,
                     editorCallback: (value: any) => {
                        options.editorCallback(value);
                        // Clear dependent columns when source value changes
                        setGridData(current =>
                           current.map(row => {
                              if (row.id === options.rowData.id) {
                                 const updates: Record<string, any> = { [descriptor.property]: value };
                                 for (const depCol of dependentColumns) {
                                    if (!depCol.dependency!.isApplicable(value)) {
                                       updates[depCol.property] = undefined;
                                    }
                                 }
                                 return { ...row, ...updates };
                              }
                              return row;
                           })
                        );
                     }
                  }}
                  basePath={basePath}
                  field={descriptor.property}
                  dropdownOptions={descriptor.dropdownOptions ?? []}
               />
            );
         }

         return (options: any) => (
            <GenericAutoCompleteEditor
               options={options}
               basePath={basePath}
               field={descriptor.property}
               dropdownOptions={descriptor.dropdownOptions ?? []}
            />
         );
      }
      case 'reference':
         return (options: any) => (
            <DynamicReferenceEditor
               options={options}
               descriptor={descriptor}
               collection={collection}
               schema={schema}
               rootObj={rootObj}
            />
         );
      case 'multiselect':
         return (options: any) => (
            <DynamicMultiSelectEditor
               options={options}
               descriptor={descriptor}
               basePath={basePath}
               rootObj={rootObj}
            />
         );
   }
}

function createColumnBody(
   descriptor: GridColumnDescriptor,
   collection: CollectionDescriptor,
   basePath: string[],
   editingRows: Record<string, boolean>,
   rootObj: any
): (rowData: DynamicRow) => React.ReactNode {
   switch (descriptor.columnType) {
      case 'boolean':
         return (rowData: DynamicRow) => (
            <div className='flex align-items-center justify-content-center'>
               {rowData[descriptor.property] && <i className='pi pi-check' />}
            </div>
         );
      case 'reference':
         return (rowData: DynamicRow) => (
            <DynamicReferenceProperty rowData={rowData} descriptor={descriptor} basePath={basePath} editingRows={editingRows} />
         );
      case 'multiselect': {
         const config = descriptor.multiSelectConfig;
         return (rowData: DynamicRow) => {
            const selectedValues = rowData[descriptor.property] || [];
            const allOptions = config?.optionsProvider(rootObj) ?? [];
            let displayText: string;
            if (config?.displayFormatter) {
               displayText = config.displayFormatter(selectedValues, allOptions);
            } else {
               displayText = allOptions
                  .filter(opt => selectedValues.includes(opt.value))
                  .map(opt => opt.label)
                  .join(', ');
            }
            return (
               <EditorProperty
                  basePath={basePath}
                  field={descriptor.property}
                  row={rowData}
                  value={displayText}
               />
            );
         };
      }
      default: {
         // For columns with dependencies, dim the body when not applicable
         if (descriptor.dependency) {
            const dep = descriptor.dependency;
            return (rowData: DynamicRow) => {
               const isApplicable = dep.isApplicable(rowData[dep.sourceProperty]);
               return (
                  <div style={{ opacity: isApplicable ? 1 : 0.4 }}>
                     <EditorProperty
                        basePath={basePath}
                        field={descriptor.property}
                        row={rowData}
                        value={String(rowData[descriptor.property] ?? '')}
                     />
                  </div>
               );
            };
         }
         return (rowData: DynamicRow) => (
            <EditorProperty
               basePath={basePath}
               field={descriptor.property}
               row={rowData}
               value={String(rowData[descriptor.property] ?? '')}
            />
         );
      }
   }
}

// --- MultiSelect Editor ---

function DynamicMultiSelectEditor({
   options,
   descriptor,
   basePath,
   rootObj
}: {
   options: any;
   descriptor: GridColumnDescriptor;
   basePath: string[];
   rootObj: any;
}): React.ReactElement {
   const readonly = useReadonly();
   const config = descriptor.multiSelectConfig;
   const selectOptions = config?.optionsProvider(rootObj) ?? [];
   const rowIdx = options.rowData?.idx ?? -1;

   return (
      <EditorContainer basePath={basePath} field={descriptor.property} rowIdx={rowIdx}>
         {({ className }) => (
            <MultiSelect
               value={options.value}
               options={selectOptions}
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
}
