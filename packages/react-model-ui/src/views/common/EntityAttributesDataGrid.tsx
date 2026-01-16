/********************************************************************************
 * Copyright (c) 2025 CrossBreeze.
 ********************************************************************************/
import { findNextUnique, LogicalAttribute, Reference, toId } from '@crossmodel/protocol';
import { DataTableRowEditEvent } from 'primereact/datatable';
import * as React from 'react';
import { useEntity, useModelDispatch, useReadonly } from '../../ModelContext';
import { EditorProperty, GenericAutoCompleteEditor, GenericCheckboxEditor, GenericNumberEditor, GenericTextEditor } from './GenericEditors';
import { GridColumn, handleGenericRowReorder, PrimeDataGrid } from './PrimeDataGrid';
import { wasSaveTriggeredByEnter } from './gridKeydownHandler';

export interface EntityAttributeRow extends LogicalAttribute {
   $type: 'LogicalAttribute';
   $globalId: Reference<'LogicalAttribute'>;
   id: string;
   idx: number;
   name: string;
   datatype: string;
   description?: string;
   _uncommitted?: boolean;
}

const dataTypeOptions = [
   // Basic data types
   { label: 'Text', value: 'Text' },
   { label: 'Boolean', value: 'Boolean' },
   { label: 'Integer', value: 'Integer' },
   { label: 'Decimal', value: 'Decimal' },

   // Date and time data types
   { label: 'Date', value: 'Date' },
   { label: 'Time', value: 'Time' },
   { label: 'DateTime', value: 'DateTime' },

   // Identifiers & key types
   { label: 'Guid', value: 'Guid' },

   // Specialized data types
   { label: 'Binary', value: 'Binary' },
   { label: 'Location', value: 'Location' }
];

const deriveAttributeRowId = (attr: Partial<LogicalAttribute>, idx: number): string => {
   const persistedId = attr.id as string | undefined;
   const globalId = attr.$globalId as string | undefined;
   return persistedId ?? globalId ?? `attr-${idx}`;
};

const isLengthApplicable = (datatype: string): boolean => {
   const dt = datatype?.toLowerCase();
   return dt === 'text' || dt === 'binary';
};

const isPrecisionApplicable = (datatype: string): boolean => {
   const dt = datatype?.toLowerCase();
   return dt === 'decimal' || dt === 'integer';
};

const isScaleApplicable = (datatype: string): boolean => {
   const dt = datatype?.toLowerCase();
   return dt === 'decimal' || dt === 'time' || dt === 'datetime';
};

