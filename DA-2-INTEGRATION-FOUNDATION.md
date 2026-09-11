# DA-2 — Prepare dependency-analyzer for External Integration: Final Integration Report

**Repository:** `dependency-analyzer`
**Analyzer Version:** `13.0.0`
**Contract Version:** `1.0.0`
**Manifest Version:** `1.0.0`
**Date:** May 2025

---

## 1. What Existed Before

Prior to DA-2 implementation:
* `dependency-analyzer.cjs` (v13.0.0) contained core AST/Regex static analysis algorithms for Salesforce DX metadata repositories (`ApexClass`, `ApexTrigger`, `LWC`, `Visualforce`, `Flow`, `CustomObject`, `CustomField`).
* Top-level CLI execution in `dependency-analyzer.cjs` ran unconditionally whenever the file was imported via `require()`, causing unintended execution when scripts like `scripts/run-explorer.cjs` loaded the module.
* Output directory handling was hardcoded or inferred, lacking explicit `--output-dir` parameter support for external process isolation.
* No standardized integration manifest existed to verify analysis completion, source repository identity, git commit provenance, or SHA-256 artifact file integrity.
* Path separator handling used platform-native backslashes on Windows, which could cause inconsistent path string representations in exported JSON artifacts.

---

## 2. What Was Changed

Under DA-2 and DA-2.1 contract hardening:

1. **Module Guarding (`if (require.main === module)`):**
   * Wrapped top-level CLI execution in `dependency-analyzer.cjs` in `if (require.main === module)`.
   * Re-exporting functions via `module.exports` occurs safely without auto-executing the CLI.

