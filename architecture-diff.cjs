/**
 * Deterministic Architecture Baseline & Snapshot Diff Engine (WAVE-D1)
 * ====================================================================
 *
 * Purpose:
 *   Compares two canonical Architecture Snapshots (or ExplorerData snapshots)
 *   and produces deterministic, sorted, and stable structural diff results.
 *
 * Requirements:
 *   - 0 LLM calls or external dependencies.
 *   - Stable identity for nodes (type + name), edges (source + target + relationshipType + method),
 *     cycles (canonical sorted node sets), and unresolved references.
 *   - Ignores execution metadata/timestamps when comparing node changes.
 *   - Reordered input arrays produce identical diff outputs.
 *   - Clear error throwing on schema / version incompatibility.
 */

"use strict";

const DIFF_SCHEMA_VERSION = 1;

const CHANGE_TYPES = Object.freeze({
  ADDED: "ADDED",
  REMOVED: "REMOVED",
  MODIFIED: "MODIFIED",
  UNCHANGED: "UNCHANGED",
});

/**
 * Validates snapshot presence and schema version compatibility.
 */
function validateSnapshotCompatibility(before, after) {
  if (!before || typeof before !== "object") {
    throw new Error(
      "Invalid snapshot: 'before' snapshot must be a non-null object.",
    );
  }
  if (!after || typeof after !== "object") {
    throw new Error(
      "Invalid snapshot: 'after' snapshot must be a non-null object.",
    );
  }

  if (before.schemaVersion === undefined || before.schemaVersion === null) {
    throw new Error(
      "Invalid snapshot: 'before' snapshot is missing required 'schemaVersion'.",
    );
  }
  if (after.schemaVersion === undefined || after.schemaVersion === null) {
    throw new Error(
      "Invalid snapshot: 'after' snapshot is missing required 'schemaVersion'.",
    );
  }

  if (before.schemaVersion !== after.schemaVersion) {
    throw new Error(
      `Incompatible snapshot schemaVersion: before schemaVersion (${before.schemaVersion}) does not match after schemaVersion (${after.schemaVersion}).`,
    );
  }
}

/**
 * Normalizes a component/node identifier into standard `Type:Name` format.
 */
function normalizeNodeId(rawId, type = "", name = "") {
  if (rawId && String(rawId).includes(":")) return String(rawId).trim();
  const nodeType = String(type || "ApexClass").trim();
  const nodeName = String(name || rawId || "")
    .replace(/^[^:]+:/, "")
    .trim();
  return `${nodeType}:${nodeName}`;
}

/**
 * Resolves node identity: `Type:Name`.
 */
function getNodeIdentity(node) {
  if (!node) return "";
  if (typeof node === "string") return node.trim();
  const type = String(node.type || "ApexClass").trim();
  const name = String(node.name || node.displayName || node.id || "")
    .replace(/^[^:]+:/, "")
    .trim();
  return `${type}:${name}`;
}

/**
 * Resolves edge identity: `Source|Target|Type|Method`.
 */
function getEdgeIdentity(edge) {
  if (!edge) return "";
  if (typeof edge === "string") return edge.trim();
  const source = normalizeNodeId(edge.from || edge.source || "");
  const target = normalizeNodeId(edge.to || edge.target || "");
  const relType = String(
    edge.type || edge.relationshipType || "unknown",
  ).trim();
  const method = edge.method ? String(edge.method).trim() : "";
  return `${source}|${target}|${relType}|${method}`;
}

/**
 * Resolves canonical cycle node array and identity key.
 */
function getCanonicalCycle(cycle) {
  let rawNodes = [];
  if (Array.isArray(cycle)) {
    rawNodes = cycle;
  } else if (cycle && Array.isArray(cycle.nodes)) {
    rawNodes = cycle.nodes;
  }

  const normalizedNodes = rawNodes
    .map((n) => normalizeNodeId(n))
    .sort((a, b) => a.localeCompare(b));

  const key = normalizedNodes.join("::");
  return {
    key,
    nodes: normalizedNodes,
    size: normalizedNodes.length,
  };
}

