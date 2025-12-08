/********************************************************************************
 * Copyright (c) 2025 CrossBreeze.
 ********************************************************************************/
import { findNextUnique, LogicalAttribute, Reference, toId } from '@crossmodel/protocol';
import { DataTableRowEditEvent } from 'primereact/datatable';
import * as React from 'react';
import { useEntity, useModelDispatch, useReadonly } from '../../ModelContext';
import { EditorProperty, GenericAutoCompleteEditor, GenericCheckboxEditor, GenericTextEditor } from './GenericEditors';
import { GridColumn, PrimeDataGrid } from './PrimeDataGrid';
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

export function EntityAttributesDataGrid(): React.ReactElement {
   const entity = useEntity();
   const dispatch = useModelDispatch();
   const readonly = useReadonly();
   const [editingRows, setEditingRows] = React.useState<Record<string, boolean>>({});
   const [gridData, setGridData] = React.useState<EntityAttributeRow[]>([]);
   const identifiersRef = React.useRef(entity?.identifiers);

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

   const handleAttributeUpward = React.useCallback(
      (attribute: EntityAttributeRow): void => {
         dispatch({
            type: 'entity:attribute:move-attribute-up',
            attributeIdx: attribute.idx
         });
      },
      [dispatch]
   );

   const handleAttributeDownward = React.useCallback(
      (attribute: EntityAttributeRow): void => {
         dispatch({
            type: 'entity:attribute:move-attribute-down',
            attributeIdx: attribute.idx
         });
      },
      [dispatch]
   );

   const handleAttributeDelete = React.useCallback(
      (attribute: EntityAttributeRow): void => {
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

         // Then delete the attribute
         dispatch({
            type: 'entity:attribute:delete-attribute',
            attributeIdx: attribute.idx
         });
      },
      [dispatch, identifiersRef]
   );

   // Keep identifiersRef updated with the latest identifiers
   React.useEffect(() => {
      identifiersRef.current = entity?.identifiers;
   }, [entity?.identifiers]);

   // Update grid data when attributes change, preserving any uncommitted rows
   React.useEffect(() => {
      setGridData(current => {
         // Map the committed attributes
         const committedData = (entity.attributes || []).map((attr: Partial<LogicalAttribute>, idx) => {
            // Find if this attribute is part of any primary identifier
            const isPrimaryIdentifier =
               entity.identifiers?.some(
                  identifier =>
                     identifier.primary && identifier.attributes.some(a => (typeof a === 'string' ? a === attr.id : a.id === attr.id))
               ) || false;

            // Use the primary identifier status for the identifier checkbox
            // This ensures the grid reflects the actual primary identifier state
            return {
               idx,
               name: attr.name || '',
               datatype: attr.datatype || '',
               description: attr.description || '',
               identifier: isPrimaryIdentifier, // Only true if part of a primary identifier
               id: attr.id || '',
               $type: 'LogicalAttribute',
               $globalId: attr.$globalId || ''
            };
         }) as EntityAttributeRow[];

         // Preserve any uncommitted rows that are currently being edited
         const uncommittedRows = current.filter(row => row._uncommitted && editingRows[row.id]);

         return [...committedData, ...uncommittedRows];
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
                  options={options}
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
            field: 'identifier',
            header: 'Primary',
            dataType: 'boolean',
            headerStyle: { width: '10%' },
            body: (rowData: EntityAttributeRow) => (
               <div className='flex align-items-center justify-content-center'>{rowData.identifier && <i className='pi pi-check' />}</div>
            ),
            editor: (options: any) => <GenericCheckboxEditor options={options} basePath={['entity', 'attributes']} field='identifier' />,
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
      []
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
            const { _uncommitted: _, id: __, description, identifier, ...attributeData } = attribute;
            const finalAttribute = {
               ...attributeData,
               id: newId,
               $globalId: newId,
               ...(description ? { description } : {})
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
            const { description, identifier: _ignored, ...rest } = attribute;
            const updatedAttribute = {
               ...rest,
               ...(description ? { description } : {})
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
      <PrimeDataGrid
         className='entity-attributes-datatable'
         columns={columns}
         data={gridData}
         keyField='id'
         height='auto'
         onRowAdd={handleAddAttribute}
         onRowUpdate={handleRowUpdate}
         onRowDelete={handleAttributeDelete}
         onRowMoveUp={handleAttributeUpward}
         onRowMoveDown={handleAttributeDownward}
         defaultNewRow={defaultEntry}
         readonly={readonly}
         noDataMessage='No attributes defined'
         addButtonLabel='Add Attribute'
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
      />
   );
}
