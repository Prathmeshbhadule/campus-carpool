import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import apiClient from '../api/client';
import { RideCard } from '../components/RideCard';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { LocationSearchInput } from '../components/LocationSearchInput';
import { DEFAULT_LOCALITIES } from '../utils/localities';

export const Home = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [featuredRides, setFeaturedRides] = useState([]);
  const [localities, setLocalities] = useState(DEFAULT_LOCALITIES);
  const [loading, setLoading] = useState(true);
  const [searchFrom, setSearchFrom] = useState('');
  const [searchTo, setSearchTo] = useState('MITAOE Campus, Alandi');
  const [searchDate, setSearchDate] = useState('');

  useEffect(() => {
    const fetchHomeData = async () => {
      try {
        const [statsRes, ridesRes, locsRes] = await Promise.all([
          apiClient.get('/stats/platform'),
          apiClient.get('/rides?limit=3&sortBy=departureTime&order=asc'),
          apiClient.get('/locations/pune').catch(() => ({ data: [] }))
        ]);
        setStats(statsRes.data);
        setFeaturedRides(ridesRes.data || []);
        setLocalities(locsRes.data || []);
      } catch (err) {
        console.warn('[Home] Failed to load initial platform data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchHomeData();
  }, []);

  const handleHeroSearch = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchFrom.trim()) params.append('origin', searchFrom.trim());
    if (searchTo.trim()) params.append('destination', searchTo.trim());
    if (searchDate) params.append('date', searchDate);
    navigate(`/search?${params.toString()}`);
  };

  return (
    <div>
      {/* Hero Section */}
      <section className="hero-banner" aria-label="Hero search section" style={{ position: 'relative', zIndex: 20, overflow: 'visible' }}>
        <div className="container position-relative" style={{ zIndex: 25, overflow: 'visible' }}>
          <div className="row align-items-center">
            <div className="col-lg-8 mx-auto text-center">
              <span className="badge bg-white text-primary fw-bold text-uppercase px-3 py-2 rounded-pill mb-3 shadow-sm">
                <i className="bi bi-shield-check me-1"></i> Verified Intra-Campus Ridesharing
              </span>
              <h1 className="display-5 fw-bold mb-3 tracking-tight">
                Commute Smart. Share the Fare.
              </h1>
              <p className="lead text-white-50 mb-4" style={{ fontSize: '1.15rem' }}>
                Connecting MITAOE students, faculty, and staff commuting between Pune &amp; PCMC localities and the Alandi campus.
              </p>

              {/* Quick Search Form */}
              <form onSubmit={handleHeroSearch} className="bg-white p-3 p-md-4 rounded-4 shadow-lg text-dark text-start" style={{ position: 'relative', zIndex: 100, overflow: 'visible' }}>
                <div className="row g-3 align-items-end" style={{ overflow: 'visible' }}>
                  <div className="col-md-4 col-sm-6" style={{ position: 'relative', zIndex: 115 }}>
                    <LocationSearchInput
                      label="Pickup Locality"
                      placeholder="e.g. Dehu Phata, Wakad, Hinjawadi"
                      value={searchFrom}
                      iconType="pickup"
                      localities={localities}
                      onChange={(text) => setSearchFrom(text)}
                      onSelect={(loc) => setSearchFrom(loc.locality)}
                    />
                  </div>
                  <div className="col-md-4 col-sm-6" style={{ position: 'relative', zIndex: 110 }}>
                    <LocationSearchInput
                      label="Destination"
                      placeholder="e.g. Pune Station, MITAOE Alandi"
                      value={searchTo}
                      iconType="destination"
                      localities={localities}
                      onChange={(text) => setSearchTo(text)}
                      onSelect={(loc) => setSearchTo(loc.name)}
                    />
                  </div>
                  <div className="col-md-2 col-sm-6">
                    <label className="form-label text-muted small fw-semibold">Travel Date</label>
                    <input
                      type="date"
                      className="form-control"
                      value={searchDate}
                      onChange={(e) => setSearchDate(e.target.value)}
                    />
                  </div>
                  <div className="col-md-2 col-sm-6">
                    <button type="submit" className="btn btn-primary-carpool w-100 py-2 d-flex align-items-center justify-content-center gap-1" style={{ minHeight: '50px' }}>
                      <i className="bi bi-search"></i> Find Rides
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Live Impact Counters */}
      <section className="py-4 bg-white border-bottom shadow-sm" style={{ position: 'relative', zIndex: 1 }}>
        <div className="container">
          <div className="row text-center g-3">
            <div className="col-6 col-md-3">
              <div className="fs-3 fw-bold text-primary">{stats?.activeUsers || '14'}</div>
              <div className="text-muted small fw-medium">Active Campus Users</div>
            </div>
            <div className="col-6 col-md-3">
              <div className="fs-3 fw-bold text-success">₹{stats?.estimatedCostSavedINR?.toLocaleString() || '6,720'}</div>
              <div className="text-muted small fw-medium">Student Fare Saved</div>
            </div>
            <div className="col-6 col-md-3">
              <div className="fs-3 fw-bold text-dark">{stats?.estimatedCo2SavedKg || '64'} kg</div>
              <div className="text-muted small fw-medium">CO₂ Emissions Cut</div>
            </div>
            <div className="col-6 col-md-3">
              <div className="fs-3 fw-bold text-primary">{stats?.totalRidesPublished || '22'}</div>
              <div className="text-muted small fw-medium">Pune/PCMC Routes</div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-5">
        <div className="container">
          <div className="text-center mb-5">
            <h2 className="fw-bold text-dark">How MITAOE Carpool Works</h2>
            <p className="text-muted">A fair, safe, and transparent community commute for everyone on campus.</p>
          </div>

          <div className="row g-4">
            <div className="col-md-3 col-sm-6">
              <div className="card card-carpool h-100 p-4 text-center">
                <div className="rounded-circle bg-primary-subtle text-primary p-3 mx-auto mb-3" style={{ width: '60px', height: '60px' }}>
                  <i className="bi bi-person-check fs-4"></i>
                </div>
                <h5 className="fw-bold mb-2">1. College Verified</h5>
                <p className="text-muted small mb-0">
                  Only accounts with verified @mitaoe.ac.in emails and 12-digit student PRNs can join.
                </p>
              </div>
            </div>

            <div className="col-md-3 col-sm-6">
              <div className="card card-carpool h-100 p-4 text-center">
                <div className="rounded-circle bg-primary-subtle text-primary p-3 mx-auto mb-3" style={{ width: '60px', height: '60px' }}>
                  <i className="bi bi-signpost-2 fs-4"></i>
                </div>
                <h5 className="fw-bold mb-2">2. Drive &amp; Ride (Dual Role)</h5>
                <p className="text-muted small mb-0">
                  Every campus member can act as both a Driver (offer seats) and a Rider (book seats) with a single account.
                </p>
              </div>
            </div>

            <div className="col-md-3 col-sm-6">
              <div className="card card-carpool h-100 p-4 text-center">
                <div className="rounded-circle bg-primary-subtle text-primary p-3 mx-auto mb-3" style={{ width: '60px', height: '60px' }}>
                  <i className="bi bi-wallet2 fs-4"></i>
                </div>
                <h5 className="fw-bold mb-2">3. Honest Settlement</h5>
                <p className="text-muted small mb-0">
                  Split fuel costs fairly with direct cash or UPI at pickup. Drivers mark settlement in 1-click.
                </p>
              </div>
            </div>

            <div className="col-md-3 col-sm-6">
              <div className="card card-carpool h-100 p-4 text-center">
                <div className="rounded-circle bg-primary-subtle text-primary p-3 mx-auto mb-3" style={{ width: '60px', height: '60px' }}>
                  <i className="bi bi-star-half fs-4"></i>
                </div>
                <h5 className="fw-bold mb-2">4. Review &amp; Trust</h5>
                <p className="text-muted small mb-0">
                  Participants rate each other after ride completion, fostering a courteous campus community.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Upcoming Rides */}
      <section className="py-5 bg-white border-top">
        <div className="container">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h3 className="fw-bold text-dark mb-1">Upcoming Campus Rides</h3>
              <p className="text-muted small mb-0">Latest carpools published by fellow students and faculty.</p>
            </div>
            <Link to="/search" className="btn btn-outline-carpool btn-sm">
              View All Rides <i className="bi bi-arrow-right ms-1"></i>
            </Link>
          </div>

          {loading ? (
            <LoadingSkeleton count={3} />
          ) : featuredRides.length > 0 ? (
            <div className="row g-4">
              {featuredRides.map((ride) => (
                <div key={ride._id} className="col-md-4">
                  <RideCard ride={ride} />
                </div>
              ))}
            </div>
          ) : (
            <div className="alert alert-light text-center border p-4">
              No active rides posted currently. Be the first to offer a seat!
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-5 bg-light">
        <div className="container text-center">
          <div className="p-5 bg-white rounded-4 border shadow-sm mx-auto" style={{ maxWidth: '800px' }}>
            <h3 className="fw-bold mb-3">Driving to Campus Tomorrow?</h3>
            <p className="text-muted mb-4">
              Offset your monthly fuel bills and help a classmate commute safely from Wakad, Baner, Kothrud, or Nigdi.
            </p>
            <div className="d-flex justify-content-center gap-3">
              <Link to="/post-ride" className="btn btn-primary-carpool px-4 py-2">
                <i className="bi bi-plus-circle me-1"></i> Offer a Ride
              </Link>
              <Link to="/calculator" className="btn btn-outline-carpool px-4 py-2">
                <i className="bi bi-calculator me-1"></i> Try Fare Estimator
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
