# Change Simulator (`Change Simulator.md`)

## 1. Overview & Purpose

The **Change Simulator** is a read-only, deterministic decision-support tool in the Salesforce Architecture & Refactoring Explorer.

It addresses the fundamental architectural question:
> *"If I change this component, what is the likely architectural blast radius across the codebase?"*

### Key Guiding Principles
- **Read-Only**: Does NOT modify Salesforce source files or metadata.
- **Zero Generative AI**: Does NOT call LLMs or external AI models.
- **Zero Backend / DB**: Operates strictly on pre-computed deterministic analyzer output (`explorer-data.json`).
- **Architectural Estimate**: Presents results as `Architectural Impact Estimate`, explicitly acknowledging static analysis capabilities without claiming compile-time or runtime certainty.
- **Decoupled Architecture**: Does NOT depend on `orchestrator.js`.

---

## 2. Supported Change Types & Semantics

The Change Simulator supports 6 change scenarios with conservative, documented semantics:

1. **General component change**
   - *Semantics*: Evaluates direct/transitive dependent components and affected test suites using pre-computed graph dependency closures.
2. **Rename component**
   - *Semantics*: Identifies all downstream consumers and references that will require explicit symbol updates.
3. **Remove component**
   - *Semantics*: High-consequence hypothetical change identifying all components and test suites that will break upon target removal.
4. **Method / API signature change**
   - *Semantics*: Focuses on relationships and method calls where source evidence explicitly records target method invocation.
5. **Field change**
   - *Semantics*: Evaluates field references, SOQL field selections, and field-level component bindings.
6. **Object change**
   - *Semantics*: Evaluates object schema dependencies, trigger bindings, and SOQL object queries.

---

## 3. Deterministic Blast Radius Classification

The Change Simulator classifies the architectural impact into three levels using documented, deterministic rules based on analyzer metrics:

| Blast Radius Level | Classification Rule |
| :--- | :--- |
| **LARGE** | Transitive dependents $\ge 10$ **OR** component risk is `HIGH` **OR** component participates in 1+ circular dependency cycles (`cyclesInvolved > 0`). |
| **MEDIUM** | Transitive dependents $\ge 3$ **OR** component risk is `MEDIUM` **OR** contains 1+ unresolved references. |
| **SMALL** | Transitive dependents $< 3$ **AND** component risk is `LOW` **AND** 0 cycles **AND** 0 unresolved references. |

---

## 4. Graph Highlighting Behavior

When simulation mode is active for a target component:
- **Origin Component**: Highlighted with a distinct prominent blue border (`sim-origin`).
- **Affected Components**: Retain full visibility with highlighted borders (`sim-affected`).
- **Affected Edges**: Thicker, high-visibility lines (`sim-affected`).
- **Unrelated Elements**: Dimmed with low opacity (`sim-muted`).

---

## 5. Verification Commands & Results

1. **Adapter Validation Suite**:
   ```bash
   node scripts/test-export-explorer.cjs
   ```
   *Result*: PASS (12 validation invariants and graph equivalence comparison passed).

2. **Explorer Vitest Suite**:
   ```bash
   cd explorer && npm test
   ```
   *Result*: PASS (117 tests passed across 7 test files).

3. **Vite Application Build**:
   ```bash
   cd explorer && npm run build
   ```
   *Result*: PASS (`tsc && vite build` succeeded with zero errors).

---

## 6. Limitations

- **Static Estimate**: The simulator models architectural impact derived from static analysis; it does not guarantee compile-time or runtime error detection for dynamically constructed code.
- **Method Granularity**: Method-level caller precision is subject to static evidence resolution in `dependency-analyzer.cjs`.
