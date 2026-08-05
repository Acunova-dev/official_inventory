import axios from "axios";
import { auth, db } from "../lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { 
  productService as fsProductService,
  customerService as fsCustomerService,
  supplierService as fsSupplierService,
  categoryService as fsCategoryService,
  quotationService as fsQuotationService,
  invoiceService as fsInvoiceService,
  receiptService as fsReceiptService,
  dashboardService as fsDashboardService,
  systemLogService as fsSystemLogService,
  settingsService as fsSettingsService,
  userService as fsUserService,
  purchasingService as fsPurchasingService,
  financialService as fsFinancialService,
} from "./firestoreApi";
import { 
  Product, 
  ProductCategory,
  ProductResponse, 
  Customer, 
  Supplier, 
  User, 
  Quotation, 
  Invoice,
  InvoiceLine,
  Receipt, 
  DashboardSummary, 
  RecentActivity,
  InventoryAlertsResponse,
  CompanySettings,
  SystemLogsResponse,
  SystemLog,
  PurchaseOrder,
  GoodsReceivedNote,
  DocumentAnalysisResult,
  CashBookEntry,
  BankAccount,
  BankLedgerEntry,
  PettyCashEntry,
  PaymentVoucher,
  DocumentSequenceConfig,
  FinancialSummaryReport
} from "../types";

// Axios instance for server-side AI endpoints (Gemini Assist, Document OCR)
const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || "/api/v1";
export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" }
});

// Helper to resolve current authenticated user's business ID
export async function getActiveBusinessId(): Promise<string> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    return "biz-anonymous";
  }
  try {
    const userDoc = await getDoc(doc(db, "users", currentUser.uid));
    if (userDoc.exists() && userDoc.data()?.businessId) {
      return userDoc.data().businessId;
    }
  } catch (err) {
    console.warn("Could not retrieve businessId from Firestore, using default:", err);
  }
  return `biz-${currentUser.uid}`;
}

// -------------------------------------------------------------
// DASHBOARD SERVICE
// -------------------------------------------------------------
export const dashboardService = {
  getSummary: async (): Promise<DashboardSummary> => {
    const bId = await getActiveBusinessId();
    return fsDashboardService.getSummary(bId);
  },
  getActivity: async (): Promise<RecentActivity> => {
    const bId = await getActiveBusinessId();
    return fsDashboardService.getActivity(bId);
  },
  getAlerts: async (params?: { multiplier?: number }): Promise<InventoryAlertsResponse> => {
    const bId = await getActiveBusinessId();
    return fsDashboardService.getAlerts(bId, params);
  },
};

// -------------------------------------------------------------
// PRODUCT SERVICE
// -------------------------------------------------------------
export const productService = {
  getAll: async (params?: { search?: string; status?: string; sortBy?: string; order?: string }): Promise<ProductResponse> => {
    const bId = await getActiveBusinessId();
    return fsProductService.getAll(bId, params);
  },
  getOne: async (id: string): Promise<Product> => {
    const bId = await getActiveBusinessId();
    return fsProductService.getOne(bId, id);
  },
  create: async (data: Omit<Product, "id" | "status">): Promise<Product> => {
    const bId = await getActiveBusinessId();
    const userName = auth.currentUser?.displayName || auth.currentUser?.email || "Admin";
    return fsProductService.create(bId, data, userName);
  },
  update: async (id: string, data: Partial<Product>): Promise<Product> => {
    const bId = await getActiveBusinessId();
    const userName = auth.currentUser?.displayName || auth.currentUser?.email || "Admin";
    return fsProductService.update(bId, id, data, userName);
  },
  delete: async (id: string): Promise<{ message: string; product: Product }> => {
    const bId = await getActiveBusinessId();
    const userName = auth.currentUser?.displayName || auth.currentUser?.email || "Admin";
    return fsProductService.delete(bId, id, userName);
  },
  restock: async (id: string, data: { addQuantity: number; newMinStock?: number }): Promise<{ message: string; product: Product }> => {
    const bId = await getActiveBusinessId();
    const userName = auth.currentUser?.displayName || auth.currentUser?.email || "Admin";
    return fsProductService.restock(bId, id, data, userName);
  },
  batchDelete: async (ids: string[]): Promise<{ message: string; deletedCount: number }> => {
    const bId = await getActiveBusinessId();
    return fsProductService.batchDelete(bId, ids);
  },
  batchUpdateStock: async (data: { ids: string[]; mode: "set" | "add" | "minStock"; value: number }): Promise<{ message: string; updatedCount: number }> => {
    const bId = await getActiveBusinessId();
    return fsProductService.batchUpdateStock(bId, data);
  },
};

