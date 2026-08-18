import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  User, Product, Supplier, Customer, Sale, Purchase,
  CashRegister, CashMovement, CartItem, InventoryMovement,
  CompanySettings, ProductBatch, CashClosure, AuditLog, Shift,
} from '../types';
import {
  mockUsers, mockProducts, mockSuppliers, mockCustomers,
  mockSales, mockPurchases, mockCashRegister, mockCashMovements,
  mockMovements, mockCompanySettings, mockBatches,
} from '../data/mockData';

interface AppState {
  // Auth
  currentUser: User | null;
  isDark: boolean;
  login: (email: string, password: string) => boolean;
  logout: () => void;
  toggleDark: () => void;

  // Data
  users: User[];
  products: Product[];
  batches: ProductBatch[];
  suppliers: Supplier[];
  customers: Customer[];
  sales: Sale[];
  purchases: Purchase[];
  cashRegister: CashRegister | null;
  cashMovements: CashMovement[];
  cashClosures: CashClosure[];
  movements: InventoryMovement[];
  settings: CompanySettings;
  shifts: Shift[];
  auditLogs: AuditLog[];

  categories: string[];
  addCategory: (category: string) => void;
  updateCategory: (oldCategory: string, newCategory: string) => void;
  deleteCategory: (category: string) => void;

  // POS Cart
  cart: CartItem[];
  addToCart: (item: CartItem) => void;
  updateCartItem: (productId: string, quantity: number) => void;
  updateCartItemDetails: (productId: string, presentation: string, updates: { quantity?: number; unitPrice?: number; discount?: number }) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;

  // Actions
  addProduct: (product: Product) => void;
  updateProduct: (id: string, updates: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  deleteUser: (id: string) => void;
  addUser: (user: User) => void;
  updateUser: (id: string, updates: Partial<User>) => void;
  
  // Payroll Reminders
  payrollReminders: PayrollReminder[];
  addPayrollReminder: (reminder: Omit<PayrollReminder, 'id' | 'createdAt'>) => void;
  updatePayrollReminder: (id: string, updates: Partial<PayrollReminder>) => void;
  deletePayrollReminder: (id: string) => void;

  completeSale: (sale: Sale) => void;
  openCashRegister: (initialAmount: number) => void;
  closeCashRegister: () => void;
  addCashMovement: (movement: Omit<CashMovement, 'id'>) => void;
  addCashClosure: (closure: CashClosure) => void;
  addInventoryMovement: (movement: Omit<InventoryMovement, 'id'>) => void;
  adjustStock: (productId: string, quantity: number, type: 'adjustment_positive' | 'adjustment_negative', reason: string) => void;
  addSupplier: (supplier: Supplier) => void;
  updateSupplier: (id: string, updates: Partial<Supplier>) => void;
  addCustomer: (customer: Customer) => void;
  addPurchase: (purchase: Purchase) => void;
  updateSettings: (updates: Partial<CompanySettings>) => void;
  getProductStock: (productId: string) => number;

  // Batches
  addBatch: (batch: ProductBatch) => void;
  updateBatch: (id: string, updates: Partial<ProductBatch>) => void;
  deleteBatch: (id: string) => void;

  // Shifts
  addShift: (shift: Shift) => void;
  updateShift: (id: string, updates: Partial<Shift>) => void;
  deleteShift: (id: string) => void;

  // Audit
  addAuditLog: (log: Omit<AuditLog, 'id' | 'createdAt'>) => void;
}

let saleCounter = 1847;

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      currentUser: null,
      isDark: false,
      login: (email, password) => {
        const user = mockUsers.find(u => u.email === email && u.active);
        if (user && password === 'farmacia123') {
          set({ currentUser: user });
          return true;
        }
        return false;
      },
      logout: () => set({ currentUser: null, cart: [] }),
      toggleDark: () => {
        const next = !get().isDark;
        set({ isDark: next });
        document.documentElement.classList.toggle('dark', next);
      },

