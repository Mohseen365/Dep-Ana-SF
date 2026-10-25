# Remediation Playbook for solved\_issues.md

*Execution guide for a coding agent. Every task points to exact line ranges in `solved_issues.md` (6,778 lines), so you can open the full analysis, then apply the fix.*

## 1. How to use this playbook

**Source file:** `solved_issues.md` (called SRC below). Adjust the path to wherever it sits in your repo.

**Print any issue section by ID** (works for every ID in this doc; the first audit uses plain numbers, so `show 1` prints issue #1):

```bash
show() { awk -v id=$1 'f&&/^#+ /{exit} index($0,"### " id ". ")==1{f=1} f' solved_issues.md; }
show D6      # prints the whole D6 section
show Z1
show 4       # issue #4 from the first audit
```

Or print by line range: `sed -n '1443,1483p' solved_issues.md`.

**ID legend** (the file has 10 audit blocks, each with its own ID prefix):

| Prefix | Block | SRC lines | Priority table at |
| --- | --- | --- | --- |
| #1-#22 | First audit (GraphView, graph-style, graph-layout, misc) | 1-232 | none |
| C, H, M, L | Cluster 1: Trigger and Persistence | 234-582 | checklist 571-583 |
| O1-O38 | Cluster 2: GraphView orchestration | 584-1252 | 1235-1253 |
| D1-D30 | Cluster 3: Dispatch (graph-layout, architecture-layout) | 1254-1923 | 1875-1924 |
| R1-R30 | Cluster 4: Focused Orbit | 1925-2546 | 2528-2547 |
| K1-K30 | Cluster 5: Multi-Sun Constellation | 2548-3146 | 3129-3147 |
| A1-A51, X1-X4 | Cluster 6: Layered Architecture | 3148-4223 | 4200-4224 |
| T1-T30 | Cluster 7: Shared Contract (`explorer.ts`) | 4225-5026 | 4966-5000 |
| V1-V28 | Cluster 8: Test Suite audit | 5028-5688 | 5667-5689 |
| Z1-Z52 | Cluster 9: Remaining files | 5690-6778 | 6754-6778 |

**Known inconsistency in SRC:** some cross-references are wrong. Example: Z2 cites 'Cluster 2 O7' for the undefined `onFocusChangeRef`, but O7 is the arrow-key issue; the undefined-ref bug is #1 (line 7) and L2 (line 551). Trust section headings, not cross-references.

**How to read the code in this doc:** code blocks marked *(verbatim)* are copied from SRC. Rows without code have an action derived from the section heading or priority table. Always run `show <ID>` and read the full section before editing.

**Files that SRC audits but that were NOT provided to the auditor** (items marked `[!]` in SRC depend on them): `WorkspaceShell.tsx`, `WorkspaceHeader.tsx`, `graph-builder.ts`, `layout-worker-client.ts`, `graph-depth.ts`, `orbit-layout.ts`, `orbit-semantics.ts`, `constellation-layout.ts`, `layout/*.ts` (analysis, domains, features, global-layout, ordering, local-layout, centrality, satellites, components, spacing, graph-index, feature-roles), `graph.css`, `explorer.ts` (partly). Locate with `git ls-files | grep <name>`.

## 2. Working rules for every task

1. `show <ID>` and read the whole section, including its Fix paragraph.
2. Find the code: `grep -rn '<symbol from the section>' src/`.
3. **Write a failing test first** whenever a test is feasible (SRC Cluster 8 and Z42-Z48 explain which tests are weak or missing).
4. Apply the fix. Keep the change limited to that ID.
5. Run the test suite plus type-check (`tsc --noEmit`). Commit with message `fix(<ID>): <title>`.
6. Duplicates: SRC reports the same bug in several blocks. Fix it once, then tick all aliases (table in section 9).
7. Do not refactor (Phase 8) before Phases 0-7 are green. Z49/Z50 split the two files that nearly every bug lives in.
8. Do not change a prop or function signature without grepping every caller. `WorkspaceShell.tsx` was not audited and is the most likely place to break.

## 3. Phase map (dependency order)

| Phase | Goal | Why it comes here |
| --- | --- | --- |
| 0 | Unblockers, quick wins, safety nets | Cheap, and decides whether later fixes are still needed |
| 1 | Data contract foundation | Every layout engine and UI effect trusts these types and coercions |
| 2 | Layout engines (pure logic) | Must be correct before the UI orchestrates them |
| 3 | Persistence and state | Position authority needs correct per-mode storage |
| 4 | `GraphView.tsx` orchestration | Depends on Phases 1-3 behaving |
| 5 | Styling and UI | Selectors depend on Phase 1 data typing |
| 6 | `App.tsx` and interactions | Independent of layout, but Z1 freezes the app |
| 7 | Tests | Written alongside each phase, then gaps closed here |
| 8 | Refactors | Last, so bugs are not re-introduced |

---

## PHASE 0: Unblockers, quick wins, safety nets (about half a day)

### 0.1 Verify the unprovided files first

Several critical fixes depend on code the auditor never saw. Answer these before Phase 2.

| Check | Question | Gates | SRC lines |
| --- | --- | --- | --- |
| graph-builder.ts | Are `isTest`, `hasCycles`, `hasUnresolved`, `unresolved`, `isInterFeature` booleans or strings? Does `data.id` equal the cy element id? Does it set `relationshipType` on edges? | #3, D4, D11, D28, D30, T10 | 1585-1603, 1914-1923 |
| layout-worker-client.ts | Cancellation token? Timeout (\~10 s)? `projectedNodeIds` still a `Set` after serialization? Handles worker `error` events? `existingPositions` defaulted to `{}`? | D9, D10, D19 | 1529-1584, 1726-1748, 1906-1913 |
| graph-depth.ts | Does `depthMap.get(focal) === 0`? Is focal in `reachableNodeIds`? Does `reachableNodeIds.includes(sunId)` hold for BFS sources? `reachableEdges` only between reachable nodes? | R6, R7, R8, K1 | 2077-2159, 2498-2511 |
| constellation-layout.ts | Is it a plain re-export, or a second live code path with PBIM-specific coordinates? | K30 (and maybe all of Cluster 5) | 3115-3128, 3140-3147 |
| WorkspaceShell.tsx | Does it pass `onArchitectureModeChange` and `onLayoutModeChange` to `GraphView`? Does `onNodePositionsChange` accept `(positions, provenance)` and forward both? | C3, C5, C7, M6, #9 | 323-340, 366-387, 413-428, 571-583 |
| explorer.ts | Run the grep block in SRC | T1-T30 | 5001-5027 |
| layout/\*.ts | Run the per-file `[!]` checklist | A12-A14, A32-A33, A41 | 4129-4199 |

**Decision rule from SRC (lines 3140-3147):** the most likely cause of 'works on PBIM, fails elsewhere' is **K1** (root suns dropped, blank canvas) or **K30** (hardcoded PBIM path). If either is confirmed, re-scope the rest of Cluster 5 afterwards, because many K-items may become moot.
**Re-scope rule for `WorkspaceShell.tsx` and `explorer.ts`:** if Phase 0.1 reveals partial correctness, remove the affected IDs from Phases 3 and 4 — do not fix what is already correct. Partial-correctness examples: `WorkspaceShell` already wires `onArchitectureModeChange` (strike `C3`, `C7`); `explorer.ts` already types `Position` correctly and only consumption is duplicated (`T21` becomes DRY-only, not correctness); `graph-builder.ts` already stores booleans (strike `D4`, `D28`, `T10`).

### 0.1.1 Reconciliation ledger (Phase 0.1 output)

Record the verdict for every `[!]` item. Phase 2-6 must not fix a bug that Phase 0.1 proved does not exist; Phase 1.5 must not fabricate a fake round-trip test for a field that is already preserved.

Create `audit-reconciliation.md` at the repo root with this table and fill it in as questions from 0.1 are answered.

| ID | Phase 0.1 verdict | Evidence (file:line or test) | Action |
| --- | --- | --- | --- |
| `[!]` item | exists / does not exist / unreachable / false alarm | what was read or run | keep / strike / document-only / add new ID |

Verdict rules:

| Verdict | Action |
| --- | --- |
| **Bug exists** | Keep in plan. If the answer reveals a *new* bug adjacent to the one asked about, add a new ID to SRC (do not silently expand the existing ID). |
| **Bug does not exist** | Strike from plan. Tick the alias rows in section 9 as "verified OK". Commit message: `audit(<ID>): verified, no fix needed`. |
| **Bug exists but is unreachable** | Keep as P3 document-only. Add a comment at the code site explaining *why* it is unreachable, so the next audit does not re-flag it. |
| **Auditor misread an adjacent bug** | Strike the ID, add the real bug as a new ID with the corrected SRC line range. |
| **`constellation-layout.ts` PBIM hardcoding** | Highest priority. See the SRC decision rule (SRC 3140-3147). Re-scope Cluster 5 after this answer. |

Re-scope rule for `WorkspaceShell.tsx` and `explorer.ts`:

- If `WorkspaceShell` already passes `onArchitectureModeChange` / `onLayoutModeChange` / the 3-argument `onNodePositionsChange`, strike `C3`, `C7`, `M6`, `#9`.
- If `explorer.ts` already types `Position` correctly and only the *consumption* is duplicated, `T21` becomes DRY-only (no correctness risk; lower priority).
- If `graph-builder.ts` already stores booleans, strike `D4`, `D28`, `T10` and note "fix already correct in builder; extraction is the only fabricator" (see 1.5).

Output of Phase 0.1 = revised SRC with false positives removed + `audit-reconciliation.md` committed.

### 0.2 Independent quick wins

**#1 / L2: ReferenceError on Escape** (SRC 7-21, 551-553). `onFocusChangeRef` is never defined in `GraphView.tsx` `handleKeyDown`. *(verbatim)*

```ts
// BEFORE
if (onFocusChangeRef.current) {
  onFocusChangeRef.current({ enabled: false, focusNodeId: null });
}
// AFTER
onFocusChange?.({ enabled: false, focusNodeId: null });
```

If `handleKeyDown` is wrapped in `useCallback`, add `onFocusChange` to its dependency list. Alternative from SRC: declare a proper `useRef` and sync it.

**Z2: Escape clears selection while typing** (SRC 5752-5776). In the `App.tsx` window keydown handler add this guard *(verbatim)* and remove GraphView's duplicate Escape handling:

```ts
const tag = (e.target as HTMLElement).tagName;
if (['INPUT', 'SELECT', 'TEXTAREA'].includes(tag) || (e.target as HTMLElement).isContentEditable) return;
```

**Z37: telemetry global not dev-gated** (SRC 6436-6450) *(verbatim)*:

```ts
if (DEBUG) (window as any).__LAST_LAYOUT_COMPLETED__ = detail;
```

Also see Z38 (6451-6467, clear `__LAYOUT_MODULE__` on unmount), Z39 (6468-6490), O16 (922-934).

**Z40: BroadcastChannel accepts any node id** (SRC 6491-6515) *(verbatim)*:

```ts
onDetachedDrill(channel, (nodeId) => {
  if (!activeData?.nodes.some(n => n.id === nodeId)) return;
  selectNode(nodeId);
  setIsInvestigating(true);
});
```

**Z41: popup blocker flips state anyway** (SRC 6516-6551) *(verbatim)*:

```ts
const win = openDetachedWindow();
if (!win) {
  showToast({ variant: 'error', message: 'Popup blocked. Allow popups for this site.' });
  return;
}
detachedWindowRef.current = win;
investigation.setDrawerDetached(true);
```

If no toast primitive exists, add one (Z5 needs it too).

### 0.3 Safety nets that expose later bugs

**A44: assert every node got a position** (SRC 3976-4001). SRC says this one check would have caught A6, A19, A29, A40 and their analogues in Clusters 4 and 5. Add it to the end of `architecture-layout.ts`, and apply the same pattern to the orbit and constellation exits *(verbatim)*:

```ts
if (process.env.NODE_ENV !== 'production') {
  const missing = safeNodes.filter(n => !resultPositions[n.id]);
  if (missing.length > 0) {
    console.error(`[layout] ${missing.length} nodes missing from result: ${missing.slice(0, 5).map(n => n.id).join(', ')}...`);
  }
}
```

**T2 observability guard** (SRC 4993-5000): at the extraction boundary add `validateExtractedCoverage(extracted, originalNodes)` under `process.env.NODE_ENV !== 'production'`. It should throw when any of these are fabricated: `metrics.score`, `metrics.unresolved`, `behavior.asyncPatterns`, `refactoringReadiness.testCoverageStatus`, `canonical.source.type`.

**Z46: the highest-value test to add** (SRC 6662-6675) *(verbatim)*. It will fail today and keep failing until Phase 1.5 is done:

```ts
it('extractNodesAndEdgesFromCy round-trips all node fields', () => {
  const original: ExplorerNode = makeFullyPopulatedNode();
  const cy = makeMockCyWithNodes([original]);
  const { nodes } = extractNodesAndEdgesFromCy(cy);
  expect(nodes[0]).toEqual(original);
});
```

**CI gating for expected-to-fail tests (Z46, V21, V22, V23, V24, V25, V26, V27, V28):**

These tests are added in Phase 0 but cannot pass until Phase 1 or later. Mark them with Vitest's `.fails()` so CI does not block every intermediate commit:

```ts
it.fails('extractNodesAndEdgesFromCy round-trips all node fields', () => { /* ... */ });
Remove .fails in the same commit that lands the fix. The ID is not closed until .fails is removed and the test passes normally — a .fails marker left in place after the fix means the fix silently regressed, and the test is now asserting that the bug returns.

Same rule for the A44 assertion (Phase 0.3 console.error): switch from console.error to throw only when NODE_ENV === 'test' and Phase 2.1 is complete. Until then it is a dev-only warning that does not fail CI.

If Z46 passes on the current code, T2-T9 are false positives for this codebase. Strike them from Phase 1.5 and record the verdict in audit-reconciliation.md (0.1.1).

```


### 3.5 Triage: user-visible vs. latent vs. hygiene

The phase map orders **phases**. It does not order **within** a phase. An agent working §PHASE 4 top-to-bottom will fix `C1`, `C2`, `O1` in order — but `O1` (persisted positions lost on mount) is a P0 that should ship this week, while `C2` (double layout) is a P1 that can wait for the next release.

| Tier | Meaning | Fix SLA | Representative IDs |
| --- | --- | --- | --- |
| **P0 — user-visible now** | Reported symptom; freezes the tab, loses drags, shows wrong project, or silently fails | This week | Z1, Z2, Z5, O1, C5, C6, D1, K1, K5, A7, #1, #4, #5, #6, #9, #10, Z11 |
| **P1 — correctness, latent** | Silent corruption; bites on the next layout trigger, save, or reload | This month | T2, T4-T9, T10, D3, D4, D28, A8, A9, A36, H1, H2, C1, C2, O2, O3 |
| **P2 — safety nets** | Observability that makes P0/P1 detectable | This week (cheap) | A44, Z37-Z41, Z46, V23, T2-observability (1.5) |
| **P3 — hygiene** | Types, DRY, refactors, CSS polish, false-positive documentation | When convenient | T21, Z49, Z50, T13, T17, Z15-Z25, A15-A50 hygiene, R21-R30 hygiene, Appendix A rows struck in 0.1.1 |

**Rule for Phase 4 and Phase 6:** fix all P0 rows in the phase *before* any P1 or P3. If a P0 is blocked by a P1 (e.g. `C5` needs the Phase 1 `Position` type to be correct), fix the blocking P1 sub-item first, then the P0, then the rest of the P1s.

**Rule for Phase 1 and Phase 2:** P0 does not apply (pure logic), but **P2 safety nets go first** — `A44` and `Z46` are what make Phase 2's P1 bugs detectable. Without them, a P1 fix that silently regresses is invisible until Phase 7.

**If Z46 passes on the current code:** `T2`-`T9` are false positives for this codebase. Strike them from Phase 1.5 and record the verdict in `audit-reconciliation.md` (0.1.1). Do not "fix" a non-bug — the fix will regress the working code and the test will not catch it.

**Exit criteria for Phase 0:** unprovided-file questions answered and written down; #1, Z2, Z37-Z41 fixed; A44 assertion and Z46 test in place (Z46 expected red).

---

## PHASE 1: Data contract foundation

**Entry:** Phase 0 done. **Goal:** types, coercions and comparison helpers that every later fix relies on.

### 1.1 One shared `Position` type (T21, Z51)

| ID | SRC lines | Action |
| --- | --- | --- |
| T21 | 4802-4851 | Create one exported `Position { x: number; y: number }` (SRC notes it already exists only in `position-policy.ts`). Replace every inline `{ x: number; y: number }`. Find them: `grep -rn '{ x: number; y: number }' src/`. SRC counts 10+ sites. |
| T22 | 4852-4862 | `ZoomPanState.pan` becomes `Position`. |
| T23 | 4863-4875 | `ResolvedPosition` already uses it correctly; use as the model. |
| Z51 | 6742-6745 | Same item, restated. SRC calls it the single most impactful mechanical refactor. |

### 1.2 Locale-independent sorting (X3, Z52, D23, R23, K23, A43, #14, A35)

Create `utils/compare.ts` (or put it in `explorer.ts`) *(verbatim from Z52, SRC 6746-6753)*:

```ts
export const stableCompare = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
```

Replace every `localeCompare` that decides geometry: `grep -rn 'localeCompare' src/`. Known sites: `architecture-layout.ts` (D23 1799-1812, A43 3965-3975, #14 179-187), `component-orbit-adapter.ts` (R23 2400-2419), `component-constellation-adapter.ts` (K23 3050-3059), `component-constellation-layout.ts` (K2 sort). Null-safe form for #14 and A35: `stableCompare(a.id ?? '', b.id ?? '')`.

### 1.3 Strict boolean coercion (D4, D28, T10)

SRC 1383-1414, 1859-1862, 4463-4486. `Boolean('false') === true`, so test nodes and cycle flags are misclassified. Add *(verbatim)*:

```ts
const toBool = (v: unknown): boolean => v === true || v === 'true';
```

Use it for `isTest`, `hasCycles`, `hasUnresolved`, `unresolved` in `extractNodesAndEdgesFromCy`. SRC also flags `GraphView.tsx` `derivedFocalLwcId` and `executionTimeMs` as having the same pattern.

### 1.4 `explorer.ts` contract hardening

Run `show <ID>` for each. Actions come from the section headings; read the Fix paragraph before editing.

| ID | SRC | Problem | Action |
| --- | --- | --- | --- |
| T1 | 4240-4288 | `behavior.sharing` required by type, omitted by mock, `null` in fallback | Pick one shape (required or optional) and align type, mocks, fallback |
| T3 | 4329-4343 | `confidence: string` is a numeric concept | Decide number vs string; update producers/consumers |
| T12 | 4516-4556 | `visibleNodeTypes` hides new node types after schema evolution | Treat missing types as visible; test with `ALL_EXPLORER_NODE_TYPES` |
| T13 | 4559-4596 | `NODE_SHAPE_BY_TYPE` maintenance trap | Derive from one source so adding a type touches one file |
| T14 | 4597-4625 | `RISK_BORDER_COLORS: Record<string,string>` lets CRITICAL style as LOW | Type as `Record<ExplorerRiskLevel, string>` |
| T15 | 4626-4659 | `ARCH_MODE_META[next]` cycle not enforced | Enforce the cycle in the type or add a test (see V25, 5605-5620) |
| T16 | 4660-4696 | `projectState.ts` fallback drops unknown modes | Replace the if/else chain with a lookup over valid modes |
| T17 | 4697-4741 | `ArchitectureLayoutMode` spread across 3 type files | One source of truth; also resolves the `LayoutMode` naming collision |
| T18 | 4742-4757 | `cycleCount` and `cyclesCount` both exist | Keep one, migrate readers |
| T19, T20 | 4758-4799 | Inventory field conflation / type filters | Read the sections |
| T24-T30 | 4878-4965 | Defensive checks on required fields, `as any` casts, `ExplorerRelationshipType \| string` | Remove casts and escape hatches once T2 is done |

### 1.5 Stop fabricating data in `extractNodesAndEdgesFromCy` (D3, T2, T4-T9, T11, D5, D14, D18, D2)

SRC 1323-1382 (D3), 4289-4328 (T2). The function invents `'ApexClass'` for every canonical type, `'unknown'` relationship, `'RESOLVED_LOCAL'`, `confidence: '1.0'`, `line/column/methodOwner: null`, `file: ''`, `testCoverageStatus: 'UNTESTED'`, `metrics.score: 0`, and more. GraphView only avoids the damage because it passes `options.nodes`.

SRC gives two options (4310-4328):

- **(a) Safer now:** make the fabricated fields optional and `undefined` when absent (`metrics.unresolved`, `metrics.score`, `behavior.*Count`, `asyncPatterns`, `refactoringReadiness.testCoverageStatus`, `ExplorerEdge.canonical.*`). Never fabricate `'ApexClass'`; use `'External'` or preserve `data.type`.
- **(b) Long-term:** keep the full node/edge shape in `buildGraphElements` data and read it back losslessly.

Also required:

| ID | SRC | Action |
| --- | --- | --- |
| D5, T11 | 1415-1442, 4487-4515 | Use `cyNode.id()` unconditionally instead of `data.id \|\| cyNode.id()`; otherwise positions silently fail to apply |
| D14 | 1645-1648 | Keep position keys consistent (cy id vs extracted id) |
| D18 | 1709-1725 | Do not run extraction when `options.nodes` is provided |
| T4-T9 | 4344-4462 | Read each; they fall out of option (a) or (b) |
| D2 | 1296-1322 | Radial modes build a fake `ExplorerDataSchema` (`cycleCount: 0`, `cycles: []`, `impactSummaries: {}`); pass real values (see also A2, 3192-3229) |

**Exit criteria for Phase 1:** Z46 round-trip test is green; `tsc --noEmit` clean; `grep -rn localeCompare src/` returns no layout sites; `grep -rn 'Boolean(data\.' src/` returns nothing; one `Position` definition.

---

## PHASE 2: Layout engines (pure logic, no UI)

**Entry:** Phase 1 green. **Goal:** every layout function returns a complete, finite, deterministic position map and honors user-saved positions. Work in this order: 2.1 reference pipeline, 2.2 position authority, 2.3 graph-layout dispatcher, 2.4 worker, 2.5 orbit, 2.6 constellation.

### 2.1 `architecture-layout.ts`: the reference pipeline (Cluster 6)

SRC 3148-4223. Critical items first.

| ID | SRC | Problem | Action |
| --- | --- | --- | --- |
| A1 | 3158-3191 | Phantom nodes (fabricated for edge endpoints missing from the node list) become first-class nodes and distort layer, domain and centrality | Mark phantoms and exclude them from centrality and domain assignment. Related: A25 (3713), A31 (3800), A38 (3906), A39 (3910), D17 (1689-1708, phantoms with type `'External'` show up in radial modes) |
| A2 | 3192-3229 | `completeSummary.unresolvedCount` and `cycleCount` fabricated as 0, so risk classification is zero | Compute from real data (see also D2, 1296-1322) |
| A6 | 3298-3345 | `satelliteResult.positions` may drop bridge and primary nodes; `componentShiftedPositions = packed.positions` replaces rather than merges, so dropped nodes collapse to (0,0) | Merge into the base map instead of replacing; verify every node id survives |
| A7 | 3346-3373 | `existingPositions` restored after packing, so satellites stay anchored to the old computed position | Exclude `existingPositions` nodes from layout entirely (SRC X1 recommends this, line 4092-4100), then add them back |
| A8 | 3374-3396 | Non-finite saved coordinates are copied through and break `cy.fit` | See the helper in 2.2 |
| A9 | 3397-3411 | `existingPositions` may contain ids not in the graph | Filter to known ids |
| A11 | 3434-3455 | `analysis` object mutated by five stages | Treat as read-only or clone per stage |
| A12, A13 | 3456-3493 | Code assumes `analysis.nodes` and `assignments` are `Map`; crashes on `Record` | Normalize at entry or guard |
| A44 | 3976-4001 | No check that every node got a position | Already added in Phase 0; confirm it passes |
| A47 | 4037-4049 | `hubScore + bridgeScore` can be `undefined`, producing `NaN` importance and nondeterministic packing | Use `(hubScore ?? 0) + (bridgeScore ?? 0)` |
| A3, A4, A34, X2 | 3230-3272, 3846-3855, 4101-4108 | `enableFeatureLayout` / `enableCandidateDOrdering` defaults computed in several places | One exported helper, used by `architecture-layout.ts`, `GraphView.tsx`, `graph-layout.ts` |
| A5, D15 | 3273-3297, 1649-1667 | `globalDomainResult.domainRegions.forEach` crashes if missing | Guard with `?? []` and add a test |
| A10, D22 | 3414-3433, 1780-1798 | `Object.freeze` is shallow, so `immutableStage7PrimaryPositions` can still be mutated | Deep freeze or clone (test V22, 5426-5442) |
| A14, A26, A28, A29, A40 | 3494-3510, 3725-3742, 3756-3761, 3762-3781, 3916-3941 | `analysis.components` ordering, reassignment and empty-case handling unverified | Add fallback when `components.length === 0`; verify `componentLayouts.length` matches |
| A15, A21, A23 | 3511-3522, 3650-3680, 3696-3706 | `compWidths.sort()` mutates and feeds `minRowWidth` | Sort a copy |
| A16 | 3523-3556 | Bridge nodes sorted ascending by span (least important first?) | Read and confirm intent; add test V8 (5200-5231) |
| A17, A18, A19 | 3557-3623 | `connectedDomains` from a different map; `isFieldNode` not imported; non-component bridge nodes excluded | Read each |
| A20, A36 | 3624-3649, 3869-3883 | Comment says defensive deep clone, but only shallow copy | Deep clone or document the contract; test V23 (5585-5600) |
| A22, A51 | 3681-3695, 4084-4089 | `featureRegions` typed `Map` but pipeline returns `any` | Fix the type |
| A27, A41 | 3745-3755, 3944-3953 | `\|\|` used where `??` is intended | Replace |
| A32, A33 | 3806-3845 | `featureRoleContextMap` built but never passed; `role` may not exist on `AnalysisNode` | Pass it or delete it |
| A24 | 3707-3712 | No diagnostic when `existingPositions` overrides the computed layout | Add diagnostic |
| A30, A35, A37, A42, A43, A45, A46, A48, A49, A50 | 3782-3799 ... 4080-4083 | Hygiene and tie-breakers | Read; low priority |

### 2.2 Position authority in every mode (D1, K5, X1, A8, A9, D16, X4)

SRC D1 1262-1295, K5 2718-2736, X1 4092-4100. The restore step only runs for hierarchical and hybrid; both radial branches return early and drop user positions. Current code *(verbatim from D1)*:

```ts
// Step 8: Position Authority Restoration
const resultPositions: Record<string, { x: number; y: number }> = { ...calculatedPositions };
for (const [id, pos] of Object.entries(existingPositions)) {
  if (pos) resultPositions[id] = { x: pos.x, y: pos.y };
}
return { positions: resultPositions, ... };

if (architectureMode === 'constellation') { ...; return { positions: constellationPositions, ... }; } // ignores existingPositions
if (isOrbit) { ...; return { positions: orbitPositions, ... }; }                                        // ignores existingPositions
```

SRC fix: apply the same merge at the end of both radial branches, or unify all modes to one `resultPositions` accumulator. The finite check comes from A8 *(verbatim)*:

```ts
if (pos && Number.isFinite(pos.x) && Number.isFinite(pos.y)) {
  resultPositions[id] = { x: pos.x, y: pos.y };
}
```

Suggested shared helper *(composed from D1 + A8 + A9, not verbatim from SRC)*:

```ts
function applyExistingPositions(
  calculated: Record<string, Position>,
  existing: Record<string, Position> | undefined,
  knownIds: Set<string>,
): Record<string, Position> {
  const out = { ...calculated };
  for (const [id, pos] of Object.entries(existing ?? {})) {
    if (knownIds.has(id) && pos && Number.isFinite(pos.x) && Number.isFinite(pos.y)) {
      out[id] = { x: pos.x, y: pos.y };
    }
  }
  return out;
}
```

Call it in all four mode paths. Also fix K4 (2677-2717): constellation `invariantViolations` and diagnostics are discarded by the caller; surface them in the returned metadata.

### 2.3 `graph-layout.ts` dispatcher (#7, D6, D7, D8, D12, D13, D18, D25, D26, D29, #10, D27)

| ID | SRC | Action |
| --- | --- | --- |
| #7 = D6 | 92-102, 1443-1483 | `getLayoutOptions` ignores `useArchitectureLayout: false`. Add `const useArch = options.useArchitectureLayout !== false;` at the top and take the preset branch only when `useArch && nodes?.length > 0` |
| D7 | 1484-1508 | `createLayout` builds the preset from `options.nodes` which may differ from `cy.nodes()`; build the map from `cy.nodes()` or validate first |
| D8 | 1509-1528 | Async non-arch path returns `computeDurationMs: 0, totalDurationMs: 0`; measure with `performance.now()` |
| D12, D13 | 1606-1644 | Non-arch fallback returns a partial `ArchitectureLayoutResultWithMetadata`, does not fit, does not fire `layoutstart/stop`; return the full shape |
| #10, D27 | 130-138, 1855-1858 | Non-animated branch never emits `layoutstop`, so `isLayoutRunning` can stick above 0. Make both branches emit the same events (or pair every start with a stop) |
| D18 | 1709-1725 | Skip `extractNodesAndEdgesFromCy` when `options.nodes` is provided |
| D29 | 1863-1868 | `posMap[node.id()] \|\| { x: 0, y: 0 }` stacks nodes at the origin; fall back to `node.position()` |
| D25, D26 | 1830-1854 | `LAYOUT_PRESETS` mixes `cose`-only keys into fcose; `nodeCount` assumed |
| O25 | 1060-1080 | Non-arch fallback ignores `existingPositions` |

### 2.4 Worker client `[!]` (D9, D10, D19)

SRC 1529-1584, 1726-1748, checklist 1906-1913. Needs the file. Required behavior: cancellation (`AbortSignal` or request id), timeout (SRC suggests 10 s), `projectedNodeIds` returned as a `Set<string>` (or rebuilt with `new Set(result.projectedNodeIds)`), `existingCanvasPositions` defaulting to `{}`, no mutation of `options`/`nodes`, `featureRegions` Map and `orbitGuides` preserved through serialization, and worker `error` events rejecting the promise.

### 2.5 Orbit cluster (R1-R30, SRC 1925-2546)

Do the depth contract first; it gates R7, R8 and K1.

| Order | ID | SRC | Action |
| --- | --- | --- | --- |
| 1 | R6, R7, R8 `[!]` | 2077-2159 | Verify `graph-depth.ts`: focal at depth 0, focal in `reachableNodeIds`, `reachableEdges` only between reachable nodes. Add runtime assertions in the adapter. Checklist lines 2500-2511 |
| 2 | R1 | 1933-1971 | `nodeDependentLwcsMap` ignores `allowedEdgeTypes`, causing false shared-hub badges; filter by allowed edge types |
| 3 | R17 | 2308-2324 | `depthMap.get(x) ?? 0` promotes unknown nodes to the focal ring; treat missing depth as unreachable |
| 4 | R2 | 1972-2002 | `maxNodesPerTrack <= 0` produces `Infinity` radii. Assert `maxNodesPerTrack > 0`, `ringSpacingPx > 0`, `trackSpacingPx > 0` at entry and throw a clear error |
| 5 | R3 | 2003-2034 | `innerRadius < 160` creates an unrepairable focal-vs-ring-1 overlap. Clamp: `innerRadius = Math.max(options.innerRadius ?? 280, 160)` or exclude sun-vs-ring pairs from the counters |
| 6 | R5 | 2056-2076 | Ring 0 with more than one node silently drops extras; place or reject them |
| 7 | R4, R11, R16, R25 | 2035-2055, 2196-2211, 2297-2307, 2426-2429 | Repair loop termination, compounding moves, re-sorting after moves |
| 8 | R9, R10, R15, R27 | 2160-2193, 2270-2296, 2439-2453 | Diagnostics: `minAABBSeparationPx` is center distance, single node reports 0 (use `null`), guides report repaired radii |
| 9 | R14 = #15 | 2249-2269, 188-195 | Pre-compute an outgoing-edge count map once instead of `edges.filter(...)` inside the LWC `map` |
| 10 | R12, R13, R22, R26, R28-R30 | various | Read each |
| 11 | R18-R20 `[!]` | 2327-2371 | Verify `orbit-layout.ts` (`checkAABBOverlap` half-sum vs full-sum, `normalizeAngle` range) and `orbit-semantics.ts` role-symbol priority; checklist 2512-2527 |
| 12 | R21, R23, R24 | 2372-2378, 2400-2419, 2422-2425 | `localeCompare` already done in Phase 1.2 |


### 2.5 Prove it's broken first (mandatory for P0 and P1)

The plan is derived from static analysis. Some of the 200+ bugs may be unreachable. For each **P0 and P1** item (triage in section 3.5):

1. Write a **minimal reproduction test** that fails against current code.
2. Capture the failure output; the commit message must include `Repro: <one-line failing assertion>`.
3. Only then apply the fix.
4. Verify the test fails on `git stash` of the fix and passes on `git stash pop`.

If you cannot write a failing test, one of three things is true — investigate before proceeding:

| Situation | Action |
| --- | --- |
| The bug is unreachable from any public API | Add to `audit-reconciliation.md` as "unreachable"; downgrade to P3 document-only |
| Your understanding of the code is wrong | Re-read the SRC section and the code path; the bug may be adjacent |
| The bug can only be observed through an internal helper | Write a characterization test (asserts current wrong behavior) — the fix updates it |

Which IDs are "prove-or-drop":

| Category | IDs | If the repro test passes today |
| --- | --- | --- |
| `[!]` items | D9, D10, D19, R6, R7, R8, R18, R19, R20, K30, A12, A13, A32, A33, A41 | Strike from plan; log verdict |
| "verify intent" items | A16, R11, R16, L4 | If current behavior is intended, strike |
| Silent-fabrication items | T2, T4-T9, D3, D2, A2 | Cannot be tested through public API — use characterization tests |

Worked example — `T2` (extraction fabrication):

```ts
it.fails('extractNodesAndEdgesFromCy does not fabricate canonical.source.type', () => {
  const original = makeFullyPopulatedNode({ id: 'LWC:OrderView', type: 'LWC' });
  const cy = makeMockCyWithNodes([original], /* LWC -> Apex edge */);
  const { edges } = extractNodesAndEdgesFromCy(cy);
  expect(edges[0].canonical.source.type).toBe('LWC');   // today: 'ApexClass'
});
If this test passes today, T2 is either a misread or unreachable — record and deprioritize. If it fails, it is your gate for fixing T2.
```
### 2.6 Constellation cluster (K1-K30, SRC 2548-3146)

**Start with K30 and K1** (see Phase 0.1 decision rule).

**K1** (SRC 2556-2605): suns are only added to `projectedNodesDict` if they appear in `nodeReferencingSunsMap`, which is built from `computeGraphDepths(...).reachableNodeIds`. If the BFS source is not in that list, every root sun is dropped and the canvas goes blank. SRC fix: add every active sun to `projectedNodesDict` unconditionally before iterating the map, or require `graph-depth` to include the source and assert it.

**K2** (SRC 2606-2652): hardcoded 6 inner and 8 outer angle steps, so extra suns land on top of each other. Fix *(verbatim)*:

```ts
const innerAngleStep = innerSuns.length > 0 ? (2 * Math.PI) / innerSuns.length : 0;
const outerAngleStep = outerSuns.length > 0 ? (2 * Math.PI) / outerSuns.length : 0;
```

Also assert `innerSuns.length <= 6 && outerSuns.length <= 8` in the adapter, or cap the fallback with `slice(0, 6)` and `slice(6, 14)`.

| ID | SRC | Action |
| --- | --- | --- |
| K30 `[!]` | 3115-3128 | Open `constellation-layout.ts`. If it holds PBIM coordinates or a second live path, remove it |
| K3 | 2653-2676 | Fallback picks test LWCs and orphans as suns; filter them |
| K4 | 2677-2717 | Surface diagnostics (see 2.2) |
| K5 | 2718-2736 | Honor `existingPositions` (see 2.2) |
| K6, K7, K8 | 2737-2826 | Repair tolerance (1 px) vs diagnostic (120 px); no shared-to-shared repair; `minSharedNodeAabbClearancePx` under-reports |
| K10, K13 | 2852-2876, 2913-2924 | Suns are never laid out relative to each other; coincident suns divide by zero in repair |
| K11 | 2877-2902 | `roleSymbol` priority contradicts the orbit engine; use one shared definition (also R20) |
| K14 | 2925-2938 | Validate `localOrbitRadius` against `nodeWidth` |
| K18 | 2979-2995 | Support `focalLwcId` |
| K9, K12, K15-K17, K19-K29 | various | Read each; medium and low priority |

### 2.7 Constellation guides mislabeled (#11)

SRC 139-150: `architecture-layout.ts` returns `orbitGuides: constellationOutput.guides as any`, and `GraphView` only forwards `orbitGuides` to `FeatureOverlayCanvas` when `architectureMode === 'orbit'`, so constellation guides never render. Return them under their own key (or a tagged generic `guides` field), remove the `as any`, and update `GraphView` in Phase 4.

**Exit criteria for Phase 2:** for each mode (hierarchical, hybrid, orbit, constellation) a test shows (1) every input node id appears in `positions`, (2) all coordinates are finite, (3) `existingPositions` are returned unchanged, (4) same input gives identical output, (5) inputs are not mutated.

---

## PHASE 3: Persistence and state

**Entry:** Phase 2 green. **Goal:** positions are stored, migrated and attributed per architecture mode, and provenance actually reaches storage. Files: `projectState.ts`, `position-policy.ts`, and the `onNodePositionsChange` plumbing.

| ID | SRC | Problem | Action |
| --- | --- | --- | --- |
| C5 | 366-387 | `updateProjectState` infers the target mode bucket from `curLayout`, so a positions update that lands after a mode switch can overwrite the old mode's bucket | Make the payload carry its mode and make the update order-independent. Current code *(verbatim)*: `const newArchMode = updateLayout.architectureMode \|\| curLayout.architectureMode \|\| 'hierarchical'; if (updateLayout.nodePositions !== undefined) { layoutPositions[newArchMode] = updateLayout.nodePositions; }` |
| #9 = M6 | 117-129, 517-532 | Provenance dropped: the prop type has one argument, but GraphView calls `(onNodePositionsChangeRef.current as any)(currentPositions, provenance)` | Widen the prop type to `(positions, provenance, architectureMode)`, remove the `as any`, and forward all three through `WorkspaceShell` and `App` to `updateProjectState` |
| H1 = #18 | 431-440, 212-214 | Legacy flat `nodePositions` migrate into whatever mode is active | Migrate into the mode named by persisted `layoutProvenance`, else `hierarchical`; log a one-time diagnostic |
| H2 | 441-444 | Provenance for the previous mode is not reset when modes change | Read the section; reset or store provenance per mode |
| L3 | 554-562 | `layoutPositions` shallow-merged without shape validation | Validate each entry (object of finite `{x,y}`) with the Phase 2.2 finite check |
| H3 | 445-464 | `'place-new-only'` return value is ignored by GraphView | Make the policy a discriminated union and branch on all values |
| L4 | 563-565 | `shouldAutoLayout` returns true on `'architecture-mode-switch'` even in static mode | Decide and test the intended behavior |
| Z4 | 5808-5838 | Filter persistence calls `saveProjectState` directly, skipping `mergeWithDefaultState`; compares with `JSON.stringify`, so reordered arrays trigger saves | Replace with the snippet below |
| T16 | 4660-4696 | Done in Phase 1.4 | Verify |

Z4 fix *(verbatim)*:

```ts
const sameSet = (a: string[] = [], b: string[] = []) => a.length === b.length && a.every(x => b.includes(x));
if (!sameSet(currentProjState.filters?.visibleNodeTypes, activeVisibleTypes)) {
  updateProjectState(activeProjectId, { filters: { visibleNodeTypes: activeVisibleTypes } });
}
```

**Wiring check (SRC 571-583):** confirm `WorkspaceShell.tsx` passes `onArchitectureModeChange` and `onLayoutModeChange` to `GraphView` (C3, C7), that the header reads the same `architectureMode` source as `App.tsx`, and whether `updateProjectState` calls are debounced (which would reorder the two-step sequence in C5). C1 + C2 + C5 together explain the reported 'button toggles, geometry never changes' symptom.

**Exit criteria for Phase 3:** unit tests on `updateProjectState`: (1) switching mode then saving positions puts them in the new bucket regardless of call order, (2) legacy flat positions migrate to the right bucket, (3) provenance round-trips, (4) a non-finite coordinate in storage does not survive load.

### 3.5 Triage: user-visible vs. latent vs. hygiene

The phase map orders **phases**. It does not order **within** a phase. An agent working §PHASE 4 top-to-bottom will fix `C1`, `C2`, `O1` in order — but `O1` (persisted positions lost on mount) is a P0 that should ship this week, while `C2` (double layout) is a P1 that can wait for the next release.

| Tier | Meaning | Fix SLA | Representative IDs |
| --- | --- | --- | --- |
| **P0 — user-visible now** | Reported symptom; freezes the tab, loses drags, shows wrong project, or silently fails | This week | Z1, Z2, Z5, O1, C5, C6, D1, K1, K5, A7, #1, #4, #5, #6, #9, #10, Z11 |
| **P1 — correctness, latent** | Silent corruption; bites on the next layout trigger, save, or reload | This month | T2, T4-T9, T10, D3, D4, D28, A8, A9, A36, H1, H2, C1, C2, O2, O3 |
| **P2 — safety nets** | Observability that makes P0/P1 detectable | This week (cheap) | A44, Z37-Z41, Z46, V23, T2-observability (1.5) |
| **P3 — hygiene** | Types, DRY, refactors, CSS polish, false-positive documentation | When convenient | T21, Z49, Z50, T13, T17, Z15-Z25, A15-A50 hygiene, R21-R30 hygiene, Appendix A rows struck in 0.1.1 |

**Rule for Phase 4 and Phase 6:** fix all P0 rows in the phase *before* any P1 or P3. If a P0 is blocked by a P1 (e.g. `C5` needs the Phase 1 `Position` type to be correct), fix the blocking P1 sub-item first, then the P0, then the rest of the P1s.

**Rule for Phase 1 and Phase 2:** P0 does not apply (pure logic), but **P2 safety nets go first** — `A44` and `Z46` are what make Phase 2's P1 bugs detectable. Without them, a P1 fix that silently regresses is invisible until Phase 7.


### 3.6 Dependency graph within each phase

Phases are ordered by cross-phase dependency. Within a phase, several fixes will silently regress if done out of order. Respect these graphs.

**Phase 1:**
1.1 Position (T21, Z51) ─────────────┐
│
1.2 stableCompare (X3, Z52) ─────┐ │
│ │
1.3 toBool (D4, D28, T10) ───┐ │ │
│ │ │
1.4 explorer.ts types ───────┴───┴────┘
│
▼
1.5 Stop fabrication (D3, T2-T9, D5, T11) ← must be last in Phase 1
│
▼
Z46 green

text

**Phase 2:**
2.1 architecture-layout (A1, A2, A6, A7) ─────┐
│
2.2 applyExistingPositions helper ─────────────┤
(D1, K5, X1, A8, A9, D16) │
▼
2.3 graph-layout dispatcher ──────────────── 2.4 worker
(D6, D7, D8, D12, D13) (needs 2.3 caller contract)
│
▼
2.5 orbit ◄── R6, R7, R8 (depth) first ───► 2.6 constellation ◄── K30, K1, K2 first
│
▼
2.7 guides mislabeled (needs 2.6 complete)

text

**Phase 4:**
4.1 Effect ordering (C1, O1) ──────────────┐
MUST come first — everything downstream │
reads the refs this fixes │
▼
4.2 Layout triggers ─────────────────── 4.3 Highlights
(needs 4.1 stable; needs Phase 3 (needs 4.2 stable)
single-update contract for C5/C6)
O2, O3, O4, O8, C2, C6, O18, O12 #5, #8, #19, O7, O21

text

**Worked anti-example:** fixing `O3` (stale `discoveryResult` key) before `C1` (ref ordering) leaves the stale-key bug in place — because `graphStructureKey` still reads `nodesRef.current` (stale). The `O3` fix "looks right" and its test passes, and the bug ships. The dependency graph prevents this.


---

## PHASE 4: `GraphView.tsx` orchestration

**Entry:** Phases 1-3 green. **Goal:** one layout per trigger, user drags and highlights survive rebuilds, no stale refs. Almost every item below lives in one file, so do them in this order and keep each as its own commit.

### 4.1 Fix effect ordering and mount behavior first (C1, O1)

**C1** (SRC 242-280). The mode-switch effect reads refs that a *later* effect updates, so on the render where the mode flips it sees the previous mode's positions, layout mode and focal id. *(verbatim, abbreviated)*:

```tsx
// declared first, so it runs first: reads nodePositionsRef / graphLayoutRef / layoutModeRef
useEffect(() => {
  const hasAuth = !!nodePositionsRef.current && Object.keys(nodePositionsRef.current).length > 0 && ...;
  const existingPosMap = graphLayoutRef.current?.layoutPositions?.[architectureMode] ?? {};
  ...
}, [architectureMode, effectiveLayoutOptions.focalLwcId, captureAndPersistPositions]);

// declared second, so it runs AFTER
useEffect(() => {
  nodePositionsRef.current = nodePositions;
  graphLayoutRef.current = graphLayout;
  layoutModeRef.current = layoutMode;
  effectiveLayoutOptionsRef.current = effectiveLayoutOptions;
}, [nodes, edges, nodePositions, onNodePositionsChange, layoutMode, graphLayout, ...]);
```

SRC fix: move the ref-sync effect **above** the mode effects, or drop the refs in the mode effect and use current props and closures directly. Consequence if unfixed: switching to orbit uses a stale `focalLwcId`.

**O1** (SRC 592-613): opening a project saved in `orbit`, `constellation` or `hybrid` fires the mode-switch effect on mount (`prevArchitectureModeRef` starts at `'hierarchical'`), runs a fresh layout with `existingPositions: {}`, then persists it over the user's saved layout. Only hierarchical survives a reload. SRC fix: guard the mode-switch effect against mount (mirror `isInitialMountRef`), or initialize `prevArchitectureModeRef` from the resolved initial mode.

### 4.2 Layout triggers (one layout per event)

| ID | SRC | Problem | Action |
| --- | --- | --- | --- |
| #4 = M7 | 51-60, 533-538 | Three layouts on mount (constructor layout, explicit `cy.layout(...).run()`, `runLayoutWithMetadata`), and `computeArchitectureLayout` runs twice | Remove the redundant explicit `.run()` and reuse the positions already computed |
| C2 | 281-322 | `hierarchical -> hybrid` changes `featureAssignmentMap`, which triggers structural sync, which runs a second synchronous layout while the async mode-switch layout is in flight | Suppress the structural-sync auto-layout when the cause is a mode switch (guard on `prevArchitectureModeRef` or pass the trigger down) |
| #6 = C6 | 75-91, 388-412 | Position-only sync re-applies the previous mode's `nodePositions` right after a mode switch, overwriting the new layout | Gate the effect on `nodePositions` belonging to the current `architectureMode`, or clear positions atomically with the mode change (needs the Phase 3 single-update contract) |
| #5 (part 2) | 61-74 | Structural sync uses stale `nodePositionsRef.current` when the mode changes to hybrid | Same root cause as C1; verify after 4.1 |
| O2 | 614-648 | Structural sync calls `runLayoutWithMetadata` without `existingPositions`, so session drags snap back after any graph update | Pass `existingPositions: Object.fromEntries(modeSessionMapInSync)` merged with `graphLayoutRef.current.layoutPositions[architectureMode]` into every `runLayoutWithMetadata` / `Async` call except an explicit reset |
| O3 | 649-672 | `graphStructureKey` only uses counts and first/last ids, so `discoveryResult` goes stale when a middle node or edge direction changes | Real fingerprint (join all ids) or recompute `discoverFeatures` on `[nodes, edges]` |
| O4 | 673-697 | Mode-switch effect hardcodes `enableFeatureLayout: architectureMode === 'hybrid'`, overriding the prop | Use the derived `enableFeatureLayout` variable in the mode-switch effect, structural sync and `executeResetLayout` (use the single helper from Phase 2.1 A3/X2) |
| O8, O38, #10, D27 | 787-799, 1227-1234, 130-138 | `isLayoutRunningRef` not set during async mode switch or reset; non-animated path never emits `layoutstop` | Set the flag before every layout start and clear it in a `finally`; pair with the Phase 2.3 event fix |
| O18 | 949-960 | Async vs sync cutoff (`nodes.length >= 20`) read from stale `nodesRef.current` | Read current nodes |
| O12 | 857-876 | Double persistence on each drag | Persist once per gesture |
| O29 | 1134-1164 | `graphLayoutRef` and the `graphLayout` prop used as mixed sources; provenance computed three times | One accessor, one provenance function |
| O13 | 877-891 | `featureRegions` / `orbitGuides` state not cleared on mode switch | Clear on mode change |
| O15, L1, O33 | 904-921, 541-550, 1199-1206 | setState after unmount; hover timer not cleared | Add mounted guard and cleanup |
| O9, O10, O11, O16, O17, O19, O23, O24 | 802-856, 922-972, 1023-1059 | Telemetry counts, correlation token leak, `performance.measure` name collision, global module handle, announcement never reset | Read each; medium priority |
| O14, O26, O27, O28, O30, O35, O36 | 892-903, 1081-1133, 1165-1172, 1211-1222 | Memoization, hardcoded minimap scale, event storm in batch, hash read only on mount | Read each; low priority |

### 4.3 Highlights, selection and keyboard

| ID | SRC | Problem | Action |
| --- | --- | --- | --- |
| #5 (part 1) | 61-74 | Structural sync does `cy.elements().remove(); cy.add(newElements)`, which loses selection, zoom LOD, impact, cycle, finding and simulated classes; those effects only re-run when their own deps change | After `cy.add`, re-apply all class layers. A simple approach *(suggestion, not in SRC)*: keep a `structureVersion` counter, increment it after each structural sync, and add it to the dependency arrays of the highlight effects |
| #19 = O34 | 215-217, 1207-1210 | Zoom LOD classes missing on new elements until the next zoom event | Call `updateZoomClass()` right after `cy.add(newElements)` |
| #8 | 105-116 | Selection effect calls `clearHighlights(cy)`, removing finding, impact and cycle highlights | Clear only selection-specific classes, or re-run the other highlight effects when selection changes |
| #1, #20, #22, L2 | 7-21, 218-220, 224-228, 551-553 | Escape handler: undefined ref (done in Phase 0), focus state not cleared, `onSelectEdge('')` | Pass `null` or add a dedicated `onClearSelection`; verify `view.setFocusState` clears the focus node |
| O7, O21, O31, O20 | 762-786, 985-999, 1175-1186, 973-984 | Arrow keys break `<select>` navigation; handler fires for every key; Escape inside `<select>`; container is a focus trap | Same tag guard as Z2: skip `INPUT`, `SELECT`, `TEXTAREA`, contenteditable |
| O32 | 1187-1198 | `focusOnNode` fires on every `selectedNodeId` change | Read and limit |
| #13 | 166-178 | Background tap calls both `onBackgroundTap()` and `onNodeSelect(null)` | Remove `onNodeSelect(null)` from the branch, or call it only when `onBackgroundTap` is not provided |
| Z26-Z31 | 6206-6349 | `graph-interactions.ts`: two `zoomOut` implementations, `clearCycleHighlight` asymmetric with `clearHighlights`, `highlightCycle` dims everything on each call (O(n)), duplicate hover handlers, fabricated partial node, `selectNode` doesn't unselect others | One zoom helper (Z26); symmetric clear (Z27); dim only on change (Z28); remove duplicated handlers (Z29); do not fabricate nodes (Z30); unselect others (Z31) |
| #11 | 139-150 | Constellation guides never reach `FeatureOverlayCanvas` | Pass guides when `architectureMode === 'constellation'` (data side done in Phase 2.7) |
| C3, C7 | 323-340, 413-428 | Toggle buttons hidden or non-persistent if `WorkspaceShell` does not wire the callbacks | Verified in Phase 0.1 / 3 |
| M1, M2, Z32-Z36 | 479-497, 6352-6433 | `GraphControls.tsx` roving tabindex bugs, label button resets index, missing `data-testid` on 8 of 10 buttons, misleading active class | Read each; Z34 is a quick win |
| #16 | 198-200 | `useLayoutEffect` warns during SSR | Use `useEffect` or an isomorphic layout effect |

### 4.4 Rollback and observability

`C5`, `C6`, `O1`, `O2` all touch the mode-switch effect. If the fix is wrong, mode-switching breaks for every user. Two safety mechanisms before merging:

**Canary the mode-switch fix.** If a feature flag mechanism exists (`layout.modeSwitch.v2`), ship behind it and roll out 5% → 50% → 100% over a week, monitoring `app:layoutcomplete` for missing events or duration anomalies. If no flag mechanism exists, split into one commit per architecture mode (orbit, constellation, hybrid) — each independently revertable.

**Add observability alongside the fixes** so a regression is visible in production, not just in tests:

| Fix | Add | Why |
| --- | --- | --- |
| `C5` | Log `mode=<M> positions=<N> provenance=<P>` in `updateProjectState` | Detects bucket-mismatch regression |
| `O1` | Log `mount-mode=<M> loaded-positions=<N>` on `GraphView` mount | Detects persisted-position loss |
| `O2` | Log `structural-sync trigger=<T> has-existing=<B>` | Detects drag loss |
| `O8` | Emit `layout:start` / `layout:end` with `requestId` to Sentry breadcrumbs | Detects stuck `isLayoutRunning` |
| `C6` | Log `position-sync skipped (mode=<M>)` when the guard rejects | Confirms the guard is active |
| `Z28` | `performance.mark` around `highlightCycle` | Detects when it exceeds 50 ms |

These bugs are all silent. The fix is only verifiable by observing the fixed behavior. Without the observability, the fix is a leap of faith.

**Exit criteria for Phase 4:** component tests that (1) opening a project in each saved mode keeps its positions, (2) switching modes triggers exactly one layout and the final positions match the new mode, (3) dragging then adding a node keeps the drag, (4) selecting a node after selecting a finding keeps the finding highlight, (5) structural sync keeps zoom classes, (6) Escape in a `<select>` does not clear selection and Escape on the canvas does not throw.

---

## PHASE 5: Styling and UI

**Entry:** Phase 1.3 done (boolean typing known). **Goal:** selectors match, selection is visible, controls do not overflow, accessibility basics pass.

### 5.1 `graph-style.ts`

**#3 = D30 = D11** (SRC 35-50, 1869-1874, 1585-1603): boolean data fields are compared to the string `'true'`, so the rules never match. Use truthy selectors *(verbatim)*:

```ts
node[?hasCycles]
node[?hasUnresolved]
edge[?unresolved]
```

Only valid once `graph-builder.ts` is confirmed to store real booleans (Phase 0.1). If it stores strings, fix the builder instead.

**#2** (SRC 22-34): `node:selected` is declared early and later type and risk rules override its `border-color` and `border-width`. Current declaration *(verbatim)*:

```ts
{ selector: 'node:selected', style: { 'border-width': 4, 'border-color': '#3b82f6' } }
```

Fix: move it after the type and risk rules, or raise specificity (for example `node:selected[type]`). **D20** (SRC 1751-1771) is the same problem for `edge:selected` being overridden by relationship-type colors. Also see D21 (1772-1779, style cache ignores future options).

### 5.2 Controls and CSS

| ID | SRC | Problem | Action |
| --- | --- | --- | --- |
| #12 = C4 | 151-165, 341-365 | `.graph-control-btn` is fixed at 28 px but the architecture button holds a label, which overflows | Add `.graph-control-btn:has(.graph-control-btn-label) { width: auto; padding: 0 8px; }` or a dedicated `graph-control-btn--labelled` class *(verbatim suggestion)* |
| M4, O22, L5 | 505-508, 1000-1022, 566-570 | `flex-wrap` with fixed-height buttons, inline `white-space: nowrap` conflict, `max-height: max-content` not a cap | Read and fix together with #12 |
| O5 = M5 | 698-716, 509-516 | `.graph-mode-badge` has no CSS | Add styles (graph.css not provided: put in `index.css` if absent) |
| O6, Z20, M3, O37 | 717-761, 6108-6124, 498-504, 1223-1226 | Navigator double-positioned and off-canvas, hardcoded `right: 58px`, z-index stack lets the view-mode switcher cover the controls | One positioning rule; consistent z-index scale |
| Z15 | 6025-6037 | Touch targets below 44x44 | Enlarge (at least on coarse pointers) |
| Z16 | 6038-6050 | Text under 12 px | Raise sizes |
| Z17 | 6051-6072 | `--risk-critical` lighter than `--risk-high` | Swap or re-tune the tokens |
| Z18 | 6073-6086 | Muted and disabled text fails contrast | Adjust tokens to AA |
| Z19, Z21-Z25 | 6087-6203 | Grid does not scale with zoom, drawer padding, legend hidden on mobile, `transition: all` reflow, `!important` overuse, tabs lose labels at 1366 px | Read each; lower priority |

---

## PHASE 6: `App.tsx` and shared interactions

**Z1 (do first): infinite render loop** (SRC 5698-5751). Effect A clears a selection whose node type is filtered out; Effect B re-selects from the URL every render. A shared link to a hidden node freezes the tab. Make Effect B edge-triggered *(verbatim)*:

```ts
const consumedUrlRef = useRef<string | null>(null);
useEffect(() => {
  const urlNode = viewSelectedNodeId || viewUrlNodeId;
  if (!urlNode || consumedUrlRef.current === urlNode) return;
  consumedUrlRef.current = urlNode;
  ...
}, [viewSelectedNodeId, viewUrlNodeId]);
```
> **Apply only one of the two fixes above.** The `consumedUrlRef` edge-trigger and the `filterBlockedSelection` state are alternatives. Applying both creates a new deadlock where Effect B never re-runs even when filters change, and the URL cannot recover until a manual reload.

Alternative from SRC: Effect A sets a `filterBlockedSelection` state that Effect B respects.

**Z3: wrong project id in `explorer:project-changed` handler** (SRC 5777-5807). Read it from the event *(verbatim)*:

```ts
window.addEventListener('explorer:project-changed', (e) => {
  const newId = (e as CustomEvent).detail?.projectId ?? activeProjectIdRef.current;
  const projState = loadProjectState(newId);
  ...
});
```

**Z5: silent simulation commit failure** (SRC 5839-5859) *(verbatim)*:

```ts
setActiveSimulationProposal(null);
showToast({ variant: 'error', message: `Simulation could not be committed: ${validation.reason}` });
```

| ID | SRC | Action |
| --- | --- | --- |
| #17 = Z13 | 201-211, 6002-6009 | Escape effect depends on `view.focusState` object identity; destructure primitives (`view.focusState.enabled`, etc.) |
| Z2 | 5752-5776 | Done in Phase 0 |
| Z4 | 5808-5838 | Done in Phase 3 |
| Z6, Z7, Z8 | 5860-5922 | Simulation starts on the mutated graph; clearing compare focus or a finding leaves the node selected |
| Z9, Z10 | 5923-5964 | `handleResetView` is ephemeral; `simulatedGraph` uses stale `nodePositions` |
| Z11, Z12 | 5965-6001 | Safe hooks swallow errors in production; `checkIsNotAnalyzed` matches message prefixes |
| Z14 | 6010-6022 | `activeData` identity churn re-runs findings |
| Z37-Z41 | 6436-6551 | Done in Phase 0 |

**Exit criteria for Phase 6:** opening a URL with `#node=...` for a filtered-out node does not loop; switching projects applies the new project's filters; a rejected commit shows a message.

---

## PHASE 7: Tests

Write tests alongside every earlier phase (failing first). This phase closes the gaps SRC identifies in Cluster 8 (lines 5028-5688) and Z42-Z48 (lines 6552-6696). SRC's headline finding (lines 5443-5500): of the 47 bugs in Clusters 3-7, none were covered, and the two provided test files are effectively a smoke test of Cluster 6's happy path.

### 7.1 Highest-value tests

| ID | SRC | Test |
| --- | --- | --- |
| Z46 | 6662-6675 | `extractNodesAndEdgesFromCy` round-trip (added in Phase 0, turns green in Phase 1.5) |
| V23 | 5585-5600 | `computeArchitectureLayout` does not mutate its inputs. SRC calls this the single most impactful test; it fails today because of A36 |
| V5 | 5123-5160 | Satellites follow a node whose position comes from `existingPositions` (fails today because of A7) |
| V21 | 5410-5425 | `NaN` and `Infinity` in `existingPositions` are rejected (A8) |
| V22 | 5426-5442 | `Object.freeze` depth (A10, D22) |
| V19, V20 | 5379-5409 | Phantom nodes (A1); empty and single-node input |
| V24-V28 | 5601-5666 | Mode transitions; `ARCH_MODE_META` cycle validity (T15); `RISK_BORDER_COLORS` exhaustiveness (T14); `ALL_EXPLORER_NODE_TYPES` exhaustiveness (T12); node and edge field completeness across clusters |
| Z47 | 6676-6690 | Self-loop edges, code below |
| Z48 | 6691-6696 | Real `cycles` input is used (or document that it is ignored) |

Z47 test *(verbatim)*:

```ts
it('handles self-loop edges without infinite recursion', () => {
  const nodes = [createMockNode({ id: 'ApexClass:A' })];
  const edges = [createMockEdge('ApexClass:A', 'ApexClass:A')];
  const positions = computeArchitectureLayout(nodes, edges);
  expect(Number.isFinite(positions['ApexClass:A'].x)).toBe(true);
  expect(Number.isFinite(positions['ApexClass:A'].y)).toBe(true);
});
```

### 7.2 Fix weak or broken existing tests (these are why bugs shipped)

A test that passes when it should fail is worse than no test — it makes the bug invisible to reviewers and future auditors. V1-V16 are fixing the *existing* tests, not adding new ones. Read each SRC section before editing; the failure modes described there (e.g. `vi.spyOn` on a named import — V42; mock callback never invoked — V1) explain why the bug they were meant to catch shipped in the first place.


| ID | SRC | Problem | Action |
| --- | --- | --- | --- |
| V1, V2, V3 | 5036-5107 | `clearHighlights` mock never runs the `forEach` callback; test name misleading; no null-input test | Make the mock execute the callback; rename; add a null-input case |
| V4 | 5108-5122 | `duration < 3000` is flaky on CI | Remove the wall-clock assertion or use a generous relative budget |
| V6, V9, V10, V11 | 5161-5172, 5232-5282 | Weak negatives, 300 px tolerance, x-only distance, `Math.abs` hides direction | Assert Euclidean distance with tight tolerances and signed values |
| V7, V8 | 5173-5231 | Layer distinctness and bridge test only check existence | Assert distinct layers and exact bridge placement (A16) |
| V12, V13 | 5283-5302 | Determinism not tested with `existingPositions` or dense graphs | Add |
| V14, V15, V16 | 5303-5366 | Coupled to implementation; HYBRID test does not prove feature layout differs; `nodeOverlapCount === 0` trusts `evaluateLayout` | Test behavior; add an independent overlap check |
| V17, V18 | 5367-5378 | 'Test N' naming; no return-shape test | Rename; add shape test |
| Z42 | 6554-6589 | `vi.spyOn` on a named import likely does nothing, so the performance test is a silent no-op | Mock the module (`vi.mock`) or inject the dependency |
| Z43 | 6590-6609 | `mockRestore` in the test body does not run when the test fails | Move to `afterEach` or `try/finally` |
| Z44 | 6610-6628 | Microcluster test only compares relative distances | Replace with absolute thresholds (below) |
| Z45 | 6629-6661 | `createMockEdge` hardcodes `'ApexClass'` for every endpoint | Derive types from the id prefix (below) |

Z44 fix *(verbatim)*:

```ts
expect(microclusterDist).toBeLessThan(300);   // absolute threshold
expect(unrelDist).toBeGreaterThan(microclusterDist + 200);  // clear separation
```

Z45 fix *(verbatim)*:

```ts
function createMockEdge(source, target, id) {
  const sourceType = source.split(':')[0] as ExplorerNodeType;
  const targetType = target.split(':')[0] as ExplorerNodeType;
  return {
    ...
    canonical: {
      source: { type: sourceType, name: source },
      target: { type: targetType, name: target },
      ...
    },
  };
}
```

### 7.3 Missing test files

SRC lines 5502-5582 list test files that were not provided and must be checked for coverage: `GraphView.test.tsx`, `GraphView.layoutModeToggle.test.tsx`, `GraphView.positionAuthority.test.tsx`, `GraphView.runtimeIntegration.test.tsx`, `GraphControls.test.tsx`, `position-policy.test.ts`, `projectState.test.ts`, the orbit tests (adapter, dynamic-focal, layout, integration, visibility), and the constellation tests (adapter, layout, integration). Use the coverage matrix at SRC 5443-5500 to map each cluster's bugs to a test.

---

## PHASE 8: Refactors (last)

**Entry:** Phases 0-7 green. **Rules:** one extraction per commit, no behavior change, existing tests must pass unchanged.

**Z49: split `GraphView.tsx`** (SRC 6699-6721; 900+ lines, 20+ effects). Extract, in this order:

1. `useCytoscapeInit` (init, destroy, ref cleanup)
2. `useZoomLOD` (zoom handler and LOD classes)
3. `useGraphHighlights` (selection, impact, cycle, finding, focus effects)
4. `usePositionSync` (position-only sync effect)
5. `useLayoutTriggers` (initial, structural, mode-switch, reset)

**Z50: split `App.tsx`** (SRC 6722-6741; 15 effects, 10+ refs, 50+ props passed to `WorkspaceShell`): `useProjectData`, `useAppSelection` (selection, URL sync, investigation, compare), `useAppSimulation`, `useAppKeyboard`, `useAppHandoff`.

Other cleanups: T13 (4559-4596), T17 (4697-4741), T18-T20 (4742-4799), T24-T30 (4878-4965), O24 (1035-1059, unused import), A37/A45/A46/A49 (dead or duplicated code), R24 (2422-2425).
### 8.5 Hook extraction discipline (Z49, Z50)

Every bug in Clusters 1-4 lives in `GraphView.tsx` or `App.tsx`. Hook extraction that "improves" the code will re-introduce a bug that Phases 0-7 just fixed.

Rules:

1. **One hook per commit.** Never extract `useLayoutTriggers` and `useGraphHighlights` in the same commit.
2. **Screenshot every architecture mode before extraction** (`hierarchical`, `hybrid`, `orbit`, `constellation` × 2 viewports). Save in `docs/baselines/hooks/<commit-sha>/`.
3. **After extraction, pixel-diff** each mode against baseline. Zero diff expected, or the diff is documented and intentional.
4. **Any unintended diff → revert that hook**, re-investigate, re-extract.
5. **All Phase 4 component tests must pass unchanged** — no test rewrites to accommodate the extraction.

If a hook extraction requires a test change, the extraction is not behavior-preserving. Revert and re-plan.

---

## 9. Duplicate map: fix once, tick all aliases

| Bug | Aliases (SRC lines) | Fix in |
| --- | --- | --- |
| Undefined `onFocusChangeRef` | #1 (7), L2 (551), mentioned in #20, Z2 | Phase 0 |
| Triple layout on mount | #4 (51), M7 (533), part of C2 (281) | 4.2 |
| Position-only sync overwrites new mode | #6 (75), C6 (388) | 4.2 |
| Structural sync wipes classes / drags | #5 (61), O2 (614), O30 (1165) | 4.2, 4.3 |
| Zoom LOD not restored | #19 (215), O34 (1207) | 4.3 |
| Provenance dropped | #9 (117), M6 (517) | Phase 3 |
| Layout events missing | #10 (130), D27 (1855), O8 (787), O38 (1227) | 2.3, 4.2 |
| Constellation guides mislabeled | #11 (139), O13 (877) | 2.7, 4.3 |
| `useArchitectureLayout: false` ignored | #7 (92), D6 (1443) | 2.3 |
| Label overflows button | #12 (151), C4 (341), M4 (505), O22 (1000) | 5.2 |
| Escape handling | #17 (201), Z13 (6002), Z2 (5752), O7, O21, O31 | Phase 0, 4.3, 6 |
| Legacy position migration | #18 (212), H1 (431) | Phase 3 |
| `availableSuns` O(n\*e) | #15 (188), R14 (2249) | 2.5 |
| Boolean string selectors | #3 (35), D30 (1869), D11 (1585) | 5.1 |
| `Boolean('false')` | D4 (1383), D28 (1859), T10 (4463) | 1.3 |
| Extraction fabricates data | D3 (1323), T2 (4289), T4-T9, Z46 | 1.5 |
| `existingPositions` ignored in radial modes | D1 (1262), K5 (2718), X1 (4092) | 2.2 |
| Non-finite saved positions | D16 (1668), A8 (3374), X4 (4118), V21 | 2.2 |
| Shallow freeze | D22 (1780), A10 (3414), V22 | 2.1 |
| `localeCompare` | D23, R23, K23, A43, X3, Z52, #14, A35 | 1.2 |
| Sun roles / symbols differ | K11 (2877), R20 (2360) | 2.6 |
| `Position` redefined | T21 (4802), Z51 (6742), T22, T23 | 1.1 |
| Debug globals | Z37-Z39 (6436-6490), O16 (922) | Phase 0 |
| Stale-graph `discoveryResult` | O3 (649) | 4.2 |
| `.graph-mode-badge` unstyled | M5 (509), O5 (698) | 5.2 |
| Controls z-index / overlap | M3 (498), O37 (1223) | 5.2 |

## 10. Items not placed in a table above

| ID | SRC | Phase | Note |
| --- | --- | --- | --- |
| #21 = K26 | 221-223, 3084-3087 | 2.6 | `performance.now()` used without a guard; fall back to `Date.now()` when `performance` is unavailable |
| D24 | 1813-1829 | 2.1 | `activeSpatialMap` passed as `domainMap` (misleading name or wrong map) |
| D19 | 1726-1748 | 2.4 | Worker serialization of `existingPositions` |
| R21 | 2372-2378 | 2.5 | Rounding and execution-time helper |
| T27, T28, T29, T30 | 4934-4965 | 1.4 | Fields that are required by type but fabricated or always null in extraction; resolve with 1.5 |
| K9, K12, K15-K17, K19-K22, K24, K25, K27-K29 | 2827-3114 | 2.6 | Medium and low priority; read each |
| Z19, Z21-Z25 | 6087-6203 | 5.2 | CSS polish |

## 11. Final checklist

- [ ] Phase 0: unprovided files checked, answers recorded; quick wins merged; A44 assertion and Z46 test added
- [ ] Phase 1: one `Position`, one `stableCompare`, `toBool`, contract types fixed, extraction no longer fabricates; Z46 green
- [ ] Phase 2: all four modes pass the five invariants in the Phase 2 exit criteria
- [ ] Phase 3: per-mode storage, migration and provenance tests pass
- [ ] Phase 4: GraphView component tests in the Phase 4 exit criteria pass
- [ ] Phase 5: selectors match, selection visible, controls do not overflow, contrast tokens fixed
- [ ] Phase 6: Z1, Z3, Z5 fixed with tests
- [ ] Phase 7: V23, V5, V21, Z44, Z42 and the missing-test matrix closed
- [ ] Phase 8: hooks extracted with no behavior change
- [ ] Every ID in section 9 ticked for all aliases
- [ ] Re-run SRC priority tables (lines 1235-1253, 1875-1924, 2528-2547, 3129-3147, 4200-4224, 4966-5000, 5667-5689, 6754-6778) and confirm each row is closed
