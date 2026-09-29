import React from 'react';
import { Zap, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-neutral-200 bg-white px-6 py-4 text-xs text-neutral-500">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center space-x-2">
          <Zap className="w-3.5 h-3.5 text-emerald-600" />
          <span className="font-bold text-neutral-800">AI Traffic Prediction & Route Optimization</span>
          <span className="text-neutral-300">•</span>
          <span className="text-[11px] text-emerald-700 font-bold font-mono">v1.0 Production</span>
        </div>

        <div className="flex items-center space-x-6 text-[11px]">
          <Link to="/map" className="hover:text-emerald-600 font-medium transition-colors">
            Map
          </Link>
          <Link to="/predict" className="hover:text-emerald-600 font-medium transition-colors">
            Predictor
          </Link>
          <Link to="/analytics" className="hover:text-emerald-600 font-medium transition-colors">
            Analytics
          </Link>
          <Link to="/model" className="hover:text-emerald-600 font-medium transition-colors">
            ML Model
          </Link>
          <span className="text-neutral-300">|</span>
          <span className="flex items-center gap-1 text-neutral-500">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            Graph Solver Active
          </span>
        </div>
      </div>
    </footer>
  );
}
