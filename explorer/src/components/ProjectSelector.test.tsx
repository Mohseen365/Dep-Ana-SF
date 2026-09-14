import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
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

  it('renders full screen application selector with header, search, and default project', () => {
    renderFullSelector();

    expect(screen.getByText('Salesforce Architecture Explorer')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Filter projects by name/i)).toBeInTheDocument();
    expect(screen.getByText('Default Salesforce Project')).toBeInTheDocument();
    expect(screen.getByText('force-app/main/default')).toBeInTheDocument();
  });

  it('filters project cards by search query', () => {
    renderFullSelector();

    const searchInput = screen.getByPlaceholderText(/Filter projects by name/i);
    fireEvent.change(searchInput, { target: { value: 'nonexistent-project' } });

    expect(screen.getByText('No Salesforce Projects Found')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Clear Search Filter/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Clear Search Filter/i }));
    expect(screen.getByText('Default Salesforce Project')).toBeInTheDocument();
  });

  it('opens ProjectCreationModal when clicking New Project button', () => {
    renderFullSelector();

    const newProjectBtn = screen.getByRole('button', { name: /\+ New Project/i });
    fireEvent.click(newProjectBtn);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Create Salesforce Project')).toBeInTheDocument();
  });

  it('renders compact header pill variant and opens dropdown menu', () => {
    const onSelect = vi.fn();
    renderCompactSelector(onSelect);

    const pillBtn = screen.getByRole('button', { name: /Default Salesforce Project/i });
    expect(pillBtn).toBeInTheDocument();

    fireEvent.click(pillBtn);
    expect(screen.getByText('Salesforce Projects')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /\+ Register New Project\.\.\./i })).toBeInTheDocument();
  });
});
