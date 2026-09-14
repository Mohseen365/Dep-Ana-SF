/**
 * Deterministic Architecture Debt Engine (Prompt C3)
 *
 * Detects and classifies observable architectural debt conditions that make the
 * system harder, riskier, or more expensive to change based on 100% deterministic
 * evidence and capability outputs.
 *
 * Vocabulary / Categories:
 *   - excessive-coupling: High total coupling / god component structure
 *   - excessive-dependency-breadth: High fan-in or fan-out hub structure
 *   - architectural-bottleneck: High centrality flow bottleneck
 *   - boundary-violation: Participation in circular dependencies or boundary leaks
 *   - layering-violation: Illegal cross-layer or lower-to-higher layer dependency
 *   - insufficient-test-protection: Test gap on critical or complex execution path
 *   - excessive-change-amplification: Large blast radius propagating across dependents
 *   - duplicated-responsibility: Mixed presentation/entry control with direct data persistence
 *   - risky-external-coupling: Concentration of multiple external boundary integrations
 *   - security-boundary-risk: 'without sharing' mode on entry/data paths
 *   - architectural-ambiguity: Unresolved or ambiguous static references/mappings
 */

"use strict";

const {
  createEvidence,
  createDeterministicResult
} = require("./deterministic/contract.cjs");

const { detectComponentSmells } = require("./architecture-smells.cjs");
const { detectComponentBottleneck } = require("./bottleneck-detector.cjs");
const { analyzeSecurityBoundaries } = require("./security-boundaries.cjs");
const { detectEntryPoint } = require("./entry-points.cjs");
const { detectExternalBoundary } = require("./external-boundaries.cjs");
const { simulateChange } = require("./change-simulator.cjs");

const DEBT_CATEGORIES = Object.freeze([
  "excessive-coupling",
  "excessive-dependency-breadth",
  "architectural-bottleneck",
  "boundary-violation",
  "layering-violation",
  "insufficient-test-protection",
  "excessive-change-amplification",
  "duplicated-responsibility",
  "risky-external-coupling",
  "security-boundary-risk",
  "architectural-ambiguity"
]);

const DEBT_SEVERITIES = Object.freeze(["critical", "high", "medium", "low"]);

const SEVERITY_RANK = Object.freeze({
  critical: 4,
  high: 3,
  medium: 2,
  low: 1
});

const DEBT_METADATA = Object.freeze({
  "excessive-coupling": {
    consequence: "Excessive coupling creates tight intercomponent binding, making independent refactoring and testing difficult and increasing system fragility.",
    remediationDirection: "Decouple component into smaller, single-purpose interfaces and reduce outbound/inbound dependencies."
  },
  "excessive-dependency-breadth": {
    consequence: "Excessive dependency breadth causes wide fan-in or fan-out, turning the component into a dependency junction that impacts numerous callers or dependencies.",
    remediationDirection: "Extract specialized service abstractions or introduce an API facade to reduce fan-in/fan-out breadth."
  },
  "architectural-bottleneck": {
    consequence: "Architectural bottlenecks concentrate system flow and coupling, creating single points of failure and change congestion.",
    remediationDirection: "Distribute responsibilities or introduce message/event abstraction to relieve bottleneck centrality."
  },
  "boundary-violation": {
    consequence: "Boundary violations break architectural encapsulation and cyclic boundaries, creating tight structural loops that prevent isolated compilation and testing.",
    remediationDirection: "Break circular dependencies by applying dependency inversion or event-driven decoupling."
  },
  "layering-violation": {
    consequence: "Layering violations bypass architectural abstractions, leaking lower-level data concerns into higher presentation/entry layers or vice versa.",
    remediationDirection: "Re-route dependencies through appropriate intermediate service/domain layer contracts."
  },
  "insufficient-test-protection": {
    consequence: "Lack of test protection on critical paths exposes high-impact components to undetected regression defects during refactoring.",
    remediationDirection: "Add targeted unit and integration test coverage for critical execution paths."
  },
  "excessive-change-amplification": {
    consequence: "Excessive change amplification causes small modifications to propagate broadly across many transitive dependent components.",
    remediationDirection: "Stabilize public interfaces and isolate internal state changes behind stable contract abstractions."
  },
  "duplicated-responsibility": {
    consequence: "Duplicated or mixed responsibilities blur architectural boundaries by combining presentation/entry logic with persistence operations.",
    remediationDirection: "Delegate database operations to dedicated selector or domain service components."
  },
  "risky-external-coupling": {
    consequence: "Concentrating multiple external boundary integrations in a single component increases exposure to third-party API changes, network failures, and latency.",
    remediationDirection: "Isolate external API callouts into dedicated single-integration adapter classes."
  },
  "security-boundary-risk": {
    consequence: "Operating in 'without sharing' mode at entry points or across broad data paths elevates security risks by bypassing user-level record access controls.",
    remediationDirection: "Enforce explicit sharing models ('with sharing' or 'inherited sharing') or apply 'WITH USER_MODE' / 'AccessLevel.USER_MODE' checks."
  },
  "architectural-ambiguity": {
    consequence: "Architectural ambiguity obscures static dependency analysis, making system behavior and impact prediction uncertain.",
    remediationDirection: "Resolve ambiguous references or test mappings with explicit type declarations or references."
  }
});

