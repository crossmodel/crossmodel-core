/********************************************************************************
 * Copyright (c) 2024 CrossBreeze.
 ********************************************************************************/
import {
   BinaryExpressionType,
   BooleanExpression,
   CrossReferenceContext,
   JoinConditionType,
   Mapping,
   NumberLiteralType,
   ReferenceableElement,
   SourceObjectAttributeReferenceType,
   SourceObjectCondition,
   StringLiteralType,
   quote
} from '@crossmodel/protocol';
import {
   AutoComplete,
   AutoCompleteChangeEvent,
   AutoCompleteCompleteEvent,
   AutoCompleteDropdownClickEvent,
   AutoCompleteSelectEvent
} from 'primereact/autocomplete';
import { DataTableRowEditEvent } from 'primereact/datatable';
import { Dropdown, DropdownChangeEvent } from 'primereact/dropdown';
import * as React from 'react';
import { useDiagnostics, useModelDispatch, useModelQueryApi, useReadonly } from '../../ModelContext';
import { ErrorView } from '../ErrorView';
import { GridColumn, PrimeDataGrid } from './PrimeDataGrid';
import { handleGridEditorKeyDown } from './gridKeydownHandler';

interface SourceObjectConditionEditorProps {
   options: any;
   isLeft: boolean;
   sourceObject: any;
}

function SourceObjectConditionEditor(props: SourceObjectConditionEditorProps): React.ReactElement {
   const { options, isLeft, sourceObject } = props;
   const { editorCallback } = options;

   const [currentValue, setCurrentValue] = React.useState(options.value);
   const [suggestions, setSuggestions] = React.useState<ReferenceableElement[]>([]);
   const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);
   const queryApi = useModelQueryApi();
   const readonly = useReadonly();
   const isDropdownClicked = React.useRef(false);
   // eslint-disable-next-line no-null/no-null
   const autoCompleteRef = React.useRef<AutoComplete>(null);

   const referenceCtx: CrossReferenceContext = React.useMemo(
      () => ({
         container: { globalId: sourceObject.$globalId },
         syntheticElements: [
            { property: 'conditions', type: JoinConditionType },
            { property: 'expression', type: BinaryExpressionType },
            { property: isLeft ? 'left' : 'right', type: SourceObjectAttributeReferenceType }
         ],
         property: 'value'
      }),
      [sourceObject.$globalId, isLeft]
   );

   const search = React.useCallback(
      async (event: AutoCompleteCompleteEvent) => {
         const elements = await queryApi.findReferenceableElements(referenceCtx);
         const filteredSuggestions = elements.filter(element =>
            isDropdownClicked.current ? true : event.query ? (element.label || '').toLowerCase().includes(event.query.toLowerCase()) : true
         );
         setSuggestions(filteredSuggestions);
         isDropdownClicked.current = false;
      },
      [queryApi, referenceCtx]
   );

   const handleValue = React.useCallback((value: ReferenceableElement | string): any => {
      const literal = typeof value === 'string';
      const fieldValue = literal ? value : value.label;
      const $type = literal
         ? isNaN(parseFloat(value as string))
            ? StringLiteralType
            : NumberLiteralType
         : SourceObjectAttributeReferenceType;
      return { $type, value: fieldValue };
   }, []);

   const onSelect = (e: AutoCompleteSelectEvent): void => {
      const newValue = handleValue(e.value);
      setCurrentValue(newValue);
      if (editorCallback) {
         editorCallback(newValue);
      }
   };

   const onChange = (e: AutoCompleteChangeEvent): void => {
      const newValue = handleValue(e.value);
      setCurrentValue(newValue);
      if (editorCallback) {
         editorCallback(newValue);
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
      <AutoComplete
         ref={autoCompleteRef}
         value={currentValue?.value ?? ''}
         suggestions={suggestions}
         field='label'
         completeMethod={search}
         dropdown
         className={`w-full ${isDropdownOpen ? 'autocomplete-dropdown-open' : ''}`}
         onDropdownClick={handleDropdownClick}
         onChange={onChange}
         onSelect={onSelect}
         onShow={onShow}
         onHide={onHide}
         disabled={readonly}
         autoFocus
         onKeyDown={handleGridEditorKeyDown}
      />
   );
}

