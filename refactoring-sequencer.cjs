/**
 * Deterministic Refactoring Sequencer (WAVE-C2)
 *
 * Provides deterministic planning intelligence for refactoring order.
 * Given existing architecture intelligence, computes a defensible, explainable,
 * cycle-safe sequencing for candidate components or architectural problems.
 *
 * Strict boundary rules:
 *   - 100% deterministic rules, graph relationships, and metadata logic.
 *   - 0 LLM calls or AI runtime dependencies.
 *   - Reuses existing analyzer infrastructure (graph, path analyzer, change simulator,
 *     architecture smells, bottlenecks, business criticality, test gap analysis).
 *   - Preserves deterministic facts as authoritative over semantic observations.
 */

"use strict";

const {
  createEvidence,
  createDeterministicResult,
  enforceDeterministicAuthority
} = require("./deterministic/contract.cjs");

const { buildAdjacencyMaps } = require("./path-analyzer.cjs");
const { detectComponentBottleneck } = require("./bottleneck-detector.cjs");
const { detectComponentSmells } = require("./architecture-smells.cjs");
const { simulateChange } = require("./change-simulator.cjs");
const { classifyComponentBusinessCriticality } = require("./business-criticality.cjs");

/**
 * Resolves a candidate parameter into a symbol ID and target object.
 */
function resolveCandidateSymbol(candidate, graph = null, registry = null) {
  if (!candidate) return { candidateId: null, candidateName: null, symbol: null };

  let raw = "";
  let extraProblemInfo = null;

  if (typeof candidate === "string") {
    raw = candidate.trim();
  } else if (typeof candidate === "object") {
    raw = String(candidate.id || candidate.name || candidate.component || candidate.componentId || "").trim();
    extraProblemInfo = candidate;
  }

  if (!raw) return { candidateId: null, candidateName: null, symbol: null, extraProblemInfo };

  let symbol = null;
  if (registry && Array.isArray(registry.symbols)) {
    symbol = registry.symbols.find(
      s => s.id === raw || s.name === raw || s.id.toLowerCase() === raw.toLowerCase() || s.name.toLowerCase() === raw.toLowerCase()
    ) || null;
  }

  let candidateId = symbol ? symbol.id : raw;
  let candidateName = symbol ? symbol.name : (raw.includes(":") ? raw.split(":")[1] : raw);

  return { candidateId, candidateName, symbol, extraProblemInfo };
}

/**
 * Classifies the safety envelope of a candidate component based on deterministic metrics:
 *   - SAFE: High test coverage / covered status, small blast radius, no severe smells.
 *   - CAUTION: Moderate test coverage / likely covered, medium blast radius, or non-critical smells.
 *   - HIGH_CAUTION: Known coverage failure, no test evidence on critical component, cycle participation, large blast radius, or severe smells.
 *   - UNKNOWN: Insufficient evidence or missing component.
 */
