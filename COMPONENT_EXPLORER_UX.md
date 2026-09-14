# Component Explorer / Left Sidebar Content UX Specification

## Overview

The **Component Explorer** (Left Sidebar Content) serves as the primary navigation index and architectural inventory browser for the Salesforce Architecture Refactoring Explorer. This document details the visual redesign, interactive behaviors, filtering/sorting mechanics, state representations, and keyboard navigation model designed to transform the sidebar into a high-density, professional architecture inspection panel.

---

## 1. Visual Design & Layout Hierarchy

### Layout Specification

```
+-------------------------------------------------------------+
| COMPONENTS                                              428 |
+-------------------------------------------------------------+
| 🔍 Search components...                                 [×] |
+-------------------------------------------------------------+
| [ All ]  [ High Risk ]  [ Hotspots ]                       |
+-------------------------------------------------------------+
| Filter: [All Types ▼] [All Risks ▼]   Sort: [Risk (High) ▼] |
+-------------------------------------------------------------+
| ----------------------------------------------------------- |
| ● AccountService                                            |
|   Apex Class                                           HIGH |
|   🔍 Currently under investigation                          |
+-------------------------------------------------------------+
| ● OrderService                                              |
|   Apex Class                                         MEDIUM |
+-------------------------------------------------------------+
| ● Account                                                   |
|   SObject                                               LOW |
+-------------------------------------------------------------+
```

### Visual Standards & Typography
- **Header Title:** Uppercase monospace label (`COMPONENTS`), tracking 0.05em, text muted (`#94a3b8`), 11px font size.
- **Count Indicator:** Clean, bold counter aligned right (`428`), primary text color (`#f8fafc`).
- **Input Styling:** Surface subtle background (`#0f172a`), border default (`#334155`), 13px font size, clean focus glow (`--border-focus`).
- **Item Card:** Minimalist background elevation, borderless grouping with subtle bottom divider (`rgba(255, 255, 255, 0.04)`), generous touch/click target area.

---

## 2. Component Item Metadata & Risk Indicators

Each component item in the list presents clear architectural hierarchy without visual clutter:

1. **Status Dot (`●`):** Semantic risk indicator placed left of component name:
   - **Critical / High Risk:** `#ef4444` (Red dot)
   - **Medium Risk:** `#f59e0b` (Amber dot)
   - **Low Risk:** `#10b981` (Emerald dot)
   - **Unrated / Safe:** `#64748b` (Slate dot)
2. **Component Name:** Primary text (`#f8fafc`), 13px font size, font weight 600. Truncates cleanly with ellipsis if necessary.
3. **Component Type Subtitle:** Secondary text (`#cbd5e1`), 11px font size. Displays type (e.g., `Apex Class`, `SObject`, `Apex Trigger`, `LWC Component`).
4. **Risk Level Badge:** Micro badge right-aligned, 10px uppercase monospace text with subtle semantic tint background (`--risk-high-bg`, `--risk-medium-bg`, `--risk-low-bg`).

---

## 3. Component Selection & Investigation State

When a component is selected (either via sidebar click, graph click, or command palette):

- **Visual Cue:** The selected item displays an active left accent bar (`3px solid var(--accent-primary)`), a subtle primary tint background (`var(--accent-subtle)`), and an elevated shadow (`var(--shadow-sm)`).
- **Clear Communication:** An investigation status callout appears below the type metadata:
  > *"This component is currently being investigated."*
- **Data Flow Integrity:** The selection triggers `onSelectNode(node)` without mutating component data, graph topology, or calculation logic.

---

## 4. Search, Filtering, and Sorting Mechanics

### Search
- Real-time debounced filtering matching component name, file path, type, and ID.
- Includes quick clear action (`×`) when query is active.

### Quick Preset Filters
- **[ All ]:** Displays all components matching query and type filters.
- **[ High Risk ]:** Filters to components with `HIGH` or `CRITICAL` risk ratings.
- **[ Hotspots ]:** Filters to components flagged as architectural hotspots (high coupling, high churn, or cycle involvement).

### Advanced Filters & Sorting
- **Type Filter Dropdown:** Select specific Salesforce metadata types (`ApexClass`, `ApexTrigger`, `CustomObject`, `LightningComponentBundle`).
- **Risk Filter Dropdown:** Select specific risk levels (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`).
- **Sort Dropdown:** Sort results dynamically by:
  - Risk Level (High to Low / Low to High)
  - Name (A-Z / Z-A)
  - Type (Alphabetical)

---

## 5. Interactive States (Hover, Focus, Loading, Empty, Error)

### Hover State
- Item background transitions smoothly to `var(--surface-hover)` (`#2d3748`).
- Subtle 1px x-axis offset transition (`transform: translateX(2px)`).

### Keyboard Focus State
- Outline ring using `var(--accent-focus)` (`rgba(59, 130, 246, 0.5)`).
- Full keyboard navigation supported:
  - `ArrowDown` / `ArrowUp`: Move focus across component list items.
  - `Enter` / `Space`: Select highlighted component.
  - `Escape`: Clear search query or defocus sidebar.

### Empty State
- Displays `ui-empty-state` container when no components match search/filter criteria:
  - Icon: 🔍
  - Title: *"No matching components"*
  - Description: *"Try adjusting your search terms or clearing active filters."*
  - Action: *"Clear All Filters"* button.

### Loading & Error States
- **Loading State:** Clean skeleton loader rows with subtle pulse animation.
- **Error State:** Warning indicator with retry button and clear status message.

---

## 6. Reduction of Visual Noise

- Removed duplicate/redundant badges (e.g., `Direct/Transitive`, redundant type badges).
- Eliminated heavy `1px solid #334155` borders around every card item.
- Reduced font size clutter and standardized on 13px (primary) / 11px (secondary) / 10px (badges).

---

## 7. Contract & File Ownership Compliance

- **Owned Files:**
  - `explorer/src/components/Sidebar.tsx`
  - `explorer/src/components/SearchFilterPanel.tsx`
- **Read-Only Dependencies:**
  - `explorer/src/types/explorer.ts`
  - `explorer/src/lib/search-filter.ts`
  - `dependency-analyzer.cjs`
- **Zero Invariant Changes:** Component data, graph calculations, analyzer logic, and project storage remain 100% untouched.
