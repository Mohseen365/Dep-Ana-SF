# Agent 10 Salesforce and Browser Validation Plan

## Document Metadata
- **Agent**: Agent 10 (Test Engineering & Verification Scaffolding)
- **Coordinator**: Integration Coordinator D1
- **Date**: 2026-11-10
- **Status**: SPECIFICATION COMPLETE (PREPARATION ONLY)

---

## 1. Scope & Objective
This validation plan defines the exact testing protocol required for browser-level Playwright execution and live Salesforce org profiling.

In accordance with Phase 0 governance rules:
- No tests requiring a live Salesforce org shall be certified as passed without actual execution against a provisioned scratch org.
- Where live org access is unavailable, findings must remain explicitly classified as **`NOT VERIFIED — LIVE SALESFORCE ORG REQUIRED`**.

---

## 2. Apex Governor-Limit Profiling Protocol (Live Org)

When live scratch org deployment is authorized, execute `DAGraphIngestionHeapTest.cls` via Salesforce CLI:
```bash
sf apex run test --class-names DAGraphIngestionHeapTest --result-format human --code-coverage
```

### 2.1 Profiled Metrics Checklist
1. **Synchronous Heap Delta (`Limits.getHeapSize()`)**:
   - Baseline before deserialization.
   - Deserialization peak (10-chunk batch).
   - SObject list allocation.
   - Post-insert heap memory.
   - Required bound: Must remain strictly below **5,000,000 bytes** (giving 1 MB headroom below 6 MB limit).
2. **CPU Execution Time (`Limits.getCpuTime()`)**:
   - Execution time for JSON parsing and DML validation.
   - Required bound: Must remain below **3,500 ms** (headroom below 10,000 ms synchronous limit).
3. **SOQL Rows & DML Limits**:
   - SOQL queries per batch <= 5.
   - DML statements per batch <= 2; DML rows inserted == batch size (10).

---

## 3. Playwright Headless Browser Verification Suite

Browser verification tests validate end-to-end DOM rendering, user interactions, and cross-window BroadcastChannel synchronization in Google Chrome.

### 3.1 Test Scenarios
1. **Scenario E2E-01: Large Graph Rendering & Layout Transition**:
   - Navigate to `/c/daAppShellApp.app?c__projectId=a00XXXXXXXXXXXXXXX`.
   - Verify Cytoscape canvas renders with 528 nodes.
   - Trigger layout switch: `Hierarchical (Dagre)` -> `Physics (COSE)`.
   - Measure time-to-settle; assert complete in < 2,000 ms.
2. **Scenario E2E-02: Selection Invariant & Investigation Drawer**:
   - Click node `OrderService` in Cytoscape canvas.
   - Assert `selectedNodeId` updates in shell.
   - Assert active view remains `architecture` (`SELECTION != NAVIGATION`).
   - Assert Investigation Drawer opens displaying `OrderService` metadata.
3. **Scenario E2E-03: Multi-Window Broadcast Synchronization**:
   - Detach Investigation Drawer to secondary window.
   - Click node `PaymentProcessor` in primary window.
   - Assert secondary window drawer receives BroadcastChannel event and displays `PaymentProcessor`.
   - Assert non-matching project ID events are ignored.

### 3.2 Required Execution Command
```bash
npx playwright test tests/e2e/da-browser-verification.spec.ts --project=chromium --headed=false
```
*(Execution blocked until live deployment or local LWC dev server is authorized)*.
