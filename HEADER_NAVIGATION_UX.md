# Navigation, Header, & Command Palette UX Architecture

## Overview

This specification details the redesigned **Application Header**, **Project Context Area**, **Global Search Field**, and **Command Palette (`⌘K`)** for the Salesforce Dependency Analyzer and Explorer (Phase 2F).

---

## 1. High-Level Header Layout & Visual Architecture

The application header serves as the top-level command bar, establishing clear project context, fast component/command search, and global actions.

```
+-------------------------------------------------------------------------------------------------------+
| ⚡ Dependency Analyzer   Project: Salesforce Project ▼ [COMPLETE] / AccountService | Search architecture... (⌘K) | 🔍 Compare | Reset View | More ▼ |
+-------------------------------------------------------------------------------------------------------+
```

### 1.1 Header Sections & Components

| Layout Section | Component / Element | Purpose & Functionality |
|---|---|---|
| **Left Area** | Brand Title | Displays application branding: Lightning icon `⚡`, primary title `Dependency Analyzer`, and subtitle `Dependency Explorer`. |
| | Project Context & Switcher | Prominently communicates the **ACTIVE PROJECT** (e.g., `Salesforce Project ▼` or `Core CRM ▼`). Clicking opens the project dropdown or triggers the project command list in Command Palette. |
| | Project Status Badge | Displays real-time analysis status (`COMPLETE`, `ANALYZING`, or component count) with a color-coded status dot. |
| | Context Breadcrumb | Shows active drill/investigation context (e.g., `/ AccountService`). |
| **Center Area** | Global Search Field | Prominent inline trigger button with `Search architecture...` placeholder and `⌘K` / `Ctrl+K` shortcut indicator. Clicking opens the Command Palette modal. |
| **Right Area** | Global Actions | Direct quick-action controls: `🔍 Compare` (toggles architecture snapshot comparison) and `Reset View` (clears graph filters and selection). |
| | "More" Overflow Menu | Dropdown button ("More ▼") hosting quick links: `Open Findings`, `Open Hotspots`, `Open Diagnostics / Cycles`, `Compare Snapshots`, and `Command Palette`. |

---

## 2. Command Palette Architecture (`⌘K` / `Ctrl+K`)

The Command Palette is the central keyboard-driven interaction layer for global search, project switching, panel navigation, and architectural actions.

### 2.1 Supported Command Capabilities

| Category | Command Title | Action / Result | Shortcut / Trigger |
|---|---|---|---|
| **Project** | `Switch project: <Name>` | Switches active Salesforce project dataset, updates `ProjectContext`, flushes previous selection, and reloads graph canvas. | Typing "project" or selecting project entry in palette. |
| **Panel** | `Open Summary` | Opens architecture health summary & metrics panel. | Command Palette -> `Summary` |
| **Panel** | `Open Hotspots` | Opens architectural hotspots & refactoring readiness panel. | Command Palette -> `Hotspots` |
| **Panel** | `Open Diagnostics` | Opens circular dependencies & unresolved references diagnostic panel. | Command Palette -> `Diagnostics` |
| **Panel** | `Find cycles` | Directly opens Diagnostics panel focused on circular dependency cycles. | Command Palette -> `Find cycles` |
| **Panel** | `Open Findings` | Opens architecture rule findings & rule violation list. | Command Palette -> `Findings` |
| **Panel** | `Compare snapshots` | Opens architecture snapshot comparison diff viewer. | Command Palette -> `Compare` |
| **Action** | `Focus on selected node` | Isolates neighborhood around currently selected component (`onApplyFocus`). | Command Palette -> `Focus` |
| **Action** | `Show impact of selected node` | Highlights blast radius for currently selected component (`onShowImpact`). | Command Palette -> `Show impact` |
| **Action** | `Reset graph` | Resets active graph filters, node selection, and zoom level (`onResetView`). | Command Palette -> `Reset graph` |
| **Action** | `Toggle view mode` | Switches workspace mode between Graph Canvas and Findings list (`onToggleViewMode`). | Command Palette -> `Toggle view` |
| **Action** | `Hand off to refactor` | Triggers refactor handoff modal for currently investigated component. | Command Palette -> `Hand off` |
| **Search** | Component Search | Filters all org components by `displayName`, `file`, or `type` via `searchNodes`. Selecting a node isolates and investigates that component. | Typing component name in search input. |

---

## 3. Responsive Behavior & Media Queries

The header adapts fluidly across screen dimensions without sacrificing project context or core search functionality:

1. **Desktop (> 1024px):** Full layout with Brand, Project Switcher, Status Badge, Breadcrumb, Central Search, Compare, Reset View, and More Menu.
2. **Tablet (768px – 1024px):** Breadcrumb text collapses; global action buttons remain accessible.
3. **Mobile / Small Screen (< 768px):** Search field condenses to icon button; breadcrumb hides; project switcher remains prominent; secondary global actions collapse into the "More ▼" overflow dropdown menu.

---

## 4. Accessibility & ARIA Compliance

- **Landmarks:** Header container uses `<header role="banner">`.
- **Keyboard Navigation:**
  - `⌘K` / `Ctrl+K`: Global shortcut listener toggles Command Palette from anywhere in the application.
  - Arrow Keys (`↑`, `↓`): Navigate matching command and component results.
  - `Enter`: Executes selected command or component inspection.
  - `Escape`: Closes dropdown menus or dismisses Command Palette modal.
- **ARIA Attributes:**
  - Dropdown triggers feature `aria-expanded` and `aria-label`.
  - Command Palette modal uses `role="dialog"`, `aria-modal="true"`, and `role="listbox"` with `aria-selected` on active items.

---

## 5. File Ownership & Non-Overlap Guarantees

Per `UI_FILE_OWNERSHIP.md`, Phase 2F modifies **ONLY** its designated files:
- `explorer/src/components/Header.tsx` (Redesigned header & menus)
- `explorer/src/components/Header.test.tsx` (Unit tests)
- `explorer/src/components/CommandPalette.tsx` (Enhanced palette commands)
- `explorer/src/components/CommandPalette.test.tsx` (Unit tests)
- `explorer/src/hooks/useCommandPalette.ts` (Command palette hook)
- `explorer/src/hooks/useCommandPalette.test.ts` (Hook unit tests)
- `HEADER_NAVIGATION_UX.md` (Documentation specification)

Zero modifications were made to shared layout files (`App.tsx`, `main.tsx`) or backend analysis scripts.
