# Salesforce Architecture Intelligence & Refactoring Master Plan

## 1. Executive Summary

This Master Plan defines the definitive architecture, data models, boundary rules, and step-by-step evolution path to transition the **Salesforce Dependency Analyzer & Architecture Explorer** from its current state (a deterministic dependency analyzer and interactive visualization suite) into a comprehensive **Salesforce Architecture Intelligence & Refactoring Explorer**.

### Core Vision & Purpose
The system will evolve to provide automated, evidence-backed, deterministic architectural intelligence across 27 primary operational capabilities:
1. **Architecture Intelligence Foundation** (shared intelligence model & data structures)
2. **Architectural Roles** (Controller, Service, Repository, Trigger, Domain, LWC, Flow, Integration, Test, etc.)
3. **Architectural Layers** (Presentation, Application, Domain, Data, Integration, Platform, Test)
4. **Architecture Profiles & Policies** (configurable, project-specific layer boundary and dependency constraints)
5. **Architecture Smells Engine** (Circular Dependencies, High Fan-In/Fan-Out Hubs, God Components, Layer Violations, Untested High-Risk Nodes, Bottlenecks)
6. **Dependency Path Explorer** (multistep transitive path tracing with depth, cycle, and confidence tracking)
7. **Entry-Point Analysis** (UI, Trigger, Flow, REST/API, Scheduled Apex, Event Consumers, and reachable transitive subgraphs)
8. **Critical Dependency & Bottleneck Analysis** (chokepoints, centrality hubs, cross-layer bottlenecks)
9. **Test Protection & Test Gap Analysis** (pairing risk, impact, and entry points with structural test relationships)
10. **Salesforce Data / Object / Field Impact** (tracing component $\rightarrow$ object $\rightarrow$ field dependencies back to Apex, LWC, VF, and Flows)
11. **Security Surface Analysis** (sharing declarations, SOQL/DML boundaries, security signal tracking)
12. **External & Integration Boundary Analysis** (HTTP callouts, REST annotations, Platform Events, external services)
13. **Advanced Change Simulator** (hypothetical modification, rename, deletion, API/method, object, and field breaking-change estimates)
14. **Refactoring Safety Envelope** (deterministic safety scoring: SAFE, CAUTION, HIGH CAUTION with explicit criteria)
15. **Refactoring Work Sequencing** (cycle-breaking prioritization, risk reduction ordering, dependency unblocking)
16. **Architecture Debt Quantification** (quantified debt score across cycles, unresolved refs, layer violations, and smells)
17. **Business Criticality Integration** (decoupled overlay comparing technical risk against business importance)
18. **Subsystem & Domain Discovery** (deterministic structural clustering by naming, shared objects, and graph connectivity)
19. **Multi-Level Architecture Maps** (progressive disclosure: System $\rightarrow$ Domain $\rightarrow$ Subsystem $\rightarrow$ Component $\rightarrow$ Method/Evidence)
20. **Refactoring Outcome Tracking** (before vs. after delta reporting for refactoring verification)
21. **Architecture Baseline & Diff Engine** (comparing baseline snapshot vs. current snapshot to identify added/removed nodes, edges, cycles, and smells)
22. **Architecture Quality Gates** (CLI/CI verification for zero new cycles, unresolved references, or policy violations)
23. **Architecture Governance** (PASS/WARN/FAIL status reporting for automated pipeline enforcement)
24. **Trustworthy Architecture Health Model** (dimensioned health metrics across cycles, resolution, layer conformance, test protection, and coupling)
25. **High-Performance Scalability Strategy** (indexing, progressive rendering, virtualized Cytoscape canvas, pre-computed reachability)
26. **One-Command Integrated Workflow** (single CLI entry point with transparent caching and fallback)
27. **Targeted Semantic & AI Capabilities (Optional)** (deterministic candidate generation $\rightarrow$ LLM interpretation for duplicate responsibility and domain explanation)

### Non-Negotiable Core Architectural Directives
* **Single Source of Truth:** `dependency-analyzer.cjs` remains the sole, authoritative source for discovered architecture facts (components, relationships, registry, raw evidence, risk scores, cycles, unresolved references, and method call graphs).
* **Zero Business Logic in Adapter:** The adapter converts and normalizes analyzer outputs into stable JSON view contracts. It does not re-analyze code or alter metrics.
* **Pure Client-Side Explorer:** The Explorer UI reads static data from `explorer-data.json` and renders interactive graphs and drawers without requiring a backend, database, or LLM.
* **Deterministic Interpretation Layer:** Higher-level interpretations (roles, layers, smells, findings, path search, refactoring readiness) are computed deterministically from authoritative facts using explicit, explainable, versioned rules.
* **LLM Boundary Strictness:** Optional semantic capabilities (LLMs) operate strictly downstream on structured, deterministic context output from Level 1 and Level 2 analysis. LLMs never alter graph topology or act as fact generators.

---

## 2. Current Architecture Reality

The current implementation represents a production-hardened baseline corresponding to earlier project prompts.

