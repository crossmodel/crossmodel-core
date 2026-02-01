/********************************************************************************
 * Copyright (c) 2025 CrossBreeze.
 ********************************************************************************/
import { CrossReferenceContext, ReferenceableElement, toId } from '@crossmodel/protocol';
import { AutoComplete, AutoCompleteChangeEvent } from 'primereact/autocomplete';
import { Checkbox, CheckboxChangeEvent } from 'primereact/checkbox';
import { InputNumber, InputNumberValueChangeEvent } from 'primereact/inputnumber';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import * as React from 'react';
import { useDiagnosticsManager, useModelDispatch, useModelQueryApi, useReadonly, useUntitled, useUri } from '../ModelContext';
import AsyncAutoComplete from '../views/common/AsyncAutoComplete';
import { ErrorInfo } from '../views/form/ErrorInfo';
import { DynamicFormSchema, FieldDescriptor } from './schema';

export interface DynamicFieldProps {
   field: FieldDescriptor;
   schema: DynamicFormSchema;
   rootObj: any;
   /** Sibling fields in the same section, used for cascading dependency clears. */
   siblingFields?: FieldDescriptor[];
}

export function DynamicField({ field, schema, rootObj, siblingFields }: DynamicFieldProps): React.ReactElement {
   const dispatch = useModelDispatch();
   const diagnostics = useDiagnosticsManager();
   const api = useModelQueryApi();
   const readonly = useReadonly();
   const untitled = useUntitled();
   const uri = useUri();

   // Evaluate field dependency
   const isApplicable = field.dependency ? field.dependency.isApplicable(rootObj[field.dependency.sourceProperty]) : true;
   const isDisabled = readonly || field.disabled || !isApplicable;
   const diagInfo = diagnostics.info(schema.diagnosticPath, field.property);

   // Find sibling fields that depend on this field (for cascading clears)
   const dependentFields = React.useMemo(
      () => (siblingFields ?? []).filter(f => f.dependency?.sourceProperty === field.property),
      [siblingFields, field.property]
   );

   const handleChange = React.useCallback(
      (value: any) => {
         dispatch({
            type: 'dynamic:set-property',
            rootKey: schema.rootKey,
            property: field.property,
            value,
            undefinedIfEmpty: field.undefinedIfEmpty
         });

         // Clear dependent fields that become inapplicable with the new value
         for (const dep of dependentFields) {
            if (!dep.dependency!.isApplicable(value)) {
               dispatch({
                  type: 'dynamic:set-property',
                  rootKey: schema.rootKey,
                  property: dep.property,
                  value: undefined
               });
            }
         }

         // Auto-generate ID when name changes on untitled files
         if (field.property === 'name' && untitled) {
            api.findNextId({ uri, type: rootObj.$type, proposal: toId(value) }).then(id =>
               dispatch({ type: 'dynamic:set-id', rootKey: schema.rootKey, id })
            );
         }
      },
      [dispatch, schema.rootKey, field.property, field.undefinedIfEmpty, dependentFields, untitled, api, uri, rootObj.$type]
   );

   switch (field.fieldType) {
      case 'text':
         return (
            <div className='p-field p-fluid' style={{ opacity: isApplicable ? 1 : 0.4 }}
               title={!isApplicable ? field.dependency?.disabledTooltip : undefined}>
               <div>
                  <label htmlFor={field.property}>{field.label}</label>
                  <InputText
                     id={field.property}
                     value={isApplicable ? (rootObj[field.property] ?? '') : ''}
                     onChange={e => handleChange(e.target.value)}
                     disabled={isDisabled}
                     required={field.required}
                     className={diagInfo.inputClasses()}
                  />
               </div>
               <ErrorInfo diagnostic={diagInfo} />
            </div>
         );

      case 'textarea':
         return (
            <div className='p-field p-fluid' style={{ opacity: isApplicable ? 1 : 0.4 }}
               title={!isApplicable ? field.dependency?.disabledTooltip : undefined}>
               <div>
                  <label htmlFor={field.property}>{field.label}</label>
                  <InputTextarea
                     id={field.property}
                     value={isApplicable ? (rootObj[field.property] ?? '') : ''}
                     onChange={e => handleChange(e.target.value)}
                     disabled={isDisabled}
                     rows={3}
                     autoResize
                     className={diagInfo.inputClasses()}
                  />
               </div>
               <ErrorInfo diagnostic={diagInfo} />
            </div>
         );

      case 'number':
         return (
            <div className='p-field p-fluid' style={{ opacity: isApplicable ? 1 : 0.4 }}
               title={!isApplicable ? field.dependency?.disabledTooltip : undefined}>
               <div>
                  <label htmlFor={field.property}>{field.label}</label>
                  <InputNumber
                     inputId={field.property}
                     value={isApplicable ? (rootObj[field.property] ?? undefined) : undefined}
                     onValueChange={(e: InputNumberValueChangeEvent) => handleChange(e.value)}
                     disabled={isDisabled}
                     className={diagInfo.inputClasses()}
                     useGrouping={false}
                  />
               </div>
               <ErrorInfo diagnostic={diagInfo} />
            </div>
         );

      case 'boolean':
         return (
            <div className='p-field p-fluid' style={{ opacity: isApplicable ? 1 : 0.4 }}
               title={!isApplicable ? field.dependency?.disabledTooltip : undefined}>
               <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Checkbox
                     inputId={field.property}
                     checked={isApplicable ? (rootObj[field.property] ?? false) : false}
                     onChange={(e: CheckboxChangeEvent) => handleChange(e.checked)}
                     disabled={isDisabled}
                  />
                  <label htmlFor={field.property}>{field.label}</label>
               </div>
               <ErrorInfo diagnostic={diagInfo} />
            </div>
         );

      case 'reference':
         return (
            <DynamicReferenceField field={field} schema={schema} rootObj={rootObj} />
         );

      case 'dropdown':
         return (
            <DynamicDropdownField field={field} schema={schema} rootObj={rootObj} siblingFields={siblingFields} />
         );

      case 'readonly':
         return (
            <div className='p-field p-fluid'>
               <div>
                  <label htmlFor={field.property}>{field.label}</label>
                  <span id={field.property} style={{ display: 'block', padding: '0.5rem 0' }}>
                     {rootObj[field.property] ?? ''}
                  </span>
               </div>
               <ErrorInfo diagnostic={diagInfo} />
            </div>
         );

      default:
         return <div>Unknown field type: {field.fieldType}</div>;
   }
}

