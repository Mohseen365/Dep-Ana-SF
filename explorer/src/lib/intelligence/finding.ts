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
import { deepFreeze } from "./context";

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
 * Ensures arrays are sorted deterministically and all structures are deeply frozen.
 */
export function createFinding(params: CreateFindingParams): ArchitectureFinding {
  const nodeIds = [...(params.nodeIds || [])].sort();
  const edgeIds = [...(params.edgeIds || [])].sort();
  const evidence = [...(params.evidence || [])].sort((a, b) => {
    const fileCmp = a.file.localeCompare(b.file);
    if (fileCmp !== 0) return fileCmp;
    return (a.line || 0) - (b.line || 0);
  });

  const finding: ArchitectureFinding = {
    id: params.id,
    type: params.type,
    severity: params.severity,
    title: params.title,
    description: params.description,
    nodeIds,
    edgeIds,
    evidence: evidence.map(e => ({ ...e })),
    provenance: {
      origin: params.provenance.origin,
      source: params.provenance.source,
      facts: JSON.parse(JSON.stringify(params.provenance.facts || {}))
    },
    rule: {
      ruleId: params.rule.ruleId,
      ruleVersion: params.rule.ruleVersion,
      name: params.rule.name,
      description: params.rule.description
    }
  };

  return deepFreeze(finding);
}
