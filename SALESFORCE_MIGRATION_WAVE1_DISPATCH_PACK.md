# Wave 1 Parallel Workstream Dispatch Pack

**Author:** Jules (Coordinator Agent)
**Target Wave:** Wave 1 (Feature Baseline, Salesforce Feasibility & Data Model Proposals)
**Status:** Copy-Ready Prompts for Dispatch

---

## Instructions for Dispatching Agents

When dispatching agents for Wave 1, copy the exact prompt for the corresponding lane below. Ensure the agent adheres strictly to the file ownership rules and assigned primary deliverable artifact.

---

## PROMPT 1: Lane A — Feature Inventory & Baseline Matrix

```markdown
# Wave 1 Lane A Dispatch Prompt — Feature Inventory & Baseline Matrix

## Mission
Perform a read-only audit of the existing Dependency Analyzer React/Node codebase to build an exhaustive, evidence-backed Feature Parity Matrix and Baseline Verification Report.

## Responsibilities
1. Inspect all 18 view modes across 5 workspace domains in `explorer/src/`:
   - Portfolio & Health: `dashboard`, `compare`, `history`
   - Topological Structure: `graph`, `subway`, `constellation`, `tree`, `treemap`
   - Feature Relationships: `matrix`, `heatmap`, `river`, `dna`
   - Local Neighborhood: `profile`, `radar`, `four-direction`
   - Governance & Quality: `findings`, `hotspots`, `diagnostics`
2. Inspect the 4 architecture layout modes (`hierarchical`, `hybrid`, `orbit`, `constellation`) and position persistence logic in `explorer/src/lib/projectState.ts`.
3. Inspect drawers and overlays (`InvestigationDrawer`, `RefactorHandoffModal`, `CommandPalette`, `RefactoringSimulationPanel`).
4. Inspect deep linking URL state synchronization (`useViewState.ts`, `urlQuery.ts`).
5. Map every feature to its enforcing TypeScript interface (`explorer/src/types/explorer.ts`) and verifying test suite in `explorer/src/test/` or `scripts/`.
6. Document documentation stale claims and discrepancies against current executable code.

## Allowed Modification Scope
- `SALESFORCE_MIGRATION_FEATURE_PARITY_MATRIX.md`
- `SALESFORCE_MIGRATION_BASELINE_REPORT.md`

## Prohibited Actions
- DO NOT modify any application code (`explorer/src/**`, `scripts/**`, `package.json`).
- DO NOT edit tests or modify test assertions.
- DO NOT change dependencies.

## Acceptance Criteria
- `SALESFORCE_MIGRATION_FEATURE_PARITY_MATRIX.md` contains an exhaustive table listing all 18 view modes, layout modes, drawers, filters, and URL query contracts, marked with implementation priority (P0/P1/P2) and Salesforce LWC equivalent.
- `SALESFORCE_MIGRATION_BASELINE_REPORT.md` documents exact test coverage per domain and highlights documentation contradictions.
```

---

## PROMPT 2: Lane B — Salesforce Architecture Feasibility Analysis

```markdown
# Wave 1 Lane B Dispatch Prompt — Salesforce Architecture Feasibility Analysis

## Mission
Investigate the technical feasibility, security restrictions, performance limits, and deployment prerequisites for running the Dependency Analyzer as a Salesforce-native application using LWC, Apex, and Lightning Web Security.

## Responsibilities
1. Inspect Salesforce CLI availability and org readiness (`sf --version`, `sf org list`).
2. Evaluate Lightning Web Security (LWS) and Content Security Policy (CSP) constraints on Cytoscape.js, DOM canvas manipulation, and Web Worker thread execution inside LWC.
3. Benchmark graph layout performance requirements against Apex governor limits (6MB heap, 10s CPU limit, SOQL limits) for the 528-node PBIM dataset.
4. Determine whether Cytoscape.js can run as an LWC Static Resource or third-party library wrapper.
5. Create an isolated proof-of-concept LWC scaffold inside `scratch/salesforce-poc/` (if authorized) to test Cytoscape initialization in LWS.
6. Identify exact technical blockers that require a connected Salesforce org to verify.

## Allowed Modification Scope
- `SALESFORCE_NATIVE_FEASIBILITY_REPORT.md`
- Isolated scaffold directory: `scratch/salesforce-poc/**`

## Prohibited Actions
- DO NOT modify the main React application in `explorer/src/`.
- DO NOT attempt live org deployments without explicit org credentials.
- DO NOT alter core layout algorithms in `explorer/src/lib/layout/`.

## Acceptance Criteria
- `SALESFORCE_NATIVE_FEASIBILITY_REPORT.md` produced with explicit findings on Cytoscape.js LWS compatibility, static resource packaging, Apex vs LWC computation split, governor limit risks, and open org-dependent questions.
```

---

## PROMPT 3: Lane C — Data Model & Contract Proposal

```markdown
# Wave 1 Lane C Dispatch Prompt — Data Model & Contract Proposal

## Mission
Design a production-grade Salesforce custom object data model, relationship architecture, and Apex DTO mapping that represents the complete analysis graph, node metrics, edge relationships, and historical analysis runs.

## Responsibilities
1. Inspect `explorer/src/types/explorer.ts`, `explorer/public/pbim/explorer-data.json`, and `project-manifest.json`.
2. Evaluate Normalized Custom Objects (`Analysis_Run__c`, `Dependency_Node__c`, `Dependency_Edge__c`, `Node_Metrics__c`) versus Serialized Payloads (Big Objects / ContentVersion / Long Text) using real fixture file sizes (e.g., PBIM 528-node JSON size ~1.2MB).
3. Design custom object fields, data types, relationships (Master-Detail vs Lookup), external IDs for idempotency, and indexing for fast SOQL lookups.
4. Define CRUD, FLS (Field-Level Security), and Org-Wide Default (OWD) sharing rules for enterprise compliance.
5. Define Apex DTO contracts and JSON serialization interfaces for fast LWC wire adapter consumption.

## Allowed Modification Scope
- `SALESFORCE_DATA_MODEL_AND_CONTRACTS.md`

## Prohibited Actions
- DO NOT modify `explorer/src/types/explorer.ts`.
- DO NOT deploy or create production custom object metadata in `force-app/` during this phase.

## Acceptance Criteria
- `SALESFORCE_DATA_MODEL_AND_CONTRACTS.md` produced with entity-relationship diagrams (ERD in Mermaid format), complete field specification tables, storage limit analysis for PBIM/large orgs, and CRUD/FLS security matrix.
```
