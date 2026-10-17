# Feature Additions After Stabilization

Now that the bug fixes are in, the codebase is stable enough to add features. Here's a prioritized list — the first three are quick wins that convert existing infrastructure into visible user value. The rest are structured by effort.

---

## Tier 1 — Quick wins that leverage existing infrastructure (2-4 hours total)

### F1. Path finder between two nodes (~80 lines)

**Why:** The single most-requested workflow for a dependency analyzer. "How does `FooController` end up calling `BarService`?" Currently you have to trace edges manually.

**What you already have:** `cy.neighborhood('node')`, `highlightNodeConnections`, `clearHighlights`, `dimmed` class.

**New code in `graph-interactions.ts`:**

```ts
export function findShortestPath(
  cy: cytoscape.Core,
  sourceId: string,
  targetId: string,
  direction: 'forward' | 'reverse' | 'both' = 'forward'
): cytoscape.NodeSingular[] | null {
  const source = cy.getElementById(sourceId);
  const target = cy.getElementById(targetId);
  if (!source.length || !target.length) return null;
  if (sourceId === targetId) return [source];

  const visited = new Set<string>([sourceId]);
  const pred = new Map<string, cytoscape.NodeSingular>();
  const queue: cytoscape.NodeSingular[] = [source];

  while (queue.length > 0) {
    const curr = queue.shift()!;
    const neighbors = direction === 'forward' ? curr.outgoers('node')
                    : direction === 'reverse' ? curr.incomers('node')
                    : curr.union(curr.outgoers('node')).union(curr.incomers('node'));

    if (curr.id() === targetId) {
      const path: cytoscape.NodeSingular[] = [];
      let node: cytoscape.NodeSingular | undefined = curr;
      while (node) {
        path.unshift(node);
        node = pred.get(node.id());
      }
      return path;
    }

    neighbors.forEach((neighbor) => {
      const n = neighbor as cytoscape.NodeSingular;
      if (!visited.has(n.id())) {
        visited.add(n.id());
        pred.set(n.id(), curr);
        queue.push(n);
      }
    });
  }
  return null;
}

export function highlightPath(cy: cytoscape.Core, path: cytoscape.NodeSingular[]): void {
  cy.batch(() => {
    clearHighlights(cy);
    cy.elements().addClass('dimmed');
    for (let i = 0; i < path.length; i++) {
      path[i].removeClass('dimmed').addClass('path-highlighted');
      if (i < path.length - 1) {
        const connectors = path[i].edgesTo(path[i + 1]).addClass('path-highlighted');
        connectors.removeClass('dimmed');
      }
    }
  });
}
```

**Style addition in `graph-style.ts`:**

```ts
{ selector: 'node.path-highlighted', style: {
  'border-width': 5, 'border-color': '#22d3ee', 'opacity': 1,
}},
{ selector: 'edge.path-highlighted', style: {
  'width': 5, 'line-color': '#22d3ee', 'target-arrow-color': '#22d3ee',
  'opacity': 1, 'line-style': 'solid', 'z-index': 999,
}},
```

**UI:** Add a "Find path" toggle to `GraphControls`. When active, `GraphView` switches to "path mode":

```tsx
const [pathMode, setPathMode] = useState<{ sourceId: string | null; targetId: string | null } | null>(null);

const handleNodeClickInPathMode = (nodeId: string) => {
  if (!pathMode) return;
  if (!pathMode.sourceId) {
    setPathMode({ sourceId: nodeId, targetId: null });
    announce(`Source: ${nodeId}. Select destination.`);
  } else if (!pathMode.targetId) {
    const path = findShortestPath(cy, pathMode.sourceId, nodeId);
    if (path) {
      highlightPath(cy, path);
      announce(`Found path of ${path.length} nodes.`);
    } else {
      announce('No path between the selected nodes.');
    }
    setPathMode(null);
  }
};
```

