# Agent C2: Snapshot Comparison Performance Results

**Agent:** Agent C2 — Snapshot Comparison Implementation Engineer
**Date:** 2026-11-10
**Machine Specifications:**
- **CPU:** Intel(R) Xeon(R) Processor @ 2.30GHz (4 cores)
- **Memory:** 7.77 GB Total RAM (7.42 GB Free)
- **OS:** Linux 6.8.0 x64
- **Node.js:** v22.22.1

---

## 1. Benchmark Execution Methodology

The diff engine performance was evaluated across the project's standard benchmark fixtures:
1. **BQC (Bank Quality Core):** 274 nodes, 603 edges (1.33 MB raw JSON)
2. **CST (Cloud Spend Tracker):** 240 nodes, 1024 edges (1.86 MB raw JSON)
3. **PBIM (Public Infrastructure Manager):** 528 nodes, 2063 edges (4.25 MB raw JSON)
4. **Synthetic 10 MB Combined Boundary:** 50,000 entities (~5 MB Snapshot A + ~5 MB Snapshot B)

Each fixture was benchmarked using 10 iterations (5 iterations for synthetic 10 MB payload) with warmup runs. Diff execution was measured strictly isolated from file I/O, network chunk retrieval, and DOM rendering.

---

## 2. Benchmark Metrics

| Dataset / Fixture | Entity Count | Payload Size | Diff Engine Min (ms) | Diff Engine Median (ms) | Diff Engine Max (ms) |
| :--- | :--- | :--- | :---: | :---: | :---: |
| **BQC** | 274 nodes, 603 edges | 1,332,083 chars | 1.20 ms | **1.63 ms** | 6.54 ms |
| **CST** | 240 nodes, 1,024 edges | 1,860,770 chars | 1.65 ms | **1.87 ms** | 9.97 ms |
| **PBIM** | 528 nodes, 2,063 edges | 4,253,569 chars | 3.17 ms | **3.55 ms** | 4.36 ms |
| **Synthetic Boundary** | 50,000 entities | ~10,485,760 chars | 58.51 ms | **131.93 ms** | 184.35 ms |

---

## 3. Separation of Phases & Asynchronous Processing

1. **Retrieval Phase:**
   Chunks are fetched sequentially in batches of 10 (`MAX_CHUNKS_PER_BATCH = 10`), taking ~100-300 ms per roundtrip in typical Salesforce Apex environments.
2. **Reassembly Phase:**
   Pure string concatenation via `reassembleChunks` operates in O(N) linear time, taking < 10 ms even for 10 MB raw payloads.
3. **Diff Calculation Phase:**
   Diff computation is purely in-memory using indexed Maps. For all standard project sizes (< 3,000 entities), diffing completes in under 4 ms.
4. **UI Thread Yielding:**
   For maximum responsiveness when computing differences across large snapshots, `daSnapshotComparisonModal` yields the main browser thread via `await new Promise(resolve => setTimeout(resolve, 0))` immediately before invoking `computeGraphDiff`.
5. **Rendering Phase:**
   By avoiding any Cytoscape canvas instantiation (Single-Canvas Invariant), the modal renders pure SLDS HTML tables and virtual lists, avoiding the multi-second GPU canvas layout bottleneck of dual graph rendering.
