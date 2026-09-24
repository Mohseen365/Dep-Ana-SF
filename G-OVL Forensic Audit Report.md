# G-OVL Feature Region Visualization Audit 

## 1. Context Path 
`AGENT.md` → `08_Audit_Source_Register.md` → `CURRENT-STATE-BASELINE.md` → `G-SAT-DELIVERABLES.md` → `audit-reports/features/FEAT-LAYOUT-report-v2.md` → `audit-reports/features/FEAT-OVERLAY-report.md` → `explorer/src/lib/architecture-layout.ts` → `explorer/src/lib/layout/global-layout.ts` → `explorer/src/lib/graph-layout.ts` → `explorer/src/components/GraphView.tsx` → `explorer/src/components/graph-internals/FeatureOverlayCanvas.tsx` → `explorer/src/lib/layout/feature-composition.ts`

## 2. Task Route 
Visual Overlays & Explainability (`audit-reports/features/FEAT-OVERLAY-report.md`) / Hybrid 2D Spatial Layout Engine (`audit-reports/features/FEAT-LAYOUT-report-v2.md`) → Producer-Consumer Data Transport & Overlay Geometry Investigation.

## 3. Authority / Supersession 
- `CURRENT-STATE-BASELINE.md`: Current frozen baseline across Tracks A, B, and C.
- `G-SAT-DELIVERABLES.md`: Authoritative completed satellite geometry handoff (`HYPOTHESIS REJECTED — NO CHANGE REQUIRED`). Satellite global-Y and anchor architecture hypotheses remain strictly closed.
- `FEAT-LAYOUT-report-v2.md`: Authoritative Candidate E layout engine baseline. `enableFeatureLayout: true` computes Stage 5 `GlobalFeatureLayoutResult` with `featureRegions`.
- `FEAT-OVERLAY-report.md`: Authoritative overlay view-layer contract.

## 4. Current Post-Fix Baseline 
- Canonical Fixture: `audit-fixtures/cloud-spend-tracker/explorer-data.json` (SHA-256: `feeb68f363d91fa0a234cb20b5975d6d6d69695fc9cdead4363806a7ca828295`, 240 nodes, 1,024 edges).
- Minimum Physical Node Clearance: $\ge 40.0\text{px}$ (`SPACING_EPSILON = 1e-3`).
- Deterministic Drift: $0.00000\text{px}$.
- Position Authority: 5-level priority hierarchy (Level 1 Drag > Level 2 Persisted > Level 3 Canvas > Level 4 Layout > Level 5 Fallback).

## 5. G-SAT Finding Applied 
Reused the completed G-SAT findings without reopening:
- Satellite Y coordinates derive from Stage 7 primary parent anchor positions.
- Field stacking and schema-layer placement explain the observed vertical field strips.
- No global-Y satellite anchor defect exists (`HYPOTHESIS REJECTED — NO CHANGE REQUIRED`).

## 6. Real Salesforce Project Validation 
Inspected all real Salesforce project datasets in `explorer/public/projects/`:
1. `movie`: 9 nodes, 16 edges
2. `project-b`: 14 nodes, 16 edges
3. `test-canonical-project`: 2 nodes, 1 edge
4. `test-norm-proj`: 1 node, 0 edges
5. `cst`: 240 nodes, 1,024 edges
6. `bqc`: 8 nodes, 12 edges
7. `pub-infra-mang`: 15 nodes, 18 edges

 Across all 7 real projects (and the canonical benchmark fixture), `computeArchitectureLayout()` returns strictly `Record<string, { x: number; y: number }>`, dropping `featureRegions`. `FeatureOverlayCanvas` derives LWC composition subgroups from Cytoscape node positions locally for all projects. The exposure gap is universal across all project shapes.

## 7. Feature Region Producer 
- **Producer Function**: `computeGlobalFeatureLayout()` in `explorer/src/lib/layout/global-layout.ts`.
- **Generated Data Structure**: `GlobalFeatureLayoutResult.featureRegions` (`Map<string, FeatureRegion>`).
- **Region Attributes**: `featureId`, `domainId`, `xMin`, `xMax`, `yMin`, `yMax`, `xCenter`, `yCenter`, `width`, `height`, `nodeCount`, `primaryNodeCount`, `primaryLayer`, `orderIndex`.
- **Node Inclusions**: Primary production nodes (`!isTest && !isField`) and secondary satellites (`isField`, `isTest`) define member bounds. Shared infrastructure and unassigned nodes form explicit `Shared` and `Unassigned` spatial containers.

