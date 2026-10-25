# ARCHITECTURE EXPLORER — PERFORMANCE BASELINE ADVERSARIAL CLOSURE REPORT

## 1. Executive Verdict & Rationale

### Final Verdict: `FAIL`

**Rationale:**
1. **Benchmark Methodology & Sample Contamination Defect:** In `audit-reports/formal_multi_run_benchmark_results.json`, PBIM Hybrid transition sample "Run 3" ($48,650\text{ ms}$) was produced by executing a second script process (`scripts/run-pbim-full-cycles.cjs` cycles 3–5) which reloaded the page (`page.goto`). This reset `layoutRequestRef` to 0 and incurred a cold page warm-up / worker compilation penalty ($48,650\text{ ms}$). The runner erroneously classified this cold page warm-up as a steady-state measured sample, corrupting the steady-state mean from $13,125.25\text{ ms}$ to $20,230.2\text{ ms}$ and expanding the reported range from $4,076\text{ ms}$ to $36,624\text{ ms}$.
2. **Completion-Event Correlation Defect in Benchmark Automation:** The prior report claimed automation scripts await `app:layoutcomplete` "with matching `requestId` and `architectureMode`". Direct source inspection of `scripts/run-formal-performance-baseline.cjs` and `scripts/run-pbim-full-cycles.cjs` reveals that the `handler(evt)` callback in both scripts does **not** validate `evt.detail.requestId` or `evt.detail.architectureMode`. It unconditionally accepts the very first `app:layoutcomplete` event received on `window`, creating event correlation vulnerabilities.
3. **Incomplete Worker Deserialization & Unsafe Type Casting:** The deserialization fix in `explorer/src/lib/workers/layout-worker-client.ts` added `featureId` and `domain`, but omitted essential `DomainRegion` / `FeatureRegion` fields—specifically `width` ($xMax - xMin$) and `height` ($yMax - yMin$). Consequently, `region.width` and `region.height` evaluate to `undefined`, causing SVG `<rect>` elements in `<FeatureOverlayCanvas>` to receive `undefined` dimensions. The cast `as any` masked these missing structural fields from TypeScript compiler checks.
4. **Dataset-Unaware Constellation Projection Boundary:** In `cloud-spend-tracker` ($N=240, E=1024, 26\text{ LWCs}$), Constellation mode renders **1 visible node and 0 visible edges**. This occurs because `adaptComponentConstellation` defaults to `CONTRACTED_14_SUN_IDS` (hardcoded PBIM LWC IDs). In CST, only 1 LWC (`LWC:error-panel`) matches by name, and in CST it has 0 outgoing dependencies, rendering an isolated 1-node graph.
5. **Decision Rule 8 Enforcement:** Under Decision Rule 8, baseline approval must be rejected (`FAIL`) when raw evidence contains contaminated/misclassified samples, event correlation is unvalidated in the harness, and worker deserialization leaves contract gaps.

---

## 2. Repository Provenance & Working Tree State

- **Current Repository Root:** `/app`
- **Current Branch:** `jules-3697488521963049379-f4a19aea`
- **Current HEAD Commit SHA:** `977cb4bc61523de8a749efffbece31e8b18f6eeb`
- **Report Stated HEAD Commit SHA:** `0d960dd79fbe05517b4998a4cf017afba0921c4e`
- **Commit History Relation:**
  - `0d960dd79fbe05517b4998a4cf017afba0921c4e`: Merge pull request #667 ("Instrument layout completion signal").
  - `f7ec61aac596e8c71efa7008a04f8b921c349ddb`: Commit adding formal baseline report and worker deserialization change.
  - `977cb4bc61523de8a749efffbece31e8b18f6eeb`: Merge pull request #668 (Current HEAD).
- **Working-Tree Status:** Clean (`nothing to commit, working tree clean`).
- **User Changes Preserved:** All user changes and prior artifacts remain preserved. No production code, project datasets, or manifest files were modified during this audit.

---

## 3. Artifact Inventory & Raw JSON Availability

