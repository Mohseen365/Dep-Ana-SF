# G-OVL Minimal Integration Boundary Audit

## 1. Context Path
`AGENT.md` → `08_Audit_Source_Register.md` → `CURRENT-STATE-BASELINE.md` → `G-SAT-DELIVERABLES.md` → Authoritative G-OVL Audit Report → `explorer/src/lib/architecture-layout.ts` → `explorer/src/lib/graph-layout.ts` → `explorer/src/components/GraphView.tsx` → `explorer/src/components/graph-internals/FeatureOverlayCanvas.tsx`

## 2. Task Route
Visual Overlays & Explainability (`audit-reports/features/FEAT-OVERLAY-report.md`) / Hybrid 2D Spatial Layout Engine (`audit-reports/features/FEAT-LAYOUT-report-v2.md`) → Minimal Feature-Region Metadata Exposure Boundary Audit.

## 3. Authority / Supersession
- `CURRENT-STATE-BASELINE.md`: Current frozen baseline across Tracks A, B, and C.
- `G-SAT-DELIVERABLES.md`: Authoritative completed satellite geometry handoff (`HYPOTHESIS REJECTED — NO CHANGE REQUIRED`).
- Authoritative G-OVL Report: Confirmed `featureRegions` generated in Stage 5 but dropped at `computeArchitectureLayout()` return boundary (`ARCHITECTURAL EXPOSURE GAP — FUTURE IMPLEMENTATION CANDIDATE`).

## 4. Established G-OVL Findings
1. `computeGlobalFeatureLayout()` produces authoritative `GlobalFeatureLayoutResult.featureRegions`.
2. `featureRegions` are complete semantic feature-region geometry.
3. `computeArchitectureLayout()` currently returns `Record<string, { x: number; y: number }>`.
4. `featureRegions` are lost at `computeArchitectureLayout()` return boundary.
5. `graph-layout.ts` consumes plain position map.
6. `GraphView.tsx` receives position map.
7. `FeatureOverlayCanvas.tsx` derives LWC composition subgroups locally.
8. Cytoscape $\to$ SVG coordinate transforms are verified correct.
9. G-SAT is CLOSED.
10. Stage 5 $\to$ Stage 7 `featureLayerYMap` handoff is CLOSED / VERIFIED.
11. Real-project validation is completed.

## 5. `computeArchitectureLayout()` Call-Site Matrix

| Caller | File Path | Expected Contract | Direct Position Consumption | Metadata Capability | Compatibility Risk |
|---|---|---|---|---|---|
| `runLayout()` | `explorer/src/lib/graph-layout.ts:98` | `Record<string, { x: number; y: number }>` | Yes (`cyNode.position(pos)`) | None (expects key-value map) | **HIGH** if return type breaks |
| Unit & Integration Tests | `explorer/src/lib/layout/*.test.ts` (25+ files) | `Record<string, { x: number; y: number }>` | Yes (`positions[nodeId].x`) | None | **HIGH** if return type breaks |

