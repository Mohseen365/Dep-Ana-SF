# Dependency Analyzer --- Salesforce Migration

## New-Chat Handoff: State, Decisions, Issues, Evidence, and Next Actions

**Handoff date:** 29 October 2026\
**Purpose:** Preserve the migration context for a new ChatGPT
conversation.

> **Evidence rule:** This document consolidates user-provided Jules
> reports and discussion. Test outcomes below are reported by those
> artifacts, not independently rerun by ChatGPT. Always distinguish
> report claims, inspected source facts, proposals, and unresolved
> decisions.

## 1. Instructions for the new chat

Read this handoff fully before advising. Continue from the current
state; do not restart completed work. Preserve frozen Wave 1/Wave 2
contracts. Do not start Salesforce environment setup. Do not implement
features while scope, contracts, and authorization remain unresolved.

When drafting Jules prompts: - Make the task narrowly scoped,
evidence-driven, and read-only unless implementation is explicitly
authorized. - If already-declared dependencies are missing and
installation is feasible, use the repository's lockfile-respecting
procedure (for example, `npm ci` when appropriate). Do not alter
manifests or lockfiles without authorization. - Never claim tests passed
unless actually executed and observed. - Do not treat a report's `PASS`
as proof of Salesforce platform behavior. - Do not treat a prospective
feature title or report recommendation as authorization.

**Suggested first message in the new chat:**\
"Read the attached migration handoff fully. Confirm the current decision
gate and recommend the single next action. Preserve frozen Wave 1/Wave 2
contracts, keep Salesforce environment work postponed, and do not
prepare an implementation prompt until requirements and authorization
blockers are resolved."

------------------------------------------------------------------------

## 2. Project objective and architecture

The project migrates Dependency Analyzer capabilities into Salesforce
while keeping source analysis at the external Node.js boundary.

### Architecture boundary

-   **Node.js external boundary:** filesystem scanning, AST parsing,
    dependency extraction, initial graph generation, canonical graph
    JSON creation.
-   **Salesforce:** project data, access control, graph payload
    persistence/chunking, Apex services/controllers, application UI,
    graph display.
-   **Graph loading/display:** `daGraphPayloadLoader.js`,
    `daLayoutEngine.js`, `daGraphViewer`, Cytoscape.
-   **Shell/context:** `daAppShell`, `daProjectSelector`.
-   **Annotations/preferences:** `daAnnotationPanel`,
    `DAAnnotationController`, `DAUserPreferenceController`, and custom
    objects.

Do not move filesystem scanning or AST parsing into Apex without an
explicitly authorized architecture change.

### Frozen invariants

1.  **`SELECTION ≠ NAVIGATION`.** Selecting a node can update
    selected-node/annotation context but must not change the active
    project or switch views.
2.  **Strict multi-project isolation.** Project A's data, selection,
    preferences, errors, or late async responses must not leak into
    Project B.
3.  `daGraphViewer` `@api recordId` getter/setter contract and
    project-ID normalization remain intact.
4.  Project switches invalidate in-flight requests immediately; stale
    responses are discarded using generation/request tokens.
5.  Graph state is cleared appropriately on project changes; Cytoscape
    instances and listeners/timers are cleaned up.
6.  Preserve Workstream A shell tabs: Graph Viewer, Dependency Matrix,
    Findings & Alerts.
7.  Preserve Wave 2 preference state for graph node coordinates and
    zoom/pan.
8.  Preserve existing ingestion chunking, batching, pagination,
    idempotency, project isolation, and user-mode security contracts.

The reports describe `DAGraphIngestionService.cls` limits as 131,072
characters per chunk, at most 10 chunks per `saveGraphChunks` call, and
10,485,760 characters overall. Verify the current source before using
these values in code changes.

------------------------------------------------------------------------

## 3. Wave 1 and Wave 2 status

### Wave 1 --- core graph and ingestion

Wave 1 is treated as frozen based on project reports. It includes
Node.js AST analysis and graph creation, canonical graph adaptation,
Salesforce ingestion/persistence, bounded chunking/reassembly, and graph
loading/layout.

Do not reopen or redesign Wave 1 without concrete evidence of a defect
and explicit authorization.

### Wave 2 --- shell, project context, ViewState, annotations

Wave 2 has been reported closed with `PASS` in: -
`docs/audits/salesforce-wave2/WAVE_2_UI_INTEGRATION_CLOSURE_REPORT.md` -
`docs/audits/salesforce-wave2/WAVE_2_UI_INTEGRATION_FINAL_INDEPENDENT_AUDIT_REPORT.md`

