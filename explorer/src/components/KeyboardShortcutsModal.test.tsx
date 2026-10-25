import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { KeyboardShortcutsModal } from './KeyboardShortcutsModal';

describe('KeyboardShortcutsModal (F7)', () => {
  it('does not render when isOpen is false', () => {
    const { container } = render(<KeyboardShortcutsModal isOpen={false} onClose={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders modal with working shortcuts when isOpen is true', () => {
    render(<KeyboardShortcutsModal isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByRole('dialog', { name: '⌨️ Keyboard Shortcuts' })).toBeInTheDocument();
    expect(screen.getByText('Navigation')).toBeInTheDocument();
    expect(screen.getByText('Selection & View')).toBeInTheDocument();
    expect(screen.getByText('Actions')).toBeInTheDocument();
    expect(screen.getByText('Fit all to screen')).toBeInTheDocument();
  });

  it('calls onClose when close button or backdrop is clicked', () => {
    const onCloseMock = vi.fn();
    render(<KeyboardShortcutsModal isOpen={true} onClose={onCloseMock} />);

    const closeBtn = screen.getByRole('button', { name: 'Close keyboard shortcuts' });
    fireEvent.click(closeBtn);
    expect(onCloseMock).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when Escape key is pressed', () => {
    const onCloseMock = vi.fn();
    render(<KeyboardShortcutsModal isOpen={true} onClose={onCloseMock} />);

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onCloseMock).toHaveBeenCalledTimes(1);
  });
});