      users: mockUsers,
      products: mockProducts,
      batches: mockBatches,
      suppliers: mockSuppliers,
      customers: mockCustomers,
      sales: mockSales,
      purchases: mockPurchases,
      cashRegister: mockCashRegister,
      cashMovements: mockCashMovements,
      cashClosures: [],
      movements: mockMovements,
      settings: mockCompanySettings,
      shifts: [],
      auditLogs: [],

      categories: ['Analgésicos', 'Antibióticos', 'Cardiovascular', 'Diabetes', 'Gastroenterología', 'Neurología', 'Endocrinología', 'Respiratorio', 'Vitaminas', 'Antisépticos', 'Jarabes y Suspensiones', 'Cuidado Personal', 'Otros'],
      addCategory: (category) => {
        const cat = category.trim();
        if (!cat || get().categories.includes(cat)) return;
        set({ categories: [...get().categories, cat] });
      },
      updateCategory: (oldCat, newCat) => {
        const updatedCat = newCat.trim();
        if (!updatedCat) return;
        set({
          categories: get().categories.map(c => c === oldCat ? updatedCat : c),
          products: get().products.map(p => p.category === oldCat ? { ...p, category: updatedCat } : p),
        });
      },
      deleteCategory: (category) => {
        set({ categories: get().categories.filter(c => c !== category) });
      },

      cart: [],
      addToCart: (item) => {
        const cart = get().cart;
        const existing = cart.find(c => c.productId === item.productId && c.presentation === item.presentation);
        if (existing) {
          set({
            cart: cart.map(c =>
              c.productId === item.productId && c.presentation === item.presentation
                ? { ...c, quantity: c.quantity + item.quantity, subtotal: (c.quantity + item.quantity) * c.unitPrice * (1 - c.discount / 100) }
                : c
            ),
          });
        } else {
          set({ cart: [...cart, item] });
        }
      },
      updateCartItem: (productId, quantity) => {
        set({
          cart: get().cart.map(c =>
            c.productId === productId ? { ...c, quantity, subtotal: quantity * c.unitPrice * (1 - c.discount / 100) } : c
          ).filter(c => c.quantity > 0),
        });
      },
      updateCartItemDetails: (productId, presentation, updates) => {
        set({
          cart: get().cart.map(c => {
            if (c.productId === productId && c.presentation === presentation) {
              const qty = updates.quantity !== undefined ? updates.quantity : c.quantity;
              const price = updates.unitPrice !== undefined ? updates.unitPrice : c.unitPrice;
              const disc = updates.discount !== undefined ? updates.discount : c.discount;
              const subtotal = qty * price * (1 - disc / 100);
              return { ...c, quantity: qty, unitPrice: price, discount: disc, subtotal };
            }
            return c;
          }).filter(c => c.quantity > 0),
        });
      },
      removeFromCart: (productId) => {
        set({ cart: get().cart.filter(c => c.productId !== productId) });
      },
      clearCart: () => set({ cart: [] }),

      addProduct: (product) => {
        set({ products: [...get().products, product] });
        get().addAuditLog({ userId: get().currentUser?.id ?? '', userName: get().currentUser?.name ?? '', action: 'Nuevo producto', entity: 'Producto', entityId: product.id, after: { nombre: product.name, codigo: product.code } });
      },

