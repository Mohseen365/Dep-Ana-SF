import { Position, ResolvedPosition, resolveAuthoritativePosition } from '../position-policy';

export interface ResolvePositionOptions {
  hasAuth: boolean;
  session?: Map<string, Position> | Record<string, Position> | null;
  persisted?: Record<string, Position> | null;
  cy?: Position | null;
}

export function resolvePosition(
  id: string,
  options: ResolvePositionOptions
): ResolvedPosition | null {
  const { session, persisted, cy, hasAuth } = options;

  return resolveAuthoritativePosition(id, {
    sessionPositions: session || undefined,
    persistedPositions: persisted || undefined,
    cyNodePosition: cy || undefined,
    hasAuthoritativePositions: hasAuth,
  });
}

export { resolveAuthoritativePosition };
export type { Position, ResolvedPosition };
