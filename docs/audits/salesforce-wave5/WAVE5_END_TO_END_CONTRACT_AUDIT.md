# Wave 5 End-to-End Contract and Integration Audit Report

## 1. Data Path Verification Trace
The end-to-end integration path was traced across all system boundaries:

`Canonical Fixture → Ingestion Service → Salesforce Custom Objects → Metadata Controller → Bounded Chunk Controller → LWC Payload Loader → daGraphViewer → Cytoscape Renderer`

## 2. Schema Alignment Matrix

| Boundary | Expected Input | Output / Format | Field Alignment Verification |
|---|---|---|---|
| Ingestion Contract | Raw JSON, `projectName`, `projectKey` | Created Record IDs (`DA_Project__c`, `DA_Analysis_Run__c`, `DA_Graph_Chunk__c`) | Verified chunk slicing <= 131,072 chars and `Chunk_Index__c` assignment |
| Metadata Endpoint | `projectId` (ID or Project Key) | `DAGraphDTO` (`projectId`, `runId`, `isChunked`, `totalChunks`) | Exact match between Apex DTO properties and JavaScript client expectations |
| Chunk Endpoint | `runId`, `startIndex`, `maxChunks` | `List<DA_Graph_Chunk__c>` (`Chunk_Index__c`, `Payload_Data__c`) | `maxChunks` capped at 10; contiguous chunk sequences verified by client |
| Payload Loader | Chunks array (`Payload_Data__c` strings) | Reassembled JSON string | String concatenation via `reassembleChunks`; JSON syntax validation via `validatePayloadIntegrity` |
| Renderer Contract | JSON graph string | Cytoscape elements structure | `JSON.parse` output mapped to Cytoscape graph nodes & edges |

## 3. Pagination & Edge Case Handling Matrix

- **Zero Chunks:** Handled safely by metadata endpoint (`totalChunks = 0`, `isChunked = false`).
- **Single Batch (< 5 chunks):** Retried and reassembled in 1 loop iteration.
- **Multi-Batch (e.g. 43 chunks for PBIM):** Retried in batches of 5 (or max 10) until `nextIndex == totalChunks`.
- **Gaps / Reordered / Duplicate Chunks:** Intercepted by `verifyChunkSequence`, throwing an error and preventing corrupted JSON rendering.
- **Invalid / Truncated JSON:** Detected by `validatePayloadIntegrity`, displaying safe error UI.
- **In-flight Stale Requests:** `currentRequestId` guard discards pending async fetches when project ID changes.
