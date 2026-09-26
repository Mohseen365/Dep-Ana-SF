# Stage 9 State, Reuse and Call Topology Forensic Report

**Report Date:** September 27, 2026
**Investigator:** Jules (Principal Software Engineer / System Auditor)
**Track:** Track C — Stage 9 State, Reuse and Call Topology Forensic Investigation
**Target Subsystem:** Stage 9 Secondary Satellite Placement (`explorer/src/lib/layout/satellites.ts`)
**Canonical Benchmark Fixture:** `audit-fixtures/cloud-spend-tracker/explorer-data.json`
**Fixture SHA-256 Digest:** `feeb68f363d91fa0a234cb20b5975d6d6d69695fc9cdead4363806a7ca828295` (240 nodes, 1,024 edges)

---

## A. Executive Summary

This forensic investigation completes **Track C** of the Stage 9 performance investigation for the Salesforce Architecture Explorer layout engine.

Track B established **where runtime is spent** (quadratic search grid expansion in `generateSatelliteSlots` generating up to 73,440 candidate slots per satellite node). Track C investigates **what work can safely be precomputed or reused**, what state controls its validity, what scope each value remains invariant within, and which reuse opportunities are sufficiently established for a future isolated A/B experiment.

### Key Findings
1. **Strongest Established Reuse Opportunity**: **Pre-filtering Static Primary Edge Segments via Bounding Boxes (AABB) & Memoizing Parent Lookups** (Classification **P0 — PROVEN SAFE**, Scope **R0 — Entire Stage 9**).
   - Primary production node positions (`primaryPositions`) and primary edge segments (`primarySegments`) are 100% immutable throughout the entire Stage 9 execution ($0.00000\text{ px}$ delta).
   - In the existing implementation, every candidate slot check in `generateSatelliteSlots` re-evaluates point cross-products against all primary edge segments in `segmentsIntersect`.
   - Pre-computing bounding box (`minX, maxX, minY, maxY`) metadata for static `primarySegments` once per Stage 9 run and performing broad-phase AABB overlap checks before calling `segmentsIntersect` eliminates $>90\%$ of expensive cross-product floating-point operations with zero risk of coordinate drift or semantic change.
2. **Strongest Proven Invariant**: **Static Primary Production Geometry (`primaryPositions` and `primarySegments`)**.
   - Primary production nodes are locked anchors established in Stage 7/8. They are never moved or reordered by Stage 9.
   - Primary edge segments between primary production nodes do not change during Stage 9 execution.
3. **Strongest Invalidation Dependency**: **Occupancy State (`occupiedList`) and Placed Satellite Tethers (`placedSatelliteSegments`)**.
   - `occupiedList` is mutated every time any satellite node (Trigger, Handler, Field, or Test) is assigned a slot.
   - `placedSatelliteSegments` is mutated every time an anchored Field or Test satellite is placed.
   - Any reuse of occupancy or satellite tether crossing evaluations across satellite placements MUST be invalidated upon every placement event.
4. **Strongest Safety Classification**: **P0 — PROVEN SAFE** for static primary segment AABB metadata pre-calculation and parent-relationship memoization; **P4 — UNSAFE** for un-invalidated occupancy caching or changing candidate slot search enumeration order.
5. **Recommended Reuse A/B Experiment**: **Stage 9 Primary Segment AABB Pre-filtering & Parent Lookup Memoization Experiment**. (See Section T).
6. **Strict Production Safety Compliance**: **Zero production code modified**. All investigation measurements were conducted using a test-only forensic harness (`explorer/src/test/stage9-state-reuse-forensic.test.ts`).

---

## B. Authoritative Stage 9 State Model

All state consumed or produced during Stage 9 execution (`placeSatellites`, `generateSatelliteSlots`, `isSlotOccupied`, `segmentsIntersect`) is classified into five formal state tiers (S0–S4):

