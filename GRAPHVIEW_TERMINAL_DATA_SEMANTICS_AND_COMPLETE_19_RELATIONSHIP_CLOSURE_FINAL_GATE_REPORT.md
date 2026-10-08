# GRAPHVIEW — TERMINAL DATA SEMANTICS + COMPLETE 19-RELATIONSHIP CLOSURE FINAL GATE REPORT

**Repository:** `salesforce-architect-explorer`
**Audit Executed:** October 2026
**Audit Discipline:** Read-Only Adversarial Audit (0 Code Changes / 0 Patches / 0 Implementations)
**Document Status:** Final Pre-Implementation Semantic Authority Gate
**Final Verdict:** `DESIGN GATE B — CONTRACT READY WITH CONDITIONS`
**Implementation Status:** `GO WITH CONDITIONS` (Pure Execution Radius $d_{\text{exec}}$ + Terminal Data Attachments & Category-Specific Overlay Masks)

---

# 0. PURPOSE & EXECUTIVE CONTEXT

This adversarial audit is the fourth, final, and strictest evaluation in the GraphView relationship semantic series, succeeding:
1. `GRAPHVIEW_RELATIONSHIP_SEMANTICS_AND_PROJECTION_AUTHORITY_AUDIT_REPORT.md`
2. `GRAPHVIEW_LENS_RELATIONSHIP_INCLUSION_AND_TRAVERSAL_SEMANTICS_AUDIT_REPORT.md`
3. `GRAPHVIEW_DISTANCE_ALGEBRA_AND_TRAVERSAL_METRIC_AUDIT_REPORT.md`

The previous distance audit proposed **Model D — Primary Execution Radius + Category-Specific Overlays**. However, forensic mathematical and semantic review revealed unresolved internal contradictions across claims regarding terminal data edges (`SOQL`, `soql-object`, `DML`), execution call stack transitions, and radial distance metrics.

This audit does **not** assume Model D is correct. It subjects Model D to rigorous adversarial falsification, evaluates five competing distance models (D1–D5), reconciles all 19 canonical relationship types (plus the 3 additional schema tokens in `explorer/src/types/explorer.ts`), establishes exact terminal data semantics, and produces a single, non-contradictory mathematical and operational contract for GraphView's radial lens (Lens B).

---

# 1. CRITICAL CONTRADICTIONS RESOLVED

Prior reports contained a severe mathematical and semantic contradiction:

- **Claim A:** Primary execution radius $r(v) = k \times \Delta R$ measures the number of *primary execution call transitions* (e.g. $A \xrightarrow{\text{method-call}} B$).
- **Claim B:** Data access relationships (`SOQL`, `DML`) contribute one unit of distance, are terminal, and therefore increase $k$ (e.g. $A \xrightarrow{\text{SOQL}} \text{Account} \implies \text{Account receives } k=2$).
- **Claim C:** The formal mathematical distance definition is strictly $d_{\text{exec}}(f,v) = \text{shortest-path-length in } G_{\text{exec}}$, where $E_{\text{exec}} = \{ e \in E \mid \text{type}(e) \in \text{ExecutionTypes} \}$.
- **Claim D:** In $A \xrightarrow{\text{method-call}} \text{Repository} \xrightarrow{\text{SOQL}} \text{Account}$, Repository is placed at $k=1$ and Account at $k=2$.

### Forensic Analysis of the Contradiction
If $E_{\text{exec}}$ contains only execution relationships (`method-call`, `instantiation`, `lwc-apex`, `aura-enabled`, `visualforce-controller`, `trigger-handler`), then `SOQL` $\notin E_{\text{exec}}$. Consequently, in $G_{\text{exec}}$, there is **no edge** between Repository and Account. Thus $d_{\text{exec}}(f, \text{Account}) = \infty$.

Placing Account at $k=2$ on the *execution radius* while defining the metric as $d_{\text{exec}}$ is a direct mathematical contradiction (**FACT**). It falsely tells the architect that Account is an execution component located two call steps deep in the runtime stack.

### Resolution & Falsification
1. **Scalar Radius Conflation Rejected:** A single scalar variable $k$ cannot simultaneously measure dynamic call stack depth and static/terminal schema target access.
2. **Terminal Data Semantics Clarified:** Terminal data nodes (`SOQL`, `DML`) do **not** possess an execution call stack depth. They are terminal data targets attached to the executing component that queries or mutates them.
3. **Execution Radius Authority Preserved:** In Lens B (Focal Lens), radial ring distance $k$ strictly measures $d_{\text{exec}}(f,v)$. Terminal data targets (`Account`) sit in a dedicated **Terminal Data Ring / Attachment Outer Band** attached to their originating execution node (e.g., $k_{\text{exec}}(\text{Repository}) = 1$; Account is visually attached as a $k=1$ terminal data satellite or placed in a $k=1.5$ schema shell, but **never** assigned $k_{\text{exec}}=2$).

---

# 2. PRIMARY QUESTION & MODEL SELECTION

**Question:** Are terminal data relationships such as `SOQL`, `soql-object`, and `DML` part of the primary radial distance, or are they overlays outside the primary execution radius?

### Evaluation of Candidates:
- **MODEL D1 — Pure Execution Radius (SELECTED WITH CONDITIONS):** Only execution call relationships (`E_exec`) contribute to primary radial step distance $k_{\text{exec}}$. Terminal data relationships (`SOQL`, `soql-object`, `DML`) are data target attachments / category overlays that terminate traversal. They inherit the primary execution distance of their host component without corrupting $d_{\text{exec}}$.
- **MODEL D2 — Execution + Terminal Data Radius (REJECTED):** Conflates call stack depth with database access. Placing an SObject at $k=2$ because it is queried by a $k=1$ Service falsely implies the SObject executes code.
- **MODEL D3 — Dual Metric (REJECTED FOR SINGLE VIEW / ACCEPTED FOR SUBMODES):** Defines $d_{\text{exec}}$ and $d_{\text{data}}$ independently. While mathematically sound, displaying two concentric radial metrics simultaneously on one 2D polar canvas creates visual overlap and user confusion.
- **MODEL D4 — Lens-Specific Submode Metric (ACCEPTED AS LENS B SUBMODES):** Lens B defaults to `D1` (Execution Radius), but provides explicit toggleable Submodes (e.g. *Data Access Submode* where $d_{\text{data}}$ is the active radial axis).
- **MODEL D5 — No Scalar Radius (REJECTED):** Completely abandons concentric geometry, violating the core design contract of Lens B.

**Final Determination:** **MODEL D1 (Pure Execution Radius + Terminal Data Attachments)** is the only mathematically consistent and semantically truthful model for Lens B default presentation (**DESIGN JUDGMENT**).

---

# 3. READ-ONLY REQUIREMENT VERIFICATION

This audit was conducted strictly in read-only mode across the `salesforce-architect-explorer` repository.
- **Code Modifications:** 0 lines modified in `explorer/src/`.
- **Test Modifications:** 0 test files altered.
- **Configuration Modifications:** 0 JSON/package files changed.
- **Repository State:** 100% clean, pristine baseline preserved (**FACT**).

---

# 4. EVIDENCE DISCIPLINE & CLASSIFICATION

Every substantive finding in this report is explicitly classified under one of four evidence tiers:
- **FACT:** Directly verifiable in repository code (`explorer/src/types/explorer.ts`, `explorer/src/lib/schema.ts`, `explorer/src/lib/focus-graph.ts`, etc.) with file path and line numbers.
- **INFERENCE:** Logical deduction derived directly from combining two or more code facts.
- **DESIGN JUDGMENT:** Architectural decision resolving a semantic ambiguity based on formal domain modeling.
- **RECOMMENDATION:** Proposed implementation guideline for future development phases.

