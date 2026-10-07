import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

type FallbackRender = (props: { error: Error; reset: () => void }) => ReactNode;

type Props = {
  children?: ReactNode;
  fallback?: ReactNode | FallbackRender;
  onError?: (error: Error, info: ErrorInfo) => void;
};

type State = { error: Error | null };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    this.props.onError?.(error, info);
    if (import.meta.env.DEV) {
      console.error('[ErrorBoundary]', error, info.componentStack);
    }
  }

  reset = (): void => {
    this.setState({ error: null });
  };

  render(): ReactNode {
    const { error } = this.state;
    const { children, fallback } = this.props;

    if (error === null) {
      return children;
    }

    if (typeof fallback === 'function') {
      return fallback({ error, reset: this.reset });
    }

    if (fallback !== undefined) {
      return fallback;
    }

    return <DefaultFallback error={error} reset={this.reset} />;
  }
}

function DefaultFallback({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div
      role="alert"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100dvh',
        padding: '2rem',
        gap: '1rem',
        fontFamily: 'system-ui, sans-serif',
        textAlign: 'center',
      }}
    >
      <h1 style={{ margin: 0, fontSize: '1.5rem' }}>Что-то пошло не так</h1>
      <pre
        style={{
          maxWidth: '640px',
          margin: 0,
          padding: '0.75rem 1rem',
          background: '#f5f5f5',
          border: '1px solid #e0e0e0',
          borderRadius: '8px',
          overflow: 'auto',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          fontSize: '0.875rem',
        }}
      >
        {error.message}
      </pre>
      <button
        type="button"
        onClick={reset}
        style={{
          padding: '0.5rem 1.25rem',
          border: '1px solid #333',
          borderRadius: '6px',
          background: '#333',
          color: '#fff',
          cursor: 'pointer',
          fontSize: '0.875rem',
        }}
      >
        Попробовать снова
      </button>
    </div>
  );
}
