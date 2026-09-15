import type { ProjectSnapshot, ProjectAnalysisHistory, ProjectMetadata, ExplorerDataSchema } from '../types/explorer';

const HISTORY_STORAGE_PREFIX = 'explorer.projectHistory.';

/**
 * Calculates delta metrics between a target snapshot and a reference/previous snapshot.
 */
export interface SnapshotDelta {
  componentDelta: number;
  dependencyDelta: number;
  highRiskDelta: number;
  cycleDelta: number;
}

export function calculateSnapshotDelta(
  target: ProjectSnapshot,
  previous?: ProjectSnapshot | null
): SnapshotDelta {
  if (!previous) {
    return {
      componentDelta: 0,
      dependencyDelta: 0,
      highRiskDelta: 0,
      cycleDelta: 0,
    };
  }

  return {
    componentDelta: target.componentCount - previous.componentCount,
    dependencyDelta: target.dependencyCount - previous.dependencyCount,
    highRiskDelta: (target.highRiskCount ?? 0) - (previous.highRiskCount ?? 0),
    cycleDelta: (target.cycleCount ?? 0) - (previous.cycleCount ?? 0),
  };
}

/**
 * Generates default project history timeline if none exists in storage.
 */
export function createDefaultProjectHistory(
  projectId: string,
  projectMeta?: ProjectMetadata | null,
  currentData?: ExplorerDataSchema | null
): ProjectAnalysisHistory {
  const currentComp = currentData?.summary.nodeCount ?? projectMeta?.componentCount ?? 428;
  const currentDep = currentData?.summary.edgeCount ?? projectMeta?.dependencyCount ?? 612;
  const currentHighRisk = currentData?.summary.highRiskCount ?? 12;
  const currentCycle = currentData?.summary.cycleCount ?? 2;

  const snap1: ProjectSnapshot = {
    id: `snap-${projectId}-sep14`,
    projectId,
    createdAt: new Date('2026-09-14T10:00:00Z').toISOString(),
    dateDisplay: 'Sep 14',
    componentCount: currentComp,
    dependencyCount: currentDep,
    highRiskCount: currentHighRisk,
    cycleCount: currentCycle,
    isActive: true,
    rawSchemaJson: currentData ? JSON.stringify(currentData, null, 2) : undefined,
  };

  const snap2: ProjectSnapshot = {
    id: `snap-${projectId}-sep12`,
    projectId,
    createdAt: new Date('2026-09-12T14:30:00Z').toISOString(),
    dateDisplay: 'Sep 12',
    componentCount: 421,
    dependencyCount: 597,
    highRiskCount: Math.max(0, currentHighRisk - 2),
    cycleCount: Math.max(0, currentCycle - 1),
    isActive: false,
  };

  const snap3: ProjectSnapshot = {
    id: `snap-${projectId}-sep08`,
    projectId,
    createdAt: new Date('2026-09-08T09:15:00Z').toISOString(),
    dateDisplay: 'Sep 08',
    componentCount: 403,
    dependencyCount: 561,
    highRiskCount: Math.max(0, currentHighRisk - 5),
    cycleCount: 0,
    isActive: false,
  };

  return {
    projectId,
    activeSnapshotId: snap1.id,
    snapshots: [snap1, snap2, snap3],
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Loads project analysis history from localStorage.
 */
export function loadProjectHistory(
  projectId: string,
  projectMeta?: ProjectMetadata | null,
  currentData?: ExplorerDataSchema | null
): ProjectAnalysisHistory {
  if (typeof localStorage === 'undefined') {
    return createDefaultProjectHistory(projectId, projectMeta, currentData);
  }

  try {
    const raw = localStorage.getItem(`${HISTORY_STORAGE_PREFIX}${projectId}`);
    if (!raw) {
      const defaultHistory = createDefaultProjectHistory(projectId, projectMeta, currentData);
      saveProjectHistory(defaultHistory);
      return defaultHistory;
    }

    const history = JSON.parse(raw) as ProjectAnalysisHistory;
    if (!history.snapshots || !Array.isArray(history.snapshots) || history.snapshots.length === 0) {
      const defaultHistory = createDefaultProjectHistory(projectId, projectMeta, currentData);
      saveProjectHistory(defaultHistory);
      return defaultHistory;
    }

    return history;
  } catch (e) {
    console.warn(`Failed to parse history for project ${projectId}`, e);
    return createDefaultProjectHistory(projectId, projectMeta, currentData);
  }
}

/**
 * Saves project analysis history to localStorage.
 */
export function saveProjectHistory(history: ProjectAnalysisHistory): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(`${HISTORY_STORAGE_PREFIX}${history.projectId}`, JSON.stringify(history));
  } catch (e) {
    console.warn(`Failed to save history for project ${history.projectId}`, e);
  }
}

/**
 * Sets the active snapshot in the project history.
 */
export function setActiveSnapshot(
  projectId: string,
  snapshotId: string,
  projectMeta?: ProjectMetadata | null,
  currentData?: ExplorerDataSchema | null
): ProjectAnalysisHistory {
  const history = loadProjectHistory(projectId, projectMeta, currentData);
  const updatedSnapshots = history.snapshots.map((snap) => ({
    ...snap,
    isActive: snap.id === snapshotId,
  }));

  const updatedHistory: ProjectAnalysisHistory = {
    ...history,
    activeSnapshotId: snapshotId,
    snapshots: updatedSnapshots,
    updatedAt: new Date().toISOString(),
  };

  saveProjectHistory(updatedHistory);
  return updatedHistory;
}

/**
 * Adds a new snapshot to the project history timeline.
 */
export function addSnapshotToHistory(
  projectId: string,
  snapshot: Omit<ProjectSnapshot, 'projectId' | 'id'> & { id?: string },
  projectMeta?: ProjectMetadata | null,
  currentData?: ExplorerDataSchema | null
): ProjectAnalysisHistory {
  const history = loadProjectHistory(projectId, projectMeta, currentData);
  const newId = snapshot.id ?? `snap-${projectId}-${Date.now()}`;

  const newSnap: ProjectSnapshot = {
    ...snapshot,
    id: newId,
    projectId,
    isActive: snapshot.isActive ?? true,
  };

  let updatedSnapshots = history.snapshots;
  if (newSnap.isActive) {
    updatedSnapshots = updatedSnapshots.map((s) => ({ ...s, isActive: false }));
  }

  // Prepend new snapshot
  updatedSnapshots = [newSnap, ...updatedSnapshots];

  const updatedHistory: ProjectAnalysisHistory = {
    ...history,
    activeSnapshotId: newSnap.isActive ? newId : history.activeSnapshotId,
    snapshots: updatedSnapshots,
    updatedAt: new Date().toISOString(),
  };

  saveProjectHistory(updatedHistory);
  return updatedHistory;
}
