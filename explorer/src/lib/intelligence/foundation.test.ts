import { describe, it, expect } from "vitest";
import {
  createArchitectureContext,
  buildArchitectureIndexes,
  createFinding,
  type ExplorerDataSchema
} from "./index";

const mockExplorerData: ExplorerDataSchema = {
  schemaVersion: "1.0.0",
  analyzerVersion: "13.0.0",
  generatedAt: "2025-01-01T00:00:00.000Z",
  sourceDirectory: "force-app/main/default",
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
      id: "ApexClass:AssetController",
      displayName: "AssetController",
      type: "ApexClass",
      file: "force-app/main/default/classes/AssetController.cls",
      metrics: { fanIn: 0, fanOut: 1, coupling: 1, unresolved: 0, score: 1 },
      risk: "LOW",
      riskReasons: [],
      behavior: {
        isTest: false,
        sharing: "with sharing",
        publicContractsCount: 1,
        asyncPatterns: [],
        securitySignalsCount: 0,
        queryCount: 0,
        dmlCount: 0,
        calloutCount: 0
      },
      refactoringReadiness: {
        isHighRisk: false,
        hasCycles: false,
        hasUnresolved: false,
        testCoverageStatus: "UNTESTED"
      }
    },
    {
      id: "ApexClass:AssetService",
      displayName: "AssetService",
      type: "ApexClass",
      file: "force-app/main/default/classes/AssetService.cls",
      metrics: { fanIn: 1, fanOut: 1, coupling: 2, unresolved: 1, score: 2 },
      risk: "MEDIUM",
      riskReasons: ["Unresolved reference"],
      behavior: {
        isTest: false,
        sharing: "with sharing",
        publicContractsCount: 2,
        asyncPatterns: [],
        securitySignalsCount: 1,
        queryCount: 1,
        dmlCount: 1,
        calloutCount: 0
      },
      refactoringReadiness: {
        isHighRisk: false,
        hasCycles: true,
        hasUnresolved: true,
        testCoverageStatus: "UNTESTED"
      }
    },
    {
      id: "ApexTrigger:AssetTrigger",
      displayName: "AssetTrigger",
      type: "ApexTrigger",
      file: "force-app/main/default/triggers/AssetTrigger.trigger",
      metrics: { fanIn: 0, fanOut: 1, coupling: 1, unresolved: 0, score: 3 },
      risk: "HIGH",
      riskReasons: ["Trigger logic complexity"],
      behavior: {
        isTest: false,
        sharing: null,
        publicContractsCount: 0,
        asyncPatterns: [],
        securitySignalsCount: 0,
        queryCount: 0,
        dmlCount: 0,
        calloutCount: 0
      },
      refactoringReadiness: {
        isHighRisk: true,
        hasCycles: true,
        hasUnresolved: false,
        testCoverageStatus: "UNTESTED"
      }
    }
  ],
  edges: [
    {
      id: "e1",
      source: "ApexClass:AssetController",
      target: "ApexClass:AssetService",
      relationshipType: "method-call",
      method: "doService",
      evidence: "AssetService.doService()",
      unresolved: false,
      resolutionClassification: "RESOLVED_LOCAL",
      resolutionStrategy: "EXACT",
      confidence: "high",
      line: 12,
      column: 5,
      methodOwner: "handleRequest",
      file: "force-app/main/default/classes/AssetController.cls",
      canonical: {
        source: { type: "ApexClass", name: "AssetController", method: "handleRequest" },
        target: { type: "ApexClass", name: "AssetService", method: "doService" },
        relationship: { type: "method-call", resolution: "EXACT" },
        location: { line: 12, column: 5 }
      }
    },
    {
      id: "e2",
      source: "ApexTrigger:AssetTrigger",
      target: "ApexClass:AssetService",
      relationshipType: "trigger-handler",
      method: null,
      evidence: "AssetService.handleTrigger()",
      unresolved: false,
      resolutionClassification: "RESOLVED_LOCAL",
      resolutionStrategy: "EXACT",
      confidence: "high",
      line: 4,
      column: 1,
      methodOwner: null,
      file: "force-app/main/default/triggers/AssetTrigger.trigger",
      canonical: {
        source: { type: "ApexTrigger", name: "AssetTrigger", method: null },
        target: { type: "ApexClass", name: "AssetService", method: "handleTrigger" },
        relationship: { type: "trigger-handler", resolution: "EXACT" },
        location: { line: 4, column: 1 }
      }
    }
  ],
  cycles: [
    {
      id: "cycle-1",
      size: 2,
      nodes: ["ApexClass:AssetService", "ApexTrigger:AssetTrigger"]
    }
  ],
  unresolvedReferences: [
    {
      edgeId: "e3-unresolved",
      sourceNodeId: "ApexClass:AssetService",
      targetName: "ExternalApiHelper",
      targetType: "External",
      file: "force-app/main/default/classes/AssetService.cls",
      line: 45,
      evidence: "ExternalApiHelper.call()",
      reason: "Unresolved reference to ExternalApiHelper"
    }
  ],
  impactSummaries: {
    "ApexClass:AssetService": {
      id: "ApexClass:AssetService",
      directDependencies: [],
      directDependents: ["ApexClass:AssetController", "ApexTrigger:AssetTrigger"],
      transitiveDependencies: [],
      transitiveDependents: ["ApexClass:AssetController", "ApexTrigger:AssetTrigger"],
      impactedTests: [],
      totalImpactCount: 2
    }
  }
};