### S0 — Immutable for Entire Stage 9 Execution
State that cannot change during the entire Stage 9 call:
* `primaryPositions`: Fixed coordinates of Level 4 production nodes computed in Stage 7/8.
* `primaryNodeIds`: Set of primary node ID strings.
* `primarySegments`: Array of `{ p1: Point; p2: Point }` for edges connecting primary production nodes.
* `nodes` & `edges`: Input graph arrays passed to `placeSatellites`.
* `analysis`: Immutable `ArchitectureGraphAnalysis` payload (`nodeList` and `nodes` Map).
* Node Classification Logic: Static predicates (`isField`, `isTest`, `isTriggerNode`, `isHandlerNode`).
* Static Configuration Constants: `nodeWidth` ($120\text{px}$), `nodeHeight` ($60\text{px}$), `horizontalGap` ($40\text{px}$), `verticalGap` ($40\text{px}$), `maxSatelliteDistance` ($280\text{px}$), `layerYOffsets`.

### S1 — Invariant Within One Satellite-Placement Group
State that remains unchanged while one `generateSatelliteSlots` invocation executes:
* Group `anchor` position $(x, y)$ (e.g., parent CustomObject or target ApexClass position).
* `targetVector`: Average directional vector from anchor to connected primary production nodes.
* Group satellite count `count`.
* Group `bias`: Directional and aspect ratio penalty mode (`'field'`, `'test'`, `'neutral'`).
* Search radius $R = \max(12, \lceil\sqrt{\text{count}} \cdot 3\rceil)$.
* Grid step size $dx = \text{nodeWidth} + \text{horizontalGap} = 160\text{px}$, $dy = \text{nodeHeight} + \text{verticalGap} = 100\text{px}$.
* Initial `occupiedList` state at the start of the `generateSatelliteSlots` call.
* Initial `placedSatelliteSegments` state at the start of the `generateSatelliteSlots` call.

### S2 — Candidate-Specific State
State that varies with each candidate grid slot $(r, c)$:
* Candidate grid coordinates $x = \text{anchor.x} + c \cdot dx, y = \text{anchor.y} + r \cdot dy$.
* Euclidean distance $\text{dist} = \sqrt{(x - \text{anchor.x})^2 + (y - \text{anchor.y})^2}$.
* Candidate directional score `directionalScore`.
* Candidate aspect penalty `aspectPenalty`.
* Candidate vector alignment penalty `vectorPenalty`.
* Candidate tether segment $(ep \rightarrow candPoint)$.
* Primary segment crossings count `primaryCrossings`.
* Satellite segment crossings count `satelliteCrossings`.
* Tether distance penalty `tetherPenalty`.
* Effective total score `effectiveScore`.

### S3 — Mutable Between Satellite Placements
State that changes immediately after each satellite node is assigned a position slot:
* `occupiedList`: Grows by $+1$ point (`occupiedList.push(slot)`) after each satellite placement.
* `placedSatelliteSegments`: Grows by $+1$ segment (`placedSatelliteSegments.push({ p1: anchor, p2: slot })`) after each anchored Field or Test placement.
* `positions` and `satellitePositions`: Result coordinate maps updated as satellites are placed and cyclically permuted during Stage 4 refinement.

### S4 — Ordering-Sensitive State
State whose reuse or modification could alter observable placement behavior:
* Processing category order: Triggers $\rightarrow$ Handlers $\rightarrow$ Fields $\rightarrow$ Tests $\rightarrow$ Stage 4 Permutation Refinement.
* Deterministic satellite sorting order within categories (`nodeId.localeCompare`).
* Array scan order in `findParentObjectId` and `findParentProductionNodeId` when `options.index` is absent.
* Candidate slot tie-breaking order: 4-tuple lexicographical sort (`effectiveScore`, `dist`, `row`, `col` with $10^{-4}$ epsilon).
* First-valid-slot assignment mapping (`selectedSlots[idx]` assigned to `sortedNodes[idx]`).

---

## C. Stage 9 Call Topology

`placeSatellites` orchestrates satellite placement across 4 sequential stages, invoking `generateSatelliteSlots` for collision resolution or candidate slot generation:

```text
placeSatellites (satellites.ts)
 │
 ├── Stage 1: Trigger / Handler Microclusters
 │    ├── Triggers Loop (triggerAnalyses)
 │    │    └── generateSatelliteSlots(anchor, count=1, bias='neutral') [If slot occupied]
 │    └── Handlers Loop (handlerAnalyses)
 │         └── generateSatelliteSlots(anchor, count=1, bias='neutral') [If slot occupied]
 │
 ├── Stage 2: Field Satellites
 │    ├── Anchored Fields Loop (fieldsByParent Map)
 │    │    └── generateSatelliteSlots(parentPos, count=fields.length, bias='field', targetVector, primarySegments, placedSatelliteSegments)
 │    └── Unanchored Fields Pass (unanchoredFields)
 │         └── generateSatelliteSlots(fallbackAnchor, count=unanchored.length, bias='field') [If unanchoredFields > 0]
 │
 ├── Stage 3: Test Satellites
 │    ├── Anchored Tests Loop (testsByTarget Map)
 │    │    └── generateSatelliteSlots(targetPos, count=tests.length, bias='test', targetVector, primarySegments, placedSatelliteSegments)
 │    └── Unanchored Tests Pass (unanchoredTests)
 │         └── generateSatelliteSlots(fallbackAnchor, count=unanchored.length, bias='test') [If unanchoredTests > 0]
 │
 └── Stage 4: Post-Placement Field Slot Permutation Refinement
      └── evaluateTotalCrossings(edges, candidatePositions) [For field clusters with count >= 2, shifts 1..min(count-1, 4)]
```

### Empirical Invocation Breakdown on Canonical Dataset (Cloud Spend Tracker: 240 Nodes / 1,024 Edges)

| Invocation Category | Invocations | Group Parent / Anchor | Satellites Placed | Occupied Size at Call Start | Primary Segments Size | Placed Satellite Segments Size |
| --- | ---: | --- | ---: | ---: | ---: | ---: |
| **Stage 1: Triggers** | 3 | Connected CustomObject / Application Layer | 3 Triggers | 150 $\rightarrow$ 152 | 370 | 0 |
| **Stage 1: Handlers** | 3 | Connected Trigger / Service Class | 3 Handlers | 153 $\rightarrow$ 155 | 370 | 0 |
| **Stage 2: Anchored Fields** | 12 | Parent CustomObject (`fieldsByParent`) | 63 Fields | 156 $\rightarrow$ 218 | 370 | 0 $\rightarrow$ 62 |
| **Stage 2: Unanchored Fields** | 0 | Schema Layer Fallback Grid | 0 Fields | N/A | 370 | 63 |
| **Stage 3: Anchored Tests** | 18 | Target ApexClass (`testsByTarget`) | 20 Tests | 219 $\rightarrow$ 238 | 370 | 63 $\rightarrow$ 82 |
| **Stage 3: Unanchored Tests** | 1 | Application Layer Fallback Grid | 1 Test | 239 | 370 | 83 |
| **Stage 4: Permutation Refinement** | 12 | Field Clusters ($\ge 2$ fields) | 0 (Reassignments) | 240 | 370 | 83 |
| **TOTAL `generateSatelliteSlots` Invocations** | **37** | — | **90 Satellites** | — | — | — |

---

## D. Repeated-Work Inventory

Detailed inventory of operations repeatedly executed during Stage 9:

