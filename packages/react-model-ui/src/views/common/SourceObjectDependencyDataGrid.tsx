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
import { useDiagnostics, useModelDispatch, useModelQueryApi, useReadonly } from '../../ModelContext';
import { GridColumn, PrimeDataGrid } from './PrimeDataGrid';
import { handleGridEditorKeyDown } from './gridKeydownHandler';

interface SourceObjectDependencyEditorProps {
   options: any;
   sourceObject: SourceObject;
}

function SourceObjectDependencyEditor(props: SourceObjectDependencyEditorProps): React.ReactElement {
   const { options, sourceObject } = props;
   const { editorCallback } = options;

   const [currentValue, setCurrentValue] = React.useState(options.value || '_');
   const [suggestions, setSuggestions] = React.useState<ReferenceableElement[]>([]);
   const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);
   const queryApi = useModelQueryApi();
   const readonly = useReadonly();
   const rawDiagnostics = useDiagnostics();
   const [processedDiagnostics, setProcessedDiagnostics] = React.useState<Record<string, string>>({});

   // Process diagnostics for this field
   React.useEffect(() => {
      try {
         const diagnostics: Record<string, string> = {};
         const key = `dependencies[${options.rowData.idx}].source`;

         // Clear previous diagnostics
         setProcessedDiagnostics({});

         rawDiagnostics.forEach(diagnostic => {
            const diagnosticCode = String(diagnostic.code);

            if (diagnostic.message.includes('Could not resolve reference')) {
               // Check if this diagnostic is specifically for this field
               if (diagnosticCode.includes(key)) {
                  diagnostics[key] = diagnostic.message;
               }
               // Only check the value if we have a non-empty current value
               else if (
                  options.rowData.source &&
                  !options.rowData.source.trim().startsWith('_') &&
                  diagnostic.message.includes(options.rowData.source)
               ) {
                  diagnostics[key] = diagnostic.message;
               }
            }
         });

         setProcessedDiagnostics(diagnostics);
      } catch (e) {
         console.error('Error processing diagnostics:', e);
      }

      // Cleanup function to clear diagnostics when component unmounts
      return () => {
         setProcessedDiagnostics({});
      };
   }, [rawDiagnostics, options.rowData, currentValue]);
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

   const onChange = (e: AutoCompleteChangeEvent): void => {
      const value = e.value;
      // eslint-disable-next-line no-null/no-null
      let finalValue = '_'; // Default value if nothing is selected

      if (typeof value === 'object' && value !== null && value.label) {
         finalValue = value.label;
      } else if (value) {
         finalValue = value;
      }

      setCurrentValue(finalValue);

      if (editorCallback) {
         editorCallback(finalValue);
      }
   };

   const handleDropdownClick = (event: AutoCompleteDropdownClickEvent): void => {
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

   const onShow = (): void => {
      setIsDropdownOpen(true);
   };

   const onHide = (): void => {
      setIsDropdownOpen(false);
   };

   // Handle click outside to close dropdown
   React.useEffect(() => {
      const handleClickOutside = (event: MouseEvent): void => {
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

   const diagnosticKey = `dependencies[${options.rowData.idx}].source`;
   const errorMessage = processedDiagnostics[diagnosticKey];

   return (
      <div className='grid-editor-container'>
         <div className={`p-field ${errorMessage ? 'p-error' : ''}`}>
            <AutoComplete
               ref={autoCompleteRef}
               value={currentValue ?? ''}
               suggestions={suggestions}
               field='label'
               completeMethod={search}
               dropdown
               className={`w-full ${isDropdownOpen ? 'autocomplete-dropdown-open' : ''} ${errorMessage ? 'p-invalid' : ''}`}
               onDropdownClick={handleDropdownClick}
               onChange={onChange}
               onShow={onShow}
               onHide={onHide}
               disabled={readonly}
               autoFocus
               onKeyDown={handleGridEditorKeyDown}
            />
            {errorMessage && <small className='p-error block'>{errorMessage}</small>}
         </div>
      </div>
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
   const rawDiagnostics = useDiagnostics();
   const sourceObject = mapping.sources[sourceObjectIdx];
   const [processedDiagnostics, setProcessedDiagnostics] = React.useState<Record<string, string>>({});
   const [editingRows, setEditingRows] = React.useState<Record<string, boolean>>({});
   const [validationErrors, setValidationErrors] = React.useState<Record<string, string>>({});

   // Process diagnostics for the grid
   React.useEffect(() => {
      try {
         const diagnostics: Record<string, string> = {};

         // Clear old diagnostics first
         setProcessedDiagnostics({});

         rawDiagnostics.forEach(diagnostic => {
            const diagnosticCode = String(diagnostic.code);

            // Handle source join type validation
            if (diagnostic.message.includes('join type "from" cannot have dependencies')) {
               // This is a general dependencies error, store it with a special key
               diagnostics['dependencies'] = diagnostic.message;
            }

            // Handle individual dependency diagnostics
            sourceObject.dependencies?.forEach((dependency, idx) => {
               const key = `dependencies[${idx}].source`;

               // Check for reference resolution errors
               if (diagnostic.message.includes('Could not resolve reference')) {
                  // Only process if the diagnostic is specifically for this field
                  if (diagnosticCode.includes(key)) {
                     diagnostics[key] = diagnostic.message;
                  }
                  // Or if the message mentions the current value (for unresolved references)
                  else if (dependency.source && diagnostic.message.includes(dependency.source)) {
                     diagnostics[key] = diagnostic.message;
                  }
               }
            });
         });

         setProcessedDiagnostics(diagnostics);
      } catch (e) {
         console.error('Error processing diagnostics:', e);
      }

      // Cleanup function to clear diagnostics when component unmounts
      return () => {
         setProcessedDiagnostics({});
      };
   }, [rawDiagnostics, sourceObject.dependencies]);
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

   const validateField = React.useCallback((rowData: SourceObjectDependencyRow): Record<string, string> => {
      const errors: Record<string, string> = {};
      if (!rowData.source) {
         errors.source = 'Source is required';
      }
      return errors;
   }, []);

   const onRowUpdate = React.useCallback(
      (dependency: SourceObjectDependencyRow) => {
         // Ensure we have a value, defaulting to '_' if empty
         const updatedDependency = {
            ...dependency,
            source: dependency.source || '_'
         };

         const errors = validateField(updatedDependency);
         if (Object.keys(errors).length > 0) {
            setValidationErrors(errors);
         } else {
            setValidationErrors({});
         }

         // Always save and let language server handle validation
         const { ...dependencyToUpdate } = updatedDependency;
         dispatch({
            type: 'source-object:update-dependency',
            sourceObjectIdx,
            dependencyIdx: updatedDependency.idx,
            dependency: dependencyToUpdate
         });
      },
      [dispatch, sourceObjectIdx, validateField]
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

   const columns = React.useMemo<GridColumn<SourceObjectDependencyRow>[]>(
      () => [
         {
            field: 'source',
            header: 'Source',
            body: (rowData: SourceObjectDependencyRow) => {
               const errorMessage = processedDiagnostics[`dependencies[${rowData.idx}].source`];
               return (
                  <div className={`grid-cell-container ${errorMessage ? 'p-invalid' : ''}`} title={errorMessage || undefined}>
                     <span>{rowData.source}</span>
                     {errorMessage && <p className='p-error m-0'>{errorMessage}</p>}
                  </div>
               );
            },
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

   const generalError = processedDiagnostics['dependencies'];

   return (
      <div className='source-dependencies-container'>
         {generalError && <p className='p-error general-error'>{generalError}</p>}
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
            globalFilterFields={['source']}
         />
      </div>
   );
}
