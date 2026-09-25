# Hybrid Layout Fix — Agent Delivery Package

This folder contains 7 self-contained prompt files. Each one is a complete, standalone
instruction set for a coding agent. The agent only needs to read `AGENT.md` first (as
instructed in each prompt), then follow the steps exactly.

**Do not run prompts in parallel. Run them strictly in order 01 → 07.**
Each prompt builds on the previous one. Running them out of order will produce
incorrect results or test failures.

---

## Prompt index

| File | Issue fixed | Key files changed | Visual result |
|---|---|---|---|
| `PROMPT_01_2D_PACKING.md` | 1D strip → 2D grid | `global-layout.ts` | Layout collapses from 5,880 px wide strip to ~2,400 px compact grid |
| `PROMPT_02_FEATURE_Y_SPACING.md` | Empty vertical gaps inside features | `global-layout.ts` | Feature boxes become compact, no wasted vertical space |
| `PROMPT_03_SATELLITES_AND_SPACING.md` | Dangling satellite column + node drift | `satellites.ts`, `architecture-layout.ts` | Field/test nodes snap inside their feature regions |
| `PROMPT_04_ORDERING_AND_CROSSINGS.md` | Feature order ignores connectivity + wrong crossing geometry | `feature-ordering.ts`, `ordering.ts`, `architecture-layout.ts` | Connected features appear adjacent in the grid; crossing reduction more accurate |
| `PROMPT_05_EDGE_DIFFERENTIATION.md` | All edges look identical | `graph-builder.ts`, `graph-style.ts`, `GraphView.tsx` | Intra-feature edges thin/muted; inter-feature edges dashed/prominent |
| `PROMPT_06_ZOOM_EDGE_OPACITY.md` | Solid edge web at overview zoom | `graph-style.ts` | Edge web fades at far zoom; cross-feature edges remain visible |
| `PROMPT_07_OVERLAY_POLISH.md` | Raw IDs as labels + boxes hidden at far zoom | `FeatureOverlayCanvas.tsx` | Human labels (e.g. "Cloud Spend"); thin outlines always visible |

---

## Regression gate — run after EVERY prompt

```bash
npx vitest run explorer/src/lib/layout/baseline-snapshot.test.ts
npx vitest run explorer/src/lib/layout/evaluate-layout.test.ts
npx vitest run explorer/src/test/Phase12HybridActivation.test.ts
```

All must pass. Required invariants on the canonical Cloud Spend Tracker fixture
(`enableFeatureLayout: true`, 240 nodes, 1,024 edges):

| Metric | Required value |
|---|---|
| Primary node overlaps | **0** |
| Layer violations | **0** |
| Primary-primary crossings (`Cpp`) | **≤ 8,704** |
| Total crossings (`Ctotal`) | **≤ 94,662** |
| Coordinate drift (5× shuffled inputs) | **0.00000 px** |
| Minimum node clearance | **≥ 40.0 px** |

If any test fails after a prompt, **do not proceed to the next prompt**.
Fix the failing test first, then re-run the full gate.

---

## Protected files — never modify these

```
explorer/src/lib/position-policy.ts
explorer/src/lib/focus-graph.ts
explorer/src/lib/layout/centrality.ts
explorer/src/lib/layout/feature-composition.ts
explorer/src/lib/graph-style.ts          ← modified only in PROMPT 05 and 06
explorer/src/lib/projectState.ts
audit-fixtures/cloud-spend-tracker/explorer-data.json
audit-reports/**
audit-evidence/**
```

---

## Canonical context navigation

Every prompt includes its own context retrieval path starting from `AGENT.md`.
The relevant authoritative sources are:

```
AGENT.md
  ├── 02_Layout_Engine_Spatial.md          (pipeline architecture, Stage references)
  ├── 03_UI_UX_Interaction.md              (visual/UX context)
  ├── CURRENT-STATE-BASELINE.md            (project state orientation)
  ├── audit-reports/features/
  │     FEAT-LAYOUT-report-v2.md           (canonical metrics, Candidate E invariants)
  │     FEAT-FEATURE-report-v2.md          (feature discovery & 2D geometry)
  └── audit-reports/gap-fill/
        AUD-UIUX-001-report.md             (UI/UX requirements)
```

---

## What the graph should look like after all 7 prompts

```
zoom 0.3 (overview)
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│          │ │          │ │          │ │          │  ← thin blue region outlines
│  · ·     │ │  · ·     │ │  ·       │ │  · ·     │  ← node dots, no labels
└──────────┘ └──────────┘ └──────────┘ └──────────┘
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│          │ │          │ │          │ │  Shared  │
│  ·  ·    │ │  · ··    │ │  ·  ·    │ │  utils   │
└──────────┘ └──────────┘ └──────────┘ └──────────┘
 faint gray intra-feature edges; dashed inter-feature edges visible

zoom 0.8 (navigate)
┌─ Cloud Spend ──┐ ┌─ Spend Import ─┐ ┌─ User Org Role ─┐
│  ● ●  ●        │ │  ●  ●●          │ │  ●              │
│    ●●           │ │    ●            │ │  ●●  ●          │
└────────────────┘ └─────────────────┘ └─────────────────┘
 labels visible, 45% opacity edges, dashed cross-feature edges prominent

zoom 1.5 (inspect)
Full node labels, edge labels on hover, full opacity, all feature box labels readable
```
