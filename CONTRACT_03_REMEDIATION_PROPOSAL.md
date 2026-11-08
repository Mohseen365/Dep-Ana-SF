# CONTRACT-03 Remediation Proposal: Radar Nine-Dimension Architecture Adapter

## 1. Governance & Proposal Metadata
- **Contract Target:** `CONTRACT-03`
- **Current Status:** `SOURCE_CONFIRMED` / `PROPOSED` (Unratified by Project Owner)
- **Proposed Status:** `RATIFICATION_RECOMMENDED`
- **Affected Tasks:** Task W6-1 (`daRadarView`)
- **Affected Workstream:** Workstream B (Wave 6)
- **Author:** Jules (Integration Coordinator / Contract Remediation Lane)
- **Date:** 8 November 2026
- **Ratification Authority:** Project Owner (Sole Executive Authority under DEC-04 Alternative 4)

---

## 2. Problem Statement & Historical Ambiguity
Historical planning documents (Phase A2) hypothesized 9 arbitrary Martin packaging metrics for the Radar view (including Instability, Abstraction, Distance from Main Sequence, Unassigned Ratio, Component Density). However, forensic audit of the actual explorer source code (`explorer/src/lib/adapters/radar-adapter.ts` and `explorer/src/components/RadarPanel.tsx`) demonstrated that:
1. Martin package metrics were never implemented in the underlying analytics engine.
2. The production React Radar component instead uses 9 concrete architecture metrics derived directly from `ExplorerDataSchema` (canonical graph payload equivalent).
3. The adapter explicitly catalogs 3 missing primitives rather than fabricating ungrounded formulas.

Until Project Owner formally ratifies CONTRACT-03, Task W6-1 remains blocked from production implementation.

---

## 3. Proposed Authoritative Dimensions & Mappings

The 9 dimensions must strictly mirror `radar-adapter.ts`:

| Index | Dimension Key (`id`) | Display Label | Source Metric / Calculation | Unit | Authoritative? | Desirable Trend |
|:---:|:---|:---|:---|:---|:---:|:---|
| 1 | `architecture_health` | Architecture Health | `calculateArchitectureHealth(payload).score` | `score` | Yes (0–100) | Higher |
| 2 | `risk_exposure` | Risk Exposure | `calculateArchitectureHealth(payload).riskPercent` | `percent` | Yes (0–100%) | Lower |
| 3 | `circular_dependencies` | Circular Dependencies | `payload.cycles?.length \|\| 0` | `count` | No (Raw count) | Lower |
| 4 | `unresolved_references` | Unresolved References | `payload.summary?.unresolvedCount \|\| countUnresolvedEdges(edges)` | `count` | No (Raw count) | Lower |
| 5 | `architectural_hotspots` | Architectural Hotspots | Nodes where `coupling > 15 \|\| fanIn > 10` | `count` | No (Raw count) | Lower |
| 6 | `high_risk_components` | High Risk Components | Nodes with `risk === 'HIGH'` | `count` | No (Raw count) | Lower |
| 7 | `medium_risk_components`| Medium Risk Components | Nodes with `risk === 'MEDIUM'` | `count` | No (Raw count) | Lower |
| 8 | `total_components` | Total Components | `payload.nodes.length` | `count` | Volume indicator | Informational |
| 9 | `total_dependencies` | Total Dependencies | `payload.edges.length` | `count` | Volume indicator | Informational |

---

## 4. Visual Normalization vs. Source Metrics (CONTRACT-01 Alignment)

To prevent mutation of canonical graph data and avoid misrepresenting presentation math as architectural scoring:
- **Presentation Mapping:** Visual scaling converts heterogeneous metrics to a radial $[0, 1]$ interval strictly for SVG polygon vertex calculation (`radius = visualNormalizedValue * maxRadius`).
  - Score / Percent: `rawValue / 100` (clamped $[0, 1]$).
  - High / Medium Risk: `rawValue / Math.max(1, totalComponents)`.
  - Circular Dependencies: `min(1, rawValue / max(10, totalComponents * 0.1))`.
  - Unresolved References: `min(1, rawValue / max(20, totalComponents * 0.2))`.
  - Hotspots: `min(1, rawValue / max(20, totalComponents * 0.2))`.
  - Volume (Total Components / Dependencies): $1.0$ if $> 0$, else $0$.
- **Raw Metric Preservation:** The underlying payload is never mutated. Hover tooltips and detail inspection display `rawValue` and original `unit`.

---

## 5. Explicit Missing Primitives Disclosure

The 3 primitives missing from the legacy architecture must be displayed transparently in `daRadarView`:
1. `Layer Purity Score` (No 0–100 layer hierarchy purity model exists).
2. `Dependency Health Index` (No normalized fan-in/fan-out balance index exists).
3. `Test Coverage Score` (Node coverage is categorical `COVERED`\|`UNTESTED`\|`AMBIGUOUS`\|`UNKNOWN`, not a project-level aggregate percentage).

---

## 6. Implementation Impact Assessment & Acceptance Criteria

- **Implementation Impact:**
  - Component `daRadarView` will be self-contained native SVG (`0 0 560 440`).
  - Strict zero-dependency implementation (no D3 or external libraries).
  - Read-only consumer of `CONTRACT-01` (`payload.nodes`, `payload.edges`, `payload.cycles`).
- **Testable Acceptance Criteria:**
  1. Radar computes 9 dimensions deterministically matching `radar-adapter.ts`.
  2. Empty payload (`nodes: [], edges: []`) produces zeroed dimensions without NaN or crash.
  3. Malformed payload is handled fail-closed.
  4. Invariant `SELECTION != NAVIGATION` is preserved (axis clicking or hover does not navigate tabs or alter project).
  5. The 3 missing primitives are rendered as disclosure items.

---

## 7. Approval Blocker & Next Actions
- **Current Status:** `AUTHORIZED_BLOCKED_ON_CONTRACT_APPROVAL`.
- **Blocker:** Requires Project Owner formal review and chat approval to ratify CONTRACT-03.
- **Production Guard:** No production files for Task W6-1 (`daRadarView.*`) will be implemented or committed until formal ratification is granted.
