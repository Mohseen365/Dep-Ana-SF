import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ProjectSelector } from './ProjectSelector';
import { ProjectProvider } from '../context/ProjectContext';

describe('ProjectSelector', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  const renderFullSelector = () => {
    return render(
      <ProjectProvider>
        <ProjectSelector variant="full" />
      </ProjectProvider>
    );
  };

  const renderCompactSelector = (onSelect = vi.fn()) => {
    return render(
      <ProjectProvider>
        <ProjectSelector variant="compact" onProjectSelect={onSelect} />
      </ProjectProvider>
    );
  };

  it('renders full screen application selector with header, search, and default project', async () => {
    renderFullSelector();

    await waitFor(() => {
      expect(screen.getByText('Default Salesforce Project')).toBeInTheDocument();
    });

    expect(screen.getByText('Manage Salesforce Projects')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Search projects by name, ID, or source/i)).toBeInTheDocument();
    expect(screen.getByText(/force-app\/main\/default/i)).toBeInTheDocument();
  });

  it('filters project cards by search query', async () => {
    renderFullSelector();

    await waitFor(() => {
      expect(screen.getByText('Default Salesforce Project')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/Search projects by name, ID, or source/i);
    fireEvent.change(searchInput, { target: { value: 'nonexistent-project' } });

    expect(screen.getByText('No Projects Matched Filter')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Reset Filters/i }));
    expect(screen.getByText('Default Salesforce Project')).toBeInTheDocument();
  });

  it('opens ProjectCreationModal when clicking New Project button', async () => {
    renderFullSelector();

    await waitFor(() => {
      expect(screen.getByText('Default Salesforce Project')).toBeInTheDocument();
    });

    const newProjectBtn = screen.getByRole('button', { name: /New Project/i });
    fireEvent.click(newProjectBtn);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Create Salesforce Project')).toBeInTheDocument();
  });

  it('renders compact header pill variant and opens dropdown menu', async () => {
    const onSelect = vi.fn();
    renderCompactSelector(onSelect);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Default Salesforce Project/i })).toBeInTheDocument();
    });

    const pillBtn = screen.getByRole('button', { name: /Default Salesforce Project/i });
    expect(pillBtn).toBeInTheDocument();

    fireEvent.click(pillBtn);
    expect(screen.getByText('Salesforce Projects')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /\+ Register New Project\.\.\./i })).toBeInTheDocument();
  });
});
