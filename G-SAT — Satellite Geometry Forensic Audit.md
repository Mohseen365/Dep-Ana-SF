G-SAT — Satellite Geometry Forensic Audit
1. Context Path
AGENT.md → 08_Audit_Source_Register.md → CURRENT-STATE-BASELINE.md → audit-reports/features/FEAT-LAYOUT-report-v2.md → explorer/src/lib/architecture-layout.ts → explorer/src/lib/layout/satellites.ts → explorer/src/lib/layout/global-layout.ts → explorer/src/lib/layout/metrics.ts

2. Task Route
AGENT.md → Candidate E Layout Pipeline & Spatial Geometry (FEAT-LAYOUT-report-v2.md / explorer/src/lib/architecture-layout.ts)

3. Authority / Supersession
Authoritative Current State: CURRENT-STATE-BASELINE.md & PHASE19C_CURRENT_STATE_BASELINE_FREEZE_REPORT.md (Stage 5 → Stage 7 featureLayerYMap handoff active and frozen).
Governing Layout & Spatial Contract: FEAT-LAYOUT-report-v2.md & HYBRID_LAYOUT_PHASE12_PRODUCTION_ACTIVATION_REPORT.md.
Canonical Benchmark Fixture: audit-fixtures/cloud-spend-tracker/explorer-data.json (SHA-256: feeb68f363d91fa0a234cb20b5975d6d6d69695fc9cdead4363806a7ca828295, 240 nodes, 1,024 edges).
Real Project Datasets: explorer/public/projects/movie (9 nodes, 16 edges), explorer/public/projects/project-b (14 nodes, 16 edges), explorer/public/projects/test-canonical-project (2 nodes, 1 edge), explorer/public/projects/test-norm-proj (1 node, 0 edges). analyze/projects/ is an empty directory.
4. Current Post-Fix Baseline
Stage 7 Handoff State: featureLayerYMap: globalDomainResult.featureLayerYMap is actively passed to computeLocalNodeLayout().
Primary-Primary Crossings ($C_{pp}$): $8,704$ (satisfying mandatory quality gate $C_{pp} < 9,335$).
Total Crossings ($C_{\text{total}}$): $94,662$ ($C_{pp}=8,704, C_{ps}=41,590, C_{ss}=41,544, C_{pb}=2,594, C_{bb}=230$, satisfying mandatory gate $C_{\text{total}} \le 95,000$).
Primary Overlaps: $0$.
Satellite Overlaps: $0$.
Layer Hierarchy Violations: $0$.
Minimum Physical Clearance: $\ge 40.0\text{px}$ (with 1e-3 sub-pixel epsilon).
Coordinate Determinism Drift: $0.00000\text{px}$ across 10x executions and 5 input permutations.
Position Authority & CLI Change Gates: All 100% passing.
5. Satellite Producer → Consumer → Runtime Trace
Feature Discovery (discoverFeatures in features.ts):

Input: nodes, edges, analysis, layerMap, domainMap.
Output: FeatureDiscoveryResult (assignments of nodes to feature IDs, e.g. Cloud_Spend__c, SpendImportService).
Data Structure: Map<string, FeatureAssignment>.
Coordinates/Geometry: None (pure topological grouping).
Feature Regions & Geometry (computeGlobalFeatureLayout in global-layout.ts):

Input: nodes, edges, featureDiscovery, featureMap.
Output: GlobalFeatureLayoutResult, containing featureRegions, layerYMap (global), and featureLayerYMap (feature-local Y mapping per feature per layer).
Data Structure: Record<string, Record<ArchitectureLayer, number>>.
Coordinate Source: Feature-local vertical geometry calculated dynamically via computeFeatureLayerYMap.
Stage 7 Primary Production Local Layout (computeLocalNodeLayout in local-layout.ts):

Input: Primary nodes ($156$ nodes), domainRegions, bucketOrder, featureLayerYMap.
Output: primaryNodePositions (positions for primary Apex classes, controllers, services, objects).
Coordinate Source: Feature-local Y coordinates derived directly from featureLayerYMap when available.
Stage 8 Hub & Bridge Spatial Refinement (calculateBridgeCandidatePosition in centrality.ts):

