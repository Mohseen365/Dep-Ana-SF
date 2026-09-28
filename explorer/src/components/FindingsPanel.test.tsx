import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { FindingsPanel } from "./FindingsPanel";
import type { ArchitectureFinding } from "../lib/intelligence";
import { getResolved, formatFindingReviewItem, resolveFinding } from "../lib/annotations";

const sampleFindings: ArchitectureFinding[] = [
  {
    id: "finding:high-fan-in:ApexClass:MovieController",
    type: "HIGH_FAN_IN_HUB",
    severity: "HIGH",
    title: "MovieController is a high fan-in hub (9 dependents)",
    description: "Component MovieController has 9 incoming dependencies, exceeding threshold.",
    nodeIds: ["ApexClass:MovieController"],
    edgeIds: ["edge-1", "edge-2"],
    evidence: [
      {
        file: "../../Movie-App/force-app/main/default/classes/MovieController.cls",
        line: 12,
        snippet: "@AuraEnabled public static List<Movie__c> getMovies()",
        description: "Public controller contract"
      }
    ],
    provenance: {
      origin: "DERIVED_RULE",
      source: "high-fan-in-hub",
      facts: { fanIn: 9 }
    },
    rule: {
      ruleId: "high-fan-in-hub",
      ruleVersion: "1.0.0",
      name: "High Fan-In Hub"
    }
  },
  {
    id: "finding:unresolved:unresolved-1",
    type: "UNRESOLVED_REFERENCE",
    severity: "MEDIUM",
    title: "Unresolved reference to ExternalService",
    description: "Component references missing target ExternalService.",
    nodeIds: ["ApexClass:MovieController"],
    edgeIds: ["edge-unresolved-1"],
    evidence: [
      {
        file: "classes/MovieController.cls",
        line: 45,
        snippet: "ExternalService.call()",
        description: "Missing package component"
      }
    ],
    provenance: {
      origin: "CONTRACT_FACT",
      source: "unresolved-ref",
      facts: {}
    },
    rule: {
      ruleId: "unresolved-ref",
      ruleVersion: "1.0.0",
      name: "Unresolved Reference"
    }
  }
];

describe("FindingsPanel Component", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("renders empty state when findings list is empty", () => {
    render(
      <FindingsPanel
        findings={[]}
        selectedFindingId={null}
        onSelectFinding={vi.fn()}
        onClearSelection={vi.fn()}
      />
    );

    expect(screen.getByText("No findings")).toBeInTheDocument();
  });

  it("renders findings grouped by severity and selects row on click", () => {
    const onSelectFinding = vi.fn();

    render(
      <FindingsPanel
        findings={sampleFindings}
        selectedFindingId={null}
        onSelectFinding={onSelectFinding}
        onClearSelection={vi.fn()}
      />
    );

    expect(screen.getByText("MovieController is a high fan-in hub (9 dependents)")).toBeInTheDocument();
    expect(screen.getByText("Unresolved reference to ExternalService")).toBeInTheDocument();

    const titleEl = screen.getByText("MovieController is a high fan-in hub (9 dependents)");
    fireEvent.click(titleEl);

    expect(onSelectFinding).toHaveBeenCalledWith(sampleFindings[0]);
  });

  it("expands evidence list when expand toggle button is clicked", () => {
    render(
      <FindingsPanel
        findings={sampleFindings}
        selectedFindingId={null}
        onSelectFinding={vi.fn()}
        onClearSelection={vi.fn()}
      />
    );

    expect(screen.queryByText("Open in editor")).not.toBeInTheDocument();

    const expandButtons = screen.getAllByTitle("Expand Evidence");
    fireEvent.click(expandButtons[0]);

    expect(screen.getByText("Open in editor")).toBeInTheDocument();
    expect(screen.getByText("@AuraEnabled public static List<Movie__c> getMovies()")).toBeInTheDocument();
  });

  it("triggers Investigate callback and selects component node without implicit navigation, and triggers Explore on explicit click", () => {
    const onSelectFinding = vi.fn();
    const onInvestigateNode = vi.fn();
    const onExploreInGraph = vi.fn();

    render(
      <FindingsPanel
        findings={sampleFindings}
        selectedFindingId={null}
        onSelectFinding={onSelectFinding}
        onClearSelection={vi.fn()}
        onInvestigateNode={onInvestigateNode}
        onExploreInGraph={onExploreInGraph}
      />
    );

    const selectBtn = screen.getAllByText(/Select MovieController/i)[0];
    fireEvent.click(selectBtn);

    expect(onSelectFinding).toHaveBeenCalledWith(sampleFindings[0]);
    expect(onInvestigateNode).toHaveBeenCalledWith("ApexClass:MovieController");
    expect(onExploreInGraph).not.toHaveBeenCalled();

    const exploreBtn = screen.getAllByText(/Explore in Graph/i)[0];
    fireEvent.click(exploreBtn);

    expect(onExploreInGraph).toHaveBeenCalledWith("ApexClass:MovieController");
  });

  it("supports inline Resolve and Reopen review workflow actions", () => {
    render(
      <FindingsPanel
        findings={sampleFindings}
        selectedFindingId={null}
        onSelectFinding={vi.fn()}
        onClearSelection={vi.fn()}
      />
    );

    expect(formatFindingReviewItem(sampleFindings[0]).status).toBe("OPEN");

    const resolveBtn = screen.getAllByText("✓ Resolve")[0];
    fireEvent.click(resolveBtn);

    expect(getResolved().length).toBe(1);
    expect(formatFindingReviewItem(sampleFindings[0]).status).toBe("RESOLVED");

    // Click Resolved status filter tab to view resolved findings
    const resolvedTab = screen.getByRole("button", { name: /^Resolved \(/i });
    fireEvent.click(resolvedTab);

    const reopenBtn = screen.getByText("🔄 Reopen");
    fireEvent.click(reopenBtn);

    expect(formatFindingReviewItem(sampleFindings[0]).status).toBe("OPEN");
  });

  it("filters findings by Unresolved, Resolved, and All status filters", () => {
    // Pre-resolve one finding
    resolveFinding(sampleFindings[0]);

    render(
      <FindingsPanel
        findings={sampleFindings}
        selectedFindingId={null}
        onSelectFinding={vi.fn()}
        onClearSelection={vi.fn()}
      />
    );

    // Default status filter is UNRESOLVED -> only unresolved finding displayed
    expect(screen.queryByText("MovieController is a high fan-in hub (9 dependents)")).not.toBeInTheDocument();
    expect(screen.getByText("Unresolved reference to ExternalService")).toBeInTheDocument();

    // Switch to RESOLVED tab
    fireEvent.click(screen.getByRole("button", { name: /^Resolved \(/i }));
    expect(screen.getByText("MovieController is a high fan-in hub (9 dependents)")).toBeInTheDocument();
    expect(screen.queryByText("Unresolved reference to ExternalService")).not.toBeInTheDocument();

    // Switch to ALL tab
    fireEvent.click(screen.getByRole("button", { name: /^All \(/i }));
    expect(screen.getByText("MovieController is a high fan-in hub (9 dependents)")).toBeInTheDocument();
    expect(screen.getByText("Unresolved reference to ExternalService")).toBeInTheDocument();
  });
});
