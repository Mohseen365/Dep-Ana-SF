# Wave 5 Defect Register and Remediation Report

## 1. Defect Register

| Defect ID | Severity | Component | Description | Evidence / Impact | Remediation Status |
|---|---|---|---|---|---|
| DEF-W5-01 | Low | `daGraphPayloadLoader.js` | Lack of null/undefined element check in `verifyChunkSequence` | If array element is `null`, accessing `.Chunk_Index__c` throws runtime TypeError | FIXED & VERIFIED |
| DEF-W5-02 | Medium | `DAGraphChunkService.cls` | Default maxChunkSize in `chunkPayload` could exceed 131,072 field length | Parameter values > 131,072 would create chunks exceeding `Payload_Data__c` LongTextArea size limit | FIXED & VERIFIED |
| DEF-W5-03 | Low | `DAGraphController.cls` | Integer overflow in `getGraphChunks` on large `startIndex` | `startIndex + maxChunks - 1` with large integer could overflow | FIXED & VERIFIED |

## 2. Detailed Remediation Details

### DEF-W5-01: LWC Payload Loader Null Element Guard
- **File Changed:** `scratch/salesforce-poc/force-app/main/default/lwc/daGraphPayloadLoader/daGraphPayloadLoader.js`
- **Fix:** Added `!chunks[i]` check prior to accessing `chunks[i].Chunk_Index__c`.
- **Test:** Added Category 5 offline test `verifyChunkSequence: null element in chunk array does not throw TypeError`.

### DEF-W5-02: Apex Chunk Service Cap
- **File Changed:** `scratch/salesforce-poc/force-app/main/default/classes/services/DAGraphChunkService.cls`
- **Fix:** Added `else if (maxChunkSize > 131072) { maxChunkSize = 131072; }`.
- **Test:** Added Category 5 offline test `chunkPayload: caps chunk size at 131,072 characters`.

### DEF-W5-03: Index Calculation Integer Overflow Protection
- **File Changed:** `scratch/salesforce-poc/force-app/main/default/classes/controllers/DAGraphController.cls`
- **Fix:** Calculated `calcMaxIndex` using `Long` arithmetic before capping at 2,147,483,647.
- **Test:** Added Category 5 offline test `simulateBoundedFetch: large startIndex arithmetic safety check`.
