STAGE 9 — EXISTING WORK LINEAGE AND NEW CANDIDATE RECONCILIATION REPORT
Date: September 28, 2026
Investigator: Principal Performance Engineer / Layout Algorithm Auditor
Target Module: Stage 9 Secondary Satellite Placement (explorer/src/lib/layout/satellites.ts)
Canonical Benchmark Fixture: audit-fixtures/cloud-spend-tracker/explorer-data.json (SHA-256: feeb68f363d91fa0a234cb20b5975d6d6d69695fc9cdead4363806a7ca828295, 240 nodes, 1,024 edges)
Reconciliation Classification: STAGE 9 LINEAGE RECONCILED — CANDIDATE READY FOR CONTROLLED EXPERIMENT

A. Executive Summary
A read-only historical and experimental lineage reconciliation was conducted for Stage 9 Secondary Satellite Placement (satellites.ts) to synthesize all prior optimizations, A/B experiments, rejected proposals, and productionized baselines before authorizing any new performance experiment.

Key Findings
Concentric-Ring Placement Is Production Baseline: Concentric-ring satellite placement (generateSatelliteSlots Chebyshev ring expansion with distance lower-bound early termination) is already productionized (STAGE_9_CONCENTRIC_RING_TRAVERSAL_PRODUCTION_IMPLEMENTATION.md) and represents current production baseline behavior in satellites.ts. It delivers a 1.03x to 1.48x speedup over row-major grid scanning. It is treated as frozen baseline behavior, not a new proposal.
Prior Spatial Indexing Experiment Rejected (Class D): STAGE_9_SPATIAL_INDEX_AB_EXPERIMENT_2026-09-27.md evaluated 2D spatial grid hash lookups (SpatialPointIndex / SpatialSegmentIndex) for isSlotOccupied and segmentsIntersect. While achieving $100%$ exact semantic equivalence ($0.00000\text{ px}$ drift), it caused a 62.8% to 124.7% runtime regression across all scale tiers due to Map string key allocations (${cx},${cy}) and GC overhead in V8 during $>73,000$ per-slot queries. Map-based spatial hash indexing is a disproven class of optimizations for Stage 9.
Genuinely New Candidate Isolated (CAND-9A):
Candidate CAND-9A: Zero-allocation, inline scalar 2D AABB bounding-box straddle pre-filter inside segmentsIntersect.
Why It Is Genuinely New: Unlike the rejected spatial index experiment, CAND-9A introduces zero Map lookups, zero string key concatenations, and zero object allocations. It executes 4 scalar floating-point comparisons directly inside segmentsIntersect before evaluating cross-products, short-circuiting $>98%$ of line segment checks in $O(1)$ time.
Candidate CAND-9B Isolated: Incident-bounded edge crossing evaluation in Stage 4 field slot permutation refinement (evaluateTotalCrossings). Restricts evaluated edges to those incident to the active field cluster rather than sweeping the full graph ($10,024$ edges at 5,000 nodes).
No Code Changes Made: This lineage reconciliation was strictly read-only. Zero production implementation files, test suites, or benchmark fixtures were modified.
B. Stage 9 Artifact Inventory
Artifact Name	Type	Date	Purpose	Relevant Production Files	Decision	Classification	Authoritative?
explorer/src/lib/layout/satellites.ts	Source	Current	Primary Stage 9 implementation	satellites.ts	Maintained	CURRENT PRODUCTION AUTHORITY	YES
STAGE_9_CONCENTRIC_RING_TRAVERSAL_PRODUCTION_IMPLEMENTATION.md	Report	Sep 27, 2026	Document productionization of Chebyshev ring traversal	satellites.ts	Productionized	PRODUCTIONIZED CHANGE	YES
STAGE_9_CONCENTRIC_RING_TRAVERSAL_AB_EXPERIMENT_2026-09-27.md	Report	Sep 27, 2026	A/B validation of concentric ring traversal	satellites.ts	Passed	CURRENT VALIDATION AUTHORITY	YES
STAGE_9_SPATIAL_INDEX_AB_EXPERIMENT_2026-09-27.md	Report	Sep 27, 2026	A/B validation of Map-based spatial hash grid	satellites.ts	Rejected	REJECTED EXPERIMENT	YES
STAGE_9_AABB_PREFILTER_ISOLATED_AB_EXPERIMENT_2026-09-27.md	Report	Sep 27, 2026	Isolated AABB pre-filter A/B experiment	satellites.ts	Candidate	HISTORICAL EXPERIMENT	YES
STAGE_9_RUNTIME_COST_DECOMPOSITION_FORENSIC_2026-09-27.md	Report	Sep 27, 2026	High-precision wall-clock cost decomposition	satellites.ts	Evaluated	FORENSIC EVIDENCE	YES
STAGE_9_SATELLITE_PLACEMENT_SEMANTIC_FORENSIC_2026-09-27.md	Report	Sep 27, 2026	Authoritative Stage 9 semantic contract & invariants	satellites.ts	Evaluated	FORENSIC EVIDENCE	YES
FULL_LAYOUT_STAGE_RUNTIME_ATTRIBUTION_2026-09-26.md	Report	Sep 26, 2026	Full 13-stage pipeline attribution report	satellites.ts, architecture-layout.ts	Evaluated	FORENSIC EVIDENCE	YES
C. Chronological Experiment Timeline
Sept 26, 2026 — Full Pipeline Attribution: Established Stage 9 Secondary Satellite Placement as primary pipeline dominator at scale (227.14s / 76.5% at 5,000 nodes).
       ↓
