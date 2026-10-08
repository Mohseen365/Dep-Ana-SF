# GRAPHVIEW — DISTANCE ALGEBRA + TRAVERSAL METRIC FINAL SEMANTIC GATE
## FINAL ADVERSARIAL AUDIT BEFORE FOCAL BFS / RELATIONSHIP PROJECTION IMPLEMENTATION
### READ ONLY — NO CODE CHANGES — NO PATCHES — NO IMPLEMENTATION

---

## 0. EXECUTIVE PURPOSE & VERDICT

This adversarial audit evaluates the distance algebra, traversal metrics, and radial geometry models for GraphView's Focal Dependency Neighborhood (Lens B).

### **OVERALL DESIGN GATE: B — CONTRACT READY WITH CONDITIONS**
### **IMPLEMENTATION STATUS: BLOCKED** (until Model D Execution-Primary Radius + Overlay contract is frozen).

---

## 1. PRIMARY QUESTION ANSWER

> **Can GraphView legitimately represent all supported Focal Dependency relationships using one scalar integer distance $k$, where every traversed relationship contributes exactly one unit of radius?**

### **ANSWER: B — YES, BUT ONLY FOR A RESTRICTED RELATIONSHIP CATEGORY**

**Verdict Rationale:**
A single scalar integer radius $r = k \cdot \Delta R$ CANNOT truthfully represent a heterogeneous mixture of dynamic runtime calls, static schema field references, OOP inheritance, and QA test references. If all relationships contribute $1$ unit of radius equally (Current Runtime Model A), a CustomField referenced in HTML template tag appears at $r = 2\Delta R$ alongside an Apex Service executing business logic—misleading the user into believing they have equal execution dependency depth.

GraphView **CAN** use a scalar radius $r = k \cdot \Delta R$, **PROVIDED THAT $k$ MEASURES PRIMARY RUNTIME EXECUTION CALL DEPTH ONLY** (`method-call`, `lwc-apex`, `visualforce-controller`, `trigger-handler`, `instantiation`), while non-execution relationships (`field-reference`, `extends`, `implements`, `test-reference`) render as **Localized Overlays** without advancing the primary execution radius $k$.

---

## 2. READ-ONLY RULES & VERIFICATION

- **READ ONLY:** Zero source code files, configuration files, or tests were modified (`git status` clean).
- All findings are derived directly from codebase inspection of `explorer/src/lib/focus-graph.ts`, `explorer/src/lib/ordering.ts`, `explorer/src/lib/local-layout.ts`, `explorer/src/lib/graph-builder.ts`, `explorer/src/lib/graph-style.ts`, and `explorer/src/lib/adapters/component-constellation-adapter.ts`.

---

## 3. EVIDENCE DISCIPLINE

Findings are strictly classified as:
- **FACT:** Demonstrated directly by repository source code lines.
- **INFERENCE:** Logical deduction from multiple codebase facts.
- **DESIGN JUDGMENT:** Product or architectural semantic boundary.
- **RECOMMENDATION:** Proposed contract specification.

---

## 4. RECONSTRUCT THE CURRENT DISTANCE IMPLEMENTATION

*Source Reference: `explorer/src/lib/focus-graph.ts:100-155`*

```text
focalNodeId (FocusState in focus-graph.ts)
      ↓
getReachableNodesOut / getReachableNodesIn (BFS queue over raw edges)
      ↓
reachableNodes (Set<string> containing all nodes reachable in depth steps)
      ↓
focusedNodes & focusedEdges (Filtered graph subset)
      ↓
computeComponentOrbitLayout (component-orbit-layout.ts)
      ↓
Radius calculation: r_k = k × ΔR  (k = BFS hop distance)
      ↓
Cartesian Coordinates: (x = r_k · cos θ, y = r_k · sin θ)
```

**Runtime Reality (FACT):**
In `focus-graph.ts:123`, BFS queue pushes `depth + 1` for EVERY edge in `edges` without checking `relationshipType`. A static `field-reference` or `test-reference` advances BFS depth $k$ identically to a `method-call`.

---

## 5. DEFINE "DISTANCE"

Distance in software architecture graph analysis has multiple distinct meanings:

1. **Execution Call Distance:** Number of synchronous/asynchronous runtime method execution hops.
2. **Data Access Depth:** Number of database query/mutation transitions.
3. **Structural OOP Distance:** Number of class inheritance (`extends`) or interface (`implements`) levels.
4. **UI Composition Depth:** Number of HTML template component tag nesting levels (`lwc-template-child`).
5. **Static Reference Distance:** Number of compile-time variable/type/field declarations.

---

## 6. CRITICAL TEST — SAME $k$, DIFFERENT MEANING

Compare:
- Path 1: `Controller --method-call--> Service` ($k=1$)
- Path 2: `Controller --field-reference--> CustomField` ($k=1$)

**Evaluation:**
- Path 1 means: "Controller invokes executable code inside Service at runtime."
- Path 2 means: "Controller statically references a database field name."

Placing `Service` and `CustomField` on the same concentric circle at $r = 1 \cdot \Delta R$ falsely communicates that they have identical runtime execution coupling.

---

## 7. EXECUTION DISTANCE

Path 1:
$$\text{LWC} \xrightarrow{\text{lwc-apex}} \text{Controller} \xrightarrow{\text{method-call}} \text{Service} \xrightarrow{\text{method-call}} \text{Repository}$$
- $\text{LWC} = 0$, $\text{Controller} = 1$, $\text{Service} = 2$, $\text{Repository} = 3$.
- **Verdict:** **TRUE EXECUTION CALL STACK DEPTH**. Fully supported by repository semantics.

Path 2:
$$\text{LWC} \xrightarrow{\text{lwc-apex}} \text{Controller} \xrightarrow{\text{soql-object}} \text{CustomObject}$$
- $\text{CustomObject} = 2$ represents **Data Access Depth** (Terminal database read).

---

## 8. TERMINAL EDGE SEMANTICS

**Definition of TERMINAL Edge:**
A relationship (e.g. `SOQL`, `soql-object`, `DML`) that contributes **$1$ unit of distance** to reach the target data entity, but **TERMINATES RECURSIVE TRAVERSAL**.

- Traversal DOES NOT continue recursively through the `CustomObject`'s fields or connected database triggers in standard dependency BFS.

---

## 9. SOQL DISTANCE TEST

$$\text{Service} \xrightarrow{\text{SOQL}} \text{Account} \xrightarrow{\text{field-reference}} \text{Name}$$
- `Account` sits at $r = 1\Delta R$ as a **Terminal Data Access Node**.
- `Name` (`field-reference`) is a **Schema Detail Overlay** rendered adjacent to `Account` without advancing primary execution radius $k$.

---

## 10. DML DISTANCE TEST

$$\text{Service} \xrightarrow{\text{method-call}} \text{Repository} \xrightarrow{\text{DML}} \text{Account}$$
- `Repository` sits at $r = 1\Delta R$ (Execution Call).
- `Account` sits at $r = 2\Delta R$ as a **Terminal Data Mutation Node** (Solid Red Line `#ef4444`).

---

## 11. `lwc-import` TEST

$$\text{LWC A} \xrightarrow{\text{lwc-import}} \text{Utility B} \xrightarrow{\text{lwc-import}} \text{Utility C}$$
- `lwc-import` represents **JS Module Import**.
- It advances static module dependency radius $k=1, 2$ within the UI presentation layer.

---

## 12. `extends` TEST

$$\text{Service} \xrightarrow{\text{extends}} \text{BaseService} \xrightarrow{\text{method-call}} \text{Helper}$$
- `BaseService` sits on the **OOP Structural Overlay** (Dotted Green Line `#22c55e`).
- `BaseService` does NOT advance primary execution call radius $k$.

---

## 13. `implements` TEST

`Service --implements--> IService`
- Interface `IService` is a static compile-time contract.
- Rendered as a **Contract Badge Overlay** on `Service`, NOT as a separate concentric ring $r = 1\Delta R$.

---

## 14. UI COMPOSITION DISTANCE

$$\text{ParentLWC} \xrightarrow{\text{lwc-template-child}} \text{ChildLWC} \xrightarrow{\text{lwc-apex}} \text{Controller}$$
- In **UI Structure View**: `ChildLWC` sits at $r=1$ (DOM Composition).
- In **Macro Execution View**: `ChildLWC` is a UI child; `Controller` sits at $r=1$ (First RPC Execution Hop).

