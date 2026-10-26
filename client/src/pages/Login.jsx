import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const { showSuccess, showError } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  const from = location.state?.from?.pathname || '/dashboard';

  const validate = () => {
    const errs = {};
    if (!email.trim()) {
      errs.email = 'College email address is required';
    } else if (!/^[a-zA-Z0-9._%+-]+@mitaoe\.ac\.in$/.test(email.trim())) {
      errs.email = 'Must be a valid @mitaoe.ac.in address';
    }

    if (!password) {
      errs.password = 'Password is required';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const user = await login(email.trim(), password);
      showSuccess(`Welcome back, ${user.name}!`);
      navigate(from, { replace: true });
    } catch (err) {
      showError(err.message || 'Invalid email or password.');
    } finally {
      setSubmitting(false);
    }
  };

  // Quick fill helper for testing & evaluation
  const handleQuickFill = (demoEmail, demoPassword) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setErrors({});
  };

  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-lg-5 col-md-7">
          <div className="card card-carpool border-0 shadow-sm p-4 p-md-5">
            <div className="text-center mb-4">
              <div className="rounded-circle shadow-sm bg-white p-2 d-inline-flex align-items-center justify-content-center mb-2 border border-warning" style={{ width: '64px', height: '64px' }}>
                <img src="/logo.png" alt="MITAOE Carpool Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              </div>
              <h4 className="fw-bold text-dark">Sign In to MITAOE Carpool</h4>
              <p className="text-muted small">Enter your verified @mitaoe.ac.in college credentials.</p>
            </div>

            <form onSubmit={handleSubmit} noValidate>
              {/* Email */}
              <div className="mb-3">
                <label className="form-label">College Email</label>
                <div className="input-group">
                  <span className="input-group-text"><i className="bi bi-envelope"></i></span>
                  <input
                    type="email"
                    className={`form-control ${errors.email ? 'is-invalid' : ''}`}
                    placeholder="e.g. 122100451001@mitaoe.ac.in"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (errors.email) setErrors(prev => ({ ...prev, email: '' }));
                    }}
                  />
                </div>
                {errors.email && <div className="form-feedback-error">{errors.email}</div>}
              </div>

              {/* Password */}
              <div className="mb-4">
                <label className="form-label">Password</label>
                <div className="input-group">
                  <span className="input-group-text"><i className="bi bi-lock"></i></span>
                  <input
                    type="password"
                    className={`form-control ${errors.password ? 'is-invalid' : ''}`}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (errors.password) setErrors(prev => ({ ...prev, password: '' }));
                    }}
                  />
                </div>
                {errors.password && <div className="form-feedback-error">{errors.password}</div>}
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="btn btn-primary-carpool w-100 py-2 d-flex align-items-center justify-content-center gap-2 mb-3"
              >
                {submitting ? (
                  <>
                    <span className="spinner-border spinner-border-sm" role="status"></span>
                    Authenticating...
                  </>
                ) : (
                  <>
                    <i className="bi bi-box-arrow-in-right"></i> Sign In
                  </>
                )}
              </button>

              <div className="text-center small text-muted">
                Don't have an account yet?{' '}
                <Link to="/register" className="text-primary fw-semibold text-decoration-none">
                  Register with PRN
                </Link>
              </div>
            </form>

            {/* Quick Demo Credentials */}
            <div className="pt-4 mt-4 border-top">
              <span className="text-muted small fw-semibold text-uppercase d-block mb-2 text-center">
                Demo Accounts (Click to Autofill)
              </span>
              <div className="d-grid gap-2">
                <button
                  type="button"
                  className="btn btn-light btn-sm border text-start d-flex justify-content-between align-items-center"
                  onClick={() => handleQuickFill('122100451001@mitaoe.ac.in', 'StudentPassword@123')}
                >
                  <span><i className="bi bi-person me-1"></i> Aarav (Student Driver &bull; Wakad)</span>
                  <span className="badge bg-secondary">Fill</span>
                </button>
                <button
                  type="button"
                  className="btn btn-light btn-sm border text-start d-flex justify-content-between align-items-center"
                  onClick={() => handleQuickFill('122100451004@mitaoe.ac.in', 'StudentPassword@123')}
                >
                  <span><i className="bi bi-person me-1"></i> Snehal (Student Passenger)</span>
                  <span className="badge bg-secondary">Fill</span>
                </button>
                <button
                  type="button"
                  className="btn btn-light btn-sm border text-start d-flex justify-content-between align-items-center"
                  onClick={() => handleQuickFill('prof.kulkarni@mitaoe.ac.in', 'FacultyPassword@123')}
                >
                  <span><i className="bi bi-person-workspace me-1"></i> Prof. Kulkarni (Faculty Driver)</span>
                  <span className="badge bg-secondary">Fill</span>
                </button>
                <button
                  type="button"
                  className="btn btn-light btn-sm border text-start d-flex justify-content-between align-items-center"
                  onClick={() => handleQuickFill('admin@mitaoe.ac.in', 'AdminPassword@123')}
                >
                  <span><i className="bi bi-shield-lock me-1"></i> Campus Transport Admin</span>
                  <span className="badge bg-danger">Fill</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
