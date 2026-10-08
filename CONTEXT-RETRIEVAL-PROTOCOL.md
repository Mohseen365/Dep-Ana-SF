# Context Retrieval Protocol

This document defines the repository's authoritative protocol for:
- Task-driven context routing;
- Minimum-sufficient-context retrieval;
- Authority and supersession resolution;
- Current-state orientation;
- Domain context selection;
- Implementation verification;
- Retrieval stopping conditions.

---

## 1. Core Principles

1. **Source-of-Truth Hierarchy:**
   Current executable code, type contracts, and active test suites supercede all documentation. When documentation conflicts with executable code, the executable state is authoritative.

2. **Minimum-Sufficient-Context Rule:**
   Read the smallest context necessary to accomplish the task. Do not scan hundreds of historical audit reports when answering a specific implementation question.

3. **Explicit Supersession:**
   Historical reports (`PHASE_*.md`, `WAVE_*.md`, `audit-reports/`) are evidence logs. Check `context/SUPERSESSION-MAP.md` to confirm if a historical report has been superseded by current code.

---

## 2. Task Execution Routing

### Route A: Bug Investigation
```text
Task
 ↓
Read `context/CURRENT-IMPLEMENTATION.md`
 ↓
Inspect implementation source file in `explorer/src/` or `scripts/`
 ↓
Inspect matching test file in `explorer/src/test/` or `scripts/test-*.cjs`
 ↓
Run test to reproduce and verify
 ↓
STOP
```

### Route B: New Feature / Lens Addition
```text
Task
 ↓
Read `context/CURRENT-ARCHITECTURE.md`
 ↓
Inspect `explorer/src/registry/workspace-registry.ts` and `explorer/src/types/explorer.ts`
 ↓
Create/update adapter in `explorer/src/lib/adapters/`
 ↓
Create/update UI component in `explorer/src/components/`
 ↓
Add unit test in `explorer/src/test/`
 ↓
Run tests and verify
 ↓
STOP
```

### Route C: Refactoring / State Hardening
```text
Task
 ↓
Read `context/CURRENT-ARCHITECTURE.md` & `context/CURRENT-DECISIONS.md`
 ↓
Inspect `explorer/src/context/` state authority providers
 ↓
Verify selection neutrality (`SELECTION ≠ NAVIGATION`)
 ↓
Run unit tests (`explorer/src/test/Phase2FA_CoreArchitecture.test.tsx`)
 ↓
STOP
```

### Route D: Historical / Rationale Investigation
```text
Question
 ↓
Read `context/HISTORICAL-DECISIONS.md`
 ↓
Consult `context/SUPERSESSION-MAP.md`
 ↓
Inspect preserved historical report if necessary
 ↓
Verify current behavior in source code
 ↓
STOP
```

---

## 3. Stopping Conditions

An agent MUST stop context retrieval when:
1. The exact implementation source files to modify are identified;
2. The contracts/types governing the code are understood;
3. The test suite enforcing the behavior is identified;
4. No unresolved authority conflict remains.
