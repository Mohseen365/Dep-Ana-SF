# GRAPHVIEW — LENS RELATIONSHIP INCLUSION + TRAVERSAL SEMANTICS FINAL CONTRACT AUDIT
## ADVERSARIAL VALIDATION OF LENS A / B / C RELATIONSHIP PROJECTION
### READ ONLY — NO CODE CHANGES — NO PATCHES — NO IMPLEMENTATION

---

## 0. EXECUTIVE PURPOSE & VERDICT

This adversarial audit evaluates the lens relationship inclusion rules, traversal semantics, and multi-edge contracts for GraphView across its three primary analytical lenses:

1. **Lens A — Global Architecture Flow Map:** $Y = \text{Derived Layer} \times X = \text{Derived Subsystem Domain}$.
2. **Lens B — Focal Dependency Neighborhood:** Radial $k$-hop transitive neighborhood around a selected focus node.
3. **Lens C — Shared Infrastructure Topology:** Multi-root shared dependency centroid topology.

### **OVERALL DESIGN GATE: B — CONTRACT READY WITH CONDITIONS**
### **IMPLEMENTATION STATUS: BLOCKED** (until category-filtered traversal masks and lens projection contracts are frozen).

---

## 1. THREE LENSES UNDER AUDIT

- **Lens A (Global Architecture Flow Map):** Only execution calls, entry-point RPCs, and data mutations legitimately communicate macro call-stack execution flow across layers and domains.
- **Lens B (Focal Dependency Neighborhood):** Traversal distance ($r = k \cdot \Delta R$) is semantically truthful ONLY if the traversed edge set is filtered to a coherent semantic category (e.g. Execution Call Chain vs Schema Structure).
- **Lens C (Shared Infrastructure Topology):** Multi-root sharing MUST explicitly distinguish **Shared Runtime Services**, **Shared Database Schema**, and **Shared OOP Base Classes**.

---

## 2. ABSOLUTE AUDIT RULES

- **READ ONLY:** Zero source code files, configuration files, or tests were modified (`git status` clean).
- All conclusions are derived from direct codebase inspection of `explorer/src/lib/focus-graph.ts`, `explorer/src/lib/ordering.ts`, `explorer/src/lib/local-layout.ts`, `explorer/src/lib/graph-builder.ts`, `explorer/src/lib/graph-style.ts`, and `explorer/src/lib/adapters/component-constellation-adapter.ts`.

---

## 3. EVIDENCE CLASSIFICATION

Substantive findings are classified as:
- **FACT:** Demonstrated directly by file paths and code lines.
- **INFERENCE:** Deduced logically from multiple codebase facts.
- **DESIGN JUDGMENT:** Architectural product semantic boundary.
- **RECOMMENDATION:** Proposed contract specification.

---

## 4. RECONSTRUCT THE CANONICAL EDGE MODEL

*Source Reference: `explorer/src/types/explorer.ts:162-182`*

The repository defines exactly **19 canonical relationship types**:

1. `method-call` — Dynamic Apex-to-Apex method execution.
2. `instantiation` — Dynamic object construction (`new`).
3. `type-reference` — Static field or variable declaration reference.
4. `generic-type` — Generic type parameter (e.g., `Map<Id, Account>`).
5. `extends` — Class inheritance (`SubClass extends BaseClass`).
6. `implements` — Interface implementation (`Class implements IContract`).
7. `SOQL` — Inline/dynamic SOQL query string in Apex.
8. `soql-object` — CustomObject referenced in SOQL query.
9. `soql-field` — CustomField referenced in SOQL SELECT/WHERE.
10. `DML` — Database insert/update/delete/upsert operation.
11. `aura-enabled` — `@AuraEnabled` server Apex method called by UI.
12. `lwc-apex` — `@salesforce/apex` controller method import in LWC JS.
13. `lwc-import` — JS module import between LWC utilities.
14. `lwc-template-child` — Parent-to-child HTML template tag inclusion.
15. `field-reference` — Direct field usage in LWC template or Apex.
16. `trigger-handler` — Trigger delegating event handling to Apex Class.
17. `trigger-object` / `trigger-on` — Database trigger bound to SObject.
18. `visualforce-controller` — VF Page bound to Apex Controller.
19. `test-reference` — `@IsTest` method referencing production code.