```text
  +-----------------------------------------------------------------------+
  |               Salesforce Metadata Repository                          |
  |      (ApexClass, ApexTrigger, LWC, Visualforce, Flow, Objects)       |
  +-----------------------------------------------------------------------+
                                      |
                                      v
  +-----------------------------------------------------------------------+
  |                     dependency-analyzer.cjs                           |
  |   - Version: 13.0.0                                                   |
  |   - Deterministic AST/Regex parsing, graph construction               |
  |   - Symbol registry, canonical edges, evidence extraction             |
  |   - Fan-in/out, coupling, risk classification, Tarjan SCC cycles      |
  |   - Output: analyze/dependency-report.json                            |
  +-----------------------------------------------------------------------+
                                      |
                                      v
  +-----------------------------------------------------------------------+
  |                     scripts/export-explorer.cjs                       |
  |   - Explorer Data Adapter                                             |
  |   - Transforms raw report into explorer-data.json                     |
  |   - Normalizes IDs/types, sorts deterministically                     |
  |   - Pre-computes BFS transitive impact summaries                      |
  |   - Verified by scripts/test-export-explorer.cjs (12 invariants)      |
  +-----------------------------------------------------------------------+
                                      |
                                      v
  +-----------------------------------------------------------------------+
  |                      explorer-contract.ts                             |
  |   - Schema Version: 1.0.0                                             |
  |   - Stable TypeScript types for ExplorerDataSchema                    |
  +-----------------------------------------------------------------------+
                                      |
                                      v
  +-----------------------------------------------------------------------+
  |                         React Explorer UI                             |
  |   - Vite + React 18 + TypeScript + Cytoscape.js                       |
  |   - Interactive Graph View (pan, zoom, node coloring, layout)         |
  |   - Multi-Facet Search & Filter, Focus/Neighborhood Mode (Depth 1-ALL)|
  |   - Details Panel, Impact & Blast Radius Mode, Diagnostics Drawer     |
  |   - Change Simulator, Refactoring Readiness, Hotspots, Health Bar     |
  +-----------------------------------------------------------------------+
```

### Verified Implementation Status & Health Audit
* **Analyzer (`dependency-analyzer.cjs`):** Completely intact, pristine, version `13.0.0`. Exports `analyze`, `getAnalysis`, `buildGraph`, `buildComponentIntelligence`, `impactFor`, `createCanonicalRelationship`, `determineResolution`, `parseIdParts`.
* **Adapter (`scripts/export-explorer.cjs`):** Thin, deterministic, 100% passing tests via `node scripts/test-export-explorer.cjs`.
* **Contract (`explorer-contract.ts`):** Schema version `1.0.0`, well-typed, comprehensive.
* **Explorer (`explorer/`):** React 18 application with 17 test suites (165 Vitest tests) passing cleanly and building without errors via Vite (`npm run build`).

---

## 3. Current Analyzer Capabilities

`dependency-analyzer.cjs` is a CommonJS static analysis engine providing the following deterministic facts:

| Fact Domain | Discovered & Computed Data |
| :--- | :--- |
| **Component Identity** | Metadata type (`ApexClass`, `ApexTrigger`, `LWC`, `Visualforce`, `Flow`, `CustomObject`, `CustomField`), name, file path, stable ID (`Type:Name`). |
| **Symbol Registry** | Parsed methods, parameters, return types, field references, annotations (`@AuraEnabled`, `@InvocableMethod`, `@TestSetup`, `@IsTest`). |
| **Dependency Edges** | Source node, target node, relationship type (`method-call`, `instantiation`, `type-reference`, `extends`, `implements`, `SOQL`, `DML`, `aura-enabled`, `lwc-apex`, `field-reference`, `trigger-handler`, `event-publisher`), enclosing method owner, line, column, snippet evidence. |
| **Resolution Metadata**| Resolution status (`EXACT`, `INFERRED`, `UNRESOLVED`), resolution strategy, confidence score (`high`, `medium`, `low`), resolution classification (`RESOLVED_LOCAL`, `RESOLVED_PLATFORM`, `UNKNOWN`). |
| **Component Metrics** | `fanIn` (inbound dependents), `fanOut` (outbound dependencies), `coupling` ($fanIn + fanOut$), `unresolved` count, `score`. |
| **Risk Classification** | Calculated risk (`HIGH`, `MEDIUM`, `LOW`) with explicit reasons (e.g., high coupling, circular dependencies, unresolved references, trigger/controller complexity). |
| **Cycles** | Strongly Connected Components (SCC) detected via Tarjan's algorithm. |
| **Behavioral Signals** | Sharing mode (`with sharing`, `without sharing`, `inherited sharing`), `isTest` flag, query count, DML count, callout count, public contracts count, async pattern tags (`future`, `batchable`, `queueable`, `schedulable`). |
| **Impact Analysis** | Direct and transitive reachability closures (`directDependencies`, `directDependents`, `transitiveDependencies`, `transitiveDependents`, `impactedTests`). |

---

## 4. Current Explorer Capabilities

The Explorer application (`explorer/src`) provides interactive visualization and decision support:

1. **Interactive Cytoscape Canvas (`GraphView.tsx`):** Renders metadata nodes with specific color schemes by type and border styling by risk level. Supports node selection, drag, zoom, fit-to-screen, and edge highlighting.
2. **Search & Multi-Facet Filtering (`SearchFilterPanel.tsx`):** Real-time text search, type filtering (`ApexClass`, `LWC`, `Flow`, etc.), risk level filtering (`HIGH`, `MEDIUM`, `LOW`), and automatic selection centering.
3. **Focus & Neighborhood Inspection (`FocusControls.tsx`, `focus-graph.ts`):** Isolates subgraphs around selected focal nodes across direction (`both`, `dependencies`, `dependents`) and depth (`1`, `2`, `3`, `ALL`).
4. **Details & Evidence Drawer (`DetailsPanel.tsx`):** Displays component metrics, risk reasons, code capabilities (DML, SOQL, Callouts, Async, Security), and line-level source evidence for incoming and outgoing edges.
5. **Impact & Blast Radius Mode (`ImpactControls.tsx`, `impact-analysis.ts`):** Renders direct/transitive dependents, mutes unaffected nodes, and highlights test suites affected by changes to a component.
6. **Diagnostics Panel (`DiagnosticsPanel.tsx`):** Dedicated tabs for analyzing circular dependency cycles and unresolved references with line-level evidence.
7. **Change Simulator (`change-simulator.ts`):** Calculates hypothetical impact estimates across change types (`General`, `Rename`, `Remove`, `Method/API`, `Field`, `Object`).
8. **Refactoring Readiness (`readiness.ts`):** Classifies component readiness (`READY`, `CAUTION`, `NOT_READY`) based on risk level, cycles, unresolved references, and test coverage.
9. **Hotspots & Health (`hotspots.ts`, `health.ts`, `HealthSummary.tsx`):** Ranks component refactoring priority and computes overall repository health score (0–100 scale).

