export type UserRole = 'admin' | 'pharmacist' | 'seller' | 'auditor';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  active: boolean;
  createdAt: string;
  lastLogin?: string;
  avatar?: string;
}

export type ProductPresentation = 'unit' | 'blister' | 'box' | 'bottle' | 'ampoule' | 'sachet' | 'capsule' | 'tablet' | 'syrup' | 'pot' | 'spray' | string;

export const PRESENTATION_TYPES = [
  'Tableta',
  'Cápsula',
  'Blíster',
  'Caja',
  'Jarabe',
  'Suspensión',
  'Solución',
  'Gotas',
  'Frasco',
  'Ampolla',
  'Vial',
  'Crema',
  'Gel',
  'Pomada',
  'Spray',
  'Sobre',
  'Inyectable',
  'Otro',
] as const;

export interface SaleUnit {
  id?: string;
  nombre: string;
  cantidadBase: number;
  precioVenta: number;
}

export interface ProductUnit {
  unitsPerBlister: number;
  blistersPerBox: number;
  unitsPerBox: number;
}

export interface PriceEntry {
  purchasePrice: number;
  salePriceUnit: number;
  salePriceBlister: number;
  salePriceBox: number;
  changedAt: string;
  changedBy: string;
}

export interface Product {
  id: string;
  code: string;
  barcode?: string;
  name: string;
  commercialName: string;
  activeIngredient: string;
  laboratory: string;
  category: string;
  subcategory: string;
  presentation: ProductPresentation;
  tipoPresentacion: string;
  unidadBase: string;
  unidadesVenta: SaleUnit[];
  concentration?: string;
  pharmaceuticalForm?: string;
  unitMeasure: string;
  description: string;
  image?: string;
  active: boolean;
  units: ProductUnit;
  purchasePrice: number;
  salePriceUnit: number;
  salePriceBlister: number;
  salePriceBox: number;
  priceHistory: PriceEntry[];
  minStock: number;
  location?: string;
  createdAt: string;
}

export interface ProductBatch {
  id: string;
  productId: string;
  lotNumber: string;
  expiryDate: string;
  entryDate: string;
  quantity: number; // in base units
  costPrice: number;
  supplierId: string;
}

export interface InventoryItem {
  productId: string;
  product: Product;
  totalUnits: number;
  batches: ProductBatch[];
}

export type MovementType =
  | 'purchase'
  | 'sale'
  | 'return'
  | 'adjustment_positive'
  | 'adjustment_negative'
  | 'expired'
  | 'shrinkage'
  | 'correction'
  | 'transfer';

export interface InventoryMovement {
  id: string;
  productId: string;
  productName: string;
  batchId?: string;
  lotNumber?: string;
  type: MovementType;
  quantity: number;
  presentation: ProductPresentation;
  stockBefore: number;
  stockAfter: number;
  userId: string;
  userName: string;
  reason: string;
  relatedDocId?: string;
  createdAt: string;
}

export interface Supplier {
  id: string;
  name: string;
  ruc: string;
  phone: string;
  email: string;
  address: string;
  contact: string;
  notes: string;
  active: boolean;
  createdAt: string;
}

export interface Customer {
  id: string;
  name: string;
  document: string;
  phone: string;
  email: string;
  address: string;
  createdAt: string;
  totalSpent: number;
}

export interface PurchaseItem {
  productId: string;
  productName: string;
  presentation: ProductPresentation;
  quantity: number;
  unitCost: number;
  totalCost: number;
  lotNumber: string;
  expiryDate: string;
}

export interface Purchase {
  id: string;
  supplierId: string;
  supplierName: string;
  invoiceNumber: string;
  date: string;
  userId: string;
  userName: string;
  items: PurchaseItem[];
  total: number;
  notes: string;
  status: 'pending' | 'completed' | 'cancelled';
}

export type PaymentMethod = 'cash' | 'yape' | 'plin' | 'transfer' | 'card' | 'credit' | 'mixed';

export interface SalePayment {
  method: PaymentMethod;
  amount: number;
}

export interface CartItem {
  productId: string;
  productName: string;
  presentation: ProductPresentation | string;
  quantity: number;
  unitPrice: number;
  discount: number;
  subtotal: number;
  batchId?: string;
  lotNumber?: string;
  isCustom?: boolean;
}

export interface Sale {
  id: string;
  number: string;
  date: string;
  userId: string;
  userName: string;
  customerId?: string;
  customerName?: string;
  items: CartItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  payments: SalePayment[];
  cashRegisterId: string;
  status: 'completed' | 'voided' | 'returned';
  notes?: string;
}

export interface Return {
  id: string;
  saleId: string;
  saleNumber: string;
  date: string;
  userId: string;
  userName: string;
  items: CartItem[];
  total: number;
  reason: string;
  type: 'full' | 'partial';
}

export interface CashRegister {
  id: string;
  userId: string;
  userName: string;
  openedAt: string;
  closedAt?: string;
  initialAmount: number;
  status: 'open' | 'closed';
}

export type CashMovementType = 'income' | 'expense' | 'withdrawal' | 'refund';

export interface CashMovement {
  id: string;
  cashRegisterId: string;
  type: CashMovementType;
  amount: number;
  description: string;
  userId: string;
  userName: string;
  createdAt: string;
}

export interface CashClosure {
  id: string;
  cashRegisterId: string;
  date: string;
  userId: string;
  userName: string;
  initialAmount: number;
  cashSales: number;
  yapeSales: number;
  plinSales: number;
  cardSales: number;
  transferSales: number;
  creditSales: number;
  otherSales: number;
  manualIncome: number;
  expenses: number;
  withdrawals: number;
  returns: number;
  expectedAmount: number;
  countedAmount: number;
  difference: number;
  notes: string;
}

export interface Shift {
  id: string;
  userId: string;
  userName: string;
  date: string;
  startTime: string;
  endTime: string;
  status: 'scheduled' | 'active' | 'completed';
  notes: string;
  cashRegisterId?: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  entity: string;
  entityId: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  createdAt: string;
}

export interface CompanySettings {
  name: string;
  ruc: string;
  address: string;
  phone: string;
  email: string;
  logo?: string;
  currency: string;
  currencySymbol: string;
  taxRate: number;
  lowStockDays: number;
  expiryAlertDays: number;
  allowNegativeStock: boolean;
  requireCashRegister: boolean;
  printerType: 'thermal' | 'normal';
  allowPrintReceipt: boolean;
  allowDownloadPdfReceipt: boolean;
  autoPrintReceipt: boolean;
  enableSoundAlerts: boolean;
  allowCustomerDiscounts: boolean;
  quickSaleMode: boolean;
  salesTargetDaily: number;
  salesTargetMonthly: number;
}

export interface PayrollReminder {
  id: string;
  userId: string;
  userName: string;
  amount: number;
  dueDate: string;
  period: string;
  status: 'pending' | 'paid';
  notes?: string;
  createdAt: string;
}
