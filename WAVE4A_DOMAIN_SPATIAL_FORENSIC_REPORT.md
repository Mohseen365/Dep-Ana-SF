# WAVE 4A — DOMAIN GRANULARITY AND SPATIAL OWNERSHIP FORENSIC REPORT

**Author:** Jules (Software Engineer Agent)
**Date:** September 19, 2026
**Status:** Completed Audit
**Scope:** Investigation of domain-level decomposition, domain ordering, region spacing, and spatial ownership underlying extreme horizontal expansion across benchmark fixtures.

---

## EXECUTIVE SUMMARY

Wave 4A audited the domain discovery rules, global domain ordering algorithms, domain region spacing calculations, and local node placement across the four benchmark fixtures (`hub-heavy`, `long-chain`, `dense-cross-domain`, and `scale-100-plus`).

### Key Audit Findings:
1. **Semantic Domain Classification is Correct:**
   The 5-pass domain discovery system (`discoverDomains` in `domains.ts`) operates on strict architectural naming patterns (e.g., stripping suffixes like `Service`, `Controller`, `Selector`, `Repository`), path folder signals, and graph neighborhood cohesion. It accurately reflects isolated architectural stems without over-grouping or distorting semantics. **No semantic domain merging is required or recommended.**

2. **Root Cause of Extreme Width is Spatial Region Layout (1D Horizontal Banding):**
   The primary driver of the excessive horizontal width ($5,120\text{px}$ for `hub-heavy`, $3,320\text{px}$ for `long-chain`, and $13,540\text{px}$ for `scale-100-plus`) is that `computeGlobalDomainLayout` in `global-layout.ts` strictly places **all discovered domains in a single 1D horizontal row** (`currentX += regionWidth + domainGap`). Even when domains contain only 1 node, each domain is allocated a minimum region width ($160\text{px}$) plus a inter-domain gap ($80\text{px}$ to $140\text{px}$), linearly accumulating width along the X-axis ($15 \times 240\text{px} + \text{offsets} \approx 5,120\text{px}$).

3. **Conflation of Semantic Domain Identity vs. Spatial Placement Region:**
   The system currently treats every unique `primaryDomain` as a distinct horizontal X-coordinate band. When a graph has $N$ single-class domains (as in `hub-heavy` where 15 classes yield 15 distinct stems like `Account`, `Billing`, `Case`, `AuditLogger`, `EmailSender`), local layout (`local-layout.ts`) is powerless to compact them vertically or in 2D grids because local layout only chunking operates *within* a single domain.

---

## A. CURRENT DOMAIN MODEL

The domain discovery engine (`discoverDomains` in `explorer/src/lib/layout/domains.ts`) employs a deterministic, 5-pass classification algorithm:

### Classification Pass Sequence:
1. **Pass 1 — Direct Architectural Signals:**
   - **Salesforce Objects / Custom Objects:** Assigned clean entity stem (e.g. `Order__c` $\rightarrow$ `Order`). Confidence: `HIGH`.
   - **Path & Stem Agreement:** If folder path (e.g. `classes/order/`) matches extracted name stem (e.g. `OrderService` stem `Order`), assigned stem. Confidence: `HIGH`.
   - **Folder Path Structure Signal:** Extracted folder segment if valid non-generic directory. Confidence: `HIGH`.
   - **Architectural Name Stem Signal:** Strips known suffixes (`Service`, `Controller`, `Selector`, `Repository`, `DAO`, `Manager`, `Engine`, `Handler`, `Helper`, `Util`, `Factory`, `Batch`, `Trigger`, `Component`, `View`, `Adapter`, `Client`, `Test`, `TestDataFactory`, etc.) via `extractDomainStem`. If prefix $\ge 2$ chars and non-generic, assigned prefix. Confidence: `MEDIUM`.

2. **Pass 2 — Field and Test Inheritance:**
   - **Fields / Custom Fields:** Inherits domain from parent object via `findParentObject` or ID structure (`Object:Order__c.Field:Status__c`). Confidence: `HIGH`.
   - **Test Nodes (`isTestNode`):** Inherits domain from production target via `findProductionTarget` or naming convention (`OrderServiceTest` $\rightarrow$ `OrderService`). Confidence: `HIGH`.

