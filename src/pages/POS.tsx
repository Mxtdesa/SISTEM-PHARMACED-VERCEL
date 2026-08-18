import { useState, useRef } from 'react';
import { Search, Plus, Minus, Trash2, ShoppingCart, Printer, Download, X, CreditCard, Banknote, Smartphone, RefreshCw, CheckCircle2, MapPin, Tag, Edit3, Sparkles } from 'lucide-react';
import Layout from '../components/layout/Layout';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import { useStore } from '../store/useStore';
import type { CartItem, PaymentMethod, SalePayment, ProductPresentation } from '../types';

const PAYMENT_ICONS: Record<PaymentMethod, React.ReactNode> = {
  cash: <Banknote size={16} />,
  yape: <Smartphone size={16} />,
  plin: <Smartphone size={16} />,
  transfer: <RefreshCw size={16} />,
  card: <CreditCard size={16} />,
  credit: <CreditCard size={16} />,
  mixed: <CreditCard size={16} />,
};

const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  cash: 'Efectivo', yape: 'Yape', plin: 'Plin',
  transfer: 'Transferencia', card: 'Tarjeta', credit: 'Crédito', mixed: 'Mixto',
};

const PRES_LABELS: Record<ProductPresentation, string> = {
  box: 'Caja', blister: 'Blíster', unit: 'Unidad', bottle: 'Frasco',
  ampoule: 'Ampolla', sachet: 'Sobre', capsule: 'Cápsula', tablet: 'Tableta',
  syrup: 'Jarabe', pot: 'Pote', spray: 'Spray'
};

type PayStep = { method: PaymentMethod; amount: string };