---

## 5. THE CRITICAL QUESTION (EDGE MEANING TEST)

When $A \rightarrow B$ exists in the canonical graph:
- `A --method-call--> B`: A executes behavior implemented by B.
- `A --field-reference--> B`: A statically references field B (No dynamic execution call).
- `A --extends--> B`: A inherits structural code from B (Construction/OOP dependency).
- `A --trigger-on--> B`: A registers an asynchronous event listener on database mutations of B.

**Conclusion (FACT):** Treating `field-reference`, `extends`, `trigger-on`, and `method-call` as the same kind of "dependency" creates severe semantic conflation.

---

## 6. FINAL SEMANTIC CATEGORY MODEL

The 19 relationship types map to a 2-dimensional semantic taxonomy:

```text
DIMENSION 1: FUNCTIONAL CATEGORY
 ├── EXECUTION CALLS     → method-call, instantiation, lwc-apex, aura-enabled, visualforce-controller
 ├── DATA ACCESS         → SOQL, soql-object, DML
 ├── OOP STRUCTURE       → extends, implements
 ├── UI DOM COMPOSITION  → lwc-template-child, lwc-import
 ├── EVENT / ASYNCHRONOUS→ trigger-handler, trigger-object, trigger-on
 ├── STATIC TYPE REF     → type-reference, generic-type, field-reference, soql-field
 └── QUALITY ASSURANCE   → test-reference

DIMENSION 2: RUNTIME PHASE
 ├── DYNAMIC RUNTIME     → method-call, lwc-apex, SOQL, DML, trigger-handler
 ├── STATIC COMPILATION  → type-reference, extends, implements, field-reference
 └── TEST AUXILIARY      → test-reference
```

---

## 7. LENS A — GLOBAL FLOW FALSIFICATION

| Relationship Type | Primary Flow | Secondary Overlay | Excluded | Rationale |
|---|:---:|:---:|:---:|---|
| `method-call` | **YES** | | | Primary execution call stack |
| `lwc-apex` | **YES** | | | UI-to-Backend RPC entry call |
| `visualforce-controller` | **YES** | | | VF-to-Backend RPC entry call |
| `trigger-handler` | **YES** | | | DB Event-to-Handler execution call |
| `SOQL` / `soql-object` | **YES** | | | Application-to-Schema read access |
| `DML` | **YES** | | | Application-to-Schema write access |
| `extends` | | **YES** | | OOP inheritance hierarchy overlay |
| `implements` | | **YES** | | Interface contract overlay |
| `lwc-template-child` | | | **YES** | Local UI DOM tree detail |
| `field-reference` / `soql-field` | | | **YES** | Fine-grained field metadata noise |
| `test-reference` | | | **YES** | QA coverage (Available as QA toggle) |

---

## 8. CHALLENGE `extends`

`ServiceA --extends--> BaseService` represents **structural OOP code reuse**, NOT dynamic execution call flow.
- **Global Flow Impact:** Should NOT be placed as a primary vertical call-stack arrow. It is rendered as a **Secondary Dotted Green Overlay** when OOP hierarchy view is toggled ON.

---

## 9. CHALLENGE `implements`

`ServiceA --implements--> IService` represents a **static compile-time contract binding**.
- Interface nodes are non-executable contract boundaries. `implements` MUST NOT drive vertical call-stack layer positioning or BFS hop distance.

---

## 10. CHALLENGE `instantiation`

`ClassA --instantiation--> ClassB` (`new ClassB()`) creates a runtime object instance.
- It is a **Lifecycle / Execution Dependency** and participates in Lens A and Lens B as a valid 1-hop execution step.

