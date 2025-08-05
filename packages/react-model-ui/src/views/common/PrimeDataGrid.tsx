import { Button } from 'primereact/button';
import { Column } from 'primereact/column';
import { DataTable, DataTableRowEditCompleteEvent } from 'primereact/datatable';
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
   className
}: PrimeDataGridProps<T>): React.ReactElement {
   const [editingRows, setEditingRows] = React.useState({});

   const onRowEditComplete = (e: DataTableRowEditCompleteEvent) => {
      setEditingRows({});
      if (onRowUpdate) {
         onRowUpdate(e.newData as T);
      }
   };

   const actionTemplate = (rowData: T) => (
      <div className='flex gap-2'>
         {onRowDelete && !readonly && (
            <Button
               icon='pi pi-trash'
               className='p-button-text p-button-danger p-btn-sm-icon mr-1-rem'
               onClick={() => onRowDelete(rowData)}
               tooltip='Delete'
            />
         )}
         {onRowMoveUp && !readonly && (
            <Button
               icon='pi pi-arrow-up'
               className='p-button-text p-btn-sm-icon mr-1-rem'
               onClick={() => onRowMoveUp(rowData)}
               tooltip='Move Up'
            />
         )}
         {onRowMoveDown && !readonly && (
            <Button
               icon='pi pi-arrow-down'
               className='p-button-text p-btn-sm-icon mr-1-rem'
               onClick={() => onRowMoveDown(rowData)}
               tooltip='Move Down'
            />
         )}
      </div>
   );

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
         {onRowAdd && !readonly && <Toolbar className='mb-2' left={toolbarContent} />}
         <DataTable
            value={data}
            editMode={editable ? 'row' : undefined}
            dataKey={keyField as string}
            onRowEditComplete={onRowEditComplete}
            editingRows={editingRows}
            onRowEditChange={e => setEditingRows(e.data)}
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
            {(onRowDelete || onRowMoveUp || onRowMoveDown) && <Column body={actionTemplate} headerStyle={{ width: '8rem' }} />}
            {editable && !readonly && <Column rowEditor headerStyle={{ width: '7rem' }} />}
         </DataTable>
      </div>
   );
}