| Artifact Path | Git Status | File Size | Modification Date | Purpose / Role |
| :--- | :--- | :--- | :--- | :--- |
| `ARCHITECTURE_EXPLORER_FORMAL_MULTI_RUN_PERFORMANCE_BASELINE_REPORT.md` | Tracked (`100644`) | 17,228 bytes | Oct 12 06:47 | Prior formal baseline report under review. |
| `audit-reports/formal_multi_run_benchmark_results.json` | Tracked (`100644`) | 45,784 bytes | Oct 12 06:47 | Raw benchmark results JSON artifact. |
| `scripts/run-formal-performance-baseline.cjs` | Tracked (`100644`) | 10,434 bytes | Oct 12 06:47 | Primary benchmark runner script. |
| `scripts/run-pbim-full-cycles.cjs` | Tracked (`100644`) | 8,573 bytes | Oct 12 06:47 | Secondary PBIM cycle runner script. |
| `explorer/src/components/GraphView.tsx` | Tracked (`100644`) | 39,210 bytes | Oct 12 06:47 | UI component dispatching `app:layoutcomplete`. |
| `explorer/src/lib/workers/layout-worker-client.ts` | Tracked (`100644`) | 13,842 bytes | Oct 12 06:47 | Web Worker client deserialization logic. |
| `explorer/src/lib/workers/layout.worker.ts` | Tracked (`100644`) | 2,105 bytes | Oct 12 06:47 | Web Worker background execution script. |

---

## 4. Completion-Event Contract Audit

### Event Dispatch Mechanism in `GraphView.tsx`
In `explorer/src/components/GraphView.tsx` (lines 338–359):
```typescript
const notifyComplete = (outcome: 'complete' | 'fallback-complete') => {
  if (typeof window !== 'undefined') {
    const endTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const durationMs = Math.round(endTime - startTime);
    const detail = {
      architectureMode,
      layoutMode: layoutModeRef.current,
      requestId,
      timestamp: Date.now(),
      durationMs,
      outcome,
      nodeCount: nodesRef.current.length,
      edgeCount: edgesRef.current.length,
    };
    (window as any).__LAST_LAYOUT_COMPLETED__ = detail;
    window.dispatchEvent(new CustomEvent('app:layoutcomplete', { detail }));
  }
};
```

### Event Contract Verification Findings
1. **Clock Domain:** `startTime` and `endTime` are recorded using `performance.now()` (microsecond precision in V8) and rounded to integer milliseconds (`durationMs`). `timestamp` uses `Date.now()` (epoch time).
2. **Dispatch Point:** `notifyComplete()` is invoked synchronously inside `.then()` / layout completion blocks **after**:
   - Web Worker computation completes and positions are returned.
   - Cytoscape `cy.batch()` updates node visibility (`show()`/`hide()`) and positions (`node.position(posMap[id])`).
   - State setters `setFeatureRegions` and `setOrbitGuides` are called.
   - Position persistence `captureAndPersistPositions(targetProvenance)` completes.
3. **Stale Request Cancellation:** `if (requestId !== layoutRequestRef.current) return;` prevents stale worker responses from writing positions or emitting completion events.
4. **Runner Event Listener Bug:** The prior report claimed: *"Automation scripts await `window.addEventListener('app:layoutcomplete')` directly with matching `requestId` and `architectureMode`."*
   Inspection of `scripts/run-formal-performance-baseline.cjs` (lines 104–120) and `scripts/run-pbim-full-cycles.cjs` (lines 89–105) reveals:
   ```javascript
   const handler = (evt) => {
     window.removeEventListener('app:layoutcomplete', handler);
     const tEnd = performance.now();
     resolve({ ... detail: evt.detail });
   };
   window.addEventListener('app:layoutcomplete', handler);
   ```
   **Defect:** The event handler does **not** check `evt.detail.requestId` or `evt.detail.architectureMode`. It unregisters and resolves on the **first** `app:layoutcomplete` event dispatched to `window`, regardless of whether it matches the requested transition.
