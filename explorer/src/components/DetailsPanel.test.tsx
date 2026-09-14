import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DetailsPanel } from "./DetailsPanel";
import {
  ExplorerNode,
  ExplorerEdge,
  ExplorerNodeType,
  ExplorerComponentImpactSummary,
  ExplorerDataSchema,
} from "../types/explorer";

const mockNode: ExplorerNode = {
  id: "ApexClass:TestClass",
  displayName: "TestClass",
  type: "ApexClass" as ExplorerNodeType,
  file: "force-app/main/default/classes/TestClass.cls",
  metrics: {
    fanIn: 3,
    fanOut: 2,
    coupling: 5,
    unresolved: 1,
    score: 10,
  },
  risk: "HIGH",
  riskReasons: ["high coupling", "has unresolved references"],
  behavior: {
    isTest: false,
    sharing: "with sharing",
    publicContractsCount: 2,
    asyncPatterns: ["Future"],
    securitySignalsCount: 1,
    queryCount: 5,
    dmlCount: 3,
    calloutCount: 1,
  },
  refactoringReadiness: {
    isHighRisk: true,
    hasCycles: true,
    hasUnresolved: true,
    testCoverageStatus: "COVERED",
  },
};

const mockEdge: ExplorerEdge = {
  id: "ApexClass:TestClass|ApexClass:Helper|method-call|doWork|TestClass.doWork()",
  source: "ApexClass:TestClass",
  target: "ApexClass:Helper",
  relationshipType: "method-call",
  method: "doWork",
  evidence: "Helper.doWork();",
  unresolved: false,
  resolutionClassification: "RESOLVED_LOCAL",
  resolutionStrategy: "EXACT",
  confidence: "high",
  line: 42,
  column: 9,
  methodOwner: "processData",
  file: "force-app/main/default/classes/TestClass.cls",
  canonical: {
    source: {
      type: "ApexClass" as ExplorerNodeType,
      name: "TestClass",
      method: "processData",
    },
    target: {
      type: "ApexClass" as ExplorerNodeType,
      name: "Helper",
      method: "doWork",
    },
    relationship: { type: "method-call", resolution: "EXACT" as const },
    location: { line: 42, column: 9 },
  },
};

const mockUnresolvedEdge: ExplorerEdge = {
  id: "ApexClass:TestClass|ApexClass:Unknown|method-call|missingMethod|TestClass.missing()",
  source: "ApexClass:TestClass",
  target: "ApexClass:Unknown",
  relationshipType: "method-call",
  method: "missingMethod",
  methodOwner: "missingMethod",
  evidence: "",
  unresolved: true,
  resolutionClassification: "UNKNOWN",
  resolutionStrategy: "HEURISTIC",
  confidence: "low",
  line: 88,
  column: 4,
  file: "force-app/main/default/classes/TestClass.cls",
  canonical: {
    source: {
      type: "ApexClass" as ExplorerNodeType,
      name: "TestClass",
    },
    target: {
      type: "ApexClass" as ExplorerNodeType,
      name: "Unknown",
    },
    relationship: { type: "method-call", resolution: "UNRESOLVED" as const },
    location: { line: 88, column: 4 },
  },
};

const mockImpactSummary: ExplorerComponentImpactSummary = {
  id: "ApexClass:TestClass",
  directDependencies: ["ApexClass:Helper"],
  directDependents: ["ApexClass:TestRunner"],
  transitiveDependencies: ["ApexClass:Helper", "External:PaymentGateway"],
  transitiveDependents: ["ApexClass:TestRunner"],
  impactedTests: ["ApexClass:TestRunner"],
  totalImpactCount: 3,
};

const mockDataSchema: ExplorerDataSchema = {
  schemaVersion: "1.0.0",
  analyzerVersion: "1.0.0",
  generatedAt: "2025-01-01T00:00:00Z",
  sourceDirectory: "force-app",
  summary: {
    nodeCount: 1,
    edgeCount: 0,
    highRiskCount: 1,
    mediumRiskCount: 0,
    lowRiskCount: 0,
    cycleCount: 0,
    unresolvedCount: 0,
    inventory: {
      files: 1,
      apexClasses: 1,
      apexTriggers: 0,
      lwcJs: 0,
      lwcHtml: 0,
      visualforce: 0,
      flows: 0,
      objects: 0,
      fields: 0,
    },
  },
  nodes: [mockNode],
  edges: [],
  cycles: [],
  unresolvedReferences: [],
  impactSummaries: { [mockNode.id]: mockImpactSummary },
};

