// ============================================================
// Cliente Supabase — se activa cuando se conecta el proyecto
// ============================================================

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// ============================================================
// TIPOS DE BASE DE DATOS (generados del esquema)
// ============================================================

export type Tables = {
  profiles: {
    id: string;
    name: string;
    email: string;
    role: 'admin' | 'pharmacist' | 'seller' | 'auditor';
    active: boolean;
    avatar_url?: string;
    last_login?: string;
    created_at: string;
    updated_at: string;
  };
  products: {
    id: string;
    code: string;
    barcode?: string;
    name: string;
    commercial_name?: string;
    active_ingredient?: string;
    laboratory?: string;
    category_id?: string;
    subcategory?: string;
    presentation: string;
    concentration?: string;
    pharmaceutical_form?: string;
    unit_measure?: string;
    description?: string;
    image_url?: string;
    active: boolean;
    units_per_blister: number;
    blisters_per_box: number;
    units_per_box: number;
    purchase_price: number;
    sale_price_unit: number;
    sale_price_blister: number;
    sale_price_box: number;
    min_stock: number;
    created_at: string;
  };
  product_batches: {
    id: string;
    product_id: string;
    supplier_id?: string;
    lot_number: string;
    entry_date: string;
    expiry_date: string;
    quantity: number;
    cost_price: number;
    purchase_id?: string;
    created_at: string;
  };
  sales: {
    id: string;
    number: string;
    date: string;
    user_id: string;
    customer_id?: string;
    cash_register_id?: string;
    subtotal: number;
    discount: number;
    tax: number;
    total: number;
    status: 'completed' | 'voided' | 'returned';
    notes?: string;
    created_at: string;
  };
  suppliers: {
    id: string;
    name: string;
    ruc?: string;
    phone?: string;
    email?: string;
    address?: string;
    contact?: string;
    notes?: string;
    active: boolean;
    created_at: string;
  };
  cash_closures: {
    id: string;
    cash_register_id: string;
    date: string;
    user_id: string;
    expected_amount: number;
    actual_amount: number;
    difference: number;
    notes?: string;
    created_at: string;
  };
  customers: {
    id: string;
    name: string;
    document_type?: string;
    document_number?: string;
    phone?: string;
    email?: string;
    address?: string;
    created_at: string;
  };
};

// ============================================================
// FUNCIONES DE API — reemplazan el store de Zustand
// ============================================================

// --- AUTH ---

export const authApi = {
  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;

    // Registrar login en auditoría
    if (data.user) {
      await supabase.from('audit_logs').insert({
        user_id: data.user.id,
        action: 'LOGIN',
        entity: 'session',
        entity_id: data.user.id,
      });

      // Actualizar last_login
      await supabase.from('profiles').update({ last_login: new Date().toISOString() }).eq('id', data.user.id);
    }

    return data;
  },

  async signOut() {
    return supabase.auth.signOut();
  },

  async getProfile(userId: string) {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (error) throw error;
    return data;
  },

  async getSession() {
    return supabase.auth.getSession();
  },

  onAuthStateChange(callback: Parameters<typeof supabase.auth.onAuthStateChange>[0]) {
    return supabase.auth.onAuthStateChange(callback);
  },
};

// --- PRODUCTOS ---

export const productsApi = {
  async getAll() {
    const { data, error } = await supabase
      .from('products')
      .select('*, categories(name)')
      .is('deleted_at', null)
      .order('name');
    if (error) throw error;
    return data;
  },

  async search(query: string) {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .is('deleted_at', null)
      .eq('active', true)
      .or(`name.ilike.%${query}%,code.ilike.%${query}%,barcode.eq.${query},active_ingredient.ilike.%${query}%`)
      .limit(20);
    if (error) throw error;
    return data;
  },

  async create(product: Omit<Tables['products'], 'id' | 'created_at' | 'units_per_box'>) {
    const { data, error } = await supabase.from('products').insert(product).select().single();
    if (error) throw error;
    await supabase.rpc('log_audit', {
      p_action: 'CREATE_PRODUCT', p_entity: 'product',
      p_entity_id: data.id, p_after: product as Record<string, unknown>,
    });
    return data;
  },

  async update(id: string, updates: Partial<Tables['products']>) {
    const { data: before } = await supabase.from('products').select('*').eq('id', id).single();
    const { data, error } = await supabase.from('products').update(updates).eq('id', id).select().single();
    if (error) throw error;
    await supabase.rpc('log_audit', {
      p_action: 'UPDATE_PRODUCT', p_entity: 'product',
      p_entity_id: id, p_before: before as Record<string, unknown>, p_after: updates as Record<string, unknown>,
    });
    return data;
  },

  async softDelete(id: string) {
    return supabase.from('products').update({ deleted_at: new Date().toISOString() }).eq('id', id);
  },
};

