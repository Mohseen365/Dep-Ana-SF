# Phase 3 Deliverable 7: Functional & Architectural Gap Report

**Audit Date:** November 2026
**Auditor:** Jules (Principal Migration & System Auditor)
**Execution Mode:** STRICTLY READ-ONLY AUDIT & VERIFICATION

---

## 1. Executive Summary

This report establishes the complete, unvarnished remaining functional, architectural, integration, data, and security gaps across the Dependency Analyzer migration into Salesforce.

### 1.1 Key Findings Summary
1. **Views Migration Gap:** Exactly **3 of 18 registered views** are mounted and functional in the Salesforce UI (`graph`, `matrix`, `findings`). 3 views have layout math ported into `daLayoutEngine.js` (`constellation`, `river`/Sankey, `radar`) but lack UI mounting. The remaining **12 views** have zero representation in Salesforce.
2. **Missing Apex Controller Query Endpoint:** `DAGraphController.cls` currently implements `getGraphChunks` for active project analysis runs, but lacks a dedicated `getAnalysisRuns(String projectId)` selector to support historical run browsing or dual-snapshot diff loading. This represents a critical blocker for Wave 7 (History) and Wave 8 (Compare).
3. **Graph Interaction Deficits:** While single-node selection and Cytoscape mounting are verified, the Salesforce graph viewer lacks hover cards, edge selection, multi-node selection, upstream/downstream focus traversal, and blast radius highlighting.
4. **Investigation & Refactoring Workflows Absent:** The React application features sophisticated multi-node pinning in an investigation drawer and what-if refactoring simulations. Neither workflow has been scaffolded in Salesforce.

---

## 2. Workspace View & Lens Gaps

The original application registers 18 workspace views (`explorer/src/registry/workspace-registry.ts`).

| View Identifier | Category | Target Component | Status | Missing Capabilities |
|---|---|---|---|---|
| `graph` | Lens (Topological) | `c/daGraphViewer` | PARTIALLY_IMPLEMENTED | Hover cards, edge selection, path mode, focus neighborhood expansion. |
| `matrix` | Lens (Topological) | `c/daMatrixView` | PARTIALLY_IMPLEMENTED | Anchor node jumping, coupling sort toggles. |
| `findings` | Surface (Architectural) | `c/daFindingsView` | PARTIALLY_IMPLEMENTED | Deep investigation drawer integration, full AST rules. |
| `constellation` | Lens (Neighborhood) | `c/daLayoutEngine` (algo only) | PORTED_NOT_INTEGRATED | Shell switcher, radial polar UI view. |
| `river` | Lens (Feature) | `c/daLayoutEngine` (algo only) | PORTED_NOT_INTEGRATED | Sankey streamgraph SVG rendering, layer interaction toggles. |
| `radar` | Lens (Neighborhood) | `c/daLayoutEngine` (algo only) | PORTED_NOT_INTEGRATED | Multi-axis spider chart renderer. |
| `dashboard` | Surface (Overview) | None | NOT_IMPLEMENTED | Project health overview, run cards, risk gauges. |
| `compare` | Surface (Temporal) | None | NOT_IMPLEMENTED | Dual snapshot diff engine, visual additions/removals. |
| `history` | Surface (Temporal) | None | NOT_IMPLEMENTED | Timeline browser of past runs, run metadata inspection. |
| `subway` | Lens (Topological) | None | NOT_IMPLEMENTED | Metro transit route layout & interchange stations. |
| `tree` | Lens (Hierarchical) | None | NOT_IMPLEMENTED | Component directory tree with nested metrics. |
| `treemap` | Lens (Hierarchical) | None | NOT_IMPLEMENTED | Squarified treemap packing by complexity/size. |
| `heatmap` | Lens (Feature) | None | NOT_IMPLEMENTED | 2D structural coupling heat-intensity map. |
| `dna` | Lens (Feature) | None | NOT_IMPLEMENTED | Visual barcode strips colored by risk. |
| `profile` | Lens (Neighborhood) | None | NOT_IMPLEMENTED | Component afferent/efferent metric card. |
| `four-direction` | Lens (Neighborhood) | None | NOT_IMPLEMENTED | Cardinal direction (N/S/E/W) dependency expansion. |
| `hotspots` | Surface (Risk) | None | NOT_IMPLEMENTED | Ranked structural risk hubs list. |
| `diagnostics` | Surface (Integrity) | None | NOT_IMPLEMENTED | System health breakdown and broken link validation. |

---

## 3. Architectural & Data Model Gaps

### 3.1 Historical Run Querying Architecture
- **Current Apex State:** `DAGraphController.cls` retrieves chunks for the latest run of a project using `LIMIT 1` order by created date.
- **Architectural Gap:** To support Wave 7 (History) and Wave 8 (Compare), an Apex API must expose:
  ```apex
  @AuraEnabled(cacheable=true)
  public static List<DA_Analysis_Run__c> getAnalysisRuns(Id projectId)
  ```
  with user-mode security (`WITH USER_MODE`), appropriate pagination, and error wrapping.

### 3.2 Dual-Snapshot Graph Memory Isolation
- In Wave 8 (Compare), the LWC shell will need to fetch two independent runs (`Run A` and `Run B`).
- **Gap:** Loading two large graph payloads (~10 MB each) into browser memory creates client-side heap pressure. A dedicated client-side diff generator that computes differences without holding two full Cytoscape instances simultaneously is required.

### 3.3 Security & CRUD/FLS Enforcement
- Offline test suites verify user isolation and object permissions statically.
- **Org Verification Limitation:** Live Salesforce org deployment and end-to-end security verification against actual standard profiles remain explicitly deferred.
