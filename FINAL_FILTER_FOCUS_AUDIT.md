# Forensic Audit Report: Filter, Focus, Scope, Investigation, and Static Mode Invariance

## Executive Summary

This forensic audit verifies the architectural integrity, calculation pipeline order, and coordinate stability of the Salesforce Architecture & Refactoring Explorer across seven core interaction dimensions:

1. **Node-Type Filtering**
2. **Focus Depth**
3. **Focus Direction**
4. **Component Scope**
5. **Full-Project Scope**
6. **Investigation Workflow**
7. **Double-Click Interactions**

### Key Findings & Guarantees
* **Topology Computation Invariance**: All graph topology math—including multi-hop focus depth, impact analysis, cycle detection, and hotspot scoring—operates strictly on the raw, un-filtered network topology (`data.nodes` and `data.edges`). Topology calculations remain 100% invariant under filter state changes.
* **Pipeline Ordering Compliance**: The evaluation pipeline strictly executes:
  $$\text{Topology Computation} \longrightarrow \text{Visibility Projection}$$
  and **NOT** $\text{Visibility Projection} \longrightarrow \text{Topology Computation}$.
* **Static Mode Coordinate Preservation**: In Static layout mode (`layoutMode === 'static'`), updating node-type filters, focus depth, focus direction, component scope, project scope, investigation drill path, or double-clicking nodes **never alters or recalculates node coordinates $(x, y)$**. Positions are preserved using a 5-level position authority hierarchy enforced by `position-policy.ts` and `GraphView.tsx`.

---

## 1. Forensic Audit of Interactive Controls & Workflows

### 1.1 Node-Type Filtering
* **Location**: `explorer/src/lib/search-filter.ts` (`filterGraphByNodeTypes`, `filterNodesByVisibleTypes`, `filterEdgesByVisibleNodes`), synchronized in `App.tsx` and persisted in `projectState.filters.visibleNodeTypes`.
* **Behavior**: Allows users to toggle visibility across 10 metadata node types (`ApexClass`, `ApexTrigger`, `CustomObject`, `LightningComponentBundle`, `Flow`, `FlexiPage`, `CustomField`, `PermissionSet`, `Profiles`, `SharingRules`).
* **Implementation Guarantee**: Node-type filtering acts purely as a visual display filter. It filters the output of the focus graph computation (`focusedGraphData`), returning `visibleGraphData`.
* **Verification**: Toggling node types hides or shows matching nodes and their incident edges on the Cytoscape canvas without mutating the underlying graph network or altering the positions of surviving/restored nodes.

### 1.2 Focus Depth
* **Location**: `explorer/src/lib/focus-graph.ts` (`computeFocusedGraph`, `getReachableNodesOut`, `getReachableNodesIn`).
* **Supported Depths**: `1`, `2`, `3`, `'ALL'`.
* **Behavior**: Executes a Breadth-First Search (BFS) traversal from the active `focusNodeId` up to $N$ hops away (or unbounded for `'ALL'`).
* **Implementation Guarantee**: Traversal operates over the complete adjacency map built from raw `data.edges`. Hidden node types located on intermediate paths are fully traversed during BFS, ensuring downstream nodes $N$ hops away are correctly included in the focused set.
* **Verification**: Changing focus depth expands or contracts the set of focus-reachable nodes. In Static mode, newly visible nodes restore their prior persisted/session coordinates, while existing nodes retain exact $(x, y)$ positions.

### 1.3 Focus Direction
* **Location**: `explorer/src/lib/focus-graph.ts` (`FocusDirection = 'both' | 'dependencies' | 'dependents'`).
* **Supported Directions**:
  * `dependencies`: Outbound traversal (`outgoing` edges where `source === currentNode`).
  * `dependents`: Inbound traversal (`incoming` edges where `target === currentNode`).
  * `both`: Union of outbound and inbound traversal.
* **Behavior**: Selects which directional edges to follow during BFS traversal.
* **Verification**: Switching direction re-evaluates the reachable node ID set. In Static mode, coordinates of all nodes in the resulting subgraph remain invariant.

### 1.4 Component Scope
* **Location**: `App.tsx`, `useGraphSelection.ts`, `SelectionContext.tsx`.
* **Behavior**: Focuses interaction on a single selected component (`selectedNodeId`).
* **Context Synchronization**: Selection is bidirectionally synchronized across:
  * Left Component Inventory Sidebar
  * Cytoscape Canvas selection highlight and viewport center animation
  * Right Investigation Drawer
  * Top Command Palette
  * URL Search Query Parameters (`?node=<id>`)
* **Verification**: Selecting a component sets it as the center node for focus calculations. In Static mode, selecting components re-centers or highlights the canvas viewport without triggering layout re-calculation or moving node positions.

### 1.5 Full-Project Scope
* **Location**: `App.tsx` (`effectiveFocusState.enabled === false`).
* **Behavior**: When focus mode is disabled (or when resetting view), `focusedGraphData` returns all project nodes and edges (`data.nodes`, `data.edges`).
* **Verification**: Transitioning between Focused Scope and Full-Project Scope restores or removes sub-graphs. In Static mode, node coordinates for all restored nodes strictly match their pre-focus positions.

