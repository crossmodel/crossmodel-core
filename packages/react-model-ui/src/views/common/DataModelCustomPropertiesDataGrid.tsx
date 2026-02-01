/********************************************************************************
 * Copyright (c) 2025 CrossBreeze.
 ********************************************************************************/
import { ResolvedPropertyDefinition } from '@crossmodel/protocol';
import * as React from 'react';
import { useDataModel } from '../../ModelContext';
import { CustomPropertiesDataGrid } from './CustomPropertiesDataGrid';

export interface DataModelCustomPropertiesDataGridProps {
   propertyDefinitions?: ResolvedPropertyDefinition[];
}

export function DataModelCustomPropertiesDataGrid({ propertyDefinitions }: DataModelCustomPropertiesDataGridProps): React.ReactElement {
   const dataModel = useDataModel();

   return (
      <CustomPropertiesDataGrid
         contextType='datamodel'
         customProperties={dataModel?.customProperties}
         errorMessage='No data model available'
         propertyDefinitions={propertyDefinitions}
      />
   );
}
