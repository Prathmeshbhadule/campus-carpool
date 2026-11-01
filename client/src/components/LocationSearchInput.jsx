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
  const [liveResults, setLiveResults] = useState([]);
  const [isSearchingLive, setIsSearchingLive] = useState(false);

  const containerRef = useRef(null);
  const inputWrapperRef = useRef(null);
  const dropdownRef = useRef(null);

  // Sync external value
  useEffect(() => {
    setQuery(value);
  }, [value]);

  // Real-world live location search with OpenStreetMap / Photon geocoding (biased to Pune/Alandi)
  useEffect(() => {
    if (!query || query.trim().length < 2) {
      setLiveResults([]);
      setIsSearchingLive(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingLive(true);
      try {
        const cleanQuery = query.trim();
        const res = await fetch(
          `https://photon.komoot.io/api/?q=${encodeURIComponent(cleanQuery)}&lat=18.6756&lon=73.8906&limit=6`
        );
        if (res.ok) {
          const data = await res.json();
          if (data && Array.isArray(data.features)) {
            const parsed = data.features.map((f) => {
              const p = f.properties || {};
              const name = p.name || p.street || cleanQuery;
              const street = p.street || '';
              const district = p.district || p.locality || p.suburb || '';
              const city = p.city || p.town || p.county || 'Pune';
              const subtitle = [street, district, city].filter(Boolean).join(', ');
              const lat = f.geometry?.coordinates?.[1] || 18.6756;
              const lng = f.geometry?.coordinates?.[0] || 73.8906;

              // Distance to MITAOE Alandi (18.6756, 73.8906)
              const dLat = ((lat - 18.6756) * Math.PI) / 180;
              const dLon = ((lng - 73.8906) * Math.PI) / 180;
              const a =
                Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos((18.6756 * Math.PI) / 180) *
                  Math.cos((lat * Math.PI) / 180) *
                  Math.sin(dLon / 2) *
                  Math.sin(dLon / 2);
              const dist = parseFloat((6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(1));

              return {
                name,
                locality: district || city || 'Pune',
                subtitle: subtitle || `${city}, Maharashtra`,
                address: `${name}, ${subtitle}`,
                coordinates: [lat, lng],
                distanceKm: dist,
                isLive: true
              };
            });
            setLiveResults(parsed);
          }
        }
      } catch {
        // Silently continue with local suggestions
      } finally {
        setIsSearchingLive(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

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

  // Filter localities based on query with intelligent multi-token ranking
  const suggestions = useMemo(() => {
    if (!Array.isArray(localities) || localities.length === 0) return [];
    if (!query || query.trim().length === 0) {
      // Default to top 6 popular spots
      return localities.slice(0, 6);
    }
    const q = query.toLowerCase().trim();

    // 1. Direct continuous substring match
    const directMatches = localities.filter(
      (loc) =>
        loc.name?.toLowerCase().includes(q) ||
        loc.locality?.toLowerCase().includes(q) ||
        loc.subtitle?.toLowerCase().includes(q) ||
        loc.address?.toLowerCase().includes(q)
    );

    if (directMatches.length > 0) {
      return directMatches.slice(0, 8);
    }

    // 2. Multi-word token match (e.g. "dehu phata alandi" matches locations containing "dehu", "phata", or "alandi")
    const words = q.split(/[\s,/-]+/).filter((w) => w.length >= 2);
    if (words.length === 0) return [];

    const scored = [];
    for (const loc of localities) {
      const searchTarget = `${loc.name} ${loc.locality} ${loc.subtitle || ''} ${loc.address || ''}`.toLowerCase();
      let matchCount = 0;
      for (const w of words) {
        if (searchTarget.includes(w)) {
          matchCount++;
        }
      }
      if (matchCount > 0) {
        scored.push({ loc, matchCount });
      }
    }

    scored.sort((a, b) => b.matchCount - a.matchCount);
    return scored.map((item) => item.loc).slice(0, 8);
  }, [localities, query]);

  // Merge instant local dataset matches + real-world live geocoded results
  const combinedSuggestions = useMemo(() => {
    const list = [...suggestions];
    for (const live of liveResults) {
      if (!list.some((s) => s.name?.toLowerCase() === live.name?.toLowerCase())) {
        list.push(live);
      }
    }
    return list;
  }, [suggestions, liveResults]);

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
              <span className="small text-muted fw-bold text-uppercase d-flex align-items-center gap-1" style={{ fontSize: '0.72rem' }}>
                {query.trim().length === 0 ? 'Suggested Locations' : `Matches for "${query}"`}
                {isSearchingLive && <span className="spinner-border spinner-border-sm text-primary ms-1" style={{ width: '0.75rem', height: '0.75rem' }}></span>}
              </span>
              <span className="badge bg-secondary-subtle text-secondary" style={{ fontSize: '0.68rem' }}>
                {combinedSuggestions.length} places
              </span>
            </div>

            {combinedSuggestions.length > 0 ? (
              <div className="list-group list-group-flush">
                {combinedSuggestions.map((loc, idx) => (
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
                        <i className={loc.isLive ? 'bi bi-geo-alt-fill fs-6 text-success' : idx < 2 && !query ? 'bi bi-clock-history fs-6' : 'bi bi-geo-alt-fill fs-6 text-primary'}></i>
                      </div>
                      <div className="overflow-hidden">
                        <div className="fw-semibold text-dark text-truncate d-flex align-items-center gap-2" style={{ fontSize: '0.92rem' }}>
                          <span>{loc.name}</span>
                          {loc.isLive && (
                            <span className="badge bg-success-subtle text-success border border-success-subtle" style={{ fontSize: '0.62rem' }}>
                              Real Map
                            </span>
                          )}
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

                {query.trim().length > 0 && (
                  <button
                    type="button"
                    className="list-group-item list-group-item-action border-top py-2 px-3 d-flex align-items-center gap-3 bg-light text-primary"
                    onClick={() =>
                      handleSelectSuggestion({
                        name: query.trim(),
                        locality: 'Pune Region',
                        subtitle: 'Custom Pickup / Drop Spot',
                        coordinates: [18.6756, 73.8906]
                      })
                    }
                  >
                    <div
                      className="rounded-circle bg-primary-subtle text-primary d-flex align-items-center justify-content-center flex-shrink-0"
                      style={{ width: '36px', height: '36px' }}
                    >
                      <i className="bi bi-geo-fill"></i>
                    </div>
                    <div className="overflow-hidden">
                      <div className="fw-semibold text-dark text-truncate" style={{ fontSize: '0.88rem' }}>
                        Use "<strong>{query.trim()}</strong>"
                      </div>
                      <div className="text-muted small" style={{ fontSize: '0.74rem' }}>
                        Select as custom landmark or pickup spot
                      </div>
                    </div>
                  </button>
                )}
              </div>
            ) : (
              <div className="p-3 text-center text-muted small">
                <i className="bi bi-geo-alt text-muted d-block fs-4 mb-1"></i>
                No exact campus corridor found for "<strong>{query}</strong>".
                {query.trim().length > 0 && (
                  <div className="mt-2">
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-primary"
                      onClick={() =>
                        handleSelectSuggestion({
                          name: query.trim(),
                          locality: 'Pune Region',
                          subtitle: 'Custom Pickup / Drop Spot',
                          coordinates: [18.6756, 73.8906]
                        })
                      }
                    >
                      Use "{query.trim()}" as custom location
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>,
          document.body
        )}
    </div>
  );
};

export default LocationSearchInput;
