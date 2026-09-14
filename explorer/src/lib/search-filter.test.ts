import { describe, it, expect } from "vitest";
import {
  searchNodes,
  filterNodesByType,
  filterNodesByRisk,
  applyFilters,
  hasActiveFilters,
  getUniqueNodeTypes,
  getAvailableRiskLevels,
  createEmptyFilterState,
  SearchFilterState,
} from "./search-filter";
import {
  ExplorerNode,
  ExplorerEdge,
  ExplorerNodeType,
} from "../types/explorer";

const mockNodes: ExplorerNode[] = [
  {
    id: "ApexClass:AssetDashboardService",
    displayName: "AssetDashboardService",
    type: "ApexClass",
    file: "force-app/main/default/classes/AssetDashboardService.cls",
    metrics: { fanIn: 2, fanOut: 3, coupling: 5, unresolved: 1, score: 12 },
    risk: "HIGH",
    riskReasons: ["high coupling"],
    behavior: {
      isTest: false,
      sharing: "with sharing",
      publicContractsCount: 2,
      asyncPatterns: ["Queueable"],
      securitySignalsCount: 1,
      queryCount: 3,
      dmlCount: 1,
      calloutCount: 0,
    },
    refactoringReadiness: {
      isHighRisk: true,
      hasCycles: true,
      hasUnresolved: true,
      testCoverageStatus: "COVERED",
    },
  },
  {
    id: "ApexClass:AssetHelper",
    displayName: "AssetHelper",
    type: "ApexClass",
    file: "force-app/main/default/classes/AssetHelper.cls",
    metrics: { fanIn: 1, fanOut: 1, coupling: 2, unresolved: 0, score: 4 },
    risk: "MEDIUM",
    riskReasons: ["circular dependency"],
    behavior: {
      isTest: false,
      sharing: "with sharing",
      publicContractsCount: 0,
      asyncPatterns: [],
      securitySignalsCount: 0,
      queryCount: 1,
      dmlCount: 0,
      calloutCount: 0,
    },
    refactoringReadiness: {
      isHighRisk: false,
      hasCycles: true,
      hasUnresolved: false,
      testCoverageStatus: "COVERED",
    },
  },
  {
    id: "ApexClass:AssetDashboardServiceTest",
    displayName: "AssetDashboardServiceTest",
    type: "ApexClass",
    file: "force-app/main/default/classes/AssetDashboardServiceTest.cls",
    metrics: { fanIn: 0, fanOut: 1, coupling: 1, unresolved: 0, score: 1 },
    risk: "LOW",
    riskReasons: [],
    behavior: {
      isTest: true,
      sharing: null,
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
  },
  {
    id: "LWC:paymentComponent",
    displayName: "paymentComponent",
    type: "LWC",
    file: "force-app/main/default/lwc/paymentComponent/paymentComponent.js",
    metrics: { fanIn: 0, fanOut: 1, coupling: 1, unresolved: 0, score: 1 },
    risk: "LOW",
    riskReasons: [],
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
      isHighRisk: false,
      hasCycles: false,
      hasUnresolved: false,
      testCoverageStatus: "UNTESTED",
    },
  },
];

const mockEdges: ExplorerEdge[] = [
  {
    id: "edge1",
    source: "ApexClass:AssetDashboardService",
    target: "ApexClass:AssetHelper",
    relationshipType: "method-call",
    method: "calculateMetrics",
    evidence: "AssetHelper.calculateMetrics()",
    unresolved: false,
    resolutionClassification: "RESOLVED_LOCAL",
    resolutionStrategy: "EXACT",
    confidence: "high",
    line: 42,
    column: 9,
    methodOwner: "loadDashboardData",
    file: "force-app/main/default/classes/AssetDashboardService.cls",
    canonical: {
      source: {
        type: "ApexClass" as ExplorerNodeType,
        name: "AssetDashboardService",
        method: "loadDashboardData",
      },
      target: {
        type: "ApexClass" as ExplorerNodeType,
        name: "AssetHelper",
        method: "calculateMetrics",
      },
      relationship: { type: "method-call", resolution: "EXACT" as const },
      location: { line: 42, column: 9 },
    },
  },
];

