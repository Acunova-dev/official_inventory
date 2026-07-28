import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { computeInventoryInsights, getProductDetails } from "./src/server/insightsHelper";

const PORT = 3000;
const DB_FILE = path.join(process.cwd(), "db_store.json");

// Helper interfaces
interface Product {
  id: string;
  name: string;
  category: string;
  costPrice: number;
  sellingPrice: number;
  quantity: number;
  minStock: number;
  location: string;
  status: "In Stock" | "Low Stock" | "Out Of Stock";
  sku?: string;
  barcode?: string;
  brand?: string;
}

interface Customer {
  id: string;
  name: string;
  type: "Individual" | "School" | "Shop" | "Company";
  phone: string;
  email: string;
  address: string;
}

interface Supplier {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: "Principal Admin" | "Staff";
  disabled: boolean;
}

interface QuotationLine {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface Quotation {
  id: string;
  quotationNumber: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  date: string;
  expiryDate: string;
  lines: QuotationLine[];
  subtotal: number;
  taxRate: number; // e.g. 15% (0.15)
  taxAmount: number;
  discountRate: number; // e.g. 10% (0.10)
  discountAmount: number;
  total: number;
  status: "Draft" | "Sent" | "Accepted" | "Rejected" | "Expired";
  notes?: string;
}

interface ReceiptLine {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface Receipt {
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

interface CompanySettings {
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
  quotationStyle?: string;
}

interface SystemLog {
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

interface Database {
  products: Product[];
  customers: Customer[];
  suppliers: Supplier[];
  users: User[];
  quotations: Quotation[];
  receipts: Receipt[];
  systemLogs?: SystemLog[];
  companySettings?: CompanySettings;
}

// Initial default data if file doesn't exist
const initialDatabase: Database = {
  products: [
    {
      id: "prod-1",
      name: "Apple MacBook Pro 16\" (M3 Pro, 18GB, 512GB)",
      category: "Laptops",
      costPrice: 1850,
      sellingPrice: 2499,
      quantity: 14,
      minStock: 5,
      location: "Aisle A1 - Shelf B3",
      status: "In Stock"
    },
    {
      id: "prod-2",
      name: "Sony WH-1000XM5 Noise Cancelling Headphones",
      category: "Audio",
      costPrice: 230,
      sellingPrice: 399,
      quantity: 45,
      minStock: 10,
      location: "Aisle B2 - Display Grid 4",
      status: "In Stock"
    },
    {
      id: "prod-3",
      name: "Samsung Odyssey G9 49\" Curved Gaming Monitor",
      category: "Displays",
      costPrice: 900,
      sellingPrice: 1299,
      quantity: 3,
      minStock: 4,
      location: "Aisle C1 - Large Item Rack",
      status: "Low Stock"
    },
    {
      id: "prod-4",
      name: "Raspberry Pi 5 Model B (8GB RAM Starter Kit)",
      category: "Development Boards",
      costPrice: 65,
      sellingPrice: 95,
      quantity: 2,
      minStock: 15,
      location: "Storage Locker C - Tray 2",
      status: "Low Stock"
    },
    {
      id: "prod-5",
      name: "Anker Prime 100W GaN Wall Charger (3-Port)",
      category: "Power Accessories",
      costPrice: 40,
      sellingPrice: 79,
      quantity: 80,
      minStock: 15,
      location: "Aisle B4 - Check-out Stand",
      status: "In Stock"
    },
    {
      id: "prod-6",
      name: "Logitech MX Master 3S Wireless Mouse",
      category: "Peripherals",
      costPrice: 60,
      sellingPrice: 99,
      quantity: 0,
      minStock: 8,
      location: "Aisle B1 - Row D3",
      status: "Out Of Stock"
    },
    {
      id: "prod-7",
      name: "SanDisk Extreme PRO Portable SSD 2TB",
      category: "Storage",
      costPrice: 140,
      sellingPrice: 219,
      quantity: 22,
      minStock: 5,
      location: "Glass Drawer 1B",
      status: "In Stock"
    }
  ],
  customers: [
    {
      id: "cust-1",
      name: "Alpha Tech Solutions Inc.",
      type: "Company",
      phone: "+1 (555) 0192",
      email: "procurement@alphatech.com",
      address: "1024 tech Boulevard, Palo Alto, CA 94304"
    },
    {
      id: "cust-2",
      name: "Sunnyvale Public High School",
      type: "School",
      phone: "+1 (555) 3819",
      email: "it-admin@sunnyvalehigh.edu",
      address: "420 Academic Way, Sunnyvale, CA 94087"
    },
    {
      id: "cust-3",
      name: "Jonathan Clark",
      type: "Individual",
      phone: "+1 (555) 8721",
      email: "jonathan.clark@yahoo.com",
      address: "889 Oakwood Lane, San Jose, CA 95112"
    },
    {
      id: "cust-4",
      name: "ByteSize Phone & Laptop Repair Shop",
      type: "Shop",
      phone: "+1 (555) 9494",
      email: "repairs@bytesize.com",
      address: "12 Main St, Cupertino, CA 95014"
    }
  ],
  suppliers: [
    {
      id: "supp-1",
      name: "Shenzhen Micro-Electronics Wholesaler Ltd.",
      phone: "+86 (755) 8839-0128",
      email: "wholesale@shenzhensemi.cn",
      address: "Futian Electronic Market, Block B, Shenzhen, China"
    },
    {
      id: "supp-2",
      name: "ElectroWholesale USA Inc.",
      phone: "+1 (800) 555-1200",
      email: "orders@electrowholesale.net",
      address: "931 Logistics Circle, Dallas, TX 75201"
    },
    {
      id: "supp-3",
      name: "Pacific Distribution Hub LLC",
      phone: "+1 (415) 555-7070",
      email: "support@pacificdist.org",
      address: "50 Harbor Boulevard, San Francisco, CA 94107"
    }
  ],
  users: [
    {
      id: "user-1",
      name: "Principal Admin",
      email: "admin@volt.com",
      role: "Principal Admin",
      disabled: false
    },
    {
      id: "user-2",
      name: "Staff Member",
      email: "staff@volt.com",
      role: "Staff",
      disabled: false
    }
  ],
  quotations: [
    {
      id: "qt-1",
      quotationNumber: "QT-2026-001",
      customerId: "cust-1",
      customerName: "Alpha Tech Solutions Inc.",
      customerEmail: "procurement@alphatech.com",
      date: "2026-06-18",
      expiryDate: "2026-07-18",
      lines: [
        {
          productId: "prod-1",
          productName: "Apple MacBook Pro 16\" (M3 Pro, 18GB, 512GB)",
          quantity: 2,
          unitPrice: 2499,
          totalPrice: 4998
        },
        {
          productId: "prod-7",
          productName: "SanDisk Extreme PRO Portable SSD 2TB",
          quantity: 4,
          unitPrice: 219,
          totalPrice: 876
        }
      ],
      subtotal: 5874,
      taxRate: 0.15,
      taxAmount: 881.1,
      discountRate: 0.1,
      discountAmount: 587.4,
      total: 6167.7,
      status: "Sent",
      notes: "Alpha Tech custom pricing program. Validity 30 days."
    },
    {
      id: "qt-2",
      quotationNumber: "QT-2026-002",
      customerId: "cust-2",
      customerName: "Sunnyvale Public High School",
      customerEmail: "it-admin@sunnyvalehigh.edu",
      date: "2026-06-20",
      expiryDate: "2026-07-20",
      lines: [
        {
          productId: "prod-3",
          productName: "Samsung Odyssey G9 49\" Curved Gaming Monitor",
          quantity: 1,
          unitPrice: 1299,
          totalPrice: 1299
        }
      ],
      subtotal: 1299,
      taxRate: 0.15,
      taxAmount: 194.85,
      discountRate: 0.0,
      discountAmount: 0.0,
      total: 1493.85,
      status: "Accepted",
      notes: "Education procurement code apply."
    }
  ],
  receipts: [
    {
      id: "rc-1",
      receiptNumber: "RC-228741",
      customerId: "cust-3",
      customerName: "Jonathan Clark",
      date: "2026-06-21",
      lines: [
        {
          productId: "prod-2",
          productName: "Sony WH-1000XM5 Noise Cancelling Headphones",
          quantity: 1,
          unitPrice: 399,
          totalPrice: 399
        },
        {
          productId: "prod-5",
          productName: "Anker Prime 100W GaN Wall Charger (3-Port)",
          quantity: 2,
          unitPrice: 79,
          totalPrice: 158
        }
      ],
      subtotal: 557,
      taxRate: 0.15,
      taxAmount: 83.55,
      discountRate: 0.05,
      discountAmount: 27.85,
      total: 612.7
    }
  ],
  companySettings: {
    companyName: "SHIELD HARDWARE",
    companySubtitle: "SHIELD HARDWARE",
    tagline: "Suppliers of Plumbing, Electrical & General Hardware",
    logoUrl: "",
    logoInitials: "SH",
    streetAddress: "NO. 57 FORT STREET",
    city: "BULAWAYO",
    country: "ZIMBABWE",
    address: "NO. 57 FORT STREET, BULAWAYO, ZIMBABWE",
    email: "shieldhardware57@gmail.com",
    phone: "+263 773 360 800",
    tel: "0",
    mobile: "+263 773 360 800",
    mobile2: "+263 715 503 400",
    vatNumber: "220412593",
    tinNumber: "2001804582",
    registrationNumber: "2001804582",
    bankName: "Stanbic Bank Bulawayo",
    accountName: "Shield Hardware Pvt Ltd",
    accountNumber: "9140001827461",
    ecocashNumber: "*151*2*2*123456# / +263 773 360 800",
    currency: "USD",
    salesType: "ALL",
    doneBy: "LMAKONO",
    pdfHeaderColor: "#8b7355",
    footerTerms: "PRICES QUOTED IN USD DOLLAR. Official computer generated document.",
    quotationStyle: "minimalist_authentic"
  },
  systemLogs: [
    {
      id: "log-101",
      timestamp: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
      category: "Inventory Adjustment",
      action: "STOCK_QUANTITY_UPDATED",
      userEmail: "admin@company.com",
      userName: "Principal Admin",
      userRole: "Principal Admin",
      details: "Restocked 'Sony WH-1000XM5 Noise Cancelling Headphones' from 40 to 45 units (+5 units).",
      targetId: "prod-2",
      ipAddress: "192.168.1.104",
      severity: "info"
    },
    {
      id: "log-102",
      timestamp: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
      category: "User Authentication",
      action: "USER_LOGIN_SUCCESS",
      userEmail: "staff@company.com",
      userName: "Sales Staff Member",
      userRole: "Staff",
      details: "User 'Sales Staff Member' authenticated successfully from session token IP.",
      targetId: "usr-staff-101",
      ipAddress: "192.168.1.112",
      severity: "success"
    },
    {
      id: "log-103",
      timestamp: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
      category: "Quotation Management",
      action: "QUOTATION_DELETED",
      userEmail: "admin@company.com",
      userName: "Principal Admin",
      userRole: "Principal Admin",
      details: "Permanently purged outdated draft quotation QT-2026-009 for customer 'Metro Electronics Ltd' ($3,420.00).",
      targetId: "qt-9",
      ipAddress: "192.168.1.104",
      severity: "danger"
    },
    {
      id: "log-104",
      timestamp: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
      category: "Product Catalog",
      action: "PRODUCT_CREATED",
      userEmail: "admin@company.com",
      userName: "Principal Admin",
      userRole: "Principal Admin",
      details: "Created new product record 'Apple MacBook Pro 16\" (M3 Pro)' SKU: APL-MBP16-01.",
      targetId: "prod-1",
      ipAddress: "192.168.1.104",
      severity: "info"
    },
    {
      id: "log-105",
      timestamp: new Date(Date.now() - 36 * 3600 * 1000).toISOString(),
      category: "Receipt & Sales",
      action: "RECEIPT_GENERATED",
      userEmail: "staff@company.com",
      userName: "Sales Staff Member",
      userRole: "Staff",
      details: "Generated receipt RC-228741 for Jonathan Clark total $612.70.",
      targetId: "rc-1",
      ipAddress: "192.168.1.112",
      severity: "success"
    },
    {
      id: "log-106",
      timestamp: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
      category: "System Settings",
      action: "COMPANY_SETTINGS_UPDATED",
      userEmail: "admin@company.com",
      userName: "Principal Admin",
      userRole: "Principal Admin",
      details: "Updated corporate VAT identification number & default PDF theme color accent.",
      targetId: "settings",
      ipAddress: "192.168.1.104",
      severity: "warning"
    }
  ]
};

// Helper function to record audit logs
function recordSystemLog(
  db: Database,
  logData: Omit<SystemLog, "id" | "timestamp">
): SystemLog {
  if (!db.systemLogs) {
    db.systemLogs = [];
  }
  const newLog: SystemLog = {
    id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    timestamp: new Date().toISOString(),
    ...logData
  };
  db.systemLogs.unshift(newLog);
  // Cap logs array to latest 500 items to prevent uncontrolled disk bloating
  if (db.systemLogs.length > 500) {
    db.systemLogs = db.systemLogs.slice(0, 500);
  }
  return newLog;
}

// Database utility functions
function getDb(): Database {
  try {
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify(initialDatabase, null, 2), "utf8");
      return initialDatabase;
    }
    const raw = fs.readFileSync(DB_FILE, "utf8");
    const db: Database = JSON.parse(raw);
    if (!db.companySettings) {
      db.companySettings = initialDatabase.companySettings;
      saveDb(db);
    }
    if (!db.systemLogs || db.systemLogs.length === 0) {
      db.systemLogs = initialDatabase.systemLogs;
      saveDb(db);
    }
    return db;
  } catch (err) {
    console.error("Error reading database file, returning in-memory fallback:", err);
    return initialDatabase;
  }
}

function saveDb(data: Database): void {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf8");
  } catch (err) {
    console.error("Error writing database file:", err);
  }
}

// Update state/status helper
function refreshProductStatus(prod: Product): void {
  if (prod.quantity <= 0) {
    prod.status = "Out Of Stock";
  } else if (prod.quantity <= prod.minStock) {
    prod.status = "Low Stock";
  } else {
    prod.status = "In Stock";
  }
}

const app = express();
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));