5. **Latency Metric Mismatch:** `durationMs` measures layout computation and Cytoscape position application (`performance.now()` in `useEffect` to `notifyComplete`). `e2eMs` measures Playwright `btn.click()` to receipt of `app:layoutcomplete`. `e2eMs` includes React event dispatching, state updates, effect scheduling, layout compute, DOM batching, and IPC event roundtrip.

---

## 5. Benchmark Methodology & Sample Completeness

### Sample Matrix Audit
The methodology specified 1 warm-up run plus 5 measured runs per transition across 3 dataset tiers (`default`, `cloud-spend-tracker`, `pbim`).

| Dataset Tier | Dataset ID | Transition | Warmup Samples | Measured Samples | Total Samples | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Small** | `default` | Hierarchical -> Hybrid | 1 | 5 | 6 | Complete |
| **Small** | `default` | Hybrid -> Orbit | 1 | 5 | 6 | Complete |
| **Small** | `default` | Orbit -> Constellation | 1 | 5 | 6 | Complete |
| **Small** | `default` | Constellation -> Hierarchical | 1 | 5 | 6 | Complete |
| **Medium** | `cloud-spend-tracker` | Hierarchical -> Hybrid | 1 | 5 | 6 | Complete |
| **Medium** | `cloud-spend-tracker` | Hybrid -> Orbit | 1 | 5 | 6 | Complete |
| **Medium** | `cloud-spend-tracker` | Orbit -> Constellation | 1 | 5 | 6 | Complete |
| **Medium** | `cloud-spend-tracker` | Constellation -> Hierarchical | 1 | 5 | 6 | Complete |
| **Large** | `pbim` | Hierarchical -> Hybrid | 1 | 5 | 6 | **Contaminated** |
| **Large** | `pbim` | Hybrid -> Orbit | 1 | 5 | 6 | Complete |
| **Large** | `pbim` | Orbit -> Constellation | 1 | 5 | 6 | Complete |
| **Large** | `pbim` | Constellation -> Hierarchical | 1 | 5 | 6 | Complete |

---

## 6. Independently Recalculated Statistics & Discrepancies

### 6.1 Layout Latency (`durationMs`) — Recalculation vs Reported

| Dataset | Mode Transition | Reported Min | Recalc Min | Reported Max | Recalc Max | Reported Median | Recalc Median | Reported Mean | Recalc Mean | Reported Range | Recalc Range | Discrepancy? |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `default` | Hybrid | 3 | 3 | 4 | 4 | 3.0 | 3.0 | 3.20 | 3.20 | 1 | 1 | None |
| `default` | Orbit | 1 | 1 | 1 | 1 | 1.0 | 1.0 | 1.00 | 1.00 | 0 | 0 | None |
| `default` | Constellation | 1 | 1 | 1 | 1 | 1.0 | 1.0 | 1.00 | 1.00 | 0 | 0 | None |
| `default` | Hierarchical | 2 | 2 | 4 | 4 | 2.0 | 2.0 | 2.40 | 2.40 | 2 | 2 | None |
| `cloud-spend-tracker` | Hybrid | 1837 | 1837 | 2127 | 2127 | 1879.0 | 1879.0 | 1920.20 | 1920.20 | 290 | 290 | None |
| `cloud-spend-tracker` | Orbit | 393 | 393 | 423 | 423 | 420.0 | 420.0 | 412.40 | 412.40 | 30 | 30 | None |
| `cloud-spend-tracker` | Constellation | 340 | 340 | 371 | 371 | 345.0 | 345.0 | 349.40 | 349.40 | 31 | 31 | None |
| `cloud-spend-tracker` | Hierarchical | 1726 | 1726 | 1790 | 1790 | 1755.0 | 1755.0 | 1756.40 | 1756.40 | 64 | 64 | None |
| `pbim` | Hybrid (All 5) | 12026 | 12026 | 48650 | 48650 | 12242.0 | 12242.0 | 20230.20 | 20230.20 | 36624 | 36624 | **Contaminated Sample** |
| `pbim` | Hybrid (Excl. Run 3) | N/A | **12026** | N/A | **16102** | N/A | **12186.5** | N/A | **13125.25** | N/A | **4076** | **True Steady State** |
| `pbim` | Orbit | 1048 | 1048 | 1211 | 1211 | 1148.0 | 1148.0 | 1133.20 | 1133.20 | 163 | 163 | None |
| `pbim` | Constellation | 876 | 876 | 949 | 949 | 888.0 | 888.0 | 901.00 | 901.00 | 73 | 73 | None |
| `pbim` | Hierarchical | 11428 | 11428 | 11793 | 11793 | 11745.0 | 11745.0 | 11662.60 | 11662.60 | 365 | 365 | None |

