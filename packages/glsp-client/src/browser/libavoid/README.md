# Libavoid Edge Routing

This folder contains the client-side edge routing implementation based on
[libavoid-js](https://github.com/Aksem/libavoid-js), a JavaScript/WASM port
of the [libavoid](https://www.adaptagrams.org/documentation/libavoid.html)
C++ library for connector routing. The original sprotty integration was created
by [Vladyslav Hnatiuk](https://github.com/Aksem/sprotty-routing-libavoid).

## How Libavoid Works

Libavoid performs automatic connector (edge) routing that avoids overlapping
with rectangular obstacles (nodes). The routing process works as follows:

1. **Obstacles (ShapeRef)**: Each node in the diagram is registered as a
   rectangular obstacle with the libavoid router. The router tracks their
   positions and sizes and routes edges around them.

2. **Shape Connection Pins**: Connection points are placed along obstacle
   edges at grid-aligned intervals. Pins define where connectors can attach
   to shapes. All pins share a common `classId` so libavoid can freely choose
   the optimal pin for each connector. A margin keeps pins away from corners
   to leave room for connector icons.

3. **Connectors (ConnRef)**: Each edge is registered as a connector between
   two obstacle pins. The router computes an obstacle-avoiding path between
   the source and target pins.

4. **Orthogonal Routing**: The default routing type produces Manhattan-style
   paths with only horizontal and vertical segments. This works well with
   grid-snapped node positions since grid-aligned pins increase the chance
   of straight-line connections.

5. **Nudging**: After computing initial routes, the router nudges overlapping
   or collinear edge segments apart based on configurable nudging distances.
   This separates parallel edges that would otherwise overlap.

6. **Transaction Processing**: All shape and connector updates are batched.
   The router processes them in a single `processTransaction()` call for
   efficiency. Connectors use callbacks to notify which edges changed.

## System Diagram vs Mapping Diagram

The two diagram types use libavoid differently:

- **System diagram**: Edges connect directly to entity node shapes. Multiple
  grid-aligned pins are created along all four sides of each node, allowing
  libavoid to choose the optimal connection point.

- **Mapping diagram**: Edges connect to port shapes (small visual connection
  points on attributes). Each port has a single fixed pin on its left or
  right side, constraining the connection direction.

## File Descriptions

| File | Purpose |
|------|---------|
| `libavoid.ts` | Core wrapper for the libavoid-js library. Type aliases for C++ types (Router, ShapeRef, ConnRef), enums for route types and directions, WASM lifecycle management, coordinate conversion utilities, and pin constants. |
| `libavoid-router.ts` | Main `LibavoidEdgeRouter` class extending GLSP's `AbstractEdgeRouter`. Manages obstacles, connectors, and pins. Handles grid-aligned pin placement, shape movement tracking, connector endpoint refresh, and route computation. |
| `libavoid-router-anchors.ts` | Anchor computers (`LibavoidEllipseAnchor`, `LibavoidRectangleAnchor`, `LibavoidDiamondAnchor`) providing shape-specific anchor point calculation. |
| `libavoid-module.ts` | Inversify `FeatureModule` binding the router, configuration, and anchors into the DI container. Import `libAvoidModule` to enable libavoid routing in a diagram. |
| `libavoid-options.ts` | Configuration interfaces and the default configuration (`DEFAULT_LIBAVOID_EDGE_ROUTER_CONFIG`). **This is the file to edit when tuning routing behavior** - penalties, buffer distances, nudging distances, and routing options are all configured here. Each setting has detailed comments explaining its implications. |
| `libavoid-model.ts` | Model classes (`LibavoidEdge`) extending GLSP's `GEdge` with libavoid-specific options (route type, crossing hate, visible directions). |
| `libavoid-initializer.ts` | `LibAvoidInitializer` loading the libavoid WASM module during application startup via Theia's `FrontendApplicationContribution`. |

## Key Configuration (libavoid-options.ts)

The most impactful settings are:

| Setting | Default | Effect |
|---------|---------|--------|
| `shapeBufferDistance` | `GRID.x` (10px) | How far edges stay from shape borders |
| `idealNudgingDistance` | `GRID.x` (10px) | Spacing between parallel edge segments |
| `segmentPenalty` | 10 | Discourages extra turns/segments |
| `crossingPenalty` | 100 | Discourages edge crossings |
| `reverseDirectionPenalty` | 100 | Discourages U-turns |
| `routingType` | Orthogonal | Manhattan-style (horizontal/vertical only) |

The grid size comes from `@crossmodel/protocol` (`GRID` constant) to ensure
routing spacing stays aligned with the diagram's snap grid.
