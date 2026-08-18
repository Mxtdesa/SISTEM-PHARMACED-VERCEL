import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useStore } from './store/useStore';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import POS from './pages/POS';
import Products from './pages/Products';
import Inventory from './pages/Inventory';
import Purchases from './pages/Purchases';
import Suppliers from './pages/Suppliers';
import Customers from './pages/Customers';
import CashRegister from './pages/CashRegister';
import Movements from './pages/Movements';
import Reports from './pages/Reports';
import Users from './pages/Users';
import Settings from './pages/Settings';
import Shifts from './pages/Shifts';
import Audit from './pages/Audit';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { currentUser } = useStore();
  if (!currentUser) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function RequireRole({ children, roles }: { children: React.ReactNode; roles: string[] }) {
  const { currentUser } = useStore();
  if (!currentUser || !roles.includes(currentUser.role)) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route path="/" element={<RequireAuth><Dashboard /></RequireAuth>} />
        <Route path="/pos" element={<RequireAuth><POS /></RequireAuth>} />
        <Route path="/products" element={<RequireAuth><Products /></RequireAuth>} />
        <Route path="/inventory" element={<RequireAuth><Inventory /></RequireAuth>} />
        <Route path="/purchases" element={<RequireAuth><Purchases /></RequireAuth>} />
        <Route path="/suppliers" element={<RequireAuth><Suppliers /></RequireAuth>} />
        <Route path="/customers" element={<RequireAuth><Customers /></RequireAuth>} />
        <Route path="/cash" element={<RequireAuth><CashRegister /></RequireAuth>} />
        <Route path="/movements" element={<RequireAuth><Movements /></RequireAuth>} />
        <Route path="/reports" element={<RequireAuth><Reports /></RequireAuth>} />
        <Route path="/shifts" element={<RequireAuth><Shifts /></RequireAuth>} />
        <Route path="/audit" element={<RequireRole roles={['admin', 'auditor']}><Audit /></RequireRole>} />
        <Route path="/users" element={<RequireRole roles={['admin']}><Users /></RequireRole>} />
        <Route path="/settings" element={<RequireRole roles={['admin']}><Settings /></RequireRole>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
