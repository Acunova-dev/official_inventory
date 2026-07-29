import React from "react";
import { FastSlowMovingData, ProductPerformanceItem } from "../../types";
import { Zap, Snail, AlertOctagon, ArrowUpRight, Clock, Package } from "lucide-react";

interface Props {
  data: FastSlowMovingData;
  deadStockDays: number;
  onSelectDeadStockDays: (days: number) => void;
  onSelectProduct: (productId: string) => void;
}

export const FastSlowMovingSection: React.FC<Props> = ({
  data,
  deadStockDays,
  onSelectDeadStockDays,
  onSelectProduct
}) => {
  return (
    <div className="space-y-6">
      
      {/* Section Title */}
      <div className="border-b border-slate-200 pb-3">
        <h2 className="text-lg font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          <Zap className="text-amber-500" size={20} />
          <span>Fast & Slow Moving Products & Dead Stock Analysis</span>
        </h2>
        <p className="text-xs text-slate-500">
          Deterministic velocity categorization based on historical sales receipts and date of last recorded sale.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Fast Moving Products */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-3xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <span className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg">
                  <Zap size={16} />
                </span>
                <span>Fast Moving Products</span>
              </h3>
              <span className="text-xs font-mono font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                Top Velocity
              </span>
            </div>

            <p className="text-xs text-slate-400 mb-4">
              Ranked by average daily sales volume over the selected filtering window.
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="p-2.5">Product</th>
                    <th className="p-2.5 text-right">Units Sold</th>
                    <th className="p-2.5 text-right">Avg Daily</th>
                    <th className="p-2.5 text-right">Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {data.fastMoving.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-4 text-center text-slate-400">No fast moving products recorded</td>
                    </tr>
                  ) : (
                    data.fastMoving.slice(0, 5).map((p) => (
                      <tr 
                        key={p.id} 
                        onClick={() => onSelectProduct(p.id)}
                        className="hover:bg-emerald-50/40 cursor-pointer transition-colors"
                      >
                        <td className="p-2.5 max-w-[180px]">
                          <div className="font-bold text-slate-900 truncate">{p.name}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{p.sku}</div>
                        </td>
                        <td className="p-2.5 text-right font-mono font-bold text-slate-800">{p.unitsSold}</td>
                        <td className="p-2.5 text-right font-mono font-bold text-emerald-600">
                          {p.avgDailySales} /d
                        </td>
                        <td className="p-2.5 text-right font-mono font-black text-slate-900">
                          ${p.revenue.toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Slow Moving Products */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-3xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <span className="p-1.5 bg-amber-100 text-amber-700 rounded-lg">
                  <Snail size={16} />
                </span>
                <span>Slow Moving Products</span>
              </h3>
              <span className="text-xs font-mono font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                Low Activity
              </span>
            </div>

            <p className="text-xs text-slate-400 mb-4">
              Products with active stock but low daily turnover rates (&le; 0.5 units/day).
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="p-2.5">Product</th>
                    <th className="p-2.5 text-right">Units Sold</th>
                    <th className="p-2.5 text-right">Avg Daily</th>
                    <th className="p-2.5 text-right">Days Since Sale</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {data.slowMoving.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-4 text-center text-slate-400">No slow moving products recorded</td>
                    </tr>
                  ) : (
                    data.slowMoving.slice(0, 5).map((p) => (
                      <tr 
                        key={p.id} 
                        onClick={() => onSelectProduct(p.id)}
                        className="hover:bg-amber-50/40 cursor-pointer transition-colors"
                      >
                        <td className="p-2.5 max-w-[180px]">
                          <div className="font-bold text-slate-900 truncate">{p.name}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{p.sku}</div>
                        </td>
                        <td className="p-2.5 text-right font-mono font-bold text-slate-800">{p.unitsSold}</td>
                        <td className="p-2.5 text-right font-mono font-bold text-amber-600">
                          {p.avgDailySales} /d
                        </td>
                        <td className="p-2.5 text-right font-mono font-bold text-slate-700">
                          {p.daysSinceLastSale}d
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>

      {/* Dead Stock Full Width Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-3xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <span className="p-1.5 bg-rose-100 text-rose-700 rounded-lg">
                <AlertOctagon size={16} />
              </span>
              <span>Dead Stock Registry</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Factual list of inventory with zero sales activity within the selected inactivity window.
            </p>
          </div>

          {/* Threshold selector */}
          <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
            <span className="text-[11px] font-bold text-slate-500 px-2">No sales in:</span>
            {[30, 60, 90, 180].map((days) => (
              <button
                key={days}
                onClick={() => onSelectDeadStockDays(days)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  deadStockDays === days ? "bg-rose-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {days} Days
              </button>
            ))}
          </div>
        </div>

        {/* Dead Stock Table */}
        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="p-3">Product Name</th>
                <th className="p-3">SKU</th>
                <th className="p-3">Category</th>
                <th className="p-3 text-right">Current Stock</th>
                <th className="p-3 text-right">Inventory Value</th>
                <th className="p-3 text-right">Days Inactive</th>
                <th className="p-3">Warehouse Location</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {data.deadStock.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-slate-400">
                    No dead stock found for the &gt;{deadStockDays} days threshold.
                  </td>
                </tr>
              ) : (
                data.deadStock.map((p) => (
                  <tr 
                    key={p.id}
                    onClick={() => onSelectProduct(p.id)}
                    className="hover:bg-rose-50/50 cursor-pointer transition-colors"
                  >
                    <td className="p-3 font-bold text-slate-900">{p.name}</td>
                    <td className="p-3 font-mono font-bold text-blue-600">{p.sku}</td>
                    <td className="p-3">
                      <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px]">
                        {p.category}
                      </span>
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-slate-900">{p.currentStock}</td>
                    <td className="p-3 text-right font-mono font-bold text-rose-600">
                      ${(p.currentStock * p.costPrice).toLocaleString()}
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-rose-700">{p.daysSinceLastSale} days</td>
                    <td className="p-3 text-slate-600">{p.warehouse}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
