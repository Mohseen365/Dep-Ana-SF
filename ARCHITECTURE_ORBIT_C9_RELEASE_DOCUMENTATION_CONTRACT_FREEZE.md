# ARCHITECTURE ORBIT — C9 RELEASE DOCUMENTATION + CONTRACT FREEZE

**Document Status:** FROZEN AUTHORITATIVE RELEASE CONTRACT (RECONCILED VIA C9R, C9R2 & C9R3)
**Phase:** C9 Release Documentation & Contract Freeze
**Preceding Phases Closed:** C4 (Semantic + Visual Geometry Truth), C5 (Real Browser Visual UX Acceptance), C6 / C6R / C6R2 (Scale Stress + Benchmark Provenance Closure), C7 / C7R (Cross-Layout Contract + Regression Closure), C8 / C8R (Production Hardening + Evidence Reconciliation)
**Evidence Reconciliation Phases:** C9R (`ARCHITECTURE_ORBIT_C9R_FINAL_RELEASE_DOCUMENTATION_EVIDENCE_RECONCILIATION.md`), C9R2 (`ARCHITECTURE_ORBIT_C9R2_FINAL_METRIC_AND_CONTRACT_INTEGRITY_CLOSURE.md`), C9R3 (`ARCHITECTURE_ORBIT_C9R3_FINAL_TWO_ISSUE_CONTRACT_CLOSURE.md`)
**Next Phase:** C10 CLEAN-ROOM FINAL ORBIT ACCEPTANCE
**Final Release Verdict:** `C9 RELEASE DOCUMENTATION & CONTRACT FREEZE CLOSED`

---

## 1. CANONICAL ORBIT GRAMMAR

Architecture Orbit encodes architectural graph relationships into a radial concentric geometry. The exact semantic visual grammar is frozen as follows:

* **Radius ($R$) = Architectural Responsibility / Layer**: Concentric distance from the central origin represents architectural tiering (from presentation entry points at $R_0$ to supporting test/satellite infrastructure at $R_5$).
* **Angle ($\theta$) = Feature / Domain Affinity**: Angular positioning groups components belonging to the same functional feature or business domain within dedicated radial sectors.
* **Edge = Actual Dependency**: Graph edges represent direct structural dependencies between components (e.g., imports, field references, controller calls).
* **Guides = Interpretation Aids**: Ring circles, sector spokes, sector labels, and core indicators are non-graph visual overlays provided strictly for cognitive framing.
* **Center = Virtual Architectural Core**: Origin $(0,0)$ represents the non-selectable virtual nucleus around which the architecture orbits.

---

## 2. THE SIX-RING SEMANTIC CONTRACT

Orbit projects every component into exactly one of six concentric architectural rings ($R_0$ to $R_5$):

| Ring | Architectural Responsibility | Primary Component Types / Roles |
| :---: | :--- | :--- |
| **R0** | Entry / Presentation Layer | LWC, Visualforce, ApexTrigger, Flow, `presentation` layer |
| **R1** | Application Layer | Application Controllers, Handlers, Orchestrators, `application` layer |
| **R2** | Domain / Service Layer | Business Services, Domain Models, DTOs, `domain` layer |
| **R3** | High-Level Schema Objects | CustomObject, Object, `schema` layer (objects) |
| **R4** | Schema Detail & External | CustomField, Field, External integrations, `schema` layer (fields) |
| **R5** | Supporting / Tests / Shared | Apex Tests (`FeatureTest`), Shared Infrastructure, Satellites |

### Precedence Classifier Rule Sequence
The exact precedence evaluated by `computeOrbitRingIndex(node, layer, role)` in `explorer/src/lib/layout/orbit-semantics.ts` is frozen as:

