export interface FindingsQueryState {
  diagnosticsTab: "cycles" | "unresolved" | "none";
  selectedCycleId: string | null;
  selectedUnresolvedEdgeId: string | null;
  selectedFindingId: string | null;
}

export function fromQuery(params: URLSearchParams): FindingsQueryState {
  const diagTabRaw = params.get("diag.tab");
  const diagnosticsTab: "cycles" | "unresolved" | "none" =
    diagTabRaw === "cycles" ||
    diagTabRaw === "unresolved" ||
    diagTabRaw === "none"
      ? diagTabRaw
      : "none";

  const selectedCycleId = params.get("diag.cycle") || null;
  const selectedUnresolvedEdgeId = params.get("diag.unresolved") || null;
  const selectedFindingId =
    params.get("finding") ||
    params.get("finding.id") ||
    params.get("findingId") ||
    null;

  return {
    diagnosticsTab,
    selectedCycleId,
    selectedUnresolvedEdgeId,
    selectedFindingId,
  };
}

export function toQuery(
  state: FindingsQueryState,
  params: URLSearchParams = new URLSearchParams(),
): URLSearchParams {
  if (state.diagnosticsTab !== "none") {
    params.set("diag.tab", state.diagnosticsTab);
  }
  if (state.selectedCycleId) {
    params.set("diag.cycle", state.selectedCycleId);
  }
  if (state.selectedUnresolvedEdgeId) {
    params.set("diag.unresolved", state.selectedUnresolvedEdgeId);
  }
  if (state.selectedFindingId) {
    params.set("finding", state.selectedFindingId);
  }
  return params;
}
