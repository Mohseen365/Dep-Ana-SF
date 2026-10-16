# Explorer TypeScript Phase 1 ArchitectureLayer Contract Gate Report

**Author:** Jules (Phase 1 Contract Gate Coordinator)
**Date:** March 30, 2026
**Status:** Shared-Contract Gate Cleared
**Agents 3 & 4 Launch Clearance:** `CLEARED`

---

## 1. Executive Summary and Launch Decision

This report documents the investigation and resolution of the `ArchitectureLayer` type-contract dependency identified during the Phase 0 baseline assessment (`EXPLORER_TYPESCRIPT_PARALLEL_BASELINE_AND_OWNERSHIP.md`).

- **Issue Verified:** All 7 `TS2305` and `TS2459` compiler diagnostics in joint-experiment and benchmark test files were confirmed as missing or incorrect export paths for `ArchitectureLayer`.
- **Root Cause:**
  1. `TS2459` (`Module '"../lib/layout/global-layout"' declares 'ArchitectureLayer' locally, but it is not exported`): `src/lib/layout/global-layout.ts` imported `ArchitectureLayer` from `./types` internally but did not export it, despite functions like `computeGlobalFeatureLayout` relying on `ArchitectureLayer` in public parameter and return types.
  2. `TS2305` (`Module '"../types/explorer"' has no exported member 'ArchitectureLayer'`): Test files `phase21`, `phase27`, and `phase28r` imported `ArchitectureLayer` from `../types/explorer` (which is reserved for core data schema entities like `ExplorerNode` and `ExplorerEdge`) instead of layout domain types in `../lib/layout/types`.
- **Minimal Authorized Fix Applied:**
  1. Added `export type { ArchitectureLayer };` to `explorer/src/lib/layout/global-layout.ts`.
  2. Updated import paths in `phase21`, `phase27`, and `phase28r` from `../types/explorer` to `../lib/layout/types`.
  3. **Zero changes** to protected files `explorer/src/types/explorer.ts`, `GraphView.tsx`, `position-policy.ts`, `projectState.ts`, or `Phase1F_PositionPersistenceContract.test.ts`.
- **Compiler Verification:** All 7 `TS2305` and `TS2459` errors were completely eliminated. Workspace diagnostic count dropped from **191 to 184**.
- **Launch Decision:** **`CLEARED`** — Agents 3 and 4 are fully cleared to begin parallel remediation.

---

## 2. Repository Identity and Working-Tree State

- **Repository Root:** `/app`
- **Explorer Workspace Path:** `/app/explorer`
- **Current Branch:** `jules-10043311537754124311-92c995d0`
- **HEAD Hash:** `32736dc6dd8fbac6a2c686d878765e7713a07c09` (matches Phase 0 baseline commit)
- **Working-Tree Status:**
  - `EXPLORER_TYPESCRIPT_PARALLEL_BASELINE_AND_OWNERSHIP.md` (Staged from Phase 0)
  - `explorer/src/lib/layout/global-layout.ts` (Modified in Phase 1)
  - `explorer/src/test/phase21-hybrid-stage5-geometry.test.ts` (Modified in Phase 1)
  - `explorer/src/test/phase27-joint-adaptive-clearance.test.ts` (Modified in Phase 1)
  - `explorer/src/test/phase28r-adaptive-capacity.test.ts` (Modified in Phase 1)
- **Installed Compiler:** TypeScript `5.9.3` (`explorer/node_modules/.bin/tsc`)

---

## 3. Canonical ArchitectureLayer Declaration and Export Tracing

Investigation of `explorer/src/` established the following structural facts:

1. **Canonical Declarations:**
   - Primary declaration: `explorer/src/lib/layout/types.ts`: `export type ArchitectureLayer = 'presentation' | 'application' | 'domain' | 'schema';`
   - Secondary classification declaration: `explorer/src/lib/layout/layers.ts`: `export type ArchitectureLayer = 'presentation' | 'application' | 'domain' | 'schema';`
2. **Barrel / Module Boundaries:**
   - Layout modules (`local-layout.ts`, `ordering.ts`, `spacing.ts`, `satellites.ts`, `orbit-semantics.ts`, `features.ts`, `feature-roles.ts`) consistently import `ArchitectureLayer` from `./types`.
   - `global-layout.ts` imports `ArchitectureLayer` from `./types` and uses it across public layout functions (`computeGlobalFeatureLayout`, `LAYER_Y_MAP`).
