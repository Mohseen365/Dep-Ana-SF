# Wave 1 Readiness and Dependency Map

## Executive Summary
This document defines the dependency-aware implementation roadmap, technical contract mapping, release gates, and measurable acceptance criteria for Wave 1 of the Dependency Analyzer Salesforce migration.

---

## 1. Wave 1 Scope & Prioritized Implementation Ledger

Wave 1 focuses strictly on core graph payload loading, Apex backend data services, and porting the core layout engine algorithms to LWC modules.

| Work Item ID | Feature / Component | Source Path & Symbols | Proposed Target LWC/Apex Path | Dependencies | Priority | Proof / Evidence Level |
| :--- | :--- | :--- | :--- | :--- | :---: | :--- |
| **W1-01** | Graph Contract & Payload Loader | `explorer/src/types/explorer.ts`<br>`explorer/src/hooks/useExplorerData.ts` | `scratch/salesforce-poc/force-app/main/default/lwc/daGraphPayloadLoader/` | None | P0 | `offline test` (Passed 21/21 offline JS harness) |
| **W1-02** | Core Architecture Layout Engine | `explorer/src/lib/architecture-layout.ts`<br>`computeArchitectureLayout()` | `scratch/salesforce-poc/force-app/main/default/lwc/daLayoutEngine/daLayoutEngine.js` | W1-01 | P0 | `source inspected` |
| **W1-03** | Orbit Layout Engine | `explorer/src/lib/layout/orbit-layout.ts`<br>`computeOrbitLayout()` | `scratch/salesforce-poc/force-app/main/default/lwc/daLayoutEngine/orbitLayout.js` | W1-02 | P1 | `source inspected` |
| **W1-04** | Constellation Layout Engine | `explorer/src/lib/layout/constellation-layout.ts`<br>`computeConstellationLayout()` | `scratch/salesforce-poc/force-app/main/default/lwc/daLayoutEngine/constellationLayout.js` | W1-02 | P1 | `source inspected` |
| **W1-05** | Sankey River Layout Engine | `explorer/src/lib/layout/sankey-layout.ts`<br>`computeSankeyLayout()` | `scratch/salesforce-poc/force-app/main/default/lwc/daLayoutEngine/sankeyLayout.js` | W1-02 | P2 | `source inspected` |
| **W1-06** | Apex Graph Data Controller | `explorer/src/lib/graph-builder.ts` | `scratch/salesforce-poc/force-app/main/default/classes/DAGraphService.cls` | W1-01 | P0 | `offline test` (DTO mocked) |
| **W1-07** | Apex Chunk Ingestion Service | `scripts/export-explorer.cjs` | `scratch/salesforce-poc/force-app/main/default/classes/DAIngestionService.cls` | W1-06 | P0 | `offline test` (Chunk sequence validated) |
| **W1-08** | Health & Finding Apex Controllers | N/A (Integrated into DAGraphService/DAIngestionService) | N/A | W1-06 | P2 | `source inspected` (Verified separate `DAHealthService` / `DAFindingService` absent; integrated into DAGraphService) |

---

## 2. Technical Integration Contract & Minimum Integration Payload

### A. Graph Payload Integration Contract
- **Max Payload Size:** 10 MB paginated across SOQL chunk records (`DA_Chunk__c`).
- **Max Chunk Size:** 131,072 characters per chunk.
- **Payload Schema:**
  ```json
  {
    "projectId": "string",
    "nodes": [
      { "id": "string", "displayName": "string", "type": "string", "file": "string", "metrics": {}, "risk": "LOW|MEDIUM|HIGH" }
    ],
    "edges": [
      { "id": "string", "source": "string", "target": "string", "type": "string" }
    ]
  }
  ```

### B. Selection vs Navigation Invariant
- **INVARIANT:** `SELECTION ≠ NAVIGATION`.
- Selecting a node in `daGraphViewer` must update internal selection context and highlight connected edges **without** triggering URL routing, page navigation, or full graph re-render.

---

## 3. Wave 1 Multi-Lane Implementation Order

```
[Lane 1: Data Foundation]
  W1-01 daGraphPayloadLoader UTF-8 & DTO Hardening
        │
        ├──► [Lane 2: Apex Backend Services]
        │      W1-06 DAGraphService.cls SOQL & FLS Protection
        │      W1-07 DAIngestionService.cls Bulk Ingestion
        │
        └──► [Lane 3: Layout Engine Modularization]
               W1-02 daLayoutEngine.js (Hierarchical / Architecture)
                 │
                 ├──► W1-03 orbitLayout.js
                 ├──► W1-04 constellationLayout.js
                 └──► W1-05 sankeyLayout.js
                        │
                        ▼
            [Lane 5: Integration & Offline Regression]
            Expand scratch/salesforce-poc/tests/run-poc-tests.cjs
```

---

## 4. Release Gates & Acceptance Criteria

1. **Gate 1: Build & Type Integrity**
   - `npm run build` succeeds cleanly in both root and `explorer/` workspace.
   - `tsc -p explorer/tsconfig.prod.json` produces 0 type errors.

2. **Gate 2: CLI Governance & Quality Envelope**
   - `npm run test:cli` passes 34/34 script runner files and 151 assertions.

3. **Gate 3: Offline LWC & Layout Engine Parity**
   - `node scratch/salesforce-poc/tests/run-poc-tests.cjs` passes 100% of offline unit tests, including new layout coordinate assertions.

4. **Gate 4: Selection Invariant Maintenance**
   - Node selection events trigger 0 location/routing side-effects.

5. **Gate 5: Live Salesforce Validation (Conditional Gate)**
   - **Status:** `BLOCKED (No Authorized Org)`.
   - **Requirement:** Live deployment validation, SOQL governor limit verification, and LWS runtime tests require an authorized scratch org.
