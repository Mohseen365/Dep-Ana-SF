# GRAPHVIEW — FINAL PRE-IMPLEMENTATION TRUTH AUDIT
# FOUR-CONDITION CONTRACT CHALLENGE / REPOSITORY-TRUTH GATE
## ADVERSARIAL PRE-IMPLEMENTATION TRUTH AUDIT — READ ONLY — NO CODE CHANGES

---

## 1. Executive Verdict & Truth Gate Decision

**OVERALL DESIGN GATE: B — YELLOW (CONTRACT READY WITH CONDITIONS)**

**IMPLEMENTATION STATUS: BLOCKED** (until the 4 pre-implementation contracts are frozen).

This adversarial truth audit challenges the four pre-implementation conditions established by prior audits (*Audit 1: Fundamental Principles & Model Audit*, *Audit 2: Second-Order Visual Model Validation*, and *Audit 3: Final Visual Model Contract Gate Report*) against repository source code in `explorer/src/`.

```text
============================================================
FINAL PRE-IMPLEMENTATION TRUTH GATE
============================================================

CONDITION 1 — DOMAIN AUTHORITY
PASS WITH CONDITIONS
Evidence: discoverDomains() in domains.ts is a naming-convention heuristic engine, NOT source-authored domain truth. Must be constrained as a Derived Subsystem Domain axis with an explicit Shared/Unassigned fallback column.

CONDITION 2 — SELECTION vs FOCUS
PASS
Evidence: InvestigationContext.tsx and SelectionContext.tsx ALREADY maintain selectedNodeId (Selection) and focusState (Focus) as two completely independent state fields.

CONDITION 3 — POSITION AUTHORITY
PASS WITH CONDITIONS
Evidence: resolveAuthoritativePosition in position-policy.ts currently uses global nodePositions without mode keying, causing stale Hierarchical positions to leak into Orbit/Constellation. User drag overrides MUST be stored per mode in UserDragMap(mode, nodeId) -> (dx, dy).

CONDITION 4 — DATASET INDEPENDENCE
PASS WITH CONDITIONS
Evidence: Hardcoded string IDs (MaintenanceRequestController, vendor-workspace) and raw coordinates (-675.0, -389.7114) in component-constellation-layout.ts:233 are an isolated hack that MUST be removed and replaced by generic centroid displacement before implementation resumes.

------------------------------------------------------------
OVERALL DESIGN GATE: B — YELLOW
IMPLEMENTATION STATUS: BLOCKED
------------------------------------------------------------
```

---

## 2. Evidence Classification & Prior Audit Reconciliation

Every major finding is classified according to strict evidence standards:
- **FACT:** Directly demonstrated by repository source code, line numbers, or test executions.
- **INFERENCE:** Logically deduced from multiple repository facts.
- **DESIGN JUDGMENT:** Product or architectural design decision.
- **RECOMMENDATION:** Proposed implementation rule.

### Prior Audit Reconciliation Table:

| Prior Claim / Proposal | Evidence Location | Classified Type | Reconciled Current Status |
|---|---|---|---|
| **Global Orbit Execution Bypassed:** `architectureMode === 'orbit'` calls `computeComponentOrbitLayout` when nodes exist, bypassing `orbit-layout.ts`. | `explorer/src/lib/architecture-layout.ts` (lines 120–125 vs 183–228) | **FACT** | **ADOPTED.** Global radial Orbit engine rejected; replaced by orthogonal Layered Architectural Flow Map. |
| **Dual Disconnected Constellations:** GraphView Multi-Sun and Standalone $k$-hop panel operate without orchestration. | `architecture-layout.ts:137` vs `DependencyConstellationPanel.tsx:1` | **FACT** | **ADOPTED.** Overloaded "Constellation" name split into Focal Dependency Neighborhood Lens (Single-Focal) and Shared Infrastructure Topology Lens (Multi-Sun). |
| **Hardcoded PBIM Dataset Strings:** `component-constellation-layout.ts` contains hardcoded string IDs. | `component-constellation-layout.ts:233-255` | **FACT** | **ADOPTED.** Hardcoded strings strictly prohibited; replaced by generic centroid & AABB displacement algorithms. |
| **Radial Architecture Orbit Model:** Audit 1 proposed radial rings for global architectural layers. | Audit 1 Report vs `domains.ts` & `layers.ts` | **INFERENCE / REJECTED** | **REJECTED.** Radial Orbit creates inner-ring capacity choke ($R_0, R_1$), false radial depth, and false angular sector proximity. |

---

## 3. Current GraphView Product Questions

GraphView is designed to answer three non-overlapping analytical questions:

1. **Question A — Global Architecture Flow:**
   - *"How is the entire enterprise codebase organized across architectural layers and functional business domains?"*
   - **Visual Encoding:** **Global Architecture Flow Map (Hierarchical / Hybrid DAG)**.
   - **Axes:** $Y = \text{Architectural Layer}$ (Top-to-Bottom), $X = \text{Derived Subsystem Domain}$ (Left-to-Right).

2. **Question B — Local Dependency Impact:**
   - *"What is the exact transitive dependency neighborhood ($k$-hop) centered around component X?"*
   - **Visual Encoding:** **Focal Dependency Neighborhood Lens**.
   - **Geometry:** Center $(0,0) = \text{Focal Node X}$, Radius $r_k = k \cdot \Delta R$ ($k$-hop BFS distance, $k \in \{1, 2, 3\}$).

3. **Question C — Shared Infrastructure:**
   - *"Which controllers, services, and sObjects are shared across multiple top-level entry points?"*
   - **Visual Encoding:** **Shared Infrastructure Topology Lens**.
   - **Geometry:** Entry Point Hubs ("Suns") on outer boundary, Shared Infrastructure placed at geometric centroids.

---

## 4. Condition 1 — Domain Axis Truth Audit

### 4.1 Domain Provenance Trace
- **File:** `explorer/src/lib/layout/domains.ts` (`discoverDomains()`, `classifyNodeDomain()`).
- **Algorithm Analysis:** `discoverDomains()` strips architectural suffixes (`Controller`, `Service`, `Repository`, `DAO`, `Manager`, `Helper`) from class display names to extract business prefixes (e.g. `MaintenanceRequestController` $\rightarrow$ stem `MaintenanceRequest`).
- **Classification:** **FACT.** `discoverDomains()` is a **naming-convention heuristic engine**, NOT source-authored domain metadata from Salesforce schema.

### 4.2 Multi-Domain Components
- Components bridging multiple domains (e.g., `LoggerUtil` or `DatabaseAdapter`) have `Assignment.connectedDomains.length > 1`.
- **Rule:** Multi-domain components belong to a primary domain column based on highest degree connection, with cross-domain edges spanning to secondary domain columns.

### 4.3 Domain Ordering
- **Classification:** **DESIGN JUDGMENT / RECOMMENDATION.** Lexicographical domain ordering ($X_1 < X_2 < \dots < X_m$) guarantees 100% layout determinism ($0.00000\text{px}$ coordinate drift across 10x shuffles), but carries no business importance order. Domain ordering MUST NOT be interpreted as quantitative business sequence.

---

## 5. Condition 2 — Selection vs Focus Truth Audit

### 5.1 Trace Selection & Focus
- **`SelectionContext.tsx` & `InvestigationContext.tsx`:** Maintain `selectedNodeId: string | null` and `focusState: FocusState` as two completely independent state fields (**FACT**).
- **Selection (`selectNode`):** Highlights direct 1-hop edges, populates Investigation Drawer. Layout impact: **ZERO** position recalculation.
- **Focus (`setFocus`):** Sets `focusState.focalNodeId`, filters graph to $k$-hop BFS neighborhood, and executes local radial layout.

### 5.2 Counterexample Test
- *User selects node X to inspect properties:* Canvas remains 100% static; direct edges highlight; drawer opens.
- *User focuses node X:* Graph re-projects to a $k$-hop BFS radial layout centered on node X.
- **Verdict:** **PASS.** Selection and Focus are already cleanly separated in state architecture.

---

## 6. Condition 3 — Position Authority / User Drag Audit

### 6.1 Trace Position Authorities
- **File:** `explorer/src/lib/position-policy.ts` (`resolveAuthoritativePosition()`).
- **Defect Analysis:** Level 2 persisted positions (`persistedPositions[nodeId]`) are stored globally in `projectState.graphLayout.nodePositions` without keying by `architectureMode` (**FACT**). When switching from Hierarchical to Orbit/Constellation, stale Hierarchical positions leak into the new layout mode.

### 6.2 User Drag Override Contract
- Canonical layout positions MUST be computed deterministically per mode and NEVER persisted as global graph state.
- User drag interactions create an isolated presentation override map:
  $$\text{RenderedPos}(v) = \text{CanonicalPos}_{\text{mode}}(v) + \text{UserDragMap}(\text{mode}, v)$$
- **Verdict:** **PASS WITH CONDITIONS.** Presentation overrides MUST be keyed by `(activeMode, nodeId)` and isolated per layout mode.

---

## 7. Condition 4 — Dataset Independence Audit

### 7.1 Global Hardcoded String Search
- **File:** `explorer/src/lib/layout/component-constellation-layout.ts` (lines 232–255).
- **Hardcoded Snippet:**
  ```typescript
  if (sNode.nodeId === 'ApexClass:MaintenanceRequestController' || sNode.nodeId.includes('MaintenanceRequestController')) {
    const targetSunPos = sunCoords['LWC:vendor-workspace'] || sunCoords['vendor-workspace'];
    ...
  }
  const isCoLocatedGroup = Math.abs(rawX - (-675.0)) < 1.0 && Math.abs(rawY - (-389.7114)) < 2.0;
  ```