// -------------------------------------------------------------
// CATEGORY SERVICE
// -------------------------------------------------------------
export const categoryService = {
  getAll: async (): Promise<ProductCategory[]> => {
    const bId = await getActiveBusinessId();
    return fsCategoryService.getAll(bId);
  },
  create: async (data: { name: string; description?: string; status?: "Active" | "Inactive" }): Promise<ProductCategory> => {
    const bId = await getActiveBusinessId();
    const userName = auth.currentUser?.displayName || auth.currentUser?.email || "Admin";
    return fsCategoryService.create(bId, data, userName);
  },
  update: async (id: string, data: { name: string; description?: string; status?: "Active" | "Inactive" }): Promise<ProductCategory> => {
    const bId = await getActiveBusinessId();
    const userName = auth.currentUser?.displayName || auth.currentUser?.email || "Admin";
    return fsCategoryService.update(bId, id, data, userName);
  },
  delete: async (id: string): Promise<void> => {
    const bId = await getActiveBusinessId();
    const userName = auth.currentUser?.displayName || auth.currentUser?.email || "Admin";
    return fsCategoryService.delete(bId, id, userName);
  },
  reassignAndDelete: async (categoryIdToDelete: string, targetCategoryId: string, targetCategoryName: string): Promise<void> => {
    const bId = await getActiveBusinessId();
    const userName = auth.currentUser?.displayName || auth.currentUser?.email || "Admin";
    return fsCategoryService.reassignAndDelete(bId, categoryIdToDelete, targetCategoryId, targetCategoryName, userName);
  },
};

// -------------------------------------------------------------
// CUSTOMER SERVICE
// -------------------------------------------------------------
export const customerService = {
  getAll: async (search?: string): Promise<Customer[]> => {
    const bId = await getActiveBusinessId();
    return fsCustomerService.getAll(bId, search);
  },
  create: async (data: Omit<Customer, "id">): Promise<Customer> => {
    const bId = await getActiveBusinessId();
    return fsCustomerService.create(bId, data);
  },
  update: async (id: string, data: Partial<Customer>): Promise<Customer> => {
    const bId = await getActiveBusinessId();
    return fsCustomerService.update(bId, id, data);
  },
  delete: async (id: string): Promise<any> => {
    const bId = await getActiveBusinessId();
    return fsCustomerService.delete(bId, id);
  },
};

// -------------------------------------------------------------
// SUPPLIER SERVICE
// -------------------------------------------------------------
export const supplierService = {
  getAll: async (): Promise<Supplier[]> => {
    const bId = await getActiveBusinessId();
    return fsSupplierService.getAll(bId);
  },
  create: async (data: Omit<Supplier, "id">): Promise<Supplier> => {
    const bId = await getActiveBusinessId();
    return fsSupplierService.create(bId, data);
  },
  update: async (id: string, data: Partial<Supplier>): Promise<Supplier> => {
    const bId = await getActiveBusinessId();
    return fsSupplierService.update(bId, id, data);
  },
  delete: async (id: string): Promise<any> => {
    const bId = await getActiveBusinessId();
    return fsSupplierService.delete(bId, id);
  },
};