1. `isTestNode(node) || role === 'SharedInfrastructure' || role === 'FeatureTest'` $\rightarrow$ **Ring 5**
2. `node.type === 'Field' || node.type === 'CustomField' || node.type === 'External'` $\rightarrow$ **Ring 4**
3. `node.type === 'Object' || node.type === 'CustomObject'` $\rightarrow$ **Ring 3**
4. `node.type === 'LWC' || node.type === 'Visualforce' || node.type === 'ApexTrigger' || node.type === 'Flow' || layer === 'presentation'` $\rightarrow$ **Ring 0**
5. `layer === 'application'` $\rightarrow$ **Ring 1**
6. `layer === 'domain'` $\rightarrow$ **Ring 2**
7. `layer === 'schema'` (fallback when type is not Object/Field) $\rightarrow$ **Ring 3**
8. Deterministic Fallback $\rightarrow$ **Ring 1**

---

## 3. SECTOR CONTRACT

* Every node is assigned to a sector identity: `orbitSectorId = primaryFeatureId`.
* Nodes not belonging to a named feature are assigned to `orbitSectorId = 'Unassigned'`.
* Domain fallback maps shared components across domains to `primaryDomainId = 'Shared'`.
* Sector angular share is calculated via proportional water-filling allocation conserving $2\pi$ radians with a $5\%$ global angular safety margin.

---

## 4. GEOMETRY CONSTANTS

The exact geometric parameters implemented in `explorer/src/lib/orbit-layout.ts` are frozen:

* `innerRadius = 600` px (Base radius for Ring 0 nucleus perimeter)
* `ringSpacing = 4000` px (Radial distance step between architectural rings)
* `trackSpacing = 200` px (Radial offset between expansion tracks within a ring)
* `EVEN_SECTOR_OFFSET = 2000` px (`(secIdx % 2) * 2000`, staggered radial offset between adjacent sectors to prevent cross-sector AABB overlaps)

### Base Radius Equation
For a node in ring $r \in \{0,1,2,3,4,5\}$, sector index $\text{secIdx}$, and track $k \ge 0$:
$$R_{\text{base}}(r, \text{secIdx}, k) = 600 + r \times 4000 + (\text{secIdx} \bmod 2) \times 2000 + k \times 200$$

---

## 5. RADIAL EXTENT DISTINCTIONS

As proven in C8R, C9R2, and C9R3, four distinct radial concept boundaries exist in the codebase and must **never** be conflated:

1. **Sector Text Label Anchor Radius**: `2,400` px (`labelR = 2400` in `FeatureOverlayCanvas.tsx`, SVG text label rendering anchor in inner hub).
2. **Sector Guide Spoke Line Extent**: `2,600` px (`guideR = 2600` in `FeatureOverlayCanvas.tsx`, visual spoke line extent from $R_0$ to $R_1$).
3. **Ring 5 Base Layout Guide Radius**: `20,600` px ($R_{\text{base}}(5) = 600 + 5 \times 4000 = 20,600$ px, base geometric radius of Ring 5).
4. **Maximum Outer Node Radial Position**: `24,200` px (Outer polar coordinate reached by track expansion $k=18$ on dense Ring 5 nodes in PBIM).

---

## 6. COLLISION CONTRACT

* **Visual Node Box**: $120 \times 60$ px (`width = 120`, `height = 60`).
* **Effective Collision Clearance Box**: $160 \times 100$ px (`clearanceX = 160`, `clearanceY = 100`, providing 20px padding on all sides).
* **Collision Check**: Pairwise Exact Axis-Aligned Bounding Box (AABB) overlap predicate:
$$\text{Overlap}(A, B) \iff |x_A - x_B| < \frac{W_A + W_B}{2} \land |y_A - y_B| < \frac{H_A + H_B}{2}$$
* **PBIM Empirical Zero-Collision Result**: $0\text{ collisions}$ across all $139,128\text{ pair checks}$ ($100\%$ zero collision rate).

---

## 7. REPAIR TERMINOLOGY

* `maxRepairPasses = 20` (Safety bounds limit on outer repair sweep iterations).
* **Pass vs Operation Distinction (Reconciled in C6R2, C9R2 & C9R3)**: A single outer repair *pass* scans all pairs once and executes multiple atomic repair *operations* (e.g., track push $k \leftarrow k+1$, angular nudge $\theta \leftarrow \theta + \Delta\theta$).
* The 23 repair operations required for PBIM occur entirely within **1 outer repair pass** (`actualPasses = 1`).

