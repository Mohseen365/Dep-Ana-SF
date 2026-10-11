# GRAPHVIEW LENS B — PRODUCT DECISION PACKET

## 1. Executive Summary

This Product Decision Packet contains decision-ready authorization packages for the four unresolved user-facing choices in **GraphView Lens B — Component Orbit / Component Constellation**:

- **Gate A:** Shared SObject Representation & Placement.
- **Gate B:** Angular Placement Semantics.
- **Gate C:** Excluded / Unreachable Node Visibility.
- **Gate D:** Drag-Position Persistence Scope.

Each gate provides the exact user-visible question, verified repository behavior, candidate options with observable user consequences, a recommended default (clearly marked **PROPOSED — NOT APPROVED**), the exact approval statement needed to authorize implementation, and downstream dependencies.

---

## 2. Decision Gate A — Shared SObject Representation

### User-Visible Question
When a canonical Salesforce object (`Object:Account`) is referenced by multiple LWC or Apex components (`ServiceA`, `ServiceB`, `ServiceC`), how should `Account` be visually represented and placed in the Component Orbit canvas?

### Current Behavior (Supported by Repository Evidence)
In `satellites.ts` (`findParentObjectId` line 466), the secondary satellite engine iterates over incident edges and attaches `Account` as a satellite beneath the first parent component encountered in Map iteration order (`ServiceA`).
- *Repository Fact:* `ExplorerDataSchema` contains zero primary parent or invocation frequency fields.
- *Observable User Consequence:* Attaching `Account` beneath `ServiceA` visually implies that `Account` is a private child component of `ServiceA`, disguising multi-service dependency risks for `ServiceB` and `ServiceC`.

### Available Alternatives

#### Option A1: Single Canonical Node with Multi-Tethers
- *Description:* `Account` is rendered as one single visual node. Directed edges connect `ServiceA`, `ServiceB`, and `ServiceC` to `Account` across radial rings.
- *Observable Consequences:* 100% accurate enterprise relationship graph. Long edges may cross radial rings and add canvas line clutter on dense graphs.

#### Option A2: Single Canonical Node with Non-Semantic Anchor and SHARED Badge (RECOMMENDED DEFAULT)
- *Description:* `Account` is rendered as one single visual node placed near its primary consumer (determined deterministically by `metrics.fanIn DESC`, `metrics.coupling DESC`, then `nodeId ASC` tie-break). It renders a prominent `"◉ SHARED"` badge in its label overlay.
- *Observable Consequences:* 100% identity preservation; zero duplicate visual nodes. Prominent `"SHARED"` badge prevents false ownership misinterpretation. Non-semantic anchor is explicitly designated as a geometric slot allocation convenience only.

#### Option A3: Visual Proxy Clones
- *Description:* A local visual proxy clone of `Account` is created underneath each referencing component.
- *Observable Consequences:* Clean local component subgraphs without cross-ring edges. Duplicates visual nodes, breaking 1:1 node visual identity.

### Recommended Option
**Model A2 (Single Canonical Node with Non-Semantic Geometric Anchor and SHARED Badge)**
*(PROPOSED — NOT APPROVED)*

### Exact Approval Statement Required
> "I approve Decision Gate A Option A2. Shared SObjects shall be represented as exactly one canonical visual node positioned near its highest-fanIn consumer component with a prominent 'SHARED' visual badge. Anchoring is explicitly recognized as a geometric slot allocation convenience and exerts zero claim of exclusive ownership."

### Downstream Dependencies
- **Implementation Dependency:** Add `"SHARED"` badge rendering condition in `graph-style.ts` or `FeatureOverlayCanvas.tsx`.
- **Test Dependency:** Unit test asserting single `Object:Account` node ID in `orbitOutput.positions` with 3 incident edge connections.

---

## 3. Decision Gate B — Angular Placement Semantics

### User-Visible Question
Do polar angles on a Component Orbit radial ring convey business/architectural domain membership or geometry-only uniform spatial packing?

### Current Behavior (Supported by Repository Evidence)
In `component-orbit-layout.ts` (lines 193–194):
$$\Delta\theta = \frac{2\pi}{n_k}, \quad \theta_i = \text{trackOffset} + i \cdot \Delta\theta$$
Ring nodes are sorted alphabetically by `nodeId` (`localeCompare`), and angles are assigned via uniform linear increments. Domain stem metadata is completely discarded.

### Available Alternatives

#### Option B1: Geometry-Only Uniform Spatial Packing (RECOMMENDED DEFAULT)
- *Description:* Polar angles are assigned strictly for uniform spatial clearance ($\Delta\theta = 2\pi / n_k$) after alphabetical `nodeId` pre-sorting.
- *Observable Consequences:* Maximum spatial clearance, guaranteed dynamic chord separation $d_{\text{chord}} \ge 188.68\text{px}$, 100% deterministic layout, zero sector crowding. Angular position conveys pure spatial distribution.

#### Option B2: Semantic Domain Sectors
- *Description:* $2\pi$ is partitioned into angular domain wedges corresponding to primary domain stems (`Sales`, `Service`, `Billing`).
- *Observable Consequences:* Polar angles communicate business domain membership. Single large domain may cause angular node crowding on dense rings.

### Recommended Option
**Model B1 (Geometry-Only Uniform Spatial Packing)**
*(PROPOSED — NOT APPROVED)*

### Exact Approval Statement Required
> "I approve Decision Gate B Option B1. Angular placement on Component Orbit radial rings shall serve geometry-only uniform spatial packing. Polar angles shall be assigned via uniform linear increments deltaTheta = 2*pi / N after sorting ring nodes alphabetically by canonical nodeId. Angular position shall convey zero domain or categorical meaning."

