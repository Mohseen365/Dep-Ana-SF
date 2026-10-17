# B1 T0-1 Independent Position Authority Verification Report

## 1. Verified Repository, Branch, Baseline and Worktree

- **Repository Root:** `/app`
- **Verification Branch:** `origin/jules-6223849692734651465-d80f0e1e` (and `origin/radar-lane-b-verification-8481654506383264961`)
- **Verified Commit SHA:** `04fe9e89a22af06cf63f796332e594e72fd03784`
- **Approved Dispatch Baseline SHA:** `a39736f7ad47ab20facd0e4c359a1734efeceb88`
- **Worktree Path:** `/app` (coordinator worktree)
- **Working Tree Status:** Clean (`git status --porcelain` empty, excluding coordinator audit report creation)
- **Protected Baseline Check:** `last_commit_changes.txt` verified untouched (50,024 bytes, SHA-256 `e834467bd4a5168f5b5dcc972c49d7456f0df78d7121a1a491648fb33ec8bedb`).

---

## 2. T0-1 Acceptance Criteria

The T0-1 position-authority contract establishes the invariant governing layout calculation vs position preservation across architecture mode transitions:

1. **User-Authored Position Preservation:** User-authored node positions (`layoutProvenance === 'user-authored'`) must remain authoritative and preserved across all architecture-mode transitions.
2. **Stale Automatic Position Re-Layout:** Automatic node positions generated for a previous architecture mode (e.g., `automatic-hierarchical` or `automatic-hybrid`) must NOT be evaluated as authoritative when switching to a different architecture mode (e.g., `orbit` or `constellation`).
3. **Automatic Layout Recalculation Authorization:** When positions are stale for the target architecture mode, `hasAuth` must evaluate to `false`, allowing `shouldAutoLayout` to authorize automatic layout calculation for the new target mode.
4. **Call-Site Consistency:** The position authority decision logic must be semantically uniform across all four `hasAuth` calculation sites in `explorer/src/components/GraphView.tsx`.
5. **Legacy State Compatibility:** Position records lacking explicit `layoutProvenance` (`undefined`) must retain backward-compatible evaluation if `storedArchMode === architectureMode`.

---

## 3. Review of All Four `hasAuth` Calculation Sites in `GraphView.tsx`

Inspection of `explorer/src/components/GraphView.tsx` on commit `04fe9e89a22af06cf63f796332e594e72fd03784` confirms that all four `hasAuth` calculation sites have been updated to check `layoutProvenance`:

### Site 1: Architecture Mode Switch Effect (Lines 522–528)
```typescript
const targetProvenance =
  architectureMode === 'hybrid'
    ? 'automatic-hybrid'
    : architectureMode === 'orbit'
    ? 'automatic-orbit'
    : architectureMode === 'constellation'
    ? 'automatic-constellation'
    : 'automatic-hierarchical';

const storedArchMode = graphLayoutRef.current?.architectureMode;
const currentProv = graphLayoutRef.current?.layoutProvenance;
const hasAuth =
  !!nodePositionsRef.current &&
  Object.keys(nodePositionsRef.current).length > 0 &&
  (currentProv === 'user-authored' ||
    (storedArchMode === architectureMode &&
      (currentProv === undefined || currentProv === targetProvenance)));
```
- **Control Flow:** Triggers when `architectureMode` changes. Passes `hasAuthoritativePositions: hasAuth` to `shouldAutoLayout('interactive', 'architecture-mode-switch', ...)`.
- **Reasoning:** If `currentProv` is `'automatic-hierarchical'` and `architectureMode` switches to `'orbit'`, `currentProv !== 'user-authored'` and `currentProv !== 'automatic-orbit'`. Thus `hasAuth = false`, so `autoLayoutPolicy` allows layout computation for the orbit mode.

### Site 2: Initial Mount Effect (Lines 824–830)
```typescript
const expectedProvenance =
  architectureMode === 'hybrid'
    ? 'automatic-hybrid'
    : architectureMode === 'orbit'
    ? 'automatic-orbit'
    : architectureMode === 'constellation'
    ? 'automatic-constellation'
    : 'automatic-hierarchical';

const hasAuth =
  !!nodePositionsRef.current &&
  Object.keys(nodePositionsRef.current).length > 0 &&
  (currentProv === 'user-authored' ||
    (storedArchMode === architectureMode &&
      (currentProv === undefined || currentProv === expectedProvenance)));
```
- **Control Flow:** Evaluated during component mount and initial graph render.
- **Reasoning:** Ensures mounted or re-hydrated position state only blocks initial automatic layout if positions are explicitly `user-authored` or match the expected initial architecture mode provenance.

