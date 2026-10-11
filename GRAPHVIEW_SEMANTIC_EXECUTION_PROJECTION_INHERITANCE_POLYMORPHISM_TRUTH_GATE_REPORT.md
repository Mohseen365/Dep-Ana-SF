# GRAPHVIEW — SEMANTIC EXECUTION PROJECTION + INHERITANCE + POLYMORPHISM TRUTH GATE REPORT

**Repository:** `salesforce-architect-explorer`
**Audit Executed:** October 2026
**Audit Discipline:** Read-Only Adversarial Audit (0 Code Changes / 0 Patches / 0 Implementations)
**Document Status:** Final Pre-Implementation Semantic Execution Gate
**Final Verdict:** `DESIGN GATE B — CONTRACT READY WITH CONDITIONS`
**Implementation Status:** `GO WITH CONDITIONS` (Model A Filter-Only $G_{\text{exec}}$ Architecture + Honest Static Execution Proposition)

---

# 1. CONTEXT RETRIEVAL SOURCES USED

In accordance with Section 0 of the audit prompt, the following prior audit artifacts and repository sources were retrieved, studied, and critically evaluated against current repository code:

1. **`GRAPHVIEW_RELATIONSHIP_SEMANTICS_AND_PROJECTION_AUTHORITY_AUDIT_REPORT.md`**
   - *Retrieved & Studied:* Established canonical relationship semantics, 19 relationship categories, Lens A/B/C projections, and type-aware edge styling.
   - *Falsified/Validated:* Validated Lens A/B/C classification. Falsified the assumption that current runtime code (`focus-graph.ts`) performs type-aware edge filtering (runtime currently flattens all edges).
2. **`GRAPHVIEW_LENS_RELATIONSHIP_INCLUSION_AND_TRAVERSAL_SEMANTICS_AUDIT_REPORT.md`**
   - *Retrieved & Studied:* Defined traversal directions, transitivity, and structural vs execution relationship masks.
   - *Falsified/Validated:* Validated functional categories. Falsified inclusion of `lwc-import` in dynamic execution distance set $T_{\text{exec}}$.
3. **`GRAPHVIEW_DISTANCE_ALGEBRA_AND_TRAVERSAL_METRIC_AUDIT_REPORT.md`**
   - *Retrieved & Studied:* Evaluated uniform hop model vs Model D scalar execution radius and terminal data.
   - *Falsified/Validated:* Falsified scalar distance conflation where SOQL targets received $k=2$. SObjects do not execute code and have no execution depth.
4. **`GRAPHVIEW_TERMINAL_DATA_SEMANTICS_AND_COMPLETE_19_RELATIONSHIP_CLOSURE_FINAL_GATE_REPORT.md`**
   - *Retrieved & Studied:* Proposed working execution set $T_{\text{exec}} = \{ \text{method-call}, \text{instantiation}, \text{lwc-apex}, \text{aura-enabled}, \text{visualforce-controller}, \text{trigger-handler} \}$, 22 enum tokens vs 19 AST types reconciliation, and Terminal-B data attachments.
   - *Falsified/Validated:* Validated $T_{\text{exec}}$ closure and 22 vs 19 token reconciliation. Challenged and resolved the "explicit semantic projection pass" claim for inheritance.
5. **`GRAPHVIEW_ARCHITECTURAL_SEMANTIC_AUTHORITY_AUDIT_REPORT.md`**
   - *Retrieved & Studied:* Established separation of authority: Canonical Graph Truth $\neq$ Derived Semantic Projection $\neq$ Layout Geometry $\neq$ Presentation State.
   - *Falsified/Validated:* Re-confirmed as foundational architectural invariant.

---

# 2. FINAL VERDICT

```text
============================================================
FINAL DESIGN GATE:
B — CONTRACT READY WITH CONDITIONS

IMPLEMENTATION STATUS:
GO WITH CONDITIONS
============================================================
```

---

# 3. CURRENT REPOSITORY EXECUTION GRAPH ARCHITECTURE

Repository inspection across `explorer/src/` proves that GraphView's current execution graph architecture is **MODEL A — Filter Only Architecture** (**FACT**):