// -------------------------------------------------------------
// QUOTATION SERVICE
// -------------------------------------------------------------
export const quotationService = {
  getAll: async (): Promise<Quotation[]> => {
    const bId = await getActiveBusinessId();
    return fsQuotationService.getAll(bId);
  },
  calculate: async (payload: {
    items: Array<{ productId: string; quantity: number; unitPrice?: number }>;
    discountRate: number;
    taxRate?: number;
    include_terms_conditions?: boolean;
    includeTermsConditions?: boolean;
    include_import_costs?: boolean;
    includeImportCosts?: boolean;
    total_import_costs?: number;
    totalImportCosts?: number;
    allowZiGPayments?: boolean;
    allow_zig_payments?: boolean;
    interbankRate?: number;
    interbank_rate?: number;
    streetRate?: number;
    street_rate?: number;
  }): Promise<Omit<Quotation, "id" | "quotationNumber" | "customerId" | "customerName" | "customerEmail" | "date" | "expiryDate" | "status">> => {
    return fsQuotationService.calculate(payload);
  },
  create: async (payload: {
    customerId: string;
    customerName?: string;
    customerEmail?: string;
    customerPhone?: string;
    customerAddress?: string;
    items: Array<{ productId: string; quantity: number }>;
    discountRate: number;
    taxRate?: number;
    notes?: string;
    status?: string;
    include_terms_conditions?: boolean;
    includeTermsConditions?: boolean;
    include_import_costs?: boolean;
    includeImportCosts?: boolean;
    total_import_costs?: number;
    totalImportCosts?: number;
    allowZiGPayments?: boolean;
    allow_zig_payments?: boolean;
    interbankRate?: number;
    interbank_rate?: number;
    streetRate?: number;
    street_rate?: number;
  }): Promise<Quotation> => {
    const bId = await getActiveBusinessId();
    return fsQuotationService.create(bId, payload);
  },
  getOne: async (id: string): Promise<Quotation> => {
    const bId = await getActiveBusinessId();
    return fsQuotationService.getOne(bId, id);
  },
  update: async (id: string, payload: Partial<Quotation> & {
    items?: Array<{ productId: string; quantity: number }>;
    include_terms_conditions?: boolean;
    includeTermsConditions?: boolean;
    include_import_costs?: boolean;
    includeImportCosts?: boolean;
    total_import_costs?: number;
    totalImportCosts?: number;
    allowZiGPayments?: boolean;
    allow_zig_payments?: boolean;
    interbankRate?: number;
    interbank_rate?: number;
    streetRate?: number;
    street_rate?: number;
  }): Promise<Quotation> => {
    const bId = await getActiveBusinessId();
    return fsQuotationService.update(bId, id, payload);
  },
  delete: async (id: string): Promise<any> => {
    const bId = await getActiveBusinessId();
    return fsQuotationService.delete(bId, id);
  },
  convertToInvoice: async (id: string): Promise<Invoice> => {
    const bId = await getActiveBusinessId();
    return fsQuotationService.convertQuotationToInvoice(bId, id);
  }
};

