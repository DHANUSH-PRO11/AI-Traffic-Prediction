import React from 'react';
import { CloudRain, AlertTriangle, RefreshCw } from 'lucide-react';
import { TrafficBadge } from '../common/Badge';

export default function Navbar({
  trafficSummary,
  isRefreshing,
  onRefresh
}) {
  return (
    <header className="h-16 bg-white border-b border-neutral-200 flex items-center justify-between px-6 shrink-0 shadow-xs z-10">
      <div className="flex items-center space-x-4">
        <span className="text-xs font-semibold text-neutral-500 hidden sm:inline">System Status:</span>
        <TrafficBadge level={trafficSummary.level} pulse={true} />

        <div className="hidden md:flex items-center space-x-2 text-xs text-neutral-700 bg-neutral-50 px-3 py-1.5 rounded-lg border border-neutral-200">
          <span className="text-neutral-500">Avg Network Speed:</span>
          <span className="font-bold text-emerald-600 font-mono">{trafficSummary.avgSpeed} km/h</span>
        </div>

        {trafficSummary.incidents > 0 && (
          <div className="flex items-center space-x-1.5 text-xs text-red-700 bg-red-50 px-3 py-1.5 rounded-lg border border-red-200 font-semibold">
            <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
            <span>{trafficSummary.incidents} Active Incident{trafficSummary.incidents > 1 ? 's' : ''}</span>
          </div>
        )}
      </div>

      <div className="flex items-center space-x-3">
        {/* Weather indicator */}
        <div className="flex items-center space-x-2 text-xs bg-neutral-50 px-3 py-1.5 rounded-lg border border-neutral-200 text-neutral-700">
          <CloudRain className="w-3.5 h-3.5 text-emerald-600" />
          <span className="font-medium">{trafficSummary.weather?.condition || 'Clear'}</span>
          <span className="text-neutral-300">•</span>
          <span className="text-neutral-900 font-bold">{trafficSummary.weather?.temperature || 23.5}°C</span>
        </div>

        {/* Refresh button */}
        <button 
          onClick={onRefresh}
          title="Refresh live traffic data"
          className="p-2 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-600 hover:text-neutral-900 border border-neutral-200 transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-emerald-600' : ''}`} />
        </button>
      </div>
    </header>
  );
}