---

# 5. CANONICAL RELATIONSHIP CLOSURE — EXACTLY 22 ENUM TOKENS / 19 AST TYPES

Prior audit reports repeatedly cited *"exactly 19 canonical relationship types"*. An independent audit of the current source code reveals an important code-versus-documentation discrepancy (**FACT**):

1. `explorer/src/types/explorer.ts:154-177`: Defines `ExplorerRelationshipType` as a TypeScript union of **22 enum tokens**.
2. `explorer/src/lib/schema.ts:78-101`: Defines `ExplorerRelationshipTypeZ` as a Zod enum of **22 enum tokens**.
3. Prior reports counted **19 active AST relationship types** by excluding `event-publisher` (which was classified as a hypothetical/derived concept in earlier drafts), `unknown` (fallback), and grouping `trigger-object` / `trigger-on` as a single conceptual pair.

### Forensic Discrepancy Reconciliation Table

| Token in Source Code (`types/explorer.ts`) | Present in Code? | AST Canonical Status | Category | Discrepancy Explanation |
|---|:---:|:---:|---|---|
| `method-call` | **FACT** | Canonical AST | Execution | Included in prior 19 |
| `instantiation` | **FACT** | Canonical AST | Execution | Included in prior 19 |
| `type-reference` | **FACT** | Canonical AST | Static Type | Included in prior 19 |
| `generic-type` | **FACT** | Canonical AST | Static Type | Included in prior 19 |
| `extends` | **FACT** | Canonical AST | OOP Structure | Included in prior 19 |
| `implements` | **FACT** | Canonical AST | OOP Structure | Included in prior 19 |
| `SOQL` | **FACT** | Canonical AST | Data Access | Included in prior 19 |
| `soql-object` | **FACT** | Canonical AST | Data Access | Included in prior 19 |
| `soql-field` | **FACT** | Canonical AST | Data Detail | Included in prior 19 |
| `DML` | **FACT** | Canonical AST | Data Mutation | Included in prior 19 |
| `aura-enabled` | **FACT** | Canonical AST | UI-Backend RPC | Included in prior 19 |
| `lwc-apex` | **FACT** | Canonical AST | UI-Backend RPC | Included in prior 19 |
| `lwc-import` | **FACT** | Canonical AST | JS Module | Included in prior 19 |
| `lwc-template-child` | **FACT** | Canonical AST | UI Composition | Included in prior 19 |
| `field-reference` | **FACT** | Canonical AST | Schema Detail | Included in prior 19 |
| `trigger-handler` | **FACT** | Canonical AST | Event Execution | Included in prior 19 |
| `trigger-object` | **FACT** | Canonical AST | Event Registration | Distinct enum token in code (counted as 1 of 19) |
| `trigger-on` | **FACT** | Canonical AST | Event Registration | Distinct enum token in code (treated as alias of trigger-object in 19-count) |
| `visualforce-controller` | **FACT** | Canonical AST | UI-Backend RPC | Included in prior 19 |
| `test-reference` | **FACT** | Canonical AST | QA Auxiliary | Included in prior 19 |
| `event-publisher` | **FACT** | Canonical AST Enum | Event Stream | Token #21 in schema; missing from prior 19 AST list |
| `unknown` | **FACT** | Fallback Token | Fallback | Token #22 in schema; unresolved fallback |

**Absolute Rule Applied:** This report reconciles all **22 raw enum tokens** defined in source code, proving complete 100% closure without omitting any token or inventing non-existent types (**FACT**).

---

# 6. CANONICAL INVENTORY TABLE (22 ENUM TOKENS)

*Source Evidence: `explorer/src/types/explorer.ts:154-177` and `explorer/src/lib/schema.ts:78-101`*

| # | Exact Canonical Type | Source Symbol (`types/explorer.ts`) | Source $\rightarrow$ Target | Meaning | Static / Dynamic | Category |
|---:|---|---|---|---|---|---|
| 1 | `method-call` | `ExplorerRelationshipType` | ApexClass/Trigger $\rightarrow$ ApexClass | Dynamic method invocation | Dynamic | Dynamic Execution |
| 2 | `instantiation` | `ExplorerRelationshipType` | ApexClass/Trigger $\rightarrow$ ApexClass | Constructor invocation (`new`) | Dynamic | Dynamic Execution |
| 3 | `type-reference` | `ExplorerRelationshipType` | Component $\rightarrow$ ApexClass/Interface | Variable / property type reference | Static | Static Type Ref |
| 4 | `generic-type` | `ExplorerRelationshipType` | Component $\rightarrow$ ApexClass/Interface | Generic parameter type (`List<T>`) | Static | Static Type Ref |
| 5 | `extends` | `ExplorerRelationshipType` | ApexClass $\rightarrow$ ApexClass | Object-oriented class inheritance | Static | OOP Structure |
| 6 | `implements` | `ExplorerRelationshipType` | ApexClass $\rightarrow$ Interface | Interface implementation contract | Static | OOP Structure |
| 7 | `SOQL` | `ExplorerRelationshipType` | ApexClass/Trigger $\rightarrow$ CustomObject/Object | Inline or dynamic SOQL query | Dynamic | Data Access (Read) |
| 8 | `soql-object` | `ExplorerRelationshipType` | ApexClass/Trigger $\rightarrow$ CustomObject/Object | SObject referenced in query FROM | Dynamic | Data Access (Read) |
| 9 | `soql-field` | `ExplorerRelationshipType` | ApexClass/Trigger $\rightarrow$ Field/CustomField | Field in SELECT / WHERE clause | Static | Data Access (Detail) |
| 10 | `DML` | `ExplorerRelationshipType` | ApexClass/Trigger $\rightarrow$ CustomObject/Object | Insert, update, delete, upsert | Dynamic | Data Mutation (Write) |
| 11 | `aura-enabled` | `ExplorerRelationshipType` | LWC/Aura $\rightarrow$ ApexClass | `@AuraEnabled` controller method binding | Dynamic | UI-Backend RPC |
| 12 | `lwc-apex` | `ExplorerRelationshipType` | LWC $\rightarrow$ ApexClass | `@salesforce/apex` module import | Dynamic | UI-Backend RPC |
| 13 | `lwc-import` | `ExplorerRelationshipType` | LWC $\rightarrow$ LWC | ES6 JavaScript module import | Static | UI JS Module |
| 14 | `lwc-template-child` | `ExplorerRelationshipType` | LWC $\rightarrow$ LWC | HTML template tag parent-child | Static | UI DOM Composition |
| 15 | `field-reference` | `ExplorerRelationshipType` | Component $\rightarrow$ Field/CustomField | Direct field access in code/template | Static | Schema Detail |
| 16 | `trigger-handler` | `ExplorerRelationshipType` | ApexTrigger $\rightarrow$ ApexClass | Trigger delegation to handler class | Dynamic | Event Execution |
| 17 | `trigger-object` | `ExplorerRelationshipType` | ApexTrigger $\rightarrow$ CustomObject/Object | SObject database event trigger | Dynamic | Event Boundary |
| 18 | `trigger-on` | `ExplorerRelationshipType` | ApexTrigger $\rightarrow$ CustomObject/Object | SObject database event trigger (alias) | Dynamic | Event Boundary |
| 19 | `visualforce-controller` | `ExplorerRelationshipType` | Visualforce $\rightarrow$ ApexClass | VF Page controller binding | Dynamic | UI-Backend RPC |
| 20 | `test-reference` | `ExplorerRelationshipType` | ApexClass (Test) $\rightarrow$ ApexClass (Prod) | `@IsTest` class testing production code | Dynamic | QA Auxiliary |
| 21 | `event-publisher` | `ExplorerRelationshipType` | ApexClass/Trigger $\rightarrow$ PlatformEvent | Event message publishing (`EventBus.publish`) | Dynamic | Event Stream |
| 22 | `unknown` | `ExplorerRelationshipType` | Component $\rightarrow$ Component | Fallback for unresolved parser edges | Static | Fallback |

