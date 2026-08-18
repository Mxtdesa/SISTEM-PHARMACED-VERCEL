-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE profiles              ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_settings      ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories            ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers             ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers             ENABLE ROW LEVEL SECURITY;
ALTER TABLE products              ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_history         ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_batches       ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_movements   ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases             ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_items        ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_registers        ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_movements        ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_closures         ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items            ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_payments         ENABLE ROW LEVEL SECURITY;
ALTER TABLE returns               ENABLE ROW LEVEL SECURITY;
ALTER TABLE return_items          ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs            ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- FUNCIÓN HELPER: obtener rol del usuario actual
-- ============================================================

CREATE OR REPLACE FUNCTION get_user_role()
RETURNS user_role AS $$
  SELECT role FROM profiles WHERE id = auth.uid() AND active = true;
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT COALESCE(get_user_role() = 'admin', false);
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_admin_or_pharmacist()
RETURNS BOOLEAN AS $$
  SELECT COALESCE(get_user_role() IN ('admin', 'pharmacist'), false);
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_active_user()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND active = true);
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- ============================================================
-- POLÍTICAS: PROFILES
-- ============================================================

-- Los usuarios pueden leer su propio perfil
CREATE POLICY "profiles_read_own" ON profiles
  FOR SELECT USING (id = auth.uid());

-- Admins pueden leer todos los perfiles
CREATE POLICY "profiles_admin_read_all" ON profiles
  FOR SELECT USING (is_admin());

-- Admins pueden insertar/actualizar perfiles
CREATE POLICY "profiles_admin_write" ON profiles
  FOR ALL USING (is_admin());

-- ============================================================
-- POLÍTICAS: COMPANY_SETTINGS
-- ============================================================

CREATE POLICY "settings_read" ON company_settings
  FOR SELECT USING (is_active_user());

CREATE POLICY "settings_write" ON company_settings
  FOR ALL USING (is_admin());

-- ============================================================
-- POLÍTICAS: CATEGORIES
-- ============================================================

CREATE POLICY "categories_read" ON categories
  FOR SELECT USING (is_active_user());

CREATE POLICY "categories_write" ON categories
  FOR ALL USING (is_admin_or_pharmacist());

-- ============================================================
-- POLÍTICAS: SUPPLIERS
-- ============================================================

CREATE POLICY "suppliers_read" ON suppliers
  FOR SELECT USING (is_active_user());

CREATE POLICY "suppliers_write" ON suppliers
  FOR ALL USING (is_admin_or_pharmacist());

-- ============================================================
-- POLÍTICAS: CUSTOMERS
-- ============================================================

CREATE POLICY "customers_read" ON customers
  FOR SELECT USING (is_active_user());

CREATE POLICY "customers_write" ON customers
  FOR ALL USING (get_user_role() IN ('admin', 'pharmacist', 'seller'));

-- ============================================================
-- POLÍTICAS: PRODUCTS
-- ============================================================

-- Todos los usuarios activos pueden ver productos (para POS)
CREATE POLICY "products_read" ON products
  FOR SELECT USING (is_active_user() AND deleted_at IS NULL);

-- Solo admin y farmacéutico pueden modificar productos
CREATE POLICY "products_write" ON products
  FOR ALL USING (is_admin_or_pharmacist());

-- ============================================================
-- POLÍTICAS: PRICE_HISTORY
-- ============================================================

CREATE POLICY "price_history_read" ON price_history
  FOR SELECT USING (is_active_user());

CREATE POLICY "price_history_insert" ON price_history
  FOR INSERT WITH CHECK (is_admin_or_pharmacist());

-- Nadie puede modificar o eliminar el historial de precios
CREATE POLICY "price_history_no_update" ON price_history
  FOR UPDATE USING (false);

CREATE POLICY "price_history_no_delete" ON price_history
  FOR DELETE USING (false);

-- ============================================================
-- POLÍTICAS: PRODUCT_BATCHES
-- ============================================================

CREATE POLICY "batches_read" ON product_batches
  FOR SELECT USING (is_active_user());

CREATE POLICY "batches_write" ON product_batches
  FOR ALL USING (is_admin_or_pharmacist());

-- ============================================================
-- POLÍTICAS: INVENTORY_MOVEMENTS
-- ============================================================

-- Todos pueden leer movimientos
CREATE POLICY "movements_read" ON inventory_movements
  FOR SELECT USING (is_active_user());

-- Solo se insertan via funciones (SECURITY DEFINER)
CREATE POLICY "movements_insert" ON inventory_movements
  FOR INSERT WITH CHECK (is_active_user());

