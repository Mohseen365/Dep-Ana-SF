import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProjectManager } from './ProjectManager';
import { ProjectProvider } from '../context/ProjectContext';

describe('ProjectManager', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  const renderManager = (onSelect = vi.fn()) => {
    return render(
      <ProjectProvider>
        <ProjectManager onProjectSelect={onSelect} />
      </ProjectProvider>
    );
  };

  it('renders Manage Projects interface with headers, search, and table columns', async () => {
    renderManager();

    await waitFor(() => {
      expect(screen.getByText('Default Salesforce Project')).toBeInTheDocument();
    });

    expect(screen.getByText('Manage Salesforce Projects')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Search projects by name, ID, or source/i)).toBeInTheDocument();
    expect(screen.getAllByText('Status').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Components').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Dependencies').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Last Analyzed').length).toBeGreaterThan(0);
  });

  it('filters project list by search query', async () => {
    renderManager();

    await waitFor(() => {
      expect(screen.getByText('Default Salesforce Project')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/Search projects by name, ID, or source/i);
    fireEvent.change(searchInput, { target: { value: 'nonexistent-query' } });

    expect(screen.getByText('No Projects Matched Filter')).toBeInTheDocument();

    const resetBtn = screen.getByRole('button', { name: /Reset Filters/i });
    fireEvent.click(resetBtn);

    expect(screen.getByText('Default Salesforce Project')).toBeInTheDocument();
  });

  it('supports sorting projects by name', async () => {
    renderManager();

    await waitFor(() => {
      expect(screen.getByText('Default Salesforce Project')).toBeInTheDocument();
    });

    const sortSelect = screen.getByLabelText('Sort:');
    fireEvent.change(sortSelect, { target: { value: 'name' } });

    expect(screen.getByText('Default Salesforce Project')).toBeInTheDocument();
  });

  it('triggers Open action on project button click', async () => {
    const onSelect = vi.fn();
    renderManager(onSelect);

    await waitFor(() => {
      expect(screen.getByText('Default Salesforce Project')).toBeInTheDocument();
    });

    const openBtn = screen.getByRole('button', { name: /Active Workspace/i });
    fireEvent.click(openBtn);

    expect(onSelect).toHaveBeenCalledWith('default');
  });

  it('opens Rename dialog and saves updated name', async () => {
    renderManager();

    await waitFor(() => {
      expect(screen.getByText('Default Salesforce Project')).toBeInTheDocument();
    });

    const renameBtn = screen.getByRole('button', { name: /Rename/i });
    fireEvent.click(renameBtn);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Rename Project')).toBeInTheDocument();

    const input = screen.getByPlaceholderText(/e\.g\., Core Sales Package/i);
    fireEvent.change(input, { target: { value: 'Renamed Project Alpha' } });

    const saveBtn = screen.getByRole('button', { name: /Save Changes/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(screen.getByText('Renamed Project Alpha')).toBeInTheDocument();
    });
  });

  it('opens Change Source dialog and updates source path', async () => {
    renderManager();

    await waitFor(() => {
      expect(screen.getByText('Default Salesforce Project')).toBeInTheDocument();
    });

    const changeSourceBtn = screen.getByRole('button', { name: /Change Source/i });
    fireEvent.click(changeSourceBtn);

    expect(screen.getByText('Change Project Source Directory')).toBeInTheDocument();

    const input = screen.getByPlaceholderText(/e\.g\., force-app\/main\/default/i);
    fireEvent.change(input, { target: { value: 'force-app/custom/pkg' } });

    const saveBtn = screen.getByRole('button', { name: /Save Changes/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(screen.getByText(/force-app\/custom\/pkg/i)).toBeInTheDocument();
    });
  });

  it('requires confirmation before deleting project', async () => {
    renderManager();

    await waitFor(() => {
      expect(screen.getByText('Default Salesforce Project')).toBeInTheDocument();
    });

    const deleteBtn = screen.getByRole('button', { name: /Delete/i });
    fireEvent.click(deleteBtn);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/⚠️ Delete Project Confirmation/i)).toBeInTheDocument();
    expect(screen.getByText(/Are you sure you want to delete project/i)).toBeInTheDocument();

    const confirmDeleteBtn = screen.getByRole('button', { name: /Confirm Delete/i });
    fireEvent.click(confirmDeleteBtn);

    await waitFor(() => {
      expect(screen.queryByText('Default Salesforce Project')).not.toBeInTheDocument();
    });
  });
});
