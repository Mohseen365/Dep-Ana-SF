# Phase 1 Agent 2 Apex Heap Validation Status Report

## Document Identification
- **Document Type**: Heap Measurement and Runtime Memory Qualification
- **Owner**: Agent 2 (Ingestion Lifecycle & Persistence Lead)
- **Coordinator**: Integration Coordinator D1
- **Verifier**: Independent Verifier D2
- **Date**: 2026-11-11
- **Status**: QUALIFIED — LIVE ORG EXECUTION REQUIRED

---

## 1. Problem Statement & Correction

Historical interface drafts claimed that dynamic batching (10 chunks of 131,072 characters) guaranteed an Apex heap footprint under 1.3 MB. In Salesforce runtime execution, this arithmetic claim was fundamentally unsubstantiated:
- 10 chunks of 131,072 characters equate to 1,310,720 UTF-16 code units (~2.62 MB in raw storage).
- Deserialization, SOQL result structures, collections, string copies, and serialization create additional heap amplification.
- The 5 MiB application-level HTTP request ceiling bounds inbound wire transport, not Apex heap consumption.

---

## 2. Corrected Heap Safety Specification

Under v1.0.2:
`Dynamic batching enforces the application-level HTTP request-body ceiling. It does not establish Apex heap safety. Actual heap behavior requires Salesforce-org execution.`

### Measurement Disambiguation:
- **UTF-16 Code Units**: 131,072 characters per chunk, 10,485,760 total payload ceiling.
- **UTF-8 Bytes**: Serialized JSON payload over the wire.
- **HTTP Request Ceiling**: 5,242,880 bytes (5 MiB).
- **Apex Heap Consumption**: Measures transient in-memory allocations across execution context.

### Verification Status:
`NOT VERIFIABLE — SALESFORCE ORG EXECUTION REQUIRED`

In the offline development sandbox, actual Apex heap consumption cannot be profiled without live Salesforce org access. This limitation is formally acknowledged and documented.
