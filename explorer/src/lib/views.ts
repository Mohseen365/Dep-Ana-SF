/**
 * Saved Views Persistence Module
 *
 * Persists explorer view states into localStorage under 'explorer.views.v1'
 * with error handling for corrupt storage and fallback states.
 */

import type { SearchFilterState } from "./search-filter";
import type { FocusState } from "./focus-graph";
import type { ImpactState } from "./impact-analysis";

export interface SavedView {
  id: string;
  name: string;
  shared: boolean;
  state: {
    filter: SearchFilterState;
    focus: FocusState;
    impact: ImpactState;
    selectedNodeId: string | null;
    viewMode: "graph" | "findings";
  };
  createdAt: string;
}

const STORAGE_KEY = "explorer.views.v1";

function readStorage(): SavedView[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter(item => item && typeof item === "object" && typeof item.id === "string");
    }
    return [];
  } catch (err) {
    console.error("Failed to parse saved views from localStorage:", err);
    return [];
  }
}

function writeStorage(views: SavedView[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(views));
  } catch (err) {
    console.error("Failed to write saved views to localStorage:", err);
  }
}

export function saveView(name: string, state: SavedView["state"]): SavedView {
  const views = readStorage();
  const id = `view_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const newView: SavedView = {
    id,
    name,
    shared: false,
    state,
    createdAt: new Date().toISOString()
  };

  views.push(newView);
  writeStorage(views);
  return newView;
}

export function listViews(): SavedView[] {
  return readStorage();
}

export function getView(id: string): SavedView | null {
  const views = readStorage();
  return views.find(v => v.id === id) || null;
}

export function deleteView(id: string): void {
  const views = readStorage().filter(v => v.id !== id);
  writeStorage(views);
}
