/********************************************************************************
 * Copyright (c) 2025 CrossBreeze.
 ********************************************************************************/

import { AllDataModelTypeInfos, CrossModelValidationErrors, DataModelTypeInfo, ModelStructure, toId } from '@crossmodel/protocol';
import { debounce } from 'lodash';
import {
   AutoComplete,
   AutoCompleteChangeEvent,
   AutoCompleteCompleteEvent,
   AutoCompleteDropdownClickEvent,
   AutoCompleteSelectEvent
} from 'primereact/autocomplete';
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
   const [currentTypeValue, setCurrentTypeValue] = React.useState<DataModelTypeInfo | undefined>(
      AllDataModelTypeInfos.find(t => t.value === dataModel.type) ?? AllDataModelTypeInfos[0]
   );
   const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);
   // eslint-disable-next-line no-null/no-null
   const autoCompleteRef = React.useRef<AutoComplete>(null);
   const dropdownJustOpened = React.useRef(false);

   React.useEffect(() => {
      setCurrentTypeValue(AllDataModelTypeInfos.find(t => t.value === dataModel.type) ?? AllDataModelTypeInfos[0]);
   }, [dataModel.type]);

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

   const handleTypeChange = React.useCallback((e: AutoCompleteChangeEvent) => {
      setCurrentTypeValue(e.value as DataModelTypeInfo);
   }, []);

   const debouncedDispatch = React.useCallback(
      debounce((value: string) => {
         dispatch({ type: 'datamodel:change-type', dataModelType: value });
      }, 300), // Adjust the debounce delay as needed
      [dispatch, debounce]
   );

   const handleTypeSelect = React.useCallback(
      (e: AutoCompleteSelectEvent) => {
         if (e.value) {
            debouncedDispatch(e.value.value);
         }
         setIsDropdownOpen(false);
      },
      [debouncedDispatch]
   );

   const handleVersionChange = React.useCallback(
      (event: React.ChangeEvent<HTMLInputElement>) => {
         dispatch({ type: 'datamodel:change-version', version: event.target.value });
      },
      [dispatch]
   );

   const searchType = (event: AutoCompleteCompleteEvent): void => {
      let _filteredTypes;
      if (!event.query.trim()) {
         _filteredTypes = [...AllDataModelTypeInfos];
      } else {
         _filteredTypes = AllDataModelTypeInfos.filter(type => type.label.toLowerCase().startsWith(event.query.toLowerCase()));
      }
      setFilteredTypes(_filteredTypes);
   };

   const handleDropdownClick = (event: AutoCompleteDropdownClickEvent): void => {
      if (isDropdownOpen && !dropdownJustOpened.current) {
         // If dropdown is open and wasn't just opened, close it
         setTimeout(() => {
            autoCompleteRef.current?.hide();
            setIsDropdownOpen(false);
         }, 10);
      }
      // Reset the flag after a short delay
      setTimeout(() => {
         dropdownJustOpened.current = false;
      }, 100);
   };

   const onShow = (): void => {
      setIsDropdownOpen(true);
      dropdownJustOpened.current = true;
   };

   const onHide = (): void => {
      setIsDropdownOpen(false);
      dropdownJustOpened.current = false;
   };

   // Handle click outside to close dropdown
   React.useEffect(() => {
      const handleClickOutside = (event: MouseEvent): void => {
         if (autoCompleteRef.current && !autoCompleteRef.current.getElement()?.contains(event.target as Node)) {
            setTimeout(() => {
               const panel = autoCompleteRef.current?.getOverlay();
               if (panel && panel.style.display !== 'none') {
                  autoCompleteRef.current?.hide();
                  setIsDropdownOpen(false);
               }
            }, 100);
         }
      };

      document.addEventListener('mouseup', handleClickOutside);
      return () => {
         document.removeEventListener('mouseup', handleClickOutside);
      };
   }, []);

   if (!dataModel) {
      return <div>No data model found</div>;
   }

   return (
      <Form id={dataModel.id} name={dataModel.name ?? 'Data Model'} iconClass={ModelStructure.System.ICON_CLASS}>
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
                     className={diagnostics.name?.length ? 'p-invalid' : ''}
                  />
               </div>
               {diagnostics.name?.length && <small className='p-error'>{diagnostics.name?.[0]?.message}</small>}
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
                     className={diagnostics.description?.length ? 'p-invalid' : ''}
                  />
               </div>
               {diagnostics.description?.length && <small className='p-error'>{diagnostics.description?.[0]?.message}</small>}
            </div>
            <div className='p-field p-fluid'>
               <div>
                  <label htmlFor='type'>Type</label>
                  <AutoComplete<DataModelTypeInfo>
                     ref={autoCompleteRef}
                     id='type'
                     value={currentTypeValue}
                     suggestions={filteredTypes}
                     completeMethod={searchType}
                     field='label'
                     onChange={handleTypeChange}
                     onSelect={handleTypeSelect}
                     disabled={readonly}
                     required={true}
                     className={`${diagnostics.type?.length ? 'p-invalid' : ''} ${isDropdownOpen ? 'autocomplete-dropdown-open' : ''}`}
                     dropdown
                     onDropdownClick={handleDropdownClick}
                     onShow={onShow}
                     onHide={onHide}
                  />
               </div>
               {diagnostics.type?.length && <small className='p-error'>{diagnostics.type?.[0]?.message}</small>}
            </div>
            <div className='p-field p-fluid'>
               <div>
                  <label htmlFor='version'>Version</label>
                  <InputText
                     id='version'
                     value={dataModel.version ?? ''}
                     onChange={handleVersionChange}
                     disabled={readonly}
                     className={diagnostics.version?.length ? 'p-invalid' : ''}
                  />
               </div>
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
