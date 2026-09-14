/**
 * Centralized Deterministic Business Criticality Classifier
 *
 * Distinguishes between explicit business criticality (proven by explicit business
 * metadata, annotations, or explicit metadata tags) and structural criticality proxies
 * (entry-point exposure, fan-in/dependents, architectural centrality, external integration,
 * data/object breadth, security boundaries, test coverage).
 *
 * CRITICAL RULE:
 * Structural importance does NOT equal business importance.
 * If no reliable explicit business evidence exists, `businessCriticality` MUST return 'unknown'.
 */

"use strict";

const {
  createEvidence,
  createDeterministicResult
} = require("./deterministic/contract.cjs");

function unique(values) {
  return [...new Set(values)];
}

/**
 * Classifies component business criticality and structural criticality proxies.
 *
 * Output shape:
 * {
 *   value: "unknown" | "high" | "medium" | "low",
 *   confidence: "unknown" | "high" | "medium" | "low",
 *   businessCriticality: "unknown" | "high" | "medium" | "low",
 *   structuralCriticality: {
 *     level: "high" | "medium" | "low" | "unknown",
 *     signals: [ ... ]
 *   },
 *   explicitBusinessEvidence: [ ... ],
 *   evidence: [ ... ]
 * }
 */
function classifyComponentBusinessCriticality(
  symbol,
  graph = null,
  metric = null,
  roleInfo = null,
  layerInfo = null,
  entryPointInfo = null,
  externalBoundaryInfo = null
) {
  if (!symbol) {
    const result = createDeterministicResult({
      value: "unknown",
      primary: "unknown",
      confidence: "unknown",
      evidence: [createEvidence("no-symbol", "Component symbol is missing or null.")],
      secondary: []
    });
    result.businessCriticality = "unknown";
    result.structuralCriticality = { level: "unknown", signals: [] };
    result.explicitBusinessEvidence = [];
    return result;
  }

  const p = symbol.parsed || {};
  const name = String(symbol.name || p.name || "").trim();
  const type = String(symbol.type || p.type || "ApexClass").trim();

  // 1. EXPLICIT BUSINESS CRITICALITY EVIDENCE DISCOVERY
  const explicitEvidenceList = [];
  let explicitBusinessLevel = "unknown";

  // Check explicit business metadata / attributes attached to symbol
  const businessMetadata = symbol.businessMetadata || p.businessMetadata || symbol.metadata?.business || null;
  if (businessMetadata) {
    const criticality = String(businessMetadata.criticality || businessMetadata.level || businessMetadata.value || "").toLowerCase().trim();
    if (criticality === "critical" || criticality === "high") {
      explicitBusinessLevel = "high";
      explicitEvidenceList.push(
        createEvidence("explicit-business-metadata", `Explicit business metadata declares criticality '${criticality}'.`, { source: "businessMetadata" })
      );
    } else if (criticality === "medium") {
      explicitBusinessLevel = "medium";
      explicitEvidenceList.push(
        createEvidence("explicit-business-metadata", "Explicit business metadata declares criticality 'medium'.", { source: "businessMetadata" })
      );
    } else if (criticality === "low") {
      explicitBusinessLevel = "low";
      explicitEvidenceList.push(
        createEvidence("explicit-business-metadata", "Explicit business metadata declares criticality 'low'.", { source: "businessMetadata" })
      );
    }
  }

  // Check explicit annotations (e.g. @BusinessCritical, @BusinessCriticality("high"))
  const annotations = Array.isArray(p.annotations) ? p.annotations : [];
  for (const ann of annotations) {
    const annStr = String(ann).toLowerCase().trim();
    if (annStr.includes("businesscritical") || annStr.includes("criticalityhigh") || annStr.includes("criticality_high")) {
      explicitBusinessLevel = "high";
      explicitEvidenceList.push(
        createEvidence("explicit-annotation-critical", `Component AST annotation '${ann}' explicitly designates business criticality.`, { source: "annotation" })
      );
    }
  }

  // Check explicit business comments/javadoc tags or naming flags explicitly designated in symbol metadata
  if (p.isBusinessCritical === true || symbol.isBusinessCritical === true) {
    explicitBusinessLevel = "high";
    explicitEvidenceList.push(
      createEvidence("explicit-flag-critical", "Component flag 'isBusinessCritical' is explicitly true.", { source: "flag" })
    );
  }

  // 2. STRUCTURAL CRITICALITY PROXIES DISCOVERY
  const structuralSignals = [];
  let structuralPoints = 0;

  // Signal: Entry Point Exposure
  const isEntryPoint = Boolean(
    entryPointInfo?.isEntryPoint ||
    type === "Trigger" ||
    type === "LWC" ||
    type === "Visualforce" ||
    annotations.some(a => ["restresource", "httpget", "httppost"].includes(String(a).toLowerCase()))
  );
  if (isEntryPoint) {
    const epType = entryPointInfo?.primary || (type === "Trigger" ? "Trigger" : type === "LWC" ? "LWC" : "Entry Point");
    structuralSignals.push(`entry-point exposure: ${epType}`);
    structuralPoints += 2;
  }

  // Signal: Number of Dependents / High Fan-In
  const fanIn = metric?.fanIn ?? 0;
  if (fanIn >= 8) {
    structuralSignals.push(`high fan-in: ${fanIn} dependents`);
    structuralPoints += 3;
  } else if (fanIn >= 3) {
    structuralSignals.push(`moderate fan-in: ${fanIn} dependents`);
    structuralPoints += 1;
  }

  // Signal: Architectural Centrality / Coupling
  const coupling = metric?.coupling ?? (fanIn + (metric?.fanOut ?? 0));
  if (coupling >= 15) {
    structuralSignals.push(`architectural centrality: coupling score ${coupling}`);
    structuralPoints += 2;
  }

  // Signal: External Integration
  const hasExternalBoundary = Boolean(externalBoundaryInfo?.hasExternalBoundary || (p.callouts && p.callouts.length > 0));
  if (hasExternalBoundary) {
    const extTypes = externalBoundaryInfo?.value || (p.callouts || []).join(", ") || "External Boundary";
    structuralSignals.push(`external integration: ${extTypes}`);
    structuralPoints += 2;
  }

  // Signal: Data / Object Breadth
  const objectsCount = Array.isArray(p.objects) ? p.objects.length : 0;
  if (objectsCount >= 4) {
    structuralSignals.push(`broad data impact: ${objectsCount} Salesforce objects touched`);
    structuralPoints += 2;
  } else if (objectsCount >= 1) {
    structuralSignals.push(`data impact: ${objectsCount} Salesforce object(s) touched`);
    structuralPoints += 1;
  }

  // Signal: Security Boundaries
  const sharing = String(p.sharing || "").toLowerCase();
  if (sharing === "without sharing") {
    structuralSignals.push("security boundary: explicit 'without sharing' mode");
    structuralPoints += 1;
  }

  // Signal: Test Gap / Coverage
  const testGap = p.coverage || null;
  if (testGap && testGap.percentCovered !== undefined && testGap.percentCovered < 75) {
    structuralSignals.push(`test gap: coverage ${testGap.percentCovered}% below target`);
    structuralPoints += 1;
  }

  // Determine structural criticality level
  let structuralLevel = "low";
  if (structuralPoints >= 5) {
    structuralLevel = "high";
  } else if (structuralPoints >= 2) {
    structuralLevel = "medium";
  } else if (structuralPoints === 0) {
    structuralLevel = "unknown";
  }

  // 3. COMBINE AND FORMULATE DETERMINISTIC RESULT
  // Notice: businessCriticality is strictly based on EXPLICIT business evidence.
  const businessCriticalityValue = explicitBusinessLevel; // "unknown" if no explicit business evidence exists

  // Standard contract result value uses businessCriticalityValue or indicates structural proxy distinction
  const combinedValue = businessCriticalityValue !== "unknown" ? businessCriticalityValue : "unknown";
  const confidence = businessCriticalityValue !== "unknown" ? "high" : "unknown";

  const allEvidence = [];
  if (explicitEvidenceList.length > 0) {
    allEvidence.push(...explicitEvidenceList);
  } else {
    allEvidence.push(
      createEvidence("no-explicit-business-evidence", "No explicit business metadata, annotations, or business tags exist for this component. Business criticality remains 'unknown'.")
    );
  }

  // Add structural evidence for explainability
  if (structuralSignals.length > 0) {
    allEvidence.push(
      createEvidence("structural-criticality-proxy", `Structural criticality evaluated as '${structuralLevel}' based on proxies: ${structuralSignals.join("; ")}.`)
    );
  } else {
    allEvidence.push(
      createEvidence("no-structural-proxy-signals", "No structural proxy signals identified.")
    );
  }

  const result = createDeterministicResult({
    value: combinedValue,
    primary: combinedValue,
    confidence,
    evidence: allEvidence,
    secondary: structuralLevel !== "unknown" ? [`structural:${structuralLevel}`] : [],
    metadata: {
      businessCriticality: businessCriticalityValue,
      structuralCriticality: {
        level: structuralLevel,
        signals: structuralSignals
      },
      explicitBusinessEvidence: explicitEvidenceList
    }
  });

  result.businessCriticality = businessCriticalityValue;
  result.structuralCriticality = {
    level: structuralLevel,
    signals: structuralSignals
  };
  result.explicitBusinessEvidence = explicitEvidenceList;

  return result;
}

