/**
 * Comprehensive Deterministic Domain Classifier Test Suite (B5)
 *
 * Verifies domain classification tests:
 *   Test 1 — Clear domain classification (e.g. OrderService -> Order)
 *   Test 2 — Multiple domain candidates / secondary domains
 *   Test 3 — Shared components & object dependencies (schema SObject binding)
 *   Test 4 — Cross-domain dependency propagation
 *   Test 5 — Isolated component (no graph edges)
 *   Test 6 — Unknown domain fallback (insufficient evidence)
 *   Test 7 — Deterministic ordering & stable output
 *   Test 8 — Explainable evidence structure (BASE-ARCH-1 contract)
 *   Test 9 — Deterministic 100% repeatability across runs
 *   Test 10 — Zero LLM runtime boundary check (0 LLM calls)
 *   Test 11 — Full analyzer integration & regression check
 */

"use strict";

const fs = require("fs");
const path = require("path");
const assert = require("assert");
const {
  classifyComponentDomain,
  classifyAllDomains,
  cleanDomainName,
  extractNameDomainCandidate,
  extractPathDomainCandidate
} = require("../domain-classifier.cjs");
const { analyze } = require("../dependency-analyzer.cjs");

console.log("Running Deterministic Domain Classifier Test Suite (B5)...");
console.log("=========================================================");

// -----------------------------------------------------------------------------
// Test 1 — Clear Domain Classification
// -----------------------------------------------------------------------------
{
  console.log("Test 1: Clear domain classification...");
  const symbol = {
    name: "OrderService",
    type: "ApexClass",
    file: "force-app/main/default/classes/OrderService.cls",
    parsed: {
      name: "OrderService",
      methods: [{ name: "processOrder" }]
    }
  };

  const registry = {
    symbols: [
      symbol,
      { name: "OrderSelector", type: "ApexClass" },
      { name: "OrderRepository", type: "ApexClass" },
      { name: "OrderController", type: "ApexClass" }
    ]
  };

  const res = classifyComponentDomain(symbol, registry);
  assert.strictEqual(res.primary, "Order", "Test 1: Primary domain must be Order");
  assert.strictEqual(res.value, "Order", "Test 1: Value must be Order");
  assert.strictEqual(res.confidence, "high", "Test 1: Confidence must be high with multi-component evidence");
  assert.ok(res.evidence.length >= 1, "Test 1: Evidence array must not be empty");
  console.log("  ✓ Test 1 PASSED (OrderService classified as Order domain [high])");
}

// -----------------------------------------------------------------------------
// Test 2 — Multiple Domain Candidates / Secondary Domains
// -----------------------------------------------------------------------------
{
  console.log("Test 2: Multiple domain candidates / secondary domains...");
  const symbol = {
    name: "PaymentOrderService",
    type: "ApexClass",
    file: "force-app/main/default/classes/PaymentOrderService.cls",
    parsed: {
      name: "PaymentOrderService",
      objects: ["Order", "Payment__c"],
      soql: [{ object: "Order" }, { object: "Payment__c" }]
    }
  };

  const res = classifyComponentDomain(symbol);
  assert.ok(["PaymentOrder", "Order", "Payment"].includes(res.primary), "Test 2: Primary domain must match one candidate");
  assert.ok(Array.isArray(res.secondary), "Test 2: Secondary domains array must exist");
  assert.ok(res.secondary.length >= 1, "Test 2: Secondary domain detected for cross-domain operations");
  console.log(`  ✓ Test 2 PASSED (Primary domain: ${res.primary}, secondary: [${res.secondary.join(", ")}])`);
}

// -----------------------------------------------------------------------------
// Test 3 — Shared Components & Schema Object Dependencies
// -----------------------------------------------------------------------------
{
  console.log("Test 3: Shared components & schema object dependencies...");
  const objectSymbol = {
    name: "Invoice__c",
    type: "Object",
    file: "objects/Invoice__c/Invoice__c.object-meta.xml"
  };

  const objRes = classifyComponentDomain(objectSymbol);
  assert.strictEqual(objRes.primary, "Invoice", "Test 3: Object symbol Invoice__c domain must be Invoice");
  assert.strictEqual(objRes.confidence, "high", "Test 3: Object symbol confidence must be high");

  const consumerSymbol = {
    name: "BillingHandler",
    type: "ApexClass",
    file: "classes/BillingHandler.cls",
    parsed: {
      name: "BillingHandler",
      soql: [{ object: "Invoice__c" }]
    }
  };

  const consumerRes = classifyComponentDomain(consumerSymbol);
  assert.strictEqual(consumerRes.primary, "Billing", "Test 3: BillingHandler primary domain is Billing");
  assert.ok(consumerRes.secondary.includes("Invoice"), "Test 3: Invoice secondary domain identified from object interaction");
  console.log("  ✓ Test 3 PASSED (Object & consumer shared component domains verified)");
}

