/********************************************************************************
 * Copyright (c) 2023 CrossBreeze.
 ********************************************************************************/
/** @jsx svg */
/* eslint-disable react/no-unknown-property */
/* eslint-disable react/jsx-key */
import { GGraph, GGraphView, RenderingContext, TYPES, ViewerOptions, svg } from '@eclipse-glsp/client';
import { inject } from '@theia/core/shared/inversify';
import { injectable } from 'inversify';
import { ReactNode } from 'react';
import { VNode, VNodeStyle } from 'snabbdom';
import { CrossModelEdgeView, DiagramNodeView } from '../views';

@injectable()
export class EntityNodeView extends DiagramNodeView {}

@injectable()
export class RelationshipEdgeView extends CrossModelEdgeView {}

@injectable()
export class InheritanceEdgeView extends CrossModelEdgeView {}

const MARKER_RELATIONSHIP_CARDINALITY_PARENT_ONE_ID = 'marker-relationship-parent-one';
const MARKER_RELATIONSHIP_CARDINALITY_PARENT_ONE_SEL_ID = 'marker-relationship-parent-one-selected';
const MARKER_RELATIONSHIP_CARDINALITY_PARENT_ONE_M_ID = 'marker-relationship-parent-one-mandatory';
const MARKER_RELATIONSHIP_CARDINALITY_PARENT_ONE_M_SEL_ID = 'marker-relationship-parent-one-mandatory-selected';
const MARKER_RELATIONSHIP_CARDINALITY_PARENT_MULTI_ID = 'marker-relationship-parent-multi';
const MARKER_RELATIONSHIP_CARDINALITY_PARENT_MULTI_SEL_ID = 'marker-relationship-parent-multi-selected';
const MARKER_RELATIONSHIP_CARDINALITY_PARENT_MULTI_M_ID = 'marker-relationship-parent-multi-m';
const MARKER_RELATIONSHIP_CARDINALITY_PARENT_MULTI_M_SEL_ID = 'marker-relationship-parent-multi-m-selected';

const MARKER_RELATIONSHIP_CARDINALITY_CHILD_ONE_ID = 'marker-relationship-child-one';
const MARKER_RELATIONSHIP_CARDINALITY_CHILD_ONE_SEL_ID = 'marker-relationship-child-one-selected';
const MARKER_RELATIONSHIP_CARDINALITY_CHILD_ONE_M_ID = 'marker-relationship-child-one-mandatory';
const MARKER_RELATIONSHIP_CARDINALITY_CHILD_ONE_M_SEL_ID = 'marker-relationship-child-one-mandatory-selected';
const MARKER_RELATIONSHIP_CARDINALITY_CHILD_MULTI_ID = 'marker-relationship-child-multi';
const MARKER_RELATIONSHIP_CARDINALITY_CHILD_MULTI_SEL_ID = 'marker-relationship-child-multi-selected';
const MARKER_RELATIONSHIP_CARDINALITY_CHILD_MULTI_M_ID = 'marker-relationship-child-multi-m';
const MARKER_RELATIONSHIP_CARDINALITY_CHILD_MULTI_M_SEL_ID = 'marker-relationship-child-multi-m-selected';

const MARKER_INHERITANCE_ID = 'marker-inheritance';
const MARKER_INHERITANCE_SELECTED_ID = 'marker-inheritance-selected';

export class SystemGraphView extends GGraphView {
   @inject(TYPES.ViewerOptions) protected viewerOptions: ViewerOptions;

   protected createDefId(id: string): string {
      return `${this.viewerOptions.baseDiv}__svg__def__${id}`;
   }

   protected onContextMenu = (event: MouseEvent): void => {
      event.preventDefault();
      event.stopPropagation();
   };

   override render(model: Readonly<GGraph>, context: RenderingContext): VNode {
      const edgeRouting = this.edgeRouterRegistry.routeAllChildren(model);
      const transform = `scale(${model.zoom}) translate(${-model.scroll.x},${-model.scroll.y})`;
      const graph: any = (
         <svg class-sprotty-graph={true}>
            <g transform={transform}>
               {this.renderAdditionals(context) as ReactNode}
               {context.renderChildren(model, { edgeRouting }) as ReactNode}
            </g>
         </svg>
      );
      if (graph.data) {
         graph.data.style = { ...graph.data.style, ...this.getGridStyle(model, context), ...this.renderStyle(context) };
      }
      return graph;
   }