---

## 5. Current Contract (`explorer-contract.ts`)

The stable contract (Schema Version `1.0.0`) defines the format of `explorer-data.json`:

```typescript
export interface ExplorerDataSchema {
  schemaVersion: string; // "1.0.0"
  analyzerVersion: string; // "13.0.0"
  generatedAt: string; // ISO 8601 string
  sourceDirectory: string; // Relative source directory
  summary: ExplorerSummary;
  nodes: ExplorerNode[];
  edges: ExplorerEdge[];
  cycles: ExplorerCycleGroup[];
  unresolvedReferences: ExplorerUnresolvedReference[];
  impactSummaries: Record<string, ExplorerComponentImpactSummary>;
}
```

Key structures include `ExplorerNode` (containing `metrics`, `risk`, `riskReasons`, `behavior`, `refactoringReadiness`), `ExplorerEdge` (containing `source`, `target`, `relationshipType`, `evidence`, `canonical`, `resolutionClassification`, `confidence`), `ExplorerCycleGroup`, `ExplorerUnresolvedReference`, and `ExplorerComponentImpactSummary`.

---

## 6. Current Adapter Responsibilities (`scripts/export-explorer.cjs`)

The adapter is responsible for:
1. **Reading Raw Analyzer JSONs:** Consumes `dependency-report.json` or `analysis-snapshot.json`.
2. **ID & Type Normalization:** Ensures stable ID formats (`Type:Name`) and map raw metadata types (`Object` $\rightarrow$ `CustomObject`, `Field` $\rightarrow$ `CustomField`, `Trigger` $\rightarrow$ `ApexTrigger`).
3. **Deterministic Sorting:** Sorts nodes, edges, cycles, and impact lists lexicographically by ID to guarantee exact file equality across identical runs.
4. **Impact Summary Pre-Computation:** Runs Breadth-First Search (BFS) over the dependency graph to compute transitive dependency/dependent closures and impacted test lists per node.
5. **Contract Enforcement:** Validates that all output fields match `explorer-contract.ts` Schema Version 1.0.0.

---

## 7. Architecture Boundary Audit

A strict audit of the current repository against key architectural boundaries reveals:

| Boundary Metric | Current Status | Audit Finding |
| :--- | :--- | :--- |
| **Analyzer Modifications** | NO | `dependency-analyzer.cjs` is unmodified and clean. |
| **Contract Modifications** | NO | `explorer-contract.ts` is stable at version 1.0.0. |
| **Orchestrator Dependency** | NO | Zero imports or calls to `orchestrator.js`. |
| **LLM Calls / API Keys** | NO | Zero LLM prompts, API keys, or network runtime dependencies. |
| **Backend / Database** | NO | Operates completely client-side in React static bundle. |
| **External UI Bundles** | NO | Uses Cytoscape.js. Zero React Flow or D3 dependencies. |

### Documented Discrepancies (Implementation vs Docs)
* **Discrepancy 1:** Some earlier markdown documents referenced `orchestrator.js` or `Python bridge` for legacy CLI tasks. The current codebase uses standard Node.js scripts (`scripts/run-explorer.cjs`, `scripts/export-explorer.cjs`). **Implementation Wins.**
* **Discrepancy 2:** Earlier notes discussed dynamic frontend recalculation of impact. In the codebase, pre-computed impact summaries are output by `export-explorer.cjs` into `explorer-data.json`. **Implementation Wins.**

---

## 8. Facts vs Interpretation Model

To maintain architectural clarity and prevent logic scatter, all system capabilities are organized into three distinct conceptual levels:

```text
+-----------------------------------------------------------------------------------+
| LEVEL 1: DETERMINISTIC FACTS (Analyzer Owned)                                     |
| Authoritative AST/Regex static analysis outputs:                                  |
| fanIn, fanOut, coupling, risk, cycles, unresolved refs, relationship types,       |
| method signatures, source locations, evidence snippets, behavior signals.         |
+-----------------------------------------------------------------------------------+
                                         │
                                         ▼
+-----------------------------------------------------------------------------------+
| LEVEL 2: DETERMINISTIC ARCHITECTURAL INTERPRETATION (Intelligence Layer)          |
| Explainable, evidence-backed rules derived strictly from Level 1 facts:           |
| Architectural roles, layers, policy violations, architecture smells,              |
| dependency paths, entry points, bottlenecks, test gap findings,                  |
| refactoring safety envelopes, debt scores, baseline diffs.                       |
+-----------------------------------------------------------------------------------+
                                         │
                                         ▼
+-----------------------------------------------------------------------------------+
| LEVEL 3: OPTIONAL SEMANTIC / AI INTERPRETATION (Future Optional LLM Layer)       |
| Natural language explanations & semantic candidate assessments:                   |
| Semantic duplicate responsibility analysis, domain naming, architecture summaries,|
| refactoring recommendation narratives. LLM NEVER alters Level 1 facts.           |
+-----------------------------------------------------------------------------------+
```

