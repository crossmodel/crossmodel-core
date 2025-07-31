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
   StringLiteralType
} from '@crossmodel/protocol';
import { AutoComplete } from 'primereact/autocomplete';
import * as React from 'react';
import { useModelDispatch, useModelQueryApi, useReadonly } from '../../ModelContext';
import { ErrorView } from '../ErrorView';
import { GridColumn, PrimeDataGrid } from './PrimeDataGrid';

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
}

export interface SourceObjectConditionDataGridProps {
   mapping: Mapping;
   sourceObjectIdx: number;
}

export function SourceObjectConditionDataGrid({ mapping, sourceObjectIdx }: SourceObjectConditionDataGridProps): React.ReactElement {
   const dispatch = useModelDispatch();
   const queryApi = useModelQueryApi();
   const readonly = useReadonly();
   const [leftSuggestions, setLeftSuggestions] = React.useState<ReferenceableElement[]>([]);
   const [rightSuggestions, setRightSuggestions] = React.useState<ReferenceableElement[]>([]);
   const [validationErrors, setValidationErrors] = React.useState<Record<string, string>>({});

   const sourceObject = mapping.sources[sourceObjectIdx];

   const leftReferenceCtx: CrossReferenceContext = React.useMemo(
      () => ({
         container: { globalId: sourceObject.$globalId },
         syntheticElements: [
            { property: 'conditions', type: JoinConditionType },
            { property: 'expression', type: BinaryExpressionType },
            { property: 'left', type: SourceObjectAttributeReferenceType }
         ],
         property: 'value'
      }),
      [sourceObject.$globalId]
   );

   const rightReferenceCtx: CrossReferenceContext = React.useMemo(
      () => ({
         container: { globalId: sourceObject.$globalId },
         syntheticElements: [
            { property: 'conditions', type: JoinConditionType },
            { property: 'expression', type: BinaryExpressionType },
            { property: 'right', type: SourceObjectAttributeReferenceType }
         ],
         property: 'value'
      }),
      [sourceObject.$globalId]
   );

   const searchLeft = React.useCallback(
      async (event: { query: string }) => {
         const elements = await queryApi.findReferenceableElements(leftReferenceCtx);
         setLeftSuggestions(elements);
      },
      [queryApi, leftReferenceCtx]
   );

   const searchRight = React.useCallback(
      async (event: { query: string }) => {
         const elements = await queryApi.findReferenceableElements(rightReferenceCtx);
         setRightSuggestions(elements);
      },
      [queryApi, rightReferenceCtx]
   );

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

   const columns = React.useMemo<GridColumn<SourceObjectConditionRow>[]>(
      () => [
         {
            field: 'left',
            header: 'Left Expression',
            body: rowData => (
               <AutoComplete
                  value={rowData.left?.value}
                  suggestions={leftSuggestions}
                  completeMethod={searchLeft}
                  field='label'
                  dropdown
                  onChange={e => onRowUpdate({ ...rowData, left: handleValue(e.value) })}
                  disabled={readonly}
               />
            )
         },
         {
            field: 'operator',
            header: 'Operator',
            editor: true
         },
         {
            field: 'right',
            header: 'Right Expression',
            body: rowData => (
               <AutoComplete
                  value={rowData.right?.value}
                  suggestions={rightSuggestions}
                  completeMethod={searchRight}
                  field='label'
                  dropdown
                  onChange={e => onRowUpdate({ ...rowData, right: handleValue(e.value) })}
                  disabled={readonly}
               />
            )
         }
      ],
      [leftSuggestions, rightSuggestions, searchLeft, searchRight, onRowUpdate, readonly, handleValue]
   );

   const defaultEntry = React.useMemo<SourceObjectConditionRow>(
      () => ({
         $type: BinaryExpressionType,
         left: { $type: SourceObjectAttributeReferenceType, value: '' },
         operator: '=',
         right: { $type: SourceObjectAttributeReferenceType, value: '' },
         idx: -1
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
            idx
         })) || [],
      [sourceObject.conditions]
   );

   return (
      <PrimeDataGrid
         columns={columns}
         data={gridData}
         keyField='idx'
         height='300px'
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
      />
   );
}
