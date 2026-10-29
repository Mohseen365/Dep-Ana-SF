# Dependency Analyzer → Salesforce Migration
## Consolidated Gap Analysis, Evidence Reconciliation, Decisions, Risks, and Next Actions

**Prepared:** 30 October 2026  
**Basis:** The supplied repository ZIP, the supplied migration handoff, and the supplied Wave 3 requirements/dispatch/owner-governance documents.  
**Purpose:** Preserve the full project context and turn the gaps discussed across the conversation into one actionable, evidence-led reference.

> **Evidence and scope note.** This document is a static review/consolidation, not a fresh execution report. I inspected repository documentation and source text. I did **not** run the application, execute test suites, authenticate to Salesforce, deploy metadata, or validate Apex/LWS behavior in a live org. Test counts and PASS labels below are attributed to repository reports unless explicitly described as a source-code observation. A report saying PASS does not prove live Salesforce behavior.

---

## 1. Executive assessment

The migration is **not ready for unrestricted implementation dispatch or release sign-off**. The most important remaining work is to reconcile governance and evidence, not to start coding more features immediately.

### Highest-priority findings

1. **Wave 3 authorization is contradictory across documents.** The implementation dispatch plan says “DISPATCH-READY / AUTHORIZED FOLLOWING OWNER GOVERNANCE SIGN-OFF” and describes decisions as approved. The latest owner decision/authorization register and approval request say owner sign-off is still required and decisions remain pending. The safer interpretation is **not authorized until attributable human sign-off is recorded in the authoritative register**.
2. **A real Apex partial-update hazard is visible in source.** `DAUserPreferenceController.saveUserPreference` directly assigns nullable arguments to existing preference fields. A general-preference save passing `null` for `positionsJson` or `zoomPanJson` can clear Wave 2 ViewState. The dispatch plan already identifies the intended null-preserving guard, but its proposed fix is not proof the fix has been applied.
3. **Migration status baselines conflict.** Different reports describe Wave 2 features as scaffold-only, closed PASS, or ready for dispatch. Test counts also vary (for example, 30/30 versus 43/43 for the core POC suite; older CLI/exporter counts versus later accounting reports). There is no single reconciled baseline tied to one immutable commit and one test execution record.
4. **The external-analysis/Salesforce boundary is a core architecture constraint.** Filesystem traversal, AST parsing, dependency extraction, and canonical graph generation stay in Node.js unless an explicit architecture change is approved. Salesforce is responsible for persistence, access control, and LWC rendering. `FEAT-INGEST-01` has no stable specification in the authoritative feature inventory and should not be implemented based on its name alone.
5. **Offline tests are not platform acceptance.** The reviewed reports say live Salesforce org verification is deferred and `ORG_VERIFIED` is zero. Apex compilation/execution, CRUD/FLS under real profiles, governor limits, LWS, static-resource behavior, and deployment/package behavior remain unproven.
6. **Feature parity is still materially incomplete.** The gap register reports that only the primary graph view is partially migrated and many analytical views and interactive workflows remain React-only. The canonical 32-feature inventory should be used to quantify this accurately; older gap-register counts such as “17 view modes” need reconciliation against the actual source and parity matrix.
7. **Acceptance criteria and wave sequencing disagree.** One decision document says live org validation is deferred to Wave 5; the full wave plan puts org validation/release sign-off in Wave 6. Other plans use Waves 1–5. These need one canonical schedule, with the user’s explicit decision to postpone org setup preserved.

### Recommended immediate disposition

- Keep Wave 1 and Wave 2 contracts frozen.
- Do not start the Wave 3 implementation prompts yet.
- Make the latest owner decision/authorization register the single decision source of truth, and reconcile all dispatch/readiness reports against it.
- Resolve the pending human decisions for `FEAT-DATA-03` and formally decide whether `FEAT-INGEST-01` is archived, dropped, or newly specified.
- Record the null-overwrite hazard as a confirmed source-level defect and preserve it as a mandatory acceptance test for any later authorized change.
- Continue offline documentation, source inspection, contract reconciliation, and test-accounting work; keep Salesforce org setup/authentication/deployment deferred as requested.

---

## 2. Architecture and frozen invariants

### 2.1 Intended boundary

**External Node.js boundary**
- Filesystem/repository traversal.
- JavaScript/TypeScript AST parsing.
- Dependency extraction and initial graph generation.
- Canonical graph JSON/export.

**Salesforce boundary**
- Project/run records and authorization.
- Graph payload chunking, persistence, and retrieval.
- Apex services/controllers and user-mode access enforcement.
- LWC application shell, graph viewer, state/persistence, annotations, and client-side graph/layout display.

Do not move repository scanning or AST parsing into Apex without explicit approval and a documented architecture decision.

### 2.2 Invariants to preserve

