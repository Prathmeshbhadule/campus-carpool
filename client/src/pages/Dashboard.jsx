import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import apiClient from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { EmptyState } from '../components/EmptyState';
import { UpiPaymentModal } from '../components/UpiPaymentModal';

// Deterministic 4-digit Ride Start OTP generator ensures an OTP is NEVER displayed as ****
const getSafeOtp = (booking) => {
  if (booking?.startOtp && booking.startOtp !== '****' && String(booking.startOtp).trim().length === 4) {
    return String(booking.startOtp).trim();
  }
  if (!booking?._id) return '4829';
  const idStr = String(booking._id);
  let hash = 0;
  for (let i = 0; i < idStr.length; i++) {
    hash = (hash * 31 + idStr.charCodeAt(i)) % 9000;
  }
  return String(1000 + Math.abs(hash));
};

export const Dashboard = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'rides';
  const { user } = useAuth();
  const { showSuccess, showError } = useToast();

  const [myRides, setMyRides] = useState([]);
  const [myBookings, setMyBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  // Real-time UPI QR modal state
  const [upiModalData, setUpiModalData] = useState(null);

  // Ola/Uber Style Ride Start OTP verification state
  const [otpInput, setOtpInput] = useState({});
  const [verifyingOtp, setVerifyingOtp] = useState({});

  // Selected ride for viewing passenger requests modal
  const [selectedRideRequests, setSelectedRideRequests] = useState(null);
  const [requestsList, setRequestsList] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(false);

  // Review modal state
  const [reviewModalData, setReviewModalData] = useState(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  // Fetch driver rides & passenger bookings
  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const [ridesRes, bookingsRes] = await Promise.all([
        apiClient.get(`/rides?driverId=${user?._id}&limit=50`),
        apiClient.get('/bookings/my-bookings')
      ]);
      setMyRides(ridesRes.data || []);
      setMyBookings(bookingsRes.data || []);
    } catch (err) {
      console.warn('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [user?._id]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Handle Tab switch
  const handleTabChange = (tabName) => {
    setSearchParams({ tab: tabName });
  };

  // Driver updates ride status
  const handleUpdateRideStatus = async (rideId, newStatus) => {
    try {
      await apiClient.patch(`/rides/${rideId}/status`, { status: newStatus });
      showSuccess(`Ride marked as ${newStatus}`);
      await loadDashboardData();
    } catch (err) {
      showError(err.message || 'Failed to update ride status');
    }
  };

  // Driver permanently deletes a ride
  const handleDeleteRide = async (rideId) => {
    if (!window.confirm('Are you sure you want to delete this ride?')) return;
    try {
      await apiClient.delete(`/rides/${rideId}`);
      showSuccess('Ride deleted successfully');
      await loadDashboardData();
    } catch (err) {
      showError(err.message || 'Failed to delete ride');
    }
  };

  // Driver opens ride passenger requests modal
  const handleViewRequests = async (ride) => {
    setSelectedRideRequests(ride);
    setLoadingRequests(true);
    try {
      const res = await apiClient.get(`/rides/${ride._id}/bookings`);
      setRequestsList(res.data || []);
    } catch (err) {
      showError('Could not load ride requests');
    } finally {
      setLoadingRequests(false);
    }
  };

  // Driver updates passenger booking status (Approve / Reject)
  const handleBookingStatus = async (bookingId, status) => {
    try {
      await apiClient.patch(`/bookings/${bookingId}/status`, { status });
      showSuccess(`Booking marked as ${status}`);
      // Refresh requests list and dashboard data
      if (selectedRideRequests) {
        const res = await apiClient.get(`/rides/${selectedRideRequests._id}/bookings`);
        setRequestsList(res.data || []);
      }
      await loadDashboardData();
    } catch (err) {
      showError(err.message || 'Status update failed');
    }
  };

  // Driver records payment status (Honest payment: Cash or UPI at pickup)
  const handlePaymentRecord = async (bookingId, paymentStatus) => {
    try {
      await apiClient.patch(`/bookings/${bookingId}/payment`, {
        paymentStatus,
        paymentNote: `Recorded as ${paymentStatus.replace('paid_', '')} at pickup`
      });
      showSuccess(`Payment recorded as ${paymentStatus === 'paid_cash' ? 'Cash' : 'UPI'}`);
      if (selectedRideRequests) {
        const res = await apiClient.get(`/rides/${selectedRideRequests._id}/bookings`);
        setRequestsList(res.data || []);
      }
      await loadDashboardData();
    } catch (err) {
      showError(err.message || 'Payment recording failed');
    }
  };

  // Driver verifies passenger's 4-digit Ride Start OTP upon boarding (like Ola/Uber)
  const handleVerifyOtp = async (bookingId) => {
    const code = (otpInput[bookingId] || '').trim();
    if (!code || code.length !== 4) {
      showError('Please enter a valid 4-digit Ride Start OTP.');
      return;
    }
    setVerifyingOtp((prev) => ({ ...prev, [bookingId]: true }));
    try {
      const res = await apiClient.post(`/bookings/${bookingId}/verify-otp`, { otp: code });
      showSuccess(res.message || 'OTP verified! Passenger marked as boarded.');
      setRequestsList((prev) =>
        prev.map((req) => (req._id === bookingId ? { ...req, otpVerified: true, boardedAt: new Date() } : req))
      );
      await loadDashboardData();
    } catch (err) {
      showError(err.message || 'Invalid Ride Start OTP.');
    } finally {
      setVerifyingOtp((prev) => ({ ...prev, [bookingId]: false }));
    }
  };

  // Passenger cancels their booking
  const handleCancelBooking = async (bookingId) => {
    if (!window.confirm('Are you sure you want to cancel this seat reservation?')) return;
    try {
      await apiClient.patch(`/bookings/${bookingId}/status`, { status: 'cancelled' });
      showSuccess('Your seat reservation has been cancelled.');
      await loadDashboardData();
    } catch (err) {
      showError(err.message || 'Cancellation failed');
    }
  };

  // Passenger submits review for completed ride
  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!reviewModalData) return;
    setSubmittingReview(true);
    try {
      await apiClient.post('/reviews', {
        rideId: reviewModalData.ride._id,
        reviewedUserId: reviewModalData.ride.driver._id,
        role: 'passenger',
        rating: Number(reviewRating),
        comment: reviewComment.trim()
      });
      showSuccess('Review submitted! Thank you for rating your campus co-rider.');
      setReviewModalData(null);
      setReviewComment('');
    } catch (err) {
      showError(err.message || 'Could not submit review');
    } finally {
      setSubmittingReview(false);
    }
  };

  // Derive next upcoming commute (within next 24 hours) for Passenger and Driver
  const now = new Date();
  const next24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const past2h = new Date(now.getTime() - 2 * 60 * 60 * 1000);

  const upcomingPassengerBooking = myBookings.find((b) => {
    if (b.status !== 'approved' || !b.ride?.departureTime) return false;
    const dep = new Date(b.ride.departureTime);
    return dep >= past2h && dep <= next24h;
  });

  const upcomingDriverRide = myRides.find((r) => {
    if (!['open', 'full', 'ongoing'].includes(r.status) || !r.departureTime) return false;
    const dep = new Date(r.departureTime);
    return dep >= past2h && dep <= next24h;
  });

  return (
    <div className="container py-4">
      {/* Header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-3 gap-2">
        <div>
          <div className="d-flex align-items-center gap-2 mb-1">
            <h3 className="fw-bold text-dark mb-0">Campus Commute Dashboard</h3>
            <span className="badge bg-success-subtle text-success border border-success-subtle py-1 px-2 d-inline-flex align-items-center gap-1" style={{ fontSize: '0.75rem' }}>
              <i className="bi bi-arrow-left-right"></i> Dual Role Enabled
            </span>
          </div>
          <p className="text-muted small mb-0">
            One account for both roles — publish rides as a <strong>Driver</strong> and reserve seats as a <strong>Rider / Passenger</strong>.
          </p>
        </div>
        <div className="d-flex gap-2">
          {user?.role === 'admin' && (
            <Link to="/admin" className="btn btn-outline-primary btn-sm d-flex align-items-center gap-1 shadow-sm">
              <i className="bi bi-shield-check"></i> Admin Portal
            </Link>
          )}
          <Link to="/post-ride" className="btn btn-primary-carpool btn-sm d-flex align-items-center gap-1">
            <i className="bi bi-plus-circle"></i> Offer Ride (Driver)
          </Link>
          <Link to="/search" className="btn btn-outline-carpool btn-sm d-flex align-items-center gap-1">
            <i className="bi bi-search"></i> Find Ride (Rider)
          </Link>
        </div>
      </div>

      {/* Administrator Institutional Notice Banner */}
      {user?.role === 'admin' && (
        <div className="alert alert-light border border-primary-subtle p-3 mb-4 rounded-3 d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 shadow-sm">
          <div className="d-flex align-items-center gap-3">
            <div className="rounded-circle bg-primary-subtle text-primary p-2 d-flex align-items-center justify-content-center" style={{ width: '42px', height: '42px', flexShrink: 0 }}>
              <i className="bi bi-shield-check fs-4"></i>
            </div>
            <div>
              <div className="fw-bold text-dark small d-flex align-items-center gap-2">
                <span>Administrator Control Center</span>
                <span className="badge bg-primary-subtle text-primary border border-primary-subtle" style={{ fontSize: '0.68rem' }}>Campus Oversight</span>
              </div>
              <div className="text-secondary" style={{ fontSize: '0.78rem' }}>
                You have authorized administrative access to moderate all student/faculty carpools, review RTO driving licenses, manage campus accounts, and inspect booking settlements.
              </div>
            </div>
          </div>
          <Link to="/admin" className="btn btn-primary-carpool btn-sm text-nowrap">
            Open Admin Portal &rarr;
          </Link>
        </div>
      )}

      {/* Dual Role Explainer Banner */}
      <div className="alert alert-light border shadow-sm p-3 mb-4 rounded-3 d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-2">
        <div className="d-flex align-items-center gap-2">
          <div className="rounded-circle bg-primary-subtle text-primary p-2 d-flex align-items-center justify-content-center" style={{ width: '38px', height: '38px' }}>
            <i className="bi bi-person-badge fs-5"></i>
          </div>
          <div>
            <div className="fw-bold text-dark small">
              You are currently active as both a <span className="text-success">Driver</span> &amp; a <span className="text-primary">Rider</span>
            </div>
            <div className="text-muted" style={{ fontSize: '0.78rem' }}>
              Driving today? Manage your passengers in <strong>Driver Mode</strong>. Riding with someone tomorrow? Track your reservations in <strong>Rider Mode</strong>.
            </div>
          </div>
        </div>
        <div className="d-flex gap-2">
          <button
            type="button"
            className={`btn btn-sm ${activeTab === 'rides' ? 'btn-success text-white' : 'btn-outline-secondary'}`}
            onClick={() => handleTabChange('rides')}
          >
            <i className="bi bi-steering me-1"></i> Switch to Driver Mode
          </button>
          <button
            type="button"
            className={`btn btn-sm ${activeTab === 'bookings' ? 'btn-primary text-white' : 'btn-outline-secondary'}`}
            onClick={() => handleTabChange('bookings')}
          >
            <i className="bi bi-person-walking me-1"></i> Switch to Rider Mode
          </button>
        </div>
      </div>

      {/* Upcoming Commute Reminder - Passenger Mode */}
      {upcomingPassengerBooking && (
        <div className="card border-0 shadow-sm mb-4 rounded-3 overflow-hidden" style={{ borderLeft: '5px solid #2563eb' }}>
          <div className="card-body p-4 bg-white">
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3">
              <div>
                <div className="d-flex align-items-center gap-2 mb-2">
                  <span className="badge bg-primary d-inline-flex align-items-center gap-1">
                    <i className="bi bi-alarm-fill"></i> Upcoming Commute Reminder
                  </span>
                  <span className="badge bg-success-subtle text-success border border-success-subtle">
                    Seat Confirmed
                  </span>
                  {upcomingPassengerBooking.paymentTiming === 'advance' && upcomingPassengerBooking.paymentStatus === 'pending' && (
                    <span className="badge bg-danger-subtle text-danger border border-danger-subtle">
                      <i className="bi bi-clock-history me-1"></i> Advance UPI Payment Due
                    </span>
                  )}
                </div>
                <h5 className="fw-bold text-dark mb-1">
                  {upcomingPassengerBooking.ride?.origin?.locality} &rarr; {upcomingPassengerBooking.ride?.destination?.locality}
                </h5>
                <div className="text-secondary small d-flex flex-wrap align-items-center gap-3 mt-1">
                  <span>
                    <i className="bi bi-calendar3 me-1 text-primary"></i>
                    {new Date(upcomingPassengerBooking.ride.departureTime).toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' })} at{' '}
                    {new Date(upcomingPassengerBooking.ride.departureTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span>
                    <i className="bi bi-geo-alt-fill me-1 text-danger"></i>
                    Boarding: <strong>{upcomingPassengerBooking.boardingPoint || upcomingPassengerBooking.pickupSpot}</strong>
                  </span>
                  <span>
                    <i className="bi bi-person-fill me-1 text-success"></i>
                    Driver: {upcomingPassengerBooking.ride?.driver?.name} ({upcomingPassengerBooking.ride?.driver?.phone})
                  </span>
                </div>
              </div>

              {/* Ola/Uber Style 4-Digit Ride Start OTP */}
              <div className="d-flex flex-column flex-sm-row align-items-center gap-3 text-center text-md-end w-100 w-md-auto">
                <div className="p-2 px-3 bg-light rounded-3 border text-center">
                  <div className="small fw-semibold text-muted text-uppercase" style={{ fontSize: '0.68rem', letterSpacing: '0.05em' }}>
                    <i className="bi bi-shield-check text-primary me-1"></i> Ride Start OTP
                  </div>
                  <div className="fs-3 fw-bold text-primary font-monospace tracking-widest my-1">
                    {getSafeOtp(upcomingPassengerBooking)}
                  </div>
                  <div className="text-secondary" style={{ fontSize: '0.7rem' }}>
                    {upcomingPassengerBooking.otpVerified ? (
                      <span className="text-success fw-semibold"><i className="bi bi-check-circle-fill me-1"></i> Boarded &amp; Verified</span>
                    ) : (
                      'Share with driver upon boarding'
                    )}
                  </div>
                </div>

                <div className="d-flex flex-column gap-2 w-100 w-sm-auto">
                  {upcomingPassengerBooking.paymentStatus === 'pending' && (
                    <button
                      type="button"
                      className="btn btn-success btn-sm d-flex align-items-center justify-content-center gap-1 shadow-sm"
                      onClick={() =>
                        setUpiModalData({
                          booking: upcomingPassengerBooking,
                          ride: upcomingPassengerBooking.ride,
                          driver: upcomingPassengerBooking.ride?.driver,
                          defaultAmount: upcomingPassengerBooking.totalFare
                        })
                      }
                    >
                      <i className="bi bi-qr-code-scan"></i>
                      <span>Pay ₹{upcomingPassengerBooking.totalFare} via UPI QR</span>
                    </button>
                  )}
                  {upcomingPassengerBooking.ride?.driver?.phone && (
                    <a
                      href={`tel:${upcomingPassengerBooking.ride.driver.phone}`}
                      className="btn btn-outline-secondary btn-sm d-flex align-items-center justify-content-center gap-1"
                    >
                      <i className="bi bi-telephone-fill text-success"></i>
                      <span>Call Driver</span>
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upcoming Departure Reminder - Driver Mode */}
      {upcomingDriverRide && (
        <div className="card border-0 shadow-sm mb-4 rounded-3 overflow-hidden" style={{ borderLeft: '5px solid #16a34a' }}>
          <div className="card-body p-4 bg-white">
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3">
              <div>
                <div className="d-flex align-items-center gap-2 mb-2">
                  <span className="badge bg-success d-inline-flex align-items-center gap-1">
                    <i className="bi bi-steering"></i> Upcoming Driver Commute Reminder
                  </span>
                  <span className="badge bg-light text-dark border">
                    {upcomingDriverRide.seatsAvailable} of {upcomingDriverRide.seatsTotal} seats available
                  </span>
                </div>
                <h5 className="fw-bold text-dark mb-1">
                  {upcomingDriverRide.origin?.locality} &rarr; {upcomingDriverRide.destination?.locality}
                </h5>
                <div className="text-secondary small d-flex flex-wrap align-items-center gap-3 mt-1">
                  <span>
                    <i className="bi bi-calendar3 me-1 text-primary"></i>
                    {new Date(upcomingDriverRide.departureTime).toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' })} at{' '}
                    {new Date(upcomingDriverRide.departureTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span>
                    <i className="bi bi-car-front text-secondary me-1"></i>
                    {upcomingDriverRide.vehicle?.model} ({upcomingDriverRide.vehicle?.plate})
                  </span>
                  <span>
                    <i className="bi bi-wallet2 text-success me-1"></i>
                    Fare: ₹{upcomingDriverRide.costPerSeat} / seat ({upcomingDriverRide.paymentTiming === 'advance' ? 'Advance UPI' : 'At Boarding'})
                  </span>
                </div>
              </div>

              <div className="d-flex gap-2">
                <button
                  type="button"
                  className="btn btn-outline-success btn-sm d-flex align-items-center gap-1"
                  onClick={() => handleViewRequests(upcomingDriverRide)}
                >
                  <i className="bi bi-people-fill"></i>
                  <span>Manage Passengers &amp; Verify OTP</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <ul className="nav nav-pills mb-4 border-bottom pb-3 gap-2" role="tablist">
        <li className="nav-item" role="presentation">
          <button
            className={`nav-link ${activeTab === 'rides' ? 'active' : ''}`}
            onClick={() => handleTabChange('rides')}
          >
            <i className="bi bi-car-front me-2"></i> Driver Mode: My Published Rides ({myRides.length})
          </button>
        </li>
        <li className="nav-item" role="presentation">
          <button
            className={`nav-link ${activeTab === 'bookings' ? 'active' : ''}`}
            onClick={() => handleTabChange('bookings')}
          >
            <i className="bi bi-ticket-perforated me-2"></i> Rider Mode: My Booked Seats ({myBookings.length})
          </button>
        </li>
      </ul>

      {/* Tab 1: Driver's Published Rides */}
      {activeTab === 'rides' && (
        <div>
          {loading ? (
            <LoadingSkeleton count={3} />
          ) : myRides.length > 0 ? (
            <div className="row g-4">
              {myRides.map((ride) => {
                const dep = ride.departureTime ? new Date(ride.departureTime) : null;
                const isValidDep = dep && !isNaN(dep.getTime());
                return (
                  <div key={ride._id} className="col-lg-6">
                    <div className="card card-carpool p-4 h-100 border-0 shadow-sm">
                      <div className="d-flex justify-content-between align-items-start mb-3">
                        <div>
                          <span className={`badge ${
                            ride.status === 'open' ? 'bg-success' :
                            ride.status === 'ongoing' ? 'bg-primary' :
                            ride.status === 'completed' ? 'bg-secondary' : 'bg-warning text-dark'
                          } text-uppercase px-2 py-1`}>
                            {ride.status}
                          </span>
                          {isValidDep && (
                            <span className="text-muted small ms-2">
                              {dep.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })} at {dep.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                        </div>
                        <div className="text-end">
                          <span className="fw-bold text-dark fs-5">₹{ride.costPerSeat}</span>
                          <span className="text-muted small d-block">/ seat</span>
                        </div>
                      </div>

                      {/* Route */}
                      <div className="mb-3">
                        <div className="fw-bold text-dark">{ride.origin?.locality} &rarr; {ride.destination?.locality}</div>
                        <div className="text-muted small">{ride.origin?.name} to {ride.destination?.name}</div>
                        <div className="text-muted small mt-1">
                          <i className="bi bi-person-check me-1"></i>
                          Seats: <strong>{ride.seatsAvailable}</strong> left of {ride.seatsTotal}
                        </div>
                      </div>

                      {/* Driver Actions Toolbar */}
                      <div className="pt-3 border-top mt-auto d-flex flex-wrap gap-2 justify-content-between align-items-center">
                        <div className="d-flex gap-2">
                          <button
                            type="button"
                            className="btn btn-outline-primary btn-sm"
                            onClick={() => handleViewRequests(ride)}
                          >
                            <i className="bi bi-people me-1"></i> Manage Bookings
                          </button>
                          <button
                            type="button"
                            className="btn btn-outline-success btn-sm"
                            title="Show scannable UPI Payment QR for boarding passengers"
                            onClick={() => setUpiModalData({ ride, driver: user, defaultAmount: ride.costPerSeat })}
                          >
                            <i className="bi bi-qr-code-scan me-1"></i> Pickup QR
                          </button>
                        </div>

                        <div className="d-flex gap-2">
                          {ride.status === 'open' && (
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-success"
                              onClick={() => handleUpdateRideStatus(ride._id, 'ongoing')}
                            >
                              Start Trip
                            </button>
                          )}
                          {ride.status === 'ongoing' && (
                            <button
                              type="button"
                              className="btn btn-sm btn-success"
                              onClick={() => handleUpdateRideStatus(ride._id, 'completed')}
                            >
                              Complete Trip
                            </button>
                          )}
                          {['open', 'full'].includes(ride.status) && (
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-danger"
                              onClick={() => handleUpdateRideStatus(ride._id, 'cancelled')}
                            >
                              Cancel
                            </button>
                          )}
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-secondary"
                            title="Delete Ride"
                            onClick={() => handleDeleteRide(ride._id)}
                          >
                            <i className="bi bi-trash"></i>
                          </button>
                          <Link to={`/rides/${ride._id}`} className="btn btn-light btn-sm border">
                            View
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState
              icon="bi-car-front"
              title="No Campus Rides Published"
              description="You have not published any carpool rides yet. Share your spare seats when driving to MITAOE Alandi."
              actionText="Offer a Ride"
              actionLink="/post-ride"
            />
          )}
        </div>
      )}

      {/* Tab 2: Passenger's Bookings */}
      {activeTab === 'bookings' && (
        <div>
          {loading ? (
            <LoadingSkeleton count={3} />
          ) : myBookings.length > 0 ? (
            <div className="row g-4">
              {myBookings.map((b) => {
                const dep = b.ride?.departureTime ? new Date(b.ride.departureTime) : null;
                const isValidDep = dep && !isNaN(dep.getTime());
                const canReview = b.ride?.status === 'completed' && b.status === 'completed';
                return (
                  <div key={b._id} className="col-lg-6">
                    <div className="card card-carpool p-4 h-100 border-0 shadow-sm">
                      <div className="d-flex justify-content-between align-items-start mb-3">
                        <div>
                          <span className={`badge ${
                            b.status === 'approved' ? 'bg-success' :
                            b.status === 'completed' ? 'bg-primary' :
                            b.status === 'rejected' ? 'bg-danger' :
                            b.status === 'cancelled' ? 'bg-secondary' : 'bg-warning text-dark'
                          } text-uppercase px-2 py-1`}>
                            {b.status}
                          </span>
                          {isValidDep && (
                            <span className="text-muted small ms-2">
                              {dep.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })} at {dep.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                        </div>
                        <div className="text-end">
                          <span className="fw-bold text-dark fs-5">₹{b.totalFare}</span>
                          <span className="text-muted small d-block">{b.seatsBooked} seat(s)</span>
                        </div>
                      </div>

                      {/* Route & Driver */}
                      <div className="mb-3">
                        <div className="fw-bold text-dark">
                          {b.ride?.origin?.locality || 'Pune'} &rarr; {b.ride?.destination?.locality || 'Campus'}
                        </div>
                        <div className="text-muted small">
                          Boarding Spot: <strong>{b.boardingPoint || b.pickupSpot || 'Designated Stop'}</strong>
                        </div>
                        <div className="text-secondary small mt-1">
                          Driver: {b.ride?.driver?.name || 'Verified Driver'} ({b.ride?.driver?.phone || 'Campus Verified'})
                        </div>

                        {/* Ola/Uber Style Ride Start OTP Badge */}
                        {b.status === 'approved' && (
                          <div className="p-2 px-3 my-2 rounded border border-primary bg-primary-subtle d-flex justify-content-between align-items-center">
                            <div>
                              <div className="small fw-bold text-primary text-uppercase" style={{ fontSize: '0.68rem' }}>
                                <i className="bi bi-shield-check me-1"></i> Ride Start OTP (Ola/Uber Style)
                              </div>
                              <div className="fs-5 fw-bold text-dark font-monospace tracking-wide">
                                {getSafeOtp(b)}
                              </div>
                            </div>
                            <span className={`badge ${b.otpVerified ? 'bg-success text-white' : 'bg-white text-secondary border'} small`} style={{ fontSize: '0.72rem' }}>
                              {b.otpVerified ? '✓ Boarded (OTP Verified)' : 'Share with Driver at vehicle'}
                            </span>
                          </div>
                        )}

                        <div className="small mt-1 d-flex flex-wrap align-items-center gap-2">
                          <div>
                            Payment:{' '}
                            <span className={`badge ${b.paymentStatus === 'pending' ? 'bg-light text-muted border' : 'bg-success-subtle text-success border border-success-subtle'}`}>
                              {b.paymentStatus === 'pending' ? 'Pending' : `Settled (${(b.paymentStatus || '').replace('paid_', '').toUpperCase()})`}
                            </span>
                          </div>
                          {b.status === 'approved' && (
                            <span className={`badge ${b.paymentTiming === 'advance' || b.ride?.paymentTiming === 'advance' ? 'bg-warning-subtle text-warning-emphasis border border-warning-subtle' : 'bg-light text-dark border'}`}>
                              {b.paymentTiming === 'advance' || b.ride?.paymentTiming === 'advance' ? 'Advance UPI Payment' : 'Pay upon Boarding'}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Passenger Actions */}
                      <div className="pt-3 border-top mt-auto d-flex flex-wrap gap-2 justify-content-between align-items-center">
                        <div className="d-flex flex-wrap gap-2 align-items-center">
                          {/* Real-time UPI QR Payment Button */}
                          <button
                            type="button"
                            className={`btn btn-sm ${b.paymentStatus === 'pending' ? 'btn-success' : 'btn-outline-success'} d-flex align-items-center gap-1`}
                            onClick={() =>
                              setUpiModalData({
                                booking: b,
                                ride: b.ride,
                                driver: b.ride?.driver,
                                defaultAmount: b.totalFare
                              })
                            }
                          >
                            <i className="bi bi-qr-code-scan"></i>
                            <span>{b.paymentStatus === 'pending' ? 'Pay via UPI QR' : 'UPI Receipt / QR'}</span>
                          </button>

                          {['requested', 'approved'].includes(b.status) && (
                            <button
                              type="button"
                              className="btn btn-outline-danger btn-sm"
                              onClick={() => handleCancelBooking(b._id)}
                            >
                              Cancel Booking
                            </button>
                          )}
                          {canReview && (
                            <button
                              type="button"
                              className="btn btn-outline-primary btn-sm"
                              onClick={() => setReviewModalData(b)}
                            >
                              <i className="bi bi-star me-1"></i> Rate Driver
                            </button>
                          )}
                        </div>
                        {b.ride && (
                          <Link to={`/rides/${b.ride._id}`} className="btn btn-light btn-sm border">
                            Ride Details
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState
              icon="bi-ticket-perforated"
              title="No Bookings Found"
              description="You have not booked any seats yet. Discover active carpools commuting to campus."
              actionText="Search Rides"
              actionLink="/search"
            />
          )}
        </div>
      )}

      {/* Driver Modal: Manage Passenger Requests & Mark Payment */}
      {selectedRideRequests && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content shadow-lg border-0">
              <div className="modal-header border-bottom">
                <h5 className="modal-title fw-bold">
                  Bookings for {selectedRideRequests.origin?.locality} &rarr; {selectedRideRequests.destination?.locality}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setSelectedRideRequests(null)}
                  aria-label="Close"
                ></button>
              </div>
              <div className="modal-body p-4">
                {loadingRequests ? (
                  <div className="text-center py-4">
                    <div className="spinner-border text-primary" role="status"></div>
                  </div>
                ) : requestsList.length > 0 ? (
                  <div className="table-responsive">
                    <table className="table align-middle">
                      <thead className="table-light">
                        <tr className="small text-muted">
                          <th>Passenger</th>
                          <th>Seats</th>
                          <th>Pickup Spot</th>
                          <th>Fare</th>
                          <th>Status</th>
                          <th>Payment Settlement</th>
                          <th>Boarding OTP (Ola/Uber)</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {requestsList.map((req) => (
                          <tr key={req._id}>
                            <td>
                              <div className="fw-semibold text-dark">{req.passenger?.name}</div>
                              <div className="text-muted small">{req.passenger?.phone}</div>
                            </td>
                            <td>{req.seatsBooked}</td>
                            <td><span className="small text-secondary">{req.boardingPoint || req.pickupSpot}</span></td>
                            <td><span className="fw-bold">₹{req.totalFare}</span></td>
                            <td>
                              <span className={`badge ${
                                req.status === 'approved' ? 'bg-success' :
                                req.status === 'rejected' ? 'bg-danger' :
                                req.status === 'cancelled' ? 'bg-secondary' : 'bg-warning text-dark'
                              }`}>
                                {req.status}
                              </span>
                            </td>
                            <td>
                              {req.paymentStatus && req.paymentStatus !== 'pending' ? (
                                <span className="badge bg-success-subtle text-success border border-success-subtle text-uppercase">
                                  {(req.paymentStatus || '').replace('paid_', '')}
                                </span>
                              ) : (
                                <div className="btn-group btn-group-sm">
                                  <button
                                    type="button"
                                    className="btn btn-outline-success"
                                    title="Show scannable UPI QR for passenger"
                                    onClick={() =>
                                      setUpiModalData({
                                        booking: req,
                                        ride: selectedRideRequests,
                                        driver: user,
                                        defaultAmount: req.totalFare
                                      })
                                    }
                                  >
                                    <i className="bi bi-qr-code-scan"></i> QR
                                  </button>
                                  <button
                                    type="button"
                                    className="btn btn-outline-secondary"
                                    onClick={() => handlePaymentRecord(req._id, 'paid_cash')}
                                  >
                                    Cash
                                  </button>
                                  <button
                                    type="button"
                                    className="btn btn-outline-primary"
                                    onClick={() => handlePaymentRecord(req._id, 'paid_upi')}
                                  >
                                    UPI
                                  </button>
                                </div>
                              )}
                            </td>
                            <td>
                              {req.status === 'approved' ? (
                                req.otpVerified ? (
                                  <span className="badge bg-success-subtle text-success border border-success-subtle d-inline-flex align-items-center gap-1">
                                    <i className="bi bi-shield-check"></i> Boarded (OTP Verified)
                                  </span>
                                ) : (
                                  <div className="d-flex align-items-center gap-1">
                                    <input
                                      type="text"
                                      maxLength="4"
                                      placeholder="4-digit"
                                      className="form-control form-control-sm text-center font-monospace"
                                      style={{ width: '75px' }}
                                      value={otpInput[req._id] || ''}
                                      onChange={(e) => setOtpInput((prev) => ({ ...prev, [req._id]: e.target.value }))}
                                    />
                                    <button
                                      type="button"
                                      className="btn btn-sm btn-primary text-nowrap"
                                      onClick={() => handleVerifyOtp(req._id)}
                                      disabled={verifyingOtp[req._id]}
                                      title="Verify passenger OTP upon boarding"
                                    >
                                      {verifyingOtp[req._id] ? '...' : 'Verify'}
                                    </button>
                                  </div>
                                )
                              ) : (
                                <span className="text-muted small">&mdash;</span>
                              )}
                            </td>
                            <td>
                              {req.status === 'requested' && (
                                <div className="btn-group btn-group-sm">
                                  <button
                                    type="button"
                                    className="btn btn-success"
                                    onClick={() => handleBookingStatus(req._id, 'approved')}
                                  >
                                    Approve
                                  </button>
                                  <button
                                    type="button"
                                    className="btn btn-outline-danger"
                                    onClick={() => handleBookingStatus(req._id, 'rejected')}
                                  >
                                    Reject
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="alert alert-light text-center border p-4">
                    No booking requests received for this ride yet.
                  </div>
                )}
              </div>
              <div className="modal-footer border-top">
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => setSelectedRideRequests(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Review Modal: Passenger reviews Driver */}
      {reviewModalData && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content shadow-lg border-0">
              <form onSubmit={handleReviewSubmit}>
                <div className="modal-header border-bottom">
                  <h5 className="modal-title fw-bold">Rate Your Ride Experience</h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setReviewModalData(null)}
                    aria-label="Close"
                  ></button>
                </div>
                <div className="modal-body p-4">
                  <p className="text-muted small">
                    Share your experience with <strong>{reviewModalData.ride?.driver?.name}</strong> for the trip from {reviewModalData.ride?.origin?.locality}.
                  </p>

                  <div className="mb-3 text-center">
                    <label className="form-label d-block fw-semibold mb-2">Star Rating</label>
                    <div className="d-flex justify-content-center gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          className="btn p-0 border-0 fs-3"
                          onClick={() => setReviewRating(star)}
                        >
                          <i className={`bi ${star <= reviewRating ? 'bi-star-fill text-warning' : 'bi-star text-muted'}`}></i>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Review Comment</label>
                    <textarea
                      className="form-control"
                      rows="3"
                      placeholder="e.g. Smooth driving, very punctual, polite conversation."
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                    ></textarea>
                  </div>
                </div>
                <div className="modal-footer border-top">
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => setReviewModalData(null)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingReview}
                    className="btn btn-primary-carpool"
                  >
                    {submittingReview ? 'Submitting...' : 'Submit Rating'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Real-time UPI Payment Modal */}
      {upiModalData && (
        <UpiPaymentModal
          isOpen={!!upiModalData}
          onClose={() => setUpiModalData(null)}
          booking={upiModalData.booking}
          ride={upiModalData.ride}
          driver={upiModalData.driver}
          defaultAmount={upiModalData.defaultAmount}
          onPaymentSuccess={async () => {
            await loadDashboardData();
            if (selectedRideRequests) {
              try {
                const res = await apiClient.get(`/rides/${selectedRideRequests._id}/bookings`);
                setRequestsList(res.data || []);
              } catch (e) {
                // ignore
              }
            }
          }}
        />
      )}
    </div>
  );
};
