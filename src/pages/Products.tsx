import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Search, Plus, Edit2, ToggleLeft, ToggleRight, Download, Upload, FileSpreadsheet, AlertCircle, Eye, Trash2, Calendar, MapPin, Package, Layers, FolderPlus } from 'lucide-react';
import Layout from '../components/layout/Layout';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Input, { Select, Textarea } from '../components/ui/Input';
import { useStore } from '../store/useStore';
import type { Product, ProductPresentation, ProductBatch } from '../types';

const PRESENTATIONS: ProductPresentation[] = ['box', 'blister', 'unit', 'bottle', 'ampoule', 'sachet', 'capsule', 'tablet', 'syrup', 'pot', 'spray'];
const PRES_LABELS: Record<ProductPresentation, string> = {
  box: 'Caja', blister: 'Blíster', unit: 'Unidad', bottle: 'Frasco',
  ampoule: 'Ampolla', sachet: 'Sobre', capsule: 'Cápsula', tablet: 'Tableta',
  syrup: 'Jarabe', pot: 'Pote', spray: 'Spray'
};

// Excel Headers matching user request screenshot
const HEADERS = [
  'codigo',
  'nombre_comercial',
  'nombre_medicamento',
  'principio_activo',
  'categoria',
  'laboratorio',
  'presentacion',
  'unidad_medida',
  'lote',
  'fecha_vencimiento',
  'stock_actual',
  'stock_minimo',
  'precio_compra',
  'precio_venta',
  'ubicacion',
  'precio_venta_blister',
  'precio_venta_caja',
  'unidades_por_blister',
  'blisteres_por_caja',
  'descripcion',
];

const HEADER_DISPLAY_NAMES: Record<string, string> = {
  codigo: 'Código',
  nombre_comercial: 'Nombre Comercial',
  nombre_medicamento: 'Nombre Medicamento (Opcional)',
  principio_activo: 'Principio Activo',
  categoria: 'Categoría',
  laboratorio: 'Laboratorio',
  presentacion: 'Presentación / Forma Farmacéutica',
  unidad_medida: 'Unidad Medida',
  lote: 'Lote',
  fecha_vencimiento: 'Fecha Vencimiento',
  stock_actual: 'Stock Actual',
  stock_minimo: 'Stock Mínimo',
  precio_compra: 'Precio Compra (S/)',
  precio_venta: 'Precio Venta (S/)',
  ubicacion: 'Ubicación',
  precio_venta_blister: 'P. Venta Blíster (S/)',
  precio_venta_caja: 'P. Venta Caja (S/)',
  unidades_por_blister: 'Unidades por Blíster',
  blisteres_por_caja: 'Blísteres por Caja',
  descripcion: 'Descripción',
};

const HEADER_NOTES: Record<string, string> = {
  nombre_medicamento: 'Opcional. Ej: Paracetamol 500mg',
  categoria: 'Ej: Analgésicos, Antibióticos, Jarabes, etc.',
  presentacion: `Opciones: ${PRESENTATIONS.join(' | ')}`,
  unidad_medida: 'Ej: Tableta, Frasco, Cápsula, Sobre, Ampolla',
  lote: 'Número de lote inicial (Ej: LOT-2025-001)',
  fecha_vencimiento: 'Formato AAAA-MM-DD (Ej: 2026-12-31)',
  stock_actual: 'Cantidad de unidades en stock inicial',
  stock_minimo: 'Cantidad de alerta de stock bajo (Ej: 20)',
  precio_compra: 'Número decimal (Ej: 15.50)',
  precio_venta: 'Precio de venta unitario decimal (Ej: 0.50)',
  ubicacion: 'Ubicación en farmacia o estante (Ej: Estante A-12)',
  unidades_por_blister: 'Número entero (Ej: 10)',
  blisteres_por_caja: 'Número entero (Ej: 10)',
};

function downloadTemplate() {
  const wb = XLSX.utils.book_new();

  // Sheet 1: template headers + example row
  const example = [
    'MED001', 'Panadol', 'Paracetamol 500mg', 'Paracetamol', 'Analgésicos', 'GlaxoSmithKline',
    'box', 'Tableta', 'LOT-2025-001', '2026-12-31', 100, 20,
    8.50, 0.50, 'Estante A-12', 4.50, 20.00,
    10, 10, 'Analgésico antipirético'
  ];
  const ws = XLSX.utils.aoa_to_sheet([HEADERS, example]);

  // Style columns width
  ws['!cols'] = HEADERS.map((h) => ({ wch: Math.max(h.length + 4, 18) }));

  // Sheet 2: detailed instructions
  const notes = [
    ['Campo', 'Nombre Columna Excel', 'Nota / Valores válidos'],
    ...HEADERS.map(h => [HEADER_DISPLAY_NAMES[h] || h, h, HEADER_NOTES[h] ?? ''])
  ];
  const wsNotes = XLSX.utils.aoa_to_sheet(notes);
  wsNotes['!cols'] = [{ wch: 24 }, { wch: 26 }, { wch: 70 }];

  XLSX.utils.book_append_sheet(wb, ws, 'Productos');
  XLSX.utils.book_append_sheet(wb, wsNotes, 'Instrucciones');
  XLSX.writeFile(wb, 'plantilla_productos_completa.xlsx');
}

