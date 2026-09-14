import { describe, it, expect, beforeEach } from "vitest";
import { saveView, listViews, getView, deleteView } from "./views";
import { createEmptyFilterState } from "./search-filter";
import { createEmptyFocusState } from "./focus-graph";
import { createEmptyImpactState } from "./impact-analysis";

describe("Saved Views Library", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("saves and retrieves a view correctly", () => {
    const sampleState = {
      filter: createEmptyFilterState(),
      focus: createEmptyFocusState(),
      impact: createEmptyImpactState(),
      selectedNodeId: "ApexClass:MovieController",
      viewMode: "graph" as const
    };

    const created = saveView("My Test View", sampleState);
    expect(created.id).toBeDefined();
    expect(created.name).toBe("My Test View");
    expect(created.state.selectedNodeId).toBe("ApexClass:MovieController");

    const retrieved = getView(created.id);
    expect(retrieved).not.toBeNull();
    expect(retrieved?.name).toBe("My Test View");

    const list = listViews();
    expect(list.length).toBe(1);
    expect(list[0].id).toBe(created.id);
  });

  it("deletes a saved view", () => {
    const state = {
      filter: createEmptyFilterState(),
      focus: createEmptyFocusState(),
      impact: createEmptyImpactState(),
      selectedNodeId: null,
      viewMode: "findings" as const
    };

    const v1 = saveView("View 1", state);
    const v2 = saveView("View 2", state);

    expect(listViews().length).toBe(2);

    deleteView(v1.id);

    const remaining = listViews();
    expect(remaining.length).toBe(1);
    expect(remaining[0].id).toBe(v2.id);
    expect(getView(v1.id)).toBeNull();
  });

  it("handles corrupted JSON storage gracefully", () => {
    localStorage.setItem("explorer.views.v1", "corrupted { invalid json");

    expect(listViews()).toEqual([]);
    expect(getView("any-id")).toBeNull();

    // Can still save new views when storage was corrupted
    saveView("Fresh View", {
      filter: createEmptyFilterState(),
      focus: createEmptyFocusState(),
      impact: createEmptyImpactState(),
      selectedNodeId: null,
      viewMode: "graph"
    });

    expect(listViews().length).toBe(1);
    expect(listViews()[0].name).toBe("Fresh View");
  });
});
