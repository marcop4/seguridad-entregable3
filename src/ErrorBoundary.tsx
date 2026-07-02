// @ts-nocheck
import React, { ErrorInfo } from 'react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', backgroundColor: '#330000', color: '#ff9999', minHeight: '100vh', fontFamily: 'monospace' }}>
          <h1 style={{ color: 'white' }}>💥 React ha colapsado (Error Crítico)</h1>
          <p>Por favor copia este error y envíaselo a Antigravity:</p>
          <div style={{ backgroundColor: 'black', padding: '15px', borderRadius: '5px', overflow: 'auto', marginTop: '10px' }}>
            <h3 style={{ color: 'red', margin: '0 0 10px 0' }}>{this.state.error && this.state.error.toString()}</h3>
            <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
              {this.state.errorInfo && this.state.errorInfo.componentStack}
            </pre>
          </div>
          <button 
            onClick={() => window.location.reload()}
            style={{ marginTop: '20px', padding: '10px 20px', background: 'white', color: 'black', border: 'none', cursor: 'pointer' }}
          >
            Recargar Aplicación
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
