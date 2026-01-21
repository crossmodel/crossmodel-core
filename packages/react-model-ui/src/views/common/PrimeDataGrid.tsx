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
import { focusTable } from './focusManagement';

export function handleGenericRowReorder<TRow extends { id: string; _uncommitted?: boolean }, TModel>(
   e: { rows: TRow[] },
   pendingDeleteIds: Set<string>,
   currentItems: TModel[],
   deriveId: (item: TModel, idx: number) => string,
   onReorder: (items: TModel[]) => void
): void {
   const filteredRows = e.rows.filter(row => !pendingDeleteIds.has(row.id));

   const itemEntries = currentItems.map((item, idx) => {
      const key = deriveId(item, idx);
      return { key, item };
   });
   const itemMap = new Map(itemEntries.map(entry => [entry.key, entry.item]));
   const committedItemCount = itemEntries.reduce((count, entry) => (pendingDeleteIds.has(entry.key) ? count : count + 1), 0);

   const reorderedItems: TModel[] = [];
   filteredRows.forEach(row => {
      if (row._uncommitted) {
         return;
      }
      const existing = itemMap.get(row.id);
      if (existing) {
         reorderedItems.push(existing);
      }
   });

   if (reorderedItems.length !== committedItemCount) {
      return;
   }

   onReorder(reorderedItems);
}

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
   resizableColumns?: boolean;
   columnResizeMode?: 'fit' | 'expand';
}

const pluralize = (word: string, count?: number): string => {
   if (!word || !count || count === 1) {
      return word;
   }

   if (/[^aeiou]y$/i.test(word)) {
      return word.replace(/y$/i, 'ies');
   }

   if (/(s|x|z|ch|sh)$/i.test(word)) {
      return `${word}es`;
   }

   return `${word}s`;
};

