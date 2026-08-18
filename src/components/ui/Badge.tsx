interface BadgeProps {
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'muted' | 'primary' | 'accent';
  children: React.ReactNode;
  className?: string;
}

const variantStyles = {
  success: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  warning: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  danger: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  info: 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400',
  muted: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  primary: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400',
  accent: 'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400',
};

export default function Badge({ variant = 'muted', children, className = '' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium font-mono tracking-wide ${variantStyles[variant]} ${className}`}>
      {children}
    </span>
  );
}
