/********************************************************************************
 * Copyright (c) 2025 CrossBreeze.
 ********************************************************************************/

import { DynamicFormComponent, ErrorView } from '@crossmodel/react-model-ui';
import * as React from '@theia/core/shared/react';
import { injectable } from '@theia/core/shared/inversify';
import { FormEditorWidget } from './form-editor-widget';

/**
 * A Theia widget that dynamically renders the correct form for any CrossModel root type
 * using the schema-driven DynamicFormComponent.
 */
@injectable()
export class DynamicFormEditorWidget extends FormEditorWidget {
   override render(): React.ReactNode {
      if (!this.document?.root) {
         if (this.error) {
            return <ErrorView errorMessage={this.error} />;
         }
         return <div className='theia-widget-noInfo'>No properties available.</div>;
      }
      return <DynamicFormComponent {...this.getModelProviderProps()} {...this.getRenderProperties()} />;
   }
}
