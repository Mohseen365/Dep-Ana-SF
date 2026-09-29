import React from 'react';
import { WorkspaceViewMode } from '../lib/projectState';
import { WorkspaceDomain, getDomainForViewMode } from '../lib/router/domain-mapping';

import { GraphSlot } from '../components/GraphSlot';
import { SubwayPanel } from '../components/SubwayPanel';
import { DependencyConstellationPanel } from '../components/DependencyConstellationPanel';
import { FeatureTreePanel } from '../components/FeatureTreePanel';
import { ArchitectureTreemapPanel } from '../components/ArchitectureTreemapPanel';
import { FeatureMatrixPanel } from '../components/FeatureMatrixPanel';
import { CouplingHeatmapPanel } from '../components/CouplingHeatmapPanel';
import { DependencyRiverPanel } from '../components/DependencyRiverPanel';
import { ArchitectureDNABarcode } from '../components/ArchitectureDNABarcode';
import { FeatureProfilePanel } from '../components/FeatureProfilePanel';
import { RadarPanel } from '../components/RadarPanel';
import { FourDirectionPanel } from '../components/FourDirectionPanel';

import { ProjectDashboard } from '../components/ProjectDashboard';
import { ComparePanel } from '../components/ComparePanel';
import { AnalysisHistoryPanel } from '../components/AnalysisHistoryPanel';
import { FindingsPanel } from '../components/findings/FindingsPanel';
import { HotspotPanel } from '../components/HotspotPanel';
import { DiagnosticsPanel } from '../components/DiagnosticsPanel';

export interface LensCapabilities {
  supportsNodeSelection: boolean;
  supportsEdgeSelection: boolean;
  supportsSubjectSelection: boolean;
  supportsFiltering: boolean;
  supportsExplicitGraphExploration: boolean;
  supportsDeepLink: boolean;
}

export interface SurfaceCapabilities {
  supportsNodeSelection: boolean;
  supportsFiltering: boolean;
  supportsExplicitGraphExploration: boolean;
  supportsDeepLink: boolean;
}

export interface LensDefinition {
  id: WorkspaceViewMode;
  domain: WorkspaceDomain;
  label: string;
  icon: string;
  title: string;
  capabilities: LensCapabilities;
  component: React.ComponentType<any>;
}

export interface SurfaceDefinition {
  id: WorkspaceViewMode;
  domain: WorkspaceDomain;
  label: string;
  icon: string;
  title: string;
  capabilities: SurfaceCapabilities;
  component: React.ComponentType<any>;
}

export type WorkspaceDefinition = LensDefinition | SurfaceDefinition;

/**
 * Interactive Visualization Lens Registry
 * Exactly 12 entries across Topological, Feature Relationships, and Local Neighborhood domains.
 */
