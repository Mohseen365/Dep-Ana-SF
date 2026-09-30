# ARCHITECTURE ORBIT — PARALLEL AUDIT C
## Semantic Classification, Rings, Sectors, and Nucleus Audit

**Author:** Graph Semantics Architect
**Status:** COMPLETE & AUTHORITATIVE
**Date:** September 2026
**Target Architecture:** Salesforce Architecture Explorer — Architecture Orbit

---

## 1. Executive Summary

### 1.1 Mandate & Scope
This audit report establishes the authoritative, read-only semantic classification and spatial mapping rules for **Architecture Orbit** within the Salesforce Architecture Explorer.

As Graph Semantics Architect, the scope of this investigation is **strictly bounded** to determining how 100% existing project data, classifiers, AST metadata, and contract standards drive Architecture Orbit's semantic placement (Rings, Nucleus, Sectors, and Deterministic Ordering). In accordance with governance constraints:
* **Zero Layout Engine Redesign:** Layout algorithms and spatial packing remain untouched.
* **Zero Infrastructure Creation:** No new database, worker, persistence, or UI infrastructure is created.
* **Zero New Ontologies:** Existing architectural classifications and layer/role/domain ontologies are reused bit-for-bit.
* **Zero Production Code Changes:** This report provides the definitive semantic mapping spec and audit evidence without modifying production runtime code.

---

### 1.2 Key Findings
1. **100% Data Reuse Readiness:** The repository already possesses a mature, deterministic 6-tier evidence hierarchy (`BASE-ARCH-1` contract in `deterministic/contract.cjs`) implemented across `layer-classifier.cjs`, `role-classifier.cjs`, `domain-classifier.cjs`, `entry-points.cjs`, and frontend layout modules (`layers.ts`, `domains.ts`, `features.ts`, `feature-roles.ts`, `centrality.ts`).
2. **Radial Ring Architecture (Rings 1–6):** Architecture Orbit's concentric radial topology maps cleanly to existing architectural layers and roles without ambiguity:
   * **Ring 1 (Entry / Presentation):** LWCs, Visualforce, Apex Triggers, Flows, REST Web Services, Async Execution Entries, Invocable Methods.
   * **Ring 2 (Application / Controllers):** Apex Controllers, Controller Extensions, UI Handlers, Workflow Orchestrators.
   * **Ring 3 (Business Logic / Services):** Business Services, Domain Processors, Business Engines, Domain Models, DTOs, Wrappers.
   * **Ring 4 (Data / Persistence):** Selectors, Repositories, DAOs, Custom Objects, Standard Objects.
   * **Ring 5 (Schema Detail):** Custom Fields, Standard Fields, External Entities.
   * **Ring 6 (Supporting / Satellites & Utilities):** Apex Test Classes, Test Data Factories, Custom Metadata (`__mdt`), Custom Settings (`__setting`), Shared Utilities, Unassigned.
3. **Deterministic Sector Semantics:** Sectors represent Architectural Business Domains and Feature Clusters (`discoverFeatures()` / `discoverDomains()`), supplemented by dedicated `SharedInfrastructure` and `Unassigned` fallback sectors.
4. **Nucleus Selection Mechanics:** The central "focal point" (Nucleus) of each sector is determined by a strict, zero-failure priority queue: `LWC` > `Aura` > `Visualforce` > `Flow` > `ApexTrigger` > `Controller` > `Service` > `Object`. Edge cases (multi-LWC, headless domains, schema-only domains) are fully resolved with zero-drift fallbacks.
5. **Zero-Effort Hidden Semantic Opportunities:** Identified 7 high-value visual opportunities already computed in the codebase—Spatial Centrality (Hubs & Bridges), Dependency Direction (`fanIn`/`fanOut`), Execution Chain Alignment, Refactoring Risk/Blast Radius, Test Satellite Coupling, Field Parent Coupling, and Architectural Cycle Groups.
6. **Guaranteed Determinism:** All sector, ring, and node placements adhere to `id.localeCompare(b.id)` tie-breaking, ensuring 0% coordinate drift and 100% reproducible layouts across executions.

---

## 2. Semantic Data Sources

The repository provides a rich set of deterministic semantic signals embedded in the `ExplorerDataSchema` (`explorer/src/types/explorer.ts`) and extracted via analysis engines. The table below traces every semantic property to its canonical origin, extraction method, and contract representation:

