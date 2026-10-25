import React from 'react';
import { Link } from 'react-router-dom';

export const RideCard = ({ ride }) => {
  if (!ride) return null;

  const departure = new Date(ride.departureTime);
  const formattedDate = departure.toLocaleDateString('en-IN', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });
  const formattedTime = departure.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit'
  });

  const isPast = departure < new Date() || ['completed', 'cancelled'].includes(ride.status);
  const isFull = ride.seatsAvailable === 0 || ride.status === 'full';

  return (
    <div className={`card card-carpool h-100 p-3 ${isPast ? 'opacity-75 bg-light' : ''}`}>
      {/* Top Header: Route & Cost */}
      <div className="d-flex justify-content-between align-items-start mb-2">
        <div className="d-flex align-items-center gap-2">
          <span className={`badge ${ride.vehicle?.type === 'bike' ? 'bg-secondary' : 'bg-primary-subtle text-primary border border-primary-subtle'} text-capitalize`}>
            <i className={`bi ${ride.vehicle?.type === 'bike' ? 'bi-bicycle' : 'bi-car-front'} me-1`}></i>
            {ride.vehicle?.type || 'car'}
          </span>
          <span className="text-muted small fw-medium">
            <i className="bi bi-calendar3 me-1"></i> {formattedDate} at {formattedTime}
          </span>
        </div>
        <div className="text-end">
          <span className="fs-5 fw-bold text-dark">₹{ride.costPerSeat}</span>
          <span className="text-muted small d-block" style={{ fontSize: '0.75rem' }}>per seat</span>
        </div>
      </div>

      {/* Origin -> Destination */}
      <div className="my-2">
        <div className="d-flex align-items-start gap-2 mb-2">
          <div className="mt-1">
            <i className="bi bi-geo-alt-fill text-success"></i>
          </div>
          <div>
            <div className="fw-bold text-dark" style={{ fontSize: '0.96rem' }}>
              {ride.origin?.name || ride.origin?.locality}
            </div>
            <div className="text-muted small">{ride.origin?.locality}</div>
          </div>
        </div>

        <div className="ps-2 ms-1 border-start border-2 my-1" style={{ borderColor: '#cbd5e1' }}>
          {ride.viaRoute && ride.viaRoute.length > 0 && (
            <div className="text-muted small py-1" style={{ fontSize: '0.8rem' }}>
              <i className="bi bi-signpost-split me-1 text-secondary"></i>
              Via: {ride.viaRoute.join(', ')}
            </div>
          )}
        </div>

        <div className="d-flex align-items-start gap-2">
          <div className="mt-1">
            <i className="bi bi-geo-alt-fill text-primary"></i>
          </div>
          <div>
            <div className="fw-bold text-dark" style={{ fontSize: '0.96rem' }}>
              {ride.destination?.name || ride.destination?.locality}
            </div>
            <div className="text-muted small">{ride.destination?.locality}</div>
          </div>
        </div>
      </div>

      {/* Driver info & Action footer */}
      <div className="d-flex justify-content-between align-items-center pt-3 mt-3 border-top">
        <div className="d-flex align-items-center gap-2">
          <div
            className="rounded-circle bg-light border text-primary fw-bold d-flex align-items-center justify-content-center"
            style={{ width: '36px', height: '36px', fontSize: '0.85rem' }}
          >
            {ride.driver?.name ? ride.driver.name.charAt(0) : 'D'}
          </div>
          <div>
            <div className="fw-semibold text-dark small">{ride.driver?.name}</div>
            <div className="d-flex align-items-center gap-1 text-muted" style={{ fontSize: '0.78rem' }}>
              <i className="bi bi-star-fill text-warning"></i>
              <span>{ride.driver?.rating?.average || 5.0}</span>
              <span>&bull;</span>
              <span className="text-truncate" style={{ maxWidth: '110px' }}>
                {ride.vehicle?.model || 'Private Vehicle'}
              </span>
            </div>
          </div>
        </div>

        <div className="d-flex align-items-center gap-2">
          {isPast ? (
            <span className="badge bg-secondary px-2 py-1">
              <i className="bi bi-clock-history me-1"></i> Departed
            </span>
          ) : (
            <span className={`badge px-2 py-1 ${isFull ? 'badge-seat-full' : 'badge-seat-open'}`}>
              {isFull ? 'Full' : `${ride.seatsAvailable} seat${ride.seatsAvailable > 1 ? 's' : ''} left`}
            </span>
          )}
          <Link to={`/rides/${ride._id}`} className="btn btn-outline-carpool btn-sm">
            Details
          </Link>
        </div>
      </div>
    </div>
  );
};
