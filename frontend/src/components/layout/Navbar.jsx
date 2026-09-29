import React from 'react';
import { CloudRain, AlertTriangle, RefreshCw } from 'lucide-react';
import { TrafficBadge } from '../common/Badge';

export default function Navbar({
  trafficSummary,
  isRefreshing,
  onRefresh
}) {
  return (
    <header className="h-16 bg-slate-900/60 border-b border-slate-800/80 flex items-center justify-between px-6 shrink-0 backdrop-blur-md z-10">
      <div className="flex items-center space-x-4">
        <span className="text-xs font-medium text-slate-400 hidden sm:inline">System Status:</span>
        <TrafficBadge level={trafficSummary.level} pulse={true} />

        <div className="hidden md:flex items-center space-x-2 text-xs text-slate-300 bg-slate-800/60 px-3 py-1.5 rounded-lg border border-slate-700/50">
          <span className="text-slate-400">Avg Speed:</span>
          <span className="font-semibold text-emerald-300 font-mono">{trafficSummary.avgSpeed} km/h</span>
        </div>

        {trafficSummary.incidents > 0 && (
          <div className="flex items-center space-x-1.5 text-xs text-red-400 bg-red-500/10 px-3 py-1.5 rounded-lg border border-red-500/30">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>{trafficSummary.incidents} Active Incident{trafficSummary.incidents > 1 ? 's' : ''}</span>
          </div>
        )}
      </div>

      <div className="flex items-center space-x-3">
        {/* Weather indicator */}
        <div className="flex items-center space-x-2 text-xs bg-slate-800/60 px-3 py-1.5 rounded-lg border border-slate-700/50 text-slate-300">
          <CloudRain className="w-3.5 h-3.5 text-emerald-400" />
          <span>{trafficSummary.weather?.condition || 'Clear'}</span>
          <span className="text-slate-500">•</span>
          <span className="text-white font-medium">{trafficSummary.weather?.temperature || 23.5}°C</span>
        </div>

        {/* Refresh button */}
        <button 
          onClick={onRefresh}
          title="Refresh live traffic data"
          className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-emerald-400' : ''}`} />
        </button>
      </div>
    </header>
  );
}
