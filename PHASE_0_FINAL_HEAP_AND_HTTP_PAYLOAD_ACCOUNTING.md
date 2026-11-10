# Phase 0 Final Heap and HTTP Payload Accounting

## Document Metadata
- **Classification**: Phase 0 Technical Accounting & Limit Disambiguation Addendum
- **Date**: 2026-11-10
- **Authors**: Integration Coordinator D1, Agent 2, Agent 10
- **Status**: AUTHORITATIVE TECHNICAL ACCOUNTING EVIDENCE

---

## 1. Executive Summary & Problem Clarification

Previous technical documentation conflated UTF-16 code units (`String.length` in Apex), UTF-8 encoded wire bytes, JSON-serialized HTTP request body size, and Apex runtime heap consumption. Specifically:
- Maximum Chunk Size: **131,072 UTF-16 code units**.
- Maximum Total Run Payload Cap: **10,485,760 UTF-16 code units** (80 chunks).
- Maximum Batch Size: **10 chunks** per REST request.

Ten maximum-sized chunks contain:
$$10 \times 131,072 = 1,310,720 \text{ UTF-16 code units}$$

At two bytes per code unit, the raw in-memory storage estimate for the characters alone is:
$$1,310,720 \times 2 = 2,621,440 \text{ bytes (2.50 MB)}$$

**Crucial Correction**:
- 1,310,720 UTF-16 code units is **not** 1.31 MB of memory.
- Character count does **not** directly establish HTTP request body size.
- Offline arithmetic does **not** establish Apex runtime heap safety or governor-limit compliance.

---

## 2. Seven Distinct Accounting Units

The system architecture and governance models must maintain strict separation across seven distinct accounting units:

1. **UTF-16 Code Units**:
   - The native length metric in Salesforce Apex (`String.length()`) and JavaScript (`String.prototype.length`).
   - Represents 16-bit code units. Basic Multilingual Plane (BMP) characters occupy 1 code unit. Supplementary characters (astral plane / surrogate pairs) occupy 2 code units.
2. **UTF-8 Encoded Bytes**:
   - Variable-length binary encoding used on the wire (HTTP transport) and file storage.
   - ASCII characters: 1 byte per character.
   - Latin/Greek/Cyrillic/Hebrew/Arabic: 2 bytes per code unit.
   - Asian scripts (CJK): 3 bytes per code unit.
   - Astral characters (emojis, rare ideographs): 4 bytes per code point (2 UTF-16 code units).
3. **Serialized JSON Bytes**:
   - The size of stringified JSON objects.
   - Includes JSON structural characters (`{"chunks":[...]}`), object field keys, and crucially, character escaping.
   - Characters such as double quotes `"` and backslashes `\` expand from 1 character to 2 bytes (`\"`, `\\`). Control characters (`\u0000` through `\u001F`) expand from 1 character to 6 bytes (`\u0001`).
4. **HTTP Request-Body Bytes**:
   - The total binary payload transmitted over HTTP POST/PUT, including HTTP envelope, JSON payload, and multipart boundary delimiters.
5. **Apex Runtime Heap Consumption**:
   - Total dynamic JVM/Apex heap allocated to deserialize the JSON request body, allocate DTO objects, instantiate SObjects (`DA_Graph_Chunk__c`), build list collections, and execute validation routines.
   - In Apex, an object or String incurs JVM object headers, character buffer arrays, reference pointers, and memory fragmentation. Deserializing a 2.5 MB JSON string into Apex objects can transiently consume 2x to 3.5x its raw character size in heap memory.
6. **Salesforce Request-Size Constraints**:
   - Salesforce REST and SOAP endpoints enforce a hard synchronous HTTP request body limit of **6 MB** (6,291,456 bytes).
7. **Apex CPU and Other Governor Limits**:
   - Maximum Synchronous Apex CPU Time: **10,000 ms** (10 seconds).
   - Maximum Synchronous Apex Heap Size: **6,000,000 bytes** (6 MB).
   - Maximum Asynchronous Apex Heap Size: **12,000,000 bytes** (12 MB).
   - Maximum SOQL Query Rows: 50,000 rows.
   - Maximum DML Statements: 150 statements; Maximum DML Rows: 10,000 rows.

---

## 3. Empirical Worst-Case Serialization Measurements

An empirical benchmark was executed in the Node.js runtime simulating various payload types at the single-chunk boundary (131,072 UTF-16 code units) and the full 10-chunk batch boundary (1,310,720 UTF-16 code units).

### 3.1 Single Chunk Measurements (Target: 131,072 UTF-16 Code Units)