1. **`SELECTION ≠ NAVIGATION`:** selecting/focusing a node or edge may update selection/side-panel state, but must not change active project, Lightning route, or active tab.
2. **Project isolation:** project A data, selected nodes, saved state, errors, and delayed responses must not leak into project B.
3. **`daGraphViewer @api recordId` lifecycle:** preserve the getter/setter contract and normalize Salesforce IDs consistently.
4. **Stale async responses:** invalidate in-flight requests on project switch and discard stale responses using request/generation tokens.
5. **Graph lifecycle hygiene:** clear appropriate state on project changes and clean up Cytoscape instances, listeners, debounced saves, and timers on teardown.
6. **Shell contract:** preserve Graph Viewer, Dependency Matrix, and Findings & Alerts tabs unless an approved requirement changes them.
7. **Wave 2 ViewState:** preserve node coordinates in `Positions_JSON__c` and zoom/pan in `Zoom_Pan_JSON__c`.
8. **Ingestion contract:** preserve chunk size, bounded batch behavior, Unicode surrogate safety, idempotency, project scoping, and user-mode security.
9. **No false platform claims:** offline mocks/harnesses do not establish live Apex, CRUD/FLS, governor-limit, LWS, or org-deployment correctness.

### 2.3 Ingestion limits need one canonical statement

The documents variously describe a 131,072-character chunk limit, up to 10 chunks per `saveGraphChunks` call, and a 10,485,760-character (10 MiB in decimal-style reporting, often described as 10 MB) total payload limit. Another document describes “100 chunks” overall. These statements can be compatible if 10 chunks are sent per call and 100 chunks are allowed across 10 calls, but the contract should explicitly define:
- maximum characters per chunk;
- maximum chunks per API call;
- maximum chunks/characters per graph/run;
- whether “MB” means decimal MB or MiB;
- retry/idempotency behavior across multiple calls;
- whether the same limit is enforced by Node.js, LWC, Apex, and tests.

Until reconciled, do not casually rewrite these numbers in prompts or treat one phrasing as the source of truth.

---

## 3. Consolidated gap register

Severity meanings: **Critical** = blocks safe authorization/dispatch or risks persisted user data; **High** = major correctness, parity, security, or acceptance gap; **Medium** = important behavior or governance inconsistency; **Low** = later capability/parity gap. These are triage classifications for this consolidated register, not new project-owner decisions.

### GAP-01 — Wave 3 owner authorization conflict (**Critical**)

**Evidence**
- `WAVE_3_IMPLEMENTATION_DISPATCH_PLAN (1).md` says “DISPATCH-READY / AUTHORIZED FOLLOWING OWNER GOVERNANCE SIGN-OFF” and says owner decisions are recorded and signed off.
- `WAVE_3_OWNER_DECISION_AND_AUTHORIZATION_REGISTER.md` says “POST-MERGE RECONCILIATION COMPLETE / IMPLEMENTATION BLOCKED — OWNER SIGN-OFF REQUIRED,” with DEC-W3-01 through DEC-W3-05 pending.
- `WAVE_3_OWNER_APPROVAL_REQUEST.md` is a request for decisions, not itself evidence of approval.
- `WAVE_3_FINAL_REQUIREMENTS_AND_DISPATCH_GATE.md` calls the work decision-ready but still says `FEAT-DATA-03` is blocked by owner decision and `FEAT-INGEST-01` lacks specification/authorization.

**Impact**: A coding agent could interpret a planning proposal as authorization and implement contracts that have not been accepted by the owner.

**Required closure**
1. Obtain real, attributable human decisions for every required decision ID.
2. Record owner identity/role, chosen option, confirmation, timestamp, and scope in the authoritative register.
3. Update dispatch plan and closure report to match the register; mark stale contradictory artifacts superseded rather than silently leaving them active.
4. Only then authorize the narrowly scoped dispatch.

**Acceptance**: Every document that claims “authorized,” “signed off,” or “dispatch-ready” references the same signed decision IDs and the same authoritative register revision. Otherwise status remains **BLOCKED**.

### GAP-02 — Apex nullable partial-update can erase Wave 2 ViewState (**Critical**)

**Evidence**: Static source inspection of `scratch/salesforce-poc/force-app/main/default/classes/controllers/DAUserPreferenceController.cls` found direct assignments of `viewMode`, `layoutMode`, `positionsJson`, `filtersJson`, and `zoomPanJson` to the preference record before `upsert as user`. There are no per-field null-preservation checks around these assignments in the inspected source.

**Impact**: A Wave 3 save that supplies `null` for unrelated state fields can erase existing node positions and zoom/pan, violating the frozen Wave 2 contract.

**Required closure after authorization**
- Add null-preserving assignments (or explicitly choose and document a complete-payload contract; do not mix semantics).
- Add regression tests for existing records where `positionsJson == null`, `zoomPanJson == null`, and other omitted values must preserve existing fields.
- Add a positive case showing a non-null value updates the intended field.
- Ensure new-record behavior for null inputs is documented and tested.
- Run offline suite and, later, live Apex tests when org work is authorized.

**Acceptance**: Existing Wave 2 `Positions_JSON__c` and `Zoom_Pan_JSON__c` values remain byte-for-byte unchanged when an unrelated preference save omits those fields. Source inspection here is evidence of a risk; no fix is claimed as applied.

### GAP-03 — No authoritative filter-preset JSON schema / semantics (**High; authorization-dependent**)

**Evidence**: The requirements gate says the repository lacks an authoritative filter-preset schema. The dispatch plan proposes a v1 schema with `version`, `activePresetId`, `presets`, `criteria`, and `quickFilters`, plus a 131,072-character limit and parse fallback behavior.

**Impact**: Apex and LWC can persist different shapes, reject each other’s data, or silently lose user preferences. A proposed schema is not approved until the owner decision is recorded.

