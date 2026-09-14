# Salesforce Architecture Explorer — URL & Investigation State Architecture

## Overview

The Salesforce Architecture Explorer synchronizes application view state with URL query parameters. This enables deep-linking, bookmarking, browser back/forward history navigation, and seamless state restoration across sessions.

The serialization architecture is modularized into dedicated query handlers located in `src/lib/url/`, composed cleanly by the `useViewState` hook in `src/hooks/useViewState.ts`.

---

## 1. Modular Query Architecture (`src/lib/url/`)

URL state parsing and serialization logic is decomposed into six specialized query modules in `dependency-analyzer/explorer/src/lib/url/`:

| Module                  | Responsible Scope                          | Key Parameters Handled                                                                                                                                           | Exposed Contract                                                  |
| ----------------------- | ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `filterQuery.ts`        | Active view mode & search/behavior filters | `view.mode` / `viewMode`, `filter.q`, `filter.type`, `filter.risk`, `filter.hasCallouts`, `filter.withoutSharing`, `filter.hideTests`, `filter.hasAsyncPatterns` | `fromQuery(params)`, `toQuery(state, params)`                     |
| `focusQuery.ts`         | Focus graph expansion state                | `focus.enabled`, `focus.direction`, `focus.depth`, `node`                                                                                                        | `fromQuery(params, nodeFallback)`, `toQuery(focusState, params)`  |
| `impactQuery.ts`        | Blast radius / impact analysis state       | `impact.enabled`, `impact.depth`, `node`                                                                                                                         | `fromQuery(params, nodeFallback)`, `toQuery(impactState, params)` |
| `findingsQuery.ts`      | Diagnostics tab & selected finding         | `diag.tab`, `diag.cycle`, `diag.unresolved`, `finding`                                                                                                           | `fromQuery(params)`, `toQuery(findingsState, params)`             |
| `connectionQuery.ts`    | Connection direction & depth options       | `conn.direction` / `connection.direction`, `conn.depth` / `connection.depth`                                                                                     | `fromQuery(params)`, `toQuery(connState, params)`                 |
| `investigationQuery.ts` | Deep analysis / P4 investigation state     | `investigation` / `investigation.id` / `inv.id`, `inv.status`                                                                                                    | `fromQuery(params)`, `toQuery(invState, params)`                  |

All modules are re-exported via the barrel module `src/lib/url/index.ts`.

---

## 2. Complete URL Search Parameter Schema

| Parameter Key             | Expected Type / Enum                       | Default / Fallback | Description                                                                                                    |
| ------------------------- | ------------------------------------------ | ------------------ | -------------------------------------------------------------------------------------------------------------- |
| `node`                    | `string`                                   | `null`             | Primary selected component/node ID. Reused as `focusNodeId` and `originNodeId` to prevent duplicate node keys. |
| `edge`                    | `string`                                   | `null`             | Primary selected relationship/edge ID.                                                                         |
| `view.mode` / `viewMode`  | `'graph' \| 'findings'`                    | `'graph'`          | Active view mode mode toggle.                                                                                  |
| `filter.q`                | `string`                                   | `""`               | Search query filter string.                                                                                    |
| `filter.type`             | `ExplorerNodeType`                         | `""`               | Component type filter (e.g. `ApexClass`, `Flow`, `LWC`). Invalid values fall back to `""`.                     |
| `filter.risk`             | `'HIGH' \| 'MEDIUM' \| 'LOW'`              | `""`               | Component risk rating filter. Invalid values fall back to `""`.                                                |
| `filter.hasCallouts`      | `'true' \| 'false'`                        | `false`            | Filter for external HTTP callout components.                                                                   |
| `filter.withoutSharing`   | `'true' \| 'false'`                        | `false`            | Filter for Apex classes declared `without sharing`.                                                            |
| `filter.hideTests`        | `'true' \| 'false'`                        | `false`            | Toggle to hide test classes from graph view.                                                                   |
| `filter.hasAsyncPatterns` | `'true' \| 'false'`                        | `false`            | Filter for asynchronous Apex processing patterns.                                                              |
| `focus.enabled`           | `'true' \| 'false'`                        | `false`            | Enable focus graph mode centered around selected `node`.                                                       |
| `focus.direction`         | `'dependencies' \| 'dependents' \| 'both'` | `'both'`           | Focus traversal direction. Invalid values fall back to `'both'`.                                               |
| `focus.depth`             | `1 \| 2 \| 3 \| 'ALL'`                     | `2`                | Focus graph traversal depth limit. Invalid values fall back to `2`.                                            |
| `impact.enabled`          | `'true' \| 'false'`                        | `false`            | Enable blast radius / impact analysis mode starting at `node`.                                                 |
| `impact.depth`            | `1 \| 2 \| 3 \| 'ALL'`                     | `'ALL'`            | Blast radius impact depth limit. Invalid values fall back to `'ALL'`.                                          |
| `diag.tab`                | `'cycles' \| 'unresolved' \| 'none'`       | `'none'`           | Active diagnostics drawer tab. Invalid values fall back to `'none'`.                                           |
| `diag.cycle`              | `string`                                   | `null`             | Active architecture cycle group identifier.                                                                    |
| `diag.unresolved`         | `string`                                   | `null`             | Active unresolved reference edge identifier.                                                                   |
| `finding`                 | `string`                                   | `null`             | Selected deterministic architecture finding identifier. Aliases: `finding.id`, `findingId`.                    |
| `conn.direction`          | `'dependencies' \| 'dependents' \| 'both'` | `'both'`           | Standalone connection direction option. Aliases: `connection.direction`, `focus.direction`.                    |
| `conn.depth`              | `1 \| 2 \| 3 \| 'ALL'`                     | `2`                | Standalone connection depth limit. Aliases: `connection.depth`, `focus.depth`.                                 |
| `investigation`           | `string`                                   | `null`             | Selected semantic P4 investigation task ID. Aliases: `investigation.id`, `inv.id`, `investigationId`.          |
| `inv.status`              | `string`                                   | `null`             | Active investigation execution status filter.                                                                  |

---

## 3. Design Directives & Safety Guarantees

1. **Node Parameter Reuse**:
   When a node is selected, focused, or chosen as an impact origin, a single `node` parameter is written to the URL (e.g. `?node=ApexClass%3AAssetService`). Duplicate keys like `focus.node` or `impact.node` are eliminated.

2. **Backward Compatibility**:
   All historic URL parameter names (including `viewMode`, `finding.id`, `connection.direction`, etc.) remain fully parsed and mapped cleanly into state.

3. **Safe Error Handling & Fallbacks**:
   - Unknown query parameters in incoming URLs are ignored safely without causing errors or crashes.
   - Out-of-bounds or invalid enum values (e.g., `focus.depth=999` or `filter.type=InvalidType`) fall back to safe default values.

4. **Compact URL State**:
   No heavy JSON snapshots, component lists, or graph structures are serialized into the URL. Only scalar IDs, enum tokens, and booleans are stored.

5. **Loop Prevention & Browser Navigation**:
   - `useViewState` monitors `window.location.search` before invoking `history.replaceState` to prevent redundant URL updates.
   - A `popstate` event listener is registered to re-parse query parameters during browser Back/Forward navigation, updating React state cleanly without infinite render loops.
