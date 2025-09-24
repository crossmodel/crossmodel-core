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
   ReferenceableElement,
   TargetObjectType
} from '@crossmodel/protocol';
import { AutoComplete, AutoCompleteChangeEvent, AutoCompleteCompleteEvent, AutoCompleteDropdownClickEvent } from 'primereact/autocomplete';
import { DataTableRowEditEvent } from 'primereact/datatable';
import * as React from 'react';
import { useModelDispatch, useModelQueryApi, useReadonly } from '../../ModelContext';
import { GridColumn, PrimeDataGrid } from './PrimeDataGrid';
import { handleGridEditorKeyDown } from './gridKeydownHandler';

interface AttributeMappingSourceEditorProps {
   options: any;
   mappingIdx: number;
}

function AttributeMappingSourceEditor(props: AttributeMappingSourceEditorProps): React.ReactElement {
   const { options, mappingIdx } = props;
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

interface AttributeMappingSourcesDataGridProps {
   attributeMapping: AttributeMapping;
   mappingIdx: number;
}

export interface AttributeMappingSourceRow extends Omit<AttributeMappingSource & CrossModelElement, 'value'> {
   idx: number;
   id: string;
   value: string;
}

export function AttributeMappingSourcesDataGrid({
   attributeMapping,
   mappingIdx
}: AttributeMappingSourcesDataGridProps): React.ReactElement {
   const dispatch = useModelDispatch();
   const readonly = useReadonly();
   const [editingRows, setEditingRows] = React.useState<Record<string, boolean>>({});
   const [validationErrors, setValidationErrors] = React.useState<Record<string, string>>({});

   const validateField = React.useCallback((rowData: AttributeMappingSourceRow): Record<string, string> => {
      const errors: Record<string, string> = {};
      if (!rowData.value) {
         errors.value = 'Invalid Value';
      }
      return errors;
   }, []);

   const gridData = React.useMemo(
      () =>
         (attributeMapping.sources || []).map((source, idx) => ({
            ...source,
            idx,
            id: (source as any).id || idx.toString(),
            value: String(source.value || '')
         })) as AttributeMappingSourceRow[],
      [attributeMapping.sources]
   );

   const onSourceAdd = React.useCallback(
      (sourceToAdd: AttributeMappingSourceRow) => {
         setValidationErrors({});
         const newId = sourceToAdd.id || gridData.length.toString();
         const sourceData: AttributeMappingSource = {
            $type: AttributeMappingSourceType,
            value: sourceToAdd.value
         };

         dispatch({
            type: 'attribute-mapping:add-source',
            mappingIdx,
            source: sourceData
         });
         setEditingRows({ [newId]: true });
      },
      [dispatch, mappingIdx, gridData]
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
         const { ...rest } = sourceToUpdate;
         dispatch({ type: 'attribute-mapping:update-source', mappingIdx, source: rest, sourceIdx: sourceToUpdate.idx });
      },
      [dispatch, mappingIdx, validateField]
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

   const columns: GridColumn<AttributeMappingSourceRow>[] = React.useMemo(
      () => [
         {
            field: 'value',
            header: 'Value',
            body: rowData => rowData.value,
            editor: (options: any) => <AttributeMappingSourceEditor options={options} mappingIdx={mappingIdx} />
         }
      ],
      [mappingIdx]
   );

   const defaultEntry = React.useMemo<Partial<AttributeMappingSourceRow>>(
      () => ({
         $type: AttributeMappingSourceType,
         value: '',
         id: ''
      }),
      []
   );

   if (!attributeMapping) {
      return <></>;
   }

   return (
      <PrimeDataGrid
         className='attribute-mapping-sources-datatable'
         columns={columns}
         data={gridData}
         keyField='id'
         height='auto'
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
         editingRows={editingRows}
         onRowEditChange={(e: DataTableRowEditEvent) => setEditingRows(e.data as Record<string, boolean>)}
         globalFilterFields={['value']}
      />
   );
}