---

## 9. Proposed Architecture Intelligence Layer

To prevent business logic from leaking into React components or overloading `export-explorer.cjs`, we introduce a dedicated, modular **Architecture Intelligence Layer**.

### Module Organization
This layer will be housed in `explorer/src/lib/intelligence/` (or a dedicated package `explorer/architecture-intelligence/` when extracted) containing clean, testable TypeScript modules:

```text
explorer/src/lib/intelligence/
├── index.ts                     # Main entry point & unified facade
├── roles.ts                     # Role classification engine
├── layers.ts                    # Layer mapping & violation checker
├── smells.ts                    # Architecture smell detection engine
├── paths.ts                     # Dependency path finding algorithms
├── entry-points.ts              # Entry-point classification & reachability
├── bottlenecks.ts               # Critical dependency & hub analyzer
├── test-gaps.ts                 # Risk/impact test protection analyzer
├── data-impact.ts               # Salesforce Object/Field impact tracer
├── security.ts                  # Security boundary & signal analyzer
├── refactoring.ts               # Safety envelope & work sequencing
├── debt.ts                      # Architecture debt quantification
├── domains.ts                   # Subsystem & domain discovery
├── baseline.ts                  # Baseline comparison & diff engine
└── common-finding.ts            # Finding builder & provenance formatter
```

---

## 10. Proposed Shared Data Model

To support future capabilities cleanly without breaking Schema Version 1.0.0, we define the **Explorer Schema Version 2.0.0 Extension Contract**.

```typescript
/**
 * Proposed Architecture Intelligence Extended Contract
 * Schema Version: 2.0.0 (Backwards-compatible extension of 1.0.0)
 */

export type ArchitecturalRoleType =
  | "Controller"
  | "Service"
  | "Repository"
  | "DomainLogic"
  | "Utility"
  | "Trigger"
  | "UIComponent"
  | "Integration"
  | "Test"
  | "Configuration"
  | "DataModel"
  | "External"
  | "Unknown";

export type ArchitecturalLayerType =
  | "Presentation"
  | "Application"
  | "Domain"
  | "Data"
  | "Integration"
  | "Platform"
  | "Test"
  | "External"
  | "Unknown";

export type FindingSeverity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";

export interface ArchitectureFinding {
  id: string;
  type: string; // e.g., "CIRCULAR_DEPENDENCY", "LAYER_VIOLATION", "UNTESTED_HIGH_RISK"
  severity: FindingSeverity;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  title: string;
  summary: string;
  nodeIds: string[];
  edgeIds: string[];
  evidence: Array<{
    file: string;
    line: number | null;
    snippet: string;
    description: string;
  }>;
  reasons: string[];
  remediationHints: string[];
}

export interface ComponentRoleMapping {
  nodeId: string;
  role: ArchitecturalRoleType;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  classificationReason: string;
  evidence: string[];
}

export interface ComponentLayerMapping {
  nodeId: string;
  layer: ArchitecturalLayerType;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  classificationReason: string;
}

export interface ArchitectureProfileConfig {
  profileName: string;
  version: string;
  layers: Array<{
    name: ArchitecturalLayerType;
    allowedDependencies: ArchitecturalLayerType[];
  }>;
  customRoleRules?: Array<{
    pattern: string;
    role: ArchitecturalRoleType;
  }>;
  criticalityMappings?: Record<string, "CRITICAL" | "HIGH" | "MEDIUM" | "LOW">;
}

export interface ArchitectureBaselineSnapshot {
  snapshotId: string;
  createdAt: string;
  nodeCount: number;
  edgeCount: number;
  cycleCount: number;
  unresolvedCount: number;
  findingsCount: number;
  nodeHashes: Record<string, string>; // nodeId -> metrics/signature hash
}

export interface ArchitectureDiffResult {
  baselineId: string;
  currentGeneratedAt: string;
  addedNodes: string[];
  removedNodes: string[];
  addedEdges: Array<{ source: string; target: string; type: string }>;
  removedEdges: Array<{ source: string; target: string; type: string }>;
  newCycles: string[][];
  resolvedCycles: string[][];
  newSmells: ArchitectureFinding[];
  resolvedSmells: ArchitectureFinding[];
  riskChanges: Array<{ nodeId: string; oldRisk: string; newRisk: string }>;
}
```

---

## 11. Common Finding Model

All architectural findings, smells, policy violations, and security alerts MUST use the standardized `ArchitectureFinding` structure.

```json
{
  "id": "finding-layer-viol-001",
  "type": "LAYER_VIOLATION",
  "severity": "HIGH",
  "confidence": "HIGH",
  "title": "Layer Violation: Presentation directly accesses Data Layer",
  "summary": "LWC component AssetDashboard directly queries CustomObject Asset__c bypassing Service layer.",
  "nodeIds": ["LWC:AssetDashboard", "CustomObject:Asset__c"],
  "edgeIds": ["LWC:AssetDashboard|CustomObject:Asset__c|soql-object||Asset__c"],
  "evidence": [
    {
      "file": "force-app/main/default/lwc/assetDashboard/assetDashboard.js",
      "line": 45,
      "snippet": "SELECT Id, Status__c FROM Asset__c",
      "description": "Direct SOQL reference to CustomObject in UI component"
    }
  ],
  "reasons": [
    "Configured Architecture Profile 'Enterprise-Layered' forbids Presentation -> Data direct dependency."
  ],
  "remediationHints": [
    "Refactor SOQL query out of LWC component into an Apex Controller / Service class (AssetDashboardService)."
  ]
}
```

---

## 12. Evidence / Provenance Model

