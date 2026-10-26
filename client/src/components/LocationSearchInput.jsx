import React, { useState, useRef, useEffect } from 'react';

export const LocationSearchInput = ({
  label,
  placeholder = 'Search location...',
  value = '',
  onChange,
  onSelect,
  iconType = 'pickup', // 'pickup' (circle) | 'destination' (square)
  localities = [],
  error
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const containerRef = useRef(null);

  // Sync external value
  useEffect(() => {
    setQuery(value);
  }, [value]);

  // Click outside listener to close dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter localities based on query
  const suggestions = React.useMemo(() => {
    if (!Array.isArray(localities) || localities.length === 0) return [];
    if (!query || query.trim().length === 0) {
      // Default to top 5 popular spots (MITAOE, Wakad, Dehu Phata, Pune Station, Hinjawadi)
      return localities.slice(0, 6);
    }
    const q = query.toLowerCase().trim();
    return localities.filter(
      (loc) =>
        loc.name?.toLowerCase().includes(q) ||
        loc.locality?.toLowerCase().includes(q) ||
        loc.subtitle?.toLowerCase().includes(q) ||
        loc.address?.toLowerCase().includes(q)
    );
  }, [localities, query]);

  const handleInputChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    setIsOpen(true);
    if (onChange) onChange(val);
  };

  const handleClear = () => {
    setQuery('');
    setIsOpen(true);
    if (onChange) onChange('');
  };

  const handleSelectSuggestion = (loc) => {
    setQuery(loc.name);
    setIsOpen(false);
    if (onSelect) onSelect(loc);
    if (onChange) onChange(loc.name);
  };

  return (
    <div className="location-search-group position-relative" ref={containerRef}>
      {label && <label className="form-label small fw-semibold text-secondary mb-1">{label}</label>}

      {/* Input row styled like Uber */}
      <div
        className={`d-flex align-items-center bg-light rounded-3 px-3 py-2 border transition-all ${
          isOpen ? 'border-dark shadow-sm' : error ? 'border-danger' : 'border-light-subtle'
        }`}
        style={{ minHeight: '50px' }}
      >
        {/* Left icon: Uber-style Circle for pickup or Square for destination */}
        <div className="me-3 d-flex align-items-center justify-content-center" style={{ width: '16px', height: '16px' }}>
          {iconType === 'pickup' ? (
            <div
              style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                backgroundColor: '#111827',
                border: '2px solid #ffffff',
                boxShadow: '0 0 0 1px #111827'
              }}
              title="Pickup Origin"
            />
          ) : (
            <div
              style={{
                width: '12px',
                height: '12px',
                borderRadius: '2px',
                backgroundColor: '#111827',
                border: '2px solid #ffffff',
                boxShadow: '0 0 0 1px #111827'
              }}
              title="Destination"
            />
          )}
        </div>

        {/* Text Input */}
        <input
          type="text"
          className="form-control border-0 bg-transparent p-0 shadow-none text-dark fw-medium"
          style={{ fontSize: '0.95rem' }}
          placeholder={placeholder}
          value={query}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          autoComplete="off"
        />

        {/* Clear Button (X) */}
        {query && (
          <button
            type="button"
            className="btn btn-sm btn-link text-muted p-0 ms-2 text-decoration-none"
            onClick={handleClear}
            aria-label="Clear location input"
          >
            <i className="bi bi-x-circle-fill fs-6"></i>
          </button>
        )}
      </div>

      {error && <div className="form-feedback-error mt-1">{error}</div>}

      {/* Floating Uber Suggestions Dropdown */}
      {isOpen && (
        <div
          className="position-absolute start-0 end-0 bg-white rounded-3 shadow-lg border mt-1 overflow-hidden"
          style={{
            zIndex: 1050,
            maxHeight: '290px',
            overflowY: 'auto'
          }}
        >
          <div className="p-2 border-bottom bg-light d-flex justify-content-between align-items-center">
            <span className="small text-muted fw-bold text-uppercase" style={{ fontSize: '0.72rem' }}>
              {query.trim().length === 0 ? 'Suggested Locations' : `Matches for "${query}"`}
            </span>
            <span className="badge bg-secondary-subtle text-secondary" style={{ fontSize: '0.68rem' }}>
              {suggestions.length} places
            </span>
          </div>

          {suggestions.length > 0 ? (
            <div className="list-group list-group-flush">
              {suggestions.map((loc, idx) => (
                <button
                  key={idx}
                  type="button"
                  className="list-group-item list-group-item-action border-0 py-2 px-3 d-flex align-items-center justify-content-between text-start"
                  onClick={() => handleSelectSuggestion(loc)}
                  style={{ transition: 'background-color 0.15s ease' }}
                >
                  <div className="d-flex align-items-center gap-3 overflow-hidden">
                    {/* Clock or Map pin icon */}
                    <div
                      className="rounded-circle bg-light d-flex align-items-center justify-content-center text-dark flex-shrink-0"
                      style={{ width: '36px', height: '36px' }}
                    >
                      <i className={idx < 2 && !query ? 'bi bi-clock-history fs-6' : 'bi bi-geo-alt-fill fs-6 text-primary'}></i>
                    </div>
                    <div className="overflow-hidden">
                      <div className="fw-semibold text-dark text-truncate" style={{ fontSize: '0.92rem' }}>
                        {loc.name}
                      </div>
                      <div className="text-muted small text-truncate" style={{ fontSize: '0.78rem' }}>
                        {loc.subtitle || loc.address || `${loc.locality}, Pune/PCMC`}
                      </div>
                    </div>
                  </div>
                  {loc.distanceKm !== undefined && (
                    <span className="badge bg-light text-secondary border flex-shrink-0 ms-2" style={{ fontSize: '0.72rem' }}>
                      {loc.distanceKm === 0 ? 'Campus' : `${loc.distanceKm} km`}
                    </span>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <div className="p-3 text-center text-muted small">
              <i className="bi bi-geo-alt text-muted d-block fs-4 mb-1"></i>
              No exact campus corridor found for "<strong>{query}</strong>".
              <div className="mt-1 text-secondary" style={{ fontSize: '0.75rem' }}>
                You can still use this as your custom pickup or landmark!
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default LocationSearchInput;
