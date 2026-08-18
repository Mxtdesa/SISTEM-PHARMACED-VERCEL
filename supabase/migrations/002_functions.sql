-- ============================================================
-- FUNCIONES ATÓMICAS DE NEGOCIO
-- ============================================================

-- ============================================================
-- FUNCIÓN: process_sale
-- Procesa una venta de forma atómica:
-- 1. Valida que la caja esté abierta
-- 2. Valida stock disponible por producto
-- 3. Descuenta inventario usando FEFO (primer vencimiento primero)
-- 4. Registra cada movimiento de inventario
-- 5. Crea la venta, ítems y pagos
-- 6. Actualiza total gastado del cliente
-- ============================================================

CREATE OR REPLACE FUNCTION process_sale(
  p_user_id         UUID,
  p_cash_register_id UUID,
  p_customer_id     UUID,
  p_items           JSONB,  -- [{product_id, presentation, quantity, unit_price, discount, subtotal}]
  p_payments        JSONB,  -- [{method, amount}]
  p_discount        NUMERIC DEFAULT 0,
  p_tax             NUMERIC DEFAULT 0,
  p_notes           TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_sale_id       UUID;
  v_sale_number   TEXT;
  v_total         NUMERIC := 0;
  v_subtotal      NUMERIC := 0;
  v_item          JSONB;
  v_payment       JSONB;
  v_product       RECORD;
  v_batch         RECORD;
  v_units_needed  INTEGER;
  v_units_from_batch INTEGER;
  v_remaining     INTEGER;
  v_stock_before  INTEGER;
  v_stock_after   INTEGER;
  v_allow_neg     BOOLEAN;
  v_reg_status    TEXT;
BEGIN
  -- Verificar que la caja esté abierta
  SELECT status INTO v_reg_status FROM cash_registers WHERE id = p_cash_register_id;
  IF v_reg_status IS DISTINCT FROM 'open' THEN
    RAISE EXCEPTION 'La caja no está abierta. Abra la caja antes de registrar ventas.';
  END IF;

  -- Verificar configuración de stock negativo
  SELECT allow_negative_stock INTO v_allow_neg FROM company_settings LIMIT 1;
  v_allow_neg := COALESCE(v_allow_neg, false);

  -- Calcular totales
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_subtotal := v_subtotal + (v_item->>'subtotal')::NUMERIC;
  END LOOP;
  v_total := v_subtotal - p_discount + p_tax;

  -- Crear la venta
  INSERT INTO sales (user_id, customer_id, cash_register_id, subtotal, discount, tax, total, notes)
  VALUES (p_user_id, p_customer_id, p_cash_register_id, v_subtotal, p_discount, p_tax, v_total, p_notes)
  RETURNING id, number INTO v_sale_id, v_sale_number;

  -- Procesar cada ítem
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    -- Obtener datos del producto
    SELECT id, name, units_per_blister, units_per_box, allow_negative_stock
    INTO v_product
    FROM products WHERE id = (v_item->>'product_id')::UUID;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Producto % no encontrado', v_item->>'product_id';
    END IF;

    -- Calcular unidades base a descontar según presentación
    v_units_needed := CASE (v_item->>'presentation')
      WHEN 'unit'    THEN (v_item->>'quantity')::INTEGER
      WHEN 'blister' THEN (v_item->>'quantity')::INTEGER * v_product.units_per_blister
      WHEN 'box'     THEN (v_item->>'quantity')::INTEGER * v_product.units_per_box
      ELSE                (v_item->>'quantity')::INTEGER
    END;

    -- Obtener stock actual
    SELECT COALESCE(SUM(quantity), 0) INTO v_stock_before
    FROM product_batches WHERE product_id = v_product.id;

    -- Validar stock suficiente
    IF NOT v_allow_neg AND v_stock_before < v_units_needed THEN
      RAISE EXCEPTION 'Stock insuficiente para "%". Disponible: % unidades, requerido: %',
        v_product.name, v_stock_before, v_units_needed;
    END IF;

    -- Insertar ítem de venta (sin batch específico aún)
    INSERT INTO sale_items (sale_id, product_id, presentation, quantity, unit_price, discount, subtotal)
    VALUES (
      v_sale_id,
      v_product.id,
      (v_item->>'presentation')::product_presentation,
      (v_item->>'quantity')::INTEGER,
      (v_item->>'unit_price')::NUMERIC,
      COALESCE((v_item->>'discount')::NUMERIC, 0),
      (v_item->>'subtotal')::NUMERIC
    );

    -- Descontar inventario FEFO: primero los que vencen antes
    -- Nunca usar lotes vencidos para ventas
    v_remaining := v_units_needed;

    FOR v_batch IN
      SELECT id, quantity, lot_number
      FROM product_batches
      WHERE product_id = v_product.id
        AND quantity > 0
        AND expiry_date >= CURRENT_DATE
      ORDER BY expiry_date ASC, created_at ASC
    LOOP
      EXIT WHEN v_remaining <= 0;

      v_units_from_batch := LEAST(v_remaining, v_batch.quantity);

      UPDATE product_batches
      SET quantity = quantity - v_units_from_batch,
          updated_at = NOW()
      WHERE id = v_batch.id;

      -- Registrar movimiento de inventario
      SELECT COALESCE(SUM(quantity), 0) INTO v_stock_after
      FROM product_batches WHERE product_id = v_product.id;

      INSERT INTO inventory_movements (
        product_id, batch_id, lot_number, type, quantity,
        presentation, stock_before, stock_after,
        user_id, reason, related_doc_id, related_doc_type
      ) VALUES (
        v_product.id, v_batch.id, v_batch.lot_number, 'sale', v_units_from_batch,
        (v_item->>'presentation')::product_presentation,
        v_stock_before, v_stock_after,
        p_user_id, 'Venta ' || v_sale_number, v_sale_id, 'sale'
      );

      v_stock_before := v_stock_after;
      v_remaining := v_remaining - v_units_from_batch;
    END LOOP;
  END LOOP;

  -- Registrar pagos
  FOR v_payment IN SELECT * FROM jsonb_array_elements(p_payments)
  LOOP
    INSERT INTO sale_payments (sale_id, method, amount)
    VALUES (
      v_sale_id,
      (v_payment->>'method')::payment_method,
      (v_payment->>'amount')::NUMERIC
    );
  END LOOP;

  -- Actualizar total gastado del cliente
  IF p_customer_id IS NOT NULL THEN
    UPDATE customers SET total_spent = total_spent + v_total WHERE id = p_customer_id;
  END IF;

  -- Registrar auditoría
  PERFORM log_audit('CREATE_SALE', 'sale', v_sale_id, NULL,
    jsonb_build_object('number', v_sale_number, 'total', v_total));

  RETURN jsonb_build_object(
    'sale_id', v_sale_id,
    'sale_number', v_sale_number,
    'total', v_total,
    'success', true
  );

EXCEPTION WHEN OTHERS THEN
  RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================
-- FUNCIÓN: process_purchase
-- Procesa una compra de forma atómica
-- ============================================================

CREATE OR REPLACE FUNCTION process_purchase(
  p_user_id       UUID,
  p_supplier_id   UUID,
  p_invoice_number TEXT,
  p_date          DATE,
  p_items         JSONB, -- [{product_id, presentation, quantity, unit_cost, total_cost, lot_number, expiry_date}]
  p_notes         TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_purchase_id   UUID;
  v_item          JSONB;
  v_batch_id      UUID;
  v_total         NUMERIC := 0;
  v_product       RECORD;
  v_units_added   INTEGER;
  v_stock_before  INTEGER;
  v_stock_after   INTEGER;
BEGIN
  -- Calcular total
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_total := v_total + (v_item->>'total_cost')::NUMERIC;
  END LOOP;

  -- Crear cabecera de compra
  INSERT INTO purchases (supplier_id, invoice_number, date, user_id, total, notes, status)
  VALUES (p_supplier_id, p_invoice_number, p_date, p_user_id, v_total, p_notes, 'completed')
  RETURNING id INTO v_purchase_id;

  -- Procesar cada ítem
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    SELECT id, units_per_blister, units_per_box INTO v_product
    FROM products WHERE id = (v_item->>'product_id')::UUID;

    -- Calcular unidades base
    v_units_added := CASE (v_item->>'presentation')
      WHEN 'unit'    THEN (v_item->>'quantity')::INTEGER
      WHEN 'blister' THEN (v_item->>'quantity')::INTEGER * v_product.units_per_blister
      WHEN 'box'     THEN (v_item->>'quantity')::INTEGER * v_product.units_per_box
      ELSE                (v_item->>'quantity')::INTEGER
    END;

    -- Stock antes
    SELECT COALESCE(SUM(quantity), 0) INTO v_stock_before
    FROM product_batches WHERE product_id = v_product.id;

    -- Crear o actualizar lote
    INSERT INTO product_batches (
      product_id, supplier_id, lot_number, expiry_date,
      quantity, cost_price, purchase_id, created_by
    ) VALUES (
      v_product.id,
      p_supplier_id,
      v_item->>'lot_number',
      (v_item->>'expiry_date')::DATE,
      v_units_added,
      (v_item->>'unit_cost')::NUMERIC,
      v_purchase_id,
      p_user_id
    )
    ON CONFLICT DO NOTHING
    RETURNING id INTO v_batch_id;

    -- Si hubo conflicto (lote ya existe), actualizar cantidad
    IF v_batch_id IS NULL THEN
      UPDATE product_batches
      SET quantity = quantity + v_units_added, updated_at = NOW()
      WHERE product_id = v_product.id AND lot_number = v_item->>'lot_number'
      RETURNING id INTO v_batch_id;
    END IF;

    -- Stock después
    SELECT COALESCE(SUM(quantity), 0) INTO v_stock_after
    FROM product_batches WHERE product_id = v_product.id;

    -- Registrar ítem de compra
    INSERT INTO purchase_items (
      purchase_id, product_id, batch_id, presentation,
      quantity, unit_cost, total_cost, lot_number, expiry_date
    ) VALUES (
      v_purchase_id, v_product.id, v_batch_id,
      (v_item->>'presentation')::product_presentation,
      (v_item->>'quantity')::INTEGER,
      (v_item->>'unit_cost')::NUMERIC,
      (v_item->>'total_cost')::NUMERIC,
      v_item->>'lot_number',
      (v_item->>'expiry_date')::DATE
    );

    -- Movimiento de inventario
    INSERT INTO inventory_movements (
      product_id, batch_id, lot_number, type, quantity,
      presentation, stock_before, stock_after,
      user_id, reason, related_doc_id, related_doc_type
    ) VALUES (
      v_product.id, v_batch_id, v_item->>'lot_number', 'purchase', v_units_added,
      (v_item->>'presentation')::product_presentation,
      v_stock_before, v_stock_after,
      p_user_id,
      'Compra - Factura ' || COALESCE(p_invoice_number, 'S/N'),
      v_purchase_id, 'purchase'
    );
  END LOOP;

  PERFORM log_audit('CREATE_PURCHASE', 'purchase', v_purchase_id, NULL,
    jsonb_build_object('invoice', p_invoice_number, 'total', v_total));

  RETURN jsonb_build_object('purchase_id', v_purchase_id, 'total', v_total, 'success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================
-- FUNCIÓN: adjust_inventory
-- Ajuste manual de inventario con auditoría
-- ============================================================

CREATE OR REPLACE FUNCTION adjust_inventory(
  p_product_id  UUID,
  p_quantity    INTEGER,
  p_type        movement_type, -- 'adjustment_positive' | 'adjustment_negative' | 'expired' | 'shrinkage'
  p_reason      TEXT,
  p_batch_id    UUID DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_stock_before INTEGER;
  v_stock_after  INTEGER;
  v_batch_id     UUID := p_batch_id;
  v_lot          TEXT;
  v_allow_neg    BOOLEAN;
BEGIN
  SELECT allow_negative_stock INTO v_allow_neg FROM company_settings LIMIT 1;

  SELECT COALESCE(SUM(quantity), 0) INTO v_stock_before
  FROM product_batches WHERE product_id = p_product_id;

  IF p_type IN ('adjustment_negative', 'expired', 'shrinkage') THEN
    IF NOT v_allow_neg AND v_stock_before < p_quantity THEN
      RAISE EXCEPTION 'Stock insuficiente para ajuste. Disponible: %, requerido: %', v_stock_before, p_quantity;
    END IF;

    IF v_batch_id IS NULL THEN
      -- Usar el lote con vencimiento más próximo
      SELECT id, lot_number INTO v_batch_id, v_lot
      FROM product_batches
      WHERE product_id = p_product_id AND quantity > 0
      ORDER BY expiry_date ASC LIMIT 1;
    END IF;

    UPDATE product_batches
    SET quantity = GREATEST(0, quantity - p_quantity), updated_at = NOW()
    WHERE id = v_batch_id;

  ELSE -- adjustment_positive
    -- Crear un lote genérico de ajuste
    INSERT INTO product_batches (product_id, lot_number, expiry_date, quantity, cost_price, created_by)
    VALUES (p_product_id, 'AJUSTE-' || TO_CHAR(NOW(), 'YYYYMMDD'), '2099-12-31', p_quantity, 0, auth.uid())
    RETURNING id INTO v_batch_id;
    v_lot := 'AJUSTE-' || TO_CHAR(NOW(), 'YYYYMMDD');
  END IF;

  SELECT COALESCE(SUM(quantity), 0) INTO v_stock_after
  FROM product_batches WHERE product_id = p_product_id;

  INSERT INTO inventory_movements (
    product_id, batch_id, lot_number, type, quantity,
    presentation, stock_before, stock_after,
    user_id, reason
  ) VALUES (
    p_product_id, v_batch_id, v_lot, p_type, p_quantity,
    'unit', v_stock_before, v_stock_after,
    auth.uid(), p_reason
  );

  PERFORM log_audit('INVENTORY_ADJUSTMENT', 'product', p_product_id,
    jsonb_build_object('stock', v_stock_before),
    jsonb_build_object('stock', v_stock_after, 'type', p_type, 'quantity', p_quantity));

  RETURN jsonb_build_object(
    'success', true,
    'stock_before', v_stock_before,
    'stock_after', v_stock_after
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================
-- FUNCIÓN: void_sale
-- Anular una venta y reponer inventario
-- ============================================================

CREATE OR REPLACE FUNCTION void_sale(
  p_sale_id UUID,
  p_reason  TEXT
) RETURNS JSONB AS $$
DECLARE
  v_item    RECORD;
  v_sale    RECORD;
  v_units   INTEGER;
  v_stock_before INTEGER;
  v_stock_after  INTEGER;
BEGIN
  SELECT * INTO v_sale FROM sales WHERE id = p_sale_id;

  IF v_sale.status = 'voided' THEN
    RAISE EXCEPTION 'La venta % ya está anulada', v_sale.number;
  END IF;

  -- Actualizar estado
  UPDATE sales SET status = 'voided' WHERE id = p_sale_id;

  -- Reponer inventario por cada ítem
  FOR v_item IN
    SELECT si.*, p.units_per_blister, p.units_per_box
    FROM sale_items si
    JOIN products p ON p.id = si.product_id
    WHERE si.sale_id = p_sale_id
  LOOP
    v_units := CASE v_item.presentation
      WHEN 'unit'    THEN v_item.quantity
      WHEN 'blister' THEN v_item.quantity * v_item.units_per_blister
      WHEN 'box'     THEN v_item.quantity * v_item.units_per_box
      ELSE v_item.quantity
    END;

    SELECT COALESCE(SUM(quantity), 0) INTO v_stock_before
    FROM product_batches WHERE product_id = v_item.product_id;

    -- Reponer al lote original si existe, sino crear nuevo
    IF v_item.batch_id IS NOT NULL THEN
      UPDATE product_batches SET quantity = quantity + v_units, updated_at = NOW()
      WHERE id = v_item.batch_id;
    ELSE
      INSERT INTO product_batches (product_id, lot_number, expiry_date, quantity, cost_price, created_by)
      VALUES (v_item.product_id, 'DEV-' || v_sale.number, '2099-12-31', v_units, 0, auth.uid());
    END IF;

    SELECT COALESCE(SUM(quantity), 0) INTO v_stock_after
    FROM product_batches WHERE product_id = v_item.product_id;

    INSERT INTO inventory_movements (
      product_id, batch_id, type, quantity, presentation,
      stock_before, stock_after, user_id, reason,
      related_doc_id, related_doc_type
    ) VALUES (
      v_item.product_id, v_item.batch_id, 'return', v_units, v_item.presentation,
      v_stock_before, v_stock_after, auth.uid(),
      'Anulación de venta ' || v_sale.number,
      p_sale_id, 'sale'
    );
  END LOOP;

  PERFORM log_audit('VOID_SALE', 'sale', p_sale_id,
    jsonb_build_object('status', 'completed'),
    jsonb_build_object('status', 'voided', 'reason', p_reason));

  RETURN jsonb_build_object('success', true, 'sale_number', v_sale.number);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
