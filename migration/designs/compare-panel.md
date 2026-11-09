# Architecture Design: Compare Panel (`daCompareView`)

**Date:** 9 November 2026
**Feature:** Multi-Run Snapshot Comparison (`ComparePanel.tsx`)
**Target Salesforce LWC:** `scratch/salesforce-poc/force-app/main/default/lwc/daCompareView`
**Target Apex Controller:** `scratch/salesforce-poc/force-app/main/default/classes/controllers/DACompareController.cls`
**Target Apex Service:** `scratch/salesforce-poc/force-app/main/default/classes/services/DACompareService.cls`
**Target DTO:** `scratch/salesforce-poc/force-app/main/default/classes/dto/DAGraphDiffDTO.cls`

---

## 1. React Architecture Analysis
In `explorer/src/components/ComparePanel.tsx` (480 lines):
- Accepts two analysis snapshots (`baseRun` and `targetRun`).
- Invokes `diff-adapter.ts` and `graph-diff.ts` to compute set-differences:
  - Added nodes (`targetNodes - baseNodes`)
  - Removed nodes (`baseNodes - targetNodes`)
  - Modified nodes (attribute changes: complexity, churn, risk score)
  - Added/Removed edges
- Renders side-by-side metric scorecards, delta tables, and structural changelogs.

---

## 2. LWC Architecture
- **Component:** `daCompareView`
- **Inbound Properties (`@api`):**
  - `@api projectId`: Active Project ID (immutable to child).
  - `@api baseRunId`: Baseline analysis run ID.
  - `@api targetRunId`: Comparison target analysis run ID.
- **State Properties:**
  - `diffSummary`: High-level metrics (+15 nodes, -3 edges, -2 cyclic SCCs).
  - `addedNodes`, `removedNodes`, `modifiedNodes`: Partitioned lists.
  - `filterText`: Search filter string.
- **Outbound Events:**
  - `nodeselect`: When user clicks a diff item to inspect its details.
  - `swappositions`: Toggles base and target run positions.

---

## 3. Apex Architecture & Service Boundaries
- **Controller & Service:**
  - For lightweight comparisons: Compare metadata metrics in Apex without loading entire graph chunks into Apex heap.
  - For structural diffs: LWC loads base and target node summaries or lightweight metadata index DTOs to compute visual diff in browser, preventing Apex heap exhaustion.

---

## 4. Object Model & Security
- Query `DA_Analysis_Run__c` with `WITH USER_MODE`.
- Strictly enforce `with sharing`.

---

## 5. Jest & Apex Testing Approach
- Jest tests verify set-difference calculation and visual metric deltas.
- Invariant tests guarantee `@api projectId` is never mutated internally.
