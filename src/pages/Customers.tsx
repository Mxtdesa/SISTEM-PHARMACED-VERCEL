import { useState } from 'react';
import { Plus, Search, Phone, Mail, ShoppingBag } from 'lucide-react';
import Layout from '../components/layout/Layout';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import { useStore } from '../store/useStore';
import type { Customer } from '../types';

export default function Customers() {
  const { customers, addCustomer, sales } = useStore();
  const [query, setQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<Omit<Customer, 'id' | 'createdAt' | 'totalSpent'>>({
    name: '', document: '', phone: '', email: '', address: '',
  });

  const filtered = customers.filter(c =>
    !query || c.name.toLowerCase().includes(query.toLowerCase()) ||
    c.document.includes(query) || c.phone.includes(query)
  );

  const getCustomerSales = (customerId: string) =>
    sales.filter(s => s.customerId === customerId && s.status === 'completed');

  const handleSave = () => {
    addCustomer({ ...form, id: `c-${Date.now()}`, createdAt: new Date().toISOString().split('T')[0], totalSpent: 0 });
    setModalOpen(false);
    setForm({ name: '', document: '', phone: '', email: '', address: '' });
  };

  return (
    <Layout title="Clientes" actions={<Button size="sm" onClick={() => setModalOpen(true)}><Plus size={14} /> Nuevo cliente</Button>}>
      <div className="space-y-4 animate-fadeIn">
        <Card className="flex gap-3 items-center py-3">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar cliente..."
              className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-400/50" />
          </div>
          <span className="text-xs text-slate-400 font-mono">{filtered.length} clientes</span>
        </Card>

        <Card padding={false}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50">
                  {['Cliente', 'Documento', 'Contacto', 'Compras', 'Total gastado', 'Registro'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 font-mono uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {filtered.map(c => {
                  const cSales = getCustomerSales(c.id);
                  const spent = cSales.reduce((s, sale) => s + sale.total, 0);
                  return (
                    <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-800 dark:text-slate-100 font-display">{c.name}</p>
                        {c.address && <p className="text-xs text-slate-400">{c.address}</p>}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-500">{c.document || '—'}</td>
                      <td className="px-4 py-3">
                        <div className="space-y-0.5">
                          {c.phone && <div className="flex items-center gap-1 text-xs text-slate-500"><Phone size={10} /> {c.phone}</div>}
                          {c.email && <div className="flex items-center gap-1 text-xs text-slate-500"><Mail size={10} /> {c.email}</div>}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 text-xs text-slate-500 font-mono">
                          <ShoppingBag size={11} /> {cSales.length}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-teal-700 dark:text-teal-400">S/ {spent.toFixed(2)}</td>
                      <td className="px-4 py-3 text-xs text-slate-400 font-mono">{new Date(c.createdAt).toLocaleDateString('es-PE')}</td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-12 text-center text-slate-400 text-sm">No hay clientes registrados</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nuevo cliente" width="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={!form.name}>Guardar</Button>
          </>
        }
      >
        <div className="space-y-3">
          {[
            { key: 'name', label: 'Nombre completo *', placeholder: 'Rosa Mamani Quispe' },
            { key: 'document', label: 'DNI / Documento', placeholder: '12345678' },
            { key: 'phone', label: 'Teléfono', placeholder: '987654321' },
            { key: 'email', label: 'Correo electrónico', placeholder: 'cliente@email.com' },
            { key: 'address', label: 'Dirección', placeholder: 'Av. Lima 123, Lima' },
          ].map(({ key, label, placeholder }) => (
            <div key={key}>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400 block mb-1 font-display">{label}</label>
              <input value={(form as Record<string, string>)[key] ?? ''} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                placeholder={placeholder}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-700 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-400/50" />
            </div>
          ))}
        </div>
      </Modal>
    </Layout>
  );
}
