import { useState } from 'react';
import { DollarSign, Plus, Minus, Lock, Unlock, History, FileText, ChevronDown, ChevronUp } from 'lucide-react';
import Layout from '../components/layout/Layout';
import Card, { StatCard } from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import { useStore } from '../store/useStore';
import type { CashClosure, CashMovementType, PaymentMethod } from '../types';

const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  cash: 'Efectivo', yape: 'Yape', plin: 'Plin',
  transfer: 'Transferencia', card: 'Tarjeta', credit: 'Crédito', mixed: 'Mixto',
};

function printClosurePDF(closure: CashClosure, movements: ReturnType<typeof useStore.getState>['cashMovements'], company: string) {
  const fmt = (n: number) => `S/ ${n.toFixed(2)}`;
  const date = new Date(closure.date).toLocaleString('es-PE', { dateStyle: 'long', timeStyle: 'short' });
  const movsHtml = movements
    .filter(m => m.cashRegisterId === closure.cashRegisterId)
    .map(m => `
      <tr>
        <td>${new Date(m.createdAt).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}</td>
        <td>${m.type === 'income' ? 'Ingreso' : m.type === 'expense' ? 'Egreso' : 'Retiro'}</td>
        <td>${m.description}</td>
        <td style="text-align:right;color:${m.type === 'income' ? '#059669' : '#DC2626'}">${m.type === 'income' ? '+' : '-'}${fmt(m.amount)}</td>
      </tr>`).join('');

  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"/>
<title>Cierre de Caja</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: Arial, sans-serif; font-size: 12px; color: #1e293b; padding: 32px; }
  .header { text-align: center; margin-bottom: 24px; border-bottom: 2px solid #0d9488; padding-bottom: 16px; }
  .header h1 { font-size: 20px; color: #0d9488; }
  .header p { color: #64748b; margin-top: 4px; font-size: 11px; }
  .meta { display: flex; justify-content: space-between; margin-bottom: 20px; background: #f8fafc; padding: 12px 16px; border-radius: 8px; }
  .meta div { }
  .meta .label { color: #64748b; font-size: 10px; text-transform: uppercase; letter-spacing: .05em; }
  .meta .val { font-size: 13px; font-weight: 600; margin-top: 2px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
  th { background: #f1f5f9; padding: 8px 10px; text-align: left; font-size: 10px; text-transform: uppercase; color: #64748b; letter-spacing: .05em; }
  td { padding: 7px 10px; border-bottom: 1px solid #f1f5f9; }
  .total-row td { font-weight: 700; border-top: 2px solid #e2e8f0; }
  .diff { padding: 12px 16px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; margin-top: 4px; }
  .diff.ok { background: #ecfdf5; color: #065f46; }
  .diff.bad { background: #fef2f2; color: #991b1b; }
  .section-title { font-size: 11px; text-transform: uppercase; color: #64748b; letter-spacing: .07em; font-weight: 700; margin: 20px 0 8px; }
  .sign { margin-top: 48px; display: flex; justify-content: space-around; }
  .sign div { text-align: center; border-top: 1px solid #94a3b8; padding-top: 8px; width: 160px; font-size: 10px; color: #64748b; }
  @media print { body { padding: 16px; } }
</style></head><body>
<div class="header">
  <h1>${company}</h1>
  <p>Reporte de Cierre de Caja</p>
</div>

<div class="meta">
  <div><div class="label">Fecha de cierre</div><div class="val">${date}</div></div>
  <div><div class="label">Cajero/a</div><div class="val">${closure.userName}</div></div>
  <div><div class="label">N° de caja</div><div class="val">${closure.cashRegisterId.slice(-8).toUpperCase()}</div></div>
</div>

<div class="section-title">Resumen de ventas por método de pago</div>
<table>
  <thead><tr><th>Método</th><th style="text-align:right">Monto</th></tr></thead>
  <tbody>
    <tr><td>Efectivo</td><td style="text-align:right">${fmt(closure.cashSales)}</td></tr>
    <tr><td>Yape</td><td style="text-align:right">${fmt(closure.yapeSales)}</td></tr>
    <tr><td>Plin</td><td style="text-align:right">${fmt(closure.plinSales)}</td></tr>
    <tr><td>Tarjeta</td><td style="text-align:right">${fmt(closure.cardSales)}</td></tr>
    <tr><td>Transferencia</td><td style="text-align:right">${fmt(closure.transferSales)}</td></tr>
    <tr class="total-row"><td>TOTAL VENTAS</td><td style="text-align:right">${fmt(closure.cashSales + closure.yapeSales + closure.plinSales + closure.cardSales + closure.transferSales)}</td></tr>
  </tbody>
</table>

<div class="section-title">Arqueo de caja</div>
<table>
  <thead><tr><th>Concepto</th><th style="text-align:right">Monto</th></tr></thead>
  <tbody>
    <tr><td>Monto inicial</td><td style="text-align:right">${fmt(closure.initialAmount)}</td></tr>
    <tr><td>Ventas en efectivo</td><td style="text-align:right">${fmt(closure.cashSales)}</td></tr>
    <tr><td>Ingresos manuales</td><td style="text-align:right">${fmt(closure.manualIncome)}</td></tr>
    <tr><td>Egresos</td><td style="text-align:right">-${fmt(closure.expenses)}</td></tr>
    <tr><td>Retiros</td><td style="text-align:right">-${fmt(closure.withdrawals)}</td></tr>
    <tr class="total-row"><td>MONTO ESPERADO</td><td style="text-align:right">${fmt(closure.expectedAmount)}</td></tr>
    <tr class="total-row"><td>MONTO CONTADO</td><td style="text-align:right">${fmt(closure.countedAmount)}</td></tr>
  </tbody>
</table>

<div class="diff ${closure.difference === 0 ? 'ok' : 'bad'}">
  <span style="font-weight:700">DIFERENCIA</span>
  <span style="font-size:16px;font-weight:800">${closure.difference >= 0 ? '+' : ''}${fmt(closure.difference)}</span>
</div>

${movsHtml ? `<div class="section-title">Movimientos manuales</div>
<table>
  <thead><tr><th>Hora</th><th>Tipo</th><th>Descripción</th><th style="text-align:right">Monto</th></tr></thead>
  <tbody>${movsHtml}</tbody>
</table>` : ''}

${closure.notes ? `<div class="section-title">Observaciones</div><p style="color:#475569;font-style:italic">${closure.notes}</p>` : ''}

<div class="sign">
  <div>Cajero/a<br/>${closure.userName}</div>
  <div>Administrador/a</div>
</div>
</body></html>`;

  const w = window.open('', '_blank', 'width=800,height=900');
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.onload = () => { w.focus(); w.print(); };
}

export default function CashRegisterPage() {
  const {
    cashRegister, cashMovements, cashClosures, sales,
    openCashRegister, closeCashRegister, addCashMovement, addCashClosure,
    currentUser, settings,
  } = useStore();

  const [openModal, setOpenModal] = useState(false);
  const [closeModal, setCloseModal] = useState(false);
  const [movModal, setMovModal] = useState(false);
  const [closureModal, setClosureModal] = useState<CashClosure | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [initialAmt, setInitialAmt] = useState('200');
  const [countedAmt, setCountedAmt] = useState('');
  const [closeNotes, setCloseNotes] = useState('');
  const [movForm, setMovForm] = useState({ type: 'income' as CashMovementType, amount: '', description: '' });

  const regSales = sales.filter(s => s.cashRegisterId === cashRegister?.id && s.status === 'completed');

  const bySales = (method: PaymentMethod) =>
    regSales.reduce((sum, s) => sum + s.payments.filter(p => p.method === method).reduce((a, p) => a + p.amount, 0), 0);

  const cashSales = bySales('cash');
  const yapeSales = bySales('yape');
  const plinSales = bySales('plin');
  const cardSales = bySales('card');
  const transferSales = bySales('transfer');
  const creditSales = bySales('credit');

  const regMovements = cashMovements.filter(m => m.cashRegisterId === cashRegister?.id);
  const manualIncome = regMovements.filter(m => m.type === 'income').reduce((s, m) => s + m.amount, 0);
  const expenses = regMovements.filter(m => m.type === 'expense').reduce((s, m) => s + m.amount, 0);
  const withdrawals = regMovements.filter(m => m.type === 'withdrawal').reduce((s, m) => s + m.amount, 0);

  const totalSales = cashSales + yapeSales + plinSales + cardSales + transferSales + creditSales;
  const expectedAmount = (cashRegister?.initialAmount ?? 0) + cashSales + manualIncome - expenses - withdrawals;
  const counted = parseFloat(countedAmt) || 0;
  const difference = counted - expectedAmount;

  const handleOpen = () => {
    openCashRegister(parseFloat(initialAmt) || 0);
    setOpenModal(false);
  };

  const handleClose = () => {
    const closure: CashClosure = {
      id: `cl-${Date.now()}`,
      cashRegisterId: cashRegister!.id,
      date: new Date().toISOString(),
      userId: currentUser!.id,
      userName: currentUser!.name,
      initialAmount: cashRegister!.initialAmount,
      cashSales, yapeSales, plinSales, cardSales, transferSales,
      creditSales, otherSales: 0,
      manualIncome, expenses, withdrawals, returns: 0,
      expectedAmount,
      countedAmount: counted,
      difference,
      notes: closeNotes,
    };
    addCashClosure(closure);
    closeCashRegister();
    setCloseModal(false);
    setCountedAmt('');
    setCloseNotes('');
    setClosureModal(closure);
  };

  const handleAddMovement = () => {
    if (!movForm.amount || !movForm.description) return;
    addCashMovement({
      cashRegisterId: cashRegister!.id,
      type: movForm.type,
      amount: parseFloat(movForm.amount),
      description: movForm.description,
      userId: currentUser!.id,
      userName: currentUser!.name,
      createdAt: new Date().toISOString(),
    });
    setMovModal(false);
    setMovForm({ type: 'income', amount: '', description: '' });
  };

  const companyName = settings?.name ?? 'Farmacia';
  const isAdmin = currentUser?.role === 'admin';

  return (
    <Layout title="Caja"
      actions={
        cashRegister?.status === 'open'
          ? <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => setMovModal(true)}><Plus size={14} /> Movimiento</Button>
              <Button variant="danger" size="sm" onClick={() => setCloseModal(true)}><Lock size={14} /> Cerrar caja</Button>
            </div>
          : <Button size="sm" onClick={() => setOpenModal(true)}><Unlock size={14} /> Abrir caja</Button>
      }
    >
      <div className="space-y-4 animate-fadeIn">
        {/* Status bar */}
        <Card className={`border-l-4 ${cashRegister?.status === 'open' ? 'border-l-emerald-500' : 'border-l-slate-300'}`}>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Badge variant={cashRegister?.status === 'open' ? 'success' : 'muted'}>
                  {cashRegister?.status === 'open' ? '● Caja abierta' : '● Caja cerrada'}
                </Badge>
                {cashRegister && (
                  <span className="text-xs text-slate-400 font-mono">
                    {cashRegister.status === 'open'
                      ? `Abierta por ${cashRegister.userName} · ${new Date(cashRegister.openedAt).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}`
                      : `Cerrada · ${new Date(cashRegister.closedAt ?? cashRegister.openedAt).toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' })}`}
                  </span>
                )}
              </div>
              {cashRegister?.status === 'open' && (
                <p className="text-xs text-slate-400 font-mono mt-1">Monto inicial: S/ {cashRegister.initialAmount.toFixed(2)}</p>
              )}
            </div>
            {cashRegister?.status === 'open' && (
              <div className="text-right">
                <p className="text-xs text-slate-400 font-mono">Efectivo esperado</p>
                <p className="text-2xl font-bold text-teal-700 dark:text-teal-400 font-mono">S/ {expectedAmount.toFixed(2)}</p>
              </div>
            )}
          </div>
        </Card>

        {cashRegister?.status === 'open' && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                { label: 'Efectivo', value: cashSales },
                { label: 'Yape', value: yapeSales },
                { label: 'Plin', value: plinSales },
                { label: 'Tarjeta', value: cardSales },
                { label: 'Transferencia', value: transferSales },
                { label: 'Total ventas', value: totalSales },
              ].map(item => (
                <Card key={item.label}>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400 font-mono uppercase tracking-wide">{item.label}</p>
                  <p className="text-xl font-bold text-slate-900 dark:text-slate-100 font-mono mt-1">S/ {item.value.toFixed(2)}</p>
                </Card>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2">
                <Card padding={false}>
                  <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700">
                    <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 font-display">Ventas del turno</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50">
                          {['Nº Venta', 'Hora', 'Vendedor', 'Total', 'Método'].map(h => (
                            <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 font-mono uppercase tracking-wide">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                        {regSales.slice(0, 10).map(s => (
                          <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                            <td className="px-4 py-2.5 font-mono text-xs text-teal-700 dark:text-teal-400">{s.number}</td>
                            <td className="px-4 py-2.5 font-mono text-xs text-slate-500">{new Date(s.date).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}</td>
                            <td className="px-4 py-2.5 text-xs text-slate-600 dark:text-slate-300 font-display">{s.userName}</td>
                            <td className="px-4 py-2.5 font-mono font-bold text-slate-800 dark:text-slate-100">S/ {s.total.toFixed(2)}</td>
                            <td className="px-4 py-2.5 text-xs text-slate-500 font-display">{s.payments.map(p => PAYMENT_LABELS[p.method]).join(', ')}</td>
                          </tr>
                        ))}
                        {regSales.length === 0 && (
                          <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400 text-xs">Sin ventas en este turno</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </div>

              <Card padding={false}>
                <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700">
                  <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 font-display">Movimientos</h3>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-slate-700 max-h-64 overflow-y-auto">
                  {regMovements.map(m => (
                    <div key={m.id} className="px-4 py-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${m.type === 'income' ? 'bg-emerald-100 text-emerald-600' : m.type === 'withdrawal' ? 'bg-amber-100 text-amber-600' : 'bg-red-100 text-red-500'}`}>
                          {m.type === 'income' ? <Plus size={12} /> : <Minus size={12} />}
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-slate-700 dark:text-slate-200 truncate">{m.description}</p>
                          <p className="text-xs text-slate-400 font-mono">{new Date(m.createdAt).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                      </div>
                      <p className={`text-sm font-bold font-mono shrink-0 ${m.type === 'income' ? 'text-emerald-600' : 'text-red-500'}`}>
                        {m.type === 'income' ? '+' : '-'}S/ {m.amount.toFixed(2)}
                      </p>
                    </div>
                  ))}
                  {regMovements.length === 0 && (
                    <p className="text-xs text-slate-400 text-center py-8">Sin movimientos manuales</p>
                  )}
                </div>
              </Card>
            </div>
          </>
        )}

        {(!cashRegister || cashRegister.status === 'closed') && cashClosures.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
              <Lock size={24} className="text-slate-400" />
            </div>
            <p className="text-slate-500 dark:text-slate-400 font-display text-sm">La caja está cerrada.</p>
            <Button onClick={() => setOpenModal(true)}><Unlock size={14} /> Abrir caja</Button>
          </div>
        )}

        {/* Closure history — visible to admins always, to others when caja is closed */}
        {(isAdmin || cashRegister?.status === 'closed') && cashClosures.length > 0 && (
          <Card padding={false}>
            <button
              onClick={() => setHistoryOpen(h => !h)}
              className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors rounded-xl"
            >
              <div className="flex items-center gap-2">
                <History size={16} className="text-teal-600" />
                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 font-display">
                  Historial de cierres
                  {isAdmin && <span className="ml-2 text-xs font-normal text-slate-400">· solo administrador</span>}
                </h3>
                <Badge variant="primary">{cashClosures.length}</Badge>
              </div>
              {historyOpen ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
            </button>

            {historyOpen && (
              <div className="border-t border-slate-100 dark:border-slate-700 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-700/50">
                      {['Fecha y hora', 'Cajero/a', 'Total ventas', 'Monto esperado', 'Monto contado', 'Diferencia', 'Acciones'].map(h => (
                        <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 font-mono uppercase tracking-wide whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                    {cashClosures.map(cl => {
                      const totalV = cl.cashSales + cl.yapeSales + cl.plinSales + cl.cardSales + cl.transferSales + cl.creditSales;
                      const diffOk = Math.abs(cl.difference) < 0.01;
                      return (
                        <tr key={cl.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                          <td className="px-4 py-3 font-mono text-xs text-slate-600 dark:text-slate-300">
                            {new Date(cl.date).toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' })}
                          </td>
                          <td className="px-4 py-3 text-sm font-display text-slate-700 dark:text-slate-200">{cl.userName}</td>
                          <td className="px-4 py-3 font-mono text-sm font-semibold text-slate-800 dark:text-slate-100">S/ {totalV.toFixed(2)}</td>
                          <td className="px-4 py-3 font-mono text-xs text-slate-500">S/ {cl.expectedAmount.toFixed(2)}</td>
                          <td className="px-4 py-3 font-mono text-xs text-slate-500">S/ {cl.countedAmount.toFixed(2)}</td>
                          <td className="px-4 py-3">
                            <Badge variant={diffOk ? 'success' : cl.difference > 0 ? 'info' : 'danger'}>
                              {cl.difference >= 0 ? '+' : ''}S/ {cl.difference.toFixed(2)}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            <button onClick={() => setClosureModal(cl)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-400 text-xs font-medium font-display hover:bg-teal-100 dark:hover:bg-teal-900/40 transition-colors">
                              <FileText size={12} /> Ver / PDF
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )}
      </div>

      {/* ── Open modal ─────────────────────────────────────────────────────── */}
      <Modal open={openModal} onClose={() => setOpenModal(false)} title="Apertura de caja" width="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpenModal(false)}>Cancelar</Button>
            <Button onClick={handleOpen}><Unlock size={14} /> Abrir caja</Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-400">Ingresa el monto inicial en efectivo para comenzar el turno.</p>
          <div>
            <label className="text-xs font-medium text-slate-600 dark:text-slate-400 block mb-1 font-display">Monto inicial (S/)</label>
            <input type="number" min="0" step="0.01" value={initialAmt} onChange={e => setInitialAmt(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-700 text-lg font-bold font-mono text-teal-700 dark:text-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-400/50 text-center" />
          </div>
        </div>
      </Modal>

      {/* ── Close modal ────────────────────────────────────────────────────── */}
      <Modal open={closeModal} onClose={() => setCloseModal(false)} title="Cierre de caja" width="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCloseModal(false)}>Cancelar</Button>
            <Button variant="danger" onClick={handleClose}><Lock size={14} /> Confirmar cierre</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 space-y-2">
            {[
              ['Monto inicial', cashRegister?.initialAmount ?? 0],
              ['Ventas efectivo', cashSales],
              ['Ingresos manuales', manualIncome],
              ['Egresos', expenses],
              ['Retiros', withdrawals],
            ].map(([label, value]) => (
              <div key={label as string} className="flex justify-between text-sm">
                <span className="text-slate-500 font-display">{label as string}</span>
                <span className="font-mono text-slate-700 dark:text-slate-200">S/ {(value as number).toFixed(2)}</span>
              </div>
            ))}
            <div className="border-t border-slate-200 dark:border-slate-600 pt-2 flex justify-between">
              <span className="font-semibold text-slate-700 dark:text-slate-200 font-display">Monto esperado</span>
              <span className="font-bold font-mono text-teal-700 dark:text-teal-400">S/ {expectedAmount.toFixed(2)}</span>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-600 dark:text-slate-400 block mb-1 font-display">Monto contado (S/)</label>
            <input type="number" min="0" step="0.01" value={countedAmt} onChange={e => setCountedAmt(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-700 text-sm font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-400/50" />
          </div>

          {countedAmt && (
            <div className={`flex justify-between p-3 rounded-xl ${difference === 0 ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
              <span className="text-sm font-semibold font-display">Diferencia</span>
              <span className={`text-sm font-bold font-mono ${difference >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                {difference >= 0 ? '+' : ''}S/ {difference.toFixed(2)}
              </span>
            </div>
          )}

          <div>
            <label className="text-xs font-medium text-slate-600 dark:text-slate-400 block mb-1 font-display">Observaciones</label>
            <textarea value={closeNotes} onChange={e => setCloseNotes(e.target.value)} rows={2}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-700 text-sm text-slate-900 dark:text-slate-100 resize-none focus:outline-none focus:ring-2 focus:ring-teal-400/50"
              placeholder="Notas del cierre..." />
          </div>
        </div>
      </Modal>

      {/* ── Movement modal ─────────────────────────────────────────────────── */}
      <Modal open={movModal} onClose={() => setMovModal(false)} title="Registrar movimiento" width="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setMovModal(false)}>Cancelar</Button>
            <Button onClick={handleAddMovement} disabled={!movForm.amount || !movForm.description}>Registrar</Button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-slate-600 dark:text-slate-400 block mb-2 font-display">Tipo</label>
            <div className="flex gap-2">
              {([['income', 'Ingreso', '#059669'], ['expense', 'Egreso', '#DC2626'], ['withdrawal', 'Retiro', '#D97706']] as [CashMovementType, string, string][]).map(([v, l, color]) => (
                <button key={v} onClick={() => setMovForm(f => ({ ...f, type: v }))}
                  style={movForm.type === v ? { backgroundColor: color, color: 'white' } : {}}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium font-display transition-all ${movForm.type !== v ? 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300' : ''}`}>
                  {l}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 dark:text-slate-400 block mb-1 font-display">Monto (S/)</label>
            <input type="number" min="0" step="0.01" value={movForm.amount} onChange={e => setMovForm(f => ({ ...f, amount: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-700 text-sm font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-400/50" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 dark:text-slate-400 block mb-1 font-display">Descripción *</label>
            <input value={movForm.description} onChange={e => setMovForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Ej: Compra de materiales, Retiro para depósito..."
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-700 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-400/50" />
          </div>
        </div>
      </Modal>

      {/* ── Closure detail modal ───────────────────────────────────────────── */}
      {closureModal && (
        <Modal open={!!closureModal} onClose={() => setClosureModal(null)} title="Resumen de cierre de caja" width="md"
          footer={
            <>
              <Button variant="secondary" onClick={() => setClosureModal(null)}>Cerrar</Button>
              <Button onClick={() => printClosurePDF(closureModal, cashMovements, companyName)}>
                <FileText size={14} /> Descargar / Imprimir PDF
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            {/* Header info */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-3">
                <p className="text-xs text-slate-400 font-mono">Fecha de cierre</p>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 font-display mt-0.5">
                  {new Date(closureModal.date).toLocaleString('es-PE', { dateStyle: 'medium', timeStyle: 'short' })}
                </p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-3">
                <p className="text-xs text-slate-400 font-mono">Cajero/a</p>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 font-display mt-0.5">{closureModal.userName}</p>
              </div>
            </div>

            {/* Sales by method */}
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide font-mono mb-2">Ventas por método</p>
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700">
                {[
                  ['Efectivo', closureModal.cashSales],
                  ['Yape', closureModal.yapeSales],
                  ['Plin', closureModal.plinSales],
                  ['Tarjeta', closureModal.cardSales],
                  ['Transferencia', closureModal.transferSales],
                ].map(([l, v]) => (
                  <div key={l as string} className="flex justify-between px-4 py-2.5 text-sm">
                    <span className="text-slate-600 dark:text-slate-300 font-display">{l as string}</span>
                    <span className="font-mono font-medium text-slate-800 dark:text-slate-100">S/ {(v as number).toFixed(2)}</span>
                  </div>
                ))}
                <div className="flex justify-between px-4 py-2.5 bg-teal-50 dark:bg-teal-900/20 rounded-b-xl">
                  <span className="font-semibold text-teal-700 dark:text-teal-400 font-display">Total ventas</span>
                  <span className="font-bold font-mono text-teal-700 dark:text-teal-400">
                    S/ {(closureModal.cashSales + closureModal.yapeSales + closureModal.plinSales + closureModal.cardSales + closureModal.transferSales).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Arqueo */}
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide font-mono mb-2">Arqueo de caja</p>
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700">
                {[
                  ['Monto inicial', closureModal.initialAmount, false],
                  ['Ventas efectivo', closureModal.cashSales, false],
                  ['Ingresos manuales', closureModal.manualIncome, false],
                  ['Egresos', closureModal.expenses, true],
                  ['Retiros', closureModal.withdrawals, true],
                ].map(([l, v, neg]) => (
                  <div key={l as string} className="flex justify-between px-4 py-2.5 text-sm">
                    <span className="text-slate-600 dark:text-slate-300 font-display">{l as string}</span>
                    <span className={`font-mono ${neg ? 'text-red-500' : 'text-slate-700 dark:text-slate-200'}`}>
                      {neg ? '−' : ''}S/ {(v as number).toFixed(2)}
                    </span>
                  </div>
                ))}
                <div className="flex justify-between px-4 py-2.5 text-sm font-semibold border-t-2 border-slate-200 dark:border-slate-600">
                  <span className="font-display text-slate-700 dark:text-slate-200">Monto esperado</span>
                  <span className="font-mono text-teal-700 dark:text-teal-400">S/ {closureModal.expectedAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between px-4 py-2.5 text-sm font-semibold">
                  <span className="font-display text-slate-700 dark:text-slate-200">Monto contado</span>
                  <span className="font-mono text-slate-800 dark:text-slate-100">S/ {closureModal.countedAmount.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Difference */}
            <div className={`flex justify-between items-center p-4 rounded-xl ${Math.abs(closureModal.difference) < 0.01 ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
              <span className="text-sm font-semibold font-display">Diferencia</span>
              <span className={`text-xl font-bold font-mono ${closureModal.difference >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                {closureModal.difference >= 0 ? '+' : ''}S/ {closureModal.difference.toFixed(2)}
              </span>
            </div>

            {closureModal.notes && (
              <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800 rounded-xl px-4 py-3">
                <p className="text-xs text-amber-600 dark:text-amber-400 font-mono uppercase tracking-wide mb-1">Observaciones</p>
                <p className="text-sm text-slate-700 dark:text-slate-200">{closureModal.notes}</p>
              </div>
            )}
          </div>
        </Modal>
      )}
    </Layout>
  );
}
