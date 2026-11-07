# Phase A3 Final Technical Decision Proposal
**Document Identifier**: `docs/waves-5-9/phase-a3/PHASE_A3_FINAL_TECHNICAL_DECISION_PROPOSAL.md`
**Governance Scope**: Phase A3.1 Final Technical Decisions DEC-01 through DEC-04
**Implementation Authorization Status**: **STRICTLY NOT AUTHORIZED**
**Repository State**: Git Commit `85e8f4e9a92b1bba13f9a72f61bbd5909c43e96b` on branch `jules-3615347302555669507-d5c1e42b`

---

## 1. Executive Summary & Governance Purpose

This document provides an authoritative, evidence-backed final technical decision proposal resolving the four outstanding Phase A3 governance decisions: `DEC-01`, `DEC-02`, `DEC-03`, and `DEC-04`.

The objective of this proposal is to convert preceding audit findings, discrepancy registers, and technical recommendations into precise, internally consistent, implementation-ready contract decisions for project owner and stakeholder review.

### Governance Boundaries & Disclaimers
1. **Implementation Dispatch is Strictly Not Authorized**: Zero tasks are authorized to implement. No code modifications, Apex metadata changes, LWC source implementations, offline test additions, or git branch dispatches may be launched based on this proposal.
2. **Recommendation vs. Ratified Decision**: Jules does not independently approve decisions or treat recommendations as ratified contracts. All proposals herein remain explicitly **PENDING HUMAN APPROVAL** from designated authorities.
3. **Evidence-Classification Taxonomy**: Every assertion in this document is categorized under:
   - **Source-Confirmed Fact**: Directly verified in repository code, metadata, or execution stdout.
   - **Existing Approved Invariant**: Preserved from Phase 0, Wave 0.4, or frozen contracts.
   - **Previous Audit Finding**: Established in Phase A1, A2, or A3 audits.
   - **Technical Analysis**: Mathematical, architectural, or platform boundary analysis.
   - **Jules Recommendation**: Proposed resolution for human consideration.
   - **Pending Decision**: Explicitly awaiting human approval.

---

## 2. DEC-01 — CONTRACT-04: Analysis Run History API Technical Decision Proposal

### 2.1 Evaluated Direction & Source Findings
- **Source-Confirmed Fact**: `DA_Analysis_Run__c` metadata contains only standard fields (`Id`, `Name`, `CreatedDate`, `CreatedBy`) and custom field `DA_Project__c`. No status field exists (`scratch/salesforce-poc/force-app/main/default/objects/DA_Analysis_Run__c/fields/`).
- **Source-Confirmed Fact**: `DAGraphController.cls` currently implements `getProjects`, `getLatestGraphMetadataForProject`, and `getGraphChunks`. Method `getAnalysisRuns` is not yet implemented.
- **Previous Audit Finding**: `CONTRACT_04_ANALYSIS_RUN_HISTORY_API.md` contains internal conflicts:
  - Status: `'UNKNOWN'` in §4 vs `'EMPTY'` in §5.2.
  - SOQL: `ORDER BY CreatedDate DESC` in §5.2 vs `ORDER BY CreatedDate DESC, Id DESC` in §6.2.

### 2.2 Critical Investigation: Zero-Chunk vs Incomplete-Generation Semantics
**Technical Finding**: Under zero-schema constraints, an aggregate count of zero chunks (`COUNT(Id) == 0` on `DA_Graph_Chunk__c`) occurs identically in four distinct situations:
1. An analysis run completed successfully on a repository containing 0 components.
2. An analysis run failed or crashed before any chunks could be persisted.
3. An asynchronous multi-chunk ingestion job is currently in progress.
4. The user lacks FLS or object read permissions on `DA_Graph_Chunk__c` under `WITH USER_MODE`.

Because the schema lacks a lifecycle status or completion flag, **it is technically impossible to determine whether an analysis completed successfully from the available data alone**.

