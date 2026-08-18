import { useState } from 'react';
import { Search, Filter } from 'lucide-react';
import Layout from '../components/layout/Layout';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import { useStore } from '../store/useStore';
import type { MovementType } from '../types';

const MOVEMENT_LABELS: Record<MovementType, string> = {
  purchase: 'Compra', sale: 'Venta', return: 'Devolución',
  adjustment_positive: 'Ajuste +', adjustment_negative: 'Ajuste -',
  expired: 'Vencido', shrinkage: 'Merma', correction: 'Corrección', transfer: 'Transferencia',
};

const MOVEMENT_VARIANTS: Record<MovementType, 'success' | 'danger' | 'warning' | 'info' | 'muted' | 'primary'> = {
  purchase: 'success', sale: 'primary', return: 'warning',
  adjustment_positive: 'success', adjustment_negative: 'danger',
  expired: 'danger', shrinkage: 'danger', correction: 'info', transfer: 'muted',
};

export default function Movements() {
  const { movements } = useStore();
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  const filtered = movements.filter(m => {
    const matchQ = !query || m.productName.toLowerCase().includes(query.toLowerCase()) || m.userName.toLowerCase().includes(query.toLowerCase()) || (m.lotNumber ?? '').toLowerCase().includes(query.toLowerCase());
    const matchT = typeFilter === 'all' || m.type === typeFilter;
    return matchQ && matchT;
  });

  return (
    <Layout title="Movimientos de inventario">
      <div className="space-y-4 animate-fadeIn">
        <Card className="flex flex-wrap gap-3 items-center py-3">
          <div className="relative flex-1 min-w-48">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar por producto, usuario o lote..."
              className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-400/50" />
          </div>
          <div className="flex items-center gap-1">
            <Filter size={13} className="text-slate-400" />
            <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-700 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-400/50">
              <option value="all">Todos los tipos</option>
              {Object.entries(MOVEMENT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <span className="text-xs text-slate-400 font-mono">{filtered.length} movimientos</span>
        </Card>

        <Card padding={false}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50">
                  {['Fecha/Hora', 'Tipo', 'Producto', 'Lote', 'Cantidad', 'Pres.', 'Stock antes', 'Stock después', 'Usuario', 'Motivo'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 font-mono uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {filtered.map(m => (
                  <tr key={m.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-slate-500 whitespace-nowrap">
                      {new Date(m.createdAt).toLocaleDateString('es-PE')} {new Date(m.createdAt).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-4 py-3"><Badge variant={MOVEMENT_VARIANTS[m.type]}>{MOVEMENT_LABELS[m.type]}</Badge></td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800 dark:text-slate-100 font-display whitespace-nowrap">{m.productName}</p>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{m.lotNumber ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`font-mono font-bold text-sm ${['purchase', 'return', 'adjustment_positive'].includes(m.type) ? 'text-emerald-600' : 'text-red-500'}`}>
                        {['purchase', 'return', 'adjustment_positive'].includes(m.type) ? '+' : '-'}{m.quantity}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500 capitalize">{m.presentation}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{m.stockBefore.toLocaleString()}</td>
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-700 dark:text-slate-200">{m.stockAfter.toLocaleString()}</td>
                    <td className="px-4 py-3 text-xs text-slate-500 font-display whitespace-nowrap">{m.userName}</td>
                    <td className="px-4 py-3 text-xs text-slate-400 max-w-36 truncate">{m.reason}</td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={10} className="px-4 py-12 text-center text-slate-400 text-sm">No hay movimientos registrados</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </Layout>
  );
}
