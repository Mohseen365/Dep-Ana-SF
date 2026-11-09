# D2 Architectural Invariant Audit — Wave 3B

**Document Identifier:** `D2_ARCHITECTURE_INVARIANT_AUDIT.md`
**Role:** Agent D2 — Independent Release and Migration Verifier
**Wave:** 3B
**Mode:** READ-ONLY INDEPENDENT AUDITOR
**Date:** 2026-11-10
**Target Release Candidate Commit:** `6e31a245764c0f94d842db1693fd754fc3f4bfa1`
**Target Tree SHA:** `c811571778a5e5c235c06945807082f9055c698e`
**Governance Framework:** DEC-04 Alternative 4 (Project Owner Exclusive Executive Dispatch Authority)

---

## 1. Scope & Audit Methodology

This audit independently validates that all eight frozen architectural invariants and client-side data boundaries defined in the migration contract and architectural baseline remain strictly preserved in Release Candidate `RC-WAVE-3A-HEAD-6e31a245`.

Each invariant was inspected through direct code inspection, AST verification, and offline test suite execution across `scratch/salesforce-poc/`.

---

## 2. Invariant Compliance Matrix

| Invariant ID | Invariant Definition | Enforcement Mechanism | Verification Evidence | Status |
|:---|:---|:---|:---|:---:|
| **INV-01** | `SELECTION != NAVIGATION` | `daAppShell.js`, `daGraphViewer.js`, `daInvestigationDrawer.js` | `run-coordinator-integration-suite.cjs` Test 3.3, 3.4; `run-poc-tests.cjs` TC-11 | **PASS** |
| **INV-02** | Canonical Graph Payload Immutability | Deep strict equality checks in test runners; Object freeze patterns | `run-poc-tests.cjs` TC-16; `run-w6-2` through `run-w7-2` | **PASS** |
| **INV-03** | Project Isolation | SOQL `DA_Project__c` filters, compound preference keys, BroadcastChannel project IDs | `run-ws5-tests.cjs` Suite 1; `run-s1-security-tests.cjs` Suite 3 | **PASS** |
| **INV-04** | Single Cytoscape Canvas | Singleton container lifecycle in `daGraphViewer.js` | `run-poc-tests.cjs` TC-08, TC-14; Category 4 | **PASS** |
| **INV-05** | Stale-Response Suppression | Correlation tokens and request sequence counter comparisons | `run-coordinator-integration-suite.cjs` Test 2.2; `run-poc-tests.cjs` TC-04 | **PASS** |
| **INV-06** | Pure Simulation Isolation | Strict quarantine of `daRefactoringEngine` & `daRefactorHandoffModal` | Codebase unimported check; `run-workstream-c-tests.cjs` isolated Tests 20–25 | **PASS** |
| **INV-07** | UTF-8 & Chunk-Boundary Safety | Surrogate-pair safe splitting in `daGraphPayloadLoader.js` & Apex service | `run-poc-tests.cjs` Category 4 Unicode & Multibyte tests | **PASS** |
| **INV-08** | Payload Caps & Client Reassembly | 131,072 max chunk limit, 10,485,760 total payload cap; client reassembly | `run-poc-tests.cjs` Category 5; `DAGraphIngestionService.cls` | **PASS** |

---

## 3. Detailed Audit by Invariant

### 3.1 Invariant 1: SELECTION != NAVIGATION
- **Contract Definition:** Selecting a node within any view (Graph, Matrix, Findings, Diagnostics, Hotspots, Treemap, Subway, Barcode, Radar) or within the Investigation Drawer must update the selection state (`selectedNodeId`) and display context without triggering navigation or changing `activeViewMode`.
- **Implementation Inspection:**
  * `daAppShell.html` listens for `onnodeselect` and executes `handleNodeSelect`.
  * `handleNodeSelect(event)` updates `this.selectedNodeId = event.detail.nodeId` and sets `this.isDrawerOpen = true`.
  * `this.activeView` and `this.activeViewMode` remain untouched.
  * In `daInvestigationDrawer.js`, drill-down clicking dispatches `nodeselect` with `bubbles: true, composed: true`, updating selection while leaving shell view navigation unaffected.
- **Audit Finding:** **PASS**.

