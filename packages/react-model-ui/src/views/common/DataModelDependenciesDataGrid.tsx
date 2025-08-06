/********************************************************************************
 * Copyright (c) 2025 CrossBreeze.
 ********************************************************************************/

import { CrossReferenceContext, DataModelDependency, DataModelDependencyType } from '@crossmodel/protocol';
import { AutoComplete, AutoCompleteCompleteEvent, AutoCompleteSelectEvent } from 'primereact/autocomplete';
import * as React from 'react';
import { useDataModel, useModelDispatch, useModelQueryApi, useReadonly } from '../../ModelContext';
import { ErrorView } from '../ErrorView';
import { GridColumn, PrimeDataGrid } from './PrimeDataGrid';

export interface DataModelDependencyRow extends DataModelDependency {
   idx: number;
}

interface DataModelDependencyEditorProps {
   options: any;
}

function DataModelDependencyEditor(props: DataModelDependencyEditorProps): React.ReactElement {
   const { options } = props;
   const { editorCallback } = options;

   const [currentValue, setCurrentValue] = React.useState(options.value);
   const [suggestions, setSuggestions] = React.useState<string[]>([]);
   const queryApi = useModelQueryApi();
   const dataModel = useDataModel();
   const readonly = useReadonly();
   const isDropdownClicked = React.useRef(false);

   const referenceCtx: CrossReferenceContext = React.useMemo(
      () => ({
         container: { globalId: dataModel?.id || '' },
         syntheticElements: [{ property: 'dependencies', type: DataModelDependencyType }],
         property: 'datamodel'
      }),
      [dataModel]
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

export function DataModelDependenciesDataGrid(): React.ReactElement {
   const dataModel = useDataModel();
   const dispatch = useModelDispatch();
   const readonly = useReadonly();
   const [validationErrors, setValidationErrors] = React.useState<Record<string, string>>({});

   const validateField = React.useCallback((rowData: DataModelDependencyRow): Record<string, string> => {
      const errors: Record<string, string> = {};
      if (!rowData.datamodel) {
         errors.datamodel = 'Invalid Data Model';
      }
      return errors;
   }, []);

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
         setValidationErrors({});
         const dependencyData: DataModelDependency = {
            $type: DataModelDependencyType,
            datamodel: dependency.datamodel as string,
            version: dependency.version || ''
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
            editor: (options: any) => <DataModelDependencyEditor options={options} />
         },
         {
            field: 'version',
            header: 'Version',
            editor: true,
            style: { width: '150px' }
         }
      ],
      []
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
            datamodel: dep.datamodel ?? '',
            version: dep.version ?? '',
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