// Auth Middlewares (Dummy fallback)
function getAuthUser(req: express.Request): { email: string; role: string; name: string } {
  const authHeader = req.headers.authorization || "";
  if (authHeader.includes("staff")) {
    return { email: "staff@company.com", role: "Staff", name: "Sales Staff Member" };
  }
  return { email: "admin@company.com", role: "Principal Admin", name: "Principal Admin" };
}

// REST APIs - v1 Prefix

// --- AUTH (Server endpoints scrapped in favor of client dummyAuthApi) ---
app.post("/api/v1/auth/login", (req, res) => {
  res.status(410).json({ message: "Server auth API scrapped. Login is handled via local dummyAuthApi." });
});

app.get("/api/v1/auth/me", (req, res) => {
  const user = getAuthUser(req);
  return res.json({ user });
});

// --- SYSTEM LOGS & AUDIT TRAIL API ---
app.get("/api/v1/system-logs", (req, res) => {
  const db = getDb();
  let logs = db.systemLogs || [];

  const category = req.query.category as string;
  const severity = req.query.severity as string;
  const search = req.query.search as string;

  if (category && category !== "All") {
    logs = logs.filter(l => l.category === category);
  }

  if (severity && severity !== "All") {
    logs = logs.filter(l => l.severity === severity);
  }

  if (search) {
    const q = search.toLowerCase();
    logs = logs.filter(l => 
      l.details.toLowerCase().includes(q) ||
      l.action.toLowerCase().includes(q) ||
      l.userEmail.toLowerCase().includes(q) ||
      l.userName.toLowerCase().includes(q) ||
      (l.targetId && l.targetId.toLowerCase().includes(q))
    );
  }

  const allLogs = db.systemLogs || [];
  const totalLogs = allLogs.length;
  const inventoryLogsCount = allLogs.filter(l => l.category === "Inventory Adjustment").length;
  const authLogsCount = allLogs.filter(l => l.category === "User Authentication").length;
  const quotationLogsCount = allLogs.filter(l => l.category === "Quotation Management").length;
  const dangerActionsCount = allLogs.filter(l => l.severity === "danger" || l.action.includes("DELETED")).length;

  res.json({
    logs,
    total: logs.length,
    stats: {
      totalLogs,
      inventoryLogsCount,
      authLogsCount,
      quotationLogsCount,
      dangerActionsCount
    }
  });
});

