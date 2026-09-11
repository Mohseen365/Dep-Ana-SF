# DA-2.1 — Harden the External Integration Contract: Final Report

**Repository:** `dependency-analyzer`
**Analyzer Version:** `13.0.0`
**Contract Version:** `1.0.0`
**Manifest Version:** `1.0.0`
**Date:** May 2025

---

## 1. Findings from DA-2 Review

A thorough review of the initial DA-2 integration baseline identified five key areas requiring contract hardening before downstream consumption by external orchestrators:

1. **Source Hash Semantics:** The initial implementation hashed `path + size + mtimeMs` rather than file content bytes. Modifying file timestamps could alter the fingerprint even when contents were identical.
2. **Manifest Generation Lifecycle:** The manifest lifecycle needed a single authoritative finalization point to guarantee that no manifest falsely asserts completion before artifacts are written.
3. **Artifact Classification:** Required contract artifacts needed explicit classification into Core External Contract, Optional Analyzer Artifacts, and Explorer/UI Artifacts.
4. **Manifest Mutation:** The Explorer adapter updated `analysis-manifest.json` after generating `explorer-data.json`. This relationship needed clear documentation and clean lifecycle handling.
5. **Version Semantics & Path Resolution:** System versioning needed explicit rules, and path resolution needed verification against unexpected directory lookups.

---

## 2. Source Hash Decision & Exact Semantics

### Decision
`source.sourceHash` in `analysis-manifest.json` is a **true content-based SHA-256 fingerprint** computed across all discovered Salesforce DX source files.

### Construction Formula
```text
sourceHash = SHA-256(
  For each file in discovered source, sorted lexicographically by relative path:
    "file:" + relativePath + "\n" + fileContentBytes + "\n"
)
```

### Properties
* **Content Determinism:** Identical source files produce the exact same `sourceHash` regardless of operating system, directory location, or filesystem `mtime`.
* **mtime Independence:** Changing `mtime` via `touch` or `git checkout` does NOT change `sourceHash`.
* **Modification Sensitivity:** Modifying file content or renaming a file changes `sourceHash`.

---

## 3. Manifest Lifecycle

The manifest follows a single authoritative finalization lifecycle:

```text
1. CLI Invocation (node dependency-analyzer.cjs analyze <sourceDir> --output-dir <outDir>)
                             │
                             ▼
2. Static Analysis Execution (Discovery -> AST Parsing -> Graph -> Metrics -> Cycles)
                             │
                             ▼
3. Core Artifact Generation (dependency-report.json, architecture-metrics.json, analysis-snapshot.json)
                             │
                             ▼
4. Manifest Finalization (generateAnalysisManifest writes analysis-manifest.json with status: "COMPLETE")
                             │
                             ▼
5. Optional Adapter Pass (export-explorer.cjs updates manifest with explorerData SHA-256 if executed)
```

If analysis fails at any point before completion, process terminates with exit code `1`, logs the error to `stderr`, and cleans up any stale `status: "COMPLETE"` manifest file in the output directory.

---

## 4. Core vs. Optional vs. Explorer Artifacts

Artifacts produced by the analyzer are categorized into three distinct tiers:

### A. Core External Contract (Required for downstream refactoring orchestrators)
* `analysis-manifest.json`: Manifest format v1.0.0 containing status, versions, source content hash, git commit, and artifact SHA-256 hashes.
* `dependency-report.json`: Complete raw graph topology, symbol registry, and metrics.
* `architecture-metrics.json`: Ranked component risk and coupling metric tables.

### B. Optional Analyzer Artifacts (Available for deep context)
* `analysis-snapshot.json`: Rehydratable analysis cache with file state tracking.
* `dependency-report.md`, `dependency-summary.md`, `unresolved-references.md`: Human-readable markdown reports.

### C. Explorer / UI Artifacts (Visualization specific)
* `explorer-data.json`: Consolidated contract for read-only Explorer UI visualization (`explorer-contract.ts` Schema v1.0.0).

---

## 5. Version Semantics

System versions are kept strictly distinct:

* **`analyzerVersion` (`13.0.0`):** Bumps when static analysis parsing or metric calculation algorithms change in `dependency-analyzer.cjs`.
* **`contractVersion` (`1.0.0`):** Bumps when external JSON schema structures consumed by downstream repositories change.
* **`manifestVersion` (`1.0.0`):** Bumps when `analysis-manifest.json` metadata format changes.

---

## 6. Source Identity

Source identity is established via four complementary provenance properties in `analysis-manifest.json`:

```json
"source": {
  "directory": "force-app/main/default",
  "fileCount": 142,
  "sourceHash": "sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  "gitCommit": "a1b2c3d4e5f67890123456789abcdef012345678"
}
```

* `directory`: POSIX relative path to the analyzed source folder.
* `fileCount`: Total number of scanned Salesforce source files.
* `sourceHash`: True content-based SHA-256 fingerprint.
* `gitCommit`: Git commit hash string if Git is present, or `null` if Git is unavailable. Git is NOT a mandatory dependency.

