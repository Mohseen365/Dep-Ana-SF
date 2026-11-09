# Workstream 6 (WS-6) Interface Handoff Specification

## 1. Component Interface: `daInvestigationDrawer`
- **Location:** `scratch/salesforce-poc/force-app/main/default/lwc/daInvestigationDrawer/`
- **Mounting Target:** `daAppShell` sliding drawer overlay.

### 1.1 Inbound Reactive Properties (`@api`)
| Property | Type | Description |
| :--- | :--- | :--- |
| `selectedNodeId` | `String` | Unique ID of node currently selected. Setting to null resets drawer to empty state. |
| `graphPayload` | `Object` | Canonical graph payload adhering to `CONTRACT-01`. Resolves node details & incident edges. |
| `projectId` | `String` | Active project ID for scoping child `c-da-annotation-panel`. |
| `findings` | `Array` | Findings array from analyzer or `DA_Finding__c`. Filtered by `targetNodeId`. |
| `isPinned` | `Boolean` | Flag controlling whether selection trail is preserved during view/project change. |
| `isDetached` | `Boolean` | Flag indicating if drawer has popped out to detached browser window. |

### 1.2 Outbound CustomEvents
- `nodeselect`:
  - Dispatched on 1-hop drill-down click.
  - Detail: `{ nodeId: string, node: object, sourceView: 'investigationDrawer', meta: { isDrillDown: true, isPinned: boolean } }`
  - Options: `{ bubbles: true, composed: true, cancelable: false }`
- `pintoggle`:
  - Dispatched when user toggles pinning.
  - Detail: `{ isPinned: boolean, nodeId: string }`
- `close`:
  - Dispatched when drawer is dismissed.
- `detach`:
  - Dispatched when user requests pop-out into separate browser window.

### 1.3 Detached Window IPC Contract
- Channel: `da_investigation_channel` (`BroadcastChannel`)
- Inbound Messages:
  - `{ type: 'DRAWER_SELECT_NODE', nodeId: string }`: Selects node from pop-out window.
  - `{ type: 'DRAWER_TOGGLE_PIN' }`: Toggles pin state.
- Outbound Messages:
  - `{ type: 'DRAWER_SYNC', projectId, selectedNodeId, isPinned }`: Syncs state to pop-out.
  - `{ type: 'DRAWER_DETACHED', projectId, selectedNodeId, isPinned }`: Signals window detachment.

---

## 2. Module Interface: `daRefactoringEngine`
- **Location:** `scratch/salesforce-poc/force-app/main/default/lwc/daRefactoringEngine/daRefactoringEngine.js`
- **Import:** `import { simulateRefactoring, computeTarjanSCC, countCyclicSCCs, edgeParticipatesInDirectedCycle, generateHandoffMarkdown, generateHandoffJson } from 'c/daRefactoringEngine';`

### 2.1 Function: `simulateRefactoring(baseGraph, actions)`
- `baseGraph`: `CanonicalGraphPayload` (unmutated).
- `actions`: `RefactoringAction[]` (`EXTRACT_CLASS`, `EXTRACT_INTERFACE`, `BREAK_CYCLE`, `REMOVE_NODE`).
- Returns:
  ```json
  {
    "success": true,
    "appliedActionsCount": 1,
    "breakCycleActionsApplied": 1,
    "actionLogs": [...],
    "errors": [],
    "resultingPayload": { ... },
    "deltas": {
      "baseCyclicSccCount": 2,
      "newCyclicSccCount": 1,
      "cyclicSccCountDelta": -1,
      "cyclicSccReduction": 1,
      "breakCycleActionsApplied": 1,
      "baseCoupling": 10,
      "newCoupling": 9,
      "couplingDelta": -1
    }
  }
  ```

---

## 3. Component Interface: `daRefactorHandoffModal`
- **Location:** `scratch/salesforce-poc/force-app/main/default/lwc/daRefactorHandoffModal/`
- **Inbound `@api` Properties:**
  - `isOpen`: Boolean.
  - `handoffPlan`: Refactoring handoff plan object.
- **Outbound CustomEvents:**
  - `close`: Dispatched when modal is closed.
