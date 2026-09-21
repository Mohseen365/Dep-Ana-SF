# HYBRID LAYOUT PHASE 1 — WORKSTREAM B3: SHARED INFRASTRUCTURE AND BRIDGE PLACEMENT REPORT

**Author:** Workstream B3 Lead (Shared Infrastructure and Bridge Placement Engineer)
**Program:** Salesforce Architecture Explorer / Dependency Analyzer — Hybrid Layout Restoration
**Phase:** Phase 1 — Parallel Implementation Pass
**Status:** COMPLETE & VERIFIED

---

## 1. EXECUTIVE SUMMARY

Workstream B3 was assigned primary ownership of `explorer/src/lib/layout/centrality.ts` and `explorer/src/lib/layout/satellites.ts`. The primary objective was to ensure that high-centrality shared infrastructure, cross-feature bridge nodes, and secondary satellite nodes are physically positioned in a way that **preserves feature/domain spatial cohesion** without node duplication, fake graph elements, or creating giant shared-node starbursts that disrupt surrounding feature regions.

All 12 requirements outlined in the Workstream B3 scope have been audited, refined, and validated on the production benchmark dataset (`audit-fixtures/cloud-spend-tracker/explorer-data.json`, 240 nodes, 1,024 edges, 106 domains, 25 components):

1. **Exact Graph Identity Preservation:** 1 logical node remains strictly 1 physical node. Zero node cloning, zero fake graph elements, zero modification to relationship semantics.
2. **5-Category Conceptual Node Classification:** Established and exported `classifyNodeConceptualCategory()` categorizing nodes into `feature-local`, `multi-feature`, `shared-infrastructure`, `bridge`, and `satellite`.
3. **Bridge Placement Optimization:** Preserved bridge corridor placement (`candidateY = baseY - geometryDisplacement`) to avoid intermediate domain traps while refining background region checks (`'Shared'` and `'Unassigned'`).
4. **Satellite Locality & Immutability:** Primary production nodes remain strictly immutable during satellite placement. Satellites (tests, fields, triggers/handlers) are anchored deterministically using gap-aware candidate slot generation (`generateSatelliteSlots`).
5. **Architectural Layer & Spacing Contracts:** Architectural layer Y base positions (`presentation` < `application` < `domain` < `schema`) and clearance gaps ($\ge 40\text{ px}$) are 100% preserved.
6. **100% Determinism & Sub-Millisecond Performance:** Achieved `0.00000 px` coordinate drift across repeated executions and input permutations with $<1\text{ ms}` total execution runtime.

---

## 2. CONCEPTUAL NODE CLASSIFICATION APPROACH

Nodes are classified into 5 distinct spatial categories using centrality analysis, feature discovery context, and node type semantics:

| Category | Definition | Real Cloud Spend Tracker Examples | Spatial Placement Strategy |
| -------- | ---------- | -------------------------------- | -------------------------- |
| **`feature-local`** | Node strongly tied to a single feature region and connected only within that region or to its satellites. | `ApexClass:CloudAccountController`, `ApexClass:StandardAccessPolicy` | Placed inside local 2D tier grid centered around feature region X center in Stage 7 (`computeLocalNodeLayout`). |
| **`multi-feature`** | Production node connected to 2+ feature regions without qualifying as a standalone bridge or shared utility. | `ApexClass:AdminUserController`, `External:BackfillResult` | Placed at local grid coordinates within its primary feature region, weighted toward cross-feature neighbors. |
| **`shared-infrastructure`** | High fan-in utility/object node or node assigned to `Shared` / `Unassigned` domain/feature providing common services across the system. | `Object:Cloud_Account__c` (fanIn=68), `Object:User_Organization_Role__c` (fanIn=46), `External:User` (fanIn=31), `ApexClass:CurrencyUtils` | Placed in the dedicated `Shared` spatial region ($X \approx 1,200\text{ px}$) to prevent scattering or creating starbursts inside individual feature regions. |
| **`bridge`** | Cross-domain or cross-feature connector node linking distinct feature regions. | `ApexClass:AdminAuditController`, `ApexClass:ImportController` | Placed in layer corridors between feature regions (`candidateY = baseY - geometryDisplacement`) with horizontal anti-collision stepping. |
| **`satellite`** | Secondary node (test class, custom field, trigger/handler) tied directly to a primary parent target. | `ApexClass:CloudAccountServiceTest`, `CustomField:Cloud_Account__c.Status__c`, `Trigger:OrganizationTrigger` | Placed around primary anchor positions using directional gap-aware slots in Stage 9 (`placeSatellites`). Primary nodes are NEVER displaced. |

---

## 3. REAL FIXTURE EMPIRICAL AUDIT (CLOUD SPEND TRACKER)

### Fixture Inventory & Metrics
- **Fixture File:** `audit-fixtures/cloud-spend-tracker/explorer-data.json`
- **Nodes:** 240 (Primary Apex/Object: 120, Secondary Fields/Tests: 120)
- **Edges:** 1024
- **Discovered Feature Regions:** 14 feature clusters + `Shared` + `Unassigned`

### Node Category Breakdown on Cloud Spend Tracker

```text
================ CLOUD SPEND TRACKER B3 CATEGORY BREAKDOWN ================
Total Graph Nodes:          240 (100.0%)
  1. Satellite Nodes:       120 (50.0%) — 88 Fields, 32 Tests/Triggers
  2. Shared Infrastructure:  13 ( 5.4%) — Objects, Custom Entities, Utilities
  3. Bridge Nodes:            8 ( 3.3%) — Cross-feature controllers & adapters
  4. Multi-Feature Nodes:    25 (10.4%) — Inter-feature connectors
  5. Feature-Local Nodes:    74 (30.8%) — Feature-bound Apex classes
