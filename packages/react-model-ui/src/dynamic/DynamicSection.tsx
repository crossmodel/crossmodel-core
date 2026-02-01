/********************************************************************************
 * Copyright (c) 2025 CrossBreeze.
 ********************************************************************************/
import * as React from 'react';
import { FormSection } from '../views/FormSection';
import { DynamicField } from './DynamicField';
import { DynamicFormSchema, FormSectionDescriptor } from './schema';

export interface DynamicSectionProps {
   section: FormSectionDescriptor;
   schema: DynamicFormSchema;
   rootObj: any;
}

export function DynamicSection({ section, schema, rootObj }: DynamicSectionProps): React.ReactElement {
   return (
      <FormSection label={section.label} defaultCollapsed={section.defaultCollapsed}>
         {section.fields.map((field, idx) => (
            <DynamicField key={field.property ?? idx} field={field} schema={schema} rootObj={rootObj} siblingFields={section.fields} />
         ))}
      </FormSection>
   );
}
