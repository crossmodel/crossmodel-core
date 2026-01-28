/********************************************************************************
 * Copyright (c) 2023 CrossBreeze.
 ********************************************************************************/
import {
   ATTRIBUTE_COMPARTMENT_TYPE,
   ENTITY_NODE_TYPE,
   INHERITANCE_EDGE_TYPE,
   LABEL_ENTITY,
   RELATIONSHIP_EDGE_TYPE
} from '@crossmodel/protocol';
import {
   ContainerConfiguration,
   DefaultTypes,
   GGraph,
   GLabelView,
   configureDefaultModelElements,
   configureModelElement,
   editLabelFeature,
   gridModule,
   initializeDiagramContainer,
   overrideModelElement,
   withEditLabelFeature
} from '@eclipse-glsp/client';
import { GLSPDiagramConfiguration } from '@eclipse-glsp/theia-integration';
import { Container } from '@theia/core/shared/inversify';
import { SystemDiagramLanguage } from '../../common/crossmodel-diagram-language';
import { createCrossModelDiagramModule } from '../crossmodel-diagram-module';
import { libAvoidModule } from '../libavoid-module';
import { AttributeCompartment } from '../model';
import { AttributeCompartmentView } from '../views';
import { systemContextMenuModule } from './context-menu/context-menu-module';
import { systemEdgeCreationToolModule } from './edge-creation-tool/edge-creation-tool-module';
import { systemHoverModule } from './hover/hover-module';
import { EntityNode, GEditableLabel, InheritanceEdge, RelationshipEdge } from './model';
import { systemNodeCreationModule } from './node-creation-tool/node-creation-tool-module';
import { systemSelectModule } from './select-tool/select-tool-module';
import { EntityNodeView, InheritanceEdgeView, RelationshipEdgeView, SystemGraphView } from './views';

export class SystemDiagramConfiguration extends GLSPDiagramConfiguration {
   diagramType: string = SystemDiagramLanguage.diagramType;

   configureContainer(container: Container, ...containerConfiguration: ContainerConfiguration): Container {
      return initializeDiagramContainer(
         container,
         {
            replace: systemSelectModule
         },
         ...containerConfiguration,
         libAvoidModule,
         systemHoverModule,
         gridModule,
         systemDiagramModule,
         systemNodeCreationModule,
         systemEdgeCreationToolModule,
         systemContextMenuModule
      );
   }
}

const systemDiagramModule = createCrossModelDiagramModule((bind, unbind, isBound, rebind) => {
   const context = { bind, unbind, isBound, rebind };

   // Use GLSP default model elements and their views
   // For example the model element with type 'node' (DefaultTypes.NODE) is represented by an SNode and rendered as RoundedCornerNodeView
   configureDefaultModelElements(context);

   // Bind views that can be rendered by the client-side
   // The glsp-server can send a request to render a specific view given a type, e.g. node:entity
   // The model class holds the client-side model and properties
   // The view class shows how to draw the svg element given the properties of the model class
   overrideModelElement(context, DefaultTypes.GRAPH, GGraph, SystemGraphView);
   configureModelElement(context, ENTITY_NODE_TYPE, EntityNode, EntityNodeView, { enable: [withEditLabelFeature] });
   configureModelElement(context, RELATIONSHIP_EDGE_TYPE, RelationshipEdge, RelationshipEdgeView);
   configureModelElement(context, ATTRIBUTE_COMPARTMENT_TYPE, AttributeCompartment, AttributeCompartmentView);
   configureModelElement(context, LABEL_ENTITY, GEditableLabel, GLabelView, { enable: [editLabelFeature] });
   configureModelElement(context, INHERITANCE_EDGE_TYPE, InheritanceEdge, InheritanceEdgeView);
});
