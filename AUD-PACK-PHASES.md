# AUD-PACK-PHASES — Life-Cycle Phases Audit Prompt Pack

```yaml
PACK_ID: "AUD-PACK-PHASES"
TITLE: "Life-Cycle Phases Audit Prompt Pack"
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

# AUD-DESIGN-001 — Architecture Design & Domain Boundaries Audit

## Metadata
- Phase: Design
- Subsystem: Project-specific
- Cross-cutting: Governance
- Status: Active
- Authority level: Authoritative
- Depends on: N/A

## Objective
Prove or disprove that software components and domains conform to explicit architectural layer boundaries (`presentation` < `application` < `domain` < `schema`) without cyclic or illegal cross-layer dependencies.

## Scope
In scope:
- Module boundary dependencies in `explorer/src/lib/layout/layers.ts` and `domain-classifier.cjs`.
- Layer classification taxonomy (`presentation`, `application`, `domain`, `schema`).
- Cyclic dependency detection between architectural domains.
Out of scope:
- Fine-grained UI CSS styles or DOM component rendering details.

## Prerequisites
- Required artifacts: `explorer-data.json`, `dependency-report.json`
- Required environment: Node.js CLI runtime
- Required fixtures: `audit-fixtures/cloud-spend-tracker/explorer-data.json`
- Required hashes or provenance checks: SHA-256 `feeb68f363d91fa0a234cb20b5975d6d6d69695fc9cdead4363806a7ca828295`

## Authoritative Sources
- `01_Foundations_Contracts.md`
- `02_Layout_Engine_Spatial.md`
- `explorer/src/lib/layout/layers.ts`
- `layer-classifier.cjs`

## Invariants Under Audit
- Architectural Y-ordering is strictly monotonic: Presentation < Application < Domain < Schema.
- Zero cyclic dependencies exist across core domain boundaries.

## Checks
| Check ID | Check | Command / Evidence | Expected Result | Severity | Gate |
|---|---|---|---|---|---|
| C-01 | Layer classification completeness | `node scripts/test-layers.cjs` | 100% components assigned valid layer | Critical | PASS |
| C-02 | Cross-layer dependency direction | `node scripts/test-architecture-smells.cjs` | 0 upward layer violations | High | PASS |
| C-03 | Domain cycle detection | `node scripts/test-dependency-paths.cjs` | 0 illegal domain cycles | High | PASS |

## Evidence Requirements
- Logs from `scripts/test-layers.cjs` and `scripts/test-architecture-smells.cjs`.
- JSON summary of layer violation count `C_layer_violations`.

## Expected Outcomes
- PASS: 0 layer violations and 0 illegal domain cycles.
- FAIL: Any upward layer dependency or cyclic domain relationship detected.
- BLOCKED: Missing analyzer snapshot artifacts.

## Acceptance Gates
| Gate | Requirement | Threshold | Evidence | Status |
|---|---|---|---|---|
| G-01 | Layer Violation Gate | 0 layer violations | `C_layer_violations == 0` | PASS |
| G-02 | Cycle Freedom Gate | 0 domain cycles | `cycleCount == 0` | PASS |

## Failure Modes / Anti-Patterns
- Presentation components directly instantiating Schema layer objects.
- Cyclical dependencies between Application and Domain packages.

## Conflict / Recency Handling
- Executable classifier tests (`test-layers.cjs`) supersede early design notes.

## Report Format
1. Executive Summary
2. Current Authoritative State
3. Scope and Method
4. Forensic Metrics / Runtime Evidence
5. Findings
6. Verification Matrix
7. Acceptance Gates
8. Superseded / Historical Notes
9. Decision
10. Key Authoritative Sources

## Reuse Hooks
- Reusable checks: `scripts/test-layers.cjs`
- Reusable fixtures: `audit-fixtures/cloud-spend-tracker/explorer-data.json`

---

# AUD-DEV-001 — Code Base & Structural Pattern Audit

## Metadata
- Phase: Development
- Subsystem: Backend
- Cross-cutting: Governance
- Status: Active
- Authority level: Authoritative
- Depends on: AUD-DESIGN-001

## Objective
Verify that code changes adhere to deterministic naming, file structure, module isolation, and zero-LLM runtime dependency rules.

## Scope
In scope:
- Repository root scripts (`*.cjs`) and Explorer source files (`explorer/src/**/*`).
- Module export boundaries and dependency trees.
Out of scope:
- Third-party NPM dependency internal code.

## Prerequisites
- Required artifacts: `package.json`, `package-lock.json`
- Required environment: Node.js environment
- Required fixtures: Repository root scripts

## Authoritative Sources
- `package.json`
- `01_Foundations_Contracts.md`
- `scripts/test-cli-integration.cjs`

## Invariants Under Audit
- Zero LLM imports or runtime external web dependencies in layout and analyzer modules.
- Strict CJS/ESM module boundary separation.

## Checks
| Check ID | Check | Command / Evidence | Expected Result | Severity | Gate |
|---|---|---|---|---|---|
| C-01 | Zero LLM dependency check | `npm run test:accounting` | 0 LLM dependencies in core pipeline | Critical | PASS |
| C-02 | CLI entry point integrity | `npm run test:cli` | All CLI commands exit 0 | High | PASS |

## Evidence Requirements
- Console output from `npm run test:cli` and `npm run test:accounting`.

## Expected Outcomes
- PASS: All CLI commands succeed with zero unauthorized external calls.
- FAIL: Unexpected external HTTP/LLM calls or CLI execution failures.

## Acceptance Gates
| Gate | Requirement | Threshold | Evidence | Status |
|---|---|---|---|---|
| G-01 | CLI Integrity | 100% pass | `exit code 0` | PASS |
| G-02 | Zero LLM Call Gate | 0 LLM runtime imports | `llmImportCount == 0` | PASS |

## Failure Modes / Anti-Patterns
- Inserting dynamic network fetch calls inside layout computation functions.

## Conflict / Recency Handling
- CLI test results override developer documentation.

## Report Format
Standard 10-section audit report format.

## Reuse Hooks
- Reusable checks: `npm run test:cli`

---

# AUD-TEST-001 — Test Suite, Coverage & Mock Fidelity Audit

## Metadata
- Phase: Testing
- Subsystem: Frontend
- Cross-cutting: Governance
- Status: Active
- Authority level: Authoritative
- Depends on: AUD-DEV-001

## Objective
Confirm test suite completeness, mock fidelity for Cytoscape animations, and elimination of React `act(...)` warnings.

## Scope
In scope:
- Unit and integration tests in `explorer/src/**/*.test.ts*` and `scripts/test-*.cjs`.
- Cytoscape layout mock dispatch controls.
Out of scope:
- End-to-end browser grid testing.

## Prerequisites
- Required artifacts: Vitest test runner configuration, CLI test scripts
- Required environment: Local test sandbox

## Authoritative Sources
- `06_Validation_Performance_Release.md`
- `WAVE8D_TEST_HARDENING_IMPLEMENTATION.md`

## Invariants Under Audit
- Test suites pass without unhandled state update warnings (`act(...)`).
- Mock Cytoscape instances simulate exact layout stop events.

## Checks
| Check ID | Check | Command / Evidence | Expected Result | Severity | Gate |
|---|---|---|---|---|---|
| C-01 | CLI suite test execution | `npm run test:cli` | 100% pass across all CLI tests | Critical | PASS |
| C-02 | Test gap analysis | `node scripts/test-test-gap-analysis.cjs` | Valid test coverage status | High | PASS |

## Evidence Requirements
- CLI test stdout logs.

## Expected Outcomes
- PASS: All test scripts execute with 0 failures and 0 `act(...)` warnings.
- FAIL: Any failing test assertion or unhandled state warning.

## Acceptance Gates
| Gate | Requirement | Threshold | Evidence | Status |
|---|---|---|---|---|
| G-01 | Test Pass Gate | 100% tests passing | `failedTests == 0` | PASS |

## Failure Modes / Anti-Patterns
- Suppressing test warnings using empty `console.error` mocks.

## Conflict / Recency Handling
- Latest test run stdout outranks previous coverage reports.

## Report Format
Standard 10-section audit report format.

## Reuse Hooks
- Reusable checks: `npm run test:cli`

---

# AUD-DEPLOY-001 — Build Artifacts & Deployment Pipeline Audit

## Metadata
- Phase: Deployment
- Subsystem: CI/CD
- Cross-cutting: Scalability
- Status: Active
- Authority level: Authoritative
- Depends on: AUD-TEST-001

## Objective
Verify that `npm run build` produces deterministic, production-ready static SPA bundles without missing assets or schema mismatches.

## Scope
In scope:
- Vite build outputs in `dist/` or static build paths.
- Exported JSON data artifacts in `explorer/public/`.
Out of scope:
- Server hosting infrastructure configuration.

## Prerequisites
- Required artifacts: `package.json`, Vite configuration
- Required environment: Build runner

## Authoritative Sources
- `README.md`
- `01_Foundations_Contracts.md`

## Invariants Under Audit
- Build artifacts conform to `explorer-data.json` Zod schema.
- Single command `npm run build` succeeds reproducibly.

## Checks
| Check ID | Check | Command / Evidence | Expected Result | Severity | Gate |
|---|---|---|---|---|---|
| C-01 | Build process execution | `npm run build` | Zero build errors | Critical | PASS |
| C-02 | Schema validation on export | `npm run adapter` | Valid JSON conforming to schema | High | PASS |

## Evidence Requirements
- Build output logs and file manifest of public JSON assets.

## Expected Outcomes
- PASS: Build succeeds and JSON assets validate against Zod schemas.
- FAIL: Build error or invalid JSON output.

## Acceptance Gates
| Gate | Requirement | Threshold | Evidence | Status |
|---|---|---|---|---|
| G-01 | Zero Build Errors | Exit code 0 | `buildExitCode == 0` | PASS |

## Failure Modes / Anti-Patterns
- Editing bundle artifacts in `dist/` directly instead of rebuilding from source.

## Conflict / Recency Handling
- Executable build output supersedes documentation.

## Report Format
Standard 10-section audit report format.

## Reuse Hooks
- Reusable checks: `npm run build`

---

# AUD-MAINT-001 — Long-Term Architectural Debt & Maintenance Audit

## Metadata
- Phase: Maintenance
- Subsystem: Backend
- Cross-cutting: Governance
- Status: Active
- Authority level: Authoritative
- Depends on: AUD-DEPLOY-001

## Objective
Quantify architectural debt, duplicate responsibilities, and maintainability metrics across project evolution.

## Scope
In scope:
- Debt quantification scripts (`architecture-debt.cjs`, `duplicate-responsibility.cjs`).
- Historical audit log retention in `08_Audit_Source_Register.md`.
Out of scope:
- External code repository maintainability.

## Prerequisites
- Required artifacts: `architecture-metrics.json`
- Required environment: Node.js runtime

## Authoritative Sources
- `08_Audit_Source_Register.md`
- `architecture-debt.cjs`

## Invariants Under Audit
- Architectural debt score remains bounded within accepted thresholds.
- Superseded audit conclusions are retained solely as historical provenance.

## Checks
| Check ID | Check | Command / Evidence | Expected Result | Severity | Gate |
|---|---|---|---|---|---|
| C-01 | Architectural debt scan | `node scripts/test-architecture-debt.cjs` | Debt score within thresholds | Medium | PASS |
| C-02 | Duplicate responsibility check | `node scripts/test-duplicate-responsibility.cjs` | Zero unflagged duplicate responsibilities | Medium | PASS |

## Evidence Requirements
- Metrics output from `architecture-debt.cjs`.

## Expected Outcomes
- PASS: Debt score below critical threshold.
- FAIL: Unresolved critical architectural debt.

## Acceptance Gates
| Gate | Requirement | Threshold | Evidence | Status |
|---|---|---|---|---|
| G-01 | Bounded Debt Gate | Score < threshold | `debtScore < maxDebt` | PASS |

## Failure Modes / Anti-Patterns
- Accumulating duplicate classification routines across multiple CJS modules.

## Conflict / Recency Handling
- Recency timestamp rule applies to debt calculations.

## Report Format
Standard 10-section audit report format.

## Reuse Hooks
- Reusable checks: `node scripts/test-architecture-debt.cjs`
