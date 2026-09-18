# ARCHITECTURE-AWARE GRAPH SPATIAL LAYOUT

## Master Implementation Specification

**IMPORTANT EXECUTION MODEL**

This document is the master specification for a multi-agent implementation.

It is NOT intended to be executed as one monolithic coding task.

Each coding agent must:

1. Read this entire document before making changes.
2. Execute ONLY the explicitly assigned Agent/Wave task.
3. Respect the file ownership defined by the current task.
4. Not implement functionality belonging to another agent.
5. Not modify unrelated files merely because an improvement seems useful.
6. Preserve existing behavior outside the assigned scope.
7. Never weaken existing tests to make the assigned work pass.
8. Report all discovered cross-agent dependencies instead of silently modifying another agent's files.

The global sections of this document are constraints and architectural context.

The individual Wave/Agent sections are executable tasks.

When a task says "create" a file, inspect the repository first and reuse existing abstractions where appropriate. Do not create duplicate implementations.

When a task conflicts with the actual repository state, trust the actual repository and document the discrepancy before proceeding.

Do not assume the repository still exactly matches the examples in this document.

## Parallel Implementation Plan

You are working on the Salesforce Dependency Analyzer Explorer.

The goal of this work is to improve the **initial/default graph spatial arrangement** so the graph communicates:

* architecture/layers
* domains/subsystems
* dependency direction
* important/high-centrality nodes
* bridge nodes between domains
* local relationships
* tests near production code
* fields near their parent objects
* trigger/handler relationships
* disconnected components
* reduced edge crossings
* reduced unnecessary edge length
* reduced "spider web" appearance
* deterministic and stable placement

The graph should help a user understand the architecture spatially before manually tracing individual edges.

---

# ABSOLUTE ARCHITECTURAL CONSTRAINTS

These constraints are mandatory.

1. `dependency-analyzer.cjs` remains the source of truth for graph facts.
2. Explorer remains read-only/client-side.
3. Do NOT move graph-fact computation into Explorer.
4. Do NOT make `GraphView.tsx` responsible for architecture intelligence.
5. Do NOT involve `orchestrator.js`.
6. Do NOT change Static mode semantics.
7. Do NOT bypass or weaken Position Authority.
8. Existing authoritative positions must continue to win over calculated layout where the existing policy says they should.
9. Initial/default layout and Reset Layout may use the same layout engine, but restoring authoritative positions must remain separate.
10. Do not introduce semantic zoom, compound/multi-level maps, LLM-generated layouts, or analyzer changes in this phase.
11. Do not replace the existing architecture-layout system blindly. First understand and extend it.
12. Preserve deterministic output.
13. Every new behavior must have tests.
14. Do not use arbitrary random positioning.
15. Do not solve the problem merely by increasing spacing.
16. Do not hide dependencies merely to make the graph look cleaner.
17. The final graph must remain a truthful representation of the dependency graph.

---

# CURRENT IMPLEMENTATION YOU MUST PRESERVE AND EXTEND

The current important files are:

* `explorer/src/lib/architecture-layout.ts`
* `explorer/src/lib/architecture-layout.test.ts`
* `explorer/src/lib/graph-layout.ts`
* `explorer/src/lib/position-policy.ts`
* `explorer/src/components/GraphView.tsx`
* `explorer/src/components/GraphView.positionAuthority.test.tsx`
* `explorer/src/components/GraphView.layoutModeToggle.test.tsx`
* `explorer/src/components/GraphView.test.tsx`
* `explorer/src/lib/scalability-layout.test.ts`
* `ARCHITECTURE_INTELLIGENCE_MASTER_PLAN.md`
* `ARCHITECTURE_INTELLIGENCE_CONTRACT.md`
* `EXPLORER_ARCHITECTURE.md`

Current high-level pipeline is approximately:

```text
GraphView
  ↓
graph-layout.ts
  ↓
computeArchitectureLayout()
  ↓
layer classification
  ↓
domain classification
  ↓
bridge detection
  ↓
connected components
  ↓
(layer, domain) buckets
  ↓
fixed X/Y coordinates
  ↓
collision cleanup
```

This is a useful foundation, but it is not yet a true architecture-aware layout optimizer.

---

# EXECUTION MODEL

Work in parallel wherever file ownership allows it.

Do NOT have multiple agents modify the same file simultaneously.

Use the following waves.

---

# WAVE 0 — BASELINE / FILE OWNERSHIP AUDIT

