import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';

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
  const [coords, setCoords] = useState(null);

  const containerRef = useRef(null);
  const inputWrapperRef = useRef(null);
  const dropdownRef = useRef(null);

  // Sync external value
  useEffect(() => {
    setQuery(value);
  }, [value]);

  // Calculate coordinates relative to viewport for fixed position portal
  const updateCoords = useCallback(() => {
    const el = inputWrapperRef.current || containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return;

    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const placeBelow = spaceBelow >= 200 || spaceBelow >= spaceAbove;

    // Minimum width matches input, but at least 280px, capped at screen width
    const targetWidth = Math.min(Math.max(rect.width, 280), window.innerWidth - 24);
    let left = rect.left;
    if (left + targetWidth > window.innerWidth - 12) {
      left = Math.max(12, window.innerWidth - targetWidth - 12);
    }
    if (left < 12) left = 12;

    const maxHeight = placeBelow
      ? Math.min(300, Math.max(160, spaceBelow - 16))
      : Math.min(300, Math.max(160, spaceAbove - 16));

    const top = placeBelow ? rect.bottom + 4 : Math.max(12, rect.top - maxHeight - 4);

    setCoords({
      top,
      left,
      width: targetWidth,
      maxHeight
    });
  }, []);

  // Update coords whenever dropdown opens, and track scroll/resize
  useEffect(() => {
    if (!isOpen) return;
    updateCoords();

    const handleScrollOrResize = () => {
      updateCoords();
    };

    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isOpen, updateCoords]);

  // Click outside listener to close dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      const inInput = (containerRef.current && containerRef.current.contains(e.target)) ||
                      (inputWrapperRef.current && inputWrapperRef.current.contains(e.target));
      const inDropdown = dropdownRef.current && dropdownRef.current.contains(e.target);
      if (!inInput && !inDropdown) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  // Filter localities based on query
  const suggestions = useMemo(() => {
    if (!Array.isArray(localities) || localities.length === 0) return [];
    if (!query || query.trim().length === 0) {
      // Default to top 6 popular spots
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
    updateCoords();
    if (onChange) onChange(val);
  };

  const handleClear = () => {
    setQuery('');
    setIsOpen(true);
    updateCoords();
    if (onChange) onChange('');
  };

  const handleSelectSuggestion = (loc) => {
    setQuery(loc.name);
    setIsOpen(false);
    if (onSelect) onSelect(loc);
    if (onChange) onChange(loc.name);
  };

  return (
    <div className="location-search-group" ref={containerRef}>
      {label && <label className="form-label small fw-semibold text-secondary mb-1">{label}</label>}

      {/* Input row styled like Uber */}
      <div
        ref={inputWrapperRef}
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
          onClick={() => {
            setIsOpen(true);
            updateCoords();
          }}
          onFocus={() => {
            setIsOpen(true);
            updateCoords();
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setIsOpen(false);
            }
          }}
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

      {/* Floating Uber Suggestions Dropdown via React Portal (Escapes ALL parent CSS stacking contexts) */}
      {isOpen &&
        coords &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={dropdownRef}
            className="bg-white rounded-3 shadow-lg border overflow-hidden"
            style={{
              position: 'fixed',
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              width: `${coords.width}px`,
              maxHeight: `${coords.maxHeight}px`,
              zIndex: 99999999, // Guarantees rendering on top of all ride cards, headers, and modals
              overflowY: 'auto',
              boxShadow: '0 18px 45px rgba(0, 0, 0, 0.32), 0 4px 12px rgba(0, 0, 0, 0.15)'
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
                    style={{ transition: 'background-color 0.15s ease', cursor: 'pointer' }}
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
          </div>,
          document.body
        )}
    </div>
  );
};

export default LocationSearchInput;