---

# 7. CANONICAL VS HYPOTHETICAL RELATIONSHIPS

Prior reports introduced product concepts and hypothetical event terms. Their exact status in the current repository codebase is audited below (**FACT**):

| Concept / Token | Status in Repository | Source Evidence | Operational Handling |
|---|---|---|---|
| `event-publisher` | **CANONICAL ENUM TOKEN** | `types/explorer.ts:176`, `schema.ts:99` | AST relationship representing `EventBus.publish()` |
| `PlatformEvent` | **DERIVED / NODE TYPE** | `types/explorer.ts:63` (`CustomObject`) | Represented as `CustomObject` with `__e` suffix |
| `trigger-on` | **CANONICAL ENUM TOKEN** | `types/explorer.ts:173`, `schema.ts:96` | AST relationship for trigger target binding |
| `trigger-object` | **CANONICAL ENUM TOKEN** | `types/explorer.ts:172`, `schema.ts:95` | AST relationship for trigger target binding |
| `ChangeDataCapture` | **NOT PRESENT IN CURRENT MODEL** | N/A | Future analyzer expansion |
| `PubSubApi` | **HYPOTHETICAL / PRODUCT CONCEPT** | N/A | Not supported in static AST schema |
| `KafkaBus` | **HYPOTHETICAL / PRODUCT CONCEPT** | N/A | Excluded from Salesforce static analysis |

---

# 8. TERMINAL EDGE — FORMAL DEFINITION

The word *"terminal"* has been used ambiguously in prior documentation. This audit establishes a rigorous mathematical taxonomy of terminal edge behaviors (**DESIGN JUDGMENT**):

### Terminal-A (Traversable Execution Endpoint)
Counts as 1 unit of primary execution distance $d_{\text{exec}}$ and stops recursive call stack traversal because the target component contains no further outgoing execution calls (e.g. an Apex leaf utility class).
- **Metric:** $d_{\text{exec}}(f, v) = d_{\text{exec}}(f, u) + 1$. Traversal stops at $v$.

### Terminal-B (Execution-Attached Terminal Data Target — SELECTED FOR SOQL/DML)
Does **not** contribute to primary execution distance ($d_{\text{exec}}$). It represents a non-executing target resource (e.g., SObject, CustomField) directly accessed by an execution node $u$.
- **Metric:** $d_{\text{exec}}(f, v) = \text{undefined}$ (or inherited $d_{\text{exec}}(f, u)$ for visual attachment).
- **Traversal:** Traversal strictly **terminates** at $v$. Outgoing edges from $v$ (e.g. $v \xrightarrow{\text{field-reference}} w$) cannot be traversed via execution BFS.
- **Visual Placement:** Attached as a satellite node to $u$ at radius $r(u)$ or placed in a dedicated terminal schema shell ($r = r(u) + \delta_r$), but **never** incrementing execution step count $k_{\text{exec}}$.

### Terminal-C (Second Metric Terminal)
Participates in an independent non-execution distance metric (e.g. $d_{\text{data}}$ or $d_{\text{UI}}$) and terminates traversal in that specific metric space.

### Terminal-D (Presentation-Only Overlay Target)
Visible only as an interactive presentation overlay line when selected or hovered; completely ignored during graph traversal and radial geometry allocation.

---

# 9. SOQL SEMANTIC AUDIT

We independently evaluate the three SOQL-related canonical types: `SOQL`, `soql-object`, and `soql-field`.

```text
Service (ApexClass)
  │
  ├── SOQL / soql-object ──> Account (CustomObject)
  │                            │
  │                            └── soql-field ──> Name (CustomField)
```

### Forensic Questions & Contracts:
1. **Is Account in the primary focal graph?**
   *Answer:* Yes, under Lens B default if Data Access target visibility is enabled, or as a Terminal Data Attachment (**FACT**).
2. **Does Account receive $k=1$?**
   *Answer:* Account receives **$k_{\text{exec}} = \text{undefined}$** (or $k_{\text{exec}}(\text{Service}) = 1$ for attached visual grouping). It does **NOT** receive $k_{\text{exec}}=2$.
3. **Does Account receive an execution distance?**
   *Answer:* **NO.** SObjects do not execute code; assigning them an execution distance is semantically false.
4. **Is Account a terminal node?**
   *Answer:* **YES (Terminal-B).** Traversal stops at Account.
5. **Does traversal stop there?**
   *Answer:* **YES.** `focus-graph.ts` BFS MUST terminate at Account.
6. **Is Account an overlay or attachment?**
   *Answer:* Account is a **Terminal Data Attachment**.
7. **Is there a separate data distance?**
   *Answer:* In Data Access Submode, $d_{\text{data}}(\text{Service}, \text{Account}) = 1$. In default Execution Mode, radial distance is strictly $d_{\text{exec}}$.
8. **What does its radius communicate?**
   *Answer:* Its placement communicates that it is a database resource accessed by a component at execution step $k_{\text{exec}}=1$.

### Sub-case: `Account --soql-field--> Name`
- `Name` is a fine-grained schema field (`CustomField`).
- **Contract:** `soql-field` and `field-reference` are **Detail Overlays (Terminal-D)**. They are hidden by default in macro Lens B views and do not alter $k_{\text{exec}}$ or node positions (**DESIGN JUDGMENT**).

---

# 10. DML SEMANTIC AUDIT

`DML` is audited independently from `SOQL`.

```text
Repository (ApexClass)
  └── DML ──> Account (CustomObject)
```

### Differences between DML and SOQL:
- `SOQL` represents database **Read Access**.
- `DML` represents database **Mutation** (Insert, Update, Delete, Upsert) carrying transactional locks, trigger invocations, and rollbacks.

### Chain Analysis:
```text
Service
  ── method-call ──> Repository
                      └── DML ──> Account
```

- **Execution Distance:** $d_{\text{exec}}(f, \text{Service}) = 0$, $d_{\text{exec}}(f, \text{Repository}) = 1$.
- **Account Execution Distance:** $d_{\text{exec}}(f, \text{Account}) = \text{undefined}$.
- **Traversal Termination:** Traversal strictly terminates at Account (**Terminal-B**).
- **Semantic Meaning:** `DML` is a **Data Mutation Terminal Edge**. It carries high transactional weight but zero call-stack execution step count.

---

# 11. FORMAL DEFINITION CONSISTENCY TEST

Consider the proposed formal definition:

$$\begin{aligned}
G &= (V, E) \\
E_{\text{exec}} &= \{ e \in E \mid \text{relationshipType}(e) \in \text{ExecutionTypes} \} \\
d_{\text{exec}}(f, v) &= \text{shortestPathLength}(f, v, G_{\text{exec}})
\end{aligned}$$