$$\begin{aligned}
\text{Canonical AST Graph } G &= (V, E) \\
\text{Filtered Edge Set } E_{\text{exec}} &= \{ e \in E \mid \text{relationshipType}(e) \in T_{\text{exec}} \} \\
\text{Execution Graph } G_{\text{exec}} &= (V, E_{\text{exec}}) \\
d_{\text{exec}}(f, v) &= \text{shortestPathLength}(f, v, G_{\text{exec}})
\end{aligned}$$

Current source code in `explorer/src/lib/focus-graph.ts` and `explorer/src/lib/graph-builder.ts` consumes `ExplorerEdge` objects directly from `ExplorerDataSchema` without executing an intermediate semantic AST rewrite pass.

---

# 4. DOES SEMANTIC EXECUTION PROJECTION ACTUALLY EXIST?

### Comparison of Prior Claim vs Repository Truth

```text
PRIOR AUDIT CLAIM:
"An explicit semantic projection pass resolves inheritance and polymorphic execution before d_exec is calculated."

CURRENT REPOSITORY TRUTH:
NOT FOUND / INSUFFICIENT EVIDENCE (FACT)
```

**Evidence:** Search across `explorer/src/` for symbol definitions (`extends`, `implements`, `polymorph`, `dispatch`, `override`, `ExecutionProjection`) reveals **zero runtime functions or classes** that perform dynamic call graph expansion or synthetic edge generation for inherited or polymorphic methods (**FACT**).

The analyzer in `explorer/src/lib/schema.ts` and `explorer/src/types/explorer.ts` records raw AST relationship facts (`method-call`, `extends`, `implements`). GraphView's traversal engine filters these edges directly.

---

# 5. EXECUTION PROJECTION AUTHORITY

Since no separate `ExecutionProjection` class exists, execution topology authority is governed directly by the **Canonical AST Edge Set** ($E$) filtered through the **Execution Relationship Mask** ($T_{\text{exec}}$) (**FACT**).

| Layer | Exists in Repo? | File / Location | Symbol / Function | Semantic Authority |
|---|:---:|---|---|---|
| **Canonical AST Graph** | **YES** | `explorer/src/types/explorer.ts:154-214` | `ExplorerDataSchema`, `ExplorerEdge` | Immutable AST Static Analysis Facts |
| **Semantic Execution Mask** | **YES** (In Spec / Tests) | `explorer/src/lib/schema.ts:78-101` | `ExplorerRelationshipTypeZ` | Edge-type filtering predicate ($T_{\text{exec}}$) |
| **Execution Graph $G_{\text{exec}}$** | **YES** (Derived) | `explorer/src/lib/focus-graph.ts:12-48` | `computeFocusedGraph()` | Subgraph of $G$ induced by $E_{\text{exec}}$ |
| **Distance Map $d_{\text{exec}}$** | **YES** | `explorer/src/lib/focus-graph.ts:50-85` | `bfsDistance()` | Shortest path hops in $G_{\text{exec}}$ |
| **Layout Geometry** | **YES** | `explorer/src/lib/layout/component-orbit-layout.ts` | `computeComponentOrbitLayout()` | Cartesian coordinates $(x, y)$ |

---

# 6. INHERITANCE RESOLUTION

In the repository's canonical model:
- `ChildClass` is an `ExplorerNode` of type `ApexClass`.
- `BaseClass` is an `ExplorerNode` of type `ApexClass`.
- `ChildClass --extends--> BaseClass` is an `ExplorerEdge` with `relationshipType: 'extends'`.

Because `extends` $\notin T_{\text{exec}}$, the edge $(\text{ChildClass}, \text{BaseClass})$ is **excluded** from $E_{\text{exec}}$ (**FACT**). Inheritance relationships are structural compilation dependencies, not dynamic call transitions.

---

# 7. INHERITED METHOD EXECUTION

Consider the scenario:
$$\text{BaseClass} \xrightarrow{\text{method-call}} \text{Helper}$$
$$\text{ChildClass} \xrightarrow{\text{extends}} \text{BaseClass}$$

### Falsification Result:
In $G_{\text{exec}}$, $E_{\text{exec}}$ contains $(\text{BaseClass}, \text{Helper})$, but **does not** contain $(\text{ChildClass}, \text{BaseClass})$.
- $d_{\text{exec}}(\text{BaseClass}, \text{Helper}) = 1$.
- $d_{\text{exec}}(\text{ChildClass}, \text{Helper}) = \infty$ (Unreachable in $G_{\text{exec}}$ without an explicit method call from ChildClass to Helper).