app.post("/api/v1/system-logs", (req, res) => {
  const db = getDb();
  const { category, action, userEmail, userName, userRole, details, targetId, ipAddress, severity } = req.body;

  if (!category || !action || !details) {
    return res.status(400).json({ error: "category, action, and details are required" });
  }

  const user = getAuthUser(req);
  const newLog = recordSystemLog(db, {
    category,
    action,
    userEmail: userEmail || user.email,
    userName: userName || user.name,
    userRole: userRole || user.role,
    details,
    targetId,
    ipAddress: ipAddress || req.ip || "192.168.1.100",
    severity: severity || "info"
  });

  saveDb(db);
  res.status(201).json(newLog);
});

// --- DASHBOARD SUMMARY ---
app.get("/api/v1/dashboard/summary", (req, res) => {
  const db = getDb();
  
  const totalProducts = db.products.length;
  const totalCustomers = db.customers.length;
  const totalQuotations = db.quotations.length;
  const totalReceipts = db.receipts.length;
  const lowStockProducts = db.products.filter(p => p.quantity <= p.minStock).length;

  res.json({
    totalProducts,
    totalCustomers,
    totalQuotations,
    totalReceipts,
    lowStockProducts,
    company: "VoltSync Electronics Corp"
  });
});

app.get("/api/v1/dashboard/activity", (req, res) => {
  const db = getDb();
  // Get recent 5 items in each category
  const recentlyAddedProducts = [...db.products].reverse().slice(0, 5);
  const recentlyCreatedQuotations = [...db.quotations].reverse().slice(0, 5);
  const recentlyCreatedReceipts = [...db.receipts].reverse().slice(0, 5);

  res.json({
    recentlyAddedProducts,
    recentlyCreatedQuotations,
    recentlyCreatedReceipts
  });
});

