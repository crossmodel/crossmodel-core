/********************************************************************************
 * Copyright (c) 2024 CrossBreeze.
 ********************************************************************************/

import { CrossModelValidationErrors, SourceObjectJoinType } from '@crossmodel/protocol';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import * as React from 'react';
import { useDiagnostics, useMapping, useModelDispatch, useReadonly } from '../../ModelContext';
import { modelComponent } from '../../ModelViewer';
import { themed } from '../../ThemedViewer';
import { FormSection } from '../FormSection';
import { SourceObjectConditionDataGrid } from '../common/SourceObjectConditionDataGrid';
import { SourceObjectDependencyDataGrid } from '../common/SourceObjectDependencyDataGrid';
import { Form } from './Form';

export interface SourceObjectRenderProps {
   sourceObjectIndex: number;
}

export function SourceObjectForm(props: SourceObjectRenderProps): React.ReactElement {
   const mapping = useMapping();
   const dispatch = useModelDispatch();
   const readonly = useReadonly();
   const sourceObject = mapping.sources[props.sourceObjectIndex];
   const baseDiagnostics = useDiagnostics();
   // Reactive diagnostics state
   const [diagnostics, setDiagnostics] = React.useState(CrossModelValidationErrors.getFieldErrors(baseDiagnostics));
   // Update diagnostics whenever baseDiagnostics changes
   React.useEffect(() => {
      setDiagnostics(CrossModelValidationErrors.getFieldErrors(baseDiagnostics));
   }, [baseDiagnostics]);
   if (!sourceObject) {
      return <></>;
   }

   const changeJoinType = (event: { value: string }): void => {
      dispatch({
         type: 'source-object:change-join',
         sourceObjectIdx: props.sourceObjectIndex,
         join: event.value as SourceObjectJoinType
      });
   };

   return (
      <Form id={mapping.id} name={sourceObject.id ?? 'Source Object'} iconClass='codicon-group-by-ref-type'>
         <FormSection label='General'>
            <div className='p-field p-fluid'>
               <div>
                  <label htmlFor='id'>ID</label>
                  <InputText id='id' value={sourceObject.id ?? ''} disabled={true} spellCheck={false} />
               </div>
               {diagnostics.id?.length && <small className='p-error'>{diagnostics.id?.[0]?.message}</small>}
            </div>

            <div className='p-field p-fluid'>
               <div>
                  <label htmlFor='entity'>Entity</label>
                  <InputText id='entity' value={sourceObject.entity ?? ''} disabled={true} spellCheck={false} />
               </div>
               {diagnostics.entity?.length && <small className='p-error'>{diagnostics.entity?.[0]?.message}</small>}
            </div>
            <Dropdown
               value={sourceObject.join}
               onChange={e => changeJoinType(e)}
               options={[
                  { label: 'From', value: 'from' },
                  { label: 'Inner Join', value: 'inner-join' },
                  { label: 'Cross Join', value: 'cross-join' },
                  { label: 'Left Join', value: 'left-join' },
                  { label: 'Apply', value: 'apply' }
               ]}
               placeholder='Select Join Type'
               className='w-full'
               disabled={readonly}
            />
         </FormSection>
         <FormSection label='Dependencies'>
            <SourceObjectDependencyDataGrid mapping={mapping} sourceObjectIdx={props.sourceObjectIndex} />
         </FormSection>
         <FormSection label='Conditions'>
            <SourceObjectConditionDataGrid mapping={mapping} sourceObjectIdx={props.sourceObjectIndex} />
         </FormSection>
      </Form>
   );
}

export const SourceObjectComponent = themed(modelComponent(SourceObjectForm));
