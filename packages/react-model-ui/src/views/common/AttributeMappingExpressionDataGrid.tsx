/********************************************************************************
 * Copyright (c) 2025 CrossBreeze.
 ********************************************************************************/
import { AttributeMapping } from '@crossmodel/protocol';
import { DataTableRowEditEvent } from 'primereact/datatable';
import * as React from 'react';
import { useDiagnosticsManager, useModelDispatch, useReadonly } from '../../ModelContext';
import { GenericAutoCompleteEditor, GenericTextEditor } from './GenericEditors';
import { GridColumn, handleGenericRowReorder, PrimeDataGrid } from './PrimeDataGrid';
import { wasSaveTriggeredByEnter } from './gridKeydownHandler';

interface AttributeMappingExpressionRow {
   idx: number;
   id: string;
   language: string;
   expression?: string;
   _uncommitted?: boolean;
}

interface AttributeMappingExpressionDataGridProps {
   attributeMapping: AttributeMapping;
   mappingIdx: number;
}

const languageOptions = [
   { label: 'SQL', value: 'SQL' },
   { label: 'Python', value: 'Python' }
];

function ExpressionLanguageProperty({
   rowData,
   editingRows,
   mappingIdx
}: {
   rowData: AttributeMappingExpressionRow;
   editingRows: Record<string, boolean>;
   mappingIdx: number;
}): React.ReactNode {
   const diagnostics = useDiagnosticsManager();
   const basePath = ['mapping', 'target', 'mappings@' + mappingIdx.toString(), 'expressions@' + rowData.idx.toString()];
   const info = diagnostics.info(basePath, 'language');
   const error = info.empty ? undefined : info.text();

   const showInvalid = Boolean(error && !editingRows[rowData.id]);

   return (
      <div className={`grid-cell-container ${showInvalid ? 'p-invalid' : ''}`} title={error || undefined}>
         <span>{rowData.language || ''}</span>
         {error && !editingRows[rowData.id] && <p className='p-error m-0'>{error}</p>}
      </div>
   );
}

function ExpressionValueProperty({
   rowData,
   editingRows,
   mappingIdx
}: {
   rowData: AttributeMappingExpressionRow;
   editingRows: Record<string, boolean>;
   mappingIdx: number;
}): React.ReactNode {
   const diagnostics = useDiagnosticsManager();
   const basePath = ['mapping', 'target', 'mappings@' + mappingIdx.toString(), 'expressions@' + rowData.idx.toString()];
   const info = diagnostics.info(basePath, 'expression');
   const error = info.empty ? undefined : info.text();

   const showInvalid = Boolean(error && !editingRows[rowData.id]);

   return (
      <div className={`grid-cell-container ${showInvalid ? 'p-invalid' : ''}`} title={error || undefined}>
         <span>{rowData.expression || ''}</span>
         {error && !editingRows[rowData.id] && <p className='p-error m-0'>{error}</p>}
      </div>
   );
}

