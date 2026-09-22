# 05 — Findings, Investigation, Simulation & Refactoring Workflow

## System intent

The Explorer is not only a graph viewer. It provides a controlled architecture-refactoring workflow while keeping the analyzed graph authoritative and unchanged until an explicit commit.

### Finding lifecycle
1. Analyzer/architecture rules evaluate the authoritative graph.
2. Findings identify architectural risks with stable IDs, severity, evidence and involved nodes.
3. Investigation presents the finding with contextual dependencies/dependents and evidence.
4. A user can create a simulated proposal.
5. Simulation applies operations to a working representation without mutating the base graph.
6. Proposal validation checks graph identity and stale-state conditions.
7. Explicit commit applies accepted changes.
8. The analyzer is rerun and the Explorer returns to the authoritative post-change state.

### Safety invariants
- A proposal for a different graph/project cannot be committed merely because its node IDs look familiar.
- Base graph data is not mutated by simulation.
- Finding evidence is deterministic and traceable to graph facts.
- Refactoring operations such as add/remove node, add/remove edge and modify node are deterministic.
- Re-analysis is the authority after a real commit.

### Explainability
Findings should communicate:
- WHAT happened
- WHY it matters
- WHERE it occurs
- WHAT evidence supports it
- WHAT action is available

This keeps refactoring decisions auditable rather than turning the UI into an opaque recommendation engine.

## Key authoritative sources
- `Change Simulator.md` (2026-09-14 19:01:38)
- `ANALYSIS_VIEWS_UX.md` (2026-09-15 09:47:46)
- `HYBRID_LAYOUT_PROMPT10_IMPLEMENTATION_REPORT.md` (2026-09-21 22:28:18)
- `HYBRID_LAYOUT_PROMPT11_IMPLEMENTATION_REPORT.md` (2026-09-21 22:28:18)
