import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Header } from './Header';

describe('Header', () => {
  it('renders title, badge, and shortcut hint', () => {
    render(<Header />);
    expect(screen.getByText('Dependency Explorer')).toBeInTheDocument();
    expect(screen.getByText('Salesforce Architecture Explorer')).toBeInTheDocument();
    expect(screen.getByText(/to search/i)).toBeInTheDocument();
  });

  it('triggers onResetView callback when clicked', () => {
    const onResetView = vi.fn();

    render(
      <Header
        onResetView={onResetView}
      />
    );

    fireEvent.click(screen.getByTitle('Reset active graph filters and selection'));
    expect(onResetView).toHaveBeenCalledTimes(1);
  });
});
