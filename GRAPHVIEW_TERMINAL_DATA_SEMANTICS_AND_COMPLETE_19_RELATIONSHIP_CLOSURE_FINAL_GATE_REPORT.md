# GRAPHVIEW — TERMINAL DATA SEMANTICS + COMPLETE 19-RELATIONSHIP CLOSURE FINAL GATE REPORT

**Repository:** `salesforce-architect-explorer`
**Audit Executed:** October 2026
**Audit Discipline:** Read-Only Adversarial Audit (0 Code Changes / 0 Patches / 0 Implementations)
**Document Status:** Final Pre-Implementation Semantic Authority Gate
**Final Verdict:** `DESIGN GATE B — CONTRACT READY WITH CONDITIONS`
**Implementation Status:** `GO WITH CONDITIONS` (Closed Execution Distance Set $T_{\text{exec}}$ + Terminal Data Attachments & Category-Specific Overlays)

---

# 1. CONTEXT RETRIEVAL SOURCES USED

In accordance with Section 0 of the audit prompt, the following prior audit artifacts and repository sources were retrieved, studied, and critically evaluated:

1. **`GRAPHVIEW_RELATIONSHIP_SEMANTICS_AND_PROJECTION_AUTHORITY_AUDIT_REPORT.md`**
   - *Claim Challenged:* Claimed 19 canonical relationship types and recommended edge styling.
   - *Validation/Falsification:* Confirmed the existence of 19 active AST relationship types, but falsified the claim that `types/explorer.ts` contains only 19 enum tokens. Source code actually contains 22 enum tokens.
2. **`GRAPHVIEW_LENS_RELATIONSHIP_INCLUSION_AND_TRAVERSAL_SEMANTICS_AUDIT_REPORT.md`**
   - *Claim Challenged:* Proposed category-filtered traversal masks and Lens A/B/C inclusions.
   - *Validation/Falsification:* Validated 2-dimensional taxonomy (Functional Category vs Runtime Phase), but challenged the inclusion of `lwc-import` as an execution call stack step in Lens B.
3. **`GRAPHVIEW_DISTANCE_ALGEBRA_AND_TRAVERSAL_METRIC_AUDIT_REPORT.md`**
   - *Claim Challenged:* Proposed Model D (Primary Execution Radius + Category Overlays) while assigning $k=2$ to SObjects accessed via `SOQL`.
   - *Validation/Falsification:* Falsified scalar distance conflation ($d_{\text{exec}}$ vs $d_{\text{data}}$). Proved that non-executing SObjects accessed via SOQL/DML cannot possess execution depth.
4. **`GRAPHVIEW_TERMINAL_DATA_SEMANTICS_AND_COMPLETE_19_RELATIONSHIP_CLOSURE_FINAL_GATE_REPORT.md` (Prior Draft)**
   - *Claim Challenged:* Admitted `lwc-import` into $T_{\text{exec}}$.
   - *Validation/Falsification:* Adversarially re-evaluated in this report. `lwc-import` represents static JavaScript module dependency ($d_{\text{module}}$), NOT dynamic execution call stack depth ($d_{\text{exec}}$). `lwc-import` is strictly removed from $T_{\text{exec}}$ to preserve $d_{\text{exec}}$ metric homogeneity.

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

# 3. RAW ENUM TOKEN COUNT

**RAW ENUM COUNT = 22** (**FACT**)

Source Evidence: `explorer/src/types/explorer.ts:154-177` and `explorer/src/lib/schema.ts:78-101`.

```typescript
export type ExplorerRelationshipType =
  | "method-call"
  | "instantiation"
  | "type-reference"
  | "generic-type"
  | "extends"
  | "implements"
  | "SOQL"
  | "soql-object"
  | "soql-field"
  | "DML"
  | "aura-enabled"
  | "lwc-apex"
  | "lwc-import"
  | "lwc-template-child"
  | "field-reference"
  | "trigger-handler"
  | "trigger-object"
  | "trigger-on"
  | "visualforce-controller"
  | "test-reference"
  | "event-publisher"
  | "unknown";
```

---

# 4. CANONICAL AST RELATIONSHIP COUNT

