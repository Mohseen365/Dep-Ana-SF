# Shared UI Design System - Dependency Analyzer

## Overview

This document defines the **Shared UI Design System** for the Dependency Analyzer frontend ecosystem. It establishes a consistent, professional visual language tailored for developer and enterprise architecture tools.

### Visual Philosophy & Direction
- **Graph as Visual Hero:** Canvas visualization remains primary. UI controls, panels, overlays, and drawers surround the graph without competing for visual hierarchy.
- **Subtle Elevation & Surfaces:** Dark mode interface utilizing subtle surface gradients and tonal separation rather than heavy, high-contrast borders.
- **Restrained Borders & Grouping:** Reduced visual clutter through borderless card grouping and soft background contrast (`--surface-card`, `--surface-subtle`).
- **Meaningful Semantic Color:** Colors carry explicit architectural meaning (Risk, Severity, State) and are never used purely for decoration.
- **Readable & Scalable Typography:** Crisp, system-native font stack with strict hierarchy and monospace support for identifiers and code elements.

---

## 1. Design Tokens Reference

All design system tokens are declared as CSS custom properties in `explorer/src/index.css` under `:root`.

### 1.1 Background Surfaces
| Token Name | Value | Purpose / Usage |
|---|---|---|
| `--surface-base` | `#090d16` | Main window / canvas background |
| `--surface-panel` | `#111827` | Primary panel & drawer container background |
| `--surface-card` | `#1e293b` | Card container, header, hover surface |
| `--surface-hover` | `#2d3748` | Interactive item hover state |
| `--surface-active` | `#334155` | Interactive item active/pressed state |
| `--surface-subtle` | `#0f172a` | Input fields, code block background |
| `--surface-overlay` | `rgba(15, 23, 42, 0.95)` | Tooltips, popovers, floating card overlays |

### 1.2 Panel Surfaces
| Token Name | Value | Purpose / Usage |
|---|---|---|
| `--panel-bg` | `var(--surface-panel)` | Main panel container background |
| `--panel-header-bg` | `#1e293b` | Panel header background |
| `--panel-footer-bg` | `#0f172a` | Panel footer / action bar background |
| `--panel-subpanel-bg` | `#0d1322` | Nested sub-panel background |

### 1.3 Borders
| Token Name | Value | Purpose / Usage |
|---|---|---|
| `--border-subtle` | `#1e293b` | Internal dividers & subtle card outlines |
| `--border-default` | `#334155` | Standard structural borders & panel separators |
| `--border-strong` | `#475569` | High-contrast borders & focus state indicators |
| `--border-focus` | `#3b82f6` | Input & control keyboard focus rings |

### 1.4 Primary / Secondary Text
| Token Name | Value | Purpose / Usage |
|---|---|---|
| `--text-primary` | `#f8fafc` | Main titles, high-emphasis body text |
| `--text-secondary` | `#cbd5e1` | Secondary body text, list items |

### 1.5 Muted Text
| Token Name | Value | Purpose / Usage |
|---|---|---|
| `--text-muted` | `#94a3b8` | Metadata, labels, hints, timestamps |
| `--text-disabled` | `#64748b` | Disabled options, placeholder text |

### 1.6 Accent
| Token Name | Value | Purpose / Usage |
|---|---|---|
| `--accent-primary` | `#3b82f6` | Brand accent, active tab, primary buttons |
| `--accent-hover` | `#2563eb` | Hover state for accent controls |
| `--accent-active` | `#1d4ed8` | Active/pressed state for accent controls |
| `--accent-subtle` | `rgba(59, 130, 246, 0.15)` | Selected row background, badge tint |
| `--accent-focus` | `rgba(59, 130, 246, 0.4)` | Focus glow ring |

### 1.7 Risk Levels
| Token Name | Color Value | Tint / Background Value | Architectural Meaning |
|---|---|---|---|
| Critical | `--risk-critical` (`#f87171`) | `--risk-critical-bg` (`rgba(239,68,68,0.18)`) | Immediate refactoring blocker / severe rule violation |
| High | `--risk-high` (`#ef4444`) | `--risk-high-bg` (`rgba(239,68,68,0.12)`) | High architectural risk / cycle / hotspot |
| Medium | `--risk-medium` (`#f59e0b`) | `--risk-medium-bg` (`rgba(245,158,11,0.12)`) | Moderate coupling / caution candidate |
| Low | `--risk-low` (`#10b981`) | `--risk-low-bg` (`rgba(16,185,129,0.12)`) | Low coupling / safe candidate |
| None | `--risk-none` (`#64748b`) | `--risk-none-bg` (`rgba(100,116,139,0.12)`) | Unrated / informational |

