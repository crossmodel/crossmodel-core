/********************************************************************************
 * MIT License
 * Copyright (c) 2019 Vladyslav Hnatiuk
 * https://github.com/Aksem/sprotty-routing-libavoid
 ********************************************************************************/

import { GRID } from '@crossmodel/protocol';
import { LibavoidRouteType } from './libavoid';

export const LibavoidEdgeRouterOptions = Symbol('LibavoidEdgeRouterOptions');

/**
 * Documentation taken from https://github.com/Aksem/sprotty-routing-libavoid
 */
export interface LibavoidRouterOptions {
   /**
    * This option causes the final segments of connectors, which are attached to shapes, to be nudged apart.
    * Usually these segments are fixed, since they are considered to be attached to ports.
    *
    * Default: false
    *
    * Note This option also causes routes running through the same checkpoint to be nudged apart.
    * This option has no effect if ::nudgeSharedPathsWithCommonEndPoint is set to false.
    *
    * Note: This will allow routes to be nudged up to the bounds of shapes.
    */
   nudgeOrthogonalSegmentsConnectedToShapes?: boolean;

   /**
    * This option causes hyperedge routes to be locally improved fixing obviously bad paths.
    * As part of this process libavoid will effectively move junctions, setting new ideal positions which can be
    * accessed via JunctionRef::recommendedPosition() for each junction.
    *
    * Default: true
    *
    * This will not add or remove junctions, so will keep the hyperedge topology the same.
    * Better routes can be achieved by enabling the ::improveHyperedgeRoutesMovingAddingAndDeletingJunctions option.
    *
    * If initial sensible positions for junctions in hyperedges are not known you can register those hyperedges with
    * the HyperedgeRerouter class for complete rerouting.
    */
   improveHyperedgeRoutesMovingJunctions?: boolean;

   /**
    * This option penalises and attempts to reroute orthogonal shared connector paths terminating at a common junction or shape
    * connection pin. When multiple connector paths enter or leave the same side of a junction (or shape pin), the router will
    * attempt to reroute these to different sides of the junction or different shape pins.
    *
    * Default: false
    *
    * This option depends on the ::fixedSharedPathPenalty penalty having been set.
    *
    * Note: This penalty is still experimental! It is not recommended for normal use.
    */
   penaliseOrthogonalSharedPathsAtConnEnds?: boolean;

   /**
    * This option can be used to control whether collinear line segments that touch just at their ends will be nudged apart.
    * The overlap will usually be resolved in the other dimension, so this is not usually required.
    *
    * Default: false
    */
   nudgeOrthogonalTouchingColinearSegments?: boolean;

   /**
    * This option can be used to control whether the router performs a preprocessing step before orthogonal nudging where is tries
    * to unify segments and centre them in free space. This generally results in better quality ordering and nudging.
    *
    * Default: false
    *
    * Note: You may wish to turn this off for large examples where it can be very slow and will make little difference.
    */
   performUnifyingNudgingPreprocessingStep?: boolean;

   /**
    * This option causes hyperedge routes to be locally improved fixing obviously bad paths.
    *
    * It can cause junctions and connectors to be added or removed from hyperedges.
    * As part of this process libavoid will effectively move junctions by setting new ideal positions for each remaining or added junction.
    *
    * Default: false
    *
    * If set, this option overrides the ::improveHyperedgeRoutesMovingJunctions option.
    */
   improveHyperedgeRoutesMovingAddingAndDeletingJunctions?: boolean;

   /**
    * This option determines whether intermediate segments of connectors that are attached to common endpoints will be nudged apart.
    * Usually these segments get nudged apart, but you may want to turn this off if you would prefer that entire shared paths terminating
    * at a common end point should overlap.
    *
    * Default: true
    */
   nudgeSharedPathsWithCommonEndPoint?: boolean;

   /**
    * Default: 20
    */
   minimalSegmentLengthForChildPosition?: number;
}

/**
 * Documentation taken from https://github.com/Aksem/sprotty-routing-libavoid
 */
export interface LibavoidRouterParameters {
   /**
    * This penalty is applied for each segment in the connector path beyond the first.
    * This should always normally be set when doing orthogonal routing to prevent step-like connector paths.
    *
    * Default: 10
    *
    * Note: This penalty must be set (i.e., be greater than zero) in order for orthogonal connector nudging to be performed, since
    * this requires reasonable initial routes.
    */
   segmentPenalty?: number;

   /**
    * This penalty is applied in its full amount to tight acute bends in the connector path.
    * A smaller portion of the penalty is applied for slight bends, i.e., where the bend is close to 180 degrees.
    * This is useful for polyline routing where there is some evidence that tighter corners are worse for readability,
    * but that slight bends might not be so bad, especially when smoothed by curves.
    *
    * Default: 0
    */
   anglePenalty?: number;

   /**
    * This penalty is applied whenever a connector path crosses another connector path.
    * It takes shared paths into consideration and the penalty is only applied if there is an actual crossing.
    *
    * Default: 0
    *
    * Note: This penalty is still experimental! It is not recommended for normal use.
    */
   crossingPenalty?: number;