### 2.3 Proposed Precise Definition of `EMPTY`
To avoid attributing unwarranted success semantics to an empty run, `EMPTY` is defined strictly as:
> **`EMPTY`**: *"The run header record exists, but zero graph chunks were found associated with it at query time. No graph payload is currently retrievable. This state indicates payload absence, not verified analytical completion."*

Downstream consumers (`daAnalysisHistoryView` and `daCompareView`) treat `EMPTY` as an un-renderable run, disabling comparison and deep inspection while rendering an informative empty state.

### 2.4 Exact Proposed Replacement Contract Clauses

#### Replacement for Section 4 (Zero-Schema Invariants)
```markdown
- All status/timestamp attributes on the DTO must be derived safely:
  - `status`: Derived objectively from chunk availability:
    - If `totalChunks > 0`: `'COMPLETED'` (Graph payload chunks exist and are retrievable).
    - If `totalChunks == 0`: `'EMPTY'` (Run header exists, but zero graph chunks were found at query time. Indicates no payload is available to visualize).
  - `analysisTimestamp`: Uses standard `CreatedDate`.
  - `createdByName`: Queried safely via relationship `CreatedBy.Name`.
```

#### Replacement for Section 5.2 (Controller Method Specification)
```apex
    // Query DA_Analysis_Run__c strictly using existing standard and custom fields under USER_MODE
    List<DA_Analysis_Run__c> runs = [
        SELECT Id, Name, DA_Project__c, DA_Project__r.Name, CreatedDate, CreatedBy.Name
        FROM DA_Analysis_Run__c
        WHERE DA_Project__c = :projectId OR DA_Project__r.Project_Key__c = :projectId
        WITH USER_MODE
        ORDER BY CreatedDate DESC, Id DESC
        LIMIT :safeLimit
    ];

    ...

    for (DA_Analysis_Run__c run : runs) {
        ...
        Integer chunks = chunkCountsByRunId.containsKey(run.Id) ? chunkCountsByRunId.get(run.Id) : 0;
        dto.totalChunks = chunks;
        dto.status = chunks > 0 ? 'COMPLETED' : 'EMPTY';
        dtos.add(dto);
    }
```

#### Replacement for Section 6.2 (Deterministic Tie-Breaking)
```markdown
2. **Deterministic Tie-Breaking**:
   - Queries order primarily by `CreatedDate DESC, Id DESC` to guarantee strict deterministic pagination across all execution environments.
```

### 2.5 Decision Specification
- **Recommended Option**: Standardize zero-chunk status as `'EMPTY'` and query ordering as `ORDER BY CreatedDate DESC, Id DESC`.
- **Affected Tasks**: `W7-P1` (Apex implementation), `W7-3` (History View), `W8-3` (Compare View).
- **Required Approvers**: Lead Architect & Integration Coordinator.
- **Status**: `PENDING HUMAN APPROVAL`.

---

## 3. DEC-02 — CONTRACT-05: Snapshot Limits & Single Cytoscape Canvas Proposal

### 3.1 Evaluated Direction & Critical Measurement Distinction
- **Source-Confirmed Fact**: In `daGraphPayloadLoader.js` (lines 5–6, 175–178):
  - `MAX_CHUNK_SIZE = 131072` (corresponds to Salesforce LongTextArea character limit).
  - `MAX_TOTAL_PAYLOAD_SIZE = 10485760` (10,485,760 JavaScript string characters).
  - `validatePayloadSize(rawJson)` evaluates `rawJson.length <= maxTotalSize`.
- **Critical Technical Distinction**: The existing limit measures **JavaScript string character length (`String.prototype.length` UTF-16 code units)**, NOT UTF-8 bytes. For ASCII strings, characters equal bytes; for multi-byte Unicode/surrogates, byte count exceeds character count. Contract 05 must explicitly state that limits are specified in **characters (UTF-16 code units)**.

