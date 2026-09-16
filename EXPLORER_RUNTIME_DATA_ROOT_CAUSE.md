# Explorer Runtime Data Root Cause Analysis Report

## 1. Exact Error

The Explorer startup fails during `npm run explorer` with the following runtime output:

```text
PS C:\Users\User\Downloads\dependency-analyzer> npm run explorer

Project: default
Source: C:\Users\User\Downloads\dependency-analyzer\force-app\main\default
Running Explorer Data Adapter for project 'default'...

Input:   analyze
Output:  C:\Users\User\Downloads\dependency-analyzer\analyze\explorer-data.json
Project: default

Adapter failed:
Analyzer output file not found in directory: analyze
```

---

## 2. Execution Flow

```text
npm run explorer
    ↓
package.json script: "node scripts/run-explorer.cjs"
    ↓
scripts/run-explorer.cjs: main() -> parseArgs()
    - Default project: "default"
    - Default source: path.join(ROOT_DIR, "force-app", "main", "default")
    ↓
runAnalysisIfNeeded(source, fresh, "default")
    - Checks analyzeDir ("analyze") and reportFile ("analyze/dependency-report.json")
    - reportFile exists, so shouldRun evaluates to false (analysis re-run skipped)
    ↓
runAdapter("default", source)
    - Executes: node scripts/export-explorer.cjs --input "analyze" --output ".../analyze/explorer-data.json" --project "default" --source ".../force-app/main/default"
    ↓
scripts/export-explorer.cjs: exportExplorerData() -> resolveInputFile("analyze", { project: "default", source: ".../force-app/main/default" })
    ↓
resolveInputFile():
    1. Checks explicit inputPath ("analyze"). Finds "analyze/dependency-report.json".
    2. Calls matchesSource("analyze/dependency-report.json"):
       - Reads sourceDirectory from analyze/dependency-report.json: "../Food-App/force-app/main/default"
       - Calls isSameSource("../Food-App/force-app/main/default", ".../force-app/main/default")
       - Mismatch detected! returns false.
    3. Explicit source provided (".../force-app/main/default"). Checks if directory exists on disk.
       - Directory ".../force-app/main/default" DOES NOT exist!
       - Re-running analyzer skipped/fails.
    4. Searches candidate default report files (root & analyze directories) using matchesSource(f).
       - All existing reports contain sourceDirectory "../Food-App/force-app/main/default", so all fail matchesSource().
    ↓
Error thrown: Analyzer output file not found in directory: analyze
```

---

## 3. Expected Analyzer Contract

The Explorer Data Adapter (`scripts/export-explorer.cjs`) expects an existing analyzer report file (`dependency-report.json` or `analysis-snapshot.json`) inside the input directory (`analyze/` or `analyze/projects/<project>/`).

The analyzer output file must be a valid JSON artifact containing:
- `nodes`: Array of discovered components (ApexClass, Trigger, LWC, CustomObject, CustomField, Visualforce, Flow, External).
- `edges`: Array of dependency edges (`from`, `to`, `type`, `method`, `evidence`, `canonical`).
- `metrics`: Array of component metrics (`id`, `fanIn`, `fanOut`, `coupling`, `unresolved`, `score`, `risk`, `reasons`).
- `registry`: Map or array of parsed component details (`id`, `file`, `parsed`).
- `sourceDirectory` (or `discovered.sourceDir` / `source.sourceDir`): String path of the source codebase analyzed.

When `--source` is passed to `export-explorer.cjs`, `resolveInputFile()` validates that `report.sourceDirectory` matches `--source` via `isSameSource()`. If they do not match, the adapter treats the existing report as stale or belonging to a different source and rejects it.

---

## 4. Actual Files in `analyze/`

The `analyze/` directory exists and currently contains the following files and directories:

```text
analyze/
├── projects/
│   ├── food-app/
│   ├── food-delivery-app/
│   └── movie-app/
│       ├── explorer-data.json
│       └── project-metadata.json
├── analysis-manifest.json
├── analysis-snapshot.json
├── architecture-metrics.json
├── architecture-snapshot.json
├── dependency-graph.dot
├── dependency-graph.mmd
├── dependency-report.json
├── dependency-report.md
├── dependency-summary.md
├── explorer-data.json
├── project-manifest.json
├── project-metadata.json
└── unresolved-references.md
```

### Analysis of Existing Files:
- `analyze/dependency-report.json` **exists**, but its recorded `sourceDirectory` is:
  `"../Food-App/force-app/main/default"`
