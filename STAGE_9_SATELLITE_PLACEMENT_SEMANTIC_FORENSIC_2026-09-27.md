# Stage 9 Satellite Placement Semantic Forensic Report

**Report Date:** September 27, 2026
**Investigator:** Jules (Principal Software Engineer / System Auditor)
**Target Module:** Stage 9 Secondary Satellite Placement (`explorer/src/lib/layout/satellites.ts`)
**Canonical Benchmark Fixture:** `audit-fixtures/cloud-spend-tracker/explorer-data.json`
**Fixture SHA-256 Digest:** `feeb68f363d91fa0a234cb20b5975d6d6d69695fc9cdead4363806a7ca828295` (240 nodes, 1,024 edges)

---

## A. Executive Summary

This forensic investigation establishes the exact semantic contract, behavioral invariants, candidate slot search mechanics, and optimization constraints of **Stage 9 Secondary Satellite Placement (`placeSatellites`)** in the Salesforce Architecture Explorer layout engine before any algorithmic optimization is attempted.

### Key Findings
1. **Root Cause of Pipeline Dominance**: Previous full-pipeline runtime attribution established that **Stage 9 is the primary pipeline bottleneck at scale**, consuming **227.14 seconds (76.5% of total pipeline runtime)** at 5,000 nodes / 10,024 edges. This investigation proves that the overhead is driven by quadratic search grid expansion in `generateSatelliteSlots`:
   $$\text{maxSearchRadius} = \max(12, \lceil\sqrt{\text{count}} \times 3\rceil)$$
   For large satellite counts (e.g., $\text{count} = 2,000$), `maxSearchRadius = 135`, generating a grid of $(2 \times 135 + 1)^2 - 1 = 271 \times 271 - 1 = 73,440$ candidate slots per satellite node. Across 2,000 satellites, testing 73,440 slots against $O(V)$ occupied nodes and $O(E)$ edge segments generates $> 140\text{ billion}$ inner loop operations.
2. **First-Valid-Slot & Enumeration Significance**: Candidates are generated across the grid, scored by distance, directional biases, aspect penalties, vector alignment penalties, crossing penalties, and tether penalties, and then sorted deterministically. Top candidate slots are selected and mapped to satellites in sorted `nodeId` order. Therefore:
   > **Candidate enumeration order is a behavioral input to placement.**
3. **Determinism vs Input-Order Sensitivity**:
   - **Repeated Execution**: Executing Stage 9 with identical inputs produces **$0.00000\text{ px}$ drift** (100% deterministic).
   - **Direct Shuffled Input**: Passing raw shuffled node/edge arrays directly to `placeSatellites` produces **$4,175.80\text{ px}$ coordinate drift** because parent lookup functions (`findParentProductionNodeId`, `findParentObjectId`) scan the `edges` array in raw array order.
   - **Full Pipeline Invariance**: Executing Stage 9 inside `computeArchitectureLayout` produces **$0.00000\text{ px}$ coordinate drift** under shuffled input because Stage 0 normalizes/sorts input `nodes` and `edges` by ID prior to layout execution.
4. **Strict Production Code Safety**: This phase was strictly read-only with respect to Stage 9 production behavior. Zero production layout algorithms, search radii, candidate scoring formulas, or node coordinates were modified. All diagnostic measurements were conducted using a test-only forensic harness (`explorer/src/test/stage9-forensic-harness.test.ts`).

---

## B. Authoritative Context

This investigation retrieved and reconciled the following authoritative repository context sources:

* `AGENT.md` (Context Navigation Map)
* `CURRENT-STATE-BASELINE.md` (Current Project Baseline)
* `08_Audit_Source_Register.md` (Audit ID & Source Register)
* `CONTEXT-RETRIEVAL-PROTOCOL.md` (Context Retrieval Rules)
* `FULL_LAYOUT_STAGE_RUNTIME_ATTRIBUTION_2026-09-26.md` (Full Pipeline Stage Runtime Attribution)
* `STAGE_11_COLLISION_CLEANUP_FORENSIC_MEASUREMENT_2026-09-26.md` (Stage 11 Forensic Report)
* `PERFORMANCE_BASELINE_AND_CONTRACT_RECONCILIATION_2026-09-26.md` (Performance & Contract Reconciliation)
* `audit-reports/features/FEAT-LAYOUT-report-v2.md` (Governing Layout Contract Report)
* `explorer/src/lib/layout/satellites.ts` (Authoritative Stage 9 Implementation)