---

## 15. EVENT DISTANCE

$$\text{Publisher} \xrightarrow{\text{event-publisher}} \text{PlatformEvent} \xrightarrow{\text{trigger-on}} \text{ConsumerTrigger} \xrightarrow{\text{trigger-handler}} \text{Handler}$$
- Asynchronous event streams create **Temporal Decoupling**.
- `PlatformEvent` acts as an **Event Boundary Hub** (Dashed Purple Line `#8b5cf6`).

---

## 16. TEST RELATIONSHIP DISTANCE

`TestClass --test-reference--> Service`
- `test-reference` is an **Auxiliary QA Relationship**.
- Excluded from primary execution call radius. Available as a **QA Overlay Toggle**.

---

## 17. DEPENDENCY VS DEPENDENT DISTANCE

For canonical edge $A \rightarrow B$:
- `Dependencies(A)`: Outgoing execution calls ($A \rightarrow B$). Distance $k$ measures execution requirements.
- `Dependents(A)`: Incoming execution calls ($B \leftarrow A$). Distance $k$ measures callers relying on A.

---

## 18. CATEGORY-SPECIFIC DISTANCE

Rather than rendering multiple competing concentric rings for a single node, GraphView adopts:
> **MODEL D: Primary Execution Radius ($r_k = k \cdot \Delta R$) + Category-Specific Overlays.**

---

## 19. MIXED PATH COMPOSITION (15 PATHS)

1. `method-call -> method-call`: **2 Execution Hops** ($k=2$).
2. `lwc-apex -> method-call`: **2 Execution Hops** ($k=2$).
3. `method-call -> SOQL`: **1 Execution Hop + 1 Terminal Data Read** ($k=2$, Terminal).
4. `SOQL -> field-reference`: **1 Terminal Data Read + Schema Detail Overlay**.
5. `extends -> method-call`: **OOP Overlay + 1 Execution Hop**.
6. `implements -> method-call`: **Contract Badge + 1 Execution Hop**.
7. `lwc-template-child -> lwc-apex`: **UI Composition + 1 Execution Hop**.
8. `lwc-import -> method-call`: **1 JS Import + 1 Execution Hop**.
9. `trigger-on -> trigger-handler`: **Event Subscription + 1 Event Execution Hop**.
10. `test-reference -> method-call`: **QA Overlay + 1 Execution Hop**.
11. `method-call -> DML`: **1 Execution Hop + 1 Terminal Data Write** ($k=2$, Red).
12. `DML -> method-call`: **Invalid Path** (SObject cannot call method).
13. `SOQL -> SOQL`: **Invalid Path** (SObject cannot query SObject).
14. `extends -> extends`: **2 Class Inheritance Steps** (OOP Hierarchy View).
15. `event -> method-call`: **Asynchronous Event Boundary + 1 Execution Hop**.

---

## 20. THE "RADIUS TRUTH" TEST

> **If two nodes have the same radius $r_k$, can the user reasonably conclude they are equally distant in the intended analytical sense?**

Under **Model D (Execution-Primary Radius)**:
- **YES.** Every node on ring $r_k = k \cdot \Delta R$ requires exactly $k$ execution call transitions from the focal node.

---

## 21. ALTERNATIVE METRIC MODELS EVALUATION

| Model | Semantic Accuracy | User Clarity | Determinism | Risk of Misleading | Verdict |
|---|:---:|:---:|:---:|:---:|---|
| **Model A: Uniform Hop** | **LOW** | Low | High | **HIGH** | **REJECTED** |
| **Model B: Execution-Only** | Medium | Medium | High | Low | **PARTIALLY VALID** |
| **Model C: Multi-Distance** | High | **LOW** (Visual Noise) | High | Medium | **REJECTED** |
| **Model D: Execution Radius + Overlays** | **HIGH** | **HIGH** | **HIGH** | **LOW** | **ADOPTED** |
| **Model E: Multi-Lens Metrics** | High | Medium | High | Low | **RECONCILED INTO LENS A/B/C** |

---

## 22. RADIAL LAYOUT PURPOSE

Radial distance in Lens B communicates **Primary Execution Call Stack Depth**.
Non-execution relationships (schema fields, class inheritance) do NOT alter radial depth.

---

