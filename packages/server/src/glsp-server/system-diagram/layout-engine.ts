/********************************************************************************
 * Copyright (c) 2025 CrossBreeze.
 ********************************************************************************/
import {
   findParent,
   findParentByClass,
   GCompartment,
   GEdge,
   GGraph,
   GLabel,
   GModelElement,
   GModelElementConstructor,
   GModelRoot,
   GNode,
   GPort,
   GShapeElement,
   LayoutEngine,
   MaybePromise,
   ModelState
} from '@eclipse-glsp/server';
import ElkConstructor, { ELK, ElkExtendedEdge, ElkGraphElement, ElkLabel, ElkNode, ElkPort, ElkShape } from 'elkjs';
import { inject, injectable } from 'inversify';
import { isLogicalEntityNode, LogicalEntityNode } from '../../language-server/generated/ast.js';
import { SystemModelState } from './model/system-model-state.js';

/**
 * An implementation of GLSP's {@link LayoutEngine} interface that retrieves the graphical model from the {@link ModelState},
 * transforms this model into an ELK graph and then invokes the underlying ELK instance for layout computation.
 */
@injectable()
export class SystemDiagramLayoutEngine implements LayoutEngine {
   @inject(ModelState) protected modelState: SystemModelState;

   protected readonly elk: ELK;
   protected elkEdges: ElkExtendedEdge[];
   protected idToElkElement: Map<string, ElkGraphElement>;

   constructor() {
      this.elk = new ElkConstructor.default();
   }

   layout(): MaybePromise<GModelRoot> {
      const root = this.modelState.root;
      if (!(root instanceof GGraph)) {
         return root;
      }

      this.elkEdges = [];
      this.idToElkElement = new Map();
      const elkGraph = this.transformToElk(root);
      return this.elk.layout(elkGraph).then(result => {
         this.applyLayout(result);
         return root;
      });
   }

   protected transformToElk(model: GGraph): ElkNode;
   protected transformToElk(model: GNode): ElkNode;
   protected transformToElk(model: GEdge): ElkExtendedEdge;
   protected transformToElk(model: GModelElement): ElkGraphElement {
      if (model instanceof GGraph) {
         const graph = this.transformGraph(model);
         this.elkEdges.forEach(elkEdge => {
            const parent = this.findCommonAncestor(elkEdge);
            if (parent) {
               parent.edges!.push(elkEdge);
            }
         });
         return graph;
      } else if (model instanceof GNode) {
         return this.transformNode(model);
      } else if (model instanceof GEdge) {
         return this.transformEdge(model);
      } else if (model instanceof GLabel) {
         return this.transformLabel(model);
      } else if (model instanceof GPort) {
         return this.transformPort(model);
      }
      throw new Error('Type not supported: ' + model.type);
   }

   /**
    * Searches for all children of the given element that are an instance of the given {@link GModelElementConstructor}
    * and are included by the {@link ElementFilter}. Also considers children that are nested inside of {@link GCompartment}s.
    * @param element The element whose children should be queried.
    * @param constructor The class instance that should be matched
    * @returns A list of all matching children.
    */
   protected findChildren<G extends GModelElement>(element: GModelElement, constructor: GModelElementConstructor<G>): G[] {
      const result: G[] = [];
      element.children.forEach(child => {
         if (child instanceof constructor) {
            result.push(child);
         } else if (child instanceof GCompartment) {
            result.push(...this.findChildren(child, constructor));
         }
      });

      return result;
   }

   protected findCommonAncestor(elkEdge: ElkExtendedEdge): ElkNode | undefined {
      if (elkEdge.sources.length === 0 || elkEdge.targets.length === 0) {
         return undefined;
      }
      const source = this.modelState.index.get(elkEdge.sources[0]);
      const target = this.modelState.index.get(elkEdge.targets[0]);
      if (!source || !target) {
         return undefined;
      }

      const sourceParent = findParent(source.parent, parent => parent instanceof GNode || parent instanceof GGraph);
      const targetParent = findParent(target.parent, parent => parent instanceof GNode || parent instanceof GGraph);

      if (!sourceParent || !targetParent) {
         return undefined;
      }

      if (sourceParent === targetParent) {
         return this.idToElkElement.get(sourceParent.id) as ElkNode;
      } else if (source === targetParent) {
         return this.idToElkElement.get(source.id) as ElkNode;
      } else if (target === sourceParent) {
         return this.idToElkElement.get(target.id) as ElkNode;
      }
      return undefined;
   }

