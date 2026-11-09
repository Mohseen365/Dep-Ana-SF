# Wave 1 Benchmark Baseline Harness

This directory contains the standalone, reusable benchmark harness developed by the Test Baseline Agent (B2) for Wave 1 / Wave 2 before-and-after performance benchmarking.

## Files
- `run-benchmarks.cjs`: Reusable benchmark execution script. Measures chunking/reassembly, layout calculation, cancellation, dependency matrix build, treemap layout, Sankey layout math, snapshot diffing, and Cytoscape lifecycle simulation.
- `benchmark-results.json`: Machine-readable output containing environment specifications, run times (min, median, max across 7 runs), and measurement labels (`MEASURED`, `MOCKED`, `NOT APPLICABLE`).

## How to Run
From the repository root:
```bash
node wave1/B2/bench/run-benchmarks.cjs
```

The script will re-evaluate all benchmark fixtures (`PBIM`, `CST`, `BQC`, and synthetic 10 MB boundary) and update `benchmark-results.json`.
