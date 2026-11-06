# Contract 07: Refactoring Action DTOs & Simulation Operations

## 1. Document Control & Identification
- **Contract ID**: `CONTRACT-07`
- **Contract Name**: Refactoring Action DTOs & Simulation Operations
- **Version**: `1.0.0`
- **Status**: `PROPOSED`
- **Purpose**: Defines discriminated refactoring actions, simulation operation signatures, validation rules, delta metric calculations, and the handoff export schema for Workstream E (`W9-1`, `W9-2`, `W9-3`).
- **Affected Tasks**: `W9-1` (Pure Simulation Engine), `W9-2` (Simulation UI Panel), `W9-3` (Handoff Export Modal)
- **Affected Workstreams**: Workstream E (Wave 9) and Integration Coordinator

---

## 2. Source-of-Truth References
1. `WAVE_0_4_1_AUTHORITATIVE_TASK_AND_DEPENDENCY_REGISTER.csv` (Row W9-1: `daSimulationEngine.js`, pure math simulation; Row W9-2: `daSimulationPanel.js`, interactive UI; Row W9-3: `daSimulationExport.js`, handoff export).
2. `docs/audits/salesforce-parallel-migration/phase-0/WAVE_0_SHARED_ARCHITECTURAL_CONTRACTS.md` (Section 9: Refactoring Simulation Contract W0-C8).
3. `CONTRACT_01_CANONICAL_GRAPH_PAYLOAD.md` (Graph data structures).

---

## 3. Core Architectural Boundaries & Constraints

1. **Pure Client-Side In-Memory Engine**:
   - `daSimulationEngine` is a **pure calculation engine**.
   - It **MUST NOT** depend on Cytoscape, DOM, D3, or browser UI APIs.
   - It **MUST NOT** perform Apex DML or mutate any Salesforce database records.
2. **Strict Immutability & Determinism**:
   - Simulation engines never mutate the incoming `CanonicalGraphPayload` in place.
   - Every operation clones the graph (or creates an immutable diff layer), applies the action deterministically, and returns a new graph snapshot along with the computed deltas.

---

## 4. Discriminated Refactoring Action Schemas

Refactoring operations use a discriminated union pattern with `type`:

```typescript
export type RefactoringAction =
  | ExtractClassAction
  | MoveMethodAction
  | BreakCycleAction
  | RemoveNodeAction;

export interface BaseRefactoringAction {
  id: string; // Unique action ID (e.g. UUID or 'act-1')
  type: string;
  timestamp: string;
  description?: string;
}

export interface ExtractClassAction extends BaseRefactoringAction {
  type: 'EXTRACT_CLASS';
  sourceNodeId: string;       // Existing class being split
  newClassName: string;       // Name of proposed class
  newClassLayer?: string;     // Default: same as source class
  movedMethodList: string[];  // List of method identifiers to extract
}

export interface MoveMethodAction extends BaseRefactoringAction {
  type: 'MOVE_METHOD';
  methodId: string;           // Method identifier
  sourceNodeId: string;       // Source class
  targetNodeId: string;       // Target receiving class
}

export interface BreakCycleAction extends BaseRefactoringAction {
  type: 'BREAK_CYCLE';
  edgeIdToSever: string;      // Directed edge causing circularity
  substitutionStrategy: 'EXTRACT_INTERFACE' | 'EVENT_DRIVEN_DECOUPLING' | 'INVERSION_OF_CONTROL';
  intermediateNodeName?: string; // Generated interface or event name
}

export interface RemoveNodeAction extends BaseRefactoringAction {
  type: 'REMOVE_NODE';
  nodeId: string;             // Node to deprecate or eliminate
}
```

---

## 5. Simulation Result & Delta Metrics Contract

Applying an action (or sequence of actions) produces a simulation output:

```typescript
export interface SimulationResult {
  success: boolean;
  actionId: string;
  appliedActionsCount: number;
  resultingPayload: CanonicalGraphPayload;
  deltas: SimulationDeltas;
  errors?: string[];
}

export interface SimulationDeltas {
  couplingDelta: number;             // newTotalCoupling - baseTotalCoupling (negative is improvement)
  cyclesEliminated: number;          // baseCycleCount - newCycleCount
  highRiskComponentsDelta: number;   // newHighRiskCount - baseHighRiskCount
  unresolvedReferencesDelta: number;
  architectureHealthDelta: number;   // newHealthScore - baseHealthScore
}
```

---

## 6. Handoff Export Schema (`W9-3`)

The Handoff Export feature exports a JSON refactoring plan or formatted Markdown checklist for architecture reviews:

```typescript
export interface RefactoringHandoffPlan {
  schemaVersion: '1.0.0';
  planId: string;
  projectId: string;
  projectKey: string;
  baseRunId: string;
  generatedDate: string;
  author: string;
  summary: {
    totalActions: number;
    cyclesEliminated: number;
    projectedCouplingReduction: number;
    projectedHealthScoreImprovement: number;
  };
  actions: RefactoringAction[];
  affectedComponents: string[];
}
```
