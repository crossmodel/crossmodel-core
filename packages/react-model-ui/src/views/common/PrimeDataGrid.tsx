/********************************************************************************
 * Copyright (c) 2025 CrossBreeze.
 ********************************************************************************/
import { FilterMatchMode } from 'primereact/api';
import { Button } from 'primereact/button';
import { Column } from 'primereact/column';
import {
   DataTable,
   DataTableFilterEvent,
   DataTableFilterMeta,
   DataTableFilterMetaData,
   DataTableRowClickEvent,
   DataTableRowEditCompleteEvent,
   DataTableRowEditEvent
} from 'primereact/datatable';
import { Dropdown } from 'primereact/dropdown';
import { IconField } from 'primereact/iconfield';
import { InputIcon } from 'primereact/inputicon';
import { InputText } from 'primereact/inputtext';
import { MultiSelect } from 'primereact/multiselect';
import { TriStateCheckbox } from 'primereact/tristatecheckbox';
import * as React from 'react';

export interface GridColumn<T> {
   field: keyof T;
   header: string;
   editor?: boolean | ((options: any) => React.ReactNode);
   sortable?: boolean;
   body?: (rowData: T) => React.ReactNode;
   headerStyle?: React.CSSProperties;
   style?: React.CSSProperties;
   filter?: boolean;
   filterField?: string;
   filterType?: 'text' | 'dropdown' | 'multiselect' | 'boolean';
   filterOptions?: any[];
   showFilterMatchModes?: boolean;
}

export interface PrimeDataGridProps<T> {
   columns: GridColumn<T>[];
   data: T[];
   keyField?: keyof T;
   height?: string;
   onRowAdd?: (newData: T) => void;
   onRowUpdate?: (newData: T) => void;
   onRowDelete?: (rowData: T) => void;
   onRowReorder?: (e: { rows: T[] }) => void;
   selectedRows?: T[];
   onSelectionChange?: (e: { value: T[] }) => void;
   addButtonLabel?: string;
   noDataMessage?: string;
   defaultNewRow?: Partial<T>;
   editable?: boolean;
   readonly?: boolean;
   className?: string;
   editingRows?: Record<string, boolean>;
   onRowEditChange?: (e: DataTableRowEditEvent) => void;
   globalFilterFields?: string[];
   metaKeySelection?: boolean;
}