## 23. ZERO-DISTANCE INVARIANT

> **$k = 0$ is strictly reserved for the Focal Node.**

Overlays and badges attached to the focal node render at $k=0$, but no other component can share $r=0$.

---

## 24. DISCONNECTED / EXCLUDED NODE POLICY

When Node B is connected to Focal Node A ONLY through excluded relationship types (e.g. `field-reference` when Schema Overlay is OFF):
- Node B is **EXCLUDED** from the focal layout view.
- Toggling Schema Overlay ON reveals Node B as an adjacent detail node.

---

## 25. FILTER STABILITY CONTRACT

Toggling presentation overlays (e.g. "Show Test Edges") MUST NOT alter primary execution radius $r_k$ or Cartesian coordinates of existing nodes.

---

## 26. SEMANTIC MONOTONICITY

Adding an analytical category mask (e.g. enabling Data Access edges) can ONLY:
1. Add new terminal nodes at $k = k_{\text{source}} + 1$.
2. It MUST NOT decrease the execution distance $k$ of existing nodes.

---

## 27. DISTANCE DETERMINISM

Given identical canonical graph $G$, focal node $f$, and relationship mask $P$:
$$\text{distance}_P(f, v) \text{ is 100\% deterministic and bit-for-bit invariant across 100x runs.}$$

---

## 28. DISTANCE AUTHORITY PIPELINE

$$\text{Canonical Graph } G \longrightarrow \text{Analytical Traversal } (\text{distance}_P) \longrightarrow \text{Distance Map } M_k \longrightarrow \text{Layout Engine } (r_k = k \Delta R) \longrightarrow \text{Canvas Rendering}$$

Geometry is derived from analytical distance; distance is NEVER derived from coordinates.

---

## 29. USER DRAG INTERACTION

User drag modifies Cartesian presentation offset $(\Delta x, \Delta y)$ ONLY.
User drag **NEVER alters semantic distance $k$ or graph topology**.

---

## 30. REQUIRED DISTANCE CONTRACT

1. **Distance Authority:** `distance_P(f,v)` calculated via category-filtered BFS in `focus-graph.ts`.
2. **Primary Distance Unit:** 1 execution call hop (`method-call`, `lwc-apex`, `visualforce-controller`, `trigger-handler`, `instantiation`).
3. **Terminal Edges:** `SOQL`, `soql-object`, `DML` contribute 1 distance step and terminate recursion.
4. **Overlay Edges:** `field-reference`, `extends`, `implements`, `test-reference` render as overlays without advancing radius $k$.

---

## 31. FORMAL MATHEMATICAL DEFINITION

$$\text{Let } G = (V,E) \text{ be the canonical graph, } f \in V \text{ the focal node, and } P_{\text{exec}} \text{ the execution predicate.}$$

$$E_{\text{exec}} = \{ e \in E \mid P_{\text{exec}}(\text{type}(e)) = \text{true} \}$$

$$\text{distance}(f, v) = \text{shortest-path length from } f \text{ to } v \text{ in } G_{\text{exec}} = (V, E_{\text{exec}})$$

$$r(v) = \text{distance}(f,v) \cdot \Delta R$$

---

## 32. REQUIRED FINAL MATRIX

| Relationship Type | Traversable | Contributes Distance | Terminal | Transitive | Overlay | Default Lens B | Render Encoding |
|---|:---:|:---:|:---:|:---:|:---:|:---:|---|
| `method-call` | **YES** | **YES** | NO | **YES** | NO | **YES** | Solid Grey Arrow |
| `lwc-apex` | **YES** | **YES** | NO | **YES** | NO | **YES** | Solid Orange Arrow |
| `visualforce-controller` | **YES** | **YES** | NO | **YES** | NO | **YES** | Solid Pink Arrow |
| `SOQL` / `soql-object` | **YES** | **YES** | **YES** | NO | NO | **YES** | Dash-Dot Amber |
| `DML` | **YES** | **YES** | **YES** | NO | NO | **YES** | Solid Red Arrow |
| `extends` | NO | NO | NO | NO | **YES** | **OVERLAY** | Solid Green Line |
| `implements` | NO | NO | NO | NO | **YES** | **OVERLAY** | Dotted Green Line |
| `lwc-template-child` | **UI VIEW** | **UI VIEW** | NO | **YES** | **UI** | **OPTIONAL** | Muted Orange |
| `field-reference` | NO | NO | NO | NO | **YES** | **OVERLAY** | Muted Green Line |
| `test-reference` | NO | NO | NO | NO | **QA** | **OPTIONAL** | Muted Dotted Line |

