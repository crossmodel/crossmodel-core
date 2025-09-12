/********************************************************************************
 * Copyright (c) 2025 CrossBreeze.
 ********************************************************************************/

import {
   AllDataModelTypeInfos,
   CrossModelValidationErrors,
   DataModelTypeInfo,
   DataModelTypeInfos,
   ModelStructure,
   toId
} from '@crossmodel/protocol';
import { TextField } from '@mui/material';
import * as React from 'react';
import { useDataModel, useDiagnostics, useModelDispatch, useModelQueryApi, useReadonly, useUntitled, useUri } from '../../ModelContext';
import { modelComponent } from '../../ModelViewer';
import { themed } from '../../ThemedViewer';
import { FormSection } from '../FormSection';
import AsyncAutoComplete from '../common/AsyncAutoComplete';
import { DataModelCustomPropertiesDataGrid } from '../common/DataModelCustomPropertiesDataGrid';
import { DataModelDependenciesDataGrid } from '../common/DataModelDependenciesDataGrid';
import { Form } from './Form';

export function DataModelForm(): React.ReactElement {
   const dispatch = useModelDispatch();
   const dataModel = useDataModel();
   const api = useModelQueryApi();
   const untitled = useUntitled();
   const uri = useUri();
   const readonly = useReadonly();
   const diagnostics = CrossModelValidationErrors.getFieldErrors(useDiagnostics());

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
      (event: React.ChangeEvent<HTMLInputElement>) => {
         dispatch({ type: 'datamodel:change-description', description: event.target.value });
      },
      [dispatch]
   );

   const handleTypeChange = React.useCallback(
      (_: any, value: any) => {
         if (value) {
            dispatch({ type: 'datamodel:change-type', dataModelType: value.value });
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

   if (!dataModel) {
      return <div>No data model found</div>;
   }

   return (
      <Form id={dataModel.id} name={dataModel.name ?? 'Data Model'} iconClass={ModelStructure.DataModel.ICON_CLASS}>
         <FormSection label='General'>
            <TextField
               fullWidth={true}
               label='Name'
               margin='normal'
               variant='outlined'
               disabled={readonly}
               required={true}
               value={dataModel.name ?? ''}
               error={!!diagnostics.name?.length}
               helperText={diagnostics.name?.at(0)?.message}
               onChange={handleNameChange}
            />
            <TextField
               fullWidth={true}
               label='Description'
               margin='normal'
               variant='outlined'
               disabled={readonly}
               multiline={true}
               rows={3}
               value={dataModel.description ?? ''}
               error={!!diagnostics.description?.length}
               helperText={diagnostics.description?.at(0)?.message}
               onChange={handleDescriptionChange}
            />
            <AsyncAutoComplete
               label='Type'
               optionLoader={async () => AllDataModelTypeInfos}
               value={DataModelTypeInfos[dataModel.type] ?? DataModelTypeInfos.logical}
               onChange={handleTypeChange}
               getOptionLabel={(option: DataModelTypeInfo) => option.label}
               isOptionEqualToValue={(option: DataModelTypeInfo, value: DataModelTypeInfo) => option.value === value.value}
               textFieldProps={{
                  margin: 'normal',
                  variant: 'outlined',
                  fullWidth: true,
                  required: true
               }}
            />
            <TextField
               fullWidth={true}
               label='Version'
               margin='normal'
               variant='outlined'
               disabled={readonly}
               value={dataModel.version ?? ''}
               error={!!diagnostics.version?.length}
               helperText={diagnostics.version?.at(0)?.message}
               onChange={handleVersionChange}
            />
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
