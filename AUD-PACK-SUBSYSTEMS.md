# AUD-PACK-SUBSYSTEMS — Subsystems Audit Prompt Pack

```yaml
PACK_ID: "AUD-PACK-SUBSYSTEMS"
TITLE: "Subsystems Audit Prompt Pack"
PROJECT_NAME: "Salesforce Architecture & Refactoring Explorer"
PROJECT_DESCRIPTION: "A deterministic, evidence-driven Salesforce architecture visualization, layout engine, finding analysis, and refactoring simulation platform."
PRIMARY_REPOSITORY: "."
AUTHORITATIVE_GRAPH_SOURCE: "dependency-analyzer.cjs / explorer-data.json / analysis-manifest.json"
PRIMARY_RUNTIME: "Node.js (v18+) / React / Cytoscape.js / Vite"
CANONICAL_BENCHMARK: "Cloud Spend Tracker (audit-fixtures/cloud-spend-tracker/explorer-data.json)"
CANONICAL_BENCHMARK_HASH: "feeb68f363d91fa0a234cb20b5975d6d6d69695fc9cdead4363806a7ca828295"
TEST_RUNNER: "Vitest / Node CLI runner (npm run test:cli)"
BUILD_COMMAND: "npm run build"
DEPLOYMENT_TARGET: "Web Application / Static SPA"
KNOWN_CRITICAL_INVARIANTS:
  - "No silent coordinate drift (0.00000 px drift across 10x determinism and input shuffle)"
  - "No accidental relayout on static view operations (0 layout calls on filter/zoom/focus)"
  - "No mutation of authoritative graph during visualization or simulation prior to explicit commit"
  - "No cross-project state leakage (isolated project namespaces in localStorage)"
  - "Deterministic replay and input-order invariance"
  - "Position authority: user > persisted > Cytoscape > intelligent layout > fallback"
```

---

# AUD-FRONTEND-001 — React/Cytoscape Canvas & UI Subsystem Audit

## Metadata
- Phase: Development
- Subsystem: Frontend
- Cross-cutting: Performance
- Status: Active
- Authority level: Authoritative
- Depends on: N/A

## Objective
Verify that the Cytoscape canvas instance initializes exactly once, batch-updates elements imperatively, and prevents re-initialization during component property changes.

## Scope
In scope:
- `explorer/src/components/GraphView.tsx` and Cytoscape ref handlers.
- Canvas mount effect dependencies and element synchronization.
Out of scope:
- CSS layout styling of non-canvas containers.

## Prerequisites
- Required artifacts: `GraphView.tsx`
- Required environment: React DOM test environment / Vitest

## Authoritative Sources
- `03_UI_UX_Interaction.md`
- `GRAPH_RUNTIME_BASELINE.md`
- `explorer/src/components/GraphView.tsx`

## Invariants Under Audit
- Cytoscape instance created only on component mount (`useEffect` with empty array `[]`).
- Element updates executed strictly inside `cy.batch(...)`.

## Checks
| Check ID | Check | Command / Evidence | Expected Result | Severity | Gate |
|---|---|---|---|---|---|
| C-01 | Canvas instantiation count | Review `GraphView.tsx` mount effect | Exactly 1 canvas instantiation | Critical | PASS |
| C-02 | Batch element updates | Inspect `GraphView.tsx` sync effect | All updates wrapped in `cy.batch()` | High | PASS |

## Evidence Requirements
- Source code verification of `GraphView.tsx`.
- Component test execution logs.

## Expected Outcomes
- PASS: Single mount instantiation and batched updates verified.
- FAIL: Re-instantiating Cytoscape canvas on prop changes or unbatched updates.

## Acceptance Gates
| Gate | Requirement | Threshold | Evidence | Status |
|---|---|---|---|---|
| G-01 | Single Canvas Mount | 1 mount per lifecycle | Source code inspection | PASS |

## Failure Modes / Anti-Patterns
- Including `nodes` or `edges` in the Cytoscape initialization `useEffect` dependency array.

