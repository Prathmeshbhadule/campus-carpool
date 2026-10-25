import React, { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { UpiPaymentModal } from './UpiPaymentModal';

export const Navbar = () => {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const navigate = useNavigate();
  const [showUpiModal, setShowUpiModal] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <nav className="navbar navbar-expand-lg app-navbar py-2" aria-label="Main Navigation">
      <div className="container">
        {/* Brand */}
        <Link className="navbar-brand d-flex align-items-center gap-2 text-decoration-none" to="/">
          <div className="bg-primary text-white rounded p-1 d-flex align-items-center justify-content-center" style={{ width: '34px', height: '34px' }}>
            <i className="bi bi-car-front-fill fs-5"></i>
          </div>
          <div>
            <span className="fw-bold text-dark fs-5 tracking-tight d-block line-height-1">MITAOE Carpool</span>
            <span className="brand-badge text-uppercase">Campus Transit</span>
          </div>
        </Link>

        {/* Mobile toggle */}
        <button
          className="navbar-toggler border-0 shadow-none"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarMainContent"
          aria-controls="navbarMainContent"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon"></span>
        </button>

        {/* Collapsible Content */}
        <div className="collapse navbar-collapse" id="navbarMainContent">
          <ul className="navbar-nav me-auto mb-2 mb-lg-0 ms-lg-3 gap-1">
            <li className="nav-item">
              <NavLink className="nav-link" to="/search">
                <i className="bi bi-search me-1"></i> Search Rides
              </NavLink>
            </li>
            <li className="nav-item">
              <NavLink className="nav-link" to="/post-ride">
                <i className="bi bi-plus-circle me-1"></i> Post a Ride
              </NavLink>
            </li>
            <li className="nav-item">
              <NavLink className="nav-link" to="/calculator">
                <i className="bi bi-calculator me-1"></i> Fare & CO₂ Calc
              </NavLink>
            </li>
            <li className="nav-item d-flex align-items-center">
              <button
                type="button"
                className="btn btn-sm btn-outline-success d-flex align-items-center gap-1 ms-lg-2 my-1 my-lg-0"
                onClick={() => setShowUpiModal(true)}
              >
                <i className="bi bi-qr-code-scan"></i> UPI Pay
              </button>
            </li>
          </ul>

          {/* Right Action Items */}
          <div className="d-flex align-items-center gap-2 mt-3 mt-lg-0">
            {isAuthenticated ? (
              <>
                {/* Notification Bell */}
                <Link
                  to="/notifications"
                  className="btn btn-light position-relative rounded-circle p-2 text-secondary"
                  title="Notifications"
                  aria-label={`Notifications, ${unreadCount} unread`}
                >
                  <i className="bi bi-bell fs-5"></i>
                  {unreadCount > 0 && (
                    <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
                      {unreadCount}
                      <span className="visually-hidden">unread messages</span>
                    </span>
                  )}
                </Link>

                {/* User Dropdown */}
                <div className="dropdown">
                  <button
                    className="btn btn-light dropdown-toggle d-flex align-items-center gap-2 border"
                    type="button"
                    id="userMenuDropdown"
                    data-bs-toggle="dropdown"
                    aria-expanded="false"
                  >
                    <div
                      className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center fw-bold"
                      style={{ width: '28px', height: '28px', fontSize: '0.82rem' }}
                    >
                      {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <span className="d-none d-md-inline fw-semibold" style={{ fontSize: '0.9rem' }}>
                      {user?.name?.split(' ')[0]}
                    </span>
                  </button>
                  <ul className="dropdown-menu dropdown-menu-end shadow border-0" aria-labelledby="userMenuDropdown">
                    <li className="px-3 py-2 border-bottom">
                      <div className="fw-bold text-dark">{user?.name}</div>
                      <div className="text-muted small text-truncate" style={{ maxWidth: '180px' }}>
                        {user?.email}
                      </div>
                      <div className="d-flex flex-wrap gap-1 mt-1">
                        <span className="badge bg-primary-subtle text-primary border border-primary-subtle text-capitalize">
                          {user?.role}
                        </span>
                        <span className="badge bg-success-subtle text-success border border-success-subtle">
                          Driver &amp; Rider
                        </span>
                      </div>
                    </li>
                    <li>
                      <Link className="dropdown-item py-2" to="/dashboard">
                        <i className="bi bi-speedometer2 me-2 text-primary"></i> Dashboard
                      </Link>
                    </li>
                    <li>
                      <Link className="dropdown-item py-2" to="/profile">
                        <i className="bi bi-person me-2 text-secondary"></i> My Profile
                      </Link>
                    </li>
                    <li>
                      <button
                        type="button"
                        className="dropdown-item py-2 text-success fw-semibold"
                        onClick={() => setShowUpiModal(true)}
                      >
                        <i className="bi bi-qr-code-scan me-2"></i> Real-Time UPI Gateway
                      </button>
                    </li>
                    {isAdmin && (
                      <li>
                        <Link className="dropdown-item py-2 text-danger fw-semibold" to="/admin">
                          <i className="bi bi-shield-lock me-2"></i> Admin Panel
                        </Link>
                      </li>
                    )}
                    <li><hr className="dropdown-divider" /></li>
                    <li>
                      <button className="dropdown-item py-2 text-danger" onClick={handleLogout}>
                        <i className="bi bi-box-arrow-right me-2"></i> Sign Out
                      </button>
                    </li>
                  </ul>
                </div>
              </>
            ) : (
              <div className="d-flex align-items-center gap-2">
                <Link to="/login" className="btn btn-outline-carpool btn-sm">
                  Sign In
                </Link>
                <Link to="/register" className="btn btn-primary-carpool btn-sm">
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Real-Time UPI Payment Modal */}
      <UpiPaymentModal
        isOpen={showUpiModal}
        onClose={() => setShowUpiModal(false)}
      />
    </nav>
  );
};