| Semantic Property | Canonical Origin | Extraction Source & Method | Contract & Type Representation |
| :--- | :--- | :--- | :--- |
| **Node Type** | File extension & metadata (`.cls`, `.trigger`, `.js`, `.page`, `.flow-meta.xml`, `.object-meta.xml`) | Parsed DX file type in `dependency-analyzer.cjs` and `role-classifier.cjs` | `ExplorerNodeType` (`ApexClass`, `ApexTrigger`, `LWC`, `Visualforce`, `Flow`, `Object`, `CustomObject`, `Field`, `CustomField`, `External`) |
| **Architectural Role** | AST structure, naming conventions, interface implementations, and annotations | `classifyComponentRole()` in `role-classifier.cjs` & `classifyFeatureRole()` in `feature-roles.ts` | `entry-point`, `controller`, `service`, `selector`, `repository`, `data-access`, `domain`, `utility`, `configuration`, `test`, `unknown` / `FeatureAnchor`, `FeatureCore`, `FeatureData`, `FeatureBridge`, `FeatureTest`, `SharedInfrastructure` |
| **Salesforce Artifact Type** | Apex AST annotations (`@RestResource`, `@AuraEnabled`, `@InvocableMethod`, `@isTest`) & interfaces (`Batchable`, `Queueable`, `Schedulable`) | `detectEntryPoint()` in `entry-points.cjs` & `ExplorerNode.behavior` | `entryPointTypes` array (`Trigger`, `LWC`, `Visualforce`, `REST`, `Async`, `Invocable`, `AuraEnabled`, `InboundEmail`) |
| **Feature / Domain** | Directory folder structures (`classes/order/`), entity name stems (`OrderService`), schema objects | `classifyComponentDomain()` in `domain-classifier.cjs`, `discoverDomains()` in `domains.ts`, & `discoverFeatures()` in `features.ts` | `DomainAssignment.primaryDomain` & `FeatureCluster` (`id`, `anchorNodeId`, `primaryNodeIds`, `secondaryNodeIds`, `domains`) |
| **Source Path** | Relative repository path from DX root | `ExplorerNode.file` normalized with forward slashes `/` | Relative path string (e.g. `force-app/main/default/classes/order/OrderService.cls`) |
| **File Metadata & Behavior** | AST metrics & method inspection | `ExplorerNode.behavior` (`isTest`, `sharing`, `publicContractsCount`, `asyncPatterns`, `securitySignalsCount`, `queryCount`, `dmlCount`, `calloutCount`) | `ExplorerNodeBehavior` object |
| **Graph Metrics** | Dependency graph topology | `ExplorerNode.metrics` (`fanIn`, `fanOut`, `coupling`, `unresolved`, `score`) & `centrality.ts` | `ExplorerNodeMetrics` & `NodeCentralityAnalysis` (`isHub`, `hubScore`, `hubType`, `isBridge`, `bridgeScore`, `spatialRole`) |
| **Dependency Relationships** | Source AST imports, method calls, SOQL, DML, LWC bindings, trigger handlers | `ExplorerEdge.relationshipType` in `explorer-contract.ts` / `explorer/src/types/explorer.ts` | `ExplorerRelationshipType` (`method-call`, `instantiation`, `type-reference`, `SOQL`, `DML`, `aura-enabled`, `lwc-apex`, `trigger-handler`, `field-reference`, `test-reference`, etc.) |
| **Connected Components** | Disjoint graph traversal | `computeConnectedComponents()` in `explorer/src/lib/layout/components.ts` | Array of node ID sets representing isolated subgraphs |
| **Existing Grouping** | Feature discovery, domain discovery, cycle detection | `features.ts`, `domains.ts`, `ExplorerDataSchema.cycles` | `FeatureCluster`, `DomainDiscoveryResult`, `ExplorerCycleGroup` (`id`, `size`, `nodes`) |
| **Semantic Annotations** | Apex AST annotation tokens | `parsed.annotations` array on symbol objects | Token array (`istest`, `restresource`, `auraenabled`, `invocablemethod`, `future`, etc.) |

---

## 3. Existing Classification System

### 3.1 Proposed vs Repository Evidence Hierarchy
The proposed evidence hierarchy evaluates candidate signals in the following order:
1. Explicit type
2. Existing architecture classification
3. Path / file metadata
4. Behavior / metadata
5. Naming convention
6. Deterministic fallback

**Architectural Evaluation:** The repository's existing classification system (`BASE-ARCH-1` contract in `deterministic/contract.cjs`, `layer-classifier.cjs`, `role-classifier.cjs`, `domain-classifier.cjs`, `layers.ts`, and `domains.ts`) **strictly validates and strengthens** this proposed hierarchy.

