import type { FocusState } from "../focus-graph";

export function fromQuery(
  params: URLSearchParams,
  nodeIdFallback: string | null = null,
): FocusState {
  const hasFocusParam = params.get("focus.enabled") === "true";
  const rawNodeId =
    params.get("focus.node") ||
    params.get("node") ||
    params.get("component") ||
    nodeIdFallback;
  const focusNodeId = rawNodeId ? rawNodeId : null;

  const focusDir =
    params.get("focus.direction") ||
    params.get("direction");
  const direction: "dependencies" | "dependents" | "both" =
    focusDir === "dependencies" ||
    focusDir === "dependents" ||
    focusDir === "both"
      ? focusDir
      : "both";

  const focusDepthRaw =
    params.get("focus.depth") ||
    params.get("depth");
  let depth: 1 | 2 | 3 | "ALL" = 2;
  if (focusDepthRaw === "ALL") {
    depth = "ALL";
  } else if (focusDepthRaw === "1") {
    depth = 1;
  } else if (focusDepthRaw === "2") {
    depth = 2;
  } else if (focusDepthRaw === "3") {
    depth = 3;
  }

  const enabled =
    hasFocusParam ||
    (Boolean(focusNodeId) &&
      (Boolean(params.get("direction")) || Boolean(params.get("depth"))));

  return {
    enabled,
    focusNodeId,
    direction,
    depth,
  };
}

export function toQuery(
  state: FocusState,
  params: URLSearchParams = new URLSearchParams(),
): URLSearchParams {
  if (state.enabled) {
    params.set("focus.enabled", "true");
    params.set("focus.direction", state.direction);
    params.set("focus.depth", String(state.depth));
    if (state.focusNodeId) {
      params.set("node", state.focusNodeId);
    }
  }
  return params;
}
