# Salesforce Architecture & Refactoring Explorer - Complete Architecture, Contract & Adapter Report

## 1. Architectural Audit & Findings

### Executive Summary & Directives
`dependency-analyzer.cjs` is the single source of truth for all dependency analysis, symbol registry, graph resolution, metrics, risk scoring, and cycle detection.

- **No Dependency Duplication**: The Explorer frontend does NOT reimplement dependency parsing or graph resolution.
- **No Metric Recalculation**: Coupling, Fan-In, Fan-Out, Risk Score (`HIGH`, `MEDIUM`, `LOW`), and Circular Dependency groups are pre-computed deterministically by `dependency-analyzer.cjs` and normalized by the Explorer Data Adapter.
- **Zero LLM Dependency**: The Explorer operates purely on deterministic analysis output.
- **Zero Orchestrator Dependency**: Does not depend on `orchestrator.js`.
- **Analyzer Integrity**: Existing `dependency-analyzer.cjs` behavior and CLI options are completely preserved.

### Consumed JSON Artifacts
The Explorer data pipeline consumes:
1. `analyze/dependency-report.json`: Main repository graph, registry, metrics, and cycles.
2. `analyze/architecture-metrics.json`: High-level summary breakdown.
3. `analyze/analysis-snapshot.json`: File state and cache metadata.

---

## 2. Stable Data Contract (`explorer-data.json`)

The view model contract is defined in `explorer-contract.ts`, documented in `EXPLORER_CONTRACT.md`, and exemplified in `explorer-data.json`.

### Schema Root Structure
```json
{
  "schemaVersion": "1.0.0",
  "analyzerVersion": "13.0.0",
  "generatedAt": "2026-09-10T09:25:00.000Z",
  "sourceDirectory": "force-app/main/default",
  "summary": {
    "nodeCount": 3,
    "edgeCount": 3,
    "highRiskCount": 1,
    "mediumRiskCount": 1,
    "lowRiskCount": 1,
    "cycleCount": 1,
    "unresolvedCount": 1,
    "inventory": { ... }
  },
  "nodes": [ ... ],
  "edges": [ ... ],
  "cycles": [ ... ],
  "unresolvedReferences": [ ... ],
  "impactSummaries": { ... }
}
```

---

## 3. Explorer Data Adapter (`scripts/export-explorer.cjs`)

The Explorer Data Adapter is a light, standalone Node.js CLI script that reads existing analyzer JSON outputs and transforms them into `explorer-data.json`.

### Responsibilities:
1. **Source Directory & File Resolution**: Automatically locates `dependency-report.json` or `analysis-snapshot.json` in the specified input directory.
2. **Node ID & Type Normalization**: Formats all IDs to `<Type>:<Name>` (e.g. `ApexClass:AssetDashboardService`).
3. **Behavior & Metric Extraction**: Maps pre-computed metrics (`fanIn`, `fanOut`, `coupling`, `score`), risk categories (`HIGH`, `MEDIUM`, `LOW`), behavior signals (`isTest`, `sharing`, queries, DML, callouts), and refactoring readiness flags.
4. **Edge & Canonical Evidence Normalization**: Preserves code evidence snippets, exact file lines, column numbers, method owners, and canonical target/source resolution.
5. **Cycle Group Normalization**: Formats strongly connected components into cycle groups (`cycle-1`, `cycle-2`).
6. **Pre-computed Impact Reachability**: Calculates direct dependencies, direct dependents, transitive dependencies, transitive dependents, and affected test components per node.
7. **Determinism**: Sorts nodes, edges, cycles, and impact summaries deterministically to produce byte-for-byte identical output for identical inputs.

### CLI Command Usage:
```bash
# Default (reads analyze/ or analyze/dependency-report.json, outputs to analyze/explorer-data.json)
node scripts/export-explorer.cjs

# Custom Input & Output paths
node scripts/export-explorer.cjs analyze analyze/explorer-data.json
node scripts/export-explorer.cjs --input path/to/analyze/dir --output path/to/explorer-data.json
```

---

## 4. Test Verification & Results

Automated test suite location: `scripts/test-export-explorer.cjs`.

### Test Execution Command:
```bash
node scripts/test-export-explorer.cjs
```

### Test Suite Output:
```
Running Explorer Data Adapter Test Suite...
==========================================
Test 1: Node ID and Type normalization
  ✓ Helper unit tests passed

Test 2: End-to-end analyzer integration & adapter export
Test 3: Schema & Version contract validation
Test 4: Summary counts verification
Test 5: Node data structure & readiness flags
Test 6: Impact summaries verification
Test 7: Determinism test (identical inputs generate identical JSON)
  ✓ Determinism verified successfully

ALL ADAPTER TESTS PASSED SUCCESSFULLY!
```

---

## 5. Summary of Files Created/Updated

- `EXPLORER_ARCHITECTURE.md`: Complete architecture audit findings.
- `EXPLORER_CONTRACT.md`: Detailed schema and data contract specification.
- `explorer-contract.ts`: TypeScript interface definitions for `ExplorerDataSchema`.
- `explorer-data.json`: Canonical example dataset instance.
- `scripts/export-explorer.cjs`: Standalone Explorer data adapter script.
- `scripts/test-export-explorer.cjs`: Test suite for the adapter.
- `EXPLORER_REPORT.md`: Consolidated architecture, contract, adapter, and test verification report.
