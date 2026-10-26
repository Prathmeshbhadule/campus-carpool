import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import apiClient from '../api/client';

// Fix default Leaflet icon paths in Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
});

// Tile Providers
const TILE_PROVIDERS = {
  googleRoadmap: {
    name: 'Google Maps (Streets)',
    url: 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
    attribution: '&copy; Google Maps'
  },
  googleSatellite: {
    name: 'Google Hybrid (Satellite)',
    url: 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
    attribution: '&copy; Google Maps Satellite'
  },
  osm: {
    name: 'OpenStreetMap',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors'
  }
};

export const MapView = ({
  origin,
  destination,
  viaRoute = [],
  rideId,
  isDriver = false,
  vehicleType = 'car',
  height = '420px',
  showTrackerControls = true
}) => {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const tileLayerRef = useRef(null);
  const liveVehicleMarkerRef = useRef(null);
  const pulseCircleRef = useRef(null);
  const simulationTimerRef = useRef(null);
  const geoWatchIdRef = useRef(null);

  const [activeProvider, setActiveProvider] = useState('googleRoadmap');
  const [mapError, setMapError] = useState(false);
  const [isLiveTracking, setIsLiveTracking] = useState(false);
  const [trackingMode, setTrackingMode] = useState('none'); // 'real' | 'simulated' | 'none'

  // Live Telemetry HUD state
  const [telemetry, setTelemetry] = useState({
    lat: null,
    lng: null,
    speed: 0,
    heading: 0,
    etaMinutes: 18,
    distanceRemainingKm: 14.5,
    currentMilestone: 'Departed Pickup Spot'
  });

  const originCoords = origin?.coordinates && origin.coordinates.length === 2 && !isNaN(parseFloat(origin.coordinates[0])) && !isNaN(parseFloat(origin.coordinates[1]))
    ? [parseFloat(origin.coordinates[0]), parseFloat(origin.coordinates[1])]
    : [18.5987, 73.7629]; // Default Wakad

  const destCoords = destination?.coordinates && destination.coordinates.length === 2 && !isNaN(parseFloat(destination.coordinates[0])) && !isNaN(parseFloat(destination.coordinates[1]))
    ? [parseFloat(destination.coordinates[0]), parseFloat(destination.coordinates[1])]
    : [18.6756, 73.8906]; // MITAOE Alandi

  // Calculate straight-line distance
  const calcDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return parseFloat((R * c).toFixed(1));
  };

  // Switch Tile Provider
  const setTileLayer = useCallback((providerKey, map) => {
    if (!map) return;
    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }
    const provider = TILE_PROVIDERS[providerKey] || TILE_PROVIDERS.googleRoadmap;
    const newLayer = L.tileLayer(provider.url, {
      attribution: provider.attribution,
      maxZoom: 20
    }).addTo(map);
    tileLayerRef.current = newLayer;
    setActiveProvider(providerKey);
  }, []);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    try {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      // CRITICAL LEAFLET FIX:
      // Clear container internal leaflet ID so React remounts never throw "Map container is already initialized"
      if (mapContainerRef.current._leaflet_id) {
        delete mapContainerRef.current._leaflet_id;
      }

      const map = L.map(mapContainerRef.current, {
        scrollWheelZoom: false,
        zoomControl: true
      }).setView(destCoords, 12);

      setTileLayer(activeProvider, map);

      // Custom Pickup Marker (Green)
      const pickupIcon = L.divIcon({
        className: 'custom-map-marker',
        html: `<div style="background-color: #059669; color: white; width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 6px rgba(0,0,0,0.3); border: 2px solid white;"><i class="bi bi-geo-alt-fill" style="font-size: 16px;"></i></div>`,
        iconSize: [34, 34],
        iconAnchor: [17, 34]
      });

      L.marker(originCoords, { icon: pickupIcon })
        .addTo(map)
        .bindPopup(`<b>Pickup:</b> ${origin?.name || origin?.locality || 'Origin Pickup'}`);

      // Custom Destination Marker (Blue - MITAOE Alandi)
      const dropIcon = L.divIcon({
        className: 'custom-map-marker',
        html: `<div style="background-color: #1d4ed8; color: white; width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 6px rgba(0,0,0,0.3); border: 2px solid white;"><i class="bi bi-mortarboard-fill" style="font-size: 16px;"></i></div>`,
        iconSize: [34, 34],
        iconAnchor: [17, 34]
      });

      L.marker(destCoords, { icon: dropIcon })
        .addTo(map)
        .bindPopup(`<b>Campus Destination:</b> ${destination?.name || destination?.locality || 'MITAOE Alandi Campus'}`);

      // Intermediate Waypoints (if specified)
      if (Array.isArray(viaRoute) && viaRoute.length > 0) {
        const waypointsCount = viaRoute.length;
        viaRoute.forEach((stop, idx) => {
          if (!stop) return;
          // Interpolate coordinate along corridor for visualization
          const ratio = (idx + 1) / (waypointsCount + 1);
          const stopLat = originCoords[0] + (destCoords[0] - originCoords[0]) * ratio;
          const stopLng = originCoords[1] + (destCoords[1] - originCoords[1]) * ratio;

          const viaIcon = L.divIcon({
            className: 'custom-waypoint-marker',
            html: `<div style="background-color: #f59e0b; color: white; width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold; box-shadow: 0 2px 5px rgba(0,0,0,0.25); border: 2px solid white;">${idx + 1}</div>`,
            iconSize: [26, 26],
            iconAnchor: [13, 26]
          });

          L.marker([stopLat, stopLng], { icon: viaIcon })
            .addTo(map)
            .bindPopup(`<b>Via Stop ${idx + 1}:</b> ${stop}`);
        });
      }

      // Route Polyline
      L.polyline([originCoords, destCoords], {
        color: '#1d4ed8',
        weight: 5,
        opacity: 0.85,
        dashArray: '8, 8'
      }).addTo(map);

      // Safe bounds handling (avoids zero-distance zoom NaN in Leaflet)
      const isIdentical =
        Math.abs(originCoords[0] - destCoords[0]) < 0.0001 &&
        Math.abs(originCoords[1] - destCoords[1]) < 0.0001;

      if (isIdentical) {
        map.setView(originCoords, 14);
      } else {
        const bounds = L.latLngBounds([originCoords, destCoords]);
        if (bounds.isValid()) {
          map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
        } else {
          map.setView(destCoords, 12);
        }
      }

      mapInstanceRef.current = map;
      setMapError(false);
    } catch (err) {
      console.warn('[MapView] Map init error:', err);
      setMapError(true);
    }

    return () => {
      if (simulationTimerRef.current) clearInterval(simulationTimerRef.current);
      if (geoWatchIdRef.current) navigator.geolocation.clearWatch(geoWatchIdRef.current);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      if (mapContainerRef.current) {
        delete mapContainerRef.current._leaflet_id;
      }
    };
  }, [origin, destination, viaRoute]);

  // Update Live Moving Vehicle on Map
  const updateVehicleMarker = useCallback((lat, lng, speed, heading, milestone) => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const remaining = calcDistance(lat, lng, destCoords[0], destCoords[1]);
    const estTime = Math.max(1, Math.round((remaining / (Math.max(25, speed) / 60))));

    setTelemetry({
      lat,
      lng,
      speed: Math.round(speed),
      heading: Math.round(heading),
      distanceRemainingKm: remaining,
      etaMinutes: estTime,
      currentMilestone: milestone || 'En Route to MITAOE'
    });

    const vehicleIconHtml = `
      <div style="position: relative; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center;">
        <div style="position: absolute; width: 44px; height: 44px; background: rgba(29, 78, 216, 0.25); border-radius: 50%; animation: pulseRadar 1.5s infinite;"></div>
        <div style="width: 32px; height: 32px; background: #1d4ed8; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 3px 8px rgba(0,0,0,0.4); border: 2px solid white; z-index: 2;">
          <i class="bi ${vehicleType === 'bike' ? 'bi-bicycle' : 'bi-car-front-fill'}" style="font-size: 15px;"></i>
        </div>
      </div>
    `;

    const customVehicleIcon = L.divIcon({
      className: 'live-vehicle-marker',
      html: vehicleIconHtml,
      iconSize: [44, 44],
      iconAnchor: [22, 22]
    });

    if (!liveVehicleMarkerRef.current) {
      liveVehicleMarkerRef.current = L.marker([lat, lng], { icon: customVehicleIcon })
        .addTo(map)
        .bindPopup(`<b>Live Carpool Vehicle</b><br>Speed: ${Math.round(speed)} km/h<br>ETA: ${estTime} mins`);
    } else {
      liveVehicleMarkerRef.current.setLatLng([lat, lng]);
      liveVehicleMarkerRef.current.setIcon(customVehicleIcon);
    }
  }, [destCoords, vehicleType]);

  // Start Real Device GPS Tracking (HTML5 Geolocation API)
  const startRealDeviceGPS = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    if (simulationTimerRef.current) clearInterval(simulationTimerRef.current);
    setIsLiveTracking(true);
    setTrackingMode('real');

    geoWatchIdRef.current = navigator.geolocation.watchPosition(
      async (pos) => {
        const { latitude, longitude, speed, heading } = pos.coords;
        const currentSpeed = speed ? speed * 3.6 : 38; // m/s to km/h, fallback 38 km/h
        updateVehicleMarker(latitude, longitude, currentSpeed, heading || 0, 'Real Device GPS Tracking');

        // Broadcast to server if rideId is present
        if (rideId && isDriver) {
          try {
            await apiClient.patch(`/rides/${rideId}/location`, {
              coordinates: [latitude, longitude],
              speed: currentSpeed,
              heading: heading || 0,
              isLiveTracking: true
            });
          } catch (e) {
            // non-blocking
          }
        }
      },
      (err) => {
        console.warn('Real GPS error:', err.message);
        // Fallback to simulation if user denies permission
        startSimulation();
      },
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 10000 }
    );
  };

  // Start Commute Route Simulation (Evaluator / Presentation Demo Mode)
  const startSimulation = () => {
    if (geoWatchIdRef.current) navigator.geolocation.clearWatch(geoWatchIdRef.current);
    if (simulationTimerRef.current) clearInterval(simulationTimerRef.current);

    setIsLiveTracking(true);
    setTrackingMode('simulated');

    // Generate 12 waypoints between origin and MITAOE Alandi
    const steps = 15;
    const waypoints = [];
    for (let i = 0; i <= steps; i++) {
      const ratio = i / steps;
      const lat = originCoords[0] + (destCoords[0] - originCoords[0]) * ratio;
      const lng = originCoords[1] + (destCoords[1] - originCoords[1]) * ratio;
      waypoints.push([lat, lng]);
    }

    let currentIndex = 0;
    const milestones = [
      'Departed Origin Pickup',
      'Crossing Highway Interchange',
      'Navigating Spine Road Corridor',
      'Approaching Bhosari MIDC',
      'Passing Dighi Magazine Corner',
      'Entering Alandi Road',
      'Approaching MITAOE Campus Main Gate'
    ];

    simulationTimerRef.current = setInterval(() => {
      if (currentIndex >= waypoints.length) {
        currentIndex = 0; // Loop or reach campus
      }

      const [currentLat, currentLng] = waypoints[currentIndex];
      const milestone = milestones[Math.min(milestones.length - 1, Math.floor((currentIndex / waypoints.length) * milestones.length))];
      const simulatedSpeed = 38 + Math.floor(Math.random() * 16); // 38 to 54 km/h

      updateVehicleMarker(currentLat, currentLng, simulatedSpeed, 45, milestone);

      // Pan map smoothly to follow vehicle
      if (mapInstanceRef.current) {
        mapInstanceRef.current.panTo([currentLat, currentLng], { animate: true, duration: 1 });
      }

      // Broadcast if driver
      if (rideId && isDriver) {
        apiClient.patch(`/rides/${rideId}/location`, {
          coordinates: [currentLat, currentLng],
          speed: simulatedSpeed,
          heading: 45,
          isLiveTracking: true
        }).catch(() => {});
      }

      currentIndex++;
    }, 2500);
  };

  const stopTracking = () => {
    if (simulationTimerRef.current) clearInterval(simulationTimerRef.current);
    if (geoWatchIdRef.current) navigator.geolocation.clearWatch(geoWatchIdRef.current);
    setIsLiveTracking(false);
    setTrackingMode('none');
  };

  // Google Maps Deep-Link
  const googleMapsNavUrl = `https://www.google.com/maps/dir/?api=1&origin=${originCoords[0]},${originCoords[1]}&destination=${destCoords[0]},${destCoords[1]}&travelmode=driving`;

  if (mapError) {
    return (
      <div className="d-flex flex-column align-items-center justify-content-center bg-light border rounded p-4 text-center" style={{ height }}>
        <i className="bi bi-map text-secondary fs-1 mb-2"></i>
        <h6 className="fw-semibold text-dark mb-1">Route Map</h6>
        <p className="text-muted small mb-0">{origin?.locality} &rarr; {destination?.locality}</p>
      </div>
    );
  }

  return (
    <div className="position-relative w-100 overflow-hidden rounded-3 border shadow-sm">
      {/* Top Map Toolbar: Tile Provider & Google Maps Navigation */}
      <div
        className="position-absolute top-0 start-0 end-0 p-2 d-flex flex-wrap justify-content-between align-items-center gap-2"
        style={{ zIndex: 1000, background: 'linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0) 100%)' }}
      >
        {/* Layer Selector */}
        <div className="btn-group btn-group-sm bg-white rounded shadow-sm p-1">
          <button
            type="button"
            className={`btn btn-sm ${activeProvider === 'googleRoadmap' ? 'btn-primary' : 'btn-light'}`}
            onClick={() => setTileLayer('googleRoadmap', mapInstanceRef.current)}
          >
            <i className="bi bi-map me-1"></i> Google Streets
          </button>
          <button
            type="button"
            className={`btn btn-sm ${activeProvider === 'googleSatellite' ? 'btn-primary' : 'btn-light'}`}
            onClick={() => setTileLayer('googleSatellite', mapInstanceRef.current)}
          >
            <i className="bi bi-globe-americas me-1"></i> Satellite
          </button>
          <button
            type="button"
            className={`btn btn-sm ${activeProvider === 'osm' ? 'btn-primary' : 'btn-light'}`}
            onClick={() => setTileLayer('osm', mapInstanceRef.current)}
          >
            OSM
          </button>
        </div>

        {/* Google Maps External Navigation Button */}
        <a
          href={googleMapsNavUrl}
          target="_blank"
          rel="noreferrer"
          className="btn btn-sm btn-light shadow-sm text-dark fw-semibold d-flex align-items-center gap-1"
        >
          <i className="bi bi-google text-danger"></i>
          <span>Open in Google Maps</span>
          <i className="bi bi-box-arrow-up-right small ms-1 text-muted"></i>
        </a>
      </div>

      {/* Map Canvas */}
      <div ref={mapContainerRef} style={{ height, width: '100%' }} />

      {/* Live Telemetry HUD Bar (Visible when Live Tracking is active) */}
      {isLiveTracking && (
        <div
          className="position-absolute bottom-0 start-0 end-0 m-2 p-2 px-3 bg-white bg-opacity-95 rounded-3 shadow-lg border d-flex flex-wrap justify-content-between align-items-center gap-3"
          style={{ zIndex: 1000 }}
        >
          <div className="d-flex align-items-center gap-2">
            <span className="badge bg-danger text-uppercase px-2 py-1 d-flex align-items-center gap-1">
              <span className="spinner-grow spinner-grow-sm" style={{ width: '8px', height: '8px' }}></span>
              LIVE GPS ACTIVE
            </span>
            <div className="small fw-semibold text-dark text-truncate" style={{ maxWidth: '220px' }}>
              {telemetry.currentMilestone}
            </div>
          </div>

          <div className="d-flex align-items-center gap-4 text-center">
            <div>
              <div className="fs-6 fw-bold text-primary">{telemetry.speed} km/h</div>
              <div className="text-muted small" style={{ fontSize: '0.7rem' }}>Speed</div>
            </div>
            <div>
              <div className="fs-6 fw-bold text-success">{telemetry.distanceRemainingKm} km</div>
              <div className="text-muted small" style={{ fontSize: '0.7rem' }}>To MITAOE</div>
            </div>
            <div>
              <div className="fs-6 fw-bold text-dark">{telemetry.etaMinutes} mins</div>
              <div className="text-muted small" style={{ fontSize: '0.7rem' }}>Est. ETA</div>
            </div>
          </div>

          <button
            type="button"
            className="btn btn-sm btn-outline-danger"
            onClick={stopTracking}
          >
            Stop GPS
          </button>
        </div>
      )}

      {/* GPS Action Bar (When tracking is off) */}
      {showTrackerControls && !isLiveTracking && (
        <div
          className="position-absolute bottom-0 start-0 m-2 bg-white p-2 rounded-3 shadow-sm border d-flex align-items-center gap-2"
          style={{ zIndex: 1000 }}
        >
          <button
            type="button"
            className="btn btn-sm btn-primary d-flex align-items-center gap-1 shadow-sm"
            onClick={startRealDeviceGPS}
            title="Uses your phone or computer's live hardware GPS"
          >
            <i className="bi bi-geo-alt-fill"></i> Live Device GPS
          </button>
          <button
            type="button"
            className="btn btn-sm btn-outline-primary d-flex align-items-center gap-1"
            onClick={startSimulation}
            title="Demonstrates live car movement along Pune corridor for presentations"
          >
            <i className="bi bi-play-circle"></i> Simulate Commute
          </button>
        </div>
      )}
    </div>
  );
};