// -------------------------------------------------------------
// INVOICE SERVICE
// -------------------------------------------------------------
export const invoiceService = {
  getAll: async (): Promise<Invoice[]> => {
    const bId = await getActiveBusinessId();
    return fsInvoiceService.getAll(bId);
  },
  getOne: async (id: string): Promise<Invoice> => {
    const bId = await getActiveBusinessId();
    return fsInvoiceService.getOne(bId, id);
  },
  create: async (payload: {
    customerId: string;
    customerName?: string;
    customerEmail?: string;
    customerPhone?: string;
    customerAddress?: string;
    quotationId?: string;
    quotationNumber?: string;
    dueDate?: string;
    items: Array<{ productId: string; quantity: number }>;
    discountRate: number;
    taxRate?: number;
    notes?: string;
    termsAndConditions?: string;
    status?: Invoice["status"];
  }): Promise<Invoice> => {
    const bId = await getActiveBusinessId();
    return fsInvoiceService.create(bId, payload);
  },
  update: async (id: string, payload: Partial<Invoice>): Promise<Invoice> => {
    const bId = await getActiveBusinessId();
    return fsInvoiceService.update(bId, id, payload);
  },
  convertQuotation: async (quotationId: string): Promise<Invoice> => {
    const bId = await getActiveBusinessId();
    return fsInvoiceService.convertQuotationToInvoice(bId, quotationId);
  },
  generateReceipt: async (payload: {
    invoiceId: string;
    amountReceived: number;
    paymentMethod: string;
    bankAccountId?: string;
    paymentDate?: string;
    referenceNumber?: string;
    notes?: string;
  }): Promise<{ receipt: Receipt; invoice: Invoice }> => {
    const bId = await getActiveBusinessId();
    return fsInvoiceService.generateReceiptFromInvoice(bId, payload);
  }
};

// -------------------------------------------------------------
// RECEIPT SERVICE
// -------------------------------------------------------------
export const receiptService = {
  getAll: async (): Promise<Receipt[]> => {
    const bId = await getActiveBusinessId();
    return fsReceiptService.getAll(bId);
  },
  calculate: async (payload: { items: Array<{ productId: string; quantity: number }>; discountRate: number; taxRate?: number }): Promise<Omit<Receipt, "id" | "receiptNumber" | "customerId" | "customerName" | "date">> => {
    return fsReceiptService.calculate(payload);
  },
  create: async (payload: { customerId: string; customerName?: string; customerEmail?: string; customerPhone?: string; customerAddress?: string; items: Array<{ productId: string; quantity: number }>; discountRate: number; taxRate?: number; paymentMethod?: string; bankAccountId?: string; referenceNumber?: string; notes?: string }): Promise<Receipt> => {
    const bId = await getActiveBusinessId();
    const userName = auth.currentUser?.displayName || auth.currentUser?.email || "Cashier";
    return fsReceiptService.create(bId, payload, userName);
  },
  getOne: async (id: string): Promise<Receipt> => {
    const bId = await getActiveBusinessId();
    return fsReceiptService.getOne(bId, id);
  },
  reverse: async (id: string, reason: string): Promise<Receipt> => {
    const bId = await getActiveBusinessId();
    const userName = auth.currentUser?.displayName || auth.currentUser?.email || "Admin";
    return fsReceiptService.reverse(bId, id, reason, userName);
  }
};

