/********************************************************************************
 * Copyright (c) 2023 CrossBreeze.
 ********************************************************************************/

import { CrossModelWidgetOptions } from '@crossmodel/core/lib/browser';
import { FrontendApplicationContribution, NavigatableWidgetOptions, OpenHandler, WidgetFactory } from '@theia/core/lib/browser';
import { ContainerModule } from '@theia/core/shared/inversify';
import { DynamicFormEditorOpenHandler, createDynamicFormEditorId } from './dynamic-form-editor-open-handler';
import { DynamicFormEditorWidget } from './dynamic-form-editor-widget';
import { FormEditorOpenHandler, createFormEditorId } from './form-editor-open-handler';
import { FormEditorWidget, FormEditorWidgetOptions } from './form-editor-widget';

export default new ContainerModule(bind => {
   // Existing form editor
   bind(FormEditorOpenHandler).toSelf().inSingletonScope();
   bind(OpenHandler).toService(FormEditorOpenHandler);
   bind(FrontendApplicationContribution).toService(FormEditorOpenHandler);
   bind<WidgetFactory>(WidgetFactory).toDynamicValue(context => ({
      id: FormEditorOpenHandler.ID, // must match the id in the open handler
      createWidget: (navigatableOptions: NavigatableWidgetOptions) => {
         // create a child container so we can bind unique form editor widget options for each widget
         const container = context.container.createChild();
         const widgetId = createFormEditorId(navigatableOptions.uri, navigatableOptions.counter);
         const options: FormEditorWidgetOptions = {
            ...navigatableOptions,
            widgetId,
            clientId: 'form-editor'
         };
         container.bind(CrossModelWidgetOptions).toConstantValue(options);
         container.bind(FormEditorWidget).toSelf();
         return container.get(FormEditorWidget);
      }
   }));

   // Dynamic form editor
   bind(DynamicFormEditorOpenHandler).toSelf().inSingletonScope();
   bind(OpenHandler).toService(DynamicFormEditorOpenHandler);
   bind(FrontendApplicationContribution).toService(DynamicFormEditorOpenHandler);
   bind<WidgetFactory>(WidgetFactory).toDynamicValue(context => ({
      id: DynamicFormEditorOpenHandler.ID,
      createWidget: (navigatableOptions: NavigatableWidgetOptions) => {
         const container = context.container.createChild();
         const widgetId = createDynamicFormEditorId(navigatableOptions.uri, navigatableOptions.counter);
         const options: FormEditorWidgetOptions = {
            ...navigatableOptions,
            widgetId,
            clientId: 'dynamic-form-editor'
         };
         container.bind(CrossModelWidgetOptions).toConstantValue(options);
         container.bind(DynamicFormEditorWidget).toSelf();
         return container.get(DynamicFormEditorWidget);
      }
   }));
});
