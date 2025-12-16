/********************************************************************************
 * Copyright (c) 2023 CrossBreeze.
 ********************************************************************************/

import { ModelFileType, ModelStructure, ReferenceableElement, computeRelationshipName, toId } from '@crossmodel/protocol';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import * as React from 'react';
import {
   useDiagnosticsManager,
   useModelDispatch,
   useModelQueryApi,
   useReadonly,
   useRelationship,
   useUntitled,
   useUri
} from '../../ModelContext';
import { modelComponent } from '../../ModelViewer';
import { themed } from '../../ThemedViewer';
import { FormSection } from '../FormSection';
import AsyncAutoComplete from '../common/AsyncAutoComplete';
import { GenericAutoCompleteEditor } from '../common/GenericEditors';
import { RelationshipAttributesDataGrid } from '../common/RelationshipAttributesDataGrid';
import { RelationshipCustomPropertiesDataGrid } from '../common/RelationshipCustomPropertiesDataGrid';
import { ErrorInfo } from './ErrorInfo';
import { Form } from './Form';

// Form with tabs to edit an relationship's properties and attributes.
export function RelationshipForm(): React.ReactElement {
   const dispatch = useModelDispatch();
   const api = useModelQueryApi();
   const relationship = useRelationship();
   const readonly = useReadonly();
   const diagnostics = useDiagnosticsManager();
   const untitled = useUntitled();
   const uri = useUri();

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

   const nameDiagnostics = diagnostics.info('relationship', 'name');
   const descriptionDiagnostics = diagnostics.info('relationship', 'description');
   const parentDiagnostics = diagnostics.info('relationship', 'parent');
   const parentCardinalityDiagnostics = diagnostics.info('relationship', 'parentCardinality');
   const parentRoleDiagnostics = diagnostics.info('relationship', 'parentRole');
   const childDiagnostics = diagnostics.info('relationship', 'child');
   const childCardinalityDiagnostics = diagnostics.info('relationship', 'childCardinality');
   const childRoleDiagnostics = diagnostics.info('relationship', 'childRole');

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
                     className={nameDiagnostics.inputClasses()}
                  />
               </div>
               <ErrorInfo diagnostic={nameDiagnostics} />
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
                     className={descriptionDiagnostics.inputClasses()}
                  />
               </div>
               <ErrorInfo diagnostic={descriptionDiagnostics} />
            </div>

            <AsyncAutoComplete
               label='Parent'
               optionLoader={referenceableElements}
               value={relationship.parent ?? ''}
               onChange={handleParentChange}
               disabled={readonly}
               required={true}
               error={!parentDiagnostics.empty}
               helperText={parentDiagnostics.text()}
            />

            <div className='p-field p-fluid'>
               <div>
                  <label htmlFor='parentCardinality'>Parent Cardinality</label>
                  <GenericAutoCompleteEditor
                     options={{
                        value: relationship.parentCardinality ?? '',
                        editorCallback: (v: string) =>
                           dispatch({ type: 'relationship:change-parent-cardinality', parentCardinality: v ?? '' }),
                        rowData: { idx: -1 }
                     }}
                     basePath={['relationship']}
                     field={'parentCardinality'}
                     dropdownOptions={cardinalities.map(c => ({ label: c, value: c }))}
                  />
               </div>
               <ErrorInfo diagnostic={parentCardinalityDiagnostics} />
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
                     className={parentRoleDiagnostics.inputClasses()}
                  />
               </div>
               <ErrorInfo diagnostic={parentRoleDiagnostics} />
            </div>

            <AsyncAutoComplete
               label='Child'
               optionLoader={referenceableElements}
               value={relationship.child ?? ''}
               onChange={handleChildChange}
               disabled={readonly}
               required={true}
               error={!childDiagnostics.empty}
               helperText={childDiagnostics.text()}
            />

            <div className='p-field p-fluid'>
               <div>
                  <label htmlFor='childCardinality'>Child Cardinality</label>
                  <GenericAutoCompleteEditor
                     options={{
                        value: relationship.childCardinality ?? '',
                        editorCallback: (v: string) =>
                           dispatch({ type: 'relationship:change-child-cardinality', childCardinality: v ?? '' }),
                        rowData: { idx: -1 }
                     }}
                     basePath={['relationship']}
                     field={'childCardinality'}
                     dropdownOptions={cardinalities.map(c => ({ label: c, value: c }))}
                  />
               </div>
               <ErrorInfo diagnostic={childCardinalityDiagnostics} />
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
                     className={childRoleDiagnostics.inputClasses()}
                  />
               </div>
               <ErrorInfo diagnostic={childRoleDiagnostics} />
            </div>
         </FormSection>
         <FormSection label='Attributes'>
            <RelationshipAttributesDataGrid />
         </FormSection>
         <FormSection label='Custom properties' defaultCollapsed={true}>
            <RelationshipCustomPropertiesDataGrid />
         </FormSection>
      </Form>
   );
}

export const RelationshipComponent = themed(modelComponent(RelationshipForm));
