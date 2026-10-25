import React, { useState, useMemo, useEffect } from 'react';
import QRCode from 'qrcode';

// Preset commuter corridors connecting Pune/PCMC localities to MITAOE Alandi
const PRESET_CORRIDORS = [
  {
    id: 'corridor-pcmc',
    name: 'Corridor 1: Hinjawadi Ph 3 ➔ MITAOE Alandi (via Wakad, Dange Chowk, Bhosari)',
    fullFare: 90,
    vehicle: 'car',
    stops: [
      { id: 's-1', name: 'Hinjawadi Phase 3 (Source A)', km: 0, isOrigin: true },
      { id: 's-2', name: 'Wakad Bridge (Stop C)', km: 12 },
      { id: 's-3', name: 'Dange Chowk / Kalewadi (Stop D)', km: 18 },
      { id: 's-4', name: 'Bhosari MIDC / PMT (Stop E)', km: 26 },
      { id: 's-5', name: 'MITAOE Campus, Alandi (Destination B)', km: 35, isDest: true }
    ]
  },
  {
    id: 'corridor-kothrud',
    name: 'Corridor 2: Kothrud ➔ MITAOE Alandi (via Deccan, Shivajinagar, Vishrantwadi)',
    fullFare: 75,
    vehicle: 'car',
    stops: [
      { id: 's-1', name: 'Kothrud / Chandani Chowk (Source A)', km: 0, isOrigin: true },
      { id: 's-2', name: 'Deccan Gymkhana (Stop C)', km: 6 },
      { id: 's-3', name: 'Shivajinagar Station (Stop D)', km: 9 },
      { id: 's-4', name: 'Vishrantwadi Chowk (Stop E)', km: 16 },
      { id: 's-5', name: 'MITAOE Campus, Alandi (Destination B)', km: 26, isDest: true }
    ]
  },
  {
    id: 'corridor-katraj',
    name: 'Corridor 3: Katraj ➔ MITAOE Alandi (via Swargate, Pune Station, Yerawada)',
    fullFare: 80,
    vehicle: 'car',
    stops: [
      { id: 's-1', name: 'Katraj Wonder City (Source A)', km: 0, isOrigin: true },
      { id: 's-2', name: 'Swargate Bus Station (Stop C)', km: 7 },
      { id: 's-3', name: 'Pune Railway Station (Stop D)', km: 12 },
      { id: 's-4', name: 'Yerawada / Gunjan (Stop E)', km: 16 },
      { id: 's-5', name: 'MITAOE Campus, Alandi (Destination B)', km: 28, isDest: true }
    ]
  }
];