### 3.2 Deep Memory-Safety Analysis Across Lifecycle Tiers
1. **Raw String Retention**: Two 5M character strings occupy $\approx 20\text{ MB}$ of V8 string memory.
2. **Parsed Object Memory**: Parsing two 5M character payloads into JavaScript AST objects (`nodes[]`, `edges[]`) expands memory by $4\times$ to $8\times$ ($40\text{ MB}$ to $80\text{ MB}$).
3. **Transient Diff Computation**: `daDiffEngine` index Maps add $10\text{ MB}$ to $20\text{ MB}$ during active computation.
4. **Cytoscape Rendering Instance**: A single canvas with 30,000 elements requires $30\text{ MB}$ to $50\text{ MB}$ for WebGL textures and backing store.
5. **Dual-Canvas Prohibition**: Concurrently rendering two Cytoscape instances would double rendering memory ($>200\text{ MB}$ total), causing mobile and LWS browser crashes.

### 3.3 Single-Cytoscape Canvas Invariant Provenance
- **Existing Approved Invariant**: Contract W0-C7 (§8.2) and CONTRACT-09 (Invariant 4) mandate that comparison must use a single Cytoscape canvas with delta styling or a tabular view.

### 3.4 Evidence Gap & Bounded Benchmark Plan
- **Evidence Gap**: The repository contains zero automated memory profiling benchmarks measuring V8 heap growth in LWC.
- **Recommended Offline Benchmark Plan**: Execute an offline benchmark harness testing synthetic 1 MB, 2.5 MB, 5 MB, and 10 MB graph diffs measuring `v8.getHeapStatistics()` before implementation release.

### 3.5 Proposed Contract Specifications
- **Single Snapshot Limit**: `5,242,880` string characters (~5 MB).
- **Combined Dual Snapshot Limit**: `10,485,760` string characters (~10 MB).
- **Rejection Behavior**: Rejects with `PayloadLimitExceededError` before parsing if limits are exceeded.
- **Single-Canvas Lifecycle**: `daCompareView` reuses one Cytoscape instance, updating elements via batch delta styling.
- **Affected Tasks**: `W8-2`, `W8-3`.
- **Required Approvers**: Lead Architect & Workstream D Lead.
- **Status**: `PENDING HUMAN APPROVAL`.

---

## 4. DEC-03 — CONTRACT-07: Refactoring Simulation Contract Proposal

### 4.1 Architectural Boundary & Invariant Alignment
Refactoring simulation in Workstream E (`W9-1`, `W9-2`, `W9-3`) must operate as a pure calculation engine on `CONTRACT-01` payloads with zero DOM, Cytoscape, Apex, or Salesforce dependencies.

### 4.2 Proposed Action-by-Action Support Matrix

| Action | Proposed Support Status | Architectural Resolution & Semantics |
| :--- | :---: | :--- |
| **`EXTRACT_CLASS`** | **SUPPORTED** (Component-Level) | Creates new node `Class.<Name>` in `nodes[]`; adds directed dependency edge `source -> newClass`. External caller edge retargeting is deferred due to CONTRACT-01 component-level granularity. |
| **`MOVE_METHOD`** | **DEFERRED / UNSUPPORTED** | Rejects with `UNSUPPORTED_REFACTORING_ACTION`. CONTRACT-01 has no `methods[]` array on nodes or method metadata on edges; method retargeting is non-deterministic. |
| **`BREAK_CYCLE`** | **SUPPORTED** (`EXTRACT_INTERFACE` only) | Standardizes on `EXTRACT_INTERFACE`. Direct edge `A -> B` is severed; new node `Interface.I<B>` is created; replacement edges `A -> I<B>` (`references`) and `B -> I<B>` (`implements`) injected. Strategies `EVENT_DRIVEN_DECOUPLING` and `INVERSION_OF_CONTROL` marked unsupported. |
| **`REMOVE_NODE`** | **SUPPORTED** (With Atomic Cascade) | If `fanIn === 0`, node and outbound edges removed. If `fanIn > 0`, action requires `cascadeEdges: true`. All incident edges are removed atomically. Dangling edges are strictly prohibited. |

