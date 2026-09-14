import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { ErrorBoundary } from './ErrorBoundary';

const ProblemChild: React.FC<{ shouldThrow?: boolean }> = ({ shouldThrow = true }) => {
  if (shouldThrow) {
    throw new Error('Test Component Error');
  }
  return <div>Normal Component</div>;
};

describe('ErrorBoundary', () => {
  it('renders children when no error occurs', () => {
    render(
      <ErrorBoundary>
        <div>Normal Child</div>
      </ErrorBoundary>
    );
    expect(screen.getByText('Normal Child')).toBeInTheDocument();
  });

  it('catches thrown error and renders fallback UI with Reload panel button', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <ProblemChild />
      </ErrorBoundary>
    );

    expect(screen.getByText('This panel encountered an error')).toBeInTheDocument();
    expect(screen.getByText('Test Component Error')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reload panel' })).toBeInTheDocument();

    consoleSpy.mockRestore();
  });

  it('renders custom fallback when provided', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ErrorBoundary fallback={<div>Custom Error View</div>}>
        <ProblemChild />
      </ErrorBoundary>
    );

    expect(screen.getByText('Custom Error View')).toBeInTheDocument();

    consoleSpy.mockRestore();
  });

  it('resets error state when Reload panel button is clicked', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    let throwError = true;
    const DynamicChild = () => {
      if (throwError) throw new Error('Dynamic Error');
      return <div>Recovered Component</div>;
    };

    const { rerender } = render(
      <ErrorBoundary>
        <DynamicChild />
      </ErrorBoundary>
    );

    expect(screen.getByText('This panel encountered an error')).toBeInTheDocument();

    throwError = false;
    fireEvent.click(screen.getByRole('button', { name: 'Reload panel' }));

    rerender(
      <ErrorBoundary>
        <DynamicChild />
      </ErrorBoundary>
    );

    expect(screen.getByText('Recovered Component')).toBeInTheDocument();

    consoleSpy.mockRestore();
  });
});
