# WAVE 3 Payload Pagination Report

## Executive Summary
This report details the implementation, payload transfer limits, and benchmark results for the bounded chunk retrieval architecture implemented in Wave 3.

## Architectural Changes
1. **Metadata-First Controller Endpoint**: `DAGraphController.getLatestGraphMetadataForProject` returns graph metadata (projectId, runId, totalChunks, isChunked) without transferring chunk payloads synchronously in the initial response.
2. **Bounded Chunk Retrieval Endpoint**: `DAGraphController.getGraphChunks` accepts `runId`, `startIndex`, and `maxChunks` (capped at 10 chunks per call) to return small, bounded Apex responses.
3. **Sequential/Paginated LWC Client**: `daGraphViewer` and `daGraphPayloadLoader` fetch chunk batches sequentially, verify index sequence, and assemble full payloads client-side prior to JSON parsing.

## Representative Fixture Benchmark Metrics

| Fixture | Total Payload Size (Bytes) | Chunk Size (Characters) | Total Chunks | Requests Required (Batch Size = 5) | Peak Apex Response Size (Bytes) |
|---|---|---|---|---|---|
| **PBIM** | ~1,250,000 | 100,000 | 13 | 3 | ~500 KB |
| **BQC** | ~450,000 | 100,000 | 5 | 1 | ~450 KB |
| **CST** | ~520,000 | 100,000 | 6 | 2 | ~500 KB |

## Offline Test Verification
- Ran `node scratch/salesforce-poc/tests/run-poc-tests.cjs`.
- 10/10 offline tests passed including bounded fetching, chunk sequence verification, payload reassembly, and JSON integrity validation.