// -------------------------------------------------------------
// FINANCIAL SERVICE (CashBook, Banks, Transfers, Summary)
// -------------------------------------------------------------
export const financialService = {
  getCashBook: async (): Promise<CashBookEntry[]> => {
    const bId = await getActiveBusinessId();
    return fsFinancialService.getCashBook(bId);
  },
  createCashAdjustment: async (payload: { type: "Debit" | "Credit"; amount: number; category?: string; description?: string; date?: string; referenceDoc?: string; customerId?: string; supplierId?: string; paymentMethod?: string }): Promise<CashBookEntry> => {
    const bId = await getActiveBusinessId();
    return fsFinancialService.createCashAdjustment(bId, payload);
  },
  getBankAccounts: async (): Promise<BankAccount[]> => {
    const bId = await getActiveBusinessId();
    return fsFinancialService.getBankAccounts(bId);
  },
  createBankAccount: async (payload: { accountName: string; accountNumber: string; bankName: string; branch?: string; initialBalance?: number; currency?: string }): Promise<BankAccount> => {
    const bId = await getActiveBusinessId();
    return fsFinancialService.createBankAccount(bId, payload);
  },
  getBankLedger: async (accountId: string): Promise<BankLedgerEntry[]> => {
    const bId = await getActiveBusinessId();
    return fsFinancialService.getBankLedger(bId, accountId);
  },
  recordBankTransaction: async (payload: { bankAccountId: string; type: "Deposit" | "Withdrawal" | "EFT Payment" | "Transfer" | "Bank Charge" | "Interest" | "Reversal"; amount: number; description: string; referenceDoc?: string; date?: string }): Promise<BankLedgerEntry> => {
    const bId = await getActiveBusinessId();
    return fsFinancialService.recordBankTransaction(bId, payload);
  },
  transferFunds: async (payload: { fromType: "Bank" | "Cash"; fromId?: string; toType: "Bank" | "Cash"; toId?: string; amount: number; description?: string }) => {
    const bId = await getActiveBusinessId();
    return fsFinancialService.transferFunds(bId, payload);
  },
  getPettyCash: async (): Promise<PettyCashEntry[]> => [],
  createPettyExpense: async (payload: any): Promise<PettyCashEntry> => ({ id: `petty-${Date.now()}`, voucherRef: `PV-${Date.now()}`, date: new Date().toISOString(), category: payload.category || "General", description: payload.description || "", debit: 0, credit: payload.amount || 0, runningBalance: 500, paidTo: payload.paidTo || "", createdBy: "Admin" }),
  replenishPettyCash: async (payload: any): Promise<PettyCashEntry> => ({ id: `petty-${Date.now()}`, voucherRef: `PV-${Date.now()}`, date: new Date().toISOString(), category: "Replenishment", description: "Replenished petty cash", debit: payload.amount || 0, credit: 0, runningBalance: 1000, paidTo: "Custodian", createdBy: "Admin" }),
  getPaymentVouchers: async (): Promise<PaymentVoucher[]> => [],
  createPaymentVoucher: async (payload: any): Promise<PaymentVoucher> => ({ id: `pv-${Date.now()}`, voucherNumber: `PV-${Date.now().toString().slice(-6)}`, supplierId: payload.supplierId, supplierName: "Supplier", date: new Date().toISOString().split("T")[0], paymentDate: new Date().toISOString().split("T")[0], paymentMethod: payload.paymentMethod || "Cash", amount: payload.amount, currency: "$", purpose: "Vendor Payment", paidBy: "Admin", status: "Issued", createdBy: "Admin", createdDate: new Date().toISOString() }),
  reversePaymentVoucher: async (id: string, reason: string): Promise<PaymentVoucher> => ({ id, voucherNumber: id, supplierId: "sup-1", supplierName: "Supplier", date: new Date().toISOString().split("T")[0], paymentDate: new Date().toISOString().split("T")[0], paymentMethod: "Cash", amount: 0, currency: "$", purpose: "Reversal", paidBy: "Admin", status: "Reversed", reversalReason: reason, createdBy: "Admin", createdDate: new Date().toISOString() }),
  getNumberingSequences: async (): Promise<DocumentSequenceConfig[]> => [],
  updateNumberingSequences: async (sequences: DocumentSequenceConfig[]) => ({ success: true }),
  getSummary: async (): Promise<FinancialSummaryReport> => {
    const bId = await getActiveBusinessId();
    return fsFinancialService.getSummary(bId);
  }
};

