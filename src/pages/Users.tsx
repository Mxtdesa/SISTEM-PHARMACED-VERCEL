import { useState } from 'react';
import { Plus, Search, ToggleLeft, ToggleRight, Shield, ShieldCheck, Eye, Pill, Trash2 } from 'lucide-react';
import Layout from '../components/layout/Layout';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import { useStore } from '../store/useStore';
import type { User, UserRole } from '../types';

const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrador', pharmacist: 'Farmacéutico', seller: 'Vendedor', auditor: 'Auditor',
};
const ROLE_VARIANTS: Record<UserRole, 'primary' | 'success' | 'info' | 'warning'> = {
  admin: 'primary', pharmacist: 'success', seller: 'info', auditor: 'warning',
};
const ROLE_ICONS: Record<UserRole, React.ReactNode> = {
  admin: <ShieldCheck size={13} />, pharmacist: <Pill size={13} />, seller: <Eye size={13} />, auditor: <Shield size={13} />,
};

const emptyUser: Omit<User, 'id' | 'createdAt'> = {
  name: '', email: '', role: 'seller', active: true,
};

export default function Users() {
  const { users, currentUser, addUser, updateUser, deleteUser } = useStore();
  const [query, setQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<typeof emptyUser>(emptyUser);
  const [password, setPassword] = useState('farmacia123');

  const filtered = users.filter(u =>
    !query || u.name.toLowerCase().includes(query.toLowerCase()) ||
    u.email.toLowerCase().includes(query.toLowerCase()) || u.role.toLowerCase().includes(query.toLowerCase())
  );

  const openNew = () => { setEditingId(null); setForm(emptyUser); setPassword('farmacia123'); setModalOpen(true); };
  const openEdit = (u: User) => { setEditingId(u.id); setForm({ ...u }); setModalOpen(true); };

  const handleSave = () => {
    if (editingId) {
      updateUser(editingId, form);
    } else {
      addUser({ ...form, id: `u-${Date.now()}`, createdAt: new Date().toISOString().split('T')[0] });
    }
    setModalOpen(false);
  };

  const toggleActive = (u: User) => {
    updateUser(u.id, { active: !u.active });
  };

  return (
    <Layout title="Usuarios" actions={<Button size="sm" onClick={openNew}><Plus size={14} /> Nuevo usuario</Button>}>
      <div className="space-y-4 animate-fadeIn">
        <Card className="flex gap-3 items-center py-3">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar usuario..."
              className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-400/50" />
          </div>
          <span className="text-xs text-slate-400 font-mono">{filtered.length} usuarios</span>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(u => (
            <Card key={u.id} className="flex flex-col gap-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center text-white font-bold font-display text-sm shrink-0">
                    {u.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800 dark:text-slate-100 font-display">{u.name}</p>
                    <p className="text-xs text-slate-400 font-mono">{u.email}</p>
                  </div>
                </div>
                {u.id === currentUser?.id && <Badge variant="accent">Tú</Badge>}
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Badge variant={ROLE_VARIANTS[u.role]}>
                    <span className="flex items-center gap-1">{ROLE_ICONS[u.role]}{ROLE_LABELS[u.role]}</span>
                  </Badge>
                </div>
                <Badge variant={u.active ? 'success' : 'muted'}>{u.active ? 'Activo' : 'Inactivo'}</Badge>
              </div>

              <div className="text-xs text-slate-400 font-mono">
                {u.lastLogin ? `Último acceso: ${new Date(u.lastLogin).toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' })}` : 'Sin accesos registrados'}
              </div>

              <div className="flex gap-2 mt-auto">
                <button onClick={() => openEdit(u)}
                  className="flex-1 py-1.5 text-xs font-medium text-teal-600 dark:text-teal-400 border border-teal-200 dark:border-teal-800 rounded-lg hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-colors font-display">
                  Editar
                </button>
                {u.id !== currentUser?.id && (
                  <>
                    <button onClick={() => toggleActive(u)}
                      className="py-1.5 px-3 text-xs font-medium text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors font-display flex items-center justify-center gap-1">
                      {u.active ? <ToggleRight size={14} className="text-teal-500" /> : <ToggleLeft size={14} />}
                      {u.active ? 'Desactivar' : 'Activar'}
                    </button>
                    <button onClick={() => {
                      if (window.confirm(`¿Deseas eliminar al usuario "${u.name}"?`)) {
                        deleteUser(u.id);
                      }
                    }} title="Eliminar usuario"
                      className="py-1.5 px-2.5 text-xs font-medium text-red-500 border border-red-200 dark:border-red-900/30 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </>
                )}
              </div>
            </Card>
          ))}
        </div>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Editar usuario' : 'Nuevo usuario'} width="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={!form.name || !form.email}>Guardar</Button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-slate-600 dark:text-slate-400 block mb-1 font-display">Nombre completo *</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Dr. Ana García"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-700 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-400/50" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 dark:text-slate-400 block mb-1 font-display">Correo electrónico *</label>
            <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="ana@farmacia.pe"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-700 text-sm text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-teal-400/50" />
          </div>
          {!editingId && (
            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400 block mb-1 font-display">Contraseña inicial</label>
              <input type="text" value={password} onChange={e => setPassword(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-700 text-sm text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-teal-400/50" />
            </div>
          )}
          <div>
            <label className="text-xs font-medium text-slate-600 dark:text-slate-400 block mb-2 font-display">Rol del sistema</label>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(ROLE_LABELS).map(([k, v]) => (
                <button key={k} onClick={() => setForm(f => ({ ...f, role: k as UserRole }))}
                  className={`py-2.5 px-3 rounded-xl border text-xs font-medium font-display transition-all flex items-center gap-2 ${form.role === k ? 'border-teal-400 bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-teal-200'}`}>
                  {ROLE_ICONS[k as UserRole]}
                  {v}
                </button>
              ))}
            </div>
          </div>

          {/* Role description */}
          <div className="bg-teal-50 dark:bg-teal-900/10 rounded-xl p-3">
            <p className="text-xs text-teal-700 dark:text-teal-300 font-display font-semibold mb-1">{ROLE_LABELS[form.role]}</p>
            <p className="text-xs text-teal-600 dark:text-teal-400">
              {form.role === 'admin' && 'Acceso completo al sistema: configuración, usuarios, productos, ventas, compras, caja, reportes y auditoría.'}
              {form.role === 'pharmacist' && 'Puede registrar ventas, gestionar inventario, compras, movimientos y cierre de caja.'}
              {form.role === 'seller' && 'Acceso al punto de venta, búsqueda de productos y registro de ventas.'}
              {form.role === 'auditor' && 'Solo lectura: reportes, movimientos, ventas y cierres de caja. Sin modificaciones.'}
            </p>
          </div>
        </div>
      </Modal>
    </Layout>
  );
}