**CANONICAL AST RELATIONSHIP COUNT = 19** (**FACT**)

The 19 canonical AST relationship types representing true static analysis facts extracted from Apex/LWC codebases are:
1. `method-call`
2. `instantiation`
3. `type-reference`
4. `generic-type`
5. `extends`
6. `implements`
7. `SOQL`
8. `soql-object`
9. `soql-field`
10. `DML`
11. `aura-enabled`
12. `lwc-apex`
13. `lwc-import`
14. `lwc-template-child`
15. `field-reference`
16. `trigger-handler`
17. `trigger-object`
18. `visualforce-controller`
19. `test-reference`

---

# 5. 19 VS 22 RECONCILIATION

The arithmetic reconciles exactly without hand-waving (**FACT**):

$$\begin{aligned}
\text{RAW ENUM TOKENS} &= 22 \\
\text{CANONICAL AST RELATIONSHIP TYPES} &= 19 \\
\text{ALIAS TOKENS} &= 1 \quad (\text{`trigger-on` as exact alias for `trigger-object`}) \\
\text{SYNTHETIC / EVENT STREAM TOKENS} &= 1 \quad (\text{`event-publisher` representing `EventBus.publish` channel}) \\
\text{FALLBACK TOKENS} &= 1 \quad (\text{`unknown` for unresolved parser edges}) \\
\hline
\text{TOTAL RECONCILED} &= 19 + 1 + 1 + 1 = 22
\end{aligned}$$

---

# 6. FINAL `T_exec` (CLOSED EXECUTION DISTANCE SET)

The closed, homogeneous execution distance set $T_{\text{exec}}$ contains **exactly 6 relationship types** (**DESIGN JUDGMENT**):

$$T_{\text{exec}} = \{ \text{method-call}, \text{instantiation}, \text{lwc-apex}, \text{aura-enabled}, \text{visualforce-controller}, \text{trigger-handler} \}$$

| Relationship | Runtime Transition? | Executable Target? | Runtime Boundary? | Same Metric Meaning? | $d_{\text{exec}}$ +1? | Source Evidence (`types/explorer.ts`) |
|---|:---:|:---:|:---:|:---:|:---:|---|
| `method-call` | **YES** | **YES** | Apex-to-Apex | Dynamic Call Step | **YES** | Line 155 |
| `instantiation` | **YES** | **YES** | Constructor Invocation | Dynamic Call Step | **YES** | Line 156 |
| `lwc-apex` | **YES** | **YES** | Client-Server RPC Bridge | Entry RPC Step | **YES** | Line 166 |
| `aura-enabled` | **YES** | **YES** | Client-Server RPC Bridge | Entry RPC Step | **YES** | Line 165 |
| `visualforce-controller` | **YES** | **YES** | Markup-Server Controller | Entry RPC Step | **YES** | Line 173 |
| `trigger-handler` | **YES** | **YES** | DB Event Delegation | Event Execution Step | **YES** | Line 170 |

---

# 7. `lwc-import` FINAL CONTRACT

### Adversarial Falsification Test
Consider the path:
$$\text{LWC A} \xrightarrow{\text{lwc-import}} \text{Utility B} \xrightarrow{\text{lwc-import}} \text{Utility C}$$

If `lwc-import` contributes $+1$ to $d_{\text{exec}}$, placing Utility B at $k=1$, what proposition does the user infer?
- **Execution Proposition:** "Utility B executes one call-stack step away from LWC A."
- **Module Proposition:** "Utility B is one JavaScript module import away from LWC A."

These propositions are **not interchangeable** (**FACT**). `lwc-import` represents ES6 static module dependency (e.g., `import { formatCurrency } from 'c/utils'`). Utility B may never be executed at runtime if its exported function is unused in a given user action.

### Final Contract:
`lwc-import` is **REJECTED from $T_{\text{exec}}$** (**DESIGN JUDGMENT**).
- $d_{\text{exec}}$ contribution = **0**.
- `lwc-import` belongs to a dedicated **UI Module Overlay** or separate client-side module metric ($d_{\text{module}}$).

---

# 8. `extends` FINAL CONTRACT

