# Jules Master Prompt — Dependency Analyzer to Salesforce: Exhaustive File-by-File Migration Audit

## Mission

Perform a repository-wide, source-code-level audit to determine **exactly what has been migrated, what has only been partially migrated, and what remains to be migrated from the existing Dependency Analyzer React/TypeScript/Node.js application into Salesforce**.

The user's current assessment is that only approximately 10% has been migrated. Treat this as a hypothesis to verify, not as an established measurement.

This is not another Salesforce runtime acceptance audit. It is a comprehensive **migration completeness and source-code coverage audit**.

Your primary objective is to identify every relevant source file, exported function, class, hook, component, adapter, algorithm, rule, data contract, state transition, persistence mechanism, command, interaction, and user-facing workflow that must be migrated, reproduced, replaced by a Salesforce-native equivalent, or deliberately retained outside Salesforce.

Produce a traceable inventory showing:

**Existing source file and exact location → exported symbol or behavior → dependencies → current Salesforce equivalent → migration completeness → missing work → target file/object/component → verification evidence.**

Do not infer migration completeness from the existence of a Salesforce object, Apex class, LWC, architecture document, test stub, or proof of concept. Confirm the implementation and its behavior.

## 1. Mandatory operating rules

1. Begin with a read-only audit. Do not edit, delete, rename, move, or rewrite production source code during the initial inventory.
2. Inspect the actual repository checkout, not just historical reports. Confirm branch, commit SHA, working-tree state, project instructions, and repository root.
3. Read the existing Salesforce migration documentation and relevant architecture contracts, then verify every material claim against current code.
4. Do not assume a file is migrated because another file with a similar name exists in Salesforce.
5. Do not count placeholder components, empty methods, mocked implementations, static-only verification, test-only code, or authored-but-unexecuted Apex as completed production migration.
6. Do not classify a file as out of scope simply because it is difficult, old, experimental, or not currently visible in the primary UI. Trace whether its behavior is imported, called, exported, executed by a CLI, used by fixtures, or relied upon by a workflow.
7. Do not automatically migrate every file verbatim. Distinguish production functionality from tests, build tooling, local-only utilities, historical reports, fixtures, and generated artifacts. Explain the disposition of each category.
8. Do not modify the existing React/TypeScript application or the core Node.js engine during this audit.
9. Preserve the invariant **SELECTION ≠ NAVIGATION** in all migration requirements.
10. If dependencies or tools required for the audit are missing, install them in Jules where permitted, verify their versions, and rerun the affected checks. Do not silently skip work due to missing dependencies.
11. Do not authenticate to, deploy to, or modify a Salesforce org for this inventory exercise. This is a source and migration-completeness audit.
12. Do not fabricate paths, symbols, test results, line numbers, implementation evidence, or migration percentages.
13. When a path differs from the expected path in this prompt, resolve it from the actual repository and record the real path.
14. Do not stop when the report directory or file count becomes large. Divide the audit into deterministic batches and maintain a complete inventory ledger until all relevant source files have been classified.
15. No final PASS or percentage claim without a reproducible inventory, explicit denominator, evidence for each status, and independent reconciliation.

---

## 2. Repository areas that must be inspected

The uploaded repository snapshot contains the following principal areas. Verify that they exist in the actual checkout and record the current inventory.

### A. React/TypeScript application

**Primary root:** `explorer/src/`

The archive contains hundreds of TypeScript and TSX files in this area. You must inventory all relevant production code, not merely the primary graph screen.

Inspect at minimum:

- `explorer/src/App.tsx`
- `explorer/src/types/explorer.ts`
- `explorer/src/lib/graph-builder.ts`
- `explorer/src/lib/graph-style.ts`
- `explorer/src/lib/graph-layout.ts`
- `explorer/src/lib/architecture-layout.ts`
- `explorer/src/lib/position-policy.ts`
- `explorer/src/lib/layout/`
- `explorer/src/lib/workers/`
- `explorer/src/lib/projectState.ts`
- `explorer/src/lib/annotations.ts`
- `explorer/src/lib/refactoring-simulation.ts`
- `explorer/src/lib/intelligence/`
- `explorer/src/hooks/`
- `explorer/src/context/`
- `explorer/src/components/`
- `explorer/src/components/workspace/`
- `explorer/src/test/`

These are minimum inspection targets, not an exhaustive allowlist. Discover all additional production directories, imports, entry points, dynamic imports, workers, adapters, hooks, utility modules, stylesheets, and runtime assets.

For every file under the application source tree, determine whether it implements functionality that must be migrated, provides shared infrastructure, is a test, is generated, or has a documented reason to remain outside Salesforce.

### B. Node.js analysis engine and CLI

**Primary roots:** `scripts/`, `analyze/`, and root-level source modules.

