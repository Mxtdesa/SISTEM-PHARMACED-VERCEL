import { useState } from 'react';
import { Plus, Search, Edit2, ToggleLeft, ToggleRight, Phone, Mail, MapPin } from 'lucide-react';
import Layout from '../components/layout/Layout';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import { useStore } from '../store/useStore';
import type { Supplier } from '../types';

const emptySupplier: Omit<Supplier, 'id' | 'createdAt'> = {
  name: '', ruc: '', phone: '', email: '', address: '', contact: '', notes: '', active: true,
};

export default function Suppliers() {
  const { suppliers, addSupplier, updateSupplier } = useStore();
  const [query, setQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<typeof emptySupplier>(emptySupplier);

  const filtered = suppliers.filter(s =>
    !query || s.name.toLowerCase().includes(query.toLowerCase()) || s.ruc.includes(query) || s.contact.toLowerCase().includes(query.toLowerCase())
  );

  const openNew = () => { setEditingId(null); setForm(emptySupplier); setModalOpen(true); };
  const openEdit = (s: Supplier) => { setEditingId(s.id); setForm({ ...s }); setModalOpen(true); };

  const handleSave = () => {
    if (editingId) {
      updateSupplier(editingId, form);
    } else {
      addSupplier({ ...form, id: `s-${Date.now()}`, createdAt: new Date().toISOString().split('T')[0] });
    }
    setModalOpen(false);
  };

  return (
    <Layout title="Proveedores" actions={<Button size="sm" onClick={openNew}><Plus size={14} /> Nuevo proveedor</Button>}>
      <div className="space-y-4 animate-fadeIn">
        <Card className="flex gap-3 items-center py-3">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar proveedor..."
              className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-400/50" />
          </div>
          <span className="text-xs text-slate-400 font-mono">{filtered.length} proveedores</span>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(s => (
            <Card key={s.id} className="flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 dark:text-slate-100 font-display truncate">{s.name}</p>
                  <p className="text-xs text-slate-400 font-mono">RUC: {s.ruc}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Badge variant={s.active ? 'success' : 'muted'}>{s.active ? 'Activo' : 'Inactivo'}</Badge>
                </div>
              </div>
              <div className="space-y-1.5">
                {s.phone && <div className="flex items-center gap-2 text-xs text-slate-500"><Phone size={12} className="text-teal-500 shrink-0" />{s.phone}</div>}
                {s.email && <div className="flex items-center gap-2 text-xs text-slate-500"><Mail size={12} className="text-teal-500 shrink-0" />{s.email}</div>}
                {s.address && <div className="flex items-center gap-2 text-xs text-slate-500"><MapPin size={12} className="text-teal-500 shrink-0" />{s.address}</div>}
                {s.contact && <div className="flex items-center gap-2 text-xs text-slate-500"><span className="w-3 h-3 shrink-0 text-teal-500">👤</span>{s.contact}</div>}
              </div>
              {s.notes && <p className="text-xs text-slate-400 bg-slate-50 dark:bg-slate-700/50 rounded-lg px-3 py-2">{s.notes}</p>}
              <div className="flex gap-2 mt-auto">
                <button onClick={() => openEdit(s)} className="flex-1 py-1.5 text-xs font-medium text-teal-600 dark:text-teal-400 border border-teal-200 dark:border-teal-800 rounded-lg hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-colors font-display flex items-center justify-center gap-1">
                  <Edit2 size={11} /> Editar
                </button>
                <button onClick={() => updateSupplier(s.id, { active: !s.active })}
                  className="flex-1 py-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors font-display flex items-center justify-center gap-1">
                  {s.active ? <ToggleRight size={11} className="text-teal-500" /> : <ToggleLeft size={11} />}
                  {s.active ? 'Desactivar' : 'Activar'}
                </button>
              </div>
            </Card>
          ))}
          {filtered.length === 0 && (
            <div className="col-span-full text-center py-12 text-slate-400 text-sm">No hay proveedores que coincidan</div>
          )}
        </div>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Editar proveedor' : 'Nuevo proveedor'} width="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={!form.name}>Guardar</Button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-3">
          {[
            { key: 'name', label: 'Nombre / Razón social *', span: 2 },
            { key: 'ruc', label: 'RUC / Documento' },
            { key: 'phone', label: 'Teléfono' },
            { key: 'email', label: 'Correo electrónico', span: 2 },
            { key: 'address', label: 'Dirección', span: 2 },
            { key: 'contact', label: 'Contacto / Representante', span: 2 },
            { key: 'notes', label: 'Observaciones', span: 2 },
          ].map(({ key, label, span }) => (
            <div key={key} className={span === 2 ? 'col-span-2' : ''}>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400 block mb-1 font-display">{label}</label>
              <input value={(form as unknown as Record<string, string>)[key] ?? ''} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-700 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-400/50" />
            </div>
          ))}
        </div>
      </Modal>
    </Layout>
  );
}
