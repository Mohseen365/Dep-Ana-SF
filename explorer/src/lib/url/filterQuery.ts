import { createEmptyFilterState, SearchFilterState } from "../search-filter";
import type { ExplorerNodeType, ExplorerRiskLevel } from "../../types/explorer";
import type { WorkspaceViewMode } from "../projectState";
import { getWorkspaceDefinition } from "../../registry/workspace-registry";

export interface ViewAndFilterQueryState {
  viewMode: WorkspaceViewMode;
  filterState: SearchFilterState;
}

export type FilterQueryState = ViewAndFilterQueryState;

const VALID_TYPES: Set<string> = new Set([
  "ApexClass",
  "ApexTrigger",
  "Flow",
  "LWC",
  "Aura",
  "FlexiPage",
  "CustomObject",
  "CustomField",
  "Object",
  "Field",
  "External",
]);

const VALID_RISKS: Set<ExplorerRiskLevel> = new Set([
  "HIGH",
  "MEDIUM",
  "LOW",
]);

export function fromQuery(params: URLSearchParams): ViewAndFilterQueryState {
  const viewModeParam =
    params.get("view") ||
    params.get("view.mode") ||
    params.get("viewMode");

  let viewMode: WorkspaceViewMode = "graph";
  if (viewModeParam && getWorkspaceDefinition(viewModeParam as WorkspaceViewMode)) {
    viewMode = viewModeParam as WorkspaceViewMode;
  }

  const filterState = createEmptyFilterState();

  const search =
    params.get("filter.q") ||
    params.get("filter.search") ||
    params.get("search");

  if (search) {
    filterState.searchQuery = search;
  }

  const typeParam =
    params.get("filter.type") ||
    params.get("type");

  if (typeParam && VALID_TYPES.has(typeParam)) {
    filterState.typeFilter = typeParam as ExplorerNodeType;
  }

  const riskParam =
    params.get("filter.risk") ||
    params.get("risk");

  if (riskParam && VALID_RISKS.has(riskParam as ExplorerRiskLevel)) {
    filterState.riskFilter = riskParam as ExplorerRiskLevel;
  }

  if (
    params.get("filter.hasCallouts") === "true" ||
    params.get("filter.callouts") === "true" ||
    params.get("hasCallouts") === "true"
  ) {
    filterState.hasCallouts = true;
  }

  if (
    params.get("filter.withoutSharing") === "true" ||
    params.get("withoutSharing") === "true"
  ) {
    filterState.withoutSharing = true;
  }

  if (
    params.get("filter.hideTests") === "true" ||
    params.get("hideTests") === "true"
  ) {
    filterState.hideTests = true;
  }

  if (
    params.get("filter.hasAsyncPatterns") === "true" ||
    params.get("filter.async") === "true" ||
    params.get("hasAsync") === "true"
  ) {
    filterState.hasAsyncPatterns = true;
  }

  return {
    viewMode,
    filterState,
  };
}

export function toQuery(
  state: ViewAndFilterQueryState,
  params: URLSearchParams = new URLSearchParams(),
): URLSearchParams {
  if (state.viewMode !== "graph") {
    params.set("view", state.viewMode);
  }

  const f = state.filterState;

  if (f.searchQuery) {
    params.set("filter.q", f.searchQuery);
  }

  if (f.typeFilter) {
    params.set("filter.type", f.typeFilter);
  }

  if (f.riskFilter) {
    params.set("filter.risk", f.riskFilter);
  }

  if (f.hasCallouts) {
    params.set("filter.hasCallouts", "true");
  }

  if (f.withoutSharing) {
    params.set("filter.withoutSharing", "true");
  }

  if (f.hideTests) {
    params.set("filter.hideTests", "true");
  }

  if (f.hasAsyncPatterns) {
    params.set("filter.hasAsyncPatterns", "true");
  }

  return params;
}