#### Workstream A

Reported areas: -
`scratch/salesforce-poc/force-app/main/default/lwc/daProjectSelector/*` -
`scratch/salesforce-poc/force-app/main/default/lwc/daAppShell/*` -
`scratch/salesforce-poc/tests/run-workstream-a-tests.cjs`

Reported behavior: shell tabs/views, header/status, project selector,
active project context, accessibility state, and correct conditional
rendering.

#### Workstream C

Reported areas: - `DA_User_Preference__c` and fields; -
`DA_Annotation__c` and fields; - `DAUserPreferenceController.cls`; -
`DAAnnotationController.cls`; - `daAnnotationPanel/*`; -
`scratch/salesforce-poc/tests/run-workstream-c-tests.cjs`.

An earlier independent audit found two integration gaps: the annotation
panel was not embedded in the shell, and the graph viewer was not wired
to preference load/save. The later UI closure report claims both were
fixed and tested. Earlier caveats about simulated Apex behavior and
authorization enforcement remain relevant unless separately resolved by
source evidence or live-org testing.

#### Workstream G

Apex test classes reportedly authored: -
`scratch/salesforce-poc/force-app/main/default/classes/tests/DAUserPreferenceControllerTest.cls` -
matching metadata; -
`.../classes/tests/DAAnnotationControllerTest.cls` - matching metadata.

No live org was connected, so actual Apex compilation/execution was not
performed. A previous report said Salesforce CLI was installed
(`@salesforce/cli` v2.156.8) and `sf org list` returned no orgs. Do not
attempt authentication/deployment now.

------------------------------------------------------------------------

## 4. Wave 2 Final Independent Audit --- reported result

Uploaded report:
`WAVE_2_UI_INTEGRATION_FINAL_INDEPENDENT_AUDIT_REPORT.md`\
Canonical path claimed:
`docs/audits/salesforce-wave2/WAVE_2_UI_INTEGRATION_FINAL_INDEPENDENT_AUDIT_REPORT.md`

The report claims: - Verdict: `PASS`. - Audited branch:
`jules-6406422098693108665-f1ee99e9`. - HEAD:
`bc550b0a26cecfcd0c1404540ddf1e09007ec14e`. - Working tree clean at
audit time. - Earlier closure commit
`84f2b8cdb7e4bfc3fadafa1ff9a1e3231b7665ab` was merged via PR #38. - No
Critical/High/Medium/Low findings; two informational findings.

These are historical report details. Verify the current repository state
if it becomes available.

### FEAT-STATE-02 --- graph ViewState

The audit claims `daGraphViewer.js`: - invokes
`getUserPreference({ projectId: this._recordId })`; - restores node
positions and zoom/pan; - uses `isRestoringState` to avoid save loops
during restoration; - schedules saves on Cytoscape `dragfree` and
`viewport` events; - debounces at 800 ms; - enforces 131,072-character
payload checks; - uses `currentRequestId` and project checks to discard
stale work; - clears timers and destroys Cytoscape during teardown.

### FEAT-DATA-02 --- annotations

The audit claims: - `daAppShell.html` embeds `<c-da-annotation-panel>`
beside `<c-da-graph-viewer>`; - SLDS grid layout uses two-thirds for the
graph and one-third for annotations; - `project-id={activeProjectId}`
and `selected-node-id={selectedNodeId}` bindings propagate context; -
`daAnnotationPanel.js` uses `currentRequestId` to reject stale
responses; - `nodeselect` updates selected-node context without
switching views or changing active project.

### Test results reported by the final audit

  ---------------------------------------------------------------------------------------------------------
  Command                                                                                   Reported result
  ---------------------------------------------------------------- ----------------------------------------
  `node scratch/salesforce-poc/tests/run-workstream-c-tests.cjs`                                      16/16

  `node scratch/salesforce-poc/tests/run-workstream-a-tests.cjs`                                      13/13

  `node scratch/salesforce-poc/tests/run-poc-tests.cjs`                                               43/43

  `npm run test:cli`                                                             16 suites / 360 assertions

  `node scripts/test-export-explorer.cjs`                                                    12 validations
  ---------------------------------------------------------------------------------------------------------

The audit says the stale-response test exercises the production
annotation panel JS with mocks, shell embedding checks the actual
template, and ViewState tests instantiate production `DaGraphViewer`
with mocked Apex calls.

