import { PUNE_LOCALITIES } from '../utils/locations.js';
import { successResponse } from '../utils/apiResponse.js';

export const getPuneLocalities = (req, res) => {
  return successResponse(res, 200, 'Pune/PCMC localities retrieved.', PUNE_LOCALITIES);
};

/**
 * Real-world live location search with local Pune/PCMC cache + OpenStreetMap Photon geocoder
 */
export const searchRealLocations = async (req, res, next) => {
  try {
    const q = req.query.q;
    if (!q || !q.trim()) {
      return successResponse(res, 200, 'Locations retrieved.', PUNE_LOCALITIES.slice(0, 10));
    }

    const clean = q.toLowerCase().trim();
    const words = clean.split(/[\s,/-]+/).filter((w) => w.length >= 2);

    // Filter local dataset first (0ms latency)
    const localMatches = PUNE_LOCALITIES.filter((loc) => {
      const target = `${loc.name} ${loc.locality} ${loc.subtitle || ''} ${loc.address || ''}`.toLowerCase();
      return target.includes(clean) || words.some((w) => target.includes(w));
    });

    // Also query live OpenStreetMap / Photon geocoding biased to MITAOE Alandi coordinates (18.6756, 73.8906)
    let liveMatches = [];
    try {
      const response = await fetch(
        `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&lat=18.6756&lon=73.8906&limit=8`,
        { signal: AbortSignal.timeout(3500) }
      );

      if (response.ok) {
        const data = await response.json();
        if (data && Array.isArray(data.features)) {
          liveMatches = data.features.map((f) => {
            const p = f.properties || {};
            const name = p.name || p.street || 'Location';
            const street = p.street || '';
            const district = p.district || p.locality || p.suburb || '';
            const city = p.city || p.town || p.county || 'Pune';
            const subtitle = [street, district, city].filter(Boolean).join(', ');
            const lat = f.geometry?.coordinates?.[1] || 18.6756;
            const lng = f.geometry?.coordinates?.[0] || 73.8906;

            return {
              name,
              locality: district || city || 'Pune',
              subtitle: subtitle || `${city}, Maharashtra`,
              address: `${name}, ${subtitle}`,
              coordinates: [lat, lng],
              isLive: true
            };
          });
        }
      }
    } catch {
      // Fallback silently to local matches
    }

    // Merge matches, deduplicating by lowercased name
    const combined = [...localMatches];
    for (const live of liveMatches) {
      if (!combined.some((c) => c.name.toLowerCase() === live.name.toLowerCase())) {
        combined.push(live);
      }
    }

    return successResponse(res, 200, 'Search completed.', combined.slice(0, 12));
  } catch (error) {
    next(error);
  }
};