## Conflict / Recency Handling
- Runtime component tests override documentation descriptions.

## Report Format
Standard 10-section audit report format.

## Reuse Hooks
- Reusable checks: `GraphView.test.tsx`

---

# AUD-BACKEND-001 — CLI & Node.js Dependency Analysis Subsystem Audit

## Metadata
- Phase: Development
- Subsystem: Backend
- Cross-cutting: Security
- Status: Active
- Authority level: Authoritative
- Depends on: N/A

## Objective
Audit `dependency-analyzer.cjs` and related CLI entry points to ensure deterministic dependency graph extraction from source artifacts.

## Scope
In scope:
- `dependency-analyzer.cjs` and script modules (`*.cjs`).
- Node, edge, and reference extraction routines.
Out of scope:
- Browser UI code.

## Prerequisites
- Required artifacts: Salesforce codebase or test fixture directories
- Required environment: Node.js runtime

## Authoritative Sources
- `01_Foundations_Contracts.md`
- `dependency-analyzer.cjs`

## Invariants Under Audit
- Deterministic extraction: identical source code yields byte-identical dependency reports.
- Canonical node type normalization (`ApexClass`, `LWC`, `Flow`, etc.).

## Checks
| Check ID | Check | Command / Evidence | Expected Result | Severity | Gate |
|---|---|---|---|---|---|
| C-01 | Deterministic report generation | `node scripts/test-deterministic-contract.cjs` | 0.00000 diff in extracted report | Critical | PASS |
| C-02 | Node type normalization | `node scripts/test-roles.cjs` | All nodes assigned valid canonical types | High | PASS |

## Evidence Requirements
- SHA-256 hash comparison of generated dependency reports across repeated runs.

## Expected Outcomes
- PASS: Byte-identical output across repeated analysis runs.
- FAIL: Non-deterministic sorting or variable timestamp injection in graph output.

## Acceptance Gates
| Gate | Requirement | Threshold | Evidence | Status |
|---|---|---|---|---|
| G-01 | Analysis Determinism | 0 diffs | `diffCount == 0` | PASS |

## Failure Modes / Anti-Patterns
- Iterating non-deterministically over JavaScript object keys without sorting.

## Conflict / Recency Handling
- Executable contract test `test-deterministic-contract.cjs` takes precedence.

## Report Format
Standard 10-section audit report format.

## Reuse Hooks
- Reusable checks: `node scripts/test-deterministic-contract.cjs`

---

# AUD-DATABASE-001 — Artifact State & Data Model Schema Audit

## Metadata
- Phase: Development
- Subsystem: Database
- Cross-cutting: Governance
- Status: Active
- Authority level: Authoritative
- Depends on: N/A

## Objective
Ensure graph artifacts (`explorer-data.json`, `analysis-manifest.json`) strictly validate against Zod schema definitions (`explorer-contract.ts`).

## Scope
In scope:
- Exported JSON data files in `explorer/public/` and `audit-fixtures/`.
- `explorer-contract.ts` Zod schema definitions.
Out of scope:
- Relational SQL databases (none used in this project).

## Prerequisites
- Required artifacts: `explorer-data.json`, `explorer-contract.ts`
- Required environment: Node.js runtime

## Authoritative Sources
- `01_Foundations_Contracts.md`
- `explorer-contract.ts`

## Invariants Under Audit
- Zero schema validation errors during project export or load.
- Mandatory provenance fields present (`schemaVersion`, `generatedAt`, `sourceHash`).

## Checks
| Check ID | Check | Command / Evidence | Expected Result | Severity | Gate |
|---|---|---|---|---|---|
| C-01 | Zod schema validation | `node scripts/test-export-explorer.cjs` | Schema parse succeeds with 0 errors | Critical | PASS |
| C-02 | Manifest provenance verification | Inspect `analysis-manifest.json` | Valid SHA-256 source hash present | High | PASS |

## Evidence Requirements
- Zod validation success logs.

