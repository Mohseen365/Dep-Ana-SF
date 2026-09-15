import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ProjectCreationModal } from './ProjectCreationModal';
import { ProjectProvider } from '../context/ProjectContext';

describe('ProjectCreationModal', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  const renderModal = (isOpen = true, onClose = vi.fn(), onSuccess = vi.fn()) => {
    return render(
      <ProjectProvider>
        <ProjectCreationModal isOpen={isOpen} onClose={onClose} onSuccess={onSuccess} />
      </ProjectProvider>
    );
  };

  it('does not render when isOpen is false', () => {
    renderModal(false);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders modal inputs and buttons when isOpen is true', () => {
    renderModal(true);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByLabelText(/Project Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Salesforce Project \/ Source Folder/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Project ID Slug/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Description/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Create & Open Project/i })).toBeInTheDocument();
  });

  it('validates required fields on submit', async () => {
    renderModal(true);

    const nameInput = screen.getByLabelText(/Project Name/i);
    fireEvent.change(nameInput, { target: { value: '' } });

    const submitBtn = screen.getByRole('button', { name: /Create & Open Project/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/Project name is required/i)).toBeInTheDocument();
    });
  });

  it('clears field errors when input changes', async () => {
    renderModal(true);

    const submitBtn = screen.getByRole('button', { name: /Create & Open Project/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/Project name is required/i)).toBeInTheDocument();
    });

    const nameInput = screen.getByLabelText(/Project Name/i);
    fireEvent.change(nameInput, { target: { value: 'New Test Org' } });

    expect(screen.queryByText(/Project name is required/i)).not.toBeInTheDocument();
  });

  it('successfully submits valid project input and calls onSuccess and onClose', async () => {
    const onClose = vi.fn();
    const onSuccess = vi.fn();

    renderModal(true, onClose, onSuccess);

    fireEvent.change(screen.getByLabelText(/Project Name/i), {
      target: { value: 'Salesforce Billing Module' },
    });
    fireEvent.change(screen.getByLabelText(/Salesforce Project \/ Source Folder/i), {
      target: { value: 'packages/billing' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Create & Open Project/i }));

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledWith('salesforce-billing-module');
      expect(onClose).toHaveBeenCalled();
    });
  });
});
