import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import apiClient from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { MapView } from '../components/MapView';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { UpiPaymentModal } from '../components/UpiPaymentModal';

export const RideDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { showSuccess, showError } = useToast();

  const [rideData, setRideData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submittingBooking, setSubmittingBooking] = useState(false);
  const [showUpiModal, setShowUpiModal] = useState(false);

  // Booking & Stage Fare State
  const [seatsToBook, setSeatsToBook] = useState(1);
  const [pickupSpot, setPickupSpot] = useState('');
  const [selectedStageId, setSelectedStageId] = useState('origin');
  const [farePerSeat, setFarePerSeat] = useState(60);
  const [isCustomFare, setIsCustomFare] = useState(false);
  const [bookingErrors, setBookingErrors] = useState({});

  const fetchRide = async () => {
    try {
      const res = await apiClient.get(`/rides/${id}`);
      const payload = res?.data || res;
      setRideData(payload);
    } catch (err) {
      showError(err.message || 'Ride not found');
      navigate('/search');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRide();
  }, [id]);

  if (loading) {
    return (
      <div className="container py-5">
        <LoadingSkeleton count={2} />
      </div>
    );
  }

  const ride = rideData?.ride || (rideData?._id ? rideData : null);
  const bookings = rideData?.bookings || [];

  if (!ride) {
    return (
      <div className="container py-5 text-center">
        <div className="card p-5 border-0 shadow-sm mx-auto" style={{ maxWidth: '520px' }}>
          <div className="rounded-circle bg-light text-secondary p-3 mx-auto mb-3" style={{ width: '64px', height: '64px' }}>
            <i className="bi bi-geo-alt-slash fs-2"></i>
          </div>
          <h4 className="fw-bold text-dark mb-2">Commute Not Found</h4>
          <p className="text-muted small mb-4">
            This carpool ride is no longer available, was completed, or the link may be invalid.
          </p>
          <div className="d-flex justify-content-center gap-2">
            <Link to="/search" className="btn btn-primary-carpool btn-sm">
              <i className="bi bi-search me-1"></i> Browse Upcoming Rides
            </Link>
            <Link to="/post-ride" className="btn btn-outline-secondary btn-sm">
              <i className="bi bi-plus-circle me-1"></i> Post a Ride
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isDriver = user && ride.driver?._id === user._id;
  const departure = new Date(ride.departureTime);
  const formattedDate = departure.toLocaleDateString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  const formattedTime = departure.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit'
  });

  const isPast = departure < new Date() || ['completed', 'cancelled'].includes(ride.status);
  const isFull = ride.seatsAvailable === 0 || ride.status === 'full';
  const hasAlreadyBooked = user && bookings.some((b) => b.passenger?._id === user._id && ['requested', 'approved'].includes(b.status));
  const myBooking = bookings.find((b) => b.passenger?._id === user?._id);

  // Derive intermediate boarding stages along route (Origin A -> C -> D -> E -> Destination B)
  const boardingStages = useMemo(() => {
    if (!ride) return [];
    const stages = [
      {
        id: 'origin',
        name: `${ride.origin?.name || ride.origin?.locality} (Source A)`,
        locality: ride.origin?.locality || 'Origin',
        isOrigin: true,
        ratio: 1.0,
        suggestedFare: ride.costPerSeat
      }
    ];

    const waypoints = Array.isArray(ride.viaRoute) ? ride.viaRoute : [];
    const totalSegments = waypoints.length + 1;

    waypoints.forEach((stop, index) => {
      const remainingSegments = totalSegments - (index + 1);
      const ratio = Math.max(0.2, remainingSegments / totalSegments);
      const suggestedFare = Math.max(15, Math.round(ride.costPerSeat * ratio));
      stages.push({
        id: `waypoint-${index}`,
        name: `${stop} (Stop ${String.fromCharCode(67 + index)})`,
        locality: stop,
        isWaypoint: true,
        ratio,
        suggestedFare
      });
    });

    stages.push({
      id: 'custom',
      name: 'Custom Pickup Spot Along Route',
      locality: 'Custom Spot',
      isCustom: true,
      ratio: 1.0,
      suggestedFare: ride.costPerSeat
    });

    return stages;
  }, [ride]);

  // Handle stage selection
  const handleStageSelect = (stageId) => {
    setSelectedStageId(stageId);
    const found = boardingStages.find((s) => s.id === stageId);
    if (found) {
      if (stageId === 'origin') {
        setFarePerSeat(ride.costPerSeat);
        setPickupSpot(ride.origin?.name || ride.origin?.locality || '');
      } else if (stageId === 'custom') {
        setFarePerSeat(ride.costPerSeat);
        setPickupSpot('');
      } else {
        setFarePerSeat(found.suggestedFare);
        setPickupSpot(found.locality);
      }
      setIsCustomFare(false);
    }
  };

  const effectivePerSeatFare = Number(farePerSeat) > 0 ? Math.round(Number(farePerSeat)) : (ride.costPerSeat || 50);
  const calculatedTotalFare = effectivePerSeatFare * seatsToBook;

  // Client-side booking validation
  const validateBooking = () => {
    const errs = {};
    if (!pickupSpot.trim()) {
      errs.pickupSpot = 'Please specify your exact pickup landmark or chowk';
    } else if (pickupSpot.trim().length < 3) {
      errs.pickupSpot = 'Pickup spot must be at least 3 characters long';
    }

    if (seatsToBook < 1) {
      errs.seats = 'Must book at least 1 seat';
    } else if (seatsToBook > ride.seatsAvailable) {
      errs.seats = `Only ${ride.seatsAvailable} seat(s) remaining`;
    }

    if (isNaN(effectivePerSeatFare) || effectivePerSeatFare < 10 || effectivePerSeatFare > 500) {
      errs.fare = 'Fare per seat must be between ₹10 and ₹500';
    }

    setBookingErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      navigate('/login', { state: { from: { pathname: `/rides/${id}` } } });
      return;
    }

    if (!validateBooking()) return;

    setSubmittingBooking(true);
    try {
      const selectedStage = boardingStages.find((s) => s.id === selectedStageId);
      const stageLabel = selectedStage && !selectedStage.isCustom ? selectedStage.name : pickupSpot.trim();

      await apiClient.post(`/rides/${id}/bookings`, {
        seatsBooked: Number(seatsToBook),
        pickupSpot: pickupSpot.trim(),
        boardingPoint: stageLabel,
        customFare: effectivePerSeatFare
      });

      showSuccess(`Booking requested for ${seatsToBook} seat(s) at ₹${effectivePerSeatFare}/seat! The driver has been notified.`);
      setPickupSpot('');
      // Refresh ride state
      await fetchRide();
    } catch (err) {
      showError(err.message || 'Failed to request booking');
    } finally {
      setSubmittingBooking(false);
    }
  };

  return (
    <div className="container py-4">
      {/* Breadcrumb */}
      <nav aria-label="breadcrumb" className="mb-3">
        <ol className="breadcrumb small">
          <li className="breadcrumb-item"><Link to="/">Home</Link></li>
          <li className="breadcrumb-item"><Link to="/search">Rides</Link></li>
          <li className="breadcrumb-item active" aria-current="page">{ride.origin?.locality} to {ride.destination?.locality}</li>
        </ol>
      </nav>

      <div className="row g-4">
        {/* Left Column: Route Details & Map */}
        <div className="col-lg-8">
          <div className="card card-carpool border-0 p-4 mb-4">
            {/* Status and Vehicle header */}
            <div className="d-flex justify-content-between align-items-center mb-3">
              <div className="d-flex align-items-center gap-2">
                <span className="badge bg-primary-subtle text-primary border border-primary-subtle text-capitalize px-3 py-1">
                  <i className={`bi ${ride.vehicle?.type === 'bike' ? 'bi-bicycle' : 'bi-car-front'} me-1`}></i>
                  {ride.vehicle?.type || 'car'} Commute
                </span>
                <span className="badge bg-light text-dark border">
                  Status: <strong className="text-capitalize">{ride.status}</strong>
                </span>
              </div>
              <div className="text-end">
                <span className="fs-3 fw-bold text-dark">₹{ride.costPerSeat}</span>
                <span className="text-muted small d-block">per person</span>
              </div>
            </div>

            {/* Route Landmarks */}
            <div className="my-3 p-3 bg-light rounded-3">
              <div className="d-flex align-items-start gap-3 mb-3">
                <div className="mt-1">
                  <i className="bi bi-record-circle-fill text-success fs-5"></i>
                </div>
                <div>
                  <div className="small text-muted text-uppercase fw-bold">Pickup Origin</div>
                  <h5 className="fw-bold mb-0 text-dark">{ride.origin?.name}</h5>
                  <div className="text-muted small">{ride.origin?.locality}, Pune/PCMC</div>
                </div>
              </div>

              {ride.viaRoute && ride.viaRoute.length > 0 && (
                <div className="ps-4 ms-2 border-start border-2 my-2 py-2" style={{ borderColor: '#94a3b8' }}>
                  <div className="small text-muted fw-medium">
                    <i className="bi bi-signpost-split me-1 text-primary"></i>
                    Intermediate Route Stops:
                  </div>
                  <div className="d-flex flex-wrap gap-2 mt-1">
                    {ride.viaRoute.map((stop, i) => (
                      <span key={i} className="badge bg-white text-secondary border">
                        {stop}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="d-flex align-items-start gap-3 mt-3">
                <div className="mt-1">
                  <i className="bi bi-geo-alt-fill text-primary fs-5"></i>
                </div>
                <div>
                  <div className="small text-muted text-uppercase fw-bold">Drop Location</div>
                  <h5 className="fw-bold mb-0 text-dark">{ride.destination?.name}</h5>
                  <div className="text-muted small">{ride.destination?.locality} Campus</div>
                </div>
              </div>
            </div>

            {/* Schedule & Notes */}
            <div className="row g-3 py-3 border-top">
              <div className="col-md-6">
                <span className="text-muted small d-block">Departure Date &amp; Time</span>
                <span className="fw-semibold text-dark">
                  <i className="bi bi-clock me-1 text-primary"></i> {formattedDate} at {formattedTime}
                </span>
              </div>
              <div className="col-md-6">
                <span className="text-muted small d-block">Vehicle Details</span>
                <span className="fw-semibold text-dark">
                  {ride.vehicle?.model || 'Private Vehicle'} ({ride.vehicle?.plate || 'Verified'})
                </span>
              </div>
              {ride.notes && (
                <div className="col-12">
                  <span className="text-muted small d-block">Driver Commute Notes</span>
                  <div className="p-2 bg-light rounded text-secondary small">
                    "{ride.notes}"
                  </div>
                </div>
              )}
            </div>

            {/* Map View & Live GPS Telemetry */}
            <div className="mt-4">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <h6 className="fw-bold text-dark mb-0">
                  <i className="bi bi-map-fill text-primary me-1"></i> Interactive Route &amp; Live GPS Tracking
                </h6>
                <span className="badge bg-light text-muted border">
                  Google Maps &amp; Live Telemetry
                </span>
              </div>
              <MapView
                origin={ride.origin}
                destination={ride.destination}
                viaRoute={ride.viaRoute}
                rideId={ride._id}
                isDriver={isDriver}
                vehicleType={ride.vehicle?.type}
                height="420px"
              />
            </div>
          </div>

          {/* Passenger List */}
          <div className="card card-carpool border-0 p-4">
            <h5 className="fw-bold text-dark mb-3">
              Co-Riders on this Commute ({bookings.filter(b => ['approved', 'completed'].includes(b.status)).length} Confirmed)
            </h5>
            {bookings.length > 0 ? (
              <div className="d-flex flex-column gap-2">
                {bookings.map((b) => (
                  <div key={b._id} className="d-flex justify-content-between align-items-center p-2 bg-light rounded border">
                    <div className="d-flex align-items-center gap-2">
                      <div className="rounded-circle bg-white border text-primary fw-bold d-flex align-items-center justify-content-center" style={{ width: '32px', height: '32px', fontSize: '0.8rem' }}>
                        {b.passenger?.name?.charAt(0) || 'P'}
                      </div>
                      <div>
                        <div className="fw-semibold small text-dark">{b.passenger?.name}</div>
                        <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                          Boarding: <strong>{b.boardingPoint || b.pickupSpot}</strong> &bull; {b.seatsBooked} seat(s) &bull; <span className="text-success fw-semibold">₹{b.totalFare}</span>
                        </div>
                      </div>
                    </div>
                    <span className={`badge ${b.status === 'approved' ? 'bg-success' : b.status === 'completed' ? 'bg-primary' : 'bg-warning text-dark'}`}>
                      {b.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-muted small">No other bookings on this ride yet. Be the first to join!</div>
            )}
          </div>
        </div>

        {/* Right Column: Driver Info & Booking Box */}
        <div className="col-lg-4">
          {/* Driver Card */}
          <div className="card card-carpool border-0 p-4 mb-4">
            <h6 className="fw-bold text-uppercase text-muted small mb-3">Driver Profile</h6>
            <div className="d-flex align-items-center gap-3 mb-3">
              <div
                className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center fw-bold fs-4"
                style={{ width: '56px', height: '56px' }}
              >
                {ride.driver?.name?.charAt(0) || 'D'}
              </div>
              <div>
                <h6 className="fw-bold mb-0 text-dark">{ride.driver?.name}</h6>
                <div className="text-muted small">{ride.driver?.department}</div>
                <div className="d-flex align-items-center gap-1 mt-1 text-warning small">
                  <i className="bi bi-star-fill"></i>
                  <span className="fw-bold text-dark">{ride.driver?.rating?.average || 5.0}</span>
                  <span className="text-muted">({ride.driver?.rating?.count || 0} reviews)</span>
                </div>
              </div>
            </div>

            <div className="pt-2 border-top small text-secondary">
              <div className="d-flex justify-content-between py-1">
                <span>College Role:</span>
                <strong className="text-capitalize text-dark">{ride.driver?.role}</strong>
              </div>
              <div className="d-flex justify-content-between py-1">
                <span>Campus Verification:</span>
                <span className="text-success fw-semibold"><i className="bi bi-patch-check-fill me-1"></i> Verified</span>
              </div>
              {isAuthenticated && (
                <div className="d-flex justify-content-between py-1">
                  <span>Contact Phone:</span>
                  <span className="text-dark fw-medium">{ride.driver?.phone || 'Hidden until confirmed'}</span>
                </div>
              )}
            </div>
          </div>

          {/* Booking Card */}
          <div className="card card-carpool border-0 p-4 shadow-sm">
            <h5 className="fw-bold text-dark mb-2">Reserve Your Seat</h5>
            <div className="d-flex align-items-center justify-content-between mb-3">
              <span className="text-muted small">Remaining Seats:</span>
              <span className={`badge px-2 py-1 ${isFull ? 'badge-seat-full' : 'badge-seat-open'}`}>
                {isFull ? 'Full' : `${ride.seatsAvailable} of ${ride.seatsTotal} available`}
              </span>
            </div>

            {isDriver ? (
              <div className="alert alert-info small mb-0">
                <i className="bi bi-info-circle me-1"></i> You published this ride. Review booking requests from your <strong>Dashboard</strong>.
              </div>
            ) : hasAlreadyBooked ? (
              <div>
                <div className="alert alert-success small mb-3">
                  <i className="bi bi-check-circle me-1"></i> You have an active booking on this ride. Track its status in your <strong>Dashboard</strong>.
                </div>
                <button
                  type="button"
                  className="btn btn-success w-100 py-2 d-flex align-items-center justify-content-center gap-2 mb-2 shadow-sm"
                  onClick={() => setShowUpiModal(true)}
                >
                  <i className="bi bi-qr-code-scan fs-5"></i> Pay Driver via Real-Time UPI QR
                </button>
              </div>
            ) : isPast ? (
              <div className="alert alert-secondary small mb-0">
                <i className="bi bi-clock-history me-1"></i> This commute departed on <strong>{formattedDate} at {formattedTime}</strong> and is no longer accepting new bookings.
              </div>
            ) : isFull ? (
              <div className="alert alert-warning small mb-0">
                <i className="bi bi-exclamation-circle me-1"></i> This ride is currently full. Please search for other upcoming carpools.
              </div>
            ) : (
              <form onSubmit={handleBookingSubmit} noValidate>
                {/* Boarding Point on Route (Intermediate Stop C, D, E) */}
                <div className="mb-3 p-3 bg-light rounded-3 border">
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <label className="form-label small fw-bold mb-0 text-dark">
                      <i className="bi bi-geo-alt-fill text-primary me-1"></i> Boarding Point on Route
                    </label>
                    <span className="badge bg-primary-subtle text-primary border border-primary-subtle" style={{ fontSize: '0.68rem' }}>
                      Stage Split
                    </span>
                  </div>
                  <p className="text-muted small mb-2" style={{ fontSize: '0.75rem' }}>
                    Boarding at an intermediate stop? Select below for auto-calculated proportional fare or enter an agreed amount.
                  </p>
                  <select
                    className="form-select form-select-sm mb-2"
                    value={selectedStageId}
                    onChange={(e) => handleStageSelect(e.target.value)}
                  >
                    {boardingStages.map((stage) => (
                      <option key={stage.id} value={stage.id}>
                        {stage.isOrigin
                          ? `[Source A] ${stage.name} - Full (₹${stage.suggestedFare})`
                          : stage.isWaypoint
                          ? `[Via Stop] ${stage.name} - Est. Stage (₹${stage.suggestedFare})`
                          : `[Custom] ${stage.name}`}
                      </option>
                    ))}
                  </select>

                  {/* Pickup landmark text */}
                  <label className="form-label small fw-semibold mb-1 text-secondary" style={{ fontSize: '0.78rem' }}>
                    Specific Pickup Chowk / Landmark
                  </label>
                  <input
                    type="text"
                    className={`form-control form-control-sm ${bookingErrors.pickupSpot ? 'is-invalid' : ''}`}
                    placeholder="e.g. Under Wakad flyover / Dange Chowk bus stop"
                    value={pickupSpot}
                    onChange={(e) => {
                      setPickupSpot(e.target.value);
                      if (bookingErrors.pickupSpot) {
                        setBookingErrors((prev) => ({ ...prev, pickupSpot: '' }));
                      }
                    }}
                  />
                  {bookingErrors.pickupSpot && (
                    <div className="form-feedback-error">{bookingErrors.pickupSpot}</div>
                  )}

                  {/* Stage Fare per Seat & Custom Adjustment */}
                  <div className="mt-2 pt-2 border-top">
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <span className="small fw-semibold text-secondary" style={{ fontSize: '0.78rem' }}>
                        Fare per Seat (₹):
                      </span>
                      {isCustomFare && (
                        <span className="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle" style={{ fontSize: '0.68rem' }}>
                          Custom / Negotiated
                        </span>
                      )}
                    </div>
                    <div className="input-group input-group-sm">
                      <span className="input-group-text">₹</span>
                      <input
                        type="number"
                        min="10"
                        max="500"
                        className={`form-control ${bookingErrors.fare ? 'is-invalid' : ''}`}
                        value={farePerSeat}
                        onChange={(e) => {
                          setFarePerSeat(e.target.value);
                          setIsCustomFare(true);
                          if (bookingErrors.fare) setBookingErrors((prev) => ({ ...prev, fare: '' }));
                        }}
                      />
                      <button
                        type="button"
                        className="btn btn-outline-secondary"
                        title="Reset to default stage fare"
                        onClick={() => {
                          const found = boardingStages.find((s) => s.id === selectedStageId);
                          setFarePerSeat(found ? found.suggestedFare : ride.costPerSeat);
                          setIsCustomFare(false);
                        }}
                      >
                        Reset
                      </button>
                    </div>
                    {bookingErrors.fare && (
                      <div className="form-feedback-error">{bookingErrors.fare}</div>
                    )}
                  </div>
                </div>

                {/* Seats selection */}
                <div className="mb-3">
                  <label className="form-label small fw-semibold">Seats to Reserve</label>
                  <select
                    className={`form-select ${bookingErrors.seats ? 'is-invalid' : ''}`}
                    value={seatsToBook}
                    onChange={(e) => setSeatsToBook(Number(e.target.value))}
                  >
                    {Array.from({ length: Math.min(ride.seatsAvailable, 4) }).map((_, i) => (
                      <option key={i + 1} value={i + 1}>
                        {i + 1} seat{i > 0 ? 's' : ''} (₹{effectivePerSeatFare * (i + 1)})
                      </option>
                    ))}
                  </select>
                  {bookingErrors.seats && (
                    <div className="form-feedback-error">{bookingErrors.seats}</div>
                  )}
                </div>

                {/* Honest Payment Notice */}
                <div className="alert alert-light border small py-2 px-3 mb-3">
                  <div className="fw-semibold text-dark mb-1">
                    <i className="bi bi-shield-lock text-primary me-1"></i> Transparent Payment
                  </div>
                  <div className="text-muted" style={{ fontSize: '0.78rem' }}>
                    Payment is made directly to the driver via <strong>Cash or UPI at pickup</strong>. The driver records settlement confirmation in the app.
                  </div>
                </div>

                {/* Instant Real-Time UPI QR Payment Button */}
                <button
                  type="button"
                  className="btn btn-outline-success w-100 py-2 mb-3 d-flex align-items-center justify-content-center gap-2"
                  onClick={() => setShowUpiModal(true)}
                >
                  <i className="bi bi-qr-code-scan"></i> Real-Time UPI QR &bull; ₹{calculatedTotalFare}
                </button>

                <button
                  type="submit"
                  disabled={submittingBooking}
                  className="btn btn-primary-carpool w-100 py-2 d-flex align-items-center justify-content-center gap-2"
                >
                  {submittingBooking ? (
                    <>
                      <span className="spinner-border spinner-border-sm" role="status"></span>
                      Submitting Request...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-send-check"></i> Request Seat &bull; ₹{calculatedTotalFare}
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Real-Time UPI Payment Modal */}
      <UpiPaymentModal
        isOpen={showUpiModal}
        onClose={() => setShowUpiModal(false)}
        booking={myBooking}
        ride={ride}
        driver={ride.driver}
        defaultAmount={myBooking ? myBooking.totalFare : calculatedTotalFare}
        onPaymentSuccess={() => {
          fetchRide();
        }}
      />
    </div>
  );
};