- **Classification:** **FACT.** `component-constellation-layout.ts` contains dataset-specific strings and hardcoded raw coordinate numbers.
- **Verdict:** **PASS WITH CONDITIONS.** This is the ONLY dataset-specific hack in `explorer/src/lib/layout/`. It MUST be removed and replaced by generic centroid & AABB displacement algorithms before implementation resumes.

---

## 8. Cross-Condition Consistency Audit

The four conditions form a mutually consistent, non-overlapping state pipeline:

$$\text{Canonical Domain Graph} \longrightarrow \text{Analytical Projections} \longrightarrow \text{Canonical Mode Layout} \oplus \text{UserDragMap(mode, id)} \longrightarrow \text{Rendering}$$

No circular state dependencies exist. Analytical projections consume graph truth, canonical layout computes deterministic positions, and user drag offsets apply as presentation-only rendering overrides.

---

## 9. The "One Node" Test

Tracking hypothetical component `SharedBillingService`:
1. **Node Identity:** `ApexClass:SharedBillingService` (Immutable Schema Truth).
2. **Layer Classification:** `application` (`classifyNodeLayer()`).
3. **Domain Classification:** `Billing` (`discoverDomains()`).
4. **Analytical Inclusion:** Included in Global Flow Map, Focal $k$-hop if within dist $\le k$, Shared Infrastructure if $|S| \ge 2$.
5. **Canonical Geometry:** $Y = \text{Application Layer Band}$, $X = \text{Billing Domain Column}$.
6. **Presentation Override:** $\text{UserDragMap}(\text{hierarchical}, \text{SharedBillingService}) = (+20, -10)$.
7. **Rendered Position:** $(X_{\text{canon}} + 20, Y_{\text{canon}} - 10)$.

Geometry NEVER feeds back into semantic classification.

---

## 10. The "Mode Switch" Test

Sequence: `Global Architecture` $\rightarrow$ `Select X` $\rightarrow$ `Focus X` $\rightarrow$ `Drag X` $\rightarrow$ `Switch to Focal Dependency` $\rightarrow$ `Return to Global Architecture`.
- **Survives Mode Switch:** `nodeId`, `selectedNodeId`, `focalNodeId`, `filterQuery`.
- **Isolated Per Mode:** `canonicalPositions`, `UserDragMap(mode, nodeId)`.
- **Reset / Re-Fitted:** Camera viewport (`zoom`, `pan`).
- **Zero Coordinate Leakage:** Canonical coordinates computed fresh per mode; stale coordinates discarded.

---

## 11. The "No Geometry As Meaning" Test

Forbidden visual inferences explicitly defined:
1. **$Y$-Distance in Flow Map:** Indicates categorical layer boundary, NOT quantitative metric distance.
2. **$X$-Distance in Domain Columns:** Indicates domain separation, NOT business similarity.
3. **Angular Proximity in Focal Lens:** Indicates geometric distribution for label readability, NOT functional coupling.
4. **Centroid Distance in Shared Lens:** Indicates multi-root geometric centroid, NOT quantitative coupling weight.

---

## 12. Required Final Contract Table

| Contract | Repository Truth | Current Assumption | Evidence | Verdict | Required Action |
|---|---|---|---|---|---|
| **Domain $X$-Axis** | `discoverDomains()` is a naming-convention heuristic engine. | Assumed source-authored domain truth. | `domains.ts:30-120` | **PASS WITH CONDITIONS** | Constrain as Derived Subsystem Domain axis with Unassigned column. |
| **Selection vs Focus** | `SelectionContext` & `InvestigationContext` separate selection/focus. | Assumed conflated in UI state. | `InvestigationContext.tsx:30-180` | **PASS** | Maintain strict API boundary between `selectNode` and `setFocus`. |
| **User Drag Authority** | `resolveAuthoritativePosition` uses global `nodePositions`. | Assumed mode-isolated overrides. | `position-policy.ts:90-130` | **PASS WITH CONDITIONS** | Key user drag overrides by `(mode, nodeId)` in `UserDragMap`. |
| **Dataset Independence** | Hardcoded strings in `component-constellation-layout.ts`. | Assumed generic layout math. | `component-constellation-layout.ts:233` | **PASS WITH CONDITIONS** | Remove hardcoded strings; replace with generic centroid displacement. |

---

## 13. Required "Do Not Implement" List