### 4.3 Proposed DTO Schema Reconciliations

```typescript
export interface BaseRefactoringAction {
  id: string;
  type: string;
  timestamp: string;
  description?: string;
}

export interface ExtractClassAction extends BaseRefactoringAction {
  type: 'EXTRACT_CLASS';
  sourceNodeId: string;
  newClassName: string;
  newClassLayer?: string;
  movedMethodList: string[];
}

export interface MoveMethodAction extends BaseRefactoringAction {
  type: 'MOVE_METHOD';
  methodId: string;
  sourceNodeId: string;
  targetNodeId: string;
}

export interface BreakCycleAction extends BaseRefactoringAction {
  type: 'BREAK_CYCLE';
  edgeIdToSever: string;
  substitutionStrategy: 'EXTRACT_INTERFACE'; // Others marked unsupported
  intermediateNodeName?: string;
}

export interface RemoveNodeAction extends BaseRefactoringAction {
  type: 'REMOVE_NODE';
  nodeId: string;
  cascadeEdges?: boolean; // Must be true if incoming dependencies exist
}
```

### 4.4 Common Action Invariants & 10 Required Fixtures
- **Common Invariants**: Deep immutable cloning of input graph; deterministic sorting (`id ASC`); pure calculation; metric recalculation (`couplingDelta`, `cyclesEliminated`, `architectureHealthDelta`).
- **Required Reference Fixtures**:
  1. `fixture-01-extract-class.json`
  2. `fixture-02-break-cycle-interface.json`
  3. `fixture-03-remove-node-zero-fanin.json`
  4. `fixture-04-remove-node-cascade.json`
  5. `fixture-05-unsupported-move-method.json`
  6. `fixture-06-unsupported-break-cycle-strategy.json`
  7. `fixture-07-invalid-node-reference.json`
  8. `fixture-08-duplicate-id-collision.json`
  9. `fixture-09-input-immutability.json`
  10. `fixture-10-graph-integrity-post-action.json`
- **Affected Tasks**: `W9-1`, `W9-2`, `W9-3`.
- **Required Approvers**: Workstream E Lead & Integration Coordinator.
- **Status**: `PENDING HUMAN APPROVAL`.

---

## 5. DEC-04 — Implementation Dispatch Authority Proposal

### 5.1 The Documented Disagreement
Phase A2 cited **Lead Architect + Integration Coordinator** for task launch, while Phase A3 reconciliation argued that committing engineering resources requires **Project Sponsor / Product Owner** signoff.

### 5.2 Comparative Analysis of Alternatives

| Dimension | Alternative 1: Joint Dual Signoff | Alternative 2: Technical Dual Signoff | Alternative 3: Two-Phase Dispatch |
| :--- | :--- | :--- | :--- |
| **Signatories** | Lead Architect + Product Owner | Lead Architect + Integration Coordinator | Gate 1A: Architect + IC; Gate 1B: PO |
| **Scope Approved** | Technical readiness AND implementation budget release | Technical readiness only | 1A: technical readiness; 1B: implementation release |
| **Dual Signoff** | Mandatory | Mandatory | Mandatory across both gates |
| **Single Rejection** | Dispatch halted immediately | Dispatch halted immediately | Halts respective gate |
| **Partial Launch** | Permitted if specified in written order | Permitted per workstream | Batch 1 released while others await 1B |
| **Revocation** | Either authority can revoke | Either authority can revoke | Architect revokes 1A; PO revokes 1B |

### 5.3 Recommendation: Adopt Alternative 1
- **Recommendation**: **Adopt Alternative 1 (Joint Dual Signoff: Lead Architect + Product Owner)**. Actual implementation release commits organization resources and alters codebase state; joint technical and product authority provides the highest governance safety.
- **Required Approver**: Project Sponsor / Product Owner.
- **Status**: `PENDING HUMAN APPROVAL`.

