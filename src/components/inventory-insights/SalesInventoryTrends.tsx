import React, { useState } from "react";
import { TrendPoint, CategoryPerformanceData } from "../../types";
import { 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from "recharts";
import { TrendingUp, BarChart3, PieChart as PieIcon, Calendar, Filter } from "lucide-react";

interface Props {
  salesTrend: TrendPoint[];
  categoryPerformance: CategoryPerformanceData[];
}

const CATEGORY_COLORS = [
  "#2563eb", // blue-600
  "#10b981", // emerald-500
  "#f59e0b", // amber-500
  "#8b5cf6", // purple-500
  "#ec4899", // pink-500
  "#06b6d4", // cyan-500
  "#64748b"  // slate-500
];

// Custom Interactive Tooltips for Trends Charts
const RevenueTrendCustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0].payload as TrendPoint;
  const profit = data.revenue - data.cost;
  const margin = data.revenue > 0 ? ((profit / data.revenue) * 100).toFixed(1) : "0.0";

  return (
    <div className="bg-slate-900/95 backdrop-blur-md text-white p-3.5 rounded-xl shadow-xl border border-slate-700/80 text-xs min-w-[210px] space-y-2">
      <div className="flex items-center justify-between border-b border-slate-700/80 pb-1.5">
        <span className="font-mono font-bold text-blue-400">📅 {data.date || data.label}</span>
        <span className="text-[10px] bg-slate-800 text-slate-300 font-mono px-1.5 py-0.5 rounded">{data.label}</span>
      </div>
      <div className="space-y-1 font-mono">
        <div className="flex items-center justify-between text-blue-300 font-bold">
          <span>Revenue:</span>
          <span>${data.revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
        <div className="flex items-center justify-between text-slate-400">
          <span>Cost (COGS):</span>
          <span>${data.cost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
        <div className="flex items-center justify-between text-emerald-400 font-bold pt-1 border-t border-slate-800">
          <span>Gross Profit:</span>
          <span>${profit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({margin}%)</span>
        </div>
        <div className="flex items-center justify-between text-slate-400 text-[11px] pt-0.5">
          <span>Units Sold:</span>
          <span className="text-slate-200 font-bold">{data.salesVolume} units</span>
        </div>
      </div>
    </div>
  );
};

const SalesVolumeCustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0].payload as TrendPoint;

  return (
    <div className="bg-slate-900/95 backdrop-blur-md text-white p-3.5 rounded-xl shadow-xl border border-slate-700/80 text-xs min-w-[200px] space-y-2">
      <div className="flex items-center justify-between border-b border-slate-700/80 pb-1.5">
        <span className="font-mono font-bold text-emerald-400">📅 {data.date || data.label}</span>
        <span className="text-[10px] bg-emerald-950 text-emerald-300 font-mono px-1.5 py-0.5 rounded border border-emerald-800">Volume Marker</span>
      </div>
      <div className="space-y-1 font-mono">
        <div className="flex items-center justify-between text-emerald-400 font-bold text-sm">
          <span>Units Sold:</span>
          <span>{data.salesVolume.toLocaleString()} units</span>
        </div>
        <div className="flex items-center justify-between text-slate-300 text-[11px]">
          <span>Generated Revenue:</span>
          <span>${data.revenue.toLocaleString()}</span>
        </div>
        <div className="flex items-center justify-between text-slate-400 text-[11px]">
          <span>Inventory Capital:</span>
          <span>${data.inventoryValue.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
};

const InventoryValueCustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0].payload as TrendPoint;

  return (
    <div className="bg-slate-900/95 backdrop-blur-md text-white p-3.5 rounded-xl shadow-xl border border-slate-700/80 text-xs min-w-[210px] space-y-2">
      <div className="flex items-center justify-between border-b border-slate-700/80 pb-1.5">
        <span className="font-mono font-bold text-purple-400">📅 {data.date || data.label}</span>
        <span className="text-[10px] bg-purple-950 text-purple-300 font-mono px-1.5 py-0.5 rounded border border-purple-800">Asset Valuation</span>
      </div>
      <div className="space-y-1 font-mono">
        <div className="flex items-center justify-between text-purple-300 font-bold text-sm">
          <span>Inventory Value:</span>
          <span>${data.inventoryValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
        <div className="flex items-center justify-between text-slate-300 text-[11px]">
          <span>Daily Revenue:</span>
          <span>${data.revenue.toLocaleString()}</span>
        </div>
        <div className="flex items-center justify-between text-slate-400 text-[11px]">
          <span>Units Moved:</span>
          <span>{data.salesVolume} units</span>
        </div>
      </div>
    </div>
  );
};

const CategoryCustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0].payload as CategoryPerformanceData;

  return (
    <div className="bg-slate-900/95 backdrop-blur-md text-white p-3.5 rounded-xl shadow-xl border border-slate-700/80 text-xs min-w-[210px] space-y-2">
      <div className="flex items-center justify-between border-b border-slate-700/80 pb-1.5">
        <span className="font-bold text-blue-400 text-sm">{data.category}</span>
        <span className="text-[10px] bg-blue-950 text-blue-300 font-mono px-1.5 py-0.5 rounded border border-blue-800">{data.productCount || 0} Products</span>
      </div>
      <div className="space-y-1 font-mono">
        <div className="flex items-center justify-between text-blue-300 font-bold">
          <span>Revenue:</span>
          <span>${data.revenue.toLocaleString()}</span>
        </div>
        <div className="flex items-center justify-between text-emerald-400">
          <span>Units Sold:</span>
          <span>{data.unitsSold.toLocaleString()} units</span>
        </div>
        <div className="flex items-center justify-between text-purple-300">
          <span>Inventory Asset Val:</span>
          <span>${data.inventoryValue.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
};

export const SalesInventoryTrends: React.FC<Props> = ({ salesTrend, categoryPerformance }) => {
  const [activeTrendTab, setActiveTrendTab] = useState<"sales" | "revenue" | "inventory">("revenue");
  const [activeCategoryMetric, setActiveCategoryMetric] = useState<"revenue" | "units" | "value">("revenue");

  const formatCurrency = (value: number) => `$${value.toLocaleString()}`;

  return (
    <div className="space-y-6">
      
      {/* Trends Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <TrendingUp className="text-blue-600" size={20} />
            <span>Sales & Inventory Trends</span>
          </h2>
          <p className="text-xs text-slate-500">
            Interactive historical performance curves and category distribution analysis.
          </p>
        </div>

        {/* View Switchers */}
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl shrink-0">
          <button
            onClick={() => setActiveTrendTab("revenue")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTrendTab === "revenue" ? "bg-white text-blue-600 shadow-xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Revenue & Cost Trend
          </button>
          <button
            onClick={() => setActiveTrendTab("sales")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTrendTab === "sales" ? "bg-white text-blue-600 shadow-xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Sales Units Volume
          </button>
          <button
            onClick={() => setActiveTrendTab("inventory")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTrendTab === "inventory" ? "bg-white text-blue-600 shadow-xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Inventory Value Trend
          </button>
        </div>
      </div>

      {/* Main Chart Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Trend Curve Chart (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 shadow-3xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 font-sans uppercase tracking-wider">
                {activeTrendTab === "revenue" && "Revenue vs Cost Trajectory ($)"}
                {activeTrendTab === "sales" && "Daily Sales Volume (Units Sold)"}
                {activeTrendTab === "inventory" && "Asset Capitalized Inventory Value ($)"}
              </h3>
              <p className="text-xs text-slate-400">
                Data points computed directly from historical sale receipts
              </p>
            </div>
            <span className="text-[10px] font-mono font-bold bg-blue-50 text-blue-700 px-2 py-1 rounded-md border border-blue-200">
              {salesTrend.length} Days Sampled
            </span>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              {activeTrendTab === "revenue" ? (
                <AreaChart data={salesTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#64748b" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#64748b" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} tickFormatter={(val) => `$${val}`} />
                  <Tooltip content={<RevenueTrendCustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }} />
                  <Area type="monotone" dataKey="revenue" name="Revenue ($)" stroke="#2563eb" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRev)" />
                  <Area type="monotone" dataKey="cost" name="Cost ($)" stroke="#64748b" strokeWidth={1.5} fillOpacity={1} fill="url(#colorCost)" />
                </AreaChart>
              ) : activeTrendTab === "sales" ? (
                <BarChart data={salesTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <Tooltip content={<SalesVolumeCustomTooltip />} />
                  <Bar dataKey="salesVolume" name="Sales Volume (Units)" fill="#10b981" radius={[6, 6, 0, 0]} />
                </BarChart>
              ) : (
                <LineChart data={salesTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} tickFormatter={(val) => `$${val}`} />
                  <Tooltip content={<InventoryValueCustomTooltip />} />
                  <Line type="monotone" dataKey="inventoryValue" name="Inventory Asset Value ($)" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 3 }} />
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Distribution Chart (1 col) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-3xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-900 font-sans uppercase tracking-wider flex items-center gap-1.5">
                <BarChart3 size={16} className="text-blue-600" />
                Category Performance
              </h3>

              <div className="flex gap-1 text-[10px]">
                <button
                  onClick={() => setActiveCategoryMetric("revenue")}
                  className={`px-2 py-0.5 rounded-md font-bold ${activeCategoryMetric === "revenue" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"}`}
                >
                  Rev
                </button>
                <button
                  onClick={() => setActiveCategoryMetric("units")}
                  className={`px-2 py-0.5 rounded-md font-bold ${activeCategoryMetric === "units" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"}`}
                >
                  Units
                </button>
                <button
                  onClick={() => setActiveCategoryMetric("value")}
                  className={`px-2 py-0.5 rounded-md font-bold ${activeCategoryMetric === "value" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"}`}
                >
                  Value
                </button>
              </div>
            </div>

            <p className="text-xs text-slate-400 mb-2">
              {activeCategoryMetric === "revenue" && "Revenue contribution per category"}
              {activeCategoryMetric === "units" && "Units sold per product category"}
              {activeCategoryMetric === "value" && "Capitalized inventory value by category"}
            </p>
          </div>

          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              {activeCategoryMetric === "units" ? (
                <PieChart>
                  <Pie
                    data={categoryPerformance}
                    dataKey="unitsSold"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={80}
                    paddingAngle={3}
                  >
                    {categoryPerformance.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CategoryCustomTooltip />} />
                </PieChart>
              ) : (
                <BarChart data={categoryPerformance} layout="vertical" margin={{ top: 5, right: 10, left: 40, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" fontSize={10} tickLine={false} tickFormatter={(v) => `$${v}`} />
                  <YAxis dataKey="category" type="category" fontSize={11} tickLine={false} width={80} />
                  <Tooltip content={<CategoryCustomTooltip />} />
                  <Bar 
                    dataKey={activeCategoryMetric === "revenue" ? "revenue" : "inventoryValue"} 
                    fill="#2563eb" 
                    radius={[0, 6, 6, 0]} 
                  />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>

          {/* Quick legend for category colors */}
          <div className="mt-2 pt-2 border-t border-slate-100 flex flex-wrap gap-2 text-[10px]">
            {categoryPerformance.slice(0, 4).map((cat, i) => (
              <span key={cat.category} className="inline-flex items-center gap-1 font-medium text-slate-600">
                <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }}></span>
                <span className="truncate max-w-[80px]">{cat.category}</span>
              </span>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
};
