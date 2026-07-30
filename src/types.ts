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
  role: string;
  businessId?: string;
  status?: "Active" | "Inactive";
  disabled?: boolean;
  lastLogin?: string;
  createdDate?: string;
  customPermissions?: import("./types/rbac").Permission[];
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  businessId?: string;
  disabled: boolean;
  status?: "Active" | "Inactive";
  lastLogin?: string;
  createdDate?: string;
  customPermissions?: import("./types/rbac").Permission[];
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
  category: "Inventory Adjustment" | "User Authentication" | "Quotation Management" | "Product Catalog" | "Receipt & Sales" | "System Settings" | string;
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
  email?: string;
  address?: string;
}

export interface Supplier {
  id: string;
  name: string;
  companyName?: string;
  phone: string;
  email: string;
  address: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  disabled: boolean;
  status?: "Active" | "Inactive";
  lastLogin?: string;
  createdDate?: string;
  customPermissions?: import("./types/rbac").Permission[];
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
  customerPhone?: string;
  customerAddress?: string;
  date: string;
  expiryDate: string;
  lines: QuotationLine[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  discountRate: number;
  discountAmount: number;
  total: number;
  status: "Draft" | "Sent" | "Accepted" | "Rejected" | "Expired" | "Converted";
  invoiceId?: string;
  invoiceNumber?: string;
  isConverted?: boolean;
  notes?: string;
  createdByUid?: string;
  createdByName?: string;
  createdByEmail?: string;
  createdAt?: string;
  updatedByUid?: string;
  updatedByName?: string;
  updatedByEmail?: string;
  updatedAt?: string;
}

export interface InvoiceLine {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string; // INV-2026-000001
  quotationId?: string;
  quotationNumber?: string;
  customerId: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  customerAddress?: string;
  date: string;
  dueDate: string;
  lines: InvoiceLine[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  discountRate: number;
  discountAmount: number;
  total: number;
  amountPaid: number;
  outstandingBalance: number;
  status: "Draft" | "Issued" | "Partially Paid" | "Paid" | "Overdue" | "Cancelled" | "Void";
  notes?: string;
  termsAndConditions?: string;
  currency?: string;
  paymentIds?: string[];
  receiptNumbers?: string[];
  createdByUid?: string;
  createdByName?: string;
  createdByEmail?: string;
  createdAt?: string;
  updatedByUid?: string;
  updatedByName?: string;
  updatedByEmail?: string;
  updatedAt?: string;
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
  customerEmail?: string;
  customerPhone?: string;
  customerAddress?: string;
  date: string;
  lines: ReceiptLine[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  discountRate: number;
  discountAmount: number;
  total: number;
  paymentMethod?: "Cash" | "Bank Transfer" | "Mobile Money" | "Cheque" | "Card" | string;
  bankAccountId?: string;
  bankAccountName?: string;
  referenceNumber?: string;
  relatedInvoiceIds?: string[];
  notes?: string;
  createdBy?: string;
  createdByUid?: string;
  createdByName?: string;
  createdByEmail?: string;
  createdDate?: string;
  createdAt?: string;
  updatedByUid?: string;
  updatedByName?: string;
  updatedByEmail?: string;
  updatedAt?: string;
  approvedBy?: string;
  approvalStatus?: "Draft" | "Approved" | "Reversed";
  reversalReason?: string;
}

export interface CashBookEntry {
  id: string;
  date: string;
  referenceDoc: string; // Serialized doc e.g. RCP-2026-000001 or PV-2026-000001
  description: string;
  debit: number; // Income / Inflow
  credit: number; // Outflow / Expense
  runningBalance: number;
  category: string;
  createdBy: string;
  approvedBy?: string;
}

export interface BankAccount {
  id: string;
  accountName: string;
  accountNumber: string;
  bankName: string;
  branch?: string;
  currency: string;
  initialBalance: number;
  currentBalance: number;
  status: "Active" | "Inactive";
}

export interface BankLedgerEntry {
  id: string;
  bankAccountId: string;
  bankAccountName: string;
  date: string;
  referenceDoc: string;
  description: string;
  debit: number;
  credit: number;
  runningBalance: number;
  transactionType: "Deposit" | "EFT Payment" | "Transfer" | "Withdrawal" | "Bank Charge" | "Interest" | "Reversal";
  reconciliationStatus: "Pending" | "Reconciled";
  notes?: string;
  createdBy: string;
}

export interface PettyCashEntry {
  id: string;
  voucherRef: string;
  date: string;
  category: string;
  description: string;
  debit: number; // Replenishments
  credit: number; // Expenses
  runningBalance: number;
  paidTo?: string;
  approvedBy?: string;
  createdBy: string;
}

export interface PurchaseOrderItem {
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  receivedQuantity: number;
  unitCost: number;
  subtotal: number;
  taxRate: number;
  total: number;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string; // PO-2026-000001
  supplierId: string;
  supplierName: string;
  date: string;
  orderDate: string;
  expectedDeliveryDate: string;
  items: PurchaseOrderItem[];
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  status: "Draft" | "Approved" | "Ordered" | "Partially Received" | "Fulfilled" | "Completed" | "Cancelled";
  notes?: string;
  createdBy: string;
  createdDate: string;
  approvedBy?: string;
  approvalStatus?: "Draft" | "Approved" | "Cancelled";
}

export interface GoodsReceivedItem {
  productId: string;
  productName: string;
  sku: string;
  orderedQty: number;
  receivedQty: number;
  acceptedQty: number;
  rejectedQty: number;
  damagedQty: number;
  unitCost: number;
}

export interface GoodsReceivedNote {
  id: string;
  grnNumber: string; // GRN-2026-000001
  poId: string;
  poNumber: string;
  supplierId: string;
  supplierName: string;
  deliveryNoteNumber: string;
  date: string;
  dateReceived: string;
  receivedBy: string;
  receiverName: string;
  warehouseLocation: string;
  items: GoodsReceivedItem[];
  status: "Draft" | "Approved" | "Reversed";
  notes?: string;
  createdBy: string;
  createdDate: string;
  approvedBy?: string;
}

export interface PaymentVoucher {
  id: string;
  voucherNumber: string; // PV-2026-000001
  supplierId: string;
  supplierName: string;
  poId?: string;
  poNumber?: string;
  supplierInvoiceNo?: string;
  date: string;
  paymentDate: string;
  paymentMethod: "Cash" | "Bank Transfer" | "Mobile Money" | "Cheque" | "Card" | string;
  amount: number;
  currency: string;
  purpose: string;
  bankAccountId?: string;
  bankAccountName?: string;
  approvedBy?: string;
  paidBy: string;
  status: "Issued" | "Draft" | "Approved" | "Reversed";
  reversalReason?: string;
  notes?: string;
  createdBy: string;
  createdDate: string;
}

export interface DocumentSequenceConfig {
  id: string;
  documentType: string;
  bookType: "Receipt" | "PurchaseOrder" | "GoodsReceived" | "PaymentVoucher" | "Quotation" | string;
  prefix: string;
  financialYear: string; // e.g. "2026"
  includeYear: boolean;
  resetAnnually: boolean;
  nextNumber: number;
  paddingDigits: number;
  autoResetAnnual?: boolean;
}

export interface FinancialSummaryReport {
  totalReceipts: number;
  totalPayments: number;
  totalCashBalance: number;
  totalBankBalance: number;
  totalPettyCashBalance: number;
  cashBalance: number;
  bankBalance: number;
  pettyCashBalance: number;
  totalLiquidReserves: number;
  totalReceiptsCollected: number;
  totalReceiptsCount: number;
  totalDisbursements: number;
  totalPaymentVouchersCount: number;
  outstandingSupplierPayments: number;
  netCashFlow: number;
}

export interface StockAlertItem extends Product {
  alertSeverity: "OUT_OF_STOCK" | "CRITICAL" | "WARNING";
  stockDeficit: number;
  deficit?: number;
  suggestedRestock: number;
  effectiveThreshold: number;
  unit?: string;
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
  totalSuppliers?: number;
  lowStockProducts: number;
  company: string;
}

export interface RecentActivity {
  recentlyAddedProducts: Product[];
  recentlyCreatedQuotations: Quotation[];
  recentlyCreatedReceipts: Receipt[];
}