---

## 8. DETERMINISM CONTRACT

* **Array Order Invariance**: Shuffling input node array 10 times (`Math.random()` seed permutations) produces bit-for-bit identical $(x,y)$ coordinates for every node ($\Delta x = 0.00000$ px, $\Delta y = 0.00000$ px).
* **Layout Reset Stability**: Re-triggering Orbit layout on an active graph produces identical node coordinates.
* **Mode-Switching Stability**: Switching away from Orbit to Hybrid/Hierarchical/Constellation and returning to Orbit restores identical coordinates.

---

## 9. INTERACTION CONTRACT

* **Selection State**: Clicking a node selects it globally across all view modes (`selectedNodeId`).
* **Hover State**: Hovering a node highlights its immediate graph dependencies and dims unrelated nodes and edges.
* **Visibility / Filtering State**: Applying layer, type, or domain filters updates node visibility without corrupting background Orbit geometry calculation for visible nodes.
* **Pan / Zoom / Fit View**: Cytoscape viewport controls operate in Orbit mode. "Fit View" computes bounding box including outer nodes up to $R=24,200$ px.

---

## 10. WORKSPACE PERSISTENCE CONTRACT

Workspace persistence concerns state serialized across browser page reloads (`F5`) or URL copy-paste hydration:

* **Active Mode Hydration**: Active layout mode (`architectureMode = 'orbit'`) is serialized in workspace state (`saveProjectState()`) and hydrated via URL query parameter `?mode=orbit`.
* **Dataset Selection**: Active project dataset (`project = 'pbim'`) is serialized in URL parameter `?project=pbim`.
* **Selection State**: Selected component (`selectedNodeId`) is serialized and restored.
* **Active Filters**: Visible layer/type filters (`visibleNodeTypes`) are serialized and restored.
* **Explicit Dragged Position Overrides**: User-dragged node positions stored in `existingPositions` take precedence for dragged nodes without corrupting algorithmic placement of un-dragged nodes.
* **Position Authority Isolation**: Orbit recomputes its geometry on demand and does NOT overwrite global persistent positions for other view modes.

---

## 11. CROSS-LAYOUT STATE PRESERVATION & ISOLATION CONTRACT

Cross-layout state preservation concerns transient in-memory workspace state surviving mode transitions (e.g., switching `hierarchical` $\rightarrow$ `orbit` $\rightarrow$ `hybrid`) within an active browser session:

* **State Preservation Across Mode Switching**:
  * `selectedNodeId`: Preserved bit-for-bit across layout mode switches (`PROVEN`).
  * `active filters` (`visibleNodeTypes`): Preserved across layout mode switches (`PROVEN`).
  * `search query`: Preserved across layout mode switches in memory (`PROVEN`).
  * `inspection drawer`: Preserved across layout mode switches in memory (`PROVEN`).
  * `dataset selection`: Preserved across layout mode switches (`PROVEN`).
* **Cross-Layout Ownership Matrix**:

| Architectural Surface / Entity | Owned by Architecture Orbit | Owned by Global Subsystems / External |
| :--- | :---: | :---: |
| Node Coordinates $(x, y)$ in Orbit Mode | **YES** | NO |
| Polar Geometry $(r, \theta, \text{track}, \text{ring})$ | **YES** | NO |
| Ring & Sector Guide Overlays | **YES** | NO |
| Orbit Layout Metadata | **YES** | NO |
| Graph Existence & Node/Edge Identity | NO | **Global Graph Model** (`ExplorerNode`, `ExplorerEdge`) |
| Global Selection, Hover, Visibility State | NO | **Global Workspace State** (`projectState.ts`) |
| Position Authority & Persistence | NO | **Position Authority** (`projectState.ts`) |

Switching between Orbit and any other layout mode preserves $100\%$ of global graph selection, active filters, search queries, inspection drawer state, and project dataset selections without side effects or coordinate leakage.

---

## 12. OVERLAY CONTRACT

