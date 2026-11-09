# Architecture Design: Investigation Drawer (`daInvestigationDrawer`)

**Date:** 9 November 2026
**Feature:** Progressive Architectural Investigation (`InvestigationDrawer.tsx`)
**Target Salesforce LWC:** `scratch/salesforce-poc/force-app/main/default/lwc/daInvestigationDrawer`
**Target Context / Apex:** Integrates with `daAnnotationPanel` & `DAAnnotationController.cls`

---

## 1. React Architecture Analysis
In `explorer/src/components/InvestigationDrawer.tsx` (1,150 lines):
- Progressive slide-out drawer anchored on the right side of the workspace.
- Activates when an entity (Node, Edge, or Finding) is selected.
- Shows multi-tab detail:
  - Overview (LOC, Churn, Complexity, Layer, Role)
  - Dependencies (Inbound / Outbound list with quick jump)
  - Associated Findings & Rule Violations
  - User Annotations & Architectural Notes
- Maintains an investigation breadcrumb drill trail (History of inspected nodes).

---

## 2. LWC Architecture
- **Component:** `daInvestigationDrawer`
- SLDS Drawer panel (`slds-panel slds-size_medium slds-panel_docked`).
- Inbound `@api selectedNodeId`, `@api graphData`.
- Outbound `nodeselect` when jumping to connected neighbors in the dependency list.
- Embedded `c-da-annotation-panel` for authoring comments on `DA_Annotation__c`.

---

## 3. Apex Architecture & Security
- Reuses `DAAnnotationController.cls` for reading/saving annotations tied to `targetNodeId`.
- Read-only graph node details resolved in-memory from loaded graph payload.

---

## 4. Jest & Apex Testing Approach
- Jest unit tests for breadcrumb navigation trail, tab switching, and annotation persistence.
