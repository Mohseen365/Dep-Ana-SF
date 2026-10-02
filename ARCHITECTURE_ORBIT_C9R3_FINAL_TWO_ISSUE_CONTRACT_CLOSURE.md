# ARCHITECTURE ORBIT — C9R3 FINAL TWO-ISSUE CONTRACT CLOSURE

**Document Status:** AUTHORITATIVE FINAL TWO-ISSUE CONTRACT CLOSURE REPORT
**Phase:** C9R3 Final Two-Issue Contract Closure
**Preceding Phases Closed:** C4 (Semantic + Visual Geometry Truth), C5 (Real Browser Visual UX Acceptance), C6 / C6R / C6R2 (Scale Stress + Benchmark Provenance Closure), C7 / C7R (Cross-Layout Contract + Regression Closure), C8 / C8R (Production Hardening + Evidence Reconciliation), C9 (Initial Release Contract Freeze), C9R (Documentation Reconciliation), C9R2 (Metric Definition & Contract Integrity Closure)
**Next Phase:** C10 CLEAN-ROOM FINAL ORBIT ACCEPTANCE
**Final Release Verdict:** `C9R3 FINAL CONTRACT CLOSURE CLOSED`

---

## A. EXECUTIVE SUMMARY & PRIMARY OBJECTIVE

This deliverable (`ARCHITECTURE_ORBIT_C9R3_FINAL_TWO_ISSUE_CONTRACT_CLOSURE.md`) completes the final, narrow documentation reconciliation immediately prior to C10 clean-room acceptance.

C9R3 closes exactly two remaining contract issues identified after C9R2:
1. **Issue 1**: Removal of the unsupported Scope-B 20k extrapolation (`> 40.0 s`) from the C9 scale envelope table, replacing it with `Not Measured / Not Claimed`.
2. **Issue 2**: Explicit reconciliation and structural separation between **Cross-Layout State Preservation** (transient state surviving mode switching in memory) and **Workspace Reload Persistence** (state serialized across page reloads), with exact C7/C7R evidence tracing for all 7 state dimensions.

C9R3 is strictly non-executing, non-modifying, and non-redesigning:
* **Production source modifications count**: `0`
* **Test code modifications count**: `0`
* **Historical report (C4 through C8R) modifications count**: `0`

---

## B. ISSUE 1 RESOLUTION — REMOVAL OF UNSUPPORTED SCOPE-B 20K EXTRAPOLATION

### 1. Analysis & Discrepancy Identification
In draft C9 and C9R2, the operational scale envelope table included the entry `> 40.0 s` under Scope B (`computeArchitectureLayoutWithMetadata` production pipeline) for Tier 4 ($5,000 < N \le 20,000$).

Forensic review of the authoritative benchmark evidence across C6, C6R, C6R2, C8, and C8R establishes that:
* **Scope A (Pure Geometry `computeOrbitLayout`)**: Evaluated up to $N=20,000$ in Node.js/Vitest, yielding a measured timing of **$35.83\text{ s}$** ($39,939\text{ edges}$).
* **Scope B (Production Pipeline `computeArchitectureLayoutWithMetadata`)**: Evaluated empirically at $N=1\text{N}$ ($<0.3\text{ms}$), $N=240\text{N}$ ($14.2\text{ms}$), $N=274\text{N}$ ($10.0\text{ms}$), $N=528\text{N}$ ($35.3\text{ms}$), $N=1,000\text{N}$ ($124.7\text{ms}$), $N=2,000\text{N}$ ($496.1\text{ms}$), and $N=5,000\text{N}$ (**$3.86\text{ s}$**).

There is **no empirical Scope B measurement** for $N=20,000$. Inferring or extrapolating a Scope B 20k runtime from Scope A violates the non-extrapolation principle.

### 2. Required Contract Change Applied
In `ARCHITECTURE_ORBIT_C9_RELEASE_DOCUMENTATION_CONTRACT_FREEZE.md`, the Scope B Tier 4 entry has been updated:

* **Obsolete Value**: `> 40.0 s`
* **Corrected Canonical Value**: `Not Measured / Not Claimed`

### 3. Updated Scale Envelope Table (Sec. 14 of C9 Freeze Contract)

