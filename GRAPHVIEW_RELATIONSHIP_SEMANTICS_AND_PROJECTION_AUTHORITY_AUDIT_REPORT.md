# GRAPHVIEW — RELATIONSHIP SEMANTICS + PROJECTION AUTHORITY ADVERSARIAL AUDIT
## CANONICAL EDGE TRUTH → LENS-SPECIFIC PROJECTION CONTRACT
### READ ONLY — NO CODE CHANGES — NO PATCHES — NO IMPLEMENTATION

---

## 0. EXECUTIVE ROLE & VERDICT

This adversarial audit evaluates the canonical relationship semantics, traversal mechanics, and projection contracts of GraphView across its three primary analytical lenses:

1. **Lens A — Global Architecture Flow Map:** $Y = \text{Derived Layer} \times X = \text{Derived Subsystem Domain}$.
2. **Lens B — Focal Dependency Neighborhood:** Radial $k$-hop transitive neighborhood around a selected focus node.
3. **Lens C — Shared Infrastructure Topology:** Multi-root shared dependency centroid topology.

### **OVERALL DESIGN GATE: B — CONTRACT READY WITH CONDITIONS**
### **IMPLEMENTATION STATUS: BLOCKED** (until edge filtering, traversal boundaries, and presentation contracts are frozen).

---

## 1. PRIMARY QUESTION ANSWER

> **Does GraphView currently possess a sufficiently precise canonical relationship model to support three different analytical lenses without falsely treating fundamentally different relationships as the same kind of dependency?**

### **ANSWER: NO (IN CURRENT RUNTIME) / YES (WITH EXPLICIT LENS PROJECTIONS)**

**Current Runtime Failure (FACT):**
In `explorer/src/lib/focus-graph.ts`, `computeFocusedGraph()` treats ALL 19 canonical `relationshipType` values (`method-call`, `SOQL`, `field-reference`, `extends`, `test-reference`, `lwc-template-child`, etc.) as **identical 1-hop step dependencies**. In `explorer/src/lib/graph-builder.ts`, `buildGraphElements()` passes every raw edge directly to Cytoscape without type-aware filtering or edge aggregation. Furthermore, `explorer/src/lib/graph-style.ts` contains a typo (`'lwc-apic'` instead of `'lwc-apex'`), causing RPC controller bindings to render with generic unstyled colors.

**Contract Capability (INFERENCE):**
`ExplorerDataSchema` in `explorer/src/types/explorer.ts` ALREADY contains rich, explicit AST-level relationship metadata (`relationshipType`, `canonical.relationship.type`, `resolution`). Therefore, the canonical schema IS SUFFICIENTLY RICH, but GraphView's current layout, traversal, and rendering engines **flatten and corrupt edge semantics** during execution.

---

## 2. AUDIT RULES & VERIFICATION

This audit was performed under strict **READ ONLY** discipline:
- Zero source files, configurations, or tests in `explorer/` were modified.
- All conclusions are derived from direct codebase inspection, type definitions, and algorithm traces.
- The working tree remains 100% clean.

---

## 3. EVIDENCE DISCIPLINE

Every finding in this report is explicitly classified as:
- **FACT:** Demonstrated by file paths, line numbers, and exact code constructs.
- **INFERENCE:** Derived logically from multiple repository facts.
- **DESIGN JUDGMENT:** Architectural or product semantic choice.
- **RECOMMENDATION:** Proposed contract specification.

---

## 4. CANONICAL RELATIONSHIP INVENTORY

*Source Reference: `explorer/src/types/explorer.ts:162-182`*

The repository defines exactly **19 canonical relationship types** in `ExplorerRelationshipType`:

| Relationship Type | Source Definition (`types/explorer.ts`) | Direction | Canonical? | Meaning | Static/Dynamic | Transitive? | Candidate Lens |
|---|---|---|---|---|---|---|---|
| `method-call` | Apex method call | Source $\rightarrow$ Target | **FACT** | Execution call from one Apex class/method to another | Dynamic | **YES** | Lens A, B, C |
| `instantiation` | Object creation (`new`) | Source $\rightarrow$ Target | **FACT** | Class instantiates another class object | Dynamic | **YES** | Lens A, B |
| `type-reference` | Variable/return type | Source $\rightarrow$ Target | **FACT** | Static reference in field/variable declaration | Static | **NO** | Lens B (Overlay) |
| `generic-type` | Generic parameter | Source $\rightarrow$ Target | **FACT** | Type parameter usage (e.g. `List<Account>`) | Static | **NO** | Lens B (Overlay) |
| `extends` | Class inheritance | Child $\rightarrow$ Parent | **FACT** | Object-oriented class extension | Static | **YES** (Class tree) | Lens A, B |
| `implements` | Interface impl | Class $\rightarrow$ Interface | **FACT** | Class implements interface contracts | Static | **NO** | Lens A, B |
| `SOQL` | SOQL query string | Class $\rightarrow$ SObject | **FACT** | Apex executes inline or dynamic SOQL query | Dynamic | **NO** | Lens A, B, C |
| `soql-object` | SOQL target object | Class $\rightarrow$ CustomObject | **FACT** | SObject referenced in query FROM clause | Dynamic | **NO** | Lens A, B, C |
| `soql-field` | SOQL target field | Class $\rightarrow$ CustomField | **FACT** | Field referenced in SELECT / WHERE clause | Static | **NO** | Lens B (Detail) |
| `DML` | Data mutation | Class $\rightarrow$ SObject | **FACT** | Insert, update, delete, upsert mutation | Dynamic | **NO** | Lens A, B, C |
| `aura-enabled` | `@AuraEnabled` method | Aura/LWC $\rightarrow$ Apex | **FACT** | UI component calling server-side Apex method | Dynamic | **YES** | Lens A, B, C |
| `lwc-apex` | `@salesforce/apex` import | LWC $\rightarrow$ ApexController | **FACT** | LWC JS module importing Apex controller method | Dynamic | **YES** | Lens A, B, C |
| `lwc-import` | JS module import | LWC $\rightarrow$ LWC Module | **FACT** | LWC importing utility or module | Static | **YES** | Lens B |
| `lwc-template-child` | HTML template tag | LWC Parent $\rightarrow$ Child | **FACT** | DOM UI component parent-child composition | Static | **NO** (UI DOM) | Lens B (UI tree) |
| `field-reference` | SObject field usage | Component $\rightarrow$ Field | **FACT** | Direct field access in Apex/LWC template | Static | **NO** | Lens B (Detail) |
| `trigger-handler` | Trigger delegation | Trigger $\rightarrow$ Handler | **FACT** | Trigger delegating execution to Apex Handler | Dynamic | **YES** | Lens A, B |
| `trigger-object` / `trigger-on` | Database event | Trigger $\rightarrow$ CustomObject | **FACT** | Trigger listening to SObject database events | Dynamic | **NO** (Event reg) | Lens A, B |
| `visualforce-controller` | VF page binding | VF Page $\rightarrow$ Controller | **FACT** | Visualforce page bound to Apex controller | Dynamic | **YES** | Lens A, B |
| `test-reference` | `@IsTest` annotation | TestClass $\rightarrow$ ProdClass | **FACT** | Test class executing/testing production class | Static | **NO** (Auxiliary) | Secondary Overlay |

---

## 5. RELATIONSHIP SEMANTIC TAXONOMY

The 19 canonical relationship types fall into 8 distinct semantic categories:

```text
1. EXECUTION CALLS      → method-call, instantiation, lwc-apex, aura-enabled, visualforce-controller
2. DATA MUTATION/QUERY  → SOQL, soql-object, DML
3. OOP STRUCTURE        → extends, implements
4. UI DOM COMPOSITION   → lwc-template-child, lwc-import
5. EVENT REGISTRATION   → trigger-handler, trigger-object, trigger-on
6. STATIC TYPE REF      → type-reference, generic-type, field-reference, soql-field
7. QUALITY ASSURANCE    → test-reference
8. UNRESOLVED / OTHER   → unknown
```

