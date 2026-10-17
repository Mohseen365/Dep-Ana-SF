import React from 'react';

interface GraphErrorBoundaryProps {
  children: React.ReactNode;
  resetKey?: string | number | boolean | object;
}

interface GraphErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  isRecovering: boolean;
}

export class GraphErrorBoundary extends React.Component<
  GraphErrorBoundaryProps,
  GraphErrorBoundaryState
> {
  private retryTimeoutId: ReturnType<typeof setTimeout> | null = null;

  state: GraphErrorBoundaryState = {
    hasError: false,
    error: null,
    isRecovering: false,
  };

  static getDerivedStateFromError(error: Error): Partial<GraphErrorBoundaryState> {
    return { hasError: true, error, isRecovering: false };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[GraphErrorBoundary] Overlay element threw an error:', error, errorInfo);
  }

  componentDidUpdate(prevProps: GraphErrorBoundaryProps) {
    if (this.state.hasError) {
      if (
        prevProps.resetKey !== this.props.resetKey ||
        prevProps.children !== this.props.children
      ) {
        this.setState({ hasError: false, error: null, isRecovering: false });
      }
    }
  }

  componentWillUnmount() {
    if (this.retryTimeoutId !== null) {
      clearTimeout(this.retryTimeoutId);
    }
  }

  handleRetry = () => {
    if (this.state.isRecovering) return;
    this.setState({ isRecovering: true });
    this.retryTimeoutId = setTimeout(() => {
      this.setState({ hasError: false, error: null, isRecovering: false });
    }, 200);
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
            disabled={this.state.isRecovering}
            style={{
              padding: '2px 8px',
              fontSize: '11px',
              background: '#ef4444',
              color: '#ffffff',
              border: 'none',
              borderRadius: '4px',
              cursor: this.state.isRecovering ? 'wait' : 'pointer',
              opacity: this.state.isRecovering ? 0.7 : 1,
            }}
          >
            {this.state.isRecovering ? 'Recovering...' : 'Retry'}
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default GraphErrorBoundary;