function useFilters<T>(columns: GridColumn<T>[]): {
   filters: DataTableFilterMeta;
   setFilters: React.Dispatch<React.SetStateAction<DataTableFilterMeta>>;
   clearFilters: () => void;
   onGlobalFilterChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
   filterTemplate: (options: any, filterType?: 'text' | 'dropdown' | 'multiselect' | 'boolean', filterOptions?: any[]) => React.JSX.Element;
      renderHeader: (
      addButtonLabel: string,
      onRowAdd?: () => void,
      onRowDelete?: () => void,
      selectedRowsCount?: number,
      readonly?: boolean
   ) => React.JSX.Element;
} {
   const initFilters = (): DataTableFilterMeta => {
      const initialFilters: DataTableFilterMeta = {
         // eslint-disable-next-line no-null/no-null
         global: { value: null, matchMode: FilterMatchMode.CONTAINS }
      };
      columns.forEach(col => {
         let matchMode = FilterMatchMode.CONTAINS;
         if (col.filterType === 'dropdown' || col.filterType === 'boolean') {
            matchMode = FilterMatchMode.EQUALS;
         } else if (col.filterType === 'multiselect') {
            matchMode = FilterMatchMode.IN;
         }
         const filterKey = col.filterField || (col.field as string);
         initialFilters[filterKey] = {
            // eslint-disable-next-line no-null/no-null
            value: null,
            matchMode
         };
      });
      return initialFilters;
   };

   const [filters, setFilters] = React.useState<DataTableFilterMeta>(initFilters());

   const clearFilters = (): void => {
      setFilters(initFilters());
   };

   const onGlobalFilterChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
      const value = e.target.value;
      const _filters = { ...filters };
      (_filters['global'] as DataTableFilterMetaData).value = value;
      setFilters(_filters);
   };

   const filterTemplate = (
      options: any,
      filterType?: 'text' | 'dropdown' | 'multiselect' | 'boolean',
      filterOptions?: any[]
   ): React.JSX.Element => {
      if (filterType === 'dropdown') {
         return (
            <Dropdown
               value={options.value}
               options={filterOptions}
               onChange={e => options.filterCallback(e.value, options.index)}
               itemTemplate={option => <span>{option}</span>}
               placeholder='Select a value'
               className='p-column-filter'
               showClear
            />
         );
      }
      if (filterType === 'multiselect') {
         return (
            <MultiSelect
               value={options.value}
               options={filterOptions}
               onChange={e => options.filterCallback(e.value)}
               placeholder='Any'
               className='p-column-filter'
               maxSelectedLabels={1}
               showClear
            />
         );
      }
      if (filterType === 'boolean') {
         return (
            <div className='flex align-items-center justify-content-center'>
               <TriStateCheckbox value={options.value} onChange={e => options.filterCallback(e.value)} />
            </div>
         );
      }
      return (
         <InputText
            value={options.value || ''}
            onChange={e => options.filterCallback(e.target.value)}
            placeholder={`Search by ${options.field}`}
            className='p-column-filter'
         />
      );
   };

   const renderHeader = (
      addButtonLabel: string,
      onRowAdd?: () => void,
      onRowDelete?: () => void,
      selectedRowsCount?: number,
      readonly?: boolean
   ): React.JSX.Element => (
      <div className='datatable-global-filter'>
         <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            {onRowAdd && <Button label={addButtonLabel} icon='pi pi-plus' severity='info' onClick={onRowAdd} disabled={readonly} />}
            {onRowDelete && (
               <Button
                  label={`Delete ${addButtonLabel.replace('Add ', '')}${selectedRowsCount && selectedRowsCount > 1 ? 's' : ''}`}
                  icon='pi pi-trash'
                  severity='danger'
                  onClick={onRowDelete}
                  disabled={readonly || !selectedRowsCount || selectedRowsCount === 0}
                  style={{ backgroundColor: '#fbbf24', borderColor: '#fbbf24' }}
               />
            )}
         </div>
         <div className='datatable-filter-section'>
            <div className='keyword-search-container'>
               <IconField iconPosition='left'>
                  <InputIcon className='pi pi-search' />
                  <InputText
                     value={(filters['global'] as DataTableFilterMetaData)?.value || ''}
                     onChange={onGlobalFilterChange}
                     placeholder='Keyword Search'
                  />
               </IconField>
               {(filters['global'] as DataTableFilterMetaData)?.value && (
                  <i
                     className='pi pi-times'
                     onClick={() => {
                        const _filters = { ...filters };
                        (_filters['global'] as DataTableFilterMetaData).value = '';
                        setFilters(_filters);
                     }}
                  />
               )}
            </div>
            <Button
               type='button'
               icon='pi pi-filter-slash'
               label='Clear Filters'
               outlined
               onClick={clearFilters}
               style={{ marginLeft: '0.5rem' }}
            />
         </div>
      </div>
   );

   return { filters, setFilters, clearFilters, onGlobalFilterChange, filterTemplate, renderHeader };
}