---

## 6. THE WORD "DEPENDENCY" AUDIT

Search across `explorer/src/lib/` reveals that **"dependency" is severely overloaded** across 4 different subsystems:

1. **Canonical Schema Meaning (`types/explorer.ts`):** Direct static or dynamic relationship edge $E = (u, v)$.
2. **Graph Traversal Meaning (`focus-graph.ts:123`):** Reachable node set in BFS traversal (`getReachableNodesOut` / `getReachableNodesIn`).
3. **Impact Analysis Meaning (`impact-analysis.ts:45`):** Transitive closure of all connected nodes.
4. **Layout Force Meaning (`ordering.ts:58`):** Weighted edge heuristic (`getRelationshipWeight`) used to pull connected nodes closer in layer ordering.

**Verdict (FACT):** "Dependency" is currently a generic umbrella UI term. The system fails to distinguish dynamic execution dependencies from static schema references during traversal and analysis.

---

## 7. DIRECTIONALITY AUDIT

Direction semantics vary significantly across relationship categories:

| Relationship Type | Source | Target | Arrow Meaning ($A \rightarrow B$) | Reversibility |
|---|---|---|---|---|
| `method-call` | Class A | Class B | A invokes method on B | **Irreversible** (A calls B) |
| `lwc-apex` | LWC | Apex | LWC invokes controller B | **Irreversible** (UI triggers RPC) |
| `lwc-template-child` | Parent LWC | Child LWC | A embeds B in HTML template | **Irreversible** (A contains B) |
| `SOQL` / `DML` | Apex Class | CustomObject | A queries/mutates SObject B | **Irreversible** (Code reads DB) |
| `extends` | Subclass A | Superclass B | A extends class B | **Irreversible** (A inherits B) |
| `trigger-on` | Trigger A | CustomObject B | A listens to database events on B | **Irreversible** (Event subscription) |
| `test-reference` | Test Class A | Prod Class B | Test A executes production code B | **Irreversible** (Test validates B) |

---

## 8. GLOBAL ARCHITECTURE FLOW MAP AUDIT

The Global Architecture Flow Map visualizes macro call-stack execution across architectural layers ($Y$) and subsystem domains ($X$).

| Relationship Type | Global Flow Inclusion | Reason | Visual Encoding |
|---|---|---|---|
| `method-call` | **INCLUDE** | Primary runtime execution flow | Solid Arrow (`#64748b`) |
| `lwc-apex` | **INCLUDE** | UI-to-Backend entry RPC call | Solid Arrow (`#f97316`) |
| `visualforce-controller` | **INCLUDE** | VF-to-Backend entry call | Solid Arrow (`#ec4899`) |
| `trigger-handler` | **INCLUDE** | Trigger execution routing | Solid Arrow (`#8b5cf6`) |
| `SOQL` / `soql-object` / `DML` | **INCLUDE** | Application-to-Schema data access | Dash-Dot Arrow (`#f59e0b`) |
| `extends` / `implements` | **SECONDARY OVERLAY** | Structural OOP hierarchy | Dotted Blue Arrow (`#22c55e`) |
| `lwc-template-child` | **EXCLUDE** | Local UI DOM nesting (UI internal) | Hidden in Global Flow |
| `field-reference` / `soql-field` | **EXCLUDE** | Fine-grained field detail | Hidden in Global Flow |
| `test-reference` | **EXCLUDE** | QA test coverage | Hidden (Available as QA toggle) |

---

## 9. FOCAL DEPENDENCY NEIGHBORHOOD AUDIT

*Source Reference: `explorer/src/lib/focus-graph.ts:100-155`*

