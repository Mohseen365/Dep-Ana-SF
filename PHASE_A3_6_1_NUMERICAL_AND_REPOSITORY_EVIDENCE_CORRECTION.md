# Phase A3.6.1: Numerical and Repository Evidence Correction

**Document Identifier**: `PHASE_A3_6_1_NUMERICAL_AND_REPOSITORY_EVIDENCE_CORRECTION.md`
**Governance Scope**: Narrow Numerical Unit and Evidence Qualification Correction for Phase A3.6 Deliverables
**Implementation Dispatch Status**: **STRICTLY NOT AUTHORIZED**
**Repository State**: Git Commit `1a0ca8f3d84996296c86f078a4d3c1020d0d8350` on branch `jules-1505928380438354287-a74e00b1`
**Baseline Preservation**: Preserves all historical baseline deliverables, authoritative CSV registers, contracts, and test runners unmodified.

---

## 1. Executive Summary & Governance Restrictions

Phase A3.6.1 provides a strictly documentation-only correction to address remaining numerical unit-conversion inaccuracies, qualify batch heap estimates, accurately report Git working-tree status, and confirm authoritative task register reconciliation.

- **Zero Source Code Changes**: No code in `force-app/` or `explorer/` was modified.
- **Zero Salesforce Metadata Changes**: No custom fields, objects, or XML files were changed.
- **Zero Contract Ratification**: Contracts remain proposed/pending.
- **Zero Implementation Dispatch**: All 21 tasks remain unauthorized for implementation dispatch.
- **Readiness vs. Authorization**: Review readiness does not authorize dispatch.

---

## 2. Scope A — Correction of Character and Byte Units

### 2.1 Earlier Statement Being Corrected
In Phase A3.6 Section 4.2.5, it was stated:
> `131,072 characters = 128 KiB of 16-bit characters`

### 2.2 Rationale for Correction
That statement conflated character counts with byte counts and binary byte units ($\text{KiB}$):
1. In Salesforce custom field metadata (`DA_Graph_Chunk__c.Payload_Data__c.field-meta.xml`), `<length>131072</length>` defines a **character-count limit** for a standard `LongTextArea` field, not a byte limit.
2. In JavaScript / V8 runtimes, string length measures **16-bit UTF-16 code units**. Assuming 1 UTF-16 code unit per character:
   $$131,072\text{ UTF-16 code units} \times 2\text{ bytes per code unit} = \mathbf{262,144\text{ bytes}}$$
3. In binary byte notation:
   $$\frac{262,144\text{ bytes}}{1,024\text{ bytes/KiB}} = \mathbf{256\text{ KiB}}$$
   and in binary mebibytes:
   $$\frac{262,144\text{ bytes}}{1,048,576\text{ bytes/MiB}} = \mathbf{0.25\text{ MiB}}$$
4. Describing 131,072 characters as "128 KiB" incorrectly divided character count directly by 1,024 bytes and labeled characters as bytes.

### 2.3 Corrected Definition & Boundaries
- **Character Count Limit**: Exactly 131,072 characters.
- **UTF-16 Code Unit Basis**: Exactly 131,072 code units (assuming BMP range where 1 char = 1 code unit).
- **In-Memory UTF-16 Byte Footprint**: Exactly $131,072 \times 2 = \mathbf{262,144\text{ bytes}} = \mathbf{256\text{ KiB}} = \mathbf{0.25\text{ MiB}}$.
- **UTF-8 Wire Size**: Ranges from 131,072 bytes (ASCII: $131,072 \times 1\text{ byte} = 128\text{ KiB}$) to 393,216 bytes (BMP 3-byte: $131,072 \times 3 = 384\text{ KiB}$).
- **Authoritative Caps Unchanged**: Maximum payload remains 10,485,760 UTF-16 code units (80 chunks of 131,072 chars); proposed single snapshot remains 5,242,880 UTF-16 code units (40 chunks of 131,072 chars).

---

## 3. Scope B — Correction of Heap-Limit Unit Conversions

### 3.1 Review of Documented Heap Limits
Salesforce platform governor limits document Apex heap limits as:
- **Synchronous Apex Heap Limit**: Documented as **6 MB**.
- **Asynchronous Apex Heap Limit**: Documented as **12 MB**.

In architectural analyses, these values are frequently represented in bytes as $6 \times 1,048,576 = 6,291,456\text{ bytes}$ and $12 \times 1,048,576 = 12,582,912\text{ bytes}$.

### 3.2 Exact Mathematical Conversions
Where these exact byte quantities are evaluated, their mathematically correct conversions are:

| Stated Byte Value | Exact Decimal MB ($10^6$ B) | Exact Binary MiB ($2^{20}$ B) |
|---:|---:|---:|
| **6,291,456 bytes** | **6.291456 MB** | **6.00 MiB** |
| **12,582,912 bytes** | **12.582912 MB** | **12.00 MiB** |

### 3.3 Unit Convention Ambiguity in Source Documentation
Salesforce documentation labels these limits as "6 MB" and "12 MB". The documentation does not explicitly declare whether it uses decimal megabytes ($6,000,000\text{ bytes}$) or binary mebibytes ($6,291,456\text{ bytes}$).
- **Distinction**: We explicitly distinguish:
  1. *Salesforce-Documented Limit*: "6 MB" / "12 MB" from the Apex Developer Guide.
  2. *Binary Byte Equivalent*: 6 MiB (6,291,456 bytes) or 12 MiB (12,582,912 bytes).
  3. *Observed Runtime Measurement*: Zero runtime profiling was conducted against a live org in this offline environment.
- We do not silently assert an exact byte equivalent without identifying this unit convention ambiguity.

---