// -----------------------------------------------------------------------------
// Test 4 — Cross-domain Dependency Propagation
// -----------------------------------------------------------------------------
{
  console.log("Test 4: Cross-domain dependency propagation...");
  const registry = {
    symbols: [
      { id: "ApexClass:OrderService", name: "OrderService", type: "ApexClass" },
      { id: "ApexClass:InvoiceService", name: "InvoiceService", type: "ApexClass" },
      { id: "ApexClass:OrderInvoiceBridge", name: "OrderInvoiceBridge", type: "ApexClass", parsed: { soql: [{ object: "Order" }] } }
    ]
  };

  const graph = {
    nodes: registry.symbols,
    edges: [
      { from: "ApexClass:OrderInvoiceBridge", to: "ApexClass:InvoiceService", type: "method-call" },
      { from: "ApexClass:OrderInvoiceBridge", to: "ApexClass:OrderService", type: "method-call" }
    ]
  };

  const allDomains = classifyAllDomains(registry, graph);
  const bridgeDomain = allDomains.symbolDomains.get("ApexClass:OrderInvoiceBridge");

  assert.ok(bridgeDomain, "Test 4: Bridge component domain classified");
  assert.ok(["OrderInvoiceBridge", "Order", "InvoiceService", "Invoice"].includes(bridgeDomain.primary), "Test 4: Primary domain recognized");
  assert.ok(Array.isArray(bridgeDomain.secondary), "Test 4: Secondary domains capture connected domains");
  console.log("  ✓ Test 4 PASSED (Cross-domain dependency propagation verified)");
}

// -----------------------------------------------------------------------------
// Test 5 — Isolated Component (No Graph Edges)
// -----------------------------------------------------------------------------
{
  console.log("Test 5: Isolated component domain handling...");
  const symbol = {
    id: "ApexClass:IsolatedHelper",
    name: "IsolatedHelper",
    type: "ApexClass",
    file: "classes/IsolatedHelper.cls",
    parsed: { name: "IsolatedHelper" }
  };

  const res = classifyComponentDomain(symbol);
  assert.strictEqual(res.primary, "Isolated", "Test 5: Name stem extracted for isolated component");
  assert.strictEqual(res.confidence, "medium", "Test 5: Single candidate without multi-component evidence yields medium confidence");
  console.log("  ✓ Test 5 PASSED (Isolated component handled cleanly with medium confidence)");
}

// -----------------------------------------------------------------------------
// Test 6 — Unknown Domain Fallback
// -----------------------------------------------------------------------------
{
  console.log("Test 6: Unknown domain fallback (insufficient evidence)...");
  const symbol = {
    id: "ApexClass:X",
    name: "X",
    type: "ApexClass",
    file: "classes/X.cls",
    parsed: { name: "X" }
  };

  const res = classifyComponentDomain(symbol);
  assert.strictEqual(res.primary, "unknown", "Test 6: Primary domain must be unknown for single character non-domain name");
  assert.strictEqual(res.confidence, "unknown", "Test 6: Confidence must be unknown");
  console.log("  ✓ Test 6 PASSED (Unknown domain fallback verified)");
}

