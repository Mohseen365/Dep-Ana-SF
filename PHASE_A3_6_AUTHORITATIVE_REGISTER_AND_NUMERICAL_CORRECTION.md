# Phase A3.6: Authoritative Register Integrity and Numerical Correction

**Document Identifier**: `PHASE_A3_6_AUTHORITATIVE_REGISTER_AND_NUMERICAL_CORRECTION.md`
**Governance Scope**: Authoritative Task Register Reconciliation and DEC-02 Numerical Integrity Verification
**Implementation Dispatch Status**: **STRICTLY NOT AUTHORIZED**
**Repository State**: Git Commit `1a0ca8f3d84996296c86f078a4d3c1020d0d8350` on branch `jules-1505928380438354287-a74e00b1`
**Baseline Preservation**: Strictly read-only reconciliation. All baseline files, authoritative CSV registers, contracts, and previous Phase A3 deliverables are preserved unmodified.

---

## 1. Executive Summary & Governance Restrictions

Phase A3.6 executes a strictly read-only integrity reconciliation to close the task classification and numerical discrepancies identified in Phase A3.5 before Project Owner governance review.

### 1.1 Strict Governance Constraints
- **Zero Code Modification**: Application source code (`scratch/salesforce-poc/force-app/`, `explorer/`), test runners, and metadata remain untouched.
- **Zero Register Modification**: Authoritative CSV files (`WAVE_0_4_AUTHORITATIVE_FINAL_TASK_AND_DEPENDENCY_REGISTER.csv`, `WAVE_0_4_EXHAUSTIVE_FILE_OWNERSHIP_MANIFEST.csv`, `WAVE_0_4_COMPLETE_CONTRACT_TO_TASK_TRACEABILITY.csv`) are immutable and were not altered.
- **Zero Dispatch Authorization**: Implementation dispatch remains strictly unauthorized across all 21 tasks.
- **Readiness vs. Authorization**: A classification of `READY_FOR_IMPLEMENTATION_REVIEW` does not authorize execution.

---

## 2. Authoritative Source Inventory & Provenance

The canonical sources of truth for task definitions, file ownership, and readiness dependencies within the repository are:

1. **Authoritative Task and Dependency Register**:
   - **Path**: `WAVE_0_4_AUTHORITATIVE_FINAL_TASK_AND_DEPENDENCY_REGISTER.csv` (Repository Root)
   - **Total Data Rows**: Exactly 21 task rows (`W5-1` through `W5-6`, `W6-1` through `W6-4`, `W7-P1`, `W7-1` through `W7-3`, `W8-1` through `W8-3`, `W9-1` through `W9-3`, `INT-1`).
   - **Provenance**: Establishes the authoritative 21 canonical task IDs, owning workstreams, affected files, and direct dependencies.
2. **Authoritative File Ownership Manifest**:
   - **Path**: `WAVE_0_4_EXHAUSTIVE_FILE_OWNERSHIP_MANIFEST.csv` (Repository Root)
   - **Total Data Rows**: Exactly 175 file paths (99 baseline existing paths, 76 planned new paths).
3. **Phase A3 Authoritative Readiness Classifications**:
   - **Primary Baseline**: `docs/waves-5-9/phase-a3/PHASE_A3_2_CONTRACT_AMENDMENT_AND_DECISION_CLOSURE_PACKAGE.md` (Section 8.2, lines 480–515).
   - **Cross-Verification Baselines**: `docs/waves-5-9/phase-a3/PHASE_A3_RECONCILIATION_INTEGRITY_AUDIT_REPORT.md` (Section 9.1) and `docs/waves-5-9/phase-a3/PHASE_A3_AUDIT_FINDINGS_RECONCILIATION_REPORT.md` (Section 8.2).

---

## 3. Recomputed 21-Task Classification & Discrepancy Reconciliation

### 3.1 Recomputed Authoritative Classification (Directly from Register Records)
Direct reconciliation of `WAVE_0_4_AUTHORITATIVE_FINAL_TASK_AND_DEPENDENCY_REGISTER.csv` and `PHASE_A3_2_CONTRACT_AMENDMENT_AND_DECISION_CLOSURE_PACKAGE.md` yields the following exact classification of the 21 canonical tasks:

- **READY_FOR_IMPLEMENTATION_REVIEW (8)**:
  `W5-1`, `W6-1`, `W6-2`, `W6-3`, `W6-4`, `W7-1`, `W7-2`, `W8-1`
- **BLOCKED_ON_PREDECESSORS (9)**:
  `W5-2`, `W5-3`, `W5-4`, `W5-5`, `W5-6`, `W7-3`, `W8-3`, `W9-2`, `W9-3`
- **BLOCKED_ON_CONTRACT_APPROVAL (2)**:
  `W8-2` (blocked on CONTRACT-05), `W9-1` (blocked on CONTRACT-07)
- **BLOCKED_ON_UNRESOLVED_SPECIFICATION (1)**:
  `W7-P1` (blocked on CONTRACT-04 / DEC-01 zero-schema query resolution)
- **COORDINATOR_EXCLUSIVE (1)**:
  `INT-1`
- **AUTHORIZED_FOR_IMPLEMENTATION (0)**

$$\mathbf{8} + \mathbf{9} + \mathbf{2} + \mathbf{1} + \mathbf{1} = \mathbf{21\text{ Tasks}}$$

### 3.2 Task-by-Task Discrepancy Table Against Phase A3.5
In Phase A3.5 Section 7.2, the 21-task aggregate count was preserved, but narrative transcription errors occurred in the listed task IDs. The table below reconciles every task ID:

