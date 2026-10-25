import React from 'react';
import { Link } from 'react-router-dom';
import { useNotifications } from '../context/NotificationContext';
import { EmptyState } from '../components/EmptyState';

export const Notifications = () => {
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();

  return (
    <div className="container py-4">
      <div className="row justify-content-center">
        <div className="col-lg-8">
          <div className="card card-carpool border-0 shadow-sm p-4">
            <div className="d-flex justify-content-between align-items-center border-bottom pb-3 mb-3">
              <div>
                <h4 className="fw-bold text-dark mb-1 d-flex align-items-center gap-2">
                  <i className="bi bi-bell-fill text-primary"></i> Notifications Center
                </h4>
                <p className="text-muted small mb-0">
                  {unreadCount > 0 ? `You have ${unreadCount} unread notification(s)` : 'All caught up!'}
                </p>
              </div>
              {unreadCount > 0 && (
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm"
                  onClick={markAllRead}
                >
                  <i className="bi bi-check2-all me-1"></i> Mark All as Read
                </button>
              )}
            </div>

            {notifications.length > 0 ? (
              <div className="d-flex flex-column gap-2">
                {notifications.map((n) => {
                  const date = new Date(n.createdAt);
                  return (
                    <div
                      key={n._id}
                      className={`p-3 rounded-3 border transition-fast ${
                        n.read ? 'bg-white' : 'bg-primary-subtle border-primary-subtle'
                      }`}
                    >
                      <div className="d-flex justify-content-between align-items-start mb-1">
                        <div className="d-flex align-items-center gap-2">
                          <i
                            className={`bi ${
                              n.type === 'booking_requested' ? 'bi-person-plus-fill text-warning' :
                              n.type === 'booking_approved' ? 'bi-check-circle-fill text-success' :
                              n.type === 'booking_rejected' ? 'bi-x-circle-fill text-danger' :
                              n.type === 'ride_completed' ? 'bi-flag-fill text-primary' : 'bi-info-circle-fill text-secondary'
                            }`}
                          ></i>
                          <h6 className="fw-bold mb-0 text-dark small">{n.title}</h6>
                        </div>
                        <span className="text-muted" style={{ fontSize: '0.75rem' }}>
                          {date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}{' '}
                          {date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <p className="text-secondary small mb-2">{n.message}</p>

                      <div className="d-flex justify-content-between align-items-center">
                        {n.link ? (
                          <Link
                            to={n.link}
                            onClick={() => !n.read && markRead(n._id)}
                            className="btn btn-link btn-sm p-0 text-primary small text-decoration-none"
                          >
                            Go to details <i className="bi bi-arrow-right"></i>
                          </Link>
                        ) : <span></span>}

                        {!n.read && (
                          <button
                            type="button"
                            onClick={() => markRead(n._id)}
                            className="btn btn-sm btn-link text-muted p-0 text-decoration-none"
                            style={{ fontSize: '0.78rem' }}
                          >
                            Mark read
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState
                icon="bi-bell-slash"
                title="No Notifications"
                description="You do not have any notifications currently. Updates on ride requests and approvals will appear here."
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
