import React from 'react';
import { Link } from 'react-router-dom';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary] Caught render error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        if (typeof this.props.fallback === 'function') {
          return this.props.fallback(this.state.error);
        }
        return this.props.fallback;
      }

      return (
        <div className="container py-5 text-center">
          <div className="card p-5 border-0 shadow-sm mx-auto" style={{ maxWidth: '560px' }}>
            <div className="rounded-circle bg-danger-subtle text-danger p-3 mx-auto mb-3" style={{ width: '64px', height: '64px' }}>
              <i className="bi bi-exclamation-triangle-fill fs-2"></i>
            </div>
            <h4 className="fw-bold text-dark mb-2">Something went wrong</h4>
            <p className="text-muted small mb-3">
              We encountered an issue rendering this section. Your account and commute data are safe.
            </p>
            {this.state.error && (
              <div className="alert alert-light border small text-danger text-start py-2 px-3 mb-4 font-monospace" style={{ fontSize: '0.78rem', wordBreak: 'break-word' }}>
                <i className="bi bi-bug me-1"></i> {this.state.error?.message || String(this.state.error)}
              </div>
            )}
            <div className="d-flex justify-content-center gap-2">
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm"
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  window.location.reload();
                }}
              >
                <i className="bi bi-arrow-clockwise me-1"></i> Reload Page
              </button>
              <Link to="/search" className="btn btn-primary-carpool btn-sm">
                <i className="bi bi-search me-1"></i> Search Rides
              </Link>
              <Link to="/" className="btn btn-light btn-sm border">
                <i className="bi bi-house me-1"></i> Home
              </Link>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