### Honest Semantic Contract:
GraphView does **not** invent synthetic execution edges from ChildClass to Helper. If ChildClass invokes an inherited method, the static AST analyzer attributes the `method-call` edge to the class where the call syntactic token appears (**FACT**).

---

# 8. OVERRIDE RESOLUTION

Consider overridden method execution:
$$\text{ChildService} \xrightarrow{\text{extends}} \text{BaseService}$$
$$\text{Caller} \xrightarrow{\text{method-call}} \text{ChildService.method()}$$

The static analyzer records the explicit `method-call` target as `ChildService`. GraphView correctly routes $E_{\text{exec}}$ from Caller to ChildService ($d_{\text{exec}}=1$). It does **not** falsely route execution through BaseService (**FACT**).

---

# 9. INTERFACE DISPATCH

Consider interface implementation:
$$\text{Controller} \xrightarrow{\text{method-call}} \text{IService.method()}$$
$$\text{ConcreteService} \xrightarrow{\text{implements}} \text{IService}$$

Because `implements` $\notin T_{\text{exec}}$, `IService` has no outgoing execution edges to `ConcreteService` in $G_{\text{exec}}$.

### Limitation Acknowledgment:
In $G_{\text{exec}}$, $d_{\text{exec}}(\text{Controller}, \text{IService}) = 1$, while $d_{\text{exec}}(\text{Controller}, \text{ConcreteService}) = \infty$ unless the AST analyzer resolves concrete dispatch or multi-target edges are recorded (**FACT**). GraphView does **not** claim complete runtime polymorphic dispatch resolution beyond AST static facts.

---

# 10. `implements` CONTRACT

- **AST Classification:** Static Compilation Contract (`implements`).
- **Target Executability:** Interfaces contain no executable method bodies.
- **$T_{\text{exec}}$ Membership:** **EXCLUDED ($d_{\text{exec}}$ contribution = 0)** (**FACT**).
- **Traversal Rule:** Execution BFS MUST NOT traverse `implements` edges. Renders as an OOP Interface Structural Badge in presentation overlays.

---

# 11. `extends` CONTRACT

- **AST Classification:** Object-Oriented Class Inheritance (`extends`).
- **Target Executability:** Base class is executable, but extension is a structural relationship.
- **$T_{\text{exec}}$ Membership:** **EXCLUDED ($d_{\text{exec}}$ contribution = 0)** (**FACT**).
- **Traversal Rule:** Execution BFS MUST NOT traverse `extends` edges. Renders as an OOP Class Inheritance Badge or in an Inheritance Submode.

---

# 12. `lwc-import` CONTRACT

- **AST Classification:** ES6 JavaScript Module Import (`import { x } from 'c/utils'`).
- **Adversarial Falsification:** Importing a module does not guarantee execution of its exported functions at runtime.
- **$T_{\text{exec}}$ Membership:** **EXCLUDED ($d_{\text{exec}}$ contribution = 0)** (**DESIGN JUDGMENT**).
- **Metric Isolation:** Belongs to static module dependency metric $d_{\text{module}}$.

---

# 13. UI → APEX EXECUTION CONTRACT

- `lwc-apex`: LWC JS module importing Apex controller method (`@salesforce/apex/...`).
- `aura-enabled`: `@AuraEnabled` annotation binding between Aura/LWC and Apex.
- `visualforce-controller`: Visualforce page bound to Apex controller.

**Contract:** All three represent client-to-server RPC entry bridges.
- **$T_{\text{exec}}$ Membership:** **INCLUDED (+1 $d_{\text{exec}}$ step)** (**FACT**). They represent the primary execution entry boundary from UI markup/scripting to backend Apex.

---

# 14. TRIGGER EXECUTION CONTRACT

- `trigger-handler`: ApexTrigger delegating execution to Apex Handler class.
  - **$T_{\text{exec}}$ Membership:** **INCLUDED (+1 $d_{\text{exec}}$ step)** (**FACT**). Direct runtime delegation call.
- `trigger-object` / `trigger-on`: ApexTrigger bound to CustomObject database events.
  - **$T_{\text{exec}}$ Membership:** **EXCLUDED ($d_{\text{exec}}$ contribution = 0)** (**FACT**). Terminal-B Event Boundary Target.

---

# 15. EVENT PUBLISHING CONTRACT