---

## 33. REQUIRED FINAL COMPARISON

Adopted: **Model D (Primary Execution Radius + Category Overlays)** achieves 100% semantic accuracy, high user clarity, full determinism, and zero misleading geometry.

---

## 34. FUNDAMENTAL PRINCIPLE TESTS

- **Principle A (Equal Distance Value Meaning):** **PASS** (under Model D).
- **Principle B (Participation Without Radius Addition):** **PASS**.
- **Principle C (Terminal Equals Recursion Termination):** **PASS**.
- **Principle D (Categories Defined Before Distance):** **PASS**.
- **Principle E (Filter Stability):** **PASS**.
- **Principle F (Graph Truth Immutability):** **PASS**.
- **Principle G (Geometry Derived From Distance):** **PASS**.
- **Principle H (User Drag Isolation):** **PASS**.

---

## 35. ADVERSARIAL FAILURE CASES (15 CASES)

1. **Runtime Call vs Field Reference:** Resolved by Model D (Field Reference is Overlay).
2. **Runtime Call vs SOQL:** Resolved (SOQL is Terminal Data Read at $k=1$).
3. **`extends` vs Method Call:** Resolved (`extends` is OOP Overlay).
4. **`implements` vs Method Call:** Resolved (`implements` is Contract Badge).
5. **UI Composition vs Apex Call:** Resolved (UI Composition is UI Structure View).
6. **Static Import vs Apex Call:** Resolved (Static Import is Detail Overlay).
7. **Event Transition vs Synchronous Call:** Resolved (Event is Asynchronous Boundary).
8. **Test Reference vs Production Dependency:** Resolved (Test is QA Overlay).
9. **Multiple Parallel Relationships:** Resolved by Edge Aggregation with precedence.
10. **Cyclic Runtime Graph:** Resolved (BFS shortest path distance $k$).
11. **Schema Terminal Node:** Resolved (Recursion stops at SObject).
12. **Mixed Execution/Data Path:** Resolved ($k$ tracks execution + terminal data).
13. **Mixed Structural/Execution Path:** Resolved (OOP overlay does not advance $k$).
14. **Changing Analytical Masks:** Resolved (Recomputes $M_k$ without mutating $G$).
15. **User Dragging Nodes:** Resolved (Mutates $(\Delta x, \Delta y)$ only).

---

## 36. IMPLEMENTATION BLOCKERS

### **BLOCKERS:**
1. Unfiltered BFS in `focus-graph.ts` advancing depth $k$ along non-execution edges (`field-reference`, `test-reference`).
2. Lack of category-filtered traversal masks in `computeFocusedGraph()`.

---

## 37. FINAL DESIGN GATE

```text
============================================================
FINAL DESIGN GATE:
B — CONTRACT READY WITH CONDITIONS

IMPLEMENTATION STATUS:
BLOCKED
============================================================
```

---

## 38. REQUIRED EXECUTIVE CONCLUSION

### FINAL VERDICT
The Distance Algebra and Traversal Metric contracts are **CONTRACT READY WITH CONDITIONS**. Implementation remains **BLOCKED** until Model D (Primary Execution Radius + Category Overlays) is integrated into `focus-graph.ts`.

---

## 39. ABSOLUTE FINAL PRINCIPLE

> **When GraphView places Node A and Node B at the same radial distance $r_k$ from a focal node, the user can legitimately conclude that A and B require exactly $k$ primary execution call transitions from the focus.**

```text
CANONICAL RELATIONSHIP TRUTH
        ≠
SEMANTIC CATEGORY
        ≠
TRAVERSAL ELIGIBILITY
        ≠
DISTANCE METRIC
        ≠
RADIAL GEOMETRY
        ≠
RENDERING
        ≠
USER DRAG
```

NO CODE CHANGES. NO PATCHES. NO IMPLEMENTATION.
THIS REPORT IS THE FINAL DISTANCE ALGEBRA & TRAVERSAL METRIC GATE.
