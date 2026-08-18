import type {
  User, Product, ProductBatch, Supplier, Customer, Sale,
  Purchase, CashRegister, CashMovement, CashClosure,
  InventoryMovement, AuditLog, CompanySettings
} from '../types';

export const mockUsers: User[] = [
  { id: 'u1', name: 'Dr. Carlos Mendoza', email: 'admin@farmacia.pe', role: 'admin', active: true, createdAt: '2024-01-01', lastLogin: '2025-08-16T08:30:00' },
  { id: 'u2', name: 'Ana García', email: 'ana@farmacia.pe', role: 'pharmacist', active: true, createdAt: '2024-02-15', lastLogin: '2025-08-16T07:45:00' },
  { id: 'u3', name: 'Luis Torres', email: 'luis@farmacia.pe', role: 'seller', active: true, createdAt: '2024-03-10', lastLogin: '2025-08-15T18:00:00' },
  { id: 'u4', name: 'María Quispe', email: 'maria@farmacia.pe', role: 'auditor', active: true, createdAt: '2024-04-01', lastLogin: '2025-08-14T10:00:00' },
  { id: 'u5', name: 'Pedro Salas', email: 'pedro@farmacia.pe', role: 'seller', active: false, createdAt: '2024-05-20', lastLogin: '2025-07-30T16:00:00' },
];

export const mockProducts: Product[] = [
  {
    id: 'p1', code: 'MED001', barcode: '7501234567001',
    name: 'Paracetamol 500mg', commercialName: 'Panadol', activeIngredient: 'Paracetamol',
    laboratory: 'GlaxoSmithKline', category: 'Analgésicos', subcategory: 'AINES',
    presentation: 'box', tipoPresentacion: 'Tableta', unidadBase: 'Unidad',
    unidadesVenta: [
      { nombre: 'Unidad', cantidadBase: 1, precioVenta: 0.30 },
      { nombre: 'Blíster', cantidadBase: 10, precioVenta: 2.80 },
      { nombre: 'Caja', cantidadBase: 100, precioVenta: 26.00 }
    ],
    concentration: '500mg', pharmaceuticalForm: 'Tableta',
    unitMeasure: 'Tableta', description: 'Analgésico y antipirético de amplio uso.',
    active: true, units: { unitsPerBlister: 10, blistersPerBox: 10, unitsPerBox: 100 },
    purchasePrice: 8.50, salePriceUnit: 0.30, salePriceBlister: 2.80, salePriceBox: 26.00,
    minStock: 50, createdAt: new Date().toISOString().split('T')[0],
    priceHistory: [],
  }
];

export const mockBatches: ProductBatch[] = [
  { id: 'b1', productId: 'p1', lotNumber: 'LOT-2025-001', expiryDate: '2027-12-31', entryDate: new Date().toISOString().split('T')[0], quantity: 200, costPrice: 8.50, supplierId: '' }
];
export const mockSuppliers: Supplier[] = [];
export const mockCustomers: Customer[] = [];
export const mockSales: Sale[] = [];
export const mockPurchases: Purchase[] = [];

export const mockCashRegister: CashRegister = {
  id: 'cr1', userId: 'u1', userName: 'Dr. Carlos Mendoza',
  openedAt: new Date().toISOString(), initialAmount: 0, status: 'open',
};

export const mockCashMovements: CashMovement[] = [];
export const mockMovements: InventoryMovement[] = [];
export const mockAuditLogs: AuditLog[] = [];

export const mockCompanySettings: CompanySettings = {
  name: 'Farmacia San Miguel',
  ruc: '20123456789',
  address: 'Av. San Martín 456, Lima - Perú',
  phone: '01-234-5678',
  email: 'contacto@farmaciasanmiguel.pe',
  currency: 'PEN',
  currencySymbol: 'S/',
  taxRate: 0,
  lowStockDays: 30,
  expiryAlertDays: 60,
  allowNegativeStock: false,
  requireCashRegister: true,
  printerType: 'thermal',
  allowPrintReceipt: true,
  allowDownloadPdfReceipt: true,
  autoPrintReceipt: false,
  enableSoundAlerts: true,
  allowCustomerDiscounts: true,
  quickSaleMode: false,
  salesTargetDaily: 500,
  salesTargetMonthly: 15000,
};

// Computed inventory data
export const getInventoryStock = (productId: string): number => {
  return mockBatches
    .filter(b => b.productId === productId)
    .reduce((sum, b) => sum + b.quantity, 0);
};

export const getDashboardStats = () => {
  const today = '2025-08-16';
  const todaySales = mockSales.filter(s => s.date.startsWith(today) && s.status === 'completed');
  const todayRevenue = todaySales.reduce((sum, s) => sum + s.total, 0);
  const todayCost = todaySales.reduce((sum, s) => s.items.reduce((acc, item) => {
    const product = mockProducts.find(p => p.id === item.productId);
    return acc + (product ? product.purchasePrice * item.quantity * 0.1 : 0);
  }, sum), 0);

  const now = new Date('2025-08-16');
  const alertDays = mockCompanySettings.expiryAlertDays;
  const alertDate = new Date(now);
  alertDate.setDate(alertDate.getDate() + alertDays);

  const expiringSoon = mockBatches.filter(b => {
    const expiry = new Date(b.expiryDate);
    return expiry <= alertDate && expiry >= now && b.quantity > 0;
  }).length;

  const expired = mockBatches.filter(b => {
    const expiry = new Date(b.expiryDate);
    return expiry < now && b.quantity > 0;
  }).length;

  const lowStock = mockProducts.filter(p => {
    const stock = getInventoryStock(p.id);
    return stock <= p.minStock && stock > 0;
  }).length;

  const outOfStock = mockProducts.filter(p => getInventoryStock(p.id) === 0).length;

  return { todayRevenue, todaySales: todaySales.length, expiringSoon, expired, lowStock, outOfStock, todayCost };
};

export const salesChartData = [
  { day: 'Lun 11', ventas: 820, ganancia: 280 },
  { day: 'Mar 12', ventas: 1240, ganancia: 420 },
  { day: 'Mié 13', ventas: 680, ganancia: 230 },
  { day: 'Jue 14', ventas: 1580, ganancia: 540 },
  { day: 'Vie 15', ventas: 1120, ganancia: 380 },
  { day: 'Sáb 16', ventas: 335.60, ganancia: 118 },
];

export const topProducts = [
  { name: 'Paracetamol 500mg', units: 340, revenue: 102.00 },
  { name: 'Metformina 850mg', units: 200, revenue: 120.00 },
  { name: 'Losartán 50mg', units: 112, revenue: 205.00 },
  { name: 'Omeprazol 20mg', units: 98, revenue: 147.00 },
  { name: 'Ibuprofeno 400mg', units: 90, revenue: 40.50 },
];

export const categoryData = [
  { name: 'Analgésicos', value: 35 },
  { name: 'Cardiovascular', value: 25 },
  { name: 'Diabetes', value: 18 },
  { name: 'Antibióticos', value: 12 },
  { name: 'Otros', value: 10 },
];