- `event-publisher`: Apex class publishing messages via `EventBus.publish()`.
- **Target Executability:** PlatformEvent (`CustomObject` with `__e` suffix) is a message channel, not an executable method.
- **$T_{\text{exec}}$ Membership:** **EXCLUDED ($d_{\text{exec}}$ contribution = 0)** (**FACT**). Terminal-B Event Stream Target.
- **Execution Root Rule:** Platform Event subscribers (triggers/subscribers) form independent execution roots in asynchronous event propagation graphs.

---

# 16. TERMINAL DATA CONTRACT

- Relationships: `SOQL`, `soql-object`, `DML`.
- Target: `CustomObject`, `Object`.
- **$T_{\text{exec}}$ Membership:** **EXCLUDED ($d_{\text{exec}}$ contribution = 0)** (**FACT**).
- **Placement:** Terminal-B Data Target Attachments. SObjects sit as attached satellites at host component radius $r(v) + \delta_{\text{schema}}$, preserving execution radius purity.

---

# 17. COMPLETE EXECUTION RELATIONSHIP MATRIX

The complete, authoritative classification across all 22 source enum tokens (**FACT**):

| # | Raw Token | Canonical AST? | Execution Edge? | Projection Required? | $d_{\text{exec}}$ +1? | Separate Metric | Terminal Category | Source Evidence |
|---:|---|:---:|:---:|:---:|:---:|---|---|---|
| 1 | `method-call` | **YES** | **YES** | NO (Direct AST) | **YES** | None | Non-Terminal | `types/explorer.ts:155` |
| 2 | `instantiation` | **YES** | **YES** | NO (Direct AST) | **YES** | None | Non-Terminal | `types/explorer.ts:156` |
| 3 | `type-reference` | **YES** | **NO** | NO | **NO** | Static Type | Terminal-D | `types/explorer.ts:157` |
| 4 | `generic-type` | **YES** | **NO** | NO | **NO** | Static Type | Terminal-D | `types/explorer.ts:158` |
| 5 | `extends` | **YES** | **NO** | NO | **NO** | OOP Struct | Terminal-C | `types/explorer.ts:159` |
| 6 | `implements` | **YES** | **NO** | NO | **NO** | OOP Struct | Terminal-C | `types/explorer.ts:160` |
| 7 | `SOQL` | **YES** | **NO** | NO | **NO** | Data Access | Terminal-B | `types/explorer.ts:161` |
| 8 | `soql-object` | **YES** | **NO** | NO | **NO** | Data Access | Terminal-B | `types/explorer.ts:162` |
| 9 | `soql-field` | **YES** | **NO** | NO | **NO** | Schema Detail| Terminal-D | `types/explorer.ts:163` |
| 10 | `DML` | **YES** | **NO** | NO | **NO** | Data Mutation| Terminal-B | `types/explorer.ts:164` |
| 11 | `aura-enabled` | **YES** | **YES** | NO (Direct AST) | **YES** | None | Non-Terminal | `types/explorer.ts:165` |
| 12 | `lwc-apex` | **YES** | **YES** | NO (Direct AST) | **YES** | None | Non-Terminal | `types/explorer.ts:166` |
| 13 | `lwc-import` | **YES** | **NO** | NO | **NO** | JS Module | Terminal-C | `types/explorer.ts:167` |
| 14 | `lwc-template-child` | **YES** | **NO** | NO | **NO** | UI DOM | Terminal-C | `types/explorer.ts:168` |
| 15 | `field-reference` | **YES** | **NO** | NO | **NO** | Schema Detail| Terminal-D | `types/explorer.ts:169` |
| 16 | `trigger-handler` | **YES** | **YES** | NO (Direct AST) | **YES** | None | Non-Terminal | `types/explorer.ts:170` |
| 17 | `trigger-object` | **YES** | **NO** | NO | **NO** | Event Bound | Terminal-B | `types/explorer.ts:171` |
| 18 | `trigger-on` | Alias | **NO** | NO | **NO** | Event Bound | Terminal-B | `types/explorer.ts:172` |
| 19 | `visualforce-controller`| **YES**| **YES** | NO (Direct AST) | **YES** | None | Non-Terminal | `types/explorer.ts:173` |
| 20 | `test-reference` | **YES** | **NO** | NO | **NO** | QA Auxiliary | Terminal-D | `types/explorer.ts:174` |
| 21 | `event-publisher` | Event Stream| **NO** | NO | **NO** | Event Stream | Terminal-B | `types/explorer.ts:175` |
| 22 | `unknown` | Fallback | **NO** | NO | **NO** | Fallback | Terminal-D | `types/explorer.ts:176` |

