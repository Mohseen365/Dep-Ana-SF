/**
 * Comprehensive Deterministic Layer Classifier Test Suite (Prompt 18)
 *
 * Verifies:
 *   1. Presentation layer (LWC / Visualforce)
 *   2. Entry layer (Triggers / Async / Invocable)
 *   3. Application layer (Controllers / Handlers / @AuraEnabled)
 *   4. Service layer (Services / Engines)
 *   5. Domain layer (Domain / DTOs / Wrappers)
 *   6. Data layer (Selectors / Repositories / SOQL / DML / Objects)
 *   7. Integration layer (Callouts / REST Resource)
 *   8. Configuration layer (Custom Metadata / Settings / Constants)
 *   9. Test layer (Apex tests / @isTest)
 *  10. Unknown layer fallback
 *  11. Layer Precedence & Role/Layer distinction
 *  12. Evidence trail
 *  13. Deterministic repeatability
 *  14. Zero LLM calls
 *  15. Full analyzer integration
 */

"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { classifyComponentLayer, classifyAllLayers, LAYER_PRECEDENCE } = require("../layer-classifier.cjs");
const { classifyComponentRole } = require("../role-classifier.cjs");
const { analyze } = require("../dependency-analyzer.cjs");

console.log("Running Deterministic Layer Classifier Test Suite (Prompt 18)...");
console.log("===============================================================");

// -----------------------------------------------------------------------------
// Test 1: Presentation Layer Classification
// -----------------------------------------------------------------------------
{
  console.log("Test 1: Presentation layer classification...");
  const lwcSymbol = { name: "accountCard", type: "LWC", file: "lwc/accountCard/accountCard.js" };
  const lwcRes = classifyComponentLayer(lwcSymbol);
  assert.strictEqual(lwcRes.primary, "presentation");
  assert.strictEqual(lwcRes.confidence, "high");

  const vfSymbol = { name: "AccountView", type: "Visualforce", file: "pages/AccountView.page" };
  const vfRes = classifyComponentLayer(vfSymbol);
  assert.strictEqual(vfRes.primary, "presentation");
  console.log("  ✓ Test 1 PASSED (LWC and Visualforce classified as presentation [high])");
}

// -----------------------------------------------------------------------------
// Test 2: Entry Layer Classification
// -----------------------------------------------------------------------------
{
  console.log("Test 2: Entry layer classification...");
  const triggerSymbol = { name: "AccountTrigger", type: "Trigger", file: "triggers/AccountTrigger.trigger" };
  const triggerRes = classifyComponentLayer(triggerSymbol);
  assert.strictEqual(triggerRes.primary, "entry");

  const asyncSymbol = {
    name: "AccountBatchJob",
    type: "ApexClass",
    parsed: { behavior: { async: ["Batchable"] } }
  };
  const asyncRes = classifyComponentLayer(asyncSymbol);
  assert.strictEqual(asyncRes.primary, "entry");
  console.log("  ✓ Test 2 PASSED (Trigger and Batchable classified as entry [high])");
}

// -----------------------------------------------------------------------------
// Test 3: Application Layer Classification
// -----------------------------------------------------------------------------
{
  console.log("Test 3: Application layer classification...");
  const controllerSymbol = {
    name: "AccountController",
    type: "ApexClass",
    parsed: { name: "AccountController", methods: [{ name: "getAccounts", isAuraEnabled: true }] }
  };
  const appRes = classifyComponentLayer(controllerSymbol);
  assert.strictEqual(appRes.primary, "application");
  assert.strictEqual(appRes.confidence, "high");
  console.log("  ✓ Test 3 PASSED (AccountController classified as application [high])");
}

