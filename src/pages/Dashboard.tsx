import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { dashboardService, productService } from "../services/api";
import { StockAlertItem } from "../types";
import { useToast } from "../components/Layout";
import { useAuth } from "../context/AuthContext";
import { 
  Package, 
  Users, 
  FileCheck, 
  Receipt as ReceiptIcon, 
  AlertTriangle,
  ArrowRight,
  Clock,
  Zap,
  RefreshCw,
  Sliders,
  CheckCircle2,
  ShieldAlert,
  Layers,
  ScanLine,
  ShoppingBag,
  PackageCheck,
  Search,
  Truck,
  Activity,
  BarChart3
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { DocumentOcrModal } from "../components/DocumentOcrModal";

export const Dashboard: React.FC = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { user } = useAuth();

  const userRole = user?.role || "Sales Person";

  const [thresholdMultiplier, setThresholdMultiplier] = useState<number>(1.0);
  const [severityFilter] = useState<string>("ALL");
  const [isOcrModalOpen, setIsOcrModalOpen] = useState(false);
  const [restockModalItem, setRestockModalItem] = useState<StockAlertItem | null>(null);
  const [customAddQty, setCustomAddQty] = useState<number>(10);
  const [customMinStock, setCustomMinStock] = useState<number>(5);

  // Sales counter quick lookup query state
  const [counterSearchTerm, setCounterSearchTerm] = useState<string>("");

  // Query 1 - Count metrics
  const { 
    data: summary, 
    isLoading: isSummaryLoading, 
    isError: isSummaryError 
  } = useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: dashboardService.getSummary,
  });

  // Query 2 - Activities list
  const { 
    data: activity, 
    isLoading: isActivityLoading, 
    isError: isActivityError 
  } = useQuery({
    queryKey: ["dashboard-activity"],
    queryFn: dashboardService.getActivity,
  });

  // Query 3 - Automated Inventory Alerts
  const {
    data: alertsData,
    isLoading: isAlertsLoading,
    isRefetching: isAlertsRefetching,
    refetch: refetchAlerts
  } = useQuery({
    queryKey: ["dashboard-alerts", thresholdMultiplier],
    queryFn: () => dashboardService.getAlerts({ multiplier: thresholdMultiplier }),
    refetchInterval: 30000,
  });

  // Query 4 - Products list for quick Sales Person lookup
  const { data: productsList = [] } = useQuery({
    queryKey: ["products-counter-lookup"],
    queryFn: () => productService.getAll(),
    enabled: userRole === "Sales Person" || userRole === "Staff Member"
  });

  // Restock Mutation
  const restockMutation = useMutation({
    mutationFn: ({ id, addQuantity, newMinStock }: { id: string; addQuantity: number; newMinStock?: number }) => 
      productService.restock(id, { addQuantity, newMinStock }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-alerts"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-activity"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      showToast(`Inventory updated: ${res.message}`, "success");
      setRestockModalItem(null);
    },
    onError: (err: any) => {
      showToast(err.response?.data?.error || "Failed to restock inventory item", "error");
    }
  });

  const handleQuickRestock = (item: StockAlertItem, amount: number) => {
    restockMutation.mutate({
      id: item.id,
      addQuantity: amount
    });
  };

  const handleOpenRestockModal = (item: StockAlertItem) => {
    setRestockModalItem(item);
    setCustomAddQty(item.suggestedRestock || 10);
    setCustomMinStock(item.minStock);
  };

  const handleCustomRestockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!restockModalItem) return;
    restockMutation.mutate({
      id: restockModalItem.id,
      addQuantity: customAddQty,
      newMinStock: customMinStock
    });
  };

  const isLoading = isSummaryLoading || isActivityLoading || isAlertsLoading;
  const isError = isSummaryError || isActivityError;

  if (isLoading && !summary) {
    return (
      <div className="space-y-6 animate-pulse p-2">
        <div className="h-10 bg-slate-200 rounded-md w-1/4"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-slate-200 rounded-xl"></div>
          ))}
        </div>
        <div className="h-64 bg-slate-200 rounded-2xl"></div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-8 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl max-w-xl mx-auto my-12 text-center">
        <p className="font-bold text-lg mb-2">Failed to retrieve dashboard data</p>
        <p className="text-sm">Please verify that you are authenticated and that the workspace server is running.</p>
      </div>
    );
  }

  const alertsSummary = alertsData?.summary || {
    totalAlerts: 0,
    outOfStockCount: 0,
    criticalCount: 0,
    warningCount: 0,
    totalDeficitUnits: 0
  };

  const allAlerts = alertsData?.alerts || [];

  const filteredAlerts = allAlerts.filter(a => {
    if (severityFilter === "OUT_OF_STOCK") return a.alertSeverity === "OUT_OF_STOCK";
    if (severityFilter === "CRITICAL") return a.alertSeverity === "CRITICAL";
    if (severityFilter === "WARNING") return a.alertSeverity === "WARNING";
    return true;
  });

  // Filter products for sales lookup
  const productsArray = Array.isArray(productsList) ? productsList : (productsList as any)?.products || [];
  const filteredProductsLookup = productsArray.filter((p: any) => 
    p.name?.toLowerCase().includes(counterSearchTerm.toLowerCase()) ||
    p.sku?.toLowerCase().includes(counterSearchTerm.toLowerCase()) ||
    p.category?.toLowerCase().includes(counterSearchTerm.toLowerCase())
  ).slice(0, 6);

  return (
    <div className="space-y-8 pb-12">
      
      {/* Dynamic Header tailored to Role */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 uppercase tracking-wider">
              {userRole} Mode
            </span>
            <span className="text-xs text-slate-400 font-mono">• Active Workspace Session</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            {userRole === "Sales Person" && "Sales Operations Center"}
            {userRole === "Inventory Manager" && "Inventory & Procurement Control"}
            {userRole === "Principal Admin" && "Enterprise Executive Dashboard"}
            {userRole === "Staff Member" && "Staff Operational Console"}
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-1">
            {userRole === "Sales Person" && "Manage customer relations, issue commercial quotations, and log counter sales receipts."}
            {userRole === "Inventory Manager" && "Monitor stock levels, manage purchase orders, receive GRN shipments, and optimize reorder points."}
            {userRole === "Principal Admin" && "Full administrative control over inventory, finances, sales, user security, and system logs."}
            {userRole === "Staff Member" && "General operational overview with role-permitted task shortcuts."}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setIsOcrModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs rounded-2xl shadow-md transition-all cursor-pointer"
          >
            <ScanLine size={16} />
            <span>AI Document Scan</span>
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* ROLE VIEW 1: SALES PERSON DASHBOARD */}
      {/* ========================================================= */}
      {userRole === "Sales Person" && (
        <div className="space-y-8">
          
          {/* Sales Key Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Customers</p>
                <p className="text-3xl font-black text-slate-900 mt-1">{summary?.totalCustomers || 0}</p>
                <Link to="/customers" className="text-xs font-bold text-blue-600 hover:underline inline-flex items-center gap-1 mt-2">
                  <span>View Accounts</span>
                  <ArrowRight size={12} />
                </Link>
              </div>
              <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl border border-blue-100">
                <Users size={24} />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Quotations Issued</p>
                <p className="text-3xl font-black text-slate-900 mt-1">{summary?.totalQuotations || 0}</p>
                <Link to="/quotations" className="text-xs font-bold text-indigo-600 hover:underline inline-flex items-center gap-1 mt-2">
                  <span>Create / Proposals</span>
                  <ArrowRight size={12} />
                </Link>
              </div>
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl border border-indigo-100">
                <FileCheck size={24} />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Counter Receipts</p>
                <p className="text-3xl font-black text-slate-900 mt-1">{summary?.totalReceipts || 0}</p>
                <Link to="/receipts" className="text-xs font-bold text-emerald-600 hover:underline inline-flex items-center gap-1 mt-2">
                  <span>Issue Receipts</span>
                  <ArrowRight size={12} />
                </Link>
              </div>
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100">
                <ReceiptIcon size={24} />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Catalog Products</p>
                <p className="text-3xl font-black text-slate-900 mt-1">{summary?.totalProducts || 0}</p>
                <Link to="/products" className="text-xs font-bold text-slate-600 hover:underline inline-flex items-center gap-1 mt-2">
                  <span>Check Pricing</span>
                  <ArrowRight size={12} />
                </Link>
              </div>
              <div className="p-3 bg-slate-100 text-slate-700 rounded-2xl border border-slate-200">
                <Package size={24} />
              </div>
            </div>
          </div>

          {/* Quick Counter Stock & Price Search */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-black text-slate-900">Counter Stock & Price Lookup</h2>
                <p className="text-xs text-slate-500">Quickly search available stock quantities and selling prices for walk-in customers.</p>
              </div>
              <div className="relative max-w-xs w-full">
                <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search product, SKU or category..."
                  value={counterSearchTerm}
                  onChange={(e) => setCounterSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:bg-white focus:ring-2 focus:ring-blue-500 outline-hidden"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProductsLookup.map((product) => (
                <div key={product.id} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-white transition-all space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-700 uppercase">{product.sku}</span>
                      <h3 className="font-extrabold text-sm text-slate-900 mt-1">{product.name}</h3>
                      <p className="text-[11px] text-slate-400">{product.category}</p>
                    </div>
                    <span className="text-base font-black text-emerald-600">${product.sellingPrice.toFixed(2)}</span>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 text-xs">
                    <span className="text-slate-500 font-medium">Available Quantity:</span>
                    <span className={`font-black font-mono px-2 py-0.5 rounded-full ${
                      product.quantity > product.minStock ? "bg-emerald-100 text-emerald-800" : product.quantity > 0 ? "bg-amber-100 text-amber-800" : "bg-rose-100 text-rose-800"
                    }`}>
                      {product.quantity} {product.unit || "units"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Sales Action Shortcuts */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <Link to="/quotations" className="p-6 bg-gradient-to-br from-indigo-900 to-slate-900 text-white rounded-3xl shadow-md hover:scale-[1.01] transition-all space-y-3 block">
              <div className="p-3 bg-white/10 w-fit rounded-2xl">
                <FileCheck size={24} className="text-indigo-300" />
              </div>
              <h3 className="font-black text-lg">Create Sales Quotation</h3>
              <p className="text-xs text-indigo-200">Generate a branded quotation proposal with custom line items and instant total calculations.</p>
            </Link>

            <Link to="/receipts" className="p-6 bg-gradient-to-br from-emerald-900 to-slate-900 text-white rounded-3xl shadow-md hover:scale-[1.01] transition-all space-y-3 block">
              <div className="p-3 bg-white/10 w-fit rounded-2xl">
                <ReceiptIcon size={24} className="text-emerald-300" />
              </div>
              <h3 className="font-black text-lg">Issue Sales Receipt</h3>
              <p className="text-xs text-emerald-200">Record a completed counter sales transaction, deduct inventory, and print customer receipt.</p>
            </Link>

            <Link to="/customers" className="p-6 bg-gradient-to-br from-blue-900 to-slate-900 text-white rounded-3xl shadow-md hover:scale-[1.01] transition-all space-y-3 block">
              <div className="p-3 bg-white/10 w-fit rounded-2xl">
                <Users size={24} className="text-blue-300" />
              </div>
              <h3 className="font-black text-lg">Customer Directory</h3>
              <p className="text-xs text-blue-200">Register new customer profiles, update contact information, and review purchase history.</p>
            </Link>
          </div>

        </div>
      )}

      {/* ========================================================= */}
      {/* ROLE VIEW 2: INVENTORY MANAGER DASHBOARD */}
      {/* ========================================================= */}
      {(userRole === "Inventory Manager" || userRole === "Principal Admin" || userRole === "Staff Member") && (
        <div className="space-y-8">
          
          {/* Inventory Manager Summary Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Low Stock Alerts</p>
                <p className="text-3xl font-black text-amber-600 mt-1">{alertsSummary.totalAlerts}</p>
                <p className="text-[11px] text-slate-400 mt-1">{alertsSummary.outOfStockCount} out of stock</p>
              </div>
              <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl border border-amber-100">
                <AlertTriangle size={24} />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Out of Stock</p>
                <p className="text-3xl font-black text-rose-600 mt-1">{alertsSummary.outOfStockCount}</p>
                <p className="text-[11px] text-rose-500 font-bold mt-1">Requires PO Order</p>
              </div>
              <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl border border-rose-100">
                <ShieldAlert size={24} />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Deficit</p>
                <p className="text-3xl font-black text-slate-900 mt-1">{alertsSummary.totalDeficitUnits}</p>
                <p className="text-[11px] text-slate-400 mt-1">Units below reorder</p>
              </div>
              <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl border border-blue-100">
                <Layers size={24} />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Products</p>
                <p className="text-3xl font-black text-slate-900 mt-1">{summary?.totalProducts || 0}</p>
                <Link to="/products" className="text-xs font-bold text-blue-600 hover:underline mt-1 block">Catalog →</Link>
              </div>
              <div className="p-3 bg-slate-100 text-slate-700 rounded-2xl border border-slate-200">
                <Package size={24} />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Suppliers</p>
                <p className="text-3xl font-black text-slate-900 mt-1">{summary?.totalSuppliers || 0}</p>
                <Link to="/suppliers" className="text-xs font-bold text-teal-600 hover:underline mt-1 block">Vendors →</Link>
              </div>
              <div className="p-3 bg-teal-50 text-teal-600 rounded-2xl border border-teal-100">
                <Truck size={24} />
              </div>
            </div>
          </div>

          {/* Quick Inventory Operations Shortcuts */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link to="/purchasing/orders" className="p-4 bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl flex items-center gap-3 transition-all cursor-pointer">
              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                <ShoppingBag size={20} />
              </div>
              <div>
                <h4 className="font-extrabold text-xs text-slate-900">Purchase Orders (PO)</h4>
                <p className="text-[11px] text-slate-400">Draft or approve supplier POs</p>
              </div>
            </Link>

            <Link to="/purchasing/grn" className="p-4 bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl flex items-center gap-3 transition-all cursor-pointer">
              <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
                <PackageCheck size={20} />
              </div>
              <div>
                <h4 className="font-extrabold text-xs text-slate-900">Goods Received (GRN)</h4>
                <p className="text-[11px] text-slate-400">Receive supplier shipments</p>
              </div>
            </Link>

            <Link to="/inventory" className="p-4 bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl flex items-center gap-3 transition-all cursor-pointer">
              <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                <Activity size={20} />
              </div>
              <div>
                <h4 className="font-extrabold text-xs text-slate-900">Stock Movements</h4>
                <p className="text-[11px] text-slate-400">Audit transfers & adjustments</p>
              </div>
            </Link>

            <Link to="/inventory-insights" className="p-4 bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl flex items-center gap-3 transition-all cursor-pointer">
              <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
                <BarChart3 size={20} />
              </div>
              <div>
                <h4 className="font-extrabold text-xs text-slate-900">Stock Performance</h4>
                <p className="text-[11px] text-slate-400">Deadstock & turn velocity</p>
              </div>
            </Link>
          </div>

          {/* Automated Low Stock Alerts Panel */}
          <div id="alerts-section" className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-50 text-amber-600 border border-amber-200 rounded-xl">
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-900">Automated Reorder Alerts</h2>
                  <p className="text-xs text-slate-500">Live monitoring of SKU stock levels against reorder thresholds.</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold">
                  <Sliders size={14} className="text-slate-400" />
                  <span>Sensitivity:</span>
                  <select
                    value={thresholdMultiplier}
                    onChange={(e) => setThresholdMultiplier(parseFloat(e.target.value))}
                    className="bg-transparent font-extrabold text-blue-600 outline-hidden cursor-pointer"
                  >
                    <option value={1.0}>1.0x (Standard)</option>
                    <option value={1.25}>1.25x (Buffer Safeguard)</option>
                    <option value={1.5}>1.5x (Peak Demand Buffer)</option>
                  </select>
                </div>

                <button
                  type="button"
                  onClick={() => refetchAlerts()}
                  className="p-2 text-slate-500 hover:text-slate-800 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-all cursor-pointer"
                  title="Force re-evaluate reorder points"
                >
                  <RefreshCw size={15} className={isAlertsRefetching ? "animate-spin text-blue-600" : ""} />
                </button>
              </div>
            </div>

            {filteredAlerts.length === 0 ? (
              <div className="p-12 text-center text-slate-500 space-y-2">
                <CheckCircle2 size={36} className="mx-auto text-emerald-500" />
                <p className="font-extrabold text-slate-800 text-base">All stock levels optimal</p>
                <p className="text-xs text-slate-400">No inventory SKUs are currently operating below reorder thresholds.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
                {filteredAlerts.map((item) => (
                  <div key={item.id} className="p-4 hover:bg-slate-50/80 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <span className={`mt-1 p-1.5 rounded-lg text-white font-bold text-xs shrink-0 ${
                        item.alertSeverity === "OUT_OF_STOCK" ? "bg-rose-600" : item.alertSeverity === "CRITICAL" ? "bg-amber-600" : "bg-yellow-500"
                      }`}>
                        {item.alertSeverity === "OUT_OF_STOCK" ? "OUT" : "LOW"}
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-slate-400">{item.sku}</span>
                          <h4 className="font-extrabold text-slate-900 text-sm">{item.name}</h4>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Category: <strong>{item.category}</strong> • Supplier: <strong>{item.supplierName || "Standard Vendor"}</strong>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 shrink-0 justify-between sm:justify-end">
                      <div className="text-right">
                        <p className="text-xs font-bold text-slate-900">
                          Stock: <span className="font-mono text-rose-600">{item.quantity}</span> / Min: <span className="font-mono text-slate-500">{item.minStock}</span>
                        </p>
                        <p className="text-[11px] text-amber-600 font-bold">Deficit: -{item.deficit ?? item.stockDeficit ?? 0} {item.unit || "units"}</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleQuickRestock(item, item.suggestedRestock || 10)}
                          disabled={restockMutation.isPending}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
                        >
                          + Quick {item.suggestedRestock || 10}
                        </button>
                        <button
                          onClick={() => handleOpenRestockModal(item)}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition-all cursor-pointer"
                        >
                          Custom
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}

      {/* Audit Log Activity Stream */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Clock size={18} className="text-blue-600" />
            <h2 className="text-lg font-black text-slate-900">Recent System Activity Stream</h2>
          </div>
          <Link to="/system-logs" className="text-xs font-bold text-blue-600 hover:underline">View All Audit Logs →</Link>
        </div>

        <div className="space-y-3">
          {(Array.isArray(activity) ? activity : (activity as any)?.logs || []).slice(0, 5).map((log: any, index: number) => (
            <div key={log.id || index} className="flex items-start gap-3 p-3 rounded-xl bg-slate-50/60 border border-slate-100 text-xs">
              <span className="p-1.5 bg-blue-100 text-blue-700 rounded-lg shrink-0 mt-0.5">
                <Zap size={14} />
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-extrabold text-slate-900 truncate">{log.action || log.type}</p>
                  <span className="text-[10px] text-slate-400 font-mono shrink-0">
                    {log.createdAt ? new Date(log.createdAt).toLocaleTimeString() : "Just now"}
                  </span>
                </div>
                <p className="text-slate-500 mt-0.5">{log.details || log.description}</p>
                <p className="text-[10px] text-slate-400 font-mono mt-1">Operator: {log.userEmail || log.userName || "System"}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Restock Custom Modal */}
      <AnimatePresence>
        {restockModalItem && (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 max-w-md w-full border border-slate-200 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-black text-slate-900 text-base">Restock SKU: {restockModalItem.sku}</h3>
                <button onClick={() => setRestockModalItem(null)} className="text-slate-400 hover:text-slate-600 font-bold cursor-pointer">✕</button>
              </div>

              <p className="text-xs text-slate-500">
                Adjust incoming stock quantity for <strong>{restockModalItem.name}</strong>. Current quantity: <strong>{restockModalItem.quantity}</strong>.
              </p>

              <form onSubmit={handleCustomRestockSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Add Stock Quantity</label>
                  <input
                    type="number"
                    min="1"
                    value={customAddQty}
                    onChange={(e) => setCustomAddQty(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-extrabold font-mono focus:ring-2 focus:ring-blue-500 outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Update Minimum Reorder Threshold</label>
                  <input
                    type="number"
                    min="0"
                    value={customMinStock}
                    onChange={(e) => setCustomMinStock(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-extrabold font-mono focus:ring-2 focus:ring-blue-500 outline-hidden"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setRestockModalItem(null)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={restockMutation.isPending}
                    className="px-5 py-2 text-xs font-extrabold text-white bg-blue-600 hover:bg-blue-500 rounded-xl shadow-md cursor-pointer"
                  >
                    {restockMutation.isPending ? "Updating..." : "Confirm Inventory Restock"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* AI Document OCR Modal */}
      <DocumentOcrModal
        isOpen={isOcrModalOpen}
        onClose={() => setIsOcrModalOpen(false)}
      />

    </div>
  );
};
