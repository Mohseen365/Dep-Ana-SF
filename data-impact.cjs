/**
 * Deterministic Salesforce Data / Object Impact Analysis (Prompt 25)
 *
 * Determines which Salesforce objects and data artifacts are associated
 * with a component and how impact propagates through dependencies transitively.
 *
 * Operations supported:
 *   read, insert, update, delete, upsert, query, reference (and undelete, merge if present)
 *
 * Strict boundary rules:
 *   - 0 LLM runtime dependencies or calls.
 *   - 100% deterministic rules, metadata, AST, and graph evidence.
 *   - Deterministic facts remain authoritative over semantic LLM claims.
 */

"use strict";

const {
  createEvidence,
  createDeterministicResult
} = require("./deterministic/contract.cjs");

/**
 * Normalizes operation name into lower-case standard operations.
 */
function normalizeOperation(op) {
  const s = String(op || "").toLowerCase().trim();
  if (!s) return null;
  if (s === "soql" || s === "select" || s === "read") return "read";
  return s;
}

/**
 * Deduplicates evidence items while keeping rule and detail unique.
 */
function uniqueEvidence(evidenceList) {
  const seen = new Set();
  const result = [];
  for (const item of evidenceList) {
    const key = `${item.rule}||${item.detail}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push(item);
    }
  }
  return result;
}

/**
 * Collects direct object operations and evidence for a single symbol.
 * Returns a Map: objectName -> { operations: Set<string>, evidence: Array<Evidence> }
 */
function collectDirectObjectOperations(symbol) {
  const objectMap = new Map();

  if (!symbol) return objectMap;

  const p = symbol.parsed || {};
  const symbolName = symbol.name || p.name || symbol.id || "UnknownComponent";

  function ensureObject(objName) {
    const normName = String(objName).trim();
    if (!normName) return null;
    if (!objectMap.has(normName)) {
      objectMap.set(normName, {
        operations: new Set(),
        evidence: []
      });
    }
    return objectMap.get(normName);
  }

  // 1. SOQL queries -> 'read' (or 'query') operation
  const soqlQueries = Array.isArray(p.soql) ? p.soql : [];
  for (const query of soqlQueries) {
    if (query && query.object) {
      const entry = ensureObject(query.object);
      if (entry) {
        entry.operations.add("read");
        if (query.operation) entry.operations.add(normalizeOperation(query.operation));
        const lineStr = query.line ? ` (line ${query.line})` : "";
        const detail = query.evidence || `SOQL query on ${query.object}${lineStr} in ${symbolName}`;
        entry.evidence.push(createEvidence("soql-query", detail));
      }
    }
  }

  // 2. Parsed objects list -> 'reference' operation if not already having operations
  const parsedObjects = Array.isArray(p.objects) ? p.objects : [];
  for (const objName of parsedObjects) {
    const entry = ensureObject(objName);
    if (entry) {
      if (entry.operations.size === 0) {
        entry.operations.add("reference");
      }
      entry.evidence.push(
        createEvidence("object-reference", `Direct reference to object ${objName} in ${symbolName}`)
      );
    }
  }

  // 3. Parsed fields list -> 'reference' operation
  const parsedFields = Array.isArray(p.fields) ? p.fields : [];
  for (const field of parsedFields) {
    if (field && field.object) {
      const entry = ensureObject(field.object);
      if (entry) {
        if (entry.operations.size === 0) {
          entry.operations.add("reference");
        }
        const fieldStr = field.field ? `.${field.field}` : "";
        entry.evidence.push(
          createEvidence("field-reference", `Reference to field ${field.object}${fieldStr} in ${symbolName}`)
        );
      }
    }
  }

  // 4. DML operations
  const dmlOps = Array.isArray(p.dml) ? p.dml : [];
  for (const dml of dmlOps) {
    if (!dml) continue;
    const op = normalizeOperation(dml.operation) || "update";
    const lineStr = dml.line ? ` (line ${dml.line})` : "";
    const methodStr = dml.methodOwner ? ` in method ${dml.methodOwner}` : "";

    // If DML specifies target object explicitly
    if (dml.object) {
      const entry = ensureObject(dml.object);
      if (entry) {
        entry.operations.add(op);
        entry.evidence.push(
          createEvidence("dml-operation", `DML ${op.toUpperCase()} on ${dml.object}${methodStr}${lineStr} in ${symbolName}`)
        );
      }
    } else {
      // DML without explicit object name applies op to all referenced/queried objects or as general DML
      // If objectMap already has objects, add op to them; if not, record on any parsed objects
      if (objectMap.size > 0) {
        for (const [objName, entry] of objectMap.entries()) {
          entry.operations.add(op);
          const varStr = dml.variable ? ` on variable '${dml.variable}'` : "";
          entry.evidence.push(
            createEvidence("dml-operation", `DML ${op.toUpperCase()}${varStr} potentially targeting ${objName}${methodStr}${lineStr} in ${symbolName}`)
          );
        }
      }
    }
  }

  // 5. Trigger Target Object
  if (symbol.type === "Trigger" && p.targetObject) {
    const entry = ensureObject(p.targetObject);
    if (entry) {
      entry.operations.add("reference");
      entry.evidence.push(
        createEvidence("trigger-target", `Trigger ${symbolName} targets object ${p.targetObject}`)
      );
    }
  }

  return objectMap;
}

/**
 * Analyzes data object impact for a single component (symbol), including direct
 * object operations and transitive propagation through component dependencies.
 */
function analyzeComponentDataImpact(symbol, graph = null, registry = null) {
  if (!symbol) {
    return createDeterministicResult({
      value: "no-data-impact",
      primary: "no-data-impact",
      confidence: "unknown",
      evidence: [createEvidence("no-symbol", "Component symbol is missing or null.")],
      metadata: { objects: [] }
    });
  }

  const symbolMap = new Map();
  if (registry && Array.isArray(registry.symbols)) {
    for (const s of registry.symbols) {
      symbolMap.set(s.id, s);
      if (s.name) symbolMap.set(s.name, s);
    }
  }
  symbolMap.set(symbol.id, symbol);
  if (symbol.name) symbolMap.set(symbol.name, symbol);

  // Map of objectName -> { operations: Set<string>, evidence: Array<Evidence>, isTransitive: boolean }
  const combinedImpact = new Map();

  function ensureCombinedObject(objName) {
    const normName = String(objName).trim();
    if (!combinedImpact.has(normName)) {
      combinedImpact.set(normName, {
        operations: new Set(),
        evidence: [],
        direct: false
      });
    }
    return combinedImpact.get(normName);
  }

  // 1. Collect Direct Operations
  const directMap = collectDirectObjectOperations(symbol);
  for (const [objName, data] of directMap.entries()) {
    const combined = ensureCombinedObject(objName);
    combined.direct = true;
    for (const op of data.operations) combined.operations.add(op);
    for (const ev of data.evidence) combined.evidence.push(ev);
  }

  // 2. Propagate Transitive Impact via Outgoing Dependencies
  if (graph && Array.isArray(graph.edges)) {
    const visitedComponents = new Set([symbol.id]);
    const queue = [{ id: symbol.id, depth: 0, path: [symbol.name || symbol.id] }];

    while (queue.length > 0) {
      const current = queue.shift();
      if (current.depth >= 10) continue; // safety limit

      // Find outgoing dependencies from current component
      const outgoingEdges = graph.edges.filter(
        e => e.from === current.id && e.type !== "soql-object" && e.type !== "soql-field"
      );

      for (const edge of outgoingEdges) {
        const targetId = edge.to;
        if (!targetId || visitedComponents.has(targetId)) continue;
        visitedComponents.add(targetId);

        const targetSymbol = symbolMap.get(targetId);
        if (targetSymbol) {
          const targetDirectMap = collectDirectObjectOperations(targetSymbol);
          const targetName = targetSymbol.name || targetSymbol.id;
          const chainStr = [...current.path, targetName].join(" -> ");

          for (const [objName, targetData] of targetDirectMap.entries()) {
            const combined = ensureCombinedObject(objName);
            for (const op of targetData.operations) combined.operations.add(op);
            combined.evidence.push(
              createEvidence(
                "transitive-data-impact",
                `Transitive impact on object ${objName} via dependency chain: ${chainStr}`
              )
            );
          }

          queue.push({
            id: targetId,
            depth: current.depth + 1,
            path: [...current.path, targetName]
          });
        }
      }
    }
  }

  // Format objects output array
  const objectsResult = [];
  const OPERATION_PRECEDENCE = ["read", "insert", "update", "delete", "upsert", "undelete", "merge", "query", "reference"];

  for (const [objName, data] of combinedImpact.entries()) {
    const sortedOps = [...data.operations].sort((a, b) => {
      const idxA = OPERATION_PRECEDENCE.indexOf(a);
      const idxB = OPERATION_PRECEDENCE.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.localeCompare(b);
    });

    objectsResult.push({
      name: objName,
      operations: sortedOps,
      evidence: uniqueEvidence(data.evidence)
    });
  }

  // Sort objects alphabetically
  objectsResult.sort((a, b) => a.name.localeCompare(b.name));

  const hasImpact = objectsResult.length > 0;
  const primaryValue = hasImpact
    ? `${objectsResult.length} object(s) impacted (${objectsResult.map(o => o.name).join(", ")})`
    : "no-object-impact";

  const allEvidence = uniqueEvidence(
    objectsResult.flatMap(o => o.evidence)
  );

  if (allEvidence.length === 0) {
    allEvidence.push(
      createEvidence("no-object-references", `Component ${symbol.name || symbol.id} has no direct or transitive Salesforce object impact.`)
    );
  }

  return createDeterministicResult({
    value: primaryValue,
    primary: primaryValue,
    confidence: hasImpact ? "high" : "unknown",
    evidence: allEvidence,
    metadata: {
      objects: objectsResult
    }
  });
}

/**
 * Analyzes data object impact across all symbols in a registry.
 */
function analyzeAllDataImpact(registry, graph = null) {
  const symbols = Array.isArray(registry?.symbols) ? registry.symbols : [];
  const symbolDataImpact = new Map();

  for (const symbol of symbols) {
    const impactResult = analyzeComponentDataImpact(symbol, graph, registry);
    symbolDataImpact.set(symbol.id, impactResult);
  }

  return symbolDataImpact;
}

module.exports = {
  collectDirectObjectOperations,
  analyzeComponentDataImpact,
  analyzeAllDataImpact
};
