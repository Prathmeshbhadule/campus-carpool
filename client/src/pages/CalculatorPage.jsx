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

      {/* Methodology & Formula Reference */}
      <div className="row g-4">
        <div className="col-md-6">
          <div className="card card-carpool h-100 p-4 border-0">
            <h5 className="fw-bold text-dark mb-2">
              <i className="bi bi-gear-wide-connected text-primary me-2"></i>
              Scientific Stage Fare &amp; Split Formula
            </h5>
            <p className="text-muted small mb-3">
              Standard automotive calculations adapted for Indian urban transit and intermediate waypoint boarding:
            </p>
            <ul className="small text-secondary d-flex flex-column gap-2 mb-0">
              <li>
                <strong>Multi-Stop Ratio:</strong> (Distance to Destination &minus; Distance to Boarding Stop) &divide; Total Route Distance
              </li>
              <li>
                <strong>Stage Fare per Person:</strong> Max(₹15, Round(Driver Full Fare &times; Stage Ratio))
              </li>
              <li>
                <strong>Rider Custom Amount:</strong> Allows driver and passenger to agree on a negotiated fare amount with instant total &amp; UPI QR generation.
              </li>
              <li>
                <strong>Solo Cab Fare:</strong> Base Fare (₹45) + (Stage Distance &times; ₹20/km)
              </li>
              <li>
                <strong>Net Carbon Reduction:</strong> Seats &times; (Stage Distance &times; 0.142 kg CO₂)
              </li>
              <li>
                <strong>Tree Absorption Equivalent:</strong> 1 mature Indian tree sequesters approximately <strong>21.77 kg of CO₂ per year</strong>.
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
