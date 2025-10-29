/********************************************************************************
 * Copyright (c) 2025 CrossBreeze.
 ********************************************************************************/
import * as React from 'react';
import { useRelationship } from '../../ModelContext';
import { CustomPropertiesDataGrid } from './CustomPropertiesDataGrid';

export function RelationshipCustomPropertiesDataGrid(): React.ReactElement {
   const relationship = useRelationship();

   return (
      <CustomPropertiesDataGrid
         contextType='relationship'
         customProperties={relationship?.customProperties}
         errorMessage='No relationship available'
      />
   );
}
