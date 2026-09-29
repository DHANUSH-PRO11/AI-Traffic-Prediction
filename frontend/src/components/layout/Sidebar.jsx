import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Map, 
  Cpu, 
  BarChart3, 
  History, 
  Binary, 
  ShieldAlert, 
  Activity,
  Zap
} from 'lucide-react';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/map', label: 'Live Traffic Map', icon: Map },
  { to: '/predict', label: 'AI Predictor', icon: Cpu },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/trips', label: 'Trip History', icon: History },
  { to: '/model', label: 'ML Model Center', icon: Binary },
  { to: '/admin', label: 'Admin & Simulation', icon: ShieldAlert },
];

export default function Sidebar() {
  return (
    <aside className="w-64 bg-slate-900/90 border-r border-slate-800/80 flex flex-col justify-between shrink-0 z-20 backdrop-blur-md">
      <div>
        {/* Brand Logo in Light Green & White */}
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
          {NAV_ITEMS.map((item) => {
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

      {/* System Engine Health Card */}
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
  );
}
