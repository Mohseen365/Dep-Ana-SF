# Parallel UI Execution Rules & Change Manifest Governance

## Overview
This document defines the strict governance rules for parallel execution of all upcoming UI implementation workstreams (Phases 2A through 2I). Compliance with these rules guarantees zero merge conflicts, zero cross-phase regressions, and deterministic maintenance of dependency analysis invariants.

---

## Core Execution Rules

### Rule 1: Strict Ownership Isolation
Each parallel phase or agent MUST modify ONLY files explicitly designated as **Owned files** in `UI_FILE_OWNERSHIP.md`. Modifying files owned by another phase is strictly prohibited.

### Rule 2: Read-Only Files Protection
Files classified as **Read-only files** for a phase may be imported, referenced, and inspected, but MUST NOT be edited, renamed, moved, or deleted under any circumstances.

### Rule 3: Shared/Integration File Freeze
Shared and integration files (such as `explorer/src/App.tsx` and `explorer/src/main.tsx`) are frozen during parallel execution. Parallel agents MUST NOT edit shared files. Composition and wiring of shared files occurs exclusively during the final integration phase.

### Rule 4: Cross-Phase Requests Protocol
If an agent during Phase $X$ requires a modification, new export, or property addition in a file owned by Phase $Y$, the agent MUST NOT edit Phase $Y$'s file. Instead, it documents the request as a `CROSS_PHASE_REQUEST` in its change manifest. The integration lead or Phase $Y$ owner fulfills the request during their scheduled phase.

### Rule 5: Zero Silent Ownership Violations
Any unauthorized or silent modification to an unowned file is treated as a build-blocking violation. Automated pre-commit git diff checks will reject any commit that touches files outside the phase's owned list.

### Rule 6: No Unrelated Refactoring
Agents MUST focus strictly on the deliverables assigned to their phase. "Cleanups," linting adjustments, formatting changes, or refactorings of code outside the assigned scope are forbidden.

### Rule 7: Analysis & Core Logic Preservation
UI implementation workstreams MUST NOT alter dependency-analysis logic, Cytoscape graph construction semantics, or risk calculation algorithms in `dependency-analyzer.cjs` or `explorer/src/lib/`. The analyzer engine remains the sole authoritative source of truth.

### Rule 8: Contract Stability
Data contracts (`explorer-data.json`, `analysis-snapshot.json`) and backend API interfaces MUST NOT be modified unless explicitly assigned as a deliverable of Phase 2G (Multi-Project Foundation).

### Rule 9: Mandatory Change Manifest
Upon completion of any phase, the executing agent MUST produce an `IMPLEMENTATION_REPORT.md` following the exact template specified below. Submissions lacking a valid change manifest will be rejected.

---

## Mandatory Implementation Report Template

Every phase implementation submission must include a change manifest formatted exactly as follows:

```markdown
IMPLEMENTATION REPORT

Phase: [Phase ID, e.g., 2A - Layout / Sidebar / Dead Space]
Status: [COMPLETE | IN_PROGRESS | BLOCKED]

Files changed:
- [List of owned files modified]

Files created:
- [List of new files created]

Files deleted:
- [List of files deleted, or NONE]

Tests run:
- [List of unit/integration test commands executed]

Tests passed:
- [Summary of test results]

Tests failed:
- [List of failing tests, or NONE]

UI behavior changed:
- [Concise description of visual/UI changes introduced]

Logic changed:
NONE

API changed:
NONE

Cross-phase requests:
- [Description of any requests for other phases, or NONE]

Known issues:
- [List of known limitations or pending integration items]
```
