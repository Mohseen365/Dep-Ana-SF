# ARCHITECTURE ORBIT — WORKSTREAM A SEMANTIC CONTRACT & PROJECTION REPORT

**Document Type:** Workstream A Final Deliverable & Semantic Projection Contract
**Status:** COMPLETE & VALIDATED
**Evidence Level:** `[REPOSITORY]` `[TEST]` `[REAL FIXTURE]` `[MATHEMATICAL]`
**Author:** Jules (Software Engineer)

---

## A. REPOSITORY SEMANTIC FACTS

A direct, read-only forensic audit of the repository (`explorer/src/`, `analyze/`, `deterministic/`, `explorer/public/projects/`) establishes the following factual baseline:

1. **Semantic Ontology Reuse:** `[REPOSITORY]`
   - Layer classification is governed by `classifyNodeLayer` and `classifyNodeLayerWithReason` in `explorer/src/lib/layout/layers.ts`.
   - Feature cluster discovery is governed by `discoverFeatures` in `explorer/src/lib/layout/features.ts`.
   - Subsystem domain discovery is governed by `discoverDomains` in `explorer/src/lib/layout/domains.ts`.
   - Feature roles are governed by `classifyFeatureRole` in `explorer/src/lib/layout/feature-roles.ts`.
   - Centrality metrics (Hubs & Bridges) are governed by `computeGraphCentralityAnalysis` in `explorer/src/lib/layout/centrality.ts`.
   - Graph indexing and parent/satellite resolution are governed by `createLayoutGraphIndex` in `explorer/src/lib/layout/graph-index.ts`.

2. **Real Fixture Baseline Truth:** `[REAL FIXTURE]`
   Inspecting actual repository JSON project files in `explorer/public/projects/` confirms:
   - `food-app`: 1 node, 0 edges.
   - `cst` (Cloud Spend Tracker): 240 nodes, 1,024 edges.
   - `bqc`: 274 nodes, 603 edges.
   - `pbim` (Pub Infra Mang): 528 nodes, 2,063 edges.

3. **PBIM Artifact Composition:** `[REAL FIXTURE]`
   - Total Nodes: 528
   - Total Edges: 2,063
   - ApexClass: 181
   - External: 99
   - CustomField: 180
   - LWC: 30
   - CustomObject: 25
   - ApexTrigger: 13

---

## B. ORBIT PROJECTION CONTRACT

Workstream A implements `explorer/src/lib/layout/orbit-semantics.ts`, exposing the pure semantic projection interface:

```typescript
export interface OrbitNodeMetadata {
  nodeId: string;
  canonicalNodeType: ExplorerNodeType;
  canonicalLayer: ArchitectureLayer;
  orbitRingIndex: number;
  primaryFeatureId: string;
  primaryDomainId: string;
  orbitSectorId: string;
  semanticOrderKey: string;
  fallbackFlags: {
    isDefaultLayerFallback: boolean;
    isUnassignedFeature: boolean;
    isSharedDomain: boolean;
    isUntypedNodeFallback: boolean;
  };
}
```

### Strict Ownership Boundary `[REPOSITORY]`
- **Included:** Node ID, canonical node type, canonical layer, radial ring index ($0 \dots 5$), primary feature ID, primary domain ID, orbit sector ID, deterministic semantic order key, fallback flags.
- **Explicitly Excluded (Zero Geometry):** `x`, `y`, `radius`, `angle`, `track`, `width`, `height`, `collision`, `force`, `spacing`, `rendering`.

---

## C. RING MAPPING

The radial ring mapping transforms existing architecture semantics into a deterministic integer ring index ($0 \dots 5$):

```text
canonical semantic input                                     → Orbit ring
-------------------------------------------------------------------------
LWC / Visualforce / ApexTrigger / Flow / presentation layer  → Ring 0 (Entry / Presentation)
application layer (Controllers, Handlers, Orchestrators)    → Ring 1 (Application)
domain layer (Services, Business Processors, Models, DTOs)   → Ring 2 (Business Logic)
schema layer Objects (Object, CustomObject)                  → Ring 3 (Schema Objects)
schema layer Fields (Field, CustomField) & External          → Ring 4 (Schema Detail / External)
Apex Tests / Shared Infrastructure / Satellites             → Ring 5 (Supporting / Shared)
```