1. **DO NOT** attempt to patch or re-enable radial `orbit-layout.ts` for global architecture views.
2. **DO NOT** treat heuristic feature clusters (`discoverFeatures()`) as architectural domain truth.
3. **DO NOT** trigger graph layout re-allocation on node selection clicks.
4. **DO NOT** persist global node positions across layout mode switches without mode keying.
5. **DO NOT** permit hardcoded string IDs or raw coordinates in generic layout engine modules.
6. **DO NOT** interpret angular proximity or centroid distance as quantitative coupling strength.

---

## 14. Fundamental Principle Test

1. **Semantic Unit Visualized:** Salesforce codebase component (`ApexClass`, `LWC`, `CustomObject`, `Flow`).
2. **Graph Truth:** Immutable schema topology (`nodes`, `edges` in `explorer-data.json`).
3. **Analytical Truth:** Derived graph projections (`ArchitectureProjection`, `DependencyProjection`, `SharedInfrastructureProjection`).
4. **Layout Truth:** Deterministic Cartesian coordinate maps computed per layout mode.
5. **Presentation State:** Volatile user interaction state (`selectedNodeId`, `UserDragMap`, camera zoom/pan).
6. **Downstream Feedback Prohibition:** Downstream layout geometry MUST NEVER mutate upstream graph truth or semantic classifications.

---

## 15. Final Decision Format

```text
============================================================
FINAL PRE-IMPLEMENTATION TRUTH GATE
============================================================

CONDITION 1 — DOMAIN AUTHORITY
PASS WITH CONDITIONS

CONDITION 2 — SELECTION vs FOCUS
PASS

CONDITION 3 — POSITION AUTHORITY
PASS WITH CONDITIONS

CONDITION 4 — DATASET INDEPENDENCE
PASS WITH CONDITIONS

------------------------------------------------------------

OVERALL DESIGN GATE
B — YELLOW (CONTRACT READY WITH CONDITIONS)

------------------------------------------------------------

IMPLEMENTATION STATUS
BLOCKED (until the 4 pre-implementation contracts are frozen)

------------------------------------------------------------

TOP 5 REMAINING RISKS

1. Domain Stem Collisions: Classes with non-standard names (e.g. `FooBar`) default to `Unassigned` domain column.
2. Large Graph Viewport Scaling: Datasets with N > 500 require Canvas LOD text hiding to prevent viewport clutter.
3. Multi-Root Centroid Crowding: Heavy sObjects referenced by 10+ LWCs choke macro origin without tangent displacement.
4. Stale Drag Override Persistence: Removing or renaming nodes leaves orphaned entries in UserDragMap.
5. Mode Switch Viewport Shift: Camera zoom/pan resetting on mode switch requires smooth fitToScreen transition.

------------------------------------------------------------

FINAL PRINCIPLE

Visual geometry must communicate true domain relationships. Layout projections,
user drag overrides, and presentation state must remain strictly isolated from
canonical graph truth. Downstream rendering coordinates must NEVER mutate
upstream graph semantics.

------------------------------------------------------------

FINAL QUESTION

If every existing Orbit, Constellation, and layout implementation were deleted
tomorrow, the semantic contracts that must survive are: (1) Graph truth is
immutable schema data; (2) Global architecture is an orthogonal top-to-bottom DAG
(Y = Layer, X = Derived Domain); (3) Focal dependency is a k-hop BFS radial graph
(r = hop distance); (4) Shared infrastructure is a multi-root centroid topology;
and (5) User drag interactions are view-specific presentation offsets that never
mutate canonical layout positions.
```

---

## 16. Evidence Index

| Finding / Topic | Repository Location | Code / Test Reference |
|---|---|---|
| **Domain Discovery Heuristics** | `explorer/src/lib/layout/domains.ts` | Lines 30–120 (`ARCHITECTURAL_SUFFIXES`, `discoverDomains`) |
| **Selection & Focus State** | `explorer/src/context/InvestigationContext.tsx` | Lines 30–180 (`selectNode`, `setFocus`, `focusState`) |
| **Position Policy Hierarchy** | `explorer/src/lib/position-policy.ts` | Lines 90–130 (`resolveAuthoritativePosition`, `Level 2`) |
| **Hardcoded PBIM Dataset Strings** | `explorer/src/lib/layout/component-constellation-layout.ts` | Lines 233–255 (`MaintenanceRequestController`, `vendor-workspace`) |
| **Bypassed Global Orbit Engine** | `explorer/src/lib/architecture-layout.ts` | Lines 120–135, 183–228 (`safeNodes.length === 0` check) |
| **BFS Graph Depth Engine** | `explorer/src/lib/graph-depth.ts` | Lines 1–90 (`computeGraphDepth`) |
| **Layer Classifier Rules** | `explorer/src/lib/layout/layers.ts` | Lines 1–80 (`classifyNodeLayer`, `isTestNode`) |
| **Workspace Lens Registry** | `explorer/src/registry/workspace-registry.ts` | Lines 1–200 (`LENS_REGISTRY`, `SURFACE_REGISTRY`) |
