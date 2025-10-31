/********************************************************************************
 * Copyright (c) 2025 CrossBreeze.
 ********************************************************************************/
import { CrossReferenceContext, DataModelDependency, DataModelDependencyType } from '@crossmodel/protocol';
import { AutoComplete, AutoCompleteCompleteEvent, AutoCompleteDropdownClickEvent, AutoCompleteSelectEvent } from 'primereact/autocomplete';
import { DataTableRowEditEvent } from 'primereact/datatable';
import * as React from 'react';
import { useDataModel, useDiagnostics, useModelDispatch, useModelQueryApi, useReadonly } from '../../ModelContext';
import { ErrorView } from '../ErrorView';
import { handleGridEditorKeyDown } from './gridKeydownHandler';
import { GridColumn, PrimeDataGrid } from './PrimeDataGrid';

export interface DataModelDependencyRow extends DataModelDependency {
   idx: number;
   id: string;
   _uncommitted?: boolean;
}

interface DataModelDependencyEditorProps {
   options: {
      value: string;
      field: string;
      rowData: DataModelDependencyRow;
      editorCallback: (value: string) => void;
   };
   validationErrors?: Record<string, string>;
}

function DataModelDependencyEditor(props: DataModelDependencyEditorProps): React.ReactElement {
   const { options, validationErrors } = props;
   const { editorCallback, rowData, field } = options;

   // Initialize with the actual value based on the field type
   const initialValue = field === 'datamodel' ? rowData.datamodel : field === 'version' ? rowData.version : '';
   const [currentValue, setCurrentValue] = React.useState(initialValue || '');
   const [suggestions, setSuggestions] = React.useState<string[]>([]);
   const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);
   const queryApi = useModelQueryApi();
   const dataModel = useDataModel();
   const readonly = useReadonly();
   const error = validationErrors?.[`${rowData.id}.${field}`];
   const isDropdownClicked = React.useRef(false);
   // eslint-disable-next-line no-null/no-null
   const autoCompleteRef = React.useRef<AutoComplete>(null);

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

   const onSelect = (e: AutoCompleteSelectEvent): void => {
      setCurrentValue(e.value);
      if (editorCallback) {
         editorCallback(e.value);
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

   return (
      <div className='grid-editor-container'>
         <div className={`p-field ${error ? 'p-error' : ''}`}>
            <AutoComplete
               ref={autoCompleteRef}
               value={currentValue ?? ''}
               suggestions={suggestions}
               completeMethod={search}
               dropdown
               className={`w-full ${isDropdownOpen ? 'autocomplete-dropdown-open' : ''} ${error ? 'p-invalid' : ''}`}
               onDropdownClick={handleDropdownClick}
               onChange={e => setCurrentValue(e.value)}
               onSelect={onSelect}
               onShow={onShow}
               onHide={onHide}
               disabled={readonly}
               autoFocus
               onKeyDown={handleGridEditorKeyDown}
            />
            {error && <small className='p-error block'>{error}</small>}
         </div>
      </div>
   );
}

export function DataModelDependenciesDataGrid(): React.ReactElement {
   const dataModel = useDataModel();
   const dispatch = useModelDispatch();
   const readonly = useReadonly();
   const rawDiagnostics = useDiagnostics();
   const [editingRows, setEditingRows] = React.useState<Record<string, boolean>>({});
   const [validationErrors, setValidationErrors] = React.useState<Record<string, string>>({});
   const [gridData, setGridData] = React.useState<DataModelDependencyRow[]>([]);

   // Update grid data when dependencies change, preserving any uncommitted rows
   React.useEffect(() => {
      setGridData(current => {
         // Map the committed dependencies
         const committedData = (dataModel.dependencies || []).map((dep, idx) => ({
            ...dep,
            idx,
            id: `dep${idx}`
         })) as DataModelDependencyRow[];

         // Preserve any uncommitted rows that are currently being edited
         const uncommittedRows = current.filter(row => row._uncommitted && editingRows[row.id]);

         return [...committedData, ...uncommittedRows];
      });
   }, [dataModel.dependencies, editingRows]);

   // Update validation errors whenever diagnostics change
   React.useEffect(() => {
      const errors: Record<string, string> = {};

      try {
         // Process raw diagnostics to find reference errors
         dataModel?.dependencies?.forEach((dep, idx) => {
            const rowId = (dep as DataModelDependencyRow).id || `dep${idx}`;

            // Look for diagnostics related to this dependency
            rawDiagnostics.forEach(diagnostic => {
               // Check if this diagnostic is about a DataModel reference and belongs to this dependency
               if (
                  diagnostic.message.includes('Could not resolve reference') &&
                  (diagnostic.code?.toString().includes(`dependencies.${idx}`) ||
                     diagnostic.code?.toString().includes(`dependencies[${idx}]`) ||
                     (dep.datamodel && diagnostic.message.includes(dep.datamodel)))
               ) {
                  errors[`${rowId}.datamodel`] = diagnostic.message;
               }
            });
         });

         // Set validation errors if any were found
         if (Object.keys(errors).length > 0) {
            setValidationErrors(errors);
         }
      } catch (e) {
         console.error('Error processing diagnostics:', e);
      }

      // Process raw diagnostics looking for model errors
      rawDiagnostics.forEach(diagnostic => {
         // Try to find which dependency this error belongs to
         dataModel?.dependencies?.forEach((dep, idx) => {
            const rowId = `dep${idx}`; // Use consistent ID format
            const isErrorForThisDependency =
               diagnostic.code === `dependencies.${idx}` ||
               diagnostic.code === `dependencies[${idx}]` ||
               diagnostic.code === `dependencies.${idx}.datamodel` ||
               (dep.datamodel && diagnostic.message.includes(`named '${dep.datamodel}'`)) ||
               (diagnostic.message.includes('Could not resolve reference') && diagnostic.message.includes(`'${dep.datamodel}'`));

            if (isErrorForThisDependency) {
               // Use the complete message from the language server
               errors[`${rowId}.datamodel`] = diagnostic.message;
            }
         });
      });

      // Show validation for all rows, including newly added ones
      dataModel?.dependencies?.forEach((dep, idx) => {
         const rowId = `dep${idx}`;

         // Always validate if the datamodel is empty or invalid
         if (!dep.datamodel?.trim() && !errors[`${rowId}.datamodel`]) {
            errors[`${rowId}.datamodel`] = 'Data Model reference is required';
         }
      });

      setValidationErrors(errors);
   }, [dataModel?.dependencies, rawDiagnostics, editingRows]);

   // Removed validateField as we now rely on language server validation

   const datamodelOptions = React.useMemo(() => {
      const uniqueDatamodels = [...new Set(gridData.map(item => item.datamodel).filter(Boolean))];
      return uniqueDatamodels.map(dm => ({ label: dm, value: dm }));
   }, [gridData]);

   const defaultEntry = React.useMemo<Partial<DataModelDependencyRow>>(
      () => ({
         $type: DataModelDependencyType,
         datamodel: '',
         version: '',
         id: '' // Default id for new entries
      }),
      []
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

   const onRowUpdate = React.useCallback(
      (dependency: DataModelDependencyRow) => {
         // Clear any existing validation errors for this row
         const rowId = dependency.id;
         setValidationErrors(current => {
            const updated = { ...current };
            delete updated[`${rowId}.datamodel`];
            return updated;
         });

         if (dependency._uncommitted) {
            // For uncommitted rows, check if anything actually changed
            const hasChanges = dependency.datamodel !== defaultEntry.datamodel || dependency.version !== defaultEntry.version;

            // Also check if the datamodel is valid
            const isValidDatamodel =
               dependency.datamodel && dependency.datamodel.trim() !== '' && dependency.datamodel !== '_' && dependency.datamodel !== '-';

            if (!hasChanges || !isValidDatamodel) {
               // Remove the row if no changes or invalid datamodel
               setGridData(current => current.filter(row => row.id !== dependency.id));
               setEditingRows({});
               return;
            }

            // Create the final dependency without temporary fields
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { _uncommitted, id: tempId, idx, ...dependencyData } = dependency;

            // Add the new dependency through dispatch
            dispatch({
               type: 'datamodel:dependency:add-dependency',
               dependency: dependencyData
            });
         } else {
            // This is an existing row being updated
            if (
               !dependency.datamodel ||
               dependency.datamodel.trim() === '' ||
               dependency.datamodel === '_' ||
               dependency.datamodel === '-'
            ) {
               // Invalid datamodel, delete the row
               onRowDelete(dependency);
               return;
            }

            dispatch({
               type: 'datamodel:dependency:update',
               dependencyIdx: dependency.idx,
               dependency: dependency
            });
         }

         // Clear editing state after successful update
         setEditingRows({});
      },
      [dispatch, onRowDelete, defaultEntry]
   );

   const onRowAdd = React.useCallback((): void => {
      // Clear any previous validation errors
      setValidationErrors({});

      // Clear any existing edit states first
      setEditingRows({});

      // Create a new uncommitted row with a unique temporary ID
      const tempRow: DataModelDependencyRow = {
         ...defaultEntry,
         id: `temp-${Date.now()}-${Math.random().toString(36).substring(2)}`, // Ensure uniqueness
         _uncommitted: true,
         idx: -1
      } as DataModelDependencyRow;

      // Add to grid data and set it to editing mode
      setGridData(current => [...current, tempRow]);
      setEditingRows({ [tempRow.id]: true });
   }, [defaultEntry]);

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
            editor: (options: any) => <DataModelDependencyEditor options={options} validationErrors={validationErrors} />,
            body: (rowData: DataModelDependencyRow) => {
               const error = validationErrors[`${rowData.id}.datamodel`];
               return (
                  <div className={`grid-cell-container ${error && !editingRows[rowData.id] ? 'p-invalid' : ''}`} title={error || undefined}>
                     <span>{rowData.datamodel || ''}</span>
                     {error && !editingRows[rowData.id] && <p className='p-error m-0'>{error}</p>}
                  </div>
               );
            },
            filterType: 'multiselect',
            filterOptions: datamodelOptions,
            showFilterMatchModes: false
         },
         {
            field: 'version',
            header: 'Version',
            editor: true,
            headerStyle: { width: '150px' },
            filterType: 'text'
         }
      ],
      [datamodelOptions, validationErrors, editingRows]
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
         onRowEditChange={(e: DataTableRowEditEvent) => {
            const newEditingRows = e.data as Record<string, boolean>;
            const newEditingId = Object.keys(newEditingRows)[0];
            const currentEditingId = editingRows ? Object.keys(editingRows)[0] : undefined;

            // If we're stopping editing a row (either by cancelling or completing)
            if (currentEditingId && !newEditingRows[currentEditingId]) {
               const currentRow = gridData.find(row => row.id === currentEditingId);

               // Always remove uncommitted rows when editing stops
               if (currentRow?._uncommitted) {
                  setGridData(current => current.filter(row => row.id !== currentEditingId));
               }

               // Clear validation errors
               setValidationErrors({});
            }

            // Update editing state
            setEditingRows(newEditingRows);

            // Clean up any stale uncommitted rows
            setGridData(current => {
               // Keep all committed rows
               const committedRows = current.filter(row => !row._uncommitted);

               // For uncommitted rows, only keep the one being edited (if any)
               const activeUncommittedRow = newEditingId ? current.find(row => row._uncommitted && row.id === newEditingId) : undefined;

               return activeUncommittedRow ? [...committedRows, activeUncommittedRow] : committedRows;
            });
         }}
         globalFilterFields={['datamodel', 'version']}
      />
   );
}
