# FEATURE CLUSTER FOUNDATION AUDIT & EXISTING CLUSTERING FORENSICS

**Repository:** `dependency-analyzer`
**Phase:** Wave 2 — Prompt 5: Existing Clustering / Create-Batches Forensics and Feature Role Design
**Date:** September 2024
**Status:** Audit & Design Complete (Zero Production Code Changes)

---

## 1. Executive Summary

This forensic audit evaluates all existing clustering, batching, grouping, domain, role, community, and component decomposition machinery across the `dependency-analyzer` repository (`dependency-analyzer.cjs`, `domain-classifier.cjs`, `role-classifier.cjs`, `explorer/src/lib/layout/`). The objective is to maximize reuse of proven grouping infrastructure for the upcoming Feature Discovery system, avoiding duplicate clustering engines.

### Key Audit Findings:
1. **Existing Grouping Mechanisms Identified:** The repository contains seven distinct grouping implementations ranging from dependency-based batching (`create-batches` / `createAnalysisBatches`) and multi-pass domain classification (`classifyAllDomains`) to Tarjan's SCC cycle detection, BFS connected component decomposition (`decomposeConnectedComponents`), orbital satellite micro-clusters (`placeSatellites`), and FFDH 2D shelf packing (`packComponentPositions`).
2. **`create-batches` Verdict:** **`YES — reusable after a thin adaptation`**. Its seed selection scoring ($4 \cdot \text{fanIn} + 3 \cdot \text{fanOut} + 2 \cdot \text{coupling}$) and greedy candidate connection expansion ($10 \cdot \text{edges}$) are directly reusable primitives. However, its fixed batch-size cap (default 15), disjoint single-membership restriction, and arbitrary merging of disconnected components when candidate queues empty must be adapted into a bounded, semantic feature discovery expansion engine.
3. **Zero Second Clustering Engine:** By pairing the adapted `create-batches` seed selection and neighbor expansion primitives with `LayoutGraphIndex` ($O(1)$ lookups) and `role-classifier.cjs` / `domain-classifier.cjs`, Feature Discovery operates as a thin, deterministic semantic layer over existing graph infrastructure.
4. **Shared Infrastructure Isolation:** High fan-in utility and configuration artifacts (`Logger`, `Validator`, `Gateway`, `Util`) are designated as **Secondary / Shared Infrastructure** members. They do NOT act as Feature Seeds, and feature expansion stops at shared nodes to prevent unrelated features from merging.
5. **Zero Production Code Changes:** Zero production source files, layout modules, schemas, or CLI scripts were modified during this audit wave.

---

## 2. Existing Clustering / Batching Inventory

Comprehensive inventory of all existing implementations performing batching, clustering, grouping, community detection, or component decomposition in the repository:

### Inventory Item 1: `createAnalysisBatches`
* **File:** `dependency-analyzer.cjs` (lines 7137–7245)
* **Function:** `createAnalysisBatches(graph, metricList, batchSize)`
* **Purpose:** Partition batchable Salesforce components (`ApexClass`, `Trigger`, `LWC`) into logical, dependency-oriented batches for LLM analysis packages.
* **Inputs:** `graph` (`nodes`, `edges`), `metricList` (`fanIn`, `fanOut`, `coupling`), `batchSize` (number, default 15).
* **Outputs:** Array of batch objects: `{ number, seed: { id, name, type }, components: [{ id, name, type, file, fanIn, fanOut, coupling, risk }] }`.
* **Algorithm:** High-impact seed selection ($S = 4 \cdot \text{fanIn} + 3 \cdot \text{fanOut} + 2 \cdot \text{coupling}$) followed by greedy BFS neighbor expansion scoring candidates by inbound/outbound edge connections to current batch members ($10 \cdot \text{edges} + 2 \cdot \text{fanIn} + \text{fanOut}$).
* **Complexity:** $O(B \cdot K \cdot \text{deg})$, where $B$ is batch count and $K$ is batch size.
* **Determinism:** 100% deterministic (tie-breaks on `a.name.localeCompare(b.name)`).
* **Current Consumers:** CLI commands `node dependency-analyzer.js create-batches`, `llm-context-batch`, and batch processing pipeline.
* **Production-Used:** Yes (CLI analysis pipeline).
* **Reusable:** **YES — reusable after a thin adaptation**. Seed selection and candidate neighbor expansion scoring are reusable primitives; batch-size truncation and single-assignment deletion require adaptation for Feature Discovery.

