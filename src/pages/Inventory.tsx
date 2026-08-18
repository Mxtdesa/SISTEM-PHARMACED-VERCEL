import { useState } from 'react';
import { Search, AlertTriangle, Clock, XCircle, Package, ArrowUpDown, Plus, Edit2, Trash2, Eye } from 'lucide-react';
import Layout from '../components/layout/Layout';
import Card, { StatCard } from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import { useStore } from '../store/useStore';
import type { ProductBatch } from '../types';

export default function Inventory() {
  const { products, batches, settings, adjustStock, getProductStock, addBatch, updateBatch, deleteBatch } = useStore();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');

  // Adjust modal
  const [adjustModal, setAdjustModal] = useState<string | null>(null);
  const [adjQty, setAdjQty] = useState('');
  const [adjType, setAdjType] = useState<'adjustment_positive' | 'adjustment_negative'>('adjustment_positive');
  const [adjReason, setAdjReason] = useState('');

  // Batch modal
  const [batchModal, setBatchModal] = useState<string | null>(null); // productId
  const [editingBatch, setEditingBatch] = useState<ProductBatch | null>(null);
  const [batchForm, setBatchForm] = useState<Omit<ProductBatch, 'id' | 'productId'>>({
    lotNumber: '', expiryDate: '', entryDate: new Date().toISOString().split('T')[0],
    quantity: 0, costPrice: 0, supplierId: '',
  });

  const now = new Date('2025-08-16');
  const alertDate = new Date(now);
  alertDate.setDate(alertDate.getDate() + settings.expiryAlertDays);

  const getProductBatches = (productId: string) =>
    batches.filter(b => b.productId === productId).sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());

  const getStatus = (productId: string): 'ok' | 'low' | 'critical' | 'out' | 'expiring' | 'expired' => {
    const stock = getProductStock(productId);
    const product = products.find(p => p.id === productId)!;
    const prodBatches = getProductBatches(productId);
    if (prodBatches.some(b => new Date(b.expiryDate) < now && b.quantity > 0)) return 'expired';
    if (prodBatches.some(b => new Date(b.expiryDate) <= alertDate && new Date(b.expiryDate) >= now && b.quantity > 0)) return 'expiring';
    if (stock === 0) return 'out';
    if (stock <= product.minStock * 0.5) return 'critical';
    if (stock <= product.minStock) return 'low';
    return 'ok';
  };

  const statusConfig = {
    ok: { label: 'Normal', badge: 'success' as const },
    low: { label: 'Stock bajo', badge: 'warning' as const },
    critical: { label: 'Stock crítico', badge: 'danger' as const },
    out: { label: 'Agotado', badge: 'danger' as const },
    expiring: { label: 'Por vencer', badge: 'warning' as const },
    expired: { label: 'Vencido', badge: 'danger' as const },
  };

  const filtered = products.filter(p => {
    const status = getStatus(p.id);
    const matchQ = !query || p.name.toLowerCase().includes(query.toLowerCase()) || p.code.toLowerCase().includes(query.toLowerCase());
    const matchF = filter === 'all' || status === filter;
    return matchQ && matchF && p.active;
  });

  const counts = {
    out: products.filter(p => getProductStock(p.id) === 0).length,
    low: products.filter(p => { const s = getProductStock(p.id); return s > 0 && s <= p.minStock; }).length,
    expired: batches.filter(b => new Date(b.expiryDate) < now && b.quantity > 0).length,
    expiring: batches.filter(b => { const e = new Date(b.expiryDate); return e >= now && e <= alertDate && b.quantity > 0; }).length,
  };

  const handleAdjust = () => {
    if (!adjustModal || !adjQty || !adjReason) return;
    adjustStock(adjustModal, parseInt(adjQty), adjType, adjReason);
    setAdjustModal(null);
    setAdjQty('');
    setAdjReason('');
  };

  const openBatchModal = (productId: string) => {
    setBatchModal(productId);
    setEditingBatch(null);
    setBatchForm({ lotNumber: '', expiryDate: '', entryDate: new Date().toISOString().split('T')[0], quantity: 0, costPrice: 0, supplierId: '' });
  };

  const openEditBatch = (batch: ProductBatch) => {
    setEditingBatch(batch);
    setBatchForm({ lotNumber: batch.lotNumber, expiryDate: batch.expiryDate, entryDate: batch.entryDate, quantity: batch.quantity, costPrice: batch.costPrice, supplierId: batch.supplierId });
  };

  const handleSaveBatch = () => {
    if (!batchModal || !batchForm.lotNumber || !batchForm.expiryDate) return;
    if (editingBatch) {
      updateBatch(editingBatch.id, batchForm);
    } else {
      addBatch({ ...batchForm, id: `b-${Date.now()}`, productId: batchModal });
    }
    setEditingBatch(null);
    setBatchForm({ lotNumber: '', expiryDate: '', entryDate: new Date().toISOString().split('T')[0], quantity: 0, costPrice: 0, supplierId: '' });
  };

  const handleDeleteBatch = (batchId: string) => {
    if (confirm('¿Eliminar este lote? Esta acción no se puede deshacer.')) deleteBatch(batchId);
  };

  const batchProduct = batchModal ? products.find(p => p.id === batchModal) : null;
  const modalBatches = batchModal ? getProductBatches(batchModal) : [];

  return (
    <Layout title="Inventario">
      <div className="space-y-4 animate-fadeIn">
        {/* Summary stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Agotados" value={counts.out} icon={<XCircle size={18} />} variant="danger" />
          <StatCard label="Stock bajo" value={counts.low} icon={<AlertTriangle size={18} />} variant="warning" />
          <StatCard label="Vencidos" value={counts.expired} sub="lotes" icon={<Package size={18} />} variant="danger" />
          <StatCard label="Por vencer" value={counts.expiring} sub={`próx. ${settings.expiryAlertDays}d`} icon={<Clock size={18} />} variant="warning" />
        </div>

        {/* Filters */}
        <Card className="flex flex-wrap gap-3 items-center py-3">
          <div className="relative flex-1 min-w-48">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar producto..."
              className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400/50 text-slate-900 dark:text-slate-100" />
          </div>
          <div className="flex gap-1 flex-wrap">
            {[['all', 'Todos'], ['ok', 'Normal'], ['low', 'Bajo'], ['critical', 'Crítico'], ['out', 'Agotado'], ['expiring', 'Por vencer'], ['expired', 'Vencido']].map(([v, l]) => (
              <button key={v} onClick={() => setFilter(v)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium font-display transition-all ${filter === v ? 'bg-teal-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'}`}>
                {l}
              </button>
            ))}
          </div>
          <span className="text-xs text-slate-400 font-mono ml-auto">{filtered.length} productos</span>
        </Card>

        {/* Inventory table */}
        <Card padding={false} className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50">
                  {['Código', 'Producto y Tipo', 'Stock Base', 'Unidades de Venta Habilitadas', 'Stock mín.', 'Próx. vencimiento', 'Lote', 'Estado', 'Acciones'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 font-mono uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {filtered.map(p => {
                  const stock = getProductStock(p.id);
                  const status = getStatus(p.id);
                  const pBatches = getProductBatches(p.id);
                  const nextBatch = pBatches.find(b => b.quantity > 0);
                  const baseUnit = p.unidadBase || 'Unidad';
                  const unidadesVentaList = p.unidadesVenta && p.unidadesVenta.length > 0
                    ? p.unidadesVenta
                    : [{ nombre: 'Unidad', cantidadBase: 1, precioVenta: p.salePriceUnit }];

                  return (
                    <tr key={p.id} className={`hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors ${status === 'expired' ? 'bg-red-50/30 dark:bg-red-900/5' : status === 'expiring' ? 'bg-amber-50/30 dark:bg-amber-900/5' : ''}`}>
                      <td className="px-4 py-3 font-mono text-xs text-slate-500">{p.code}</td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-800 dark:text-slate-100 font-display">{p.name}</p>
                        <p className="text-xs text-slate-400">{p.tipoPresentacion || p.presentation} · {p.laboratory}</p>
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-teal-700 dark:text-teal-400">
                        {stock.toLocaleString()} {stock === 1 ? baseUnit.toLowerCase() : (baseUnit.toLowerCase().endsWith('a') || baseUnit.toLowerCase().endsWith('o') || baseUnit.toLowerCase().endsWith('d') ? baseUnit.toLowerCase() + 's' : baseUnit.toLowerCase() + 'es')}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1 flex-wrap">
                          {unidadesVentaList.map(u => (
                            <span key={u.nombre} className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                              {u.nombre} (S/ {u.precioVenta.toFixed(2)})
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-500">{p.minStock}</td>
                      <td className="px-4 py-3">
                        {nextBatch ? (
                          <span className={`font-mono text-xs ${new Date(nextBatch.expiryDate) < now ? 'text-red-500 font-bold' : new Date(nextBatch.expiryDate) <= alertDate ? 'text-amber-500 font-semibold' : 'text-slate-500'}`}>
                            {new Date(nextBatch.expiryDate).toLocaleDateString('es-PE')}
                          </span>
                        ) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-500">{nextBatch?.lotNumber ?? '—'}</td>
                      <td className="px-4 py-3">
                        <Badge variant={statusConfig[status].badge}>{statusConfig[status].label}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <button onClick={() => openBatchModal(p.id)} title="Ver / gestionar lotes"
                            className="p-1.5 rounded-lg hover:bg-teal-50 dark:hover:bg-teal-900/20 text-slate-400 hover:text-teal-600 transition-colors">
                            <Eye size={14} />
                          </button>
                          <button onClick={() => { setAdjustModal(p.id); setAdjQty(''); setAdjReason(''); }} title="Ajuste de inventario"
                            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-teal-600 transition-colors">
                            <ArrowUpDown size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Batch detail section */}
        <Card padding={false}>
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 font-display">Detalle de lotes (FEFO)</h3>
            <p className="text-xs text-slate-400 mt-0.5">Ordenados por fecha de vencimiento más próxima · haz clic en el ícono <Eye size={11} className="inline" /> para gestionar lotes de un producto</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50">
                  {['Producto', 'Lote', 'Fecha ingreso', 'Fecha vencimiento', 'Días restantes', 'Cantidad (uds)', 'Costo unitario'].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 font-mono uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {batches
                  .filter(b => b.quantity > 0)
                  .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime())
                  .slice(0, 20)
                  .map(batch => {
                    const product = products.find(p => p.id === batch.productId);
                    const expiry = new Date(batch.expiryDate);
                    const daysLeft = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                    const isExpired = daysLeft < 0;
                    const isWarning = daysLeft <= settings.expiryAlertDays;
                    return (
                      <tr key={batch.id} className={`hover:bg-slate-50 dark:hover:bg-slate-700/30 ${isExpired ? 'bg-red-50/40 dark:bg-red-900/5' : isWarning ? 'bg-amber-50/40 dark:bg-amber-900/5' : ''}`}>
                        <td className="px-4 py-2.5 font-display text-xs font-medium text-slate-800 dark:text-slate-100">{product?.name}</td>
                        <td className="px-4 py-2.5 font-mono text-xs text-slate-500">{batch.lotNumber}</td>
                        <td className="px-4 py-2.5 font-mono text-xs text-slate-500">{new Date(batch.entryDate).toLocaleDateString('es-PE')}</td>
                        <td className={`px-4 py-2.5 font-mono text-xs font-semibold ${isExpired ? 'text-red-500' : isWarning ? 'text-amber-500' : 'text-slate-500'}`}>
                          {new Date(batch.expiryDate).toLocaleDateString('es-PE')}
                        </td>
                        <td className="px-4 py-2.5">
                          <Badge variant={isExpired ? 'danger' : isWarning ? 'warning' : 'success'}>
                            {isExpired ? `Vencido (${Math.abs(daysLeft)}d)` : `${daysLeft}d`}
                          </Badge>
                        </td>
                        <td className="px-4 py-2.5 font-mono text-xs text-slate-700 dark:text-slate-200 font-bold">{batch.quantity}</td>
                        <td className="px-4 py-2.5 font-mono text-xs text-slate-500">S/ {batch.costPrice.toFixed(2)}</td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Adjustment modal */}
      <Modal open={!!adjustModal} onClose={() => setAdjustModal(null)} title="Ajuste de inventario" width="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setAdjustModal(null)}>Cancelar</Button>
            <Button onClick={handleAdjust} disabled={!adjQty || !adjReason}>Guardar ajuste</Button>
          </>
        }
      >
        {adjustModal && (
          <div className="space-y-4">
            <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 font-display">
                {products.find(p => p.id === adjustModal)?.name}
              </p>
              <p className="text-xs text-slate-400 font-mono mt-1">
                Stock actual: {getProductStock(adjustModal)} unidades
              </p>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400 block mb-2 font-display">Tipo de ajuste</label>
              <div className="flex gap-2">
                <button onClick={() => setAdjType('adjustment_positive')}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium font-display transition-all ${adjType === 'adjustment_positive' ? 'bg-emerald-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
                  + Ingreso
                </button>
                <button onClick={() => setAdjType('adjustment_negative')}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium font-display transition-all ${adjType === 'adjustment_negative' ? 'bg-red-500 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
                  - Egreso
                </button>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400 block mb-1 font-display">Cantidad (unidades base)</label>
              <input type="number" min="1" value={adjQty} onChange={e => setAdjQty(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-700 text-sm font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-400/50" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400 block mb-1 font-display">Motivo *</label>
              <textarea value={adjReason} onChange={e => setAdjReason(e.target.value)} rows={3}
                placeholder="Ej: Corrección de inventario físico, merma, rotura..."
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-700 text-sm text-slate-900 dark:text-slate-100 resize-none focus:outline-none focus:ring-2 focus:ring-teal-400/50" />
            </div>
          </div>
        )}
      </Modal>

      {/* Batch management modal */}
      <Modal open={!!batchModal} onClose={() => { setBatchModal(null); setEditingBatch(null); }} title={`Lotes — ${batchProduct?.name ?? ''}`} width="2xl"
        footer={<Button variant="secondary" onClick={() => { setBatchModal(null); setEditingBatch(null); }}>Cerrar</Button>}
      >
        {batchModal && (
          <div className="space-y-5">
            {/* Batch list */}
            <div>
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide font-mono mb-3">Lotes registrados</h4>
              {modalBatches.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-6">No hay lotes registrados para este producto</p>
              ) : (
                <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                        {['N° Lote', 'F. Ingreso', 'F. Vencimiento', 'Cantidad', 'Costo unit.', ''].map(h => (
                          <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 font-mono uppercase tracking-wide whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                      {modalBatches.map(b => {
                        const expiry = new Date(b.expiryDate);
                        const daysLeft = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                        const isExpired = daysLeft < 0;
                        const isWarning = !isExpired && daysLeft <= settings.expiryAlertDays;
                        return (
                          <tr key={b.id} className={`${isExpired ? 'bg-red-50/40 dark:bg-red-900/5' : isWarning ? 'bg-amber-50/40 dark:bg-amber-900/5' : ''}`}>
                            <td className="px-3 py-2.5 font-mono text-xs text-slate-700 dark:text-slate-200 font-semibold">{b.lotNumber}</td>
                            <td className="px-3 py-2.5 font-mono text-xs text-slate-500">{new Date(b.entryDate).toLocaleDateString('es-PE')}</td>
                            <td className={`px-3 py-2.5 font-mono text-xs font-semibold ${isExpired ? 'text-red-500' : isWarning ? 'text-amber-500' : 'text-slate-500'}`}>
                              {new Date(b.expiryDate).toLocaleDateString('es-PE')}
                              <span className="ml-1.5">
                                <Badge variant={isExpired ? 'danger' : isWarning ? 'warning' : 'success'}>
                                  {isExpired ? `−${Math.abs(daysLeft)}d` : `+${daysLeft}d`}
                                </Badge>
                              </span>
                            </td>
                            <td className="px-3 py-2.5 font-mono text-xs text-slate-700 dark:text-slate-200 font-bold">{b.quantity} uds</td>
                            <td className="px-3 py-2.5 font-mono text-xs text-slate-500">S/ {b.costPrice.toFixed(2)}</td>
                            <td className="px-3 py-2.5">
                              <div className="flex gap-1 justify-end">
                                <button onClick={() => openEditBatch(b)} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-teal-600 transition-colors">
                                  <Edit2 size={12} />
                                </button>
                                <button onClick={() => handleDeleteBatch(b.id)} className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 transition-colors">
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Add / Edit batch form */}
            <div className="border-t border-slate-100 dark:border-slate-700 pt-4">
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide font-mono mb-3">
                {editingBatch ? 'Editar lote' : 'Agregar nuevo lote'}
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-400 block mb-1 font-display">N° de lote *</label>
                  <input value={batchForm.lotNumber} onChange={e => setBatchForm(f => ({ ...f, lotNumber: e.target.value }))}
                    placeholder="Ej: LOT-2025-001"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-700 text-sm font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-400/50" />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-400 block mb-1 font-display">Fecha de vencimiento *</label>
                  <input type="date" value={batchForm.expiryDate} onChange={e => setBatchForm(f => ({ ...f, expiryDate: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-700 text-sm font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-400/50" />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-400 block mb-1 font-display">Fecha de ingreso</label>
                  <input type="date" value={batchForm.entryDate} onChange={e => setBatchForm(f => ({ ...f, entryDate: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-700 text-sm font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-400/50" />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-400 block mb-1 font-display">Cantidad (unidades)</label>
                  <input type="number" min="0" value={batchForm.quantity} onChange={e => setBatchForm(f => ({ ...f, quantity: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-700 text-sm font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-400/50" />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-400 block mb-1 font-display">Costo unitario (S/)</label>
                  <input type="number" min="0" step="0.01" value={batchForm.costPrice} onChange={e => setBatchForm(f => ({ ...f, costPrice: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-700 text-sm font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-400/50" />
                </div>
                <div className="flex items-end gap-2">
                  {editingBatch && (
                    <Button variant="secondary" onClick={() => { setEditingBatch(null); setBatchForm({ lotNumber: '', expiryDate: '', entryDate: new Date().toISOString().split('T')[0], quantity: 0, costPrice: 0, supplierId: '' }); }} className="flex-1">
                      Cancelar
                    </Button>
                  )}
                  <Button onClick={handleSaveBatch} disabled={!batchForm.lotNumber || !batchForm.expiryDate} className="flex-1">
                    <Plus size={14} /> {editingBatch ? 'Actualizar' : 'Agregar lote'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </Layout>
  );
}
