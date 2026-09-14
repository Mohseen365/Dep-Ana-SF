import { z } from 'zod';
import type { ExplorerDataSchema } from '../types/explorer';

export const ExplorerNodeTypeZ = z.enum([
  'ApexClass',
  'ApexTrigger',
  'LWC',
  'Visualforce',
  'Flow',
  'Object',
  'CustomObject',
  'Field',
  'CustomField',
  'External',
]);

export const ExplorerRiskLevelZ = z.enum(['HIGH', 'MEDIUM', 'LOW']);

export const ExplorerInventoryZ = z.object({
  files: z.number(),
  apexClasses: z.number(),
  apexTriggers: z.number(),
  lwcJs: z.number(),
  lwcHtml: z.number(),
  visualforce: z.number(),
  flows: z.number(),
  objects: z.number(),
  fields: z.number(),
}).strip();

export const ExplorerSummaryZ = z.object({
  nodeCount: z.number(),
  edgeCount: z.number(),
  highRiskCount: z.number(),
  mediumRiskCount: z.number(),
  lowRiskCount: z.number(),
  cycleCount: z.number(),
  unresolvedCount: z.number(),
  inventory: ExplorerInventoryZ,
}).strip();

export const ExplorerNodeMetricsZ = z.object({
  fanIn: z.number(),
  fanOut: z.number(),
  coupling: z.number(),
  unresolved: z.number(),
  score: z.number(),
}).strip();

export const ExplorerNodeBehaviorZ = z.object({
  isTest: z.boolean(),
  sharing: z.enum(['with sharing', 'without sharing', 'inherited sharing']).nullable().optional(),
  publicContractsCount: z.number(),
  asyncPatterns: z.array(z.string()),
  securitySignalsCount: z.number(),
  queryCount: z.number(),
  dmlCount: z.number(),
  calloutCount: z.number(),
}).strip();

export const ExplorerNodeZ = z.object({
  id: z.string(),
  displayName: z.string(),
  type: ExplorerNodeTypeZ,
  file: z.string(),
  metrics: ExplorerNodeMetricsZ,
  risk: ExplorerRiskLevelZ,
  riskReasons: z.array(z.string()),
  behavior: ExplorerNodeBehaviorZ,
  refactoringReadiness: z.object({
    isHighRisk: z.boolean(),
    hasCycles: z.boolean(),
    hasUnresolved: z.boolean(),
    testCoverageStatus: z.enum(['COVERED', 'NO_TESTS', 'UNTESTED', 'AMBIGUOUS']),
  }).strip(),
}).strip();

export const ExplorerRelationshipTypeZ = z.enum([
  'method-call',
  'instantiation',
  'type-reference',
  'generic-type',
  'extends',
  'implements',
  'SOQL',
  'soql-object',
  'soql-field',
  'DML',
  'aura-enabled',
  'lwc-apex',
  'lwc-import',
  'lwc-template-child',
  'field-reference',
  'trigger-handler',
  'trigger-object',
  'trigger-on',
  'visualforce-controller',
  'test-reference',
  'event-publisher',
  'unknown',
]);

export const ExplorerEdgeCanonicalZ = z.object({
  source: z.object({
    type: ExplorerNodeTypeZ,
    name: z.string(),
    method: z.string().nullable().optional(),
  }).strip(),
  target: z.object({
    type: ExplorerNodeTypeZ,
    name: z.string(),
    method: z.string().nullable().optional(),
  }).strip(),
  relationship: z.object({
    type: ExplorerRelationshipTypeZ,
    resolution: z.enum(['EXACT', 'INFERRED', 'HEURISTIC', 'UNRESOLVED']),
  }).strip(),
  location: z.object({
    line: z.number().nullable().optional(),
    column: z.number().nullable().optional(),
  }).strip(),
}).strip();

export const ExplorerEdgeZ = z.object({
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
}).strip();

export const ExplorerCycleGroupZ = z.object({
  id: z.string(),
  size: z.number(),
  nodes: z.array(z.string()),
}).strip();

export const ExplorerUnresolvedReferenceZ = z.object({
  edgeId: z.string(),
  sourceNodeId: z.string(),
  targetName: z.string(),
  targetType: ExplorerNodeTypeZ,
  file: z.string(),
  line: z.number().nullable(),
  evidence: z.string(),
  reason: z.string(),
}).strip();

export const ExplorerComponentImpactSummaryZ = z.object({
  id: z.string(),
  directDependencies: z.array(z.string()),
  directDependents: z.array(z.string()),
  transitiveDependencies: z.array(z.string()),
  transitiveDependents: z.array(z.string()),
  impactedTests: z.array(z.string()),
  totalImpactCount: z.number(),
}).strip();

export const ExplorerDataSchemaZ = z.object({
  schemaVersion: z.string(),
  analyzerVersion: z.string(),
  generatedAt: z.string(),
  sourceDirectory: z.string(),
  summary: ExplorerSummaryZ,
  nodes: z.array(ExplorerNodeZ),
  edges: z.array(ExplorerEdgeZ),
  cycles: z.array(ExplorerCycleGroupZ),
  unresolvedReferences: z.array(ExplorerUnresolvedReferenceZ),
  impactSummaries: z.record(z.string(), ExplorerComponentImpactSummaryZ),
}).strip();

export function parseExplorerData(input: unknown): ExplorerDataSchema {
  const result = ExplorerDataSchemaZ.safeParse(input);
  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid Explorer Data Schema: ${issues}`);
  }
  return result.data as unknown as ExplorerDataSchema;
}