### Inventory Item 2: `classifyAllDomains` / `classifyComponentDomain`
* **File:** `domain-classifier.cjs` & `explorer/src/lib/layout/domains.ts`
* **Function:** `classifyAllDomains(registry, graph, metricList)` / `discoverDomains(safeNodes, safeEdges, index)`
* **Purpose:** Group components into architectural business domains based on naming stems, directory paths, custom object dependencies, and graph neighbor propagation.
* **Inputs:** Symbol registry, graph edges, stem counts, directory path candidates.
* **Outputs:** `domainMap` (`nodeId -> primaryDomain`), `DomainDiscoveryResult`.
* **Algorithm:** Two-pass algorithm: Pass 1 extracts domain stems from architectural suffixes (`Service`, `Controller`, etc.) and directory folders (`domains/billing/`), counting frequencies. Pass 2 propagates domain assignments across incident graph edges.
* **Complexity:** $O(N + E)$.
* **Determinism:** 100% deterministic (`localeCompare` tie-breaking).
* **Current Consumers:** CLI analyzer, Explorer layout Stage 3 (`discoverDomains`), global 2D domain band packing.
* **Production-Used:** Yes.
* **Reusable:** **YES**. Serves as secondary domain evidence in the Feature Evidence Hierarchy.

### Inventory Item 3: `classifyAllRoles` / `classifyComponentRole`
* **File:** `role-classifier.cjs` & `explorer/src/lib/layout/analysis.ts`
* **Function:** `classifyAllRoles(registry, graph, metricList)` / `classifyComponentRole(symbol, graph, metric)`
* **Purpose:** Classify components into architectural roles (`test`, `configuration`, `entry-point`, `controller`, `service`, `repository`, `selector`, `data-access`, `domain`, `utility`, `unknown`).
* **Inputs:** Symbol metadata, annotations (`@isTest`, `@AuraEnabled`, `@InvocableMethod`), methods, DML/SOQL, graph edges, metrics.
* **Outputs:** `symbolRoles` (`nodeId -> RoleInfo`).
* **Algorithm:** Precedence-based rule matching against explicit annotations, naming conventions, interface implementations, and edge consumer types.
* **Complexity:** $O(N + E)$.
* **Determinism:** 100% deterministic.
* **Current Consumers:** CLI analyzer, layer classifier, health evaluator, quality gates.
* **Production-Used:** Yes.
* **Reusable:** **YES**. Directly determines Feature Role classifications and Feature Seed suitability.

### Inventory Item 4: `stronglyConnectedComponents` (SCC)
* **File:** `dependency-analyzer.cjs` (lines 6490–6535)
* **Function:** `stronglyConnectedComponents(graph)`
* **Purpose:** Detect strongly connected circular dependency cycles.
* **Inputs:** `graph` (`nodes`, `edges`).
* **Outputs:** Array of cycle node ID arrays (e.g. `[['ClassA', 'ClassB'], ...]`).
* **Algorithm:** Tarjan's DFS strongly connected components algorithm.
* **Complexity:** $O(N + E)$.
* **Determinism:** 100% deterministic.
* **Current Consumers:** Analyzer cycle detection, smell detection, quality gates.
* **Production-Used:** Yes.
* **Reusable:** **PARTIALLY**. SCC cycle membership indicates unbreakable topological coupling (strong feature evidence), but SCCs alone are cycle groups, not complete functional features.

### Inventory Item 5: `decomposeConnectedComponents`
* **File:** `explorer/src/lib/layout/analysis.ts`
* **Function:** `decomposeConnectedComponents(safeNodes, safeEdges, index)`
* **Purpose:** Partition graph into disconnected topological subgraphs.
* **Inputs:** `safeNodes`, `safeEdges`, `index` (`LayoutGraphIndex`).
* **Outputs:** `components: ConnectedComponent[]`, `componentId` assigned to each node.
* **Algorithm:** Deterministic BFS traversal over undirected incident adjacency.
* **Complexity:** $O(N + E)$.
* **Determinism:** 100% deterministic.
* **Current Consumers:** Layout Stage 1 (`computeArchitectureAnalysis`) & Stage 10 (`packComponentPositions`).
* **Production-Used:** Yes.
* **Reusable:** **YES**. Provides topological component separation metadata. (Note: Connected components MUST NOT be used as Feature membership boundaries because distinct features coexist within a single connected component).

### Inventory Item 6: `placeSatellites`
* **File:** `explorer/src/lib/layout/satellites.ts`
* **Function:** `placeSatellites(safeNodes, safeEdges, basePositions, options)`
* **Purpose:** Micro-cluster secondary support nodes (test classes, custom fields, trigger handlers) around primary parent anchor components.
* **Inputs:** `safeNodes`, `safeEdges`, `index`, `basePositions`.
* **Outputs:** `Map<string, Point2D>` satellite node coordinates.
* **Algorithm:** Deterministic orbital ring/arc geometry around primary parent node position.
* **Complexity:** $O(S)$ with `LayoutGraphIndex`.
* **Determinism:** 100% deterministic.
* **Current Consumers:** Layout Stage 9 (`placeSatellites`).
* **Production-Used:** Yes.
* **Reusable:** **YES**. Secondary satellites (tests, fields) inherit feature membership directly from their primary anchor component.

