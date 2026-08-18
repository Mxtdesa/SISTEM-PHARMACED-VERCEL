import { useState } from 'react';
import { Save, Store, Bell, Shield, Printer, DollarSign } from 'lucide-react';
import Layout from '../components/layout/Layout';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { useStore } from '../store/useStore';
import { mockAuditLogs } from '../data/mockData';

const TABS = [
  { id: 'company', label: 'Empresa', icon: Store },
  { id: 'alerts', label: 'Alertas', icon: Bell },
  { id: 'pos', label: 'POS / Caja', icon: DollarSign },
  { id: 'security', label: 'Seguridad', icon: Shield },
  { id: 'audit', label: 'Auditoría', icon: Printer },
];

export default function Settings() {
  const { settings, updateSettings } = useStore();
  const [tab, setTab] = useState('company');
  const [form, setForm] = useState({ ...settings });
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    updateSettings(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const update = (key: string, value: unknown) => setForm(f => ({ ...f, [key]: value }));

  return (
    <Layout title="Configuración"
      actions={
        <Button size="sm" onClick={handleSave} variant={saved ? 'success' : 'primary'}>
          <Save size={14} /> {saved ? '¡Guardado!' : 'Guardar cambios'}
        </Button>
      }
    >
      <div className="flex flex-col lg:flex-row gap-4 animate-fadeIn">
        {/* Side tabs */}
        <div className="w-full lg:w-48 shrink-0">
          <Card className="p-2">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => setTab(id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium font-display transition-all ${tab === id ? 'bg-teal-600 text-white' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>
                <Icon size={15} />
                {label}
              </button>
            ))}
          </Card>
        </div>

        {/* Content */}
        <div className="flex-1 space-y-4">
          {tab === 'company' && (
            <Card>
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 font-display mb-4">Información de la empresa</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { key: 'name', label: 'Nombre de la farmacia', placeholder: 'Farmacia San Miguel' },
                  { key: 'ruc', label: 'RUC', placeholder: '20123456789' },
                  { key: 'address', label: 'Dirección', placeholder: 'Av. San Martín 456, Lima' },
                  { key: 'phone', label: 'Teléfono', placeholder: '01-234-5678' },
                  { key: 'email', label: 'Correo electrónico', placeholder: 'contacto@farmacia.pe' },
                  { key: 'currencySymbol', label: 'Símbolo de moneda', placeholder: 'S/' },
                ].map(({ key, label, placeholder }) => (
                  <div key={key}>
                    <label className="text-xs font-medium text-slate-600 dark:text-slate-400 block mb-1 font-display">{label}</label>
                    <input value={(form as Record<string, unknown>)[key] as string ?? ''} onChange={e => update(key, e.target.value)} placeholder={placeholder}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-700 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-400/50" />
                  </div>
                ))}
                <div>
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-400 block mb-1 font-display">Tasa de impuesto (%)</label>
                  <input type="number" min="0" max="30" value={form.taxRate} onChange={e => update('taxRate', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-700 text-sm text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-teal-400/50" />
                </div>
              </div>
            </Card>
          )}

          {tab === 'alerts' && (
            <Card>
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 font-display mb-4">Configuración de alertas del sistema</h3>
              <div className="space-y-5">
                <div>
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-400 block mb-1 font-display">
                    Días de anticipación para alerta de vencimiento de medicamentos
                  </label>
                  <div className="flex items-center gap-3">
                    <input type="range" min="7" max="180" value={form.expiryAlertDays} onChange={e => update('expiryAlertDays', parseInt(e.target.value))}
                      className="flex-1 accent-teal-600" />
                    <span className="font-mono font-bold text-teal-700 dark:text-teal-400 w-16 text-right">{form.expiryAlertDays} días</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">Alertará en el Dashboard cuando un producto venza en menos de {form.expiryAlertDays} días.</p>
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-400 block mb-1 font-display">
                    Días de anticipación para alerta de stock bajo
                  </label>
                  <div className="flex items-center gap-3">
                    <input type="range" min="1" max="90" value={form.lowStockDays} onChange={e => update('lowStockDays', parseInt(e.target.value))}
                      className="flex-1 accent-teal-600" />
                    <span className="font-mono font-bold text-teal-700 dark:text-teal-400 w-16 text-right">{form.lowStockDays} días</span>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200 dark:border-slate-700 gap-4">
                  <div>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200 font-display">Alertas sonoras y notificaciones</p>
                    <p className="text-xs text-slate-400 mt-0.5">Emitir sonido al registrar venta o cuando una alerta de stock/pago a personal esté próxima.</p>
                  </div>
                  <button onClick={() => update('enableSoundAlerts', !form.enableSoundAlerts)}
                    className={`w-12 h-6.5 rounded-full relative transition-colors shrink-0 flex items-center ${form.enableSoundAlerts ? 'bg-teal-500' : 'bg-slate-300 dark:bg-slate-600'}`}>
                    <span className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${form.enableSoundAlerts ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
              </div>
            </Card>
          )}

          {tab === 'pos' && (
            <Card>
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 font-display mb-4">Configuración del punto de venta</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200 dark:border-slate-700 gap-4">
                  <div>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200 font-display">Requerir apertura de caja</p>
                    <p className="text-xs text-slate-400 mt-0.5">No permitir ventas si la caja no está abierta.</p>
                  </div>
                  <button onClick={() => update('requireCashRegister', !form.requireCashRegister)}
                    className={`w-12 h-6.5 rounded-full relative transition-colors shrink-0 flex items-center ${form.requireCashRegister ? 'bg-teal-500' : 'bg-slate-300 dark:bg-slate-600'}`}>
                    <span className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${form.requireCashRegister ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200 dark:border-slate-700 gap-4">
                  <div>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200 font-display">Permitir stock negativo</p>
                    <p className="text-xs text-slate-400 mt-0.5">Solo administradores. Permite vender cuando no hay stock.</p>
                  </div>
                  <button onClick={() => update('allowNegativeStock', !form.allowNegativeStock)}
                    className={`w-12 h-6.5 rounded-full relative transition-colors shrink-0 flex items-center ${form.allowNegativeStock ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-600'}`}>
                    <span className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${form.allowNegativeStock ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200 dark:border-slate-700 gap-4">
                  <div>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200 font-display">Permitir imprimir recibos en POS</p>
                    <p className="text-xs text-slate-400 mt-0.5">Control de permisos para que los vendedores puedan imprimir el comprobante.</p>
                  </div>
                  <button
                    disabled={useStore.getState().currentUser?.role !== 'admin'}
                    onClick={() => update('allowPrintReceipt', !form.allowPrintReceipt)}
                    className={`w-12 h-6.5 rounded-full relative transition-colors shrink-0 flex items-center ${form.allowPrintReceipt ? 'bg-teal-500' : 'bg-slate-300 dark:bg-slate-600'} ${useStore.getState().currentUser?.role !== 'admin' ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <span className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${form.allowPrintReceipt ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200 dark:border-slate-700 gap-4">
                  <div>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200 font-display">Permitir descargar recibo en PDF</p>
                    <p className="text-xs text-slate-400 mt-0.5">Control de permisos para descargar el comprobante en formato PDF.</p>
                  </div>
                  <button
                    disabled={useStore.getState().currentUser?.role !== 'admin'}
                    onClick={() => update('allowDownloadPdfReceipt', !form.allowDownloadPdfReceipt)}
                    className={`w-12 h-6.5 rounded-full relative transition-colors shrink-0 flex items-center ${form.allowDownloadPdfReceipt ? 'bg-teal-500' : 'bg-slate-300 dark:bg-slate-600'} ${useStore.getState().currentUser?.role !== 'admin' ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <span className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${form.allowDownloadPdfReceipt ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200 dark:border-slate-700 gap-4">
                  <div>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200 font-display">Impresión automática de comprobante</p>
                    <p className="text-xs text-slate-400 mt-0.5">Abre la ventana de impresión inmediatamente al finalizar cada venta.</p>
                  </div>
                  <button onClick={() => update('autoPrintReceipt', !form.autoPrintReceipt)}
                    className={`w-12 h-6.5 rounded-full relative transition-colors shrink-0 flex items-center ${form.autoPrintReceipt ? 'bg-teal-500' : 'bg-slate-300 dark:bg-slate-600'}`}>
                    <span className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${form.autoPrintReceipt ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200 dark:border-slate-700 gap-4">
                  <div>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200 font-display">Alertas sonoras del sistema</p>
                    <p className="text-xs text-slate-400 mt-0.5">Emitir sonido de confirmación al escanear productos y realizar cobros.</p>
                  </div>
                  <button onClick={() => update('enableSoundAlerts', !form.enableSoundAlerts)}
                    className={`w-12 h-6.5 rounded-full relative transition-colors shrink-0 flex items-center ${form.enableSoundAlerts ? 'bg-teal-500' : 'bg-slate-300 dark:bg-slate-600'}`}>
                    <span className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${form.enableSoundAlerts ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200 dark:border-slate-700 gap-4">
                  <div>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200 font-display">Permitir descuentos manuales a clientes</p>
                    <p className="text-xs text-slate-400 mt-0.5">Habilita modificar el precio o aplicar % de descuento por ítem en el carrito.</p>
                  </div>
                  <button onClick={() => update('allowCustomerDiscounts', !form.allowCustomerDiscounts)}
                    className={`w-12 h-6.5 rounded-full relative transition-colors shrink-0 flex items-center ${form.allowCustomerDiscounts ? 'bg-teal-500' : 'bg-slate-300 dark:bg-slate-600'}`}>
                    <span className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${form.allowCustomerDiscounts ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200 dark:border-slate-700 gap-4">
                  <div>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200 font-display">Modo de venta rápida (Quick POS)</p>
                    <p className="text-xs text-slate-400 mt-0.5">Agrega productos al carrito con 1 solo clic y enfoca la barra de búsqueda.</p>
                  </div>
                  <button onClick={() => update('quickSaleMode', !form.quickSaleMode)}
                    className={`w-12 h-6.5 rounded-full relative transition-colors shrink-0 flex items-center ${form.quickSaleMode ? 'bg-teal-500' : 'bg-slate-300 dark:bg-slate-600'}`}>
                    <span className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${form.quickSaleMode ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-slate-700">
                  <div>
                    <label className="text-xs font-medium text-slate-600 dark:text-slate-400 block mb-1 font-display">
                      Meta de venta diaria (S/)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="50"
                      value={form.salesTargetDaily}
                      onChange={e => update('salesTargetDaily', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-700 text-sm text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-teal-400/50"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-slate-600 dark:text-slate-400 block mb-1 font-display">
                      Meta de venta mensual (S/)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="500"
                      value={form.salesTargetMonthly}
                      onChange={e => update('salesTargetMonthly', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-700 text-sm text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-teal-400/50"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-400 block mb-2 font-display">Tipo de impresora</label>
                  <div className="flex gap-2">
                    {[['thermal', 'Térmica (58/80mm)'], ['normal', 'Normal (A4/Carta)']].map(([v, l]) => (
                      <button key={v} onClick={() => update('printerType', v)}
                        className={`flex-1 py-2.5 rounded-xl border text-xs font-medium font-display transition-all ${form.printerType === v ? 'border-teal-400 bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'}`}>
                        {l}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          )}

          {tab === 'security' && (
            <Card>
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 font-display mb-4">Seguridad y políticas</h3>
              <div className="space-y-3">
                {[
                  'No utilizar localStorage como base de datos principal.',
                  'Todas las operaciones críticas almacenadas en la base de datos.',
                  'Una venta descuenta inventario de forma atómica.',
                  'No permitir stock negativo (configurable por admin).',
                  'Productos vencidos no pueden venderse.',
                  'Prioridad FEFO: primero vence, primero sale.',
                  'Cada cambio de inventario genera un movimiento auditado.',
                  'Cada cambio de precio conserva historial.',
                  'Ventas y movimientos no se eliminan, solo se marcan.',
                  'Validación de permisos según rol de usuario.',
                ].map((rule, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-teal-50 dark:bg-teal-900/10">
                    <span className="w-5 h-5 rounded-full bg-teal-500 flex items-center justify-center text-white text-xs font-bold font-mono shrink-0 mt-0.5">{i + 1}</span>
                    <p className="text-sm text-teal-800 dark:text-teal-200">{rule}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {tab === 'audit' && (
            <Card padding={false}>
              <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700">
                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 font-display">Registro de auditoría</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50">
                      {['Fecha/Hora', 'Usuario', 'Acción', 'Entidad', 'Detalles'].map(h => (
                        <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 font-mono uppercase tracking-wide whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                    {mockAuditLogs.map(log => (
                      <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                        <td className="px-4 py-2.5 font-mono text-xs text-slate-500 whitespace-nowrap">
                          {new Date(log.createdAt).toLocaleDateString('es-PE')} {new Date(log.createdAt).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="px-4 py-2.5 font-display text-xs font-medium text-slate-700 dark:text-slate-200">{log.userName}</td>
                        <td className="px-4 py-2.5 font-mono text-xs text-teal-600 dark:text-teal-400">{log.action}</td>
                        <td className="px-4 py-2.5 font-mono text-xs text-slate-500">{log.entity}</td>
                        <td className="px-4 py-2.5 text-xs text-slate-400 max-w-48 truncate">
                          {log.after ? JSON.stringify(log.after) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      </div>
    </Layout>
  );
}
