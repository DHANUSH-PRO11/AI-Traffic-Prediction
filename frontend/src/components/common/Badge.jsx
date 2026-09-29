import React from 'react';
import { getTrafficConfig } from '../../utils/trafficColors';

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

export function StatusBadge({ label, status, variant = 'emerald', pulse = false }) {
  const displayLabel = label || status;
  const variants = {
    emerald: 'bg-emerald-50 text-emerald-800 border-emerald-300',
    amber: 'bg-amber-50 text-amber-800 border-amber-300',
    red: 'bg-red-50 text-red-800 border-red-300',
    slate: 'bg-neutral-100 text-neutral-800 border-neutral-300',
    white: 'bg-white text-neutral-800 border-neutral-300 shadow-2xs'
  };

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-bold border ${variants[variant] || variants.emerald}`}>
      {pulse && <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />}
      <span>{displayLabel}</span>
    </span>
  );
}
