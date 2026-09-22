# AUD-PACK-PROJECT-DOMAINS — Project-Specific Domains Audit Prompt Pack

```yaml
PACK_ID: "AUD-PACK-PROJECT-DOMAINS"
TITLE: "Project-Specific Domains Audit Prompt Pack"
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

# AUD-LAYOUT-001 — 13-Stage Executable Layout Pipeline & Geometry Audit

## Metadata
- Phase: Testing
- Subsystem: Project-specific
- Cross-cutting: Performance
- Status: Active
- Authority level: Authoritative
- Depends on: N/A

## Objective
Verify that `computeArchitectureLayout` executes the exact deterministic 13-stage pipeline (Stage 0–12) with zero primary/satellite overlaps, zero layer violations, and 0.00000 px coordinate drift across 10x repeated runs and input shuffles.

## Scope
In scope:
- Pipeline stages 0 to 12 in `explorer/src/lib/architecture-layout.ts`.
- Spatial metrics (`Ctotal`, `Cpp`, `Cps`, `Css`, overlaps, layer violations).
- Input-order determinism and Candidate E benchmark verification.
Out of scope:
- Cytoscape UI rendering styles outside node positioning.

## Prerequisites
- Required artifacts: `audit-fixtures/cloud-spend-tracker/explorer-data.json`
- Required environment: Vitest / Node.js runtime
- Required hashes: SHA-256 `feeb68f363d91fa0a234cb20b5975d6d6d69695fc9cdead4363806a7ca828295`

## Authoritative Sources
- `02_Layout_Engine_Spatial.md`
- `HYBRID_LAYOUT_PHASE13_REAL_EXECUTION_FORENSIC_AUDIT.md`
- `explorer/src/lib/architecture-layout.ts`

## Invariants Under Audit
- Architectural layer order preserved: Presentation < Application < Domain < Schema.
- Primary production overlaps = 0; Satellite overlaps = 0; Layer violations = 0.
- 10x determinism drift = 0.00000 px; Shuffled input drift = 0.00000 px.

## Checks
| Check ID | Check | Command / Evidence | Expected Result | Severity | Gate |
|---|---|---|---|---|---|
| C-01 | Stage 0–12 pipeline execution | Run `HybridLayoutAcceptanceB6.test.ts` | All 13 stages execute in sequence | Critical | PASS |
| C-02 | Overlap and layer violation gate | `npx vitest run evaluate-layout.test.ts` | 0 overlaps, 0 layer violations | Critical | PASS |
| C-03 | 10x determinism drift check | Run Candidate E determinism test | Exactly 0.00000 px drift | Critical | PASS |
| C-04 | Benchmark metrics check | Compare Candidate E output against baseline | `Ctotal = 94,662`, `Cpp = 8,704` | High | PASS |

## Evidence Requirements
- Evaluation metrics JSON exported by `evaluateLayout`.
- Coordinate delta logs across 10 repeat executions.

## Expected Outcomes
- PASS: 0 overlaps, 0 layer violations, 0.00000 px drift, `Ctotal = 94,662`.
- FAIL: Any node overlap, layer violation, or non-zero coordinate drift.
- CONDITIONAL PASS: `Ctotal` within 1% of candidate target without violating hard gates.

## Acceptance Gates
| Gate | Requirement | Threshold | Evidence | Status |
|---|---|---|---|---|
| G-01 | Primary Overlap Gate | 0 overlaps | `primaryOverlaps == 0` | PASS |
| G-02 | Satellite Overlap Gate | 0 overlaps | `satelliteOverlaps == 0` | PASS |
| G-03 | Layer Violation Gate | 0 violations | `layerViolations == 0` | PASS |
| G-04 | Determinism Drift Gate | 0.00000 px drift | `maxDriftPx == 0.00000` | PASS |

## Failure Modes / Anti-Patterns
- Using random seed initialization in force-directed layout algorithms.
- Displacing primary production node anchors during satellite slot placement.

## Conflict / Recency Handling
- Latest Candidate E runtime audit (`HYBRID_LAYOUT_PHASE13_REAL_EXECUTION_FORENSIC_AUDIT.md`, 2026-09-22 23:58:30) supersedes earlier Wave 5/Phase 4 reports recording historical `Ctotal = 95,487`.

## Report Format
Standard 10-section audit report format.

## Reuse Hooks
- Reusable checks: `HybridLayoutAcceptanceB6.test.ts`
- Reusable metrics: `Ctotal`, `Cpp`, `Cps`, `Css`

---

# AUD-STATE-001 — Multi-Project Persistence & State Isolation Audit

## Metadata
- Phase: Testing
- Subsystem: Project-specific
- Cross-cutting: Security
- Status: Active
- Authority level: Authoritative
- Depends on: N/A

## Objective
Verify that project state (selection, filters, zoom, layout mode, node positions) is partitioned under `explorer.projectState.<projectId>` in `localStorage` without cross-project state leakage.

## Scope
In scope:
- `explorer/src/lib/projectState.ts` and `ProjectStateContext.tsx`.
- LocalStorage namespace keys and project switching events.
Out of scope:
- Server-side database persistence.

## Prerequisites
- Required artifacts: `projectState.ts`
- Required environment: React testing environment / Vitest

## Authoritative Sources
- `04_MultiProject_State_Persistence.md`
- `FINAL_PERSISTENCE_AUDIT.md`
- `explorer/src/lib/projectState.ts`

## Invariants Under Audit
- All state updates saved under `explorer.projectState.<projectId>`.
- Project switching flushes old project selection/focus state completely.

## Checks
| Check ID | Check | Command / Evidence | Expected Result | Severity | Gate |
|---|---|---|---|---|---|
| C-01 | LocalStorage namespace verification | Run persistence unit test | Keys strictly follow namespace pattern | Critical | PASS |
| C-02 | Cross-project isolation verification | `FINAL_PROJECT_ISOLATION_COMPARE_AUDIT.md` | 0 leaked keys or state artifacts | Critical | PASS |

## Evidence Requirements
- LocalStorage key inspection logs before and after project switching.

## Expected Outcomes
- PASS: 100% namespace compliance and 0 cross-project state leakage.
- FAIL: Storing unpartitioned keys in `localStorage` or reusing positions across projects.

## Acceptance Gates
| Gate | Requirement | Threshold | Evidence | Status |
|---|---|---|---|---|
| G-01 | Project Isolation Gate | 0 shared keys | `sharedKeys == 0` | PASS |

## Failure Modes / Anti-Patterns
- Reading layout positions from an unpartitioned global key during project load.

## Conflict / Recency Handling
- Executable persistence unit tests override historical state documentation.

## Report Format
Standard 10-section audit report format.

## Reuse Hooks
- Reusable checks: Persistence test suite

---

# AUD-SIMULATION-001 — Findings, Investigation & Refactoring Simulation Audit

## Metadata
- Phase: Testing
- Subsystem: Project-specific
- Cross-cutting: Security
- Status: Active
- Authority level: Authoritative
- Depends on: AUD-LAYOUT-001

## Objective
Verify that findings visualization, investigation workflows, and refactoring simulations perform non-destructive graph operations without mutating the authoritative base graph prior to explicit commit.

## Scope
In scope:
- `refactoring-simulation.ts`, `RefactoringSimulationPanel.tsx`, `FindingsIntegration6B.test.tsx`.
- Non-destructive proposal creation, finding delta calculation, and explicit commit pipeline.
Out of scope:
- AI LLM prompt generation.

## Prerequisites
- Required artifacts: `explorer-data.json`, `refactoring-simulation.ts`
- Required environment: Vitest / React testing environment

## Authoritative Sources
- `05_Findings_Investigation_Refactoring.md`
- `HYBRID_LAYOUT_PROMPT7_IMPLEMENTATION_REPORT.md`

## Invariants Under Audit
- Simulation operations do not mutate base graph data in memory or storage.
- Proposal commit triggers authoritative analyzer re-execution.
- 0 layout invocations or coordinate drift during finding badge rendering.

## Checks
| Check ID | Check | Command / Evidence | Expected Result | Severity | Gate |
|---|---|---|---|---|---|
| C-01 | Non-destructive simulation test | `npx vitest run refactoring-simulation.test.ts` | Base graph unmutated during simulation | Critical | PASS |
| C-02 | Finding badge overlay check | `npx vitest run FindingsIntegration6B.test.tsx` | 0 layout calls, 0 coordinate drift | High | PASS |

## Evidence Requirements
- Base graph SHA-256 hash comparison before and after refactoring simulation steps.

## Expected Outcomes
- PASS: Base graph hash unchanged during simulation; findings badges render with 0 layout calls.
- FAIL: Base graph mutated before explicit commit or position drift on badge display.

## Acceptance Gates
| Gate | Requirement | Threshold | Evidence | Status |
|---|---|---|---|---|
| G-01 | Non-Mutating Simulation Gate | 0 base graph mutations | `baseGraphDiff == 0` | PASS |
| G-02 | Findings Render Gate | 0 layout calls | `layoutCallCount == 0` | PASS |

## Failure Modes / Anti-Patterns
- Direct in-place array mutation of `edges` or `nodes` during proposal simulation steps.

## Conflict / Recency Handling
- Executable simulation test suite results take precedence.

## Report Format
Standard 10-section audit report format.

## Reuse Hooks
- Reusable checks: `refactoring-simulation.test.ts`

---

# AUD-EXPLAINABILITY-001 — Visual Composition Overlays & Density Control Audit

## Metadata
- Phase: Testing
- Subsystem: Project-specific
- Cross-cutting: Performance
- Status: Active
- Authority level: Authoritative
- Depends on: AUD-LAYOUT-001

## Objective
Confirm that feature composition overlays, duplicate group suppression, and density controls render strictly as visual explanation layers without mutating graph coordinates or triggering layout recomputation.

## Scope
In scope:
- Composition overlays, duplicate suppression, and zoom threshold rendering (`zoom < 0.6`).
- Shared infrastructure link interaction overlays.
Out of scope:
- Canvas background canvas export images.

## Prerequisites
- Required artifacts: `GraphView.tsx`, composition overlay modules
- Required environment: React testing environment

## Authoritative Sources
- `03_UI_UX_Interaction.md`
- `HYBRID_LAYOUT_PROMPT4_IMPLEMENTATION_REPORT.md`
- `WAVE13_VISUAL_ACCEPTANCE_REPORT.md`

## Invariants Under Audit
- Composition overlay rendering produces 0 node position changes (0.00000 px drift).
- Composition overlays invoke 0 layout recomputations.
- Shared-infrastructure links hidden by default.

## Checks
| Check ID | Check | Command / Evidence | Expected Result | Severity | Gate |
|---|---|---|---|---|---|
| C-01 | Composition overlay coordinate safety | `npx vitest run feature-composition-readability.test.ts` | 0.00000 px position drift | Critical | PASS |
| C-02 | Layout call suppression on overlay toggle | Spy on `cy.layout()` during overlay toggle | Exactly 0 layout invocations | Critical | PASS |

## Evidence Requirements
- Visual acceptance metrics report and position authority log.

## Expected Outcomes
- PASS: 0 position changes, 0 layout calls, and shared links hidden by default.
- FAIL: Mutating node coordinates or invoking layout recomputation when rendering overlays.

## Acceptance Gates
| Gate | Requirement | Threshold | Evidence | Status |
|---|---|---|---|---|
| G-01 | Overlay Coordinate Safety | 0.00000 px drift | `positionDrift == 0` | PASS |
| G-02 | Overlay Layout Call Gate | 0 layout calls | `layoutCallCount == 0` | PASS |

## Failure Modes / Anti-Patterns
- Treating composition overlay boundaries as physical layout constraints that push nodes.

## Conflict / Recency Handling
- `WAVE13_VISUAL_ACCEPTANCE_REPORT.md` (2026-09-21) supersedes earlier Wave 12 density regression reports.

## Report Format
Standard 10-section audit report format.

## Reuse Hooks
- Reusable checks: `feature-composition-readability.test.ts`

---

# AUD-PROVENANCE-001 — Data Contracts & Graph Artifact Provenance Audit

## Metadata
- Phase: Development
- Subsystem: Project-specific
- Cross-cutting: Governance
- Status: Active
- Authority level: Authoritative
- Depends on: N/A

## Objective
Verify that `analysis-manifest.json` and `explorer-data.json` contain immutable identity hashes and deterministic provenance attributes that prevent stale proposal commits against mismatched graphs.

## Scope
In scope:
- `analysis-manifest.json`, `explorer-data.json`.
- Provenance hash calculation and stale proposal validation in `explorer-contract.ts`.
Out of scope:
- User authentication tokens.

## Prerequisites
- Required artifacts: `analysis-manifest.json`, `explorer-data.json`
- Required environment: Node.js runtime

## Authoritative Sources
- `01_Foundations_Contracts.md`
- `explorer-contract.ts`

## Invariants Under Audit
- Graph source hash strictly identifies graph version.
- Mismatched proposal commits are rejected immediately by the validation gate.

## Checks
| Check ID | Check | Command / Evidence | Expected Result | Severity | Gate |
|---|---|---|---|---|---|
| C-01 | Manifest source hash presence | Inspect `analysis-manifest.json` | Valid SHA-256 hash string present | Critical | PASS |
| C-02 | Stale proposal rejection check | `node scripts/test-architecture-change-gate.cjs` | Proposal for wrong hash rejected | Critical | PASS |

## Evidence Requirements
- Hash comparison log during proposal validation.

## Expected Outcomes
- PASS: Valid source hash verified; cross-graph or stale proposals rejected.
- FAIL: Accepting proposals without validating source graph identity hash.

## Acceptance Gates
| Gate | Requirement | Threshold | Evidence | Status |
|---|---|---|---|---|
| G-01 | Graph Provenance Gate | 100% hash validation | Invalid proposal status `REJECTED` | PASS |

## Failure Modes / Anti-Patterns
- Committing a refactoring proposal generated for Project A against Project B's graph.

## Conflict / Recency Handling
- Contract specifications in `01_Foundations_Contracts.md` are authoritative.

## Report Format
Standard 10-section audit report format.

## Reuse Hooks
- Reusable checks: Manifest verification logic

---

# AUD-POSAUTH-001 — Position Authority & Static Mode Invariants Audit

## Metadata
- Phase: Testing
- Subsystem: Project-specific
- Cross-cutting: Governance
- Status: Active
- Authority level: Authoritative
- Depends on: AUD-LAYOUT-001

## Objective
Verify adherence to the 5-level Position Authority hierarchy (User drag > Persisted state > Cytoscape canvas > Intelligent layout > Fallback) and prevent accidental relayouts during static view operations.

## Scope
In scope:
- Central position policy module `explorer/src/lib/position-policy.ts`.
- `shouldAutoLayout` evaluation and Cytoscape `dragfree` event handlers.
Out of scope:
- Non-positional visual styling.

## Prerequisites
- Required artifacts: `position-policy.ts`, `GraphView.tsx`
- Required environment: React testing environment / Vitest

## Authoritative Sources
- `02_Layout_Engine_Spatial.md`
- `04_MultiProject_State_Persistence.md`
- `WAVE7A_RUNTIME_POSITION_AUTHORITY_AUDIT.md`
- `explorer/src/lib/position-policy.ts`

## Invariants Under Audit
- Position Authority hierarchy strictly enforced (Level 1 to Level 5).
- Static mode operations (zoom, pan, node select, filter toggle) trigger exactly 0 layout calls.
- User drag coordinates persisted on `dragfree` events.

## Checks
| Check ID | Check | Command / Evidence | Expected Result | Severity | Gate |
|---|---|---|---|---|---|
| C-01 | Position authority hierarchy check | `npx vitest run GraphView.positionAuthority.test.tsx` | Hierarchy respected 100% | Critical | PASS |
| C-02 | Static mode relayout prevention | Test filter/focus/selection in Static mode | Exactly 0 layout calls triggered | Critical | PASS |

## Evidence Requirements
- Test output logs from `GraphView.positionAuthority.test.tsx`.

## Expected Outcomes
- PASS: 100% Position Authority compliance and 0 static mode layout calls.
- FAIL: Overwriting user-authored coordinates or triggering auto-relayout on selection.

## Acceptance Gates
| Gate | Requirement | Threshold | Evidence | Status |
|---|---|---|---|---|
| G-01 | Position Hierarchy Gate | 100% compliance | `authorityViolations == 0` | PASS |
| G-02 | Static Mode Invariant Gate | 0 layout calls | `staticLayoutCalls == 0` | PASS |

## Failure Modes / Anti-Patterns
- Recomputing layout coordinates when a user clicks to select a node in Static mode.

## Conflict / Recency Handling
- `HYBRID_LAYOUT_PHASE13_REAL_EXECUTION_FORENSIC_AUDIT.md` bug fix details are authoritative over earlier reports.

## Report Format
Standard 10-section audit report format.

## Reuse Hooks
- Reusable checks: `GraphView.positionAuthority.test.tsx`

---

# AUD-FEATURE-001 — Feature Discovery & 2D Region Geometry Audit

## Metadata
- Phase: Testing
- Subsystem: Project-specific
- Cross-cutting: Scalability
- Status: Active
- Authority level: Authoritative
- Depends on: AUD-LAYOUT-001

## Objective
Audit feature discovery (`discoverFeatures`, `feature-roles.ts`) and multi-row 2D feature region packing (`global-layout.ts`) to ensure tight feature cohesion and zero region overlaps.

## Scope
In scope:
- Feature discovery seed ranking and candidate scoring in `features.ts`.
- Multi-row band region placement and Y-layer alignment in `global-layout.ts`.
Out of scope:
- Single-node isolated domain rendering.

## Prerequisites
- Required artifacts: `features.ts`, `global-layout.ts`
- Required environment: Vitest / Node.js runtime

## Authoritative Sources
- `02_Layout_Engine_Spatial.md`
- `HYBRID_LAYOUT_PHASE4_B_FEATURE_2D_GEOMETRY_REPORT.md`
- `HYBRID_LAYOUT_PROMPT3_IMPLEMENTATION_REPORT.md`

## Invariants Under Audit
- Group related Domain + Selector + Service trios authoritatively.
- Median intra-feature distance < Median inter-feature distance.
- Zero region or primary node overlaps in 2D feature geometry.

## Checks
| Check ID | Check | Command / Evidence | Expected Result | Severity | Gate |
|---|---|---|---|---|---|
| C-01 | Feature discovery unit tests | `npx vitest run features.test.ts` | 100% features correctly discovered | Critical | PASS |
| C-02 | Feature locality metrics check | `npx vitest run Phase6B_LocalityCompaction.test.ts` | Intra-feature distance < Inter-feature | High | PASS |

## Evidence Requirements
- Feature cohesion metrics report and region bounding box validation logs.

## Expected Outcomes
- PASS: Correct component clustering and intra-feature locality < inter-feature locality.
- FAIL: Arbitrary feature grouping or overlapping 2D feature region bounding boxes.

## Acceptance Gates
| Gate | Requirement | Threshold | Evidence | Status |
|---|---|---|---|---|
| G-01 | Feature Locality Gate | Intra < Inter | `D_intra < D_inter` | PASS |
| G-02 | Feature Region Overlap Gate | 0 overlaps | `regionOverlaps == 0` | PASS |

## Failure Modes / Anti-Patterns
- Using fuzzy substring matching on class names instead of dependency edge relationships.

## Conflict / Recency Handling
- Phase 6A/6B locality reports (`HYBRID_LAYOUT_PHASE6_A_2D_GEOMETRY_REPORT.md`) take precedence.

## Report Format
Standard 10-section audit report format.

## Reuse Hooks
- Reusable checks: `features.test.ts`, `Phase6B_LocalityCompaction.test.ts`
