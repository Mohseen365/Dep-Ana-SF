# Wave 1 Implementation Report — Salesforce Migration

## Executive Summary
Wave 1 of the Dependency Analyzer Salesforce migration has been successfully implemented and verified offline. This wave focused on establishing the graph payload contract, creating a reusable pure JavaScript LWC layout engine (`daLayoutEngine`), hardening existing Apex controllers and ingestion services, defining the external Node.js analysis handoff boundary, and validating behavior against existing benchmark fixtures.

## Branch and Commit Baseline
* **Working Branch:** `jules-747897630596734227-c5970acc`
* **Commit Baseline:** `35100decdfe5b6ea50c28bc161b01c5618aac89d`
* **Wave Decision:** `COMPLETE`

## Implementation Summary and Source File Changes

### 1. Graph Payload Contract & Loader Hardening
* **`scratch/salesforce-poc/force-app/main/default/lwc/daGraphPayloadLoader/daGraphPayloadLoader.js`**:
  * Added `MAX_CHUNK_SIZE` (131,072 chars / 128 KB) matching Salesforce `LongTextArea` limit.
  * Added `MAX_TOTAL_PAYLOAD_SIZE` (10 MB / 10,485,760 chars) application-level limit.
  * Hardened `reassembleChunks` against null and non-string elements.
  * Enhanced `validatePayloadIntegrity` to check structure, JSON parseability, and total payload length.
  * Exported `validateChunkLimits` and `validatePayloadSize`.

### 2. Reusable LWC Layout Engine (`daLayoutEngine`)
* **`scratch/salesforce-poc/force-app/main/default/lwc/daLayoutEngine/daLayoutEngine.js`** and **`daLayoutEngine.js-meta.xml`**:
  * Created LWC component providing pure JavaScript, zero-dependency layout calculation functions.
  * Implemented **P0 Hierarchical Architecture Layout** (`computeArchitectureLayout`) with deterministic node layer classification and layer Y-spacing.
  * Implemented **P1 Orbit Radial Layout** (`computeOrbitLayout`) with dynamic water-filling sector allocation, track capacity limits, and multi-pass collision repair.
  * Implemented **P1 Constellation Polar Layout** (`computeConstellationLayout`) with focal node placement, adaptive ring track radii, and curved Bézier edge paths.
  * Implemented **P2 Sankey Flow Layout** (`computeSankeyLayout`) with stage column placement, flow volume node height calculation, and cubic Bézier paths.
* **`scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.js`**:
  * Integrated `daLayoutEngine` with Cytoscape viewer using preset positions.
  * Preserved the `SELECTION ≠ NAVIGATION` invariant: node tap/click updates selection state and dispatches local `nodeselect` events without triggering URL navigation or re-render.

### 3. Apex Retrieval and Ingestion Service Hardening
* **`scratch/salesforce-poc/force-app/main/default/classes/services/DAGraphIngestionService.cls`**:
  * Maintained existing canonical class name `DAGraphIngestionService.cls` (reused, avoided speculative duplicates).
  * Added `WITH USER_MODE` query checks for existing project keys and analysis run authorization.
  * Enforced `insert as user` DML operations.
  * Added chunk length boundary checks against `MAX_CHUNK_SIZE` (131,072 characters).

### 4. Expanded Offline Test Harness
* **`scratch/salesforce-poc/tests/run-poc-tests.cjs`**:
  * Added new test categories for chunk limits, payload size bounds, layout engine parity (PBIM, BQC, CST fixtures), and `SELECTION ≠ NAVIGATION` invariant checks.
  * Result: All 28 offline assertions passed (up from 21).

## Source-to-Target Symbol & Path Mapping

| Source File / Symbol | Target Implementation File / Symbol | Parity & Test Status |
|---|---|---|
| `explorer/src/types/explorer.ts` | `DAGraphDTO.cls` / `GraphPayloadDTO.cls` | Contract Aligned & Tested |
| `explorer/src/lib/architecture-layout.ts` | `daLayoutEngine.js` (`computeArchitectureLayout`) | P0 Implemented & Verified |
| `explorer/src/lib/orbit-layout.ts` | `daLayoutEngine.js` (`computeOrbitLayout`) | P1 Implemented & Verified |
| `explorer/src/lib/layout/constellation-layout.ts` | `daLayoutEngine.js` (`computeConstellationLayout`) | P1 Implemented & Verified |
| `explorer/src/lib/layout/sankey-layout.ts` | `daLayoutEngine.js` (`computeSankeyLayout`) | P2 Implemented & Verified |
| `explorer/src/hooks/useExplorerData.ts` | `daGraphViewer.js` (`fetchGraphData`) | Integrated & Verified |
