/********************************************************************************
 * Copyright (c) 2023 CrossBreeze.
 ********************************************************************************/

import { CrossModelValidationErrors } from '@crossmodel/protocol';
import { InputText } from 'primereact/inputtext';
import * as React from 'react';
import { useDiagnostics, useMapping, useModelDispatch, useReadonly } from '../../ModelContext';
import { modelComponent } from '../../ModelViewer';
import { themed } from '../../ThemedViewer';
import { FormSection } from '../FormSection';
import { AttributeMappingSourcesDataGrid } from '../common/AttributeMappingSourcesDataGrid';
import { Form } from './Form';

export interface NewMappingRenderProps {
   attributeId: string;
}

export interface MappingRenderProps {
   mappingIndex: number;
}

export function MappingForm(props: MappingRenderProps): React.ReactElement {
   const mapping = useMapping();
   const dispatch = useModelDispatch();
   const readonly = useReadonly();
   const diagnostics = CrossModelValidationErrors.getFieldErrors(useDiagnostics());

   const attributeMapping = mapping.target.mappings[props.mappingIndex];
   if (!attributeMapping) {
      return <></>;
   }

   return (
      <Form
         id={mapping.id}
         name={attributeMapping.attribute?.value ?? mapping.target.entity ?? 'Mapping'}
         iconClass='codicon-group-by-ref-type'
      >
         <FormSection label='General'>
            <div className='p-field p-fluid' style={{ marginTop: '1rem', marginBottom: '2rem' }}>
               <span className='p-float-label'>
                  <InputText id='targetAttribute' value={attributeMapping.attribute?.value ?? ''} disabled={true} spellCheck={false} />
                  <label htmlFor='targetAttribute'>Target Attribute</label>
               </span>
               {diagnostics.attribute?.length && <small className='p-error'>{diagnostics.attribute?.[0]?.message}</small>}
            </div>

            <div className='p-field p-fluid' style={{ marginBottom: '0' }}>
               <span className='p-float-label'>
                  <InputText
                     id='expression'
                     value={attributeMapping.expression ?? ''}
                     disabled={readonly}
                     onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        dispatch({
                           type: 'attribute-mapping:change-expression',
                           mappingIdx: props.mappingIndex,
                           expression: e.target.value ?? ''
                        })
                     }
                  />
                  <label htmlFor='expression'>Expression</label>
               </span>
               {diagnostics.expression?.length && <small className='p-error'>{diagnostics.expression?.[0]?.message}</small>}
            </div>
         </FormSection>
         <FormSection label='Sources'>
            <AttributeMappingSourcesDataGrid attributeMapping={attributeMapping} mappingIdx={props.mappingIndex} />
         </FormSection>
      </Form>
   );
}

export const MappingComponent = themed(modelComponent(MappingForm));