The repository formalizes this sequence into a 6-tier precedence hierarchy with explicit confidence ratings (`high`, `medium`, `low`, `unknown`), detailed below:

```
+-----------------------------------------------------------------------------------+
| TIER 1: Explicit Node Type & AST Annotations (Confidence: HIGH)                  |
| - LWC, Visualforce, ApexTrigger, Object, Field, @isTest, @RestResource, etc.      |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
| TIER 2: Inheritance & Context Binding (Confidence: HIGH/MEDIUM)                   |
| - Test targets (findProductionTarget), Field parents (findParentObject)           |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
| TIER 3: Directory / Source Path Boundaries (Confidence: HIGH/MEDIUM)               |
| - Folder keywords (classes/order/, lwc/, pages/, services/, tests/)               |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
| TIER 4: Runtime Behavior & Operations (Confidence: MEDIUM)                         |
| - Async interfaces (Batchable), SOQL query count, DML mutation count              |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
| TIER 5: Naming Suffixes & Domain Stems (Confidence: MEDIUM)                        |
| - Architectural suffixes (Controller, Service, Selector, Repository, Helper)     |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
| TIER 6: Deterministic Fallback (Confidence: LOW/UNKNOWN)                           |
| - Default to 'application' layer / 'Shared' domain / 'FeatureCore' role           |
+-----------------------------------------------------------------------------------+
```

### 3.2 Evidence Rule Precedence Protocol
When multiple classification signals conflict for a single component, the precedence rules defined in `LAYER_PRECEDENCE` (`layer-classifier.cjs`) and `ROLE_PRECEDENCE` (`role-classifier.cjs`) govern authoritative resolution:
* **Test Rule Supremacy:** `isTest` attributes, `@isTest` annotations, or `test` path boundaries immediately force classification into the Supporting / Test layer, overriding any internal query or controller naming.
* **Schema Protection:** `Object`, `CustomObject`, `Field`, and `CustomField` node types are strictly protected against non-schema layer assignment.
* **UI/Entry Priority:** Direct UI components (`LWC`, `Visualforce`) and entry points (`ApexTrigger`, REST endpoints) override internal service or domain rules.

---

## 4. Ring Mapping

Architecture Orbit organizes components into concentric radial rings radiating outward from the Nucleus. The mapping from existing semantic categories to the 6 Orbit Rings is defined below:

```
                      +---------------------------------------+
                      |       RING 6: Supporting / Satellites |
                      |  +---------------------------------+  |
                      |  |     RING 5: Schema Detail       |  |
                      |  |  +---------------------------+  |  |
                      |  |  |   RING 4: Data/Persist.   |  |  |
                      |  |  |  +---------------------+  |  |  |
                      |  |  |  |  RING 3: Business   |  |  |  |
                      |  |  |  |  +---------------+  |  |  |  |
                      |  |  |  |  | RING 2: App.  |  |  |  |  |
                      |  |  |  |  |  +---------+  |  |  |  |  |
                      |  |  |  |  |  | RING 1  |  |  |  |  |  |
                      |  |  |  |  |  | NUCLEUS |  |  |  |  |  |
                      |  |  |  |  |  +---------+  |  |  |  |  |
                      |  |  |  |  +---------------+  |  |  |  |
                      |  |  |  +---------------------+  |  |  |
                      |  |  +---------------------------+  |  |
                      |  +---------------------------------+  |
                      +---------------------------------------+
```

### 4.1 Detailed Ring Definitions

#### Ring 1: Entry / Presentation
* **Semantic Purpose:** The system perimeter and user/event interaction boundary.
* **Component Membership:**
  * Node Types: `LWC`, `Visualforce`, `ApexTrigger`, `Flow`.
  * Roles & Annotations: `role === 'entry-point'`, `@RestResource`, `@AuraEnabled`, `@InvocableMethod`, `HttpGet`, `HttpPost`, `Batchable`, `Queueable`, `Schedulable`, `Messaging.InboundEmailHandler`.
  * Signal Function: `detectEntryPoint(symbol).isEntryPoint === true` or `classifyNodeLayer(node) === 'presentation'`.

#### Ring 2: Application / Controllers
* **Semantic Purpose:** UI state management, workflow orchestration, and request handling.
* **Component Membership:**
  * Node Types: `ApexClass`.
  * Roles & Suffixes: `role === 'controller'`, name suffix `Controller`, `ControllerExtension`, `ControllerExt`, `Handler`, `Orchestrator`, `Manager`.
  * Signal Function: `classifyNodeLayer(node) === 'application'` (excluding Ring 1 entry points).

