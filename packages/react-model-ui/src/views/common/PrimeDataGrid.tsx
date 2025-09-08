/********************************************************************************
 * Copyright (c) 2025 CrossBreeze.
 ********************************************************************************/
import { FilterMatchMode } from 'primereact/api';
import { Button } from 'primereact/button';
import { Column, ColumnBodyOptions } from 'primereact/column';
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
import { handleGridEditorKeyDown } from './gridKeydownHandler';

export interface GridColumn<T> {
   field: keyof T;
   header: string;
   editor?: boolean | ((options: any) => React.ReactNode);
   sortable?: boolean;
   body?: (rowData: T) => React.ReactNode;
   headerStyle?: React.CSSProperties;
   style?: React.CSSProperties;
   filter?: boolean;
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
   onRowMoveUp?: (rowData: T) => void;
   onRowMoveDown?: (rowData: T) => void;
   addButtonLabel?: string;
   noDataMessage?: string;
   defaultNewRow?: Partial<T>;
   editable?: boolean;
   readonly?: boolean;
   validationErrors?: Record<string, string>;
   className?: string;
   editingRows?: Record<string, boolean>;
   onRowEditChange?: (e: DataTableRowEditEvent) => void;
   globalFilterFields?: (keyof T)[];
}

export function PrimeDataGrid<T extends Record<string, any>>({
   columns,
   data,
   keyField = 'id',
   height = '400px',
   onRowAdd,
   onRowUpdate,
   onRowDelete,
   onRowMoveUp,
   onRowMoveDown,
   addButtonLabel = 'Add',
   noDataMessage = 'No records found',
   defaultNewRow = {},
   editable = true,
   readonly = false,
   validationErrors = {},
   className,
   editingRows,
   onRowEditChange,
   globalFilterFields
}: PrimeDataGridProps<T>): React.ReactElement {
   // eslint-disable-next-line no-null/no-null
   const tableRef = React.useRef<DataTable<T[]>>(null);

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
         initialFilters[col.field as string] = {
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

   const handleAddRow = React.useCallback(() => {
      if (onRowAdd) {
         const newRow = { ...defaultNewRow };
         columns.forEach(col => {
            if (!(col.field in newRow)) {
               (newRow as any)[col.field] = '';
            }
         });
         onRowAdd(newRow as T);
      }
   }, [onRowAdd, defaultNewRow, columns]);

   const renderHeader = (): React.JSX.Element => {
      return (
         <div className='datatable-global-filter'>
            <div>
               {onRowAdd && !readonly && (
                  <Button
                     label={addButtonLabel}
                     icon='pi pi-plus'
                     severity='info'
                     onClick={handleAddRow}
                     style={{ marginRight: '0.5rem' }}
                  />
               )}
               <Button type='button' icon='pi pi-filter-slash' label='Clear' outlined onClick={clearFilters} />
            </div>
            <IconField iconPosition='left'>
               <InputIcon className='pi pi-search' />
               <InputText
                  value={(filters['global'] as DataTableFilterMetaData)?.value || ''}
                  onChange={onGlobalFilterChange}
                  placeholder='Keyword Search'
               />
            </IconField>
         </div>
      );
   };

   const header = renderHeader();

   React.useEffect(() => {
      if (tableRef.current && editingRows && Object.keys(editingRows).length > 0) {
         const editingRowKey = Object.keys(editingRows)[0];
         const editingRowIndex = data.findIndex(row => row[keyField] === editingRowKey);
         if (editingRowIndex !== -1) {
            setTimeout(() => {
               const tableElement = tableRef.current?.getElement();
               const editingCell = tableElement?.querySelector('.p-cell-editing');
               if (editingCell) {
                  const input = editingCell.querySelector('input, .p-dropdown, .p-autocomplete-input');
                  if (input) {
                     (input as HTMLElement).focus();
                  }
               }
            }, 100);
         }
      }
   }, [editingRows, data, keyField]);

   const onRowEditComplete = (e: DataTableRowEditCompleteEvent): void => {
      if (onRowUpdate) {
         // don’t mutate e.newData directly
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

   // eslint-disable-next-line no-null/no-null
   const activeRowKey = editingRows ? Object.keys(editingRows)[0] : null;

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

         if (!isInsideTable) {
            // Outside table → save & exit
            const rowEditorSaveButton = tableElement.querySelector('.p-row-editor-save');
            if (rowEditorSaveButton instanceof HTMLElement) {
               rowEditorSaveButton.click();
            }
         }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => {
         document.removeEventListener('mousedown', handleClickOutside);
      };
   }, [activeRowKey]);

   // eslint-disable-next-line react/prop-types
   const allActionsTemplate = (rowData: T, props: ColumnBodyOptions): React.JSX.Element => {
      const isEditing = editable && !readonly && props.rowEditor && props.rowEditor.editing; // eslint-disable-line react/prop-types
      const buttons: React.ReactElement[] = [];

      if (isEditing) {
         buttons.push(
            <Button
               icon='pi pi-check'
               className='p-button-text p-button-success p-row-action-button p-row-editor-save'
               onClick={props.rowEditor?.onSaveClick} // eslint-disable-line react/prop-types
               tooltip='Save'
            />
         );
         buttons.push(
            <Button
               icon='pi pi-times'
               className='p-button-text p-button-danger p-row-action-button p-row-editor-cancel'
               onClick={props.rowEditor?.onCancelClick} // eslint-disable-line react/prop-types
               tooltip='Cancel'
            />
         );
      } else {
         // eslint-disable-next-line react/prop-types
         if (editable && !readonly && props.rowEditor) {
            buttons.push(
               <Button
                  icon='pi pi-pencil'
                  className='p-button-text p-row-action-button'
                  onClick={props.rowEditor?.onInitClick} // eslint-disable-line react/prop-types
                  tooltip='Edit'
               />
            );
         }
         if (onRowMoveUp && !readonly) {
            buttons.push(
               <Button
                  icon='pi pi-arrow-up'
                  className='p-button-text p-row-action-button'
                  onClick={() => onRowMoveUp(rowData)}
                  tooltip='Move Up'
               />
            );
         }
         if (onRowMoveDown && !readonly) {
            buttons.push(
               <Button
                  icon='pi pi-arrow-down'
                  className='p-button-text p-row-action-button'
                  onClick={() => onRowMoveDown(rowData)}
                  tooltip='Move Down'
               />
            );
         }
         if (onRowDelete && !readonly) {
            buttons.push(
               <Button
                  icon='pi pi-trash'
                  className='p-button-text p-button-danger p-row-action-button'
                  onClick={() => onRowDelete(rowData)}
                  tooltip='Delete'
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
   };

   const cellEditor = (options: any): React.JSX.Element => (
      <InputText
         value={options.value}
         onChange={(e: React.ChangeEvent<HTMLInputElement>) => options.editorCallback(e.target.value)}
         className={validationErrors[options.field] ? 'p-invalid' : ''}
         onKeyDown={handleGridEditorKeyDown}
         autoFocus
      />
   );

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

   return (
      <div>
         <DataTable
            ref={tableRef}
            value={data}
            editMode={editable ? 'row' : undefined}
            dataKey={keyField as string}
            onRowEditComplete={onRowEditComplete}
            onRowClick={handleRowClick}
            onRowDoubleClick={handleRowDoubleClick}
            editingRows={editingRows}
            onRowEditChange={onRowEditChange}
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
            {(onRowDelete || onRowMoveUp || onRowMoveDown || (editable && !readonly)) && (
               <Column header='Actions' rowEditor={editable && !readonly} body={allActionsTemplate} style={{ width: '10rem' }} />
            )}
         </DataTable>
      </div>
   );
}
