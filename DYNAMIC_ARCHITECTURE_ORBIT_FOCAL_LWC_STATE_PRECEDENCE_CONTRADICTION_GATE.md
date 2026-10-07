# DYNAMIC ARCHITECTURE ORBIT FOCAL LWC STATE PRECEDENCE CONTRADICTION GATE REPORT

## 1. Executive Verdict

```text
DYNAMIC ARCHITECTURE ORBIT FOCAL STATE PRECEDENCE FAILED
```

---

## 2. Dataset Identity & Canonical Integrity Gate

| Metric | Required | Measured / Verified | Status |
|---|---|---|---|
| Dataset Path | `explorer/public/projects/pbim/explorer-data.json` | `explorer/public/projects/pbim/explorer-data.json` | VERIFIED |
| Dataset SHA-256 | `d6dee0d04e5e296c5f0dc0b2dbbf85e4a79722469b81b008a7fc0855b4e66d7b` | `d6dee0d04e5e296c5f0dc0b2dbbf85e4a79722469b81b008a7fc0855b4e66d7b` | MATCH |
| Total Node Count | `528` | `528` | MATCH |
| Total Edge Count | `2063` | `2063` | MATCH |
| Total LWC Count | `30` | `30` | MATCH |

---

## 3. State Precedence Matrix

Evaluation of stale `layoutOptions.focalLwcId` versus current authoritative `selectedNodeId`:

| Stale focalLwcId | selectedNodeId | Expected focal | Actual focal | Rendered Sun | Result |
|---|---|---|---|---|---|
| `vendor-assignment-panel` | `asset-dashboard-container` | `asset-dashboard-container` | `vendor-assignment-panel` | `vendor-assignment-panel` | **FAIL** |
| `vendor-assignment-panel` | `vendor-workspace` | `vendor-workspace` | `vendor-assignment-panel` | `vendor-assignment-panel` | **FAIL** |
| `vendor-assignment-panel` | `citizen-report-portal` | `citizen-report-portal` | `vendor-assignment-panel` | `vendor-assignment-panel` | **FAIL** |
| `asset-dashboard-container` | `error-panel` | `error-panel` | `asset-dashboard-container` | `asset-dashboard-container` | **FAIL** |
| `vendor-assignment-panel` | `ApexClass:AssetDashboardController` | `vendor-assignment-panel` | `vendor-assignment-panel` | `vendor-assignment-panel` | **PASS** |
| `vendor-assignment-panel` | `null` | `vendor-assignment-panel` | `vendor-assignment-panel` | `vendor-assignment-panel` | **PASS** |

---

## 4. Cross-Layout Matrix

Evaluation of clean state flow across layout transitions when `layoutOptions.focalLwcId` is not explicitly injected as a stale prop:

| Source Mode | Selection | Destination Mode | Expected Sun | Actual Sun | Result |
|---|---|---|---|---|---|
| Hierarchical | `LWC:asset-dashboard-container` | Architecture Orbit | `LWC:asset-dashboard-container` | `LWC:asset-dashboard-container` | **PASS** |
| Orbit | `LWC:vendor-workspace` | Architecture Orbit | `LWC:vendor-workspace` | `LWC:vendor-workspace` | **PASS** |
| Hybrid | `LWC:citizen-report-portal` | Architecture Orbit | `LWC:citizen-report-portal` | `LWC:citizen-report-portal` | **PASS** |
| Constellation | `LWC:error-panel` | Architecture Orbit | `LWC:error-panel` | `LWC:error-panel` | **PASS** |

---

## 5. Runtime State Trace

### Scenario 1: Primary Adversarial Scenario (Section 5)
```text
layoutOptions.focalLwcId: LWC:vendor-assignment-panel (stale prop)
selectedNodeId:          LWC:asset-dashboard-container
effective focalLwcId:    LWC:vendor-assignment-panel
adapter focalLwcId:      LWC:vendor-assignment-panel
rendered Sun ID:         LWC:vendor-assignment-panel
Sun Coordinates:         (0, 0)
Failure Condition:       F1 (stale focalLwcId overrides selectedNodeId), F2, F3
```

### Scenario 2: Adversarial Test 2 (Section 6)
```text
layoutOptions.focalLwcId: LWC:vendor-assignment-panel (stale prop)
selectedNodeId:          LWC:vendor-workspace
effective focalLwcId:    LWC:vendor-assignment-panel
adapter focalLwcId:      LWC:vendor-assignment-panel
rendered Sun ID:         LWC:vendor-assignment-panel
Sun Coordinates:         (0, 0)
Failure Condition:       F1 (stale focalLwcId overrides selectedNodeId), F2, F3
```