### Site 3: Structural Graph Update Effect (Lines 1160–1166)
```typescript
const expectedProvenanceSync =
  architectureMode === 'hybrid'
    ? 'automatic-hybrid'
    : architectureMode === 'orbit'
    ? 'automatic-orbit'
    : architectureMode === 'constellation'
    ? 'automatic-constellation'
    : 'automatic-hierarchical';

const hasAuthForUpdate =
  !!nodePositionsRef.current &&
  Object.keys(nodePositionsRef.current).length > 0 &&
  (currentProvSync === 'user-authored' ||
    (storedArchModeSync === architectureMode &&
      (currentProvSync === undefined || currentProvSync === expectedProvenanceSync)));
```
- **Control Flow:** Triggers on graph data or selection updates (`nodes`, `edges`, `findings`).
- **Reasoning:** Evaluates position authority before deciding whether structural updates (`graph-update` or `new-nodes`) require layout recalculation or position resolution.

### Site 4: Position-Only Prop Sync Effect (Lines 1372–1378)
```typescript
const expectedProvenancePosSync =
  architectureMode === 'hybrid'
    ? 'automatic-hybrid'
    : architectureMode === 'orbit'
    ? 'automatic-orbit'
    : architectureMode === 'constellation'
    ? 'automatic-constellation'
    : 'automatic-hierarchical';

const hasAuth =
  !!nodePositions &&
  Object.keys(nodePositions).length > 0 &&
  (currentProv === 'user-authored' ||
    (storedArchMode === architectureMode &&
      (currentProv === undefined || currentProv === expectedProvenancePosSync)));
```
- **Control Flow:** Triggers when `nodePositions` prop updates externally.
- **Reasoning:** Ensures external position prop hydration respects `layoutProvenance` and does not treat stale automatic position props as authoritative across architecture modes.

### Call-Site Consistency Analysis
All four call sites evaluate identical logic:
$$\text{hasAuth} = (\text{hasPositions}) \land \Big( (\text{prov} = \text{'user-authored'}) \lor \big( (\text{storedMode} = \text{targetMode}) \land (\text{prov} = \text{undefined} \lor \text{prov} = \text{expectedProv}) \big) \Big)$$
- No site contains the original defect (`storedArchMode === architectureMode` in isolation).
- All four sites are 100% semantically consistent.

---

## 4. Position-Authority and Provenance Invariant Contract

The corrected position authority logic enforces the formal invariant:

$$\text{hasAuth}(\text{state}, \text{targetMode}) = \begin{cases} \text{true} & \text{if } \text{prov} = \text{'user-authored'} \\ \text{true} & \text{if } \text{storedMode} = \text{targetMode} \land (\text{prov} = \text{undefined} \lor \text{prov} = \text{targetProv}) \\ \text{false} & \text{if } \text{prov} \in \text{AUTO\_MODES} \land \text{prov} \neq \text{targetProv} \end{cases}$$

Where $\text{AUTO\_MODES} = \{\text{'automatic-hierarchical'}, \text{'automatic-hybrid'}, \text{'automatic-orbit'}, \text{'automatic-constellation'}\}$.

This contract guarantees that:
1. **User Authority:** Manual user drags (`user-authored`) are never discarded or overwritten during mode switching.
2. **Layout Correctness:** Automatic positions calculated for lens $A$ do not bleed into lens $B$ to create corrupted or un-computed layouts.
3. **Backward Compatibility:** Pre-existing persisted layout states without `layoutProvenance` continue to operate as expected.

---

## 5. Review of the Three B1 Regression Tests

In `explorer/src/components/GraphView.positionAuthority.test.tsx`, Lane B added three targeted regression tests:

1. **`T0-1 Reg-1`: Mode Switch with Stale Automatic Provenance**
   - **Test Logic:** Sets up existing graph state with `layoutProvenance = 'automatic-hierarchical'` and `architectureMode = 'hierarchical'`. Changes `architectureMode` prop to `'orbit'`.
   - **Assertion Verified:** Verifies that `runLayoutWithMetadata` is invoked and outputs `automatic-orbit` provenance in the layout result.
2. **`T0-2 Reg-2`: Matching Stored Mode with Stale Automatic Provenance**
   - **Test Logic:** Sets `storedArchMode = 'orbit'` but `layoutProvenance = 'automatic-hierarchical'`.
   - **Assertion Verified:** Verifies that matching `storedArchMode` alone is insufficient to claim authority when provenance is stale, correctly triggering layout recalculation.