export function EntityAttributesDataGrid(): React.ReactElement {
   const entity = useEntity();
   const dispatch = useModelDispatch();
   const readonly = useReadonly();
   const [editingRows, setEditingRows] = React.useState<Record<string, boolean>>({});
   const [gridData, setGridData] = React.useState<EntityAttributeRow[]>([]);
   const [selectedRows, setSelectedRows] = React.useState<EntityAttributeRow[]>([]);
   const pendingDeleteIdsRef = React.useRef<Set<string>>(new Set());
   const identifiersRef = React.useRef(entity?.identifiers);
   const attributesRef = React.useRef(entity?.attributes || []);
   // eslint-disable-next-line no-null/no-null
   const containerRef = React.useRef<HTMLDivElement>(null);
   const [isNarrow, setIsNarrow] = React.useState(false);

   React.useEffect(() => {
      if (!containerRef.current) {
         return;
      }
      const observer = new ResizeObserver(entries => {
         for (const entry of entries) {
            setIsNarrow(entry.contentRect.width < 1000);
         }
      });
      observer.observe(containerRef.current);
      return () => observer.disconnect();
   }, []);

   const defaultEntry = React.useMemo<EntityAttributeRow>(
      () => ({
         name: '',
         datatype: '',
         idx: -1,
         id: '', // ID will be assigned when adding the row
         description: '',
         $type: 'LogicalAttribute',
         $globalId: 'toBeAssigned'
      }),
      []
   );

   const handleAddAttribute = React.useCallback((): void => {
      // Clear any existing edit states first
      setEditingRows({});

      // Create a new uncommitted row with a unique temporary ID
      const tempRow: EntityAttributeRow = {
         ...defaultEntry,
         id: `temp-${Date.now()}-${Math.random().toString(36).substring(2)}`, // Ensure uniqueness
         _uncommitted: true
      };

      // Add to grid data and set it to editing mode
      setGridData(current => [...current, tempRow]);
      setEditingRows({ [tempRow.id]: true });
   }, [defaultEntry]);

   const handleRowReorder = React.useCallback(
      (e: { rows: EntityAttributeRow[] }): void => {
         handleGenericRowReorder(e, pendingDeleteIdsRef.current, attributesRef.current || [], deriveAttributeRowId, reorderedAttributes => {
            dispatch({
               type: 'entity:attribute:reorder-attributes',
               attributes: reorderedAttributes
            });
         });
      },
      [dispatch]
   );

   const handleSelectionChange = React.useCallback((e: { value: EntityAttributeRow[] }): void => {
      setSelectedRows(e.value);
   }, []);

   const handleAttributeDelete = React.useCallback(
      (attribute: EntityAttributeRow): void => {
         if (attribute.id && !attribute._uncommitted) {
            pendingDeleteIdsRef.current.add(attribute.id);
         }

         setGridData(current => current.filter(row => row.id !== attribute.id));
         setSelectedRows(current => current.filter(row => row.id !== attribute.id));

         // Get the current state of identifiers
         const currentIdentifiers = identifiersRef.current;
         // Update all identifiers that reference this attribute first
         if (currentIdentifiers?.length > 0) {
            // Create updates for all identifiers in parallel
            currentIdentifiers.forEach((identifier, idx) => {
               if (
                  identifier?.attributes?.some((attr: any) => (typeof attr === 'string' ? attr === attribute.id : attr.id === attribute.id))
               ) {
                  // Update each identifier to remove the attribute reference
                  dispatch({
                     type: 'entity:identifier:update',
                     identifierIdx: idx,
                     identifier: {
                        ...identifier,
                        attributes: identifier.attributes.filter((attr: any) =>
                           typeof attr === 'string' ? attr !== attribute.id : attr.id !== attribute.id
                        )
                     }
                  });
               }
            });
         }

         if (attribute._uncommitted) {
            if (attribute.id) {
               pendingDeleteIdsRef.current.delete(attribute.id);
            }
            return;
         }

         const attributeIdx = (entity.attributes || []).findIndex((attr, idx) => deriveAttributeRowId(attr, idx) === attribute.id);
         if (attributeIdx === -1) {
            pendingDeleteIdsRef.current.delete(attribute.id);
            return;
         }

         // Then delete the attribute
         dispatch({
            type: 'entity:attribute:delete-attribute',
            attributeIdx
         });
      },
      [dispatch, identifiersRef, entity.attributes]
   );

   // Keep identifiersRef updated with the latest identifiers
   React.useEffect(() => {
      identifiersRef.current = entity?.identifiers;
   }, [entity?.identifiers]);

   // Update grid data when attributes change, preserving any uncommitted rows
   React.useEffect(() => {
      attributesRef.current = entity.attributes || [];
      setGridData(current => {
         const committedData = (entity.attributes || []).map((attr: Partial<LogicalAttribute>, idx) => {
            const isPrimaryIdentifier =
               entity.identifiers?.some(
                  identifier =>
                     identifier.primary && identifier.attributes.some(a => (typeof a === 'string' ? a === attr.id : a.id === attr.id))
               ) || false;

            const id = deriveAttributeRowId(attr, idx);
            return {
               idx,
               name: attr.name || '',
               datatype: attr.datatype || '',
               description: attr.description || '',
               mandatory: attr.mandatory || false,
               identifier: isPrimaryIdentifier,
               ...(attr.length !== undefined ? { length: attr.length } : {}),
               ...(attr.precision !== undefined ? { precision: attr.precision } : {}),
               ...(attr.scale !== undefined ? { scale: attr.scale } : {}),
               id,
               $type: 'LogicalAttribute',
               $globalId: attr.$globalId || id
            };
         }) as EntityAttributeRow[];

         const committedIds = new Set(committedData.map(row => row.id));
         const uncommittedRows = current.filter(row => row._uncommitted && editingRows[row.id]);

         pendingDeleteIdsRef.current.forEach(id => {
            if (!committedIds.has(id)) {
               pendingDeleteIdsRef.current.delete(id);
            }
         });

         const visibleCommittedData = committedData.filter(row => !pendingDeleteIdsRef.current.has(row.id));

         return [...visibleCommittedData, ...uncommittedRows];
      });
   }, [entity.attributes, entity.identifiers, editingRows]);

   const columns: GridColumn<EntityAttributeRow>[] = React.useMemo(
      () => [
         {
            field: 'name',
            header: 'Name',
            body: (rowData: EntityAttributeRow) => (
               <EditorProperty basePath={['entity', 'attributes']} field='name' row={rowData} value={rowData.name || ''} />
            ),
            editor: (options: any) => <GenericTextEditor options={options} basePath={['entity', 'attributes']} field='name' />,
            headerStyle: { width: '20%' },
            filterType: 'text'
         },
         {
            field: 'datatype',
            header: 'Data Type',
            headerStyle: { width: '15%' },
            editor: (options: any) => (
               <GenericAutoCompleteEditor
                  options={{
                     ...options,
                     editorCallback: (value: any) => {
                        options.editorCallback(value);
                        setGridData(current =>
                           current.map(row => {
                              if (row.id === options.rowData.id) {
                                 const isLength = isLengthApplicable(value);
                                 const isPrecision = isPrecisionApplicable(value);
                                 const isScale = isScaleApplicable(value);

                                 return {
                                    ...row,
                                    datatype: value,
                                    length: isLength ? row.length : undefined,
                                    precision: isPrecision ? row.precision : undefined,
                                    scale: isScale ? row.scale : undefined
                                 };
                              }
                              return row;
                           })
                        );
                     }
                  }}
                  basePath={['entity', 'attributes']}
                  field='datatype'
                  dropdownOptions={dataTypeOptions}
               />
            ),
            filterType: 'multiselect',
            filterOptions: dataTypeOptions,
            showFilterMatchModes: false
         },
         {
            field: 'length',
            header: 'Length',
            dataType: 'numeric',
            headerStyle: { width: '70px' },
            style: { width: '70px' },
            headerTooltip: 'Length is applicable only for Text and Binary datatypes',
            body: (rowData: EntityAttributeRow) => {
               const isApplicable = isLengthApplicable(rowData.datatype);
               return (
                  <div style={{ opacity: isApplicable ? 1 : 0.4 }}>
                     <EditorProperty
                        basePath={['entity', 'attributes']}
                        field='length'
                        row={rowData}
                        value={rowData.length?.toString() || ''}
                     />
                  </div>
               );
            },
            editor: (options: any) => {
               const currentRow = gridData.find(r => r.id === options.rowData.id);
               const datatype = currentRow?.datatype || options.rowData?.datatype;
               const isApplicable = isLengthApplicable(datatype);
               return (
                  <GenericNumberEditor
                     options={options}
                     basePath={['entity', 'attributes']}
                     field='length'
                     disabled={!isApplicable}
                     value={isApplicable ? options.value : undefined}
                     showButtons={isApplicable}
                     tooltip='Length is applicable only for Text and Binary datatypes'
                     forceClear={!isApplicable}
                  />
               );
            }
         },
         {
            field: 'precision',
            header: 'Precision',
            dataType: 'numeric',
            headerStyle: { width: '70px' },
            style: { width: '70px' },
            headerTooltip: 'Precision is applicable only for Decimal and Integer datatypes',
            body: (rowData: EntityAttributeRow) => {
               const isApplicable = isPrecisionApplicable(rowData.datatype);
               return (
                  <div style={{ opacity: isApplicable ? 1 : 0.4 }}>
                     <EditorProperty
                        basePath={['entity', 'attributes']}
                        field='precision'
                        row={rowData}
                        value={rowData.precision?.toString() || ''}
                     />
                  </div>
               );
            },
            editor: (options: any) => {
               const currentRow = gridData.find(r => r.id === options.rowData.id);
               const datatype = currentRow?.datatype || options.rowData?.datatype;
               const isApplicable = isPrecisionApplicable(datatype);
               return (
                  <GenericNumberEditor
                     options={options}
                     basePath={['entity', 'attributes']}
                     field='precision'
                     disabled={!isApplicable}
                     value={isApplicable ? options.value : undefined}
                     showButtons={isApplicable}
                     tooltip='Precision is applicable only for Decimal and Integer datatypes'
                     forceClear={!isApplicable}
                  />
               );
            }
         },
         {
            field: 'scale',
            header: 'Scale',
            dataType: 'numeric',
            headerStyle: { width: '70px' },
            style: { width: '70px' },
            headerTooltip: 'Scale is applicable only for Decimal, Time and DateTime datatypes',
            body: (rowData: EntityAttributeRow) => {
               const isApplicable = isScaleApplicable(rowData.datatype);
               return (
                  <div style={{ opacity: isApplicable ? 1 : 0.4 }}>
                     <EditorProperty
                        basePath={['entity', 'attributes']}
                        field='scale'
                        row={rowData}
                        value={rowData.scale?.toString() || ''}
                     />
                  </div>
               );
            },
            editor: (options: any) => {
               const currentRow = gridData.find(r => r.id === options.rowData.id);
               const datatype = currentRow?.datatype || options.rowData?.datatype;
               const isApplicable = isScaleApplicable(datatype);
               return (
                  <GenericNumberEditor
                     options={options}
                     basePath={['entity', 'attributes']}
                     field='scale'
                     disabled={!isApplicable}
                     value={isApplicable ? options.value : undefined}
                     showButtons={isApplicable}
                     tooltip='Scale is applicable only for Decimal, Time and DateTime datatypes'
                     forceClear={!isApplicable}
                  />
               );
            }
         },
         {
            field: 'identifier',
            header: isNarrow ? 'P' : 'Primary',
            dataType: 'boolean',
            headerStyle: { width: '50px', textAlign: 'center' },
            style: { width: '50px', textAlign: 'center' },
            body: (rowData: EntityAttributeRow) => (
               <div className='flex align-items-center justify-content-center'>{rowData.identifier && <i className='pi pi-check' />}</div>
            ),
            editor: (options: any) => <GenericCheckboxEditor options={options} basePath={['entity', 'attributes']} field='identifier' />,
            filterType: 'boolean',
            showFilterMatchModes: false
         },
         {
            field: 'mandatory',
            header: isNarrow ? 'M' : 'Mandatory',
            dataType: 'boolean',
            headerStyle: { width: '50px', textAlign: 'center' },
            style: { width: '50px', textAlign: 'center' },
            body: (rowData: EntityAttributeRow) => (
               <div className='flex align-items-center justify-content-center'>{rowData.mandatory && <i className='pi pi-check' />}</div>
            ),
            editor: (options: any) => <GenericCheckboxEditor options={options} basePath={['entity', 'attributes']} field='mandatory' />,
            filterType: 'boolean',
            showFilterMatchModes: false
         },
         {
            field: 'description',
            header: 'Description',
            body: (rowData: EntityAttributeRow) => (
               <EditorProperty basePath={['entity', 'attributes']} field='description' row={rowData} value={rowData.description || ''} />
            ),
            editor: (options: any) => <GenericTextEditor options={options} basePath={['entity', 'attributes']} field='description' />,
            filterType: 'text'
         }
      ],
      [gridData, isNarrow]
   );

   const handleIdentifierUpdate = React.useCallback(
      (attributeId: string, attributeName: string, shouldBeIdentifier: boolean, isNew = false) => {
         // Check if there's an existing primary identifier
         const existingPrimary = entity.identifiers?.find(i => i.primary);

         if (shouldBeIdentifier) {
            if (existingPrimary) {
               // Add this attribute to the existing primary identifier
               dispatch({
                  type: 'entity:identifier:update',
                  identifierIdx: entity.identifiers.indexOf(existingPrimary),
                  identifier: {
                     ...existingPrimary,
                     attributes: [...existingPrimary.attributes, attributeId] as any
                  }
               });
            } else {
               // Create new primary identifier
               const identifierId = findNextUnique(toId('Primary Identifier'), entity.identifiers || [], id => id.id || '');
               dispatch({
                  type: 'entity:identifier:add-identifier',
                  identifier: {
                     id: identifierId,
                     name: 'Primary Identifier',
                     primary: true,
                     attributes: [attributeId] as any,
                     $type: 'LogicalIdentifier',
                     $globalId: `${entity.id}.${identifierId}`
                  }
               });
            }
         } else if (!isNew) {
            // Only handle removal for existing attributes
            // Find identifier containing this attribute
            const identifierToUpdate = entity.identifiers?.find(identifier =>
               identifier.attributes.some(attr => (typeof attr === 'string' ? attr === attributeId : attr.id === attributeId))
            );

            if (identifierToUpdate) {
               const remainingAttributes = identifierToUpdate.attributes.filter(attr =>
                  typeof attr === 'string' ? attr !== attributeId : attr.id !== attributeId
               );

               if (remainingAttributes.length === 0) {
                  // If no attributes left, remove the identifier
                  dispatch({
                     type: 'entity:identifier:delete-identifier',
                     identifierIdx: entity.identifiers.indexOf(identifierToUpdate)
                  });
               } else {
                  // Otherwise update the identifier with remaining attributes
                  dispatch({
                     type: 'entity:identifier:update',
                     identifierIdx: entity.identifiers.indexOf(identifierToUpdate),
                     identifier: {
                        ...identifierToUpdate,
                        attributes: remainingAttributes
                     }
                  });
               }
            }
         }
      },
      [dispatch, entity.identifiers, entity.id]
   );

   const handleRowUpdate = React.useCallback(
      (attribute: EntityAttributeRow) => {
         // Get old attribute state
         const oldAttribute = entity.attributes[attribute.idx];
         if (attribute._uncommitted) {
            // For uncommitted rows, check if anything actually changed
            const hasChanges =
               attribute.name !== defaultEntry.name ||
               attribute.datatype !== defaultEntry.datatype ||
               attribute.description !== defaultEntry.description ||
               !!attribute.mandatory ||
               !!attribute.identifier;

            if (!hasChanges) {
               // Remove the row if no changes
               setGridData(current => current.filter(row => row.id !== attribute.id));
               setEditingRows({});
               return;
            }

            // Generate a proper ID for the new attribute
            const newId = findNextUnique(toId(attribute.name || ''), entity.attributes || [], attr => attr.id || '');

            // Create the final attribute without temporary fields and empty fields
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { _uncommitted: _, id: __, description, identifier, mandatory, length, precision, scale, ...attributeData } = attribute;
            const isLength = isLengthApplicable(attribute.datatype);
            const isPrecision = isPrecisionApplicable(attribute.datatype);
            const isScale = isScaleApplicable(attribute.datatype);

            const finalAttribute = {
               ...attributeData,
               id: newId,
               $globalId: newId,
               ...(description ? { description } : {}),
               ...(mandatory ? { mandatory } : {}),
               ...(isLength && length !== undefined ? { length } : {}),
               ...(isPrecision && precision !== undefined ? { precision } : {}),
               ...(isScale && scale !== undefined ? { scale } : {})
            };

            // Add the new attribute through dispatch
            dispatch({
               type: 'entity:attribute:add-attribute',
               attribute: finalAttribute
            });

            // Handle identifier status for the new attribute
            handleIdentifierUpdate(newId, attribute.name, identifier ?? false, true);
            // Create a new uncommitted row for continuous entry only if save was triggered by Enter key
            if (wasSaveTriggeredByEnter()) {
               const newTempRow: EntityAttributeRow = {
                  ...defaultEntry,
                  id: `temp-${Date.now()}-${Math.random().toString(36).substring(2)}`,
                  _uncommitted: true
               };

               setTimeout(() => {
                  setGridData(current => [...current, newTempRow]);
                  // Clear editing state after successful update
                  setEditingRows({ [newTempRow.id]: true });
               }, 50);
            }
         } else {
            // This is an existing row being updated
            // Remove empty and non-model fields before updating
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { description, identifier: _ignored, mandatory, length, precision, scale, ...rest } = attribute;
            const isLength = isLengthApplicable(attribute.datatype);
            const isPrecision = isPrecisionApplicable(attribute.datatype);
            const isScale = isScaleApplicable(attribute.datatype);

            const updatedAttribute = {
               ...rest,
               ...(description ? { description } : {}),
               ...(mandatory ? { mandatory } : {}),
               ...(isLength && length !== undefined ? { length } : {}),
               ...(isPrecision && precision !== undefined ? { precision } : {}),
               ...(isScale && scale !== undefined ? { scale } : {})
            };

            dispatch({
               type: 'entity:attribute:update',
               attributeIdx: attribute.idx,
               attribute: updatedAttribute
            });

            // Handle identifier changes separately
            // Find the current primary identifier if it exists
            const primaryIdentifier = entity.identifiers?.find(identifier => identifier.primary);
            const isCurrentlyInPrimary = primaryIdentifier?.attributes.some(attr =>
               typeof attr === 'string' ? attr === oldAttribute.id : attr.id === oldAttribute.id
            );
            const identifierChanged = attribute.identifier !== isCurrentlyInPrimary;

            if (identifierChanged) {
               if (attribute.identifier) {
                  // Adding to primary identifier
                  if (primaryIdentifier) {
                     // Add to existing primary identifier
                     dispatch({
                        type: 'entity:identifier:update',
                        identifierIdx: entity.identifiers.indexOf(primaryIdentifier),
                        identifier: {
                           ...primaryIdentifier,
                           attributes: [...primaryIdentifier.attributes, oldAttribute.id] as any
                        }
                     });
                  } else {
                     // Create new primary identifier
                     const identifierId = findNextUnique(toId('Primary Identifier'), entity.identifiers || [], id => id.id || '');
                     dispatch({
                        type: 'entity:identifier:add-identifier',
                        identifier: {
                           id: identifierId,
                           name: 'Primary Identifier',
                           primary: true,
                           attributes: [oldAttribute.id] as any,
                           $type: 'LogicalIdentifier',
                           $globalId: `${entity.id}.${identifierId}`
                        }
                     });
                  }
               } else if (primaryIdentifier) {
                  // Removing from primary identifier
                  const remainingAttributes = primaryIdentifier.attributes.filter(attr =>
                     typeof attr === 'string' ? attr !== oldAttribute.id : attr.id !== oldAttribute.id
                  );

                  // Always update the identifier with remaining attributes, even if empty
                  dispatch({
                     type: 'entity:identifier:update',
                     identifierIdx: entity.identifiers.indexOf(primaryIdentifier),
                     identifier: {
                        ...primaryIdentifier,
                        attributes: remainingAttributes
                     }
                  });
               }
            }
         }

         // Clear editing state after successful update
         setEditingRows({});
      },
      [dispatch, defaultEntry, entity, handleIdentifierUpdate]
   );

   if (!entity) {
      return <div className='p-error'>No Entity!</div>;
   }

   return (
      <div ref={containerRef} style={{ width: '100%' }}>
         <PrimeDataGrid
            className='entity-attributes-datatable'
            columns={columns}
            data={gridData}
            keyField='id'
            height='auto'
            onRowAdd={handleAddAttribute}
            onRowUpdate={handleRowUpdate}
            onRowDelete={handleAttributeDelete}
            onRowReorder={handleRowReorder}
            selectedRows={selectedRows}
            onSelectionChange={handleSelectionChange}
            defaultNewRow={defaultEntry}
            readonly={readonly}
            noDataMessage='No attributes defined'
            addButtonLabel='Add Attribute'
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
               if (newEditingId) {
                  setGridData(current => {
                     // Keep all committed rows
                     const committedRows = current.filter(row => !row._uncommitted);
                     const activeUncommittedRow = current.find(row => row._uncommitted && row.id === newEditingId);
                     return activeUncommittedRow ? [...committedRows, activeUncommittedRow] : committedRows;
                  });
               }
            }}
            globalFilterFields={['name', 'datatype', 'description']}
            resizableColumns
            columnResizeMode='fit'
         />
      </div>
   );
}
