# Report 9: Salesforce Migration Completeness Baseline

**Audit Date:** November 2026
**Auditor:** Jules (Principal Migration & System Auditor)
**Execution Mode:** Read-Only Audit

---

## 1. Executive Summary

This report establishes the quantitative migration baseline of the Dependency Analyzer to Salesforce migration based on actual source inspection of commit `f239696a567c85a12534bfbd393ff3cd3aa4025d`.

| Measurement Dimension | Total Eligible | Fully Migrated | Partially Migrated | Ported (Not Integrated) | Not Migrated | Completeness Ratio |
|---|---|---|---|---|---|---|
| **Original Production Files** | 185 | 14 (7.6%) | 38 (20.5%) | 8 (4.3%) | 125 (67.6%) | **7.6% Full / 28.1% Functional** |
| **Public Exported Symbols** | 874 | 82 (9.4%) | 145 (16.6%) | 24 (2.7%) | 623 (71.3%) | **9.4% Full / 26.0% Functional** |
| **Workspace Views** | 18 | 0 (0.0%) | 3 (16.7%) | 3 (16.7%) | 12 (66.6%) | **0% Full / 16.7% Integrated** |
| **Layout Algorithms** | 6 | 1 (16.7%) | 0 (0.0%) | 3 (50.0%) | 2 (33.3%) | **16.7% Integrated / 66.7% Ported** |
| **Interactive Workflows** | 8 | 1 (12.5%) | 2 (25.0%) | 0 (0.0%) | 5 (62.5%) | **12.5% Full / 37.5% Functional** |

---

## 2. Measurement Methodology & Rules

1. **Eligible Source Denominator:**
   - Evaluated production files in `explorer/src/`.
   - Excluded test files (`*.test.*`, `*.spec.*`), mock fixtures (`fixtures/`), test suites (`test/`), spike prototypes (`spike/`), and `.d.ts` declaration wrappers.
2. **Strict Parity Standards:**
   - A component is classified as `FULLY_MIGRATED` only if both its visual UI and full interaction semantics exist and are integrated in Salesforce.
   - If an algorithm exists in `daLayoutEngine.js` but is not imported or accessible in the UI, it is classified as `PORTED_NOT_INTEGRATED` and does not count towards integrated completeness.
   - If an LWC renders basic data but omits original interactive capabilities (such as `daGraphViewer` lacking focus controls or `daFindingsView` lacking AST rules), it is classified as `PARTIALLY_MIGRATED`.
3. **Intentional Boundary Exclusions:**
   - AST parsing, file scanning, and raw graph extraction in Node.js scripts (`scripts/`) are intentionally external and are excluded from the Salesforce target gap register.

---

## 3. Major Functional Gaps Summary

1. **15 of 18 Workspace Views are Missing:** The Salesforce UI currently mounts only 3 views (`graph`, `matrix`, `findings`). 15 views (Subway, Radar, Treemap, Constellation, Heatmap, River, Tree, DNA, Profile, Four-Direction, Dashboard, Compare, History, Hotspots, Diagnostics) have no usable presence in the Salesforce app.
2. **Disconnected Layout Engine:** `computeOrbitLayout`, `computeConstellationLayout`, and `computeSankeyLayout` are ported and tested in `daLayoutEngine.js`, but cannot be selected by users.
3. **Missing Deep Graph Controls:** Focus neighborhood controls, blast radius impact analysis, path mode, and node/edge hover cards are absent in `daGraphViewer`.
4. **Omitted Complex Workflows:** Snapshot comparison (`graph-diff`), refactoring simulation (`change-simulator`), investigation workbenches, and command palettes are completely unmigrated.
