import { useState } from 'react';
import { Plus, Search, Check, Trash2, Calendar } from 'lucide-react';
import Layout from '../components/layout/Layout';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import { useStore } from '../store/useStore';
import type { PurchaseItem, ProductPresentation } from '../types';

const PRES_LABELS: Record<ProductPresentation, string> = {
  box: 'Caja', blister: 'Blíster', unit: 'Unidad', bottle: 'Frasco',
  ampoule: 'Ampolla', sachet: 'Sobre', capsule: 'Cápsula', tablet: 'Tableta',
  syrup: 'Jarabe', pot: 'Pote', spray: 'Spray'
};

export default function Purchases() {
  const { purchases, suppliers, products, currentUser, addPurchase } = useStore();
  const [query, setQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [supplierId, setSupplierId] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<PurchaseItem[]>([]);
  const [productQuery, setProductQuery] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [itemForm, setItemForm] = useState({
    quantity: '1', unitCost: '', presentation: 'box' as ProductPresentation,
    lotNumber: '', expiryDate: '',
  });

  const filtered = purchases.filter(p =>
    !query || p.invoiceNumber.toLowerCase().includes(query.toLowerCase()) ||
    p.supplierName.toLowerCase().includes(query.toLowerCase())
  );

  const filteredProducts = products.filter(p =>
    productQuery && p.active &&
    (p.name.toLowerCase().includes(productQuery.toLowerCase()) || p.code.toLowerCase().includes(productQuery.toLowerCase()))
  );

  const addItem = () => {
    const product = products.find(p => p.id === selectedProductId);
    if (!product || !itemForm.quantity || !itemForm.unitCost) return;
    const qty = parseInt(itemForm.quantity);
    const cost = parseFloat(itemForm.unitCost);
    setItems(prev => [...prev, {
      productId: product.id, productName: product.name,
      presentation: itemForm.presentation,
      quantity: qty, unitCost: cost, totalCost: qty * cost,
      lotNumber: itemForm.lotNumber, expiryDate: itemForm.expiryDate,
    }]);
    setSelectedProductId('');
    setProductQuery('');
    setItemForm({ quantity: '1', unitCost: '', presentation: 'box', lotNumber: '', expiryDate: '' });
  };

  const total = items.reduce((s, i) => s + i.totalCost, 0);

  const handleSave = () => {
    if (!supplierId || items.length === 0) return;
    const supplier = suppliers.find(s => s.id === supplierId)!;
    addPurchase({
      id: `pur-${Date.now()}`, supplierId, supplierName: supplier.name,
      invoiceNumber, date, userId: currentUser!.id, userName: currentUser!.name,
      items, total, notes, status: 'completed',
    });
    setModalOpen(false);
    setItems([]);
    setSupplierId('');
    setInvoiceNumber('');
    setNotes('');
  };

  return (
    <Layout title="Compras"
      actions={<Button size="sm" onClick={() => setModalOpen(true)}><Plus size={14} /> Nueva compra</Button>}
    >
      <div className="space-y-4 animate-fadeIn">
        <Card className="flex gap-3 items-center py-3">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar por factura o proveedor..."
              className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-400/50" />
          </div>
          <span className="text-xs text-slate-400 font-mono">{filtered.length} compras</span>
        </Card>

        <Card padding={false}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50">
                  {['Nº Factura', 'Proveedor', 'Fecha', 'Productos', 'Total', 'Usuario', 'Estado'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 font-mono uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {filtered.map(pur => (
                  <tr key={pur.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-teal-700 dark:text-teal-400 font-semibold">{pur.invoiceNumber}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800 dark:text-slate-100 font-display">{pur.supplierName}</p>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500 whitespace-nowrap">
                      <span className="flex items-center gap-1"><Calendar size={11} /> {new Date(pur.date).toLocaleDateString('es-PE')}</span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{pur.items.length} ítems</td>
                    <td className="px-4 py-3 font-mono font-bold text-slate-800 dark:text-slate-100">S/ {pur.total.toFixed(2)}</td>
                    <td className="px-4 py-3 text-xs text-slate-500 font-display">{pur.userName}</td>
                    <td className="px-4 py-3">
                      <Badge variant={pur.status === 'completed' ? 'success' : pur.status === 'cancelled' ? 'danger' : 'warning'}>
                        {pur.status === 'completed' ? 'Completada' : pur.status === 'cancelled' ? 'Cancelada' : 'Pendiente'}
                      </Badge>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-400 text-sm">No hay compras registradas</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* New purchase modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nueva compra" width="2xl"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={!supplierId || items.length === 0}>
              <Check size={14} /> Confirmar compra
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          {/* Header info */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400 block mb-1 font-display">Proveedor *</label>
              <select value={supplierId} onChange={e => setSupplierId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-700 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-400/50">
                <option value="">Seleccionar proveedor</option>
                {suppliers.filter(s => s.active).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400 block mb-1 font-display">Nº Factura / Comprobante</label>
              <input value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} placeholder="F001-00001"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-700 text-sm text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-teal-400/50" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400 block mb-1 font-display">Fecha</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-700 text-sm text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-teal-400/50" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400 block mb-1 font-display">Observaciones</label>
              <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notas opcionales..."
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-700 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-400/50" />
            </div>
          </div>

          {/* Add product to purchase */}
          <div className="border border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-4 space-y-3">
            <h4 className="text-xs font-semibold text-slate-500 uppercase font-mono tracking-wide">Agregar producto</h4>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={productQuery} onChange={e => { setProductQuery(e.target.value); setSelectedProductId(''); }}
                placeholder="Buscar producto..."
                className="w-full pl-8 pr-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-700 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-400/50" />
              {filteredProducts.length > 0 && !selectedProductId && (
                <div className="absolute z-10 top-full mt-1 w-full bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-lg max-h-40 overflow-y-auto">
                  {filteredProducts.map(p => (
                    <button key={p.id} onClick={() => { setSelectedProductId(p.id); setProductQuery(p.name); setItemForm(f => ({ ...f, unitCost: p.purchasePrice.toFixed(2) })); }}
                      className="w-full px-4 py-2.5 text-left text-sm hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-colors border-b border-slate-100 dark:border-slate-700 last:border-0">
                      <span className="font-display text-slate-800 dark:text-slate-100">{p.name}</span>
                      <span className="text-xs text-slate-400 font-mono ml-2">{p.code}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {selectedProductId && (
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-xs font-medium text-slate-500 mb-1 block font-display">Presentación</label>
                  <select value={itemForm.presentation} onChange={e => setItemForm(f => ({ ...f, presentation: e.target.value as ProductPresentation }))}
                    className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-700 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-400/50">
                    {(['unit', 'blister', 'box'] as ProductPresentation[]).map(p => <option key={p} value={p}>{PRES_LABELS[p]}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 mb-1 block font-display">Cantidad</label>
                  <input type="number" min="1" value={itemForm.quantity} onChange={e => setItemForm(f => ({ ...f, quantity: e.target.value }))}
                    className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-700 text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-400/50" />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 mb-1 block font-display">Costo unitario (S/)</label>
                  <input type="number" min="0" step="0.01" value={itemForm.unitCost} onChange={e => setItemForm(f => ({ ...f, unitCost: e.target.value }))}
                    className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-700 text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-400/50" />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 mb-1 block font-display">Lote</label>
                  <input value={itemForm.lotNumber} onChange={e => setItemForm(f => ({ ...f, lotNumber: e.target.value }))} placeholder="LOT-2025-XXX"
                    className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-700 text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-400/50" />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 mb-1 block font-display">Fecha vencimiento</label>
                  <input type="date" value={itemForm.expiryDate} onChange={e => setItemForm(f => ({ ...f, expiryDate: e.target.value }))}
                    className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-700 text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-400/50" />
                </div>
                <div className="flex items-end">
                  <Button size="sm" onClick={addItem} className="w-full justify-center">
                    <Plus size={12} /> Agregar
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Items list */}
          {items.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-slate-500 uppercase font-mono tracking-wide mb-2">Ítems ({items.length})</h4>
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-700/50">
                    <tr>
                      {['Producto', 'Pres.', 'Cant.', 'Costo U.', 'Total', 'Lote', 'Vencimiento', ''].map(h => (
                        <th key={h} className="px-3 py-2 text-left font-semibold text-slate-500 dark:text-slate-400 font-mono">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {items.map((item, i) => (
                      <tr key={i}>
                        <td className="px-3 py-2 font-display font-medium text-slate-800 dark:text-slate-100">{item.productName}</td>
                        <td className="px-3 py-2 text-slate-500">{PRES_LABELS[item.presentation]}</td>
                        <td className="px-3 py-2 font-mono text-slate-700 dark:text-slate-200">{item.quantity}</td>
                        <td className="px-3 py-2 font-mono text-slate-700 dark:text-slate-200">S/ {item.unitCost.toFixed(2)}</td>
                        <td className="px-3 py-2 font-mono font-bold text-teal-700 dark:text-teal-400">S/ {item.totalCost.toFixed(2)}</td>
                        <td className="px-3 py-2 font-mono text-slate-500">{item.lotNumber}</td>
                        <td className="px-3 py-2 font-mono text-slate-500">{item.expiryDate ? new Date(item.expiryDate).toLocaleDateString('es-PE') : '—'}</td>
                        <td className="px-3 py-2">
                          <button onClick={() => setItems(items.filter((_, j) => j !== i))} className="text-slate-300 hover:text-red-500 transition-colors">
                            <Trash2 size={12} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-teal-50 dark:bg-teal-900/20">
                      <td colSpan={4} className="px-3 py-2 text-right font-semibold text-slate-700 dark:text-slate-200 font-display">Total:</td>
                      <td colSpan={4} className="px-3 py-2 font-mono font-bold text-teal-700 dark:text-teal-400 text-sm">S/ {total.toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </Layout>
  );
}