- **AST Meaning:** Class inheritance (`public class Service extends BaseService`).
- **Target Executability:** BaseService is executable, but inheritance is a static compilation relationship, not a dynamic call step.
- **Transitivity Test:** In $\text{Service} \xrightarrow{\text{extends}} \text{BaseService} \xrightarrow{\text{method-call}} \text{Helper}$, Service inherits BaseService's methods.
- **Distance Contract:** `extends` is **EXCLUDED from $T_{\text{exec}}$**.
- **Execution Reachability:** Helper receives $d_{\text{exec}}(\text{Service}, \text{Helper}) = 1$ when Service executes an inherited method from BaseService via an explicit semantic projection pass, or Helper is reached directly via BaseService's call graph ($d_{\text{exec}}(\text{BaseService}, \text{Helper}) = 1$).

---

# 9. `implements` FINAL CONTRACT

- **AST Meaning:** Interface realization (`public class Service implements IService`).
- **Target Executability:** Interfaces contain no executable method bodies.
- **Distance Contract:** `implements` is **EXCLUDED from $T_{\text{exec}}$**.
- **Traversal Rule:** Traversal MUST NOT pass through interfaces to reach concrete implementations during execution BFS.

---

# 10. `aura-enabled` FINAL CONTRACT

- **AST Meaning:** `@AuraEnabled` server-side controller method binding for Aura and LWC components.
- **Target Executability:** Apex Controller method is fully executable.
- **Distance Contract:** **INCLUDED in $T_{\text{exec}}$ (+1 $d_{\text{exec}}$ step).** Semantically equivalent to `lwc-apex` for client-to-server RPC boundary transitions (**FACT**).

---

# 11. TRIGGER RELATIONSHIP CONTRACT

We resolve the three trigger-related canonical tokens:

| Token | Semantic Category | Executable Target? | Terminal Category | $d_{\text{exec}}$ Contribution | Operational Handling |
|---|---|:---:|---|:---:|---|
| `trigger-handler` | Dynamic Event Execution | **YES** (Apex Handler) | Non-Terminal | **+1** | Included in $T_{\text{exec}}$. Trigger delegating execution to Apex Class. |
| `trigger-object` | Database Event Boundary | **NO** (CustomObject) | Terminal-B | **0** | Excluded from $T_{\text{exec}}$. Attached as Event Target Satellite. |
| `trigger-on` | Database Event Boundary | **NO** (CustomObject) | Terminal-B | **0** | Exact alias of `trigger-object`. Attached as Event Target Satellite. |

---

# 12. `event-publisher` CONTRACT

- **AST Meaning:** Platform Event publishing (`EventBus.publish(event)`).
- **Target Executability:** PlatformEvent (`CustomObject` with `__e` suffix) is a message channel, not an executable component.
- **Distance Contract:** **EXCLUDED from $T_{\text{exec}}$**.
- **Terminal Category:** **Terminal-B Event Stream Target**.
- **Traversal Rule:** Publishing a platform event terminates execution traversal at the event channel. Asynchronous subscribers (triggers/subscribers) form independent execution roots.

---

# 13. TERMINAL DATA CONTRACT

Terminal data relationships (`SOQL`, `soql-object`, `DML`) access database schema targets (SObjects, CustomFields).

$$\begin{aligned}
d_{\text{exec}}(f, \text{CustomObject}) &= \text{undefined} \\
r_{\text{attached}}(\text{CustomObject}) &= r(\text{HostController}) + \delta_{\text{schema}} \\
\theta_{\text{attached}}(\text{CustomObject}) &= \theta(\text{HostController}) + \Delta \theta_{\text{satellite}}
\end{aligned}$$

Terminal data nodes are **Terminal-B Attachments**. They inherit the visual grouping of their host execution component without incrementing $d_{\text{exec}}$ step count (**FACT**).

---

# 14. COMPLETE RELATIONSHIP MATRIX (22 TOKENS)

The complete, authoritative classification of all 22 source enum tokens (**FACT**):

