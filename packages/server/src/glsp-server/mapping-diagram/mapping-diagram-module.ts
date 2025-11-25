/********************************************************************************
 * Copyright (c) 2023 CrossBreeze.
 ********************************************************************************/
import {
   ActionHandlerConstructor,
   BindingTarget,
   CommandPaletteActionProvider,
   ComputedBoundsActionHandler,
   ContextActionsProvider,
   DiagramConfiguration,
   DiagramModule,
   GModelFactory,
   GModelIndex,
   InstanceMultiBinding,
   LayoutEngine,
   ModelState,
   ModelSubmissionHandler,
   MultiBinding,
   OperationHandlerConstructor,
   SourceModelStorage,
   ToolPaletteItemProvider,
   bindAsService
} from '@eclipse-glsp/server';
import { injectable } from 'inversify';
import { CrossModelIndex } from '../common/cross-model-index.js';
import { CrossModelState } from '../common/cross-model-state.js';
import { CrossModelStorage } from '../common/cross-model-storage.js';
import { CrossModelSubmissionHandler } from '../common/cross-model-submission-handler.js';
import { ShowPropertiesContextMenuProvider } from '../common/context-menu/show-properties-context-menu-provider.js';
import { MappingDiagramCommandPaletteActionProvider } from './command-palette/add-source-object-action-provider.js';
import { MappingDiagramAddSourceObjectOperationHandler } from './handler/add-source-object-operation-handler.js';
import { MappingEdgeCreationOperationHandler } from './handler/create-edge-operation-handler.js';
import { MappingDiagramDeleteElementOperationHandler } from './handler/delete-element-operation-handler.js';
import { MappingDiagramDropFilesOperationHandler } from './handler/drop-files-operation-handler.js';
import { MappingComputedBoundsActionHandler } from './handler/mapping-computed-bounds-action-handler.js';
import { MappingDiagramLayoutEngine } from './layout-engine.js';
import { MappingDiagramConfiguration } from './mapping-diagram-configuration.js';
import { MappingDiagramGModelFactory } from './model/mapping-diagram-gmodel-factory.js';
import { MappingModelIndex } from './model/mapping-model-index.js';
import { MappingModelState } from './model/mapping-model-state.js';
import { MappingToolPaletteProvider } from './tool-palette/mapping-tool-palette-provider.js';

/**
 * Provides configuration about our mapping diagrams.
 */
@injectable()
export class MappingDiagramModule extends DiagramModule {
   readonly diagramType = 'mapping-diagram';

   protected bindDiagramConfiguration(): BindingTarget<DiagramConfiguration> {
      return MappingDiagramConfiguration;
   }

   protected bindSourceModelStorage(): BindingTarget<SourceModelStorage> {
      return CrossModelStorage;
   }

   protected override bindModelSubmissionHandler(): BindingTarget<ModelSubmissionHandler> {
      return CrossModelSubmissionHandler;
   }

   protected override configureActionHandlers(binding: InstanceMultiBinding<ActionHandlerConstructor>): void {
      super.configureActionHandlers(binding);
      binding.rebind(ComputedBoundsActionHandler, MappingComputedBoundsActionHandler);
   }

   protected override configureOperationHandlers(binding: InstanceMultiBinding<OperationHandlerConstructor>): void {
      super.configureOperationHandlers(binding);
      binding.add(MappingDiagramDropFilesOperationHandler);
      binding.add(MappingDiagramAddSourceObjectOperationHandler);
      binding.add(MappingDiagramDeleteElementOperationHandler);
      binding.add(MappingEdgeCreationOperationHandler);
   }

   protected override configureContextActionProviders(binding: MultiBinding<ContextActionsProvider>): void {
      super.configureContextActionProviders(binding);
      binding.add(ShowPropertiesContextMenuProvider);
   }

   protected override bindCommandPaletteActionProvider(): BindingTarget<CommandPaletteActionProvider> | undefined {
      return MappingDiagramCommandPaletteActionProvider;
   }

   protected override bindLayoutEngine(): BindingTarget<LayoutEngine> | undefined {
      return MappingDiagramLayoutEngine;
   }

   protected override bindGModelIndex(): BindingTarget<GModelIndex> {
      bindAsService(this.context, CrossModelIndex, MappingModelIndex);
      return { service: MappingModelIndex };
   }

   protected bindModelState(): BindingTarget<ModelState> {
      bindAsService(this.context, CrossModelState, MappingModelState);
      return { service: MappingModelState };
   }

   protected bindGModelFactory(): BindingTarget<GModelFactory> {
      return MappingDiagramGModelFactory;
   }

   protected override bindToolPaletteItemProvider(): BindingTarget<ToolPaletteItemProvider> | undefined {
      return MappingToolPaletteProvider;
   }
}