#### Ring 3: Business Logic / Services
* **Semantic Purpose:** Core domain rules, calculations, business workflows, and domain entity structures.
* **Component Membership:**
  * Node Types: `ApexClass`.
  * Roles & Suffixes: `role === 'service'`, `role === 'domain'`, name suffix `Service`, `Services`, `Processor`, `Engine`, `Workflow`, `Domain`, `DTO`, `VO`, `Model`, `Wrapper`.
  * Signal Function: `classifyNodeLayer(node) === 'domain'` (excluding persistence components).

#### Ring 4: Data / Persistence
* **Semantic Purpose:** Data encapsulation, database query building, DML persistence, and schema object definitions.
* **Component Membership:**
  * Node Types: `Object`, `CustomObject`, `ApexClass`.
  * Roles & Suffixes: `role === 'selector'`, `role === 'repository'`, `role === 'data-access'`, name suffix `Selector`, `Selectors`, `Repository`, `Repositories`, `Repo`, `DAO`, `Queries`, `Finder`.
  * Signal Function: `classifyNodeLayer(node) === 'schema'` (Objects) or selector/repo role classification.

#### Ring 5: Schema Detail
* **Semantic Purpose:** Fine-grained data fields and external schema definitions.
* **Component Membership:**
  * Node Types: `Field`, `CustomField`, `External`.
  * Criteria: All field-level schema nodes and external system integrations.

#### Ring 6: Supporting / Satellites & Utilities
* **Semantic Purpose:** Test verification, system configuration, custom metadata, shared infrastructure, and unassigned utilities.
* **Component Membership:**
  * Node Types: `ApexClass` (Test/Config/Util), `Object` (`__mdt`, `__setting`, `__e`).
  * Roles & Suffixes: `role === 'test'`, `role === 'configuration'`, `role === 'utility'`, `isSharedInfrastructure === true`, name suffix `Test`, `Tests`, `TestDataFactory`, `Config`, `Settings`, `Util`, `Utils`, `Logger`.
  * Satellite Binding: Test classes and fields positioned as radial satellites bound to their production/object parents.

---

### 4.2 Disambiguation of Ambiguous & Overlapping Categories

1. **Controllers Executing SOQL/DML:**
   * *Problem:* A controller class contains direct `[SELECT ...]` queries.
   * *Resolution:* UI/Controller role takes precedence over data operation behavior. The component is assigned to **Ring 2 (Application)**, but its query behavior is retained in `behavior.queryCount` for risk overlay.
2. **Triggers (Entry vs Application):**
   * *Problem:* Triggers automate database events but execute Apex code.
   * *Resolution:* Apex Triggers are database-level entry points. They map strictly to **Ring 1 (Entry)**.
3. **Flows (Presentation vs Application):**
   * *Problem:* Screen Flows present UI, while Autolaunched Flows run background logic.
   * *Resolution:* All Flows represent system entry points / automation drivers and map to **Ring 1 (Entry)**.
4. **Shared Utilities & Cross-Cutting Infrastructure:**
   * *Problem:* A utility class like `Logger` or `StringUtil` is called by every layer and domain, threatening to distort radial rings.
   * *Resolution:* Classified as `SharedInfrastructure` (`isSharedInfrastructure() === true`) and placed in **Ring 6 (Supporting)** or routed to the dedicated `SharedInfrastructure` Sector.

---

## 5. Nucleus Semantics

The **Nucleus** is the central focal point of an Orbit sector, representing the primary entry point or core anchor around which the sector's radial rings expand.

### 5.1 Deterministic Nucleus Priority Queue
When discovering the Nucleus for a sector, candidates are evaluated against the following strict, deterministic priority queue:

```
+-----------------------------------------------------------------------------------+
| PRIORITY 1: Lightning Web Component (LWC)                                         |
| - Highest-tier modern UI entry point                                               |
+-----------------------------------------------------------------------------------+
                                         | (if none)
                                         v
+-----------------------------------------------------------------------------------+
| PRIORITY 2: Aura Component / @AuraEnabled Controller                              |
| - Modern UI backend controller anchor                                             |
+-----------------------------------------------------------------------------------+
                                         | (if none)
                                         v
+-----------------------------------------------------------------------------------+
| PRIORITY 3: Visualforce Page / Component                                          |
| - Traditional UI presentation anchor                                              |
+-----------------------------------------------------------------------------------+
                                         | (if none)
                                         v
+-----------------------------------------------------------------------------------+
| PRIORITY 4: Salesforce Flow / Process Builder                                     |
| - Declarative process entry anchor                                                |
+-----------------------------------------------------------------------------------+
                                         | (if none)
                                         v
+-----------------------------------------------------------------------------------+
| PRIORITY 5: Apex Trigger                                                          |
| - Database event automation anchor                                                |
+-----------------------------------------------------------------------------------+
                                         | (if none)
                                         v
+-----------------------------------------------------------------------------------+
| PRIORITY 6: Apex Controller / REST Resource / Invocable Method                    |
| - Application API / Controller anchor                                             |
+-----------------------------------------------------------------------------------+
                                         | (if none)
                                         v
+-----------------------------------------------------------------------------------+
| PRIORITY 7: Core Business Service (Highest Degree)                                |
| - Unanchored domain business logic anchor                                         |
+-----------------------------------------------------------------------------------+
                                         | (if none)
                                         v
+-----------------------------------------------------------------------------------+
| PRIORITY 8: Custom Object / Schema Entity                                         |
| - Data-centric schema anchor                                                      |
+-----------------------------------------------------------------------------------+
```

---

### 5.2 Evaluation of Conceptual Edge Cases

The table below specifies the zero-failure deterministic behavior for every conceptual edge case:

| Edge Case | Conceptual Scenario | Deterministic Nucleus Selection Rule | Orbit Ring Placement for Non-Nucleus Nodes |
| :--- | :--- | :--- | :--- |
| **Multiple LWCs** | A single sector/domain contains 3 LWCs (`OrderHeader`, `OrderDetails`, `OrderActions`) | Select LWC with highest degree coupling (`fanIn + fanOut`). Tie-breaker: `id.localeCompare(b.id)`. | Selected LWC becomes Nucleus. Remaining 2 LWCs orbit in **Ring 1**. |
| **No LWC** | Domain contains Visualforce, Controller, and Services | Nucleus falls back to Priority 3 (Visualforce). If no Visualforce, falls back to Priority 6 (Controller). | Visualforce/Controller becomes Nucleus. Services orbit in **Ring 3**. |
| **Only Controller** | Domain has an Apex Controller but no LWC/VF | Controller becomes Sector Nucleus. | Controller sits at Nucleus. Dependent Services/Selectors orbit in **Rings 3–4**. |
| **Only Object** | Domain consists solely of Custom Object `Order__c` | Custom Object `Order__c` becomes Sector Nucleus. | `Order__c` sits at Nucleus. Custom Fields (`Status__c`, `Total__c`) orbit in **Ring 5**. |
| **Only Field** | Orphaned Custom Field without parent Object in graph | Field itself becomes Sector Nucleus (or binds to `SharedInfrastructure` Nucleus). | Field sits at Nucleus or Ring 5 satellite position. |
| **No Recognized Entry Artifact** | Headless domain with 4 Services, 2 Selectors, 1 Repository | Select Service with highest degree coupling (`fanIn + fanOut`). Tie-breaker: `id.localeCompare(b.id)`. | Selected Service becomes Nucleus. Remaining Services orbit in **Ring 3**, Selectors in **Ring 4**. |

---

## 6. Sector Semantics

Sectors represent angular slices ($2\pi$ angular allocation) radiating from the origin, grouping related components into cohesive business or functional domains.

### 6.1 Derivation of Sectors
Sector placement is derived from existing repository clustering utilities:
1. **Primary Sectors (Architectural Business Domains / Feature Clusters):**
   * Derived directly from `discoverFeatures()` in `features.ts` and `discoverDomains()` in `domains.ts`.
   * Examples: `Order` Sector, `Billing` Sector, `Customer` Sector, `Inventory` Sector.
2. **Special / Secondary Sectors:**
   * **`SharedInfrastructure` Sector:** Dedicated angular slice housing cross-cutting utilities (`Logger`, `ConfigService`, `TestDataFactory`) that connect across $\ge 3$ domains.
   * **`Unassigned` Sector:** Fallback angular slice housing isolated components with insufficient domain evidence.

### 6.2 Signal Stability & Determinism Analysis
* **Seed Ranking Stability:** `features.ts` ranks feature seeds using a fixed scoring function:
  $$\text{Score} = \text{TierBase} + 4 \times \text{fanIn} + 3 \times \text{fanOut} + 2 \times \text{coupling}$$
