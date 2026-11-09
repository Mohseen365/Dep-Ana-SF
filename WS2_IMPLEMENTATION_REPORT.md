# Workstream 2 (WS-2): Graph Engine and Cytoscape Implementation Report

## 1. Executive Summary & Status
- **Workstream:** WS-2 (Graph Engine and Cytoscape)
- **Accountable Owner:** Agent 2
- **Final Disposition:** `IMPLEMENTED`
- **Scope Verification:**
  - Graph rendering and interactive Cytoscape lifecycle management
  - Safe payload loading, bounded pagination, contiguous chunk reassembly, and boundary limits
  - Pure JavaScript deterministic layout engine (`daLayoutEngine`)
  - Interaction contracts, node and edge selection event dispatching conforming to CONTRACT-06
  - Viewport controls (fit, zoom, pan, reset) and Level-of-Detail (LOD) handling
  - Absolute preservation of the `SELECTION != NAVIGATION` invariant

All 20 test runners in `scratch/salesforce-poc/tests/` pass with zero failures (100% pass rate).

---

## 2. Component Audits & Implemented Capabilities

### 2.1 Graph Payload Loading (`daGraphPayloadLoader`)
- **Contiguous Chunk Sequencing:** Validates zero-indexed, contiguous `Chunk_Index__c` ordering without gaps, duplicates, or negative offsets.
- **Surrogate Pair Safety:** Protects UTF-16 surrogate pairs (`0xD800-0xDBFF`, `0xDC00-0xDFFF`) by rolling back chunk split boundaries by 1 code unit when a high surrogate is detected at a boundary.
- **Payload & Chunk Limits:** Strictly enforces the 131,072-character chunk limit (Salesforce LongTextArea field limit) and the 10,485,760-character (~10 MB) total payload cap.
- **Client-Side Reassembly:** Operates exclusively client-side in LWC JavaScript to eliminate Apex synchronous heap exhaustion risks (6 MB limit).
- **Stale Response Suppression:** Prevents stale asynchronous chunk and metadata responses from previous projects or superseded runs from overwriting active state.

### 2.2 Cytoscape Lifecycle & Canvas Management (`daGraphViewer`)
- **Single Active Canvas Invariant:** Preserves exactly one Cytoscape canvas instance per graph viewer component. Any existing instance is cleanly destroyed via `cyInstance.destroy()` before creating a new instance on project or run switch.
- **Teardown & Disconnection:** Cancels pending debounced state saves, halts active layout computations, and frees canvas references immediately on component disconnection.
- **Viewport Controls:** Implements public and UI event handlers for `zoomIn()`, `zoomOut()`, `fitView()`, and `resetView()`.
- **Level-of-Detail (LOD) Behavior:** Adapts container styling classes (`zoom-far`, `zoom-mid`, `zoom-near`) dynamically on zoom events to optimize label and detail rendering for large graphs.
- **Box Selection:** Enables box selection (`boxSelectionEnabled: true`) with pointer/touch support.

### 2.3 Layout Engine Integration (`daLayoutEngine`)
- **Deterministic Coordinates:** Layout algorithms produce identical, finite coordinates for identical inputs across successive executions.
- **Algorithms Implemented:**
  1. *Architecture / Hierarchical Layout (`computeArchitectureLayout`)*: Stratifies components by layer (presentation, application, domain, schema, supporting) and groups by domain.
  2. *Orbit Layout (`computeOrbitLayout`)*: Distributes components across concentric radial orbits and sectors with AABB collision repair.
  3. *Constellation Layout (`computeConstellationLayout`)*: Projects satellite dependencies around a focal component with curved SVG quadratic bezier edges.
  4. *Sankey Flow Layout (`computeSankeyLayout`)*: Positions multi-stage columns with horizontal bezier dependency flow rivers.
- **Payload Immutability:** Does not mutate the canonical graph payload; input arrays and objects are treated as strictly read-only.

### 2.4 Interaction Contracts & `SELECTION != NAVIGATION` Invariant
- **CustomEvent Conformance:**
  - `nodeselect`: Emits `{ nodeId, sourceView: 'graph' }` with `{ bubbles: true, composed: true, cancelable: false }`.
  - `edgeselect`: Emits `{ edgeId, sourceView: 'graph' }` with `{ bubbles: true, composed: true, cancelable: false }`.
  - `selectionclear`: Emits `{ sourceView: 'graph' }` on background tap with `{ bubbles: true, composed: true, cancelable: false }`.
- **Invariant Preservation:** Node or edge selection modifies detail selection state only; it never alters active project, never navigates views, never mutates recordId, and never overwrites filter presets.

---

## 3. Platform & Lightning Web Security (LWS) Evaluation
- **Offline Proof:** All offline tests execute cleanly without external network calls or DOM leaks.
- **LWS Packaging Assessment:** Cytoscape static resource is packaged as a standard Salesforce StaticResource (`application/javascript`). In an actual Salesforce org with Lightning Web Security (LWS) enabled, DOM mutations must remain contained within the component shadow tree (`lwc:dom="manual"`). Real browser/LWS validation must be performed in an authenticated scratch org deployment.

---

## 4. Test Verification Summary
- `run-poc-tests.cjs`: 43 passed, 0 failed.
- `run-w5-1-tests.cjs`: 17 passed, 0 failed.
- `run-workstream-a-tests.cjs`: 33 passed, 0 failed.
- Total suites executed across repository: 20 suites, 100% passing.
