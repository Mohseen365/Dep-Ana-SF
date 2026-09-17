import { describe, it, expect } from "vitest";
import {
  filterQuery,
  focusQuery,
  impactQuery,
  findingsQuery,
  connectionQuery,
  investigationQuery,
  ConnectionDirection,
  ConnectionDepth,
} from "./index";

describe("URL Query Serializers", () => {
  describe("filterQuery", () => {
    it("parses empty query params with default values", () => {
      const params = new URLSearchParams();
      const result = filterQuery.fromQuery(params);
      expect(result.viewMode).toBe("graph");
      expect(result.filterState.searchQuery).toBe("");
      expect(result.filterState.typeFilter).toBe("");
      expect(result.filterState.riskFilter).toBe("");
      expect(result.filterState.hasCallouts).toBe(false);
      expect(result.filterState.withoutSharing).toBe(false);
      expect(result.filterState.hideTests).toBe(false);
      expect(result.filterState.hasAsyncPatterns).toBe(false);
    });

    it("round-trips filter state correctly", () => {
      const initial = {
        viewMode: "findings" as const,
        filterState: {
          searchQuery: "Account",
          typeFilter: "ApexClass" as const,
          riskFilter: "HIGH" as const,
          hasCallouts: true,
          withoutSharing: true,
          hideTests: true,
          hasAsyncPatterns: true,
        },
      };

      const params = filterQuery.toQuery(initial);
      const parsed = filterQuery.fromQuery(params);

      expect(parsed.viewMode).toBe(initial.viewMode);
      expect(parsed.filterState.searchQuery).toBe(initial.filterState.searchQuery);
      expect(parsed.filterState.typeFilter).toBe(initial.filterState.typeFilter);
      expect(parsed.filterState.riskFilter).toBe(initial.filterState.riskFilter);
      expect(parsed.filterState.hasCallouts).toBe(initial.filterState.hasCallouts);
      expect(parsed.filterState.withoutSharing).toBe(initial.filterState.withoutSharing);
      expect(parsed.filterState.hideTests).toBe(initial.filterState.hideTests);
      expect(parsed.filterState.hasAsyncPatterns).toBe(initial.filterState.hasAsyncPatterns);
    });

    it("safely falls back for invalid query values", () => {
      const params = new URLSearchParams(
        "view.mode=unknown&filter.type=InvalidType&filter.risk=ULTRA",
      );
      const result = filterQuery.fromQuery(params);

      expect(result.viewMode).toBe("graph");
      expect(result.filterState.typeFilter).toBe("");
      expect(result.filterState.riskFilter).toBe("");
    });
  });

  describe("focusQuery", () => {
    it("parses empty query params with default focus state", () => {
      const params = new URLSearchParams();
      const result = focusQuery.fromQuery(params);

      expect(result.enabled).toBe(false);
      expect(result.focusNodeId).toBeNull();
      expect(result.direction).toBe("both");
      expect(result.depth).toBe(2);
    });

    it("round-trips focus state with direction and depth options", () => {
      const depths: (1 | 2 | 3 | "ALL")[] = [1, 2, 3, "ALL"];
      const directions: ("dependencies" | "dependents" | "both")[] = [
        "dependencies",
        "dependents",
        "both",
      ];

      for (const depth of depths) {
        for (const direction of directions) {
          const focusState = {
            enabled: true,
            focusNodeId: "ApexClass:AccountService",
            direction,
            depth,
          };

          const params = focusQuery.toQuery(focusState);
          const parsed = focusQuery.fromQuery(params);

          expect(parsed.enabled).toBe(true);
          expect(parsed.focusNodeId).toBe("ApexClass:AccountService");
          expect(parsed.direction).toBe(direction);
          expect(parsed.depth).toBe(depth);
        }
      }
    });

    it("safely falls back for invalid focus values", () => {
      const params = new URLSearchParams(
        "focus.enabled=true&focus.direction=unknown&focus.depth=999",
      );
      const parsed = focusQuery.fromQuery(params, "FallbackNode");

      expect(parsed.enabled).toBe(true);
      expect(parsed.focusNodeId).toBe("FallbackNode");
      expect(parsed.direction).toBe("both");
      expect(parsed.depth).toBe(2);
    });
  });

  describe("impactQuery", () => {
    it("parses empty query params with default impact state", () => {
      const params = new URLSearchParams();
      const result = impactQuery.fromQuery(params);

      expect(result.enabled).toBe(false);
      expect(result.originNodeId).toBeNull();
      expect(result.depth).toBe("ALL");
    });

    it("round-trips impact state across depth levels", () => {
      const depths: (1 | 2 | 3 | "ALL")[] = [1, 2, 3, "ALL"];

      for (const depth of depths) {
        const impactState = {
          enabled: true,
          originNodeId: "ApexTrigger:OrderTrigger",
          depth,
        };

        const params = impactQuery.toQuery(impactState);
        const parsed = impactQuery.fromQuery(params);

        expect(parsed.enabled).toBe(true);
        expect(parsed.originNodeId).toBe("ApexTrigger:OrderTrigger");
        expect(parsed.depth).toBe(depth);
      }
    });

    it("safely falls back for invalid depth values", () => {
      const params = new URLSearchParams(
        "impact.enabled=true&impact.depth=invalid",
      );
      const parsed = impactQuery.fromQuery(params);

      expect(parsed.enabled).toBe(true);
      expect(parsed.depth).toBe("ALL");
    });
  });

  describe("findingsQuery", () => {
    it("parses empty query params with default findings state", () => {
      const params = new URLSearchParams();
      const result = findingsQuery.fromQuery(params);

      expect(result.diagnosticsTab).toBe("none");
      expect(result.selectedCycleId).toBeNull();
      expect(result.selectedUnresolvedEdgeId).toBeNull();
      expect(result.selectedFindingId).toBeNull();
    });

    it("round-trips selected finding and diagnostics state", () => {
      const initial = {
        diagnosticsTab: "cycles" as const,
        selectedCycleId: "cycle-12",
        selectedUnresolvedEdgeId: "edge-34",
        selectedFindingId: "finding:cycle:cycle-12",
      };

      const params = findingsQuery.toQuery(initial);
      const parsed = findingsQuery.fromQuery(params);

      expect(parsed).toEqual(initial);
    });

    it("supports legacy / alternate parameter keys for selected finding", () => {
      const p1 = new URLSearchParams("finding.id=finding-1");
      expect(findingsQuery.fromQuery(p1).selectedFindingId).toBe("finding-1");

      const p2 = new URLSearchParams("findingId=finding-2");
      expect(findingsQuery.fromQuery(p2).selectedFindingId).toBe("finding-2");
    });
  });

  describe("connectionQuery", () => {
    it("parses default state when query params are empty or missing", () => {
      const params = new URLSearchParams();
      const parsed = connectionQuery.fromQuery(params);

      expect(parsed.direction).toBe("both");
      expect(parsed.depth).toBe(2);
    });

    it("parses each direction value correctly (both, dependencies, dependents)", () => {
      const directions: ConnectionDirection[] = ["both", "dependencies", "dependents"];

      for (const dir of directions) {
        const params = new URLSearchParams(`conn.direction=${dir}`);
        const parsed = connectionQuery.fromQuery(params);
        expect(parsed.direction).toBe(dir);
      }
    });

    it("parses each depth value correctly (1, 2, 3, ALL)", () => {
      const depths: { raw: string; expected: ConnectionDepth }[] = [
        { raw: "1", expected: 1 },
        { raw: "2", expected: 2 },
        { raw: "3", expected: 3 },
        { raw: "ALL", expected: "ALL" },
      ];

      for (const { raw, expected } of depths) {
        const params = new URLSearchParams(`conn.depth=${raw}`);
        const parsed = connectionQuery.fromQuery(params);
        expect(parsed.depth).toBe(expected);
      }
    });

    it("round-trips connection direction and depth across all permutations", () => {
      const directions: ConnectionDirection[] = ["both", "dependencies", "dependents"];
      const depths: ConnectionDepth[] = [1, 2, 3, "ALL"];

      for (const direction of directions) {
        for (const depth of depths) {
          const state = { direction, depth };
          const params = connectionQuery.toQuery(state);
          const parsed = connectionQuery.fromQuery(params);

          expect(parsed.direction).toBe(direction);
          expect(parsed.depth).toBe(depth);
        }
      }
    });

    it("supports alternative parameter names for connection direction & depth", () => {
      const params1 = new URLSearchParams(
        "connection.direction=dependencies&connection.depth=1",
      );
      const parsed1 = connectionQuery.fromQuery(params1);
      expect(parsed1.direction).toBe("dependencies");
      expect(parsed1.depth).toBe(1);
    });

    it("verifies focus URL state does not alter connection state and connection state does not alter focus state", () => {
      // 1. Focus URL state does not alter connection state
      const focusOnlyParams = new URLSearchParams("focus.enabled=true&focus.direction=dependents&focus.depth=ALL");
      const connFromFocus = connectionQuery.fromQuery(focusOnlyParams);
      expect(connFromFocus.direction).toBe("both");
      expect(connFromFocus.depth).toBe(2);

      // 2. Connection URL state does not alter focus state
      const connOnlyParams = new URLSearchParams("conn.direction=dependencies&conn.depth=3");
      const focusFromConn = focusQuery.fromQuery(connOnlyParams);
      expect(focusFromConn.direction).toBe("both");
      expect(focusFromConn.depth).toBe(2);

      // 5. Both states coexist without interfering
      const coexistParams = new URLSearchParams(
        "focus.enabled=true&focus.direction=dependents&focus.depth=1&conn.direction=dependencies&conn.depth=3"
      );
      const focusCoexist = focusQuery.fromQuery(coexistParams);
      const connCoexist = connectionQuery.fromQuery(coexistParams);
      expect(focusCoexist.direction).toBe("dependents");
      expect(focusCoexist.depth).toBe(1);
      expect(connCoexist.direction).toBe("dependencies");
      expect(connCoexist.depth).toBe(3);
    });

    it("safely falls back for invalid direction value", () => {
      const params = new URLSearchParams("conn.direction=invalid_direction");
      const parsed = connectionQuery.fromQuery(params);

      expect(parsed.direction).toBe("both");
    });

    it("safely falls back for invalid depth value", () => {
      const params = new URLSearchParams("conn.depth=999");
      const parsed = connectionQuery.fromQuery(params);

      expect(parsed.depth).toBe(2);
    });

    it("preserves combined connection and existing URL state without corruption", () => {
      const combinedParams = new URLSearchParams(
        "node=ApexClass%3AAccountService&filter.q=Account&filter.type=ApexClass&conn.direction=dependencies&conn.depth=3&impact.enabled=true&diag.tab=cycles",
      );

      const connState = connectionQuery.fromQuery(combinedParams);
      expect(connState.direction).toBe("dependencies");
      expect(connState.depth).toBe(3);

      const filterState = filterQuery.fromQuery(combinedParams);
      expect(filterState.filterState.searchQuery).toBe("Account");
      expect(filterState.filterState.typeFilter).toBe("ApexClass");

      const impactState = impactQuery.fromQuery(combinedParams);
      expect(impactState.enabled).toBe(true);

      const findingsState = findingsQuery.fromQuery(combinedParams);
      expect(findingsState.diagnosticsTab).toBe("cycles");
    });

    it("serializes state deterministically across multiple calls", () => {
      const state = {
        direction: "dependents" as const,
        depth: 3 as const,
      };

      const params1 = connectionQuery.toQuery(state);
      const params2 = connectionQuery.toQuery(state);

      expect(params1.toString()).toBe(params2.toString());
      expect(params1.toString()).toBe("conn.direction=dependents&conn.depth=3");
    });
  });

  describe("investigationQuery", () => {
    it("round-trips investigation selection and status", () => {
      const state = {
        selectedInvestigationId: "inv-101",
        investigationStatus: "COMPLETED",
      };

      const params = investigationQuery.toQuery(state);
      const parsed = investigationQuery.fromQuery(params);

      expect(parsed).toEqual(state);
    });

    it("supports alternative keys for investigation ID", () => {
      const params = new URLSearchParams("inv.id=inv-202");
      const parsed = investigationQuery.fromQuery(params);

      expect(parsed.selectedInvestigationId).toBe("inv-202");
    });
  });
});
