# Architecture Blockers Analysis: React-to-Salesforce Migration

**Date:** 9 November 2026
**Scope:** Architectural Blocker Resolution for 74 Blocked/Dependent Files (`explorer/src/lib/`, layout, adapters, workers, datasets)
**Primary Source Documents:** `salesforce_migration_tracking_report.md`, `salesforce_migration_file_inventory.xlsx`, Contracts CONTRACT-01 to CONTRACT-09

---

## 1. Executive Summary & Problem Formulation

The React 19 exploration workspace features advanced client-side architecture analysis engines: multi-mode force-directed layout computation, Tarjan strongly connected components (SCC), cyclomatic centrality, level-of-detail (LOD) canvas scaling, multi-threaded Web Workers, and multi-megabyte JSON payload processing.

Directly porting these TypeScript algorithms to Salesforce Apex or raw LWC without deliberate architectural boundaries introduces critical platform risks:
- **Apex Governor Limits:** Heap size limits (6 MB synchronous / 12 MB asynchronous), CPU timeout limits (10s synchronous / 60s asynchronous), SOQL query limits (50,000 rows), and DML limits.
- **Lightning Web Security (LWS) & CSP Restrictions:** Web Workers restrictions inside locker/LWS, DOM access sandboxing, and script evaluation limitations.
- **Payload Scalability:** Massive graph models (e.g., CST, BQC, PBIM containing tens of thousands of nodes/edges) exceeding Salesforce field character limits (131,072 characters for LongTextArea) and transaction limits.

This document establishes the authoritative data contracts, Apex service boundaries, storage chunking rules, Cytoscape integration constraints, and LWC state architecture required to unblock migration.

---

## 2. Core Architecture Tenet: External Node Analyzer vs. Salesforce Presentation

As mandated in `salesforce_migration_tracking_report.md` and Phase A architectural principles:
> **Do not port the Node CLI/analyzer engine wholesale into Apex.**
> Keep static code parsing, abstract syntax tree (AST) generation, and raw graph derivation in the external Node.js analyzer subsystem (`scripts/`).
> Treat Salesforce exclusively as the **Presentation, Ingestion Persistence, Security, Collaboration, and Workflow Orchestration Layer**.

Apex services must receive pre-analyzed graph payloads, persist and index them safely across chunked custom objects, enforce CRUD/FLS and sharing boundaries, and expose thin, bulk-safe `@AuraEnabled` query endpoints to LWC.

---

## 3. Data Contracts & Graph DTO Structures

### 3.1 Frozen Graph Schema (CONTRACT-01 / CONTRACT-05 Alignment)
The graph data contract exchanged between external ingestion, Apex services, and LWC viewers is strictly versioned:

```json
{
  "schemaVersion": "1.0.0",
  "project": {
    "id": "a00...",
    "key": "PROJECT_KEY",
    "name": "Project Name",
    "repositoryUrl": "https://github.com/org/repo"
  },
  "run": {
    "runId": "a01...",
    "timestamp": 1731140000000,
    "commitHash": "d0aef31da61be5e5d46dfca7bd696024e8bbc96d",
    "status": "AVAILABLE",
    "metrics": {
      "nodeCount": 1250,
      "edgeCount": 3420,
      "density": 0.00438,
      "cyclicSccCount": 12,
      "maxDepth": 8
    }
  },
  "nodes": [
    {
      "id": "node-101",
      "label": "OrderService",
      "type": "ApexClass",
      "layer": "Business",
      "role": "Service",
      "metrics": {
        "linesOfCode": 450,
        "cyclomaticComplexity": 34,
        "churn": 18,
        "fanIn": 14,
        "fanOut": 8,
        "riskScore": 68.5
      },
      "position": { "x": 120.5, "y": 340.0 }
    }
  ],
  "edges": [
    {
      "id": "edge-501",
      "source": "node-101",
      "target": "node-205",
      "type": "Instantiates",
      "weight": 3
    }
  ]
}
```