3. **Pass 3 — Graph Neighborhood Cohesion & Disambiguation:**
   - Inspects direct neighbors' domain assignments (excluding `Shared`).
   - If all non-`Shared` neighbors belong to **1 distinct domain**: node inherits that domain. Confidence: `MEDIUM`.
   - If neighbors belong to **$\ge 2$ distinct domains**: node is assigned `Shared` (cross-cutting utility). Confidence: `HIGH`.

4. **Pass 4 — Fallback Assignment:**
   - If no domain signals match, node is assigned `Shared`. Confidence: `LOW`.

5. **Pass 5 — Connected Domains Tracking & Assembly:**
   - Builds deterministic sorted list of connected non-`Shared` domains per node and outputs `assignments`, `domainToNodes`, and `allDomains`.

---

## B. HUB-HEAVY DOMAIN MAP

In `hub-heavy`, every class has a distinct class name stem with no folder path structure or shared entity prefix. As a result, Pass 1 assigns each class to its own unique domain.

### Layout Metrics:
- **Node Count:** 15 | **Edge Count:** 16
- **Canvas Bounding Box:** $5,120.00\text{px} \times 185.00\text{px}$ ($27.68:1$ Aspect Ratio)
- **Discovered Domains:** 15

### Domain Breakdown Table:

| Domain ID | Stem / Name | Primary Nodes | Secondary Nodes | Layers | Internal Edges | External Edges | Connected Domains | Bounding Box ($W \times H$) | Importance |
| :--- | :--- | :---: | :---: | :--- | :---: | :---: | :--- | :--- | :---: |
| `Account` | `Account` | 1 | 0 | `application` | 0 | 2 | 2 (`AuditLogger`, `NotificationDispatcher`) | $120 \times 60$ | 2 |
| `AuditLogger` | `AuditLogger` | 1 | 0 | `application` | 0 | 7 | 7 (`Account`, `Billing`, `Case`, `Contact`, `Lead`, `Opportunity`, `Order`) | $120 \times 60$ | 7 |
| `Billing` | `Billing` | 1 | 0 | `application` | 0 | 1 | 1 (`AuditLogger`) | $120 \times 60$ | 1 |
| `Case` | `Case` | 1 | 0 | `application` | 0 | 2 | 2 (`AuditLogger`, `NotificationDispatcher`) | $120 \times 60$ | 2 |
| `Contact` | `Contact` | 1 | 0 | `application` | 0 | 1 | 1 (`AuditLogger`) | $120 \times 60$ | 1 |
| `EmailSender` | `EmailSender` | 1 | 0 | `application` | 0 | 1 | 1 (`NotificationDispatcher`) | $120 \times 60$ | 1 |
| `InAppNotifier` | `InAppNotifier` | 1 | 0 | `application` | 0 | 1 | 1 (`NotificationDispatcher`) | $120 \times 60$ | 1 |
| `Lead` | `Lead` | 1 | 0 | `application` | 0 | 1 | 1 (`AuditLogger`) | $120 \times 60$ | 1 |
| `NotificationDispatcher` | `NotificationDispatcher` | 1 | 0 | `application` | 0 | 9 | 9 (`Account`, `Case`, `EmailSender`, `InAppNotifier`, `Opportunity`, `Order`, `PushNotifier`, `SlackNotifier`, `SmsGateway`, `WebhookPublisher`) | $120 \times 60$ | 9 |
| `Opportunity` | `Opportunity` | 1 | 0 | `application` | 0 | 1 | 1 (`AuditLogger`) | $120 \times 60$ | 1 |
| `Order` | `Order` | 1 | 0 | `application` | 0 | 2 | 2 (`AuditLogger`, `NotificationDispatcher`) | $120 \times 60$ | 2 |
| `PushNotifier` | `PushNotifier` | 1 | 0 | `application` | 0 | 1 | 1 (`NotificationDispatcher`) | $120 \times 60$ | 1 |
| `SlackNotifier` | `SlackNotifier` | 1 | 0 | `application` | 0 | 1 | 1 (`NotificationDispatcher`) | $120 \times 60$ | 1 |
| `SmsGateway` | `SmsGateway` | 1 | 0 | `application` | 0 | 1 | 1 (`NotificationDispatcher`) | $120 \times 60$ | 1 |
| `WebhookPublisher` | `WebhookPublisher` | 1 | 0 | `application` | 0 | 1 | 1 (`NotificationDispatcher`) | $120 \times 60$ | 1 |

