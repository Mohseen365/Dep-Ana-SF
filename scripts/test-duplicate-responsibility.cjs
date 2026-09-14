#!/usr/bin/env node

/**
 * Deterministic Duplicate Architectural Responsibility Test Suite (WAVE-D4)
 *
 * Covers 10 required test scenarios:
 *  1. Clearly distinct components (NO_DUPLICATION_SIGNAL)
 *  2. Same role but different responsibility (e.g. Selectors for different SObjects)
 *  3. Same domain with legitimate separation (e.g. Controller vs Service in same domain)
 *  4. Overlapping responsibility signals (POSSIBLE_OVERLAP)
 *  5. Strong overlap (STRONG_OVERLAP)
 *  6. Unknown information (missing or unparsed symbol -> UNKNOWN)
 *  7. Boundary separation (Controllers/Handlers for different entry point boundaries)
 *  8. Deterministic repeatability (100% stable across runs)
 *  9. Authority preservation (enforces deterministic facts over conflicting claims)
 * 10. Zero LLM calls verification
 */

"use strict";

const fs = require("fs");
const path = require("path");
const assert = require("assert");

const ROOT_DIR = path.resolve(__dirname, "..");
const {
  detectComponentDuplicateResponsibility,
  detectAllDuplicateResponsibilities,
  compareTwoComponentsForDuplication,
  DUPLICATION_CLASSIFICATIONS
} = require(path.join(ROOT_DIR, "duplicate-responsibility.cjs"));

const {
  validateDeterministicResult,
  enforceDeterministicAuthority
} = require(path.join(ROOT_DIR, "deterministic", "contract.cjs"));

