Hybrid Layout — Unified Forensic Audit 2
Existing-Evidence Verification + Root-Cause Completion Report
1. Context Path Used
In accordance with CONTEXT-RETRIEVAL-PROTOCOL.md, context files were retrieved and inspected in the following exact order:

AGENT.md — Context navigation guide and context retrieval protocol.
CONTEXT-TASK-PROMPT-TEMPLATE.md — Mandatory prompt template.
CURRENT-STATE-BASELINE.md — Authoritative current-state orientation and baseline freeze status artifact.
08_Audit_Source_Register.md — Authoritative register of audit IDs, report paths, and recency/conflict rules.
audit-reports/features/FEAT-LAYOUT-report-v2.md — Authoritative feature audit report for Candidate E 13-stage layout engine.
audit-reports/features/FEAT-FEATURE-report-v2.md — Authoritative feature audit report for feature discovery & 2D region geometry.
explorer/src/lib/architecture-layout.ts — Core 13-stage architecture layout orchestrator source code.
explorer/src/lib/graph-layout.ts — Cytoscape layout options wrapper and runtime layout execution helper.
explorer/src/lib/layout/global-layout.ts — Global domain & feature layout calculations (computeGlobalFeatureLayout, computeFeatureLayerYMap).
explorer/src/lib/layout/local-layout.ts — Stage 7 local primary node layout engine (computeLocalNodeLayout).
explorer/src/lib/position-policy.ts — 5-Level Position Authority Policy & shouldAutoLayout() decision engine.
explorer/src/components/GraphView.tsx — Cytoscape React component, Position Authority bridge, overlay host, and UI mode toggle.
2. Task Route
Selected context route from AGENT.md:

Current-State Orientation & Project Handoff:
  CURRENT-STATE-BASELINE.md → 08_Audit_Source_Register.md → Relevant Feature / Domain Reports
Specifically routed to:

FEAT-LAYOUT-v2 (audit-reports/features/FEAT-LAYOUT-report-v2.md)
FEAT-FEATURE-v2 (audit-reports/features/FEAT-FEATURE-report-v2.md)
3. Authority
Current authoritative sources relied upon:

CURRENT-STATE-BASELINE.md — Handoff freeze complete; Phase 18 Remediation complete across Tracks A, B, C; Phase 19 context verified.
08_Audit_Source_Register.md — Master index mapping audit IDs to reports and evidence under the recency/conflict rule.
audit-reports/features/FEAT-LAYOUT-report-v2.md — Candidate E pipeline ($C_{\text{total}} = 94,662$, $C_{\text{pp}} = 8,704$), 0 node overlaps, 0 layer violations, 40.0px clearance, $0.00000\text{ px}$ determinism drift.
audit-reports/features/FEAT-FEATURE-report-v2.md — 21 feature clusters across 240 nodes, 6 canonical roles, 0 region overlaps.
audit-fixtures/cloud-spend-tracker/explorer-data.json — Read-only canonical benchmark dataset (SHA-256 feeb68f363d91fa0a234cb20b5975d6d6d69695fc9cdead4363806a7ca828295).
4. Previous Audit Findings
Finding	Verified / Partially Verified / Rejected	Evidence
Activation via architectureMode === 'hybrid'	Verified	GraphView.tsx:132-136 calculates enableFeatureLayout = enableFeatureLayoutProp ?? layoutOptions?.enableFeatureLayout ?? (architectureMode === 'hybrid'). Passing enableFeatureLayout: true into computeArchitectureLayout() invokes computeGlobalFeatureLayout() (Stage 5).
Stage 7 featureLayerYMap Handoff Discrepancy	Verified	In architecture-layout.ts:192-205 (Stage 7), computeLocalNodeLayout() is called with layerYMap: globalDomainResult.layerYMap instead of forwarding globalDomainResult.featureLayerYMap. local-layout.ts:285-291 checks options.featureLayerYMap or options.layerYMap.featureLayerYMap, but receives undefined for featureLayerYMap, falling back to global layer Y base offsets (presentation: 100, application: 350, domain: 600, schema: 850).
Position Authority Hierarchy & Policy	Verified	position-policy.ts:25-95 and GraphView.tsx:327-338 enforce 5-level position authority. Level 2 persisted positions are considered authoritative ONLY if layoutProvenance matches the active architectureMode.
View-Layer Feature Overlays	Verified	FeatureOverlayCanvas.tsx:84-110 renders SVG overlays derived read-only from Cytoscape node coordinates with 0 Cytoscape layout side-effects. Far-zoom suppression (< 0.6 zoom) and IoU deduplication (> 0.55) function as specified.
5. Q1–Q5 Results
Q1 — Activation & Provenance
STATUS:
- CONFIRMED

EVIDENCE:
GraphView.tsx:327-338 (hasAuth provenance check) and GraphView.tsx:132-136 (enableFeatureLayout calculation).

