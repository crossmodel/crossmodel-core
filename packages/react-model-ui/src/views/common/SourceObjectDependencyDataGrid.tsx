/********************************************************************************
 * Copyright (c) 2024 CrossBreeze.
 ********************************************************************************/
import {
   CrossReferenceContext,
   Mapping,
   ReferenceableElement,
   SourceObjectDependency,
   SourceObjectDependencyType
} from '@crossmodel/protocol';
import { AutoComplete } from 'primereact/autocomplete';
import * as React from 'react';
import { useModelDispatch, useModelQueryApi, useReadonly } from '../../ModelContext';
import { GridColumn, PrimeDataGrid } from './PrimeDataGrid';

export interface SourceObjectDependencyRow extends SourceObjectDependency {
   idx: number;
}

export interface SourceObjectDependencyDataGridProps {
   mapping: Mapping;
   sourceObjectIdx: number;
}

export function SourceObjectDependencyDataGrid({ mapping, sourceObjectIdx }: SourceObjectDependencyDataGridProps): React.ReactElement {
   const dispatch = useModelDispatch();
   const queryApi = useModelQueryApi();
   const readonly = useReadonly();
   const [suggestions, setSuggestions] = React.useState<ReferenceableElement[]>([]);
   const [validationErrors, setValidationErrors] = React.useState<Record<string, string>>({});

   const sourceObject = mapping.sources[sourceObjectIdx];

   const referenceCtx: CrossReferenceContext = React.useMemo(
      () => ({
         container: { globalId: sourceObject.$globalId },
         syntheticElements: [{ property: 'dependencies', type: SourceObjectDependencyType }],
         property: 'source'
      }),
      [sourceObject.$globalId]
   );

   const search = React.useCallback(
      async (event: { query: string }) => {
         const elements = await queryApi.findReferenceableElements(referenceCtx);
         setSuggestions(elements);
      },
      [queryApi, referenceCtx]
   );

   const onRowUpdate = React.useCallback(
      (dependency: SourceObjectDependencyRow) => {
         const errors = validateField(dependency);
         if (Object.keys(errors).length > 0) {
            setValidationErrors(errors);
            return;
         }
         setValidationErrors({});
         dispatch({
            type: 'source-object:update-dependency',
            sourceObjectIdx,
            dependencyIdx: dependency.idx,
            dependency: dependency
         });
      },
      [dispatch, sourceObjectIdx]
   );

   const onRowAdd = React.useCallback(
      (dependency: SourceObjectDependencyRow) => {
         if (dependency.source) {
            dispatch({
               type: 'source-object:add-dependency',
               sourceObjectIdx,
               dependency: {
                  $type: SourceObjectDependencyType,
                  source: dependency.source
               }
            });
         }
      },
      [dispatch, sourceObjectIdx]
   );

   const onRowDelete = React.useCallback(
      (dependency: SourceObjectDependencyRow) => {
         dispatch({
            type: 'source-object:delete-dependency',
            sourceObjectIdx,
            dependencyIdx: dependency.idx
         });
      },
      [dispatch, sourceObjectIdx]
   );

   const onRowMoveUp = React.useCallback(
      (dependency: SourceObjectDependencyRow) => {
         dispatch({
            type: 'source-object:move-dependency-up',
            sourceObjectIdx,
            dependencyIdx: dependency.idx
         });
      },
      [dispatch, sourceObjectIdx]
   );

   const onRowMoveDown = React.useCallback(
      (dependency: SourceObjectDependencyRow) => {
         dispatch({
            type: 'source-object:move-dependency-down',
            sourceObjectIdx,
            dependencyIdx: dependency.idx
         });
      },
      [dispatch, sourceObjectIdx]
   );

   const validateField = React.useCallback((rowData: SourceObjectDependencyRow): Record<string, string> => {
      const errors: Record<string, string> = {};
      if (!rowData.source) {
         errors.source = 'Source is required';
      }
      return errors;
   }, []);

   const columns = React.useMemo<GridColumn<SourceObjectDependencyRow>[]>(
      () => [
         {
            field: 'source',
            header: 'Source',
            body: rowData => (
               <AutoComplete
                  value={rowData.source}
                  suggestions={suggestions}
                  completeMethod={search}
                  field='label'
                  dropdown
                  onChange={e => onRowUpdate({ ...rowData, source: e.value.uri })}
                  disabled={readonly}
               />
            )
         }
      ],
      [suggestions, search, onRowUpdate, readonly]
   );

   const defaultEntry = React.useMemo<SourceObjectDependencyRow>(
      () => ({
         $type: SourceObjectDependencyType,
         source: '',
         idx: -1
      }),
      []
   );

   if (!mapping || !sourceObject) {
      return <div>No mapping or source object available</div>;
   }

   const gridData = React.useMemo(
      () =>
         (sourceObject.dependencies || []).map((dep, idx) => ({
            ...dep,
            idx
         })),
      [sourceObject.dependencies]
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
         noDataMessage='No dependencies'
         addButtonLabel='Add Dependency'
      />
   );
}
