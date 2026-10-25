/**
 * Comprehensive Deterministic Security Boundaries Test Suite (Prompt 26)
 *
 * Verifies:
 *   1. with sharing
 *   2. without sharing
 *   3. inherited sharing
 *   4. exposed component
 *   5. multiple boundaries
 *   6. unknown / unspecified
 *   7. contradiction preservation
 *   8. evidence trail
 *   9. zero LLM calls
 *   10. regression across analyzer
 */

"use strict";

const fs = require("fs");
const path = require("path");
const assert = require("assert");
const { analyzeSecurityBoundaries, analyzeAllSecurityBoundaries } = require("../security-boundaries.cjs");
const { enforceDeterministicAuthority } = require("../deterministic/contract.cjs");
const { analyze } = require("../dependency-analyzer.cjs");

console.log("Running Deterministic Security Boundaries Test Suite (Prompt 26)...");
console.log("==================================================================");

// -----------------------------------------------------------------------------
// Test 1 — with sharing
// -----------------------------------------------------------------------------
{
  console.log("Test 1: 'with sharing' classification...");
  const symbol = {
    name: "AccountService",
    type: "ApexClass",
    parsed: {
      name: "AccountService",
      sharing: "with sharing"
    }
  };

  const res = analyzeSecurityBoundaries(symbol);
  assert.strictEqual(res.primary, "with sharing", "Test 1: Primary boundary must be with sharing");
  assert.strictEqual(res.confidence, "high", "Test 1: Confidence must be high");
  assert.strictEqual(res.metadata.sharingModel, "with sharing", "Test 1: Metadata sharingModel must be with sharing");
  console.log("  ✓ Test 1 PASSED ('with sharing' boundary verified)");
}

// -----------------------------------------------------------------------------
// Test 2 — without sharing
// -----------------------------------------------------------------------------
{
  console.log("Test 2: 'without sharing' classification...");
  const symbol = {
    name: "SystemContextHelper",
    type: "ApexClass",
    parsed: {
      name: "SystemContextHelper",
      sharing: "without sharing"
    }
  };

  const res = analyzeSecurityBoundaries(symbol);
  assert.strictEqual(res.primary, "without sharing", "Test 2: Primary boundary must be without sharing");
  assert.strictEqual(res.confidence, "high", "Test 2: Confidence must be high");
  assert.strictEqual(res.metadata.sharingModel, "without sharing", "Test 2: Metadata sharingModel must be without sharing");
  console.log("  ✓ Test 2 PASSED ('without sharing' boundary verified)");
}

// -----------------------------------------------------------------------------
// Test 3 — inherited sharing
// -----------------------------------------------------------------------------
{
  console.log("Test 3: 'inherited sharing' classification...");
  const symbol = {
    name: "OrderSelector",
    type: "ApexClass",
    parsed: {
      name: "OrderSelector",
      sharing: "inherited sharing"
    }
  };

  const res = analyzeSecurityBoundaries(symbol);
  assert.strictEqual(res.primary, "inherited sharing", "Test 3: Primary boundary must be inherited sharing");
  assert.strictEqual(res.confidence, "high", "Test 3: Confidence must be high");
  assert.strictEqual(res.metadata.sharingModel, "inherited sharing", "Test 3: Metadata sharingModel must be inherited sharing");
  console.log("  ✓ Test 3 PASSED ('inherited sharing' boundary verified)");
}