**Payoff:** Users go from "trace 6 edges by eye" to "click source, click target, done."

---

### F2. Deep link to a specific node via URL hash (~15 lines)

**Why:** You already sync `arch` and `layout` to `location.hash`. Extend it to the selected node so people can share "look at this class" links.

**Add in `GraphView.tsx` init effect, after `cy` is created:**

```ts
const initialNodeFromHash = new URLSearchParams(window.location.hash.slice(1)).get('node');
if (initialNodeFromHash && nodesRef.current.some(n => n.id === initialNodeFromHash)) {
  const node = nodesRef.current.find(n => n.id === initialNodeFromHash)!;
  onSelectNodeRef.current(node);
  const ele = cy.getElementById(initialNodeFromHash);
  if (ele.length > 0) {
    cy.animate({ center: { eles: ele }, zoom: 1.5 }, { duration: prefersReducedMotion ? 0 : 400 });
  }
}
```

**Add a selection-sync effect:**

```tsx
useEffect(() => {
  if (typeof window === 'undefined') return;
  const params = new URLSearchParams(window.location.hash.slice(1));
  if (selectedNodeId) params.set('node', selectedNodeId);
  else params.delete('node');
  const nextHash = `#${params.toString()}`;
  if (window.location.hash !== nextHash) {
    window.history.replaceState(null, '', nextHash);
  }
}, [selectedNodeId]);
```

**Payoff:** `#node=ApexClass/AccountTriggerHandler` becomes a shareable link. Combined with `#arch=orbit`, you can construct "look at this specific scenario" URLs for reviews.

---

### F3. Copy node path / edge location to clipboard (~30 lines)

**Why:** Every time you hover a node, you copy the file path manually. Every time you hover an edge, you open VS Code to find the line. Both are one keystroke away from being automatic.

**Add to `NodeHoverCard.tsx` and `EdgeHoverCard.tsx` a small icon button:**

```tsx
<button
  type="button"
  className="hover-card-copy"
  aria-label="Copy file path"
  onClick={(e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(node.file);
  }}
  title="Copy file path"
>
  📋
</button>
```

For edges, copy `${edge.file}:${edge.line}`. Show a brief "Copied!" toast.

**Better:** Add keyboard shortcuts in `GraphView.handleKeyDown`:

```ts
} else if (e.key === 'c' && e.shiftKey && selectedNodeId) {
  const node = nodes.find(n => n.id === selectedNodeId);
  if (node) {
    navigator.clipboard.writeText(node.file);
    announce(`Copied ${node.file}`);
  }
} else if (e.key === 'c' && e.shiftKey && selectedEdgeId) {
  const edge = edges.find(e => e.id === selectedEdgeId);
  if (edge) {
    navigator.clipboard.writeText(`${edge.file}:${edge.line}`);
    announce('Copied location');
  }
}
```

**Payoff:** Reduces friction for the most common post-analysis action — "go to the file."

---

## Tier 2 — Medium features (half-day each)

### F4. Browser-style back/forward navigation (~50 lines + 1 hook)

**Why:** `drillPath` exists but only tracks drill-down. Users also want "go back to the node I was just looking at" after exploring away. Browsers solved this decades ago.

**New hook `useNavigationHistory<T>`:**

```ts
export function useNavigationHistory<T>(maxSize = 50) {
  const [stack, setStack] = useState<T[]>([]);
  const [index, setIndex] = useState(-1);

  const push = useCallback((value: T) => {
    setStack(prev => {
      const next = [...prev.slice(0, index + 1), value];
      if (next.length > maxSize) next.shift();
      setIndex(next.length - 1);
      return next;
    });
  }, [index, maxSize]);

  const back = useCallback(() => index > 0 ? setIndex(i => i - 1) : undefined, [index]);
  const forward = useCallback(() => index < stack.length - 1 ? setIndex(i => i + 1) : undefined, [index, stack.length]);

  return {
    current: stack[index] ?? null,
    push, back, forward,
    canGoBack: index > 0,
    canGoForward: index < stack.length - 1,
  };
}
```

