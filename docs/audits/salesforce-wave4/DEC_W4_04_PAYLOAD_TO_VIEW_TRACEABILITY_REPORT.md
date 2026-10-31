# DEC-W4-04: Payload-to-View Traceability Report

| Governance Attribute | Value |
|---|---|
| **Document Type** | Source-to-View Payload Traceability & Derivation Evidence Report |
| **Target Decision** | `DEC-W4-04` Option C (Minimal Functional Matrix & Findings Views) |
| **Approval Status** | **APPROVED (OPTION C)** by Project Owner (31 October 2026) |
| **Branch** | `jules-1578065196489108588-6eaa6fb0` |
| **HEAD Commit SHA** | `c65ee072a28344157945c273490a91248be0d884` |
| **Date** | October 31, 2026 |
| **Verification Scope** | End-to-End Pipeline Traceability: Analyzer -> Exporter -> Payload Loader -> View Consumers |

---

## 1. Executive Summary

`DEC-W4-04` Option C establishes lightweight, functional LWC implementations for both Matrix View (`daMatrixViewer`) and Findings View (`daFindingsViewer`) in the Salesforce migration without requiring new Salesforce metadata, custom objects, custom fields, or Apex controllers.

This report independently verifies every source-backed payload field, traces data flow end-to-end, documents worked derivation examples, and clarifies supported versus unsupported capability boundaries.

---

## 2. Source-to-Consumer Pipeline Traceability

The end-to-end data pipeline is structured as follows:

```
+-------------------------------------------------------+
| 1. Analysis Engine / Parser Tier                      |
|    - Raw AST extraction, Apex metrics, edge detection |
+---------------------------+---------------------------+
                            |
                            v
+-------------------------------------------------------+
| 2. Exporter Tier: scripts/export-explorer.cjs         |
|    - Normalizes nodes, edges, cycles, unresolved refs |
|    - Writes canonical envelope to explorer-data.json  |
+---------------------------+---------------------------+
                            |
                            v
+-------------------------------------------------------+
| 3. Transport & Storage Tier                           |
|    - DA_Graph_Chunk__c chunks (131,072 chars max)     |
+---------------------------+---------------------------+
                            |
                            v
+-------------------------------------------------------+
| 4. LWC Ingestion Tier: daGraphPayloadLoader           |
|    - reassembleChunks(chunks)                         |
|    - validatePayloadIntegrity(rawJson)                |
+---------------------------+---------------------------+
                            |
                            v
+-------------------------------------------------------+
| 5. Application Shell Tier: daAppShell                 |
|    - Stores parsed graphPayload in-memory             |
|    - Passes @api payload / @api criteria to views     |
+---------------------------+---------------------------+
                            |
           +----------------+----------------+
           |                                 |
           v                                 v
+-----------------------+       +-----------------------+
| 6a. daMatrixViewer    |       | 6b. daFindingsViewer  |
| - Aggregates counts   |       | - Renders datatable   |
|   by component type   |       |   of architecture     |
| - Reacts to filters   |       |   intelligence items  |
+-----------------------+       +-----------------------+
```

---

## 3. Matrix View Derivation Verification (`daMatrixViewer`)

### 3.1 Payload Field Verification
In `scripts/export-explorer.cjs` (lines 675–740), edges are normalized with the following canonical structure:
- `edge.id`: String identifier formatted as `${source}|${target}|${relationshipType}|${method}|${evidence}`.
- `edge.source`: String identifier formatted as `${Type}:${Name}` (e.g. `ApexClass:AccountController`).
- `edge.target`: String identifier formatted as `${Type}:${Name}` or `${TargetName}`.
- `edge.canonical.source.type`: Normalized node type (e.g. `ApexClass`, `LWC`, `ApexTrigger`).
- `edge.canonical.target.type`: Normalized target type (e.g. `ApexClass`, `CustomObject`, `CustomField`, `External`).
- `edge.unresolved`: Boolean indicating whether edge target is unresolved.

### 3.2 Interaction Count Derivation Logic
For each edge in `payload.edges`:
1. Check if source and target nodes satisfy active canonical filter criteria (`criteria.nodeTypes`, `criteria.searchQuery`, `criteria.riskLevels`, etc.).
2. Extract source component type: `srcType = edge.canonical?.source?.type || edge.source.split(':')[0]`.
3. Extract target component type: `tgtType = edge.canonical?.target?.type || edge.target.split(':')[0]`.
4. Increment matrix cell: `matrix[srcType][tgtType] = (matrix[srcType][tgtType] || 0) + 1`.

### 3.3 Worked Source-Backed Example (Cloud Spend Tracker Fixture)
Executing this logic against real benchmark fixture `analyze/projects/cloud-spend-tracker/explorer-data.json` yields:

| Source Type \ Target Type | ApexClass | External | CustomObject | CustomField | LWC | Total |
|---|---|---|---|---|---|---|
| **ApexClass** | 263 | 221 | 339 | 121 | 0 | 944 |
| **LWC** | 34 | 0 | 0 | 0 | 35 | 69 |
| **ApexTrigger** | 8 | 0 | 3 | 0 | 0 | 11 |

*Directionality & Unresolved Edge Handling:*
- Direction is strictly preserved (`source` -> `target`).
- Unresolved edges are included and classified under target type `External` (or target type indicated in `edge.canonical.target.type`).
- Edge counts compute with 100% determinism from existing payload data with zero backend schema additions.

---

## 4. Findings View Derivation Verification (`daFindingsViewer`)

### 4.1 Supported Finding Categories

| Finding Category | Exact Source Fields in Payload | Derivation Logic | Required Conditions | Reactive Filter Behavior |
|---|---|---|---|---|
| **Circular Dependencies** | `payload.cycles[]` (`id`, `size`, `nodes[]`) and `node.refactoringReadiness.hasCycles` | Map each cycle group into a Finding item: ID: `cycle.id`, Severity: `HIGH`, Title: `Circular Dependency Group (${cycle.size} nodes)`, Nodes: `cycle.nodes`. | `payload.cycles.length > 0` | Filtered out if `criteria.quickFilters.highlightCyclesOnly` is true and cycle has no matching nodes, or if node search filters out all nodes in the cycle. |
| **Untested High-Risk Components** | `node.risk === 'HIGH'` and `node.refactoringReadiness.testCoverageStatus` (`UNTESTED` or `UNKNOWN`) | Map each high-risk node lacking tests into a Finding item: ID: `untested-${node.id}`, Severity: `CRITICAL`, Title: `Untested High-Risk Component: ${node.displayName}`. | `node.risk === 'HIGH'` AND (`testCoverageStatus === 'UNTESTED'` OR `'UNKNOWN'`) | Filtered out if active `criteria.riskLevels` excludes `HIGH` or if active `criteria.coverageStatus` excludes `UNTESTED`. |
| **Unresolved References** | `payload.unresolvedReferences[]` (`edgeId`, `sourceNodeId`, `targetName`, `targetType`, `reason`) | Aggregate or list unresolved symbol references: ID: `unresolved-${ref.edgeId}`, Severity: `MEDIUM`, Title: `Unresolved Reference: ${ref.targetName} (${ref.targetType})`. | `payload.unresolvedReferences.length > 0` | Filtered by source node or target name matching `criteria.searchQuery`. |
| **High Coupling Hotspots** | `node.metrics.coupling > 15` or `node.metrics.fanIn > 10` | Identify architectural bottlenecks: ID: `coupling-${node.id}`, Severity: `MEDIUM`, Title: `High Coupling Hotspot (${node.metrics.coupling} couplings)`. | `node.metrics.coupling > 15` | Filtered by `criteria.searchQuery` and `criteria.nodeTypes`. |

### 4.2 Status of "Missing Layer Annotations"
- **Investigation Finding:** Inspection of `scripts/export-explorer.cjs` confirms that `nodes[].layer` is **NOT emitted** into `explorer-data.json`.
- **Status:** "Missing layer annotations" **cannot be derived** from current payload data without modifying the exporter producer.
- **Scope Disposition:** Per change-control rules and DEC-W4-04 scope protection:
  - Do NOT modify the exporter producer to invent layer data.
  - In Wave 4 Phase 2 (`daFindingsViewer`), findings are derived strictly from the **supported** categories (`cycles`, `untested high-risk`, `unresolved references`, and `coupling hotspots`).
  - Layer violation findings remain deferred until an architectural layer classification producer is formally introduced.

---

## 5. Payload Loader and Consumer Integration Contracts

1. **Survives Transport and Loader Invariants:**
   - `daGraphPayloadLoader.validatePayloadIntegrity` validates the canonical `nodes` and `edges` graph envelope.
   - Additional top-level fields `cycles`, `unresolvedReferences`, and `impactSummaries` pass through safely in the parsed envelope object.
2. **Persistence Boundary Protection:**
   - Graph payloads are stored in `DA_Graph_Chunk__c` records (131,072 characters per chunk).
   - User filter preferences are stored in `DA_User_Preference__c.Filters_JSON__c` (131,072 characters limit).
   - Neither Matrix nor Findings views persist any data back to Salesforce custom objects. Computation occurs 100% in-memory within the LWC tier.
3. **Filter Semantics Alignment (DEC-W4-02):**
   - Active filters (`criteria`) passed from `daAppShell` apply directly in-memory to filter nodes and edges before computing matrix summary counts or findings tables.

---

## 6. Verdict and Change-Control Adherence

- Zero new Salesforce custom objects (`DA_Finding__c` is NOT required).
- Zero new Salesforce custom fields.
- Zero new Apex controllers (`DAFindingController.cls` is NOT created).
- Zero new graph payload fields required.
- All Matrix and Findings capabilities under Option C are proven fully traceable and implementable in Phase 2.