   protected transformGraph(graph: GGraph): ElkNode {
      const elkGraph: ElkNode = {
         id: graph.id,
         layoutOptions: {
            'elk.algorithm': 'layered',
            'elk.spacing.nodeNode': '50',
            'elk.spacing.edgeNode': '50',
            'elk.layered.spacing.nodeNodeBetweenLayers': '50'
         }
      };
      if (graph.children) {
         elkGraph.children = this.findChildren(graph, GNode).map(child => this.transformToElk(child));
         elkGraph.edges = [];
         this.elkEdges.push(...this.findChildren(graph, GEdge).map(child => this.transformToElk(child)));
      }
      this.idToElkElement.set(graph.id, elkGraph);
      return elkGraph;
   }

   protected transformNode(node: GNode): ElkNode {
      const elkNode: ElkNode = { id: node.id };
      if (node.children) {
         elkNode.children = this.findChildren(node, GNode).map(child => this.transformToElk(child));
         elkNode.edges = [];
         this.elkEdges.push(...this.findChildren(node, GEdge).map(child => this.transformToElk(child)));
         elkNode.labels = this.findChildren(node, GLabel).map(child => this.transformToElk(child));
         elkNode.ports = this.findChildren(node, GPort).map(child => this.transformToElk(child));
      }
      this.transformShape(elkNode, node);
      this.idToElkElement.set(node.id, elkNode);
      return elkNode;
   }

   protected transformShape(elkShape: ElkShape, shape: GShapeElement): void {
      elkShape.x = shape?.position?.x;
      elkShape.y = shape?.position?.y;
      elkShape.width = shape?.size?.width;
      elkShape.height = shape?.size?.height;
   }

   protected transformEdge(edge: GEdge): ElkExtendedEdge {
      const elkEdge: ElkExtendedEdge = {
         id: edge.id,
         sources: [edge.sourceId],
         targets: [edge.targetId]
      };
      const sourceElement = this.modelState.index.get(edge.sourceId);
      if (sourceElement instanceof GPort) {
         const parentNode = findParentByClass(sourceElement, GNode);
         if (parentNode) {
            elkEdge.sources[0] = parentNode.id;
         }
      }

      const targetElement = this.modelState.index.get(edge.targetId);
      if (sourceElement instanceof GPort) {
         const parentNode = findParentByClass(targetElement, GNode);
         if (parentNode) {
            elkEdge.targets[0] = parentNode.id;
         }
      }

      if (edge.children) {
         elkEdge.labels = this.findChildren(edge, GLabel).map(child => this.transformToElk(child)) as ElkLabel[];
      }
      const points = edge.routingPoints;
      if (points && points.length >= 2) {
         elkEdge.junctionPoints = [...points];
      }
      this.idToElkElement.set(edge.id, elkEdge);
      return elkEdge;
   }

   protected transformLabel(label: GLabel): ElkLabel {
      const elkLabel: ElkLabel = {
         id: label.id,
         text: label.text
      };
      this.transformShape(elkLabel, label);
      this.idToElkElement.set(label.id, elkLabel);
      return elkLabel;
   }

   protected transformPort(port: GPort): ElkPort {
      const elkPort: ElkPort = { id: port.id };
      if (port.children) {
         elkPort.labels = this.findChildren(port, GLabel).map(child => this.transformToElk(child));
         this.elkEdges.push(...this.findChildren(port, GEdge).map(child => this.transformToElk(child)));
      }
      this.transformShape(elkPort, port);
      this.idToElkElement.set(port.id, elkPort);
      return elkPort;
   }

   protected applyLayout(elkNode: ElkNode): void {
      const semantic = this.modelState.index.findSemanticElement(elkNode.id);
      if (isLogicalEntityNode(semantic)) {
         this.applyShape(semantic, elkNode);
      }
      if (elkNode.children) {
         for (const child of elkNode.children) {
            this.applyLayout(child);
         }
      }
      if (elkNode.edges) {
         // we are layouting with libavoid and there is no way to store the semantic information about routing points at the moment
      }

      if (elkNode.ports) {
         // we keep ports as they are automatically aligned based on the attribute compartment
      }
   }

   protected applyShape(node: LogicalEntityNode, elkShape: ElkShape): void {
      if (elkShape.x !== undefined && elkShape.y !== undefined) {
         node.x = elkShape.x;
         node.y = elkShape.y;
      }
      if (elkShape.width !== undefined && elkShape.height !== undefined) {
         node.width = elkShape.width;
         node.height = elkShape.height;
      }

      if (elkShape.labels) {
         // we do not layout label separately at the moment
      }
   }
}
