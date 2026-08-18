-- ============================================================
-- FARMACIA SAN MIGUEL - Esquema completo de base de datos
-- Versión: 1.0.0
-- ============================================================

-- Habilitar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- Para búsqueda de texto rápida

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE user_role AS ENUM ('admin', 'pharmacist', 'seller', 'auditor');

CREATE TYPE product_presentation AS ENUM (
  'unit', 'blister', 'box', 'bottle', 'ampoule', 'sachet', 'capsule', 'tablet'
);

CREATE TYPE movement_type AS ENUM (
  'purchase', 'sale', 'return', 'adjustment_positive', 'adjustment_negative',
  'expired', 'shrinkage', 'correction', 'transfer'
);

CREATE TYPE payment_method AS ENUM (
  'cash', 'yape', 'plin', 'transfer', 'card', 'credit', 'mixed'
);

CREATE TYPE sale_status AS ENUM ('completed', 'voided', 'returned');

CREATE TYPE purchase_status AS ENUM ('pending', 'completed', 'cancelled');

CREATE TYPE cash_register_status AS ENUM ('open', 'closed');

CREATE TYPE cash_movement_type AS ENUM ('income', 'expense', 'withdrawal', 'refund');

CREATE TYPE return_type AS ENUM ('full', 'partial');

-- ============================================================
-- PERFILES DE USUARIO (extiende auth.users de Supabase)
-- ============================================================

CREATE TABLE profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  email       TEXT NOT NULL UNIQUE,
  role        user_role NOT NULL DEFAULT 'seller',
  active      BOOLEAN NOT NULL DEFAULT true,
  avatar_url  TEXT,
  last_login  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger para sincronizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Trigger para crear perfil automáticamente al registrar usuario
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'seller')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- CONFIGURACIÓN DE LA EMPRESA
-- ============================================================