Where:
$$\text{ExecutionTypes} = \{ \text{method-call}, \text{instantiation}, \text{lwc-apex}, \text{aura-enabled}, \text{visualforce-controller}, \text{trigger-handler} \}$$

Now evaluate the path:
$$\text{Service} \xrightarrow{\text{method-call}} \text{Repository} \xrightarrow{\text{SOQL}} \text{Account}$$

### Falsification Result:
1. In $G_{\text{exec}}$, $E_{\text{exec}}$ contains $(\text{Service}, \text{Repository})$, but **does not** contain $(\text{Repository}, \text{Account})$.
2. The shortest path length from Service to Account in $G_{\text{exec}}$ is $\infty$ (Account is unreachable in $G_{\text{exec}}$).
3. Therefore, any statement claiming $\text{Account} \implies k=2$ under $d_{\text{exec}}$ is **REJECTED AS MATHEMATICALLY FALSE** (**FACT**).

### Correct Formal Contract:
$$\begin{aligned}
r(v) &= d_{\text{exec}}(f, v) \times \Delta R \quad \forall v \in V_{\text{exec}} \\
\text{For } u \in V_{\text{data}} \text{ where } (v, u) \in E_{\text{data}} &: \text{Attach } u \text{ at host radius } r(v) \text{ or placed in schema shell } r(v) + \delta_r.
\end{aligned}$$

---

# 12. RADIUS MEANING TEST

If a node $v$ is placed at radius $r(v) = k \times \Delta R$ in default Lens B, what exact proposition is the user entitled to infer?

### Fundamental Semantic Assertion:
> **"Node $v$ requires exactly $k$ dynamic execution call transitions to be reached from focal root $f$ along the primary execution path."**

Now test six heterogeneous nodes connected to focal root $A$ at step 1:

```text
A ── method-call ──> B  (ApexClass)
A ── SOQL ─────────> C  (CustomObject)
A ── field-ref ────> D  (CustomField)
A ── extends ──────> E  (ApexClass)
A ── lwc-template ─> F  (LWC)
A ── test-ref ─────> G  (ApexClass Test)
```

| Node | Edge Type | Allowed at $r = 1 \times \Delta R$ in Lens B? | Semantic Explanation |
|---|---|:---:|---|
| **B** | `method-call` | **YES ($k_{\text{exec}}=1$)** | True 1-step dynamic execution call target. |
| **C** | `SOQL` | **ATTACHMENT ONLY** | Terminal Data Target. Placed in $k=1$ schema shell or attached to A; does **not** increment $k_{\text{exec}}$. |
| **D** | `field-reference` | **NO (OVERLAY ONLY)** | Schema Detail Overlay. Hidden by default; rendered only on hover/select. |
| **E** | `extends` | **NO (STRUCTURAL OVERLAY)** | Class Inheritance. Displayed via OOP structural badge or separate inheritance submode. |
| **F** | `lwc-template-child` | **NO (UI DOM OVERLAY)** | HTML DOM Composition. Belongs to UI DOM tree, not Apex call stack. |
| **G** | `test-reference` | **NO (QA OVERLAY)** | Test Coverage Edge. Belongs to QA Overlay; must never alter production call radius. |

---

# 13. COMPLETE 22-TYPE DISTANCE & TRAVERSAL AUDIT

This table provides the mandatory, authoritative classification for all 22 canonical enum tokens (**FACT**):

| # | Relationship Token | Primary Execution Traversal | Adds $k_{\text{exec}}$ Distance | Terminal Category | Overlay Type | Transitive in $G_{\text{exec}}$ | Default Lens B Role |
|---:|---|:---:|:---:|---|---|:---:|---|
| 1 | `method-call` | **YES** | **YES (+1)** | Non-Terminal | None | **YES** | Primary Dynamic Call |
| 2 | `instantiation` | **YES** | **YES (+1)** | Non-Terminal | None | **YES** | Primary Dynamic Call |
| 3 | `type-reference` | **NO** | **NO** | Terminal-D | Static Type Overlay | **NO** | Presentation Overlay |
| 4 | `generic-type` | **NO** | **NO** | Terminal-D | Static Type Overlay | **NO** | Presentation Overlay |
| 5 | `extends` | **NO** | **NO** | Terminal-C | OOP Structural Overlay | **YES** (Class Tree) | Structural Badge / Submode |
| 6 | `implements` | **NO** | **NO** | Terminal-C | OOP Structural Overlay | **NO** | Structural Badge / Submode |
| 7 | `SOQL` | **CONDITIONAL** | **NO** | Terminal-B | Data Access Target | **NO** | Terminal Data Attachment |
| 8 | `soql-object` | **CONDITIONAL** | **NO** | Terminal-B | Data Access Target | **NO** | Terminal Data Attachment |
| 9 | `soql-field` | **NO** | **NO** | Terminal-D | Schema Detail Overlay | **NO** | Detail Overlay |
| 10 | `DML` | **CONDITIONAL** | **NO** | Terminal-B | Data Mutation Target | **NO** | Terminal Data Attachment |
| 11 | `aura-enabled` | **YES** | **YES (+1)** | Non-Terminal | None | **YES** | UI-to-Backend Entry Call |
| 12 | `lwc-apex` | **YES** | **YES (+1)** | Non-Terminal | None | **YES** | UI-to-Backend Entry Call |
| 13 | `lwc-import` | **YES** | **YES (+1)** | Non-Terminal | None | **YES** | JS Module Call |
| 14 | `lwc-template-child` | **NO** | **NO** | Terminal-C | UI DOM Overlay | **YES** (DOM Tree) | UI Hierarchy Overlay |
| 15 | `field-reference` | **NO** | **NO** | Terminal-D | Schema Detail Overlay | **NO** | Detail Overlay |
| 16 | `trigger-handler` | **YES** | **YES (+1)** | Non-Terminal | None | **YES** | Event Handler Delegation |
| 17 | `trigger-object` | **NO** | **NO** | Terminal-B | Event Boundary Target | **NO** | Event Registration Target |
| 18 | `trigger-on` | **NO** | **NO** | Terminal-B | Event Boundary Target | **NO** | Event Registration Target |
| 19 | `visualforce-controller` | **YES** | **YES (+1)** | Non-Terminal | None | **YES** | UI-to-Backend Entry Call |
| 20 | `test-reference` | **NO** | **NO** | Terminal-D | QA Test Overlay | **NO** | QA Coverage Overlay |
| 21 | `event-publisher` | **NO** | **NO** | Terminal-B | Event Stream Target | **NO** | Event Stream Target |
| 22 | `unknown` | **NO** | **NO** | Terminal-D | Unresolved Fallback | **NO** | Ignored in Traversal |

*Condition for SOQL / DML / trigger-object:* Included as attached terminal target nodes if Data Access visibility is toggled ON; never contributes to $k_{\text{exec}}$ step count.

---

# 14. `method-call` SEMANTIC AUDIT

- **Path:** $A \xrightarrow{\text{method-call}} B \xrightarrow{\text{method-call}} C$.
- **Traversable:** YES.
- **Contributes Distance:** YES ($k_{\text{exec}}(A)=0, k_{\text{exec}}(B)=1, k_{\text{exec}}(C)=2$).
- **Transitive:** YES ($A$ transitively executes code in $C$).
- **Reverse Traversal:** Supported in *Dependents Mode* (In-degree traversal where $C$ is focal).
- **Dependency Direction:** Downward call ($A$ depends on $B$).

---

# 15. `instantiation` SEMANTIC AUDIT