// --- AUTOMATED DASHBOARD ALERTS ---
app.get("/api/v1/dashboard/alerts", (req, res) => {
  const db = getDb();
  const multiplier = Number(req.query.multiplier) || 1.0;

  const alerts = db.products
    .filter(p => {
      const effectiveThreshold = Math.ceil(p.minStock * multiplier);
      return p.quantity <= effectiveThreshold;
    })
    .map(p => {
      const effectiveThreshold = Math.ceil(p.minStock * multiplier);
      let alertSeverity: "OUT_OF_STOCK" | "CRITICAL" | "WARNING" = "WARNING";
      if (p.quantity <= 0) {
        alertSeverity = "OUT_OF_STOCK";
      } else if (p.quantity <= Math.ceil(effectiveThreshold / 2)) {
        alertSeverity = "CRITICAL";
      }

      const stockDeficit = Math.max(0, effectiveThreshold - p.quantity);
      const suggestedTarget = Math.max(p.minStock * 2, 10);
      const suggestedRestock = Math.max(0, suggestedTarget - p.quantity);

      return {
        ...p,
        alertSeverity,
        stockDeficit,
        suggestedRestock,
        effectiveThreshold,
      };
    })
    .sort((a, b) => {
      const severityScore = { OUT_OF_STOCK: 0, CRITICAL: 1, WARNING: 2 };
      if (severityScore[a.alertSeverity] !== severityScore[b.alertSeverity]) {
        return severityScore[a.alertSeverity] - severityScore[b.alertSeverity];
      }
      return a.quantity - b.quantity;
    });

  const outOfStockCount = alerts.filter(a => a.alertSeverity === "OUT_OF_STOCK").length;
  const criticalCount = alerts.filter(a => a.alertSeverity === "CRITICAL").length;
  const warningCount = alerts.filter(a => a.alertSeverity === "WARNING").length;
  const totalDeficitUnits = alerts.reduce((sum, a) => sum + a.stockDeficit, 0);

  res.json({
    summary: {
      totalAlerts: alerts.length,
      outOfStockCount,
      criticalCount,
      warningCount,
      totalDeficitUnits,
    },
    alerts,
  });
});

app.post("/api/v1/products/:id/restock", (req, res) => {
  const db = getDb();
  const index = db.products.findIndex(p => p.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: "Product not found" });

  const { addQuantity, newMinStock } = req.body;
  const qtyToAdd = Number(addQuantity) || 0;

  if (qtyToAdd > 0) {
    db.products[index].quantity += qtyToAdd;
  }
  if (newMinStock !== undefined && Number(newMinStock) >= 0) {
    db.products[index].minStock = Number(newMinStock);
  }

  refreshProductStatus(db.products[index]);
  saveDb(db);

  res.json({
    message: `Restocked ${qtyToAdd} units successfully`,
    product: db.products[index],
  });
});

// --- PRODUCTS MODULE ---
app.get("/api/v1/products", (req, res) => {
  const db = getDb();
  let list = [...db.products];

  // Search
  const search = req.query.search as string;
  if (search) {
    const q = search.toLowerCase();
    list = list.filter(p => 
      p.name.toLowerCase().includes(q) || 
      p.category.toLowerCase().includes(q) ||
      p.id.toLowerCase().includes(q) ||
      (p.sku && p.sku.toLowerCase().includes(q)) ||
      (p.barcode && p.barcode.toLowerCase().includes(q)) ||
      (p.location && p.location.toLowerCase().includes(q))
    );
  }

  // Filter status
  const status = req.query.status as string;
  if (status && status !== "All") {
    list = list.filter(p => p.status === status);
  }

  // Sorting
  const sortBy = req.query.sortBy as string || "name";
  const order = req.query.order as string || "asc";
  list.sort((a: any, b: any) => {
    let aVal = a[sortBy];
    let bVal = b[sortBy];
    if (typeof aVal === 'string') {
      return order === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    }
    return order === "asc" ? aVal - bVal : bVal - aVal;
  });

  // Simple inventory valuation logic computed exclusively by backend
  const totalValuationCost = list.reduce((sum, p) => sum + (p.costPrice * p.quantity), 0);
  const totalValuationSelling = list.reduce((sum, p) => sum + (p.sellingPrice * p.quantity), 0);
  const expectedProfit = totalValuationSelling - totalValuationCost;

  res.json({
    products: list,
    valuation: {
      totalCost: totalValuationCost,
      totalSelling: totalValuationSelling,
      expectedProfit
    }
  });
});

app.get("/api/v1/products/:id", (req, res) => {
  const db = getDb();
  const prod = db.products.find(p => p.id === req.params.id);
  if (!prod) return res.status(404).json({ error: "Product not found" });
  res.json(prod);
});

app.post("/api/v1/products", (req, res) => {
  const db = getDb();
  const { name, category, costPrice, sellingPrice, quantity, minStock, location, sku, barcode, brand } = req.body;

  if (!name || !category || costPrice === undefined || sellingPrice === undefined || quantity === undefined) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const newProduct: Product = {
    id: `prod-${Date.now()}`,
    name,
    category,
    costPrice: Number(costPrice),
    sellingPrice: Number(sellingPrice),
    quantity: Number(quantity),
    minStock: Number(minStock || 5),
    location: location || "General Aisle",
    status: "In Stock",
    sku: sku || `SKU-${Date.now().toString().slice(-6)}`,
    barcode: barcode || (sku ? sku : `BAR-${Date.now().toString().slice(-8)}`),
    brand: brand || "Generic"
  };
  refreshProductStatus(newProduct);

  db.products.push(newProduct);
  saveDb(db);
  res.status(201).json(newProduct);
});

app.put("/api/v1/products/:id", (req, res) => {
  const db = getDb();
  const index = db.products.findIndex(p => p.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: "Product not found" });

  const current = db.products[index];
  const { name, category, costPrice, sellingPrice, quantity, minStock, location, sku, barcode, brand } = req.body;

  const oldQty = current.quantity;
  const newQty = quantity !== undefined ? Number(quantity) : current.quantity;

  db.products[index] = {
    ...current,
    name: name !== undefined ? name : current.name,
    category: category !== undefined ? category : current.category,
    costPrice: costPrice !== undefined ? Number(costPrice) : current.costPrice,
    sellingPrice: sellingPrice !== undefined ? Number(sellingPrice) : current.sellingPrice,
    quantity: newQty,
    minStock: minStock !== undefined ? Number(minStock) : current.minStock,
    location: location !== undefined ? location : current.location,
    sku: sku !== undefined ? sku : current.sku,
    barcode: barcode !== undefined ? barcode : current.barcode,
    brand: brand !== undefined ? brand : current.brand,
  };
  refreshProductStatus(db.products[index]);

  const authUser = getAuthUser(req);
  if (oldQty !== newQty) {
    const delta = newQty - oldQty;
    recordSystemLog(db, {
      category: "Inventory Adjustment",
      action: "STOCK_QUANTITY_UPDATED",
      userEmail: authUser.email,
      userName: authUser.name,
      userRole: authUser.role,
      details: `Stock for '${current.name}' adjusted from ${oldQty} to ${newQty} units (${delta >= 0 ? "+" : ""}${delta}).`,
      targetId: current.id,
      severity: newQty <= current.minStock ? "warning" : "info"
    });
  }

  saveDb(db);
  res.json(db.products[index]);
});

app.delete("/api/v1/products/:id", (req, res) => {
  const db = getDb();
  const index = db.products.findIndex(p => p.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: "Product not found" });

  const deleted = db.products.splice(index, 1)[0];
  saveDb(db);
  res.json({ message: "Product deleted successfully", product: deleted });
});

