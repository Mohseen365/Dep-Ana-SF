# Wave 4 (`FEAT-STATE-03`): Parallel Dependency and Integration Plan

| Strategy Attribute | Specification |
|---|---|
| **Dispatch Mode** | 6-Lane Concurrent Dispatch with Contract-First Synchronization |
| **Integration Coordinator** | Lead Systems / Integration Engineer |
| **Branching Strategy** | `feature/wave4-lane-[a-f]` merged into `feature/wave4-integration` |

---

## 1. Concurrency Dependency Graph

```
                   +---------------------------------------+
                   |  Step 0: Pre-Dispatch Inspection       |
                   |  (All 6 Lanes Concurrent Read-Only)  |
                   +---------------------------------------+
                                       |
                                       v
                   +---------------------------------------+
                   |  Step 1: Contract-First Publication    |
                   |  Lane A: daFilterSchema.js            |
                   +---------------------------------------+
                                       |
           +---------------------------+---------------------------+
           |                           |                           |
           v                           v                           v
+---------------------+     +---------------------+     +---------------------+
| Lane B: Apex        |     | Lane C: App Shell & |     | Lane D: Graph       |
| Persistence &       |     | Preset Manager LWC  |     | Filter Adapter LWC  |
| Compatibility       |     |                     |     |                     |
+---------------------+     +---------------------+     +---------------------+
           |                           |                           |
           +---------------------------+---------------------------+
                                       |
           +---------------------------+---------------------------+
           |                                                       |
           v                                                       v
+---------------------+                                 +---------------------+
| Lane E: Matrix      |                                 | Lane F: Findings    |
| View LWC            |                                 | View LWC            |
+---------------------+                                 +---------------------+
           |                                                       |
           +---------------------------+---------------------------+
                                       |
                                       v
                   +---------------------------------------+
                   |  Step 3: Master Integration Assembly   |
                   |  Coordinator Verification & Merge     |
                   +---------------------------------------+
```

---

## 2. Integration and Merge Sequence

1. **Phase 0 — Contract Publication (Lane A):**
   - Lane A publishes `daFilterSchema.js` and contract unit tests.
   - Contract is frozen and made available to Lanes B, C, D, E, F.

2. **Phase 1 — Independent Parallel Implementation (Lanes B, C, D, E, F):**
   - Lane B updates `DAUserPreferenceController.cls` for v2 JSON syntax/size handling.
   - Lane C updates `daAppShell` HTML/JS and builds `daPresetManager`.
   - Lane D updates `daGraphViewer` filter adapter.
   - Lane E builds `daMatrixViewer`.
   - Lane F builds `daFindingsViewer`.

3. **Phase 2 — Cross-View Event Wiring (Coordinator + Lanes C/D/E/F):**
   - Verify `filterchange` custom event propagation from `daAppShell` to child views (`daGraphViewer`, `daMatrixViewer`, `daFindingsViewer`).

4. **Phase 3 — Master Regression Suite Verification (Coordinator):**
   - Run `node scratch/salesforce-poc/tests/run-poc-tests.cjs`
   - Run `node scratch/salesforce-poc/tests/run-workstream-a-tests.cjs`
   - Run `node scratch/salesforce-poc/tests/run-workstream-c-tests.cjs`
   - Run `node scripts/test-export-explorer.cjs`
   - Run `npm run test:cli`
   - Target: 224+ passing tests (100% pass rate).
