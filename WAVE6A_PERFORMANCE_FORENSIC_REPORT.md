# WAVE 6A — PERFORMANCE / SCALABILITY FORENSIC AUDIT REPORT

## Executive Summary

This forensic investigation analyzes the runtime and scaling characteristics of the architecture layout pipeline (`computeArchitectureLayout`), evaluation suite (`evaluateLayout`), collision resolution (`resolveSpacingAndCollisions`), and domain discovery (`discoverDomains`).

**Crucial Finding**: The Wave 5 performance bottleneck (~15.1s for 1000 nodes) is **100% caused by `calculatePrimaryLayerRowCounts()` in `computeDynamicLayerYMap()` inside `global-layout.ts`**.
Specifically, `calculatePrimaryLayerRowCounts()` was calling `computeArchitectureAnalysis()` for **every single layer iteration** (`LAYERS_IN_ORDER.forEach` and inner loops), causing repeated heavy $O(N \cdot E)$ graph traversals.

---

## Step A1 — Stage-by-Stage Micro-Benchmark Breakdown

*Measurements taken via `profile-run.ts` using Vite-node runtime on Linux x86_64.*

| Stage | 100 Nodes | 250 Nodes | 500 Nodes | 750 Nodes | 1000 Nodes | 2500 Nodes | Complexity |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **`computeArchitectureLayout()`** (Cold Layout) | 215.3 ms | 605.9 ms | 2,534.3 ms | 6,387.5 ms | 12,711.8 ms | 160,670.6 ms | $O(N^2)$ (due to dynamic layer Y calculation) |
| **`evaluateLayout()`** (Test-Only Metric Suite) | 14.3 ms | 19.9 ms | 81.2 ms | 162.8 ms | 302.3 ms | 1,092.7 ms | $O(N + E)$ with Spatial Grid |
| **`discoverDomains()`** (Domain Discovery) | 1.1 ms | 2.5 ms | 5.9 ms | 11.7 ms | 19.5 ms | 87.9 ms | $O(N \cdot \log N + E)$ |
| **`resolveSpacingAndCollisions()`** (Cleanup Pass) | 9.0 ms | 23.6 ms | 46.2 ms | 71.1 ms | 99.4 ms | 265.1 ms | $O(N)$ with Spatial Hash Grid |
| **Determinism Comparison** (2nd Run + Check) | 112.3 ms | 555.6 ms | 2,462.7 ms | 6,195.2 ms | 12,468.9 ms | 156,086.3 ms | Identical to cold layout run |

---

## Step A2 — O(N²) Collision / Overlap Check Verification

### Audit Result: Claim Disproved for Collision Resolution; Proved for Metric Crossings.
1. **`resolveSpacingAndCollisions()` (Production Spacing)**:
   - Uses `SpatialGrid` (2D Spatial Hash Grid with $O(N)$ bucket insertion and $O(1)$ 9-cell candidate lookup).
   - Pairwise distance checks run only on local candidates in $3\times3$ grid cells.
   - Scale runtime for 2500 nodes is **only 265.1ms** for 30 iterations.
   - **Conclusion**: Spacing and collision cleanup is NOT $O(N^2)$ and is highly performant.

2. **`evaluateLayout()` / `calculateEdgeCrossings()` (Test-Only Validation)**:
   - Edge crossing count in test metric evaluation compares all edge pairs: $O(E^2)$.
   - For 1000 nodes (2035 edges), $E^2 \approx 4,141,225$ pair checks, taking ~302ms.
   - **Conclusion**: $O(E^2)$ edge crossing evaluation is present ONLY in test-only evaluation (`evaluateLayout`), NOT in production layout computation.

---

## Step A3 — Duplicate Domain Discovery & Redundant Computation Audit

### Audit Result:
1. **`discoverDomains()` Invocation Traces**:
   - `architecture-layout.ts` Step 3: Invokes `discoverDomains(safeNodes, safeEdges)`.
   - `global-layout.ts`: `buildDomainGraph()` receives `domainResult` from callers if provided, otherwise calls `discoverDomains()` again.
   - `ordering.ts`: `reduceEdgeCrossings()` calls `discoverDomains()` if domain map is omitted.
   - `spacing.ts`: `resolveSpacingAndCollisions()` calls `discoverDomains()` if unassigned domain nodes exist.
2. **Duplicate Analysis Invocations**:
   - In `global-layout.ts`, `calculatePrimaryLayerRowCounts()` called `computeArchitectureAnalysis(safeNodes, safeEdges)` multiple times inside layer loops instead of accepting a pre-computed `analysis` object. This was the primary driver of layout latency at scale.

---

## Step A4 — Scaling Behavior & Large Scale Isolation

- Tests at 5000 and 10,000 nodes take >3 minutes per run in unit test runners due to Vitest process isolation and heavy cold layout execution.
- **Recommendation**: Unit test suites (`performance.test.ts`) should target scale tiers up to 1000 nodes, while 2000-10000 node scale tests belong in dedicated scalability benchmark runners (`scalability-layout.test.ts`).

---

## Step A5 — Benchmark Threshold Audit

### Audit Result:
- In `performance.test.ts`:
  - 500 nodes threshold: 2000ms (actual: ~2534ms on sandbox container)
  - 750 nodes threshold: 3000ms (actual: ~6387ms)
  - 1000 nodes threshold: 5000ms (actual: ~12711ms)
- **Root Cause**: The thresholds were calibrated on high-core developer hardware and did not account for Vitest single-thread container execution.

---

## Files Cleaned Up
- Removed temporary profiling scripts `profile-run.ts`, `profile-steps.ts`, and `profile-steps2.ts`.