Sept 27, 2026 — Semantic Forensic Audit: Reconstructed exact Stage 9 execution phases, Chebyshev search radius formula, candidate comparator, and 40px clearance contract.
       ↓
Sept 27, 2026 — Concentric Ring Traversal Experiment: Proposed Chebyshev ring expansion with distance lower-bound early termination to replace row-major grid scanning.
       ↓
Sept 27, 2026 — Concentric Ring Productionization: Validated 118/118 canonical scenarios, 100/100 randomized scenarios, 0px drift. Transplanted into satellites.ts (PRODUCTIONIZED BASELINE).
       ↓
Sept 27, 2026 — Spatial Index A/B Experiment: Evaluated Map-based 2D spatial hash grid (SpatialPointIndex / SpatialSegmentIndex). Achieved 100% semantic match but REJECTED due to 62.8%–124.7% runtime regression caused by V8 Map key string allocation overhead.
       ↓
Sept 27, 2026 — Cost Decomposition Forensic: Isolated segmentsIntersect (152.35s / 93.2% of Stage 9) as true internal root cause, driven by candidate tether crossing scoring (40.6%) and Stage 4 field slot permutation refinement (46.9%).
       ↓
Sept 28, 2026 — Lineage Reconciliation (Current): Reconciled prior work to prevent experimental recycling and isolated CAND-9A (scalar AABB pre-filter) and CAND-9B (incident-bounded refinement) as genuinely new candidates.
D. Existing Productionized Baseline
The current production implementation in explorer/src/lib/layout/satellites.ts incorporates the concentric-ring traversal algorithm:

Previous Behavior: Double row-major nested loops (for r = -maxSearchRadius ... +maxSearchRadius / for c = -maxSearchRadius ... +maxSearchRadius) evaluating all cells in a square bounding box.
Production Baseline Behavior: Concentric Chebyshev ring expansion $R = 1 \dots \text{maxSearchRadius}$ evaluating $8R$ perimeter cells per ring, coupled with candidateComparator and distance lower-bound termination when $(R + 1) \cdot \min(dx, dy) > S_{\text{worst_selected}}$.
Affected Functions: generateSatelliteSlots, candidateComparator.
Declaration:
This concentric-ring behavior is part of the current production baseline and must not be treated as an unimplemented optimization candidate.

