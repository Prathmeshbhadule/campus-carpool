import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';

export const FareCO2Calculator = ({ initialDistance = 18 }) => {
  const [distanceKm, setDistanceKm] = useState(initialDistance);
  const [riders, setRiders] = useState(3);
  const [vehicleType, setVehicleType] = useState('car');
  const [fuelType, setFuelType] = useState('petrol');
  const [timeHorizon, setTimeHorizon] = useState('single'); // 'single' | 'month' | 'semester'
  const [copiedSummary, setCopiedSummary] = useState(false);

  // Direct tailpipe emission factors (kg CO2 per km)
  const emissionFactors = {
    car: { petrol: 0.142, diesel: 0.165, cng: 0.108, ev: 0.0 },
    bike: { petrol: 0.045, ev: 0.0 }
  };

  // Operational cost per km (fuel/energy + maintenance)
  const costPerKmTable = {
    car: { petrol: 8.5, diesel: 7.5, cng: 5.0, ev: 1.5 },
    bike: { petrol: 2.8, ev: 0.6 }
  };

  // Days multiplier for projection
  const horizonMultiplier = useMemo(() => {
    switch (timeHorizon) {
      case 'month':
        return 22; // 22 college working days/month
      case 'semester':
        return 90; // ~90 college working days/semester
      default:
        return 1;
    }
  }, [timeHorizon]);

  // Dynamic calculations via useMemo
  const metrics = useMemo(() => {
    const dist = Math.max(1, Number(distanceKm) || 1);
    const count = Math.max(1, Number(riders) || 1);

    const costPerKm = vehicleType === 'bike'
      ? (costPerKmTable.bike[fuelType] || costPerKmTable.bike.petrol)
      : (costPerKmTable.car[fuelType] || 8.0);

    const singleTripCost = Math.round(dist * costPerKm);
    const fairSharePerPerson = Math.round(singleTripCost / count);

    // Private Ola/Uber cab fare benchmark in Pune: ₹45 base + ₹20/km
    const soloCabFare = Math.round(45 + dist * 20);
    const savingsPerPerson = Math.max(0, soloCabFare - fairSharePerPerson);
    const totalGroupSavings = savingsPerPerson * Math.max(1, count - 1);

    // CO2 Emissions
    const factor = vehicleType === 'bike'
      ? (emissionFactors.bike[fuelType] || emissionFactors.bike.petrol)
      : (emissionFactors.car[fuelType] || 0.142);

    // Baseline solo benchmark emission (petrol cab: 0.142 kg/km)
    const baselineEmission = dist * 0.142;
    const actualTripEmission = dist * factor;
    // Commute pooling prevents (count - 1) separate solo trips
    const co2SavedSingleTrip = count > 1
      ? Math.max(0, ((count * baselineEmission) - actualTripEmission))
      : 0;

    const co2SavedKg = parseFloat((co2SavedSingleTrip * horizonMultiplier).toFixed(2));
    const treesEquivalent = parseFloat((co2SavedKg / 21.77).toFixed(2));

    const projectedSavingsPerPerson = savingsPerPerson * horizonMultiplier;
    const projectedSoloFare = soloCabFare * horizonMultiplier;
    const projectedFairShare = fairSharePerPerson * horizonMultiplier;

    return {
      totalTripCost: singleTripCost * horizonMultiplier,
      fairSharePerPerson,
      projectedFairShare,
      soloCabFare,
      projectedSoloFare,
      savingsPerPerson,
      projectedSavingsPerPerson,
      totalGroupSavings: totalGroupSavings * horizonMultiplier,
      co2SavedKg,
      treesEquivalent,
      savingsPercentage: soloCabFare > 0 ? Math.round((savingsPerPerson / soloCabFare) * 100) : 0,
      costPerKm,
      isEv: fuelType === 'ev'
    };
  }, [distanceKm, riders, vehicleType, fuelType, horizonMultiplier]);

  const handleCopyImpact = () => {
    const periodLabel = timeHorizon === 'semester' ? 'this Semester (90 days)' : timeHorizon === 'month' ? 'this Month (22 days)' : 'today (1 trip)';
    const text = `🌱 SynQro (MITAOE Campus Carpool) Green Impact:
- Commute: ${distanceKm} km with ${riders} riders (${vehicleType.toUpperCase()} - ${fuelType.toUpperCase()})
- Student Fare: ₹${metrics.projectedFairShare} vs Solo Cab: ₹${metrics.projectedSoloFare}
- Money Saved: ₹${metrics.projectedSavingsPerPerson} (${metrics.savingsPercentage}% off) ${periodLabel}
- Carbon Prevented: ${metrics.co2SavedKg} kg CO₂ (equiv. ${metrics.treesEquivalent} trees absorbed)
Join green student carpools on SynQro at MITAOE Alandi!`;
    navigator.clipboard.writeText(text);
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2500);
  };

  return (
    <div className="card card-carpool border-0 shadow-sm p-4">
      <div className="border-bottom pb-3 mb-4">
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
          <div>
            <h4 className="fw-bold text-dark mb-1 d-flex align-items-center gap-2">
              <i className="bi bi-calculator-fill text-primary"></i> Campus Commute &amp; CO₂ Estimator
            </h4>
            <p className="text-muted small mb-0">
              Calculate fair expense sharing, compare against solo cabs in Pune, and measure environmental emissions saved across MITAOE routes.
            </p>
          </div>
          <div className="d-flex gap-2">
            <button
              type="button"
              className="btn btn-outline-success btn-sm d-flex align-items-center gap-1"
              onClick={handleCopyImpact}
            >
              <i className={`bi ${copiedSummary ? 'bi-check-lg' : 'bi-share'}`}></i>
              {copiedSummary ? 'Impact Copied!' : 'Share Impact'}
            </button>
            <Link to="/search" className="btn btn-primary-carpool btn-sm d-flex align-items-center gap-1">
              <i className="bi bi-search"></i> Find Rides
            </Link>
          </div>
        </div>
      </div>

      <div className="row g-4">
        {/* Left Column: Interactive Inputs */}
        <div className="col-lg-6">
          <div className="d-flex flex-column gap-3">
            {/* Time Horizon Selector */}
            <div>
              <label className="form-label fw-semibold small text-muted text-uppercase mb-1">
                <i className="bi bi-calendar3 text-primary me-1"></i> Projection Timeline
              </label>
              <div className="btn-group w-100" role="group">
                <button
                  type="button"
                  className={`btn btn-sm ${timeHorizon === 'single' ? 'btn-primary' : 'btn-outline-secondary'}`}
                  onClick={() => setTimeHorizon('single')}
                >
                  Single Commute
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${timeHorizon === 'month' ? 'btn-primary' : 'btn-outline-secondary'}`}
                  onClick={() => setTimeHorizon('month')}
                >
                  Monthly (22 Days)
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${timeHorizon === 'semester' ? 'btn-primary' : 'btn-outline-secondary'}`}
                  onClick={() => setTimeHorizon('semester')}
                >
                  Semester (90 Days)
                </button>
              </div>
            </div>

            {/* One-way distance slider */}
            <div>
              <div className="d-flex justify-content-between align-items-center mb-1">
                <label className="form-label mb-0 fw-semibold">Commute Distance</label>
                <span className="badge bg-primary px-2 py-1 fs-6">{distanceKm} km</span>
              </div>
              <input
                type="range"
                className="form-range"
                min="5"
                max="50"
                step="1"
                value={distanceKm}
                onChange={(e) => setDistanceKm(Number(e.target.value))}
                aria-label="Commute distance in kilometers"
              />
              <div className="d-flex justify-content-between text-muted" style={{ fontSize: '0.75rem' }}>
                <span>5 km (Nearby Dighi/Bhosari)</span>
                <span>25 km (Baner/Kothrud)</span>
                <span>50 km (Hinjawadi Ph 3)</span>
              </div>
            </div>

            {/* Total Riders */}
            <div>
              <label className="form-label fw-semibold">Total Riders Sharing (Driver + Passengers)</label>
              <div className="d-flex gap-2">
                {(vehicleType === 'bike' ? [1, 2] : [1, 2, 3, 4, 5]).map((num) => (
                  <button
                    key={num}
                    type="button"
                    className={`btn flex-fill ${riders === num ? 'btn-primary' : 'btn-outline-secondary'}`}
                    onClick={() => setRiders(num)}
                  >
                    <i className="bi bi-person-fill"></i> {num}
                  </button>
                ))}
              </div>
            </div>

            {/* Vehicle Type */}
            <div>
              <label className="form-label fw-semibold">Vehicle Mode</label>
              <div className="row g-2">
                <div className="col-6">
                  <button
                    type="button"
                    className={`btn w-100 ${vehicleType === 'car' ? 'btn-primary' : 'btn-outline-secondary'}`}
                    onClick={() => { setVehicleType('car'); if (riders > 5) setRiders(4); }}
                  >
                    <i className="bi bi-car-front-fill me-1"></i> Car
                  </button>
                </div>
                <div className="col-6">
                  <button
                    type="button"
                    className={`btn w-100 ${vehicleType === 'bike' ? 'btn-primary' : 'btn-outline-secondary'}`}
                    onClick={() => {
                      setVehicleType('bike');
                      if (riders > 2) setRiders(2);
                      if (fuelType !== 'petrol' && fuelType !== 'ev') setFuelType('petrol');
                    }}
                  >
                    <i className="bi bi-bicycle me-1"></i> Bike (2-Wheeler)
                  </button>
                </div>
              </div>
            </div>

            {/* Fuel / Engine Option */}
            <div>
              <div className="d-flex justify-content-between align-items-center mb-1">
                <label className="form-label fw-semibold mb-0">Engine &amp; Fuel Type</label>
                {metrics.isEv && (
                  <span className="badge bg-success-subtle text-success border border-success-subtle small">
                    <i className="bi bi-lightning-charge-fill me-1"></i> Zero Tailpipe Emission
                  </span>
                )}
              </div>
              <div className="d-flex gap-2">
                {(vehicleType === 'car'
                  ? ['petrol', 'diesel', 'cng', 'ev']
                  : ['petrol', 'ev']
                ).map((fuel) => (
                  <button
                    key={fuel}
                    type="button"
                    className={`btn btn-sm flex-fill text-uppercase fw-semibold ${fuelType === fuel ? (fuel === 'ev' ? 'btn-success' : 'btn-dark') : 'btn-outline-secondary'}`}
                    onClick={() => setFuelType(fuel)}
                  >
                    {fuel === 'ev' ? '⚡ EV' : fuel}
                  </button>
                ))}
              </div>
              <div className="text-muted mt-1" style={{ fontSize: '0.74rem' }}>
                Est. running cost: ₹{metrics.costPerKm}/km based on current Pune fuel &amp; power tariffs.
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Live Savings & CO2 Impact Visualizations */}
        <div className="col-lg-6">
          <div className="bg-light p-3 rounded-3 border h-100 d-flex flex-column justify-content-between">
            {/* Fare Breakdown */}
            <div>
              <div className="d-flex justify-content-between align-items-center mb-2">
                <h6 className="fw-bold text-dark text-uppercase small tracking-wider mb-0">
                  <i className="bi bi-cash-stack text-success me-1"></i> Cost Analysis per Person
                </h6>
                <span className="badge bg-white text-muted border small">
                  {timeHorizon === 'semester' ? '90 Days Horizon' : timeHorizon === 'month' ? '22 Days Horizon' : '1 Commute'}
                </span>
              </div>

              <div className="d-flex justify-content-between align-items-center p-3 bg-white rounded border mb-2">
                <div>
                  <span className="text-muted small d-block">Fair Carpool Share</span>
                  <span className="fs-4 fw-bold text-primary">₹{metrics.projectedFairShare}</span>
                  {timeHorizon !== 'single' && (
                    <span className="text-muted small d-block" style={{ fontSize: '0.72rem' }}>
                      (₹{metrics.fairSharePerPerson} / single ride)
                    </span>
                  )}
                </div>
                <div className="text-end">
                  <span className="text-muted small d-block">Solo Cab Benchmark</span>
                  <span className="fs-5 text-muted text-decoration-line-through">₹{metrics.projectedSoloFare}</span>
                  {timeHorizon !== 'single' && (
                    <span className="text-muted small d-block" style={{ fontSize: '0.72rem' }}>
                      (₹{metrics.soloCabFare} / single ride)
                    </span>
                  )}
                </div>
              </div>

              {/* Savings Highlight */}
              <div className="alert alert-success d-flex align-items-center justify-content-between py-2 px-3 mb-3">
                <span className="fw-medium small">
                  <i className="bi bi-piggy-bank me-1"></i> Your Savings:
                </span>
                <span className="fw-bold text-success fs-5">
                  ₹{metrics.projectedSavingsPerPerson} ({metrics.savingsPercentage}% off)
                </span>
              </div>
            </div>

            {/* CO2 Environmental Impact */}
            <div className="pt-3 border-top">
              <h6 className="fw-bold text-dark text-uppercase small tracking-wider mb-2">
                <i className="bi bi-tree text-success me-1"></i> Green Campus Footprint
              </h6>

              <div className="row g-2 text-center">
                <div className="col-6">
                  <div className="p-2 bg-white rounded border">
                    <span className="text-muted small d-block" style={{ fontSize: '0.78rem' }}>CO₂ Eliminated</span>
                    <span className="fw-bold text-success fs-5">{metrics.co2SavedKg} kg</span>
                  </div>
                </div>
                <div className="col-6">
                  <div className="p-2 bg-white rounded border">
                    <span className="text-muted small d-block" style={{ fontSize: '0.78rem' }}>Equivalent Trees</span>
                    <span className="fw-bold text-success fs-5">{metrics.treesEquivalent}</span>
                  </div>
                </div>
              </div>

              <div className="mt-3 text-muted small" style={{ fontSize: '0.8rem' }}>
                <i className="bi bi-info-circle me-1"></i>
                By sharing 1 ride instead of {riders} separate solo trips, you cut carbon emissions by ~{metrics.co2SavedKg} kg {timeHorizon === 'semester' ? 'this semester' : timeHorizon === 'month' ? 'this month' : 'today'}!
              </div>

              {/* Action Buttons */}
              <div className="mt-3 pt-2 border-top d-flex gap-2">
                <Link
                  to={`/search?origin=MITAOE+Campus,+Alandi`}
                  className="btn btn-primary-carpool btn-sm w-100 d-flex align-items-center justify-content-center gap-1"
                >
                  <i className="bi bi-car-front-fill"></i> Find Carpools for this Distance
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