function useFilters<T>(columns: GridColumn<T>[]): {
   filters: DataTableFilterMeta;
   setFilters: React.Dispatch<React.SetStateAction<DataTableFilterMeta>>;
   clearFilters: () => void;
   onGlobalFilterChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
   filterTemplate: (options: any, filterType?: 'text' | 'dropdown' | 'multiselect' | 'boolean', filterOptions?: any[]) => React.JSX.Element;
   renderHeader: () => React.JSX.Element;
   renderFooter: (
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

   const renderHeader = (): React.JSX.Element => (
      <div className='datatable-global-filter'>
         <div className='datatable-filter-section'>
            <Button type='button' icon='pi pi-filter-slash' label='Clear Filters' outlined onClick={clearFilters} />
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
         </div>
      </div>
   );

   const renderFooter = (
      addButtonLabel: string,
      onRowAdd?: () => void,
      onRowDelete?: () => void,
      selectedRowsCount?: number,
      readonly?: boolean
   ): React.JSX.Element => (
      <div className='datatable-footer-actions'>
         {onRowAdd && <Button label={addButtonLabel} icon='pi pi-plus' severity='info' onClick={onRowAdd} disabled={readonly} />}
         {onRowDelete && (
            <Button
               label={`Delete ${pluralize(addButtonLabel.replace(/^Add\s+/i, '').trim(), selectedRowsCount)}`}
               icon='pi pi-trash'
               severity='danger'
               onClick={onRowDelete}
               disabled={readonly || !selectedRowsCount || selectedRowsCount === 0}
               style={{ backgroundColor: '#fbbf24', borderColor: '#fbbf24' }}
            />
         )}
      </div>
   );

   return { filters, setFilters, clearFilters, onGlobalFilterChange, filterTemplate, renderHeader, renderFooter };
}

function useDragDrop<T extends Record<string, any>>(
   data: T[],
   keyField: keyof T,
   onRowReorder?: (e: { rows: T[] }) => void,
   tableRef?: React.RefObject<any>,
   selectedRows?: T[],
   isDraggingRef?: React.MutableRefObject<boolean>,
   onDragStart?: () => void,
   setDropIndicator?: (style: React.CSSProperties | undefined) => void,
   wrapperRef?: React.RefObject<HTMLElement>
): void {
   const dragPreviewRef = React.useRef<HTMLElement | undefined>(undefined);
   const currentDragOverRowKeyRef = React.useRef<string | number | undefined>(undefined);
   const currentDropPositionRef = React.useRef<'above' | 'below' | undefined>(undefined);

   const dataRef = React.useRef(data);
   dataRef.current = data;

   const selectedRowsRef = React.useRef(selectedRows);
   selectedRowsRef.current = selectedRows;

   const dragStartRef = React.useRef<{ x: number; y: number; rowData: T; rowElement: HTMLElement } | undefined>(undefined);

   const startDrag = (e: MouseEvent, rowData: T, rowElement: HTMLElement): void => {
      const currentData = dataRef.current;
      const rowKey = rowData[keyField];
      if (rowKey === undefined) {
         return;
      }

      const tableElement = tableRef?.current?.getElement();
      if (!tableElement) {
         return;
      }

      currentDragOverRowKeyRef.current = undefined;
      currentDropPositionRef.current = undefined;

      const currentSelectedRows = selectedRowsRef.current;
      const isDraggingSelectedRows =
         currentSelectedRows && currentSelectedRows.length > 1 && currentSelectedRows.some(row => row[keyField] === rowKey);

      document.body.style.userSelect = 'none';
      window.getSelection()?.removeAllRanges();

      const dragPreviewTable = document.createElement('table');
      dragPreviewTable.className = tableElement.className;
      dragPreviewTable.style.cssText = getComputedStyle(tableElement).cssText;
      dragPreviewTable.style.position = 'fixed';
      dragPreviewTable.style.top = `${e.clientY - 20}px`;
      dragPreviewTable.style.left = `${e.clientX - 100}px`;
      dragPreviewTable.style.width = `${tableElement.offsetWidth}px`;
      dragPreviewTable.style.opacity = '0.8';
      dragPreviewTable.style.pointerEvents = 'none';
      dragPreviewTable.style.zIndex = '9999';
      dragPreviewTable.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
      dragPreviewTable.style.borderRadius = '4px';
      dragPreviewTable.style.overflow = 'hidden';

      const dragPreviewBody = document.createElement('tbody');
      dragPreviewBody.className = tableElement.querySelector('tbody')?.className || '';

      if (isDraggingSelectedRows && currentSelectedRows) {
         const selectedRowKeys = new Set(currentSelectedRows.map(row => row[keyField]));
         const allRows = Array.from(tableElement.querySelectorAll('tbody tr')) as HTMLElement[];
         const maxPreviewRows = 3;
         let addedRows = 0;
         let lastSelectedIndex = -1;
         let hasGaps = false;

         const selectedIndices: number[] = [];
         for (let i = 0; i < currentData.length; i++) {
            if (selectedRowKeys.has(currentData[i][keyField])) {
               selectedIndices.push(i);
            }
         }

         for (let i = 1; i < selectedIndices.length; i++) {
            if (selectedIndices[i] - selectedIndices[i - 1] > 1) {
               hasGaps = true;
               break;
            }
         }

         for (const row of allRows) {
            if (addedRows >= maxPreviewRows) {
               break;
            }

            const rowIndex = allRows.indexOf(row);
            if (rowIndex >= 0 && rowIndex < currentData.length) {
               const rData = currentData[rowIndex];
               if (selectedRowKeys.has(rData[keyField])) {
                  const clonedRow = row.cloneNode(true) as HTMLElement;

                  if (hasGaps && lastSelectedIndex !== -1 && rowIndex - lastSelectedIndex > 1 && addedRows > 0) {
                     const gapIndicator = document.createElement('tr');
                     gapIndicator.innerHTML =
                        '<td colspan="100%" style="text-align: center; font-style: italic; padding: 4px; ' +
                        'background: rgba(0,0,0,0.1); font-size: 11px;">⋮ gap ⋮</td>';
                     dragPreviewBody.appendChild(gapIndicator);
                  }

                  dragPreviewBody.appendChild(clonedRow);
                  lastSelectedIndex = rowIndex;
                  addedRows++;
               }
            }
         }

         if (currentSelectedRows.length > 1) {
            const countBadge = document.createElement('div');
            countBadge.style.cssText = `
               position: absolute;
               top: -8px;
               right: -8px;
               background: #007acc;
               color: white;
               border-radius: 50%;
               width: 24px;
               height: 24px;
               display: flex;
               align-items: center;
               justify-content: center;
               font-size: 12px;
               font-weight: bold;
               box-shadow: 0 2px 4px rgba(0,0,0,0.2);
            `;
            countBadge.textContent = currentSelectedRows.length.toString();
            dragPreviewTable.style.position = 'relative';
            dragPreviewTable.appendChild(countBadge);
         }

         if (currentSelectedRows.length > maxPreviewRows) {
            const moreRowsIndicator = document.createElement('tr');
            const gapText = hasGaps ? ' (with gaps)' : '';
            const remainingCount = currentSelectedRows.length - maxPreviewRows;
            moreRowsIndicator.innerHTML =
               '<td colspan="100%" style="text-align: center; font-style: italic; padding: 8px; ' +
               `background: rgba(0,0,0,0.05);">... and ${remainingCount} more rows${gapText}</td>`;
            dragPreviewBody.appendChild(moreRowsIndicator);
         }
      } else {
         const clonedRowElement = rowElement.cloneNode(true) as HTMLElement;
         dragPreviewBody.appendChild(clonedRowElement);
      }

      dragPreviewTable.appendChild(dragPreviewBody);

      const interactiveElements = dragPreviewTable.querySelectorAll('button, input, select, textarea, [tabindex]');
      interactiveElements.forEach(el => {
         (el as HTMLElement).style.pointerEvents = 'none';
         el.setAttribute('tabindex', '-1');
      });

      document.body.appendChild(dragPreviewTable);
      dragPreviewRef.current = dragPreviewTable;

      const handleMouseMove = (moveEvent: MouseEvent): void => {
         moveEvent.preventDefault();
         if (dragPreviewRef.current) {
            dragPreviewRef.current.style.top = `${moveEvent.clientY - 20}px`;
            dragPreviewRef.current.style.left = `${moveEvent.clientX - 70}px`;
         }

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

               if (moveEvent.clientY >= rect.top - buffer && moveEvent.clientY <= rect.bottom + buffer && distance < minDistance) {
                  minDistance = distance;
                  closestRow = row;
               }
            }

            if (closestRow) {
               let foundRowKey: string | number | undefined;
               const rowIndex = allRows.indexOf(closestRow);
               if (rowIndex >= 0 && rowIndex < currentData.length) {
                  foundRowKey = currentData[rowIndex][keyField];
               }

               if (foundRowKey !== undefined && foundRowKey !== rowKey) {
                  const rect = closestRow.getBoundingClientRect();
                  const rowCenterY = rect.top + rect.height / 2;
                  const position = moveEvent.clientY < rowCenterY ? 'above' : 'below';

                  if (currentDragOverRowKeyRef.current !== foundRowKey || currentDropPositionRef.current !== position) {
                     currentDragOverRowKeyRef.current = foundRowKey;
                     currentDropPositionRef.current = position;

                     if (setDropIndicator && wrapperRef?.current) {
                        const rowRect = closestRow.getBoundingClientRect();
                        const wrapperRect = wrapperRef.current.getBoundingClientRect();
                        const top = (position === 'above' ? rowRect.top : rowRect.bottom) - wrapperRect.top;

                        setDropIndicator({
                           top: top - 2,
                           left: 0,
                           width: '100%',
                           display: 'block'
                        });
                     }
                  }
               }
            } else {
               if (currentDragOverRowKeyRef.current !== undefined) {
                  currentDragOverRowKeyRef.current = undefined;
                  currentDropPositionRef.current = undefined;
                  if (setDropIndicator) {
                     setDropIndicator(undefined);
                  }
               }
            }
         });
      };

      const handleMouseUp = (upEvent: MouseEvent): void => {
         upEvent.preventDefault();
         upEvent.stopPropagation();

         document.body.style.userSelect = '';

         const focusTableElement = (): void => {
            const table = (tableRef?.current?.getElement() ?? undefined) as HTMLElement | undefined;
            focusTable(table, wrapperRef?.current ?? undefined);
         };

         // Use requestAnimationFrame twice to ensure the DOM has settled after reordering
         requestAnimationFrame(() => {
            requestAnimationFrame(() => focusTableElement());
         });

         if (dragPreviewRef.current) {
            document.body.removeChild(dragPreviewRef.current);
            dragPreviewRef.current = undefined;
         }

         if (setDropIndicator) {
            setDropIndicator(undefined);
         }

         if (currentDragOverRowKeyRef.current !== undefined && currentDropPositionRef.current && onRowReorder !== undefined) {
            const targetIndex = currentData.findIndex(row => row[keyField] === currentDragOverRowKeyRef.current);

            const currentSelectedRowsForDrop = selectedRowsRef.current;
            const isDraggingSelectedRowsForDrop =
               currentSelectedRowsForDrop &&
               currentSelectedRowsForDrop.length > 1 &&
               currentSelectedRowsForDrop.some(row => row[keyField] === rowKey);

            if (isDraggingSelectedRowsForDrop && currentSelectedRowsForDrop) {
               const selectedRowKeys = new Set(currentSelectedRowsForDrop.map(row => row[keyField]));
               const targetRow = currentData[targetIndex];
               const isTargetSelected = selectedRowKeys.has(targetRow[keyField]);
               const selectedRowsInOrder: T[] = [];
               currentData.forEach(row => {
                  if (selectedRowKeys.has(row[keyField])) {
                     selectedRowsInOrder.push(row);
                  }
               });

               const nonSelectedRows = currentData.filter(row => !selectedRowKeys.has(row[keyField]));

               let insertIndex: number;
               if (isTargetSelected) {
                  let nextNonSelectedIndex = -1;
                  for (let i = targetIndex + 1; i < currentData.length; i++) {
                     if (!selectedRowKeys.has(currentData[i][keyField])) {
                        nextNonSelectedIndex = nonSelectedRows.findIndex(row => row[keyField] === currentData[i][keyField]);
                        break;
                     }
                  }

                  if (nextNonSelectedIndex !== -1) {
                     insertIndex = nextNonSelectedIndex;
                  } else {
                     insertIndex = nonSelectedRows.length;
                  }
               } else {
                  const targetIndexInNonSelected = nonSelectedRows.findIndex(row => row[keyField] === targetRow[keyField]);
                  insertIndex = targetIndexInNonSelected;

                  if (currentDropPositionRef.current === 'below') {
                     insertIndex = targetIndexInNonSelected + 1;
                  }
               }

               const newData = [...nonSelectedRows];
               newData.splice(insertIndex, 0, ...selectedRowsInOrder);
               onRowReorder({ rows: newData });
               requestAnimationFrame(() => {
                  requestAnimationFrame(() => {
                     const table = (tableRef?.current?.getElement() ?? undefined) as HTMLElement | undefined;
                     focusTable(table, wrapperRef?.current ?? undefined);
                  });
               });
            } else {
               const sourceIndex = currentData.findIndex(row => row[keyField] === rowKey);
               if (sourceIndex !== -1 && targetIndex !== -1 && sourceIndex !== targetIndex) {
                  const newData = [...currentData];
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
                  requestAnimationFrame(() => {
                     requestAnimationFrame(() => {
                        const table = (tableRef?.current?.getElement() ?? undefined) as HTMLElement | undefined;
                        focusTable(table, wrapperRef?.current ?? undefined);
                     });
                  });
               }
            }
         }

         currentDragOverRowKeyRef.current = undefined;
         currentDropPositionRef.current = undefined;

         document.removeEventListener('mousemove', handleMouseMove);
         document.removeEventListener('mouseup', handleMouseUp);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
   };

   React.useEffect(() => {
      if (!onRowReorder || !tableRef?.current) {
         return;
      }

      const tableElement = tableRef.current.getElement();
      if (!tableElement) {
         return;
      }

      const handleMouseDown = (e: MouseEvent): void => {
         const target = e.target as HTMLElement;
         if (
            target.closest(
               'button, a, input, select, textarea, .p-checkbox, .p-radiobutton, .p-row-toggler, ' +
                  '.p-row-editor-init, .p-row-editor-save, .p-row-editor-cancel'
            )
         ) {
            return;
         }

         const rowElement = target.closest('tr');
         if (!rowElement || !tableElement.contains(rowElement)) {
            return;
         }

         const tbody = rowElement.parentElement;
         if (tbody?.tagName !== 'TBODY') {
            return;
         }

         const allRows = Array.from(tbody.children);
         const index = allRows.indexOf(rowElement);
         if (index < 0 || index >= data.length) {
            return;
         }

         const rowData = data[index];

         if (isDraggingRef) {
            isDraggingRef.current = false;
         }

         dragStartRef.current = {
            x: e.clientX,
            y: e.clientY,
            rowData,
            rowElement: rowElement as HTMLElement
         };

         document.addEventListener('mousemove', handleMouseMoveGlobal);
         document.addEventListener('mouseup', handleMouseUpGlobal);
      };

      const handleMouseMoveGlobal = (e: MouseEvent): void => {
         if (!dragStartRef.current) {
            return;
         }

         const { x, y, rowData, rowElement } = dragStartRef.current;
         const dx = e.clientX - x;
         const dy = e.clientY - y;
         const dist = Math.sqrt(dx * dx + dy * dy);

         if (dist > 5) {
            e.preventDefault();
            if (isDraggingRef) {
               isDraggingRef.current = true;
            }

            if (onDragStart) {
               onDragStart();
            }

            document.removeEventListener('mousemove', handleMouseMoveGlobal);
            document.removeEventListener('mouseup', handleMouseUpGlobal);

            startDrag(e, rowData, rowElement);
         }
      };

      const handleMouseUpGlobal = (e: MouseEvent): void => {
         dragStartRef.current = undefined;
         document.removeEventListener('mousemove', handleMouseMoveGlobal);
         document.removeEventListener('mouseup', handleMouseUpGlobal);
      };

      tableElement.addEventListener('mousedown', handleMouseDown);
      return () => {
         tableElement.removeEventListener('mousedown', handleMouseDown);
         document.removeEventListener('mousemove', handleMouseMoveGlobal);
         document.removeEventListener('mouseup', handleMouseUpGlobal);
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [data, keyField, onRowReorder, tableRef]);
}

function renderActionsColumn<T>(
   rowData: T,
   props: any,
   editable: boolean,
   readonly: boolean,
   onRowDelete?: (row: T) => void,
   tableRef?: React.RefObject<DataTable<any>>
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
               onClick={() => {
                  onRowDelete(rowData);

                  // Move focus to the table so Ctrl+Z triggers the global undo handler
                  const table = tableRef?.current?.getElement?.() as HTMLElement | undefined;
                  focusTable(table);
               }}
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
               onClick={() => {
                  onRowDelete(rowData);

                  // Move focus to the table so Ctrl+Z triggers the global undo handler
                  const table = tableRef?.current?.getElement?.() as HTMLElement | undefined;
                  focusTable(table);
               }}
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
   metaKeySelection = true,
   resizableColumns,
   columnResizeMode
}: PrimeDataGridProps<T>): React.ReactElement {
   // eslint-disable-next-line no-null/no-null
   const tableRef = React.useRef<DataTable<T[]>>(null);
   // eslint-disable-next-line no-null/no-null
   const lastInteractedCellRef = React.useRef<HTMLElement | null>(null);
   // eslint-disable-next-line no-null/no-null
   const activeRowKey = editingRows ? Object.keys(editingRows)[0] : null;

   const isDraggingRef = React.useRef(false);

   const { filters, setFilters, filterTemplate, renderHeader: renderFilterHeader, renderFooter: renderActionFooter } = useFilters(columns);

   const handleDragStart = React.useCallback(() => {
      const tableElement = tableRef.current?.getElement();
      if (tableElement && activeRowKey) {
         const saveButton = tableElement.querySelector('.p-row-editor-save');
         if (saveButton) {
            (saveButton as HTMLElement).click();
         }
      }
   }, [activeRowKey]);

   // eslint-disable-next-line no-null/no-null
   const [dropIndicatorStyle, setDropIndicatorStyle] = React.useState<React.CSSProperties | undefined>(undefined);
   // eslint-disable-next-line no-null/no-null
   const wrapperRef = React.useRef<HTMLDivElement>(null);

   useDragDrop(data, keyField, onRowReorder, tableRef, selectedRows, isDraggingRef, handleDragStart, setDropIndicatorStyle, wrapperRef);

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

         // After delete actions, shift focus to the table to route Ctrl+Z to the global undo handler
         // Use setTimeout to ensure focus is set after all React updates are processed
         setTimeout(() => {
            const tableElement = (tableRef.current?.getElement() ?? undefined) as HTMLElement | undefined;
            focusTable(tableElement);
         }, 0);
      }
   }, [selectedRows, onRowDelete, onSelectionChange]);

   const header = renderFilterHeader();

   const footer = renderActionFooter(addButtonLabel, handleAddRow, handleMultiDelete, selectedRows?.length, readonly);

   // Reconcile selection with current data to prevent ghost selections after add/delete
   React.useEffect(() => {
      if (!onSelectionChange) {
         return;
      }
      const dataKeys = new Set((data || []).map(row => row[keyField]).filter(k => k !== undefined) as Array<string | number>);
      const currentSelected = selectedRows || [];
      const filteredSelected = currentSelected.filter(row => {
         const k = row[keyField];
         return k !== undefined && dataKeys.has(k as any);
      });
      if (filteredSelected.length !== currentSelected.length) {
         onSelectionChange({ value: filteredSelected as T[] });
      }
   }, [data, selectedRows, keyField, onSelectionChange]);

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

         const editingCell =
            lastInteractedCellRef.current ??
            (tableElement.querySelector('.p-cell-editing:not(.p-grid-row-checkbox)') as HTMLElement | null);

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

      // Move focus away from the cell editor to the table so undo/redo works
      // This ensures that when clicking outside to save (not Enter key), focus is properly managed
      setTimeout(() => {
         const table = (tableRef.current?.getElement() ?? undefined) as HTMLElement | undefined;
         focusTable(table);
      }, 0);
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
      if (isDraggingRef.current) {
         isDraggingRef.current = false;
         return;
      }

      const target = e.originalEvent.target as HTMLElement;

      // Ignore clicks inside editors/controls
      if (target.closest('button, a, input, select, textarea')) {
         return;
      }

      // Enforce single selection on simple row click
      if (onSelectionChange && !readonly) {
         const originalEvent = e.originalEvent;
         const isCheckbox = target.closest('.p-checkbox') || target.closest('.p-selection-column');
         if (!isCheckbox && !originalEvent.ctrlKey && !originalEvent.metaKey && !originalEvent.shiftKey) {
            onSelectionChange({ value: [e.data as T] });
         }
      }

      if (!activeRowKey) {
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

      const tableElement = tableRef.current?.getElement();
      if (!tableElement) {
         return;
      }

      // Track mousedown position to prevent false commits when releasing after scrollbar drag
      let mouseDownTarget: EventTarget | undefined = undefined;

      const handleMouseDown = (event: MouseEvent): void => {
         mouseDownTarget = event.target ?? undefined;
      };

      const handleClickOutside = (event: MouseEvent): void => {
         const target = event.target as HTMLElement;

         // If mousedown was on the editing row, don't commit on mouseup
         // This prevents commits when dragging scrollbar and releasing over the editing row
         const editingRow = tableElement.querySelector('tr.p-row-editing');
         if (editingRow && mouseDownTarget && editingRow.contains(mouseDownTarget as Node)) {
            mouseDownTarget = undefined;
            return;
         }

         // Reset mousedown tracking
         mouseDownTarget = undefined;

         // Check if click is on a scrollbar by comparing click position with element's client area
         const isClickOnScrollbar = (element: HTMLElement): boolean => {
            const rect = element.getBoundingClientRect();
            const clickX = event.clientX;
            const clickY = event.clientY;

            // Check vertical scrollbar (right side)
            const hasVerticalScrollbar = element.scrollHeight > element.clientHeight;
            if (hasVerticalScrollbar && clickX >= rect.left + element.clientWidth && clickX <= rect.right) {
               return true;
            }

            // Check horizontal scrollbar (bottom)
            const hasHorizontalScrollbar = element.scrollWidth > element.clientWidth;
            if (hasHorizontalScrollbar && clickY >= rect.top + element.clientHeight && clickY <= rect.bottom) {
               return true;
            }

            return false;
         };

         // Check if click is on scrollbar of any parent element up to the table
         let currentElement: HTMLElement | undefined = target;
         while (currentElement && currentElement !== tableElement) {
            if (isClickOnScrollbar(currentElement)) {
               return;
            }
            currentElement = currentElement.parentElement ?? undefined;
         }
         if (tableElement && isClickOnScrollbar(tableElement)) {
            return;
         }

         // Allow clicks inside PrimeReact overlay panels
         const isInsideOverlay = target.closest(
            '.p-dropdown-panel, .p-multiselect-panel, .p-autocomplete-panel, .p-datepicker, .p-dialog, .p-overlaypanel'
         );

         if (isInsideOverlay) {
            return; // selecting from overlay shouldn't exit edit mode
         }

         const isButton = target.tagName === 'BUTTON' || target.closest('button');
         if (isButton) {
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

         const isInsideTable = tableElement.contains(target);
         // Also check if click is in wrapper (grid container) but outside the actual table body
         const isInsideWrapper = wrapperRef.current && wrapperRef.current.contains(target);
         const isInTableBody = target.closest('.p-datatable-tbody');

         if (!isInsideTable || (isInsideWrapper && !isInTableBody)) {
            // Outside table or in wrapper but not in table body → save & exit
            const rowEditorSaveButton = tableElement.querySelector('.p-row-editor-save');
            if (rowEditorSaveButton instanceof HTMLElement) {
               rowEditorSaveButton.click();
            }
         }
      };

      const handleFocusOut = (event: FocusEvent): void => {
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
      // Attach event listeners for better scoping
      // focusout bubbles up from the table when focus leaves
      tableElement.addEventListener('focusout', handleFocusOut);
      // mousedown to track where the mouse was initially pressed
      document.addEventListener('mousedown', handleMouseDown);
      // mousedown attached to document to catch clicks both inside and outside the table
      // The handler logic determines if the click should trigger a save
      document.addEventListener('mousedown', handleClickOutside);

      return () => {
         tableElement.removeEventListener('focusout', handleFocusOut);
         document.removeEventListener('mousedown', handleMouseDown);
         document.removeEventListener('mousedown', handleClickOutside);
      };
   }, [activeRowKey]);

   // Note: No default cell editor is provided. Grids should provide per-column editor functions
   // (columns[].editor) that render their own editor components which read diagnostics locally.
   const cellEditor = undefined;

   const allActionsTemplate = React.useCallback(
      (rowData: T, props: any): React.JSX.Element => renderActionsColumn(rowData, props, editable, readonly, onRowDelete, tableRef),
      [editable, readonly, onRowDelete]
   );

   const DataTableComponent = DataTable as any;
   return (
      <div ref={wrapperRef} style={{ position: 'relative' }}>
         {dropIndicatorStyle && (
            <div
               style={{
                  position: 'absolute',
                  height: '4px',
                  background: 'linear-gradient(90deg, #fbbf24 0%, #f59e0b 100%)',
                  zIndex: 1000,
                  pointerEvents: 'none',
                  borderRadius: '2px',
                  boxShadow: '0 1px 3px rgba(251, 191, 36, 0.5)',
                  ...dropIndicatorStyle
               }}
            />
         )}
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
            metaKeySelection={true}
            onSelectionChange={
               onSelectionChange !== undefined
                  ? (e: any) => {
                       const originalEvent = e.originalEvent;
                       if (originalEvent) {
                          const target = originalEvent.target as any;
                          const findClosest = (el: any, selector: string): Element | null | undefined => {
                             if (el.closest) {
                                return el.closest(selector);
                             }
                             if (el.parentElement && el.parentElement.closest) {
                                return el.parentElement.closest(selector);
                             }
                             if (el.correspondingUseElement) {
                                return findClosest(el.correspondingUseElement, selector);
                             }
                             return undefined;
                          };
                          const isCheckbox =
                             findClosest(target, '.p-checkbox') ||
                             findClosest(target, '.p-selection-column') ||
                             findClosest(target, '.p-checkbox-icon');

                          const isMouseEvent =
                             originalEvent.type === 'click' ||
                             originalEvent.type === 'mousedown' ||
                             originalEvent.type === 'mouseup' ||
                             originalEvent.type === 'pointerdown' ||
                             originalEvent.type === 'pointerup';

                          if (isMouseEvent && !isCheckbox && !originalEvent.ctrlKey && !originalEvent.metaKey && !originalEvent.shiftKey) {
                             return;
                          }
                       }
                       onSelectionChange({ value: e.value as T[] });
                    }
                  : undefined
            }
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
            footer={footer}
            globalFilterFields={globalFilterFields as string[]}
            resizableColumns={resizableColumns}
            columnResizeMode={columnResizeMode}
         >
            {onSelectionChange !== undefined && (
               <Column
                  selectionMode='multiple'
                  style={{ width: '3rem' }}
                  bodyClassName={(rowData: T) => {
                     const rowKey = rowData[keyField];
                     return editingRows && rowKey !== undefined && editingRows[rowKey] ? 'p-cell-editing p-grid-row-checkbox' : '';
                  }}
               />
            )}
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
               <Column
                  header='Actions'
                  rowEditor={editable && !readonly}
                  body={allActionsTemplate}
                  style={{ width: '10rem' }}
                  bodyClassName={(rowData: T) => {
                     const rowKey = rowData[keyField];
                     return editingRows && rowKey !== undefined && editingRows[rowKey] ? 'p-cell-editing' : '';
                  }}
               />
            )}
         </DataTableComponent>
      </div>
   );
}
