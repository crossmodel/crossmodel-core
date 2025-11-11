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
   globalFilterFields?: string[];
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
   // eslint-disable-next-line no-null/no-null
   const lastInteractedCellRef = React.useRef<HTMLElement | null>(null);
   // eslint-disable-next-line no-null/no-null
   const activeRowKey = editingRows ? Object.keys(editingRows)[0] : null;

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

   const handleAddRow = React.useCallback(() => {
      if (onRowAdd) {
         // First check if we have any active edits that need to be saved
         const tableElement = tableRef.current?.getElement();
         if (tableElement && activeRowKey) {
            const rowEditorSaveButton = tableElement.querySelector('.p-row-editor-save');
            if (rowEditorSaveButton instanceof HTMLElement) {
               rowEditorSaveButton.click();
            }
         }

         // Then add the new row
         const newRow = { ...defaultNewRow };
         columns.forEach(col => {
            if (!(col.field in newRow)) {
               (newRow as any)[col.field] = '';
            }
         });
         onRowAdd(newRow as T);
      }
   }, [onRowAdd, defaultNewRow, columns, activeRowKey]);

   const renderHeader = (): React.JSX.Element => (
      <div className='datatable-global-filter'>
         {onRowAdd && <Button label={addButtonLabel} icon='pi pi-plus' severity='info' onClick={handleAddRow} disabled={readonly} />}
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

   const header = renderHeader();

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
               '.p-dropdown-panel, .p-multiselect-panel, .p-autocomplete-panel, .p-datepicker, .p-dialog, .p-overlaypanel'
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
            '.p-dropdown-panel, .p-multiselect-panel, .p-autocomplete-panel, .p-datepicker, .p-dialog, .p-overlaypanel'
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

      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('focusout', handleFocusOut);
      return () => {
         document.removeEventListener('mousedown', handleClickOutside);
         document.removeEventListener('focusout', handleFocusOut);
      };
   }, [activeRowKey]);

   // eslint-disable-next-line react/prop-types
   const allActionsTemplate = (rowData: T, props: ColumnBodyOptions): React.JSX.Element => {
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
         if (onRowMoveUp) {
            buttons.push(
               <Button
                  icon='pi pi-arrow-up'
                  className='p-button-text p-row-action-button'
                  onClick={() => onRowMoveUp(rowData)}
                  tooltip='Move Up'
                  disabled={readonly}
               />
            );
         }
         if (onRowMoveDown) {
            buttons.push(
               <Button
                  icon='pi pi-arrow-down'
                  className='p-button-text p-row-action-button'
                  onClick={() => onRowMoveDown(rowData)}
                  tooltip='Move Down'
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
   };

   const cellEditor = (options: any): React.JSX.Element => {
      const rowKey = options.rowData ? options.rowData[keyField as string] : undefined;
      const errorKey = rowKey !== undefined ? `${rowKey}.${options.field}` : options.field;
      const error = validationErrors[errorKey];

      return (
         <div className='grid-editor-container'>
            <InputText
               value={options.value}
               onChange={(e: React.ChangeEvent<HTMLInputElement>) => options.editorCallback(e.target.value)}
               className={error ? 'p-invalid' : ''}
               onKeyDown={handleGridEditorKeyDown}
               disabled={readonly}
               autoFocus
               title={error || undefined}
            />
            {error && <small className='p-error m-0'>{error}</small>}
         </div>
      );
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

   return (
      <div>
         <DataTable
            ref={tableRef}
            value={data}
            editMode={editable && !readonly ? 'row' : undefined}
            dataKey={keyField as string}
            onRowEditComplete={!readonly ? onRowEditComplete : undefined}
            onRowClick={!readonly ? handleRowClick : undefined}
            onRowDoubleClick={!readonly ? handleRowDoubleClick : undefined}
            editingRows={editingRows}
            onRowEditChange={!readonly ? onRowEditChange : undefined}
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
            {(onRowDelete || onRowMoveUp || onRowMoveDown || editable) && (
               <Column header='Actions' rowEditor={editable && !readonly} body={allActionsTemplate} style={{ width: '10rem' }} />
            )}
         </DataTable>
      </div>
   );
}
