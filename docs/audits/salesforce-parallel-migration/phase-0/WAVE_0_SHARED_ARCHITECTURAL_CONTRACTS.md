# Wave 0: Shared Architectural Contracts Specification

**Status:** FROZEN & MANDATORY
**Target Platform:** Salesforce LWC & Apex (Spring '25+)
**Scope:** Wave 5 (Deep Graph), Wave 6 (Analytical Views), Wave 7 (Diagnostics & History), Wave 8 (Investigation & Compare), Wave 9 (Refactoring Simulation)

---

## 1. Overview & Architectural Ground Rules

To enable five concurrently developed workstreams without integration regressions or merge collisions, this document specifies the frozen shared architectural contracts.

Every component developed in Waves 5 through 9 must conform to these interfaces. No workstream is authorized to alter these contracts unilaterally.

---

## 2. Canonical Graph Payload Contract (Contract W0-C1)

### 2.1 Proven Source Schema
The authoritative payload schema is verified by `daGraphPayloadLoader.js` and `validatePayloadIntegrity`:

```typescript
export interface CanonicalGraphPayload {
  projectId?: string;
  projectKey?: string;
  projectName?: string;
  runId?: string;
  timestamp?: string;
  nodes: CanonicalGraphNode[];
  edges: CanonicalGraphEdge[];
  metadata?: Record<string, any>;
  cycles?: string[][]; // Array of node ID cycles
  hotspots?: any[];
  unresolvedReferences?: any[];
  stages?: any[]; // For Sankey projections
  rings?: any[];  // For Orbit projections
}

export interface CanonicalGraphNode {
  id: string; // Unique string identifier (Mandatory)
  label?: string; // Display label (defaults to id or name)
  name?: string;
  type?: string; // Component type: Class, Trigger, LWC, Page, CustomObject, etc.
  layer?: string; // Architectural layer: UI, Controller, Service, Domain, Selector, Data
  risk?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  coverage?: 'COVERED' | 'UNTESTED' | 'AMBIGUOUS' | 'UNKNOWN';
  coveragePct?: number; // 0 to 100
  fanIn?: number; // Inbound dependency count
  fanOut?: number; // Outbound dependency count
  coupling?: number; // Total coupling score (fanIn + fanOut or architectural metric)
  criticality?: number; // 0 to 1
  loc?: number; // Lines of code
  metadata?: Record<string, any>;
}

export interface CanonicalGraphEdge {
  id: string; // Unique edge identifier (Mandatory)
  source: string; // Source Node ID (Mandatory)
  target: string; // Target Node ID (Mandatory)
  type?: string; // Dependency type: calls, references, extends, implements, instantiates
  weight?: number; // Edge weight / invocation frequency
  isUnresolved?: boolean; // True if target node is missing from payload nodes[]
  targetType?: string; // Inferred target type if target is unresolved
}
```

### 2.2 Invariant Rules
1. **Immutability:** The graph payload passed from `daAppShell` via `@api graphPayload` or `@api payload` is strictly immutable. No child view may mutate `payload.nodes`, `payload.edges`, or child objects. Views requiring filtering or layout transformations must create shallow or deep clones.
2. **Deterministic Node Identifiers:** `node.id` is the immutable primary key. All references across selection, pinning, diffing, and simulation must reference `node.id`.
3. **Directed Semantics:** All edges represent directed relationships: `source -> target` (Source depends on Target, or Source invokes Target). Directional traversal algorithms must strictly observe this convention.

---

## 3. Selection and Navigation Contract (Contract W0-C2)

### 3.1 Architectural Axiom
$$\text{SELECTION} \neq \text{NAVIGATION}$$

Selecting a node or edge within any view:
1. **Must NOT** switch the active workspace view (e.g., from Graph to Matrix or Findings).
2. **Must NOT** change or reset the active project.
3. **Must NOT** mutate active filters or presets.
4. **Must NOT** trigger Apex mutations or persistent state saves.

### 3.2 Cross-View Event Contracts
Child views communicate selection changes to `daAppShell` using standard DOM CustomEvents:

```javascript
// Node Selection Event
this.dispatchEvent(new CustomEvent('nodeselect', {
    detail: {
        nodeId: 'Class.AccountService',
        node: selectedNodeRecord,
        sourceView: 'graph' // 'graph' | 'matrix' | 'findings' | 'radar' | 'treemap' | 'subway' | 'hotspots'
    },
    bubbles: true,
    composed: true
}));

// Edge Selection Event
this.dispatchEvent(new CustomEvent('edgeselect', {
    detail: {
        edgeId: 'Class.AccountService->Class.AccountSelector',
        sourceId: 'Class.AccountService',
        targetId: 'Class.AccountSelector',
        sourceView: 'graph'
    },
    bubbles: true,
    composed: true
}));

// Clear Selection Event
this.dispatchEvent(new CustomEvent('selectionclear', {
    bubbles: true,
    composed: true
}));
```

---

## 4. Shared Canonical Filter Contract (Contract W0-C3)

### 4.1 Canonical V2 Filter Structure
The filter contract is defined authoritatively in `daFilterSchema.js`.

```json
{
  "search": "",
  "nodeTypes": [],
  "layers": [],
  "riskLevels": [],
  "coverageStatus": "ALL",
  "minCoupling": 0,
  "maxCoupling": 9999,
  "hideUnresolved": false,
  "highCouplingOnly": false,
  "impactMode": "ALL",
  "focusDepth": 1
}
```

### 4.2 Standard Filter Predicates
All analytical views (Wave 6) and graph filters (Wave 5) must use `daFilterSchema.matchesNodeFilter(node, criteria)` to guarantee identical filtering across all views:
- **Search:** Case-insensitive substring match against `node.id`, `node.label`, or `node.name`.
- **Node Types:** Empty array passes all; otherwise `criteria.nodeTypes.includes(node.type)`.
- **Layers:** Empty array passes all; otherwise `criteria.layers.includes(node.layer)`.
- **Risk Levels:** Empty array passes all; otherwise `criteria.riskLevels.includes(node.risk)`.
- **Coverage Status:** `ALL` passes all. Canonical states are strictly `COVERED`, `UNTESTED`, `AMBIGUOUS`, `UNKNOWN`. Missing coverage defaults to `UNKNOWN`.
- **High Coupling Helper:** A node is considered high-coupling if `coupling > 15 || fanIn > 10`.

---

## 5. Shared View Registration Contract (Contract W0-C4)

### 5.1 Approved Shell Views
The original React Dependency Analyzer registered 18 views. `daAppShell` currently approves and mounts:
1. `graph` (`daGraphViewer`)
2. `matrix` (`daMatrixView`)
3. `findings` (`daFindingsView`)

Waves 6, 7, and 8 add the following approved analytical and diagnostic views:
4. `radar` (`daRadarView`) — Workstream B
5. `treemap` (`daTreemapView`) — Workstream B
6. `subway` (`daSubwayView`) — Workstream B
7. `hotspots` (`daHotspotsView`) — Workstream B
8. `diagnostics` (`daDiagnosticsView`) — Workstream C
9. `history` (`daAnalysisHistoryView`) — Workstream C
10. `compare` (`daCompareView`) — Workstream D
11. `refactoring` (`daRefactoringView`) — Workstream E

### 5.2 Standard View Component Interface
Every analytical view LWC component must expose the following `@api` properties:

```typescript
export interface AnalyticalViewProps {
  @api payload: CanonicalGraphPayload | null;
  @api filterCriteria: CanonicalFilterCriteria | null;
  @api selectedNodeId: string | null;
  @api activeProjectId: string | null;
  @api readOnly: boolean;
}
```

---

## 6. Analysis Run and Snapshot Contract (Contract W0-C5)

### 6.1 Data Model
- **`DA_Project__c`**: Parent project entity (`Id`, `Project_Key__c`, `Name`).
- **`DA_Analysis_Run__c`**: Historical snapshot run (`Id`, `DA_Project__c`, `Status__c`, `Analysis_Timestamp__c`, `Metrics_JSON__c`, `DNA_Barcode__c`).
- **`DA_Graph_Chunk__c`**: Paginated payload storage (`DA_Analysis_Run__c`, `Chunk_Index__c`, `Payload_Data__c`).

### 6.2 Prerequisite Apex Endpoint (Task W7-P1)
To support historical snapshot selection (Wave 7) and snapshot comparison (Wave 8), `DAGraphController` must provide:

```apex
@AuraEnabled(cacheable=true)
public static List<DA_Analysis_Run__c> getAnalysisRuns(String projectId, Integer maxRuns) {
    if (String.isBlank(projectId)) {
        throw new AuraHandledException('Project ID is required.');
    }
    if (maxRuns == null || maxRuns <= 0) {
        maxRuns = 20;
    } else if (maxRuns > 100) {
        maxRuns = 100;
    }

    return [
        SELECT Id, Name, DA_Project__c, Status__c, CreatedDate,
               Metrics_JSON__c, DNA_Barcode__c
        FROM DA_Analysis_Run__c
        WHERE DA_Project__c = :projectId OR DA_Project__r.Project_Key__c = :projectId
        WITH USER_MODE
        ORDER BY CreatedDate DESC
        LIMIT :maxRuns
    ];
}
```

---

## 7. Investigation and Node Pinning Contract (Contract W0-C6)

### 7.1 Proposed Drawer State Interface
```typescript
export interface InvestigationState {
  pinnedNodeIds: string[]; // Set of pinned entity IDs
  pinnedNodes: CanonicalGraphNode[]; // Cached node records
  activeTab: 'summary' | 'comparison' | 'paths';
  pathSourceId: string | null;
  pathTargetId: string | null;
}
```

### 7.2 Invariant Rules
1. Pinning nodes must not trigger Cytoscape layout recomputation.
2. The drawer operates as an overlay sliding panel within `daAppShell`, maintaining independent scroll and inspection state.
3. Clearing view selection does not clear pinned investigation nodes unless explicitly requested by the user.

---

## 8. Snapshot Diff and Graph Comparison Contract (Contract W0-C7)

### 8.1 Snapshot Comparison Model
Comparison operates between Baseline (Run A) and Target (Run B):

```typescript
export interface GraphDiffResult {
  addedNodes: CanonicalGraphNode[];
  removedNodes: CanonicalGraphNode[];
  modifiedNodes: {
    nodeId: string;
    before: CanonicalGraphNode;
    after: CanonicalGraphNode;
    changes: string[]; // e.g., ['coupling', 'coverage', 'risk']
  }[];
  addedEdges: CanonicalGraphEdge[];
  removedEdges: CanonicalGraphEdge[];
  modifiedEdges: CanonicalGraphEdge[];
  unchangedNodeCount: number;
  unchangedEdgeCount: number;
}
```

### 8.2 Memory-Bounded Execution Requirement
To operate safely within Salesforce browser memory limits:
1. **No Dual-Cytoscape Instances:** The comparison view **must not** instantiate two active Cytoscape graph instances concurrently.
2. Graph comparison must be computed as a pure JavaScript data-structure diff using Maps indexed by entity ID.
3. Diff rendering must use a single Cytoscape canvas with delta styling (Green: Added, Red: Removed, Amber: Modified) or a structured tabular diff.

---

## 9. Refactoring Simulation Contract (Contract W0-C8)

### 9.1 Simulation Graph Isolation
All refactoring simulation occurs strictly in client-side memory:
1. **Isolated Clone:** Operations clone the canonical payload (`JSON.parse(JSON.stringify(payload))` or structured clone) before applying mutations.
2. **Zero Apex DML:** No simulation action may invoke Apex write methods or persist partial graphs.
3. **Simulation Operations:**
   - `SIM_REMOVE_NODE(nodeId)`: Removes node and recomputes fanIn/fanOut for remaining nodes.
   - `SIM_DECOUPLE_EDGE(edgeId)`: Removes specific dependency edge and recalculates blast radius.
   - `SIM_EXTRACT_INTERFACE(targetNodeId, methodNames)`: Proposes new intermediary interface.

### 9.2 Export Schema
Simulated refactoring plans can be exported as JSON or Markdown without modifying database records:
```typescript
export interface RefactoringProposal {
  proposalId: string;
  projectId: string;
  baseRunId: string;
  timestamp: string;
  authorUser: string;
  mutations: RefactoringMutation[];
  projectedMetrics: {
    couplingReduction: number;
    cyclesEliminated: number;
    riskScoreDelta: number;
  };
}
```

---

## 10. Error and Loading State Contract (Contract W0-C9)

Every view must provide distinct, accessible UI presentations for:
1. **Loading State:** `lightning-spinner` with accessible alternative text.
2. **Empty State:** `illustration` displaying clear guidance when 0 nodes/edges match criteria.
3. **Invalid / Malformed Payload:** Graceful notification without component unmount or script error.
4. **Stale Request Guard:** Discard asynchronous responses when `requestId !== this.currentRequestId` or project ID has changed.
