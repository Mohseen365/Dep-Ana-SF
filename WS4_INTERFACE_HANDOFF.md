# Workstream 4 (WS-4) Interface Handoff

## 1. Executive Summary & Workstream Boundaries
- **Workstream:** Workstream 4 (WS-4) — Advanced Visualization Views
- **Responsible Agent:** Jules Agent 4
- **Date:** 9 November 2026
- **Target Audience:** Integration Coordinator, Workstream A Lead, Workstream B Lead

This document records the cross-workstream contracts, status of migrated components, layout-engine dependency specifications, and boundary assessments for Priority 3 (Sankey River) and Priority 4 (Four-Direction View).

---

## 2. Component Portfolio Status

| Component | Status | Governing Contract | Test Runner | File Ownership |
|---|---|---|---|---|
| `daArchitectureDnaBarcode` | `IMPLEMENTED` (Harden Verified) | CONTRACT-01, CONTRACT-06 | `run-w7-2-tests.cjs` (7/7 pass) | WS-4 / Task W7-2 |
| `daSubwayView` | `IMPLEMENTED` (Harden Verified) | CONTRACT-01, CONTRACT-06 | `run-w6-3-tests.cjs` (7/7 pass) | WS-4 / Task W6-3 |
| `daTreemapView` | `IMPLEMENTED` (Harden Verified) | CONTRACT-01, CONTRACT-06 | `run-w6-2-tests.cjs` (7/7 pass) | WS-4 / Task W6-2 |
| `daRadarView` | `IMPLEMENTED` | CONTRACT-01, CONTRACT-03 | `run-w6-1-tests.cjs` (10/10 pass) | WS-4 / Task W6-1 |
| `daSankeyView` | `DEFERRED_PENDING_COORDINATOR` | CONTRACT-02 (Layout Engine) | N/A (Awaiting coordinator path assignment) | WS-2 / WS-4 Boundary |
| `daFourDirectionView` | `BLOCKED_SCOPE_UNASSIGNED` | Unassigned / Out of Scope | N/A (Awaiting coordinator scope confirmation) | Unassigned |

---

## 3. Priority 3 — Sankey River Dependency Interface Specification

### 3.1 Background & Governance Truth
In the canonical 21-task register (`WAVE_0_4_AUTHORITATIVE_FINAL_TASK_AND_DEPENDENCY_REGISTER.csv`), Sankey layout calculation is governed under:
- **Task ID:** `W5-3` (Constellation & Sankey Layout Extensions)
- **Workstream Owner:** Workstream A Lead
- **Owned Target Paths:** `scratch/salesforce-poc/force-app/main/default/lwc/daLayoutEngine/daLayoutEngine.js`, `scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.js`
- **Dependency Status:** Blocked on W5-2 to avoid concurrent write collisions on `daLayoutEngine.js`.

### 3.2 Required Layout Interface for Standalone `daSankeyView`
When the Integration Coordinator assigns the standalone `daSankeyView` LWC path, the component requires the following stable layout interface from `daLayoutEngine` (derived from `explorer/src/lib/layout/sankey-layout.ts` and `explorer/src/lib/adapters/sankey-adapter.ts`):

```typescript
export interface SankeyStageGeometry {
  layer: string;
  label: string;
  orderIndex: number;
  x: number;
  width: number;
}

export interface SankeyNodeGeometry {
  nodeId: string;
  stageIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
  flowVolume: number;
}

export interface SankeyFlowGeometry {
  flowId: string;
  sourceFeatureId: string;
  targetFeatureId: string;
  weight: number;
  strokeWidth: number;
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  pathString: string; // Cubic Bézier curve
  isSelfFlow: boolean;
}

export interface SankeyLayoutResult {
  width: number;
  height: number;
  stages: SankeyStageGeometry[];
  nodes: SankeyNodeGeometry[];
  flows: SankeyFlowGeometry[];
}
```

WS-4 has deliberately refrained from modifying `daLayoutEngine.js` or `daGraphViewer.js`, respecting the exclusive ownership of Workstream A.

---

## 4. Priority 4 — Four-Direction View Scope & Gaps Analysis

### 4.1 Planning Discrepancy
- In `docs/audits/salesforce-migration-phase-3/PHASE_3_COMPLETE_FUNCTIONAL_PARITY_MATRIX.csv`, the Four-Direction view is listed as `VIEW-16: Four-Direction Expansion (four-direction)` (P2 priority).
- However, in the authoritative canonical 21-task register (`WAVE_0_4_AUTHORITATIVE_FINAL_TASK_AND_DEPENDENCY_REGISTER.csv`) and the exhaustive 175-path manifest (`WAVE_0_4_EXHAUSTIVE_FILE_OWNERSHIP_MANIFEST.csv`), **no task or paths exist** for `daFourDirectionView`.
- In `ARCHITECTURAL_REVIEW_FACTUAL_AUDIT.md`, this is explicitly flagged: *"True denominator: 5 enumerated views (or 6 if including daFourDirectionView)"*.

### 4.2 React Reference Analysis
- **React Component:** `explorer/src/components/FourDirectionPanel.tsx` (14.8 KB)
- **React Adapter:** `explorer/src/lib/adapters/four-direction-adapter.ts` (`adaptFourDirectionView`, `FourDirectionData`, `FourDirectionQuadrant`)
- **Behavior:** Renders a cardinal compass view centered on an active focus component:
  - North: Inbound dependencies (upstream callers).
  - South: Outbound dependencies (downstream callees).
  - East: Peer dependencies (same layer / package).
  - West: External / third-party dependencies.

### 4.3 Required Paths if Authorized by Integration Coordinator
If authorized in a future wave, the following paths must be formally allocated by the Integration Coordinator:
1. `scratch/salesforce-poc/force-app/main/default/lwc/daFourDirectionView/daFourDirectionView.js`
2. `scratch/salesforce-poc/force-app/main/default/lwc/daFourDirectionView/daFourDirectionView.html`
3. `scratch/salesforce-poc/force-app/main/default/lwc/daFourDirectionView/daFourDirectionView.css`
4. `scratch/salesforce-poc/force-app/main/default/lwc/daFourDirectionView/daFourDirectionView.js-meta.xml`
5. `scratch/salesforce-poc/tests/run-four-direction-tests.cjs`

**Current Action:** Held as unassigned out-of-scope until coordinator scope authorization is issued.

---

## 5. Shared Contract Adherence
- **CONTRACT-01:** All components consume canonical `{ summary, nodes, edges, cycles }` graph payloads without mutating the source input.
- **CONTRACT-06:** All node selections emit `CustomEvent('nodeselect', { detail: { nodeId, node, sourceView }, bubbles: true, composed: true, cancelable: false })`.
- **SELECTION != NAVIGATION:** Node selection never alters the active project, tab, or router state.