| Task ID | Owning Workstream | Authoritative Classification | Direct Predecessors | Contract Dependencies | Phase A3.5 Classification | Discrepancy Analysis & Root Cause |
| :--- | :--- | :---: | :--- | :--- | :---: | :--- |
| **W5-1** | Workstream A | `READY_FOR_IMPLEMENTATION_REVIEW` | None | CONTRACT-01, CONTRACT-02 | `READY_FOR_IMPLEMENTATION_REVIEW` | **Match**. Authoritative. |
| **W5-2** | Workstream A | `BLOCKED_ON_PREDECESSORS` | W5-1 | CONTRACT-01, CONTRACT-02 | `BLOCKED_ON_PREDECESSORS` | **Match**. Authoritative. |
| **W5-3** | Workstream A | `BLOCKED_ON_PREDECESSORS` | W5-1, W5-2 | CONTRACT-01, CONTRACT-02 | `BLOCKED_ON_PREDECESSORS` | **Match**. Authoritative. |
| **W5-4** | Workstream A | `BLOCKED_ON_PREDECESSORS` | W5-3 | CONTRACT-01, CONTRACT-09 | `BLOCKED_ON_PREDECESSORS` | **Match**. Authoritative. |
| **W5-5** | Workstream A | `BLOCKED_ON_PREDECESSORS` | W5-4 | CONTRACT-01, CONTRACT-09 | `BLOCKED_ON_PREDECESSORS` | **Match**. Authoritative. |
| **W5-6** | Workstream A | `BLOCKED_ON_PREDECESSORS` | W5-5 | CONTRACT-01, CONTRACT-06 | `BLOCKED_ON_PREDECESSORS` | **Match**. Authoritative. |
| **W6-1** | Workstream B | `READY_FOR_IMPLEMENTATION_REVIEW` | None | CONTRACT-01, CONTRACT-03 | `READY_FOR_IMPLEMENTATION_REVIEW` | **Match**. Authoritative. |
| **W6-2** | Workstream B | `READY_FOR_IMPLEMENTATION_REVIEW` | None | CONTRACT-01, CONTRACT-09 | `READY_FOR_IMPLEMENTATION_REVIEW` | **Match**. Authoritative. |
| **W6-3** | Workstream B | `READY_FOR_IMPLEMENTATION_REVIEW` | None | CONTRACT-01, CONTRACT-09 | `READY_FOR_IMPLEMENTATION_REVIEW` | **Match**. Authoritative. |
| **W6-4** | Workstream B | `READY_FOR_IMPLEMENTATION_REVIEW` | None | CONTRACT-01, CONTRACT-09 | `READY_FOR_IMPLEMENTATION_REVIEW` | **Match**. Authoritative. |
| **W7-P1** | Workstream C | `BLOCKED_ON_UNRESOLVED_SPECIFICATION` | None | CONTRACT-01, CONTRACT-04 | `BLOCKED_ON_UNRESOLVED_SPECIFICATION` | **Match**. Authoritative. |
| **W7-1** | Workstream C | `READY_FOR_IMPLEMENTATION_REVIEW` | None | CONTRACT-01, CONTRACT-09 | `READY_FOR_IMPLEMENTATION_REVIEW` | **Match**. Authoritative. |
| **W7-2** | Workstream C | `READY_FOR_IMPLEMENTATION_REVIEW` | None | CONTRACT-01, CONTRACT-09 | `READY_FOR_IMPLEMENTATION_REVIEW` | **Match**. Authoritative. |
| **W7-3** | Workstream C | `BLOCKED_ON_PREDECESSORS` | W7-P1 | CONTRACT-04, CONTRACT-08 | *Omitted in A3.5 narrative* | **Discrepancy (Transcription Error)**: Authoritative register defines W7-3 (blocked on W7-P1). Phase A3.5 omitted W7-3 in its text. |
| **W8-1** | Workstream D | `READY_FOR_IMPLEMENTATION_REVIEW` | None | CONTRACT-01, CONTRACT-06 | `READY_FOR_IMPLEMENTATION_REVIEW` | **Match**. Authoritative. |
| **W8-2** | Workstream D | `BLOCKED_ON_CONTRACT_APPROVAL` | None | CONTRACT-01, CONTRACT-05 | `BLOCKED_ON_CONTRACT_APPROVAL` | **Match**. Authoritative. |
| **W8-3** | Workstream D | `BLOCKED_ON_PREDECESSORS` | W8-2, W7-P1 | CONTRACT-04, CONTRACT-05 | `BLOCKED_ON_CONTRACT_APPROVAL` | **Discrepancy (Misclassification)**: W8-3 depends directly on predecessor tasks W8-2 and W7-P1. Authoritative status is `BLOCKED_ON_PREDECESSORS`. |
| *W8-4* | *None* | *Non-Existent* | N/A | N/A | `BLOCKED_ON_PREDECESSORS` | **Discrepancy (Phantom ID)**: Does not exist in the 21-task register. Erroneously transcribed in A3.5 narrative. |
| **W9-1** | Workstream E | `BLOCKED_ON_CONTRACT_APPROVAL` | None | CONTRACT-01, CONTRACT-07 | *Misclassified in A3.5 as blocked on spec* | **Discrepancy (Misclassification)**: W9-1 is blocked on CONTRACT-07 ratification. |
| **W9-2** | Workstream E | `BLOCKED_ON_PREDECESSORS` | W9-1 | CONTRACT-07, CONTRACT-08 | `BLOCKED_ON_PREDECESSORS` | **Match**. Authoritative. |
| **W9-3** | Workstream E | `BLOCKED_ON_PREDECESSORS` | W9-1 | CONTRACT-07, CONTRACT-08 | `BLOCKED_ON_PREDECESSORS` | **Match**. Authoritative. |
| *W9-4* | *None* | *Non-Existent* | N/A | N/A | `BLOCKED_ON_PREDECESSORS` | **Discrepancy (Phantom ID)**: Does not exist in the 21-task register. Erroneously transcribed in A3.5 narrative. |
| **INT-1** | Coordinator | `COORDINATOR_EXCLUSIVE` | Waves 5–9 | CONTRACT-08, CONTRACT-09 | `COORDINATOR_EXCLUSIVE` | **Match**. Authoritative. |

### 3.3 Root Cause of the Phase A3.5 Narrative Inaccuracies
1. **Phantom Tasks `W8-4` and `W9-4`**: Wave 8 has exactly three tasks (`W8-1`, `W8-2`, `W8-3`) and Wave 9 has exactly three tasks (`W9-1`, `W9-2`, `W9-3`). In Phase A3.5 Section 7.2, `W8-4` and `W9-4` were inadvertently transcribed, replacing `W7-3` and displacing `W8-3`.
2. **`W8-3` vs `W8-2`**: `W8-2` (Diff Engine Utility Module) has no code predecessors but is blocked on approval of CONTRACT-05. `W8-3` (Compare View Component) has direct predecessors `W8-2` and `W7-P1`, making its authoritative classification `BLOCKED_ON_PREDECESSORS`.
3. **`W9-1` Contract Dependency**: `W9-1` is blocked on human approval of `CONTRACT-07` (Refactoring Action DTOs).

