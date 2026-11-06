# Contract 05: Dual-Snapshot Retrieval & Diff Engine Contract

## 1. Document Control & Identification
- **Contract ID**: `CONTRACT-05`
- **Contract Name**: Dual-Snapshot Retrieval & Diff Engine Contract
- **Version**: `1.0.0`
- **Status**: `PROPOSED`
- **Purpose**: Defines the data shapes, diffing algorithm expectations, memory limits, and streaming chunk retrieval contract for comparing two graph snapshots in `daDiffEngine` (`W8-2`) and `daCompareView` (`W8-3`).
- **Affected Tasks**: `W8-2` (Diff Engine Utility), `W8-3` (Compare View Component), `W7-P1` (Historical run retrieval)
- **Affected Workstreams**: Workstream D (Wave 8) and Integration Coordinator

---

## 2. Source-of-Truth References
1. `WAVE_0_4_1_AUTHORITATIVE_TASK_AND_DEPENDENCY_REGISTER.csv` (Row W8-2: `daDiffEngine.js`, `run-w8-2-tests.cjs`, pure diff utility comparing snapshots; Row W8-3: `daCompareView.js`, dual run selection, chunk ingestion).
2. `docs/audits/salesforce-parallel-migration/phase-0/WAVE_0_SHARED_ARCHITECTURAL_CONTRACTS.md` (Section 8: Snapshot Diff and Graph Comparison Contract W0-C7).
3. `scratch/salesforce-poc/force-app/main/default/classes/controllers/DAGraphController.cls` (`getGraphChunks(runId, startIndex, maxChunks, projectId)`).
4. `scratch/salesforce-poc/force-app/main/default/lwc/daGraphPayloadLoader/daGraphPayloadLoader.js` (Chunk retrieval loop and payload reassembly).

---

## 3. Discrepancy Resolution & Runtime Capacity Bounds (D6)

### 3.1 10MB vs 20MB Discrepancy & Real Platform Limits
Phase A2 mentioned "10MB/20MB limits" without empirical bounds. We reconcile this with actual Salesforce platform limits and browser memory constraints:

| Boundary / Tier | Physical Constraint | Architectural Rule | Classification |
| :--- | :--- | :--- | :--- |
| **Per-Chunk Field Size** | Long Text Area limit: 131,072 characters (~131 KB) | Each `DA_Graph_Chunk__c.Payload_Data__c` is bounded to <= 131,072 chars. | `IMPLEMENTED_AND_VERIFIED` |
| **Apex Heap Limit** | Synchronous Apex limit: 6 MB heap | Controller fetches chunks in batches of `maxChunks <= 10` (~1.3 MB payload per roundtrip). | `IMPLEMENTED_AND_VERIFIED` |
| **Single Snapshot Cap** | Client-side memory boundary | Recommended maximum single snapshot size: **5 MB** uncompressed JSON (~30,000 entities). | `PROPOSED_STANDARD` |
| **Dual Snapshot Combined** | Dual payload retention in client RAM | Combined Snapshot A + Snapshot B maximum: **10 MB** raw JSON. | `PROPOSED_STANDARD` |
| **Diff Rendering Instance** | Browser canvas memory boundary | **Single Cytoscape instance** rule (W0-C7): concurrent instantiation of two independent Cytoscape canvases is strictly prohibited. | `FROZEN_INVARIANT` |

### 3.2 Request Cancellation Semantics
- **Distinction**: True physical cancellation of an in-flight HTTP/Aura wire request is not supported by standard Salesforce Aura framework APIs.
- **Contract Rule**: "Cancellation" in `daCompareView` refers strictly to **stale response suppression via monotonic request token guard**:
  ```javascript
  const requestId = ++this.activeRequestId;
  // If this.activeRequestId !== requestId upon promise resolution, discard chunks immediately.
  ```

---

## 4. Diff Engine Function Signature (`daDiffEngine.js`)

`daDiffEngine.computeDiff` is a **pure JavaScript calculation engine** with zero external dependencies (no Cytoscape, no DOM, no Apex):

```typescript
export interface GraphDiffResult {
  nodes: {
    added: CanonicalGraphNode[];
    removed: CanonicalGraphNode[];
    modified: ModifiedNodeDiff[];
    unchangedCount: number;
  };
  edges: {
    added: CanonicalGraphEdge[];
    removed: CanonicalGraphEdge[];
    modified: ModifiedEdgeDiff[];
    unchangedCount: number;
  };
  summary: DiffSummary;
}

export interface ModifiedNodeDiff {
  id: string;
  before: CanonicalGraphNode;
  after: CanonicalGraphNode;
  propertyChanges: string[]; // e.g. ['coupling', 'risk', 'layer', 'coverageDensity']
  deltas: {
    coupling?: number;       // after.coupling - before.coupling
    coverageDensity?: number;
    cyclomaticComplexity?: number;
  };
}

export interface ModifiedEdgeDiff {
  id: string;
  before: CanonicalGraphEdge;
  after: CanonicalGraphEdge;
  propertyChanges: string[]; // e.g. ['weight', 'type']
}

export interface DiffSummary {
  addedNodesCount: number;
  removedNodesCount: number;
  modifiedNodesCount: number;
  unchangedNodesCount: number;
  addedEdgesCount: number;
  removedEdgesCount: number;
  modifiedEdgesCount: number;
  unchangedEdgesCount: number;
  deltaCycles: number;      // targetCycles - baselineCycles
  deltaHighRiskNodes: number;
}
```

---

## 5. Entity Matching & Property Comparison Rules

1. **Entity Primary Key**:
   - Nodes are matched strictly by `node.id`.
   - Edges are matched strictly by `edge.id` (or fallback `${source}->${target}`).
2. **State Categorization**:
   - **`added`**: Entity exists in Snapshot B (Target) but not in Snapshot A (Baseline).
   - **`removed`**: Entity exists in Snapshot A but not in Snapshot B.
   - **`modified`**: Entity exists in both, but one or more tracked properties differ.
   - **`unchanged`**: Entity exists in both and all tracked properties are identical.
3. **Tracked Node Properties**:
   The diff engine strictly monitors changes across these properties:
   - `layer`
   - `type`
   - `risk`
   - `coupling`
   - `coverageStatus`
   - `coverageDensity`
   - `cyclomaticComplexity`
   - `hasCycle`
   Transient layout properties (`position.x`, `position.y`) are ignored during structural diffing.
4. **Deterministic Output Ordering**:
   All output arrays (`added`, `removed`, `modified`) must be sorted lexicographically by `id` ASC.
