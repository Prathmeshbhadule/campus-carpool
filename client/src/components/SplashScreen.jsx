import React from 'react';

export const SplashScreen = () => {
  return (
    <div
      className="d-flex flex-column align-items-center justify-content-center vh-100 vw-100 position-fixed top-0 start-0 bg-white"
      style={{ zIndex: 99999, overflow: 'hidden' }}
    >
      {/* Full Screen Logo Container */}
      <div className="w-100 h-100 d-flex flex-column align-items-center justify-content-center p-2 position-relative">
        <img
          src="/logo.png"
          alt="MITAOE Campus Carpool"
          style={{
            width: '100vw',
            height: '82vh',
            maxWidth: '100vw',
            maxHeight: '82vh',
            objectFit: 'contain',
            animation: 'splashScale 2s cubic-bezier(0.16, 1, 0.3, 1) forwards'
          }}
        />

        {/* Bottom Modern Floating Status Bar */}
        <div
          className="position-absolute bottom-0 start-0 end-0 pb-4 text-center d-flex flex-column align-items-center"
          style={{
            background: 'linear-gradient(180deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.95) 45%, #ffffff 100%)'
          }}
        >
          <div className="d-flex align-items-center justify-content-center gap-2 mb-2">
            <span className="badge bg-primary-subtle text-primary border border-primary-subtle px-3 py-1 text-uppercase fw-semibold" style={{ letterSpacing: '0.5px' }}>
              MITAOE Intra-Campus Transit
            </span>
          </div>
          <div className="d-flex align-items-center justify-content-center gap-2 text-secondary small">
            <div className="spinner-border spinner-border-sm text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <span className="fw-medium">Entering campus transit portal...</span>
          </div>
        </div>
      </div>

      {/* Smooth scale animation */}
      <style>{`
        @keyframes splashScale {
          0% {
            transform: scale(0.88);
            opacity: 0.7;
          }
          50% {
            transform: scale(1.02);
            opacity: 1;
          }
          100% {
            transform: scale(1.0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};

export default SplashScreen;
