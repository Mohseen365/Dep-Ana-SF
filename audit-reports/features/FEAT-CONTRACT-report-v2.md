# FEAT-CONTRACT-v2 Feature Audit Report: Data Contracts, Provenance & Schema

## 1. Executive Summary

This report establishes the authoritative v2 feature audit for **FEAT-CONTRACT-v2** (Data Contracts, Provenance & Schema) of the Salesforce Architecture & Refactoring Explorer. This rerun was conducted following fixture governance review (P0-FIX-01), which flagged potential baseline contamination because fixture assets were included in merge commit `9fe4586` (PR #248). Verification confirms that the current benchmark fixture `audit-fixtures/cloud-spend-tracker/explorer-data.json` matches the canonical SHA-256 hash (`feeb68f363d91fa0a234cb20b5975d6d6d69695fc9cdead4363806a7ca828295`) with zero byte drift.

The audit evaluated the complete contract lifecycle across all 5 phases (§DESIGN, §DEVELOPMENT, §TESTING, §DEPLOYMENT, §MAINTENANCE) and evaluated all Cross-Cutting concerns (Security, Performance, Scalability, Documentation, Governance).

All audit checks and acceptance gates passed successfully:
- **Adapter Invariants (V-01)**: 12/12 adapter validation invariants and graph comparison checks passed cleanly.
- **Architecture Change Gate (V-02)**: 15/15 deterministic change gate decision tests passed cleanly.
- **Schema Validation Performance (PERF)**: Zod schema parsing measured **3.323 ms** on the canonical fixture (15x faster than the 50.000 ms SLA threshold).
- **Enterprise Scalability (SCALE)**: Validated a 10,000-node synthetic enterprise graph in **104.20 ms**.
- **Stale Proposal Safeguards (D-03/T-02)**: Graph identity hashing (`computeGraphHash`) and proposal commit validation (`validateProposalCommit`) correctly reject outdated or cross-project proposals.

Final Feature Audit Decision: **PASS**.

---

## 2. Current Authoritative State

The Explorer data contract serves as the strict, read-only boundary between the Salesforce Dependency Analyzer and the frontend visualization/refactoring engine:
- `explorer-contract.ts`: Defines external TypeScript interface contracts for `ExplorerDataSchema`.
- `explorer/src/lib/schema.ts`: Implements runtime Zod validation (`ExplorerDataSchemaZ` / `parseExplorerData`) forming a security and structural input perimeter.
- `analysis-manifest.json`: Guarantees analysis provenance and source identity (`source.sourceHash` content-based SHA-256 fingerprint).
- `explorer/src/lib/refactoring-simulation.ts`: Enforces graph identity hashing (`computeGraphHash`) and stale proposal validation (`validateProposalCommit` / `isProposalStale`).
- `scripts/export-explorer.cjs`: Normalizes and publishes exported graphs, validated build-time against 12 adapter invariants (`scripts/test-export-explorer.cjs`).

---

## 3. Scope and Method

### In-Scope Artifacts
- `explorer-contract.ts`
- `explorer/src/lib/schema.ts`
- `explorer/src/types/explorer.ts`
- `analysis-manifest.json`
- `audit-fixtures/cloud-spend-tracker/explorer-data.json`
- `scripts/test-export-explorer.cjs`
- `scripts/test-architecture-change-gate.cjs`
- `explorer/src/lib/schema.test.ts`
- `explorer/src/test/Prompt10WorkflowHardening.test.ts`

### Out-of-Scope Artifacts
- Internal analyzer parsing algorithms (governed by FEAT-ANALYZER).

### Audit Methodology
1. **Read-Only Verification**: Strictly zero production code, fixture, or configuration modifications.
2. **Canonical Fixture Hash Verification**: Preserved `audit-fixtures/cloud-spend-tracker/explorer-data.json` SHA-256 hash (`feeb68f363d91fa0a234cb20b5975d6d6d69695fc9cdead4363806a7ca828295`).
3. **Evidence-First Verification**: Every claim cites exact command outputs, benchmark logs, or file:line locations stored in `audit-evidence/features/FEAT-CONTRACT-v2/`.

---

## 4. CANONICAL AUD-PACK MAPPING

| Canonical Audit | Coverage | Evidence Location | Gap Notes |
| :--- | :---: | :--- | :--- |
| **AUD-PROVENANCE-001** | FULL | `audit-evidence/features/FEAT-CONTRACT-v2/d01-d03-design.txt` | Complete provenance metadata (`schemaVersion`, `analyzerVersion`, `generatedAt`, `sourceDirectory`, `sourceHash`) verified mandatory. |
| **AUD-DATABASE-001** | FULL | `audit-evidence/features/FEAT-CONTRACT-v2/v01-v08-dev.txt` | Artifact schema structures and Zod validation rules verified against canonical fixture. |
| **AUD-CICD-001** | FULL | `audit-evidence/features/FEAT-CONTRACT-v2/v02-architecture-change-gate.txt` | 15/15 deterministic architecture change gate tests verified. |
| **AUD-DOC-001** | FULL | `audit-evidence/features/FEAT-CONTRACT-v2/m01-m03-crosscutting.txt` | Contract alignment checked against `01_Foundations_Contracts.md`. |
| **AUD-GOV-001** | FULL | `audit-evidence/features/FEAT-CONTRACT-v2/p01-p03-deployment.txt` | Provenance invariants and content-based SHA-256 fingerprints enforced as hard pipeline gates. |

---

## 5. Forensic Metrics / Runtime Evidence

### Baseline Fixture Verification
- Command: `sha256sum audit-fixtures/cloud-spend-tracker/explorer-data.json`
- Output: `feeb68f363d91fa0a234cb20b5975d6d6d69695fc9cdead4363806a7ca828295  audit-fixtures/cloud-spend-tracker/explorer-data.json`
- Status: 0 byte drift from canonical benchmark.

### Adapter Validation Suite (V-01)
- Command: `node scripts/test-export-explorer.cjs`
- Output: `ALL 12 VALIDATION INVARIANTS AND GRAPH COMPARISON CHECKS PASSED!`
- Tested: Node ID stability, edge endpoints, enum validity, risk score uncorrupted, cycles, unresolved references, evidence preservation, version presence, determinism, relationship preservation.
- Log: `audit-evidence/features/FEAT-CONTRACT-v2/v01-export-explorer.txt`

### Architecture Change Gate Suite (V-02)
- Command: `node scripts/test-architecture-change-gate.cjs`
- Output: `ALL 15 DETERMINISTIC ARCHITECTURE CHANGE GATE TESTS PASSED SUCCESSFULLY!`
- Log: `audit-evidence/features/FEAT-CONTRACT-v2/v02-architecture-change-gate.txt`

### Schema Unit & Stale Proposal Rejection Tests (T-01 & T-02)
- Commands:
  - `(cd explorer && npx vitest run src/lib/schema.test.ts)` -> 4/4 passed (26 ms)
  - `(cd explorer && npx vitest run src/test/Prompt10WorkflowHardening.test.ts)` -> 25/25 passed (2.51s)
- Logs: `audit-evidence/features/FEAT-CONTRACT-v2/t01-schema-test.txt` and `t02-stale-rejection-test.txt`

### Adversarial Input & Validation Tests (T-03 & T-04)
- Command: `node audit-evidence/features/FEAT-CONTRACT-v2/run-adversarial-tests.js`
- Provenance Field Omission (T-03): Reject missing `schemaVersion`, `sourceDirectory`, and `source.sourceHash`.
- Invalid Enum Values (T-04): Reject invalid node type `"InvalidApexType"` and invalid coverage status `"INVALID_COVERAGE"`.
- Log: `audit-evidence/features/FEAT-CONTRACT-v2/adversarial-tests.txt`

### Performance & Scalability Benchmarks (PERF & SCALE)
- Command: `node audit-evidence/features/FEAT-CONTRACT-v2/run-crosscutting-benchmarks.js`
- PERF Metric: **3.323 ms** average validation time on canonical fixture (Target: < 50.000 ms) -> **PASS**.
- SCALE Metric: **104.20 ms** validation execution time on 10,000-node synthetic graph -> **PASS**.
- Log: `audit-evidence/features/FEAT-CONTRACT-v2/crosscutting-benchmarks.txt`

---

## 6. Findings

All prior v1 findings remain confirmed and are preserved with exact file:line locations:

1. **FINDING-CONTRACT-01 (Optional Project Property in Schema)**:
   - *File:Line*: `explorer/src/types/explorer.ts:53` vs `explorer/src/lib/schema.ts:169-180`
   - *Issue*: `explorer/src/types/explorer.ts` defines `project?: ProjectMetadata` and canonical fixture JSON contains a `project` metadata object. However, `explorer/src/lib/schema.ts` (`ExplorerDataSchemaZ`) omits `project`. Calling `.strip()` at line 180 strips `project` from the validated output.
   - *Status*: Confirmed in v2 rerun. Non-blocking schema drift.
2. **FINDING-CONTRACT-02 (Ambiguous Test Coverage Status Alignment)**:
   - *File:Line*: `explorer-contract.ts:113` vs `explorer/src/types/explorer.ts:144` and `explorer/src/lib/schema.ts:74`
   - *Issue*: `explorer-contract.ts` lists `testCoverageStatus` as `"COVERED" | "NO_TESTS" | "UNTESTED"` (lacking `"AMBIGUOUS"`), while internal types and Zod schemas include `"AMBIGUOUS"`.
   - *Status*: Confirmed in v2 rerun. Non-blocking contract type drift.
3. **FINDING-CONTRACT-03 (Canonical Resolution Strategy Enum Sync)**:
   - *File:Line*: `explorer-contract.ts:155` vs `explorer/src/types/explorer.ts:185` and `explorer/src/lib/schema.ts:116`
   - *Issue*: `ExplorerEdgeCanonical` relationship resolution enum in `explorer-contract.ts` lists `"EXACT" | "INFERRED" | "UNRESOLVED"` (lacking `"HEURISTIC"`), while internal types and Zod schemas include `"HEURISTIC"`.
   - *Status*: Confirmed in v2 rerun. Non-blocking contract type drift.

---

## 7. Verification Matrix

| Check ID | Requirement | Result | Evidence File / Reference |
| :--- | :--- | :---: | :--- |
| **D-01** | Provenance Field Enumeration | **PASS** | `audit-evidence/features/FEAT-CONTRACT-v2/d01-d03-design.txt` |
| **D-02** | Mandatory Provenance Fields | **PASS** | `audit-evidence/features/FEAT-CONTRACT-v2/d01-d03-design.txt` |
| **D-03** | Stale-Proposal Identity Hash | **PASS** | `audit-evidence/features/FEAT-CONTRACT-v2/d01-d03-design.txt` |
| **V-01** | Export Explorer Test Suite | **PASS** | `audit-evidence/features/FEAT-CONTRACT-v2/v01-export-explorer.txt` |
| **V-02** | Change Gate Test Suite | **PASS** | `audit-evidence/features/FEAT-CONTRACT-v2/v02-architecture-change-gate.txt` |
| **V-03** | Strict Zod Parse Fixture | **PASS** | `audit-evidence/features/FEAT-CONTRACT-v2/v01-v08-dev.txt` |
| **V-04** | Top-Level Field Classification | **PASS** | `audit-evidence/features/FEAT-CONTRACT-v2/v01-v08-dev.txt` |
| **V-05** | Schema vs Fixture Diff | **PASS** | `audit-evidence/features/FEAT-CONTRACT-v2/v01-v08-dev.txt` |
| **V-06** | Node Type Enum Mapping | **PASS** | `audit-evidence/features/FEAT-CONTRACT-v2/v01-v08-dev.txt` |
| **V-07** | Re-verify FINDING-CONTRACT-01 | **PASS** | `explorer/src/types/explorer.ts:53` / `explorer/src/lib/schema.ts:169-180` |
| **V-08** | Re-verify FINDING-CONTRACT-02 | **PASS** | `explorer-contract.ts:113` / `explorer/src/types/explorer.ts:144` |
| **T-01** | Schema Validation Tests | **PASS** | `audit-evidence/features/FEAT-CONTRACT-v2/t01-schema-test.txt` |
| **T-02** | Stale Rejection Tests | **PASS** | `audit-evidence/features/FEAT-CONTRACT-v2/t02-stale-rejection-test.txt` |
| **T-03** | Adversarial Missing Field Test | **PASS** | `audit-evidence/features/FEAT-CONTRACT-v2/adversarial-tests.txt` |
| **T-04** | Adversarial Invalid Enum Test | **PASS** | `audit-evidence/features/FEAT-CONTRACT-v2/adversarial-tests.txt` |
| **P-01** | Build-Time Schema Validation | **PASS** | `audit-evidence/features/FEAT-CONTRACT-v2/p01-p03-deployment.txt` |
| **P-02** | Fixture Hash Immutability | **PASS** | `feeb68f363d91fa0a234cb20b5975d6d6d69695fc9cdead4363806a7ca828295` |
| **P-03** | Atomic Manifest Generation | **PASS** | `audit-evidence/features/FEAT-CONTRACT-v2/p01-p03-deployment.txt` |
| **M-01** | Content SHA-256 Source Hash | **PASS** | `audit-evidence/features/FEAT-CONTRACT-v2/m01-m03-crosscutting.txt` |
| **M-02** | Documentation Alignment | **PASS** | `audit-evidence/features/FEAT-CONTRACT-v2/m01-m03-crosscutting.txt` |
| **M-03** | Schema Drift Analysis | **PASS** | `audit-evidence/features/FEAT-CONTRACT-v2/m01-m03-crosscutting.txt` |
| **SEC** | Input Sanitization Perimeter | **PASS** | `explorer/src/lib/schema.ts` |
| **PERF** | Validation Time < 50 ms | **PASS** | **3.323 ms** (`crosscutting-benchmarks.txt`) |
| **SCALE** | 10,000-Node Validation | **PASS** | **104.20 ms** (`crosscutting-benchmarks.txt`) |
| **DOC** | Schema Documentation | **PASS** | `01_Foundations_Contracts.md` |
| **GOV** | Governance Invariants | **PASS** | Hard invariants enforced across pipeline adapters |

---

## 8. Acceptance Gates

| Gate ID | Description | Status | Verification Reference |
| :--- | :--- | :---: | :--- |
| **G-D** | All provenance fields documented | **PASS** | §DESIGN / D-01, D-02, D-03 |
| **G-V** | 0 schema validation errors, stale rejection works | **PASS** | §DEVELOPMENT / V-01 through V-08 |
| **G-T** | Schema + rejection tests present | **PASS** | §TESTING / T-01 through T-04 |
| **G-P** | Build-time validation confirmed | **PASS** | §DEPLOYMENT / P-01, P-02, P-03 |
| **G-M** | Content-based hash verified | **PASS** | §MAINTENANCE / M-01, M-02, M-03 |
| **G-X** | Cross-cutting evidence produced | **PASS** | SEC, PERF, SCALE, DOC, GOV |
| **G-C** | Fixture governance contamination verdict resolved | **PASS** | P0-FIX-01 fixture governance review confirmed SHA-256 integrity (`feeb68f363d91fa0a234cb20b5975d6d6d69695fc9cdead4363806a7ca828295`) with 0 byte drift |

---

## 9. Superseded / Historical Notes

- **SUPERSEDED (2026-09-23)**: The v1 audit report (`FEAT-CONTRACT-report.md`) was flagged during intake intake triage for baseline contamination because commit `9fe4586` (PR #248) modified code and added fixture files simultaneously. P0-FIX-01 governance analysis verified that the canonical benchmark fixture `audit-fixtures/cloud-spend-tracker/explorer-data.json` hash (`feeb68f363d91fa0a234cb20b5975d6d6d69695fc9cdead4363806a7ca828295`) is completely identical and uncorrupted. This v2 report supersedes v1 while preserving all v1 findings and adding explicit v2 governance and file:line re-verifications.
- **SUPERSEDED**: File modification timestamp (`mtime`) hashing in early analyzer iterations is superseded by DA-2.1 content-based SHA-256 source hashing in `dependency-analyzer.cjs`.

---

## 10. Remediation Queue

The following non-blocking schema and type alignment items are logged to the Remediation Queue for future alignment:

1. **FINDING-CONTRACT-01 (Add project field to Zod schema)**:
   - *Target*: `explorer/src/lib/schema.ts`
   - *Action*: Add `project: ProjectMetadataZ.optional()` to `ExplorerDataSchemaZ` to prevent stripping project metadata during `parseExplorerData`.
2. **FINDING-CONTRACT-02 (Add "AMBIGUOUS" to contract interface enum)**:
   - *Target*: `explorer-contract.ts:113`
   - *Action*: Update `testCoverageStatus` in `explorer-contract.ts` to `"COVERED" | "NO_TESTS" | "UNTESTED" | "AMBIGUOUS"`.
3. **FINDING-CONTRACT-03 (Add "HEURISTIC" to contract canonical resolution enum)**:
   - *Target*: `explorer-contract.ts:155`
   - *Action*: Update `resolution` in `ExplorerEdgeCanonical` in `explorer-contract.ts` to `"EXACT" | "INFERRED" | "HEURISTIC" | "UNRESOLVED"`.

---

## 11. Decision

**PASS** — FEAT-CONTRACT-v2 (Data Contracts, Provenance & Schema) satisfies all contract, provenance, schema validation, stale-proposal rejection, performance, scalability, security, fixture governance, and pipeline invariants.

---

## 12. Key Authoritative Sources

1. `explorer-contract.ts`
2. `explorer/src/lib/schema.ts`
3. `explorer/src/types/explorer.ts`
4. `analysis-manifest.json`
5. `01_Foundations_Contracts.md`
6. `audit-fixtures/cloud-spend-tracker/explorer-data.json`
7. `scripts/test-export-explorer.cjs`
8. `scripts/test-architecture-change-gate.cjs`
9. `explorer/src/lib/refactoring-simulation.ts`
10. `audit-evidence/features/FEAT-CONTRACT-v2/`
