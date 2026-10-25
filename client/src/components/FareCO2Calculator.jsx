import React, { useState, useMemo } from 'react';

export const FareCO2Calculator = ({ initialDistance = 18 }) => {
  const [distanceKm, setDistanceKm] = useState(initialDistance);
  const [riders, setRiders] = useState(3);
  const [vehicleType, setVehicleType] = useState('car');
  const [fuelType, setFuelType] = useState('petrol');

  // Emission factors (kg CO2 per km)
  const emissionFactors = {
    car: { petrol: 0.142, diesel: 0.165, cng: 0.108 },
    bike: { petrol: 0.045 }
  };

  // Operational cost per km
  const costPerKmTable = {
    car: { petrol: 8.5, diesel: 7.5, cng: 5.0 },
    bike: { petrol: 2.8 }
  };

  // Dynamic calculations via useMemo
  const metrics = useMemo(() => {
    const dist = Math.max(1, Number(distanceKm) || 1);
    const count = Math.max(1, Number(riders) || 1);

    const costPerKm = vehicleType === 'bike'
      ? costPerKmTable.bike.petrol
      : (costPerKmTable.car[fuelType] || 8.0);

    const totalTripCost = Math.round(dist * costPerKm);
    const fairSharePerPerson = Math.round(totalTripCost / count);

    // Private Ola/Uber cab fare benchmark in Pune: ₹45 base + ₹20/km
    const soloCabFare = Math.round(45 + dist * 20);
    const savingsPerPerson = Math.max(0, soloCabFare - fairSharePerPerson);
    const totalGroupSavings = savingsPerPerson * Math.max(1, count - 1);

    // CO2 Emissions
    const factor = vehicleType === 'bike'
      ? emissionFactors.bike.petrol
      : (emissionFactors.car[fuelType] || 0.142);

    const singleCarEmission = dist * factor;
    // Carpool reduces (count - 1) separate vehicle trips
    const co2SavedKg = count > 1 ? parseFloat(((count - 1) * singleCarEmission).toFixed(2)) : 0;
    const treesEquivalent = parseFloat((co2SavedKg / 21.77).toFixed(2));

    return {
      totalTripCost,
      fairSharePerPerson,
      soloCabFare,
      savingsPerPerson,
      totalGroupSavings,
      co2SavedKg,
      treesEquivalent,
      savingsPercentage: soloCabFare > 0 ? Math.round((savingsPerPerson / soloCabFare) * 100) : 0
    };
  }, [distanceKm, riders, vehicleType, fuelType]);

  return (
    <div className="card card-carpool border-0 shadow-sm p-4">
      <div className="border-bottom pb-3 mb-4">
        <h4 className="fw-bold text-dark mb-1 d-flex align-items-center gap-2">
          <i className="bi bi-calculator-fill text-primary"></i> Campus Commute &amp; CO₂ Estimator
        </h4>
        <p className="text-muted small mb-0">
          Calculate fair expense sharing, compare against solo cabs in Pune, and measure environmental emissions saved.
        </p>
      </div>

      <div className="row g-4">
        {/* Left Column: Interactive Inputs */}
        <div className="col-lg-6">
          <div className="d-flex flex-column gap-3">
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
                {[1, 2, 3, 4, 5].map((num) => (
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
                    onClick={() => { setVehicleType('bike'); setRiders(2); }}
                  >
                    <i className="bi bi-bicycle me-1"></i> Bike (2-Wheeler)
                  </button>
                </div>
              </div>
            </div>

            {/* Fuel type if Car */}
            {vehicleType === 'car' && (
              <div>
                <label className="form-label fw-semibold">Fuel / Engine</label>
                <div className="d-flex gap-2">
                  {['petrol', 'diesel', 'cng'].map((fuel) => (
                    <button
                      key={fuel}
                      type="button"
                      className={`btn btn-sm flex-fill text-capitalize ${fuelType === fuel ? 'btn-dark' : 'btn-outline-secondary'}`}
                      onClick={() => setFuelType(fuel)}
                    >
                      {fuel}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Live Savings & CO2 Impact Visualizations */}
        <div className="col-lg-6">
          <div className="bg-light p-3 rounded-3 border h-100 d-flex flex-column justify-content-between">
            {/* Fare Breakdown */}
            <div>
              <h6 className="fw-bold text-dark text-uppercase small tracking-wider mb-3">
                <i className="bi bi-cash-stack text-success me-1"></i> Cost Analysis per Person
              </h6>

              <div className="d-flex justify-content-between align-items-center p-3 bg-white rounded border mb-2">
                <div>
                  <span className="text-muted small d-block">Fair Carpool Share</span>
                  <span className="fs-4 fw-bold text-primary">₹{metrics.fairSharePerPerson}</span>
                </div>
                <div className="text-end">
                  <span className="text-muted small d-block">Solo Cab Benchmark</span>
                  <span className="fs-5 text-muted text-decoration-line-through">₹{metrics.soloCabFare}</span>
                </div>
              </div>

              {/* Savings Highlight */}
              <div className="alert alert-success d-flex align-items-center justify-content-between py-2 px-3 mb-3">
                <span className="fw-medium small">
                  <i className="bi bi-piggy-bank me-1"></i> Your Savings:
                </span>
                <span className="fw-bold text-success fs-5">
                  ₹{metrics.savingsPerPerson} ({metrics.savingsPercentage}% off)
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
                By sharing 1 ride instead of {riders} separate solo trips, you cut carbon emissions by ~{metrics.co2SavedKg} kg today!
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
