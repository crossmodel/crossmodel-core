/********************************************************************************
 * Copyright (c) 2023 CrossBreeze.
 ********************************************************************************/
import { CrossReferenceContext, ModelDiagnostic, RelationshipAttribute, RelationshipAttributeType } from '@crossmodel/protocol';
import { AutoComplete } from 'primereact/autocomplete';
import * as React from 'react';
import { useModelDispatch, useModelQueryApi, useReadonly, useRelationship } from '../../ModelContext';
import { ErrorView } from '../ErrorView';
import { GridColumn, PrimeDataGrid } from './PrimeDataGrid';

function getDiagnosticKey(row: { idx: number }, field: string): string {
   return `attributes[${row.idx}].${field}`;
}

export interface AttributePropertyProps {
   field: string;
   row: { idx: number };
   diagnostics: Record<string, ModelDiagnostic[] | undefined>;
   value: string;
}

export function AttributeProperty({ field, row, diagnostics, value }: AttributePropertyProps): React.ReactNode {
   const relevantDiagnostics = diagnostics[getDiagnosticKey(row, field)];
   const title = relevantDiagnostics?.[0]?.message || value;
   return <div title={title}>{value}</div>;
}

export interface RelationshipAttributeRow extends RelationshipAttribute {
   idx: number;
}

export interface RelationshipAttributeDataGridProps {
   diagnostics: Record<string, ModelDiagnostic[] | undefined>;
}

export function RelationshipAttributesDataGrid({ diagnostics }: RelationshipAttributeDataGridProps): React.ReactElement {
   const relationship = useRelationship();
   const dispatch = useModelDispatch();
   const queryApi = useModelQueryApi();
   const readonly = useReadonly();
   const [parentSuggestions, setParentSuggestions] = React.useState<string[]>([]);
   const [childSuggestions, setChildSuggestions] = React.useState<string[]>([]);
   const [validationErrors, setValidationErrors] = React.useState<Record<string, string>>({});

   const parentReferenceCtx: CrossReferenceContext = React.useMemo(
      () => ({
         container: { globalId: relationship?.id || '' },
         syntheticElements: [{ property: 'attributes', type: RelationshipAttributeType }],
         property: 'parent'
      }),
      [relationship]
   );

   const childReferenceCtx: CrossReferenceContext = React.useMemo(
      () => ({
         container: { globalId: relationship?.id || '' },
         syntheticElements: [{ property: 'attributes', type: RelationshipAttributeType }],
         property: 'child'
      }),
      [relationship]
   );

   const searchParent = React.useCallback(
      async (event: { query: string }) => {
         const elements = await queryApi.findReferenceableElements(parentReferenceCtx);
         setParentSuggestions(elements.map(element => element.label || ''));
      },
      [queryApi, parentReferenceCtx]
   );

   const searchChild = React.useCallback(
      async (event: { query: string }) => {
         const elements = await queryApi.findReferenceableElements(childReferenceCtx);
         setChildSuggestions(elements.map(element => element.label || ''));
      },
      [queryApi, childReferenceCtx]
   );

   const onRowUpdate = React.useCallback(
      (attribute: RelationshipAttributeRow) => {
         const errors = validateField(attribute);
         if (Object.keys(errors).length > 0) {
            setValidationErrors(errors);
            return;
         }
         setValidationErrors({});
         dispatch({
            type: 'relationship:attribute:update',
            attributeIdx: attribute.idx,
            attribute: attribute
         });
      },
      [dispatch]
   );

   const onRowAdd = React.useCallback(
      (attribute: RelationshipAttributeRow) => {
         // Clear any previous validation errors
         setValidationErrors({});

         // Create a new attribute with empty values
         const attributeData: RelationshipAttribute = {
            $type: RelationshipAttributeType,
            parent: attribute.parent || '',
            child: attribute.child || ''
         };

         dispatch({
            type: 'relationship:attribute:add',
            attribute: attributeData
         });
      },
      [dispatch]
   );

   const onRowDelete = React.useCallback(
      (attribute: RelationshipAttributeRow) => {
         dispatch({
            type: 'relationship:attribute:delete-attribute',
            attributeIdx: attribute.idx
         });
      },
      [dispatch]
   );

   const onRowMoveUp = React.useCallback(
      (attribute: RelationshipAttributeRow) => {
         dispatch({
            type: 'relationship:attribute:move-attribute-up',
            attributeIdx: attribute.idx
         });
      },
      [dispatch]
   );

   const onRowMoveDown = React.useCallback(
      (attribute: RelationshipAttributeRow) => {
         dispatch({
            type: 'relationship:attribute:move-attribute-down',
            attributeIdx: attribute.idx
         });
      },
      [dispatch]
   );

   const validateField = React.useCallback((rowData: RelationshipAttributeRow): Record<string, string> => {
      const errors: Record<string, string> = {};
      if (!rowData.parent) {
         errors.parent = 'Invalid Parent';
      }
      if (!rowData.child) {
         errors.child = 'Invalid Child';
      }
      return errors;
   }, []);

   const columns = React.useMemo<GridColumn<RelationshipAttributeRow>[]>(
      () => [
         {
            field: 'parent',
            header: 'Parent',
            body: rowData => (
               <AutoComplete
                  value={rowData.parent}
                  suggestions={parentSuggestions}
                  completeMethod={searchParent}
                  field='label'
                  dropdown
                  forceSelection
                  onChange={e => onRowUpdate({ ...rowData, parent: e.value })}
                  disabled={readonly}
               />
            )
         },
         {
            field: 'child',
            header: 'Child',
            body: rowData => (
               <AutoComplete
                  value={rowData.child}
                  suggestions={childSuggestions}
                  completeMethod={searchChild}
                  field='label'
                  dropdown
                  forceSelection
                  onChange={e => onRowUpdate({ ...rowData, child: e.value })}
                  disabled={readonly}
               />
            )
         }
      ],
      [parentSuggestions, childSuggestions, searchParent, searchChild, onRowUpdate, readonly]
   );

   const defaultEntry = React.useMemo<RelationshipAttributeRow>(
      () => ({
         $type: RelationshipAttributeType,
         parent: '',
         child: '',
         idx: -1
      }),
      []
   );

   if (!relationship) {
      return <ErrorView errorMessage='No relationship available' />;
   }

   const gridData = React.useMemo(
      () =>
         (relationship.attributes || []).map((attr, idx) => ({
            ...attr,
            idx
         })),
      [relationship.attributes]
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
         noDataMessage='No attributes'
         addButtonLabel='Add Attribute'
      />
   );
}