**Evidence caveat:** Offline tests use mocks/harnesses and some Apex
behavior is simulated or statically checked. They do not prove Apex
compiles/runs in Salesforce, nor prove real Lightning DOM/LWS, CRUD/FLS,
sharing, or governor-limit behavior. ChatGPT did not independently rerun
these tests.

### Environment checks postponed

Do not attempt: - Salesforce login, org creation, deployment; - live
Apex compilation/execution; - live `WITH USER_MODE` SOQL or `as user`
DML verification; - real CRUD/FLS/sharing profile checks; - Lightning
Experience/LWS runtime checks; - real org governor-limit profiling.

The user explicitly asked to postpone environment-related work and focus
on migration.

------------------------------------------------------------------------

## 5. Wave 3 Planning & Readiness report

Uploaded filename: `WAVE_3_PLANNING_AND_READINESS_REPORT (1).md`\
Its intended path was claimed to be
`docs/audits/salesforce-wave2/WAVE_3_PLANNING_AND_READINESS_REPORT.md`.

The report found a significant scope mismatch.

### FEAT-DATA-03 --- User Preferences Storage

The report says this feature is authorized in: -
`docs/audits/salesforce-wave2/AUTHORITATIVE_MIGRATION_WAVE_PLAN.md:61` -
`docs/audits/salesforce-wave2/AUTHORITATIVE_MIGRATION_PARITY_MATRIX.csv:33` -
`FULL_SALESFORCE_MIGRATION_INVENTORY.md:96`

Reported status: `SCAFFOLD_ONLY`, Wave 3 / Workstream C.

Purpose: persist general application preferences such as default layout
algorithm and active filter presets. Theme or default-view settings are
mentioned in some reports but exact scope still needs confirmation.

Reported storage/controller: - `DA_User_Preference__c` -
`DAUserPreferenceController.cls` - existing `getUserPreference` /
`saveUserPreference` endpoints.

Critical distinction: - `FEAT-STATE-02` (Wave 2): node coordinates and
zoom/pan. - `FEAT-DATA-03` (Wave 3): general application preferences.

The filter-preset JSON schema was reported undefined and is a blocker to
implementation dispatch.

### FEAT-INGEST-01 --- Ingestion Pipeline Enhancements

The report says this feature appears only as a prospective title in the
Wave 2 closure report and is absent from: - authoritative migration wave
plan; - authoritative parity matrix; - full migration parity matrix; -
full Salesforce migration inventory.

It also says the existing ingestion pipeline was built/hardened/frozen
in Wave 1 via `FEAT-ANALYSIS-01`, `FEAT-ANALYSIS-02`, and `FEAT-APEX-01`
through `FEAT-APEX-03`, including `DAGraphIngestionService.cls`.

Recommendations in that report: - `FEAT-DATA-03`:
`READY WITH CONDITIONS`, pending schema and integration-contract
decisions. - `FEAT-INGEST-01`: `BLOCKED — SCOPE OR DEPENDENCY GAP` /
`NOT AUTHORIZED`. - Overall Wave 3 planning:
`BLOCKED — REQUIREMENTS OR DEPENDENCIES INCOMPLETE`.

A later report says `WAVE_3_PLANNING_AND_READINESS_REPORT.md` was absent
in the checkout at that time. Search for it if needed; do not assume the
path exists.

------------------------------------------------------------------------

## 6. Latest uploaded report: Wave 3 Requirements Resolution

Uploaded file: `WAVE_3_REQUIREMENTS_RESOLUTION_REPORT.md`\
Canonical path claimed by report:
`docs/audits/salesforce-wave3/WAVE_3_REQUIREMENTS_RESOLUTION_REPORT.md`\
The report labels itself `COMPLETE / AUTHORITATIVE`, but that is its
self-description, not proof of project-leadership approval.

### Reported repository state

-   Branch: `jules-13694871737738476849-5cfc0044`.
-   HEAD: `98603e1f1aa0f8cbd1c2fb41dcdc754e60753ae3`.
-   It says the Wave 2 final independent audit reconciled the earlier
    closure commit into the checkout.
-   It reports `WAVE_3_PLANNING_AND_READINESS_REPORT.md` was missing at
    its expected path and anywhere in that checkout.
-   It says the Wave 2 closure, Workstream A/C/G reports, and final
    audit were present and aligned.

### Wave 2 reconciliation claims

