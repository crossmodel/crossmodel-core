/********************************************************************************
 * Copyright (c) 2024 CrossBreeze.
 ********************************************************************************/
import { RenderProps, SOURCE_OBJECT_NODE_TYPE, TARGET_OBJECT_NODE_TYPE } from '@crossmodel/protocol';
import { ArgsUtil, GLabel, GNode, GNodeBuilder } from '@eclipse-glsp/server';
import { URI } from 'vscode-uri';
import { SourceObject, TargetObject, TargetObjectAttribute } from '../../../language-server/generated/ast.js';
import { getAttributes } from '../../../language-server/util/ast-util.js';
import { AttributeCompartment, AttributesCompartmentBuilder, createHeader } from '../../common/nodes.js';
import { MappingModelIndex } from './mapping-model-index.js';

export class GSourceObjectNode extends GNode {
   override type = SOURCE_OBJECT_NODE_TYPE;

   static override builder(): GSourceObjectNodeBuilder {
      return new GSourceObjectNodeBuilder(GSourceObjectNode).type(SOURCE_OBJECT_NODE_TYPE);
   }
}

export class GSourceObjectNodeBuilder extends GNodeBuilder<GSourceObjectNode> {
   set(node: SourceObject, index: MappingModelIndex): this {
      if (!node) {
         return this;
      }
      const sourceObjectIdx = node.$container.sources.indexOf(node);
      this.id(index.createId(node));

      this.addCssClasses('diagram-node', 'source-object', 'entity');

      this.add(createHeader(node.id || 'unresolved', this.proxy.id));

      // Add the children of the node
      const attributes = getAttributes(node);
      const attributesContainer = new AttributesCompartmentBuilder().set(this.proxy.id);
      for (const attribute of attributes) {
         const attrComp = AttributeCompartment.builder().set(attribute, index);
         attrComp.addArg(RenderProps.SOURCE_OBJECT_IDX, sourceObjectIdx);
         attributesContainer.add(attrComp.build());
      }
      this.add(attributesContainer.build());
      this.addArg(RenderProps.SOURCE_OBJECT_IDX, sourceObjectIdx);

      this.layout('vbox')
         .addArgs(ArgsUtil.cornerRadius(3))
         .addLayoutOption('prefWidth', 10)
         .addLayoutOption('prefHeight', 10)
         .position(100, 100);

      return this;
   }
}

export class GTargetObjectNode extends GNode {
   override type = TARGET_OBJECT_NODE_TYPE;

   static override builder(): GTargetObjectNodeBuilder {
      return new GTargetObjectNodeBuilder(GTargetObjectNode).type(TARGET_OBJECT_NODE_TYPE);
   }
}

export class GTargetObjectNodeBuilder extends GNodeBuilder<GTargetObjectNode> {
   set(node: TargetObject, index: MappingModelIndex, diagramUri: string): this {
      if (!node) {
         return this;
      }
      const id = index.createId(node);
      this.id(id);

      // Options which are the same for every node
      this.addCssClasses('diagram-node', 'target-node');

      // Add isExternal flag based on data model comparison
      const externalInfo = this.checkIfExternal(node, index, diagramUri);
      this.addArg('isExternal', externalInfo.isExternal);
      this.addArg('_debug_diagramModelId', externalInfo.diagramModelId);
      this.addArg('_debug_entityModelId', externalInfo.entityModelId);

      // Add the label/name of the node
      this.add(createHeader(node.entity?.ref?.name || node.entity?.ref?.id || 'unresolved', id));

      // Add the children of the node
      const attributes = getAttributes(node);

      const attributesContainer = new AttributesCompartmentBuilder().set(id);
      for (const attribute of attributes) {
         const attrComp = AttributeCompartment.builder().set(attribute, index, (attr, attrId) => this.markExpression(node, attr, attrId));
         const mappingIdx = node.mappings.findIndex(mapping => mapping.attribute?.value.ref === attribute);
         if (mappingIdx >= 0) {
            attrComp.addArg(RenderProps.TARGET_ATTRIBUTE_MAPPING_IDX, mappingIdx);
         } else if (attribute.id) {
            attrComp.addArg(RenderProps.TARGET_ATTRIBUTE_IDX, attribute.id);
         }
         attributesContainer.add(attrComp.build());
      }
      this.add(attributesContainer.build());

      this.layout('vbox').addArgs(ArgsUtil.cornerRadius(3)).addLayoutOption('prefWidth', 10).addLayoutOption('prefHeight', 10);
      return this;
   }

   protected markExpression(node: TargetObject, attribute: TargetObjectAttribute, id: string): GLabel | undefined {
      return node.mappings.some(mapping => mapping.attribute?.value.ref === attribute && !!mapping.expression)
         ? GLabel.builder().id(`${id}_attribute_expression_marker`).text('𝑓ᵪ').addCssClasses('attribute_expression_marker').build()
         : undefined;
   }

   /**
    * Determines if an entity is external (from another model or npm package).
    * An entity is considered external if its data model ID differs from the
    * current diagram's data model ID.
    */
   protected checkIfExternal(node: TargetObject, index: MappingModelIndex, diagramUri: string): {
      isExternal: boolean;
      diagramModelId?: string;
      entityModelId?: string;
   } {
      // Get the referenced entity
      const entityRef = node.entity?.ref;
      if (!entityRef || !entityRef.$document) {
         console.log('[checkIfExternal] No entity reference or document');
         return { isExternal: false }; // Unresolved reference
      }

      // Access the data model manager through the index services
      const dataModelManager = index.services.shared.workspace.DataModelManager;

      // Get the data model ID of the current diagram
      const diagramDataModelId = dataModelManager.getDataModelInfoByURI(URI.parse(diagramUri))?.id;

      // Get the data model ID of the referenced entity's document
      const entityDataModelId = dataModelManager.getDataModelInfoByDocument(entityRef.$document)?.id;

      // External if the data models are different
      const isExternal = diagramDataModelId !== entityDataModelId;
      console.log('[checkIfExternal] Entity:', entityRef.name || entityRef.id,
                  '\n  Diagram Model ID:', diagramDataModelId,
                  '\n  Entity Model ID:', entityDataModelId,
                  '\n  Is External:', isExternal);

      return {
         isExternal,
         diagramModelId: diagramDataModelId,
         entityModelId: entityDataModelId
      };
   }
}