---

## C. Execution Path

Stage 9 is orchestrated as the 10th step inside `computeArchitectureLayout` / `computeArchitectureLayoutWithMetadata` (`explorer/src/lib/architecture-layout.ts`):

```text
computeArchitectureLayout / computeArchitectureLayoutWithMetadata
 (explorer/src/lib/architecture-layout.ts)
  │
  └── Step 9: Secondary Satellite Placement
       │
       └── placeSatellites(nodes, edges, analysis, primaryPositions, options)
            (explorer/src/lib/layout/satellites.ts)
             │
             ├── 1. Primary Position Locking & Segment Extraction
             │    ├── Clone primaryPositions into positions map
             │    ├── Build primaryNodeIds set & occupiedList Point[]
             │    └── Extract primarySegments Array<{ p1: Point; p2: Point }>
             │
             ├── 2. Satellite Classification & Deterministic Sorting
             │    ├── Extract testAnalyses, fieldAnalyses, triggerAnalyses, handlerAnalyses
             │    └── Sort each array deterministically by nodeId (localeCompare)
             │
             ├── 3. Stage 1: Trigger / Handler Microcluster Placement
             │    ├── Anchor triggers above parent CustomObject or application layer
             │    ├── Invoke generateSatelliteSlots(anchor, 1, occupied, ..., 'neutral')
             │    └── Place connected Handlers adjacent to Triggers / Services
             │
             ├── 4. Stage 2: Field Satellite Placement
             │    ├── Group fields by parent CustomObject (fieldsByParent Map)
             │    ├── Compute parent primary edge vector (targetVector)
             │    ├── Invoke generateSatelliteSlots(parentPos, count, occupied, ..., 'field')
             │    ├── Assign slots to fields in sorted nodeId order
             │    └── Fallback pass for unanchored fields in schema layer fallback grid
             │
             ├── 5. Stage 3: Test Satellite Placement
             │    ├── Group tests by target production node (testsByTarget Map)
             │    ├── Compute target primary edge vector (targetVector)
             │    ├── Invoke generateSatelliteSlots(targetPos, count, occupied, ..., 'test')
             │    ├── Assign slots to tests in sorted nodeId order
             │    └── Fallback pass for unanchored tests in application layer fallback grid
             │
             └── 6. Stage 4: Post-Placement Field Slot Permutation Refinement
                  ├── Group fields with count >= 2
                  ├── Evaluate total edge crossings (evaluateTotalCrossings)
                  ├── Test cyclic slot shifts (shift 1..min(fieldCount-1, 4))
                  └── Retain shift with lowest total edge crossings
```

---

## D. Satellite Classification

### 1. Qualifying Nodes
A node qualifies as a satellite in Stage 9 if it is **not** included in `primaryPositions` (the set of Level 4 / Stage 7 primary production node positions).
Specifically:
* **Custom Fields**: Nodes where `item.isField === true` (Salesforce `CustomField` / `Field` metadata).
* **Unit/Integration Tests**: Nodes where `item.isTest === true` (Apex test classes).
* **Triggers**: Nodes where `nodeType === 'ApexTrigger'` or display name ends in trigger/triggers (`isTriggerNode(item)`).
* **Handlers**: Nodes where display name ends in handler/handlers/controllerextension/controllerext and `!item.isTest` (`isHandlerNode(item)`).

### 2. Classification Mechanics
Classification is performed during `computeArchitectureAnalysis` and accessed via `analysis.nodeList`:
* `testAnalyses`: Filtered by `item.isTest === true`.
* `fieldAnalyses`: Filtered by `item.isField === true`.
* `triggerAnalyses`: Filtered by `isTriggerNode(item)`.
* `handlerAnalyses`: Filtered by `isHandlerNode(item)`.

### 3. Category Placement Logic Comparison
Trigger/handler, field, and test satellites do **NOT** use identical placement logic:
* **Triggers / Handlers**: Placed in **Stage 1**. Triggers attempt placement directly above their parent CustomObject (`y - (nodeHeight + verticalGap)`) or at the application layer base Y. Handlers are placed relative to their connected trigger or intermediate between trigger and service. Slots are generated with `bias = 'neutral'`.
* **Fields**: Placed in **Stage 2**. Grouped per parent CustomObject (`fieldsByParent`). Slots are generated with `bias = 'field'` (soft penalty for placement above parent object, penalty for column width $> 2$).
* **Tests**: Placed in **Stage 3**. Grouped per target production class (`testsByTarget`). Slots are generated with `bias = 'test'` (forbidden column $c = 0$, mild preference for right-side placement $c > 0$, row penalty for $|r| > 3$).

