/********************************************************************************
 * Copyright (c) 2025 CrossBreeze.
 ********************************************************************************/
import { Button } from 'primereact/button';
import { Column, ColumnEditorOptions } from 'primereact/column';
import { DataTable, DataTableRowEditCompleteEvent } from 'primereact/datatable';
import { InputText } from 'primereact/inputtext';
import { Toolbar } from 'primereact/toolbar';
import * as React from 'react';
import { useReadonly } from '../../ModelContext';

export type GridComponentRow<T> = T & { idx: number };

export type ValidationFunction<T> = <P extends keyof T, V extends T[P]>(field: P, value: V) => string | undefined;

export interface GridComponentProps<T> {
   gridData: T[];
   gridColumns: { field: keyof T; header: string }[];
   defaultEntry: T;
   label?: string;
   noEntriesText?: string;
   newEntryText?: string;
   onAdd?: (toAdd: GridComponentRow<T>) => void | GridComponentRow<T> | Promise<void | GridComponentRow<T>>;
   onUpdate?: (toUpdate: GridComponentRow<T>) => void | GridComponentRow<T> | Promise<void | GridComponentRow<T>>;
   onDelete?: (toDelete: GridComponentRow<T>) => void;
   onMoveUp?: (toMoveUp: GridComponentRow<T>) => void;
   onMoveDown?: (toMoveDown: GridComponentRow<T>) => void;
   validateField?: ValidationFunction<T>;
}

export default function GridComponent<T>({
   gridData,
   gridColumns,
   defaultEntry,
   label,
   newEntryText,
   noEntriesText,
   onAdd,
   onUpdate,
   onDelete,
   onMoveUp,
   onMoveDown,
   validateField
}: GridComponentProps<T>): React.ReactElement {
   const readonly = useReadonly();
   const [rows, setRows] = React.useState<GridComponentRow<T>[]>([]);
   const [counter, setCounter] = React.useState(0);
   const [editingRows, setEditingRows] = React.useState({});
   const validationErrors = React.useRef<Record<number, Partial<Record<keyof T, string>>>>({});

   React.useEffect(() => {
      const initializedRows = gridData.map((row, idx) => ({ ...row, idx }));
      setRows(initializedRows);
      setCounter(initializedRows.length);
   }, [gridData]);

   const addNewRow = () => {
      const newRow: GridComponentRow<T> = { ...defaultEntry, idx: counter };
      setRows([...rows, newRow]);
      setEditingRows({ [newRow.idx]: true });
      setCounter(prev => prev + 1);
      onAdd?.(newRow);
   };

   const deleteRow = (row: GridComponentRow<T>) => {
      setRows(prev => prev.filter(r => r.idx !== row.idx));
      delete validationErrors.current[row.idx];
      onDelete?.(row);
   };

   const moveRow = (row: GridComponentRow<T>, direction: 'up' | 'down') => {
      const index = rows.findIndex(r => r.idx === row.idx);
      const targetIndex = direction === 'up' ? index - 1 : index + 1;

      if (targetIndex < 0 || targetIndex >= rows.length) {
         return;
      }

      const reordered = [...rows];
      const [movedItem] = reordered.splice(index, 1);
      reordered.splice(targetIndex, 0, movedItem);
      setRows(reordered);

      if (direction === 'up') {
         onMoveUp?.(row);
      } else {
         onMoveDown?.(row);
      }
   };

   const onRowEditComplete = async (e: DataTableRowEditCompleteEvent) => {
      const updatedRow = e.newData as GridComponentRow<T>;
      const index = rows.findIndex(r => r.idx === updatedRow.idx);

      const validation: Partial<Record<keyof T, string>> = {};
      let hasError = false;

      for (const col of gridColumns) {
         const value = updatedRow[col.field];
         const error = validateField?.(col.field, value);
         if (error) {
            validation[col.field] = error;
            hasError = true;
         }
      }

      if (hasError) {
         validationErrors.current[updatedRow.idx] = validation;
         setEditingRows({ [updatedRow.idx]: true }); // stay in edit mode
      } else {
         delete validationErrors.current[updatedRow.idx];
         const updated = [...rows];
         updated[index] = updatedRow;
         setRows(updated);
         onUpdate?.(updatedRow);
      }
   };

   const inputEditor = (field: keyof T) => {
      function InputEditor(options: ColumnEditorOptions): React.JSX.Element {
         return (
            <div className='p-inputgroup'>
               <InputText
                  value={options.value}
                  onChange={e => options.editorCallback?.({ ...options.rowData, [field]: e.target.value })}
                  className={validationErrors.current[options.rowData.idx]?.[field] ? 'p-invalid' : ''}
               />
            </div>
         );
      }
      InputEditor.displayName = 'InputEditor';
      return InputEditor;
   };

   const renderHeader = () => (
      <Toolbar
         start={<Button label={newEntryText ?? 'Add'} icon='pi pi-plus' onClick={addNewRow} disabled={readonly || !onAdd} />}
         end={label && <span className='text-blue-700 font-semibold'>{label}</span>}
      />
   );

   const actionTemplate = (row: GridComponentRow<T>) => (
      <div className='flex gap-2'>
         <Button
            icon='pi pi-trash'
            className='p-button-text p-button-danger'
            onClick={() => deleteRow(row)}
            disabled={readonly || !onDelete}
            tooltip='Delete'
            tooltipOptions={{ position: 'top' }}
         />
         <Button
            icon='pi pi-arrow-up'
            className='p-button-text'
            onClick={() => moveRow(row, 'up')}
            disabled={readonly || !onMoveUp || rows.findIndex(r => r.idx === row.idx) === 0}
            tooltip='Move Up'
         />
         <Button
            icon='pi pi-arrow-down'
            className='p-button-text'
            onClick={() => moveRow(row, 'down')}
            disabled={readonly || !onMoveDown || rows.findIndex(r => r.idx === row.idx) === rows.length - 1}
            tooltip='Move Down'
         />
      </div>
   );

   return (
      <div style={{ width: '100%' }}>
         {renderHeader()}
         <DataTable
            value={rows}
            editMode='row'
            dataKey='idx'
            onRowEditComplete={onRowEditComplete}
            editingRows={editingRows}
            onRowEditCancel={() => setEditingRows({})}
            emptyMessage={noEntriesText ?? 'No entries'}
            tableStyle={{ minWidth: '100%' }}
            size='small'
         >
            {gridColumns.map(col => (
               <Column
                  key={String(col.field)}
                  field={String(col.field)}
                  header={col.header}
                  editor={inputEditor(col.field)}
                  // editorValidator is not a valid prop for Column, use cellEditValidator if needed
                  body={(rowData: GridComponentRow<T>) => {
                     const error = validationErrors.current[rowData.idx]?.[col.field];
                     return (
                        <div>
                           {String(rowData[col.field])}
                           {error && <small className='p-error block'>{error}</small>}
                        </div>
                     );
                  }}
               />
            ))}
            <Column rowEditor header='Edit' bodyStyle={{ textAlign: 'center' }} style={{ width: '5rem' }} />
            <Column body={actionTemplate} header='Actions' style={{ width: '10rem' }} />
         </DataTable>
      </div>
   );
}