/**
 * Merges duplicate debt signals for the same component and category,
 * retaining the highest severity and combined evidence.
 */
function mergeDebtItems(items) {
  const map = new Map();

  for (const item of items) {
    const key = `${item.debtCategory}`;
    if (!map.has(key)) {
      map.set(key, {
        debtCategory: item.debtCategory,
        affectedComponents: [...item.affectedComponents],
        severity: item.severity,
        confidence: item.confidence || "high",
        evidence: [...item.evidence],
        sourceCapability: item.sourceCapability,
        architecturalConsequence: item.architecturalConsequence,
        remediationDirection: item.remediationDirection
      });
    } else {
      const existing = map.get(key);

      // Select highest severity
      const existingRank = SEVERITY_RANK[existing.severity] || 1;
      const newRank = SEVERITY_RANK[item.severity] || 1;
      if (newRank > existingRank) {
        existing.severity = item.severity;
      }

      // Merge affected components
      for (const comp of item.affectedComponents) {
        if (!existing.affectedComponents.includes(comp)) {
          existing.affectedComponents.push(comp);
        }
      }

      // Merge evidence rules cleanly without duplicating identical rule+detail
      for (const ev of item.evidence) {
        const isDuplicate = existing.evidence.some(
          e => e.rule === ev.rule && e.detail === ev.detail
        );
        if (!isDuplicate) {
          existing.evidence.push(ev);
        }
      }

      // Merge source capability list if different
      if (existing.sourceCapability !== item.sourceCapability && !existing.sourceCapability.includes(item.sourceCapability)) {
        existing.sourceCapability = `${existing.sourceCapability}, ${item.sourceCapability}`;
      }
    }
  }

  return Array.from(map.values());
}

/**
 * Detects architectural debt items for a single component using deterministic evidence.
 */
