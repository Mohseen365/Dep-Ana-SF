# Audit Reconciliation Ledger

This reconciliation ledger documents the verification findings, verdicts, evidence, and actions for identified repository issues based on `solved_issues.md` and `Remediation Playbook for solved_issues.md`.

## Stage 0 & Missing-File Prerequisite Audit Reconciliation

| Issue ID | Verdict | Evidence | Action | Related aliases |
|---|---|---|---|---|
| `#1` / `L2` | `false alarm` | `explorer/src/components/GraphView.tsx` lines 322, 329, 1605 (`onFocusChangeRef` is declared via `useRef` and synced via `useEffect`) | Strike from fix plan | `L2`, `#1`, `#20`, `Z2` (part) |
| `[!] graph-builder.ts` (Data Types) | `false alarm` | `explorer/src/lib/graph-builder.ts` lines 102-106, 145 (`isTest: Boolean(...)`, `hasCycles`, `hasUnresolved`, `unresolved` are booleans) | Document boolean status in builder | `D4`, `D28`, `T10` |
| `[!] graph-builder.ts` (Element IDs) | `exists` | `explorer/src/lib/graph-builder.ts` lines 96, 140 (`data.id` set to `node.id` / `edge.id`) | Keep | `#3`, `D11`, `D30` |
| `[!] graph-builder.ts` (Edge Relationship) | `exists` | `explorer/src/lib/graph-builder.ts` line 144 (`relationshipType: edge.relationshipType`) | Keep | `D11`, `T10` |
| `[!] layout-worker-client.ts` (Cancellation) | `exists` | `explorer/src/lib/workers/layout-worker-client.ts` line 77 (`cancelPendingRequest()`) | Keep | `D9` |
| `[!] layout-worker-client.ts` (Timeout) | `does not exist` | `explorer/src/lib/workers/layout-worker-client.ts` (no 10s timer; falls back synchronously on error) | Add explicit timeout in worker phase | `D10` |
| `[!] layout-worker-client.ts` (Set Conversion) | `exists` | `explorer/src/lib/workers/layout-worker-client.ts` line 258 (`new Set(response.projectedNodeIds)`) | Keep | `D19` |
| `[!] layout-worker-client.ts` (Error Fallback) | `exists` | `explorer/src/lib/workers/layout-worker-client.ts` lines 262-297 (`errorHandler` triggers synchronous fallback) | Keep | `D10`, `D19` |
| `[!] graph-depth.ts` (Focal Depth) | `exists` | `explorer/src/lib/graph-depth.ts` line 125 (`depthMap.set(focusNodeId, 0)`) | Keep | `R6`, `R7`, `R8` |
| `[!] graph-depth.ts` (Reachable Nodes) | `exists` | `explorer/src/lib/graph-depth.ts` line 171 (`reachableNodeIds = Array.from(depthMap.keys())`) | Keep | `R7`, `R8`, `K1` |
| `[!] graph-depth.ts` (Reachable Edges) | `exists` | `explorer/src/lib/graph-depth.ts` line 183 (`depthMap.has(edge.source) && depthMap.has(edge.target)`) | Keep | `R8` |
| `[!] constellation-layout.ts` (PBIM Path) | `false alarm` | `explorer/src/lib/layout/constellation-layout.ts` and `component-constellation-layout.ts` (pure functions with dynamic options) | Strike static PBIM hardcoding claim | `K30` |
| `[!] WorkspaceShell.tsx` (Callbacks) | `exists` | `explorer/src/components/workspace/WorkspaceShell.tsx` and `ActiveWorkspaceRenderer.tsx` (passes modes and state to `GraphView`) | Keep | `C3`, `C7` |
| `Z1` | `exists` | `explorer/src/App.tsx` lines 145-165 (URL selection sync without edge trigger can loop with filters) | Fix in Phase 6 / Stage 0 | `Z1` |
| `Z2` | `exists` | `explorer/src/App.tsx` lines 368-380 & `explorer/src/components/GraphView.tsx` lines 1580-1607 (Escape key handler lacks input/editable element guards) | Implement Stage 0 fix | `Z2`, `O7`, `O21`, `O31` |
| `Z37` | `exists` | `explorer/src/components/GraphView.tsx` line 653 (`window.__LAST_LAYOUT_COMPLETED__` set unconditionally without dev/debug gate) | Implement Stage 0 fix | `Z37`, `O16` |
| `Z38` | `exists` | `explorer/src/components/GraphView.tsx` lines 953-959 & 1228-1230 (`window.__LAYOUT_MODULE__` not deleted on unmount) | Implement Stage 0 fix | `Z38` |
| `Z39` | `exists` | `explorer/src/components/GraphView.tsx` lines 68-76 (`window.__CURRENT_CORRELATION_TOKEN__` setter is publicly writable without auth) | Implement Stage 0 fix | `Z39` |
| `Z40` | `exists` | `explorer/src/App.tsx` lines 406-409 (`BroadcastChannel` `onDetachedDrill` selects `nodeId` without checking active graph nodes) | Implement Stage 0 fix | `Z40` |
| `Z41` | `exists` | `explorer/src/App.tsx` lines 386-391 (`handleDetach` sets `drawerDetached: true` even when `openDetachedWindow()` returns `null`) | Implement Stage 0 fix | `Z41` |
| `A44` | `exists` | `explorer/src/lib/architecture-layout.ts` lines 600-614 (no dev check verifying `resultPositions` length equals `safeNodes` length) | Implement Stage 0 fix | `A44` |
| `Z46` | `exists` | `explorer/src/test/` (no test covers `extractNodesAndEdgesFromCy` round-trip extraction) | Implement Stage 0 test | `Z46`, `D3`, `T2` |