### 3.2 Invariant 2: Canonical Graph Payload Immutability
- **Contract Definition:** Layout computations, filters, and node selections must treat the incoming canonical graph payload as read-only.
- **Implementation Inspection:**
  * `daLayoutEngine.js` functions (`computeArchitectureLayout`, `computeOrbitLayout`, `computeConstellationLayout`) operate on cloned node arrays or projection maps without mutating input object attributes.
  * In test runners (`run-poc-tests.cjs` TC-16, Wave 1A suites), pre-execution deep snapshots (`JSON.parse(JSON.stringify(payload))`) are compared via `assert.deepStrictEqual` against input payloads post-layout.
- **Audit Finding:** **PASS**.

### 3.3 Invariant 3: Project Isolation
- **Contract Definition:** Multi-tenant boundaries must strictly prevent cross-project pollution in persistent storage, memory caches, and inter-window messaging.
- **Implementation Inspection:**
  * In `DAUserPreferenceController.cls` and `DAAnnotationController.cls`, all queries and DML enforce `DA_Project__c = :projectId` or compound keys combining `UserId` and `ProjectId`.
  * In `daInvestigationDrawer.js`, `handleBroadcastMessage` compares `message.projectId === this.projectId` and drops mismatched messages.
  * Rapid project switching resets `selectedNodeId` and cancels in-flight responses.
- **Audit Finding:** **PASS**.

### 3.4 Invariant 4: Single Cytoscape Canvas
- **Contract Definition:** The interactive graph must maintain exactly one Cytoscape instance mounted in the DOM.
- **Implementation Inspection:**
  * `daGraphViewer.js` manages instance lifecycle through `this.cy`.
  * Prior to mounting a new graph or changing projects, `if (this.cy) { this.cy.destroy(); this.cy = null; }` is strictly executed.
  * Offline tests in `run-poc-tests.cjs` verify that repeated renders and project switches clean up canvas references.
- **Audit Finding:** **PASS**.

### 3.5 Invariant 5: Stale-Response Suppression
- **Contract Definition:** Asynchronous graph payload fetches and preference loading operations must discard responses from superseded requests.
- **Implementation Inspection:**
  * `daAppShell.js` and `daGraphViewer.js` increment an internal `_requestId` or token counter upon initiating an asynchronous request.
  * Upon promise resolution, the returned token is asserted against the active token. If mismatched, the payload is silently discarded.
- **Audit Finding:** **PASS**.

### 3.6 Invariant 6: Pure Simulation Isolation
- **Contract Definition:** Wave 9 refactoring algorithms and handoff modals implemented prior to authorization must remain strictly quarantined.
- **Implementation Inspection:**
  * `grep -rn "daRefactor" scratch/salesforce-poc/force-app/main/default/lwc/daAppShell/` returns zero hits.
  * Neither `daRefactoringEngine` nor `daRefactorHandoffModal` is mounted, imported, or referenced anywhere in production LWC or Apex controllers.
  * Quarantined functionality is tested only in isolated test cases 20–25 of `run-workstream-c-tests.cjs`.
- **Audit Finding:** **PASS**.

### 3.7 Invariant 7: UTF-8 & Chunk-Boundary Safety
- **Contract Definition:** Chunks stored in Salesforce `LongTextArea` fields must not split multibyte UTF-8 characters or UTF-16 surrogate pairs.
- **Implementation Inspection:**
  * `daGraphPayloadLoader.js` and `DAGraphIngestionService.cls` validate surrogate pairs across boundaries (`0xD800` to `0xDBFF` high surrogates).
  * If a chunk boundary lands between a high and low surrogate, the boundary is adjusted to prevent corrupting Unicode codepoints.
- **Audit Finding:** **PASS**.

### 3.8 Invariant 8: Payload Caps and Client-Side Chunk Reassembly
- **Contract Definition:** Chunk size is strictly bounded at 131,072 characters (128 KB LongTextArea limit); total graph payload size is capped at 10,485,760 characters (10 MB). Reassembly must occur purely in client-side JavaScript.
- **Implementation Inspection:**
  * `MAX_CHUNK_SIZE = 131072` and `MAX_TOTAL_PAYLOAD_SIZE = 10485760` are exported and enforced in `daGraphPayloadLoader.js`.
  * `DAGraphIngestionService.cls` enforces identical limits during ingestion.
  * Apex chunk reassembly is strictly prohibited, avoiding Apex heap exhaustion.
- **Audit Finding:** **PASS**.

---

## 4. Conclusion

All 8 frozen architectural invariants are **100% COMPLIANT** in Release Candidate `RC-WAVE-3A-HEAD-6e31a245`.
