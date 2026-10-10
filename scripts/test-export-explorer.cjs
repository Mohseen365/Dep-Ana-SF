#!/usr/bin/env node
/**
 * Hardened Test Suite for Salesforce Architecture Explorer Data Adapter
 *
 * Covers 12 core validation invariants, graph preservation equivalence, and
 * end-to-end integration against a realistic multi-component Salesforce org fixture.
 */

const fs = require("fs");
const path = require("path");
const assert = require("assert");
const { exportExplorerData, normalizeNodeId, normalizeNodeType, normalizeTestCoverageStatus, normalizeSourcePath } = require("./export-explorer.cjs");

const FIXTURE_DIR = path.join(__dirname, "../temp-test-fixture-realistic");
const ANALYZE_OUT_DIR = path.join(FIXTURE_DIR, "analyze");
const EXPLORER_OUT_FILE = path.join(ANALYZE_OUT_DIR, "explorer-data.json");

/**
 * Creates a representative, multi-component realistic Salesforce metadata fixture.
 * Components included:
 *  - Apex Classes (Service, Helper, Controller, Test)
 *  - Apex Triggers
 *  - LWC components (JS/HTML)
 *  - Visualforce pages
 *  - Custom Objects & Fields
 *  - Circular dependencies (ServiceA <-> ServiceB)
 *  - Unresolved external references (e.g. NonExistentClass)
 */
function setupRealisticFixture() {
  if (fs.existsSync(FIXTURE_DIR)) {
    fs.rmSync(FIXTURE_DIR, { recursive: true, force: true });
  }

  // Directory structure
  fs.mkdirSync(path.join(FIXTURE_DIR, "classes"), { recursive: true });
  fs.mkdirSync(path.join(FIXTURE_DIR, "triggers"), { recursive: true });
  fs.mkdirSync(path.join(FIXTURE_DIR, "lwc/assetCard"), { recursive: true });
  fs.mkdirSync(path.join(FIXTURE_DIR, "pages"), { recursive: true });
  fs.mkdirSync(path.join(FIXTURE_DIR, "objects/Asset__c/fields"), { recursive: true });

  // 1. Apex Classes
  fs.writeFileSync(
    path.join(FIXTURE_DIR, "classes/AssetService.cls"),
    `public with sharing class AssetService {
      public static void processAssets() {
        AssetHelper.calculate();
        NonExistentClass.doMagic();
        List<Asset__c> assets = [SELECT Id, Status__c FROM Asset__c];
      }
    }`
  );

  fs.writeFileSync(
    path.join(FIXTURE_DIR, "classes/AssetHelper.cls"),
    `public with sharing class AssetHelper {
      public static void calculate() {
        AssetService.processAssets();
      }
    }`
  );

  fs.writeFileSync(
    path.join(FIXTURE_DIR, "classes/AssetController.cls"),
    `public with sharing class AssetController {
      @AuraEnabled
      public static void handleRequest() {
        AssetService.processAssets();
      }
    }`
  );

  fs.writeFileSync(
    path.join(FIXTURE_DIR, "classes/AssetServiceTest.cls"),
    `@isTest
    public class AssetServiceTest {
      @isTest
      static void testProcess() {
        AssetService.processAssets();
      }
    }`
  );

  // 2. Apex Trigger
  fs.writeFileSync(
    path.join(FIXTURE_DIR, "triggers/AssetTrigger.trigger"),
    `trigger AssetTrigger on Asset__c (before insert) {
      AssetService.processAssets();
    }`
  );

  // 3. LWC Component
  fs.writeFileSync(
    path.join(FIXTURE_DIR, "lwc/assetCard/assetCard.js"),
    `import { LightningElement, api } from 'lwc';
    import handleRequest from '@salesforce/apex/AssetController.handleRequest';

    export default class AssetCard extends LightningElement {
      @api recordId;
      connectedCallback() {
        handleRequest();
      }
    }`
  );

  fs.writeFileSync(
    path.join(FIXTURE_DIR, "lwc/assetCard/assetCard.html"),
    `<template>
      <div>Asset Card Template</div>
    </template>`
  );

  // 4. Visualforce Page
  fs.writeFileSync(
    path.join(FIXTURE_DIR, "pages/AssetDashboard.page"),
    `<apex:page controller="AssetController">
      <h1>Asset Dashboard</h1>
    </apex:page>`
  );

  // 5. Custom Object & Field
  fs.writeFileSync(
    path.join(FIXTURE_DIR, "objects/Asset__c/Asset__c.object-meta.xml"),
    `<?xml version="1.0" encoding="UTF-8"?>
    <CustomObject xmlns="http://soap.sforce.com/2006/04/metadata">
        <label>Asset</label>
        <sharingModel>ReadWrite</sharingModel>
    </CustomObject>`
  );

  fs.writeFileSync(
    path.join(FIXTURE_DIR, "objects/Asset__c/fields/Status__c.field-meta.xml"),
    `<?xml version="1.0" encoding="UTF-8"?>
    <CustomField xmlns="http://soap.sforce.com/2006/04/metadata">
        <fullName>Status__c</fullName>
        <type>Text</type>
    </CustomField>`
  );
}

