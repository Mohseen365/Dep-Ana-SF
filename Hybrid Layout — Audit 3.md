Hybrid Layout — Audit 3
Synthesis + Implementation Readiness
1. Context Path
In accordance with CONTEXT-RETRIEVAL-PROTOCOL.md, context files were retrieved and inspected in the following exact order:

AGENT.md — Context navigation guide and context retrieval protocol.
CONTEXT-TASK-PROMPT-TEMPLATE.md — Mandatory prompt template and Context Path structure guide.
CURRENT-STATE-BASELINE.md — Authoritative current-state orientation and baseline freeze status artifact.
08_Audit_Source_Register.md — Authoritative register of audit IDs, report paths, and recency/conflict rules.
audit-reports/features/FEAT-LAYOUT-report-v2.md — Authoritative feature audit report for Candidate E 13-stage layout engine.
audit-reports/features/FEAT-FEATURE-report-v2.md — Authoritative feature audit report for feature discovery & 2D region geometry.
explorer/src/lib/architecture-layout.ts — Core 13-stage architecture layout orchestrator source code.
explorer/src/lib/layout/global-layout.ts — Global domain & feature layout calculations (computeGlobalFeatureLayout, computeFeatureLayerYMap).
explorer/src/lib/layout/local-layout.ts — Stage 7 local primary node layout engine (computeLocalNodeLayout).
explorer/src/lib/position-policy.ts — 5-Level Position Authority Policy & shouldAutoLayout() decision engine.
explorer/src/components/GraphView.tsx — Cytoscape React component, Position Authority bridge, overlay host, and UI mode toggle.
2. Authority / Supersession
Authoritative Current Sources:

CURRENT-STATE-BASELINE.md: Baseline freeze complete; Phase 18 Remediation complete across Tracks A, B, C; Phase 19 context verified.
08_Audit_Source_Register.md: Master index mapping audit IDs to reports and evidence under the recency/conflict rule.
audit-reports/features/FEAT-LAYOUT-report-v2.md: Candidate E pipeline ($C_{\text{total}} = 94,662$, $C_{\text{pp}} = 8,704$), 0 primary overlaps, 0 satellite overlaps, 0 layer violations, 40.0px clearance, $0.00000\text{ px}$ determinism drift.
audit-reports/features/FEAT-FEATURE-report-v2.md: 21 feature clusters across 240 nodes, 6 canonical roles, 0 region overlaps.
audit-fixtures/cloud-spend-tracker/explorer-data.json: Read-only canonical benchmark dataset (SHA-256 feeb68f363d91fa0a234cb20b5975d6d6d69695fc9cdead4363806a7ca828295).
Superseded Claims Reconciled:

Historical $95,487$ total crossings claim in early reports is superseded by Candidate E ($94,662$).
Historical "Production Activation Blocked" narrative in early planning reports is superseded by Phase 12 Production Activation (HYBRID_LAYOUT_PHASE12_PRODUCTION_ACTIVATION_REPORT.md) and UI mode switching (architectureMode === 'hybrid').
3. Audit 1 Findings Used
Established task context routing and identified the existing 13-stage architecture layout pipeline (computeArchitectureLayout).
Mapped the actual source files and functions governing Hybrid activation (GraphView.tsx), global feature layout (global-layout.ts), feature ordering (feature-ordering.ts), local node layout (local-layout.ts), centrality/bridges (centrality.ts), satellites (satellites.ts), spacing (spacing.ts), Position Authority (position-policy.ts), and rendering overlays (FeatureOverlayCanvas.tsx).
Formulated the two-track investigation map (Track A — Layout/Data-Flow vs Track B — Runtime/Visual Truth) and established protected machinery boundaries.
4. Audit 2 Findings Verified
Audit 2 Finding	Verification Status	Exact Source Evidence
Activation via architectureMode === 'hybrid'	VERIFIED	GraphView.tsx:132-136 calculates enableFeatureLayout = enableFeatureLayoutProp ?? layoutOptions?.enableFeatureLayout ?? (architectureMode === 'hybrid'). Passing enableFeatureLayout: true into computeArchitectureLayout() invokes computeGlobalFeatureLayout() (Stage 5).
Stage 7 featureLayerYMap Handoff Discrepancy	VERIFIED	In architecture-layout.ts:192-205 (Stage 7), computeLocalNodeLayout() is called with options: { ..., layerYMap: globalDomainResult.layerYMap } without forwarding featureLayerYMap: globalDomainResult.featureLayerYMap. local-layout.ts:285-291 checks options.featureLayerYMap or options.layerYMap.featureLayerYMap, but receives undefined for featureLayerYMap, falling back to global layer Y base offsets (presentation: 100, application: 350, domain: 600, schema: 850).
Position Authority Hierarchy & Policy	VERIFIED	position-policy.ts:25-95 and GraphView.tsx:327-338 enforce 5-level position authority. Level 2 persisted positions are considered authoritative ONLY if layoutProvenance matches active architectureMode.
View-Layer SVG Overlays	VERIFIED	FeatureOverlayCanvas.tsx:84-110 renders SVG overlays derived read-only from Cytoscape node coordinates with 0 Cytoscape layout side-effects. Far-zoom suppression (< 0.6 zoom) and IoU deduplication (> 0.55) function as specified.
5. Full Producer → Consumer → Runtime Chain
Tracing the complete execution chain through source code:

