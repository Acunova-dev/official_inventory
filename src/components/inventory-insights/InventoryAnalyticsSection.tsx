import React from "react";
import { InventoryAnalyticsData } from "../../types";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { RefreshCw, PieChart as PieIcon, Clock, Layers, ArrowUpRight, ArrowDownRight } from "lucide-react";

interface Props {
  analytics: InventoryAnalyticsData;
}

const ABC_COLORS = {
  A: "#2563eb", // blue-600
  B: "#10b981", // emerald-500
  C: "#f59e0b"  // amber-500
};

// Custom Tooltip for Age Distribution Chart
const AgeDistributionCustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0].payload as {
    bracket: string;
    quantity: number;
    inventoryValue: number;
    percentage: number;
    productCount: number;
  };

  return (
    <div className="bg-slate-900/95 backdrop-blur-md text-white p-3.5 rounded-xl shadow-xl border border-slate-700/80 text-xs min-w-[220px] space-y-2">
      <div className="flex items-center justify-between border-b border-slate-700/80 pb-1.5">
        <span className="font-bold text-indigo-400 text-sm">⏱️ {data.bracket}</span>
        <span className="text-[10px] bg-indigo-950 text-indigo-300 font-mono px-1.5 py-0.5 rounded border border-indigo-800">{data.percentage}% Share</span>
      </div>
      <div className="space-y-1 font-mono">
        <div className="flex items-center justify-between text-indigo-300 font-bold text-sm">
          <span>Inventory Value:</span>
          <span>${data.inventoryValue.toLocaleString()}</span>
        </div>
        <div className="flex items-center justify-between text-slate-300 text-[11px]">
          <span>Quantity Stocked:</span>
          <span>{data.quantity.toLocaleString()} units</span>
        </div>
        <div className="flex items-center justify-between text-slate-400 text-[11px]">
          <span>Product Models:</span>
          <span>{data.productCount} SKUs</span>
        </div>
      </div>
    </div>
  );
};

