/********************************************************************************
 * Copyright (c) 2023 CrossBreeze.
 ********************************************************************************/
import { CrossReferenceContext, ModelDiagnostic, RelationshipAttribute, RelationshipAttributeType } from '@crossmodel/protocol';
import { AutoComplete, AutoCompleteCompleteEvent, AutoCompleteDropdownClickEvent, AutoCompleteSelectEvent } from 'primereact/autocomplete';
import { DataTableRowEditEvent } from 'primereact/datatable';
import * as React from 'react';
import { useDiagnostics, useModelDispatch, useModelQueryApi, useReadonly, useRelationship } from '../../ModelContext';
import { ErrorView } from '../ErrorView';
import { GridColumn, PrimeDataGrid } from './PrimeDataGrid';
import { handleGridEditorKeyDown } from './gridKeydownHandler';

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
   const diagnosticKey = getDiagnosticKey(row, field);
   const relevantDiagnostics = diagnostics[diagnosticKey];
   const errorMessage = relevantDiagnostics?.[0]?.message;

   React.useEffect(() => {
      console.log('AttributeProperty rendering:', {
         field,
         row,
         diagnosticKey,
         relevantDiagnostics,
         diagnostics
      });
   }, [field, row, diagnosticKey, relevantDiagnostics, diagnostics]);

   return (
      <div className={`grid-cell-container ${errorMessage ? 'p-invalid' : ''}`} title={errorMessage || undefined}>
         <p>{value}</p>
         {errorMessage && <small className='p-error block'>{errorMessage}</small>}
      </div>
   );
}

export interface RelationshipAttributeRow extends RelationshipAttribute {
   idx: number;
   id: string; // Added id field
}

interface RelationshipAttributeEditorProps {
   options: {
      value: string;
      editorCallback?: (value: string) => void;
      rowData: RelationshipAttributeRow;
   };
   isParent: boolean;
}

