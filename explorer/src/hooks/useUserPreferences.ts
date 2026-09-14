import { useState, useCallback, useEffect } from 'react';
import {
  getPreferences,
  savePreferences,
  type UserPreferences,
  type ReviewStatus,
} from '../lib/preferences';

export function useUserPreferences() {
  const [preferences, setPreferencesState] = useState<UserPreferences>(getPreferences);

  useEffect(() => {
    setPreferencesState(getPreferences());
  }, []);

  const setLastInvestigationView = useCallback((view: 'graph' | 'findings' | null) => {
    setPreferencesState((prev) => {
      const next = { ...prev, lastInvestigationView: view };
      savePreferences(next);
      return next;
    });
  }, []);

  const setPanelPreferences = useCallback(
    (panelUpdates: Partial<UserPreferences['panelPreferences']>) => {
      setPreferencesState((prev) => {
        const next = {
          ...prev,
          panelPreferences: {
            ...prev.panelPreferences,
            ...panelUpdates,
          },
        };
        savePreferences(next);
        return next;
      });
    },
    []
  );

  const setOnboardingDismissed = useCallback((dismissed: boolean) => {
    setPreferencesState((prev) => {
      const next = { ...prev, onboardingDismissed: dismissed };
      savePreferences(next);
      return next;
    });
  }, []);

  const setNodeReviewStatus = useCallback((nodeId: string, status: ReviewStatus) => {
    setPreferencesState((prev) => {
      const reviewed = new Set(prev.annotationReviewState.reviewedNodeIds);
      reviewed.add(nodeId);

      const next = {
        ...prev,
        annotationReviewState: {
          reviewedNodeIds: Array.from(reviewed),
          reviewStatusByNodeId: {
            ...prev.annotationReviewState.reviewStatusByNodeId,
            [nodeId]: status,
          },
        },
      };
      savePreferences(next);
      return next;
    });
  }, []);

  return {
    preferences,
    setLastInvestigationView,
    setPanelPreferences,
    setOnboardingDismissed,
    setNodeReviewStatus,
  };
}