/**
 * Resolves unresolved reference identity key.
 */
function getUnresolvedRefIdentity(ref) {
  const source = normalizeNodeId(
    ref.sourceNodeId || ref.source || ref.from || "",
  );
  const targetName = String(ref.targetName || ref.target || ref.to || "")
    .replace(/^[^:]+:/, "")
    .trim();
  const targetType = String(
    ref.targetType ||
      (ref.target && String(ref.target).includes(":")
        ? ref.target.split(":")[0]
        : "External"),
  ).trim();
  const file = String(ref.file || "")
    .replace(/\\/g, "/")
    .trim();
  return `${source}|${targetType}:${targetName}|${file}`;
}

/**
 * Extracts normalized component lists from snapshot.
 */
function getComponents(snapshot) {
  return Array.isArray(snapshot.components)
    ? snapshot.components
    : Array.isArray(snapshot.nodes)
      ? snapshot.nodes
      : [];
}

/**
 * Extracts normalized relationship lists from snapshot.
 */
function getRelationships(snapshot) {
  return Array.isArray(snapshot.relationships)
    ? snapshot.relationships
    : Array.isArray(snapshot.edges)
      ? snapshot.edges
      : [];
}

/**
 * Extracts normalized cycle lists from snapshot.
 */
function getCycles(snapshot) {
  return Array.isArray(snapshot.cycles) ? snapshot.cycles : [];
}

/**
 * Extracts unresolved references list from snapshot or relationships.
 */
function getUnresolvedReferences(snapshot) {
  if (
    Array.isArray(snapshot.unresolvedReferences) &&
    snapshot.unresolvedReferences.length > 0
  ) {
    return snapshot.unresolvedReferences.map((ref) => {
      const source = normalizeNodeId(
        ref.sourceNodeId || ref.source || ref.from || "",
      );
      const targetName = String(ref.targetName || ref.target || ref.to || "")
        .replace(/^[^:]+:/, "")
        .trim();
      const targetType = String(
        ref.targetType ||
          (ref.target && String(ref.target).includes(":")
            ? ref.target.split(":")[0]
            : "External"),
      ).trim();
      const file = String(ref.file || "")
        .replace(/\\/g, "/")
        .trim();
      const item = {
        source,
        targetName,
        targetType,
        file,
        evidence: String(ref.evidence || "").trim(),
        reason: String(ref.reason || "").trim(),
      };
      return {
        id: getUnresolvedRefIdentity(item),
        ...item,
      };
    });
  }

  const rels = getRelationships(snapshot);
  const unresolved = rels.filter((r) => Boolean(r.unresolved));
  return unresolved.map((r) => {
    const source = normalizeNodeId(r.from || r.source || "");
    const rawTarget = String(r.to || r.target || "");
    const targetType = rawTarget.includes(":")
      ? rawTarget.split(":")[0]
      : "External";
    const targetName = rawTarget.includes(":")
      ? rawTarget.split(":")[1]
      : rawTarget;
    const file = String(r.file || "")
      .replace(/\\/g, "/")
      .trim();
    const item = {
      source,
      targetName,
      targetType,
      file,
      evidence: String(r.evidence || "").trim(),
      reason: `Unresolved reference to ${rawTarget}`,
    };
    return {
      id: getUnresolvedRefIdentity(item),
      ...item,
    };
  });
}

/**
 * Helper to extract scalar value for node property comparison.
 */
