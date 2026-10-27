# Wave 1R Apex Authorization and Ingestion Assessment Report

## 1. Project/Run Authorization Scope Fix

### Security Defect Overview
`DAGraphController.getGraphChunks(runId, startIndex, maxChunks)` validated that the requested `DA_Analysis_Run__c` record existed and was readable by the user via `WITH USER_MODE`. However, it did not verify that the requested `runId` belonged to the expected `projectId` or current session context, allowing a caller with access to multiple projects to fetch chunk records from Project B while operating in the context of Project A.

### Implemented Security Ownership Design
1. **Method Overloading:**
   * `getGraphChunks(runId, startIndex, maxChunks)` -> delegates to `getGraphChunks(runId, startIndex, maxChunks, null)` for backward compatibility.
   * `getGraphChunks(String runId, Integer startIndex, Integer maxChunks, String projectId)` -> enforces project ownership scoping.

2. **Server-Side Validation Query:**
   ```apex
   List<DA_Analysis_Run__c> runs;
   if (String.isNotBlank(projectId)) {
       runs = [
           SELECT Id, DA_Project__c
           FROM DA_Analysis_Run__c
           WHERE Id = :runId
             AND (DA_Project__c = :projectId OR DA_Project__r.Project_Key__c = :projectId)
           WITH USER_MODE
           LIMIT 1
       ];
   } else {
       runs = [
           SELECT Id, DA_Project__c
           FROM DA_Analysis_Run__c
           WHERE Id = :runId
             AND DA_Project__c != null
           WITH USER_MODE
           LIMIT 1
       ];
   }

   if (runs.isEmpty()) {
       throw new AuraHandledException('Invalid, unauthorized, or project-mismatched Run ID.');
   }
   ```

3. **LWC Integration:**
   `daGraphViewer.js` now passes `projectId: this.recordId` during `getGraphChunks` calls.

4. **Apex Security Unit Test:**
   `DAGraphSecurityTest.testCrossProjectChunkRetrievalRejection` verifies that calling `getGraphChunks` with a `runId` from Project B and a `projectId` for Project A throws `AuraHandledException`.

---

## 2. Large-Payload Ingestion Risk Assessment

### Assessment Subject
`DAGraphIngestionService.saveGraphChunks(String runId, List<String> chunkData)`

### Governor Limit Analysis
* **Maximum Application Payload:** 10 MB (10,485,760 chars / ~80 chunks @ 128 KB each).
* **Synchronous Apex Heap Limit:** 6,291,456 bytes (6 MB).
* **Asynchronous Apex Heap Limit:** 12,582,912 bytes (12 MB).
* **DML Row Limit:** 10,000 rows per transaction.

When 10 MB of chunk string data is passed synchronously into `saveGraphChunks`:
1. Method parameters allocate `List<String> chunkData` (~10 MB heap).
2. SObject list creation allocates `List<DA_Graph_Chunk__c> records` (~10 MB heap).
3. Total heap allocation during execution exceeds 20 MB, breaching the 6 MB synchronous Apex limit and throwing an uncatchable `System.LimitException: Apex heap size too large`.

### Defensible Disposition
**`REQUIRES BATCHING / REQUIRES ASYNCHRONOUS INGESTION`**

### Recommended Ingestion Architecture & Follow-Up Criteria
1. **Client-Driven Chunk Batching:**
   Clients uploading graph chunks synchronously MUST split calls into batches of at most 10-15 chunks (<= 1.5 MB payload per transaction).
2. **Queueable Apex Worker:**
   For single-shot bulk uploads of 10 MB payloads, chunk saving MUST be offloaded to a `Queueable` Apex job (`Queueable, Database.AllowsCallouts`) or batch Apex job to run under asynchronous governor limits and process chunks in bounded transaction steps.
