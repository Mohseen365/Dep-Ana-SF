# WAVE 0.4.3 VALIDATOR SELF-TEST REPORT

## 1. Overview and Reproducibility Protocol

To ensure the Wave 0.4.3 validator is robust against false negatives, an adversarial self-test suite (`test-validator-self-tests.cjs`) was implemented covering 32 distinct defect classes plus a baseline clean fixture (33 total scenarios).

The self-test suite was executed across **three independent sweeps** using freshly generated temporary sandbox environments (`os.tmpdir()`), with complete directory cleanup between tests.

---

## 2. Defect Classes Evaluated

| Scenario ID | Defect Category | Description | Run 1 | Run 2 | Run 3 |
|:---|:---|:---|:---:|:---:|:---:|
| `BASE-CLEAN` | Baseline | Unmodified clean fixtures must pass zero errors | PASS | PASS | PASS |
| `DEF-01` | Task Set | Missing mandatory task W5-1 | PASS | PASS | PASS |
| `DEF-02` | Task Set | Extra unauthorized task W10-1 | PASS | PASS | PASS |
| `DEF-03` | Task Set | Duplicate task ID W6-1 | PASS | PASS | PASS |
| `DEF-04` | Dependencies | Invalid task dependency on non-existent W99-9 | PASS | PASS | PASS |
| `DEF-05` | Dependencies | Dependency cycle between W6-1 and W6-2 | PASS | PASS | PASS |
| `DEF-06` | Dependencies | Task self-dependency W7-1 on W7-1 | PASS | PASS | PASS |
| `DEF-07` | Manifest | Duplicate manifest path | PASS | PASS | PASS |
| `DEF-08` | Path Safety | Windows drive-qualified path (`C:/repo/...`) | PASS | PASS | PASS |
| `DEF-09` | Path Safety | UNC path (`\\\\server\\share\\...`) | PASS | PASS | PASS |
| `DEF-10` | Path Safety | Traversal path segment (`../`) | PASS | PASS | PASS |
| `DEF-11` | Mutability | Feature task attempts to modify frozen runner | PASS | PASS | PASS |
| `DEF-12` | Mutability | Feature task attempts to modify coordinator runner | PASS | PASS | PASS |
| `DEF-13` | Traceability | Missing contract ID W0-C1 in matrix | PASS | PASS | PASS |
| `DEF-14` | Traceability | Duplicate contract ID W0-C2 | PASS | PASS | PASS |
| `DEF-15` | Traceability | Non-frozen contract status (`DRAFT_UNAPPROVED`) | PASS | PASS | PASS |
| `DEF-16` | Traceability | Outstanding decision present on frozen contract | PASS | PASS | PASS |
| `DEF-17` | Task Union | Exact affected files union mismatch (extra file) | PASS | PASS | PASS |
| `DEF-18` | Task Union | Unknown task path not in manifest | PASS | PASS | PASS |
| `DEF-19` | Path Safety | Dot segment relative path (`./...`) | PASS | PASS | PASS |
| `DEF-20` | Path Safety | Backslash separator in manifest | PASS | PASS | PASS |
| `DEF-21` | Manifest | Empty manifest path row | PASS | PASS | PASS |
| `DEF-22` | Task Set | Empty task ID row | PASS | PASS | PASS |
| `DEF-23` | Traceability | Contract missing exact definition | PASS | PASS | PASS |
| `DEF-24` | Dependencies | Broken Wave 5 serialized dependency chain | PASS | PASS | PASS |
| `DEF-25` | Manifest | Manifest row count less than 175 | PASS | PASS | PASS |
| `DEF-26` | Task Set | Task register count less than 21 | PASS | PASS | PASS |
| `DEF-27` | Traceability | Traceability matrix count less than 9 | PASS | PASS | PASS |
| `DEF-28` | Path Safety | Absolute path starting with `/` | PASS | PASS | PASS |
| `DEF-29` | Manifest | Existing file count mismatch | PASS | PASS | PASS |
| `DEF-30` | Manifest | New file count mismatch | PASS | PASS | PASS |
| `DEF-31` | Traceability | Contract ID missing prefix `W0-C` | PASS | PASS | PASS |
| `DEF-32` | Traceability | Duplicate contract ID in matrix | PASS | PASS | PASS |

---

## 3. Results and Flakiness Statement

- **Sweep 1**: 33/33 Passed (100%)
- **Sweep 2**: 33/33 Passed (100%)
- **Sweep 3**: 33/33 Passed (100%)
- **Consistency**: 100% across all 3 sweeps. No variation observed between runs.
- **Fixture Cleanup**: All temporary directories were verified removed after test completion.
- **Evidence Register**: Saved to `docs/wave-0/4.3/WAVE_0_4_3_VALIDATOR_SELF_TEST_REGISTER.csv`.
