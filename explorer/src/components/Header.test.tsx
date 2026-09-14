import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Header } from './Header';

describe('Header', () => {
  it('renders title and badge', () => {
    render(<Header />);
    expect(screen.getByText('Dependency Explorer')).toBeInTheDocument();
    expect(screen.getByText('Salesforce Architecture Explorer')).toBeInTheDocument();
  });

  it('triggers onResetView, onToggleSidebar, and onToggleFullscreen callbacks when clicked', () => {
    const onResetView = vi.fn();
    const onToggleSidebar = vi.fn();
    const onToggleFullscreen = vi.fn();

    render(
      <Header
        onResetView={onResetView}
        onToggleSidebar={onToggleSidebar}
        onToggleFullscreen={onToggleFullscreen}
      />
    );

    fireEvent.click(screen.getByTitle('Toggle Sidebar'));
    expect(onToggleSidebar).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByTitle('Toggle Fullscreen'));
    expect(onToggleFullscreen).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByTitle('Reset active graph filters and selection'));
    expect(onResetView).toHaveBeenCalledTimes(1);
  });
});
