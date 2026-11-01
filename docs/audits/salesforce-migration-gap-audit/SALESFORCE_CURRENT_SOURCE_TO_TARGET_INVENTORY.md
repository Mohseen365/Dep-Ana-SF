# Report 1: Salesforce Current Source-to-Target Inventory

**Audit Date:** November 2026
**Auditor:** Jules (Principal Migration & System Auditor)
**Execution Mode:** Read-Only Audit
**Repository Branch:** `jules-8940420582489403863-fc73d2e4`
**HEAD Commit:** `f239696a567c85a12534bfbd393ff3cd3aa4025d`

---

## 1. Executive Summary & Inventory Scope

This report provides the authoritative baseline inventory of all eligible original Dependency Analyzer production assets versus the current Salesforce target assets.

- **Original React Application Production Files:** 185 source files (under `explorer/src/`, excluding tests, mock fixtures, spikes, and `.d.ts` declaration wrappers).
- **Public Exported Symbols in Original Application:** 874 distinct functions, classes, interfaces, hooks, and constants.
- **Current Salesforce Target Production Artifacts:** 80 production source files (under `scratch/salesforce-poc/force-app/main/default/`, excluding offline test runners).
- **Node.js Pipeline & Adapter Scripts:** 128 production scripts (under `scripts/`).

---

## 2. Original Source Breakdown by Architecture Layer

| Layer / Directory | File Count | Primary Functional Responsibility |
|---|---|---|
| `src/components/workspace/` | 14 | Top-level workspace shell, header, active workspace renderer, navigation bars |
| `src/components/findings/` | 12 | Architectural alerts, rule findings list, finding detail drawers |
| `src/components/graph-internals/` | 18 | Cytoscape integration, canvas hooks, edge styling, node styling |
| `src/components/panels/` | 24 | Drawer panels, inspector panels, compare panels, command palettes |
| `src/components/` (Root) | 32 | View panels (Subway, Constellation, Treemap, Matrix, Heatmap, Radar, etc.) |
| `src/hooks/` | 16 | React custom hooks (navigation, selection, command palette, shortcuts, search) |
| `src/context/` | 8 | React context providers (Investigation, ProjectState, WorkspaceRouter, Selection) |
| `src/lib/layout/` | 22 | Graph layout computation engines (Architecture, Orbit, Constellation, River, etc.) |
| `src/lib/intelligence/` | 14 | Architecture rule engine, static analysis rule evaluators |
| `src/lib/adapters/` | 12 | Visual data transformation adapters for specialized view models |
| `src/lib/router/` | 4 | Workspace domain routing, lens definitions, view mode state |
| `src/lib/url/` | 4 | URL serialization, deep linking, query parameter synchronization |
| `src/types/` | 12 | TypeScript domain contracts, view mode enums, graph data models |

---

## 3. Salesforce Target Breakdown

| Target Directory / Component | Artifact Count | Production Role & Status |
|---|---|---|
| `lwc/daAppShell` | 4 (`.js`, `.html`, `.css`, `-meta.xml`) | Central coordinator shell, project selection, tab switching (3 views) |
| `lwc/daGraphViewer` | 4 (`.js`, `.html`, `.css`, `-meta.xml`) | Cytoscape graph canvas, node selection, hierarchical layout |
| `lwc/daMatrixView` | 4 (`.js`, `.html`, `.css`, `-meta.xml`) | Dependency matrix view, cell selection, filter criteria binding |
| `lwc/daFindingsView` | 4 (`.js`, `.html`, `.css`, `-meta.xml`) | Findings view, category filtering, client-side derivation |
| `lwc/daPresetManager` | 4 (`.js`, `.html`, `.css`, `-meta.xml`) | Canonical filter criteria & preset management, project scoping |
| `lwc/daProjectSelector` | 4 (`.js`, `.html`, `.css`, `-meta.xml`) | Project dropdown selector |
| `lwc/daAnnotationPanel` | 4 (`.js`, `.html`, `.css`, `-meta.xml`) | Node annotation CRUD drawer |
| `lwc/daGraphPayloadLoader` | 4 (`.js`, `.html`, `.css`, `-meta.xml`) | Headless payload retrieval adapter |
| `lwc/daLayoutEngine` | 3 (`.js`, `.js-meta.xml`, `.css`) | Layout calculations (`classifyNodeLayer`, `computeArchitectureLayout`, etc.) |
| `lwc/graphViewer` | 3 (`.js`, `.html`, `-meta.xml`) | Legacy POC graph component (superseded by `daGraphViewer`) |
| `classes/controllers/` | 6 (`.cls`, `-meta.xml`) | `DAGraphController`, `DAUserPreferenceController`, `DAAnnotationController` |
| `classes/services/` | 4 (`.cls`, `-meta.xml`) | `DAGraphChunkService`, `DAGraphIngestionService` |
| `classes/dto/` | 4 (`.cls`, `-meta.xml`) | `DAGraphDTO`, `DAErrorResponse` |
| `objects/` | 24 (Custom Object & Field XMLs) | 6 Custom Objects (`DA_Project__c`, `DA_Analysis_Run__c`, `DA_Graph_Chunk__c`, `DA_User_Preference__c`, `DA_Annotation__c`, `DA_Finding__c`) |

---

## 4. Boundary Classifications

1. **Intentionally External (Node.js Analysis Engine):** Filesystem traversal, AST parsing, and dependency extraction are executed in Node.js scripts (`scripts/`).
2. **Salesforce Apex / Metadata:** High-watermark chunked persistence, user preference management, annotation storage, and secure CRUD/FLS query selectors.
3. **Salesforce LWC:** Client-side analytical visualizations, reactive filter management, and layout presentation.
