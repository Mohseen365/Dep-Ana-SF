# Wave 0.3: Canonical Graph Payload Contract Reconciliation (Contract W0-C1)

## 1. Problem Formulation & Defect Analysis

A clear contradiction exists between the original frozen architectural contract and the Wave 0.2 readiness assessment regarding the Canonical Graph Payload Contract (`W0-C1`):

1. **Original Frozen Contract (`WAVE_0_SHARED_ARCHITECTURAL_CONTRACTS.md`, Section 2):**
   Defines `CanonicalGraphPayload` with the authoritative top-level properties:
   - `nodes: CanonicalGraphNode[]` (Required)
   - `edges: CanonicalGraphEdge[]` (Required/Optional array)
   - `metadata?: Record<string, any>` (Optional)
   - `cycles?: string[][]` (Optional)
   - `hotspots?: any[]` (Optional)
   - `unresolvedReferences?: any[]` (Optional)
   - `stages?: any[]` (Optional, for Sankey)
   - `rings?: any[]` (Optional, for Orbit)
   - `projectId?: string`, `projectKey?: string`, `projectName?: string`, `runId?: string`, `timestamp?: string`

2. **Wave 0.2 Readiness Report (`WAVE_0_2_FINAL_IMPLEMENTATION_DISPATCH_READINESS.md`, Section 4):**
   Summarizes `W0-C1` as:
   `Reverified schema envelope (nodes, edges, summary)`

### Defect Impact:
Treating `nodes, edges, summary` as equivalent to the frozen `CanonicalGraphPayload` creates severe contract ambiguity. If an agent builds code expecting a top-level `summary` object (or replaces `metadata`, `cycles`, `hotspots`, `stages`, and `rings` with a `summary` object), downstream analytical views (e.g. `daRadarView`, `daHotspotsView`, `daSubwayView`, `daDiagnosticsView`, `daRefactoringEngine`) will fail because they depend on `cycles`, `hotspots`, `unresolvedReferences`, `stages`, and `rings`.

---

## 2. Source Code & Implementation Evidence Inspection

To determine the authoritative truth, we inspected the existing payload producers, consumers, and validation engines across the repository:

### 2.1 Inspection of `daGraphPayloadLoader.js` (`validatePayloadIntegrity`)
Lines 77–118 of `scratch/salesforce-poc/force-app/main/default/lwc/daGraphPayloadLoader/daGraphPayloadLoader.js`:
- Specifically checks:
  1. `parsed` is an object.
  2. `parsed.nodes` is an Array of objects with non-empty string `id`.
  3. `parsed.edges` is undefined or an Array of valid source/target objects.
  4. Also supports Cytoscape `elements`, Sankey `stages` & `flows`, and Constellation `focalNode` & `rings`.
- **Zero references to a mandatory or top-level `summary` property exist in `daGraphPayloadLoader.js`.**

### 2.2 Inspection of Apex DTOs & Services
- In `DAGraphDTO.cls`:
  Properties include `projectId`, `projectKey`, `projectName`, `runId`, `commitHash`, `nodeCount`, `edgeCount`, `isChunked`, `totalChunks`, `rawPayload`, `chunks`.
  Zero references to a `summary` property exist in Apex classes or controllers.
- In `scratch/salesforce-poc/`:
  Searching for `summary` across the entire `scratch/salesforce-poc/` tree (`grep -rn "summary" scratch/salesforce-poc/`) returns **zero occurrences in production JS, Apex, or metadata**.

### 2.3 Inspection of Wave 4 Canonical Schema Contracts
- In `WAVE_4_CANONICAL_V2_SCHEMA_AND_R1_MERGE_CONTRACT.md` and `WAVE_4_FINAL_COVERAGE_NORMALIZATION_CONTRACT.md`, the canonical payload preserves `nodes`, `edges`, `cycles`, `hotspots`, `unresolvedReferences`, and metadata.

### 2.4 Resolution of the `summary` Discrepancy
The mention of `(nodes, edges, summary)` in `WAVE_0_2_FINAL_IMPLEMENTATION_DISPATCH_READINESS.md` line 70 was an **informal typographical shorthand** introduced in that report's high-level summary table. It did not reflect an approved schema modification.

**Authoritative Ruling:**
The schema defined in `WAVE_0_SHARED_ARCHITECTURAL_CONTRACTS.md` is the **sole authoritative canonical payload contract**. The `summary` property is **NOT** part of the frozen top-level envelope. Any metadata summary information resides in `metadata` or in specialized sub-objects if present.

---

## 3. Exhaustive Field-Level Canonical Graph Payload Specification (Contract W0-C1)

The following contract is authoritative and binding for Waves 5 through 9:

### 3.1 Top-Level Payload Envelope (`CanonicalGraphPayload`)