export const MultiStopRouteFareCalculator = () => {
  const [selectedCorridorId, setSelectedCorridorId] = useState(PRESET_CORRIDORS[0].id);
  const [stops, setStops] = useState(PRESET_CORRIDORS[0].stops);
  const [fullRideFare, setFullRideFare] = useState(PRESET_CORRIDORS[0].fullFare);
  const [boardStopId, setBoardStopId] = useState(PRESET_CORRIDORS[0].stops[1].id); // Default Stop C (Wakad)
  const [dropStopId, setDropStopId] = useState(PRESET_CORRIDORS[0].stops[4].id);  // Default Destination B (MITAOE)
  const [seatsBooked, setSeatsBooked] = useState(1);
  const [useCustomFare, setUseCustomFare] = useState(false);
  const [customFareInput, setCustomFareInput] = useState('');
  const [validationError, setValidationError] = useState('');

  // New waypoint form state
  const [newStopName, setNewStopName] = useState('');
  const [newStopKm, setNewStopKm] = useState('');
  const [showAddStopForm, setShowAddStopForm] = useState(false);

  // UPI & Payment Simulator state
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [simulatedReceipt, setSimulatedReceipt] = useState(null);
  const [showJsonInspector, setShowJsonInspector] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);

  // Handle corridor preset switch
  const handleCorridorChange = (corridorId) => {
    setSelectedCorridorId(corridorId);
    const corridor = PRESET_CORRIDORS.find((c) => c.id === corridorId);
    if (corridor) {
      setStops(corridor.stops);
      setFullRideFare(corridor.fullFare);
      setBoardStopId(corridor.stops[1]?.id || corridor.stops[0].id);
      setDropStopId(corridor.stops[corridor.stops.length - 1].id);
      setUseCustomFare(false);
      setCustomFareInput('');
      setSimulatedReceipt(null);
      setValidationError('');
    }
  };

  // Indices and objects for selected boarding and drop-off
  const boardIndex = useMemo(() => stops.findIndex((s) => s.id === boardStopId), [stops, boardStopId]);
  const dropIndex = useMemo(() => stops.findIndex((s) => s.id === dropStopId), [stops, dropStopId]);
  const boardStop = stops[boardIndex] || stops[0];
  const dropStop = stops[dropIndex] || stops[stops.length - 1];

  // Mathematical stage metrics calculated dynamically
  const metrics = useMemo(() => {
    const totalRouteKm = Math.max(1, (stops[stops.length - 1]?.km || 30) - (stops[0]?.km || 0));
    
    // Check if boarding is before drop
    if (boardIndex >= dropIndex) {
      return {
        isValid: false,
        error: 'Boarding stop must occur before the drop-off location on the route.',
        totalRouteKm,
        passengerKm: 0,
        ratio: 0,
        autoStageFare: 0,
        effectivePerSeatFare: 0,
        totalFare: 0,
        soloCabFare: 0,
        savingsPerSeat: 0,
        co2SavedKg: 0
      };
    }

    const passengerKm = Math.max(1, (dropStop?.km || 0) - (boardStop?.km || 0));
    const ratio = Math.min(1.0, passengerKm / totalRouteKm);
    
    // Proportional stage fare: base minimum ₹15, rounded to nearest ₹1
    const autoStageFare = Math.max(15, Math.round(fullRideFare * ratio));

    // Determine final effective fare per seat (auto or user-negotiated)
    let effectivePerSeatFare = autoStageFare;
    if (useCustomFare && customFareInput !== '') {
      const parsed = parseFloat(customFareInput);
      if (!isNaN(parsed) && parsed >= 0) {
        effectivePerSeatFare = Math.round(parsed);
      }
    }

    const totalFare = effectivePerSeatFare * seatsBooked;

    // Benchmark comparison: Private solo cab fare in Pune (₹45 base + ₹20/km)
    const soloCabFare = Math.round(45 + passengerKm * 20);
    const savingsPerSeat = Math.max(0, soloCabFare - effectivePerSeatFare);
    const totalSavings = savingsPerSeat * seatsBooked;

    // Environmental calculation: 0.142 kg CO2 per vehicle km saved
    const co2SavedKg = parseFloat((passengerKm * 0.142 * seatsBooked).toFixed(2));
    const treesEquiv = parseFloat((co2SavedKg / 21.77).toFixed(2));

    return {
      isValid: true,
      error: null,
      totalRouteKm,
      passengerKm,
      ratio: parseFloat((ratio * 100).toFixed(1)),
      autoStageFare,
      effectivePerSeatFare,
      totalFare,
      soloCabFare,
      savingsPerSeat,
      totalSavings,
      co2SavedKg,
      treesEquiv,
      savingsPercent: soloCabFare > 0 ? Math.round((savingsPerSeat / soloCabFare) * 100) : 0
    };
  }, [stops, boardIndex, dropIndex, boardStop, dropStop, fullRideFare, useCustomFare, customFareInput, seatsBooked]);

  // Construct NPCI UPI Intent & QR Code
  const payeePhone = '9890123456';
  const rawUpiId = `${payeePhone}@upi`;
  const upiAmount = metrics.isValid ? metrics.totalFare.toFixed(2) : '10.00';
  const stageNote = `MITAOE Carpool - ${boardStop?.name || 'Stage'} to ${dropStop?.name || 'Campus'}`;
  const upiUri = `upi://pay?pa=${rawUpiId}&pn=MITAOE%20Carpool%20Driver&am=${upiAmount}&cu=INR&tn=${encodeURIComponent(stageNote)}`;

  useEffect(() => {
    let isMounted = true;
    QRCode.toDataURL(upiUri, {
      width: 180,
      margin: 1,
      color: { dark: '#0f172a', light: '#ffffff' }
    })
      .then((url) => {
        if (isMounted) setQrCodeUrl(url);
      })
      .catch((err) => console.error('Failed to generate stage QR code:', err));

    return () => {
      isMounted = false;
    };
  }, [upiUri]);

  // Add custom waypoint handler (Array manipulation)
  const handleAddStop = (e) => {
    e.preventDefault();
    if (!newStopName.trim()) {
      setValidationError('Please enter a valid waypoint name/landmark');
      return;
    }
    const kmVal = parseFloat(newStopKm);
    if (isNaN(kmVal) || kmVal <= 0) {
      setValidationError('Please enter a valid distance in kilometers from origin');
      return;
    }

    const newStop = {
      id: `custom-stop-${Date.now()}`,
      name: newStopName.trim(),
      km: kmVal
    };

    // Insert and sort stops array by km
    const updated = [...stops, newStop].sort((a, b) => a.km - b.km);
    setStops(updated);
    setNewStopName('');
    setNewStopKm('');
    setShowAddStopForm(false);
    setValidationError('');
  };

  // Remove waypoint handler (Array filtering)
  const handleRemoveStop = (stopId) => {
    if (stops.length <= 2) {
      setValidationError('A route must have at least an origin and a destination.');
      return;
    }
    const updated = stops.filter((s) => s.id !== stopId);
    setStops(updated);
    // If removed stop was selected, reset selection
    if (boardStopId === stopId) setBoardStopId(updated[0].id);
    if (dropStopId === stopId) setDropStopId(updated[updated.length - 1].id);
  };

  // Simulate instant payment authorization
  const handleSimulatePayment = () => {
    const txnRef = 'UPI-' + Math.floor(100000000 + Math.random() * 900000000);
    const utr = '4291' + Math.floor(10000000 + Math.random() * 90000000);
    setSimulatedReceipt({
      txnRef,
      utr,
      amount: metrics.totalFare,
      passengerStop: boardStop.name,
      dropStop: dropStop.name,
      seats: seatsBooked,
      ratePerSeat: metrics.effectivePerSeatFare,
      timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    });
  };

  // JSON summary payload for inspection
  const jsonSummary = useMemo(() => {
    return {
      routeId: selectedCorridorId,
      totalRouteKm: metrics.totalRouteKm,
      driverFullFarePerSeat: fullRideFare,
      passengerStage: {
        boarding: { id: boardStop?.id, name: boardStop?.name, kmFromOrigin: boardStop?.km },
        dropOff: { id: dropStop?.id, name: dropStop?.name, kmFromOrigin: dropStop?.km },
        stageDistanceKm: metrics.passengerKm,
        stageDistanceRatio: `${metrics.ratio}%`,
        seatsBooked,
        fareMode: useCustomFare ? 'negotiated_custom' : 'proportional_distance_split',
        calculatedFarePerSeat: metrics.autoStageFare,
        finalAgreedFarePerSeat: metrics.effectivePerSeatFare,
        totalPayableINR: metrics.totalFare
      },
      economicBenchmark: {
        puneSoloCabFareINR: metrics.soloCabFare,
        passengerSavedINR: metrics.totalSavings,
        savingsPercent: `${metrics.savingsPercent}%`
      },
      environmentalImpact: {
        co2PreventedKg: metrics.co2SavedKg,
        treesYearlyAbsorptionEquivalent: metrics.treesEquiv
      },
      paymentGateway: {
        mode: 'NPCI_UPI_REALTIME',
        payeeVpa: rawUpiId,
        npciUri: upiUri
      },
      routeWaypointsArray: stops
    };
  }, [selectedCorridorId, metrics, fullRideFare, boardStop, dropStop, seatsBooked, useCustomFare, rawUpiId, upiUri, stops]);

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(jsonSummary, null, 2));
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  return (
    <div className="card card-carpool border-0 shadow-sm p-4">
      {/* Title & Badge */}
      <div className="border-bottom pb-3 mb-4">
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
          <div>
            <span className="badge bg-primary text-white mb-2">
              <i className="bi bi-cpu-fill me-1"></i> P2 JavaScript Interactive Tool
            </span>
            <h4 className="fw-bold text-dark mb-1">
              Multi-Stop Route Dynamic Fare &amp; Stage Split Calculator
            </h4>
            <p className="text-muted small mb-0">
              When a driver travels from <strong>Source A to Destination B via intermediate stops C, D, and E</strong>,
              passengers boarding at any waypoint can dynamically calculate their exact proportional fare or propose a negotiated amount.
            </p>
          </div>
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1"
            onClick={() => setShowJsonInspector(!showJsonInspector)}
          >
            <i className="bi bi-fileTYPE-json"></i>
            {showJsonInspector ? 'Hide JSON Data' : 'Inspect JSON & Array Model'}
          </button>
        </div>
      </div>

      {/* Preset Corridor Selector */}
      <div className="mb-4">
        <label className="form-label fw-semibold small text-muted text-uppercase mb-2">
          <i className="bi bi-signpost-2 text-primary me-1"></i> Select Commuter Corridor Preset
        </label>
        <div className="row g-2">
          {PRESET_CORRIDORS.map((c) => (
            <div key={c.id} className="col-lg-4 col-md-12">
              <button
                type="button"
                className={`btn text-start w-100 p-2 h-100 border ${
                  selectedCorridorId === c.id ? 'btn-primary border-primary' : 'btn-light text-dark'
                }`}
                onClick={() => handleCorridorChange(c.id)}
              >
                <div className="fw-bold small">{c.name.split(':')[0]}</div>
                <div className="small text-truncate" style={{ fontSize: '0.78rem', opacity: 0.9 }}>
                  {c.name.split(':')[1]}
                </div>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Interactive Route Flow Visualizer */}
      <div className="mb-4 p-3 bg-light rounded-3 border">
        <div className="d-flex justify-content-between align-items-center mb-2">
          <h6 className="fw-bold text-dark mb-0 small text-uppercase">
            <i className="bi bi-bezier2 text-primary me-1"></i> Interactive Route Sequence (A ➔ C ➔ D ➔ E ➔ B)
          </h6>
          <span className="badge bg-white text-muted border small">
            Total Corridor: {metrics.totalRouteKm} km
          </span>
        </div>

        {/* Visual Waypoint Ribbon */}
        <div className="d-flex flex-wrap align-items-center gap-2 py-2">
          {stops.map((stop, idx) => {
            const isBoard = stop.id === boardStopId;
            const isDrop = stop.id === dropStopId;
            const isInSegment = idx >= boardIndex && idx <= dropIndex;

            return (
              <React.Fragment key={stop.id}>
                <div
                  className={`card p-2 border position-relative transition-all ${
                    isBoard
                      ? 'border-success bg-success-subtle text-success-emphasis shadow-sm'
                      : isDrop
                      ? 'border-primary bg-primary-subtle text-primary-emphasis shadow-sm'
                      : isInSegment
                      ? 'border-info-subtle bg-white text-dark'
                      : 'border-secondary-subtle bg-white text-muted'
                  }`}
                  style={{ minWidth: '150px', flex: '1 1 auto' }}
                >
                  <div className="d-flex justify-content-between align-items-center">
                    <span className="badge rounded-pill bg-dark text-white" style={{ fontSize: '0.65rem' }}>
                      {stop.isOrigin ? 'Source A' : stop.isDest ? 'Campus B' : `Stop ${String.fromCharCode(67 + idx - 1)}`}
                    </span>
                    <span className="small fw-semibold">{stop.km} km</span>
                  </div>
                  <div className="fw-bold small text-truncate mt-1" title={stop.name}>
                    {stop.name}
                  </div>
                  <div className="d-flex justify-content-between align-items-center mt-2">
                    {isBoard ? (
                      <span className="badge bg-success small"><i className="bi bi-geo-alt-fill"></i> Passenger Boards</span>
                    ) : isDrop ? (
                      <span className="badge bg-primary small"><i className="bi bi-flag-fill"></i> Drop-off Campus</span>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-outline-secondary btn-xs py-0 px-1"
                        style={{ fontSize: '0.7rem' }}
                        onClick={() => setBoardStopId(stop.id)}
                      >
                        Board here
                      </button>
                    )}

                    {!stop.isOrigin && !stop.isDest && (
                      <button
                        type="button"
                        className="btn btn-link text-danger p-0 ms-1"
                        title="Remove waypoint"
                        onClick={() => handleRemoveStop(stop.id)}
                      >
                        <i className="bi bi-x-circle"></i>
                      </button>
                    )}
                  </div>
                </div>

                {idx < stops.length - 1 && (
                  <div className="d-flex align-items-center text-muted">
                    <i className={`bi bi-arrow-right fs-5 ${isInSegment ? 'text-primary fw-bold' : ''}`}></i>
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Add Intermediate Waypoint Button / Form */}
        <div className="mt-2 text-end">
          {!showAddStopForm ? (
            <button
              type="button"
              className="btn btn-sm btn-outline-primary"
              onClick={() => setShowAddStopForm(true)}
            >
              <i className="bi bi-plus-circle me-1"></i> Add Custom Stop Along Route
            </button>
          ) : (
            <form onSubmit={handleAddStop} className="card p-3 border mt-2 text-start bg-white">
              <h6 className="fw-bold small mb-2">Insert New Intermediate Waypoint</h6>
              <div className="row g-2">
                <div className="col-md-7">
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    placeholder="Waypoint Name (e.g. Kalewadi Phata / Nashik Phata)"
                    value={newStopName}
                    onChange={(e) => setNewStopName(e.target.value)}
                  />
                </div>
                <div className="col-md-3">
                  <div className="input-group input-group-sm">
                    <input
                      type="number"
                      step="0.5"
                      className="form-control"
                      placeholder="Distance from A"
                      value={newStopKm}
                      onChange={(e) => setNewStopKm(e.target.value)}
                    />
                    <span className="input-group-text">km</span>
                  </div>
                </div>
                <div className="col-md-2 d-flex gap-1">
                  <button type="submit" className="btn btn-sm btn-primary w-100">Add</button>
                  <button type="button" className="btn btn-sm btn-light border" onClick={() => setShowAddStopForm(false)}>Cancel</button>
                </div>
              </div>
              {validationError && (
                <div className="text-danger small mt-2">{validationError}</div>
              )}
            </form>
          )}
        </div>
      </div>

      {/* Main 2-Column Interface: Stage Calculation & Payment */}
      <div className="row g-4">
        {/* Left Column: Passenger Stage Configuration */}
        <div className="col-lg-7">
          <div className="card border p-3 h-100">
            <h6 className="fw-bold text-dark text-uppercase small mb-3">
              <i className="bi bi-person-walking text-primary me-1"></i> Passenger Stage Booking Parameters
            </h6>

            {/* Boarding Point Selection */}
            <div className="mb-3">
              <label className="form-label fw-semibold small">1. Where does the passenger board?</label>
              <select
                className="form-select form-select-sm"
                value={boardStopId}
                onChange={(e) => setBoardStopId(e.target.value)}
              >
                {stops.map((s, i) => (
                  <option key={s.id} value={s.id}>
                    {s.isOrigin ? `[Source A] ${s.name} (0 km)` : `[Stop ${String.fromCharCode(67 + i - 1)}] ${s.name} (${s.km} km mark)`}
                  </option>
                ))}
              </select>
            </div>

            {/* Drop-off Point Selection */}
            <div className="mb-3">
              <label className="form-label fw-semibold small">2. Drop-off Destination</label>
              <select
                className="form-select form-select-sm"
                value={dropStopId}
                onChange={(e) => setDropStopId(e.target.value)}
              >
                {stops.map((s, i) => (
                  <option key={s.id} value={s.id}>
                    {s.isDest ? `[Destination B] ${s.name} (${s.km} km mark)` : `${s.name} (${s.km} km mark)`}
                  </option>
                ))}
              </select>
            </div>

            {/* Driver Full Ride Base Fare Setting */}
            <div className="row g-2 mb-3">
              <div className="col-sm-6">
                <label className="form-label fw-semibold small mb-1">Driver Total Ride Fare (Source A ➔ B)</label>
                <div className="input-group input-group-sm">
                  <span className="input-group-text">₹</span>
                  <input
                    type="number"
                    min="30"
                    max="500"
                    className="form-control"
                    value={fullRideFare}
                    onChange={(e) => setFullRideFare(Number(e.target.value))}
                  />
                  <span className="input-group-text">per seat</span>
                </div>
              </div>

              <div className="col-sm-6">
                <label className="form-label fw-semibold small mb-1">Number of Seats Booked</label>
                <select
                  className="form-select form-select-sm"
                  value={seatsBooked}
                  onChange={(e) => setSeatsBooked(Number(e.target.value))}
                >
                  <option value={1}>1 Seat</option>
                  <option value={2}>2 Seats</option>
                  <option value={3}>3 Seats</option>
                  <option value={4}>4 Seats</option>
                </select>
              </div>
            </div>

            {/* Stage Proportional Calculation Highlight */}
            <div className="p-3 bg-light rounded-3 border mb-3">
              <div className="d-flex justify-content-between align-items-center mb-1">
                <span className="small text-muted">Passenger Travel Distance:</span>
                <span className="fw-bold text-dark">{metrics.passengerKm} km of {metrics.totalRouteKm} km ({metrics.ratio}%)</span>
              </div>
              <div className="d-flex justify-content-between align-items-center mb-1">
                <span className="small text-muted">Auto-Calculated Stage Fare:</span>
                <span className="fw-bold text-primary fs-5">₹{metrics.autoStageFare} / seat</span>
              </div>
              <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                Formula: Math.round({fullRideFare} &times; ({metrics.passengerKm} &divide; {metrics.totalRouteKm})) = ₹{metrics.autoStageFare}
              </div>
            </div>

            {/* Rider Custom Expected Amount Feature */}
            <div className="pt-2 border-top">
              <div className="form-check form-switch mb-2">
                <input
                  className="form-check-input"
                  type="checkbox"
                  role="switch"
                  id="customAmountSwitch"
                  checked={useCustomFare}
                  onChange={(e) => {
                    setUseCustomFare(e.target.checked);
                    if (e.target.checked && !customFareInput) {
                      setCustomFareInput(String(metrics.autoStageFare));
                    }
                  }}
                />
                <label className="form-check-label fw-semibold small" htmlFor="customAmountSwitch">
                  Enable Custom / Rider Negotiated Fare Amount
                </label>
              </div>

              {useCustomFare && (
                <div className="p-2 bg-warning-subtle rounded border border-warning-subtle mb-2">
                  <label className="form-label fw-semibold small mb-1 text-warning-emphasis">
                    Rider Proposed Fare Amount (₹ per seat):
                  </label>
                  <div className="input-group input-group-sm">
                    <span className="input-group-text">₹</span>
                    <input
                      type="number"
                      min="10"
                      max="500"
                      className="form-control"
                      placeholder="e.g. 40 or 50"
                      value={customFareInput}
                      onChange={(e) => setCustomFareInput(e.target.value)}
                    />
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={() => setCustomFareInput(String(metrics.autoStageFare))}
                    >
                      Reset to Auto (₹{metrics.autoStageFare})
                    </button>
                  </div>
                  <div className="text-muted mt-1" style={{ fontSize: '0.74rem' }}>
                    The rider or passenger can specify this amount during seat reservation.
                  </div>
                </div>
              )}
            </div>

            {!metrics.isValid && (
              <div className="alert alert-danger small mt-2 mb-0">
                <i className="bi bi-exclamation-triangle-fill me-1"></i> {metrics.error}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Real-Time Payment, UPI QR, and Savings */}
        <div className="col-lg-5">
          <div className="bg-light p-3 rounded-3 border h-100 d-flex flex-column justify-content-between">
            {/* Payment Summary */}
            <div>
              <div className="d-flex justify-content-between align-items-center mb-2">
                <h6 className="fw-bold text-dark text-uppercase small mb-0">
                  <i className="bi bi-wallet2 text-success me-1"></i> Stage Payment &amp; QR
                </h6>
                <span className="badge bg-success-subtle text-success border border-success-subtle">
                  Live NPCI UPI
                </span>
              </div>

              {/* Total Payable Box */}
              <div className="p-3 bg-white rounded border mb-3 text-center">
                <span className="text-muted small d-block">Total Amount to Pay</span>
                <span className="fs-2 fw-bold text-primary">₹{metrics.totalFare}</span>
                <div className="text-muted small" style={{ fontSize: '0.78rem' }}>
                  ({seatsBooked} seat{seatsBooked > 1 ? 's' : ''} &times; ₹{metrics.effectivePerSeatFare}/seat from {boardStop?.name})
                </div>
              </div>

              {/* QR Code and Mobile Intents */}
              {!simulatedReceipt ? (
                <div className="card p-3 border text-center bg-white mb-3">
                  <div className="fw-semibold text-dark small mb-2">
                    <i className="bi bi-qr-code-scan text-primary me-1"></i> Scan with any UPI App
                  </div>

                  {qrCodeUrl ? (
                    <img
                      src={qrCodeUrl}
                      alt="NPCI UPI QR Code"
                      className="mx-auto rounded border p-1 mb-2 shadow-sm"
                      style={{ width: '150px', height: '150px' }}
                    />
                  ) : (
                    <div className="spinner-border spinner-border-sm text-primary my-4" role="status"></div>
                  )}

                  <div className="fw-mono text-muted small mb-2" style={{ fontSize: '0.75rem' }}>
                    UPI ID: <strong>{rawUpiId}</strong> &bull; Amount: <strong>₹{metrics.totalFare}</strong>
                  </div>

                  {/* Direct Mobile Deep Links */}
                  <div className="d-flex justify-content-center gap-1 mb-2">
                    <a
                      href={upiUri}
                      className="btn btn-outline-dark btn-sm py-1 px-2"
                      style={{ fontSize: '0.75rem' }}
                    >
                      <i className="bi bi-phone me-1"></i> Open in UPI App
                    </a>
                  </div>

                  {/* Simulated Instant Settlement */}
                  <button
                    type="button"
                    className="btn btn-success btn-sm w-100 mt-1 d-flex align-items-center justify-content-center gap-1"
                    onClick={handleSimulatePayment}
                  >
                    <i className="bi bi-check-circle-fill"></i> Simulate Stage Payment Authorization
                  </button>
                </div>
              ) : (
                /* Payment Receipt View */
                <div className="card p-3 border border-success bg-success-subtle text-success-emphasis mb-3">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <strong className="small"><i className="bi bi-patch-check-fill text-success me-1"></i> Payment Verified</strong>
                    <span className="badge bg-success">{simulatedReceipt.timestamp}</span>
                  </div>
                  <div className="small">
                    <div><strong>Txn Ref:</strong> {simulatedReceipt.txnRef}</div>
                    <div><strong>UTR:</strong> {simulatedReceipt.utr}</div>
                    <div><strong>Stage:</strong> {simulatedReceipt.passengerStop} ➔ {simulatedReceipt.dropStop}</div>
                    <div><strong>Amount Settled:</strong> ₹{simulatedReceipt.amount}</div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-success mt-2"
                    onClick={() => setSimulatedReceipt(null)}
                  >
                    Calculate Another Stage
                  </button>
                </div>
              )}
            </div>

            {/* Economic and Green Savings */}
            <div className="pt-2 border-top">
              <div className="d-flex justify-content-between align-items-center small py-1">
                <span className="text-muted">Ola/Uber Solo Cab for {metrics.passengerKm} km:</span>
                <span className="text-muted text-decoration-line-through">₹{metrics.soloCabFare}</span>
              </div>
              <div className="d-flex justify-content-between align-items-center small py-1">
                <span className="text-success fw-semibold"><i className="bi bi-piggy-bank me-1"></i> Stage Carpool Savings:</span>
                <strong className="text-success">₹{metrics.totalSavings} ({metrics.savingsPercent}% off)</strong>
              </div>
              <div className="d-flex justify-content-between align-items-center small py-1">
                <span className="text-success fw-semibold"><i className="bi bi-tree me-1"></i> Net Carbon Prevented:</span>
                <strong className="text-success">{metrics.co2SavedKg} kg CO₂</strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* JSON and Array Inspector Modal / Collapsible */}
      {showJsonInspector && (
        <div className="mt-4 p-3 bg-dark text-light rounded-3 shadow-sm">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <span className="fw-bold small text-warning font-monospace">
              <i className="bi bi-code-slash me-1"></i> JavaScript Array &amp; JSON State Inspector
            </span>
            <button
              type="button"
              className="btn btn-sm btn-outline-light py-0 px-2"
              onClick={handleCopyJson}
            >
              {copiedJson ? 'Copied!' : 'Copy JSON'}
            </button>
          </div>
          <p className="text-white-50 small mb-2" style={{ fontSize: '0.78rem' }}>
            Demonstrating JSON data modeling, immutable array operations (<code>.map()</code>, <code>.filter()</code>, <code>.findIndex()</code>),
            and dynamic stage ratio computation.
          </p>
          <pre
            className="bg-black p-3 rounded small text-info mb-0"
            style={{ maxHeight: '250px', overflowY: 'auto', fontSize: '0.75rem' }}
          >
            {JSON.stringify(jsonSummary, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};