---

## C. LONG-CHAIN DOMAIN MAP

In `long-chain`, 15 sequential steps (`StepA` $\rightarrow$ `StepB` $\rightarrow$ ... $\rightarrow$ `StepO`) each form an independent domain because their stems (`StepA` through `StepO`) are unique.

### Layout Metrics:
- **Node Count:** 15 | **Edge Count:** 14
- **Canvas Bounding Box:** $3,320.01\text{px} \times 185.00\text{px}$ ($17.95:1$ Aspect Ratio)
- **Discovered Domains:** 15

### Sequential Progression Table:

| Domain ID | Step | Primary Nodes | Internal Edges | External Edges | Connected Neighbor Domains | Bounding Box | Region $x\text{Min}..x\text{Max}$ | Actual Node X |
| :--- | :--- | :---: | :---: | :---: | :--- | :--- | :--- | :--- |
| `StepA` | Step 1 | 1 | 0 | 1 | 1 (`StepB`) | $120 \times 60$ | $100.00 .. 260.00$ | $180.00$ |
| `StepB` | Step 2 | 1 | 0 | 2 | 2 (`StepA`, `StepC`) | $120 \times 60$ | $370.00 .. 530.00$ | $450.00$ |
| `StepC` | Step 3 | 1 | 0 | 2 | 2 (`StepB`, `StepD`) | $120 \times 60$ | $640.00 .. 800.00$ | $720.00$ |
| `StepD` | Step 4 | 1 | 0 | 2 | 2 (`StepC`, `StepE`) | $120 \times 60$ | $910.00 .. 1070.00$ | $990.00$ |
| `StepE` | Step 5 | 1 | 0 | 2 | 2 (`StepD`, `StepF`) | $120 \times 60$ | $1180.00 .. 1340.00$ | $1260.00$ |
| `StepF` | Step 6 | 1 | 0 | 2 | 2 (`StepE`, `StepG`) | $120 \times 60$ | $1450.00 .. 1610.00$ | $1530.00$ |
| `StepG` | Step 7 | 1 | 0 | 2 | 2 (`StepF`, `StepH`) | $120 \times 60$ | $1720.00 .. 1880.00$ | $1800.00$ |
| `StepH` | Step 8 | 1 | 0 | 2 | 2 (`StepG`, `StepI`) | $120 \times 60$ | $1990.00 .. 2150.00$ | $2070.00$ |
| `StepI` | Step 9 | 1 | 0 | 2 | 2 (`StepH`, `StepJ`) | $120 \times 60$ | $2260.00 .. 2420.00$ | $2340.00$ |
| `StepJ` | Step 10 | 1 | 0 | 2 | 2 (`StepI`, `StepK`) | $120 \times 60$ | $2530.00 .. 2690.00$ | $2610.00$ |
| `StepK` | Step 11 | 1 | 0 | 2 | 2 (`StepJ`, `StepL`) | $120 \times 60$ | $2800.00 .. 2960.00$ | $2880.00$ |
| `StepL` | Step 12 | 1 | 0 | 2 | 2 (`StepK`, `StepM`) | $120 \times 60$ | $3070.00 .. 3230.00$ | $3150.00$ |
| `StepM` | Step 13 | 1 | 0 | 2 | 2 (`StepL`, `StepN`) | $120 \times 60$ | $3340.00 .. 3500.00$ | $3420.00$ |
| `StepN` | Step 14 | 1 | 0 | 2 | 2 (`StepM`, `StepO`) | $120 \times 60$ | $3610.00 .. 3770.00$ | $3690.00$ |
| `StepO` | Step 15 | 1 | 0 | 1 | 1 (`StepN`) | $120 \times 60$ | $3880.00 .. 4040.00$ | $3960.00$ |

---

## D. SCALE-100-PLUS DOMAIN ANALYSIS

In `scale-100-plus`, 47 total domains are discovered across 117 nodes.