CREATE TABLE company_settings (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                TEXT NOT NULL DEFAULT 'Farmacia',
  ruc                 TEXT,
  address             TEXT,
  phone               TEXT,
  email               TEXT,
  logo_url            TEXT,
  currency            TEXT NOT NULL DEFAULT 'PEN',
  currency_symbol     TEXT NOT NULL DEFAULT 'S/',
  tax_rate            NUMERIC(5,2) NOT NULL DEFAULT 0,
  low_stock_days      INTEGER NOT NULL DEFAULT 30,
  expiry_alert_days   INTEGER NOT NULL DEFAULT 60,
  allow_negative_stock BOOLEAN NOT NULL DEFAULT false,
  require_cash_register BOOLEAN NOT NULL DEFAULT true,
  printer_type        TEXT NOT NULL DEFAULT 'thermal',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER company_settings_updated_at
  BEFORE UPDATE ON company_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- CATEGORÍAS
-- ============================================================

CREATE TABLE categories (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL UNIQUE,
  description TEXT,
  active      BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- PROVEEDORES
-- ============================================================

CREATE TABLE suppliers (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  ruc         TEXT,
  phone       TEXT,
  email       TEXT,
  address     TEXT,
  contact     TEXT,
  notes       TEXT,
  active      BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER suppliers_updated_at
  BEFORE UPDATE ON suppliers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- CLIENTES
-- ============================================================

CREATE TABLE customers (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  document    TEXT,
  phone       TEXT,
  email       TEXT,
  address     TEXT,
  total_spent NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- PRODUCTOS
-- ============================================================

CREATE TABLE products (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code                  TEXT NOT NULL UNIQUE,
  barcode               TEXT UNIQUE,
  name                  TEXT NOT NULL,
  commercial_name       TEXT,
  active_ingredient     TEXT,
  laboratory            TEXT,
  category_id           UUID REFERENCES categories(id),
  subcategory           TEXT,
  presentation          product_presentation NOT NULL DEFAULT 'unit',
  concentration         TEXT,
  pharmaceutical_form   TEXT,
  unit_measure          TEXT,
  description           TEXT,
  image_url             TEXT,
  active                BOOLEAN NOT NULL DEFAULT true,
  -- Conversiones de unidades
  units_per_blister     INTEGER NOT NULL DEFAULT 1,
  blisters_per_box      INTEGER NOT NULL DEFAULT 1,
  units_per_box         INTEGER GENERATED ALWAYS AS (units_per_blister * blisters_per_box) STORED,
  -- Precios actuales (desnormalizados para rendimiento)
  purchase_price        NUMERIC(12,2) NOT NULL DEFAULT 0,
  sale_price_unit       NUMERIC(12,2) NOT NULL DEFAULT 0,
  sale_price_blister    NUMERIC(12,2) NOT NULL DEFAULT 0,
  sale_price_box        NUMERIC(12,2) NOT NULL DEFAULT 0,
  -- Stock mínimo en unidades base
  min_stock             INTEGER NOT NULL DEFAULT 0,
  -- Soft delete
  deleted_at            TIMESTAMPTZ,
  created_by            UUID REFERENCES profiles(id),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Índices para búsqueda rápida
CREATE INDEX idx_products_name_trgm ON products USING GIN (name gin_trgm_ops);
CREATE INDEX idx_products_active_ingredient ON products USING GIN (active_ingredient gin_trgm_ops);
CREATE INDEX idx_products_barcode ON products(barcode);
CREATE INDEX idx_products_code ON products(code);
CREATE INDEX idx_products_active ON products(active) WHERE deleted_at IS NULL;

-- ============================================================
-- HISTORIAL DE PRECIOS
-- ============================================================

CREATE TABLE price_history (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id        UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  purchase_price    NUMERIC(12,2),
  sale_price_unit   NUMERIC(12,2),
  sale_price_blister NUMERIC(12,2),
  sale_price_box    NUMERIC(12,2),
  changed_by        UUID NOT NULL REFERENCES profiles(id),
  changed_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes             TEXT
);

CREATE INDEX idx_price_history_product ON price_history(product_id, changed_at DESC);

-- Trigger para guardar historial automáticamente al cambiar precios
CREATE OR REPLACE FUNCTION record_price_change()
RETURNS TRIGGER AS $$
BEGIN
  IF (OLD.purchase_price != NEW.purchase_price OR
      OLD.sale_price_unit != NEW.sale_price_unit OR
      OLD.sale_price_blister != NEW.sale_price_blister OR
      OLD.sale_price_box != NEW.sale_price_box) THEN
    INSERT INTO price_history (product_id, purchase_price, sale_price_unit, sale_price_blister, sale_price_box, changed_by)
    VALUES (OLD.id, OLD.purchase_price, OLD.sale_price_unit, OLD.sale_price_blister, OLD.sale_price_box,
            COALESCE(NEW.updated_by, auth.uid()));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER products_price_history
  AFTER UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION record_price_change();

-- ============================================================
-- LOTES DE PRODUCTOS (para control FEFO)
-- ============================================================

CREATE TABLE product_batches (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id    UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  supplier_id   UUID REFERENCES suppliers(id),
  lot_number    TEXT NOT NULL,
  entry_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  expiry_date   DATE NOT NULL,
  -- Cantidad en unidades base
  quantity      INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  cost_price    NUMERIC(12,2) NOT NULL DEFAULT 0,
  purchase_id   UUID, -- se llenará cuando se creen compras
  notes         TEXT,
  created_by    UUID REFERENCES profiles(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_expiry CHECK (expiry_date >= entry_date)
);

CREATE TRIGGER product_batches_updated_at
  BEFORE UPDATE ON product_batches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Índices FEFO
CREATE INDEX idx_batches_product_expiry ON product_batches(product_id, expiry_date ASC) WHERE quantity > 0;
CREATE INDEX idx_batches_expiry ON product_batches(expiry_date) WHERE quantity > 0;

-- ============================================================
-- VISTA DE INVENTARIO (calculada desde lotes)
-- ============================================================

CREATE VIEW inventory_summary AS
SELECT
  p.id AS product_id,
  p.code,
  p.name,
  p.laboratory,
  p.category_id,
  c.name AS category_name,
  p.min_stock,
  p.units_per_blister,
  p.blisters_per_box,
  p.units_per_box,
  p.sale_price_unit,
  p.sale_price_blister,
  p.sale_price_box,
  COALESCE(SUM(b.quantity), 0)::INTEGER AS total_units,
  FLOOR(COALESCE(SUM(b.quantity), 0) / NULLIF(p.units_per_box, 0))::INTEGER AS total_boxes,
  FLOOR(MOD(COALESCE(SUM(b.quantity), 0), NULLIF(p.units_per_box, 0)) / NULLIF(p.units_per_blister, 0))::INTEGER AS total_blisters,
  MIN(b.expiry_date) FILTER (WHERE b.quantity > 0) AS next_expiry,
  COUNT(b.id) FILTER (WHERE b.quantity > 0) AS active_batches,
  COUNT(b.id) FILTER (WHERE b.expiry_date < CURRENT_DATE AND b.quantity > 0) AS expired_batches,
  CASE
    WHEN COALESCE(SUM(b.quantity), 0) = 0 THEN 'out_of_stock'
    WHEN COALESCE(SUM(b.quantity), 0) <= p.min_stock * 0.5 THEN 'critical'
    WHEN COALESCE(SUM(b.quantity), 0) <= p.min_stock THEN 'low'
    WHEN EXISTS (
      SELECT 1 FROM product_batches pb2
      WHERE pb2.product_id = p.id AND pb2.expiry_date < CURRENT_DATE AND pb2.quantity > 0
    ) THEN 'expired'
    ELSE 'ok'
  END AS stock_status
FROM products p
LEFT JOIN categories c ON c.id = p.category_id
LEFT JOIN product_batches b ON b.product_id = p.id
WHERE p.deleted_at IS NULL AND p.active = true
GROUP BY p.id, c.name;

-- ============================================================
-- MOVIMIENTOS DE INVENTARIO
-- ============================================================

CREATE TABLE inventory_movements (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id      UUID NOT NULL REFERENCES products(id),
  batch_id        UUID REFERENCES product_batches(id),
  lot_number      TEXT,
  type            movement_type NOT NULL,
  quantity        INTEGER NOT NULL, -- siempre positivo; el signo lo determina el tipo
  presentation    product_presentation NOT NULL DEFAULT 'unit',
  stock_before    INTEGER NOT NULL,
  stock_after     INTEGER NOT NULL,
  user_id         UUID NOT NULL REFERENCES profiles(id),
  reason          TEXT NOT NULL,
  related_doc_id  UUID, -- venta, compra, devolución, etc.
  related_doc_type TEXT, -- 'sale', 'purchase', 'return'
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_movements_product ON inventory_movements(product_id, created_at DESC);
CREATE INDEX idx_movements_type ON inventory_movements(type);
CREATE INDEX idx_movements_user ON inventory_movements(user_id);

-- ============================================================
-- COMPRAS
-- ============================================================

CREATE TABLE purchases (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier_id     UUID REFERENCES suppliers(id),
  invoice_number  TEXT,
  date            DATE NOT NULL DEFAULT CURRENT_DATE,
  user_id         UUID NOT NULL REFERENCES profiles(id),
  total           NUMERIC(12,2) NOT NULL DEFAULT 0,
  notes           TEXT,
  status          purchase_status NOT NULL DEFAULT 'completed',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER purchases_updated_at
  BEFORE UPDATE ON purchases
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE purchase_items (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  purchase_id     UUID NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
  product_id      UUID NOT NULL REFERENCES products(id),
  batch_id        UUID REFERENCES product_batches(id),
  presentation    product_presentation NOT NULL DEFAULT 'box',
  quantity        INTEGER NOT NULL CHECK (quantity > 0),
  unit_cost       NUMERIC(12,2) NOT NULL,
  total_cost      NUMERIC(12,2) NOT NULL,
  lot_number      TEXT NOT NULL,
  expiry_date     DATE NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- CAJA REGISTRADORA
-- ============================================================

CREATE TABLE cash_registers (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES profiles(id),
  opened_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at       TIMESTAMPTZ,
  initial_amount  NUMERIC(12,2) NOT NULL DEFAULT 0,
  status          cash_register_status NOT NULL DEFAULT 'open',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cash_registers_status ON cash_registers(status);
CREATE INDEX idx_cash_registers_user ON cash_registers(user_id);

CREATE TABLE cash_movements (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cash_register_id  UUID NOT NULL REFERENCES cash_registers(id),
  type              cash_movement_type NOT NULL,
  amount            NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  description       TEXT NOT NULL,
  user_id           UUID NOT NULL REFERENCES profiles(id),
  related_sale_id   UUID,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cash_movements_register ON cash_movements(cash_register_id);

CREATE TABLE cash_closures (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cash_register_id    UUID NOT NULL REFERENCES cash_registers(id) UNIQUE,
  date                DATE NOT NULL,
  user_id             UUID NOT NULL REFERENCES profiles(id),
  initial_amount      NUMERIC(12,2) NOT NULL DEFAULT 0,
  cash_sales          NUMERIC(12,2) NOT NULL DEFAULT 0,
  yape_sales          NUMERIC(12,2) NOT NULL DEFAULT 0,
  plin_sales          NUMERIC(12,2) NOT NULL DEFAULT 0,
  card_sales          NUMERIC(12,2) NOT NULL DEFAULT 0,
  transfer_sales      NUMERIC(12,2) NOT NULL DEFAULT 0,
  credit_sales        NUMERIC(12,2) NOT NULL DEFAULT 0,
  other_sales         NUMERIC(12,2) NOT NULL DEFAULT 0,
  manual_income       NUMERIC(12,2) NOT NULL DEFAULT 0,
  expenses            NUMERIC(12,2) NOT NULL DEFAULT 0,
  withdrawals         NUMERIC(12,2) NOT NULL DEFAULT 0,
  returns             NUMERIC(12,2) NOT NULL DEFAULT 0,
  expected_amount     NUMERIC(12,2) NOT NULL DEFAULT 0,
  counted_amount      NUMERIC(12,2) NOT NULL DEFAULT 0,
  difference          NUMERIC(12,2) GENERATED ALWAYS AS (counted_amount - expected_amount) STORED,
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- VENTAS
-- ============================================================

CREATE SEQUENCE sale_number_seq START 1000;

CREATE TABLE sales (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  number            TEXT NOT NULL UNIQUE DEFAULT 'V-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(nextval('sale_number_seq')::TEXT, 6, '0'),
  date              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id           UUID NOT NULL REFERENCES profiles(id),
  customer_id       UUID REFERENCES customers(id),
  cash_register_id  UUID REFERENCES cash_registers(id),
  subtotal          NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount          NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax               NUMERIC(12,2) NOT NULL DEFAULT 0,
  total             NUMERIC(12,2) NOT NULL DEFAULT 0,
  status            sale_status NOT NULL DEFAULT 'completed',
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sales_date ON sales(date DESC);
CREATE INDEX idx_sales_user ON sales(user_id);
CREATE INDEX idx_sales_customer ON sales(customer_id);
CREATE INDEX idx_sales_status ON sales(status);
CREATE INDEX idx_sales_cash_register ON sales(cash_register_id);

CREATE TABLE sale_items (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sale_id         UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_id      UUID NOT NULL REFERENCES products(id),
  batch_id        UUID REFERENCES product_batches(id),
  lot_number      TEXT,
  presentation    product_presentation NOT NULL DEFAULT 'unit',
  quantity        INTEGER NOT NULL CHECK (quantity > 0),
  unit_price      NUMERIC(12,2) NOT NULL,
  discount        NUMERIC(12,2) NOT NULL DEFAULT 0,
  subtotal        NUMERIC(12,2) NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sale_items_sale ON sale_items(sale_id);
CREATE INDEX idx_sale_items_product ON sale_items(product_id);

CREATE TABLE sale_payments (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sale_id     UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  method      payment_method NOT NULL,
  amount      NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sale_payments_sale ON sale_payments(sale_id);

-- ============================================================
-- DEVOLUCIONES
-- ============================================================

CREATE TABLE returns (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sale_id       UUID NOT NULL REFERENCES sales(id),
  sale_number   TEXT NOT NULL,
  date          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id       UUID NOT NULL REFERENCES profiles(id),
  total         NUMERIC(12,2) NOT NULL,
  reason        TEXT NOT NULL,
  type          return_type NOT NULL DEFAULT 'full',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE return_items (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  return_id   UUID NOT NULL REFERENCES returns(id) ON DELETE CASCADE,
  product_id  UUID NOT NULL REFERENCES products(id),
  batch_id    UUID REFERENCES product_batches(id),
  presentation product_presentation NOT NULL DEFAULT 'unit',
  quantity    INTEGER NOT NULL CHECK (quantity > 0),
  unit_price  NUMERIC(12,2) NOT NULL,
  subtotal    NUMERIC(12,2) NOT NULL
);

-- ============================================================
-- AUDITORÍA
-- ============================================================

CREATE TABLE audit_logs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES profiles(id),
  action      TEXT NOT NULL,
  entity      TEXT NOT NULL,
  entity_id   UUID,
  before_data JSONB,
  after_data  JSONB,
  ip_address  INET,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity, entity_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);

-- Función helper para registrar auditoría
CREATE OR REPLACE FUNCTION log_audit(
  p_action TEXT,
  p_entity TEXT,
  p_entity_id UUID,
  p_before JSONB DEFAULT NULL,
  p_after JSONB DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
  INSERT INTO audit_logs (user_id, action, entity, entity_id, before_data, after_data)
  VALUES (auth.uid(), p_action, p_entity, p_entity_id, p_before, p_after);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