## Expected Outcomes
- PASS: Schema validation passes with 0 errors.
- FAIL: Missing required schema fields or type mismatch.

## Acceptance Gates
| Gate | Requirement | Threshold | Evidence | Status |
|---|---|---|---|---|
| G-01 | Schema Conformance | 0 validation errors | Zod parse status `success` | PASS |

## Failure Modes / Anti-Patterns
- Exporting raw analyzer objects without filtering or validating against Zod schemas.

## Conflict / Recency Handling
- Zod schema definition in `explorer-contract.ts` is the supreme authoritative contract.

## Report Format
Standard 10-section audit report format.

## Reuse Hooks
- Reusable checks: `node scripts/test-export-explorer.cjs`

---

# AUD-CACHING-001 — In-Memory State & Session Position Caching Audit

## Metadata
- Phase: Testing
- Subsystem: Caching
- Cross-cutting: Performance
- Status: Active
- Authority level: Authoritative
- Depends on: N/A

## Objective
Verify that `sessionPositionsRef` caches node coordinates during visibility filtering without triggering accidental auto-relayouts when hidden nodes become visible again.

## Scope
In scope:
- `sessionPositionsRef` in `GraphView.tsx`.
- Node position retention during type filtering and focus drilling.
Out of scope:
- Browser HTTP caching.

## Prerequisites
- Required artifacts: `GraphView.tsx`
- Required environment: React testing environment

## Authoritative Sources
- `04_MultiProject_State_Persistence.md`
- `WAVE_11_FILTER_FORENSIC_AUDIT.md`

## Invariants Under Audit
- Nodes restoring visibility retrieve exact prior coordinates from `sessionPositionsRef`.
- Zero automatic layout calls triggered when toggling visibility filters.

## Checks
| Check ID | Check | Command / Evidence | Expected Result | Severity | Gate |
|---|---|---|---|---|---|
| C-01 | Hidden node coordinate retention | Toggle filter in UI test | Hidden nodes retain coordinates | Critical | PASS |
| C-02 | Layout call suppression | Spy on `cy.layout()` during filter toggle | Exactly 0 layout invocations | Critical | PASS |

## Evidence Requirements
- Position coordinate comparison before and after visibility filter toggle.

## Expected Outcomes
- PASS: Exact coordinate match (0.00000 px drift) and 0 layout invocations.
- FAIL: Recomputing layout or resetting positions to origin on filter toggle.

## Acceptance Gates
| Gate | Requirement | Threshold | Evidence | Status |
|---|---|---|---|---|
| G-01 | Filter Coordinate Retention | 0.00000 px drift | `positionDrift == 0` | PASS |
| G-02 | Zero Relayout Gate | 0 layout calls | `layoutCallCount == 0` | PASS |

## Failure Modes / Anti-Patterns
- Clearing `sessionPositionsRef` on every graph filter update.

## Conflict / Recency Handling
- Executable React component tests take precedence over design documentation.

## Report Format
Standard 10-section audit report format.

## Reuse Hooks
- Reusable checks: `Wave11AAudit.test.tsx`

---

# AUD-INTEGRATION-001 — External Boundaries & Analyzer Adapter Audit

## Metadata
- Phase: Development
- Subsystem: Integrations
- Cross-cutting: Governance
- Status: Active
- Authority level: Authoritative
- Depends on: AUD-BACKEND-001

## Objective
Validate the export adapter (`scripts/export-explorer.cjs`) interface between the external dependency analyzer and the Explorer frontend contract.

## Scope
In scope:
- `scripts/export-explorer.cjs`
- CLI positional argument parsing and project path resolution.
Out of scope:
- Internal analyzer parsing logic.

## Prerequisites
- Required artifacts: `scripts/export-explorer.cjs`
- Required environment: Node.js CLI

## Authoritative Sources
- `01_Foundations_Contracts.md`
- `scripts/export-explorer.cjs`

