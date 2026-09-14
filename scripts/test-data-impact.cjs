/**
 * Capability & Unit Test Suite for Deterministic Data / Object Impact Analysis (Prompt 25)
 *
 * Tests:
 *  - read (SOQL / queries)
 *  - write (DML insert, update, delete, upsert, etc.)
 *  - multiple objects
 *  - transitive impact
 *  - no object
 *  - duplicate object references
 *  - operation preservation
 *  - evidence structure & contract compliance
 *  - repeatability
 *  - zero LLM calls
 *  - regression (integration with dependency-analyzer)
 */

"use strict";

const assert = require("assert");
const path = require("path");
const fs = require("fs");

const {
  collectDirectObjectOperations,
  analyzeComponentDataImpact,
  analyzeAllDataImpact
} = require("../data-impact.cjs");

const {
  validateDeterministicResult
} = require("../deterministic/contract.cjs");

console.log("Running Deterministic Salesforce Data / Object Impact Test Suite (Prompt 25)...");
console.log("==========================================================================");

// Mock symbols and graph setup
const mockAccount = {
  id: "ApexClass:AccountService",
  name: "AccountService",
  type: "ApexClass",
  file: "force-app/main/default/classes/AccountService.cls",
  parsed: {
    name: "AccountService",
    soql: [
      { object: "Account", line: 12, evidence: "SOQL FROM Account" },
      { object: "Contact", line: 20, evidence: "SOQL FROM Contact" }
    ],
    dml: [
      { operation: "update", object: "Account", line: 25, methodOwner: "updateAccounts" },
      { operation: "insert", variable: "contacts", line: 30, methodOwner: "createContacts" }
    ],
    objects: ["Account", "Contact"],
    fields: [
      { object: "Account", field: "Name", line: 12 },
      { object: "Contact", field: "Email", line: 20 }
    ]
  }
};

const mockOrderRepo = {
  id: "ApexClass:OrderRepository",
  name: "OrderRepository",
  type: "ApexClass",
  file: "force-app/main/default/classes/OrderRepository.cls",
  parsed: {
    name: "OrderRepository",
    soql: [
      { object: "Order", line: 15, evidence: "SOQL FROM Order" }
    ],
    dml: [
      { operation: "insert", object: "Order", line: 22, methodOwner: "saveOrder" },
      { operation: "delete", object: "OrderItem", line: 40, methodOwner: "deleteItems" }
    ],
    objects: ["Order", "OrderItem"],
    fields: [{ object: "Order", field: "Status", line: 15 }]
  }
};

const mockController = {
  id: "ApexClass:OrderController",
  name: "OrderController",
  type: "ApexClass",
  file: "force-app/main/default/classes/OrderController.cls",
  parsed: {
    name: "OrderController",
    methods: [{ name: "processOrder" }],
    dependencies: [
      { toName: "OrderRepository", type: "method-call", method: "saveOrder" }
    ]
  }
};

const mockNoDataObject = {
  id: "ApexClass:StringUtil",
  name: "StringUtil",
  type: "ApexClass",
  file: "force-app/main/default/classes/StringUtil.cls",
  parsed: {
    name: "StringUtil",
    soql: [],
    dml: [],
    objects: [],
    fields: []
  }
};

const mockRegistry = {
  symbols: [mockAccount, mockOrderRepo, mockController, mockNoDataObject]
};

const mockGraph = {
  nodes: [
    { id: mockAccount.id, name: mockAccount.name },
    { id: mockOrderRepo.id, name: mockOrderRepo.name },
    { id: mockController.id, name: mockController.name },
    { id: mockNoDataObject.id, name: mockNoDataObject.name }
  ],
  edges: [
    {
      from: mockController.id,
      to: mockOrderRepo.id,
      type: "method-call",
      method: "saveOrder"
    }
  ]
};

// 1. Read Operations Test
console.log("Test 1: Read operation analysis (SOQL / queries)...");
{
  const result = analyzeComponentDataImpact(mockAccount, mockGraph, mockRegistry);
  assert.ok(validateDeterministicResult(result), "Result must comply with deterministic result contract");
  assert.strictEqual(result.confidence, "high");

  const objects = result.metadata.objects;
  const accObj = objects.find(o => o.name === "Account");
  assert.ok(accObj, "Account object must be present in impact");
  assert.ok(accObj.operations.includes("read"), "Account impact must include 'read' operation");
  assert.ok(accObj.operations.includes("update"), "Account impact must include 'update' operation");
  console.log("  ✓ Test 1 PASSED (Read operation correctly detected)");
}

// 2. Write Operations Test (insert, update, delete, upsert)
console.log("Test 2: Write operations analysis (DML insert, update, delete)...");
{
  const result = analyzeComponentDataImpact(mockOrderRepo, mockGraph, mockRegistry);
  assert.ok(validateDeterministicResult(result), "Result must comply with contract");

  const objects = result.metadata.objects;
  const orderObj = objects.find(o => o.name === "Order");
  const itemObj = objects.find(o => o.name === "OrderItem");

  assert.ok(orderObj.operations.includes("read"), "Order must have 'read'");
  assert.ok(orderObj.operations.includes("insert"), "Order must have 'insert'");
  assert.ok(itemObj.operations.includes("delete"), "OrderItem must have 'delete'");
  console.log("  ✓ Test 2 PASSED (Write operations insert & delete correctly detected)");
}

// 3. Multiple Objects Test
console.log("Test 3: Multiple objects impact detection...");
{
  const result = analyzeComponentDataImpact(mockAccount, mockGraph, mockRegistry);
  const objectNames = result.metadata.objects.map(o => o.name);
  assert.deepStrictEqual(objectNames, ["Account", "Contact"], "Multiple objects must be sorted and detected");
  console.log("  ✓ Test 3 PASSED (Multiple objects detected & sorted)");
}

