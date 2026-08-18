import { useState, useMemo } from 'react';
import { Search, Shield, Filter, Download, ChevronDown, ChevronUp } from 'lucide-react';
import * as XLSX from 'xlsx';
import Layout from '../components/layout/Layout';
import Card, { StatCard } from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import { useStore } from '../store/useStore';

const ACTION_COLORS: Record<string, 'danger' | 'warning' | 'success' | 'info' | 'muted'> = {
  'Lote eliminado': 'danger',
  'Ajuste negativo de stock': 'danger',
  'Cambio de precio': 'warning',
  'Ajuste positivo de stock': 'info',
  'Lote agregado': 'success',
  'Lote editado': 'warning',
  'Nuevo producto': 'success',
  'Edición de producto': 'info',
  'Cierre de caja': 'muted',
  'Apertura de caja': 'muted',
  'Venta registrada': 'success',
  'Compra registrada': 'info',
};

const ACTION_GROUPS: Record<string, string[]> = {
  'Inventario': ['Lote eliminado', 'Lote agregado', 'Lote editado', 'Ajuste positivo de stock', 'Ajuste negativo de stock'],
  'Productos': ['Nuevo producto', 'Edición de producto', 'Cambio de precio'],
  'Caja': ['Apertura de caja', 'Cierre de caja'],
  'Ventas': ['Venta registrada'],
  'Compras': ['Compra registrada'],
};

function exportAuditXLSX(logs: ReturnType<typeof useStore.getState>['auditLogs']) {
  const rows = logs.map(l => ({
    Fecha: new Date(l.createdAt).toLocaleString('es-PE'),
    Usuario: l.userName,
    Acción: l.action,
    Entidad: l.entity,
    'ID Entidad': l.entityId,
    Antes: l.before ? JSON.stringify(l.before) : '—',
    Después: l.after ? JSON.stringify(l.after) : '—',
  }));
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = [{ wch: 22 }, { wch: 22 }, { wch: 28 }, { wch: 14 }, { wch: 20 }, { wch: 40 }, { wch: 40 }];
  XLSX.utils.book_append_sheet(wb, ws, 'Auditoría');
  XLSX.writeFile(wb, `auditoria_${new Date().toISOString().split('T')[0]}.xlsx`);
}