export const LENS_REGISTRY: Record<string, LensDefinition> = {
  graph: {
    id: 'graph',
    domain: getDomainForViewMode('graph'),
    label: 'Graph',
    icon: '🕸️',
    title: 'Interactive Dependency Graph Canvas',
    capabilities: {
      supportsNodeSelection: true,
      supportsEdgeSelection: true,
      supportsSubjectSelection: false,
      supportsFiltering: true,
      supportsExplicitGraphExploration: false,
      supportsDeepLink: true,
    },
    component: GraphSlot,
  },
  subway: {
    id: 'subway',
    domain: getDomainForViewMode('subway'),
    label: 'Subway',
    icon: '🚇',
    title: 'Feature Subway Routes & Component Transfer Stations',
    capabilities: {
      supportsNodeSelection: true,
      supportsEdgeSelection: false,
      supportsSubjectSelection: false,
      supportsFiltering: true,
      supportsExplicitGraphExploration: true,
      supportsDeepLink: true,
    },
    component: SubwayPanel,
  },
  constellation: {
    id: 'constellation',
    domain: getDomainForViewMode('constellation'),
    label: 'Constellation',
    icon: '🌌',
    title: 'Dependency Constellation Radial Lens',
    capabilities: {
      supportsNodeSelection: true,
      supportsEdgeSelection: false,
      supportsSubjectSelection: true,
      supportsFiltering: true,
      supportsExplicitGraphExploration: false,
      supportsDeepLink: true,
    },
    component: DependencyConstellationPanel,
  },
  tree: {
    id: 'tree',
    domain: getDomainForViewMode('tree'),
    label: 'Tree',
    icon: '🌳',
    title: 'Feature Hierarchy Tree Lens',
    capabilities: {
      supportsNodeSelection: true,
      supportsEdgeSelection: false,
      supportsSubjectSelection: false,
      supportsFiltering: true,
      supportsExplicitGraphExploration: false,
      supportsDeepLink: true,
    },
    component: FeatureTreePanel,
  },
  treemap: {
    id: 'treemap',
    domain: getDomainForViewMode('treemap'),
    label: 'Treemap',
    icon: '🗺️',
    title: 'Architecture Treemap Spatial Lens',
    capabilities: {
      supportsNodeSelection: true,
      supportsEdgeSelection: false,
      supportsSubjectSelection: false,
      supportsFiltering: true,
      supportsExplicitGraphExploration: true,
      supportsDeepLink: true,
    },
    component: ArchitectureTreemapPanel,
  },
  matrix: {
    id: 'matrix',
    domain: getDomainForViewMode('matrix'),
    label: 'Matrix',
    icon: '🧩',
    title: 'Feature Dependency Matrix Lens',
    capabilities: {
      supportsNodeSelection: true,
      supportsEdgeSelection: false,
      supportsSubjectSelection: false,
      supportsFiltering: true,
      supportsExplicitGraphExploration: true,
      supportsDeepLink: true,
    },
    component: FeatureMatrixPanel,
  },
  heatmap: {
    id: 'heatmap',
    domain: getDomainForViewMode('heatmap'),
    label: 'Heatmap',
    icon: '🌡️',
    title: 'Feature Coupling Heatmap Lens',
    capabilities: {
      supportsNodeSelection: true,
      supportsEdgeSelection: false,
      supportsSubjectSelection: false,
      supportsFiltering: true,
      supportsExplicitGraphExploration: true,
      supportsDeepLink: true,
    },
    component: CouplingHeatmapPanel,
  },
  river: {
    id: 'river',
    domain: getDomainForViewMode('river'),
    label: 'River',
    icon: '🌊',
    title: 'Dependency River / Sankey Macro Flow Lens',
    capabilities: {
      supportsNodeSelection: true,
      supportsEdgeSelection: false,
      supportsSubjectSelection: false,
      supportsFiltering: true,
      supportsExplicitGraphExploration: false,
      supportsDeepLink: true,
    },
    component: DependencyRiverPanel,
  },
  dna: {
    id: 'dna',
    domain: getDomainForViewMode('dna'),
    label: 'DNA',
    icon: '🧬',
    title: 'Architecture DNA / Barcode Multi-Band Lens',
    capabilities: {
      supportsNodeSelection: true,
      supportsEdgeSelection: false,
      supportsSubjectSelection: false,
      supportsFiltering: true,
      supportsExplicitGraphExploration: false,
      supportsDeepLink: true,
    },
    component: ArchitectureDNABarcode,
  },
  profile: {
    id: 'profile',
    domain: getDomainForViewMode('profile'),
    label: 'Profile',
    icon: '👤',
    title: 'Component Architecture Profile Lens',
    capabilities: {
      supportsNodeSelection: true,
      supportsEdgeSelection: false,
      supportsSubjectSelection: true,
      supportsFiltering: true,
      supportsExplicitGraphExploration: false,
      supportsDeepLink: true,
    },
    component: FeatureProfilePanel,
  },
  radar: {
    id: 'radar',
    domain: getDomainForViewMode('radar'),
    label: 'Radar',
    icon: '🎯',
    title: 'Architecture Radar Multi-Dimensional Lens',
    capabilities: {
      supportsNodeSelection: true,
      supportsEdgeSelection: false,
      supportsSubjectSelection: true,
      supportsFiltering: true,
      supportsExplicitGraphExploration: false,
      supportsDeepLink: true,
    },
    component: RadarPanel,
  },
  'four-direction': {
    id: 'four-direction',
    domain: getDomainForViewMode('four-direction'),
    label: 'Four-Dir',
    icon: '🧭',
    title: 'Four-Direction Cardinal Neighborhood Lens',
    capabilities: {
      supportsNodeSelection: true,
      supportsEdgeSelection: false,
      supportsSubjectSelection: true,
      supportsFiltering: true,
      supportsExplicitGraphExploration: false,
      supportsDeepLink: true,
    },
    component: FourDirectionPanel,
  },
};