describe("searchNodes", () => {
  describe("exact search", () => {
    it("should find node by exact displayName match", () => {
      const results = searchNodes(mockNodes, "AssetDashboardService", true);
      expect(results).toHaveLength(1);
      expect(results[0].node.displayName).toBe("AssetDashboardService");
    });

    it("should find node by exact id match", () => {
      const results = searchNodes(mockNodes, "ApexClass:AssetHelper", true);
      expect(results).toHaveLength(1);
      expect(results[0].node.displayName).toBe("AssetHelper");
    });

    it("should return empty for no exact match", () => {
      const results = searchNodes(mockNodes, "NonExistent", true);
      expect(results).toHaveLength(0);
    });
  });

  describe("partial search", () => {
    it("should find nodes by partial displayName match", () => {
      const results = searchNodes(mockNodes, "AssetDashboardService");
      expect(results).toHaveLength(2); // AssetDashboardService and AssetDashboardServiceTest
      const displayNames = results.map((r) => r.node.displayName);
      expect(displayNames).toContain("AssetDashboardService");
      expect(displayNames).toContain("AssetDashboardServiceTest");
    });

    it("should find nodes by partial file path match", () => {
      const results = searchNodes(mockNodes, "AssetHelper.cls");
      expect(results).toHaveLength(1);
      expect(results[0].node.displayName).toBe("AssetHelper");
    });

    it("should find nodes by type match", () => {
      const results = searchNodes(mockNodes, "LWC");
      expect(results).toHaveLength(1);
      expect(results[0].node.displayName).toBe("paymentComponent");
    });

    it("should find nodes by risk level match", () => {
      const results = searchNodes(mockNodes, "HIGH");
      expect(results).toHaveLength(1);
      expect(results[0].node.displayName).toBe("AssetDashboardService");
    });

    it("should return empty for no partial match", () => {
      const results = searchNodes(mockNodes, "xyz123");
      expect(results).toHaveLength(0);
    });

    it("should be case insensitive", () => {
      const results = searchNodes(mockNodes, "asset");
      expect(results.length).toBeGreaterThan(0);
    });
  });
});

describe("filterNodesByType", () => {
  it("should return all nodes when type is empty", () => {
    const results = filterNodesByType(mockNodes, "");
    expect(results).toHaveLength(mockNodes.length);
  });

  it("should filter nodes by type", () => {
    const results = filterNodesByType(
      mockNodes,
      "ApexClass" as ExplorerNodeType,
    );
    expect(results).toHaveLength(3);
    expect(results.every((n) => n.type === "ApexClass")).toBe(true);
  });

  it("should filter LWC nodes", () => {
    const results = filterNodesByType(mockNodes, "LWC" as ExplorerNodeType);
    expect(results).toHaveLength(1);
    expect(results[0].displayName).toBe("paymentComponent");
  });
});

