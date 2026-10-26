# Wave 2 Payload Architecture & Governor Limit Review

**Date:** October 2026
**Auditor:** Independent Integration Auditor
**Focus:** Chunk Strategy, Field Capacity, Reassembly Integrity, Apex Governor Safety

---

## 1. Benchmark Fixture Measurements

Each canonical benchmark project fixture was measured directly against the 100,000-character chunking algorithm.

| Fixture Project | File Byte Size | Character Length | Node Count | Edge Count | Chunks Required (100k Chars/Chunk) | Last Chunk Size (Chars) | Reassembly Integrity |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **PBIM** | 4,253,569 B | 4,253,569 | 528 | 2,063 | 43 chunks | 53,569 | 100% Exact |
| **BQC** | 1,332,083 B | 1,332,083 | 274 | 603 | 14 chunks | 32,083 | 100% Exact |
| **CST** | 1,860,770 B | 1,860,770 | 240 | 1,024 | 19 chunks | 60,770 | 100% Exact |

---

## 2. Field Limit & Capacity Analysis

- **Object:** `DA_Graph_Chunk__c`
- **Field:** `Payload_Data__c` (`LongTextArea`)
- **Metadata Max Length:** 131,072 characters
- **Configured Max Chunk Size:** 100,000 characters
- **Safety Capacity Margin:** 31,072 characters (~31 KB buffer per row)

### Encoding Analysis
- **Raw JSON String:** For UTF-8 / ASCII JSON strings, 1 character = 1 byte. 100,000 chars = 100,000 bytes.
- **Base64 Encoded Payloads:** Base64 encoding increases data volume by ~33%. 100,000 Base64 characters represent ~75,000 raw bytes. Both raw JSON and Base64 encoded strings fit comfortably within the 131,072 character field capacity.

---

## 3. Apex Governor Limits & Resource Risks

### Critical Risk: Synchronous Apex Heap Limit Violation
- **Salesforce Synchronous Apex Heap Limit:** 6,291,456 bytes (6 MB).
- **Vulnerability:** `DAGraphController.getLatestGraphForProject(String projectId)` retrieves all chunks for a given analysis run and aggregates them into a single `DAGraphDTO.chunks` array before returning.
- **Impact on PBIM Payload:**
  1. `[SELECT ... Payload_Data__c FROM DA_Graph_Chunk__c]` retrieves 43 SObjects containing 4.25 MB of strings into Apex memory.
  2. `dto.chunks.add(chunk.Payload_Data__c)` allocates another 4.25 MB array of references.
  3. When AuraEnabled framework serializes `dto` to JSON for the client, it allocates the serialized JSON string (~4.25 MB).
  4. Total peak heap allocation during transaction exceeds **8.5 MB**.
- **Result:** Calling `@AuraEnabled getLatestGraphForProject` on payloads larger than ~2.5 MB will throw `System.LimitException: Apex heap size too large` in a live org.

### Mitigation Required for Wave 3 Org Validation
1. **Chunk-by-Chunk LWC Retrieval:** Modify `DAGraphController` to provide `getGraphChunk(String runId, Integer chunkIndex)` so LWC fetches chunks in smaller, individual HTTP calls.
2. **REST API Endpoint:** Provide a custom Apex REST endpoint (`@RestResource`) or streaming chunk endpoint.

---

## 4. Chunk Sequence & Integrity Checks

### Verified Defect Resolution
Previously, missing or out-of-order chunks were not detected prior to reassembly, leading to corrupted JSON.

1. **Apex Sequence Verification (`DAGraphChunkService.verifyChunkSequence`):**
   Iterates through retrieved chunk records to verify that `Chunk_Index__c` forms an unbroken, contiguous sequence `0, 1, 2, ..., N-1`. If an index is missing or out-of-order, `verifyChunkSequence` returns `false`, and `DAGraphController` throws an `AuraHandledException`.
2. **Client-Side Integrity Verification (`c/daGraphPayloadLoader`):**
   `validatePayloadIntegrity(rawJson)` parses the reassembled string to ensure it is valid JSON before invoking `JSON.parse` in `daGraphViewer.js`.
