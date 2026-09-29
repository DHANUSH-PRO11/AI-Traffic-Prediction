import React from 'react';

export default function Card({
  children,
  title,
  subtitle,
  icon: Icon,
  action,
  headerAction,
  hoverable = false,
  className = '',
  bodyClassName = '',
  ...props
}) {
  const displayAction = headerAction || action;

  return (
    <div
      className={`bg-white rounded-2xl border border-neutral-200 shadow-xs ${hoverable ? 'hover:shadow-md transition-shadow' : ''} ${className}`}
      {...props}
    >
      {(title || subtitle || displayAction || Icon) && (
        <div className="p-5 border-b border-neutral-100 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            {Icon && (
              <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4 text-emerald-600" />
              </div>
            )}
            <div>
              {title && <h3 className="font-bold text-base text-neutral-900">{title}</h3>}
              {subtitle && <p className="text-xs text-neutral-500 mt-0.5">{subtitle}</p>}
            </div>
          </div>
          {displayAction && <div className="shrink-0">{displayAction}</div>}
        </div>
      )}
      <div className={`p-5 ${bodyClassName}`}>
        {children}
      </div>
    </div>
  );
}

export { Card };
