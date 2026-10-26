# WAVE 3 Security Test Plan

## Overview
This document outlines the security architecture and test plan for the Salesforce POC under `scratch/salesforce-poc/`. The security model guarantees multi-tenant project isolation, CRUD/FLS enforcement, and secure bounded payload access.

## Target Security Objectives
1. **CRUD & FLS Enforcement**: All SOQL queries in controllers and services must use `WITH USER_MODE` or `Security.stripInaccessible`.
2. **Multi-Tenant Project Isolation**: Users must not access graph runs or chunk data belonging to projects they do not own or have sharing permissions for.
3. **Chunk Scoping Verification**: Bounded chunk requests (`getGraphChunks`) must validate the `runId` against existing `DA_Analysis_Run__c` records before executing chunk queries.
4. **Data Disclosures**: Error messages must return standardized `AuraHandledException` without disclosing internal SOQL/DML exception stack traces or unrelated project metadata.

## Apex Security Test Cases Authored (`DAGraphSecurityTest.cls`)

| Test Case Name | Objective | Strategy / Assertions | Status |
|---|---|---|---|
| `testProjectIsolation` | Verify project isolation | Query metadata for Project A and ensure Project B data is not returned | Authored |
| `testSystemRunAsRestrictedUserAccess` | Validate CRUD/FLS enforcement under standard/restricted user context | Execute `getGraphChunks` as a Standard User without DA permissions via `System.runAs()`. Expect `System.QueryException` or `AuraHandledException`. | Authored (Pending Org) |
| `testUnauthorizedChunkRetrievalWithGuessedRunId` | Reject unauthorized chunk retrieval using random/guessed `runId` | Call `getGraphChunks` with fake `runId`. Expect `AuraHandledException`. | Authored |

## Offline Security Verification

- Verified `DAGraphController.cls` query patterns enforce `WITH USER_MODE` across all endpoints:
  - `getProjects()` -> `WITH USER_MODE`
  - `getLatestGraphMetadataForProject()` -> `WITH USER_MODE`
  - `getGraphChunks()` -> `WITH USER_MODE` on both `DA_Analysis_Run__c` validation query and `DA_Graph_Chunk__c` data query.
