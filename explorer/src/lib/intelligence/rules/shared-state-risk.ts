import type { ArchitectureContext, ArchitectureFinding } from "../types";
import { createFinding } from "../finding";
import type { Rule } from "./types";

export const sharedStateRiskRule: Rule = {
  id: "shared-state-risk",
  version: "1.0.0",
  name: "Shared State Risk (Without Sharing)",
  description: "Identifies Apex classes explicitly declared with 'without sharing' execution context.",
  severity: "HIGH",
  run(ctx: ArchitectureContext): ArchitectureFinding[] {
    const findings: ArchitectureFinding[] = [];

    for (const node of ctx.data.nodes) {
      if (node.behavior?.sharing === "without sharing") {
        findings.push(
          createFinding({
            id: `finding:shared-state-risk:${node.id}`,
            type: "SHARED_STATE_RISK",
            severity: "HIGH",
            title: `${node.displayName} runs without sharing`,
            description: `Class ${node.displayName} explicitly bypasses record-level security by running 'without sharing'. Verify user permission and FLS enforcement.`,
            nodeIds: [node.id],
            edgeIds: [],
            evidence: [
              {
                file: node.file,
                line: null,
                snippet: `sharing: 'without sharing'`,
                description: "Explicit without sharing declaration in class header."
              }
            ],
            provenance: {
              origin: "ANALYZER_FACT",
              source: "shared-state-risk",
              facts: { sharing: node.behavior.sharing }
            },
            rule: {
              ruleId: sharedStateRiskRule.id,
              ruleVersion: sharedStateRiskRule.version,
              name: sharedStateRiskRule.name,
              description: sharedStateRiskRule.description
            }
          })
        );
      }
    }

    return findings;
  }
};
