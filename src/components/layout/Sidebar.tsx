import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, ShoppingCart, Boxes, Truck, Users, Store,
  CreditCard, ArrowLeftRight, BarChart3, Settings, LogOut, ChevronLeft,
  Pill, Moon, Sun, Menu, X, Building2, Clock, ShieldCheck, WifiOff,
} from 'lucide-react';
import { useStore } from '../../store/useStore';

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/pos', label: 'Punto de Venta', icon: ShoppingCart },
  { path: '/products', label: 'Productos', icon: Pill },
  { path: '/inventory', label: 'Inventario', icon: Boxes },
  { path: '/purchases', label: 'Compras', icon: Truck },
  { path: '/suppliers', label: 'Proveedores', icon: Building2 },
  { path: '/customers', label: 'Clientes', icon: Users },
  { path: '/cash', label: 'Caja', icon: CreditCard },
  { path: '/shifts', label: 'Turnos', icon: Clock },
  { path: '/movements', label: 'Movimientos', icon: ArrowLeftRight },
  { path: '/reports', label: 'Reportes', icon: BarChart3 },
  { path: '/audit', label: 'Auditoría', icon: ShieldCheck },
  { path: '/users', label: 'Usuarios', icon: Store },
  { path: '/settings', label: 'Configuración', icon: Settings },
];

const roleAccess: Record<string, string[]> = {
  admin: navItems.map(n => n.path),
  pharmacist: ['/', '/pos', '/products', '/inventory', '/purchases', '/cash', '/shifts', '/movements'],
  seller: ['/', '/pos', '/shifts'],
  auditor: ['/', '/reports', '/movements', '/cash', '/audit'],
};

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const { currentUser, logout, isDark, toggleDark } = useStore();
  const navigate = useNavigate();

  useEffect(() => {
    const up = () => setIsOnline(true);
    const down = () => setIsOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => { window.removeEventListener('online', up); window.removeEventListener('offline', down); };
  }, []);

  const allowed = roleAccess[currentUser?.role ?? 'seller'];

  const handleLogout = () => { logout(); navigate('/login'); };

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={`flex items-center gap-3 px-4 py-5 border-b border-slate-100 dark:border-slate-700 ${collapsed ? 'justify-center' : ''}`}>
        <div className="w-9 h-9 rounded-xl bg-teal-600 flex items-center justify-center shrink-0 shadow-md shadow-teal-200 dark:shadow-teal-900/50">
          <Pill size={18} className="text-white" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-900 dark:text-slate-100 font-display leading-tight truncate">Farmacia San Miguel</p>
            <p className="text-xs text-teal-600 dark:text-teal-400 font-mono">Sistema POS</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {navItems.filter(n => allowed.includes(n.path)).map(({ path, label, icon: Icon }) => (
          <NavLink
            key={path}
            to={path}
            end={path === '/'}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group ${
                isActive
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-100'
              } ${collapsed ? 'justify-center' : ''}`
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={16} className={`shrink-0 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200'}`} />
                {!collapsed && <span className="font-display">{label}</span>}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Bottom */}
      <div className="border-t border-slate-100 dark:border-slate-700 p-3 space-y-1">
        {/* Offline indicator */}
        {!isOnline && (
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 ${collapsed ? 'justify-center' : ''}`}>
            <WifiOff size={14} className="text-amber-500 shrink-0" />
            {!collapsed && <span className="text-xs font-medium text-amber-600 dark:text-amber-400 font-display">Modo sin conexión</span>}
          </div>
        )}

        <button onClick={toggleDark} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors ${collapsed ? 'justify-center' : ''}`}>
          {isDark ? <Sun size={16} /> : <Moon size={16} />}
          {!collapsed && <span className="font-display">{isDark ? 'Modo claro' : 'Modo oscuro'}</span>}
        </button>

        {!collapsed && currentUser && (
          <div className="px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-700/50">
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate font-display">{currentUser.name}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <p className="text-xs text-slate-400 capitalize font-mono">{currentUser.role}</p>
              <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-400' : 'bg-amber-400'}`} />
            </div>
          </div>
        )}

        <button onClick={handleLogout} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors ${collapsed ? 'justify-center' : ''}`}>
          <LogOut size={16} />
          {!collapsed && <span className="font-display">Cerrar sesión</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-40 p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm"
      >
        <Menu size={18} className="text-slate-600 dark:text-slate-300" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <div className="relative w-64 bg-white dark:bg-slate-900 h-full shadow-xl">
            <button onClick={() => setMobileOpen(false)} className="absolute top-4 right-4 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400">
              <X size={16} />
            </button>
            {sidebarContent}
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className={`hidden lg:flex flex-col h-screen bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700 transition-all duration-200 shrink-0 ${collapsed ? 'w-16' : 'w-56'}`}>
        {sidebarContent}
        <button
          onClick={() => setCollapsed(c => !c)}
          className="absolute top-16 -right-3 w-6 h-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full flex items-center justify-center shadow-sm hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-colors z-10"
        >
          <ChevronLeft size={12} className={`text-slate-500 transition-transform ${collapsed ? 'rotate-180' : ''}`} />
        </button>
      </aside>
    </>
  );
}