   protected renderAdditionals(context: RenderingContext): VNode[] {
      const directedEdgeAdds: any = [
         <defs>
            <marker
               id={this.createDefId(MARKER_RELATIONSHIP_CARDINALITY_PARENT_ONE_ID)}
               viewBox='0 0 20 10'
               refX='0'
               refY='5'
               markerUnits='userSpaceOnUse'
               markerWidth='20'
               markerHeight='10'
               orient='auto'
            >
               <circle cx='14' cy='5' r='4' stroke='context-stroke' fill='var(--sprotty-background)' />
            </marker>
            <marker
               id={this.createDefId(MARKER_RELATIONSHIP_CARDINALITY_PARENT_ONE_SEL_ID)}
               viewBox='0 0 20 10'
               refX='0'
               refY='5'
               markerUnits='userSpaceOnUse'
               markerWidth='20'
               markerHeight='10'
               orient='auto'
            >
               <circle cx='14' cy='5' r='4' stroke='context-stroke' fill='var(--sprotty-background)' />
            </marker>

            <marker
               id={this.createDefId(MARKER_RELATIONSHIP_CARDINALITY_PARENT_ONE_M_ID)}
               viewBox='0 0 12 10'
               refX='0'
               refY='5'
               markerUnits='userSpaceOnUse'
               markerWidth='12'
               markerHeight='10'
               orient='auto'
            >
               <path d='M 10 0 L 10 10' stroke='context-stroke' fill='var(--sprotty-background)' fill-opacity='0' />
            </marker>
            <marker
               id={this.createDefId(MARKER_RELATIONSHIP_CARDINALITY_PARENT_ONE_M_SEL_ID)}
               viewBox='0 0 12 10'
               refX='0'
               refY='5'
               markerUnits='userSpaceOnUse'
               markerWidth='12'
               markerHeight='10'
               orient='auto'
            >
               <path d='M 10 0 L 10 10' stroke='context-stroke' fill='var(--sprotty-background)' fill-opacity='0' />
            </marker>

            <marker
               id={this.createDefId(MARKER_RELATIONSHIP_CARDINALITY_PARENT_MULTI_ID)}
               viewBox='0 0 20 10'
               refX='0'
               refY='5'
               markerUnits='userSpaceOnUse'
               markerWidth='20'
               markerHeight='10'
               orient='auto'
            >
               <path d='M 0 0 L 10 5 L 0 10' stroke='context-stroke' fill='var(--sprotty-background)' fill-opacity='0' />
               <circle cx='14' cy='5' r='4' stroke='context-stroke' fill='var(--sprotty-background)' />
            </marker>
            <marker
               id={this.createDefId(MARKER_RELATIONSHIP_CARDINALITY_PARENT_MULTI_SEL_ID)}
               viewBox='0 0 20 10'
               refX='0'
               refY='5'
               markerUnits='userSpaceOnUse'
               markerWidth='20'
               markerHeight='10'
               orient='auto'
            >
               <path d='M 0 0 L 10 5 L 0 10' stroke='context-stroke' fill='var(--sprotty-background)' fill-opacity='0' />
               <circle cx='14' cy='5' r='4' stroke='context-stroke' fill='var(--sprotty-background)' />
            </marker>

            <marker
               id={this.createDefId(MARKER_RELATIONSHIP_CARDINALITY_PARENT_MULTI_M_ID)}
               viewBox='0 0 20 10'
               refX='0'
               refY='5'
               markerUnits='userSpaceOnUse'
               markerWidth='20'
               markerHeight='10'
               orient='auto'
            >
               <path d='M 0 0 L 10 5 L 0 10' stroke='context-stroke' fill='var(--sprotty-background)' fill-opacity='0' />
               <path d='M 10 0 L 10 10' stroke='context-stroke' fill='var(--sprotty-background)' fill-opacity='0' />
            </marker>
            <marker
               id={this.createDefId(MARKER_RELATIONSHIP_CARDINALITY_PARENT_MULTI_M_SEL_ID)}
               viewBox='0 0 20 10'
               refX='0'
               refY='5'
               markerUnits='userSpaceOnUse'
               markerWidth='20'
               markerHeight='10'
               orient='auto'
            >
               <path d='M 0 0 L 10 5 L 0 10' stroke='context-stroke' fill='var(--sprotty-background)' fill-opacity='0' />
               <path d='M 10 0 L 10 10' stroke='context-stroke' fill='var(--sprotty-background)' fill-opacity='0' />
            </marker>

            <marker
               id={this.createDefId(MARKER_RELATIONSHIP_CARDINALITY_CHILD_ONE_ID)}
               viewBox='0 0 20 10'
               refX='20'
               refY='5'
               markerUnits='userSpaceOnUse'
               markerWidth='20'
               markerHeight='10'
               orient='auto-start-reverse'
            >
               <circle cx='6' cy='5' r='4' stroke='context-stroke' fill='var(--sprotty-background)' />
            </marker>
            <marker
               id={this.createDefId(MARKER_RELATIONSHIP_CARDINALITY_CHILD_ONE_SEL_ID)}
               viewBox='0 0 20 10'
               refX='20'
               refY='5'
               markerUnits='userSpaceOnUse'
               markerWidth='20'
               markerHeight='10'
               orient='auto-start-reverse'
            >
               <circle cx='6' cy='5' r='4' stroke='context-stroke' fill='var(--sprotty-background)' />
            </marker>

            <marker
               id={this.createDefId(MARKER_RELATIONSHIP_CARDINALITY_CHILD_ONE_M_ID)}
               viewBox='0 0 12 10'
               refX='12'
               refY='5'
               markerUnits='userSpaceOnUse'
               markerWidth='12'
               markerHeight='10'
               orient='auto-start-reverse'
            >
               <path d='M 2 0 L 2 10' stroke='context-stroke' fill='var(--sprotty-background)' fill-opacity='0' />
            </marker>
            <marker
               id={this.createDefId(MARKER_RELATIONSHIP_CARDINALITY_CHILD_ONE_M_SEL_ID)}
               viewBox='0 0 12 10'
               refX='12'
               refY='5'
               markerUnits='userSpaceOnUse'
               markerWidth='12'
               markerHeight='10'
               orient='auto-start-reverse'
            >
               <path d='M 2 0 L 2 10' stroke='context-stroke' fill='var(--sprotty-background)' fill-opacity='0' />
            </marker>

            <marker
               id={this.createDefId(MARKER_RELATIONSHIP_CARDINALITY_CHILD_MULTI_ID)}
               viewBox='0 0 20 10'
               refX='20'
               refY='5'
               markerUnits='userSpaceOnUse'
               markerWidth='20'
               markerHeight='10'
               orient='auto-start-reverse'
            >
               <path d='M 20 0 l -10 5 L 20 10' stroke='context-stroke' fill='var(--sprotty-background)' fill-opacity='0' />
               <circle cx='6' cy='5' r='4' stroke='context-stroke' fill='var(--sprotty-background)' />
            </marker>
            <marker
               id={this.createDefId(MARKER_RELATIONSHIP_CARDINALITY_CHILD_MULTI_SEL_ID)}
               viewBox='0 0 20 10'
               refX='20'
               refY='5'
               markerUnits='userSpaceOnUse'
               markerWidth='20'
               markerHeight='10'
               orient='auto-start-reverse'
            >
               <path d='M 20 0 l -10 5 L 20 10' stroke='context-stroke' fill='var(--sprotty-background)' fill-opacity='0' />
               <circle cx='6' cy='5' r='4' stroke='context-stroke' fill='var(--sprotty-background)' />
            </marker>

            <marker
               id={this.createDefId(MARKER_RELATIONSHIP_CARDINALITY_CHILD_MULTI_M_ID)}
               viewBox='0 0 20 10'
               refX='20'
               refY='5'
               markerUnits='userSpaceOnUse'
               markerWidth='20'
               markerHeight='10'
               orient='auto-start-reverse'
            >
               <path d='M 20 0 l -10 5 L 20 10' stroke='context-stroke' fill='var(--sprotty-background)' fill-opacity='0' />
               <path d='M 10 0 L 10 10' stroke='context-stroke' fill='var(--sprotty-background)' fill-opacity='0' />
            </marker>
            <marker
               id={this.createDefId(MARKER_RELATIONSHIP_CARDINALITY_CHILD_MULTI_M_SEL_ID)}
               viewBox='0 0 20 10'
               refX='20'
               refY='5'
               markerUnits='userSpaceOnUse'
               markerWidth='20'
               markerHeight='10'
               orient='auto-start-reverse'
            >
               <path d='M 20 0 l -10 5 L 20 10' stroke='context-stroke' fill='var(--sprotty-background)' fill-opacity='0' />
               <path d='M 10 0 L 10 10' stroke='context-stroke' fill='var(--sprotty-background)' fill-opacity='0' />
            </marker>

            <marker
               id={this.createDefId(MARKER_INHERITANCE_ID)}
               viewBox='0 0 10 10'
               refX='10'
               refY='5'
               markerUnits='userSpaceOnUse'
               markerWidth='20'
               markerHeight='20'
               orient='auto-start-reverse'
            >
               <path d='M 0 0 L 10 5 L 0 10 L 0 0 z' stroke='context-stroke' fill='context-stroke' />
            </marker>
            <marker
               id={this.createDefId(MARKER_INHERITANCE_SELECTED_ID)}
               viewBox='0 0 10 10'
               refX='10'
               refY='5'
               markerUnits='userSpaceOnUse'
               markerWidth='20'
               markerHeight='20'
               orient='auto-start-reverse'
            >
               <path d='M 0 0 L 10 5 L 0 10 L 0 0 z' stroke='context-stroke' fill='context-stroke' />
            </marker>
         </defs>
      ];

      return directedEdgeAdds;
   }