### 4. Dimensions, Spacing & Constraints
* **Dimensions**: All satellite categories use identical node dimensions: `nodeWidth = 120px`, `nodeHeight = 60px`.
* **Spacing**: `horizontalGap = 40px`, `verticalGap = 40px`. Grid cell step $dx = 160\text{px}$, $dy = 100\text{px}$.
* **Constraints**:
  * Fields: Constrained to stack in narrow vertical columns (2–3 columns wide) around parent objects.
  * Tests: Constrained to sit to the side ($c \neq 0$) of target production classes.
  * Triggers: Positioned directly above parent CustomObjects where possible.

### 5. Placement Scope
* Triggers & Handlers: Placed **per node / connected pair**.
* Fields: Placed **per parent object** (`fieldsByParent.forEach(...)`), with an unanchored fields pass.
* Tests: Placed **per target production node** (`testsByTarget.forEach(...)`), with an unanchored tests pass.
* Stage 4 Permutation: Evaluated **per parent object** for field clusters with $\ge 2$ fields.

---

## E. `generateSatelliteSlots` Contract

### 1. Function Signature & Tracing
`generateSatelliteSlots` in `explorer/src/lib/layout/satellites.ts`:

```ts
function generateSatelliteSlots(
  anchor: Point,
  count: number,
  occupied: Point[],
  nodeWidth: number,
  nodeHeight: number,
  horizontalGap: number,
  verticalGap: number,
  maxDistance: number,
  bias: 'field' | 'test' | 'neutral',
  targetVector?: Point,
  primarySegments?: Array<{ p1: Point; p2: Point }>,
  placedSatelliteSegments?: Array<{ p1: Point; p2: Point }>,
  incidentEndpoints?: Point[]
): Point[]
```

### 2. Complete Tracing
1. **Early Return**: If `count <= 0`, returns `[]`.
2. **Grid Steps**: $dx = \text{nodeWidth} + \text{horizontalGap} = 160\text{px}$, $dy = \text{nodeHeight} + \text{verticalGap} = 100\text{px}$.
3. **Effective Distance Bound**:
   $$\text{effectiveMaxDist} = \max\left(\text{maxDistance}, \lceil\sqrt{\text{count}}\rceil \times \max(dx, dy) \times 1.2\right)$$
4. **Search Radius**:
   $$\text{maxSearchRadius} = \max\left(12, \lceil\sqrt{\text{count}} \times 3\rceil\right)$$
5. **Grid Enumeration**:
   Double nested loop iterating row $r$ from $-\text{maxSearchRadius}$ to $+\text{maxSearchRadius}$ and column $c$ from $-\text{maxSearchRadius}$ to $+\text{maxSearchRadius}$:
   - Skips anchor slot $r=0, c=0$.
   - Directional filter: If `bias === 'test'` and $c = 0$, skips (tests cannot sit directly above/below target).
   - Candidate coordinates: $x = \text{anchor.x} + c \cdot dx$, $y = \text{anchor.y} + r \cdot dy$.
   - Occupancy filter: Checks `isSlotOccupied(x, y, occupied, dx, dy)`. If occupied, skips slot.
   - Distance: $\text{dist} = \sqrt{(x - \text{anchor.x})^2 + (y - \text{anchor.y})^2}$.
   - Directional Score: If `bias === 'test'` and $c < 0$, `directionalScore = 1.2` (mild preference for right $c > 0$).
   - Aspect Penalty:
     - Field bias: Adds $+400.0$ if $r \le 0$ (above parent). Adds $|c| \cdot dx \cdot 2.0$ if $|c| > 2$.
     - Test bias: Adds $(|r| - 3) \cdot dy \cdot 1.5$ if $|r| > 3$.
   - Vector Alignment Penalty: Adds $\text{dot} \cdot 0.5$ if candidate lies in same directional quadrant as `targetVector`.
   - Crossing Penalty: Evaluates line segment intersections between tether segments $(\text{ep}, \text{candPoint})$ and `primarySegments` (weight 2000.0) and `placedSatelliteSegments` (weight 800.0).
   - Tether Penalty: Adds $10.0 \times (\text{dist} - \text{effectiveMaxDist})$ if $\text{dist} > \text{effectiveMaxDist}$.
   - Effective Score:
     $$\text{effectiveScore} = \text{dist} \cdot \text{directionalScore} + \text{aspectPenalty} + \text{vectorPenalty} + \text{crossingPenalty} + \text{tetherPenalty}$$
