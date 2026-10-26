import React, { useState } from 'react';
import { MultiStopRouteFareCalculator } from '../components/MultiStopRouteFareCalculator';
import { FareCO2Calculator } from '../components/FareCO2Calculator';

export const CalculatorPage = () => {
  const [activeTab, setActiveTab] = useState('multistop'); // 'multistop' | 'general'

  return (
    <div className="container py-4">
      {/* Title */}
      <div className="mb-4 text-center">
        <span className="badge bg-primary text-white mb-2 px-3 py-1">
          <i className="bi bi-cpu-fill me-1"></i> Interactive Transit &amp; Fare Engine
        </span>
        <h2 className="fw-bold text-dark mb-1">Campus Fare Split &amp; Route Stage Calculator</h2>
        <p className="text-muted mx-auto" style={{ maxWidth: '680px' }}>
          Explore real-time multi-stop proportional fare calculations, rider-negotiated amounts, UPI payment QR generation,
          and environmental carbon savings across Pune and PCMC to MITAOE Alandi.
        </p>

        {/* Tab Switcher */}
        <div className="d-flex justify-content-center mt-3">
          <div className="btn-group p-1 bg-light rounded-pill border shadow-sm" role="group">
            <button
              type="button"
              className={`btn rounded-pill px-4 py-2 fw-semibold ${
                activeTab === 'multistop' ? 'btn-primary shadow-sm' : 'btn-light text-muted'
              }`}
              onClick={() => setActiveTab('multistop')}
            >
              <i className="bi bi-signpost-split me-1"></i> Multi-Stop Route &amp; Stage Split
            </button>
            <button
              type="button"
              className={`btn rounded-pill px-4 py-2 fw-semibold ${
                activeTab === 'general' ? 'btn-primary shadow-sm' : 'btn-light text-muted'
              }`}
              onClick={() => setActiveTab('general')}
            >
              <i className="bi bi-calculator me-1"></i> Commute &amp; CO₂ Estimator
            </button>
          </div>
        </div>
      </div>

      {/* Active Calculator Widget */}
      <div className="mb-5">
        {activeTab === 'multistop' ? (
          <MultiStopRouteFareCalculator />
        ) : (
          <FareCO2Calculator initialDistance={22} />
        )}
      </div>

      {/* Fare Sharing Guidance & Corridor Reference */}
      <div className="row g-4">
        <div className="col-md-6">
          <div className="card card-carpool h-100 p-4 border-0">
            <h5 className="fw-bold text-dark mb-2">
              <i className="bi bi-info-circle-fill text-primary me-2"></i>
              How Fare Sharing Works at MITAOE
            </h5>
            <p className="text-muted small mb-3">
              A transparent, non-profit cost-sharing model designed for college students and faculty:
            </p>
            <ul className="small text-secondary d-flex flex-column gap-3 mb-0 list-unstyled">
              <li className="d-flex align-items-start gap-2">
                <i className="bi bi-fuel-pump-fill text-success fs-6 mt-1"></i>
                <div>
                  <strong>Pure Fuel Splitting:</strong> Fares only cover actual vehicle fuel and toll costs. Drivers make no commercial profit, keeping rides 100% compliant with college rules.
                </div>
              </li>
              <li className="d-flex align-items-start gap-2">
                <i className="bi bi-geo-alt-fill text-primary fs-6 mt-1"></i>
                <div>
                  <strong>Pay Only for Your Distance:</strong> Boarding at an intermediate stop (like Wakad, Dange Chowk, or Bhosari)? You pay only for your portion of the route.
                </div>
              </li>
              <li className="d-flex align-items-start gap-2">
                <i className="bi bi-qr-code-scan text-info fs-6 mt-1"></i>
                <div>
                  <strong>Instant UPI QR &amp; Cash:</strong> Pay the driver directly upon pickup using your favorite UPI app (Google Pay, PhonePe, Paytm) or cash.
                </div>
              </li>
              <li className="d-flex align-items-start gap-2">
                <i className="bi bi-piggy-bank-fill text-warning fs-6 mt-1"></i>
                <div>
                  <strong>Huge Daily Savings:</strong> Save up to ₹150 every day compared to solo auto-rickshaws or app-cabs while cutting campus parking hassles.
                </div>
              </li>
            </ul>
          </div>
        </div>

        <div className="col-md-6">
          <div className="card card-carpool h-100 p-4 border-0">
            <h5 className="fw-bold text-dark mb-2">
              <i className="bi bi-geo-alt-fill text-success me-2"></i>
              Popular Intermediate Boarding Stages
            </h5>
            <div className="table-responsive">
              <table className="table table-sm align-middle small mb-0">
                <thead>
                  <tr className="text-muted">
                    <th>Corridor</th>
                    <th>Boarding Stop</th>
                    <th>Stage Distance</th>
                    <th>Est. Stage Fare</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Hinjawadi ➔ MITAOE</td>
                    <td>Wakad Bridge</td>
                    <td>23 km</td>
                    <td className="fw-semibold text-primary">₹59 / seat</td>
                  </tr>
                  <tr>
                    <td>Hinjawadi ➔ MITAOE</td>
                    <td>Dange Chowk</td>
                    <td>17 km</td>
                    <td className="fw-semibold text-primary">₹44 / seat</td>
                  </tr>
                  <tr>
                    <td>Hinjawadi ➔ MITAOE</td>
                    <td>Bhosari MIDC</td>
                    <td>9 km</td>
                    <td className="fw-semibold text-primary">₹23 / seat</td>
                  </tr>
                  <tr>
                    <td>Kothrud ➔ MITAOE</td>
                    <td>Shivajinagar</td>
                    <td>17 km</td>
                    <td className="fw-semibold text-primary">₹49 / seat</td>
                  </tr>
                  <tr>
                    <td>Katraj ➔ MITAOE</td>
                    <td>Yerawada</td>
                    <td>12 km</td>
                    <td className="fw-semibold text-primary">₹34 / seat</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
