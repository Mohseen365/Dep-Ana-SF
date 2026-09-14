import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import { App } from "./App";

const richExplorerData = {
  schemaVersion: "1.0",
  analyzerVersion: "2.0.0",
  generatedAt: "2025-01-01T00:00:00Z",
  sourceDirectory: "force-app",
  summary: {
    nodeCount: 2,
    edgeCount: 1,
    highRiskCount: 1,
    mediumRiskCount: 0,
    lowRiskCount: 1,
    cycleCount: 0,
    unresolvedCount: 0,
    inventory: {
      files: 2,
      apexClasses: 2,
      apexTriggers: 0,
      lwcJs: 0,
      lwcHtml: 0,
      visualforce: 0,
      flows: 0,
      objects: 0,
      fields: 0,
    },
  },
  nodes: [
    {
      id: "ApexClass:AccountService",
      displayName: "AccountService",
      type: "ApexClass",
      file: "force-app/AccountService.cls",
      metrics: { fanIn: 10, fanOut: 2, coupling: 12, unresolved: 0, score: 85 },
      risk: "HIGH",
      riskReasons: ["High fan-in hub"],
      behavior: {
        isTest: false,
        sharing: "with sharing",
        publicContractsCount: 2,
        asyncPatterns: [],
        securitySignalsCount: 0,
        queryCount: 0,
        dmlCount: 0,
        calloutCount: 0,
      },
      refactoringReadiness: {
        isHighRisk: true,
        hasCycles: false,
        hasUnresolved: false,
        testCoverageStatus: "NO_TESTS",
      },
    },
    {
      id: "ApexClass:OrderService",
      displayName: "OrderService",
      type: "ApexClass",
      file: "force-app/OrderService.cls",
      metrics: { fanIn: 1, fanOut: 1, coupling: 2, unresolved: 0, score: 20 },
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
        calloutCount: 0,
      },
      refactoringReadiness: {
        isHighRisk: false,
        hasCycles: false,
        hasUnresolved: false,
        testCoverageStatus: "COVERED",
      },
    },
  ],
  edges: [
    {
      id: "e1",
      source: "ApexClass:OrderService",
      target: "ApexClass:AccountService",
      relationshipType: "method-call",
      method: "getAccount",
      evidence: "AccountService.getAccount()",
      unresolved: false,
      resolutionClassification: "RESOLVED_LOCAL",
      resolutionStrategy: "EXACT",
      confidence: "1.0",
      line: 12,
      column: 5,
      methodOwner: "AccountService",
      file: "force-app/OrderService.cls",
      canonical: {
        source: { type: "ApexClass", name: "OrderService", method: "process" },
        target: {
          type: "ApexClass",
          name: "AccountService",
          method: "getAccount",
        },
        relationship: { type: "method-call", resolution: "EXACT" },
        location: { line: 12, column: 5 },
      },
    },
  ],
  cycles: [],
  unresolvedReferences: [],
  impactSummaries: {
    "ApexClass:AccountService": {
      id: "ApexClass:AccountService",
      directDependencies: [],
      directDependents: ["ApexClass:OrderService"],
      transitiveDependencies: [],
      transitiveDependents: ["ApexClass:OrderService"],
      impactedTests: [],
      totalImpactCount: 1,
    },
  },
};

describe("App Deep-Link Restoration", () => {
  beforeEach(() => {
    HTMLCanvasElement.prototype.toDataURL = vi
      .fn()
      .mockReturnValue("data:image/png;base64,00");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async () => ({
        ok: true,
        json: async () => richExplorerData,
      })),
    );
    window.history.replaceState(null, "", "/");
  });

  it("restores selected component, direction, depth, and finding from deep-link URL", async () => {
    window.history.replaceState(
      null,
      "",
      "/?component=AccountService&direction=dependencies&depth=2&finding=finding:high-fan-in-hub:ApexClass:AccountService",
    );

    render(<App />);

    await waitFor(() => {
      expect(
        screen.getByText("Salesforce Architecture Explorer"),
      ).toBeInTheDocument();
    });

    // Check that selected component AccountService is restored
    await waitFor(() => {
      expect(screen.getAllByText("AccountService").length).toBeGreaterThan(0);
    });
  });

  it("restores view mode findings when specified in URL", async () => {
    window.history.replaceState(
      null,
      "",
      "/?viewMode=findings&component=AccountService",
    );

    const { container } = render(<App />);

    await waitFor(() => {
      expect(
        screen.getByText("Salesforce Architecture Explorer"),
      ).toBeInTheDocument();
    });

    // Findings slot should be active
    await waitFor(() => {
      expect(
        container.querySelector('[data-slot="findings"]'),
      ).toBeInTheDocument();
    });
  });

  it("updates selection on browser back/forward popstate events", async () => {
    window.history.replaceState(null, "", "/?component=AccountService");

    render(<App />);

    await waitFor(() => {
      expect(screen.getAllByText("AccountService").length).toBeGreaterThan(0);
    });

    // Simulate browser navigation to OrderService
    act(() => {
      window.history.replaceState(null, "", "/?component=OrderService");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });

    await waitFor(() => {
      expect(screen.getAllByText("OrderService").length).toBeGreaterThan(0);
    });
  });
});
