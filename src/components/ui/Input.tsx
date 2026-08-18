import { type InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(({ label, error, leftIcon, rightIcon, className = '', ...props }, ref) => {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-xs font-medium text-slate-600 dark:text-slate-400 font-display">{label}</label>}
      <div className="relative flex items-center">
        {leftIcon && <span className="absolute left-3 text-slate-400">{leftIcon}</span>}
        <input
          ref={ref}
          {...props}
          className={`w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-400/50 focus:border-teal-400 transition-all ${leftIcon ? 'pl-9' : 'pl-3'} ${rightIcon ? 'pr-9' : 'pr-3'} py-2 ${error ? 'border-red-400' : ''} ${className}`}
        />
        {rightIcon && <span className="absolute right-3 text-slate-400">{rightIcon}</span>}
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
});
Input.displayName = 'Input';
export default Input;

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

export function Select({ label, error, options, className = '', ...props }: SelectProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-xs font-medium text-slate-600 dark:text-slate-400 font-display">{label}</label>}
      <select
        {...props}
        className={`w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400/50 focus:border-teal-400 transition-all px-3 py-2 ${error ? 'border-red-400' : ''} ${className}`}
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export function Textarea({ label, error, className = '', ...props }: TextareaProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-xs font-medium text-slate-600 dark:text-slate-400 font-display">{label}</label>}
      <textarea
        {...props}
        className={`w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-400/50 focus:border-teal-400 transition-all px-3 py-2 resize-none ${error ? 'border-red-400' : ''} ${className}`}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
