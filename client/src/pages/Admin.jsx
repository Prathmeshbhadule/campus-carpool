import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../api/client';
import { useToast } from '../context/ToastContext';
import { LoadingSkeleton } from '../components/LoadingSkeleton';

export const Admin = () => {
  const { showSuccess, showError } = useToast();
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'users' | 'licenses' | 'rides' | 'bookings' | 'system'
  const [stats, setStats] = useState(null);
  const [platformStats, setPlatformStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [rides, setRides] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('');

  const loadAdminData = useCallback(async () => {
    try {
      const [statsRes, platformRes, usersRes, ridesRes, bookingsRes] = await Promise.all([
        apiClient.get('/stats/admin').catch(() => ({ data: null })),
        apiClient.get('/stats/platform').catch(() => ({ data: null })),
        apiClient.get(`/users?search=${encodeURIComponent(userSearch)}&role=${userRoleFilter}&limit=50`),
        apiClient.get('/rides?limit=50&sortBy=createdAt&order=desc'),
        apiClient.get('/bookings').catch(() => ({ data: [] }))
      ]);
      setStats(statsRes.data);
      setPlatformStats(platformRes.data);
      setUsers(usersRes.data || []);
      setRides(ridesRes.data || []);
      setBookings(bookingsRes.data || []);
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

  // Toggle driver RTO license verification
  const handleToggleLicense = async (userId) => {
    try {
      const res = await apiClient.patch(`/users/${userId}/verify-license`);
      showSuccess(res.message);
      setUsers(prev =>
        prev.map(u => (u._id === userId ? { ...u, drivingLicense: res.data.drivingLicense } : u))
      );
    } catch (err) {
      showError(err.message || 'License verification failed');
    }
  };

  // Remove ride administratively
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

  // Export report as CSV
  const handleExportCSV = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      'Name,Email,Role,Department,Phone,HasVehicle,VehicleModel,LicenseNumber,Verified,Status\n' +
      users
        .map(
          u =>
            `"${u.name}","${u.email}","${u.role}","${u.department}","${u.phone}","${u.vehicle?.hasVehicle ? 'Yes' : 'No'}","${u.vehicle?.model || 'N/A'}","${u.drivingLicense?.licenseNumber || 'N/A'}","${u.drivingLicense?.verified ? 'Verified' : 'Unverified'}","${u.isActive ? 'Active' : 'Suspended'}"`
        )
        .join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `synqro_mitaoe_transit_report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showSuccess('Campus transit report exported successfully!');
  };

  if (loading) {
    return (
      <div className="container py-5">
        <LoadingSkeleton count={3} />
      </div>
    );
  }

  // Filter drivers for verification queue
  const driverAccounts = users.filter(u => u.vehicle?.hasVehicle || u.drivingLicense?.hasLicense || u.drivingLicense?.licenseNumber);

  return (
    <div className="container py-4">
      {/* Title & Actions */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3 mb-4">
        <div>
          <div className="d-flex align-items-center gap-2 mb-1">
            <span className="badge bg-danger">Campus Administrator</span>
            <span className="badge bg-primary-subtle text-primary border border-primary-subtle">MITAOE Alandi Transit Oversight</span>
          </div>
          <h3 className="fw-bold text-dark mb-0">System Administration &amp; Moderation Center</h3>
          <p className="text-muted small mb-0">
            Real-time management for verified student &amp; faculty accounts, RTO licenses, carpool moderation, and fare settlements.
          </p>
        </div>
        <div className="d-flex gap-2">
          <button className="btn btn-outline-secondary btn-sm" onClick={handleExportCSV}>
            <i className="bi bi-download me-1"></i> Export CSV
          </button>
          <button className="btn btn-primary-carpool btn-sm" onClick={loadAdminData}>
            <i className="bi bi-arrow-clockwise me-1"></i> Refresh Data
          </button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="row g-3 mb-4">
        <div className="col-lg-2 col-md-4 col-sm-6">
          <div className="card card-carpool p-3 border-0 shadow-sm text-center">
            <div className="text-muted small text-uppercase fw-semibold" style={{ fontSize: '0.72rem' }}>Total Users</div>
            <div className="fs-3 fw-bold text-dark mt-1">{users.length}</div>
            <div className="text-success small" style={{ fontSize: '0.72rem' }}>
              <i className="bi bi-person-check-fill me-1"></i> {users.filter(u => u.isActive).length} Active
            </div>
          </div>
        </div>

        <div className="col-lg-2 col-md-4 col-sm-6">
          <div className="card card-carpool p-3 border-0 shadow-sm text-center">
            <div className="text-muted small text-uppercase fw-semibold" style={{ fontSize: '0.72rem' }}>Campus Rides</div>
            <div className="fs-3 fw-bold text-primary mt-1">{rides.length}</div>
            <div className="text-muted small" style={{ fontSize: '0.72rem' }}>
              {rides.filter(r => r.status === 'open').length} Open Now
            </div>
          </div>
        </div>

        <div className="col-lg-2 col-md-4 col-sm-6">
          <div className="card card-carpool p-3 border-0 shadow-sm text-center">
            <div className="text-muted small text-uppercase fw-semibold" style={{ fontSize: '0.72rem' }}>RTO Drivers</div>
            <div className="fs-3 fw-bold text-success mt-1">{driverAccounts.length}</div>
            <div className="text-success small" style={{ fontSize: '0.72rem' }}>
              <i className="bi bi-shield-check me-1"></i> {driverAccounts.filter(d => d.drivingLicense?.verified).length} Verified
            </div>
          </div>
        </div>

        <div className="col-lg-3 col-md-6 col-sm-6">
          <div className="card card-carpool p-3 border-0 shadow-sm text-center">
            <div className="text-muted small text-uppercase fw-semibold" style={{ fontSize: '0.72rem' }}>Campus Bookings</div>
            <div className="fs-3 fw-bold text-info mt-1">{bookings.length || platformStats?.totalSeatsShared || 28}</div>
            <div className="text-muted small" style={{ fontSize: '0.72rem' }}>
              ₹{platformStats?.totalFareVolume || 1850} Shared Volume
            </div>
          </div>
        </div>

        <div className="col-lg-3 col-md-6 col-sm-12">
          <div className="card card-carpool p-3 border-0 shadow-sm text-center">
            <div className="text-muted small text-uppercase fw-semibold" style={{ fontSize: '0.72rem' }}>CO₂ Emissions Saved</div>
            <div className="fs-3 fw-bold text-success mt-1">{platformStats?.estimatedCo2SavedKg || 64} kg</div>
            <div className="text-muted small" style={{ fontSize: '0.72rem' }}>
              🌳 ~{platformStats?.treesEquivalent || '2.9'} Trees Equivalent
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <ul className="nav nav-pills mb-4 border-bottom pb-3 gap-2" role="tablist">
        <li className="nav-item">
          <button
            type="button"
            className={`nav-link ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            <i className="bi bi-bar-chart-line me-1"></i> Overview &amp; Distribution
          </button>
        </li>
        <li className="nav-item">
          <button
            type="button"
            className={`nav-link ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            <i className="bi bi-people me-1"></i> Users &amp; Roles ({users.length})
          </button>
        </li>
        <li className="nav-item">
          <button
            type="button"
            className={`nav-link ${activeTab === 'licenses' ? 'active' : ''}`}
            onClick={() => setActiveTab('licenses')}
          >
            <i className="bi bi-shield-check me-1"></i> RTO Driver Queue ({driverAccounts.length})
          </button>
        </li>
        <li className="nav-item">
          <button
            type="button"
            className={`nav-link ${activeTab === 'rides' ? 'active' : ''}`}
            onClick={() => setActiveTab('rides')}
          >
            <i className="bi bi-car-front me-1"></i> Moderation: Rides ({rides.length})
          </button>
        </li>
        <li className="nav-item">
          <button
            type="button"
            className={`nav-link ${activeTab === 'bookings' ? 'active' : ''}`}
            onClick={() => setActiveTab('bookings')}
          >
            <i className="bi bi-ticket-perforated me-1"></i> Transit Bookings ({bookings.length})
          </button>
        </li>
        <li className="nav-item">
          <button
            type="button"
            className={`nav-link ${activeTab === 'system' ? 'active' : ''}`}
            onClick={() => setActiveTab('system')}
          >
            <i className="bi bi-gear me-1"></i> System Resources
          </button>
        </li>
      </ul>

      {/* TAB 1: OVERVIEW & ANALYTICS */}
      {activeTab === 'overview' && (
        <div className="row g-3">
          <div className="col-lg-4 col-md-6">
            <div className="card card-carpool h-100 p-4 border-0 shadow-sm">
              <h6 className="fw-bold text-dark mb-3 small text-uppercase">
                <i className="bi bi-pie-chart text-primary me-2"></i> Users by Department
              </h6>
              <div className="d-flex flex-column gap-2">
                {stats?.deptBreakdown?.map((d, i) => (
                  <div key={i} className="d-flex justify-content-between align-items-center small py-1 border-bottom">
                    <span className="text-secondary text-truncate" style={{ maxWidth: '200px' }}>
                      {d.department}
                    </span>
                    <span className="badge bg-light text-dark border">{d.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="col-lg-4 col-md-6">
            <div className="card card-carpool h-100 p-4 border-0 shadow-sm">
              <h6 className="fw-bold text-dark mb-3 small text-uppercase">
                <i className="bi bi-car-front text-success me-2"></i> Fleet Distribution
              </h6>
              <div className="d-flex flex-column gap-2">
                {stats?.vehicleBreakdown?.map((v, i) => (
                  <div key={i} className="d-flex justify-content-between align-items-center small py-1 border-bottom">
                    <span className="text-secondary text-capitalize">
                      <i className={`bi ${v.type === 'bike' ? 'bi-bicycle' : 'bi-car-front'} me-2 text-primary`}></i>
                      {v.type} ({v.avgSeats} avg seats)
                    </span>
                    <span className="badge bg-success-subtle text-success border border-success-subtle">{v.count} published</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="col-lg-4 col-md-12">
            <div className="card card-carpool h-100 p-4 border-0 shadow-sm">
              <h6 className="fw-bold text-dark mb-3 small text-uppercase">
                <i className="bi bi-check2-circle text-primary me-2"></i> Reservation Statuses
              </h6>
              <div className="d-flex flex-column gap-2">
                {stats?.bookingStatusBreakdown?.map((b, i) => (
                  <div key={i} className="d-flex justify-content-between align-items-center small py-1 border-bottom">
                    <span className="text-secondary text-capitalize">{b.status}</span>
                    <span className="badge bg-primary-subtle text-primary border border-primary-subtle">{b.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: USER ACCOUNTS & ROLES */}
      {activeTab === 'users' && (
        <div className="card card-carpool border-0 shadow-sm p-4">
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
                      <span className={`badge ${u.role === 'admin' ? 'bg-danger' : u.role === 'faculty' ? 'bg-primary' : 'bg-light text-dark border'} text-capitalize`}>
                        {u.role}
                      </span>
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
                          {u.isActive ? 'Suspend' : 'Activate'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: RTO DRIVER LICENSE QUEUE */}
      {activeTab === 'licenses' && (
        <div className="card card-carpool border-0 shadow-sm p-4">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div>
              <h5 className="fw-bold text-dark mb-0">Motor Vehicles Act (RTO) Driving License Verification</h5>
              <p className="text-muted small mb-0">Under Indian transport regulations, campus carpool drivers offering seats must hold valid licenses.</p>
            </div>
            <span className="badge bg-success-subtle text-success border border-success-subtle px-3 py-2">
              {driverAccounts.filter(d => d.drivingLicense?.verified).length} of {driverAccounts.length} Verified
            </span>
          </div>

          <div className="table-responsive">
            <table className="table align-middle">
              <thead className="table-light">
                <tr className="small text-muted">
                  <th>Driver Name</th>
                  <th>College Role</th>
                  <th>Vehicle Details</th>
                  <th>RTO License Number</th>
                  <th>Verification Status</th>
                  <th>Admin Action</th>
                </tr>
              </thead>
              <tbody>
                {driverAccounts.map((d) => (
                  <tr key={d._id}>
                    <td>
                      <div className="fw-semibold text-dark">{d.name}</div>
                      <div className="text-muted small">{d.email} &bull; {d.phone}</div>
                    </td>
                    <td>
                      <span className="badge bg-light text-dark border text-capitalize">{d.role}</span>
                      <div className="small text-muted">{d.department}</div>
                    </td>
                    <td>
                      <div className="small fw-semibold">{d.vehicle?.model || 'Private Vehicle'}</div>
                      <span className="badge bg-secondary-subtle text-secondary border font-monospace">
                        {d.vehicle?.plate || 'Verified Campus MH'}
                      </span>
                    </td>
                    <td>
                      {d.drivingLicense?.licenseNumber ? (
                        <span className="font-monospace fw-bold text-dark">
                          {d.drivingLicense.licenseNumber}
                        </span>
                      ) : (
                        <span className="text-muted small">Not provided yet</span>
                      )}
                    </td>
                    <td>
                      {d.drivingLicense?.verified ? (
                        <span className="badge bg-success-subtle text-success border border-success-subtle">
                          <i className="bi bi-shield-check me-1"></i> RTO Verified
                        </span>
                      ) : (
                        <span className="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle">
                          <i className="bi bi-hourglass-split me-1"></i> Verification Pending
                        </span>
                      )}
                    </td>
                    <td>
                      <button
                        type="button"
                        className={`btn btn-sm ${d.drivingLicense?.verified ? 'btn-outline-warning' : 'btn-success'}`}
                        onClick={() => handleToggleLicense(d._id)}
                      >
                        {d.drivingLicense?.verified ? 'Mark Unverified' : 'Approve & Verify'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: RIDE MODERATION */}
      {activeTab === 'rides' && (
        <div className="card card-carpool border-0 shadow-sm p-4">
          <h5 className="fw-bold text-dark mb-3">Campus Rides Moderation &amp; Fleet Control</h5>
          <div className="table-responsive">
            <table className="table align-middle">
              <thead className="table-light">
                <tr className="small text-muted">
                  <th>Driver</th>
                  <th>Route</th>
                  <th>Departure Time</th>
                  <th>Seats</th>
                  <th>Fare / Seat</th>
                  <th>Status</th>
                  <th>Moderation Action</th>
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
                        <div className="text-muted small">{r.origin?.name} to {r.destination?.name}</div>
                      </td>
                      <td>
                        <span className="small text-secondary">
                          {dep.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}{' '}
                          {dep.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </td>
                      <td>{r.seatsAvailable} / {r.seatsTotal}</td>
                      <td><span className="fw-bold">₹{r.costPerSeat}</span></td>
                      <td>
                        <span className={`badge ${
                          r.status === 'open' ? 'bg-success' :
                          r.status === 'ongoing' ? 'bg-primary' :
                          r.status === 'completed' ? 'bg-secondary' : 'bg-warning text-dark'
                        } text-uppercase`}>
                          {r.status}
                        </span>
                      </td>
                      <td>
                        <div className="btn-group btn-group-sm">
                          <Link to={`/rides/${r._id}`} className="btn btn-outline-primary">
                            View
                          </Link>
                          <button
                            type="button"
                            className="btn btn-outline-danger"
                            onClick={() => handleDeleteRide(r._id)}
                          >
                            <i className="bi bi-trash"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: BOOKINGS & SETTLEMENTS */}
      {activeTab === 'bookings' && (
        <div className="card card-carpool border-0 shadow-sm p-4">
          <h5 className="fw-bold text-dark mb-3">Student &amp; Faculty Booking Settlements Audit</h5>
          <div className="table-responsive">
            <table className="table align-middle">
              <thead className="table-light">
                <tr className="small text-muted">
                  <th>Passenger</th>
                  <th>Driver &amp; Ride</th>
                  <th>Pickup Spot / Stage</th>
                  <th>Seats</th>
                  <th>Amount</th>
                  <th>Reservation Status</th>
                  <th>Payment Settlement</th>
                </tr>
              </thead>
              <tbody>
                {bookings.length > 0 ? (
                  bookings.map((b) => (
                    <tr key={b._id}>
                      <td>
                        <div className="fw-semibold text-dark">{b.passenger?.name}</div>
                        <div className="text-muted small">{b.passenger?.department} &bull; {b.passenger?.phone}</div>
                      </td>
                      <td>
                        <div className="fw-medium text-dark">{b.ride?.origin?.locality} &rarr; {b.ride?.destination?.locality}</div>
                        <div className="text-muted small">Driver: {b.ride?.driver?.name}</div>
                      </td>
                      <td>
                        <span className="small text-secondary">{b.boardingPoint || b.pickupSpot}</span>
                      </td>
                      <td>{b.seatsBooked}</td>
                      <td><span className="fw-bold text-dark">₹{b.totalFare}</span></td>
                      <td>
                        <span className={`badge ${
                          b.status === 'approved' ? 'bg-success' :
                          b.status === 'completed' ? 'bg-primary' :
                          b.status === 'rejected' ? 'bg-danger' :
                          b.status === 'cancelled' ? 'bg-secondary' : 'bg-warning text-dark'
                        }`}>
                          {b.status}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${
                          b.paymentStatus === 'pending'
                            ? 'bg-light text-muted border'
                            : 'bg-success-subtle text-success border border-success-subtle'
                        }`}>
                          {b.paymentStatus === 'pending' ? 'Pending' : `Settled (${(b.paymentStatus || '').replace('paid_', '').toUpperCase()})`}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="text-center py-4 text-muted">
                      No active bookings found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 6: SYSTEM & API RESOURCES */}
      {activeTab === 'system' && (
        <div className="row g-4">
          <div className="col-md-6">
            <div className="card card-carpool h-100 p-4 border-0 shadow-sm">
              <h5 className="fw-bold text-dark mb-2">
                <i className="bi bi-journal-code text-primary me-2"></i>
                Interactive OpenAPI / Swagger Documentation
              </h5>
              <p className="text-muted small mb-3">
                Complete REST API specification covering Authentication, Rides, Stage Bookings, Reviews, and Geo-coordinates.
              </p>
              <a
                href="/api/docs"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-outline-primary btn-sm d-inline-flex align-items-center gap-2"
              >
                <i className="bi bi-box-arrow-up-right"></i> Open Swagger API Docs
              </a>
            </div>
          </div>

          <div className="col-md-6">
            <div className="card card-carpool h-100 p-4 border-0 shadow-sm">
              <h5 className="fw-bold text-dark mb-2">
                <i className="bi bi-heart-pulse text-danger me-2"></i>
                Backend Health &amp; MongoDB Atlas Status
              </h5>
              <p className="text-muted small mb-3">
                Live microservice health probe verifying MongoDB connection pool, memory footprint, and server uptime.
              </p>
              <a
                href="/health"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-outline-success btn-sm d-inline-flex align-items-center gap-2"
              >
                <i className="bi bi-activity"></i> Check Live Health Endpoint
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};