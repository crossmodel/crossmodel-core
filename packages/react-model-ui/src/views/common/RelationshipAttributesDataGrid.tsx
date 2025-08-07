/********************************************************************************
 * Copyright (c) 2023 CrossBreeze.
 ********************************************************************************/
import { CrossReferenceContext, ModelDiagnostic, RelationshipAttribute, RelationshipAttributeType } from '@crossmodel/protocol';
import { AutoComplete, AutoCompleteCompleteEvent, AutoCompleteSelectEvent } from 'primereact/autocomplete';
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

interface RelationshipAttributeEditorProps {
   options: any;
   isParent: boolean;
}

function RelationshipAttributeEditor(props: RelationshipAttributeEditorProps): React.ReactElement {
   const { options, isParent } = props;
   const { editorCallback } = options;

   const [currentValue, setCurrentValue] = React.useState(options.value);
   const [suggestions, setSuggestions] = React.useState<string[]>([]);
   const queryApi = useModelQueryApi();
   const relationship = useRelationship();
   const readonly = useReadonly();
   const isDropdownClicked = React.useRef(false);

   const referenceCtx: CrossReferenceContext = React.useMemo(
      () => ({
         container: { globalId: relationship?.id || '' },
         syntheticElements: [{ property: 'attributes', type: RelationshipAttributeType }],
         property: isParent ? 'parent' : 'child'
      }),
      [relationship, isParent]
   );

   const search = React.useCallback(
      async (event: AutoCompleteCompleteEvent) => {
         const elements = await queryApi.findReferenceableElements(referenceCtx);
         const filteredSuggestions = elements
            .map(element => element.label || '')
            .filter(label =>
               isDropdownClicked.current ? true : event.query ? label.toLowerCase().includes(event.query.toLowerCase()) : true
            );
         setSuggestions(filteredSuggestions);
         isDropdownClicked.current = false;
      },
      [queryApi, referenceCtx]
   );

   const onSelect = (e: AutoCompleteSelectEvent) => {
      setCurrentValue(e.value);
      if (editorCallback) {
         editorCallback(e.value);
      }
   };

   return (
      <AutoComplete
         value={currentValue ?? ''}
         suggestions={suggestions}
         completeMethod={search}
         dropdown
         className='w-full'
         onDropdownClick={() => (isDropdownClicked.current = true)}
         onChange={e => setCurrentValue(e.value)}
         onSelect={onSelect}
         disabled={readonly}
         autoFocus
      />
   );
}

export function RelationshipAttributesDataGrid({ diagnostics }: RelationshipAttributeDataGridProps): React.ReactElement {
   const relationship = useRelationship();
   const dispatch = useModelDispatch();
   const readonly = useReadonly();
   const [validationErrors, setValidationErrors] = React.useState<Record<string, string>>({});

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
            editor: (options: any) => <RelationshipAttributeEditor options={options} isParent={true} />
         },
         {
            field: 'child',
            header: 'Child',
            editor: (options: any) => <RelationshipAttributeEditor options={options} isParent={false} />
         }
      ],
      []
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
         className='relationship-attributes-datatable'
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
