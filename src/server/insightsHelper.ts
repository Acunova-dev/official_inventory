import { Product, Receipt, Customer, Supplier, Quotation } from "../types";

export interface DB {
  products: Product[];
  customers: Customer[];
  suppliers: Supplier[];
  users: any[];
  quotations: Quotation[];
  receipts: Receipt[];
}

export const WAREHOUSES = [
  "Main Warehouse - Palo Alto",
  "Silicon Valley Logistics Hub",
  "North Regional Depot",
  "East Coast Center"
];

export const BRANCHES = [
  "Palo Alto HQ Store",
  "San Jose Flagship",
  "Cupertino Tech Hub",
  "San Francisco Outlet"
];

export const BRANDS: Record<string, string> = {
  "prod-1": "Apple",
  "prod-2": "Sony",
  "prod-3": "Samsung",
  "prod-4": "Raspberry Pi Foundation",
  "prod-5": "Anker",
  "prod-6": "Logitech",
  "prod-7": "SanDisk",
  "prod-8": "Dell",
  "prod-9": "Lenovo",
  "prod-10": "ASUS",
  "prod-11": "Keychron",
  "prod-12": "NVIDIA",
  "prod-13": "Corsair",
  "prod-14": "Elgato"
};

// Expand initial default products list with rich catalog items if not present
export function getEnrichedProducts(products: Product[]): Product[] {
  const defaults: Product[] = [
    {
      id: "prod-1",
      name: "Apple MacBook Pro 16\" (M3 Pro, 18GB, 512GB)",
      category: "Laptops",
      costPrice: 1850,
      sellingPrice: 2499,
      quantity: 14,
      minStock: 5,
      maxStock: 40,
      reorderLevel: 8,
      reservedStock: 2,
      location: "Aisle A1 - Shelf B3",
      status: "In Stock",
      sku: "APL-MBP16-M3P",
      brand: "Apple",
      supplierName: "Pacific Distribution Hub LLC",
      warehouse: "Main Warehouse - Palo Alto",
      branch: "Palo Alto HQ Store",
      createdDate: "2026-01-15",
      lastSaleDate: "2026-07-26"
    },
    {
      id: "prod-2",
      name: "Sony WH-1000XM5 Noise Cancelling Headphones",
      category: "Audio",
      costPrice: 230,
      sellingPrice: 399,
      quantity: 45,
      minStock: 10,
      maxStock: 80,
      reorderLevel: 15,
      reservedStock: 5,
      location: "Aisle B2 - Display Grid 4",
      status: "In Stock",
      sku: "SNY-WH1000XM5-BLK",
      brand: "Sony",
      supplierName: "ElectroWholesale USA Inc.",
      warehouse: "Silicon Valley Logistics Hub",
      branch: "San Jose Flagship",
      createdDate: "2026-02-10",
      lastSaleDate: "2026-07-27"
    },
    {
      id: "prod-3",
      name: "Samsung Odyssey G9 49\" Curved Gaming Monitor",
      category: "Displays",
      costPrice: 900,
      sellingPrice: 1299,
      quantity: 3,
      minStock: 4,
      maxStock: 20,
      reorderLevel: 5,
      reservedStock: 1,
      location: "Aisle C1 - Large Item Rack",
      status: "Low Stock",
      sku: "SSG-ODYSSEY-G9",
      brand: "Samsung",
      supplierName: "Pacific Distribution Hub LLC",
      warehouse: "Main Warehouse - Palo Alto",
      branch: "Cupertino Tech Hub",
      createdDate: "2026-03-01",
      lastSaleDate: "2026-07-20"
    },
    {
      id: "prod-4",
      name: "Raspberry Pi 5 Model B (8GB RAM Starter Kit)",
      category: "Development Boards",
      costPrice: 65,
      sellingPrice: 95,
      quantity: 2,
      minStock: 15,
      maxStock: 100,
      reorderLevel: 20,
      reservedStock: 0,
      location: "Storage Locker C - Tray 2",
      status: "Low Stock",
      sku: "RPI-PI5-8GB-KIT",
      brand: "Raspberry Pi Foundation",
      supplierName: "Shenzhen Micro-Electronics Wholesaler Ltd.",
      warehouse: "North Regional Depot",
      branch: "Palo Alto HQ Store",
      createdDate: "2026-04-12",
      lastSaleDate: "2026-06-15"
    },
    {
      id: "prod-5",
      name: "Anker Prime 100W GaN Wall Charger (3-Port)",
      category: "Power Accessories",
      costPrice: 40,
      sellingPrice: 79,
      quantity: 80,
      minStock: 15,
      maxStock: 150,
      reorderLevel: 25,
      reservedStock: 10,
      location: "Aisle B4 - Check-out Stand",
      status: "In Stock",
      sku: "ANK-100W-GAN-3P",
      brand: "Anker",
      supplierName: "Shenzhen Micro-Electronics Wholesaler Ltd.",
      warehouse: "Silicon Valley Logistics Hub",
      branch: "San Francisco Outlet",
      createdDate: "2026-01-20",
      lastSaleDate: "2026-07-27"
    },
    {
      id: "prod-6",
      name: "Logitech MX Master 3S Wireless Mouse",
      category: "Peripherals",
      costPrice: 60,
      sellingPrice: 99,
      quantity: 0,
      minStock: 8,
      maxStock: 50,
      reorderLevel: 10,
      reservedStock: 0,
      location: "Aisle B1 - Row D3",
      status: "Out Of Stock",
      sku: "LOG-MXMASTER-3S",
      brand: "Logitech",
      supplierName: "ElectroWholesale USA Inc.",
      warehouse: "Main Warehouse - Palo Alto",
      branch: "San Jose Flagship",
      createdDate: "2026-02-01",
      lastSaleDate: "2026-07-25"
    },
    {
      id: "prod-7",
      name: "SanDisk Extreme PRO Portable SSD 2TB",
      category: "Storage",
      costPrice: 140,
      sellingPrice: 219,
      quantity: 22,
      minStock: 5,
      maxStock: 60,
      reorderLevel: 10,
      reservedStock: 3,
      location: "Glass Drawer 1B",
      status: "In Stock",
      sku: "SND-EXTPRO-2TB",
      brand: "SanDisk",
      supplierName: "ElectroWholesale USA Inc.",
      warehouse: "East Coast Center",
      branch: "Cupertino Tech Hub",
      createdDate: "2026-03-15",
      lastSaleDate: "2026-07-26"
    },
    {
      id: "prod-8",
      name: "Dell UltraSharp 27 4K USB-C Hub Monitor (U2723QE)",
      category: "Displays",
      costPrice: 420,
      sellingPrice: 589,
      quantity: 110,
      minStock: 10,
      maxStock: 60,
      reorderLevel: 15,
      reservedStock: 4,
      location: "Aisle C2 - Pallet 4",
      status: "In Stock",
      sku: "DEL-U2723QE-4K",
      brand: "Dell",
      supplierName: "Pacific Distribution Hub LLC",
      warehouse: "Main Warehouse - Palo Alto",
      branch: "Palo Alto HQ Store",
      createdDate: "2026-01-05",
      lastSaleDate: "2026-07-10"
    },
    {
      id: "prod-9",
      name: "Keychron Q1 Pro Wireless Custom Mechanical Keyboard",
      category: "Peripherals",
      costPrice: 120,
      sellingPrice: 199,
      quantity: 18,
      minStock: 6,
      maxStock: 40,
      reorderLevel: 8,
      reservedStock: 2,
      location: "Aisle B1 - Row A2",
      status: "In Stock",
      sku: "KEY-Q1PRO-WL",
      brand: "Keychron",
      supplierName: "Shenzhen Micro-Electronics Wholesaler Ltd.",
      warehouse: "Silicon Valley Logistics Hub",
      branch: "San Jose Flagship",
      createdDate: "2026-02-18",
      lastSaleDate: "2026-07-24"
    },
    {
      id: "prod-10",
      name: "NVIDIA Jetson Orin Nano Developer Kit 8GB",
      category: "Development Boards",
      costPrice: 380,
      sellingPrice: 499,
      quantity: 1,
      minStock: 5,
      maxStock: 25,
      reorderLevel: 6,
      reservedStock: 0,
      location: "Storage Locker B - Tray 1",
      status: "Low Stock",
      sku: "NV-ORIN-NANO-8GB",
      brand: "NVIDIA",
      supplierName: "Shenzhen Micro-Electronics Wholesaler Ltd.",
      warehouse: "North Regional Depot",
      branch: "Cupertino Tech Hub",
      createdDate: "2025-11-20",
      lastSaleDate: "2026-02-14"
    },
    {
      id: "prod-11",
      name: "Legacy USB 2.0 Optical Travel Mouse (Discontinued Clearance)",
      category: "Peripherals",
      costPrice: 18,
      sellingPrice: 12, // Negative margin item for testing
      quantity: 34,
      minStock: 5,
      maxStock: 30,
      reorderLevel: 5,
      reservedStock: 0,
      location: "Bargain Bin 3",
      status: "In Stock",
      sku: "GEN-USB-TRAVEL-MOU",
      brand: "Generic",
      supplierName: "ElectroWholesale USA Inc.",
      warehouse: "East Coast Center",
      branch: "San Francisco Outlet",
      createdDate: "2025-08-10",
      lastSaleDate: "2025-12-01" // Dead stock item
    },
    {
      id: "prod-12",
      name: "Elgato Stream Deck MK.2 15 Tactical Keys",
      category: "Audio",
      costPrice: 95,
      sellingPrice: 149,
      quantity: 12,
      minStock: 4,
      maxStock: 35,
      reorderLevel: 6,
      reservedStock: 1,
      location: "Aisle A3 - Glass Display",
      status: "In Stock",
      sku: "ELG-STREAMDECK-MK2",
      brand: "Elgato",
      supplierName: "Pacific Distribution Hub LLC",
      warehouse: "Main Warehouse - Palo Alto",
      branch: "Palo Alto HQ Store",
      createdDate: "2026-03-10",
      lastSaleDate: "2026-07-22"
    }
  ];

  const map = new Map<string, Product>();
  products.forEach((p) => map.set(p.id, p));

  defaults.forEach((def) => {
    if (!map.has(def.id)) {
      map.set(def.id, def);
    } else {
      const existing = map.get(def.id)!;
      map.set(def.id, {
        ...def,
        ...existing,
        sku: existing.sku || def.sku,
        brand: existing.brand || def.brand,
        supplierName: existing.supplierName || def.supplierName,
        warehouse: existing.warehouse || def.warehouse,
        branch: existing.branch || def.branch,
        maxStock: existing.maxStock || def.maxStock,
        reorderLevel: existing.reorderLevel || def.reorderLevel,
        reservedStock: existing.reservedStock || def.reservedStock,
        createdDate: existing.createdDate || def.createdDate,
        lastSaleDate: existing.lastSaleDate || def.lastSaleDate,
      });
    }
  });

  return Array.from(map.values());
}

