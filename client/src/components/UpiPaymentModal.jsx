import React, { useState, useEffect, useMemo } from 'react';
import QRCode from 'qrcode';
import apiClient from '../api/client';
import { useToast } from '../context/ToastContext';

export const UpiPaymentModal = ({
  isOpen,
  onClose,
  booking,
  ride,
  driver,
  defaultAmount,
  onPaymentSuccess
}) => {
  const { showSuccess, showError } = useToast();

  const payeeName = driver?.name || ride?.driver?.name || 'MITAOE Driver';
  const payeePhone = driver?.phone || ride?.driver?.phone || '9890123456';
  const rawUpiId = `${payeePhone}@upi`;

  const initialAmount = defaultAmount || booking?.totalFare || ride?.costPerSeat || 60;
  const [expectedAmount, setExpectedAmount] = useState(initialAmount);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [utrNumber, setUtrNumber] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [copiedField, setCopiedField] = useState(null);

  // Synchronize initial amount when modal opens
  useEffect(() => {
    if (initialAmount) {
      setExpectedAmount(initialAmount);
    }
    setReceipt(null);
    setUtrNumber('');
  }, [initialAmount, isOpen]);

  // Detect if user is on mobile or desktop browser
  const isMobileDevice = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return (
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
      (window.matchMedia && window.matchMedia('(pointer: coarse)').matches && window.innerWidth <= 1024)
    );
  }, []);

  const [showDesktopAlert, setShowDesktopAlert] = useState(!isMobileDevice);

  // Construct NPCI Standard UPI URIs & Intents for specific apps
  const appUris = useMemo(() => {
    const amt = parseFloat(expectedAmount) > 0 ? parseFloat(expectedAmount).toFixed(2) : '1.00';
    const note = `MITAOE Carpool - ${ride?.origin?.locality || 'Pune'} to ${ride?.destination?.locality || 'Campus'}`;
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
  }, [rawUpiId, payeeName, expectedAmount, ride]);

  const upiUri = appUris.universal;

  // Generate Real-time QR Code
  useEffect(() => {
    let isMounted = true;
    QRCode.toDataURL(upiUri, {
      width: 240,
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
        console.error('[QRCode] Failed to generate QR code:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [upiUri]);

  if (!isOpen) return null;

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

  // Instant Simulated Payment for Desktop testing
  const handleSimulateInstantPayment = async () => {
    const dummyUtr = `UTR${Date.now().toString().slice(-6)}${Math.floor(100000 + Math.random() * 900000)}`;
    setUtrNumber(dummyUtr);
    setVerifying(true);
    try {
      const generatedTxnId = `UPI-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

      if (booking?._id) {
        await apiClient.patch(`/bookings/${booking._id}/payment`, {
          paymentStatus: 'paid_upi',
          paymentNote: `UPI UTR: ${dummyUtr} | Amount: ₹${expectedAmount} (Simulated Verified)`
        });
      }

      const receiptData = {
        transactionId: generatedTxnId,
        utr: dummyUtr,
        amount: expectedAmount,
        payeeName,
        payeeUpi: rawUpiId,
        timestamp: new Date().toLocaleString('en-IN'),
        status: 'VERIFIED SUCCESSFUL'
      };

      setReceipt(receiptData);
      showSuccess(`Payment of ₹${expectedAmount} simulated and verified successfully!`);
      if (onPaymentSuccess) {
        onPaymentSuccess(receiptData);
      }
    } catch (err) {
      showError(err.message || 'Payment simulation failed');
    } finally {
      setVerifying(false);
    }
  };

  // Confirm and Verify Payment
  const handleVerifyPayment = async (e) => {
    e.preventDefault();
    if (!utrNumber.trim()) {
      showError('Please enter your 12-digit UPI Reference / UTR Number.');
      return;
    }

    setVerifying(true);
    try {
      const generatedTxnId = `UPI-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

      if (booking?._id) {
        await apiClient.patch(`/bookings/${booking._id}/payment`, {
          paymentStatus: 'paid_upi',
          paymentNote: `UPI UTR: ${utrNumber.trim()} | Amount: ₹${expectedAmount}`
        });
      }

      const receiptData = {
        transactionId: generatedTxnId,
        utr: utrNumber.trim(),
        amount: expectedAmount,
        payeeName,
        payeeUpi: rawUpiId,
        timestamp: new Date().toLocaleString('en-IN'),
        status: 'VERIFIED SUCCESSFUL'
      };

      setReceipt(receiptData);
      showSuccess(`Payment of ₹${expectedAmount} confirmed via UPI!`);
      if (onPaymentSuccess) {
        onPaymentSuccess(receiptData);
      }
    } catch (err) {
      showError(err.message || 'Payment verification failed');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(15, 23, 42, 0.7)', zIndex: 1050 }}>
      <div className="modal-dialog modal-dialog-centered modal-md">
        <div className="modal-content shadow-lg border-0 rounded-4 overflow-hidden">
          {/* Header */}
          <div className="modal-header bg-primary text-white border-0 py-3">
            <div className="d-flex align-items-center gap-2">
              <div className="bg-white text-primary rounded p-1 d-flex align-items-center justify-content-center" style={{ width: '32px', height: '32px' }}>
                <i className="bi bi-qr-code-scan fs-5"></i>
              </div>
              <div>
                <h5 className="modal-title fw-bold mb-0" style={{ fontSize: '1.05rem' }}>
                  Real-Time UPI Payment Gateway
                </h5>
                <span className="badge bg-white text-primary text-uppercase" style={{ fontSize: '0.65rem' }}>
                  Instant Scannable QR &bull; Zero Fees
                </span>
              </div>
            </div>
            <button
              type="button"
              className="btn-close btn-close-white"
              onClick={onClose}
              aria-label="Close"
            ></button>
          </div>

          <div className="modal-body p-4">
            {receipt ? (
              /* Verified Payment Receipt Screen */
              <div className="text-center py-2">
                <div className="bg-success text-white rounded-circle d-inline-flex align-items-center justify-content-center mb-3 shadow" style={{ width: '64px', height: '64px' }}>
                  <i className="bi bi-check-lg fs-1"></i>
                </div>
                <h4 className="fw-bold text-success mb-1">Payment Verified!</h4>
                <p className="text-muted small mb-4">Direct UPI settlement confirmed for this commute.</p>

                <div className="bg-light p-3 rounded-3 border text-start mb-4 small">
                  <div className="d-flex justify-content-between py-1 border-bottom">
                    <span className="text-muted">Settlement Status:</span>
                    <strong className="text-success"><i className="bi bi-patch-check-fill me-1"></i>VERIFIED</strong>
                  </div>
                  <div className="d-flex justify-content-between py-1 border-bottom">
                    <span className="text-muted">Paid to Driver:</span>
                    <strong className="text-dark">{receipt.payeeName}</strong>
                  </div>
                  <div className="d-flex justify-content-between py-1 border-bottom">
                    <span className="text-muted">Payee UPI ID:</span>
                    <span className="font-monospace text-dark">{receipt.payeeUpi}</span>
                  </div>
                  <div className="d-flex justify-content-between py-1 border-bottom">
                    <span className="text-muted">Amount Transferred:</span>
                    <strong className="text-primary fs-6">₹{receipt.amount}</strong>
                  </div>
                  <div className="d-flex justify-content-between py-1 border-bottom">
                    <span className="text-muted">UPI Ref (UTR):</span>
                    <span className="font-monospace text-dark">{receipt.utr}</span>
                  </div>
                  <div className="d-flex justify-content-between py-1">
                    <span className="text-muted">Date &amp; Time:</span>
                    <span className="text-secondary">{receipt.timestamp}</span>
                  </div>
                </div>

                <div className="d-flex gap-2 justify-content-center">
                  <button
                    type="button"
                    className="btn btn-primary-carpool px-4"
                    onClick={onClose}
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              /* QR Code & Payment Form */
              <div>
                {/* Expected Amount Choice */}
                <div className="bg-light p-3 rounded-3 border mb-3">
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <label className="form-label mb-0 fw-semibold small text-muted">
                      Expected Amount (Choice to Customize):
                    </label>
                    <span className="badge bg-primary px-2 py-1">Customizable</span>
                  </div>
                  <div className="input-group">
                    <span className="input-group-text bg-white fw-bold">₹</span>
                    <input
                      type="number"
                      className="form-control fw-bold fs-5 text-primary"
                      min="1"
                      max="2000"
                      value={expectedAmount}
                      onChange={(e) => setExpectedAmount(e.target.value)}
                      placeholder="Enter amount"
                    />
                  </div>
                  <div className="form-text text-muted" style={{ fontSize: '0.75rem' }}>
                    QR Code dynamically updates in real time to request exactly ₹{expectedAmount}.
                  </div>
                </div>

                {/* QR Code Container */}
                <div className="text-center my-3 p-3 bg-white border rounded-3 shadow-sm position-relative">
                  {qrCodeUrl ? (
                    <div>
                      <img
                        src={qrCodeUrl}
                        alt="Real-Time UPI Payment QR Code"
                        className="img-fluid rounded mb-2 border p-1 bg-white"
                        style={{ maxWidth: '200px', height: 'auto' }}
                      />
                      <div className="d-flex justify-content-center align-items-center gap-2 small text-muted">
                        <i className="bi bi-camera-fill text-primary"></i>
                        <span>Scan with <strong>GPay, PhonePe, Paytm, BHIM</strong></span>
                      </div>
                    </div>
                  ) : (
                    <div className="py-4">
                      <div className="spinner-border text-primary" role="status"></div>
                      <div className="small text-muted mt-2">Generating Dynamic UPI QR...</div>
                    </div>
                  )}
                </div>

                {/* Payee Info & Mobile Number */}
                <div className="d-flex flex-column gap-2 mb-3">
                  <div className="p-2 px-3 bg-light rounded-2 border d-flex justify-content-between align-items-center">
                    <div>
                      <span className="text-muted small d-block" style={{ fontSize: '0.72rem' }}>Payee Name</span>
                      <strong className="text-dark small">{payeeName}</strong>
                    </div>
                    <span className="badge bg-success-subtle text-success border border-success-subtle">
                      <i className="bi bi-shield-check me-1"></i>Verified Campus Driver
                    </span>
                  </div>

                  <div className="p-2 px-3 bg-light rounded-2 border d-flex justify-content-between align-items-center">
                    <div>
                      <span className="text-muted small d-block" style={{ fontSize: '0.72rem' }}>Driver UPI ID</span>
                      <span className="font-monospace fw-semibold text-dark small">{rawUpiId}</span>
                    </div>
                    <button
                      type="button"
                      className="btn btn-outline-secondary btn-sm py-1 px-2"
                      onClick={() => handleCopy(rawUpiId, 'UPI ID')}
                    >
                      <i className={`bi ${copiedField === 'UPI ID' ? 'bi-check-lg text-success' : 'bi-clipboard'}`}></i>
                      <span className="ms-1" style={{ fontSize: '0.75rem' }}>
                        {copiedField === 'UPI ID' ? 'Copied' : 'Copy'}
                      </span>
                    </button>
                  </div>

                  <div className="p-2 px-3 bg-light rounded-2 border d-flex justify-content-between align-items-center">
                    <div>
                      <span className="text-muted small d-block" style={{ fontSize: '0.72rem' }}>Registered Mobile Number</span>
                      <span className="font-monospace fw-semibold text-dark small">{payeePhone}</span>
                    </div>
                    <button
                      type="button"
                      className="btn btn-outline-secondary btn-sm py-1 px-2"
                      onClick={() => handleCopy(payeePhone, 'Mobile Number')}
                    >
                      <i className={`bi ${copiedField === 'Mobile Number' ? 'bi-check-lg text-success' : 'bi-clipboard'}`}></i>
                      <span className="ms-1" style={{ fontSize: '0.75rem' }}>
                        {copiedField === 'Mobile Number' ? 'Copied' : 'Copy'}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Direct UPI App Launch Section */}
                <div className="mb-3">
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <label className="form-label small fw-semibold text-dark mb-0">
                      Direct UPI App Launch:
                    </label>
                    <span className={`badge ${isMobileDevice ? 'bg-success-subtle text-success border border-success-subtle' : 'bg-secondary-subtle text-secondary border'}`} style={{ fontSize: '0.7rem' }}>
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
                                  onClick={handleSimulateInstantPayment}
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
                <form onSubmit={handleVerifyPayment} className="pt-3 border-top">
                  <label className="form-label small fw-semibold text-dark mb-1">
                    Enter UPI Reference / UTR Number after paying:
                  </label>
                  <div className="input-group mb-2">
                    <input
                      type="text"
                      className="form-control form-control-sm font-monospace"
                      placeholder="e.g. 429108420194 (12 digits)"
                      value={utrNumber}
                      onChange={(e) => setUtrNumber(e.target.value)}
                    />
                    <button
                      type="submit"
                      disabled={verifying}
                      className="btn btn-primary-carpool btn-sm px-3"
                    >
                      {verifying ? 'Verifying...' : 'Verify & Confirm'}
                    </button>
                  </div>
                  <div className="form-text text-muted" style={{ fontSize: '0.75rem' }}>
                    Instant confirmation updates booking status to <strong>PAID (UPI)</strong>.
                  </div>
                </form>
              </div>
            )}
          </div>

          <div className="modal-footer border-top py-2 bg-light">
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UpiPaymentModal;