### A. Edge Types in BFS
Currently, `focus-graph.ts` performs BFS over `edges` without checking `relationshipType`. As a result, a 2-hop BFS from an LWC includes:
$$\text{LWC} \xrightarrow{\text{lwc-template-child}} \text{Child LWC} \xrightarrow{\text{field-reference}} \text{CustomField}$$
This mixes UI template composition with database column references in a single "dependency radius"!

### B. Traversal Direction
- `direction === 'dependencies'`: Traverses outgoing edges ($u \rightarrow v$).
- `direction === 'dependents'`: Traverses incoming edges ($v \rightarrow u$).
- `direction === 'both'`: Traverses both directions.

### C. Heterogeneous Path Danger (Adversarial Counterexample)
A path containing:
$$\text{LWC} \xrightarrow{\text{lwc-apex}} \text{Controller} \xrightarrow{\text{SOQL}} \text{CustomObject} \xleftarrow{\text{trigger-on}} \text{ApexTrigger}$$
mixes RPC calls, database queries, and event subscriptions. Labeling the Trigger as "$r=3$ hops from LWC" is semantically misleading because the Trigger does NOT execute when the LWC calls the Controller!

### D. Transitivity
Execution calls (`method-call`, `lwc-apex`) are transitive. Type references (`type-reference`) and schema field references (`field-reference`) are **NON-TRANSITIVE**.

---

## 10. RELATIONSHIP WEIGHT / HOP SEMANTICS

*Source Reference: `explorer/src/lib/layout/ordering.ts:58-82`*

Currently, `ordering.ts` assigns hardcoded weights to relationship types for layer sorting:
- Weight 3.0: `method-call`, `instantiation`, `soql-object`, `trigger-handler`, `lwc-apex`, `extends`, `implements`, `SOQL`, `DML`.
- Weight 1.5: `type-reference`, `soql-field`, `lwc-import`, `lwc-template-child`.
- Weight 1.0: `field-reference`, `test-reference`, `unknown`.

**Contract Requirement:** In Focal BFS traversal, non-execution edges (field references, test references) MUST NOT count as standard 1-hop execution steps.

---

## 11. SHARED INFRASTRUCTURE TOPOLOGY AUDIT

Shared Infrastructure identifies nodes connected to multiple entry points.

**Semantic Failure in Current Model (FACT):**
If two LWCs reference the same `CustomObject` via `SOQL`, it is **Shared Database Schema**.
If two LWCs call the same `ApexClass` via `lwc-apex`, it is **Shared Controller/Service Infrastructure**.
If two test classes reference the same `ApexClass` via `test-reference`, it is **Shared Test Target**.

Current layout engines conflate all three into a single generic "Shared Node" bucket!

---

## 12. ENTRY-POINT ROOT AUDIT

*Source Reference: `explorer/src/lib/adapters/component-constellation-adapter.ts:45-80`*

Root discovery in `component-constellation-adapter.ts` identifies LWCs with `inDegree === 0`.

**Adversarial Challenge:**
- A Batch Apex class (`Database.Batchable`) or Queueable job has `inDegree === 0` in static AST because it is invoked asynchronously by Salesforce runtime framework.
- An Apex REST class (`@RestResource`) has `inDegree === 0` from internal Apex, but is an external API entry point.
- **Contract:** Root entry points MUST be identified by explicit entry-point type badges (`LWC`, `ApexTrigger`, `Flow`, `@RestResource`, `Batchable`), NOT purely by `inDegree === 0`.

---

## 13. EDGE AGGREGATION AUDIT

*Source Reference: `explorer/src/lib/graph-builder.ts:115-148`*

If Node A and Node B have both a `method-call` and a `SOQL` edge between them:
- `buildGraphElements()` creates **2 separate Cytoscape edge definitions**.
- Cytoscape renders 2 overlapping or parallel lines between Node A and Node B.
- **Contract:** Edge aggregation MUST collapse parallel edges into a single composite visual edge during macro rendering, while preserving individual relationship details in inspector panels.

