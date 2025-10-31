/********************************************************************************
 * Copyright (c) 2025 CrossBreeze.
 ********************************************************************************/
import * as React from 'react';
import { useDataModel } from '../../ModelContext';
import { CustomPropertiesDataGrid } from './CustomPropertiesDataGrid';

export function DataModelCustomPropertiesDataGrid(): React.ReactElement {
   const dataModel = useDataModel();

   return (
      <CustomPropertiesDataGrid
         contextType='datamodel'
         customProperties={dataModel?.customProperties}
         errorMessage='No data model available'
      />
   );
}
