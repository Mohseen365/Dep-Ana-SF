import type { ArchitectureContext, ArchitectureFinding } from "../types";
import { createFinding } from "../finding";
import type { Rule } from "./types";

export const highFanInHubRule: Rule = {
  id: "high-fan-in-hub",
  version: "1.0.0",
  name: "High Fan-In Hub",
  description: "Identifies architectural hubs with excessive dependent components.",
  severity: "HIGH",
  run(ctx: ArchitectureContext): ArchitectureFinding[] {
    const findings: ArchitectureFinding[] = [];
    const threshold = ctx.config.thresholds.highFanInThreshold;

    for (const node of ctx.data.nodes) {
      const fanIn = node.metrics.fanIn;
      if (fanIn >= threshold) {
        const severity = fanIn >= threshold * 2 ? "HIGH" : "MEDIUM";
        const incoming = ctx.indexes.incomingEdges.get(node.id) || [];
        const edgeIds = incoming.map(e => e.id);
        const evidence = incoming.map(e => ({
          file: e.file || node.file,
          line: e.line || null,
          snippet: e.evidence || `${e.source} -> ${e.target}`,
          description: `Incoming dependency from ${e.source} (${e.relationshipType})`
        }));

        findings.push(
          createFinding({
            id: `finding:high-fan-in-hub:${node.id}`,
            type: "HIGH_FAN_IN_HUB",
            severity,
            title: `${node.displayName} is a high fan-in hub (${fanIn} dependents)`,
            description: `Component ${node.displayName} has ${fanIn} incoming dependencies, exceeding the threshold of ${threshold}. Changes to this component have high blast radius across the architecture.`,
            nodeIds: [node.id],
            edgeIds,
            evidence,
            provenance: {
              origin: "DERIVED_RULE",
              source: "high-fan-in-hub",
              facts: { fanIn, threshold, nodeType: node.type }
            },
            rule: {
              ruleId: highFanInHubRule.id,
              ruleVersion: highFanInHubRule.version,
              name: highFanInHubRule.name,
              description: highFanInHubRule.description
            }
          })
        );
      }
    }

    return findings;
  }
};
