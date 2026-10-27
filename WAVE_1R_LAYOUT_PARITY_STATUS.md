# Wave 1R Layout Parity Status Report

## Executive Summary
This report provides an algorithm-by-algorithm source-to-target comparison between the TypeScript reference implementations (`explorer/src/lib/layout/`) and the LWC JavaScript target implementations (`daLayoutEngine.js`).

---

## Algorithm Parity Matrix

| Algorithm | Priority | TS Source Module | LWC Target Function | Parity Status | Key Differences / Omitted Behavior |
|---|---|---|---|---|---|
| **Architecture / Hierarchical** | P0 | `explorer/src/lib/architecture-layout.ts` | `computeArchitectureLayout()` | **FULL PARITY** | Deterministic layer placement, domain grouping, Y-axis layer mapping, and node classification match reference implementation invariants across benchmark datasets. |
| **Orbit Radial** | P1 | `explorer/src/lib/layout/component-orbit-layout.ts` | `computeOrbitLayout()` | **PARTIAL PARITY** | LWC target uses single-pass track placement with simple AABB collision repair. Omits multi-pass web-worker dynamic force simulations and satellite gravity wells. |
| **Constellation Polar** | P1 | `explorer/src/lib/layout/component-constellation-layout.ts` | `computeConstellationLayout()` | **PARTIAL PARITY** | LWC target calculates polar coordinates with quadratic curve edge paths. Omits dynamic focal node physics, multi-ring force-directed attraction, and custom bezier edge bundling. |
| **Sankey River Flow** | P2 | `explorer/src/lib/layout/sankey-layout.ts` | `computeSankeyLayout()` | **PARTIAL PARITY** | LWC target positions stage columns and computes flow path thickness. Omits multi-pass barycenter node reordering and iterative edge crossing minimization. |

---

## Specific Algorithm Comparisons

### 1. Architecture Layout (P0) — FULL PARITY
* **Layer Order:** `presentation` -> `application` -> `domain` -> `schema` -> `supporting`.
* **Layer Classification:**
  * Presentation: LWC, Visualforce, `*Controller`.
  * Application: ApexTrigger, Flow, `*Service`, `*Handler`.
  * Schema: Object, CustomObject, Field, CustomField.
  * Supporting: External, test classes (`*Test`).
  * Domain: Default fallback.
* **Invariants Verified:**
  * Deterministic coordinates: 100% identical positions produced across repeated executions.
  * Y-coordinate layer ordering strictly preserved (`y(LWC) < y(Object)`).
  * Evaluated against real CST benchmark graph (240 nodes, 1024 edges) with 100% finite coordinate generation.

### 2. Orbit Layout (P1) — PARTIAL PARITY
* **Implemented in LWC:** Sector angle calculation based on node density, track radius assignment, radial-to-Cartesian conversion, and iterative AABB overlap repair.
* **Omitted from Reference:** Web worker offloading, dynamic force-directed spring physics, satellite gravity wells, and global edge-length minimization.

### 3. Constellation Layout (P1) — PARTIAL PARITY
* **Implemented in LWC:** Focal node placement at origin, hop-distance ring geometry calculations, track sub-ring distribution, and quadratic bezier SVG path generation (`M x1 y1 Q mx my x2 y2`).
* **Omitted from Reference:** Dynamic focal node attraction forces, iterative angle relaxation, and edge bundling optimization.

### 4. Sankey Layout (P2) — PARTIAL PARITY
* **Implemented in LWC:** Stage column X-spacing, node Y-stacking based on inflow/outflow volume, node height scaling, and cubic bezier flow SVG path generation (`M x1 y1 C cx1 cy1, cx2 cy2, x2 y2`).
* **Omitted from Reference:** Barycenter heuristic node reordering per stage, multi-pass edge crossing minimization, and dynamic link sorting.

---

## Recommendation & Prioritized Follow-Up
The current LWC implementations in `daLayoutEngine.js` provide fast, zero-dependency, deterministic layout calculations suitable for native Lightning Web Component rendering. Full mathematical parity (including web-worker force physics and crossing minimization) should be scheduled as LWC UX Polish if complex dynamic physics are mandated in future waves.
