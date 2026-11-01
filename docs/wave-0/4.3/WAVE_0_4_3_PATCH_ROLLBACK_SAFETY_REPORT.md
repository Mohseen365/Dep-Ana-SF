# WAVE 0.4.3 PATCH ROLLBACK SAFETY REPORT

## 1. Defect Analysis of Wave 0.4.2 Rollback

The historical rollback logic documented in earlier waves relied on shell piping:
```bash
git apply --reverse ... || awk '{print $3}' | xargs git checkout HEAD --
```
This shell pattern suffered from severe failure modes:
1. Shell word splitting broken by paths containing spaces.
2. Inability to handle Unicode filenames.
3. Coarse fallbacks (`git checkout HEAD -- .` or `git reset --hard`) that destroy unrelated user modifications and uncommitted working-tree state.

---

## 2. Wave 0.4.3 Path-Safe Rollback Implementation

The new `pathSafeRollback(repoDir, targetCommitOrHead, pathsToRevert)` function in `patch-gate.cjs` eliminates shell word splitting and ensures exact isolation:

1. **Targeted Inspection**: For each path in `pathsToRevert`, checks whether the file existed at `targetCommitOrHead` using `git cat-file -e <targetCommit>:<path>`.
2. **Tracked Files Restoration**: Uses direct argument arrays via `child_process.spawnSync('git', ['checkout', targetCommitOrHead, '--', path])`, safely escaping all filenames with spaces, brackets, hyphens, and Unicode.
3. **Untracked File Deletion**: If the file did not exist in the target commit, safely unlinks it from disk and removes it from the Git staging cache (`git rm -f --cached -- <path>`).
4. **Preservation of Unrelated Files**: Files not in `pathsToRevert` are completely untouched, verified empirically in Scenario SCN-14.
5. **No Coarse Commands**: Absolutely prohibits `git checkout HEAD -- .` and `git reset --hard`.

---

## 3. Empirical Verification Matrix

| Scenario ID | Test Condition | Filename Pattern | Rollback Result | Unrelated Work Preserved |
|:---:|:---|:---|:---:|:---:|
| `SCN-07` | Space in filename | `src/file with spaces.js` | RESTORED_CLEAN | YES |
| `SCN-08` | Unicode UTF-8 filename | `src/日本語_ファイル.js` | RESTORED_CLEAN | YES |
| `SCN-09` | Special characters | `src/[special]_file-v1.0.js` | RESTORED_CLEAN | YES |
| `SCN-12` | Tracked file modification | `src/existing.js` | RESTORED_CLEAN | YES |
| `SCN-14` | Pre-existing user modifications | `src/unrelated.js` untouched | RESTORED_CLEAN | **YES (100% Intact)** |
| `SCN-15` | Reapply after rollback | `src/reapply.js` | REAPPLIED_CLEAN | YES |