Every derived architectural interpretation MUST maintain full provenance back to Level 1 facts and source code.

```text
Derived Conclusion (Finding / Role / Layer)
          │
          ├── Rule Applied (e.g. Architecture Profile Layer Constraints)
          ├── Source Node ID / Edge ID
          ├── Exact File Path, Line, Column
          └── Code Evidence Snippet (from analyzer output)
```

---

## 13. Versioning Strategy

To guarantee strict backward compatibility and eliminate silent parsing failures:
1. **Schema Versioning:**
   - Contract Version `1.0.0`: Baseline contract (`explorer-contract.ts`).
   - Contract Version `2.0.0`: Extended contract supporting `findings`, `roles`, `layers`, `subsystems`, and `baselines`.
2. **Backward Compatibility:** Explorer Version 2.0 UI MUST seamlessly parse and gracefully render Schema Version 1.0 data by running client-side fallback enrichment when version 2.0 fields are absent.
3. **Incompatibility Protection:** The Explorer UI checks `schemaVersion`. If an unsupported future major schema version is supplied, a clear user-facing error message is rendered.

---

## 14. Determinism Requirements

Determinism is mandatory across all pipeline outputs:
* **Input-Output Equality:** Given identical source code and identical configuration, the adapter and intelligence engines MUST output identical JSON bytes.
* **Deterministic Sorting:** All arrays (nodes, edges, cycles, findings, path search results) MUST be sorted lexicographically by stable IDs (`Type:Name` or `id`) before output.
* **Timestamp Neutrality:** Generated timestamps (`generatedAt`) must be excluded from equality checks during automated testing.

---

## 15. Performance Strategy

To ensure fluid performance across repos ranging from 100 to 10,000 components:

| Node Count | Performance Strategy & Mechanisms |
| :--- | :--- |
| **100 - 500 Nodes** | Direct Cytoscape rendering, instant client-side graph calculations. |
| **500 - 1,000 Nodes** | Cytoscape layout caching, debounced search filters, memoized neighborhood calculations. |
| **1,000 - 5,000 Nodes** | Progressive disclosure rendering (System/Domain high-level maps first), canvas virtualization, indexed adjacency lists (`Map<nodeId, Edge[]>`), BFS depth limits (default max depth = 3). |
| **5,000 - 10,000 Nodes** | Offload path search and graph clustering to Web Workers; canvas LOD (Level of Detail) rendering; pre-computed reachability matrices in adapter. |

---

## 16. Analyzer Change Assessment

A comprehensive feature-by-feature assessment of whether `dependency-analyzer.cjs` v13 facts are sufficient or require future enhancements:

| Feature Capability | Current Analyzer Support | Missing Fact / Enhancement | Required Analyzer Change? |
| :--- | :--- | :--- | :--- |
| **Fan-in / Fan-out / Risk / Cycles** | 100% Fully Supported | None | **NO** |
| **Architectural Roles** | 90% Supported | Fine-grained classification for external integrations | **NO** (Adapter/UI derived) |
| **Architectural Layers** | 100% Supported | Configurable project profile rules | **NO** (Adapter/UI derived) |
| **Architecture Smells** | 100% Supported | Derived from coupling, cycles, and risk | **NO** (Adapter/UI derived) |
| **Dependency Paths** | 100% Supported | Computed over edge graph | **NO** (Frontend/Intelligence derived) |
| **Entry Points** | 100% Supported | AST identifies LWC, Triggers, Flows, RestApex | **NO** |
| **Test Protection Gaps** | 100% Supported | `isTest`, `impactedTests`, and risk facts exist | **NO** |
| **Object / Field Impact** | 100% Supported | Edges include `soql-object`, `field-reference` | **NO** |
| **Security Surface** | 90% Supported | `sharing` mode, query/DML counts exist | **NO** |
| **Change Simulator** | 100% Supported | Uses `impactSummaries` and transitive edges | **NO** |
| **Refactoring Readiness** | 100% Supported | Uses risk, cycles, unresolved, and tests | **NO** |
| **Architecture Baseline & Diff**| 100% Supported | Compares two `explorer-data.json` snapshots | **NO** |
| **Exact Apex Line Coverage %** | 0% (Static only) | Executed bytecode coverage statistics | **YES** (Future Analyzer v14 option if runtime coverage added) |

---

## 17. Adapter Evolution Strategy

To keep `scripts/export-explorer.cjs` clean, maintainable, and fast:
1. **Maintain Thin Core:** `export-explorer.cjs` remains responsible for standardizing input files and generating baseline `explorer-data.json`.
2. **Modular Intelligence Pipeline:** Complex derived artifacts (roles, layers, findings) are built by importing modular pure JS/TS functions rather than overloading `export-explorer.cjs` with single-file spaghetti code.
3. **Validation Suite Extension:** `scripts/test-export-explorer.cjs` will be expanded with new invariant checks for Schema 2.0 finding structures and provenance integrity.

---

## 18. Frontend Evolution Strategy

To ensure high performance and prevent domain logic cluttering React UI components:
1. **Centralized Architecture State (`useArchitectureStore`):** State management (selected node, focus depth, filter facets, baseline comparisons, findings) will be managed via a clean custom React hook or lightweight store (`zustand`).
2. **Pure Presentational Components:** React components (`GraphView`, `DetailsPanel`, `DiagnosticsPanel`, `SmellsPanel`, `PathExplorerPanel`) consume pre-calculated intelligence models and render presentationally.
3. **Web Worker Offloading:** Expensive pathfinding or baseline diff operations over 2,000+ nodes execute off the main UI thread via standard Web Workers.

---

## 19. Architecture Profiles