**Required closure**
- Resolve DEC-W3-01 through owner sign-off.
- Define required/optional fields, enum values, defaults, unknown-field behavior, versioning/migration, maximum preset count, duplicate IDs, invalid `activePresetId`, and malformed JSON behavior.
- Use the same schema/fixture in LWC validation, Apex validation, and offline tests.

**Acceptance**: Schema version and examples are in one canonical contract; positive, malformed, old-version, unknown-field, oversized-payload, and round-trip tests are recorded.

### GAP-04 — `FEAT-INGEST-01` has no authoritative scope/specification (**High**)

**Evidence**: Wave 3 requirements report says `FEAT-INGEST-01` is missing from the authoritative migration wave plan, authoritative parity matrix, full parity matrix, and full Salesforce inventory. Existing ingestion work is documented under earlier `FEAT-ANALYSIS-*` and `FEAT-APEX-*` capabilities.

**Impact**: Dispatching from the title risks duplicating or changing frozen ingestion behavior without a concrete need.

**Required closure**
- Obtain explicit owner decision to archive/drop it, or produce a new specification with current defect evidence, source/destination files, contract diff, acceptance criteria, dependencies, ownership, and authorization.
- If archived, remove it from active dispatch plans and record the archive decision in the authoritative register.
- Do not implement an inferred “enhancement.”

**Acceptance**: Exactly one unambiguous state: formally archived, or fully specified and authorized. Until then it is blocked/not authorized.

### GAP-05 — No single reconciled migration status baseline (**High**)

**Evidence**
- `FULL_MIGRATION_EXECUTIVE_STATUS.md` reports 32 canonical capabilities: 10 implemented, 3 approved external service, 5 partially implemented, 4 scaffold-only, 10 not started; it lists ViewState/annotations as scaffold-only.
- Later Wave 2 closure reports claim `FEAT-STATE-02` and `FEAT-DATA-02` closed PASS.
- `WAVE_3_REQUIREMENTS_RESOLUTION_REPORT.md` calls Wave 2 closed PASS while also referring to older or conflicting status labels.
- The latest owner register gives a more cautious Wave 3 authorization state.

**Impact**: Work may be repeated, omitted, or dispatched against obsolete statuses. “Final” report names do not establish recency or authority by themselves.

**Required closure**
- Create one canonical status snapshot tied to exact branch, HEAD SHA, dirty/clean status, and inventory revision.
- For each feature include source artifact, target artifact, implementation status, evidence ref, test status, org-verification status, owner, blockers, and next gate.
- Mark old reports historical/superseded where appropriate; preserve their evidence, do not erase history.

**Acceptance**: One canonical inventory and executive status agree on every feature status and reference the same revision.

### GAP-06 — Test counts and test evidence are not reconciled (**High**)

**Evidence**
- Older test strategy lists POC 30/30, exporter 12/12, CLI 16 suites/360 assertions, and Explorer adapter 48/48.
- Later Wave 2 reports list POC 43/43, Workstream A 13/13, Workstream C 16/16, exporter 12/12, CLI 16 suites/360+ assertions.
- `audit-closure/TEST_ACCOUNTING_AND_FIXTURE_CLOSURE_REPORT.md` reports 280 total assertions across multiple different scripts, including 184 CLI assertions and 12 Playwright browser scenarios.
- Browser/security reports are repository report claims; this review did not re-execute them.

**Impact**: A gate can be declared passed using stale or non-equivalent suite counts; totals may double-count overlapping tests or mix test cases with assertions.

**Required closure**
- Distinguish test cases, assertions, suites, skipped, blocked, and not-run.
- Record exact commands, working directory, runtime/tool versions, commit SHA, exit code, stdout/report path, and run timestamp.
- Avoid summing overlapping suite totals unless overlap is explicitly known.
- For missing dependencies: if already declared and install is feasible, use lockfile-respecting install; do not edit package manifests/lockfiles without authorization.

**Acceptance**: One test ledger reproduces the reported count from individual execution records and labels each result as observed, reported, blocked, or not run.

### GAP-07 — Offline acceptance is being mistaken for Salesforce acceptance (**High**)

**Evidence**: Migration docs explicitly defer org access, Apex execution/coverage, `WITH USER_MODE` profile validation, governor-limit measurement, and LWS checks. The executive report says `ORG_VERIFIED` is zero.

**Impact**: Offline tests cannot prove actual Apex compilation, CRUD/FLS behavior, transaction rollback, sharing, limits, LWS, static resource compatibility, or org deployment.

**Required closure**
- Keep the org gate open and explicitly deferred, per user direction.
- Build an org acceptance checklist now without performing org setup: deployment/package validation, Apex test execution and coverage, standard/restricted user CRUD/FLS tests, multi-user/project isolation, governor limits, LWS/Cytoscape behavior, and end-to-end ingestion/reload.
- Do not mark a release/org gate PASS until the authorized environment is used and evidence is attached.

**Acceptance**: Offline and org-level evidence are separately reported; `ORG_VERIFIED` stays zero until actual evidence exists.

### GAP-08 — Wave sequencing and release gate conflict (**High**)

**Evidence**: `FULL_MIGRATION_DECISIONS_AND_BLOCKERS.md` says live-org validation/sign-off is deferred to Wave 5; `FULL_MIGRATION_WAVE_PLAN.md` describes a Wave 6 deferral; the test strategy calls live Salesforce acceptance a Wave 5 gate. Other roadmap documents have only Waves 1–5.