Inspect the actual root `package.json`, root lockfile, every executable script, every CLI entry point, every imported module, and all command-forwarding behavior.

The archive's root `package.json` declares a `test:cli` suite that covers many analysis and governance tools. The following files were present in the snapshot and must be inspected where they remain in the actual checkout:

- `scripts/dependency-analyzer.cjs`
- `scripts/architecture-maps.cjs`
- `scripts/architecture-profile.cjs`
- `scripts/architecture-health.cjs`
- `scripts/architecture-debt.cjs`
- `scripts/architecture-smells.cjs`
- `scripts/architecture-quality-gates.cjs`
- `scripts/architecture-regression.cjs`
- `scripts/architecture-snapshot.cjs`
- `scripts/architecture-diff.cjs`
- `scripts/architecture-change-gate.cjs`
- `scripts/architecture-decision-context.cjs`
- `scripts/architecture-metrics.json`
- `scripts/bottleneck-detector.cjs`
- `scripts/business-criticality.cjs`
- `scripts/data-impact.cjs`
- `scripts/domain-classifier.cjs`
- `scripts/duplicate-responsibility.cjs`
- `scripts/entry-points.cjs`
- `scripts/external-boundaries.cjs`
- `scripts/investigation-context-minimizer.cjs`
- `scripts/investigation-eligibility.cjs`
- `scripts/layer-classifier.cjs`
- `scripts/llm-usage-accounting.cjs`
- `scripts/path-analyzer.cjs`
- `scripts/refactoring-sequencer.cjs`
- `scripts/role-classifier.cjs`
- `scripts/safety-envelope.cjs`
- `scripts/security-boundaries.cjs`
- `scripts/semantic-investigation-adapter.cjs`
- `scripts/run-explorer.cjs`
- `scripts/export-explorer.cjs`

Also inspect the other files discovered in `scripts/`; the list above is not exhaustive.

For every analysis or governance tool, identify its actual input format, algorithms, exported data, CLI arguments, error handling, safety controls, downstream consumers, and tests.

Determine whether the functionality should become:
- Apex business logic;
- an LWC/client-side algorithm;
- a Salesforce Flow or other native automation;
- a Salesforce report, dashboard, or query;
- a separately retained Node.js analysis service;
- or a documented hybrid architecture.

Do not presume all static analysis should run inside Apex. Evaluate Salesforce governor limits, available runtime capabilities, input repository access, payload sizes, execution time, and the architectural decision register. Record the rationale and the data/API contracts for every retained external service.

### C. Existing Salesforce implementation

**Primary root:** `scratch/salesforce-poc/`

Inspect all current Salesforce metadata, code, assets, tests, and configuration. The archive includes the following known paths, which must be verified:

**Project configuration**
- `scratch/salesforce-poc/sfdx-project.json`
- `scratch/salesforce-poc/config/project-scratch-def.json`

**Apex classes**
- `scratch/salesforce-poc/force-app/main/default/classes/controllers/DAGraphController.cls`
- `scratch/salesforce-poc/force-app/main/default/classes/services/DAGraphChunkService.cls`
- `scratch/salesforce-poc/force-app/main/default/classes/services/DAGraphIngestionService.cls`
- `scratch/salesforce-poc/force-app/main/default/classes/dto/DAGraphDTO.cls`
- `scratch/salesforce-poc/force-app/main/default/classes/dto/DAErrorResponse.cls`
- `scratch/salesforce-poc/force-app/main/default/classes/GraphDataController.cls`
- `scratch/salesforce-poc/force-app/main/default/classes/tests/DAGraphControllerTest.cls`

Also locate every additional Apex class, test class, trigger, and metadata file, including security tests if present.

**Lightning Web Components**
- `scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/`
- `scratch/salesforce-poc/force-app/main/default/lwc/daGraphPayloadLoader/`
- `scratch/salesforce-poc/force-app/main/default/lwc/graphViewer/`

Inspect every JavaScript, HTML, CSS, and metadata file in these component directories. Determine whether each component is production-connected, duplicated, obsolete, partially integrated, or an isolated prototype.

**Static resources**
- `scratch/salesforce-poc/force-app/main/default/staticresources/`

Inspect the complete static-resource inventory, including Cytoscape and any dependencies or licenses.

**Custom objects and supporting metadata**
- `scratch/salesforce-poc/force-app/main/default/objects/`
- `scratch/salesforce-poc/force-app/main/default/permissionsets/`
- `scratch/salesforce-poc/force-app/main/default/tabs/`
- `scratch/salesforce-poc/force-app/main/default/applications/`
- `scratch/salesforce-poc/force-app/main/default/flexipages/`
- `scratch/salesforce-poc/force-app/main/default/labels/`

