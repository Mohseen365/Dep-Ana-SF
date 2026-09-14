import type { ArchitectureContext, ArchitectureFinding } from "../types";
import { createFinding } from "../finding";
import type { Rule } from "./types";

export const testMissingForHubRule: Rule = {
  id: "test-missing-for-hub",
  version: "1.0.0",
  name: "Test Missing for Hub",
  description: "Identifies high fan-in architectural hubs that lack covering unit test components.",
  severity: "HIGH",
  run(ctx: ArchitectureContext): ArchitectureFinding[] {
    const findings: ArchitectureFinding[] = [];
    const threshold = ctx.config.thresholds.highFanInThreshold;

    for (const node of ctx.data.nodes) {
      if (node.metrics.fanIn >= threshold) {
        const incoming = ctx.indexes.incomingEdges.get(node.id) || [];
        const hasCoveringTest = incoming.some(edge => {
          const sourceNode = ctx.indexes.nodeById.get(edge.source);
          return sourceNode?.behavior?.isTest === true;
        });

        if (!hasCoveringTest) {
          findings.push(
            createFinding({
              id: `finding:test-missing-for-hub:${node.id}`,
              type: "TEST_MISSING_FOR_HUB",
              severity: "HIGH",
              title: `High-impact ${node.type} ${node.displayName} has no covering tests`,
              description: `Component ${node.displayName} is a high fan-in hub (${node.metrics.fanIn} dependents) but no unit test classes depend on or cover it directly in the static dependency graph.`,
              nodeIds: [node.id],
              edgeIds: incoming.map(e => e.id),
              evidence: [
                {
                  file: node.file,
                  line: null,
                  snippet: `Class ${node.displayName} with fan-in ${node.metrics.fanIn}`,
                  description: "High fan-in component without covering Apex test classes."
                }
              ],
              provenance: {
                origin: "DERIVED_RULE",
                source: "test-missing-for-hub",
                facts: { fanIn: node.metrics.fanIn, threshold }
              },
              rule: {
                ruleId: testMissingForHubRule.id,
                ruleVersion: testMissingForHubRule.version,
                name: testMissingForHubRule.name,
                description: testMissingForHubRule.description
              }
            })
          );
        }
      }
    }

    return findings;
  }
};
