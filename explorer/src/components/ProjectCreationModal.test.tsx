import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { ProjectCreationModal } from './ProjectCreationModal';
import { ProjectProvider } from '../context/ProjectContext';

// Mock fetch to resolve manifest instantly to avoid async act warnings from ProjectProvider
globalThis.fetch = vi.fn().mockResolvedValue({
  ok: false,
  status: 404,
  json: async () => ({}),
});

describe('ProjectCreationModal', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    (globalThis.fetch as any).mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({}),
    });
  });

  const renderModal = async (isOpen = true, onClose = vi.fn(), onSuccess = vi.fn()) => {
    let result: any;
    await act(async () => {
      result = render(
        <ProjectProvider>
          <ProjectCreationModal isOpen={isOpen} onClose={onClose} onSuccess={onSuccess} />
        </ProjectProvider>
      );
    });
    return result;
  };

  it('does not render when isOpen is false', async () => {
    await renderModal(false);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders modal inputs and buttons when isOpen is true', async () => {
    await renderModal(true);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByLabelText(/Project Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Salesforce Project \/ Source Folder/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Project ID Slug/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Description/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Create & Open Project/i })).toBeInTheDocument();
  });

  it('validates required fields on submit', async () => {
    await renderModal(true);

    const nameInput = screen.getByLabelText(/Project Name/i);
    fireEvent.change(nameInput, { target: { value: '' } });

    const submitBtn = screen.getByRole('button', { name: /Create & Open Project/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/Project name is required/i)).toBeInTheDocument();
    });
  });

  it('clears field errors when input changes', async () => {
    await renderModal(true);

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

    await renderModal(true, onClose, onSuccess);

    fireEvent.change(screen.getByLabelText(/Project Name/i), {
      target: { value: 'Salesforce Billing Module' },
    });
    fireEvent.change(screen.getByLabelText(/Salesforce Project \/ Source Folder/i), {
      target: { value: 'packages/billing' },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Create & Open Project/i }));
    });

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledWith('salesforce-billing-module');
      expect(onClose).toHaveBeenCalled();
    });
  });
});
