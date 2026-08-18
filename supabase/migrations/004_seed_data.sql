-- ============================================================
-- DATOS INICIALES DE EJEMPLO
-- ============================================================

-- Configuración de empresa
INSERT INTO company_settings (name, ruc, address, phone, email, currency, currency_symbol, expiry_alert_days)
VALUES ('Farmacia San Miguel', '20123456789', 'Av. San Martín 456, Lima - Perú', '01-234-5678', 'contacto@farmaciasanmiguel.pe', 'PEN', 'S/', 60)
ON CONFLICT DO NOTHING;

-- Categorías
INSERT INTO categories (name) VALUES
  ('Analgésicos'), ('Antibióticos'), ('Cardiovascular'), ('Diabetes'),
  ('Gastroenterología'), ('Neurología'), ('Endocrinología'), ('Respiratorio'),
  ('Vitaminas y Suplementos'), ('Antisépticos y Desinfectantes'), ('Dermatología'),
  ('Oftalmología'), ('Pediatría'), ('Ginecología'), ('Otros')
ON CONFLICT DO NOTHING;

-- Proveedores de ejemplo
INSERT INTO suppliers (name, ruc, phone, email, address, contact, notes) VALUES
  ('Distribuidora Médica del Norte SAC', '20123456789', '01-234-5678', 'ventas@distmednorte.pe', 'Av. Industrial 456, Lima', 'Roberto Chávez', 'Proveedor principal GSK y Pfizer'),
  ('Farmacéutica Andina EIRL', '20987654321', '01-345-6789', 'pedidos@farmandina.pe', 'Jr. Comercio 789, Lima', 'Carmen López', 'Especialistas en antibióticos'),
  ('Representaciones MedLife SA', '20456789012', '01-456-7890', 'info@medlife.pe', 'Calle Las Rosas 321, Miraflores', 'Jorge Paredes', 'Cardiovascular y diabetes'),
  ('Químicos y Reactivos Perú SRL', '20321654987', '01-567-8901', 'quimicos@reactivos.pe', 'Av. Venezuela 654, Breña', 'Sandra Flores', 'Antisépticos y productos de limpieza')
ON CONFLICT DO NOTHING;

-- Nota: Los productos, usuarios y lotes se crean desde la aplicación.
-- El primer usuario registrado con rol 'admin' puede comenzar a configurar el sistema.

-- Vista de ayuda para stock por producto (opcional, para queries analíticas)
CREATE OR REPLACE VIEW v_product_stock AS
SELECT
  p.id,
  p.code,
  p.name,
  p.active_ingredient,
  p.laboratory,
  p.sale_price_unit,
  p.sale_price_blister,
  p.sale_price_box,
  p.min_stock,
  p.units_per_blister,
  p.units_per_box,
  COALESCE(SUM(b.quantity) FILTER (WHERE b.expiry_date >= CURRENT_DATE), 0)::INT AS available_units,
  COALESCE(SUM(b.quantity), 0)::INT AS total_units_including_expired,
  MIN(b.expiry_date) FILTER (WHERE b.quantity > 0 AND b.expiry_date >= CURRENT_DATE) AS next_expiry,
  COUNT(DISTINCT b.id) FILTER (WHERE b.quantity > 0 AND b.expiry_date >= CURRENT_DATE)::INT AS active_batches
FROM products p
LEFT JOIN product_batches b ON b.product_id = p.id
WHERE p.deleted_at IS NULL
GROUP BY p.id;

-- Vista de ventas del día para dashboard
CREATE OR REPLACE VIEW v_today_sales AS
SELECT
  COUNT(*) AS total_sales,
  COALESCE(SUM(total), 0) AS total_revenue,
  COALESCE(SUM(discount), 0) AS total_discounts,
  COALESCE(AVG(total), 0) AS avg_ticket
FROM sales
WHERE DATE(date) = CURRENT_DATE AND status = 'completed';

-- Vista de alertas activas
CREATE OR REPLACE VIEW v_active_alerts AS
SELECT
  'low_stock' AS alert_type,
  p.id AS product_id,
  p.name AS product_name,
  s.available_units AS value,
  p.min_stock AS threshold,
  NULL::TEXT AS extra_info
FROM products p
JOIN v_product_stock s ON s.id = p.id
WHERE p.active = true AND p.deleted_at IS NULL AND s.available_units <= p.min_stock AND s.available_units > 0

UNION ALL

SELECT
  'expiring_soon',
  b.product_id,
  p.name,
  b.quantity,
  NULL,
  b.expiry_date::TEXT
FROM product_batches b
JOIN products p ON p.id = b.product_id
JOIN company_settings cs ON true
WHERE b.quantity > 0
  AND b.expiry_date >= CURRENT_DATE
  AND b.expiry_date <= CURRENT_DATE + (cs.expiry_alert_days || ' days')::INTERVAL
  AND p.deleted_at IS NULL

UNION ALL

SELECT
  'expired',
  b.product_id,
  p.name,
  b.quantity,
  NULL,
  b.expiry_date::TEXT
FROM product_batches b
JOIN products p ON p.id = b.product_id
WHERE b.quantity > 0 AND b.expiry_date < CURRENT_DATE AND p.deleted_at IS NULL;
