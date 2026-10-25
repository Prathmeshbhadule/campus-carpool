import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import apiClient from '../api/client';
import { RideCard } from '../components/RideCard';
import { RideFilter } from '../components/RideFilter';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { EmptyState } from '../components/EmptyState';

export const Search = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [rides, setRides] = useState([]);
  const [localities, setLocalities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 9, totalPages: 1 });

  // Read URL query params
  const [filters, setFilters] = useState({
    origin: searchParams.get('origin') || '',
    destination: searchParams.get('destination') || '',
    date: searchParams.get('date') || '',
    vehicleType: searchParams.get('vehicleType') || '',
    minSeats: searchParams.get('minSeats') || '',
    maxPrice: searchParams.get('maxPrice') || '',
    sortBy: searchParams.get('sortBy') || 'departureTime',
    page: parseInt(searchParams.get('page') || '1', 10)
  });

  // Fetch localities once for filter suggestions
  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const res = await apiClient.get('/locations/pune');
        setLocalities(res.data || []);
      } catch (e) {
        console.warn('Could not load localities', e);
      }
    };
    fetchLocations();
  }, []);

  const fetchRides = useCallback(async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams();
      if (filters.origin) query.append('origin', filters.origin);
      if (filters.destination) query.append('destination', filters.destination);
      if (filters.date) query.append('date', filters.date);
      if (filters.vehicleType) query.append('vehicleType', filters.vehicleType);
      if (filters.minSeats) query.append('minSeats', filters.minSeats);
      if (filters.maxPrice) query.append('maxPrice', filters.maxPrice);
      if (filters.sortBy) query.append('sortBy', filters.sortBy);
      query.append('page', filters.page || 1);
      query.append('limit', 9);

      setSearchParams(query);

      const res = await apiClient.get(`/rides?${query.toString()}`);
      setRides(res.data || []);
      setMeta(res.meta || { total: 0, page: 1, limit: 9, totalPages: 1 });
    } catch (err) {
      console.error('[Search] Error querying rides:', err);
      setRides([]);
    } finally {
      setLoading(false);
    }
  }, [filters, setSearchParams]);

  useEffect(() => {
    fetchRides();
  }, [fetchRides]);

  const handleFilterChange = (newFilters) => {
    setFilters({ ...newFilters, page: 1 });
  };

  const handleResetFilters = () => {
    setFilters({
      origin: '',
      destination: '',
      date: '',
      vehicleType: '',
      minSeats: '',
      maxPrice: '',
      sortBy: 'departureTime',
      page: 1
    });
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= meta.totalPages) {
      setFilters((prev) => ({ ...prev, page: newPage }));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="container py-4">
      {/* Header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-4 gap-2">
        <div>
          <h3 className="fw-bold text-dark mb-1">Explore Pune/PCMC Campus Rides</h3>
          <p className="text-muted small mb-0">
            Showing {meta.total} active carpools connecting to MITAOE Alandi campus.
          </p>
        </div>
      </div>

      {/* Filter Component */}
      <RideFilter
        filters={filters}
        onChange={handleFilterChange}
        onReset={handleResetFilters}
        localities={localities}
      />

      {/* Ride Results Feed */}
      {loading ? (
        <LoadingSkeleton count={6} />
      ) : rides.length > 0 ? (
        <>
          <div className="row g-4">
            {rides.map((ride) => (
              <div key={ride._id} className="col-lg-4 col-md-6">
                <RideCard ride={ride} />
              </div>
            ))}
          </div>

          {/* Pagination */}
          {meta.totalPages > 1 && (
            <nav className="d-flex justify-content-center mt-5" aria-label="Rides navigation">
              <ul className="pagination shadow-sm">
                <li className={`page-item ${meta.page <= 1 ? 'disabled' : ''}`}>
                  <button
                    className="page-link"
                    onClick={() => handlePageChange(meta.page - 1)}
                    disabled={meta.page <= 1}
                  >
                    Previous
                  </button>
                </li>
                {Array.from({ length: meta.totalPages }).map((_, idx) => (
                  <li key={idx + 1} className={`page-item ${meta.page === idx + 1 ? 'active' : ''}`}>
                    <button className="page-link" onClick={() => handlePageChange(idx + 1)}>
                      {idx + 1}
                    </button>
                  </li>
                ))}
                <li className={`page-item ${meta.page >= meta.totalPages ? 'disabled' : ''}`}>
                  <button
                    className="page-link"
                    onClick={() => handlePageChange(meta.page + 1)}
                    disabled={meta.page >= meta.totalPages}
                  >
                    Next
                  </button>
                </li>
              </ul>
            </nav>
          )}
        </>
      ) : (
        <EmptyState
          icon="bi-geo-alt"
          title="No Rides Matched Your Filter"
          description="We couldn't find active carpools matching your exact criteria. Try broadening your locality or date selection."
          actionText="Clear All Filters"
          onAction={handleResetFilters}
        />
      )}
    </div>
  );
};