function extractNodePropertyValue(node, prop) {
  switch (prop) {
    case "risk":
      return String(node.risk || node.metrics?.risk || "LOW").toUpperCase();
    case "coupling":
      return Number(node.metrics?.coupling ?? 0);
    case "fanIn":
      return Number(node.metrics?.fanIn ?? 0);
    case "fanOut":
      return Number(node.metrics?.fanOut ?? 0);
    case "role":
      return String(
        node.role?.primary ||
          node.role?.value ||
          (typeof node.role === "string" ? node.role : "unknown"),
      ).toLowerCase();
    case "layer":
      return String(
        node.layer?.primary ||
          node.layer?.value ||
          (typeof node.layer === "string" ? node.layer : "unknown"),
      ).toLowerCase();
    case "domain":
      return String(
        node.domain?.primary ||
          node.domain?.value ||
          (typeof node.domain === "string" ? node.domain : "unknown"),
      );
    case "safetyEnvelope":
      return String(
        node.safetyEnvelope?.classification ||
          node.refactoringReadiness?.safetyEnvelope ||
          "UNKNOWN",
      ).toUpperCase();
    case "bottleneck":
      return Boolean(
        node.bottleneck?.isBottleneck ||
        node.bottleneck?.value === "bottleneck",
      );
    case "smellCount":
      return Number(
        node.smells?.smellCount ??
          (Array.isArray(node.smells?.smells) ? node.smells.smells.length : 0),
      );
    case "debtCount":
      return Number(
        node.architectureDebt?.debtCount ??
          (Array.isArray(node.architectureDebt?.debtItems)
            ? node.architectureDebt.debtItems.length
            : 0),
      );
    case "testGapStatus":
      return String(
        node.testGap?.status ||
          node.refactoringReadiness?.testCoverageStatus ||
          "UNKNOWN",
      ).toUpperCase();
    default:
      return node[prop];
  }
}

/**
 * Compares two nodes for meaningful architectural field changes.
 */
function diffNodeProperties(beforeNode, afterNode) {
  const propertiesToCompare = [
    "risk",
    "coupling",
    "fanIn",
    "fanOut",
    "role",
    "layer",
    "domain",
    "safetyEnvelope",
    "bottleneck",
    "smellCount",
    "debtCount",
    "testGapStatus",
  ];

  const changes = [];

  for (const prop of propertiesToCompare) {
    const valBefore = extractNodePropertyValue(beforeNode, prop);
    const valAfter = extractNodePropertyValue(afterNode, prop);

    if (valBefore !== valAfter) {
      changes.push({
        property: prop,
        before: valBefore,
        after: valAfter,
      });
    }
  }

  // Sort changes deterministically by property name
  changes.sort((a, b) => a.property.localeCompare(b.property));

  return changes;
}

/**
 * Main Architecture Snapshot Diff Engine function.
 *
 * @param {Object} before - Baseline Architecture Snapshot or ExplorerData.
 * @param {Object} after - Target Architecture Snapshot or ExplorerData.
 * @param {Object} [options] - Additional comparison options.
 * @returns {Object} Deterministic diff result.
 */
