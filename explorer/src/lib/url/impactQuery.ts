import type { ImpactState } from "../impact-analysis";

export function fromQuery(
  params: URLSearchParams,
  nodeIdFallback: string | null = null,
): ImpactState {
  const enabled = params.get("impact.enabled") === "true";
  const rawOriginId =
    params.get("impact.origin") ||
    params.get("impact.node") ||
    params.get("node") ||
    params.get("component") ||
    nodeIdFallback;
  const originNodeId = rawOriginId ? rawOriginId : null;

  const impactDepthRaw = params.get("impact.depth") || params.get("depth");
  let depth: 1 | 2 | 3 | "ALL" = "ALL";
  if (impactDepthRaw === "1") depth = 1;
  else if (impactDepthRaw === "2") depth = 2;
  else if (impactDepthRaw === "3") depth = 3;
  else if (impactDepthRaw === "ALL") depth = "ALL";

  return {
    enabled,
    originNodeId,
    depth,
  };
}

export function toQuery(
  state: ImpactState,
  params: URLSearchParams = new URLSearchParams(),
): URLSearchParams {
  if (state.enabled) {
    params.set("impact.enabled", "true");
    params.set("impact.depth", String(state.depth));
    if (state.originNodeId) {
      params.set("node", state.originNodeId);
    }
  }
  return params;
}
