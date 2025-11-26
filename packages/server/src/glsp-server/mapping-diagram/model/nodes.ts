/********************************************************************************
 * Copyright (c) 2024 CrossBreeze.
 ********************************************************************************/
import { RenderProps, SOURCE_OBJECT_NODE_TYPE, TARGET_OBJECT_NODE_TYPE } from '@crossmodel/protocol';
import { ArgsUtil, GLabel, GNode, GNodeBuilder } from '@eclipse-glsp/server';
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
   set(node: TargetObject, index: MappingModelIndex): this {
      if (!node) {
         return this;
      }
      const id = index.createId(node);
      this.id(id);

      // Options which are the same for every node
      this.addCssClasses('diagram-node', 'target-node');

      // Add isExternal flag based on entity document URI comparison
      this.addArg('isExternal', this.isEntityExternal(node, index));

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
    * An entity is considered external if its document URI differs from the
    * current diagram's document URI.
    */
   protected isEntityExternal(node: TargetObject, index: MappingModelIndex): boolean {
      // Get the entity reference
      const entityRef = node.entity?.ref;
      if (!entityRef || !entityRef.$document) {
         return false; // Unresolved reference or no document
      }

      // Get document URI of the referenced entity
      const entityDocumentUri = entityRef.$document.uri.toString();

      // Get document URI of the current diagram (from model state)
      const diagramDocumentUri = (index as any).modelState?.semanticUri;
      if (!diagramDocumentUri) {
         return false; // Cannot determine, treat as local
      }

      // Compare URIs: external if different
      return entityDocumentUri !== diagramDocumentUri;
   }
}