function diffSnapshots(before, after, options = {}) {
  validateSnapshotCompatibility(before, after);

  // 1. Process Nodes / Components
  const beforeNodes = getComponents(before);
  const afterNodes = getComponents(after);

  const beforeNodeMap = new Map();
  for (const node of beforeNodes) {
    const id = getNodeIdentity(node);
    beforeNodeMap.set(id, node);
  }

  const afterNodeMap = new Map();
  for (const node of afterNodes) {
    const id = getNodeIdentity(node);
    afterNodeMap.set(id, node);
  }

  const addedNodes = [];
  const removedNodes = [];
  const changedNodes = [];

  const allNodeIds = new Set([...beforeNodeMap.keys(), ...afterNodeMap.keys()]);

  for (const id of allNodeIds) {
    const bNode = beforeNodeMap.get(id);
    const aNode = afterNodeMap.get(id);

    if (!bNode && aNode) {
      addedNodes.push({
        id,
        name: String(aNode.name || aNode.displayName || id.split(":")[1] || id),
        type: String(aNode.type || id.split(":")[0] || "ApexClass"),
        file: aNode.file ? String(aNode.file).replace(/\\/g, "/") : "",
      });
    } else if (bNode && !aNode) {
      removedNodes.push({
        id,
        name: String(bNode.name || bNode.displayName || id.split(":")[1] || id),
        type: String(bNode.type || id.split(":")[0] || "ApexClass"),
        file: bNode.file ? String(bNode.file).replace(/\\/g, "/") : "",
      });
    } else if (bNode && aNode) {
      const changes = diffNodeProperties(bNode, aNode);
      if (changes.length > 0) {
        changedNodes.push({
          id,
          name: String(
            aNode.name || aNode.displayName || id.split(":")[1] || id,
          ),
          type: String(aNode.type || id.split(":")[0] || "ApexClass"),
          changes,
        });
      }
    }
  }

  // Sort node changes deterministically
  addedNodes.sort((a, b) => a.id.localeCompare(b.id));
  removedNodes.sort((a, b) => a.id.localeCompare(b.id));
  changedNodes.sort((a, b) => a.id.localeCompare(b.id));

  // 2. Process Relationships / Edges
  const beforeEdges = getRelationships(before);
  const afterEdges = getRelationships(after);

  const beforeEdgeMap = new Map();
  for (const edge of beforeEdges) {
    const key = getEdgeIdentity(edge);
    beforeEdgeMap.set(key, edge);
  }

  const afterEdgeMap = new Map();
  for (const edge of afterEdges) {
    const key = getEdgeIdentity(edge);
    afterEdgeMap.set(key, edge);
  }

  const addedEdges = [];
  const removedEdges = [];

  const allEdgeKeys = new Set([
    ...beforeEdgeMap.keys(),
    ...afterEdgeMap.keys(),
  ]);

  for (const key of allEdgeKeys) {
    const bEdge = beforeEdgeMap.get(key);
    const aEdge = afterEdgeMap.get(key);

    if (!bEdge && aEdge) {
      const source = normalizeNodeId(aEdge.from || aEdge.source || "");
      const target = normalizeNodeId(aEdge.to || aEdge.target || "");
      const relType = String(
        aEdge.type || aEdge.relationshipType || "unknown",
      ).trim();
      const method = aEdge.method ? String(aEdge.method).trim() : null;
      addedEdges.push({
        id: key,
        source,
        target,
        relationshipType: relType,
        method,
        evidence: String(aEdge.evidence || "").trim(),
      });
    } else if (bEdge && !aEdge) {
      const source = normalizeNodeId(bEdge.from || bEdge.source || "");
      const target = normalizeNodeId(bEdge.to || bEdge.target || "");
      const relType = String(
        bEdge.type || bEdge.relationshipType || "unknown",
      ).trim();
      const method = bEdge.method ? String(bEdge.method).trim() : null;
      removedEdges.push({
        id: key,
        source,
        target,
        relationshipType: relType,
        method,
        evidence: String(bEdge.evidence || "").trim(),
      });
    }
  }

  addedEdges.sort((a, b) => a.id.localeCompare(b.id));
  removedEdges.sort((a, b) => a.id.localeCompare(b.id));

  // 3. Process Cycles (Canonical Node Sets)
  const beforeCycles = getCycles(before);
  const afterCycles = getCycles(after);

  const beforeCycleMap = new Map();
  for (const c of beforeCycles) {
    const canonical = getCanonicalCycle(c);
    if (canonical.key) {
      beforeCycleMap.set(canonical.key, canonical);
    }
  }

  const afterCycleMap = new Map();
  for (const c of afterCycles) {
    const canonical = getCanonicalCycle(c);
    if (canonical.key) {
      afterCycleMap.set(canonical.key, canonical);
    }
  }

  const addedCycles = [];
  const removedCycles = [];

  const allCycleKeys = new Set([
    ...beforeCycleMap.keys(),
    ...afterCycleMap.keys(),
  ]);

  for (const key of allCycleKeys) {
    const bCycle = beforeCycleMap.get(key);
    const aCycle = afterCycleMap.get(key);

    if (!bCycle && aCycle) {
      addedCycles.push({
        id: aCycle.key,
        size: aCycle.size,
        nodes: aCycle.nodes,
      });
    } else if (bCycle && !aCycle) {
      removedCycles.push({
        id: bCycle.key,
        size: bCycle.size,
        nodes: bCycle.nodes,
      });
    }
  }

  addedCycles.sort((a, b) => a.id.localeCompare(b.id));
  removedCycles.sort((a, b) => a.id.localeCompare(b.id));

  // 4. Process Unresolved References
  const beforeUnresolved = getUnresolvedReferences(before);
  const afterUnresolved = getUnresolvedReferences(after);

  const beforeUnresolvedMap = new Map();
  for (const u of beforeUnresolved) {
    beforeUnresolvedMap.set(u.id, u);
  }

  const afterUnresolvedMap = new Map();
  for (const u of afterUnresolved) {
    afterUnresolvedMap.set(u.id, u);
  }

  const addedUnresolved = [];
  const removedUnresolved = [];

  const allUnresolvedKeys = new Set([
    ...beforeUnresolvedMap.keys(),
    ...afterUnresolvedMap.keys(),
  ]);

  for (const key of allUnresolvedKeys) {
    const bU = beforeUnresolvedMap.get(key);
    const aU = afterUnresolvedMap.get(key);

    if (!bU && aU) {
      addedUnresolved.push({ ...aU });
    } else if (bU && !aU) {
      removedUnresolved.push({ ...bU });
    }
  }

  addedUnresolved.sort((a, b) => a.id.localeCompare(b.id));
  removedUnresolved.sort((a, b) => a.id.localeCompare(b.id));

  // Summary counts
  const totalChanges =
    addedNodes.length +
    removedNodes.length +
    changedNodes.length +
    addedEdges.length +
    removedEdges.length +
    addedCycles.length +
    removedCycles.length +
    addedUnresolved.length +
    removedUnresolved.length;

  const hasChanges = totalChanges > 0;

  return {
    diffSchemaVersion: DIFF_SCHEMA_VERSION,
    snapshotBeforeIdentity: before.snapshotIdentity || null,
    snapshotAfterIdentity: after.snapshotIdentity || null,
    hasChanges,
    summary: {
      // Primary node-based contract keys
      addedNodesCount: addedNodes.length,
      removedNodesCount: removedNodes.length,
      changedNodesCount: changedNodes.length,

      // Component-based alias contract keys for backward compatibility
      addedComponentsCount: addedNodes.length,
      removedComponentsCount: removedNodes.length,
      modifiedComponentsCount: changedNodes.length,

      addedEdgesCount: addedEdges.length,
      removedEdgesCount: removedEdges.length,
      addedCyclesCount: addedCycles.length,
      removedCyclesCount: removedCycles.length,
      addedUnresolvedReferencesCount: addedUnresolved.length,
      removedUnresolvedReferencesCount: removedUnresolved.length,
      totalChangesCount: totalChanges,
    },
    addedNodes,
    removedNodes,
    changedNodes,
    addedEdges,
    removedEdges,
    cycleChanges: {
      added: addedCycles,
      removed: removedCycles,
    },
    unresolvedReferenceChanges: {
      added: addedUnresolved,
      removed: removedUnresolved,
    },
  };
}

/**
 * Alias wrapper for compareArchitectureStates.
 */
function compareArchitectureStates(beforeState, afterState, options) {
  return diffSnapshots(beforeState, afterState, options);
}

const exportsObject = {
  DIFF_SCHEMA_VERSION,
  CHANGE_TYPES,
  diffSnapshots,
  compareArchitectureStates,
  validateSnapshotCompatibility,
  getNodeIdentity,
  getEdgeIdentity,
  getCanonicalCycle,
  getUnresolvedRefIdentity,
  getComponentKey: getNodeIdentity,
  getRelationshipKey: getEdgeIdentity,
  getCycleKey: (c) => getCanonicalCycle(c).key,
};

exportsObject.default = exportsObject;

if (typeof module !== 'undefined' && module.exports) {
  module.exports = exportsObject;
}
if (typeof exports !== 'undefined') {
  Object.assign(exports, exportsObject);
}
if (typeof window !== 'undefined') {
  window.architectureDiff = exportsObject;
}
