const fs = require('fs');
const path = require('path');
const { performance } = require('perf_hooks');
const z = require(path.resolve('explorer/node_modules/zod')).z;

// Zod schema
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

const ExplorerEdgeCanonicalZ = z.object({
  source: z.object({
    type: ExplorerNodeTypeZ,
    name: z.string(),
    method: z.string().nullable().optional(),
  }),
  target: z.object({
    type: ExplorerNodeTypeZ,
    name: z.string(),
    method: z.string().nullable().optional(),
  }),
  relationship: z.object({
    type: ExplorerRelationshipTypeZ,
    resolution: z.enum(['EXACT', 'INFERRED', 'HEURISTIC', 'UNRESOLVED']),
  }),
  location: z.object({
    line: z.number().nullable().optional(),
    column: z.number().nullable().optional(),
  }),
});

const ExplorerEdgeZ = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  relationshipType: ExplorerRelationshipTypeZ,
  method: z.string().nullable(),
  evidence: z.string(),
  unresolved: z.boolean(),
  resolutionClassification: z.enum(['RESOLVED_LOCAL', 'UNKNOWN']),
  resolutionStrategy: z.enum(['EXACT', 'HEURISTIC', 'LLM']),
  confidence: z.string(),
  line: z.number().nullable(),
  column: z.number().nullable(),
  methodOwner: z.string().nullable(),
  file: z.string(),
  canonical: ExplorerEdgeCanonicalZ,
});

const ExplorerDataSchemaZ = z.object({
  schemaVersion: z.string(),
  analyzerVersion: z.string(),
  generatedAt: z.string(),
  sourceDirectory: z.string(),
  summary: z.object({
    nodeCount: z.number(),
    edgeCount: z.number(),
    highRiskCount: z.number(),
    mediumRiskCount: z.number(),
    lowRiskCount: z.number(),
    cycleCount: z.number(),
    unresolvedCount: z.number(),
    inventory: z.object({
      files: z.number(),
      apexClasses: z.number(),
      apexTriggers: z.number(),
      lwcJs: z.number(),
      lwcHtml: z.number(),
      visualforce: z.number(),
      flows: z.number(),
      objects: z.number(),
      fields: z.number(),
    }),
  }),
  nodes: z.array(ExplorerNodeZ),
  edges: z.array(ExplorerEdgeZ),
  cycles: z.array(z.object({ id: z.string(), size: z.number(), nodes: z.array(z.string()) })),
  unresolvedReferences: z.array(z.any()),
  impactSummaries: z.record(z.string(), z.any()),
});

// Load canonical fixture
const fixture = JSON.parse(fs.readFileSync('audit-fixtures/cloud-spend-tracker/explorer-data.json', 'utf-8'));

console.log('===============================================================================');
console.log('PERF: SCHEMA VALIDATION TIME ON CANONICAL FIXTURE (240 nodes, 1024 edges)');
console.log('===============================================================================');

// Warmup
ExplorerDataSchemaZ.safeParse(fixture);

const iterations = 50;
const startMs = performance.now();
for (let i = 0; i < iterations; i++) {
  const res = ExplorerDataSchemaZ.safeParse(fixture);
  if (!res.success) throw new Error('Validation failed');
}
const endMs = performance.now();
const avgMs = (endMs - startMs) / iterations;

console.log(`Ran ${iterations} iterations. Total time: ${(endMs - startMs).toFixed(2)} ms.`);
console.log(`Average parse time per run: ${avgMs.toFixed(3)} ms (Target: < 50.000 ms)`);
console.log(`PERF Threshold Check: ${avgMs < 50 ? 'PASS' : 'FAIL'}`);

console.log('\n===============================================================================');
console.log('SCALE: SCHEMA VALIDATION ON 10,000-NODE SYNTHETIC GRAPH');
console.log('===============================================================================');

console.log('Constructing 10,000-node synthetic benchmark graph...');
const syntheticNodes = [];
const syntheticEdges = [];

for (let i = 0; i < 10000; i++) {
  syntheticNodes.push({
    id: `ApexClass:Class_${i}`,
    displayName: `Class_${i}`,
    type: 'ApexClass',
    file: `classes/Class_${i}.cls`,
    metrics: { fanIn: 1, fanOut: 1, coupling: 2, unresolved: 0, score: 2 },
    risk: i % 10 === 0 ? 'HIGH' : i % 3 === 0 ? 'MEDIUM' : 'LOW',
    riskReasons: i % 10 === 0 ? ['High coupling'] : [],
    behavior: {
      isTest: false,
      sharing: 'with sharing',
      publicContractsCount: 2,
      asyncPatterns: [],
      securitySignalsCount: 0,
      queryCount: 1,
      dmlCount: 0,
      calloutCount: 0,
    },
    refactoringReadiness: {
      isHighRisk: i % 10 === 0,
      hasCycles: false,
      hasUnresolved: false,
      testCoverageStatus: 'COVERED',
    },
  });
}

for (let i = 0; i < 20000; i++) {
  const src = i % 10000;
  const tgt = (i + 1) % 10000;
  syntheticEdges.push({
    id: `edge_${i}`,
    source: `ApexClass:Class_${src}`,
    target: `ApexClass:Class_${tgt}`,
    relationshipType: 'method-call',
    method: 'doWork',
    evidence: 'calls doWork',
    unresolved: false,
    resolutionClassification: 'RESOLVED_LOCAL',
    resolutionStrategy: 'EXACT',
    confidence: 'high',
    line: 10,
    column: 5,
    methodOwner: `Class_${src}`,
    file: `classes/Class_${src}.cls`,
    canonical: {
      source: { type: 'ApexClass', name: `Class_${src}` },
      target: { type: 'ApexClass', name: `Class_${tgt}` },
      relationship: { type: 'method-call', resolution: 'EXACT' },
      location: { line: 10, column: 5 },
    },
  });
}

const scaleGraph = {
  schemaVersion: '1.0.0',
  analyzerVersion: '13.0.0',
  generatedAt: new Date().toISOString(),
  sourceDirectory: 'force-app/main/default',
  summary: {
    nodeCount: 10000,
    edgeCount: 20000,
    highRiskCount: 1000,
    mediumRiskCount: 3000,
    lowRiskCount: 6000,
    cycleCount: 0,
    unresolvedCount: 0,
    inventory: {
      files: 10000,
      apexClasses: 10000,
      apexTriggers: 0,
      lwcJs: 0,
      lwcHtml: 0,
      visualforce: 0,
      flows: 0,
      objects: 0,
      fields: 0,
    },
  },
  nodes: syntheticNodes,
  edges: syntheticEdges,
  cycles: [],
  unresolvedReferences: [],
  impactSummaries: {},
};

console.log('Running Zod validation on 10,000-node graph...');
const scaleStartMs = performance.now();
const scaleRes = ExplorerDataSchemaZ.safeParse(scaleGraph);
const scaleEndMs = performance.now();

console.log(`10,000-node validation success: ${scaleRes.success}`);
console.log(`Scale validation execution time: ${(scaleEndMs - scaleStartMs).toFixed(2)} ms`);
console.log(`SCALE Check: ${scaleRes.success ? 'PASS' : 'FAIL'}`);
