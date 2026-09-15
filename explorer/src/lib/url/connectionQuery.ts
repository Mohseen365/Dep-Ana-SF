export type ConnectionDirection = "both" | "dependencies" | "dependents";
export type ConnectionDepth = 1 | 2 | 3 | "ALL";

export interface ConnectionQueryState {
  enabled?: boolean;
  originNodeId?: string | null;
  direction: ConnectionDirection;
  depth: ConnectionDepth;
}

export const DEFAULT_CONNECTION_STATE: ConnectionQueryState = {
  enabled: false,
  originNodeId: null,
  direction: "both",
  depth: 2,
};

export function fromQuery(params: URLSearchParams): ConnectionQueryState {
  const enabledParam = params.get("conn.enabled") || params.get("connection.enabled");
  const hasConnParams =
    Boolean(params.get("conn.direction")) ||
    Boolean(params.get("connection.direction")) ||
    Boolean(params.get("conn.depth")) ||
    Boolean(params.get("connection.depth"));

  const enabled = enabledParam === "true" || (enabledParam !== "false" && hasConnParams);

  const originNodeId = params.get("conn.origin") || params.get("connection.origin") || null;

  const dirParam =
    params.get("conn.direction") ||
    params.get("connection.direction") ||
    params.get("conn.dir");

  const direction: ConnectionDirection =
    dirParam === "dependencies" ||
    dirParam === "dependents" ||
    dirParam === "both"
      ? dirParam
      : DEFAULT_CONNECTION_STATE.direction;

  const depthParam =
    params.get("conn.depth") ||
    params.get("connection.depth");

  let depth: ConnectionDepth = DEFAULT_CONNECTION_STATE.depth;

  if (depthParam === "ALL") {
    depth = "ALL";
  } else if (depthParam === "1") {
    depth = 1;
  } else if (depthParam === "2") {
    depth = 2;
  } else if (depthParam === "3") {
    depth = 3;
  }

  return {
    enabled,
    originNodeId,
    direction,
    depth,
  };
}

export function toQuery(
  state: ConnectionQueryState,
  params: URLSearchParams = new URLSearchParams(),
): URLSearchParams {
  if (state.enabled) {
    params.set("conn.enabled", "true");
  } else {
    params.delete("conn.enabled");
  }

  if (state.originNodeId) {
    params.set("conn.origin", state.originNodeId);
  } else {
    params.delete("conn.origin");
  }

  if (state.direction !== DEFAULT_CONNECTION_STATE.direction) {
    params.set("conn.direction", state.direction);
  } else {
    params.delete("conn.direction");
  }

  if (state.depth !== DEFAULT_CONNECTION_STATE.depth) {
    params.set("conn.depth", String(state.depth));
  } else {
    params.delete("conn.depth");
  }

  return params;
}