| Property Name | Required / Optional | Data Type | Nullable? | Producer | Consumers | Chunk Preserved? | Immutability Rule |
| :--- | :---: | :---: | :---: | :--- | :--- | :---: | :--- |
| `nodes` | **Required** | `CanonicalGraphNode[]` | No | Ingestion / Apex Chunks | All Views (Graph, Matrix, Findings, Radar, Treemap, Refactor) | Yes | Read-Only / Immutable |
| `edges` | **Required** | `CanonicalGraphEdge[]` | No (may be `[]`) | Ingestion / Apex Chunks | Graph, Matrix, Traversal, Diff, Refactor | Yes | Read-Only / Immutable |
| `projectId` | Optional | `string` | Yes | Ingestion / Apex Controller | `daAppShell`, View Headers | Yes | Read-Only |
| `projectKey` | Optional | `string` | Yes | Ingestion / Apex Controller | `daAppShell`, View Headers | Yes | Read-Only |
| `projectName` | Optional | `string` | Yes | Ingestion / Apex Controller | `daAppShell`, View Headers | Yes | Read-Only |
| `runId` | Optional | `string` | Yes | Ingestion / Apex Controller | `daAppShell`, `c-da-compare-view` | Yes | Read-Only |
| `timestamp` | Optional | `string` (ISO 8601) | Yes | Ingestion Service | History, Header, Diagnostics | Yes | Read-Only |
| `metadata` | Optional | `Record<string, any>` | Yes | Ingestion Service | Diagnostics, Scorecards | Yes | Read-Only |
| `cycles` | Optional | `string[][]` | Yes | Analysis Engine | Findings, Diagnostics, Scorecard | Yes | Read-Only |
| `hotspots` | Optional | `any[]` | Yes | Analysis Engine | `daHotspotsView`, Scorecard | Yes | Read-Only |
| `unresolvedReferences` | Optional | `any[]` | Yes | Analysis Engine | Findings, Diagnostics | Yes | Read-Only |
| `stages` | Optional | `any[]` | Yes | Analysis Engine / Adapter | Sankey Layout (`daGraphViewer`) | Yes | Read-Only |
| `rings` | Optional | `any[]` | Yes | Analysis Engine / Adapter | Orbit / Constellation Layout | Yes | Read-Only |

### 3.2 Canonical Graph Node (`CanonicalGraphNode`)

| Field Name | Required? | Type | Semantics & Allowed Values |
| :--- | :---: | :---: | :--- |
| `id` | **Required** | `string` | Unique non-empty string identifier. |
| `label` | Optional | `string` | Human-readable display label. Defaults to `name` or `id`. |
| `name` | Optional | `string` | Component name. |
| `type` | Optional | `string` | Component type: `Class`, `Trigger`, `LWC`, `Page`, `CustomObject`, etc. |
| `layer` | Optional | `string` | Layer: `UI`, `Controller`, `Service`, `Domain`, `Selector`, `Data`, `External`. |
| `risk` | Optional | `string` | Risk classification: `'LOW'`, `'MEDIUM'`, `'HIGH'`, `'CRITICAL'`. |
| `coverage` | Optional | `string` | Normalized coverage: `'COVERED'`, `'UNTESTED'`, `'AMBIGUOUS'`, `'UNKNOWN'`. |
| `coveragePct` | Optional | `number` | Float 0 to 100. |
| `fanIn` | Optional | `number` | Inbound dependency count. |
| `fanOut` | Optional | `number` | Outbound dependency count. |
| `coupling` | Optional | `number` | Total coupling metric (`fanIn + fanOut`). |
| `lines` | Optional | `number` | Lines of code. |
| `isCycle` | Optional | `boolean` | Flag indicating node membership in a dependency cycle. |
| `isHotspot` | Optional | `boolean` | Flag indicating architectural hotspot. |
| `properties` | Optional | `Record<string, any>` | Extensible metadata bag. |

### 3.3 Canonical Graph Edge (`CanonicalGraphEdge`)

| Field Name | Required? | Type | Semantics & Allowed Values |
| :--- | :---: | :---: | :--- |
| `source` | **Required** | `string` | Source node `id`. Fallback `sourceFeatureId` accepted during normalization. |
| `target` | **Required** | `string` | Target node `id`. Fallback `targetFeatureId` accepted during normalization. |
| `id` | Optional | `string` | Edge identifier. Defaults to `${source}->${target}`. |
| `label` | Optional | `string` | Dependency label. |
| `type` | Optional | `string` | Edge type: `CALLS`, `INHERITS`, `REFERENCES`, `QUERIES`, etc. |
| `weight` | Optional | `number` | Edge weight / frequency. |
| `isInCycle` | Optional | `boolean` | Flag indicating edge participates in a cycle. |

---

## 4. Chunking, Immutability & Backward Compatibility Invariants

1. **Surrogate-Pair Chunk Boundary Safety:**
   As implemented in `daGraphPayloadLoader.js`, chunking never splits a UTF-16 surrogate pair (0xD800–0xDBFF) across 131,072 character chunk boundaries.
2. **Reassembly Integrity Validation:**
   Any payload retrieved via `DAGraphController.getGraphChunks` must pass `verifyChunkSequence()`, `reassembleChunks()`, and `validatePayloadIntegrity()` prior to consumption.
3. **Payload Immutability:**
   Components receiving `payload` (or `graphPayload`) must treat the object and its inner arrays as frozen/immutable. In-place mutation (e.g. `payload.nodes.push(...)`) is strictly prohibited. Derived views or layout coordinates must be stored in component-local reactive properties or view models.
4. **Resilience to Unknown/Optional Fields:**
   All consumers must safely handle missing optional fields (`cycles`, `hotspots`, `stages`, `rings`, `metadata`) without throwing `TypeError` (e.g. via `payload.cycles || []`).
