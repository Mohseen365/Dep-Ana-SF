# Agent C3: Dependency River Final Architecture Report

**Task:** REM-02 / Pure SVG Dependency River Architecture
**Component:** `daSankeyView` (`scratch/salesforce-poc/force-app/main/default/lwc/daSankeyView/`)
**Lead Engineer:** Agent C3 (Workstream 4)
**Governing Authority:** PO-REQ-03 Option A Approved
**Date:** 2026-11-10
**Status:** **APPROVED & CONTRACT COMPLIANT**

---

## 1. Architectural Principles & Technology Foundation

1. **Pure Native SVG Implementation**:
   - Built entirely on standard LWC `<template>` rendering and native SVG elements (`<svg>`, `<g>`, `<path>`, `<rect>`, `<text>`).
   - Zero external third-party dependencies (no D3, no external Sankey plugins).
   - Zero additional Cytoscape canvases; preserves the single Cytoscape canvas architectural invariant across the application shell.

2. **Source of Truth & Graph Invariants**:
   - Driven entirely by canonical graph payloads adhering to `CONTRACT-01`.
   - Renders valid dependency edges only; zero invented or synthesized connections.
   - Computes deterministic cubic Bézier flow ribbons with offset collision avoidance.
   - Handles cycles, feedback loops, self-referential connections, and isolated/disconnected nodes gracefully.

3. **Interaction & State Discipline**:
   - Adheres to `CONTRACT-06` v1.0.0 for cross-component node selection.
   - Preserves `SELECTION != NAVIGATION` invariant: node or ribbon selection displays local inspector metadata and notifies parent containers without modifying route, active view, or filter criteria.
   - Fully accessible with ARIA attributes (`role="button"`, `aria-label`, `tabindex="0"`) and keyboard event listeners (`Enter`, `Space`).