/**
 * Classifies business criticality across all components in a symbol registry.
 */
function classifyAllBusinessCriticality(registry, graph = null, metricList = []) {
  const metricById = new Map((metricList || []).map(m => [m.id, m]));
  const symbols = Array.isArray(registry?.symbols) ? registry.symbols : [];

  const symbolCriticality = new Map();
  const summary = {
    totalComponents: symbols.length,
    explicitBusinessCriticalityCount: 0,
    unknownBusinessCriticalityCount: 0,
    byBusinessLevel: {
      high: 0,
      medium: 0,
      low: 0,
      unknown: 0
    },
    byStructuralLevel: {
      high: 0,
      medium: 0,
      low: 0,
      unknown: 0
    }
  };

  for (const symbol of symbols) {
    const metric = metricById.get(symbol.id) || null;
    const info = classifyComponentBusinessCriticality(symbol, graph, metric);

    symbolCriticality.set(symbol.id, info);

    const bLevel = info.businessCriticality || "unknown";
    const sLevel = info.structuralCriticality?.level || "unknown";

    if (summary.byBusinessLevel[bLevel] !== undefined) {
      summary.byBusinessLevel[bLevel]++;
    } else {
      summary.byBusinessLevel.unknown++;
    }

    if (summary.byStructuralLevel[sLevel] !== undefined) {
      summary.byStructuralLevel[sLevel]++;
    } else {
      summary.byStructuralLevel.unknown++;
    }

    if (bLevel !== "unknown") {
      summary.explicitBusinessCriticalityCount++;
    } else {
      summary.unknownBusinessCriticalityCount++;
    }
  }

  return {
    symbolCriticality,
    summary
  };
}

module.exports = {
  classifyComponentBusinessCriticality,
  classifyAllBusinessCriticality
};
