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
  valueColor = 'text-neutral-900',
  className = ''
}) {
  const displayTitle = label || title;
  const displaySubtitle = subtext || subtitle;

  return (
    <div className={`bg-white p-5 rounded-2xl border border-neutral-200 shadow-xs flex flex-col justify-between ${className}`}>
      <div className="flex items-center justify-between text-neutral-500 text-xs font-semibold">
        <span>{displayTitle}</span>
        {Icon && (
          <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
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
            {unit && <span className="text-xs text-neutral-500 font-medium">{unit}</span>}
          </>
        )}
      </div>

      <div className="flex items-center justify-between text-xs text-neutral-500">
        {displaySubtitle && (
          <span className="truncate">{displaySubtitle}</span>
        )}
        {trendValue && (
          <span className={`inline-flex items-center gap-0.5 font-bold text-[11px] shrink-0 ml-1.5 ${
            trend === 'down' ? 'text-red-600' : 'text-emerald-600'
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
