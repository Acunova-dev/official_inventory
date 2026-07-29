import React, { useState } from "react";
import { DetailedProductView } from "../../types";
import { 
  X, 
  Package, 
  Building2, 
  MapPin, 
  Store, 
  Truck, 
  DollarSign, 
  TrendingUp, 
  History, 
  ArrowRightLeft, 
  ShoppingBag, 
  Layers,
  Calendar,
  AlertCircle,
  Tag
} from "lucide-react";

interface Props {
  detail: DetailedProductView | null;
  isLoading: boolean;
  onClose: () => void;
}

export const ProductDetailModal: React.FC<Props> = ({ detail, isLoading, onClose }) => {
  const [activeTab, setActiveTab] = useState<"overview" | "purchases" | "sales" | "movements">("overview");

  if (!detail && !isLoading) return null;

  const p = detail?.product;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-200 bg-slate-50/80 flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-md border border-blue-200">
                {p?.sku || "SKU-PROD"}
              </span>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{p?.category}</span>
            </div>
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight leading-snug">
              {p?.name || "Product Details"}
            </h2>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Content */}
        {isLoading || !p ? (
          <div className="p-12 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm text-slate-500 font-medium">Fetching comprehensive historical records...</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            
            {/* Quick Metrics Header Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Current Stock</span>
                <span className="text-lg font-black font-mono text-slate-900 mt-0.5 block">{p.currentStock} units</span>
                <span className="text-[10px] text-slate-400 font-mono">Reserved: {p.reservedStock} units</span>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Unit Selling Price</span>
                <span className="text-lg font-black font-mono text-slate-900 mt-0.5 block">${p.sellingPrice.toLocaleString()}</span>
                <span className="text-[10px] text-slate-400 font-mono">Cost: ${p.costPrice.toLocaleString()}</span>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Period Revenue</span>
                <span className="text-lg font-black font-mono text-emerald-600 mt-0.5 block">${p.revenue.toLocaleString()}</span>
                <span className="text-[10px] text-slate-400 font-mono">Units Sold: {p.unitsSold}</span>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Profit Margin</span>
                <span className={`text-lg font-black font-mono mt-0.5 block ${p.profitMargin < 0 ? 'text-rose-600' : 'text-indigo-600'}`}>
                  {p.profitMargin}%
                </span>
                <span className="text-[10px] text-slate-400 font-mono">Gross: ${p.grossProfit.toLocaleString()}</span>
              </div>
            </div>

            {/* Modal Tabs */}
            <div className="flex border-b border-slate-200 gap-6 text-sm font-bold">
              <button
                onClick={() => setActiveTab("overview")}
                className={`pb-2.5 transition-all border-b-2 ${
                  activeTab === "overview" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                Overview & Location
              </button>
              <button
                onClick={() => setActiveTab("purchases")}
                className={`pb-2.5 transition-all border-b-2 flex items-center gap-1.5 ${
                  activeTab === "purchases" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                <Truck size={15} />
                <span>Purchase Orders ({detail.purchaseHistory.length})</span>
              </button>
              <button
                onClick={() => setActiveTab("sales")}
                className={`pb-2.5 transition-all border-b-2 flex items-center gap-1.5 ${
                  activeTab === "sales" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                <ShoppingBag size={15} />
                <span>Sales Receipts ({detail.salesHistory.length})</span>
              </button>
              <button
                onClick={() => setActiveTab("movements")}
                className={`pb-2.5 transition-all border-b-2 flex items-center gap-1.5 ${
                  activeTab === "movements" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                <ArrowRightLeft size={15} />
                <span>Stock Movements ({detail.stockMovementHistory.length})</span>
              </button>
            </div>

            {/* Tab Views */}
            {activeTab === "overview" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                
                {/* Information Card */}
                <div className="bg-slate-50/80 rounded-2xl p-5 border border-slate-200 space-y-3">
                  <h4 className="font-extrabold text-slate-900 text-sm uppercase tracking-wider flex items-center gap-1.5">
                    <Package size={16} className="text-blue-600" /> Product Metadata
                  </h4>

                  <div className="space-y-2">
                    <div className="flex justify-between py-1.5 border-b border-slate-200/60">
                      <span className="text-slate-500">Brand:</span>
                      <span className="font-bold text-slate-800">{p.brand}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-200/60">
                      <span className="text-slate-500">Supplier:</span>
                      <span className="font-bold text-slate-800">{p.supplierName}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-200/60">
                      <span className="text-slate-500">ABC Category:</span>
                      <span className="font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded font-mono">Category {p.abcCategory}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-200/60">
                      <span className="text-slate-500">Health Status:</span>
                      <span className="font-bold text-slate-800">{p.healthStatus}</span>
                    </div>
                    <div className="flex justify-between py-1.5">
                      <span className="text-slate-500">Days Since Last Sale:</span>
                      <span className="font-mono font-bold text-slate-900">{p.daysSinceLastSale} days</span>
                    </div>
                  </div>
                </div>

                {/* Warehouse & Thresholds Card */}
                <div className="bg-slate-50/80 rounded-2xl p-5 border border-slate-200 space-y-3">
                  <h4 className="font-extrabold text-slate-900 text-sm uppercase tracking-wider flex items-center gap-1.5">
                    <Store size={16} className="text-blue-600" /> Warehousing & Thresholds
                  </h4>

                  <div className="space-y-2">
                    <div className="flex justify-between py-1.5 border-b border-slate-200/60">
                      <span className="text-slate-500">Assigned Warehouse:</span>
                      <span className="font-bold text-slate-800">{p.warehouse}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-200/60">
                      <span className="text-slate-500">Retail Branch:</span>
                      <span className="font-bold text-slate-800">{p.branch}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-200/60">
                      <span className="text-slate-500">Minimum Stock Threshold:</span>
                      <span className="font-mono font-bold text-slate-900">{p.minStock} units</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-200/60">
                      <span className="text-slate-500">Maximum Capacity:</span>
                      <span className="font-mono font-bold text-slate-900">{p.maxStock} units</span>
                    </div>
                    <div className="flex justify-between py-1.5">
                      <span className="text-slate-500">Reorder Trigger Level:</span>
                      <span className="font-mono font-bold text-amber-600">{p.reorderLevel} units</span>
                    </div>
                  </div>
                </div>

              </div>
            )}

            {activeTab === "purchases" && (
              <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="p-3">PO Number</th>
                      <th className="p-3">Supplier</th>
                      <th className="p-3">Date</th>
                      <th className="p-3 text-right">Quantity</th>
                      <th className="p-3 text-right">Unit Cost</th>
                      <th className="p-3 text-right">Total Cost</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {detail.purchaseHistory.map((po) => (
                      <tr key={po.id} className="hover:bg-slate-50/80">
                        <td className="p-3 font-mono font-bold text-blue-600">{po.poNumber}</td>
                        <td className="p-3">{po.supplierName}</td>
                        <td className="p-3 font-mono">{po.date}</td>
                        <td className="p-3 text-right font-mono font-bold">{po.quantity}</td>
                        <td className="p-3 text-right font-mono">${po.unitCost.toLocaleString()}</td>
                        <td className="p-3 text-right font-mono font-bold text-slate-900">${po.totalCost.toLocaleString()}</td>
                        <td className="p-3">
                          <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded font-bold text-[10px]">
                            {po.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === "sales" && (
              <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="p-3">Receipt #</th>
                      <th className="p-3">Customer</th>
                      <th className="p-3">Date</th>
                      <th className="p-3 text-right">Quantity</th>
                      <th className="p-3 text-right">Unit Price</th>
                      <th className="p-3 text-right">Total Revenue</th>
                      <th className="p-3">Branch</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {detail.salesHistory.map((sh) => (
                      <tr key={sh.id} className="hover:bg-slate-50/80">
                        <td className="p-3 font-mono font-bold text-blue-600">{sh.receiptNumber}</td>
                        <td className="p-3">{sh.customerName}</td>
                        <td className="p-3 font-mono">{sh.date}</td>
                        <td className="p-3 text-right font-mono font-bold">{sh.quantity}</td>
                        <td className="p-3 text-right font-mono">${sh.unitPrice.toLocaleString()}</td>
                        <td className="p-3 text-right font-mono font-bold text-emerald-600">${sh.totalPrice.toLocaleString()}</td>
                        <td className="p-3 font-mono text-[11px] text-slate-500">{sh.branch}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === "movements" && (
              <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="p-3">Date</th>
                      <th className="p-3">Type</th>
                      <th className="p-3 text-right">Qty Change</th>
                      <th className="p-3">Reference</th>
                      <th className="p-3">Warehouse</th>
                      <th className="p-3">User</th>
                      <th className="p-3">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {detail.stockMovementHistory.map((m) => (
                      <tr key={m.id} className="hover:bg-slate-50/80">
                        <td className="p-3 font-mono">{m.date}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                            m.type === "Sale" ? "bg-blue-50 text-blue-700" : m.type === "Purchase" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                          }`}>
                            {m.type}
                          </span>
                        </td>
                        <td className={`p-3 text-right font-mono font-bold ${m.quantityChange > 0 ? "text-emerald-600" : "text-rose-600"}`}>
                          {m.quantityChange > 0 ? `+${m.quantityChange}` : m.quantityChange}
                        </td>
                        <td className="p-3 font-mono text-slate-600">{m.reference}</td>
                        <td className="p-3 text-slate-600">{m.warehouse}</td>
                        <td className="p-3 text-slate-600">{m.user}</td>
                        <td className="p-3 text-slate-400 italic">{m.notes || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

          </div>
        )}

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50/80 flex items-center justify-between text-xs text-slate-500">
          <span>Target Product ID: {p?.id}</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors"
          >
            Close Window
          </button>
        </div>

      </div>
    </div>
  );
};
