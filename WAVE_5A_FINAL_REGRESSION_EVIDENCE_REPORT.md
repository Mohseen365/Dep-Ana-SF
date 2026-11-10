# Wave 5A: Final Regression Evidence Report

**Coordinator:** D1 — Master Integration Coordinator
**Independent Verifier:** D2
**Integrated HEAD:** `b96fa5c1316c16aa817c3b82f87bbc25f94cb709`
**Execution Environment:** Node.js v22.22.1, Linux (Jules Sandbox)
**Date:** 2026-11-10
**Overall Verdict:** **100% PASS (31/31 UNIQUE TEST RUNNERS PASSING)**

---

## 1. Executive Summary

This report establishes the verified, non-duplicated regression execution inventory for Wave 5A. All 31 unique test suites located under `scratch/salesforce-poc/tests/*.cjs` were executed against the final integrated candidate. Zero tests failed, zero tests regressed, and no dependencies were missing.

---

## 2. Regression Runner Execution Matrix

| Runner File | Task Scope | Origin / Workstream | Command Executed | Exit Code | Pass / Total | Status |
| :--- | :--- | :--- | :--- | :---: | :---: | :---: |
| `run-analysis-history-tests.cjs` | Analysis Run Lifecycle & History | Baseline | `node run-analysis-history-tests.cjs` | 0 | 14/14 | **PASS** |
| `run-b4-security-tests.cjs` | FLS Permissions & BroadcastChannel Isolation | R1 / Wave 3B | `node run-b4-security-tests.cjs` | 0 | 18/18 | **PASS** |
| `run-c1-url-sync-tests.cjs` | REM-04 URL State Deep-Linking | C1 / Wave 2B | `node run-c1-url-sync-tests.cjs` | 0 | 11/11 | **PASS** |
| `run-c2-snapshot-comparison-tests.cjs` | REM-03 / CONTRACT-05 Snapshot Comparison | C2 / Wave 5A | `node run-c2-snapshot-comparison-tests.cjs` | 0 | 15/15 | **PASS** |
| `run-c3-sankey-tests.cjs` | REM-02 Pure SVG Dependency River View | C3 / Wave 5A | `node run-c3-sankey-tests.cjs` | 0 | 14/14 | **PASS** |
| `run-c4-export-tests.cjs` | REM-05 SVG/PNG Export & Radial Optimizations | C4 / Wave 3A | `node run-c4-export-tests.cjs` | 0 | 12/12 | **PASS** |
| `run-coordinator-integration-suite.cjs` | INT-1 Master Shell Architecture & Invariants | D1 / Wave 5A | `node run-coordinator-integration-suite.cjs` | 0 | 16/16 | **PASS** |
| `run-lane-a-schema-tests.cjs` | Filter Schema & Container Serialization | Baseline | `node run-lane-a-schema-tests.cjs` | 0 | 10/10 | **PASS** |
| `run-lane-c-preset-manager-tests.cjs` | Preset Manager Scoping & Mutations | Baseline | `node run-lane-c-preset-manager-tests.cjs` | 0 | 12/12 | **PASS** |
| `run-lane-d-graph-filter-tests.cjs` | Graph Viewer Filter Evaluation | Baseline | `node run-lane-d-graph-filter-tests.cjs` | 0 | 14/14 | **PASS** |
| `run-lane-e-matrix-tests.cjs` | Matrix Dependency Grid & Aggregation | Baseline | `node run-lane-e-matrix-tests.cjs` | 0 | 15/15 | **PASS** |
| `run-lane-f-findings-tests.cjs` | Findings Table & Risk Triage | Baseline | `node run-lane-f-findings-tests.cjs` | 0 | 14/14 | **PASS** |
| `run-lwc-jest-tests.cjs` | LWC Unit Jest Test Harness | Baseline | `node run-lwc-jest-tests.cjs` | 0 | 8/8 | **PASS** |
| `run-p0-verification-tests.cjs` | Foundation Graph Contracts & Loader | Baseline | `node run-p0-verification-tests.cjs` | 0 | 12/12 | **PASS** |
| `run-p1-header-tests.cjs` | Application Header & Action Contracts | Baseline | `node run-p1-header-tests.cjs` | 0 | 10/10 | **PASS** |
| `run-p1-sidebar-tests.cjs` | Application Sidebar & Navigation Controls | Baseline | `node run-p1-sidebar-tests.cjs` | 0 | 11/11 | **PASS** |
| `run-poc-tests.cjs` | Proof of Concept Core Graph Pipeline | Baseline | `node run-poc-tests.cjs` | 0 | 10/10 | **PASS** |
| `run-r2-packaging-validation.cjs` | PKG-01 `.forceignore` Packaging Exclusions | R2 / Wave 3B | `node run-r2-packaging-validation.cjs` | 0 | 5/5 | **PASS** |
| `run-s1-security-tests.cjs` | BroadcastChannel IPC Sanitization | S1 / Wave 2A | `node run-s1-security-tests.cjs` | 0 | 16/16 | **PASS** |
| `run-w5-1-tests.cjs` | Shell Layout Switcher & Preferences | Wave 1A | `node run-w5-1-tests.cjs` | 0 | 18/18 | **PASS** |
| `run-w6-1-tests.cjs` | Radar Multi-Dimensional Metrics | Wave 1A | `node run-w6-1-tests.cjs` | 0 | 12/12 | **PASS** |
| `run-w6-2-tests.cjs` | Treemap Hierarchy & Component Density | Wave 1A | `node run-w6-2-tests.cjs` | 0 | 7/7 | **PASS** |
| `run-w6-3-tests.cjs` | Subway View Flow Architecture | Wave 1A | `node run-w6-3-tests.cjs` | 0 | 7/7 | **PASS** |
| `run-w6-4-tests.cjs` | Hotspots Architectural Defect Heatmap | Wave 1A | `node run-w6-4-tests.cjs` | 0 | 7/7 | **PASS** |
| `run-w7-1-tests.cjs` | Diagnostics View Structural Health | Wave 1A | `node run-w7-1-tests.cjs` | 0 | 7/7 | **PASS** |
| `run-w7-2-tests.cjs` | Architecture DNA Barcode View | Wave 1A | `node run-w7-2-tests.cjs` | 0 | 6/6 | **PASS** |
| `run-w8-1-tests.cjs` | Dockable Investigation Drawer | Wave 1A | `node run-w8-1-tests.cjs` | 0 | 12/12 | **PASS** |
| `run-wave4-integration-suite.cjs` | Shared State & Preset Isolation | Baseline | `node run-wave4-integration-suite.cjs` | 0 | 32/32 | **PASS** |
| `run-workstream-a-tests.cjs` | Graph Engine Lifecycle & Canvas Invariants | Baseline | `node run-workstream-a-tests.cjs` | 0 | 14/14 | **PASS** |
| `run-workstream-c-tests.cjs` | Multi-View Interaction Suite | Baseline | `node run-workstream-c-tests.cjs` | 0 | 25/25 | **PASS** |
| `run-ws5-tests.cjs` | Workstream 5 Integrated Layout Suite | Baseline | `node run-ws5-tests.cjs` | 0 | 16/16 | **PASS** |

**Total Unique Runners:** 31
**Total Passed:** 31
**Total Failed:** 0
**Overall Regression Pass Rate:** 100.0%
