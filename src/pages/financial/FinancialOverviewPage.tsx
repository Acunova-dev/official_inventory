import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { financialService } from "../../services/api";
import { 
  Wallet, 
  Building2, 
  Coins, 
  CreditCard, 
  BarChart3, 
  ArrowUpRight, 
  ArrowDownLeft, 
  TrendingUp, 
  ArrowLeft, 
  DollarSign, 
  ShieldCheck, 
  Receipt,
  FileCheck,
  PlusCircle,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Layers,
  ArrowRightLeft
} from "lucide-react";

export const FinancialOverviewPage: React.FC = () => {
  const navigate = useNavigate();

  const { data: summary, isLoading } = useQuery({
    queryKey: ["financialSummary"],
    queryFn: financialService.getSummary,
  });

  const { data: cashBookEntries = [] } = useQuery({
    queryKey: ["cashbook"],
    queryFn: financialService.getCashBook,
  });

  const { data: bankAccounts = [] } = useQuery({
    queryKey: ["bankAccounts"],
    queryFn: financialService.getBankAccounts,
  });

  // Calculate live balances
  const totalBankBalance = summary?.totalBankBalance ?? bankAccounts.reduce((sum, b) => sum + (b.currentBalance || 0), 0);
  const cashBookBalance = summary?.totalCashBalance ?? (cashBookEntries[0]?.runningBalance ?? 0);
  const totalPettyCash = summary?.totalPettyCashBalance ?? 0;
  const totalLiquidCash = summary?.totalLiquidReserves ?? (cashBookBalance + totalBankBalance + totalPettyCash);

  const financialModules = [
    {
      title: "Cash Book Ledger",
      description: "Counter drawer cash reconciliations, cash sales credits, daily opening and closing balances.",
      path: "/financial/cashbook",
      icon: Wallet,
      color: "emerald",
      badge: "Daily Reconciliation",
      stats: `$${cashBookBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      statsLabel: "Drawer Balance",
    },
    {
      title: "Bank Accounts & Transfers",
      description: "Manage institutional bank registers, inter-bank fund transfers, and electronic settlements.",
      path: "/financial/banks",
      icon: Building2,
      color: "blue",
      badge: `${bankAccounts.length} Connected Accounts`,
      stats: `$${totalBankBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      statsLabel: "Total Bank Holdings",
    },
    {
      title: "Petty Cash Fund",
      description: "Custodian cash float tracking, daily operational expense disbursements, and float replenishments.",
      path: "/financial/petty-cash",
      icon: Coins,
      color: "amber",
      badge: "Operational Float",
      stats: `$${totalPettyCash.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      statsLabel: "Float Balance",
    },
    {
      title: "Payment Vouchers",
      description: "Formal expenditure authorization, supplier invoice payments, and audit sign-off vouchers.",
      path: "/financial/payment-vouchers",
      icon: CreditCard,
      color: "purple",
      badge: "Disbursement Control",
      stats: summary?.outstandingSupplierPayments ? `$${summary.outstandingSupplierPayments.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "Active",
      statsLabel: "Outstanding Payable",
    },
    {
      title: "Financial Control & P&L Reports",
      description: "Real-time Profit & Loss statements, Cash Flow summaries, document sequence configuration, and balance audits.",
      path: "/financial/reports",
      icon: BarChart3,
      color: "indigo",
      badge: "Executive Auditing",
      stats: summary?.netCashFlow !== undefined ? `$${summary.netCashFlow.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "Cash Flow",
      statsLabel: "Net Cash Flow",
    },
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12 font-sans">
      
      {/* Workspace Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-lg border border-slate-800 relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 opacity-10 pointer-events-none">
          <DollarSign size={260} />
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-full text-[11px] font-mono font-bold uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck size={13} />
                Financial & Accounting Workspace
              </span>
              <span className="text-xs text-slate-400">• Dedicated Accounts Hub</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Financial Management & Control
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              Consolidated financial ledgers, cash drawer balance monitoring, bank reconciliations, expenditure authorizations, and statutory reporting.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <Link
              to="/"
              className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all border border-white/10 backdrop-blur-xs"
              id="btn-return-operations"
            >
              <ArrowLeft size={15} />
              Return to Operations
            </Link>
            <Link
              to="/financial/reports"
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-extrabold transition-all shadow-md shadow-blue-600/30"
              id="btn-financial-reports"
            >
              <BarChart3 size={15} />
              P&L Statements
            </Link>
          </div>
        </div>

        {/* Global Financial Highlights Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 pt-6 border-t border-slate-800/80">
          <div className="space-y-1">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Liquid Holdings</p>
            <p className="text-xl sm:text-2xl font-black text-emerald-400 font-mono">
              ${totalLiquidCash.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-[10px] text-slate-400">Cash + Bank + Petty float</p>
          </div>

          <div className="space-y-1">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Cash Book (Drawer)</p>
            <p className="text-xl sm:text-2xl font-black text-white font-mono">
              ${cashBookBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-[10px] text-emerald-400 flex items-center gap-1">
              <Wallet size={11} /> Physical drawer
            </p>
          </div>

          <div className="space-y-1">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Institutional Banks</p>
            <p className="text-xl sm:text-2xl font-black text-white font-mono">
              ${totalBankBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-[10px] text-blue-400 flex items-center gap-1">
              <Building2 size={11} /> {bankAccounts.length} registers
            </p>
          </div>

          <div className="space-y-1">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Net Cash Flow</p>
            <p className="text-xl sm:text-2xl font-black text-amber-400 font-mono">
              ${(summary?.netCashFlow ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-[10px] text-slate-400">Total net movement</p>
          </div>
        </div>
      </div>

      {/* Accounting Modules Directory */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-black text-slate-900">Financial Workspaces & Ledgers</h2>
            <p className="text-xs text-slate-500">Access focused sub-modules to manage transactions, cash flow, and audit books.</p>
          </div>
          <span className="text-xs font-mono bg-slate-100 px-2.5 py-1 rounded-lg text-slate-600 font-bold border border-slate-200">
            5 Ledgers Active
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {financialModules.map((module) => {
            const Icon = module.icon;
            return (
              <Link
                key={module.title}
                to={module.path}
                className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs hover:shadow-md hover:border-blue-300 transition-all group flex flex-col justify-between space-y-4 relative overflow-hidden"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className={`p-3 rounded-xl ${
                      module.color === "emerald" ? "bg-emerald-50 text-emerald-600 border border-emerald-100" :
                      module.color === "blue" ? "bg-blue-50 text-blue-600 border border-blue-100" :
                      module.color === "amber" ? "bg-amber-50 text-amber-600 border border-amber-100" :
                      module.color === "purple" ? "bg-purple-50 text-purple-600 border border-purple-100" :
                      "bg-indigo-50 text-indigo-600 border border-indigo-100"
                    }`}>
                      <Icon size={24} />
                    </div>
                    <span className="text-[10px] font-mono font-bold px-2 py-1 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                      {module.badge}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-extrabold text-slate-900 group-hover:text-blue-600 transition-colors flex items-center gap-1.5">
                      {module.title}
                      <ChevronRight size={16} className="opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-blue-600" />
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                      {module.description}
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{module.statsLabel}</span>
                  <span className="text-sm font-black font-mono text-slate-900 group-hover:text-blue-600 transition-colors">
                    {module.stats}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Quick Financial Operations Bar */}
      <div className="bg-slate-100/80 rounded-2xl p-5 border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white rounded-xl text-slate-700 shadow-2xs border border-slate-200">
            <Sparkles size={20} className="text-blue-600" />
          </div>
          <div>
            <h4 className="text-xs font-black text-slate-900">Need to record a quick financial adjustment or voucher?</h4>
            <p className="text-[11px] text-slate-500">Jump directly to specific tools or review live customer transactions.</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={() => navigate("/financial/cashbook")}
            className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer flex items-center gap-1.5"
          >
            <Wallet size={13} className="text-emerald-600" />
            Cash Adjustment
          </button>

          <button
            onClick={() => navigate("/financial/banks")}
            className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer flex items-center gap-1.5"
          >
            <ArrowRightLeft size={13} className="text-blue-600" />
            Transfer Funds
          </button>

          <button
            onClick={() => navigate("/financial/payment-vouchers")}
            className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer flex items-center gap-1.5"
          >
            <PlusCircle size={13} className="text-purple-600" />
            Issue Voucher
          </button>
        </div>
      </div>

    </div>
  );
};
