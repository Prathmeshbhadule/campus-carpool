import React from 'react';

export const SplashScreen = () => {
  return (
    <div
      className="d-flex flex-column align-items-center justify-content-center vh-100 vw-100 position-fixed top-0 start-0 bg-white"
      style={{ zIndex: 99999 }}
    >
      <div className="text-center px-4" style={{ maxWidth: '420px' }}>
        {/* Pulsing Animated Brand Logo */}
        <div className="position-relative d-inline-block mb-4">
          <div
            className="rounded-circle shadow-lg d-flex align-items-center justify-content-center p-2 bg-white border border-2 border-warning"
            style={{
              width: '120px',
              height: '120px',
              animation: 'carpoolPulse 1.8s infinite ease-in-out'
            }}
          >
            <img
              src="/logo.png"
              alt="MITAOE Campus Carpool Logo"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain'
              }}
            />
          </div>
        </div>

        {/* Brand Title */}
        <h2 className="fw-bold text-dark mb-1 tracking-tight">MITAOE Carpool</h2>
        <div className="badge bg-primary-subtle text-primary border border-primary-subtle text-uppercase px-3 py-1 mb-3">
          Campus Transit Network
        </div>
        <p className="text-secondary small mb-4">
          Verified intra-campus ride sharing for MIT Academy of Engineering, Alandi.
        </p>

        {/* Subtle loading spinner */}
        <div className="d-flex align-items-center justify-content-center gap-2 text-muted small">
          <div className="spinner-border spinner-border-sm text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <span>Starting secure session...</span>
        </div>
      </div>

      {/* Inline Keyframes for smooth animation */}
      <style>{`
        @keyframes carpoolPulse {
          0% {
            transform: scale(0.95);
            box-shadow: 0 0 0 0 rgba(14, 165, 233, 0.4);
          }
          70% {
            transform: scale(1.05);
            box-shadow: 0 0 0 16px rgba(14, 165, 233, 0);
          }
          100% {
            transform: scale(0.95);
            box-shadow: 0 0 0 0 rgba(14, 165, 233, 0);
          }
        }
      `}</style>
    </div>
  );
};

export default SplashScreen;