function runDuplicateResponsibilityTests() {
  console.log("Running Deterministic Duplicate Architectural Responsibility Test Suite (WAVE-D4)...");
  console.log("===================================================================================");

  // -------------------------------------------------------------
  // Test 1: Clearly distinct components
  // -------------------------------------------------------------
  console.log("Test 1: Clearly distinct components...");
  const accountService = {
    id: "ApexClass:AccountService",
    type: "ApexClass",
    name: "AccountService",
    parsed: {
      name: "AccountService",
      type: "ApexClass",
      soql: [{ object: "Account" }],
      methods: [{ name: "manageAccount" }]
    }
  };

  const paymentGateway = {
    id: "ApexClass:PaymentGateway",
    type: "ApexClass",
    name: "PaymentGateway",
    parsed: {
      name: "PaymentGateway",
      type: "ApexClass",
      callouts: ["HttpRequest"],
      methods: [{ name: "processCharge" }]
    }
  };

  const compResult1 = compareTwoComponentsForDuplication(accountService, paymentGateway);
  assert.strictEqual(compResult1.classification, "NO_DUPLICATION_SIGNAL");
  console.log("  ✓ Test 1 PASSED (Clearly distinct components classified as NO_DUPLICATION_SIGNAL)");

  // -------------------------------------------------------------
  // Test 2: Same role but different responsibility (Selectors for different SObjects)
  // -------------------------------------------------------------
  console.log("Test 2: Same role but different responsibility (SObject Selectors)...");
  const accountSelector = {
    id: "ApexClass:AccountSelector",
    type: "ApexClass",
    name: "AccountSelector",
    parsed: { name: "AccountSelector", type: "ApexClass", soql: [{ object: "Account" }] }
  };

  const contactSelector = {
    id: "ApexClass:ContactSelector",
    type: "ApexClass",
    name: "ContactSelector",
    parsed: { name: "ContactSelector", type: "ApexClass", soql: [{ object: "Contact" }] }
  };

  const compResult2 = compareTwoComponentsForDuplication(accountSelector, contactSelector, null, {
    symbols: [accountSelector, contactSelector]
  });

  assert.strictEqual(compResult2.classification, "NO_DUPLICATION_SIGNAL");
  assert.ok(compResult2.evidence.some(e => e.rule === "distinct-data-object-responsibility"));
  console.log("  ✓ Test 2 PASSED (Selectors targeting distinct SObjects recognized as legitimate separation)");

  // -------------------------------------------------------------
  // Test 3: Same domain with legitimate separation (Controller vs Service)
  // -------------------------------------------------------------
  console.log("Test 3: Same domain with legitimate separation (Controller vs Service)...");
  const orderController = {
    id: "ApexClass:OrderController",
    type: "ApexClass",
    name: "OrderController",
    parsed: { name: "OrderController", type: "ApexClass", methods: [{ isAuraEnabled: true, name: "getOrders" }] }
  };

  const orderService = {
    id: "ApexClass:OrderService",
    type: "ApexClass",
    name: "OrderService",
    parsed: { name: "OrderService", type: "ApexClass", soql: [{ object: "Order" }] }
  };

  const compResult3 = compareTwoComponentsForDuplication(orderController, orderService, null, {
    symbols: [orderController, orderService]
  });

  assert.strictEqual(compResult3.classification, "NO_DUPLICATION_SIGNAL");
  assert.ok(compResult3.evidence.some(e => e.rule === "distinct-role-layer"));
  console.log("  ✓ Test 3 PASSED (Controller and Service in same domain recognized as legitimate layer separation)");

  // -------------------------------------------------------------
  // Test 4: Overlapping responsibility signals (POSSIBLE_OVERLAP)
  // -------------------------------------------------------------
  console.log("Test 4: Overlapping responsibility signals (POSSIBLE_OVERLAP)...");
  const invoiceService = {
    id: "ApexClass:InvoiceService",
    type: "ApexClass",
    name: "InvoiceService",
    parsed: { name: "InvoiceService", type: "ApexClass", soql: [{ object: "Invoice__c" }], dml: [{ operation: "update", variable: "inv" }] }
  };

  const invoiceProcessor = {
    id: "ApexClass:InvoiceProcessor",
    type: "ApexClass",
    name: "InvoiceProcessor",
    parsed: { name: "InvoiceProcessor", type: "ApexClass", soql: [{ object: "Invoice__c" }], dml: [{ operation: "insert", variable: "inv" }] }
  };

  const mockGraph1 = {
    edges: [
      { from: "ApexClass:InvoiceService", to: "ApexClass:InvoiceHelper" },
      { from: "ApexClass:InvoiceProcessor", to: "ApexClass:InvoiceHelper" }
    ]
  };

  const compResult4 = compareTwoComponentsForDuplication(invoiceService, invoiceProcessor, mockGraph1, {
    symbols: [invoiceService, invoiceProcessor]
  });

  assert.ok(compResult4.classification === "POSSIBLE_OVERLAP" || compResult4.classification === "STRONG_OVERLAP");
  assert.ok(compResult4.evidence.some(e => e.rule === "same-architectural-role"));
  assert.ok(compResult4.evidence.some(e => e.rule === "shared-data-objects"));
  console.log("  ✓ Test 4 PASSED (Overlapping role, domain, data objects & dependencies produce overlap signal)");

  // -------------------------------------------------------------
  // Test 5: Strong overlap (STRONG_OVERLAP)
  // -------------------------------------------------------------
  console.log("Test 5: Strong overlap (STRONG_OVERLAP)...");
  const billingService = {
    id: "ApexClass:BillingService",
    type: "ApexClass",
    name: "BillingService",
    parsed: { name: "BillingService", type: "ApexClass", soql: [{ object: "Billing__c" }], dml: [{ operation: "insert" }] }
  };

  const billingManager = {
    id: "ApexClass:BillingManager",
    type: "ApexClass",
    name: "BillingManager",
    parsed: { name: "BillingManager", type: "ApexClass", soql: [{ object: "Billing__c" }], dml: [{ operation: "update" }] }
  };

  const mockGraph2 = {
    edges: [
      { from: "ApexClass:BillingService", to: "ApexClass:BillingHelper" },
      { from: "ApexClass:BillingManager", to: "ApexClass:BillingHelper" },
      { from: "ApexClass:BillingService", to: "ApexClass:TaxCalculator" },
      { from: "ApexClass:BillingManager", to: "ApexClass:TaxCalculator" },
      { from: "ApexClass:OrderController", to: "ApexClass:BillingService" },
      { from: "ApexClass:OrderController", to: "ApexClass:BillingManager" }
    ]
  };

  const compResult5 = compareTwoComponentsForDuplication(billingService, billingManager, mockGraph2, {
    symbols: [billingService, billingManager]
  });

  assert.strictEqual(compResult5.classification, "STRONG_OVERLAP");
  assert.ok(compResult5.evidence.some(e => e.rule === "same-architectural-domain"));
  assert.ok(compResult5.evidence.some(e => e.rule === "overlapping-dependencies"));
  assert.ok(compResult5.evidence.some(e => e.rule === "overlapping-consumers"));
  console.log("  ✓ Test 5 PASSED (High degree of overlapping architectural signals produces STRONG_OVERLAP)");

  // -------------------------------------------------------------
  // Test 6: Unknown information
  // -------------------------------------------------------------
  console.log("Test 6: Unknown information...");
  const unknownResult = detectComponentDuplicateResponsibility(null);
  assert.strictEqual(unknownResult.classification, "UNKNOWN");
  assert.strictEqual(unknownResult.confidence, "unknown");

  const unparsedSymbol = { id: "ApexClass:Unparsed", name: "Unparsed" };
  const unparsedResult = detectComponentDuplicateResponsibility(unparsedSymbol, { symbols: [unparsedSymbol] });
  assert.strictEqual(unparsedResult.classification, "UNKNOWN");
  console.log("  ✓ Test 6 PASSED (Null/unparsed symbols yield UNKNOWN classification)");

  // -------------------------------------------------------------
  // Test 7: Boundary separation (Entry point controllers for different boundaries)
  // -------------------------------------------------------------
  console.log("Test 7: Boundary separation (RestResource vs LWC AuraEnabled)...");
  const restApi = {
    id: "ApexClass:RestApiEndpoint",
    type: "ApexClass",
    name: "RestApiEndpoint",
    parsed: { name: "RestApiEndpoint", type: "ApexClass", annotations: ["RestResource", "HttpGet"] }
  };

  const lwcController = {
    id: "ApexClass:LwcUiController",
    type: "ApexClass",
    name: "LwcUiController",
    parsed: { name: "LwcUiController", type: "ApexClass", methods: [{ isAuraEnabled: true, name: "fetchUiData" }] }
  };

  const compResult7 = compareTwoComponentsForDuplication(restApi, lwcController, null, {
    symbols: [restApi, lwcController]
  });

  assert.strictEqual(compResult7.classification, "NO_DUPLICATION_SIGNAL");
  assert.ok(compResult7.evidence.some(e => e.rule === "distinct-entry-boundaries"));
  console.log("  ✓ Test 7 PASSED (Controllers serving distinct entry-point boundaries recognized as distinct)");

  // -------------------------------------------------------------
  // Test 8: Deterministic repeatability (100% stable)
  // -------------------------------------------------------------
  console.log("Test 8: Deterministic repeatability...");
  const run1 = JSON.stringify(detectComponentDuplicateResponsibility(billingService, { symbols: [billingService, billingManager] }, mockGraph2));
  for (let i = 0; i < 10; i++) {
    const runN = JSON.stringify(detectComponentDuplicateResponsibility(billingService, { symbols: [billingService, billingManager] }, mockGraph2));
    assert.strictEqual(runN, run1, `Run ${i + 1} produced different output from run 1`);
  }
  console.log("  ✓ Test 8 PASSED (100% deterministic repeatability verified across 10 runs)");

  // -------------------------------------------------------------
  // Test 9: Authority preservation
  // -------------------------------------------------------------
  console.log("Test 9: Authority preservation...");
  const deterministicFact = "NO_DUPLICATION_SIGNAL";
  const conflictingLlmClaim = "STRONG_OVERLAP";
  const authorityCheck = enforceDeterministicAuthority(deterministicFact, conflictingLlmClaim);

  assert.strictEqual(authorityCheck.authoritativeValue, "NO_DUPLICATION_SIGNAL");
  assert.strictEqual(authorityCheck.contradiction, true);
  assert.ok(authorityCheck.message.includes("Deterministic fact retained"));
  console.log("  ✓ Test 9 PASSED (Deterministic authority preserved over conflicting claims)");

  // -------------------------------------------------------------
  // Test 10: Zero LLM calls verification
  // -------------------------------------------------------------
  console.log("Test 10: Zero LLM calls verification...");
  const moduleCode = fs.readFileSync(path.join(ROOT_DIR, "duplicate-responsibility.cjs"), "utf8");
  assert.ok(!moduleCode.includes("LlmClient"), "duplicate-responsibility.cjs must not import LlmClient");
  assert.ok(!moduleCode.includes("CacheManager"), "duplicate-responsibility.cjs must not import CacheManager");
  assert.ok(!moduleCode.includes("semantic-investigation-service"), "duplicate-responsibility.cjs must not import semantic-investigation-service");
  assert.ok(!moduleCode.includes("fetch("), "duplicate-responsibility.cjs must not issue HTTP requests");
  console.log("  ✓ Test 10 PASSED (0 LLM imports or runtime dependencies verified in duplicate-responsibility.cjs)");

  console.log("\nALL 10 DUPLICATE ARCHITECTURAL RESPONSIBILITY TESTS PASSED SUCCESSFULLY!");
}

if (require.main === module) {
  runDuplicateResponsibilityTests();
}

module.exports = { runDuplicateResponsibilityTests };
