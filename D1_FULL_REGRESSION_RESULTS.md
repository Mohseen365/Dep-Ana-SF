# D1 Full Regression Verification Results

**Role:** D1 — Master Integration Coordinator
**Execution Environment:** Node.js v22.22.1 Linux x64
**Date:** 2026-11-10
**Overall Verdict:** **29/29 SUITES PASSED (100% PASS RATE, 0 REGRESSIONS)**

---

## 1. Test Execution Summary

| # | Test Suite File | Focus Area / Task | Status | Assertions / Result |
| :---: | :--- | :--- | :---: | :--- |
| 1 | `run-analysis-history-tests.cjs` | Analysis History / W7-P1 | **PASS** | Runs query, selection, paging |
| 2 | `run-b4-security-tests.cjs` | FLS Permissions & USER_MODE | **PASS** | 29 FLS fields, BroadcastChannel security |
| 3 | `run-c1-url-sync-tests.cjs` | Deep-Link URL State (REM-04) | **PASS** | 11/11 tests pass (Serialization, Invariants) |
| 4 | `run-c4-export-tests.cjs` | Graph Export & Layout (REM-05) | **PASS** | PNG/SVG export, radial threshold |
| 5 | `run-coordinator-integration-suite.cjs` | Shell Integration & URL Sync (INT-1/REM-04) | **PASS** | 16/16 tests pass across 7 sections |
| 6 | `run-lane-a-schema-tests.cjs` | Filter Schema & Container V2 | **PASS** | Container migration, serialization |
| 7 | `run-lane-c-preset-manager-tests.cjs` | Preset Manager Lifecycle | **PASS** | Preset CRUD, project scoping |
| 8 | `run-lane-d-graph-filter-tests.cjs` | Graph Filter Engine | **PASS** | Filter predicates, coupling thresholds |
| 9 | `run-lane-e-matrix-tests.cjs` | Dependency Matrix View | **PASS** | Matrix grid layout, cell contracts |
| 10 | `run-lane-f-findings-tests.cjs` | Architecture Findings View | **PASS** | Findings table, severity sorting |
| 11 | `run-lwc-jest-tests.cjs` | LWC Offline Component Suite | **PASS** | Structural unit assertions |
| 12 | `run-p0-verification-tests.cjs` | Phase 0 Preflight Baseline | **PASS** | Invariant baseline checks |
| 13 | `run-p1-header-tests.cjs` | Shell Header Component | **PASS** | Actions, search, run selection |
| 14 | `run-p1-sidebar-tests.cjs` | Shell Sidebar Navigation | **PASS** | View switching, layer toggles |
| 15 | `run-poc-tests.cjs` | Cytoscape Engine POC | **PASS** | Canvas init, node styling |
| 16 | `run-r2-packaging-validation.cjs` | Packaging Exclusion (PKG-01) | **PASS** | 5/5 suites pass (Quarantine exclusion) |
| 17 | `run-s1-security-tests.cjs` | BroadcastChannel IPC Hardening | **PASS** | Schema allowlist, echo suppression |
| 18 | `run-w5-1-tests.cjs` | Shell Layout Switcher (W5-1) | **PASS** | 18/18 tests pass (Layout persistence) |
| 19 | `run-w6-1-tests.cjs` | Radar Spider Chart (W6-1) | **PASS** | 10/10 tests pass (CONTRACT-03 radar) |
| 20 | `run-w6-2-tests.cjs` | Treemap Hierarchy View (W6-2) | **PASS** | Treemap partitioning, immutability |
| 21 | `run-w6-3-tests.cjs` | Subway Metro Map View (W6-3) | **PASS** | Route generation, stage columns |
| 22 | `run-w6-4-tests.cjs` | Architecture Hotspots View (W6-4) | **PASS** | Hotspot ranking, coupling math |
| 23 | `run-w7-1-tests.cjs` | System Diagnostics View (W7-1) | **PASS** | Health metrics, KPI computation |
| 24 | `run-w7-2-tests.cjs` | Architecture DNA Barcode (W7-2) | **PASS** | Barcode bands, layer distribution |
| 25 | `run-w8-1-tests.cjs` | Investigation Drawer (W8-1) | **PASS** | Multi-tab drawer, 1-hop drilldown |
| 26 | `run-wave4-integration-suite.cjs` | Wave 4 Phase 2C Integration | **PASS** | 32/32 tests pass (Full invariants) |
| 27 | `run-workstream-a-tests.cjs` | Workstream A Shell Baseline | **PASS** | 33/33 tests pass (AppShell & Selector) |
| 28 | `run-workstream-c-tests.cjs` | Workstream C Analytics Suite | **PASS** | SCC cycles, quarantined W9 unit tests |
| 29 | `run-ws5-tests.cjs` | Workstream 5 Dashboard Suite | **PASS** | Metric tiles, project stats |

---

## 2. Packaging CLI Conversion & Manifest Results

- `sf project convert source --output-dir /tmp/d1-pkg-convert-test --json`: Exit code 0, 0 quarantined files converted.
- `sf project generate manifest --source-dir force-app --output-dir /tmp/d1-pkg-manifest-test --name package.xml --json`: Exit code 0, 0 quarantined files in `package.xml`.
