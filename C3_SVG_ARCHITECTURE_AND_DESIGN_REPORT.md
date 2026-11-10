# C3 SVG Architecture and Design Report: Dependency River / Sankey (`daSankeyView`)

> **Agent**: C3 — Dependency River Visualization Engineer
> **Wave**: 2B / REM-02
> **Component**: `daSankeyView` (`scratch/salesforce-poc/force-app/main/default/lwc/daSankeyView/`)
> **Authorization**: PO-REQ-03 Option A (Pure SVG Implementation; Rejected D3 and External Static Resources)
> **Status**: **VERIFIED IMPLEMENTATION**

---

## 1. Executive Summary

This report articulates the mathematical, geometric, and architectural foundations of `daSankeyView`, a high-performance, pure native SVG implementation of the Dependency River / Sankey flow visualization within Salesforce Lightning Web Components (LWC).

In strict conformance with **PO-REQ-03 (Option A)**, the component introduces **zero third-party dependencies**, requires **no external static resources** (such as D3, d3-sankey, or Cytoscape plugins), spawns **no secondary Cytoscape canvases**, and preserves complete **canonical graph payload immutability**.

---

## 2. Mathematical & Geometric Model

The visualization transforms an arbitrary directed graph $G = (V, E)$ into a layered stage flow diagram rendered within a deterministic SVG coordinate space.

### 2.1 Stage Layer Partitioning & Spacing
Nodes are partitioned into ordered architectural stages $S = (S_0, S_1, \dots, S_{k-1})$:
1. `presentation`: LWC, Aura, Visualforce, Apex Controllers ($S_0$)
2. `application`: Apex Triggers, Flows, Apex Services, Handlers ($S_1$)
3. `domain`: Selectors, Domain classes, Core business entities ($S_2$)
4. `schema`: Custom Objects, Custom Fields ($S_3$)
5. `supporting`: External integrations, Test classes, Utility components ($S_4$)
6. `unassigned`: Nodes lacking architectural layer attribution ($S_5$)

Stages with zero members are pruned dynamically to maximize horizontal space:
$$\text{stageXSpacing} = \frac{\text{usableWidth} - \text{nodeWidth}}{|S_{\text{active}}| - 1}$$
where $\text{usableWidth} = \text{canvasWidth} - 2 \times \text{stagePaddingX}$.

### 2.2 Node Card Geometry & Sizing
Within each column, node vertical positions ($y$) are stacked with fixed vertical gaps ($\text{nodeGapY} = 12\text{ px}$):
$$\text{flowVolume}(v) = \max(\text{inflow}(v), \text{outflow}(v), 1)$$
$$\text{height}(v) = \min\left(\text{nodeMaxHeight}, \max\left(\text{nodeMinHeight}, \text{nodeMinHeight} + \text{flowVolume}(v) \times 6\right)\right)$$
where default $\text{nodeMinHeight} = 44\text{ px}$ and $\text{nodeMaxHeight} = 140\text{ px}$.

Each node card renders:
- An outer `<rect>` with 6px border radius, subtle hover glow, and focus ring.
- A 4px vertical accent bar colored by architectural layer.
- Two text lines: primary component label and sub-metrics (`in`, `out`, `coupling`).

### 2.3 Cubic Bézier Flow Ribbons & Offset Tracking
Flows between nodes are rendered as cubic Bézier curves using SVG `<path>` elements:
$$B(t) = (1-t)^3 P_0 + 3(1-t)^2 t P_1 + 3(1-t) t^2 P_2 + t^3 P_3, \quad t \in [0, 1]$$

To prevent visual overlapping when multiple flows enter or exit the same node, running attachment offsets are tracked per node:
- **Forward Flows** ($\text{stage}_{\text{target}} > \text{stage}_{\text{source}}$):
  $$P_0 = (x_{\text{src}} + w_{\text{src}},\ y_{\text{src}} + 14 + \text{offset}_{\text{src}})$$
  $$P_3 = (x_{\text{tgt}},\ y_{\text{tgt}} + 14 + \text{offset}_{\text{tgt}})$$
  $$P_1 = (P_{0,x} + \Delta x \times 0.45,\ P_{0,y}), \quad P_2 = (P_{3,x} - \Delta x \times 0.45,\ P_{3,y})$$
- **Intra-Stage Flows** ($\text{stage}_{\text{target}} == \text{stage}_{\text{source}}$):
  Curves exit the right side of the source node and loop back into the right side of the target node, avoiding occlusion of the stage column text.
- **Backward / Cyclic Flows** ($\text{stage}_{\text{target}} < \text{stage}_{\text{source}}$):
  Loop ribbons exit the left edge of the source node and arc across intervening columns to the right edge of the upstream target, styled with red dashed strokes (`#ef4444`, `stroke-dasharray: 5,4`) to immediately highlight architectural violations.
- **Self-referential Loops** ($\text{source} == \text{target}$):
  Compact right-side loops:
  $$\text{path} = M\ (x+w)\ y\ C\ (x+w+28)\ (y-20),\ (x+w+28)\ (y+20),\ (x+w)\ (y+12)$$

- **Stroke Width Scaling**:
  $$\text{strokeWidth} = \min(22, \max(3, \text{weight} \times 2.2))$$

---

## 3. Interaction & Invariant Architecture

### 3.1 SELECTION != NAVIGATION
The component strictly adheres to the frozen invariant:
- Clicking a node card or pressing Enter/Space dispatches a standard **CONTRACT-06** event:
  ```javascript
  this.dispatchEvent(new CustomEvent('nodeselect', {
      detail: {
          nodeId,
          nodeType: 'component',
          layer: node ? node.layer : 'unassigned',
          sourceView: 'river',
          sourceComponent: 'daSankeyView',
          timestamp: Date.now(),
          rawData: node
      },
      bubbles: true,
      composed: true,
      cancelable: false
  }));
  ```
- Node or flow selection highlights connected paths and populates the integrated side inspector pane, but **never modifies the active view, URL hash, or application route**.

### 3.2 Canonical Graph Payload Immutability
- The input `@api payload` (or `@api graphPayload`) is treated as strictly read-only.
- All transformations deep-project into private adapter structures (`adaptSankeyData`), ensuring that the shared graph payload passed to sibling views is never mutated.

### 3.3 Cytoscape Single Canvas Invariant
- `daSankeyView` contains zero imports of Cytoscape.
- It operates entirely within an SVG DOM hierarchy, leaving the primary Cytoscape canvas untouched and avoiding memory duplication.

---

## 4. Accessibility & UI Integration

- **Keyboard Navigation**: All interactive SVG elements (`<g class="node-card-group">`, `<path class="flow-ribbon">`) have `tabindex="0"`, `role="button"`, and handle `keydown` (`Enter` / `Space`).
- **Screen Reader Support**: Descriptive `aria-label` attributes provide rich contextual descriptions:
  - e.g., `Component AccountService, layer application, inflow 5, outflow 2`.
  - e.g., `Flow from AccountController to AccountService, volume 3 edges`.
- **Side Inspector Pane**: Provides detailed flow provenance (component edge pairs, evidence, relationship types) without modal interruptions.
