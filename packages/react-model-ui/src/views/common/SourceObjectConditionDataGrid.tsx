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
import { useModelDispatch, useModelQueryApi, useReadonly } from '../../ModelContext';
import { ErrorView } from '../ErrorView';
import { GridColumn, PrimeDataGrid } from './PrimeDataGrid';

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

   const onSelect = (e: AutoCompleteSelectEvent) => {
      const newValue = handleValue(e.value);
      setCurrentValue(newValue);
      if (editorCallback) {
         editorCallback(newValue);
      }
   };

   const onChange = (e: AutoCompleteChangeEvent) => {
      const newValue = handleValue(e.value);
      setCurrentValue(newValue);
      if (editorCallback) {
         editorCallback(newValue);
      }
   };

   const handleDropdownClick = (event: AutoCompleteDropdownClickEvent) => {
      isDropdownClicked.current = true;

      // Check if dropdown is currently visible
      setTimeout(() => {
         const panel = autoCompleteRef.current?.getOverlay();
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

   const onShow = () => {
      setIsDropdownOpen(true);
   };

   const onHide = () => {
      setIsDropdownOpen(false);
   };

   // Handle click outside to close dropdown
   React.useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
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

   const onChange = (e: DropdownChangeEvent) => {
      setCurrentValue(e.value);
      if (editorCallback) {
         editorCallback(e.value);
      }
   };

   return <Dropdown value={currentValue} options={operatorOptions} onChange={onChange} className='w-full' autoFocus />;
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
}

export interface SourceObjectConditionDataGridProps {
   mapping: Mapping;
   sourceObjectIdx: number;
}

export function SourceObjectConditionDataGrid({ mapping, sourceObjectIdx }: SourceObjectConditionDataGridProps): React.ReactElement {
   const dispatch = useModelDispatch();
   const readonly = useReadonly();
   const [editingRows, setEditingRows] = React.useState<Record<string, boolean>>({});
   const [validationErrors, setValidationErrors] = React.useState<Record<string, string>>({});

   const sourceObject = mapping.sources[sourceObjectIdx];

   const onRowUpdate = React.useCallback(
      (condition: SourceObjectConditionRow) => {
         const errors = validateField(condition);
         if (Object.keys(errors).length > 0) {
            setValidationErrors(errors);
            return;
         }
         setValidationErrors({});
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
      },
      [dispatch, sourceObjectIdx]
   );

   const onRowAdd = React.useCallback(
      (condition: SourceObjectConditionRow) => {
         dispatch({
            type: 'source-object:add-condition',
            sourceObjectIdx,
            condition: {
               $type: JoinConditionType,
               expression: {
                  $type: BinaryExpressionType,
                  left: {
                     $type: condition.left.$type,
                     value: condition.left.value
                  } as BooleanExpression,
                  op: condition.operator,
                  right: {
                     $type: condition.right.$type,
                     value: condition.right.value
                  } as BooleanExpression
               }
            }
         });
      },
      [dispatch, sourceObjectIdx]
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

   const validateField = React.useCallback((rowData: SourceObjectConditionRow): Record<string, string> => {
      const errors: Record<string, string> = {};
      if (!rowData.left?.value) {
         errors.left = 'Left value required';
      }
      if (!rowData.operator) {
         errors.operator = 'Operator required';
      }
      if (!rowData.right?.value) {
         errors.right = 'Right value required';
      }
      return errors;
   }, []);

   const columns = React.useMemo<GridColumn<SourceObjectConditionRow>[]>(
      () => [
         {
            field: 'left',
            header: 'Left Expression',
            body: rowData => {
               if (rowData.left.$type === StringLiteralType) {
                  return quote(rowData.left.value);
               }
               return rowData.left.value;
            },
            editor: (options: any) => <SourceObjectConditionEditor options={options} isLeft={true} sourceObject={sourceObject} />,
            filterType: 'text'
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
               return rowData.right.value;
            },
            editor: (options: any) => <SourceObjectConditionEditor options={options} isLeft={false} sourceObject={sourceObject} />,
            filterType: 'text'
         }
      ],
      [sourceObject, readonly]
   );

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

   if (!mapping || !sourceObject) {
      return <ErrorView errorMessage='No mapping or source object available' />;
   }

   const gridData = React.useMemo(
      () =>
         sourceObject.conditions?.map((condition: SourceObjectCondition, idx: number) => ({
            $type: condition.expression.$type,
            left: {
               $type: condition.expression.left.$type as
                  | typeof SourceObjectAttributeReferenceType
                  | typeof StringLiteralType
                  | typeof NumberLiteralType,
               value: typeof condition.expression.left.value === 'string' ? condition.expression.left.value : ''
            },
            operator: condition.expression.op,
            right: {
               $type: condition.expression.right.$type as
                  | typeof SourceObjectAttributeReferenceType
                  | typeof StringLiteralType
                  | typeof NumberLiteralType,
               value: typeof condition.expression.right.value === 'string' ? condition.expression.right.value : ''
            },
            idx,
            id: idx.toString()
         })) || [],
      [sourceObject.conditions]
   );

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
         onRowEditChange={(e: DataTableRowEditEvent) => setEditingRows(e.data as Record<string, boolean>)}
      />
   );
}
