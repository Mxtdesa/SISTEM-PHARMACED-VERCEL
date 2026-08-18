import { type ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

const variants = {
  primary: 'bg-teal-600 hover:bg-teal-700 text-white border-transparent shadow-sm',
  secondary: 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-transparent dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200',
  ghost: 'bg-transparent hover:bg-slate-100 text-slate-600 border-transparent dark:hover:bg-slate-800 dark:text-slate-400',
  danger: 'bg-red-600 hover:bg-red-700 text-white border-transparent shadow-sm',
  success: 'bg-emerald-600 hover:bg-emerald-700 text-white border-transparent shadow-sm',
  outline: 'bg-transparent hover:bg-teal-50 text-teal-700 border-teal-200 dark:hover:bg-teal-900/20 dark:text-teal-400 dark:border-teal-800',
};

const sizes = {
  sm: 'px-3 py-1.5 text-xs gap-1.5',
  md: 'px-4 py-2 text-sm gap-2',
  lg: 'px-6 py-3 text-base gap-2',
};

export default function Button({ variant = 'primary', size = 'md', loading, children, className = '', disabled, ...props }: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center font-medium rounded-lg border transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-teal-400/50 disabled:opacity-50 disabled:cursor-not-allowed font-display ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {loading && (
        <svg className="animate-spin-slow w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {children}
    </button>
  );
}