Inspect any additional metadata directories discovered. Do not mark a feature as migrated merely because its custom object exists. Trace its read/write paths, business logic, UI, access controls, and tests.

### D. Canonical datasets and data contracts

Inspect:

- `explorer/public/projects/`
- `explorer/src/types/explorer.ts`
- `explorer/src/lib/schema.ts` or the actual schema module discovered
- `explorer/src/lib/`
- `explorer/src/test/`
- `SALESFORCE_DATA_MODEL_AND_CONTRACTS.md`
- `SALESFORCE_MIGRATION_FEATURE_PARITY_MATRIX.md`

Identify every canonical fixture and every data format consumed or produced by the application. Include manifests, graph JSON, analysis summaries, snapshots, findings, cycles, unresolved references, component metrics, dependency edges, and project metadata.

For every data contract, document its producer, consumers, invariants, serialization format, storage location, versioning, and Salesforce representation.

### E. Migration decisions and existing evidence

Read these documents if present:

- `SALESFORCE_MIGRATION_BASELINE_REPORT.md`
- `SALESFORCE_MIGRATION_BASELINE_EVIDENCE.md`
- `SALESFORCE_MIGRATION_DECISION_REGISTER.md`
- `SALESFORCE_MIGRATION_FEATURE_PARITY_MATRIX.md`
- `SALESFORCE_MIGRATION_WAVE0_COORDINATOR_REPORT.md`
- `SALESFORCE_MIGRATION_WAVE1_DISPATCH_PACK.md`
- `SALESFORCE_MIGRATION_WORKSTREAM_OWNERSHIP.md`
- `SALESFORCE_NATIVE_FEASIBILITY_REPORT.md`
- `SALESFORCE_DATA_MODEL_AND_CONTRACTS.md`
- `WAVE7_FINAL_SALESFORCE_RUNTIME_ACCEPTANCE_REPORT.md`
- `docs/audits/salesforce-wave2/`
- `docs/audits/salesforce-wave2-verification/`
- `docs/audits/salesforce-wave3/`
- `docs/audits/salesforce-wave5/`
- `docs/audits/salesforce-wave6/`
- `explorer/docs/SALESFORCE_ARCHITECTURE_EXPLORER_REMEDIATION_PLAN.md`

Read all relevant migration audit reports, test reports, decisions, blockers, and final-stage handoffs. Use these as historical context and locate contradictions. Current source code takes precedence when establishing actual implementation state.

Do not waste time treating every historical audit document as production functionality to migrate. Classify documentation and evidence separately from executable application code.

---

## 3. Establish a complete source-file census

Before evaluating migration status, generate a reproducible inventory of the current repository.

Use Git's tracked-file list and filesystem discovery. Inspect ignored/untracked source files where appropriate without accidentally including dependency caches or build outputs as production source.

Classify files into at least:

1. Production application code.
2. Analysis engine and executable CLI.
3. Shared libraries and algorithms.
4. UI components and interaction infrastructure.
5. Data contracts, schemas, and serializers.
6. State management and persistence.
7. Background workers and asynchronous orchestration.
8. External integrations and AI/LLM-related functionality.
9. Tests, fixtures, mocks, and test harnesses.
10. Salesforce metadata and implementation.
11. Build, export, deployment, and CI tooling.
12. Documentation, audit evidence, and historical reports.
13. Generated or vendored assets.
14. Deprecated or apparently unreferenced files.
15. Unclassified files requiring investigation.

For each source file, record:

- Exact repository-relative path.
- Language and file type.
- Production/test/configuration/documentation classification.
- Exported symbols, public functions, classes, hooks, components, commands, or metadata declarations.
- Direct imports and meaningful callers.
- Data read and written.
- Side effects, state transitions, and persistence.
- User-visible behavior or business responsibility.
- Existing tests and their locations.
- Existing Salesforce counterpart, if any.
- Migration disposition and evidence.

Do not stop at filename-level classification. Read the implementation and follow important call chains. A file can contain multiple responsibilities with different migration statuses.

### Required census integrity checks

- Every discovered production source file has a row in the inventory.
- Every discovered Salesforce implementation file has a row.
- All relevant executable scripts and exported modules have been classified.
- All dynamic imports, workers, plugin registrations, routing tables, and CLI dispatch tables have been traced.
- Shared modules used by multiple features are not counted multiple times in the file denominator.
- Files with no obvious callers have been investigated before being marked unused.
- Every excluded file has a reason.
- Every unclassified file remains explicitly unresolved and blocks a claim of exhaustive completion.

---

## 4. Reconstruct the complete application feature inventory

Use the following known feature list as a mandatory starting point. Confirm each feature and discover any additional workflows in the code.

### A. The 18 documented view modes