---

## 14. EDGE PRECEDENCE

When aggregating parallel edges between Node A and Node B, the primary edge visual style MUST follow explicit precedence:
$$\text{Execution Call (`method-call` / `lwc-apex`)} > \text{Data Mutation (`DML` / `SOQL`)} > \text{OOP (`extends`)} > \text{Static Ref (`field-reference`)}$$

---

## 15. EDGE RENDERING SEMANTICS

*Source Reference: `explorer/src/lib/graph-style.ts:316-510`*

1. **Typo Defect (FACT):** Line 20 of `graph-style.ts` defines `'lwc-apic'` instead of `'lwc-apex'`. As a result, LWC-to-Apex controller edges fall back to generic unstyled grey arrows.
2. **Visual Encoding Rules:**
   - Runtime Calls: Solid line, arrow target.
   - Schema Access: Dash-dot line, amber color.
   - OOP Inheritance: Solid green line, hollow triangle arrow (`extends`).
   - Test References: Muted dotted green line.

---

## 16. PRESENTATION FILTER VS ANALYTICAL FILTER

GraphView MUST strictly separate two filtering levels:

```text
CANONICAL GRAPH G = (V, E)
        ↓
[ANALYTICAL FILTER]  → Alters graph projection (e.g. "Recompute BFS using ONLY method-call edges")
        ↓
Projection Graph G' = (V', E')
        ↓
[PRESENTATION FILTER] → Alters visual styling/visibility (e.g. "Hide test edges from canvas view")
        ↓
Cytoscape Canvas Rendering
```

---

## 17. CYCLES VS DAG PROJECTION

**Canonical Truth:** The enterprise Salesforce dependency graph $G = (V,E)$ is CYCLIC.
**Layout Projection:** The Global Architecture Flow Map applies layer ranking to position nodes in a top-to-bottom DAG spatial layout.

**Rule:** Cycle-breaking algorithms during DAG layout MUST ONLY alter Cartesian coordinates $(x, y)$. They MUST NOT delete or reverse edges in the canonical graph model $G$.

---

## 18. CROSS-LAYER EDGE AUDIT

In Salesforce codebases, cross-layer edges (e.g. `LWC -> CustomField`) are standard framework static imports (`@salesforce/schema/Account.Name`).
They are **valid framework static dependencies**, NOT architectural layer boundary violations.

---

## 19. TEST / MOCK / UTILITY EDGE AUDIT

`test-reference` edges link `@IsTest` classes to production targets.
- **Global Flow Map:** MUST be excluded from primary call-stack layout.
- **Focal BFS Lens:** MUST be toggleable via QA Overlay.
- **Shared Infrastructure:** MUST NOT count test references toward runtime shared infrastructure scores.

---

## 20. PROJECTION CONTRACT

```text
Canonical Graph Truth G = (V, E)
        ↓
Relationship Semantics Classifier (19 Types → 8 Categories)
        ↓
Lens-Specific Analytical Projection (Lens A / Lens B / Lens C)
        ↓
Layout Geometry Engine (Layered Flow / Radial BFS / Centroid)
        ↓
Presentation Overrides (User Drag / Visibility Toggles)
        ↓
Rendering (Cytoscape Canvas)
```

**Non-Negotiable Rule:** Geometry engines MUST NOT mutate or redefine relationship types or directionality.

---

## 21. LENS × RELATIONSHIP MATRIX