## 4. Scope C — Qualification of Batch Heap Estimates

### 4.1 Earlier Statement Being Corrected
In Phase A3.6 Section 4.2.5 and Section 5, it was stated that:
> `maxChunks <= 10` enforces a maximum fetch of 10 chunks ($1,310,720\text{ chars}$) per Apex invocation, consuming at most $\approx 1.31\text{ MB}$ to $3.93\text{ MB}$ of the 6 MB synchronous heap.

### 4.2 Required Qualification and Limitations
That estimate is strictly an **unverified theoretical payload calculation under simplified assumptions**, not measured Apex heap consumption.
- **Why Runtime Heap Usage Differs**:
  1. **In-Memory Representation**: In Apex, String variables carry runtime object headers and internal string buffer structures.
  2. **SOQL Query Allocation**: Loading rows allocates `List<DA_Graph_Chunk__c>` SObject wrappers in addition to raw string fields.
  3. **DTO Packaging & Serialization**: Instantiating DTOs or serializing to JSON creates duplicate copies and temporary heap allocations.
  4. **String Concatenation & Manipulation**: Concatenating chunk strings generates transient strings on the heap before garbage collection.
- **Mandatory Disclaimers**:
  - The $\approx 1.31\text{ MB}$ to $3.93\text{ MB}$ estimate is **NOT** a measured Apex heap profile.
  - It is **NOT** a guaranteed upper bound.
  - It is **NOT** a reliable predictor of runtime heap usage.
  - It does **NOT** prove that a 10-chunk batch is safe under the synchronous 6 MB or asynchronous 12 MB governor limit.
  - Definitive heap safety can only be established through empirical Apex profiling in a live Salesforce environment.

---

## 5. Scope D — Accurate Git Working-Tree State

The repository working tree was inspected using standard Git commands.

### 5.1 Status and Diff Verification
- `git status --short`:
  ```
  A  PHASE_A3_5_FINAL_METRIC_AND_EVIDENCE_CLOSURE.md
  A  PHASE_A3_5_FINAL_METRIC_AND_EVIDENCE_EXECUTION_REPORT.md
  A  PHASE_A3_6_AUTHORITATIVE_REGISTER_AND_NUMERICAL_CORRECTION.md
  A  PHASE_A3_6_AUTHORITATIVE_REGISTER_AND_NUMERICAL_EXECUTION_REPORT.md
  ```
- `git diff --cached --stat`:
  ```
   PHASE_A3_5_FINAL_METRIC_AND_EVIDENCE_CLOSURE.md    | 254 ++++++++++++++++++
   ...5_FINAL_METRIC_AND_EVIDENCE_EXECUTION_REPORT.md | 287 +++++++++++++++++++++
   ...HORITATIVE_REGISTER_AND_NUMERICAL_CORRECTION.md | 229 ++++++++++++++++
   ...TIVE_REGISTER_AND_NUMERICAL_EXECUTION_REPORT.md | 165 ++++++++++++
   4 files changed, 935 insertions(+)
  ```
- `git diff --stat`: Empty (0 unstaged modifications).
- `git diff --name-only`: Empty.
- `git diff --cached --name-only`:
  - `PHASE_A3_5_FINAL_METRIC_AND_EVIDENCE_CLOSURE.md`
  - `PHASE_A3_5_FINAL_METRIC_AND_EVIDENCE_EXECUTION_REPORT.md`
  - `PHASE_A3_6_AUTHORITATIVE_REGISTER_AND_NUMERICAL_CORRECTION.md`
  - `PHASE_A3_6_AUTHORITATIVE_REGISTER_AND_NUMERICAL_EXECUTION_REPORT.md`

### 5.2 Preservation of Existing Staging State
In accordance with instructions, zero staging, unstaging, reset, stash, or commit operations were executed. The working tree contains only newly authored Phase A3 documentation files. Zero tracked baseline files have been modified.

---

## 6. Scope E — Authoritative Task Governance Preservation

Revalidation directly against `WAVE_0_4_AUTHORITATIVE_FINAL_TASK_AND_DEPENDENCY_REGISTER.csv` confirms the 21 canonical tasks and classifications:

| Classification | Count | Authoritative Task IDs |
|---|---:|---|
| **READY_FOR_IMPLEMENTATION_REVIEW** | **8** | `W5-1`, `W6-1`, `W6-2`, `W6-3`, `W6-4`, `W7-1`, `W7-2`, `W8-1` |
| **BLOCKED_ON_PREDECESSORS** | **9** | `W5-2`, `W5-3`, `W5-4`, `W5-5`, `W5-6`, `W7-3`, `W8-3`, `W9-2`, `W9-3` |
| **BLOCKED_ON_CONTRACT_APPROVAL** | **2** | `W8-2` (CONTRACT-05), `W9-1` (CONTRACT-07) |
| **BLOCKED_ON_UNRESOLVED_SPECIFICATION** | **1** | `W7-P1` (CONTRACT-04 / DEC-01) |
| **COORDINATOR_EXCLUSIVE** | **1** | `INT-1` |
| **AUTHORIZED_FOR_IMPLEMENTATION** | **0** | *None* |

- Total task count is exactly **21**.
- Phantom task IDs `W8-4` and `W9-4` do not exist in the register and are rejected.
- Task status, dependencies, and authorization fields remain unmodified.

---

## 7. Final Required Governance Status

```
PHASE A3.6 PREPARED — AUTHORITATIVE TASK REGISTER RECONCILED — NUMERICAL CORRECTIONS VERIFIED — AWAITING PROJECT OWNER GOVERNANCE REVIEW — IMPLEMENTATION DISPATCH NOT AUTHORIZED
```
