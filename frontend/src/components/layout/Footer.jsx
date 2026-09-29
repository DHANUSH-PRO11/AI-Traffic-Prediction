import React from 'react';
import { Zap, ShieldCheck, GitBranch, Heart } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-slate-800/80 bg-slate-900/50 backdrop-blur-sm px-6 py-4 text-xs text-slate-400">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center space-x-2">
          <Zap className="w-3.5 h-3.5 text-emerald-400" />
          <span className="font-semibold text-white">AI Traffic Prediction & Route Optimization</span>
          <span className="text-slate-500">•</span>
          <span className="text-[11px] text-emerald-400 font-mono">v1.0 Production</span>
        </div>

        <div className="flex items-center space-x-6 text-[11px]">
          <Link to="/map" className="hover:text-emerald-300 transition-colors">
            Map
          </Link>
          <Link to="/predict" className="hover:text-emerald-300 transition-colors">
            Predictor
          </Link>
          <Link to="/analytics" className="hover:text-emerald-300 transition-colors">
            Analytics
          </Link>
          <Link to="/model" className="hover:text-emerald-300 transition-colors">
            ML Model
          </Link>
          <span className="text-slate-500">|</span>
          <span className="flex items-center gap-1 text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            PostGIS & Graph Active
          </span>
        </div>
      </div>
    </footer>
  );
}
