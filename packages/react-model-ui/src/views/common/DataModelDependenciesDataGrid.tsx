/********************************************************************************
 * Copyright (c) 2025 CrossBreeze.
 ********************************************************************************/

import { CrossReferenceContext, DataModelDependency, DataModelDependencyType } from '@crossmodel/protocol';
import { AutoComplete } from 'primereact/autocomplete';
import * as React from 'react';
import { useDataModel, useModelDispatch, useModelQueryApi, useReadonly } from '../../ModelContext';
import { ErrorView } from '../ErrorView';
import { GridColumn, PrimeDataGrid } from './PrimeDataGrid';

export interface DataModelDependencyRow extends DataModelDependency {
   idx: number;
}

export function DataModelDependenciesDataGrid(): React.ReactElement {
   const dataModel = useDataModel();
   const dispatch = useModelDispatch();
   const queryApi = useModelQueryApi();
   const readonly = useReadonly();
   const [suggestions, setSuggestions] = React.useState<string[]>([]);
   const [validationErrors, setValidationErrors] = React.useState<Record<string, string>>({});

   const validateField = React.useCallback((rowData: DataModelDependencyRow): Record<string, string> => {
      const errors: Record<string, string> = {};
      if (!rowData.datamodel) {
         errors.datamodel = 'Invalid Data Model';
      }
      return errors;
   }, []);

   const referenceCtx: CrossReferenceContext = React.useMemo(
      () => ({
         container: { globalId: dataModel?.id || '' },
         syntheticElements: [{ property: 'dependencies', type: DataModelDependencyType }],
         property: 'datamodel'
      }),
      [dataModel]
   );

   const search = React.useCallback(
      async (event: { query: string }) => {
         const elements = await queryApi.findReferenceableElements(referenceCtx);
         setSuggestions(elements.map(element => element.label || ''));
      },
      [queryApi, referenceCtx]
   );

   const onRowUpdate = React.useCallback(
      (dependency: DataModelDependencyRow) => {
         const errors = validateField(dependency);
         if (Object.keys(errors).length > 0) {
            setValidationErrors(errors);
            return;
         }
         setValidationErrors({});
         dispatch({
            type: 'datamodel:dependency:update',
            dependencyIdx: dependency.idx,
            dependency: dependency
         });
      },
      [dispatch, validateField]
   );

   const onRowAdd = React.useCallback(
      (dependency: DataModelDependencyRow) => {
         // Clear any previous validation errors
         setValidationErrors({});

         // Create a new dependency with required fields
         const dependencyData: DataModelDependency = {
            $type: DataModelDependencyType,
            datamodel: '', // Start with empty string, will be filled via AutoComplete
            version: ''
         };

         dispatch({
            type: 'datamodel:dependency:add-dependency',
            dependency: dependencyData
         });
      },
      [dispatch]
   );

   const onRowDelete = React.useCallback(
      (dependency: DataModelDependencyRow) => {
         dispatch({
            type: 'datamodel:dependency:delete-dependency',
            dependencyIdx: dependency.idx
         });
      },
      [dispatch]
   );

   const onRowMoveUp = React.useCallback(
      (dependency: DataModelDependencyRow) => {
         dispatch({
            type: 'datamodel:dependency:move-dependency-up',
            dependencyIdx: dependency.idx
         });
      },
      [dispatch]
   );

   const onRowMoveDown = React.useCallback(
      (dependency: DataModelDependencyRow) => {
         dispatch({
            type: 'datamodel:dependency:move-dependency-down',
            dependencyIdx: dependency.idx
         });
      },
      [dispatch]
   );

   const columns = React.useMemo<GridColumn<DataModelDependencyRow>[]>(
      () => [
         {
            field: 'datamodel',
            header: 'Data Model',
            body: rowData => (
               <AutoComplete
                  value={rowData.datamodel}
                  suggestions={suggestions}
                  completeMethod={search}
                  field='label'
                  dropdown
                  className='w-full'
                  onChange={e => {
                     const updatedRow = { ...rowData, datamodel: e.value };
                     onRowUpdate(updatedRow);
                  }}
                  disabled={readonly}
               />
            )
         },
         {
            field: 'version',
            header: 'Version',
            editor: true,
            style: { width: '150px' }
         }
      ],
      [suggestions, search, onRowUpdate, readonly]
   );

   const defaultEntry = React.useMemo<Partial<DataModelDependencyRow>>(
      () => ({
         $type: DataModelDependencyType,
         datamodel: '',
         version: ''
      }),
      []
   );

   if (!dataModel) {
      return <ErrorView errorMessage='No data model available' />;
   }

   const gridData = React.useMemo(
      () =>
         (dataModel.dependencies || []).map((dep, idx) => ({
            ...dep,
            idx
         })),
      [dataModel.dependencies]
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
