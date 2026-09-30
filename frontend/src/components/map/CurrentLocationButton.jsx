import React from 'react';
import { LocateFixed, Loader2, AlertCircle } from 'lucide-react';

/**
 * CurrentLocationButton
 * Circular floating action button positioned at the bottom-left of the map canvas.
 * Conforms to Google Maps UI standards with touch-friendly dimensions, radar ping,
 * loading spinner state, and descriptive tooltips.
 */
export default function CurrentLocationButton({
  onClick,
  loading = false,
  hasLocation = false,
  error = null,
  accuracy = null,
  className = ''
}) {
  return (
    <div className={`absolute bottom-6 left-6 z-[1000] flex flex-col items-start gap-2 select-none pointer-events-auto ${className}`}>
      <div className="relative group">
        <button
          type="button"
          id="bottom-left-location-fab"
          onClick={onClick}
          disabled={loading}
          aria-label="Locate Me - Current Device Location"
          className={`relative w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center cursor-pointer transition-all duration-300 shadow-xl active:scale-95 border-2 ${
            loading
              ? 'bg-neutral-50 text-sky-600 border-sky-300 ring-4 ring-sky-200/50 cursor-wait'
              : hasLocation
              ? 'bg-white text-blue-600 border-blue-500 ring-4 ring-blue-400/30 hover:bg-blue-50 hover:scale-105 shadow-blue-500/20'
              : error
              ? 'bg-white text-rose-600 border-rose-300 hover:bg-rose-50 hover:scale-105'
              : 'bg-white text-neutral-700 hover:text-blue-600 hover:bg-blue-50 border-neutral-300 hover:border-blue-400 hover:scale-105 shadow-neutral-900/15'
          }`}
          title={
            loading
              ? 'Detecting location...'
              : hasLocation
              ? `Current location active (±${accuracy ? Math.round(accuracy) + 'm' : 'GPS'}) — Click to re-center`
              : error
              ? `${error} — Click to retry`
              : 'Locate Me — Detect device location'
          }
        >
          {/* Subtle radar wave when location active and idle */}
          {hasLocation && !loading && (
            <span className="absolute inset-0 rounded-full bg-blue-400 opacity-25 animate-ping pointer-events-none" />
          )}

          {/* Icon state switcher */}
          <div className="relative flex items-center justify-center">
            {loading ? (
              <Loader2 className="w-6 h-6 md:w-7 md:h-7 animate-spin text-sky-600" />
            ) : error ? (
              <AlertCircle className="w-6 h-6 md:w-7 md:h-7 text-rose-500" />
            ) : (
              <>
                <LocateFixed className={`w-6 h-6 md:w-7 md:h-7 transition-transform group-hover:scale-110 duration-200 ${
                  hasLocation ? 'text-blue-600' : 'text-neutral-700 group-hover:text-blue-600'
                }`} />
                {hasLocation && (
                  <span className="absolute w-2 h-2 rounded-full bg-blue-600" />
                )}
              </>
            )}
          </div>
        </button>

        {/* Clean floating tooltip on desktop hover */}
        <div className="absolute left-16 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 translate-x-1 group-hover:translate-x-2 whitespace-nowrap bg-neutral-900/90 text-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow-xl backdrop-blur-sm border border-neutral-700 flex items-center gap-1.5 z-50">
          <span className={`w-2 h-2 rounded-full ${
            loading ? 'bg-amber-400 animate-spin' : hasLocation ? 'bg-emerald-400 animate-pulse' : error ? 'bg-rose-400' : 'bg-blue-400'
          }`} />
          <span>
            {loading
              ? 'Detecting location...'
              : hasLocation
              ? `Location Found (±${accuracy ? Math.round(accuracy) + 'm' : 'GPS'})`
              : error
              ? 'Location Unavailable — Retry'
              : 'Locate Me'}
          </span>
        </div>
      </div>
    </div>
  );
}