### 1.8 Success / Warning / Error / Info States
| State | Color Token | Background Tint Token |
|---|---|---|
| Success | `--state-success` (`#10b981`) | `--state-success-bg` (`rgba(16,185,129,0.15)`) |
| Warning | `--state-warning` (`#f59e0b`) | `--state-warning-bg` (`rgba(245,158,11,0.15)`) |
| Error | `--state-error` (`#ef4444`) | `--state-error-bg` (`rgba(239,68,68,0.15)`) |
| Info | `--state-info` (`#38bdf8`) | `--state-info-bg` (`rgba(56,189,248,0.15)`) |

### 1.9 Spacing System
| Token Name | Value | Typical Usage |
|---|---|---|
| `--space-1` | `2px` | Micro gaps, dot offsets |
| `--space-2` | `4px` | Icon padding, tight button gap |
| `--space-3` | `8px` | Standard element gap, inner card padding |
| `--space-4` | `12px` | Medium padding, panel subheader gap |
| `--space-5` | `16px` | Standard panel padding, card body margin |
| `--space-6` | `20px` | Large section spacing |
| `--space-7` | `24px` | Overlay & modal header spacing |
| `--space-8` | `32px` | Empty state padding |

### 1.10 Typography System
| Category | Token Name | Value |
|---|---|---|
| **Font Family** | `--font-sans` | `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif` |
| | `--font-mono` | `ui-monospace, SFMono-Regular, Consolas, monospace` |
| **Font Sizes** | `--font-size-xs` | `10px` |
| | `--font-size-sm` | `11px` |
| | `--font-size-md` | `13px` |
| | `--font-size-lg` | `15px` |
| | `--font-size-xl` | `18px` |
| **Font Weights** | `--font-weight-regular` | `400` |
| | `--font-weight-medium` | `500` |
| | `--font-weight-semibold` | `600` |
| | `--font-weight-bold` | `700` |
| **Line Heights** | `--line-height-tight` | `1.2` |
| | `--line-height-normal` | `1.4` |
| | `--line-height-relaxed` | `1.6` |

### 1.11 Border Radius
| Token Name | Value | Usage |
|---|---|---|
| `--radius-sm` | `4px` | Small buttons, badges, key hints |
| `--radius-md` | `6px` | Standard buttons, inputs, dropdown items |
| `--radius-lg` | `8px` | Floating cards, legend panels |
| `--radius-xl` | `12px` | Modals, command palette overlay |
| `--radius-full` | `9999px` | Badges, status dots |

### 1.12 Shadows
| Token Name | Value | Usage |
|---|---|---|
| `--shadow-sm` | `0 1px 2px 0 rgba(0, 0, 0, 0.3)` | Subtle card elevation |
| `--shadow-md` | `0 4px 6px -1px rgba(0, 0, 0, 0.4)` | Floating controls & tooltips |
| `--shadow-lg` | `0 10px 15px -3px rgba(0, 0, 0, 0.5)` | Drawers & side panels |
| `--shadow-overlay` | `0 20px 25px -5px rgba(0, 0, 0, 0.7)` | Modal overlays & command palette |

### 1.13 Transitions
| Token Name | Value | Usage |
|---|---|---|
| `--transition-fast` | `all 0.1s ease` | Button hover, icon state toggle |
| `--transition-normal` | `all 0.15s ease` | Tab selection, drawer expansion |
| `--transition-slow` | `all 0.25s ease` | View mode switching, panel collapse |

### 1.14 Control Heights
| Token Name | Value | Usage |
|---|---|---|
| `--control-height-sm` | `26px` | Dense toolbar inputs & small filters |
| `--control-height-md` | `32px` | Standard inputs & buttons |
| `--control-height-lg` | `40px` | Search bar & primary action buttons |

### 1.15 Icon / Button Sizing
| Category | Token Name | Value |
|---|---|---|
| **Icons** | `--icon-size-sm` | `12px` |
| | `--icon-size-md` | `16px` |
| | `--icon-size-lg` | `20px` |
| **Buttons** | `--btn-height-sm` | `26px` |
| | `--btn-height-md` | `32px` |
| | `--btn-height-lg` | `40px` |

---

## 2. Reusable Component CSS Classes

The design system provides modular CSS classes in `explorer/src/index.css` for instant consumption across all UI phases.

### 2.1 Buttons
```html
<!-- Primary Button -->
<button className="ui-btn ui-btn-primary">Apply Action</button>

<!-- Secondary Button -->
<button className="ui-btn ui-btn-secondary">Cancel</button>

<!-- Ghost Button -->
<button className="ui-btn ui-btn-ghost">Options</button>

<!-- Danger Button -->
<button className="ui-btn ui-btn-danger">Delete</button>

<!-- Small / Large Variants -->
<button className="ui-btn ui-btn-primary ui-btn-sm">Small</button>
<button className="ui-btn ui-btn-primary ui-btn-lg">Large</button>
```

