import type { ArchitectureContext, ArchitectureFinding } from "../types";
import { createFinding } from "../finding";
import type { Rule } from "./types";

export const unresolvedRefRule: Rule = {
  id: "unresolved-ref",
  version: "1.0.0",
  name: "Unresolved Reference",
  description: "Identifies dependencies referencing targets outside or missing from the current graph.",
  severity: "MEDIUM",
  run(ctx: ArchitectureContext): ArchitectureFinding[] {
    const findings: ArchitectureFinding[] = [];

    for (const ref of ctx.data.unresolvedReferences) {
      findings.push(
        createFinding({
          id: `finding:unresolved:${ref.edgeId}`,
          type: "UNRESOLVED_REFERENCE",
          severity: "MEDIUM",
          title: `Unresolved reference to ${ref.targetName}`,
          description: `Component references '${ref.targetName}' which could not be resolved in the static architecture analysis. Reason: ${ref.reason}`,
          nodeIds: [ref.sourceNodeId],
          edgeIds: [ref.edgeId],
          evidence: [
            {
              file: ref.file,
              line: ref.line,
              snippet: ref.evidence,
              description: ref.reason
            }
          ],
          provenance: {
            origin: "CONTRACT_FACT",
            source: "unresolved-ref",
            facts: { sourceNodeId: ref.sourceNodeId, targetName: ref.targetName, reason: ref.reason }
          },
          rule: {
            ruleId: unresolvedRefRule.id,
            ruleVersion: unresolvedRefRule.version,
            name: unresolvedRefRule.name,
            description: unresolvedRefRule.description
          }
        })
      );
    }

    return findings;
  }
};