function classifySafetyEnvelope(symbol, graph, registry, changeSim = null, smellInfo = null) {
  if (!symbol) {
    return {
      level: "UNKNOWN",
      confidence: "unknown",
      reasons: [createEvidence("missing-symbol", "Candidate component symbol not found in repository.")]
    };
  }

  const reasons = [];

  // 1. Analyze Test Gap
  let testGapStatus = "unknown";
  const p = symbol.parsed || {};
  if (p.isTest || (symbol.type === "ApexClass" && /Test$/i.test(symbol.name))) {
    testGapStatus = "TEST_COMPONENT";
  } else if (p.coverage) {
    testGapStatus = p.coverage.percentCovered < 75 ? "KNOWN_COVERAGE_FAILURE" : "COVERED";
  }

  // Check graph edges for test references
  let hasTestReference = false;
  if (graph && Array.isArray(graph.edges)) {
    hasTestReference = graph.edges.some(
      e => (e.to === symbol.id && e.type === "test-reference") ||
           (e.from === symbol.id && e.type === "test-reference")
    );
  }

  // 2. Blast Radius Level
  const blastLevel = changeSim?.metadata?.blastRadiusLevel || "SMALL";

  // 3. Cycle Participation
  const isCycle = changeSim?.metadata?.cycleInvolved === true || (smellInfo?.smells || []).some(s => s.smell === "circular-dependency");

  // 4. Smell Severity
  const smells = smellInfo?.smells || [];
  const hasGodComponent = smells.some(s => s.smell === "god-component");
  const hasLayerViolation = smells.some(s => s.smell === "layer-violation");
  const hasUncoveredCriticalPath = smells.some(s => s.smell === "uncovered-critical-path");

  // Determine Level
  let level = "SAFE";
  let confidence = "high";

  if (hasUncoveredCriticalPath || testGapStatus === "KNOWN_COVERAGE_FAILURE" || isCycle || blastLevel === "LARGE" || hasGodComponent) {
    level = "HIGH_CAUTION";
    if (hasUncoveredCriticalPath) reasons.push(createEvidence("uncovered-critical-path", `Structurally critical component '${symbol.name}' lacks adequate test coverage.`));
    if (testGapStatus === "KNOWN_COVERAGE_FAILURE") reasons.push(createEvidence("test-coverage-failure", `Component '${symbol.name}' has known runtime test coverage failure.`));
    if (isCycle) reasons.push(createEvidence("cycle-participant", `Component '${symbol.name}' participates in a circular dependency loop.`));
    if (blastLevel === "LARGE") reasons.push(createEvidence("large-blast-radius", `Modifying '${symbol.name}' impacts a large downstream blast radius.`));
    if (hasGodComponent) reasons.push(createEvidence("god-component-smell", `Component '${symbol.name}' exhibits god-component architectural smell.`));
  } else if (blastLevel === "MEDIUM" || smells.length > 0 || hasLayerViolation || (!hasTestReference && testGapStatus !== "COVERED")) {
    level = "CAUTION";
    if (blastLevel === "MEDIUM") reasons.push(createEvidence("medium-blast-radius", `Modifying '${symbol.name}' impacts a medium downstream blast radius.`));
    if (smells.length > 0) reasons.push(createEvidence("architecture-smells-present", `Component '${symbol.name}' has ${smells.length} architectural smell(s).`));
    if (!hasTestReference && testGapStatus !== "COVERED") reasons.push(createEvidence("unverified-test-coverage", `No direct test reference edge verified in graph for '${symbol.name}'.`));
  } else {
    level = "SAFE";
    reasons.push(createEvidence("safe-refactoring-envelope", `Component '${symbol.name}' has verified test coverage and contained blast radius.`));
  }

  return { level, confidence, reasons };
}

/**
 * Builds prerequisite relationships among candidate components based on deterministic graph structure:
 *   - If Y depends on X (Y -> X in dependency graph), X is a prerequisite for Y (X must be stabilized/refactored before Y).
 *   - If X is a test/safety prerequisite or shared bottleneck for Y, X must precede Y.
 */
function buildPrerequisiteGraph(candidateList, graph) {
  const candidateIds = new Set(candidateList.map(c => c.candidateId).filter(Boolean));
  const prerequisiteMap = new Map(); // candidateId -> Set of prerequisite candidateIds
  const dependentMap = new Map();    // candidateId -> Set of dependent candidateIds

  for (const id of candidateIds) {
    prerequisiteMap.set(id, new Set());
    dependentMap.set(id, new Set());
  }

  if (!graph || !Array.isArray(graph.edges)) {
    return { prerequisiteMap, dependentMap, cyclesInCandidates: [] };
  }

  const { outgoing } = buildAdjacencyMaps(graph);

  // For each candidate A, check transitive downstream dependencies to see if another candidate B is reached
  for (const candidateA of candidateIds) {
    const queue = [candidateA];
    const visited = new Set([candidateA]);

    while (queue.length > 0) {
      const current = queue.shift();
      const edges = outgoing.get(current) || [];

      for (const edge of edges) {
        const downstreamId = edge.to;
        if (candidateIds.has(downstreamId) && downstreamId !== candidateA) {
          // downstreamId (B) is a dependency of candidateA (A)
          // Therefore, candidate B is a prerequisite for candidate A!
          prerequisiteMap.get(candidateA).add(downstreamId);
          dependentMap.get(downstreamId).add(candidateA);
        }

        if (!visited.has(downstreamId)) {
          visited.add(downstreamId);
          queue.push(downstreamId);
        }
      }
    }
  }

  // Detect cycles among candidates
  const cyclesInCandidates = [];
  const visitedGlobal = new Set();

  for (const id of candidateIds) {
    if (!visitedGlobal.has(id)) {
      const stack = [];
      const inStack = new Set();

      function dfs(curr) {
        visitedGlobal.add(curr);
        stack.push(curr);
        inStack.add(curr);

        const prereqs = prerequisiteMap.get(curr) || new Set();
        for (const prereq of prereqs) {
          if (inStack.has(prereq)) {
            const cycleStartIdx = stack.indexOf(prereq);
            const cycle = stack.slice(cycleStartIdx);
            cyclesInCandidates.push(cycle);
          } else if (!visitedGlobal.has(prereq)) {
            dfs(prereq);
          }
        }

        stack.pop();
        inStack.delete(curr);
      }

      dfs(id);
    }
  }

  return { prerequisiteMap, dependentMap, cyclesInCandidates };
}