The authoritative 21-task breakdown is verified and restored in full.

---

## 4. Corrected Unicode and Byte Calculations

### 4.1 Unit Definitions: Decimal MB vs Binary MiB
To prevent numerical ambiguity in architectural limits and reviews:
- **Byte ($B$)**: 8 bits.
- **Kilobyte ($\text{kB}$)**: $10^3 = 1,000\text{ bytes}$; **Kibibyte ($\text{KiB}$)**: $2^{10} = 1,024\text{ bytes}$.
- **Megabyte ($\text{MB}$)**: $10^6 = 1,000,000\text{ bytes}$ (decimal).
- **Mebibyte ($\text{MiB}$)**: $2^{20} = 1,048,576\text{ bytes}$ (binary).

### 4.2 Exact Numerical Derivations from JavaScript UTF-16 Basis

The configured application-level payload cap in `scratch/salesforce-poc/force-app/main/default/lwc/daGraphPayloadLoader/daGraphPayloadLoader.js` is:
$$\text{MAX\_TOTAL\_PAYLOAD\_SIZE} = 10,485,760\text{ characters (JavaScript UTF-16 code units)}$$

Notice that:
$$10,485,760\text{ code units} = 10 \times 1,048,576 = 10\text{ MiB of 16-bit code units (if counting units as 1 unit)}$$

#### 1. ASCII Encoding (1 byte per UTF-16 code unit)
In the ASCII range ($U+0000 \dots U+007F$), each character is represented by 1 UTF-16 code unit and encodes to exactly 1 byte in UTF-8:
$$\text{Bytes} = 10,485,760 \times 1 = \mathbf{10,485,760\text{ bytes}}$$
- **Decimal**: $\frac{10,485,760}{1,000,000} = \mathbf{10.48576\text{ MB}}$
- **Binary**: $\frac{10,485,760}{1,048,576} = \mathbf{10.00\text{ MiB}}$

#### 2. BMP Three-Byte Range (3 bytes per UTF-16 code unit)
In the Basic Multilingual Plane range ($U+0800 \dots U+FFFF$), each character is represented by 1 UTF-16 code unit and encodes to 3 bytes in UTF-8:
$$\text{Bytes} = 10,485,760 \times 3 = \mathbf{31,457,280\text{ bytes}}$$
- **Decimal**: $\frac{31,457,280}{1,000,000} = \mathbf{31.45728\text{ MB}}$
- **Binary**: $\frac{31,457,280}{1,048,576} = \mathbf{30.00\text{ MiB}}$
*(Note: Phase A3.5 reported 31.45 MB; the exact decimal expansion is 31.45728 MB, which is exactly 30 MiB).*

#### 3. Supplementary Code Points / Surrogate Pairs (4 bytes per 2 UTF-16 code units)
In the supplementary planes ($U+010000 \dots U+10FFFF$, such as emojis and extended ideographs), each Unicode code point is represented in UTF-16 by a surrogate pair consuming **2 UTF-16 code units**, and encodes to **4 bytes** in UTF-8:
$$\text{Code Points} = \frac{10,485,760\text{ code units}}{2} = 5,242,880\text{ code points}$$
$$\text{Bytes} = 5,242,880 \times 4 = \mathbf{20,971,520\text{ bytes}}$$
- **Decimal**: $\frac{20,971,520}{1,000,000} = \mathbf{20.97152\text{ MB}}$
- **Binary**: $\frac{20,971,520}{1,048,576} = \mathbf{20.00\text{ MiB}}$
*(Note: Phase A3.5 reported 20.97 MB; the exact decimal expansion is 20.97152 MB, which is exactly 20 MiB).*

#### 4. Single Snapshot Proposal (5,242,880 UTF-16 code units)
The unratified CONTRACT-05 proposal suggests a single snapshot cap of 5,242,880 UTF-16 code units:
- **ASCII**: $5,242,880 \times 1 = \mathbf{5,242,880\text{ bytes}} = 5.24288\text{ MB} = \mathbf{5.00\text{ MiB}}$
- **BMP 3-byte**: $5,242,880 \times 3 = \mathbf{15,728,640\text{ bytes}} = 15.72864\text{ MB} = \mathbf{15.00\text{ MiB}}$
- **Supplementary (Surrogate)**: $\frac{5,242,880}{2} \times 4 = \mathbf{10,485,760\text{ bytes}} = 10.48576\text{ MB} = \mathbf{10.00\text{ MiB}}$

