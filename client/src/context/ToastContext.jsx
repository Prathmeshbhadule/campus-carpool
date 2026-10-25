import React, { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(({ title, message, type = 'info', duration = 4000 }) => {
    const id = Date.now() + Math.random().toString(36).substring(2, 6);
    setToasts((prev) => [...prev, { id, title, message, type }]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, [removeToast]);

  const showSuccess = useCallback((message, title = 'Success') => {
    addToast({ title, message, type: 'success' });
  }, [addToast]);

  const showError = useCallback((message, title = 'Error') => {
    addToast({ title, message, type: 'danger' });
  }, [addToast]);

  const showInfo = useCallback((message, title = 'Notice') => {
    addToast({ title, message, type: 'info' });
  }, [addToast]);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, showSuccess, showError, showInfo }}>
      {children}
      <div className="carpool-toast-container" aria-live="polite">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`toast show border-0 shadow-lg text-white ${
              t.type === 'success' ? 'bg-success' : t.type === 'danger' ? 'bg-danger' : 'bg-primary'
            }`}
            role="alert"
          >
            <div className="toast-header bg-transparent text-white border-0 pb-0 d-flex justify-content-between align-items-center">
              <strong className="me-auto d-flex align-items-center gap-1">
                {t.type === 'success' && <i className="bi bi-check-circle-fill"></i>}
                {t.type === 'danger' && <i className="bi bi-exclamation-triangle-fill"></i>}
                {t.type === 'info' && <i className="bi bi-info-circle-fill"></i>}
                {t.title}
              </strong>
              <button
                type="button"
                className="btn-close btn-close-white ms-2"
                onClick={() => removeToast(t.id)}
                aria-label="Close"
              ></button>
            </div>
            <div className="toast-body pt-1">{t.message}</div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
