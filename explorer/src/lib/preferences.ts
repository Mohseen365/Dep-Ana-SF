/**
 * Lightweight User Preferences Module
 *
 * Persists user UX preferences in localStorage with versioning, automatic schema migration,
 * and robust error handling.
 *
 * Directives:
 * - Do NOT persist heavy architecture snapshots.
 * - Do NOT duplicate URL state parameter schema.
 */

export interface PanelPreferences {
  sidebarCollapsed: boolean;
  detailsCollapsed?: boolean;
  diagnosticsTab?: 'cycles' | 'unresolved' | 'none';
}

export type ReviewStatus = 'APPROVED' | 'NEEDS_REVIEW' | 'FLAGGED';

export interface AnnotationReviewState {
  reviewedNodeIds: string[];
  reviewStatusByNodeId: Record<string, ReviewStatus>;
}

export interface UserPreferences {
  version: number;
  lastInvestigationView: 'graph' | 'findings' | null;
  panelPreferences: PanelPreferences;
  annotationReviewState: AnnotationReviewState;
  onboardingDismissed: boolean;
}

export const CURRENT_PREFERENCES_VERSION = 1;
export const STORAGE_KEY = 'explorer.preferences.v1';

export function createDefaultPreferences(): UserPreferences {
  return {
    version: CURRENT_PREFERENCES_VERSION,
    lastInvestigationView: null,
    panelPreferences: {
      sidebarCollapsed: false,
      detailsCollapsed: false,
      diagnosticsTab: 'none',
    },
    annotationReviewState: {
      reviewedNodeIds: [],
      reviewStatusByNodeId: {},
    },
    onboardingDismissed: false,
  };
}

/**
 * Migration handler to upgrade older stored preference payloads safely.
 */
export function migratePreferences(rawParsed: any): UserPreferences {
  const defaults = createDefaultPreferences();

  if (!rawParsed || typeof rawParsed !== 'object') {
    return defaults;
  }

  // Handle version 0 (raw object without explicit version number) or legacy formats
  const version = typeof rawParsed.version === 'number' ? rawParsed.version : 0;

  let migrated: UserPreferences = { ...defaults };

  if (version < 1) {
    // Migration from unversioned/v0 to v1
    migrated.lastInvestigationView =
      rawParsed.lastInvestigationView === 'findings' || rawParsed.lastInvestigationView === 'graph'
        ? rawParsed.lastInvestigationView
        : null;

    if (rawParsed.panelPreferences && typeof rawParsed.panelPreferences === 'object') {
      migrated.panelPreferences = {
        sidebarCollapsed: Boolean(rawParsed.panelPreferences.sidebarCollapsed),
        detailsCollapsed: Boolean(rawParsed.panelPreferences.detailsCollapsed),
        diagnosticsTab:
          rawParsed.panelPreferences.diagnosticsTab === 'cycles' ||
          rawParsed.panelPreferences.diagnosticsTab === 'unresolved'
            ? rawParsed.panelPreferences.diagnosticsTab
            : 'none',
      };
    }

    if (rawParsed.annotationReviewState && typeof rawParsed.annotationReviewState === 'object') {
      const reviewed = Array.isArray(rawParsed.annotationReviewState.reviewedNodeIds)
        ? rawParsed.annotationReviewState.reviewedNodeIds.filter((id: any) => typeof id === 'string')
        : [];

      const statusMap: Record<string, ReviewStatus> = {};
      if (
        rawParsed.annotationReviewState.reviewStatusByNodeId &&
        typeof rawParsed.annotationReviewState.reviewStatusByNodeId === 'object'
      ) {
        for (const [key, val] of Object.entries(rawParsed.annotationReviewState.reviewStatusByNodeId)) {
          if (val === 'APPROVED' || val === 'NEEDS_REVIEW' || val === 'FLAGGED') {
            statusMap[key] = val as ReviewStatus;
          }
        }
      }

      migrated.annotationReviewState = {
        reviewedNodeIds: reviewed,
        reviewStatusByNodeId: statusMap,
      };
    }

    migrated.onboardingDismissed = Boolean(rawParsed.onboardingDismissed);
    migrated.version = 1;
  } else {
    // Already v1 or higher
    migrated = {
      version: CURRENT_PREFERENCES_VERSION,
      lastInvestigationView:
        rawParsed.lastInvestigationView === 'findings' || rawParsed.lastInvestigationView === 'graph'
          ? rawParsed.lastInvestigationView
          : null,
      panelPreferences: {
        sidebarCollapsed: Boolean(rawParsed.panelPreferences?.sidebarCollapsed),
        detailsCollapsed: Boolean(rawParsed.panelPreferences?.detailsCollapsed),
        diagnosticsTab:
          rawParsed.panelPreferences?.diagnosticsTab === 'cycles' ||
          rawParsed.panelPreferences?.diagnosticsTab === 'unresolved'
            ? rawParsed.panelPreferences.diagnosticsTab
            : 'none',
      },
      annotationReviewState: {
        reviewedNodeIds: Array.isArray(rawParsed.annotationReviewState?.reviewedNodeIds)
          ? rawParsed.annotationReviewState.reviewedNodeIds.filter((id: any) => typeof id === 'string')
          : [],
        reviewStatusByNodeId:
          rawParsed.annotationReviewState?.reviewStatusByNodeId &&
          typeof rawParsed.annotationReviewState.reviewStatusByNodeId === 'object'
            ? Object.fromEntries(
                Object.entries(rawParsed.annotationReviewState.reviewStatusByNodeId).filter(
                  ([_, v]) => v === 'APPROVED' || v === 'NEEDS_REVIEW' || v === 'FLAGGED'
                )
              ) as Record<string, ReviewStatus>
            : {},
      },
      onboardingDismissed: Boolean(rawParsed.onboardingDismissed),
    };
  }

  return migrated;
}

export function getPreferences(): UserPreferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createDefaultPreferences();
    const parsed = JSON.parse(raw);
    return migratePreferences(parsed);
  } catch (err) {
    console.error('Failed to parse preferences from localStorage:', err);
    return createDefaultPreferences();
  }
}

export function savePreferences(prefs: UserPreferences): void {
  try {
    const payload = {
      ...prefs,
      version: CURRENT_PREFERENCES_VERSION,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (err) {
    console.error('Failed to write preferences to localStorage:', err);
  }
}

export function updatePreferences(updates: Partial<UserPreferences>): UserPreferences {
  const current = getPreferences();
  const updated: UserPreferences = {
    ...current,
    ...updates,
    panelPreferences: {
      ...current.panelPreferences,
      ...(updates.panelPreferences || {}),
    },
    annotationReviewState: {
      ...current.annotationReviewState,
      ...(updates.annotationReviewState || {}),
    },
    version: CURRENT_PREFERENCES_VERSION,
  };
  savePreferences(updated);
  return updated;
}
