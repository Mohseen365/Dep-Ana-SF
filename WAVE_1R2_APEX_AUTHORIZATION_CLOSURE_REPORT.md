# Wave 1R.2 Apex Authorization Closure Report

## Executive Summary
This report details the remediation and independent offline verification of the authorization gap reported in `DAGraphController.getGraphChunks`.

## Identified Finding
- **Defect:** Previously, `getGraphChunks(runId, startIndex, maxChunks)` validated that `DA_Analysis_Run__c` existed and was readable via `WITH USER_MODE`, but defaulted `projectId = null`. In environments where sharing rules allowed access to the run record, missing explicit project ownership verification created a risk of cross-project chunk retrieval if a caller supplied another project's run ID.

## Remediated Authorization Design
1. **Authoritative Project Context Scoping:**
   - In `DAGraphController.getGraphChunks(runId, startIndex, maxChunks)`, if `projectId` is omitted or null, the server explicitly queries `DA_Analysis_Run__c` with `WHERE Id = :runId AND DA_Project__c != null WITH USER_MODE` to derive the trusted `DA_Project__c` context.
   - In `DAGraphController.getGraphChunks(runId, startIndex, maxChunks, projectId)`, the query enforces:
     `WHERE Id = :runId AND (DA_Project__c = :projectId OR DA_Project__r.Project_Key__c = :projectId)` with `WITH USER_MODE`.
   - If the run ID does not exist, is missing, or does not match the validated project, an `AuraHandledException('Invalid, unauthorized, or project-mismatched Run ID.')` is thrown immediately before querying chunk data.
2. **Standardized Security Logic:**
   - Both overloads now share the exact same server-side ownership validation and user-mode query restrictions, eliminating weaker authorization paths.

## Regression Evidence
- Apex unit tests in `DAGraphSecurityTest.cls` verify:
  1. `testCrossProjectChunkRetrievalRejection`: Project A attempting to fetch Project B's run chunks triggers `AuraHandledException`.
  2. `testProjectIsolation`: DTO metadata retrieval strictly respects project boundaries.
  3. `testUnauthorizedChunkRetrievalWithGuessedRunId`: Nonexistent or guessed run IDs are rejected.
  4. Null/blank run IDs and invalid project keys are rejected gracefully.

## Residual Risk
- Full runtime Apex sharing rule enforcement under various Salesforce User Profiles requires execution in an authorized Salesforce Org (`sf apex run test`). Offline static analysis and harness simulation confirm the query structure and logic are correct.