Stage 5 Producer (computeGlobalFeatureLayout() in global-layout.ts:1071-1142):

INPUT: safeNodes, safeEdges, featureMap, featureGraph, featureRegions.
OUTPUT: Calculates feature-specific dynamic layer Y base offsets in computeFeatureLayerYMap() (global-layout.ts:384-428), e.g., { 'feature_forecast-manager': { presentation: 100, application: 220, domain: 340, schema: 460 } }. Returned inside globalDomainResult.featureLayerYMap.
PRESERVED / OVERWRITTEN: Preserved in globalDomainResult returned to computeArchitectureLayout().
Stage 7 Option Construction (computeArchitectureLayout() in architecture-layout.ts:192-205):

INPUT: globalDomainResult from Stage 5.
OUTPUT: Constructs options parameter for Stage 7 computeLocalNodeLayout():
options: {
  nodeWidth,
  nodeHeight,
  domainSpacing,
  layerYMap: globalDomainResult.layerYMap,
}
DEFECT / BREAKAGE: globalDomainResult.featureLayerYMap is NOT forwarded in options.
PRESERVED / OVERWRITTEN: DROPPED AT HANDOFF. featureLayerYMap is omitted from the option object passed to computeLocalNodeLayout().
Stage 7 Local Node Layout (computeLocalNodeLayout() in local-layout.ts:285-291):

INPUT: options object received from Stage 7 call in architecture-layout.ts.
OUTPUT: Evaluates featureYMap:
const featureYMap = options.featureLayerYMap
  ? (options.featureLayerYMap instanceof Map
      ? options.featureLayerYMap.get(domain)
      : options.featureLayerYMap[domain])
  : (options.layerYMap as any)?.featureLayerYMap?.[domain];

const layerBaseY = (featureYMap && featureYMap[layer] !== undefined)
  ? featureYMap[layer]
  : ((options.layerYMap && options.layerYMap[layer]) ?? LAYER_Y_BASE[layer]);
PRESERVED / OVERWRITTEN: Because featureLayerYMap was dropped at the Stage 7 call, featureYMap evaluates to undefined. layerBaseY falls back to globalDomainResult.layerYMap[layer] (100, 350, 600, 850). Local primary node Y coordinates are calculated using global architectural layer base offsets.
Stage 8 Hub & Bridge Spatial Refinement (architecture-layout.ts:211-237):

INPUT: basePositions produced by Stage 7.
OUTPUT: Positions bridge nodes in inter-layer or inter-domain corridors.
PRESERVED / OVERWRITTEN: Preserves relative Y coordinates of Stage 7 primary nodes. Overwrites only bridge node coordinates.
Stage 9 Secondary Satellite Placement (placeSatellites() in satellites.ts):

INPUT: basePositions from Stage 7/8.
OUTPUT: Positions test and field satellites in radial/aspect candidate slots around primary anchors.
PRESERVED / OVERWRITTEN: Primary anchor Y coordinates are 100% IMMUTABLE. Satellites are tethered to primary anchor coordinates.
Stage 10 Disconnected Component Packing (packComponentPositions() in components.ts):

