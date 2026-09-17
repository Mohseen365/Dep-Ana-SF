import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { SearchFilterPanel } from "./SearchFilterPanel";
import { createEmptyFilterState } from "../lib/search-filter";
import { ALL_EXPLORER_NODE_TYPES, ExplorerNode, ExplorerNodeType } from "../types/explorer";

const mockNodes: ExplorerNode[] = [
  {
    id: "LWC:paymentComponent",
    displayName: "paymentComponent",
    type: "LWC",
    file: "force-app/lwc/paymentComponent.js",
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
      testCoverageStatus: "UNTESTED",
    },
  },
];

describe("SearchFilterPanel - Graph Node-Type Visibility Controls", () => {
  it("renders graph visibility panel and defaults to 10/10 enabled types", () => {
    const filterState = createEmptyFilterState();
    const onFilterChange = vi.fn();

    render(
      <SearchFilterPanel
        nodes={mockNodes}
        filterState={filterState}
        quickFilter="all"
        sortOption="risk"
        onFilterChange={onFilterChange}
        onQuickFilterChange={vi.fn()}
        onSortOptionChange={vi.fn()}
        onSelectResult={vi.fn()}
      />
    );

    expect(screen.getByText("Graph Canvas Visibility")).toBeInTheDocument();
    expect(screen.getByTestId("graph-visibility-counter")).toHaveTextContent("10/10");
  });

  it("toggling individual checkbox calls onFilterChange with updated visibleNodeTypes", () => {
    const filterState = createEmptyFilterState();
    const onFilterChange = vi.fn();

    render(
      <SearchFilterPanel
        nodes={mockNodes}
        filterState={filterState}
        quickFilter="all"
        sortOption="risk"
        onFilterChange={onFilterChange}
        onQuickFilterChange={vi.fn()}
        onSortOptionChange={vi.fn()}
        onSelectResult={vi.fn()}
      />
    );

    // Uncheck LWC
    const lwcCheckbox = screen.getByLabelText("Toggle LWC visibility on graph");
    expect(lwcCheckbox).toBeChecked();

    fireEvent.click(lwcCheckbox);

    expect(onFilterChange).toHaveBeenCalledTimes(1);
    const updatedFilterState = onFilterChange.mock.calls[0][0];
    expect(updatedFilterState.visibleNodeTypes).not.toContain("LWC");
    expect(updatedFilterState.visibleNodeTypes).toHaveLength(9);
  });

  it("clicking Clear All node types sets visibleNodeTypes to empty array", () => {
    const filterState = createEmptyFilterState();
    const onFilterChange = vi.fn();

    render(
      <SearchFilterPanel
        nodes={mockNodes}
        filterState={filterState}
        quickFilter="all"
        sortOption="risk"
        onFilterChange={onFilterChange}
        onQuickFilterChange={vi.fn()}
        onSortOptionChange={vi.fn()}
        onSelectResult={vi.fn()}
      />
    );

    const clearAllBtn = screen.getByTestId("clear-all-node-types-btn");
    fireEvent.click(clearAllBtn);

    expect(onFilterChange).toHaveBeenCalledWith(
      expect.objectContaining({
        visibleNodeTypes: [],
      })
    );
  });

  it("clicking Select All node types sets visibleNodeTypes to ALL_EXPLORER_NODE_TYPES", () => {
    const filterState = {
      ...createEmptyFilterState(),
      visibleNodeTypes: ["LWC" as ExplorerNodeType],
    };
    const onFilterChange = vi.fn();

    render(
      <SearchFilterPanel
        nodes={mockNodes}
        filterState={filterState}
        quickFilter="all"
        sortOption="risk"
        onFilterChange={onFilterChange}
        onQuickFilterChange={vi.fn()}
        onSortOptionChange={vi.fn()}
        onSelectResult={vi.fn()}
      />
    );

    expect(screen.getByTestId("graph-visibility-counter")).toHaveTextContent("1/10");

    const selectAllBtn = screen.getByTestId("select-all-node-types-btn");
    fireEvent.click(selectAllBtn);

    expect(onFilterChange).toHaveBeenCalledWith(
      expect.objectContaining({
        visibleNodeTypes: ALL_EXPLORER_NODE_TYPES,
      })
    );
  });
});