interface OperatorEditorProps {
   options: any;
}

const operatorOptions = ['=', '!=', '<', '<=', '>', '>='].map(op => ({ label: op, value: op }));

function OperatorEditor(props: OperatorEditorProps): React.ReactElement {
   const { options } = props;
   const { editorCallback } = options;

   const [currentValue, setCurrentValue] = React.useState(options.value);

   const onChange = (e: DropdownChangeEvent): void => {
      setCurrentValue(e.value);
      if (editorCallback) {
         editorCallback(e.value);
      }
   };

   return (
      <Dropdown
         value={currentValue}
         options={operatorOptions}
         onChange={onChange}
         className='w-full'
         autoFocus
         onKeyDown={handleGridEditorKeyDown}
      />
   );
}

export interface SourceObjectConditionRow {
   $type: typeof BinaryExpressionType;
   left: {
      $type: typeof SourceObjectAttributeReferenceType | typeof StringLiteralType | typeof NumberLiteralType;
      value: string;
   };
   operator: '!=' | '<' | '<=' | '=' | '>' | '>=';
   right: {
      $type: typeof SourceObjectAttributeReferenceType | typeof StringLiteralType | typeof NumberLiteralType;
      value: string;
   };
   idx: number;
   id: string;
   _uncommitted?: boolean;
}

export interface SourceObjectConditionDataGridProps {
   mapping: Mapping;
   sourceObjectIdx: number;
}

