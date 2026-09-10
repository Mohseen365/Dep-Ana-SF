# Refactoring Readiness and Architectural Hotspots

## Overview

Prompt 13 introduces two key decision-support features to the Salesforce Architecture & Refactoring Explorer:
1. **Refactoring Readiness**: Evaluates and displays a deterministic caution level before altering a component.
2. **Architectural Hotspots**: Provides a categorized and navigational view of components requiring architectural attention.

Both features strictly rely on pre-computed static analysis data provided by `dependency-analyzer.cjs` and serialized in `explorer-data.json`. No metric recalculation, LLM calls, backend servers, or `orchestrator.js` dependencies are introduced.

---

## 1. Refactoring Readiness

### Purpose & Disclaimer

The purpose of Refactoring Readiness is to answer:
> *"How much caution should I use before changing this component?"*

**Mandatory Disclaimer:**
Refactoring Readiness is a decision support indicator based on static analysis metadata and metrics. It is not a guarantee of safety or risk-free modification.

### Classifications

The readiness levels are categorized into three clear classifications:

1. **GOOD CANDIDATE**
   - Low risk evaluation score from analyzer (`risk === "LOW"`).
   - No circular dependency participation.
   - No unresolved external or missing references.
   - Verified test coverage (`testCoverageStatus === "COVERED"`).
   - Limited architectural impact surface (`totalImpactCount < 5`, low fan-in/coupling).

2. **CAUTION**
   - Moderate risk evaluation (`risk === "MEDIUM"`).
   - Moderate fan-in (`4 <= fanIn < 8`), coupling (`8 <= coupling < 15`), or architectural impact (`5 <= totalImpactCount < 10`).

3. **HIGH CAUTION**
   - High risk evaluation (`risk === "HIGH"` or `refactoringReadiness.isHighRisk`).
   - Participates in circular dependency (`refactoringReadiness.hasCycles`).
   - Unresolved references present (`refactoringReadiness.hasUnresolved` or `unresolved > 0`).
   - Missing test coverage (`testCoverageStatus === "UNTESTED"` or `"NO_TESTS"`).
   - Large architectural impact surface (`totalImpactCount >= 10`, `fanIn >= 8`, or `coupling >= 15`).

### Data Sources & Determinism

Refactoring Readiness uses the following pre-computed analyzer contract fields:
- `node.risk` & `node.riskReasons`
- `node.metrics` (`fanIn`, `fanOut`, `coupling`, `unresolved`, `score`)
- `node.refactoringReadiness` (`isHighRisk`, `hasCycles`, `hasUnresolved`, `testCoverageStatus`)
- `impactSummary` (`totalImpactCount`, `directDependencies`, `directDependents`, `impactedTests`)

---

## 2. Architectural Hotspots

### Purpose

Architectural Hotspots answers:
> *"Which components in the repository deserve architectural attention?"*

### Hotspot Categories

To ensure explainable, non-arbitrary organization, hotspots are presented in deterministic categories:
- **High Risk**: Components flagged with `HIGH` risk by the analyzer.
- **High Fan-In**: Components consumed by 8 or more downstream components (`fanIn >= 8`).
- **High Coupling**: Components with 15 or more total connections (`coupling >= 15`).
- **Circular Dependencies**: Components participating in strongly connected dependency cycles.
- **Unresolved References**: Components referencing missing or unresolvable symbols.

### Deterministic Ranking & Tie-Breaking

When displayed in the **Top Ranked** list, hotspot items are ordered deterministically using the following formula:
1. `metrics.score` descending
2. `metrics.coupling` descending
3. `metrics.fanIn` descending
4. `displayName` ascending (alphabetical tie-breaker)

### UI Interaction & Navigation

Selecting a hotspot item from `HotspotPanel`:
1. Selects the target node in the graph view.
2. Smoothly centers and highlights the component in Cytoscape.
3. Opens the `DetailsPanel` showing the component's full coupling metrics, Refactoring Readiness evaluation, risk reasons, and impact summaries.
4. Updates focus controls state for quick focus inspection.

---

## 3. Verification & Testing

### Automated Test Coverage

The implementation includes 115 passing Vitest tests covering:
- **Readiness Logic (`src/lib/readiness.test.ts`)**: Low risk candidates, medium risk caution, high risk caution, cycles, unresolved references, untested/no-tests status, large impact.
- **Hotspot Ranking (`src/lib/hotspots.test.ts`)**: Categorization, deterministic tie-breaking across equal metrics, empty/small graph handling.
- **UI Components (`src/components/HotspotPanel.test.tsx` & `src/components/DetailsPanel.test.tsx`)**: Component rendering, tab toggling, hotspot selection callback, readiness card display.

### Commands Executed

```bash
node scripts/test-export-explorer.cjs
cd explorer && npm test
cd explorer && npm run build
```

All 12 contract invariants passed, all 115 unit/integration tests passed, and Vite production bundle compiled cleanly without warnings or errors.
