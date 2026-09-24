Hybrid Layout — Context & Architecture Reconnaissance Report
1. Context Path Used
In accordance with CONTEXT-RETRIEVAL-PROTOCOL.md, the minimum-sufficient authoritative context files were retrieved and inspected in the following exact order:

AGENT.md — Initiated context retrieval and verified the context routing guide.
CONTEXT-TASK-PROMPT-TEMPLATE.md — Mandatory task prompt template and Context Path Used structure guide.
CURRENT-STATE-BASELINE.md — Authoritative current-state orientation and baseline freeze status artifact.
08_Audit_Source_Register.md — Authoritative register and index of audit IDs, report paths, and historical supersession rules.
audit-reports/features/FEAT-LAYOUT-report-v2.md — Authoritative feature audit report for the 13-stage Candidate E spatial layout engine.
audit-reports/features/FEAT-FEATURE-report-v2.md — Authoritative feature audit report for feature discovery & 2D region geometry.
explorer/src/lib/architecture-layout.ts — Core 13-stage architecture layout orchestrator source code.
explorer/src/lib/graph-layout.ts — Cytoscape layout options wrapper and runtime layout execution helper.
explorer/src/components/GraphView.tsx — Cytoscape React component, Position Authority bridge, overlay host, and UI mode toggle.
2. Task Route
The selected context route from AGENT.md for current-state orientation and feature layout reconnaissance is:

Current-State Orientation & Project Handoff:
  CURRENT-STATE-BASELINE.md → 08_Audit_Source_Register.md → Relevant Feature / Domain Reports
Specifically routed to:

FEAT-LAYOUT-v2 (audit-reports/features/FEAT-LAYOUT-report-v2.md)
FEAT-FEATURE-v2 (audit-reports/features/FEAT-FEATURE-report-v2.md)
3. Current Authority
Authoritative Current Sources
Subsystem / Topic	Authoritative File	Key Findings / Status
Current Baseline State	CURRENT-STATE-BASELINE.md	Handoff freeze complete; Phase 18 Remediation complete across Tracks A, B, C; Phase 19 context verified.
Audit Index & Recency Rules	08_Audit_Source_Register.md	Master index mapping audit IDs to reports and evidence under the recency/conflict rule.
Layout Engine Architecture	audit-reports/features/FEAT-LAYOUT-report-v2.md	Candidate E pipeline ($C_{\text{total}} = 94,662$, $C_{\text{pp}} = 8,704$), 0 node overlaps, 0 layer violations, 40.0px clearance, $0.00000\text{ px}$ determinism drift.
Feature Discovery & Roles	audit-reports/features/FEAT-FEATURE-report-v2.md	21 feature clusters across 240 nodes, 6 canonical roles (Anchor, Core, Data, Bridge, Test, SharedInfrastructure), 0 region overlaps.
Position Authority Policy	audit-reports/features/FEAT-POSAUTH-report-v2.md	5-level position authority hierarchy (Level 1 Session Drag > Level 2 Persisted > Level 3 Canvas > Level 4 Layout > Level 5 Fallback).
Data Contracts & Fixture	audit-reports/features/FEAT-CONTRACT-report-v2.md	Canonical fixture audit-fixtures/cloud-spend-tracker/explorer-data.json (SHA-256 feeb68f363d91fa0a234cb20b5975d6d6d69695fc9cdead4363806a7ca828295).
Historical / Superseded Sources
Historical 95,487 Total Crossings Claim: Early layout reports (e.g. HYBRID_LAYOUT_PHASE7B_FINAL_CROSSING_GAP_REPORT.md, HYBRID_LAYOUT_PHASE8_COMMUNITY_GEOMETRY_IMPLEMENTATION_REPORT.md) recorded total crossings at $C_{\text{total}} = 95,487$. Superseded by Candidate E in Phase 10/11 and FEAT-LAYOUT-report-v2.md ($C_{\text{total}} = 94,662$).
Phase 4 "Production Activation Blocked" Narrative: Early planning documents marked Hybrid mode as blocked due to missing feature band packing and satellite slot permutations. Superseded by Phase 12 Production Activation (HYBRID_LAYOUT_PHASE12_PRODUCTION_ACTIVATION_REPORT.md) and GraphView.tsx architecture mode switching (architectureMode === 'hybrid').
Phase 16 / 17 Reconciled Remediation Plans: Documents planning decisions before Phase 18 implementation. Superseded by Phase 18 Authorized Implementation (PHASE18G_FINAL_INTEGRATION_AND_REGRESSION_REPORT.md).
Historical Conflicts vs Current Executable Behavior
Historical Claim: enableFeatureLayout: true was omitted by default in production callers, causing the engine to fall back to hierarchical layout even when requested.
Current Executable Reality: GraphView.tsx calculates enableFeatureLayout = enableFeatureLayoutProp ?? layoutOptions?.enableFeatureLayout ?? (architectureMode === 'hybrid'). When architectureMode === 'hybrid' is set (or toggled via UI button 🧩), enableFeatureLayout: true is passed to computeArchitectureLayout, executing Stage 5 computeGlobalFeatureLayout.
4. Existing Hybrid Pipeline
The executable Hybrid Layout pipeline traces directly through source code from UI activation to canvas rendering:

GraphView.tsx (architectureMode === 'hybrid')
    ↓
graph-layout.ts (getLayoutOptions / runLayout with enableFeatureLayout: true)
    ↓
architecture-layout.ts (computeArchitectureLayout)
    ├── Stage 0: Normalization & Graph Fact Indexing (createLayoutGraphIndex)
    ├── Stage 1: Base Architecture Analysis (computeArchitectureAnalysis)
    ├── Stage 2: Layer Classification (classifyNodeLayerWithReason -> Presentation, Application, Domain, Schema)
    ├── Stage 3: Domain Discovery (discoverDomains)
    ├── Stage 3.5: Feature Role Classification (classifyAllFeatureRoles -> Anchor, Core, Data, Bridge, Test, SharedInfra)
    ├── Stage 4: Feature Discovery (discoverFeatures -> 21 clusters)
    ├── Stage 5: Global Feature Layout (computeGlobalFeatureLayout -> 2D multi-row band packing)
    ├── Stage 6: Layer Ordering & Crossing Reduction (reduceEdgeCrossings -> Strategy F_2D_BAND_AWARE)
    ├── Stage 7: Primary Production Local Layout (computeLocalNodeLayout -> 3-tier intra-bucket X/Y grids)
    ├── Stage 8: Hub & Bridge Spatial Refinement (calculateBridgeCandidatePosition)
    ├── Stage 9: Secondary Satellite Placement (placeSatellites -> radial candidate slot permutations for tests/fields)
    ├── Stage 10: Disconnected Component Packing (packComponentPositions -> FFDH 2D shelf packing)
    ├── Stage 11: Spatial Clearance & Collision Cleanup (resolveSpacingAndCollisions -> 40px min clearance)
    └── Stage 12: Position Authority Restoration (resolveAuthoritativePosition -> Level 1-3 override if present)
    ↓
GraphView.tsx (consumes preset layout positions or SVG overlays in FeatureOverlayCanvas.tsx)
Actual Source Functions Mapping
Hybrid Activation: GraphView.tsx:132-136 (enableFeatureLayout = ... (architectureMode === 'hybrid')), graph-layout.ts:184-218 (runLayout).
Feature Discovery: explorer/src/lib/layout/features.ts:discoverFeatures().
Feature Ordering: explorer/src/lib/layout/feature-ordering.ts:orderStrategyF_SharedHierarchyAware() / compute2DFeatureBandOrdering().
Feature Regions: explorer/src/lib/layout/global-layout.ts:computeGlobalFeatureLayout().
2D Feature-Region Packing: explorer/src/lib/layout/global-layout.ts:packFeatureRegions2D().
Feature-Local Layer Geometry: explorer/src/lib/layout/global-layout.ts:computeFeatureLayerYMap().
Local Node Layout: explorer/src/lib/layout/local-layout.ts:computeLocalNodeLayout().
Crossing Reduction: explorer/src/lib/layout/ordering.ts:reduceEdgeCrossings().
Bridge Placement: explorer/src/lib/layout/centrality.ts:calculateBridgeCandidatePosition().
Shared Infrastructure Placement: explorer/src/lib/layout/centrality.ts:computeGraphCentralityAnalysis().
Satellite Placement: explorer/src/lib/layout/satellites.ts:placeSatellites().
Spacing & Clearance: explorer/src/lib/layout/spacing.ts:resolveSpacingAndCollisions().
Position Authority: explorer/src/lib/position-policy.ts:resolveAuthoritativePosition(), shouldAutoLayout().
Browser/Runtime Rendering: explorer/src/components/GraphView.tsx, explorer/src/components/graph-internals/FeatureOverlayCanvas.tsx.
5. Investigation Map
To investigate the discrepancy between the supplied current layout and the expected "Hybrid Layout (Hierarchical flow + clustered region + reduced crossing)" layout without making premature defect conclusions, the next forensic investigations are mapped as follows:

                               ┌─────────────────────────────────────────┐
                               │     HYBRID LAYOUT DISCREPANCY AUDIT     │
                               └────────────────────┬────────────────────┘
                                                    │
                   ┌────────────────────────────────┴────────────────────────────────┐
                   ▼                                                                 ▼
      Code/Data-Flow Forensics                                            Visual/Runtime Forensics
