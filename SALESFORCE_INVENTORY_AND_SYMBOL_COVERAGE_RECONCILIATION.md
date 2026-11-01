# Salesforce Inventory and Symbol Coverage Reconciliation
## Phase 2: Independent Cross-Report Consistency, Evidence & Completeness Audit

**Audit Date:** November 2026
**Auditor:** Jules (Principal Migration & System Auditor)
**Execution Mode:** STRICTLY READ-ONLY
**Authoritative Baseline Commit:** `f239696a567c85a12534bfbd393ff3cd3aa4025d`

---

## 1. Independent File-Count Reconciliation

We conducted an exhaustive physical scan of all files in the repository across the three relevant trees:
1. `explorer/src/` (Original React/TypeScript Application)
2. `scratch/salesforce-poc/force-app/main/default/` (Target Salesforce Implementation)
3. `scripts/` (Node.js Analysis Engine, CLI, and Pipeline Adapters)

### 1.1 Original React Application Files (`explorer/src/`)
- **Total Physical Files in `explorer/src/`:** 576 files
  - `.ts` files: 398
  - `.tsx` files: 168
  - `.css` files: 4
  - `.json` files: 5
  - `.html` files: 1
- **Excluded Non-Production Files (391 files):**
  - Unit tests and test helpers (`*.test.ts`, `*.test.tsx`, `*.spec.ts`): 142 files
  - Test suites and benchmarks (`explorer/src/test/`, `benchmarks/`): 96 files
  - Mock fixtures and synthetic datasets (`fixtures/`, `__mocks__/`): 84 files
  - Spike prototypes and experimental files (`spike/`, `prototypes/`): 42 files
  - Pure TypeScript type wrappers / declaration shims (`*.d.ts`): 27 files
- **Net Eligible Production Source Files:** **185 files** (100% match with `baseline_counts.json["prodExplorerFiles"]` and `SALESFORCE_FILE_BY_FILE_MIGRATION_GAP_MATRIX.csv`).

### 1.2 Salesforce Target Artifacts (`scratch/salesforce-poc/force-app/main/default/`)
- **Total Physical Files under target default directory:** 88 files
- **Excluded Target Test Files (8 files):**
  - Apex Test Classes (`classes/tests/`): 4 `.cls` files (`DAAnnotationControllerTest.cls`, `DAGraphControllerTest.cls`, `DAGraphSecurityTest.cls`, `DAUserPreferenceControllerTest.cls`)
  - Apex Test Metadata: 4 `.cls-meta.xml` files
- **Reported "Production Artifacts":** **80 files** (100% match with `baseline_counts.json["prodSfFiles"]`).

#### Critical Decomposition of the 80 Salesforce Artifacts:
To avoid the misleading assumption that 80 functional code files have been written, we decompose the 80 artifacts into their architectural categories:
| Category | File Count | Extensions / Types | Description & Operational Role |
|---|---|---|---|
| **Executable Apex Code** | 8 | `.cls` | Server controllers, chunk services, ingestion services, DTOs |
| **Executable LWC / Static JS** | 12 | `.js` | Client-side controllers, layout engine, filter schema, Cytoscape lib |
| **Presentation Templates** | 8 | `.html` | LWC component markup templates |
| **Component Stylesheets** | 7 | `.css` | LWC component styles |
| **Platform Metadata XML** | 45 | `.xml` | `.cls-meta.xml` (8), `.js-meta.xml` (9), `.resource-meta.xml` (1), `CustomObject` (4), `CustomField` (23) |
| **Total** | **80** | — | **Only 20 files (25%) are executable logic (Apex + JS)** |

### 1.3 Node.js Pipeline & Adapter Scripts (`scripts/`)
- **Total Physical Files in `scripts/`:** 128 files
  - `.cjs` CommonJS scripts: 114
  - `.ts` TypeScript scripts: 7
  - `.json` benchmark manifests: 4
  - `.cls` Apex deployment utility scripts: 2
  - `.mjs` ES module script: 1
- **Net Pipeline Scripts:** **128 scripts** (100% match with `baseline_counts.json["scriptFiles"]`).
- **Architectural Designation:** These scripts represent the Node.js analysis engine, CLI tooling, export adapters, and forensic audit harnesses. They are **intentionally external** to Salesforce and must not be counted as missing LWC functionality.

---

## 2. Symbol-Count Reconciliation

### 2.1 AST Extraction Breakdown (`extracted_symbols.json`)
The AST symbol extractor analyzed all 185 eligible production files in `explorer/src/`, identifying:
- **Total Public Exported Symbols:** **874 distinct symbols**
- Breakdown by Symbol Type:
  - Functions / Custom Hooks: 312
  - Interfaces / Type Aliases: 278
  - Classes / Components: 164
  - Constants / Enums / Data Registries: 120

### 2.2 Symbol Matrix Verification (`SALESFORCE_SYMBOL_LEVEL_MIGRATION_MATRIX.csv`)
The symbol matrix contains exactly 874 rows, perfectly matching the 874 extracted symbols:
- **`NOT_MIGRATED`:** 848 symbols (97.03%)
- **`FULLY_MIGRATED`:** 13 symbols (1.49%)
  - Filter state management: `FilterUIState`, `SearchFilterState`, `FilteredGraphData`, `applyFilters`, `hasActiveFilters`, `createEmptyFilterState`, `SelectFilteredGraphOptions`, `selectFilteredGraph`, `ViewAndFilterQueryState`, `FilterQueryState`, `QuickFilterPreset`, `SearchFilterPanel`, `computeArchitectureLayout`
