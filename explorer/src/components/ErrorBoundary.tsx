import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  fallback?: ReactNode;
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in component:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="state-screen state-error" role="alert" style={{ padding: '1rem', textAlign: 'center' }}>
          <h3>This panel encountered an error</h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary, #666)' }}>
            {this.state.error?.message || 'An unexpected error occurred.'}
          </p>
          <button
            onClick={this.handleReset}
            className="retry-btn"
            style={{ marginTop: '0.5rem', padding: '0.25rem 0.75rem', cursor: 'pointer' }}
          >
            Reload panel
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