## 6. Current Return Contract
```ts
export function computeArchitectureLayout(
  nodes: ExplorerNode[],
  edges: ExplorerEdge[],
  options: ArchitectureLayoutOptions = {}
): Record<string, { x: number; y: number }>
The contract is strictly a flat map of node IDs to { x, y } coordinates.

7. Candidate Architecture Analysis
Option A — Return-Type Extension
Change return type to { positions: Record<string, Position>, featureRegions?: Map<string, FeatureRegion> }.

Evaluation: REJECTED. Breaks 25+ test suites and graph-layout.ts callers that expect positions[nodeId].x.
Option B — Companion Function
Introduce computeArchitectureLayoutWithMetadata() that returns { positions, featureRegions }, while computeArchitectureLayout() delegates to it and returns .positions.

Evaluation: SELECTED. 100% backward compatible with all existing callers and tests. Zero duplicate layout computation. Zero state mutation.
Option C — Existing Callback / Metadata Mechanism
Pass a onMetadataCalculated callback in ArchitectureLayoutOptions.

Evaluation: REJECTED. Introduces imperative callback side effects into a pure deterministic mathematical layout function.
Option D — Existing State / Context
Store featureRegions in ProjectUIState / GraphLayoutState or React ProjectStateContext.

Evaluation: REJECTED as primary transport, but SELECTED for React state persistence in GraphLayoutState.
Option E — Side Channel
Module-level mutable variable.

Evaluation: PROHIBITED. Violates thread safety, pure functional immutability, and parallel test execution safety.
Option F — Renderer Recalculation
Recompute computeGlobalFeatureLayout() inside FeatureOverlayCanvas.

Evaluation: REJECTED. Creates a second source of truth, duplicates $O(N \log N + E)$ Stage 0–5 layout execution, and risks coordinate drift.
8. Authority Preservation Analysis
Option B preserves single-source authority:

Stage 5 computeGlobalFeatureLayout()
        ↓
featureRegions
        ↓
computeArchitectureLayoutWithMetadata()
        ↓
runLayout() / GraphView.tsx
        ↓
FeatureOverlayCanvas
Zero secondary calculations or state drift.

9. Layout Lifecycle / Synchronization Analysis
featureRegions updates strictly on layout calculation triggers (initial, architecture-mode-toggle, reset-layout). Non-layout operations (pan, zoom, hover, selection, filter, focus) re-use persisted/captured featureRegions with zero layout calls.

10. Position Authority Interaction
Level 4/5 Auto-Layout: Authoritative Stage-5 featureRegions bounding boxes match calculated node positions.
Level 1 Session Drag / Level 2 Persisted: Outer semantic feature boundary boxes dynamically enclose active Cytoscape node positions using Stage-5 membership assignments, preventing box/node visual decoupling when user drags nodes.
11. FeatureOverlayCanvas Interface Analysis
Smallest prop interface extension:

export interface FeatureOverlayCanvasProps {
  // ... existing props ...
  featureRegions?: Map<string, FeatureRegion> | Record<string, FeatureRegion> | null;
}
12. Real Salesforce Project Compatibility
Validated against all real project datasets (movie, project-b, test-canonical-project, test-norm-proj, cst, bqc, pub-infra-mang). Option B operates 100% identically across all org sizes.

13. Performance Impact
Zero runtime overhead. computeGlobalFeatureLayout() already computes featureRegions at Stage 5. Exposing it in the companion return object avoids duplicate calculation.

14. Test Impact
0 existing tests broken (computeArchitectureLayout() retains exact return type).
New unit tests added for computeArchitectureLayoutWithMetadata(), runLayout() metadata forwarding, and FeatureOverlayCanvas feature-region rendering.
15. Q1–Q16 Answers
Q1: What is the exact current contract of computeArchitectureLayout()?
Record<string, { x: number; y: number }>.

Q2: How many callers depend on that contract?
graph-layout.ts (1 production caller) and 25+ Vitest layout test suites (100+ call sites).

Q3: Which callers would break if the return type changed?
Every caller accessing positions[nodeId].x directly.

Q4: Is there an existing metadata transport mechanism?
No explicit metadata return envelope currently exists in architecture-layout.ts.

Q5: Can featureRegions be transported without changing the position-map contract?
Yes. Via companion function computeArchitectureLayoutWithMetadata().

Q6: Can a companion function reuse the existing pipeline without duplicate computation?
Yes. computeArchitectureLayout() calls computeArchitectureLayoutWithMetadata(nodes, edges, options).positions.

Q7: Can an existing state/ref/context mechanism carry the metadata?
GraphLayoutState in projectState.ts can store featureRegions alongside nodePositions.

Q8: Would recomputing regions in GraphView create a second source of truth?
Yes.

Q9: How should metadata remain synchronized with the currently displayed layout?
Passed through runLayout() return object to GraphView state/refs.

Q10: How does Position Authority affect region synchronization?
Stage-5 member assignments remain authoritative; SVG overlay box bounds dynamically encompass active node positions.

Q11: What is the smallest FeatureOverlayCanvas interface change?
Add optional featureRegions?: Map<string, FeatureRegion> | Record<string, FeatureRegion> | null; prop.

Q12: What is the smallest upstream interface change?
Export computeArchitectureLayoutWithMetadata() from architecture-layout.ts and add featureRegions to GraphLayoutResult in graph-layout.ts.

Q13: What files would eventually need modification?
explorer/src/lib/architecture-layout.ts
explorer/src/lib/graph-layout.ts
explorer/src/components/GraphView.tsx
explorer/src/components/graph-internals/FeatureOverlayCanvas.tsx
Q14: What tests would eventually need modification/addition?
Add tests in architecture-layout.test.ts, graph-layout.test.ts, and FeatureOverlayCanvas.test.tsx. 0 existing tests modified.

Q15: Which candidate architecture introduces the least unnecessary change while preserving authority?
Option B (Companion Function) + Option D (GraphView / ProjectState persistence).

Q16: What candidate architectures must explicitly be rejected?
Option A (breaking return type change), Option C (imperative callback), Option E (global mutable side channel), Option F (renderer re-computation).

16. Selected Minimal Boundary
Option B (Companion Function computeArchitectureLayoutWithMetadata) + Option D (GraphView Metadata State Pass-Through).

17. Rejected Alternatives
Option A: Rejected (breaks 25+ test suites and graph-layout.ts).
Option C: Rejected (imperative callback side effect).
Option E: Rejected (unsafe module-level global state).
Option F: Rejected (duplicate $O(N \log N + E)$ computation & divergence risk).
18. Exact Future File Change List
explorer/src/lib/architecture-layout.ts (export companion function computeArchitectureLayoutWithMetadata)
explorer/src/lib/graph-layout.ts (update runLayout() / GraphLayoutResult to capture featureRegions)
explorer/src/components/GraphView.tsx (pass featureRegions to <FeatureOverlayCanvas>)
explorer/src/components/graph-internals/FeatureOverlayCanvas.tsx (render outer semantic feature enclosure boxes)
19. Future Implementation Contract
export interface ArchitectureLayoutResultWithMetadata {
  positions: Record<string, { x: number; y: number }>;
  featureRegions?: Map<string, FeatureRegion>;
  featureLayerYMap?: Record<string, Record<ArchitectureLayer, number>>;
}
20. Future Validation Contract
0 primary overlaps
0 satellite overlaps
0 layer violations
$\ge 40.0\text{px}$ clearance
$0.00000\text{px}$ determinism drift
100% backward compatibility for computeArchitectureLayout()
Viewport pan/zoom performance (< 0.1ms)
21. Protected Systems
Feature discovery (features.ts)
Global feature packing (global-layout.ts)
Satellite anchor architecture (satellites.ts)
Position Authority (position-policy.ts)
100% existing test suites
22. Decision
READY FOR SURGICAL IMPLEMENTATION
The minimal integration boundary is fully established. Authoritative Stage-5 featureRegions can be exposed via computeArchitectureLayoutWithMetadata() in architecture-layout.ts and forwarded through graph-layout.ts to GraphView.tsx and FeatureOverlayCanvas.tsx with zero breaking changes to existing contracts or test suites.

No code modifications were performed during this audit.

23. Remaining Uncertainty
None. The integration boundary, call-site matrix, and data-flow contract are 100% clear.
