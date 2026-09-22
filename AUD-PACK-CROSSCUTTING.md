# AUD-PACK-CROSSCUTTING — Cross-Cutting Concerns Audit Prompt Pack

```yaml
PACK_ID: "AUD-PACK-CROSSCUTTING"
TITLE: "Cross-Cutting Concerns Audit Prompt Pack"
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

# AUD-SEC-001 — Security Boundaries & Data Isolation Audit

## Metadata
- Phase: Testing
- Subsystem: Integrations
- Cross-cutting: Security
- Status: Active
- Authority level: Authoritative
- Depends on: N/A

## Objective
Ensure that project graph data, findings, and user positions remain completely isolated without cross-project state leakage or unauthorized API access.

## Scope
In scope:
- `security-boundaries.cjs`, `explorer/src/lib/projectState.ts`.
- LocalStorage namespace partitioning and project switching handlers.
Out of scope:
- Web server HTTPS SSL certificate validation.

## Prerequisites
- Required artifacts: `security-boundaries.cjs`
- Required environment: Node.js runtime / Vitest environment

## Authoritative Sources
- `04_MultiProject_State_Persistence.md`
- `security-boundaries.cjs`

## Invariants Under Audit
- LocalStorage state strictly isolated under `explorer.projectState.<projectId>`.
- Project switching flushes in-memory focus/selection state before loading target project data.

## Checks
| Check ID | Check | Command / Evidence | Expected Result | Severity | Gate |
|---|---|---|---|---|---|
| C-01 | Security boundary validation | `node scripts/test-security-boundaries.cjs` | 100% security checks pass | Critical | PASS |
| C-02 | Cross-project isolation test | Run project switching unit test | 0 stale state leakage across projects | Critical | PASS |

## Evidence Requirements
- stdout logs from `test-security-boundaries.cjs`.

## Expected Outcomes
- PASS: Complete project isolation verified with 0 state leakage.
- FAIL: Any cross-project state retention or global namespace pollution.

## Acceptance Gates
| Gate | Requirement | Threshold | Evidence | Status |
|---|---|---|---|---|
| G-01 | Zero Cross-Project Leakage | 0 shared keys | `leakedKeyCount == 0` | PASS |

## Failure Modes / Anti-Patterns
- Storing unpartitioned active node selection state in global `localStorage`.

## Conflict / Recency Handling
- Executable security boundary tests override written architectural designs.

## Report Format
Standard 10-section audit report format.

## Reuse Hooks
- Reusable checks: `node scripts/test-security-boundaries.cjs`

---

# AUD-PERF-001 — Layout & UI Rendering Performance Audit

## Metadata
- Phase: Testing
- Subsystem: Frontend
- Cross-cutting: Performance
- Status: Active
- Authority level: Authoritative
- Depends on: N/A

## Objective
Verify layout engine execution time (< 1,000 ms cold layout on 240-node benchmark) and UI rendering frame rate during pan/zoom interactions.

## Scope
In scope:
- `computeArchitectureLayout` execution timing in `architecture-layout.ts`.
- Viewport interaction performance and layout call suppression.
Out of scope:
- Network asset download speed.

## Prerequisites
- Required artifacts: `audit-fixtures/cloud-spend-tracker/explorer-data.json`
- Required environment: Node.js / Vitest environment

## Authoritative Sources
- `02_Layout_Engine_Spatial.md`
- `06_Validation_Performance_Release.md`
- `HYBRID_PHASE2_P2_7_PERFORMANCE_REPORT.md`

## Invariants Under Audit
- Cold layout execution time on canonical 240-node benchmark < 1,000 ms.
- Zero layout recalculations during pan, zoom, or drag operations.

## Checks
| Check ID | Check | Command / Evidence | Expected Result | Severity | Gate |
|---|---|---|---|---|---|
| C-01 | Cold layout performance | `npm run test:cli` (layout benchmark) | Cold runtime < 1,000 ms | High | PASS |
| C-02 | Viewport layout call count | Spy on layout engine during viewport pan/zoom | Exactly 0 layout invocations | Critical | PASS |

## Evidence Requirements
- Performance timer logs and layout invocation counter.

## Expected Outcomes
- PASS: Cold layout < 1,000 ms and 0 viewport layout calls.
- FAIL: Layout computation exceeding 1,000 ms or layout triggering during pan/zoom.

## Acceptance Gates
| Gate | Requirement | Threshold | Evidence | Status |
|---|---|---|---|---|
| G-01 | Cold Layout Speed | < 1,000 ms | `runtimeMs < 1000` | PASS |
| G-02 | Viewport Re-layout Gate | 0 layout calls | `viewportLayoutCalls == 0` | PASS |

## Failure Modes / Anti-Patterns
- Recalculating layout coordinates inside the viewport `zoom` event handler.

## Conflict / Recency Handling
- Latest benchmark measurements on `Cloud Spend Tracker` take precedence.

## Report Format
Standard 10-section audit report format.

## Reuse Hooks
- Reusable metrics: Cold layout timing (`runtimeMs`)

---

# AUD-SCALABILITY-001 — High-Node Volume & Topology Scalability Audit

## Metadata
- Phase: Testing
- Subsystem: Backend
- Cross-cutting: Scalability
- Status: Active
- Authority level: Authoritative
- Depends on: AUD-PERF-001

## Objective
Test layout engine and dependency analyzer performance scaling up to 10,000-node synthetic graphs without memory exhaustion or stack overflows.

## Scope
In scope:
- Stage 0–12 pipeline performance under 1,000 to 10,000 node graphs.
- Spatial hash grid collision detection ($O(N)$ complexity).
Out of scope:
- Canvas WebGL hardware acceleration limits.

## Prerequisites
- Required artifacts: Synthetic graph benchmark suite
- Required environment: Node.js runtime with 4GB heap

## Authoritative Sources
- `02_Layout_Engine_Spatial.md`
- `WAVE7B_LARGE_SCALE_PERFORMANCE_REPORT.md`

## Invariants Under Audit
- Spatial hash grid collision resolution runs in $O(N)$ time.
- Memory consumption scales linearly without memory leaks.

## Checks
| Check ID | Check | Command / Evidence | Expected Result | Severity | Gate |
|---|---|---|---|---|---|
| C-01 | 1,000-node scale benchmark | Run large-scale performance benchmark | Execution completes < 3,000 ms | High | PASS |
| C-02 | Spatial hash grid complexity | Inspect `spacing.ts` hash grid implementation | Bounded cell partition check | High | PASS |

## Evidence Requirements
- Scalability execution logs and heap allocation traces.

## Expected Outcomes
- PASS: 1,000-node graph completes layout within 3 seconds without memory errors.
- FAIL: $O(N^2)$ algorithmic slowdown or out-of-memory crashes.

## Acceptance Gates
| Gate | Requirement | Threshold | Evidence | Status |
|---|---|---|---|---|
| G-01 | 1k Node Scale Gate | < 3,000 ms | `executionTimeMs < 3000` | PASS |

## Failure Modes / Anti-Patterns
- Using all-pairs $O(N^2)$ distance checks instead of spatial hash grid partitioning.

## Conflict / Recency Handling
- Latest benchmark reports override theoretical scalability estimates.

## Report Format
Standard 10-section audit report format.

## Reuse Hooks
- Reusable checks: Large-scale performance tests

---

# AUD-DOC-001 — Architectural Contracts & Schema Documentation Audit

## Metadata
- Phase: Design
- Subsystem: Documentation
- Cross-cutting: Documentation
- Status: Active
- Authority level: Authoritative
- Depends on: N/A

## Objective
Confirm that system documentation (`01_Foundations_Contracts.md` through `08_Audit_Source_Register.md`) accurately reflects current code implementations without obsolete claims.

## Scope
In scope:
- Master documentation corpus files (`01_*.md` to `08_*.md`).
- Code contract exports in `explorer-contract.ts`.
Out of scope:
- External marketing or non-technical README files.

## Prerequisites
- Required artifacts: Documentation markdown files, codebase contracts
- Required environment: Markdown inspection tools

## Authoritative Sources
- `README.md`
- `01_Foundations_Contracts.md` through `08_Audit_Source_Register.md`

## Invariants Under Audit
- Documentation explicitly distinguishes verified current state from historical/superseded facts.
- Schema definitions in docs match executable Zod schemas in `explorer-contract.ts`.

## Checks
| Check ID | Check | Command / Evidence | Expected Result | Severity | Gate |
|---|---|---|---|---|---|
| C-01 | Documentation recency check | Verify creation timestamps in docs | Latest timestamps marked authoritative | Medium | PASS |
| C-02 | Contract alignment check | Compare `01_Foundations_Contracts.md` with Zod schema | 100% field mapping alignment | High | PASS |

## Evidence Requirements
- Cross-reference inspection report between documentation and code schemas.

## Expected Outcomes
- PASS: Documentation accurately represents current production contracts.
- FAIL: Outdated documentation presenting superseded pipelines as current state.

## Acceptance Gates
| Gate | Requirement | Threshold | Evidence | Status |
|---|---|---|---|---|
| G-01 | Doc-Code Alignment | 100% match | Contract diff == 0 | PASS |

## Failure Modes / Anti-Patterns
- Documenting 14-stage pipelines when the executable engine implements a 13-stage (Stage 0–12) pipeline.

## Conflict / Recency Handling
- Latest archive creation timestamp rule governs documentation recency.

## Report Format
Standard 10-section audit report format.

## Reuse Hooks
- Reusable sources: `01_Foundations_Contracts.md`

---

# AUD-GOV-001 — Architectural Governance & Invariant Enforcement Audit

## Metadata
- Phase: Maintenance
- Subsystem: Backend
- Cross-cutting: Governance
- Status: Active
- Authority level: Authoritative
- Depends on: AUD-SEC-001

## Objective
Audit governance enforcement systems (`architecture-quality-gates.cjs`, `architecture-change-gate.cjs`) to guarantee hard system invariants are never bypassed.

## Scope
In scope:
- 6 Known Critical Invariants listed in project metadata.
- Automated quality gate verification suites.
Out of scope:
- Manual code review processes outside automated scripts.

## Prerequisites
- Required artifacts: Gate enforcement scripts
- Required environment: Node.js runtime

## Authoritative Sources
- `01_Foundations_Contracts.md`
- `architecture-quality-gates.cjs`

## Invariants Under Audit
- No silent coordinate drift.
- No accidental relayout on static view operations.
- No mutation of authoritative graph prior to explicit commit.
- No cross-project state leakage.
- Deterministic replay and input-order invariance.
- Strict Position Authority hierarchy.

## Checks
| Check ID | Check | Command / Evidence | Expected Result | Severity | Gate |
|---|---|---|---|---|---|
| C-01 | Quality gate verification suite | `node scripts/test-architecture-quality-gates.cjs` | 100% quality gate tests pass | Critical | PASS |
| C-02 | Critical invariant audit | Review `KNOWN_CRITICAL_INVARIANTS` across test suites | 0 invariant violations detected | Critical | PASS |

## Evidence Requirements
- Console output from `test-architecture-quality-gates.cjs`.

## Expected Outcomes
- PASS: All quality gate tests pass and critical invariants hold 100%.
- FAIL: Any violation of the 6 core critical invariants.

## Acceptance Gates
| Gate | Requirement | Threshold | Evidence | Status |
|---|---|---|---|---|
| G-01 | Governance Enforcement | 100% gates pass | `gateStatus == PASS` | PASS |

## Failure Modes / Anti-Patterns
- Allowing quality gates to be bypassed via environment flags in production.

## Conflict / Recency Handling
- Executable quality gate test results take precedence over all narrative claims.

## Report Format
Standard 10-section audit report format.

## Reuse Hooks
- Reusable checks: `node scripts/test-architecture-quality-gates.cjs`