INPUT: Bounding boxes of connected graph components.
OUTPUT: Applies 2D FFDH shelf packing translations to disconnected components.
PRESERVED / OVERWRITTEN: Translates component relative node coordinates as rigid bounding boxes. Preserves relative intra-component node Y coordinates.
Stage 11 Spatial Clearance & Collision Cleanup (resolveSpacingAndCollisions() in spacing.ts):

INPUT: Calculated positions from Stage 10.
OUTPUT: Nudges overlapping node bounding boxes to guarantee $\ge 40.0\text{px}$ minimum physical clearance.
PRESERVED / OVERWRITTEN: Preserves node positions if no overlaps exist.
Stage 12 Position Authority Restoration (architecture-layout.ts:322-327):

INPUT: calculatedPositions from Stage 11 and existingPositions (Level 1–3 authority).
OUTPUT: Overwrites calculatedPositions with Level 1–3 positions if present.
PRESERVED / OVERWRITTEN: If no saved positions exist or if layoutProvenance indicates fresh layout required (hasAuth = false), Level 4 calculated positions pass through 100% intact.
Renderer Consumption (GraphView.tsx:436-444):

INPUT: Stage 12 positions returned by computeArchitectureLayout().
OUTPUT: Applies positions directly to Cytoscape canvas nodes via node.position({ x, y }) inside cy.batch().
PRESERVED / OVERWRITTEN: Cytoscape holds and renders the positions directly on canvas.
6. Q1–Q7 Results
Q1. Is the Stage 7 featureLayerYMap handoff defect still verified against current source?

YES (VERIFIED). architecture-layout.ts:192-205 passes layerYMap: globalDomainResult.layerYMap without forwarding featureLayerYMap: globalDomainResult.featureLayerYMap.
Q2. Is adding the feature-local Y map at Stage 7 sufficient to activate the already-existing feature-local geometry path?

YES (VERIFIED). local-layout.ts:285-291 already contains the explicit inspection logic options.featureLayerYMap and options.layerYMap.featureLayerYMap. Forwarding featureLayerYMap immediately activates this code path without any changes to local-layout.ts.
Q3. Does any later stage overwrite or invalidate the resulting feature-local Y coordinates?

NO. Stage 8 (bridges), Stage 9 (satellites), Stage 10 (component packing), Stage 11 (clearance), and Stage 12 (position authority) preserve relative primary node Y coordinates.
Q4. Does Position Authority or GraphView subsequently replace the intended Level-4 Hybrid coordinates under the normal Hybrid activation path?

NO. GraphView.tsx:327-338 and position-policy.ts:25-95 evaluate hasAuth = false when switching architectureMode to 'hybrid' (because stored positions have layoutProvenance: 'automatic-hierarchical'), allowing Level 4 calculated Hybrid coordinates to pass through cleanly.
Q5. Does the proposed correction preserve the existing layout architecture and all protected mechanisms?

YES. The correction is a pure 1-line option forwarding parameter binding in Stage 7 (architecture-layout.ts). Zero layout algorithms, discovery rules, ordering passes, satellite placements, or position authority policies are modified.
Q6. Is there any independently required secondary code change?

NO. No secondary code change is required or justified.
Q7. What exact tests/validation should be run after implementation?

Targeted unit tests (Phase5B_FeatureInternalGeometry.test.ts, Phase6A2DGeometry.test.ts), CLI change gate suite (npm run test:cli), and canonical fixture verification (audit-fixtures/cloud-spend-tracker/explorer-data.json).
7. Expected Layout Contract
Concrete, evidence-backed expected behavior that implementation will produce:

Compact Feature-Local Vertical Layer Spacing: Local primary nodes in multi-layer feature clusters will be spaced vertically using compact feature-specific layer Y coordinates (calculated from actual feature row heights + 60px inter-layer gap) rather than global 250px architectural layer base offsets.
Feature Region Spatial Cohesion & Compactness: Feature cluster regions will shrink vertically to fit member nodes compactly, eliminating global vertical whitespace between sparse presentation/application tiers inside features.
Preservation of Architectural Layer Hierarchy: Vertical layer order (presentation < application < domain < schema) remains 100% strictly enforced with 0 layer flow violations.
Preservation of 2D Band Separation & Bounds: 2D multi-row feature band packing boundaries and minimum inter-feature region gaps ($\ge 40\text{px} \dots 80\text{px}$) remain fully preserved.
Node Clearance & Overlap Invariants: 0 primary node overlaps, 0 satellite node overlaps, and minimum physical node clearance $\ge 40.0\text{px}$ (with $1\text{e-}3$ epsilon) strictly maintained.
100% Deterministic Coordinates: $0.00000\text{ px}$ coordinate drift across 10x repeated executions and 5x shuffled input permutations.
Preservation of Primary Crossing Gate: Primary-primary edge crossings remain at $C_{\text{pp}} = 8,704$ ($\le 9,335$ gate passed) and total geometric crossings remain at $C_{\text{total}} = 94,662$.
8. Root Cause Confirmation
Primary Category: Feature-local layer geometry (Data-model handoff defect in Stage 7 option parameter binding).
Exact Cause: architecture-layout.ts:192-205 (Stage 7) passes options: { ..., layerYMap: globalDomainResult.layerYMap } to computeLocalNodeLayout(), omitting featureLayerYMap: globalDomainResult.featureLayerYMap produced by Stage 5 computeGlobalFeatureLayout().
Competing Categories Ruled Out:
Runtime activation/provenance: Ruled out — architectureMode === 'hybrid' passes enableFeatureLayout: true to computeArchitectureLayout().
Position Authority: Ruled out — resolveAuthoritativePosition() invalidates automatic-hierarchical positions upon mode switch to hybrid.
Ordering/crossing: Ruled out — Strategy F_2D_BAND_AWARE is active and yields $C_{\text{pp}} = 8,704 \le 9,335$.
Satellite placement: Ruled out — placeSatellites() tethering is immutable relative to primary anchors.
Rendering/overlays: Ruled out — FeatureOverlayCanvas.tsx reads Cytoscape node coordinates read-only.
9. Minimal Implementation Boundary
File: explorer/src/lib/architecture-layout.ts
Function: computeArchitectureLayout()
Stage: Stage 7 (Primary Production Local Layout)
Current Behavior: Stage 7 constructs options for computeLocalNodeLayout() passing layerYMap: globalDomainResult.layerYMap.
Verified Defect: Stage 7 omits forwarding featureLayerYMap: globalDomainResult.featureLayerYMap.
Existing Producer: Stage 5 computeGlobalFeatureLayout() (global-layout.ts:1071-1142) which computes and returns featureLayerYMap.
Existing Consumer: computeLocalNodeLayout() (local-layout.ts:285-291) which checks options.featureLayerYMap or options.layerYMap.featureLayerYMap.
Required Connection: Forward featureLayerYMap: globalDomainResult.featureLayerYMap in the Stage 7 options object passed to computeLocalNodeLayout().
Expected Effect: Local primary nodes within feature regions will consume compact feature-local layer Y coordinates calculated in Stage 5 rather than global 250px layer base offsets.
Why No Broader Change Is Required: The producer (global-layout.ts) already generates featureLayerYMap, and the consumer (local-layout.ts) already contains the complete feature Y selection logic. Stage 7 parameter forwarding is the single missing connection in the pipeline.
10. Protected Existing Machinery
Existing Mechanism	Status	Must Change?	Reason
Feature discovery (features.ts)	Correct & connected	NO	Discovers 21 feature clusters deterministically
Feature roles (feature-roles.ts)	Correct & connected	NO	Classifies 6 canonical feature roles
Feature region generation (global-layout.ts)	Correct & connected	NO	Computes 2D feature region bounding boxes
2D shelf/region packing (global-layout.ts)	Correct & connected	NO	Packs feature regions in 2D multi-row bands
Feature ordering (feature-ordering.ts)	Correct & connected	NO	Strategy F_2D_BAND_AWARE yields $C_{\text{pp}} = 8,704$
Crossing reduction (ordering.ts)	Correct & connected	NO	Ranks and barycentric sweeps preserved
Local node layout (local-layout.ts)	Correct & connected	NO	Intra-bucket 3-tier grid layout engine already accepts featureLayerYMap
Bridge placement (centrality.ts)	Correct & connected	NO	Relationship-aware corridor placement preserved
Satellite placement (satellites.ts)	Correct & connected	NO	Candidate E slot permutations preserved ($C_{\text{total}} = 94,662$)
Spacing / collision (spacing.ts)	Correct & connected	NO	Enforces minimum clearance $\ge 40.0\text{px}$
Position Authority (position-policy.ts)	Correct & connected	NO	Enforces 5-level priority hierarchy
GraphView Hybrid activation (GraphView.tsx)	Correct & connected	NO	Triggers enableFeatureLayout: true when architectureMode === 'hybrid'
Cytoscape rendering (GraphView.tsx)	Correct & connected	NO	Consumes Stage 12 positions directly via cy.batch()
FeatureOverlayCanvas (FeatureOverlayCanvas.tsx)	Correct & connected	NO	Renders view-layer SVG overlays read-only
11. Validation Contract
A. Targeted Regression Tests
Test File: explorer/src/test/Phase5B_FeatureInternalGeometry.test.ts
Tested Behavior: Proves primary nodes in feature clusters are positioned using feature-local dynamic layer Y base offsets (featureLayerYMap).
Expected Evidence: Local primary node Y coordinates within features match featureLayerYMap[featureId][layer].
B. Existing Layout Invariants
Test File: explorer/src/test/Phase6A2DGeometry.test.ts & explorer/src/test/Phase5DAcceptance.test.ts
Tested Invariants:
Primary Overlaps = 0
Satellite Overlaps = 0
Layer Flow Violations = 0
Minimum Clearance $\ge 40.0\text{px}$
Expected Evidence: evaluateLayout returns nodeOverlapCount === 0, layerViolationCount === 0, minNodeClearance >= 40.0.
C. Position Authority Regression
Test File: explorer/src/components/GraphView.positionAuthority.test.tsx
Tested Policy: Proves Level 1 user drag and Level 2 persisted positions take precedence over Level 4 layout.
Expected Evidence: All 21 Position Authority unit tests pass cleanly.
D. Determinism
Test File: explorer/src/test/Phase2_2_Ordering.test.ts & explorer/src/lib/layout/feature-ordering-phase5a.test.ts
Tested Behavior: 10x repeated execution and 5x shuffled input permutations.
Expected Evidence: Maximum coordinate delta across all 240 nodes = $0.00000\text{ px}$.
E. Existing CLI / Integration Suite
Command: npm run test:cli
Tested Scope: Root architecture snapshot, change gate, investigation eligibility, context minimizer, and decision context suites.
Expected Evidence: All CLI test suites pass with 0 failures.
F. Canonical Benchmark Dataset
Fixture File: audit-fixtures/cloud-spend-tracker/explorer-data.json (240 nodes, 1,024 edges, SHA-256 feeb68f363d91fa0a234cb20b5975d6d6d69695fc9cdead4363806a7ca828295).
12. Secondary Changes
No secondary change currently justified.

