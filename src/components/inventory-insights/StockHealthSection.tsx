import React from "react";
import { StockHealthSummaryData, ProductPerformanceItem } from "../../types";
import { ShieldCheck, AlertTriangle, AlertOctagon, CheckCircle2, XCircle, Layers } from "lucide-react";

interface Props {
  stockHealth: StockHealthSummaryData;
  products: ProductPerformanceItem[];
  onSelectProduct: (productId: string) => void;
}

const statusBadgeClasses: Record<string, string> = {
  Healthy: "bg-emerald-50 text-emerald-800 border-emerald-200",
  "Low Stock": "bg-amber-50 text-amber-800 border-amber-200",
  "Critical Stock": "bg-rose-50 text-rose-800 border-rose-200",
  Overstocked: "bg-indigo-50 text-indigo-800 border-indigo-200",
  "Out of Stock": "bg-slate-100 text-slate-800 border-slate-300"
};

export const StockHealthSection: React.FC<Props> = ({ stockHealth, products, onSelectProduct }) => {
  return (
    <div className="space-y-6">
      
      {/* Title */}
      <div className="border-b border-slate-200 pb-3">
        <h2 className="text-lg font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          <ShieldCheck className="text-emerald-600" size={20} />
          <span>Stock Health & Safety Threshold Compliance</span>
        </h2>
        <p className="text-xs text-slate-500">
          Threshold monitoring based on minimum, maximum, and reorder stock targets configured per product.
        </p>
      </div>

      {/* Summary Distribution Progress Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {stockHealth.healthBreakdown.map((item) => (
          <div key={item.status} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-3xs space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500">
              <span className="truncate">{item.status}</span>
              <span className="font-mono text-slate-900">{item.count}</span>
            </div>

            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              <div 
                className={`h-full ${
                  item.status === "Healthy" ? "bg-emerald-500" :
                  item.status === "Low Stock" ? "bg-amber-500" :
                  item.status === "Critical Stock" ? "bg-rose-600" :
                  item.status === "Overstocked" ? "bg-indigo-500" : "bg-slate-400"
                }`}
                style={{ width: `${Math.min(100, item.percentage)}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
              <span>{item.percentage}% of catalog</span>
              <span>${item.inventoryValue.toLocaleString()}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Stock Threshold Detail Table */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-3xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
          Stock Threshold Audit Matrix
        </h3>

        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="p-3">Product Name</th>
                <th className="p-3">SKU</th>
                <th className="p-3 text-right">Current Stock</th>
                <th className="p-3 text-right">Min Stock Level</th>
                <th className="p-3 text-right">Max Stock Level</th>
                <th className="p-3 text-right">Reorder Level</th>
                <th className="p-3 text-right">Inventory Value</th>
                <th className="p-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {products.map((p) => (
                <tr 
                  key={p.id}
                  onClick={() => onSelectProduct(p.id)}
                  className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                >
                  <td className="p-3 font-bold text-slate-900">{p.name}</td>
                  <td className="p-3 font-mono font-bold text-blue-600">{p.sku}</td>
                  <td className="p-3 text-right font-mono font-black text-slate-900">{p.currentStock}</td>
                  <td className="p-3 text-right font-mono text-slate-600">{p.minStock}</td>
                  <td className="p-3 text-right font-mono text-slate-600">{p.maxStock}</td>
                  <td className="p-3 text-right font-mono font-bold text-amber-600">{p.reorderLevel}</td>
                  <td className="p-3 text-right font-mono font-bold text-slate-900">
                    ${(p.currentStock * p.costPrice).toLocaleString()}
                  </td>
                  <td className="p-3 text-center">
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${statusBadgeClasses[p.healthStatus] || statusBadgeClasses.Healthy}`}>
                      {p.healthStatus}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
