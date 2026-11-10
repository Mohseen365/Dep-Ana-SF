# Agent 8A UX Interaction Specification

## Document Metadata
- **Agent**: Agent 8A (UX Interaction Preparation)
- **Coordinator**: Integration Coordinator D1
- **Date**: 2026-11-10
- **Status**: PREPARATION COMPLETE (SPECIFICATION ONLY)

---

## 1. Scope & Governance Boundaries
Agent 8A is authorized strictly for read-only inspection and technical UX interaction specification covering:
- Graph keyboard navigation and accessibility standards.
- Global Command Palette architecture and action contracts.
- Node and edge hover-card positioning and content models.

**Prohibitions Enforced**:
- Zero creation of production LWC components.
- Zero modification to `daGraphViewer` or shared shell files (`daAppShell`, `daHeader`, `daSidebar`).
- Zero changes to navigation or frozen selection DTOs (CONTRACT-06).
- Implementation is reserved exclusively for Agent 8B under separate implementation authorization.

---

## 2. Command Palette Architectural Specification

### 2.1 Scope & Purpose
A modal spotlight / command bar triggered globally (`Ctrl+K` or `Cmd+K`) enabling keyboard-driven navigation, node searching, view switching, and analysis actions without context loss.

### 2.2 Action Registry & Contracts
The command palette maintains an in-memory action catalog:

```typescript
interface CommandAction {
  id: string;
  category: 'NAVIGATION' | 'NODE_SEARCH' | 'ANALYSIS' | 'EXPORT';
  title: string;
  shortcut?: string;
  keywords: string[];
  handler: (context: ShellContext) => void;
}
```

- **Navigation Actions**:
  - Switch to Overview (`activeView = 'overview'`)
  - Switch to Architecture / Cytoscape (`activeView = 'architecture'`)
  - Switch to Sankey Flow (`activeView = 'river'`)
  - Switch to Metrics / Circular / Chord / Tree / Matrix modes
- **Search Actions**:
  - Incremental fuzzy search across `graphData.nodes` by `name`, `id`, or `layer`.
  - Selecting a search item triggers `nodeselect` (`SELECTION != NAVIGATION`).
- **Analysis Actions**:
  - Toggle Cycle Highlight
  - Open Snapshot Comparison Modal
  - Open Preset Filter Dialog
  - Export Current Graph (PNG/SVG/JSON)

### 2.3 Visual & Interaction Rules
- **Keyboard Traversal**: `ArrowDown` / `ArrowUp` cycles focused item; `Enter` executes action; `Escape` closes palette.
- **Focus Trap**: Paletted modal traps DOM focus inside its input while open.

---

## 3. Keyboard Behavior & Accessibility (WCAG 2.1 AA)

### 3.1 Graph Canvas Traversal
- `Tab`: Shifts focus into the Cytoscape canvas container.
- `+` / `-`: Zoom in / Zoom out.
- Arrow Keys (`Left`, `Right`, `Up`, `Down`): Pan canvas viewport by 50px increments.
- `[` / `]`: Cycle selection through adjacent connected neighbor nodes.
- `Escape`: Clear current selection or close active overlay.

### 3.2 Focus Indicators & Screen Reader Support
- Canvas wrapper must expose `role="region"` and `aria-label="Interactive Architecture Graph Canvas"`.
- Focusable canvas node proxies must provide `aria-roledescription="graph node"` and announce node name, layer, and connection degree.

---

## 4. Node & Edge Hover-Card Architecture

### 4.1 Activation & Debounce Disciplines
- **Hover Delay**: 200 ms hover dwell before card renders (avoids flicker during fast mouse traversal).
- **Dismiss Delay**: 150 ms grace period when mouse leaves target before unmounting.
- **Positioning**: Fixed or floating portal with boundary collision detection against viewport edges.

### 4.2 Content Schema
- **Node Hover Card**:
  - Node Name & Type Badge (`ApexClass`, `LWC`, `CustomObject`).
  - Layer Identifier (`Core`, `UI`, `Service`, `Data`).
  - In-degree & Out-degree metrics.
  - Active Finding Count (e.g. `2 Violations, 1 Cycle`).
- **Edge Hover Card**:
  - Source Node -> Target Node relationship.
  - Dependency Type (`References`, `Extends`, `Implements`, `Calls`).
  - Cycle Indicator (if part of Strongly Connected Component).

---

## 5. UI Test Specifications for Agent 8B Implementation
1. `test_command_palette_shortcut_opens_modal`:
   - Dispatches `keydown` with `Ctrl+K`; asserts palette modal renders in DOM.
2. `test_command_palette_fuzzy_search`:
   - Enters query `"OrderService"`; asserts matching node actions listed.
3. `test_selection_invariant`:
   - Selecting node via command palette fires `nodeselect` without changing active view tab (`SELECTION != NAVIGATION`).
4. `test_hover_card_debounce_and_render`:
   - Simulates `mouseover` on node element; verifies 200ms debounce before DOM appearance.
