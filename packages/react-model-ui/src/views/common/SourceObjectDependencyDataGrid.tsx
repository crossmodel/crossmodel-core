/********************************************************************************
 * Copyright (c) 2024 CrossBreeze.
 ********************************************************************************/
import {
   CrossReferenceContext,
   Mapping,
   ReferenceableElement,
   SourceObject,
   SourceObjectDependency,
   SourceObjectDependencyType
} from '@crossmodel/protocol';
import { AutoComplete, AutoCompleteChangeEvent, AutoCompleteCompleteEvent, AutoCompleteDropdownClickEvent } from 'primereact/autocomplete';
import { DataTableRowEditEvent } from 'primereact/datatable';
import * as React from 'react';
import { useModelDispatch, useModelQueryApi, useReadonly } from '../../ModelContext';
import { GridColumn, PrimeDataGrid } from './PrimeDataGrid';
import { handleGridEditorKeyDown } from './gridKeydownHandler';

interface SourceObjectDependencyEditorProps {
   options: any;
   sourceObject: SourceObject;
}

function SourceObjectDependencyEditor(props: SourceObjectDependencyEditorProps): React.ReactElement {
   const { options, sourceObject } = props;
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
         syntheticElements: [{ property: 'dependencies', type: SourceObjectDependencyType }],
         property: 'source'
      }),
      [sourceObject.$globalId]
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

   const onChange = (e: AutoCompleteChangeEvent) => {
      const value = e.value;
      // eslint-disable-next-line no-null/no-null
      if (typeof value === 'object' && value !== null && value.label) {
         setCurrentValue(value.label);
         if (editorCallback) {
            editorCallback(value.label);
         }
      } else {
         setCurrentValue(value);
         if (editorCallback) {
            editorCallback(value);
         }
      }
   };

   const handleDropdownClick = (event: AutoCompleteDropdownClickEvent) => {
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
         value={currentValue ?? ''}
         suggestions={suggestions}
         field='label'
         completeMethod={search}
         dropdown
         className={`w-full ${isDropdownOpen ? 'autocomplete-dropdown-open' : ''}`}
         onDropdownClick={handleDropdownClick}
         onChange={onChange}
         onShow={onShow}
         onHide={onHide}
         disabled={readonly}
         autoFocus
         onKeyDown={handleGridEditorKeyDown}
      />
   );
}

export interface SourceObjectDependencyRow extends SourceObjectDependency {
   idx: number;
   id: string;
}

export interface SourceObjectDependencyDataGridProps {
   mapping: Mapping;
   sourceObjectIdx: number;
}

export function SourceObjectDependencyDataGrid({ mapping, sourceObjectIdx }: SourceObjectDependencyDataGridProps): React.ReactElement {
   const dispatch = useModelDispatch();
   const readonly = useReadonly();
   const [editingRows, setEditingRows] = React.useState<Record<string, boolean>>({});
   const [validationErrors, setValidationErrors] = React.useState<Record<string, string>>({});

   const sourceObject = mapping.sources[sourceObjectIdx];

   const gridData = React.useMemo(
      () =>
         (sourceObject.dependencies || []).map((dep, idx) => ({
            ...dep,
            idx,
            id: (dep as any).id || idx.toString()
         })) as SourceObjectDependencyRow[],
      [sourceObject.dependencies]
   );

   const sourceOptions = React.useMemo(() => {
      const uniqueSources = [...new Set(gridData.map(item => item.source).filter(Boolean))];
      return uniqueSources.map(s => ({ label: s, value: s }));
   }, [gridData]);

   const onRowUpdate = React.useCallback(
      (dependency: SourceObjectDependencyRow) => {
         const errors = validateField(dependency);
         if (Object.keys(errors).length > 0) {
            setValidationErrors(errors);
            return;
         }
         setValidationErrors({});
         const { ...dependencyToUpdate } = dependency;
         dispatch({
            type: 'source-object:update-dependency',
            sourceObjectIdx,
            dependencyIdx: dependency.idx,
            dependency: dependencyToUpdate
         });
      },
      [dispatch, sourceObjectIdx]
   );

   const onRowAdd = React.useCallback(
      (dependency: SourceObjectDependencyRow) => {
         setValidationErrors({});
         const newId = dependency.id || gridData.length.toString();
         const dependencyData: SourceObjectDependency = {
            $type: SourceObjectDependencyType,
            source: dependency.source
         };

         dispatch({
            type: 'source-object:add-dependency',
            sourceObjectIdx,
            dependency: dependencyData
         });
         setEditingRows({ [newId]: true });
      },
      [dispatch, sourceObjectIdx, gridData]
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
            body: rowData => rowData.source,
            editor: (options: any) => <SourceObjectDependencyEditor options={options} sourceObject={sourceObject} />,
            filterType: 'multiselect',
            filterOptions: sourceOptions,
            showFilterMatchModes: false
         }
      ],
      [sourceObject, sourceOptions]
   );

   const defaultEntry = React.useMemo<Partial<SourceObjectDependencyRow>>(
      () => ({
         $type: SourceObjectDependencyType,
         source: '',
         id: ''
      }),
      []
   );

   if (!mapping || !sourceObject) {
      return <div>No mapping or source object available</div>;
   }

   return (
      <PrimeDataGrid
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
         noDataMessage='No dependencies'
         addButtonLabel='Add Dependency'
         editingRows={editingRows}
         onRowEditChange={(e: DataTableRowEditEvent) => setEditingRows(e.data as Record<string, boolean>)}
      />
   );
}