Orbit renders non-interactive SVG/Canvas visual guides:
1. **Concentric Ring Circles**: Dotted concentric circles at base radii $R_0 = 600, R_1 = 4600, R_2 = 8600, R_3 = 12600, R_4 = 16600, R_5 = 20600$ px.
2. **Sector Guide Spokes**: Radial lines extending from $R_0 = 600$ px to $R_{\text{guide}} = 2600$ px.
3. **Sector Text Labels**: Archival text labels rendered at $R_{\text{label}} = 2400$ px aligned with sector bisectors.
4. **Virtual Core Indicator**: Core visual glyph rendered at $(0,0)$.

Guides are non-selectable framing elements and must never be converted into synthetic graph edges.

---

## 13. METRIC DEFINITIONS & SCOPES

To eliminate conflation across test environments and functions, benchmark measurements are partitioned into three explicit, non-overlapping scopes:

* **Scope A: Pure Orbit Geometry Computation (`computeOrbitLayout`)**: Measures pure layout math function execution time in `orbit-layout.ts` under Node/Vitest process.
* **Scope B: Production Layout Pipeline (`computeArchitectureLayoutWithMetadata`)**: Measures complete pipeline execution including domain/feature discovery, semantic projection, pure layout execution, and guide formatting in `architecture-layout.ts` under Node/Vitest/JSDOM harness.
* **Scope C: Real Browser Rendering / Interaction**: Measures end-to-end user interaction to painted frame time in Chromium browser including Cytoscape batch DOM position updates and GPU canvas composite.

### Consolidated Metric Reference Matrix

| Metric Name | Measurement Scope | Exec Environment | $N$ | $E$ | Measured Time | Source Reference |
| :--- | :--- | :--- | ---: | ---: | ---: | :--- |
| **`T_geo_pbim`** | Scope A (Pure Orbit Geometry) | Node.js / Vitest | 528 | 2,063 | **15.24 ms** | C4 Sec. 11, C6 Sec. 4 |
| **`T_pipe_pbim`** | Scope B (Production Pipeline) | Node.js / Vitest | 528 | 2,063 | **35.30 ms** | C8 Sec. 7, C8R Sec. 5 |
| **`T_browser_pbim`**| Scope C (Browser Render) | Chromium Playwright | 528 | 2,063 | **9.37 ms** (Layout) / **< 250 ms** (Total UI) | C5 Sec. 4, C6R Sec. 5 |
| **`T_geo_1k`** | Scope A (Pure Orbit Geometry) | Node.js / Vitest | 1,000 | 2,000 | **43.28 ms** | C6R Sec. 5 |
| **`T_pipe_1k`** | Scope B (Production Pipeline) | Node.js / Vitest | 1,000 | 2,000 | **124.70 ms** | C8 Sec. 7 |
| **`T_geo_2k`** | Scope A (Pure Orbit Geometry) | Node.js / Vitest | 2,000 | 4,000 | **181.01 ms** | C6R Sec. 5 |
| **`T_pipe_2k`** | Scope B (Production Pipeline) | Node.js / Vitest | 2,000 | 4,000 | **496.10 ms** | C8 Sec. 7 |
| **`T_geo_5k`** | Scope A (Pure Orbit Geometry) | Node.js / Vitest | 5,000 | 10,000 | **1.24 s – 1.43 s** | C6R Sec. 5, C6R2 Sec. 12 |
| **`T_pipe_5k`** | Scope B (Production Pipeline) | Node.js / Vitest | 5,000 | 10,000 | **3.86 s** | C8 Sec. 7 |
| **`T_geo_20k`** | Scope A (Pure Orbit Geometry) | Node.js / Vitest | 20,000 | 39,939 | **35.83 s** | C6R Sec. 5, C6R2 Gate 1 |

---

## 14. OPERATIONAL SCALE ENVELOPE

Scope B production pipeline evidence ends at the measured 5,000 node point ($3.86\text{ s}$). Scope B 20k runtime is explicitly unmeasured and not claimed.