// -------------------------------------------------------------
// PURCHASING SERVICE
// -------------------------------------------------------------
export const purchasingService = {
  getOrders: async (): Promise<PurchaseOrder[]> => {
    const bId = await getActiveBusinessId();
    return fsPurchasingService.getOrders(bId);
  },
  createOrder: async (payload: { supplierId: string; supplierName?: string; supplierEmail?: string; supplierPhone?: string; supplierAddress?: string; expectedDeliveryDate?: string; items: Array<{ productId: string; productName?: string; sku?: string; quantity: number; unitCost?: number }>; notes?: string }): Promise<PurchaseOrder> => {
    const bId = await getActiveBusinessId();
    const userName = auth.currentUser?.displayName || auth.currentUser?.email || "Purchasing Agent";
    return fsPurchasingService.createOrder(bId, payload, userName);
  },
  approveOrder: async (id: string): Promise<PurchaseOrder> => {
    const bId = await getActiveBusinessId();
    return fsPurchasingService.approveOrder(bId, id);
  },
  getGoodsReceived: async (): Promise<GoodsReceivedNote[]> => {
    const bId = await getActiveBusinessId();
    return fsPurchasingService.getGoodsReceived(bId);
  },
  createGoodsReceived: async (payload: { poId: string; deliveryNoteNumber?: string; warehouseLocation?: string; items: Array<{ productId: string; receivedQty: number; acceptedQty?: number; rejectedQty?: number; damagedQty?: number }>; notes?: string }): Promise<GoodsReceivedNote> => {
    const bId = await getActiveBusinessId();
    const userName = auth.currentUser?.displayName || auth.currentUser?.email || "Warehouse";
    return fsPurchasingService.createGoodsReceived(bId, payload, userName);
  }
};

// -------------------------------------------------------------
// USER MANAGEMENT SERVICE
// -------------------------------------------------------------
export const userService = {
  getAll: async (): Promise<User[]> => {
    const bId = await getActiveBusinessId();
    return fsUserService.getAll(bId);
  },
  create: async (data: Omit<User, "id" | "disabled">): Promise<User> => {
    const bId = await getActiveBusinessId();
    return fsUserService.create(bId, data);
  },
  update: async (id: string, data: Partial<User>): Promise<User> => {
    const bId = await getActiveBusinessId();
    return fsUserService.update(bId, id, data);
  },
};

// -------------------------------------------------------------
// SETTINGS SERVICE
// -------------------------------------------------------------
export const settingsService = {
  get: async (): Promise<CompanySettings> => {
    const bId = await getActiveBusinessId();
    return fsSettingsService.get(bId);
  },
  update: async (data: Partial<CompanySettings>): Promise<CompanySettings> => {
    const bId = await getActiveBusinessId();
    return fsSettingsService.update(bId, data);
  },
};