/**
 * Supporting Workflow Surface Registry
 * Exactly 6 entries across Portfolio & Health and Governance & Quality domains.
 */
export const SURFACE_REGISTRY: Record<string, SurfaceDefinition> = {
  dashboard: {
    id: 'dashboard',
    domain: getDomainForViewMode('dashboard'),
    label: 'Overview',
    icon: '📊',
    title: 'Project Portfolio & Overview Dashboard',
    capabilities: {
      supportsNodeSelection: false,
      supportsFiltering: false,
      supportsExplicitGraphExploration: true,
      supportsDeepLink: true,
    },
    component: ProjectDashboard,
  },
  compare: {
    id: 'compare',
    domain: getDomainForViewMode('compare'),
    label: 'Compare',
    icon: '🔍',
    title: 'Architecture Snapshot Diff Comparison',
    capabilities: {
      supportsNodeSelection: true,
      supportsFiltering: false,
      supportsExplicitGraphExploration: false,
      supportsDeepLink: true,
    },
    component: ComparePanel,
  },
  history: {
    id: 'history',
    domain: getDomainForViewMode('history'),
    label: 'History',
    icon: '📜',
    title: 'Project Analysis History & Timeline',
    capabilities: {
      supportsNodeSelection: false,
      supportsFiltering: false,
      supportsExplicitGraphExploration: false,
      supportsDeepLink: true,
    },
    component: AnalysisHistoryPanel,
  },
  findings: {
    id: 'findings',
    domain: getDomainForViewMode('findings'),
    label: 'Findings',
    icon: '📋',
    title: 'Architecture Rule Findings',
    capabilities: {
      supportsNodeSelection: true,
      supportsFiltering: false,
      supportsExplicitGraphExploration: true,
      supportsDeepLink: true,
    },
    component: FindingsPanel,
  },
  hotspots: {
    id: 'hotspots',
    domain: getDomainForViewMode('hotspots'),
    label: 'Hotspots',
    icon: '🔥',
    title: 'Architectural Hotspots & Refactoring Readiness',
    capabilities: {
      supportsNodeSelection: true,
      supportsFiltering: false,
      supportsExplicitGraphExploration: true,
      supportsDeepLink: true,
    },
    component: HotspotPanel,
  },
  diagnostics: {
    id: 'diagnostics',
    domain: getDomainForViewMode('diagnostics'),
    label: 'Diagnostics',
    icon: '⚡',
    title: 'Circular Dependencies & Unresolved References',
    capabilities: {
      supportsNodeSelection: true,
      supportsFiltering: false,
      supportsExplicitGraphExploration: false,
      supportsDeepLink: true,
    },
    component: DiagnosticsPanel,
  },
};

/**
 * Registry Helper Functions
 */

export function getLensDefinition(id: WorkspaceViewMode): LensDefinition | undefined {
  return LENS_REGISTRY[id];
}

export function getSurfaceDefinition(id: WorkspaceViewMode): SurfaceDefinition | undefined {
  return SURFACE_REGISTRY[id];
}

export function getWorkspaceDefinition(id: WorkspaceViewMode): WorkspaceDefinition | undefined {
  return LENS_REGISTRY[id] || SURFACE_REGISTRY[id];
}

export function isLensMode(id: WorkspaceViewMode): boolean {
  return id in LENS_REGISTRY;
}

export function isSurfaceMode(id: WorkspaceViewMode): boolean {
  return id in SURFACE_REGISTRY;
}

export function getAllLenses(): LensDefinition[] {
  return Object.values(LENS_REGISTRY);
}

export function getAllSurfaces(): SurfaceDefinition[] {
  return Object.values(SURFACE_REGISTRY);
}

export function getAllWorkspaceModes(): WorkspaceViewMode[] {
  return [...Object.keys(LENS_REGISTRY), ...Object.keys(SURFACE_REGISTRY)] as WorkspaceViewMode[];
}