**Impact**: Different contributors can believe release sign-off is due at different stages, and a later wave may start before prerequisite gates are met.

**Required closure**
- Owner/architect publishes one canonical wave map and dependency graph.
- Define whether wave numbering describes implementation waves or acceptance gates; avoid assigning the same org gate to different waves.
- Preserve the user’s current instruction that org setup/authentication/deployment is postponed; a planned later gate is not current authorization to perform it.

**Acceptance**: Executive status, roadmap, dependency map, test strategy, and dispatch plans use identical wave names, dependencies, and gate IDs.

### GAP-09 — Chunk/payload contract wording is ambiguous (**High**)

**Evidence**: Documents use 131,072 characters per chunk, 10 chunks per call, 10,485,760 characters overall, and elsewhere “100 chunks” overall. These may be compatible but are not consistently expressed.

**Impact**: Producer, LWC, Apex, retry logic, and tests may disagree about limits, particularly for multi-call payloads and partial failure.

**Required closure**
- Specify exact units and the relationship between per-chunk, per-call, and per-run limits.
- Define UTF-16 surrogate-safe splitting, chunk indexes/count, hash/checksum, duplicate/retry behavior, idempotent run identity, cleanup of orphaned chunks, and recovery after partial success.
- Cross-check Node.js exporter, `daGraphPayloadLoader.js`, `DAGraphIngestionService.cls`, object field lengths, and fixtures.

**Acceptance**: One contract table is reflected in all layers and boundary tests (limit, limit+1, emoji/surrogate pairs, retry, duplicate, missing chunk, wrong order, oversized total).

### GAP-10 — Feature parity remains incomplete and legacy counts need reconciliation (**High**)

**Evidence**: `SALESFORCE_MIGRATION_GAP_REGISTER.md` says the graph canvas is only partially migrated and many analytical views are React-only; it enumerates 17 missing view modes. The broader roadmap identifies Dashboard, Compare, History, Profile, Subway, Constellation, River, Treemap, Matrix, and Refactoring Simulation. The canonical feature matrix has 32 features, so view count and feature count are not the same measure.

**Impact**: “Migration complete” can be claimed while users still lack major workflows, or the project may dispatch duplicate work because counts differ.

**Required closure**
- Use the authoritative 32-feature parity matrix as the source of truth.
- For each source React/TSX capability, record target LWC/Apex artifacts, behavior parity, data contracts, accessibility, responsive behavior, performance threshold, tests, and status.
- Reconcile “17 view modes” against the actual current source tree and matrix; classify deprecated, merged, intentionally excluded, and not started separately.

**Acceptance**: Every canonical feature has a target and evidence-backed status; “parity complete” requires all in-scope acceptance criteria, not merely a graph canvas.

### GAP-11 — Advanced layout engine and rendering parity are incomplete (**High**)

**Evidence**: Gap register identifies orbit/constellation/architecture spatial geometry missing or incomplete in LWC; implementation roadmap proposes `daLayoutEngine`. Existing test strategy describes deterministic coordinate tests, but the status of each algorithm must be tied to actual current source and tests.

**Impact**: Salesforce users may see different spatial arrangements, hierarchy, clustering, or layout stability from the React application.

**Required closure**
- Inventory every layout mode and algorithm in the React source and compare against LWC `daLayoutEngine.js`.
- Define deterministic fixtures and coordinate/cluster parity tolerances.
- Include empty/sparse/dense graphs, cycles, disconnected nodes, large graphs, and repeated-run determinism.
- Do not treat test documentation as proof unless execution records match the current commit.

**Acceptance**: Per-algorithm parity evidence is recorded against the same fixture and algorithm version; unsupported modes are visibly documented rather than silently substituted.

### GAP-12 — URL/deep-link and state restoration behavior is not fully specified (**Medium–High**)

**Evidence**: Gap register says selection/view changes do not synchronize Lightning URL state. The frozen invariant says selection must not mutate navigation. These are compatible requirements but must be separated carefully.

**Impact**: Bookmarks/shared URLs may not restore the desired project/view, while careless implementation could violate `SELECTION ≠ NAVIGATION`.

**Required closure**
- Define exactly which state is URL-addressable (e.g., project/view) and which is transient selection/side-panel state.
- Specify allowed navigation events and prohibited side effects.
- Test browser back/forward, deep-link load, project switching, malformed IDs, and stale async responses.

**Acceptance**: URL contract is explicit and tests prove selection does not navigate, while deliberate route changes restore only approved state.

### GAP-13 — General preferences and graph ViewState are not cleanly isolated at API semantics (**High**)

**Evidence**: Wave 2 `FEAT-STATE-02` covers positions/zoom-pan; Wave 3 `FEAT-DATA-03` covers active view/layout/filter preferences. Both reuse `DA_User_Preference__c` and `DAUserPreferenceController` fields/methods. Direct nullable assignment creates coupling risk.

**Impact**: Saving layout/filter preferences can damage canvas state; future partial updates may overwrite unrelated fields.

**Required closure**
- Decide and document whether the API is patch semantics (null means “leave unchanged”) or complete replacement semantics (null means “clear”); do not mix both unintentionally.
- Consider distinct request DTOs/methods for graph ViewState vs general preferences if that reduces accidental cross-field writes, but require owner approval for contract changes.
- Add regression tests across every field pair and across user/project boundaries.

**Acceptance**: API semantics are explicit and enforced server-side, with no unintended field clearing.

