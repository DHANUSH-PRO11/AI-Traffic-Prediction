import React from 'react';
import { Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import { Navigation2, Radio } from 'lucide-react';

/**
 * Creates a Google Maps-style pulsating blue location dot icon.
 * Includes a pure white border, vivid blue core (#1a73e8), and a subtle animated ping halo.
 */
const createGoogleMapsLocationIcon = () => {
  return L.divIcon({
    className: 'google-maps-current-location',
    html: `
      <div style="position: relative; width: 22px; height: 22px; transform: translate(-50%, -50%); display: flex; align-items: center; justify-content: center;">
        <!-- Soft animated pulse halo -->
        <div style="position: absolute; width: 36px; height: 36px; border-radius: 50%; background: rgba(26, 115, 232, 0.25); animation: pulse 2s infinite ease-out;"></div>
        <!-- Outer white crisp boundary -->
        <div style="position: relative; width: 18px; height: 18px; background: #ffffff; border-radius: 50%; box-shadow: 0 2px 6px rgba(0,0,0,0.35); display: flex; align-items: center; justify-content: center;">
          <!-- Vivid Google Blue inner core -->
          <div style="width: 12px; height: 12px; background: #1a73e8; border-radius: 50%;"></div>
        </div>
      </div>
    `,
    iconSize: [0, 0],
    iconAnchor: [0, 0]
  });
};

const cachedLocationIcon = createGoogleMapsLocationIcon();

/**
 * CurrentLocationMarker
 * Renders the device's real-time position on the Leaflet map with a Google Maps-style blue dot
 * and an accuracy circle corresponding to position.coords.accuracy in meters.
 */
export default function CurrentLocationMarker({
  latitude,
  longitude,
  accuracy,
  locationName,
  isTracking = true,
  draggable = true,
  onDragEnd = null
}) {
  if (latitude == null || longitude == null) return null;

  const validAccuracy = typeof accuracy === 'number' && accuracy > 0 ? Math.min(accuracy, 50000) : 50;

  return (
    <>
      {/* Accuracy Uncertainty Circle representing position.coords.accuracy in meters */}
      <Circle
        center={[latitude, longitude]}
        radius={validAccuracy}
        pathOptions={{
          color: '#1a73e8',
          fillColor: '#60a5fa',
          fillOpacity: 0.14,
          weight: 1.5,
          dashArray: '4, 4'
        }}
      />

      {/* Primary Google Maps-style Blue Dot Marker */}
      <Marker
        position={[latitude, longitude]}
        icon={cachedLocationIcon}
        draggable={draggable}
        eventHandlers={{
          dragend: (e) => {
            if (onDragEnd) {
              const pos = e.target.getLatLng();
              onDragEnd(pos.lat, pos.lng);
            }
          }
        }}
        zIndexOffset={1000}
      >
        <Popup className="current-location-popup">
          <div className="p-1 space-y-1.5 min-w-[180px]">
            {/* Header badge */}
            <div className="flex items-center justify-between border-b border-neutral-100 pb-1">
              <div className="flex items-center gap-1.5 text-blue-600 font-bold text-xs">
                <Navigation2 className="w-3.5 h-3.5 fill-blue-600" />
                <span>Your Current Location</span>
              </div>
              {isTracking && (
                <span className="flex items-center gap-1 text-[10px] text-emerald-600 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-200">
                  <Radio className="w-2.5 h-2.5 animate-pulse" />
                  Live GPS
                </span>
              )}
            </div>

            {/* Resolved address / city if available */}
            {locationName && (
              <div className="text-xs font-semibold text-neutral-800 leading-tight">
                {locationName}
              </div>
            )}

            {/* Coordinates & Accuracy details */}
            <div className="text-[11px] text-neutral-600 space-y-0.5 font-mono pt-0.5">
              <div>Lat: <span className="font-semibold text-neutral-900">{latitude.toFixed(5)}°</span></div>
              <div>Lng: <span className="font-semibold text-neutral-900">{longitude.toFixed(5)}°</span></div>
              {accuracy != null && (
                <div className="text-neutral-500 font-sans text-[10px]">
                  Accuracy: <span className="font-semibold text-neutral-700">±{Math.round(accuracy)} meters</span>
                </div>
              )}
            </div>
          </div>
        </Popup>
      </Marker>
    </>
  );
}
