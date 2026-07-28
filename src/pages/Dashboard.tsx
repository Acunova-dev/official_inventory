import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { dashboardService, productService } from "../services/api";
import { StockAlertItem } from "../types";
import { useToast } from "../components/Layout";
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
  PlusCircle,
  Sliders,
  Bell,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
  ChevronDown,
  Layers,
  MapPin,
  TrendingDown,
  ScanLine
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { DocumentOcrModal } from "../components/DocumentOcrModal";

export const Dashboard: React.FC = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const [thresholdMultiplier, setThresholdMultiplier] = useState<number>(1.0);
  const [severityFilter, setSeverityFilter] = useState<string>("ALL");
  const [isOcrModalOpen, setIsOcrModalOpen] = useState(false);
  const [restockModalItem, setRestockModalItem] = useState<StockAlertItem | null>(null);
  const [customAddQty, setCustomAddQty] = useState<number>(10);
  const [customMinStock, setCustomMinStock] = useState<number>(5);

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
    refetchInterval: 30000, // Automated periodic check every 30 seconds
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5">
          {[...Array(5)].map((_, i) => (
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
        <p className="text-sm">Please verify that you are authenticated and that the custom server is fully operational.</p>
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

  const statCards = [
    {
      title: "Total Products",
      value: summary?.totalProducts || 0,
      icon: Package,
      color: "blue",
      desc: "Active catalog items",
      link: "/products"
    },
    {
      title: "Total Customers",
      value: summary?.totalCustomers || 0,
      icon: Users,
      color: "teal",
      desc: "Affiliated accounts",
      link: "/customers"
    },
    {
      title: "Total Quotations",
      value: summary?.totalQuotations || 0,
      icon: FileCheck,
      color: "indigo",
      desc: "Proposals draft/sent",
      link: "/quotations"
    },
    {
      title: "Total Receipts",
      value: summary?.totalReceipts || 0,
      icon: ReceiptIcon,
      color: "emerald",
      desc: "Completed sales logs",
      link: "/receipts"
    },
    {
      title: "Low Stock Items",
      value: alertsSummary.totalAlerts,
      icon: AlertTriangle,
      color: alertsSummary.totalAlerts > 0 ? "amber" : "emerald",
      desc: alertsSummary.totalAlerts > 0 ? `${alertsSummary.outOfStockCount} out of stock` : "Optimal levels",
      link: "#alerts-section"
    }
  ];

  return (
    <div className="space-y-8">
      
      {/* Top Banner Alert System Notification */}
      <AnimatePresence>
        {alertsSummary.totalAlerts > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-gradient-to-r from-amber-500/10 via-rose-500/10 to-amber-500/10 border border-amber-500/30 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3.5">
              <div className="p-2.5 bg-rose-500 text-white rounded-xl shadow-md shrink-0 animate-pulse">
                <ShieldAlert size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                    Automated Stock Alert System Active
                  </h2>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-700 border border-rose-200">
                    {alertsSummary.totalAlerts} Threshold Breaches
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-0.5">
                  <span className="font-bold text-rose-600">{alertsSummary.outOfStockCount} products out of stock</span> and{" "}
                  <span className="font-bold text-amber-600">{alertsSummary.criticalCount} critically low</span>. Total restock deficit: <span className="font-mono font-bold text-slate-900">{alertsSummary.totalDeficitUnits} units</span>.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <a
                href="#alerts-section"
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5"
              >
                <span>View Alert Terminal</span>
                <ArrowRight size={13} />
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Welcome header with dynamic metadata */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Enterprise Overview</h1>
          <p className="text-sm text-slate-500 mt-1">
            Welcome to <span className="font-semibold text-slate-700">{summary?.company}</span> dashboard. Automated stock monitoring & daily statistics.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <button
            onClick={() => setIsOcrModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md transition-all"
            id="btn-dash-ocr-modal"
          >
            <ScanLine size={14} />
            <span>Scan Document / Invoice Photo</span>
          </button>

          <button
            onClick={() => refetchAlerts()}
            disabled={isAlertsRefetching}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl shadow-2xs transition-all"
            title="Re-run automated stock threshold audit"
          >
            <RefreshCw size={13} className={isAlertsRefetching ? "animate-spin text-blue-600" : "text-slate-500"} />
            <span>Audit Thresholds</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5">
        {statCards.map((card, i) => {
          const Icon = card.icon;
          const colorStyles: any = {
            blue: "text-blue-600 bg-blue-50 border-blue-100",
            teal: "text-teal-600 bg-teal-50 border-teal-100",
            indigo: "text-indigo-600 bg-indigo-50 border-indigo-100",
            emerald: "text-emerald-600 bg-emerald-50 border-emerald-100",
            amber: "text-amber-600 bg-amber-50 border-amber-100"
          };
          
          return (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              whileHover={{ y: -3 }}
              className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col justify-between group relative overflow-hidden"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[11px] font-bold text-slate-400 tracking-wider uppercase">{card.title}</p>
                  <h3 className="text-2xl font-black text-slate-950 mt-1">{card.value}</h3>
                </div>
                <div className={`p-2.5 rounded-xl border ${colorStyles[card.color]} relative`}>
                  <Icon size={18} />
                  {card.title === "Low Stock Items" && alertsSummary.totalAlerts > 0 && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 rounded-full animate-ping" />
                  )}
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500 text-[11px] font-medium">{card.desc}</span>
                {card.link.startsWith("#") ? (
                  <a href={card.link} className="text-blue-600 font-bold flex items-center gap-1 group-hover:underline">
                    Inspect <ArrowRight size={12} />
                  </a>
                ) : (
                  <Link to={card.link} className="text-blue-600 font-bold flex items-center gap-1 group-hover:underline">
                    View <ArrowRight size={12} />
                  </Link>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* AUTOMATED INVENTORY THRESHOLD ALERT SYSTEM SECTION */}
      <section id="alerts-section" className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 space-y-6 relative overflow-hidden">
        
        {/* Section Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-150">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-500/10 text-amber-600 rounded-2xl border border-amber-200/60 shadow-2xs">
              <Zap size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-slate-900 tracking-tight">
                  Automated Stock Alert System
                </h2>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  AUTOMATED AUDIT ACTIVE
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Real-time inventory threshold monitor. Dynamically flags stock levels breaking defined safety thresholds.
              </p>
            </div>
          </div>

          {/* Threshold Sensitivity Configurator & Controls */}
          <div className="flex flex-wrap items-center gap-3">
            
            {/* Sensitivity Multiplier Selector */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
              <span className="px-2 text-slate-400 text-[10px] uppercase font-bold tracking-wider flex items-center gap-1">
                <Sliders size={12} /> Buffer:
              </span>
              <button
                onClick={() => setThresholdMultiplier(1.0)}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  thresholdMultiplier === 1.0 
                    ? "bg-white text-slate-900 shadow-2xs font-extrabold" 
                    : "text-slate-500 hover:text-slate-900"
                }`}
                title="Standard minimum stock trigger (1.0x)"
              >
                1.0x (Exact)
              </button>
              <button
                onClick={() => setThresholdMultiplier(1.5)}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  thresholdMultiplier === 1.5 
                    ? "bg-white text-slate-900 shadow-2xs font-extrabold" 
                    : "text-slate-500 hover:text-slate-900"
                }`}
                title="Early warning buffer (+50% safety stock)"
              >
                1.5x (Safety)
              </button>
              <button
                onClick={() => setThresholdMultiplier(0.5)}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  thresholdMultiplier === 0.5 
                    ? "bg-white text-slate-900 shadow-2xs font-extrabold" 
                    : "text-slate-500 hover:text-slate-900"
                }`}
                title="Emergency stock trigger (-50% threshold)"
              >
                0.5x (Critical)
              </button>
            </div>

            <Link
              to="/products"
              className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5"
            >
              <Package size={14} />
              <span>Full Catalog</span>
            </Link>
          </div>
        </div>

        {/* Alert Metrics Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Threshold Breaches</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-slate-900">{alertsSummary.totalAlerts}</span>
              <span className="text-xs font-medium text-slate-500">items flagged</span>
            </div>
          </div>

          <div className="bg-rose-50/70 p-4 rounded-2xl border border-rose-200/70">
            <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wider block">Out of Stock (0 Units)</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-rose-700">{alertsSummary.outOfStockCount}</span>
              <span className="text-xs font-semibold text-rose-600">urgent action</span>
            </div>
          </div>

          <div className="bg-amber-50/70 p-4 rounded-2xl border border-amber-200/70">
            <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider block">Critical Low Stock</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-amber-700">{alertsSummary.criticalCount}</span>
              <span className="text-xs font-semibold text-amber-600">&le; 50% threshold</span>
            </div>
          </div>

          <div className="bg-blue-50/70 p-4 rounded-2xl border border-blue-200/70">
            <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block">Total Restock Deficit</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-blue-700">{alertsSummary.totalDeficitUnits}</span>
              <span className="text-xs font-semibold text-blue-600">units needed</span>
            </div>
          </div>
        </div>

        {/* Severity Filter Tabs */}
        <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-1 overflow-x-auto py-1">
            <button
              onClick={() => setSeverityFilter("ALL")}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all shrink-0 ${
                severityFilter === "ALL"
                  ? "bg-slate-900 text-white shadow-2xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              All Alerts ({allAlerts.length})
            </button>
            <button
              onClick={() => setSeverityFilter("OUT_OF_STOCK")}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all shrink-0 ${
                severityFilter === "OUT_OF_STOCK"
                  ? "bg-rose-600 text-white shadow-2xs"
                  : "bg-rose-50 text-rose-700 hover:bg-rose-100"
              }`}
            >
              Out of Stock ({alertsSummary.outOfStockCount})
            </button>
            <button
              onClick={() => setSeverityFilter("CRITICAL")}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all shrink-0 ${
                severityFilter === "CRITICAL"
                  ? "bg-amber-600 text-white shadow-2xs"
                  : "bg-amber-50 text-amber-700 hover:bg-amber-100"
              }`}
            >
              Critical Low ({alertsSummary.criticalCount})
            </button>
            <button
              onClick={() => setSeverityFilter("WARNING")}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all shrink-0 ${
                severityFilter === "WARNING"
                  ? "bg-slate-700 text-white shadow-2xs"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              Low Threshold ({alertsSummary.warningCount})
            </button>
          </div>

          <span className="text-xs text-slate-400 font-mono hidden sm:inline-block">
            Showing {filteredAlerts.length} of {allAlerts.length}
          </span>
        </div>

        {/* Alert Items List */}
        {filteredAlerts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredAlerts.map((item) => {
              const effectiveThreshold = item.effectiveThreshold || item.minStock;
              const ratio = effectiveThreshold > 0 ? Math.min(100, Math.max(0, (item.quantity / effectiveThreshold) * 100)) : 0;
              
              const isOutOfStock = item.quantity <= 0;
              const isCritical = !isOutOfStock && item.alertSeverity === "CRITICAL";

              return (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className={`p-5 rounded-2xl border transition-all flex flex-col justify-between space-y-4 relative ${
                    isOutOfStock
                      ? "bg-rose-50/40 border-rose-200 shadow-2xs"
                      : isCritical
                      ? "bg-amber-50/40 border-amber-200 shadow-2xs"
                      : "bg-white border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div>
                    {/* Badge and Location */}
                    <div className="flex items-center justify-between gap-2 mb-2.5">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                        isOutOfStock
                          ? "bg-rose-100 text-rose-800 border-rose-300 animate-pulse"
                          : isCritical
                          ? "bg-amber-100 text-amber-800 border-amber-300"
                          : "bg-slate-100 text-slate-700 border-slate-200"
                      }`}>
                        {isOutOfStock ? "⚠️ OUT OF STOCK" : isCritical ? "⚡ CRITICAL LOW" : "LOW STOCK"}
                      </span>

                      <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                        <MapPin size={11} className="text-slate-400" />
                        {item.location}
                      </span>
                    </div>

                    {/* Product Name */}
                    <h3 className="font-extrabold text-slate-900 text-sm leading-snug line-clamp-2">
                      {item.name}
                    </h3>
                    <span className="inline-block text-[10px] font-mono font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-sm mt-1">
                      {item.category}
                    </span>
                  </div>

                  {/* Stock Depletion Visual Bar */}
                  <div className="space-y-1.5 pt-2 border-t border-slate-100">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-semibold text-[11px]">Depletion Meter:</span>
                      <span className="font-mono font-black text-slate-900">
                        {item.quantity} / {effectiveThreshold} units
                      </span>
                    </div>

                    <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden p-0.5 border border-slate-300/40">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isOutOfStock
                            ? "w-0"
                            : isCritical
                            ? "bg-amber-500"
                            : "bg-amber-400"
                        }`}
                        style={{ width: `${ratio}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium">
                      <span>Deficit: -{item.stockDeficit} units</span>
                      <span>Target Suggested: +{item.suggestedRestock}</span>
                    </div>
                  </div>

                  {/* Restock Actions */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleQuickRestock(item, 5)}
                        disabled={restockMutation.isPending}
                        className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-black transition-all"
                        title="Quick restock +5 units"
                      >
                        +5
                      </button>
                      <button
                        onClick={() => handleQuickRestock(item, 10)}
                        disabled={restockMutation.isPending}
                        className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-black transition-all"
                        title="Quick restock +10 units"
                      >
                        +10
                      </button>
                    </div>

                    <button
                      onClick={() => handleOpenRestockModal(item)}
                      className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-2xs transition-all flex items-center gap-1"
                    >
                      <RefreshCw size={12} />
                      <span>Custom Restock</span>
                    </button>
                  </div>

                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="py-16 text-center bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto">
              <CheckCircle2 size={24} />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">All Inventory Thresholds Optimal!</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                No products are currently breaching the selected threshold level ({thresholdMultiplier}x multiplier).
              </p>
            </div>
          </div>
        )}

      </section>

      {/* Recent Activities Section - Bento Grid Style */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Recently Added Products */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col h-[420px]">
          <div className="flex items-center justify-between mb-4 shrink-0 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-blue-50 text-blue-600 rounded-lg"><Package size={16} /></span>
              <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider">Recently Catalogued</h3>
            </div>
            <Link to="/products" className="text-xs text-blue-600 font-bold hover:underline flex items-center gap-1">
              Add Catalog <ArrowRight size={12} />
            </Link>
          </div>
          
          <div className="flex-1 overflow-y-auto space-y-3.5 pr-1">
            {activity?.recentlyAddedProducts && activity.recentlyAddedProducts.length > 0 ? (
              activity.recentlyAddedProducts.map((p) => (
                <div key={p.id} className="flex items-center justify-between p-2.5 hover:bg-slate-50 rounded-xl transition-all border border-slate-100/60 font-medium">
                  <div className="min-w-0 flex-1 pr-3">
                    <p className="text-xs font-semibold text-slate-900 truncate">{p.name}</p>
                    <span className="text-[10px] text-slate-400 font-mono mt-0.5 inline-block bg-slate-100 px-1.5 py-0.5 rounded-sm">{p.category}</span>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-black text-slate-900">${p.sellingPrice}</p>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                      p.status === "In Stock" ? "bg-emerald-50 text-emerald-700" : p.status === "Low Stock" ? "bg-amber-50 text-amber-700" : "bg-rose-50 text-rose-700"
                    }`}>
                      {p.quantity} Units
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400">
                <p className="text-xs">No recent products available.</p>
              </div>
            )}
          </div>
        </div>

        {/* Recently Created Quotations */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col h-[420px]">
          <div className="flex items-center justify-between mb-4 shrink-0 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg"><FileCheck size={16} /></span>
              <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider">Recent Quotations</h3>
            </div>
            <Link to="/quotations" className="text-xs text-blue-600 font-bold hover:underline flex items-center gap-1">
              All Quotes <ArrowRight size={12} />
            </Link>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3.5 pr-1">
            {activity?.recentlyCreatedQuotations && activity.recentlyCreatedQuotations.length > 0 ? (
              activity.recentlyCreatedQuotations.map((q) => (
                <div key={q.id} className="flex items-center justify-between p-2.5 hover:bg-slate-50 rounded-xl transition-all border border-slate-100/60 font-medium">
                  <div className="min-w-0 flex-1 pr-3">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-black text-slate-900 font-mono">{q.quotationNumber}</span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                        q.status === "Accepted" ? "bg-emerald-50 text-emerald-700" : q.status === "Sent" ? "bg-blue-50 text-blue-700" : q.status === "Draft" ? "bg-slate-100 text-slate-600" : "bg-rose-50 text-rose-700"
                      }`}>
                        {q.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 font-sans truncate mt-1">{q.customerName}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-black text-slate-900">${q.total.toFixed(2)}</p>
                    <span className="text-[9px] text-slate-400 font-mono flex items-center gap-1 mt-0.5">
                      <Clock size={10} /> {q.date}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400">
                <p className="text-xs">No active quotation history.</p>
              </div>
            )}
          </div>
        </div>

        {/* Recently Created Receipts */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col h-[420px]">
          <div className="flex items-center justify-between mb-4 shrink-0 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg"><ReceiptIcon size={16} /></span>
              <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider">Recent Receipts</h3>
            </div>
            <Link to="/receipts" className="text-xs text-blue-600 font-bold hover:underline flex items-center gap-1">
              Issue Receipt <ArrowRight size={12} />
            </Link>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3.5 pr-1">
            {activity?.recentlyCreatedReceipts && activity.recentlyCreatedReceipts.length > 0 ? (
              activity.recentlyCreatedReceipts.map((r) => (
                <div key={r.id} className="flex items-center justify-between p-2.5 hover:bg-slate-50 rounded-xl transition-all border border-slate-100/60 font-medium">
                  <div className="min-w-0 flex-1 pr-3">
                    <p className="text-xs font-black text-slate-950 font-mono">{r.receiptNumber}</p>
                    <p className="text-[11px] text-slate-500 truncate mt-1">{r.customerName}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-black text-slate-900">${r.total.toFixed(2)}</p>
                    <span className="text-[9px] text-slate-400 font-mono flex items-center gap-1 mt-0.5">
                      <Clock size={10} /> {r.date}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400">
                <p className="text-xs">No receipts documented yet.</p>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* QUICK RESTOCK & THRESHOLD MODAL */}
      <AnimatePresence>
        {restockModalItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-slate-150 bg-slate-50 flex items-center justify-between">
                <div>
                  <h3 className="font-black text-slate-900 tracking-tight text-lg">
                    Restock & Threshold Customizer
                  </h3>
                  <p className="text-xs text-slate-500 truncate max-w-xs">{restockModalItem.name}</p>
                </div>
                <button
                  onClick={() => setRestockModalItem(null)}
                  className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              <form onSubmit={handleCustomRestockSubmit} className="p-6 space-y-5">
                
                {/* Current Item Stats */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">Current In-Hand Stock:</span>
                    <span className="font-mono font-bold text-slate-900">{restockModalItem.quantity} units</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">Configured Min Threshold:</span>
                    <span className="font-mono font-bold text-slate-900">{restockModalItem.minStock} units</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-200/80 pt-1.5">
                    <span className="text-slate-500 font-medium">Deficit to Min Stock:</span>
                    <span className="font-mono font-bold text-rose-600">-{restockModalItem.stockDeficit} units</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Quantity to Add to Stock
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={customAddQty}
                    onChange={(e) => setCustomAddQty(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm font-extrabold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. 15"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    New quantity after restock will be: <span className="font-bold text-slate-800">{restockModalItem.quantity + customAddQty} units</span>
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Update Defined Alert Minimum Threshold (minStock)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={customMinStock}
                    onChange={(e) => setCustomMinStock(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. 5"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Automated alert triggers when stock drops to or below this count.
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setRestockModalItem(null)}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={restockMutation.isPending}
                    className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-black rounded-xl shadow-md uppercase tracking-wider transition-all flex items-center gap-1.5"
                  >
                    {restockMutation.isPending ? "Updating Stock..." : "Apply Restock"}
                  </button>
                </div>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Document OCR Extractor Modal */}
      <DocumentOcrModal
        isOpen={isOcrModalOpen}
        onClose={() => setIsOcrModalOpen(false)}
      />

    </div>
  );
};
