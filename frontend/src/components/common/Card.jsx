import React from 'react';

export default function Card({
  children,
  title,
  subtitle,
  icon: Icon,
  action,
  hoverable = false,
  className = '',
  bodyClassName = '',
  ...props
}) {
  return (
    <div
      className={`glass-panel rounded-2xl border border-slate-800 ${hoverable ? 'glass-panel-hover' : ''} ${className}`}
      {...props}
    >
      {(title || subtitle || action || Icon) && (
        <div className="p-5 border-b border-slate-800/80 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            {Icon && (
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4 text-emerald-400" />
              </div>
            )}
            <div>
              {title && <h3 className="font-bold text-base text-white">{title}</h3>}
              {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
            </div>
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      <div className={`p-5 ${bodyClassName}`}>
        {children}
      </div>
    </div>
  );
}

export { Card };

