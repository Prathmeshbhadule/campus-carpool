import React from 'react';
import { Link } from 'react-router-dom';

export const Footer = () => {
  return (
    <footer className="bg-white border-top mt-auto py-5 text-slate-600" aria-label="Site Footer">
      <div className="container">
        <div className="row g-4">
          {/* Column 1: Info & Context */}
          <div className="col-lg-5 col-md-6">
            <div className="d-flex align-items-center gap-2 mb-3">
              <div className="bg-primary text-white rounded p-1 d-flex align-items-center justify-content-center" style={{ width: '30px', height: '30px' }}>
                <i className="bi bi-car-front-fill fs-6"></i>
              </div>
              <span className="fw-bold text-dark fs-6">MITAOE Campus Carpool</span>
            </div>
            <p className="small mb-3 text-muted">
              A verified intra-campus ride-sharing platform designed for students, faculty, and staff commuting across Pune and PCMC localities to the MIT Academy of Engineering campus in Alandi.
            </p>
            <div className="small text-secondary">
              <span className="fw-semibold">Platform:</span> Verified Intra-Campus Transit Network<br />
              <span className="fw-semibold">Institution:</span> MIT Academy of Engineering, Pune
            </div>
          </div>

          {/* Column 2: Quick Links */}
          <div className="col-lg-3 col-md-3 col-6">
            <h6 className="fw-bold text-dark mb-3">Platform Navigation</h6>
            <ul className="list-unstyled small d-flex flex-column gap-2 mb-0">
              <li><Link to="/search" className="text-decoration-none text-muted hover-primary">Search Pune Commutes</Link></li>
              <li><Link to="/post-ride" className="text-decoration-none text-muted">Offer a Campus Ride</Link></li>
              <li><Link to="/calculator" className="text-decoration-none text-muted">Fare Split &amp; CO₂ Calculator</Link></li>
              <li><Link to="/upi-payment" className="text-decoration-none text-muted">Real-Time UPI Payment</Link></li>
              <li><Link to="/dashboard" className="text-decoration-none text-muted">My Rides &amp; Bookings</Link></li>
            </ul>
          </div>

          {/* Column 3: Developer & API Resources */}
          <div className="col-lg-4 col-md-3 col-6">
            <h6 className="fw-bold text-dark mb-3">Developer &amp; API Resources</h6>
            <ul className="list-unstyled small d-flex flex-column gap-2 mb-3">
              <li>
                <a href="http://localhost:5000/api/docs" target="_blank" rel="noreferrer" className="text-decoration-none text-primary fw-medium">
                  <i className="bi bi-file-code me-1"></i> Interactive Swagger API Docs
                </a>
              </li>
              <li>
                <a href="http://localhost:5000/health" target="_blank" rel="noreferrer" className="text-decoration-none text-muted">
                  <i className="bi bi-activity me-1"></i> Backend Health Endpoint
                </a>
              </li>
            </ul>
            <p className="text-muted" style={{ fontSize: '0.8rem' }}>
              MIT Academy of Engineering, Dehu Phata, Alandi (D.), Pune - 412105, Maharashtra, India.
            </p>
          </div>
        </div>

        <div className="border-top pt-4 mt-4 d-flex flex-column flex-md-row justify-content-between align-items-center small text-muted">
          <div>
            &copy; {new Date().getFullYear()} MITAOE Campus Carpool. All rights reserved.
          </div>
          <div className="d-flex gap-3 mt-2 mt-md-0">
            <span className="badge bg-success-subtle text-success border border-success-subtle">
              <i className="bi bi-shield-check me-1"></i> Verified MITAOE Accounts Only
            </span>
            <span className="badge bg-primary-subtle text-primary border border-primary-subtle">
              <i className="bi bi-geo-alt me-1"></i> 36 Pune/PCMC Hubs
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};