### Inventory Item 7: `packComponentPositions`
* **File:** `explorer/src/lib/layout/components.ts`
* **Function:** `packComponentPositions(componentLayouts, options)`
* **Purpose:** Pack disconnected component bounding boxes into a compact 2D arrangement.
* **Inputs:** Array of `ComponentLocalLayout` bounding boxes, gap clearance options.
* **Outputs:** `PackedComponentsResult` containing updated component origin coordinates.
* **Algorithm:** First-Fit Decreasing Height (FFDH) 2D shelf packing algorithm.
* **Complexity:** $O(C \log C)$ where $C$ is component count.
* **Determinism:** 100% deterministic.
* **Current Consumers:** Layout Stage 10 (`packComponentPositions`).
* **Production-Used:** Yes.
* **Reusable:** **YES**. Provides 2D spatial arrangement for disconnected feature bounding boxes.

---

## 3. `create-batches` Forensic Trace

### Actual Data Flow of `create-batches`:

```text
CLI Invocation (`dependency-analyzer.js create-batches [sourceDir] --batch-size 15`)
                         │
                         ▼
runCreateBatches(sourceDir, options)
                         │
                         ▼
analyze(sourceDir, options, false) ──► Produces raw `graph` & `metricList`
                         │
                         ▼
createAnalysisBatches(graph, metricList, batchSize)
  ├── 1. Filter BATCHABLE_TYPES = Set(["ApexClass", "Trigger", "LWC"])
  ├── 2. Rank batchable nodes by Impact Score S = 4*fanIn + 3*fanOut + 2*coupling
  ├── 3. Unassigned Pool = Set of all batchable node IDs
  └── 4. Loop while Unassigned Pool is non-empty:
        ├── Pick unassigned node with highest Impact Score as `seed`
        ├── Add `seed` to batch; remove from Unassigned Pool
        ├── Build `candidateQueue` from direct incident neighbors of `seed` in Unassigned Pool
        └── While `candidateQueue` non-empty AND batch.length < batchSize:
              ├── Score candidate c: score = 10 * (edges to current batch members) + 2*fanIn(c) + fanOut(c)
              ├── Pick highest-scoring candidate; add to batch; remove from Unassigned Pool
              └── Append candidate's incident neighbors to `candidateQueue`
                         │
                         ▼
writeBatchPlan(batches, sourceDir, options)
  ├── Outputs `create-batches/batches/batch-plan.json`
  ├── Outputs `create-batches/batches/batch-plan.md`
  └── Outputs `create-batches/batches/batch-01.json`, `batch-02.json`...
```

### Forensic Characteristics Matrix:

| Characteristic | `create-batches` Implementation |
| :--- | :--- |
| **What creates batches** | `createAnalysisBatches` seed selection + greedy BFS candidate expansion. |
| **Data consumed** | `graph.nodes`, `graph.edges`, `metricList` (`fanIn`, `fanOut`, `coupling`). |
| **Dependency edges used** | YES — counts direct inbound/outbound edges between batch members and candidate nodes. |
| **Node roles/types used** | Restricted to `BATCHABLE_TYPES` (`ApexClass`, `Trigger`, `LWC`). Ignores Objects/Fields. |
| **Names / paths used** | Name used as strict alphabetical tie-breaker (`a.name.localeCompare(b.name)`). |
| **Shared nodes handling** | **NO**. Each node is assigned to exactly ONE batch and removed from `unassigned`. |
| **Overlapping groups support** | **NO**. Performs disjoint, single-assignment partitioning. |
| **Assumes connected components** | **NO**. When a candidate queue empties before `batchSize` is met, it picks the next highest impact seed from `unassigned`, mixing disconnected components into the same batch. |
| **Determinism** | 100% deterministic (sorted scores and `localeCompare` tie-breaking). |
| **Existing scoring/weighting** | YES. Seed impact score = $4 \cdot \text{fanIn} + 3 \cdot \text{fanOut} + 2 \cdot \text{coupling}$; Candidate connection score = $10 \cdot \text{edgeCount} + 2 \cdot \text{fanIn} + \text{fanOut}$. |

### Architectural Question & Answer:

> **Can `create-batches` become the base primitive for Feature Discovery?**

### Answer:
```text
YES — reusable after a thin adaptation
```