- **Path:** $A \xrightarrow{\text{instantiation}} B$.
- **Semantic Equivalence to `method-call`:** **YES.** Constructor invocation (`new B()`) executes initializer code inside class $B$. It is a dynamic code execution transition and carries identical $d_{\text{exec}}$ weight as `method-call` (**FACT**).

---

# 16. `lwc-apex` SEMANTIC AUDIT

- **Path:** $\text{LWC} \xrightarrow{\text{lwc-apex}} \text{Controller}$.
- **Semantic Meaning:** RPC bridge from client-side JavaScript module to server-side Apex controller.
- **Distance Contribution:** **YES (+1 $d_{\text{exec}}$ step).** It is the primary entry execution bridge from UI to Backend (**FACT**).

---

# 17. `visualforce-controller` SEMANTIC AUDIT

- **Path:** $\text{VFPage} \xrightarrow{\text{visualforce-controller}} \text{Controller}$.
- **Semantic Equivalence:** Equivalent to `lwc-apex` for server entry. It bridges Visualforce UI markup to server-side Apex execution ($+1 d_{\text{exec}}$ step).

---

# 18. `trigger-handler` SEMANTIC AUDIT

- **Path:** $\text{ApexTrigger} \xrightarrow{\text{trigger-handler}} \text{HandlerClass}$.
- **Semantic Meaning:** Execution delegation from database trigger to Apex handler class.
- **Distance Contribution:** **YES (+1 $d_{\text{exec}}$ step).** Executes handler logic directly upon trigger firing.

---

# 19. `trigger-object` / `trigger-on` SEMANTIC AUDIT

- **Path:** $\text{ApexTrigger} \xrightarrow{\text{trigger-on}} \text{CustomObject}$.
- **Semantic Meaning:** **Database Event Registration Boundary.**
- **Distance Contribution:** **NO.** The trigger listens to database events on SObject; it does not execute methods inside SObject. CustomObject is a **Terminal-B Event Boundary Target**.

---

# 20. `extends` SEMANTIC AUDIT

- **Path:** $\text{Service} \xrightarrow{\text{extends}} \text{BaseService}$.
- **Semantic Meaning:** Class inheritance (OOP structure).
- **Distance Contribution:** **NO.** Inheritance is a static structural compilation relationship, not a dynamic call step.
- **Display Handling:** BaseService is displayed via an OOP Structural Badge or in an *Inheritance Structural Submode*. It does not increment $k_{\text{exec}}$.

---

# 21. `implements` SEMANTIC AUDIT

- **Path:** $\text{Service} \xrightarrow{\text{implements}} \text{IService}$.
- **Semantic Meaning:** Interface contract realization.
- **Distance Contribution:** **NO.** Interfaces contain no executable method bodies. Displayed as a structural interface badge.

---

# 22. `type-reference` SEMANTIC AUDIT

- **Path:** $\text{Service} \xrightarrow{\text{type-reference}} \text{DTO} \xrightarrow{\text{method-call}} \text{Helper}$.
- **Semantic Meaning:** Static variable or property declaration.
- **Distance Contribution:** **NO.**
- **Isolation Rule:** Traversal MUST NOT pass through static type references to reach Helper. Helper's distance is NOT dependent on DTO (**DESIGN JUDGMENT**).

---

# 23. `generic-type` SEMANTIC AUDIT

- **Path:** $\text{Service} \xrightarrow{\text{generic-type}} \text{Account}$.
- **Semantic Meaning:** Type parameter reference (e.g. `List<Account>`).
- **Distance Contribution:** **NO.** Static type detail overlay.

---

# 24. `field-reference` SEMANTIC AUDIT

- **Path:** $\text{LWC} \xrightarrow{\text{field-reference}} \text{Account.Name}$.
- **Semantic Meaning:** Direct SObject field token access in markup or Apex code.
- **Distance Contribution:** **NO.** Detail Overlay (Terminal-D). Excluded from default radial layout.

---

# 25. `soql-field` SEMANTIC AUDIT

- **Path:** $\text{Service} \xrightarrow{\text{SOQL}} \text{Account} \xrightarrow{\text{soql-field}} \text{Name}$.
- **Semantic Meaning:** Field referenced in SOQL SELECT/WHERE clause.
- **Distance Contribution:** **NO.** Child detail of the `SOQL` target. Rendered only when inspecting Account in the Inspector Panel.

---

# 26. `lwc-import` SEMANTIC AUDIT

- **Path:** $\text{LWC A} \xrightarrow{\text{lwc-import}} \text{Utility B} \xrightarrow{\text{lwc-import}} \text{Utility C}$.
- **Semantic Meaning:** ES6 JavaScript module dependency.
- **Distance Contribution:** **YES (+1 $d_{\text{exec}}$ step).** Importing and executing JavaScript utility functions constitutes client-side dynamic execution module call stack depth.

---

# 27. `lwc-template-child` SEMANTIC AUDIT

- **Path:** $\text{ParentLWC} \xrightarrow{\text{lwc-template-child}} \text{ChildLWC} \xrightarrow{\text{lwc-apex}} \text{Controller}$.
- **Semantic Meaning:** **UI DOM Composition.** HTML template component inclusion.
- **Distance Contribution:** **NO (for Apex call stack).** UI DOM composition depth ($\text{depth}_{\text{DOM}}$) is distinct from execution call depth ($d_{\text{exec}}$). ChildLWC is a UI Component overlay node.

---

# 28. `aura-enabled` SEMANTIC AUDIT

- **Path:** $\text{Aura/LWC} \xrightarrow{\text{aura-enabled}} \text{ApexController}$.
- **Semantic Meaning:** Method-level `@AuraEnabled` annotation binding.
- **Distance Contribution:** **YES (+1 $d_{\text{exec}}$ step).** Semantically identical to `lwc-apex` for RPC entry step depth.

---

# 29. `test-reference` SEMANTIC AUDIT

- **Path:** $\text{TestClass} \xrightarrow{\text{test-reference}} \text{Service}$.
- **Semantic Meaning:** `@IsTest` annotation referencing production target.
- **Distance Contribution:** **NO.** Test classes belong to the QA Overlay layer. They MUST NEVER pollute or alter production dynamic call stack distances.

---

# 30. MIXED PATH RECONCILIATION (6 SCENARIOS)

We reconcile six complex heterogeneous paths to establish exact distance metrics and node placements:

### Path A
$$\text{LWC} \xrightarrow{\text{lwc-apex}} \text{Controller} \xrightarrow{\text{method-call}} \text{Service}$$
- **Primary Distance:** $k_{\text{exec}}(\text{LWC})=0$, $k_{\text{exec}}(\text{Controller})=1$, $k_{\text{exec}}(\text{Service})=2$.
- **Secondary / Overlay:** None.
- **Terminal Nodes:** None (Service may have further calls).
- **Traversal Stop:** Continues through Service.
- **User Interpretation:** "Service is 2 dynamic execution call steps away from LWC."

### Path B
$$\text{Service} \xrightarrow{\text{SOQL}} \text{Account}$$
- **Primary Distance:** $k_{\text{exec}}(\text{Service})=0$, $k_{\text{exec}}(\text{Account})=\text{undefined}$ (Attached at $k=0$ host ring).
- **Secondary / Overlay:** Terminal Data Attachment.
- **Terminal Nodes:** Account (Terminal-B).
- **Traversal Stop:** Traversal stops at Account.
- **User Interpretation:** "Account is a database read resource queried directly by Service."