The report says the final audit confirms: - `FEAT-STATE-02` and
`FEAT-DATA-02` are closed/offline-verified; - annotation panel is
embedded in `daAppShell.html`; - graph viewer imports and calls
`getUserPreference` and `saveUserPreference`; - `isRestoringState`
avoids save loops; - project changes invalidate requests and destroy
Cytoscape; - `SELECTION ≠ NAVIGATION` is preserved; - offline harnesses
simulate some Apex behavior; - live SOQL/DML security, LWS, CRUD/FLS,
and actual Lightning runtime remain unverified.

### Wave 3 distinction

The report says: - `FEAT-STATE-02` is frozen: `Positions_JSON__c`,
`Zoom_Pan_JSON__c`. - `FEAT-DATA-03` is general preferences, potentially
`Active_Layout_Mode__c`, `Filters_JSON__c`, theme/view preferences. -
Reuse existing preference endpoints without weakening the Wave 2
contract.

### Conflict to manage

The report lists connected Salesforce org/environment availability as a
prerequisite for Wave 3 authorization. The user's current direction is
to postpone environment work. Do not set up an org now. If governance
truly requires org access before implementation authorization, document
that as a separate governance blocker; continue offline scope/contract
planning as allowed.

------------------------------------------------------------------------

## 7. Current Wave 3 status and required decisions

### FEAT-DATA-03 --- general user preferences

**What is known from reports** - Authorized in the authoritative
roadmap/parity matrix according to Jules. - General preferences, not
graph positions/viewport. - Existing preference object/controller
scaffolding reportedly exists. - Possible categories: default layout
algorithm, filter presets, possibly theme and default view. - Exact
scope and schema remain unresolved.

**Decisions needed before implementation** 1. Locate an existing
authoritative filter model/schema in code/docs, or propose one clearly
marked as needing approval. 2. Confirm whether theme is in scope. 3.
Confirm whether default active view/tab is in scope. 4. Decide which
preferences are global per user vs scoped to user+project. 5. Define
defaults and behavior for absent, malformed, invalid, or unsupported
preferences. 6. Confirm backward compatibility with `Positions_JSON__c`
and `Zoom_Pan_JSON__c`. 7. Confirm ownership/file boundaries between
Workstream C (Apex/schema) and Workstream A/D (LWC integration). 8.
Define acceptance and negative tests: malformed JSON, oversized
payloads, project/user isolation, stale responses, no unintended
navigation.

**Proposed acceptance checks --- not approved requirements unless
corroborated** - Save/restore approved preferences across sessions. -
Correct user/project scoping. - JSON schema and size validation. - Safe
defaults for absent/invalid settings. - No changes to Wave 2
positions/zoom-pan behavior. - Stale async response protection. - No
cross-project preference leakage. - No unintended navigation. - Relevant
regressions remain green.

### FEAT-INGEST-01 --- ingestion enhancements

Current status: `NOT AUTHORIZED` / `BLOCKED — SPECIFICATION MISSING`.

Required action: owner must either: 1. provide an authoritative
specification for a concrete gap with acceptance criteria and explicit
authorization; or 2. formally archive/remove the prospective feature
reference.

Do not create an implementation prompt based only on the feature title.

------------------------------------------------------------------------

## 8. Prompts already prepared and execution status

### A. Wave 2 UI Integration Final Independent Audit

Expected report:
`docs/audits/salesforce-wave2/WAVE_2_UI_INTEGRATION_FINAL_INDEPENDENT_AUDIT_REPORT.md`

Scope: ViewState load/save and race handling, annotation
embedding/context/CRUD, Workstream A shell contract, frozen Wave 1
safeguards, tests and their quality, no org auth/deploy, no Wave 3
implementation.

**A resulting report was uploaded and says PASS.**

### B. Wave 3 Planning & Readiness

Expected report originally:
`docs/audits/salesforce-wave2/WAVE_3_PLANNING_AND_READINESS_REPORT.md`

Scope: authoritative scope, dependencies, architecture, phased plan,
tests, risks, dispatch readiness.

**A report was uploaded as
`WAVE_3_PLANNING_AND_READINESS_REPORT (1).md`; later report says its
expected repository path was absent.**

### C. Requirements resolution with mandatory Wave 2 audit reconciliation

Purpose: include
`WAVE_2_UI_INTEGRATION_FINAL_INDEPENDENT_AUDIT_REPORT.md` as a required
source and reconcile it with closure/Workstream A/C/G reports.