function exportProducts(products: Product[], batches: ProductBatch[]) {
  const rows = products.map(p => {
    const prodBatches = batches.filter(b => b.productId === p.id && b.quantity > 0);
    const mainBatch = prodBatches[0];
    const totalStock = batches.filter(b => b.productId === p.id).reduce((sum, b) => sum + b.quantity, 0);

    return {
      'Código': p.code,
      'Nombre Comercial': p.commercialName || p.name,
      'Nombre Medicamento (Opcional)': p.name !== p.commercialName ? p.name : '',
      'Principio Activo': p.activeIngredient,
      'Categoría': p.category,
      'Laboratorio': p.laboratory,
      'Presentación / Forma Farmacéutica': p.presentation,
      'Unidad Medida': p.unitMeasure,
      'Lote Principal': mainBatch?.lotNumber || 'Sin Lote',
      'Fecha Vencimiento': mainBatch?.expiryDate || 'N/A',
      'Stock Actual': totalStock,
      'Stock Mínimo': p.minStock,
      'Precio Compra (S/)': p.purchasePrice,
      'Precio Venta Unidad (S/)': p.salePriceUnit,
      'Precio Venta Blíster (S/)': p.salePriceBlister,
      'Precio Venta Caja (S/)': p.salePriceBox,
      'Ubicación': p.location || 'Sin ubicación',
      'Unidades por Blíster': p.units.unitsPerBlister,
      'Blísteres por Caja': p.units.blistersPerBox,
      'Descripción': p.description,
      'Estado': p.active ? 'Activo' : 'Inactivo',
    };
  });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = Object.keys(rows[0] ?? {}).map(() => ({ wch: 20 }));
  XLSX.utils.book_append_sheet(wb, ws, 'Productos');
  XLSX.writeFile(wb, `inventario_productos_${new Date().toISOString().split('T')[0]}.xlsx`);
}

// Helper to normalize and search column headers flexibly
function getCellVal(row: Record<string, unknown>, ...aliases: string[]): string {
  const rowKeys = Object.keys(row);
  for (const alias of aliases) {
    const normAlias = alias.toLowerCase().replace(/[^a-z0-9]/g, '');
    for (const key of rowKeys) {
      const normKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (normKey === normAlias) {
        const val = row[key];
        if (val !== undefined && val !== null && val !== '') return String(val).trim();
      }
    }
  }
  return '';
}

interface ImportPreviewItem {
  product: Omit<Product, 'id' | 'priceHistory' | 'createdAt'>;
  initialBatch?: {
    lotNumber: string;
    expiryDate: string;
    quantity: number;
    costPrice: number;
  };
}

import { PRESENTATION_TYPES } from '../types';

const emptyProduct: Omit<Product, 'id' | 'priceHistory' | 'createdAt'> = {
  code: '', name: '', commercialName: '', activeIngredient: '',
  laboratory: '', category: 'Analgésicos', subcategory: '', presentation: 'box',
  tipoPresentacion: 'Tableta', unidadBase: 'Unidad',
  unidadesVenta: [
    { nombre: 'Unidad', cantidadBase: 1, precioVenta: 0 },
    { nombre: 'Blíster', cantidadBase: 10, precioVenta: 0 },
    { nombre: 'Caja', cantidadBase: 100, precioVenta: 0 },
  ],
  pharmaceuticalForm: '', unitMeasure: 'Tableta', description: '',
  location: 'Estante A-1', active: true,
  units: { unitsPerBlister: 10, blistersPerBox: 10, unitsPerBox: 100 },
  purchasePrice: 0, salePriceUnit: 0, salePriceBlister: 0, salePriceBox: 0, minStock: 50,
};

const emptyBatch = {
  lotNumber: '', expiryDate: '', entryDate: new Date().toISOString().split('T')[0],
  quantity: 0, costPrice: 0, supplierId: '',
};