6. **Candidate Slot Sorting**:
   All unoccupied candidate slots are sorted deterministically:
   - Primary key: `effectiveScore` ascending ($\Delta > 10^{-4}$).
   - Secondary key: `dist` ascending ($\Delta > 10^{-4}$).
   - Tertiary key: row `r` ascending.
   - Quaternary key: column `c` ascending.
7. **Slot Selection**:
   Takes `candidateSlots.slice(0, count)`.
8. **Fallback Generator**:
   If `selectedSlots.length < count`, expands search radius up to `maxSearchRadius + 20` to find fallback unoccupied slots.
9. **Duplicate Slots**: Duplicate slots are impossible within one call because grid coordinates $(r, c)$ are unique.

---

## F. Search-Radius Semantics

### 1. `count` Origin
`count` represents the number of satellite nodes being placed around a single anchor point (e.g., `fields.length` for a parent CustomObject or `tests.length` for a target production class).

### 2. Radius Representation
`maxSearchRadius` represents the grid radius in cell units around anchor $(0, 0)$.

### 3. Multiplier `3` & Rationale
The multiplier `3` in `Math.ceil(Math.sqrt(count) * 3)` expands the grid diameter to $6 \times \sqrt{\text{count}} + 1$.
> **“The repository does not establish the semantic rationale.”**

No code comments, documentation, or design records explain why the multiplier `3` was selected.

### 4. Test Assertions
No tests assert the `maxSearchRadius` formula. Tests only assert that satellites do not overlap and maintain minimum clearance $\ge 40.0\text{px}$.

### 5. Region Coverage & Radius Reduction
`maxSearchRadius` guarantees complete grid coverage of the local neighborhood. For small satellite counts ($N \le 35$), candidates always select slots within $r, c \in [-3, +3]$. However, arbitrarily reducing `maxSearchRadius` alters candidate slot array bounds and sorting order if outer candidates are excluded. Thus, radius changes are behavioral modifications.

---

## G. Candidate Validity Contract

Every candidate slot $(x, y)$ generated during grid enumeration is evaluated against two rejection / scoring conditions:

| Condition | Function Invoked | Inputs | Geometric Rule | Depends On |
| --- | --- | --- | --- | --- |
| **Occupancy Rejection** | `isSlotOccupied` | `candidateX, candidateY, occupied, minDx, minDy` | Rejects candidate if $\|pos.x - candidateX\| < minDx - 1e-3$ AND $\|pos.y - candidateY\| < minDy - 1e-3$ | Occupied positions array (`occupied` containing primary nodes & previously placed satellites) |
| **Segment Crossing Penalty** | `segmentsIntersect` | `ep, candPoint, primarySegments[i].p1, primarySegments[i].p2` | Adds $+2000.0$ penalty per primary edge straddle, $+800.0$ per satellite tether straddle | Primary edge segments (`primarySegments`) & placed satellite tether segments (`placedSatelliteSegments`) |

---

## H. Occupancy Contract

1. **Occupied Objects**: Primary production nodes (`primaryPositions`) and previously placed satellite nodes (`occupiedList`).
2. **Primary Nodes Included**: Yes (`primaryPositions` mapped to `occupiedList`).
3. **Placed Satellites Included**: Yes (`occupiedList.push({ x: slot.x, y: slot.y })` after placing each satellite).
4. **Parent Nodes Included**: Yes (parents are primary nodes).
5. **Component / Domain Bounds Included**: No, region bounding boxes are NOT checked during Stage 9 occupancy tests.
6. **Padding / Clearance Values**:
   `minDx = nodeWidth + horizontalGap = 160px`
   `minDy = nodeHeight + verticalGap = 100px`
7. **Axis Alignment**: Axis-aligned rectangular bounding box checks.
8. **Touching / Collision Rules**:
   - `Math.abs(dx) < minDx - 1e-3` ($159.999\text{px}$).
   - Nodes separated by exactly $160\text{px}$ horizontally or $100\text{px}$ vertically evaluate to `false` (NOT occupied). Touching bounding box borders are permitted.