describe("DetailsPanel", () => {
  describe("node selection", () => {
    it("should show placeholder when no node or edge selected", () => {
      render(
        <DetailsPanel
          node={null}
          edge={null}
          impactSummary={null}
          onClose={() => {}}
        />,
      );

      expect(screen.getByText("No Component Selected")).toBeDefined();
      expect(screen.getByText(/Click on any node or edge/i)).toBeDefined();
    });

    it("should display node name", () => {
      render(
        <DetailsPanel
          node={mockNode}
          edge={null}
          impactSummary={null}
          onClose={() => {}}
        />,
      );

      expect(screen.getByText("TestClass")).toBeDefined();
    });

    it("should display node type", () => {
      render(
        <DetailsPanel
          node={mockNode}
          edge={null}
          impactSummary={null}
          onClose={() => {}}
        />,
      );

      expect(screen.getByText("ApexClass")).toBeDefined();
    });

    it("should display risk badge", () => {
      render(
        <DetailsPanel
          node={mockNode}
          edge={null}
          impactSummary={null}
          onClose={() => {}}
        />,
      );

      expect(screen.getByText("HIGH RISK")).toBeDefined();
    });

    it("should display source file path", () => {
      render(
        <DetailsPanel
          node={mockNode}
          edge={null}
          impactSummary={null}
          onClose={() => {}}
        />,
      );

      expect(screen.getByText(/TestClass.cls/)).toBeDefined();
    });

    it("should display readiness hero and Refactor CTA immediately without scrolling", () => {
      render(
        <DetailsPanel
          node={mockNode}
          edge={null}
          impactSummary={mockImpactSummary}
          onClose={() => {}}
        />,
      );

      expect(screen.getByText("Refactoring Readiness")).toBeDefined();
      expect(screen.getByText("HIGH CAUTION")).toBeDefined();
      expect(screen.getByText("⚡ Refactor in LiteLLM")).toBeDefined();
    });

    it("should display fan-in metric", () => {
      render(
        <DetailsPanel
          node={mockNode}
          edge={null}
          impactSummary={null}
          onClose={() => {}}
        />,
      );

      const fanInCard = screen.getByText("Fan-In").parentElement;
      expect(fanInCard?.querySelector(".metric-num")?.textContent).toBe("3");
    });

    it("should display fan-out metric", () => {
      render(
        <DetailsPanel
          node={mockNode}
          edge={null}
          impactSummary={null}
          onClose={() => {}}
        />,
      );

      const fanOutCard = screen.getByText("Fan-Out").parentElement;
      expect(fanOutCard?.querySelector(".metric-num")?.textContent).toBe("2");
    });

    it("should display coupling metric", () => {
      render(
        <DetailsPanel
          node={mockNode}
          edge={null}
          impactSummary={null}
          onClose={() => {}}
        />,
      );

      const couplingCard = screen.getByText("Coupling").parentElement;
      expect(couplingCard?.querySelector(".metric-num")?.textContent).toBe("5");
    });

    it("should display risk reasons", () => {
      render(
        <DetailsPanel
          node={mockNode}
          edge={null}
          impactSummary={null}
          onClose={() => {}}
        />,
      );

      expect(screen.getByText(/High component risk score from analyzer/i)).toBeDefined();
    });

    it("should handle empty risk reasons safely", () => {
      const nodeNoRiskReasons: ExplorerNode = {
        ...mockNode,
        risk: "LOW",
        riskReasons: [],
        metrics: { fanIn: 0, fanOut: 0, coupling: 0, unresolved: 0, score: 0 },
        refactoringReadiness: {
          isHighRisk: false,
          hasCycles: false,
          hasUnresolved: false,
          testCoverageStatus: "COVERED",
        },
      };
      render(
        <DetailsPanel
          node={nodeNoRiskReasons}
          edge={null}
          impactSummary={null}
          onClose={() => {}}
        />,
      );

      expect(
        screen.getByText(/Low risk, no cycles/i),
      ).toBeDefined();
    });

    it("should display component capabilities and behavior chips", () => {
      render(
        <DetailsPanel
          node={mockNode}
          edge={null}
          impactSummary={null}
          onClose={() => {}}
        />,
      );

      expect(screen.getByText(/Component Behavior/)).toBeDefined();
      expect(screen.getByText(/with sharing/)).toBeDefined();
      expect(screen.getByText(/callouts:1/)).toBeDefined();
      expect(screen.getByText(/SOQL:5/)).toBeDefined();
      expect(screen.getByText(/DML:3/)).toBeDefined();
    });

    it("should display blast radius summary in summary tab", () => {
      render(
        <DetailsPanel
          node={mockNode}
          edge={null}
          impactSummary={mockImpactSummary}
          onClose={() => {}}
        />,
      );

      expect(screen.getByText(/Blast Radius Summary/)).toBeDefined();
      expect(screen.getAllByText(/Direct Dependents/)[0]).toBeDefined();
      expect(screen.getAllByText(/Dependencies/)[0]).toBeDefined();
      expect(screen.getByText(/Transitive Impact/)).toBeDefined();
      expect(screen.getAllByText(/ApexClass:Helper/)[0]).toBeDefined();
    });

    it("should display Highlight Blast Radius button and handle click", () => {
      const onShowImpact = vi.fn();
      render(
        <DetailsPanel
          node={mockNode}
          edge={null}
          impactSummary={mockImpactSummary}
          onClose={() => {}}
          onShowImpact={onShowImpact}
        />,
      );

      const impactBtn = screen.getByText(/Highlight Blast Radius/);
      impactBtn.click();
      expect(onShowImpact).toHaveBeenCalledWith("ApexClass:TestClass");
    });

    it("should display impacted test links/names in summary and analysis tabs", () => {
      render(
        <DetailsPanel
          node={mockNode}
          edge={null}
          impactSummary={mockImpactSummary}
          onClose={() => {}}
        />,
      );

      // Impacted test displayed in Summary Tab
      expect(screen.getByText(/ApexClass:TestRunner/)).toBeDefined();

      // Switch to Analysis Tab
      fireEvent.click(screen.getByRole("button", { name: "analysis" }));
      expect(screen.getAllByText(/ApexClass:TestRunner/)[0]).toBeDefined();
    });
  });

  describe("three-tab navigation", () => {
    it("renders SUMMARY, ANALYSIS, and REVIEW tabs and switches content accordingly", () => {
      render(
        <DetailsPanel
          node={mockNode}
          edge={null}
          impactSummary={mockImpactSummary}
          data={mockDataSchema}
          onClose={() => {}}
        />,
      );

      // Default is Summary Tab
      expect(screen.getByRole("button", { name: "summary" })).toBeDefined();
      expect(screen.getByRole("button", { name: "analysis" })).toBeDefined();
      expect(screen.getByRole("button", { name: "review" })).toBeDefined();
      expect(screen.getByText("Blast Radius Summary")).toBeDefined();

      // Switch to Analysis Tab
      fireEvent.click(screen.getByRole("button", { name: "analysis" }));
      expect(screen.getByText("Refactoring Impact Analysis")).toBeDefined();
      expect(screen.getByText("What if I change this?")).toBeDefined();

      // Switch to Review Tab
      fireEvent.click(screen.getByRole("button", { name: "review" }));
      expect(screen.getByText(/Relevant Architecture Findings/)).toBeDefined();
      expect(screen.getByText(/Annotations & Review Notes/)).toBeDefined();
    });

    it("renders raw metadata in collapsible advanced section", () => {
      render(
        <DetailsPanel
          node={mockNode}
          edge={null}
          impactSummary={mockImpactSummary}
          data={mockDataSchema}
          onClose={() => {}}
        />,
      );

      const accordionBtn = screen.getByText("Advanced: Raw Metadata");
      expect(accordionBtn).toBeDefined();

      // Click to toggle JSON metadata
      fireEvent.click(accordionBtn);
      expect(screen.getByText(new RegExp(mockNode.id))).toBeDefined();
    });

    it("opens confirm modal when Refactor CTA is clicked and handles cancel and confirm", () => {
      render(
        <DetailsPanel
          node={mockNode}
          edge={null}
          impactSummary={mockImpactSummary}
          data={mockDataSchema}
          onClose={() => {}}
        />,
      );

      const refactorBtn = screen.getByText("⚡ Refactor in LiteLLM");
      fireEvent.click(refactorBtn);

      expect(screen.getByText("Confirm Refactor Handoff")).toBeDefined();
      expect(screen.getByText(/ApexClass:TestClass/)).toBeDefined();

      // Cancel button
      const cancelBtn = screen.getByText("Cancel");
      fireEvent.click(cancelBtn);
      expect(screen.queryByText("Confirm Refactor Handoff")).toBeNull();

      // Click again and confirm
      fireEvent.click(refactorBtn);
      const confirmBtn = screen.getByText("Confirm & Send to Dashboard");
      fireEvent.click(confirmBtn);
      expect(screen.queryByText("Confirm Refactor Handoff")).toBeNull();
      expect(screen.getByText(/Standalone handoff confirmed for TestClass/)).toBeDefined();
    });
  });

  describe("Change Simulator in Analysis Tab", () => {
    it("renders 'What if I change this?' and is expanded by default in Analysis tab", () => {
      render(
        <DetailsPanel
          node={mockNode}
          edge={null}
          impactSummary={mockImpactSummary}
          data={mockDataSchema}
          onClose={() => {}}
        />,
      );

      // Navigate to Analysis
      fireEvent.click(screen.getByRole("button", { name: "analysis" }));

      expect(screen.getByText("What if I change this?")).toBeInTheDocument();
      expect(
        screen.getByText(/Simulate change to TestClass/),
      ).toBeInTheDocument();
      expect(
        screen.getByText("Highlight affected in graph"),
      ).toBeInTheDocument();
    });

    it("disables 'Highlight affected in graph' button if onHighlightImpact is not provided", () => {
      render(
        <DetailsPanel
          node={mockNode}
          edge={null}
          impactSummary={mockImpactSummary}
          data={mockDataSchema}
          onClose={() => {}}
        />,
      );

      fireEvent.click(screen.getByRole("button", { name: "analysis" }));

      const button = screen.getByText("Highlight affected in graph");
      expect(button).toBeDisabled();
    });

    it("calls onHighlightImpact when button is clicked", () => {
      const handleHighlight = vi.fn();
      render(
        <DetailsPanel
          node={mockNode}
          edge={null}
          impactSummary={mockImpactSummary}
          data={mockDataSchema}
          onClose={() => {}}
          onHighlightImpact={handleHighlight}
        />,
      );

      fireEvent.click(screen.getByRole("button", { name: "analysis" }));

      const button = screen.getByText("Highlight affected in graph");
      expect(button).not.toBeDisabled();
      fireEvent.click(button);
      expect(handleHighlight).toHaveBeenCalled();
    });

    it("allows selecting different change types in change simulator", () => {
      render(
        <DetailsPanel
          node={mockNode}
          edge={null}
          impactSummary={mockImpactSummary}
          data={mockDataSchema}
          onClose={() => {}}
        />,
      );

      fireEvent.click(screen.getByRole("button", { name: "analysis" }));

      const renameOption = screen.getByText("Rename");
      expect(renameOption).toBeDefined();
      fireEvent.click(renameOption);
      expect(screen.getByText(/Simulate change to TestClass/i)).toBeDefined();
    });
  });

  describe("hotspot dashboard", () => {
    it("renders top hotspots when node is null and hotspot props provided", () => {
      const onSelectNodeById = vi.fn();
      render(
        <DetailsPanel
          node={null}
          edge={null}
          impactSummary={null}
          nodes={[mockNode]}
          cycles={[]}
          impactSummaries={{ [mockNode.id]: mockImpactSummary }}
          onClose={() => {}}
          onSelectNodeById={onSelectNodeById}
        />,
      );

      expect(
        screen.getByText("Top architectural hotspots"),
      ).toBeInTheDocument();
      expect(
        screen.getByText("The most impactful components in this analysis"),
      ).toBeInTheDocument();
      expect(screen.getByText("TestClass")).toBeInTheDocument();

      fireEvent.click(screen.getByText("TestClass"));
      expect(onSelectNodeById).toHaveBeenCalledWith(mockNode.id);
    });
  });

  describe("edge selection details", () => {
    it("should display edge evidence when edge is selected", () => {
      render(
        <DetailsPanel
          node={null}
          edge={mockEdge}
          impactSummary={null}
          onClose={() => {}}
        />,
      );

      expect(screen.getByText("Relationship Evidence")).toBeDefined();
    });

    it("should display relationship type", () => {
      render(
        <DetailsPanel
          node={null}
          edge={mockEdge}
          impactSummary={null}
          onClose={() => {}}
        />,
      );

      expect(screen.getByText("METHOD CALL")).toBeDefined();
    });

    it("should display source and target", () => {
      render(
        <DetailsPanel
          node={null}
          edge={mockEdge}
          impactSummary={null}
          onClose={() => {}}
        />,
      );

      expect(screen.getByText(/ApexClass:TestClass/)).toBeDefined();
      expect(screen.getByText(/ApexClass:Helper/)).toBeDefined();
    });

    it("should display evidence code", () => {
      render(
        <DetailsPanel
          node={null}
          edge={mockEdge}
          impactSummary={null}
          onClose={() => {}}
        />,
      );

      expect(screen.getByText(/Helper.doWork/)).toBeDefined();
    });

    it("should display resolution status", () => {
      render(
        <DetailsPanel
          node={null}
          edge={mockEdge}
          impactSummary={null}
          onClose={() => {}}
        />,
      );

      expect(screen.getByText(/Resolved/)).toBeDefined();
    });

    it("should display resolution classification", () => {
      render(
        <DetailsPanel
          node={null}
          edge={mockEdge}
          impactSummary={null}
          onClose={() => {}}
        />,
      );

      expect(screen.getByText(/RESOLVED_LOCAL/)).toBeDefined();
    });

    it("should display confidence level", () => {
      render(
        <DetailsPanel
          node={null}
          edge={mockEdge}
          impactSummary={null}
          onClose={() => {}}
        />,
      );

      expect(screen.getByText(/high/i)).toBeDefined();
    });

    it("should indicate when evidence is unavailable", () => {
      const edgeNoEvidence: ExplorerEdge = {
        ...mockEdge,
        evidence: "",
      };
      render(
        <DetailsPanel
          node={null}
          edge={edgeNoEvidence}
          impactSummary={null}
          onClose={() => {}}
        />,
      );

      expect(screen.getByText(/No evidence available/)).toBeDefined();
    });

    it("should display unresolved status and reference information", () => {
      render(
        <DetailsPanel
          node={null}
          edge={mockUnresolvedEdge}
          impactSummary={null}
          onClose={() => {}}
        />,
      );

      expect(screen.getByText("⚠️ Unresolved")).toBeDefined();
      expect(screen.getByRole("heading", { name: "Unresolved Reference" })).toBeDefined();
      expect(screen.getByText(/could not resolve/i)).toBeDefined();
    });

    it("should display low confidence for unresolved", () => {
      render(
        <DetailsPanel
          node={null}
          edge={mockUnresolvedEdge}
          impactSummary={null}
          onClose={() => {}}
        />,
      );

      expect(screen.getByText(/low/i)).toBeDefined();
    });
  });

  describe("onClose", () => {
    it("should call onClose when close button is clicked", () => {
      const onClose = vi.fn();
      render(
        <DetailsPanel
          node={mockNode}
          edge={null}
          impactSummary={null}
          onClose={onClose}
        />,
      );

      const closeBtn = screen.getByTitle("Close details");
      closeBtn.click();

      expect(onClose).toHaveBeenCalled();
    });
  });
});