---

## 11. CHALLENGE SOQL

`ApexClass --SOQL--> CustomObject` represents **Database Read Access**, NOT a method call.
- In Lens A: Included as an Application-to-Schema layer boundary crossing.
- Visual style: **Dash-Dot Amber Line** (`#f59e0b`) to distinguish data queries from method calls (`#64748b`).

---

## 12. CHALLENGE DML

`ApexClass --DML--> CustomObject` represents **Database Mutation (Write/Delete)**.
- DML carries higher transactional impact than SOQL.
- Visual style: **Solid Red Line** (`#ef4444`).

---

## 13. CHALLENGE SCHEMA REFERENCES

In a path:
$$\text{LWC} \xrightarrow{\text{lwc-apex}} \text{Controller} \xrightarrow{\text{soql-object}} \text{CustomObject} \xrightarrow{\text{field-reference}} \text{CustomField}$$
- `CustomField` at $r=3$ hops from LWC is fine-grained schema detail.
- **Contract:** Schema field references (`field-reference`, `soql-field`) MUST be toggleable detail overlays, excluded from default macro BFS traversal.

---

## 14. CHALLENGE UI COMPOSITION

`ParentLWC --lwc-template-child--> ChildLWC` represents **UI DOM Component Nesting**.
- It belongs to Lens B when analyzing UI tree structure, but MUST be excluded from Lens A Global Architecture Flow.

---

## 15. CHALLENGE EVENT RELATIONSHIPS

`CustomObject \xleftarrow{\text{trigger-on}} ApexTrigger \xrightarrow{\text{trigger-handler}} Handler`
- `trigger-on` represents a **Database Event Subscription** (asynchronous registration).
- It MUST be styled as a **Dashed Purple Event Line** (`#8b5cf6`), distinguishing event subscriptions from synchronous method calls.

---

## 16. CHALLENGE TEST RELATIONSHIPS

`TestClass --test-reference--> ProdClass`
- **Scenario:** `TestA` and `TestB` both test `ServiceA`. Does `ServiceA` become "Shared Runtime Infrastructure"?
- **Answer (FACT):** NO. `ServiceA` is a **Shared Test Target**, NOT a shared production runtime service. Test edges MUST be excluded from Lens C runtime calculations.

---

## 17. LENS B — DEFINE WHAT ONE HOP MEANS

**Current Implementation Failure (FACT):**
In `explorer/src/lib/focus-graph.ts:123`, BFS traverses `edges` without checking `relationshipType`. Model 1 ("Every relationship = 1 hop") is currently running, mixing UI DOM tags, field references, and method calls into a single hop metric!

**Contract Specification (Model 3 - Category-Filtered Traversal):**
> **In Focal Dependency Neighborhood (Lens B), ONE HOP means 1 transitive step along edges matching the ACTIVE ANALYTICAL FILTER MASK (default: Execution Calls + Data Access).**

---

## 18. FOCAL TRAVERSAL DIRECTION

For canonical edge $A \rightarrow B$:
- `dependencies(A)`: Outgoing edges ($A \rightarrow B$). "What does A require?"
- `dependents(A)`: Incoming edges ($B \leftarrow A$). "What relies on A?"
- `both(A)`: $u \rightarrow v$ OR $v \rightarrow u$.

**Reversal Safety Rule:** Reversing `A --extends--> B` yields `Subclasses of B` (Inheritance Tree), NOT "Components calling B". The UI MUST explicitly label reversed structural traversals.

---

## 19. TRANSITIVITY AUDIT

- **Transitive (Safe for Multi-Hop BFS):** `method-call`, `instantiation`, `lwc-apex`, `trigger-handler`, `lwc-import`.
- **Non-Transitive (1-Hop Terminal Leaves):** `SOQL`, `DML`, `field-reference`, `soql-field`, `implements`.
- **Conditionally Transitive:** `extends` (Transitive only along class inheritance hierarchies).

