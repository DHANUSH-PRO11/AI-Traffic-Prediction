import React from 'react';
import { getTrafficBadgeClass, getTrafficConfig } from '../../utils/trafficColors';

export function TrafficBadge({ level, pulse = false, size = 'md' }) {
  const conf = getTrafficConfig(level);
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs';

  return (
    <span className={`inline-flex items-center gap-1.5 font-bold rounded-lg border uppercase tracking-wider ${sizeClasses} ${conf.bgClass} ${conf.textClass} ${conf.borderClass}`}>
      {pulse && (
        <span className={`w-1.5 h-1.5 rounded-full ${conf.dotClass} animate-ping shrink-0`} />
      )}
      <span>{conf.shortLabel}</span>
    </span>
  );
}

export function StatusBadge({ label, variant = 'emerald', pulse = false }) {
  const variants = {
    emerald: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    amber: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    red: 'bg-red-500/15 text-red-400 border-red-500/30',
    slate: 'bg-slate-800 text-slate-300 border-slate-700',
    white: 'bg-white/10 text-white border-white/20'
  };

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-semibold border ${variants[variant] || variants.emerald}`}>
      {pulse && <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />}
      <span>{label}</span>
    </span>
  );
}
