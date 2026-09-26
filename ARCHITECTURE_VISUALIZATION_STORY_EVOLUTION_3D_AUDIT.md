# ARCHITECTURE VISUALIZATION, STORY, EVOLUTION & 3D FEASIBILITY AUDIT

## 1. Executive Summary & Context

This document provides a comprehensive, **READ-ONLY feasibility audit** of high-level architectural visualization concepts for the **Salesforce Architecture Explorer & Dependency Analyzer**. It evaluates candidate capabilities requiring guided explanation, architectural pattern recognition, comparison, historical information/diffing, and 3D/spatial representations.

### Context Baseline & Codebase State
* **Canonical Benchmark Dataset**: `audit-fixtures/cloud-spend-tracker/explorer-data.json` (SHA-256 `feeb68f363d91fa0a234cb20b5975d6d6d69695fc9cdead4363806a7ca828295`), containing **240 nodes** and **1,024 edges** across 4 architectural layers (`presentation`: 26, `application`: 50, `domain`: 32, `schema`: 132) and **13 discovered feature regions**.
* **Active 2D Layout Pipeline**: 13-stage deterministic layout engine (`explorer/src/lib/architecture-layout.ts`) providing **Default Hierarchical** ($C_{\text{total}} = 102,780$ crossings) and **Authoritative Hybrid** ($C_{\text{total}} = 85,367$ crossings) layouts with strict physical node clearance ($\ge 40.0\text{px}$) and $0.00000\text{px}$ coordinate stability.
* **Position Authority Contract**: Enforced by `explorer/src/lib/position-policy.ts` across a 5-level hierarchy (Level 1 Session Drag > Level 2 Persisted > Level 3 Canvas > Level 4 Layout Calculation > Level 5 System Fallback).
* **Previous 3D Investigation Baseline**: Formally closed under `PHASE_3D_CLOSE_FINAL_CURRENT_STATE.md`. Previous 3D investigations evaluated perspective projections of 2D $(X,Y)$ coordinates with $Z$ mapped to layer or role elevation, demonstrating that camera projections increase visible screen-space crossings by +4.1% to +40.6% over the 2D baseline.

---

## 2. Audit Story Visualizations

### A. Architecture Story Mode
Architecture Story Mode is a guided step-by-step traversal mechanism that leads a user along a logical architectural stack or dependency flow:

```text
Feature
 → LWC (Presentation)
 → Controller / ApexClass (Application)
 → Service / ApexClass (Domain)
 → Shared Service (Shared Infrastructure)
 → Selector / ApexClass (Domain Data Access)
 → Object / CustomObject (Schema)
 → Field / CustomField (Schema)
 → Cross-feature dependencies
```

#### Capability Audit of Current Subsystems

1. **Selection & Focus (`explorer/src/lib/focus-graph.ts`, `explorer/src/components/FocusControls.tsx`)**:
   * **Current Status**: `VERIFIED`. `computeFocusGraph()` supports depth-based neighborhood isolation (depth 1 to 5), direction filtering (`upstream`, `downstream`, `both`), and focal node tracking (`focalNodeId`).
   * **Story Support**: Capable of driving step-by-step focal node transitions. Stepping from an LWC node down to its Controller and Service uses existing 1-hop downstream focus routines.

2. **Filtering & Node Type Visibility (`explorer/src/lib/search-filter.ts`)**:
   * **Current Status**: `VERIFIED`. Filter state supports filtering by node types (`ApexClass`, `CustomField`, `CustomObject`, `LWC`, `ApexTrigger`, `External`), layers (`presentation`, `application`, `domain`, `schema`), and feature membership.
   * **Story Support**: Story Mode can activate pre-set filter masks at each step.

3. **Navigation & Breadcrumbs (`explorer/src/components/Breadcrumbs.tsx`)**:
   * **Current Status**: `VERIFIED`. Breadcrumb history tracks navigation steps and project paths.
   * **Story Support**: Capable of recording the active story traversal sequence.