/**
 * Computes deterministic rank and priority score for candidates adhering to sequencing principles.
 */
function rankCandidates(resolvedCandidates, prerequisiteMap, dependentMap, cyclesInCandidates, options = {}) {
  // Score components based on sequencing principles:
  // 1. Prerequisite blockers / Out-degree (how many candidates depend on this candidate being done first)
  // 2. Foundational / Shared Bottleneck status
  // 3. Downstream impact / Fan-In
  // 4. Safety classification (SAFE changes or safety prerequisites)
  // 5. Deterministic ID tie-breaking

  const candidatesWithScores = resolvedCandidates.map(c => {
    const id = c.candidateId;
    const prereqs = Array.from(prerequisiteMap.get(id) || []);
    const dependents = Array.from(dependentMap.get(id) || []);

    let score = 0;

    // Out-degree in prerequisite graph (number of dependent candidates waiting on this)
    score += dependents.length * 100;

    // Foundational / Bottleneck signal
    if (c.bottleneckInfo?.isBottleneck) {
      score += 50;
    }

    // High Fan-In signal (foundational component)
    const fanIn = c.changeSimulation?.metadata?.directDependents?.length || 0;
    score += Math.min(fanIn, 20) * 2;

    // In-degree penalty in prerequisite graph (this component has unresolved prerequisites among candidates)
    score -= prereqs.length * 150;

    // Safety Envelope weighting:
    // Safety prerequisites or SAFE components that unblock work are prioritized
    if (c.safetyEnvelope?.level === "SAFE") score += 10;
    if (c.safetyEnvelope?.level === "HIGH_CAUTION") score -= 20;

    // Preserving business criticality as a separate signal without distorting structural topological order
    const busCrit = c.businessCriticalityInfo?.businessCriticality;
    let priorityLabel = "MEDIUM";
    if (dependents.length > 0 || c.bottleneckInfo?.isBottleneck || busCrit === "high") {
      priorityLabel = "HIGH";
    } else if (prereqs.length > 0 && dependents.length === 0) {
      priorityLabel = "LOW";
    }

    return {
      ...c,
      prereqs,
      dependents,
      score,
      priorityLabel
    };
  });

  // Kahn's Topological Sort with Deterministic Priority Tie-Breaking
  const inDegreeMap = new Map();
  for (const c of candidatesWithScores) {
    inDegreeMap.set(c.candidateId, c.prereqs.length);
  }

  const sortedSequence = [];
  const remaining = new Set(candidatesWithScores.map(c => c.candidateId));

  while (remaining.size > 0) {
    // Find all candidates with in-degree == 0 (no remaining prerequisites among candidates)
    const readyCandidates = candidatesWithScores.filter(
      c => remaining.has(c.candidateId) && (inDegreeMap.get(c.candidateId) === 0)
    );

    if (readyCandidates.length > 0) {
      // Sort ready candidates deterministically by score descending, then candidateId ascending
      readyCandidates.sort((a, b) => b.score - a.score || a.candidateId.localeCompare(b.candidateId));
      const chosen = readyCandidates[0];

      sortedSequence.push(chosen);
      remaining.delete(chosen.candidateId);

      // Decrement in-degree for candidates that depended on chosen
      for (const dependentId of chosen.dependents) {
        if (inDegreeMap.has(dependentId)) {
          inDegreeMap.set(dependentId, Math.max(0, inDegreeMap.get(dependentId) - 1));
        }
      }
    } else {
      // Cycle or mutual dependency among remaining candidates. Break cycle deterministically.
      const remainingCandidates = candidatesWithScores.filter(c => remaining.has(c.candidateId));
      remainingCandidates.sort((a, b) => b.score - a.score || a.candidateId.localeCompare(b.candidateId));

      const chosen = remainingCandidates[0];
      chosen.isCycleBreak = true;

      sortedSequence.push(chosen);
      remaining.delete(chosen.candidateId);

      for (const dependentId of chosen.dependents) {
        if (inDegreeMap.has(dependentId)) {
          inDegreeMap.set(dependentId, Math.max(0, inDegreeMap.get(dependentId) - 1));
        }
      }
    }
  }

  return sortedSequence;
}