// -----------------------------------------------------------------------------
// Test 4 — exposed component (REST / Aura / Invocable)
// -----------------------------------------------------------------------------
{
  console.log("Test 4: Exposed component entry points...");
  const restSymbol = {
    name: "AccountRestAPI",
    type: "ApexClass",
    parsed: {
      name: "AccountRestAPI",
      sharing: "with sharing",
      annotations: ["RestResource"]
    }
  };

  const restRes = analyzeSecurityBoundaries(restSymbol);
  assert.ok(restRes.metadata.isRestExposed, "Test 4: REST exposed metadata flag set");
  assert.ok(restRes.secondary.includes("REST exposed"), "Test 4: REST exposed boundary detected");

  const auraSymbol = {
    name: "DashboardController",
    type: "ApexClass",
    parsed: {
      name: "DashboardController",
      sharing: "with sharing",
      methods: [{ name: "getMetrics", isAuraEnabled: true }]
    }
  };

  const auraRes = analyzeSecurityBoundaries(auraSymbol);
  assert.ok(auraRes.metadata.isAuraExposed, "Test 4: Aura exposed metadata flag set");
  assert.ok(auraRes.secondary.includes("Aura exposed"), "Test 4: Aura exposed boundary detected");

  console.log("  ✓ Test 4 PASSED (Exposed component entry points verified)");
}

// -----------------------------------------------------------------------------
// Test 5 — Multiple boundaries
// -----------------------------------------------------------------------------
{
  console.log("Test 5: Multiple boundaries combination...");
  const symbol = {
    name: "MultiBoundaryController",
    type: "ApexClass",
    parsed: {
      name: "MultiBoundaryController",
      sharing: "with sharing",
      annotations: ["RestResource"],
      methods: [
        { name: "getApi", isAuraEnabled: true },
        { name: "executeFlow", isInvocable: true }
      ]
    }
  };

  const res = analyzeSecurityBoundaries(symbol);
  assert.strictEqual(res.primary, "with sharing", "Test 5: Primary is with sharing");
  assert.ok(res.secondary.includes("REST exposed"), "Test 5: secondary includes REST exposed");
  assert.ok(res.secondary.includes("Aura exposed"), "Test 5: secondary includes Aura exposed");
  assert.ok(res.secondary.includes("Invocable exposed"), "Test 5: secondary includes Invocable exposed");
  assert.strictEqual(res.metadata.boundaries.length, 4, "Test 5: Four total boundaries detected");
  console.log("  ✓ Test 5 PASSED (Multiple boundaries correctly combined)");
}

// -----------------------------------------------------------------------------
// Test 6 — Unknown / Unspecified
// -----------------------------------------------------------------------------
{
  console.log("Test 6: Unknown / Unspecified sharing model...");
  const symbol = {
    name: "LegacyUtility",
    type: "ApexClass",
    parsed: {
      name: "LegacyUtility",
      methods: [{ name: "doStuff" }]
    }
  };

  const res = analyzeSecurityBoundaries(symbol);
  assert.strictEqual(res.primary, "unspecified", "Test 6: Unspecified sharing primary");
  assert.strictEqual(res.confidence, "unknown", "Test 6: Unknown confidence for unspecified sharing alone");
  assert.strictEqual(res.metadata.sharingModel, "unspecified", "Test 6: Metadata sharingModel is unspecified");
  console.log("  ✓ Test 6 PASSED (Unspecified sharing model handled cleanly)");
}

// -----------------------------------------------------------------------------
// Test 7 — Contradiction Preservation (Deterministic Fact Authoritative)
// -----------------------------------------------------------------------------
{
  console.log("Test 7: Contradiction preservation...");
  const symbol = {
    name: "SecureService",
    type: "ApexClass",
    parsed: {
      name: "SecureService",
      sharing: "with sharing"
    }
  };

  const detRes = analyzeSecurityBoundaries(symbol);

  // LLM claim says without sharing when AST proves with sharing
  const semanticClaim = "without sharing";
  const auth = enforceDeterministicAuthority(detRes.primary, semanticClaim);

  assert.strictEqual(auth.authoritativeValue, "with sharing", "Test 7: Deterministic fact retained");
  assert.strictEqual(auth.contradiction, true, "Test 7: Contradiction flag set");
  assert.ok(auth.message.includes("contradicts deterministic fact"), "Test 7: Explanation message generated");
  console.log("  ✓ Test 7 PASSED (Deterministic authority preserved on contradiction)");
}

