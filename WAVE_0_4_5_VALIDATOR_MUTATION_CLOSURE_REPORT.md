# WAVE 0.4.5 VALIDATOR MUTATION CLOSURE REPORT

This report documents the verification of validator precision using isolated fixture mutation across 3 sweeps.

## Mutation Results Summary
- Total Mutation Cases Per Sweep: 10
- Total Sweeps: 3
- Total Executions: 30
- Consistency Rate: 100% IDENTICAL across all sweeps

## Detailed Results

| Sweep | Mutation ID | Description | Expected Finding | Category | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | MUT-01 | Unexpected task added to task register | `TASK-COUNT-21` | staticSchema | PASS |
| 1 | MUT-02 | Missing task from canonical register | `TASK-COUNT-21` | staticSchema | PASS |
| 1 | MUT-03 | Duplicate task ID in task register | `TASK-DUPLICATE` | staticSchema | PASS |
| 1 | MUT-04 | Cyclic dependency injected | `DEP-ACYCLIC` | semanticReview | PASS |
| 1 | MUT-05 | Duplicate path in ownership manifest | `MANIFEST-DUPLICATE` | staticSchema | PASS |
| 1 | MUT-06 | Directory target inserted into manifest | `MANIFEST-NO-DIR-scratch/salesforce-poc/force-app/main/default/lwc/` | filesystem | PASS |
| 1 | MUT-07 | Batch 1 task count violation | `BATCH1-TASK-COUNT-11` | staticSchema | PASS |
| 1 | MUT-08 | W7 contract ambiguous OR query introduced | `W7-REJECT-AMBIGUOUS-OR` | semanticReview | PASS |
| 1 | MUT-09 | W8 raw string limit omitted | `W8-10MB-STRING-GUARD` | semanticReview | PASS |
| 1 | MUT-10 | daAppShell.js dispatched event falsely introduced | `APPSHELL-NO-DISPATCH-EVENT` | semanticReview | PASS |
| 2 | MUT-01 | Unexpected task added to task register | `TASK-COUNT-21` | staticSchema | PASS |
| 2 | MUT-02 | Missing task from canonical register | `TASK-COUNT-21` | staticSchema | PASS |
| 2 | MUT-03 | Duplicate task ID in task register | `TASK-DUPLICATE` | staticSchema | PASS |
| 2 | MUT-04 | Cyclic dependency injected | `DEP-ACYCLIC` | semanticReview | PASS |
| 2 | MUT-05 | Duplicate path in ownership manifest | `MANIFEST-DUPLICATE` | staticSchema | PASS |
| 2 | MUT-06 | Directory target inserted into manifest | `MANIFEST-NO-DIR-scratch/salesforce-poc/force-app/main/default/lwc/` | filesystem | PASS |
| 2 | MUT-07 | Batch 1 task count violation | `BATCH1-TASK-COUNT-11` | staticSchema | PASS |
| 2 | MUT-08 | W7 contract ambiguous OR query introduced | `W7-REJECT-AMBIGUOUS-OR` | semanticReview | PASS |
| 2 | MUT-09 | W8 raw string limit omitted | `W8-10MB-STRING-GUARD` | semanticReview | PASS |
| 2 | MUT-10 | daAppShell.js dispatched event falsely introduced | `APPSHELL-NO-DISPATCH-EVENT` | semanticReview | PASS |
| 3 | MUT-01 | Unexpected task added to task register | `TASK-COUNT-21` | staticSchema | PASS |
| 3 | MUT-02 | Missing task from canonical register | `TASK-COUNT-21` | staticSchema | PASS |
| 3 | MUT-03 | Duplicate task ID in task register | `TASK-DUPLICATE` | staticSchema | PASS |
| 3 | MUT-04 | Cyclic dependency injected | `DEP-ACYCLIC` | semanticReview | PASS |
| 3 | MUT-05 | Duplicate path in ownership manifest | `MANIFEST-DUPLICATE` | staticSchema | PASS |
| 3 | MUT-06 | Directory target inserted into manifest | `MANIFEST-NO-DIR-scratch/salesforce-poc/force-app/main/default/lwc/` | filesystem | PASS |
| 3 | MUT-07 | Batch 1 task count violation | `BATCH1-TASK-COUNT-11` | staticSchema | PASS |
| 3 | MUT-08 | W7 contract ambiguous OR query introduced | `W7-REJECT-AMBIGUOUS-OR` | semanticReview | PASS |
| 3 | MUT-09 | W8 raw string limit omitted | `W8-10MB-STRING-GUARD` | semanticReview | PASS |
| 3 | MUT-10 | daAppShell.js dispatched event falsely introduced | `APPSHELL-NO-DISPATCH-EVENT` | semanticReview | PASS |