4. **Panels & Detail Views (`explorer/src/components/Sidebar.tsx`, `InvestigationDrawer.tsx`)**:
   * **Current Status**: `VERIFIED`. Sidebar displays complete node metadata, incoming/outgoing edges, metrics, and risk scores.
   * **Story Support**: Supports story text overlays, step explanations, and architectural callouts.

5. **Missing Orchestrator Driver**:
   * **Status**: `NEW UI REQUIRED` / `NEW ANALYSIS REQUIRED`. Lacks an automated Story Orchestrator state machine (step index, automated camera pan/zoom animations, step narrative text).

#### Feasibility Classification: `PARTIALLY SUPPORTED` / `NEW UI REQUIRED` / `NEW ANALYSIS REQUIRED`
All graph data, traversal algorithms, focus mechanics, and metadata needed for Story Mode exist today (`VERIFIED`). Creating Story Mode requires building a UI state driver and narrative overlay, without changing graph algorithms or backend schemas.

---

### B. Architecture Pattern / Grammar View

Evaluating pattern recognition against graph semantics to detect canonical patterns such as:
* **Standard Tier Pattern**: `Feature → LWC → Service → Selector → CustomObject`
* **Shared Service Fan-In Pattern**: `Feature A / B / C → Shared Service`

#### Pattern Detection Classification Matrix

| Pattern / Grammar Structure | Classification Tier | Feasibility Classification |
| :--- | :--- | :--- |
| **LWC → Controller (1:1 / 1:N)** | `SOURCE METADATA` (`LWC`, `ApexClass`, `CALLS`) | `VERIFIED` |
| **Controller → Service** | `HEURISTIC CLASSIFICATION` (`layers.ts`) | `DERIVABLE` / `NEW ANALYSIS REQUIRED` |
| **Service → Selector** | `HEURISTIC CLASSIFICATION` (`layers.ts`, query metrics) | `DERIVABLE` / `NEW ANALYSIS REQUIRED` |
| **Selector → CustomObject** | `SOURCE METADATA` (`SOQL`, `soql-object`) | `VERIFIED` |
| **Shared Service Fan-In (`SharedInfra`)** | `HEURISTIC CLASSIFICATION` (`feature-roles.ts`) | `VERIFIED` |
| **Full Canonical Pipeline (`Feature → LWC → Service → Selector → Object`)** | `HEURISTIC CLASSIFICATION` + `DERIVED CLASSIFICATION` | `DERIVABLE` / `NEW ANALYSIS REQUIRED` / `NEW UI REQUIRED` |
| **Circular Architectural Anti-Patterns** | `DERIVED CLASSIFICATION` (`ExplorerDataSchema.cycles`) | `VERIFIED` |
| **Implicit / Dynamic Runtime Invocation** | Unresolved references / string reflection | `NEW DATA REQUIRED` |
| **Human Architectural Intent (e.g. Unit of Work, Factory)** | Explicit manual architecture labels | `HUMAN-CURATED ARCHITECTURE` (**NOT IN SCHEMA**) |

---

## 3. Audit Comparison

### Feature Comparison Capability
Comparing two features (e.g., `Feature A` vs `Feature B`) requires side-by-side metric and structural aggregation.

#### Data Dimension Audit for Feature Comparison

| Comparison Dimension | Data Classification Tier | Existing Source / Extraction Method |
| :--- | :--- | :--- |
| **Component Count** | `SOURCE METADATA` | Count nodes where `node.featureId === feature.id` |
| **Services / Controllers** | `HEURISTIC CLASSIFICATION` | Filter feature nodes by `layer === 'application'` or `'domain'` |
| **Selectors** | `HEURISTIC CLASSIFICATION` | Filter feature nodes by `type === 'ApexClass'` with query metrics/naming |
| **Custom Objects** | `SOURCE METADATA` | Filter feature nodes by `type === 'CustomObject'` or schema boundary |
| **Custom Fields** | `SOURCE METADATA` | Filter feature nodes by `type === 'CustomField'` |
| **Internal Dependencies** | `DERIVED CLASSIFICATION` | Count edges where both `source` and `target` belong to feature |
| **External Dependencies** | `DERIVED CLASSIFICATION` | Count edges where `source` or `target` is outside feature |
| **Shared Components Used** | `HEURISTIC CLASSIFICATION` | Target nodes connected to feature with `featureRole === 'SharedInfrastructure'` |
| **Cross-Feature Connections** | `DERIVED CLASSIFICATION` | Inter-feature edges identified in Stage 3.5 feature analysis |