// 4. Transitive Impact Test
console.log("Test 4: Transitive data impact propagation through dependencies...");
{
  const result = analyzeComponentDataImpact(mockController, mockGraph, mockRegistry);
  assert.ok(validateDeterministicResult(result), "Result must comply with contract");

  const objects = result.metadata.objects;
  assert.ok(objects.some(o => o.name === "Order"), "Order object must propagate transitively to OrderController");
  assert.ok(objects.some(o => o.name === "OrderItem"), "OrderItem object must propagate transitively to OrderController");

  const orderObj = objects.find(o => o.name === "Order");
  assert.ok(
    orderObj.evidence.some(e => e.rule === "transitive-data-impact" && e.detail.includes("OrderController -> OrderRepository")),
    "Evidence must record transitive dependency chain"
  );
  console.log("  ✓ Test 4 PASSED (Transitive object impact correctly propagated)");
}

// 5. No Object Test
console.log("Test 5: Component with no data impact...");
{
  const result = analyzeComponentDataImpact(mockNoDataObject, mockGraph, mockRegistry);
  assert.ok(validateDeterministicResult(result), "Result must comply with contract");
  assert.strictEqual(result.primary, "no-object-impact");
  assert.strictEqual(result.confidence, "unknown");
  assert.strictEqual(result.metadata.objects.length, 0, "Objects array must be empty");
  console.log("  ✓ Test 5 PASSED (Zero data impact component handled cleanly)");
}

// 6. Duplicate Object References & Deduplication
console.log("Test 6: Duplicate object references deduplication...");
{
  const duplicateSymbol = {
    id: "ApexClass:DupClass",
    name: "DupClass",
    type: "ApexClass",
    parsed: {
      soql: [{ object: "Account" }, { object: "Account" }],
      objects: ["Account", "Account"],
      fields: [{ object: "Account", field: "Name" }, { object: "Account", field: "Phone" }]
    }
  };
  const result = analyzeComponentDataImpact(duplicateSymbol, null, null);
  assert.strictEqual(result.metadata.objects.length, 1, "Duplicate object names must be merged to a single entry");
  assert.strictEqual(result.metadata.objects[0].name, "Account");
  console.log("  ✓ Test 6 PASSED (Duplicate object references deduplicated)");
}

// 7. Operation Preservation
console.log("Test 7: Operation preservation & precedence ordering...");
{
  const opsMap = collectDirectObjectOperations(mockAccount);
  const accOps = Array.from(opsMap.get("Account").operations);
  assert.ok(accOps.includes("read"), "Operations must preserve 'read'");
  assert.ok(accOps.includes("update"), "Operations must preserve 'update'");
  console.log("  ✓ Test 7 PASSED (Operations preserved without loss)");
}

// 8. Evidence Structure Contract Compliance
console.log("Test 8: Evidence structure contract compliance...");
{
  const result = analyzeComponentDataImpact(mockAccount, mockGraph, mockRegistry);
  assert.ok(Array.isArray(result.evidence), "Evidence must be an array");
  for (const item of result.evidence) {
    assert.strictEqual(typeof item.rule, "string", "Evidence item rule must be non-empty string");
    assert.ok(item.rule.length > 0, "Evidence item rule must be non-empty");
    assert.strictEqual(typeof item.detail, "string", "Evidence item detail must be string");
  }
  console.log("  ✓ Test 8 PASSED (Evidence structure compliant with BASE-ARCH-1)");
}

// 9. Repeatability
console.log("Test 9: Deterministic repeatability...");
{
  const run1 = JSON.stringify(analyzeComponentDataImpact(mockAccount, mockGraph, mockRegistry));
  const run2 = JSON.stringify(analyzeComponentDataImpact(mockAccount, mockGraph, mockRegistry));
  assert.strictEqual(run1, run2, "Repeated analysis must produce 100% identical JSON outputs");
  console.log("  ✓ Test 9 PASSED (Identical output across runs verified)");
}

// 10. Zero LLM Calls Verification
console.log("Test 10: Zero LLM runtime dependencies verification...");
{
  const fileContent = fs.readFileSync(path.join(__dirname, "../data-impact.cjs"), "utf8");
  assert.strictEqual(fileContent.includes("LlmClient"), false, "Must not import LlmClient");
  assert.strictEqual(fileContent.includes("CacheManager"), false, "Must not import CacheManager");
  assert.strictEqual(fileContent.includes("semantic-investigation-service"), false, "Must not import semantic-investigation-service");
  console.log("  ✓ Test 10 PASSED (0 LLM imports or runtime dependencies in data-impact.cjs)");
}

// 11. Regression Check: Full Dependency Analyzer Integration
console.log("Test 11: Regression check with core analyzer integration...");
{
  const { buildComponentIntelligence } = require("../dependency-analyzer.cjs");
  const fullIntel = buildComponentIntelligence(mockAccount, {
    graph: mockGraph,
    registry: mockRegistry,
    metricList: [],
    cycles: []
  });

  assert.ok(fullIntel.dataImpact, "Component intelligence must contain 'dataImpact' field");
  assert.ok(validateDeterministicResult(fullIntel.dataImpact), "dataImpact in 01-CONTEXT.json must pass contract validation");
  assert.ok(fullIntel.data, "Existing 'data' facts object must remain intact and unmodified");
  console.log("  ✓ Test 11 PASSED (Integrated into buildComponentIntelligence without overwriting existing facts)");
}

console.log("");
console.log("ALL 11 DETERMINISTIC DATA IMPACT TESTS PASSED SUCCESSFULLY!");