3. **`T0-3 Reg-3`: User-Authored Position Preservation Across Mode Switches**
   - **Test Logic:** Sets `layoutProvenance = 'user-authored'`. Switches `architectureMode` from `'hierarchical'` to `'orbit'`.
   - **Assertion Verified:** Verifies `hasAuth = true`, confirming user-authored positions remain authoritative and are not recalculated by automatic layout.

**Test Audit Finding:** The three regression tests directly exercise the production code paths in `GraphView.tsx` and accurately validate the acceptance contract.

---

## 6. Exact Test Command & Execution Evidence

### Targeted Test Execution
- **Command:** `cd explorer && npx vitest run src/components/GraphView.positionAuthority.test.tsx`
- **Execution Result:** `BLOCKED`
- **Diagnostic Error Output:**
  ```text
  Error [ERR_MODULE_NOT_FOUND]: Cannot find package 'vitest' imported from /app/explorer/vitest.config.ts
  ```
- **Root Cause:** The subdirectory `explorer/node_modules` is not installed in the checked-out workspace.

### Environmental Directive Compliance
- Per Prompt Section 2 & Section 8 instructions:
  > *"If dependencies are unavailable, do not install them in the coordinator worktree. Report `BLOCKED` and request an approved test environment or isolated dependency setup."*
- Per Prompt Section 9 instructions:
  > *"Use `BLOCKED_INSUFFICIENT_EVIDENCE` if the branch, baseline, dependencies, test execution or required acceptance contract cannot be verified. Do not treat missing evidence as a pass."*

### Root CLI Test Suite Execution Evidence
- **Command:** `npm run test:cli` (from repository root)
- **Exit Code:** `0`
- **Results:** 32 integration test scripts executed, 184/184 assertions passed (100% pass rate).

---

## 7. Test and Source Gaps

1. **Local Vitest Execution Gap:** Direct execution of `src/components/GraphView.positionAuthority.test.tsx` via Vitest was blocked by uninstalled dependencies in `explorer/node_modules`.
2. **Source Code Parity:** Verified that `explorer/src/components/GraphView.tsx` and `explorer/src/components/GraphView.positionAuthority.test.tsx` in the checked-out tree are 100% identical to commit `04fe9e89a22af06cf63f796332e594e72fd03784`.

---

## 8. Protected Artifact Integrity

- **File Path:** `last_commit_changes.txt`
- **File Size:** `50,024` bytes
- **SHA-256 Checksum:** `e834467bd4a5168f5b5dcc972c49d7456f0df78d7121a1a491648fb33ec8bedb`
- **Status:** Unmodified and tracked.

---

## 9. Final Independent Decision & Rationale

### Explicit Decision
**`BLOCKED_INSUFFICIENT_EVIDENCE`**

### Concise Rationale
1. **Source Code Verification:** Source code inspection of `explorer/src/components/GraphView.tsx` confirms that Lane B1's commit `04fe9e89a22af06cf63f796332e594e72fd03784` correctly remediates all four `hasAuth` calculation sites to account for `layoutProvenance`.
2. **Regression Test Suite Inspection:** Inspection of `explorer/src/components/GraphView.positionAuthority.test.tsx` confirms that three comprehensive regression tests were added that properly exercise the fix.
3. **Execution Blocked by Environment Constraint:** Direct execution of `npx vitest run src/components/GraphView.positionAuthority.test.tsx` could not be completed because `explorer/node_modules` is not installed. Because installing dependencies (`npm --prefix explorer ci`) in the coordinator worktree is strictly prohibited by operational directives, the targeted test execution result cannot be produced in this worktree.
4. **Mandatory Blocked Result:** Per Section 8 & Section 9 of the mandate, missing test execution evidence due to uninstalled dependencies must be classified as `BLOCKED_INSUFFICIENT_EVIDENCE` rather than assumed as a pass.

---

## 10. Required Next Action for Coordinator & S2 Gate

1. **Exact Next Action:** The coordinator must hydrate `explorer/node_modules` via `npm --prefix explorer ci` in an approved verification environment or worktree.
2. **Gate S2 Release Precondition:** Once dependencies are hydrated, execute `cd explorer && npx vitest run src/components/GraphView.positionAuthority.test.tsx`.
3. **Transition to Approval:** Upon verifying a 100% pass rate (39/39 passing tests), Serialization Gate **S2** can be explicitly released, authorizing Phase B2 dispatch (`N16`, `N17`, `T0-6`, `T1-1`) and transitioning the T0-1 verification status to `PASS_PENDING_EXPLICIT_S2_APPROVAL`.