The feature parity matrix identifies the following source components and behaviors. Find the exact path of each source file in the actual checkout and map all associated supporting files.

| ID | Feature | Known source symbols/files | Required audit |
|---|---|---|---|
| VIEW-01 | Dashboard | `ProjectDashboard.tsx` | KPIs, risk distribution, layer distribution, health score, navigation/filter interactions |
| VIEW-02 | Compare | `ComparePanel.tsx`, `compare.ts` | Snapshot comparison, added/removed/modified nodes and edges, diff focus, comparison state |
| VIEW-03 | History | `AnalysisHistoryPanel.tsx`, `projectHistory.ts` | Historical runs, trend data, snapshot activation and chronology |
| VIEW-04 | Interactive graph | `GraphView.tsx`, `graph-builder.ts` | Graph construction, Cytoscape lifecycle, selection, edge interaction, drag, zoom/pan, hover, layout and positions |
| VIEW-05 | Subway map | `SubwayPanel.tsx`, `subway-adapter.ts` | Layers, stations, lines, segment relationships and filtering |
| VIEW-06 | Constellation | `DependencyConstellationPanel.tsx`, `constellation-adapter.ts`, `constellation-layout.ts` | Clusters, node placement, expansion/collapse and interaction |
| VIEW-07 | Tree | `FeatureTreePanel.tsx` | Hierarchy, expand/collapse, search and selection |
| VIEW-08 | Treemap | `ArchitectureTreemapPanel.tsx`, `treemap-adapter.ts`, `treemap-layout.ts` | Squarified geometry, size/risk metrics, drill-down and tooltips |
| VIEW-09 | Coupling matrix | `FeatureMatrixPanel.tsx`, `matrix-adapter.ts` | Directional coupling, relationship types, sorting, selection/filtering |
| VIEW-10 | Coupling heatmap | `CouplingHeatmapPanel.tsx` | Intensity calculations, thresholds, selection and cell details |
| VIEW-11 | Dependency river | `DependencyRiverPanel.tsx`, `sankey-adapter.ts`, `sankey-layout.ts` | Sankey node/link calculations, layer flows, highlighting and filtering |
| VIEW-12 | Architecture DNA | `ArchitectureDNABarcode.tsx`, `dna-adapter.ts` | Trait calculations, risk signals, ordering, search and details |
| VIEW-13 | Component profile | `FeatureProfilePanel.tsx`, `profile-adapter.ts` | Component detail, fan-in/fan-out, dependencies, dependents, tests, tabs and actions |
| VIEW-14 | Health radar | `RadarPanel.tsx`, `radar-adapter.ts` | Metric normalization, axes, baselines and component comparison |
| VIEW-15 | Four-direction expansion | `FourDirectionPanel.tsx`, `four-direction-adapter.ts` | Upstream/downstream/peers/tests, depth, traversal and expansion |
| VIEW-16 | Findings | `FindingsPanel.tsx`, `finding.ts` | Findings, severity/category filtering, node selection and export |
| VIEW-17 | Hotspots | `HotspotPanel.tsx`, `hotspots.ts` | Risk scoring, ranking, thresholds and inspection |
| VIEW-18 | Diagnostics | `DiagnosticsPanel.tsx` | Cycles, unresolved references, evidence and edge/node focus |

For each feature, inventory the full dependency closure, not just its named main component. Include its adapters, selectors, hooks, type definitions, utility functions, layout algorithms, styles, child components, data producers, event handlers, tests, and relevant URL/state contracts.

If the implementation contains additional views or newer replacements, add them to the matrix. Do not force the code to match an outdated list.

### B. Four architecture layout modes

Audit all algorithms and behavior related to:

- Hierarchical layout — `architecture-layout.ts`, `graph-layout.ts`.
- Hybrid layout — `architecture-layout.ts` and related cluster/geometry modules.
- Orbit layout — `orbit-layout.ts`, `component-orbit-layout.ts`.
- Constellation layout — `constellation-layout.ts`, `component-constellation-layout.ts`.

Find the actual source locations and every supporting module, including geometry utilities, worker messages, position authority, user overrides, layout configuration, persistence, deterministic ordering, cancellation, and error recovery.

A Salesforce migration is incomplete if it renders a graph but silently drops one or more layout modes, changes layout semantics, loses user-controlled positions, or fails to preserve their independent state.

### C. Shared UI, navigation, and overlays

Search for and map all behavior implemented by:

- `InvestigationDrawer`
- `RefactorHandoffModal`
- `CommandPalette`
- `RefactoringSimulationPanel`
- `KeyboardShortcutsModal`
- `ProjectCreationModal`
- `NodeHoverCard`
- `EdgeHoverCard`
- Workspace header/navigation and workspace router.
- Graph controls and legends.
- Search, filtering, selection, inspection, context actions and export.
- Error boundaries, loading states, empty states and recovery UI.
- Accessibility behavior and keyboard interaction.