function detectComponentArchitectureDebt(symbol, graph = null, metric = null, context = {}) {
  if (!symbol) {
    const res = createDeterministicResult({
      value: "unknown",
      primary: "unknown",
      confidence: "unknown",
      evidence: [createEvidence("no-symbol", "Component symbol is missing or null.")],
      secondary: [],
      metadata: { hasDebt: false, debtCount: 0, debtItems: [] }
    });
    res.hasDebt = false;
    res.debtItems = [];
    return res;
  }

  const symbolId = symbol.id || `ApexClass:${symbol.name}`;
  const symbolName = symbol.name || symbolId;
  const p = symbol.parsed || {};

  const rawDebtItems = [];

  // 1. REUSE EXISTING SMELLS (Aggregate/reference existing smells)
  const smellInfo = context.smellInfo || detectComponentSmells(symbol, graph, metric, context);
  if (smellInfo.hasSmells && Array.isArray(smellInfo.smells)) {
    for (const smellItem of smellInfo.smells) {
      switch (smellItem.smell) {
        case "god-component":
          rawDebtItems.push({
            debtCategory: "excessive-coupling",
            affectedComponents: [symbolName],
            severity: "critical",
            confidence: "high",
            evidence: smellItem.evidence || [createEvidence("god-component-smell", `Bloated god component '${symbolName}'.`)],
            sourceCapability: "architecture-smells",
            architecturalConsequence: DEBT_METADATA["excessive-coupling"].consequence,
            remediationDirection: DEBT_METADATA["excessive-coupling"].remediationDirection
          });
          break;

        case "high-coupling":
          rawDebtItems.push({
            debtCategory: "excessive-coupling",
            affectedComponents: [symbolName],
            severity: "high",
            confidence: "high",
            evidence: smellItem.evidence || [createEvidence("high-coupling-smell", `High coupling detected on component '${symbolName}'.`)],
            sourceCapability: "architecture-smells",
            architecturalConsequence: DEBT_METADATA["excessive-coupling"].consequence,
            remediationDirection: DEBT_METADATA["excessive-coupling"].remediationDirection
          });
          break;

        case "hub-component":
          rawDebtItems.push({
            debtCategory: "excessive-dependency-breadth",
            affectedComponents: [symbolName],
            severity: "high",
            confidence: "high",
            evidence: smellItem.evidence || [createEvidence("hub-component-smell", `Hub component with high fan-in detected on '${symbolName}'.`)],
            sourceCapability: "architecture-smells",
            architecturalConsequence: DEBT_METADATA["excessive-dependency-breadth"].consequence,
            remediationDirection: DEBT_METADATA["excessive-dependency-breadth"].remediationDirection
          });
          break;

        case "circular-dependency":
          rawDebtItems.push({
            debtCategory: "boundary-violation",
            affectedComponents: [symbolName],
            severity: "high",
            confidence: "high",
            evidence: smellItem.evidence || [createEvidence("circular-dependency-smell", `Component '${symbolName}' participates in circular dependency.`)],
            sourceCapability: "architecture-smells",
            architecturalConsequence: DEBT_METADATA["boundary-violation"].consequence,
            remediationDirection: DEBT_METADATA["boundary-violation"].remediationDirection
          });
          break;

        case "layer-violation":
          rawDebtItems.push({
            debtCategory: "layering-violation",
            affectedComponents: [symbolName],
            severity: "critical",
            confidence: "high",
            evidence: smellItem.evidence || [createEvidence("layer-violation-smell", `Illegal layer dependency detected on component '${symbolName}'.`)],
            sourceCapability: "architecture-smells",
            architecturalConsequence: DEBT_METADATA["layering-violation"].consequence,
            remediationDirection: DEBT_METADATA["layering-violation"].remediationDirection
          });
          break;

        case "uncovered-critical-path":
          rawDebtItems.push({
            debtCategory: "insufficient-test-protection",
            affectedComponents: [symbolName],
            severity: "critical",
            confidence: "high",
            evidence: smellItem.evidence || [createEvidence("uncovered-critical-path-smell", `Uncovered critical path on component '${symbolName}'.`)],
            sourceCapability: "architecture-smells",
            architecturalConsequence: DEBT_METADATA["insufficient-test-protection"].consequence,
            remediationDirection: DEBT_METADATA["insufficient-test-protection"].remediationDirection
          });
          break;

        case "mixed-responsibility":
          rawDebtItems.push({
            debtCategory: "duplicated-responsibility",
            affectedComponents: [symbolName],
            severity: "high",
            confidence: "high",
            evidence: smellItem.evidence || [createEvidence("mixed-responsibility-smell", `Mixed controller and persistence responsibility on '${symbolName}'.`)],
            sourceCapability: "architecture-smells",
            architecturalConsequence: DEBT_METADATA["duplicated-responsibility"].consequence,
            remediationDirection: DEBT_METADATA["duplicated-responsibility"].remediationDirection
          });
          break;

        case "external-boundary-concentration":
          rawDebtItems.push({
            debtCategory: "risky-external-coupling",
            affectedComponents: [symbolName],
            severity: "high",
            confidence: "high",
            evidence: smellItem.evidence || [createEvidence("external-boundary-concentration-smell", `Concentrated external boundaries on '${symbolName}'.`)],
            sourceCapability: "architecture-smells",
            architecturalConsequence: DEBT_METADATA["risky-external-coupling"].consequence,
            remediationDirection: DEBT_METADATA["risky-external-coupling"].remediationDirection
          });
          break;

        default:
          break;
      }
    }
  }

  // 2. ARCHITECTURAL BOTTLENECK SIGNAL
  const bottleneckInfo = context.bottleneckInfo || detectComponentBottleneck(symbol, graph, metric, context.cycles || []);
  if (bottleneckInfo && bottleneckInfo.isBottleneck) {
    rawDebtItems.push({
      debtCategory: "architectural-bottleneck",
      affectedComponents: [symbolName],
      severity: "high",
      confidence: "high",
      evidence: [
        createEvidence(
          "architectural-bottleneck-signal",
          `Component '${symbolName}' is an architectural bottleneck (score ${bottleneckInfo.score || 0}) with high fan-in or centrality.`
        )
      ],
      sourceCapability: "bottleneck-detector",
      architecturalConsequence: DEBT_METADATA["architectural-bottleneck"].consequence,
      remediationDirection: DEBT_METADATA["architectural-bottleneck"].remediationDirection
    });
  }

  // 3. CHANGE SIMULATION / CHANGE AMPLIFICATION SIGNAL
  const changeSimulationInfo = context.changeSimulationInfo || (
    graph ? simulateChange(symbol, "modify_component", graph, context.registry, context.options) : null
  );
  if (changeSimulationInfo) {
    const meta = changeSimulationInfo.metadata || {};
    const transitiveCount = (meta.transitiveDependents || []).length;
    const isLarge = meta.blastRadiusLevel === "large" || transitiveCount >= 10;

    if (isLarge) {
      const isCycleInvolved = Boolean(meta.cycleInvolved);
      rawDebtItems.push({
        debtCategory: "excessive-change-amplification",
        affectedComponents: [symbolName],
        severity: isCycleInvolved ? "critical" : "high",
        confidence: "high",
        evidence: [
          createEvidence(
            "excessive-change-blast-radius",
            `Simulation reveals large change blast radius affecting ${transitiveCount} transitive dependents${isCycleInvolved ? " with cycle involvement" : ""}.`
          )
        ],
        sourceCapability: "change-simulator",
        architecturalConsequence: DEBT_METADATA["excessive-change-amplification"].consequence,
        remediationDirection: DEBT_METADATA["excessive-change-amplification"].remediationDirection
      });
    }
  }

  // 4. SECURITY BOUNDARY RISK SIGNAL
  const securityInfo = context.securityInfo || analyzeSecurityBoundaries(symbol, graph);
  const sharingModel = securityInfo?.metadata?.sharingModel || p.sharing || "unspecified";
  const entryPointInfo = context.entryPointInfo || detectEntryPoint(symbol, graph, metric);
  const isEntryPoint = entryPointInfo?.isEntryPoint;
  const fanIn = metric?.fanIn ?? 0;
  const fanOut = metric?.fanOut ?? 0;
  const coupling = fanIn + fanOut;
  const hasDbOps = (p.soql && p.soql.length > 0) || (p.dml && p.dml.length > 0);

  if (sharingModel === "without sharing") {
    if (isEntryPoint || coupling >= 10 || hasDbOps) {
      const isCritical = isEntryPoint && (hasDbOps || coupling >= 10);
      rawDebtItems.push({
        debtCategory: "security-boundary-risk",
        affectedComponents: [symbolName],
        severity: isCritical ? "critical" : "high",
        confidence: "high",
        evidence: [
          createEvidence(
            "without-sharing-entry-data-risk",
            `Component '${symbolName}' runs in 'without sharing' mode while ${isEntryPoint ? "acting as entry point" : "handling database operations/coupling"}.`
          )
        ],
        sourceCapability: "security-boundaries",
        architecturalConsequence: DEBT_METADATA["security-boundary-risk"].consequence,
        remediationDirection: DEBT_METADATA["security-boundary-risk"].remediationDirection
      });
    } else {
      rawDebtItems.push({
        debtCategory: "security-boundary-risk",
        affectedComponents: [symbolName],
        severity: "medium",
        confidence: "medium",
        evidence: [
          createEvidence(
            "without-sharing-declaration",
            `Component '${symbolName}' explicitly declares 'without sharing' mode.`
          )
        ],
        sourceCapability: "security-boundaries",
        architecturalConsequence: DEBT_METADATA["security-boundary-risk"].consequence,
        remediationDirection: DEBT_METADATA["security-boundary-risk"].remediationDirection
      });
    }
  }

  // 5. INSUFFICIENT TEST PROTECTION SIGNAL (Non-critical component test gaps)
  const testGapInfo = context.testGapInfo || null;
  if (testGapInfo && testGapInfo.hasTestGap) {
    const alreadyCapturedBySmell = rawDebtItems.some(d => d.debtCategory === "insufficient-test-protection");
    if (!alreadyCapturedBySmell) {
      const isFailure = testGapInfo.status === "KNOWN_COVERAGE_FAILURE" || testGapInfo.signal === "known-coverage-failure";
      rawDebtItems.push({
        debtCategory: "insufficient-test-protection",
        affectedComponents: [symbolName],
        severity: isFailure ? "high" : "medium",
        confidence: "high",
        evidence: [
          createEvidence(
            "test-protection-gap",
            `Component '${symbolName}' has test gap status '${testGapInfo.status || testGapInfo.signal}': ${testGapInfo.reason || "no direct test coverage"}.`
          )
        ],
        sourceCapability: "test-gap-analysis",
        architecturalConsequence: DEBT_METADATA["insufficient-test-protection"].consequence,
        remediationDirection: DEBT_METADATA["insufficient-test-protection"].remediationDirection
      });
    }
  }

  // 6. ARCHITECTURAL AMBIGUITY SIGNAL
  if (testGapInfo && testGapInfo.status === "AMBIGUOUS_TEST") {
    rawDebtItems.push({
      debtCategory: "architectural-ambiguity",
      affectedComponents: [symbolName],
      severity: "medium",
      confidence: "medium",
      evidence: [
        createEvidence(
          "ambiguous-test-mapping",
          `Component '${symbolName}' has ambiguous test mappings: ${testGapInfo.reason || "multiple test matches"}.`
        )
      ],
      sourceCapability: "test-gap-analysis",
      architecturalConsequence: DEBT_METADATA["architectural-ambiguity"].consequence,
      remediationDirection: DEBT_METADATA["architectural-ambiguity"].remediationDirection
    });
  }

  if (p.dependencies) {
    const unresolvedDeps = p.dependencies.filter(d => d.confidence === "low" || d.type === "unknown");
    if (unresolvedDeps.length > 0) {
      rawDebtItems.push({
        debtCategory: "architectural-ambiguity",
        affectedComponents: [symbolName],
        severity: "medium",
        confidence: "medium",
        evidence: [
          createEvidence(
            "unresolved-static-references",
            `Component '${symbolName}' contains ${unresolvedDeps.length} low-confidence or unresolved static reference(s).`
          )
        ],
        sourceCapability: "dependency-analyzer",
        architecturalConsequence: DEBT_METADATA["architectural-ambiguity"].consequence,
        remediationDirection: DEBT_METADATA["architectural-ambiguity"].remediationDirection
      });
    }
  }

  // Merge duplicate categories for this component
  const debtItems = mergeDebtItems(rawDebtItems);

  const hasDebt = debtItems.length > 0;
  const primaryValue = hasDebt ? "has-debt" : "clean";

  // Select highest overall confidence and evidence
  const resultEvidence = hasDebt
    ? debtItems.flatMap(d => d.evidence)
    : [createEvidence("no-debt", `No architecture debt detected for component '${symbolName}'.`)];

  const result = createDeterministicResult({
    value: primaryValue,
    primary: primaryValue,
    confidence: "high",
    evidence: resultEvidence,
    secondary: debtItems.map(d => d.debtCategory),
    metadata: {
      hasDebt,
      debtCount: debtItems.length,
      debtItems
    }
  });

  result.hasDebt = hasDebt;
  result.debtItems = debtItems;

  return result;
}