**Wire in `GraphView`:** push `selectedNodeId` to history in the selection effect; the `.current` value drives `onSelectNode`. Bind `Alt+←` / `Alt+→` in `handleKeyDown`.

**Payoff:** Users explore graphs by jumping around. Being able to retrace steps is a foundational UX primitive.

---

### F5. Quick filter chips in the toolbar (~60 lines)

**Why:** The full filter panel is a modal. For 80% of filter tasks, users want one-click access to "High risk only" or "Apex only." Chips give that without a modal.

**Add `QuickFilters` inside `GraphControls`:**

```tsx
const QUICK_FILTERS = [
  { key: 'high-risk', label: '⚠ High Risk', predicate: (n: ExplorerNode) => n.risk === 'HIGH' },
  { key: 'apex-only', label: 'Apex', predicate: (n: ExplorerNode) => n.type === 'ApexClass' || n.type === 'ApexTrigger' },
  { key: 'no-tests', label: 'No tests', predicate: (n: ExplorerNode) => n.behavior.testCoverageStatus === 'NO_TESTS' },
  { key: 'cycles', label: 'In cycles', predicate: (n: ExplorerNode) => n.refactoringReadiness.hasCycles },
  { key: 'unresolved', label: 'Unresolved', predicate: (n: ExplorerNode) => n.riskReasons.includes('unresolved') },
];
```

`App.tsx` holds `activeQuickFilters: Set<string>`, applies them as an additional filter stage after `visibleActiveData`:

```ts
const quickFilteredData = useMemo(() => {
  if (activeQuickFilters.size === 0) return visibleActiveData;
  const predicates = QUICK_FILTERS.filter(f => activeQuickFilters.has(f.key)).map(f => f.predicate);
  const nodes = visibleActiveData?.nodes.filter(n => predicates.some(p => p(n))) ?? [];
  const ids = new Set(nodes.map(n => n.id));
  const edges = visibleActiveData?.edges.filter(e => ids.has(e.source) && ids.has(e.target)) ?? [];
  return { ...visibleActiveData, nodes, edges };
}, [visibleActiveData, activeQuickFilters]);
```

**Payoff:** "Show me only High Risk Apex classes with no tests" goes from 6 clicks in a modal to 3 clicks on chips.

---

### F6. Export current view as PNG/SVG (~25 lines)

**Why:** People want to paste graphs into PRs, docs, and Slack. Cytoscape has this built in — you're one button away.

**Add to `GraphControls` workspace section:**

```tsx
<button
  className="graph-control-btn"
  onClick={() => {
    if (!cyRef.current) return;
    const png = cyRef.current.png({ full: true, scale: 2, bg: '#0f172a' });
    const link = document.createElement('a');
    link.href = png;
    link.download = `architecture-${architectureMode}-${Date.now()}.png`;
    link.click();
  }}
  title="Export as PNG"
  aria-label="Export as PNG"
  type="button"
>
  <span aria-hidden>📸</span>
</button>
```

**Payoff:** One-click shareable image. Combined with the deep link (F2), you can post "here's the URL, here's the screenshot."

---

### F7. Keyboard shortcut help modal (~40 lines)

**Why:** You have at least 10 shortcuts (f, 0, +, -, Escape, arrows, ?, Alt+←/→, Shift+C, Ctrl+K). No one discovers them. A `?` triggered modal makes the graph keyboard-accessible in practice, not just theory.

**New component `KeyboardShortcutsModal.tsx`:**