#### 5. Chunk Bounds and Salesforce SOQL Limits
- **Salesforce Field Length**: `DA_Graph_Chunk__c.Payload_Data__c` length = $131,072\text{ characters}$ (LongTextArea).
  - $131,072 = 128 \times 1,024 = 128\text{ KiB}$ of 16-bit characters.
- **Maximum Chunks for Combined Cap (10,485,760 chars)**:
  $$\frac{10,485,760}{131,072} = \mathbf{80\text{ chunks}}$$
- **Maximum Chunks for Single Snapshot Cap (5,242,880 chars)**:
  $$\frac{5,242,880}{131,072} = \mathbf{40\text{ chunks}}$$
- **DAGraphController Batch Limit**: `maxChunks <= 10` enforces a maximum fetch of 10 chunks ($1,310,720\text{ chars}$) per Apex invocation, consuming at most $\approx 1.31\text{ MB}$ to $3.93\text{ MB}$ of the 6 MB synchronous heap.

---

## 5. Corrected DEC-02 Numerical Reference Table

| Numerical Boundary / Limit | Exact Value | Binary Equivalent | Authoritative Evidence Category | Source / Platform Reference | Status & Constraints |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Max Payload Size (Combined)** | 10,485,760 UTF-16 code units | 10.00 Mi units | **Repository-Confirmed Configuration** | `daGraphPayloadLoader.js` (`MAX_TOTAL_PAYLOAD_SIZE`) | Configured application-level limit in LWC utility. Measured in JS UTF-16 code units. |
| **Single Snapshot Cap (Proposed)** | 5,242,880 UTF-16 code units | 5.00 Mi units | **Proposed Application-Level Cap** | CONTRACT-05 proposal (§3.1) | Architectural recommendation for single snapshot; unratified by Project Owner. |
| **Chunk Size Limit** | 131,072 characters | 128 Ki chars | **Metadata-Confirmed Field Configuration** | `DA_Graph_Chunk__c.Payload_Data__c.field-meta.xml` | Standard Salesforce LongTextArea maximum length. Measured in characters. |
| **Max Chunks (Combined Cap)** | Exactly 80 chunks | 80 chunks | **Mathematical Calculation** | $10,485,760 \div 131,072$ | Exact integer quotient. |
| **Max Chunks (Single Cap)** | Exactly 40 chunks | 40 chunks | **Mathematical Calculation** | $5,242,880 \div 131,072$ | Exact integer quotient. |
| **Max Chunks Batch Limit** | Exactly 10 chunks | 10 chunks | **Repository-Confirmed Configuration** | `DAGraphController.cls` (`maxChunks <= 10`) | Guard in Apex controller preventing heap overflow (~1.31M chars / call). |
| **ASCII UTF-8 Size (Combined)** | 10,485,760 bytes | 10.00 MiB (10.48576 MB) | **Mathematical Calculation** | $10,485,760 \times 1\text{ byte}$ | ASCII characters ($U+0000..U+007F$). |
| **BMP UTF-8 Size (Combined)** | 31,457,280 bytes | 30.00 MiB (31.45728 MB) | **Mathematical Calculation** | $10,485,760 \times 3\text{ bytes}$ | BMP 3-byte characters ($U+0800..U+FFFF$). |
| **Surrogate UTF-8 Size (Combined)**| 20,971,520 bytes | 20.00 MiB (20.97152 MB) | **Mathematical Calculation** | $(10,485,760 \div 2) \times 4\text{ bytes}$ | Supplementary plane code points ($U+010000..U+10FFFF$). |
| **ASCII UTF-8 Size (Single)** | 5,242,880 bytes | 5.00 MiB (5.24288 MB) | **Mathematical Calculation** | $5,242,880 \times 1\text{ byte}$ | Single snapshot ASCII lower bound. |
| **BMP UTF-8 Size (Single)** | 15,728,640 bytes | 15.00 MiB (15.72864 MB) | **Mathematical Calculation** | $5,242,880 \times 3\text{ bytes}$ | Single snapshot BMP 3-byte upper bound. |
| **Surrogate UTF-8 Size (Single)** | 10,485,760 bytes | 10.00 MiB (10.48576 MB) | **Mathematical Calculation** | $(5,242,880 \div 2) \times 4\text{ bytes}$ | Single snapshot supplementary surrogate bound. |
| **Synchronous Heap Limit** | 6,291,456 bytes (6 MB) | 6.00 MB / ~5.72 MiB | **Authoritative Salesforce Platform Limit** | Salesforce Apex Developer Guide | Documented platform governor limit. Not checked via live runtime profiling. |
| **Asynchronous Heap Limit** | 12,582,912 bytes (12 MB) | 12.00 MB / ~11.44 MiB | **Authoritative Salesforce Platform Limit** | Salesforce Apex Developer Guide | Documented platform governor limit. Not checked via live runtime profiling. |
| **Browser Heap / GPU Estimates** | Variable | Variable | **Unverified Runtime and Memory Estimates** | Architectural discussion notes | Engineering estimates; dependent on browser engine, OS, WebGL context, and LWS proxy. |