function useDragDrop<T extends Record<string, any>>(
   data: T[],
   keyField: keyof T,
   onRowReorder?: (e: { rows: T[] }) => void,
   tableRef?: React.RefObject<any>
): { dragHandleTemplate: (rowData: T) => React.JSX.Element } {
   const dragImageRef = React.useRef<HTMLElement | undefined>(undefined);
   const currentDragOverRowKeyRef = React.useRef<string | number | undefined>(undefined);
   const currentDropPositionRef = React.useRef<'above' | 'below' | undefined>(undefined);

   const handleMouseDown = React.useCallback(
      (e: React.MouseEvent, rowData: T): void => {
         const target = e.target as HTMLElement;
         if (!target.closest('.drag-handle')) {
            return;
         }

         e.preventDefault();
         e.stopPropagation();

         const rowKey = rowData[keyField];
         if (rowKey === undefined) {
            return;
         }

         currentDragOverRowKeyRef.current = undefined;
         currentDropPositionRef.current = undefined;

         const tableElement = tableRef?.current?.getElement();
         if (!tableElement) {
            return;
         }

         const rowElement = target.closest('tr');
         if (!rowElement) {
            return;
         }

         const dragImage = rowElement.cloneNode(true) as HTMLElement;
         dragImage.style.position = 'absolute';
         dragImage.style.top = '-1000px';
         dragImage.style.opacity = '0.8';
         dragImage.style.pointerEvents = 'none';
         document.body.appendChild(dragImage);
         dragImageRef.current = dragImage;

         const handleMouseMove = (moveEvent: MouseEvent): void => {
            requestAnimationFrame(() => {
               if (!tableElement) {
                  return;
               }

               const allRows = Array.from(tableElement.querySelectorAll('tbody tr')) as HTMLElement[];
               let closestRow: HTMLElement | undefined;
               let minDistance = Infinity;
               const buffer = 10;

               for (const row of allRows) {
                  const rect = row.getBoundingClientRect();
                  const rowCenterY = rect.top + rect.height / 2;
                  const distance = Math.abs(moveEvent.clientY - rowCenterY);

                  if (
                     moveEvent.clientY >= rect.top - buffer &&
                     moveEvent.clientY <= rect.bottom + buffer &&
                     distance < minDistance
                  ) {
                     minDistance = distance;
                     closestRow = row;
                  }
               }

               if (closestRow) {
                  let foundRowKey: string | number | undefined;
                  const rowIndex = allRows.indexOf(closestRow);
                  if (rowIndex >= 0 && rowIndex < data.length) {
                     foundRowKey = data[rowIndex][keyField];
                  }

                  if (foundRowKey !== undefined && foundRowKey !== rowKey) {
                     const rect = closestRow.getBoundingClientRect();
                     const rowCenterY = rect.top + rect.height / 2;
                     const position = moveEvent.clientY < rowCenterY ? 'above' : 'below';

                     if (currentDragOverRowKeyRef.current !== foundRowKey || currentDropPositionRef.current !== position) {
                        currentDragOverRowKeyRef.current = foundRowKey;
                        currentDropPositionRef.current = position;

                        // Remove previous indicators
                        allRows.forEach(r => {
                           r.classList.remove('drag-over-above', 'drag-over-below');
                        });

                        // Add indicator
                        closestRow.classList.add(`drag-over-${position}`);
                     }
                  }
               } else {
                  if (currentDragOverRowKeyRef.current !== undefined) {
                     currentDragOverRowKeyRef.current = undefined;
                     currentDropPositionRef.current = undefined;
                     allRows.forEach(r => {
                        r.classList.remove('drag-over-above', 'drag-over-below');
                     });
                  }
               }
            });
         };

         const handleMouseUp = (upEvent: MouseEvent): void => {
            upEvent.preventDefault();
            upEvent.stopPropagation();

            // Clean up drag image
            if (dragImageRef.current) {
               document.body.removeChild(dragImageRef.current);
               dragImageRef.current = undefined;
            }

            const dragTableElement = tableRef?.current?.getElement();
            if (dragTableElement) {
               const allRows = Array.from(dragTableElement.querySelectorAll('tbody tr')) as HTMLElement[];
               allRows.forEach(r => {
                  r.classList.remove('drag-over-above', 'drag-over-below');
               });
            }

            if (currentDragOverRowKeyRef.current !== undefined && currentDropPositionRef.current && onRowReorder !== undefined) {
               const sourceIndex = data.findIndex(row => row[keyField] === rowKey);
               const targetIndex = data.findIndex(row => row[keyField] === currentDragOverRowKeyRef.current);

               if (sourceIndex !== -1 && targetIndex !== -1 && sourceIndex !== targetIndex) {
                  const newData = [...data];
                  const [removed] = newData.splice(sourceIndex, 1);

                  let insertIndex = targetIndex;
                  if (currentDropPositionRef.current === 'below' && sourceIndex < targetIndex) {
                     insertIndex = targetIndex;
                  } else if (currentDropPositionRef.current === 'below' && sourceIndex > targetIndex) {
                     insertIndex = targetIndex + 1;
                  } else if (currentDropPositionRef.current === 'above' && sourceIndex > targetIndex) {
                     insertIndex = targetIndex;
                  } else if (currentDropPositionRef.current === 'above' && sourceIndex < targetIndex) {
                     insertIndex = targetIndex - 1;
                  }

                  newData.splice(insertIndex, 0, removed);
                  onRowReorder({ rows: newData });
               }
            }

            currentDragOverRowKeyRef.current = undefined;
            currentDropPositionRef.current = undefined;

            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
         };

         document.addEventListener('mousemove', handleMouseMove);
         document.addEventListener('mouseup', handleMouseUp);
      },
      [data, keyField, onRowReorder, tableRef]
   );

   const dragHandleTemplate = React.useCallback(
      (rowData: T): React.JSX.Element => {
         if (!onRowReorder) {
            return <></>;
         }
         return (
            <div
               className='drag-handle'
               onMouseDown={e => handleMouseDown(e, rowData)}
               style={{ cursor: 'grab', padding: '0.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
               <i className='pi pi-bars' style={{ fontSize: '0.875rem', color: '#6c757d' }} />
            </div>
         );
      },
      [onRowReorder, handleMouseDown]
   );

   return { dragHandleTemplate };
}

function renderActionsColumn<T>(
   rowData: T,
   props: any,
   editable: boolean,
   readonly: boolean,
   onRowDelete?: (row: T) => void
): React.JSX.Element {
   const isEditing = editable && !readonly && props.rowEditor && props.rowEditor.editing; // eslint-disable-line react/prop-types
   const buttons: React.ReactElement[] = [];

   if (isEditing && !readonly) {
      buttons.push(
         <Button
            icon='pi pi-check'
            className='p-button-text p-button-success p-row-action-button p-row-editor-save'
            onClick={props.rowEditor?.onSaveClick} // eslint-disable-line react/prop-types
            tooltip='Save'
            disabled={readonly}
         />
      );
      buttons.push(
         <Button
            icon='pi pi-times'
            className='p-button-text p-button-danger p-row-action-button p-row-editor-cancel'
            onClick={props.rowEditor?.onCancelClick} // eslint-disable-line react/prop-types
            tooltip='Cancel'
            disabled={readonly}
         />
      );
      if (onRowDelete) {
         buttons.push(
            <Button
               icon='pi pi-trash'
               className='p-button-text p-button-danger p-row-action-button'
               onClick={() => onRowDelete(rowData)}
               tooltip='Delete'
               disabled={readonly}
            />
         );
      }
   } else {
      if (editable) {
         buttons.push(
            <Button
               icon='pi pi-pencil'
               className='p-button-text p-row-action-button'
               onClick={props.rowEditor?.onInitClick} // eslint-disable-line react/prop-types
               tooltip='Edit'
               disabled={readonly}
            />
         );
      }
      if (onRowDelete) {
         buttons.push(
            <Button
               icon='pi pi-trash'
               className='p-button-text p-button-danger p-row-action-button'
               onClick={() => onRowDelete(rowData)}
               tooltip='Delete'
               disabled={readonly}
            />
         );
      }
   }

   return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start' }}>
         {buttons.map((button, index) =>
            React.cloneElement(button, {
               key: button.key || index,
               style: {
                  ...button.props.style,
                  ...(index < buttons.length - 1 ? { marginRight: '0.5rem' } : {})
               }
            })
         )}
      </div>
   );
}

export function PrimeDataGrid<T extends Record<string, any>>({
   columns,
   data,
   keyField = 'id',
   height = '400px',
   onRowAdd,
   onRowUpdate,
   onRowDelete,
   onRowReorder,
   selectedRows,
   onSelectionChange,
   addButtonLabel = 'Add',
   noDataMessage = 'No records found',
   defaultNewRow = {},
   editable = true,
   readonly = false,
   className,
   editingRows,
   onRowEditChange,
   globalFilterFields,
   metaKeySelection = true
}: PrimeDataGridProps<T>): React.ReactElement {
   // eslint-disable-next-line no-null/no-null
   const tableRef = React.useRef<DataTable<T[]>>(null);
   // eslint-disable-next-line no-null/no-null
   const lastInteractedCellRef = React.useRef<HTMLElement | null>(null);
   // eslint-disable-next-line no-null/no-null
   const activeRowKey = editingRows ? Object.keys(editingRows)[0] : null;

   const { filters, setFilters, filterTemplate, renderHeader: renderFilterHeader } = useFilters(columns);
   const { dragHandleTemplate } = useDragDrop(data, keyField, onRowReorder, tableRef);

   const handleAddRow = React.useCallback(() => {
      if (onRowAdd) {
         const addNewRow = (): void => {
            const newRow = { ...defaultNewRow };
            columns.forEach(col => {
               if (!(col.field in newRow)) {
                  (newRow as any)[col.field] = '';
               }
            });
            onRowAdd(newRow as T);
         };

         // Save any active edits in this grid
         const tableElement = tableRef.current?.getElement();
         let currentGridSaveButton: Element | undefined = undefined;
         if (tableElement && activeRowKey) {
            const saveButton = tableElement.querySelector('.p-row-editor-save');
            if (saveButton instanceof HTMLElement) {
               saveButton.click();
               currentGridSaveButton = saveButton;
            }
         }

         // Save any active edits in other grids
         document.querySelectorAll('.p-row-editor-save').forEach(button => {
            if (button instanceof HTMLElement && button !== currentGridSaveButton) {
               button.click();
            }
         });

         // Add new row immediately after saves are triggered
         requestAnimationFrame(() => {
            addNewRow();
         });
      }
   }, [onRowAdd, defaultNewRow, columns, activeRowKey]);

   const handleMultiDelete = React.useCallback((): void => {
      if (selectedRows && selectedRows.length > 0 && onRowDelete) {
         // Sort by idx descending to delete from bottom to top (avoids index shifting issues)
         const sortedRows = [...selectedRows].sort((a, b) => {
            const aIdx = (a as any).idx ?? -1;
            const bIdx = (b as any).idx ?? -1;
            return bIdx - aIdx;
         });

         // Dispatch all delete actions first (before any grid data filtering)
         sortedRows.forEach(row => {
            onRowDelete(row);
         });

         // Clear selection after all deletes are dispatched
         if (onSelectionChange) {
            onSelectionChange({ value: [] });
         }
      }
   }, [selectedRows, onRowDelete, onSelectionChange]);

   const header = renderFilterHeader(
      addButtonLabel,
      handleAddRow,
      handleMultiDelete,
      selectedRows?.length,
      readonly
   );

   React.useEffect(() => {
      if (!tableRef.current || !editingRows || Object.keys(editingRows).length === 0) {
         // eslint-disable-next-line no-null/no-null
         lastInteractedCellRef.current = null;
         return;
      }

      const editingRowKey = Object.keys(editingRows)[0];
      const editingRowIndex = data.findIndex(row => row[keyField] === editingRowKey);
      if (editingRowIndex === -1) {
         // eslint-disable-next-line no-null/no-null
         lastInteractedCellRef.current = null;
         return;
      }

      const timer = window.setTimeout(() => {
         const tableElement = tableRef.current?.getElement();
         if (!tableElement) {
            return;
         }

         const editingCell = lastInteractedCellRef.current ?? (tableElement.querySelector('.p-cell-editing') as HTMLElement | null);

         if (editingCell) {
            const focusTarget = editingCell.querySelector<HTMLElement>(
               'input, textarea, select, .p-dropdown, .p-multiselect, .p-autocomplete-input'
            );

            if (focusTarget) {
               focusTarget.focus();
               if (focusTarget instanceof HTMLInputElement || focusTarget instanceof HTMLTextAreaElement) {
                  focusTarget.select?.();
               }
            }
         }

         // eslint-disable-next-line no-null/no-null
         lastInteractedCellRef.current = null;
      }, 100);

      return () => window.clearTimeout(timer);
   }, [editingRows, data, keyField]);

   const onRowEditComplete = (e: DataTableRowEditCompleteEvent): void => {
      if (onRowUpdate) {
         // don't mutate e.newData directly
         // spread into a new object
         const updated = { ...e.newData } as T;
         onRowUpdate(updated);
      }
   };

   const handleRowDoubleClick = (e: DataTableRowClickEvent): void => {
      const target = e.originalEvent.target as HTMLElement;

      if (target.closest('button, a, input, select, textarea')) {
         return;
      }

      const cellElement = target.closest('td');
      // eslint-disable-next-line no-null/no-null
      lastInteractedCellRef.current = cellElement instanceof HTMLElement ? cellElement : null;

      if (editable && !readonly && onRowEditChange) {
         const rowData = e.data as T;
         const rowKey = rowData[keyField];

         if (rowKey !== undefined) {
            const tableElement = tableRef.current?.getElement();

            // If some other row is in edit mode -> save it first
            if (activeRowKey && activeRowKey !== rowKey) {
               const rowEditorSaveButton = tableElement?.querySelector('.p-row-editor-save');
               if (rowEditorSaveButton instanceof HTMLElement) {
                  rowEditorSaveButton.click();
               }
            }

            // Then start editing the clicked row
            const newEditingRows = { [rowKey]: true };
            onRowEditChange({
               originalEvent: e.originalEvent,
               data: newEditingRows,
               index: e.index
            });
         }
      }
   };

   const handleRowClick = (e: DataTableRowClickEvent): void => {
      if (!activeRowKey) {
         return; // nothing is being edited
      }

      const target = e.originalEvent.target as HTMLElement;

      // Ignore clicks inside editors/controls
      if (target.closest('button, a, input, select, textarea')) {
         return;
      }

      if (editable && !readonly) {
         const rowData = e.data as T;
         const rowKey = rowData[keyField];

         // If click is on *another* row while editing → just save & exit
         if (rowKey !== undefined && rowKey !== activeRowKey) {
            const tableElement = tableRef.current?.getElement();
            const rowEditorSaveButton = tableElement?.querySelector('.p-row-editor-save');
            if (rowEditorSaveButton instanceof HTMLElement) {
               rowEditorSaveButton.click();
            }
         }
      }
   };

   React.useEffect(() => {
      if (!activeRowKey) {
         return;
      }

      const handleClickOutside = (event: MouseEvent): void => {
         const tableElement = tableRef.current?.getElement();
         if (!tableElement) {
            return;
         }

         const target = event.target as HTMLElement;

         const isInsideTable = tableElement.contains(target);

         // allow clicks inside PrimeReact overlay panels
         const isInsideOverlay = target.closest(
            '.p-dropdown-panel, .p-multiselect-panel, .p-autocomplete-panel, .p-datepicker, .p-dialog, .p-overlaypanel'
         );

         if (isInsideOverlay) {
            return; // selecting from overlay shouldn't exit edit mode
         }

         const isButton = target.tagName === 'BUTTON' || target.closest('button');
         if (isButton) {
            const editingRow = tableElement.querySelector('tr.p-row-editing');
            const isInEditingRow = editingRow && editingRow.contains(target);
            const isEditorButton = target.closest(
               '.p-autocomplete, .p-dropdown, .p-multiselect, .p-datepicker, .p-cell-editing, .p-datatable-add-button'
            );
            if (isInEditingRow || isEditorButton) {
               return;
            }
            // Button clicked outside editing row - save first
            const rowEditorSaveButton = tableElement.querySelector('.p-row-editor-save');
            if (rowEditorSaveButton instanceof HTMLElement) {
               // Trigger save immediately
               rowEditorSaveButton.click();
            }
            return;
         }

         if (!isInsideTable) {
            // Outside table → save & exit
            const rowEditorSaveButton = tableElement.querySelector('.p-row-editor-save');
            if (rowEditorSaveButton instanceof HTMLElement) {
               rowEditorSaveButton.click();
            }
         }
      };

      const handleFocusOut = (event: FocusEvent): void => {
         const tableElement = tableRef.current?.getElement();
         if (!tableElement) {
            return;
         }

         const relatedTarget = event.relatedTarget as HTMLElement;
         if (!relatedTarget) {
            return; // Exit if there's no related target
         }

         // Check if we're in Properties View context
         const propertyView = tableElement.closest('#model-property-view');
         if (propertyView) {
            // Check if the focus is still within the Properties View or its overlays
            const isStillInPropertyView = propertyView.contains(relatedTarget);
            const isInOverlayPanel = relatedTarget.closest(
               '.p-dropdown-panel, .p-multiselect-panel, .p-autocomplete-panel, .p-datepicker, ' +
                  '.p-dialog, .p-overlaypanel, .p-datatable-add-button'
            );

            // Only save if we're leaving the Properties View completely
            if (!isStillInPropertyView && !isInOverlayPanel) {
               const rowEditorSaveButton = tableElement.querySelector('.p-row-editor-save');
               if (rowEditorSaveButton instanceof HTMLElement) {
                  rowEditorSaveButton.click();
               }
            }
            return;
         }

         // Regular form editor handling
         const isInsideTable = tableElement.contains(relatedTarget);
         const isInsideOverlay = relatedTarget.closest(
            '.p-dropdown-panel, .p-multiselect-panel, .p-autocomplete-panel, .p-datepicker, ' +
               '.p-dialog, .p-overlaypanel, .p-datatable-add-button'
         );

         if (isInsideOverlay) {
            return; // focusing into overlay shouldn't exit edit mode
         }

         if (!isInsideTable) {
            // Outside table → save & exit
            const rowEditorSaveButton = tableElement.querySelector('.p-row-editor-save');
            if (rowEditorSaveButton instanceof HTMLElement) {
               rowEditorSaveButton.click();
            }
         }
      };
      document.addEventListener('mouseup', handleClickOutside);
      document.addEventListener('focusout', handleFocusOut);
      return () => {
         document.removeEventListener('mouseup', handleClickOutside);
         document.removeEventListener('focusout', handleFocusOut);
      };
   }, [activeRowKey]);

   // Note: No default cell editor is provided. Grids should provide per-column editor functions
   // (columns[].editor) that render their own editor components which read diagnostics locally.
   const cellEditor = undefined;

   const allActionsTemplate = React.useCallback(
      (rowData: T, props: any): React.JSX.Element =>
         renderActionsColumn(rowData, props, editable, readonly, onRowDelete),
      [editable, readonly, onRowDelete]
   );

   const DataTableComponent = DataTable as any;
   return (
      <div>
         <DataTableComponent
            ref={tableRef}
            value={data}
            editMode={editable && !readonly ? 'row' : undefined}
            dataKey={keyField as string}
            onRowEditComplete={!readonly ? onRowEditComplete : undefined}
            onRowClick={!readonly ? handleRowClick : undefined}
            onRowDoubleClick={!readonly ? handleRowDoubleClick : undefined}
            editingRows={editingRows}
            onRowEditChange={!readonly ? onRowEditChange : undefined}
            selectionMode={onSelectionChange !== undefined ? 'multiple' : undefined}
            selection={selectedRows}
            metaKeySelection={metaKeySelection}
            onSelectionChange={onSelectionChange !== undefined ? (e: any) => onSelectionChange({ value: e.value as T[] }) : undefined}
            scrollable
            scrollHeight={height}
            className={`p-datatable-sm ${className || ''}`}
            showGridlines
            size='small'
            emptyMessage={noDataMessage}
            removableSort
            filters={filters}
            onFilter={(e: DataTableFilterEvent) => setFilters(e.filters as DataTableFilterMeta)}
            filterDisplay='menu'
            header={header}
            globalFilterFields={globalFilterFields as string[]}
         >
            {onSelectionChange !== undefined && <Column selectionMode='multiple' style={{ width: '3rem' }} />}
            {onRowReorder && <Column body={dragHandleTemplate} bodyClassName='p-reorder-column' style={{ width: '2rem' }} />}
            {columns.map(col => {
               const filter = col.filter ?? col.filterType !== undefined;
               const showFilterMatchModes = col.showFilterMatchModes === undefined ? col.filterType === 'text' : col.showFilterMatchModes;
               return (
                  <Column
                     key={col.field as string}
                     field={col.field as string}
                     header={col.header}
                     sortable={col.sortable}
                     body={col.body}
                     editor={typeof col.editor === 'function' ? col.editor : col.editor ? cellEditor : undefined}
                     headerStyle={col.headerStyle}
                     style={col.style}
                     filter={filter}
                     filterField={col.filterField}
                     showFilterMatchModes={showFilterMatchModes}
                     filterElement={(options: any) => filterTemplate(options, col.filterType, col.filterOptions)}
                     filterMatchMode={
                        col.filterType === 'dropdown' || col.filterType === 'boolean'
                           ? FilterMatchMode.EQUALS
                           : col.filterType === 'multiselect'
                             ? FilterMatchMode.IN
                             : FilterMatchMode.CONTAINS
                     }
                  />
               );
            })}
            {(onRowDelete || editable) && (
               <Column header='Actions' rowEditor={editable && !readonly} body={allActionsTemplate} style={{ width: '10rem' }} />
            )}
         </DataTableComponent>
      </div>
   );
}
