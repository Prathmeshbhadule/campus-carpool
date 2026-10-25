import React from 'react';

export const LoadingSkeleton = ({ count = 3, type = 'card' }) => {
  return (
    <div className="d-flex flex-column gap-3 w-100" role="status" aria-label="Loading content">
      {Array.from({ length: count }).map((_, idx) => (
        <div key={idx} className="card card-carpool p-4 border-0">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div className="skeleton-box" style={{ width: '40%', height: '20px' }}></div>
            <div className="skeleton-box" style={{ width: '80px', height: '24px', borderRadius: '12px' }}></div>
          </div>
          <div className="skeleton-box mb-2" style={{ width: '70%', height: '16px' }}></div>
          <div className="skeleton-box mb-3" style={{ width: '50%', height: '14px' }}></div>
          <div className="d-flex justify-content-between align-items-center pt-2 border-top">
            <div className="d-flex align-items-center gap-2">
              <div className="skeleton-box rounded-circle" style={{ width: '36px', height: '36px' }}></div>
              <div className="skeleton-box" style={{ width: '100px', height: '14px' }}></div>
            </div>
            <div className="skeleton-box" style={{ width: '90px', height: '32px' }}></div>
          </div>
        </div>
      ))}
    </div>
  );
};

export const TableSkeleton = ({ rows = 4, cols = 5 }) => {
  return (
    <div className="table-responsive w-100" role="status" aria-label="Loading table">
      <table className="table align-middle">
        <thead>
          <tr>
            {Array.from({ length: cols }).map((_, c) => (
              <th key={c}>
                <div className="skeleton-box" style={{ width: '80%', height: '16px' }}></div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, r) => (
            <tr key={r}>
              {Array.from({ length: cols }).map((_, c) => (
                <td key={c}>
                  <div className="skeleton-box" style={{ width: '90%', height: '16px' }}></div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
