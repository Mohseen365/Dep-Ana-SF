import { describe, it, expect } from "vitest";
import { analyzeConnections } from "./connection-analysis";
import {
  ExplorerNode,
  ExplorerEdge,
  ExplorerNodeType,
} from "../types/explorer";

function createMockNode(
  id: string,
  risk: "LOW" | "MEDIUM" | "HIGH" = "LOW",
): ExplorerNode {
  return {
    id,
    displayName: id,
    type: "ApexClass" as ExplorerNodeType,
    file: `${id}.cls`,
    metrics: { fanIn: 0, fanOut: 0, coupling: 0, unresolved: 0, score: 0 },
    risk,
    riskReasons: risk === "HIGH" ? ["High coupling"] : [],
    behavior: {
      isTest: false,
      sharing: null,
      publicContractsCount: 0,
      asyncPatterns: [],
      securitySignalsCount: 0,
      queryCount: 0,
      dmlCount: 0,
      calloutCount: 0,
    },
    refactoringReadiness: {
      isHighRisk: risk === "HIGH",
      hasCycles: false,
      hasUnresolved: false,
      testCoverageStatus: "COVERED",
    },
  };
}

function createMockEdge(
  source: string,
  target: string,
  method: string | null = null,
  methodOwner: string | null = null,
  sourceMethod: string | null = null,
  targetMethod: string | null = null,
  unresolved = false,
): ExplorerEdge {
  return {
    id: `${source}-${target}-${method || "default"}-${Math.random()}`,
    source,
    target,
    relationshipType: "method-call",
    method,
    evidence: `${target}.${method || "call"}()`,
    unresolved,
    resolutionClassification: unresolved ? "UNKNOWN" : "RESOLVED_LOCAL",
    resolutionStrategy: "EXACT",
    confidence: unresolved ? "low" : "high",
    line: 1,
    column: 1,
    methodOwner,
    file: `${source}.cls`,
    canonical: {
      source: {
        type: "ApexClass",
        name: source,
        method: sourceMethod || methodOwner,
      },
      target: {
        type: "ApexClass",
        name: target,
        method: targetMethod || method,
      },
      relationship: { type: "method-call", resolution: "EXACT" },
      location: { line: 1, column: 1 },
    },
  };
}