### 6.2 End-to-End Latency (`e2eMs`) — Recalculation vs Reported

| Dataset | Mode Transition | Reported Min | Recalc Min | Reported Max | Recalc Max | Reported Median | Recalc Median | Reported Mean | Recalc Mean | Reported Range | Recalc Range | Discrepancy? |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `default` | Hybrid | 7 | 7 | 8 | 8 | 8.0 | 8.0 | 7.60 | 7.60 | 1 | 1 | None |
| `default` | Orbit | 5 | 5 | 6 | 6 | 6.0 | 6.0 | 5.80 | 5.80 | 1 | 1 | None |
| `default` | Constellation | 5 | 5 | 7 | 7 | 5.0 | 5.0 | 5.80 | 5.80 | 2 | 2 | None |
| `default` | Hierarchical | 6 | 6 | 8 | 8 | 7.0 | 7.0 | 6.80 | 6.80 | 2 | 2 | None |
| `cloud-spend-tracker` | Hybrid | 3382 | 3382 | 3953 | 3953 | 3426.0 | 3426.0 | 3543.20 | 3543.20 | 571 | 571 | None |
| `cloud-spend-tracker` | Orbit | 2029 | 2029 | 2139 | 2139 | 2061.0 | 2061.0 | 2076.60 | 2076.60 | 110 | 110 | None |
| `cloud-spend-tracker` | Constellation | 601 | 601 | 638 | 638 | 610.0 | 610.0 | 612.60 | 612.60 | 37 | 37 | None |
| `cloud-spend-tracker` | Hierarchical | 1968 | 1968 | 2022 | 2022 | 1990.0 | 1990.0 | 1994.60 | 1994.60 | 54 | 54 | None |
| `pbim` | Hybrid (All 5) | 22479 | 22479 | 59659 | 59659 | 23296.0 | 23296.0 | 31336.60 | 31336.60 | 37180 | 37180 | **Contaminated Sample** |
| `pbim` | Orbit | 12254 | 12254 | 13061 | 13061 | 12485.0 | 12485.0 | 12618.40 | 12618.40 | 807 | 807 | None |
| `pbim` | Constellation | 918 | 918 | 988 | 988 | 926.0 | 926.0 | 942.40 | 942.40 | 70 | 70 | None |
| `pbim` | Hierarchical | 11466 | 11466 | 11832 | 11832 | 11782.0 | 11782.0 | 11704.60 | 11704.60 | 366 | 366 | None |

*Summary:* The statistical calculations inside `stats()` in the runner script are mathematically exact. However, PBIM Hybrid includes a contaminated sample due to runner process splitting.

---

## 7. PBIM Hybrid Outlier Analysis & Uncertainty

### Telemetry Investigation of Sample Values
PBIM Hybrid reported samples:
- Warm-up: $47,318\text{ ms}$ (`reqId: 1`)
- Run 1: $12,131\text{ ms}$ (`reqId: 5`)
- Run 2: $16,102\text{ ms}$ (`reqId: 9`)
- **Run 3: $48,650\text{ ms}$ (`reqId: 1`)**
- Run 4: $12,242\text{ ms}$ (`reqId: 5`)
- Run 5: $12,026\text{ ms}$ (`reqId: 9`)