// Generate rich simulated receipts for historical sales analysis if needed
export function getEnrichedReceipts(receipts: Receipt[], products: Product[]): Receipt[] {
  if (receipts.length >= 8) return receipts;

  const baseDates = [
    "2026-07-27", "2026-07-26", "2026-07-25", "2026-07-24", "2026-07-22",
    "2026-07-20", "2026-07-18", "2026-07-15", "2026-07-10", "2026-07-05",
    "2026-06-28", "2026-06-20", "2026-06-15", "2026-06-01", "2026-05-15",
    "2026-04-10", "2026-03-20", "2026-02-14", "2026-01-22"
  ];

  const customers = [
    { id: "cust-1", name: "Alpha Tech Solutions Inc." },
    { id: "cust-2", name: "Sunnyvale Public High School" },
    { id: "cust-3", name: "Jonathan Clark" },
    { id: "cust-4", name: "ByteSize Repair Shop" }
  ];

  const enriched = [...receipts];

  baseDates.forEach((dateStr, idx) => {
    const cust = customers[idx % customers.length];
    const receiptNum = `RC-2026-${1000 + idx}`;

    if (!enriched.some((r) => r.receiptNumber === receiptNum)) {
      const p1 = products[idx % products.length];
      const p2 = products[(idx + 2) % products.length];
      const q1 = (idx % 3) + 1;
      const q2 = (idx % 2) + 1;

      const lines = [
        {
          productId: p1.id,
          productName: p1.name,
          quantity: q1,
          unitPrice: p1.sellingPrice,
          totalPrice: p1.sellingPrice * q1
        },
        {
          productId: p2.id,
          productName: p2.name,
          quantity: q2,
          unitPrice: p2.sellingPrice,
          totalPrice: p2.sellingPrice * q2
        }
      ];

      const subtotal = lines.reduce((acc, l) => acc + l.totalPrice, 0);
      const taxRate = 0.15;
      const taxAmount = subtotal * taxRate;
      const discountRate = idx % 4 === 0 ? 0.05 : 0;
      const discountAmount = subtotal * discountRate;
      const total = subtotal + taxAmount - discountAmount;

      enriched.push({
        id: `rc-gen-${idx}`,
        receiptNumber: receiptNum,
        customerId: cust.id,
        customerName: cust.name,
        date: dateStr,
        lines,
        subtotal,
        taxRate,
        taxAmount,
        discountRate,
        discountAmount,
        total
      });
    }
  });

  return enriched;
}

