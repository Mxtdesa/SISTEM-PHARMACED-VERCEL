import { useState } from 'react';
import { Download, Calendar, TrendingUp, Package, DollarSign, ShoppingBag } from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell
} from 'recharts';
import Layout from '../components/layout/Layout';
import Card, { StatCard } from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import { useStore } from '../store/useStore';
import { salesChartData, topProducts } from '../data/mockData';

const PIE_COLORS = ['#0D9488', '#7C3AED', '#0284C7', '#D97706', '#94A3B8', '#10B981'];

const TABS = ['Ventas', 'Más Vendidos', 'Inventario', 'Rentabilidad', 'Compras'];

export default function Reports() {
  const { sales, products, purchases, getProductStock } = useStore();
  const [tab, setTab] = useState('Ventas');
  const [topPeriod, setTopPeriod] = useState<'day' | 'week' | 'month'>('day');
  const [dateFrom, setDateFrom] = useState('2025-08-01');
  const [dateTo, setDateTo] = useState('2025-08-16');

  const filteredSales = sales.filter(s => s.status === 'completed' &&
    s.date >= dateFrom && s.date <= dateTo + 'T23:59:59');

  const totalRevenue = filteredSales.reduce((s, sale) => s + sale.total, 0);
  const totalDiscount = filteredSales.reduce((s, sale) => s + sale.discount, 0);
  const avgTicket = filteredSales.length > 0 ? totalRevenue / filteredSales.length : 0;

  // Sales by seller
  const bySeller: Record<string, { name: string; total: number; count: number }> = {};
  filteredSales.forEach(s => {
    if (!bySeller[s.userId]) bySeller[s.userId] = { name: s.userName, total: 0, count: 0 };
    bySeller[s.userId].total += s.total;
    bySeller[s.userId].count++;
  });
  const sellerData = Object.values(bySeller);

  // Sales by payment method
  const byPayment: Record<string, number> = {};
  filteredSales.forEach(s => s.payments.forEach(p => {
    byPayment[p.method] = (byPayment[p.method] ?? 0) + p.amount;
  }));
  const paymentData = Object.entries(byPayment).map(([name, value]) => ({ name: name.toUpperCase(), value }));

  // Product profitability
  const productProfit = products.map(p => {
    const unitsSold = filteredSales.reduce((s, sale) => {
      const item = sale.items.find(i => i.productId === p.id);
      return s + (item ? item.quantity : 0);
    }, 0);
    const revenue = filteredSales.reduce((s, sale) => {
      const item = sale.items.find(i => i.productId === p.id);
      return s + (item ? item.subtotal : 0);
    }, 0);
    const cost = p.purchasePrice * unitsSold * 0.1;
    const profit = revenue - cost;
    const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
    return { name: p.name, revenue, cost, profit, margin, unitsSold };
  }).filter(p => p.revenue > 0).sort((a, b) => b.profit - a.profit);

  // Inventory valuation
  const inventoryValue = products.reduce((sum, p) => sum + getProductStock(p.id) * p.purchasePrice * 0.1, 0);

  return (
    <Layout title="Reportes"
      actions={
        <div className="flex gap-2">
          <Button variant="secondary" size="sm"><Download size={14} /> Excel</Button>
          <Button variant="secondary" size="sm"><Download size={14} /> PDF</Button>
        </div>
      }
    >
      <div className="space-y-4 animate-fadeIn">
        {/* Date filter */}
        <Card className="flex flex-wrap gap-3 items-center py-3">
          <div className="flex items-center gap-2">
            <Calendar size={14} className="text-slate-400" />
            <label className="text-xs font-medium text-slate-600 dark:text-slate-400 font-display">Desde:</label>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-700 text-sm text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-teal-400/50" />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-slate-600 dark:text-slate-400 font-display">Hasta:</label>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-700 text-sm text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-teal-400/50" />
          </div>
          <div className="flex gap-1 ml-auto">
            {TABS.map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium font-display transition-all ${tab === t ? 'bg-teal-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'}`}>
                {t}
              </button>
            ))}
          </div>
        </Card>

        {/* VENTAS TAB */}
        {tab === 'Ventas' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="Ingresos" value={`S/ ${totalRevenue.toFixed(2)}`} icon={<DollarSign size={18} />} variant="default" />
              <StatCard label="Ventas" value={filteredSales.length} sub="transacciones" icon={<ShoppingBag size={18} />} variant="info" />
              <StatCard label="Ticket prom." value={`S/ ${avgTicket.toFixed(2)}`} icon={<TrendingUp size={18} />} variant="success" />
              <StatCard label="Descuentos" value={`S/ ${totalDiscount.toFixed(2)}`} icon={<Package size={18} />} variant="warning" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card padding={false}>
                <div className="px-5 pt-5 pb-2">
                  <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 font-display">Evolución de ventas</h3>
                </div>
                <div className="h-52 px-2 pb-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={salesChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" strokeOpacity={0.4} />
                      <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#94A3B8', fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: '#94A3B8', fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} tickFormatter={v => `S/${v}`} />
                      <Tooltip contentStyle={{ background: '#1E293B', border: 'none', borderRadius: 8, fontSize: 11, color: '#F1F5F9' }} formatter={(v: any) => [`S/ ${Number(v || 0).toFixed(2)}`, '']} />
                      <Line type="monotone" dataKey="ventas" stroke="#0D9488" strokeWidth={2} dot={false} name="Ventas" />
                      <Line type="monotone" dataKey="ganancia" stroke="#7C3AED" strokeWidth={2} dot={false} name="Ganancia" />
                      <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              <Card padding={false}>
                <div className="px-5 pt-5 pb-2">
                  <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 font-display">Métodos de pago</h3>
                </div>
                <div className="h-52 flex items-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={paymentData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} dataKey="value" paddingAngle={3}>
                        {paymentData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ background: '#1E293B', border: 'none', borderRadius: 8, fontSize: 11, color: '#F1F5F9' }} formatter={(v: any) => [`S/ ${Number(v || 0).toFixed(2)}`, '']} />
                      <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>

            {/* Sales by seller */}
            <Card padding={false}>
              <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700">
                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 font-display">Ventas por vendedor</h3>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50">
                    {['Vendedor', 'Transacciones', 'Total vendido', 'Ticket promedio'].map(h => (
                      <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 font-mono uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                  {sellerData.map((s, i) => (
                    <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                      <td className="px-4 py-3 font-display font-medium text-slate-800 dark:text-slate-100">{s.name}</td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-500">{s.count}</td>
                      <td className="px-4 py-3 font-mono font-bold text-teal-700 dark:text-teal-400">S/ {s.total.toFixed(2)}</td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-500">S/ {(s.total / s.count).toFixed(2)}</td>
                    </tr>
                  ))}
                  {sellerData.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400 text-sm">No hay ventas en el período</td></tr>}
                </tbody>
              </table>
            </Card>
          </div>
        )}

        {/* MÁS VENDIDOS TAB */}
        {tab === 'Más Vendidos' && (
          <div className="space-y-4">
            <Card className="flex items-center justify-between py-3">
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 font-display">Ranking de Medicamentos Más Vendidos</h3>
                <p className="text-xs text-slate-400">Filtrar por rango temporal para identificar los de mayor rotación</p>
              </div>
              <div className="flex gap-2">
                {[
                  ['day', 'Hoy / Día'],
                  ['week', 'Esta Semana'],
                  ['month', 'Este Mes'],
                ].map(([val, label]) => (
                  <button
                    key={val}
                    onClick={() => setTopPeriod(val as 'day' | 'week' | 'month')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold font-display transition-all ${topPeriod === val ? 'bg-teal-600 text-white shadow-xs' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </Card>

            {(() => {
              const now = new Date('2025-08-16');
              let periodStart = new Date(now);

              if (topPeriod === 'day') {
                periodStart.setHours(0, 0, 0, 0);
              } else if (topPeriod === 'week') {
                periodStart.setDate(now.getDate() - 7);
              } else {
                periodStart.setDate(now.getDate() - 30);
              }

              const periodStartIso = periodStart.toISOString();
              const periodSales = sales.filter(s => s.status === 'completed' && s.date >= periodStartIso);

              const productStatsMap: Record<string, { product: typeof products[0]; totalUnits: number; totalRevenue: number }> = {};

              periodSales.forEach(sale => {
                sale.items.forEach(item => {
                  const p = products.find(prod => prod.id === item.productId);
                  if (!p) return;
                  if (!productStatsMap[p.id]) {
                    productStatsMap[p.id] = { product: p, totalUnits: 0, totalRevenue: 0 };
                  }
                  productStatsMap[p.id].totalUnits += item.quantity;
                  productStatsMap[p.id].totalRevenue += item.subtotal;
                });
              });

              const topRanked = Object.values(productStatsMap).sort((a, b) => b.totalUnits - a.totalUnits);

              return (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <Card className="lg:col-span-2" padding={false}>
                      <div className="px-5 pt-5 pb-2">
                        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 font-display">Unidades Vendidas ({topPeriod === 'day' ? 'Hoy' : topPeriod === 'week' ? 'Semana' : 'Mes'})</h3>
                      </div>
                      <div className="h-64 px-2 pb-4">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={topRanked.slice(0, 7).map(r => ({ name: r.product.commercialName || r.product.name, unidades: r.totalUnits }))}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" strokeOpacity={0.4} />
                            <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#64748B', fontFamily: 'Inter' }} axisLine={false} tickLine={false} interval={0} angle={-15} textAnchor="end" height={45} />
                            <YAxis tick={{ fontSize: 10, fill: '#94A3B8', fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} />
                            <Tooltip contentStyle={{ background: '#1E293B', border: 'none', borderRadius: 8, fontSize: 11, color: '#F1F5F9' }} />
                            <Bar dataKey="unidades" fill="#0D9488" radius={[4, 4, 0, 0]} name="Unidades" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </Card>

                    <Card padding={false}>
                      <div className="px-5 pt-5 pb-3">
                        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 font-display">Top 3 Destacados</h3>
                      </div>
                      <div className="divide-y divide-slate-100 dark:divide-slate-700">
                        {topRanked.slice(0, 3).map((item, idx) => (
                          <div key={item.product.id} className="p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs font-mono ${idx === 0 ? 'bg-amber-400 text-amber-950' : idx === 1 ? 'bg-slate-300 text-slate-800' : 'bg-amber-700 text-white'}`}>
                                #{idx + 1}
                              </span>
                              <div>
                                <p className="text-xs font-bold text-slate-800 dark:text-slate-100 font-display">{item.product.commercialName || item.product.name}</p>
                                <p className="text-[11px] text-slate-400">{item.product.activeIngredient}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-xs font-bold font-mono text-teal-600">{item.totalUnits} uds</p>
                              <p className="text-[11px] text-slate-400 font-mono">S/ {item.totalRevenue.toFixed(2)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </Card>
                  </div>

                  <Card padding={false}>
                    <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700">
                      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 font-display">Detalle Completo de Rotación de Medicamentos</h3>
                    </div>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50">
                          {['Posición', 'Medicamento', 'Presentación', 'Unidades Vendidas', 'Ingreso Generado', 'Stock Actual'].map(h => (
                            <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 font-mono uppercase tracking-wide">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                        {topRanked.map((r, i) => (
                          <tr key={r.product.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                            <td className="px-4 py-3 font-mono text-xs font-bold text-slate-500">#{i + 1}</td>
                            <td className="px-4 py-3 font-display font-medium text-slate-800 dark:text-slate-100">{r.product.commercialName || r.product.name}</td>
                            <td className="px-4 py-3 font-mono text-xs text-slate-500">{r.product.tipoPresentacion || r.product.presentation}</td>
                            <td className="px-4 py-3 font-mono font-bold text-teal-600">{r.totalUnits} unidades</td>
                            <td className="px-4 py-3 font-mono font-bold text-emerald-600">S/ {r.totalRevenue.toFixed(2)}</td>
                            <td className="px-4 py-3 font-mono text-xs text-slate-500">{getProductStock(r.product.id)} uds</td>
                          </tr>
                        ))}
                        {topRanked.length === 0 && (
                          <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400 text-sm">No hay ventas registradas para este periodo.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </Card>
                </div>
              );
            })()}
          </div>
        )}

        {/* INVENTARIO TAB */}
        {tab === 'Inventario' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="Total productos" value={products.length} icon={<Package size={18} />} variant="default" />
              <StatCard label="Productos activos" value={products.filter(p => p.active).length} icon={<Package size={18} />} variant="success" />
              <StatCard label="Valor inventario" value={`S/ ${inventoryValue.toFixed(0)}`} icon={<DollarSign size={18} />} variant="info" />
              <StatCard label="Agotados" value={products.filter(p => getProductStock(p.id) === 0).length} icon={<Package size={18} />} variant="danger" />
            </div>
            <Card padding={false}>
              <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 font-display">Inventario valorizado</h3>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50">
                    {['Producto', 'Categoría', 'Stock (uds)', 'P. Compra unit.', 'Valor total', 'Estado'].map(h => (
                      <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 font-mono uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                  {products.filter(p => p.active).sort((a, b) => getProductStock(b.id) * b.purchasePrice - getProductStock(a.id) * a.purchasePrice).map(p => {
                    const stock = getProductStock(p.id);
                    const value = stock * p.purchasePrice * 0.1;
                    const status = stock === 0 ? 'out' : stock <= p.minStock ? 'low' : 'ok';
                    return (
                      <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                        <td className="px-4 py-2.5 font-display font-medium text-slate-800 dark:text-slate-100">{p.name}</td>
                        <td className="px-4 py-2.5"><Badge variant="muted">{p.category}</Badge></td>
                        <td className="px-4 py-2.5 font-mono font-bold text-slate-700 dark:text-slate-200">{stock.toLocaleString()}</td>
                        <td className="px-4 py-2.5 font-mono text-xs text-slate-500">S/ {(p.purchasePrice / p.units.unitsPerBox).toFixed(2)}</td>
                        <td className="px-4 py-2.5 font-mono font-bold text-teal-700 dark:text-teal-400">S/ {value.toFixed(2)}</td>
                        <td className="px-4 py-2.5">
                          <Badge variant={status === 'out' ? 'danger' : status === 'low' ? 'warning' : 'success'}>
                            {status === 'out' ? 'Agotado' : status === 'low' ? 'Bajo' : 'Normal'}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </Card>
          </div>
        )}

        {/* RENTABILIDAD TAB */}
        {tab === 'Rentabilidad' && (
          <div className="space-y-4">
            <Card padding={false}>
              <div className="px-5 pt-5 pb-2">
                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 font-display">Ganancia por producto</h3>
              </div>
              <div className="h-64 px-2 pb-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topProducts} margin={{ top: 0, right: 20, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" strokeOpacity={0.4} />
                    <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#64748B', fontFamily: 'Inter' }} axisLine={false} tickLine={false} interval={0} angle={-15} textAnchor="end" height={40} />
                    <YAxis tick={{ fontSize: 10, fill: '#94A3B8', fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} tickFormatter={v => `S/${v}`} />
                    <Tooltip contentStyle={{ background: '#1E293B', border: 'none', borderRadius: 8, fontSize: 11, color: '#F1F5F9' }} formatter={(v: any) => [`S/ ${Number(v || 0).toFixed(2)}`, '']} />
                    <Bar dataKey="revenue" fill="#0D9488" radius={[4, 4, 0, 0]} name="Ingresos" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card padding={false}>
              <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700">
                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 font-display">Análisis de rentabilidad</h3>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50">
                    {['Producto', 'Ingresos', 'Costo est.', 'Ganancia', 'Margen %', 'Uds vendidas'].map(h => (
                      <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 font-mono uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                  {productProfit.map((p, i) => (
                    <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                      <td className="px-4 py-2.5 font-display font-medium text-slate-800 dark:text-slate-100">{p.name}</td>
                      <td className="px-4 py-2.5 font-mono font-bold text-teal-700 dark:text-teal-400">S/ {p.revenue.toFixed(2)}</td>
                      <td className="px-4 py-2.5 font-mono text-xs text-slate-500">S/ {p.cost.toFixed(2)}</td>
                      <td className="px-4 py-2.5 font-mono font-bold text-emerald-600">S/ {p.profit.toFixed(2)}</td>
                      <td className="px-4 py-2.5"><Badge variant={p.margin > 30 ? 'success' : p.margin > 15 ? 'warning' : 'danger'}>{p.margin.toFixed(1)}%</Badge></td>
                      <td className="px-4 py-2.5 font-mono text-xs text-slate-500">{p.unitsSold}</td>
                    </tr>
                  ))}
                  {productProfit.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400 text-sm">No hay datos de rentabilidad</td></tr>}
                </tbody>
              </table>
            </Card>
          </div>
        )}

        {/* COMPRAS TAB */}
        {tab === 'Compras' && (
          <div className="space-y-4">
            {purchases.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-sm">No hay compras registradas</div>
            ) : (
              <Card padding={false}>
                <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700">
                  <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 font-display">Historial de compras</h3>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50">
                      {['Proveedor', 'Factura', 'Fecha', 'Ítems', 'Total'].map(h => (
                        <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 font-mono uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                    {purchases.map(p => (
                      <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                        <td className="px-4 py-2.5 font-display font-medium text-slate-800 dark:text-slate-100">{p.supplierName}</td>
                        <td className="px-4 py-2.5 font-mono text-xs text-teal-700 dark:text-teal-400">{p.invoiceNumber}</td>
                        <td className="px-4 py-2.5 font-mono text-xs text-slate-500">{new Date(p.date).toLocaleDateString('es-PE')}</td>
                        <td className="px-4 py-2.5 font-mono text-xs text-slate-500">{p.items.length}</td>
                        <td className="px-4 py-2.5 font-mono font-bold text-slate-800 dark:text-slate-100">S/ {p.total.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