describe("filterNodesByRisk", () => {
  it("should return all nodes when risk is empty", () => {
    const results = filterNodesByRisk(mockNodes, "");
    expect(results).toHaveLength(mockNodes.length);
  });

  it("should filter nodes by risk level", () => {
    const results = filterNodesByRisk(mockNodes, "HIGH");
    expect(results).toHaveLength(1);
    expect(results[0].displayName).toBe("AssetDashboardService");
  });

  it("should filter MEDIUM risk nodes", () => {
    const results = filterNodesByRisk(mockNodes, "MEDIUM");
    expect(results).toHaveLength(1);
    expect(results[0].displayName).toBe("AssetHelper");
  });

  it("should filter LOW risk nodes", () => {
    const results = filterNodesByRisk(mockNodes, "LOW");
    expect(results).toHaveLength(2);
  });
});
describe("Agent B behavior filters in applyFilters", () => {
  const nodeWithCallouts: ExplorerNode = {
    id: "ApexClass:MovieController",
    displayName: "MovieController",
    type: "ApexClass",
    file: "force-app/main/default/classes/MovieController.cls",
    metrics: { fanIn: 5, fanOut: 2, coupling: 7, unresolved: 0, score: 8 },
    risk: "MEDIUM",
    riskReasons: [],
    behavior: {
      isTest: false,
      sharing: "without sharing",
      publicContractsCount: 1,
      asyncPatterns: ["Batchable"],
      securitySignalsCount: 2,
      queryCount: 4,
      dmlCount: 2,
      calloutCount: 1,
    },
    refactoringReadiness: {
      isHighRisk: false,
      hasCycles: false,
      hasUnresolved: false,
      testCoverageStatus: "COVERED",
    },
  };

  const testNodes = [...mockNodes, nodeWithCallouts];

  it("should filter by hasCallouts", () => {
    const filterState: SearchFilterState = {
      ...createEmptyFilterState(),
      hasCallouts: true,
    };
    const result = applyFilters(testNodes, [], filterState);
    expect(result.nodes).toHaveLength(1);
    expect(result.nodes[0].displayName).toBe("MovieController");
  });

  it("should filter by withoutSharing", () => {
    const filterState: SearchFilterState = {
      ...createEmptyFilterState(),
      withoutSharing: true,
    };
    const result = applyFilters(testNodes, [], filterState);
    expect(result.nodes).toHaveLength(1);
    expect(result.nodes[0].displayName).toBe("MovieController");
  });

  it("should filter by hideTests", () => {
    const filterState: SearchFilterState = {
      ...createEmptyFilterState(),
      hideTests: true,
    };
    const result = applyFilters(testNodes, [], filterState);
    expect(result.nodes.some((n) => n.behavior.isTest)).toBe(false);
    expect(result.nodes).toHaveLength(4); // 5 total - 1 test node
  });

  it("should filter by hasAsyncPatterns", () => {
    const filterState: SearchFilterState = {
      ...createEmptyFilterState(),
      hasAsyncPatterns: true,
    };
    const result = applyFilters(testNodes, [], filterState);
    expect(result.nodes).toHaveLength(2); // AssetDashboardService (Queueable) and MovieController (Batchable)
    const names = result.nodes.map((n) => n.displayName);
    expect(names).toContain("AssetDashboardService");
    expect(names).toContain("MovieController");
  });
});
describe("applyFilters", () => {
  it("should return all nodes when no filters", () => {
    const filterState: SearchFilterState = {
      searchQuery: "",
      typeFilter: "",
      riskFilter: "",
    };
    const result = applyFilters(mockNodes, mockEdges, filterState);
    expect(result.nodes).toHaveLength(mockNodes.length);
    expect(result.edges).toHaveLength(mockEdges.length);
  });

  it("should apply type filter only", () => {
    const filterState: SearchFilterState = {
      searchQuery: "",
      typeFilter: "LWC" as ExplorerNodeType,
      riskFilter: "",
    };
    const result = applyFilters(mockNodes, mockEdges, filterState);
    expect(result.nodes).toHaveLength(1);
    expect(result.nodes[0].type).toBe("LWC");
  });

  it("should apply risk filter only", () => {
    const filterState: SearchFilterState = {
      searchQuery: "",
      typeFilter: "",
      riskFilter: "HIGH",
    };
    const result = applyFilters(mockNodes, mockEdges, filterState);
    expect(result.nodes).toHaveLength(1);
    expect(result.nodes[0].risk).toBe("HIGH");
  });

  it("should apply search query only", () => {
    const filterState: SearchFilterState = {
      searchQuery: "Asset",
      typeFilter: "",
      riskFilter: "",
    };
    const result = applyFilters(mockNodes, mockEdges, filterState);
    expect(result.nodes).toHaveLength(3); // matches all 3 ApexClasses starting with "Asset"
  });

  it("should combine search + type filter", () => {
    const filterState: SearchFilterState = {
      searchQuery: "Asset",
      typeFilter: "ApexClass" as ExplorerNodeType,
      riskFilter: "",
    };
    const result = applyFilters(mockNodes, mockEdges, filterState);
    expect(result.nodes).toHaveLength(3);
  });

  it("should combine search + risk filter", () => {
    const filterState: SearchFilterState = {
      searchQuery: "Asset",
      typeFilter: "",
      riskFilter: "HIGH",
    };
    const result = applyFilters(mockNodes, mockEdges, filterState);
    expect(result.nodes).toHaveLength(1);
    expect(result.nodes[0].displayName).toBe("AssetDashboardService");
  });

  it("should combine type + risk filter", () => {
    const filterState: SearchFilterState = {
      searchQuery: "",
      typeFilter: "ApexClass" as ExplorerNodeType,
      riskFilter: "MEDIUM",
    };
    const result = applyFilters(mockNodes, mockEdges, filterState);
    expect(result.nodes).toHaveLength(1);
    expect(result.nodes[0].displayName).toBe("AssetHelper");
  });

  it("should combine all three filters", () => {
    const filterState: SearchFilterState = {
      searchQuery: "Helper",
      typeFilter: "ApexClass" as ExplorerNodeType,
      riskFilter: "MEDIUM",
    };
    const result = applyFilters(mockNodes, mockEdges, filterState);
    expect(result.nodes).toHaveLength(1);
    expect(result.nodes[0].displayName).toBe("AssetHelper");
  });

  it("should filter edges to only include connected nodes", () => {
    const filterState: SearchFilterState = {
      searchQuery: "",
      typeFilter: "LWC" as ExplorerNodeType,
      riskFilter: "",
    };
    const result = applyFilters(mockNodes, mockEdges, filterState);
    // Edge connects ApexClass nodes, not LWC, so should be filtered out
    expect(result.edges).toHaveLength(0);
  });

  it("should return empty when no matches", () => {
    const filterState: SearchFilterState = {
      searchQuery: "NonExistent123",
      typeFilter: "",
      riskFilter: "",
    };
    const result = applyFilters(mockNodes, mockEdges, filterState);
    expect(result.nodes).toHaveLength(0);
    expect(result.edges).toHaveLength(0);
  });
});