describe("Connection Analysis", () => {
  describe("Test Case: A -> B", () => {
    it("analyzes direct dependency from A to B", () => {
      const nodes = [createMockNode("A"), createMockNode("B")];
      const edges = [createMockEdge("A", "B")];

      const result = analyzeConnections(nodes, edges, {
        origin: "A",
        direction: "dependencies",
        depth: 1,
      });

      expect(result.nodes.map((n) => n.id).sort()).toEqual(["A", "B"]);
      expect(result.edges).toHaveLength(1);
      expect(result.paths).toHaveLength(1);

      const path = result.paths[0];
      expect(path.origin).toBe("A");
      expect(path.target).toBe("B");
      expect(path.depth).toBe(1);
      expect(path.steps.map((s) => s.component)).toEqual(["A", "B"]);
    });
  });

  describe("Test Case: A -> B -> C", () => {
    it("analyzes transitive dependencies up to depth 2", () => {
      const nodes = [
        createMockNode("A"),
        createMockNode("B"),
        createMockNode("C"),
      ];
      const edges = [createMockEdge("A", "B"), createMockEdge("B", "C")];

      const result = analyzeConnections(nodes, edges, {
        origin: "A",
        direction: "dependencies",
        depth: 2,
      });

      expect(result.nodes.map((n) => n.id).sort()).toEqual(["A", "B", "C"]);
      expect(result.edges).toHaveLength(2);
      expect(result.paths).toHaveLength(2);

      const pathAC = result.paths.find((p) => p.target === "C")!;
      expect(pathAC.depth).toBe(2);
      expect(pathAC.steps.map((s) => s.component)).toEqual(["A", "B", "C"]);
    });
  });

  describe("Test Case: A -> B -> C -> D", () => {
    it("analyzes multi-step chain up to depth 3 and ALL", () => {
      const nodes = ["A", "B", "C", "D"].map((id) => createMockNode(id));
      const edges = [
        createMockEdge("A", "B"),
        createMockEdge("B", "C"),
        createMockEdge("C", "D"),
      ];

      const resultDepth3 = analyzeConnections(nodes, edges, {
        origin: "A",
        direction: "dependencies",
        depth: 3,
      });

      expect(resultDepth3.paths).toHaveLength(3);
      const pathAD = resultDepth3.paths.find((p) => p.target === "D")!;
      expect(pathAD.depth).toBe(3);
      expect(pathAD.steps.map((s) => s.component)).toEqual([
        "A",
        "B",
        "C",
        "D",
      ]);

      const resultDepthALL = analyzeConnections(nodes, edges, {
        origin: "A",
        direction: "dependencies",
        depth: "ALL",
      });

      expect(resultDepthALL.paths).toHaveLength(3);
    });
  });

  describe("Test Case: A -> B -> C -> A (Cycles)", () => {
    it("handles cycles safely and marks hasCycle indicator on cycle path", () => {
      const nodes = ["A", "B", "C"].map((id) => createMockNode(id));
      const edges = [
        createMockEdge("A", "B"),
        createMockEdge("B", "C"),
        createMockEdge("C", "A"),
      ];

      const result = analyzeConnections(nodes, edges, {
        origin: "A",
        direction: "dependencies",
        depth: "ALL",
      });

      expect(result.nodes.map((n) => n.id).sort()).toEqual(["A", "B", "C"]);
      expect(result.edges).toHaveLength(3);

      const cyclePath = result.paths.find((p) => p.target === "A")!;
      expect(cyclePath).toBeDefined();
      expect(cyclePath.hasCycle).toBe(true);
      expect(result.cyclePathCount).toBe(1);
    });
  });

  describe("Test Case: A -> B.process() -> C.validate()", () => {
    it("retains exact canonical/edge method context along ordered path steps", () => {
      const nodes = ["A", "B", "C"].map((id) => createMockNode(id));
      const edges = [
        createMockEdge("A", "B", "process", "execute", "execute", "process"),
        createMockEdge("B", "C", "validate", "process", "process", "validate"),
      ];

      const result = analyzeConnections(nodes, edges, {
        origin: "A",
        direction: "dependencies",
        depth: 2,
      });

      const pathAC = result.paths.find((p) => p.target === "C")!;
      expect(pathAC).toBeDefined();

      expect(pathAC.steps[0]).toEqual({
        component: "A",
        method: "execute",
        relationship: null,
        depth: 0,
      });

      expect(pathAC.steps[1]).toMatchObject({
        component: "B",
        method: "process",
        relationship: "method-call",
        depth: 1,
      });

      expect(pathAC.steps[2]).toMatchObject({
        component: "C",
        method: "validate",
        relationship: "method-call",
        depth: 2,
      });

      expect(pathAC.orderedPath).toEqual([
        "A.execute()",
        "B.process()",
        "C.validate()",
      ]);
    });
  });

  describe("Test Case: A -> B.process() where B has unrelated methods", () => {
    it("does NOT expose unrelated methods on B or C during traversal", () => {
      const nodes = ["A", "B"].map((id) => createMockNode(id));
      const edges = [
        createMockEdge("A", "B", "process", "run", "run", "process"),
        createMockEdge(
          "B",
          "X",
          "unrelatedMethod",
          "otherMethod",
          "otherMethod",
          "unrelatedMethod",
        ),
      ];

      const result = analyzeConnections(nodes, edges, {
        origin: "A",
        direction: "dependencies",
        depth: 1,
      });

      expect(result.paths).toHaveLength(1);
      const path = result.paths[0];

      expect(path.steps[0].method).toBe("run");
      expect(path.steps[1].method).toBe("process");
      expect(path.orderedPath).toEqual(["A.run()", "B.process()"]);

      const allMethodsInPath = path.steps.map((s) => s.method);
      expect(allMethodsInPath).not.toContain("unrelatedMethod");
      expect(allMethodsInPath).not.toContain("otherMethod");
    });
  });

  describe("Lightweight Enhancements: Ranking, Collapse, Counts & Investigation Filter", () => {
    it("collapses duplicate paths and provides total and collapsed path counts", () => {
      const nodes = [createMockNode("A"), createMockNode("B")];
      // Two identical method-call edges between A and B
      const edges = [
        createMockEdge("A", "B", "doWork", "main", "main", "doWork"),
        createMockEdge("A", "B", "doWork", "main", "main", "doWork"),
      ];

      const result = analyzeConnections(nodes, edges, {
        origin: "A",
        direction: "dependencies",
        depth: 1,
      });

      expect(result.totalPathCount).toBe(2);
      expect(result.collapsedPathCount).toBe(1);
      expect(result.paths).toHaveLength(1);
      expect(result.paths[0].duplicateCount).toBe(2);
    });

    it("ranks paths higher if they contain high-risk components or unresolved edges", () => {
      const nodes = [
        createMockNode("A", "LOW"),
        createMockNode("B", "LOW"),
        createMockNode("C", "HIGH"),
      ];
      const edges = [
        createMockEdge("A", "B", "lowCall"),
        createMockEdge("A", "C", "highCall", null, null, null, true), // unresolved & calls HIGH risk C
      ];

      const result = analyzeConnections(nodes, edges, {
        origin: "A",
        direction: "dependencies",
        depth: 1,
      });

      expect(result.paths).toHaveLength(2);
      // Path to C should be ranked higher due to HIGH risk and unresolved reference
      expect(result.paths[0].target).toBe("C");
      expect(result.paths[0].isInvestigationCandidate).toBe(true);
      expect(result.paths[1].target).toBe("B");
    });

    it("filters paths with showOnlyInvestigation option", () => {
      const nodes = [
        createMockNode("A", "LOW"),
        createMockNode("B", "LOW"),
        createMockNode("C", "HIGH"),
      ];
      const edges = [
        createMockEdge("A", "B", "normalCall"),
        createMockEdge("A", "C", "riskyCall"),
      ];

      const resultAll = analyzeConnections(nodes, edges, {
        origin: "A",
        direction: "dependencies",
        depth: 1,
      });
      expect(resultAll.paths).toHaveLength(2);
      expect(resultAll.investigationPathCount).toBe(1);

      const resultInvOnly = analyzeConnections(nodes, edges, {
        origin: "A",
        direction: "dependencies",
        depth: 1,
        showOnlyInvestigation: true,
      });

      expect(resultInvOnly.paths).toHaveLength(1);
      expect(resultInvOnly.paths[0].target).toBe("C");
    });
  });

  describe("Dependents Direction", () => {
    it("traverses incoming edges (dependents) correctly", () => {
      const nodes = ["A", "B", "C", "D"].map((id) => createMockNode(id));
      const edges = [
        createMockEdge("A", "B", "callB", "main", "main", "callB"),
        createMockEdge("B", "C", "callC", "callB", "callB", "callC"),
        createMockEdge("C", "D", "callD", "callC", "callC", "callD"),
      ];

      const result = analyzeConnections(nodes, edges, {
        origin: "D",
        direction: "dependents",
        depth: "ALL",
      });

      expect(result.nodes.map((n) => n.id).sort()).toEqual([
        "A",
        "B",
        "C",
        "D",
      ]);
      expect(result.paths.map((p) => p.target).sort()).toEqual(["A", "B", "C"]);

      const pathDA = result.paths.find((p) => p.target === "A")!;
      expect(pathDA.depth).toBe(3);
      expect(pathDA.steps.map((s) => s.component)).toEqual([
        "D",
        "C",
        "B",
        "A",
      ]);
      expect(pathDA.orderedPath).toEqual([
        "D.callD()",
        "C.callC()",
        "B.callB()",
        "A.main()",
      ]);
    });
  });

  describe("Both Directions", () => {
    it("traverses both dependencies and dependents simultaneously", () => {
      const nodes = ["A", "B", "C"].map((id) => createMockNode(id));
      const edges = [
        createMockEdge("A", "B", "processB", "runA", "runA", "processB"),
        createMockEdge(
          "B",
          "C",
          "processC",
          "processB",
          "processB",
          "processC",
        ),
      ];

      const result = analyzeConnections(nodes, edges, {
        origin: "B",
        direction: "both",
        depth: 1,
      });

      expect(result.nodes.map((n) => n.id).sort()).toEqual(["A", "B", "C"]);
      expect(result.paths).toHaveLength(2);

      const depPath = result.paths.find((p) => p.direction === "dependencies")!;
      expect(depPath.target).toBe("C");

      const deptPath = result.paths.find((p) => p.direction === "dependents")!;
      expect(deptPath.target).toBe("A");
    });
  });

  describe("Determinism", () => {
    it("produces identical deterministic results across multiple invocations", () => {
      const nodes = ["A", "B", "C", "D"].map((id) => createMockNode(id));
      const edges = [
        createMockEdge("A", "B", "m1"),
        createMockEdge("A", "C", "m2"),
        createMockEdge("B", "D", "m3"),
        createMockEdge("C", "D", "m4"),
      ];

      const options = {
        origin: "A",
        direction: "both" as const,
        depth: "ALL" as const,
      };
      const res1 = analyzeConnections(nodes, edges, options);
      const res2 = analyzeConnections(nodes, edges, options);

      expect(res1).toEqual(res2);
    });
  });
});
