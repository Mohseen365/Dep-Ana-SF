const fs = require('fs');
const path = require('path');
const z = require(path.resolve('explorer/node_modules/zod')).z;

// Re-create the schema
const ExplorerNodeTypeZ = z.enum([
  'ApexClass', 'ApexTrigger', 'LWC', 'Visualforce', 'Flow',
  'Object', 'CustomObject', 'Field', 'CustomField', 'External'
]);

const ExplorerRelationshipTypeZ = z.enum([
  'method-call', 'instantiation', 'type-reference', 'generic-type',
  'extends', 'implements', 'SOQL', 'soql-object', 'soql-field',
  'DML', 'aura-enabled', 'lwc-apex', 'lwc-import', 'lwc-template-child',
  'field-reference', 'trigger-handler', 'trigger-object', 'trigger-on',
  'visualforce-controller', 'test-reference', 'event-publisher', 'unknown'
]);

const ExplorerNodeZ = z.object({
  id: z.string(),
  displayName: z.string(),
  type: ExplorerNodeTypeZ,
  file: z.string(),
  metrics: z.object({
    fanIn: z.number(),
    fanOut: z.number(),
    coupling: z.number(),
    unresolved: z.number(),
    score: z.number(),
  }),
  risk: z.enum(['HIGH', 'MEDIUM', 'LOW']),
  riskReasons: z.array(z.string()),
  behavior: z.object({
    isTest: z.boolean(),
    sharing: z.enum(['with sharing', 'without sharing', 'inherited sharing']).nullable().optional(),
    publicContractsCount: z.number(),
    asyncPatterns: z.array(z.string()),
    securitySignalsCount: z.number(),
    queryCount: z.number(),
    dmlCount: z.number(),
    calloutCount: z.number(),
  }),
  refactoringReadiness: z.object({
    isHighRisk: z.boolean(),
    hasCycles: z.boolean(),
    hasUnresolved: z.boolean(),
    testCoverageStatus: z.enum(['COVERED', 'NO_TESTS', 'UNTESTED', 'AMBIGUOUS']),
  }),
});

const ExplorerDataSchemaZ = z.object({
  schemaVersion: z.string(),
  analyzerVersion: z.string(),
  generatedAt: z.string(),
  sourceDirectory: z.string(),
  summary: z.any(),
  nodes: z.array(ExplorerNodeZ),
  edges: z.any(),
  cycles: z.any(),
  unresolvedReferences: z.any(),
  impactSummaries: z.any(),
});

// Load canonical fixture
const fixture = JSON.parse(fs.readFileSync('audit-fixtures/cloud-spend-tracker/explorer-data.json', 'utf-8'));

console.log('===============================================================================');
console.log('T-03: ADVERSARIAL TEST — MISSING PROVENANCE FIELDS');
console.log('===============================================================================');

// Case A: Missing schemaVersion
const missingSchemaVersionFixture = { ...fixture, schemaVersion: undefined };
const resA = ExplorerDataSchemaZ.safeParse(missingSchemaVersionFixture);
console.log('Case A: Missing schemaVersion -> success?', resA.success);
if (!resA.success) {
  console.log('Zod Error message:', resA.error.issues[0].path.join('.'), ':', resA.error.issues[0].message);
}

// Case B: Missing sourceDirectory
const missingSourceDirFixture = { ...fixture, sourceDirectory: undefined };
const resB = ExplorerDataSchemaZ.safeParse(missingSourceDirFixture);
console.log('Case B: Missing sourceDirectory -> success?', resB.success);
if (!resB.success) {
  console.log('Zod Error message:', resB.error.issues[0].path.join('.'), ':', resB.error.issues[0].message);
}

// Manifest test: Missing source.sourceHash in analysis-manifest.json
const manifestPath = 'analysis-manifest.json';
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
const manifestSchema = z.object({
  manifestVersion: z.string(),
  analyzerVersion: z.string(),
  contractVersion: z.string(),
  generatedAt: z.string(),
  source: z.object({
    directory: z.string(),
    sourceDir: z.string(),
    fileCount: z.number(),
    sourceHash: z.string(),
    gitCommit: z.string().optional(),
  }),
});
const invalidManifest = { ...manifest, source: { ...manifest.source, sourceHash: undefined } };
const resManifest = manifestSchema.safeParse(invalidManifest);
console.log('Case C: Manifest missing sourceHash -> success?', resManifest.success);
if (!resManifest.success) {
  console.log('Zod Error message:', resManifest.error.issues[0].path.join('.'), ':', resManifest.error.issues[0].message);
}

console.log('\n===============================================================================');
console.log('T-04: ADVERSARIAL TEST — INVALID ENUM VALUES');
console.log('===============================================================================');

// Case D: Invalid Node Type enum
const invalidNodeTypeFixture = JSON.parse(JSON.stringify(fixture));
invalidNodeTypeFixture.nodes[0].type = 'InvalidApexType';
const resD = ExplorerDataSchemaZ.safeParse(invalidNodeTypeFixture);
console.log('Case D: Node with invalid type "InvalidApexType" -> success?', resD.success);
if (!resD.success) {
  console.log('Zod Error message:', resD.error.issues[0].path.join('.'), ':', resD.error.issues[0].message);
}

// Case E: Invalid testCoverageStatus enum
const invalidCoverageFixture = JSON.parse(JSON.stringify(fixture));
invalidCoverageFixture.nodes[0].refactoringReadiness.testCoverageStatus = 'INVALID_COVERAGE';
const resE = ExplorerDataSchemaZ.safeParse(invalidCoverageFixture);
console.log('Case E: Node with invalid testCoverageStatus "INVALID_COVERAGE" -> success?', resE.success);
if (!resE.success) {
  console.log('Zod Error message:', resE.error.issues[0].path.join('.'), ':', resE.error.issues[0].message);
}
