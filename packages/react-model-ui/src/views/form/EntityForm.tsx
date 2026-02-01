/********************************************************************************
 * Copyright (c) 2023 CrossBreeze.
 ********************************************************************************/

import { ModelFileType, ModelStructure, toId } from '@crossmodel/protocol';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import * as React from 'react';
import { useTypeProperties } from '../../hooks/useTypeProperties';
import { useDiagnosticsManager, useEntity, useModelDispatch, useModelQueryApi, useReadonly, useUntitled, useUri } from '../../ModelContext';
import { modelComponent } from '../../ModelViewer';
import { themed } from '../../ThemedViewer';
import { FormSection } from '../FormSection';
import { EntityAttributesDataGrid } from '../common';
import { EntityCustomPropertiesDataGrid } from '../common/EntityCustomPropertiesDataGrid';
import { EntityIdentifiersDataGrid } from '../common/EntityIdentifiersDataGrid';
import { EntityInheritsDataGrid } from '../common/EntityInheritsDataGrid';
import { ErrorInfo } from './ErrorInfo';
import { Form } from './Form';

export function EntityForm(): React.ReactElement {
   const dispatch = useModelDispatch();
   const entity = useEntity();
   const api = useModelQueryApi();
   const untitled = useUntitled();
   const uri = useUri();
   const readonly = useReadonly();
   const diagnostics = useDiagnosticsManager();
   const { propertyDefinitions } = useTypeProperties(entity.type);

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

   const nameDiagnostics = diagnostics.info('entity', 'name');
   const descriptionDiagnostics = diagnostics.info('entity', 'description');

   return (
      <Form id={entity.id} name={entity.name ?? ModelFileType.LogicalEntity} iconClass={ModelStructure.LogicalEntity.ICON_CLASS}>
         <FormSection label='General'>
            <div className='p-field p-fluid'>
               <div>
                  <label htmlFor='name'>Name</label>
                  <InputText
                     id='name'
                     value={entity.name ?? ''}
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
                     value={entity.description ?? ''}
                     onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) =>
                        dispatch({ type: 'entity:change-description', description: event.target.value ?? '' })
                     }
                     disabled={readonly}
                     rows={3}
                     autoResize
                     className={descriptionDiagnostics.inputClasses()}
                  />
               </div>
               <ErrorInfo diagnostic={descriptionDiagnostics} />
            </div>
         </FormSection>
         <FormSection label='Inheritance' defaultCollapsed={true}>
            <EntityInheritsDataGrid />
         </FormSection>
         <FormSection label='Attributes'>
            <EntityAttributesDataGrid />
         </FormSection>
         <FormSection label='Identifiers'>
            <EntityIdentifiersDataGrid />
         </FormSection>
         <FormSection label='Custom properties'>
            <EntityCustomPropertiesDataGrid propertyDefinitions={propertyDefinitions} />
         </FormSection>
      </Form>
   );
}

export const EntityComponent = themed(modelComponent(EntityForm));
