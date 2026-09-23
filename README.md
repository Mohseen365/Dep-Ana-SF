# Architecture Explorer — Consolidated Audit Essence

**Input:** `audits.zip`  
**Audits processed:** 200/200  
**Archive creation-date range:** 2026-09-14 → 2026-09-22

## Purpose
This package is a deduplicated knowledge base generated from every supplied audit. It keeps the essence of each audit, consolidates repeated facts into domain documents, and resolves conflicting current-state claims using archive creation time plus later executable/runtime evidence.

## Files
1. `01_Foundations_Contracts.md` — authoritative architecture, analyzer and artifact contracts.
2. `02_Layout_Engine_Spatial.md` — deterministic layout pipeline, geometry, satellites, metrics and position authority.
3. `03_UI_UX_Interaction.md` — graph UI, filtering, focus, composition overlays and explainability.
4. `04_MultiProject_State_Persistence.md` — project isolation, persistence, layout provenance and reset behavior.
5. `05_Findings_Investigation_Refactoring.md` — findings, investigation, simulation and safe commit workflow.
6. `06_Validation_Performance_Release.md` — tests, performance, acceptance gates and release interpretation.
7. `07_Decisions_Conflicts.md` — explicit resolution of the major contradictions across audit waves.
8. `08_Audit_Source_Register.md` — all 200 source audits with creation date, domain and compact essence.

## Current high-level state
- The analyzer/exported artifacts remain the authoritative graph source.
- The Explorer remains deterministic and read-only with respect to graph truth.
- Hybrid layout is implemented and renderer-verified through the real application path.
- Legacy/hierarchical mode remains the conservative default (`enableFeatureLayout=false`).
- Explicit Hybrid mode uses the repaired Candidate E pipeline and latest verified benchmark metrics.
- Position authority and project isolation are treated as hard invariants.
- Feature composition is a visualization layer and must not mutate coordinates.
