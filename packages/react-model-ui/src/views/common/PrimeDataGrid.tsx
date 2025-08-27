import { FilterMatchMode } from 'primereact/api';
import { Button } from 'primereact/button';
import { Column } from 'primereact/column';
import {
   DataTable,
   DataTableFilterEvent,
   DataTableFilterMeta,
   DataTableRowClickEvent,
   DataTableRowEditCompleteEvent,
   DataTableRowEditEvent
} from 'primereact/datatable';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { Toolbar } from 'primereact/toolbar';
import * as React from 'react';

export interface GridColumn<T> {
   field: keyof T;
   header: string;
   editor?: boolean | ((options: any) => React.ReactNode);
   sortable?: boolean;
   body?: (rowData: T) => React.ReactNode;
   headerStyle?: React.CSSProperties;
   style?: React.CSSProperties;
   filterType?: 'text' | 'dropdown';
   filterOptions?: any[];
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
   onRowEditChange
}: PrimeDataGridProps<T>): React.ReactElement {
   const tableRef = React.useRef<DataTable<T[]>>(null);

   const initFilters = () => {
      const initialFilters: DataTableFilterMeta = {
         global: { value: null, matchMode: FilterMatchMode.CONTAINS }
      };
      columns.forEach(col => {
         initialFilters[col.field as string] = {
            value: null,
            matchMode: col.filterType === 'dropdown' ? FilterMatchMode.EQUALS : FilterMatchMode.CONTAINS
         };
      });
      return initialFilters;
   };

   const [filters, setFilters] = React.useState<DataTableFilterMeta>(initFilters());

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

   const onRowEditComplete = (e: DataTableRowEditCompleteEvent) => {
      if (onRowUpdate) {
         onRowUpdate(e.newData as T);
      }
   };

   const handleRowDoubleClick = (e: DataTableRowClickEvent) => {
      const target = e.originalEvent.target as HTMLElement;

      if (target.closest('button, a, input, select, textarea')) {
         return;
      }

      if (editable && !readonly && onRowEditChange) {
         const rowData = e.data as T;
         const rowKey = rowData[keyField];
         if (rowKey !== undefined) {
            const newEditingRows = { [rowKey]: true };
            onRowEditChange({
               originalEvent: e.originalEvent,
               data: newEditingRows,
               index: e.index
            });
         }
      }
   };

   const allActionsTemplate = (rowData: T, props: any) => {
      const isEditing = editable && !readonly && props.rowEditor && props.rowEditor.editing;
      const buttons: React.ReactElement[] = [];

      if (isEditing) {
         buttons.push(
            <Button
               icon='pi pi-check'
               className='p-button-text p-button-success p-row-action-button'
               onClick={props.rowEditor.onSaveClick}
               tooltip='Save'
            />
         );
         buttons.push(
            <Button
               icon='pi pi-times'
               className='p-button-text p-button-danger p-row-action-button'
               onClick={props.rowEditor.onCancelClick}
               tooltip='Cancel'
            />
         );
      } else {
         if (editable && !readonly && props.rowEditor) {
            buttons.push(
               <Button
                  icon='pi pi-pencil'
                  className='p-button-text p-row-action-button'
                  onClick={props.rowEditor.onInitClick}
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

   const cellEditor = (options: any) => (
      <InputText
         value={options.value}
         onChange={e => options.editorCallback(e.target.value)}
         className={validationErrors[options.field] ? 'p-invalid' : ''}
      />
   );

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

   const toolbarContent = (
      <React.Fragment>
         {onRowAdd && !readonly && <Button label={addButtonLabel} icon='pi pi-plus' severity='info' onClick={handleAddRow} />}
      </React.Fragment>
   );

   const filterTemplate = (options: any, filterType?: 'text' | 'dropdown', filterOptions?: any[]) => {
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
         {onRowAdd && !readonly && <Toolbar start={toolbarContent} />}
         <DataTable
            ref={tableRef}
            value={data}
            editMode={editable ? 'row' : undefined}
            dataKey={keyField as string}
            onRowEditComplete={onRowEditComplete}
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
         >
            {columns.map(col => (
               <Column
                  key={col.field as string}
                  field={col.field as string}
                  header={col.header}
                  sortable={col.sortable}
                  body={col.body}
                  editor={typeof col.editor === 'function' ? col.editor : col.editor ? cellEditor : undefined}
                  headerStyle={col.headerStyle}
                  style={col.style}
                  filter
                  filterElement={(options: any) => filterTemplate(options, col.filterType, col.filterOptions)}
                  filterMatchMode={col.filterType === 'dropdown' ? FilterMatchMode.EQUALS : FilterMatchMode.CONTAINS}
               />
            ))}
            {(onRowDelete || onRowMoveUp || onRowMoveDown || (editable && !readonly)) && (
               <Column header='Actions' rowEditor={editable && !readonly} body={allActionsTemplate} style={{ width: '10rem' }} />
            )}
         </DataTable>
      </div>
   );
}