export default function POS() {
  const { products, cart, addToCart, updateCartItem, updateCartItemDetails, removeFromCart, clearCart, completeSale, cashRegister, currentUser, getProductStock, settings } = useStore();

  const [query, setQuery] = useState('');
  const [selectedPresentation, setSelectedPresentation] = useState<Record<string, ProductPresentation>>({});
  const [payOpen, setPayOpen] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [lastSaleNumber, setLastSaleNumber] = useState('');
  const [lastSaleTotal, setLastSaleTotal] = useState(0);
  const [lastSaleItems, setLastSaleItems] = useState<CartItem[]>([]);
  const [payments, setPayments] = useState<PayStep[]>([{ method: 'cash', amount: '' }]);
  const searchRef = useRef<HTMLInputElement>(null);

  // Cart item editing modal (price & discount)
  const [editingCartItem, setEditingCartItem] = useState<CartItem | null>(null);
  const [editPriceForm, setEditPriceForm] = useState({ unitPrice: '', discount: '', quantity: '' });

  // Custom manual sale item modal
  const [customModal, setCustomModal] = useState(false);
  const [customForm, setCustomForm] = useState({ name: '', presentation: 'Servicio', price: '', quantity: '1' });

  const cartTotal = cart.reduce((s, i) => s + i.subtotal, 0);
  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);

  const filtered = (() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase().trim();

    // 1. Matches by commercial name or product name
    const nameMatches = products.filter(p =>
      p.active &&
      ((p.commercialName && p.commercialName.toLowerCase().includes(q)) ||
       p.name.toLowerCase().includes(q) ||
       p.code.toLowerCase().includes(q) ||
       (p.barcode && p.barcode.includes(q)))
    );

    // 2. Matches by active ingredient (excluding already matched products)
    const matchedIds = new Set(nameMatches.map(p => p.id));
    const activeIngredientMatches = products.filter(p =>
      p.active &&
      !matchedIds.has(p.id) &&
      ((p.activeIngredient && p.activeIngredient.toLowerCase().includes(q)) ||
       (p.location && p.location.toLowerCase().includes(q)))
    );

    return [...nameMatches, ...activeIngredientMatches].slice(0, 12);
  })();

  const getPresentation = (product: typeof products[0]): string => {
    if (selectedPresentation[product.id]) return selectedPresentation[product.id];
    // Always default to "Unidad" if present in unidadesVenta or as default
    if (product.unidadesVenta && product.unidadesVenta.length > 0) {
      const unitOption = product.unidadesVenta.find(u => u.nombre.toLowerCase() === 'unidad');
      if (unitOption) return unitOption.nombre;
      return 'Unidad';
    }
    return 'Unidad';
  };

  const getPresentationPrice = (product: typeof products[0], presName: string) => {
    if (product.unidadesVenta && product.unidadesVenta.length > 0) {
      const match = product.unidadesVenta.find(u => u.nombre === presName || u.nombre.toLowerCase() === presName.toLowerCase());
      if (match) return match.precioVenta;
    }
    if (presName === 'unit' || presName === 'Unidad') return product.salePriceUnit;
    if (presName === 'blister' || presName === 'Blíster') return product.salePriceBlister || product.salePriceUnit;
    if (presName === 'box' || presName === 'Caja') return product.salePriceBox || product.salePriceUnit;
    return product.salePriceUnit;
  };

  const handleAdd = (product: typeof products[0]) => {
    const pres = getPresentation(product);
    const price = getPresentationPrice(product, pres);
    const stock = getProductStock(product.id);
    if (stock <= 0) return;
    const item: CartItem = {
      productId: product.id,
      productName: product.commercialName || product.name,
      presentation: pres,
      quantity: 1,
      unitPrice: price,
      discount: 0,
      subtotal: price,
    };
    addToCart(item);
  };

  // Handle adding custom non-inventory product or service
  const handleAddCustomItem = () => {
    const price = parseFloat(customForm.price) || 0;
    const qty = parseInt(customForm.quantity) || 1;
    if (!customForm.name.trim() || price <= 0) return;

    addToCart({
      productId: `custom-${Date.now()}`,
      productName: customForm.name.trim(),
      presentation: customForm.presentation.trim() || 'Servicio',
      quantity: qty,
      unitPrice: price,
      discount: 0,
      subtotal: price * qty,
      isCustom: true,
    });

    setCustomModal(false);
    setCustomForm({ name: '', presentation: 'Servicio', price: '', quantity: '1' });
  };

  // Open price / discount editor modal for cart item
  const openEditCartItem = (item: CartItem) => {
    setEditingCartItem(item);
    setEditPriceForm({
      unitPrice: item.unitPrice.toString(),
      discount: item.discount.toString(),
      quantity: item.quantity.toString(),
    });
  };

  const handleSaveCartItemEdit = () => {
    if (!editingCartItem) return;
    const unitPrice = parseFloat(editPriceForm.unitPrice) || 0;
    const discount = parseFloat(editPriceForm.discount) || 0;
    const quantity = parseInt(editPriceForm.quantity) || 1;

    updateCartItemDetails(editingCartItem.productId, editingCartItem.presentation as string, {
      unitPrice,
      discount: Math.min(100, Math.max(0, discount)),
      quantity: Math.max(1, quantity),
    });

    setEditingCartItem(null);
  };

  const totalPaid = payments.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
  const change = totalPaid - cartTotal;

  const handleCompleteSale = () => {
    if (totalPaid < cartTotal) return;
    const salePayments: SalePayment[] = payments
      .filter(p => parseFloat(p.amount) > 0)
      .map(p => ({ method: p.method, amount: parseFloat(p.amount) }));

    const now = new Date().toISOString();
    setLastSaleTotal(cartTotal);
    setLastSaleItems([...cart]);

    completeSale({
      id: `sale-${Date.now()}`,
      number: '',
      date: now,
      userId: currentUser!.id,
      userName: currentUser!.name,
      items: [...cart],
      subtotal: cartTotal,
      discount: 0,
      tax: 0,
      total: cartTotal,
      payments: salePayments,
      cashRegisterId: cashRegister?.id ?? 'cr1',
      status: 'completed',
    });
    setLastSaleNumber(`V-${now.substring(0, 4)}-${Math.floor(Math.random() * 900) + 1000}`);
    setPayOpen(false);
    setSuccessOpen(true);
    setPayments([{ method: 'cash', amount: '' }]);
  };

  const stockBadge = (product: typeof products[0]) => {
    const stock = getProductStock(product.id);
    const baseUnitText = product.unidadBase || (product.tipoPresentacion === 'Jarabe' || product.tipoPresentacion === 'Frasco' ? 'frasco' : product.tipoPresentacion === 'Ampolla' ? 'ampolla' : 'unidad');
    const label = `${stock} ${stock === 1 ? baseUnitText.toLowerCase() : (baseUnitText.toLowerCase().endsWith('a') || baseUnitText.toLowerCase().endsWith('o') || baseUnitText.toLowerCase().endsWith('d') ? baseUnitText.toLowerCase() + 's' : baseUnitText.toLowerCase() + 'es')}`;

    if (stock === 0) return <Badge variant="danger">Agotado</Badge>;
    if (stock <= (product.minStock ?? 0)) return <Badge variant="warning">{label}</Badge>;
    return <Badge variant="success">{label}</Badge>;
  };

  return (
    <Layout title="Punto de Venta"
      actions={
        <Button size="sm" variant="outline" onClick={() => setCustomModal(true)}>
          <Plus size={14} /> Venta Manual / Servicio
        </Button>
      }
    >
      <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-120px)]">
        {/* Left: Product search */}
        <div className="flex-1 flex flex-col gap-4 min-w-0">
          {/* Search bar */}
          <Card className="py-3">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                ref={searchRef}
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Buscar por nombre comercial, principio activo, estante/ubicación o código..."
                className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-400/50 focus:bg-white dark:focus:bg-slate-600 transition-all"
                autoFocus
              />
              {query && (
                <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <X size={14} />
                </button>
              )}
            </div>
          </Card>

          {/* Product grid */}
          <div className="flex-1 overflow-y-auto">
            {query.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center gap-3">
                <div className="w-16 h-16 rounded-2xl bg-teal-50 dark:bg-teal-900/20 flex items-center justify-center">
                  <Search size={24} className="text-teal-400" />
                </div>
                <p className="text-slate-500 dark:text-slate-400 text-sm font-display">Busca un medicamento por Nombre o Principio Activo</p>
                <p className="text-xs text-slate-400 font-mono">Nombre Comercial · Principio Activo · Ubicación (Estante) · Laboratorio</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-sm">No se encontraron medicamentos para "{query}"</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {filtered.map(product => {
                  const pres = getPresentation(product);
                  const price = getPresentationPrice(product, pres);
                  const stock = getProductStock(product.id);
                  
                  // Check if product is liquid / single-unit / bottle / syrup / etc.
                  const isLiquidOrSingleUnit = 
                    ['Jarabe', 'Suspensión', 'Solución', 'Gotas', 'Frasco', 'Ampolla', 'Vial', 'Crema', 'Gel', 'Pomada', 'Spray', 'Inyectable'].includes(product.tipoPresentacion) ||
                    ['bottle', 'syrup', 'ampoule', 'pot', 'spray'].includes(product.presentation);

                  const defaultUnits = isLiquidOrSingleUnit
                    ? [{ nombre: product.unidadBase || product.tipoPresentacion || PRES_LABELS[product.presentation as ProductPresentation] || 'Frasco', cantidadBase: 1, precioVenta: product.salePriceUnit }]
                    : [
                        { nombre: 'Unidad', cantidadBase: 1, precioVenta: product.salePriceUnit },
                        { nombre: 'Blíster', cantidadBase: product.units?.unitsPerBlister || 10, precioVenta: product.salePriceBlister || product.salePriceUnit },
                        { nombre: 'Caja', cantidadBase: product.units?.unitsPerBox || 100, precioVenta: product.salePriceBox || product.salePriceUnit }
                      ];

                  const unidadesVentaList = (product.unidadesVenta && product.unidadesVenta.length > 0)
                    ? product.unidadesVenta
                    : defaultUnits;

                  return (
                    <div key={product.id} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 flex flex-col gap-3 hover:border-teal-300 dark:hover:border-teal-600 hover:shadow-md transition-all">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-slate-800 dark:text-slate-100 font-display truncate">{product.commercialName || product.name}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 font-mono truncate">
                            {product.activeIngredient ? `${product.activeIngredient} · ` : ''}
                            {product.tipoPresentacion || PRES_LABELS[product.presentation as ProductPresentation] || product.presentation}
                            {product.laboratory ? ` · ${product.laboratory}` : ''}
                          </p>
                          <div className="flex items-center gap-1 text-[11px] font-mono text-teal-700 dark:text-teal-300 mt-1 bg-teal-50 dark:bg-teal-900/30 px-2 py-0.5 rounded-md w-fit border border-teal-100 dark:border-teal-800 font-semibold">
                            <MapPin size={11} className="text-teal-600 dark:text-teal-400 shrink-0" />
                            <span className="truncate">{product.location || 'Estante A-1'}</span>
                          </div>
                        </div>
                        {stockBadge(product)}
                      </div>

                      {/* Dynamic Sale Units buttons */}
                      {unidadesVentaList.length > 1 ? (
                        <div className="flex gap-1 flex-wrap">
                          {unidadesVentaList.map(u => (
                            <button
                              key={u.nombre}
                              onClick={() => setSelectedPresentation(prev => ({ ...prev, [product.id]: u.nombre }))}
                              className={`flex-1 min-w-[60px] py-1.5 px-3 rounded-lg text-xs font-semibold font-display transition-all text-center ${pres === u.nombre ? 'bg-teal-600 text-white shadow-xs font-bold' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'}`}
                            >
                              {u.nombre}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1.5 py-1.5 px-3 rounded-lg bg-teal-50 dark:bg-teal-950/40 border border-teal-200/60 dark:border-teal-800/60 text-xs font-display text-teal-700 dark:text-teal-300 font-semibold w-fit">
                          <span className="w-1.5 h-1.5 rounded-full bg-teal-500"></span>
                          <span>{unidadesVentaList[0]?.nombre || 'Unidad'}</span>
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-lg font-bold text-teal-700 dark:text-teal-400 font-mono">S/ {price.toFixed(2)}</p>
                          <p className="text-xs text-slate-400">
                            por {pres.toLowerCase()}
                          </p>
                        </div>
                        <button
                          onClick={() => handleAdd(product)}
                          disabled={stock === 0}
                          className="w-9 h-9 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-40 disabled:cursor-not-allowed text-white flex items-center justify-center transition-colors shadow-sm"
                        >
                          <Plus size={18} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right: Cart */}
        <div className="w-full lg:w-80 xl:w-96 flex flex-col gap-3">
          <Card padding={false} className="flex-1 flex flex-col overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingCart size={16} className="text-teal-600 dark:text-teal-400" />
                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 font-display">Carrito de Venta</h3>
                {cartCount > 0 && <Badge variant="primary">{cartCount}</Badge>}
              </div>
              {cart.length > 0 && (
                <button onClick={clearCart} className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1 font-display">
                  <X size={12} /> Limpiar
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center gap-2 text-slate-400 py-12">
                  <ShoppingCart size={32} className="text-slate-200 dark:text-slate-700" />
                  <p className="text-sm font-display">Carrito vacío</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-700">
                  {cart.map(item => (
                    <div key={`${item.productId}-${item.presentation}`} className="px-4 py-3 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 font-display leading-tight truncate">{item.productName}</p>
                            {item.isCustom && <Badge variant="warning">Manual</Badge>}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-slate-400 font-mono mt-0.5">
                            <span className="capitalize">{PRES_LABELS[item.presentation as ProductPresentation] || item.presentation}</span>
                            <span>·</span>
                            <span>S/ {item.unitPrice.toFixed(2)}</span>
                            {item.discount > 0 && (
                              <span className="text-amber-500 font-bold">(-{item.discount}%)</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={() => openEditCartItem(item)} className="p-1.5 rounded hover:bg-teal-50 dark:hover:bg-teal-900/30 text-slate-400 hover:text-teal-600 transition-colors" title="Editar precio / aplicar descuento">
                            <Tag size={13} />
                          </button>
                          <button onClick={() => removeFromCart(item.productId)} className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/30 text-slate-400 hover:text-red-500 transition-colors">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateCartItem(item.productId, item.quantity - 1)}
                            className="w-6 h-6 rounded-lg border border-slate-200 dark:border-slate-600 flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                          >
                            <Minus size={12} />
                          </button>
                          <span className="w-8 text-center text-sm font-bold font-mono text-slate-800 dark:text-slate-100">{item.quantity}</span>
                          <button
                            onClick={() => updateCartItem(item.productId, item.quantity + 1)}
                            className="w-6 h-6 rounded-lg border border-slate-200 dark:border-slate-600 flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                          >
                            <Plus size={12} />
                          </button>
                        </div>
                        <p className="text-sm font-bold text-teal-700 dark:text-teal-400 font-mono">S/ {item.subtotal.toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Total */}
            <div className="border-t border-slate-100 dark:border-slate-700 px-5 py-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 font-mono">SUBTOTAL</span>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200 font-mono">S/ {cartTotal.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between border-t border-dashed border-slate-200 dark:border-slate-600 pt-3">
                <span className="text-sm font-bold text-slate-800 dark:text-slate-100 font-display">TOTAL</span>
                <span className="text-xl font-bold text-teal-700 dark:text-teal-400 font-mono">S/ {cartTotal.toFixed(2)}</span>
              </div>
              <Button
                className="w-full justify-center"
                disabled={cart.length === 0}
                onClick={() => {
                  setPayments([{ method: 'cash', amount: cartTotal.toFixed(2) }]);
                  setPayOpen(true);
                }}
              >
                <CreditCard size={15} />
                Cobrar S/ {cartTotal.toFixed(2)}
              </Button>
            </div>
          </Card>
        </div>
      </div>

      {/* ── Edit Cart Item Price & Discount Modal ──────────────────────────────── */}
      <Modal open={!!editingCartItem} onClose={() => setEditingCartItem(null)} title={`Modificar Precio / Descuento — ${editingCartItem?.productName ?? ''}`} width="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditingCartItem(null)}>Cancelar</Button>
            <Button onClick={handleSaveCartItemEdit}>Aplicar cambios</Button>
          </>
        }
      >
        {editingCartItem && (
          <div className="space-y-4">
            <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
              <p className="text-xs text-slate-500 font-mono">Presentación: <span className="font-bold text-slate-800 dark:text-slate-200 capitalize">{editingCartItem.presentation}</span></p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400 block mb-1 font-display">Precio Unitario (S/) *</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={editPriceForm.unitPrice}
                  onChange={e => setEditPriceForm(f => ({ ...f, unitPrice: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-700 text-sm font-mono font-bold text-teal-700 dark:text-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-400/50"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400 block mb-1 font-display">Descuento (%) *</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={editPriceForm.discount}
                  onChange={e => setEditPriceForm(f => ({ ...f, discount: e.target.value }))}
                  placeholder="Ej: 10"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-700 text-sm font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-400/50"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400 block mb-1 font-display">Cantidad *</label>
                <input
                  type="number"
                  min="1"
                  value={editPriceForm.quantity}
                  onChange={e => setEditPriceForm(f => ({ ...f, quantity: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-700 text-sm font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-400/50"
                />
              </div>

              <div className="flex flex-col justify-end">
                <p className="text-xs text-slate-400 mb-1">Subtotal estimado:</p>
                <p className="text-lg font-bold text-teal-600 font-mono">
                  S/ {((parseInt(editPriceForm.quantity) || 1) * (parseFloat(editPriceForm.unitPrice) || 0) * (1 - (parseFloat(editPriceForm.discount) || 0) / 100)).toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Custom / Manual Sale Item Modal ────────────────────────────────────── */}
      <Modal open={customModal} onClose={() => setCustomModal(false)} title="Venta Manual / Servicio fuera de inventario" width="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCustomModal(false)}>Cancelar</Button>
            <Button onClick={handleAddCustomItem} disabled={!customForm.name.trim() || !(parseFloat(customForm.price) > 0)}>
              Agregar al Carrito
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3 text-xs text-amber-800 dark:text-amber-300">
            Utiliza esta opción para cobrar servicios (inyectables, toma de presión) o productos no registrados en el catálogo.
          </div>

          <div>
            <label className="text-xs font-medium text-slate-600 dark:text-slate-400 block mb-1 font-display">Nombre o Descripción del servicio/producto *</label>
            <input
              type="text"
              value={customForm.name}
              onChange={e => setCustomForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Ej: Inyectable intramuscular, Medición de presión arterial"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-700 text-sm"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400 block mb-1 font-display">Presentación / Tipo</label>
              <input
                type="text"
                value={customForm.presentation}
                onChange={e => setCustomForm(f => ({ ...f, presentation: e.target.value }))}
                placeholder="Ej: Servicio"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-700 text-sm font-mono"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400 block mb-1 font-display">Precio (S/) *</label>
              <input
                type="number"
                min="0"
                step="0.10"
                value={customForm.price}
                onChange={e => setCustomForm(f => ({ ...f, price: e.target.value }))}
                placeholder="5.00"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-700 text-sm font-mono"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400 block mb-1 font-display">Cantidad</label>
              <input
                type="number"
                min="1"
                value={customForm.quantity}
                onChange={e => setCustomForm(f => ({ ...f, quantity: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-700 text-sm font-mono"
              />
            </div>
          </div>
        </div>
      </Modal>

      {/* ── Payment modal ──────────────────────────────────────────────────────── */}
      <Modal open={payOpen} onClose={() => setPayOpen(false)} title="Registrar pago" width="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setPayOpen(false)}>Cancelar</Button>
            <Button onClick={handleCompleteSale} disabled={totalPaid < cartTotal}>
              <CheckCircle2 size={15} />
              Confirmar venta
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="bg-teal-50 dark:bg-teal-900/20 rounded-xl p-4 flex items-center justify-between">
            <span className="text-sm text-teal-700 dark:text-teal-300 font-display font-semibold">Total a cobrar</span>
            <span className="text-2xl font-bold text-teal-700 dark:text-teal-400 font-mono">S/ {cartTotal.toFixed(2)}</span>
          </div>

          {/* Payment rows */}
          {payments.map((pay, idx) => (
            <div key={idx} className="flex gap-2 items-end">
              <div className="flex-1">
                <label className="text-xs font-medium text-slate-500 mb-1 block font-display">Método {idx + 1}</label>
                <select
                  value={pay.method}
                  onChange={e => {
                    const updated = [...payments];
                    updated[idx] = { ...updated[idx], method: e.target.value as PaymentMethod };
                    setPayments(updated);
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-700 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-400/50"
                >
                  {Object.entries(PAYMENT_LABELS).filter(([k]) => k !== 'mixed').map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <label className="text-xs font-medium text-slate-500 mb-1 block font-display">Monto (S/)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={pay.amount}
                  onChange={e => {
                    const updated = [...payments];
                    updated[idx] = { ...updated[idx], amount: e.target.value };
                    setPayments(updated);
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-700 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-400/50 font-mono"
                />
              </div>
              {payments.length > 1 && (
                <button onClick={() => setPayments(payments.filter((_, i) => i !== idx))} className="mb-0.5 p-2 text-red-400 hover:text-red-600">
                  <X size={14} />
                </button>
              )}
            </div>
          ))}

          <button
            onClick={() => setPayments([...payments, { method: 'cash', amount: Math.max(0, cartTotal - totalPaid).toFixed(2) }])}
            className="text-xs text-teal-600 dark:text-teal-400 hover:text-teal-700 flex items-center gap-1 font-display"
          >
            <Plus size={12} /> Agregar método de pago
          </button>

          <div className="border-t border-slate-100 dark:border-slate-700 pt-3 space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500 font-mono">Total pagado:</span>
              <span className={`font-bold font-mono ${totalPaid >= cartTotal ? 'text-emerald-600' : 'text-red-500'}`}>S/ {totalPaid.toFixed(2)}</span>
            </div>
            {payments.some(p => p.method === 'cash') && totalPaid > cartTotal && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 font-mono">Vuelto:</span>
                <span className="font-bold font-mono text-teal-600">S/ {change.toFixed(2)}</span>
              </div>
            )}
            {totalPaid < cartTotal && (
              <div className="flex justify-between text-sm">
                <span className="text-red-500 font-mono">Falta:</span>
                <span className="font-bold font-mono text-red-500">S/ {(cartTotal - totalPaid).toFixed(2)}</span>
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* Success modal */}
      <Modal open={successOpen} onClose={() => setSuccessOpen(false)} title="" width="sm">
        <div className="text-center py-4 space-y-4">
          <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto">
            <CheckCircle2 size={32} className="text-emerald-500" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 font-display">¡Venta registrada!</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-mono">{lastSaleNumber}</p>
          </div>
          <p className="text-2xl font-bold text-teal-700 dark:text-teal-400 font-mono">S/ {lastSaleTotal.toFixed(2)}</p>
          <div className="flex gap-2 justify-center flex-wrap">
            {settings?.allowPrintReceipt !== false && (
              <Button variant="secondary" size="sm" onClick={() => window.print()}>
                <Printer size={14} /> Imprimir Recibo
              </Button>
            )}

            {settings?.allowDownloadPdfReceipt !== false && (
              <Button variant="outline" size="sm" onClick={() => {
                const printWin = window.open('', '_blank');
                if (!printWin) return;
                const itemsRows = lastSaleItems.map(item => `
                  <tr style="vertical-align: top;">
                    <td style="text-align: center; padding: 4px 0;">${item.quantity}</td>
                    <td style="padding: 4px 8px;">
                      ${item.productName}
                      ${item.presentation && item.presentation.toLowerCase() !== 'unidad' ? `<br><span style="font-size: 10px; color: #555;">(${item.presentation})</span>` : ''}
                    </td>
                    <td style="text-align: right; padding: 4px 0;">${item.unitPrice.toFixed(2)}</td>
                    <td style="text-align: right; padding: 4px 0;">${item.subtotal.toFixed(2)}</td>
                  </tr>
                `).join('');

                const now = new Date();
                const formattedDate = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
                const formattedTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
                
                const subtotalVal = (lastSaleTotal / 1.18).toFixed(2);
                const igvVal = (lastSaleTotal - parseFloat(subtotalVal)).toFixed(2);

                const html = `
                  <!DOCTYPE html>
                  <html>
                  <head>
                    <title>NOTA DE VENTA - ${lastSaleNumber}</title>
                    <style>
                      @page { margin: 10px; size: 80mm auto; }
                      body {
                        font-family: 'Courier New', Courier, monospace;
                        font-size: 12px;
                        color: #000;
                        background: #fff;
                        width: 280px;
                        margin: 0 auto;
                        padding: 10px;
                        line-height: 1.3;
                      }
                      .text-center { text-align: center; }
                      .text-right { text-align: right; }
                      .bold { font-weight: bold; }
                      .divider { border-top: 1px dashed #000; margin: 8px 0; }
                      table { width: 100%; border-collapse: collapse; margin: 6px 0; }
                      th { font-size: 11px; text-transform: uppercase; font-weight: bold; border-bottom: 1px dashed #000; padding-bottom: 4px; }
                      .total-line { font-size: 14px; font-weight: bold; text-align: right; margin-top: 8px; }
                      .footer-note { font-size: 10px; text-align: center; margin-top: 15px; }
                    </style>
                  </head>
                  <body>
                    <div class="text-center bold" style="font-size: 14px;">NOTA DE VENTA</div>
                    <div class="text-center bold" style="margin-top: 2px;">Nro. ${lastSaleNumber.replace(/^[^\d]*-?/, '') || '000002'}</div>

                    <div class="divider"></div>

                    <div class="bold">DATOS DEL EMISOR</div>
                    <div>Nombre: ${settings?.name || 'Botica TrebolPharma'}</div>
                    <div>RUC: ${settings?.ruc || '10770542311'}</div>
                    <div>Direccion: ${settings?.address || 'Calle Hospital 834'}</div>

                    <div class="divider"></div>

                    <div>Fecha: ${formattedDate}</div>
                    <div>Hora: ${formattedTime}</div>

                    <div class="divider"></div>

                    <div class="bold">DETALLE DE PRODUCTOS</div>

                    <div class="divider"></div>

                    <table>
                      <thead>
                        <tr>
                          <th style="width: 15%; text-align: center;">CANT</th>
                          <th style="width: 45%; text-align: left;">DESCRIPCION</th>
                          <th style="width: 20%; text-align: right;">P.U.</th>
                          <th style="width: 20%; text-align: right;">IMPORTE</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${itemsRows}
                      </tbody>
                    </table>

                    <div class="divider"></div>

                    <div style="font-size: 11px;">
                      <div>Subtotal: S/${subtotalVal}</div>
                      <div>IGV (18%): S/${igvVal}</div>
                    </div>

                    <div class="divider"></div>

                    <div class="total-line">
                      TOTAL S/ &nbsp;&nbsp;&nbsp;&nbsp; ${lastSaleTotal.toFixed(2)}
                    </div>
                    <div style="font-size: 10px; margin-top: 4px;">
                      SON: (${lastSaleTotal.toFixed(2)} CON 00/100 SOLES)
                    </div>

                    <div class="divider"></div>

                    <div class="text-center bold" style="margin: 12px 0 6px 0;">
                      ¡Gracias por su compra!
                    </div>

                    <div class="divider"></div>

                    <div class="footer-note">
                      <div class="bold">DOCUMENTO SIN VALOR TRIBUTARIO</div>
                      <div class="bold" style="margin-top: 2px;">Nota: Sin valor fiscal oficial</div>
                    </div>

                    <script>
                      window.onload = function() {
                        window.print();
                      };
                    </script>
                  </body>
                  </html>
                `;

                printWin.document.write(html);
                printWin.document.close();
              }}>
                <Download size={14} /> Descargar PDF / Boleta
              </Button>
            )}

            <Button size="md" className="w-full sm:w-auto px-6 py-2.5 text-sm font-bold shadow-md" onClick={() => { setSuccessOpen(false); searchRef.current?.focus(); }}>
              + Nueva venta
            </Button>
          </div>
        </div>
      </Modal>
    </Layout>
  );
}