- `force-app/main/default` **does not exist** on disk at the workspace root.

---

## 5. Movie-App Comparison

| Metric / Aspect | `movie-app` | `default` |
|---|---|---|
| **Directory** | `analyze/projects/movie-app/` | `analyze/` |
| **Explorer Contract File** | `analyze/projects/movie-app/explorer-data.json` exists | `analyze/explorer-data.json` fails to generate |
| **Command Execution** | `npm run explorer -- --project movie-app` | `npm run explorer` |
| **Input Directory Target** | `analyze/projects/movie-app` | `analyze` |
| **Analyzer Output Present** | Pre-generated project data contract exists in `projects/movie-app/` | Root `analyze/dependency-report.json` exists but has source `../Food-App/...` |
| **Source Matching** | Bypassed or matched project directory artifact | Mismatches default `--source force-app/main/default` |

### Why `movie-app` succeeds while `default` fails:
- `movie-app` targets `analyze/projects/movie-app/`, where project-scoped Explorer contract artifacts already exist.
- When `default` is run, `run-explorer.cjs` passes a default `--source` argument (`<ROOT>/force-app/main/default`). `export-explorer.cjs` strictly compares `--source` against `analyze/dependency-report.json`'s `sourceDirectory` (`../Food-App/force-app/main/default`). Because the paths do not match, `export-explorer.cjs` rejects `analyze/dependency-report.json`. It then attempts to run `dependency-analyzer.cjs` on `<ROOT>/force-app/main/default`, which fails because that directory does not exist on disk.

---

## 6. Root Cause

```text
PRIMARY ROOT CAUSE:
Source path contract mismatch combined with missing default source directory on disk. `run-explorer.cjs` supplies a default `--source` argument pointing to `<ROOT>/force-app/main/default` (which does not exist on disk), while `analyze/dependency-report.json` was generated from `../Food-App/force-app/main/default`.

BROKEN BOUNDARY:
The source validation boundary in `resolveInputFile()` (`scripts/export-explorer.cjs`). `resolveInputFile()` strictly rejects existing report files if `isSameSource(reportSource, explicitSource)` is false, forcing a re-analysis attempt on a non-existent directory (`force-app/main/default`) instead of consuming the available report.

WHY:
1. `run-explorer.cjs` defaults `--source` to `path.join(ROOT_DIR, "force-app", "main", "default")`.
2. `export-explorer.cjs` receives `--source` and enforces `matchesSource()`.
3. `matchesSource()` compares `<ROOT>/force-app/main/default` vs `../Food-App/force-app/main/default` -> returns `false`.
4. `resolveInputFile()` attempts re-running the analyzer on `<ROOT>/force-app/main/default`, but the directory does not exist on disk.
5. Search falls through and throws `Analyzer output file not found in directory: analyze`.
```

---

## 7. Correct Existing Command Sequence

To run the Explorer using existing supported commands in the repository:

### Option A: Running Explorer for an existing project (`movie-app`)
```bash
npm run explorer -- --project movie-app
```

### Option B: Running Export Data Adapter directly without mismatched `--source`
```bash
node scripts/export-explorer.cjs --input analyze --output analyze/explorer-data.json --project default
```

### Option C: If a valid source directory exists on disk
```bash
node dependency-analyzer.cjs analyze <path-to-source-dir>
npm run explorer -- --source <path-to-source-dir>
```

---

## 8. Required Fix

If a code change is to be made in the workflow scripts:

1. **File:** `scripts/run-explorer.cjs`
   - **Function:** `parseArgs()` / `runAdapter()`
   - **Reason:** `run-explorer.cjs` should only pass `--source` to `export-explorer.cjs` if `--source` was explicitly provided by the user on the CLI, or if the default `sourceDir` actually exists on disk.

2. **File:** `scripts/export-explorer.cjs`
   - **Function:** `resolveInputFile()`
   - **Reason:** If an explicit `source` argument is passed but that source directory does not exist on disk and cannot be analyzed, `resolveInputFile()` should log a warning and fall back to using existing analysis report files (`analyze/dependency-report.json`) rather than failing unconditionally.

---

## 9. Focus/Depth Status

```text
Focus/Depth fix status:
NOT TESTABLE until Explorer runtime data generation succeeds.
```

---

## 10. Confidence

```text
ROOT CAUSE CONFIDENCE: HIGH
```
