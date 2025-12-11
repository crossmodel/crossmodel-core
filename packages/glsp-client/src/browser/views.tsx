/********************************************************************************
 * Copyright (c) 2024 CrossBreeze.
 ********************************************************************************/
/** @jsx svg */
/* eslint-disable react/no-unknown-property */
/* eslint-disable max-len */

import {
   EdgePadding,
   GCompartmentView,
   GEdge,
   GNode,
   hasArgs,
   Hoverable,
   Point,
   PolylineEdgeViewWithGapsOnIntersections,
   RenderingContext,
   RoundedCornerNodeView,
   RoundedCornerWrapper,
   Selectable,
   svg
} from '@eclipse-glsp/client';
import { ReactNode } from '@theia/core/shared/react';
import { injectable } from 'inversify';
import { VNode } from 'snabbdom';
import { AttributeCompartment } from './model';

@injectable()
export class DiagramNodeView extends RoundedCornerNodeView {
   protected override renderPath(wrapper: Readonly<RoundedCornerWrapper>, context: RenderingContext, inset: number): string {
      const path = super.renderPath(wrapper, context, inset);
      const node = wrapper.element;
      // render a separator line
      return node.children[1] && node.children[1].children.length > 0 ? path + ' M 0,28  L ' + wrapper.element.bounds.width + ',28' : path;
   }

   override render(node: Readonly<GNode & Hoverable & Selectable>, context: RenderingContext): VNode | undefined {
      const view = super.render(node, context);
      if (view?.data?.class) {
         view.data.class.mouseover = node.hoverFeedback;
         view.data.class.selected = node.selected;
      }
      return view;
   }
}

/**
 * Base view for entity nodes that can be external (from different data models).
 * Extends DiagramNodeView with automatic rendering of external entity icons.
 */
@injectable()
export class EntityDiagramNodeView extends DiagramNodeView {
   override render(node: Readonly<GNode & Hoverable & Selectable>, context: RenderingContext): VNode | undefined {
      const view = super.render(node, context);

      // Add external entity icon if isExternal flag is true
      const nodeHasArgs = hasArgs(node);
      const isExternal = nodeHasArgs && node.args.isExternal === true;

      if (view && isExternal) {
         this.addExternalEntityIcon(view, node);
      }

      return view;
   }

   protected addExternalEntityIcon(view: VNode, node: Readonly<GNode>): void {
      // Calculate icon position (top-right corner)
      const iconX = node.bounds.width - 10;
      const iconY = 0;

      // Create the external entity icon (Windows-style shortcut arrow)
      const icon: any = (
         <g class-external-entity-icon={true} transform={`translate(${iconX}, ${iconY})`} viewBox='0 0 10 10' width='10' height='10'>
            <rect x='0.5' y='0.5' width='9' height='9' rx='1.5' ry='1.5' fill='#a8a1c5' stroke='#a8a1c5' stroke-width='1.2' />

            <path
               d='M 3.5 2.5 L 7.5 2.5 L 7.5 6.5'
               fill='none'
               stroke='#ffffff'
               stroke-width='1.4'
               stroke-linecap='round'
               stroke-linejoin='round'
            />

            <line x1='7.5' y1='2.5' x2='2.5' y2='7.5' stroke='#ffffff' stroke-width='1.4' stroke-linecap='round' />
         </g>
      );

      // Add icon to the view's children
      if (!view.children) {
         view.children = [];
      }
      view.children.push(icon);
   }
}

@injectable()
export class AttributeCompartmentView extends GCompartmentView {
   override render(compartment: Readonly<AttributeCompartment>, context: RenderingContext): VNode | undefined {
      const translate = `translate(${compartment.bounds.x}, ${compartment.bounds.y})`;
      const vnode: any = (
         <g
            transform={translate}
            class-identifier={compartment.args?.identifier}
            class-mouseover={compartment.hoverFeedback}
            class-selected={compartment.selected}
         >
            <rect
               class-attribute-compartment={true}
               class-mouseover={compartment.hoverFeedback}
               class-selected={compartment.selected}
               x='0'
               y='0'
               width={Math.max(compartment.size.width, 0)}
               height={Math.max(compartment.size.height, 0)}
            ></rect>
            {compartment.args?.identifier && (
               <path
                  class-icon-path='icon-path'
                  d='M432-680q0-28 20-48t48-20q28 0 48 20t20 48q0 28-20 48t-48 20q-28 0-48-20t-20-48ZM490 0 337-167l64-88-64-88 60-75v-45q-60-32-98.5-85T260-680q0-100 70-170t170-70q100 0 170 70t70 170q0 72-34 124.5T603-463v350L490 0ZM320-680q0 58 38.5 110t98.5 66v108l-45 54 63 88-62 82 79 85 51-51v-366q66-19 101.5-66.5T680-680q0-75-52.5-127.5T500-860q-75 0-127.5 52.5T320-680Z'
               ></path>
            )}
            {context.renderChildren(compartment) as ReactNode}
         </g>
      ) as any;

      return vnode;
   }
}

@injectable()
export class CrossModelEdgeView extends PolylineEdgeViewWithGapsOnIntersections {
   protected override renderAdditionals(edge: GEdge, segments: Point[], context: RenderingContext): VNode[] {
      const edgePadding = EdgePadding.from(edge);
      return edgePadding ? [this.renderMouseHandle(segments, edgePadding)] : [];
   }

   protected renderMouseHandle(segments: Point[], padding: number): VNode {
      return (
         <path
            class-mouse-handle
            d={this.createPathForSegments(segments)}
            style-stroke-width={padding * 2}
            style-stroke='transparent'
            style-stroke-dasharray='none'
            style-stroke-dashoffset='0'
         />
      );
   }

   protected createPathForSegments(segments: Point[]): string {
      const firstPoint = segments[0];
      let path = `M ${firstPoint.x},${firstPoint.y}`;
      for (let i = 1; i < segments.length; i++) {
         const p = segments[i];
         path += ` L ${p.x},${p.y}`;
      }
      return path;
   }
}
