import type { ArchitectureContext, ArchitectureFinding } from "../types";
import { createFinding } from "../finding";
import type { Rule } from "./types";

export const calloutInTriggerRule: Rule = {
  id: "callout-in-trigger",
  version: "1.0.0",
  name: "Callout in Trigger Risk",
  description: "Identifies HTTP callouts triggered directly or indirectly from synchronous Apex Trigger execution contexts.",
  severity: "HIGH",
  run(ctx: ArchitectureContext): ArchitectureFinding[] {
    const findings: ArchitectureFinding[] = [];

    for (const node of ctx.data.nodes) {
      if (node.type === "ApexTrigger") {
        if (node.behavior?.calloutCount && node.behavior.calloutCount > 0) {
          findings.push(
            createFinding({
              id: `finding:callout-in-trigger:${node.id}`,
              type: "CALLOUT_IN_TRIGGER",
              severity: "HIGH",
              title: `Trigger ${node.displayName} performs callout`,
              description: `Synchronous Apex trigger ${node.displayName} directly executes external callout. This violates Salesforce transactional callout rules and risks CalloutException.`,
              nodeIds: [node.id],
              edgeIds: [],
              evidence: [
                {
                  file: node.file,
                  line: null,
                  snippet: `calloutCount: ${node.behavior.calloutCount}`,
                  description: "Direct callout performed within Apex Trigger."
                }
              ],
              provenance: {
                origin: "ANALYZER_FACT",
                source: "callout-in-trigger",
                facts: { calloutCount: node.behavior.calloutCount }
              },
              rule: {
                ruleId: calloutInTriggerRule.id,
                ruleVersion: calloutInTriggerRule.version,
                name: calloutInTriggerRule.name,
                description: calloutInTriggerRule.description
              }
            })
          );
        } else {
          // Check outgoing dependencies for callout-related dependencies
          const outgoing = ctx.indexes.outgoingEdges.get(node.id) || [];
          for (const edge of outgoing) {
            const targetNode = ctx.indexes.nodeById.get(edge.target);
            if (
              edge.relationshipType === "HTTPCallout" ||
              (targetNode?.behavior?.calloutCount && targetNode.behavior.calloutCount > 0)
            ) {
              findings.push(
                createFinding({
                  id: `finding:callout-in-trigger:${node.id}:${edge.id}`,
                  type: "CALLOUT_IN_TRIGGER",
                  severity: "HIGH",
                  title: `Trigger ${node.displayName} depends on callout component ${targetNode ? targetNode.displayName : edge.target}`,
                  description: `Synchronous Apex trigger ${node.displayName} invokes dependency ${targetNode ? targetNode.displayName : edge.target} which executes external callouts.`,
                  nodeIds: [node.id, edge.target],
                  edgeIds: [edge.id],
                  evidence: [
                    {
                      file: edge.file || node.file,
                      line: edge.line || null,
                      snippet: edge.evidence || `${edge.source} -> ${edge.target}`,
                      description: `Trigger dependency invoking callout component`
                    }
                  ],
                  provenance: {
                    origin: "DERIVED_RULE",
                    source: "callout-in-trigger",
                    facts: { triggerId: node.id, targetId: edge.target }
                  },
                  rule: {
                    ruleId: calloutInTriggerRule.id,
                    ruleVersion: calloutInTriggerRule.version,
                    name: calloutInTriggerRule.name,
                    description: calloutInTriggerRule.description
                  }
                })
              );
            }
          }
        }
      }
    }

    return findings;
  }
};
