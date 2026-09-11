/**
 * Architecture Intelligence Foundation - Finding Utilities
 *
 * Deterministic helper functions for building evidence-backed ArchitectureFinding objects.
 */

import type {
  ArchitectureFinding,
  FindingSeverity,
  FindingEvidenceItem,
  FindingProvenance,
  RuleIdentity
} from "./types";

export interface CreateFindingParams {
  id: string;
  type: string;
  severity: FindingSeverity;
  title: string;
  description: string;
  nodeIds?: string[];
  edgeIds?: string[];
  evidence?: FindingEvidenceItem[];
  provenance: FindingProvenance;
  rule: RuleIdentity;
}

/**
 * Creates a deterministic, standardized ArchitectureFinding.
 * Ensures arrays are sorted deterministically and object references are frozen.
 */
export function createFinding(params: CreateFindingParams): ArchitectureFinding {
  const nodeIds = [...(params.nodeIds || [])].sort();
  const edgeIds = [...(params.edgeIds || [])].sort();
  const evidence = [...(params.evidence || [])].sort((a, b) => {
    const fileCmp = a.file.localeCompare(b.file);
    if (fileCmp !== 0) return fileCmp;
    return (a.line || 0) - (b.line || 0);
  });

  return Object.freeze({
    id: params.id,
    type: params.type,
    severity: params.severity,
    title: params.title,
    description: params.description,
    nodeIds,
    edgeIds,
    evidence,
    provenance: Object.freeze({
      origin: params.provenance.origin,
      source: params.provenance.source,
      facts: Object.freeze({ ...params.provenance.facts })
    }),
    rule: Object.freeze({
      ruleId: params.rule.ruleId,
      ruleVersion: params.rule.ruleVersion,
      name: params.rule.name,
      description: params.rule.description
    })
  });
}
