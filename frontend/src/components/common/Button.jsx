import React from 'react';

export default function Button({
  children,
  variant = 'primary', // 'primary' (emerald), 'secondary' (white), 'outline', 'danger' (red), 'ghost'
  size = 'md',        // 'sm', 'md', 'lg'
  icon: Icon,
  loading = false,
  disabled = false,
  className = '',
  onClick,
  type = 'button',
  ...props
}) {
  const baseClasses = 'inline-flex items-center justify-center font-bold rounded-xl transition-all duration-150 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed select-none cursor-pointer';

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs gap-1.5',
    md: 'px-4 py-2.5 text-sm gap-2',
    lg: 'px-6 py-3 text-base gap-2.5'
  };

  const variantClasses = {
    primary: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 active:scale-[0.98]',
    secondary: 'bg-white hover:bg-neutral-100 text-neutral-800 border border-neutral-300 shadow-xs active:scale-[0.98]',
    outline: 'bg-white border border-emerald-500 text-emerald-700 hover:bg-emerald-50 active:scale-[0.98]',
    danger: 'bg-red-600 hover:bg-red-700 text-white shadow-md shadow-red-600/20 active:scale-[0.98]',
    ghost: 'bg-transparent hover:bg-neutral-100 text-neutral-700 hover:text-neutral-900'
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
