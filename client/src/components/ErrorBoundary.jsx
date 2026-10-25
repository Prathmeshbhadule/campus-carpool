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
      return (
        <div className="container py-5 text-center">
          <div className="card p-5 border-0 shadow-sm mx-auto" style={{ maxWidth: '520px' }}>
            <div className="rounded-circle bg-danger-subtle text-danger p-3 mx-auto mb-3" style={{ width: '64px', height: '64px' }}>
              <i className="bi bi-exclamation-triangle-fill fs-2"></i>
            </div>
            <h4 className="fw-bold text-dark mb-2">Something went wrong</h4>
            <p className="text-muted small mb-4">
              We encountered an issue rendering this section. Your account and commute data are safe.
            </p>
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
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
