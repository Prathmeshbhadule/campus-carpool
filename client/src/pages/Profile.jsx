import React, { useState, useEffect } from 'react';
import apiClient from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { LoadingSkeleton } from '../components/LoadingSkeleton';

export const Profile = () => {
  const { user, updateUserData } = useAuth();
  const { showSuccess, showError } = useToast();

  const [profileData, setProfileData] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('');
  const [phone, setPhone] = useState('');
  const [hasVehicle, setHasVehicle] = useState(false);
  const [vehicleType, setVehicleType] = useState('car');
  const [vehicleModel, setVehicleModel] = useState('');
  const [vehiclePlate, setVehiclePlate] = useState('');

  useEffect(() => {
    const fetchProfileAndReviews = async () => {
      try {
        const [profRes, reviewsRes] = await Promise.all([
          apiClient.get('/users/profile'),
          apiClient.get(`/reviews/user/${user?._id}`)
        ]);

        const u = profRes.data.user;
        setProfileData(profRes.data);
        setReviews(reviewsRes.data || []);

        setName(u.name || '');
        setDepartment(u.department || '');
        setPhone(u.phone || '');
        setHasVehicle(Boolean(u.vehicle?.hasVehicle));
        setVehicleType(u.vehicle?.type === 'bike' ? 'bike' : 'car');
        setVehicleModel(u.vehicle?.model || '');
        setVehiclePlate(u.vehicle?.plate || '');
      } catch (err) {
        console.warn('Profile fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfileAndReviews();
  }, [user?._id]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        department,
        phone: phone.trim(),
        vehicle: {
          hasVehicle,
          type: hasVehicle ? vehicleType : 'none',
          model: hasVehicle ? vehicleModel.trim() : '',
          plate: hasVehicle ? vehiclePlate.trim() : ''
        }
      };

      const res = await apiClient.put('/users/profile', payload);
      updateUserData(res.data);
      showSuccess('Profile and vehicle details updated successfully!');
    } catch (err) {
      showError(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="container py-5">
        <LoadingSkeleton count={2} />
      </div>
    );
  }

  const { stats } = profileData || {};

  return (
    <div className="container py-4">
      <div className="row g-4">
        {/* Left Column: Summary Card */}
        <div className="col-lg-4">
          <div className="card card-carpool border-0 shadow-sm p-4 text-center mb-4">
            <div
              className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center fw-bold fs-2 mx-auto mb-3 shadow"
              style={{ width: '84px', height: '84px' }}
            >
              {name?.charAt(0) || 'U'}
            </div>
            <h5 className="fw-bold mb-1 text-dark">{name}</h5>
            <div className="text-muted small mb-2">{user?.email}</div>
            <div className="d-flex justify-content-center flex-wrap gap-1 mb-3">
              <span className="badge bg-primary-subtle text-primary border border-primary-subtle text-capitalize">
                {user?.role}
              </span>
              <span className="badge bg-success-subtle text-success border border-success-subtle">
                <i className="bi bi-car-front-fill me-1"></i> Driver
              </span>
              <span className="badge bg-info-subtle text-info-emphasis border border-info-subtle">
                <i className="bi bi-person-walking me-1"></i> Rider
              </span>
              {user?.prn && (
                <span className="badge bg-light text-dark border">
                  PRN: {user.prn}
                </span>
              )}
            </div>

            {/* Dual Role Note */}
            <div className="alert alert-light border p-2 mb-3 text-start" style={{ fontSize: '0.78rem' }}>
              <i className="bi bi-info-circle text-primary me-1"></i>
              <strong>Dual Role Account:</strong> You have full privileges to both publish carpools as a <strong>Driver</strong> and reserve seats as a <strong>Rider</strong>.
            </div>

            {/* Rating */}
            <div className="p-3 bg-light rounded-3 mb-3">
              <div className="d-flex justify-content-center align-items-center gap-1 text-warning fs-5">
                <i className="bi bi-star-fill"></i>
                <span className="fw-bold text-dark">{user?.rating?.average || 5.0}</span>
              </div>
              <div className="text-muted small">
                Based on {user?.rating?.count || 0} peer review(s)
              </div>
            </div>

            {/* Commute Statistics */}
            <div className="row text-center g-2 pt-2 border-top">
              <div className="col-6">
                <div className="p-2 border rounded bg-white">
                  <div className="fs-5 fw-bold text-primary">{stats?.ridesOffered || 0}</div>
                  <div className="text-muted small" style={{ fontSize: '0.75rem' }}>Rides Offered</div>
                </div>
              </div>
              <div className="col-6">
                <div className="p-2 border rounded bg-white">
                  <div className="fs-5 fw-bold text-success">{stats?.bookingsTaken || 0}</div>
                  <div className="text-muted small" style={{ fontSize: '0.75rem' }}>Seats Booked</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Edit Profile & Reviews */}
        <div className="col-lg-8">
          <div className="card card-carpool border-0 shadow-sm p-4 mb-4">
            <h5 className="fw-bold text-dark mb-3">Personal &amp; Vehicle Settings</h5>
            <form onSubmit={handleSave}>
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label small">Full Name</label>
                  <input
                    type="text"
                    className="form-control"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label small">Campus Email (Locked)</label>
                  <input
                    type="email"
                    className="form-control bg-light"
                    value={user?.email || ''}
                    disabled
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label small">Academic Department</label>
                  <select
                    className="form-select"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                  >
                    <option value="School of Computer Engineering">School of Computer Engineering</option>
                    <option value="Software Engineering">Software Engineering</option>
                    <option value="Data Science Engineering">Data Science Engineering</option>
                    <option value="AIML Engineering">AIML Engineering</option>
                    <option value="Information Technology">Information Technology</option>
                    <option value="Electronics & Telecommunication">Electronics & Telecommunication</option>
                    <option value="Mechanical Engineering">Mechanical Engineering</option>
                    <option value="Civil Engineering">Civil Engineering</option>
                    <option value="Chemical Engineering">Chemical Engineering</option>
                    <option value="School of Design">School of Design</option>
                    <option value="First Year Engineering">First Year Engineering</option>
                    <option value="Administration / Staff">Administration / Staff</option>
                  </select>
                </div>

                <div className="col-md-6">
                  <label className="form-label small">Contact Mobile Number</label>
                  <input
                    type="text"
                    className="form-control"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Vehicle Info */}
              <div className="pt-4 mt-4 border-top">
                <div className="form-check form-switch mb-3">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="hasVehicleSwitch"
                    checked={hasVehicle}
                    onChange={(e) => setHasVehicle(e.target.checked)}
                  />
                  <label className="form-check-label fw-semibold" htmlFor="hasVehicleSwitch">
                    I own a vehicle and offer rides to campus
                  </label>
                </div>

                {hasVehicle && (
                  <div className="row g-3 p-3 bg-light rounded-3">
                    <div className="col-md-4">
                      <label className="form-label small">Vehicle Type</label>
                      <select
                        className="form-select"
                        value={vehicleType}
                        onChange={(e) => setVehicleType(e.target.value)}
                      >
                        <option value="car">Car (4-Wheeler)</option>
                        <option value="bike">Bike (2-Wheeler)</option>
                      </select>
                    </div>

                    <div className="col-md-4">
                      <label className="form-label small">Vehicle Model</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. Tata Nexon / Honda Activa"
                        value={vehicleModel}
                        onChange={(e) => setVehicleModel(e.target.value)}
                      />
                    </div>

                    <div className="col-md-4">
                      <label className="form-label small">Registration Plate</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. MH 12 AB 1234"
                        value={vehiclePlate}
                        onChange={(e) => setVehiclePlate(e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="d-flex justify-content-end mt-4">
                <button
                  type="submit"
                  disabled={saving}
                  className="btn btn-primary-carpool px-4 py-2"
                >
                  {saving ? 'Saving...' : 'Save Profile Changes'}
                </button>
              </div>
            </form>
          </div>

          {/* Reviews Received Feed */}
          <div className="card card-carpool border-0 shadow-sm p-4">
            <h5 className="fw-bold text-dark mb-3">Reviews &amp; Ratings Received ({reviews.length})</h5>
            {reviews.length > 0 ? (
              <div className="d-flex flex-column gap-3">
                {reviews.map((r) => (
                  <div key={r._id} className="p-3 bg-light rounded-3 border">
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <div className="fw-semibold text-dark small">{r.reviewer?.name} ({r.role})</div>
                      <div className="d-flex text-warning small">
                        {Array.from({ length: r.rating }).map((_, i) => (
                          <i key={i} className="bi bi-star-fill"></i>
                        ))}
                      </div>
                    </div>
                    {r.comment && (
                      <p className="text-secondary small mb-1">"{r.comment}"</p>
                    )}
                    {r.ride && (
                      <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                        Trip: {r.ride.origin?.locality} &rarr; {r.ride.destination?.locality}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-muted small">
                No reviews received yet. Complete carpools to build your campus reputation score!
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