## Agent 0A — Layout Baseline Audit

Read:

```text
explorer/src/lib/architecture-layout.ts
explorer/src/lib/architecture-layout.test.ts
explorer/src/lib/graph-layout.ts
explorer/src/lib/position-policy.ts
explorer/src/components/GraphView.tsx
explorer/src/components/GraphView.positionAuthority.test.tsx
explorer/src/components/GraphView.layoutModeToggle.test.tsx
explorer/src/components/GraphView.test.tsx
explorer/src/lib/scalability-layout.test.ts
ARCHITECTURE_INTELLIGENCE_MASTER_PLAN.md
ARCHITECTURE_INTELLIGENCE_CONTRACT.md
EXPLORER_ARCHITECTURE.md
```

Do not modify code.

Produce:

```text
LAYOUT_BASELINE_AUDIT.md
```

Document:

1. current layout pipeline
2. current layer classification
3. current domain classification
4. current bridge detection
5. current hub/centrality handling
6. current connected-component handling
7. current test placement
8. current field placement
9. current collision handling
10. current deterministic guarantees
11. current position-authority interaction
12. current Static-mode interaction
13. current performance characteristics
14. exact limitations relative to the spatial-arrangement note
15. exact files that each later agent may modify

Do not modify production code.

---

# WAVE 1 — PARALLEL FOUNDATION WORK

After Wave 0 confirms file ownership, run these agents in parallel.

---

## Agent 1A — Architecture Analysis Model

### Primary ownership

New files under:

```text
explorer/src/lib/layout/
```

Do not modify:

```text
GraphView.tsx
position-policy.ts
graph-layout.ts
```

### Task

Create a deterministic intermediate architecture/layout analysis model.

Suggested files:

```text
explorer/src/lib/layout/types.ts
explorer/src/lib/layout/analysis.ts
```

The model should expose enough information for later layout stages:

```text
node
layer
domain
role
isTest
isField
isBridge
hubScore
bridgeScore
fanIn
fanOut
componentId
neighborIds
parentProductionNode
parentObject
```

Do not duplicate analyzer facts.

Use only data already available in Explorer.

The analysis model should be deterministic.

Separate:

```text
hubScore
```

from:

```text
bridgeScore
```

Do not collapse both into one score.

Do not yet implement final coordinates.

### Tests

Create:

```text
explorer/src/lib/layout/analysis.test.ts
```

Test:

* deterministic results
* correct fan-in/fan-out
* hub identification
* bridge identification
* test identification
* field identification
* connected-component assignment

---

# Agent 1B — Layer Classification

### Primary ownership

Create:

```text
explorer/src/lib/layout/layers.ts
explorer/src/lib/layout/layers.test.ts
```

Do not rewrite GraphView.

### Task

Extract/improve layer classification currently embedded in:

```text
architecture-layout.ts
```

Preserve existing semantics unless there is strong evidence that a change is required.

Layers remain:

```text
presentation
application
domain
schema
```

Classification should prioritize structural evidence over naming.

Use evidence such as:

1. node type
2. Salesforce-specific type
3. behavior
4. dependency relationships
5. file path/location
6. naming convention as fallback

Maintain deterministic fallback behavior.

Document ambiguous cases.

Do not implement domain layout or coordinates.

---

# Agent 1C — Domain Discovery

### Primary ownership

Create:

```text
explorer/src/lib/layout/domains.ts
explorer/src/lib/layout/domains.test.ts
```

### Task

Improve domain/subsystem inference.

Do NOT rely solely on:

```text
OrderService → Order
PaymentProcessor → Payment
```

Naming remains useful, but domain inference should combine available evidence.

Use, where available:

* node names
* Salesforce type
* filesystem path
* folder/module structure
* connected neighbors
* shared objects
* dependency neighborhood
* production/test relationships

A domain should represent a meaningful subsystem rather than merely a suffix-stripped class name.

Preserve `Shared` for genuinely cross-cutting/ambiguous nodes.

Do not invent domains from arbitrary individual node names when the evidence is weak.

Produce deterministic domain IDs.

### Tests

Include synthetic cases for:

* same-domain classes
* cross-domain dependencies
* shared utilities
* shared objects
* fields inheriting object domain
* tests inheriting production domain
* ambiguous nodes
* naming conflicts

---

# Agent 1D — Layout Metrics

### Primary ownership

Create:

```text
explorer/src/lib/layout/metrics.ts
explorer/src/lib/layout/metrics.test.ts
```

### Task

