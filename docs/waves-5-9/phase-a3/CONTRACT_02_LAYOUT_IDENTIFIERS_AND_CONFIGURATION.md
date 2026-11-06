# Contract 02: Layout Identifiers & Layout Engine Configuration

## 1. Document Control & Identification
- **Contract ID**: `CONTRACT-02`
- **Contract Name**: Layout Identifiers & Layout Engine Configuration
- **Version**: `1.0.0`
- **Status**: `FROZEN`
- **Purpose**: Establishes canonical layout identifiers, configuration parameters, coordinate contracts, and fallback behaviors across Cytoscape and algorithmic layout engines.
- **Affected Tasks**: `W5-1`, `W5-2`, `W5-3`, and downstream integration consumers (`INT-1`)
- **Affected Workstreams**: Workstream A (Wave 5) and Integration Coordinator

---

## 2. Source-of-Truth References
1. `scratch/salesforce-poc/force-app/main/default/lwc/daLayoutEngine/daLayoutEngine.js` (Implemented algorithms: `computeArchitectureLayout`, `computeOrbitLayout`, `computeConstellationLayout`, `computeSankeyLayout`).
2. `scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.js` (Layout selector dispatching, Cytoscape layout bindings).
3. `scratch/salesforce-poc/force-app/main/default/objects/DA_User_Preference__c/fields/Active_Layout_Mode__c.field-meta.xml` (Pickist/string persistence for layout mode).
4. `scratch/salesforce-poc/tests/run-workstream-a-tests.cjs` (Workstream A baseline layout assertions).

---

## 3. Canonical Layout Identifiers & Casing

Layout identifiers stored in preferences and dispatched through events MUST use the following lowercase alphanumeric keys:

| Canonical ID | User-Facing Label | Engine Type | Implemented in Baseline? | Task Owner |
| :--- | :--- | :--- | :--- | :--- |
| `grid` | Grid Layout | Cytoscape built-in | Yes (`daGraphViewer.js`) | W5-1 |
| `circle` | Circle Layout | Cytoscape built-in | Yes (`daGraphViewer.js`) | W5-1 |
| `breadthfirst` | Hierarchical Layout | Cytoscape built-in | Yes (`daGraphViewer.js`) | W5-1 |
| `dagre` | Directed Graph (Dagre) | External / Bundled | No (Dagre absent from LWC) | W5-1 / Coordinator |
| `orbit` | Orbit Layout | Algorithmic (`daLayoutEngine`) | Yes (`computeOrbitLayout`) | W5-2 |
| `constellation` | Constellation Layout | Algorithmic (`daLayoutEngine`) | Yes (`computeConstellationLayout`) | W5-2 |
| `sankey` | Sankey Flow Layout | Algorithmic (`daLayoutEngine`) | Yes (`computeSankeyLayout`) | W5-3 |
| `architecture` | Architecture Layered | Algorithmic (`daLayoutEngine`) | Yes (`computeArchitectureLayout`) | Baseline / W5-2 |

**Distinction Notice**: `orbit` is a **graph layout** positioning nodes in concentric celestial orbits around a central hub node. It is **NOT** related to the `radar` multi-dimensional analytical view (Contract 03).

---

## 4. Layout Configuration Schemas

### 4.1 Cytoscape Native Layouts (`grid`, `circle`, `breadthfirst`)
Native layouts accept standard Cytoscape layout configuration blocks:
```javascript
export const CYTOSCAPE_LAYOUT_DEFAULTS = {
  grid: {
    name: 'grid',
    fit: true,
    padding: 30,
    avoidOverlap: true,
    nodeDimensionsIncludeLabels: true
  },
  circle: {
    name: 'circle',
    fit: true,
    padding: 30,
    avoidOverlap: true,
    radius: undefined,
    startAngle: 3/2 * Math.PI,
    counterclockwise: false
  },
  breadthfirst: {
    name: 'breadthfirst',
    fit: true,
    directed: true,
    padding: 30,
    spacingFactor: 1.25,
    avoidOverlap: true
  }
};
```

### 4.2 Orbit Layout Configuration (`computeOrbitLayout`)
Positions nodes in concentric rings around a specified center entity or the highest-degree hub:
```typescript
export interface OrbitLayoutConfig {
  centerNodeId?: string;       // If omitted, computes node with max(fanIn + fanOut)
  baseRadius?: number;         // Default: 120 px
  ringSpacing?: number;        // Default: 90 px
  maxNodesPerRing?: number;    // Default: 12 nodes per ring before expanding to next ring
  sortMetric?: 'coupling' | 'risk' | 'alphabetical'; // Default: 'coupling'
}
```

### 4.3 Constellation Layout Configuration (`computeConstellationLayout`)
Groups nodes into galaxy-like clusters based on architectural layer or package namespace:
```typescript
export interface ConstellationLayoutConfig {
  groupBy: 'layer' | 'namespace' | 'type'; // Default: 'layer'
  clusterSpacing?: number;     // Default: 350 px between cluster centers
  clusterRadius?: number;      // Default: 120 px radius per cluster
  ordering?: string[];         // Explicit cluster ordering (e.g. ['UI', 'Service', 'Domain', 'Selector'])
}
```

### 4.4 Sankey Layout Configuration (`computeSankeyLayout`)
Computes column-based coordinates arranged left-to-right representing dependency invocation flow:
```typescript
export interface SankeyLayoutConfig {
  columnWidth?: number;        // Default: 200 px
  rowHeight?: number;          // Default: 60 px
  layerOrder?: string[];       // Default: ['UI', 'Service', 'Domain', 'Selector', 'Data', 'Integration', 'Utility', 'Unassigned']
}
```

---

## 5. Input / Output Coordinate Contract

Algorithmic layout functions in `daLayoutEngine.js` must adhere strictly to the following pure-function input/output signature:

```typescript
export interface NodePosition {
  x: number;
  y: number;
}

export type LayoutPositionMap = Record<string, NodePosition>;

/**
 * Computes deterministic 2D positions for graph nodes.
 * @param nodes List of canonical graph nodes
 * @param edges List of canonical graph edges
 * @param options Optional layout-specific configuration dictionary
 * @returns Map of node.id to { x, y } coordinates
 */
export function computeLayout(
  nodes: CanonicalGraphNode[],
  edges: CanonicalGraphEdge[],
  options?: Record<string, any>
): LayoutPositionMap;
```

---

## 6. Determinism, Degenerate Cases, and Fallback Behavior

1. **Determinism Requirement**:
   - Layout computations MUST be completely deterministic. Given identical `nodes` and `edges` arrays (even if shuffled), the computed coordinates for each `node.id` must be identical across successive runs.
   - Algorithms must sort inputs internally by `id` ASC prior to computing coordinates.
2. **Disconnected Graphs and Singletons**:
   - Isolated/singleton nodes (nodes with 0 edges) must be placed deterministically (e.g., in an auxiliary ring or grid margin) rather than placed at `(NaN, NaN)` or collapsed onto `(0, 0)`.
3. **Empty Graph**:
   - For an empty nodes array (`nodes = []`), all layout algorithms must return `{}` without throwing an exception.
4. **Dagre Dependency Boundary**:
   - In Salesforce LWC, npm packages (such as `dagre`) are not directly importable from `node_modules`.
   - If the user selects `dagre` when Dagre has not been bundled or loaded via `loadScript`, the engine MUST fall back gracefully to `breadthfirst` or `architecture` layered layout, logging a non-crashing warning. Under no circumstances may an unhandled `ReferenceError` crash `daGraphViewer`.
