/********************************************************************************
 * Copyright (c) 2024 CrossBreeze.
 ********************************************************************************/
/** @jsx svg */
/* eslint-disable react/no-unknown-property */
/* eslint-disable max-len */

import { BACKGROUND_COLOR, BORDER_COLOR, BORDER_STYLE, BORDER_WEIGHT, FONT_COLOR } from '@crossmodel/protocol';
import {
   ArgsAware,
   EdgePadding,
   GCompartmentView,
   GEdge,
   GNode,
   Hoverable,
   Point,
   PolylineEdgeViewWithGapsOnIntersections,
   RenderingContext,
   RoundedCornerNodeView,
   RoundedCornerWrapper,
   Selectable,
   isArgsAware,
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

      // Apply custom styling CSS classes from node args if defined
      const argsAwareNode = node as GNode & Hoverable & Selectable & ArgsAware;
      if (view && isArgsAware(node) && argsAwareNode.args) {
         if (!view.data) {
            view.data = {};
         }
         if (!view.data.style) {
            view.data.style = {};
         }

         // Set CSS custom properties for styling
         if (argsAwareNode.args[BACKGROUND_COLOR]) {
            view.data.style['--node-background-color'] = argsAwareNode.args[BACKGROUND_COLOR] as string;
         }
         if (argsAwareNode.args[BORDER_COLOR]) {
            view.data.style['--node-border-color'] = argsAwareNode.args[BORDER_COLOR] as string;
         }
         if (argsAwareNode.args[BORDER_WEIGHT] !== undefined) {
            view.data.style['--node-border-weight'] = String(argsAwareNode.args[BORDER_WEIGHT]) + 'px';
         }
         if (argsAwareNode.args[BORDER_STYLE]) {
            const borderStyle = argsAwareNode.args[BORDER_STYLE] as string;
            if (borderStyle === 'dashed') {
               view.data.style['--node-border-style'] = '8 4';
            } else if (borderStyle === 'dotted') {
               view.data.style['--node-border-style'] = '2 2';
            }
         }
         if (argsAwareNode.args[FONT_COLOR]) {
            view.data.style['--node-font-color'] = argsAwareNode.args[FONT_COLOR] as string;
         }
      }

      return view;
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

   override render(edge: Readonly<GEdge>, context: RenderingContext): VNode | undefined {
      const view = super.render(edge, context);

      // Apply custom styling CSS custom properties from edge args if defined
      const argsAwareEdge = edge as GEdge & ArgsAware;
      if (view && isArgsAware(edge) && argsAwareEdge.args) {
         if (!view.data) {
            view.data = {};
         }
         if (!view.data.style) {
            view.data.style = {};
         }

         // Set CSS custom properties for styling
         if (argsAwareEdge.args[BORDER_COLOR]) {
            view.data.style['--edge-border-color'] = argsAwareEdge.args[BORDER_COLOR] as string;
         }
         if (argsAwareEdge.args[BORDER_WEIGHT] !== undefined) {
            view.data.style['--edge-border-weight'] = String(argsAwareEdge.args[BORDER_WEIGHT]) + 'px';
         }
         if (argsAwareEdge.args[BORDER_STYLE]) {
            const borderStyle = argsAwareEdge.args[BORDER_STYLE] as string;
            if (borderStyle === 'dashed') {
               view.data.style['--edge-border-style'] = '8 4';
            } else if (borderStyle === 'dotted') {
               view.data.style['--edge-border-style'] = '2 2';
            }
         }
      }

      return view;
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
