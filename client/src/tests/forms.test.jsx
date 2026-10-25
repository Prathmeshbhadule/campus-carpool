import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { ToastProvider } from '../context/ToastContext';
import { Login } from '../pages/Login';
import { PostRide } from '../pages/PostRide';
import { FareCO2Calculator } from '../components/FareCO2Calculator';

// Mock Leaflet for jsdom environment
vi.mock('leaflet', () => {
  const dummyLayer = { addTo: vi.fn().mockReturnThis(), remove: vi.fn() };
  return {
    default: {
      Icon: {
        Default: {
          prototype: { _getIconUrl: vi.fn() },
          mergeOptions: vi.fn()
        }
      },
      tileLayer: vi.fn().mockReturnValue(dummyLayer),
      marker: vi.fn().mockReturnValue({
        addTo: vi.fn().mockReturnThis(),
        bindPopup: vi.fn().mockReturnThis(),
        setLatLng: vi.fn().mockReturnThis(),
        setIcon: vi.fn().mockReturnThis()
      }),
      divIcon: vi.fn().mockReturnValue({}),
      polyline: vi.fn().mockReturnValue({
        addTo: vi.fn().mockReturnThis()
      }),
      latLngBounds: vi.fn().mockReturnValue({
        isValid: vi.fn().mockReturnValue(true)
      }),
      map: vi.fn().mockReturnValue({
        setView: vi.fn().mockReturnThis(),
        fitBounds: vi.fn().mockReturnThis(),
        remove: vi.fn(),
        removeLayer: vi.fn(),
        panTo: vi.fn()
      })
    }
  };
});

describe('Frontend Form Validation & Calculator Component Tests', () => {
  it('Login form displays inline validation errors when submitting blank inputs', () => {
    render(
      <BrowserRouter>
        <AuthProvider>
          <ToastProvider>
            <Login />
          </ToastProvider>
        </AuthProvider>
      </BrowserRouter>
    );

    // Find submit button and submit empty form
    const submitBtn = screen.getByRole('button', { name: /Sign In/i });
    fireEvent.click(submitBtn);

    // Assert that validation feedback messages appear
    expect(screen.getByText(/College email address is required/i)).toBeDefined();
    expect(screen.getByText(/Password is required/i)).toBeDefined();
  });

  it('Login form validates @mitaoe.ac.in domain', () => {
    render(
      <BrowserRouter>
        <AuthProvider>
          <ToastProvider>
            <Login />
          </ToastProvider>
        </AuthProvider>
      </BrowserRouter>
    );

    const emailInput = screen.getByPlaceholderText(/122100451001@mitaoe.ac.in/i);
    fireEvent.change(emailInput, { target: { value: 'user@gmail.com' } });

    const submitBtn = screen.getByRole('button', { name: /Sign In/i });
    fireEvent.click(submitBtn);

    expect(screen.getByText(/Must be a valid @mitaoe.ac.in address/i)).toBeDefined();
  });

  it('Fare & CO2 Calculator dynamically updates savings when distance changes', () => {
    render(<FareCO2Calculator initialDistance={20} />);

    // Check that initial distance and calculated values render
    expect(screen.getByText(/20 km/i)).toBeDefined();
    expect(screen.getByText(/Fair Carpool Share/i)).toBeDefined();
    expect(screen.getByText(/Solo Cab Benchmark/i)).toBeDefined();
    expect(screen.getByText(/CO₂ Eliminated/i)).toBeDefined();

    // Adjust distance slider to 30 km
    const slider = screen.getByLabelText(/Commute distance in kilometers/i);
    fireEvent.change(slider, { target: { value: '30' } });

    expect(screen.getByText(/30 km/i)).toBeDefined();
  });

  it('PostRide renders Route Map & GPS controls without crashing', () => {
    render(
      <BrowserRouter>
        <AuthProvider>
          <ToastProvider>
            <PostRide />
          </ToastProvider>
        </AuthProvider>
      </BrowserRouter>
    );

    // Verify presence of Publish Ride page elements
    expect(screen.getByText(/Publish a Campus Commute/i)).toBeDefined();
    expect(screen.getByText(/Use My Current GPS/i)).toBeDefined();
    expect(screen.getByText(/Route Map & GPS/i)).toBeDefined();
    expect(screen.getByText(/Popular MITAOE Corridors/i)).toBeDefined();
  });
});