#### UI State & Layout Support
* **Current UI Capability**: The codebase features a `ComparePanel.tsx` (`explorer/src/components/ComparePanel.tsx`) for cross-project comparison.
* **Feature Comparison Status**: Current UI state (`projectState.ts`) supports single-project active focus. Side-by-side feature comparison requires mounting two parallel feature summaries in a split panel or overlay view (`NEW UI REQUIRED`).

#### Feasibility Classification: `DERIVABLE` / `NEW UI REQUIRED`

---

## 4. Audit Architecture Diff

### Scope & Repository Capabilities
Architecture diffing evaluates changes between two graph states (Snapshot Before vs Snapshot After):
* Added / Removed Nodes
* Added / Removed Edges
* Changed Categories / Node Types
* Changed Feature Membership / Roles

#### Existing Infrastructure Verification
* **Backend Engine**: `architecture-diff.cjs` exists in the repository root and exports `diffSnapshots(before, after, options)` (`VERIFIED`).
* **Frontend Adapter**: `explorer/src/lib/diff-adapter.ts` exports `diffSnapshots()` and `buildDiffOverlayGraph(before, after, diffResult)` (`VERIFIED`).
* **Data Types**: `DiffResult`, `DiffOverlayNode`, `DiffOverlayEdge`, `DiffOverlayGraph` are fully defined in `diff-adapter.ts` (`VERIFIED`).
* **Diff States Handled**: `added`, `removed`, `changed`, `unchanged`.

#### Snapshot Requirements
* Architecture diffing **requires two distinct snapshot payloads** (`beforeSnapshot` and `afterSnapshot`).
* When provided with two snapshots (e.g., via file upload, project comparison, or refactoring simulation before/after states), `diff-adapter.ts` builds a complete merged overlay graph.

#### Feasibility Classification: `VERIFIED` (Diff Engine) / `HISTORICAL DATA REQUIRED` / `NEW UI REQUIRED`

---

## 5. Audit Time Machine

The "Time Machine" concept assumes scrubbing through a temporal slider (e.g., Commit $T_1 \to T_2 \to T_3$) to view architectural evolution over time.

### Audit Checklist

| Requirement | Current Codebase Status | Findings |
| :--- | :--- | :--- |
| **Historical Graph Snapshots** | `HISTORICAL DATA REQUIRED` | `projectState.ts` stores only the active `ExplorerDataSchema` payload. |
| **Versioned Metadata** | `HISTORICAL DATA REQUIRED` | Analysis outputs carry `analyzerVersion` (13.0.0), but no git/temporal commit history. |
| **Timestamps** | `PARTIALLY SUPPORTED` | `exportedAt` ISO timestamp exists on exported projects; no series data. |
| **Stable Node IDs** | `VERIFIED` | Node IDs are deterministic (`Type:Name` or `CustomField:Object.Field`). |
| **Previous Architecture States** | `HISTORICAL DATA REQUIRED` | Codebase contains no temporal database or git commit snapshot parser. |

#### Feasibility Classification: `HISTORICAL DATA REQUIRED` / `NEW DATA REQUIRED` / `NEW UI REQUIRED`

---

## 6. SPECIAL AUDIT — THE USER'S PROPOSED 3D CATEGORY MODEL

The user proposed a 5-tier architectural category hierarchy for 3D spatial representation:
* **Category 1 = Features**
* **Category 2 = LWC + Controllers**
* **Category 3 = Services**
* **Category 4 = Selectors**
* **Category 5 = Objects + Fields**