Find exact source paths and include additional overlays or shared components discovered during the audit.

### D. State, storage, URL, and isolation

Audit:

- `explorer/src/lib/projectState.ts`
- `explorer/src/context/`
- `explorer/src/hooks/`
- `explorer/src/lib/position-policy.ts`
- `explorer/src/lib/layout/positions.ts`
- `explorer/src/components/workspace/`
- Actual URL state/deep-link modules.
- All other state and persistence modules discovered through imports.

Trace project switching, active view, selection, focus, filters, comparison state, layout positions, zoom/pan, sidebar state, inspector state, keyboard state, and all project-specific persistence.

Determine which state is:
- Durable and shared.
- Per user.
- Per project.
- Per analysis run.
- Transient UI state.
- Derived from the graph.
- Stored in URL/deep links.
- Currently stored in local storage or session storage.

Map every item to an explicit Salesforce design or a justified external-state mechanism. Identify migration, versioning, reset, recovery, and cross-user behavior.

### E. Analysis and governance engine

Enumerate every executable analysis tool and public operation. Do not rely on the list below as exhaustive.

Known examples include:

- Dependency graph construction and path analysis.
- Entry-point discovery.
- Layer and domain classification.
- Role classification.
- External-boundary detection.
- Bottleneck detection.
- Business criticality.
- Test-gap analysis.
- Security-boundary analysis.
- Duplicate-responsibility analysis.
- Data-impact analysis.
- Architecture profiles, maps, health, debt, and smells.
- Architecture quality gates and regression checks.
- Snapshot creation and diff.
- Change simulation.
- Refactoring sequencing.
- Safety envelopes.
- Investigation eligibility and context minimization.
- Architecture decision context.
- LLM usage accounting.
- Semantic investigation adapters.
- Deterministic contracts and geometry/worker contracts.

Find all actual module names, paths, exports, CLI entry points, tests, input/output schemas and dependencies.

For each operation, decide whether it should execute in Apex, in LWC, in an external Node.js service, in a scheduled/background worker, or be retired with explicit approval. Record why. Identify all operations that currently have no Salesforce equivalent.

---

## 5. Trace every source symbol to a destination

For each relevant production file, inspect its exported symbols and significant internal responsibilities.

For each symbol, record:

1. Source file and line range, where line numbers are available.
2. Symbol name and responsibility.
3. Callers and dependencies.
4. Input/output contract.
5. Observable side effects.
6. Existing tests.
7. Current Salesforce equivalent, if any.
8. Target Salesforce path or retained-service destination.
9. Status and evidence.
10. Missing behavior and acceptance tests.

Use this migration-status vocabulary consistently:

- **MIGRATED AND VERIFIED:** equivalent behavior exists in the destination and has passing evidence at the appropriate level.
- **MIGRATED — PARITY UNVERIFIED:** implementation exists, but behavior has not been sufficiently compared.
- **PARTIALLY MIGRATED:** some responsibilities exist, but material behavior is missing.
- **SCAFFOLDED ONLY:** files, metadata or component shells exist without complete behavior.
- **NOT MIGRATED:** no valid equivalent exists.
- **REPLACED BY APPROVED DESIGN:** a documented, approved alternative intentionally replaces the source implementation.
- **RETAINED OUTSIDE SALESFORCE:** deliberately remains external with an explicit architecture and API contract.
- **OBSOLETE — VERIFIED:** demonstrably unused or superseded, with evidence and approved disposition.
- **BLOCKED:** cannot determine or verify because of a specific prerequisite.
- **UNCLASSIFIED:** investigation is incomplete.

Do not treat `SCAFFOLDED ONLY`, `MIGRATED — PARITY UNVERIFIED`, `BLOCKED`, or `UNCLASSIFIED` as complete migration.

### Target destination mapping

For every responsibility that is to be migrated, specify its proposed destination. Use exact paths when the destination already exists. For proposed files, label the paths **PROPOSED — NOT PRESENT**.

Examples of destination patterns, to be validated rather than blindly imposed:

- Apex: `scratch/salesforce-poc/force-app/main/default/classes/`
- LWC: `scratch/salesforce-poc/force-app/main/default/lwc/<component-name>/`
- Custom objects: `scratch/salesforce-poc/force-app/main/default/objects/<ObjectName>/`
- Permission sets: `scratch/salesforce-poc/force-app/main/default/permissionsets/`
- Static resources: `scratch/salesforce-poc/force-app/main/default/staticresources/`
- Apex tests: corresponding test classes under the current Salesforce class metadata layout.
- Shared client-side algorithms: an LWC module or a justified shared static-resource module.
- External analysis service: a proposed, documented service boundary, API schema, authentication model and deployment target.

