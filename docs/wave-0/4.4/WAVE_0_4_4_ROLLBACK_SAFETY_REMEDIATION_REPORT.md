# WAVE 0.4.4 ROLLBACK SAFETY REMEDIATION REPORT

## 1. Executive Summary & Remediation Architecture

In response to the Wave 0.4.3 audit findings regarding destructive path-safe rollback, the rollback engine in `docs/wave-0/4.4/patch-gate.cjs` has been replaced with a strictly file-scoped, provenance-aware rollback mechanism.

### Key Remediation Invariants Enforced:
1. **Directory Targets Prohibited**: Rejects any directory target (e.g. `src/`, `src`) before invoking any Git command.
2. **Normalized '.' Prohibited**: Rejects current directory `.` or normalized paths resolving to `.`.
3. **Traversal Prohibited**: Rejects parent traversal (`../`) and absolute/UNC/drive paths.
4. **Symlink Targets Prohibited**: Rejects symlinks to prevent escaping repository bounds.
5. **Pre-Apply Provenance Required**: Captures file existence, tracked/untracked state, and exact pre-apply content before patch application.
6. **Pre-Existing Data Preserved**:
   - Pre-existing dirty tracked files are restored to their exact pre-apply dirty content (not reset via `git checkout HEAD`).
   - Pre-existing untracked files are strictly preserved and never unlinked.
   - Patch-created untracked files are removed only if provenance proves they were created by that specific patch operation.
7. **No Broad Reset Operations**: Prohibits `git reset --hard`, `git clean`, and `git checkout HEAD -- <dir>`.

---

## 2. Mandatory Regression Experiment Results (15/15 PASS)

All 15 mandatory rollback regression scenarios were executed in isolated temporary Git repositories:

| Scenario ID | Scenario Description | Expected Outcome | Actual Outcome | Status |
|:---:|:---|:---|:---|:---:|
| **RB-01** | Normal tracked file changed by patch: Only patch change rolled back | File content restored to pre-patch state, patch modifications reverted | Reverted successfully; content matches original main.js: true | **PASS** |
| **RB-02** | Pre-existing dirty tracked target: Original dirty content preserved | Original dirty content preserved after rollback | Pre-existing dirty content exactly preserved: true | **PASS** |
| **RB-03** | Pre-existing untracked target: File preserved | Pre-existing untracked file preserved after rollback | Untracked file preserved with original content: true | **PASS** |
| **RB-04** | Patch-created untracked file: Removed only if provenance proves ownership | Patch-created untracked file removed by rollback | Patch-created file safely deleted: true | **PASS** |
| **RB-05** | Directory target: Rejected | Directory target rejected with DIRECTORY_PATH or DIRECTORY_TARGET error | Rejected directory target with code DIRECTORY_PATH | **PASS** |
| **RB-06** | . target: Rejected | '.' target rejected | Rejected . with code DIRECTORY_PATH | **PASS** |
| **RB-07** | a/.. normalized to .: Rejected | 'a/..' normalized to '.' rejected | Rejected normalized '.' with code DIRECTORY_PATH | **PASS** |
| **RB-08** | Parent traversal: Rejected | Parent traversal rejected with PATH_TRAVERSAL | Rejected traversal with code PATH_TRAVERSAL | **PASS** |
| **RB-09** | Absolute path: Rejected | Absolute path rejected with ABSOLUTE_PATH | Rejected absolute path with code ABSOLUTE_PATH | **PASS** |
| **RB-10** | Windows drive path: Rejected | Windows drive path rejected with ABSOLUTE_PATH | Rejected drive path with code ABSOLUTE_PATH | **PASS** |
| **RB-11** | Symlink target: Rejected or safely handled with documented evidence | Symlink target rejected with SYMLINK_TARGET | Rejected symlink target with code SYMLINK_TARGET | **PASS** |
| **RB-12** | Multiple files, one dirty before patch: Dirty file preserved | Multiple files: dirty file preserved, clean file rolled back | fileA preserved dirty content, fileB reverted cleanly: true | **PASS** |
| **RB-13** | Rollback after partial failure: Only owned patch changes reverted | Partial failure rollback: only owned patch changes reverted | Owned changes reverted, unrelated dirty untracked file untouched: true | **PASS** |
| **RB-14** | Rollback attempted without provenance: Refused | Rollback attempted without provenance is refused | Refused rollback without provenance: PROVENANCE_REQUIRED | **PASS** |
| **RB-15** | Patch changes a file outside ownership: Refused | Patch changing file outside ownership refused | Refused unowned rollback: PROVENANCE_REQUIRED | **PASS** |

---

## 3. Evidence Traceability and Raw Logs

All execution logs are recorded in `docs/wave-0/4.4/rollback-logs/` with SHA-256 hashes cataloged in `docs/wave-0/4.4/WAVE_0_4_4_ROLLBACK_RAW_EVIDENCE_INDEX.csv`.