### Audit of Category Data Availability in Current Graph

| Proposed Category | Classification Tier | Existence Status | Derivation Method |
| :--- | :--- | :--- | :--- |
| **Category 1: Features** | `HEURISTIC CLASSIFICATION` | `DERIVABLE` | Computed via `discoverFeatures()` in `features.ts` |
| **Category 2: LWC + Controllers** | `SOURCE METADATA` (`LWC`) + `HEURISTIC CLASSIFICATION` (`Controllers`) | `DERIVABLE` | `node.type === 'LWC'` or `classifyNodeLayer()` assigning `presentation`/`application` |
| **Category 3: Services** | `HEURISTIC CLASSIFICATION` | `DERIVABLE` | `classifyNodeLayer()` assigning `domain` layer or matching `*Service` stem |
| **Category 4: Selectors** | `HEURISTIC CLASSIFICATION` | `DERIVABLE` | `classifyNodeLayer()` assigning `domain` layer or matching `*Selector` stem / query metrics |
| **Category 5: Objects + Fields** | `SOURCE METADATA` | `VERIFIED` | `node.type === 'Object' \| 'CustomObject' \| 'Field' \| 'CustomField'` |

### Conclusion on Category Model
The current graph **contains sufficient information** to partition components into these 5 categories using a combination of `SOURCE METADATA` (`LWC`, `Object`, `CustomObject`, `Field`, `CustomField`) and `HEURISTIC CLASSIFICATION` (`Controllers`, `Services`, `Selectors`, `Features`). Human-curated manual category overrides are `HUMAN-CURATED ARCHITECTURE` and do NOT currently exist in the schema.

---

## 7. EVALUATION OF PROPOSED 3D SEMANTIC MODELS

Four candidate 3D spatial models (plus 3D City) are evaluated individually across required technical dimensions.

---

### 3D Model A: Feature × Architecture Flow × Sharedness

```text
X = Feature Region
Y = Architecture Flow / Category Layer
Z = Sharedness / Reuse Score
```

#### Dimension Evaluation
* **X Dimension (Feature Region)**: `DERIVABLE` (`HEURISTIC CLASSIFICATION` via `discoverFeatures()`)
* **Y Dimension (Architecture Flow)**: `DERIVABLE` (`HEURISTIC CLASSIFICATION` via `classifyNodeLayer()` or Category 1..5)
* **Z Dimension (Sharedness / Reuse Score)**: `DERIVABLE` (`DERIVED CLASSIFICATION` via `metrics.fanIn` or `isSharedInfrastructure()`)
* **Rendering Status**: `NEW RENDERING REQUIRED` (WebGL / Three.js viewport component)
* **Position Policy Compliance**: Preserves Level 1–5 2D $(X,Y)$ position authority if $Z$ is computed as a pure read-only spatial projection.
* **Feasibility Classification**: `EXPERIMENTAL` / `NEW RENDERING REQUIRED`

---

### 3D Model B: Feature × Architecture Category × Dependency Depth

```text
X = Feature Region
Y = Architecture Category Layer
Z = Dependency Depth (Static DAG Topological Rank / Distance)
```

#### Dimension Evaluation
* **X Dimension (Feature Region)**: `DERIVABLE` (`HEURISTIC CLASSIFICATION`)
* **Y Dimension (Architecture Category)**: `DERIVABLE` (`HEURISTIC CLASSIFICATION` / `SOURCE METADATA`)
* **Z Dimension (Dependency Depth)**: `DERIVABLE` (`DERIVED CLASSIFICATION` via static DAG topological rank or BFS distance) — **STATIC DEPENDENCY GRAPH ONLY**
* **Rendering Status**: `NEW RENDERING REQUIRED` (WebGL / Three.js viewport component)
* **Position Policy Compliance**: Preserves Level 1–5 2D position authority if $Z$ is derived deterministically from DAG topological rank.
* **Feasibility Classification**: `EXPERIMENTAL` / `NEW RENDERING REQUIRED`

---