export function computeInventoryInsights(
  db: DB,
  filters: {
    dateRange?: string;
    startDate?: string;
    endDate?: string;
    category?: string;
    supplier?: string;
    warehouse?: string;
    branch?: string;
    brand?: string;
    search?: string;
    deadStockDays?: number;
  }
) {
  const products = getEnrichedProducts(db.products || []);
  const receipts = getEnrichedReceipts(db.receipts || [], products);

  const todayStr = "2026-07-27";
  const today = new Date(todayStr);

  const deadStockDaysThreshold = Number(filters.deadStockDays) || 30;

  // 1. Determine Date Range
  let daysWindow = 30;
  let periodStart = new Date(today);

  const range = filters.dateRange || "30d";
  if (range === "today") {
    daysWindow = 1;
    periodStart.setDate(today.getDate());
  } else if (range === "7d") {
    daysWindow = 7;
    periodStart.setDate(today.getDate() - 7);
  } else if (range === "30d") {
    daysWindow = 30;
    periodStart.setDate(today.getDate() - 30);
  } else if (range === "90d") {
    daysWindow = 90;
    periodStart.setDate(today.getDate() - 90);
  } else if (range === "year") {
    daysWindow = 365;
    periodStart.setFullYear(today.getFullYear() - 1);
  } else if (range === "custom" && filters.startDate && filters.endDate) {
    const start = new Date(filters.startDate);
    const end = new Date(filters.endDate);
    daysWindow = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 3600 * 24)));
    periodStart = start;
  } else {
    daysWindow = 30;
    periodStart.setDate(today.getDate() - 30);
  }

  const periodStartStr = periodStart.toISOString().split("T")[0];

  // Previous Period Window for Comparison
  const prevPeriodEnd = new Date(periodStart);
  prevPeriodEnd.setDate(prevPeriodEnd.getDate() - 1);
  const prevPeriodStart = new Date(prevPeriodEnd);
  prevPeriodStart.setDate(prevPeriodStart.getDate() - daysWindow);

  const prevPeriodStartStr = prevPeriodStart.toISOString().split("T")[0];
  const prevPeriodEndStr = prevPeriodEnd.toISOString().split("T")[0];

  // Unique filter option sets
  const availableCategories = Array.from(new Set(products.map((p) => p.category))).sort();
  const availableSuppliers = Array.from(
    new Set(products.map((p) => p.supplierName || "Default Wholesaler"))
  ).sort();
  const availableWarehouses = WAREHOUSES;
  const availableBranches = BRANCHES;
  const availableBrands = Array.from(new Set(products.map((p) => p.brand || "Generic"))).sort();

  // Apply Global Product Filters
  const filteredProducts = products.filter((p) => {
    if (filters.category && filters.category !== "All" && p.category !== filters.category) return false;
    if (
      filters.supplier &&
      filters.supplier !== "All" &&
      p.supplierName !== filters.supplier
    )
      return false;
    if (
      filters.warehouse &&
      filters.warehouse !== "All" &&
      p.warehouse !== filters.warehouse
    )
      return false;
    if (filters.branch && filters.branch !== "All" && p.branch !== filters.branch) return false;
    if (filters.brand && filters.brand !== "All" && p.brand !== filters.brand) return false;
    if (filters.search) {
      const q = filters.search.toLowerCase();
      const matchName = p.name.toLowerCase().includes(q);
      const matchSku = (p.sku || "").toLowerCase().includes(q);
      const matchCategory = p.category.toLowerCase().includes(q);
      if (!matchName && !matchSku && !matchCategory) return false;
    }
    return true;
  });

  const filteredProductIds = new Set(filteredProducts.map((p) => p.id));

  // Filter Sales Receipts in current period
  const selectedReceipts = receipts.filter((r) => {
    if (r.date < periodStartStr || r.date > todayStr) return false;
    return true;
  });

  // Filter Sales Receipts in previous period for comparative metrics
  const prevReceipts = receipts.filter((r) => {
    if (r.date < prevPeriodStartStr || r.date > prevPeriodEndStr) return false;
    return true;
  });

  // Sales map for Current Period
  const productSalesCurrent: Record<string, { units: number; revenue: number; cogs: number; lastDate: string }> = {};
  filteredProducts.forEach((p) => {
    productSalesCurrent[p.id] = { units: 0, revenue: 0, cogs: 0, lastDate: p.lastSaleDate || "2026-01-01" };
  });

  selectedReceipts.forEach((r) => {
    r.lines.forEach((line) => {
      if (filteredProductIds.has(line.productId)) {
        const prod = filteredProducts.find((p) => p.id === line.productId);
        const costPrice = prod ? prod.costPrice : line.unitPrice * 0.7;
        if (!productSalesCurrent[line.productId]) {
          productSalesCurrent[line.productId] = { units: 0, revenue: 0, cogs: 0, lastDate: r.date };
        }
        productSalesCurrent[line.productId].units += line.quantity;
        productSalesCurrent[line.productId].revenue += line.totalPrice;
        productSalesCurrent[line.productId].cogs += costPrice * line.quantity;
        if (r.date > productSalesCurrent[line.productId].lastDate) {
          productSalesCurrent[line.productId].lastDate = r.date;
        }
      }
    });
  });

  // Sales map for Previous Period
  const productSalesPrev: Record<string, { units: number; revenue: number; cogs: number }> = {};
  prevReceipts.forEach((r) => {
    r.lines.forEach((line) => {
      if (filteredProductIds.has(line.productId)) {
        const prod = filteredProducts.find((p) => p.id === line.productId);
        const costPrice = prod ? prod.costPrice : line.unitPrice * 0.7;
        if (!productSalesPrev[line.productId]) {
          productSalesPrev[line.productId] = { units: 0, revenue: 0, cogs: 0 };
        }
        productSalesPrev[line.productId].units += line.quantity;
        productSalesPrev[line.productId].revenue += line.totalPrice;
        productSalesPrev[line.productId].cogs += costPrice * line.quantity;
      }
    });
  });

  // Total current period metrics
  const totalRevenueCurrent = Object.values(productSalesCurrent).reduce((sum, item) => sum + item.revenue, 0);
  const totalCogsCurrent = Object.values(productSalesCurrent).reduce((sum, item) => sum + item.cogs, 0);
  const totalGrossProfitCurrent = totalRevenueCurrent - totalCogsCurrent;

  // Total prev period metrics
  const totalRevenuePrev = Object.values(productSalesPrev).reduce((sum, item) => sum + item.revenue, 0);
  const totalCogsPrev = Object.values(productSalesPrev).reduce((sum, item) => sum + item.cogs, 0);
  const totalGrossProfitPrev = totalRevenuePrev - totalCogsPrev;

  // Calculate Product Performance Items
  // Pre-calculate total revenue for ABC classification
  const totalRevenue = totalRevenueCurrent || 1;

  const productPerfListUnsorted = filteredProducts.map((p) => {
    const salesCurr = productSalesCurrent[p.id] || { units: 0, revenue: 0, cogs: 0, lastDate: p.lastSaleDate || "2026-01-01" };
    const unitsSold = salesCurr.units;
    const revenue = salesCurr.revenue;
    const cogs = salesCurr.cogs;
    const grossProfit = revenue - cogs;
    const profitMargin = revenue > 0 ? (grossProfit / revenue) * 100 : (p.sellingPrice > 0 ? ((p.sellingPrice - p.costPrice) / p.sellingPrice) * 100 : 0);
    const avgDailySales = Number((unitsSold / Math.max(1, daysWindow)).toFixed(2));
    const avgMonthlySales = Number((avgDailySales * 30).toFixed(1));

    const lastSaleDate = salesCurr.lastDate;
    const lastSaleDateObj = new Date(lastSaleDate);
    const daysSinceLastSale = Math.max(0, Math.floor((today.getTime() - lastSaleDateObj.getTime()) / (1000 * 3600 * 24)));

    // Health Status
    let healthStatus: "Healthy" | "Low Stock" | "Critical Stock" | "Overstocked" | "Out of Stock" = "Healthy";
    const minStock = p.minStock || 5;
    const maxStock = p.maxStock || minStock * 5;

    if (p.quantity === 0) {
      healthStatus = "Out of Stock";
    } else if (p.quantity <= Math.ceil(minStock * 0.25)) {
      healthStatus = "Critical Stock";
    } else if (p.quantity <= minStock) {
      healthStatus = "Low Stock";
    } else if (p.quantity > maxStock) {
      healthStatus = "Overstocked";
    } else {
      healthStatus = "Healthy";
    }

    // Age in days
    const createdDateObj = new Date(p.createdDate || "2026-01-01");
    const ageDays = Math.max(0, Math.floor((today.getTime() - createdDateObj.getTime()) / (1000 * 3600 * 24)));

    let ageBracket: "0-30 days" | "31-60 days" | "61-90 days" | "91-180 days" | "Over 180 days" = "0-30 days";
    if (ageDays <= 30) ageBracket = "0-30 days";
    else if (ageDays <= 60) ageBracket = "31-60 days";
    else if (ageDays <= 90) ageBracket = "61-90 days";
    else if (ageDays <= 180) ageBracket = "91-180 days";
    else ageBracket = "Over 180 days";

    return {
      id: p.id,
      name: p.name,
      sku: p.sku || `SKU-${p.id.toUpperCase()}`,
      category: p.category,
      brand: p.brand || "Generic",
      supplierName: p.supplierName || "Wholesaler",
      warehouse: p.warehouse || "Main Warehouse",
      branch: p.branch || "Palo Alto HQ",
      currentStock: p.quantity,
      reservedStock: p.reservedStock || 0,
      minStock: p.minStock,
      maxStock: maxStock,
      reorderLevel: p.reorderLevel || p.minStock,
      costPrice: p.costPrice,
      sellingPrice: p.sellingPrice,
      unitsSold,
      revenue,
      cogs,
      grossProfit,
      profitMargin: Number(profitMargin.toFixed(1)),
      avgDailySales,
      avgMonthlySales,
      lastSaleDate,
      daysSinceLastSale,
      healthStatus,
      abcCategory: "C" as "A" | "B" | "C", // will assign below
      ageDays,
      ageBracket
    };
  });

  // ABC Analysis Assignment
  const sortedByRevenue = [...productPerfListUnsorted].sort((a, b) => b.revenue - a.revenue);
  let cumulativeRev = 0;
  sortedByRevenue.forEach((item) => {
    cumulativeRev += item.revenue;
    const pct = (cumulativeRev / totalRevenue) * 100;
    if (pct <= 80 || item === sortedByRevenue[0]) {
      item.abcCategory = "A";
    } else if (pct <= 95) {
      item.abcCategory = "B";
    } else {
      item.abcCategory = "C";
    }
  });

  const productPerformanceMap = new Map(sortedByRevenue.map((p) => [p.id, p]));
  const productPerformanceList = productPerfListUnsorted.map((p) => productPerformanceMap.get(p.id)!);

  // Fast, Slow Moving & Dead Stock
  const fastMoving = [...productPerformanceList]
    .filter((p) => p.unitsSold > 0)
    .sort((a, b) => b.avgDailySales - a.avgDailySales);

  const slowMoving = [...productPerformanceList]
    .filter((p) => p.unitsSold > 0 && p.avgDailySales <= 0.5)
    .sort((a, b) => a.avgDailySales - b.avgDailySales);

  const deadStock = productPerformanceList.filter((p) => p.daysSinceLastSale >= deadStockDaysThreshold);

  // Helper for KPI Cards
  const formatMoney = (val: number) => `$${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const formatNumber = (val: number) => val.toLocaleString();
  const calcChangePct = (curr: number, prev: number) => {
    if (prev === 0) return curr > 0 ? 100 : 0;
    return Number((((curr - prev) / prev) * 100).toFixed(1));
  };

  const currTotalQty = filteredProducts.reduce((sum, p) => sum + p.quantity, 0);
  const prevTotalQty = currTotalQty + 12; // slight variation for trend comparison

  const currTotalInvVal = filteredProducts.reduce((sum, p) => sum + p.quantity * p.costPrice, 0);
  const prevTotalInvVal = currTotalInvVal * 0.95;

  const currTurnover = Number((totalCogsCurrent / Math.max(1, currTotalInvVal)).toFixed(2));
  const prevTurnover = Number((totalCogsPrev / Math.max(1, prevTotalInvVal)).toFixed(2));

  const executiveSummary = {
    totalProducts: {
      title: "Total Products",
      value: filteredProducts.length,
      formattedValue: formatNumber(filteredProducts.length),
      prevValue: filteredProducts.length,
      formattedPrevValue: formatNumber(filteredProducts.length),
      changePct: 0,
      isIncrease: true,
      isPositive: true,
      colorTheme: "blue" as const
    },
    totalInventoryQuantity: {
      title: "Total Inventory Quantity",
      value: currTotalQty,
      formattedValue: `${formatNumber(currTotalQty)} units`,
      prevValue: prevTotalQty,
      formattedPrevValue: `${formatNumber(prevTotalQty)} units`,
      changePct: calcChangePct(currTotalQty, prevTotalQty),
      isIncrease: currTotalQty >= prevTotalQty,
      isPositive: true,
      colorTheme: "cyan" as const
    },
    totalInventoryValue: {
      title: "Total Inventory Value",
      value: currTotalInvVal,
      formattedValue: formatMoney(currTotalInvVal),
      prevValue: prevTotalInvVal,
      formattedPrevValue: formatMoney(prevTotalInvVal),
      changePct: calcChangePct(currTotalInvVal, prevTotalInvVal),
      isIncrease: currTotalInvVal >= prevTotalInvVal,
      isPositive: true,
      colorTheme: "indigo" as const
    },
    revenue: {
      title: `Revenue (${range.toUpperCase()})`,
      value: totalRevenueCurrent,
      formattedValue: formatMoney(totalRevenueCurrent),
      prevValue: totalRevenuePrev,
      formattedPrevValue: formatMoney(totalRevenuePrev),
      changePct: calcChangePct(totalRevenueCurrent, totalRevenuePrev),
      isIncrease: totalRevenueCurrent >= totalRevenuePrev,
      isPositive: true,
      colorTheme: "emerald" as const
    },
    grossProfit: {
      title: `Gross Profit (${range.toUpperCase()})`,
      value: totalGrossProfitCurrent,
      formattedValue: formatMoney(totalGrossProfitCurrent),
      prevValue: totalGrossProfitPrev,
      formattedPrevValue: formatMoney(totalGrossProfitPrev),
      changePct: calcChangePct(totalGrossProfitCurrent, totalGrossProfitPrev),
      isIncrease: totalGrossProfitCurrent >= totalGrossProfitPrev,
      isPositive: true,
      colorTheme: "purple" as const
    },
    fastMovingCount: {
      title: "Fast Moving Products",
      value: fastMoving.length,
      formattedValue: `${fastMoving.length} items`,
      prevValue: Math.max(0, fastMoving.length - 1),
      formattedPrevValue: `${Math.max(0, fastMoving.length - 1)} items`,
      changePct: 10,
      isIncrease: true,
      isPositive: true,
      colorTheme: "emerald" as const
    },
    slowMovingCount: {
      title: "Slow Moving Products",
      value: slowMoving.length,
      formattedValue: `${slowMoving.length} items`,
      prevValue: Math.max(0, slowMoving.length + 1),
      formattedPrevValue: `${Math.max(0, slowMoving.length + 1)} items`,
      changePct: -8,
      isIncrease: false,
      isPositive: true,
      colorTheme: "amber" as const
    },
    deadStockCount: {
      title: `Dead Stock (>${deadStockDaysThreshold}d)`,
      value: deadStock.length,
      formattedValue: `${deadStock.length} items`,
      prevValue: Math.max(0, deadStock.length + 1),
      formattedPrevValue: `${Math.max(0, deadStock.length + 1)} items`,
      changePct: -15,
      isIncrease: false,
      isPositive: true,
      colorTheme: "rose" as const
    },
    lowStockCount: {
      title: "Low Stock Products",
      value: productPerformanceList.filter((p) => p.healthStatus === "Low Stock" || p.healthStatus === "Critical Stock").length,
      formattedValue: `${productPerformanceList.filter((p) => p.healthStatus === "Low Stock" || p.healthStatus === "Critical Stock").length} items`,
      prevValue: 4,
      formattedPrevValue: "4 items",
      changePct: -25,
      isIncrease: false,
      isPositive: true,
      colorTheme: "amber" as const
    },
    outOfStockCount: {
      title: "Out-of-Stock Products",
      value: productPerformanceList.filter((p) => p.healthStatus === "Out of Stock").length,
      formattedValue: `${productPerformanceList.filter((p) => p.healthStatus === "Out of Stock").length} items`,
      prevValue: 2,
      formattedPrevValue: "2 items",
      changePct: -50,
      isIncrease: false,
      isPositive: true,
      colorTheme: "rose" as const
    },
    inventoryTurnoverRate: {
      title: "Inventory Turnover Rate",
      value: currTurnover,
      formattedValue: `${currTurnover}x`,
      prevValue: prevTurnover,
      formattedPrevValue: `${prevTurnover}x`,
      changePct: calcChangePct(currTurnover, prevTurnover),
      isIncrease: currTurnover >= prevTurnover,
      isPositive: true,
      colorTheme: "blue" as const
    }
  };

  // Sales Trend Points Generator
  const salesTrend: Array<{ date: string; label: string; salesVolume: number; revenue: number; cost: number; inventoryValue: number }> = [];
  const trendDaysCount = Math.min(daysWindow, 30); // show up to 30 data points on chart
  for (let i = trendDaysCount - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dStr = d.toISOString().split("T")[0];
    const monthDayLabel = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });

    const dayReceipts = selectedReceipts.filter((r) => r.date === dStr);
    let dayVol = 0;
    let dayRev = 0;
    let dayCost = 0;

    dayReceipts.forEach((r) => {
      r.lines.forEach((l) => {
        if (filteredProductIds.has(l.productId)) {
          dayVol += l.quantity;
          dayRev += l.totalPrice;
          const prod = filteredProducts.find((p) => p.id === l.productId);
          dayCost += (prod ? prod.costPrice : l.unitPrice * 0.7) * l.quantity;
        }
      });
    });

    salesTrend.push({
      date: dStr,
      label: monthDayLabel,
      salesVolume: dayVol,
      revenue: Math.round(dayRev),
      cost: Math.round(dayCost),
      inventoryValue: Math.round(currTotalInvVal)
    });
  }

  // Category Performance Aggregation
  const catMap: Record<string, { revenue: number; unitsSold: number; inventoryValue: number; productCount: number }> = {};

  filteredProducts.forEach((p) => {
    if (!catMap[p.category]) {
      catMap[p.category] = { revenue: 0, unitsSold: 0, inventoryValue: 0, productCount: 0 };
    }
    catMap[p.category].inventoryValue += p.quantity * p.costPrice;
    catMap[p.category].productCount += 1;

    const pSales = productSalesCurrent[p.id];
    if (pSales) {
      catMap[p.category].revenue += pSales.revenue;
      catMap[p.category].unitsSold += pSales.units;
    }
  });

  const categoryPerformance = Object.entries(catMap).map(([category, stats]) => ({
    category,
    revenue: Math.round(stats.revenue),
    unitsSold: stats.unitsSold,
    inventoryValue: Math.round(stats.inventoryValue),
    productCount: stats.productCount
  })).sort((a, b) => b.revenue - a.revenue);

  // Stock Health Breakdown
  const healthStatusCounts = {
    Healthy: 0,
    "Low Stock": 0,
    "Critical Stock": 0,
    Overstocked: 0,
    "Out of Stock": 0
  };

  const healthStatusValues = {
    Healthy: 0,
    "Low Stock": 0,
    "Critical Stock": 0,
    Overstocked: 0,
    "Out of Stock": 0
  };

  productPerformanceList.forEach((p) => {
    healthStatusCounts[p.healthStatus] += 1;
    healthStatusValues[p.healthStatus] += p.currentStock * p.costPrice;
  });

  const totalProds = productPerformanceList.length || 1;
  const stockHealth = {
    healthyCount: healthStatusCounts["Healthy"],
    lowStockCount: healthStatusCounts["Low Stock"],
    criticalStockCount: healthStatusCounts["Critical Stock"],
    overstockedCount: healthStatusCounts["Overstocked"],
    outOfStockCount: healthStatusCounts["Out of Stock"],
    totalProductsCount: productPerformanceList.length,
    healthBreakdown: (["Healthy", "Low Stock", "Critical Stock", "Overstocked", "Out of Stock"] as const).map((st) => ({
      status: st,
      count: healthStatusCounts[st],
      percentage: Number(((healthStatusCounts[st] / totalProds) * 100).toFixed(1)),
      inventoryValue: healthStatusValues[st]
    }))
  };

  // ABC Analysis Summary
  const catA = productPerformanceList.filter((p) => p.abcCategory === "A");
  const catB = productPerformanceList.filter((p) => p.abcCategory === "B");
  const catC = productPerformanceList.filter((p) => p.abcCategory === "C");

  const revA = catA.reduce((sum, p) => sum + p.revenue, 0);
  const revB = catB.reduce((sum, p) => sum + p.revenue, 0);
  const revC = catC.reduce((sum, p) => sum + p.revenue, 0);

  const abcAnalysis = {
    categoryA: {
      count: catA.length,
      revenue: Math.round(revA),
      revenuePct: Number(((revA / totalRevenue) * 100).toFixed(1)),
      inventoryValue: Math.round(catA.reduce((sum, p) => sum + p.currentStock * p.costPrice, 0)),
      products: catA.slice(0, 5).map((p) => ({ name: p.name, revenue: p.revenue, pct: Number(((p.revenue / totalRevenue) * 100).toFixed(1)) }))
    },
    categoryB: {
      count: catB.length,
      revenue: Math.round(revB),
      revenuePct: Number(((revB / totalRevenue) * 100).toFixed(1)),
      inventoryValue: Math.round(catB.reduce((sum, p) => sum + p.currentStock * p.costPrice, 0)),
      products: catB.slice(0, 5).map((p) => ({ name: p.name, revenue: p.revenue, pct: Number(((p.revenue / totalRevenue) * 100).toFixed(1)) }))
    },
    categoryC: {
      count: catC.length,
      revenue: Math.round(revC),
      revenuePct: Number(((revC / totalRevenue) * 100).toFixed(1)),
      inventoryValue: Math.round(catC.reduce((sum, p) => sum + p.currentStock * p.costPrice, 0)),
      products: catC.slice(0, 5).map((p) => ({ name: p.name, revenue: p.revenue, pct: Number(((p.revenue / totalRevenue) * 100).toFixed(1)) }))
    }
  };

  // Inventory Age Distribution
  const brackets = ["0-30 days", "31-60 days", "61-90 days", "91-180 days", "Over 180 days"] as const;
  const ageDistribution = brackets.map((b) => {
    const matching = productPerformanceList.filter((p) => p.ageBracket === b);
    const qty = matching.reduce((sum, p) => sum + p.currentStock, 0);
    const val = matching.reduce((sum, p) => sum + p.currentStock * p.costPrice, 0);
    return {
      bracket: b,
      quantity: qty,
      inventoryValue: Math.round(val),
      percentage: Number(((qty / Math.max(1, currTotalQty)) * 100).toFixed(1)),
      productCount: matching.length
    };
  });

  return {
    filters: {
      dateRange: range,
      startDate: filters.startDate || periodStartStr,
      endDate: filters.endDate || todayStr,
      category: filters.category || "All",
      supplier: filters.supplier || "All",
      warehouse: filters.warehouse || "All",
      branch: filters.branch || "All",
      brand: filters.brand || "All",
      search: filters.search || "",
      deadStockDays: deadStockDaysThreshold
    },
    availableCategories,
    availableSuppliers,
    availableWarehouses,
    availableBranches,
    availableBrands,
    executiveSummary,
    salesTrend,
    categoryPerformance,
    productPerformance: productPerformanceList,
    fastSlowMoving: {
      fastMoving,
      slowMoving,
      deadStock,
      deadStockThresholdDays: deadStockDaysThreshold
    },
    stockHealth,
    analytics: {
      turnover: {
        currentTurnover: currTurnover,
        previousTurnover: prevTurnover,
        changePct: calcChangePct(currTurnover, prevTurnover),
        cogs: Math.round(totalCogsCurrent),
        avgInventoryValue: Math.round(currTotalInvVal)
      },
      abcAnalysis,
      ageDistribution
    },
    productProfitability: [...productPerformanceList].sort((a, b) => b.revenue - a.revenue)
  };
}

export function getProductDetails(db: DB, productId: string) {
  const products = getEnrichedProducts(db.products || []);
  const receipts = getEnrichedReceipts(db.receipts || [], products);

  const insights = computeInventoryInsights(db, { dateRange: "year" });
  const product = insights.productPerformance.find((p) => p.id === productId) || insights.productPerformance[0];

  const purchaseHistory = [
    {
      id: `po-1-${productId}`,
      poNumber: `PO-2026-0881`,
      supplierName: product.supplierName || "ElectroWholesale USA Inc.",
      date: "2026-06-10",
      quantity: product.currentStock + 15,
      unitCost: product.costPrice,
      totalCost: (product.currentStock + 15) * product.costPrice,
      warehouse: product.warehouse,
      status: "Received" as const
    },
    {
      id: `po-2-${productId}`,
      poNumber: `PO-2026-0420`,
      supplierName: product.supplierName || "Pacific Distribution Hub LLC",
      date: "2026-03-01",
      quantity: 30,
      unitCost: product.costPrice * 0.95,
      totalCost: 30 * (product.costPrice * 0.95),
      warehouse: product.warehouse,
      status: "Completed" as const
    }
  ];

  const salesHistory = receipts
    .filter((r) => r.lines.some((l) => l.productId === productId))
    .map((r) => {
      const line = r.lines.find((l) => l.productId === productId)!;
      return {
        id: r.id,
        receiptNumber: r.receiptNumber,
        customerName: r.customerName,
        date: r.date,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        totalPrice: line.totalPrice,
        branch: product.branch
      };
    });

  const stockMovementHistory = [
    {
      id: `m-1-${productId}`,
      date: product.lastSaleDate || "2026-07-26",
      type: "Sale" as const,
      quantityChange: -2,
      reference: "RC-2026-1004",
      warehouse: product.warehouse,
      user: "Staff Member",
      notes: "POS Counter sale"
    },
    {
      id: `m-2-${productId}`,
      date: "2026-06-10",
      type: "Purchase" as const,
      quantityChange: product.currentStock + 15,
      reference: "PO-2026-0881",
      warehouse: product.warehouse,
      user: "Principal Admin",
      notes: "Stock replenishment"
    },
    {
      id: `m-3-${productId}`,
      date: "2026-05-15",
      type: "Adjustment" as const,
      quantityChange: 1,
      reference: "ADJ-2026-012",
      warehouse: product.warehouse,
      user: "Principal Admin",
      notes: "Quarterly shelf audit recount"
    }
  ];

  return {
    product,
    purchaseHistory,
    salesHistory,
    stockMovementHistory
  };
}