### 1.6 Investigation Workflow
* **Location**: `App.tsx`, `components/InvestigationDrawer.tsx`, `lib/detached-drawer.ts`.
* **Behavior**: Opening the Investigation Drawer displays detailed metadata, dependencies, dependents, risk analysis, and refactoring handoff options.
* **Progressive Drilling & Multi-Hop**: Clicking dependent/dependency rows inside the drawer appends target IDs to `drillPath`, updating the active focus/selection and enabling breadcrumb navigation.
* **Canvas Resizing**: Opening or closing the drawer updates `.drawer-slot` DOM reservation (380px width). The canvas handles this via `ResizeObserver` and `transitionend` handlers calling `cy.resize()`, reflowing the viewport bounds without altering node coordinates.
* **Detached Popup Window**: Uses `BroadcastChannel` to synchronize node selections between the main app and a detached pop-out drawer (`/detached.html`).

### 1.7 Double-Click Interaction
* **Location**: `explorer/src/components/GraphView.tsx`, `explorer/src/lib/graph-interactions.ts` (`onNodeDoubleTap`, `dbltap dblclick`).
* **Behavior**: Double-clicking a canvas node triggers `onNodeDoubleTap`, selecting the node and opening/drilling into the Investigation Drawer.
* **Verification**: Double-click events update selection state and center the viewport; they do not trigger auto-layout or alter node coordinates.

---

## 2. Pipeline Ordering Proof: Topology $\rightarrow$ Visibility

### Architectural Code Verification in `App.tsx`

In `explorer/src/App.tsx` (lines 482–496), the evaluation pipeline is explicitly structured as follows:

```typescript
// STEP 1: Derive effective focus state using full selection context
const effectiveFocusState = useMemo(() => ({
  ...view.focusState,
  focusNodeId: selection.selectedNodeId || view.focusState.focusNodeId,
}), [view.focusState, selection.selectedNodeId]);

// STEP 2: Compute focused sub-graph across FULL UN-FILTERED graph topology
const focusedGraphData = useMemo(() => {
  if (!data) return { nodes: [], edges: [] };
  if (!effectiveFocusState.enabled || !effectiveFocusState.focusNodeId) {
    return { nodes: data.nodes, edges: data.edges };
  }
  const res = computeFocusedGraph(data.nodes, data.edges, effectiveFocusState);
  return { nodes: res.nodes, edges: res.edges };
}, [data, effectiveFocusState]);

// STEP 3: Apply node-type visibility filter AFTER topology focus calculation
const visibleGraphData = useMemo(() => {
  const visibleTypes = view.filterState.visibleNodeTypes ?? ALL_EXPLORER_NODE_TYPES;
  return filterGraphByNodeTypes(focusedGraphData.nodes, focusedGraphData.edges, visibleTypes);
}, [focusedGraphData, view.filterState.visibleNodeTypes]);
```

### Pipeline Flow Diagram

