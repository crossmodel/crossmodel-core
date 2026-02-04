/********************************************************************************
 * Copyright (c) 2025 CrossBreeze.
 ********************************************************************************/
import * as React from 'react';
import { useTypeProperties } from '../hooks/useTypeProperties';
import { FormSection } from '../views/FormSection';
import { DynamicDataGrid } from './DynamicDataGrid';
import { CollectionDescriptor, DynamicFormSchema } from './schema';

export interface DynamicCollectionProps {
   collection: CollectionDescriptor;
   schema: DynamicFormSchema;
   rootObj: any;
}

export function DynamicCollection({ collection, schema, rootObj }: DynamicCollectionProps): React.ReactElement {
   const { propertyDefinitions } = useTypeProperties(schema.typeProperty ? rootObj[schema.typeProperty] : undefined);

   return (
      <FormSection label={collection.label} defaultCollapsed={collection.defaultCollapsed}>
         {collection.renderMode === 'existing' && collection.existingComponent && (
            <collection.existingComponent />
         )}
         {collection.renderMode === 'dynamic' && collection.columns && (
            <DynamicDataGrid
               collection={collection}
               schema={schema}
               rootObj={rootObj}
               propertyDefinitions={collection.supportsDefinitionRows ? propertyDefinitions : undefined}
            />
         )}
      </FormSection>
   );
}
