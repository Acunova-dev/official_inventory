import React, { useState } from "react";
import { ProductPerformanceItem } from "../../types";
import { DollarSign, AlertCircle, TrendingUp, TrendingDown, ArrowUpDown } from "lucide-react";

interface Props {
  products: ProductPerformanceItem[];
  onSelectProduct: (productId: string) => void;
}

type ProfitSortOption = "highestRevenue" | "highestProfit" | "highestMargin" | "lowestMargin";

export const ProductProfitabilitySection: React.FC<Props> = ({ products, onSelectProduct }) => {
  const [sortBy, setSortBy] = useState<ProfitSortOption>("highestRevenue");

  const sortedProducts = [...products].sort((a, b) => {
    if (sortBy === "highestRevenue") return b.revenue - a.revenue;
    if (sortBy === "highestProfit") return b.grossProfit - a.grossProfit;
    if (sortBy === "highestMargin") return b.profitMargin - a.profitMargin;
    if (sortBy === "lowestMargin") return a.profitMargin - b.profitMargin;
    return b.revenue - a.revenue;
  });

  const negativeMarginProducts = products.filter((p) => p.profitMargin < 0);

  return (
    <div className="space-y-6">
      
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <DollarSign className="text-emerald-600" size={20} />
            <span>Product Profitability Analysis</span>
          </h2>
          <p className="text-xs text-slate-500">
            Unit cost vs selling price margins with visual highlighting for negative-yield clearance items.
          </p>
        </div>

        {/* Sorting Controls */}
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
          <span className="text-[11px] font-bold text-slate-500 px-2 flex items-center gap-1">
            <ArrowUpDown size={12} /> Sort:
          </span>
          <button
            onClick={() => setSortBy("highestRevenue")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              sortBy === "highestRevenue" ? "bg-white text-blue-600 shadow-xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Highest Revenue
          </button>
          <button
            onClick={() => setSortBy("highestProfit")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              sortBy === "highestProfit" ? "bg-white text-blue-600 shadow-xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Highest Profit
          </button>
          <button
            onClick={() => setSortBy("highestMargin")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              sortBy === "highestMargin" ? "bg-white text-blue-600 shadow-xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Highest Margin
          </button>
          <button
            onClick={() => setSortBy("lowestMargin")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              sortBy === "lowestMargin" ? "bg-rose-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Lowest Margin
          </button>
        </div>
      </div>

      {/* Negative Margin Alert Banner if present */}
      {negativeMarginProducts.length > 0 && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3 text-rose-900">
          <AlertCircle size={20} className="text-rose-600 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <h4 className="font-extrabold text-sm">
              Negative Margin Deficit Alert ({negativeMarginProducts.length} items flagged)
            </h4>
            <p className="text-rose-700 leading-normal font-medium">
              The following products are selling below their unit cost price: {" "}
              <span className="font-bold underline">
                {negativeMarginProducts.map((p) => `${p.name} (${p.profitMargin}%)`).join(", ")}
              </span>. Review clearance pricing rules to mitigate margin loss.
            </p>
          </div>
        </div>
      )}

      {/* Profitability Table */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-3xs space-y-4">
        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="p-3.5">Product</th>
                <th className="p-3.5">SKU</th>
                <th className="p-3.5 text-right">Unit Cost</th>
                <th className="p-3.5 text-right">Selling Price</th>
                <th className="p-3.5 text-right">Period Revenue</th>
                <th className="p-3.5 text-right">Period Cost (COGS)</th>
                <th className="p-3.5 text-right">Gross Profit</th>
                <th className="p-3.5 text-right">Profit Margin (%)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {sortedProducts.map((p) => {
                const isNegative = p.profitMargin < 0;
                return (
                  <tr 
                    key={p.id}
                    onClick={() => onSelectProduct(p.id)}
                    className={`hover:bg-slate-50/80 cursor-pointer transition-colors ${
                      isNegative ? "bg-rose-50/40 hover:bg-rose-50/70" : ""
                    }`}
                  >
                    <td className="p-3.5 font-bold text-slate-900">
                      <div className="flex items-center gap-2">
                        {isNegative && (
                          <span className="p-1 bg-rose-100 text-rose-700 rounded-md" title="Negative Profit Margin">
                            <TrendingDown size={14} />
                          </span>
                        )}
                        <span>{p.name}</span>
                      </div>
                    </td>

                    <td className="p-3.5 font-mono font-bold text-blue-600">{p.sku}</td>

                    <td className="p-3.5 text-right font-mono text-slate-600">${p.costPrice.toLocaleString()}</td>
                    <td className="p-3.5 text-right font-mono text-slate-900">${p.sellingPrice.toLocaleString()}</td>

                    <td className="p-3.5 text-right font-mono font-bold text-slate-900">
                      ${p.revenue.toLocaleString()}
                    </td>

                    <td className="p-3.5 text-right font-mono text-slate-600">
                      ${p.cogs.toLocaleString()}
                    </td>

                    <td className={`p-3.5 text-right font-mono font-extrabold ${isNegative ? "text-rose-600" : "text-emerald-600"}`}>
                      ${p.grossProfit.toLocaleString()}
                    </td>

                    <td className="p-3.5 text-right font-mono font-black">
                      <span className={`inline-block px-2.5 py-1 rounded-md text-xs ${
                        isNegative ? "bg-rose-600 text-white shadow-xs" : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      }`}>
                        {p.profitMargin}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