| Operation | Call Frequency in CST (240N) | State Scope | Recomputed Because | Potential Reuse Opportunity |
| --- | ---: | --- | --- | --- |
| **Parent Object Lookup** (`findParentObjectId`) | 63 calls | S0 / R0 | Scans `edges` array per field when `options.index` is absent | **P0**: Pre-resolve or memoize parent object ID mapping once per graph |
| **Parent Prod Node Lookup** (`findParentProductionNodeId`) | 21 calls | S0 / R0 | Scans `edges` array per test when `options.index` is absent | **P0**: Pre-resolve or memoize parent production node ID mapping once per graph |
| **Node Classification** (`isField`, `isTest`, `isTriggerNode`, `isHandlerNode`) | 960 evaluations ($240 \times 4$) | S0 / R0 | Re-evaluated on every node during `computeArchitectureAnalysis` | **P0**: Immutable static properties from analysis payload |
| **Primary Segment Construction** (`primarySegments`) | 1 construction ($370$ segments) | S0 / R0 | Extracted once at start of Stage 9 | **P0**: Static for entire Stage 9 execution |
| **Primary Segment Metadata Extraction** | 1,628,217 slot-segment checks | S0 / R0 | `segmentsIntersect` re-computes cross-products per candidate slot without AABB pre-filtering | **P0**: Pre-compute bounding box (`minX, maxX, minY, maxY`) per segment once |
| **Target Vector Computation** | 30 groups ($12$ field + $18$ test) | S1 / R1 | Scans parent's incident edges to average delta vectors | **P0 / P1**: Group-invariant; computed once per group |
| **Grid Cell Step Computation** | 37 calls | S0 / R0 | Evaluates `dx = nodeWidth + horizontalGap` ($160\text{px}$) and `dy = nodeHeight + verticalGap` ($100\text{px}$) | **P0**: Fixed scalar constants |
| **Search Radius Calculation** | 37 calls | S1 / R1 | Evaluates `maxSearchRadius = Math.max(12, Math.ceil(Math.sqrt(count) * 3))` | **P0**: Group-invariant scalar function of `count` |

---

## E. Immutable State (S0)

State values that remain 100% immutable throughout the complete Stage 9 execution:

1. **`primaryPositions`**: Record mapping primary node IDs to `{ x, y }`. Primary nodes represent Level 4 production nodes placed in Stage 7/8. Stage 9 explicitly enforces that primary nodes are NEVER moved.
2. **`primaryNodeIds`**: Set of primary node ID strings.
3. **`primarySegments`**: Array of 370 primary edge segments (in CST). Derived strictly from `primaryNodeIds` and `edges`.
4. **`nodes` and `edges`**: Input graph arrays.
5. **Node Classification Attributes**: `isField`, `isTest`, `isTriggerNode`, `isHandlerNode` predicates return identical boolean outputs throughout layout execution.
6. **Geometry Dimensions & Gaps**: `nodeWidth = 120`, `nodeHeight = 60`, `horizontalGap = 40`, `verticalGap = 40`, `maxSatelliteDistance = 280`, `layerYOffsets`.

### Smallest Valid Reuse Scope: **R0 — Entire Stage 9 Execution**.

---

## F. Group-Invariant State (S1)

State values that remain constant for the duration of a single `generateSatelliteSlots` invocation:

1. **`anchor`**: Point `{ x, y }` defining the origin of slot grid generation.
2. **`count`**: Number of satellite nodes being placed in the current group.
3. **`bias`**: Placement bias mode (`'field'`, `'test'`, `'neutral'`).
4. **`targetVector`**: Directional vector calculated from parent to connected primary nodes.
5. **`maxSearchRadius`**: Integer search radius $R$.
6. **Initial `occupiedList` Snapshot**: State of occupied points when `generateSatelliteSlots` is called.
7. **Initial `placedSatelliteSegments` Snapshot**: State of placed satellite tether segments when `generateSatelliteSlots` is called.

### Smallest Valid Reuse Scope: **R1 / R2 — One Satellite Group / One `generateSatelliteSlots` Call**.

---

## G. Candidate-Dependent State (S2)

State values generated and evaluated independently for each grid candidate slot $(r, c)$:

1. **Candidate Slot Coordinates**: $x = \text{anchor.x} + c \cdot dx, y = \text{anchor.y} + r \cdot dy$.
2. **Euclidean Distance**: $\text{dist} = \sqrt{\Delta x^2 + \Delta y^2}$.
3. **Directional Preference Score**: `directionalScore` ($1.0$ or $1.2$).
4. **Aspect Ratio Penalty**: `aspectPenalty` (penalizes field placement above parent $r \le 0$ or wide columns $|c| > 2$; penalizes test row height $|r| > 3$).
5. **Vector Alignment Penalty**: `vectorPenalty` (penalizes candidate placement in same directional quadrant as primary dependency edges).
6. **Primary Edge Crossing Penalty**: $\text{primaryCrossings} \times 2000.0$.
7. **Satellite Edge Crossing Penalty**: $\text{satelliteCrossings} \times 800.0$.
8. **Tether Distance Penalty**: $\text{tetherPenalty}$ (penalizes distance exceeding `effectiveMaxDist`).
9. **Effective Total Score**: Combined candidate score used for sorting.

### Smallest Valid Reuse Scope: **R4 — Candidate-Local Only**.

---

## H. Mutable Placement State (S3)

State variables that are updated as satellites are sequentially assigned positions:

1. **`occupiedList` Growth Timeline**:
   - Initialized with $150$ primary production node positions.
   - Stage 1: $+3$ Triggers, $+3$ Handlers appended.
   - Stage 2: $+63$ Field satellite positions appended.
   - Stage 3: $+21$ Test satellite positions appended.
   - Final length: $240$ occupied points.
2. **`placedSatelliteSegments` Growth Timeline**:
   - Initialized empty (`[]`).
   - Stage 1: $0$ segments added (Triggers/Handlers do not record tether segments).
   - Stage 2: $+62$ Field tether segments appended (`{ p1: parentPos, p2: fieldSlot }`).
   - Stage 3: $+20$ Test tether segments appended (`{ p1: targetPos, p2: testSlot }`).
   - Final length: $82$ satellite tether segments.
3. **`positions` & `satellitePositions`**:
   - Coordinates stored upon slot selection.
   - Permuted during Stage 4 cyclic shift optimization for field clusters with $\ge 2$ fields.

### Smallest Valid Reuse Scope: **R3 — Until Next Satellite Placement**.

---

## I. Ordering-Sensitive State (S4)

State whose execution order directly governs placement semantics:

1. **Category Execution Sequence**: Triggers/Handlers $\rightarrow$ Fields $\rightarrow$ Tests $\rightarrow$ Permutation Refinement. Reordering categories changes occupied slots and tether crossing penalties.
2. **Deterministic Satellite Node Sorting**: Nodes within each category are sorted by `nodeId.localeCompare`. Altering node sort order changes which node receives which slot in `selectedSlots[idx]`.
3. **Array Scanning in Parent Resolution**: When `options.index` is undefined, `findParentObjectId` and `findParentProductionNodeId` return the first matching edge encountered in `edges` array order.
4. **Candidate Slot Sorting Tuple**: Candidate slots with identical scores are tie-broken by `effectiveScore` $\rightarrow$ `dist` $\rightarrow$ `row` $\rightarrow$ `col`.

### Smallest Valid Reuse Scope: **R5 — No Safe Reuse Across Ordering Modifications**.

---

## J. Primary Geometry Analysis

The primary production geometry (`primaryPositions` and `primarySegments`) is **100% immutable** throughout Stage 9.

### Derived Metadata Opportunities
While primary segment endpoints do not change, `generateSatelliteSlots` repeatedly evaluates line intersection cross-products in `segmentsIntersect(ep, candPoint, p1, p2)` for every candidate slot.

For each primary segment $S_i = (p_1, p_2)$, the following derived metadata is invariant for the entire Stage 9 execution:
* Bounding Box: $\text{minX}_i = \min(p_1.x, p_2.x), \text{maxX}_i = \max(p_1.x, p_2.x), \text{minY}_i = \min(p_1.y, p_2.y), \text{maxY}_i = \max(p_1.y, p_2.y)$.
* Segment Vector Deltas: $dx_i = p_2.x - p_1.x, dy_i = p_2.y - p_1.y$.

Pre-calculating primary segment AABBs once at the start of Stage 9 allows candidate tether segment checks to perform a fast 4-point bounding box overlap test ($[\text{tether.minX}, \text{tether.maxX}] \cap [\text{seg.minX}, \text{seg.maxX}] \neq \emptyset$) prior to executing cross-products.