| Test Case Specimen | UTF-16 Code Units | Raw UTF-8 Bytes | Serialized JSON Chars | Serialized UTF-8 Bytes | Expansion Factor vs ASCII |
|---|---|---|---|---|---|
| **Pure ASCII** | 131,072 | 131,072 | 131,105 | 131,105 | 1.00x |
| **Multibyte 2-byte (Latin/Cyrillic)** | 131,072 | 262,144 | 131,105 | 262,177 | 2.00x |
| **Multibyte 3-byte (CJK Ideographs)** | 131,072 | 393,216 | 131,105 | 393,249 | 3.00x |
| **Supplementary Astral (Surrogate Pairs)** | 131,072 | 262,144 | 131,105 | 262,177 | 2.00x |
| **Quotes & Backslashes (`"`, `\`)** | 131,072 | 131,072 | 262,177 | 262,177 | 2.00x |
| **JSON Escaped Control Chars (`\u0001`)** | 131,072 | 131,072 | 786,465 | 786,465 | 6.00x |

### 3.2 10-Chunk Batch Measurements (Target: 1,310,720 UTF-16 Code Units)

| Batch Specimen | UTF-16 Code Units | Raw UTF-16 Storage | HTTP Request Body UTF-8 Bytes | HTTP Request Body (MB) | Fits Under 6 MB HTTP Limit? |
|---|---|---|---|---|---|
| **Pure ASCII** | 1,310,720 | 2.50 MB | 1,311,166 bytes | 1.250 MB | **YES** (20.8% of cap) |
| **Multibyte 2-byte (Latin/Cyrillic)** | 1,310,720 | 2.50 MB | 2,621,886 bytes | 2.500 MB | **YES** (41.7% of cap) |
| **Multibyte 3-byte (CJK Ideographs)** | 1,310,720 | 2.50 MB | 3,932,606 bytes | 3.750 MB | **YES** (62.5% of cap) |
| **Supplementary Astral (Surrogate Pairs)**| 1,310,720 | 2.50 MB | 2,621,886 bytes | 2.500 MB | **YES** (41.7% of cap) |
| **Quotes & Backslashes (`"`, `\`)** | 1,310,720 | 2.50 MB | 2,621,886 bytes | 2.500 MB | **YES** (41.7% of cap) |
| **JSON Escaped Control Chars (`\u0001`)** | 1,310,720 | 2.50 MB | 7,864,766 bytes | 7.500 MB | **NO — EXCEEDS 6 MB HTTP CAP (125.0%)** |

### 3.3 Critical Architectural Finding
A 10-chunk payload of 1,310,720 UTF-16 code units containing heavily escaped control characters or unescaped ASCII control sequences expands to **7.50 MB** on the wire, which **violates the Salesforce 6 MB HTTP request body limit**.
Therefore:
1. The Node.js client must enforce pre-flight HTTP body size verification: `Buffer.byteLength(serializedJson, 'utf8') <= 5,242,880 bytes` (defensive 5 MB wire limit).
2. If wire bytes exceed 5 MB, the client must dynamically partition the batch into smaller batches (e.g. 5 chunks or 2 chunks), regardless of character counts.

---

## 4. Apex Heap Measurement & Validation Protocol

Because Apex runs in a multi-tenant JVM container with proprietary memory management and strict governor caps, offline V8 calculations cannot certify Apex heap safety.

### 4.1 Measurement Protocol Specification (Agent 2 & Agent 10)
When live Salesforce org execution is enabled, the test class `DAGraphIngestionHeapTest.cls` must profile execution using `Limits.getHeapSize()` and `Limits.getCpuTime()` across the complete transaction pipeline:

1. **Baseline / Pre-Invocation**:
   `heap_baseline = Limits.getHeapSize()`
2. **Post-JSON Deserialization**:
   `DAGraphIngestionRestResource.BatchUploadRequest req = (DAGraphIngestionRestResource.BatchUploadRequest) JSON.deserialize(body, DAGraphIngestionRestResource.BatchUploadRequest.class);`
   `heap_post_deserialize = Limits.getHeapSize()`
   `delta_deserialize = heap_post_deserialize - heap_baseline`
3. **Post-Validation & Schema Verification**:
   `DAGraphIngestionService.validateBatch(req);`
   `heap_post_validation = Limits.getHeapSize()`
4. **Post-SObject Mapping & Collection Construction**:
   `List<DA_Graph_Chunk__c> chunksToInsert = DAGraphIngestionService.mapToSObjects(req);`
   `heap_post_mapping = Limits.getHeapSize()`
5. **Post-DML Execution**:
   `insert chunksToInsert;`
   `heap_post_dml = Limits.getHeapSize()`
6. **Transaction Exit & Peak Memory**:
   `heap_peak = Limits.getHeapSize()`, `cpu_total = Limits.getCpuTime()`

### 4.2 Current Certification Status
In accordance with governance standards:
- Synchronous Apex Heap Limit Safety for 10-Chunk Batch: **`NOT VERIFIED — LIVE SALESFORCE ORG REQUIRED`**
- Asynchronous Apex Heap Safety: **`NOT VERIFIED — LIVE SALESFORCE ORG REQUIRED`**
- Transaction CPU Governor Safety under Heavy Escaping: **`NOT VERIFIED — LIVE SALESFORCE ORG REQUIRED`**

Fabrication of live org heap metrics is strictly prohibited. The 10-chunk batch size is maintained as an unratified engineering baseline with defensive client-side batch reduction.
