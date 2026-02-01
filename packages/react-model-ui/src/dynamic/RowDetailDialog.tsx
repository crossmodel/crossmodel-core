/********************************************************************************
 * Copyright (c) 2025 CrossBreeze.
 ********************************************************************************/
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import * as React from 'react';
import { ModelContext, ModelDispatchContext, useReadonly } from '../ModelContext';
import { DispatchAction } from '../ModelReducer';
import { DynamicCollection } from './DynamicCollection';
import { DynamicSection } from './DynamicSection';
import { CollectionDescriptor } from './schema';
import { ITEM_ROOT_KEY, getSchemaForType } from './schema-registry';

export interface RowDetailDialogProps {
   visible: boolean;
   onHide: () => void;
   row: Record<string, any> | undefined;
   collection: CollectionDescriptor;
   onSave: (updatedRow: Record<string, any>) => void;
}

/**
 * Dialog that renders a collection row as a full dynamic form.
 *
 * It looks up an item-level DynamicFormSchema by the row's $type and renders
 * DynamicSection + DynamicCollection from that schema. A local dispatch context
 * intercepts all actions so changes are applied to a local copy of the row data.
 * On save, the modified data is passed back to the parent grid via onSave.
 */
export function RowDetailDialog({ visible, onHide, row, collection, onSave }: RowDetailDialogProps): React.ReactElement {
   const readonly = useReadonly();

   // Look up item-level schema from the row's $type
   const itemSchema = React.useMemo(() => {
      if (!row?.$type) {
         return undefined;
      }
      return getSchemaForType(row.$type);
   }, [row?.$type]);

   // Local copy of the row data, wrapped in a synthetic model: { item: ... }
   const [localModel, setLocalModel] = React.useState<Record<string, any>>({});

   // Reset local model when dialog opens with a new row
   React.useEffect(() => {
      if (visible && row && itemSchema) {
         setLocalModel({ [itemSchema.rootKey]: { ...row } });
      }
   }, [visible, row, itemSchema]);

   // Local dispatch that applies actions to the local model instead of the real model
   const localDispatch = React.useCallback(
      (action: DispatchAction) => {
         setLocalModel(prev => {
            const next = { ...prev };
            const rootKey = (action as any).rootKey ?? ITEM_ROOT_KEY;
            const rootObj = next[rootKey];
            if (!rootObj) {
               return prev;
            }
            // Clone the root object so we don't mutate the previous state
            next[rootKey] = { ...rootObj };
            const obj = next[rootKey];

            switch (action.type) {
               case 'dynamic:set-property': {
                  const a = action as any;
                  const value = a.undefinedIfEmpty && !a.value ? undefined : a.value;
                  obj[a.property] = value;
                  break;
               }
               case 'dynamic:set-id': {
                  obj.id = (action as any).id;
                  break;
               }
               // Handle custom property actions dispatched by CustomPropertiesDataGrid
               // These have the form `${contextType}:customProperty:*`
               default: {
                  if (action.type.includes(':customProperty:')) {
                     const a = action as any;
                     if (action.type.endsWith(':add-customProperty')) {
                        if (!obj.customProperties) {
                           obj.customProperties = [];
                        }
                        obj.customProperties = [...obj.customProperties, a.customProperty];
                     } else if (action.type.endsWith(':update')) {
                        if (obj.customProperties) {
                           obj.customProperties = [...obj.customProperties];
                           obj.customProperties[a.customPropertyIdx] = a.customProperty;
                        }
                     } else if (action.type.endsWith(':delete-customProperty')) {
                        if (obj.customProperties) {
                           obj.customProperties = obj.customProperties.filter((_: any, i: number) => i !== a.customPropertyIdx);
                        }
                     } else if (action.type.endsWith(':reorder-customProperties')) {
                        obj.customProperties = a.customProperties;
                     }
                  }
                  break;
               }
            }

            return next;
         });
      },
      []
   );

   const handleSave = React.useCallback(() => {
      if (!itemSchema) {
         return;
      }
      const localItem = localModel[itemSchema.rootKey];
      if (localItem) {
         onSave(localItem);
      }
   }, [localModel, itemSchema, onSave]);

   // Derive a title from the row's name or first text column
   const rowTitle = React.useMemo(() => {
      if (!row) {
         return '';
      }
      const nameValue = row.name || row.id || '';
      return nameValue ? ` - ${nameValue}` : '';
   }, [row]);

   const localRootObj = itemSchema ? localModel[itemSchema.rootKey] : undefined;

   const footer = (
      <div className='row-detail-dialog-footer'>
         <Button label='Cancel' icon='pi pi-times' className='p-button-text' onClick={onHide} />
         {!readonly && <Button label='Save' icon='pi pi-check' onClick={handleSave} />}
      </div>
   );

   // If no item schema is registered for this type, show a simple message
   if (!itemSchema) {
      return (
         <Dialog
            visible={visible}
            onHide={onHide}
            header={`Edit ${collection.label.replace(/s$/, '')}${rowTitle}`}
            footer={footer}
            modal
            className='row-detail-dialog'
            style={{ width: '500px' }}
            dismissableMask
            closable
         >
            <div className='row-detail-dialog-content'>
               <p>No detail form available for this item type.</p>
            </div>
         </Dialog>
      );
   }

   return (
      <Dialog
         visible={visible}
         onHide={onHide}
         header={`Edit ${itemSchema.displayName}${rowTitle}`}
         footer={footer}
         modal
         className='row-detail-dialog'
         style={{ width: '500px' }}
         dismissableMask
         closable
      >
         {localRootObj && (
            <ModelContext.Provider value={localModel as any}>
               <ModelDispatchContext.Provider value={localDispatch}>
                  <div className='row-detail-dialog-content'>
                     {itemSchema.sections.map((section, idx) => (
                        <DynamicSection key={`section-${idx}`} section={section} schema={itemSchema} rootObj={localRootObj} />
                     ))}
                     {itemSchema.collections.map((coll, idx) => (
                        <DynamicCollection key={`collection-${idx}`} collection={coll} schema={itemSchema} rootObj={localRootObj} />
                     ))}
                  </div>
               </ModelDispatchContext.Provider>
            </ModelContext.Provider>
         )}
      </Dialog>
   );
}
