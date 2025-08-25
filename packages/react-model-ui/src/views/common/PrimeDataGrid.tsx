import { Button } from 'primereact/button';
import { Column } from 'primereact/column';
import { DataTable, DataTableRowEditCompleteEvent, DataTableRowEditEvent } from 'primereact/datatable';
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

   const allActionsTemplate = (rowData: T, props: any) => {
      const isEditing = editable && !readonly && props.rowEditor && props.rowEditor.editing;

      return isEditing ? (
         <div className='flex gap-1'>
            <Button
               icon='pi pi-check'
               className='p-button-text p-button-success p-row-action-button'
               onClick={props.rowEditor.onSaveClick}
               tooltip='Save'
            />
            <Button
               icon='pi pi-times'
               className='p-button-text p-button-danger p-row-action-button'
               onClick={props.rowEditor.onCancelClick}
               tooltip='Cancel'
            />
         </div>
      ) : (
         <div className='flex gap-1'>
            {editable && !readonly && props.rowEditor && (
               <Button
                  icon='pi pi-pencil'
                  className='p-button-text p-row-action-button'
                  onClick={props.rowEditor.onInitClick}
                  tooltip='Edit'
               />
            )}
            {onRowMoveUp && !readonly && (
               <Button
                  icon='pi pi-arrow-up'
                  className='p-button-text p-row-action-button'
                  onClick={() => onRowMoveUp(rowData)}
                  tooltip='Move Up'
               />
            )}
            {onRowMoveDown && !readonly && (
               <Button
                  icon='pi pi-arrow-down'
                  className='p-button-text p-row-action-button'
                  onClick={() => onRowMoveDown(rowData)}
                  tooltip='Move Down'
               />
            )}
            {onRowDelete && !readonly && (
               <Button
                  icon='pi pi-trash'
                  className='p-button-text p-button-danger p-row-action-button'
                  onClick={() => onRowDelete(rowData)}
                  tooltip='Delete'
               />
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
         // Create a new row with all required fields from columns
         const newRow = { ...defaultNewRow };
         // Initialize any missing fields from columns
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

   return (
      <div>
         {onRowAdd && !readonly && <Toolbar start={toolbarContent} />}
         <DataTable
            ref={tableRef}
            value={data}
            editMode={editable ? 'row' : undefined}
            dataKey={keyField as string}
            onRowEditComplete={onRowEditComplete}
            editingRows={editingRows}
            onRowEditChange={onRowEditChange}
            scrollable
            scrollHeight={height}
            className={`p-datatable-sm ${className || ''}`}
            showGridlines
            size='small'
            emptyMessage={noDataMessage}
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
               />
            ))}
            {(onRowDelete || onRowMoveUp || onRowMoveDown || (editable && !readonly)) && (
               <Column header='Actions' rowEditor={editable && !readonly} body={allActionsTemplate} style={{ width: '10rem' }} />
            )}
         </DataTable>
      </div>
   );
}