export const InventoryAnalyticsSection: React.FC<Props> = ({ analytics }) => {
  const { turnover, abcAnalysis, ageDistribution } = analytics;

  const abcPieData = [
    { name: "Category A (Top Sellers)", categoryKey: "A" as const, value: abcAnalysis.categoryA.revenue, color: ABC_COLORS.A, details: abcAnalysis.categoryA },
    { name: "Category B (Moderate Performers)", categoryKey: "B" as const, value: abcAnalysis.categoryB.revenue, color: ABC_COLORS.B, details: abcAnalysis.categoryB },
    { name: "Category C (Tail Items)", categoryKey: "C" as const, value: abcAnalysis.categoryC.revenue, color: ABC_COLORS.C, details: abcAnalysis.categoryC }
  ];

  const AbcCustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    const entry = payload[0].payload;
    const details = entry.details;

    return (
      <div className="bg-slate-900/95 backdrop-blur-md text-white p-3.5 rounded-xl shadow-xl border border-slate-700/80 text-xs min-w-[230px] space-y-2">
        <div className="flex items-center justify-between border-b border-slate-700/80 pb-1.5">
          <span className="font-bold text-blue-400">{entry.name}</span>
          <span className="text-[10px] bg-blue-950 text-blue-300 font-mono px-1.5 py-0.5 rounded border border-blue-800">{details.count} items</span>
        </div>
        <div className="space-y-1 font-mono">
          <div className="flex items-center justify-between text-blue-300 font-bold">
            <span>Revenue:</span>
            <span>${details.revenue.toLocaleString()} ({details.revenuePct}%)</span>
          </div>
          <div className="flex items-center justify-between text-purple-300">
            <span>Inventory Value:</span>
            <span>${details.inventoryValue.toLocaleString()}</span>
          </div>
        </div>
        {details.products && details.products.length > 0 && (
          <div className="pt-1.5 border-t border-slate-800 space-y-1">
            <span className="text-[10px] text-slate-400 font-sans uppercase font-bold block">Top Items Preview:</span>
            {details.products.slice(0, 3).map((p: any, idx: number) => (
              <div key={idx} className="flex justify-between text-[11px] font-mono text-slate-300 truncate">
                <span className="truncate max-w-[130px]">{p.name}</span>
                <span className="text-emerald-400 ml-2">${p.revenue.toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      
      {/* Title */}
      <div className="border-b border-slate-200 pb-3">
        <h2 className="text-lg font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          <PieIcon className="text-indigo-600" size={20} />
          <span>Advanced Inventory Analytics & Asset Ratios</span>
        </h2>
        <p className="text-xs text-slate-500">
          Turnover velocity, ABC pareto revenue classification, and stock aging breakdown.
        </p>
      </div>

      {/* Row 1: Inventory Turnover & ABC Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Inventory Turnover Metric Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-3xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Inventory Turnover Ratio</span>
              <span className="p-2 bg-blue-100 text-blue-700 rounded-xl">
                <RefreshCw size={18} />
              </span>
            </div>

            <div className="mt-2 space-y-1">
              <h3 className="text-3xl font-black font-mono text-slate-900">
                {turnover.currentTurnover}x
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                COGS / Average Inventory Value
              </p>
            </div>
          </div>

          <div className="space-y-3 pt-3 border-t border-slate-100 text-xs">
            <div className="flex justify-between items-center font-medium">
              <span className="text-slate-500">Previous Period Ratio:</span>
              <span className="font-mono font-bold text-slate-800">{turnover.previousTurnover}x</span>
            </div>

            <div className="flex justify-between items-center font-medium">
              <span className="text-slate-500">Period COGS:</span>
              <span className="font-mono font-bold text-slate-900">${turnover.cogs.toLocaleString()}</span>
            </div>

            <div className="flex justify-between items-center font-medium">
              <span className="text-slate-500">Average Inventory Value:</span>
              <span className="font-mono font-bold text-slate-900">${turnover.avgInventoryValue.toLocaleString()}</span>
            </div>

            <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-xl flex items-center justify-between text-blue-900 font-bold">
              <span>Velocity Efficiency Change:</span>
              <span className="font-mono text-sm flex items-center gap-0.5">
                {turnover.changePct >= 0 ? (
                  <><ArrowUpRight size={14} className="text-emerald-600" /> +{turnover.changePct}%</>
                ) : (
                  <><ArrowDownRight size={14} className="text-rose-600" /> {turnover.changePct}%</>
                )}
              </span>
            </div>
          </div>
        </div>

        {/* ABC Analysis Card (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 shadow-3xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  ABC Revenue Pareto Analysis
                </h3>
                <p className="text-xs text-slate-400">
                  Products grouped by historical revenue contribution (A ~80%, B ~15%, C ~5%).
                </p>
              </div>

              <span className="text-xs font-mono font-bold bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded border border-indigo-200">
                Pareto Standard
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center mt-2">
              
              {/* Donut Chart */}
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={abcPieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={75}
                      paddingAngle={4}
                    >
                      {abcPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<AbcCustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* ABC Categories Summary Breakdown */}
              <div className="space-y-3 text-xs">
                
                <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-xl space-y-1">
                  <div className="flex justify-between font-extrabold text-blue-900">
                    <span>Category A (Top Sellers)</span>
                    <span className="font-mono">{abcAnalysis.categoryA.count} items</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-blue-700 font-mono">
                    <span>Revenue: ${abcAnalysis.categoryA.revenue.toLocaleString()} ({abcAnalysis.categoryA.revenuePct}%)</span>
                    <span>Inv Val: ${abcAnalysis.categoryA.inventoryValue.toLocaleString()}</span>
                  </div>
                </div>

                <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-xl space-y-1">
                  <div className="flex justify-between font-extrabold text-emerald-900">
                    <span>Category B (Moderate Performers)</span>
                    <span className="font-mono">{abcAnalysis.categoryB.count} items</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-emerald-700 font-mono">
                    <span>Revenue: ${abcAnalysis.categoryB.revenue.toLocaleString()} ({abcAnalysis.categoryB.revenuePct}%)</span>
                    <span>Inv Val: ${abcAnalysis.categoryB.inventoryValue.toLocaleString()}</span>
                  </div>
                </div>

                <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl space-y-1">
                  <div className="flex justify-between font-extrabold text-amber-900">
                    <span>Category C (Tail Items)</span>
                    <span className="font-mono">{abcAnalysis.categoryC.count} items</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-amber-700 font-mono">
                    <span>Revenue: ${abcAnalysis.categoryC.revenue.toLocaleString()} ({abcAnalysis.categoryC.revenuePct}%)</span>
                    <span>Inv Val: ${abcAnalysis.categoryC.inventoryValue.toLocaleString()}</span>
                  </div>
                </div>

              </div>

            </div>
          </div>
        </div>

      </div>

      {/* Row 2: Inventory Age Brackets Chart & Table */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-3xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Clock size={16} className="text-blue-600" />
              <span>Inventory Age Bracket Distribution</span>
            </h3>
            <p className="text-xs text-slate-400">
              Quantity and asset valuation grouped by inventory age brackets.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
          
          {/* Age Bar Chart */}
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ageDistribution} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="bracket" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} tickFormatter={(v) => `$${v}`} />
                <Tooltip content={<AgeDistributionCustomTooltip />} />
                <Bar dataKey="inventoryValue" fill="#6366f1" radius={[6, 6, 0, 0]} name="Inventory Value ($)" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Age Table Breakdown */}
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="p-3">Age Bracket</th>
                  <th className="p-3 text-right">Products</th>
                  <th className="p-3 text-right">Quantity</th>
                  <th className="p-3 text-right">Inventory Value</th>
                  <th className="p-3 text-right">% of Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {ageDistribution.map((ag) => (
                  <tr key={ag.bracket} className="hover:bg-slate-50/80">
                    <td className="p-3 font-bold text-slate-900">{ag.bracket}</td>
                    <td className="p-3 text-right font-mono text-slate-600">{ag.productCount}</td>
                    <td className="p-3 text-right font-mono font-bold text-slate-900">{ag.quantity} units</td>
                    <td className="p-3 text-right font-mono font-bold text-indigo-600">${ag.inventoryValue.toLocaleString()}</td>
                    <td className="p-3 text-right font-mono font-extrabold text-slate-700">{ag.percentage}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>
      </div>

    </div>
  );
};
