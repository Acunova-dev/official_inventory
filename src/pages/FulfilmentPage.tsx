import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { 
  Package, 
  QrCode, 
  Truck, 
  Clock, 
  CheckCircle2, 
  ShieldCheck, 
  ArrowRight, 
  Layers, 
  Store, 
  FileCheck, 
  Sparkles,
  MapPin,
  Barcode,
  RefreshCw,
  Ticket,
  AlertCircle,
  TrendingUp,
  Plus
} from "lucide-react";
import { FulfilmentSummaryStats, FulfilmentOrder, PickAndDropBatch } from "../types";
import { fulfilmentService } from "../services/api";
import { QRCodeModal } from "../components/fulfilment/QRCodeModal";
import { useToast } from "../components/Layout";

export const FulfilmentPage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  
  const [stats, setStats] = useState<FulfilmentSummaryStats>({
    awaitingPreparation: 0,
    preparedReadyForDispatch: 0,
    inTransitBatches: 0,
    atPickupPoint: 0,
    completedCollectionsToday: 0,
    totalOutstandingToCollect: 0,
  });

  const [recentOrders, setRecentOrders] = useState<FulfilmentOrder[]>([]);
  const [activeBatches, setActiveBatches] = useState<PickAndDropBatch[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedOrderForQR, setSelectedOrderForQR] = useState<FulfilmentOrder | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [summaryStats, ordersList, batchesList] = await Promise.all([
        fulfilmentService.getSummaryStats(),
        fulfilmentService.getOrders(),
        fulfilmentService.getBatches()
      ]);
      setStats(summaryStats);
      setRecentOrders(ordersList.slice(0, 6));
      setActiveBatches(batchesList.slice(0, 4));
    } catch (err: any) {
      console.error("Error loading fulfilment hub:", err);
      showToast("Error refreshing fulfilment overview", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSyncInvoices = async () => {
    try {
      setLoading(true);
      const synced = await fulfilmentService.syncFromInvoices();
      showToast(`Synced ${synced.length} orders from invoices.`, "success");
      loadData();
    } catch (err) {
      showToast("Sync failed", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12 font-sans">
      
      {/* Hero Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-lg border border-slate-800 relative overflow-hidden">
        <div className="absolute -right-12 -bottom-12 opacity-10 pointer-events-none">
          <Truck size={280} />
        </div>

        <div className="space-y-4 relative z-10 max-w-3xl">
          <div className="flex items-center gap-2">
            <span className="bg-blue-600/30 text-blue-300 border border-blue-400/30 text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full flex items-center gap-1">
              <Store size={12} />
              Integrated Fulfilment & Logistics Workspace
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white leading-tight">
            Pick & Drop Dispatch and QR Collection Desk
          </h1>

          <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
            Manage the entire pipeline from confirmed customer invoices to warehouse staging, dispatch batch manifests, cryptographically verified QR passes, and counter handover with instant receipt settlements.
          </p>

          <div className="flex flex-wrap gap-2.5 pt-2">
            <button
              onClick={() => navigate("/fulfilment/scan")}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-extrabold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <QrCode size={15} />
              Scan QR at Collection Desk
            </button>

            <button
              onClick={() => navigate("/fulfilment/orders")}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <Package size={15} />
              Stage & Prepare Orders
            </button>

            <button
              onClick={() => navigate("/fulfilment/batches")}
              className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl border border-slate-700 transition-all cursor-pointer"
            >
              <Truck size={15} />
              Pick & Drop Batches
            </button>

            <button
              onClick={handleSyncInvoices}
              disabled={loading}
              className="flex items-center gap-1 px-3 py-2 bg-slate-900/80 hover:bg-slate-800 text-slate-300 font-bold text-xs rounded-xl border border-slate-700 transition-all cursor-pointer"
              title="Sync unfulfilled invoices"
            >
              <RefreshCw size={13} className={loading ? "animate-spin text-blue-400" : ""} />
              Sync Invoices
            </button>
          </div>
        </div>
      </div>

      {/* KPI Metrics Dashboard */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        
        {/* Metric 1: Awaiting Prep */}
        <Link 
          to="/fulfilment/orders"
          className="p-4 bg-white rounded-3xl border border-slate-200 shadow-xs hover:border-amber-300 hover:shadow-md transition-all group"
        >
          <div className="flex items-center justify-between text-amber-600 mb-2">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Awaiting Prep</span>
            <div className="w-7 h-7 rounded-xl bg-amber-50 flex items-center justify-center">
              <Clock size={15} />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-slate-900 group-hover:text-amber-600 transition-colors">
            {stats.awaitingPreparation}
          </p>
          <span className="text-[10px] text-slate-400 mt-1 block">Invoices ready to pack</span>
        </Link>

        {/* Metric 2: Prepared / Staged */}
        <Link 
          to="/fulfilment/orders"
          className="p-4 bg-white rounded-3xl border border-slate-200 shadow-xs hover:border-blue-300 hover:shadow-md transition-all group"
        >
          <div className="flex items-center justify-between text-blue-600 mb-2">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Prepared & Staged</span>
            <div className="w-7 h-7 rounded-xl bg-blue-50 flex items-center justify-center">
              <Package size={15} />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-slate-900 group-hover:text-blue-600 transition-colors">
            {stats.preparedReadyForDispatch}
          </p>
          <span className="text-[10px] text-slate-400 mt-1 block">Tickets issued & boxed</span>
        </Link>

        {/* Metric 3: In Transit Batches */}
        <Link 
          to="/fulfilment/batches"
          className="p-4 bg-white rounded-3xl border border-slate-200 shadow-xs hover:border-purple-300 hover:shadow-md transition-all group"
        >
          <div className="flex items-center justify-between text-purple-600 mb-2">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">In Transit Batches</span>
            <div className="w-7 h-7 rounded-xl bg-purple-50 flex items-center justify-center">
              <Truck size={15} />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-slate-900 group-hover:text-purple-600 transition-colors">
            {stats.inTransitBatches}
          </p>
          <span className="text-[10px] text-slate-400 mt-1 block">On courier route</span>
        </Link>

        {/* Metric 4: At Collection Desk */}
        <Link 
          to="/fulfilment/scan"
          className="p-4 bg-white rounded-3xl border border-slate-200 shadow-xs hover:border-teal-300 hover:shadow-md transition-all group"
        >
          <div className="flex items-center justify-between text-teal-600 mb-2">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">At Pickup Desk</span>
            <div className="w-7 h-7 rounded-xl bg-teal-50 flex items-center justify-center">
              <Store size={15} />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-slate-900 group-hover:text-teal-600 transition-colors">
            {stats.atPickupPoint}
          </p>
          <span className="text-[10px] text-slate-400 mt-1 block">Awaiting customer QR scan</span>
        </Link>

        {/* Metric 5: Completed Collections */}
        <div className="p-4 bg-white rounded-3xl border border-slate-200 shadow-xs col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between text-emerald-600 mb-2">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Completed Handover</span>
            <div className="w-7 h-7 rounded-xl bg-emerald-50 flex items-center justify-center">
              <CheckCircle2 size={15} />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-slate-900">
            {stats.completedCollectionsToday}
          </p>
          <span className="text-[10px] text-slate-400 mt-1 block">Released to customer</span>
        </div>

      </div>

      {/* Main Operations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Recent Orders Ready for Action (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          
          <div className="flex items-center justify-between">
            <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <Package size={18} className="text-blue-600" />
              Active Consignments & Tickets
            </h2>
            <Link 
              to="/fulfilment/orders" 
              className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              View All Orders
              <ArrowRight size={13} />
            </Link>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            {recentOrders.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                No active fulfilment orders. Sync with invoices to begin.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {recentOrders.map((ord) => (
                  <div key={ord.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors text-xs">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{ord.customerName}</span>
                        {ord.ticketNumber && (
                          <span className="font-mono text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                            #{ord.ticketNumber}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400">
                        {ord.orderNumber} • Invoice {ord.invoiceNumber} • {ord.items.length} items
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                          ord.status === "Collected"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : ord.status === "Prepared"
                            ? "bg-blue-50 text-blue-700 border border-blue-200"
                            : "bg-amber-50 text-amber-700 border border-amber-200"
                        }`}>
                          {ord.status}
                        </span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          {ord.stagingBay || ord.pickupLocation}
                        </span>
                      </div>

                      {ord.ticketNumber && (
                        <button
                          onClick={() => setSelectedOrderForQR(ord)}
                          className="p-2 bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-600 rounded-xl transition-colors cursor-pointer"
                          title="Show QR Pass"
                        >
                          <QrCode size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pick & Drop Batches Mini View */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Truck size={18} className="text-purple-600" />
                Recent Pick & Drop Batches
              </h2>
              <Link 
                to="/fulfilment/batches" 
                className="text-xs font-bold text-purple-600 hover:text-purple-700 flex items-center gap-1"
              >
                Manage Batches
                <ArrowRight size={13} />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {activeBatches.map(b => (
                <div key={b.id} className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-slate-900">{b.batchNumber}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                      {b.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-500 text-[11px]">
                    <span className="flex items-center gap-1">
                      <MapPin size={11} className="text-blue-600" />
                      {b.pickupLocation}
                    </span>
                    <span>{b.totalOrders} orders</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Right Column: Workflows & Desk Quick Tools */}
        <div className="space-y-4">
          
          <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <Sparkles size={18} className="text-amber-500" />
            Collection Desk Quick Tools
          </h2>

          <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-3">
            <button
              onClick={() => navigate("/fulfilment/scan")}
              className="w-full p-3.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-2xl flex items-center gap-3 transition-colors text-left cursor-pointer group"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                <QrCode size={20} />
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-xs text-emerald-950 group-hover:text-emerald-900">QR Code Desk Scanner</h4>
                <p className="text-[11px] text-emerald-700">Scan customer passes, verify items, and release goods</p>
              </div>
              <ArrowRight size={15} className="text-emerald-600 group-hover:translate-x-1 transition-transform" />
            </button>

            <button
              onClick={() => navigate("/fulfilment/collections")}
              className="w-full p-3.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-2xl flex items-center gap-3 transition-colors text-left cursor-pointer group"
            >
              <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
                <Ticket size={20} />
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-xs text-indigo-950 group-hover:text-indigo-900">Collection Passes</h4>
                <p className="text-[11px] text-indigo-700">View and print customer QR collection passes</p>
              </div>
              <ArrowRight size={15} className="text-indigo-600 group-hover:translate-x-1 transition-transform" />
            </button>

            <button
              onClick={() => navigate("/fulfilment/batches")}
              className="w-full p-3.5 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-2xl flex items-center gap-3 transition-colors text-left cursor-pointer group"
            >
              <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0">
                <Truck size={20} />
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-xs text-purple-950 group-hover:text-purple-900">Dispatch Manifests</h4>
                <p className="text-[11px] text-purple-700">Create batches & print courier handover sheets</p>
              </div>
              <ArrowRight size={15} className="text-purple-600 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          {/* Architecture Integrity Callout */}
          <div className="bg-slate-50 border border-slate-200 rounded-3xl p-5 space-y-2 text-xs text-slate-600">
            <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block">
              Direct System Integration
            </span>
            <p className="font-bold text-slate-800">No Disconnected Ticketing</p>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Every preparation, transit, and collection action writes real-time stock movements to the inventory ledger and synchronizes payment receipts without duplicating accounting records.
            </p>
          </div>

        </div>

      </div>

      {/* QR Modal */}
      {selectedOrderForQR && (
        <QRCodeModal
          isOpen={true}
          order={selectedOrderForQR}
          onClose={() => setSelectedOrderForQR(null)}
        />
      )}

    </div>
  );
};