### Scenario 3: Adversarial Test 3 (Section 7)
```text
layoutOptions.focalLwcId: LWC:vendor-assignment-panel (stale prop)
selectedNodeId:          LWC:citizen-report-portal
effective focalLwcId:    LWC:vendor-assignment-panel
adapter focalLwcId:      LWC:vendor-assignment-panel
rendered Sun ID:         LWC:vendor-assignment-panel
Sun Coordinates:         (0, 0)
Failure Condition:       F1 (stale focalLwcId overrides selectedNodeId), F2, F3
```

### Scenario 4: Adversarial Test 4 (Section 8)
```text
layoutOptions.focalLwcId: LWC:asset-dashboard-container (stale prop)
selectedNodeId:          LWC:error-panel
effective focalLwcId:    LWC:asset-dashboard-container
adapter focalLwcId:      LWC:asset-dashboard-container
rendered Sun ID:         LWC:asset-dashboard-container
Sun Coordinates:         (0, 0)
Failure Condition:       F1 (stale focalLwcId overrides selectedNodeId), F2, F3
```

---

## 6. Projection Proof

Empirical verification of BFS dependency depth projection calculation in Architecture Orbit:

| Selected Focal LWC | Visible Nodes | Visible Edges | Projected Max Depth |
|---|---|---|---|
| `LWC:asset-dashboard-container` | 128 | 211 | Depth 7 |
| `LWC:vendor-workspace` | 101 | 195 | Depth 6 |
| `LWC:citizen-report-portal` | 102 | 181 | Depth 5 |
| `LWC:error-panel` | 1 | 0 | Depth 0 |

---

## 7. Non-LWC Selection Behavior

When a non-LWC node type (`ApexClass`, `CustomObject`, `CustomField`) is selected:
- `selectedNodeId` points to an entity that is not an LWC (e.g. `ApexClass:AssetDashboardController`).
- `adaptComponentOrbit` checks if the requested focal is an LWC (`type === 'LWC'`).
- Non-LWC selections are rejected from becoming Suns.
- The layout engine falls back to `availableSuns[0]` or the configured default LWC (`LWC:vendor-assignment-panel`).

---

## 8. Loop Safety & Interaction Invariants

- **Layout Invocation Count**: Exactly 1 layout recalculation per selection change or mode transition.
- **Selection Recursion**: Zero infinite state update or layout re-trigger loops detected.
- **Viewport Interaction Stability**: User zoom, pan, and release cycles trigger 0 layout re-invocations and 0 `cy.fit` resets in Orbit mode.

---

## 9. Baseline & Layout Preservation Regressions

- **Hierarchical Mode**: 100% preserved (528 nodes, 2063 edges).
- **Hybrid Mode**: 100% preserved (528 nodes, 2063 edges, feature regions preserved).
- **Architecture Orbit Mode**: Single-focal projection verified.
- **Component Constellation Mode**: 100% preserved (14 Suns, 42 visible nodes, 71 visible edges).

---

## 10. Root Cause Analysis & State Precedence Answer

> **Can a stale `layoutOptions.focalLwcId` override the user's current authoritative `selectedNodeId`?**

**YES.**

### Empirical Evidence & Implementation Trace

In `explorer/src/components/GraphView.tsx` (lines 160–165):

```typescript
const effectiveLayoutOptions = useMemo((): GraphLayoutOptions => {
  return {
    ...layoutOptions,
    enableFeatureLayout,
    enableCandidateDOrdering: architectureMode === 'hierarchical',
    focalLwcId: layoutOptions?.focalLwcId ?? selectedNodeId ?? focusedNodeId ?? null,
  };
}, [enableFeatureLayout, architectureMode, layoutOptions, selectedNodeId, focusedNodeId]);
```

### Mechanism of Failure

1. The nullish coalescing operator (`??`) evaluates expressions from left to right.
2. In `layoutOptions?.focalLwcId ?? selectedNodeId ?? focusedNodeId ?? null`, `layoutOptions?.focalLwcId` appears as the **first operand**.
3. If `layoutOptions.focalLwcId` contains a non-nullish string (e.g., `'LWC:vendor-assignment-panel'`), `layoutOptions?.focalLwcId` evaluates to truthy.
4. The nullish coalescing operator immediately evaluates to `'LWC:vendor-assignment-panel'` without ever evaluating `selectedNodeId`.
5. When the user subsequently selects a new LWC (`selectedNodeId = 'LWC:asset-dashboard-container'`), `effectiveLayoutOptions.focalLwcId` remains pinned to `'LWC:vendor-assignment-panel'`.
6. Architecture Orbit executes layout with `focalLwcId: 'LWC:vendor-assignment-panel'`, rendering the stale component as Sun at (0,0) and ignoring the user's explicit selection.

---

## 11. Final Contract Decision

As mandated by gate governance rules:
- Production code was **NOT** mutated during this validation gate.
- The failure was counterfactually isolated and proven via real-browser Playwright automation.
- State precedence order in `GraphView.tsx` MUST be repaired in a subsequent authorized implementation task so that valid user selection (`selectedNodeId`) overrides previous/stale focal state (`layoutOptions.focalLwcId`).
