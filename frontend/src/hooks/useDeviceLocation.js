import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Standard device geolocation options as specified:
 * - enableHighAccuracy: true (use GPS hardware when available)
 * - timeout: 10000 (10s timeout)
 * - maximumAge: 0 (never use cached/stale coordinates)
 */
const GEOLOCATION_OPTIONS = {
  enableHighAccuracy: true,
  timeout: 10000,
  maximumAge: 0
};

/**
 * Custom React hook for real-time device-based current location detection and continuous tracking.
 * Strictly relies on the browser's native navigator.geolocation API without any hardcoded coordinates.
 */
export function useDeviceLocation(autoStartTracking = false) {
  const [locationState, setLocationState] = useState({
    latitude: null,
    longitude: null,
    accuracy: null,
    heading: null,
    speed: null,
    timestamp: null
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [errorCode, setErrorCode] = useState(null);
  const [permissionState, setPermissionState] = useState('prompt');
  const [isTracking, setIsTracking] = useState(false);

  const watchIdRef = useRef(null);

  // Map standard GeolocationPositionError to specified user-friendly error messages
  const formatGeolocationError = useCallback((geoError) => {
    if (!geoError) return 'An unknown location error occurred.';
    const code = geoError.code;

    switch (code) {
      case 1: // PERMISSION_DENIED
        return 'Location permission was denied. Please enable location access in your browser/device settings.';
      case 2: // POSITION_UNAVAILABLE
        return 'Unable to determine your current location. Please check GPS/location services.';
      case 3: // TIMEOUT
        return 'Location request timed out. Please try again.';
      default:
        return geoError.message || 'Unable to retrieve your current location.';
    }
  }, []);

  // Update location state and output standardized debug log
  const handlePositionSuccess = useCallback((position) => {
    if (!position || !position.coords) return;

    const { latitude, longitude, accuracy, heading, speed } = position.coords;
    const timestamp = position.timestamp || Date.now();

    // Required Debug Logging format
    console.log(
      `[LOCATION]\n` +
      `Latitude: ${latitude}\n` +
      `Longitude: ${longitude}\n` +
      `Accuracy: ${Math.round(accuracy)}m\n` +
      `Timestamp: ${new Date(timestamp).toISOString()}`
    );

    setLocationState({
      latitude,
      longitude,
      accuracy,
      heading,
      speed,
      timestamp
    });

    setError(null);
    setErrorCode(null);
    setPermissionState('granted');
  }, []);

  // Handle position errors
  const handlePositionError = useCallback((geoError) => {
    const errorMsg = formatGeolocationError(geoError);
    console.warn(`[LOCATION ERROR] Code ${geoError?.code}: ${errorMsg}`);
    setError(errorMsg);
    setErrorCode(geoError?.code || null);
    if (geoError?.code === 1) {
      setPermissionState('denied');
    }
  }, [formatGeolocationError]);

  // Stop continuous location tracking and release watch handle
  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
      setIsTracking(false);
      console.log('[LOCATION] Stopped continuous GPS tracking.');
    }
  }, []);

  // Start continuous location tracking via watchPosition
  const startTracking = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      const unsupportedMsg = 'Your browser does not support location services.';
      setError(unsupportedMsg);
      setErrorCode(-1);
      setPermissionState('unsupported');
      return;
    }

    // Clear any existing watch first
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }

    try {
      const id = navigator.geolocation.watchPosition(
        handlePositionSuccess,
        handlePositionError,
        GEOLOCATION_OPTIONS
      );
      watchIdRef.current = id;
      setIsTracking(true);
      console.log(`[LOCATION] Started continuous GPS tracking with watch ID: ${id}`);
    } catch (err) {
      console.error('[LOCATION] Failed to start watchPosition:', err);
      setError('Failed to initiate live location tracking.');
    }
  }, [handlePositionSuccess, handlePositionError]);

  // Trigger one-time high accuracy location fetch (e.g. on "Locate Me" button click)
  const getCurrentLocation = useCallback(() => {
    return new Promise((resolve, reject) => {
      if (typeof navigator === 'undefined' || !navigator.geolocation) {
        const unsupportedMsg = 'Your browser does not support location services.';
        setError(unsupportedMsg);
        setErrorCode(-1);
        setPermissionState('unsupported');
        reject(new Error(unsupportedMsg));
        return;
      }

      setLoading(true);
      setError(null);

      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLoading(false);
          handlePositionSuccess(position);

          // Automatically establish continuous tracking once initial position is granted
          startTracking();

          resolve(position.coords);
        },
        (geoError) => {
          setLoading(false);
          handlePositionError(geoError);
          reject(geoError);
        },
        GEOLOCATION_OPTIONS
      );
    });
  }, [handlePositionSuccess, handlePositionError, startTracking]);

  // Inspect navigator.permissions if supported by browser
  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: 'geolocation' })
        .then((permissionStatus) => {
          setPermissionState(permissionStatus.state);
          permissionStatus.onchange = () => {
            setPermissionState(permissionStatus.state);
          };
        })
        .catch(() => {
          // Non-critical if permissions API fails
        });
    }
  }, []);

  // Auto-start tracking if requested
  useEffect(() => {
    if (autoStartTracking) {
      startTracking();
    }
  }, [autoStartTracking, startTracking]);

  // Crucial: Clean up watch handle on component unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, []);

  return {
    latitude: locationState.latitude,
    longitude: locationState.longitude,
    accuracy: locationState.accuracy,
    heading: locationState.heading,
    speed: locationState.speed,
    timestamp: locationState.timestamp,
    loading,
    error,
    errorCode,
    permissionState,
    isTracking,
    getCurrentLocation,
    startTracking,
    stopTracking
  };
}
