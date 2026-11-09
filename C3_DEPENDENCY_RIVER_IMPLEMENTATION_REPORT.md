# C3 Dependency River / Sankey Visualization Implementation Report

> **Agent**: C3 — Sankey and Dependency River Visualization Agent
> **Wave**: 2B
> **Task**: REM-02 (`daSankeyView` / Dependency River View)
> **Status**: **GATED PROPOSAL & READINESS SPECIFICATION (IMPLEMENTATION BLOCKED)**
> **Operating Mode**: Read-Only / Proposal Mode under DEC-04 Alternative 4

---

## 1. Executive Summary & Prerequisite Gate Audit

Agent C3 was invoked to implement the Sankey and Dependency River Visualization component (`daSankeyView`). In strict adherence to **Rule 17** ("If a dependency or authorization gate is not satisfied, perform only permitted investigation or remediation planning. Do not implement the blocked feature") and the governing **Acceptance Criteria** ("No feature implementation before authorization and ownership gates are satisfied"), this report presents a **blocked implementation proposal and comprehensive technical architecture**.

### 1.1 Prerequisite Gate Verification Checklist

| Gate # | Prerequisite Description | Expected Ratification Source | Actual Repository Status | Gate Verdict |
| :--- | :--- | :--- | :--- | :--- |
| **Gate 1** | Project Owner approval of `PO-REQ-03` | `PROJECT_OWNER_APPROVAL_REQUESTS.md` | Pending executive approval; DEC-04 Alternative 4 retains PO authority | **FAIL (BLOCKED)** |
| **Gate 2** | Formal approval of visualization scope | `MASTER_COORDINATION_REGISTER.md` | Marked `BLOCKED_ON_CONTRACT_AND_AUTH` | **FAIL (BLOCKED)** |
| **Gate 3** | Explicit allocation of `daSankeyView.*` | `REMAINING_WORK_FILE_OWNERSHIP.csv` | Marked `PROVISIONAL-NEEDS-PROJECT-OWNER` (Absent from authoritative baseline manifest) | **FAIL (BLOCKED)** |
| **Gate 4** | Approved implementation approach | Technical signoff on pure SVG vs D3 | Recommended Option A (pure SVG) pending formal PO signoff | **FAIL (BLOCKED)** |
| **Gate 5** | Confirmed graph data adapter contract | `CONTRACT-01`, `CONTRACT-06` | CONTRACT-01 and CONTRACT-06 ratified for baseline, but Sankey river adapter extensions unratified | **FAIL (BLOCKED)** |

**Determination**: Strictly **0 of 5 prerequisite gates** are formally satisfied. In compliance with the frozen governance rules, no production code (`daSankeyView.*` or `daAppShell.*`) has been created, modified, or integrated into the Salesforce POC bundle.

---

## 2. Technical Architecture & Design Specification (Once Authorized)

When the Project Owner ratifies `PO-REQ-03 (Option A)` and issues the Gate 1B Implementation Authorization Order, Agent C3 will implement `daSankeyView` according to the following mathematical, structural, and behavioral specifications.

### 2.1 Pure SVG Mathematical Implementation (Option A)

To eliminate Content Security Policy (CSP) friction, avoid Lightning Web Security (LWS) canvas/DOM restrictions, and prevent external static resource dependencies (e.g. `d3-sankey.js`), `daSankeyView` utilizes a 100% deterministic, pure client-side SVG layout engine.

#### 2.1.1 Stage & Column Layout Geometry
The layout partitions the canvas horizontally across architectural layers (stages):
- **Stages**: Ordered left-to-right (`UI` $\rightarrow$ `Service` $\rightarrow$ `Domain` $\rightarrow$ `Selector` $\rightarrow$ `Data` $\rightarrow$ `Integration` $\rightarrow$ `Utility` $\rightarrow$ `Unassigned`).
- **Spacing**:
  $$\text{stageXSpacing} = \frac{\text{usableWidth} - \text{nodeWidth}}{\text{numStages} - 1}$$
- **Node Geometry**:
  - Node width: fixed (default $180\text{ px}$).
  - Node height: flow-weighted:
    $$\text{height} = \min\left(\text{maxHeight}, \max\left(\text{minHeight}, \text{minHeight} + \text{flowVolume} \times 8\right)\right)$$
    where $\text{flowVolume} = \max(\text{inflow}, \text{outflow}, 1)$.
  - Vertical stacking: Nodes within each column are sorted by flow volume or component count, with a consistent gap $\text{nodeGapY} = 16\text{ px}$.

#### 2.1.2 Cubic Bézier Flow Ribbons
Inter-stage dependency flows are rendered as SVG `<path>` elements using smooth horizontal cubic Bézier curves:
- **Forward Flows** ($\text{stage}_{\text{target}} > \text{stage}_{\text{source}}$):
  - Start point: $(x_{\text{src}} + \text{width}, y_{\text{src}} + \text{offset}_{\text{src}})$
  - End point: $(x_{\text{tgt}}, y_{\text{tgt}} + \text{offset}_{\text{tgt}})$
  - Control points:
    $$CP_1 = \left(x_{\text{src}} + \text{width} + \frac{\Delta x}{2},\ y_{\text{src}} + \text{offset}_{\text{src}}\right)$$
    $$CP_2 = \left(x_{\text{tgt}} - \frac{\Delta x}{2},\ y_{\text{tgt}} + \text{offset}_{\text{tgt}}\right)$$
  - Path SVG command:
    `M srcX srcY C CP1x CP1y, CP2x CP2y, tgtX tgtY`