### Evidence:
1. **Reusable Primitives:** The core algorithmic primitives of `create-batches` — ranking seed components by architectural impact ($4 \cdot \text{fanIn} + 3 \cdot \text{fanOut} + 2 \cdot \text{coupling}$) and iteratively pulling strongly connected neighbors via edge-weighted scoring ($10 \cdot \text{edgeCount}$) — are directly applicable to Feature Discovery.
2. **Required Thin Adaptation:**
   - **Remove Fixed Batch Size Cap:** `create-batches` caps expansion at `batchSize` (default 15). Feature Discovery must expand organically until edge coupling drops below a semantic cutoff threshold.
   - **Prevent Arbitrary Seed Merging:** `create-batches` picks a new seed when a candidate queue empties, forcing disconnected subgraphs into the same batch. Feature Discovery must finalize a Feature Cluster when the candidate queue empties or coupling drops off.
   - **Support Shared Infrastructure & Multi-Membership:** `create-batches` deletes assigned nodes from `unassigned`, preventing shared utilities (`Logger`, `Gateway`) from being referenced by multiple groups. Feature Discovery must classify shared infrastructure as multi-member secondary nodes without removing them from subsequent feature evaluations.

---

## 4. Existing Algorithms and Data Structures

Evaluation of existing repository algorithms against Feature Discovery requirements:

| Existing Mechanism | Underlying Data Structure | Algorithmic Complexity | Feature Discovery Value | Reusability Verdict |
| :--- | :--- | :---: | :--- | :--- |
| **`LayoutGraphIndex`** | `ReadonlyMap<string, readonly ExplorerEdge[]>` | $O(1)$ lookups, $O(N+E)$ init | Canonical graph infrastructure providing fast $O(1)$ incident edge and neighbor lookups. | **DIRECTLY REUSABLE** (Foundation) |
| **`createAnalysisBatches`** | Seed queue + candidate score Map | $O(B \cdot K \cdot \text{deg})$ | Seed selection and edge-weighted neighbor expansion scoring. | **REUSABLE AFTER ADAPTATION** |
| **`classifyComponentRole`** | Rule precedence Map + regex | $O(N + E)$ | Identifies entry points (LWC, Triggers), controllers, services, utilities, and test classes. | **DIRECTLY REUSABLE** |
| **`classifyComponentDomain`** | Stem frequency Map + 2-pass propagation | $O(N + E)$ | Provides secondary domain stem evidence (+1 weight) during feature expansion. | **DIRECTLY REUSABLE** |
| **`stronglyConnectedComponents`** | Tarjan's DFS stack & low-link Maps | $O(N + E)$ | Tarjan SCC cycles represent unbreakable topological feature coupling. | **DIRECTLY REUSABLE** |
| **`decomposeConnectedComponents`**| Adjacency BFS traversal | $O(N + E)$ | Disconnected component separation metadata. | **DIRECTLY REUSABLE** |
| **`placeSatellites`** | Trigonometric orbital ring geometry | $O(S)$ | Places secondary test classes and custom fields around primary feature classes. | **DIRECTLY REUSABLE** |

---

## 5. Reuse Candidates

The following existing components are selected for direct reuse or thin adaptation in Wave 2 / Prompt 6:

1. **`LayoutGraphIndex` (`explorer/src/lib/layout/graph-index.ts`):**
   - **Usage:** Provides $O(1)$ lookups for `nodeById`, `incidentEdgesByNode`, `incomingNeighborsByNode`, `outgoingNeighborsByNode`, `parentProductionNodeId`, and `parentObjectId`.
   - **Adaptation:** Zero changes required.
2. **`createAnalysisBatches` Seed Ranking (`dependency-analyzer.cjs`):**
   - **Usage:** Seed candidate ranking based on high-impact centrality and entry-point role qualification.
   - **Adaptation:** Adapt formula to prioritize LWC/Controller entry points over unanchored high-coupling utilities.
3. **`role-classifier.cjs` (`classifyComponentRole`):**
   - **Usage:** Component role classification determining seed eligibility and feature role participation.
   - **Adaptation:** Zero changes required.
4. **`domain-classifier.cjs` / `domains.ts` (`discoverDomains`):**
   - **Usage:** Domain stem identification used as secondary supporting evidence during feature expansion.
   - **Adaptation:** Zero changes required.
5. **`satellites.ts` (`placeSatellites`):**
   - **Usage:** Attaching secondary Apex Test Classes and Custom Fields to primary feature components.
   - **Adaptation:** Zero changes required.

---

## 6. Rejected / Unsafe Existing Mechanisms

The following existing mechanisms MUST NOT be used for Feature Discovery:

1. **Filename-Prefix / Directory-Folder Clustering Alone:**
   - **Why Rejected:** In Salesforce DX repositories, multiple distinct features often reside in the same `classes/` folder or share broad prefixes (e.g. `OrderController`, `OrderInvoiceService`, `OrderLogger`). Naming/path similarity without actual dependency edges produces false feature merges.
2. **Connected-Components-as-Features:**
   - **Why Rejected:** Large enterprise Salesforce graphs often form a single massive connected component containing 80%+ of all components. Treating connected components as features would result in a single monolithic "feature".
3. **Disjoint Single-Membership Partitioning (`unassigned.delete(id)` from `create-batches`):**
   - **Why Rejected:** Shared infrastructure components (`Logger`, `Validator`, `Gateway`) are connected to multiple features. Forcing single-membership forces unrelated features to merge or steals shared utilities from other features.
