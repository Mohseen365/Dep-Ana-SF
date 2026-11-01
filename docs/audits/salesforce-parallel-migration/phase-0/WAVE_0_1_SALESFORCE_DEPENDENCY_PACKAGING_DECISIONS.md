# Wave 0.1: Salesforce Dependency Packaging Decisions & LWC Architecture

**Status:** RECONCILED & AUTHORITATIVE
**Target Platform:** Salesforce Lightning Web Components (LWC) & Lightning Web Security (LWS)
**Scope:** Wave 5 (Deep Graph Layouts), Wave 6 (Analytical Visualizations), Wave 9 (Refactoring Graph Layouts)

---

## 1. Executive Summary & Critical Platform Architecture Axiom

In standard Node.js/React development, dependencies are installed into `node_modules` via `package.json` and bundled by tools like Vite or Webpack. In Salesforce Lightning Web Components (LWC), **this mechanism does not exist**:
- Installing an npm dependency in the root `package.json` **DOES NOT** make it importable by an LWC.
- LWC runs in the browser under **Lightning Web Security (LWS)** (or Locker Service), enforcing strict namespace isolation, DOM virtualization, and restricted global object access.
- Third-party JavaScript libraries in Salesforce must either:
  1. Be native, ES6-compliant modules authored within the LWC bundle or shared LWC module, or
  2. Be uploaded as a Salesforce **Static Resource** (`.resource-meta.xml`) and loaded asynchronously via `loadScript` from `lightning/platformResourceLoader`.

---

## 2. Evaluation of External Algorithm Dependencies

Two third-party dependencies are frequently cited in React explorer layout and visualization features:
1. `dagre` (Directed graph layout engine, used for hierarchical layout in React explorer and Wave 9 refactoring previews).
2. `d3-hierarchy` (Used in React explorer for treemap and collapsible tree projections).

### 2.1 Dependency 1: `dagre`
- **Current State in Repo:**
  - `dagre` is installed in root `node_modules` (`package.json` dev dependency / root dependency).
  - `dagre` **IS NOT** present in `scratch/salesforce-poc/force-app/main/default/staticresources/`.
  - Only `cytoscape.js` exists as a static resource in `scratch/salesforce-poc/`.
- **LWS Compatibility Risk:**
  - `dagre` relies on `graphlib` and older CommonJS object-prototype patterns.
  - Full `dagre` bundle size is $\sim 350\text{ KB}$ minified.
- **Evaluation of Strategies:**
  - *Option A: Load as Static Resource via `loadScript`:* High friction, requires global window pollution (`window.dagre`), which is constrained by LWS.
  - *Option B: Pure LWC Native Port:* Porting dagre's simplex rank assignment and crossing reduction is high effort and unnecessary because Cytoscape already provides hierarchical / breadthfirst and dagre extensions if bundled with Cytoscape.
  - *Option C: Cytoscape Native Layouts:* In `daLayoutEngine.js`, Cytoscape layout extensions or native breadthfirst/cose algorithms are already used without requiring external dagre.
  - *Option D: Deferral:* Defer standalone `dagre` bundling until Wave 9 refactoring visualization begins.
- **Canonical Decision for Wave 0.1:**
  **OPTION D (DEFERRED PENDING TECHNICAL DECISION).**
  Task `W9-1` is marked **conditionally blocked** on layout execution strategy. Refactoring simulation logic (node removal, edge decoupling, fan-in/fan-out metrics recalculation) can proceed purely with in-memory map mutations without external layout libraries. Visual rendering in `W9-2` will utilize existing Cytoscape layout engines (`breadthfirst` or `cose`) or native layout calculations from `daLayoutEngine.js`.

### 2.2 Dependency 2: `d3-hierarchy` (Treemaps)
- **Current State in Repo:**
  - `d3-hierarchy` is in `explorer/package.json`. It is **NOT** a Salesforce static resource.
- **Evaluation of Strategies:**
  - *Option A: Full D3 Static Resource:* Incompatible with LWC lightweight principles; D3 manipulates DOM directly, violating LWC shadow DOM boundaries.
  - *Option B: Lightweight Native LWC Treemap Squarifying Algorithm:* The squarified treemap layout algorithm (Bruls, Huizing, van Wijk) is a pure mathematical partition algorithm of $\sim 80\text{ lines of code}$. It requires no DOM access and outputs simple bounding box coordinates: `{ x, y, width, height }`.
- **Canonical Decision for Wave 0.1:**
  **OPTION B (PORT ALGORITHM NATIVELY INTO LWC UTILITY).**
  Workstream B (Task `W6-2`: `daTreemapView`) will implement an internal, zero-dependency ES6 squarify layout function directly inside `daTreemapView/daTreemapLayout.js`. This eliminates external dependencies, avoids static resource network overhead, and guarantees 100% LWS security compliance.

---

## 3. Pinned Static Resource Inventory

| Static Resource Name | Pinned Version | File Size | Meta XML Status | LWS Verification Status | Owning Component |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `cytoscape.js` | 3.30.0 | $\sim 414\text{ KB}$ | `cytoscape.resource-meta.xml` exists | VERIFIED in Wave 1-4 | `daGraphViewer` |

No new static resources may be added without Lead Architect and Security Lead sign-off.