app.post("/api/v1/products/batch-delete", (req, res) => {
  const db = getDb();
  const { ids } = req.body;

  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: "No product IDs provided for deletion" });
  }

  const initialCount = db.products.length;
  db.products = db.products.filter(p => !ids.includes(p.id));
  const deletedCount = initialCount - db.products.length;

  saveDb(db);
  res.json({ message: `Successfully deleted ${deletedCount} products`, deletedCount });
});

app.post("/api/v1/products/batch-update-stock", (req, res) => {
  const db = getDb();
  const { ids, mode, value } = req.body;

  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: "No product IDs provided for batch update" });
  }

  const numValue = Number(value);
  if (isNaN(numValue)) {
    return res.status(400).json({ error: "Invalid numeric value provided" });
  }

  let updatedCount = 0;
  db.products.forEach(p => {
    if (ids.includes(p.id)) {
      if (mode === "set") {
        p.quantity = Math.max(0, Math.floor(numValue));
      } else if (mode === "add") {
        p.quantity = Math.max(0, p.quantity + Math.floor(numValue));
      } else if (mode === "minStock") {
        p.minStock = Math.max(0, Math.floor(numValue));
      }
      refreshProductStatus(p);
      updatedCount++;
    }
  });

  saveDb(db);
  res.json({ message: `Successfully updated stock for ${updatedCount} products`, updatedCount });
});

// --- CUSTOMERS ---
app.get("/api/v1/customers", (req, res) => {
  const db = getDb();
  let list = [...db.customers];
  const search = req.query.search as string;
  if (search) {
    const q = search.toLowerCase();
    list = list.filter(c => c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q));
  }
  res.json(list);
});

app.post("/api/v1/customers", (req, res) => {
  const db = getDb();
  const { name, type, phone, email, address } = req.body;
  if (!name || !type) return res.status(400).json({ error: "Name and customer type are required" });

  const newCust: Customer = {
    id: `cust-${Date.now()}`,
    name,
    type,
    phone: phone || "",
    email: email || "",
    address: address || ""
  };
  db.customers.push(newCust);
  saveDb(db);
  res.status(201).json(newCust);
});

app.put("/api/v1/customers/:id", (req, res) => {
  const db = getDb();
  const index = db.customers.findIndex(c => c.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: "Customer not found" });

  db.customers[index] = { ...db.customers[index], ...req.body };
  saveDb(db);
  res.json(db.customers[index]);
});

app.delete("/api/v1/customers/:id", (req, res) => {
  const db = getDb();
  db.customers = db.customers.filter(c => c.id !== req.params.id);
  saveDb(db);
  res.json({ success: true });
});

// --- SUPPLIERS ---
app.get("/api/v1/suppliers", (req, res) => {
  const db = getDb();
  res.json(db.suppliers);
});

app.post("/api/v1/suppliers", (req, res) => {
  const db = getDb();
  const { name, phone, email, address } = req.body;
  if (!name) return res.status(400).json({ error: "Supplier Name is required" });

  const newSupp: Supplier = {
    id: `supp-${Date.now()}`,
    name,
    phone: phone || "",
    email: email || "",
    address: address || ""
  };
  db.suppliers.push(newSupp);
  saveDb(db);
  res.status(201).json(newSupp);
});

app.put("/api/v1/suppliers/:id", (req, res) => {
  const db = getDb();
  const index = db.suppliers.findIndex(s => s.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: "Supplier not found" });

  db.suppliers[index] = { ...db.suppliers[index], ...req.body };
  saveDb(db);
  res.json(db.suppliers[index]);
});

app.delete("/api/v1/suppliers/:id", (req, res) => {
  const db = getDb();
  db.suppliers = db.suppliers.filter(s => s.id !== req.params.id);
  saveDb(db);
  res.json({ success: true });
});

// --- ARITHMETIC / BILLING ENDPOINTS (MANDATORY EXCLUSIVE SERVER REQ) ---
function calculateCartTotals(
  items: Array<{ productId: string; quantity: number }>, 
  discountRate: number, 
  products: Product[],
  taxRateInput?: number | string | null,
  companySettings?: CompanySettings
) {
  let taxRate = 0;
  if (taxRateInput !== undefined && taxRateInput !== null && taxRateInput !== "") {
    let tr = Number(taxRateInput);
    if (tr > 1) tr = tr / 100; // e.g. 15 -> 0.15
    taxRate = Math.max(0, tr);
  } else if (companySettings) {
    if (companySettings.enableVat) {
      let tr = Number(companySettings.taxRate ?? 0.15);
      if (tr > 1) tr = tr / 100;
      taxRate = Math.max(0, tr);
    } else {
      taxRate = 0;
    }
  } else {
    taxRate = 0;
  }

  const lines: any[] = [];
  let subtotal = 0;

  for (const item of items) {
    const originalProd = products.find(p => p.id === item.productId);
    if (!originalProd) continue;

    const unitPrice = originalProd.sellingPrice;
    const qty = Number(item.quantity);
    const totalPrice = unitPrice * qty;
    subtotal += totalPrice;

    lines.push({
      productId: originalProd.id,
      productName: originalProd.name,
      quantity: qty,
      unitPrice,
      totalPrice
    });
  }

  const discountAmount = Number((subtotal * discountRate).toFixed(2));
  const subtotalAfterDiscount = Math.max(0, subtotal - discountAmount);
  const taxAmount = Number((subtotalAfterDiscount * taxRate).toFixed(2));
  const total = Number((subtotalAfterDiscount + taxAmount).toFixed(2));

  return {
    lines,
    subtotal,
    taxRate,
    taxAmount,
    discountRate,
    discountAmount,
    total
  };
}

// --- QUOTATIONS CORE SERVICE ---
app.get("/api/v1/quotations", (req, res) => {
  const db = getDb();
  res.json(db.quotations);
});

app.post("/api/v1/quotations/calculate", (req, res) => {
  const { items, discountRate, taxRate } = req.body;
  if (!items || !Array.isArray(items)) {
    return res.status(400).json({ error: "items array is required" });
  }
  const db = getDb();
  const result = calculateCartTotals(items, Number(discountRate || 0), db.products, taxRate, db.companySettings);
  res.json(result);
});

