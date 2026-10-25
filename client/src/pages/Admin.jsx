import React, { useState, useEffect, useCallback } from 'react';
import apiClient from '../api/client';
import { useToast } from '../context/ToastContext';
import { LoadingSkeleton, TableSkeleton } from '../components/LoadingSkeleton';

export const Admin = () => {
  const { showSuccess, showError } = useToast();
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('');

  const loadAdminData = useCallback(async () => {
    try {
      const [statsRes, usersRes, ridesRes] = await Promise.all([
        apiClient.get('/stats/admin'),
        apiClient.get(`/users?search=${encodeURIComponent(userSearch)}&role=${userRoleFilter}&limit=25`),
        apiClient.get('/rides?limit=25&sortBy=createdAt&order=desc')
      ]);
      setStats(statsRes.data);
      setUsers(usersRes.data || []);
      setRides(ridesRes.data || []);
    } catch (err) {
      showError(err.message || 'Failed to load administrative data');
    } finally {
      setLoading(false);
    }
  }, [userSearch, userRoleFilter, showError]);

  useEffect(() => {
    loadAdminData();
  }, [loadAdminData]);

  // Toggle user activation state
  const handleToggleUser = async (userId) => {
    try {
      const res = await apiClient.patch(`/users/${userId}/status`);
      showSuccess(res.message);
      setUsers(prev =>
        prev.map(u => (u._id === userId ? { ...u, isActive: res.data.isActive } : u))
      );
    } catch (err) {
      showError(err.message || 'Status toggle failed');
    }
  };

  // Remove ride
  const handleDeleteRide = async (rideId) => {
    if (!window.confirm('Are you sure you want to administratively delete this ride?')) return;
    try {
      await apiClient.delete(`/rides/${rideId}`);
      showSuccess('Ride administratively removed.');
      setRides(prev => prev.filter(r => r._id !== rideId));
    } catch (err) {
      showError(err.message || 'Failed to delete ride');
    }
  };

  if (loading) {
    return (
      <div className="container py-5">
        <LoadingSkeleton count={3} />
      </div>
    );
  }

  return (
    <div className="container py-4">
      {/* Title */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <span className="badge bg-danger mb-1">Administrative Operations</span>
          <h3 className="fw-bold text-dark mb-0">Campus Transit Oversight Panel</h3>
        </div>
        <button className="btn btn-outline-secondary btn-sm" onClick={loadAdminData}>
          <i className="bi bi-arrow-clockwise me-1"></i> Refresh Metrics
        </button>
      </div>

      {/* Aggregation Analytics Cards */}
      <div className="row g-3 mb-4">
        {/* Department Breakdown */}
        <div className="col-lg-4 col-md-6">
          <div className="card card-carpool h-100 p-3 border-0 shadow-sm">
            <h6 className="fw-bold text-dark mb-2 small text-uppercase">
              <i className="bi bi-pie-chart text-primary me-1"></i> Users by Department
            </h6>
            <div className="d-flex flex-column gap-2 mt-2">
              {stats?.deptBreakdown?.map((d, i) => (
                <div key={i} className="d-flex justify-content-between align-items-center small">
                  <span className="text-secondary text-truncate" style={{ maxWidth: '200px' }}>
                    {d.department}
                  </span>
                  <span className="badge bg-light text-dark border">{d.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Vehicle Mode Breakdown */}
        <div className="col-lg-4 col-md-6">
          <div className="card card-carpool h-100 p-3 border-0 shadow-sm">
            <h6 className="fw-bold text-dark mb-2 small text-uppercase">
              <i className="bi bi-car-front text-success me-1"></i> Fleet Distribution
            </h6>
            <div className="d-flex flex-column gap-2 mt-2">
              {stats?.vehicleBreakdown?.map((v, i) => (
                <div key={i} className="d-flex justify-content-between align-items-center small">
                  <span className="text-secondary text-capitalize">
                    <i className={`bi ${v.type === 'bike' ? 'bi-bicycle' : 'bi-car-front'} me-1`}></i>
                    {v.type} ({v.avgSeats} avg seats)
                  </span>
                  <span className="badge bg-success-subtle text-success border border-success-subtle">{v.count} published</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Booking Status Breakdown */}
        <div className="col-lg-4 col-md-12">
          <div className="card card-carpool h-100 p-3 border-0 shadow-sm">
            <h6 className="fw-bold text-dark mb-2 small text-uppercase">
              <i className="bi bi-check2-circle text-primary me-1"></i> Reservation Statuses
            </h6>
            <div className="d-flex flex-column gap-2 mt-2">
              {stats?.bookingStatusBreakdown?.map((b, i) => (
                <div key={i} className="d-flex justify-content-between align-items-center small">
                  <span className="text-secondary text-capitalize">{b.status}</span>
                  <span className="badge bg-primary-subtle text-primary border border-primary-subtle">{b.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* User Management Section */}
      <div className="card card-carpool border-0 shadow-sm p-4 mb-4">
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3 mb-3">
          <h5 className="fw-bold text-dark mb-0">Registered Campus Accounts</h5>
          <div className="d-flex gap-2">
            <input
              type="text"
              className="form-control form-control-sm"
              placeholder="Search by name, PRN, email..."
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              style={{ width: '220px' }}
            />
            <select
              className="form-select form-select-sm"
              value={userRoleFilter}
              onChange={(e) => setUserRoleFilter(e.target.value)}
              style={{ width: '130px' }}
            >
              <option value="">All Roles</option>
              <option value="student">Student</option>
              <option value="faculty">Faculty</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        </div>

        <div className="table-responsive">
          <table className="table align-middle">
            <thead className="table-light">
              <tr className="small text-muted">
                <th>Name / Email</th>
                <th>Role &amp; PRN</th>
                <th>Department</th>
                <th>Phone</th>
                <th>Account Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u._id}>
                  <td>
                    <div className="fw-semibold text-dark">{u.name}</div>
                    <div className="text-muted small">{u.email}</div>
                  </td>
                  <td>
                    <span className="badge bg-light text-dark border text-capitalize">{u.role}</span>
                    {u.prn && <div className="text-muted small">PRN: {u.prn}</div>}
                  </td>
                  <td><span className="small text-secondary">{u.department}</span></td>
                  <td><span className="small text-dark">{u.phone}</span></td>
                  <td>
                    <span className={`badge ${u.isActive ? 'bg-success' : 'bg-danger'}`}>
                      {u.isActive ? 'Active' : 'Suspended'}
                    </span>
                  </td>
                  <td>
                    {u.role !== 'admin' && (
                      <button
                        type="button"
                        className={`btn btn-sm ${u.isActive ? 'btn-outline-danger' : 'btn-outline-success'}`}
                        onClick={() => handleToggleUser(u._id)}
                      >
                        {u.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Ride Management Section */}
      <div className="card card-carpool border-0 shadow-sm p-4">
        <h5 className="fw-bold text-dark mb-3">Recent Campus Rides &amp; Moderation</h5>
        <div className="table-responsive">
          <table className="table align-middle">
            <thead className="table-light">
              <tr className="small text-muted">
                <th>Driver</th>
                <th>Route</th>
                <th>Departure</th>
                <th>Seats</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {rides.map((r) => {
                const dep = new Date(r.departureTime);
                return (
                  <tr key={r._id}>
                    <td>
                      <div className="fw-semibold text-dark">{r.driver?.name}</div>
                      <div className="text-muted small">{r.driver?.email}</div>
                    </td>
                    <td>
                      <div className="fw-medium text-dark">{r.origin?.locality} &rarr; {r.destination?.locality}</div>
                      <div className="text-muted small">{r.vehicle?.model || r.vehicle?.type}</div>
                    </td>
                    <td>
                      <span className="small text-secondary">
                        {dep.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}{' '}
                        {dep.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </td>
                    <td>{r.seatsAvailable} / {r.seatsTotal}</td>
                    <td>
                      <span className="badge bg-secondary text-uppercase">{r.status}</span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-outline-danger btn-sm"
                        onClick={() => handleDeleteRide(r._id)}
                      >
                        <i className="bi bi-trash"></i> Remove
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
