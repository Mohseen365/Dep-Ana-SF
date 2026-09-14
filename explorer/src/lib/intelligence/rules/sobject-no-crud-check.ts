import type { ArchitectureContext, ArchitectureFinding } from "../types";
import { createFinding } from "../finding";
import type { Rule } from "./types";

export const sobjectNoCrudCheckRule: Rule = {
  id: "sobject-no-crud-check",
  version: "1.0.0",
  name: "DML Bypassing Security Signals",
  description: "Identifies Apex components performing DML operations without security enforcement signals.",
  severity: "MEDIUM",
  run(ctx: ArchitectureContext): ArchitectureFinding[] {
    const findings: ArchitectureFinding[] = [];

    for (const node of ctx.data.nodes) {
      if ((node.type === "ApexClass" || node.type === "ApexTrigger") && !node.behavior?.isTest) {
        const dmlCount = node.behavior?.dmlCount || 0;
        const securitySignalsCount = node.behavior?.securitySignalsCount || 0;

        if (dmlCount > 0 && securitySignalsCount === 0) {
          findings.push(
            createFinding({
              id: `finding:sobject-no-crud-check:${node.id}`,
              type: "SOBJECT_NO_CRUD_CHECK",
              severity: "MEDIUM",
              title: `${node.displayName} performs DML without security enforcement signals`,
              description: `Component ${node.displayName} performs ${dmlCount} DML operations but contains zero security enforcement signals (such as WITH USER_MODE, Security.stripInaccessible, or Schema CRUD/FLS checks).`,
              nodeIds: [node.id],
              edgeIds: [],
              evidence: [
                {
                  file: node.file,
                  line: null,
                  snippet: `dmlCount: ${dmlCount}, securitySignalsCount: ${securitySignalsCount}`,
                  description: "DML operations performed without security enforcement signals."
                }
              ],
              provenance: {
                origin: "ANALYZER_FACT",
                source: "sobject-no-crud-check",
                facts: { dmlCount, securitySignalsCount }
              },
              rule: {
                ruleId: sobjectNoCrudCheckRule.id,
                ruleVersion: sobjectNoCrudCheckRule.version,
                name: sobjectNoCrudCheckRule.name,
                description: sobjectNoCrudCheckRule.description
              }
            })
          );
        }
      }
    }

    return findings;
  }
};