2. **Cross-Platform Path Normalization:**
   * Updated `normalizePath` to convert all backslashes (`\`) to forward slashes (`/`).
   * Updated `resolveProjectPath` and `commandOutputDir` to normalize input paths cleanly on Windows.

3. **Explicit CLI Options & Output Directory Support:**
   * Updated `parseOptions` and `parseArgs` to support `--output-dir <path>` (or `--output <path>`), `--source <dir>`, and `--manifest`.
   * `activateOutputDir` creates and isolates output directories specified by the external caller.

4. **True Content-Based Source Hash:**
   * Refactored `computeSourceHash(sourceDir)` to compute a true content-based SHA-256 fingerprint over sorted relative file paths and file content bytes (independent of `mtime` or machine-specific absolute paths).

5. **Single Manifest Lifecycle (`analysis-manifest.json`):**
   * Finalized `generateAnalysisManifest` in `dependency-analyzer.cjs` at a single authoritative point at the end of analysis.
   * `scripts/export-explorer.cjs` registers `explorerData` into `analysis-manifest.json` cleanly.

6. **Hardened CLI Integration Test Suite (`scripts/test-cli-integration.cjs`):**
   * Extended `scripts/test-cli-integration.cjs` to cover 20 core contract assertions (content-based source hash, mtime independence, content changes, file renames, failure exit codes, stale data detection, Windows paths, manifest schema & SHA-256 verification, adapter integration, determinism).
   * Added `"test:cli": "node scripts/test-cli-integration.cjs"` to `package.json`.

7. **Documentation:**
   * Updated `EXTERNAL_INTEGRATION.md` and `DA-2-INTEGRATION-FOUNDATION.md`. Created `DA-2.1-CONTRACT-HARDENING.md`.

---

## 3. CLI Boundary

### Supported Commands
* `node dependency-analyzer.cjs analyze [sourceDir] [--output-dir <dir>] [--manifest]`
* `node dependency-analyzer.cjs impact <name> [sourceDir]`
* `node dependency-analyzer.cjs refactor-impact <name> [sourceDir]`
* `node dependency-analyzer.cjs search <text> [sourceDir]`
* `node dependency-analyzer.cjs stats [sourceDir]`

### Arguments & Options
* `[sourceDir]` (positional) or `--source <dir>`: Salesforce DX source directory path.
* `--output-dir <dir>` or `--output <dir>`: Custom output folder path.
* `--max-graph-edges <number>`: Maximum edge capacity (default: `10000`).
* `--max-impact-depth <number>`: Traversal depth limit (default: `50`).

### Exit Codes & Behavior
* **0 (Success):** Command completed successfully; deterministic artifacts written.
* **1 (Failure):** Command failed (e.g. source directory missing, unknown command). Useful error message emitted to `stderr`, and any stale `status: "COMPLETE"` manifest is removed.

---

## 4. Integration Artifact Classification

Artifacts are classified into three distinct tiers:

* **Core External Contract:** `analysis-manifest.json`, `dependency-report.json`, `architecture-metrics.json`.
* **Optional Analyzer Artifacts:** `analysis-snapshot.json`, `dependency-report.md`, `dependency-summary.md`, `unresolved-references.md`.
* **Explorer / UI Artifacts:** `explorer-data.json`.

| Artifact Path | Classification | Producer | Schema | Mandatory? | Stable? |
| :--- | :--- | :--- | :--- | :---: | :---: |
| `analysis-manifest.json` | Core External Contract | `dependency-analyzer.cjs` | Manifest v1.0.0 | YES | YES |
| `dependency-report.json` | Core External Contract | `dependency-analyzer.cjs` | Raw Facts JSON | YES | YES |
| `architecture-metrics.json` | Core External Contract | `dependency-analyzer.cjs` | Metrics JSON | YES | YES |
| `analysis-snapshot.json` | Optional Analyzer Artifact | `dependency-analyzer.cjs` | Snapshot Schema v4 | NO | YES |
| `explorer-data.json` | Explorer / UI Artifact | `scripts/export-explorer.cjs` | Explorer Contract v1.0.0 | NO | YES |

---

## 5. Manifest & Contract Schema (`analysis-manifest.json`)

```json
{
  "manifestVersion": "1.0.0",
  "analyzerVersion": "13.0.0",
  "contractVersion": "1.0.0",
  "generatedAt": "2025-05-15T12:00:00.000Z",
  "source": {
    "directory": "force-app/main/default",
    "fileCount": 142,
    "sourceHash": "sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "gitCommit": "a1b2c3d4e5f67890123456789abcdef012345678"
  },
  "status": "COMPLETE",
  "artifacts": {
    "dependencyReport": {
      "path": "dependency-report.json",
      "fileHash": "sha256:9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08"
    },
    "explorerData": {
      "path": "explorer-data.json",
      "schemaVersion": "1.0.0",
      "fileHash": "sha256:7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069",
      "nodeCount": 45,
      "edgeCount": 112
    }
  }
}
```

---

## 6. Versioning

System versions are kept strictly distinct:
* **`analyzerVersion` (`13.0.0`):** Bumps when static analysis parsing or metric calculation algorithms change.
* **`contractVersion` (`1.0.0`):** Bumps when external JSON schema structures change.
* **`manifestVersion` (`1.0.0`):** Bumps when `analysis-manifest.json` metadata format changes.

---

## 7. Source Identity & Freshness

A downstream consumer determines whether artifacts are fresh and valid by evaluating:
1. `status === "COMPLETE"` in `analysis-manifest.json`.
2. Computed SHA-256 hash of `dependency-report.json` matches `artifacts.dependencyReport.fileHash`.
3. Computed content-based SHA-256 fingerprint over source files in `<sourceDir>` matches `source.sourceHash`.
4. Git commit hash matches current `HEAD` commit (if running in a Git repository).

---

## 8. Windows & Path Behavior

* All file paths written to exported JSON artifacts use POSIX-style forward slashes (`/`).
* Backslashes (`\`) passed as input CLI arguments are automatically converted via `.replace(/\\/g, "/")`.
* Node's `path.resolve` and `path.normalize` are used throughout for reliable cross-platform path resolution.

---

## 9. Tests Executed

Three automated test suites were executed:
1. Hardened Explorer Data Adapter Validation Suite (`npm run adapter:test`).
2. CLI Integration Boundary Test Suite (`npm run test:cli`).
3. Explorer Vitest Unit & Component Test Suite (`cd explorer && npm test`).

---

## 10. Test Results

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

## 11. Remaining Risks

1. **Extremely Large Monorepos (>50,000 files):** Calculating full SHA-256 content hashes on massive repositories takes ~1–2 seconds.
   * *Mitigation:* `computeSourceHash` streams file content directly in memory efficiently.
2. **Missing Source Directory in Downstream Caller:** If an external consumer passes an invalid path, the process terminates with exit code 1.
   * *Mitigation:* The consumer must handle non-zero exit codes and read `stderr`.

---

## 12. Items Intentionally NOT Changed

* ❌ Prompt 17 or any Prompt 18+ Architecture Intelligence capabilities were NOT implemented.
* ❌ No LLM code, LiteLLM, AI Gateway, or prompt templates were added.
* ❌ No HTTP API server, Express service, or database was added.
* ❌ Explorer UI source code was NOT modified or redesigned.
* ❌ Existing CLI commands, arguments, and workflow scripts (`scripts/run-explorer.cjs`) remain 100% backward compatible.

---

## 13. Exact Instructions for an External Consumer to Invoke the Analyzer

An external project (such as `refactor-litellm`) invokes `dependency-analyzer` via child process:

```bash
# Step 1: Run static analysis
node /path/to/dependency-analyzer/dependency-analyzer.cjs analyze /path/to/salesforce/force-app/main/default --output-dir ./analysis-export

# Step 2: Run Explorer adapter to export stable JSON contract (optional for Explorer)
node /path/to/dependency-analyzer/scripts/export-explorer.cjs --input ./analysis-export --output ./analysis-export/explorer-data.json

# Step 3: Validate manifest completion & SHA-256 integrity
node -e "
const fs = require('fs');
const manifest = JSON.parse(fs.readFileSync('./analysis-export/analysis-manifest.json', 'utf8'));
if (manifest.status !== 'COMPLETE') throw new Error('Analysis incomplete');
console.log('Analysis verified! Source content hash:', manifest.source.sourceHash);
"
```