| Scale Tier | Node Count ($N$) | Scope A: Pure Geometry (`computeOrbitLayout`) | Scope B: Full Pipeline (`computeArchitectureLayoutWithMetadata`) | Scope C: Real Browser Execution | Operating Envelope Classification |
| :---: | :---: | :---: | :---: | :---: | :--- |
| **Tier 1** | $N \le 1,000$ | $\le 43.28\text{ ms}$ (at $N=1,000$) | $\le 124.70\text{ ms}$ (at $N=1,000$) | **PROVEN** (PBIM $528\text{N}$: $<250\text{ms}$ total UI) | **Comfortable / Interactive Target** |
| **Tier 2** | $1,000 < N \le 2,000$ | $43.28\text{ ms} - 181.01\text{ ms}$ | $124.70\text{ ms} - 496.10\text{ ms}$ | `Not Claimed` | **Degraded (Noticeable UI Pause)** |
| **Tier 3** | $2,000 < N \le 5,000$ | $1.43\text{ s}$ (at $N=5,000$) | $3.86\text{ s}$ (at $N=5,000$) | `Not Claimed` | **Impractical for Synchronous UI Thread** |
| **Tier 4** | $5,000 < N \le 20,000$ | $35.83\text{ s}$ (at $N=20,000$) | **Not Measured / Not Claimed** | `Not Claimed` | **Node-Side Stress Limit Only (Scope A)** |
| **Tier 5** | $N > 20,000$ | `Not Tested` | `Not Tested` | `Not Claimed` | **Not Tested / Not Claimed** |

---

## 15. BROWSER / NODE / JSDOM EVIDENCE BOUNDARY

### 15.1 Real Browser / Chromium Proven (C5, C6R Evidence)
* Real Salesforce PBIM Dataset ($N=528, E=2,063$): $100\%$ zero-collision rendering, 65 sectors, 6 concentric rings.
* Real Salesforce CST Dataset ($N=240, E=1,024$): $100\%$ zero-collision rendering, 26 sectors.
* Cytoscape viewport pan, zoom, fit-view, and node drag interactions.
* Mode switching across Orbit, Hybrid, Hierarchical, and Constellation across tested cycles.
* Canvas overlay guide rendering, text label positioning, and high-DPI scaling.
* Keyboard navigation, ARIA accessibility trees, and focus indicators.
* Viewport responsiveness across tested resolutions ($1024 \times 768 \dots 2560 \times 1440$).

### 15.2 Node / Vitest Proven (C4, C6, C6R, C6R2, C8R Evidence)
* Synthetic scale stress testing ($N=1,000, 2,000, 5,000, 10,000, 20,000$).
* Numerical boundary and pathological edge cases ($N=0, N=1, N=2$, all nodes in 1 sector, all nodes in 1 ring).
* Input array permutation shuffle determinism testing (10 randomized orderings).
* Mathematical numerical safety (division by zero, angle normalization around $0 / 2\pi$).
* Deep source object immutability verification (`JSON.stringify` snapshot comparisons).

### 15.3 JSDOM Proven (C7, C7R, C8 Evidence)
* Rapid 30-cycle mode switching under JSDOM environment.
* Workspace state persistence and query parameter `?mode=orbit` hydration.
* Pipeline execution across BQC ($274\text{N}/603\text{E}$) and Food-App ($1\text{N}/0\text{E}$).

### 15.4 Not Claimed
* Synchronous real-browser rendering for graphs with $N \ge 1,000$ nodes.
* Mobile viewport sizes ($320 \times 568$).
* Web Worker asynchronous offloading.

---

## 16. ACCESSIBILITY CONTRACT

* **Keyboard Navigation**: Focus traversed using DOM tab order within Cytoscape canvas focus trap (`PROVEN`).
* **Focus & Selection Highlight**: Active focused node renders high-contrast outline and highlights connected dependency paths in cyan (`#38bdf8`) (`PROVEN`).
* **ARIA Structure**: Accessibility tree mirrors active graph nodes with `role="button"` and `aria-label` containing component name, type, ring layer, and sector (`PROVEN`).
* **Non-Interactive Guides**: SVG/Canvas overlay guides carry `aria-hidden="true"` and `pointer-events: none` (`PROVEN`).
* **Virtual Core**: Origin visual indicator carries `aria-hidden="true"` (`PROVEN`).