---

## 6. Metric Compatibility Disposition

Phase A3.6 reaffirms the metric semantic distinctions established in Phase A3.5:
1. **`cyclicSccCountDelta`**:
   $$\text{cyclicSccCountDelta} = \text{newCyclicSccCount} - \text{baseCyclicSccCount}$$
   - Negative delta indicates fewer cyclic strongly connected components.
   - Measures macroscopic circularity components, never elementary cycle counts.
2. **`breakCycleActionsApplied`**:
   - Exact count of discrete `BREAK_CYCLE` actions successfully applied.
   - Measures targeted circular edges severed and replaced with abstraction interfaces.
3. **`cyclesEliminated` (Deprecated Transitional Property)**:
   - Evaluates to `1` per atomic `BREAK_CYCLE` action or `breakCycleActionsApplied` in simulation summaries.
   - Must never be claimed to represent elementary simple cycle counts.
4. **DTO Mutation Authorization Boundary**:
   - CONTRACT-07 remains unmodified in the repository.
   - Any formal schema amendment to DTO contracts (`SimulationDeltas`, `RefactoringHandoffPlan`) requires explicit Contract-Owner and Project-Owner ratification during task dispatch.

---

## 7. Remaining Human Governance Decisions

The status of the four pending governance decisions remains:

```
====================================================================================================
DECISION STATUS REGISTER
====================================================================================================
DEC-01: Analysis Run Status & Permissions
  - Scope: Two-step project resolution; WITH USER_MODE handling; EMPTY vs COMPLETED lifecycle.
  - Required Approvers: Lead Architect & Product Owner.
  - Status: REQUIRES_PRODUCT_OWNER_DECISION

DEC-02: Payload Units & Memory Boundaries
  - Scope: 10,485,760 UTF-16 code units base; 80 chunks cap; byte/MiB calculation verification.
  - Required Approvers: Lead Architect & Product Owner.
  - Status: READY_FOR_HUMAN_RATIFICATION

DEC-03: Refactoring Action & Simulation Semantics
  - Scope: Edge predicate; Scenario 4 cyclicSccCountDelta = 0; movedMethodList metadata.
  - Required Approvers: Lead Architect & Product Owner.
  - Status: REQUIRES_PRODUCT_OWNER_DECISION

DEC-04: Partial Dispatch Governance & Authority
  - Scope: 10-point governance schema; dynamic exclusion generation; Project Owner authorization.
  - Required Approvers: Project Owner (Mandatory).
  - Status: BLOCKED_ON_AUTHORITY_RESOLUTION (Dispatch authority not granted)
====================================================================================================
```

---

## 8. Final Required Governance Status

```
PHASE A3.6 PREPARED — AUTHORITATIVE TASK REGISTER RECONCILED — NUMERICAL CORRECTIONS VERIFIED — AWAITING PROJECT OWNER GOVERNANCE REVIEW — IMPLEMENTATION DISPATCH NOT AUTHORIZED
```
