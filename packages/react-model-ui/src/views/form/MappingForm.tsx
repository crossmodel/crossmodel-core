/********************************************************************************
 * Copyright (c) 2023 CrossBreeze.
 ********************************************************************************/

import { InputText } from 'primereact/inputtext';
import * as React from 'react';
import { useDiagnosticsManager, useMapping, useModelDispatch, useReadonly } from '../../ModelContext';
import { modelComponent } from '../../ModelViewer';
import { themed } from '../../ThemedViewer';
import { FormSection } from '../FormSection';
import { AttributeMappingSourcesDataGrid } from '../common/AttributeMappingSourcesDataGrid';
import { ErrorInfo } from './ErrorInfo';
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
   const diagnostics = useDiagnosticsManager();

   const attributeMapping = mapping.target.mappings[props.mappingIndex];
   if (!attributeMapping) {
      return <></>;
   }

   const elementPath = ['mapping', 'target', 'mappings@' + props.mappingIndex];

   const targetAttributeDiagnostics = diagnostics.info([...elementPath, 'attribute'], 'value');
   const expressionDiagnostics = diagnostics.info(elementPath, 'expression');

   return (
      <Form
         id={mapping.id}
         name={attributeMapping.attribute?.value ?? mapping.target.entity ?? 'Mapping'}
         iconClass='codicon-group-by-ref-type'
      >
         <FormSection label='General'>
            <div className='p-field p-fluid'>
               <div>
                  <label htmlFor='targetAttribute'>Target Attribute</label>
                  <InputText
                     id='targetAttribute'
                     value={attributeMapping.attribute?.value ?? ''}
                     disabled={true}
                     spellCheck={false}
                     className={expressionDiagnostics.inputClasses()}
                  />
               </div>
               <ErrorInfo diagnostic={targetAttributeDiagnostics} />
            </div>

            <div className='p-field p-fluid'>
               <div>
                  <label htmlFor='expression'>Expression</label>
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
                     className={expressionDiagnostics.inputClasses()}
                  />
               </div>
               <ErrorInfo diagnostic={expressionDiagnostics} />
            </div>
         </FormSection>
         <FormSection label='Sources'>
            <AttributeMappingSourcesDataGrid attributeMapping={attributeMapping} mappingIdx={props.mappingIndex} />
         </FormSection>
      </Form>
   );
}

export const MappingComponent = themed(modelComponent(MappingForm));