---

## 17. ACCEPTED OBSERVATIONS

The following five items represent documented operational and geometric characteristics carried forward from previous closed phases. They are accepted observations and do **not** block release:

1. **Large Radial Span**: Outer Ring 5 nodes reach radial coordinates up to $R=24,200\text{ px}$ on PBIM, requiring initial viewport "Fit View" scaling to zoom out significantly.
2. **Unassigned Sector Dominance**: Datasets lacking explicit feature annotations assign unmapped nodes to `Unassigned` sector (318 of 528 nodes on PBIM), expanding multi-track radial depth ($k=0\dots18$).
3. **Sector Guide Spoke Extent Ending at $R=2600$**: Visual sector spoke lines extend from $R=600\text{ px}$ to $R=2600\text{ px}$ framing the inner hub without cluttering outer nodes ($R=24,200\text{ px}$).
4. **$\mathcal{O}(N^2)$ Pairwise Collision Repair**: Pairwise AABB collision detection and repair scales quadratically with node count ($N(N-1)/2$), dominating layout compute time for $N > 1,000$.
5. **Synchronous Main-Thread Execution**: Orbit layout calculation executes synchronously on the main thread, causing noticeable UI pauses for $N > 1,000$ nodes.

---

## 18. IMPLEMENTATION SOURCE MAP

| File Path | Subsystem Responsibility | Ownership Boundary | Exported Function / Entity | Contract Section | Test File Reference | Evidence Report |
| :--- | :--- | :--- | :--- | :---: | :--- | :--- |
| `explorer/src/lib/layout/orbit-semantics.ts` | Orbit Semantic Projection | Orbit Semantics | `projectOrbitSemantics`, `computeOrbitRingIndex` | Sec. 2, 3 | `orbit-semantics.test.ts` | C4, C8R |
| `explorer/src/lib/orbit-layout.ts` | Radial Polar Geometry & AABB Collision Repair | Orbit Layout | `computeOrbitLayout`, `checkAABBOverlap`, `normalizeAngle` | Sec. 4, 6, 7 | `orbit-layout.test.ts` | C4, C6R2, C8R |
| `explorer/src/lib/architecture-layout.ts` | Master Layout Pipeline Orchestration | Layout Orchestration | `computeArchitectureLayoutWithMetadata` | Sec. 10, 11 | `orbit-c8-production-hardening.test.tsx` | C7R, C8 |
| `explorer/src/components/GraphView.tsx` | Cytoscape Canvas & Overlay Renderer | Viewport UI | `GraphView` | Sec. 9, 12, 16 | `orbit-c5-browser.test.tsx` | C5, C8 |
| `explorer/src/lib/projectState.ts` | Global Workspace State & Mode Persistence | Workspace State | `projectState`, `saveProjectState` | Sec. 10, 11 | `orbit-c7-cross-layout.test.tsx` | C7, C7R |

---

## 19. VALIDATION / EVIDENCE MAP

