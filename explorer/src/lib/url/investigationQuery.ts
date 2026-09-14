export interface InvestigationQueryState {
  selectedInvestigationId: string | null;
  investigationStatus: string | null;
}

export function fromQuery(params: URLSearchParams): InvestigationQueryState {
  const selectedInvestigationId =
    params.get("investigation") ||
    params.get("investigation.id") ||
    params.get("inv.id") ||
    params.get("investigationId") ||
    null;
  const investigationStatus =
    params.get("inv.status") || params.get("investigation.status") || null;

  return {
    selectedInvestigationId,
    investigationStatus,
  };
}

export function toQuery(
  state: InvestigationQueryState,
  params: URLSearchParams = new URLSearchParams(),
): URLSearchParams {
  if (state.selectedInvestigationId) {
    params.set("investigation", state.selectedInvestigationId);
  }
  if (state.investigationStatus) {
    params.set("inv.status", state.investigationStatus);
  }
  return params;
}