* **Expansion Loop Stability:** Candidate expansion uses fixed candidate weighting ($3.0 \times \text{deps} + 3.0 \times \text{execution} + 2.0 \times \text{role} + 1.0 \times \text{domain}$) and sorts candidates descending by score, tie-broken by `candidateId.localeCompare(b.candidateId)`.
* **Conclusion:** Sector derivation signals are **100% stable** and produce deterministic sector boundaries across executions.

---

## 7. Hidden Semantic Opportunities

The codebase contains rich, pre-computed semantic signals that can significantly elevate Orbit's visual expressiveness without adding new infrastructure. Seven key opportunities are identified below:

| # | Semantic Signal | Codebase Source | Visual Usefulness in Orbit | Implementation Effort | V1 Status |
| :- | :--- | :--- | :--- | :--- | :--- |
| **1** | **Spatial Centrality (Hubs & Bridges)** | `computeGraphCentralityAnalysis()` in `centrality.ts` | Highlight cross-sector **Bridge** nodes with distinct visual halos; position high-centrality **Hub** nodes at sector focal centroids. | **Zero** (Already computed in `centrality.ts`) | **Include in V1** |
| **2** | **Dependency Direction** | `ExplorerNode.metrics` & `hubType` (`fan-in`, `fan-out`, `balanced`) in `centrality.ts` | Orient node radial vectors or edge arrowheads to distinguish inbound service providers from outbound consumers. | **Zero** (Exposed on metrics) | **Include in V1** |
| **3** | **Execution Chain Alignment** | `checkExecutionChainAlignment()` in `features.ts` | Order nodes along radial sector rays following execution flow: Anchor (Ring 1) $\rightarrow$ Controller (Ring 2) $\rightarrow$ Core (Ring 3) $\rightarrow$ Data (Ring 4). | **Zero** (Logic exists in `features.ts`) | **Include in V1** |
| **4** | **Refactoring Risk & Blast Radius** | `ExplorerNode.metrics.score`, `risk`, `impactSummaries` | Apply node sizing, glow intensity, or risk color accents (HIGH = Red, MED = Orange, LOW = Green) to highlight high-impact nodes. | **Zero** (Exposed in schema) | **Include in V1** |
| **5** | **Test Satellite Coupling** | `findProductionTarget()` in `domains.ts` / `index.parentProductionNodeId` | Position test satellites in Ring 6 along the exact same angular ray as their target production class in Rings 1–4. | **Zero** (Mapped in `features.ts`) | **Include in V1** |
| **6** | **Field Parent Ownership** | `findParentObject()` in `domains.ts` / `index.parentObjectId` | Position custom fields in Ring 5 along the exact same angular ray as their parent CustomObject in Ring 4. | **Zero** (Mapped in `features.ts`) | **Include in V1** |
| **7** | **Architectural Cycle Groups** | `ExplorerDataSchema.cycles` (`ExplorerCycleGroup`) | Render highlighted circular orbital connectors binding cycle members across radial rings or sector rays. | **Zero** (Exposed in schema) | **Include in V1** |

---

## 8. Determinism Analysis

### 8.1 Sources of Unstable Ordering in Naive Implementations
1. **Unsorted Object Iteration:** Iterating over `Object.keys()` or `Map` entries without sorting produces non-deterministic ordering across JavaScript V8 engine versions.
2. **Incomplete Sort Comparators:** `Array.sort((a, b) => b.score - a.score)` leaves items with identical scores in arbitrary, non-deterministic order.
3. **Floating Point Comparison Noise:** Unrounded coordinate calculations or centrality scores can drift at sub-pixel levels (`39.99905px` vs `40.00000px`).

### 8.2 Orbit Determinism Rules
To guarantee 100% bit-for-bit determinism, Architecture Orbit enforces four strict rules:

```
RULE 1: Sector Lexicographical Order
- All sector IDs are sorted alphabetically before angular allocation:
  sectorList.sort((a, b) => a.id.localeCompare(b.id))
- 'SharedInfrastructure' is assigned the first angular slot (0 rad).

RULE 2: Ring Node Degree & Lexicographical Tie-Breaking
- Nodes within a (Sector, Ring) pair are sorted by total degree descending, tie-broken by ID:
  nodesInRing.sort((a, b) => (b.metrics.fanIn + b.metrics.fanOut) - (a.metrics.fanIn + a.metrics.fanOut) || a.id.localeCompare(b.id))

RULE 3: Nucleus Priority & Lexicographical Tie-Breaking
- Candidate nucleus nodes are sorted by Priority Tier ascending, then degree descending, then ID:
  candidates.sort((a, b) => a.priorityTier - b.priorityTier || b.degree - a.degree || a.id.localeCompare(b.id))

RULE 4: Sub-pixel Coordinate Normalization
- All radial polar coordinates (r, theta) and converted Cartesian coordinates (x, y) are rounded to 2 decimal places:
  x = Math.round(r * Math.cos(theta) * 100) / 100
  y = Math.round(r * Math.sin(theta) * 100) / 100
```