The system supports configurable project-specific architecture rules via an optional `architecture-profile.json` configuration file:

```json
{
  "profileName": "Salesforce-Enterprise-Layered",
  "version": "1.0.0",
  "layers": [
    {
      "name": "Presentation",
      "allowedDependencies": ["Application", "Domain", "Platform"]
    },
    {
      "name": "Application",
      "allowedDependencies": ["Domain", "Data", "Platform", "Integration"]
    },
    {
      "name": "Domain",
      "allowedDependencies": ["Data", "Platform"]
    },
    {
      "name": "Data",
      "allowedDependencies": ["Platform"]
    }
  ],
  "customRoleRules": [
    { "pattern": ".*Controller$", "role": "Controller" },
    { "pattern": ".*Service$", "role": "Service" },
    { "pattern": ".*Selector$", "role": "Repository" }
  ]
}
```

---

## 20. Feature-by-Feature Ownership Matrix

| Capability Feature | Level 1: Analyzer Fact | Level 2: Adapter / Intelligence | Level 2: Explorer UI | Configuration | Level 3: Optional LLM |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Metrics (FanIn/Out/Risk)** | ✓ | | | | |
| **Cycles (Tarjan SCC)** | ✓ | | | | |
| **Unresolved References** | ✓ | | | | |
| **Architectural Roles** | | ✓ | ✓ | Optional | |
| **Architectural Layers** | | ✓ | ✓ | ✓ | |
| **Architecture Smells Engine** | | ✓ | ✓ | ✓ | |
| **Dependency Path Explorer** | | | ✓ | | |
| **Entry Point Analysis** | | ✓ | ✓ | | |
| **Critical Bottlenecks** | | ✓ | ✓ | | |
| **Test Protection Gaps** | | ✓ | ✓ | | |
| **Object / Field Impact** | | ✓ | ✓ | | |
| **Security Surface** | | ✓ | ✓ | | |
| **Integration Boundaries** | | ✓ | ✓ | | |
| **Change Simulator** | | ✓ | ✓ | | |
| **Refactoring Safety Envelope**| | ✓ | ✓ | | |
| **Refactoring Work Sequencing**| | ✓ | ✓ | | |
| **Architecture Debt Score** | | ✓ | ✓ | | |
| **Business Criticality** | | | ✓ | ✓ | |
| **Subsystem Discovery** | | ✓ | ✓ | | |
| **Multi-Level Maps** | | ✓ | ✓ | | |
| **Refactoring Outcomes** | | ✓ | ✓ | | |
| **Baseline & Diff Engine** | | ✓ | ✓ | | |
| **Quality Gates & CI** | | ✓ | | ✓ | |
| **Architecture Governance** | | ✓ | ✓ | ✓ | |
| **Architecture Health** | | ✓ | ✓ | | |
| **One-Command Workflow** | | ✓ | | | |
| **Semantic Duplicate Analysis**| | | | | Future ✓ |
| **AI Refactoring Planner** | | | | | Future ✓ |

---

## 21. Feature Dependency Graph

```text
[Architecture Intelligence Foundation (Data Models & Contract v2.0)]
                                 │
         ┌───────────────────────┼───────────────────────┐
         ▼                       ▼                       ▼
[Architectural Roles]   [Architectural Layers]  [Common Finding Model]
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 ▼
                     [Architecture Smells Engine]
                                 │
         ┌───────────────────────┼───────────────────────┐
         ▼                       ▼                       ▼
 [Path Explorer]        [Entry Points]          [Test Protection Gaps]
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 ▼
                 [Refactoring Intelligence Engine]
                   (Simulator / Safety / Sequencing)
                                 │
         ┌───────────────────────┼───────────────────────┐
         ▼                       ▼                       ▼
 [Architecture Debt]     [Baseline & Diff]     [Quality Gates & CI]
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 ▼
               [Multi-Level Subsystem Architecture Map]
                                 │
                                 ▼
             [Optional LLM Semantic Capabilities Layer]
```

---

## 22. Recommended Implementation Sequence

To maintain continuous build stability and strict testability, future implementation should proceed in four ordered phases:

* **Phase I: Core Intelligence Foundation & Classification** (Prompts 16–18)
  - Contract v2.0 extensions, Architectural Roles, Architectural Layers, Profile Config, Common Finding Model.
* **Phase II: Architecture Smells, Paths, Entry Points & Test Gaps** (Prompts 19–21)
  - Smell Engine, Dependency Path Explorer, Entry Point Analyzer, Critical Bottlenecks, Test Protection Gap Analyzer.
* **Phase III: Advanced Refactoring Intelligence, Debt & Governance** (Prompts 22–24)
  - Object/Field Impact, Refactoring Safety Envelope & Sequencing, Architecture Debt Quantification, Quality Gates & Governance CLI.
* **Phase IV: Multi-Level Architecture, Baseline Diff & Optional LLM Integration** (Prompts 25–27)
  - Subsystem Discovery, Baseline & Diff Engine, Progressive Multi-Level Maps, Optional Semantic LLM Candidate Analysis.

---

## 23. Proposed Jules Prompt Boundaries

The following detailed prompt definitions specify the exact scope for future independent Jules implementation sessions:

---