export default function Audit() {
  const { auditLogs, users } = useStore();

  const [query, setQuery] = useState('');
  const [userFilter, setUserFilter] = useState('all');
  const [groupFilter, setGroupFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 30;

  const uniqueUsers = useMemo(() => {
    const seen = new Set<string>();
    const list: { id: string; name: string }[] = [];
    auditLogs.forEach(l => { if (!seen.has(l.userId)) { seen.add(l.userId); list.push({ id: l.userId, name: l.userName }); } });
    return list;
  }, [auditLogs]);

  const filtered = useMemo(() => {
    return auditLogs.filter(l => {
      const matchQ = !query || l.action.toLowerCase().includes(query.toLowerCase()) || l.userName.toLowerCase().includes(query.toLowerCase()) || l.entity.toLowerCase().includes(query.toLowerCase());
      const matchU = userFilter === 'all' || l.userId === userFilter;
      const matchG = groupFilter === 'all' || ACTION_GROUPS[groupFilter]?.includes(l.action);
      const logDate = l.createdAt.slice(0, 10);
      const matchFrom = !dateFrom || logDate >= dateFrom;
      const matchTo = !dateTo || logDate <= dateTo;
      return matchQ && matchU && matchG && matchFrom && matchTo;
    });
  }, [auditLogs, query, userFilter, groupFilter, dateFrom, dateTo]);

  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  // Stats
  const today = new Date().toISOString().slice(0, 10);
  const todayCount = auditLogs.filter(l => l.createdAt.startsWith(today)).length;
  const criticalCount = auditLogs.filter(l => ['Lote eliminado', 'Cambio de precio', 'Ajuste negativo de stock'].includes(l.action)).length;

  return (
    <Layout title="Auditoría"
      actions={
        <Button variant="secondary" size="sm" onClick={() => exportAuditXLSX(filtered)}>
          <Download size={14} /> Exportar Excel
        </Button>
      }
    >
      <div className="space-y-4 animate-fadeIn">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Total registros" value={auditLogs.length} icon={<Shield size={18} />} />
          <StatCard label="Hoy" value={todayCount} icon={<Shield size={18} />} variant="info" />
          <StatCard label="Acciones críticas" value={criticalCount} icon={<Shield size={18} />} variant="warning" />
          <StatCard label="Usuarios activos" value={uniqueUsers.length} icon={<Shield size={18} />} variant="success" />
        </div>

        {/* Filters */}
        <Card className="flex flex-wrap gap-3 items-end py-3">
          <div className="relative flex-1 min-w-48">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" value={query} onChange={e => { setQuery(e.target.value); setPage(1); }} placeholder="Buscar acción, usuario..."
              className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-400/50" />
          </div>
          <select value={userFilter} onChange={e => { setUserFilter(e.target.value); setPage(1); }}
            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-700 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-400/50">
            <option value="all">Todos los usuarios</option>
            {uniqueUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
          <select value={groupFilter} onChange={e => { setGroupFilter(e.target.value); setPage(1); }}
            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-700 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-400/50">
            <option value="all">Todas las categorías</option>
            {Object.keys(ACTION_GROUPS).map(g => <option key={g} value={g}>{g}</option>)}
          </select>
          <div className="flex gap-2 items-center">
            <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); }}
              className="px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-700 text-xs font-mono text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-400/50" />
            <span className="text-slate-400 text-xs">–</span>
            <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1); }}
              className="px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-700 text-xs font-mono text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-400/50" />
          </div>
          <span className="text-xs text-slate-400 font-mono ml-auto">{filtered.length} registros</span>
        </Card>

        {/* Log table */}
        <Card padding={false} className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50">
                  {['Fecha y hora', 'Usuario', 'Acción', 'Entidad', 'Detalle', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 font-mono uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {paginated.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-12 text-center text-slate-400 text-sm">No hay registros de auditoría aún</td></tr>
                )}
                {paginated.map(log => {
                  const isExpanded = expandedId === log.id;
                  const hasDiff = log.before || log.after;
                  return (
                    <>
                      <tr key={log.id} className={`hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors ${isExpanded ? 'bg-slate-50 dark:bg-slate-700/30' : ''}`}>
                        <td className="px-4 py-3 font-mono text-xs text-slate-500 whitespace-nowrap">
                          {new Date(log.createdAt).toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'medium' })}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-teal-100 dark:bg-teal-900/40 flex items-center justify-center shrink-0">
                              <span className="text-xs font-bold text-teal-700 dark:text-teal-400">{log.userName.charAt(0)}</span>
                            </div>
                            <span className="text-xs font-medium text-slate-700 dark:text-slate-200 font-display">{log.userName}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={ACTION_COLORS[log.action] ?? 'muted'}>{log.action}</Badge>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500 font-mono">{log.entity}</td>
                        <td className="px-4 py-3 text-xs text-slate-400 font-mono max-w-[180px] truncate">
                          {log.after ? Object.entries(log.after).map(([k, v]) => `${k}: ${v}`).join(' · ') : '—'}
                        </td>
                        <td className="px-4 py-3">
                          {hasDiff && (
                            <button onClick={() => setExpandedId(isExpanded ? null : log.id)}
                              className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 transition-colors">
                              {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            </button>
                          )}
                        </td>
                      </tr>
                      {isExpanded && hasDiff && (
                        <tr key={`${log.id}-detail`} className="bg-slate-50 dark:bg-slate-800/50">
                          <td colSpan={6} className="px-6 py-4">
                            <div className="grid grid-cols-2 gap-4">
                              {log.before && (
                                <div>
                                  <p className="text-xs font-semibold text-red-500 uppercase tracking-wide font-mono mb-1.5">Antes</p>
                                  <div className="bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-800 rounded-lg p-3 space-y-1">
                                    {Object.entries(log.before).map(([k, v]) => (
                                      <div key={k} className="flex justify-between text-xs">
                                        <span className="text-slate-500 font-mono">{k}</span>
                                        <span className="font-mono text-red-600 dark:text-red-400 font-semibold">{String(v)}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {log.after && (
                                <div>
                                  <p className="text-xs font-semibold text-emerald-500 uppercase tracking-wide font-mono mb-1.5">Después</p>
                                  <div className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-800 rounded-lg p-3 space-y-1">
                                    {Object.entries(log.after).map(([k, v]) => (
                                      <div key={k} className="flex justify-between text-xs">
                                        <span className="text-slate-500 font-mono">{k}</span>
                                        <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">{String(v)}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
              <span className="text-xs text-slate-400 font-mono">Página {page} de {totalPages}</span>
              <div className="flex gap-1">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-40 transition-colors">
                  Anterior
                </button>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-40 transition-colors">
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </Layout>
  );
}