---

## 7. Freshness Behavior

An external consumer determines whether artifacts are fresh and valid by evaluating:
1. `status === "COMPLETE"` in `analysis-manifest.json`.
2. Computed SHA-256 hash of `dependency-report.json` matches `artifacts.dependencyReport.fileHash`.
3. Computed content-based SHA-256 fingerprint over source files in `<sourceDir>` matches `source.sourceHash`.

---

## 8. Failure Behavior

* **Success:** Process exits with code `0`. Manifest contains `status: "COMPLETE"`.
* **Failure:** Process exits with code `1`. Error details emitted to `stderr`. Misleading `status: "COMPLETE"` manifests are removed.

---

## 9. CLI Behavior

Supported invocations:
```bash
node dependency-analyzer.cjs analyze [sourceDir] [--output-dir <dir>] [--manifest]
node dependency-analyzer.cjs analyze --source <dir> --output-dir <dir>
```

Handles relative output paths, absolute output paths, Windows-style backslash paths, spaces in paths, missing source directories, and invalid commands.

---

## 10. Windows & Path Behavior

* All file paths written to exported JSON artifacts use POSIX-style forward slashes (`/`).
* Backslashes (`\`) passed as input CLI arguments are automatically converted via `.replace(/\\/g, "/")`.
* Node's `path.resolve` and `path.normalize` are used throughout for reliable cross-platform path resolution.

---

## 11. Tests Executed

Three automated test suites were executed:
1. Hardened Explorer Data Adapter Validation Suite (`npm run adapter:test`).
2. CLI Integration Boundary Test Suite (`npm run test:cli`).
3. Explorer Vitest Unit & Component Test Suite (`cd explorer && npm test`).

---

## 12. Test Results

### 1. Adapter Validation Suite (`npm run adapter:test`)
```text
ALL 12 VALIDATION INVARIANTS AND GRAPH COMPARISON CHECKS PASSED!
```

### 2. CLI Integration Test Suite (`npm run test:cli`)
```text
Running Hardened CLI Integration Boundary Test Suite (DA-2.1)...
Test 1: Module require safety -> PASS
Test 2: Normal CLI analysis execution -> PASS
Test 3: Explicit --output-dir flag handling -> PASS
Test 4: Explicit --source flag handling -> PASS
Test 5: Windows-style Backslash Path Handling -> PASS
Test 6: Core Integration Artifact Generation -> PASS
Test 7: Manifest Schema & Provenance Verification -> PASS
Test 8: Artifact SHA-256 File Hash Integrity -> PASS
Test 9: Content-based Source Hash Fingerprint -> PASS
Test 10: Same Contents + Changed mtime -> SAME Source Hash -> PASS
Test 11: Changed File Contents -> DIFFERENT Source Hash -> PASS
Test 12: Renamed File -> DIFFERENT Source Hash -> PASS
Test 13: Stale Source Detection Logic -> PASS
Test 14: Failure Semantics - Missing Source Directory -> PASS
Test 15: Failure Semantics - Unknown Command -> PASS
Test 16: No Misleading COMPLETE Manifest on Failure -> PASS
Test 17: Deterministic Output Verification -> PASS
Test 18: Explorer Adapter Behavior & Manifest Registration -> PASS
Test 19: Single Manifest Lifecycle Verification -> PASS
Test 20: External Consumer Validation Flow Simulation -> PASS

ALL 20 CLI INTEGRATION BOUNDARY CONTRACT TESTS PASSED SUCCESSFULLY!
```

### 3. Explorer Vitest Suite (`cd explorer && npm test`)
```text
Test Files  18 passed (18)
     Tests  177 passed (177)
```

---

## 13. Remaining Limitations

1. **Massive Repositories (>50,000 files):** Streaming content-based SHA-256 hashes on enterprise orgs takes ~1–2 seconds.
2. **Dynamic Apex Resolution:** Static analysis boundaries remain (e.g. `Type.forName` with runtime variables is flagged as unresolved/dynamic).

---

## 14. Exact External-Consumer Contract

An external project (such as `refactor-litellm`) consumes `dependency-analyzer` as follows:

```bash
# 1. Run static analysis via child process
node /path/to/dependency-analyzer/dependency-analyzer.cjs analyze /path/to/salesforce/force-app/main/default --output-dir ./analysis-export

# 2. Programmatically verify process exit code === 0

# 3. Read analysis-manifest.json
# 4. Verify manifest.status === "COMPLETE"
# 5. Verify manifest.contractVersion === "1.0.0"
# 6. Verify SHA-256 hash of ./analysis-export/dependency-report.json matches manifest.artifacts.dependencyReport.fileHash
# 7. Compute source content hash over force-app/main/default and verify match with manifest.source.sourceHash
# 8. Read dependency-report.json and architecture-metrics.json for deterministic architecture facts
```