### GAP-14 — Real multi-user, project isolation, and security evidence is incomplete for Salesforce (**High**)

**Evidence**: Reports describe `WITH USER_MODE` and `insert as user` patterns, but also state no org connection and no live profile/CRUD/FLS validation. Offline middleware security tests validate a local Vite `/projects` route, not Salesforce authorization.

**Impact**: Local path traversal protection does not establish Salesforce data access correctness. A test against a local dev server is not an Apex security test.

**Required closure**
- Separate local Node/Vite boundary security from Salesforce object/controller security in the evidence ledger.
- Later, with explicit authorization and an org, test at least two users and two projects, positive and negative CRUD/FLS, record visibility, guessed IDs, preference/annotation isolation, and unauthorized cross-project reads/writes.
- Inspect object sharing, permission sets, field-level permissions, Apex access declarations, and user-mode operations together.

**Acceptance**: Salesforce security claims reference org-executed test evidence; local middleware results are labeled only as local middleware evidence.

### GAP-15 — Large graph performance and governor-limit claims are risk-based, not proven (**High**)

**Evidence**: Risk docs identify browser heap risk above 5,000 nodes, Apex CPU risks, and 10MB payload behavior. Suggested mitigations include LOD, element pruning, and Queueable Apex for larger chunk counts. Org verification is deferred.

**Impact**: A graph can pass offline functional tests yet freeze the browser or exceed Salesforce limits in production.

**Required closure**
- Define target graph sizes and measurable performance budgets (load, parse, render, interaction, save/reload memory/latency).
- Benchmark small/medium/large graph fixtures on browser-side code.
- Later measure Apex heap/CPU/SOQL/DML for realistic ingestion in an org.
- Verify whether asynchronous ingestion is implemented or only proposed; do not describe proposed Queueable behavior as present.

**Acceptance**: Each performance claim is tied to a benchmark, environment, fixture size, measurement, and threshold.

### GAP-16 — External analysis service boundary and deployment/authentication design remains incomplete (**Medium–High**)

**Evidence**: The gap register says Node.js analysis requires an external service/API and Named Credential/auth configuration. The architecture decision keeps parsing outside Apex, but the production deployment/identity/transport lifecycle needs explicit operational contracts.

**Impact**: The analysis boundary may be architecturally correct but not operable securely end-to-end.

**Required closure**
- Document service deployment model, authentication, authorization, credential storage, network egress, retries, idempotency, payload validation, rate limits, audit logging, secrets rotation, and failure recovery.
- Specify whether ingestion is user-triggered, CI-triggered, or scheduled and which identity owns the resulting records.
- Keep actual credential setup/deployment deferred until authorized.

**Acceptance**: Threat model, API contract, operational ownership, and failure/retry behavior approved before live integration.

### GAP-17 — Source-to-target inventory and file ownership can drift (**Medium–High**)

**Evidence**: The repository contains file-by-file migration inventory, symbol-level matrix, parity matrices, wave ownership/dispatch matrices, and many generated audit reports. Some reports refer to a Wave 2 “final independent audit” path while the ZIP has a similarly named closure report instead.

**Impact**: Dispatches may target stale paths, duplicate existing code, or miss untracked source components.

**Required closure**
- Make the inventory generated or verifiable against the current source tree.
- Validate source paths exist, target paths exist or are explicitly planned, and each file/component has one owner/workstream per dispatch.
- Mark missing report paths as absent, renamed, or superseded; do not assert that a referenced artifact exists when it does not.

**Acceptance**: Inventory has no unexplained missing paths, orphan targets, or overlapping ownership; every row ties to the current commit.

### GAP-18 — Historical React component test failures are dismissed without enough migration-specific evidence (**Medium**)

**Evidence**: The test strategy lists 16 failures in the React component suite and classifies them as legacy mock discrepancies, not Salesforce LWC defects. That may be true, but React-suite failures still affect confidence in the source behavior used as the parity oracle.

**Impact**: Migration parity comparisons may rely on source behaviors that are not currently test-verified.

**Required closure**
- Preserve the historical failure list and do not relabel them as Salesforce defects automatically.
- For each in-scope migrated feature, identify a stable behavioral contract or fixture independent of broken mocks.
- Repair source tests or add contract tests only when authorized and scoped; otherwise explicitly mark the source parity oracle as partially unverified.

**Acceptance**: Every migrated behavior has an authoritative contract/fixture even if a legacy React component test remains blocked.

### GAP-19 — Test fixtures and environment reproducibility require a canonical procedure (**Medium**)

**Evidence**: The test-accounting report says repository-local SFDX fixtures were added to avoid skipped tests caused by absent external fixture paths; it reports zero skipped tests for its stated run. Other reports have different suite totals and environments.

**Impact**: A shallow checkout or Jules environment may behave differently from the audit environment; green tests may not reproduce without a declared runtime/dependency procedure.

**Required closure**
- Document Node/npm versions and install procedure, including whether Playwright browsers are installed.
- Keep fixture inputs local and deterministic where feasible; clearly label tests requiring external repositories or browsers.
- Record whether a suite ran, was blocked, skipped, or was substituted by another check.
- Do not mutate dependency manifests or lockfiles merely to make a tool run without authorization.

**Acceptance**: Fresh checkout setup instructions reproduce each claimed offline gate or clearly explain the blocker and approved substitute.