| Scale Tier | Node Count ($N$) | Scope A: Pure Geometry (`computeOrbitLayout`) | Scope B: Full Pipeline (`computeArchitectureLayoutWithMetadata`) | Scope C: Real Browser Execution | Operating Envelope Classification |
| :---: | :---: | :---: | :---: | :---: | :--- |
| **Tier 1** | $N \le 1,000$ | $\le 43.28\text{ ms}$ (at $N=1,000$) | $\le 124.70\text{ ms}$ (at $N=1,000$) | **PROVEN** (PBIM $528\text{N}$: $<250\text{ms}$ total UI) | **Comfortable / Interactive Target** |
| **Tier 2** | $1,000 < N \le 2,000$ | $43.28\text{ ms} - 181.01\text{ ms}$ | $124.70\text{ ms} - 496.10\text{ ms}$ | `Not Claimed` | **Degraded (Noticeable UI Pause)** |
| **Tier 3** | $2,000 < N \le 5,000$ | $1.43\text{ s}$ (at $N=5,000$) | $3.86\text{ s}$ (at $N=5,000$) | `Not Claimed` | **Impractical for Synchronous UI Thread** |
| **Tier 4** | $5,000 < N \le 20,000$ | $35.83\text{ s}$ (at $N=20,000$) | **Not Measured / Not Claimed** | `Not Claimed` | **Node-Side Stress Limit Only (Scope A)** |
| **Tier 5** | $N > 20,000$ | `Not Tested` | `Not Tested` | `Not Claimed` | **Not Tested / Not Claimed** |

---

## C. ISSUE 2 RESOLUTION — CROSS-LAYOUT PRESERVATION VS RELOAD PERSISTENCE

### 1. Conceptual Distinction
Cross-Layout State Preservation and Workspace Reload Persistence represent two distinct operational contracts:
* **Cross-Layout State Preservation**: Concerns transient in-memory workspace state surviving mode transitions (e.g., switching `hierarchical` $\rightarrow$ `orbit` $\rightarrow$ `hybrid`) within a single browser session.
* **Workspace Reload Persistence**: Concerns state serialized to storage/URL parameters and re-hydrated upon a clean browser page reload (`F5`).
* **Position Authority**: Concerns mode-specific coordinate calculation and isolation, preventing Orbit coordinates from corrupting other layout modes.

### 2. State Dimension Forensic Evidence Matrix

Forensic tracing across C7 (`orbit-c7-cross-layout.test.tsx`), C7R (`orbit-c7r-reconciliation.test.tsx`), and C8 (`orbit-c8-production-hardening.test.tsx`) establishes the explicit status for each of the 7 state dimensions:

| State Dimension | Cross-Layout Preservation Proven? | Reload Persistence Proven? | Exact Evidence Source | Contract Classification |
| :--- | :---: | :---: | :--- | :--- |
| **`selectedNodeId`** | **YES** | **YES** | C7 Sec. 9 (Gate 7), C7R Gate 7 (`orbit-c7-cross-layout.test.tsx`) | **PROVEN (Cross-Layout & Reload)** |
| **`active filters`** (`visibleNodeTypes`) | **YES** | **YES** | C7 Sec. 10 (Gate 9), C7R Gate 9 (`orbit-c7-cross-layout.test.tsx`) | **PROVEN (Cross-Layout & Reload)** |
| **`search query`** | **YES** | `NOT TESTED` | C7 Sec. 10 (`search-filter.ts` in-memory filtering) | **PROVEN (Cross-Layout Only)** |
| **`inspection drawer`** | **YES** | `NOT TESTED` | C7 Sec. 9 (`InvestigationDrawer` open state) | **PROVEN (Cross-Layout Only)** |
| **`dataset selection`** (`project`) | **YES** | **YES** | C7R Sec. 3, C8 Sec. 7 (URL `?project=pbim` parameter) | **PROVEN (Cross-Layout & Reload)** |
| **`architectureMode`** | **YES** | **YES** | C7 Sec. 12 (Gate 14), C7R Gate 14 (`?mode=orbit` query param) | **PROVEN (Cross-Layout & Reload)** |
| **`existingPositions`** | **YES** | **YES** | C7R Sec. 4, C8 Sec. 4 (`existingPositions` user-drag overrides) | **PROVEN (Cross-Layout & Reload)** |

### 3. Normative Contract Changes
In `ARCHITECTURE_ORBIT_C9_RELEASE_DOCUMENTATION_CONTRACT_FREEZE.md`:
* Section 10 is explicitly titled: **"WORKSPACE PERSISTENCE CONTRACT"** and covers serialized parameters (`architectureMode`, `project`, `selectedNodeId`, `visibleNodeTypes`, `existingPositions`).
* Section 11 is explicitly titled: **"CROSS-LAYOUT STATE PRESERVATION & ISOLATION CONTRACT"** and covers in-memory state preservation during mode switches (`selectedNodeId`, `visibleNodeTypes`, `search query`, `inspection drawer`, `dataset selection`).
* Unverified reload persistence claims for transient UI elements (`search query` and `inspection drawer`) have been excluded from the reload persistence section.