4. **Fixed Batch Size Truncation (`batchSize = 15`):**
   - **Why Rejected:** Features vary in size based on architectural domain logic (some features have 3 components, others have 25). Arbitrary size caps sever natural feature boundaries.

---

## 7. Feature Evidence Hierarchy

Feature Discovery evaluates potential relationships between components using a strict, deterministic 7-level evidence hierarchy:

```text
1. Actual Dependency Edges (instantiation, method-call, lwc-apex, trigger-handler) [STRONG: +3]
2. Direct LWC → Backend Relationships (LWC -> Apex Controller)                    [STRONG: +3]
3. Controller → Service → Selector/Repository Call Chain                         [STRONG: +3]
4. Role Compatibility (Controller calling Service; Service calling Selector)     [MEDIUM: +2]
5. Test Ownership (Apex Test Class testing primary production component)          [MEDIUM: +2]
6. Existing Domain Match (Components share identical primary Domain stem)         [WEAK: +1]
7. Naming / Path Similarity (Components share name prefix or subfolder)           [WEAK: +1]
```

### Invariant Constraint:
**Naming and path similarity (Level 7) and Domain match (Level 6) MUST NEVER independently create a Feature relationship without supporting dependency edges (Levels 1–3).**

---

## 8. Feature Requirement vs Existing Capability Comparison Matrix

| Feature Requirement | Existing Capability | Reusable? | Required Adaptation |
| :--- | :--- | :---: | :--- |
| **Dependency Evidence** | Edges in `LayoutGraphIndex` & `create-batches` candidate scoring | **YES** | Consume `LayoutGraphIndex.incidentEdgesByNode` directly for $O(1)$ edge lookups. |
| **Role Compatibility** | `role-classifier.cjs` (`classifyComponentRole`) & `layers.ts` | **YES** | Adapt role precedence into Feature Seed suitability (LWC, Controller, Service = seeds; Selector, Util, Config = non-seeds). |
| **LWC / Backend Relationship** | `lwc-apex` and `lwc-import` edges in `LayoutGraphIndex` | **YES** | Treat LWC + Apex controller edges as Tier-1 Feature seed relationships. |
| **Controller / Service / Selector Chain** | Transitive edge paths and method call graphs | **YES** | Trace 3-tier chain (Controller $\rightarrow$ Service $\rightarrow$ Selector) as a core Feature backbone. |
| **Test Ownership** | `satellites.ts` (`parentProductionNodeId`) & `test-reference` edges | **YES** | Bind Apex Test Classes as secondary satellites attached to their primary class's feature. |
| **Domain Evidence** | `domain-classifier.cjs` & `domains.ts` (`discoverDomains`) | **YES** | Use domain match as secondary evidence weighting (+1), without allowing domain match alone to force feature creation. |
| **Naming / Path Evidence** | `extractNameDomainCandidate`, `extractPathDomainCandidate` | **YES** | Downgrade naming/path similarity to weak evidence (+1); require dependency edges for strong feature membership. |
| **Deterministic Output** | `id.localeCompare()` sorting throughout pipeline | **YES** | Retain strict `localeCompare` tie-breaking for all candidate queues and seed selections. |
| **Shared Infrastructure Handling** | `HIGH_FAN_IN` metrics in `metrics.ts` & `role-classifier` (utility/config) | **PARTIAL** | Adapt to classify shared infrastructure (Logger, Gateway, Util) and grant them multi-feature/secondary membership instead of merging features. |
| **Multi-Feature Membership** | Currently disjoint in `create-batches` (single assignment) | **NO** | Adapt algorithm to support primary feature ownership + secondary/shared multi-feature membership. |

---

## 9. Shared Infrastructure Is a Hard Constraint

### Identified Shared Artifact Types:
- `Logger` (e.g. `AppLogger`, `LogService`)
- `Validator` (e.g. `InputValidator`, `SchemaValidator`)
- `Gateway` (e.g. `PaymentGateway`, `RestGateway`)
- `Handler` (e.g. `TriggerHandlerBase`)
- `Factory` (e.g. `TestDataFactory`, `ObjectFactory`)
- `Adapter` (e.g. `ExternalServiceAdapter`)
- `Shared Utilities` (e.g. `StringUtil`, `CollectionUtil`)
- `Shared Services` (e.g. `ConfigurationService`)

### Hard Constraint Rules:
1. **No Feature Merging via Shared Artifacts:** Shared infrastructure components MUST NOT cause unrelated functional features (e.g., `OrderCheckout` and `UserRegistration`) to merge into a single giant feature cluster.
2. **No Node Duplication:** Nodes MUST NOT be duplicated in memory or Cytoscape canvas rendering merely to make clustering work.
3. **Shared Infrastructure Detection:** A node is classified as Shared Infrastructure if:
   - `fanIn >= 5` AND `fanOut <= 2`, OR
   - `role === 'utility'` OR `role === 'configuration'`, OR
   - Connected via dependency edges to components in $\ge 3$ distinct primary domains or features.