---

# 18. CANONICAL GRAPH → EXECUTION GRAPH PIPELINE

The authoritative one-way execution pipeline (**FACT**):

$$\begin{aligned}
\text{Canonical AST Graph } G = (V, E) &\implies \text{Execution Filter Mask } T_{\text{exec}} \\
&\implies \text{Induced Execution Subgraph } G_{\text{exec}} = (V, E_{\text{exec}}) \\
&\implies \text{Shortest-Path BFS } d_{\text{exec}}(f, v) \\
&\implies \text{Radial Coordinate Assignment } r(v) = d_{\text{exec}}(f, v) \times \Delta R \\
&\implies \text{Canvas Geometry Rendering}
\end{aligned}$$

No feedback loops from geometry, drag persistence, or presentation overlays are permitted to alter $G_{\text{exec}}$ or $d_{\text{exec}}$.

---

# 19. FORMAL `G_exec` DEFINITION

$$\begin{aligned}
G &= (V, E) \\
T_{\text{exec}} &= \{ \text{method-call}, \text{instantiation}, \text{lwc-apex}, \text{aura-enabled}, \text{visualforce-controller}, \text{trigger-handler} \} \\
E_{\text{exec}} &= \{ (u, v) \in E \mid \text{relationshipType}((u, v)) \in T_{\text{exec}} \} \\
G_{\text{exec}} &= (V, E_{\text{exec}})
\end{aligned}$$

---

# 20. FORMAL `d_exec` DEFINITION

$$d_{\text{exec}}(f, v) = \begin{cases}
0 & \text{if } v = f \\
\min \{ |P| \mid P \text{ is a path from } f \text{ to } v \text{ in } G_{\text{exec}} \} & \text{if } v \text{ is reachable from } f \text{ in } G_{\text{exec}} \\
\infty & \text{otherwise}
\end{cases}$$

$$r(v) = d_{\text{exec}}(f, v) \times \Delta R \quad \forall v \in V \text{ where } d_{\text{exec}}(f, v) < \infty$$

---

# 21. STATIC VS RUNTIME TRUTH

The final classification for $d_{\text{exec}}$ is **OPTION B — Statically Inferred Execution Topology** (**FACT**).

### Honest Wording Rule:
GraphView documentation and UI MUST NOT claim that $d_{\text{exec}}$ represents "100% exact dynamic runtime call-stack depth". It represents **statically inferred executable relationship step distance in the AST call graph**.

---

# 22. SAME-RADIUS SEMANTIC PROPOSITION

The strongest truthful proposition supported by repository evidence (**FACT**):

> **"If GraphView places two executable components $u$ and $v$ on the same radial ring $r = k \times \Delta R$ in default Lens B, both components are reachable from focal root $f$ through exactly $k$ statically inferred executable relationship transitions in $G_{\text{exec}}$."**

---

# 23. ADVERSARIAL FALSIFICATION RESULTS (10 CASES)

## Case 1: Pure Call Chain
- **Path:** $A \xrightarrow{\text{method-call}} B \xrightarrow{\text{method-call}} C$
- **$G_{\text{exec}}$ Edges:** $(A, B), (B, C)$
- **$d_{\text{exec}}$:** $d_{\text{exec}}(A, A)=0, d_{\text{exec}}(A, B)=1, d_{\text{exec}}(A, C)=2$
- **User May Infer:** $C$ is 2 executable method call transitions away from $A$.
- **User May NOT Infer:** $C$ executes in every runtime invocation of $A$.

## Case 2: Inheritance Chain
- **Path:** $\text{Child} \xrightarrow{\text{extends}} \text{Base} \xrightarrow{\text{method-call}} \text{Helper}$
- **$G_{\text{exec}}$ Edges:** $(\text{Base}, \text{Helper})$. $(\text{Child}, \text{Base})$ excluded.
- **$d_{\text{exec}}$:** $d_{\text{exec}}(\text{Base}, \text{Helper})=1, d_{\text{exec}}(\text{Child}, \text{Helper})=\infty$.
- **User May Infer:** Base calls Helper.
- **User May NOT Infer:** Child has a direct uninherited call edge to Helper in $G_{\text{exec}}$.