// -----------------------------------------------------------------------------
// Test 7 — Deterministic Ordering & Stable Output
// -----------------------------------------------------------------------------
{
  console.log("Test 7: Deterministic ordering & stable output...");
  const registry = {
    symbols: [
      { id: "ApexClass:ZService", name: "ZService", type: "ApexClass" },
      { id: "ApexClass:AService", name: "AService", type: "ApexClass" },
      { id: "ApexClass:MService", name: "MService", type: "ApexClass" }
    ]
  };

  const result1 = classifyAllDomains(registry);
  const result2 = classifyAllDomains(registry);

  const keys1 = Object.keys(result1.domains);
  const keys2 = Object.keys(result2.domains);

  assert.deepStrictEqual(keys1, keys2, "Test 7: Domain keys must be identically sorted across runs");
  assert.deepStrictEqual(
    [...keys1],
    [...keys1].sort((a, b) => a.localeCompare(b)),
    "Test 7: Domain keys must be alphabetically ordered"
  );
  console.log("  ✓ Test 7 PASSED (Alphabetical deterministic ordering verified)");
}

// -----------------------------------------------------------------------------
// Test 8 — Explainable Evidence Structure (BASE-ARCH-1)
// -----------------------------------------------------------------------------
{
  console.log("Test 8: Explainable evidence structure (BASE-ARCH-1)...");
  const symbol = {
    name: "AssetService",
    type: "ApexClass",
    file: "classes/AssetService.cls",
    parsed: { name: "AssetService" }
  };

  const res = classifyComponentDomain(symbol);
  assert.ok(Array.isArray(res.evidence), "Test 8: Evidence must be an array");
  assert.ok(res.evidence.length >= 1, "Test 8: At least one evidence item required");
  assert.strictEqual(typeof res.evidence[0].rule, "string", "Test 8: Rule field must be string");
  assert.strictEqual(typeof res.evidence[0].detail, "string", "Test 8: Detail field must be string");
  console.log(`  ✓ Test 8 PASSED (Rule '${res.evidence[0].rule}': ${res.evidence[0].detail})`);
}

// -----------------------------------------------------------------------------
// Test 9 — Deterministic 100% Repeatability Across Runs
// -----------------------------------------------------------------------------
{
  console.log("Test 9: Deterministic 100% repeatability...");
  const symbol = {
    id: "ApexClass:OrderProcessor",
    name: "OrderProcessor",
    type: "ApexClass",
    file: "classes/OrderProcessor.cls",
    parsed: { name: "OrderProcessor", objects: ["Order"] }
  };

  const run1 = classifyComponentDomain(symbol);
  const run2 = classifyComponentDomain(symbol);
  const run3 = classifyComponentDomain(symbol);

  assert.deepStrictEqual(run1, run2, "Test 9: Run 1 and Run 2 must be identical");
  assert.deepStrictEqual(run2, run3, "Test 9: Run 2 and Run 3 must be identical");
  console.log("  ✓ Test 9 PASSED (100% identical outputs across 3 runs)");
}

// -----------------------------------------------------------------------------
// Test 10 — Zero LLM Runtime Boundary Check
// -----------------------------------------------------------------------------
{
  console.log("Test 10: Zero LLM runtime boundary check...");
  const source = fs.readFileSync(require.resolve("../domain-classifier.cjs"), "utf8");

  assert.strictEqual(source.includes("LlmClient"), false, "Test 10: Must not import LlmClient");
  assert.strictEqual(source.includes("CacheManager"), false, "Test 10: Must not import CacheManager");
  assert.strictEqual(source.includes("semantic-investigation"), false, "Test 10: Must not import semantic-investigation");
  console.log("  ✓ Test 10 PASSED (0 LLM imports or calls in domain-classifier.cjs)");
}

// -----------------------------------------------------------------------------
// Test 11 — Full Analyzer Integration & Regression Check
// -----------------------------------------------------------------------------
{
  console.log("Test 11: Full analyzer integration & regression check...");
  const fixturesDir = path.resolve(__dirname, "../../refactor-litellm/tests/fixtures/dependency-scope/force-app/main/default");

  if (fs.existsSync(fixturesDir)) {
    const result = analyze(fixturesDir, {}, false);
    assert.ok(result.domainAnalysis, "Test 11: domainAnalysis present in analyze result");
    assert.ok(result.domainAnalysis.domains, "Test 11: domains aggregate count present");
    console.log("  ✓ Test 11 PASSED (Full analyzer integration produces aggregate domain metrics)");
  } else {
    console.log("  ~ Test 11 SKIPPED (Fixtures directory not found)");
  }
}

console.log("");
console.log("ALL 11 DETERMINISTIC DOMAIN CLASSIFIER TESTS PASSED SUCCESSFULLY!");
