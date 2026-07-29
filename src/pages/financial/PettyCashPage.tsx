import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { financialService } from "../../services/api";
import { PettyCashEntry } from "../../types";
import { useToast } from "../../components/Layout";
import { 
  Coins, 
  PlusCircle, 
  RefreshCw, 
  Download, 
  Receipt, 
  ArrowDownLeft, 
  ArrowUpRight,
  ShieldCheck
} from "lucide-react";

export const PettyCashPage: React.FC = () => {
  const { addToast } = useToast();
  const queryClient = useQueryClient();

  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isReplenishModalOpen, setIsReplenishModalOpen] = useState(false);

  // Expense Form State
  const [expCategory, setExpCategory] = useState("Office Supplies");
  const [expDescription, setExpDescription] = useState("");
  const [expAmount, setExpAmount] = useState("");
  const [expPaidTo, setExpPaidTo] = useState("");

  // Replenishment Form State
  const [replSource, setReplSource] = useState<"Cash" | "Bank">("Cash");
  const [replBankId, setReplBankId] = useState("");
  const [replAmount, setReplAmount] = useState("");
  const [replNotes, setReplNotes] = useState("");

  const { data: entries = [], isLoading, refetch } = useQuery({
    queryKey: ["pettyCash"],
    queryFn: financialService.getPettyCash,
  });

  const { data: bankAccounts = [] } = useQuery({
    queryKey: ["bankAccounts"],
    queryFn: financialService.getBankAccounts,
  });

  const expenseMutation = useMutation({
    mutationFn: financialService.createPettyExpense,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pettyCash"] });
      addToast("Petty cash expense voucher recorded", "success");
      setIsExpenseModalOpen(false);
      setExpDescription("");
      setExpAmount("");
      setExpPaidTo("");
    },
    onError: (err: any) => {
      addToast(err?.response?.data?.error || "Failed to record petty cash expense", "error");
    }
  });

  const replenishMutation = useMutation({
    mutationFn: financialService.replenishPettyCash,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pettyCash"] });
      queryClient.invalidateQueries({ queryKey: ["cashbook"] });
      queryClient.invalidateQueries({ queryKey: ["bankAccounts"] });
      addToast("Petty cash float replenished successfully", "success");
      setIsReplenishModalOpen(false);
      setReplAmount("");
      setReplNotes("");
    },
    onError: (err: any) => {
      addToast(err?.response?.data?.error || "Failed to replenish petty cash", "error");
    }
  });

  const handleExpenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expAmount || Number(expAmount) <= 0) {
      addToast("Please enter a valid expense amount", "warning");
      return;
    }
    expenseMutation.mutate({
      category: expCategory,
      description: expDescription,
      amount: Number(expAmount),
      paidTo: expPaidTo
    });
  };

  const handleReplenishSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replAmount || Number(replAmount) <= 0) {
      addToast("Please enter a valid replenishment float amount", "warning");
      return;
    }
    replenishMutation.mutate({
      source: replSource,
      sourceBankId: replSource === "Bank" ? replBankId : undefined,
      amount: Number(replAmount),
      notes: replNotes
    });
  };

  const currentFloatBalance = entries.length > 0 ? entries[entries.length - 1].runningBalance : 0;
  const totalReplenishments = entries.reduce((sum, e) => sum + e.debit, 0);
  const totalExpenses = entries.reduce((sum, e) => sum + e.credit, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
            <Coins className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Petty Cash Book</h1>
            <p className="text-sm text-slate-500">Track small operational expenses, vouchers, and float replenishments.</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsReplenishModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl font-semibold text-sm transition-colors border border-emerald-200"
          >
            <ArrowDownLeft className="w-4 h-4" />
            Replenish Float
          </button>
          <button
            onClick={() => setIsExpenseModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-semibold text-sm transition-colors shadow-sm"
          >
            <PlusCircle className="w-4 h-4" />
            Log Petty Expense
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
            Current Float Available
          </span>
          <div className="text-3xl font-extrabold text-slate-900 font-mono">
            ${currentFloatBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <p className="text-xs text-slate-400 mt-2">Active cash in drawer</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
            Total Float Injected
          </span>
          <div className="text-2xl font-bold text-emerald-600 font-mono">
            +${totalReplenishments.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <p className="text-xs text-slate-400 mt-2">Cash & bank sweep refills</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
            Total Small Expenses
          </span>
          <div className="text-2xl font-bold text-amber-600 font-mono">
            -${totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <p className="text-xs text-slate-400 mt-2">Voucher expenses paid out</p>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <span className="text-xs font-mono font-bold uppercase text-slate-400 tracking-wider">
            Petty Cash Ledger ({entries.length} records)
          </span>
          <button onClick={() => refetch()} className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-amber-600">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-slate-400 text-sm">Loading petty cash entries...</div>
        ) : entries.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">No petty cash transactions recorded yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 text-xs font-semibold">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Voucher Ref</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4">Paid To</th>
                  <th className="py-3 px-4 text-right">Replenishment (+)</th>
                  <th className="py-3 px-4 text-right">Expense (-)</th>
                  <th className="py-3 px-4 text-right">Running Float</th>
                  <th className="py-3 px-4">Approved By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-xs">
                {entries.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80">
                    <td className="py-3 px-4 text-slate-600">{item.date}</td>
                    <td className="py-3 px-4 font-bold text-amber-700 bg-amber-50/50 rounded-md">
                      {item.voucherRef}
                    </td>
                    <td className="py-3 px-4 font-sans font-medium text-slate-800">{item.category}</td>
                    <td className="py-3 px-4 font-sans text-slate-600 max-w-xs truncate">{item.description}</td>
                    <td className="py-3 px-4 font-sans text-slate-700">{item.paidTo || "-"}</td>
                    <td className="py-3 px-4 text-right font-semibold text-emerald-600">
                      {item.debit > 0 ? `+$${item.debit.toFixed(2)}` : "-"}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-amber-600">
                      {item.credit > 0 ? `-$${item.credit.toFixed(2)}` : "-"}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900">
                      ${item.runningBalance.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 font-sans text-slate-500 text-xs">{item.approvedBy || item.createdBy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Expense Modal */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base">Record Petty Cash Expense</h3>
              <button onClick={() => setIsExpenseModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleExpenseSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Expense Category</label>
                <select
                  value={expCategory}
                  onChange={(e) => setExpCategory(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500"
                >
                  <option value="Office Supplies">Office Supplies & Stationery</option>
                  <option value="Refreshments & Tea">Refreshments & Hospitality</option>
                  <option value="Local Courier / Postage">Local Transport & Courier</option>
                  <option value="Minor Repairs & Cleaning">Minor Maintenance & Cleaning</option>
                  <option value="Miscellaneous Operations">Miscellaneous Operations</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Description / Purpose</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Printer paper and coffee beans"
                  value={expDescription}
                  onChange={(e) => setExpDescription(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Amount ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={expAmount}
                    onChange={(e) => setExpAmount(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Paid To / Recipient</label>
                  <input
                    type="text"
                    placeholder="Recipient Name"
                    value={expPaidTo}
                    onChange={(e) => setExpPaidTo(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsExpenseModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={expenseMutation.isPending}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm"
                >
                  {expenseMutation.isPending ? "Logging..." : "Log Expense"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Float Replenishment Modal */}
      {isReplenishModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base">Replenish Petty Cash Float</h3>
              <button onClick={() => setIsReplenishModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleReplenishSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Funding Source</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setReplSource("Cash")}
                    className={`py-2 text-xs font-bold rounded-xl border ${replSource === "Cash" ? "bg-emerald-50 border-emerald-500 text-emerald-700" : "border-slate-200 text-slate-600"}`}
                  >
                    Cash Book Drawer
                  </button>
                  <button
                    type="button"
                    onClick={() => setReplSource("Bank")}
                    className={`py-2 text-xs font-bold rounded-xl border ${replSource === "Bank" ? "bg-blue-50 border-blue-500 text-blue-700" : "border-slate-200 text-slate-600"}`}
                  >
                    Bank Account
                  </button>
                </div>
              </div>

              {replSource === "Bank" && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Select Bank Account</label>
                  <select
                    value={replBankId}
                    onChange={(e) => setReplBankId(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">Select Account...</option>
                    {bankAccounts.map((b) => (
                      <option key={b.id} value={b.id}>{b.accountName} (${b.currentBalance})</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Float Amount ($)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={replAmount}
                  onChange={(e) => setReplAmount(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Notes / Voucher Reference</label>
                <input
                  type="text"
                  placeholder="e.g. Monthly cashier float top-up"
                  value={replNotes}
                  onChange={(e) => setReplNotes(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsReplenishModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={replenishMutation.isPending}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm"
                >
                  {replenishMutation.isPending ? "Replenishing..." : "Inject Float"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