### 2.2 Icon Buttons
```html
<!-- Standard Icon Button -->
<button className="ui-icon-btn" aria-label="Zoom In">+</button>

<!-- Active State Icon Button -->
<button className="ui-icon-btn ui-icon-btn-active" aria-label="Pin">📌</button>

<!-- Sizing Variants -->
<button className="ui-icon-btn ui-icon-btn-sm">🔍</button>
<button className="ui-icon-btn ui-icon-btn-lg">⚙️</button>
```

### 2.3 Badges
```html
<span className="ui-badge ui-badge-primary">ApexClass</span>
<span className="ui-badge ui-badge-critical">Critical Risk</span>
<span className="ui-badge ui-badge-high">High Impact</span>
<span className="ui-badge ui-badge-medium">Caution</span>
<span className="ui-badge ui-badge-low">Safe</span>
<span className="ui-badge ui-badge-info">6 Dependents</span>
```

### 2.4 Status Indicators
```html
<div className="ui-status-indicator">
  <span className="ui-status-dot ui-status-critical"></span>
  <span>System Health: Critical</span>
</div>
```

### 2.5 Panel Headers
```html
<div className="ui-panel-header">
  <div>
    <h2 className="ui-panel-title">Hotspot Analysis</h2>
    <span className="ui-panel-subtitle">Refactoring Candidates</span>
  </div>
  <div className="ui-panel-actions">
    <button className="ui-icon-btn ui-icon-btn-sm">🔄</button>
  </div>
</div>
```

### 2.6 Tabs
```html
<div className="ui-tabs">
  <button className="ui-tab-item active">Graph View</button>
  <button className="ui-tab-item">Hotspots</button>
  <button className="ui-tab-item">Findings</button>
</div>
```

### 2.7 Inputs & Search Fields
```html
<!-- Standard Input -->
<input type="text" className="ui-input" placeholder="Enter component name..." />

<!-- Search Field -->
<div className="ui-search-field">
  <span className="ui-search-icon">🔍</span>
  <input type="text" className="ui-search-input" placeholder="Search components (⌘K)..." />
  <button className="ui-search-clear">×</button>
</div>
```

### 2.8 Tooltips
```html
<div className="ui-tooltip">
  <span>Coupling Score: 0.85 (High)</span>
</div>
```

### 2.9 Overlays & Modals
```html
<div className="ui-overlay">
  <div className="ui-modal">
    <div className="ui-panel-header">
      <h2 className="ui-panel-title">Modal Title</h2>
    </div>
    <div className="ui-drawer-body">Content goes here...</div>
  </div>
</div>
```

### 2.10 Drawers
```html
<div className="ui-drawer">
  <div className="ui-drawer-header">Header</div>
  <div className="ui-drawer-body">Body</div>
  <div className="ui-drawer-footer">Footer</div>
</div>
```

### 2.11 Empty States
```html
<div className="ui-empty-state">
  <div className="ui-empty-icon">🔍</div>
  <h3 className="ui-empty-title">No Findings Selected</h3>
  <p className="ui-empty-description">Select an architectural rule finding to inspect affected evidence and files.</p>
</div>
```

---

## 3. Usage Rules & Guidelines

1. **Strict Token Adherence:** Never hardcode HEX colors, RGB values, or arbitrary pixel padding in inline styles or component CSS. Always reference `var(--token-name)`.
2. **Graph Visual Primacy:** Keep canvas background dark (`--surface-base`) with subtle radial grid dots. Avoid high-contrast background blocks over graph canvas.
3. **Restrained Badge Count:** Limit list row badge counts to 1–2 key indicators (e.g., Risk dot + Type badge) to eliminate visual noise.
4. **Ownership Invariants:** Do not modify unowned files across parallel UI phases. Refer to `UI_FILE_OWNERSHIP.md` for exact file assignments.
5. **Accessibility Focus:** Ensure focus rings (`:focus-visible`) use `--accent-primary` or `--border-focus` and maintain minimum contrast ratios against `--surface-panel`.

---

## 4. Files Changed

- `explorer/src/index.css`: Added 15 token categories under `:root`, backward compatibility aliases, and modular `.ui-*` reusable component classes.
- `UI_DESIGN_SYSTEM.md`: Created as the primary specification and usage reference document.

---

## 5. Compatibility Notes

- **100% Backward Compatible:** All existing CSS variable names (`--bg-primary`, `--bg-secondary`, `--bg-panel`, `--bg-card`, `--bg-hover`, `--border-color`, `--text-main`) are preserved as aliases pointing to new design system tokens.
- **Zero Dependency Logic Alteration:** No modifications were made to `dependency-analyzer.cjs` or any Cytoscape graph construction logic.
- **Ready for Consumption:** Parallel UI phases (2A through 2I) can immediately adopt `.ui-*` classes and `--token-name` variables.
