/********************************************************************************
 * Copyright (c) 2025 CrossBreeze.
 ********************************************************************************/

import { CrossReferenceContext, DataModelDependency, DataModelDependencyType } from '@crossmodel/protocol';
import { AutoComplete, AutoCompleteCompleteEvent, AutoCompleteSelectEvent } from 'primereact/autocomplete';
import { DataTableRowEditEvent } from 'primereact/datatable';
import * as React from 'react';
import { useDataModel, useModelDispatch, useModelQueryApi, useReadonly } from '../../ModelContext';
import { ErrorView } from '../ErrorView';
import { GridColumn, PrimeDataGrid } from './PrimeDataGrid';

export interface DataModelDependencyRow extends DataModelDependency {
   idx: number;
   id: string; // Added id field
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
   const [editingRows, setEditingRows] = React.useState<Record<string, boolean>>({});
   const [validationErrors, setValidationErrors] = React.useState<Record<string, string>>({});

   const validateField = React.useCallback((rowData: DataModelDependencyRow): Record<string, string> => {
      const errors: Record<string, string> = {};
      if (!rowData.datamodel) {
         errors.datamodel = 'Invalid Data Model';
      }
      return errors;
   }, []);

   const gridData = React.useMemo(
      () =>
         (dataModel.dependencies || []).map((dep, idx) => ({
            ...dep,
            idx,
            id: (dep as any).id || idx.toString() // Ensure id is present for keyField
         })) as DataModelDependencyRow[],
      [dataModel.dependencies]
   );

   const defaultEntry = React.useMemo<Partial<DataModelDependencyRow>>(
      () => ({
         $type: DataModelDependencyType,
         datamodel: '',
         version: '',
         id: '' // Default id for new entries
      }),
      []
   );

   const onRowUpdate = React.useCallback(
      (dependency: DataModelDependencyRow) => {
         if (dependency.datamodel === defaultEntry.datamodel && dependency.version === defaultEntry.version) {
            console.log('Not saving default new dependency.');
            return;
         }
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
      [dispatch, defaultEntry, validateField]
   );

   const onRowAdd = React.useCallback(
      (dependency: DataModelDependencyRow) => {
         setValidationErrors({});
         const newId = (dependency.id || gridData.length.toString()); // Generate a unique ID
         const dependencyData: DataModelDependencyRow = {
            $type: DataModelDependencyType,
            datamodel: dependency.datamodel as string,
            version: dependency.version || '',
            id: newId,
            idx: -1
         };
         dispatch({
            type: 'datamodel:dependency:add-dependency',
            dependency: dependencyData
         });
         setEditingRows({ [newId]: true });
      },
      [dispatch, gridData]
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
            headerStyle: { width: '150px' }
         }
      ],
      []
   );

   if (!dataModel) {
      return <ErrorView errorMessage='No data model available' />;
   }

   return (
      <PrimeDataGrid
         className='data-model-dependencies-datatable'
         columns={columns}
         data={gridData}
         keyField='id' // Changed keyField to id
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
         editingRows={editingRows}
         onRowEditChange={(e: DataTableRowEditEvent) => setEditingRows(e.data as Record<string, boolean>)}
      />
   );
}