export function AttributeMappingExpressionDataGrid({
   attributeMapping,
   mappingIdx
}: AttributeMappingExpressionDataGridProps): React.ReactElement {
   const dispatch = useModelDispatch();
   const readonly = useReadonly();
   const [editingRows, setEditingRows] = React.useState<Record<string, boolean>>({});
   const [selectedRows, setSelectedRows] = React.useState<AttributeMappingExpressionRow[]>([]);
   const pendingDeleteIdsRef = React.useRef<Set<string>>(new Set());
   // Will be properly typed once grammar is regenerated
   const expressionsRef = React.useRef<any[]>((attributeMapping as any).expressions || []);

   const deriveExpressionRowId = React.useCallback((expression: any, idx: number): string => {
      const globalId = expression?.$globalId;
      return globalId ?? `expr-${idx}`;
   }, []);

   const handleSelectionChange = React.useCallback((e: { value: AttributeMappingExpressionRow[] }): void => {
      setSelectedRows(e.value);
   }, []);

   const defaultEntry = React.useMemo<Partial<AttributeMappingExpressionRow>>(
      () => ({
         language: '',
         expression: '',
         id: ''
      }),
      []
   );

   const [gridData, setGridData] = React.useState<AttributeMappingExpressionRow[]>([]);

   const handleRowReorder = React.useCallback(
      (e: { rows: AttributeMappingExpressionRow[] }): void => {
         handleGenericRowReorder(
            e,
            pendingDeleteIdsRef.current,
            expressionsRef.current || [],
            deriveExpressionRowId,
            reorderedExpressions => {
               dispatch({
                  type: 'attribute-mapping:reorder-expressions',
                  mappingIdx,
                  expressions: reorderedExpressions
               } as any);
            }
         );
      },
      [dispatch, mappingIdx, deriveExpressionRowId]
   );

   const expressions = React.useMemo(() => (attributeMapping as any).expressions || [], [attributeMapping]);

   // Update grid data when expressions change, preserving any uncommitted rows
   React.useEffect(() => {
      expressionsRef.current = expressions;
      setGridData(current => {
         const committedData = expressions.map((expr: any, idx: number) => {
            const rowId = deriveExpressionRowId(expr, idx);
            const existingRow = current.find(r => r.id === rowId);
            return {
               ...(existingRow || expr),
               ...expr,
               idx,
               id: rowId,
               _uncommitted: false
            } as AttributeMappingExpressionRow;
         });

         // Preserve uncommitted rows
         const uncommittedRows = current.filter(r => r._uncommitted);
         return [...committedData, ...uncommittedRows];
      });
   }, [expressions, editingRows, deriveExpressionRowId]);

   const onExpressionDelete = React.useCallback(
      (expressionToDelete: AttributeMappingExpressionRow) => {
         if (expressionToDelete.id && !expressionToDelete._uncommitted) {
            pendingDeleteIdsRef.current.add(expressionToDelete.id);
         }

         setGridData(current => current.filter(row => row.id !== expressionToDelete.id));
         setSelectedRows(current => current.filter(row => row.id !== expressionToDelete.id));

         if (expressionToDelete._uncommitted) {
            if (expressionToDelete.id) {
               pendingDeleteIdsRef.current.delete(expressionToDelete.id);
            }
            return;
         }

         const currentExpressions = (attributeMapping as any).expressions || [];
         const expressionIdx = currentExpressions.findIndex(
            (expr: any, idx: number) => deriveExpressionRowId(expr, idx) === expressionToDelete.id
         );
         if (expressionIdx === -1) {
            pendingDeleteIdsRef.current.delete(expressionToDelete.id);
            return;
         }

         dispatch({
            type: 'attribute-mapping:delete-expression',
            mappingIdx,
            expressionIdx
         } as any);
      },
      [dispatch, mappingIdx, attributeMapping, deriveExpressionRowId]
   );

   const onExpressionUpdate = React.useCallback(
      (expressionToUpdate: AttributeMappingExpressionRow) => {
         if (expressionToUpdate._uncommitted) {
            const hasContent =
               (expressionToUpdate.language && expressionToUpdate.language.trim() !== '') ||
               (expressionToUpdate.expression && expressionToUpdate.expression.trim() !== '');
            if (!hasContent) {
               return;
            }
            // Add new uncommitted expression as a new row
            const newExpression = {
               language: expressionToUpdate.language ?? '',
               expression: expressionToUpdate.expression ?? ''
            };
            dispatch({
               type: 'attribute-mapping:add-expression',
               mappingIdx,
               expression: newExpression
            } as any);

            setEditingRows({});

            // If save was triggered by Enter, start a new uncommitted row
            if (wasSaveTriggeredByEnter()) {
               const newTempRow: AttributeMappingExpressionRow = {
                  ...defaultEntry,
                  id: `temp-${Date.now()}-${Math.random().toString(36).substring(2)}`,
                  language: '',
                  expression: '',
                  _uncommitted: true,
                  idx: -1
               } as AttributeMappingExpressionRow;

               setTimeout(() => {
                  setGridData(current => [...current, newTempRow]);
                  setEditingRows({ [newTempRow.id]: true });
               }, 50);
            }
            return;
         }

         // Find and update existing expression
         const currentExpressions = (attributeMapping as any).expressions || [];
         const expressionIdx = currentExpressions.findIndex(
            (expr: any, idx: number) => deriveExpressionRowId(expr, idx) === expressionToUpdate.id
         );
         if (expressionIdx === -1) {
            return;
         }

         dispatch({
            type: 'attribute-mapping:update-expression',
            mappingIdx,
            expressionIdx,
            expression: expressionToUpdate
         } as any);

         setEditingRows({});
      },
      [dispatch, mappingIdx, attributeMapping, deriveExpressionRowId, defaultEntry]
   );

   const onExpressionAdd = React.useCallback((): void => {
      // Clear any existing edit states first
      setEditingRows({});

      // Create a new uncommitted row with a unique temporary ID
      const tempRow: AttributeMappingExpressionRow = {
         ...defaultEntry,
         id: `temp-${Date.now()}-${Math.random().toString(36).substring(2)}`,
         language: '',
         expression: '',
         _uncommitted: true,
         idx: gridData.length
      };

      // Add to grid data and set it to editing mode
      setGridData(current => [...current, tempRow]);
      setEditingRows({ [tempRow.id]: true });
   }, [defaultEntry, gridData.length]);

   const columns: GridColumn<AttributeMappingExpressionRow>[] = React.useMemo(
      () => [
         {
            field: 'language' as any,
            header: 'Language',
            body: (rowData: AttributeMappingExpressionRow) => (
               <ExpressionLanguageProperty rowData={rowData} editingRows={editingRows} mappingIdx={mappingIdx} />
            ),
            editor: (options: any) => (
               <GenericAutoCompleteEditor
                  options={{ ...options, commitOnInput: true }}
                  basePath={['mapping', 'target', 'mappings@' + mappingIdx.toString(), 'expressions']}
                  field='language'
                  dropdownOptions={languageOptions}
               />
            ),
            filterType: 'text' as any,
            headerStyle: { width: '120px' },
            style: { width: '120px' }
         },
         {
            field: 'expression' as any,
            header: 'Expression',
            body: (rowData: AttributeMappingExpressionRow) => (
               <ExpressionValueProperty rowData={rowData} editingRows={editingRows} mappingIdx={mappingIdx} />
            ),
            editor: (options: any) => (
               <GenericTextEditor
                  options={options}
                  basePath={['mapping', 'target', 'mappings@' + mappingIdx.toString(), 'expressions']}
                  field='expression'
               />
            ),
            filterType: 'text' as any
         }
      ],
      [mappingIdx, editingRows]
   );

   if (!attributeMapping) {
      return <></>;
   }

   return (
      <PrimeDataGrid
         className='attribute-mapping-expression-datatable'
         columns={columns as any}
         data={gridData}
         keyField='id'
         height='auto'
         onRowAdd={onExpressionAdd}
         onRowUpdate={onExpressionUpdate}
         onRowDelete={onExpressionDelete}
         onRowReorder={handleRowReorder}
         selectedRows={selectedRows}
         onSelectionChange={handleSelectionChange}
         defaultNewRow={defaultEntry as any}
         readonly={readonly}
         noDataMessage='No expressions defined'
         addButtonLabel='Add Expression'
         editingRows={editingRows}
         metaKeySelection={false}
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
         globalFilterFields={['language', 'expression']}
      />
   );
}
