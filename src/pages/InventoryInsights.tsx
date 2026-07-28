import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { inventoryInsightsService } from "../services/api";
import { ExecutiveSummaryGrid } from "../components/inventory-insights/ExecutiveSummaryGrid";
import { SalesInventoryTrends } from "../components/inventory-insights/SalesInventoryTrends";
import { ProductPerformanceTable } from "../components/inventory-insights/ProductPerformanceTable";
import { FastSlowMovingSection } from "../components/inventory-insights/FastSlowMovingSection";
import { StockHealthSection } from "../components/inventory-insights/StockHealthSection";
import { InventoryAnalyticsSection } from "../components/inventory-insights/InventoryAnalyticsSection";
import { ProductProfitabilitySection } from "../components/inventory-insights/ProductProfitabilitySection";
import { ProductDetailModal } from "../components/inventory-insights/ProductDetailModal";
import { ExportModal } from "../components/inventory-insights/ExportModal";
import { DetailedProductView } from "../types";
import { 
  BarChart3, 
  Filter, 
  RotateCcw, 
  Download, 
  Search, 
  Calendar, 
  Store, 
  Truck, 
  Building2, 
  Tag, 
  Loader2,
  FileSpreadsheet
} from "lucide-react";

export const InventoryInsights: React.FC = () => {
  // Global Filters State
  const [dateRange, setDateRange] = useState("30d");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [category, setCategory] = useState("All");
  const [supplier, setSupplier] = useState("All");
  const [warehouse, setWarehouse] = useState("All");
  const [branch, setBranch] = useState("All");
  const [brand, setBrand] = useState("All");
  const [search, setSearch] = useState("");
  const [deadStockDays, setDeadStockDays] = useState(30);

  // Selected Product for Inspection Modal
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

  // Export Modal State
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // Main Insights Query
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: [
      "inventory-insights", 
      dateRange, 
      startDate, 
      endDate, 
      category, 
      supplier, 
      warehouse, 
      branch, 
      brand, 
      search, 
      deadStockDays
    ],
    queryFn: () => inventoryInsightsService.getInsights({
      dateRange,
      startDate: dateRange === "custom" ? startDate : undefined,
      endDate: dateRange === "custom" ? endDate : undefined,
      category,
      supplier,
      warehouse,
      branch,
      brand,
      search,
      deadStockDays
    })
  });

  // Product Details Modal Query
  const { data: productDetail, isLoading: isLoadingDetail } = useQuery({
    queryKey: ["inventory-insights-product-detail", selectedProductId],
    queryFn: () => inventoryInsightsService.getProductDetails(selectedProductId!),
    enabled: !!selectedProductId
  });

  const handleResetFilters = () => {
    setDateRange("30d");
    setStartDate("");
    setEndDate("");
    setCategory("All");
    setSupplier("All");
    setWarehouse("All");
    setBranch("All");
    setBrand("All");
    setSearch("");
    setDeadStockDays(30);
  };

  const handleExportCSV = () => {
    if (!data || !data.productPerformance) return;

    const headers = [
      "Product ID",
      "Name",
      "SKU",
      "Category",
      "Brand",
      "Supplier",
      "Warehouse",
      "Branch",
      "Current Stock",
      "Units Sold",
      "Revenue ($)",
      "Gross Profit ($)",
      "Margin (%)",
      "Days Since Sale",
      "Health Status"
    ];

    const rows = data.productPerformance.map((p) => [
      p.id,
      `"${p.name.replace(/"/g, '""')}"`,
      p.sku,
      p.category,
      p.brand,
      `"${p.supplierName.replace(/"/g, '""')}"`,
      `"${p.warehouse.replace(/"/g, '""')}"`,
      `"${p.branch.replace(/"/g, '""')}"`,
      p.currentStock,
      p.unitsSold,
      p.revenue,
      p.grossProfit,
      p.profitMargin,
      p.daysSinceLastSale,
      p.healthStatus
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Inventory_Insights_Report_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8 pb-12">
      
      {/* Page Title & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-3xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-blue-600 text-white rounded-xl font-black text-xs shadow-md shadow-blue-200">
              INSIGHTS
            </span>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest font-mono">
              Deterministic Analytics Engine
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-1">
            Inventory Insights & Performance Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">
            Real-time calculation of velocity, revenue attribution, turnover rates, pareto ABC classes, and stock health thresholds derived directly from inventory, purchase, and sale records.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={handleResetFilters}
            className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-2"
            title="Reset All Filters"
          >
            <RotateCcw size={15} />
            <span className="hidden sm:inline">Reset Filters</span>
          </button>

          <button
            onClick={() => setIsExportModalOpen(true)}
            disabled={!data}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            <Download size={15} />
            <span>Export Report (CSV/Excel)</span>
          </button>
        </div>
      </div>

      {/* Global Filter Bar */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-3xs space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
            <Filter size={15} className="text-blue-600" />
            Global Dashboard Filters
          </span>
          <span className="text-[11px] text-slate-400 font-mono">
            Affects all KPIs, trend curves, and performance tables
          </span>
        </div>

        {/* Filters Controls Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3 text-xs">
          
          {/* Date Range Selector */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Date Window</label>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="today">Today</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
              <option value="year">This Year</option>
              <option value="custom">Custom Date Range</option>
            </select>
          </div>

          {/* Category Filter */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="All">All Categories</option>
              {(data?.availableCategories || []).map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Supplier Filter */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Supplier</label>
            <select
              value={supplier}
              onChange={(e) => setSupplier(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="All">All Suppliers</option>
              {(data?.availableSuppliers || []).map((sup) => (
                <option key={sup} value={sup}>{sup}</option>
              ))}
            </select>
          </div>

          {/* Warehouse Filter */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Warehouse</label>
            <select
              value={warehouse}
              onChange={(e) => setWarehouse(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="All">All Warehouses</option>
              {(data?.availableWarehouses || []).map((wh) => (
                <option key={wh} value={wh}>{wh}</option>
              ))}
            </select>
          </div>

          {/* Branch Filter */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Branch</label>
            <select
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="All">All Branches</option>
              {(data?.availableBranches || []).map((br) => (
                <option key={br} value={br}>{br}</option>
              ))}
            </select>
          </div>

          {/* Brand Filter */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Brand</label>
            <select
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="All">All Brands</option>
              {(data?.availableBrands || []).map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>

          {/* Product Search */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Product Search</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-slate-400 pointer-events-none">
                <Search size={14} />
              </span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search catalog..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-2 font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>

        </div>

        {/* Custom Date Pickers if custom selected */}
        {dateRange === "custom" && (
          <div className="pt-2 border-t border-slate-100 flex items-center gap-4 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-500">From:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 font-mono text-slate-800"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-500">To:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 font-mono text-slate-800"
              />
            </div>
          </div>
        )}
      </div>

      {/* Main Insights Content Views */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3 bg-white rounded-3xl border border-slate-200">
          <Loader2 className="animate-spin text-blue-600" size={36} />
          <p className="text-sm font-bold text-slate-600">Calculating historical inventory metrics & turnover rates...</p>
        </div>
      ) : isError || !data || !data.executiveSummary ? (
        <div className="p-12 text-center bg-rose-50 border border-rose-200 rounded-3xl text-rose-900 space-y-3">
          <h3 className="text-lg font-bold">Failed to load Inventory Insights</h3>
          <p className="text-xs text-rose-700">Please check server connections or reset active search filters.</p>
          <button onClick={() => refetch()} className="px-4 py-2 bg-rose-600 text-white font-bold rounded-xl text-xs">
            Retry Calculation
          </button>
        </div>
      ) : (
        <div className="space-y-10">
          
          {/* Section 1: Executive Summary KPI Grid */}
          <section id="executive-summary">
            <ExecutiveSummaryGrid data={data.executiveSummary} />
          </section>

          {/* Section 2: Sales & Inventory Trends */}
          <section id="sales-trends">
            <SalesInventoryTrends 
              salesTrend={data.salesTrend || []} 
              categoryPerformance={data.categoryPerformance || []} 
            />
          </section>

          {/* Section 3: Product Performance Matrix */}
          <section id="product-performance">
            <ProductPerformanceTable 
              products={data.productPerformance || []} 
              onSelectProduct={(id) => setSelectedProductId(id)} 
            />
          </section>

          {/* Section 4: Fast & Slow Moving Products & Dead Stock */}
          <section id="fast-slow-moving">
            <FastSlowMovingSection 
              data={data.fastSlowMoving || { fastMoving: [], slowMoving: [], deadStock: [], deadStockThresholdDays: 30 }} 
              deadStockDays={deadStockDays} 
              onSelectDeadStockDays={(days) => setDeadStockDays(days)} 
              onSelectProduct={(id) => setSelectedProductId(id)} 
            />
          </section>

          {/* Section 5: Stock Health & Threshold Compliance */}
          <section id="stock-health">
            <StockHealthSection 
              stockHealth={data.stockHealth || { healthyCount: 0, lowStockCount: 0, criticalStockCount: 0, outOfStockCount: 0, overstockedCount: 0, healthyValue: 0, lowStockValue: 0, criticalStockValue: 0, outOfStockValue: 0, overstockedValue: 0 }} 
              products={data.productPerformance || []} 
              onSelectProduct={(id) => setSelectedProductId(id)} 
            />
          </section>

          {/* Section 6: Advanced Inventory Analytics (Turnover, ABC, Age) */}
          <section id="inventory-analytics">
            <InventoryAnalyticsSection analytics={data.analytics || { turnover: { currentTurnover: 0, previousTurnover: 0, changePct: 0, cogs: 0, avgInventoryValue: 0 }, abcAnalysis: { categoryA: { count: 0, revenue: 0, revenuePct: 0, inventoryValue: 0, products: [] }, categoryB: { count: 0, revenue: 0, revenuePct: 0, inventoryValue: 0, products: [] }, categoryC: { count: 0, revenue: 0, revenuePct: 0, inventoryValue: 0, products: [] } }, ageDistribution: [] }} />
          </section>

          {/* Section 7: Product Profitability Analysis */}
          <section id="product-profitability">
            <ProductProfitabilitySection 
              products={data.productProfitability || []} 
              onSelectProduct={(id) => setSelectedProductId(id)} 
            />
          </section>

        </div>
      )}

      {/* Detail Inspection Modal */}
      {selectedProductId && (
        <ProductDetailModal 
          detail={productDetail || null} 
          isLoading={isLoadingDetail} 
          onClose={() => setSelectedProductId(null)} 
        />
      )}

      {/* Export Modal */}
      <ExportModal 
        isOpen={isExportModalOpen} 
        onClose={() => setIsExportModalOpen(false)} 
        data={data || null} 
      />

    </div>
  );
};
