/********************************************************************************
 * Copyright (c) 2025 CrossBreeze.
 ********************************************************************************/
import * as React from 'react';
import { useEntity } from '../../ModelContext';
import { CustomPropertiesDataGrid } from './CustomPropertiesDataGrid';

export function EntityCustomPropertiesDataGrid(): React.ReactElement {
   const entity = useEntity();

   return <CustomPropertiesDataGrid contextType='entity' customProperties={entity?.customProperties} errorMessage='No entity available' />;
}
