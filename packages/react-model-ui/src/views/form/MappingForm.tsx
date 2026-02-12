/********************************************************************************
 * Copyright (c) 2023 CrossBreeze.
 ********************************************************************************/

import { InputText } from 'primereact/inputtext';
import * as React from 'react';
import { useDiagnosticsManager, useMapping } from '../../ModelContext';
import { modelComponent } from '../../ModelViewer';
import { themed } from '../../ThemedViewer';
import { FormSection } from '../FormSection';
import { AttributeMappingExpressionDataGrid } from '../common/AttributeMappingExpressionDataGrid';
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
   const diagnostics = useDiagnosticsManager();

   const attributeMapping = mapping.target.mappings[props.mappingIndex];
   if (!attributeMapping) {
      return <></>;
   }

   const elementPath = ['mapping', 'target', 'mappings@' + props.mappingIndex];

   const targetAttributeDiagnostics = diagnostics.info([...elementPath, 'attribute'], 'value');

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
                  <InputText id='targetAttribute' value={attributeMapping.attribute?.value ?? ''} disabled={true} spellCheck={false} />
               </div>
               <ErrorInfo diagnostic={targetAttributeDiagnostics} />
            </div>
         </FormSection>
         <FormSection label='Sources'>
            <AttributeMappingSourcesDataGrid attributeMapping={attributeMapping} mappingIdx={props.mappingIndex} />
         </FormSection>
         <FormSection label='Expressions'>
            <AttributeMappingExpressionDataGrid attributeMapping={attributeMapping} mappingIdx={props.mappingIndex} />
         </FormSection>
      </Form>
   );
}

export const MappingComponent = themed(modelComponent(MappingForm));