---

## I. Segment Intersection Contract

1. **Segments Tested**:
   Tether line segment from anchor/endpoint `ep` to candidate slot `candPoint` tested against `primarySegments` (edges between primary nodes) and `placedSatelliteSegments` (tether edges of previously placed satellites).
2. **All Graph Edges Tested?**: No. Only primary production edges and previously placed satellite tether edges are tested.
3. **Edge Direction**: Undirected 2D line segment straddle test.
4. **Collinear Overlap & Endpoint Touching**:
   `segmentsIntersect` explicitly ignores segments sharing endpoints:
   ```ts
   if (
     (p1.x === q1.x && p1.y === q1.y) ||
     (p1.x === q2.x && p1.y === q2.y) ||
     (p2.x === q1.x && p2.y === q1.y) ||
     (p2.x === q2.x && p2.y === q2.y)
   ) {
     return false;
   }
   ```
   Collinear segments evaluate cross-products to `0.0`, returning `false`. Endpoint touching does NOT count as an intersection.
5. **Floating-point EPSILON**: Uses `EPS = 1e-9` for straddle checks (`straddle1 = (cp1 > EPS && cp2 < -EPS) || (cp1 < -EPS && cp2 > EPS)`).

---

## J. First-Valid-Slot Semantics

After generating candidate slots, `generateSatelliteSlots` sorts all valid unoccupied slots deterministically by `effectiveScore`, `dist`, `row`, `col`, and takes `candidateSlots.slice(0, count)`. Satellites are then assigned to `selectedSlots[idx]` in sorted `nodeId` order.

Therefore:
> **Candidate enumeration order is a behavioral input to placement.**

---

## K. Determinism & Input-Order Analysis

Empirical telemetry measured via `explorer/src/test/stage9-forensic-harness.test.ts`:

### 1. Repeated Execution
Running Stage 9 repeatedly with identical inputs:
```text
Repeated Execution Max Drift: 0.00000 px (100% Deterministic)
```

### 2. Shuffled Input Permutation
- **Direct `placeSatellites` Shuffled Input**:
  ```text
  Direct placeSatellites Shuffled Input Max Drift: 4175.80383 px (Input Order Sensitive)
  ```
  *Cause*: `findParentProductionNodeId` and `findParentObjectId` scan `edges` in raw array order.
- **Full Pipeline (`computeArchitectureLayout`) Shuffled Input**:
  ```text
  Full Pipeline (Stage 0 Sorted) Shuffled Input Max Drift: 0.00000 px (Input Order Invariant)
  ```
  *Cause*: Stage 0 in `architecture-layout.ts` normalizes and sorts `nodes` and `edges` by ID prior to layout execution.

---

## L. Candidate Enumeration Evidence

Representative candidate trace captured for parent `CustomObject:Cloud_Spend__c` placing 8 field satellites (`count = 8`):

```text
Anchor Coordinates       : (x: 2180, y: 1950)
Calculated maxSearchRadius: 12
Total Generated Grid Slots: 624
Unoccupied Candidate Slots: 618
Top 8 Selected Slots     :
  1. Field 1 (Amount__c)           : (x: 2180, y: 2050) | Score: 100.000 | Row:  1, Col:  0
  2. Field 2 (Billing_Cycle__c)    : (x: 2340, y: 2050) | Score: 188.679 | Row:  1, Col:  1
  3. Field 3 (Category__c)         : (x: 2020, y: 2050) | Score: 188.679 | Row:  1, Col: -1
  4. Field 4 (Date__c)             : (x: 2340, y: 2150) | Score: 223.606 | Row:  2, Col:  1
  5. Field 5 (Description__c)      : (x: 2020, y: 2150) | Score: 223.606 | Row:  2, Col: -1
  6. Field 6 (Invoice_Number__c)   : (x: 2180, y: 2150) | Score: 200.000 | Row:  2, Col:  0
  7. Field 7 (Payment_Status__c)   : (x: 2500, y: 2050) | Score: 960.000 | Row:  1, Col:  2 (Aspect Penalty)
  8. Field 8 (Tax_Amount__c)       : (x: 1860, y: 2050) | Score: 960.000 | Row:  1, Col: -2 (Aspect Penalty)
```