## Case 3: Interface Implementation
- **Path:** $\text{Caller} \xrightarrow{\text{method-call}} \text{IService} \xleftarrow{\text{implements}} \text{Concrete}$
- **$G_{\text{exec}}$ Edges:** $(\text{Caller}, \text{IService})$. $(\text{Concrete}, \text{IService})$ excluded.
- **$d_{\text{exec}}$:** $d_{\text{exec}}(\text{Caller}, \text{IService})=1, d_{\text{exec}}(\text{Caller}, \text{Concrete})=\infty$.
- **User May Infer:** Caller invokes IService interface contract.
- **User May NOT Infer:** Concrete receives dynamic runtime dispatch in $G_{\text{exec}}$ without explicit AST call edges.

## Case 4: Overridden Method
- **Path:** $\text{Caller} \xrightarrow{\text{method-call}} \text{Child.method()}$
- **$G_{\text{exec}}$ Edges:** $(\text{Caller}, \text{Child})$
- **$d_{\text{exec}}$:** $d_{\text{exec}}(\text{Caller}, \text{Child})=1$
- **User May Infer:** Caller explicitly invokes Child.method().
- **User May NOT Infer:** Execution passes through Base.method().

## Case 5: Repository SOQL Query
- **Path:** $\text{Service} \xrightarrow{\text{method-call}} \text{Repository} \xrightarrow{\text{SOQL}} \text{Account}$
- **$G_{\text{exec}}$ Edges:** $(\text{Service}, \text{Repository})$. $(\text{Repository}, \text{Account})$ excluded from $G_{\text{exec}}$.
- **$d_{\text{exec}}$:** $d_{\text{exec}}(\text{Service}, \text{Repository})=1$. Account is attached as a Terminal-B Data Satellite at $k_{\text{exec}}=1$.
- **User May Infer:** Account is a database resource queried by Repository at step 1.
- **User May NOT Infer:** Account is an execution component at $k_{\text{exec}}=2$.

## Case 6: JS Module Import
- **Path:** $\text{LWC} \xrightarrow{\text{lwc-import}} \text{Utility} \xrightarrow{\text{method-call}} \text{Helper}$
- **$G_{\text{exec}}$ Edges:** $(\text{Utility}, \text{Helper})$. $(\text{LWC}, \text{Utility})$ excluded from $G_{\text{exec}}$.
- **$d_{\text{exec}}$:** $d_{\text{exec}}(\text{Utility}, \text{Helper})=1, d_{\text{exec}}(\text{LWC}, \text{Utility})=\infty$ in $G_{\text{exec}}$.
- **User May Infer:** Utility is a JS module import ($d_{\text{module}}=1$).
- **User May NOT Infer:** Importing a module is identical to executing server Apex.

## Case 7: LWC RPC Bridge
- **Path:** $\text{LWC} \xrightarrow{\text{lwc-apex}} \text{Controller} \xrightarrow{\text{method-call}} \text{Service}$
- **$G_{\text{exec}}$ Edges:** $(\text{LWC}, \text{Controller}), (\text{Controller}, \text{Service})$
- **$d_{\text{exec}}$:** $d_{\text{exec}}(\text{LWC}, \text{Controller})=1, d_{\text{exec}}(\text{LWC}, \text{Service})=2$
- **User May Infer:** Controller is LWC's backend RPC entry point; Service is 2 steps away.
- **User May NOT Infer:** RPC call occurs synchronously in client JS thread.

## Case 8: Trigger Delegation
- **Path:** $\text{Trigger} \xrightarrow{\text{trigger-handler}} \text{Handler} \xrightarrow{\text{method-call}} \text{Service}$
- **$G_{\text{exec}}$ Edges:** $(\text{Trigger}, \text{Handler}), (\text{Handler}, \text{Service})$
- **$d_{\text{exec}}$:** $d_{\text{exec}}(\text{Trigger}, \text{Handler})=1, d_{\text{exec}}(\text{Trigger}, \text{Service})=2$
- **User May Infer:** Trigger delegates event execution to Handler, which calls Service.
- **User May NOT Infer:** Handler executes during database query phase without mutation event.

