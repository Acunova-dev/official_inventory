import React from "react";
import { ExecutiveSummaryData, KpiCardData } from "../../types";
import { 
  Package, 
  Layers, 
  DollarSign, 
  TrendingUp, 
  Percent, 
  Zap, 
  Snail, 
  AlertOctagon, 
  AlertTriangle, 
  XCircle, 
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Minus
} from "lucide-react";

interface Props {
  data: ExecutiveSummaryData;
}

const themeClasses: Record<string, { bg: string; text: string; border: string; iconBg: string }> = {
  blue: { bg: "bg-blue-50/60", text: "text-blue-700", border: "border-blue-200/80", iconBg: "bg-blue-600 text-white" },
  emerald: { bg: "bg-emerald-50/60", text: "text-emerald-700", border: "border-emerald-200/80", iconBg: "bg-emerald-600 text-white" },
  cyan: { bg: "bg-cyan-50/60", text: "text-cyan-700", border: "border-cyan-200/80", iconBg: "bg-cyan-600 text-white" },
  indigo: { bg: "bg-indigo-50/60", text: "text-indigo-700", border: "border-indigo-200/80", iconBg: "bg-indigo-600 text-white" },
  purple: { bg: "bg-purple-50/60", text: "text-purple-700", border: "border-purple-200/80", iconBg: "bg-purple-600 text-white" },
  amber: { bg: "bg-amber-50/60", text: "text-amber-700", border: "border-amber-200/80", iconBg: "bg-amber-500 text-white" },
  rose: { bg: "bg-rose-50/60", text: "text-rose-700", border: "border-rose-200/80", iconBg: "bg-rose-600 text-white" },
  slate: { bg: "bg-slate-50/60", text: "text-slate-700", border: "border-slate-200/80", iconBg: "bg-slate-700 text-white" },
};

const KpiCard: React.FC<{ card?: KpiCardData; icon: React.ReactNode }> = ({ card, icon }) => {
  if (!card) return null;
  const theme = themeClasses[card.colorTheme] || themeClasses.blue;
  const isUp = card.changePct > 0;
  const isZero = card.changePct === 0;

  return (
    <div className={`bg-white rounded-2xl p-4 sm:p-5 border ${theme.border} shadow-3xs hover:shadow-xs transition-all flex flex-col justify-between group`}>
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block font-sans">
            {card.title}
          </span>
          <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-mono">
            {card.formattedValue}
          </h3>
        </div>

        <div className={`p-2.5 rounded-xl shadow-xs shrink-0 ${theme.iconBg}`}>
          {icon}
        </div>
      </div>

      <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 font-medium">
          {isZero ? (
            <span className="inline-flex items-center text-slate-400 font-mono bg-slate-100 px-1.5 py-0.5 rounded-md text-[10px]">
              <Minus size={12} className="mr-0.5" /> 0%
            </span>
          ) : isUp ? (
            <span className={`inline-flex items-center font-bold font-mono px-1.5 py-0.5 rounded-md text-[10px] ${
              card.isPositive ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-rose-50 text-rose-700 border border-rose-200"
            }`}>
              <ArrowUpRight size={13} className="mr-0.5 shrink-0" />
              +{card.changePct}%
            </span>
          ) : (
            <span className={`inline-flex items-center font-bold font-mono px-1.5 py-0.5 rounded-md text-[10px] ${
              card.isPositive ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-rose-50 text-rose-700 border border-rose-200"
            }`}>
              <ArrowDownRight size={13} className="mr-0.5 shrink-0" />
              {card.changePct}%
            </span>
          )}
          <span className="text-[11px] text-slate-400 font-sans">vs prev period</span>
        </div>

        <span className="text-[10px] font-mono text-slate-400 truncate max-w-[90px]" title={card.formattedPrevValue}>
          Prev: {card.formattedPrevValue}
        </span>
      </div>
    </div>
  );
};

export const ExecutiveSummaryGrid: React.FC<Props> = ({ data }) => {
  if (!data) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          <Layers className="text-blue-600" size={20} />
          <span>Executive Summary & Key Performance Indicators</span>
        </h2>
        <span className="text-xs font-mono text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full font-semibold">
          11 Active Core Metrics
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <KpiCard card={data.totalProducts} icon={<Package size={18} />} />
        <KpiCard card={data.totalInventoryQuantity} icon={<Layers size={18} />} />
        <KpiCard card={data.totalInventoryValue} icon={<DollarSign size={18} />} />
        <KpiCard card={data.revenue} icon={<TrendingUp size={18} />} />
        <KpiCard card={data.grossProfit} icon={<Percent size={18} />} />
        <KpiCard card={data.fastMovingCount} icon={<Zap size={18} />} />
        <KpiCard card={data.slowMovingCount} icon={<Snail size={18} />} />
        <KpiCard card={data.deadStockCount} icon={<AlertOctagon size={18} />} />
        <KpiCard card={data.lowStockCount} icon={<AlertTriangle size={18} />} />
        <KpiCard card={data.outOfStockCount} icon={<XCircle size={18} />} />
        <KpiCard card={data.inventoryTurnoverRate} icon={<RefreshCw size={18} />} />
      </div>
    </div>
  );
};
