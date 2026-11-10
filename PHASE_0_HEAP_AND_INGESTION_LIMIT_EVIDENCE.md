# Phase 0 Apex Heap and Ingestion Limit Evidence

## Document Metadata
- **Classification**: Phase 0 Technical Accounting & Limit Investigation
- **Date**: 2026-11-10
- **Auditor**: Integration Coordinator D1
- **Status**: AUTHORITATIVE TECHNICAL EVIDENCE

---

## 1. Accounting Unit Disambiguation

The following accounting metrics must not be conflated:
1. **UTF-16 Code Units**: Salesforce Apex `String.length()` counts UTF-16 code units.
   - Max Chunk Size: **131,072 UTF-16 code units**.
   - Max Run Payload Cap: **10,485,760 UTF-16 code units** (80 chunks).
2. **UTF-8 Encoded Bytes**: Wire transport bytes for JSON AST nodes. Typically 1–4 bytes per character.
3. **HTTP Request Bytes**: Full multipart or JSON request body including HTTP headers, JSON envelope, and escaping. A 10-chunk batch body is approximately 1.35 MB to 2.8 MB.
4. **Apex Runtime Heap Memory**: Memory allocated by the JVM/Apex runtime for Strings, objects, collections, and temporary buffers. Peak heap during 10-chunk deserialization and SObject mapping is statically estimated between 3.5 MB and 5.2 MB.
5. **Salesforce Governor Limits**:
   - Synchronous Apex Heap Limit: **6 MB** (6,291,456 bytes).
   - Asynchronous Apex Heap Limit: **12 MB** (12,582,912 bytes).
   - HTTP Request Size Limit: **6 MB**.

---

## 2. Evidence Classification Matrix

| Ingestion Parameter / Claim | Value / Bound | Evidence Classification | Verification Requirement |
|---|---|---|---|
| Max Single Chunk Size | 131,072 UTF-16 code units | `STATICALLY ESTIMATED` | Validated by unit test boundary checks |
| Max Total Run Payload Cap | 10,485,760 UTF-16 code units | `STATICALLY ESTIMATED` | Arithmetic boundary (80 chunks) |
| Local Node.js 10-Chunk Reassembly | Passes in V8 runtime | `LOCALLY SIMULATED` | Executed via offline Node.js runners |
| Apex Synchronous Heap Safety (< 6 MB) | Statically estimated 3.5–5.2 MB | **`NOT VERIFIED`** | Requires execution in live Salesforce org |
| Governor Limits (CPU, Heap, SOQL rows) | Synchronous transaction | **`NOT VERIFIED`** | Requires live org profiling under load |

---

## 3. Architecture Safeguards for Phase 1
- **Configurable Batching**: Rest resource must allow callers to downscale batch size (e.g. 10 chunks down to 5 chunks) if runtime heap profiling exceeds 4 MB.
- **Garbage Collection Optimization**: Clear input DTO references immediately after mapping to `DA_Graph_Chunk__c` records.
- **Fail-Closed Payload Guard**: Ingestion service must reject payloads exceeding 10,485,760 UTF-16 code units with HTTP 413 Payload Too Large.
