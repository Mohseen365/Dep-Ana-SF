# Wave 0.4.1: Final Implementation Authorization Assessment

## 1. Authoritative Authorization Verdict

**Final Verdict:**
### `READY_WITH_EXPLICIT_RESTRICTIONS`

---

## 2. Rigorous Justification for Verdict

### 2.1 Criteria for "READY" Satisfied:
1. **All P0 Contradictions Closed:**
   - Writable test runner allocations reconciled: feature tasks own only `run-w<id>-tests.cjs`; aggregate runners exclusively owned by Integration Coordinator.
   - Task `W7-P1` metadata ownership resolved: frozen `.cls-meta.xml` files removed from writable allocations; paths normalized.
   - Wave 5 scope reconciled: canonical layout/viewer tasks restored; strict linear serialization enforced (`W5-1 -> W5-2 -> W5-3 -> W5-4 -> W5-5 -> W5-6`).
   - Batch integration protocol established: `dispatch_base_commit` distinguished from integration HEAD; safe reverse-apply rollback formalized.
2. **All P1/P2 Contradictions Closed:**
   - W7 project ID vs Key query branching formalized; DTO standardized on `runName`.
   - File counts reconciled: 175 unique manifest paths vs 191 category row sum mathematically explained.
   - Handoff schema regex corrected to `^(W[5-9]-[1-6]|W7-P1|INT-1)$`; 15 patch scenarios classified.
   - Contract W0-C4 redefined as contract governance and registration, eliminating conflict with heterogeneous component APIs.
   - Wave 8 memory and lifecycle claims classified: 10 MB raw string guard vs V8 heap expansion; request-generation invalidation vs network cancellation.
   - Aggregate runner lifecycle formalized; robust baseline test harness with exit code and unit count assertions established.
   - Environment provenance reconciled: Vitest 5.0.5 (npx cache) vs declared `^2.1.9`; tool availability decoupled from test execution claims.
3. **Automated Verification:**
   - `validate-wave0-4-1-dispatch.cjs` passed with 491/491 verified invariants and exit code 0.
   - All 9 frozen baseline test runners passed with 187/187 test units.

### 2.2 Why Not Unrestricted "READY_FOR_IMPLEMENTATION_AUTHORIZATION"?
Implementation is strictly governed by pre-implementation gates:
1. Documentation and register reconciliation is complete and consistent, but **human authorization (Gate 1)** is required before feature agents can be dispatched into isolated branches.
2. The current environment has no active Salesforce scratch org connection (`which sf` is empty). Local planning and offline Node.js test validation cannot certify Salesforce org deployment, Apex compilation, or FLS runtime security.

---

## 3. Explicit Implementation Restrictions & Boundaries

When Gate 1 human approval is granted, implementation must adhere strictly to these non-negotiable boundaries:

### Restriction 1: Batch 1 Dispatch Concurrency
Only the 11 immediately launchable tasks in Batch 1 may be dispatched concurrently:
- `W5-1` (Serialized Step 1)
- `W6-1`, `W6-2`, `W6-3`, `W6-4` (Workstream B)
- `W7-P1`, `W7-1`, `W7-2` (Workstream C)
- `W8-1`, `W8-2` (Workstream D)
- `W9-1` (Workstream E)

### Restriction 2: Strict Wave 5 Serialization
Tasks `W5-2` through `W5-6` must NOT be dispatched concurrently with `W5-1` or with each other. They must be executed strictly in order after coordinator integration and verification of the preceding task.

### Restriction 3: Dependent Tasks Blocked Until Preconditions Met
- `W7-3` blocked until `W7-P1` is integrated.
- `W8-3` blocked until `W8-2` and `W7-P1` are integrated.
- `W9-2` and `W9-3` blocked until `W9-1` is integrated.
- `INT-1` (Coordinator Shell Mount) blocked until all 20 feature tasks are integrated.

### Restriction 4: Zero Production Modification During Wave 0.4.1
No production Apex, LWC, JavaScript, TypeScript, or config files may be altered during Wave 0.4.1 dispatch reconciliation.

### Restriction 5: Zero Salesforce Org Operations Without Scratch Org & Gate 3
No deployments, schema pushes, or remote org commands may be executed until Gate 2 and Gate 3 approvals are granted.
