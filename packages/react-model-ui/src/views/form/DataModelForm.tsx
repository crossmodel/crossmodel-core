/********************************************************************************
 * Copyright (c) 2025 CrossBreeze.
 ********************************************************************************/

import { CrossReferenceContext, ModelStructure, ReferenceableElement, toId } from '@crossmodel/protocol';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import * as React from 'react';
import { useTypeProperties } from '../../hooks/useTypeProperties';
import {
   useDataModel,
   useDiagnosticsManager,
   useModelDispatch,
   useModelQueryApi,
   useReadonly,
   useUntitled,
   useUri
} from '../../ModelContext';
import { modelComponent } from '../../ModelViewer';
import { themed } from '../../ThemedViewer';
import { FormSection } from '../FormSection';
import AsyncAutoComplete from '../common/AsyncAutoComplete';
import { DataModelCustomPropertiesDataGrid } from '../common/DataModelCustomPropertiesDataGrid';
import { DataModelDependenciesDataGrid } from '../common/DataModelDependenciesDataGrid';
import { ErrorInfo } from './ErrorInfo';
import { Form } from './Form';

export function DataModelForm(): React.ReactElement {
   const dispatch = useModelDispatch();
   const dataModel = useDataModel();
   const api = useModelQueryApi();
   const untitled = useUntitled();
   const uri = useUri();
   const readonly = useReadonly();
   const diagnostics = useDiagnosticsManager();
   const { propertyDefinitions } = useTypeProperties(dataModel.type);

   const handleNameChange = React.useCallback(
      (event: React.ChangeEvent<HTMLInputElement>) => {
         dispatch({ type: 'datamodel:change-name', name: event.target.value });
         if (untitled) {
            api.findNextId({ uri, type: dataModel.$type, proposal: toId(event.target.value) }).then(id =>
               dispatch({ type: 'datamodel:change-id', id })
            );
         }
      },
      [api, dataModel.$type, dispatch, untitled, uri]
   );

   const handleDescriptionChange = React.useCallback(
      (event: React.ChangeEvent<HTMLTextAreaElement>) => {
         dispatch({ type: 'datamodel:change-description', description: event.target.value });
      },
      [dispatch]
   );

   const typeReferenceCtx: CrossReferenceContext = React.useMemo(
      () => ({
         container: { globalId: dataModel.$globalId ?? dataModel.id ?? '' },
         property: 'type'
      }),
      [dataModel.$globalId, dataModel.id]
   );

   const typeOptionLoader = React.useCallback(
      () => api.findReferenceableElements(typeReferenceCtx).then(elements => elements.map((e: ReferenceableElement) => e.label)),
      [api, typeReferenceCtx]
   );

   const handleTypeChange = React.useCallback(
      (event: { value: string }) => {
         dispatch({ type: 'datamodel:change-type', objectDefinitionType: event.value });
      },
      [dispatch]
   );

   const handleVersionChange = React.useCallback(
      (event: React.ChangeEvent<HTMLInputElement>) => {
         dispatch({ type: 'datamodel:change-version', version: event.target.value });
      },
      [dispatch]
   );

   if (!dataModel) {
      return <div>No data model found</div>;
   }

   const nameDiagnostics = diagnostics.info('datamodel', 'name');
   const descriptionDiagnostics = diagnostics.info('datamodel', 'description');
   const typeDiagnostics = diagnostics.info('datamodel', 'type');
   const versionDiagnostics = diagnostics.info('datamodel', 'version');

   return (
      <Form id={dataModel.id} name={dataModel.name ?? 'Data Model'} iconClass={ModelStructure.DataModel.ICON_CLASS}>
         <FormSection label='General'>
            <div className='p-field p-fluid'>
               <div>
                  <label htmlFor='name'>Name</label>
                  <InputText
                     id='name'
                     value={dataModel.name ?? ''}
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
                     value={dataModel.description ?? ''}
                     onChange={handleDescriptionChange}
                     disabled={readonly}
                     rows={3}
                     autoResize
                     className={descriptionDiagnostics.inputClasses()}
                  />
               </div>
               <ErrorInfo diagnostic={descriptionDiagnostics} />
            </div>
            <AsyncAutoComplete
               label='Type'
               optionLoader={typeOptionLoader}
               value={dataModel.type ?? ''}
               onChange={handleTypeChange}
               disabled={readonly}
               className={typeDiagnostics.inputClasses()}
               error={!typeDiagnostics.empty}
               helperText={typeDiagnostics.text()}
            />
            <div className='p-field p-fluid'>
               <div>
                  <label htmlFor='version'>Version</label>
                  <InputText
                     id='version'
                     value={dataModel.version ?? ''}
                     onChange={handleVersionChange}
                     disabled={readonly}
                     className={versionDiagnostics.inputClasses()}
                  />
               </div>
               <ErrorInfo diagnostic={versionDiagnostics} />
            </div>
         </FormSection>
         <FormSection label='Dependencies'>
            <DataModelDependenciesDataGrid />
         </FormSection>
         <FormSection label='Custom properties'>
            <DataModelCustomPropertiesDataGrid propertyDefinitions={propertyDefinitions} />
         </FormSection>
      </Form>
   );
}

export const DataModelComponent = themed(modelComponent(DataModelForm));
