/********************************************************************************
 * Copyright (c) 2025 CrossBreeze.
 ********************************************************************************/
import { ResolvedPropertyDefinition } from '@crossmodel/protocol';
import * as React from 'react';
import { useEntity } from '../../ModelContext';
import { CustomPropertiesDataGrid } from './CustomPropertiesDataGrid';

export interface EntityCustomPropertiesDataGridProps {
   propertyDefinitions?: ResolvedPropertyDefinition[];
}

export function EntityCustomPropertiesDataGrid({ propertyDefinitions }: EntityCustomPropertiesDataGridProps): React.ReactElement {
   const entity = useEntity();

   return (
      <CustomPropertiesDataGrid
         contextType='entity'
         customProperties={entity?.customProperties}
         errorMessage='No entity available'
         propertyDefinitions={propertyDefinitions}
      />
   );
}