      updateProduct: (id, updates) => {
        const before = get().products.find(p => p.id === id);
        set({ products: get().products.map(p => p.id === id ? { ...p, ...updates } : p) });
        const priceFields = ['salePriceUnit', 'salePriceBlister', 'salePriceBox', 'purchasePrice'];
        const beforeRec = before as unknown as Record<string, unknown>;
        const updatesRec = updates as unknown as Record<string, unknown>;
        const changedPrices = priceFields.filter(f => updatesRec[f] !== undefined && updatesRec[f] !== beforeRec?.[f]);
        if (changedPrices.length > 0 && before) {
          const beforePrices: Record<string, unknown> = {};
          const afterPrices: Record<string, unknown> = {};
          changedPrices.forEach(f => { beforePrices[f] = beforeRec[f]; afterPrices[f] = updatesRec[f]; });
          get().addAuditLog({ userId: get().currentUser?.id ?? '', userName: get().currentUser?.name ?? '', action: 'Cambio de precio', entity: 'Producto', entityId: id, before: beforePrices, after: afterPrices });
        } else if (Object.keys(updates).some(k => !['active'].includes(k))) {
          get().addAuditLog({ userId: get().currentUser?.id ?? '', userName: get().currentUser?.name ?? '', action: 'Edición de producto', entity: 'Producto', entityId: id, after: { nombre: before?.name } });
        }
      },

      deleteProduct: (id) => {
        const prod = get().products.find(p => p.id === id);
        set({
          products: get().products.filter(p => p.id !== id),
          batches: get().batches.filter(b => b.productId !== id),
        });
        if (prod) {
          get().addAuditLog({ userId: get().currentUser?.id ?? '', userName: get().currentUser?.name ?? '', action: 'Producto eliminado', entity: 'Producto', entityId: id, before: { nombre: prod.name } });
        }
      },

      deleteUser: (id) => {
        const u = get().users.find(usr => usr.id === id);
        set({ users: get().users.filter(usr => usr.id !== id) });
        if (u) {
          get().addAuditLog({ userId: get().currentUser?.id ?? '', userName: get().currentUser?.name ?? '', action: 'Usuario eliminado', entity: 'Usuario', entityId: id, before: { nombre: u.name, email: u.email } });
        }
      },

      addUser: (user) => set({ users: [...get().users, user] }),
      updateUser: (id, updates) => set({ users: get().users.map(u => u.id === id ? { ...u, ...updates } : u) }),

      payrollReminders: [],
      addPayrollReminder: (reminder) => {
        const newRem: PayrollReminder = {
          ...reminder,
          id: `pay-${Date.now()}`,
          createdAt: new Date().toISOString(),
        };
        set({ payrollReminders: [...get().payrollReminders, newRem] });
      },
      updatePayrollReminder: (id, updates) => {
        set({ payrollReminders: get().payrollReminders.map(p => p.id === id ? { ...p, ...updates } : p) });
      },
      deletePayrollReminder: (id) => {
        set({ payrollReminders: get().payrollReminders.filter(p => p.id !== id) });
      },

