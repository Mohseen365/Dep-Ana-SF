# Remediation Plan

## Overview
This plan groups the findings by root‑cause clusters and orders them by impact and difficulty.  It is intended to be followed iteratively; after each fix, re‑run the build and test commands to verify that the issue is resolved before moving to the next item.

## 1. Core Type‑Safety Fixes (High priority)
| Step | Action | Files | Estimated effort |
|------|--------|-------|------------------|
| 1.1 | Define and export `ArchitectureLayer` (likely an enum of architectural layers). | `src/types/explorer.ts` | 30 min |
| 1.2 | Make `ExplorerNodeBehavior` fields optional (`queryCount`, `dmlCount`, `calloutCount`, etc.) and add safe defaults in constructors. | `src/lib/layout/layers.ts`, `src/lib/architecture‑layout.ts`, `src/components/InvestigationDrawer.tsx` | 1 h |
| 1.3 | Refactor `highlight-state.ts` to use a proper discriminated union for nodes/edges and guard `isEdge`. | `src/lib/highlight-state.ts` | 45 min |
| 1.4 | Adjust any code that constructs `ExplorerNode` objects to provide a full `behavior` object (even if fields are undefined). | `src/lib/architecture‑layout.ts` | 45 min |

## 2. Align Test Fixtures with Updated Types (Medium priority)
| Step | Action | Files | Effort |
|------|--------|-------|--------|
| 2.1 | Update mock node objects in test suites to include required properties (`behavior`, `riskReasons`, etc.). | All `src/**/*.test.*` that create `ExplorerNode` literals (e.g., `FeatureOverlayCanvas.*.test.tsx`, `layer_violation_test.test.ts`) | 2 h |
| 2.2 | Replace missing `score` property in `UrlSyncAndOverlayRegression.test.ts` with the correct type or extend the `RiskSummary` interface. | `src/test/UrlSyncAndOverlayRegression.test.ts` | 15 min |
| 2.3 | Remove or comment out unused variable declarations (`nodeCount`, `edgeCount`, etc.). | `src/test/stage7-single-pass-x-center-ab.test.ts` | 10 min |
| 2.4 | Replace jQuery‑style array helpers (`removeClass`, `addClass`, `toArray`, `empty`) with modern DOM utilities or mock them. | `src/test/RegressionAcceptance.test.tsx` | 30 min |

## 3. Verify Build & Test Success (Low priority, verification step)
| Step | Action |
|------|--------|
| 3.1 | Run `npm run build`. Ensure the TypeScript step passes with **no errors**.
| 3.2 | Run `npm test`. All tests should now compile and execute. Capture the Vitest report.
| 3.3 | Re‑run the performance benchmarks (Stage 9 spatial‑bucket, crossing‑count) to confirm no regressions.

## 4. Optional Clean‑up
| Step | Action |
|------|--------|
| 4.1 | Remove the temporary `tsconfig.test.json` file if no longer needed.
| 4.2 | Run `npm audit fix` (or `npm audit fix --force` after confirming no breaking changes) to address the 7 reported vulnerabilities.
| 4.3 | Update documentation (`README.md`) to reflect any newly‑added types or changed APIs.

---
*Prepared by Antigravity (AGY) senior engineer on 2026‑10‑20.*