/**
 * Determines deterministic refactoring sequencing intelligence for a list of candidate components or architectural problems.
 *
 * @param {Array<string|Object>} candidates - Candidate components or problems.
 * @param {Object} graph - Dependency graph { nodes, edges }.
 * @param {Object} registry - Symbol registry { symbols, byName }.
 * @param {Object} [options] - Sequencing configuration options.
 * @returns {Object} Deterministic intelligence result conforming to BASE-ARCH-1 contract.
 */
function determineRefactoringSequence(candidates, graph = null, registry = null, options = {}) {
  const rawCandidates = Array.isArray(candidates) ? candidates : (candidates ? [candidates] : []);

  if (rawCandidates.length === 0) {
    const res = createDeterministicResult({
      value: "empty-sequence",
      primary: "empty-sequence",
      confidence: "high",
      evidence: [createEvidence("no-candidates", "No candidate components or architectural problems provided for refactoring sequencing.")],
      metadata: {
        sequence: [],
        totalCandidates: 0,
        cyclesDetected: false,
        summary: { totalCandidates: 0, safeCount: 0, cautionCount: 0, highCautionCount: 0, unknownCount: 0 }
      }
    });
    res.sequence = [];
    return res;
  }

  // 1. Resolve candidates and run deterministic capability analyses
  const resolvedCandidates = rawCandidates.map((c, index) => {
    const { candidateId, candidateName, symbol, extraProblemInfo } = resolveCandidateSymbol(c, graph, registry);

    if (!candidateId || !symbol) {
      return {
        candidateInput: c,
        candidateId: candidateId || `unknown-${index + 1}`,
        candidateName: candidateName || `unknown-${index + 1}`,
        symbol: null,
        extraProblemInfo,
        isUnknown: true,
        confidence: "unknown",
        safetyEnvelope: {
          level: "UNKNOWN",
          confidence: "unknown",
          reasons: [createEvidence("unresolved-candidate", `Candidate '${candidateName || index + 1}' could not be resolved from repository symbols.`)]
        },
        bottleneckInfo: { isBottleneck: false },
        smellInfo: { smells: [] },
        changeSimulation: null,
        businessCriticalityInfo: { businessCriticality: "unknown", structuralCriticality: { level: "unknown", signals: [] } }
      };
    }

    // Run Wave A & Wave B capability modules deterministically
    const metric = graph?.nodes ? graph.nodes.find(n => n.id === candidateId) || null : null;
    const bottleneckInfo = detectComponentBottleneck(symbol, graph, metric);
    const smellInfo = detectComponentSmells(symbol, graph, metric);
    const changeSim = simulateChange(symbol, "modify_component", graph, registry, options);
    const businessCriticalityInfo = classifyComponentBusinessCriticality(symbol, graph, metric);
    const safetyEnvelope = classifySafetyEnvelope(symbol, graph, registry, changeSim, smellInfo);

    return {
      candidateInput: c,
      candidateId,
      candidateName,
      symbol,
      extraProblemInfo,
      isUnknown: false,
      confidence: "high",
      safetyEnvelope,
      bottleneckInfo,
      smellInfo,
      changeSimulation: changeSim,
      businessCriticalityInfo
    };
  });

  // 2. Build prerequisite relationships and cycle detection
  const { prerequisiteMap, dependentMap, cyclesInCandidates } = buildPrerequisiteGraph(resolvedCandidates, graph);

  // 3. Rank candidates deterministically
  const rankedCandidates = rankCandidates(resolvedCandidates, prerequisiteMap, dependentMap, cyclesInCandidates, options);

  // 4. Construct detailed sequence recommendations conforming to contract
  const sequence = rankedCandidates.map((c, idx) => {
    const position = idx + 1;
    const prereqs = c.prereqs || [];
    const dependents = c.dependents || [];

    // Construct blockers
    const blockers = [];
    for (const prereqId of prereqs) {
      const prereqCandidate = resolvedCandidates.find(rc => rc.candidateId === prereqId);
      if (prereqCandidate) {
        if (prereqCandidate.safetyEnvelope?.level === "HIGH_CAUTION") {
          blockers.push({
            blockerId: prereqId,
            blockerName: prereqCandidate.candidateName,
            reason: "safety-blocker",
            detail: `Prerequisite component '${prereqCandidate.candidateName}' has safety envelope 'HIGH_CAUTION' and must be stabilized first.`
          });
        } else {
          blockers.push({
            blockerId: prereqId,
            blockerName: prereqCandidate.candidateName,
            reason: "prerequisite-dependency",
            detail: `Component '${c.candidateName}' depends on prerequisite '${prereqCandidate.candidateName}'.`
          });
        }
      }
    }

    // Construct deterministic evidence list
    const itemEvidence = [];

    if (c.isUnknown) {
      itemEvidence.push(createEvidence("unresolved-input", `Candidate '${c.candidateName}' is unknown or not present in symbol registry.`));
    } else {
      itemEvidence.push(createEvidence("topological-position", `Candidate '${c.candidateName}' assigned sequence position ${position} based on ${prereqs.length} prerequisite(s) and ${dependents.length} dependent candidate(s).`));

      if (prereqs.length > 0) {
        itemEvidence.push(createEvidence("prerequisite-relationships", `Requires prior stabilization/refactoring of: ${prereqs.join(", ")}.`));
      }

      if (dependents.length > 0) {
        itemEvidence.push(createEvidence("unblocks-dependents", `Refactoring unblocks ${dependents.length} downstream candidate(s): ${dependents.join(", ")}.`));
      }

      if (c.bottleneckInfo?.isBottleneck) {
        itemEvidence.push(createEvidence("foundational-bottleneck", `Component '${c.candidateName}' is a high-coupling architectural bottleneck.`));
      }

      if (c.safetyEnvelope?.reasons) {
        itemEvidence.push(...c.safetyEnvelope.reasons);
      }

      // Add business criticality evidence separately without overriding structural order
      if (c.businessCriticalityInfo?.businessCriticality !== "unknown") {
        itemEvidence.push(createEvidence("explicit-business-criticality", `Explicit business criticality declared as '${c.businessCriticalityInfo.businessCriticality}'.`));
      } else {
        itemEvidence.push(createEvidence("business-criticality-unknown", "No explicit business metadata present; business criticality remains 'unknown'."));
      }
    }

    // Construct rationale
    let rationale = "";
    if (c.isUnknown) {
      rationale = `Candidate '${c.candidateName}' could not be resolved from repository facts.`;
    } else if (prereqs.length > 0) {
      rationale = `Component '${c.candidateName}' requires ${prereqs.length} prerequisite candidate(s) to be refactored or stabilized first (${prereqs.join(", ")}).`;
    } else if (dependents.length > 0) {
      rationale = `Component '${c.candidateName}' is foundational or a prerequisite for ${dependents.length} other candidate(s); refactoring it first reduces downstream risk.`;
    } else {
      rationale = `Component '${c.candidateName}' is independent with contained blast radius (${c.safetyEnvelope?.level || "SAFE"}).`;
    }

    const deterministicReason = `Topological rank ${position}: ${rationale}`;

    return {
      component: c.candidateName,
      componentId: c.candidateId,
      sequencePosition: position,
      priority: c.priorityLabel || "MEDIUM",
      prerequisites: prereqs,
      blockers,
      safetyClassification: c.safetyEnvelope?.level || "UNKNOWN",
      rationale,
      deterministicReason,
      confidence: c.confidence || "high",
      evidence: itemEvidence,
      businessCriticality: c.businessCriticalityInfo?.businessCriticality || "unknown",
      structuralCriticality: c.businessCriticalityInfo?.structuralCriticality || { level: "unknown", signals: [] }
    };
  });

  // Calculate summary metrics
  const summary = {
    totalCandidates: sequence.length,
    safeCount: sequence.filter(s => s.safetyClassification === "SAFE").length,
    cautionCount: sequence.filter(s => s.safetyClassification === "CAUTION").length,
    highCautionCount: sequence.filter(s => s.safetyClassification === "HIGH_CAUTION").length,
    unknownCount: sequence.filter(s => s.safetyClassification === "UNKNOWN").length
  };

  const aggregateEvidence = [
    createEvidence("refactoring-sequencing-complete", `Computed deterministic refactoring order across ${sequence.length} candidate(s).`),
    ...sequence.flatMap(s => s.evidence.slice(0, 2))
  ];

  const result = createDeterministicResult({
    value: "sequence-complete",
    primary: "sequence-complete",
    confidence: sequence.some(s => s.confidence === "unknown") ? "medium" : "high",
    evidence: aggregateEvidence,
    secondary: sequence.map(s => s.component),
    metadata: {
      sequence,
      prerequisiteGraph: { prerequisiteMap: Object.fromEntries(prerequisiteMap), dependentMap: Object.fromEntries(dependentMap) },
      cyclesDetected: cyclesInCandidates.length > 0,
      summary
    }
  });

  result.sequence = sequence;
  return result;
}

module.exports = {
  determineRefactoringSequence,
  buildPrerequisiteGraph,
  classifySafetyEnvelope,
  rankCandidates,
  resolveCandidateSymbol
};