| Phase / Contract | Test Spec / Report Reference | Fixture Used | Environment | Evidence Type | Status | Operational Scope |
| :---: | :--- | :--- | :---: | :---: | :---: | :--- |
| **C4** | `orbit-truth-closure.test.ts` | PBIM (528/2063) | Node / Vitest | Empirical Math / AABB | **PASS** | Scope A: $15.24\text{ms}$ |
| **C5** | `ARCHITECTURE_ORBIT_C5_REAL_BROWSER_VISUAL_UX_ACCEPTANCE.md` | PBIM, CST | Playwright / Browser | Visual UX / Screenshots | **PASS** | Scope C: Real browser |
| **C6** | `orbit-c6-stress.test.ts` | Synthetic T1–T5 | Node / Vitest | Performance / Scale Bounds | **PASS** | Scope A: $N \le 20,000$ |
| **C6R** | `ARCHITECTURE_ORBIT_C6R_EVIDENCE_RECONCILIATION.md` | Synthetic T1–T5 | Node / Vitest | Telemetry Reconciliation | **PASS** | Scope A: $1\text{k}=43.28\text{ms}, 20\text{k}=35.83\text{s}$ |
| **C6R2** | `c6r2-benchmark-provenance.test.ts` | Synthetic, PBIM | Node / Vitest | State Machine Proof | **PASS** | Infinity fallbacks verified |
| **C7** | `orbit-c7-cross-layout.test.tsx` | PBIM, CST, BQC, Food | Node / JSDOM | Cross-Layout Isolation | **PASS** | 12 mode transitions |
| **C7R** | `orbit-c7r-reconciliation.test.tsx` | PBIM, CST, BQC, Food | Node / JSDOM | Fixture Baseline Sync | **PASS** | 0 position corruption |
| **C8** | `orbit-c8-production-hardening.test.tsx` | PBIM, CST, BQC, Food, Edge | Node / Vitest / JSDOM | Production Edge Cases | **PASS** | Scope B: $1\text{k}=124.7\text{ms}, \text{PBIM}=35.3\text{ms}$ |
| **C8R** | `orbit-c8r-reconciliation.test.ts` | PBIM (528/2063) | Node / Vitest | Immutability & Radius Proof | **PASS** | Deep immutability confirmed |
| **C9R2** | `ARCHITECTURE_ORBIT_C9R2_FINAL_METRIC_AND_CONTRACT_INTEGRITY_CLOSURE.md` | All Fixtures & Reports | Forensic Reconciliation | Metric & Contract Closure | **PASS** | Scope A, B, C reconciled |
| **C9R3** | `ARCHITECTURE_ORBIT_C9R3_FINAL_TWO_ISSUE_CONTRACT_CLOSURE.md` | All Fixtures & Reports | Contract Reconciliation | Two-Issue Contract Closure | **PASS** | Scope B 20k extrapolation removed |

---

## 20. REAL FIXTURE BASELINE

| Fixture ID | Project Name | Node Count ($N$) | Edge Count ($E$) | Real Browser Evidence | Node / Vitest / JSDOM Evidence | Orbit Validation Status |
| :--- | :--- | ---: | ---: | :---: | :---: | :---: |
| **`pbim`** | Public Safety & Incident Management | 528 | 2,063 | **PROVEN** (Chromium C5) | **PROVEN** (Vitest C4/C6/C8) | **PASS** (0 Collisions, 65 Sectors) |
| **`cst`** | Cloud Spend Tracker | 240 | 1,024 | **PROVEN** (Chromium C5) | **PROVEN** (Vitest C7/C8) | **PASS** (0 Collisions, 26 Sectors) |
| **`bqc`** | BigQuery Connector | 274 | 603 | `NOT RUN IN BROWSER` | **PROVEN** (Vitest C7R/C8) | **PASS** (0 Collisions, 18 Sectors) |
| **`food-app`** | Food Delivery App | 1 | 0 | `NOT RUN IN BROWSER` | **PROVEN** (Vitest C7R/C8) | **PASS** (Single Node Placement) |

---

## 21. CONTRADICTION / PROVENANCE REGISTER

All audited claims have an explicit provenance disposition; unsupported or scope-ambiguous claims have been narrowed or marked unclaimed.