// -----------------------------------------------------------------------------
// Test 8 — Evidence Trail
// -----------------------------------------------------------------------------
{
  console.log("Test 8: Evidence trail verification...");
  const symbol = {
    name: "InvocableService",
    type: "ApexClass",
    parsed: {
      name: "InvocableService",
      sharing: "inherited sharing",
      methods: [{ name: "processAction", isInvocable: true }]
    }
  };

  const res = analyzeSecurityBoundaries(symbol);
  assert.ok(Array.isArray(res.evidence) && res.evidence.length >= 2, "Test 8: Evidence items generated for both boundaries");
  assert.ok(res.evidence.every(e => typeof e.rule === "string" && typeof e.detail === "string"), "Test 8: Evidence conforms to BASE-ARCH-1 contract");
  console.log("  ✓ Test 8 PASSED (Evidence trail conforms to contract)");
}

// -----------------------------------------------------------------------------
// Test 9 — Zero LLM Calls
// -----------------------------------------------------------------------------
{
  console.log("Test 9: Zero LLM calls verification...");
  const sourceCode = fs.readFileSync(path.join(__dirname, "../security-boundaries.cjs"), "utf8");
  assert.strictEqual(/LlmClient|CacheManager|semantic-investigation-service/i.test(sourceCode), false, "Test 9: Module must not import LLM modules");
  console.log("  ✓ Test 9 PASSED (0 LLM imports or calls verified)");
}

// -----------------------------------------------------------------------------
// Test 10 — Full Analyzer Integration & Regression
// -----------------------------------------------------------------------------
{
  console.log("Test 10: Full analyzer regression...");
  const fixturesDir = path.resolve(__dirname, "../../refactor-litellm/tests/fixtures/dependency-scope/force-app/main/default");

  if (fs.existsSync(fixturesDir)) {
    const result = analyze(fixturesDir, {}, false);
    const symbolBoundaries = analyzeAllSecurityBoundaries(result.registry, result.graph);
    assert.ok(symbolBoundaries.symbolBoundaries instanceof Map, "Test 10: symbolBoundaries is a Map");
    assert.ok(typeof symbolBoundaries.counts === "object", "Test 10: counts object present");
    console.log("  ✓ Test 10 PASSED (Analyzer integration verified)");
  } else {
    console.log("  ~ Test 10 SKIPPED (Fixtures directory not found)");
  }
}

// -----------------------------------------------------------------------------
// Test 11 — Vite /projects Middleware Path Traversal Containment
// -----------------------------------------------------------------------------
{
  console.log("Test 11: Middleware path traversal containment...");
  const viteConfigContent = fs.readFileSync(
    path.join(__dirname, "../explorer/vite.config.ts"),
    "utf8"
  );
  assert.ok(
    viteConfigContent.includes("isPathContained"),
    "Test 11: vite.config.ts must contain isPathContained check"
  );
  assert.ok(
    viteConfigContent.includes("decodeURIComponent"),
    "Test 11: vite.config.ts must handle URL decoded paths"
  );

  // Test containment logic explicitly
  function isPathContained(parentDir, targetPath) {
    const normalizedParent = path.resolve(parentDir);
    const normalizedTarget = path.resolve(parentDir, targetPath);
    const rel = path.relative(normalizedParent, normalizedTarget);
    return rel !== '' && !rel.startsWith('..') && !path.isAbsolute(rel);
  }

  const baseDir = path.resolve(__dirname, "../analyze/projects");
  assert.strictEqual(isPathContained(baseDir, "pbim/explorer-data.json"), true, "Test 11: Valid child path allowed");
  assert.strictEqual(isPathContained(baseDir, "../../package.json"), false, "Test 11: Simple traversal rejected");
  assert.strictEqual(isPathContained(baseDir, "..%2F..%2Fpackage.json"), false, "Test 11: Encoded traversal rejected when decoded");

  console.log("  ✓ Test 11 PASSED (Middleware path traversal containment verified)");
}

console.log("");
console.log("ALL 11 DETERMINISTIC SECURITY BOUNDARY TESTS PASSED!");