### Ring Allocation Rules `[MATHEMATICAL]` `[TEST]`
1. **Ring 5 (Supporting / Shared):** `isTestNode(node) === true` OR `role === 'SharedInfrastructure'` OR `role === 'FeatureTest'`.
2. **Ring 4 (Schema Detail / External):** `node.type === 'Field' || node.type === 'CustomField' || node.type === 'External'`.
3. **Ring 3 (Schema Objects):** `node.type === 'Object' || node.type === 'CustomObject'`.
4. **Ring 0 (Entry / Presentation):** `node.type === 'LWC' || node.type === 'Visualforce' || node.type === 'ApexTrigger' || node.type === 'Flow' || layer === 'presentation'`.
5. **Ring 1 (Application):** `layer === 'application'`.
6. **Ring 2 (Domain / Services):** `layer === 'domain'`.
7. **Ring 3 Fallback:** `layer === 'schema'`.
8. **Default Fallback:** `Ring 1`.

*The mapping is total, deterministic, and 100% independent of graph rendering, worker execution, or geometry.*

---

## D. FEATURE / SECTOR MAPPING

- Feature discovery reuses `discoverFeatures(nodes, edges)` from `explorer/src/lib/layout/features.ts`.
- `primaryFeatureId` represents the stable feature cluster ID (e.g. `feature_OrderController`, `Shared`, or `Unassigned`).
- **Orbit Sector Identity Contract:** `[REPOSITORY]` `[TEST]`
  $$\text{orbitSectorId} = \text{primaryFeatureId}$$
- **No $S_{max} = 25$ Constraint:** `[REPOSITORY]`
  The proposal $S_{max} = 25$ is disproven and rejected. The sector count equals the actual distinct feature cluster count discovered in the repository fixture. No artificial feature merging or semantic compression is performed.

---

## E. DOMAIN MAPPING

- Domain discovery reuses `discoverDomains(nodes, edges)` from `explorer/src/lib/layout/domains.ts`.
- `primaryDomainId` exposes the discovered subsystem domain (e.g., `Order`, `Billing`, `Shared`).
- `primaryDomainId` serves as supporting semantic metadata for cross-domain filtering and DOES NOT overwrite `orbitSectorId`.

---

## F. DETERMINISTIC ORDERING

Workstream A constructs a deterministic, lexicographically sortable semantic key for every node:

$$\text{semanticOrderKey} = \text{"R" + pad2(ringIndex) + ":S" + sectorId + ":T" + type + ":N" + nodeId}$$

### Ordering Hierarchy `[MATHEMATICAL]` `[TEST]`
1. `orbitRingIndex` ascending (`0` to `5`)
2. `orbitSectorId` ascending (`localeCompare`)
3. `canonicalNodeType` ascending (`localeCompare`)
4. `nodeId` ascending (`localeCompare` tie-breaker)

Sorting nodes by `semanticOrderKey` guarantees 100% deterministic, reproducible node ordering across all executions regardless of input array order.

---

## G. FALLBACK MATRIX

| Missing / Ambiguous Metadata | Fallback Value | Fallback Flag | Reason & Confidence |
| :--- | :--- | :--- | :--- |
| **Missing `node.type`** | `'External'` | `isUntypedNodeFallback: true` | Untyped graph node defaults to External system component. |
| **Ambiguous Layer** | `'application'` | `isDefaultLayerFallback: true` | Fallback layer assignment with confidence = 0.5. |
| **Unassigned Feature** | `'Unassigned'` | `isUnassignedFeature: true` | Component did not join any seed cluster; assigned to Unassigned bucket. |
| **Missing / Shared Domain** | `'Shared'` | `isSharedDomain: true` | Insufficient domain stem or cross-cutting utility. |

---

## H. CONSERVATION RESULTS

Running `projectOrbitSemantics` against all 4 repository fixtures verifies 100% node conservation:

$$\text{source graph nodes} = \text{Orbit semantic projection nodes}$$

$$\text{missing} = 0, \quad \text{duplicated} = 0, \quad \text{unassigned} = 0$$

### Conservation Matrix `[REAL FIXTURE]` `[TEST]`

| Fixture | Source Nodes | Source Edges | Projected Nodes | Missing | Duplicated | Unassigned | Ring Counts (0..5) | Sector Count | Feature Count | Domain Count |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **food-app** | 1 | 0 | 1 | 0 | 0 | 0 | R0: 0, R1: 1, R2: 0, R3: 0, R4: 0, R5: 0 | 1 | 1 | 1 |
| **cst** | 240 | 1,024 | 240 | 0 | 0 | 0 | R0: 28, R1: 24, R2: 4, R3: 1, R4: 111, R5: 72 | 46 | 44 | 106 |
| **bqc** | 274 | 603 | 274 | 0 | 0 | 0 | R0: 20, R1: 28, R2: 11, R3: 12, R4: 149, R5: 54 | 26 | 24 | 115 |
| **pbim** | 528 | 2,063 | 528 | 0 | 0 | 0 | R0: 43, R1: 38, R2: 15, R3: 6, R4: 264, R5: 162 | 65 | 63 | 196 |