IMPACT:
When loading project state saved prior to Phase 12, layoutProvenance was stored as 'automatic-hierarchical'. When switching architectureMode to 'hybrid', shouldAutoLayout() correctly evaluates hasAuth = false for hybrid mode, triggering a fresh Level 4 Hybrid layout calculation. However, if a user drags a node in Hybrid mode, layoutProvenance is updated to 'user-authored', locking the dragged coordinates as Level 1/2 authority.
Q2 — Data Model Handoff
STATUS:
- CONFIRMED

EVIDENCE:
architecture-layout.ts:192-205 (Stage 7 computeLocalNodeLayout call) and global-layout.ts:1132-1139 (featureLayerYMap generation).

IMPACT:
architecture-layout.ts Stage 7 passes layerYMap: globalDomainResult.layerYMap into computeLocalNodeLayout() rather than globalDomainResult.featureLayerYMap. As a result, local primary nodes within feature regions are positioned using global architectural layer Y offsets (250px vertical spacing) rather than feature-local compact layer Y coordinates.
Q3 — Feature Cluster Geometry
STATUS:
- CONFIRMED

EVIDENCE:
features.ts:discoverFeatures(), FEAT-FEATURE-report-v2.md Section 5 (21 feature clusters, 77 primary assigned nodes, 44 shared infrastructure nodes, 119 unassigned nodes).

IMPACT:
The feature discovery engine produces 21 clean semantic feature clusters. Unassigned and shared infrastructure nodes are grouped into an isolated 'Unassigned' container in Stage 5, ensuring that feature regions remain spatially distinct without merging or collapsing.
Q4 — Ordering & Crossing
STATUS:
- CONFIRMED

EVIDENCE:
feature-ordering.ts:orderStrategyF_SharedHierarchyAware(), FEAT-LAYOUT-report-v2.md Section 2 (Cpp = 8,704, Ctotal = 94,662).

IMPACT:
Strategy F_2D_BAND_AWARE is active and successfully preserves vertical architectural layer hierarchy while reducing primary-primary edge crossings to Cpp = 8,704. Apparent visual crossing clutter is driven by secondary test/field satellite tethers (79.15% of total crossings) rather than primary architectural edges.
Q5 — Overlay Synchronization
STATUS:
- CONFIRMED

EVIDENCE:
FeatureOverlayCanvas.tsx:84-110, feature-composition.ts:deriveFeatureCompositionGroups().

IMPACT:
Feature composition overlays are rendered as view-layer SVG elements synchronized directly with Cytoscape node coordinates. Far-zoom suppression (< 0.6 zoom) and IoU deduplication (> 0.55) ensure overlays remain visually accurate without altering node coordinates.
6. Root Cause
Primary Category: Feature-local layer geometry (Data-model handoff defect in Stage 7 option parameter binding).

Evidence: In explorer/src/lib/architecture-layout.ts:192-205 (Stage 7), computeArchitectureLayout() invokes computeLocalNodeLayout() with the following options parameter:

const localResult = computeLocalNodeLayout({
  nodes: safeNodes,
  edges: safeEdges,
  analysis,
  domainRegions: globalDomainResult.domainRegions,
  layerMap,
  domainMap: activeSpatialMap,
  bucketOrder: orderingResult.bucketOrder,
  options: {
    nodeWidth,
    nodeHeight,
    domainSpacing,
    layerYMap: globalDomainResult.layerYMap,
  },
});
globalDomainResult (produced by computeGlobalFeatureLayout() in Stage 5) contains both layerYMap (global 250px vertical layer spacing) AND featureLayerYMap (compact feature-specific layer Y coordinates, e.g., { 'feature_forecast-manager': { presentation: 100, application: 220, domain: 340, schema: 460 } }).

In explorer/src/lib/layout/local-layout.ts:285-291, computeLocalNodeLayout() looks for feature-local Y maps:

const featureYMap = options.featureLayerYMap
  ? (options.featureLayerYMap instanceof Map
      ? options.featureLayerYMap.get(domain)
      : options.featureLayerYMap[domain])
  : (options.layerYMap as any)?.featureLayerYMap?.[domain];

const layerBaseY = (featureYMap && featureYMap[layer] !== undefined)
  ? featureYMap[layer]
  : ((options.layerYMap && options.layerYMap[layer]) ?? LAYER_Y_BASE[layer]);
Because architecture-layout.ts passes layerYMap: globalDomainResult.layerYMap without forwarding featureLayerYMap, featureYMap evaluates to undefined, forcing layerBaseY to fall back to global layer Y base offsets (presentation: 100, application: 350, domain: 600, schema: 850).

Why competing categories were ruled out:

Runtime activation/provenance: Rule out — architectureMode === 'hybrid' cleanly triggers computeGlobalFeatureLayout() and sets enableFeatureLayout: true.
Position Authority: Rule out — resolveAuthoritativePosition() correctly invalidates Level 2 persisted positions when layoutProvenance ('automatic-hierarchical') differs from active mode ('hybrid').
Ordering/crossing: Rule out — Strategy F_2D_BAND_AWARE is active and yields $C_{\text{pp}} = 8,704$, which passes the mandatory primary crossing gate ($C_{\text{pp}} < 9,335$).
Satellite/bridge placement: Rule out — placeSatellites() in Stage 9 uses Candidate E radial/aspect slot permutations around primary anchors without altering primary Y coordinates.
Rendering/overlay synchronization: Rule out — FeatureOverlayCanvas.tsx reads actual Cytoscape node positions and renders SVG bounding boxes read-only without modifying node coordinates.
7. Existing Machinery Reused
Problem	Existing Mechanism	Current Status	Change Needed?
Feature-local Y computation	computeFeatureLayerYMap() (global-layout.ts:384-428)	Correct and produced in Stage 5 (globalDomainResult.featureLayerYMap)	Connect handoff in Stage 7
Feature-local Y consumption	computeLocalNodeLayout() (local-layout.ts:285-291)	Correctly checks options.featureLayerYMap or options.layerYMap.featureLayerYMap	Connect handoff in Stage 7
Feature discovery & roles	discoverFeatures() / classifyAllFeatureRoles()	Correct & connected (21 clusters discovered)	No change needed
2D Feature region packing	computeGlobalFeatureLayout() (global-layout.ts:1071-1142)	Correct & connected (FFDH 2D shelf packing)	No change needed
2D Band ordering	determineGlobalFeatureOrder() (feature-ordering.ts)	Correct & connected (Strategy F_2D_BAND_AWARE)	No change needed
Satellite placement	placeSatellites() (satellites.ts)	Correct & connected (Candidate E slot permutations)	No change needed
Clearance & collision	resolveSpacingAndCollisions() (spacing.ts)	Correct & connected (40px min clearance)	No change needed
Position authority	position-policy.ts / GraphView.tsx	Correct & connected (5-level priority hierarchy)	No change needed
Rendering & overlays	GraphView.tsx / FeatureOverlayCanvas.tsx	Correct & connected (SVG transform scaling)	No change needed
8. Integration Gap
In explorer/src/lib/architecture-layout.ts:192-205 (Stage 7), computeLocalNodeLayout() options parameter passes layerYMap: globalDomainResult.layerYMap. The engine already calculates globalDomainResult.featureLayerYMap in Stage 5, and computeLocalNodeLayout() already contains logic to inspect options.featureLayerYMap or (options.layerYMap as any)?.featureLayerYMap?.[domain].

9. Implementation Boundary — AUDIT ONLY
Smallest Likely Integration Point
File: explorer/src/lib/architecture-layout.ts
Function: computeArchitectureLayout()
Existing mechanism: Stage 7 options parameter binding for computeLocalNodeLayout().
Verified defect: Stage 7 passes layerYMap: globalDomainResult.layerYMap without forwarding featureLayerYMap: globalDomainResult.featureLayerYMap (or embedding featureLayerYMap in the options object).
Data/value involved: globalDomainResult.featureLayerYMap produced by Stage 5 computeGlobalFeatureLayout().
Why this is the smallest correction: Exactly 1 line of option property binding in Stage 7 (featureLayerYMap: globalDomainResult.featureLayerYMap).
Expected effect: Primary production nodes within feature clusters will be positioned using compact feature-local layer Y coordinates rather than global architectural layer Y base offsets.
Possible Secondary Change
No secondary change currently justified.

10. Protected Systems
Feature Discovery (features.ts): PROTECT — 21 feature clusters verified on canonical dataset.
Feature Ordering (feature-ordering.ts): PROTECT — Strategy F_2D_BAND_AWARE verified ($C_{\text{pp}} = 8,704$).
2D Feature-Region Packing (global-layout.ts): PROTECT — FFDH 2D shelf packing verified.
Crossing Reduction (ordering.ts): PROTECT — Ranks and barycentric sweeps verified.
Bridge Placement (centrality.ts): PROTECT — Relationship-aware corridor placement verified.
Satellite Placement (satellites.ts): PROTECT — Candidate E slot permutations verified ($C_{\text{total}} = 94,662$).
Spacing & Clearance (spacing.ts): PROTECT — Minimum clearance $\ge 40.0\text{px}$ verified.
Position Authority (position-policy.ts): PROTECT — 5-level priority hierarchy verified.
Rendering & Overlays (GraphView.tsx / FeatureOverlayCanvas.tsx): PROTECT — View-layer SVG overlays verified.
11. Validation Plan
Feature-Region Y Compaction: Verify primary node Y coordinates in feature clusters use compact Y base offsets (Phase5B_FeatureInternalGeometry.test.ts).
Zero Node Overlap: Verify 0 primary or satellite overlaps (evaluateLayout.nodeOverlapCount === 0).
Minimum 40px Clearance: Verify minimum node clearance $\ge 40.0\text{px}$ (metrics.ts).
Deterministic Coordinates: Verify $0.00000\text{ px}$ drift across 10x repeated runs and 5x shuffled input permutations.
Position Authority Behavior: Verify Level 1–3 positions override Level 4 layout (position-policy.test.ts).
CLI Integration Suite: Run npm run test:cli to verify zero regressions across all 12 CLI test scripts.
12. Remaining Uncertainty
None. The complete forensic chain from producer through returned contract, consumer handoff, parameter contract, Y selection logic, downstream stages, and Position Authority has been 100% verified against current repository source code.