| Relationship Type | Canonical | Lens A (Global Flow) | Lens B (Focal BFS) | Lens C (Shared Infra) | Render Style |
|---|---|---|---|---|---|
| `method-call` | **YES** | **INCLUDE** | **INCLUDE** (1 hop) | **INCLUDE** | Solid Grey Arrow |
| `lwc-apex` | **YES** | **INCLUDE** | **INCLUDE** (1 hop) | **INCLUDE** | Solid Orange Arrow |
| `visualforce-controller` | **YES** | **INCLUDE** | **INCLUDE** (1 hop) | **INCLUDE** | Solid Pink Arrow |
| `SOQL` / `soql-object` | **YES** | **INCLUDE** | **INCLUDE** (1 hop) | **INCLUDE** (Schema) | Dash-Dot Amber Arrow |
| `DML` | **YES** | **INCLUDE** | **INCLUDE** (1 hop) | **INCLUDE** (Schema) | Solid Red Arrow |
| `extends` / `implements` | **YES** | **SECONDARY** | **INCLUDE** (1 hop) | **INCLUDE** (OOP) | Solid Green Arrow |
| `lwc-template-child` | **YES** | **EXCLUDE** | **INCLUDE** (UI Tree) | **EXCLUDE** | Muted Orange Arrow |
| `field-reference` | **YES** | **EXCLUDE** | **OPTIONAL** | **EXCLUDE** | Muted Green Line |
| `test-reference` | **YES** | **EXCLUDE** | **OPTIONAL** (QA) | **EXCLUDE** | Muted Dotted Line |

---

## 22. RELATIONSHIP SEMANTIC HIERARCHY

```text
ExplorerRelationshipType (19 AST String Tokens)
        ↓
Relationship Category (Execution, Data, OOP, DOM, Event, Test)
        ↓
Lens Eligibility Mask (Global Flow / Focal BFS / Shared Infra)
        ↓
Traversal Weight & Transitivity Policy
        ↓
Cytoscape Visual Style & Precedence
```

---

## 23. ADVERSARIAL COUNTEREXAMPLES

1. **Two components share a CustomObject via SOQL:**
   *Answer:* They share **Database Schema**, NOT runtime application logic. Lens C must badge this as "Shared Schema Infrastructure".
2. **Two classes inherit from the same BaseController:**
   *Answer:* They share **OOP Class Structure**, NOT runtime execution coupling.
3. **A test class references 10 production services:**
   *Answer:* It is a **Test Data Factory / Integration Test**, NOT a runtime shared service. Excluded from runtime shared infrastructure.
4. **An LWC imports `@salesforce/schema/Account.Name`:**
   *Answer:* Static schema field binding. Must not be treated as a 1-hop execution call.
5. **A Platform Event publisher connects two decoupled domains:**
   *Answer:* Event-driven publisher-subscriber binding. Replaced by dashed event stream edge.
6. **Node A calls Node B via Apex AND queries Node B's custom object:**
   *Answer:* Multi-edge pair. Aggregated into a single visual edge with precedence `method-call` > `SOQL`.
7. **A cyclic reference exists between Service A and Service B:**
   *Answer:* Canonical graph retains cyclic edges. DAG layout positions them vertically without deleting edges.
8. **An Apex REST resource has `inDegree === 0`:**
   *Answer:* It is an **External API Entry Point**, correctly identified as a root node.
9. **A CustomObject is queried by 20 Controllers:**
   *Answer:* Core Database Entity. Centroid layout positions it as a central database hub in Lens C.
10. **A traversal path crosses `LWC -> Controller -> SOQL -> Object`:**
    *Answer:* Valid heterogeneous execution-to-data path. Path inspector must display edge category transitions.

---

## 24. FUNDAMENTAL PRINCIPLE TESTS

- **Principle A (Semantic Identity):** **PASS**. AST relationship type remains canonical until lens projection applies.
- **Principle B (No Generic "Dependency" Umbrella):** **PASS WITH CONDITIONS**. Traversal engines must stop treating all edges as uniform 1-hop steps.
- **Principle C (No Meaning Rewriting):** **PASS**. Projections filter edges without changing canonical `relationshipType`.
- **Principle D (Coherent BFS Traversal):** **PASS WITH CONDITIONS**. Focal BFS must allow filtering by relationship category.
- **Principle E (Explicit Shared Infrastructure Rules):** **PASS**. Shared Infrastructure must distinguish Shared Runtime, Shared Schema, and Shared OOP.
- **Principle F (Style Is Not Authority):** **PASS**. Cytoscape styles reflect underlying canonical metadata.
- **Principle G (DAG Layout vs Cyclic Truth):** **PASS**. Spatial coordinates do not alter canonical graph adjacency.

