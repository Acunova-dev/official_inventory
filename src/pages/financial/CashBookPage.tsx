import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { financialService } from "../../services/api";
import { CashBookEntry } from "../../types";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../components/Layout";
import { 
  Wallet, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Search, 
  Filter, 
  PlusCircle, 
  Calendar, 
  FileText, 
  RefreshCw,
  ShieldAlert,
  Download
} from "lucide-react";

export const CashBookPage: React.FC = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [dateFilter, setDateFilter] = useState("");
  const [isAdjModalOpen, setIsAdjModalOpen] = useState(false);

  const [adjType, setAdjType] = useState<"Debit" | "Credit">("Debit");
  const [adjAmount, setAdjAmount] = useState("");
  const [adjCategory, setAdjCategory] = useState("Approved Adjustment");
  const [adjDescription, setAdjDescription] = useState("");

  const { data: entries = [], isLoading, refetch } = useQuery({
    queryKey: ["cashbook"],
    queryFn: financialService.getCashBook,
  });

  const adjustmentMutation = useMutation({
    mutationFn: financialService.createCashAdjustment,
    onSuccess: (newEntry) => {
      queryClient.invalidateQueries({ queryKey: ["cashbook"] });
      queryClient.invalidateQueries({ queryKey: ["financialSummary"] });
      addToast("Cash Book adjustment posted successfully", "success");
      setIsAdjModalOpen(false);
      setAdjAmount("");
      setAdjDescription("");
    },
    onError: (err: any) => {
      addToast(err?.response?.data?.error || "Failed to post adjustment", "error");
    }
  });

  const handlePostAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjAmount || Number(adjAmount) <= 0) {
      addToast("Please enter a valid positive amount", "warning");
      return;
    }
    adjustmentMutation.mutate({
      type: adjType,
      amount: Number(adjAmount),
      category: adjCategory,
      description: adjDescription
    });
  };

  const filteredEntries = entries.filter((item) => {
    const matchesSearch = 
      item.referenceDoc.toLowerCase().includes(search.toLowerCase()) ||
      item.description.toLowerCase().includes(search.toLowerCase()) ||
      item.category.toLowerCase().includes(search.toLowerCase()) ||
      item.createdBy.toLowerCase().includes(search.toLowerCase());
    
    const matchesCat = categoryFilter === "All" || item.category === categoryFilter;
    const matchesDate = !dateFilter || item.date === dateFilter;

    return matchesSearch && matchesCat && matchesDate;
  });

  const totalInflow = filteredEntries.reduce((sum, item) => sum + item.debit, 0);
  const totalOutflow = filteredEntries.reduce((sum, item) => sum + item.credit, 0);
  const currentRunningBalance = entries.length > 0 ? entries[entries.length - 1].runningBalance : 0;

  const categories = Array.from(new Set(entries.map(e => e.category)));

  const exportCSV = () => {
    const headers = ["ID,Date,Reference,Description,Category,Debit (Inflow),Credit (Outflow),Running Balance,Created By"];
    const rows = filteredEntries.map(e => 
      `"${e.id}","${e.date}","${e.referenceDoc}","${e.description.replace(/"/g, '""')}","${e.category}",${e.debit},${e.credit},${e.runningBalance},"${e.createdBy}"`
    );
    const blob = new Blob([[headers, ...rows].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `CashBook_Ledger_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
              <Wallet className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Cash Book</h1>
              <p className="text-sm text-slate-500">Auto-generated ledger book for all physical cash movements & serialized entries.</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={exportCSV}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium text-sm transition-colors"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
          
          {user?.role === "Principal Admin" && (
            <button
              onClick={() => setIsAdjModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium text-sm shadow-sm transition-colors"
            >
              <PlusCircle className="w-4 h-4" />
              Cash Adjustment
            </button>
          )}
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Cash Balance</span>
            <Wallet className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900 font-mono">
            ${currentRunningBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <p className="text-xs text-slate-400 mt-2">Verified running balance</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Total Cash Inflow</span>
            <ArrowDownLeft className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-blue-600 font-mono">
            +${totalInflow.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <p className="text-xs text-slate-400 mt-2">Customer receipts & transfers</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Total Cash Outflow</span>
            <ArrowUpRight className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-amber-600 font-mono">
            -${totalOutflow.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <p className="text-xs text-slate-400 mt-2">Payment vouchers & petty float</p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search reference, description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full border border-slate-200 rounded-xl text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="All">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-400" />
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full border border-slate-200 rounded-xl text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            {dateFilter && (
              <button onClick={() => setDateFilter("")} className="text-xs text-slate-400 hover:text-slate-600">
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <span className="text-xs font-mono font-bold uppercase text-slate-400 tracking-wider">
            Automated Cash Movement Log ({filteredEntries.length} entries)
          </span>
          <button 
            onClick={() => refetch()} 
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-emerald-600"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-slate-400 text-sm">Loading cash ledger entries...</div>
        ) : filteredEntries.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            No cash book entries match your filter search.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 text-xs font-semibold">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Originating Doc</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4 text-right">Debit (Inflow)</th>
                  <th className="py-3 px-4 text-right">Credit (Outflow)</th>
                  <th className="py-3 px-4 text-right">Running Balance</th>
                  <th className="py-3 px-4">Created By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-xs">
                {filteredEntries.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 text-slate-600">{item.date}</td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                        {item.referenceDoc}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-sans font-medium text-slate-700">{item.category}</td>
                    <td className="py-3 px-4 font-sans text-slate-600 max-w-xs truncate">{item.description}</td>
                    <td className="py-3 px-4 text-right font-semibold text-emerald-600">
                      {item.debit > 0 ? `+$${item.debit.toFixed(2)}` : "-"}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-amber-600">
                      {item.credit > 0 ? `-$${item.credit.toFixed(2)}` : "-"}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900">
                      ${item.runningBalance.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 font-sans text-slate-500 text-xs">{item.createdBy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Cash Adjustment Modal (Principal Admin Only) */}
      {isAdjModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-5 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-slate-900 font-bold">
                <ShieldAlert className="w-5 h-5 text-amber-600" />
                <span>Authorized Cash Adjustment</span>
              </div>
              <button 
                onClick={() => setIsAdjModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handlePostAdjustment} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Adjustment Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjType("Debit")}
                    className={`py-2 text-xs font-bold rounded-xl border ${adjType === "Debit" ? "bg-emerald-50 border-emerald-500 text-emerald-700" : "border-slate-200 text-slate-600"}`}
                  >
                    + Debit (Cash Inflow)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjType("Credit")}
                    className={`py-2 text-xs font-bold rounded-xl border ${adjType === "Credit" ? "bg-amber-50 border-amber-500 text-amber-700" : "border-slate-200 text-slate-600"}`}
                  >
                    - Credit (Cash Outflow)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Amount ($)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={adjAmount}
                  onChange={(e) => setAdjAmount(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Category</label>
                <select
                  value={adjCategory}
                  onChange={(e) => setAdjCategory(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="Approved Adjustment">Approved Adjustment</option>
                  <option value="Opening Balance">Opening Balance</option>
                  <option value="Drawer Reconciliation">Drawer Reconciliation</option>
                  <option value="Cash Count Discrepancy">Cash Count Discrepancy</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Audit Explanation / Purpose</label>
                <textarea
                  required
                  rows={2}
                  placeholder="Reason for cash adjustment..."
                  value={adjDescription}
                  onChange={(e) => setAdjDescription(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAdjModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adjustmentMutation.isPending}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm"
                >
                  {adjustmentMutation.isPending ? "Posting..." : "Post Adjustment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