## Case 9: Event Publisher
- **Path:** $\text{Service} \xrightarrow{\text{event-publisher}} \text{PlatformEvent} \rightarrow \text{SubscriberTrigger}$
- **$G_{\text{exec}}$ Edges:** PlatformEvent is a Terminal-B Event Target ($d_{\text{exec}}=\text{undefined}$). SubscriberTrigger is a new execution root.
- **$d_{\text{exec}}$:** $d_{\text{exec}}(\text{Service}, \text{PlatformEvent})=\text{undefined}$.
- **User May Infer:** Service publishes to PlatformEvent message channel.
- **User May NOT Infer:** SubscriberTrigger executes synchronously inside Service's transaction thread.

## Case 10: UI DOM Composition
- **Path:** $\text{ParentLWC} \xrightarrow{\text{lwc-template-child}} \text{ChildLWC} \xrightarrow{\text{lwc-apex}} \text{Controller}$
- **$G_{\text{exec}}$ Edges:** $(\text{ChildLWC}, \text{Controller})$. $(\text{ParentLWC}, \text{ChildLWC})$ excluded from $G_{\text{exec}}$.
- **$d_{\text{exec}}$:** $d_{\text{exec}}(\text{ChildLWC}, \text{Controller})=1$. ChildLWC is a UI DOM overlay node ($d_{\text{UI}}=1$).
- **User May Infer:** ChildLWC is an HTML template child component with its own RPC entry point.
- **User May NOT Infer:** UI template inclusion is an Apex method call step.

---

# 24. IMPLEMENTATION BLOCKERS

1. **Unfiltered BFS in `explorer/src/lib/focus-graph.ts`:** `computeFocusedGraph()` currently processes all raw edges without applying $T_{\text{exec}}$ edge filtering.
2. **Missing Terminal Data Satellite Pass:** Cytoscape builder lacks satellite attachment geometry for Terminal-B SObjects.
3. **CSS Typo in `explorer/src/lib/graph-style.ts`:** `'lwc-apic'` typo breaks RPC edge visual styling.

---

# 25. TOP 10 REMAINING RISKS

1. User confusion if Terminal Data Satellites are not visually distinguished from execution nodes.
2. High-degree shared SObjects creating visual edge clutter without bundling.
3. Conflating client-side JS module depth ($d_{\text{module}}$) with Apex execution depth ($d_{\text{exec}}$).
4. Custom analytical views bypassing $T_{\text{exec}}$ filtering.
5. Inadvertently dragging attached satellites away from host execution nodes.
6. Execution call cycles causing distance ambiguity if shortest path is not strictly enforced.
7. Discrepancy between AST static analysis precision and runtime dynamic reflection.
8. Visualforce legacy bindings mixed with modern LWC RPC entry points.
9. CustomField proliferation if detail overlays are expanded by default.
10. Divergence between Lens B radial distance and Lens A vertical flow layout.

---

# 26. REQUIRED NEXT AUDIT

`GRAPHVIEW — LENS B REAL-BROWSER PROJECTION AND SATELLITE GEOMETRY PRE-IMPLEMENTATION PROOF`

---

# ABSOLUTE FUNDAMENTAL PRINCIPLE

$$\begin{aligned}
\text{CANONICAL AST GRAPH} &\neq \text{SEMANTIC EXECUTION PROJECTION} \\
&\neq \text{EXECUTION GRAPH } (G_{\text{exec}}) \\
&\neq \text{DISTANCE MAP } (d_{\text{exec}}) \\
&\neq \text{RADIAL GEOMETRY } (r, \theta) \\
&\neq \text{RENDERING} \\
&\neq \text{USER DRAG}
\end{aligned}$$

$$\mathbf{extends \neq execution\ hop} \quad | \quad \mathbf{implements \neq execution\ hop} \quad | \quad \mathbf{lwc-import \neq execution\ hop} \quad | \quad \mathbf{SOQL \neq execution\ hop}$$

### Decisive Question Answer:
> **GraphView produces a repository-grounded $G_{\text{exec}}$ under Model A (Filter Only Architecture) where $E_{\text{exec}}$ is strictly induced by $T_{\text{exec}} = \{ \text{method-call}, \text{instantiation}, \text{lwc-apex}, \text{aura-enabled}, \text{visualforce-controller}, \text{trigger-handler} \}$. `extends`, `implements`, `lwc-import`, `SOQL`, `DML`, and `event-publisher` are 100% excluded from $T_{\text{exec}}$, preserving $d_{\text{exec}}$ metric truth without semantic corruption.**

**NO CODE CHANGES. NO PATCHES. NO IMPLEMENTATION.**
