# WAVE 4 Payload Pagination and Integrity Report

## 1. Objective & Architectural Scope
This report documents the payload pagination architecture, client race-condition hardening, and benchmark fixture size reconciliation for the Dependency Analyzer Salesforce POC.

## 2. Bounded Chunk Retrieval Architecture
1. **Metadata-First Controller Endpoint**:
   - `DAGraphController.getLatestGraphMetadataForProject(projectId)` returns `DAGraphDTO` containing `projectId`, `projectName`, `projectKey`, `runId`, `isChunked`, and `totalChunks` without transferring raw graph chunks in the initial call.
2. **Bounded Chunk Retrieval Endpoint**:
   - `DAGraphController.getGraphChunks(runId, startIndex, maxChunks)` fetches a bounded range of `DA_Graph_Chunk__c` records.
   - Enforces a hard ceiling capping `maxChunks` at 10 chunks per SOQL query.
   - Validates `runId` existence and ownership using `WITH USER_MODE`.
3. **Sequential Paginated LWC Client & Stale Request Protection**:
   - `daGraphViewer` sequentially requests chunk batches (default `pageSize = 5`).
   - Implements `currentRequestId` tracking to discard in-flight fetch responses if `recordId` changes rapidly during paginated retrieval.
   - Enforces Cytoscape instance destruction (`cyInstance.destroy()`) on re-render and unmount to prevent memory leaks and duplicate graph rendering.
   - Standardizes index verification via `verifyChunkSequence(chunks, expectedStartIndex)` using numeric coercion `Number(expectedStartIndex) + i`.

## 3. Payload Benchmark Metric Reconciliation

### Discrepancy Investigation
- **Earlier Wave 2 Reports**: Reported PBIM at ~4.25 MB, BQC at ~1.33 MB, and CST at ~1.86 MB.
- **Wave 3 Report**: Reported PBIM at ~1.25 MB (13 chunks), BQC at ~450 KB (5 chunks), and CST at ~520 KB (6 chunks).
- **Wave 4 Direct Physical Measurement**: Performed direct physical disk inspection, string length measurement, and UTF-8 byte calculation on actual canonical fixture files (`explorer/public/projects/{pbim,bqc,cst}/explorer-data.json`).

### Verified Physical Benchmark Metrics (100,000 Char Chunk Rule)

| Fixture Project | File Size (Bytes) | JS String Length (Chars) | UTF-8 Byte Length | Exact Chunks (100k limit) | Final Chunk Size (Chars) | Requests (Batch Size = 1) | Requests (Batch Size = 5) | Requests (Batch Size = 10) | Nodes | Edges |
|---|---|---|---|---|---|---|---|---|---|---|
| **PBIM** | 4,253,569 | 4,253,569 | 4,253,569 | 43 | 53,569 | 43 | 9 | 5 | 528 | 2,063 |
| **BQC** | 1,332,083 | 1,332,083 | 1,332,083 | 14 | 32,083 | 14 | 3 | 2 | 274 | 603 |
| **CST** | 1,860,770 | 1,860,770 | 1,860,770 | 19 | 60,770 | 19 | 4 | 2 | 240 | 1,024 |

### Root Cause of Discrepancy
The Wave 3 report contained manual miscalculations that underestimated payload sizes by ~3.4x. The actual underlying offline POC test suite (`run-poc-tests.cjs`) in Wave 3 dynamically read the full disk fixture files, processing all 43, 14, and 19 chunks respectively. Wave 2 figures were physically accurate; Wave 4 has now reconciled all metrics and updated automated assertions to enforce exact disk size parity.

## 4. Client Integrity Hardening Summary
- **Stale Request Handling**: Discards out-of-order async responses during rapid project context switches.
- **Lifecycle Cleanup**: Explicitly cleans up Cytoscape instances on unmount/re-render.
- **Multibyte UTF-8 Boundary Safety**: Verified that chunking and reassembling UTF-8 multibyte characters (Japanese, Emojis, Accented European characters) across chunk boundaries produces 100% byte-for-byte identical output.