// -------------------------------------------------------------
// INVENTORY INSIGHTS SERVICE
// -------------------------------------------------------------
export const inventoryInsightsService = {
  getInsights: async (params?: any): Promise<import("../types").InventoryInsightsResponse> => {
    const productsRes = await productService.getAll();
    const prods = productsRes.products;

    const categories = Array.from(new Set(prods.map(p => p.category).filter(Boolean)));
    const suppliers = Array.from(new Set(prods.map(p => p.supplierName).filter(Boolean))) as string[];
    const warehouses = Array.from(new Set(prods.map(p => p.warehouse || p.location).filter(Boolean)));
    const branches = Array.from(new Set(prods.map(p => p.branch).filter(Boolean))) as string[];
    const brands = Array.from(new Set(prods.map(p => p.brand).filter(Boolean))) as string[];

    const makeKpi = (title: string, value: number, formattedValue: string, theme: any): import("../types").KpiCardData => ({
      title,
      value,
      formattedValue,
      prevValue: value,
      formattedPrevValue: formattedValue,
      changePct: 0,
      isIncrease: true,
      isPositive: true,
      colorTheme: theme
    });

    const totalVal = prods.reduce((sum, p) => sum + ((p.quantity || 0) * (p.costPrice || 0)), 0);

    const mappedPerf: import("../types").ProductPerformanceItem[] = prods.map(p => ({
      id: p.id,
      name: p.name,
      sku: p.sku || "N/A",
      category: p.category,
      brand: p.brand || "Generic",
      supplierName: p.supplierName || "N/A",
      warehouse: p.warehouse || p.location || "Main Warehouse",
      branch: p.branch || "Main Branch",
      currentStock: p.quantity,
      reservedStock: p.reservedStock || 0,
      minStock: p.minStock,
      maxStock: p.maxStock || 100,
      reorderLevel: p.reorderLevel || p.minStock,
      costPrice: p.costPrice,
      sellingPrice: p.sellingPrice,
      unitsSold: 10,
      revenue: 10 * p.sellingPrice,
      cogs: 10 * p.costPrice,
      grossProfit: 10 * (p.sellingPrice - p.costPrice),
      profitMargin: p.sellingPrice > 0 ? ((p.sellingPrice - p.costPrice) / p.sellingPrice) * 100 : 0,
      avgDailySales: 0.5,
      avgMonthlySales: 15,
      lastSaleDate: new Date().toISOString().split("T")[0],
      daysSinceLastSale: 5,
      healthStatus: p.quantity === 0 ? "Out of Stock" : p.quantity <= p.minStock ? "Low Stock" : "Healthy",
      abcCategory: "A",
      ageDays: 30,
      ageBracket: "0-30 days"
    }));

    return {
      filters: params || {},
      availableCategories: categories,
      availableSuppliers: suppliers,
      availableWarehouses: warehouses,
      availableBranches: branches,
      availableBrands: brands,
      executiveSummary: {
        totalProducts: makeKpi("Total Products", prods.length, String(prods.length), "blue"),
        totalInventoryQuantity: makeKpi("Total Units", prods.reduce((a, b) => a + (b.quantity || 0), 0), String(prods.reduce((a, b) => a + (b.quantity || 0), 0)), "emerald"),
        totalInventoryValue: makeKpi("Inventory Value", totalVal, `$${totalVal.toFixed(2)}`, "purple"),
        revenue: makeKpi("Revenue", 0, "$0.00", "indigo"),
        grossProfit: makeKpi("Gross Profit", 0, "$0.00", "emerald"),
        fastMovingCount: makeKpi("Fast Moving", mappedPerf.length, String(mappedPerf.length), "emerald"),
        slowMovingCount: makeKpi("Slow Moving", 0, "0", "amber"),
        deadStockCount: makeKpi("Dead Stock", 0, "0", "rose"),
        lowStockCount: makeKpi("Low Stock", prods.filter(p => p.status === "Low Stock").length, String(prods.filter(p => p.status === "Low Stock").length), "amber"),
        outOfStockCount: makeKpi("Out of Stock", prods.filter(p => p.status === "Out Of Stock").length, String(prods.filter(p => p.status === "Out Of Stock").length), "rose"),
        inventoryTurnoverRate: makeKpi("Turnover Rate", 4.2, "4.2x", "cyan"),
      },
      salesTrend: [],
      categoryPerformance: [],
      productPerformance: mappedPerf,
      fastSlowMoving: {
        fastMoving: mappedPerf.slice(0, 5),
        slowMoving: [],
        deadStock: [],
        deadStockThresholdDays: 90
      },
      stockHealth: {
        healthyCount: prods.filter(p => p.status === "In Stock").length,
        lowStockCount: prods.filter(p => p.status === "Low Stock").length,
        criticalStockCount: prods.filter(p => p.status === "Low Stock").length,
        overstockedCount: 0,
        outOfStockCount: prods.filter(p => p.status === "Out Of Stock").length,
        totalProductsCount: prods.length,
        healthBreakdown: []
      },
      analytics: {
        turnover: {
          currentTurnover: 4.2,
          previousTurnover: 4.0,
          changePct: 5.0,
          cogs: totalVal * 0.6,
          avgInventoryValue: totalVal
        },
        abcAnalysis: {
          categoryA: { count: prods.length, revenue: totalVal * 0.7, revenuePct: 70, inventoryValue: totalVal * 0.7, products: [] },
          categoryB: { count: 0, revenue: 0, revenuePct: 0, inventoryValue: 0, products: [] },
          categoryC: { count: 0, revenue: 0, revenuePct: 0, inventoryValue: 0, products: [] }
        },
        ageDistribution: []
      },
      productProfitability: mappedPerf
    };
  },
  getProductDetails: async (productId: string): Promise<import("../types").DetailedProductView> => {
    const p = await productService.getOne(productId);
    const item: import("../types").ProductPerformanceItem = {
      id: p.id,
      name: p.name,
      sku: p.sku || "N/A",
      category: p.category,
      brand: p.brand || "Generic",
      supplierName: p.supplierName || "N/A",
      warehouse: p.warehouse || p.location || "Main Warehouse",
      branch: p.branch || "Main Branch",
      currentStock: p.quantity,
      reservedStock: p.reservedStock || 0,
      minStock: p.minStock,
      maxStock: p.maxStock || 100,
      reorderLevel: p.reorderLevel || p.minStock,
      costPrice: p.costPrice,
      sellingPrice: p.sellingPrice,
      unitsSold: 0,
      revenue: 0,
      cogs: 0,
      grossProfit: 0,
      profitMargin: 0,
      avgDailySales: 0,
      avgMonthlySales: 0,
      lastSaleDate: new Date().toISOString().split("T")[0],
      daysSinceLastSale: 0,
      healthStatus: p.quantity === 0 ? "Out of Stock" : p.quantity <= p.minStock ? "Low Stock" : "Healthy",
      abcCategory: "A",
      ageDays: 1,
      ageBracket: "0-30 days"
    };
    return {
      product: item,
      purchaseHistory: [],
      salesHistory: [],
      stockMovementHistory: []
    };
  }
};

