import { describe, it, expect, beforeEach } from 'vitest';
import {
  getPreferences,
  updatePreferences,
  migratePreferences,
  createDefaultPreferences,
  STORAGE_KEY,
  CURRENT_PREFERENCES_VERSION,
} from './preferences';

describe('User Preferences & Migration Library', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns default preferences when localStorage is empty', () => {
    const prefs = getPreferences();
    expect(prefs.version).toBe(CURRENT_PREFERENCES_VERSION);
    expect(prefs.lastInvestigationView).toBeNull();
    expect(prefs.panelPreferences.sidebarCollapsed).toBe(false);
    expect(prefs.onboardingDismissed).toBe(false);
    expect(prefs.annotationReviewState.reviewedNodeIds).toEqual([]);
  });

  it('persists and retrieves updated user preferences', () => {
    updatePreferences({
      lastInvestigationView: 'findings',
      onboardingDismissed: true,
      panelPreferences: {
        sidebarCollapsed: true,
        detailsCollapsed: true,
        diagnosticsTab: 'cycles',
      },
      annotationReviewState: {
        reviewedNodeIds: ['ApexClass:AccountService'],
        reviewStatusByNodeId: {
          'ApexClass:AccountService': 'APPROVED',
        },
      },
    });

    const retrieved = getPreferences();
    expect(retrieved.lastInvestigationView).toBe('findings');
    expect(retrieved.onboardingDismissed).toBe(true);
    expect(retrieved.panelPreferences.sidebarCollapsed).toBe(true);
    expect(retrieved.panelPreferences.diagnosticsTab).toBe('cycles');
    expect(retrieved.annotationReviewState.reviewedNodeIds).toContain('ApexClass:AccountService');
    expect(retrieved.annotationReviewState.reviewStatusByNodeId['ApexClass:AccountService']).toBe('APPROVED');
  });

  it('migrates unversioned (v0) preference payloads smoothly', () => {
    const v0Legacy = {
      lastInvestigationView: 'findings',
      onboardingDismissed: true,
      panelPreferences: {
        sidebarCollapsed: true,
      },
      annotationReviewState: {
        reviewedNodeIds: ['ApexClass:LegacyNode'],
        reviewStatusByNodeId: {
          'ApexClass:LegacyNode': 'NEEDS_REVIEW',
        },
      },
    };

    const migrated = migratePreferences(v0Legacy);
    expect(migrated.version).toBe(1);
    expect(migrated.lastInvestigationView).toBe('findings');
    expect(migrated.onboardingDismissed).toBe(true);
    expect(migrated.panelPreferences.sidebarCollapsed).toBe(true);
    expect(migrated.annotationReviewState.reviewedNodeIds).toEqual(['ApexClass:LegacyNode']);
    expect(migrated.annotationReviewState.reviewStatusByNodeId['ApexClass:LegacyNode']).toBe('NEEDS_REVIEW');
  });

  it('handles corrupted localStorage JSON gracefully without throwing', () => {
    localStorage.setItem(STORAGE_KEY, 'corrupted json { invalid');

    const prefs = getPreferences();
    expect(prefs).toEqual(createDefaultPreferences());
  });

  it('ensures no heavy graph snapshot payloads are stored in preferences', () => {
    updatePreferences({
      onboardingDismissed: true,
    });

    const raw = localStorage.getItem(STORAGE_KEY) || '';
    expect(raw).not.toContain('nodes');
    expect(raw).not.toContain('edges');
    expect(raw).not.toContain('explorerData');
  });
});