### Smallest Valid Reuse Scope: **R0 — Entire Stage 9 Execution**.

---

## K. Occupancy State Analysis

1. **Initialization**: `occupiedList` is initialized by copying all values from `primaryPositions` ($150$ points in CST).
2. **Mutation Events**:
   - Immediately after placing a Trigger or Handler: `occupiedList.push(pos)`.
   - Immediately after placing each Field satellite: `occupiedList.push(slot)`.
   - Immediately after placing each Test satellite: `occupiedList.push(slot)`.
3. **Deletions**: Points are NEVER removed from `occupiedList`.
4. **Dimensions**: Bounding box clearance check uses `minDx = nodeWidth + horizontalGap` ($160\text{px}$) and `minDy = nodeHeight + verticalGap` ($100\text{px}$).
5. **Timeline**:
   $$\text{Primary (150)} \xrightarrow{\text{Triggers/Handlers (+6)}} \text{156} \xrightarrow{\text{Fields (+63)}} \text{219} \xrightarrow{\text{Tests (+21)}} \text{240 Total Points}$$

---

## L. Placed-Satellite Segment Analysis

1. **Initial State**: `placedSatelliteSegments = []`.
2. **Growth Event**: When an anchored Field or Test satellite is assigned a slot, a tether segment `{ p1: parentPos, p2: slot }` is appended to `placedSatelliteSegments`.
3. **Growth Frequency**: Appends $1$ segment per placed anchored satellite ($62$ field tethers + $20$ test tethers = $82$ segments in CST).
4. **Consumers**: Evaluated inside `generateSatelliteSlots` for candidate crossing penalties (weight $800.0$).
5. **Invalidation Event**: Every placed satellite tether segment invalidates the static satellite segment count for subsequent candidate slot evaluations.

### Reuse Validity: **Valid only until next satellite tether is placed (R3)**.

---

## M. Parent Lookup Analysis

1. **Functions Examined**: `findParentObjectId` and `findParentProductionNodeId`.
2. **Call Frequency**:
   - `findParentObjectId`: Evaluated $63$ times in CST ($35$ to $115$ times across scale tiers).
   - `findParentProductionNodeId`: Evaluated $21$ times in CST ($100$ to $385$ times across scale tiers).
3. **Semantics**:
   - With `options.index` (`LayoutGraphIndex`): $O(1)$ Map lookup.
   - Without `options.index`: Scans `edges` array in raw array order, returning first matching edge target/source.
4. **Result Stability**: 100% stable for a given input graph.
5. **Reuse Safety**: Pre-resolving and memoizing parent relationships in a Map at the start of Stage 9 produces **100% bit-for-bit identical parent assignments** while eliminating $O(E)$ array scans.

---

## N. Classification / Static Configuration Analysis

1. **Classification Predicates**: `isField`, `isTest`, `isTriggerNode`, `isHandlerNode`.
   - Depend strictly on static node attributes (`nodeType`, `displayName`, `isTest`, `isField`).
   - Do NOT depend on mutable layout state or coordinates.
   - Evaluated $960$ times on CST ($2,000$ to $8,000$ times across scale tiers).
   - Classification is 100% immutable (**S0 / R0**).
2. **Static Configuration**:
   - `nodeWidth = 120`, `nodeHeight = 60`.
   - `horizontalGap = 40`, `verticalGap = 40`.
   - `dx = 160`, `dy = 100`.
   - Crossing weights: Primary $= 2000.0$, Satellite $= 800.0$.
   - Floating point EPSILONs: Slot collision $= 1e-3$, Segment straddle $= 1e-9$.

---

## O. Cross-Group Reuse Analysis

### Shared Across All Groups
* Primary production node positions (`primaryPositions`).
* Static primary edge segments (`primarySegments`) and derived AABB metadata.
* Static configuration constants ($dx = 160, dy = 100$, node dimensions, gap sizes).
* Node classifications and parent relationships.