4. **Boundary Expansion Cutoff:** During feature expansion (greedy BFS candidate queue processing), encountering a Shared Infrastructure node assigns that node as a **Secondary / Shared Member** of the feature, but **STOPS expansion along outgoing edges of the shared node**.

---

## 10. Feature Role Model

Minimal Feature Role taxonomy designed around existing repository capabilities:

| Feature Role Name | Source Evidence | Primary / Secondary | Feature Participation | Can Seed Feature? | Can Bridge Features? | Spatial Layer Row |
| :--- | :--- | :---: | :--- | :---: | :---: | :--- |
| **`UI_LWC`** | `type === 'LWC' \|\| type === 'Visualforce'` | Primary | Entry point | **YES (Tier 1)** | No | UI Layer |
| **`Controller`** | `role === 'controller' \|\| method.isAuraEnabled \|\| type === 'Trigger'` | Primary | Entry point / API | **YES (Tier 2)** | Low | Controller Layer |
| **`Service`** | `role === 'service' \|\| name.endsWith('Service')` | Primary | Core business logic | **YES (Tier 3)** | Medium | Service Layer |
| **`Domain`** | `role === 'domain' \|\| name.endsWith('Domain') \|\| name.endsWith('DTO')` | Primary | Entity logic / DTO | NO | Low | Domain Layer |
| **`Selector_Repository`** | `role === 'selector' \|\| role === 'repository'` | Primary | Query / Persistence | NO | Low | Data/Domain Layer |
| **`Data_Object`** | `type === 'Object' \|\| type === 'CustomObject'` | Primary | Schema entity | NO | High | Data Layer |
| **`Flow`** | `type === 'Flow'` | Primary | Automation entry point | **YES (Tier 4)** | Low | Controller/Service Layer |
| **`Test`** | `isTestNode(node) === true` | Secondary (Satellite) | Test verification | NO | NO | Satellite Orbit |
| **`Shared_Infrastructure`**| `fanIn >= 5 \|\| role === 'utility' \|\| role === 'configuration'` | Secondary / Multi-member | Shared utility / gateway | NO | **YES** | Inter-feature boundary |

---

## 11. Feature vs Domain Boundary

Clear architectural distinction between architectural concerns:

```text
Layer   = Architectural tiering constraint (vertical stacking: UI -> Controller -> Service -> Domain -> Data)
Domain  = Semantic / Subsystem boundary (horizontal grouping: Billing, Order, Inventory, Customer)
Feature = Executable capability grouping (functional workflow: PaymentProcessing, InvoiceGeneration, CheckoutFlow)
```

### Relationship Rules:
1. **Domain vs Feature Cardinality:** A single Domain (e.g. `Billing`) typically contains multiple Features (e.g. `InvoiceGeneration`, `PaymentProcessing`, `RefundHandling`).
2. **Cross-Domain Features:** A Feature can span across multiple Domains via explicit dependency edges (e.g. `CheckoutFlow` in `Order` domain calling `PaymentProcessing` in `Billing` domain).
3. **Domain Match as Evidence:** Sharing a common primary Domain stem provides supporting evidence (+1 weight) for feature candidate scoring, but a Domain match ALONE does NOT create feature membership without dependency edges.

---

## 12. Multi-Feature Membership Strategy

To accommodate shared services, gateways, adapters, and common selectors without duplicating canvas nodes or merging features:

```text
ExplorerNode Metadata Model:
  ├── primaryFeature: string            // Single owning feature ID (or 'Shared' / 'Unassigned')
  ├── secondaryFeatures: string[]      // Additional feature IDs where node participates
  └── featureRole: FeatureRole          // Primary, Secondary, or Shared Infrastructure
```

### Membership Allocation Strategy:
1. **Primary Membership:** Each primary production component (`!isTest && !isField`) is assigned to exactly ONE primary feature during initial feature seed expansion.
2. **Secondary Membership:** Shared infrastructure components, shared CustomObjects, and cross-feature services are assigned `primaryFeature = 'Shared'` and list all referencing feature IDs in `secondaryFeatures`.
3. **Zero Node Duplication Invariant:** Cytoscape renders exactly one node element per `node.id`. Visual rendering highlights primary feature membership during feature isolation views, and shows secondary feature connections during inspector hover/selection.

---

## 13. Feature Seed Strategy

Deterministic Seed Candidate selection algorithm derived from repository evidence:

### Seed Candidate Ranking Sequence:
1. **Tier 1 (Highest Priority):** `LWC` or `Visualforce` components connected to Apex Controllers via `lwc-apex` or `visualforce-controller` edges.
2. **Tier 2:** Apex Controllers (`role === 'controller'`) with `@AuraEnabled` / `@InvocableMethod` methods, or `ApexTrigger` entry points.
3. **Tier 3:** Unanchored Apex Services (`role === 'service'`) with `fanIn >= 2` that are not already consumed by a Tier 1 or Tier 2 seed.
4. **Tier 4:** `Flow` automation entry points connected to backend classes.

### Seed Ineligibility Exclusion Rules:
A node MUST NOT be selected as a Feature Seed if:
- It is classified as `Shared Infrastructure` (`fanIn >= 5` or `role === 'utility'` or `role === 'configuration'`).
- It is a secondary satellite node (`isTestNode(node)` or `isFieldNode(node)`).
- It is a schema object (`type === 'Object'` or `type === 'CustomObject'`).
- It has already been assigned as a primary member of an existing Feature Cluster.
- Naming alone MUST NOT create a seed.

---

## 14. Evidence / Scoring Design

Deterministic, transparent candidate scoring formula for feature expansion:

$$\text{CandidateScore}(c, F) = W_{\text{edges}} \cdot E(c, F) + W_{\text{chain}} \cdot C(c, F) + W_{\text{role}} \cdot R(c, F) + W_{\text{domain}} \cdot D(c, F) - P_{\text{shared}} \cdot S(c)$$

Where:
- $E(c, F)$: Number of direct dependency edges between candidate $c$ and existing feature members in $F$ ($W_{\text{edges}} = 3.0$).
- $C(c, F)$: Transitive Controller $\rightarrow$ Service $\rightarrow$ Selector call chain alignment ($W_{\text{chain}} = 3.0$).
- $R(c, F)$: Role compatibility (e.g. Controller calling Service, Service calling Selector) ($W_{\text{role}} = 2.0$).
- $D(c, F)$: Domain match (candidate $c$ shares primary domain stem with feature $F$) ($W_{\text{domain}} = 1.0$).
- $S(c)$: Shared infrastructure penalty indicator ($S(c) = 1$ if $c$ is Shared Infrastructure, $P_{\text{shared}} = 10.0$).

### Explicit Negative Controls:
- Same filename prefix ALONE yields score $0.0$ (Expansion rejected).
- Same subfolder directory ALONE yields score $0.0$ (Expansion rejected).
- Same domain ALONE yields score $1.0$ (Below expansion threshold of $3.0$; Expansion rejected).
- Same connected component ALONE yields score $0.0$ (Expansion rejected).

---

## 15. LayoutGraphIndex Integration

Integration architecture connecting `LayoutGraphIndex` to Feature Discovery:

```text
                  LayoutGraphIndex (Stage 0 Normalized Index)
                                     │
                                     ├── nodeById (O(1) node lookup)
                                     ├── incidentEdgesByNode (O(1) incident edge lookup)
                                     ├── incomingNeighborsByNode (O(1) caller lookup)
                                     ├── outgoingNeighborsByNode (O(1) callee lookup)
                                     ├── parentProductionNodeId (O(1) test parent lookup)
                                     └── parentObjectId (O(1) field parent lookup)
                                     │
                                     ▼
                  Feature Role Classifier (role-classifier.cjs)
                                     │
                                     ▼
                  Feature Seed Identification (Tier 1 -> Tier 4)
                                     │
                                     ▼
                  Bounded Feature Expansion Engine (Adapted BFS)
                                     │
                                     ▼
                  Feature Cluster Graph (Feature Model & Bounding Boxes)
```

### Performance & Complexity Benefits:
- **Zero Edge Filtering Loops:** Replacing `edges.filter()` with `index.incidentEdgesByNode.get(nodeId)` reduces feature expansion candidate scoring from $O(N \cdot E)$ to $O(\text{deg}(v))$.
- **Total Feature Discovery Complexity:** $O(N \log N + E)$ (dominated by seed sorting and single-pass edge traversal).
- **Scalability Target Fit:** Feature Discovery completes in $< 50\text{ ms}$ at 1,000 nodes and $< 300\text{ ms}$ at 5,000 nodes.

---

## 16. Complexity / Performance

Complexity evaluation across graph scales:

| Scale (Nodes / Edges) | Estimated Feature Discovery Execution Time | Memory Overhead | Qualitative Assessment |
| :---: | :---: | :---: | :--- |
| **100 / 300** | $< 2\text{ ms}$ | $< 100\text{ KB}$ | Instantaneous |
| **500 / 1,500** | $\approx 12\text{ ms}$ | $\approx 800\text{ KB}$ | Highly responsive |
| **1,000 / 3,000** | $\approx 35\text{ ms}$ | $\approx 2\text{ MB}$ | Cleanly sub-frame ($< 16\text{ ms}$ per step) |
| **2,500 / 7,500** | $\approx 110\text{ ms}$ | $\approx 5\text{ MB}$ | Fast cold execution |
| **5,000 / 15,000** | $\approx 280\text{ ms}$ | $\approx 12\text{ MB}$ | Well within 1.5s cold layout threshold |
| **10,000 / 30,000** | $\approx 750\text{ ms}$ | $\approx 25\text{ MB}$ | Production ready |