- **Backward / Cyclic Flows** ($\text{stage}_{\text{target}} \le \text{stage}_{\text{source}}$):
  - Loop ribbons or upward/downward curved arcs with distinct dashed stroke styling (`stroke-dasharray: 4,4; stroke: #ef4444;`).
- **Self Flows** ($\text{source} == \text{target}$):
  - Right-side loop path:
    `M srcX srcY C (srcX + 30) (srcY - 24), (srcX + 30) (srcY + 24), srcX (srcY + 12)`
- **Stroke Width**:
  $$\text{strokeWidth} = \min(24, \max(3, \text{weight} \times 2.5))$$
- **Offset Tracking**: Running offsets ($\text{offset}_{\text{src}}$, $\text{offset}_{\text{tgt}}$) ensure flows entering and exiting a node do not overlap.

---

## 3. Interaction & Governance Invariants

### 3.1 SELECTION != NAVIGATION Separation
In accordance with the frozen architectural invariants:
- **Node Selection**: Clicking a feature/node in `daSankeyView` highlights connected upstream and downstream flows and updates component metrics. It dispatches a `nodeselect` event adhering to **CONTRACT-06**:
  ```javascript
  this.dispatchEvent(new CustomEvent('nodeselect', {
      detail: {
          nodeId: anchorNodeId || featureId,
          nodeType: 'feature',
          layer: feature.primaryLayer,
          sourceComponent: 'daSankeyView',
          timestamp: Date.now(),
          rawData: feature
      },
      bubbles: true,
      composed: true,
      cancelable: false
  }));
  ```
- **Navigation Invariant**: Selecting a node does **NOT** navigate away from the Sankey view, mutate the router, or trigger an unprompted tab switch.
- **Dedicated Return Action**: Return to the Cytoscape canvas is handled exclusively through an explicit user action (e.g. clicking a "Return to Graph" button or tab selector), which fires `returntograph` or tab navigation.

### 3.2 Canonical Graph Payload Immutability
- The input `@api payload` is treated as strictly read-only.
- All adapter transformations (`adaptSankeyRiver`) perform deep defensive cloning or map projections, never mutating node attributes, edge weights, or metadata objects in the canonical graph payload.

### 3.3 Large Graph Scaling & Boundary Guards
- **UTF-16 & Chunk Safety**: Supports payloads up to the maximum payload cap of $10,485,760$ UTF-16 code units across 80 chunks of $131,072$ units.
- **Node Capping**: For graphs with $> 1,000$ components, feature clustering automatically consolidates components by domain/layer to maintain $< 100$ visual nodes and $< 300$ rendered flow paths, preventing browser UI thread stalling.
- **Canvas Viewport**: Renders within an SVG `viewBox` supporting CSS-based pan and zoom controls without duplicating Cytoscape canvas instances.

### 3.4 State Handling (Loading, Empty, Error)
- **Loading State**: Displays `lightning-spinner` while computing layout geometry.
- **Empty State**: Displays an SLDS illustration with an informative message if `payload` is null, empty (`nodes: []`), or contains 0 valid cross-component dependencies.
- **Error State**: Gracefully catches malformed payloads, cyclic layout exceptions, or disconnected edge references, presenting user-friendly diagnostic banners with sanitized error descriptions.

---

## 4. Planned File Ownership & Component Structure

Upon PO ratification of `PO-REQ-03` and `PO-REQ-05`, Agent C3 will own and create:

1. `scratch/salesforce-poc/force-app/main/default/lwc/daSankeyView/daSankeyView.js`: Pure SVG Sankey logic, layout computation, event dispatching, and state management.
2. `scratch/salesforce-poc/force-app/main/default/lwc/daSankeyView/daSankeyView.html`: Accessible SVG viewport, stage headers, ribbon paths, node rectangles, metric overlays, and empty/error states.
3. `scratch/salesforce-poc/force-app/main/default/lwc/daSankeyView/daSankeyView.css`: SLDS-compliant styling, theme-aware flow colors, selected/hovered flow glows, and focus outlines.
4. `scratch/salesforce-poc/force-app/main/default/lwc/daSankeyView/daSankeyView.js-meta.xml`: Salesforce metadata configuration targeting API 61.0.
5. `scratch/salesforce-poc/tests/run-c3-sankey-tests.cjs`: Dedicated offline test runner verifying adapter math, geometry, and event contracts.

---

## 5. Conclusion & Next Actions

Agent C3 has completed full technical and architectural preparation for the Dependency River visualization without violating repository gates or modifying unapproved files.

**Required Executive Action**:
- **Project Owner**: Execute Gate 1B and ratify `PO-REQ-03 (Option A)` in `PROJECT_OWNER_APPROVAL_REQUESTS.md`.
- **Workstream Lead & Integration Coordinator**: Authorize Task REM-02 dispatch upon Gate 1B release.