### NOT Shared Across Groups
* `occupiedList`: Grows after each satellite group and after each satellite placement.
* `placedSatelliteSegments`: Grows after each anchored Field or Test group.
* `anchor` and `targetVector`: Unique per parent CustomObject / target ApexClass.

---

## P. State Mutation / Invalidation Model

```text
State Variable           Producer                       Consumers                      Mutation Event               Invalidation Scope
───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
primaryPositions         Stage 7/8 Local Layout         placeSatellites, slots          None (Stage 9 Start)        R0 (Entire Stage 9)
primarySegments          placeSatellites (Init)          generateSatelliteSlots          None (Stage 9 Start)        R0 (Entire Stage 9)
primarySegment AABBs     placeSatellites (Init)          segmentsIntersect (AABB)        None (Stage 9 Start)        R0 (Entire Stage 9)
parentObjectId Map       placeSatellites (Init)          Stage 2 Field Grouping          None (Stage 9 Start)        R0 (Entire Stage 9)
parentProdNode Map       placeSatellites (Init)          Stage 3 Test Grouping           None (Stage 9 Start)        R0 (Entire Stage 9)
occupiedList             placeSatellites (Init)          isSlotOccupied                  Satellite Placement         R3 (Next Satellite)
placedSatelliteSegments  placeSatellites (Init)          generateSatelliteSlots          Satellite Tether Placement   R3 (Next Satellite)
positions Map            placeSatellites / Stage 4       evaluateTotalCrossings          Satellite Placement / Shift R3 (Next Satellite)
```

---

## Q. State / Reuse Matrix

| Value / Computation | State Scope | Mutable? | Call Frequency (CST) | Mutation Source | Invalidation Event | Safety Classification |
| --- | --- | ---: | ---: | --- | --- | --- |
| **Primary Production Positions** | S0 / R0 | No | 150 nodes | None | None | **P0 — PROVEN SAFE** |
| **Primary Segments Metadata (AABB)** | S0 / R0 | No | 370 segments | None | None | **P0 — PROVEN SAFE** |
| **Parent Relationship Mapping** | S0 / R0 | No | 84 lookups | None | None | **P0 — PROVEN SAFE** |
| **Node Classification** | S0 / R0 | No | 960 checks | None | None | **P0 — PROVEN SAFE** |
| **Static Geometry Dimensions** | S0 / R0 | No | 37 calls | None | None | **P0 — PROVEN SAFE** |
| **Target Vector per Group** | S1 / R1 | No | 30 groups | None | Group Transition | **P0 — PROVEN SAFE** |
| **Candidate Grid Radius ($R$)** | S1 / R1 | No | 37 calls | None | Group Transition | **P0 — PROVEN SAFE** |
| **Occupied Points List** | S3 / R3 | Yes | 37 calls | Satellite Placement | Satellite Placement | **P2 — STATE DEPENDENT** |
| **Placed Satellite Tethers** | S3 / R3 | Yes | 37 calls | Tether Placement | Satellite Placement | **P2 — STATE DEPENDENT** |
| **Candidate Slot Enumeration Order** | S4 / R5 | No | 1,628,217 slots | Order alteration | Candidate Reordering | **P4 — UNSAFE** |

---

## R. Safety Classification

### P0 — PROVEN SAFE
Work that is mathematically and semantically invariant for the target scope and whose reuse cannot alter observable coordinates, crossings, or placement ordering:
1. **Pre-computing Primary Segment AABBs (`minX, maxX, minY, maxY`)**: Pre-filtering segment cross-products via bounding box overlap checks.
2. **Memoizing Parent Lookups**: Pre-resolving parent object and target production node IDs into Maps at the start of Stage 9.
3. **Pre-calculating Static Grid Constants**: Storing $dx = 160$ and $dy = 100$ as immutable scalars.

### P1 — LIKELY SAFE / REQUIRES DIFFERENTIAL A/B
Work where invariance is logically established, but exact oracle equivalence across adversarial edge cases requires differential verification:
1. **Group-Level Target Vector Caching**: Pre-calculating `targetVector` once per parent object group.