### Root-Cause Analysis
1. In `scripts/run-pbim-full-cycles.cjs`, benchmarking for PBIM was split into two separate CLI invocations (`startCycle 0 2` followed by `startCycle 3 5`).
2. Invocation 1 executed Cycle 0 (Warm-up, `reqId: 1`), Cycle 1 (Run 1, `reqId: 5`), and Cycle 2 (Run 2, `reqId: 9`).
3. Invocation 2 launched a **new** Playwright page instance (`page.goto('http://localhost:3000/?project=pbim')`).
4. Re-navigating to the URL reloaded `GraphView.tsx`, resetting `layoutRequestRef` back to 0.
5. Cycle 3 was the **first** transition on the newly loaded page (`reqId: 1`), incurring the full cold warm-up penalty ($48,650\text{ ms}$) for V8 JIT compilation, Web Worker thread spawn, and domain discovery initialization.
6. The script appended Cycle 3 directly into `measuredSamples` under the label `"Run 3"`.

### Impact of Contamination
- **Reported Mean:** $20,230.2\text{ ms}$ (heavily skewed by $48,650\text{ ms}$).
- **True Steady-State Mean (Excl. Run 3):** **$13,125.25\text{ ms}$** (a reduction of $7,104.95\text{ ms}$ or $-35.1\%$).
- **Reported Range:** $36,624\text{ ms}$.
- **True Steady-State Range (Excl. Run 3):** **$4,076\text{ ms}$** (a reduction of $32,548\text{ ms}$ or $-88.9\%$).
- **Budget Validity:** Five samples with a $48.65\text{ s}$ outlier caused by runner process restart **cannot** justify baseline budget approval without re-running PBIM in a clean, unified continuous harness session.

---

## 8. Initial-Load Measurement Validity

### Initial Load Telemetry
- `default` ($N=4, E=3$): $966\text{ ms}$
- `cloud-spend-tracker` ($N=240, E=1024$): $14,613\text{ ms}$
- `pbim` ($N=528, E=2063$): $109,654\text{ ms}$

### Analysis of What Is Included
`initialLoadMs` is measured in Playwright as:
```javascript
const navStart = Date.now();
await page.goto(proj.url, { waitUntil: 'domcontentloaded' });
await page.waitForSelector('.app-layout', { timeout: 180000 });
await page.waitForSelector('[data-testid="architecture-mode-toggle"]', { timeout: 180000 });
const initialLoadMs = Date.now() - navStart;
```

`initialLoadMs` includes:
1. Browser context navigation start & Vite dev server HTTP connection.
2. Vite cold module loading & bundle parsing for 528 components on PBIM.
3. Fetching `/projects/pbim/explorer-data.json` over HTTP loopback.
4. React initial component tree mount & DOM construction.
5. Synchronous Cytoscape graph initialization and initial Hierarchical layout computation on main thread.

### Conclusion on Initial Load
Only **one** initial load sample exists per project in the raw JSON. Initial load duration depends heavily on Vite dev server cold module cache state. It must be explicitly labeled as a **single observation**, not a stable baseline metric.

---

## 9. Source-versus-Projection Validation & CST Constellation Analysis

### Source Graph vs. Visible Projection Matrix

| Dataset | Architecture Mode | Source Nodes | Source Edges | Source LWCs | Visible Projected Nodes | Visible Projected Edges | Projection Ratio (Nodes) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `default` | Hierarchical | 4 | 3 | 1 | 4 | 3 | 100.0% |
| `default` | Hybrid | 4 | 3 | 1 | 4 | 3 | 100.0% |
| `default` | Orbit | 4 | 3 | 1 | 3 | 2 | 75.0% |
| `default` | Constellation | 4 | 3 | 1 | 2 | 1 | 50.0% |
| `cloud-spend-tracker` | Hierarchical | 240 | 1024 | 26 | 240 | 1024 | 100.0% |
| `cloud-spend-tracker` | Hybrid | 240 | 1024 | 26 | 240 | 1024 | 100.0% |
| `cloud-spend-tracker` | Orbit | 240 | 1024 | 26 | 129 | 302 | 53.8% |
| `cloud-spend-tracker` | Constellation | 240 | 1024 | 26 | **1** | **0** | **0.4%** |
| `pbim` | Hierarchical | 528 | 2063 | 30 | 528 | 2063 | 100.0% |
| `pbim` | Hybrid | 528 | 2063 | 30 | 528 | 2063 | 100.0% |
| `pbim` | Orbit | 528 | 2063 | 30 | 131 | 281 | 24.8% |
| `pbim` | Constellation | 528 | 2063 | 30 | 42 | 71 | 8.0% |

