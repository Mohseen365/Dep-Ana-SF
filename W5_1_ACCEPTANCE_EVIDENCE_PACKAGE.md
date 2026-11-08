# W5_1_ACCEPTANCE_EVIDENCE_PACKAGE.md
## Task W5-1 (Shell Layout Switcher) Acceptance Evidence Package

### 1. Task Metadata & Scope Definition
- **Task ID:** W5-1
- **Task Description:** Shell Layout Switcher (Grid / Circle / Breadthfirst)
- **Workstream:** Workstream A (Graph Workspace & Visual Encodings)
- **Assigned Accountable Owner:** Workstream A Lead
- **Governing Contracts:**
  - CONTRACT-01: Canonical Graph Payload v1.0.0 (Ratified)
  - CONTRACT-02: Layout Identifiers & Configuration v1.0.0 (Ratified)
  - CONTRACT-09: Shared State, Immutability & Frozen Invariants (Ratified)
- **Exact Authorized Affected Files:**
  - `scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.js`
  - `scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.html`
  - `scratch/salesforce-poc/tests/run-w5-1-tests.cjs`

### 2. Implementation & Parity Verification
The production implementation in `daGraphViewer` was audited against W5-1 acceptance criteria and CONTRACT-02 specifications:
1. **Layout Modes Supported:** Native Cytoscape `grid`, `circle`, and `breadthfirst`, alongside architecture layout dispatch.
2. **Layout Normalization:** Case-insensitive string parsing, whitespace trimming, and safe fallback to default layout for unknown/invalid modes.
3. **Graceful Fallback:** Mapping `dagre` to `breadthfirst` fallback per CONTRACT-02 §6.4.
4. **Event Dispatch:** Standard `layoutchange` custom event with `detail: { layoutMode }`, bubbling and composed.
5. **State & Invariant Preservation:**
   - `SELECTION != NAVIGATION`: Zero mutation to active navigation or recordId on layout selection.
   - Selected node preservation: Active selected node identity survives layout recomputation.
   - Filter preservation: Existing filter criteria remain completely intact without destructive modification.
   - Project isolation: Changes are strictly scoped to the active project context.
6. **Debounced Persistence & Cancellation Lifecycle:**
   - Production `scheduleSaveState()` persists view state and layout choices via debounced callback.
   - Stale preference responses and mid-flight layout calculations are safely cancelled upon rapid layout changes.
   - Apex save rejections are trapped without component corruption.

### 3. Empirical Test Execution Evidence
Executing dedicated runner: `node scratch/salesforce-poc/tests/run-w5-1-tests.cjs`
- **Result:** 17 passed, 0 failed, 0 skipped.
- **Exit Code:** 0

```text
Starting Task W5-1 (Shell Layout Switcher) Hardened Unit & Contract Tests...
  ✓ 1. Supported layout modes (grid, circle, breadthfirst) defined
  ✓ 2. Exact configuration property values verified per CONTRACT-02 §4.1
  ✓ 3. Case-insensitivity and whitespace trimming verified
  ✓ 4. Dagre maps gracefully to breadthfirst fallback per CONTRACT-02 §6.4
  ✓ 5. Unsupported, null, undefined, and empty layout values fall back safely
  ✓ 6. Layout switching via setLayout() and layoutMode setter operates correctly
  ✓ 7. layoutchange custom event verified with detail, bubbling, and composed flags
  ✓ 8. No navigation side effects or recordId modification on layout switch
  ✓ 9. Selected node and project identity preserved across layout switch
  ✓ 10. Existing filter criteria preserved with zero mutation
  ✓ 11. Production scheduleSaveState() persists canonical payload via real scheduled callback
  ✓ 12. Production debounce persists only latest layout and suppresses stale/project-changed requests
  ✓ 13. Apex save rejection handled cleanly by production callback without state corruption
  ✓ 14. Layout execution failure sets user-visible error state
  ✓ 15. Architecture layout computes and positions nodes deterministically
  ✓ 16. Operations safe when Cytoscape instance or DOM container unavailable
  ✓ 17. Layout cancellation lifecycle verified: run(L1) -> stop(L1) -> run(L2) with active instance replacement
============================================================
Task W5-1 Test Results: 17 PASSED, 0 FAILED
```

### 4. Baseline Regression Verification
Executing full baseline suite across all 9 immutable runners:
- POC Tests: 43 passed
- Wave 4 Integration Suite: 32 passed
- Lane A Schema Tests: 9 passed
- Lane C Preset Manager Tests: 10 passed
- Lane D Graph Filter Tests: 15 passed
- Lane E Matrix Tests: 11 passed
- Lane F Findings Tests: 12 passed
- Workstream A Tests: 33 passed
- Workstream C Tests: 22 passed
**Total Baseline Tests:** 187 passed, 0 failed. Zero regressions detected.

### 5. Joint Sign-Off Record & Status
Under Section 0.3 of the Master Execution Directive, formal acceptance requires joint sign-off by:
1. Workstream A Lead
2. Integration Coordinator

| Signatory Role | Name / Title | Decision | Timestamp | Signature / Reference |
|---|---|---|---|---|
| Workstream A Lead | Workstream A Lead | **PENDING REVIEW** | — | Awaiting Review Session |
| Integration Coordinator | Integration Coordinator | **PENDING REVIEW** | — | Awaiting Review Session |

**Current Task Disposition:** `IMPLEMENTED_PENDING_ACCEPTANCE`
*(Notice: Per governance directives, W5-1 is verified and ready for review, but cannot be classified as fully ACCEPTED until joint signatures are executed. Successor task W5-2 remains held fail-closed.)*