### 3.2 Apex Data Transfer Objects (DTO)
- `DAGraphDTO.cls`: Root container holding metadata, nodes summary, and chunk indexes.
- `DAAnalysisRunDTO.cls`: Run metadata, commit SHA, execution timestamp, and status.
- `DAErrorResponse.cls`: Standardized error envelope (`errorCode`, `message`, `correlationId`, `timestamp`).

---

## 4. Storage & Chunking Strategy

### 4.1 Custom Object Model
1. **`DA_Project__c`**: Master project record.
   - `Name` (Text 80)
   - `Project_Key__c` (Text 50, Unique, External ID, Indexed)
   - `Repository_Url__c` (URL 255)
   - `Status__c` (Picklist: Active, Archived)
2. **`DA_Analysis_Run__c`**: Analysis execution snapshot.
   - Master-Detail relationship to `DA_Project__c`
   - `Commit_Hash__c` (Text 40)
   - `Run_Timestamp__c` (DateTime)
   - `Status__c` (Picklist: AVAILABLE, EMPTY, FAILED)
   - `Node_Count__c` (Number 10,0)
   - `Edge_Count__c` (Number 10,0)
   - `Cyclic_SCC_Count__c` (Number 6,0)
   - `Total_Chunks__c` (Number 6,0)
   - `Total_Payload_Size_Chars__c` (Number 12,0)
3. **`DA_Graph_Chunk__c`**: Size-capped partitioned JSON storage.
   - Master-Detail relationship to `DA_Analysis_Run__c`
   - `Chunk_Index__c` (Number 6,0, Indexed)
   - `Chunk_Size_Chars__c` (Number 6,0)
   - `Payload_Data__c` (LongTextArea 131,072)
4. **`DA_Finding__c`**: Granular architectural findings.
   - Master-Detail relationship to `DA_Analysis_Run__c`
   - `Rule_Id__c` (Text 80)
   - `Severity__c` (Picklist: Critical, Major, Minor, Info)
   - `Target_Node_Id__c` (Text 100)
   - `Details__c` (LongTextArea 32,768)

### 4.2 Chunking Boundary Invariants (DEC-01 / DEC-02)
- **MAX_CHUNK_SIZE:** Exactly 131,072 characters (Salesforce LongTextArea limit).
- **MAX_TOTAL_PAYLOAD_SIZE:** Exactly 10,485,760 characters (~10 MB, UTF-16 code units).
- **Surrogate Pair Protection:** Chunks must never split high and low UTF-16 surrogate pairs (U+D800 to U+DFFF). If a split boundary falls between a surrogate pair, the split point shifts backwards by 1 code unit.
- **Deterministic SOQL Query Ordering:** Compound ordering `ORDER BY Chunk_Index__c ASC, Id ASC` to guarantee deterministic reassembly.
- **Bounded Pagination:** Client-side retrieval fetches chunks in bounded batches (page size: 10 chunks = 1.31 MB per transaction) to respect heap boundaries.

---

## 5. Ingestion Strategy & Apex Service Boundaries

```
External Node Analyzer (scripts/)
  │
  ├─> 1. Analyzes AST, computes cycles, derives nodes/edges
  ├─> 2. Partitions graph payload into <=131,072 char chunks
  ├─> 3. Dispatches via REST/Bulk API to DAGraphIngestionService
  │
Salesforce Apex Services
  │
  ├── DAGraphIngestionService.cls
  │     - Validates payload envelope & schema integrity
  │     - Inserts/updates DA_Project__c & DA_Analysis_Run__c
  │     - Inserts DA_Graph_Chunk__c in bulk batches (<=200 records/DML)
  │     - Runs in WITH USER_MODE with strict FLS checks
  │
  ├── DAGraphChunkService.cls
  │     - Provides paginated chunk retrieval for LWC
  │     - Bounded offset and limit validation
  │
  └── DAGraphController.cls
        - Thin @AuraEnabled facade exposing getProjects, getAnalysisRuns, getGraphChunks
```

