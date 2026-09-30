# 01 — Foundations, Contracts & System Architecture

## Current authoritative state

The Architecture Explorer is a **read-only, deterministic architecture/refactoring explorer**. All implementation phases (Phase 1, Phase 2, Phase 3A-3E) are **100% COMPLETE**. The system is in **FINAL DOCUMENTATION FREEZE & PROJECT COMPLETION**. The dependency analyzer and its exported graph artifacts are the authoritative data boundary; the frontend consumes the graph rather than creating a competing dependency model.

### Core contracts
- `analysis-manifest.json` is the analysis provenance/identity artifact.
- `explorer-data.json` is the read-only Explorer view-model contract.
- Graph identity is validated with a deterministic hash so stale or cross-project refactoring proposals cannot be committed against the wrong graph.
- Intelligence findings use structured, deterministic contracts; IDs, node/edge lists and evidence are normalized/sorted and immutable where required.
- No LLM/backend is part of graph/layout truth.

### Architecture flow
```text
Analyzer / exported artifacts
        ↓
Authoritative Explorer graph
        ├── Architecture analysis / findings
        ├── Deterministic layout
        ├── Visualization / overlays
        ├── Investigation
        ├── Refactoring simulation
        ├── Proposal validation / commit
        └── Persistence / reload
```

### Dependency-analysis rules
- Focus/depth/direction determine topology before artifact-type visibility filtering.
- A visible edge exists only when both endpoints are visible; no artificial transitive edges are invented.
- Analyzer output remains the source of truth for nodes, edges, dependencies and unresolved references.
- External integration contracts and adapter hardening keep the analyzer boundary stable.

### Protected governance
- UI/audit work must not silently modify production graph semantics.
- Simulation operations remain non-mutating until explicit commit.
- Post-commit re-analysis is required to return the system to the authoritative analyzer state.

## Superseded information removed
Earlier architecture plans, initial analyzer reports and exploratory implementations are retained only as historical provenance in the source register. Where they disagree with later executable audits, the later runtime/contract evidence is used.

## Key authoritative sources
- `ARCHITECTURE_INTELLIGENCE_MASTER_PLAN.md` (2026-09-14 19:01:38)
- `DA-2.1-CONTRACT-HARDENING.md` (2026-09-14 19:01:38)
- `EXPLORER_CONTRACT.md` (2026-09-14 19:01:38)
- `HYBRID_LAYOUT_PROMPT11_IMPLEMENTATION_REPORT.md` (2026-09-21 22:28:18)
- `PHASE_2G_MASTER_RELEASE_GATE_AND_DOCUMENTATION_FREEZE.md` (2026-09-29)
- `PHASE_3D-1_WEB_WORKER_EVIDENCE_AND_BENCHMARK_RECONCILIATION.md` (2026-09-29)
- `PHASE_3E_MATRIX_VIRTUALIZATION_AND_EXTREME_SCALE_RENDERING_REPORT.md` (2026-09-29)
- `FINAL_PROJECT_ACCEPTANCE_REPORT.md` (2026-09-30)