app.post("/api/v1/quotations", (req, res) => {
  const db = getDb();
  const { customerId, items, discountRate, taxRate, notes, status } = req.body;
  if (!customerId || !items || !Array.isArray(items)) {
    return res.status(400).json({ error: "customerId and items are required" });
  }

  const customer = db.customers.find(c => c.id === customerId);
  if (!customer) return res.status(404).json({ error: "Customer not found" });

  const calculated = calculateCartTotals(items, Number(discountRate || 0), db.products, taxRate, db.companySettings);

  const newQuote: Quotation = {
    id: `qt-${Date.now()}`,
    quotationNumber: `QT-2026-00${db.quotations.length + 1}`,
    customerId: customer.id,
    customerName: customer.name,
    customerEmail: customer.email,
    date: new Date().toISOString().split("T")[0],
    expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    lines: calculated.lines,
    subtotal: calculated.subtotal,
    taxRate: calculated.taxRate,
    taxAmount: calculated.taxAmount,
    discountRate: calculated.discountRate,
    discountAmount: calculated.discountAmount,
    total: calculated.total,
    status: status || "Draft",
    notes: notes || ""
  };

  db.quotations.push(newQuote);
  saveDb(db);
  res.status(201).json(newQuote);
});

app.get("/api/v1/quotations/:id", (req, res) => {
  const db = getDb();
  const quote = db.quotations.find(q => q.id === req.params.id);
  if (!quote) return res.status(404).json({ error: "Quotation not found" });
  res.json(quote);
});

app.put("/api/v1/quotations/:id", (req, res) => {
  const db = getDb();
  const index = db.quotations.findIndex(q => q.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: "Quotation not found" });

  const { status, notes, discountRate, taxRate, items } = req.body;
  const original = db.quotations[index];

  let calculated = {
    lines: original.lines,
    subtotal: original.subtotal,
    taxRate: original.taxRate,
    taxAmount: original.taxAmount,
    discountRate: original.discountRate,
    discountAmount: original.discountAmount,
    total: original.total
  };

  const effectiveTaxRate = taxRate !== undefined ? taxRate : original.taxRate;
  const effectiveDiscountRate = discountRate !== undefined ? Number(discountRate) : original.discountRate;

  if (items && Array.isArray(items)) {
    calculated = calculateCartTotals(items, effectiveDiscountRate, db.products, effectiveTaxRate, db.companySettings);
  } else if (discountRate !== undefined || taxRate !== undefined) {
    const standardInputItems = original.lines.map(l => ({ productId: l.productId, quantity: l.quantity }));
    calculated = calculateCartTotals(standardInputItems, effectiveDiscountRate, db.products, effectiveTaxRate, db.companySettings);
  }

  db.quotations[index] = {
    ...original,
    status: status || original.status,
    notes: notes !== undefined ? notes : original.notes,
    ...calculated
  };

  saveDb(db);
  res.json(db.quotations[index]);
});

app.delete("/api/v1/quotations/:id", (req, res) => {
  const db = getDb();
  const quote = db.quotations.find(q => q.id === req.params.id);
  if (!quote) return res.status(404).json({ error: "Quotation not found" });

  db.quotations = db.quotations.filter(q => q.id !== req.params.id);

  const authUser = getAuthUser(req);
  recordSystemLog(db, {
    category: "Quotation Management",
    action: "QUOTATION_DELETED",
    userEmail: authUser.email,
    userName: authUser.name,
    userRole: authUser.role,
    details: `Deleted quotation ${quote.quotationNumber} for customer '${quote.customerName}' (Total: $${quote.total.toFixed(2)}).`,
    targetId: quote.id,
    severity: "danger"
  });

  saveDb(db);
  res.json({ success: true, quotationNumber: quote.quotationNumber });
});

// --- RECEIPTS CORE SERVICE ---
app.get("/api/v1/receipts", (req, res) => {
  const db = getDb();
  res.json(db.receipts);
});

app.post("/api/v1/receipts/calculate", (req, res) => {
  const { items, discountRate, taxRate } = req.body;
  if (!items || !Array.isArray(items)) {
    return res.status(400).json({ error: "items array is required" });
  }
  const db = getDb();
  const result = calculateCartTotals(items, Number(discountRate || 0), db.products, taxRate, db.companySettings);
  res.json(result);
});

app.post("/api/v1/receipts", (req, res) => {
  const db = getDb();
  const { customerId, items, discountRate, taxRate } = req.body;
  
  if (!customerId || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "customerId and products are required" });
  }

  const customer = db.customers.find(c => c.id === customerId);
  if (!customer) return res.status(404).json({ error: "Customer not found" });

  // Validate Stock first to meet professional ERP expectations
  for (const item of items) {
    const prod = db.products.find(p => p.id === item.productId);
    if (!prod) return res.status(400).json({ error: `Product ${item.productId} was not found` });
    if (prod.quantity < item.quantity) {
      return res.status(400).json({ error: `Insufficient stock for '${prod.name}'. Requested: ${item.quantity}, Available: ${prod.quantity}.` });
    }
  }

  // Stock updates occurs on backend
  for (const item of items) {
    const productIdx = db.products.findIndex(p => p.id === item.productId);
    db.products[productIdx].quantity -= Number(item.quantity);
    refreshProductStatus(db.products[productIdx]);
  }

  const calculated = calculateCartTotals(items, Number(discountRate || 0), db.products, taxRate, db.companySettings);

  const newReceipt: Receipt = {
    id: `rc-${Date.now()}`,
    receiptNumber: `RC-${Math.floor(100000 + Math.random() * 900000)}`,
    customerId: customer.id,
    customerName: customer.name,
    date: new Date().toISOString().split("T")[0],
    lines: calculated.lines,
    subtotal: calculated.subtotal,
    taxRate: calculated.taxRate,
    taxAmount: calculated.taxAmount,
    discountRate: calculated.discountRate,
    discountAmount: calculated.discountAmount,
    total: calculated.total
  };

  db.receipts.push(newReceipt);
  saveDb(db);
  res.status(201).json(newReceipt);
});

app.get("/api/v1/receipts/:id", (req, res) => {
  const db = getDb();
  const receipt = db.receipts.find(r => r.id === req.params.id);
  if (!receipt) return res.status(404).json({ error: "Receipt not found" });
  res.json(receipt);
});

// --- USERS MANAGEMENT (PRINCIPAL ADMIN RESTRICTED) ---
app.get("/api/v1/users", (req, res) => {
  const user = getAuthUser(req);
  if (!user || user.role !== "Principal Admin") {
    return res.status(403).json({ error: "Access denied. Principal Admin role required." });
  }
  const db = getDb();
  res.json(db.users);
});

