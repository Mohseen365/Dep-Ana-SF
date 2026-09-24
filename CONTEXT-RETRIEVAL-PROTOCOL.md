# CONTEXT-RETRIEVAL-PROTOCOL

This document defines the repository's authoritative rules for context retrieval, task routing, authority resolution, code verification, broad search escalation, and context synchronization.

---

## 1. Primary Objective

For every engineering task, retrieve the **smallest sufficient set of current, authoritative context** required to safely understand and perform the task.

Optimize retrieval in this order:

```text
1. Correct task routing
2. Correct authority
3. Current-state correctness
4. Sufficient understanding
5. Minimal context consumption
6. Minimal implementation inspection
```

Target flow:

```text
Task
 ↓
AGENT.md
 ↓
Task-specific route
 ↓
Minimum relevant context
 ↓
Authoritative source
 ↓
Implementation verification only if required
 ↓
Validation
```

---

## 2. Hard Rule: `AGENT.md` is the Entry Point

For every non-trivial engineering task:

```text
START → AGENT.md
```

Do not begin with:
* repository-wide grep,
* `find .`,
* searching all Markdown,
* searching all audit reports,
* scanning `audit-evidence/`,
* scanning `audit-fixtures/`,
* scanning unrelated source directories,
* or guessing implementation files from filenames.

`AGENT.md` is the project's **task-routing index**. Use it to determine task domain, relevant context, authoritative sources, current-state orientation requirements, implementation source-of-truth, validation guidance, protected artifacts, and historical/evidence boundaries.

---

## 3. Retrieval Hierarchy is Task-Specific

Do NOT interpret the context architecture as a mandatory fixed sequence for every task. The correct model is:

```text
AGENT.md
     ↓
task-specific route
     ↓
only the context layers required by that route
```

`CURRENT-STATE-BASELINE.md` and `08_Audit_Source_Register.md` are **conditional retrieval layers**, not mandatory documents that must be read for every task. The route defined by `AGENT.md` determines what is required.

---

## 4. First Gate — Classify the Task

Before opening additional project context, classify the task into the smallest applicable category:
* Current State / Handoff
* Architecture
* Domain / Feature
* Contract / Schema
* Implementation
* Debugging
* Validation
* Regression
* Audit / Evidence
* History / Provenance
* Integration

If multiple categories apply, identify only the minimum number of routes necessary to resolve the task.

---

## 5. Second Gate — Resolve the Route from `AGENT.md`

Find the task in `AGENT.md`. Determine:

```text
Task → Domain → Context pointer → Authority pointer → Implementation pointer → Validation pointer
```

If `AGENT.md` provides a direct route, follow it. Do not substitute your own route because another file appears easier to find.

---

## 6. Third Gate — Define the Retrieval Question

Before opening another context file, state the question that file must answer:

> **No question → no file read.**

For every additional context artifact, determine:
1. What question does this file answer?
2. Why is that answer necessary?
3. Is the answer already available from a higher-authority source?

If the information is already known from a sufficient authoritative source: **STOP RETRIEVING**.

---

## 7. Current-State Orientation

Use `CURRENT-STATE-BASELINE.md` when the task requires current project orientation (handoff, current status, current limitations, active tracks). It is an orientation layer, not a complete implementation encyclopedia.

---

## 8. Authority / Supersession Resolution

Use `08_Audit_Source_Register.md` when authority, provenance, history, or supersession must be resolved.

Never assume:
* `newest filename = authoritative`
* `most detailed report = authoritative`
* `latest phase number = authoritative`

Use the project's explicit authority/supersession information.

---

## 9. Domain / Feature Context

When `AGENT.md` points to an existing domain context (e.g., `FEAT-LAYOUT`, `FEAT-POSAUTH`, `FEAT-OVERLAY`, `FEAT-STATE`, `FEAT-CONTRACT`), use it to determine domain architecture, source-of-truth locations, constraints, and validation requirements.

---

## 10. Code Verification Rule

Context tells you **where to look and what matters**. Repository code tells you **what currently exists**. Tests/validation tell you **whether it works**.

```text
Context → locate source of truth → Repository → verify implementation → Tests → verify behavior
```

Inspect source code only when required to verify actual implementation claims. Read the smallest relevant implementation surface.

---

## 11. Raw Evidence Rule

`audit-evidence/` is not part of normal retrieval. Use raw evidence only when forensic verification, telemetry, raw measurements, reproduction evidence, or provenance verification is explicitly required.

---

## 12. Broad Search Escalation

Broad repository search is an escalation path, not the starting point. Use it only when:
* `AGENT.md` cannot resolve the task,
* referenced context is incomplete,
* a referenced artifact cannot be located,
* documented and actual implementation disagree,
* a dependency cannot be resolved,
* or repository-wide investigation is explicitly required.

Before broad search, identify the unanswered question, why existing context cannot answer it, and the smallest search scope required.

---

## 13. Retrieval Stop Condition

Stop retrieving context when you can establish:
* Relevant domain
* Current authority
* Relevant constraints
* Source of truth
* Required implementation surface
* Relevant validation requirements

---

## 14. Context ↔ Code Discrepancies

When context and implementation disagree:
1. Identify the documented claim.
2. Identify the actual implementation.
3. Determine whether the difference is historical, intentional, stale context, an implementation defect, or unresolved.
4. Preserve historical evidence.
5. If durable current knowledge changed, update the appropriate existing context layer. Never silently rewrite history.

---

## 15. After Implementation — Context Synchronization

After a meaningful implementation change, ask:
> **Did this change alter durable project knowledge that a future agent needs to retrieve correctly?**

If **No**: Do not modify context.
If **Yes**: Update the smallest appropriate existing layer:
* Navigation → `AGENT.md`
* Audit authority / supersession → `08_Audit_Source_Register.md`
* Durable current state → `CURRENT-STATE-BASELINE.md`
* Domain knowledge → existing domain context
* Historical/audit evidence → existing historical/audit structure

---

## 16. Protected Artifacts

Unless explicitly required by the task, do not modify historical audit reports, canonical datasets (`audit-fixtures/cloud-spend-tracker/explorer-data.json`), established architectural reports, Position Authority contracts, renderer contracts, or existing audit evidence.

---

## 17. Required Final Report Format

After completing a task, report:
1. **Context Path Used**: List actual files read in order (`AGENT.md` → `context` → `authority` → `code`).
2. **Task Route**: The `AGENT.md` task/domain route used.
3. **Authority**: Authoritative source relied upon (with phase/date when available).
4. **Implementation Verification**: Source files actually inspected.
5. **Changes Made**: Exact files modified and why.
6. **Validation**: Tests/checks actually run and results.
7. **Context Synchronization**: State whether context was updated and why.