```tsx
const SHORTCUTS = [
  { group: 'Navigation', items: [
    { keys: ['+', '='], action: 'Zoom in' },
    { keys: ['-'], action: 'Zoom out' },
    { keys: ['f', '0'], action: 'Fit to screen' },
    { keys: ['Arrow keys'], action: 'Jump to neighbor' },
    { keys: ['Alt', '←'], action: 'Back in history' },
    { keys: ['Alt', '→'], action: 'Forward in history' },
  ]},
  { group: 'Selection', items: [
    { keys: ['Click'], action: 'Select node / edge' },
    { keys: ['Shift', 'Click'], action: 'Add to selection' },
    { keys: ['Escape'], action: 'Clear selection' },
    { keys: ['?'], action: 'Show shortcuts' },
  ]},
  { group: 'Actions', items: [
    { keys: ['Shift', 'C'], action: 'Copy file path' },
    { keys: ['⌘', 'K'], action: 'Command palette' },
  ]},
];
```

Trigger on `?` in `GraphView.handleKeyDown`. The modal is trivial.

**Payoff:** Makes keyboard navigation discoverable. Combined with the `aria-live` announcer you already have, keyboard users can actually drive the whole app.

---

## Tier 3 — Larger features (1-2 days, high impact)

### F8. Diff view between two project snapshots

**Why:** You already have `ProjectSnapshot`, `ProjectAnalysisHistory`, and `committedMutatedGraph`. A diff view is the natural next step: "What changed between last Tuesday's analysis and today?"

**Approach:**
- Add a "Compare with snapshot" action.
- Compute node/edge diff: added, removed, unchanged.
- Apply diff classes in graph: `.diff-added`, `.diff-removed`, `.diff-modified`.
- Add a summary bar: "+12 nodes, -3 edges, 2 new cycles."

**Effort is mostly in the diff computation** (`lib/graph-diff.ts`), which is straightforward set-diff on node/edge IDs with a "modified" pass comparing metrics.

**Payoff:** Architects can show "here's what we changed this sprint" in a single screenshot.

---

### F9. Unified highlight state machine (kills an entire bug class)

**Why:** Bugs 1, 4, 11, 21 all stem from the same root cause — **each highlight helper (`highlightNodeConnections`, `focusOnNode`, `highlightCycle`, impact effect, simulation effect, finding effect) independently applies its own `dimmed` class, and no single owner is responsible for clearing it.**

The current design guarantees that any combination of highlights produces residue.

**Better design — one state, one render:**

```ts
type HighlightState =
  | { kind: 'none' }
  | { kind: 'selection'; nodeId: string }
  | { kind: 'focus'; nodeId: string; depth: number; direction: Direction }
  | { kind: 'path'; path: string[] }
  | { kind: 'cycle'; cycleNodeIds: string[] }
  | { kind: 'impact'; originNodeId: string; affectedNodeIds: Set<string> }
  | { kind: 'finding'; nodeIds: string[]; edgeIds: string[] }
  | { kind: 'simulation'; addedIds: string[]; removedIds: string[] };

function deriveVisualClasses(state: HighlightState, cy: cytoscape.Core): Map<string, string[]> {
  // Compute, for every element, exactly which classes it SHOULD have
  // Based on the single authoritative state.
  // No incremental add/remove — always recompute from source of truth.
}

function applyHighlightState(cy: cytoscape.Core, state: HighlightState) {
  cy.batch(() => {
    const wanted = deriveVisualClasses(state, cy);
    cy.elements().forEach(ele => {
      const nextClasses = new Set(wanted.get(ele.id()) ?? []);
      // Remove classes not in nextClasses
      ele.classes().forEach(cls => {
        if (isVisualClass(cls) && !nextClasses.has(cls)) ele.removeClass(cls);
      });
      // Add missing
      nextClasses.forEach(cls => ele.addClass(cls));
    });
  });
}
```

Every effect now dispatches a state; one effect applies it. No more cross-effect residue.

**Payoff:** Eliminates the entire class of "why is this node still dimmed" bugs. Also makes adding new highlight modes trivial (add a variant to the union, extend `deriveVisualClasses`).

---

### F10. Graph command palette integration