## Invariants Under Audit
- CLI argument parsing prevents project slugs matching local directories from misidentifying source paths.
- Analysis signals map cleanly to Explorer `testCoverageStatus` enum values (`COVERED`, `NO_TESTS`, `UNTESTED`, `AMBIGUOUS`).

## Checks
| Check ID | Check | Command / Evidence | Expected Result | Severity | Gate |
|---|---|---|---|---|---|
| C-01 | Positional CLI argument safety | `node scripts/test-explorer-cli-forwarding.cjs` | Correct argument classification | High | PASS |
| C-02 | Enum mapping accuracy | `node scripts/test-semantic-investigation-adapter.cjs` | Valid enum values exported | High | PASS |

## Evidence Requirements
- CLI test stdout logs.

## Expected Outcomes
- PASS: CLI argument parsing handles arbitrary slug strings correctly and exports valid enums.
- FAIL: Misclassifying positional CLI arguments or emitting invalid enum values.

## Acceptance Gates
| Gate | Requirement | Threshold | Evidence | Status |
|---|---|---|---|---|
| G-01 | CLI Path Safety | 100% pass | `cliTestStatus == PASS` | PASS |

## Failure Modes / Anti-Patterns
- Loose string matching for CLI flags that misinterpret directory names as flag arguments.

## Conflict / Recency Handling
- CLI forwarding test results override legacy documentation.

## Report Format
Standard 10-section audit report format.

## Reuse Hooks
- Reusable checks: `node scripts/test-explorer-cli-forwarding.cjs`

---

# AUD-CICD-001 — Continuous Integration & Automated Change Gate Audit

## Metadata
- Phase: Deployment
- Subsystem: CI/CD
- Cross-cutting: Governance
- Status: Active
- Authority level: Authoritative
- Depends on: AUD-TEST-001

## Objective
Audit the automated change gate scripts (`architecture-change-gate.cjs`, `architecture-quality-gates.cjs`) that validate pull requests before merge.

## Scope
In scope:
- `architecture-change-gate.cjs`, `architecture-quality-gates.cjs`, `architecture-safety-envelope.cjs`.
- Gate evaluation rules and decision outcomes (`DETERMINISTIC_ANALYSIS_SUFFICIENT`, `SEMANTIC_INVESTIGATION_REQUIRED`, `BLOCKED`).
Out of scope:
- GitHub Actions YAML workflow syntax.

## Prerequisites
- Required artifacts: Gate test scripts
- Required environment: Node.js runtime

## Authoritative Sources
- `06_Validation_Performance_Release.md`
- `architecture-change-gate.cjs`

## Invariants Under Audit
- Quality gate failures or safety envelope breaches strictly trigger a `BLOCKED` decision.
- Zero LLM calls required to evaluate deterministic quality gates.

## Checks
| Check ID | Check | Command / Evidence | Expected Result | Severity | Gate |
|---|---|---|---|---|---|
| C-01 | Change gate test suite execution | `node scripts/test-architecture-change-gate.cjs` | 100% test pass (15/15 tests) | Critical | PASS |
| C-02 | Safety envelope enforcement | `node scripts/test-safety-envelope.cjs` | Safety breach yields BLOCKED | Critical | PASS |

## Evidence Requirements
- stdout from `test-architecture-change-gate.cjs` and `test-safety-envelope.cjs`.

## Expected Outcomes
- PASS: 100% gate test pass and deterministic BLOCKED responses for safety breaches.
- FAIL: Permitting merge on safety breach or failing gate assertions.

## Acceptance Gates
| Gate | Requirement | Threshold | Evidence | Status |
|---|---|---|---|---|
| G-01 | Gate Precision | 15/15 tests pass | `passCount == 15` | PASS |

## Failure Modes / Anti-Patterns
- Bypassing safety envelope checks when evaluating change gate decisions.

## Conflict / Recency Handling
- Executable change gate test suite results are authoritative.

## Report Format
Standard 10-section audit report format.

## Reuse Hooks
- Reusable checks: `node scripts/test-architecture-change-gate.cjs`
