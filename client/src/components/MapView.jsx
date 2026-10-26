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
  const simulationTimerRef = useRef(null);
  const geoWatchIdRef = useRef(null);
  const roadGeometryRef = useRef([]);

  const [activeProvider, setActiveProvider] = useState('googleRoadmap');
  const [mapError, setMapError] = useState(false);
  const [isLiveTracking, setIsLiveTracking] = useState(false);
  const [trackingMode, setTrackingMode] = useState('none'); // 'real' | 'simulated' | 'none'
  const [routeSummary, setRouteSummary] = useState({
    distanceKm: null,
    durationMins: null,
    isLoading: true
  });

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
    : [18.7188, 73.7712]; // Default Dehu Phata / Wakad

  const destCoords = destination?.coordinates && destination.coordinates.length === 2 && !isNaN(parseFloat(destination.coordinates[0])) && !isNaN(parseFloat(destination.coordinates[1]))
    ? [parseFloat(destination.coordinates[0]), parseFloat(destination.coordinates[1])]
    : [18.5284, 73.8743]; // Default Pune Station / MITAOE

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

  // Initialize Map & Fetch Actual Road Route from OSRM
  useEffect(() => {
    if (!mapContainerRef.current) return;
    let isCancelled = false;

    const setupMapWithRoadRoute = async () => {
      try {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.remove();
          mapInstanceRef.current = null;
        }

        if (mapContainerRef.current._leaflet_id) {
          delete mapContainerRef.current._leaflet_id;
        }

        const map = L.map(mapContainerRef.current, {
          scrollWheelZoom: false,
          zoomControl: true
        }).setView(originCoords, 12);

        setTileLayer(activeProvider, map);

        // Uber-style Origin Marker: Black circle with white dot
        const originName = origin?.name || origin?.locality || 'Pickup Spot';
        const pickupIcon = L.divIcon({
          className: 'uber-origin-marker',
          html: `
            <div style="background-color: #000000; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(0,0,0,0.35); border: 3px solid #ffffff;">
              <div style="width: 8px; height: 8px; background-color: #ffffff; border-radius: 50%;"></div>
            </div>
          `,
          iconSize: [28, 28],
          iconAnchor: [14, 14]
        });

        const originMarker = L.marker(originCoords, { icon: pickupIcon }).addTo(map);
        originMarker.bindPopup(`<b>Pickup:</b> ${originName}`);
        if (typeof originMarker.openPopup === 'function') originMarker.openPopup();

        // Uber-style Destination Marker: Black square with white inner square
        const destName = destination?.name || destination?.locality || 'Destination';
        const dropIcon = L.divIcon({
          className: 'uber-dest-marker',
          html: `
            <div style="background-color: #000000; width: 28px; height: 28px; border-radius: 4px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(0,0,0,0.35); border: 3px solid #ffffff;">
              <div style="width: 8px; height: 8px; background-color: #ffffff; border-radius: 1px;"></div>
            </div>
          `,
          iconSize: [28, 28],
          iconAnchor: [14, 14]
        });

        const destMarker = L.marker(destCoords, { icon: dropIcon }).addTo(map);
        destMarker.bindPopup(`<b>Destination:</b> ${destName}`);

        // Intermediate Waypoints (if specified)
        if (Array.isArray(viaRoute) && viaRoute.length > 0) {
          const waypointsCount = viaRoute.length;
          viaRoute.forEach((stop, idx) => {
            if (!stop) return;
            const ratio = (idx + 1) / (waypointsCount + 1);
            const stopLat = originCoords[0] + (destCoords[0] - originCoords[0]) * ratio;
            const stopLng = originCoords[1] + (destCoords[1] - originCoords[1]) * ratio;

            const viaIcon = L.divIcon({
              className: 'custom-waypoint-marker',
              html: `
                <div style="background-color: #374151; color: white; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: bold; box-shadow: 0 2px 6px rgba(0,0,0,0.3); border: 2px solid white;">
                  ${idx + 1}
                </div>
              `,
              iconSize: [24, 24],
              iconAnchor: [12, 12]
            });

            L.marker([stopLat, stopLng], { icon: viaIcon })
              .addTo(map)
              .bindPopup(`<b>Via Stop ${idx + 1}:</b> ${stop}`);
          });
        }

        // Fetch actual driving road geometry from OSRM
        let roadPoints = [originCoords, destCoords];
        let fetchedDistance = calcDistance(originCoords[0], originCoords[1], destCoords[0], destCoords[1]);
        let fetchedDuration = Math.max(10, Math.round(fetchedDistance * 1.6));

        try {
          const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${originCoords[1]},${originCoords[0]};${destCoords[1]},${destCoords[0]}?overview=full&geometries=geojson`;
          const res = await fetch(osrmUrl);
          const data = await res.json();

          if (!isCancelled && data.code === 'Ok' && data.routes?.[0]?.geometry?.coordinates?.length > 0) {
            roadPoints = data.routes[0].geometry.coordinates.map(([lng, lat]) => [lat, lng]);
            fetchedDistance = parseFloat((data.routes[0].distance / 1000).toFixed(1));
            fetchedDuration = Math.round(data.routes[0].duration / 60);
          }
        } catch (fetchErr) {
          console.warn('[MapView] OSRM route network unavailable, using direct path fallback:', fetchErr);
        }

        if (isCancelled) return;

        roadGeometryRef.current = roadPoints;
        setRouteSummary({
          distanceKm: fetchedDistance,
          durationMins: fetchedDuration,
          isLoading: false
        });

        // Draw Actual Road Polyline (Solid clean road styling matching Uber)
        L.polyline(roadPoints, {
          color: '#111827',
          weight: 5,
          opacity: 0.95,
          lineJoin: 'round',
          lineCap: 'round'
        }).addTo(map);

        // Fit map bounds smoothly around the entire road path
        const bounds = L.latLngBounds(roadPoints);
        if (bounds.isValid()) {
          map.fitBounds(bounds, { padding: [45, 45], maxZoom: 15 });
        } else {
          map.setView(originCoords, 13);
        }

        mapInstanceRef.current = map;
        setMapError(false);
      } catch (err) {
        console.warn('[MapView] Map init error:', err);
        setMapError(true);
      }
    };

    setupMapWithRoadRoute();

    return () => {
      isCancelled = true;
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
  }, [originCoords[0], originCoords[1], destCoords[0], destCoords[1], viaRoute]);

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
      currentMilestone: milestone || 'En Route to Destination'
    });

    const vehicleIconHtml = `
      <div style="position: relative; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center;">
        <div style="position: absolute; width: 44px; height: 44px; background: rgba(17, 24, 39, 0.2); border-radius: 50%; animation: pulseRadar 1.5s infinite;"></div>
        <div style="width: 32px; height: 32px; background: #000000; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(0,0,0,0.4); border: 2px solid white; z-index: 2;">
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
        const currentSpeed = speed ? speed * 3.6 : 38;
        updateVehicleMarker(latitude, longitude, currentSpeed, heading || 0, 'Real Device GPS Tracking');

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
        startSimulation();
      },
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 10000 }
    );
  };

  // Start Actual Road Driving Route Simulation
  const startSimulation = () => {
    if (geoWatchIdRef.current) navigator.geolocation.clearWatch(geoWatchIdRef.current);
    if (simulationTimerRef.current) clearInterval(simulationTimerRef.current);

    setIsLiveTracking(true);
    setTrackingMode('simulated');

    // Use the actual road points fetched from OSRM!
    const fullRoad = roadGeometryRef.current && roadGeometryRef.current.length > 5
      ? roadGeometryRef.current
      : [originCoords, destCoords];

    // Sample ~25-30 realistic milestones along the exact road curvature
    const sampleSize = 30;
    const sampledWaypoints = [];
    const step = Math.max(1, Math.floor(fullRoad.length / sampleSize));
    for (let i = 0; i < fullRoad.length; i += step) {
      sampledWaypoints.push(fullRoad[i]);
    }
    if (sampledWaypoints[sampledWaypoints.length - 1] !== fullRoad[fullRoad.length - 1]) {
      sampledWaypoints.push(fullRoad[fullRoad.length - 1]);
    }

    let currentIndex = 0;
    const milestones = [
      `Departed ${origin?.name || origin?.locality || 'Origin'}`,
      'Navigating Main Arterial Road',
      'Crossing Highway Interchange',
      'Passing Corridor Milestone',
      'Cruising along Main Pune Route',
      `Approaching ${destination?.name || destination?.locality || 'Destination'}`
    ];

    simulationTimerRef.current = setInterval(() => {
      if (currentIndex >= sampledWaypoints.length) {
        currentIndex = 0; // Loop or reach destination
      }

      const [currentLat, currentLng] = sampledWaypoints[currentIndex];
      const milestoneIndex = Math.min(milestones.length - 1, Math.floor((currentIndex / sampledWaypoints.length) * milestones.length));
      const milestone = milestones[milestoneIndex];
      const simulatedSpeed = 38 + Math.floor(Math.random() * 16);

      updateVehicleMarker(currentLat, currentLng, simulatedSpeed, 45, milestone);

      if (mapInstanceRef.current) {
        mapInstanceRef.current.panTo([currentLat, currentLng], { animate: true, duration: 0.8 });
      }

      if (rideId && isDriver) {
        apiClient.patch(`/rides/${rideId}/location`, {
          coordinates: [currentLat, currentLng],
          speed: simulatedSpeed,
          heading: 45,
          isLiveTracking: true
        }).catch(() => {});
      }

      currentIndex++;
    }, 1800);
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
      {/* Top Map Toolbar: Tile Provider & Route Road Summary */}
      <div
        className="position-absolute top-0 start-0 end-0 p-2 d-flex flex-wrap justify-content-between align-items-center gap-2"
        style={{ zIndex: 1000, background: 'linear-gradient(180deg, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0) 100%)' }}
      >
        {/* Layer Selector */}
        <div className="btn-group btn-group-sm bg-white rounded shadow-sm p-1">
          <button
            type="button"
            className={`btn btn-sm ${activeProvider === 'googleRoadmap' ? 'btn-dark' : 'btn-light'}`}
            onClick={() => setTileLayer('googleRoadmap', mapInstanceRef.current)}
          >
            <i className="bi bi-map me-1"></i> Google Streets
          </button>
          <button
            type="button"
            className={`btn btn-sm ${activeProvider === 'googleSatellite' ? 'btn-dark' : 'btn-light'}`}
            onClick={() => setTileLayer('googleSatellite', mapInstanceRef.current)}
          >
            <i className="bi bi-globe-americas me-1"></i> Satellite
          </button>
          <button
            type="button"
            className={`btn btn-sm ${activeProvider === 'osm' ? 'btn-dark' : 'btn-light'}`}
            onClick={() => setTileLayer('osm', mapInstanceRef.current)}
          >
            OSM
          </button>
        </div>

        {/* Real Driving Distance & Duration Badge */}
        {routeSummary.distanceKm && (
          <div className="badge bg-white text-dark shadow-sm px-3 py-2 d-flex align-items-center gap-2 border">
            <i className="bi bi-signpost-2-fill text-primary"></i>
            <span className="fw-bold">{routeSummary.distanceKm} km</span>
            <span className="text-muted">&bull;</span>
            <span className="text-muted">~{routeSummary.durationMins} mins drive</span>
          </div>
        )}

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
              <div className="text-muted small" style={{ fontSize: '0.7rem' }}>Remaining</div>
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
            className="btn btn-sm btn-dark d-flex align-items-center gap-1 shadow-sm"
            onClick={startRealDeviceGPS}
            title="Uses your phone or computer's live hardware GPS"
          >
            <i className="bi bi-geo-alt-fill text-danger"></i> Live Device GPS
          </button>
          <button
            type="button"
            className="btn btn-sm btn-outline-dark d-flex align-items-center gap-1"
            onClick={startSimulation}
            title="Simulates real vehicle navigation along actual Pune road curves for presentations"
          >
            <i className="bi bi-play-circle"></i> Simulate Commute
          </button>
        </div>
      )}
    </div>
  );
};

export default MapView;
