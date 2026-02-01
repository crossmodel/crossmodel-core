/********************************************************************************
 * Copyright (c) 2025 CrossBreeze.
 ********************************************************************************/
import * as React from 'react';
import { useModel } from '../ModelContext';
import { modelComponent } from '../ModelViewer';
import { themed } from '../ThemedViewer';
import { Form } from '../views/form/Form';
import { DynamicCollection } from './DynamicCollection';
import { DynamicSection } from './DynamicSection';
import { getSchemaForRoot } from './schema-registry';

/**
 * Top-level dynamic form component that renders the correct form layout
 * for any CrossModel root type based on its registered schema.
 */
export function DynamicForm(): React.ReactElement {
   const model = useModel();
   const schema = React.useMemo(() => getSchemaForRoot(model), [model]);

   if (!schema) {
      return <div className='theia-widget-noInfo'>No dynamic form schema available for this type.</div>;
   }

   const rootObj = (model as any)[schema.rootKey];
   if (!rootObj) {
      return <div className='theia-widget-noInfo'>No data available.</div>;
   }

   return (
      <Form id={rootObj.id} name={rootObj.name ?? schema.displayName} iconClass={schema.iconClass}>
         {schema.sections.map((section, idx) => (
            <DynamicSection key={`section-${idx}`} section={section} schema={schema} rootObj={rootObj} />
         ))}
         {schema.collections.map((collection, idx) => (
            <DynamicCollection key={`collection-${idx}`} collection={collection} schema={schema} rootObj={rootObj} />
         ))}
      </Form>
   );
}

/** Wrapped component ready for use in Theia widgets. */
export const DynamicFormComponent = themed(modelComponent(DynamicForm));
