/********************************************************************************
 * Copyright (c) 2023 CrossBreeze.
 ********************************************************************************/
import {
   AttributeMapping,
   AttributeMappingSource,
   AttributeMappingSourceType,
   AttributeMappingType,
   CrossModelElement,
   CrossReferenceContext,
   NamedObject,
   ReferenceableElement,
   TargetObjectType
} from '@crossmodel/protocol';
import { AutoComplete } from 'primereact/autocomplete';
import * as React from 'react';
import { useModelDispatch, useModelQueryApi, useReadonly } from '../../ModelContext';
import { GridColumn, PrimeDataGrid } from './PrimeDataGrid';

interface AttributeMappingSourcesDataGridProps {
   attributeMapping: AttributeMapping;
   mappingIdx: number;
}

export interface AttributeMappingSourceRow extends Omit<AttributeMappingSource & CrossModelElement, 'value'> {
   idx: number;
   value: string;
}

export function AttributeMappingSourcesDataGrid({
   attributeMapping,
   mappingIdx
}: AttributeMappingSourcesDataGridProps): React.ReactElement {
   const dispatch = useModelDispatch();
   const queryApi = useModelQueryApi();
   const readonly = useReadonly();
   const [suggestions, setSuggestions] = React.useState<ReferenceableElement[]>([]);
   const [validationErrors, setValidationErrors] = React.useState<Record<string, string>>({});

   const referenceCtx: CrossReferenceContext = React.useMemo(
      () => ({
         container: { globalId: 'mapping_' + mappingIdx },
         syntheticElements: [
            { property: 'target', type: TargetObjectType },
            { property: 'mappings', type: AttributeMappingType },
            { property: 'sources', type: AttributeMappingSourceType }
         ],
         property: 'value'
      }),
      [mappingIdx]
   );

   const search = React.useCallback(
      async (event: { query: string }) => {
         const elements = await queryApi.findReferenceableElements(referenceCtx);
         setSuggestions(
            elements.map(e => ({
               ...e,
               label: (e as unknown as NamedObject).name || (e as unknown as NamedObject).$globalId || 'Unnamed Element'
            }))
         );
      },
      [queryApi, referenceCtx]
   );

   const onSourceAdd = React.useCallback(
      (sourceToAdd: AttributeMappingSourceRow) => {
         // Clear any previous validation errors
         setValidationErrors({});

         // Create a new source with empty value
         const sourceData: AttributeMappingSource = {
            $type: AttributeMappingSourceType,
            value: ''
         };

         dispatch({
            type: 'attribute-mapping:add-source',
            mappingIdx,
            source: sourceData
         });
      },
      [dispatch, mappingIdx]
   );

   const onSourceDelete = React.useCallback(
      (sourceToDelete: AttributeMappingSourceRow) => {
         dispatch({ type: 'attribute-mapping:delete-source', mappingIdx, sourceIdx: sourceToDelete.idx });
      },
      [dispatch, mappingIdx]
   );

   const onSourceUpdate = React.useCallback(
      (sourceToUpdate: AttributeMappingSourceRow) => {
         const errors = validateField(sourceToUpdate);
         if (Object.keys(errors).length > 0) {
            setValidationErrors(errors);
            return;
         }
         setValidationErrors({});
         dispatch({ type: 'attribute-mapping:update-source', mappingIdx, source: sourceToUpdate, sourceIdx: sourceToUpdate.idx });
      },
      [dispatch, mappingIdx]
   );

   const onSourceMoveUp = React.useCallback(
      (sourceToMove: AttributeMappingSourceRow) => {
         dispatch({ type: 'attribute-mapping:move-source-up', mappingIdx, sourceIdx: sourceToMove.idx });
      },
      [dispatch, mappingIdx]
   );

   const onSourceMoveDown = React.useCallback(
      (sourceToMove: AttributeMappingSourceRow) => {
         dispatch({ type: 'attribute-mapping:move-source-down', mappingIdx, sourceIdx: sourceToMove.idx });
      },
      [dispatch, mappingIdx]
   );

   const validateField = React.useCallback((rowData: AttributeMappingSourceRow): Record<string, string> => {
      const errors: Record<string, string> = {};
      if (!rowData.value) {
         errors.value = 'Invalid Value';
      }
      return errors;
   }, []);

   const columns: GridColumn<AttributeMappingSourceRow>[] = React.useMemo(
      () => [
         {
            field: 'value',
            header: 'Value',
            editor: true,
            body: rowData => (
               <AutoComplete
                  value={rowData.value}
                  suggestions={suggestions}
                  completeMethod={search}
                  field='label'
                  dropdown
                  forceSelection
                  onChange={e => onSourceUpdate({ ...rowData, value: e.value.label })}
                  disabled={readonly}
               />
            )
         }
      ],
      [suggestions, search, onSourceUpdate, readonly]
   );

   const defaultEntry = React.useMemo<AttributeMappingSourceRow>(
      () => ({
         $type: AttributeMappingSourceType,
         value: '',
         idx: -1
      }),
      []
   );

   if (!attributeMapping) {
      return <></>;
   }

   const gridData = React.useMemo(
      () =>
         (attributeMapping.sources || []).map((source: AttributeMappingSource, idx: number) => ({
            ...source,
            idx,
            value: String(source.value || '')
         })),
      [attributeMapping.sources]
   );

   return (
      <PrimeDataGrid
         columns={columns}
         data={gridData}
         keyField='idx'
         height='300px'
         onRowAdd={onSourceAdd}
         onRowUpdate={onSourceUpdate}
         onRowDelete={onSourceDelete}
         onRowMoveUp={onSourceMoveUp}
         onRowMoveDown={onSourceMoveDown}
         defaultNewRow={defaultEntry}
         readonly={readonly}
         validationErrors={validationErrors}
         noDataMessage='No source expressions'
         addButtonLabel='Add Source'
      />
   );
}