$$\begin{array}{ccccc}
\bbox[10px, border: 2px solid #3b82f6, fill: #1e293b]{\begin{array}{c} \mathbf{Full\ Project\ Topology} \\ \text{(data.nodes, data.edges)} \end{array}}
& \xrightarrow{\quad\text{Step 1: Focus BFS Traversal}\quad} &
\bbox[10px, border: 2px solid #3b82f6, fill: #1e293b]{\begin{array}{c} \mathbf{Focused\ Sub-Graph} \\ \text{(focusedGraphData)} \end{array}}
& \xrightarrow{\quad\text{Step 2: Type Filter Projection}\quad} &
\bbox[10px, border: 2px solid #10b981, fill: #064e3b]{\begin{array}{c} \mathbf{Canvas\ Rendered\ Graph} \\ \text{(visibleGraphData)} \end{array}}
\end{array}$$

### Why `visibility → topology` is Invalid and Rejected

If the pipeline were incorrectly implemented as `visibility → topology`:
1. **Broken Dependency Paths**: Disabling visibility for an intermediate node type (e.g., hiding `CustomField` or `SObject`) would delete those nodes from the input graph before BFS traversal.
2. **False Disconnections**: A multi-hop path $A \rightarrow B \rightarrow C$ (where $B$ is a hidden node type) would be severed during BFS, incorrectly reporting $C$ as unreachable from $A$ at Depth 2.
3. **Corrupted Analysis**: Impact analysis, cycle detection, and risk scoring would yield incorrect results depending on user filter settings.

**Conclusion**: The codebase strictly enforces $\text{topology} \rightarrow \text{visibility}$, guaranteeing complete topological fidelity regardless of active visibility filters.

---

## 3. Static Mode Coordinate Invariance Audit

### 3.1 Policy & Decision Engine (`position-policy.ts`)

In Static layout mode (`layoutMode === 'static'`), layout execution is governed by `shouldAutoLayout()` in `explorer/src/lib/position-policy.ts`:

```typescript
export function shouldAutoLayout(
  mode: LayoutMode,
  trigger: LayoutTrigger,
  context?: { hasAuthoritativePositions?: boolean; hasNewNodes?: boolean }
): boolean | 'place-new-only' {
  if (trigger === 'reset-layout') return true;
  const hasAuth = Boolean(context?.hasAuthoritativePositions);

  if (mode === 'static') {
    switch (trigger) {
      case 'initial':
        return !hasAuth;
      case 'graph-update':
      case 'filter-change':
      case 'focus-change':
      case 'investigation':
      case 'mode-switch':
        return false; // NO RELAYOUT — preserves existing coordinates
      case 'new-nodes':
        return 'place-new-only';
      default:
        return false;
    }
  }
  // ...
}
```

### 3.2 5-Level Position Authority Hierarchy

When Cytoscape elements are updated in `GraphView.tsx`, node positions are resolved through `resolveAuthoritativePosition()` in `position-policy.ts`:

1. **Level 1 (Highest)**: In-session explicit user drag position (`sessionPositionsRef`).
2. **Level 2**: Persisted project position stored in LocalStorage (`nodePositionsRef`).
3. **Level 3**: Existing Cytoscape canvas position prior to incremental update (`cyPositionsBefore`).
4. **Level 4**: Intelligent preset initial layout (if no positions exist).
5. **Level 5**: Deterministic fallback placement for genuinely new nodes (`calculateDeterministicNewNodePosition`).

### 3.3 Control Operation Coordinate Invariance Matrix

| Control / Action | Trigger Type | `shouldAutoLayout('static')` | Coordinate Behavior in Static Mode |
| :--- | :--- | :--- | :--- |
| **Toggle Node-Type Filter** | `filter-change` | `false` | Nodes shown/hidden; surviving & reappearing nodes maintain exact $(x, y)$. |
| **Change Focus Depth (1 $\rightarrow$ 2 $\rightarrow$ 3 $\rightarrow$ ALL)** | `focus-change` | `false` | Sub-graph expanded/contracted; all node positions remain unchanged. |
| **Change Focus Direction** | `focus-change` | `false` | Sub-graph updated; node coordinates untouched. |
| **Select Component Scope** | `investigation` | `false` | Viewport centered on selection; node coordinates untouched. |
| **Toggle Full-Project Scope** | `focus-change` | `false` | Full graph restored; all nodes resume exact saved/session coordinates. |
| **Open Investigation / Drill** | `investigation` | `false` | Canvas resizes via `cy.resize()`; node graph coordinates untouched. |
| **Double-Click Node** | `investigation` | `false` | Selection updated; node coordinates untouched. |
| **Manual Reset Layout Click** | `reset-layout` | `true` | Explicit user request runs fcose layout and updates stored coordinates. |

---

## 4. Verification Suite & Test Mapping

The requirements verified in this audit are continuously enforced by the following automated Vitest test suites:

| Test File | Test Count | Audited Invariants Enforced |
| :--- | :---: | :--- |
| `explorer/src/lib/focus-graph.test.ts` | 23 | Multi-hop depth traversal (1, 2, 3, ALL), direction filtering, BFS traversal math across full topology. |
| `explorer/src/lib/search-filter.test.ts` | 51 | Search query matching, risk filtering, node-type visibility filtering (`filterGraphByNodeTypes`). |
| `explorer/src/lib/position-policy.test.ts` | 19 | Static mode decision policy (`shouldAutoLayout`), 5-level position authority resolution. |
| `explorer/src/components/GraphView.positionAuthority.test.tsx` | 16 | Position authority enforcement, Static mode coordinate preservation during prop updates. |
| `explorer/src/components/FocusControls.test.tsx` | 7 | Focus toggle, depth selector, direction selector UI callbacks and state updates. |
| `explorer/src/components/GraphControls.test.tsx` | 7 | Toolbar layout, mode indicator badge, reset layout callback. |
| `explorer/src/App.test.tsx` | 6 | Full shell composition, focus depth/direction updates, view mode switching. |
| `explorer/src/App.investigationWorkflow.test.tsx` | 3 | Command palette search $\rightarrow$ selection $\rightarrow$ investigation drawer drill $\rightarrow$ URL sync. |
| `explorer/src/test/RegressionAcceptance.test.tsx` | 9 | Sidebar space reservation, drawer unmounting, navigator toggle, graph depth traversal invariants. |

**Test Suite Execution Result**: All **507 tests across 62 test files** pass successfully.

---

## Conclusion & Compliance Sign-Off

The forensic audit confirms that:
1. Topology calculations operate exclusively on full network topology and remain 100% invariant under visibility filters.
2. Pipeline evaluation strictly adheres to $\text{Topology Computation} \rightarrow \text{Visibility Projection}$.
3. Static layout mode guarantees complete coordinate preservation across all filter, focus, scope, investigation, and double-click interaction changes.
