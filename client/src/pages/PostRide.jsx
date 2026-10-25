import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { MapView } from '../components/MapView';

const POPULAR_CORRIDORS = [
  {
    name: 'Wakad & PCMC Corridor',
    originLocality: 'Wakad',
    originName: 'Bhumkar Chowk / Wakad Bridge',
    viaRoute: 'Dange Chowk, Bhosari MIDC',
    costPerSeat: 60
  },
  {
    name: 'Hinjawadi IT Park Corridor',
    originLocality: 'Hinjawadi Phase 1',
    originName: 'Shivaji Chowk / Phase 1 Circle',
    viaRoute: 'Wakad, Dange Chowk, Moshi Toll Plaza',
    costPerSeat: 75
  },
  {
    name: 'Viman Nagar / Airport Corridor',
    originLocality: 'Viman Nagar',
    originName: 'Phoenix Marketcity Main Gate',
    viaRoute: 'Dhanori, Lohegaon, Dighi Magazine Corner',
    costPerSeat: 50
  },
  {
    name: 'Kothrud / Deccan Corridor',
    originLocality: 'Kothrud',
    originName: 'Chandani Chowk / MIT Kothrud',
    viaRoute: 'Shivajinagar, Vishrantwadi, Dighi',
    costPerSeat: 70
  },
  {
    name: 'Nigdi & Akurdi Corridor',
    originLocality: 'Nigdi',
    originName: 'Bhakti Shakti Chowk / Nigdi Pradhikaran',
    viaRoute: 'Akurdi Station, Chinchwad, Bhosari',
    costPerSeat: 50
  }
];