**Why:** You already have `useCommandPalette`. Add graph-specific commands so power users can drive the whole graph without a mouse:

```ts
const graphCommands = [
  { id: 'graph.focus-node', label: 'Focus on selected node', run: () => setFocusState({ enabled: true, focusNodeId: selectedNodeId, depth: 2, direction: 'both' }) },
  { id: 'graph.find-path', label: 'Find path from selected to...', run: () => setPathMode({ sourceId: selectedNodeId, targetId: null }) },
  { id: 'graph.impact', label: 'Show impact of selected node', run: () => { setImpactOrigin(selectedNodeId); } },
  { id: 'graph.copy-path', label: 'Copy selected node file path', run: () => copySelectedPath() },
  { id: 'graph.export-png', label: 'Export current view as PNG', run: () => exportPNG() },
  { id: 'graph.isolate-neighbors', label: 'Isolate neighbors of selected node', run: () => isolateNeighbors(selectedNodeId) },
  { id: 'graph.reverse-direction', label: 'Show dependents (not dependencies)', run: () => toggleDirection() },
];
```

**Payoff:** The command palette becomes the "do anything" surface. Users who learn 3 shortcuts can drive the app at speed.

---

## What NOT to add (even though they sound good)

| Feature | Why skip |
|---------|---------|
| **Time-travel scrubber on snapshots** | Requires snapshot storage architecture you don't have. F8 (diff) delivers 80% of the value with 20% of the effort. |
| **Graph database backend** | Cytoscape is already handling your scale. Don't move data out of `explorer-data.json` until you have evidence of a bottleneck. |
| **Real-time multi-user collaboration** | Enormous complexity for a tool that's usually single-user. The detached-drawer BroadcastChannel is already clever enough. |
| **AI-based refactoring suggestions** | You have rule-based findings. Adding LLM suggestions requires prompt engineering, cost modeling, error handling — not worth it until the rules plateau. |
| **Custom graph layouts (force-directed options menu)** | You have 4 layouts. Users can't evaluate a 5th without knowing graph theory. Add layouts only if a specific user asks. |
| **Drag-and-drop node creation** | This is an *analyzer*, not a *designer*. Don't let users edit the graph. |
| **3D graph view** | Sizzle, not steak. Adds GPU cost, breaks a11y, and doesn't help dependency analysis. |
| **Web worker for discovery** | Already in Tier 2 deferred. Only add when profiling shows it's a bottleneck. |

---

## Recommended order

If I were sequencing this:

1. **F1** (path finder) — biggest UX win, ~80 lines, uses existing primitives.
2. **F3** (copy to clipboard) — trivial, immediate payoff.
3. **F2** (deep link) — 15 lines, makes everything shareable.
4. **F9** (unified highlight state) — refactor before it grows. Pays off the bug budget you already spent.
5. **F4** (back/forward history) — natural user expectation.
6. **F7** (shortcut modal) — makes F1-F4 discoverable.
7. **F5** (quick filters) — reduces modal friction.
8. **F6** (PNG export) — one button, one win.
9. **F10** (command palette) — glues everything together.
10. **F8** (diff view) — start when F9 is stable and users have asked for it.

**F9 before F1-F5** if you're feeling disciplined — it prevents five new features from re-introducing the same highlight bugs you just fixed. **F1-F3 before F9** if you want visible wins first and are willing to migrate them to the new highlight system later.

---

## The meta point

The reason F1–F7 are worth adding is that **you already built the primitives.** `focusState` with depth, `impactResult`, `selectedCycleNodeIds`, `useCommandPalette`, URL hash sync, per-mode session positions, `highlightNodeConnections` — these are feature *ingredients* that are currently only half-consumed. Path finder, deep link, back/forward, and quick filters each take an existing primitive and expose it in the UI. They're not new subsystems — they're the last 10% of subsystems you already have.

That's the highest-leverage place to add code right now: **surface what's already built**, not add new depth.