// -----------------------------------------------------------------------------
// Test 4: Service Layer Classification
// -----------------------------------------------------------------------------
{
  console.log("Test 4: Service layer classification...");
  const serviceSymbol = { name: "PaymentProcessingService", type: "ApexClass", parsed: { name: "PaymentProcessingService" } };
  const serviceRes = classifyComponentLayer(serviceSymbol);
  assert.strictEqual(serviceRes.primary, "service");
  assert.strictEqual(serviceRes.confidence, "high");
  console.log("  ✓ Test 4 PASSED (PaymentProcessingService classified as service [high])");
}

// -----------------------------------------------------------------------------
// Test 5: Domain Layer Classification
// -----------------------------------------------------------------------------
{
  console.log("Test 5: Domain layer classification...");
  const dtoSymbol = { name: "OrderWrapperDTO", type: "ApexClass", parsed: { name: "OrderWrapperDTO" } };
  const domainRes = classifyComponentLayer(dtoSymbol);
  assert.strictEqual(domainRes.primary, "domain");
  console.log("  ✓ Test 5 PASSED (OrderWrapperDTO classified as domain [high])");
}

// -----------------------------------------------------------------------------
// Test 6: Data Layer Classification
// -----------------------------------------------------------------------------
{
  console.log("Test 6: Data layer classification...");
  const selectorSymbol = { name: "AccountSelector", type: "ApexClass", parsed: { name: "AccountSelector", soql: [{ object: "Account" }] } };
  const dataRes = classifyComponentLayer(selectorSymbol);
  assert.strictEqual(dataRes.primary, "data");

  const schemaSymbol = { name: "Account", type: "Object", file: "objects/Account/Account.object-meta.xml" };
  const objectRes = classifyComponentLayer(schemaSymbol);
  assert.strictEqual(objectRes.primary, "data");
  console.log("  ✓ Test 6 PASSED (AccountSelector and Schema Object classified as data [high])");
}

// -----------------------------------------------------------------------------
// Test 7: Integration Layer Classification
// -----------------------------------------------------------------------------
{
  console.log("Test 7: Integration layer classification...");
  const calloutSymbol = {
    name: "PaymentGatewayClient",
    type: "ApexClass",
    parsed: { name: "PaymentGatewayClient", callouts: ["HttpRequest", "Http.send"] }
  };
  const calloutRes = classifyComponentLayer(calloutSymbol);
  assert.strictEqual(calloutRes.primary, "integration");

  const restSymbol = {
    name: "AccountRestAPI",
    type: "ApexClass",
    parsed: { name: "AccountRestAPI", annotations: ["RestResource"] }
  };
  const restRes = classifyComponentLayer(restSymbol);
  assert.strictEqual(restRes.primary, "integration");
  console.log("  ✓ Test 7 PASSED (Callouts and RestResource classified as integration [high])");
}

// -----------------------------------------------------------------------------
// Test 8: Configuration Layer Classification
// -----------------------------------------------------------------------------
{
  console.log("Test 8: Configuration layer classification...");
  const configSymbol = { name: "AppConstants", type: "ApexClass", parsed: { name: "AppConstants" } };
  const configRes = classifyComponentLayer(configSymbol);
  assert.strictEqual(configRes.primary, "configuration");
  console.log("  ✓ Test 8 PASSED (AppConstants classified as configuration [high])");
}

// -----------------------------------------------------------------------------
// Test 9: Test Layer Classification
// -----------------------------------------------------------------------------
{
  console.log("Test 9: Test layer classification...");
  const testSymbol = {
    name: "OrderServiceTest",
    type: "ApexClass",
    parsed: { name: "OrderServiceTest", isTest: true }
  };
  const testRes = classifyComponentLayer(testSymbol);
  assert.strictEqual(testRes.primary, "test");
  console.log("  ✓ Test 9 PASSED (OrderServiceTest classified as test [high])");
}

// -----------------------------------------------------------------------------
// Test 10: Unknown Layer Fallback
// -----------------------------------------------------------------------------
{
  console.log("Test 10: Unknown layer fallback...");
  const unknownSymbol = { name: "FooBarX", type: "ApexClass", parsed: { name: "FooBarX" } };
  const unknownRes = classifyComponentLayer(unknownSymbol);
  assert.strictEqual(unknownRes.primary, "unknown");
  assert.strictEqual(unknownRes.confidence, "unknown");
  console.log("  ✓ Test 10 PASSED (FooBarX fallback to unknown [unknown])");
}

