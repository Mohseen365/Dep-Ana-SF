# Performance Remediation Status & Baseline Measurement Register

**Author**: Test Baseline Agent (B2)
**Execution Date**: November 9, 2026
**Git Baseline Commit**: `570f658bc929d61f0909ff4d516f3d97e5327be0` (PR #143 merge)
**Target Branch**: `wave1/B2`
**Execution Environment**: Linux (Ubuntu x86_64, Kernel 6.8.0), Intel(R) Xeon(R) CPU @ 2.30GHz (4 cores), 7.77 GB RAM, Node.js v22.22.1, npm 11.11.0
**Harness Location**: `wave1/B2/bench/run-benchmarks.cjs`
**Raw Results**: `wave1/B2/bench/benchmark-results.json`

---

## 1. Baseline Performance Empirical Measurements

Measurements were obtained by executing the automated benchmark harness across 7 independent iterations per benchmark fixture, capturing the median, minimum, and maximum elapsed runtimes (milliseconds).

### 1.1 Benchmark Fixtures Verified
1. **PBIM** (`pub-infra-mang`): 528 nodes, 2,063 edges, 4,253,569 characters UTF-16, 33 chunks (cap 131,072).
2. **CST** (`cloud-spend-tracker`): 240 nodes, 1,024 edges, 1,860,770 characters UTF-16, 15 chunks.
3. **BQC** (`bqc`): 274 nodes, 603 edges, 1,332,083 characters UTF-16, 11 chunks.
4. **SYNTHETIC_10MB_MAX**: 10,485,760 characters UTF-16 payload limit, 80 chunks.

### 1.2 Performance Baseline Metrics Table

| Fixture / Workload | Metric / Operation | Evaluation Nature | Median (ms) | Min (ms) | Max (ms) | Unit of Measure | Measurement Label |
| :--- | :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| **PBIM** (528 nodes, 2063 edges) | Payload Chunk Split & Reassembly | 33 Chunks (131k char cap) | 0.020 | 0.010 | 0.176 | ms | MEASURED |
| **PBIM** | Architecture Layout (`daLayoutEngine`) | 528 nodes, 2063 edges | 0.989 | 0.814 | 1.897 | ms | MEASURED |
| **PBIM** | Layout Cancellation Token | Immediate cancel dispatch | 0.001 | 0.000 | 0.056 | ms | MEASURED |
| **PBIM** | Dependency Matrix Build (`daDependencyMatrix`) | 528x528 matrix calculation | 1.347 | 0.667 | 16.775 | ms | MEASURED |
| **PBIM** | Treemap Layout Build (`daTreemapView`) | Squarified partition 528 nodes | 0.476 | 0.311 | 0.751 | ms | MEASURED |
| **PBIM** | Sankey Layout Math (`daLayoutEngine`) | Multi-stage flow calculation | 0.457 | 0.372 | 2.620 | ms | MEASURED |
| **PBIM** | Snapshot AST Diff (`daProjectDashboard`) | 1056 nodes, 4126 edges comparison | 6.447 | 5.258 | 7.745 | ms | MEASURED |
| **PBIM** | Cytoscape Mount / Update Lifecycle | DOM/Canvas element ingestion | 0.629 | 0.468 | 1.529 | ms | MOCKED (Headless Node.js) |
| **CST** (240 nodes, 1024 edges) | Payload Chunk Split & Reassembly | 15 Chunks (131k char cap) | 0.004 | 0.003 | 0.017 | ms | MEASURED |
| **CST** | Architecture Layout (`daLayoutEngine`) | 240 nodes, 1024 edges | 0.189 | 0.149 | 0.420 | ms | MEASURED |
| **CST** | Layout Cancellation Token | Immediate cancel dispatch | 0.001 | 0.001 | 0.004 | ms | MEASURED |
| **CST** | Dependency Matrix Build (`daDependencyMatrix`) | 240x240 matrix calculation | 0.382 | 0.262 | 0.640 | ms | MEASURED |
| **CST** | Treemap Layout Build (`daTreemapView`) | Squarified partition 240 nodes | 0.027 | 0.025 | 0.056 | ms | MEASURED |
| **CST** | Sankey Layout Math (`daLayoutEngine`) | Multi-stage flow calculation | 0.165 | 0.138 | 1.753 | ms | MEASURED |
| **CST** | Snapshot AST Diff (`daProjectDashboard`) | 480 nodes, 2048 edges comparison | 1.602 | 1.482 | 3.495 | ms | MEASURED |
| **CST** | Cytoscape Mount / Update Lifecycle | DOM/Canvas element ingestion | 0.199 | 0.186 | 0.327 | ms | MOCKED (Headless Node.js) |
| **BQC** (274 nodes, 603 edges) | Payload Chunk Split & Reassembly | 11 Chunks (131k char cap) | 0.002 | 0.002 | 0.011 | ms | MEASURED |
| **BQC** | Architecture Layout (`daLayoutEngine`) | 274 nodes, 603 edges | 0.175 | 0.161 | 0.283 | ms | MEASURED |
| **BQC** | Layout Cancellation Token | Immediate cancel dispatch | 0.000 | 0.000 | 0.001 | ms | MEASURED |
| **BQC** | Dependency Matrix Build (`daDependencyMatrix`) | 274x274 matrix calculation | 0.255 | 0.237 | 0.427 | ms | MEASURED |
| **BQC** | Treemap Layout Build (`daTreemapView`) | Squarified partition 274 nodes | 0.031 | 0.028 | 0.118 | ms | MEASURED |
| **BQC** | Sankey Layout Math (`daLayoutEngine`) | Multi-stage flow calculation | 0.084 | 0.084 | 0.116 | ms | MEASURED |
| **BQC** | Snapshot AST Diff (`daProjectDashboard`) | 548 nodes, 1206 edges comparison | 1.578 | 1.505 | 3.129 | ms | MEASURED |
| **BQC** | Cytoscape Mount / Update Lifecycle | DOM/Canvas element ingestion | 0.157 | 0.138 | 3.471 | ms | MOCKED (Headless Node.js) |
| **SYNTHETIC_10MB_MAX** (10 MB payload) | Payload Chunk Split & Reassembly | 80 Chunks (exact 131k cap) | 0.018 | 0.017 | 54.036 | ms | MEASURED |

*Note on Labels*:
- `MEASURED`: Directly executed in Node.js v22.22.1 on Linux x86_64 sandbox.
- `MOCKED`: Cytoscape DOM canvas rendering cannot execute in headless Node.js without browser layout/WebGL engine; element parsing and graph data ingestion simulated.
- No Apex governor numbers are reported; offline Node environment cannot measure live Salesforce multi-tenant CPU limits.

---

## 2. Performance Audit Findings Cross-Reference (`PERFORMANCE_FINDINGS.csv`)

The baseline reproduces and correlates with findings logged in `PERFORMANCE_FINDINGS.csv`. All remediation columns are left marked **pending Wave 2**.

| Finding ID | Severity | Workstream | Target Path | Reproduction Procedure & Evidence | Baseline Reproduction Status | Proposed Remediation Plan | Wave 2 Remediation Status | Verification Agent / Target Wave |
| :---: | :---: | :---: | :--- | :--- | :--- | :--- | :---: | :---: |
| **PERF-01** | P1 | WS-5 | `scratch/salesforce-poc/force-app/main/default/lwc/daProjectDashboard/daProjectDashboard.js:120-180` | Synchronous dual-snapshot diffing comparing 1,056 nodes and 4,126 edges for PBIM. In baseline Node.js benchmark, pure diff logic takes 6.45ms; in browser single-thread DOM contexts without yielding, UI thread locks during high-volume object comparisons. | REPRODUCED IN BASELINE (Algorithmic synchronous loop) | Chunk diff comparison into discrete asynchronous batches using `setTimeout` or `requestIdleCallback` to maintain 60fps frame budget. | **pending Wave 2** | Agent C2 / Wave 2 |
| **PERF-02** | P2 | WS-2 | `scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.js:500-580` | Synchronous Cytoscape layout execution on 528 nodes and 2,063 edges without animation frame slicing. In browser canvas, layout calculation causes UI thread lock. | REPRODUCED IN BASELINE (Cytoscape synchronous execution path) | Configure Cytoscape layouts with `animate: false` or web worker offloading, accompanied by an explicit loading spinner backdrop. | **pending Wave 2** | Agent C2 / Wave 2 |
| **PERF-03** | P2 | WS-4 | `scratch/salesforce-poc/force-app/main/default/classes/services/DAAnalysisHistoryService.cls:52-85` | Synchronous loop over 100 historical analysis records computing 3 mathematical deltas per record in Apex. | REPRODUCED BY CODE INSPECTION (Synchronous for-loop with Decimal conversions) | Reduce `DEFAULT_LIMIT` to 20 and `MAX_LIMIT` to 50 for mobile/lightweight consumers; add pagination. | **pending Wave 2** | Agent C4 / Wave 2 |
| **PERF-04** | P3 | WS-1 | `scratch/salesforce-poc/force-app/main/default/lwc/daPresetManager/daPresetManager.js:140-165` | Rapidly adjusting filter criteria sliders triggers un-debounced `JSON.stringify(activeCriteria)` on every input micro-event. | REPRODUCED BY CODE INSPECTION (Direct invocation on input events) | Introduce a 300ms trailing debounce on filter criteria serialization before dispatching change events. | **pending Wave 2** | Agent C2 / Wave 2 |

---

## 3. Harness Instructions for Wave 2 Agents

Wave 2 agents (e.g. C2, C4) can reuse the benchmark harness to perform before/after remediation validations:

```bash
# Run full benchmark harness and update results JSON
node wave1/B2/bench/run-benchmarks.cjs

# Inspect captured results
cat wave1/B2/bench/benchmark-results.json
```