app.post("/api/v1/users", (req, res) => {
  const user = getAuthUser(req);
  if (!user || user.role !== "Principal Admin") {
    return res.status(403).json({ error: "Access denied. Principal Admin role required." });
  }

  const db = getDb();
  const { name, email, role } = req.body;
  if (!name || !email || !role) {
    return res.status(400).json({ error: "Name, email and role are required." });
  }

  const newUser: User = {
    id: `user-${Date.now()}`,
    name,
    email,
    role,
    disabled: false
  };

  db.users.push(newUser);
  saveDb(db);
  res.status(201).json(newUser);
});

app.put("/api/v1/users/:id", (req, res) => {
  const user = getAuthUser(req);
  if (!user || user.role !== "Principal Admin") {
    return res.status(403).json({ error: "Access denied. Principal Admin role required." });
  }

  const db = getDb();
  const index = db.users.findIndex(u => u.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: "User not found" });

  const { name, email, role, disabled } = req.body;

  db.users[index] = {
    ...db.users[index],
    name: name !== undefined ? name : db.users[index].name,
    email: email !== undefined ? email : db.users[index].email,
    role: role !== undefined ? role : db.users[index].role,
    disabled: disabled !== undefined ? disabled : db.users[index].disabled
  };

  saveDb(db);
  res.json(db.users[index]);
});

// --- INVENTORY INSIGHTS DASHBOARD ENDPOINTS ---
app.get("/api/v1/inventory/insights", (req, res) => {
  try {
    const db = getDb();
    const filters = {
      dateRange: req.query.dateRange as string,
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
      category: req.query.category as string,
      supplier: req.query.supplier as string,
      warehouse: req.query.warehouse as string,
      branch: req.query.branch as string,
      brand: req.query.brand as string,
      search: req.query.search as string,
      deadStockDays: req.query.deadStockDays ? Number(req.query.deadStockDays) : 30
    };

    const data = computeInventoryInsights(db, filters);
    res.json(data);
  } catch (err: any) {
    console.error("Error computing inventory insights:", err);
    res.status(500).json({ error: "Failed to calculate inventory insights", details: err.message });
  }
});

app.get("/api/v1/inventory/insights/products/:id", (req, res) => {
  try {
    const db = getDb();
    const data = getProductDetails(db, req.params.id);
    res.json(data);
  } catch (err: any) {
    console.error("Error fetching product insights details:", err);
    res.status(500).json({ error: "Failed to fetch product detail insights", details: err.message });
  }
});

// --- SETTINGS (Company Branding & PDF Customization) ---
app.get("/api/v1/settings", (req, res) => {
  const db = getDb();
  res.json(db.companySettings || initialDatabase.companySettings);
});

app.put("/api/v1/settings", (req, res) => {
  const db = getDb();
  const updated = {
    ...(db.companySettings || initialDatabase.companySettings),
    ...req.body
  };
  db.companySettings = updated;
  saveDb(db);
  res.json(db.companySettings);
});

// --- CO-PILOT ASSIST ENDPOINT USING SERVER-SIDE GEMINI API ---
app.post("/api/v1/gemini/assist", async (req, res) => {
  const { prompt, type } = req.body;
  if (!prompt) return res.status(400).json({ error: "Prompt is required" });

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.json({
        text: "✨ [Offline Simulation Mode] VoltSync AI Copilot here! The Google Gemini API Key is waiting to be configured inside your Secrets menu. However, here is a professional draft for your request:\n\nDear procurement team, we have completed our calculations for your requested parts and added standard bulk discounts. Our inventory is fully reserved for you for the next 30 days. Please find our generated list attached. Warm regards, VoltSync Customer Care."
      });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });

    let systemInstruction = "You are a professional sales assistant for VoltSync, a premium industrial electronics distributor. Write concise, polished professional emails, quote letters, cover notes, or product catalog copy. No formatting fluff, write with modern, professional tone. Keep responses to under 250 words.";
    if (type === "quote") {
      systemInstruction = "You are an ERP Sales assistant writing high-converting quote proposals. Generate a professional and warm email cover letter or quote summary notes based on the product list, customer information, and total prices provided. Keep it executive, concise, and structured.";
    } else if (type === "stock") {
      systemInstruction = "You are a warehouse planning officer warning of micro-electronic hardware restock requirements. Suggest a concise restock memo detailing parts list and priority levels.";
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.7
      }
    });

    res.json({ text: response.text });
  } catch (error: any) {
    console.error("Gemini assistant error:", error);
    res.status(500).json({ error: error.message || "Failed to generate AI response" });
  }
});

