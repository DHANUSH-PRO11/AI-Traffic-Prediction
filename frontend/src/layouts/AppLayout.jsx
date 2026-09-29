import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Map, 
  Cpu, 
  BarChart3, 
  History, 
  Binary, 
  ShieldAlert, 
  CloudRain, 
  Activity, 
  AlertTriangle,
  RefreshCw,
  Zap
} from 'lucide-react';
import { trafficApi } from '../api/client';

export default function AppLayout() {
  const [trafficSummary, setTrafficSummary] = useState({
    level: 'LOW',
    avgSpeed: 45.2,
    incidents: 0,
    weather: { condition: 'Clear', temperature: 23.5 }
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const location = useLocation();

  const loadStatus = async () => {
    try {
      setIsRefreshing(true);
      const data = await trafficApi.getCurrentTraffic();
      setTrafficSummary({
        level: data.system_traffic_level || 'LOW',
        avgSpeed: data.system_average_speed || 45.2,
        incidents: data.active_incidents_count || 0,
        weather: data.weather || { condition: 'Clear', temperature: 23.5 }
      });
    } catch (err) {
      console.warn("Could not fetch traffic status:", err);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadStatus();
    const interval = setInterval(loadStatus, 25000);
    return () => clearInterval(interval);
  }, []);

  const navItems = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/map', label: 'Live Traffic Map', icon: Map },
    { to: '/predict', label: 'AI Predictor', icon: Cpu },
    { to: '/analytics', label: 'Analytics', icon: BarChart3 },
    { to: '/trips', label: 'Trip History', icon: History },
    { to: '/model', label: 'ML Model Center', icon: Binary },
    { to: '/admin', label: 'Admin & Simulation', icon: ShieldAlert },
  ];

  const getLevelBadgeClass = (lvl) => {
    switch (lvl) {
      case 'SEVERE': return 'bg-red-500/20 text-red-400 border-red-500/40 glow-rose';
      case 'HIGH': return 'bg-orange-500/20 text-orange-400 border-orange-500/40 glow-amber';
      case 'MEDIUM': return 'bg-amber-500/20 text-amber-400 border-amber-500/40 glow-amber';
      default: return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 glow-emerald';
    }
  };

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900/90 border-r border-slate-800/80 flex flex-col justify-between shrink-0 z-20 backdrop-blur-md">
        <div>
          {/* Logo Brand in Light Green & White */}
          <div className="p-5 border-b border-slate-800/80 flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 via-teal-400 to-green-300 flex items-center justify-center shadow-lg shadow-emerald-500/25">
              <Zap className="w-6 h-6 text-slate-950 font-bold" />
            </div>
            <div>
              <h1 className="font-bold text-base leading-tight tracking-tight text-white flex items-center gap-1.5">
                Traffic<span className="text-emerald-400">AI</span>
                <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30">
                  PRO
                </span>
              </h1>
              <p className="text-xs text-slate-400">Dynamic Route Optimizer</p>
            </div>
          </div>

          {/* Navigation links */}
          <nav className="p-3 space-y-1">
            <div className="px-3 py-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Platform Modules
            </div>
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) => `
                    flex items-center space-x-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-150
                    ${isActive 
                      ? 'bg-emerald-500/15 text-white border border-emerald-500/30 shadow-sm font-semibold' 
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'}
                  `}
                >
                  <Icon className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* System Health Card */}
        <div className="p-4 border-t border-slate-800/80 m-3 rounded-xl bg-slate-950/60 border border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-white flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              Routing Engine
            </span>
            <span className="text-[11px] font-mono text-emerald-300 bg-emerald-500/15 px-2 py-0.5 rounded-full border border-emerald-500/30">
              Online
            </span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Dijkstra & A* heuristic active with real-time ML predicted edge weights.
          </p>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="h-16 bg-slate-900/60 border-b border-slate-800/80 flex items-center justify-between px-6 shrink-0 backdrop-blur-md z-10">
          <div className="flex items-center space-x-4">
            <span className="text-xs font-medium text-slate-400 hidden sm:inline">System Status:</span>
            <div className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${getLevelBadgeClass(trafficSummary.level)} flex items-center gap-1.5`}>
              <span className="w-2 h-2 rounded-full bg-current animate-ping" />
              Traffic {trafficSummary.level}
            </div>

            <div className="hidden md:flex items-center space-x-2 text-xs text-slate-300 bg-slate-800/60 px-3 py-1 rounded-lg border border-slate-700/50">
              <span className="text-slate-400">Avg Speed:</span>
              <span className="font-semibold text-emerald-300 font-mono">{trafficSummary.avgSpeed} km/h</span>
            </div>

            {trafficSummary.incidents > 0 && (
              <div className="flex items-center space-x-1.5 text-xs text-red-400 bg-red-500/10 px-3 py-1 rounded-lg border border-red-500/30">
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
              <span className="text-slate-400">•</span>
              <span className="text-white font-medium">{trafficSummary.weather?.temperature || 23.5}°C</span>
            </div>

            {/* Refresh button */}
            <button 
              onClick={loadStatus}
              title="Refresh live traffic data"
              className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-emerald-400' : ''}`} />
            </button>
          </div>
        </header>

        {/* Scrollable Page Outlet */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