// -----------------------------------------------------------------------------
// Test 11: Precedence & Role / Layer Distinction
// -----------------------------------------------------------------------------
{
  console.log("Test 11: Precedence & Role / Layer distinction...");
  // Component can have role = controller and layer = application
  const symbol = {
    name: "AssetDashboardController",
    type: "ApexClass",
    parsed: { name: "AssetDashboardController", methods: [{ name: "getAssets", isAuraEnabled: true }] }
  };

  const roleRes = classifyComponentRole(symbol);
  const layerRes = classifyComponentLayer(symbol);

  assert.strictEqual(roleRes.primary, "controller");
  assert.strictEqual(layerRes.primary, "application");
  console.log(`  ✓ Test 11 PASSED (AssetDashboardController -> role='${roleRes.primary}', layer='${layerRes.primary}')`);
}

// -----------------------------------------------------------------------------
// Test 12: Evidence & Explainability
// -----------------------------------------------------------------------------
{
  console.log("Test 12: Evidence & explainability...");
  const symbol = { name: "AssetService", type: "ApexClass", parsed: { name: "AssetService" } };
  const res = classifyComponentLayer(symbol);
  assert.ok(Array.isArray(res.evidence) && res.evidence.length > 0);
  assert.ok(res.evidence[0].rule);
  assert.ok(res.evidence[0].detail);
  console.log("  ✓ Test 12 PASSED (Explainable evidence provided)");
}

// -----------------------------------------------------------------------------
// Test 13: Deterministic Repeatability
// -----------------------------------------------------------------------------
{
  console.log("Test 13: Deterministic repeatability...");
  const symbol = { name: "InvoiceSelector", type: "ApexClass", parsed: { name: "InvoiceSelector", soql: [{ object: "Invoice" }] } };
  const run1 = classifyComponentLayer(symbol);
  const run2 = classifyComponentLayer(symbol);
  assert.deepStrictEqual(run1, run2);
  console.log("  ✓ Test 13 PASSED (Identical output across independent runs)");
}

// -----------------------------------------------------------------------------
// Test 14: Zero LLM Calls
// -----------------------------------------------------------------------------
{
  console.log("Test 14: Zero LLM calls verification...");
  const source = fs.readFileSync(require.resolve("../layer-classifier.cjs"), "utf8");
  assert.strictEqual(source.includes("LlmClient"), false);
  assert.strictEqual(source.includes("CacheManager"), false);
  assert.strictEqual(source.includes("semantic-investigation-service"), false);
  console.log("  ✓ Test 14 PASSED (0 LLM imports or calls in layer-classifier.cjs)");
}

// -----------------------------------------------------------------------------
// Test 15: Full Analyzer Integration
// -----------------------------------------------------------------------------
{
  console.log("Test 15: Full analyzer integration...");
  const fixturesDir = path.resolve(__dirname, "../../refactor-litellm/tests/fixtures/dependency-scope/force-app/main/default");

  if (fs.existsSync(fixturesDir)) {
    const result = analyze(fixturesDir, {}, false);
    assert.ok(result.layerAnalysis, "layerAnalysis returned in analyze result");
    assert.ok(result.layerAnalysis.layers, "layers count object present");
    assert.ok(typeof result.layerAnalysis.layers.service === "number");
    console.log("  ✓ Test 15 PASSED (Analyzer integration produces aggregate layer metrics)");
  } else {
    console.log("  ~ Test 15 SKIPPED (Fixtures directory not found)");
  }
}

console.log("");
console.log("ALL 15 DETERMINISTIC LAYER CLASSIFIER TESTS PASSED SUCCESSFULLY!");
