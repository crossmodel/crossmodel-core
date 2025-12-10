/********************************************************************************
 * Copyright (c) 2023 CrossBreeze.
 ********************************************************************************/
/* eslint-disable react/no-unknown-property */
/** @jsx svg */

import {
   findParentByFeature,
   GConnectableElement,
   IViewArgs,
   RenderingContext,
   SEdgeImpl,
   isHoverable,
   isSelectable
} from '@eclipse-glsp/client';
import { injectable } from 'inversify';
import { VNode } from 'snabbdom';
import { CrossModelEdgeView, DiagramNodeView, EntityDiagramNodeView } from '../views';

@injectable()
export class SourceObjectNodeView extends EntityDiagramNodeView {}

@injectable()
export class SourceNumberNodeView extends DiagramNodeView {}

@injectable()
export class SourceStringNodeView extends DiagramNodeView {}

@injectable()
export class TargetObjectNodeView extends EntityDiagramNodeView {}

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
