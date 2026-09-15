import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ProjectProvider, useProject, DEFAULT_PROJECT } from './ProjectContext';

describe('ProjectContext & Provider', () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.pushState({}, '', '/');
    vi.restoreAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('provides DEFAULT_PROJECT when no manifest is available', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
      return { ok: false, status: 404 } as Response;
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ProjectProvider>{children}</ProjectProvider>
    );

    const { result } = renderHook(() => useProject(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.activeProjectId).toBe('default');
    expect(result.current.activeProject).toEqual(DEFAULT_PROJECT);
    expect(result.current.projects).toContainEqual(DEFAULT_PROJECT);
  });

  it('loads multi-project manifest when available', async () => {
    const mockManifest = {
      manifestVersion: '1.0.0',
      activeProjectId: 'core-crm',
      projects: [
        DEFAULT_PROJECT,
        {
          id: 'core-crm',
          name: 'Core CRM',
          sourcePath: 'force-app/core',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          analysisStatus: 'COMPLETE',
          componentCount: 15,
          dependencyCount: 30,
        },
      ],
    };

    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
      return {
        ok: true,
        json: async () => mockManifest,
      } as Response;
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ProjectProvider>{children}</ProjectProvider>
    );

    const { result } = renderHook(() => useProject(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.projects.length).toBe(2);
    expect(result.current.projects.some((p) => p.id === 'core-crm')).toBe(true);
  });

  it('creates project metadata and switches active project context', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
      return { ok: false } as Response;
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ProjectProvider>{children}</ProjectProvider>
    );

    const { result } = renderHook(() => useProject(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.createProject({
        name: 'Billing System',
        id: 'billing-app',
        description: 'Billing package module',
        sourcePath: 'force-app/billing',
      });
    });

    expect(result.current.activeProjectId).toBe('billing-app');
    expect(result.current.activeProject?.name).toBe('Billing System');
    expect(result.current.activeProject?.sourcePath).toBe('force-app/billing');
    expect(localStorage.getItem('explorer.activeProjectId')).toBe('billing-app');
    expect(window.location.search).toContain('project=billing-app');
  });

  it('switches project context and fires isolation reset events', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
      return { ok: false } as Response;
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ProjectProvider>{children}</ProjectProvider>
    );

    const { result } = renderHook(() => useProject(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));

    const eventSpy = vi.fn();
    window.addEventListener('explorer:project-changed', eventSpy);

    act(() => {
      result.current.selectProject('project-b');
    });

    expect(result.current.activeProjectId).toBe('project-b');
    expect(localStorage.getItem('explorer.activeProjectId')).toBe('project-b');
    expect(eventSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: { projectId: 'project-b' },
      })
    );

    window.removeEventListener('explorer:project-changed', eventSpy);
  });

  it('supports update, reanalyze, duplicate, archive, delete, and export operations', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
      return {
        ok: true,
        json: async () => ({
          summary: { nodeCount: 25, edgeCount: 50 },
        }),
      } as Response;
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ProjectProvider>{children}</ProjectProvider>
    );

    const { result } = renderHook(() => useProject(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    // 1. Create project
    await act(async () => {
      await result.current.createProject({ name: 'CRM App', id: 'crm-app' });
    });

    // 2. Update project
    await act(async () => {
      await result.current.updateProject('crm-app', { name: 'Core CRM App', sourcePath: 'force-app/crm' });
    });
    expect(result.current.projects.find((p) => p.id === 'crm-app')?.name).toBe('Core CRM App');

    // 3. Duplicate project
    await act(async () => {
      await result.current.duplicateProject('crm-app');
    });
    expect(result.current.projects.some((p) => p.id === 'crm-app-copy')).toBe(true);

    // 4. Archive project
    await act(async () => {
      await result.current.archiveProject('crm-app', true);
    });
    expect(result.current.projects.find((p) => p.id === 'crm-app')?.isArchived).toBe(true);

    // 5. Reanalyze project
    await act(async () => {
      await result.current.reanalyzeProject('crm-app');
    });
    expect(result.current.projects.find((p) => p.id === 'crm-app')?.componentCount).toBe(25);

    // 6. Export project
    const linkSpy = vi.spyOn(document, 'createElement');
    await act(async () => {
      await result.current.exportProject('crm-app');
    });
    expect(linkSpy).toHaveBeenCalledWith('a');

    // 7. Delete project
    await act(async () => {
      await result.current.deleteProject('crm-app');
    });
    expect(result.current.projects.some((p) => p.id === 'crm-app')).toBe(false);
  });

  it('resolves project data URLs correctly', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
      return { ok: false } as Response;
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ProjectProvider>{children}</ProjectProvider>
    );

    const { result } = renderHook(() => useProject(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.getProjectDataUrl('default')).toBe('/explorer-data.json');
    expect(result.current.getProjectDataUrl('billing')).toBe('/projects/billing/explorer-data.json');
  });
});
