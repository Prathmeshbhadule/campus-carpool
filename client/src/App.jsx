import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { ProtectedRoute } from './components/ProtectedRoute';
import { ErrorBoundary } from './components/ErrorBoundary';
import { SplashScreen } from './components/SplashScreen';

// Pages
import { Home } from './pages/Home';
import { Search } from './pages/Search';
import { RideDetails } from './pages/RideDetails';
import { PostRide } from './pages/PostRide';
import { CalculatorPage } from './pages/CalculatorPage';
import { Dashboard } from './pages/Dashboard';
import { Profile } from './pages/Profile';
import { Notifications } from './pages/Notifications';
import { Admin } from './pages/Admin';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { UpiPaymentPage } from './pages/UpiPaymentPage';

export function App() {
  const [showSplash, setShowSplash] = useState(() => {
    return !sessionStorage.getItem('mitaoe_splash_seen');
  });

  useEffect(() => {
    if (showSplash) {
      const timer = setTimeout(() => {
        sessionStorage.setItem('mitaoe_splash_seen', 'true');
        setShowSplash(false);
      }, 1800);
      return () => clearTimeout(timer);
    }
  }, [showSplash]);

  if (showSplash) {
    return <SplashScreen />;
  }

  return (
    <>
      <Navbar />
      <main>
        <ErrorBoundary>
          <Routes>
            {/* Public Authentication Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Protected Routes (Authentication Required for All Commute & Booking Features) */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Home />
                </ProtectedRoute>
              }
            />
            <Route
              path="/search"
              element={
                <ProtectedRoute>
                  <Search />
                </ProtectedRoute>
              }
            />
            <Route
              path="/rides/:id"
              element={
                <ProtectedRoute>
                  <RideDetails />
                </ProtectedRoute>
              }
            />
            <Route
              path="/calculator"
              element={
                <ProtectedRoute>
                  <CalculatorPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/upi-payment"
              element={
                <ProtectedRoute>
                  <UpiPaymentPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/post-ride"
              element={
                <ProtectedRoute>
                  <PostRide />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/notifications"
              element={
                <ProtectedRoute>
                  <Notifications />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute requiredRole="admin">
                  <Admin />
                </ProtectedRoute>
              }
            />

            {/* 404 Fallback */}
            <Route
              path="*"
              element={
                <div className="container py-5 text-center">
                  <div className="p-5 bg-white rounded-4 border shadow-sm mx-auto" style={{ maxWidth: '500px' }}>
                    <h1 className="display-4 fw-bold text-primary mb-2">404</h1>
                    <h4 className="fw-bold text-dark mb-2">Page Not Found</h4>
                    <p className="text-muted small mb-4">
                      The requested route does not exist on MITAOE Campus Carpool.
                    </p>
                    <a href="/" className="btn btn-primary-carpool">
                      Back to Home
                    </a>
                  </div>
                </div>
              }
            />
          </Routes>
        </ErrorBoundary>
      </main>
      <Footer />
    </>
  );
}

export default App;