      completeSale: (sale) => {
        saleCounter++;
        const newSale = { ...sale, number: `V-2025-${String(saleCounter).padStart(6, '0')}` };
        set({ sales: [newSale, ...get().sales], cart: [] });
        sale.items.forEach(item => {
          const product = get().products.find(p => p.id === item.productId);
          if (!product) return;
          
          let unitsToDeduct = item.quantity;
          if (product.unidadesVenta && product.unidadesVenta.length > 0) {
            const foundUnit = product.unidadesVenta.find(u => u.nombre.toLowerCase() === item.presentation.toString().toLowerCase());
            if (foundUnit) {
              unitsToDeduct = item.quantity * (foundUnit.cantidadBase || 1);
            } else if (item.presentation === 'blister') {
              unitsToDeduct = item.quantity * (product.units?.unitsPerBlister || 1);
            } else if (item.presentation === 'box') {
              unitsToDeduct = item.quantity * (product.units?.unitsPerBox || 1);
            }
          } else {
            unitsToDeduct = item.presentation === 'unit' ? item.quantity
              : item.presentation === 'blister' ? item.quantity * (product.units?.unitsPerBlister || 1)
              : item.quantity * (product.units?.unitsPerBox || 1);
          }

          const batches = get().batches
            .filter(b => b.productId === item.productId && b.quantity > 0)
            .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());

          let remaining = unitsToDeduct;
          const updatedBatches = [...get().batches];
          for (const batch of batches) {
            if (remaining <= 0) break;
            const idx = updatedBatches.findIndex(b => b.id === batch.id);
            const deduct = Math.min(remaining, updatedBatches[idx].quantity);
            updatedBatches[idx] = { ...updatedBatches[idx], quantity: updatedBatches[idx].quantity - deduct };
            remaining -= deduct;
          }
          set({ batches: updatedBatches });
        });
        get().addAuditLog({ userId: get().currentUser?.id ?? '', userName: get().currentUser?.name ?? '', action: 'Venta registrada', entity: 'Venta', entityId: newSale.id, after: { total: sale.total, items: sale.items.length } });
      },

      openCashRegister: (initialAmount) => {
        const user = get().currentUser!;
        const register: CashRegister = {
          id: `cr-${Date.now()}`, userId: user.id, userName: user.name,
          openedAt: new Date().toISOString(), initialAmount, status: 'open',
        };
        set({ cashRegister: register });
        get().addAuditLog({ userId: user.id, userName: user.name, action: 'Apertura de caja', entity: 'Caja', entityId: register.id, after: { montoInicial: initialAmount } });
      },

      closeCashRegister: () => {
        const register = get().cashRegister;
        if (register) {
          set({ cashRegister: { ...register, status: 'closed', closedAt: new Date().toISOString() } });
          get().addAuditLog({ userId: get().currentUser?.id ?? '', userName: get().currentUser?.name ?? '', action: 'Cierre de caja', entity: 'Caja', entityId: register.id });
        }
      },

      addCashMovement: (movement) => {
        const newMovement: CashMovement = { ...movement, id: `cm-${Date.now()}` };
        set({ cashMovements: [...get().cashMovements, newMovement] });
      },

      addCashClosure: (closure) => set({ cashClosures: [closure, ...get().cashClosures] }),

      addInventoryMovement: (movement) => {
        const newMovement: InventoryMovement = { ...movement, id: `mv-${Date.now()}` };
        set({ movements: [newMovement, ...get().movements] });
      },

      adjustStock: (productId, quantity, type, reason) => {
        const user = get().currentUser!;
        const currentStock = get().getProductStock(productId);
        const product = get().products.find(p => p.id === productId);
        if (!product) return;

        const delta = type === 'adjustment_positive' ? quantity : -quantity;
        const newBatch: ProductBatch = {
          id: `adj-${Date.now()}`, productId, lotNumber: 'AJUSTE', expiryDate: '2099-12-31',
          entryDate: new Date().toISOString().split('T')[0], quantity: type === 'adjustment_positive' ? quantity : 0,
          costPrice: product.purchasePrice, supplierId: '',
        };

        if (type === 'adjustment_positive') {
          set({ batches: [...get().batches, newBatch] });
        } else {
          let remaining = quantity;
          const updated = [...get().batches];
          for (let i = 0; i < updated.length && remaining > 0; i++) {
            if (updated[i].productId !== productId) continue;
            const deduct = Math.min(remaining, updated[i].quantity);
            updated[i] = { ...updated[i], quantity: updated[i].quantity - deduct };
            remaining -= deduct;
          }
          set({ batches: updated });
        }

        get().addInventoryMovement({
          productId, productName: product.name, type,
          quantity, presentation: 'unit',
          stockBefore: currentStock, stockAfter: currentStock + delta,
          userId: user.id, userName: user.name, reason,
          createdAt: new Date().toISOString(),
        });

        get().addAuditLog({ userId: user.id, userName: user.name, action: type === 'adjustment_positive' ? 'Ajuste positivo de stock' : 'Ajuste negativo de stock', entity: 'Inventario', entityId: productId, before: { stock: currentStock }, after: { stock: currentStock + delta, motivo: reason } });
      },

      addBatch: (batch) => {
        set({ batches: [...get().batches, batch] });
        get().addAuditLog({ userId: get().currentUser?.id ?? '', userName: get().currentUser?.name ?? '', action: 'Lote agregado', entity: 'Lote', entityId: batch.id, after: { lote: batch.lotNumber, vencimiento: batch.expiryDate, cantidad: batch.quantity } });
      },
      updateBatch: (id, updates) => {
        const before = get().batches.find(b => b.id === id);
        set({ batches: get().batches.map(b => b.id === id ? { ...b, ...updates } : b) });
        get().addAuditLog({ userId: get().currentUser?.id ?? '', userName: get().currentUser?.name ?? '', action: 'Lote editado', entity: 'Lote', entityId: id, before: { lote: before?.lotNumber, vencimiento: before?.expiryDate }, after: updates as Record<string, unknown> });
      },
      deleteBatch: (id) => {
        const batch = get().batches.find(b => b.id === id);
        set({ batches: get().batches.filter(b => b.id !== id) });
        get().addAuditLog({ userId: get().currentUser?.id ?? '', userName: get().currentUser?.name ?? '', action: 'Lote eliminado', entity: 'Lote', entityId: id, before: { lote: batch?.lotNumber, vencimiento: batch?.expiryDate, cantidad: batch?.quantity } });
      },

      addSupplier: (supplier) => set({ suppliers: [...get().suppliers, supplier] }),
      updateSupplier: (id, updates) => set({ suppliers: get().suppliers.map(s => s.id === id ? { ...s, ...updates } : s) }),
      addCustomer: (customer) => set({ customers: [...get().customers, customer] }),

      addPurchase: (purchase) => {
        set({ purchases: [purchase, ...get().purchases] });
        purchase.items.forEach(item => {
          const product = get().products.find(p => p.id === item.productId);
          if (!product) return;
          const unitsAdded = item.presentation === 'unit' ? item.quantity
            : item.presentation === 'blister' ? item.quantity * product.units.unitsPerBlister
            : item.quantity * product.units.unitsPerBox;

          const newBatch: ProductBatch = {
            id: `b-${Date.now()}-${item.productId}`,
            productId: item.productId, lotNumber: item.lotNumber, expiryDate: item.expiryDate,
            entryDate: purchase.date, quantity: unitsAdded, costPrice: item.unitCost, supplierId: purchase.supplierId,
          };
          set({ batches: [...get().batches, newBatch] });
        });
        get().addAuditLog({ userId: get().currentUser?.id ?? '', userName: get().currentUser?.name ?? '', action: 'Compra registrada', entity: 'Compra', entityId: purchase.id, after: { total: purchase.total, items: purchase.items.length } });
      },

      updateSettings: (updates) => set({ settings: { ...get().settings, ...updates } }),

      getProductStock: (productId) => {
        return get().batches
          .filter(b => b.productId === productId)
          .reduce((sum, b) => sum + b.quantity, 0);
      },

      // Shifts
      addShift: (shift) => set({ shifts: [...get().shifts, shift] }),
      updateShift: (id, updates) => set({ shifts: get().shifts.map(s => s.id === id ? { ...s, ...updates } : s) }),
      deleteShift: (id) => set({ shifts: get().shifts.filter(s => s.id !== id) }),

      // Audit
      addAuditLog: (log) => {
        const newLog: AuditLog = { ...log, id: `al-${Date.now()}-${Math.random().toString(36).slice(2)}`, createdAt: new Date().toISOString() };
        set({ auditLogs: [newLog, ...get().auditLogs].slice(0, 2000) });
      },
    }),
    {
      name: 'farmacia-store-v2',
      // Exclude transient state from persistence
      partialize: (state) => ({
        isDark: state.isDark,
        products: state.products,
        batches: state.batches,
        suppliers: state.suppliers,
        customers: state.customers,
        sales: state.sales,
        purchases: state.purchases,
        cashRegister: state.cashRegister,
        cashMovements: state.cashMovements,
        cashClosures: state.cashClosures,
        movements: state.movements,
        settings: state.settings,
        shifts: state.shifts,
        auditLogs: state.auditLogs,
        users: state.users,
      }),
    }
  )
);
