import { describe, it, expect, beforeEach } from 'vitest';
import {
  createDefaultProjectHistory,
  loadProjectHistory,
  saveProjectHistory,
  setActiveSnapshot,
  addSnapshotToHistory,
  calculateSnapshotDelta,
} from './projectHistory';
import type { ProjectSnapshot } from '../types/explorer';

describe('projectHistory lib', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('creates default project history with expected timeline items', () => {
    const history = createDefaultProjectHistory('core-crm');

    expect(history.projectId).toBe('core-crm');
    expect(history.snapshots).toHaveLength(3);

    const [s1, s2, s3] = history.snapshots;

    expect(s1.dateDisplay).toBe('Sep 14');
    expect(s1.componentCount).toBe(428);
    expect(s1.dependencyCount).toBe(612);
    expect(s1.isActive).toBe(true);

    expect(s2.dateDisplay).toBe('Sep 12');
    expect(s2.componentCount).toBe(421);
    expect(s2.dependencyCount).toBe(597);
    expect(s2.isActive).toBe(false);

    expect(s3.dateDisplay).toBe('Sep 08');
    expect(s3.componentCount).toBe(403);
    expect(s3.dependencyCount).toBe(561);
    expect(s3.isActive).toBe(false);
  });

  it('calculates snapshot deltas accurately', () => {
    const snapTarget: ProjectSnapshot = {
      id: 'snap-1',
      projectId: 'core-crm',
      createdAt: new Date().toISOString(),
      dateDisplay: 'Sep 14',
      componentCount: 428,
      dependencyCount: 612,
      highRiskCount: 12,
      cycleCount: 2,
    };

    const snapPrev: ProjectSnapshot = {
      id: 'snap-2',
      projectId: 'core-crm',
      createdAt: new Date().toISOString(),
      dateDisplay: 'Sep 12',
      componentCount: 421,
      dependencyCount: 597,
      highRiskCount: 10,
      cycleCount: 1,
    };

    const delta = calculateSnapshotDelta(snapTarget, snapPrev);

    expect(delta.componentDelta).toBe(7);
    expect(delta.dependencyDelta).toBe(15);
    expect(delta.highRiskDelta).toBe(2);
    expect(delta.cycleDelta).toBe(1);
  });

  it('saves and loads project history from localStorage', () => {
    const history = createDefaultProjectHistory('billing-app');
    saveProjectHistory(history);

    const loaded = loadProjectHistory('billing-app');
    expect(loaded.projectId).toBe('billing-app');
    expect(loaded.snapshots).toHaveLength(3);
    expect(loaded.snapshots[0].dateDisplay).toBe('Sep 14');
  });

  it('updates active snapshot correctly', () => {
    const history = createDefaultProjectHistory('core-crm');
    saveProjectHistory(history);

    const updated = setActiveSnapshot('core-crm', 'snap-core-crm-sep12');

    expect(updated.activeSnapshotId).toBe('snap-core-crm-sep12');
    expect(updated.snapshots.find((s) => s.id === 'snap-core-crm-sep12')?.isActive).toBe(true);
    expect(updated.snapshots.find((s) => s.id === 'snap-core-crm-sep14')?.isActive).toBe(false);
  });

  it('adds a new snapshot to project history', () => {
    const history = createDefaultProjectHistory('core-crm');
    saveProjectHistory(history);

    const updated = addSnapshotToHistory('core-crm', {
      dateDisplay: 'Sep 16',
      createdAt: new Date('2026-09-16T12:00:00Z').toISOString(),
      componentCount: 435,
      dependencyCount: 620,
      isActive: true,
    });

    expect(updated.snapshots).toHaveLength(4);
    expect(updated.snapshots[0].dateDisplay).toBe('Sep 16');
    expect(updated.snapshots[0].componentCount).toBe(435);
    expect(updated.snapshots[0].isActive).toBe(true);
    expect(updated.snapshots[1].isActive).toBe(false);
  });
});
