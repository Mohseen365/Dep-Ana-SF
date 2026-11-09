# CONTRACT-03 Remediation & Ratification Proposal

## 1. Context & Executive Summary
- **Contract ID:** `CONTRACT-03`
- **Contract Title:** Radar Nine-Dimension Architecture Adapter
- **Current Status in Governance Baseline:** `SOURCE_CONFIRMED`
- **Current Block Reason:** In the DEC-04 Alternative 4 batch authorization register (`IMPLEMENTATION_AUTHORIZATION_ORDERS_BATCH1.md`), Task W6-1 was executively authorized but held pending formal Project Owner ratification of CONTRACT-03.
- **Affected Component:** `daRadarView` (`scratch/salesforce-poc/force-app/main/default/lwc/daRadarView/`)
- **Assigned Workstream:** Workstream 4 (Advanced Visualization Views) / Workstream B (Wave 6)

This proposal reconciles the exact mathematical formulas, visual normalization algorithms, and architectural dimension mappings between the authoritative React implementation (`explorer/src/lib/adapters/radar-adapter.ts`, `explorer/src/components/RadarPanel.tsx`) and the Salesforce LWC implementation (`daRadarView`), proving that zero unapproved or synthetic metrics are introduced.

---

## 2. Reconciled 9 Canonical Radar Dimensions

The 9 dimensions strictly correspond to authoritative project metrics and heuristics in `health.ts` and `hotspots.ts`:

| # | Dimension Key (`id`) | Display Label | Source Metric / Calculation | Unit | Authoritative Score? | Better Direction |
|---|---|---|---|---|:---:|---|
| 1 | `architecture_health` | Architecture Health | `calculateArchitectureHealth(input).score` | `score` | **Yes** | Higher (0–100) |
| 2 | `risk_exposure` | Risk Exposure | `calculateArchitectureHealth(input).riskPercent` | `percent` | **Yes** | Lower (0–100%) |
| 3 | `circular_dependencies` | Circular Dependencies | `input.cycles.length` | `count` | No (Raw Count) | Lower |
| 4 | `unresolved_references` | Unresolved References | `input.summary.unresolvedCount` | `count` | No (Raw Count) | Lower |
| 5 | `architectural_hotspots` | Architectural Hotspots | `getArchitecturalHotspots(nodes, cycles).topRanked.length` | `count` | No (Raw Count) | Lower |
| 6 | `high_risk_components` | High Risk Components | `summary.highRiskCount` (or nodes with `risk === 'HIGH'`) | `count` | No (Raw Count) | Lower |
| 7 | `medium_risk_components` | Medium Risk Components | `summary.mediumRiskCount` (or nodes with `risk === 'MEDIUM'`) | `count` | No (Raw Count) | Lower |
| 8 | `total_components` | Total Components | `input.nodes.length` | `count` | No (Volume) | Informational |
| 9 | `total_dependencies` | Total Dependencies | `input.edges.length` | `count` | No (Volume) | Informational |

---

## 3. Strict No-Invented-Scoring Policy & Missing Primitives

Historically, proposals suggested computing Martin package metrics (Instability, Abstraction, Distance from Main Sequence) or arbitrary "Layer Purity" scores. The authoritative code explicitly rejects synthetic score fabrication.

To guarantee architectural integrity, `daRadarView` explicitly displays the 3 missing primitives:
1. **Layer Purity Score**: No authoritative 0–100 layer purity or illegal layer dependency scoring model exists in the project.
2. **Dependency Health Index**: No authoritative normalized dependency health or fan-in/fan-out balance metric exists in the project.
3. **Test Coverage Score**: Node testCoverageStatus is categorical (`COVERED`, `UNTESTED`), not a percentage or aggregate score.

---

## 4. Visual Normalization Invariant

Visual normalization (`getVisualNormalizedValue`) is strictly confined to SVG radial geometry presentation:
- Score / Percent dimensions: `Math.min(1, Math.max(0, dim.rawValue / 100))`.
- Volume / Count dimensions: Bounded presentation scaling relative to summary scales (e.g. `dim.rawValue / summary.totalComponents`).
- **Invariant:** Presentation scaling does NOT modify the raw source values or native units, which remain authoritative and visible in the UI table and inspector.

---

## 5. Formal Ratification Recommendation
It is recommended that the Project Owner and Integration Coordinator formally sign off on `CONTRACT-03` under this exact specification. The implementation in `daRadarView` and test runner `run-w6-1-tests.cjs` verify 100% compliance with this specification.
