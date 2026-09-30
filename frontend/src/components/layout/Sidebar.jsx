import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Map, 
  Cpu, 
  BarChart3, 
  History, 
  Binary, 
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
];

export default function Sidebar() {
  return (
    <aside className="w-64 bg-white border-r border-neutral-200 flex flex-col justify-between shrink-0 z-20 shadow-xs">
      <div>
        {/* Brand Logo in Light Green & White */}
        <div className="p-5 border-b border-neutral-200 flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-emerald-400 flex items-center justify-center shadow-md shadow-emerald-600/20 text-white font-bold">
            <Zap className="w-5 h-5 fill-white" />
          </div>
          <div>
            <h1 className="font-bold text-base leading-tight tracking-tight text-neutral-900 flex items-center gap-1.5">
              Traffic<span className="text-emerald-600">AI</span>
              <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold border border-emerald-300">
                PRO
              </span>
            </h1>
            <p className="text-xs text-neutral-500">Route Optimization</p>
          </div>
        </div>

        {/* Navigation links */}
        <nav className="p-3 space-y-1">
          <div className="px-3 py-2 text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
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
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold shadow-xs' 
                    : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'}
                `}
              >
                {({ isActive }) => (
                  <>
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-emerald-600' : 'text-neutral-400'}`} />
                    <span>{item.label}</span>
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* System Engine Health Card */}
      <div className="p-4 m-3 rounded-xl bg-neutral-50 border border-neutral-200">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-bold text-neutral-800 flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
            Routing Engine
          </span>
          <span className="text-[10px] font-bold font-mono text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300">
            Online
          </span>
        </div>
        <p className="text-[11px] text-neutral-500 leading-relaxed">
          Dijkstra & A* graph solver active with real-time ML edge weights.
        </p>
      </div>
    </aside>
  );
}