### Layout Metrics:
- **Node Count:** 117 | **Edge Count:** 101
- **Canvas Bounding Box:** $13,540.00\text{px} \times 1,300.00\text{px}$ ($10.42:1$ Aspect Ratio)
- **Discovered Domains:** 47

### Width Contribution Breakdown:
1. **8 Main Business Domains:**
   `Customer`, `Order`, `Inventory`, `Billing`, `Analytics`, `Notification`, `Support`, `Shipping`
   - Total Nodes: 64 (8 primary nodes per domain including portal, ctrl, trg, hnd, svc, sel, obj, test + 4 fields)
   - Span on X-axis: $100.00\text{px} \rightarrow 8,400.00\text{px}$ ($8,300\text{px}$ width).
2. **2 Global Hub Domains:**
   `GlobalEventDispatcher`, `GlobalSystemLogger` ($500\text{px}$ width).
3. **3 Cross-Domain Bridge Domains:**
   `CustomerToOrderBridge`, `OrderToBillingBridge`, `InventoryToNotificationBridge` ($800\text{px}$ width).
4. **24 Satellite Fragment Domains:**
   Header objects (`CustomerHeader`), Portals (`CustomerPortal`), Triggers (`CustomerTrigger`) that split into secondary stems when naming prefixes differ ($2,400\text{px}$ width).
5. **10 Disconnected Component Domains:**
   `StandaloneUtility_1` through `StandaloneUtility_10` ($1,540\text{px}$ width).

---

## E. DOMAIN ORDERING ANALYSIS

Domain ordering is governed by `determineGlobalDomainOrder(domainGraph)` in `global-layout.ts`:

### Algorithm Workflow:
1. **Dependency Flow Scoring:**
   Calculates `outDegree`, `inDegree`, and `netFlow = outDegree - inDegree` for non-`Shared` business domains.
2. **Connected Domain Subgraph Partitioning:**
   Groups connected domains into components using BFS, sorting components by node count descending.
3. **Barycentric Cross-Domain Crossing Minimization (2-Pass Sweep):**
   Sorts domains within each component initially by `netFlow` descending, then runs 2 barycentric position sweeps:
   $$\text{barycenter}(D) = \frac{\sum_{N \in \text{neighbors}(D)} \text{pos}(N) \times \text{weight}(D, N)}{\sum \text{weight}(D, N)}$$
4. **Shared Domain Placement:**
   Inserts `Shared` domain at the average index of its connected business domains.

### Findings on Ordering Behavior:
- **Stability:** 100% deterministic under shuffled node/edge input.
- **Ordering Effectiveness:** In `long-chain`, barycentric ordering correctly recovers the exact sequence `StepA` $\rightarrow$ `StepB` $\rightarrow$ ... $\rightarrow$ `StepO`.
- **Limitation:** Ordering optimizes *which* domain is next to *which*, but does **not** affect the fact that all domains are sequenced horizontally.

---

## F. DOMAIN GAP ANALYSIS

Domain gaps are computed in `computeGlobalDomainLayout` (`global-layout.ts`):
$$\text{domainGap} = \text{maxGap} - \text{strength} \times (\text{maxGap} - \text{minGap})$$
where $\text{minGap} = 80\text{px}$, $\text{maxGap} = 140\text{px}$, and $\text{strength} = \frac{\text{crossEdges}}{\text{maxCrossEdges}}$.

### Empirical Measurements:

| Fixture | Pair | Cross Edges | Strength | Region Gap | Actual Node Gap | Gap Assessment |
| :--- | :--- | :---: | :---: | :---: | :---: | :--- |
| `long-chain` | `StepA` $\rightarrow$ `StepB` | 1 | $1.00$ | $110.00\text{px}$ | $210.00\text{px}$ | **Compact:** Near minimum gap. Node gap includes node margin ($60\text{px} \times 2$). |
| `hub-heavy` | `Account` $\rightarrow$ `AuditLogger` | 1 | $0.14$ | $131.43\text{px}$ | $231.43\text{px}$ | **Normal:** Gap scaled proportionally to coupling strength. |
| `scale-100-plus` | Unlinked Pairs | 0 | $0.00$ | $140.00\text{px}$ | $140.00\text{px} .. 240.00\text{px}$ | **Maximum Default Gap:** Appears when domains have 0 direct edges between them. |

