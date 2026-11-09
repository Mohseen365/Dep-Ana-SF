# Workstream 2 (WS-2) Interface Handoff Document

## 1. Stable Published Interfaces

Downstream workstreams and coordinating agents may safely integrate with and build upon the following stable interfaces:

### 1.1 `c/daGraphPayloadLoader`
Exported utility functions:
```javascript
export const MAX_CHUNK_SIZE = 131072;
export const MAX_TOTAL_PAYLOAD_SIZE = 10485760;

export function chunkPayload(rawJson, maxChunkSize = MAX_CHUNK_SIZE): string[];
export function reassembleChunks(chunks: string[]): string;
export function validatePayloadIntegrity(rawJson: string): boolean;
export function verifyChunkSequence(chunks: Array<{ Chunk_Index__c: number }>, expectedStartIndex?: number): boolean;
export function validateChunkLimits(chunks: Array<string | { Payload_Data__c: string }>, maxChunkSize?: number): boolean;
export function validatePayloadSize(rawJson: string, maxTotalSize?: number): boolean;
```

### 1.2 `c/daLayoutEngine`
Deterministic layout algorithms adhering to pure function input/output signatures:
```javascript
export function classifyNodeLayer(node: object): string;
export function computeArchitectureLayout(nodes: object[], edges: object[], options?: object): { positions: Record<string, { x: number, y: number }> };
export function computeOrbitLayout(input: { nodes: object[], options?: object }): { positions: Record<string, object>, guides: object, diagnostics: object };
export function computeConstellationLayout(data: { focalNode: object, rings: object[], edges: object[] }, options?: object): { focalPosition: object, nodePositions: Record<string, object>, edgePaths: object[], ringGeometries: object[], viewport: object };
export function computeSankeyLayout(data: { stages: object[], nodes: object[], flows: object[], nodeMap?: Map<string, object> }, options?: object): { width: number, height: number, stages: object[], nodes: object[], flows: object[], nodeGeometryMap: Map<string, object> };
```

### 1.3 `c/daGraphViewer`
LWC Public `@api` Properties and Methods:
- `@api recordId`: Bound to active Salesforce `DA_Project__c` record ID. Updating this property safely halts prior requests, clears prior canvas state, resets node selection, and initiates data retrieval.
- `@api filterCriteria`: Accepts normalized filter object (`{ search, nodeTypes, riskLevels, layers, testCoverageStatus }`). Filters graph in-place without resetting user-dragged coordinates.
- `@api layoutMode`: Getter/setter for canonical layout mode (`grid`, `circle`, `breadthfirst`, `dagre`, `architecture`, `orbit`, `constellation`, `sankey`).
- `@api setLayout(newLayout)`: Imperatively switches layout mode, triggering debounced persistence.
- `@api zoomIn()`: Zooms viewport in by 1.2x around canvas center.
- `@api zoomOut()`: Zooms viewport out by 0.8x around canvas center.
- `@api fitView(padding)`: Fits all visible graph elements to viewport.
- `@api resetView()`: Centers and resets graph viewport.

Outbound CustomEvents:
- `nodeselect`: Emitted on node click/tap.
  - Detail: `{ nodeId: string, sourceView: 'graph' }`
  - Flags: `{ bubbles: true, composed: true, cancelable: false }`
- `edgeselect`: Emitted on edge click/tap.
  - Detail: `{ edgeId: string, sourceView: 'graph' }`
  - Flags: `{ bubbles: true, composed: true, cancelable: false }`
- `selectionclear`: Emitted on background canvas tap.
  - Detail: `{ sourceView: 'graph' }`
  - Flags: `{ bubbles: true, composed: true, cancelable: false }`
- `layoutchange`: Emitted when layout changes.
  - Detail: `{ layout: string }`
  - Flags: `{ bubbles: true, composed: true }`

---

## 2. Invariants Guaranteed by WS-2
1. `SELECTION != NAVIGATION`: Selection of any node or edge never triggers tab switching, view mode change, or project navigation.
2. **Single Active Canvas**: Cytoscape instances are strictly singletons per component instance, with guaranteed cleanup on unmount or project switch.
3. **Payload Immutability**: All calculations treat input graph payload as strictly read-only.
4. **Boundary Limits**: 131,072 character chunk limits, 10 MB total payload cap, and UTF-16 surrogate boundary safety.