### PROMPT 16: Architecture Intelligence Foundation & Architectural Roles / Layers
* **Objective:** Implement the Architecture Intelligence Foundation data types (Contract v2.0 extensions), the deterministic Architectural Role Classification module, and the Architectural Layer Mapping engine.
* **Prerequisites:** Prompt 15 master baseline complete.
* **Files to Inspect:** `explorer-contract.ts`, `scripts/export-explorer.cjs`, `explorer/src/lib/readiness.ts`.
* **Files Likely to Modify:** `explorer-contract.ts` (extend types), `explorer/src/lib/intelligence/roles.ts` (new), `explorer/src/lib/intelligence/layers.ts` (new), `explorer/src/components/DetailsPanel.tsx` (display roles/layers).
* **Files MUST NOT Modify:** `dependency-analyzer.cjs`.
* **Expected Outputs:** Role & layer classification engines with 100% unit test coverage; UI displays assigned role and layer badges in component drawers.
* **Tests:** `npm test` in `explorer/` and `node scripts/test-export-explorer.cjs`.
* **Acceptance Criteria:** Every component is deterministically assigned a Role and Layer with evidence; zero regressions on existing tests.

---

### PROMPT 17: Architecture Smells Engine & Common Finding Model
* **Objective:** Build the Common Finding Model and the Architecture Smells Engine to automatically detect circular dependencies, god components, layer violations, and untested high-risk components.
* **Prerequisites:** Prompt 16 complete.
* **Files to Inspect:** `explorer/src/lib/intelligence/roles.ts`, `explorer/src/lib/intelligence/layers.ts`.
* **Files Likely to Modify:** `explorer/src/lib/intelligence/common-finding.ts` (new), `explorer/src/lib/intelligence/smells.ts` (new), `explorer/src/components/DiagnosticsPanel.tsx` (add Smells tab).
* **Files MUST NOT Modify:** `dependency-analyzer.cjs`.
* **Expected Outputs:** Deterministic smell detection engine generating standardized `ArchitectureFinding` objects; interactive Smells inspector in Explorer UI.
* **Tests:** Vitest suite for smell detection algorithms across edge cases.
* **Acceptance Criteria:** Correctly identifies layer violations and hubs with full line-level evidence provenance.

---

### PROMPT 18: Dependency Path Explorer & Entry-Point Analysis
* **Objective:** Implement interactive transitive dependency path finding between any two components and automated entry-point detection (LWC, Triggers, Flows, RestApex).
* **Prerequisites:** Prompt 16 complete.
* **Files to Inspect:** `explorer/src/lib/focus-graph.ts`, `explorer/src/components/GraphView.tsx`.
* **Files Likely to Modify:** `explorer/src/lib/intelligence/paths.ts` (new), `explorer/src/lib/intelligence/entry-points.ts` (new), `explorer/src/components/PathExplorerPanel.tsx` (new UI component).
* **Files MUST NOT Modify:** `dependency-analyzer.cjs`.
* **Expected Outputs:** Multi-path search engine displaying direct/transitive paths between components with cycle handling and UI path highlighting.
* **Tests:** Vitest suite covering cyclic graphs, disconnected nodes, and depth limits.
* **Acceptance Criteria:** Traces paths accurately with sub-10ms response times for graphs up to 2,000 nodes.

---

### PROMPT 19: Critical Bottlenecks & Test Protection Gap Analysis
* **Objective:** Implement critical dependency bottleneck detection and high-risk test gap findings.
* **Prerequisites:** Prompts 16 and 17 complete.
* **Files to Inspect:** `explorer/src/lib/hotspots.ts`, `explorer/src/lib/health.ts`.
* **Files Likely to Modify:** `explorer/src/lib/intelligence/bottlenecks.ts` (new), `explorer/src/lib/intelligence/test-gaps.ts` (new), `explorer/src/components/HotspotPanel.tsx`.
* **Files MUST NOT Modify:** `dependency-analyzer.cjs`.
* **Expected Outputs:** Chokepoint identification and explicit HIGH-RISK + UNTESTED findings.
* **Tests:** Vitest suite testing bottleneck centrality algorithms and test protection checks.
* **Acceptance Criteria:** Clearly distinguishes between "no tests detected", "tests present", and "test coverage verified".

---

### PROMPT 20: Refactoring Safety Envelope & Sequencing Engine
* **Objective:** Enhance the Change Simulator with a Refactoring Safety Envelope (SAFE, CAUTION, HIGH CAUTION) and automated refactoring work sequencing.
* **Prerequisites:** Prompts 17 and 19 complete.
* **Files to Inspect:** `explorer/src/lib/change-simulator.ts`, `explorer/src/lib/readiness.ts`.
* **Files Likely to Modify:** `explorer/src/lib/intelligence/refactoring.ts` (new), `explorer/src/components/ChangeSimulatorPanel.tsx`.
* **Files MUST NOT Modify:** `dependency-analyzer.cjs`.
* **Expected Outputs:** Conservative refactoring safety scoring and step-by-step cycle-unblocking sequencing recommendations.
* **Tests:** Vitest suite verifying conservative safety classification logic.
* **Acceptance Criteria:** Language uses conservative impact estimation; clear step-by-step sequencing for unblocking circular dependencies.

---

### PROMPT 21: Architecture Debt Quantification & Quality Gates CLI
* **Objective:** Implement overall Architecture Debt Quantification scoring and the CLI Quality Gate tool (`npm run architecture:check`).
* **Prerequisites:** Prompts 17, 19, and 20 complete.
* **Files to Inspect:** `scripts/export-explorer.cjs`, `package.json`.
* **Files Likely to Modify:** `explorer/src/lib/intelligence/debt.ts` (new), `scripts/architecture-check.cjs` (new CLI script), `package.json` (add script).
* **Files MUST NOT Modify:** `dependency-analyzer.cjs`.
* **Expected Outputs:** CLI quality gate tool evaluating PASS/WARN/FAIL policies against analysis outputs for CI/CD pipelines.
* **Tests:** CLI validation tests for pass/fail exit codes.
* **Acceptance Criteria:** `npm run architecture:check` executes in under 2 seconds and returns exit code 0 on pass, 1 on policy failure.

