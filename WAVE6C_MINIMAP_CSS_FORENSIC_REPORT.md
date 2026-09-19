# WAVE 6C — MINIMAP / NAVIGATOR CSS FORENSIC REPORT

## Executive Summary

A comprehensive forensic audit was conducted on `.minimap-container` and `.cytoscape-navigator` CSS rules across `explorer/src/index.css` and `explorer/src/components/graph-internals/graph.css`.

---

## Forensic Analysis

1. **Containing Block & Positioning Context**:
   - The containing block for `.minimap-container` is `.graph-pane` / `.graph-container`, which has `position: relative`.
   - `.minimap-container` is positioned with `position: absolute`.

2. **Analysis of `!important` Rules in `index.css`**:
   - `index.css` contains:
     ```css
     .minimap-container,
     .cytoscape-navigator {
       position: absolute !important;
       bottom: 18px !important;
       right: 58px !important;
       top: auto !important;
       width: 200px !important;
       height: 140px !important;
       background-color: rgba(17, 24, 39, 0.95) !important;
       border: 1px solid var(--border-default) !important;
       border-radius: var(--radius-lg) !important;
       z-index: 25 !important;
       overflow: hidden !important;
       box-shadow: var(--shadow-lg) !important;
     }
     ```
   - **Why `!important` was added**:
     The third-party library `cytoscape-navigator` injects inline styles (`style="position: absolute; top: ...; left: ...; width: ...;"`) directly onto the DOM element when `cy.navigator(...)` initializes. Without `!important` overrides, Cytoscape Navigator's default inline styles force the navigator to position at top-left or full-canvas width, breaking the Explorer layout.
   - **Conflict with `graph.css`**:
     `graph.css` defined duplicate rules (`bottom: 60px; right: 16px; width: 150px; height: 100px;`) which were completely overridden by `index.css`.

3. **Responsive Behavior**:
   - At `@media (max-width: 768px)`, `index.css` scales `.minimap-container` down to `width: 150px !important; height: 100px !important; right: 12px !important; bottom: 12px !important;`.

4. **Collapse / Reopen State Verification**:
   - `GraphView.tsx` toggles visibility via `.minimap-container.hidden` (`display: none !important;`).
   - Reopening removes `.hidden`, restoring visibility cleanly at `right: 58px`, `bottom: 18px`, correctly positioned beside floating graph controls without obscuring status bar or graph canvas elements.

---

## Required Validation

All GraphView & Minimap tests passed cleanly:
```bash
npx vitest run src/components/GraphView.test.tsx src/test/RegressionAcceptance.test.tsx
```
- Minimap rendering, toggling, close button interaction, and Cytoscape initialization function 100% correctly.
- No CSS code modification required (audit confirms existing `!important` rules are necessary for third-party inline style override).