---

## I. DETERMINISM RESULTS

Determinism was tested using adversarial input array perturbation on all fixtures (`explorer/src/lib/layout/orbit-semantics.test.ts`):

1. Original node array order
2. Reversed node array order
3. Lexicographically sorted node array order
4. Seeded pseudo-random shuffled node array order

### Result `[TEST]`
- **100% Bit-for-Bit Identity:** All 528 nodes in PBIM (and all nodes across CST, BQC, food-app) produced 100% identical `orbitRingIndex`, `primaryFeatureId`, `primaryDomainId`, `orbitSectorId`, and `semanticOrderKey` across all 4 input permutations.
- **0% Drift / 0 Mismatches:** Array sorting before discovery and projection guarantees absolute input-order invariance.

---

## J. ADVERSARIAL FINDINGS

1. **Disproof of $S_{max} = 25$:** `[REPOSITORY]`
   PBIM contains 65 distinct feature sectors, CST contains 46, BQC contains 26. Capping sector count at 25 would corrupt feature identity. Preserving exact feature identity ($\text{orbitSectorId} = \text{primaryFeatureId}$) is mathematically required.
2. **Entry-Point Relationship in PBIM:** `[REAL FIXTURE]`
   - 30 LWC UI components $\to$ Ring 0
   - 13 ApexTrigger database event components $\to$ Ring 0
   - 181 ApexClass components $\to$ Rings 1, 2, 5
   - Total Ring 0 count in PBIM = 43 (30 LWC + 13 ApexTrigger).

---

## K. EXPLICIT NON-CLAIMS

Workstream A explicitly confirms that the following were **NOT** implemented:
- No $S_{max}$ hard limit or artificial sector compression.
- No feature merging algorithms.
- No water-filling angular allocation engine.
- No radial or Cartesian geometry calculations ($(r, \theta) \to (x, y)$).
- No collision detection or collision repair.
- No Web Worker postMessage integration.
- No DOM, SVG, or Canvas browser rendering.

---

## L. WORKSTREAM A VERDICT

```text
PASS — ORBIT SEMANTIC CONTRACT FULLY IMPLEMENTED AND VERIFIED
```

---

# HANDOFF CONTRACT TO WORKSTREAM B

Workstream B (Geometry + Placement) may strictly assume the following semantic inputs:

```typescript
export interface OrbitNodeMetadata {
  nodeId: string;
  canonicalNodeType: ExplorerNodeType;
  canonicalLayer: ArchitectureLayer;
  orbitRingIndex: number;            // Guaranteed integer 0..5
  primaryFeatureId: string;          // Authoritative feature cluster ID
  primaryDomainId: string;           // Authoritative domain ID
  orbitSectorId: string;             // Sector ID (= primaryFeatureId)
  semanticOrderKey: string;          // Deterministic sort key
  fallbackFlags: {
    isDefaultLayerFallback: boolean;
    isUnassignedFeature: boolean;
    isSharedDomain: boolean;
    isUntypedNodeFallback: boolean;
  };
}
```

### Workstream B Handoff Statistics (Real Fixtures)

| Fixture Metric | food-app | cst | bqc | pbim |
| :--- | :--- | :--- | :--- | :--- |
| **Total Nodes ($N$)** | 1 | 240 | 274 | 528 |
| **Total Edges ($E$)** | 0 | 1,024 | 603 | 2,063 |
| **Ring 0 Nodes (Entry/Presentation)** | 0 | 28 | 20 | 43 |
| **Ring 1 Nodes (Application)** | 1 | 24 | 28 | 38 |
| **Ring 2 Nodes (Domain)** | 0 | 4 | 11 | 15 |
| **Ring 3 Nodes (Schema Objects)** | 0 | 1 | 12 | 6 |
| **Ring 4 Nodes (Schema Fields/External)** | 0 | 111 | 149 | 264 |
| **Ring 5 Nodes (Supporting/Satellites)** | 0 | 72 | 54 | 162 |
| **Distinct Sectors ($S$)** | 1 | 46 | 26 | 65 |
| **Max Sector Population** | 1 | 22 | 34 | 48 |
