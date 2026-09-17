import { describe, it, expect } from "vitest";
import {
  searchNodes,
  filterNodesByType,
  filterNodesByRisk,
  filterGraphByNodeTypes,
  applyFilters,
  hasActiveFilters,
  getUniqueNodeTypes,
  getAvailableRiskLevels,
  createEmptyFilterState,
  SearchFilterState,
} from "./search-filter";
import { computeFocusedGraph } from "./focus-graph";
import {
  ExplorerNode,
  ExplorerEdge,
  ExplorerNodeType,
  ALL_EXPLORER_NODE_TYPES,
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
    expect(state.visibleNodeTypes).toEqual(ALL_EXPLORER_NODE_TYPES);
  });
});

describe("Graph Node-Type Visibility Filter", () => {
  const sampleTopologyNodes: ExplorerNode[] = [
    {
      id: "LWC:componentA",
      displayName: "componentA",
      type: "LWC",
      file: "force-app/lwc/componentA/componentA.js",
      metrics: { fanIn: 0, fanOut: 1, coupling: 1, unresolved: 0, score: 1 },
      risk: "LOW",
      riskReasons: [],
      behavior: { isTest: false, publicContractsCount: 1, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 },
      refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: "COVERED" },
    },
    {
      id: "ApexClass:ApexA",
      displayName: "ApexA",
      type: "ApexClass",
      file: "force-app/classes/ApexA.cls",
      metrics: { fanIn: 1, fanOut: 1, coupling: 2, unresolved: 0, score: 2 },
      risk: "MEDIUM",
      riskReasons: [],
      behavior: { isTest: false, publicContractsCount: 1, asyncPatterns: [], securitySignalsCount: 0, queryCount: 1, dmlCount: 0, calloutCount: 0 },
      refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: "COVERED" },
    },
    {
      id: "ApexTrigger:TriggerA",
      displayName: "TriggerA",
      type: "ApexTrigger",
      file: "force-app/triggers/TriggerA.trigger",
      metrics: { fanIn: 0, fanOut: 1, coupling: 1, unresolved: 0, score: 1 },
      risk: "LOW",
      riskReasons: [],
      behavior: { isTest: false, publicContractsCount: 0, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 },
      refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: "COVERED" },
    },
    {
      id: "Visualforce:VfPageA",
      displayName: "VfPageA",
      type: "Visualforce",
      file: "force-app/pages/VfPageA.page",
      metrics: { fanIn: 0, fanOut: 1, coupling: 1, unresolved: 0, score: 1 },
      risk: "LOW",
      riskReasons: [],
      behavior: { isTest: false, publicContractsCount: 0, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 },
      refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: "COVERED" },
    },
    {
      id: "Flow:FlowA",
      displayName: "FlowA",
      type: "Flow",
      file: "force-app/flows/FlowA.flow",
      metrics: { fanIn: 0, fanOut: 1, coupling: 1, unresolved: 0, score: 1 },
      risk: "LOW",
      riskReasons: [],
      behavior: { isTest: false, publicContractsCount: 0, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 },
      refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: "COVERED" },
    },
    {
      id: "Object:Account",
      displayName: "Account",
      type: "Object",
      file: "force-app/objects/Account/Account.object",
      metrics: { fanIn: 2, fanOut: 1, coupling: 3, unresolved: 0, score: 3 },
      risk: "LOW",
      riskReasons: [],
      behavior: { isTest: false, publicContractsCount: 0, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 },
      refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: "COVERED" },
    },
    {
      id: "CustomObject:CustomObj__c",
      displayName: "CustomObj__c",
      type: "CustomObject",
      file: "force-app/objects/CustomObj__c/CustomObj__c.object",
      metrics: { fanIn: 1, fanOut: 1, coupling: 2, unresolved: 0, score: 2 },
      risk: "LOW",
      riskReasons: [],
      behavior: { isTest: false, publicContractsCount: 0, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 },
      refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: "COVERED" },
    },
    {
      id: "Field:Account.Name",
      displayName: "Name",
      type: "Field",
      file: "force-app/objects/Account/fields/Name.field",
      metrics: { fanIn: 1, fanOut: 0, coupling: 1, unresolved: 0, score: 1 },
      risk: "LOW",
      riskReasons: [],
      behavior: { isTest: false, publicContractsCount: 0, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 },
      refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: "COVERED" },
    },
    {
      id: "CustomField:CustomObj__c.Field__c",
      displayName: "Field__c",
      type: "CustomField",
      file: "force-app/objects/CustomObj__c/fields/Field__c.field",
      metrics: { fanIn: 1, fanOut: 0, coupling: 1, unresolved: 0, score: 1 },
      risk: "LOW",
      riskReasons: [],
      behavior: { isTest: false, publicContractsCount: 0, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 },
      refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: "COVERED" },
    },
    {
      id: "External:PaymentGateway",
      displayName: "PaymentGateway",
      type: "External",
      file: "external/PaymentGateway",
      metrics: { fanIn: 1, fanOut: 0, coupling: 1, unresolved: 0, score: 1 },
      risk: "MEDIUM",
      riskReasons: [],
      behavior: { isTest: false, publicContractsCount: 0, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 1 },
      refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: "UNTESTED" },
    },
  ];

  const sampleTopologyEdges: ExplorerEdge[] = [
    {
      id: "e_lwc_apex",
      source: "LWC:componentA",
      target: "ApexClass:ApexA",
      relationshipType: "lwc-apex",
      method: "getData",
      evidence: "ApexA.getData()",
      unresolved: false,
      resolutionClassification: "RESOLVED_LOCAL",
      resolutionStrategy: "EXACT",
      confidence: "high",
      line: 10,
      column: 1,
      methodOwner: "componentA",
      file: "force-app/lwc/componentA/componentA.js",
      canonical: {
        source: { type: "LWC", name: "componentA" },
        target: { type: "ApexClass", name: "ApexA" },
        relationship: { type: "lwc-apex", resolution: "EXACT" },
        location: { line: 10, column: 1 },
      },
    },
    {
      id: "e_apex_obj",
      source: "ApexClass:ApexA",
      target: "Object:Account",
      relationshipType: "soql-object",
      method: "queryAccount",
      evidence: "SELECT Id FROM Account",
      unresolved: false,
      resolutionClassification: "RESOLVED_LOCAL",
      resolutionStrategy: "EXACT",
      confidence: "high",
      line: 20,
      column: 1,
      methodOwner: "getData",
      file: "force-app/classes/ApexA.cls",
      canonical: {
        source: { type: "ApexClass", name: "ApexA" },
        target: { type: "Object", name: "Account" },
        relationship: { type: "soql-object", resolution: "EXACT" },
        location: { line: 20, column: 1 },
      },
    },
    {
      id: "e_obj_field",
      source: "Object:Account",
      target: "Field:Account.Name",
      relationshipType: "field-reference",
      method: null,
      evidence: "Account.Name",
      unresolved: false,
      resolutionClassification: "RESOLVED_LOCAL",
      resolutionStrategy: "EXACT",
      confidence: "high",
      line: 21,
      column: 1,
      methodOwner: null,
      file: "force-app/objects/Account/Account.object",
      canonical: {
        source: { type: "Object", name: "Account" },
        target: { type: "Field", name: "Account.Name" },
        relationship: { type: "field-reference", resolution: "EXACT" },
        location: { line: 21, column: 1 },
      },
    },
    {
      id: "e_custom_obj_field",
      source: "CustomObject:CustomObj__c",
      target: "CustomField:CustomObj__c.Field__c",
      relationshipType: "field-reference",
      method: null,
      evidence: "CustomObj__c.Field__c",
      unresolved: false,
      resolutionClassification: "RESOLVED_LOCAL",
      resolutionStrategy: "EXACT",
      confidence: "high",
      line: 5,
      column: 1,
      methodOwner: null,
      file: "force-app/objects/CustomObj__c/CustomObj__c.object",
      canonical: {
        source: { type: "CustomObject", name: "CustomObj__c" },
        target: { type: "CustomField", name: "CustomObj__c.Field__c" },
        relationship: { type: "field-reference", resolution: "EXACT" },
        location: { line: 5, column: 1 },
      },
    },
    {
      id: "e_apex_ext",
      source: "ApexClass:ApexA",
      target: "External:PaymentGateway",
      relationshipType: "method-call",
      method: "process",
      evidence: "PaymentGateway.process()",
      unresolved: false,
      resolutionClassification: "RESOLVED_LOCAL",
      resolutionStrategy: "EXACT",
      confidence: "high",
      line: 30,
      column: 1,
      methodOwner: "getData",
      file: "force-app/classes/ApexA.cls",
      canonical: {
        source: { type: "ApexClass", name: "ApexA" },
        target: { type: "External", name: "PaymentGateway" },
        relationship: { type: "method-call", resolution: "EXACT" },
        location: { line: 30, column: 1 },
      },
    },
  ];

  it("1. All node types visible -> all nodes remain", () => {
    const res = filterGraphByNodeTypes(sampleTopologyNodes, sampleTopologyEdges, ALL_EXPLORER_NODE_TYPES);
    expect(res.nodes).toHaveLength(10);
    expect(res.edges).toHaveLength(5);
  });

  it("2. LWC only -> only LWC nodes remain", () => {
    const res = filterGraphByNodeTypes(sampleTopologyNodes, sampleTopologyEdges, ["LWC"]);
    expect(res.nodes).toHaveLength(1);
    expect(res.nodes[0].type).toBe("LWC");
    expect(res.edges).toHaveLength(0);
  });

  it("3. ApexClass only -> only ApexClass nodes remain", () => {
    const res = filterGraphByNodeTypes(sampleTopologyNodes, sampleTopologyEdges, ["ApexClass"]);
    expect(res.nodes).toHaveLength(1);
    expect(res.nodes[0].type).toBe("ApexClass");
    expect(res.edges).toHaveLength(0);
  });

  it("4. LWC + ApexClass -> only those types remain", () => {
    const res = filterGraphByNodeTypes(sampleTopologyNodes, sampleTopologyEdges, ["LWC", "ApexClass"]);
    expect(res.nodes).toHaveLength(2);
    const types = res.nodes.map((n) => n.type);
    expect(types).toContain("LWC");
    expect(types).toContain("ApexClass");
    expect(res.edges).toHaveLength(1);
    expect(res.edges[0].id).toBe("e_lwc_apex");
  });

  it("5. Objects disabled -> Object nodes removed", () => {
    const visibleTypes = ALL_EXPLORER_NODE_TYPES.filter((t) => t !== "Object");
    const res = filterGraphByNodeTypes(sampleTopologyNodes, sampleTopologyEdges, visibleTypes);
    expect(res.nodes.some((n) => n.type === "Object")).toBe(false);
    expect(res.edges.some((e) => e.source === "Object:Account" || e.target === "Object:Account")).toBe(false);
  });

  it("6. Fields disabled -> Field nodes removed", () => {
    const visibleTypes = ALL_EXPLORER_NODE_TYPES.filter((t) => t !== "Field");
    const res = filterGraphByNodeTypes(sampleTopologyNodes, sampleTopologyEdges, visibleTypes);
    expect(res.nodes.some((n) => n.type === "Field")).toBe(false);
    expect(res.edges.some((e) => e.target === "Field:Account.Name")).toBe(false);
  });

  it("7. CustomObject behavior", () => {
    const res = filterGraphByNodeTypes(sampleTopologyNodes, sampleTopologyEdges, ["CustomObject", "CustomField"]);
    expect(res.nodes.some((n) => n.type === "CustomObject")).toBe(true);
    expect(res.edges).toHaveLength(1);
    expect(res.edges[0].id).toBe("e_custom_obj_field");
  });

  it("8. CustomField behavior", () => {
    const resWithoutCustomField = filterGraphByNodeTypes(sampleTopologyNodes, sampleTopologyEdges, ["CustomObject"]);
    expect(resWithoutCustomField.nodes.some((n) => n.type === "CustomField")).toBe(false);
    expect(resWithoutCustomField.edges).toHaveLength(0);
  });

  it("9. External behavior", () => {
    const res = filterGraphByNodeTypes(sampleTopologyNodes, sampleTopologyEdges, ["ApexClass", "External"]);
    expect(res.nodes).toHaveLength(2);
    expect(res.edges).toHaveLength(1);
    expect(res.edges[0].id).toBe("e_apex_ext");
  });

  it("10. Empty visible-type set -> empty node/edge result", () => {
    const res = filterGraphByNodeTypes(sampleTopologyNodes, sampleTopologyEdges, []);
    expect(res.nodes).toHaveLength(0);
    expect(res.edges).toHaveLength(0);
  });

  it("11. Edge connected to hidden source -> removed", () => {
    // Hide LWC (source of e_lwc_apex)
    const res = filterGraphByNodeTypes(sampleTopologyNodes, sampleTopologyEdges, ["ApexClass", "Object"]);
    expect(res.edges.some((e) => e.id === "e_lwc_apex")).toBe(false);
  });

  it("12. Edge connected to hidden target -> removed", () => {
    // Hide Object (target of e_apex_obj)
    const res = filterGraphByNodeTypes(sampleTopologyNodes, sampleTopologyEdges, ["LWC", "ApexClass"]);
    expect(res.edges.some((e) => e.id === "e_apex_obj")).toBe(false);
  });

  it("13. Edge with both visible endpoints -> retained", () => {
    const res = filterGraphByNodeTypes(sampleTopologyNodes, sampleTopologyEdges, ["LWC", "ApexClass", "Object"]);
    expect(res.edges.some((e) => e.id === "e_lwc_apex")).toBe(true);
    expect(res.edges.some((e) => e.id === "e_apex_obj")).toBe(true);
  });

  it("Focus-depth topology preservation: computeFocusedGraph runs on raw graph first, then visibility filter applies", () => {
    // Multi-level chain: LWC:componentA -> ApexClass:ApexA -> Object:Account -> Field:Account.Name
    const focusState = {
      enabled: true,
      focusNodeId: "LWC:componentA",
      depth: 3 as const,
      direction: "both" as const,
    };

    // Step 1: Run computeFocusedGraph on raw topology (finds all 5 reachable nodes)
    const focused = computeFocusedGraph(sampleTopologyNodes, sampleTopologyEdges, focusState);
    expect(focused.nodes).toHaveLength(5); // LWC:componentA, ApexClass:ApexA, Object:Account, Field:Account.Name, External:PaymentGateway

    // Step 2: Apply node-type visibility filter (LWC + ApexClass only)
    const filtered = filterGraphByNodeTypes(focused.nodes, focused.edges, ["LWC", "ApexClass"]);

    expect(filtered.nodes).toHaveLength(2);
    const ids = filtered.nodes.map((n) => n.id);
    expect(ids).toContain("LWC:componentA");
    expect(ids).toContain("ApexClass:ApexA");
    expect(filtered.edges).toHaveLength(1);
    expect(filtered.edges[0].id).toBe("e_lwc_apex");
    // Prove zero dangling edges!
    expect(filtered.edges.every((e) => ids.includes(e.source) && ids.includes(e.target))).toBe(true);
  });
});