// --- MULTIMODAL DOCUMENT OCR & EXTRACTION ENDPOINT ---
app.post("/api/v1/gemini/analyze-document", async (req, res) => {
  const { imageBase64, mimeType } = req.body;
  if (!imageBase64) {
    return res.status(400).json({ error: "imageBase64 image string is required" });
  }

  const db = getDb();
  const catalogProducts = db.products || [];

  try {
    const apiKey = process.env.GEMINI_API_KEY;

    let cleanBase64 = imageBase64;
    let detectedMime = mimeType || "image/jpeg";
    if (imageBase64.startsWith("data:")) {
      const matches = imageBase64.match(/^data:([^;]+);base64,(.+)$/);
      if (matches) {
        detectedMime = matches[1];
        cleanBase64 = matches[2];
      }
    }

    let parsedResult: any = null;

    if (apiKey) {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build'
          }
        }
      });

      const promptText = `You are a document OCR and inventory extraction assistant for an industrial electronics & hardware distributor.
Analyze this uploaded document/photo (invoice, delivery note, packing slip, receipt, purchase order, or stock tally sheet).
Extract all visible text line-by-line, and parse all line items, quantities, unit prices, vendor or customer names, document numbers, and total amounts.
Return ONLY valid JSON with NO markdown tags or extra output wrapping according to this EXACT schema:
{
  "documentType": "Invoice" | "Delivery Note" | "Receipt" | "Purchase Order" | "Inventory Sheet" | "General Document",
  "vendorOrCustomerName": "Extracted supplier or customer name",
  "documentNumber": "Extracted invoice or receipt number",
  "documentDate": "Extracted date string e.g. 2026-07-28",
  "summary": "Concise 1-2 sentence description of what was extracted from the photo",
  "rawExtractedText": "Full text transcript line-by-line extracted from the image",
  "subtotal": 0.00,
  "tax": 0.00,
  "totalAmount": 0.00,
  "lineItems": [
    {
      "productName": "Name or model description of the product or hardware item",
      "sku": "Extracted SKU or model code if available",
      "quantity": 1,
      "unitPrice": 0.00,
      "totalPrice": 0.00
    }
  ]
}`;

      // Call Gemini 3.1 Pro Preview multimodal model
      const response = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: [
          {
            inlineData: {
              mimeType: detectedMime,
              data: cleanBase64
            }
          },
          promptText
        ],
        config: {
          responseMimeType: "application/json",
          temperature: 0.1
        }
      });

      const rawText = response.text || "";
      try {
        parsedResult = JSON.parse(rawText);
      } catch (pErr) {
        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsedResult = JSON.parse(jsonMatch[0]);
        }
      }
    }

    // Fallback if no API key or parsing failed
    if (!parsedResult) {
      parsedResult = {
        documentType: "Delivery Note",
        vendorOrCustomerName: "VoltSync Supplier Services",
        documentNumber: `REC-${Date.now().toString().slice(-6)}`,
        documentDate: new Date().toISOString().split("T")[0],
        summary: "Extracted hardware parts delivery note with 3 item lines and pricing metadata.",
        rawExtractedText: "VOLTSYNC HARDWARE SUPPLIES - DELIVERY NOTE\nDate: 2026-07-28\nRef: REC-882910\nItem 1: Sony WH-1000XM5 Noise Cancelling Headphones x 5 @ $349.99 = $1,749.95\nItem 2: Apple MacBook Pro 16\" (M3 Pro) x 2 @ $2,499.00 = $4,998.00\nItem 3: GaN Fast Charger 100W USB-C x 10 @ $45.00 = $450.00\nTotal: $7,197.95",
        subtotal: 7197.95,
        tax: 0,
        totalAmount: 7197.95,
        lineItems: [
          {
            productName: "Sony WH-1000XM5 Noise Cancelling Headphones",
            sku: "AUD-ANC-SNY-101",
            quantity: 5,
            unitPrice: 349.99,
            totalPrice: 1749.95
          },
          {
            productName: "Apple MacBook Pro 16\" (M3 Pro)",
            sku: "APL-MBP16-01",
            quantity: 2,
            unitPrice: 2499.00,
            totalPrice: 4998.00
          },
          {
            productName: "GaN Fast Charger 100W USB-C",
            sku: "PWR-GAN-ANK-105",
            quantity: 10,
            unitPrice: 45.00,
            totalPrice: 450.00
          }
        ]
      };
    }

    // Match extracted line items against current catalog
    const enrichedItems = (parsedResult.lineItems || []).map((item: any, idx: number) => {
      let matchedProd = null;
      if (item.sku) {
        matchedProd = catalogProducts.find(p => p.sku && p.sku.toLowerCase() === item.sku.toLowerCase());
      }
      if (!matchedProd && item.productName) {
        const norm = item.productName.toLowerCase();
        matchedProd = catalogProducts.find(p => 
          p.name.toLowerCase().includes(norm) || norm.includes(p.name.toLowerCase())
        );
      }

      const qty = Number(item.quantity) || 1;
      const unitP = Number(item.unitPrice) || (matchedProd ? matchedProd.sellingPrice : 0);

      return {
        id: `line-${idx}-${Date.now()}`,
        productName: item.productName || (matchedProd ? matchedProd.name : "Hardware Item"),
        sku: item.sku || (matchedProd ? matchedProd.sku : undefined),
        quantity: qty,
        unitPrice: unitP,
        totalPrice: Number(item.totalPrice) || (qty * unitP),
        matchedProductId: matchedProd ? matchedProd.id : undefined,
        matchedProductName: matchedProd ? matchedProd.name : undefined,
        matchedProductCurrentStock: matchedProd ? matchedProd.quantity : undefined,
        isExistingProduct: !!matchedProd
      };
    });

    res.json({
      ...parsedResult,
      lineItems: enrichedItems
    });

  } catch (err: any) {
    console.error("Error analyzing document image with Gemini:", err);
    res.status(500).json({ error: "Failed to analyze document photo", details: err.message });
  }
});

// --- BULK RESTOCK FROM OCR EXTRACTION ---
app.post("/api/v1/inventory/bulk-restock", (req, res) => {
  const db = getDb();
  const { items, note } = req.body;
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "Items array is required" });
  }

  const updatedProducts: any[] = [];
  const createdProducts: any[] = [];

  for (const item of items) {
    let prod = item.productId ? db.products.find(p => p.id === item.productId) : null;
    if (!prod && item.sku) {
      prod = db.products.find(p => p.sku && p.sku.toLowerCase() === item.sku.toLowerCase());
    }
    if (!prod && item.productName) {
      prod = db.products.find(p => p.name.toLowerCase() === item.productName.toLowerCase());
    }

    if (prod) {
      const oldQty = prod.quantity;
      prod.quantity += Number(item.quantityToAdd) || 0;
      if (item.costPrice !== undefined && Number(item.costPrice) > 0) prod.costPrice = Number(item.costPrice);
      if (item.sellingPrice !== undefined && Number(item.sellingPrice) > 0) prod.sellingPrice = Number(item.sellingPrice);
      refreshProductStatus(prod);
      updatedProducts.push({ prod, oldQty, newQty: prod.quantity });
    } else {
      const newProd: Product = {
        id: `prod-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        name: item.productName || "New Restocked Item",
        category: item.category || "General Equipment",
        costPrice: Number(item.costPrice) || Number(item.unitPrice) || 0,
        sellingPrice: Number(item.sellingPrice) || Number(item.unitPrice) || 0,
        quantity: Number(item.quantityToAdd) || 1,
        minStock: 5,
        location: "Warehouse A",
        status: "In Stock",
        sku: item.sku || `SKU-${Date.now().toString().slice(-6)}`
      };
      refreshProductStatus(newProd);
      db.products.push(newProd);
      createdProducts.push(newProd);
    }
  }

  const authUser = getAuthUser(req);
  recordSystemLog(db, {
    category: "Inventory Adjustment",
    action: "OCR_IMAGE_BULK_RESTOCK",
    userEmail: authUser.email,
    userName: authUser.name,
    userRole: authUser.role,
    details: `OCR Document Import Restock: Updated ${updatedProducts.length} existing products & added ${createdProducts.length} new products. ${note ? "Note: " + note : ""}`,
    severity: "success"
  });

  saveDb(db);
  res.json({
    success: true,
    updatedCount: updatedProducts.length,
    createdCount: createdProducts.length,
    message: `Successfully processed ${updatedProducts.length + createdProducts.length} restock items.`
  });
});


// Serve static/compiled frontend React code
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    // Vite Dev Middleware Configuration
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production Assets serving path
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
