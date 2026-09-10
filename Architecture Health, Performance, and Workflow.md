# Architecture Health, Performance, and One-Command Workflow

## Overview

Prompt 14 hardens three final MVP operational areas of the Salesforce Architecture & Refactoring Explorer:
1. **Architecture Health**: A deterministic diagnostic heuristic score and concern breakdown.
2. **Performance Optimization**: Fast graph indexing and layout strategies supporting large graphs up to 5,000+ nodes.
3. **One-Command Workflow**: Unified root command `npm run explorer` that checks analysis freshness, exports the contract, and launches the Explorer.

---

## 1. Architecture Health Semantics

### Purpose

Architecture Health answers:
> *"What is the overall architectural health state of this repository, and what are its primary risk drivers?"*

This is an Explorer-specific decision support heuristic, not an industry-standard benchmark.

### Heuristic Formula & Weighting

Base Score = **100**

Penalties applied:
- **High Risk Penalty**: `- (highRiskCount / totalNodes) * 40`
- **Medium Risk Penalty**: `- (mediumRiskCount / totalNodes) * 15`
- **Cycle Penalty**: `- min(30, cycleCount * 10)`
- **Unresolved Reference Penalty**: `- min(20, unresolvedCount * 3)`
- **Hotspot Concentration Penalty**: `- min(15, hotspotCount * 2)`

Final Score = `max(0, round(100 - Total Penalties))`

### Health Levels

- **GOOD**: `Score >= 85` (Pristine or low risk distribution)
- **CAUTION**: `60 <= Score < 85` (Moderate risk, cycles, or unresolved references present)
- **HIGH CONCERN**: `Score < 60` (Severe risk pressure, multiple cycles, or high coupling)

---

## 2. Large-Graph Performance Strategy

### Architectural Principle

```text
Overview → Focus → Neighborhood → Impact
```

The Explorer avoids rendering every detail simultaneously across large graphs.

### Optimizations Implemented

1. **O(1) Map & Set Indexing**: Replaced O(N^2) `Array.find()` calls across `graph-builder.ts`, `search-filter.ts`, and `focus-graph.ts` with `Map<string, ExplorerNode>` and `Set<string>` lookups.
2. **Dynamic Cytoscape Layout Scaling**: Configured `graph-layout.ts` to automatically switch to fast force-directed layout parameters (`numIter: 300`, `initialTemp: 100`) when node counts exceed 200 nodes.
3. **Subgraph Focus Calculation**: Adjacency maps pre-index directional edges for fast reachability traversal during focus mode.

### Performance Benchmarks (`performance.test.ts`)

Tested against synthetic deterministic graph fixtures up to 5,000 nodes:
- **100 Nodes**: Element creation < 10ms, filtering < 5ms
- **500 Nodes**: Element creation < 25ms, filtering < 15ms
- **1,000 Nodes**: Element creation < 50ms, filtering < 25ms
- **5,000 Nodes**: Element creation < 200ms, filtering < 80ms

---

## 3. One-Command Workflow (`npm run explorer`)

### Workflow Sequence

```text
npm run explorer
       ↓
Check analysis freshness (using dependency-analyzer.cjs getAnalysis)
       ↓
Reuse valid analysis OR run fresh analyzer pass
       ↓
Run adapter (export-explorer.cjs)
       ↓
Copy contract to explorer/public/explorer-data.json
       ↓
Start Vite Explorer
```

### Commands Added to Root `package.json`

- `npm run explorer`: Runs standard workflow and starts Vite Explorer dev server.
- `npm run explorer:fresh`: Forces a fresh re-analysis before exporting data.
- `npm run explorer:preview`: Runs workflow and starts Vite preview server (`http://localhost:4173`).
- `npm run explorer:build`: Runs workflow and executes `cd explorer && npm run build`.

### Error Handling

The workflow script (`scripts/run-explorer.cjs`) safely verifies:
- Presence of source directory or pre-existing analysis artifacts.
- Execution success of data adapter.
- Valid contract generation at destination paths.

---

## 4. Verification Commands

```bash
node scripts/test-export-explorer.cjs
cd explorer && npm test
cd explorer && npm run build
npm run explorer:build
```
