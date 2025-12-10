/********************************************************************************
 * Copyright (c) 2023 CrossBreeze.
 ********************************************************************************/
import { ENTITY_NODE_TYPE, LABEL_ENTITY, REFERENCE_CONTAINER_TYPE, REFERENCE_PROPERTY, REFERENCE_VALUE } from '@crossmodel/protocol';
import { ArgsUtil, GNode, GNodeBuilder } from '@eclipse-glsp/server';
import { URI } from 'vscode-uri';
import { LogicalEntityNode } from '../../../language-server/generated/ast.js';
import { getAttributes } from '../../../language-server/util/ast-util.js';
import { AttributeCompartment, AttributesCompartmentBuilder, createHeader } from '../../common/nodes.js';
import { SystemModelIndex } from './system-model-index.js';

export class GEntityNode extends GNode {
   override type = ENTITY_NODE_TYPE;

   static override builder(): GEntityNodeBuilder {
      return new GEntityNodeBuilder(GEntityNode).type(ENTITY_NODE_TYPE);
   }
}

export class GEntityNodeBuilder extends GNodeBuilder<GEntityNode> {
   set(node: LogicalEntityNode, index: SystemModelIndex, diagramUri: string): this {
      if (!node) {
         return this;
      }
      this.id(index.createId(node));

      // Get the reference that the DiagramNode holds to the Entity in the .langium file.
      const entityRef = node.entity?.ref;

      // Options which are the same for every node
      this.addCssClasses('diagram-node', 'entity');
      this.addArg(REFERENCE_CONTAINER_TYPE, LogicalEntityNode);
      this.addArg(REFERENCE_PROPERTY, 'entity');
      this.addArg(REFERENCE_VALUE, node.entity?.$refText);

      // Add isExternal flag based on data model comparison
      const externalInfo = this.checkIfExternal(node, index, diagramUri);
      this.addArg('isExternal', externalInfo.isExternal);

      // Add the label/name of the node
      this.add(createHeader(entityRef?.name || entityRef?.id || 'unresolved', this.proxy.id, LABEL_ENTITY));

      // Add the children of the node
      const attributes = getAttributes(node);
      const attributesCompartment = new AttributesCompartmentBuilder().set(this.proxy.id);
      for (const attribute of attributes) {
         const attributeNode = AttributeCompartment.builder().set(attribute, index);
         // FIXME: Refactor the code below to derive the primary to the backend (model-service/server).
         const primaryIdentifier = entityRef?.identifiers?.find(identifier => identifier.primary);
         const isCurrentlyInPrimary = primaryIdentifier?.attributes.some(attr => attr.ref?.id === attribute.id);
         attributeNode.addArg('identifier', !!isCurrentlyInPrimary).addLayoutOption('paddingLeft', 8).addLayoutOption('paddingRight', 8);
         attributesCompartment.add(attributeNode.build());
      }
      this.add(attributesCompartment.build());

      // The DiagramNode in the langium file holds the size and coordinates of node
      this.size(node.width || 100, node.height || 100).position(node.x || 100, node.y || 100);
      this.layout('vbox')
         .addArgs(ArgsUtil.cornerRadius(3))
         .addLayoutOption('prefWidth', node.width || 100)
         .addLayoutOption('prefHeight', node.height || 100);

      return this;
   }

   /**
    * Determines if an entity is external (from another model or npm package).
    * An entity is considered external if its data model ID differs from the
    * current diagram's data model ID.
    */
   protected checkIfExternal(
      node: LogicalEntityNode,
      index: SystemModelIndex,
      diagramUri: string
   ): {
      isExternal: boolean;
      diagramModelId?: string;
      entityModelId?: string;
   } {
      // Get the referenced entity
      const entityRef = node.entity?.ref;
      const refText = node.entity?.$refText || '';

      if (!entityRef) {
         return { isExternal: false }; // Unresolved reference
      }

      // Access the data model manager through the index services
      const dataModelManager = index.services.shared.workspace.DataModelManager;

      // Get the data model ID of the current diagram
      const parsedDiagramUri = URI.parse(diagramUri);
      const diagramDataModelInfo = dataModelManager.getDataModelInfoByURI(parsedDiagramUri);
      const diagramDataModelId = diagramDataModelInfo?.id || 'unknown';

      // Determine if entity is external based on qualified reference
      // If refText contains a dot, it's a qualified reference (e.g., "ExampleOtherModel.SomeProduct")
      // Extract the data model name from the qualified reference
      let entityDataModelId: string;
      if (refText.includes('.')) {
         // Qualified reference - extract data model name (part before the dot)
         const dataModelName = refText.split('.')[0];
         // Try to find this data model
         const allDataModels = dataModelManager.getDataModelInfos();
         const matchingModel = allDataModels.find(dm =>
            dm.referenceName === dataModelName || dm.dataModel.id === dataModelName || dm.dataModel.name === dataModelName
         );
         entityDataModelId = matchingModel?.id || 'unknown';
      } else {
         // Unqualified reference - same data model as diagram
         entityDataModelId = diagramDataModelId;
      }

      // External if the data models are different
      const isExternal = diagramDataModelId !== entityDataModelId;

      return {
         isExternal,
         diagramModelId: diagramDataModelId,
         entityModelId: entityDataModelId
      };
   }
}
