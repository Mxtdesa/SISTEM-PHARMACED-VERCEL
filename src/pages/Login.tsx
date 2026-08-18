import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Pill, Eye, EyeOff, Lock, Mail, AlertCircle } from 'lucide-react';
import { useStore } from '../store/useStore';
import Button from '../components/ui/Button';

export default function Login() {
  const [email, setEmail] = useState('admin@farmacia.pe');
  const [password, setPassword] = useState('farmacia123');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    await new Promise(r => setTimeout(r, 500));
    const ok = login(email, password);
    setLoading(false);
    if (ok) navigate('/');
    else setError('Correo o contraseña incorrectos.');
  };

  const demoAccounts = [
    { email: 'admin@farmacia.pe', role: 'Administrador', color: 'teal' },
    { email: 'ana@farmacia.pe', role: 'Farmacéutico', color: 'violet' },
    { email: 'luis@farmacia.pe', role: 'Vendedor', color: 'sky' },
    { email: 'maria@farmacia.pe', role: 'Auditor', color: 'amber' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-teal-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-teal-600 shadow-lg shadow-teal-200 dark:shadow-teal-900/60 mb-4">
            <Pill size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 font-display">Farmacia San Miguel</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-mono">Sistema POS & Inventario</p>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl p-8">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 font-display mb-6">Iniciar sesión</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5 font-display">Correo electrónico</label>
              <div className="relative">
                <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400/50 focus:border-teal-400 transition-all"
                  placeholder="correo@farmacia.pe"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5 font-display">Contraseña</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400/50 focus:border-teal-400 transition-all"
                  placeholder="••••••••"
                  required
                />
                <button type="button" onClick={() => setShowPass(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-xl">
                <AlertCircle size={14} className="text-red-500 shrink-0" />
                <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            <Button type="submit" loading={loading} className="w-full justify-center py-2.5 mt-2">
              Ingresar al sistema
            </Button>
          </form>
        </div>

        {/* Demo accounts */}
        <div className="mt-6 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-5">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-3 font-mono uppercase tracking-wide">Cuentas de demostración • contraseña: farmacia123</p>
          <div className="grid grid-cols-2 gap-2">
            {demoAccounts.map(acc => (
              <button
                key={acc.email}
                onClick={() => setEmail(acc.email)}
                className="text-left px-3 py-2 rounded-lg border border-slate-100 dark:border-slate-700 hover:border-teal-200 dark:hover:border-teal-700 hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-all"
              >
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 font-display">{acc.role}</p>
                <p className="text-xs text-slate-400 font-mono truncate">{acc.email}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