export function SourceObjectConditionDataGrid({ mapping, sourceObjectIdx }: SourceObjectConditionDataGridProps): React.ReactElement {
   const dispatch = useModelDispatch();
   const readonly = useReadonly();
   const rawDiagnostics = useDiagnostics();
   const [editingRows, setEditingRows] = React.useState<Record<string, boolean>>({});
   const [validationErrors, setValidationErrors] = React.useState<Record<string, string>>({});
   const [gridData, setGridData] = React.useState<SourceObjectConditionRow[]>([]);

   const sourceObject = mapping.sources[sourceObjectIdx];

   // Update grid data when conditions change, preserving any uncommitted rows
   React.useEffect(() => {
      setGridData(current => {
         // Map the committed conditions
         const committedData = (sourceObject?.conditions || []).map((condition: SourceObjectCondition, idx: number) => ({
            $type: condition.expression.$type,
            left: {
               $type: condition.expression.left.$type as
                  | typeof SourceObjectAttributeReferenceType
                  | typeof StringLiteralType
                  | typeof NumberLiteralType,
               value: condition.expression.left.value?.toString() || ''
            },
            operator: condition.expression.op,
            right: {
               $type: condition.expression.right.$type as
                  | typeof SourceObjectAttributeReferenceType
                  | typeof StringLiteralType
                  | typeof NumberLiteralType,
               value: condition.expression.right.value?.toString() || ''
            },
            idx,
            id: idx.toString()
         })) as SourceObjectConditionRow[];

         // Preserve any uncommitted rows that are currently being edited
         const uncommittedRows = current.filter(row => row._uncommitted && editingRows[row.id]);

         return [...committedData, ...uncommittedRows];
      });
   }, [sourceObject?.conditions, editingRows]);

   // Process diagnostics into validation errors
   React.useEffect(() => {
      const errors: Record<string, string> = {};

      try {
         sourceObject?.conditions?.forEach((condition, idx) => {
            const rowId = idx.toString();

            // Client-side validation for empty required fields
            if (!condition.expression.left?.value?.toString().trim()) {
               errors[`${rowId}.left`] = 'Left expression is required';
            }
            if (!condition.expression.op) {
               errors[`${rowId}.operator`] = 'Operator is required';
            }
            if (!condition.expression.right?.value?.toString().trim()) {
               errors[`${rowId}.right`] = 'Right expression is required';
            }

            // Server-side validation from diagnostics
            rawDiagnostics.forEach(diagnostic => {
               if (diagnostic.code?.toString().includes(`conditions[${idx}]`)) {
                  if (diagnostic.message.includes('left')) {
                     errors[`${rowId}.left`] = diagnostic.message;
                  } else if (diagnostic.message.includes('right')) {
                     errors[`${rowId}.right`] = diagnostic.message;
                  } else if (diagnostic.message.includes('operator')) {
                     errors[`${rowId}.operator`] = diagnostic.message;
                  }
               }
            });
         });

         setValidationErrors(errors);
      } catch (e) {
         console.error('Error processing diagnostics:', e);
      }
   }, [sourceObject?.conditions, rawDiagnostics]);

   const defaultEntry = React.useMemo<SourceObjectConditionRow>(
      () => ({
         $type: BinaryExpressionType,
         left: { $type: SourceObjectAttributeReferenceType, value: '' },
         operator: '=',
         right: { $type: SourceObjectAttributeReferenceType, value: '' },
         idx: -1,
         id: ''
      }),
      []
   );

   const onRowDelete = React.useCallback(
      (condition: SourceObjectConditionRow) => {
         dispatch({
            type: 'source-object:delete-condition',
            sourceObjectIdx,
            conditionIdx: condition.idx
         });
      },
      [dispatch, sourceObjectIdx]
   );

   const onRowUpdate = React.useCallback(
      (condition: SourceObjectConditionRow) => {
         // Clear any existing validation errors for this row
         const rowId = condition.id;
         setValidationErrors(current => {
            const updated = { ...current };
            Object.keys(updated).forEach(key => {
               if (key.startsWith(`${rowId}.`)) {
                  delete updated[key];
               }
            });
            return updated;
         });

         if (condition._uncommitted) {
            // For uncommitted rows, check if anything actually changed
            const hasChanges =
               condition.left.value !== defaultEntry.left.value ||
               condition.operator !== defaultEntry.operator ||
               condition.right.value !== defaultEntry.right.value;

            // Check if required fields are valid
            const isValid =
               condition.left.value?.trim() &&
               condition.right.value?.trim() &&
               condition.left.value !== '_' &&
               condition.left.value !== '-' &&
               condition.right.value !== '_' &&
               condition.right.value !== '-';

            if (!hasChanges || !isValid) {
               // Remove the row if no changes or invalid
               setGridData(current => current.filter(row => row.id !== condition.id));
               setEditingRows({});
               return;
            }

            // Add the new condition through dispatch
            dispatch({
               type: 'source-object:add-condition',
               sourceObjectIdx,
               condition: {
                  $type: JoinConditionType,
                  expression: {
                     $type: BinaryExpressionType,
                     left: condition.left as unknown as BooleanExpression,
                     op: condition.operator,
                     right: condition.right as unknown as BooleanExpression
                  }
               }
            });
         } else {
            // This is an existing row being updated
            if (
               !condition.left.value?.trim() ||
               condition.left.value === '_' ||
               condition.left.value === '-' ||
               !condition.right.value?.trim() ||
               condition.right.value === '_' ||
               condition.right.value === '-'
            ) {
               // Invalid values, delete the row
               onRowDelete(condition);
               return;
            }

            dispatch({
               type: 'source-object:update-condition',
               sourceObjectIdx,
               conditionIdx: condition.idx,
               condition: {
                  $type: JoinConditionType,
                  expression: {
                     $type: BinaryExpressionType,
                     left: condition.left as unknown as BooleanExpression,
                     op: condition.operator,
                     right: condition.right as unknown as BooleanExpression
                  }
               }
            });
         }

         // Clear editing state after successful update
         setEditingRows({});
      },
      [dispatch, sourceObjectIdx, onRowDelete, defaultEntry]
   );

   const onRowAdd = React.useCallback((): void => {
      // Clear any previous validation errors
      setValidationErrors({});

      // Clear any existing edit states first
      setEditingRows({});

      // Create a new uncommitted row with a unique temporary ID
      const tempRow: SourceObjectConditionRow = {
         ...defaultEntry,
         id: `temp-${Date.now()}-${Math.random().toString(36).substring(2)}`, // Ensure uniqueness
         _uncommitted: true,
         idx: -1
      };

      // Add to grid data and set it to editing mode
      setGridData(current => [...current, tempRow]);
      setEditingRows({ [tempRow.id]: true });
   }, [defaultEntry]);

   const onRowMoveUp = React.useCallback(
      (condition: SourceObjectConditionRow) => {
         dispatch({
            type: 'source-object:move-condition-up',
            sourceObjectIdx,
            conditionIdx: condition.idx
         });
      },
      [dispatch, sourceObjectIdx]
   );

   const onRowMoveDown = React.useCallback(
      (condition: SourceObjectConditionRow) => {
         dispatch({
            type: 'source-object:move-condition-down',
            sourceObjectIdx,
            conditionIdx: condition.idx
         });
      },
      [dispatch, sourceObjectIdx]
   );

   const columns = React.useMemo<GridColumn<SourceObjectConditionRow>[]>(
      () => [
         {
            field: 'left',
            header: 'Left Expression',
            body: rowData => {
               const error = validationErrors[`${rowData.id}.left`];
               const displayValue =
                  rowData.left.$type === StringLiteralType
                     ? quote(rowData.left.value)
                     : rowData.left.$type === NumberLiteralType
                       ? rowData.left.value.toString()
                       : rowData.left.value;
               return (
                  <div className={`grid-cell-container ${error ? 'p-invalid' : ''}`} title={error || undefined}>
                     <span>{displayValue}</span>
                     {error && <p className='p-error m-0'>{error}</p>}
                  </div>
               );
            },
            editor: (options: any) => <SourceObjectConditionEditor options={options} isLeft={true} sourceObject={sourceObject} />,
            filterType: 'text',
            filterField: 'left.value'
         },
         {
            field: 'operator',
            header: 'Operator',
            editor: (options: any) => <OperatorEditor options={options} />,
            filterType: 'multiselect',
            filterOptions: operatorOptions,
            showFilterMatchModes: false
         },
         {
            field: 'right',
            header: 'Right Expression',
            body: rowData => {
               if (rowData.right.$type === StringLiteralType) {
                  return quote(rowData.right.value);
               }
               if (rowData.right.$type === NumberLiteralType) {
                  return rowData.right.value.toString();
               }
               return rowData.right.value;
            },
            editor: (options: any) => <SourceObjectConditionEditor options={options} isLeft={false} sourceObject={sourceObject} />,
            filterType: 'text',
            filterField: 'right.value'
         }
      ],
      [sourceObject, validationErrors]
   );

   // Grid data is now managed by the useState and useEffect above

   if (!mapping || !sourceObject) {
      return <ErrorView errorMessage='No mapping or source object available' />;
   }

   return (
      <PrimeDataGrid
         className='source-object-condition-datatable'
         columns={columns}
         data={gridData}
         keyField='id'
         height='auto'
         onRowAdd={onRowAdd}
         onRowUpdate={onRowUpdate}
         onRowDelete={onRowDelete}
         onRowMoveUp={onRowMoveUp}
         onRowMoveDown={onRowMoveDown}
         defaultNewRow={defaultEntry}
         readonly={readonly}
         validationErrors={validationErrors}
         noDataMessage='No conditions'
         addButtonLabel='Add Condition'
         editingRows={editingRows}
         onRowEditChange={(e: DataTableRowEditEvent) => {
            const newEditingRows = e.data as Record<string, boolean>;
            const newEditingId = Object.keys(newEditingRows)[0];
            const currentEditingId = editingRows ? Object.keys(editingRows)[0] : undefined;

            // If we're stopping editing a row (either by cancelling or completing)
            if (currentEditingId && !newEditingRows[currentEditingId]) {
               const currentRow = gridData.find(row => row.id === currentEditingId);

               // Always remove uncommitted rows when editing stops
               if (currentRow?._uncommitted) {
                  setGridData(current => current.filter(row => row.id !== currentEditingId));
               }

               // Clear validation errors
               setValidationErrors({});
            }

            // Update editing state
            setEditingRows(newEditingRows);

            // Clean up any stale uncommitted rows
            setGridData(current => {
               // Keep all committed rows
               const committedRows = current.filter(row => !row._uncommitted);

               // For uncommitted rows, only keep the one being edited (if any)
               const activeUncommittedRow = newEditingId ? current.find(row => row._uncommitted && row.id === newEditingId) : undefined;

               return activeUncommittedRow ? [...committedRows, activeUncommittedRow] : committedRows;
            });
         }}
         globalFilterFields={['left.value', 'operator', 'right.value']}
      />
   );
}
