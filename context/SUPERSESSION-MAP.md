# Supersession Map

This document connects historical investigations, audit reports, and experimental proposals to their current authoritative replacements in source code and current-state documentation.

```text
HISTORICAL / EXPERIMENTAL REPORT                  CURRENT AUTHORITATIVE SOURCE / REPLACEMENT
════════════════════════════════                  ═══════════════════════════════════════════
P0-1 through P0-7 Discovery Audits           ──►  `context/PROJECT-OVERVIEW.md`
                                                  `context/CURRENT-ARCHITECTURE.md`

Phase 1 Architecture & Contract Design       ──►  `context/CURRENT-CONTRACTS.md`
`PHASE_1_ARCHITECTURE_AND_CONTRACT_DESIGN.md`     `explorer/src/types/explorer.ts`

Phase 2E Visualization Completion            ──►  `explorer/src/lib/adapters/`
`PHASE_2E_VISUALIZATION_COMPLETION.md`            `context/CURRENT-ARCHITECTURE.md`

Phase 2F-A State Authority Hardening        ──►  `explorer/src/context/InvestigationContext.tsx`
`PHASE_2F_A_CORE_ARCHITECTURE_STATE...`          `explorer/src/context/WorkspaceRouterContext.tsx`

Phase 2G Master Release Gate                 ──►  `context/CURRENT-DECISIONS.md`
`PHASE_2G_MASTER_RELEASE_GATE...`

Phase 3D Web Worker Offloading               ──►  `explorer/src/lib/workers/layout.worker.ts`
`PHASE_3D-1_WEB_WORKER_EVIDENCE...`               `explorer/src/test/Phase3D_WebWorkerLayout.test.ts`

Architecture Orbit C1–C11 Freeze             ──►  `explorer/src/lib/orbit-layout.ts`
`ARCHITECTURE_ORBIT_C11_FINAL_FREEZE...`          `explorer/src/lib/orbit-semantics.ts`
`ARCHITECTURE_ORBIT_C10_CLEAN_ROOM...`

SB-1C Stage 8 Corridor Placement             ──►  `explorer/src/lib/layout/centrality.ts`
`SB1C_PRODUCTION_IMPLEMENTATION...`

Constellation Projection Fix                 ──►  `explorer/src/components/GraphView.tsx`
`COMPONENT_ORBIT_CONSTELLATION_REAL...`          `explorer/src/test/static-constellation-projection.test.ts`

PBIM Project Path Correction                 ──►  `scripts/export-explorer.cjs`
`PHASE_COMP_FIX_REPAIR_PBIM...`                   `project-manifest.json`
                                                  `explorer/public/pbim/explorer-data.json`

Graph-First Investigation (UX-GFI)          ──►  `explorer/src/App.tsx`
`tasks/plan.md`                                   `explorer/src/components/CommandPalette.tsx`
`tasks/todo.md`                                   `explorer/src/components/InvestigationDrawer.tsx`
```

## Historical Milestone Status Summary

| Milestone Range | Primary Focus | Status | Current Source / Replacement |
| :--- | :--- | :--- | :--- |
| **Phase 0 (P0-1 .. P0-8)** | Discovery & Architecture Mapping | SUPERSEDED BY IMPLEMENTATION | `context/CURRENT-ARCHITECTURE.md` |
| **Phase 1 (1A, 1B, 1C)** | Contract & Adapter Design | SUPERSEDED BY CODE | `explorer/src/types/explorer.ts` |
| **Phase 2 (2A .. 2G)** | Lens Implementation & State Hardening | CURRENT IN CODE | `explorer/src/context/`, `explorer/src/lib/adapters/` |
| **Phase 3 (3A .. 3E, 3D-1)**| Worker Offloading & Scale Benchmarks | CURRENT IN CODE | `explorer/src/lib/workers/` |
| **Orbit C1 .. C11 Freeze** | Polar Orbit Geometry & Semantics | CURRENT IN CODE | `explorer/src/lib/orbit-layout.ts` |
| **SB-1A .. SB-1C** | Stage 8 2D Corridor & Density Repair | CURRENT IN CODE | `explorer/src/lib/layout/centrality.ts` |
| **UX-GFI (UX-1 .. UX-10)** | Graph-First Two-Pane UX Refinement | CURRENT IN CODE | `explorer/src/components/CommandPalette.tsx`, `InvestigationDrawer.tsx` |
| **Phase 5A .. 6B** | Causal Graph & Candidate D Experiments | HISTORICAL / EXPERIMENTAL | `context/HISTORICAL-DECISIONS.md` |