**A resulting `WAVE_3_REQUIREMENTS_RESOLUTION_REPORT.md` was uploaded
and claims the reconciliation was completed.**

### D. Most recent prompt prepared, not confirmed executed

Prompt title:
`Jules Prompt — Wave 3 Final Requirements Decision Gate: FEAT-DATA-03 and FEAT-INGEST-01`

Expected output:
`docs/audits/salesforce-wave3/WAVE_3_FINAL_REQUIREMENTS_AND_DISPATCH_GATE.md`

It asks Jules to: - finalize FEAT-DATA-03 filter schema, preference
categories, scoping, backward compatibility; - assess FEAT-INGEST-01
authorization; - create owner decision register and dispatch gate; - not
implement features or perform Salesforce setup; - preserve frozen
contracts; - follow lockfile/dependency rules.

The user has not yet reported executing this latest prompt. The
requirements-resolution report was uploaded before the final prompt was
drafted, so assume it is still pending unless the user confirms
otherwise.

------------------------------------------------------------------------

## 9. Issues and lessons learned

1.  **Scope creep from a prospective title:** Wave 2 closure suggested
    `FEAT-INGEST-01`, but the planning report found no authoritative
    entry. A closure report recommendation is not authorization.
2.  **Report path/checkout drift:** Jules tasks run on different
    generated branches/checkouts. Reports may refer to different HEADs
    and may not exist in another checkout. Record actual branch, HEAD,
    working tree, and path existence each time.
3.  **Implementation report versus independent audit:** Implementation
    claims are not independent verification. Even the independent audit
    is limited to the evidence it actually gathered.
4.  **Changing test counts:** historical reports mention POC 41/41 then
    43/43, Workstream A 12/12 then 13/13, Workstream C 15/15 then 16/16.
    Added tests may explain the changes; use actual current outputs.
5.  **Offline mocks do not prove Salesforce runtime:** Apex
    simulation/static checks cannot prove actual Apex
    compilation/execution or live Lightning behavior.
6.  **Environment work postponed:** the user explicitly asked to focus
    on migration, not environment. Do not attempt login, scratch org
    creation, deployment, or live tests.
7.  **Missing dependencies:** user wants Jules prompts to include safe
    installation of missing declared dependencies; do not update
    manifests/lockfiles.
8.  **No premature implementation:** requirements and authority must be
    clear before dispatch.
9.  **Potential discrepancy in latest requirements report:** it says
    Wave 3 work remains subject to entry/exit gates and org
    availability. Keep environment work postponed; separate governance
    blockers from work that can proceed offline.
10. **Missing Wave 3 planning report:** the latest report says the
    earlier planning report was absent from its checkout. Search by
    exact filename if the content/path becomes relevant.

------------------------------------------------------------------------

## 10. Most recent recommended next action

The latest assistant drafted a final requirements/dispatch gate prompt
targeting:

`docs/audits/salesforce-wave3/WAVE_3_FINAL_REQUIREMENTS_AND_DISPATCH_GATE.md`

The user has not confirmed execution.

**Recommended next step in the new chat:** 1. Ask whether that final
gate prompt has been executed. 2. If not, recommend executing it as a
planning-only Jules task. 3. If yes, inspect the resulting report and
determine whether `FEAT-DATA-03` can receive a narrow implementation
prompt or whether owner approval is still required. 4. Keep
`FEAT-INGEST-01` blocked until there is an authoritative specification
and explicit authorization. 5. Do not begin implementation while
required decisions are unresolved.

------------------------------------------------------------------------

## 11. Repository/report index

Verify these paths in the current checkout; they are based on reports
and may differ across Jules branches.

### Wave 2 reports and authority

-   `docs/audits/salesforce-wave2/WAVE_2_UI_INTEGRATION_CLOSURE_REPORT.md`
-   `docs/audits/salesforce-wave2/WAVE_2_UI_INTEGRATION_FINAL_INDEPENDENT_AUDIT_REPORT.md`
-   `docs/audits/salesforce-wave2/WORKSTREAM_A_FINAL_INDEPENDENT_AUDIT_REPORT.md`
-   `docs/audits/salesforce-wave2/WORKSTREAM_C_FINAL_INDEPENDENT_AUDIT_REPORT.md`
-   `docs/audits/salesforce-wave2/WORKSTREAM_G_APEX_TEST_AND_VERIFICATION_REPORT.md`
-   `docs/audits/salesforce-wave2/WAVE_2_FINAL_SCOPE_RECONCILIATION_REPORT.md`
-   `docs/audits/salesforce-wave2/AUTHORITATIVE_MIGRATION_WAVE_PLAN.md`
-   `docs/audits/salesforce-wave2/AUTHORITATIVE_MIGRATION_PARITY_MATRIX.csv`
-   `docs/audits/salesforce-wave2/WAVE_2_AUTHORITATIVE_FEATURE_MANIFEST.csv`
-   `docs/audits/salesforce-wave2/WAVE_2_FILE_OWNERSHIP_AND_DISPATCH_MATRIX.md`