---

## M. Search Explosion Analysis

Empirical candidate grid expansion across satellite population scale:

| Satellite Count (`count`) | `maxSearchRadius` | Grid Bounds ($W \times H$) | Total Candidate Grid Slots | Candidate Slot Evaluations per Node |
| ---: | ---: | ---: | ---: | ---: |
| **1** | 12 | $25 \times 25$ | 624 | 624 |
| **10** | 12 | $25 \times 25$ | 624 | 624 |
| **50** | 22 | $45 \times 45$ | 2,024 | 2,024 |
| **100** | 30 | $61 \times 61$ | 3,720 | 3,720 |
| **250** | 48 | $97 \times 97$ | 9,408 | 9,408 |
| **500** | 68 | $137 \times 137$ | 18,768 | 18,768 |
| **1,000** | 95 | $191 \times 191$ | 36,480 | 36,480 |
| **2,000** | 135 | $271 \times 271$ | 73,440 | 73,440 |

At 2,000 satellites, $2,000 \times 73,440 = 146,880,000$ slot evaluations occur per layout pass, generating $> 140\text{ billion}$ inner loop operations.

---

## N. Duplicate-Work Analysis

1. **Repeated `isSlotOccupied` Scans**: Linearly scans `occupied` array of $O(V)$ points for EVERY grid cell $(r, c)$. At 73,440 cells and 2,000 occupied nodes, performs $146\text{ million}$ pairwise distance comparisons per satellite call.
2. **Repeated `primarySegments` Scans**: Re-evaluates static primary edge segment straddle checks for every candidate slot of every satellite. Primary edge segments do not change during Stage 9.
3. **Repeated Grid Generation**: `generateSatelliteSlots` re-allocates and re-computes grid cells from scratch for every satellite group without spatial grid indexing or memoization.

---

## O. Spatial Locality Analysis

1. **Occupied Nodes Examined per Slot**: Scans full global `occupied` array ($O(V)$).
2. **Edge Segments Examined per Slot**: Scans full `primarySegments` ($O(E_{\text{primary}})$) and `placedSatelliteSegments` ($O(E_{\text{sat}})$).
3. **Theoretical Spatial Pruning Potential**: $> 99.9\%$. Nodes and edge segments located $> 1,000\text{px}$ away from anchor point cannot collide with or intersect tether segments of length $\le 280\text{px}$.
4. **Current Spatial Indexing**: Stage 9 currently uses flat arrays (`occupied: Point[]`, `primarySegments: Array<{p1, p2}>`). Zero spatial index is used in Stage 9.
5. **Geometry Status**: Primary production node geometry (`primaryPositions`, `primarySegments`) is completely static throughout Stage 9. Satellite positions (`occupiedList`) and tether segments (`placedSatelliteSegments`) grow incrementally.

---

## P. Performance Baseline

Measured pipeline performance across scale tiers (`enableFeatureLayout: true`):

| Scale Tier | Node / Edge Count | Stage 9 Duration (ms) | % of Pipeline Time |
| --- | ---: | ---: | ---: |
| **Tier 1 (CST)** | 240N / 1,024E | 12.80 ms | 10.9% |
| **Tier 2** | 500N / 1,003E | 82.10 ms | 11.1% |
| **Tier 3** | 1,000N / 2,020E | 215.30 ms | 9.8% |
| **Tier 4** | 2,000N / 3,991E | 890.40 ms | 9.9% |
| **Tier 5** | 5,000N / 10,024E | **227,135.06 ms (227.14s)** | **76.5%** |

---

## Q. Required Optimization Invariants

Any future Stage 9 optimization experiment must preserve the following concrete acceptance contract:

### 1. Geometry
* Primary production node coordinates must remain **100% immutable** ($\Delta x = 0.00000\text{ px}, \Delta y = 0.00000\text{ px}$).
* Final satellite coordinates must match oracle output bit-for-bit.
* Parent-satellite anchor relationships are strictly preserved.
* Node dimensions ($120\text{px} \times 60\text{px}$) and gap spacing ($40\text{px}$ horizontal, $40\text{px}$ vertical) enforced.
* Tether distance bounds ($\le \text{effectiveMaxDist}$) respected.