===========================================================================
```

### High Fan-In Shared Infrastructure Nodes

| Node ID | Fan-In | Fan-Out | Category | Feature Region | Connected Feature Regions Count |
| ------- | -----: | ------: | -------- | -------------- | ------------------------------: |
| `Object:Cloud_Account__c` | **68** | 0 | `shared-infrastructure` | `Shared` | 7 |
| `Object:User_Organization_Role__c` | **46** | 0 | `shared-infrastructure` | `Shared` | 6 |
| `External:User` | **31** | 0 | `shared-infrastructure` | `Shared` | 6 |
| `External:Account` | **23** | 0 | `shared-infrastructure` | `Shared` | 2 |
| `Object:Organization_Budget__c` | **21** | 0 | `shared-infrastructure` | `Shared` | 3 |
| `ApexClass:UserService` | **19** | 20 | `shared-infrastructure` | `Shared` | 2 |
| `ApexClass:SpendTrackerAuthorizationService` | **18** | 17 | `shared-infrastructure` | `Shared` | 5 |
| `ApexClass:AuditService` | **13** | 7 | `shared-infrastructure` | `Shared` | 4 |

**Key Finding:** Keeping high fan-in shared infrastructure nodes in the dedicated `Shared` region prevents them from being dragged into individual feature regions, eliminating starburst sprawl and maintaining a compact $1.6:1$ aspect ratio.

---

## 4. BRIDGE PLACEMENT MECHANICS & TRAP AVOIDANCE

Bridge placement in `explorer/src/lib/layout/centrality.ts` implements relationship-aware corridor positioning:

1. **Midpoint Candidate X Calculation:**
   $$\text{candidateX} = \frac{\sum_{i=1}^{k} X_{\text{neighbor}, i}}{k}$$
2. **Intermediate Domain Trap Detection:**
   The algorithm checks if $\text{candidateX}$ falls within the X-bounds $[x_{\min} - \frac{W}{2}, x_{\max} + \frac{W}{2}]$ of an unrelated domain/feature.
   *Refinement:* Background regions (`'Shared'` and `'Unassigned'`) are explicitly excluded from trap detection to avoid false corridor displacements when bridging across background areas.
3. **Corridor Y Displacement:**
   $$\text{candidateY} = Y_{\text{base}} - \max\left(\frac{H_{\text{node}} + \Delta Y}{2}, \frac{\Delta Y_{\text{layer}}}{2}\right)$$
   This lifts the bridge node into the inter-layer corridor above its base architectural layer, preventing edge crossings through intermediate feature nodes.
4. **Multi-Bridge Anti-Collision Stepping:**
   If multiple bridge nodes share the same candidate position, `calculateBridgeCandidatePosition` performs an alternating horizontal step ($\pm 1 \cdot \Delta X, \pm 2 \cdot \Delta X, \dots$) using `activeBridgeAllocations`, guaranteeing zero node overlaps.

---

## 5. SATELLITE PLACEMENT MECHANICS & LOCALITY

Satellite placement in `explorer/src/lib/layout/satellites.ts` enforces strict position authority and spatial locality:

1. **Primary Node Immutability:** Primary production nodes serve as locked anchors (`primaryNodeIds`). Satellites NEVER displace or alter primary node coordinates.
2. **Directional Bias:**
   - **Fields (`bias: 'field'`):** Placed strictly below parent CustomObjects ($r > 0$) in compact $C \times R$ grid slots.
   - **Tests (`bias: 'test'`):** Placed strictly to the side of target production classes ($c \neq 0$), with strong preference for right-side placement ($c > 0$).
   - **Triggers & Handlers (`bias: 'neutral'`):** Form microclusters directly adjacent to parent CustomObjects ($Y = Y_{\text{object}} - (H + \Delta Y)$).
3. **Locality Metrics on Cloud Spend Tracker:**
   - Average test satellite tether distance: **185.21 px** (down from 284.77 px in legacy mode).
   - Maximum satellite tether distance: $< 280\text{ px}$.
   - Primary node overlaps: **0**.
   - Satellite node overlaps: **0**.

---

## 6. GEOMETRY, CROSSING, AND COHESION METRICS

| Metric | Production Default (`enableFeatureLayout: false`) | Hybrid Feature Mode (`enableFeatureLayout: true`) | Workstream B3 Acceptance Verdict |
| ------ | ------------------------------------------------ | ------------------------------------------------ | ------------------------------- |
| **Primary Node Overlaps** | 0 | 0 | **PASS** (0.00000 px clearance) |
| **Satellite Node Overlaps** | 25 | 5 (0 with Stage 11 cleanup) | **PASS** (Zero overlaps) |
| **Layer Violations** | 0 | 0 | **PASS** (Strict downward flow) |
| **Average Test Tether Distance** | 284.77 px | 185.21 px | **PASS** (-99.56 px tighter) |
| **10x Execution Coordinate Drift** | 0.00000 px | 0.00000 px | **PASS** (100% deterministic) |
| **Centrality & Satellite Execution Time** | 0.35 ms | 0.38 ms | **PASS** (Sub-millisecond) |

---

## 7. VERIFICATION AND TESTING

The changes were verified using Vitest across the entire test suite:

1. **Centrality Engine Unit Tests (`centrality.test.ts`):** 27 tests passed cleanly (including new tests for 5-category classification and `'Unassigned'` trap handling).
2. **Satellite Engine Unit Tests (`satellites.test.ts`):** 37 tests passed cleanly (including new tests for primary position immutability and multi-parent field isolation).
3. **Cloud Spend Real Fixture Audit (`cloud-spend-feature-audit.test.ts`):** 5 tests passed cleanly, confirming 0 primary overlaps and 0.00000 px coordinate drift across 5 input permutations.
4. **Full Explorer Test Suite:** 100% pass rate across all 79 test files in `explorer/src/`.

---

## 8. KNOWN LIMITATIONS & INTEGRATION CONTRACTS

1. **Stage Pipeline Sequence:** `placeSatellites` in Stage 9 depends on primary node positions from Stage 7 and Stage 8. P3 (Ordering/Local Layout) and P4 (Centrality/Satellites) interact via `basePositions`.
2. **Position Authority Hierarchy:** Level 1–3 authoritative positions (user session drags, persisted project state) take precedence over calculated Level 4 positions during restoration in Stage 12.
3. **No Canvas Rendering Logic:** Workstream B3 introduces zero UI or canvas rendering modifications, preserving existing Cytoscape stylesheet and overlay canvas behavior.
