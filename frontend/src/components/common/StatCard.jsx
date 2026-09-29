import React from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

export default function StatCard({
  title,
  label,
  value,
  unit,
  icon: Icon,
  subtitle,
  subtext,
  badge,
  trend,
  trendValue,
  valueColor = 'text-white',
  className = ''
}) {
  const displayTitle = label || title;
  const displaySubtitle = subtext || subtitle;

  return (
    <div className={`glass-panel p-5 rounded-2xl border border-slate-800 flex flex-col justify-between ${className}`}>
      <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
        <span>{displayTitle}</span>
        {Icon && (
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>
      
      <div className="my-3 flex items-baseline gap-2">
        {badge ? (
          badge
        ) : (
          <>
            <span className={`text-3xl font-black font-mono ${valueColor}`}>
              {value}
            </span>
            {unit && <span className="text-xs text-slate-400 font-normal">{unit}</span>}
          </>
        )}
      </div>

      <div className="flex items-center justify-between text-xs text-slate-400">
        {displaySubtitle && (
          <span className="truncate">{displaySubtitle}</span>
        )}
        {trendValue && (
          <span className={`inline-flex items-center gap-0.5 font-semibold text-[11px] shrink-0 ml-1.5 ${
            trend === 'down' ? 'text-red-400' : 'text-emerald-400'
          }`}>
            {trend === 'down' ? <ArrowDownRight className="w-3.5 h-3.5" /> : <ArrowUpRight className="w-3.5 h-3.5" />}
            {trendValue}
          </span>
        )}
      </div>
    </div>
  );
}

export { StatCard };