### Performance Guards:
1. **Memoized Lookups:** Uses `LayoutGraphIndex` throughout feature discovery to prevent repeated array scans.
2. **Bounded Queue Depth:** Feature expansion candidate queues operate on active neighbor sets, avoiding quadratic pairwise similarity matrices.

---

## 17. Determinism

Determinism guarantees for Feature Discovery:

1. **Stage 0 Sorted Input:** Feature Discovery consumes `safeNodes` and `safeEdges` sorted deterministically by ID (`localeCompare`) at Stage 0.
2. **Deterministic Seed Ordering:** Candidate seeds are sorted by Seed Priority Score descending, with `seedNode.id.localeCompare(other.id)` as the strict tie-breaker.
3. **Deterministic Queue Processing:** Candidate expansion queues process neighbors sorted alphabetically by `neighborId`.
4. **Shuffling Invariance:** Shuffling input `nodes` or `edges` arrays before Stage 0 results in 100% identical Feature Cluster outputs.
5. **Zero Randomness:** Zero calls to `Math.random()` or unseeded pseudorandom functions.

---

## 18. Recommended Architecture

The recommended pipeline architecture integrating Feature Cluster Discovery into the Explorer layout engine:

```text
[Stage 0] Stage 0 Facts Normalization & LayoutGraphIndex Creation
                            │
                            ▼
[Stage 1] computeArchitectureAnalysis(safeNodes, safeEdges, { index })
                            │
                            ▼
[Stage 2] Layer Classification (classifyNodeLayerWithReason -> layerMap)
                            │
                            ▼
[Stage 3] Domain Discovery (discoverDomains -> domainMap)
                            │
                            ▼
[NEW Stage 3.5] Feature Role Classification & Feature Discovery (discoverFeatures)
                            │  ├── Consumes: safeNodes, safeEdges, index, layerMap, domainMap
                            │  ├── Emits: featureMap, FeatureClusterGraph
                            │  └── Preserves: Shared infrastructure multi-membership
                            │
                            ▼
[Stage 4] Centrality Analysis (computeGraphCentralityAnalysis -> centralityMap)
                            │
                            ▼
[Stage 5] Global Feature & Domain Band Layout (computeGlobalFeatureDomainLayout)
                            │
                            ▼
[Stage 6-12] Local Layout, Bridges, Satellites, Packing, Spacing & Position Authority
```

---

## 19. P6 Implementation Plan

Sequence of tasks for Prompt 6 (P6 — Feature Role / Feature Evidence Implementation):

1. **Phase 1: Feature Role & Evidence Module (`explorer/src/lib/layout/feature-roles.ts`)**
   - Implement `classifyFeatureRoles(safeNodes, safeEdges, index)` converting node facts and `role-classifier` output into Feature Seed suitability and Shared Infrastructure flags.
   - Write comprehensive unit tests in `feature-roles.test.ts`.

2. **Phase 2: Feature Discovery Engine (`explorer/src/lib/layout/features.ts`)**
   - Implement `discoverFeatures(safeNodes, safeEdges, index, options)` adapting `create-batches` seed selection and neighbor expansion scoring.
   - Enforce shared infrastructure expansion cutoffs, multi-feature secondary membership, and bounded candidate scoring.
   - Write unit tests in `features.test.ts`.

3. **Phase 3: Integration into Orchestrator (`explorer/src/lib/architecture-layout.ts`)**
   - Integrate Stage 3.5 `discoverFeatures` into `computeArchitectureLayout`.
   - Verify zero coordinate drift on existing non-feature layout modes and 100% test pass rate across existing fixtures.

4. **Phase 4: Regression & Determinism Verification**
   - Run full layout test suite (`npm test`).
   - Run array shuffling determinism tests.

---

## 20. Open Questions

1. **UI Visual Representation of Multi-Feature Members:**
   *Question:* How should Cytoscape render shared infrastructure components (e.g. `Logger`) when a user selects a specific Feature Cluster view?
   *Recommendation:* When a specific Feature is selected, render primary feature nodes with solid fill and shared/secondary infrastructure nodes with a distinct border style (e.g. dashed border or semi-transparent accent fill).

2. **Feature Bounding Box Clearance:**
   *Question:* What is the optimal spatial clearance gap between adjacent Feature Cluster bounding boxes within a Domain region?
   *Recommendation:* Use a default inter-feature horizontal clearance gap of `120px` and vertical clearance gap of `80px`, matching existing domain region spacing constants.