- **`PARTIALLY_MIGRATED`:** 10 symbols (1.14%)
  - Matrix view: `FeatureMatrixPanelProps`, `FeatureMatrixPanel`
  - Findings view: `FindingsPanelProps` (2), `StatusFilterOption` (2), `FindingsPanel` (2), `getWhyItMatters`, `getWhatToDoNext`
- **`PORTED_NOT_INTEGRATED`:** 3 symbols (0.34%)
  - Disconnected layout algorithms: `computeConstellationLayout`, `computeSankeyLayout`, `computeOrbitLayout`
- **Total Rows:** 874

---

## 3. Cross-Matrix Classification Discrepancies (24 Instances)

Cross-checking `SALESFORCE_FILE_BY_FILE_MIGRATION_GAP_MATRIX.csv` against `SALESFORCE_SYMBOL_LEVEL_MIGRATION_MATRIX.csv` identified 24 distinct divergences where a file is assigned one classification but its exported symbols are assigned another:

| # | Source File | File Matrix Classification | Symbol Matrix Classifications | Root Cause & Resolution |
|---|---|---|---|---|
| 1 | `src/components/FindingsPanel.tsx` | `NOT_MIGRATED` | `PARTIALLY_MIGRATED` (3 symbols) | File matrix missed `daFindingsView` mounting. Resolve to `PARTIALLY_MIGRATED`. |
| 2 | `src/components/ProjectSelector.tsx` | `FULLY_MIGRATED` | `NOT_MIGRATED` (all symbols) | Symbol matrix failed to map symbols to `daProjectSelector.js`. Resolve symbols to `FULLY_MIGRATED`. |
| 3 | `src/components/SearchFilterPanel.tsx` | `NOT_MIGRATED` | `FULLY_MIGRATED` (2 symbols) | File matrix evaluated UI panel; symbol matrix evaluated preset logic. Resolve file to `PARTIALLY_MIGRATED`. |
| 4 | `src/lib/architecture-layout.ts` | `NOT_MIGRATED` | `FULLY_MIGRATED` (1 symbol) | Layout algorithm is ported in `daLayoutEngine.js`. Resolve file to `FULLY_MIGRATED`. |
| 5–16 | 12 files under `src/lib/intelligence/` | `PARTIALLY_MIGRATED` | `NOT_MIGRATED` (all symbols) | Files were credited because `daFindingsView` calculates basic metrics; however, AST rule classes were never ported. Resolve files to `NOT_MIGRATED` and classify finding view as a simplified native derivation. |
| 17–19 | 3 layout helper files (`component-constellation`, `component-orbit`, `orbit-semantics`) | `PORTED_NOT_INTEGRATED` | `NOT_MIGRATED` (all symbols) | Helpers were absorbed into monolithic `daLayoutEngine.js`. Resolve symbols to `PORTED_NOT_INTEGRATED`. |
| 20 | `src/lib/orbit-layout.ts` | `NOT_MIGRATED` | `PORTED_NOT_INTEGRATED` (1 symbol) | `computeOrbitLayout` is ported in `daLayoutEngine.js`. Resolve file to `PORTED_NOT_INTEGRATED`. |
| 21 | `src/lib/projectState.ts` | `NOT_MIGRATED` | `FULLY_MIGRATED` (1 symbol) | Filter preference state is migrated into `daPresetManager` and Apex. Resolve file to `PARTIALLY_MIGRATED`. |
| 22 | `src/lib/search-filter.ts` | `NOT_MIGRATED` | `FULLY_MIGRATED` (5 symbols) | Filter logic functions are migrated in `daPresetManager.js`. Resolve file to `PARTIALLY_MIGRATED`. |
| 23 | `src/lib/selectors/index.ts` | `NOT_MIGRATED` | `FULLY_MIGRATED` (2 symbols) | Filter graph selection logic is migrated in `daPresetManager.js`. Resolve file to `PARTIALLY_MIGRATED`. |
| 24 | `src/lib/url/filterQuery.ts` | `NOT_MIGRATED` | `FULLY_MIGRATED` (2 symbols) | Filter query state schema is migrated in `daPresetManager.js`. Resolve file to `PARTIALLY_MIGRATED`. |

---

## 4. Unmapped Symbols and False Completions

1. **Unmapped Symbols:** 848 of 874 symbols (97.0%) have no target in Salesforce. They belong to unmigrated views (Subway, Treemap, Radar, Heatmap, River, Tree, DNA, Dashboard, Compare, History, Hotspots, Diagnostics) and unmigrated workflows (Refactoring Simulation, Investigation Drawer, Command Palette).
2. **False Completion Warning:** `daLayoutEngine.js` exports 4 layout functions, but only 1 (`computeArchitectureLayout`) is called in the application. Calling code complete because an algorithm exists in a utility file without UI integration is a false completion. The 3 unused layout algorithms must remain classified as `PORTED_NOT_INTEGRATED`.
