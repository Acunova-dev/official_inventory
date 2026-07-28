import React, { useState } from "react";
import { ProductPerformanceItem } from "../../types";
import { 
  Package, 
  Search, 
  ArrowUpDown, 
  ChevronUp, 
  ChevronDown, 
  ExternalLink, 
  DollarSign, 
  TrendingUp,
  Percent,
  Calendar,
  Clock,
  Download
} from "lucide-react";

interface Props {
  products: ProductPerformanceItem[];
  onSelectProduct: (productId: string) => void;
}

type SortField = 
  | "name" 
  | "sku" 
  | "category" 
  | "currentStock" 
  | "unitsSold" 
  | "revenue" 
  | "grossProfit" 
  | "profitMargin" 
  | "avgDailySales" 
  | "avgMonthlySales" 
  | "lastSaleDate" 
  | "daysSinceLastSale";

export const ProductPerformanceTable: React.FC<Props> = ({ products, onSelectProduct }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<SortField>("revenue");
  const [sortAsc, setSortAsc] = useState(false);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false); // default descending for metrics
    }
  };

  const filtered = products.filter((p) => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      p.brand.toLowerCase().includes(q)
    );
  });

  const sorted = [...filtered].sort((a, b) => {
    let aVal: any = a[sortField];
    let bVal: any = b[sortField];

    if (typeof aVal === "string") {
      return sortAsc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    }
    return sortAsc ? aVal - bVal : bVal - aVal;
  });

  const renderSortHeader = (label: string, field: SortField, alignRight = false) => {
    const isActive = sortField === field;
    return (
      <th 
        onClick={() => handleSort(field)}
        className={`p-3.5 cursor-pointer hover:bg-slate-100 transition-colors select-none ${alignRight ? "text-right" : "text-left"}`}
      >
        <div className={`inline-flex items-center gap-1 font-bold ${alignRight ? "justify-end" : "justify-start"}`}>
          <span>{label}</span>
          {isActive ? (
            sortAsc ? <ChevronUp size={14} className="text-blue-600" /> : <ChevronDown size={14} className="text-blue-600" />
          ) : (
            <ArrowUpDown size={12} className="text-slate-300 opacity-60" />
          )}
        </div>
      </th>
    );
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-3xs overflow-hidden space-y-4 p-5">
      
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Package className="text-blue-600" size={20} />
            <span>Product Performance Matrix</span>
          </h2>
          <p className="text-xs text-slate-500">
            Click any product row to open detailed purchase, sale, and movement histories.
          </p>
        </div>

        {/* Search & Export */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
              <Search size={15} />
            </span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search SKU or product name..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>

          <button
            type="button"
            onClick={() => {
              const headers = ["Product ID", "Name", "SKU", "Category", "Brand", "Supplier", "Warehouse", "Branch", "Stock", "Units Sold", "Revenue ($)", "COGS ($)", "Gross Profit ($)", "Margin (%)", "Velocity", "Days Cover", "Days Since Sale", "Health"];
              const rows = sorted.map((p) => [
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
                p.cogs,
                p.grossProfit,
                p.profitMargin,
                p.salesVelocity,
                p.stockCoverDays,
                p.daysSinceLastSale,
                p.healthStatus
              ]);
              const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
              const link = document.createElement("a");
              link.setAttribute("href", encodeURI(csvContent));
              link.setAttribute("download", `Product_Performance_Matrix_${new Date().toISOString().split("T")[0]}.csv`);
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }}
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all shrink-0 flex items-center gap-1.5 text-xs font-semibold px-3"
            title="Export Matrix as CSV"
          >
            <Download size={14} className="text-blue-600" />
            <span className="hidden md:inline">CSV</span>
          </button>
        </div>
      </div>

      {/* Table Canvas */}
      <div className="overflow-x-auto border border-slate-200 rounded-xl">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50/90 text-slate-600 uppercase tracking-wider font-bold border-b border-slate-200">
            <tr>
              {renderSortHeader("Product Name", "name")}
              {renderSortHeader("SKU", "sku")}
              {renderSortHeader("Category", "category")}
              {renderSortHeader("Stock", "currentStock", true)}
              {renderSortHeader("Units Sold", "unitsSold", true)}
              {renderSortHeader("Revenue", "revenue", true)}
              {renderSortHeader("Gross Profit", "grossProfit", true)}
              {renderSortHeader("Margin %", "profitMargin", true)}
              {renderSortHeader("Avg Daily", "avgDailySales", true)}
              {renderSortHeader("Avg Monthly", "avgMonthlySales", true)}
              {renderSortHeader("Last Sale", "lastSaleDate")}
              {renderSortHeader("Days Since", "daysSinceLastSale", true)}
              <th className="p-3.5 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium">
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={13} className="p-8 text-center text-slate-400 font-medium">
                  No products matched the active search or filter rules.
                </td>
              </tr>
            ) : (
              sorted.map((p) => (
                <tr 
                  key={p.id}
                  onClick={() => onSelectProduct(p.id)}
                  className="hover:bg-blue-50/50 transition-colors cursor-pointer group"
                >
                  <td className="p-3.5 max-w-[200px]">
                    <div className="font-extrabold text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                      {p.name}
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">{p.brand}</span>
                  </td>

                  <td className="p-3.5 font-mono text-blue-600 font-bold whitespace-nowrap">
                    {p.sku}
                  </td>

                  <td className="p-3.5 whitespace-nowrap">
                    <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px] font-bold">
                      {p.category}
                    </span>
                  </td>

                  <td className="p-3.5 text-right font-mono font-bold whitespace-nowrap">
                    <span className={p.currentStock <= p.minStock ? "text-amber-600" : "text-slate-900"}>
                      {p.currentStock}
                    </span>
                  </td>

                  <td className="p-3.5 text-right font-mono font-bold whitespace-nowrap text-slate-800">
                    {p.unitsSold}
                  </td>

                  <td className="p-3.5 text-right font-mono font-extrabold text-slate-900 whitespace-nowrap">
                    ${p.revenue.toLocaleString()}
                  </td>

                  <td className="p-3.5 text-right font-mono font-bold text-emerald-600 whitespace-nowrap">
                    ${p.grossProfit.toLocaleString()}
                  </td>

                  <td className="p-3.5 text-right font-mono font-extrabold whitespace-nowrap">
                    <span className={`px-2 py-0.5 rounded text-[11px] ${
                      p.profitMargin < 0 ? "bg-rose-100 text-rose-800 font-black" : "bg-emerald-50 text-emerald-700"
                    }`}>
                      {p.profitMargin}%
                    </span>
                  </td>

                  <td className="p-3.5 text-right font-mono text-slate-600 whitespace-nowrap">
                    {p.avgDailySales} /d
                  </td>

                  <td className="p-3.5 text-right font-mono text-slate-600 whitespace-nowrap">
                    {p.avgMonthlySales} /m
                  </td>

                  <td className="p-3.5 font-mono text-slate-500 whitespace-nowrap">
                    {p.lastSaleDate}
                  </td>

                  <td className="p-3.5 text-right font-mono font-bold whitespace-nowrap">
                    <span className={p.daysSinceLastSale >= 30 ? "text-rose-600" : "text-slate-600"}>
                      {p.daysSinceLastSale}d
                    </span>
                  </td>

                  <td className="p-3.5 text-center">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectProduct(p.id);
                      }}
                      className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-100 transition-colors"
                      title="Inspect Product History"
                    >
                      <ExternalLink size={15} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
        <span>Showing {sorted.length} of {products.length} products</span>
        <span className="font-mono">Sorted by {sortField} ({sortAsc ? "Ascending" : "Descending"})</span>
      </div>

    </div>
  );
};
