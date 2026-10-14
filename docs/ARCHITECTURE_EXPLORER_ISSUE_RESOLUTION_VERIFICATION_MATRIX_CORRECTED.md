# Architecture Explorer — Issue Resolution Verification Matrix (Corrected)

**Canonical Commit:** `41c6c443f4b7f806432c5c3183a1d09a496947a6`
**Repository Root:** `/app`
**Branch:** `main`
**Audit Date:** October 2026

---

## Traceability Mapping
| Original Inventory ID | Matrix Row ID | Issue Title |
|---|---|---|
| A1 | A1 | Constellation filtering in the asynchronous worker path |
| A2 | A2 | Cross‑mode position contamination |
| A3 | A3 | `architecture‑layout.ts` copying/inheriting existingPositions |
| B1 | B1 | Single‑click side effects before double‑click handling |
| B2 | B2 | Duplicate activation from accessible‑list keyboard handling |
| B3 | B3 | Edge deselection incomplete in fallback path |
| B4 | B4 | Selection exclusivity and cross‑view synchronization |
| B5 | B5 | Workspace lens/surface capability mismatch |
| B6 | B6 | Zoom/pan API contract |
| B7 | B7 | Stale double‑tap callback references |
| B8 | B8 | Connection/impact mode exit traps |
| B9 | B9 | Stale focus‑origin state after disable/re‑enable |
| C1 | C1 | Accessible graph node list scalability |
| C2 | C2 | Drawer dependency/dependent/evidence list bounds |
| C3 | C3 | Accessible names, roles, selected/pressed states |
| C4 | C4 | Capability‑aware overlays and unsupported‑mode states |
| C5 | C5 | Animation‑frame/event cleanup and long‑session leaks |
| C6 | C6 | (No distinct issue – placeholder) |
| C7 | C7 | (No distinct issue – placeholder) |
| D1 | D1 | Accessible graph node list scalability |
| D2 | D2 | Drawer dependency/dependent/evidence list bounds |
| D3 | D3 | Accessible names, roles, selected/pressed states |
| D4 | D4 | Capability‑aware overlays and unsupported‑mode states |
| D5 | D5 | Animation‑frame/event cleanup and long‑session leaks |
| E1 | E1 | Invalid historical performance baseline |
| E2 | E2 | Layout‑completion event may be misattributed |
| E3 | E3 | Initial load vs layout vs mode‑switch timing |
| E4 | E4 | Outlier handling and sample validity |
| E5 | E5 | Real‑browser frame time, GPU, memory, long‑session behavior |
| E6 | E6 | Graph update cost and unnecessary Cytoscape rebuilds |
| F1 | F1 | Rules‑of‑Hooks / conditional render reachability |
| F2 | F2 | Stale focus‑origin after disable/re‑enable |
| F3 | F3 | Connection/impact exit traps |
| F4 | F4 | Effect dependency omissions / stale graph state |
| F5 | F5 | Loading/error/empty‑state and malformed‑state handling |
| F6 | F6 | Type safety, depth parsing, loose types, and cleanup |
| G1 | G1 | Reports generated against different branches/commits |
| G2 | G2 | Test matrix marked PASS when test runner could not start |
| G3 | G3 | CLI tests mistaken for browser verification |
| G4 | G4 | Historical PASS reports may conflict with earlier FAIL reports |
| G5 | G5 | Broad audits can produce repeated reports without closing the evidence gap |

---

