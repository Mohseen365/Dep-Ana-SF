# Wave 2 Lane B — Salesforce Ingestion & Persistence Services Report

**Date:** October 2026
**Context:** Wave 2 Ingestion & Controller Services Implementation
**Author / Agent:** Jules Coordinator & Lead Integrator (Lane B)

---

## 1. Executive Summary

Lane B implemented the Apex controller and ingestion service layer in `scratch/salesforce-poc/force-app/main/default/classes/`.

All SOQL queries enforce strict multi-tenant isolation via explicit project scope parameters and `WITH USER_MODE`.

---

## 2. Deliverables & Artifact Inventory

* `classes/controllers/DAGraphController.cls` & `-meta.xml`: `@AuraEnabled` cacheable methods `getProjects()` and `getLatestGraphForProject(projectId)`.
* `classes/services/DAGraphIngestionService.cls` & `-meta.xml`: Helper service providing `createProject()`, `createAnalysisRun()`, and `saveGraphChunks()`.

---

## 3. Governor & Heap Security Verification

* `DAGraphController` returns Base64 / raw payload chunks directly to the client without attempting `JSON.deserializeUntyped()`, protecting the synchronous 12 MB Apex heap limit.
* Operations enforce `WITH USER_MODE` and `insert as user` for user-mode security compliance.