### GAP-20 — Reports mix migration-specific evidence with broader Explorer/component audit evidence (**Medium**)

**Evidence**: The ZIP contains a large volume of browser, security middleware, component constellation, layout, and release evidence. Some reports concern the general React/Vite Explorer rather than Salesforce-specific Apex/LWC migration.

**Impact**: A PASS in a React browser gate or Vite middleware security test can be mistakenly used as evidence for Apex/LWS or Salesforce parity.

**Required closure**
- Tag each evidence artifact by system under test: Node CLI, React/Vite app, LWC offline harness, Apex simulation, actual Salesforce org, or release packaging.
- Map each acceptance criterion only to evidence that actually tests it.
- Keep unrelated component-orbit/Cloud Spend Tracker artifacts out of the Salesforce migration status unless a documented dependency is demonstrated.

**Acceptance**: Evidence map makes the tested boundary explicit and prevents cross-project or cross-runtime claims.

### GAP-21 — Acceptance criteria are unevenly measurable (**Medium–High**)

**Evidence**: Some roadmap gates use “visual parity,” “correctly,” or “all modes” without numeric thresholds, while other gates have exact test counts. The test strategy calls for 100% functional/data/interaction/performance equivalence but does not define measurable criteria for every feature.

**Impact**: Reviewers cannot consistently determine whether a feature is done or whether regressions are acceptable.

**Required closure**
- For each feature define observable behaviors, fixture inputs, expected outputs, accessibility checks, error states, performance budgets, and explicit exclusions.
- Use quantitative geometry tolerances and stable screenshot criteria only where suitable; avoid claiming visual parity from a single screenshot.
- Define acceptance for malformed payloads, empty states, permissions, network failure, stale responses, and retries.

**Acceptance**: Every feature has testable criteria and evidence references before it is dispatched.

### GAP-22 — Release status and remaining-work reporting needs explicit “not verified” semantics (**Medium–High**)

**Evidence**: Reports use `PASS`, `READY`, `FROZEN`, `SCAFFOLD_ONLY`, `NOT STARTED`, `ORG_VERIFIED`, and “deferred,” but definitions are not consistently used across documents.

**Impact**: A feature can appear done despite having only a static audit or offline simulation.

**Required closure**
- Standardize statuses such as: `IMPLEMENTED`, `OFFLINE_TESTED`, `STATICALLY_REVIEWED`, `ORG_VERIFIED`, `OWNER_APPROVED`, `BLOCKED`, `DEFERRED`, `NOT_STARTED`, `SUPERSEDED`.
- Allow multiple evidence dimensions rather than one overloaded PASS/FAIL status.
- Mark the evidence date and commit for every status.

**Acceptance**: Status semantics are defined and used consistently in executive report, parity matrix, wave plan, and decision register.

---

## 4. Feature parity gaps recorded in the repository

The repository gap register and implementation roadmap identify the following major capability gaps. Treat this list as a reported inventory to reconcile against the canonical 32-feature parity matrix, not as a newly verified count of every React panel.

| Capability area | Reported current gap | Required closure direction | Priority |
|---|---|---|---|
| Dashboard / health KPI | `ProjectDashboard.tsx` / health panels mapped to planned LWC and Apex health service | Confirm source behaviors/data DTO; implement and test parity in its authorized wave | High |
| Snapshot comparison | `ComparePanel.tsx` | Define diff semantics, thresholds, missing-node/edge handling, and large-graph strategy | High |
| Analysis history | `AnalysisHistoryPanel.tsx` | Define run ordering, selection, pagination, error/empty states | High |
| Feature profile | `FeatureProfilePanel.tsx` | Define profile DTO and supported metrics | High |
| Subway / dependency map | `SubwayPanel.tsx` | Port or explicitly replace specialized layout; test navigation/selection invariants | High |
| Constellation / orbit geometry | `DependencyConstellationPanel.tsx`, layout utilities | Port pure geometry to reusable LWC JS and verify coordinate/cluster parity | High |
| Dependency river / Sankey | `DependencyRiverPanel.tsx` | Resolve D3/static resource/LWS dependency and fallback strategy before dispatch | High |
| Architecture treemap | `ArchitectureTreemapPanel.tsx` | Define hierarchy/size aggregation and empty/large graph behavior | High |
| Feature/coupling matrix | `FeatureMatrixPanel.tsx` and related panels | Define matrix data contract, cell interaction, accessibility, scaling | High |
| Refactoring simulation | `refactoring-simulation.ts`, `RefactoringSimulationPanel.tsx` | Define what-if semantics and ensure no mutation of persisted graph | Medium |
| URL/deep linking | `projectState.ts` / Lightning navigation | Separate intentional route state from selection state | Medium–High |
| User preferences | `preferences.ts` / `DA_User_Preference__c` | Approve schema and API semantics; preserve ViewState | High / blocked by authorization |
| External analyzer pipeline | Node CLI/service to Salesforce ingestion | Specify service contract and operational model; no inferred `FEAT-INGEST-01` work | High / blocked by scope |
| Responsive/accessibility parity | React UI vs LWC/SLDS | Add per-component keyboard, screen reader, viewport and responsive acceptance | Medium–High |

---

## 5. Decisions that must be treated as separate

### 5.1 Already documented as frozen/approved architecture contracts

