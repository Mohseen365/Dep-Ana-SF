import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Breadcrumbs } from './Breadcrumbs';

describe('Breadcrumbs Component', () => {
  it('renders null when items is empty', () => {
    const { container } = render(
      <Breadcrumbs items={[]} onNavigate={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders A › B › C with clickable segments and calls onNavigate on click', () => {
    const handleNavigate = vi.fn();
    const items = [
      { id: 'ServiceX', label: 'ServiceX' },
      { id: 'OrderController', label: 'OrderController' },
      { id: 'CartService', label: 'CartService' },
    ];

    render(<Breadcrumbs items={items} onNavigate={handleNavigate} />);

    expect(screen.getByTestId('breadcrumbs')).toBeInTheDocument();
    expect(screen.getByText('ServiceX')).toBeInTheDocument();
    expect(screen.getByText('OrderController')).toBeInTheDocument();
    expect(screen.getByText('CartService')).toBeInTheDocument();

    const separators = screen.getAllByText('›');
    expect(separators).toHaveLength(2);

    // Click middle item
    fireEvent.click(screen.getByText('OrderController'));
    expect(handleNavigate).toHaveBeenCalledWith('OrderController');
  });

  it('renders current (last) segment as non-clickable span with aria-current="page"', () => {
    const items = [
      { id: 'ServiceX', label: 'ServiceX' },
      { id: 'OrderController', label: 'OrderController' },
    ];

    render(<Breadcrumbs items={items} onNavigate={vi.fn()} />);

    const currentSegment = screen.getByText('OrderController');
    expect(currentSegment.tagName).toBe('SPAN');
    expect(currentSegment).toHaveAttribute('aria-current', 'page');
  });
});
