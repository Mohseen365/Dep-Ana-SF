# Shared Architecture Contracts & Boundary Specifications

This document defines the authoritative, frozen contracts across all six workstreams, ensuring technical interoperability, security boundaries, and predictable data exchange between React legacy parity and the target Salesforce platform architecture.

---

## 1. Project & Analysis Run Identity Contract

### 1.1 Two-Step Project Resolution Contract (CONTRACT-04 / W7-P1)
To prevent cross-project run leakage while supporting both Salesforce record IDs and external project keys:
1. **Primary Query**: Attempt exact match against `DA_Project__c.Id` if the input is an 18-character (or 15-character) valid Salesforce ID string.
2. **Secondary Fallback**: If the ID query yields zero rows or the string fails ID format validation, execute query against `DA_Project__c.Project_Key__c = :inputKey`.
3. **Fail-Closed**: If both queries return zero rows, return an explicit NOT_FOUND error response. Never execute combined `OR` queries across ID and Key.

### 1.2 Analysis Run Lifecycle & Ingestion Status
Because zero-schema `DA_Analysis_Run__c` lacks status fields, status is determined deterministically:
- `AVAILABLE`: Analysis run record exists and has >= 1 associated `DA_Graph_Chunk__c` records.
- `EMPTY`: Analysis run record exists and has exactly 0 associated `DA_Graph_Chunk__c` records.
- `FAILED`: Analysis run record marked with error or generation failure.

SOQL queries ordering analysis runs must use deterministic compound ordering:
```sql
SELECT Id, Name, Commit_Hash__c, Run_Timestamp__c, Node_Count__c, Edge_Count__c, Cyclic_SCC_Count__c, Total_Chunks__c, Total_Payload_Size_Chars__c
FROM DA_Analysis_Run__c
WHERE DA_Project__c = :projectId
ORDER BY Run_Timestamp__c DESC, Id DESC
```

---

## 2. Canonical Graph Data Transfer Objects (CONTRACT-01)

Graph payloads reassembled by `daGraphPayloadLoader` adhere to the canonical schema:

```typescript
export interface CanonicalGraphPayload {
  schemaVersion: "1.0.0";
  projectId: string;
  projectKey: string;
  analysisRunId: string;
  timestamp: string;
  metrics: {
    nodeCount: number;
    edgeCount: number;
    cyclicSccCount: number;
    density: number;
  };
  nodes: GraphNodeDTO[];
  edges: GraphEdgeDTO[];
}

export interface GraphNodeDTO {
  id: string;                      // Unique node identifier (e.g. class/component name)
  label: string;                   // Display label
  type: string;                    // "ApexClass", "AuraComponent", "LWC", "CustomObject"
  layer: "Core" | "Domain" | "Service" | "Selector" | "UI" | "External";
  metrics: {
    linesOfCode?: number;
    cyclomaticComplexity?: number;
    fanIn: number;
    fanOut: number;
    instability?: number;
    compositeScore?: number;       // Hotspot severity score
  };
  attributes?: Record<string, any>;
}

export interface GraphEdgeDTO {
  id: string;                      // Unique edge identifier: `${source}->${target}`
  source: string;                  // Source node ID
  target: string;                  // Target node ID
  type: "calls" | "references" | "extends" | "implements" | "reads" | "writes";
  weight?: number;                 // Coupling weight
  isCyclic?: boolean;              // True if edge participates in a directed cycle
}
```

---

## 3. Graph Chunking & Ingestion Protocol (CONTRACT-05 / DEC-02)

To accommodate the Salesforce LongTextArea limit (131,072 characters) and governor limits:
1. **Max Chunk Size**: Exactly **131,072 characters** (JavaScript UTF-16 code units / String.length).
2. **Surrogate Pair Boundary Safety**: Chunks must **never** split a UTF-16 surrogate pair (High surrogate `0xD800-0xDBFF`, Low surrogate `0xDC00-0xDFFF`). If a boundary falls between a surrogate pair, the split index is shifted back by 1 character.
3. **Max Total Payload Cap**: **10,485,760 characters (~10 MB)**. Payloads exceeding this limit fail validation immediately.
4. **Contiguous Indexing**: Chunks are zero-indexed (`Chunk_Index__c = 0, 1, 2, ...`). Reassembly strictly validates that chunks are contiguous without gaps or duplicates.
5. **Paginated Retrieval**: `DAGraphController.getGraphChunksPaginated(analysisRunId, startIndex, maxChunks)` fetches chunks in pages (default limit: 10 chunks per query).

---

## 4. Analytical Views DTOs (Findings, Diagnostics, Hotspots)