/**
 * Analyzes architecture debt across all components in a symbol registry and produces repository summary metrics.
 */
function detectAllArchitectureDebt(registry, graph = null, metricList = [], cycles = [], extraContext = {}) {
  const metricById = new Map((metricList || []).map(m => [m.id, m]));
  const symbols = Array.isArray(registry?.symbols) ? registry.symbols : [];
  const symbolMap = new Map(symbols.map(s => [s.id, s]));

  const componentDebt = new Map();
  const allDebtItems = [];

  const summary = {
    totalComponents: symbols.length,
    componentsWithDebtCount: 0,
    cleanComponentsCount: 0,
    totalDebtItemsCount: 0,
    categoryCounts: {
      "excessive-coupling": 0,
      "excessive-dependency-breadth": 0,
      "architectural-bottleneck": 0,
      "boundary-violation": 0,
      "layering-violation": 0,
      "insufficient-test-protection": 0,
      "excessive-change-amplification": 0,
      "duplicated-responsibility": 0,
      "risky-external-coupling": 0,
      "security-boundary-risk": 0,
      "architectural-ambiguity": 0
    },
    severityCounts: {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0
    }
  };

  const context = {
    ...extraContext,
    cycles,
    symbolMap,
    registry
  };

  for (const symbol of symbols) {
    const metric = metricById.get(symbol.id) || null;
    const debtResult = detectComponentArchitectureDebt(symbol, graph, metric, context);

    componentDebt.set(symbol.id, debtResult);

    if (debtResult.hasDebt) {
      summary.componentsWithDebtCount++;
      summary.totalDebtItemsCount += debtResult.debtItems.length;

      for (const debtItem of debtResult.debtItems) {
        allDebtItems.push(debtItem);

        if (summary.categoryCounts[debtItem.debtCategory] !== undefined) {
          summary.categoryCounts[debtItem.debtCategory]++;
        }

        if (summary.severityCounts[debtItem.severity] !== undefined) {
          summary.severityCounts[debtItem.severity]++;
        }
      }
    } else {
      summary.cleanComponentsCount++;
    }
  }

  return {
    componentDebt,
    allDebtItems,
    summary
  };
}

module.exports = {
  DEBT_CATEGORIES,
  DEBT_SEVERITIES,
  DEBT_METADATA,
  mergeDebtItems,
  detectComponentArchitectureDebt,
  detectAllArchitectureDebt
};
