import { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  width?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  footer?: React.ReactNode;
}

const widths = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
};

export default function Modal({ open, onClose, title, children, width = 'md', footer }: ModalProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (open) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative w-full ${widths[width]} bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 animate-fadeIn flex flex-col max-h-[90vh]`}>
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700 shrink-0">
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 font-display">{title}</h3>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 transition-colors">
              <X size={16} />
            </button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {children}
        </div>
        {footer && (
          <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-700 shrink-0 flex justify-end gap-2">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
