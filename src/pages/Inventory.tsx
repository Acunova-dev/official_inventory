import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { productService } from "../services/api";
import { BarcodeScannerModal } from "../components/BarcodeScannerModal";
import { 
  Activity, 
  Search, 
  MapPin, 
  AlertTriangle, 
  CheckCircle, 
  XOctagon, 
  Loader2, 
  Barcode,
  Camera,
  Tag
} from "lucide-react";

export const Inventory: React.FC = () => {
  const [search, setSearch] = useState("");
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["inventory-monitoring", search],
    queryFn: () => productService.getAll({ search }),
  });

  const products = data?.products || [];
  const valuation = data?.valuation;

  const getStatusColorClass = (status: string) => {
    switch (status) {
      case "In Stock": return "bg-emerald-50 text-emerald-800 border-emerald-200";
      case "Low Stock": return "bg-amber-50 text-amber-800 border-amber-200";
      case "Out Of Stock": return "bg-rose-50 text-rose-800 border-rose-200";
      default: return "bg-slate-50 text-slate-800 border-slate-200";
    }
  };

  const statusIcons = {
    "In Stock": <CheckCircle size={15} className="text-emerald-500 shrink-0" />,
    "Low Stock": <AlertTriangle size={15} className="text-amber-500 shrink-0" />,
    "Out Of Stock": <XOctagon size={15} className="text-rose-500 shrink-0" />,
  };

  return (
    <div className="space-y-6">
      
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Stock & Warehousing Monitor</h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time sensor-grid tracking drawer locations, restocking urgency indexes, and valuation estimates.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsScannerOpen(true)}
          id="btn-scan-barcode-inventory"
          className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold rounded-xl shadow-md transition-all self-start sm:self-center"
        >
          <Barcode size={18} className="text-blue-400" />
          <span>Scan Stock Tag</span>
        </button>
      </div>

      {/* Valuation Metrics Summary */}
      {valuation && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-3xs flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Asset Capitalized Value</span>
              <h3 className="text-xl font-bold font-mono text-slate-950">${valuation.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h3>
            </div>
            <span className="text-2xl font-black text-blue-500/20 font-mono">COST</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-3xs flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Potential Retail Yield</span>
              <h3 className="text-xl font-bold font-mono text-slate-950">${valuation.totalSelling.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h3>
            </div>
            <span className="text-2xl font-black text-emerald-500/20 font-mono">MKT</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-3xs flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Expected Inventory Profit</span>
              <h3 className="text-xl font-bold font-mono text-emerald-600">${valuation.expectedProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h3>
            </div>
            <span className="text-2xl font-black text-indigo-500/20 font-mono">PCT</span>
          </div>
        </div>
      )}

      {/* Filtering Search bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <div className="relative w-full max-w-md">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 pointer-events-none">
            <Search size={16} />
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-10 py-2.5 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500 transition-all font-medium"
            placeholder="Search by barcode, SKU, name, shelf slot..."
          />
          <button
            type="button"
            onClick={() => setIsScannerOpen(true)}
            title="Scan barcode with camera"
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-blue-600 transition-colors"
          >
            <Camera size={18} />
          </button>
        </div>
      </div>

      {/* Dynamic Inventory Bento Grid */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="animate-spin text-blue-600" size={32} />
          <p className="text-slate-400 text-sm font-semibold">Scanning drawer sensors...</p>
        </div>
      ) : products.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products.map((p) => (
            <div key={p.id} className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-3xs hover:shadow-xs transition-shadow flex flex-col justify-between group">
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[10px] font-bold text-slate-450 uppercase font-mono bg-slate-100 p-1 rounded-sm max-w-[120px] truncate">
                    {p.category}
                  </span>
                  
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getStatusColorClass(p.status)}`}>
                    {(statusIcons as any)[p.status]}
                    <span>{p.status}</span>
                  </span>
                </div>

                <h3 className="font-extrabold text-slate-900 leading-snug group-hover:text-blue-600 transition-all text-sm h-10 line-clamp-2">
                  {p.name}
                </h3>

                {(p.sku || p.barcode) && (
                  <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-500 pt-0.5">
                    <Tag size={12} className="text-slate-400 shrink-0" />
                    <span>{p.sku || p.barcode}</span>
                  </div>
                )}
              </div>

              {/* Drawer Slot Coordinate */}
              <div className="mt-4 pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between text-xs font-medium">
                  <div className="flex items-center gap-1.5 text-slate-600">
                    <MapPin size={13} className="text-slate-400 shrink-0" />
                    <span className="font-mono text-[11px] font-bold">{p.location || "Central Bay"}</span>
                  </div>
                  
                  <div className="text-right">
                    <span className="text-slate-400">Inventory Level:</span>
                    <span className={`block font-black font-mono text-sm mt-0.5 ${p.quantity <= p.minStock ? "text-amber-600" : "text-slate-950"}`}>
                      {p.quantity} <span className="text-[10px] text-slate-400 font-sans font-normal">items</span>
                    </span>
                  </div>
                </div>

                {/* Logistics alerts */}
                {p.quantity <= p.minStock && (
                  <div className="mt-3.5 p-2 bg-amber-50/50 border border-amber-100/60 rounded-xl flex gap-1.5 text-[10px] text-amber-900 font-medium leading-normal">
                    <AlertTriangle size={12} className="text-amber-500 shrink-0 mt-0.5 animate-bounce" />
                    <p>Alert: Stock has breached the {p.minStock}-unit safety threshold. Trigger restock order.</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3 bg-white rounded-2xl border border-slate-205">
          <Activity size={40} className="stroke-1 text-slate-300" />
          <p className="text-sm font-semibold">No stock records linked to this company node</p>
        </div>
      )}

      {/* Barcode Scanner Modal */}
      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        products={products}
        onScannedBarcode={(code) => {
          setSearch(code);
        }}
        title="Inventory Warehouse Tag Scanner"
      />

    </div>
  );
};