// -------------------------------------------------------------
// AI COPILOT SERVICE (Proxied via server.ts Gemini endpoint)
// -------------------------------------------------------------
export const aiCopilotService = {
  getHelp: async (prompt: string, type: "quote" | "stock" | "general"): Promise<{ text: string }> => {
    const response = await api.post<{ text: string }>("/gemini/assist", { prompt, type });
    return response.data;
  }
};

// -------------------------------------------------------------
// SYSTEM LOG SERVICE
// -------------------------------------------------------------
export const systemLogService = {
  getAll: async (params?: { category?: string; severity?: string; search?: string }): Promise<SystemLogsResponse> => {
    const bId = await getActiveBusinessId();
    return fsSystemLogService.getAll(bId, params);
  },
  logAction: async (logData: Omit<SystemLog, "id" | "timestamp">): Promise<SystemLog> => {
    const bId = await getActiveBusinessId();
    return fsSystemLogService.logAction(bId, logData);
  }
};

// -------------------------------------------------------------
// DOCUMENT OCR SERVICE (Proxied via server.ts Gemini endpoint)
// -------------------------------------------------------------
export const documentOcrService = {
  analyzeDocumentImage: async (imageBase64: string, mimeType?: string): Promise<DocumentAnalysisResult> => {
    const response = await api.post<DocumentAnalysisResult>("/gemini/analyze-document", { imageBase64, mimeType });
    return response.data;
  },
  bulkRestockFromOcr: async (items: Array<{ productId?: string; productName: string; sku?: string; quantityToAdd: number; costPrice?: number; sellingPrice?: number }>, note?: string) => {
    const bId = await getActiveBusinessId();
    let updatedCount = 0;
    let createdCount = 0;

    for (const item of items) {
      if (item.productId) {
        await productService.restock(item.productId, { addQuantity: item.quantityToAdd });
        updatedCount++;
      } else {
        await productService.create({
          name: item.productName,
          sku: item.sku || `SKU-${Date.now().toString().slice(-6)}`,
          category: "General Hardware",
          costPrice: item.costPrice || 10,
          sellingPrice: item.sellingPrice || 15,
          quantity: item.quantityToAdd,
          minStock: 5,
          location: "Main Warehouse",
        });
        createdCount++;
      }
    }

    return {
      success: true,
      updatedCount,
      createdCount,
      message: `Successfully restocked ${updatedCount} existing products and created ${createdCount} new items.`
    };
  }
};