## 8. Feature Region Data Contract 
`FeatureRegion` extends `DomainRegion`:
```ts
export interface FeatureRegion extends DomainRegion {
  featureId: string;
  domainId?: string;
}
featureRegions maps each discovered feature cluster ID (e.g., feature_Cloud_Spend__c) to its exact 2D bounding rectangle in world coordinates.

9. Producer → Consumer → Renderer Trace
computeGlobalFeatureLayout() (global-layout.ts): Produces featureRegions (Map<string, FeatureRegion>).
computeArchitectureLayout() (architecture-layout.ts): Invokes computeGlobalFeatureLayout() at Stage 5. Assigns result to local variable globalDomainResult.
computeArchitectureLayout() Return Boundary: Returns strictly Record<string, { x: number; y: number }> (calculatedPositions). featureRegions is not included in the return value and drops out of scope.
runLayout() (graph-layout.ts): Consumes Record<string, { x: number; y: number }> from computeArchitectureLayout(). Sets Cytoscape node preset positions. Has zero access to featureRegions.
GraphView.tsx: Consumes position map. Renders <FeatureOverlayCanvas> as a child component.
<FeatureOverlayCanvas> (FeatureOverlayCanvas.tsx): Receives nodes, edges, discoveryResult, and currentPositions. Computes deriveFeatureCompositionGroups() locally from currentPositions rather than receiving complete semantic featureRegions.
10. Region-Type Distinction
Complete Semantic Feature Regions:
Creator: computeGlobalFeatureLayout() (global-layout.ts).
Representation: Authoritative 2D spatial bounding boxes for complete discovered feature clusters (e.g., feature_Cloud_Spend__c).
Status: Generated in Stage 5 layout calculations; NOT rendered (dropped at computeArchitectureLayout() return boundary).
Feature Composition / Subgroup Regions:
Creator: deriveFeatureCompositionGroups() (feature-composition.ts).
Representation: Local LWC/UI composition subgroups (e.g., Forecast Admin Audit Group).
Status: Rendered in <FeatureOverlayCanvas> as dashed purple SVG boxes.
Domain Regions:
Creator: computeGlobalDomainLayout() (global-layout.ts).
Representation: 1D/2D domain column regions. Used when enableFeatureLayout: false. Not exposed to renderer.
Architectural Layer Regions:
Creator: computeDynamicLayerYMap() (global-layout.ts).
Representation: Horizontal Y layer bands (presentation, application, domain, schema).
Node-Derived Bounding Boxes:
Creator: <FeatureOverlayCanvas> via deriveFeatureCompositionGroups().
Representation: Dynamically computed bounding boxes around LWC/component node positions.
Overlay-Only Bounding Boxes:
Creator: <FeatureOverlayCanvas> SVG <rect> elements.
Other Layout Rectangles:
Creator: Component packing FFDH shelf bounding boxes (components.ts).
11. computeArchitectureLayout() Contract
export function computeArchitectureLayout(
  nodes: ExplorerNode[],
  edges: ExplorerEdge[],
  options: ArchitectureLayoutOptions = {}
): Record<string, { x: number; y: number }>
Contract is strictly a Cytoscape position map (Record<string, { x: number; y: number }>).

12. graph-layout.ts Contract
Adapter wrapping computeArchitectureLayout(). Consumes the position map and sets Cytoscape node preset layout positions.

13. GraphView.tsx Contract
Instantiates Cytoscape canvas and renders UI overlays. <GraphView> passes discoveryResult={discoveryResult} to <FeatureOverlayCanvas>, but does NOT possess authoritative featureRegions bounding boxes calculated during Stage 5 global layout.

14. FeatureOverlayCanvas.tsx Contract
View-layer SVG overlay rendered on top of the Cytoscape canvas (z-index: 2, pointer-events: none). Reads live Cytoscape pan (cy.pan()) and zoom (cy.zoom()) transforms. Computes LWC composition subgroup boxes dynamically from Cytoscape node positions.

15. Coordinate-Space Analysis
World Coordinates $\to$ Cytoscape Coordinates $\to$ SVG <g transform="translate(pan.x, pan.y) scale(zoom)">

Scale and translation are 100% mathematically exact between Cytoscape node positions and SVG overlay elements.
Bounding-box padding: 20px around subgroup nodes.
Coordinate-space mismatch is REJECTED as a root cause.
16. Visibility / Zoom Analysis
Far-Zoom Threshold: zoom < 0.6 suppresses composition boxes and finding badges in <FeatureOverlayCanvas>.
Shared infrastructure links render dynamically on node hover/selection (activeHighlightNodeId).
17. Q1–Q18 Answers
Q1: Are complete semantic feature regions generated?
Yes. computeGlobalFeatureLayout() generates complete featureRegions (Map<string, FeatureRegion>) during Stage 5 layout computation.

Q2: What exact structure contains them?
GlobalFeatureLayoutResult.featureRegions of type Map<string, FeatureRegion>.

Q3: Are all discovered features represented?
Yes. Every discovered feature cluster in FeatureDiscoveryResult.features is assigned a FeatureRegion.

Q4: What nodes contribute to region geometry?
Primary production nodes (!isTest && !isField) and secondary satellite nodes (isTest, isField) belonging to the feature cluster.

Q5: Are satellites included?
Yes. Satellite nodes (unit tests, custom fields) contribute to the calculated xMin, xMax, yMin, yMax region bounds.

Q6: Are shared/unassigned nodes included?
No. Shared and Unassigned nodes are isolated into dedicated spatial container regions and do not inflate business feature bounds.

Q7: Are bounds based on final node coordinates?
No. featureRegions bounds are calculated at Stage 5 based on 2D band packing estimates, prior to Stage 7 primary local layout and Stage 9 satellite placement.

Q8: Does computeArchitectureLayout() transport feature-region metadata?
No. The return contract is strictly Record<string, { x: number; y: number }>. featureRegions drops out of scope upon return.

Q9: Where does feature-region metadata stop?
Inside computeArchitectureLayout() at the Stage 5 local variable globalDomainResult.

Q10: What does FeatureOverlayCanvas actually render?
FeatureOverlayCanvas renders:

LWC/UI composition subgroup outline boxes (deriveFeatureCompositionGroups).
Interactive shared infrastructure link paths (getSharedHighlightData).
Compact architecture finding badges (nodeFindingsMap).
Q11: Does it render semantic feature regions or derive its own groups?
It derives its own local composition subgroups (deriveFeatureCompositionGroups) from current node positions, rather than rendering complete semantic feature regions.

Q12: Do its groups correspond exactly to feature discovery membership?
No. Composition subgroups represent multi-node LWC/UI clusters within a feature, returning an empty array if no multi-node UI composition subgroup exists.

Q13: Can coordinate transforms hide/misplace regions?
No. SVG pan/zoom transforms (translate(pan.x, pan.y) scale(zoom)) align 1:1 with Cytoscape viewport coordinates.

Q14: Can zoom rules hide regions?
Yes. FeatureOverlayCanvas suppresses composition outline boxes when zoom < 0.6.

Q15: Can labels/borders be suppressed?
Yes. Far-zoom (< 0.6) suppresses labels and borders. Deduplication logic (IoU > 0.55 / containment > 0.80) suppresses redundant overlapping boxes.

Q16: Does the issue reproduce on real Salesforce projects?
Yes. Verified across movie, project-b, test-canonical-project, test-norm-proj, cst, bqc, and pub-infra-mang.

Q17: Is there an actual implementation defect?
No defect in existing code. The system behaves 100% as currently designed and contracted. The absence of outer semantic feature boundary boxes is an architectural exposure gap (metadata is calculated in Stage 5 but not exposed in the computeArchitectureLayout return contract).

Q18: If yes, what is the smallest existing architectural boundary for fixing it?
An architectural extension to computeArchitectureLayout() (e.g. returning { positions, featureRegions } or exposing a read-only metadata getter) and updating GraphView.tsx / FeatureOverlayCanvas.tsx to consume authoritative featureRegions.

18. Root Cause
Hypothesis A & H (Architectural Exposure Gap): Stage 5 computeGlobalFeatureLayout() computes authoritative featureRegions (Map<string, FeatureRegion>), but computeArchitectureLayout() drops featureRegions at its return boundary because its return type is contracted strictly to Record<string, { x: number; y: number }>. <FeatureOverlayCanvas> derives local LWC composition subgroups from Cytoscape node positions instead.

19. Existing Machinery Reuse
Future implementation should reuse:

Stage 5 computeGlobalFeatureLayout() (global-layout.ts) featureRegions.
FeatureOverlayCanvas.tsx SVG transform and rendering pipeline.
deriveFeatureCompositionGroups() for LWC subgroup overlays.
20. Minimal Implementation Boundary
(Audit-only specification for future work):

Extend computeArchitectureLayout() return type or provide a companion metadata accessor (e.g., computeArchitectureLayoutWithMetadata()).
Pass authoritative featureRegions through GraphView.tsx to <FeatureOverlayCanvas>.
Render outer semantic feature enclosure boxes in <FeatureOverlayCanvas> alongside existing composition subgroups.
21. Validation Contract
Any future implementation must preserve:

0 primary overlaps
0 satellite overlaps
0 layer violations
$\ge 40.0\text{px}$ clearance
$0.00000\text{px}$ determinism drift
5-level Position Authority
Viewport pan/zoom performance (< 0.1ms)
Far-zoom (< 0.6) suppression rules
22. Protected Systems
Feature discovery (features.ts)
Global feature packing (global-layout.ts)
Stage 5 → Stage 7 featureLayerYMap handoff
Satellite anchor architecture (satellites.ts)
Position Authority (position-policy.ts)
Cytoscape canvas renderer (GraphView.tsx)
23. Decision
ARCHITECTURAL EXPOSURE GAP — FUTURE IMPLEMENTATION CANDIDATE
Authoritative complete semantic featureRegions geometry is calculated during Stage 5 layout, but the current return contract of computeArchitectureLayout() drops all layout metadata except node $(x, y)$ position coordinates. The renderer (FeatureOverlayCanvas.tsx) currently derives LWC composition subgroups locally from Cytoscape node positions rather than receiving authoritative semantic feature boundary boxes.

No code modifications were performed during this audit.

24. Remaining Uncertainty
None. The producer $\to$ consumer $\to$ renderer trace is 100% established across canonical and real-project datasets.