### Detailed Analysis of CST Constellation Mode (1 Visible Node / 0 Visible Edges)
1. **Code Path Investigation:** `adaptComponentConstellation` in `explorer/src/lib/adapters/component-constellation-adapter.ts` uses `CONTRACTED_14_SUN_IDS` as its default target Sun list when `options.customSunIds` is omitted:
   - `CONTRACTED_14_SUN_IDS` contains 14 hardcoded PBIM LWC IDs (e.g. `LWC:asset-dashboard-container`, `LWC:vendor-workspace`, `LWC:citizen-report-portal`, etc.).
2. **Execution on CST:** `cloud-spend-tracker` contains 26 LWCs, but only 1 LWC (`LWC:error-panel`) matches any ID in `CONTRACTED_14_SUN_IDS`.
3. **Dependency Projection on CST:** `computeGraphDepths` evaluates outgoing dependencies (`direction: 'dependencies'`) for `LWC:error-panel` at $k=1$. In CST, `LWC:error-panel` is a pure child LWC referenced by admin components and has zero outgoing dependencies (`fanOut = 0`).
4. **Result:** The constellation adapter produces a projection containing exactly 1 Sun (`LWC:error-panel`), 0 child nodes, 0 shared nodes, and 0 edges.
5. **Classification:** This is a valid, deterministic execution of the adapter, but represents a **dataset-specific adapter default limitation** when running Constellation mode on non-PBIM datasets without project-tailored Sun selection parameters.

---

## 10. `FeatureRegion` Deserialization Semantic Audit

### Analysis of `layout-worker-client.ts` Change
The prior report applied the following modification to `explorer/src/lib/workers/layout-worker-client.ts` (lines 266–285):

```typescript
// Convert featureRegionsSummary back to Map<string, FeatureRegion>
let featureRegions: Map<string, FeatureRegion> | undefined;
if (response.featureRegionsSummary && response.featureRegionsSummary.length > 0) {
  featureRegions = new Map<string, FeatureRegion>();
  response.featureRegionsSummary.forEach(sum => {
    featureRegions!.set(sum.id, {
      featureId: sum.id,
      domain: sum.id,
      id: sum.id,
      domainId: sum.domainId,
      xMin: sum.xMin,
      xMax: sum.xMax,
      yMin: sum.yMin,
      yMax: sum.yMax,
      xCenter: sum.xCenter,
      yCenter: sum.yCenter,
      primaryNodeIds: [],
      sharedNodeIds: [],
      satelliteNodeIds: [],
      componentIds: [],
    } as any);
  });
}
```

### Semantic & Contract Verification Findings
1. **Missing `width` and `height` Properties:**
   - `FeatureRegion` extends `DomainRegion` (defined in `explorer/src/lib/layout/global-layout.ts`, line 36), which requires `width: number` and `height: number`.
   - In `<FeatureOverlayCanvas>` (lines 314–340), rendering outer enclosure boxes destructures `width` and `height`:
     `const { featureId, xMin, yMin, width, height } = region;`
   - Because `width` and `height` were **omitted** from the deserialized object, `region.width` and `region.height` evaluate to `undefined`.
   - In SVG rendering, `<rect width={undefined} height={undefined} />` results in invalid SVG DOM attributes (`width="NaN"` or omitted `width`/`height`).
2. **Semantic Field Mappings:**
   - `featureId: sum.id` is semantically correct (`sum.id` holds the feature ID, e.g. `'feature-1'`).
   - `domain: sum.id` is acceptable as a fallback because in feature layout mode, `DomainRegion.domain` is set to `featureId`.
   - `domainId: sum.domainId` is correctly preserved from the worker summary payload.