3. **Consumer Call Site Analysis:**
   - `src/test/phase22-joint-stage5-stage7-experiment.test.ts` (L20)
   - `src/test/phase23-j4-validation.test.ts` (L25)
   - `src/test/phase24-joint-density-experiment.test.ts` (L21)
   - `src/test/phase29re-coupled-closure.test.ts` (L29)
   - All 4 files imported `computeGlobalFeatureLayout` and `ArchitectureLayer` from `../lib/layout/global-layout`. Because `global-layout.ts` did not export `ArchitectureLayer`, TypeScript raised `TS2459`.
   - `src/test/phase21-hybrid-stage5-geometry.test.ts` (L19)
   - `src/test/phase27-joint-adaptive-clearance.test.ts` (L19)
   - `src/test/phase28r-adaptive-capacity.test.ts` (L19)
   - All 3 files imported `ArchitectureLayer` from `../types/explorer`. Because `explorer.ts` does not contain layout positioning types, TypeScript raised `TS2305`.

---

## 4. Chosen Resolution and Rationale

The resolution follows the principle of smallest justified correction:

1. **Re-export from `global-layout.ts`:**
   - Adding `export type { ArchitectureLayer };` to `explorer/src/lib/layout/global-layout.ts` directly satisfies consumers importing global layout functions and types together, matching established module export expectations without duplicating types or introducing runtime overhead.
2. **Redirect Test Imports in Phase 21, 27, 28r:**
   - Changing `import type { ArchitectureLayer } from '../types/explorer';` to `import type { ArchitectureLayer } from '../lib/layout/types';` aligns test imports with canonical type declaration paths.
   - Preserves `explorer/src/types/explorer.ts` as a protected core contract file without modifying it.

---

## 5. Files Changed vs. Left Untouched

### Modified Files (4 files)
1. `explorer/src/lib/layout/global-layout.ts` (Added 1 line: `export type { ArchitectureLayer };`)
2. `explorer/src/test/phase21-hybrid-stage5-geometry.test.ts` (Updated 1 import path)
3. `explorer/src/test/phase27-joint-adaptive-clearance.test.ts` (Updated 1 import path)
4. `explorer/src/test/phase28r-adaptive-capacity.test.ts` (Updated 1 import path)

### Protected & Explicitly Untouched Files
- `explorer/src/types/explorer.ts` (**UNTOUCHED**)
- `explorer/src/components/GraphView.tsx` (**UNTOUCHED**)
- `explorer/src/lib/layout/position-policy.ts` (**UNTOUCHED**)
- `explorer/src/lib/projectState.ts` (**UNTOUCHED**)
- `explorer/src/test/Phase1F_PositionPersistenceContract.test.ts` (**UNTOUCHED**)
- `explorer/tsconfig.json` (**UNTOUCHED**)
- All 37 other test files assigned to Wave 3 agents (**UNTOUCHED**)

---

## 6. Before-and-After Diagnostic Evidence

| Metric | Phase 0 Baseline | Phase 1 Post-Fix | Net Delta |
| :--- | :---: | :---: | :---: |
| **Total Workspace Diagnostics** | **191** | **184** | **-7** |
| `TS2305` (`Module has no exported member 'ArchitectureLayer'`) | 3 | 0 | -3 |
| `TS2459` (`Module declares 'ArchitectureLayer' locally...`) | 4 | 0 | -4 |
| Remaining Diagnostics Across Workspace | 184 | 184 | 0 |

All 7 diagnosed `ArchitectureLayer` import/export errors were completely eliminated. Zero new compiler diagnostics were introduced.

---

## 7. Parallel-Launch Clearance Decision

**CLEARANCE STATUS: `CLEARED`**

- **Agent 3 (Joint Experiments & Hybrid Geometry):** Fully cleared. The `ArchitectureLayer` type is re-exported from `src/lib/layout/global-layout.ts` and available from `src/lib/layout/types.ts`. All 44 remaining diagnostics in Agent 3's files are independent test-file fixes (e.g. mock edge `id` properties, `TS6133` unused variables).
- **Agent 4 (Forensics, Activation, Workers & Benchmarks):** Fully cleared. No shared contract block remains.
- **Import Convention for Wave 3 Agents:**
  - For global layout functions & types: `import { computeGlobalFeatureLayout, type ArchitectureLayer } from '../lib/layout/global-layout';`
  - For general layout types: `import type { ArchitectureLayer } from '../lib/layout/types';`

---

## 8. Summary of Action Items for Parallel Agents

1. **Agents 1 & 2:** May proceed with assigned scopes (36 diags across 9 files / 70 diags across 10 files).
2. **Agents 3 & 4:** May proceed with assigned scopes (41 diags across 9 files / 41 diags across 13 files).
3. **Coordinator:** Monitor parallel agent submissions and run final integration gate (`tsc --noEmit` and `npm run test:cli`).