Do not create destination files during this audit. First define the destination inventory and identify architectural decisions that require approval.

---

## 6. Compare the source against the actual Salesforce POC

For every source feature and symbol, inspect the corresponding Salesforce implementation in detail.

Trace the actual execution path:

**Source input → transformation or analysis → data model → storage → service/API → Salesforce UI → interaction/state → output.**

A feature is not migrated simply because the UI has a button or an Apex class has a similarly named method.

Verify whether the Salesforce implementation:
- Computes the same result.
- Uses equivalent data contracts and identifiers.
- Preserves all meaningful fields and relationships.
- Preserves selection and navigation semantics.
- Preserves project and user isolation.
- Preserves deterministic behavior where required.
- Preserves error and edge-case behavior.
- Handles empty, malformed, large and partial data.
- Preserves exports and downstream integrations.
- Has corresponding automated tests.
- Is wired into an actual navigation path and user workflow.

Identify dead ends, placeholder callbacks, hard-coded values, mock-only paths, duplicate implementations, unreferenced components and features that exist only in documents.

For each discrepancy, provide the exact source path and symbol, the Salesforce path and symbol (or state that none exists), a concrete behavioral difference, impact, and a proposed correction.

---

## 7. Data model and persistence completeness audit

Inspect the current Salesforce data model and compare it with every source contract.

Known conceptual entities include:

- `ProjectMetadata` → project record.
- `ProjectAnalysisHistory` / `ProjectSnapshot` → analysis-run/history records.
- `ExplorerDataSchema`, nodes and edges → graph payload storage and retrieval.
- `ArchitectureFinding` → finding records.
- `Annotation` → annotation/review records.
- `ProjectUIState` → per-user/per-project preferences.
- `RefactoringProposal` → transient simulation state or exported artifact.

Verify the actual object and field names in metadata rather than assuming the conceptual names match.

Audit all fields and data structures, including:

- Node types and relationship types.
- IDs, external IDs and graph endpoint references.
- Component metrics and summaries.
- Cycles and unresolved references.
- Findings, severity, evidence and status.
- Snapshots, active-run identity and graph hashes.
- User annotations and review state.
- Refactoring proposals and simulation steps.
- Per-user preferences, filters and layout positions.
- URLs, deep links and view state.
- Source-file and line evidence.
- Analysis configuration and tool version metadata.

For each structure, report:
- Source schema and file path.
- Salesforce object/field/API representation.
- Field type, capacity and constraints.
- Normalization or serialization strategy.
- Relationship and ownership semantics.
- Versioning and compatibility.
- CRUD/FLS/sharing implications.
- Retention and historical immutability requirements.
- Missing fields or lost semantics.

Pay special attention to graph payload size, Salesforce field limits, heap limits, query limits, response-size limits, and the difference between characters and bytes. Do not assume that one large JSON response is viable.

The existing POC has explored bounded chunk retrieval. Determine whether this mechanism covers all graph data requirements or only the current demonstration path. Record any unimplemented ingestion, update, deletion, versioning, pagination, validation, or recovery workflows.

---

## 8. Security and integration inventory

Search the complete source tree for all security-sensitive and integration-related behavior, including:

- Filesystem access and repository scanning.
- Process execution and CLI commands.
- External APIs and HTTP clients.
- Authentication, credentials and token handling.
- LLM providers and prompt construction.
- User input validation.
- Data export and file generation.
- Safety envelopes and destructive-action controls.
- Audit logging and usage accounting.
- Access to sensitive code evidence.
- Cross-project and cross-user data isolation.

For every integration, document its source file, entry point, dependencies, credentials model, inputs/outputs, failure handling, limits and tests.

Determine what Salesforce can safely execute natively, what requires an external service, and what requires explicit architectural approval.

Do not claim an integration has been migrated merely because a UI control exists. Trace the full request and response path, including authorization and error handling.

---

## 9. Quantify migration completeness correctly

Produce separate metrics for:

1. Source-file coverage.
2. Symbol/responsibility coverage.
3. Feature parity.
4. Data-contract coverage.
5. CLI/analysis operation coverage.
6. Persistence and state coverage.
7. Test and verification coverage.
8. Salesforce integration completeness.

Do not collapse all of these into one misleading percentage.

### Required calculation rules

For source-file coverage, use unique, relevant production source files as the denominator. Exclude tests, generated files, vendored dependencies, historical reports and documentation only when they are explicitly classified and excluded with reasons.

For symbol/responsibility coverage, count distinct meaningful responsibilities rather than only files. A single file may contain both migrated and unmigrated behavior.

For feature parity, evaluate every documented feature and any additional features discovered in code. Weighting may be shown as an additional view, but the unweighted results must remain visible.