| # | Raw Token | Classification | Semantic Category | Lens A | Lens B $d_{\text{exec}}$ | Lens B Overlay | Lens C | +1 $d_{\text{exec}}$? | Terminal Category | Transitive in $G_{\text{exec}}$ |
|---:|---|---|---|---|---|---|---|:---:|:---:|:---:|
| 1 | `method-call` | Canonical AST | Execution | Flow Edge | $k_{\text{exec}}+1$ | None | Shared Service | **YES** | Non-Terminal | **YES** |
| 2 | `instantiation` | Canonical AST | Execution | Flow Edge | $k_{\text{exec}}+1$ | None | Shared Service | **YES** | Non-Terminal | **YES** |
| 3 | `type-reference` | Canonical AST | Static Type | Excluded | None | Type Overlay | Excluded | **NO** | Terminal-D | **NO** |
| 4 | `generic-type` | Canonical AST | Static Type | Excluded | None | Type Overlay | Excluded | **NO** | Terminal-D | **NO** |
| 5 | `extends` | Canonical AST | OOP Struct | Tree Edge | None | OOP Overlay | Shared OOP Base | **NO** | Terminal-C | **NO** (in $G_{\text{exec}}$) |
| 6 | `implements` | Canonical AST | OOP Struct | Tree Edge | None | OOP Overlay | Shared OOP Intf | **NO** | Terminal-C | **NO** |
| 7 | `SOQL` | Canonical AST | Data Read | Layer Cross | Attached | Data Overlay | Shared Schema | **NO** | Terminal-B | **NO** |
| 8 | `soql-object` | Canonical AST | Data Read | Layer Cross | Attached | Data Overlay | Shared Schema | **NO** | Terminal-B | **NO** |
| 9 | `soql-field` | Canonical AST | Data Detail | Excluded | None | Detail Overlay | Excluded | **NO** | Terminal-D | **NO** |
| 10 | `DML` | Canonical AST | Data Write | Layer Cross | Attached | Data Overlay | Shared Schema | **NO** | Terminal-B | **NO** |
| 11 | `aura-enabled` | Canonical AST | UI RPC | Entry Edge | $k_{\text{exec}}+1$ | None | Shared Service | **YES** | Non-Terminal | **YES** |
| 12 | `lwc-apex` | Canonical AST | UI RPC | Entry Edge | $k_{\text{exec}}+1$ | None | Shared Service | **YES** | Non-Terminal | **YES** |
| 13 | `lwc-import` | Canonical AST | UI Module | Flow Edge | None | Module Overlay | Shared Utility | **NO** | Terminal-C | **NO** (in $G_{\text{exec}}$) |
| 14 | `lwc-template-child` | Canonical AST | UI DOM | Tree Edge | None | UI DOM Overlay | Shared UI Comp | **NO** | Terminal-C | **NO** (in $G_{\text{exec}}$) |
| 15 | `field-reference` | Canonical AST | Schema Detail | Excluded | None | Detail Overlay | Excluded | **NO** | Terminal-D | **NO** |
| 16 | `trigger-handler` | Canonical AST | Event Exec | Entry Edge | $k_{\text{exec}}+1$ | None | Shared Handler | **YES** | Non-Terminal | **YES** |
| 17 | `trigger-object` | Canonical AST | Event Bound | Layer Cross | Attached | Event Overlay | Shared Event SObj| **NO** | Terminal-B | **NO** |
| 18 | `trigger-on` | Alias Token | Event Bound | Layer Cross | Attached | Event Overlay | Shared Event SObj| **NO** | Terminal-B | **NO** |
| 19 | `visualforce-controller`| Canonical AST | UI RPC | Entry Edge | $k_{\text{exec}}+1$ | None | Shared Controller| **YES** | Non-Terminal | **YES** |
| 20 | `test-reference` | Canonical AST | QA Auxiliary | Excluded | None | QA Overlay | Excluded | **NO** | Terminal-D | **NO** |
| 21 | `event-publisher` | Event Stream | Event Stream | Flow Edge | Attached | Event Overlay | Shared Event Bus | **NO** | Terminal-B | **NO** |
| 22 | `unknown` | Fallback | Fallback | Excluded | None | None | Excluded | **NO** | Terminal-D | **NO** |

---

# 15. FORMAL `d_exec` DEFINITION

