import { DollarSign, ShoppingBag, AlertTriangle, Clock, Package, TrendingUp, XCircle } from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import Layout from '../components/layout/Layout';
import Card, { StatCard } from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import { useStore } from '../store/useStore';
import { getDashboardStats, salesChartData, topProducts, categoryData } from '../data/mockData';

const PIE_COLORS = ['#0D9488', '#7C3AED', '#0284C7', '#D97706', '#94A3B8'];

export default function Dashboard() {
  const { sales, products, batches, settings, getProductStock } = useStore();

  const todayStr = new Date().toISOString().split('T')[0];
  const todaySalesList = sales.filter(s => s.status === 'completed' && s.date.startsWith(todayStr));
  const todayRevenue = todaySalesList.reduce((sum, s) => sum + s.total, 0);

  const now = new Date();
  const alertDate = new Date(now);
  alertDate.setDate(alertDate.getDate() + (settings?.expiryAlertDays ?? 60));

  const expiringSoon = batches.filter(b => {
    const exp = new Date(b.expiryDate);
    return exp >= now && exp <= alertDate && b.quantity > 0;
  });

  const expiredBatches = batches.filter(b => {
    const exp = new Date(b.expiryDate);
    return exp < now && b.quantity > 0;
  });

  const lowStockProducts = products.filter(p => {
    const stock = getProductStock(p.id);
    return stock > 0 && stock <= p.minStock;
  });

  const outOfStockProducts = products.filter(p => getProductStock(p.id) === 0);

  const recentSales = sales.slice(0, 5);

  const dailyGoal = settings?.salesTargetDaily || 500;
  const dailyProgress = Math.min(100, (todayRevenue / dailyGoal) * 100);

  return (
    <Layout title="Dashboard">
      <div className="space-y-6 animate-fadeIn">
        {/* Sales Target Banner */}
        <Card className="bg-gradient-to-r from-teal-700 via-teal-800 to-slate-900 text-white p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <TrendingUp size={18} className="text-teal-300" />
                <h3 className="text-sm font-bold font-display tracking-wide uppercase text-teal-100">Progreso de Meta Diaria</h3>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                Cobrado hoy: <span className="font-bold font-mono text-white">S/ {todayRevenue.toFixed(2)}</span> de la meta de <span className="font-bold font-mono text-teal-200">S/ {dailyGoal.toFixed(2)}</span>
              </p>
            </div>
            <div className="flex items-center gap-3 min-w-[200px]">
              <div className="flex-1 bg-slate-700/60 rounded-full h-3.5 overflow-hidden p-0.5 border border-teal-500/30">
                <div
                  className="bg-gradient-to-r from-teal-400 to-emerald-400 h-full rounded-full transition-all duration-500"
                  style={{ width: `${dailyProgress}%` }}
                />
              </div>
              <span className="font-mono text-sm font-bold text-teal-300 w-12 text-right">{dailyProgress.toFixed(0)}%</span>
            </div>
          </div>
        </Card>

        {/* KPI row */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4">
          <StatCard
            label="Ventas hoy"
            value={`S/ ${todayRevenue.toFixed(2)}`}
            sub={`${todaySalesList.length} transacciones`}
            icon={<DollarSign size={20} />}
            variant="default"
          />
          <StatCard
            label="Pedidos hoy"
            value={todaySalesList.length}
            sub="transacciones"
            icon={<ShoppingBag size={20} />}
            variant="info"
          />
          <StatCard
            label="Stock bajo"
            value={lowStockProducts.length}
            sub="productos"
            icon={<AlertTriangle size={20} />}
            variant="warning"
          />
          <StatCard
            label="Agotados"
            value={outOfStockProducts.length}
            sub="productos"
            icon={<XCircle size={20} />}
            variant="danger"
          />
          <StatCard
            label="Por vencer"
            value={expiringSoon.length}
            sub={`próx. ${settings?.expiryAlertDays ?? 60}d`}
            icon={<Clock size={20} />}
            variant="warning"
          />
          <StatCard
            label="Vencidos"
            value={expiredBatches.length}
            sub="lotes"
            icon={<Package size={20} />}
            variant="danger"
          />
          <StatCard
            label="Ganancia hoy"
            value={`S/ ${(todayRevenue * 0.35).toFixed(2)}`}
            sub="estimado 35%"
            icon={<TrendingUp size={20} />}
            variant="success"
          />
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Sales area chart */}
          <Card className="lg:col-span-2" padding={false}>
            <div className="px-5 pt-5 pb-2 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 font-display">Ventas semanales</h3>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Últimos 6 días</p>
              </div>
              <Badge variant="primary">Esta semana</Badge>
            </div>
            <div className="h-52 px-2 pb-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={salesChartData} margin={{ top: 5, right: 10, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="gradVentas" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0D9488" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#0D9488" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradGanancia" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#7C3AED" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" strokeOpacity={0.5} />
                  <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#94A3B8', fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#94A3B8', fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} tickFormatter={v => `S/${v}`} />
                  <Tooltip
                    contentStyle={{ background: '#1E293B', border: 'none', borderRadius: 8, fontSize: 12, fontFamily: 'JetBrains Mono', color: '#F1F5F9' }}
                    formatter={(v: any) => [`S/ ${Number(v || 0).toFixed(2)}`, '']}
                  />
                  <Area type="monotone" dataKey="ventas" stroke="#0D9488" strokeWidth={2} fill="url(#gradVentas)" name="Ventas" />
                  <Area type="monotone" dataKey="ganancia" stroke="#7C3AED" strokeWidth={2} fill="url(#gradGanancia)" name="Ganancia" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Category pie */}
          <Card padding={false}>
            <div className="px-5 pt-5 pb-2">
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 font-display">Ventas por categoría</h3>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Distribución mensual</p>
            </div>
            <div className="h-52 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={categoryData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} dataKey="value" paddingAngle={3}>
                    {categoryData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#1E293B', border: 'none', borderRadius: 8, fontSize: 11, color: '#F1F5F9' }} formatter={(v: any) => [`${v}%`, '']} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, fontFamily: 'JetBrains Mono' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        {/* Bottom row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Top products bar chart */}
          <Card padding={false}>
            <div className="px-5 pt-5 pb-2">
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 font-display">Productos más vendidos</h3>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Por unidades este mes</p>
            </div>
            <div className="h-48 px-2 pb-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topProducts} layout="vertical" margin={{ top: 0, right: 10, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" strokeOpacity={0.4} horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: '#94A3B8', fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fill: '#64748B', fontFamily: 'Inter' }} axisLine={false} tickLine={false} width={90} />
                  <Tooltip contentStyle={{ background: '#1E293B', border: 'none', borderRadius: 8, fontSize: 11, color: '#F1F5F9' }} />
                  <Bar dataKey="units" fill="#0D9488" radius={[0, 4, 4, 0]} name="Unidades" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Recent sales */}
          <Card padding={false}>
            <div className="px-5 pt-5 pb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 font-display">Últimas ventas</h3>
              <Badge variant="primary">{new Date('2025-08-16').toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })}</Badge>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-700">
              {recentSales.map(sale => (
                <div key={sale.id} className="px-5 py-3 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-800 dark:text-slate-100 font-mono truncate">{sale.number}</p>
                    <p className="text-xs text-slate-400">{sale.userName} · {new Date(sale.date).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-slate-900 dark:text-slate-100 font-mono">S/ {sale.total.toFixed(2)}</p>
                    <Badge variant={sale.status === 'completed' ? 'success' : sale.status === 'voided' ? 'danger' : 'warning'}>
                      {sale.status === 'completed' ? 'Completada' : sale.status === 'voided' ? 'Anulada' : 'Devuelta'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Alerts panel */}
          <Card padding={false}>
            <div className="px-5 pt-5 pb-3">
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 font-display">Alertas de inventario</h3>
            </div>
            <div className="space-y-1 px-3 pb-4 max-h-52 overflow-y-auto">
              {lowStockProducts.slice(0, 3).map(p => (
                <div key={p.id} className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800/30">
                  <AlertTriangle size={13} className="text-amber-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-amber-800 dark:text-amber-300">{p.name}</p>
                    <p className="text-xs text-amber-600 dark:text-amber-400 font-mono">Stock: {getProductStock(p.id)} / Mín: {p.minStock}</p>
                  </div>
                </div>
              ))}
              {expiringSoon.slice(0, 3).map(b => {
                const product = products.find(p => p.id === b.productId);
                return (
                  <div key={b.id} className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg bg-orange-50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-800/30">
                    <Clock size={13} className="text-orange-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-medium text-orange-800 dark:text-orange-300">{product?.name}</p>
                      <p className="text-xs text-orange-600 dark:text-orange-400 font-mono">Vence: {new Date(b.expiryDate).toLocaleDateString('es-PE')} · Lote {b.lotNumber}</p>
                    </div>
                  </div>
                );
              })}
              {lowStockProducts.length === 0 && expiringSoon.length === 0 && (
                <p className="text-xs text-slate-400 text-center py-4">Sin alertas activas</p>
              )}
            </div>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
