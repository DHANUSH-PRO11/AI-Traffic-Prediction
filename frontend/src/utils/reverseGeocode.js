/**
 * Reverse Geocoding Utility
 * Converts latitude and longitude coordinates into a human-readable address/city name.
 * 
 * Supports configurable reverse geocoding provider through VITE_REVERSE_GEOCODE_URL.
 * Defaults to OpenStreetMap Nominatim with memory caching and fallback.
 * NEVER hardcodes any city, state, or coordinates.
 */

// In-memory cache keyed by rounded coordinates to prevent redundant network requests during tracking
const geocodeCache = new Map();

/**
 * Reverse geocodes [lat, lon] to address components.
 * @param {number} lat Latitude
 * @param {number} lon Longitude
 * @returns {Promise<{ fullAddress: string, city: string, state: string, displayName: string }>}
 */
export async function reverseGeocode(lat, lon) {
  if (lat == null || lon == null || isNaN(lat) || isNaN(lon)) {
    return { fullAddress: '', city: '', state: '', displayName: '' };
  }

  // Round to 3 decimal places (~110 meters) for caching efficiency
  const cacheKey = `${lat.toFixed(3)},${lon.toFixed(3)}`;
  if (geocodeCache.has(cacheKey)) {
    return geocodeCache.get(cacheKey);
  }

  const endpoint = import.meta.env.VITE_REVERSE_GEOCODE_URL || 'https://nominatim.openstreetmap.org/reverse';
  const url = `${endpoint}?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&zoom=14&addressdetails=1`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        // Optional custom user-agent header for OSM Nominatim policy
        'X-Requested-With': 'XMLHttpRequest'
      }
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`Reverse geocode HTTP ${res.status}`);
    }

    const data = await res.json();
    const addr = data.address || {};

    // 1. Most specific local / popular name (village, suburb, neighborhood, landmark)
    const popularName = addr.suburb || addr.neighbourhood || addr.village || addr.hamlet || addr.residential || addr.quarter || addr.road || '';

    // 2. Sub-district / Taluk / Town / County
    const subDistrict = addr.town || addr.county || addr.municipality || '';

    // 3. District / Metropolitan Area
    const districtRaw = addr.state_district || addr.district || '';
    const cleanDistrict = districtRaw.replace(/\b(District|City|South|North|East|West|Central|Corporation)\b/gi, '').trim();

    // 4. City: Prioritize explicit city, then cleaned district, then cleaned town/county
    let city = addr.city || '';
    if (!city && cleanDistrict) {
      city = cleanDistrict;
    }
    if (!city && subDistrict) {
      const cleanSub = subDistrict.replace(/\b(District|City|South|North|East|West|Central|Corporation)\b/gi, '').trim();
      city = cleanSub || subDistrict;
    }
    if (!city) {
      city = popularName || 'Local Area';
    }

    const state = addr.state || '';

    // 5. Construct cohesive label ensuring: Popular Name + Sub-area (if unique) + City
    const labelParts = [];
    if (popularName) labelParts.push(popularName);
    if (subDistrict && subDistrict.toLowerCase() !== popularName.toLowerCase() && subDistrict.toLowerCase() !== city.toLowerCase()) {
      labelParts.push(subDistrict);
    }
    if (city && city.toLowerCase() !== popularName.toLowerCase()) {
      labelParts.push(city);
    }

    // Guarantee that city is represented in the display label
    if (city && !labelParts.some(p => p.toLowerCase().includes(city.toLowerCase()))) {
      labelParts.push(city);
    }

    const displayName = labelParts.length > 0
      ? labelParts.join(', ')
      : (data.display_name?.split(',').slice(0, 3).map(s => s.trim()).join(', ') || `${lat.toFixed(4)}, ${lon.toFixed(4)}`);

    const result = {
      fullAddress: data.display_name || displayName,
      city: city,
      popularName: popularName,
      subDistrict: subDistrict,
      district: cleanDistrict || districtRaw,
      state: state,
      displayName: displayName
    };

    geocodeCache.set(cacheKey, result);
    return result;
  } catch (err) {
    // Graceful fallback to formatted coordinate string without crashing
    const fallback = {
      fullAddress: `Coordinates: ${lat.toFixed(4)}, ${lon.toFixed(4)}`,
      city: '',
      state: '',
      displayName: `${lat.toFixed(4)}, ${lon.toFixed(4)}`
    };
    return fallback;
  }
}