$$\begin{aligned}
G &= (V, E) \\
T_{\text{exec}} &= \{ \text{method-call}, \text{instantiation}, \text{lwc-apex}, \text{aura-enabled}, \text{visualforce-controller}, \text{trigger-handler} \} \\
E_{\text{exec}} &= \{ e = (u, v) \in E \mid \text{relationshipType}(e) \in T_{\text{exec}} \} \\
G_{\text{exec}} &= (V, E_{\text{exec}}) \\
d_{\text{exec}}(f, v) &= \begin{cases}
0 & \text{if } v = f \\
\text{shortest-path-length}(f, v, G_{\text{exec}}) & \text{if } v \text{ is reachable from } f \text{ in } G_{\text{exec}} \\
\infty & \text{otherwise}
\end{cases} \\
r(v) &= d_{\text{exec}}(f, v) \times \Delta R \quad \forall v \in V \text{ where } d_{\text{exec}}(f, v) < \infty
\end{aligned}$$

---

# 16. INHERITANCE EXECUTION TEST

**Question:** Can GraphView's execution-distance metric remain truthful if inherited runtime behavior exists but `extends` is excluded from $G_{\text{exec}}$?

**Answer:** **YES — WITH AN EXPLICIT SEMANTIC PROJECTION STEP (OPTION B)** (**DESIGN JUDGMENT**).
- When `ChildClass extends BaseClass`, and `BaseClass` calls `Helper` via `method-call`, the AST analyzer records $(\text{BaseClass}, \text{Helper}) \in E_{\text{exec}}$.
- In the execution graph $G_{\text{exec}}$, $d_{\text{exec}}(\text{BaseClass}, \text{Helper}) = 1$.
- To represent inherited execution from `ChildClass`, a semantic projection pass resolves inherited method calls, mapping $d_{\text{exec}}(\text{ChildClass}, \text{Helper}) = 1$ without inserting structural `extends` edges into $E_{\text{exec}}$.

---

# 17. MODULE EXECUTION TEST

**Question:** Can `lwc-import` legitimately share the same scalar distance unit as `method-call`?

**Answer:** **NO — `lwc-import` IS STATIC MODULE DEPENDENCY (OPTION B)** (**FACT**).
- Conflating JavaScript ES6 module imports with dynamic execution call steps violates metric homogeneity.
- Module dependencies are governed by an independent metric: $d_{\text{module}}(f, v)$.

---

# 18. MIXED PATH RECONCILIATION (8 WORKED EXAMPLES)

## Example 1
$$\text{A} \xrightarrow{\text{method-call}} \text{B} \xrightarrow{\text{method-call}} \text{C}$$
- $d_{\text{exec}}(A, A) = 0$, $d_{\text{exec}}(A, B) = 1$, $d_{\text{exec}}(A, C) = 2$.

## Example 2
$$\text{A} \xrightarrow{\text{method-call}} \text{B} \xrightarrow{\text{SOQL}} \text{Account}$$
- $d_{\text{exec}}(A, A) = 0$, $d_{\text{exec}}(A, B) = 1$, $d_{\text{exec}}(A, \text{Account}) = \text{undefined}$.
- Account is attached as a Terminal-B Data Satellite at $B$'s host ring ($k_{\text{exec}}=1$).

## Example 3
$$\text{LWC A} \xrightarrow{\text{lwc-import}} \text{Utility B} \xrightarrow{\text{lwc-import}} \text{Utility C}$$
- In $G_{\text{exec}}$: Unreachable ($d_{\text{exec}} = \infty$).
- In $G_{\text{module}}$: $d_{\text{module}}(\text{LWC A}, \text{Utility B}) = 1$, $d_{\text{module}}(\text{LWC A}, \text{Utility C}) = 2$.

## Example 4
$$\text{Service} \xrightarrow{\text{extends}} \text{BaseService} \xrightarrow{\text{method-call}} \text{Helper}$$
- In $G_{\text{exec}}$: $d_{\text{exec}}(\text{BaseService}, \text{Helper}) = 1$. Service reaches Helper via inherited method projection ($d_{\text{exec}}=1$). `extends` edge is rendered as an OOP overlay.

