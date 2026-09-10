# Salesforce Architecture & Refactoring Explorer - Impact / Blast Radius

## Objective
The Impact / Blast Radius feature provides read-only visualization and metrics to answer:
> "If this component changes, what other components could be affected?"

It helps architects and developers evaluate refactoring risks by highlighting all affected dependent components, test classes, cycle participations, and unresolved references across configurable depth levels.

---

## Existing Data Used
The feature consumes deterministic metadata from `explorer-data.json` without modifying analyzer data or contract interfaces:
* `impactSummaries`: Precomputed direct/transitive dependencies, direct/transitive dependents, impacted test classes, and total impact count per component.
* `nodes`: Node type, risk score, behavior capabilities, file path, readiness flags.
* `edges`: Directional source-target relationships, relationship types, resolution status, evidence snippets.
* `cycles`: Participating circular dependency groups.
* `unresolvedReferences`: Edges marked unresolved by the analyzer.

---

## UI Behavior & Controls

### 1. Entry Point
* **Action Button in Details Panel**: Selecting any node displays a prominent `💥 Show Impact / Blast Radius` action button in the details panel header/section.
* **Impact Controls Bar**: Displays `Show Impact` / `Exit Impact` button, origin tag (`★ Service ★`), depth selector, and blast-radius summary metrics.

### 2. Impact Direction & Semantics
* **Impact Direction**: Dependents (incoming edges / components that call or depend on the selected origin component).
* **Clear Terminology**:
  * **Dependencies**: Components that the selected component calls or depends on.
  * **Dependents**: Components that call or depend on the selected component.
  * **Blast Radius / Impact**: The set of components affected when the selected component is changed.

### 3. Depth Semantics
* **Depth 1**: Direct dependents (1 hop in incoming direction).
* **Depth 2**: Direct and 2nd-degree dependents (up to 2 hops).
* **Depth 3**: Direct, 2nd, and 3rd-degree dependents (up to 3 hops).
* **ALL**: Complete transitive closure of all reachable dependents.

### 4. Graph Visualization
* **Origin Node**: Highlighted with a thick gold border (`impact-origin`).
* **Affected Nodes**: Highlighted with a red border (`impact-affected`).
* **Affected Edges**: Highlighted with bold red lines (`impact-affected`).
* **Unrelated Elements**: Visually muted with reduced opacity (`impact-muted`).
* **Base Styling Preserved**: Fundamental Salesforce entity type colors from Prompt 6 remain intact beneath impact state highlights.

### 5. Blast-Radius Summary Metrics
* **Direct Dependents**: Count of direct callers/dependents.
* **Transitive Dependents**: Count of all transitive callers/dependents.
* **Impacted Components**: Total affected components at selected depth (with visible count if filters hide any).
* **Impacted Tests**: List of impacted Apex test classes (with direct click-to-select navigation). Displays `No impacted tests identified by analyzer data.` if empty.
* **Cycles Involved**: Count of circular dependency groups involving affected components.
* **Unresolved References**: Count of unresolved edge references in the blast radius.

### 6. Exit Impact Mode
* Clicking `Exit Impact` clears impact highlights and restores the normal graph view while preserving active search and filter criteria.

---

## State Behavior
* Pure transformation logic in `explorer/src/lib/impact-analysis.ts` computes impact state deterministically.
* Filter awareness: Summary metrics track visible vs total impacted count if user filters (e.g. search or type filter) hide parts of the impact set.

---

## Automated Tests
Automated tests in `explorer/src/lib/impact-analysis.test.ts`, `explorer/src/components/ImpactControls.test.tsx`, and `explorer/src/components/DetailsPanel.test.tsx` cover:
1. Impact activation for a selected node.
2. Accurate summary display and metrics extraction.
3. Direct vs transitive dependent classification.
4. Depth filtering (Depth 1, 2, 3, ALL).
5. Graph highlighting and muting element sets.
6. Impacted test class display and empty-state fallback.
7. Isolated components with 0 dependents.
8. Cycle and unresolved reference handling.
9. Exiting impact mode and state restoration.

---

## Limitations
* Impact calculation is strictly static dependency reachability as determined by the deterministic analyzer output (`explorer-data.json`).
* Dynamic execution flows, runtime reflection, or soft dependencies not captured in static code analysis are excluded.