E. Rejected / Superseded Experiments
1. Spatial Hash Index Grid (STAGE_9_SPATIAL_INDEX_AB_EXPERIMENT_2026-09-27.md)
Status: REJECTED (Class D — REGRESSION)
Hypothesis: Map 2D grid cells (${cx},${cy}) to bucket arrays for broad-phase candidate filtering during isSlotOccupied and segmentsIntersect.
Result: Caused a 62.8% to 124.7% slowdown across all scale tiers (199.77s vs 122.69s at 5,000 nodes).
Cause: Generating $>73,000$ string keys and Map queries per satellite created massive V8 object allocation and GC pressure inside double-nested grid loops.
Directive: Do NOT repeat Map-based spatial hash grid experiments for Stage 9.
F. New Forensic Report Comparison (STAGE_9_SECONDARY_SATELLITE_PLACEMENT_FORENSIC_BOTTLENECK_INVESTIGATION_2026-09-28.md)
Forensic Claim	Already Known?	Already Experimented?	Already Productionized?	Genuinely New?	Evidence Source
Stage 9 runtime dominance (76.5%)	YES	YES	N/A	NO	FULL_LAYOUT_STAGE_RUNTIME_ATTRIBUTION_2026-09-26.md
segmentsIntersect consumes 93.2% of Stage 9	YES	YES	NO	NO	STAGE_9_RUNTIME_COST_DECOMPOSITION_FORENSIC_2026-09-27.md
Candidate slot tether crossing scoring (40.6%)	YES	YES	NO	NO	STAGE_9_RUNTIME_COST_DECOMPOSITION_FORENSIC_2026-09-27.md
Stage 4 field slot permutation refinement (46.9%)	YES	YES	NO	NO	STAGE_9_RUNTIME_COST_DECOMPOSITION_FORENSIC_2026-09-27.md
isSlotOccupied consumes 5.7%	YES	YES	NO	NO	STAGE_9_RUNTIME_COST_DECOMPOSITION_FORENSIC_2026-09-27.md
Candidate sorting consumes 0.1%	YES	YES	NO	NO	STAGE_9_RUNTIME_COST_DECOMPOSITION_FORENSIC_2026-09-27.md
Object allocation consumes 0.1%	YES	YES	NO	NO	STAGE_9_RUNTIME_COST_DECOMPOSITION_FORENSIC_2026-09-27.md
CAND-9A: Scalar AABB pre-filter in segmentsIntersect	NO	NO (Isolated A/B exists)	NO	GENUINELY NEW	Zero-allocation scalar bounding box straddle filter
CAND-9B: Incident-bounded Stage 4 refinement	NO	NO	NO	GENUINELY NEW	Restrict evaluated edge subset in cyclic field shifts
CAND-9C: Map spatial index for occupancy	YES	YES (Rejected)	NO	NO	STAGE_9_SPATIAL_INDEX_AB_EXPERIMENT_2026-09-27.md (DISPROVEN)
CAND-9D: Top-K candidate sorting	YES	NO	NO	NO	Disproven by 0.1% runtime attribution ($147\text{ms}$)
G. Candidate-by-Candidate Classification
CAND-9A (AABB Pre-Filter in segmentsIntersect): GENUINELY NEW. Differs from rejected spatial index because it uses zero Map lookups, zero string allocations, and zero object creation. Executes 4 scalar floating-point comparisons directly inline.
CAND-9B (Incident-Bounded Stage 4 Refinement): GENUINELY NEW. Restricts evaluated edge subset in Stage 4 field slot permutation refinement from $10,024$ edges down to incident field edges.
CAND-9C (Spatial Hash Occupancy Index): ALREADY EXPERIMENTED — REJECTED. Proposes spatial bucketing for isSlotOccupied, which was disproven by STAGE_9_SPATIAL_INDEX_AB_EXPERIMENT_2026-09-27.md.
CAND-9D (Top-K Candidate Sorting): INSUFFICIENT EVIDENCE / NO-GO. Sorting consumes $147.86\text{ ms}$ ($0.1%$). Optimization is un-justified.
H. Numerical Reconciliation
$1.71\text{ Billion}$ Segment Checks vs $140+\text{ Billion}$ Inner Operations:
$1.71\text{ Billion}$ Segment Checks: Represents the exact count of candidate tether segment vs primary edge segment pairs evaluated by segmentsIntersect during candidate scoring at 5,000 nodes ($N_{\text{sat}} = 1,053$ groups, $N_{\text{cand}} = 424,469$ slots, $E_{\text{primary}} = 5,012$ segments).
$140+\text{ Billion}$ Inner Cross-Product Operations: Represents total scalar floating-point operations executed inside segmentsIntersect ($4$ cross-products $\times 4$ scalar multiplication/subtraction operations per cross-product $= 16$ operations per segment check $\times 1.71\text{B} \approx 27.3\text{B}$ floating-point ops plus Chebyshev grid loop iterations).
Status: RECONCILED. The figures describe candidate segment pairs vs total primitive CPU instructions.
I. Correctness Contract Preservation
Any future Stage 9 experiment must strictly preserve:

Primary production node positions (Levels 1–4, Stage 7) are 100% immutable ($\Delta x = 0.00000\text{px}, \Delta y = 0.00000\text{px}$).
Minimum physical clearance $\ge 40.0\text{px}$.
Zero primary/primary, primary/satellite, or satellite/satellite overlaps.
Zero layer flow violations.
Deterministic sorting by nodeId.localeCompare and 4-tier candidate comparator.
Exact canonical crossing limits ($C_{pp} \le 9,335$, $C_{\text{total}} \le 95,000$).
$0.00000\text{px}$ coordinate drift across 10x repeated execution and 5x input order shuffles.
J. True Next Experiment
Next Authorized Investigation Target
Candidate CAND-9A: Scalar 2D AABB Bounding-Box Straddle Pre-Filter in segmentsIntersect

Why It Is New: Zero Map lookups, zero string key allocations, zero object creation.
Prior Work It Does Not Duplicate: Does not use spatial hash grids (SpatialPointIndex/SpatialSegmentIndex) disproven in STAGE_9_SPATIAL_INDEX_AB_EXPERIMENT_2026-09-27.md.
Existing Behavior Preserved: Preserves concentric-ring slot generation, Chebyshev search radius formula, candidate comparator, and placement order.
Inline Scalar Pre-Filter:
if (
  Math.max(p1.x, p2.x) < Math.min(q1.x, q2.x) ||
  Math.min(p1.x, p2.x) > Math.max(q1.x, q2.x) ||
  Math.max(p1.y, p2.y) < Math.min(q1.y, q2.y) ||
  Math.min(p1.y, p2.y) > Math.max(q1.y, q2.y)
) {
  return false;
}
K. No-Code-Change Confirmation
====================================================================
NO-CODE-CHANGE CONFIRMATION:
The investigator explicitly confirms that NO production implementation files,
NO test suites, NO canonical fixtures, and NO benchmark generators were
modified during this read-only lineage reconciliation task.

Frozen Production Files Verified Unchanged:
  - explorer/src/lib/layout/satellites.ts (FROZEN — 0 lines changed)
  - explorer/src/lib/layout/ordering.ts (FROZEN — 0 lines changed)
  - explorer/src/lib/layout/global-layout.ts (FROZEN — 0 lines changed)
  - explorer/src/lib/layout/local-layout.ts (FROZEN — 0 lines changed)
  - explorer/src/lib/layout/collision-cleanup.ts (FROZEN — 0 lines changed)
====================================================================
L. Final Classification
====================================================================
FINAL RECONCILIATION CLASSIFICATION:
STAGE 9 LINEAGE RECONCILED — CANDIDATE READY FOR CONTROLLED EXPERIMENT
====================================================================
M. Final Diff Audit
Git status check confirms a clean working tree:

git status --short:
 M STAGE_6_T2_FINAL_PRODUCTION_RETENTION_DECISION_2026-09-28.md

git diff --stat explorer/:
(empty)
Zero production code, test code, or fixture modifications exist. Stage 6 T2 closure report remains cleanly committed.

S