### 3D Model C: Feature × Architecture Category × Cross-Feature Connectivity

```text
X = Feature Region
Y = Architecture Category Layer
Z = Cross-Feature Connectivity (Inter-Feature Edge Count)
```

#### Dimension Evaluation
* **X Dimension (Feature Region)**: `DERIVABLE` (`HEURISTIC CLASSIFICATION`)
* **Y Dimension (Architecture Category)**: `DERIVABLE` (`HEURISTIC CLASSIFICATION` / `SOURCE METADATA`)
* **Z Dimension (Cross-Feature Connectivity)**: `DERIVABLE` (`DERIVED CLASSIFICATION` via count of inter-feature edges)
* **Rendering Status**: `NEW RENDERING REQUIRED` (WebGL / Three.js viewport component)
* **Position Policy Compliance**: Preserves Level 1–5 2D position authority as a read-only height projection.
* **Feasibility Classification**: `EXPERIMENTAL` / `NEW RENDERING REQUIRED`

---

### 3D Model D: Feature × Architecture Category × Dependency Role / Centrality

```text
X = Feature Region
Y = Architecture Category Layer
Z = Dependency Role / Centrality (Hub Score / Bridge Score)
```

#### Dimension Evaluation
* **X Dimension (Feature Region)**: `DERIVABLE` (`HEURISTIC CLASSIFICATION`)
* **Y Dimension (Architecture Category)**: `DERIVABLE` (`HEURISTIC CLASSIFICATION` / `SOURCE METADATA`)
* **Z Dimension (Centrality / Role)**: `DERIVABLE` (`DERIVED CLASSIFICATION` via `hubScore` / `bridgeScore` / `featureRole`)
* **Rendering Status**: `NEW RENDERING REQUIRED` (WebGL / Three.js viewport component)
* **Position Policy Compliance**: Preserves Level 1–5 2D position authority as a read-only height projection.
* **Feasibility Classification**: `EXPERIMENTAL` / `NEW RENDERING REQUIRED`

---

### 3D Architecture City

```text
Feature = Neighborhood District
Component = Building (Height = Coupling / Lines of Code, Footprint = Risk Metrics)
Shared Infrastructure = Central Tower / Landmark
Dependency = Ground Road / Transit Line
```

#### Dimension Evaluation
* **District Bounds**: `DERIVABLE` (`HEURISTIC CLASSIFICATION`)
* **Building Heights / Footprints**: `DERIVABLE` (`DERIVED CLASSIFICATION` / `SOURCE METADATA`)
* **Spatial Layout**: `NEW LAYOUT REQUIRED` (Procedural 3D spatial area packing / treemap layout engine)
* **Rendering Status**: `NEW RENDERING REQUIRED` (WebGL 3D mesh rendering with building shaders)
* **Position Policy Compliance**: **INCOMPATIBLE WITH 2D POSITION AUTHORITY**. Replaces 2D DAG coordinates with district area packing.
* **Feasibility Classification**: `EXPERIMENTAL` / `NEW LAYOUT REQUIRED` / `NEW RENDERING REQUIRED`

---

## 8. RECONCILIATION WITH PREVIOUS 3D INVESTIGATION

Per Section 10 of the audit specification, findings are reconciled strictly with historical 3D experiments:

1. **Previously Tested**:
   * Perspective camera projections of flat 2D DAG layout coordinates $(X,Y)$ with $Z$ elevation mapped to architectural layer tiers or feature roles (`PHASE_3D_EVIDENCE_SCREEN_SPACE_SEMANTIC_VALIDATION.md`).
2. **Previously Established**:
   * Projecting 2D DAG node coordinates through a 3D perspective camera matrix increased visible screen-space line segment crossings from **85,367** (2D baseline) up to **91,087–123,078** (+4.1% to +40.6%), due to camera tilt and perspective foreshortening overlapping previously separated edge lines.
3. **Not Tested**:
   * Model A (Z = Sharedness / Reuse score)
   * Model C (Z = Inter-feature edge count)
   * Model D (Z = Centrality / Bridge score)
   * 3D Architecture City (metaphorical spatial district area packing without topological node-edge lines)