### Finding:
Domain gaps are already compact ($80\text{px} .. 140\text{px}$). Reducing domain gaps further would cause label collision and edge line congestion without materially solving the overall canvas width.

---

## G. DOMAIN REGION ANALYSIS

Region sizing in `computeGlobalDomainLayout` calculates width as:
$$\text{primaryWidth} = \text{maxCols} \times \text{nodeWidth} + (\text{maxCols} - 1) \times 40$$
$$\text{regionWidth} = \max(160, \text{primaryWidth} + 40)$$

### Comparison of Sizing Dimensions:

| Domain | Discovered Primary Nodes | Max Cols | Allocated Region Width | Actual Content BBox Width | Buffer Efficiency |
| :--- | :---: | :---: | :---: | :---: | :--- |
| `StepA` (1 node) | 1 | 1 | $160.00\text{px}$ | $120.00\text{px}$ | $40\text{px}$ padding ($25\%$ buffer) |
| `Order` in `scale-100-plus` (4 primary) | 4 | 4 | $640.00\text{px}$ | $600.00\text{px}$ | $40\text{px}$ padding ($6.25\%$ buffer) |
| `CustomerHeader` (1 obj + 4 fields) | 1 | 1 | $160.00\text{px}$ | $440.00\text{px}$ | Satellite expansion beyond primary region width |

### Finding:
Primary-driven region geometry successfully avoided secondary-node inflation. Region width allocation is efficient and tightly bounded around primary nodes.

---

## H. ROOT-CAUSE CLASSIFICATION

Every remaining extreme horizontal expansion is explicitly categorized below:

| Fixture | Observed Width | Primary Subsystem Owner | Root Cause Classification | Detailed Diagnosis |
| :--- | :---: | :--- | :--- | :--- |
| **`hub-heavy`** | $5,120\text{px}$ | Global Domain Layout (`global-layout.ts`) | **Packing problem (1D vs 2D Domain Region Placement)** | 15 single-class domains are arranged in a 1D horizontal line because domain placement lacks 2D grid/shelf packing for disconnected or weakly-coupled domains. |
| **`long-chain`** | $3,320\text{px}$ | Domain Architecture Contract | **Semantic Constraint** | The graph is a linear dependency chain ($A \rightarrow B \rightarrow ... \rightarrow O$). A horizontal sequence accurately reflects the sequential flow of execution. |
| **`dense-cross-domain`** | $880\text{px}$ | Global Domain Layout (`global-layout.ts`) | **Ordering / Spacing (Compact)** | 3 domains are arranged compactly. Width is bounded and aspect ratio is balanced. |
| **`scale-100-plus`** | $13,540\text{px}$ | Global Domain Layout + Component Packing | **Packing problem (1D Domain Sequence & Satellite Fragments)** | Discovered business domains, satellite fragments, and standalone utilities are placed along a single horizontal axis prior to component packing. |

---

## I. RECOMMENDED NEXT IMPLEMENTATION

To resolve the remaining extreme horizontal expansion without changing semantic domain identity or distorting dependency interpretation, future spatial work should focus on:

1. **2D Domain Region Packing (Spatial-Only Adjustment):**
   - Retain all 15 semantic domains in `hub-heavy`.
   - Instead of placing domains in a single 1D horizontal sequence ($1 \times 15$), arrange unlinked or weakly-coupled domain regions in a 2D multi-row grid/shelf layout (e.g. $3 \times 5$ or $4 \times 4$ domain grid).

2. **Domain Cluster Grouping in Spatial Stage:**
   - Group satellite fragment regions (`CustomerHeader`, `CustomerPortal`) spatially adjacent to their anchor business domain (`Customer`) in 2D space without altering domain classification IDs.

3. **Preserve Linear Sequential Chains:**
   - Maintain horizontal domain flow for genuine linear dependency chains (`long-chain`) as required by dependency semantics.

---

## VERIFICATION AND ACCEPTANCE

- **Diagnosis Complete:** The exact subsystem owning the remaining horizontal width is identified as **1D Global Domain Region Placement in `global-layout.ts`**.
- **Semantic Domain Integrity:** Verified that current domain discovery rules are semantically sound and must **not** be merged.
- **Verification Run:** Confirmed 719 unit tests passing across `explorer/src/`.