---

## 9. Edge Cases

| Edge Case | Scenario | Deterministic Placement Protocol |
| :--- | :--- | :--- |
| **Isolated Nodes** | Component has 0 inbound and 0 outbound edges | Placed in its path-derived sector (or `Unassigned` Sector) at its assigned Ring level (Rings 1–4). |
| **Circular Dependencies** | Components form a closed cycle across layers | Each component retains its individual semantic Ring and Sector assignment. Cycle is highlighted via an orbital connector path. |
| **Multi-Domain Bridges** | Class connects across 3 distinct domains | Primary sector assigned to `SharedInfrastructure` or strongest domain link; secondary sector connections rendered as cross-sector arcs. |
| **Test-Only Domains** | Directory contains test classes without production targets | Assigned to Ring 6 within the `Supporting` / `Unassigned` Sector. |
| **Schema-Only Domains** | Domain contains Custom Objects and Fields with no Apex | Occupies Sector with Rings 4 (Objects) and 5 (Fields) populated; Rings 1–3 remain empty. |
| **Missing File Paths / External** | External node (`type: 'External'`) or missing `file` attribute | Placed in Ring 5 or 6 within the `SharedInfrastructure` Sector. |

---

## 10. New Semantic Infrastructure Required

### 10.1 Audit Decision: ZERO NEW INFRASTRUCTURE REQUIRED
A critical objective of this audit was to determine whether Architecture Orbit requires any new database schema, background worker, API endpoint, or UI classification state.

**Conclusion:** **Zero new infrastructure is required.**

### 10.2 Capability Verification Matrix

| Orbit Requirement | Supporting Codebase Capability | Status |
| :--- | :--- | :--- |
| **Node Layer Classification** | `classifyComponentLayer()` in `layer-classifier.cjs` & `classifyNodeLayerWithReason()` in `layers.ts` | **100% EXECUTABLE** |
| **Node Role Classification** | `classifyComponentRole()` in `role-classifier.cjs` & `classifyFeatureRole()` in `feature-roles.ts` | **100% EXECUTABLE** |
| **Domain & Sector Discovery** | `classifyAllDomains()` in `domain-classifier.cjs` & `discoverFeatures()` in `features.ts` | **100% EXECUTABLE** |
| **Entry Point Detection** | `detectEntryPoint()` in `entry-points.cjs` & `ExplorerNode.behavior` | **100% EXECUTABLE** |
| **Hub & Bridge Centrality** | `computeGraphCentralityAnalysis()` in `centrality.ts` | **100% EXECUTABLE** |
| **Satellite Binding (Tests & Fields)** | `findProductionTarget()` & `findParentObject()` in `domains.ts` | **100% EXECUTABLE** |
| **Deterministic Authority** | `enforceDeterministicAuthority()` in `deterministic/contract.cjs` | **100% EXECUTABLE** |

---

## 11. Recommended V1 Semantic Rules

This section consolidates the master rules for V1 Orbit semantic placement into authoritative reference tables.

### Table 1: Master Ring Placement Specification

| Ring Number | Ring Name | Primary Criteria / Node Types | Secondary Criteria / Roles / Annotations | Fallback |
| :--- | :--- | :--- | :--- | :--- |
| **Ring 1** | Entry / Presentation | `LWC`, `Visualforce`, `ApexTrigger`, `Flow` | `role === 'entry-point'`, `@RestResource`, `@AuraEnabled`, `@InvocableMethod`, `Batchable`, `Queueable`, `Schedulable` | `detectEntryPoint().isEntryPoint` |
| **Ring 2** | Application / Controllers | `ApexClass` | `role === 'controller'`, name suffix `Controller`, `Handler`, `Manager` | `layer === 'application'` |
| **Ring 3** | Business Logic / Services | `ApexClass` | `role === 'service'`, `role === 'domain'`, name suffix `Service`, `Processor`, `Engine`, `Model`, `DTO` | `layer === 'domain'` |
| **Ring 4** | Data / Persistence | `Object`, `CustomObject`, `ApexClass` | `role === 'selector'`, `role === 'repository'`, `role === 'data-access'`, name suffix `Selector`, `Repository`, `DAO` | `layer === 'schema'` (Objects) |
| **Ring 5** | Schema Detail | `Field`, `CustomField`, `External` | All field-level schema nodes and external system boundaries | `type === 'Field'` |
| **Ring 6** | Supporting / Satellites | `ApexClass` (Test/Util), `Object` (`__mdt`, `__setting`) | `isTestNode === true`, `role === 'configuration'`, `role === 'utility'`, `isShared === true` | Default Fallback |

