/********************************************************************************
 * Copyright (c) 2025 CrossBreeze.
 ********************************************************************************/

import { AllDataModelTypeInfos, CrossModelValidationErrors, DataModelTypeInfo, ModelStructure, toId } from '@crossmodel/protocol';
import { AutoComplete, AutoCompleteChangeEvent, AutoCompleteCompleteEvent } from 'primereact/autocomplete';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import * as React from 'react';
import { useDataModel, useDiagnostics, useModelDispatch, useModelQueryApi, useReadonly, useUntitled, useUri } from '../../ModelContext';
import { modelComponent } from '../../ModelViewer';
import { themed } from '../../ThemedViewer';
import { DataModelCustomPropertiesDataGrid } from '../common/DataModelCustomPropertiesDataGrid';
import { DataModelDependenciesDataGrid } from '../common/DataModelDependenciesDataGrid';
import { FormSection } from '../FormSection';
import { Form } from './Form';

export function DataModelForm(): React.ReactElement {
   const dispatch = useModelDispatch();
   const dataModel = useDataModel();
   const api = useModelQueryApi();
   const untitled = useUntitled();
   const uri = useUri();
   const readonly = useReadonly();
   const diagnostics = CrossModelValidationErrors.getFieldErrors(useDiagnostics());

   const [filteredTypes, setFilteredTypes] = React.useState<DataModelTypeInfo[]>([]);

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

   const handleTypeChange = React.useCallback(
      (e: AutoCompleteChangeEvent) => {
         if (e.value) {
            dispatch({ type: 'datamodel:change-type', dataModelType: e.value.value });
         }
      },
      [dispatch]
   );

   const handleVersionChange = React.useCallback(
      (event: React.ChangeEvent<HTMLInputElement>) => {
         dispatch({ type: 'datamodel:change-version', version: event.target.value });
      },
      [dispatch]
   );

   const searchType = (event: AutoCompleteCompleteEvent) => {
      let _filteredTypes;
      if (!event.query.trim()) {
         _filteredTypes = [...AllDataModelTypeInfos];
      } else {
         _filteredTypes = AllDataModelTypeInfos.filter(type => {
            return type.label.toLowerCase().startsWith(event.query.toLowerCase());
         });
      }
      setFilteredTypes(_filteredTypes);
   };

   if (!dataModel) {
      return <div>No data model found</div>;
   }

   return (
      <Form id={dataModel.id} name={dataModel.name ?? 'Data Model'} iconClass={ModelStructure.System.ICON_CLASS}>
         <FormSection label='General'>
            <div className='p-field p-fluid' style={{ marginTop: '1rem', marginBottom: '2rem' }}>
               <span className='p-float-label'>
                  <InputText
                     id='name'
                     value={dataModel.name ?? ''}
                     onChange={handleNameChange}
                     disabled={readonly}
                     required={true}
                     className={diagnostics.name?.length ? 'p-invalid' : ''}
                  />
                  <label htmlFor='name'>Name</label>
               </span>
               {diagnostics.name?.length && <small className='p-error'>{diagnostics.name?.[0]?.message}</small>}
            </div>
            <div className='p-field p-fluid' style={{ marginBottom: '2rem', marginTop: '1rem' }}>
               <span className='p-float-label'>
                  <InputTextarea
                     id='description'
                     value={dataModel.description ?? ''}
                     onChange={handleDescriptionChange}
                     disabled={readonly}
                     rows={3}
                     autoResize
                     className={diagnostics.description?.length ? 'p-invalid' : ''}
                  />
                  <label htmlFor='description'>Description</label>
               </span>
               {diagnostics.description?.length && <small className='p-error'>{diagnostics.description?.[0]?.message}</small>}
            </div>
            <div className='p-field p-fluid' style={{ marginBottom: '2rem', marginTop: '1rem' }}>
               <span className='p-float-label'>
                  <AutoComplete<DataModelTypeInfo>
                     id='type'
                     value={AllDataModelTypeInfos.find(t => t.value === dataModel.type) ?? AllDataModelTypeInfos[0]}
                     suggestions={filteredTypes}
                     completeMethod={searchType}
                     field='label'
                     onChange={handleTypeChange}
                     disabled={readonly}
                     required={true}
                     className={diagnostics.type?.length ? 'p-invalid' : ''}
                     dropdown
                  />
                  <label htmlFor='type'>Type</label>
               </span>
               {diagnostics.type?.length && <small className='p-error'>{diagnostics.type?.[0]?.message}</small>}
            </div>
            <div className='p-field p-fluid' style={{ marginBottom: '1rem', marginTop: '1rem' }}>
               <span className='p-float-label'>
                  <InputText
                     id='version'
                     value={dataModel.version ?? ''}
                     onChange={handleVersionChange}
                     disabled={readonly}
                     className={diagnostics.version?.length ? 'p-invalid' : ''}
                  />
                  <label htmlFor='version'>Version</label>
               </span>
               {diagnostics.version?.length && <small className='p-error'>{diagnostics.version?.[0]?.message}</small>}
            </div>
         </FormSection>
         <FormSection label='Dependencies'>
            <DataModelDependenciesDataGrid />
         </FormSection>
         <FormSection label='Custom properties'>
            <DataModelCustomPropertiesDataGrid />
         </FormSection>
      </Form>
   );
}

export const DataModelComponent = themed(modelComponent(DataModelForm));
