import type { ArchitectureContext, ArchitectureFinding } from "../types";
import { createFinding } from "../finding";
import type { Rule } from "./types";

export const cycleDetectedRule: Rule = {
  id: "cycle-detected",
  version: "1.0.0",
  name: "Cycle Detected",
  description: "Identifies circular dependency chains between components.",
  severity: "HIGH",
  run(ctx: ArchitectureContext): ArchitectureFinding[] {
    const findings: ArchitectureFinding[] = [];

    for (const cycle of ctx.data.cycles) {
      const cycleNodesSet = new Set(cycle.nodes);
      const edgeIds: string[] = [];

      for (const nodeId of cycle.nodes) {
        const outgoing = ctx.indexes.outgoingEdges.get(nodeId) || [];
        for (const edge of outgoing) {
          if (cycleNodesSet.has(edge.target)) {
            edgeIds.push(edge.id);
          }
        }
      }

      const evidence = cycle.nodes.map(nodeId => {
        const node = ctx.indexes.nodeById.get(nodeId);
        return {
          file: node ? node.file : nodeId,
          line: null,
          snippet: `Participating node: ${node ? node.displayName : nodeId}`,
          description: `Component in cycle ${cycle.id}`
        };
      });

      findings.push(
        createFinding({
          id: `finding:cycle:${cycle.id}`,
          type: "CIRCULAR_DEPENDENCY",
          severity: "HIGH",
          title: `Circular dependency between ${cycle.nodes.length} components`,
          description: `Detected tight circular dependency group (${cycle.nodes.join(" -> ")}).`,
          nodeIds: cycle.nodes,
          edgeIds,
          evidence,
          provenance: {
            origin: "DERIVED_RULE",
            source: "cycle-detected",
            facts: { cycleId: cycle.id, nodeCount: cycle.nodes.length }
          },
          rule: {
            ruleId: cycleDetectedRule.id,
            ruleVersion: cycleDetectedRule.version,
            name: cycleDetectedRule.name,
            description: cycleDetectedRule.description
          }
        })
      );
    }

    return findings;
  }
};
