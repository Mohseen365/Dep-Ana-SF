# Salesforce Architecture & Refactoring Explorer

A standalone, deterministic architecture analysis and refactoring visualization suite for Salesforce metadata repositories (`ApexClass`, `ApexTrigger`, `LWC`, `Visualforce`, `Flow`, `CustomObject`, `CustomField`).

---

## 1. System Architecture

The Explorer follows a strict unidirectional architecture:

```text
Salesforce Source Repository (force-app/main/default)
                    │
                    ▼
          dependency-analyzer.cjs (Static Analysis Engine)
                    │
                    ▼
          Analyzer Output Artifacts (analyze/dependency-report.json)
                    │
                    ▼
          scripts/export-explorer.cjs (Explorer Data Adapter)
                    │
                    ▼
          explorer-data.json (Stable View-Model Contract)
                    │
                    ▼
          React + TypeScript + Vite + Cytoscape.js (Explorer UI)
```

### Architectural Principles:
* **Single Source of Truth:** `dependency-analyzer.cjs` is the sole engine for dependency analysis, metrics calculation, risk scoring, cycle detection, and symbol resolution.
* **Zero Frontend Recalculation:** The Explorer UI reads pre-computed data from `explorer-data.json`. No graph analysis or risk scoring logic is duplicated in the UI.
* **Orchestrator & LLM Decoupled:** Operates completely without `orchestrator.js` or external LLM dependencies.
* **No Database or Backend:** Serves completely statically as client-side React + Cytoscape web app.

---

## 2. Quick Start & Workflow Commands

### One-Command Workflow
Run the entire pipeline (analysis check, adapter transformation, and UI launcher) with a single command:

```bash
# Run one-command workflow (checks/reuses analysis, runs adapter, launches Vite dev server)
npm run explorer

# Force fresh analysis run before launching
npm run explorer:fresh

# Build production static bundle
npm run explorer:build

# Preview production build locally
npm run explorer:preview
```

### Independent Pipeline Commands

1. **Run Static Dependency Analysis:**
   ```bash
   node dependency-analyzer.cjs analyze force-app/main/default
   ```

2. **Transform Analyzer Outputs into Explorer Contract:**
   ```bash
   node scripts/export-explorer.cjs --input analyze --output explorer-data.json
   ```

3. **Run Adapter Integrity Test Suite:**
   ```bash
   node scripts/test-export-explorer.cjs
   ```

4. **Run Explorer Frontend Tests & Build:**
   ```bash
   cd explorer
   npm test
   npm run build
   ```

---

## 3. Stable Data Contract (`explorer-data.json`)

The stable contract is defined in `explorer-contract.ts` and detailed in `EXPLORER_CONTRACT.md`.

* **`schemaVersion`**: `"1.0.0"`
* **`analyzerVersion`**: `"13.0.0"`
* **`summary`**: High-level component counts, risk distribution, cycle counts, unresolved counts, and metadata inventory.
* **`nodes`**: Standardized component objects with metrics (`fanIn`, `fanOut`, `coupling`, `score`), risk classification (`HIGH`, `MEDIUM`, `LOW`), risk reasons, behavior signals, and readiness indicators.
* **`edges`**: Directional dependency edges with source code evidence snippets, exact file/line/column locations, enclosing method owners, and resolution strategy metadata.
* **`cycles`**: Strongly connected circular dependency node groups.
* **`unresolvedReferences`**: Breakdown of unresolvable external or platform symbol references.
* **`impactSummaries`**: Pre-computed direct/transitive reachability closures and affected test class lists per component.

---

## 4. Explorer Capabilities

* **Interactive Dependency Graph:** Rendered using Cytoscape.js with entity-specific node colors (`ApexClass`, `ApexTrigger`, `LWC`, `Visualforce`, `Flow`, `Object`, `Field`), risk level borders, zoom, pan, and fit-to-screen.
* **Search & Multi-Facet Filtering:** Instant search by name, metadata type filter, risk level filter, and automatic selection centering.
* **Focus & Neighborhood Inspection:** Isolate subgraphs around a focused component across customizable direction (`both`, `dependencies`, `dependents`) and reachability depth (`1`, `2`, `3`, `ALL`).
* **Component & Relationship Details Panel:** Rich side-drawer providing component metrics, behavior capabilities (DML, SOQL, Callouts, Security, Async), and source code line evidence for relationships.
* **Impact & Blast Radius Analysis:** Highlight direct and transitive dependents, muted non-affected nodes, and impacted test suites.
* **Diagnostics Panel:** Dedicated tabbed inspector for circular dependency cycles and unresolved references.
* **Change Simulator:** Simulates hypothetical metadata modifications (`General`, `Rename`, `Remove`, `Method/API`, `Field`, `Object`) and calculates an **Architectural Impact Estimate**.
* **Refactoring Readiness:** Evaluates component refactoring safety based on risk, cycles, unresolved references, and test coverage.
* **Architectural Hotspots:** Deterministic ranking of repository components requiring refactoring attention.
* **Architecture Health Overview:** Repository health score (0–100 scale) with penalty breakdowns for high risk, cycles, and unresolved references.

---

## 5. System Limitations

* **Static Analysis Boundaries:** `dependency-analyzer.cjs` performs static analysis. Dynamic Apex (`Type.forName`), dynamic SOQL strings with runtime variable construction, or untyped reflection cannot be statically resolved.
* **Unresolved References:** Unresolved edges indicate references to standard platform namespaces (`System`, `Schema`) or unresolvable external symbols. Unresolved state does not imply the absence of a dependency.
* **Change Simulator:** All simulator outputs represent an **Architectural Impact Estimate** based on static graph reachability and do not guarantee runtime execution or compile-time outcome.
* **Refactoring Readiness:** Readiness flags provide decision support indicators; human review remains mandatory before refactoring.
* **Graph Performance:** WebGL/Canvas rendering via Cytoscape supports graphs up to several thousand nodes efficiently. Extremely large repositories (>5,000 nodes) may experience rendering delays during initial layout.

---

## 6. Canonical Architecture Snapshot (`architecture-snapshot.json`)

The Canonical Architecture Snapshot (WAVE-E1) provides a deterministic, persisted representation of the repository's architectural state generated during analysis.

### Features & Guarantees:
* **Purpose:** Stable, authoritative input for architecture diffing, change gating, investigation eligibility, LLM-context minimization, and regression comparison workflows.
* **Schema Versioning:** Uses explicit schema versioning (`schemaVersion: 5`).
* **Snapshot Identity:** Computes a stable `snapshotIdentity` (`arch-snap-sha256:...`) using SHA-256 over normalized logical architecture state. Execution metadata (`generatedAt`, file timestamps, absolute paths) is excluded from identity calculation to ensure identical analysis inputs produce equivalent identities.
* **Deterministic Authority:** 0 LLM runtime calls or dependencies. Preserves `UNKNOWN` classifications when evidence is absent and enforces deterministic facts over conflicting semantic claims.
* **Persistence Location:** Saved as `architecture-snapshot.json` in the active output directory (`analyze/architecture-snapshot.json` or target output folder) and registered in `analysis-manifest.json`.
