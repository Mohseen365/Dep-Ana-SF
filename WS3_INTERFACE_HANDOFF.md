# Workstream 3 (WS-3) Interface & Integration Handoff

This document details the public interface contracts, `@api` reactive properties, CustomEvents, and integration guidelines for Workstream 3 components in the Salesforce Dependency Analyzer POC.

---

## 1. Component Interface Specifications

### 1.1 `daFindingsView`
- **Location**: `scratch/salesforce-poc/force-app/main/default/lwc/daFindingsView/`
- **Purpose**: Displays architectural rule violations across circular dependencies, untested high-risk components, unresolved references, and coupling hotspots.
- **Inbound `@api` Properties**:
  | Property | Type | Description |
  | :--- | :--- | :--- |
  | `projectId` | `String` | Active project Salesforce record ID or external key |
  | `graphPayload` | `Object` / `String` | Canonical graph analytics payload |
  | `payload` | `Object` / `String` | Property alias for `graphPayload` |
  | `filterCriteria` | `Object` | Filter criteria object (search, severity, coverage) |
  | `selectedNodeId` | `String` | Identifier of currently selected/highlighted node |
- **Outbound CustomEvents**:
  | Event Name | Options | Detail Payload | Purpose |
  | :--- | :--- | :--- | :--- |
  | `nodeselect` | `{ bubbles: true, composed: true, cancelable: false }` | `{ nodeId: string, sourceView: 'findings', sourceComponent: 'daFindingsView', timestamp: number }` | Selects a finding's target node for cross-view highlighting without view navigation (`SELECTION != NAVIGATION`). |
- **Local Features**:
  - Severity classification buttons (Critical, High, Medium, All).
  - Status filter buttons (Open, In Review, Resolved, All).
  - Review workflow actions: "Mark In Review", "Resolve", "Reopen".
  - Structured guidance cards: WHAT, WHY IT MATTERS, WHERE, WHAT TO DO NEXT.
  - CSV and JSON export actions.

---

### 1.2 `daMatrixView`
- **Location**: `scratch/salesforce-poc/force-app/main/default/lwc/daMatrixView/`
- **Purpose**: Displays directed dependency aggregation grid between source types (rows) and target types (columns).
- **Inbound `@api` Properties**:
  | Property | Type | Description |
  | :--- | :--- | :--- |
  | `projectId` | `String` | Active project identifier |
  | `graphPayload` | `Object` / `String` | Canonical graph analytics payload |
  | `payload` | `Object` / `String` | Property alias for `graphPayload` |
  | `filterCriteria` | `Object` | Filter criteria object |
  | `selectedNodeId` | `String` | Currently highlighted node ID |
- **Outbound CustomEvents**:
  | Event Name | Options | Detail Payload | Purpose |
  | :--- | :--- | :--- | :--- |
  | `nodeselect` | `{ bubbles: true, composed: true, cancelable: false }` | `{ nodeId: string, sourceView: 'matrix', sourceComponent: 'daMatrixView', timestamp: number }` | Emitted when selecting a sample constituent node from the cell inspector. |
- **Local Features**:
  - Cell click inspection: Displays source/target types, exact coupling count, and sample dependency edges.
  - Layer filter selector.
  - CSV and JSON export actions.

---

### 1.3 `daHotspotsView`
- **Location**: `scratch/salesforce-poc/force-app/main/default/lwc/daHotspotsView/`
- **Purpose**: Displays composite hotspot ranking table combining coupling, fan-in, fan-out, churn, complexity, and cycle flags.
- **Inbound `@api` Properties**:
  | Property | Type | Description |
  | :--- | :--- | :--- |
  | `projectId` | `String` | Active project identifier |
  | `payload` | `Object` / `String` | Canonical graph payload |
  | `graphPayload` | `Object` / `String` | Property alias for `payload` |
  | `selectedNodeId` | `String` | Identifier of selected node |
- **Outbound CustomEvents**:
  | Event Name | Options | Detail Payload | Purpose |
  | :--- | :--- | :--- | :--- |
  | `nodeselect` | `{ bubbles: true, composed: true, cancelable: false }` | `{ nodeId: string, node: object, sourceView: 'hotspots', sourceComponent: 'daHotspotsView', timestamp: number }` | Emitted on table row click. |
- **Local Features**:
  - Category filtering (`all`, `coupling`, `fanIn`, `cycles`).
  - Risk level filtering (`HIGH`, `MEDIUM`, `LOW`).
  - Search query filtering.
  - CSV and JSON export actions.

---

### 1.4 `daDiagnosticsView`
- **Location**: `scratch/salesforce-poc/force-app/main/default/lwc/daDiagnosticsView/`
- **Purpose**: Displays architectural health score (0-100), cyclic SCC count, test coverage density, and layer breakdown distribution.
- **Inbound `@api` Properties**:
  | Property | Type | Description |
  | :--- | :--- | :--- |
  | `projectId` | `String` | Active project identifier |
  | `payload` | `Object` / `String` | Canonical graph payload |
  | `graphPayload` | `Object` / `String` | Property alias for `payload` |
  | `selectedNodeId` | `String` | Identifier of selected node |
- **Outbound CustomEvents**:
  - Read-only dashboard view: emits zero navigation or mutation events.
- **Local Features**:
  - Scorecard cards: Architecture Health Score, Cyclic SCC Count, High-Risk Components, Test Coverage Density.
  - Zero-denominator defensive mathematical guards.
  - Layer distribution table with coverage and risk metrics.
  - CSV and JSON export actions.

---

### 1.5 `daPresetManager`
- **Location**: `scratch/salesforce-poc/force-app/main/default/lwc/daPresetManager/`
- **Purpose**: Project-scoped filter preset persistence and management.
- **Inbound `@api` Properties**:
  | Property | Type | Description |
  | :--- | :--- | :--- |
  | `projectId` | `String` | Mandatory active project ID for preset isolation |
  | `filterContainer` | `Object` / `String` | V2 filter container JSON / object |
  | `activeFilter` | `Object` | Currently active filter criteria |
- **Outbound CustomEvents**:
  | Event Name | Options | Detail Payload | Purpose |
  | :--- | :--- | :--- | :--- |
  | `filterchange` | `{ bubbles: true, composed: true }` | `{ activeFilter: object, activePresetId: string \| null }` | Emitted when a preset is applied or cleared. |
  | `containerchange` | `{ bubbles: true, composed: true }` | `{ container: object }` | Emitted when presets are created, updated, or deleted. |

---

## 2. Invariants & Coordination Rules

1. **`SELECTION != NAVIGATION` Invariant**:
   All selection events emitted from `daFindingsView`, `daMatrixView`, and `daHotspotsView` are purely informational (`nodeselect`). They MUST NOT navigate away from the current view mode or alter `activeViewMode` in `daAppShell`.
2. **Payload Immutability**:
   Components never mutate the incoming graph analytics payload. All transformations, aggregations, and derivations operate on local structures or non-destructive derivations.
3. **Event Options**:
   Every `nodeselect` event is dispatched with `{ bubbles: true, composed: true, cancelable: false }` per CONTRACT-06.
4. **Shared Object Metadata**:
   WS-3 introduces zero changes to `DA_Finding__c` or any other Salesforce object schema, deferring persistence schema changes to the Integration Coordinator.
