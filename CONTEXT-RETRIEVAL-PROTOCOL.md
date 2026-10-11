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

## 3. Freshness, Authority & Stale-Context Rejection Policy

Agents working in this repository must strictly obey the following 10 freshness and authority rules when retrieving or evaluating context:

1. **Revalidate on retrieval:** Context files, memory summaries, historical reports, generated inventories, prior chat summaries, and previous verdicts are discovery aids, never sufficient proof of current repository state.
2. **Resolve conflicts by evidence, not convenience:** Prefer direct inspection of current source, current configuration/manifests, reproducible test output, and current artifact hashes over prose claims. Use Git history only to establish chronology or explain changes, not to assume a historical state is still active.
3. **Track provenance:** Material claims must include the source path, relevant symbol/line or JSON field, commit/tree identity where applicable, observation date, and validation method.
4. **Enforce freshness:** A claim about current implementation, test status, counts, paths, or architecture must be rechecked against the current checkout in the current run. If it cannot be rechecked, mark it `UNVERIFIED`, never `CURRENT_SUPPORTED`.
5. **Detect shadow copies:** If multiple files appear to be canonical, identify the designated authority and update retrieval instructions to prevent a stale duplicate from silently overriding it. Do not delete duplicates without evidence that deletion is safe.
6. **Separate present state from historical state:** Preserve useful historical decisions and reports, but label them with their valid commit/date/scope and mark superseded claims explicitly.
7. **Fail closed:** If authoritative sources conflict, do not synthesize a new contract or choose whichever source gives a passing result. Report the conflict as `DECISION_REQUIRED` or `INDETERMINATE`.
8. **Avoid self-validating documentation:** A context file cannot establish its own correctness merely by declaring itself canonical/current.
9. **Update carefully:** Make only evidence-backed, minimal edits to context files. Preserve existing user changes. Do not bulk-rewrite, auto-format, or regenerate canonical documents wholesale.
10. **Prevent stale closure:** "Fixed," "verified," "closed," and "passed" statements must cite the specific current evidence and scope. Where the evidence no longer applies to HEAD, relabel it historical.

---

## 4. Stopping Conditions

An agent MUST stop context retrieval when:
1. The exact implementation source files to modify are identified;
2. The contracts/types governing the code are understood;
3. The test suite enforcing the behavior is identified;
4. No unresolved authority conflict remains.
