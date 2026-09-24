# CURRENT-STATE BASELINE

## 1. Current Project State

This document establishes the authoritative, verified current-state handoff for the **Salesforce Architecture Explorer & Dependency Analyzer** repository.

* **Phase 18 Remediation**: Fully complete across Track A (Production Provisioning), Track B (40px Clearance Contract), and Track C (Layer-Aware Locality Diagnostics).
* **Integrated Regression**: PASSED (`PHASE18G_FINAL_INTEGRATION_AND_REGRESSION_REPORT.md`).
* **Audit Closure**: COMPLETE (`PHASE18H_FINAL_AUDIT_CLOSURE_REPORT.md`).
* **Context Retrieval Quality**: VERIFIED (`PHASE19A_CONTEXT_RETRIEVAL_QUALITY_AUDIT.md`).
* **Agent Navigation Robustness**: ROBUST (`PHASE19B_AGENT_CONTEXT_NAVIGATION_STRESS_TEST.md`).

This baseline artifact serves as a navigation and status entry point for future agents. Deeper forensic evidence remains indexed in `08_Audit_Source_Register.md` and detailed in the respective canonical audit reports.

---

## 2. Canonical Dataset

* **File Path**: `audit-fixtures/cloud-spend-tracker/explorer-data.json`
* **SHA-256 Digest**: `feeb68f363d91fa0a234cb20b5975d6d6d69695fc9cdead4363806a7ca828295`
* **Topology**: 240 nodes, 1,024 edges
* **Identity Status**: Authoritative, read-only Salesforce-derived org dataset. Cryptographically verified bit-for-bit unchanged.

---

## 3. Track Status

| Track | Current Status | Current Authority |
| --- | --- | --- |
| **Track A — Production Provisioning** | CLOSED — PROVEN | `PHASE18B_TRACK_A_PROVENANCE_VERIFICATION_REPORT.md` |
| **Track B — 40px Clearance** | CLOSED — CORRECTED | `PHASE18E_CORRECTIVE_40PX_CONTRACT_IMPLEMENTATION.md` |
| **Track C — Locality Diagnostics** | CLOSED — IMPLEMENTED / DIAGNOSTIC-ONLY | `PHASE18F_LAYER_AWARE_LOCALITY_IMPLEMENTATION.md` |
| **Integrated Validation** | FINAL INTEGRATION — PASSED | `PHASE18G_FINAL_INTEGRATION_AND_REGRESSION_REPORT.md` |
| **Audit Closure** | FINAL AUDIT CLOSURE — COMPLETE | `PHASE18H_FINAL_AUDIT_CLOSURE_REPORT.md` |
| **Context Retrieval** | CONTEXT RETRIEVAL — VERIFIED / ROBUST | `PHASE19A` / `PHASE19B` |
| **G-OVL — Feature Region Overlay Transport** | CLOSED — IMPLEMENTED AND VERIFIED | `HYBRID_LAYOUT_PROMPT4_IMPLEMENTATION_REPORT.md` |

---

## 4. Current Architecture Boundaries

```text
Canonical dataset (audit-fixtures/cloud-spend-tracker/explorer-data.json)
        ↓
Build/export provisioning (scripts/run-explorer.cjs -> export-explorer.cjs)
        ↓
Explorer runtime (ProjectContext.tsx -> /projects/cloud-spend-tracker/explorer-data.json)
        ↓
Existing Candidate E layout pipeline (architecture-layout.ts, 13-stage Stage 0–12 generator)
        ↓
Stage 5 featureRegions metadata exposure (computeArchitectureLayoutWithMetadata)
        ↓
Transport via graph-layout (runLayoutWithMetadata)
        ↓
GraphView (setFeatureRegions state update on layout execution)
        ↓
FeatureOverlayCanvas (featureRegions prop -> SVG semantic feature region enclosure boxes)
        ↓
Position Authority (position-policy.ts, 5-Level priority hierarchy)
        ↓
40px clearance validation (metrics.ts minimumNodeClearance with 1e-3 epsilon normalization)
        ↓
Layer-aware locality diagnostics (metrics.ts calculateFeatureLocalityDiagnostics)
        ↓
Renderer consumes authoritative positions (GraphView.tsx preset Cytoscape binding)
```

