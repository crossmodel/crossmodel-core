/********************************************************************************
 * Copyright (c) 2025 CrossBreeze.
 ********************************************************************************/
import { ResolvedPropertyDefinition } from '@crossmodel/protocol';
import * as React from 'react';
import { useRelationship } from '../../ModelContext';
import { CustomPropertiesDataGrid } from './CustomPropertiesDataGrid';

export interface RelationshipCustomPropertiesDataGridProps {
   propertyDefinitions?: ResolvedPropertyDefinition[];
}

export function RelationshipCustomPropertiesDataGrid({ propertyDefinitions }: RelationshipCustomPropertiesDataGridProps): React.ReactElement {
   const relationship = useRelationship();

   return (
      <CustomPropertiesDataGrid
         contextType='relationship'
         customProperties={relationship?.customProperties}
         errorMessage='No relationship available'
         propertyDefinitions={propertyDefinitions}
      />
   );
}