describe("Architecture Intelligence Foundation", () => {
  describe("ArchitectureContext & ArchitectureIndexes", () => {
    it("should construct context with default configuration and read-only indexes", () => {
      const context = createArchitectureContext(mockExplorerData);

      expect(context.data.schemaVersion).toBe("1.0.0");
      expect(context.config.profileName).toBe("Default-Salesforce-Profile");
      expect(context.indexes.nodeById.size).toBe(3);
      expect(context.indexes.nodeById.get("ApexClass:AssetService")?.displayName).toBe("AssetService");
    });

    it("should index nodes by metadata type correctly", () => {
      const indexes = buildArchitectureIndexes(mockExplorerData);

      const apexClasses = indexes.nodesByType.get("ApexClass");
      expect(apexClasses).toBeDefined();
      expect(apexClasses?.length).toBe(2);

      const triggers = indexes.nodesByType.get("ApexTrigger");
      expect(triggers?.length).toBe(1);
    });

    it("should index incoming and outgoing edges correctly", () => {
      const indexes = buildArchitectureIndexes(mockExplorerData);

      const outgoing = indexes.outgoingEdges.get("ApexClass:AssetController");
      expect(outgoing?.length).toBe(1);
      expect(outgoing?.[0].target).toBe("ApexClass:AssetService");

      const incoming = indexes.incomingEdges.get("ApexClass:AssetService");
      expect(incoming?.length).toBe(2);
    });

    it("should index cycles, unresolved references, and impact summaries", () => {
      const indexes = buildArchitectureIndexes(mockExplorerData);

      const cycles = indexes.cyclesByNodeId.get("ApexClass:AssetService");
      expect(cycles?.length).toBe(1);
      expect(cycles?.[0].id).toBe("cycle-1");

      const unresolved = indexes.unresolvedBySourceId.get("ApexClass:AssetService");
      expect(unresolved?.length).toBe(1);
      expect(unresolved?.[0].targetName).toBe("ExternalApiHelper");

      const impact = indexes.impactByNodeId.get("ApexClass:AssetService");
      expect(impact?.totalImpactCount).toBe(2);
    });

    it("should enforce read-only immutability on context properties", () => {
      const context = createArchitectureContext(mockExplorerData);

      expect(Object.isFrozen(context)).toBe(true);
      expect(Object.isFrozen(context.data)).toBe(true);
      expect(Object.isFrozen(context.config)).toBe(true);
      expect(Object.isFrozen(context.indexes)).toBe(true);

      expect(() => {
        // @ts-expect-error property is read-only
        context.data.schemaVersion = "2.0.0";
      }).toThrow();
    });

    it("should be deterministic for repeated context constructions", () => {
      const ctx1 = createArchitectureContext(mockExplorerData);
      const ctx2 = createArchitectureContext(mockExplorerData);

      expect(ctx1.indexes.nodeById.size).toBe(ctx2.indexes.nodeById.size);
      expect(Array.from(ctx1.indexes.nodeById.keys())).toEqual(Array.from(ctx2.indexes.nodeById.keys()));
    });
  });

  describe("ArchitectureFinding & Provenance Builder", () => {
    it("should create deterministic frozen ArchitectureFinding objects", () => {
      const finding = createFinding({
        id: "finding:cycle:1",
        type: "CIRCULAR_DEPENDENCY",
        severity: "HIGH",
        title: "Circular Dependency Detected",
        description: "ApexClass:AssetService and ApexTrigger:AssetTrigger form a circular dependency.",
        nodeIds: ["ApexTrigger:AssetTrigger", "ApexClass:AssetService"],
        edgeIds: ["e2", "e1"],
        evidence: [
          {
            file: "force-app/main/default/triggers/AssetTrigger.trigger",
            line: 4,
            snippet: "AssetService.handleTrigger()",
            description: "Trigger handler call"
          }
        ],
        provenance: {
          origin: "ANALYZER_FACT",
          source: "dependency-analyzer.cjs",
          facts: { cycleId: "cycle-1" }
        },
        rule: {
          ruleId: "RULE_CYCLE_001",
          ruleVersion: "1.0.0",
          name: "Circular Dependency Detector"
        }
      });

      expect(finding.id).toBe("finding:cycle:1");
      // Verify nodeIds and edgeIds were sorted deterministically
      expect(finding.nodeIds).toEqual(["ApexClass:AssetService", "ApexTrigger:AssetTrigger"]);
      expect(finding.edgeIds).toEqual(["e1", "e2"]);
      expect(finding.provenance.origin).toBe("ANALYZER_FACT");
      expect(finding.rule.ruleId).toBe("RULE_CYCLE_001");

      // Verify Object.isFrozen
      expect(Object.isFrozen(finding)).toBe(true);
      expect(Object.isFrozen(finding.provenance)).toBe(true);
      expect(Object.isFrozen(finding.rule)).toBe(true);
    });
  });
});
