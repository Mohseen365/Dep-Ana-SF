# Project Overview

The **Salesforce Architecture & Refactoring Explorer** is a high-performance, CLI-driven analysis system and real-time visual exploration workspace for complex enterprise Salesforce metadata, Apex codebases, and custom dependency graphs.

## Core Capabilities

1. **Salesforce Dependency & Topology Analysis:**
   - Static analysis of Apex classes, Apex triggers, Custom Objects, Flows, and Lightning Web Components.
   - Classification into 4 canonical layers: `presentation`, `application`, `domain`, `schema`.
   - Classification into 5 functional roles (`entry_point`, `controller`, `service`, `utility`, `data_access`).
   - Feature discovery, coupling matrix calculation, cycle detection, and unresolved reference tracking.

2. **Interactive Multi-Lens Visualization Workspace:**
   - React 19 + TypeScript + Cytoscape.js web application (`explorer/`).
   - 18 view modes organized across 5 semantic workspace domains:
     - **Portfolio & Health:** Dashboard, Hotspots, Diagnostics, Compare, History.
     - **Topological Structure:** Graph, Subway Map, Constellation, Tree, Treemap.
     - **Feature Relationships:** Feature Matrix, Coupling Heatmap, Dependency River.
     - **Local Neighborhood:** DNA Barcode, Profile, Radar, Four-Direction.
     - **Governance & Quality:** Findings.

3. **Multi-Stage Deterministic Layout Engines:**
   - **Hierarchical Layout (Stages 1–11):** 11-stage pipeline in `explorer/src/lib/layout/` including 2D feature packing, crossing reduction, X-centering, satellite placement, and collision cleanup.
   - **Orbit Layout Engine:** Concentric ring radial layout (`R0` entry points to `R5` schema fallback) with water-filling polar sector allocation in `explorer/src/lib/orbit-layout.ts`.
   - **Async Web Worker Offloading:** Web Worker execution in `explorer/src/lib/workers/layout.worker.ts` with 0.00000px coordinate drift guarantee vs synchronous baseline.

4. **CLI Safety Envelope & Architecture Change Gates:**
   - 31 CLI integration test suites enforcing deterministic quality gates, safety envelopes, duplicate responsibility rules, and change impact simulations (`scripts/test-cli-integration.cjs`).

## Primary Project Directories

- `explorer/` — Web application frontend (React 19, Vite, TypeScript, Cytoscape.js, Vitest).
- `scripts/` — Node.js CLI analysis tools, export adapters, and change gate scripts.
- `explorer/public/projects/` — Published real-world project datasets (e.g. `pbim` dataset with 528 components and 2063 dependencies).
- `context/` — Source-backed current-state context and retrieval maps.

## Current Status

- **CLI Test Suite:** 31/31 suites passing (`npm run test:cli`).
- **Vitest Unit/UI Test Suite:** Passing in `explorer/` (`cd explorer && npx vitest run`).
- **Position Authority Invariant:** Level 1–5 coordinate precedence enforced with 0.00000px drift.
