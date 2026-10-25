import React from 'react';
import { Link } from 'react-router-dom';

export const EmptyState = ({
  icon = 'bi-search',
  title = 'No Results Found',
  description = 'Try adjusting your search criteria, dates, or locality filters to discover available rides.',
  actionText,
  actionLink,
  onAction
}) => {
  return (
    <div className="empty-state-card shadow-sm">
      <div className="d-inline-flex align-items-center justify-content-center bg-light text-primary rounded-circle mb-3 p-3">
        <i className={`bi ${icon} fs-1 text-primary`}></i>
      </div>
      <h5 className="fw-bold text-slate-800 mb-2">{title}</h5>
      <p className="text-muted mx-auto mb-4" style={{ maxWidth: '420px', fontSize: '0.92rem' }}>
        {description}
      </p>
      {actionText && actionLink && (
        <Link to={actionLink} className="btn btn-primary-carpool">
          {actionText}
        </Link>
      )}
      {actionText && onAction && !actionLink && (
        <button type="button" onClick={onAction} className="btn btn-primary-carpool">
          {actionText}
        </button>
      )}
    </div>
  );
};