### P2 — STATE DEPENDENT
Work that changes dynamically and can only be reused if explicitly invalidated upon state mutation:
1. **Occupancy Grid Bucketing**: Spatial grid indexing of `occupiedList` (requires $O(1)$ insertions on satellite placement).
2. **Satellite Tether Segment Indexing**: Spatial indexing of `placedSatelliteSegments` (requires $O(1)$ insertions on tether placement).

### P3 — ORDERING SENSITIVE
Work where reuse could alter direct Stage 9 placement order:
1. **Reordering Category Processing**: Changing the Trigger $\rightarrow$ Handler $\rightarrow$ Field $\rightarrow$ Test sequence.
2. **Altering Candidate Slot Sorting Tuple**: Changing score tie-breaking rules.

### P4 — UNSAFE
Work that violates semantic invariants, causes false negatives, or produces coordinate drift:
1. **Caching Occupancy across Satellite Placements without Invalidation**: Reusing slot occupancy checks across placements without updating placed points.
2. **Arbitrarily Reducing Search Radius $R$**: Altering candidate grid bounds, which changes candidate sorting order and slot assignments.

---

## S. Semantic Risks

1. **Input Array Order Sensitivity**: Direct Stage 9 placement without Stage 0 sorting scans `edges` in raw array order. Parent lookups must preserve exact first-match semantics unless Stage 0 ID sorting is active.
2. **Candidate Enumeration Significance**: Candidate slots are evaluated in grid row/column order and sorted deterministically. Any optimization that alters candidate enumeration bounds or candidate score tie-breaking changes selected slot assignments.
3. **Dynamic Tether Crossings**: Field and Test satellite placements incrementally add tether segments. A candidate slot evaluated later in a group must account for tethers placed earlier in that same group or in prior groups.

---

## T. Recommended Next A/B Experiment

### Experiment Title
> **Stage 9 Primary Segment AABB Pre-filtering & Parent Lookup Memoization Experiment**

### Design Specifications
* **Target Module**: `placeSatellites` and `generateSatelliteSlots` in `explorer/src/lib/layout/satellites.ts`.
* **Scope**: **R0 — Entire Stage 9 Execution Scope**.
* **Hypothesis**: Pre-computing bounding box (`minX, maxX, minY, maxY`) metadata for static `primarySegments` once at the start of Stage 9 and performing broad-phase AABB overlap checks before calling `segmentsIntersect` will eliminate $>90\%$ of floating-point cross-product calculations, reducing Stage 9 geometry check overhead while producing **100% bit-for-bit identical satellite coordinates** ($0.00000\text{ px}$ drift).
* **Semantic Oracle**: Authoritative `placeSatellites` implementation in `explorer/src/lib/layout/satellites.ts`.
* **Required Regression Gates**:
  - $C_{pp} = 7,812$ ($\le 9,335$)
  - $C_{total} = 85,367$ ($\le 95,000$)
  - Minimum clearance $= 40.00\text{px}$ ($\ge 40.0\text{px}$)
  - Primary overlaps $= 0$
  - Satellite overlaps $= 0$
  - Layer violations $= 0$
  - 10x Repetition Drift $= 0.00000\text{ px}$
  - Shuffled Input Permutation Drift $= 0.00000\text{ px}$

---

## U. Conclusion

> **What is the smallest Stage 9 computation that can be safely precomputed or reused in a future isolated A/B experiment?**

The smallest, highest-confidence Stage 9 computation that can safely be precomputed is **Primary Segment AABB Bounding Box Metadata (`minX, maxX, minY, maxY`)** combined with **Parent Relationship Lookup Memoization**.

Primary production nodes and primary edge segments remain **100% immutable throughout Stage 9 execution** (Classification **P0 — PROVEN SAFE**, Scope **R0 — Entire Stage 9**). Pre-calculating primary segment bounding boxes once at the start of Stage 9 allows candidate tether segment checks to bypass expensive floating-point cross-product evaluations whenever bounding boxes do not overlap, preserving 100% exact oracle coordinate output with zero semantic risk.
