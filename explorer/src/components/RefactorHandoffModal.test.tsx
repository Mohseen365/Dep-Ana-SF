import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DetailsPanel } from "./DetailsPanel";
import { ExplorerNode, ExplorerNodeType } from "../types/explorer";

const mockNode: ExplorerNode = {
  id: "ApexClass:OrderController",
  displayName: "OrderController",
  type: "ApexClass" as ExplorerNodeType,
  file: "force-app/main/default/classes/OrderController.cls",
  metrics: {
    fanIn: 2,
    fanOut: 4,
    coupling: 6,
    unresolved: 0,
    score: 5,
  },
  risk: "MEDIUM",
  riskReasons: ["moderate coupling"],
  behavior: {
    isTest: false,
    sharing: "with sharing",
    publicContractsCount: 3,
    queryCount: 2,
    dmlCount: 1,
    asyncPatterns: [],
    securitySignalsCount: 0,
    calloutCount: 0,
  },
  refactoringReadiness: {
    isHighRisk: false,
    hasCycles: false,
    hasUnresolved: false,
    testCoverageStatus: "COVERED",
  },
};

describe("Refactor Handoff UX Integration", () => {
  let postMessageSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    postMessageSpy = vi.spyOn(window.parent, "postMessage").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the '⚡ Refactor in LiteLLM' button in DetailsPanel readiness card", () => {
    render(
      <DetailsPanel
        node={mockNode}
        edge={null}
        impactSummary={null}
        onClose={() => {}}
      />
    );

    const button = screen.getByText("⚡ Refactor in LiteLLM");
    expect(button).toBeInTheDocument();
  });

  it("handles valid selected component target resolution cleanly", () => {
    render(
      <DetailsPanel
        node={mockNode}
        edge={null}
        impactSummary={null}
        onClose={() => {}}
      />
    );

    const button = screen.getByText("⚡ Refactor in LiteLLM");
    fireEvent.click(button);

    // Confirmation modal should open with canonical target identity details
    expect(screen.getByText("Confirm Refactor Handoff")).toBeInTheDocument();
    expect(screen.getByText("ApexClass:OrderController")).toBeInTheDocument();
    expect(screen.getAllByText("OrderController").length).toBeGreaterThan(0);
    expect(screen.getAllByText("ApexClass").length).toBeGreaterThan(0);
    expect(screen.getAllByText("force-app/main/default/classes/OrderController.cls").length).toBeGreaterThan(0);
  });

  it("rejects invalid or stale target component selection without opening modal", () => {
    const invalidNode = {
      ...mockNode,
      id: "   ",
      displayName: "",
    };

    render(
      <DetailsPanel
        node={invalidNode}
        edge={null}
        impactSummary={null}
        onClose={() => {}}
      />
    );

    const button = screen.getByText("⚡ Refactor in LiteLLM");
    fireEvent.click(button);

    expect(screen.queryByText("Confirm Refactor Handoff")).not.toBeInTheDocument();
    expect(screen.getByText(/Invalid or stale target component/i)).toBeInTheDocument();
    expect(postMessageSpy).not.toHaveBeenCalled();
  });

  it("enforces explicit confirmation boundary before handoff action completes", () => {
    render(
      <DetailsPanel
        node={mockNode}
        edge={null}
        impactSummary={null}
        onClose={() => {}}
      />
    );

    // Initial click opens confirmation boundary modal only
    fireEvent.click(screen.getByText("⚡ Refactor in LiteLLM"));
    expect(screen.getByText("Confirm Refactor Handoff")).toBeInTheDocument();
    expect(postMessageSpy).not.toHaveBeenCalled();

    // Clicking cancel closes modal without handoff
    fireEvent.click(screen.getByText("Cancel"));
    expect(screen.queryByText("Confirm Refactor Handoff")).not.toBeInTheDocument();
    expect(postMessageSpy).not.toHaveBeenCalled();
  });

  it("dispatches correct postMessage payload when in iframe context and confirmed", () => {
    // Simulate iframe environment
    const originalParent = window.parent;
    const fakeParent = { postMessage: vi.fn() };
    Object.defineProperty(window, "parent", {
      value: fakeParent,
      writable: true,
      configurable: true,
    });

    render(
      <DetailsPanel
        node={mockNode}
        edge={null}
        impactSummary={null}
        onClose={() => {}}
      />
    );

    fireEvent.click(screen.getByText("⚡ Refactor in LiteLLM"));
    fireEvent.click(screen.getByText("Confirm & Send to Dashboard"));

    expect(fakeParent.postMessage).toHaveBeenCalledWith(
      {
        type: "OPEN_COMPONENT_MODAL",
        targetComponentId: "ApexClass:OrderController",
        componentName: "OrderController",
        componentType: "ApexClass",
        sourceFile: "force-app/main/default/classes/OrderController.cls",
        nodeId: "ApexClass:OrderController",
        component: "OrderController",
      },
      "*"
    );

    Object.defineProperty(window, "parent", {
      value: originalParent,
      writable: true,
      configurable: true,
    });
  });

  it("ensures selecting handoff action performs no direct destructive modifications", () => {
    render(
      <DetailsPanel
        node={mockNode}
        edge={null}
        impactSummary={null}
        onClose={() => {}}
      />
    );

    fireEvent.click(screen.getByText("⚡ Refactor in LiteLLM"));
    expect(screen.getByText(/selecting this action does NOT modify source code directly/i)).toBeInTheDocument();

    fireEvent.click(screen.getByText("Confirm & Send to Dashboard"));
    expect(screen.getByText(/Standalone handoff confirmed for OrderController/i)).toBeInTheDocument();
  });
});