### Wave 3 reports

-   `docs/audits/salesforce-wave2/WAVE_3_PLANNING_AND_READINESS_REPORT.md`
    --- reportedly absent in a later checkout; search for it if needed.
-   `docs/audits/salesforce-wave3/WAVE_3_REQUIREMENTS_RESOLUTION_REPORT.md`
    --- latest uploaded requirements-resolution report.
-   `docs/audits/salesforce-wave3/WAVE_3_FINAL_REQUIREMENTS_AND_DISPATCH_GATE.md`
    --- expected output of the latest prompt; execution not confirmed.

### Key production paths

-   `scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.js`
-   `scratch/salesforce-poc/force-app/main/default/lwc/daAppShell/daAppShell.html`
-   `scratch/salesforce-poc/force-app/main/default/lwc/daAppShell/daAppShell.js`
-   `scratch/salesforce-poc/force-app/main/default/lwc/daAnnotationPanel/daAnnotationPanel.js`
-   `scratch/salesforce-poc/force-app/main/default/classes/controllers/DAUserPreferenceController.cls`
-   `scratch/salesforce-poc/force-app/main/default/classes/controllers/DAAnnotationController.cls`
-   `scratch/salesforce-poc/force-app/main/default/classes/services/DAGraphIngestionService.cls`
-   `scratch/salesforce-poc/force-app/main/default/lwc/daGraphPayloadLoader/daGraphPayloadLoader.js`
-   `scratch/salesforce-poc/force-app/main/default/lwc/daLayoutEngine/daLayoutEngine.js`
-   `scratch/salesforce-poc/tests/run-poc-tests.cjs`
-   `scratch/salesforce-poc/tests/run-workstream-a-tests.cjs`
-   `scratch/salesforce-poc/tests/run-workstream-c-tests.cjs`
-   `scripts/test-export-explorer.cjs`
-   Root `npm run test:cli`
-   `explorer/src/lib/preferences.ts` (if present).

### Historical test commands and reported results

-   `node scratch/salesforce-poc/tests/run-workstream-a-tests.cjs` ---
    reported 13/13.
-   `node scratch/salesforce-poc/tests/run-workstream-c-tests.cjs` ---
    reported 16/16.
-   `node scratch/salesforce-poc/tests/run-poc-tests.cjs` --- reported
    43/43.
-   `npm run test:cli` --- reported 16 suites / 360 assertions.
-   `node scripts/test-export-explorer.cjs` --- reported 12 validations.

These are historical report claims, not fresh test executions in the new
chat.

------------------------------------------------------------------------

## 12. One-page handoff summary

### Accomplished

-   Wave 2 shell/navigation/project context reported complete.
-   Wave 2 ViewState persistence and annotations reported integrated.
-   Workstream G Apex test classes authored, but not run in a Salesforce
    org.
-   Wave 2 final independent audit produced with `PASS`.
-   Wave 3 planning identified scope and contract blockers.
-   Requirements-resolution report reconciled the Wave 2 final audit and
    confirmed the Wave 3 authorization boundary.
-   A final requirements/dispatch gate prompt has been drafted.

### Outstanding

-   Confirm whether the final requirements/dispatch gate prompt was
    executed.
-   Resolve FEAT-DATA-03 filter-preset schema, preference categories,
    scoping, and compatibility.
-   Get an explicit owner decision for FEAT-INGEST-01: formally specify
    a genuine gap or archive/remove the candidate.
-   Only after requirements and authorization are clear, prepare a
    narrow FEAT-DATA-03 implementation prompt.
-   Keep Salesforce environment setup and live validation postponed.

**Most important rule:** Do not let a prospective feature title or a
PASS report silently expand authorized scope. Follow the authoritative
roadmap, preserve frozen contracts, and require evidence before
implementation.