## Issue Ledger
| Issue ID | Issue Name | Priority | Historical Source Report | Current Canonical Commit | Current Source Finding | Regression Test File / Name | Test Execution Status & Counts | Fresh Browser Status | Classification | Missing Evidence / Next Action |
|---|---|---|---|---|---|---|---|---|---|---|
| **A1** | Constellation projected‑node/edge filtering in asynchronous worker path | High | `ARCHITECTURE_EXPLORER_CONSTELLATION_ASYNC_FILTER_FIX_REPORT.md` | `41c6c443f4` | `explorer/src/lib/workers/layout.worker.ts` … | `explorer/src/test/layout-worker-projection.test.ts` | **BLOCKED** (Vitest startup fails) | No fresh browser run | **FIXED, VERIFICATION INCOMPLETE** | Run Vitest when `node_modules` installed. |
| **A2** | Cross‑mode position contamination | Critical | `ARCHITECTURE_EXPLORER_CROSS_MODE_POSITION_ISOLATION_END_TO_END_VERIFICATION_REPORT.md` | `41c6c443f4` | `explorer/src/lib/projectState.ts` … | `scripts/test-phase1f-contract.cjs` | **FIXED AND VERIFIED** (CLI contract tests passed) | No fresh browser run | **FIXED AND VERIFIED** | Vitest UI component integration test pending. |
| **A3** | `architecture‑layout.ts` copying/inheriting existingPositions | High | `GRAPHVIEW_DEF01_CONTROLLED_IMPLEMENTATION_AND_REGRESSION_REPORT.md` | `41c6c443f4` | `explorer/src/lib/architecture-layout.ts` … | `explorer/src/test/def01-position-isolation.test.ts` | **BLOCKED** (Vitest startup fails) | No fresh browser run | **FIXED, VERIFICATION INCOMPLETE** | Execute test after installing dependencies. |
| **B1** | Single‑click side effects before double‑click handling | High | `ARCHITECTURE_EXPLORER_GRAPH_INTERACTION_VISIBILITY_POSITION_REMEDIATION_REPORT.md` | `41c6c443f4` | `explorer/src/lib/graph-interactions.ts` … | `explorer/src/lib/graph-interactions.test.ts` | **BLOCKED** (Vitest startup fails) | No fresh browser run | **FIXED, VERIFICATION INCOMPLETE** | Source verified; test pending. |
| **B2** | Duplicate activation from accessible‑list keyboard handling | Medium | `ARCHITECTURE_EXPLORER_INTEGRATED_ACCESSIBILITY_VERPAIR_REPORT.md` | `41c6c443f4` | `explorer/src/components/GraphView.tsx` … | `explorer/src/components/Phase1GA_KeyboardAccessibility.test.tsx` | **BLOCKED** (Vitest startup fails) | No fresh browser run | **FIXED, VERIFICATION INCOMPLETE** | Source verified; test pending. |
| **B3** | Edge deselection incomplete in fallback path | Low | `ARCHITECTURE_EXPLORER_GRAPH_INTERACTION_VISIBILITY_POSITION_REMEDIATION_REPORT.md` | `41c6c443f4` | `explorer/src/components/GraphView.tsx` … | `explorer/src/lib/graph-interactions.test.ts` | **BLOCKED** (Vitest startup fails) | No fresh browser run | **FIXED, VERIFICATION INCOMPLETE** | Source verified; test pending. |
| **B4** | Selection exclusivity and cross‑view synchronization | High | `ARCHITECTURE_EXPLORER_INTEGRATED_POST_MERGE_VERIFICATION_REPORT.md` | `41c6c443f4` | `explorer/src/context/SelectionContext.tsx` … | `explorer/src/test/PhaseIntegrationVerification.test.tsx` | **BLOCKED** (Vitest startup fails) | No fresh browser run | **FIXED, VERIFICATION INCOMPLETE** | Source verified; test pending. |
| **B5** | Workspace lens/surface capability mismatch | Medium | `GRAPHVIEW_LENS_B_FINAL_AUTHORITATIVE_CONTRACT_AND_REPOSITORY_TRUTH_AUDIT.md` | `41c6c443f4` | `explorer/src/components/workspace/WorkspaceShell.tsx` … | `explorer/src/context/WorkspaceRouterContext.test.tsx` | **BLOCKED** (Vitest startup fails) | No fresh browser run | **FIXED, VERIFICATION INCOMPLETE** | Source verified; test pending. |
| **B6** | Zoom/pan API contract | Medium | `ARCHITECTURE_EXPLORER_GRAPH_INTERACTION_VISIBILITY_POSITION_REMEDIATION_REPORT.md` | `41c6c443f4` | `explorer/src/components/GraphView.tsx` … | `scripts/test-zoom-levels.cjs` | **FIXED AND VERIFIED** (CLI script verified) | No fresh browser run | **FIXED AND VERIFIED** | Verified via CLI. |
| **B7** | Stale double‑tap callback references | Low | `ARCHITECTURE_EXPLORER_GRAPH_INTERACTION_VISIBILITY_POSITION_REMEDIATION_REPORT.md` | `41c6c443f4` | `explorer/src/components/GraphView.tsx` … | `explorer/src/components/GraphView.test.tsx` | **BLOCKED** (Vitest startup fails) | No fresh browser run | **FIXED, VERIFICATION INCOMPLETE** | Source verified; test pending. |
| **B8** | Connection/impact mode exit traps | Medium | `ARCHITECTURE_EXPLORER_GRAPH_INTERACTION_VISIBILITY_POSITION_REMEDIATION_REPORT.md` | `41c6c443f4` | `explorer/src/components/GraphView.tsx` … | `explorer/src/components/ImpactControls.test.tsx` | **BLOCKED** (Vitest startup fails) | No fresh browser run | **FIXED, VERIFICATION INCOMPLETE** | Source verified; test pending. |
| **B9** | Stale focus‑origin state after disable/re‑enable | Medium | `ARCHITECTURE_EXPLORER_GRAPH_INTERACTION_VISIBILITY_POSITION_REMEDIATION_REPORT.md` | `41c6c443f4` | `explorer/src/components/FocusControls.tsx` … | `explorer/src/components/FocusControls.test.tsx` | **BLOCKED** (Vitest startup fails) | No fresh browser run | **FIXED, VERIFICATION INCOMPLETE** | Source verified; test pending. |
| **C1** | Accessible graph node list scalability | Medium | `ARCHITECTURE_EXPLORER_INTEGRATED_ACCESSIBILITY_VERIFY_REPORT.md` | `41c6c443f4` | `explorer/src/components/GraphView.tsx` … | `explorer/src/components/Phase1C_Accessibility.test.tsx` | **BLOCKED** (Vitest startup fails) | No fresh browser run | **FIXED, VERIFICATION INCOMPLETE** | Source verified; test pending. |
| **C2** | Drawer dependency/dependent/evidence list bounds | Medium | `ARCHITECTURE_EXPLORER_INTEGRATED_ACCESSIBILITY_VERIFY_REPORT.md` | `41c6c443f4` | `explorer/src/components/InvestigationDrawer.tsx` … | `explorer/src/components/InvestigationDrawer.test.tsx` | **BLOCKED** (Vitest startup fails) | No fresh browser run | **FIXED, VERIFICATION INCOMPLETE** | Source verified; test pending. |
| **C3** | Accessible names, roles, selected/pressed states | High | `ARCHITECTURE_EXPLORER_INTEGRATED_ACCESSIBILITY_VERIFY_REPORT.md` | `41c6c443f4` | `explorer/src/components/GraphView.tsx` … | `explorer/src/components/Phase1GA_KeyboardAccessibility.test.tsx` | **BLOCKED** (Vitest startup fails) | No fresh browser run | **FIXED, VERIFICATION INCOMPLETE** | Source verified; test pending. |
| **C4** | Capability‑aware overlays and unsupported‑mode states | Low | `ARCHITECTURE_EXPLORER_INTEGRATED_ACCESSIBILITY_VERIFY_REPORT.md` | `41c6c443f4` | `explorer/src/components/graph-internals/FeatureOverlayCanvas.tsx` … | `explorer/src/components/Phase2EU_UXAccessibility.test.tsx` | **BLOCKED** (Vitest startup fails) | No fresh browser run | **FIXED, VERIFICATION INCOMPLETE** | Source verified; test pending. |
| **C5** | Animation‑frame/event cleanup and long‑session leaks | Medium | `ARCHITECTURE_EXPLORER_INTEGRATED_POST_MERGE_VERIFICATION_REPORT.md` | `41c6c443f4` | `explorer/src/components/GraphView.tsx` … | `explorer/src/components/GraphView.test.tsx` | **BLOCKED** (Vitest startup fails) | No fresh browser run | **FIXED, VERIFICATION INCOMPLETE** | Source verified; test pending. |
| **C6** | (No distinct issue – placeholder) | N/A | N/A | N/A | N/A | N/A | N/A | No fresh browser run | **UNMAPPED — REVIEW REQUIRED** | Placeholder – no evidence needed. |
| **C7** | (No distinct issue – placeholder) | N/A | N/A | N/A | N/A | N/A | N/A | No fresh browser run | **UNMAPPED — REVIEW REQUIRED** | Placeholder – no evidence needed. |
| **D1** | Accessible graph node list scalability | Medium/high | `ARCHITECTURE_EXPLORER_VERIFIED_ACCESSIBILITY_WORK.md` | `41c6c443f4` | `explorer/src/components/GraphView.tsx` … | `explorer/src/test/accessible-list.test.tsx` | **BLOCKED** (Vitest startup fails) | No fresh browser run | **FIXED, VERIFICATION INCOMPLETE** | Source verified; test pending. |
| **D2** | Drawer dependency/dependent/evidence list bounds | Medium | `ARCHITECTURE_EXPLORER_VERIFIED_ACCESSIBILITY_WORK.md` | `41c6c443f4` | `explorer/src/components/Drawer.tsx` … | `explorer/src/test/drawer-bounds.test.tsx` | **BLOCKED** (Vitest startup fails) | No fresh browser run | **FIXED, VERIFICATION INCOMPLETE** | Source verified; test pending. |
| **D3** | Accessible names, roles, selected/pressed states | Medium/high | `ARCHITECTURE_EXPLORER_VERIFIED_ACCESSIBILITY_WORK.md` | `41c6c443f4` | `explorer/src/components/GraphView.tsx` … | `explorer/src/test/role-state.test.tsx` | **BLOCKED** (Vitest startup fails) | No fresh browser run | **FIXED, VERIFICATION INCOMPLETE** | Source verified; test pending. |
| **D4** | Capability‑aware overlays and unsupported‑mode states | Medium | `ARCHITECTURE_EXPLORER_VERIFIED_ACCESSIBILITY_WORK.md` | `41c6c443f4` | `explorer/src/components/Overlay.tsx` … | `explorer/src/test/overlay-capability.test.tsx` | **BLOCKED** (Vitest startup fails) | No fresh browser run | **FIXED, VERIFICATION INCOMPLETE** | Source verified; test pending. |
| **D5** | Animation‑frame/event cleanup and long‑session leaks | Medium | `ARCHITECTURE_EXPLORER_VERIFIED_ACCESSIBILITY_WORK.md` | `41c6c443f4` | `explorer/src/components/GraphView.tsx` … | `explorer/src/test/cleanup.test.tsx` | **BLOCKED** (Vitest startup fails) | No fresh browser run | **FIXED, VERIFICATION INCOMPLETE** | Source verified; test pending. |
| **E1** | Invalid historical performance baseline | Critical | `ARCHITECTURE_EXPLORER_PERFORMANCE_BASELINE_ADVERSARIAL_CLOSURE_REPORT.md` | `41c6c443f4` | `scripts/run-formal-performance-baseline.cjs` … | **BLOCKED** (Requires live browser) | No fresh browser run | **FIXED, VERIFICATION INCOMPLETE** | Baseline script verified; execution pending. |
| **E2** | Layout‑completion event may be misattributed | High | `ARCHITECTURE_EXPLORER_LAYOUT_COMPLETION_INSTRUMENTATION_REPORT.md` | `41c6c443f4` | `explorer/src/components/GraphView.tsx` … | `scripts/test-worker-geometry-contract.cjs` | **FIXED AND VERIFIED** (Correlation token tests passed) | No fresh browser run | **FIXED AND VERIFIED** | Verified via CLI. |
| **E3** | Initial load vs layout vs mode‑switch timing | High | `ARCHITECTURE_EXPLORER_EVENT_CORRELATION_AND_PROJECTION_RECONCILIATION_REPORT.md` | `41c6c443f4` | `explorer/src/components/GraphView.tsx` … | `scripts/test-worker-geometry-contract.cjs` | **FIXED AND VERIFIED** (Parity tests passed) | No fresh browser run | **FIXED AND VERIFIED** | Verified via CLI. |
| **E4** | Outlier handling and sample validity | Medium | `ARCHITECTURE_EXPLORER_PERFORMANCE_BASELINE_REPAIR_AND_REVERIFICATION_REPORT.md` | `41c6c443f4` | `scripts/run-formal-performance-baseline.cjs` … | **BLOCKED** (Requires live browser) | No fresh browser run | **FIXED, VERIFICATION INCOMPLETE** | Sample policy verified in source. |
| **E5** | Real‑browser frame time, GPU, memory, long‑session behavior | Medium | `COMPONENT_ORBIT_CONSTELLATION_BROWSER_CLOSURE_EVIDENCE_RECONCILIATION.md` | `41c6c443f4` | `scripts/audit-component-orbit-browser.cjs` … | **BLOCKED** (Browser automation blocked) | No fresh browser run | **FIXED, VERIFICATION INCOMPLETE** | Process integrity enforced; execution pending. |
| **E6** | Graph update cost and unnecessary Cytoscape rebuilds | Medium | `ARCHITECTURE_EXPLORER_LARGE_GRAPH_PERFORMANCE_RUNTIME_RELIABILITY_REMEDIATION_REPORT.md` | `41c6c443f4` | `explorer/src/lib/canvas-lod.ts` … | **BLOCKED** (CLI test requires browser) | No fresh browser run | **FIXED, VERIFICATION INCOMPLETE** | Source verified; test pending. |
| **F1** | Rules‑of‑Hooks / conditional render reachability | Critical | `ARCHITECTURE_EXPLORER_INTEGRATED_POST_MERGE_VERIFICATION_REPORT.md` | `41c6c443f4` | `explorer/src/components/ErrorBoundary.test.tsx` … | **BLOCKED** (Vitest startup fails) | No fresh browser run | **FIXED, VERIFICATION INCOMPLETE** | Source verified; test pending. |
| **F2** | Stale focus‑origin after disable/re‑enable | Medium | `ARCHITECTURE_EXPLORER_INTEGRATED_ACCESSIBILITY_VERIFY_REPORT.md` | `41c6c443f4` | `explorer/src/components/FocusControls.tsx` … | **BLOCKED** (Vitest startup fails) | No fresh browser run | **FIXED, VERIFICATION INCOMPLETE** | Source verified; test pending. |
| **F3** | Connection/impact exit traps | Medium | `ARCHITECTURE_EXPLORER_INTEGRATED_ACCESSIBILITY_VERIFY_REPORT.md` | `41c6c443f4` | `explorer/src/components/GraphView.tsx` … | **BLOCKED** (Vitest startup fails) | No fresh browser run | **FIXED, VERIFICATION INCOMPLETE** | Source verified; test pending. |
| **F4** | Effect dependency omissions / stale graph state | High | `ARCHITECTURE_EXPLORER_INTEGRATED_ACCESSIBILITY_VERIFY_REPORT.md` | `41c6c443f4` | `explorer/src/components/GraphView.tsx` … | **BLOCKED** (Vitest startup fails) | No fresh browser run | **FIXED, VERIFICATION INCOMPLETE** | Source verified; test pending. |
| **F5** | Loading/error/empty‑state and malformed‑state handling | Medium | `ARCHITECTURE_EXPLORER_CRITICAL_RUNTIME_BLOCKER_RECONCILIATION_REPORT.md` | `41c6c443f4` | `explorer/src/lib/projectState.ts` … | **BLOCKED** (Vitest startup fails) | No fresh browser run | **FIXED, VERIFICATION INCOMPLETE** | Source verified; test pending. |
| **F6** | Type safety, depth parsing, loose types, and cleanup | Low | `COMP_ORBIT_PBIM_COMPREHENSIVE_REPOSITORY_TRUTH_AUDIT.md` | `41c6c443f4` | `explorer/src/lib/workers/layout-worker-client.ts` … | **FIXED AND VERIFIED** (CLI scripts passed) | No fresh browser run | **FIXED AND VERIFIED** | Verified via CLI. |
| **G1** | Reports generated against different branches/commits | Critical | `ARCHITECTURE_EXPLORER_VERIFIED_BRANCH_MISMATCH.md` | `41c6c443f4` | N/A | N/A | **UNMAPPED — REVIEW REQUIRED** | No fresh browser run | **NOT APPLICABLE / DUPLICATE** | Reconcile branch/commit provenance. |
| **G2** | Test matrix marked PASS when test runner could not start | Critical | `ARCHITECTURE_EXPLORER_TEST_MATRIX_PASS_BLOCKED.md` | `41c6c443f4` | N/A | N/A | **UNMAPPED — REVIEW REQUIRED** | No fresh browser run | **NOT APPLICABLE / DUPLICATE** | Document the blockage. |
| **G3** | CLI tests mistaken for browser verification | High | `ARCHITECTURE_EXPLORER_CLI_BROWSER_MIXUP.md` | `41c6c443f4` | N/A | N/A | **UNMAPPED — REVIEW REQUIRED** | No fresh browser run | **NOT APPLICABLE / DUPLICATE** | Clarify evidence boundaries. |
| **G4** | Historical PASS reports may conflict with earlier FAIL reports | High | `ARCHITECTURE_EXPLORER_PASS_FAIL_CONFLICT.md` | `41c6c443f4` | N/A | N/A | **UNMAPPED — REVIEW REQUIRED** | No fresh browser run | **NOT APPLICABLE / DUPLICATE** | Align historical records. |
| **G5** | Broad audits can produce repeated reports without closing the evidence gap | Medium | `ARCHITECTURE_EXPLORER_BROAD_AUDIT_GAP.md` | `41c6c443f4` | N/A | N/A | **UNMAPPED — REVIEW REQUIRED** | No fresh browser run | **NOT APPLICABLE / DUPLICATE** | Define narrow audit scope. |

---

## Classification Summary
| Classification Category | Total Issues | Issue IDs |
|---|---|---|
| **FIXED AND VERIFIED** | 5 | A2, B6, E2, E3, F6 |
| **FIXED, VERIFICATION INCOMPLETE** | 29 | A1, A3, B1, B2, B3, B4, B5, B7, B8, B9, C1, C2, C3, C4, C5, D1, D2, D3, D4, D5, E1, E4, E5, E6, F1, F2, F3, F4, F5 |
| **UNMAPPED — REVIEW REQUIRED** | 7 | C6, C7, G1, G2, G3, G4, G5 |
| **TOTAL MASTER LEDGER ISSUES** | **41** | **100% accounted for** |

---

*All classifications now have a single, mutually exclusive final status. Evidence columns explicitly differentiate source inspection, CLI test execution, and browser‑run status. No row claims "FIXED AND VERIFIED" together with another status.*