Create deterministic quantitative metrics for evaluating layouts.

At minimum implement:

```text
edgeCrossingCount
averageEdgeLength
maxEdgeLength
layerViolationCount
nodeOverlapCount
domainCohesionScore
componentSeparationScore
```

If practical also implement:

```text
hubLocalityScore
bridgePlacementScore
```

The metrics must be independent from the UI.

They must accept graph data + positions.

No mutation.

No randomness.

### Important

These metrics are for engineering validation.

Do not create an arbitrary weighted "beauty score" that hides individual failures.

Individual metrics must remain inspectable.

---

# Agent 1E — Synthetic / Benchmark Graph Fixtures

### Primary ownership

Create:

```text
explorer/src/lib/layout/fixtures/
```

and tests/fixtures only.

Do not modify layout implementation.

Create deterministic benchmark graphs representing:

1. simple layered architecture
2. two-domain architecture
3. multi-domain Food Delivery-style architecture
4. hub-heavy architecture
5. bridge-heavy architecture
6. many tests
7. many fields
8. trigger/handler microcluster
9. disconnected components
10. long dependency chains
11. dense cross-domain graph
12. sparse graph
13. 100+ node graph

The fixtures must make layout regressions measurable.

---

# WAVE 2 — GLOBAL ARCHITECTURE LAYOUT

Run Agents 2A, 2B and 2C in parallel.

They must not modify the same files.

---

# Agent 2A — Domain-Level Global Layout

### Ownership

Create:

```text
explorer/src/lib/layout/global-layout.ts
explorer/src/lib/layout/global-layout.test.ts
```

### Task

Implement the global architecture layout stage.

The conceptual process must be:

```text
nodes
 ↓
domains/components
 ↓
domain dependency graph
 ↓
global domain arrangement
 ↓
node-level arrangement
```

Do NOT simply assign:

```text
domain A = x=0
domain B = x=380
domain C = x=760
```

unless the domain graph actually supports that ordering.

Use domain relationships to determine spatial proximity/order.

Goals:

* related domains close together
* heavily connected domains not unnecessarily separated
* bridge domains/nodes have meaningful intermediate positions
* independent domains/components remain separated
* major architecture flow is visually understandable

Evaluate whether a layered/Sugiyama-style strategy is appropriate.

If using a custom implementation, keep it deterministic.

Do not introduce a large third-party dependency without documenting the tradeoff.

---

# Agent 2B — Layer Ordering / Crossing Minimization

### Ownership

Create:

```text
explorer/src/lib/layout/ordering.ts
explorer/src/lib/layout/ordering.test.ts
```

### Task

Implement relationship-aware ordering within layers.

The current implementation primarily sorts by:

```text
fanIn + fanOut
```

That is insufficient.

Implement deterministic ordering intended to reduce edge crossings.

Consider standard techniques such as:

* barycenter ordering
* median ordering
* forward/backward sweeps
* deterministic tie breaking

The algorithm must respect:

* architecture layers
* domain boundaries
* locked/authoritative positions where applicable
* deterministic ordering

Do not modify Position Authority.

Do not implement UI behavior.

---

# Agent 2C — Component Packing

### Ownership

Create:

```text
explorer/src/lib/layout/components.ts
explorer/src/lib/layout/components.test.ts
```

### Task

Implement deterministic disconnected-component packing.

Do not use only:

```text
currentComponentXOffset += maxX + gap
```

Instead use component bounding boxes.

Requirements:

* no component overlap
* predictable spacing
* compact packing
* deterministic ordering
* large components do not create pathological empty space
* components remain visually distinguishable

The algorithm should work for different component aspect ratios.

---

# WAVE 3 — LOCAL CLUSTER ARRANGEMENT

Run Agents 3A, 3B and 3C in parallel.

---

# Agent 3A — Primary Node Local Layout

### Ownership

Create:

```text
explorer/src/lib/layout/local-layout.ts
explorer/src/lib/layout/local-layout.test.ts
```

### Task

Implement node-level layout inside each architecture/domain region.

Priority:

1. major production nodes
2. high-centrality nodes
3. bridge nodes
4. ordinary production nodes
5. supporting nodes
6. tests
7. fields

Do not let secondary nodes distort the primary architecture.

Production nodes should form coherent local clusters.

Use relationship information to keep strongly connected nodes close.

---

# Agent 3B — Hubs and Bridges

### Ownership

Create:

```text
explorer/src/lib/layout/centrality.ts
explorer/src/lib/layout/centrality.test.ts
```

### Task

Implement deterministic hub and bridge analysis.

Hub score and bridge score must remain distinct.

Hub placement should influence local spatial hierarchy.

Bridge placement should reflect the domains it connects.

A bridge should not simply be placed at the arithmetic average of domain X positions if that creates crossings or excessive edge lengths.

Tests must verify:

* high fan-in hubs
* high fan-out hubs
* bidirectional hubs
* two-domain bridges
* multi-domain bridges
* bridges inside different layers

---

# Agent 3C — Tests / Fields / Trigger Satellites

### Ownership

Create:

```text
explorer/src/lib/layout/satellites.ts
explorer/src/lib/layout/satellites.test.ts
```

### Task

Treat tests and fields as secondary/satellite information.

Rules:

### Tests

* stay near their production target
* inherit production layer/domain
* do not become architecture hubs
* do not push production nodes far away
* multiple tests should form a compact local cluster

### Fields

* stay near parent object
* inherit parent domain
* remain visually secondary
* should not force large global spacing

### Trigger/Handler

When a trigger and handler relationship exists:

* keep them close
* preserve architectural layer semantics
* avoid allowing trigger nodes to become isolated decorations

The implementation must be deterministic.

---

# WAVE 4 — SPATIAL OPTIMIZATION

Run Agents 4A and 4B in parallel.

---

# Agent 4A — Spacing / Collision / Spatial Cleanup

### Ownership

Create:

```text
explorer/src/lib/layout/spacing.ts
explorer/src/lib/layout/spacing.test.ts
```

### Task

Implement the final spatial cleanup stage.

It must address:

* node overlaps
* insufficient spacing
* excessive spacing
* domain boundary clarity
* layer spacing
* component spacing
* local cluster compactness

Do NOT simply push every collision by arbitrary offsets.

Use deterministic geometry.

The cleanup must preserve architecture relationships.

It must not destroy good edge routing merely to eliminate one overlap.

---

# Agent 4B — Layout Evaluation Harness

### Ownership

Create:

```text
explorer/src/lib/layout/evaluate-layout.ts
explorer/src/lib/layout/evaluate-layout.test.ts
```

### Task

Create a reusable evaluator that compares:

```text
current layout
vs
new architecture layout
```

using the metrics from Agent 1D.

It should produce machine-readable diagnostics such as:

```text
crossings
average edge length
max edge length
layer violations
overlaps
domain cohesion
component separation
```

Do not declare one layout "better" using a single arbitrary score.

Show each metric independently.

This will be used by the integration agent.

---

# WAVE 5 — ORCHESTRATOR INTEGRATION

This wave must happen AFTER Waves 1–4 are complete.

Only one agent owns the integration.

# Agent 5A — Architecture Layout Orchestrator

### Ownership

Primary:

```text
explorer/src/lib/architecture-layout.ts
explorer/src/lib/graph-layout.ts
```

Modify only after reviewing all previous agent outputs.

### Task

Refactor the current architecture layout into a staged deterministic pipeline:

```text
normalize graph
    ↓
architecture analysis
    ↓
layer assignment
    ↓
domain assignment
    ↓
hub/bridge analysis
    ↓
connected components
    ↓
domain-level global layout
    ↓
layer ordering / crossing reduction
    ↓
primary local node layout
    ↓
bridge/hub placement
    ↓
tests / fields / trigger satellites
    ↓
component packing
    ↓
spatial cleanup
    ↓
final positions
```

The existing public API should remain compatible wherever possible.

Do not make GraphView know about any of these internal stages.

`graph-layout.ts` should remain a thin adapter between Cytoscape and the architecture layout engine.

---

# CRITICAL POSITION-AUTHORITY INTEGRATION

Before modifying anything related to existing positions, read:

```text
explorer/src/lib/position-policy.ts
explorer/src/components/GraphView.tsx
explorer/src/components/GraphView.positionAuthority.test.tsx
```

The layout engine produces candidate positions.

Position Authority determines whether those positions are actually authoritative.

Do NOT make calculated layout silently override:

1. session positions
2. persisted positions
3. existing Cytoscape positions

when the policy says they should win.

If `existingPositions` currently exists inside `architecture-layout.ts`, carefully separate:

```text
layout calculation
```

from:

```text
position authority
```

without breaking existing tests.

---

# WAVE 6 — GRAPHVIEW INTEGRATION

# Agent 6A

### Ownership

Only:

```text
explorer/src/components/GraphView.tsx
explorer/src/components/GraphView*.test.tsx
```

### Task

Integrate the improved layout engine without changing behavior outside layout calculation.

Verify:

### Initial load

If there is no authoritative position:

```text
architecture-aware layout
```

may be applied.

If authoritative positions exist:

```text
authoritative positions win
```

### Static mode

Must remain unchanged.

Do not introduce automatic relayout into:

* graph update
* filter change
* focus change
* investigation
* mode switch

unless the existing policy explicitly permits it.

### Interactive mode

Preserve current Position Authority semantics.

### Reset Layout

Reset Layout should intentionally calculate a fresh architecture-aware layout.

It should then capture/persist the resulting positions exactly as current behavior expects.

### New nodes

Preserve deterministic new-node placement.

Do not re-layout the entire graph merely because a new node appears.

---

# WAVE 7 — TESTING / REGRESSION

Run these agents in parallel.

---

# Agent 7A — Existing Test Regression

Run the entire Explorer test suite.

Pay particular attention to:

```text
architecture-layout.test.ts
GraphView.positionAuthority.test.tsx
GraphView.layoutModeToggle.test.tsx
GraphView.test.tsx
scalability-layout.test.ts
```

Do not weaken existing assertions merely to make the new implementation pass.

Fix genuine regressions.

---

# Agent 7B — Spatial Quality Tests

Add tests that verify:

## Layer ordering

Presentation appears before application, then domain, then schema.

## Domain cohesion

Nodes belonging to the same domain are spatially coherent.

## Dependency flow

Strong dependency relationships should not produce unnecessary long edges.

## Crossing reduction

The layout should reduce crossings compared with the old deterministic layout on benchmark fixtures.

## Hub locality

High-centrality nodes should remain meaningfully positioned relative to their dependents/dependencies.

## Bridge placement

Cross-domain bridge nodes should sit between the relevant domain regions where appropriate.

## Tests

Tests remain near their production nodes.

## Fields

Fields remain near their parent objects.

## Components

Disconnected components do not overlap.

## No overlaps

Nodes do not overlap after final cleanup.

## Determinism

Same graph + same options = identical coordinates.

## Stability

Small graph changes should not arbitrarily scramble unrelated regions.

---

# WAVE 8 — PERFORMANCE / SCALABILITY

# Agent 8A

Benchmark:

```text
10 nodes
50 nodes
100 nodes
250 nodes
500 nodes
1000 nodes
```

Use deterministic fixtures.

Measure layout calculation time.

Check:

* no accidental O(n³) or worse behavior
* no repeated full-graph recomputation where unnecessary
* no pathological collision loops
* no huge memory allocations

Preserve existing scalability expectations.

Do not optimize prematurely at the cost of architecture clarity.

---

# WAVE 9 — VISUAL / UX ACCEPTANCE

# Agent 9A

Use the real Explorer UI and benchmark graphs.

Evaluate visually:

1. Is the architecture immediately understandable?
2. Are major layers visible?
3. Are domains visually coherent?
4. Are important nodes spatially meaningful?
5. Are bridges understandable?
6. Are tests close to production?
7. Are fields close to objects?
8. Are disconnected components separated?
9. Is the center excessively empty?
10. Are there giant outer rings?
11. Does the graph look like a spider web?
12. Are there unnecessary long edges?
13. Are there obvious crossings?
14. Does the graph still feel stable and deterministic?
15. Does Reset Layout produce the expected architecture arrangement?
16. Does Static mode remain unchanged?

Do not judge success merely by aesthetics.

The purpose is architecture comprehension.

Produce:

```text
LAYOUT_VISUAL_ACCEPTANCE.md
```

with concrete observations and screenshots if the environment supports them.

---

# WAVE 10 — FINAL FORENSIC AUDIT

# Agent 10A — Final Architecture/Layout Audit

This agent runs only after all implementation agents finish.

Read all changed layout files and all relevant tests.

Verify:

```text
dependency-analyzer.cjs
        ↓
explorer-data.json
        ↓
Explorer
        ↓
architecture analysis
        ↓
layout
        ↓
Position Authority
        ↓
Cytoscape
```

Confirm no architectural boundary has been violated.

Specifically audit:

* analyzer facts were not duplicated incorrectly
* Explorer does not call orchestrator
* GraphView does not contain architecture algorithms
* Position Authority was not bypassed
* Static mode was not changed
* deterministic behavior remains
* authoritative positions remain authoritative
* reset behavior remains correct
* new-node placement remains correct
* layout modules have clear ownership
* tests cover all new behavior
* no dead code remains from the previous layout implementation
* no duplicate classification logic remains unnecessarily

Produce:

```text
FINAL_LAYOUT_FORENSIC_AUDIT.md
```

Include:

1. changed files
2. architecture before/after
3. algorithm used
4. test coverage
5. benchmark results
6. known limitations
7. any remaining risks

Do not declare success merely because tests pass.

---

# IMPORTANT PARALLEL EXECUTION RULE

The following agents may run simultaneously:

```text
1A Analysis
1B Layers
1C Domains
1D Metrics
1E Fixtures
```

Then:

```text
2A Global Layout
2B Ordering
2C Components
```

Then:

```text
3A Local Layout
3B Centrality
3C Satellites
```

Then:

```text
4A Spacing
4B Evaluation
```

Then sequentially:

```text
5A Integration
6A GraphView
7A/7B Regression
8A Performance
9A Visual Acceptance
10A Final Audit
```

Do NOT allow two agents to modify the same production file concurrently.

---

# FILE OWNERSHIP RULE

Before each wave starts, explicitly record ownership.

Example:

```text
Agent 1A
explorer/src/lib/layout/types.ts
explorer/src/lib/layout/analysis.ts

Agent 1B
explorer/src/lib/layout/layers.ts

Agent 1C
explorer/src/lib/layout/domains.ts

Agent 1D
explorer/src/lib/layout/metrics.ts

Agent 1E
explorer/src/lib/layout/fixtures/*
```

If two agents discover they need the same file:

1. stop the conflicting modification
2. document the dependency
3. let the integration agent reconcile it later

Do not resolve conflicts by silently overwriting another agent's changes.

---

# WHAT NOT TO DO

Do NOT:

* blindly switch everything to force-directed layout
* blindly install ELK/Dagre
* use random jitter
* use fixed X positions for every domain regardless of dependencies
* arrange nodes alphabetically as the main layout strategy
* make fan-in/fan-out the only importance metric
* place every node on concentric rings
* put all schema nodes in a huge distant area
* place all tests into one giant test region
* allow fields to dominate the layout
* solve crossings by hiding edges
* change analyzer output
* change Static mode
* bypass Position Authority
* add semantic zoom in this phase
* introduce LLM-based layout
* make layout depend on viewport dimensions in a nondeterministic way
* sacrifice reproducibility for visual randomness

---

# SUCCESS CRITERIA

The implementation is complete only when all of the following are true.

### Architecture

The graph visibly communicates major architectural layers.

### Domains

Related domains form coherent spatial regions.

### Dependency flow

The spatial arrangement helps users understand dependency direction.

### Hubs

Important high-centrality nodes have meaningful positions.

### Bridges

Cross-domain nodes visibly connect relevant regions.

### Locality

Strongly related production nodes are close.

### Secondary nodes

Tests and fields remain close to their targets without distorting the architecture.

### Crossings

Edge crossings are reduced through actual ordering/layout logic rather than cosmetic hiding.

### Components

Disconnected components are compactly and deterministically packed.

### Stability

The same input produces the same layout.

### Position authority

Existing authoritative positions continue to win where required.

### Static mode

Static mode behavior is unchanged.

### Reset

Reset Layout produces the new architecture-aware layout.

### Performance

The algorithm remains practical for the existing Explorer scalability targets.

### Maintainability

Architecture intelligence and layout stages are modular and testable.

---

# FINAL DELIVERABLES

At the end of the work, the project should contain:

```text
explorer/src/lib/layout/
    types.ts
    analysis.ts
    layers.ts
    domains.ts
    centrality.ts
    global-layout.ts
    ordering.ts
    local-layout.ts
    satellites.ts
    spacing.ts
    components.ts
    metrics.ts
    evaluate-layout.ts
    fixtures/
```

Only create files when their responsibility is actually needed. Do not create empty abstraction layers merely to match this list.

The existing:

```text
architecture-layout.ts
graph-layout.ts
position-policy.ts
GraphView.tsx
```

must remain cleanly separated.

Also produce:

```text
LAYOUT_BASELINE_AUDIT.md
LAYOUT_VISUAL_ACCEPTANCE.md
FINAL_LAYOUT_FORENSIC_AUDIT.md
```

The final result should be a deterministic architecture-aware layout engine, not merely a prettier Cytoscape graph.
