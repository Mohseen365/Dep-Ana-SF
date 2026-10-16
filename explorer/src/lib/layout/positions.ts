import { Position, ResolvedPosition, resolveAuthoritativePosition } from '../position-policy';
import { ArchitectureLayoutMode } from '../../types/explorer';

export interface ResolvePositionOptions {
  session?: Map<string, Position> | Record<string, Position> | null;
  persisted?: Record<string, Position> | null;
  cy?: Position | null;
  mode?: ArchitectureLayoutMode;
  hasAuth?: boolean;
}

export function resolvePosition(
  id: string,
  options: ResolvePositionOptions = {}
): ResolvedPosition | null {
  const { session, persisted, cy, hasAuth = true } = options;

  return resolveAuthoritativePosition(id, {
    sessionPositions: session || undefined,
    persistedPositions: persisted || undefined,
    cyNodePosition: cy || undefined,
    hasAuthoritativePositions: hasAuth,
  });
}

export { resolveAuthoritativePosition };
export type { Position, ResolvedPosition };