**Explicit System Boundaries**: Phase 18 did **NOT** introduce a backend, new API, new server architecture, layout rewrite, Position Authority rewrite, renderer rewrite, or test-harness runtime dependency.

---

## 5. Governing Contracts and Diagnostics

### Physical Clearance Contract

* **Governing Contract**: Minimum physical node clearance $\ge 40.0\text{px}$ (`FEAT-LAYOUT-report-v2.md`).
* **Implementation Mechanism**: `minimumNodeClearance` in `explorer/src/lib/layout/metrics.ts` applies `SPACING_EPSILON = 1e-3` ($0.001\text{px}$) normalization to accommodate IEEE-754 arithmetic representation noise originating from X-center averaging in `global-layout.ts`.
* **Contract Integrity**: The formal requirement remains strictly $\ge 40.0\text{px}$. Sub-40px values with deficits $> 0.001\text{px}$ (`39.99`, `39.994`, `39.998`, `39.9989`) are rejected as contract failures, while the canonical floating-point case (`39.99905982905989px`) evaluates to `40.0`. Zero primary or satellite overlaps exist.

### Locality Diagnostics

* **Global Locality Metrics**: Historical global locality metrics (`medianIntraFeatureEdgeLength`, `medianInterFeatureEdgeLength`, `intraToInterEdgeLengthRatio`, `isIntraShorterThanInter`) remain available in `metrics.ts`.
* **Layer-Aware Locality Diagnostics**: `sameLayerLocality` and `crossLayerLocality` properties are exposed in `FeatureLocalityDiagnostics` and computed using `classifyNodeLayer(node)`.
* **Governance Boundary**: Locality measurements are diagnostic-only. No replacement locality threshold exists, and no locality pass/fail gate was introduced.

---

## 6. Position and Rendering Authority

```text
Layout engine (architecture-layout.ts)
    → calculates architecture positions (Level 4 / Level 5)

Position Authority (position-policy.ts)
    → determines authoritative positions (Level 1 Drag > Level 2 Persisted > Level 3 Canvas > Level 4 Layout > Level 5 Fallback)

Renderer (GraphView.tsx)
    → consumes authoritative positions (preset layout execution)
```

For deeper forensic evidence on Position Authority or visual rendering boundaries, inspect `audit-reports/features/FEAT-POSAUTH-report-v2.md` and `FEAT-OVERLAY-report.md`.

---

## 7. Historical Supersession Rules

* **40px Contract Precision**:
  * `18C` (initial two-decimal rounding) $\rightarrow$ `18D` (precision finding) $\rightarrow$ `18E` (corrective `1e-3` epsilon implementation). **Phase 18E represents the current authoritative state.**
* **Remediation Phase Evolution**:
  * `Phase 16 / 17` (reconciled planning; status: IMPLEMENTATION NOT PERFORMED) $\rightarrow$ `Phase 18` (authorized implementation) $\rightarrow$ `18G / 18H` (integrated validation & closure; status: FINAL INTEGRATION — PASSED / FINAL AUDIT CLOSURE — COMPLETE). **Phase 18G/18H represent the current authoritative state.**

Historical reports are preserved for provenance and should not be treated as current implementation state when a later authoritative report supersedes them.

---

## 8. Context Retrieval Protocol

Future coding agents must adhere to the mandatory context lookup chain:

```text
AGENT.md
    ↓
08_Audit_Source_Register.md
    ↓
authoritative Phase / Feature report
    ↓
specific source evidence (only when line-level confirmation is required)
```

**Practical Retrieval Guidelines**:
1. Avoid broad or unconstrained repository searches (`grep`, global file scans).
2. Prefer the smallest sufficient context source.
3. Consult `08_Audit_Source_Register.md` to resolve audit IDs and verify current report authorities.
4. Always check for chronologically later or corrective phase reports when evaluating historical findings.
5. Do not modify or rewrite historical audit reports.

