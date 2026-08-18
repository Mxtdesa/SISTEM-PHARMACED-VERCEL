import { Bell, Search, Sun, Moon } from 'lucide-react';
import Sidebar from './Sidebar';
import { useStore } from '../../store/useStore';

interface LayoutProps {
  children: React.ReactNode;
  title?: string;
  actions?: React.ReactNode;
}

export default function Layout({ children, title, actions }: LayoutProps) {
  const { batches, products, settings } = useStore();

  const now = new Date('2025-08-16');
  const alertDate = new Date(now);
  alertDate.setDate(alertDate.getDate() + settings.expiryAlertDays);

  const alerts = [
    ...batches.filter(b => new Date(b.expiryDate) < now && b.quantity > 0).map(b => ({
      type: 'expired' as const,
      message: `${products.find(p => p.id === b.productId)?.name ?? 'Producto'} - Lote ${b.lotNumber} VENCIDO`,
    })),
    ...batches.filter(b => {
      const exp = new Date(b.expiryDate);
      return exp >= now && exp <= alertDate && b.quantity > 0;
    }).slice(0, 3).map(b => ({
      type: 'expiring' as const,
      message: `${products.find(p => p.id === b.productId)?.name ?? 'Producto'} vence ${new Date(b.expiryDate).toLocaleDateString('es-PE')}`,
    })),
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-14 shrink-0 flex items-center justify-between px-4 lg:px-6 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3 pl-10 lg:pl-0">
            {title && <h1 className="text-base font-semibold text-slate-900 dark:text-slate-100 font-display">{title}</h1>}
          </div>
          <div className="flex items-center gap-2">
            {actions}
            <button
              onClick={useStore.getState().toggleDark}
              className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title={useStore.getState().isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            >
              {useStore.getState().isDark ? <Sun size={17} className="text-amber-400" /> : <Moon size={17} className="text-slate-500" />}
            </button>

            <div className="relative group">
              <button className="relative p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                <Bell size={17} className="text-slate-500 dark:text-slate-400" />
                {alerts.length > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
                )}
              </button>
              {alerts.length > 0 && (
                <div className="absolute right-0 top-full mt-1 w-72 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-lg hidden group-hover:block z-50 animate-fadeIn">
                  <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700">
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 font-display">Alertas ({alerts.length})</p>
                  </div>
                  <div className="divide-y divide-slate-100 dark:divide-slate-700 max-h-64 overflow-y-auto">
                    {alerts.map((a, i) => (
                      <div key={i} className="px-4 py-3 flex items-start gap-2">
                        <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${a.type === 'expired' ? 'bg-red-500' : 'bg-amber-400'}`} />
                        <p className="text-xs text-slate-600 dark:text-slate-300">{a.message}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
