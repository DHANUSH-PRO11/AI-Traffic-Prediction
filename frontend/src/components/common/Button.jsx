import React from 'react';

export default function Button({
  children,
  variant = 'primary', // 'primary' (emerald), 'secondary' (slate), 'outline', 'danger', 'ghost'
  size = 'md',        // 'sm', 'md', 'lg'
  icon: Icon,
  loading = false,
  disabled = false,
  className = '',
  onClick,
  type = 'button',
  ...props
}) {
  const baseClasses = 'inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-150 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed select-none';

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs gap-1.5',
    md: 'px-4 py-2.5 text-sm gap-2',
    lg: 'px-6 py-3 text-base gap-2.5'
  };

  const variantClasses = {
    primary: 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30 active:scale-[0.98]',
    secondary: 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700/60 active:scale-[0.98]',
    outline: 'bg-transparent border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10 active:scale-[0.98]',
    danger: 'bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-600/30 active:scale-[0.98]',
    ghost: 'bg-transparent hover:bg-slate-800 text-slate-300 hover:text-white'
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {loading ? (
        <>
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0" />
          <span>Processing...</span>
        </>
      ) : (
        <>
          {Icon && <Icon className="w-4 h-4 shrink-0" />}
          {children}
        </>
      )}
    </button>
  );
}

export { Button };