function cleanupFixture() {
  if (fs.existsSync(FIXTURE_DIR)) {
    fs.rmSync(FIXTURE_DIR, { recursive: true, force: true });
  }
}

function runTests() {
  console.log("Running Hardened Explorer Data Adapter Validation Suite...");
  console.log("==========================================================");

  setupRealisticFixture();

  try {
    const analyzerPath = path.join(__dirname, "../dependency-analyzer.cjs");
    const { execSync } = require("child_process");

    // Execute analyzer CLI directly to fixture analyze directory
    execSync(`node "${analyzerPath}" analyze "${FIXTURE_DIR}" --output-dir "${ANALYZE_OUT_DIR}"`, { stdio: "ignore" });

    const analyzerReportPath = path.join(ANALYZE_OUT_DIR, "dependency-report.json");
    assert.ok(fs.existsSync(analyzerReportPath), "dependency-report.json must exist in fixture directory");

    const rawAnalyzerReport = JSON.parse(fs.readFileSync(analyzerReportPath, "utf8"));

    // Execute adapter export
    const result = exportExplorerData(ANALYZE_OUT_DIR, EXPLORER_OUT_FILE, { skipManifest: true });
    assert.ok(fs.existsSync(EXPLORER_OUT_FILE), "explorer-data.json output file must exist");

    const data = result.explorerData;

    // VALIDATION 1: Unique stable node IDs
    console.log("Validation 1: Unique stable node IDs");
    const nodeIds = data.nodes.map(n => n.id);
    const uniqueNodeIds = new Set(nodeIds);
    assert.strictEqual(nodeIds.length, uniqueNodeIds.size, "Every node MUST have a unique stable ID");
    console.log(`  ✓ Checked ${nodeIds.length} nodes for unique stable IDs`);

    // VALIDATION 2: Every edge source exists
    console.log("Validation 2: Every edge source exists");
    data.edges.forEach(edge => {
      assert.ok(
        uniqueNodeIds.has(edge.source),
        `Edge source '${edge.source}' does not exist in node list (edge ID: ${edge.id})`
      );
    });
    console.log(`  ✓ Checked ${data.edges.length} edge sources`);

    // VALIDATION 3: Every edge target exists
    console.log("Validation 3: Every edge target exists");
    data.edges.forEach(edge => {
      assert.ok(
        uniqueNodeIds.has(edge.target),
        `Edge target '${edge.target}' does not exist in node list (edge ID: ${edge.id})`
      );
    });
    console.log(`  ✓ Checked ${data.edges.length} edge targets`);

    // VALIDATION 4: Node types are valid & testCoverageStatus is valid
    console.log("Validation 4: Node types and testCoverageStatus are valid");
    const validNodeTypes = new Set([
      "ApexClass",
      "ApexTrigger",
      "LWC",
      "Visualforce",
      "Flow",
      "Object",
      "CustomObject",
      "Field",
      "CustomField",
      "External"
    ]);
    const validTestCoverageStates = new Set([
      "COVERED",
      "NO_TESTS",
      "UNTESTED",
      "AMBIGUOUS"
    ]);
    data.nodes.forEach(node => {
      assert.ok(
        validNodeTypes.has(node.type),
        `Node '${node.id}' has invalid metadata type: ${node.type}`
      );
      const testCov = node.refactoringReadiness?.testCoverageStatus;
      assert.ok(
        validTestCoverageStates.has(testCov),
        `Node '${node.id}' has invalid testCoverageStatus: ${testCov}`
      );
      assert.notStrictEqual(testCov, "LIKELY_COVERED", "testCoverageStatus must not be LIKELY_COVERED");
      assert.notStrictEqual(testCov, "KNOWN_COVERAGE_FAILURE", "testCoverageStatus must not be KNOWN_COVERAGE_FAILURE");
    });
    console.log(`  ✓ Validated all node types and testCoverageStatus enum values`);

    // VALIDATION 5: Edge types & Canonical component types are valid
    console.log("Validation 5: Edge types and canonical component types are valid");
    data.edges.forEach(edge => {
      assert.strictEqual(typeof edge.relationshipType, "string");
      assert.ok(edge.relationshipType.length > 0, `Edge '${edge.id}' must have a non-empty relationshipType`);
      if (edge.canonical) {
        assert.ok(
          validNodeTypes.has(edge.canonical.source.type),
          `Edge '${edge.id}' canonical source type invalid: ${edge.canonical.source.type}`
        );
        assert.ok(
          validNodeTypes.has(edge.canonical.target.type),
          `Edge '${edge.id}' canonical target type invalid: ${edge.canonical.target.type}`
        );
      }
    });
    console.log(`  ✓ Validated all edge relationship types and canonical component types`);

    // VALIDATION 6: Risk values are valid
    console.log("Validation 6: Risk values are valid");
    const validRiskLevels = new Set(["HIGH", "MEDIUM", "LOW"]);
    data.nodes.forEach(node => {
      assert.ok(
        validRiskLevels.has(node.risk),
        `Node '${node.id}' has invalid risk level: ${node.risk}`
      );
    });
    console.log(`  ✓ Validated all risk values`);

    // VALIDATION 7: Metrics are not corrupted
    console.log("Validation 7: Metrics are not corrupted");
    data.nodes.forEach(node => {
      assert.strictEqual(typeof node.metrics.fanIn, "number", `Node '${node.id}' fanIn must be number`);
      assert.strictEqual(typeof node.metrics.fanOut, "number", `Node '${node.id}' fanOut must be number`);
      assert.strictEqual(typeof node.metrics.coupling, "number", `Node '${node.id}' coupling must be number`);
      assert.strictEqual(typeof node.metrics.unresolved, "number", `Node '${node.id}' unresolved must be number`);
      assert.strictEqual(typeof node.metrics.score, "number", `Node '${node.id}' score must be number`);
      assert.ok(node.metrics.fanIn >= 0, `Node '${node.id}' fanIn must be >= 0`);
      assert.ok(node.metrics.fanOut >= 0, `Node '${node.id}' fanOut must be >= 0`);
      assert.ok(node.metrics.coupling >= 0, `Node '${node.id}' coupling must be >= 0`);
    });
    console.log(`  ✓ Metrics uncorrupted across all nodes`);

    // VALIDATION 8: Cycles reference valid nodes
    console.log("Validation 8: Cycles reference valid nodes");
    data.cycles.forEach(cycle => {
      assert.ok(cycle.size > 0, "Cycle size must be > 0");
      cycle.nodes.forEach(nodeId => {
        assert.ok(
          uniqueNodeIds.has(nodeId),
          `Cycle '${cycle.id}' references non-existent node '${nodeId}'`
        );
      });
    });
    console.log(`  ✓ Verified ${data.cycles.length} cycles reference valid nodes`);

    // VALIDATION 9: Unresolved references remain distinguishable from resolved relationships
    console.log("Validation 9: Unresolved references remain distinguishable");
    data.unresolvedReferences.forEach(unres => {
      const edge = data.edges.find(e => e.id === unres.edgeId);
      assert.ok(edge, `Unresolved reference edge '${unres.edgeId}' must exist in edge list`);
      assert.strictEqual(edge.unresolved, true, `Edge '${unres.edgeId}' must have unresolved flag = true`);
      assert.strictEqual(edge.target.startsWith("External:"), true, `Unresolved target '${edge.target}' must start with External: prefix`);
    });
    console.log(`  ✓ Verified ${data.unresolvedReferences.length} unresolved references distinguishable`);

    // VALIDATION 10: Evidence is preserved
    console.log("Validation 10: Evidence is preserved");
    const evidenceEdges = data.edges.filter(e => e.evidence && e.evidence.length > 0);
    assert.ok(evidenceEdges.length > 0, "At least some edges must preserve code evidence");
    evidenceEdges.forEach(e => {
      assert.strictEqual(typeof e.evidence, "string");
    });
    console.log(`  ✓ Verified evidence preserved in ${evidenceEdges.length} edges`);

    // VALIDATION 11: Analyzer version and schema version are present
    console.log("Validation 11: Analyzer version and schema version present");
    assert.strictEqual(data.schemaVersion, "1.0.0");
    assert.ok(data.analyzerVersion, "analyzerVersion must be present");
    assert.ok(data.generatedAt, "generatedAt timestamp must be present");
    console.log(`  ✓ Versions present: schemaVersion=${data.schemaVersion}, analyzerVersion=${data.analyzerVersion}`);

    // VALIDATION 12: Adapter output is deterministic for the same input
    console.log("Validation 12: Adapter output is deterministic for identical input");
    const run1JSON = JSON.stringify(data);
    const run2Result = exportExplorerData(ANALYZE_OUT_DIR, EXPLORER_OUT_FILE, { skipManifest: true });
    const run2JSON = JSON.stringify(run2Result.explorerData);
    assert.strictEqual(run1JSON, run2JSON, "Adapter output MUST be 100% byte-for-byte deterministic");
    console.log(`  ✓ Determinism verified`);

    // GRAPH EQUIVALENCE COMPARISON (Analyzer Output vs Explorer Output)
    console.log("\nGraph Equivalence Comparison: Analyzer Output vs Explorer Output");
    console.log("---------------------------------------------------------------");

    const assetServiceRawNode = rawAnalyzerReport.nodes.find(n => n.name === "AssetService" || n.id === "ApexClass:AssetService");
    const assetServiceExplorerNode = data.nodes.find(n => n.displayName === "AssetService" || n.id === "ApexClass:AssetService");

    assert.ok(assetServiceRawNode, "AssetService must exist in raw analyzer nodes");
    assert.ok(assetServiceExplorerNode, "AssetService must exist in Explorer nodes");

    // Outbound relationships from AssetService in analyzer report
    const rawOutbound = rawAnalyzerReport.edges.filter(e => e.from === assetServiceRawNode.id || e.from === "ApexClass:AssetService");
    const explorerOutbound = data.edges.filter(e => e.source === assetServiceExplorerNode.id);

    assert.strictEqual(
      rawOutbound.length,
      explorerOutbound.length,
      `Outbound edge count for AssetService must match (Analyzer: ${rawOutbound.length}, Explorer: ${explorerOutbound.length})`
    );

    // Verify key relationships preserved:
    // 1. AssetService -> AssetHelper (method-call)
    const helperEdge = explorerOutbound.find(e => e.target.includes("AssetHelper"));
    assert.ok(helperEdge, "AssetService -> AssetHelper relationship must be preserved in Explorer");
    assert.strictEqual(helperEdge.relationshipType, "method-call");
    assert.strictEqual(helperEdge.unresolved, false);

    // 2. AssetService -> NonExistentClass (unresolved external instantiation/type-reference)
    const externalEdge = explorerOutbound.find(e => e.target.includes("NonExistentClass"));
    assert.ok(externalEdge, "AssetService -> NonExistentClass unresolved reference must be preserved");
    assert.strictEqual(externalEdge.unresolved, true);

    console.log("  ✓ Component 'AssetService' relationship preservation successfully verified!");
    console.log("\nALL 12 VALIDATION INVARIANTS AND GRAPH COMPARISON CHECKS PASSED!");

  } finally {
    cleanupFixture();
  }
}

