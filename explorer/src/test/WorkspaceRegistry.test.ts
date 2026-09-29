import { describe, it, expect } from 'vitest';
import {
  LENS_REGISTRY,
  SURFACE_REGISTRY,
  getLensDefinition,
  getSurfaceDefinition,
  getWorkspaceDefinition,
  isLensMode,
  isSurfaceMode,
  getAllLenses,
  getAllSurfaces,
  getAllWorkspaceModes,
} from '../registry/workspace-registry';
import { getDomainForViewMode } from '../lib/router/domain-mapping';

describe('Workspace Registry Contracts', () => {
  it('contains exactly 12 interactive visualization lenses', () => {
    const lenses = getAllLenses();
    expect(lenses).toHaveLength(12);
    expect(Object.keys(LENS_REGISTRY)).toHaveLength(12);
  });

  it('contains exactly 6 supporting workflow surfaces', () => {
    const surfaces = getAllSurfaces();
    expect(surfaces).toHaveLength(6);
    expect(Object.keys(SURFACE_REGISTRY)).toHaveLength(6);
  });

  it('combines to exactly 18 total workspace modes with zero duplicate IDs', () => {
    const modes = getAllWorkspaceModes();
    expect(modes).toHaveLength(18);
    const uniqueModes = new Set(modes);
    expect(uniqueModes.size).toBe(18);
  });

  it('enforces canonical domain mapping consistency across all 18 modes', () => {
    const modes = getAllWorkspaceModes();
    modes.forEach((mode) => {
      const def = getWorkspaceDefinition(mode);
      expect(def).toBeDefined();
      expect(def?.domain).toBe(getDomainForViewMode(mode));
    });
  });

  it('ensures every registry entry has a valid React component', () => {
    const modes = getAllWorkspaceModes();
    modes.forEach((mode) => {
      const def = getWorkspaceDefinition(mode);
      expect(def?.component).toBeDefined();
      expect(typeof def?.component).toMatch(/function|object/);
    });
  });

  it('correctly classifies modes as lens vs surface', () => {
    expect(isLensMode('graph')).toBe(true);
    expect(isSurfaceMode('graph')).toBe(false);

    expect(isLensMode('matrix')).toBe(true);
    expect(isSurfaceMode('matrix')).toBe(false);

    expect(isLensMode('dashboard')).toBe(false);
    expect(isSurfaceMode('dashboard')).toBe(true);

    expect(isLensMode('findings')).toBe(false);
    expect(isSurfaceMode('findings')).toBe(true);
  });

  it('provides lookup functions getLensDefinition, getSurfaceDefinition, getWorkspaceDefinition', () => {
    expect(getLensDefinition('graph')?.id).toBe('graph');
    expect(getLensDefinition('dashboard')).toBeUndefined();

    expect(getSurfaceDefinition('dashboard')?.id).toBe('dashboard');
    expect(getSurfaceDefinition('graph')).toBeUndefined();

    expect(getWorkspaceDefinition('radar')?.id).toBe('radar');
    expect(getWorkspaceDefinition('hotspots')?.id).toBe('hotspots');
  });

  it('populates capabilities accurately according to lens/surface contracts', () => {
    const graphDef = getLensDefinition('graph');
    expect(graphDef?.capabilities.supportsNodeSelection).toBe(true);
    expect(graphDef?.capabilities.supportsEdgeSelection).toBe(true);

    const constellationDef = getLensDefinition('constellation');
    expect(constellationDef?.capabilities.supportsSubjectSelection).toBe(true);

    const dashboardDef = getSurfaceDefinition('dashboard');
    expect(dashboardDef?.capabilities.supportsExplicitGraphExploration).toBe(true);
  });
});