-- Nadie puede modificar o eliminar movimientos
CREATE POLICY "movements_no_update" ON inventory_movements
  FOR UPDATE USING (false);

CREATE POLICY "movements_no_delete" ON inventory_movements
  FOR DELETE USING (false);

-- ============================================================
-- POLÍTICAS: PURCHASES
-- ============================================================

CREATE POLICY "purchases_read" ON purchases
  FOR SELECT USING (is_active_user());

CREATE POLICY "purchases_write" ON purchases
  FOR ALL USING (is_admin_or_pharmacist());

CREATE POLICY "purchase_items_read" ON purchase_items
  FOR SELECT USING (is_active_user());

CREATE POLICY "purchase_items_write" ON purchase_items
  FOR ALL USING (is_admin_or_pharmacist());

-- ============================================================
-- POLÍTICAS: CASH_REGISTERS
-- ============================================================

CREATE POLICY "cash_registers_read" ON cash_registers
  FOR SELECT USING (is_active_user());

-- Admin, farmacéutico y vendedor pueden abrir/cerrar caja
CREATE POLICY "cash_registers_write" ON cash_registers
  FOR ALL USING (get_user_role() IN ('admin', 'pharmacist', 'seller'));

-- ============================================================
-- POLÍTICAS: CASH_MOVEMENTS
-- ============================================================

CREATE POLICY "cash_movements_read" ON cash_movements
  FOR SELECT USING (is_active_user());

CREATE POLICY "cash_movements_write" ON cash_movements
  FOR ALL USING (get_user_role() IN ('admin', 'pharmacist', 'seller'));

-- ============================================================
-- POLÍTICAS: CASH_CLOSURES
-- ============================================================

CREATE POLICY "cash_closures_read" ON cash_closures
  FOR SELECT USING (is_active_user());

CREATE POLICY "cash_closures_write" ON cash_closures
  FOR INSERT WITH CHECK (is_admin_or_pharmacist());

-- Cierres no se modifican
CREATE POLICY "cash_closures_no_update" ON cash_closures
  FOR UPDATE USING (false);

-- ============================================================
-- POLÍTICAS: SALES
-- ============================================================

-- Todos los usuarios activos pueden ver ventas
CREATE POLICY "sales_read" ON sales
  FOR SELECT USING (is_active_user());

-- Vendedores, farmacéuticos y admins pueden crear ventas
CREATE POLICY "sales_insert" ON sales
  FOR INSERT WITH CHECK (get_user_role() IN ('admin', 'pharmacist', 'seller'));

-- Solo admins pueden actualizar ventas (ej: anular)
CREATE POLICY "sales_update" ON sales
  FOR UPDATE USING (is_admin_or_pharmacist());

-- Nadie puede eliminar ventas
CREATE POLICY "sales_no_delete" ON sales
  FOR DELETE USING (false);

CREATE POLICY "sale_items_read" ON sale_items
  FOR SELECT USING (is_active_user());

CREATE POLICY "sale_items_insert" ON sale_items
  FOR INSERT WITH CHECK (get_user_role() IN ('admin', 'pharmacist', 'seller'));

CREATE POLICY "sale_items_no_delete" ON sale_items
  FOR DELETE USING (false);

CREATE POLICY "sale_payments_read" ON sale_payments
  FOR SELECT USING (is_active_user());

CREATE POLICY "sale_payments_insert" ON sale_payments
  FOR INSERT WITH CHECK (get_user_role() IN ('admin', 'pharmacist', 'seller'));

-- ============================================================
-- POLÍTICAS: RETURNS
-- ============================================================

CREATE POLICY "returns_read" ON returns
  FOR SELECT USING (is_active_user());

CREATE POLICY "returns_write" ON returns
  FOR ALL USING (is_admin_or_pharmacist());

CREATE POLICY "return_items_read" ON return_items
  FOR SELECT USING (is_active_user());

CREATE POLICY "return_items_write" ON return_items
  FOR ALL USING (is_admin_or_pharmacist());

-- ============================================================
-- POLÍTICAS: AUDIT_LOGS
-- ============================================================

-- Solo admins y auditores pueden ver logs
CREATE POLICY "audit_read" ON audit_logs
  FOR SELECT USING (get_user_role() IN ('admin', 'auditor'));

-- Solo se insertan via función log_audit (SECURITY DEFINER)
CREATE POLICY "audit_insert" ON audit_logs
  FOR INSERT WITH CHECK (is_active_user());

-- Nadie puede modificar ni eliminar logs
CREATE POLICY "audit_no_update" ON audit_logs
  FOR UPDATE USING (false);

CREATE POLICY "audit_no_delete" ON audit_logs
  FOR DELETE USING (false);