function runSpecificRegressionTests() {
  console.log("\nRunning Specific Regression Tests (Test A - D)...");
  console.log("-------------------------------------------------");

  // TEST A: Coverage Mapping
  console.log("Test A: testCoverageStatus mapping");
  assert.strictEqual(normalizeTestCoverageStatus("LIKELY_COVERED"), "COVERED");
  assert.strictEqual(normalizeTestCoverageStatus("likely-covered"), "COVERED");
  assert.strictEqual(normalizeTestCoverageStatus("COVERED"), "COVERED");
  assert.strictEqual(normalizeTestCoverageStatus("covered"), "COVERED");
  assert.strictEqual(normalizeTestCoverageStatus("KNOWN_COVERAGE_FAILURE"), "UNTESTED");
  assert.strictEqual(normalizeTestCoverageStatus("known-coverage-failure"), "UNTESTED");
  assert.strictEqual(normalizeTestCoverageStatus("UNTESTED"), "UNTESTED");
  assert.strictEqual(normalizeTestCoverageStatus("untested"), "UNTESTED");
  assert.strictEqual(normalizeTestCoverageStatus("NO_TESTS"), "NO_TESTS");
  assert.strictEqual(normalizeTestCoverageStatus("no-tests"), "NO_TESTS");
  assert.strictEqual(normalizeTestCoverageStatus("AMBIGUOUS_TEST"), "AMBIGUOUS");
  assert.strictEqual(normalizeTestCoverageStatus("ambiguous-test"), "AMBIGUOUS");
  console.log("  ✓ Test A PASSED: All testCoverageStatus mappings match schema requirement");

  // TEST B: Canonical Edge Types Normalization
  console.log("Test B: Canonical Edge Types Normalization");
  assert.strictEqual(normalizeNodeType("Trigger"), "ApexTrigger");
  assert.strictEqual(normalizeNodeType("Object"), "CustomObject");
  assert.strictEqual(normalizeNodeType("Field"), "CustomField");

  const tempTestDir = path.join(__dirname, "../temp-test-canonical");
  fs.mkdirSync(tempTestDir, { recursive: true });
  try {
    const rawReport = {
      nodes: [
        { id: "ApexTrigger:MyTrigger", name: "MyTrigger", type: "Trigger" },
        { id: "CustomObject:Account", name: "Account", type: "Object" }
      ],
      edges: [
        {
          from: "ApexTrigger:MyTrigger",
          to: "CustomObject:Account",
          type: "trigger-object",
          canonical: {
            source: { type: "Trigger", name: "MyTrigger" },
            target: { type: "Object", name: "Account" }
          }
        }
      ]
    };
    const reportFile = path.join(tempTestDir, "dependency-report.json");
    fs.writeFileSync(reportFile, JSON.stringify(rawReport));

    const exportOut = path.join(tempTestDir, "explorer-data.json");
    const exported = exportExplorerData(tempTestDir, exportOut, { project: "test-canonical-project", skipManifest: true });
    const edge = exported.explorerData.edges[0];
    assert.strictEqual(edge.canonical.source.type, "ApexTrigger", "canonical.source.type must be ApexTrigger");
    assert.strictEqual(edge.canonical.target.type, "CustomObject", "canonical.target.type must be CustomObject");
    console.log("  ✓ Test B PASSED: Raw edge types in canonical.source and canonical.target normalized");
  } finally {
    if (fs.existsSync(tempTestDir)) fs.rmSync(tempTestDir, { recursive: true, force: true });
  }

  // TEST C & D: Public Project Artifact & Multi-Project Isolation
  console.log("Test C & D: Public Project Artifact Synchronization & Multi-Project Isolation");
  const tempProjectDir = path.join(__dirname, "../temp-test-projects");
  const testMoviePublicPath = path.resolve(__dirname, "../explorer/public/projects/test-movie-app");
  const testFoodPublicPath = path.resolve(__dirname, "../explorer/public/projects/test-food-app");
  const publicManifestPath = path.resolve(__dirname, "../explorer/public/project-manifest.json");
  const analyzeManifestPath = path.resolve(__dirname, "../analyze/project-manifest.json");
  const rootManifestPath = path.resolve(__dirname, "../project-manifest.json");

  const origPublicManifest = fs.existsSync(publicManifestPath) ? fs.readFileSync(publicManifestPath, "utf8") : null;
  const origAnalyzeManifest = fs.existsSync(analyzeManifestPath) ? fs.readFileSync(analyzeManifestPath, "utf8") : null;
  const origRootManifest = fs.existsSync(rootManifestPath) ? fs.readFileSync(rootManifestPath, "utf8") : null;

  fs.mkdirSync(tempProjectDir, { recursive: true });
  try {
    const minReport = { nodes: [{ id: "ApexClass:Foo", name: "Foo", type: "ApexClass" }], edges: [] };
    const repFile = path.join(tempProjectDir, "dependency-report.json");
    fs.writeFileSync(repFile, JSON.stringify(minReport));

    const movieOut = path.join(tempProjectDir, "projects", "test-movie-app", "explorer-data.json");
    const foodOut = path.join(tempProjectDir, "projects", "test-food-app", "explorer-data.json");

    exportExplorerData(repFile, movieOut, { project: "test-movie-app", projectName: "Test Movie App" });
    exportExplorerData(repFile, foodOut, { project: "test-food-app", projectName: "Test Food App" });

    const movieFile = path.join(testMoviePublicPath, "explorer-data.json");
    const foodFile = path.join(testFoodPublicPath, "explorer-data.json");

    assert.ok(fs.existsSync(movieFile), "test-movie-app public contract file must exist");
    assert.ok(fs.existsSync(foodFile), "test-food-app public contract file must exist");

    const movieContent = JSON.parse(fs.readFileSync(movieFile, "utf8"));
    const foodContent = JSON.parse(fs.readFileSync(foodFile, "utf8"));

    assert.strictEqual(movieContent.project.id, "test-movie-app");
    assert.strictEqual(foodContent.project.id, "test-food-app");
    console.log("  ✓ Test C & D PASSED: Public artifacts automatically synchronized for multiple distinct projects");
  } finally {
    if (origPublicManifest !== null) fs.writeFileSync(publicManifestPath, origPublicManifest, "utf8");
    if (origAnalyzeManifest !== null) fs.writeFileSync(analyzeManifestPath, origAnalyzeManifest, "utf8");
    if (origRootManifest !== null) fs.writeFileSync(rootManifestPath, origRootManifest, "utf8");
    if (fs.existsSync(tempProjectDir)) fs.rmSync(tempProjectDir, { recursive: true, force: true });
    if (fs.existsSync(testMoviePublicPath)) fs.rmSync(testMoviePublicPath, { recursive: true, force: true });
    if (fs.existsSync(testFoodPublicPath)) fs.rmSync(testFoodPublicPath, { recursive: true, force: true });
  }

  // TEST E: Source Path Normalization (DEFECT-02)
  console.log("\nTest E: Source Path Normalization (DEFECT-02)");
  assert.strictEqual(
    normalizeSourcePath("C:\\Users\\User\\Downloads\\Interview Project\\Cloud-Spend-Tracker\\force-app\\main\\default"),
    "Cloud-Spend-Tracker/force-app/main/default",
    "Windows absolute path with drive letter must normalize to portable POSIX path"
  );
  assert.strictEqual(
    normalizeSourcePath("/app/tmp-cli-forwarding-test/src/force-app/main/default"),
    "tmp-cli-forwarding-test/src/force-app/main/default",
    "POSIX absolute path must normalize to clean portable POSIX path"
  );
  assert.strictEqual(
    normalizeSourcePath("..\\Interview Project\\Cloud-Spend-Tracker\\force-app\\main\\default"),
    "Cloud-Spend-Tracker/force-app/main/default",
    "Relative path with backslashes and parent dirs must normalize"
  );
  assert.strictEqual(
    normalizeSourcePath("C:/Users\\User/Downloads\\Interview Project/Cloud-Spend-Tracker\\force-app/main\\default"),
    "Cloud-Spend-Tracker/force-app/main/default",
    "Mixed separator path must normalize cleanly"
  );
  assert.strictEqual(
    normalizeSourcePath("C:\\Users\\User\\Downloads\\My Special Org\\force-app\\main\\default"),
    "My Special Org/force-app/main/default",
    "Paths with spaces must normalize cleanly"
  );
  assert.strictEqual(
    normalizeSourcePath("force-app/main/default"),
    "force-app/main/default",
    "Clean relative path must remain unchanged"
  );
  assert.strictEqual(
    normalizeSourcePath(""),
    "force-app/main/default",
    "Empty string fallback must return default path"
  );
  assert.strictEqual(
    normalizeSourcePath(undefined),
    "force-app/main/default",
    "Undefined fallback must return default path"
  );
  console.log("  ✓ Test E PASSED: normalizeSourcePath handles all required path variations deterministically");
}

if (require.main === module) {
  try {
    runTests();
    runSpecificRegressionTests();
  } catch (err) {
    console.error(`\nValidation failure: ${err.message}`);
    console.error(err.stack);
    process.exit(1);
  }
}

module.exports = { runTests };