export default function Products() {
  const { products, batches, addProduct, updateProduct, getProductStock, addBatch, updateBatch, deleteBatch, settings, categories, addCategory, updateCategory, deleteCategory } = useStore();
  const [query, setQuery] = useState('');
  const [catFilter, setCatFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Category management modal
  const [catModal, setCatModal] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [editingCat, setEditingCat] = useState<{ oldName: string; newName: string } | null>(null);

  // Product edit/new modal
  const [modalOpen, setModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'inventory' | 'prices' | 'batches'>('general');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [form, setForm] = useState<typeof emptyProduct>(emptyProduct);
  const [initialBatch, setInitialBatch] = useState<{ lotNumber: string; expiryDate: string; quantity: number }>({
    lotNumber: '', expiryDate: '', quantity: 0
  });

  // Import modal
  const [importModal, setImportModal] = useState(false);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importPreview, setImportPreview] = useState<ImportPreviewItem[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  // Batch management state inside modal
  const [editingBatch, setEditingBatch] = useState<ProductBatch | null>(null);
  const [batchForm, setBatchForm] = useState(emptyBatch);

  // Expiry dates alert threshold
  const now = new Date();
  const alertDate = new Date(now);
  alertDate.setDate(alertDate.getDate() + (settings?.expiryAlertDays ?? 90));

  const filtered = products.filter(p => {
    const matchQ = !query ||
      p.name.toLowerCase().includes(query.toLowerCase()) ||
      p.code.toLowerCase().includes(query.toLowerCase()) ||
      p.commercialName.toLowerCase().includes(query.toLowerCase()) ||
      p.activeIngredient.toLowerCase().includes(query.toLowerCase()) ||
      (p.location && p.location.toLowerCase().includes(query.toLowerCase()));
    const matchCat = catFilter === 'all' || p.category === catFilter;
    const matchStatus = statusFilter === 'all' || (statusFilter === 'active' ? p.active : !p.active);
    return matchQ && matchCat && matchStatus;
  });

  // ── Product modal methods ──────────────────────────────────────────────────
  const openNew = () => {
    setEditingProduct(null);
    setForm(emptyProduct);
    setInitialBatch({ lotNumber: '', expiryDate: '', quantity: 0 });
    setActiveTab('general');
    setModalOpen(true);
  };

  const openEdit = (p: Product, initialTab: 'general' | 'inventory' | 'prices' | 'batches' = 'general') => {
    setEditingProduct(p);
    setForm({ ...p, location: p.location || 'Estante A-1' });
    setBatchForm(emptyBatch);
    setEditingBatch(null);
    setActiveTab(initialTab);
    setModalOpen(true);
  };

  const handleSave = () => {
    const commercialName = form.commercialName.trim() || form.name.trim();
    if (!commercialName) {
      alert('El Nombre Comercial es obligatorio');
      return;
    }
    const finalForm = {
      ...form,
      commercialName,
      name: form.name.trim() || commercialName,
    };

    if (editingProduct) {
      updateProduct(editingProduct.id, finalForm);
    } else {
      const newId = `p-${Date.now()}`;
      addProduct({
        ...finalForm,
        id: newId,
        priceHistory: [],
        createdAt: new Date().toISOString().split('T')[0]
      });

      // Add initial batch if specified for new product
      if (initialBatch.lotNumber.trim() && initialBatch.expiryDate) {
        addBatch({
          id: `b-${Date.now()}`,
          productId: newId,
          lotNumber: initialBatch.lotNumber.trim(),
          expiryDate: initialBatch.expiryDate,
          entryDate: new Date().toISOString().split('T')[0],
          quantity: initialBatch.quantity || 0,
          costPrice: form.purchasePrice,
          supplierId: '',
        });
      }
    }
    setModalOpen(false);
  };

  const toggleActive = (p: Product) => updateProduct(p.id, { active: !p.active });

  const updateForm = (key: string, val: unknown) => setForm(f => ({ ...f, [key]: val }));

  const updateUnits = (key: string, val: number) => {
    const units = { ...form.units, [key]: val };
    units.unitsPerBox = units.unitsPerBlister * units.blistersPerBox;
    setForm(f => ({ ...f, units }));
  };

  // ── Batch Modal methods inside Product Edit ───────────────────────────────
  const getProductBatches = (productId: string) =>
    batches.filter(b => b.productId === productId).sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());

  const handleSaveBatchInModal = () => {
    if (!editingProduct || !batchForm.lotNumber || !batchForm.expiryDate) return;
    if (editingBatch) {
      updateBatch(editingBatch.id, batchForm);
    } else {
      addBatch({ ...batchForm, id: `b-${Date.now()}`, productId: editingProduct.id });
    }
    setEditingBatch(null);
    setBatchForm(emptyBatch);
  };

  const handleDeleteBatchInModal = (batchId: string) => {
    if (confirm('¿Eliminar este lote permanentemente?')) deleteBatch(batchId);
  };

  // ── Import Logic ────────────────────────────────────────────────────────────
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const data = new Uint8Array(ev.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' });
        const errors: string[] = [];
        const preview: ImportPreviewItem[] = [];

        rows.forEach((row, i) => {
          const rowNum = i + 2;

          // Flexible header reading
          const name = getCellVal(row, 'nombre', 'nombre_comercial', 'nombre comercial', 'producto', 'medicamento') ||
            getCellVal(row, 'principio_activo', 'principio activo');
          const commercialName = getCellVal(row, 'nombre_comercial', 'nombre comercial') || name;
          const code = getCellVal(row, 'codigo', 'código', 'cod');
          const barcode = getCellVal(row, 'codigo_barras', 'código de barras', 'barcode');
          const activeIngredient = getCellVal(row, 'principio_activo', 'principio activo');
          const laboratory = getCellVal(row, 'laboratorio', 'lab');
          const catRaw = getCellVal(row, 'categoria', 'categoría');
          const category = categories.find(c => c.toLowerCase() === catRaw.toLowerCase()) || (catRaw ? 'Otros' : (categories[0] || 'Analgésicos'));
          const presRaw = getCellVal(row, 'presentacion', 'presentación');
          const presentation = (PRESENTATIONS.includes(presRaw as ProductPresentation) ? presRaw : 'box') as ProductPresentation;
          const unitMeasure = getCellVal(row, 'unidad_medida', 'unidad medida', 'unidad') || 'Tableta';

          const upb = parseInt(getCellVal(row, 'unidades_por_blister', 'unidades por blister')) || 10;
          const bpb = parseInt(getCellVal(row, 'blisteres_por_caja', 'blisteres por caja')) || 10;

          const purchasePrice = parseFloat(getCellVal(row, 'precio_compra', 'precio compra (s/)', 'precio compra')) || 0;
          const salePriceUnit = parseFloat(getCellVal(row, 'precio_venta', 'precio_venta_unidad', 'precio venta (s/)', 'precio venta unidad')) || 0;
          const salePriceBlister = parseFloat(getCellVal(row, 'precio_venta_blister', 'precio venta blister')) || (salePriceUnit * upb);
          const salePriceBox = parseFloat(getCellVal(row, 'precio_venta_caja', 'precio venta caja')) || (salePriceUnit * upb * bpb);
          const minStock = parseInt(getCellVal(row, 'stock_minimo', 'stock mínimo', 'stock minimo')) || 20;
          const location = getCellVal(row, 'ubicacion', 'ubicación', 'estante') || 'Estante A-1';

          // Batch & Expiry information
          const lotNumber = getCellVal(row, 'lote', 'lote principal', 'n° lote');
          const expiryDateRaw = getCellVal(row, 'fecha_vencimiento', 'fecha vencimiento', 'vencimiento');
          const stockActual = parseInt(getCellVal(row, 'stock_actual', 'stock actual', 'cantidad')) || 0;

          if (!name && !code) {
            errors.push(`Fila ${rowNum}: requiere al menos "nombre" o "código"`);
            return;
          }

          let formattedExpiryDate = '';
          if (expiryDateRaw) {
            if (/^\d{4}-\d{2}-\d{2}$/.test(expiryDateRaw)) {
              formattedExpiryDate = expiryDateRaw;
            } else if (!isNaN(Date.parse(expiryDateRaw))) {
              formattedExpiryDate = new Date(expiryDateRaw).toISOString().split('T')[0];
            } else if (!isNaN(Number(expiryDateRaw))) {
              // Excel date serial number
              const jsDate = new Date((Number(expiryDateRaw) - (25567 + 2)) * 86400 * 1000);
              formattedExpiryDate = jsDate.toISOString().split('T')[0];
            }
          }

          preview.push({
            product: {
              code: code || `MED-${Math.floor(1000 + Math.random() * 9000)}`,
              barcode: barcode || '',
              name: name || commercialName,
              commercialName: commercialName || name,
              activeIngredient: activeIngredient || name,
              laboratory: laboratory || 'Generico',
              category,
              subcategory: '',
              presentation,
              concentration: getCellVal(row, 'concentracion', 'concentración'),
              pharmaceuticalForm: getCellVal(row, 'forma_farmaceutica', 'forma farmacéutica') || unitMeasure,
              unitMeasure,
              description: getCellVal(row, 'descripcion', 'descripción'),
              location,
              active: true,
              units: { unitsPerBlister: upb, blistersPerBox: bpb, unitsPerBox: upb * bpb },
              purchasePrice,
              salePriceUnit,
              salePriceBlister,
              salePriceBox,
              minStock,
            },
            initialBatch: (lotNumber || formattedExpiryDate || stockActual > 0) ? {
              lotNumber: lotNumber || `LOT-${new Date().getFullYear()}-01`,
              expiryDate: formattedExpiryDate || new Date(now.getFullYear() + 2, now.getMonth(), now.getDate()).toISOString().split('T')[0],
              quantity: stockActual,
              costPrice: purchasePrice,
            } : undefined
          });
        });

        setImportErrors(errors);
        setImportPreview(preview);
      } catch (err) {
        setImportErrors([`Error al procesar el archivo Excel: ${(err as Error).message}`]);
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  const handleImportConfirm = () => {
    importPreview.forEach(({ product, initialBatch: b }) => {
      const productId = `p-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      addProduct({
        ...product,
        id: productId,
        priceHistory: [],
        createdAt: new Date().toISOString().split('T')[0]
      });

      if (b) {
        addBatch({
          id: `b-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          productId,
          lotNumber: b.lotNumber,
          expiryDate: b.expiryDate,
          entryDate: new Date().toISOString().split('T')[0],
          quantity: b.quantity,
          costPrice: b.costPrice,
          supplierId: '',
        });
      }
    });

    setImportModal(false);
    setImportPreview([]);
    setImportErrors([]);
  };

  const productBatchesForEdit = editingProduct ? getProductBatches(editingProduct.id) : [];

  return (
    <Layout title="Productos e Inventario"
      actions={
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setCatModal(true)}>
            Categorías
          </Button>
          <Button variant="secondary" size="sm" onClick={() => exportProducts(products, batches)}>
            <FileSpreadsheet size={14} /> Exportar Excel
          </Button>
          <Button variant="outline" size="sm" onClick={() => { setImportModal(true); setImportPreview([]); setImportErrors([]); }}>
            <Upload size={14} /> Importar Excel
          </Button>
          <Button size="sm" onClick={openNew}><Plus size={14} /> Nuevo Producto</Button>
        </div>
      }
    >
      <div className="space-y-4 animate-fadeIn">
        {/* Filters */}
        <Card className="flex flex-wrap gap-3 items-center py-3">
          <div className="relative flex-1 min-w-48">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar por nombre, código, activo, laboratorio o estante..."
              className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-400/50" />
          </div>
          <select value={catFilter} onChange={e => setCatFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-700 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-400/50">
            <option value="all">Todas las categorías</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-700 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-400/50">
            <option value="all">Todos los estados</option>
            <option value="active">Activos</option>
            <option value="inactive">Inactivos</option>
          </select>
          <span className="text-xs text-slate-400 font-mono ml-auto">{filtered.length} productos</span>
        </Card>

        {/* Table */}
        <Card padding={false} className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50">
                  {['Código', 'Producto y Detalles', 'Categoría', 'Ubicación', 'Stock / Mín.', 'Próx. Vencimiento', 'P. Venta Und.', 'P. Venta Caja', 'Estado', 'Acciones'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 font-mono uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {filtered.map(p => {
                  const stock = getProductStock(p.id);
                  const stockVariant = stock === 0 ? 'danger' : stock <= p.minStock ? 'warning' : 'success';
                  const prodBatches = getProductBatches(p.id);
                  const nextExpiry = prodBatches.find(b => b.quantity > 0);
                  const hasExpired = nextExpiry && new Date(nextExpiry.expiryDate) < now;
                  const hasExpiring = nextExpiry && !hasExpired && new Date(nextExpiry.expiryDate) <= alertDate;

                  return (
                    <tr key={p.id} className={`hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors ${hasExpired ? 'bg-red-50/20 dark:bg-red-900/5' : hasExpiring ? 'bg-amber-50/20 dark:bg-amber-900/5' : ''}`}>
                      <td className="px-4 py-3 font-mono text-xs text-slate-500">{p.code}</td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-semibold text-slate-800 dark:text-slate-100 font-display">{p.commercialName || p.name}</p>
                          <p className="text-xs text-slate-400">
                            {p.activeIngredient} · {p.laboratory}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3"><Badge variant="muted">{p.category}</Badge></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 text-xs font-mono text-slate-600 dark:text-slate-300">
                          <MapPin size={12} className="text-teal-500" />
                          <span>{p.location || 'Sin asignación'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="space-y-0.5">
                          <Badge variant={stockVariant}>{stock} uds</Badge>
                          <p className="text-[10px] text-slate-400 font-mono">Mín: {p.minStock}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {nextExpiry ? (
                          <div>
                            <p className={`text-xs font-mono font-semibold ${hasExpired ? 'text-red-500' : hasExpiring ? 'text-amber-500' : 'text-slate-600 dark:text-slate-300'}`}>
                              {new Date(nextExpiry.expiryDate).toLocaleDateString('es-PE')}
                            </p>
                            <p className="text-[10px] text-slate-400 font-mono">Lote: {nextExpiry.lotNumber}</p>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Sin lotes</span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-teal-700 dark:text-teal-400 font-semibold">S/ {p.salePriceUnit.toFixed(2)}</td>
                      <td className="px-4 py-3 font-mono text-xs text-teal-700 dark:text-teal-400">S/ {p.salePriceBox.toFixed(2)}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => toggleActive(p)} className="text-slate-400 hover:text-teal-600 transition-colors">
                          {p.active ? <ToggleRight size={20} className="text-teal-500" /> : <ToggleLeft size={20} />}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <button onClick={() => openEdit(p, 'batches')} title="Ver y editar lotes / vencimientos"
                            className="p-1.5 rounded-lg hover:bg-teal-50 dark:hover:bg-teal-900/20 text-slate-400 hover:text-teal-600 transition-colors relative">
                            <Calendar size={14} />
                            {prodBatches.length > 0 && (
                              <span className="absolute -top-1 -right-1 bg-teal-500 text-white text-[9px] w-3.5 h-3.5 rounded-full flex items-center justify-center font-bold">
                                {prodBatches.length}
                              </span>
                            )}
                          </button>
                          <button onClick={() => openEdit(p, 'general')} title="Editar producto completo"
                            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-teal-600 transition-colors">
                            <Edit2 size={14} />
                          </button>
                          <button onClick={() => {
                            if (window.confirm(`¿Estás seguro de eliminar el producto "${p.commercialName || p.name}" y sus lotes asociados?`)) {
                              useStore.getState().deleteProduct(p.id);
                            }
                          }} title="Eliminar producto"
                            className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 transition-colors">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={10} className="px-4 py-12 text-center text-slate-400 text-sm">No hay productos que coincidan con los filtros</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* ── Import Modal ─────────────────────────────────────────────────────── */}
      <Modal open={importModal} onClose={() => setImportModal(false)} title="Importar catálogo de productos desde Excel" width="2xl"
        footer={
          <>
            <Button variant="secondary" onClick={() => setImportModal(false)}>Cancelar</Button>
            <Button variant="outline" onClick={downloadTemplate}><Download size={14} /> Descargar plantilla completa</Button>
            {importPreview.length > 0 && (
              <Button onClick={handleImportConfirm}>Confirmar e importar {importPreview.length} productos</Button>
            )}
          </>
        }
      >
        <div className="space-y-4">
          <div className="bg-teal-50 dark:bg-teal-900/20 border border-teal-100 dark:border-teal-800 rounded-xl p-4">
            <p className="text-sm font-semibold text-teal-800 dark:text-teal-200 font-display mb-1">Instrucciones de Importación</p>
            <ol className="text-xs text-teal-700 dark:text-teal-300 space-y-1 list-decimal list-inside">
              <li>Haz clic en <strong>"Descargar plantilla completa"</strong> para obtener el archivo de ejemplo listo con las cabeceras solicitadas.</li>
              <li>Rellena las columnas: Código, Nombre Comercial, Principio Activo, Categoría, Laboratorio, Presentación, Unidad Medida, Lote, Fecha Vencimiento, Stock Actual, Stock Mínimo, Precios y Ubicación.</li>
              <li>Sube el archivo cargado (.xlsx) para verificar la vista previa antes de guardarlo en la base de datos.</li>
            </ol>
          </div>

          <div onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-slate-200 dark:border-slate-600 rounded-xl p-8 text-center cursor-pointer hover:border-teal-400 hover:bg-teal-50/50 dark:hover:bg-teal-900/10 transition-colors">
            <FileSpreadsheet size={32} className="mx-auto text-emerald-500 mb-2" />
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Haz clic para seleccionar tu archivo Excel (.xlsx)</p>
            <p className="text-xs text-slate-400 mt-1">Soporta plantillas estándar y personalizadas</p>
            <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileChange} />
          </div>

          {importErrors.length > 0 && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-xl p-3 space-y-1">
              <div className="flex gap-2 items-center">
                <AlertCircle size={14} className="text-red-500" />
                <p className="text-xs font-semibold text-red-700 dark:text-red-300">Observaciones ({importErrors.length})</p>
              </div>
              {importErrors.map((e, i) => <p key={i} className="text-xs text-red-600 dark:text-red-400 font-mono pl-5">{e}</p>)}
            </div>
          )}

          {importPreview.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 font-mono mb-2 uppercase tracking-wide">
                Vista previa de importación · {importPreview.length} registros listos
              </p>
              <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                      {['Código', 'Nombre Comercial', 'Principio Activo', 'Lote / Vencimiento', 'Stock', 'Stock Mín.', 'P. Venta', 'Ubicación'].map(h => (
                        <th key={h} className="px-3 py-2 text-left font-semibold text-slate-500 font-mono uppercase tracking-wide whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50 font-mono">
                    {importPreview.map((item, i) => (
                      <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-700/20">
                        <td className="px-3 py-1.5 text-slate-500">{item.product.code}</td>
                        <td className="px-3 py-1.5 font-display font-semibold text-slate-800 dark:text-slate-100">{item.product.name}</td>
                        <td className="px-3 py-1.5 text-slate-500">{item.product.activeIngredient}</td>
                        <td className="px-3 py-1.5 text-slate-600 dark:text-slate-300">
                          {item.initialBatch ? `${item.initialBatch.lotNumber} (${item.initialBatch.expiryDate})` : '—'}
                        </td>
                        <td className="px-3 py-1.5 font-bold text-teal-600">{item.initialBatch?.quantity || 0}</td>
                        <td className="px-3 py-1.5 text-slate-500">{item.product.minStock}</td>
                        <td className="px-3 py-1.5 text-teal-600 font-semibold">S/ {item.product.salePriceUnit.toFixed(2)}</td>
                        <td className="px-3 py-1.5 text-slate-500">{item.product.location}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* ── Main Product Edit & New Modal ───────────────────────────────────────── */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingProduct ? `Editar Producto — ${editingProduct.name}` : 'Nuevo Producto'} width="2xl"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>Guardar producto</Button>
          </>
        }
      >
        <div className="space-y-4">
          {/* Modal Tabs */}
          <div className="flex border-b border-slate-200 dark:border-slate-700 gap-2">
            <button
              onClick={() => setActiveTab('general')}
              className={`px-4 py-2 text-xs font-semibold font-mono rounded-t-lg transition-colors border-b-2 ${activeTab === 'general' ? 'border-teal-500 text-teal-600 dark:text-teal-400 bg-teal-50/50 dark:bg-teal-900/10' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
              📋 Información General
            </button>
            <button
              onClick={() => setActiveTab('inventory')}
              className={`px-4 py-2 text-xs font-semibold font-mono rounded-t-lg transition-colors border-b-2 ${activeTab === 'inventory' ? 'border-teal-500 text-teal-600 dark:text-teal-400 bg-teal-50/50 dark:bg-teal-900/10' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
              📦 Inventario y Almacén
            </button>
            <button
              onClick={() => setActiveTab('prices')}
              className={`px-4 py-2 text-xs font-semibold font-mono rounded-t-lg transition-colors border-b-2 ${activeTab === 'prices' ? 'border-teal-500 text-teal-600 dark:text-teal-400 bg-teal-50/50 dark:bg-teal-900/10' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
              💰 Precios y Venta
            </button>
            <button
              onClick={() => setActiveTab('batches')}
              className={`px-4 py-2 text-xs font-semibold font-mono rounded-t-lg transition-colors border-b-2 ${activeTab === 'batches' ? 'border-teal-500 text-teal-600 dark:text-teal-400 bg-teal-50/50 dark:bg-teal-900/10' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
              📅 Lotes y Vencimientos {editingProduct ? `(${productBatchesForEdit.length})` : ''}
            </button>
          </div>

          {/* TAB 1: General Info */}
          {activeTab === 'general' && (
            <div className="grid grid-cols-2 gap-3 pt-2">
              <Input label="Código interno *" value={form.code} onChange={e => updateForm('code', e.target.value)} placeholder="MED001" />
              <Input label="Nombre Comercial *" value={form.commercialName} onChange={e => updateForm('commercialName', e.target.value)} placeholder="Panadol, Advil, Apronax..." />
              <Input label="Nombre del Medicamento (Opcional)" value={form.name} onChange={e => updateForm('name', e.target.value)} placeholder="Ej: Paracetamol 500mg" className="col-span-2" />
              <Input label="Principio activo" value={form.activeIngredient} onChange={e => updateForm('activeIngredient', e.target.value)} placeholder="Paracetamol" />
              <Input label="Laboratorio" value={form.laboratory} onChange={e => updateForm('laboratory', e.target.value)} placeholder="GlaxoSmithKline" />
              <Select label="Categoría" value={form.category} onChange={e => updateForm('category', e.target.value)} options={categories.map(c => ({ value: c, label: c }))} />
              
              {/* Tipo de Presentación (Obligatorio) */}
              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1 font-display">Tipo de presentación *</label>
                <select
                  value={PRESENTATION_TYPES.includes(form.tipoPresentacion as any) ? form.tipoPresentacion : 'Custom'}
                  onChange={e => {
                    const val = e.target.value;
                    if (val === 'Custom') {
                      const customVal = prompt('Ingrese el nuevo tipo de presentación personalizada:', '');
                      if (customVal && customVal.trim()) {
                        updateForm('tipoPresentacion', customVal.trim());
                      }
                    } else {
                      updateForm('tipoPresentacion', val);
                    }
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-700 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-400/50"
                >
                  {PRESENTATION_TYPES.map(pt => (
                    <option key={pt} value={pt}>{pt}</option>
                  ))}
                  {!PRESENTATION_TYPES.includes(form.tipoPresentacion as any) && (
                    <option value={form.tipoPresentacion}>{form.tipoPresentacion} (Personalizado)</option>
                  )}
                  <option value="Custom">+ Agregar nueva presentación personalizada...</option>
                </select>
                <p className="text-[11px] text-slate-400 mt-1">Seleccione o agregue la forma farmacéutica exacta.</p>
              </div>

              <Textarea label="Descripción" value={form.description} onChange={e => updateForm('description', e.target.value)} rows={2} className="col-span-2" />
            </div>
          )}

          {/* TAB 2: Inventory, Minimum Stock & Location */}
          {activeTab === 'inventory' && (
            <div className="space-y-4 pt-2">
              <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-4">
                <h4 className="text-xs font-semibold text-teal-700 dark:text-teal-300 uppercase tracking-wide font-mono flex items-center gap-1.5">
                  <Package size={14} /> Control de Inventario y Ubicación Física
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1 font-display">Unidad Base para Inventario *</label>
                    <input type="text" value={form.unidadBase || ''} onChange={e => updateForm('unidadBase', e.target.value)} placeholder="Ej: Unidad, Frasco, Ampolla, Sobre"
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-700 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-400/50 font-bold text-teal-700 dark:text-teal-300" />
                    <p className="text-[11px] text-slate-400 mt-1">El stock general se contabilizará en esta unidad.</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1 font-display">Stock Mínimo (Alerta) *</label>
                    <input type="number" min="0" value={form.minStock} onChange={e => updateForm('minStock', parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-700 text-sm font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-400/50" />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1 font-display">Ubicación en Almacén / Estante *</label>
                    <input type="text" value={form.location || ''} onChange={e => updateForm('location', e.target.value)} placeholder="Ej: Estante A-12, Vitrina B"
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-700 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-400/50" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Prices & Sale Units */}
          {activeTab === 'prices' && (
            <div className="space-y-4 pt-2">
              <div className="bg-teal-50/50 dark:bg-teal-900/10 p-4 rounded-xl border border-teal-100 dark:border-teal-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-teal-800 dark:text-teal-300 uppercase tracking-wide font-mono">
                    ⚡ Configuración Dinámica de Unidades de Venta
                  </h4>
                  <Button size="sm" variant="outline" onClick={() => {
                    const currentUnits = form.unidadesVenta || [];
                    setForm(f => ({
                      ...f,
                      unidadesVenta: [...currentUnits, { nombre: 'Nueva Unidad', cantidadBase: 1, precioVenta: 0 }]
                    }));
                  }}>
                    <Plus size={12} /> Agregar opción de venta
                  </Button>
                </div>
                <p className="text-xs text-slate-500">
                  Selecciona qué presentaciones se ofrecerán en el Punto de Venta (POS) y sus equivalencias respecto a la unidad base (<strong>{form.unidadBase || 'Unidad'}</strong>).
                </p>

                <div className="space-y-2 mt-2">
                  {(form.unidadesVenta || []).map((u, idx) => (
                    <div key={idx} className="flex gap-2 items-center bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                      <div className="flex-1">
                        <label className="text-[11px] font-medium text-slate-500 block mb-0.5">Nombre presentación</label>
                        <input
                          type="text"
                          value={u.nombre}
                          onChange={e => {
                            const nextUnits = [...form.unidadesVenta];
                            nextUnits[idx].nombre = e.target.value;
                            setForm(f => ({ ...f, unidadesVenta: nextUnits }));
                          }}
                          placeholder="Ej: Frasco, Blíster, Caja..."
                          className="w-full px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-100"
                        />
                      </div>

                      <div className="w-32">
                        <label className="text-[11px] font-medium text-slate-500 block mb-0.5">Equiv. en {form.unidadBase || 'base'}</label>
                        <input
                          type="number"
                          min="1"
                          value={u.cantidadBase}
                          onChange={e => {
                            const nextUnits = [...form.unidadesVenta];
                            nextUnits[idx].cantidadBase = Math.max(1, parseInt(e.target.value) || 1);
                            setForm(f => ({ ...f, unidadesVenta: nextUnits }));
                          }}
                          className="w-full px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700 text-xs font-mono"
                        />
                      </div>

                      <div className="w-32">
                        <label className="text-[11px] font-medium text-slate-500 block mb-0.5">Precio Venta (S/)</label>
                        <input
                          type="number"
                          min="0"
                          step="0.10"
                          value={u.precioVenta}
                          onChange={e => {
                            const val = parseFloat(e.target.value) || 0;
                            const nextUnits = [...form.unidadesVenta];
                            nextUnits[idx].precioVenta = val;
                            
                            // Keep legacy fields in sync for backward compatibility
                            const isUnit = u.nombre.toLowerCase().includes('unidad');
                            const isBlister = u.nombre.toLowerCase().includes('blíster') || u.nombre.toLowerCase().includes('blister');
                            const isBox = u.nombre.toLowerCase().includes('caja');

                            setForm(f => ({
                              ...f,
                              unidadesVenta: nextUnits,
                              salePriceUnit: isUnit ? val : f.salePriceUnit || val,
                              salePriceBlister: isBlister ? val : f.salePriceBlister,
                              salePriceBox: isBox ? val : f.salePriceBox,
                            }));
                          }}
                          className="w-full px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700 text-xs font-mono font-bold text-teal-700 dark:text-teal-400"
                        />
                      </div>

                      {form.unidadesVenta.length > 1 && (
                        <button
                          onClick={() => setForm(f => ({ ...f, unidadesVenta: f.unidadesVenta.filter((_, i) => i !== idx) }))}
                          className="p-1.5 text-red-400 hover:text-red-600 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 mt-4"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-400 block mb-1 font-display">Precio Compra Base (S/)</label>
                  <input type="number" min="0" step="0.01" value={form.purchasePrice} onChange={e => updateForm('purchasePrice', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-700 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-teal-400/50" />
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Batches & Expiry Dates */}
          {activeTab === 'batches' && (
            <div className="space-y-4 pt-2">
              {editingProduct ? (
                <>
                  {/* Summary & Batch list */}
                  <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                    <div>
                      <p className="text-xs text-slate-500 font-mono uppercase">Stock Total en Almacén</p>
                      <p className="text-lg font-bold text-teal-600 font-mono">{getProductStock(editingProduct.id)} unidades</p>
                    </div>
                    <Badge variant={getProductStock(editingProduct.id) <= editingProduct.minStock ? 'warning' : 'success'}>
                      Stock Mínimo Configurado: {editingProduct.minStock}
                    </Badge>
                  </div>

                  <div>
                    <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide font-mono mb-2">Lotes y Vencimientos Registrados</h4>
                    {productBatchesForEdit.length === 0 ? (
                      <p className="text-sm text-slate-400 text-center py-6 bg-slate-50 dark:bg-slate-800/30 rounded-xl">
                        Este producto no tiene lotes asignados. Agrega uno a continuación.
                      </p>
                    ) : (
                      <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                              {['N° Lote', 'Ingreso', 'Vencimiento', 'Estado', 'Cantidad', 'Costo Unit.', 'Acciones'].map(h => (
                                <th key={h} className="px-3 py-2 text-left font-semibold text-slate-500 dark:text-slate-400 font-mono uppercase whitespace-nowrap">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50 font-mono">
                            {productBatchesForEdit.map(b => {
                              const expiry = new Date(b.expiryDate);
                              const daysLeft = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                              const isExpired = daysLeft < 0;
                              const isWarning = !isExpired && daysLeft <= (settings?.expiryAlertDays ?? 90);

                              return (
                                <tr key={b.id} className={isExpired ? 'bg-red-50/40 dark:bg-red-900/10' : isWarning ? 'bg-amber-50/40 dark:bg-amber-900/10' : ''}>
                                  <td className="px-3 py-2 font-bold text-slate-700 dark:text-slate-200">{b.lotNumber}</td>
                                  <td className="px-3 py-2 text-slate-500">{new Date(b.entryDate).toLocaleDateString('es-PE')}</td>
                                  <td className={`px-3 py-2 font-bold ${isExpired ? 'text-red-500' : isWarning ? 'text-amber-500' : 'text-slate-600 dark:text-slate-300'}`}>
                                    {new Date(b.expiryDate).toLocaleDateString('es-PE')}
                                  </td>
                                  <td className="px-3 py-2">
                                    <Badge variant={isExpired ? 'danger' : isWarning ? 'warning' : 'success'}>
                                      {isExpired ? `Vencido (${Math.abs(daysLeft)}d)` : `Vence en ${daysLeft}d`}
                                    </Badge>
                                  </td>
                                  <td className="px-3 py-2 font-bold text-slate-800 dark:text-slate-100">{b.quantity} uds</td>
                                  <td className="px-3 py-2 text-slate-500">S/ {b.costPrice.toFixed(2)}</td>
                                  <td className="px-3 py-2">
                                    <div className="flex gap-1">
                                      <button onClick={() => { setEditingBatch(b); setBatchForm({ ...b }); }}
                                        className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-teal-600">
                                        <Edit2 size={12} />
                                      </button>
                                      <button onClick={() => handleDeleteBatchInModal(b.id)}
                                        className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500">
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

                  {/* Add or edit batch inside modal */}
                  <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                    <h5 className="text-xs font-semibold text-teal-700 dark:text-teal-300 uppercase tracking-wide font-mono mb-3">
                      {editingBatch ? '✏️ Editar Lote' : '+ Registrar Nuevo Lote'}
                    </h5>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      <div>
                        <label className="text-xs font-medium text-slate-600 dark:text-slate-400 block mb-1 font-display">N° de Lote *</label>
                        <input value={batchForm.lotNumber} onChange={e => setBatchForm(f => ({ ...f, lotNumber: e.target.value }))} placeholder="LOT-2025-001"
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-700 text-xs font-mono" />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-slate-600 dark:text-slate-400 block mb-1 font-display">Fecha Vencimiento *</label>
                        <input type="date" value={batchForm.expiryDate} onChange={e => setBatchForm(f => ({ ...f, expiryDate: e.target.value }))}
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-700 text-xs font-mono" />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-slate-600 dark:text-slate-400 block mb-1 font-display">Cantidad (Unidades)</label>
                        <input type="number" min="0" value={batchForm.quantity} onChange={e => setBatchForm(f => ({ ...f, quantity: parseInt(e.target.value) || 0 }))}
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-700 text-xs font-mono" />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-slate-600 dark:text-slate-400 block mb-1 font-display">Costo Unitario (S/)</label>
                        <input type="number" min="0" step="0.01" value={batchForm.costPrice} onChange={e => setBatchForm(f => ({ ...f, costPrice: parseFloat(e.target.value) || 0 }))}
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-700 text-xs font-mono" />
                      </div>
                      <div className="col-span-2 flex items-end gap-2">
                        {editingBatch && (
                          <Button variant="secondary" size="sm" onClick={() => { setEditingBatch(null); setBatchForm(emptyBatch); }}>
                            Cancelar
                          </Button>
                        )}
                        <Button size="sm" onClick={handleSaveBatchInModal} disabled={!batchForm.lotNumber || !batchForm.expiryDate}>
                          <Plus size={13} /> {editingBatch ? 'Actualizar Lote' : 'Guardar Lote'}
                        </Button>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                /* Initial batch option for brand new product creation */
                <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                  <h4 className="text-xs font-semibold text-teal-700 dark:text-teal-300 uppercase tracking-wide font-mono flex items-center gap-1.5">
                    <Calendar size={14} /> Registrar Lote Inicial y Vencimiento (Opcional)
                  </h4>
                  <p className="text-xs text-slate-500">Puedes ingresar el primer lote y stock inicial directamente al crear este producto:</p>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs font-medium text-slate-600 dark:text-slate-400 block mb-1 font-display">N° Lote Inicial</label>
                      <input type="text" value={initialBatch.lotNumber} onChange={e => setInitialBatch(b => ({ ...b, lotNumber: e.target.value }))} placeholder="LOT-2025-001"
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-700 text-sm font-mono" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-600 dark:text-slate-400 block mb-1 font-display">Fecha de Vencimiento</label>
                      <input type="date" value={initialBatch.expiryDate} onChange={e => setInitialBatch(b => ({ ...b, expiryDate: e.target.value }))}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-700 text-sm font-mono" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-600 dark:text-slate-400 block mb-1 font-display">Stock Inicial (Unidades)</label>
                      <input type="number" min="0" value={initialBatch.quantity} onChange={e => setInitialBatch(b => ({ ...b, quantity: parseInt(e.target.value) || 0 }))}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-700 text-sm font-mono" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </Modal>

      {/* ── Category Management Modal ─────────────────────────────────────── */}
      <Modal open={catModal} onClose={() => setCatModal(false)} title="Gestionar Categorías de Productos" width="md"
        footer={<Button variant="secondary" onClick={() => setCatModal(false)}>Cerrar</Button>}
      >
        <div className="space-y-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={newCatName}
              onChange={e => setNewCatName(e.target.value)}
              placeholder="Nueva categoría (Ej: Oftálmicos, Dermatología)..."
              className="flex-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-700 text-sm"
            />
            <Button size="sm" onClick={() => { if (newCatName.trim()) { addCategory(newCatName); setNewCatName(''); } }} disabled={!newCatName.trim()}>
              <Plus size={14} /> Agregar
            </Button>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
            {categories.map(cat => {
              const count = products.filter(p => p.category === cat).length;
              const isEditing = editingCat?.oldName === cat;
              return (
                <div key={cat} className="px-3 py-2 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700/30">
                  {isEditing ? (
                    <div className="flex gap-1 flex-1 mr-2">
                      <input
                        type="text"
                        value={editingCat.newName}
                        onChange={e => setEditingCat({ ...editingCat, newName: e.target.value })}
                        className="flex-1 px-2 py-1 text-xs border rounded bg-white dark:bg-slate-700"
                      />
                      <Button size="sm" onClick={() => { updateCategory(cat, editingCat.newName); setEditingCat(null); }}>Guardar</Button>
                      <Button variant="secondary" size="sm" onClick={() => setEditingCat(null)}>Cancelar</Button>
                    </div>
                  ) : (
                    <>
                      <div>
                        <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">{cat}</span>
                        <span className="text-[10px] text-slate-400 font-mono ml-2">({count} productos)</span>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => setEditingCat({ oldName: cat, newName: cat })} className="p-1 text-slate-400 hover:text-teal-600">
                          <Edit2 size={12} />
                        </button>
                        <button onClick={() => { if (confirm(`¿Eliminar la categoría "${cat}"?`)) deleteCategory(cat); }} className="p-1 text-slate-400 hover:text-red-500">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </Modal>
    </Layout>
  );
}