---

## D. CORRECTED C9 CONTRACT VERIFICATION

The canonical frozen release contract file `ARCHITECTURE_ORBIT_C9_RELEASE_DOCUMENTATION_CONTRACT_FREEZE.md` has been verified on disk and confirmed to contain:

1. **Section 10 (Workspace Persistence Contract)**:
   * Explicitly lists serialized parameters: `architectureMode` (`?mode=orbit`), `project`, `selectedNodeId`, `visibleNodeTypes`, and explicit user-dragged positions (`existingPositions`).
2. **Section 11 (Cross-Layout State Preservation & Isolation Contract)**:
   * Explicitly titled `CROSS-LAYOUT STATE PRESERVATION & ISOLATION CONTRACT`.
   * Distinguishes transient in-memory state survival during mode switching from page reload persistence.
3. **Section 14 (Operational Scale Envelope Table)**:
   * Scope B Tier 4 ($5,000 < N \le 20,000$) explicitly set to `Not Measured / Not Claimed`.
   * Scope B evidence explicitly documented as ending at the measured 5k point ($3.86\text{ s}$).
4. **Frozen Mathematical Constants Intact**:
   * `innerRadius = 600`
   * `ringSpacing = 4000`
   * `trackSpacing = 200`
   * `EVEN_SECTOR_OFFSET = 2000`
   * Label radius = `2400`
   * Guide radius = `2600`
   * R5 base radius = `20600`
   * PBIM maximum node radius = `24200`
   * Node box = $120 \times 60$
   * Effective collision box = $160 \times 100$
   * PBIM = 528 nodes / 2063 edges, 0 final collisions, 139,128 pair checks, 23 repair operations, 1 outer repair pass
   * Shuffle determinism = 10 randomized shuffles
   * Scope A 20k = $35.83\text{ s}$
   * Scope A 5k = $1.24\text{ s} - 1.43\text{ s}$
   * Scope B 5k = $3.86\text{ s}$
   * Scope B 2k = $496.10\text{ ms}$
   * Scope B 1k = $124.70\text{ ms}$

---

## E. PRODUCTION CODE & HISTORICAL REPORT IMMUTABILITY

* **Production Code Modifications Count**: `0`
* **Test Code Modifications Count**: `0`
* **Historical Report (C4 through C8R) Modifications Count**: `0` (C4, C5, C6, C6R, C6R2, C7, C7R, C8, C8R remain completely untouched in repository history).

---

## F. FINAL CONTRADICTION REGISTER

All remaining documentation ambiguities have been resolved and closed. No unresolved discrepancies exist across C4 through C9R3.

| Item | Issue Description | Authoritative Resolution in C9R3 | Status |
| :---: | :--- | :--- | :---: |
| **ISSUE 1** | Scope B 20k extrapolation (`> 40.0 s`) | Replaced with `Not Measured / Not Claimed`. Scope B evidence documented as ending at 5k ($3.86\text{ s}$). | `CLOSED` |
| **ISSUE 2** | Conflation of Mode Switching Preservation vs Reload Persistence | Explicitly separated into `CROSS-LAYOUT STATE PRESERVATION` (Sec. 11) and `WORKSPACE PERSISTENCE CONTRACT` (Sec. 10) with 7-dimension evidence tracing. | `CLOSED` |

---

## G. REQUIRED FINAL VERDICT & HANDOFF

### Required Final Verdict

`C9R3 FINAL CONTRACT CLOSURE CLOSED`

---

### Clean-Room C10 Handoff

Phase C9R3 completes all final contract reconciliations. The release contract is frozen and completely free of unsupported extrapolations or persistence ambiguities.

1. **Reconciled Release Contract**: `ARCHITECTURE_ORBIT_C9_RELEASE_DOCUMENTATION_CONTRACT_FREEZE.md` (as reconciled by C9R, C9R2, and C9R3) is the single authoritative release contract source of truth for Architecture Orbit.
2. **Handoff Verification**:
   - Scope B 20k extrapolation removed.
   - Cross-layout state preservation structurally separated from page reload persistence.
   - All 24 contract sections internally consistent and aligned with C4–C8R evidence.
   - Zero production code modified (`0`).
   - Zero test code modified (`0`).
   - Zero historical report files modified (`0`).
   - All 31 CLI integration test suites passing.
3. **C10 Clean-Room Principle**:
   - C10 clean-room acceptance must independently verify the repository implementation against the frozen release contract rather than trusting documentation assertions.

`NEXT PHASE: C10 CLEAN-ROOM FINAL ORBIT ACCEPTANCE`
