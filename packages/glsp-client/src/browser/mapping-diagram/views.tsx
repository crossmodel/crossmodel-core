/********************************************************************************
 * Copyright (c) 2023 CrossBreeze.
 ********************************************************************************/
/* eslint-disable react/no-unknown-property */
/** @jsx svg */

import {
   findParentByFeature,
   GConnectableElement,
   GNode,
   Hoverable,
   isHoverable,
   isSelectable,
   IViewArgs,
   RenderingContext,
   SEdgeImpl,
   Selectable,
   svg
} from '@eclipse-glsp/client';
import { injectable } from 'inversify';
import { VNode } from 'snabbdom';
import { CrossModelEdgeView, DiagramNodeView } from '../views';

@injectable()
export class SourceObjectNodeView extends DiagramNodeView {}

@injectable()
export class SourceNumberNodeView extends DiagramNodeView {}

@injectable()
export class SourceStringNodeView extends DiagramNodeView {}

@injectable()
export class TargetObjectNodeView extends DiagramNodeView {
   override render(node: Readonly<GNode & Hoverable & Selectable>, context: RenderingContext): VNode | undefined {
      const view = super.render(node, context);

      // Add external entity icon if isExternal flag is true
      const isExternal = node.args?.isExternal === true;
      if (view && isExternal) {
         this.addExternalEntityIcon(view, node);
      }

      return view;
   }

   protected addExternalEntityIcon(view: VNode, node: Readonly<GNode>): void {
      // Calculate icon position (bottom-left corner)
      const iconX = 5;
      const iconY = node.bounds.height - 20;

      // Create the external entity icon (Windows-style shortcut arrow)
      const icon: any = (
         <g class-external-entity-icon={true} transform={`translate(${iconX}, ${iconY})`}>
            {/* White background box for visibility */}
            <rect x='0' y='5' width='10' height='10' fill='white' stroke='black' stroke-width='0.5' rx='1' />

            {/* Arrow pointing up-right */}
            <path d='M 2 13 L 2 7 L 8 7' fill='none' stroke='black' stroke-width='1' />
            <polyline points='6,5 8,7 10,5' fill='none' stroke='black' stroke-width='1' />
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
export class AttributeMappingEdgeView extends CrossModelEdgeView {
   override render(edge: Readonly<SEdgeImpl>, context: RenderingContext, args?: IViewArgs): VNode | undefined {
      const view = super.render(edge, context);
      if (view?.data?.class) {
         view.data.class.mouseover = view.data.class.mouseover || this.isHovered(edge.source) || this.isHovered(edge.target);
         view.data.class['connector-selected'] = view.data.class.selected || this.isSelected(edge.source) || this.isSelected(edge.target);
      }
      return view;
   }

   protected isHovered(connected?: GConnectableElement): boolean {
      return !!connected && !!findParentByFeature(connected, isHoverable)?.hoverFeedback;
   }

   protected isSelected(connected?: GConnectableElement): boolean {
      return !!connected && !!findParentByFeature(connected, isSelectable)?.selected;
   }
}