function RelationshipAttributeEditor(props: RelationshipAttributeEditorProps): React.ReactElement {
   const { options, isParent } = props;
   const { editorCallback } = options;
   const rawDiagnostics = useDiagnostics();
   const [processedDiagnostics, setProcessedDiagnostics] = React.useState<Record<string, ModelDiagnostic[]>>({});
   const diagnosticKey = getDiagnosticKey(options.rowData, isParent ? 'parent' : 'child');

   React.useEffect(() => {
      // Process diagnostics
      const diagnostics: Record<string, ModelDiagnostic[]> = {};
      rawDiagnostics.forEach(diagnostic => {
         // Handle reference resolution errors
         if (diagnostic.message.includes('Could not resolve reference')) {
            const value = isParent ? options.rowData.parent : options.rowData.child;
            if (value === '_' || diagnostic.message.includes(value || '')) {
               diagnostics[diagnosticKey] = [diagnostic];
            }
         }

         // Handle malformed attributes errors
         const diagnosticCode = String(diagnostic.code);
         if (diagnosticCode.startsWith('malformed-attributes')) {
            const match = diagnosticCode.match(/malformed-attributes\[(\d+)\]\.(\w+)/);
            if (match) {
               const [, diagnosticIdx, field] = match;
               if (
                  parseInt(diagnosticIdx, 10) === options.rowData.idx &&
                  ((isParent && field === 'parent') || (!isParent && field === 'child'))
               ) {
                  diagnostics[diagnosticKey] = [diagnostic];
               }
            }
         }
      });
      setProcessedDiagnostics(diagnostics);
   }, [rawDiagnostics, diagnosticKey, isParent, options.rowData]);

   const [currentValue, setCurrentValue] = React.useState(options.value || '_');
   const [suggestions, setSuggestions] = React.useState<string[]>([]);
   const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);
   const queryApi = useModelQueryApi();
   const relationship = useRelationship();
   const readonly = useReadonly();
   const isDropdownClicked = React.useRef(false);
   // eslint-disable-next-line no-null/no-null
   const autoCompleteRef = React.useRef<AutoComplete>(null);

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

   const fieldDiagnostics = processedDiagnostics[diagnosticKey];
   const errorMessage = fieldDiagnostics?.[0]?.message;

   return (
      <div className='grid-editor-container'>
         <div className={`p-field ${errorMessage ? 'p-error' : ''}`}>
            <AutoComplete
               ref={autoCompleteRef}
               value={currentValue ?? ''}
               suggestions={suggestions}
               completeMethod={search}
               dropdown
               className={`w-full ${isDropdownOpen ? 'autocomplete-dropdown-open' : ''} ${fieldDiagnostics ? 'p-invalid' : ''}`}
               onDropdownClick={handleDropdownClick}
               onChange={e => setCurrentValue(e.value)}
               onSelect={onSelect}
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

export function RelationshipAttributesDataGrid(): React.ReactElement {
   const relationship = useRelationship();
   const dispatch = useModelDispatch();
   const readonly = useReadonly();
   const rawDiagnostics = useDiagnostics();
   const [processedDiagnostics, setProcessedDiagnostics] = React.useState<Record<string, ModelDiagnostic[]>>({});

   // Process raw diagnostics into field-specific diagnostics
   React.useEffect(() => {
      try {
         const diagnostics: Record<string, ModelDiagnostic[]> = {};

         // Process each attribute's diagnostics
         relationship?.attributes?.forEach((attr, idx) => {
            rawDiagnostics.forEach(diagnostic => {
               // Handle reference resolution errors
               if (diagnostic.message.includes('Could not resolve reference')) {
                  if (attr.parent === '_' || diagnostic.message.includes(attr.parent || '')) {
                     const key = `attributes[${idx}].parent`;
                     diagnostics[key] = [diagnostic];
                  }
                  if (attr.child === '_' || diagnostic.message.includes(attr.child || '')) {
                     const key = `attributes[${idx}].child`;
                     diagnostics[key] = [diagnostic];
                  }
               }

               // Handle malformed attributes errors
               const diagnosticCode = String(diagnostic.code);
               if (diagnosticCode.startsWith('malformed-attributes')) {
                  // Extract index and field from the diagnostic code
                  const match = diagnosticCode.match(/malformed-attributes\[(\d+)\]\.(\w+)/);
                  if (match) {
                     const [, diagnosticIdx, field] = match;
                     if (parseInt(diagnosticIdx, 10) === idx) {
                        const key = `attributes[${idx}].${field}`;
                        diagnostics[key] = [diagnostic];
                     }
                  }
               }
            });
         });

         setProcessedDiagnostics(diagnostics);
      } catch (e) {
         console.error('Error processing diagnostics:', e);
      }
   }, [rawDiagnostics, relationship?.attributes]);
   const [editingRows, setEditingRows] = React.useState<Record<string, boolean>>({});
   const [validationErrors, setValidationErrors] = React.useState<Record<string, string>>({});

   const validateField = React.useCallback(
      (rowData: RelationshipAttributeRow): Record<string, string> => {
         const errors: Record<string, string> = {}; // Check if the current values have any validation errors in raw diagnostics
         const hasRawError = rawDiagnostics.some(diagnostic => {
            // Handle reference resolution errors
            if (diagnostic.message.includes('Could not resolve reference')) {
               if (rowData.parent && (rowData.parent === '_' || diagnostic.message.includes(rowData.parent))) {
                  errors.parent = diagnostic.message;
                  return true;
               }
               if (rowData.child && (rowData.child === '_' || diagnostic.message.includes(rowData.child))) {
                  errors.child = diagnostic.message;
                  return true;
               }
            }

            // Handle malformed attributes errors
            const diagnosticCode = String(diagnostic.code);
            if (diagnosticCode.startsWith('malformed-attributes')) {
               const match = diagnosticCode.match(/malformed-attributes\[(\d+)\]\.(\w+)/);
               if (match) {
                  const [, diagnosticIdx, field] = match;
                  if (parseInt(diagnosticIdx, 10) === rowData.idx) {
                     errors[field] = diagnostic.message;
                     return true;
                  }
               }
            }
            return false;
         });

         // If no raw errors, then the field is valid regardless of processed diagnostics
         if (!hasRawError) {
            return {};
         }

         return errors;
      },
      [rawDiagnostics]
   );

   const gridData = React.useMemo(
      () =>
         (relationship.attributes || []).map((attr, idx) => ({
            ...attr,
            idx,
            id: (attr as any).id || idx.toString() // Ensure id is present for keyField
         })) as RelationshipAttributeRow[],
      [relationship.attributes]
   );

   const parentOptions = React.useMemo(() => {
      const uniqueParents = [...new Set(gridData.map(item => item.parent).filter(Boolean))];
      return uniqueParents.map(p => ({ label: p, value: p }));
   }, [gridData]);

   const childOptions = React.useMemo(() => {
      const uniqueChildren = [...new Set(gridData.map(item => item.child).filter(Boolean))];
      return uniqueChildren.map(c => ({ label: c, value: c }));
   }, [gridData]);

   const defaultEntry = React.useMemo<RelationshipAttributeRow>(
      () => ({
         $type: RelationshipAttributeType,
         parent: '_',
         child: '_',
         idx: -1,
         id: '' // Default id for new entries
      }),
      []
   );

   const onRowUpdate = React.useCallback(
      (attribute: RelationshipAttributeRow) => {
         if (attribute.parent === defaultEntry.parent && attribute.child === defaultEntry.child) {
            console.log('Not saving default new attribute.');
            return;
         }

         // Only check for reference errors, let language server handle duplicates
         const errors = validateField(attribute);
         if (Object.keys(errors).length > 0) {
            setValidationErrors(errors);
         } else {
            setValidationErrors({});
         }

         // Always save the changes and let language server provide diagnostics
         dispatch({
            type: 'relationship:attribute:update',
            attributeIdx: attribute.idx,
            attribute: attribute
         });
      },
      [dispatch, defaultEntry, validateField]
   );

   const onRowAdd = React.useCallback(
      (attribute: RelationshipAttributeRow) => {
         // Clear any previous validation errors
         setValidationErrors({});

         // Create a new attribute with empty values
         const newId = attribute.id || gridData.length.toString(); // Generate a unique ID
         const attributeData: RelationshipAttributeRow = {
            $type: RelationshipAttributeType,
            parent: attribute.parent || '_',
            child: attribute.child || '_',
            id: newId,
            idx: -1
         };

         dispatch({
            type: 'relationship:attribute:add',
            attribute: attributeData
         });
         setEditingRows({ [newId]: true });
      },
      [dispatch, gridData]
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

   const columns = React.useMemo<GridColumn<RelationshipAttributeRow>[]>(
      () => [
         {
            field: 'parent',
            header: 'Parent',
            headerStyle: { width: '40%' },
            editor: (options: any) => (
               <div className='grid-editor-wrapper'>
                  <RelationshipAttributeEditor options={options} isParent={true} />
               </div>
            ),
            filterType: 'multiselect',
            filterOptions: parentOptions,
            showFilterMatchModes: false,
            body: (rowData: RelationshipAttributeRow) => (
               <div className='grid-cell-wrapper'>
                  <AttributeProperty field='parent' row={rowData} diagnostics={processedDiagnostics} value={rowData.parent || ''} />
               </div>
            )
         },
         {
            field: 'child',
            header: 'Child',
            editor: (options: any) => (
               <div className='grid-editor-wrapper'>
                  <RelationshipAttributeEditor options={options} isParent={false} />
               </div>
            ),
            filterType: 'multiselect',
            filterOptions: childOptions,
            showFilterMatchModes: false,
            body: (rowData: RelationshipAttributeRow) => (
               <div className='grid-cell-wrapper'>
                  <AttributeProperty field='child' row={rowData} diagnostics={processedDiagnostics} value={rowData.child || ''} />
               </div>
            )
         }
      ],
      [parentOptions, childOptions, processedDiagnostics]
   );

   if (!relationship) {
      return <ErrorView errorMessage='No relationship available' />;
   }

   return (
      <PrimeDataGrid
         className='relationship-attributes-datatable'
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
         noDataMessage='No attributes'
         addButtonLabel='Add Attribute'
         editingRows={editingRows}
         onRowEditChange={(e: DataTableRowEditEvent) => setEditingRows(e.data as Record<string, boolean>)}
         globalFilterFields={['parent', 'child']}
      />
   );
}