3. **Unsafe Type Assertion (`as any`):**
   - The type assertion `as any` was used to bypass TypeScript compile errors caused by omitting `width` ($xMax - xMin$), `height` ($yMax - yMin$), `primaryLayer`, `orderIndex`, and `nodeCount`.
   - This masked a structural contract gap from static analysis.

---

## 11. Exact Tests & Commands Executed

### Command 1: Master CLI Integration Suite
```bash
npm run test:cli
```
- **Execution Context:** Root workspace directory (`/app`) in bash sandbox.
- **Outcome:** **31 / 31 test scripts passed** (Exit Code `0`).
- **Pass Verification:** All CLI test scripts (including `test-phase6-performance.cjs`, `test-phase1f-contract.cjs`, `test-pbim-dedicated-data-path.cjs`) executed and passed 100%.

### Command 2: Vitest Frontend Integration Suite
```bash
cd explorer && npx vitest run src/test/static-constellation-projection.test.ts src/test/component-orbit-integration.test.ts src/test/PhaseIntegrationVerification.test.tsx src/components/GraphView.layoutModeToggle.test.tsx
```
- **Execution Context:** `explorer/` directory in bash sandbox.
- **Outcome:** **Execution Blocked (Environment Constraint)**.
- **Error:** `Error [ERR_MODULE_NOT_FOUND]: Cannot find package 'vitest' imported from /app/explorer/vitest.config.ts`.
- **Diagnosis:** `node_modules` inside `explorer/` is uninstalled in the containerized sandbox environment. CLI Node integration tests (`npm run test:cli`) execute natively using Node.js built-in modules and pass completely, whereas Vitest execution in `explorer/` requires local package installation.

---

## 12. Supported, Unsupported, and Unresolved Claims

### Supported Claims
- `app:layoutcomplete` custom DOM event and `window.__LAST_LAYOUT_COMPLETED__` global property are properly instrumented in `GraphView.tsx` and dispatch synchronously after position computation, Cytoscape element batch updates, and position persistence.
- Single-thread vs Web Worker offloading threshold ($N \ge 20$) functions as intended, routing small graphs ($N=4$) synchronously and larger graphs ($N \ge 240$) to `LayoutWorkerClient`.
- CLI integration test suite (`npm run test:cli`) is 100% passing (31/31 scripts).
- CST Constellation 1-node / 0-edge projection is a deterministic output of `adaptComponentConstellation` driven by hardcoded PBIM Sun IDs.

### Unsupported Claims
- **Unsupported:** Claiming that $12,242\text{ ms}$ PBIM Hybrid median is supported by 5 valid steady-state samples. Sample "Run 3" ($48,650\text{ ms}$) was a cold page re-navigation warm-up misclassified as a measured run.
- **Unsupported:** Claiming that the benchmark runner scripts filter `app:layoutcomplete` events by `requestId` or `architectureMode`. Direct source inspection proves the handler in both benchmark scripts resolves unconditionally on the first received event.
- **Unsupported:** Claiming that worker `FeatureRegion` deserialization is fully type-safe. The object lacks `width` and `height`, and `as any` masks the contract mismatch.
- **Unsupported:** Claiming initial load latency ($109.65\text{ s}$ on PBIM) is a stable baseline. It represents a single observation dependent on Vite dev server cold cache state.

### Unresolved Claims
- Headed browser frame-rate, CSS transition settlement latency, and discrete GPU render convergence characteristics remain unmeasured in headless Chromium sandbox environments.

---

## 13. One Minimal Next Action Grounded in Evidence

### Recommended Action
Repair the benchmark runner script (`scripts/run-pbim-full-cycles.cjs`) to execute all PBIM measured runs within a **single, continuous browser session** without re-navigating pages or resetting worker request state, and update `layout-worker-client.ts` to explicitly calculate `width: sum.xMax - sum.xMin` and `height: sum.yMax - sum.yMin` during `FeatureRegion` deserialization without relying on `as any`.

---

## 14. Confirmation of Non-Mutation

**Explicit Confirmation:** No production source code, project datasets (`/explorer/public/projects/`), or project manifests (`project-manifest.json`) were created, modified, overwritten, or deleted during this audit.
