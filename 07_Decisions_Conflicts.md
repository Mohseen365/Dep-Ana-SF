# 07 — Decision Log, Superseded Findings & Conflict Resolution

This file exists specifically to prevent old audit statements from being mistaken for the current system state.

## 1. Hybrid total-crossing metric
- **Historical:** `Ctotal = 95,487` was repeatedly reported during earlier Hybrid phases.
- **Later repaired Candidate E:** `Ctotal = 94,662`, with `Cpp = 8,704`, `Cps = 41,590`, `Css = 41,544`, `Cpb = 2,594`, `Cbb = 230`.
- **Current interpretation:** use **94,662** for the repaired Candidate E runtime; retain 95,487 only as historical evidence of the earlier gap.

## 2. Hybrid production activation
- **Historical:** Hybrid was implemented but the UI call chain omitted the activation flag, so the real UI stayed Hierarchical.
- **Repair:** `architectureMode` became the authoritative UI semantic; Hybrid maps to `enableFeatureLayout=true`.
- **Further forensic repair:** stale automatic hierarchical coordinates were prevented from overwriting freshly computed Hybrid coordinates.
- **Current interpretation:** Hybrid is executable and renderer-verified when explicitly selected. Legacy/default mode remains hierarchical.

## 3. Position authority
- **Historical failure:** persisted automatic coordinates were treated as authoritative without considering architecture-mode provenance.
- **Current:** provenance distinguishes user-authored, automatic-hierarchical and automatic-hybrid coordinates.
- **Rule:** user-authored coordinates must never be displaced by an automatic layout.

## 4. Layout-stage count
- Some summaries list 13 stages; others list 14 items because position-authority restoration is listed separately.
- **Current normalization:** executable implementation is described as Stage 0 through Stage 12 = **13 stages**, with position authority at Stage 12.

## 5. Feature density
- **Regression:** excessive overlapping composition boxes and duplicate labels.
- **Restoration:** overlap/containment suppression, label deduplication, zoom-aware rendering and interaction-only shared links.
- **Current:** 4 retained non-overlapping composition groups for the audited `feature_forecast-manager` case, with zero duplicate labels.

## 6. Production-code-change policy
Earlier audit waves sometimes state “0 production changes” because they were audit-only gates; later forensic repair reports explicitly identify surgical runtime fixes. Therefore the correct reading is **wave-specific**, not a global invariant that no production code was ever changed.

## Conflict-resolution method
The consolidated KB does not delete historical evidence. It removes historical conclusions from the current-state narrative when a later audit supersedes them, and points to the exact source in the register.

## Latest relevant sources
- `HYBRID_LAYOUT_PHASE13_REAL_EXECUTION_FORENSIC_AUDIT.md` (2026-09-22 23:58:30)
- `HYBRID_LAYOUT_PHASE12_PRODUCTION_ACTIVATION_REPORT.md` (2026-09-22 23:07:38)
- `HYBRID_LAYOUT_DEEP_ARCHITECTURAL_AUDIT.md` (2026-09-22 19:31:40)
- `FEATURE_VISUAL_DENSITY_REGRESSION_WAVE12_REPORT.md` (2026-09-21 07:59:12)
