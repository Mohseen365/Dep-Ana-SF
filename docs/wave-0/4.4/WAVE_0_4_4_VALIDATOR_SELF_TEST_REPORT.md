# WAVE 0.4.4 VALIDATOR SELF-TEST REPORT

## 1. Executive Summary

In response to the Wave 0.4.3 audit finding that self-tests passed on any validator failure rather than asserting the specific defect finding, the Wave 0.4.4 self-test harness (`test-wave0-4-4-validator.cjs`) enforces exact assertion-level defect verification.

Every negative test:
1. Injects a single targeted mutation.
2. Asserts the presence of the exact expected Finding ID.
3. Asserts the correct category.
4. Confirms that unrelated findings are not masquerading as success.
5. Runs across 3 complete sequential sweeps to prove 100% per-case reproducibility.

---

## 2. Three-Sweep Per-Case Consistency Breakdown

| Test ID | Scenario Name | Expected Finding ID | Sweep 1 | Sweep 2 | Sweep 3 | Consistent |
|:---:|:---|:---:|:---:|:---:|:---:|:---:|
| **SELF-BASE-CLEAN** | Baseline Clean Sandbox | `NONE` | PASS | PASS | PASS | **TRUE** |
| **MUT-01** | Duplicate task ID in register | `TASK-02` | PASS | PASS | PASS | **TRUE** |
| **MUT-02** | Unexpected task ID added | `TASK-01` | PASS | PASS | PASS | **TRUE** |
| **MUT-03** | Task count less than 21 | `TASK-01` | PASS | PASS | PASS | **TRUE** |
| **MUT-04** | Self-dependency on task | `DEP-NO-SELF-W6-1` | PASS | PASS | PASS | **TRUE** |
| **MUT-05** | Broken Wave 5 serialization chain (W5-3 does not depend on W5-2) | `W5-CHAIN-3` | PASS | PASS | PASS | **TRUE** |
| **MUT-06** | Dependency cycle between W6-1 and W6-2 | `DEP-NO-CYCLES` | PASS | PASS | PASS | **TRUE** |
| **MUT-07** | Nonexistent dependency task reference | `DEP-EXISTS-W6-1->W99-1` | PASS | PASS | PASS | **TRUE** |
| **MUT-08** | Manifest row count less than 175 | `MAN-01` | PASS | PASS | PASS | **TRUE** |
| **MUT-09** | Manifest EXISTING count mismatch | `MAN-02` | PASS | PASS | PASS | **TRUE** |
| **MUT-10** | Manifest NEW count mismatch | `MAN-03` | PASS | PASS | PASS | **TRUE** |
| **MUT-11** | Duplicate raw path in manifest | `MAN-NO-DUP-RAW` | PASS | PASS | PASS | **TRUE** |
| **MUT-12** | Duplicate normalized path in manifest | `MAN-NO-DUP-NORM` | PASS | PASS | PASS | **TRUE** |
| **MUT-13** | Path traversal in manifest path | `PATH-NO-TRAV-175` | PASS | PASS | PASS | **TRUE** |
| **MUT-14** | Absolute path in manifest path | `PATH-NO-ABS-175` | PASS | PASS | PASS | **TRUE** |
| **MUT-15** | Windows backslash path in manifest | `PATH-NO-BS-175` | PASS | PASS | PASS | **TRUE** |
| **MUT-16** | Dot segment in manifest path | `PATH-NO-DOT-175` | PASS | PASS | PASS | **TRUE** |
| **MUT-17** | Directory path in manifest path | `PATH-NO-DIR-175` | PASS | PASS | PASS | **TRUE** |
| **MUT-18** | Task path not in authoritative manifest | `TASK-PATH-IN-MAN-W6-1-scratch/salesforce-poc/tests/run-unknown.cjs` | PASS | PASS | PASS | **TRUE** |
| **MUT-19** | Feature task modifies frozen runner | `FROZEN-PROT-W5-1-scratch/salesforce-poc/tests/run-poc-tests.cjs` | PASS | PASS | PASS | **TRUE** |
| **MUT-20** | Feature task modifies coordinator path | `COORD-PROT-W5-1-scratch/salesforce-poc/force-app/main/default/lwc/daAppShell/daAppShell.js` | PASS | PASS | PASS | **TRUE** |
| **MUT-21** | Traceability matrix count less than 9 | `TRACE-01` | PASS | PASS | PASS | **TRUE** |
| **MUT-22** | Duplicate contract ID in traceability | `TRACE-02` | PASS | PASS | PASS | **TRUE** |
| **MUT-23** | Missing contract ID prefix W0-C | `TRACE-PREFIX-C1` | PASS | PASS | PASS | **TRUE** |
| **MUT-24** | Empty contract definition in traceability | `TRACE-DEF-W0-C1` | PASS | PASS | PASS | **TRUE** |

---

## 3. Findings & Evidence Registers

The results are cataloged in `docs/wave-0/4.4/WAVE_0_4_4_VALIDATOR_SELF_TEST_RESULTS.csv` and `docs/wave-0/4.4/WAVE_0_4_4_VALIDATOR_MUTATION_TESTS.csv`.