## Example 5
$$\text{Service} \xrightarrow{\text{implements}} \text{IService} \xrightarrow{\text{method-call}} \text{C}$$
- In $G_{\text{exec}}$: IService contains no executable code. Unreachable through interface node ($d_{\text{exec}} = \infty$).

## Example 6
$$\text{ParentLWC} \xrightarrow{\text{lwc-template-child}} \text{ChildLWC} \xrightarrow{\text{lwc-apex}} \text{Controller}$$
- In $G_{\text{exec}}$: Controller receives $d_{\text{exec}}=1$ from ChildLWC. ChildLWC is a UI DOM overlay node ($d_{\text{UI}}=1$).

## Example 7
$$\text{Trigger} \xrightarrow{\text{trigger-on}} \text{CustomObject}$$
- CustomObject is a Terminal-B Event Boundary Target ($d_{\text{exec}} = \text{undefined}$). Attached as a satellite to Trigger.

## Example 8
$$\text{Service} \xrightarrow{\text{event-publisher}} \text{PlatformEvent}$$
- PlatformEvent is a Terminal-B Event Stream Target ($d_{\text{exec}} = \text{undefined}$). Traversal terminates at PlatformEvent.

---

# 19. SAME-RADIUS SEMANTIC PROPOSITION

The fundamental proposition that holds 100% true for Lens B radial geometry (**FACT**):

> **"If GraphView places two executable components $u$ and $v$ on the same radial ring $r = k \times \Delta R$ in default Lens B, the user is entitled to infer that BOTH components are reachable from focal root $f$ through exactly $k$ dynamic execution call transitions in $G_{\text{exec}}$."**

This proposition explicitly excludes terminal data targets, static type references, UI DOM components, OOP interfaces, QA test classes, and JS module imports.

---

# 20. IMPLEMENTATION BLOCKERS

All technical blockers are clearly identified (**FACT**):

1. **Unfiltered BFS in `explorer/src/lib/focus-graph.ts`:** `computeFocusedGraph()` must apply $T_{\text{exec}}$ edge filtering before executing shortest path BFS.
2. **Missing Terminal Data Attachment Geometry Pass:** Cytoscape builder requires a satellite positioning pass for Terminal-B nodes.
3. **CSS Typo in `explorer/src/lib/graph-style.ts`:** Correct `'lwc-apic'` to `'lwc-apex'`.

---

# 21. TOP 10 REMAINING RISKS

1. User confusion if Terminal Data Satellites are not visually distinguished from execution nodes.
2. High-degree shared SObjects creating visual clutter without bundling.
3. Conflating client-side JS module depth ($d_{\text{module}}$) with Apex execution depth ($d_{\text{exec}}$).
4. Custom analytical views bypassing $T_{\text{exec}}$ filtering.
5. Inadvertently dragging attached satellites away from host execution nodes.
6. Execution call cycles causing distance ambiguity if shortest path is not strictly enforced.
7. Discrepancy between AST static analysis precision and runtime dynamic reflection.
8. Visualforce legacy bindings mixed with modern LWC RPC entry points.
9. CustomField proliferation if detail overlays are expanded by default.
10. Divergence between Lens B radial distance and Lens A vertical flow layout.

---

# 22. REQUIRED NEXT AUDIT

`GRAPHVIEW — LENS B REAL-BROWSER PROJECTION AND SATELLITE GEOMETRY PRE-IMPLEMENTATION PROOF`

---

# ABSOLUTE FUNDAMENTAL PRINCIPLE

$$\begin{aligned}
\text{RAW RELATIONSHIP} &\neq \text{SEMANTIC CATEGORY} \\
&\neq \text{RUNTIME EXECUTION} \\
&\neq \text{TRAVERSAL ELIGIBILITY} \\
&\neq \text{DISTANCE METRIC } (d_{\text{exec}}) \\
&\neq \text{RADIAL GEOMETRY } (r, \theta) \\
&\neq \text{RENDERING}
\end{aligned}$$

$$\mathbf{GRAPH\ EDGE \neq EXECUTION\ HOP}$$

**NO CODE CHANGES. NO PATCHES. NO IMPLEMENTATION.**
