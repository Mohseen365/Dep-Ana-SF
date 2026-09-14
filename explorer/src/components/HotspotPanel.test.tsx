import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { HotspotPanel } from "./HotspotPanel";
import { ExplorerNode } from "../types/explorer";

describe("HotspotPanel", () => {
  const nodes: ExplorerNode[] = [
    {
      id: "ApexClass:CommonSelector",
      displayName: "CommonSelector",
      type: "ApexClass",
      file: "force-app/main/default/classes/CommonSelector.cls",
      metrics: { fanIn: 82, fanOut: 5, coupling: 87, unresolved: 0, score: 20 },
      risk: "HIGH",
      riskReasons: ["high fan-in"],
      behavior: {
        isTest: false,
        publicContractsCount: 5,
        asyncPatterns: [],
        securitySignalsCount: 0,
        queryCount: 10,
        dmlCount: 0,
        calloutCount: 0,
      },
      refactoringReadiness: {
        isHighRisk: true,
        hasCycles: false,
        hasUnresolved: false,
        testCoverageStatus: "COVERED",
      },
    },
  ];

  it("renders architectural hotspots header and items", () => {
    render(
      <HotspotPanel
        nodes={nodes}
        cycles={[]}
        impactSummaries={{}}
        onSelectHotspot={vi.fn()}
        selectedNodeId={null}
      />,
    );

    expect(screen.getByText("Architectural Hotspots")).toBeInTheDocument();
    expect(screen.getByText("CommonSelector")).toBeInTheDocument();
  });

  it("triggers onSelectHotspot when hotspot item is clicked", () => {
    const handleSelect = vi.fn();
    render(
      <HotspotPanel
        nodes={nodes}
        cycles={[]}
        impactSummaries={{}}
        onSelectHotspot={handleSelect}
        selectedNodeId={null}
      />,
    );

    fireEvent.click(screen.getByText("CommonSelector"));
    expect(handleSelect).toHaveBeenCalledWith(nodes[0]);
  });

  it("allows switching hotspot tabs", () => {
    render(
      <HotspotPanel
        nodes={nodes}
        cycles={[]}
        impactSummaries={{}}
        onSelectHotspot={vi.fn()}
        selectedNodeId={null}
      />,
    );

    const fanInTab = screen.getByRole("button", { name: /Fan-In/i });
    fireEvent.click(fanInTab);
    expect(screen.getByText("CommonSelector")).toBeInTheDocument();
  });
  it("renders readiness tab and groups nodes correctly", () => {
    const goodNode: ExplorerNode = {
      id: "LWC:navbar",
      displayName: "navbar",
      type: "LWC",
      file: "force-app/main/default/lwc/navbar/navbar.js",
      metrics: { fanIn: 0, fanOut: 0, coupling: 0, unresolved: 0, score: 0 },
      risk: "LOW",
      riskReasons: [],
      behavior: {
        isTest: false,
        publicContractsCount: 0,
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
    };

    render(
      <HotspotPanel
        nodes={[nodes[0], goodNode]}
        cycles={[]}
        impactSummaries={{}}
        onSelectHotspot={vi.fn()}
        selectedNodeId={null}
      />,
    );

    const readinessTab = screen.getByRole("button", { name: /Readiness/i });
    fireEvent.click(readinessTab);

    expect(screen.getByText(/GOOD CANDIDATE/)).toBeInTheDocument();
    expect(screen.getByText("navbar")).toBeInTheDocument();
    expect(screen.getAllByText(/HIGH CAUTION/)[0]).toBeInTheDocument();
    expect(screen.getByText("CommonSelector")).toBeInTheDocument();
  });

  it("filters nodes with high caution dependents when checkbox is checked", () => {
    const parentNode: ExplorerNode = {
      id: "ApexClass:ParentService",
      displayName: "ParentService",
      type: "ApexClass",
      file: "force-app/main/default/classes/ParentService.cls",
      metrics: { fanIn: 0, fanOut: 1, coupling: 1, unresolved: 0, score: 1 },
      risk: "LOW",
      riskReasons: [],
      behavior: {
        isTest: false,
        publicContractsCount: 0,
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
    };

    const highCautionDependent: ExplorerNode = {
      id: "ApexClass:HighCautionDep",
      displayName: "HighCautionDep",
      type: "ApexClass",
      file: "force-app/main/default/classes/HighCautionDep.cls",
      metrics: { fanIn: 10, fanOut: 0, coupling: 10, unresolved: 0, score: 20 },
      risk: "HIGH",
      riskReasons: ["high fan in"],
      behavior: {
        isTest: false,
        publicContractsCount: 0,
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
        testCoverageStatus: "UNTESTED",
      },
    };

    // ParentService has HighCautionDep as direct dependent
    const testImpactSummaries = {
      [parentNode.id]: {
        id: parentNode.id,
        directDependencies: ["ApexClass:HighCautionDep"],
        directDependents: ["ApexClass:HighCautionDep"],
        transitiveDependencies: [],
        transitiveDependents: [],
        impactedTests: [],
        totalImpactCount: 1,
      },
    };

    render(
      <HotspotPanel
        nodes={[parentNode, highCautionDependent]}
        cycles={[]}
        impactSummaries={testImpactSummaries}
        onSelectHotspot={vi.fn()}
        selectedNodeId={null}
      />,
    );

    const readinessTab = screen.getByRole("button", { name: /Readiness/i });
    fireEvent.click(readinessTab);

    expect(screen.getByText("ParentService")).toBeInTheDocument();

    const checkbox = screen.getByLabelText(
      /Hide nodes with any HIGH CAUTION dependent/i,
    );
    fireEvent.click(checkbox);

    // ParentService should be hidden because its direct dependent HighCautionDep is HIGH CAUTION
    expect(screen.queryByText("ParentService")).not.toBeInTheDocument();
    // HighCautionDep itself remains in HIGH CAUTION group
    expect(screen.getByText("HighCautionDep")).toBeInTheDocument();
  });
});
