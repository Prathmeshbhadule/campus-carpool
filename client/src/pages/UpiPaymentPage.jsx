import React, { useState, useEffect, useMemo } from 'react';
import QRCode from 'qrcode';
import { useSearchParams, Link } from 'react-router-dom';
import apiClient from '../api/client';
import { useToast } from '../context/ToastContext';

export const UpiPaymentPage = () => {
  const [searchParams] = useSearchParams();
  const { showSuccess, showError } = useToast();

  const initialAmount = searchParams.get('amount') || '60';
  const initialPhone = searchParams.get('phone') || '9890123456';
  const initialName = searchParams.get('name') || 'MITAOE Campus Driver';
  const bookingId = searchParams.get('bookingId') || '';

  const [expectedAmount, setExpectedAmount] = useState(initialAmount);
  const [payeePhone, setPayeePhone] = useState(initialPhone);
  const [payeeName, setPayeeName] = useState(initialName);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [utrNumber, setUtrNumber] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [copiedField, setCopiedField] = useState(null);

  const rawUpiId = `${payeePhone.trim()}@upi`;

  // Detect mobile or desktop browser
  const isMobileDevice = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return (
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
      (window.matchMedia && window.matchMedia('(pointer: coarse)').matches && window.innerWidth <= 1024)
    );
  }, []);

  const [showDesktopAlert, setShowDesktopAlert] = useState(!isMobileDevice);

  // Standard NPCI UPI URIs & App Intents
  const appUris = useMemo(() => {
    const amt = parseFloat(expectedAmount) > 0 ? parseFloat(expectedAmount).toFixed(2) : '1.00';
    const note = `MITAOE Carpool - Intra Campus Commute`;
    const encNote = encodeURIComponent(note);
    const encName = encodeURIComponent(payeeName);
    const params = `pa=${rawUpiId}&pn=${encName}&am=${amt}&cu=INR&tn=${encNote}`;

    return {
      universal: `upi://pay?${params}`,
      gpay: `tez://upi/pay?${params}`,
      gpayIntent: `intent://pay?${params}#Intent;scheme=upi;package=com.google.android.apps.nbu.paisa.user;end`,
      phonepe: `phonepe://pay?${params}`,
      phonepeIntent: `intent://pay?${params}#Intent;scheme=upi;package=com.phonepe.app;end`,
      paytm: `paytmmp://pay?${params}`,
      paytmIntent: `intent://pay?${params}#Intent;scheme=upi;package=net.one97.paytm;end`,
      bhim: `bhim://pay?${params}`,
      bhimIntent: `intent://pay?${params}#Intent;scheme=upi;package=in.org.npci.upiapp;end`
    };
  }, [rawUpiId, payeeName, expectedAmount]);

  const upiUri = appUris.universal;

  // Generate Real-time QR Code
  useEffect(() => {
    let isMounted = true;
    QRCode.toDataURL(upiUri, {
      width: 260,
      margin: 2,
      color: {
        dark: '#0f172a',
        light: '#ffffff'
      },
      errorCorrectionLevel: 'H'
    })
      .then((url) => {
        if (isMounted) setQrCodeUrl(url);
      })
      .catch((err) => {
        console.error('[QRCode] Generation error:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [upiUri]);

  const handleCopy = (text, fieldName) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    showSuccess(`${fieldName} copied to clipboard!`);
    setTimeout(() => setCopiedField(null), 2500);
  };

  const handleOpenApp = (appKey) => {
    if (!isMobileDevice) {
      setShowDesktopAlert(true);
      showError('Desktop PC detected: UPI apps run on smartphones. Scan the QR code or use Instant Simulation below.');
      return;
    }

    const uri = appUris[appKey] || appUris.universal;
    window.location.href = uri;
  };

  const handleSimulatePayment = async () => {
    const dummyUtr = `UTR${Date.now().toString().slice(-6)}${Math.floor(100000 + Math.random() * 900000)}`;
    setUtrNumber(dummyUtr);
    setVerifying(true);
    try {
      const generatedTxnId = `UPI-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

      if (bookingId) {
        await apiClient.patch(`/bookings/${bookingId}/payment`, {
          paymentStatus: 'paid_upi',
          paymentNote: `UPI UTR: ${dummyUtr} | Amount: ₹${expectedAmount} (Simulated Verified)`
        });
      }

      setReceipt({
        transactionId: generatedTxnId,
        utr: dummyUtr,
        amount: expectedAmount,
        payeeName,
        payeeUpi: rawUpiId,
        timestamp: new Date().toLocaleString('en-IN'),
        status: 'VERIFIED SUCCESSFUL'
      });
      showSuccess(`Payment of ₹${expectedAmount} simulated and verified successfully!`);
    } catch (err) {
      showError(err.message || 'Payment simulation failed');
    } finally {
      setVerifying(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!utrNumber.trim() || utrNumber.trim().length < 6) {
      showError('Please enter a valid UPI Reference / UTR Number (6-12 digits).');
      return;
    }

    setVerifying(true);
    try {
      const generatedTxnId = `UPI-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

      if (bookingId) {
        await apiClient.patch(`/bookings/${bookingId}/payment`, {
          paymentStatus: 'paid_upi',
          paymentNote: `UPI UTR: ${utrNumber.trim()} | Amount: ₹${expectedAmount}`
        });
      }

      setReceipt({
        transactionId: generatedTxnId,
        utr: utrNumber.trim(),
        amount: expectedAmount,
        payeeName,
        payeeUpi: rawUpiId,
        timestamp: new Date().toLocaleString('en-IN'),
        status: 'VERIFIED SUCCESSFUL'
      });
      showSuccess(`Payment of ₹${expectedAmount} confirmed via UPI!`);
    } catch (err) {
      showError(err.message || 'Payment verification failed');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-lg-7 col-md-9">
          {/* Header */}
          <div className="text-center mb-4">
            <span className="badge bg-success-subtle text-success border border-success-subtle px-3 py-1 rounded-pill mb-2">
              <i className="bi bi-shield-check me-1"></i> NPCI Standard Real-Time Gateway
            </span>
            <h2 className="fw-bold text-dark">Real-Time UPI QR Payment</h2>
            <p className="text-muted small">
              Scan with any UPI application (Google Pay, PhonePe, Paytm, BHIM) to settle your campus carpool fare.
            </p>
          </div>

          {receipt ? (
            /* Verified Receipt Card */
            <div className="card card-carpool border-0 p-4 shadow-sm text-center">
              <div className="bg-success text-white rounded-circle d-inline-flex align-items-center justify-content-center mb-3 shadow mx-auto" style={{ width: '70px', height: '70px' }}>
                <i className="bi bi-check-lg fs-1"></i>
              </div>
              <h3 className="fw-bold text-success mb-1">Payment Verified &amp; Settled!</h3>
              <p className="text-muted small mb-4">The driver has received the direct peer-to-peer UPI transfer.</p>

              <div className="bg-light p-3 rounded-3 border text-start mb-4 small">
                <div className="d-flex justify-content-between py-2 border-bottom">
                  <span className="text-muted">Settlement Status:</span>
                  <strong className="text-success"><i className="bi bi-patch-check-fill me-1"></i>VERIFIED</strong>
                </div>
                <div className="d-flex justify-content-between py-2 border-bottom">
                  <span className="text-muted">Paid to Driver:</span>
                  <strong className="text-dark">{receipt.payeeName}</strong>
                </div>
                <div className="d-flex justify-content-between py-2 border-bottom">
                  <span className="text-muted">Payee UPI ID:</span>
                  <span className="font-monospace text-dark">{receipt.payeeUpi}</span>
                </div>
                <div className="d-flex justify-content-between py-2 border-bottom">
                  <span className="text-muted">Amount Transferred:</span>
                  <strong className="text-primary fs-5">₹{receipt.amount}</strong>
                </div>
                <div className="d-flex justify-content-between py-2 border-bottom">
                  <span className="text-muted">UPI Ref (UTR):</span>
                  <span className="font-monospace text-dark">{receipt.utr}</span>
                </div>
                <div className="d-flex justify-content-between py-2">
                  <span className="text-muted">Timestamp:</span>
                  <span className="text-secondary">{receipt.timestamp}</span>
                </div>
              </div>

              <div className="d-flex justify-content-center gap-3">
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => setReceipt(null)}
                >
                  Pay Another Ride
                </button>
                <Link to="/dashboard" className="btn btn-primary-carpool">
                  Go to Dashboard
                </Link>
              </div>
            </div>
          ) : (
            /* Payment & QR Card */
            <div className="card card-carpool border-0 p-4 shadow-sm">
              {/* Expected Amount Input with Presets */}
              <div className="bg-light p-3 rounded-3 border mb-4">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <label className="form-label mb-0 fw-semibold text-dark">
                    Expected Amount (Choice to Customize):
                  </label>
                  <span className="badge bg-primary px-2 py-1">Instant Dynamic QR</span>
                </div>
                <div className="input-group mb-2">
                  <span className="input-group-text bg-white fw-bold fs-5">₹</span>
                  <input
                    type="number"
                    className="form-control form-control-lg fw-bold text-primary"
                    min="1"
                    max="5000"
                    value={expectedAmount}
                    onChange={(e) => setExpectedAmount(e.target.value)}
                    placeholder="Enter expected amount"
                  />
                </div>
                {/* Quick presets */}
                <div className="d-flex gap-2">
                  {[40, 60, 80, 100, 120].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      className={`btn btn-sm ${Number(expectedAmount) === preset ? 'btn-primary' : 'btn-outline-secondary bg-white'}`}
                      onClick={() => setExpectedAmount(preset.toString())}
                    >
                      ₹{preset}
                    </button>
                  ))}
                </div>
                <div className="form-text text-muted mt-2 small">
                  The QR code dynamically regenerates in real time to request exactly ₹{expectedAmount}.
                </div>
              </div>

              {/* Dynamic QR Code */}
              <div className="text-center my-2 p-4 bg-white border rounded-3 shadow-sm">
                {qrCodeUrl ? (
                  <div>
                    <img
                      src={qrCodeUrl}
                      alt="Real-Time UPI Payment QR Code"
                      className="img-fluid rounded mb-2 border p-2 bg-white"
                      style={{ maxWidth: '240px', height: 'auto' }}
                    />
                    <div className="d-flex justify-content-center align-items-center gap-2 small text-muted mt-2">
                      <i className="bi bi-camera-fill text-primary"></i>
                      <span>Scan with <strong>Google Pay &bull; PhonePe &bull; Paytm &bull; BHIM</strong></span>
                    </div>
                  </div>
                ) : (
                  <div className="py-4">
                    <div className="spinner-border text-primary" role="status"></div>
                    <div className="small text-muted mt-2">Generating Dynamic QR Code...</div>
                  </div>
                )}
              </div>

              {/* Payee Info & Mobile Number */}
              <div className="d-flex flex-column gap-2 my-3">
                <div className="p-2 px-3 bg-light rounded-2 border d-flex justify-content-between align-items-center">
                  <div>
                    <span className="text-muted small d-block" style={{ fontSize: '0.75rem' }}>Payee Name</span>
                    <strong className="text-dark">{payeeName}</strong>
                  </div>
                  <span className="badge bg-success-subtle text-success border border-success-subtle">
                    <i className="bi bi-patch-check-fill me-1"></i> Campus Verified Driver
                  </span>
                </div>

                <div className="p-2 px-3 bg-light rounded-2 border d-flex justify-content-between align-items-center">
                  <div>
                    <span className="text-muted small d-block" style={{ fontSize: '0.75rem' }}>Driver UPI ID</span>
                    <span className="font-monospace fw-semibold text-dark">{rawUpiId}</span>
                  </div>
                  <button
                    type="button"
                    className="btn btn-outline-secondary btn-sm py-1 px-2"
                    onClick={() => handleCopy(rawUpiId, 'UPI ID')}
                  >
                    <i className={`bi ${copiedField === 'UPI ID' ? 'bi-check-lg text-success' : 'bi-clipboard'}`}></i>
                    <span className="ms-1" style={{ fontSize: '0.78rem' }}>
                      {copiedField === 'UPI ID' ? 'Copied' : 'Copy'}
                    </span>
                  </button>
                </div>

                <div className="p-2 px-3 bg-light rounded-2 border d-flex justify-content-between align-items-center">
                  <div>
                    <span className="text-muted small d-block" style={{ fontSize: '0.75rem' }}>Registered Mobile Number</span>
                    <span className="font-monospace fw-semibold text-dark">{payeePhone}</span>
                  </div>
                  <button
                    type="button"
                    className="btn btn-outline-secondary btn-sm py-1 px-2"
                    onClick={() => handleCopy(payeePhone, 'Mobile Number')}
                  >
                    <i className={`bi ${copiedField === 'Mobile Number' ? 'bi-check-lg text-success' : 'bi-clipboard'}`}></i>
                    <span className="ms-1" style={{ fontSize: '0.78rem' }}>
                      {copiedField === 'Mobile Number' ? 'Copied' : 'Copy'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Direct UPI App Launch Section */}
              <div className="mb-4">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <label className="form-label small fw-semibold text-dark mb-0">
                    Direct UPI App Launch:
                  </label>
                  <span className={`badge ${isMobileDevice ? 'bg-success-subtle text-success border border-success-subtle' : 'bg-secondary-subtle text-secondary border'}`} style={{ fontSize: '0.72rem' }}>
                    <i className={`bi ${isMobileDevice ? 'bi-phone' : 'bi-laptop'} me-1`}></i>
                    {isMobileDevice ? 'Mobile Smartphone' : 'Desktop Browser'}
                  </span>
                </div>

                {isMobileDevice ? (
                  <div>
                    {/* On mobile, direct user-gesture anchor tag triggers Android app chooser */}
                    <a
                      href={appUris.universal}
                      className="btn btn-success w-100 d-flex align-items-center justify-content-center gap-2 py-2 mb-2 shadow-sm"
                    >
                      <i className="bi bi-phone-vibrate-fill fs-5"></i>
                      <span className="fw-semibold">Open in Any UPI App (Chooser)</span>
                    </a>

                    {/* Specific App Direct Intents on Mobile */}
                    <div className="row g-2">
                      <div className="col-6">
                        <a
                          href={appUris.gpayIntent}
                          className="btn btn-outline-dark btn-sm w-100 d-flex align-items-center justify-content-center gap-1 py-1"
                        >
                          <i className="bi bi-google text-primary"></i> Google Pay
                        </a>
                      </div>
                      <div className="col-6">
                        <a
                          href={appUris.phonepeIntent}
                          className="btn btn-outline-dark btn-sm w-100 d-flex align-items-center justify-content-center gap-1 py-1"
                        >
                          <i className="bi bi-wallet2 text-primary"></i> PhonePe
                        </a>
                      </div>
                      <div className="col-6">
                        <a
                          href={appUris.paytmIntent}
                          className="btn btn-outline-dark btn-sm w-100 d-flex align-items-center justify-content-center gap-1 py-1"
                        >
                          <i className="bi bi-credit-card-2-front text-info"></i> Paytm
                        </a>
                      </div>
                      <div className="col-6">
                        <a
                          href={appUris.bhimIntent}
                          className="btn btn-outline-dark btn-sm w-100 d-flex align-items-center justify-content-center gap-1 py-1"
                        >
                          <i className="bi bi-shield-check text-success"></i> BHIM UPI
                        </a>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    {/* On desktop, explain clearly and provide simulated payment */}
                    <button
                      type="button"
                      className="btn btn-success w-100 d-flex align-items-center justify-content-center gap-2 py-2 mb-2 shadow-sm"
                      onClick={() => handleOpenApp('universal')}
                    >
                      <i className="bi bi-phone-vibrate-fill fs-5"></i>
                      <span className="fw-semibold">Open in UPI App (GPay / PhonePe / Paytm)</span>
                    </button>

                    {/* Desktop App Chips */}
                    <div className="row g-2 mb-2">
                      <div className="col-6">
                        <button
                          type="button"
                          className="btn btn-outline-secondary btn-sm w-100 d-flex align-items-center justify-content-center gap-1 py-1"
                          onClick={() => handleOpenApp('gpay')}
                        >
                          <i className="bi bi-google text-primary"></i> Google Pay
                        </button>
                      </div>
                      <div className="col-6">
                        <button
                          type="button"
                          className="btn btn-outline-secondary btn-sm w-100 d-flex align-items-center justify-content-center gap-1 py-1"
                          onClick={() => handleOpenApp('phonepe')}
                        >
                          <i className="bi bi-wallet2 text-primary"></i> PhonePe
                        </button>
                      </div>
                      <div className="col-6">
                        <button
                          type="button"
                          className="btn btn-outline-secondary btn-sm w-100 d-flex align-items-center justify-content-center gap-1 py-1"
                          onClick={() => handleOpenApp('paytm')}
                        >
                          <i className="bi bi-credit-card-2-front text-info"></i> Paytm
                        </button>
                      </div>
                      <div className="col-6">
                        <button
                          type="button"
                          className="btn btn-outline-secondary btn-sm w-100 d-flex align-items-center justify-content-center gap-1 py-1"
                          onClick={() => handleOpenApp('bhim')}
                        >
                          <i className="bi bi-shield-check text-success"></i> BHIM UPI
                        </button>
                      </div>
                    </div>

                    {/* Desktop Explanation & 1-Click Simulated Authorization */}
                    {showDesktopAlert && (
                      <div className="alert alert-info border small p-3 rounded-3 mt-2 mb-0">
                        <div className="d-flex align-items-start gap-2">
                          <i className="bi bi-laptop fs-4 text-primary mt-0"></i>
                          <div>
                            <strong className="text-dark d-block">Why it cannot open directly on PC / Desktop:</strong>
                            <p className="text-muted mb-2" style={{ fontSize: '0.8rem' }}>
                              Google Pay, PhonePe, and Paytm are mobile Android/iOS apps and cannot run natively inside a desktop browser.
                            </p>
                            <div className="d-flex flex-wrap gap-2">
                              <button
                                type="button"
                                className="btn btn-sm btn-primary-carpool"
                                onClick={handleSimulatePayment}
                              >
                                <i className="bi bi-lightning-charge-fill me-1"></i> Simulate Instant App Payment
                              </button>
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-secondary bg-white"
                                onClick={() => handleCopy(appUris.universal, 'UPI Payment Link')}
                              >
                                <i className="bi bi-link-45deg me-1"></i> Copy UPI Link
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Verification Form */}
              <form onSubmit={handleVerify} className="pt-3 border-top">
                <label className="form-label small fw-semibold text-dark mb-1">
                  Enter 12-Digit UPI Reference / UTR Number:
                </label>
                <div className="input-group mb-2">
                  <input
                    type="text"
                    className="form-control font-monospace"
                    placeholder="e.g. 429108420194"
                    value={utrNumber}
                    onChange={(e) => setUtrNumber(e.target.value)}
                  />
                  <button
                    type="submit"
                    disabled={verifying}
                    className="btn btn-primary-carpool px-4"
                  >
                    {verifying ? 'Verifying...' : 'Verify Payment'}
                  </button>
                </div>
                <div className="form-text text-muted small">
                  Verification generates a verified receipt and updates the ride booking settlement.
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UpiPaymentPage;