- External Node.js analysis boundary.
- `SELECTION ≠ NAVIGATION`.
- Wave 1 and Wave 2 contracts should not be reopened without concrete defect evidence and explicit authorization.
- Graph chunking/idempotency/security contracts are to be preserved pending a reconciled limit specification.

### 5.2 Proposed Wave 3 decisions — not to be treated as approved unless signed

The supplied owner-governance artifacts identify these decisions:

- **DEC-W3-01:** Approve or revise filter-preset JSON schema v1.
- **DEC-W3-02:** Exclude/defer theme preference from Wave 3.
- **DEC-W3-03:** Decide per-project persistence semantics for `Active_View_Mode__c`.
- **DEC-W3-04:** Decide null-preserving partial-update behavior versus complete-payload semantics for ViewState fields.
- **DEC-W3-05:** Confirm workstream ownership and fallback behavior.
- **DEC-FEAT-INGEST-01:** Formally archive/drop ingestion enhancement or commission a real specification.

**Governance rule:** A proposal, approval request, implementation plan, merged code, or Jules-generated closure report is not by itself attributable human authorization. Use the latest authoritative register and explicit owner confirmation. Until it records the required decisions, implementation remains blocked.

---

## 6. Test and evidence reconciliation plan

### 6.1 Required evidence ledger columns

For each suite/gate, capture:
- Evidence ID and scope under test.
- Repository branch and exact HEAD SHA.
- Working tree state.
- Exact command and working directory.
- Runtime/tool versions and install procedure.
- Start/end timestamp and exit code.
- Test cases, assertions, passed, failed, skipped, blocked, not run.
- Raw output/log/report path.
- Whether it is static inspection, unit test, integration test, browser E2E, simulated Apex, or actual org test.
- Reviewer and limitations.

### 6.2 Suites reported in supplied documents (not rerun for this document)

| Suite / evidence | Reported result in source documents | Correct interpretation |
|---|---|---|
| Root CLI `npm run test:cli` | Older docs: 16 suites / 360 assertions; later accounting report: 184 passes across 33 scripts | Counts appear to refer to different accounting units/suite versions; reconcile from raw run output |
| Core POC `run-poc-tests.cjs` | Older docs: 30/30; Wave 2 docs: 43/43 | Tie count to commit and actual test file version |
| Workstream A suite | 13/13 | Offline harness evidence only unless raw execution record and current SHA are available |
| Workstream C suite | 16/16 | Offline harness/Apex simulator evidence; not live Apex execution |
| Exporter adapter | 12/12 in older docs; 18 passes in later test accounting for a script including regression tests | Distinguish test cases from assertions and version of script |
| Browser Gate E | 12 scenarios PASS in later accounting report | React/Vite browser behavior, not Salesforce LWS or live org behavior |
| Vite middleware security | 13 HTTP scenarios PASS | Local `/projects` middleware only; not Salesforce CRUD/FLS evidence |
| React component suite | 387 passed / 16 failed in test strategy | Historical source-app failure surface; do not silently count as Salesforce test failures or dismiss as irrelevant without feature-level contracts |
| Apex tests | Test classes reportedly authored | No live org means no claim of Apex compilation/execution or code coverage |
| LWS/org gate | Deferred; `ORG_VERIFIED` reported 0 | Remains unverified by design until user authorizes org work |

### 6.3 Dependency policy for future Jules tasks

- First inspect `package.json`, lockfile, installed modules, scripts, and the environment.
- If a declared dependency is missing and installation is feasible, use the lockfile-respecting install (`npm ci` where appropriate); install Playwright browsers only when needed and permitted.
- Do not add/change dependencies, package manifests, or lockfiles without authorization.
- If a dependency cannot be installed, report the exact blocker and a justified substitute; never imply that a substitute is equivalent without explaining the gap.

---

## 7. Recommended execution order (offline work only for now)

### Step 1 — Establish the authoritative baseline
- Read the current checkout/ZIP’s branch/HEAD metadata if present; if no Git metadata is included, state that the archive cannot prove current branch/HEAD.
- Reconcile canonical 32-feature parity matrix, file inventory, executive status, wave plan, decision register, and gap register.
- Identify stale reports and missing referenced artifacts.
- Deliver one evidence-indexed baseline; do not modify implementation code.

### Step 2 — Close governance contradictions
- Submit the Wave 3 owner decision register for genuine owner review.
- Capture decisions for DEC-W3-01..05 and `FEAT-INGEST-01`.
- Update all derivative docs after decisions are real; until then keep status blocked.

### Step 3 — Specify and test the preference contract
- Document patch-versus-replacement semantics.
- Finalize filter schema and validation rules.
- Record null-preservation regression cases for positions/zoom-pan.
- Prepare the narrow dispatch plan only after authorization is explicit.

### Step 4 — Reconcile offline test evidence
- Re-run only when explicitly authorized and feasible in the current environment; otherwise audit historical logs and mark them reported/not rerun.
- Generate an exact suite ledger with test-case vs assertion counts and commit association.
- Preserve frozen Wave 1/Wave 2 contracts and no-org-work instruction.

### Step 5 — Build a parity closure backlog
- For each canonical feature, define source, target, contract, dependencies, tests, status, owner, and acceptance criteria.
- Sequence foundational geometry/data services before view panels; sequence URL/security/operational integration behind explicit contracts.
- Do not dispatch features simply because they appear in a generic gap register.