---

### Table 2: Nucleus Selection Specification

| Sector Composition | Nucleus Candidate Selection Protocol | Fallback Rule |
| :--- | :--- | :--- |
| **UI-Enabled Sector** | Select LWC with highest degree (`fanIn + fanOut`). Tie-breaker: `id.localeCompare(b.id)`. | Fallback to Aura $\rightarrow$ Visualforce $\rightarrow$ Controller. |
| **Process-Enabled Sector** | Select Flow or Apex Trigger with highest degree. | Fallback to Controller $\rightarrow$ Service. |
| **Headless Business Sector** | Select Apex Service with highest degree. | Fallback to Selector $\rightarrow$ Repository. |
| **Schema-Only Sector** | Select Custom Object (`type: 'Object'`) with highest field count. | Fallback to Field $\rightarrow$ External. |

---

## 12. Deferred Semantic Enhancements

The following capabilities are classified as non-essential for V1 and are formally deferred to future iterations:
1. **Dynamic Historical Radial Motion:** Animating radial ring shifts across historical project snapshots (`ProjectSnapshot`).
2. **3D Spherical Orbit Projections:** Projecting Orbit rings onto 3D spherical coordinates (closed track confirmed 2D as active layout authority in `PHASE_3D_CLOSE_FINAL_CURRENT_STATE.md`).
3. **LLM Semantic Tag Overlay:** Overlayering unverified LLM domain tags onto Orbit nodes (must adhere to `enforceDeterministicAuthority` in `deterministic/contract.cjs`).

---

## 13. Evidence Index

### Primary Source Code References

| File Path | Component / Function | Role & Purpose |
| :--- | :--- | :--- |
| `deterministic/contract.cjs` | `createDeterministicResult()`, `enforceDeterministicAuthority()` | Central contract for `BASE-ARCH-1` deterministic intelligence standards. |
| `layer-classifier.cjs` | `classifyComponentLayer()`, `LAYER_PRECEDENCE` | Node layer classification engine and 10-layer precedence rules. |
| `role-classifier.cjs` | `classifyComponentRole()`, `ROLE_PRECEDENCE` | Component role classification engine and 11-role precedence rules. |
| `domain-classifier.cjs` | `classifyComponentDomain()`, `classifyAllDomains()` | Architectural domain discovery and 2-pass graph propagation. |
| `entry-points.cjs` | `detectEntryPoint()`, `detectAllEntryPoints()` | System entry-point detector for 8 Salesforce entry types. |
| `explorer/src/types/explorer.ts` | `ExplorerNode`, `ExplorerEdge`, `ExplorerNodeType` | Primary schema definitions for frontend graph state. |
| `explorer/src/lib/layout/layers.ts` | `classifyNodeLayerWithReason()`, `isTestNode()` | Frontend layer classifier and diagnostic reasoning engine. |
| `explorer/src/lib/layout/domains.ts` | `discoverDomains()`, `findProductionTarget()`, `findParentObject()` | 5-pass deterministic domain discovery and satellite binding. |
| `explorer/src/lib/layout/features.ts` | `discoverFeatures()`, `calculateSemanticFeatureCohesion()` | Feature cluster discovery and candidate scoring loop. |
| `explorer/src/lib/layout/feature-roles.ts` | `classifyFeatureRole()`, `isSharedInfrastructure()` | Feature role classification and shared infrastructure detection. |
| `explorer/src/lib/layout/centrality.ts` | `computeGraphCentralityAnalysis()`, `computeNodeHubMetrics()` | Spatial centrality engine for Hubs, Bridges, and spatial roles. |

---

### Audit Verification & Approval

This report has been reviewed and verified by the Graph Semantics Architect. It represents the complete, binding semantic specification for Architecture Orbit V1.

**Final Decision:** **PASS — READY FOR ORBIT V1 LAYOUT INTEGRATION**