   /**
    * This penalty is applied whenever a connector path crosses a cluster boundary.
    *
    * Default: 4000
    *
    * Note: This penalty is still experimental! It is not recommended for normal use.
    *
    * Note: This penalty is very slow.
    */
   clusterCrossingPenalty?: number;

   /**
    * This penalty is applied whenever a connector path shares some segments with an immovable
    * portion of an existing connector route (such as the first or last segment of a connector).
    *
    * Default: 0
    *
    * Note: This penalty is still experimental! It is not recommended for normal use.
    */
   fixedSharedPathPenalty?: number;

   /**
    * This penalty is applied to port selection choice when the other end of the connector being routed does not appear in
    * any of the 90 degree visibility cones centered on the visibility directions for the port.
    *
    * Default: 0
    *
    * Note: This penalty is still experimental! It is not recommended for normal use.
    *
    * Note: This penalty is very slow.
    */
   portDirectionPenalty?: number;

   /**
    * This parameter defines the spacing distance that will be added to the sides of each shape when determining obstacle sizes for routing.
    * This controls how closely connectors pass shapes, and can be used to prevent connectors overlapping with shape boundaries.
    *
    * Default: 0
    */
   shapeBufferDistance?: number;

   /**
    * This parameter defines the spacing distance that will be used for nudging apart overlapping corners and line segments of connectors.
    *
    * Default: 4
    */
   idealNudgingDistance?: number;

   /**
    * This penalty is applied whenever a connector path travels in the direction opposite of the destination from the source endpoint.
    * By default this penalty is set to zero. This shouldn't be needed in most cases but can be useful if you use penalties such
    * as ::crossingPenalty which cause connectors to loop around obstacles.
    *
    * Default: 0
    */
   reverseDirectionPenalty?: number;
}

/**
 * Documentation taken from https://github.com/Aksem/sprotty-routing-libavoid
 */
export interface LibavoidEdgeRouterConfiguration extends LibavoidRouterOptions, LibavoidRouterParameters {
   /**
    * Default: RouteType.PolyLine
    */
   routingType?: LibavoidRouteType;
}

export const DEFAULT_LIBAVOID_EDGE_ROUTER_CONFIG: LibavoidEdgeRouterConfiguration = {
   // --- Routing Type ---
   // Orthogonal produces Manhattan-style routes (horizontal and vertical segments only).
   // PolyLine would allow diagonal segments but typically looks less clean in structured diagrams.
   routingType: LibavoidRouteType.Orthogonal,

   // --- Core Penalties ---

   // Penalizes routes that cross other connector paths. Higher values make the router try harder
   // to avoid crossings at the cost of potentially longer routes. Set to 0 to disable.
   // Values above ~200 can cause significantly longer detour routes.
   crossingPenalty: 100,

   // Penalizes routes that travel away from the destination before turning toward it (U-turns).
   // Set to 0 to allow looping routes. A value of 100 strongly discourages reverse-direction segments.
   reverseDirectionPenalty: 100,

   // Penalizes each additional segment beyond the first. Essential for orthogonal routing to prevent
   // staircase-like paths. Must be > 0 for orthogonal nudging to work.
   // Lower values allow more turns, higher values produce straighter routes with fewer bends.
   segmentPenalty: 10,

   // --- Grid-Aligned Spacing ---

   // Extra padding added to each obstacle boundary when computing routes. Connectors maintain at
   // least this distance from shape borders. Increasing pushes edges further from nodes.
   // Uses GRID.x to align the buffer to the grid for consistent spacing in grid-snapped layouts.
   shapeBufferDistance: GRID.x,

   // Distance used to separate overlapping connector segments during the nudging phase.
   // Controls how far apart parallel edge segments are pushed. Larger values give more visual
   // separation but consume more diagram space. Uses GRID.x to align nudged segments to the grid.
   idealNudgingDistance: GRID.x,

   // --- Disabled Experimental Features ---
   // These are marked experimental in the libavoid docs and disabled for stability.

   // Penalizes port selection when the opposite endpoint is not in a 90-degree visibility cone.
   // Very slow; not recommended for normal use.
   portDirectionPenalty: 0,

   // Penalizes sharing segments with immovable portions of existing connector routes.
   // Experimental; not recommended for normal use.
   fixedSharedPathPenalty: 0,

   // Attempts to reroute shared paths entering the same side of a junction.
   // Depends on fixedSharedPathPenalty. Experimental.
   penaliseOrthogonalSharedPathsAtConnEnds: false,

   // --- Nudging Options ---

   // Preprocessing step that unifies segments and centers them in free space before nudging.
   // Produces better visual results but can be slow on very large diagrams (hundreds of edges).
   performUnifyingNudgingPreprocessingStep: true,

   // Separates intermediate segments of connectors sharing common endpoints.
   // Setting to false would allow overlapping shared paths.
   nudgeSharedPathsWithCommonEndPoint: true,

   // Separates collinear segments that touch only at their endpoints.
   // Usually resolved in the other dimension, but enabling ensures explicit separation.
   nudgeOrthogonalTouchingColinearSegments: true,

   // Nudges final segments attached to shapes apart. With the multi-pin approach, this helps
   // the router optimize which pin to use for each connector. Setting to false would fix final
   // segments in place, preventing optimization of connections at shape boundaries.
   nudgeOrthogonalSegmentsConnectedToShapes: true
};