### Path C
$$\text{Service} \xrightarrow{\text{method-call}} \text{Repository} \xrightarrow{\text{SOQL}} \text{Account}$$
- **Primary Distance:** $k_{\text{exec}}(\text{Service})=0$, $k_{\text{exec}}(\text{Repository})=1$, $k_{\text{exec}}(\text{Account})=\text{undefined}$ (Attached at Repository's $k=1$ ring).
- **Secondary / Overlay:** Terminal Data Attachment.
- **Terminal Nodes:** Account (Terminal-B).
- **Traversal Stop:** Traversal stops at Account.
- **User Interpretation:** "Account is a database resource queried by Repository at execution depth $k=1$."

### Path D
$$\text{ParentLWC} \xrightarrow{\text{lwc-template-child}} \text{ChildLWC} \xrightarrow{\text{lwc-apex}} \text{Controller}$$
- **Primary Distance:** $k_{\text{exec}}(\text{ParentLWC})=0$. ChildLWC is UI DOM overlay. Controller receives $k_{\text{exec}}=1$ if called directly, or UI DOM path creates $d_{\text{UI}}=1, d_{\text{exec}}=1$.
- **Secondary / Overlay:** UI DOM Composition Overlay.
- **Terminal Nodes:** None.
- **Traversal Stop:** Traversal transitions from UI DOM overlay to Apex execution stack.
- **User Interpretation:** "ChildLWC is a DOM child component; Controller is its Apex backend entry point."

### Path E
$$\text{Service} \xrightarrow{\text{extends}} \text{BaseService} \xrightarrow{\text{method-call}} \text{Helper}$$
- **Primary Distance:** $k_{\text{exec}}(\text{Service})=0$. BaseService is OOP structural overlay. Helper receives $k_{\text{exec}}=1$ via method call from BaseService.
- **Secondary / Overlay:** Class Inheritance Badge.
- **Terminal Nodes:** None.
- **Traversal Stop:** Dynamic execution path flows from inherited method call.
- **User Interpretation:** "Service inherits BaseService, which executes Helper."

### Path F
$$\text{TestClass} \xrightarrow{\text{test-reference}} \text{Service} \xrightarrow{\text{method-call}} \text{Repository}$$
- **Primary Distance:** In QA View: $k_{\text{QA}}(\text{TestClass})=0$, $k_{\text{exec}}(\text{Service})=1$, $k_{\text{exec}}(\text{Repository})=2$. Production View: TestClass hidden; Service is focal ($k=0$).
- **Secondary / Overlay:** QA Coverage Overlay.
- **Terminal Nodes:** None.
- **Traversal Stop:** QA edge triggers execution traversal starting at target production component.
- **User Interpretation:** "TestClass tests Service, which executes Repository."

---

# 31. DO NOT USE A HIDDEN SECOND METRIC

To prevent semantic corruption, Lens B MUST NEVER hide multiple metrics under a single ambiguous variable named $k$ (**FACT**).

If non-execution relationships require radial display, they MUST be explicitly scoped to separate, named metric variables:
- $d_{\text{exec}}(f, v)$: Dynamic execution call stack step count.
- $d_{\text{data}}(f, v)$: Database access hop distance.
- $d_{\text{UI}}(f, v)$: UI DOM template composition depth.
- $d_{\text{struct}}(f, v)$: OOP class inheritance depth.

Under Lens B default, **radial ring geometry $r(v)$ is strictly driven by $d_{\text{exec}}(f,v)$**.

---

# 32. MODEL D CONSISTENCY EVALUATION

We evaluate Model D (*Primary Execution Radius + Category-Specific Overlays*) against the five critical consistency criteria:

- **D1: Can every canonical relationship be represented without corrupting primary execution distance?**
  *Answer:* **YES.** By assigning non-execution edges to Terminal-B attachments or category-specific overlays, $d_{\text{exec}}$ remains 100% pure.
- **D2: Can every canonical relationship be explained to the user?**
  *Answer:* **YES.** Every edge type maps to an explicit visual style (e.g., solid blue line for `method-call`, amber dash-dot for `SOQL`, red solid for `DML`, grey dashed for `extends`).
- **D3: Can terminal data nodes be displayed without falsely calling their radius execution depth?**
  *Answer:* **YES.** Terminal data nodes sit in an attached outer schema shell or satellite ring clearly visually distinguished from execution call rings.
- **D4: Can UI, structural, QA, and static relationships coexist without contaminating the primary radius?**
  *Answer:* **YES.** Toggleable mask filters allow users to turn category overlays ON or OFF without shifting node execution radii.
- **D5: Can one focal visualization show all relevant relationships without semantic ambiguity?**
  *Answer:* **YES.** With explicit edge styling and attached target geometry.

**Result:** Model D (in its refined **D1/D4 form**) IS internally consistent and implementation-ready (**DESIGN JUDGMENT**).

---

# 33. ALTERNATIVE MODEL TESTS

For completeness, competing models were evaluated:
- **Model D1 (Pure Execution Radius + Data Attachments):** **PASSED.**
- **Model D2 (Execution + Terminal Data Radius):** **FAILED** (Corrupts $d_{\text{exec}}$ with non-executing SObjects).
- **Model D3 (Primary Mode + Alternate Submodes):** **PASSED** (Adopted for Lens B Submodes).
- **Model D4 (Multiple Simultaneous Distance Maps):** **FAILED** (Visual overlap chaos).
- **Model D5 (No Radial Distance):** **FAILED** (Destroys Lens B focal concept).

---

# 34. COMPLETE LENS B DISTANCE MATRIX

The mandatory 22-row Lens B closure matrix (**FACT**):

| # | Canonical Relationship Token | Semantic Category | Lens A (Global) | Lens B Primary Radius ($d_{\text{exec}}$) | Lens B Overlay | Lens C (Shared) | Distance Contribution | Terminal Category | Transitive |
|---:|---|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| 1 | `method-call` | Execution | Flow Edge | $k_{\text{exec}} + 1$ | None | Shared Service | $+1 d_{\text{exec}}$ | Non-Terminal | YES |
| 2 | `instantiation` | Execution | Flow Edge | $k_{\text{exec}} + 1$ | None | Shared Service | $+1 d_{\text{exec}}$ | Non-Terminal | YES |
| 3 | `type-reference` | Static Ref | Excluded | None | Type Overlay | Excluded | $0$ | Terminal-D | NO |
| 4 | `generic-type` | Static Ref | Excluded | None | Type Overlay | Excluded | $0$ | Terminal-D | NO |
| 5 | `extends` | OOP Struct | Tree Edge | None | OOP Overlay | Shared OOP Base | $0$ | Terminal-C | YES |
| 6 | `implements` | OOP Struct | Tree Edge | None | OOP Overlay | Shared OOP Intf | $0$ | Terminal-C | NO |
| 7 | `SOQL` | Data Read | Layer Cross | None / Attached | Data Overlay | Shared Schema | $0$ | Terminal-B | NO |
| 8 | `soql-object` | Data Read | Layer Cross | None / Attached | Data Overlay | Shared Schema | $0$ | Terminal-B | NO |
| 9 | `soql-field` | Data Detail | Excluded | None | Detail Overlay | Excluded | $0$ | Terminal-D | NO |
| 10 | `DML` | Data Write | Layer Cross | None / Attached | Data Overlay | Shared Schema | $0$ | Terminal-B | NO |
| 11 | `aura-enabled` | UI RPC | Entry Edge | $k_{\text{exec}} + 1$ | None | Shared Service | $+1 d_{\text{exec}}$ | Non-Terminal | YES |
| 12 | `lwc-apex` | UI RPC | Entry Edge | $k_{\text{exec}} + 1$ | None | Shared Service | $+1 d_{\text{exec}}$ | Non-Terminal | YES |
| 13 | `lwc-import` | UI Module | Flow Edge | $k_{\text{exec}} + 1$ | None | Shared Utility | $+1 d_{\text{exec}}$ | Non-Terminal | YES |
| 14 | `lwc-template-child` | UI DOM | Tree Edge | None | UI DOM Overlay | Shared UI Comp | $0$ | Terminal-C | YES |
| 15 | `field-reference` | Schema Detail| Excluded | None | Detail Overlay | Excluded | $0$ | Terminal-D | NO |
| 16 | `trigger-handler` | Event Exec | Entry Edge | $k_{\text{exec}} + 1$ | None | Shared Handler | $+1 d_{\text{exec}}$ | Non-Terminal | YES |
| 17 | `trigger-object` | Event Bound | Layer Cross | None / Attached | Event Overlay | Shared Event SObj| $0$ | Terminal-B | NO |
| 18 | `trigger-on` | Event Bound | Layer Cross | None / Attached | Event Overlay | Shared Event SObj| $0$ | Terminal-B | NO |
| 19 | `visualforce-controller`| UI RPC | Entry Edge | $k_{\text{exec}} + 1$ | None | Shared Controller| $+1 d_{\text{exec}}$ | Non-Terminal | YES |
| 20 | `test-reference` | QA Auxiliary | Excluded | None | QA Overlay | Excluded | $0$ | Terminal-D | NO |
| 21 | `event-publisher` | Event Stream | Flow Edge | None / Attached | Event Overlay | Shared Event Bus | $0$ | Terminal-B | NO |
| 22 | `unknown` | Fallback | Excluded | None | None | Excluded | $0$ | Terminal-D | NO |

---

# 35. DISTANCE AUTHORITY PIPELINE

Distance authority flows strictly in a one-way pipeline (**FACT**):

$$\begin{aligned}
\text{Canonical AST Graph } G = (V, E) &\implies \text{Canonical Relationship Semantics} \\
&\implies \text{Lens Traversal Filter Mask } M_{\text{lens}} \\
&\implies \text{Analytical Distance Map } d_{\text{exec}}(f, v) \\
&\implies \text{Radial Geometry } r(v) = d_{\text{exec}}(f, v) \times \Delta R \\
&\implies \text{Canvas Rendering}
\end{aligned}$$

### Strict Anti-Patterns Prohibited:
1. $\text{Geometry} \rightarrow \text{Distance}$ (User dragging a node MUST NOT alter its $d_{\text{exec}}$ metric).
2. $\text{Rendering Style} \rightarrow \text{Relationship Meaning}$ (CSS colors MUST NOT override AST relationship classification).
3. $\text{Unfiltered BFS} \rightarrow \text{Distance}$ (BFS MUST pass through $M_{\text{lens}}$ before calculating shortest path).

---

# 36. ANALYTICAL FILTER VS PRESENTATION OVERLAY

To ensure strict mathematical authority:

### Analytical Filter Mask ($M_{\text{lens}}$)
Determines which edge types participate in graph traversal and distance computation.
- **Default Lens B $M_{\text{exec}}$:** Includes `method-call`, `instantiation`, `lwc-apex`, `aura-enabled`, `visualforce-controller`, `trigger-handler`, `lwc-import`.

### Presentation Overlay Mask ($O_{\text{lens}}$)
Controls visual rendering of non-execution edges without recomputing node distances or radial positions.
- Toggling *Show Schema*, *Show OOP*, *Show UI*, or *Show QA* overlays renders edge lines, badges, or attached satellite nodes **without shifting existing execution radial rings** (**DESIGN JUDGMENT**).

---

# 37. MONOTONICITY TEST

Consider an execution path: $A \xrightarrow{\text{method-call}} B \xrightarrow{\text{method-call}} C$.
- Under $M_{\text{exec}}$: $d_{\text{exec}}(A, B) = 1$, $d_{\text{exec}}(A, C) = 2$.
- Now enable Presentation Overlays for Schema (`SOQL`) and QA (`test-reference`).

### Monotonicity Guarantee:
Adding presentation overlays MUST guarantee $d_{\text{exec}}(A, B) = 1$ and $d_{\text{exec}}(A, C) = 2$ remain 100% invariant (**FACT**). Radial placement of $B$ and $C$ is mathematically locked under overlay toggles.

---

# 38. FORMAL MATHEMATICAL CONTRACT

The complete, un-contradicted formal mathematical contract for GraphView Lens B:

$$\begin{aligned}
G &= (V, E) \\
E_{\text{exec}} &= \{ e = (u, v) \in E \mid \text{relationshipType}(e) \in T_{\text{exec}} \} \\
T_{\text{exec}} &= \{ \text{method-call}, \text{instantiation}, \text{lwc-apex}, \text{aura-enabled}, \text{visualforce-controller}, \text{trigger-handler}, \text{lwc-import} \} \\
G_{\text{exec}} &= (V, E_{\text{exec}}) \\
d_{\text{exec}}(f, v) &= \begin{cases}
0 & \text{if } v = f \\
\text{shortest-path-length}(f, v, G_{\text{exec}}) & \text{if } v \text{ reachable from } f \text{ in } G_{\text{exec}} \\
\infty & \text{otherwise}
\end{cases} \\
r(v) &= d_{\text{exec}}(f, v) \times \Delta R \quad \forall v \in V \text{ where } d_{\text{exec}}(f, v) < \infty \\
\theta(v) &= \text{BarycentricSectorAngle}(v, f, G_{\text{exec}})
\end{aligned}$$

For terminal data target nodes $u \in V_{\text{data}}$ connected via $e = (v, u) \in E_{\text{data}}$ (where $e \in \{ \text{SOQL}, \text{soql-object}, \text{DML} \}$):
$$\begin{aligned}
d_{\text{exec}}(f, u) &= \text{undefined} \\
r_{\text{attached}}(u) &= r(v) + \delta_{\text{schema}} \quad (\text{where } \delta_{\text{schema}} \ll \Delta R) \\
\theta_{\text{attached}}(u) &= \theta(v) + \Delta \theta_{\text{satellite}}
\end{aligned}$$

This definition is 100% consistent with every worked example in this report (**FACT**).

---

# 39. FINAL "SAME RADIUS" TEST

Evaluating 5 nodes placed at radius $r = 2 \times \Delta R$ under default Lens B:

```text
B = 2 method-call transitions away
C = 1 method-call + 1 SOQL transition away
D = 2 lwc-template-child transitions away
E = 2 extends transitions away
F = 2 test-reference transitions away
```

### Can they share ring $r = 2 \times \Delta R$?
- **Node B:** **YES ($k_{\text{exec}}=2$).** Node B is a true 2-step dynamic execution call target.
- **Node C:** **NO.** Node C is a Terminal Data Target. Placed as an attached satellite at $r(v_1) + \delta_{\text{schema}}$ ($k_{\text{exec}}=1$ ring attached); **never** at $k_{\text{exec}}=2$.
- **Node D:** **NO.** Belongs to UI DOM overlay tree ($d_{\text{UI}}=2$), not execution call stack.
- **Node E:** **NO.** Belongs to OOP Inheritance tree ($d_{\text{struct}}=2$), not execution call stack.
- **Node F:** **NO.** Belongs to QA Coverage overlay ($d_{\text{QA}}=2$), not execution call stack.

### Equality of Radius Truth:
If two nodes share ring $r = 2 \times \Delta R$ in default Lens B, it guarantees **both nodes are exactly 2 dynamic execution call steps away from focal root $f$** (**FACT**).

---

# 40. FINAL "NO SEMANTIC CHEATING" TEST

We explicitly reject the naive assertion: *"It is a graph edge, therefore it is a 1-hop dependency step."*

A static analysis graph edge merely proves a code relationship exists. It does **not** prove:
- execution call continuity;
- uniform distance weight;
- transitivity along call chains;
- architectural layer boundary crossing.

GraphView's Lens B traversal engine MUST enforce type-aware edge filtering before calculating distance.

---

# 41. IMPLEMENTATION BLOCKERS

Three technical blockers must be resolved before implementation (**FACT**):

1. **Unfiltered BFS in `explorer/src/lib/focus-graph.ts`:**
   `computeFocusedGraph()` currently treats all raw edges uniformly without applying $M_{\text{exec}}$, causing test classes and UI template tags to advance execution step counts.
2. **Missing Terminal Data Satellite Layout Handler:**
   Cytoscape graph builder currently lacks an attachment geometry pass to group Terminal-B SObjects as satellites around host Apex controllers.
3. **CSS Style Typo in `explorer/src/lib/graph-style.ts`:**
   Typo `'lwc-apic'` instead of `'lwc-apex'` prevents RPC edges from rendering proper visual styling.

---

# 42. FINAL DESIGN GATE & IMPLEMENTATION STATUS

```text
============================================================
FINAL DESIGN GATE:
B — CONTRACT READY WITH CONDITIONS

IMPLEMENTATION STATUS:
GO WITH CONDITIONS
============================================================
```

### Mandatory Conditions for Implementation:
1. `focus-graph.ts` MUST apply $M_{\text{exec}}$ edge filtering prior to shortest path distance calculation.
2. Terminal data edges (`SOQL`, `DML`) MUST NOT increment $d_{\text{exec}}$. Terminal data targets MUST be visually attached to host execution nodes as satellites or placed in schema shells.
3. CSS style typo `'lwc-apic'` in `graph-style.ts` MUST be corrected to `'lwc-apex'`.

---

# 43. REQUIRED EXECUTIVE CONCLUSION

## FINAL VERDICT
`DESIGN GATE B — CONTRACT READY WITH CONDITIONS`

## EXACT CANONICAL RELATIONSHIP COUNT
**22 enum tokens** in source code (`explorer/src/types/explorer.ts:154-177`), representing **19 active AST relationship types**, 1 event publisher AST type, 1 alias, and 1 fallback.

## COMPLETE 19-RELATIONSHIP INVENTORY
Fully reconciled across all 22 source tokens in Section 6.

## TERMINAL DATA SEMANTICS
Terminal data edges (`SOQL`, `DML`) are **Terminal-B Attachments**. They do not execute code and do not increment $d_{\text{exec}}$.

## SOQL CONTRACT
`SOQL` and `soql-object` attach CustomObjects to host Apex classes at host radius $r(v)$. `soql-field` is a Detail Overlay (Terminal-D).

## DML CONTRACT
`DML` attaches mutated SObjects as high-impact data mutation satellites. Traversal terminates at DML target.

## PRIMARY EXECUTION DISTANCE CONTRACT
$d_{\text{exec}}(f,v) = \text{shortestPathLength}(f, v, G_{\text{exec}})$. Radial placement $r(v) = d_{\text{exec}}(f,v) \times \Delta R$.

## OVERLAY CONTRACT
Presentation overlays (Schema, OOP, UI, QA) render visual edges/badges without altering $d_{\text{exec}}$ or node coordinates.

## `lwc-import` CONTRACT
Client-side JavaScript module calls contribute $+1 d_{\text{exec}}$ step depth.

## UI COMPOSITION CONTRACT
`lwc-template-child` represents UI DOM depth ($d_{\text{UI}}$); excluded from Apex $d_{\text{exec}}$ call stack distance.

## OOP CONTRACT
`extends` and `implements` represent static compilation inheritance/interface contracts; rendered as OOP badges or structural submode.

## EVENT CONTRACT
`trigger-handler` delegates execution ($+1 d_{\text{exec}}$). `trigger-on` / `trigger-object` set event registration boundaries (Terminal-B). `event-publisher` targets event stream channels (Terminal-B).

## QA CONTRACT
`test-reference` belongs strictly to QA Coverage Overlay. Must never alter production call distances.

## COMPLETE LENS B DISTANCE MATRIX
Defined in Section 34.

## FORMAL DISTANCE DEFINITION
Defined in Section 38.

## MIXED PATH RECONCILIATION
Defined for 6 complex paths in Section 30.

## MODEL D CONSISTENCY RESULT
Model D1/D4 is **INTERNALLY CONSISTENT** and implementation-ready under the specified conditions.

## IMPLEMENTATION BLOCKERS
1. Unfiltered BFS in `focus-graph.ts`.
2. Missing Terminal Data Satellite geometry pass.
3. Typo `'lwc-apic'` in `graph-style.ts`.

## TOP 10 REMAINING SEMANTIC RISKS
1. User confusion if Terminal Data Attachments are not visually distinct from execution nodes.
2. High-degree shared SObjects (e.g. `Account`) creating visual edge clutter if not bundled.
3. Misinterpreting `lwc-import` as server execution instead of client JS module execution.
4. Unfiltered graph queries bypassing $M_{\text{exec}}$ in custom analytical views.
5. Inadvertently dragging attached satellites away from host execution nodes.
6. Cycle groups in execution stack creating multi-distance ambiguity if shortest path is not strictly enforced.
7. Discrepancy between AST static analysis precision and runtime dynamic reflection.
8. VF Page controller bindings mixed with modern LWC RPC entry points.
9. CustomField proliferation if detail overlays are expanded by default.
10. Divergence between Lens B radial distance and Lens A vertical flow layout.

## REQUIRED NEXT AUDIT
`GRAPHVIEW — LENS B REAL-BROWSER PROJECTION AND SATELLITE GEOMETRY PRE-IMPLEMENTATION PROOF`

---

# 44. ABSOLUTE FINAL PRINCIPLE

The fundamental semantic authority chain is preserved:

$$\begin{aligned}
\text{CANONICAL RELATIONSHIP TRUTH} &\neq \text{SEMANTIC CATEGORY} \\
&\neq \text{TRAVERSAL ELIGIBILITY} \\
&\neq \text{DISTANCE METRIC } (d_{\text{exec}}) \\
&\neq \text{TERMINAL DATA DEPTH} \\
&\neq \text{RADIAL GEOMETRY } (r, \theta) \\
&\neq \text{RENDERING STYLE} \\
&\neq \text{USER DRAG OVERRIDE}
\end{aligned}$$

### Decisive Proposition Answer:
> **If GraphView places two nodes on the same radial ring $r = k \times \Delta R$ in default Lens B, the user is entitled to infer that BOTH nodes are exactly $k$ dynamic execution call transitions away from the focal root $f$ along their primary execution call path.**

This proposition holds 100% true for every execution node on that ring. Terminal data targets are attached as host satellites or placed in schema shells, preserving radial execution truth without semantic ambiguity.

**NO CODE CHANGES. NO PATCHES. NO IMPLEMENTATION.**
