/********************************************************************************
 * Copyright (c) 2025 CrossBreeze.
 ********************************************************************************/
import * as React from 'react';
import { useTypeProperties } from '../hooks/useTypeProperties';
import { FormSection } from '../views/FormSection';
import { DynamicField } from './DynamicField';
import { DynamicFormSchema, FormSectionDescriptor } from './schema';

export interface DynamicSectionProps {
   section: FormSectionDescriptor;
   schema: DynamicFormSchema;
   rootObj: any;
}

export function DynamicSection({ section, schema, rootObj }: DynamicSectionProps): React.ReactElement {
   const typeRef = schema.typeProperty ? rootObj[schema.typeProperty] : undefined;
   const { inheritedProperties } = useTypeProperties(typeRef);

   // Build typeDefaults from resolved inherited properties for inherited value display
   const typeDefaults = React.useMemo(
      () => (inheritedProperties ? inheritedProperties.properties : undefined),
      [inheritedProperties]
   );

   return (
      <FormSection label={section.label} defaultCollapsed={section.defaultCollapsed}>
         {section.fields.map((field, idx) => (
            <DynamicField
               key={field.property ?? idx}
               field={field}
               schema={schema}
               rootObj={rootObj}
               siblingFields={section.fields}
               typeDefaults={typeDefaults}
               typeReferenceId={typeRef}
            />
         ))}
      </FormSection>
   );
}
