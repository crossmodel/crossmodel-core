/********************************************************************************
 * Copyright (c) 2023 CrossBreeze.
 ********************************************************************************/
import {
   ATTRIBUTE_COMPARTMENT_TYPE,
   SOURCE_NUMBER_NODE_TYPE,
   SOURCE_OBJECT_NODE_TYPE,
   SOURCE_STRING_NODE_TYPE,
   TARGET_ATTRIBUTE_MAPPING_EDGE_TYPE,
   TARGET_OBJECT_NODE_TYPE
} from '@crossmodel/protocol';
import {
   ContainerConfiguration,
   DefaultTypes,
   GPort,
   RectangularNodeView,
   configureDefaultModelElements,
   configureModelElement,
   gridModule,
   hoverFeedbackFeature,
   initializeDiagramContainer,
   overrideModelElement,
   selectFeature
} from '@eclipse-glsp/client';
import { GLSPDiagramConfiguration } from '@eclipse-glsp/theia-integration';
import { Container } from '@theia/core/shared/inversify/index';
import { MappingDiagramLanguage } from '../../common/crossmodel-diagram-language';
import { createCrossModelDiagramModule } from '../crossmodel-diagram-module';
import { libAvoidModule } from '../libavoid-module';
import { AttributeCompartment } from '../model';
import { AttributeCompartmentView } from '../views';
import { mappingEdgeCreationToolModule } from './edge-creation-tool/edge-creation-tool-module';
import { AttributeMappingEdge, SourceNumberNode, SourceObjectNode, SourceStringNode, TargetObjectNode } from './model';
import { sourceObjectCreationToolModule } from './source-object-creation-tool/source-object-creation-tool-module';
import { AttributeMappingEdgeView, SourceNumberNodeView, SourceObjectNodeView, SourceStringNodeView, TargetObjectNodeView } from './views';

export class MappingDiagramConfiguration extends GLSPDiagramConfiguration {
   diagramType: string = MappingDiagramLanguage.diagramType;

   configureContainer(container: Container, ...containerConfiguration: ContainerConfiguration): Container {
      return initializeDiagramContainer(container, ...containerConfiguration, {
         add: [gridModule, mappingDiagramModule, mappingEdgeCreationToolModule, sourceObjectCreationToolModule, libAvoidModule]
      });
   }
}

const mappingDiagramModule = createCrossModelDiagramModule((bind, unbind, isBound, rebind) => {
   const context = { bind, unbind, isBound, rebind };

   // Use GLSP default model elements and their views
   // For example the model element with type 'node' (DefaultTypes.NODE) is represented by an SNode and rendered as RoundedCornerNodeView
   configureDefaultModelElements(context);
   overrideModelElement(context, DefaultTypes.PORT, GPort, RectangularNodeView, { disable: [hoverFeedbackFeature, selectFeature] });

   // Bind views that can be rendered by the client-side
   // The glsp-server can send a request to render a specific view given a type, e.g. node:entity
   // The model class holds the client-side model and properties
   // The view class shows how to draw the svg element given the properties of the model class
   configureModelElement(context, SOURCE_OBJECT_NODE_TYPE, SourceObjectNode, SourceObjectNodeView);
   configureModelElement(context, SOURCE_NUMBER_NODE_TYPE, SourceNumberNode, SourceNumberNodeView);
   configureModelElement(context, SOURCE_STRING_NODE_TYPE, SourceStringNode, SourceStringNodeView);
   configureModelElement(context, TARGET_OBJECT_NODE_TYPE, TargetObjectNode, TargetObjectNodeView);
   configureModelElement(context, TARGET_ATTRIBUTE_MAPPING_EDGE_TYPE, AttributeMappingEdge, AttributeMappingEdgeView);
   configureModelElement(context, ATTRIBUTE_COMPARTMENT_TYPE, AttributeCompartment, AttributeCompartmentView, {
      enable: [hoverFeedbackFeature, selectFeature]
   });
});
