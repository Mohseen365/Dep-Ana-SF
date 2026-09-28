import { WorkspaceViewMode } from '../projectState';

export type WorkspaceDomain =
  | 'portfolio'
  | 'topological'
  | 'feature'
  | 'local'
  | 'governance';

export interface DomainDefinition {
  id: WorkspaceDomain;
  label: string;
  description: string;
  defaultViewMode: WorkspaceViewMode;
  viewModes: WorkspaceViewMode[];
}

export const WORKSPACE_DOMAINS: Record<WorkspaceDomain, DomainDefinition> = {
  portfolio: {
    id: 'portfolio',
    label: 'Portfolio & Health',
    description: 'Portfolio overview, comparison, and historical metrics',
    defaultViewMode: 'dashboard',
    viewModes: ['dashboard', 'compare', 'history'],
  },
  topological: {
    id: 'topological',
    label: 'Topological Structure',
    description: 'Graph connectivity, branching, and spatial routes',
    defaultViewMode: 'graph',
    viewModes: ['graph', 'subway', 'constellation', 'tree', 'treemap'],
  },
  feature: {
    id: 'feature',
    label: 'Feature Relationships',
    description: 'Feature coupling matrices, heatmaps, rivers, and barcodes',
    defaultViewMode: 'matrix',
    viewModes: ['matrix', 'heatmap', 'river', 'dna'],
  },
  local: {
    id: 'local',
    label: 'Local Neighborhood',
    description: 'Component profiles, radar health, and 4-direction neighborhood',
    defaultViewMode: 'profile',
    viewModes: ['profile', 'radar', 'four-direction'],
  },
  governance: {
    id: 'governance',
    label: 'Governance & Quality',
    description: 'Rule violation findings, hotspot risk, and cycle diagnostics',
    defaultViewMode: 'findings',
    viewModes: ['findings', 'hotspots', 'diagnostics'],
  },
};

const VIEW_TO_DOMAIN_MAP: Record<WorkspaceViewMode, WorkspaceDomain> = {
  dashboard: 'portfolio',
  compare: 'portfolio',
  history: 'portfolio',

  graph: 'topological',
  subway: 'topological',
  constellation: 'topological',
  tree: 'topological',
  treemap: 'topological',

  matrix: 'feature',
  heatmap: 'feature',
  river: 'feature',
  dna: 'feature',

  profile: 'local',
  radar: 'local',
  'four-direction': 'local',

  findings: 'governance',
  hotspots: 'governance',
  diagnostics: 'governance',
};

export function getDomainForViewMode(viewMode: WorkspaceViewMode): WorkspaceDomain {
  return VIEW_TO_DOMAIN_MAP[viewMode] || 'topological';
}

export function getDefaultViewModeForDomain(domain: WorkspaceDomain): WorkspaceViewMode {
  return WORKSPACE_DOMAINS[domain]?.defaultViewMode || 'graph';
}

export function isViewModeInDomain(viewMode: WorkspaceViewMode, domain: WorkspaceDomain): boolean {
  return WORKSPACE_DOMAINS[domain]?.viewModes.includes(viewMode) ?? false;
}