### Downstream Dependencies
- **Implementation Dependency:** None (Matches active code in `component-orbit-layout.ts`).
- **Test Dependency:** `orbit-layout.test.ts` L110 verifying uniform angle delta distribution.

---

## 4. Decision Gate C — Excluded / Unreachable Node Visibility

### User-Visible Question
When viewing a focused Component Orbit for LWC A, what visual treatment should components receive if they are disconnected from LWC A, beyond maxDepth ($d > 7$), or filtered out by relationship type filters?

### Current Behavior (Supported by Repository Evidence)
In `component-orbit-adapter.ts` (lines 280–285), unreachable nodes are listed in `unreachableNodeIds`. However, in `architecture-layout.ts` (lines 219–221), stale coordinates from `existingPositions` are merged into output for unreachable nodes, causing disconnected components to linger at stale canvas positions.

### Available Alternatives

#### Option C1: Active Focal Projection Only — Hide Unreachable Nodes (RECOMMENDED DEFAULT)
- *Description:* Unreachable nodes are excluded from the layout position map and removed from Cytoscape DOM canvas rendering (`display: none`) in Lens B.
- *Observable Consequences:* Uncluttered, 100% focal-centric investigation view. Unreachable components leave the visual canvas completely.

#### Option C2: Reason-Based Categorization & Status Badging
- *Description:* Unreachable nodes are categorized into depth-truncated vs disconnected vs filtered, and rendered with status badges.
- *Observable Consequences:* High information completeness; potential visual clutter.

#### Option C3: Outer Peripheral Shell
- *Description:* Unreachable nodes are placed on a distant outer peripheral ring ($R_{\text{max}} + 250\text{px}$) with 30% opacity.
- *Observable Consequences:* Full project inventory visible; outer ring visual noise on large datasets.

### Recommended Option
**Policy C1 (Active Focal Projection Only — Hide Unreachable Nodes)**
*(PROPOSED — NOT APPROVED)*

### Exact Approval Statement Required
> "I approve Decision Gate C Option C1. Nodes outside the active focal projection (disconnected components, nodes beyond maxDepth, or relationship-filtered nodes) shall be excluded from the Lens B layout position map AND filtered out of active Cytoscape DOM canvas rendering in Lens B. Unreachable nodes shall remain preserved in global project data for non-focal views."

### Downstream Dependencies
- **Implementation Dependency:** Remove L219 merge loop in `architecture-layout.ts`; filter `nodes` against `projectedNodeIds` in `GraphView.tsx`.
- **Test Dependency:** Integration test asserting `cy.getElementById("DisconnectedNode").length === 0` in Orbit mode.

---

## 5. Decision Gate D — Drag-Position Persistence Scope

### User-Visible Question
When a user manually drags a component node on the canvas in Orbit mode, where and for how long should that custom position override persist?

### Current Behavior (Supported by Repository Evidence)
In `projectState.ts` (line 47), positions are stored in a flat map `nodePositions[nodeId]` without `layoutMode` or `focalNodeId` scope. A user drag performed while viewing LWC A in Orbit mode pollutes the position of that node when viewing LWC B or Hierarchical layout.

### Available Alternatives

#### Option D1: Session-Scoped Focal Isolation
- *Description:* User drag overrides persist only in memory for the active focal session and reset when changing focal node or view mode.
- *Observable Consequences:* Zero persistence across context switches; clean auto-layout on return.

#### Option D2: Layout-Mode Scoped Persistence
- *Description:* Drag overrides persist per layout mode (`nodePositions[mode][nodeId]`), but leak across focal node changes within Orbit mode.
- *Observable Consequences:* Isolates Orbit from Hierarchical; leaks across focal components in Orbit mode.

#### Option D3: Composite Scoped Persistence — Mode and Focal Scoped (RECOMMENDED DEFAULT)
- *Description:* Drag overrides are persisted under composite key `nodePositions[projectId][layoutMode][focalNodeId][nodeId]`.
- *Observable Consequences:* 100% isolation across view modes and focal components. Drags in LWC A view exert zero effect on LWC B view.

### Recommended Option
**Policy D3 (Composite Scoped Persistence — Mode and Focal Scoped)**
*(PROPOSED — NOT APPROVED)*

### Exact Approval Statement Required
> "I approve Decision Gate D Option D3. User-dragged position overrides shall be scoped and persisted using composite context keys: nodePositions[projectId][layoutMode][focalNodeId][nodeId]. User drags performed in one focal context or layout mode shall exert zero effect on node positions in other focal contexts or layout modes."

### Downstream Dependencies
- **Implementation Dependency:** Update `GraphLayoutState` interface and `mergeWithDefaultState` in `projectState.ts`.
- **Test Dependency:** Unit test asserting drag in LWC A view does not alter node coordinates in LWC B view.

---

## 6. Product Decision Authorization Form

To authorize implementation, Product Authority may sign and record the selections below in `context/CURRENT-DECISIONS.md`:

```text
================================================================================
                    GRAPHVIEW LENS B PRODUCT AUTHORIZATION
================================================================================
[ ] Decision Gate A (Shared SObjects):      Option A2 (Single Node + SHARED Badge)
[ ] Decision Gate B (Angular Semantics):    Option B1 (Geometry Uniform Packing)
[ ] Decision Gate C (Excluded Visibility):  Option C1 (Hide Unreachable Nodes)
[ ] Decision Gate D (Drag Persistence):     Option D3 (Composite Scoped Persistence)

Authorized By: ___________________________    Date: _______________
Recording Location: context/CURRENT-DECISIONS.md
================================================================================
```
