# Full Dependency Analyzer to Salesforce Migration Test & Acceptance Strategy

## 1. Executive Summary & Verification Architecture

This strategy defines the multi-layered testing, verification, and release gate framework required to guarantee that the Salesforce-migrated application exhibits 100% functional, data, interaction, and performance equivalence with the original source application.

---

## 2. Multi-Layer Test Suite Matrix

| Test Layer | Execution Command | Scope & Focus | Current Baseline / Pass Rate | Mandatory Gate Stage |
|---|---|---|---|---|
| **Layer 1: Deterministic CLI Suite** | `npm run test:cli` | Deterministic resolution, AST parsing, LLM usage accounting invariants, context reduction. | 16/16 Passed (360 assertions) | Wave 0 Exit Gate |
| **Layer 2: Salesforce POC Offline Harness** | `node scratch/salesforce-poc/tests/run-poc-tests.cjs` | Chunk persistence, surrogate safety, LWC layout engines (`daLayoutEngine.js`), payload schemas, `SELECTION ≠ NAVIGATION`. | 30/30 Passed (0 failures) | Wave 1 Exit Gate |
| **Layer 3: Exporter Data Adapter Suite** | `node scripts/test-export-explorer.cjs` | Canonical graph adapter validation, edge normalization, determinism, risk calculations. | 12/12 Passed (0 failures) | Wave 2 Exit Gate |
| **Layer 4: Explorer Vitest Adapters** | `cd explorer && npx vitest run src/lib/adapters/...` | Core layout adapters (Orbit, Constellation, Sankey), dynamic focal nodes, performance benchmarks. | 48/48 Passed (0 failures) | Wave 3 Exit Gate |
| **Layer 5: Explorer Component Vitest Suite** | `cd explorer && npx vitest run src/components/...` | Full React UI component behavior, accessibility, hover cards, state management. | 387 Passed / 16 Failed (Pre-existing baseline failures documented in historical reports) | Wave 4 Exit Gate |
| **Layer 6: Live Salesforce Apex & LWS Gate** | SFDX CLI (`sf apex run test` / `sf project deploy`) | Apex unit test coverage (>85%), `WITH USER_MODE` CRUD/FLS enforcement, real CPU/SOQL governor limits, LWS static resource sandbox validation. | Deferred (Pending user credentials) | Wave 5 Mandatory Gate |

---

## 3. Classification of Pre-Existing Baseline Failure Surface

In accordance with mandatory audit rules, historical test failures must be accurately classified rather than concealed:

### Component Suite Baseline Failure Analysis (16 failures in `src/components/`)
1. **Layout Mode Toggle Assertions (3 failures):** `GraphView.layoutModeToggle.test.tsx` failure due to DOM query timing discrepancies in headless Vitestjsdom environment. Coordinates calculation passes in core layout engine.
2. **Runtime Integration Position Callbacks (2 failures):** `GraphView.runtimeIntegration.test.tsx` fails on mock Cytoscape `positions` property reference during virtual teardown.
3. **Missing Module References (2 failures):** `Phase1C_Accessibility.test.tsx` attempts to load `./workspace/WorkspaceHeader` and `./graph-internals/EdgeHoverCard`, which were reorganized in previous refactoring cycles.
4. **Cytoscape Element Iteration Mock Failure (9 failures):** `PhaseD4E_InitialGraphLoad.test.tsx` fails when calling `cy.elements().forEach` on incomplete mock Cytoscape instances.

*Remediation Policy:* These failures represent test mock discrepancies in the legacy React harness, NOT defects in the Salesforce LWC/Apex stack. In Salesforce LWCs (`daGraphViewer` and `daLayoutEngine`), Cytoscape initializes directly without virtual DOM wrapper mocks.

---

## 4. Key Behavioral Invariants & Acceptance Gates

### Invariant 1: SELECTION ≠ NAVIGATION
- **Requirement:** User interactions that select, focus, or highlight graph elements (nodes or edges) MUST NOT alter the active route, switch tabs, or trigger project context reloads.
- **Verification Method:** Offline test harness Category 6 check + LWC event listener audit.

### Invariant 2: Payload Schema & UTF-16 Surrogate Boundary Safety
- **Requirement:** Splitting large payloads (>131,072 chars) into `DA_Graph_Chunk__c` records must never split high and low surrogate pairs of multi-byte UTF-16 characters.
- **Verification Method:** `scratch/salesforce-poc/tests/run-poc-tests.cjs` (Category 4).

### Invariant 3: Idempotent Ingestion & Partial Failure Recovery
- **Requirement:** Re-ingesting a graph run with an identical project key and run ID must update existing records in place without duplicating chunk records or leaving orphaned database rows.
- **Verification Method:** Apex transaction rollback and chunk sequence check (`verifyChunkSequence`).

### Invariant 4: Layout Coordinate Determinism
- **Requirement:** Given identical input graph nodes and edges, layout computations (`computeArchitectureLayout`, `computeOrbitLayout`, `computeConstellationLayout`, `computeSankeyLayout`) MUST yield identical `(x, y)` coordinate outputs across runs.
- **Verification Method:** `daLayoutEngine.js` determinism assertions in offline test harness.

---

## 5. Live Salesforce Org Acceptance Criteria (Wave 5 Gate)

When Salesforce credentials are provided, final release qualification requires:
1. **Apex Code Coverage:** All Apex controllers (`DAGraphController`, `DAGraphChunkService`, `DAGraphIngestionService`) achieve >85% line coverage.
2. **User Mode Security:** Zero FLS/CRUD bypass vulnerabilities under Standard User profile execution (`WITH USER_MODE` enforced on all SOQL queries).
3. **LWS Compatibility:** Static resource `cytoscape.js` executes without LWS security sandbox exceptions in Lightning Web Security mode.
4. **Governor Limits:** Ingesting a 10MB payload consumes <50% of heap size, SOQL query count, and DML limit allocations.
