# Salesforce Architecture & Refactoring Explorer - Stable Data Contract (`explorer-data.json`)

## 1. Overview & Architectural Principles

The `explorer-data.json` schema defines the stable, read-only view model contract for the Salesforce Architecture & Refactoring Explorer.

### Key Principles:
1. **Single Source of Truth**: All dependency analysis, graph construction, metrics, risk scoring, cycle detection, and resolution classification are computed deterministically by `dependency-analyzer.cjs`.
2. **Zero Frontend Recalculation**: The UI must read pre-computed data from `explorer-data.json`. Metrics, risk levels, and circular dependency groups are never recalculated in the frontend.
3. **LLM Independent**: Operates completely without LLM dependencies.
4. **No Database or Backend Required**: Can be statically loaded as a standard JSON artifact or served by a static asset server.
5. **Decoupled Contract**: Exposes stable, view-ready structures rather than raw, internal analyzer registry internals.

---

## 2. Top-Level Schema Structure

```json
{
  "schemaVersion": "1.0.0",
  "analyzerVersion": "13.0.0",
  "generatedAt": "2026-09-10T09:25:00.000Z",
  "sourceDirectory": "force-app/main/default",
  "summary": { ... },
  "nodes": [ ... ],
  "edges": [ ... ],
  "cycles": [ ... ],
  "unresolvedReferences": [ ... ],
  "impactSummaries": { ... }
}
```

---

## 3. Section Specifications

### 3.1 Metadata & Versioning
- `schemaVersion`: Version of the contract schema (e.g., `"1.0.0"`).
- `analyzerVersion`: Version of `dependency-analyzer.cjs` that generated the underlying analysis (e.g., `"13.0.0"`).
- `generatedAt`: ISO-8601 timestamp of analysis execution.
- `sourceDirectory`: Source repository path analyzed.

### 3.2 Summary (`summary`)
Provides immediate high-level repository stats:
- `nodeCount`: Total number of metadata nodes.
- `edgeCount`: Total number of directional dependency edges.
- `highRiskCount`, `mediumRiskCount`, `lowRiskCount`: Count of components per risk level.
- `cycleCount`: Count of strongly connected circular dependency groups.
- `unresolvedCount`: Total count of unresolved external/missing references.
- `inventory`: Breakdown by Salesforce metadata type (`apexClasses`, `apexTriggers`, `lwcJs`, `lwcHtml`, `visualforce`, `flows`, `objects`, `fields`).

### 3.3 Nodes (`nodes`)
Array of metadata component objects formatted for frontend rendering:
- `id`: Unique stable node identifier (e.g. `"ApexClass:AssetDashboardService"`).
- `displayName`: Human-readable name (e.g. `"AssetDashboardService"`).
- `type`: Metadata type (`ApexClass`, `ApexTrigger`, `LWC`, `Visualforce`, `Flow`, `CustomObject`, `CustomField`, `External`).
- `file`: Relative file path.
- `metrics`: Pre-calculated metrics object (`fanIn`, `fanOut`, `coupling`, `unresolved`, `score`).
- `risk`: Risk classification (`"HIGH"`, `"MEDIUM"`, `"LOW"`).
- `riskReasons`: Human-readable reasons for the assigned risk level.
- `behavior`: Pre-extracted component metadata (`isTest`, `sharing`, `publicContractsCount`, `asyncPatterns`, `securitySignalsCount`, `queryCount`, `dmlCount`, `calloutCount`).
- `refactoringReadiness`: Derived readiness indicators (`isHighRisk`, `hasCycles`, `hasUnresolved`, `testCoverageStatus`).

### 3.4 Edges (`edges`)
Array of directional relationships:
- `id`: Unique edge identifier.
- `source`: Source node ID (e.g. `"ApexClass:AssetDashboardService"`).
- `target`: Target node ID (e.g. `"ApexClass:AssetHelper"`).
- `relationshipType`: Relationship type (`method-call`, `instantiation`, `type-reference`, `SOQL`, `DML`, `aura-enabled`, `lwc-import`, `field-reference`, `trigger-on`, `event-publisher`).
- `method`: Target method name if applicable.
- `evidence`: Source code snippet demonstrating the dependency.
- `unresolved`: Boolean indicating whether target resolution failed.
- `resolutionClassification`: Classification category (`RESOLVED_LOCAL`, `RESOLVED_PLATFORM`, `UNKNOWN`).
- `resolutionStrategy`: Strategy used (`EXACT`, `INFERRED`, `LLM`).
- `confidence`: Resolution confidence (`high`, `medium`, `low`).
- `line`, `column`, `methodOwner`, `file`: Source location details.
- `canonical`: Full canonical relationship details.

### 3.5 Cycles (`cycles`)
Array of strongly connected circular dependency groups:
- `id`: Unique cycle group ID (e.g. `"cycle-1"`).
- `size`: Number of participating nodes in cycle.
- `nodes`: Array of node IDs forming the cycle.

### 3.6 Unresolved References (`unresolvedReferences`)
Detailed breakdown of references that could not be resolved to local symbols:
- `edgeId`: Unique edge ID containing the reference.
- `sourceNodeId`: Source node ID.
- `targetName`: Symbol name referenced.
- `targetType`: Expected metadata type.
- `file`, `line`, `evidence`: Location and snippet.
- `reason`: Classification explanation.

### 3.7 Impact Summaries (`impactSummaries`)
Map of node ID to pre-computed impact reachability assessment:
- `directDependencies`: Immediate outbound target node IDs.
- `directDependents`: Immediate inbound dependent node IDs.
- `transitiveDependencies`: Full outbound dependency closure node IDs.
- `transitiveDependents`: Full inbound dependent closure node IDs.
- `impactedTests`: Test class node IDs affected by changes to this component.
- `totalImpactCount`: Total count of affected components.

---

## 4. Support for Future Explorer UI Features

The data contract explicitly supports future frontend features without requiring schema changes:

1. **Search & Filter**: Nodes can be filtered by `displayName`, `type`, `risk`, `file`, or `behavior` flags. Edges can be filtered by `relationshipType` or `unresolved` state.
2. **Focus & Depth Inspection**: `impactSummaries` allows rendering focused subgraphs at arbitrary reachability depth (direct vs transitive).
3. **Evidence & Line Inspection**: `edges.evidence`, `edges.line`, and `edges.methodOwner` provide rich code evidence drawers in the UI.
4. **Risk Explanation**: `nodes.riskReasons` and `nodes.metrics` provide clear tooltips explaining why a component is high risk.
5. **Change Simulation & Refactoring Readiness**: `nodes.refactoringReadiness` combined with `impactSummaries.impactedTests` provides a test safety matrix for planned refactoring.
