# Agent C3: CONTRACT-06 Event Compliance Report

**Task:** REM-02 / daSankeyView Event Contract Alignment
**Governing Standard:** CONTRACT-06 v1.0.0 (`docs/waves-5-9/phase-a3/CONTRACT_06_NODE_SELECTION_EVENT_DTO.md`)
**Workstream:** C3 (Workstream 4 Visualization Engineer)
**Date:** 2026-11-10
**Status:** **100% COMPLIANT**

---

## 1. Executive Summary & Defect Remediation

The previous implementation of `daSankeyView` emitted `CustomEvent('nodeselect')` with top-level fields that deviated from the frozen `CONTRACT-06` TypeScript interface `NodeSelectDetail`:
- **Prior Non-compliant Detail Shape:**
  ```javascript
  {
      nodeId,
      nodeType: 'component',
      layer: node ? node.layer : 'unassigned',
      sourceView: 'river',
      sourceComponent: 'daSankeyView',
      timestamp: Date.now(),
      rawData: node
  }
  ```
- **Frozen Contract Interface (`CONTRACT-06` §4.1):**
  ```typescript
  export interface NodeSelectDetail {
      nodeId: string | null;
      node?: CanonicalGraphNode | null;
      sourceView: string;
      meta?: {
          isMultiSelect?: boolean;
          isPinned?: boolean;
          [key: string]: any;
      };
  }
  ```

### Remediation Applied
In `scratch/salesforce-poc/force-app/main/default/lwc/daSankeyView/daSankeyView.js`, `selectNode(nodeId)` was remediated:
1. `nodeId` is strictly a string identifier or `null`.
2. `node` holds the canonical graph node object or `null`.
3. `sourceView` is strictly `'river'`.
4. Supplementary metadata (`sourceComponent`, `layer`, `timestamp`) is encapsulated inside the `meta` object.
5. All non-standard top-level fields (`nodeType`, `layer`, `sourceComponent`, `timestamp`, `rawData`) are completely removed from the top level.
6. Event flags remain `bubbles: true`, `composed: true`, and `cancelable: false`.
7. Architectural invariant `SELECTION != NAVIGATION` is preserved (selection does not alter view routes or project context).

---

## 2. Hardened Test Verification

Suite 9 in `scratch/salesforce-poc/tests/run-c3-sankey-tests.cjs` was updated with strict contract validation:
- Validates `evt.type === 'nodeselect'`.
- Validates `evt.detail.nodeId === 'ApexClass.AccountService'`.
- Validates `evt.detail.sourceView === 'river'`.
- Validates `evt.detail.node` contains the canonical node.
- Validates `evt.detail.meta.sourceComponent === 'daSankeyView'`.
- Rejects non-contract top-level properties:
  - `evt.detail.nodeType === undefined`
  - `evt.detail.layer === undefined`
  - `evt.detail.sourceComponent === undefined`
  - `evt.detail.timestamp === undefined`
  - `evt.detail.rawData === undefined`
- Validates event bubbling (`bubbles: true`), composition (`composed: true`), and non-cancelability (`cancelable: false`).

**Result:** All 14 suites in `run-c3-sankey-tests.cjs` pass cleanly.