---

## 20. MIXED PATH SEMANTICS (15 HETEROGENEOUS PATHS)

1. `LWC -> lwc-apex -> Controller -> method-call -> Service`: **Valid 2-Hop Dynamic Execution Path**.
2. `Controller -> SOQL -> CustomObject -> field-reference -> CustomField`: **1-Hop Execution + 2-Hop Schema Detail**.
3. `ParentLWC -> lwc-template-child -> ChildLWC -> lwc-apex -> Controller`: **1-Hop UI DOM + 1-Hop RPC Call**.
4. `Trigger -> trigger-handler -> Handler -> method-call -> Service`: **Valid 2-Hop Event Execution Path**.
5. `CustomObject <- trigger-on <- Trigger`: **Database Event Registration (Non-Execution Call)**.
6. `TestClass -> test-reference -> ServiceA -> method-call -> ServiceB`: **1-Hop QA Target + 1-Hop Execution Call**.
7. `ClassA -> extends -> BaseClass -> method-call -> Helper`: **1-Hop OOP Inheritance + 1-Hop Execution Call**.
8. `ClassA -> type-reference -> DTO -> field-reference -> CustomField`: **Static Type Reference Chain**.
9. `LWC -> field-reference -> CustomField -> field-reference -> CustomObject`: **Static Schema Reference**.
10. `Flow -> method-call -> InvocableApex -> SOQL -> SObject`: **Valid Flow Execution Path**.
11. `VFPage -> visualforce-controller -> Controller -> DML -> SObject`: **Valid VF Execution Path**.
12. `ServiceA -> method-call -> ServiceB -> method-call -> ServiceA`: **2-Hop Cyclic Execution Path**.
13. `LWC -> lwc-import -> UtilityJS`: **1-Hop Static JS Module Import**.
14. `ClassA -> implements -> InterfaceB <- implements <- ClassC`: **Interface Contract Coupling**.
15. `Publisher -> event-publisher -> PlatformEvent -> trigger-on -> ConsumerTrigger`: **Asynchronous Event Stream Path**.

---

## 21. LENS C — SHARED INFRASTRUCTURE DEFINITION

| Relationship Type | Shared Runtime | Shared Schema | Shared OOP | Shared UI | Shared Event | Shared Test |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| `method-call` / `lwc-apex` | **YES** | NO | NO | NO | NO | NO |
| `SOQL` / `DML` | NO | **YES** | NO | NO | NO | NO |
| `extends` | NO | NO | **YES** | NO | NO | NO |
| `lwc-template-child` | NO | NO | NO | **YES** | NO | NO |
| `trigger-on` | NO | NO | NO | NO | **YES** | NO |
| `test-reference` | NO | NO | NO | NO | NO | **YES** |

---

## 22. SHARED NODE SEMANTICS

- **Shared Runtime Service:** An Apex Service/Controller called by $\ge 2$ distinct entry-point LWCs/Triggers via `method-call` or `lwc-apex`.
- **Shared Schema Resource:** A CustomObject queried/mutated by $\ge 2$ distinct entry-point domains via `SOQL` or `DML`.
- **Shared OOP Base Class:** A BaseController/BaseService inherited by $\ge 2$ subclasses via `extends`.

---

## 23. ENTRY POINT SEMANTICS

Root entry points MUST be defined by explicit architectural capability:
- `LWC` / `Aura` / `Visualforce` (UI Entry Points)
- `ApexTrigger` / `Flow` (Database & Process Entry Points)
- `@RestResource` / `@InvocableMethod` / `Batchable` (API & Async Entry Points)

`inDegree === 0` is purely a graph-theoretic property, NOT an architectural entry point definition.

---

## 24. LENS C FALSE-POSITIVE TEST (10 CASES)

