export type ConnectionDirection = "both" | "dependencies" | "dependents";
export type ConnectionDepth = 1 | 2 | 3 | "ALL";

export interface ConnectionQueryState {
  direction: ConnectionDirection;
  depth: ConnectionDepth;
}

export const DEFAULT_CONNECTION_STATE: ConnectionQueryState = {
  direction: "both",
  depth: 2,
};

export function fromQuery(params: URLSearchParams): ConnectionQueryState {
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
    direction,
    depth,
  };
}

export function toQuery(
  state: ConnectionQueryState,
  params: URLSearchParams = new URLSearchParams(),
): URLSearchParams {
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