export const PostRide = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showSuccess, showError, showInfo } = useToast();

  const [localities, setLocalities] = useState([]);
  const [loadingLocalities, setLoadingLocalities] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Live GPS state
  const [isDetectingGps, setIsDetectingGps] = useState(false);
  const [gpsCoords, setGpsCoords] = useState(null);
  const [gpsAccuracy, setGpsAccuracy] = useState(null);

  // Form State
  const [form, setForm] = useState({
    originName: '',
    originLocality: 'Wakad',
    destName: 'MITAOE Main Gate, Alandi',
    destLocality: 'Alandi',
    viaRoute: 'Dange Chowk, Bhosari',
    departureDate: '',
    departureTime: '',
    seatsTotal: user?.vehicle?.type === 'bike' ? 1 : 3,
    costPerSeat: 60,
    vehicleType: user?.vehicle?.type === 'bike' ? 'bike' : 'car',
    vehicleModel: user?.vehicle?.model || '',
    vehiclePlate: user?.vehicle?.plate || '',
    notes: 'Leaving on time. Please arrive 5 minutes early at pickup spot.'
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    const fetchLocalities = async () => {
      try {
        const res = await apiClient.get('/locations/pune');
        const locs = res.data || [];
        setLocalities(locs);
      } catch (e) {
        console.warn('Could not load localities', e);
      } finally {
        setLoadingLocalities(false);
      }
    };
    fetchLocalities();

    // Default departure time to tomorrow 8:30 AM
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];
    setForm(prev => ({
      ...prev,
      departureDate: dateStr,
      departureTime: '08:30'
    }));
  }, []);

  // Distance helper
  const calcGeoDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return parseFloat((R * c).toFixed(1));
  };

  // Hardware GPS Location Auto-Detection
  const handleDetectGps = () => {
    if (!navigator.geolocation) {
      showError('GPS Geolocation is not supported by your browser.');
      return;
    }

    setIsDetectingGps(true);
    showInfo('Requesting live GPS coordinates from device...');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsDetectingGps(false);
        const { latitude, longitude, accuracy } = pos.coords;
        setGpsCoords([latitude, longitude]);
        setGpsAccuracy(Math.round(accuracy));

        // Find closest Pune locality
        if (localities.length > 0) {
          let closest = localities[0];
          let minDistance = Infinity;

          localities.forEach((loc) => {
            if (loc.coordinates && loc.coordinates.length === 2) {
              const d = calcGeoDistance(latitude, longitude, loc.coordinates[0], loc.coordinates[1]);
              if (d < minDistance) {
                minDistance = d;
                closest = loc;
              }
            }
          });

          setForm((prev) => ({
            ...prev,
            originLocality: closest.locality,
            originName: prev.originName.trim()
              ? prev.originName
              : `Current Location (${closest.locality} area)`
          }));

          const suggestedFare = Math.max(30, Math.round(closest.distanceKm * 2.5));
          setForm((prev) => ({ ...prev, costPerSeat: suggestedFare }));

          showSuccess(
            `GPS detected near ${closest.locality} (±${Math.round(accuracy)}m). Pickup locality auto-set!`
          );
        } else {
          setForm((prev) => ({
            ...prev,
            originName: prev.originName.trim() ? prev.originName : `Current GPS Location (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`
          }));
          showSuccess(`GPS coordinates detected: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
        }
      },
      (err) => {
        setIsDetectingGps(false);
        console.warn('Geolocation error:', err.message);
        showError(`Could not detect GPS location: ${err.message}. You can manually pick your locality.`);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 5000 }
    );
  };

  // Quick corridor shortcut selector
  const handleSelectCorridor = (corridor) => {
    setForm((prev) => ({
      ...prev,
      originLocality: corridor.originLocality,
      originName: corridor.originName,
      viaRoute: corridor.viaRoute,
      costPerSeat: corridor.costPerSeat
    }));
    setGpsCoords(null);
    setGpsAccuracy(null);
    showInfo(`Loaded ${corridor.name} preset!`);
  };

  // Derive coordinates for map preview
  const selectedOriginLoc = localities.find((l) => l.locality === form.originLocality);
  const selectedDestLoc = localities.find((l) => l.locality === form.destLocality);

  const mapOriginCoords = gpsCoords || selectedOriginLoc?.coordinates || [18.5987, 73.7629];
  const mapDestCoords = selectedDestLoc?.coordinates || [18.6756, 73.8906];

  const mapOriginObj = useMemo(
    () => ({
      name: form.originName || `${form.originLocality} Center`,
      locality: form.originLocality,
      coordinates: mapOriginCoords
    }),
    [form.originName, form.originLocality, mapOriginCoords]
  );

  const mapDestObj = useMemo(
    () => ({
      name: form.destName || `${form.destLocality} Campus`,
      locality: form.destLocality,
      coordinates: mapDestCoords
    }),
    [form.destName, form.destLocality, mapDestCoords]
  );

  const viaArray = useMemo(
    () =>
      form.viaRoute
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    [form.viaRoute]
  );

  const estimatedCorridorDistance = selectedOriginLoc?.distanceKm || 20;

  const validateField = (name, value) => {
    let error = '';
    if (name === 'originName' && !value.trim()) {
      error = 'Origin pickup landmark is required';
    }
    if (name === 'destName' && !value.trim()) {
      error = 'Destination landmark is required';
    }
    if (name === 'departureDate' && !value) {
      error = 'Travel date is required';
    }
    if (name === 'departureTime' && !value) {
      error = 'Departure time is required';
    }
    if (name === 'seatsTotal') {
      const seats = Number(value);
      if (!seats || seats < 1 || seats > 6) {
        error = 'Seats must be between 1 and 6';
      }
    }
    if (name === 'costPerSeat') {
      const cost = Number(value);
      if (isNaN(cost) || cost < 0 || cost > 500) {
        error = 'Cost per seat must be between ₹0 and ₹500';
      }
    }
    return error;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));

    const err = validateField(name, value);
    setErrors((prev) => ({ ...prev, [name]: err }));
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    const err = validateField(name, value);
    setErrors((prev) => ({ ...prev, [name]: err }));
  };

  const validateAll = () => {
    const newErrors = {};
    Object.keys(form).forEach((key) => {
      const err = validateField(key, form[key]);
      if (err) newErrors[key] = err;
    });

    if (form.departureDate && form.departureTime) {
      const departureDateTime = new Date(`${form.departureDate}T${form.departureTime}`);
      if (departureDateTime < new Date()) {
        newErrors.departureTime = 'Departure time must be set in the future';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateAll()) {
      showError('Please check the highlighted fields before submitting.');
      return;
    }

    setSubmitting(true);
    try {
      const departureDateTime = new Date(`${form.departureDate}T${form.departureTime}`).toISOString();

      const payload = {
        origin: {
          name: form.originName.trim() || `${form.originLocality} Center`,
          locality: form.originLocality,
          coordinates: mapOriginCoords
        },
        destination: {
          name: form.destName.trim() || `${form.destLocality} Campus`,
          locality: form.destLocality,
          coordinates: mapDestCoords
        },
        viaRoute: viaArray,
        departureTime: departureDateTime,
        seatsTotal: Number(form.seatsTotal),
        costPerSeat: Number(form.costPerSeat),
        vehicle: {
          type: form.vehicleType,
          model: form.vehicleModel || (form.vehicleType === 'bike' ? 'Motorcycle' : 'Private Car'),
          plate: form.vehiclePlate || 'Verified'
        },
        notes: form.notes
      };

      const res = await apiClient.post('/rides', payload);
      const createdRide = res?.data || res;
      const createdId = createdRide?._id || createdRide?.ride?._id;

      showSuccess('Your campus ride has been published successfully!');

      if (createdId) {
        navigate(`/rides/${createdId}`);
      } else {
        navigate('/search');
      }
    } catch (err) {
      console.error('[PostRide] Publish error:', err);
      showError(err.message || 'Failed to publish ride.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container py-4">
      {/* Header Banner */}
      <div className="mb-4">
        <span className="badge bg-primary-subtle text-primary border border-primary-subtle mb-2">
          Driver Portal &bull; Live Route &amp; GPS
        </span>
        <h2 className="fw-bold text-dark mb-1">Publish a Campus Commute</h2>
        <p className="text-muted small mb-0">
          Share your daily vehicle journey with fellow MITAOE students and faculty. Interactive Google Map and live GPS auto-detect your corridor.
        </p>
      </div>

      {/* Popular Corridor Quick-Select Chips */}
      <div className="mb-4 p-3 bg-white rounded-3 border shadow-sm">
        <div className="d-flex align-items-center justify-content-between mb-2">
          <span className="small fw-bold text-dark">
            <i className="bi bi-lightning-charge-fill text-warning me-1"></i> Popular MITAOE Corridors (1-Click Preset):
          </span>
          <span className="text-muted small" style={{ fontSize: '0.75rem' }}>Auto-fills route &amp; stops</span>
        </div>
        <div className="d-flex flex-wrap gap-2">
          {POPULAR_CORRIDORS.map((corridor, idx) => (
            <button
              key={idx}
              type="button"
              className={`btn btn-sm ${form.originLocality === corridor.originLocality ? 'btn-primary' : 'btn-outline-secondary'}`}
              onClick={() => handleSelectCorridor(corridor)}
            >
              <i className="bi bi-pin-map me-1"></i> {corridor.name}
            </button>
          ))}
        </div>
      </div>

      <div className="row g-4">
        {/* Left Column: Ride Publishing Form */}
        <div className="col-lg-7">
          <div className="card card-carpool border-0 shadow-sm p-4">
            <form onSubmit={handleSubmit} noValidate>
              {/* Route Section */}
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="fw-bold text-dark mb-0">1. Route &amp; Pickup Spot</h5>
                {/* Live Hardware GPS Detector Button */}
                <button
                  type="button"
                  className="btn btn-sm btn-outline-success d-flex align-items-center gap-1 shadow-sm"
                  onClick={handleDetectGps}
                  disabled={isDetectingGps}
                  title="Detect your current physical location using device GPS"
                >
                  {isDetectingGps ? (
                    <>
                      <span className="spinner-border spinner-border-sm" role="status"></span>
                      Detecting GPS...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-crosshair fs-6"></i>
                      <span>Use My Current GPS</span>
                    </>
                  )}
                </button>
              </div>

              {gpsCoords && (
                <div className="alert alert-success d-flex align-items-center justify-content-between py-2 px-3 mb-3 small">
                  <div>
                    <i className="bi bi-check-circle-fill me-2"></i>
                    <strong>GPS Active:</strong> [{gpsCoords[0].toFixed(4)}, {gpsCoords[1].toFixed(4)}]
                    {gpsAccuracy && ` (Accuracy: ±${gpsAccuracy}m)`}
                  </div>
                  <button
                    type="button"
                    className="btn btn-link btn-sm text-success p-0 text-decoration-none"
                    onClick={() => {
                      setGpsCoords(null);
                      setGpsAccuracy(null);
                    }}
                  >
                    Clear GPS
                  </button>
                </div>
              )}

              <div className="row g-3 mb-4">
                {/* Origin Locality */}
                <div className="col-md-6">
                  <label className="form-label small fw-semibold">
                    Origin Locality <span className="text-danger">*</span>
                  </label>
                  <select
                    className="form-select"
                    name="originLocality"
                    value={form.originLocality}
                    onChange={handleChange}
                  >
                    {localities.map((loc) => (
                      <option key={loc.locality} value={loc.locality}>
                        {loc.locality} ({loc.distanceKm} km to MITAOE)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Origin Specific Landmark */}
                <div className="col-md-6">
                  <label className="form-label small fw-semibold">
                    Pickup Landmark / Spot <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    className={`form-control ${errors.originName ? 'is-invalid' : ''}`}
                    placeholder="e.g. Bhumkar Chowk / Phoenix Mall gate"
                    name="originName"
                    value={form.originName}
                    onChange={handleChange}
                    onBlur={handleBlur}
                  />
                  {errors.originName && <div className="form-feedback-error">{errors.originName}</div>}
                </div>

                {/* Destination Locality */}
                <div className="col-md-6">
                  <label className="form-label small fw-semibold">
                    Destination Locality <span className="text-danger">*</span>
                  </label>
                  <select
                    className="form-select"
                    name="destLocality"
                    value={form.destLocality}
                    onChange={handleChange}
                  >
                    {localities.map((loc) => (
                      <option key={loc.locality} value={loc.locality}>
                        {loc.locality}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Destination Landmark */}
                <div className="col-md-6">
                  <label className="form-label small fw-semibold">
                    Drop Landmark <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    className={`form-control ${errors.destName ? 'is-invalid' : ''}`}
                    placeholder="e.g. MITAOE Main Entrance Gate"
                    name="destName"
                    value={form.destName}
                    onChange={handleChange}
                    onBlur={handleBlur}
                  />
                  {errors.destName && <div className="form-feedback-error">{errors.destName}</div>}
                </div>

                {/* Intermediate stops */}
                <div className="col-12">
                  <label className="form-label small fw-semibold">
                    Intermediate Boarding Stops (Comma separated)
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Dange Chowk, Bhosari MIDC, Magazine Chowk"
                    name="viaRoute"
                    value={form.viaRoute}
                    onChange={handleChange}
                  />
                  <div className="form-text text-muted" style={{ fontSize: '0.75rem' }}>
                    Passengers along stops C, D, E will see stage fare calculations and can book seats along your route.
                  </div>
                </div>
              </div>

              {/* Schedule & Seats */}
              <h5 className="fw-bold text-dark mb-3">2. Schedule &amp; Seat Availability</h5>
              <div className="row g-3 mb-4">
                <div className="col-md-6">
                  <label className="form-label small fw-semibold">
                    Travel Date <span className="text-danger">*</span>
                  </label>
                  <input
                    type="date"
                    className={`form-control ${errors.departureDate ? 'is-invalid' : ''}`}
                    name="departureDate"
                    value={form.departureDate}
                    onChange={handleChange}
                    onBlur={handleBlur}
                  />
                  {errors.departureDate && <div className="form-feedback-error">{errors.departureDate}</div>}
                </div>

                <div className="col-md-6">
                  <label className="form-label small fw-semibold">
                    Departure Time <span className="text-danger">*</span>
                  </label>
                  <input
                    type="time"
                    className={`form-control ${errors.departureTime ? 'is-invalid' : ''}`}
                    name="departureTime"
                    value={form.departureTime}
                    onChange={handleChange}
                    onBlur={handleBlur}
                  />
                  {errors.departureTime && <div className="form-feedback-error">{errors.departureTime}</div>}
                </div>

                <div className="col-md-4">
                  <label className="form-label small fw-semibold">Vehicle Mode</label>
                  <select
                    className="form-select"
                    name="vehicleType"
                    value={form.vehicleType}
                    onChange={(e) => {
                      handleChange(e);
                      if (e.target.value === 'bike') {
                        setForm((prev) => ({ ...prev, seatsTotal: 1, costPerSeat: Math.min(prev.costPerSeat, 30) }));
                      }
                    }}
                  >
                    <option value="car">Car (Up to 6 seats)</option>
                    <option value="bike">Bike (1 Pillion seat)</option>
                  </select>
                </div>

                <div className="col-md-4">
                  <label className="form-label small fw-semibold">
                    Seats Offered <span className="text-danger">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={form.vehicleType === 'bike' ? 1 : 6}
                    className={`form-control ${errors.seatsTotal ? 'is-invalid' : ''}`}
                    name="seatsTotal"
                    value={form.seatsTotal}
                    onChange={handleChange}
                    onBlur={handleBlur}
                  />
                  {errors.seatsTotal && <div className="form-feedback-error">{errors.seatsTotal}</div>}
                </div>

                <div className="col-md-4">
                  <label className="form-label small fw-semibold">
                    Cost per Seat (₹) <span className="text-danger">*</span>
                  </label>
                  <div className="input-group">
                    <span className="input-group-text">₹</span>
                    <input
                      type="number"
                      min="0"
                      max="500"
                      className={`form-control ${errors.costPerSeat ? 'is-invalid' : ''}`}
                      name="costPerSeat"
                      value={form.costPerSeat}
                      onChange={handleChange}
                      onBlur={handleBlur}
                    />
                  </div>
                  {errors.costPerSeat && <div className="form-feedback-error">{errors.costPerSeat}</div>}
                </div>
              </div>

              {/* Vehicle & Notes */}
              <h5 className="fw-bold text-dark mb-3">3. Vehicle &amp; Rider Instructions</h5>
              <div className="row g-3 mb-4">
                <div className="col-md-6">
                  <label className="form-label small fw-semibold">Vehicle Make &amp; Model</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Hyundai i20 / Swift / Classic 350"
                    name="vehicleModel"
                    value={form.vehicleModel}
                    onChange={handleChange}
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label small fw-semibold">Registration Number</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. MH 12 DE 3412"
                    name="vehiclePlate"
                    value={form.vehiclePlate}
                    onChange={handleChange}
                  />
                </div>

                <div className="col-12">
                  <label className="form-label small fw-semibold">Special Instructions for Co-Riders</label>
                  <textarea
                    className="form-control"
                    rows="2"
                    placeholder="e.g. AC carpool, please be on time at the pickup spot, helmet required for bike."
                    name="notes"
                    value={form.notes}
                    onChange={handleChange}
                  ></textarea>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="d-flex justify-content-end gap-3 pt-3 border-top">
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => navigate('/search')}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn btn-primary-carpool px-4 py-2 d-flex align-items-center gap-2"
                >
                  {submitting ? (
                    <>
                      <span className="spinner-border spinner-border-sm" role="status"></span>
                      Publishing Commute...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-check-circle-fill"></i> Publish Campus Ride
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Column: Google Maps & Live Corridor Preview */}
        <div className="col-lg-5">
          <div className="card card-carpool border-0 shadow-sm p-4 sticky-top" style={{ top: '80px' }}>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <div>
                <h5 className="fw-bold text-dark mb-0">
                  <i className="bi bi-map-fill text-primary me-2"></i> Route Map &amp; GPS
                </h5>
                <span className="text-muted small" style={{ fontSize: '0.78rem' }}>
                  Interactive Google Maps preview
                </span>
              </div>
              <span className="badge bg-primary-subtle text-primary border border-primary-subtle">
                {estimatedCorridorDistance} km Corridor
              </span>
            </div>

            {/* Embedded Interactive Map */}
            <MapView
              origin={mapOriginObj}
              destination={mapDestObj}
              viaRoute={viaArray}
              height="360px"
              showTrackerControls={true}
              vehicleType={form.vehicleType}
            />

            {/* Corridor Metrics Summary */}
            <div className="mt-3 p-3 bg-light rounded-3 border">
              <div className="row text-center g-2">
                <div className="col-4 border-end">
                  <div className="small text-muted" style={{ fontSize: '0.7rem' }}>Distance</div>
                  <div className="fw-bold text-dark">{estimatedCorridorDistance} km</div>
                </div>
                <div className="col-4 border-end">
                  <div className="small text-muted" style={{ fontSize: '0.7rem' }}>Est. Time</div>
                  <div className="fw-bold text-primary">~{Math.round(estimatedCorridorDistance * 1.8)} mins</div>
                </div>
                <div className="col-4">
                  <div className="small text-muted" style={{ fontSize: '0.7rem' }}>Fair Share</div>
                  <div className="fw-bold text-success">₹{form.costPerSeat}/seat</div>
                </div>
              </div>
            </div>

            {/* GPS & Navigation Helpers */}
            <div className="mt-3 small text-muted">
              <div className="d-flex align-items-start gap-2 mb-2">
                <i className="bi bi-geo-alt text-success mt-1"></i>
                <div>
                  <strong>Pickup:</strong> {mapOriginObj.name} ({form.originLocality})
                </div>
              </div>
              {viaArray.length > 0 && (
                <div className="d-flex align-items-start gap-2 mb-2">
                  <i className="bi bi-signpost-split text-warning mt-1"></i>
                  <div>
                    <strong>Via Stops:</strong> {viaArray.join(' &bull; ')}
                  </div>
                </div>
              )}
              <div className="d-flex align-items-start gap-2">
                <i className="bi bi-mortarboard text-primary mt-1"></i>
                <div>
                  <strong>Destination:</strong> {mapDestObj.name} (Alandi Campus)
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