### Step 6 — Prepare, but do not execute, the later org acceptance plan
- Write the org gate checklist and evidence templates.
- Keep credentials, org creation, deployment, live Apex tests, LWS, and runtime acceptance postponed until the user explicitly authorizes them.

---

## 8. Jules operating instructions for this project

Use these rules in future prompts:

1. Begin with a read-only inventory of relevant source, contracts, reports, Git state, and dependencies.
2. State the exact task boundary and list prohibited files/operations.
3. Preserve frozen Wave 1/Wave 2 behavior and all invariants.
4. Treat latest owner register as authoritative only if it contains real attributable owner decisions; otherwise report the conflict and stop before implementation.
5. Never infer `FEAT-INGEST-01` requirements from its name.
6. Do not start Salesforce org setup/authentication/deployment or live Apex/LWS checks.
7. Install missing already-declared dependencies lockfile-respectingly only if needed and permitted; no unapproved manifest/lock changes.
8. Do not claim tests passed unless the commands were run and results observed in the current task.
9. Distinguish code/source facts from report claims and from proposed fixes.
10. End with changed-file list (ideally none for read-only tasks), exact evidence, unresolved blockers, and a clear gate decision.

### Safe next-task brief (read-only)

> Perform a read-only reconciliation of the Salesforce migration baseline. Compare the canonical 32-feature parity matrix, file-by-file inventory, executive status, wave plan, dependency map, test strategy, Wave 2 closure artifacts, and latest Wave 3 owner decision register. Produce a single evidence-linked discrepancy register with exact file paths, conflicting statements, commit/timestamp where available, severity, impact, and the smallest closure action. Specifically reconcile (a) Wave 2 feature status, (b) Wave 3 owner authorization, (c) `FEAT-INGEST-01` disposition, (d) all test counts and evidence types, (e) chunk-size/per-call/total-payload limits, and (f) Wave 5 versus Wave 6 org/release gates. Do not edit application code, do not run the app or tests, do not authenticate/deploy to Salesforce, and do not set up an org. If repository metadata or evidence is absent, mark it unknown rather than infer it. End with one recommended next action and a go/no-go dispatch decision.

---

## 9. Later Salesforce acceptance checklist (explicitly deferred)

Do not perform these steps now. They are listed so the later gate is not forgotten.

- [ ] Authorized org and deployment target identified by the owner.
- [ ] Metadata/package deployment succeeds in the intended org.
- [ ] Apex tests execute in the org; coverage and failures are recorded.
- [ ] CRUD/FLS and record sharing tested under representative restricted and standard users.
- [ ] Cross-user and cross-project isolation verified for graph data, annotations, and preferences.
- [ ] `WITH USER_MODE` and user-mode DML behavior validated in the actual platform context.
- [ ] LWS compatibility checked for Cytoscape/static resources and all specialized visualization dependencies.
- [ ] Real governor usage measured for representative graph sizes and ingestion payloads.
- [ ] Partial/retried ingestion, duplicate chunks, ordering, cleanup, and transaction behavior verified.
- [ ] Browser E2E covers project switching, stale response rejection, view state persistence, annotations, navigation, accessibility, responsive layout, and failure states.
- [ ] Release evidence points to exact commit, org, test run, and artifact.

---

## 10. Final status and go/no-go

**Current recommendation: NO-GO for Wave 3 implementation dispatch; GO for offline evidence reconciliation and governance closure only.**

This is not a claim that all reported code is defective. It means the evidence and authorization chain is inconsistent, a concrete null-overwrite risk exists in inspected source, and live Salesforce acceptance remains deferred/unverified. The next useful step is to reconcile the baseline and obtain attributable owner decisions—not to start broad implementation.

### Source set reviewed for this consolidation

- `DEPENDENCY_ANALYZER_SALESFORCE_MIGRATION_CHAT_HANDOFF.md`
- `WAVE_3_FINAL_REQUIREMENTS_AND_DISPATCH_GATE.md`
- `WAVE_3_IMPLEMENTATION_DISPATCH_PLAN (1).md`
- `WAVE_3_OWNER_APPROVAL_REQUEST.md`
- `WAVE_3_OWNER_DECISION_AND_AUTHORIZATION_REGISTER.md`
- `WAVE_3_OWNER_DECISION_CLOSURE_REPORT.md`
- Repository ZIP reports including `FULL_MIGRATION_EXECUTIVE_STATUS.md`, `FULL_MIGRATION_DECISIONS_AND_BLOCKERS.md`, `FULL_MIGRATION_WAVE_PLAN.md`, `FULL_MIGRATION_TEST_AND_ACCEPTANCE_STRATEGY.md`, `FULL_MIGRATION_DEPENDENCY_MAP.md`, `SALESFORCE_MIGRATION_GAP_REGISTER.md`, `SALESFORCE_MIGRATION_IMPLEMENTATION_ROADMAP.md`, Wave 2 authoritative status/wave/parity documents, Wave 3 requirements report, and audit-closure test/security/browser reports.
- Static source inspected: `scratch/salesforce-poc/force-app/main/default/classes/controllers/DAUserPreferenceController.cls`.

**Limitations:** This document does not claim exhaustive line-by-line validation of all 2,164 archive entries, does not independently reproduce reported tests, and does not establish current remote branch/PR state. The findings are a consolidated gap analysis from the reviewed documents and source excerpt; remaining inventory rows should be reconciled in the baseline task above.