   protected renderStyle(context: RenderingContext): VNodeStyle {
      return {
         height: '100%',
         '--svg-def-marker-relation-parent-one': `url(#${this.createDefId(MARKER_RELATIONSHIP_CARDINALITY_PARENT_ONE_ID)})`,
         '--svg-def-marker-relation-parent-one-sel': `url(#${this.createDefId(MARKER_RELATIONSHIP_CARDINALITY_PARENT_ONE_SEL_ID)})`,
         '--svg-def-marker-relation-parent-one-m': `url(#${this.createDefId(MARKER_RELATIONSHIP_CARDINALITY_PARENT_ONE_M_ID)})`,
         '--svg-def-marker-relation-parent-one-m-sel': `url(#${this.createDefId(MARKER_RELATIONSHIP_CARDINALITY_PARENT_ONE_M_SEL_ID)})`,
         '--svg-def-marker-relation-parent-multi': `url(#${this.createDefId(MARKER_RELATIONSHIP_CARDINALITY_PARENT_MULTI_ID)})`,
         '--svg-def-marker-relation-parent-multi-sel': `url(#${this.createDefId(MARKER_RELATIONSHIP_CARDINALITY_PARENT_MULTI_SEL_ID)})`,
         '--svg-def-marker-relation-parent-multi-m': `url(#${this.createDefId(MARKER_RELATIONSHIP_CARDINALITY_PARENT_MULTI_M_ID)})`,
         '--svg-def-marker-relation-parent-multi-m-sel': `url(#${this.createDefId(MARKER_RELATIONSHIP_CARDINALITY_PARENT_MULTI_M_SEL_ID)})`,
         '--svg-def-marker-relation-child-one': `url(#${this.createDefId(MARKER_RELATIONSHIP_CARDINALITY_CHILD_ONE_ID)})`,
         '--svg-def-marker-relation-child-one-sel': `url(#${this.createDefId(MARKER_RELATIONSHIP_CARDINALITY_CHILD_ONE_SEL_ID)})`,
         '--svg-def-marker-relation-child-one-m': `url(#${this.createDefId(MARKER_RELATIONSHIP_CARDINALITY_CHILD_ONE_M_ID)})`,
         '--svg-def-marker-relation-child-one-m-sel': `url(#${this.createDefId(MARKER_RELATIONSHIP_CARDINALITY_CHILD_ONE_M_SEL_ID)})`,
         '--svg-def-marker-relation-child-multi': `url(#${this.createDefId(MARKER_RELATIONSHIP_CARDINALITY_CHILD_MULTI_ID)})`,
         '--svg-def-marker-relation-child-multi-sel': `url(#${this.createDefId(MARKER_RELATIONSHIP_CARDINALITY_CHILD_MULTI_SEL_ID)})`,
         '--svg-def-marker-relation-child-multi-m': `url(#${this.createDefId(MARKER_RELATIONSHIP_CARDINALITY_CHILD_MULTI_M_ID)})`,
         '--svg-def-marker-relation-child-multi-m-sel': `url(#${this.createDefId(MARKER_RELATIONSHIP_CARDINALITY_CHILD_MULTI_M_SEL_ID)})`,
         '--svg-def-marker-inheritance': `url(#${this.createDefId(MARKER_INHERITANCE_ID)})`,
         '--svg-def-marker-inheritance-selected': `url(#${this.createDefId(MARKER_INHERITANCE_SELECTED_ID)})`
      };
   }
}
