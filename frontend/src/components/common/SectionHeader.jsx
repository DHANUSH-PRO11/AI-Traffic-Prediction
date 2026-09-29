import React from 'react';

export default function SectionHeader({
  title,
  subtitle,
  description,
  icon: Icon,
  badge,
  action,
  actions,
  className = ''
}) {
  const displaySubtitle = description || subtitle;
  const displayAction = actions || action;

  return (
    <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 ${className}`}>
      <div>
        <div className="flex items-center gap-2.5">
          {Icon && (
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400 shrink-0">
              <Icon className="w-5 h-5" />
            </div>
          )}
          <h2 className="text-2xl font-bold tracking-tight text-white">
            {title}
          </h2>
          {badge}
        </div>
        {displaySubtitle && (
          <p className="text-sm text-slate-400 mt-1.5 max-w-3xl leading-relaxed">
            {displaySubtitle}
          </p>
        )}
      </div>
      {displayAction && (
        <div className="flex items-center gap-3 shrink-0">
          {displayAction}
        </div>
      )}
    </div>
  );
}

export { SectionHeader };