┌───────────────────────────────────────────────┐               ┌───────────────────────────────────────────────┐
│ 1. Activation & Provenance Pipeline Audit     │               │ 1. Canvas Rendering & Element Sync Audit     │
│    - Inspect architectureMode propagation.   │               │    - Verify Cytoscape cy.batch() / position   │
│    - Trace layoutProvenance persistence in    │               │      assignment in GraphView.tsx.             │
│      ProjectUIState (localStorage).           │               │ 2. Feature Overlay Canvas Alignment           │
│ 2. Feature Discovery & Role Assignment Audit │               │    - Check SVG composition box rendering in   │
│    - Verify candidate score cutoff (3.0) and  │               │      FeatureOverlayCanvas.tsx.                │
│      unassigned node population (49.58%).     │               │ 3. Far-Zoom Overlay Suppression Check         │
│ 3. 2D Multi-Row Band Geometry Audit          │               │    - Inspect zoom threshold (< 0.6) and       │
│    - Audit Stage 5 region bounds calculation  │               │      viewport transform alignment.            │
│      and inter-feature band spacing.          │               │ 4. Position Authority Override Audit          │
│ 4. Crossing Reduction & Ordering Audit        │               │    - Check if Level 2 saved positions override│
│    - Measure Stage 6 & Stage 7 primary vs     │               │      Level 4 fresh Hybrid layout coordinates. │
│      satellite crossing behavior.             │               └───────────────────────────────────────────────┘
└───────────────────────────────────────────────┘
6. Protected Existing Machinery
The following systems are established, fully tested, and protected by governance contracts. They must be reused rather than replaced:

5-Level Position Authority Hierarchy (position-policy.ts): Level 1 Session Drag > Level 2 Persisted > Level 3 Canvas > Level 4 Architecture Layout > Level 5 Fallback.
13-Stage Layout Engine Pipeline (architecture-layout.ts): Modular Stage 0 through Stage 12 layout processing structure.
Physical Clearance Contract (metrics.ts / spacing.ts): Minimum node clearance $\ge 40.0\text{px}$ with $1\text{e-}3$ epsilon normalization.
Feature Role Classifier (feature-roles.ts): 6 canonical roles (Anchor, Core, Data, Bridge, Test, SharedInfrastructure).
Feature Discovery Engine (features.ts): Seed expansion and cluster formation with $minCandidateScore = 3.0$.
2D Shelf Component Packer (components.ts): FFDH 2D shelf packing for disconnected graph components.
Pure View-Layer SVG Composition Overlays (FeatureOverlayCanvas.tsx / feature-composition.ts): Viewport-synced SVG overlays with zero Cytoscape layout side-effects.
Multi-Project State Isolation (projectState.ts): Project-scoped localStorage state isolation (explorer.projectState.<projectId>).
7. Open Questions
The following specific questions require the next forensic audits to answer:

Activation & Provenance Handoff: Is layoutProvenance in persisted project state ('automatic-hierarchical' vs 'automatic-hybrid' vs 'user-authored') preventing fresh Level 4 Hybrid layout coordinates from applying when switching architectureMode?
Data Model Handoff: Is GraphView.tsx passing explicit nodes and edges props to runLayout() on every layout trigger, or is Cytoscape fallback extraction losing feature metadata?
Feature Cluster Geometry: Are the 21 discovered feature clusters forming visually distinct 2D spatial regions on the canvas, or are unassigned/shared nodes causing regions to spread across layers?
Ordering & Crossing Alignment: Does Strategy F 2D band ordering (compute2DFeatureBandOrdering) preserve vertical architectural layer flow while maintaining $C_{\text{pp}} = 8,704$ on active rendering?
Overlay Synchronization: Are the SVG bounding boxes rendered by FeatureOverlayCanvas.tsx perfectly aligned with the Cytoscape node positions generated by Stage 12?