describe("hasActiveFilters", () => {
  it("should return false for empty filters", () => {
    const filterState = createEmptyFilterState();
    expect(hasActiveFilters(filterState)).toBe(false);
  });

  it("should return true when search query is active", () => {
    const filterState: SearchFilterState = {
      searchQuery: "test",
      typeFilter: "",
      riskFilter: "",
    };
    expect(hasActiveFilters(filterState)).toBe(true);
  });

  it("should return true when type filter is active", () => {
    const filterState: SearchFilterState = {
      searchQuery: "",
      typeFilter: "ApexClass",
      riskFilter: "",
    };
    expect(hasActiveFilters(filterState)).toBe(true);
  });

  it("should return true when risk filter is active", () => {
    const filterState: SearchFilterState = {
      searchQuery: "",
      typeFilter: "",
      riskFilter: "HIGH",
    };
    expect(hasActiveFilters(filterState)).toBe(true);
  });
});

describe("getUniqueNodeTypes", () => {
  it("should return unique node types sorted", () => {
    const types = getUniqueNodeTypes(mockNodes);
    expect(types).toEqual(["ApexClass", "LWC"]);
  });
});

describe("getAvailableRiskLevels", () => {
  it("should return unique risk levels sorted", () => {
    const levels = getAvailableRiskLevels(mockNodes);
    expect(levels).toEqual(["HIGH", "LOW", "MEDIUM"]);
  });
});

describe("createEmptyFilterState", () => {
  it("should create empty filter state", () => {
    const state = createEmptyFilterState();
    expect(state.searchQuery).toBe("");
    expect(state.typeFilter).toBe("");
    expect(state.riskFilter).toBe("");
  });
});