---

## 6. Consolidated Technical Decision Matrix

| Decision ID | Current Status | Existing Conflict | Recommended Resolution | Technical Evidence | Unresolved Risks | Affected Tasks | Required Approvers | Acceptance Criteria | Approval Status |
| :---: | :---: | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| **DEC-01** | `PENDING` | Status `'EMPTY'` vs `'UNKNOWN'`; SOQL ordering clauses | Adopt Option A (`status = 'EMPTY'` and `ORDER BY CreatedDate DESC, Id DESC`) | Contract 04 §4 vs §5.2; zero-schema in `DA_Analysis_Run__c` | Chunks === 0 cannot distinguish empty from aborted runs | W7-P1, W7-3, W8-3 | Lead Architect & Integration Coordinator | Offline tests assert 'EMPTY' and deterministic ordering | `PENDING HUMAN APPROVAL` |
| **DEC-02** | `PENDING` | 10MB/20MB legacy claims vs 5MB/10MB proposed bounds | Adopt Option A (5,242,880 char single, 10,485,760 char combined, single canvas) | `daGraphPayloadLoader.js` line 6; LongTextArea 131,072 char limit; Contract W0-C7 | Lack of empirical browser heap benchmarks in LWC | W8-2, W8-3 | Lead Architect & Workstream D Lead | Offline memory benchmark tests pass without error | `PENDING HUMAN APPROVAL` |
| **DEC-03** | `PENDING` | Method-level operations incompatible with CONTRACT-01; missing `force` and fixtures | Adopt Option A (Component-level scoping, defer MOVE_METHOD, EXTRACT_INTERFACE for cycles, cascadeEdges for node removal) | CONTRACT-01 has no `methods[]`; `fixtures/sample-refactoring-action.json` exists | Method retargeting deferred; IoC/Event strategies deferred | W9-1, W9-2, W9-3 | Workstream E Lead & Integration Coordinator | 10 reference fixtures pass deterministic offline tests | `PENDING HUMAN APPROVAL` |
| **DEC-04** | `PENDING` | Architect + Coordinator vs Architect + Product Owner for Gate 1 release | Adopt Alternative 1 (Joint Dual Signoff: Lead Architect + Product Owner) | Phase A2 summary vs Phase A3 reconciliation §5.2; engineering resource governance | Slower dispatch if Product Owner is unavailable | All 21 Tasks | Project Sponsor / Product Owner | Signed Gate 1 authorization markdown checked into git | `PENDING HUMAN APPROVAL` |

---

## 7. Task Readiness & Project Boundaries

The authoritative 21-task classification breakdown is strictly preserved:
- **8 Tasks**: `READY_FOR_IMPLEMENTATION_REVIEW` (`W5-1`, `W6-1`, `W6-2`, `W6-3`, `W6-4`, `W7-1`, `W7-2`, `W8-1`)
- **9 Tasks**: `BLOCKED_ON_PREDECESSORS` (`W5-2`, `W5-3`, `W5-4`, `W5-5`, `W5-6`, `W7-3`, `W8-3`, `W9-2`, `W9-3`)
- **2 Tasks**: `BLOCKED_ON_CONTRACT_APPROVAL` (`W8-2`, `W9-1`)
- **1 Task**: `BLOCKED_ON_UNRESOLVED_SPECIFICATION` (`W7-P1`)
- **1 Task**: `COORDINATOR_EXCLUSIVE` (`INT-1`)
- **0 Tasks**: `AUTHORIZED_FOR_IMPLEMENTATION`

All architectural invariants (Workstream A serialization, INT-1 exclusive shell ownership, Selection != Navigation, Single Cytoscape canvas) remain in full force.

---

## 8. Final Status Statement

```
FINAL TECHNICAL DECISION PROPOSAL PREPARED — AWAITING PROJECT OWNER REVIEW — IMPLEMENTATION DISPATCH NOT AUTHORIZED
```
