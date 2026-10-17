# REMEDIATION STAGE 2B — DISPATCHER & WORKER RELIABILITY REPORT

**Lane B Ownership:** `explorer/src/lib/graph-layout.ts`, `explorer/src/lib/workers/layout-worker-client.ts`, and directly scoped tests.

---

## 1. Issue Dispositions Summary

| Issue ID | File | Description | Disposition / Action Taken | Status |
|---|---|---|---|---|
| **#7 / D6** | `graph-layout.ts` | `useArchitectureLayout: false` ignored in `getLayoutOptions` / `createLayout` | Added `useArchitectureLayout !== false` check to force `fcose` layout when false | **FIXED** |
| **D7** | `graph-layout.ts` | Preset options from `options.nodes` differs from Cytoscape nodes | Fallback positions evaluate `node.position()` on Cytoscape node instance | **FIXED** |
| **D8** | `graph-layout.ts` | Async non-arch fallback reported 0 durations | Measured actual elapsed time with `performance.now()` in non-arch async branch | **FIXED** |
| **D9** | `layout-worker-client.ts` | No worker cancellation or timeout | Added `timeoutMs` (10s default), request cancellation via `cancelPendingRequest`, and listener cleanup | **FIXED** |
| **D10** | `layout-worker-client.ts` | `projectedNodeIds` Set serialization loss | Converted `response.projectedNodeIds` to `Set<string>` and `featureRegionsSummary` to `Map<string, FeatureRegion>` | **FIXED** |
| **D12** | `graph-layout.ts` | Non-arch fallback returned partial result shape | Returned complete `ArchitectureLayoutResultWithMetadata` shape (`featureRegions: undefined`, etc.) | **FIXED** |
| **D13** | `graph-layout.ts` | Non-arch fallback did not fit or emit events | Added `cy.fit()` and paired `cy.emit('layoutstart')` / `cy.emit('layoutstop')` events | **FIXED** |
| **D18** | `graph-layout.ts` | Redundant extraction from `cy` when options provided | Skipped `extractNodesAndEdgesFromCy` when `options.nodes` and `options.edges` are provided | **FIXED** |
| **D19** | `layout-worker-client.ts` | `existingPositions` handling and caller mutation | Defaulted positions safely without mutating caller options, nodes, or edges | **FIXED** |
| **D25** | `graph-layout.ts` | `LAYOUT_PRESETS` contained `cose`-specific keys | Updated `LAYOUT_PRESETS` with options compatible across preset and fcose layouts | **FIXED** |
| **D26** | `graph-layout.ts` | `getLayoutOptions` node count assumption | Computed density using `options.nodeCount`, `options.nodes.length`, or `cy.nodes().length` | **FIXED** |
| **D27 / #10** | `graph-layout.ts` | Non-animated sync arch branch never emitted `layoutstop` | Emitted paired `layoutstart` and `layoutstop` events around non-animated position updates | **FIXED** |
| **D29** | `graph-layout.ts` | `{ x: 0, y: 0 }` origin stacking fallback | Changed fallback to `node.position()` on Cytoscape node instances | **FIXED** |
| **O25** | `graph-layout.ts` | Non-arch fallback ignored `existingPositions` | Applied `existingPositions` to `cy` and used preset layout when `existingPositions` supplied | **FIXED** |

---

## 2. Test Evidence & Verification Commands

### 2.1 Targeted Vitest Suite Execution
```bash
cd explorer && npx vitest run src/lib/graph-layout.test.ts src/lib/workers/layout-worker-client.test.ts
```
**Output:**
```
 RUN  v2.1.9 /app/explorer

 ✓ src/lib/graph-layout.test.ts (7 tests) 83ms
 ✓ src/lib/workers/layout-worker-client.test.ts (6 tests) 140ms

 Test Files  2 passed (2)
      Tests  13 passed (13)
```
**Exit Status:** `0` (PASS)

### 2.2 Canonical Root CLI Integration Test Suite
```bash
npm run test:cli
```
**Output Summary:**
- Worker Geometry & Event Correlation Test Suite: 4/4 PASSED
- Overlap Checker Core Unit Test Suite: 10/10 PASSED
- Remediation Stage 0 Test Suite: 8/8 PASSED
- Deterministic Architecture Decision Context Suite: 20/20 PASSED
- Deterministic LLM Usage Accounting Suite: 16/16 PASSED
- Deterministic Investigation Context Minimizer Suite: 17/17 PASSED
- Deterministic Investigation Eligibility Suite: 15/15 PASSED

**Exit Status:** `0` (PASS)

---

## 3. Files Modified

1. `explorer/src/lib/graph-layout.ts`
   - Fixed `useArchitectureLayout: false` check, preset node fallback positions, real duration calculation, full metadata shape returns, paired layout events, extraction skipping, layout presets, node density calculations, and `existingPositions` support.
2. `explorer/src/lib/workers/layout-worker-client.ts`
   - Fixed worker cancellation, timeout handling, listener cleanup, `Set`/`Map` reconstruction, and safe position option defaults without caller mutation.
3. `explorer/src/lib/graph-layout.test.ts`
   - Added unit tests for dispatcher routing, fallback positions, duration timing, full result shapes, event pairing, and extraction skipping.
4. `explorer/src/lib/workers/layout-worker-client.test.ts`
   - Added unit tests for worker cancellation, timeouts, Set/Map serialization reconstruction, caller input immutability, and error handling listener cleanup.

---

## 4. Integrity & Isolation Confirmation

- **Forbidden Files Untouched:**
  - `explorer/src/lib/architecture-layout.ts` — UNTOUCHED
  - `explorer/src/components/GraphView.tsx` — UNTOUCHED
  - `explorer/src/App.tsx` — UNTOUCHED
  - Persistence files (`projectState.ts`, `preferences.ts`) — UNTOUCHED
  - Orbit / Constellation adapter files — UNTOUCHED
- **Protected Baseline Artifact Preserved:**
  - `last_commit_changes.txt` verified intact (SHA-256: `e834467bd4a5168f5b5dcc972c49d7456f0df78d7121a1a491648fb33ec8bedb`).
- **Unresolved Integration Dependencies:** None. All Stage 2B dispatcher and worker contracts are verified stable and passing.
