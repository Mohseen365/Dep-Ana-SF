# Jules Context — Graph-First Investigation (UX-GFI)

## Where things live

- Plan: `tasks/plan.md`
- Task list: `tasks/todo.md`
- Explorer app root: `explorer/`
- Cross-session invariants: top of `tasks/todo.md`

## The one-paragraph brief

The Explorer is a React + Vite + Cytoscape app under `explorer/`. It reads
`explorer-data.json` (schema v1.0.0) and renders a dependency graph.
The Graph-First Investigation track converts it from a
dashboard-of-panels into a two-pane graph-first app: full-canvas graph
by default, Investigation Drawer on node click, Cmd+K palette hosting
all former permanent panels. Ten prompts (UX-1 … UX-10) drive the work.

## Hard rules (repeat in every session)

1. Do not touch `dependency-analyzer.cjs` or any `*.cjs` file.
2. Do not touch `explorer-contract.ts`.
3. Do not touch anything under `explorer/src/lib/intelligence/`.
4. Do not edit panel internals — mount/unmount only.
5. Run `cd explorer && npm test` and `cd explorer && npm run build`
   before declaring done (unless the prompt says otherwise).
6. Verify the prompt's STOP condition before reporting completion.
   If it fails, halt; do not improvise.
7. Before starting, read the Session Log at the bottom of
   tasks/todo.md. If the previous session's STOP condition was
   not verified, halt and report before proceeding.

## Standard commands

```bash
cd explorer && npm test                     # full test suite
cd explorer && npm test -- <pattern>        # focused tests
cd explorer && npm run build                # tsc + vite build
cd explorer && npm run dev                  # dev server
```

## Repo map (relevant subset)

explorer/
├─ public/explorer-data.json # data input (read-only)
├─ src/
│ ├─ App.tsx # layout root (edited frequently)
│ ├─ index.css # app shell CSS
│ ├─ components/ # panels + graph + (new) drawer
│ │ ├─ GraphView.tsx
│ │ ├─ InvestigationDrawer.tsx # new in UX-3, grown in UX-4/10
│ │ ├─ CommandPalette.tsx # new in UX-6, extended in UX-7
│ │ ├─ DetailsPanel.tsx # deleted in UX-8
│ │ └─ … (panels — never edit internals)
│ ├─ hooks/
│ │ └─ useViewState.ts # edited in UX-2
│ ├─ lib/
│ │ ├─ url/ # 5 modules deleted in UX-2
│ │ ├─ drill.ts # new in UX-4
│ │ ├─ detached-drawer.ts # new in UX-10
│ │ ├─ graph-interactions.ts # extended in UX-5
│ │ └─ intelligence/ # DO NOT TOUCH
│ ├─ types/explorer.ts # read-only
│ └─ test/fixtures/ # reuse for tests
└─ public/detached.html # new in UX-10

## If the prompt is ambiguous

Ask. Do not guess at scope. If the ambiguity involves anything on the
"MUST NOT modify" list, refuse and report the ambiguity instead of
proceeding.

## Session log convention

At the end of every session, append a line to the "Session Log" section
of tasks/todo.md:

text

<session-id> | UX-N | Tasks X.Y, X.Z | <ISO timestamp> | <short notes>
Check off completed tasks. Leave in-progress tasks unchecked with a
note about remaining work.

text

---