// --- INVENTARIO ---

export const inventoryApi = {
  async getSummary() {
    const { data, error } = await supabase.from('inventory_summary').select('*');
    if (error) throw error;
    return data;
  },

  async getBatches(productId?: string) {
    let query = supabase.from('product_batches').select('*').order('expiry_date', { ascending: true });
    if (productId) query = query.eq('product_id', productId);
    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  async getActiveAlerts() {
    const { data, error } = await supabase.from('v_active_alerts').select('*');
    if (error) throw error;
    return data;
  },

  async adjustInventory(
    productId: string, quantity: number,
    type: 'adjustment_positive' | 'adjustment_negative' | 'expired' | 'shrinkage',
    reason: string, batchId?: string
  ) {
    const { data, error } = await supabase.rpc('adjust_inventory', {
      p_product_id: productId,
      p_quantity: quantity,
      p_type: type,
      p_reason: reason,
      p_batch_id: batchId ?? null,
    });
    if (error) throw error;
    return data;
  },

  async getMovements(filters?: { productId?: string; type?: string; limit?: number }) {
    let query = supabase
      .from('inventory_movements')
      .select('*, products(name, code), profiles(name)')
      .order('created_at', { ascending: false });
    if (filters?.productId) query = query.eq('product_id', filters.productId);
    if (filters?.type) query = query.eq('type', filters.type);
    if (filters?.limit) query = query.limit(filters.limit);
    const { data, error } = await query;
    if (error) throw error;
    return data;
  },
};

// --- VENTAS (POS) ---

export const salesApi = {
  async processSale(params: {
    userId: string;
    cashRegisterId: string;
    customerId?: string;
    items: Array<{
      product_id: string;
      presentation: string;
      quantity: number;
      unit_price: number;
      discount: number;
      subtotal: number;
    }>;
    payments: Array<{ method: string; amount: number }>;
    discount?: number;
    tax?: number;
    notes?: string;
  }) {
    const { data, error } = await supabase.rpc('process_sale', {
      p_user_id: params.userId,
      p_cash_register_id: params.cashRegisterId,
      p_customer_id: params.customerId ?? null,
      p_items: params.items,
      p_payments: params.payments,
      p_discount: params.discount ?? 0,
      p_tax: params.tax ?? 0,
      p_notes: params.notes ?? null,
    });
    if (error) throw error;
    return data as { sale_id: string; sale_number: string; total: number; success: boolean };
  },

  async getAll(filters?: { from?: string; to?: string; userId?: string; limit?: number }) {
    let query = supabase
      .from('sales')
      .select(`
        *,
        profiles(name),
        customers(name),
        sale_items(*, products(name)),
        sale_payments(*)
      `)
      .order('date', { ascending: false });
    if (filters?.from) query = query.gte('date', filters.from);
    if (filters?.to) query = query.lte('date', filters.to + 'T23:59:59');
    if (filters?.userId) query = query.eq('user_id', filters.userId);
    if (filters?.limit) query = query.limit(filters.limit);
    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  async voidSale(saleId: string, reason: string) {
    const { data, error } = await supabase.rpc('void_sale', {
      p_sale_id: saleId,
      p_reason: reason,
    });
    if (error) throw error;
    return data;
  },

  async getDashboardStats() {
    const { data, error } = await supabase.from('v_today_sales').select('*').single();
    if (error) throw error;
    return data;
  },
};

// --- COMPRAS ---

export const purchasesApi = {
  async processPurchase(params: {
    userId: string;
    supplierId: string;
    invoiceNumber: string;
    date: string;
    items: Array<{
      product_id: string;
      presentation: string;
      quantity: number;
      unit_cost: number;
      total_cost: number;
      lot_number: string;
      expiry_date: string;
    }>;
    notes?: string;
  }) {
    const { data, error } = await supabase.rpc('process_purchase', {
      p_user_id: params.userId,
      p_supplier_id: params.supplierId,
      p_invoice_number: params.invoiceNumber,
      p_date: params.date,
      p_items: params.items,
      p_notes: params.notes ?? null,
    });
    if (error) throw error;
    return data;
  },

  async getAll() {
    const { data, error } = await supabase
      .from('purchases')
      .select('*, suppliers(name), profiles(name), purchase_items(*, products(name))')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },
};

// --- CAJA ---

export const cashApi = {
  async openRegister(userId: string, initialAmount: number) {
    const { data, error } = await supabase
      .from('cash_registers')
      .insert({ user_id: userId, initial_amount: initialAmount, status: 'open' })
      .select().single();
    if (error) throw error;
    return data;
  },

  async getOpenRegister() {
    const { data } = await supabase.from('cash_registers').select('*, profiles(name)').eq('status', 'open').maybeSingle();
    return data;
  },

  async closeRegister(registerId: string) {
    return supabase.from('cash_registers').update({ status: 'closed', closed_at: new Date().toISOString() }).eq('id', registerId);
  },

  async saveClosure(closure: Omit<Tables['cash_closures'] extends never ? never : { cash_register_id: string; date: string; user_id: string; [key: string]: unknown }, 'id' | 'difference' | 'created_at'>) {
    const { data, error } = await supabase.from('cash_closures').insert(closure).select().single();
    if (error) throw error;
    return data;
  },

  async addMovement(movement: { cash_register_id: string; type: string; amount: number; description: string; user_id: string }) {
    const { data, error } = await supabase.from('cash_movements').insert(movement).select().single();
    if (error) throw error;
    return data;
  },

  async getMovements(registerId: string) {
    const { data, error } = await supabase.from('cash_movements').select('*, profiles(name)').eq('cash_register_id', registerId).order('created_at');
    if (error) throw error;
    return data;
  },
};

// --- PROVEEDORES ---

export const suppliersApi = {
  async getAll() {
    const { data, error } = await supabase.from('suppliers').select('*').order('name');
    if (error) throw error;
    return data;
  },
  async upsert(supplier: Partial<Tables['suppliers']> & { name: string }) {
    const { data, error } = await supabase.from('suppliers').upsert(supplier).select().single();
    if (error) throw error;
    return data;
  },
};

// --- CLIENTES ---

export const customersApi = {
  async getAll() {
    const { data, error } = await supabase.from('customers').select('*').order('name');
    if (error) throw error;
    return data;
  },
  async upsert(customer: Partial<Tables['customers']> & { name: string }) {
    const { data, error } = await supabase.from('customers').upsert(customer).select().single();
    if (error) throw error;
    return data;
  },
};

// --- CONFIGURACIÓN ---

export const settingsApi = {
  async get() {
    const { data, error } = await supabase.from('company_settings').select('*').limit(1).single();
    if (error) throw error;
    return data;
  },
  async update(updates: Record<string, unknown>) {
    const { data: current } = await supabase.from('company_settings').select('id').limit(1).single();
    if (!current) {
      const { data, error } = await supabase.from('company_settings').insert(updates).select().single();
      if (error) throw error;
      return data;
    }
    const { data, error } = await supabase.from('company_settings').update(updates).eq('id', current.id).select().single();
    if (error) throw error;
    return data;
  },
};

// --- USUARIOS (admin only) ---

export const usersApi = {
  async getAll() {
    const { data, error } = await supabase.from('profiles').select('*').order('name');
    if (error) throw error;
    return data;
  },

  async createUser(email: string, password: string, name: string, role: string) {
    // Crear usuario en Supabase Auth (requiere Service Role Key en backend)
    // Desde el frontend solo se puede invitar por email.
    // Para creación directa usar Supabase Admin API en Edge Function.
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { data: { name, role } },
    });
    if (error) throw error;
    return data;
  },

  async updateProfile(userId: string, updates: Partial<Tables['profiles']>) {
    const { data, error } = await supabase.from('profiles').update(updates).eq('id', userId).select().single();
    if (error) throw error;
    return data;
  },
};

// --- AUDITORÍA ---

export const auditApi = {
  async getLogs(limit = 100) {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*, profiles(name)')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data;
  },
};
