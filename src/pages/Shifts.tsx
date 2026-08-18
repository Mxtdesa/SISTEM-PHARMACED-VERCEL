import { useState, useMemo } from 'react';
import { Clock, Plus, Edit2, Trash2, CheckCircle2, PlayCircle, Calendar, Users, TrendingUp, ChevronLeft, ChevronRight } from 'lucide-react';
import Layout from '../components/layout/Layout';
import Card, { StatCard } from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import { useStore } from '../store/useStore';
import type { Shift } from '../types';

const STATUS_CONFIG = {
  scheduled: { label: 'Programado', badge: 'info' as const },
  active:    { label: 'En turno',   badge: 'success' as const },
  completed: { label: 'Completado', badge: 'muted' as const },
};

const todayStr = new Date().toISOString().split('T')[0];

function weekDates(anchor: Date) {
  const d = new Date(anchor);
  d.setDate(d.getDate() - d.getDay() + 1); // Monday
  return Array.from({ length: 7 }, (_, i) => {
    const dd = new Date(d);
    dd.setDate(d.getDate() + i);
    return dd.toISOString().split('T')[0];
  });
}

const DAY_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

export default function Shifts() {
  const { shifts, users, sales, addShift, updateShift, deleteShift, currentUser } = useStore();
  const isAdmin = currentUser?.role === 'admin';

  const [view, setView] = useState<'week' | 'list'>('week');
  const [weekAnchor, setWeekAnchor] = useState(new Date());
  const [modalOpen, setModalOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [form, setForm] = useState({ userId: '', date: todayStr, startTime: '08:00', endTime: '16:00', notes: '' });

  const week = weekDates(weekAnchor);
  const sellers = users.filter(u => u.active && ['seller', 'pharmacist', 'admin'].includes(u.role));

  const openNew = (date?: string) => {
    setEditingShift(null);
    setForm({ userId: sellers[0]?.id ?? '', date: date ?? todayStr, startTime: '08:00', endTime: '16:00', notes: '' });
    setModalOpen(true);
  };

  const openEdit = (s: Shift) => {
    setEditingShift(s);
    setForm({ userId: s.userId, date: s.date, startTime: s.startTime, endTime: s.endTime, notes: s.notes });
    setModalOpen(true);
  };

  const handleSave = () => {
    const user = users.find(u => u.id === form.userId);
    if (!form.userId || !form.date || !form.startTime || !form.endTime || !user) return;
    if (editingShift) {
      updateShift(editingShift.id, { ...form, userName: user.name });
    } else {
      addShift({ id: `sh-${Date.now()}`, ...form, userName: user.name, status: 'scheduled' });
    }
    setModalOpen(false);
  };

  const setStatus = (id: string, status: Shift['status']) => updateShift(id, { status });

  const handleDelete = (id: string) => {
    if (confirm('¿Eliminar este turno?')) deleteShift(id);
  };

  // Sales per user (last 30 days)
  const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 30);
  const salesByUser = useMemo(() => {
    const map: Record<string, { total: number; count: number }> = {};
    sales.filter(s => s.status === 'completed' && new Date(s.date) >= cutoff).forEach(s => {
      if (!map[s.userId]) map[s.userId] = { total: 0, count: 0 };
      map[s.userId].total += s.total;
      map[s.userId].count++;
    });
    return map;
  }, [sales]);

  // Today's shifts
  const todayShifts = shifts.filter(s => s.date === todayStr).sort((a, b) => a.startTime.localeCompare(b.startTime));
  const activeCount = shifts.filter(s => s.status === 'active').length;
  const weekShifts = shifts.filter(s => week.includes(s.date));

  return (
    <Layout title="Turnos"
      actions={
        isAdmin && <Button size="sm" onClick={() => openNew()}><Plus size={14} /> Asignar turno</Button>
      }
    >
      <div className="space-y-4 animate-fadeIn">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="En turno ahora" value={activeCount} icon={<PlayCircle size={18} />} variant={activeCount > 0 ? 'success' : 'default'} />
          <StatCard label="Turnos hoy" value={todayShifts.length} icon={<Calendar size={18} />} />
          <StatCard label="Esta semana" value={weekShifts.length} icon={<Clock size={18} />} />
          <StatCard label="Vendedores" value={sellers.length} icon={<Users size={18} />} />
        </div>

        {/* View toggle */}
        <Card className="flex items-center justify-between py-2.5">
          <div className="flex rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
            {(['week', 'list', 'payroll'] as const).map(v => (
              <button key={v} onClick={() => setView(v as any)}
                className={`px-4 py-1.5 text-xs font-medium font-display transition-colors ${view === (v as any) ? 'bg-teal-600 text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>
                {v === 'week' ? 'Semana' : v === 'list' ? 'Lista de Turnos' : 'Pagos a Personal'}
              </button>
            ))}
          </div>
          {view === 'week' && (
            <div className="flex items-center gap-2 ml-2">
              <button onClick={() => { const d = new Date(weekAnchor); d.setDate(d.getDate() - 7); setWeekAnchor(d); }}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 transition-colors"><ChevronLeft size={14} /></button>
              <span className="text-xs font-mono text-slate-600 dark:text-slate-300">
                {new Date(week[0]).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })} – {new Date(week[6]).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })}
              </span>
              <button onClick={() => { const d = new Date(weekAnchor); d.setDate(d.getDate() + 7); setWeekAnchor(d); }}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 transition-colors"><ChevronRight size={14} /></button>
            </div>
          )}
        </Card>

        {/* Week view */}
        {view === 'week' && (
          <Card padding={false} className="overflow-x-auto">
            <div className="grid grid-cols-7 min-w-[700px]">
              {week.map((date, di) => {
                const isToday = date === todayStr;
                const dayShifts = shifts.filter(s => s.date === date).sort((a, b) => a.startTime.localeCompare(b.startTime));
                return (
                  <div key={date} className={`border-r last:border-r-0 border-slate-100 dark:border-slate-700 ${isToday ? 'bg-teal-50/50 dark:bg-teal-900/10' : ''}`}>
                    {/* Day header */}
                    <div className={`px-3 py-3 border-b border-slate-100 dark:border-slate-700 text-center ${isToday ? 'bg-teal-600 text-white' : ''}`}>
                      <p className={`text-xs font-semibold font-mono uppercase tracking-wide ${isToday ? 'text-teal-100' : 'text-slate-400'}`}>{DAY_LABELS[di]}</p>
                      <p className={`text-lg font-bold font-display mt-0.5 ${isToday ? 'text-white' : 'text-slate-800 dark:text-slate-100'}`}>
                        {new Date(date + 'T12:00:00').getDate()}
                      </p>
                    </div>
                    {/* Shifts */}
                    <div className="p-2 space-y-1.5 min-h-24">
                      {dayShifts.map(s => (
                        <div key={s.id}
                          className={`rounded-lg px-2 py-1.5 text-xs cursor-pointer group transition-all
                            ${s.status === 'active' ? 'bg-emerald-100 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-700' :
                              s.status === 'completed' ? 'bg-slate-100 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 opacity-70' :
                              'bg-sky-100 dark:bg-sky-900/30 border border-sky-200 dark:border-sky-700'}`}
                          onClick={() => isAdmin && openEdit(s)}>
                          <p className={`font-semibold truncate font-display ${s.status === 'active' ? 'text-emerald-700 dark:text-emerald-300' : s.status === 'completed' ? 'text-slate-500' : 'text-sky-700 dark:text-sky-300'}`}>
                            {s.userName.split(' ')[0]}
                          </p>
                          <p className={`font-mono mt-0.5 ${s.status === 'active' ? 'text-emerald-600' : 'text-slate-400'}`}>
                            {s.startTime}–{s.endTime}
                          </p>
                        </div>
                      ))}
                      {isAdmin && (
                        <button onClick={() => openNew(date)}
                          className="w-full rounded-lg border-2 border-dashed border-slate-200 dark:border-slate-600 py-1 text-xs text-slate-300 dark:text-slate-600 hover:border-teal-300 hover:text-teal-400 transition-colors">
                          +
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {/* List view */}
        {view === 'list' && (
          <Card padding={false}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50">
                    {['Vendedor', 'Fecha', 'Horario', 'Estado', 'Ventas del turno', ...(isAdmin ? ['Acciones'] : [])].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 font-mono uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                  {shifts.length === 0 && (
                    <tr><td colSpan={6} className="px-4 py-12 text-center text-slate-400 text-sm">No hay turnos registrados</td></tr>
                  )}
                  {[...shifts].sort((a, b) => b.date.localeCompare(a.date) || a.startTime.localeCompare(b.startTime)).map(s => {
                    const shiftSales = sales.filter(sale =>
                      sale.userId === s.userId &&
                      sale.date.startsWith(s.date) &&
                      sale.status === 'completed' &&
                      sale.date.slice(11, 16) >= s.startTime &&
                      sale.date.slice(11, 16) <= s.endTime
                    );
                    const shiftTotal = shiftSales.reduce((sum, sale) => sum + sale.total, 0);
                    return (
                      <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-semibold text-slate-800 dark:text-slate-100 font-display">{s.userName}</p>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-500">
                          {new Date(s.date + 'T12:00:00').toLocaleDateString('es-PE', { weekday: 'short', day: '2-digit', month: 'short' })}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-600 dark:text-slate-300">{s.startTime} – {s.endTime}</td>
                        <td className="px-4 py-3"><Badge variant={STATUS_CONFIG[s.status].badge}>{STATUS_CONFIG[s.status].label}</Badge></td>
                        <td className="px-4 py-3">
                          <p className="font-mono font-bold text-teal-700 dark:text-teal-400 text-sm">S/ {shiftTotal.toFixed(2)}</p>
                          <p className="text-xs text-slate-400 font-mono">{shiftSales.length} ventas</p>
                        </td>
                        {isAdmin && (
                          <td className="px-4 py-3">
                            <div className="flex gap-1">
                              {s.status === 'scheduled' && (
                                <button onClick={() => setStatus(s.id, 'active')} title="Iniciar turno"
                                  className="p-1.5 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-slate-400 hover:text-emerald-600 transition-colors">
                                  <PlayCircle size={14} />
                                </button>
                              )}
                              {s.status === 'active' && (
                                <button onClick={() => setStatus(s.id, 'completed')} title="Cerrar turno"
                                  className="p-1.5 rounded-lg hover:bg-teal-50 dark:hover:bg-teal-900/20 text-slate-400 hover:text-teal-600 transition-colors">
                                  <CheckCircle2 size={14} />
                                </button>
                              )}
                              <button onClick={() => openEdit(s)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-teal-600 transition-colors">
                                <Edit2 size={14} />
                              </button>
                              <button onClick={() => handleDelete(s.id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 transition-colors">
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Payroll View */}
        {view === ('payroll' as any) && (
          <div className="space-y-4">
            <Card className="flex items-center justify-between py-3">
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 font-display">Recordatorio de Pagos a Personal / Planilla</h3>
                <p className="text-xs text-slate-400">Gestiona las fechas de pago, quincenas y salarios del equipo</p>
              </div>
              {isAdmin && (
                <Button size="sm" onClick={() => {
                  const name = prompt('Nombre del personal / vendedor:');
                  if (!name) return;
                  const amount = parseFloat(prompt('Monto a pagar (S/):') || '0');
                  if (amount <= 0) return;
                  const dueDate = prompt('Fecha límite de pago (AAAA-MM-DD):', todayStr);
                  if (!dueDate) return;
                  const period = prompt('Periodo (ej: Quincena Agosto, Mes Completo):', 'Mes Completo');
                  
                  useStore.getState().addPayrollReminder({
                    userId: 'manual',
                    userName: name,
                    amount,
                    dueDate,
                    period: period || 'Mes Completo',
                    status: 'pending',
                    notes: 'Registrado manualmente'
                  });
                }}>
                  <Plus size={14} /> Registrar Pago
                </Button>
              )}
            </Card>

            <Card padding={false}>
              <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700">
                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 font-display">Historial y Pendientes de Pago</h3>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50">
                    {['Personal', 'Periodo', 'Fecha Límite', 'Monto', 'Estado', 'Acciones'].map(h => (
                      <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 font-mono uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                  {useStore.getState().payrollReminders.map(p => (
                    <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                      <td className="px-4 py-3 font-display font-medium text-slate-800 dark:text-slate-100">{p.userName}</td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-500">{p.period}</td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-600 dark:text-slate-300">{p.dueDate}</td>
                      <td className="px-4 py-3 font-mono font-bold text-teal-600">S/ {p.amount.toFixed(2)}</td>
                      <td className="px-4 py-3">
                        <Badge variant={p.status === 'paid' ? 'success' : 'danger'}>
                          {p.status === 'paid' ? 'Pagado' : 'Pendiente'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => useStore.getState().updatePayrollReminder(p.id, { status: p.status === 'paid' ? 'pending' : 'paid' })}
                            className="px-2 py-1 text-xs font-medium rounded bg-teal-50 text-teal-700 hover:bg-teal-100"
                          >
                            Marcar {p.status === 'paid' ? 'Pendiente' : 'Pagado'}
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`¿Eliminar recordatorio de ${p.userName}?`)) {
                                useStore.getState().deletePayrollReminder(p.id);
                              }
                            }}
                            className="p-1 text-red-500 hover:text-red-700"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {useStore.getState().payrollReminders.length === 0 && (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400 text-sm">No hay recordatorios de pagos registrados</td></tr>
                  )}
                </tbody>
              </table>
            </Card>
          </div>
        )}

        {/* Performance per seller */}
        <Card padding={false}>
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2">
            <TrendingUp size={16} className="text-teal-600" />
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 font-display">Rendimiento de vendedores · últimos 30 días</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50">
                  {['Vendedor', 'Rol', 'N° Ventas', 'Total vendido', 'Ticket promedio', 'Turnos asignados'].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 font-mono uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {sellers.map(u => {
                  const stats = salesByUser[u.id] ?? { total: 0, count: 0 };
                  const avg = stats.count > 0 ? stats.total / stats.count : 0;
                  const userShifts = shifts.filter(s => s.userId === u.id).length;
                  return (
                    <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-teal-100 dark:bg-teal-900/40 flex items-center justify-center shrink-0">
                            <span className="text-xs font-bold text-teal-700 dark:text-teal-400 font-display">{u.name.charAt(0)}</span>
                          </div>
                          <span className="font-semibold text-slate-800 dark:text-slate-100 font-display">{u.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3"><Badge variant="muted">{u.role}</Badge></td>
                      <td className="px-4 py-3 font-mono text-sm font-bold text-slate-700 dark:text-slate-200">{stats.count}</td>
                      <td className="px-4 py-3 font-mono text-sm font-bold text-teal-700 dark:text-teal-400">S/ {stats.total.toFixed(2)}</td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-500">S/ {avg.toFixed(2)}</td>
                      <td className="px-4 py-3 font-mono text-sm text-slate-600 dark:text-slate-300">{userShifts}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Shift modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingShift ? 'Editar turno' : 'Asignar turno'} width="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={!form.userId || !form.date}>Guardar</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-600 dark:text-slate-400 block mb-1 font-display">Vendedor *</label>
            <select value={form.userId} onChange={e => setForm(f => ({ ...f, userId: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-700 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-400/50">
              <option value="">Seleccionar...</option>
              {sellers.map(u => <option key={u.id} value={u.id}>{u.name} · {u.role}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 dark:text-slate-400 block mb-1 font-display">Fecha *</label>
            <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-700 text-sm font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-400/50" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400 block mb-1 font-display">Hora inicio</label>
              <input type="time" value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-700 text-sm font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-400/50" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400 block mb-1 font-display">Hora fin</label>
              <input type="time" value={form.endTime} onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-700 text-sm font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-400/50" />
            </div>
          </div>
          {editingShift && (
            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400 block mb-2 font-display">Estado</label>
              <div className="flex gap-2">
                {(['scheduled', 'active', 'completed'] as Shift['status'][]).map(st => (
                  <button key={st}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-medium font-display transition-all ${editingShift.status === st ? 'bg-teal-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500'}`}
                    onClick={() => { updateShift(editingShift.id, { status: st }); setEditingShift({ ...editingShift, status: st }); }}>
                    {STATUS_CONFIG[st].label}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div>
            <label className="text-xs font-medium text-slate-600 dark:text-slate-400 block mb-1 font-display">Notas</label>
            <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Ej: Turno mañana, caja 1..."
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-700 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-400/50" />
          </div>
        </div>
      </Modal>
    </Layout>
  );
}