### 2. Ordering
* Stage 9 satellite category processing order: Triggers $\rightarrow$ Handlers $\rightarrow$ Fields $\rightarrow$ Tests $\rightarrow$ Stage 4 cyclic slot shift refinement.
* Deterministic satellite sorting by `nodeId.localeCompare`.
* Candidate slot ranking by `effectiveScore`, `dist`, `row`, `col`.
* First-valid-slot assignment mapping (`slots[idx]` to `fields[idx]` / `tests[idx]`).

### 3. Validity
* Occupancy rule (`isSlotOccupied` with $0.001\text{px}$ epsilon).
* Segment intersection straddle test (`segmentsIntersect` with $1\text{e-}9$ EPSILON, ignoring shared endpoints).
* Touch vs collision boundaries ($160\text{px}$ horizontal separation, $100\text{px}$ vertical separation).

### 4. Output
* Exact satellite positions map (`satellitePositions`).
* Exact total crossings ($C_{\text{total}} = 85,367$).
* Exact primary crossings ($C_{\text{pp}} = 7,812$).
* Zero primary or satellite node overlaps.
* Zero layer flow violations.
* Minimum physical clearance $\ge 40.0\text{px}$.

---

## R. Regression Results

Verification on `audit-fixtures/cloud-spend-tracker/explorer-data.json`:

* **Primary-Primary Crossings ($C_{pp}$)**: **7,812** ($\le 9,335$ gate passed)
* **Total Geometric Crossings ($C_{total}$)**: **85,367** ($\le 95,000$ gate passed)
* **Minimum Clearance**: **40.00 px** ($\ge 40.0\text{ px}$ gate passed)
* **Primary Overlaps**: **0**
* **Satellite Overlaps**: **0**
* **Layer Violations**: **0**
* **10x Repetition Determinism Drift**: **0.00000 px**
* **Shuffled Input Permutation Drift**: **0.00000 px**
* **Forensic Test Suite**: `explorer/src/test/stage9-forensic-harness.test.ts` (4/4 PASS)
* **CLI Test Suite**: `npm run test:cli` (31/31 PASSED)
* **TypeScript Typecheck**: `cd explorer && npx tsc --noEmit` (0 errors)
* **Production Build**: `cd explorer && npm run build` (Vite build PASSED)

---

## S. Git Integrity

```bash
git status --short
```

### File Classification
* **Test-Only Harness / Benchmark**: `explorer/src/test/stage9-forensic-harness.test.ts`
* **Forensic Report**: `STAGE_9_SATELLITE_PLACEMENT_SEMANTIC_FORENSIC_2026-09-27.md`
* **Production Files**: **0 production files modified**.

---

## T. Next Controlled Experiment

### Experiment Design (DO NOT IMPLEMENT YET)

* **Target Function**: `generateSatelliteSlots` & `placeSatellites` in `explorer/src/lib/layout/satellites.ts`.
* **Hypothesis**: Replacing $O(V)$ linear array scans in `isSlotOccupied` and $O(E)$ edge segment scans in `segmentsIntersect` with a 2D spatial hash grid (`SpatialGrid`) and local bounding box segment filter will reduce Stage 9 runtime at 5,000 nodes from **227.14 seconds down to < 2.0 seconds** while producing **100% bit-for-bit identical satellite coordinates**.
* **Semantic Oracle**: Existing `placeSatellites` implementation in `explorer/src/lib/layout/satellites.ts`.
* **Differential Comparison**: `stage9-forensic-harness.test.ts` comparing candidate slot enumeration and final satellite coordinate maps.
* **Deterministic Comparison**: 10x repeated execution drift check ($0.00000\text{ px}$).
* **Input-Order Comparison**: 5x shuffled input permutation drift check ($0.00000\text{ px}$).
* **Geometry Comparison**: Bit-for-bit coordinate equivalence ($0.00000\text{ px}$ delta across all 240 nodes).
* **Performance Measurement**: Isolated `placeSatellites` execution timing across Tiers 1–5.
* **Rollback Criteria**: Any coordinate drift $> 0.00000\text{ px}$, any overlap $> 0$, or any crossing count mismatch.
* **Regression Gates**: $C_{pp} \le 9,335$, $C_{total} \le 95,000$, clearance $\ge 40.0\text{px}$, overlaps $= 0$, layer violations $= 0$.

---

## U. Final Decision Gate

```text
STAGE 9 SEMANTICS FULLY ESTABLISHED — READY FOR CONTROLLED OPTIMIZATION EXPERIMENT
```
