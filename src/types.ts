export interface ExtractedLineItem {
  id: string;
  productName: string;
  sku?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  matchedProductId?: string;
  matchedProductName?: string;
  matchedProductCurrentStock?: number;
  isExistingProduct: boolean;
}

export interface DocumentAnalysisResult {
  documentType: "Invoice" | "Delivery Note" | "Receipt" | "Purchase Order" | "Inventory Sheet" | "General Document";
  vendorOrCustomerName?: string;
  documentNumber?: string;
  documentDate?: string;
  rawExtractedText: string;
  summary: string;
  lineItems: ExtractedLineItem[];
  subtotal?: number;
  tax?: number;
  totalAmount?: number;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: "Principal Admin" | "Staff";
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  costPrice: number;
  sellingPrice: number;
  quantity: number;
  minStock: number;
  maxStock?: number;
  reorderLevel?: number;
  reservedStock?: number;
  location: string;
  status: "In Stock" | "Low Stock" | "Out Of Stock";
  sku?: string;
  barcode?: string;
  brand?: string;
  supplierId?: string;
  supplierName?: string;
  warehouse?: string;
  branch?: string;
  createdDate?: string;
  lastSaleDate?: string;
}

export interface SystemLog {
  id: string;
  timestamp: string;
  category: "Inventory Adjustment" | "User Authentication" | "Quotation Management" | "Product Catalog" | "Receipt & Sales" | "System Settings";
  action: string;
  userEmail: string;
  userName: string;
  userRole: string;
  details: string;
  targetId?: string;
  ipAddress?: string;
  severity: "info" | "warning" | "danger" | "success";
}

export interface SystemLogsResponse {
  logs: SystemLog[];
  total: number;
  stats: {
    totalLogs: number;
    inventoryLogsCount: number;
    authLogsCount: number;
    quotationLogsCount: number;
    dangerActionsCount: number;
  };
}

export interface ValuationSummary {
  totalCost: number;
  totalSelling: number;
  expectedProfit: number;
}

export interface KpiCardData {
  title: string;
  value: number;
  formattedValue: string;
  prevValue: number;
  formattedPrevValue: string;
  changePct: number;
  isIncrease: boolean;
  isPositive: boolean; // whether an increase is good or bad
  colorTheme: "blue" | "emerald" | "amber" | "rose" | "indigo" | "purple" | "cyan" | "slate";
}

export interface ExecutiveSummaryData {
  totalProducts: KpiCardData;
  totalInventoryQuantity: KpiCardData;
  totalInventoryValue: KpiCardData;
  revenue: KpiCardData;
  grossProfit: KpiCardData;
  fastMovingCount: KpiCardData;
  slowMovingCount: KpiCardData;
  deadStockCount: KpiCardData;
  lowStockCount: KpiCardData;
  outOfStockCount: KpiCardData;
  inventoryTurnoverRate: KpiCardData;
}

export interface TrendPoint {
  date: string;
  label: string;
  salesVolume: number;
  revenue: number;
  cost: number;
  inventoryValue: number;
}

export interface CategoryPerformanceData {
  category: string;
  revenue: number;
  unitsSold: number;
  inventoryValue: number;
  productCount: number;
}

export interface ProductPerformanceItem {
  id: string;
  name: string;
  sku: string;
  category: string;
  brand: string;
  supplierName: string;
  warehouse: string;
  branch: string;
  currentStock: number;
  reservedStock: number;
  minStock: number;
  maxStock: number;
  reorderLevel: number;
  costPrice: number;
  sellingPrice: number;
  unitsSold: number;
  revenue: number;
  cogs: number;
  grossProfit: number;
  profitMargin: number;
  avgDailySales: number;
  avgMonthlySales: number;
  lastSaleDate: string;
  daysSinceLastSale: number;
  healthStatus: "Healthy" | "Low Stock" | "Critical Stock" | "Overstocked" | "Out of Stock";
  abcCategory: "A" | "B" | "C";
  ageDays: number;
  ageBracket: "0-30 days" | "31-60 days" | "61-90 days" | "91-180 days" | "Over 180 days";
}

export interface PurchaseHistoryItem {
  id: string;
  poNumber: string;
  supplierName: string;
  date: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  warehouse: string;
  status: "Completed" | "Received" | "Pending";
}

export interface SalesHistoryItem {
  id: string;
  receiptNumber: string;
  customerName: string;
  date: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  branch: string;
}

export interface StockMovementItem {
  id: string;
  date: string;
  type: "Sale" | "Purchase" | "Adjustment" | "Transfer" | "Return";
  quantityChange: number;
  reference: string;
  warehouse: string;
  user: string;
  notes?: string;
}

export interface DetailedProductView {
  product: ProductPerformanceItem;
  purchaseHistory: PurchaseHistoryItem[];
  salesHistory: SalesHistoryItem[];
  stockMovementHistory: StockMovementItem[];
}

export interface FastSlowMovingData {
  fastMoving: ProductPerformanceItem[];
  slowMoving: ProductPerformanceItem[];
  deadStock: ProductPerformanceItem[];
  deadStockThresholdDays: number;
}