---

### PROMPT 22: Baseline Comparison & Diff Engine
* **Objective:** Implement architecture snapshot comparison to highlight added/removed components, new/resolved cycles, and risk delta between baseline and current runs.
* **Prerequisites:** Prompt 21 complete.
* **Files to Inspect:** `explorer-contract.ts`, `scripts/export-explorer.cjs`.
* **Files Likely to Modify:** `explorer/src/lib/intelligence/baseline.ts` (new), `explorer/src/components/BaselineDiffPanel.tsx` (new).
* **Files MUST NOT Modify:** `dependency-analyzer.cjs`.
* **Expected Outputs:** Comparative diff engine and Explorer UI baseline overlay.
* **Tests:** Vitest suite testing baseline JSON diffing across edge cases.
* **Acceptance Criteria:** Accurately highlights diffs without modifying underlying source graphs.

---

### PROMPT 23: Multi-Level Progressive Subsystem Architecture Maps
* **Objective:** Introduce hierarchical multi-level architecture maps (System $\rightarrow$ Domain $\rightarrow$ Subsystem $\rightarrow$ Component) for Cytoscape graph navigation.
* **Prerequisites:** Prompts 16 and 22 complete.
* **Files to Inspect:** `explorer/src/components/GraphView.tsx`.
* **Files Likely to Modify:** `explorer/src/lib/intelligence/domains.ts` (new), `explorer/src/components/GraphView.tsx` (add compound node layout support).
* **Files MUST NOT Modify:** `dependency-analyzer.cjs`.
* **Expected Outputs:** Drill-down graph interaction preventing node explosion on large orgs.
* **Tests:** Cytoscape rendering and aggregation logic tests.
* **Acceptance Criteria:** Supports smooth progressive disclosure across 5,000+ component repositories.

---

### PROMPT 24: Optional Semantic LLM Candidate Integration (Duplicate Responsibility & Explanations)
* **Objective:** Add an optional, decoupled LLM helper module that consumes Level 2 deterministic candidate finding JSONs and generates natural language refactoring explanations.
* **Prerequisites:** Prompts 17, 20, and 21 complete.
* **Files to Inspect:** `explorer/src/lib/intelligence/common-finding.ts`.
* **Files Likely to Modify:** `explorer/src/lib/intelligence/llm-explain.ts` (new optional module).
* **Files MUST NOT Modify:** `dependency-analyzer.cjs`, `scripts/export-explorer.cjs`.
* **Expected Outputs:** Strictly optional semantic explanation layer; zero impact when offline or API key is absent.
* **Tests:** Unit tests with mocked LLM responses verifying fallback behavior when offline.
* **Acceptance Criteria:** LLM operates strictly downstream on Level 2 JSON context; zero alteration of graph facts or metrics.

---

## 24. Risks

| Identified Risk | Risk Severity | Mitigation Strategy |
| :--- | :---: | :--- |
| **Logic Scatter across UI Components** | HIGH | Enforce modular Intelligence Layer (`src/lib/intelligence/`) for all business logic. UI components remain strictly presentational. |
| **Adapter Bloat in `export-explorer.cjs`** | MEDIUM | Keep adapter focused on normalization and JSON output. Import modular intelligence TS files for derived fields. |
| **Graph Performance Degradation (>5k nodes)** | HIGH | Implement progressive disclosure rendering (System/Domain maps first) and Web Worker offloading for path search. |
| **Contract Incompatibility** | MEDIUM | Enforce strict schema versioning (1.0.0 vs 2.0.0) with client-side fallback enrichment for older contracts. |
| **Unjustified Severity / Score Claims** | HIGH | Require explicit evidence provenance for all findings. Use conservative, explainable risk language. |

---

## 25. Deferred Features

The following features are intentionally deferred to future roadmap phases beyond Prompt 27:
1. **Architecture Time-Machine (Multi-Year Historical Trend Analysis):** Deferred until snapshot infrastructure and storage retention policies mature.
2. **Architecture Narrative Generator:** Deferred until role and domain discovery engines reach full stability.
3. **Architecture Query Language (AQL):** Deferred until extended contract Schema 2.0 is fully standardized across all production environments.
4. **Exportable PDF/DOCX Executive Architecture Reports:** Deferred until analysis and finding surfaces are finalized.

---

## 26. Open Questions

1. **Exact Bytecode Test Coverage Integration:** Should future versions of `dependency-analyzer.cjs` integrate optional Salesforce Apex CLI code coverage JSONs (`test-result-codecoverage.json`) into Level 1 facts?
   - *Status:* `REQUIRES ANALYZER SUPPORT` (Future Analyzer v14 consideration).
2. **Custom Architecture Profile File Location:** Should `architecture-profile.json` default to the repository root directory or `.sf/` configuration directory?
   - *Status:* `REQUIRES CONFIGURATION` (Defaults to repo root `.architecture-profile.json` with fallback defaults).

---

## 27. Final Recommendation

1. **Adopt Master Plan:** Approve this Master Plan (`ARCHITECTURE_INTELLIGENCE_MASTER_PLAN.md`) as the authoritative architectural blueprint for all future development.
2. **Preserve Source Boundaries:** Maintain `dependency-analyzer.cjs` as the single source of truth for discovered facts, keeping `export-explorer.cjs` as a thin adapter and `explorer/` as a pure client-side UI.
3. **Execute Independent Prompts:** Begin implementation sequentially starting with **Prompt 16 (Architecture Intelligence Foundation & Architectural Roles / Layers)** in the next independent Jules session.