---

## 9. Authoritative Navigation Map

| Investigation Topic | First Authority File | Supporting Evidence / Code |
| --- | --- | --- |
| **Production Provisioning (Track A)** | `PHASE18B_TRACK_A_PROVENANCE_VERIFICATION_REPORT.md` | `scripts/run-explorer.cjs` |
| **40px Clearance (Track B)** | `PHASE18E_CORRECTIVE_40PX_CONTRACT_IMPLEMENTATION.md` | `explorer/src/lib/layout/metrics.ts` |
| **Locality Diagnostics (Track C)** | `PHASE18F_LAYER_AWARE_LOCALITY_IMPLEMENTATION.md` | `explorer/src/lib/layout/metrics.ts` |
| **Integrated Phase 18 Status** | `PHASE18G_FINAL_INTEGRATION_AND_REGRESSION_REPORT.md` | `PHASE18G` report section 5 |
| **Audit Closure** | `PHASE18H_FINAL_AUDIT_CLOSURE_REPORT.md` | `08_Audit_Source_Register.md` |
| **Context Retrieval Quality** | `PHASE19A_CONTEXT_RETRIEVAL_QUALITY_AUDIT.md` | `PHASE19A` report section 3 |
| **Agent Navigation Robustness** | `PHASE19B_AGENT_CONTEXT_NAVIGATION_STRESS_TEST.md` | `PHASE19B` report section 4 |
| **Position Authority Policy** | `audit-reports/features/FEAT-POSAUTH-report-v2.md` | `explorer/src/lib/position-policy.ts` |
| **Candidate E Layout Pipeline** | `audit-reports/features/FEAT-LAYOUT-report-v2.md` | `explorer/src/lib/architecture-layout.ts` |
| **Cytoscape Canvas Renderer** | `audit-reports/features/FEAT-OVERLAY-report.md` | `explorer/src/components/GraphView.tsx` |
| **Multi-Project State Isolation** | `audit-reports/features/FEAT-STATE-report-v2.md` | `explorer/src/lib/projectState.ts` |
| **Historical Audit Indexing** | `08_Audit_Source_Register.md` | `08_Audit_Source_Register.md` |

---

## 10. Known Limitation

The canonical dataset (`audit-fixtures/cloud-spend-tracker/explorer-data.json`) contains zero same-layer inter-feature dependency edges because inter-feature couplings in this org's architecture span across distinct vertical layers (e.g. presentation-to-application or application-to-domain). Consequently, the `medianInterEdgeLength` diagnostic field under `sameLayerLocality` evaluates to `0.00px` on this dataset. This is an empirical property of the dataset's coupling topology, not an engine defect.

---

## 11. Future-Agent Rules

1. **Read `AGENT.md` First**: Always start context retrieval at `AGENT.md`.
2. **Follow the Source Register**: Use `08_Audit_Source_Register.md` to resolve audit IDs and verify report authority.
3. **Prefer Current Authority**: Use later corrective reports (e.g., 18E over 18C, 18G over Phase 17) for active state decisions.
4. **Preserve Historical Reports**: Never edit or delete historical audit reports under `audit-reports/` or root markdown records.
5. **Protect Canonical Datasets**: Never modify `audit-fixtures/cloud-spend-tracker/explorer-data.json` or alter its SHA-256 hash.
6. **Protect Governing Contracts**: Maintain strict formal requirements (e.g., minimum physical clearance $\ge 40.0\text{px}$).
7. **No Arbitrary Thresholds**: Do not introduce unapproved locality pass/fail gates or arbitrary scoring formulas.
8. **Minimal Source Inspection**: Read implementation code only when report evidence requires line-level confirmation.
9. **Stay In-Scope**: Keep code or documentation modifications strictly scoped to the assigned task.
10. **Preserve Position Authority**: Never overwrite Level 1–3 authoritative node positions during automatic UI triggers or viewport operations.