For each metric, provide:
- Numerator.
- Denominator.
- Exact inclusion/exclusion rules.
- Count of fully verified, partial, scaffold-only, unmigrated, blocked and unclassified items.
- Evidence source.
- Known uncertainty.

A file that is partly migrated must not count as fully migrated in the strict completion percentage.

Report the user's approximately 10% estimate as **confirmed, disproven, or not yet measurable**, based on the resulting inventory and transparent calculation. Do not force the final percentage to match the estimate.

---

## 10. Dependency graph and migration sequencing

Build a source-to-destination dependency map. Identify:

- Core contracts required by multiple features.
- Algorithms shared across views.
- Data-model prerequisites.
- API/service prerequisites.
- State and persistence prerequisites.
- Security prerequisites.
- UI integration dependencies.
- Testing and fixture dependencies.
- Components that cannot safely be migrated independently.

Recommend a migration sequence that avoids implementing many disconnected UI shells before their data and behavior contracts exist.

Use separate migration workstreams where beneficial, but define file ownership and shared-file boundaries to prevent conflicting changes. The coordinator must own integration and final acceptance.

Do not launch broad implementation merely because the audit has identified missing work. First complete and reconcile the inventory, approve the architecture decisions, and produce a dependency-aware migration roadmap.

---

## 11. Verification and environment requirements

During this audit:

1. Inspect installed Node.js, npm, Salesforce CLI and relevant test tools.
2. If a required audit tool is missing, install it in Jules if permitted and verify it.
3. Use repository lockfiles and existing package manifests; do not perform unrelated dependency upgrades.
4. Reproduce relevant existing checks where practical:
   - Root `npm run test:cli`.
   - Explorer production build using the actual workspace package.
   - Relevant targeted tests for identified features and contracts.
   - Existing static checks or inventory scripts.
5. Record exact commands, working directories, exit codes, and results.
6. Separate source inspection from executed tests and live Salesforce validation.
7. Do not run a Salesforce deployment or claim live Apex/LWS acceptance as part of this audit.
8. If a full test suite is blocked, run relevant targeted tests and document the remaining gap.

The archive contains historical reports of 34 root CLI tests passing, an Explorer build passing, and four focused Vitest failures. Verify the current checkout before repeating these as current results.

---

## 12. Required deliverables

Create the following audit artifacts in the repository, preserving any existing files with the same names.

### Deliverable A — Master migration audit report

Filename:

`SALESFORCE_EXHAUSTIVE_SOURCE_TO_DESTINATION_MIGRATION_AUDIT.md`

Include:
- Executive conclusion.
- Actual source and Salesforce repository identity.
- Methodology and scope.
- Source-file inventory totals.
- Verified current Salesforce implementation scope.
- Migration completeness calculations.
- Missing and partially migrated functionality.
- Architecture decisions and external-service boundaries.
- Major risks and dependencies.
- Final recommendation.

### Deliverable B — File-by-file migration inventory

Filename:

`SALESFORCE_FILE_BY_FILE_MIGRATION_INVENTORY.csv`

One row per relevant source file, with at least these columns:

- `source_path`
- `language`
- `source_category`
- `source_symbols`
- `responsibility_summary`
- `callers_and_dependencies`
- `data_contracts`
- `user_visible_workflow`
- `test_paths`
- `salesforce_counterpart_path`
- `salesforce_counterpart_symbols`
- `migration_status`
- `parity_evidence`
- `missing_behavior`
- `proposed_destination_path`
- `proposed_destination_symbols`
- `priority`
- `dependencies_or_blockers`
- `disposition_rationale`

Use repository-relative paths. Quote CSV fields correctly. Ensure the file is machine-readable and includes every relevant source file.

### Deliverable C — Symbol-level migration matrix

Filename:

`SALESFORCE_SYMBOL_LEVEL_MIGRATION_MATRIX.md`

Include each significant exported symbol and each internal responsibility that materially affects behavior. Provide exact source locations, current destination, parity status, missing behavior, tests and proposed target.

Do not hide multiple responsibilities under a vague row such as “graph functionality migrated.”

### Deliverable D — Feature parity matrix

Filename:

`SALESFORCE_COMPLETE_FEATURE_PARITY_MATRIX.md`

Include all 18 documented view modes, four layout modes, shared UI, project lifecycle, analysis engine, governance rules, data handling, persistence, deep links, annotations, comparison/history, refactoring workflows, CLI behavior, exports, security and all additional discovered functionality.

For every row, state the exact source path, exact Salesforce counterpart path or absence, behavior coverage, missing work, acceptance criteria and test requirements.

### Deliverable E — Salesforce destination inventory

Filename:

`SALESFORCE_TARGET_IMPLEMENTATION_INVENTORY.md`

