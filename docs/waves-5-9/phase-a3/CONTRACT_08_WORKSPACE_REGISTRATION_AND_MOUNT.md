# Contract 08: Workspace Component Registration & Navigation Mount

## 1. Document Control & Identification
- **Contract ID**: `CONTRACT-08`
- **Contract Name**: Workspace Component Registration & Navigation Mount
- **Version**: `1.0.0`
- **Status**: `FROZEN`
- **Purpose**: Establishes canonical workspace view keys, display labels, tab bar ordering, component mounting interfaces, and strictly separates feature component development from coordinator-exclusive shell integration (`INT-1`).
- **Affected Tasks**: All feature tasks (`W5-1..6`, `W6-1..4`, `W7-1..3`, `W8-1..3`, `W9-1..3`) and Coordinator task `INT-1`
- **Affected Workstreams**: Workstreams A, B, C, D, E, and Integration Coordinator

---

## 2. Source-of-Truth References
1. `explorer/src/registry/workspace-registry.ts` (Original 18 registered views: 12 lenses, 6 surfaces).
2. `scratch/salesforce-poc/force-app/main/default/lwc/daAppShell/daAppShell.js` (Lines 80–120: tab definitions and active view state).
3. `scratch/salesforce-poc/force-app/main/default/lwc/daAppShell/daAppShell.html` (Existing tabs and conditional DOM template mounting).
4. `WAVE_0_4_1_AUTHORITATIVE_TASK_AND_DEPENDENCY_REGISTER.csv` (Task `INT-1`: exclusive owner of shell mounting and navigation wiring).
5. `docs/waves-5-9/phase-a1/WAVES_5_9_OWNERSHIP_CONFLICTS.csv` (Enforces coordinator-exclusive protection on `daAppShell.*`).

---

## 3. Approved Workspace Views & Canonical Keys

| View Key (`viewId`) | Tab Display Label | Canonical LWC Component Name | Wave | Workstream Owner | Mount Status in Phase A3 |
| :--- | :--- | :--- | :---: | :---: | :--- |
| `graph` | Dependency Graph | `daGraphViewer` | Baseline / W5 | Workstream A | **Mounted (Active)** |
| `matrix` | Dependency Matrix | `daMatrixView` | Wave 4 | Lane E / Coordinator | **Mounted (Active)** |
| `findings` | Architecture Findings | `daFindingsView` | Wave 4 | Lane F / Coordinator | **Mounted (Active)** |
| `radar` | Architecture Radar | `daRadarView` | Wave 6 | Workstream B | Deferred to INT-1 |
| `treemap` | Treemap Explorer | `daTreemapView` | Wave 6 | Workstream B | Deferred to INT-1 |
| `subway` | Subway Architecture Map | `daSubwayView` | Wave 6 | Workstream B | Deferred to INT-1 |
| `hotspots` | Architectural Hotspots | `daHotspotsView` | Wave 6 | Workstream B | Deferred to INT-1 |
| `diagnostics` | Architecture DNA Barcode | `daArchitectureDnaBarcode` | Wave 7 | Workstream C | Deferred to INT-1 |
| `history` | Analysis History | `daAnalysisHistoryView` | Wave 7 | Workstream C | Deferred to INT-1 |
| `compare` | Graph Comparison | `daCompareView` | Wave 8 | Workstream D | Deferred to INT-1 |
| `refactoring` | Refactoring Studio | `daRefactoringView` | Wave 9 | Workstream E | Deferred to INT-1 |

---

## 4. Standard Analytical View LWC Interface

All analytical view components developed by feature workstreams MUST expose the following standardized `@api` properties:

```typescript
export interface StandardViewProps {
  /**
   * The complete immutable architectural graph payload.
   */
  @api payload: CanonicalGraphPayload | null;

  /**
   * Current global filter criteria.
   */
  @api filterCriteria: CanonicalFilterCriteria | null;

  /**
   * Currently selected/inspected entity ID, if any.
   */
  @api selectedNodeId: string | null;

  /**
   * Salesforce Record ID of the active DA_Project__c.
   */
  @api activeProjectId: string | null;

  /**
   * Flag indicating whether user preferences are read-only.
   */
  @api readOnly: boolean;
}
```

---

## 5. Shell Integration & Protection Boundary (Contract Rule)

1. **Coordinator-Exclusive Shell Ownership**:
   - `daAppShell.js`, `daAppShell.html`, `daAppShell.css`, and `daAppShell.js-meta.xml` are **exclusively owned by the Integration Coordinator** under task `INT-1`.
   - Feature workstream tasks (`W5-1..6`, `W6-1..4`, `W7-1..3`, `W8-1..3`, `W9-1..3`) **ARE STRICTLY PROHIBITED** from modifying `daAppShell.*`.
2. **Component Isolation During Feature Waves**:
   - Workstreams build and unit-test their respective LWC components independently in their task-permitted directories.
   - Shell tab addition, conditional rendering directives (`<template if:true={isRadarActive}>`), and event wiring are executed **exclusively by the Integration Coordinator** during `INT-1`.
3. **Lazy DOM Mounting Invariant**:
   - In `daAppShell.html`, analytical views must be conditionally mounted using `<template if:true={isViewActive}>` to ensure heavy WebGL/Canvas/SVG DOM nodes are not created when the view is not visible.