---

## 6. Cytoscape Constraints & LWC Canvas Runtime

1. **Static Resource Integration:** Cytoscape.js is loaded exclusively via `lightning/platformResourceLoader`.
2. **Single-Canvas Invariant (DEC-02):** A single DOM container element must host the active Cytoscape instance. Concurrent multi-canvas instantiations degrade browser memory and trigger LWS sandboxing penalties.
3. **DOM Lifecycle Discipline:**
   - Always call `cy.destroy()` in `disconnectedCallback()`.
   - Tear down all event listeners (`tap`, `select`, `viewport`) before swapping graph runs.
4. **Layout Worker Boundary:**
   - Web Workers are restricted in certain Salesforce LWS configurations.
   - For standard graphs (<= 3,000 nodes), `daLayoutEngine.js` executes coordinate calculation directly on the main thread using requestAnimationFrame batching.
   - Fallback coordinate calculation utilizes pre-computed coordinates embedded in `node.position` generated by external analysis.

---

## 7. LWC State Architecture & Event Model (CONTRACT-06)

1. **Unidirectional Data Flow:**
   - Parent Shell (`daAppShell`) maintains authoritative state: `activeProjectId`, `activeRunId`, `selectedNodeId`, `activeViewMode`.
   - Inbound public properties (`@api`) in child views are strictly immutable to the child.
2. **Event Dispatch Contract:**
   - Child components never mutate parent state directly.
   - Interactive LWCs dispatch standard CustomEvents with `{ bubbles: true, composed: true, cancelable: false }`:
     - `nodeselect`: `{ detail: { nodeId: string, nodeType: string, layer: string, sourceComponent: string, timestamp: number } }`
     - `filterchange`: `{ detail: { layerFilters: string[], severityFilters: string[] } }`
     - `projectchange`: `{ detail: { projectId: string, projectKey: string } }`
3. **SELECTION ≠ NAVIGATION Invariant:**
   - Clicking a node in a visualization selects the node for inspection (`nodeselect`), but **never** forces an automatic route navigation or view switch unless explicitly invoked by a user navigation action.

---

## 8. Navigation Model & Deep-Linking

The React application uses client-side URL routing (`/projects/:key/views/:viewMode?node=:nodeId`). In Salesforce Lightning:
- Use `lightning/navigation` (`NavigationMixin`).
- Map views to URL query parameters via state mapping:
  - `c__project`: Project Key or ID
  - `c__view`: Active View Mode (graph, matrix, findings, history, compare, dashboard, etc.)
  - `c__run`: Specific Analysis Run ID
  - `c__node`: Selected Node ID for focused investigation
- Support deep link hydration on `connectedCallback()` in `daAppShell`.

---

## 9. Blocked/Dependent Files Resolution Matrix

| File / Component Family | Root Cause of Blockage | Resolution Architecture |
|---|---|---|
| `layout/orbit-layout.ts`, `constellation-layout.ts`, `sankey-layout.ts` | Complex force-simulation algorithms, high CPU | Reimplemented in `daLayoutEngine.js` with deterministic math; coordinates cached on ingestion. |
| `workers/layout.worker.ts` | Web Worker restrictions under LWS | Pure JS coordinate calculations in `daLayoutEngine` with microtask slicing; external analyzer pre-bakes positions. |
| `adapters/*-adapter.ts` | Tight coupling to React Context and local state | Converted to pure LWC utility functions taking standard Graph DTO and emitting renderable SVG/Canvas models. |
| `explorer/public/projects/*/explorer-data.json` | Giant flat JSON files (5 MB - 30 MB) | Ingested into `DA_Graph_Chunk__c` with 131,072 character chunking and bounded chunk streaming. |
| `diff-adapter.ts`, `graph-diff.ts` | Multi-graph memory overhead | Compared via lightweight `DAAnalysisRunDTO` and client-side set-difference algorithms. |
