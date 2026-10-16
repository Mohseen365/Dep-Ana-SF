import React from 'react';

interface GraphErrorBoundaryProps {
  children: React.ReactNode;
}

interface GraphErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class GraphErrorBoundary extends React.Component<
  GraphErrorBoundaryProps,
  GraphErrorBoundaryState
> {
  state: GraphErrorBoundaryState = {
    hasError: false,
    error: null,
  };

  static getDerivedStateFromError(error: Error): GraphErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[GraphErrorBoundary] Overlay element threw an error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="graph-overlay-error"
          data-testid="graph-overlay-error"
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            padding: '8px 12px',
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid #ef4444',
            borderRadius: '6px',
            color: '#f8fafc',
            fontSize: '12px',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span>Graph overlay failed to render.</span>
          <button
            type="button"
            onClick={this.handleRetry}
            style={{
              padding: '2px 8px',
              fontSize: '11px',
              background: '#ef4444',
              color: '#ffffff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default GraphErrorBoundary;