export interface StockHealthSummaryData {
  healthyCount: number;
  lowStockCount: number;
  criticalStockCount: number;
  overstockedCount: number;
  outOfStockCount: number;
  totalProductsCount: number;
  healthBreakdown: Array<{
    status: "Healthy" | "Low Stock" | "Critical Stock" | "Overstocked" | "Out of Stock";
    count: number;
    percentage: number;
    inventoryValue: number;
  }>;
}

export interface InventoryTurnoverData {
  currentTurnover: number;
  previousTurnover: number;
  changePct: number;
  cogs: number;
  avgInventoryValue: number;
}

export interface AbcAnalysisData {
  categoryA: {
    count: number;
    revenue: number;
    revenuePct: number;
    inventoryValue: number;
    products: Array<{ name: string; revenue: number; pct: number }>;
  };
  categoryB: {
    count: number;
    revenue: number;
    revenuePct: number;
    inventoryValue: number;
    products: Array<{ name: string; revenue: number; pct: number }>;
  };
  categoryC: {
    count: number;
    revenue: number;
    revenuePct: number;
    inventoryValue: number;
    products: Array<{ name: string; revenue: number; pct: number }>;
  };
}

export interface InventoryAgeBracketData {
  bracket: "0-30 days" | "31-60 days" | "61-90 days" | "91-180 days" | "Over 180 days";
  quantity: number;
  inventoryValue: number;
  percentage: number;
  productCount: number;
}

export interface InventoryAnalyticsData {
  turnover: InventoryTurnoverData;
  abcAnalysis: AbcAnalysisData;
  ageDistribution: InventoryAgeBracketData[];
}

export interface InsightsFilterParams {
  dateRange?: string; // "today" | "7d" | "30d" | "90d" | "year" | "custom"
  startDate?: string;
  endDate?: string;
  category?: string;
  supplier?: string;
  warehouse?: string;
  branch?: string;
  brand?: string;
  search?: string;
  deadStockDays?: number; // 30, 60, 90, 180
}

export interface InventoryInsightsResponse {
  filters: InsightsFilterParams;
  availableCategories: string[];
  availableSuppliers: string[];
  availableWarehouses: string[];
  availableBranches: string[];
  availableBrands: string[];
  executiveSummary: ExecutiveSummaryData;
  salesTrend: TrendPoint[];
  categoryPerformance: CategoryPerformanceData[];
  productPerformance: ProductPerformanceItem[];
  fastSlowMoving: FastSlowMovingData;
  stockHealth: StockHealthSummaryData;
  analytics: InventoryAnalyticsData;
  productProfitability: ProductPerformanceItem[];
}

export interface CompanySettings {
  companyName: string;
  companySubtitle: string;
  tagline: string;
  logoUrl?: string;
  logoInitials?: string;
  streetAddress?: string;
  city?: string;
  country?: string;
  address: string;
  email: string;
  phone: string;
  tel?: string;
  mobile?: string;
  mobile2?: string;
  vatNumber: string;
  enableVat?: boolean;
  taxRate?: number;
  tinNumber?: string;
  registrationNumber: string;
  bankName?: string;
  accountName?: string;
  accountNumber?: string;
  ecocashNumber?: string;
  currency?: string;
  salesType?: string;
  doneBy?: string;
  pdfHeaderColor: string;
  footerTerms: string;
  quotationStyle?: "minimalist_authentic" | "corporate_modern";
}

export interface ProductResponse {
  products: Product[];
  valuation: ValuationSummary;
}

export interface Customer {
  id: string;
  name: string;
  type: "Individual" | "School" | "Shop" | "Company";
  phone: string;
  email: string;
  address: string;
}

export interface Supplier {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: "Principal Admin" | "Staff";
  disabled: boolean;
}

export interface QuotationLine {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface Quotation {
  id: string;
  quotationNumber: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  date: string;
  expiryDate: string;
  lines: QuotationLine[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  discountRate: number;
  discountAmount: number;
  total: number;
  status: "Draft" | "Sent" | "Accepted" | "Rejected" | "Expired";
  notes?: string;
}

export interface ReceiptLine {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface Receipt {
  id: string;
  receiptNumber: string;
  customerId: string;
  customerName: string;
  date: string;
  lines: ReceiptLine[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  discountRate: number;
  discountAmount: number;
  total: number;
}

export interface StockAlertItem extends Product {
  alertSeverity: "OUT_OF_STOCK" | "CRITICAL" | "WARNING";
  stockDeficit: number;
  suggestedRestock: number;
  effectiveThreshold: number;
}

export interface InventoryAlertsResponse {
  summary: {
    totalAlerts: number;
    outOfStockCount: number;
    criticalCount: number;
    warningCount: number;
    totalDeficitUnits: number;
  };
  alerts: StockAlertItem[];
}

export interface DashboardSummary {
  totalProducts: number;
  totalCustomers: number;
  totalQuotations: number;
  totalReceipts: number;
  lowStockProducts: number;
  company: string;
}

export interface RecentActivity {
  recentlyAddedProducts: Product[];
  recentlyCreatedQuotations: Quotation[];
  recentlyCreatedReceipts: Receipt[];
}