### 4.1 Finding DTO
```typescript
export interface FindingDTO {
  id: string;
  analysisRunId: string;
  ruleId: string;                  // e.g. "ARCH-001-CIRCULAR-DEPENDENCY"
  ruleName: string;
  severity: "Blocker" | "Critical" | "Major" | "Minor" | "Info";
  targetNodeId: string;
  sourceNodeId?: string;
  details: string;
  status: "Active" | "Suppressed" | "Resolved";
}
```

### 4.2 Hotspot DTO
```typescript
export interface HotspotDTO {
  nodeId: string;
  nodeName: string;
  layer: string;
  churnRate: number;               // Git commit frequency
  complexity: number;              // Cyclomatic complexity
  fanIn: number;
  fanOut: number;
  compositeScore: number;          // Weighted hotspot formula
  rank: number;
}
```

---

## 5. LWC Properties and CustomEvent Specifications

### 5.1 Inbound Reactive Properties (`@api`)
Child view components (`daGraphViewer`, `daMatrixView`, `daFindingsView`, `daDiagnosticsView`, `daSubwayView`, `daTreemapView`, `daArchitectureDnaBarcode`) accept standardized reactive properties from `daAppShell`:

| Property | Type | Description |
| :--- | :--- | :--- |
| `graphPayload` | `Object` / `CanonicalGraphPayload` | Shared validated graph data model |
| `filterCriteria` | `Object` / `FilterCriteriaDTO` | Active search, layer filters, and threshold settings |
| `selectedNodeId` | `String` | Currently selected node identifier (for synchronized highlighting) |
| `highlightedNodeIds` | `Array<String>` | Multi-node highlight array (e.g. 1-hop neighborhood) |

### 5.2 Outbound CustomEvents (CONTRACT-06)
Child components dispatch events upward to `daAppShell` using standard DOM CustomEvents:

#### A. Node Selection Event (`nodeselect`)
- **Event Name**: `nodeselect`
- **Options**: `{ bubbles: true, composed: true, cancelable: false }`
- **Payload (`event.detail`)**:
```typescript
export interface NodeSelectionDetail {
  nodeId: string;                  // Primary target node ID (empty string on deselection)
  nodeType?: string;               // Node classification type
  layer?: string;                  // Architecture layer
  sourceComponent: string;         // Originating LWC name (e.g. "daTreemapView")
  timestamp: number;               // Date.now()
  rawData?: any;                   // Underlying node object
}
```

#### B. Filter Change Event (`filterchange`)
- **Event Name**: `filterchange`
- **Options**: `{ bubbles: true, composed: true, cancelable: false }`
- **Payload (`event.detail`)**:
```typescript
export interface FilterChangeDetail {
  searchQuery: string;
  selectedLayers: string[];
  selectedTypes: string[];
  minHotspotScore: number;
  hideExternal: boolean;
  cyclicOnly: boolean;
}
```

#### C. View Change Event (`viewchange`)
- **Event Name**: `viewchange`
- **Options**: `{ bubbles: true, composed: true, cancelable: false }`
- **Payload (`event.detail`)**:
```typescript
export interface ViewChangeDetail {
  viewMode: "graph" | "matrix" | "findings" | "diagnostics" | "subway" | "treemap" | "dna" | "radar" | "project";
}
```

---

## 6. Refactoring Simulation DTOs & Metrics (CONTRACT-07 / DEC-03)

### 6.1 Refactoring Action DTO
```typescript
export type RefactoringActionType = "EXTRACT_CLASS" | "EXTRACT_INTERFACE" | "MOVE_METHOD" | "REMOVE_NODE" | "BREAK_CYCLE";

export interface RefactoringActionDTO {
  id: string;
  type: RefactoringActionType;
  sourceNodeId: string;
  targetNodeId?: string;
  edgeId?: string;
  metadata?: {
    newClassName?: string;
    movedMethodList?: string[];   // Informational metadata only
  };
}
```

### 6.2 Simulation Delta Metrics
Simulation calculations adhere to mathematical Tarjan SCC definitions:
- `cyclicSccCountDelta = newCyclicSccCount - baseCyclicSccCount` (A negative value indicates reduced circular dependencies).
- `breakCycleActionsApplied`: Exact count of severed edges.
- `REMOVE_NODE`: Atomically removes all incident edges (incoming, outgoing, self-loops) preventing dangling graph references.

---

## 7. Standardized Error Response Format

All Apex controllers catch exceptions and return a unified error response DTO (`classes/dto/DAErrorResponse.cls`):

```typescript
export interface DAErrorResponse {
  isSuccess: false;
  errorCode: string;               // e.g. "SECURITY_FLS_VIOLATION", "NOT_FOUND", "PAYLOAD_TOO_LARGE"
  message: string;                 // User-friendly error message
  technicalDetails?: string;       // Stack trace or diagnostic info (restricted in production)
  timestamp: string;               // ISO-8601 string
}
```