List:
- Existing Salesforce files and their actual responsibilities.
- Missing target Apex classes.
- Missing LWC components and modules.
- Missing custom objects/fields/relationships.
- Missing permission sets and access configuration.
- Missing static resources and dependencies.
- Missing ingestion and update mechanisms.
- Missing tests and fixtures.
- Proposed target paths, explicitly labeled `PROPOSED — NOT PRESENT`.
- Required dependencies and recommended implementation order.

Do not create these missing files in the audit phase.

### Deliverable F — Migration gap and risk register

Filename:

`SALESFORCE_MIGRATION_GAP_REGISTER.md`

For each gap, include:
- Stable ID.
- Source path and symbol.
- Missing destination or incorrect behavior.
- User/business impact.
- Severity and priority.
- Required fix.
- Prerequisites.
- Acceptance tests.
- Dependencies.
- Evidence.
- Recommended workstream.

### Deliverable G — Dependency-aware migration roadmap

Filename:

`SALESFORCE_MIGRATION_IMPLEMENTATION_ROADMAP.md`

Provide implementation waves in dependency order. For each wave specify:
- Goal.
- Exact source paths.
- Exact existing Salesforce paths.
- Proposed destination paths.
- Responsibilities to migrate.
- Dependencies.
- Test plan.
- Acceptance criteria.
- Exit gate.
- Files owned by each workstream.
- Integration requirements.

The roadmap must address all identified gaps, not just the easiest features or the existing graph demo.

### Deliverable H — Audit evidence and reconciliation

Filename:

`SALESFORCE_MIGRATION_AUDIT_EVIDENCE.md`

Record:
- Repository identity and inventory command outputs.
- Relevant test results and exit codes.
- Source-to-destination examples traced end to end.
- Files excluded and reasons.
- Conflicting historical claims and their resolution.
- Unresolved files and blockers.
- Independent reconciliation of the CSV and Markdown inventories.

---

## 13. Independent completeness challenge

Before declaring the audit complete, conduct a separate adversarial review of your own inventory.

Ask:

- Are there production files under `explorer/src/` with no inventory row?
- Are any imports or dynamic imports untraced?
- Are any components referenced by routing or view-mode registries missing from the feature matrix?
- Are any layout or geometry algorithms omitted?
- Are any CLI tools present in package scripts but missing from the analysis inventory?
- Are any data structures produced by the Node.js engine missing from the Salesforce model?
- Are any interactions represented in the React app but absent from the Salesforce UI?
- Are annotations, snapshot comparison, historical trends, project switching, filters, state restoration, export and refactoring simulation accounted for?
- Are any security, accounting, safety or integration behaviors silently omitted?
- Have test files been confused with production files, or vice versa?
- Have obsolete-looking files been excluded without evidence?
- Have scaffolded Salesforce components been counted as fully migrated?
- Have duplicate files been double-counted?
- Do the completion percentages match the inventory rows?
- Does every missing responsibility have a proposed destination or an explicit decision requiring approval?

If any answer reveals a gap, update the inventory, gap register, destination inventory, and roadmap before finalizing the report.

### Reconciliation gate

Verify mechanically that:
- Every in-scope production source file appears in the CSV.
- Every existing Salesforce implementation file has been classified.
- Every documented feature has a parity row.
- Every `NOT MIGRATED`, `PARTIALLY MIGRATED`, `SCAFFOLDED ONLY`, or `MIGRATED — PARITY UNVERIFIED` item has a corresponding gap or verification task.
- Every proposed destination path is labeled correctly.
- Every excluded file has a disposition rationale.
- All reported percentages can be reproduced from the final inventory.
- No report claims broader verification than the evidence supports.

---

## 14. Final decision and stopping conditions

Conclude with exactly one of these decisions:

- `AUDIT COMPLETE — MIGRATION INVENTORY RECONCILED`
- `AUDIT PARTIAL — SPECIFIC SOURCE AREAS REMAIN UNINSPECTED`
- `AUDIT BLOCKED — ENVIRONMENT OR REPOSITORY ACCESS`
- `AUDIT FAILED — INVENTORY INTEGRITY COULD NOT BE ESTABLISHED`

An audit may be marked complete only after the source inventory, symbol matrix, feature parity matrix, Salesforce destination inventory, gap register, roadmap, and evidence report have all been generated and reconciled.

**Do not implement the migration in this task.** Deliver the exhaustive audit and a file-specific, dependency-aware implementation roadmap first. The next implementation phase must be driven by the audited gaps, not by assumptions about what is already migrated.

Begin by confirming the actual repository root and producing the source-file census. Then trace every production source file to its responsibilities and current Salesforce counterpart, proceeding in batches until the inventory is complete. Finish with the independent completeness challenge and reconciled reports.
