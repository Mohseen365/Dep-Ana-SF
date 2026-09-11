# External Integration Surface Guide

**Repository:** `dependency-analyzer`
**Analyzer Version:** `13.0.0`
**Contract Version:** `1.0.0`
**Manifest Version:** `1.0.0`

---

## 1. Purpose

The `dependency-analyzer` repository acts as the authoritative, standalone, deterministic architecture and dependency analysis engine for Salesforce metadata repositories (`ApexClass`, `ApexTrigger`, `LWC`, `Visualforce`, `Flow`, `CustomObject`, `CustomField`).

It produces machine-readable, schema-validated JSON artifacts containing deterministic facts (nodes, edges, metrics, risk classifications, Tarjan circular dependency cycles, unresolved references, and pre-computed impact closures) that external repositories (such as `refactor-litellm`) consume as input context.

---

## 2. Invocation

External projects invoke the analyzer as a child process via Node.js CLI:

```bash
# Standard analysis execution
node dependency-analyzer.cjs analyze [sourceDir] [--output-dir <outputDir>] [--manifest]

# Example: Analyzing a Salesforce DX repository with custom output path
node dependency-analyzer.cjs analyze force-app/main/default --output-dir ./analysis-export
```

### CLI Command Reference
* `analyze [sourceDir]`: Full repository static analysis.
* `impact <name> [sourceDir]`: Compute direct and transitive reachability closures for a symbol.
* `refactor-impact <name> [sourceDir]`: Produce refactoring-focused risk assessment.
* `search <text> [sourceDir]`: Search symbols and evidence.
* `stats [sourceDir]`: Output high-level architecture counts and metrics in JSON format.

---

## 3. Inputs