1. **Two LWCs call `OrderService`:** **TRUE Shared Runtime Service**.
2. **Two LWCs query `Account` SObject:** **TRUE Shared Schema Resource**.
3. **Two Controllers extend `BaseController`:** **Shared OOP Base Class** (NOT Runtime Service).
4. **Two Test Classes test `PaymentProcessor`:** **Shared Test Target** (EXCLUDED from runtime sharing).
5. **Two LWCs include `errorPanel` child LWC:** **Shared UI Component**.
6. **Two Triggers listen on `Opportunity` SObject:** **Shared Event SObject**.
7. **Two Services import `CurrencyUtils`:** **Shared Utility Helper**.
8. **Two Controllers reference `AccountStatus` Enum:** **Shared Type Reference** (Static).
9. **Two Batch jobs mutate `AuditLog__c`:** **Shared Schema Resource**.
10. **Two LWCs reference `User.Name` field:** **Shared Field Reference** (Metadata detail).

---

## 25. MULTI-EDGE SEMANTICS

If Node A and Node B have both `method-call` and `SOQL` edges:
- **Analytical Graph:** Preserves BOTH canonical edge objects independently.
- **Layout Graph:** Aggregates parallel edges into 1 primary layout edge.
- **Renderer:** Renders 1 composite edge with primary precedence style.
- **Inspector Panel:** Displays detailed breakdown of all individual relationship edges.

---

## 26. CHALLENGE THE PREVIOUS EDGE PRECEDENCE

**Reconciled Edge Precedence:**
$$\text{Execution Call (`method-call` / `lwc-apex`)} > \text{Data Mutation (`DML` / `SOQL`)} > \text{OOP (`extends`)} > \text{Static Ref (`field-reference`)}$$

This precedence is VALID for selecting the primary line style when aggregating multi-edges for macro canvas rendering.

---

## 27. ANALYTICAL FILTER CONTRACT

- **Presentation Filter:** Hides/mutes visible canvas elements (e.g. "Mute inter-feature edges at far zoom"). Does NOT recompute graph topology or positions.
- **Analytical Projection Filter:** Filters `edges` BEFORE passing to BFS traversal or layout engines (e.g. "Recompute 2-hop BFS using ONLY `method-call` edges").

---

## 28. CYCLE / DAG CONTRACT

- The canonical graph $G=(V,E)$ is CYCLIC.
- DAG layout algorithms ($Y=\text{Layer}$) calculate node positions without modifying, deleting, or reversing canonical edges in $G$.

---

## 29. FINAL LENS × RELATIONSHIP MATRIX

| Relationship Type | Lens A Primary | Lens A Overlay | Lens B Dependencies | Lens B Dependents | Lens C Runtime | Lens C Schema | Lens C Other | Hop Semantics | Transitive | Render Style |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|---|
| `method-call` | **YES** | NO | **YES** | **YES** | **YES** | NO | NO | 1 Hop | **YES** | Solid Grey Arrow |
| `lwc-apex` | **YES** | NO | **YES** | **YES** | **YES** | NO | NO | 1 Hop | **YES** | Solid Orange Arrow |
| `visualforce-controller` | **YES** | NO | **YES** | **YES** | **YES** | NO | NO | 1 Hop | **YES** | Solid Pink Arrow |
| `SOQL` / `soql-object` | **YES** | NO | **YES** | **YES** | NO | **YES** | NO | Terminal | NO | Dash-Dot Amber |
| `DML` | **YES** | NO | **YES** | **YES** | NO | **YES** | NO | Terminal | NO | Solid Red Arrow |
| `extends` | NO | **YES** | **YES** | **YES** | NO | NO | **OOP** | 1 Hop (Tree) | **YES** | Solid Green Arrow |
| `implements` | NO | **YES** | **YES** | **YES** | NO | NO | **OOP** | Terminal | NO | Dotted Green Line |
| `lwc-template-child` | NO | NO | **YES** | **YES** | NO | NO | **UI** | 1 Hop (DOM) | **YES** | Muted Orange Arrow |
| `field-reference` | NO | NO | **OPTIONAL**| **OPTIONAL**| NO | NO | NO | Detail | NO | Muted Green Line |
| `test-reference` | NO | **QA** | **OPTIONAL**| **OPTIONAL**| NO | NO | **QA** | QA Hop | NO | Muted Dotted Line |