| Discrepancy Item | Draft C9 Statement | Authoritative Resolution | Source Reference | Resolution Status |
| :--- | :--- | :--- | :---: | :---: |
| **20k Performance Timing** | `$12.4\text{ sec}$ at $N=20,000$` | Replaced with Scope A geometry benchmark timing ($35.83\text{ s}$). Scope B set to `Not Measured / Not Claimed`. | C6R, C6R2, C9R3 | `CLOSED` |
| **5k Performance Timing** | `$0.8–2.5\text{ sec}$ for 2000–5000` | Replaced with explicit Scope A ($1.43\text{ s}$) and Scope B ($3.86\text{ s}$) timings. | C6R2, C8 Sec. 7 | `CLOSED` |
| **1k Performance Timing** | `$<50\text{ ms}$ for $N \le 1,000$` | Reconciled as $\le 43.28\text{ ms}$ Scope A geometry compute and $\le 124.70\text{ ms}$ Scope B full pipeline. | C6R Sec. 5, C8 Sec. 7 | `CLOSED` |
| **Shuffle Determinism Count** | `100 randomized orderings` | Replaced 100 with 10 randomized array order shuffles. | C4 Sec. 10, C6 Sec. 10 | `CLOSED` |
| **Fixture Mappings** | `Browser & Vitest` across all fixtures | Mapped per-fixture execution environment explicitly (PBIM/CST browser proven). | C5, C7R, C8R | `CLOSED` |
| **Viewport Resolution Claims**| `320x568` to `3840x2160` | Narrowed to C5 tested viewports ($1024 \times 768 \dots 2560 \times 1440$). | C5 Sec. 8 | `CLOSED` |
| **Persistence Wording** | `FULL WORKSPACE PERSISTENCE` | Separated reload persistence (Sec. 10) from cross-layout state preservation (Sec. 11). | C7R Sec. 4, C9R3 | `CLOSED` |
| **Accessibility Color Constants** | `2px solid #0070D2` | Narrowed to evidenced Cytoscape focus ring and high-contrast outline behavior. | C5 Sec. 7 | `CLOSED` |

---

## 22. FROZEN TERMINOLOGY

* **PROVEN**: Directly established by explicit, reproducible empirical evidence or mathematical proof.
* **OBSERVED**: Measured behavior documented by runtime telemetry or visual logs; informative but not a normative guarantee.
* **ACCEPTED INHERITED OBSERVATION**: Documented operational or geometric characteristic carried forward from prior closed phases that does not block release.
* **NOT TESTED**: Scenario for which no empirical evidence was gathered.
* **NOT CLAIMED**: Operational capability explicitly excluded from the supported contract scope (e.g., $N > 20,000$ node layout, WebGL 3D projection).

---

## 23. RELEASE / FREEZE MANIFEST

* **Orbit Semantic Contract Version**: `v1.0.0-frozen`
* **Orbit Geometry Contract Version**: `v1.0.0-frozen`
* **Ownership Boundary Contract**: Strictly mode-owned layout coordinates; zero position corruption on global graph state.
* **Interaction & Overlay Contract**: Real graph edges rendered; virtual core and guides non-selectable.
* **Persistence & Mode Switching**: Hydrated via `architectureMode`; explicit user positions preserved.
* **Scale Envelope**: $N \le 1,000$ interactive browser target; $N \le 20,000$ Scope A Node benchmark limit ($35.83\text{ s}$). Scope B evidence ends at 5k ($3.86\text{ s}$).
* **Real Fixtures Validated**: PBIM ($528/2063$), CST ($240/1024$), BQC ($274/603$), Food-App ($1/0$).
* **Production Files Modified in C9/C9R/C9R2/C9R3**: **0 files** ($0\%$ source code mutation).
* **Report Lineage**: C4 $\rightarrow$ C5 $\rightarrow$ C6 $\rightarrow$ C6R $\rightarrow$ C6R2 $\rightarrow$ C7 $\rightarrow$ C7R $\rightarrow$ C8 $\rightarrow$ C8R $\rightarrow$ C9R $\rightarrow$ C9R2 $\rightarrow$ C9R3 $\rightarrow$ **C9 (Frozen Release Contract)**.

---

## 24. CLEAN-ROOM C10 REQUIREMENTS

1. **Source Code Immutability**: Production code modifications count must remain `0`.
2. **Historical Integrity**: Historical reports C4 through C8R must remain $100\%$ untouched.
3. **Independent Evaluation**: Clean-room C10 acceptance must independently evaluate the repository implementation against the frozen contract parameters ($innerRadius=600$, $ringSpacing=4000$, 6 rings, zero collisions, PBIM $528/2063$ fixture baselines) without relying on undocumented assertions.

`NEXT PHASE: C10 CLEAN-ROOM FINAL ORBIT ACCEPTANCE`
