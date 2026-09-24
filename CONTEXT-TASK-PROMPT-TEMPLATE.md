# Context-First Engineering Task Prompt Template

Use this lightweight prompt template when assigning engineering tasks to AI coding agents in this repository.

---

```markdown
# Context-First Engineering Task

Follow the repository's context-retrieval protocol in `AGENT.md` and `CONTEXT-RETRIEVAL-PROTOCOL.md`.

Before implementation:
1. Start with `AGENT.md`.
2. Identify the task-specific context route.
3. Retrieve the minimum sufficient authoritative context.
4. Resolve current authority/supersession when required (`08_Audit_Source_Register.md` / `CURRENT-STATE-BASELINE.md`).
5. Identify the implementation source of truth.
6. Inspect code only as far as necessary.
7. Do not use broad repository search unless the established context route cannot resolve the task.

Do not create or replace the repository's existing context architecture.

## Task

[INSERT YOUR SPECIFIC ENGINEERING TASK OR QUESTION HERE]

## Required Final Report

Report:
* **Context Path Used** — actual files read, in order.
* **Task Route** — the `AGENT.md` route used.
* **Authority** — authoritative source relied upon.
* **Implementation Verification** — source files actually inspected.
* **Changes Made** — exact files modified.
* **Validation** — checks/tests actually run.
* **Context Synchronization** — whether existing context was updated and why.
```