---

## 30. FINAL "ONE HOP" CONTRACT

> **In the Focal Dependency Neighborhood (Lens B), ONE HOP means 1 transitive step along edges matching the ACTIVE ANALYTICAL FILTER MASK (default: Execution Calls + Data Access). Non-execution edges (field references, test references) do NOT count as standard 1-hop execution steps.**

---

## 31. FINAL "SHARED" CONTRACT

> **In Shared Infrastructure Topology (Lens C), a node is SHARED when it is referenced by $\ge 2$ distinct entry-point root containers through the SAME relationship category (Shared Runtime Service, Shared Schema Resource, or Shared OOP Base Class).**

---

## 32. FUNDAMENTAL PRINCIPLE CHALLENGE

- **Principle 1 (Canonical Identity):** **PASS**.
- **Principle 2 (Coherent BFS Traversal):** **PASS**.
- **Principle 3 (No Conflation):** **PASS**.
- **Principle 4 (Categorized Sharing):** **PASS**.
- **Principle 5 (Filter Before Layout):** **PASS**.
- **Principle 6 (Recoverable Multi-Edges):** **PASS**.
- **Principle 7 (Layout Cannot Mutate Meaning):** **PASS**.

---

## 33. IMPLEMENTATION BLOCKERS

### **BLOCKERS:**
1. Unfiltered BFS traversal in `focus-graph.ts` traversing test references and UI template tags as 1-hop execution steps.
2. Conflation of database schema sharing with application controller sharing in Lens C.
3. Typo in `graph-style.ts` (`'lwc-apic'`) breaking LWC-to-Apex edge visual styling.

---

## 34. REQUIRED FINAL GATE

```text
============================================================
FINAL DESIGN GATE:
B — CONTRACT READY WITH CONDITIONS

IMPLEMENTATION STATUS:
BLOCKED
============================================================
```

---

## 35. REQUIRED EXECUTIVE CONCLUSION

### FINAL VERDICT
The Lens Relationship Inclusion and Traversal Semantics contracts are **CONTRACT READY WITH CONDITIONS**. Implementation remains **BLOCKED** until category-filtered traversal masks are integrated into `focus-graph.ts` and Lens C shared node classification separates Shared Runtime, Shared Schema, and Shared OOP infrastructure.

---

## 36. ABSOLUTE FINAL TEST

When a user selects an LWC and asks *"Show me its dependencies"*:
1. `lwc-apex -> Controller`: **True 1-Hop Execution Dependency** (Lens B $r=1$).
2. `lwc-template-child -> ChildLWC`: **UI DOM Composition** (Lens B UI Overlay).
3. `field-reference -> CustomField`: **Schema Detail** (Lens B Detail Overlay).
4. `lwc-import -> UtilityJS`: **1-Hop Static JS Module Dependency** (Lens B $r=1$).
5. `test-reference -> TestClass`: **QA Test Coverage** (Lens B QA Overlay).

The system explains each edge without ambiguity, preserving canonical truth across all analytical projections.

```text
CANONICAL RELATIONSHIP TRUTH
        ≠
RELATIONSHIP CATEGORY
        ≠
LENS-SPECIFIC ANALYTICAL PROJECTION
        ≠
TRAVERSAL DISTANCE
        ≠
LAYOUT GEOMETRY
        ≠
RENDERING STYLE
        ≠
INTERACTION STATE
```

NO CODE CHANGES. NO PATCHES. NO IMPLEMENTATION.
THIS REPORT IS THE FINAL LENS RELATIONSHIP & TRAVERSAL CONTRACT GATE.
