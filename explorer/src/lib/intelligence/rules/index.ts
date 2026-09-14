import type { ArchitectureContext, ArchitectureFinding } from "../types";
import type { Rule } from "./types";
import { highFanInHubRule } from "./high-fan-in-hub";
import { cycleDetectedRule } from "./cycle-detected";
import { unresolvedRefRule } from "./unresolved-ref";
import { testMissingForHubRule } from "./test-missing-for-hub";
import { sharedStateRiskRule } from "./shared-state-risk";
import { calloutInTriggerRule } from "./callout-in-trigger";
import { sobjectNoCrudCheckRule } from "./sobject-no-crud-check";

export * from "./types";
export * from "./high-fan-in-hub";
export * from "./cycle-detected";
export * from "./unresolved-ref";
export * from "./test-missing-for-hub";
export * from "./shared-state-risk";
export * from "./callout-in-trigger";
export * from "./sobject-no-crud-check";

export const ALL_RULES: Rule[] = Object.freeze([
  highFanInHubRule,
  cycleDetectedRule,
  unresolvedRefRule,
  testMissingForHubRule,
  sharedStateRiskRule,
  calloutInTriggerRule,
  sobjectNoCrudCheckRule
]) as unknown as Rule[];

/**
 * Runs all intelligence rules deterministically on the provided architecture context.
 */
export function runAllRules(ctx: ArchitectureContext): ArchitectureFinding[] {
  const findings: ArchitectureFinding[] = [];

  for (const rule of ALL_RULES) {
    const ruleFindings = rule.run(ctx);
    findings.push(...ruleFindings);
  }

  // Sort findings deterministically by severity priority then id
  const severityOrder: Record<string, number> = {
    CRITICAL: 0,
    HIGH: 1,
    MEDIUM: 2,
    LOW: 3,
    INFO: 4
  };

  return findings.sort((a, b) => {
    const sevDiff = (severityOrder[a.severity] ?? 99) - (severityOrder[b.severity] ?? 99);
    if (sevDiff !== 0) return sevDiff;
    return a.id.localeCompare(b.id);
  });
}