function DynamicReferenceField({ field, schema, rootObj }: DynamicFieldProps): React.ReactElement {
   const api = useModelQueryApi();
   const dispatch = useModelDispatch();
   const diagnostics = useDiagnosticsManager();
   const readonly = useReadonly();
   const untitled = useUntitled();
   const uri = useUri();

   const refCtx: CrossReferenceContext = React.useMemo(
      () => ({
         container: { globalId: rootObj.$globalId ?? rootObj.id ?? '' },
         property: field.referenceProperty ?? field.property
      }),
      [rootObj.$globalId, rootObj.id, field.referenceProperty, field.property]
   );

   const optionLoader = React.useCallback(
      () => api.findReferenceableElements(refCtx).then(elements => elements.map((e: ReferenceableElement) => e.label)),
      [api, refCtx]
   );

   const handleReferenceChange = React.useCallback(
      (event: { value: string }) => {
         dispatch({
            type: 'dynamic:set-property',
            rootKey: schema.rootKey,
            property: field.property,
            value: event.value
         });

         // Auto-generate ID when name changes on untitled files
         if (field.property === 'name' && untitled) {
            api.findNextId({ uri, type: rootObj.$type, proposal: toId(event.value) }).then(id =>
               dispatch({ type: 'dynamic:set-id', rootKey: schema.rootKey, id })
            );
         }
      },
      [dispatch, schema.rootKey, field.property, untitled, api, uri, rootObj.$type]
   );

   const diagInfo = diagnostics.info(schema.diagnosticPath, field.property);

   return (
      <AsyncAutoComplete
         label={field.label}
         optionLoader={optionLoader}
         value={rootObj[field.property] ?? ''}
         onChange={handleReferenceChange}
         disabled={readonly}
         required={field.required}
         className={diagInfo.inputClasses()}
         error={!diagInfo.empty}
         helperText={diagInfo.text()}
      />
   );
}

function DynamicDropdownField({ field, schema, rootObj, siblingFields }: DynamicFieldProps): React.ReactElement {
   const dispatch = useModelDispatch();
   const diagnostics = useDiagnosticsManager();
   const readonly = useReadonly();
   const [suggestions, setSuggestions] = React.useState<string[]>([]);

   const options = React.useMemo(
      () => (field.dropdownOptions ?? []).map(opt => opt.value),
      [field.dropdownOptions]
   );

   // Find sibling fields that depend on this dropdown
   const dependentFields = React.useMemo(
      () => (siblingFields ?? []).filter(f => f.dependency?.sourceProperty === field.property),
      [siblingFields, field.property]
   );

   const diagInfo = diagnostics.info(schema.diagnosticPath, field.property);

   const handleChange = React.useCallback(
      (e: AutoCompleteChangeEvent) => {
         dispatch({
            type: 'dynamic:set-property',
            rootKey: schema.rootKey,
            property: field.property,
            value: e.value
         });

         // Clear dependent fields that become inapplicable with the new value
         for (const dep of dependentFields) {
            if (!dep.dependency!.isApplicable(e.value)) {
               dispatch({
                  type: 'dynamic:set-property',
                  rootKey: schema.rootKey,
                  property: dep.property,
                  value: undefined
               });
            }
         }
      },
      [dispatch, schema.rootKey, field.property, dependentFields]
   );

   const search = React.useCallback(
      (event: { query: string }) => {
         const filtered = options.filter(opt => opt.toLowerCase().includes(event.query.toLowerCase()));
         setSuggestions(filtered);
      },
      [options]
   );

   return (
      <div className='p-field p-fluid'>
         <div>
            <label htmlFor={field.property}>{field.label}</label>
            <AutoComplete
               inputId={field.property}
               value={rootObj[field.property] ?? ''}
               suggestions={suggestions}
               completeMethod={search}
               onChange={handleChange}
               dropdown
               disabled={readonly}
               className={diagInfo.inputClasses()}
            />
         </div>
         <ErrorInfo diagnostic={diagInfo} />
      </div>
   );
}
