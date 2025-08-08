/********************************************************************************
 * Copyright (c) 2024 CrossBreeze.
 ********************************************************************************/

import { ATTRIBUTE_COMPARTMENT_TYPE, createLeftPortId, createRightPortId } from '@crossmodel/protocol';
import { DefaultTypes, GCompartment, GCompartmentBuilder, GLabel, GPort } from '@eclipse-glsp/server';
import { LogicalAttribute } from '../../language-server/generated/ast.js';
import { CrossModelIndex } from './cross-model-index.js';

export function createHeader(text: string, containerId: string, labelType = DefaultTypes.LABEL): GCompartment {
   return GCompartment.builder()
      .id(`${containerId}_header`)
      .layout('hbox')
      .addLayoutOption('hAlign', 'center')
      .addLayoutOption('vAlign', 'center')
      .addLayoutOption('paddingTop', 3)
      .addCssClass('header-compartment')
      .add(GLabel.builder().type(labelType).text(text).id(`${containerId}_label`).addCssClass('header-label').build())
      .build();
}

export type MarkerFunction<T extends LogicalAttribute> = (attribute: T, id: string) => GLabel | undefined;

export function createAttributesCompartment<T extends LogicalAttribute>(
   attributes: T[],
   containerId: string,
   index: CrossModelIndex,
   markerFn?: MarkerFunction<T>
): GCompartment {
   const attributesContainer = new AttributesCompartmentBuilder().set(containerId);
   for (const attribute of attributes) {
      attributesContainer.add(AttributeCompartment.builder().set(attribute, index, markerFn).build());
   }
   return attributesContainer.build();
}

export class AttributesCompartmentBuilder extends GCompartmentBuilder {
   constructor() {
      super(GCompartment);
   }

   set(containerId: string): this {
      this.id(`${containerId}_attributes`)
         .addCssClass('attributes-compartment')
         .layout('vbox')
         .addLayoutOption('hAlign', 'left')
         .addLayoutOption('paddingBottom', 0);
      return this;
   }
}

export class AttributeCompartment extends GCompartment {
   override type = ATTRIBUTE_COMPARTMENT_TYPE;

   static override builder(): AttributeCompartmentBuilder {
      return new AttributeCompartmentBuilder(AttributeCompartment).type(ATTRIBUTE_COMPARTMENT_TYPE);
   }
}

export class AttributeCompartmentBuilder extends GCompartmentBuilder<AttributeCompartment> {
   set<T extends LogicalAttribute>(attribute: T, index: CrossModelIndex, markerFn?: MarkerFunction<T>): this {
      const attributeId = index.createId(attribute);
      this.id(attributeId)
         .type(ATTRIBUTE_COMPARTMENT_TYPE)
         .addCssClass('attribute-compartment')
         .layout('hbox')
         .addLayoutOption('paddingBottom', 3)
         .addLayoutOption('paddingTop', 3)
         .addLayoutOption('paddingLeft', 3)
         .addLayoutOption('paddingRight', 3)
         .addLayoutOption('hGap', 3);

      const leftPortId = createLeftPortId(attributeId);
      index.indexSemanticElement(leftPortId, attribute);
      this.add(GPort.builder().id(leftPortId).addCssClasses('attribute-port', 'left-port').build());

      this.add(
         GLabel.builder()
            .id(`${attributeId}_attribute_name`)
            .text(attribute.name || '')
            .addCssClass('attribute')
            .build()
      );
      this.add(GLabel.builder().text(':').id(`${attributeId}_attribute_del`).build());
      if (attribute.datatype) {
         this.add(GLabel.builder().id(`${attributeId}_attribute_datatype`).text(attribute.datatype).addCssClass('datatype').build());
      }
      const marker = markerFn?.(attribute, attributeId);
      if (marker) {
         this.add(marker);
      }
      const rightPortId = createRightPortId(attributeId);
      index.indexSemanticElement(rightPortId, attribute);
      this.add(GPort.builder().id(rightPortId).addCssClasses('attribute-port', 'right-port').build());
      return this;
   }
}