### Source Directory
* Argument: `<sourceDir>` (positional or passed via `--source <dir>`).
* Default: `force-app/main/default`.
* Format: Relative or absolute file system path to Salesforce DX source folder.
* Support: Handles both POSIX (`/`) and Windows (`\`) path separators.

### Configuration Flags
* `--output-dir <path>` or `--output <path>`: Specifies custom target directory for generated artifacts.
* `--max-graph-edges <number>`: Maximum graph edge capacity (default: `10000`).
* `--max-impact-depth <number>`: Maximum BFS reachability traversal depth (default: `50`).
* `--manifest`: Ensures explicit `analysis-manifest.json` creation (enabled by default during `analyze`).

---

## 4. Outputs & Required Integration Artifacts

When `analyze` executes, it emits a deterministic export directory containing these core integration artifacts:

| Artifact Path | Purpose | Producer | Schema / Shape | Mandatory? | Deterministic? |
| :--- | :--- | :--- | :--- | :---: | :---: |
| `analysis-manifest.json` | Provenance, source identity, completion status, SHA-256 integrity hashes | `dependency-analyzer.cjs` | Manifest Schema v1.0.0 | YES | YES |
| `explorer-data.json` | Primary consolidated dataset (nodes, edges, cycles, metrics, impact closures) | `scripts/export-explorer.cjs` | Explorer Contract v1.0.0 | YES | YES |
| `dependency-report.json` | Complete raw graph, symbol registry, and metrics report | `dependency-analyzer.cjs` | Raw Fact JSON | YES | YES |
| `analysis-snapshot.json` | Rehydratable analysis snapshot cache with file state fingerprint | `dependency-analyzer.cjs` | Snapshot Schema v4 | YES | YES |
| `architecture-metrics.json` | Ranked component risk & coupling metric tables | `dependency-analyzer.cjs` | Metrics JSON | YES | YES |

---

## 5. Analysis Manifest Contract (`analysis-manifest.json`)

`analysis-manifest.json` provides explicit provenance and integrity verification for downstream consumers:

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
    "explorerData": {
      "path": "explorer-data.json",
      "schemaVersion": "1.0.0",
      "fileHash": "sha256:7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069",
      "nodeCount": 45,
      "edgeCount": 112
    },
    "dependencyReport": {
      "path": "dependency-report.json",
      "fileHash": "sha256:9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08"
    }
  }
}
```

### Manifest Fields
* `manifestVersion`: Schema version of the manifest format itself (`1.0.0`).
* `analyzerVersion`: Version of the engine that produced the analysis (`13.0.0`).
* `contractVersion`: Version of the integration data contract (`1.0.0`).
* `generatedAt`: ISO 8601 generation timestamp.
* `source.directory`: Normalized relative path to analyzed source directory.
* `source.fileCount`: Number of Salesforce source files scanned.
* `source.sourceHash`: SHA-256 fingerprint computed across source file paths, sizes, and mtime stamps.
* `source.gitCommit`: Git commit hash of the analyzed source repository (if running inside a Git repository).
* `status`: Completion status (`COMPLETE` or `FAILED`).
* `artifacts`: Key-value map of available artifact files and their SHA-256 file hashes.

---

## 6. Versioning & SemVer Strategy

The analyzer maintains clear separation between system versions:

```text
┌────────────────────────────────┐
│    Analyzer Version: 13.0.0    │  -> Engine implementation & AST parsing logic
└───────────────┬────────────────┘
                │
┌───────────────▼────────────────┐
│    Contract Version: 1.0.0     │  -> explorer-data.json schema definitions
└───────────────┬────────────────┘
                │
┌───────────────▼────────────────┐
│    Manifest Version: 1.0.0     │  -> analysis-manifest.json provenance format
└────────────────────────────────┘
```

* **Major Bump:** Breaking schema changes (e.g. Contract `2.0.0`).
* **Minor Bump:** Additive non-breaking facts (e.g. Contract `1.1.0`).
* **Patch Bump:** Engine bug fixes or metric weight tweaks without schema modification.

---

## 7. Exit Behavior & Semantics

The CLI provides deterministic, machine-detectable exit codes:

* **Exit Code 0 (Success):** Analysis completed successfully; output artifacts written to disk.
* **Exit Code 1 (Failure):** Analysis failed (e.g., missing source directory, invalid options, unexpected file read error). Error details are written to `stderr`.

```bash
# Programmatic exit code check in Node.js consumer
const { spawnSync } = require("child_process");
const result = spawnSync("node", ["dependency-analyzer.cjs", "analyze", sourceDir]);

if (result.status !== 0) {
  console.error("Analyzer failed:", result.stderr.toString());
  process.exit(1);
}
```

---

## 8. Source Freshness & Stale-Data Detection

External consumers MUST verify artifact freshness before using generated datasets for refactoring:

1. **Check Status:** Assert `status === "COMPLETE"` in `analysis-manifest.json`.
2. **Verify File Integrity:** Re-compute SHA-256 hash of `explorer-data.json` and compare against `artifacts.explorerData.fileHash`.
3. **Verify Source Identity:** Compute the SHA-256 source hash over current files in `<sourceDir>` and assert equality with `source.sourceHash`. If hashes differ, source code was modified after analysis, requiring a re-run.

---

## 9. Ownership Boundary

### `dependency-analyzer` owns:
* Salesforce source discovery & AST parsing.
* Symbol registry & dependency resolution (`EXACT`, `INFERRED`, `HEURISTIC`, `UNRESOLVED`).
* Graph construction & directional edge evidence extractions.
* Deterministic metrics (`fanIn`, `fanOut`, `coupling`, `risk`).
* Circular dependency detection (Tarjan's SCC algorithm).
* Pre-computed reachability closures & impact summaries.
* Static Explorer UI & adapter data contracts.

### Downstream `refactor-litellm` owns:
* Multi-agent refactoring orchestration.
* LLM prompt construction & context packaging.
* Semantic reasoning & natural language architectural trade-off evaluations.
* Autonomous refactoring plan generation & code modifications.
* Code review, semantic verification, and validation.

---

## 10. Explicit Non-Goals

This integration boundary strictly excludes:
* ❌ LLM integration, LiteLLM SDKs, or AI Gateway clients.
* ❌ HTTP API servers, Express daemons, or database backends.
* ❌ Direct module imports across repositories (`dependency-analyzer.cjs` is invoked via CLI child processes).
* ❌ Implementation of Prompt 17 or unreleased architecture intelligence features.