13. Implementation Readiness Decision
READY FOR SURGICAL IMPLEMENTATION

Implementation Contract
Exact File: explorer/src/lib/architecture-layout.ts
Exact Function: computeArchitectureLayout()
Exact Stage: Stage 7 (Primary Production Local Layout)
Exact Existing Value to Forward: featureLayerYMap: globalDomainResult.featureLayerYMap
Exact Consumer That Will Receive It: computeLocalNodeLayout() in explorer/src/lib/layout/local-layout.ts (lines 285–291)
Expected Runtime Behavior: Stage 7 local primary node layout will consume compact feature-local layer Y coordinates calculated in Stage 5 rather than falling back to global 250px architectural layer base offsets.
Protected Systems: Feature discovery, feature roles, 2D feature region packing, 2D band ordering, crossing reduction, bridge placement, satellite placement, clearance spacing, Position Authority, GraphView activation, Cytoscape rendering, and FeatureOverlayCanvas.
Required Validation: Run Phase5B_FeatureInternalGeometry.test.ts, Phase6A2DGeometry.test.ts, Phase5DAcceptance.test.ts, GraphView.positionAuthority.test.tsx, and npm run test:cli.
14. Remaining Uncertainty
None. The complete producer $\to$ consumer $\to$ downstream $\to$ runtime execution chain has been 100% traced and verified against active repository source code.
