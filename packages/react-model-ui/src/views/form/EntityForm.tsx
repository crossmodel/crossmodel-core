/********************************************************************************
 * Copyright (c) 2023 CrossBreeze.
 ********************************************************************************/

import { CrossModelValidationErrors, ModelFileType, ModelStructure, toId } from '@crossmodel/protocol';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import * as React from 'react';
import { useDiagnostics, useEntity, useModelDispatch, useModelQueryApi, useReadonly, useUntitled, useUri } from '../../ModelContext';
import { modelComponent } from '../../ModelViewer';
import { themed } from '../../ThemedViewer';
import { FormSection } from '../FormSection';
import { EntityAttributesDataGrid } from '../common';
import { EntityCustomPropertiesDataGrid } from '../common/EntityCustomPropertiesDataGrid';
import { Form } from './Form';

export function EntityForm(): React.ReactElement {
   const dispatch = useModelDispatch();
   const entity = useEntity();
   const api = useModelQueryApi();
   const untitled = useUntitled();
   const uri = useUri();
   const readonly = useReadonly();
   const diagnostics = CrossModelValidationErrors.getFieldErrors(useDiagnostics());

   const handleNameChange = React.useCallback(
      (event: React.ChangeEvent<HTMLInputElement>) => {
         dispatch({ type: 'entity:change-name', name: event.target.value ?? '' });
         if (untitled) {
            api.findNextId({ uri, type: entity.$type, proposal: toId(event.target.value) }).then(id =>
               dispatch({ type: 'entity:change-id', id })
            );
         }
      },
      [untitled, dispatch, api, uri, entity]
   );

   return (
      <Form id={entity.id} name={entity.name ?? ModelFileType.LogicalEntity} iconClass={ModelStructure.LogicalEntity.ICON_CLASS}>
         <FormSection label='General'>
            <div className='p-field p-fluid' style={{ marginTop: '1rem', marginBottom: '2rem' }}>
               <span className='p-float-label'>
                  <InputText
                     id='name'
                     value={entity.name ?? ''}
                     onChange={handleNameChange}
                     disabled={readonly}
                     required={true}
                     className={diagnostics.name?.length ? 'p-invalid' : ''}
                  />
                  <label htmlFor='name'>Name</label>
               </span>
               {diagnostics.name?.length && <small className='p-error'>{diagnostics.name?.[0]?.message}</small>}
            </div>

            <div className='p-field p-fluid' style={{ marginBottom: '0' }}>
               <span className='p-float-label'>
                  <InputTextarea
                     id='description'
                     value={entity.description ?? ''}
                     onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) =>
                        dispatch({ type: 'entity:change-description', description: event.target.value ?? '' })
                     }
                     disabled={readonly}
                     rows={3}
                     autoResize
                     className={diagnostics.description?.length ? 'p-invalid' : ''}
                  />
                  <label htmlFor='description'>Description</label>
               </span>
               {diagnostics.description?.length && <small className='p-error'>{diagnostics.description?.[0]?.message}</small>}
            </div>
         </FormSection>
         <FormSection label='Attributes'>
            <EntityAttributesDataGrid />
         </FormSection>
         <FormSection label='Custom properties'>
            <EntityCustomPropertiesDataGrid />
         </FormSection>
      </Form>
   );
}

export const EntityComponent = themed(modelComponent(EntityForm));