---

## 25. REQUIRED FINAL CONTRACT

1. **Canonical Authority:** `ExplorerDataSchema.edges[i].relationshipType` is the sole canonical relationship truth.
2. **Typo Fix Required:** Correct `'lwc-apic'` to `'lwc-apex'` in `graph-style.ts:20`.
3. **Traversal Policy:** `computeFocusedGraph()` in `focus-graph.ts` must accept an optional `allowedCategories` mask.
4. **Shared Infrastructure Policy:** Lens C must separate Shared Controllers/Services, Shared SObjects, and Shared OOP Base Classes.
5. **Edge Aggregation:** Parallel edges between node pairs must be aggregated into composite visual edges during macro rendering.

---

## 26. IMPLEMENTATION BLOCKERS

### **BLOCKERS:**
1. Typo in `graph-style.ts` (`'lwc-apic'`) breaking LWC-to-Apex edge styling.
2. Unfiltered BFS traversal in `focus-graph.ts` mixing UI template, test, and execution edges.
3. Conflation of database schema sharing with runtime controller sharing in Shared Infrastructure.

### **HIGH RISK:**
1. Missing edge aggregation causing Cytoscape visual clutter on dense multi-edge node pairs.

---

## 27. FINAL DESIGN GATE

```text
============================================================
FINAL DESIGN GATE:
B — CONTRACT READY WITH CONDITIONS

IMPLEMENTATION STATUS:
BLOCKED
============================================================
```

---

## 28. REQUIRED EXECUTIVE CONCLUSION

### FINAL VERDICT
The canonical relationship schema in `types/explorer.ts` is rich, accurate, and ready. However, GraphView's runtime traversal engine (`focus-graph.ts`) and visual renderer (`graph-style.ts`) currently flatten and corrupt edge semantics during execution. Implementation is **BLOCKED** until edge-filtering masks and projection contracts are frozen.

### CANONICAL RELATIONSHIP TRUTH
The 19 canonical `relationshipType` values in `types/explorer.ts` represent exact AST static analysis facts.

### RELATIONSHIP TYPES THAT MUST NOT BE FLATTENED
`method-call`, `lwc-apex`, `SOQL`, `lwc-template-child`, and `test-reference` MUST NOT be flattened into generic dependency arrows.

### TOP 10 SEMANTIC RISKS
1. `focus-graph.ts` traversing test and UI template edges in standard dependency BFS.
2. Typo `'lwc-apic'` causing RPC controller edges to lose visual styling.
3. Conflating database schema sharing with application controller sharing in Lens C.
4. Unaggregated parallel edges causing Cytoscape visual clutter.
5. Inaccurate root discovery relying purely on `inDegree === 0`.
6. Mixing non-transitive static type references into multi-hop execution paths.
7. Overloading the term "dependency" across layout, traversal, and impact analysis.
8. Treating cross-layer static schema imports as architectural boundary violations.
9. Silently deleting or reversing cyclic edges during DAG layout execution.
10. Allowing presentation visibility filters to accidentally mutate analytical graph models.

---

## 29. ABSOLUTE FINAL RULE

```text
CANONICAL GRAPH TRUTH
        ≠
LENS-SPECIFIC ANALYTICAL PROJECTION
        ≠
LAYOUT GEOMETRY
        ≠
RENDERING STYLE
        ≠
INTERACTION STATE
```

NO CODE WAS CHANGED.
NO IMPLEMENTATION WAS PERFORMED.
THIS REPORT IS THE CANONICAL EDGE & PROJECTION AUDIT GATE.
