import React from 'react';

export const RideFilter = ({ filters, onChange, onReset, localities = [] }) => {
  const handleChange = (e) => {
    const { name, value } = e.target;
    onChange({ ...filters, [name]: value });
  };

  return (
    <div className="card card-carpool p-3 mb-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h6 className="fw-bold mb-0 text-dark d-flex align-items-center gap-2">
          <i className="bi bi-funnel text-primary"></i> Filter Campus Rides
        </h6>
        <button
          type="button"
          onClick={onReset}
          className="btn btn-link btn-sm text-decoration-none text-muted p-0"
        >
          Reset All
        </button>
      </div>

      <div className="row g-2">
        {/* Origin */}
        <div className="col-md-3 col-sm-6">
          <label className="form-label small text-muted">From (Origin)</label>
          <input
            type="text"
            className="form-control form-control-sm"
            placeholder="e.g. Wakad, Baner, Kothrud"
            name="origin"
            value={filters.origin || ''}
            onChange={handleChange}
            list="origin-localities"
          />
          <datalist id="origin-localities">
            {localities.map((loc) => (
              <option key={loc.locality} value={loc.locality} />
            ))}
          </datalist>
        </div>

        {/* Destination */}
        <div className="col-md-3 col-sm-6">
          <label className="form-label small text-muted">To (Destination)</label>
          <input
            type="text"
            className="form-control form-control-sm"
            placeholder="e.g. Alandi, Campus"
            name="destination"
            value={filters.destination || ''}
            onChange={handleChange}
            list="dest-localities"
          />
          <datalist id="dest-localities">
            {localities.map((loc) => (
              <option key={loc.locality} value={loc.locality} />
            ))}
          </datalist>
        </div>

        {/* Date */}
        <div className="col-md-2 col-sm-6">
          <label className="form-label small text-muted">Travel Date</label>
          <input
            type="date"
            className="form-control form-control-sm"
            name="date"
            value={filters.date || ''}
            onChange={handleChange}
          />
        </div>

        {/* Vehicle */}
        <div className="col-md-2 col-sm-6">
          <label className="form-label small text-muted">Vehicle</label>
          <select
            className="form-select form-select-sm"
            name="vehicleType"
            value={filters.vehicleType || ''}
            onChange={handleChange}
          >
            <option value="">All Vehicles</option>
            <option value="car">Car Only</option>
            <option value="bike">Bike (2-Wheeler)</option>
          </select>
        </div>

        {/* Sort */}
        <div className="col-md-2 col-sm-6">
          <label className="form-label small text-muted">Sort By</label>
          <select
            className="form-select form-select-sm"
            name="sortBy"
            value={filters.sortBy || 'departureTime'}
            onChange={handleChange}
          >
            <option value="departureTime">Departure Time</option>
            <option value="costPerSeat">Lowest Fare</option>
            <option value="seatsAvailable">Seats Available</option>
          </select>
        </div>
      </div>
    </div>
  );
};
