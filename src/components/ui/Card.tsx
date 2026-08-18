interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: boolean;
}

export default function Card({ children, className = '', padding = true }: CardProps) {
  return (
    <div className={`bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm ${padding ? 'p-5' : ''} ${className}`}>
      {children}
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon?: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  trend?: { value: number; label: string };
}

const variantIcon: Record<string, string> = {
  default: 'bg-teal-50 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400',
  success: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
  warning: 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
  danger: 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400',
  info: 'bg-sky-50 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400',
};

export function StatCard({ label, value, sub, icon, variant = 'default', trend }: StatCardProps) {
  return (
    <Card className="flex items-start gap-4">
      {icon && (
        <div className={`p-3 rounded-xl shrink-0 ${variantIcon[variant]}`}>
          {icon}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide font-mono">{label}</p>
        <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 font-display mt-0.5">{value}</p>
        {sub && <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{sub}</p>}
        {trend && (
          <p className={`text-xs font-medium mt-1 ${trend.value >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
            {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}% {trend.label}
          </p>
        )}
      </div>
    </Card>
  );
}
