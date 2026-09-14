# Component Inspector / Investigation Drawer UX Specification

## Executive Summary

The **Component Inspector** (`InvestigationDrawer.tsx`) has been transformed into a high-density, contextual architecture investigation panel. It serves as the primary detail view for selected architectural components in the Dependency Explorer workspace, providing developers and architects with actionable insights without cluttering the main Cytoscape graph canvas.

---

## 1. Structure & Visual Hierarchy

The Component Inspector is organized into a clear, predictable top-to-bottom layout hierarchy:

```
+-----------------------------------------------------------------------------------+
| Persistent Panel Header                                                           |
|  - Component Name (e.g., AccountService)                                          |
|  - Component Type Badge (e.g., ApexClass, LWC)                                    |
|  - Action Buttons: [📌 Pin] [↗ Detach] [Hand off] [× Close]                       |
+-----------------------------------------------------------------------------------+
| Investigation Toolbar & Drill Breadcrumbs                                         |
|  - Breadcrumb Trail (e.g., OrderController > AccountService)                      |
|  - Recent Investigations Pill List                                                |
+-----------------------------------------------------------------------------------+
| 5-Tab Navigation Bar                                                              |
|  [ Overview ] [ Dependencies (N) ] [ Dependents (N) ] [ Evidence (N) ] [ Actions ]|
+-----------------------------------------------------------------------------------+
| Tab Content Area (Scrollable Workspace Body)                                      |
|                                                                                   |
|  [Risk Summary Card]                                                              |
|   - Risk Level Badge (CRITICAL, HIGH, MEDIUM, LOW)                               |
|   - Architectural Risk Score & Coupling Score                                     |
|   - Explicit Risk Reasons List                                                    |
|                                                                                   |
|  [Key Metrics 2x2 Grid]                                                           |
|   - Fan-In / Dependents Count                                                     |
|   - Fan-Out / Dependencies Count                                                  |
|   - Unresolved Reference Count                                                    |
|   - Test Coverage Status Badge                                                    |
|                                                                                   |
|  [Tab-Specific Dynamic View]                                                      |
|   - Overview / Dependencies / Dependents / Evidence / Actions                     |
+-----------------------------------------------------------------------------------+
```

---

## 2. Progressive Disclosure Model

To prevent overwhelming the user with simultaneous information, the panel employs strict **progressive disclosure**:

1. **Overview Tab (Default view):**
   - High-level architectural health summary: Risk Summary, Key Metrics, and Behavioral Profile (Sharing mode, SOQL/DML/Callout counts).
   - Concise 3-item quick previews for Top Dependents and Top Dependencies with direct "View All →" tab navigation links.
2. **Dependencies Tab:**
   - Exhaustive ranked list of outgoing component dependencies with impact metrics and drill actions.
3. **Dependents Tab:**
   - Exhaustive ranked list of incoming component dependents with `Direct` vs `Transitive` hop classification badges and impact counts.
4. **Evidence Tab:**
   - Code snippet evidence, source line/column numbers, method call signatures, resolution strategies (`EXACT`, `INFERRED`, `HEURISTIC`), and confidence scores for static analysis edges.
5. **Actions Tab:**
   - Action hierarchy for refactor handoff execution, pinning state, multi-window detaching, and copying component identifiers or file paths.

---

## 3. Predictable Scrolling & Space Reclamation Behavior

- **Independent Panel Scroll:** The tab content body (`.investigation-drawer-body`) features isolated vertical scrolling (`overflow-y: auto`), leaving the panel header, breadcrumbs toolbar, and tab navigation fixed at the top.
- **Canvas Space Reclamation:** When closed, the drawer completely unmounts/collapses. The application shell CSS layout dynamically adjusts graph canvas grid tracks (`grid-template-columns: 1fr auto` -> `1fr 0px`), allowing Cytoscape canvas to reclaim screen space and trigger auto-resizing smoothly.
- **Predictable Close Control:**
  - Close button (`×`) is active when unpinned.
  - When pinned (`isPinned = true`), the drawer stays open across component selection changes. Unpinning enables one-click closing.

---

## 4. Useful Empty States

The panel provides clear, informative empty states across all views:
- **No Selection State:** Displays an intuitive icon (`🔍`), header title "No Component Selected", and actionable guidance on selecting graph nodes or searching via Command Palette (`⌘K`).
- **Zero Dependencies / Dependents:** Displays contextual icons (`📦` / `⛓️`) with explicit confirmation that the component is decoupled or isolated.
- **Zero Code Evidence:** Displays clear messaging when no static analysis evidence snippets exist for the component.

---

## 5. Action Hierarchy

Actions are structured by priority and scope:
1. **Primary Header Controls:** Immediate workspace manipulation ([📌 Pin], [↗ Detach], [Hand off to Refactor], [× Close]).
2. **In-Tab Quick Actions:** Contextual navigation ("View All →", Drill down row click).
3. **Explicit Action Operations:** Utility operations located under the **Actions** tab (Copy Component ID, Copy File Path, Refactor Handoff).

---

## 6. Authoritative File Ownership Compliance

- **Owned File:** `explorer/src/components/InvestigationDrawer.tsx`
- **Owned Test File:** `explorer/src/components/InvestigationDrawer.test.tsx`
- **No Analyzer/Graph Alterations:** All dependency analyzer algorithms, Cytoscape graph model structures, and underlying metrics logic remain 100% untouched.
