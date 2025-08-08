/********************************************************************************
 * Copyright (c) 2023 CrossBreeze.
 ********************************************************************************/
import {
   BindingTarget,
   ContextActionsProvider,
   DiagramConfiguration,
   DiagramModule,
   EdgeCreationChecker,
   GModelFactory,
   GModelIndex,
   InstanceMultiBinding,
   LayoutEngine,
   LayoutOperationHandler,
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
import { SystemDiagramAddEntityActionProvider } from './command-palette/add-entity-action-provider.js';
import { SystemEdgeCreationChecker } from './edge-checker/edge-checker.js';
import { SystemDiagramAddEntityOperationHandler } from './handler/add-entity-operation-handler.js';
import { SystemDiagramApplyLabelEditOperationHandler } from './handler/apply-edit-operation-handler.js';
import { SystemDiagramChangeBoundsOperationHandler } from './handler/change-bounds-operation-handler.js';
import { SystemDiagramCreateEntityOperationHandler } from './handler/create-entity-operation-handler.js';
import { SystemDiagramCreateInheritanceOperationHandler } from './handler/create-inheritance-operation-handler.js';
import { SystemDiagramCreateRelationshipOperationHandler } from './handler/create-relationship-operation-handler.js';
import { SystemDiagramDeleteOperationHandler } from './handler/delete-operation-handler.js';
import { SystemDiagramDropEntityOperationHandler } from './handler/drop-entity-operation-handler.js';
import { SystemDiagramOperationHandler } from './handler/layout-operation-handler.js';
import { SystemDiagramLayoutEngine } from './layout-engine.js';
import { SystemDiagramGModelFactory } from './model/system-diagram-gmodel-factory.js';
import { SystemModelIndex } from './model/system-model-index.js';
import { SystemModelState } from './model/system-model-state.js';
import { SystemDiagramConfiguration } from './system-diagram-configuration.js';
import { SystemToolPaletteProvider } from './tool-palette/system-tool-palette-provider.js';

/**
 * Provides configuration about our system diagrams.
 */
@injectable()
export class SystemDiagramModule extends DiagramModule {
   readonly diagramType = 'system-diagram';

   protected bindDiagramConfiguration(): BindingTarget<DiagramConfiguration> {
      return SystemDiagramConfiguration;
   }

   protected bindSourceModelStorage(): BindingTarget<SourceModelStorage> {
      return CrossModelStorage;
   }

   protected override bindModelSubmissionHandler(): BindingTarget<ModelSubmissionHandler> {
      return CrossModelSubmissionHandler;
   }

   protected override configureOperationHandlers(binding: InstanceMultiBinding<OperationHandlerConstructor>): void {
      super.configureOperationHandlers(binding);
      binding.add(SystemDiagramChangeBoundsOperationHandler); // move + resize behavior
      binding.add(SystemDiagramCreateRelationshipOperationHandler); // create relationship
      binding.add(SystemDiagramDeleteOperationHandler); // delete elements
      binding.add(SystemDiagramDropEntityOperationHandler);
      binding.add(SystemDiagramAddEntityOperationHandler);
      binding.add(SystemDiagramCreateEntityOperationHandler);
      binding.add(SystemDiagramApplyLabelEditOperationHandler);
      binding.add(SystemDiagramCreateInheritanceOperationHandler);
      binding.rebind(LayoutOperationHandler, SystemDiagramOperationHandler);
   }

   protected override configureContextActionProviders(binding: MultiBinding<ContextActionsProvider>): void {
      super.configureContextActionProviders(binding);
      binding.add(SystemDiagramAddEntityActionProvider);
   }

   protected override bindLayoutEngine(): BindingTarget<LayoutEngine> | undefined {
      return SystemDiagramLayoutEngine;
   }

   protected override bindGModelIndex(): BindingTarget<GModelIndex> {
      bindAsService(this.context, CrossModelIndex, SystemModelIndex);
      return { service: SystemModelIndex };
   }

   protected bindModelState(): BindingTarget<ModelState> {
      bindAsService(this.context, CrossModelState, SystemModelState);
      return { service: SystemModelState };
   }

   protected bindGModelFactory(): BindingTarget<GModelFactory> {
      return SystemDiagramGModelFactory;
   }

   protected override bindToolPaletteItemProvider(): BindingTarget<ToolPaletteItemProvider> | undefined {
      return SystemToolPaletteProvider;
   }

   protected override bindEdgeCreationChecker(): BindingTarget<EdgeCreationChecker> | undefined {
      return SystemEdgeCreationChecker;
   }
}