4. **Still Applicable**:
   * 3D perspective camera projections of line-edge graphs do **NOT** solve planar 2D edge crossing density. 2D Position Authority remains the primary production ground truth.
5. **Requires New Experiment**:
   * Models A, C, D and 3D Architecture City represent distinct multi-dimensional spatial encoding candidates subject to WebGL implementation and empirical user task performance testing (`EXPERIMENTAL`).
6. **Narrow Language Governance**:
   * Avoid concluding "3D is impossible" or "3D is better". Conclude: 3D perspective projection does not reduce line crossings, but offers multi-dimensional spatial encoding candidates subject to WebGL implementation and empirical validation (`EXPERIMENTAL`).

---

## 9. MASTER RECONCILIATION MATRIX

| Lens / Capability | Data Status | Existing UI | Rendering Support | Historical Data | Feasibility Classification |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Story Mode** | `PARTIALLY SUPPORTED` | `NEW UI REQUIRED` | `VERIFIED` (2D Canvas) | Not Required | `PARTIALLY SUPPORTED` / `NEW UI REQUIRED` |
| **Pattern View** | `DERIVABLE` | `NEW UI REQUIRED` | `VERIFIED` (2D Canvas) | Not Required | `DERIVABLE` / `NEW ANALYSIS REQUIRED` / `NEW UI REQUIRED` |
| **Feature Comparison** | `DERIVABLE` | `NEW UI REQUIRED` | `VERIFIED` (DOM Panel) | Not Required | `DERIVABLE` / `NEW UI REQUIRED` |
| **Architecture Diff** | `VERIFIED` (Diff Engine) | `NEW UI REQUIRED` | `VERIFIED` (Diff Overlay) | `HISTORICAL DATA REQUIRED` | `VERIFIED` (Engine) / `HISTORICAL DATA REQUIRED` / `NEW UI REQUIRED` |
| **Time Machine** | `HISTORICAL DATA REQUIRED` | `NEW UI REQUIRED` | `VERIFIED` (2D Canvas) | `HISTORICAL DATA REQUIRED` | `HISTORICAL DATA REQUIRED` / `NEW DATA REQUIRED` |
| **3D Model A (Sharedness)** | `DERIVABLE` | `NEW UI REQUIRED` | `NEW RENDERING REQUIRED` | Not Required | `EXPERIMENTAL` / `NEW RENDERING REQUIRED` |
| **3D Model B (Depth)** | `DERIVABLE` (Static DAG) | `NEW UI REQUIRED` | `NEW RENDERING REQUIRED` | Not Required | `EXPERIMENTAL` / `NEW RENDERING REQUIRED` |
| **3D Model C (Cross-Feature)**| `DERIVABLE` | `NEW UI REQUIRED` | `NEW RENDERING REQUIRED` | Not Required | `EXPERIMENTAL` / `NEW RENDERING REQUIRED` |
| **3D Model D (Centrality)** | `DERIVABLE` | `NEW UI REQUIRED` | `NEW RENDERING REQUIRED` | Not Required | `EXPERIMENTAL` / `NEW RENDERING REQUIRED` |
| **3D Architecture City** | `DERIVABLE` | `NEW UI REQUIRED` | `NEW RENDERING REQUIRED` | Not Required | `EXPERIMENTAL` / `NEW LAYOUT REQUIRED` / `NEW RENDERING REQUIRED` |

---

## 10. FINAL RECONCILED SUMMARY STATEMENT

```text
NO PRODUCTION CODE CHANGED
NO LAYOUT ALGORITHM CHANGED
NO POSITION AUTHORITY CHANGED
NO PROJECT STATE CHANGED
NO FIXTURE CHANGED
NO WEBGL DEPENDENCY ADDED
RECONCILED AUDIT REPORT: ARCHITECTURE_VISUALIZATION_STORY_EVOLUTION_3D_AUDIT.md
```