Input: Bridge nodes, domainXCenters, domainBounds, basePositions (Stage 7 primary positions).
Output: Refined candidate positions for cross-domain bridge nodes.
Stage 9 Place Satellites (placeSatellites in satellites.ts):

Input: safeNodes, safeEdges, analysis, basePositions (Stage 7 & 8 primary positions), options (layerYOffsets = globalDomainResult.layerYMap).
Anchor Selection:
Fields: parentId resolved via fieldItem.parentObjectId or findParentObjectId(). Parent position retrieved from basePositions[parentId].
Tests: targetId resolved via testItem.parentProductionNodeId or findParentProductionNodeId(). Target position retrieved from basePositions[targetId].
Triggers/Handlers: Parent CustomObject or connected Service resolved via incident edge inspection. Anchor retrieved from positions[parentId].
Satellite Y Calculation:
Anchored Satellites (100% of satellites with parent primary components present): generateSatelliteSlots constructs candidate radial/grid slots centered at anchor.x and anchor.y (the Stage 7 primary node coordinate). Global layerYOffsets is NEVER used for anchored satellites.
Unanchored Fallback Satellites: For satellites with no primary parent in the graph, candidate slots fallback to fallbackAnchor = { x: defaultDomainX, y: layerYOffsets.schema } (for fields) or { x: defaultDomainX, y: layerYOffsets.application } (for tests).
Output: satelliteResult.positions containing exact $(x, y)$ coordinates for all nodes.
Stage 10 Disconnected Component Packing (packComponentPositions in components.ts):

Input: Component sub-graphs, satelliteResult.positions.
Output: Aspect-ratio aware packed positions (preserves relative delta offset of satellites to their primary anchors).
Stage 11 Collision & Clearance Cleanup (resolveSpacingAndCollisions in spacing.ts):

Input: Component-shifted positions.
Output: finalCleanupResult.positions ensuring minimum clearance $\ge 40.0\text{px}$.
Stage 12 Position Authority Restoration (computeArchitectureLayout in architecture-layout.ts):

Input: calculatedPositions, existingPositions.
Output: Authoritative node positions map returned to caller.
GraphView / Cytoscape Rendering (GraphView.tsx):

Input: Authoritative positions map preset on Cytoscape model (cy.nodes().positions()).
6. Q1–Q7 Results
Q1. What exact coordinate source determines satellite Y?
For Anchored Satellites (100% of satellites across canonical and real projects): Satellite Y is determined by its primary anchor's $(x, y)$ coordinate (from Stage 7 primaryNodePositions) plus a candidate offset $r \cdot \text{dy}$ generated by generateSatelliteSlots(anchor, ...). Because Stage 7 primary positions use featureLayerYMap, anchored satellites inherit feature-local Y positioning directly from their parent primary node.
For Unanchored Satellites: Satellite Y is determined by the fallback layerYOffsets passed into placeSatellites().
Q2. Does placeSatellites() currently receive:
layerYMap? YES (passed via options.layerYOffsets = globalDomainResult.layerYMap).
featureLayerYMap? NO (not explicitly passed as an option into Stage 9).
feature region geometry? NO (not passed explicitly).
primary anchor coordinates? YES (passed explicitly as basePositions = localResult.primaryNodePositions).
Q3. If global layer Y is used, exactly where?
Global layerYOffsets is used in placeSatellites() exclusively in two places:

Lines 339 & 397: As the Y coordinate for fallbackAnchor when placing unanchored fields or tests that have no parent production target node present in the graph.
Lines 245 & 297: As default Y for unplaced triggers/handlers when no connected parent object or service exists.
Q4. Is that global Y actually responsible for the observed detached satellite column?
NO. Across the canonical benchmark dataset (audit-fixtures/cloud-spend-tracker/explorer-data.json) and all real project datasets (movie, project-b, test-canonical-project, test-norm-proj), 100% of custom fields and Apex test classes have valid primary parent anchors in basePositions. They are placed directly relative to their primary anchors using Stage 7 positions (which already use featureLayerYMap). Global Y is not invoked for these nodes and is not responsible for any detached vertical column.

Q5. Could the same visual result instead come from:
The visual perception of a vertical strip of orange CustomObject/field nodes is driven by:

Field Stacking Geometry (generateSatelliteSlots in satellites.ts): When a CustomObject has multiple fields (e.g., Cloud_Spend__c), generateSatelliteSlots deliberately applies an aspect penalty (aspectPenalty += (Math.abs(r) - 1) * dy * 0.2) when bias === 'field' to stack fields in narrow vertical columns below the CustomObject ($c \in {-1, 0, 1, 2}$).
Schema Layer Primary Placement: CustomObjects natively belong to the schema architectural layer ($Y \approx 850\text{px}$ to $1,400\text{px}$). Because Schema is the bottom layer, fields attached to CustomObjects extend vertically downwards below the CustomObject, naturally forming a vertical column at the bottom of the feature region.
Feature Overlay Bounding Box Rendering (FeatureOverlayCanvas.tsx): SVG feature group boxes encompass all primary nodes in a feature. When fields extend downwards from a CustomObject at the schema boundary, they sit cleanly at the bottom edge of the feature's spatial region.
Q6. Does the existing satellite machinery already contain a feature-aware mechanism that can be reused?
YES. The satellite placement machinery already uses primary anchor positions (basePositions) as its anchor source (generateSatelliteSlots(parentPos, ...)). Since basePositions is produced by Stage 7 (which already incorporates featureLayerYMap), satellite placement is already feature-aware by reference through its parent anchor.

Q7. Is a code change actually required?
NO. The current state of the codebase correctly anchors satellites to their primary nodes using feature-local Y coordinates. No code change, algorithm modification, or refactoring is required.

7. Root Cause
The hypothesis that "orange CustomObject / satellite nodes form a detached vertical strip because satellite placement uses inappropriate global Y coordinates" is INCORRECT.

Satellite placement for anchored nodes uses the primary parent's $(x, y)$ position as its coordinate origin. Since Stage 7 primary placement already forwards featureLayerYMap, primary parent positions (and thus their anchored satellites) are fully feature-local. The vertical arrangement of fields below CustomObjects is an intentional design behavior of generateSatelliteSlots (vertical grid stacking below schema objects) and does not represent an unanchored coordinate defect.

8. Existing Machinery Reuse
Existing Producer: Stage 5 computeGlobalFeatureLayout produces featureLayerYMap. Stage 7 computeLocalNodeLayout consumes featureLayerYMap and outputs primaryNodePositions.
Existing Consumer: Stage 9 placeSatellites consumes basePositions (primaryNodePositions) as primary anchors.
Handoff Analysis: The handoff between primary positions and satellite placement is 100% intact and active.
Actual Runtime Effect: Anchored satellites remain tightly co-located with their parent primary components inside feature spatial regions with zero coordinate drift.
9. Minimal Integration Point
N/A — No integration gap exists. The pipeline is fully wired and functional.

10. Validation Contract
Canonical Fixture: audit-fixtures/cloud-spend-tracker/explorer-data.json (SHA-256: feeb68f363d91fa0a234cb20b5975d6d6d69695fc9cdead4363806a7ca828295).
Real Project Datasets: explorer/public/projects/movie/explorer-data.json, explorer/public/projects/project-b/explorer-data.json, explorer/public/projects/test-canonical-project/explorer-data.json, explorer/public/projects/test-norm-proj/explorer-data.json.
Validation Evidence:
Satellites remain tethered to intended primary features (0 detached satellites).
Primary Overlaps = $0$.
Satellite Overlaps = $0$.
Minimum Physical Clearance $\ge 40.0\text{px}$.
Edge Crossings: $C_{pp} = 8,704 < 9,335$; $C_{\text{total}} = 94,662 \le 95,000$.
Determinism Drift = $0.00000\text{px}$.
11. Protected Systems
All protected systems remain 100% intact and unmutated:

Feature discovery & feature roles
featureLayerYMap generation & Stage 5 → Stage 7 handoff
Feature region packing & ordering
Crossing reduction & local node layout
Bridge & satellite placement
Position Authority (position-policy.ts)
GraphView.tsx & FeatureOverlayCanvas.tsx
12. Decision
HYPOTHESIS REJECTED — NO CHANGE REQUIRED
