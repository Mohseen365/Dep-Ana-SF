# Phase 3 Deliverable 10: Implementation Dependency Graph

**Audit Date:** November 2026
**Auditor:** Jules (Principal Migration & System Auditor)
**Execution Mode:** STRICTLY READ-ONLY AUDIT & VERIFICATION

---

## 1. Executive Summary

This document establishes the topological dependency graph governing all future migration waves (Waves 5 through 9) and cross-cutting capabilities. Every task is mapped to its strict prerequisites, blocking relationships, and parallelization lanes.

---

## 2. Global Wave Dependency Topological Ordering

```
                                  +-------------------------------------------------------+
                                  | WAVE 4 CLOSURE: Canonical Filters & V2 Schema Verified|
                                  +-------------------------------------------------------+
                                                              |
                                                              v
                                  +-------------------------------------------------------+
                                  | WAVE 5: Deep Graph Capabilities & Layout Activation   |
                                  | - W5-T1: Shell Layout Mode Switcher                   |
                                  | - W5-T2: Focus Controls (Upstream/Downstream)         |
                                  | - W5-T3: Impact Analysis & Blast Radius Controls      |
                                  | - W5-T4: Dynamic Node/Edge Hover Cards                |
                                  +-------------------------------------------------------+
                                                              |
                                +-----------------------------+-----------------------------+
                                |                                                           |
                                v                                                           v
+-------------------------------------------------------+   +-------------------------------------------------------+
| WAVE 6: Core Analytical Views                         |   | WAVE 7 PREREQUISITE: Apex Run Selector API            |
| - W6-T1: daRadarView (Polar Metric Polygon)           |   | - W7-P1: DAGraphController.getAnalysisRuns API        |
| - W6-T2: daTreemapView (Squarified Packing)           |   +-------------------------------------------------------+
| - W6-T3: daSubwayView (Feature Transit Routes)        |                               |
| - W6-T4: daHotspotsView (Ranked Risk Hubs)            |                               v
+-------------------------------------------------------+   +-------------------------------------------------------+
                                |                           | WAVE 7: Diagnostics, DNA & Analysis History           |
                                |                           | - W7-T1: daDiagnosticsView                            |
                                |                           | - W7-T2: daArchitectureDnaBarcode                     |
                                |                           | - W7-T3: daAnalysisHistoryPanel                       |
                                |                           +-------------------------------------------------------+
                                |                                                       |
                                +-----------------------------+-------------------------+
                                                              |
                                                              v
                                  +-------------------------------------------------------+
                                  | WAVE 8: Investigation Drawer & Snapshot Compare       |
                                  | - W8-T1: SLDS Investigation Drawer & Node Pinning     |
                                  | - W8-T2: Dual-Snapshot Paginated Payload Fetching     |
                                  | - W8-T3: Client-Side Graph Diff Engine                |
                                  | - W8-T4: daCompareView Side-by-Side Visual Diff       |
                                  +-------------------------------------------------------+
                                                              |
                                                              v
                                  +-------------------------------------------------------+
                                  | WAVE 9: Refactoring Simulation & Handoff              |
                                  | - W9-T1: In-Memory What-If Graph Mutation Sandbox     |
                                  | - W9-T2: Dynamic Blast Radius & Metric Recalculation  |
                                  | - W9-T3: Refactoring Proposal Export Modal            |
                                  +-------------------------------------------------------+
```

---

## 3. Strict Precedence Constraints & Execution Rules

1. **Rule DEP-01 (Wave 5 Layout Activation as Root):** Wave 5 does NOT require new Apex or data model changes. It directly consumes existing, tested methods in `daLayoutEngine.js` (`computeOrbitLayout`, `computeConstellationLayout`, `computeSankeyLayout`). It must execute first.
2. **Rule DEP-02 (Wave 6 Parallelization):** Wave 6 analytical views (`radar`, `treemap`, `subway`, `hotspots`) are purely client-side consumers of the existing canonical graph payload. Once Wave 5 activates layout switching, Wave 6 view components can be developed in parallel feature lanes.
3. **Rule DEP-03 (Wave 7 Apex Gate):** Wave 7 Task W7-T3 (`daAnalysisHistoryPanel`) has a hard dependency on prerequisite `W7-P1` (`DAGraphController.getAnalysisRuns(Id projectId)`). Task W7-T3 cannot be marked complete until W7-P1 is implemented, tested, and deployed with user-mode security.
4. **Rule DEP-04 (Wave 8 Dual Payload Prerequisite):** Wave 8 (`daCompareView`) depends on W7-P1 to retrieve metadata for two separate runs, followed by invoking `getGraphChunks` for each run. It also depends on Wave 5 focus/highlight mechanics to illustrate added and deleted nodes.
5. **Rule DEP-05 (Wave 9 Sandbox Invariance):** Wave 9 requires a deep clone sandbox of the graph payload to prevent in-memory mutation from contaminating other views or triggering accidental Apex persistence.
