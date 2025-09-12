/********************************************************************************
 * Copyright (c) 2023 CrossBreeze.
 ********************************************************************************/

import {
   computeRelationshipName,
   CrossModelValidationErrors,
   ModelFileType,
   ModelStructure,
   ReferenceableElement,
   toId
} from '@crossmodel/protocol';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import * as React from 'react';
import { useDiagnostics, useModelDispatch, useModelQueryApi, useReadonly, useRelationship, useUntitled, useUri } from '../../ModelContext';
import { modelComponent } from '../../ModelViewer';
import { themed } from '../../ThemedViewer';
import { FormSection } from '../FormSection';
import AsyncAutoComplete from '../common/AsyncAutoComplete';
import { RelationshipAttributesDataGrid } from '../common/RelationshipAttributesDataGrid';
import { RelationshipCustomPropertiesDataGrid } from '../common/RelationshipCustomPropertiesDataGrid';
import { Form } from './Form';

// Form with tabs to edit an relationship's properties and attributes.
export function RelationshipForm(): React.ReactElement {
   const dispatch = useModelDispatch();
   const api = useModelQueryApi();
   const relationship = useRelationship();
   const readonly = useReadonly();
   const baseDiagnostics = useDiagnostics();
   const untitled = useUntitled();
   const uri = useUri();
   // Reactive diagnostics state
   const [diagnostics, setDiagnostics] = React.useState(CrossModelValidationErrors.getFieldErrors(baseDiagnostics));
   // Update diagnostics whenever baseDiagnostics changes
   React.useEffect(() => {
      setDiagnostics(CrossModelValidationErrors.getFieldErrors(baseDiagnostics));
   }, [baseDiagnostics]);

   const usingDefaultName = React.useMemo(
      () => relationship.name === computeRelationshipName(relationship.parent, relationship.child),
      [relationship.name, relationship.parent, relationship.child]
   );

   const reference = React.useMemo(() => ({ container: { globalId: relationship!.id! }, property: 'parent' }), [relationship]);
   const referenceableElements = React.useCallback(
      () => api.findReferenceableElements(reference).then(references => references.map(referenceLabelProvider)),
      [api, reference]
   );
   const referenceLabelProvider = (element: ReferenceableElement): string => element.label;

   const cardinalities = ['0..1', '1', '0..N', '1..N'];

   const updateNameAndId = React.useCallback(
      (parent?: string, child?: string) => {
         const name = computeRelationshipName(parent, child);
         const proposal = toId(name);
         dispatch({ type: 'relationship:change-name', name });
         api.findNextId({ uri, type: relationship.$type, proposal }).then(id => dispatch({ type: 'relationship:change-id', id }));
      },
      [dispatch, api, uri, relationship]
   );

   const handleParentChange = React.useCallback(
      (event: { value: string }) => {
         dispatch({ type: 'relationship:change-parent', parent: event.value });
         if (untitled && usingDefaultName) {
            updateNameAndId(event.value, relationship.child);
         }
      },
      [dispatch, untitled, usingDefaultName, relationship, updateNameAndId]
   );

   const handleChildChange = React.useCallback(
      (event: { value: string }) => {
         dispatch({ type: 'relationship:change-child', child: event.value });
         if (untitled && usingDefaultName) {
            updateNameAndId(relationship.parent, event.value);
         }
      },
      [dispatch, untitled, usingDefaultName, relationship, updateNameAndId]
   );

   const handleNameChange = React.useCallback(
      (event: React.ChangeEvent<HTMLInputElement>) => {
         dispatch({ type: 'relationship:change-name', name: event.target.value ?? '' });
         if (untitled) {
            api.findNextId({ uri, type: relationship.$type, proposal: toId(event.target.value) }).then(id =>
               dispatch({ type: 'relationship:change-id', id })
            );
         }
      },
      [untitled, dispatch, api, uri, relationship]
   );

   return (
      <Form id={relationship.id} name={relationship.name ?? ModelFileType.Relationship} iconClass={ModelStructure.Relationship.ICON_CLASS}>
         <FormSection label='General'>
            <div className='p-field p-fluid'>
               <div>
                  <label htmlFor='name'>Name</label>
                  <InputText
                     id='name'
                     value={relationship.name ?? ''}
                     onChange={handleNameChange}
                     disabled={readonly}
                     required={true}
                     className={diagnostics.name?.length ? 'p-invalid' : ''}
                  />
               </div>
               {diagnostics.name?.length && <small className='p-error'>{diagnostics.name?.[0]?.message}</small>}
            </div>

            <div className='p-field p-fluid'>
               <div>
                  <label htmlFor='description'>Description</label>
                  <InputTextarea
                     id='description'
                     value={relationship.description ?? ''}
                     onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) =>
                        dispatch({ type: 'relationship:change-description', description: event.target.value ?? '' })
                     }
                     disabled={readonly}
                     rows={3}
                     autoResize
                     className={diagnostics.description?.length ? 'p-invalid' : ''}
                  />
               </div>
               {diagnostics.description?.length && <small className='p-error'>{diagnostics.description?.[0]?.message}</small>}
            </div>

            <AsyncAutoComplete
               label='Parent'
               optionLoader={referenceableElements}
               value={relationship.parent ?? ''}
               onChange={handleParentChange}
               disabled={readonly}
               required={true}
               error={!!diagnostics.parent?.length}
               helperText={diagnostics.parent?.[0]?.message}
            />

            <div className='p-field p-fluid'>
               <div>
                  <label htmlFor='parentCardinality'>Parent Cardinality</label>
                  <Dropdown
                     id='parentCardinality'
                     options={cardinalities}
                     value={relationship.parentCardinality ?? ''}
                     onChange={e =>
                        dispatch({
                           type: 'relationship:change-parent-cardinality',
                           parentCardinality: e.value ?? ''
                        })
                     }
                     disabled={readonly}
                  />
               </div>
            </div>

            <div className='p-field p-fluid'>
               <div>
                  <label htmlFor='parentRole'>Parent Role</label>
                  <InputTextarea
                     id='parentRole'
                     value={relationship.parentRole ?? ''}
                     onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) =>
                        dispatch({ type: 'relationship:change-parent-role', parentRole: event.target.value ?? '' })
                     }
                     disabled={readonly}
                     rows={2}
                     autoResize
                     className={diagnostics.parentRole?.length ? 'p-invalid' : ''}
                  />
               </div>
               {diagnostics.parentRole?.length && <small className='p-error'>{diagnostics.parentRole?.[0]?.message}</small>}
            </div>

            <AsyncAutoComplete
               label='Child'
               optionLoader={referenceableElements}
               value={relationship.child ?? ''}
               onChange={handleChildChange}
               disabled={readonly}
               required={true}
               error={!!diagnostics.child?.length}
               helperText={diagnostics.child?.[0]?.message}
            />

            <div className='p-field p-fluid'>
               <div>
                  <label htmlFor='childCardinality'>Child Cardinality</label>
                  <Dropdown
                     id='childCardinality'
                     options={cardinalities}
                     value={relationship.childCardinality ?? ''}
                     onChange={e =>
                        dispatch({
                           type: 'relationship:change-child-cardinality',
                           childCardinality: e.value ?? ''
                        })
                     }
                     disabled={readonly}
                  />
               </div>
            </div>

            <div className='p-field p-fluid'>
               <div>
                  <label htmlFor='childRole'>Child Role</label>
                  <InputTextarea
                     id='childRole'
                     value={relationship.childRole ?? ''}
                     onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) =>
                        dispatch({ type: 'relationship:change-child-role', childRole: event.target.value ?? '' })
                     }
                     disabled={readonly}
                     rows={2}
                     autoResize
                     className={diagnostics.childRole?.length ? 'p-invalid' : ''}
                  />
               </div>
               {diagnostics.childRole?.length && <small className='p-error'>{diagnostics.childRole?.[0]?.message}</small>}
            </div>
         </FormSection>
         <FormSection label='Attributes'>
            <RelationshipAttributesDataGrid diagnostics={diagnostics} />
         </FormSection>
         <FormSection label='Custom properties'>
            <RelationshipCustomPropertiesDataGrid />
         </FormSection>
      </Form>
   );
}

export const RelationshipComponent = themed(modelComponent(RelationshipForm));
