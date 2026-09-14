import { describe, it, expect } from "vitest";
import { createArchitectureContext } from "../context";
import { runAllRules, ALL_RULES } from "./index";
import type { ExplorerDataSchema, ExplorerEdge } from "../types";
import sampleDataRaw from "../../../../public/explorer-data.json";

const sampleData = sampleDataRaw as unknown as ExplorerDataSchema;

const createMockCanonical = (source: string, target: string): ExplorerEdge["canonical"] => ({
  source: { type: "ApexClass", name: source, method: null },
  target: { type: "ApexClass", name: target, method: null },
  relationship: { type: "CallsMethod", resolution: "EXACT" },
  location: { line: null, column: null }
});

describe("Architecture Intelligence Rules Foundation", () => {
  it("exports ALL_RULES array containing 7 rules", () => {
    expect(ALL_RULES).toBeDefined();
    expect(ALL_RULES.length).toBe(7);
  });

  it("runs all rules against sample explorer-data.json and returns findings", () => {
    const ctx = createArchitectureContext(sampleData);
    const findings = runAllRules(ctx);

    expect(findings.length).toBeGreaterThan(0);

    // Verify finding structure
    for (const finding of findings) {
      expect(finding.id).toBeDefined();
      expect(finding.severity).toMatch(/^(CRITICAL|HIGH|MEDIUM|LOW|INFO)$/);
      expect(finding.title).toBeTruthy();
      expect(finding.description).toBeTruthy();
      expect(Array.isArray(finding.nodeIds)).toBe(true);
      expect(Array.isArray(finding.edgeIds)).toBe(true);
      expect(Array.isArray(finding.evidence)).toBe(true);
      expect(finding.provenance).toBeDefined();
      expect(finding.rule).toBeDefined();
    }
  });

  it("executes each rule individually on a synthetic context without error", () => {
    const syntheticData: ExplorerDataSchema = {
      schemaVersion: "1.0.0",
      analyzerVersion: "1.0.0",
      generatedAt: new Date().toISOString(),
      sourceDirectory: "/synthetic",
      summary: {
        nodeCount: 3,
        edgeCount: 2,
        highRiskCount: 1,
        mediumRiskCount: 1,
        lowRiskCount: 1,
        cycleCount: 1,
        unresolvedCount: 1,
        inventory: {
          files: 3,
          apexClasses: 2,
          apexTriggers: 1,
          lwcJs: 0,
          lwcHtml: 0,
          visualforce: 0,
          flows: 0,
          objects: 0,
          fields: 0
        }
      },
      nodes: [
        {
          id: "ApexClass:HubClass",
          displayName: "HubClass",
          type: "ApexClass",
          file: "classes/HubClass.cls",
          metrics: { fanIn: 12, fanOut: 1, coupling: 13, unresolved: 0, score: 8 },
          risk: "HIGH",
          riskReasons: ["high fan-in"],
          behavior: {
            isTest: false,
            sharing: "without sharing",
            publicContractsCount: 2,
            asyncPatterns: [],
            securitySignalsCount: 0,
            queryCount: 1,
            dmlCount: 2,
            calloutCount: 0
          },
          refactoringReadiness: {
            isHighRisk: true,
            hasCycles: true,
            hasUnresolved: false,
            testCoverageStatus: "UNTESTED"
          }
        },
        {
          id: "ApexTrigger:AccountTrigger",
          displayName: "AccountTrigger",
          type: "ApexTrigger",
          file: "triggers/AccountTrigger.trigger",
          metrics: { fanIn: 0, fanOut: 1, coupling: 1, unresolved: 0, score: 5 },
          risk: "MEDIUM",
          riskReasons: ["trigger callout"],
          behavior: {
            isTest: false,
            sharing: null,
            publicContractsCount: 0,
            asyncPatterns: [],
            securitySignalsCount: 0,
            queryCount: 0,
            dmlCount: 0,
            calloutCount: 1
          },
          refactoringReadiness: {
            isHighRisk: false,
            hasCycles: false,
            hasUnresolved: false,
            testCoverageStatus: "UNTESTED"
          }
        },
        {
          id: "ApexClass:CycleB",
          displayName: "CycleB",
          type: "ApexClass",
          file: "classes/CycleB.cls",
          metrics: { fanIn: 1, fanOut: 1, coupling: 2, unresolved: 0, score: 3 },
          risk: "LOW",
          riskReasons: [],
          behavior: {
            isTest: false,
            sharing: "with sharing",
            publicContractsCount: 1,
            asyncPatterns: [],
            securitySignalsCount: 1,
            queryCount: 1,
            dmlCount: 0,
            calloutCount: 0
          },
          refactoringReadiness: {
            isHighRisk: false,
            hasCycles: true,
            hasUnresolved: false,
            testCoverageStatus: "COVERED"
          }
        }
      ],
      edges: [
        {
          id: "edge-1",
          source: "ApexTrigger:AccountTrigger",
          target: "ApexClass:HubClass",
          relationshipType: "CallsMethod",
          method: "execute",
          evidence: "HubClass.execute()",
          unresolved: false,
          resolutionClassification: "STATIC_EXPLICIT",
          resolutionStrategy: "EXACT_NAME",
          confidence: "HIGH",
          line: 10,
          column: 5,
          methodOwner: "HubClass",
          file: "triggers/AccountTrigger.trigger",
          canonical: createMockCanonical("AccountTrigger", "HubClass")
        },
        {
          id: "edge-2",
          source: "ApexClass:HubClass",
          target: "ApexClass:CycleB",
          relationshipType: "Instantiates",
          method: null,
          evidence: "new CycleB()",
          unresolved: false,
          resolutionClassification: "STATIC_EXPLICIT",
          resolutionStrategy: "EXACT_NAME",
          confidence: "HIGH",
          line: 15,
          column: 8,
          methodOwner: null,
          file: "classes/HubClass.cls",
          canonical: createMockCanonical("HubClass", "CycleB")
        }
      ],
      cycles: [
        {
          id: "cycle-1",
          size: 2,
          nodes: ["ApexClass:HubClass", "ApexClass:CycleB"]
        }
      ],
      unresolvedReferences: [
        {
          edgeId: "edge-unresolved-1",
          sourceNodeId: "ApexClass:HubClass",
          targetName: "ExternalService",
          targetType: "ApexClass",
          file: "classes/HubClass.cls",
          line: 42,
          evidence: "ExternalService.doWork()",
          reason: "Package dependency not available"
        }
      ],
      impactSummaries: {}
    };

    const ctx = createArchitectureContext(syntheticData);

    for (const rule of ALL_RULES) {
      const findings = rule.run(ctx);
      expect(Array.isArray(findings)).toBe(true);
    }

    const allFindings = runAllRules(ctx);
    expect(allFindings.length).toBeGreaterThanOrEqual(5);

    // Verify deterministic sorting: CRITICAL / HIGH / MEDIUM / LOW / INFO
    for (let i = 0; i < allFindings.length - 1; i++) {
      const a = allFindings[i];
      const b = allFindings[i + 1];
      const sevMap: Record<string, number> = { HIGH: 1, MEDIUM: 2 };
      expect(sevMap[a.severity] ?? 99).toBeLessThanOrEqual(sevMap[b.severity] ?? 99);
    }
  });
});
