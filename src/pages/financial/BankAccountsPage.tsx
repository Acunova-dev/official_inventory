import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { financialService } from "../../services/api";
import { BankAccount, BankLedgerEntry } from "../../types";
import { useToast } from "../../components/Layout";
import { 
  Building2, 
  CreditCard, 
  ArrowLeftRight, 
  Plus, 
  History, 
  CheckCircle2, 
  Clock, 
  Download,
  RefreshCw
} from "lucide-react";

export const BankAccountsPage: React.FC = () => {
  const { addToast } = useToast();
  const queryClient = useQueryClient();

  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);
  const [isTransferOpen, setIsTransferOpen] = useState(false);

  // New Bank Form State
  const [accountName, setAccountName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [bankName, setBankName] = useState("");
  const [branch, setBranch] = useState("");
  const [initialBalance, setInitialBalance] = useState("");

  // Transfer Form State
  const [fromType, setFromType] = useState<"Bank" | "Cash">("Bank");
  const [fromId, setFromId] = useState("");
  const [toType, setToType] = useState<"Bank" | "Cash">("Bank");
  const [toId, setToId] = useState("");
  const [transferAmount, setTransferAmount] = useState("");
  const [transferDesc, setTransferDesc] = useState("");

  const { data: accounts = [], isLoading: isLoadingAccounts } = useQuery({
    queryKey: ["bankAccounts"],
    queryFn: financialService.getBankAccounts,
  });

  // Set default selected account if needed
  React.useEffect(() => {
    if (accounts.length > 0 && !selectedAccountId) {
      setSelectedAccountId(accounts[0].id);
    }
  }, [accounts, selectedAccountId]);

  const { data: ledgerEntries = [], isLoading: isLoadingLedger, refetch: refetchLedger } = useQuery({
    queryKey: ["bankLedger", selectedAccountId],
    queryFn: () => financialService.getBankLedger(selectedAccountId),
    enabled: !!selectedAccountId
  });

  const createAccountMutation = useMutation({
    mutationFn: financialService.createBankAccount,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bankAccounts"] });
      addToast("Bank account registered successfully", "success");
      setIsAddAccountOpen(false);
      setAccountName("");
      setAccountNumber("");
      setBankName("");
      setBranch("");
      setInitialBalance("");
    },
    onError: (err: any) => {
      addToast(err?.response?.data?.error || "Failed to create bank account", "error");
    }
  });

  const transferMutation = useMutation({
    mutationFn: financialService.transferFunds,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bankAccounts"] });
      queryClient.invalidateQueries({ queryKey: ["bankLedger"] });
      queryClient.invalidateQueries({ queryKey: ["cashbook"] });
      addToast("Internal transfer completed successfully", "success");
      setIsTransferOpen(false);
      setTransferAmount("");
      setTransferDesc("");
    },
    onError: (err: any) => {
      addToast(err?.response?.data?.error || "Failed to process transfer", "error");
    }
  });

  const handleCreateAccount = (e: React.FormEvent) => {
    e.preventDefault();
    createAccountMutation.mutate({
      accountName,
      accountNumber,
      bankName,
      branch,
      initialBalance: Number(initialBalance || 0)
    });
  };

  const handleTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferAmount || Number(transferAmount) <= 0) {
      addToast("Please enter a valid transfer amount", "warning");
      return;
    }
    transferMutation.mutate({
      fromType,
      fromId: fromType === "Bank" ? fromId : undefined,
      toType,
      toId: toType === "Bank" ? toId : undefined,
      amount: Number(transferAmount),
      description: transferDesc
    });
  };

  const selectedAccount = accounts.find(a => a.id === selectedAccountId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Bank Accounts & Ledgers</h1>
            <p className="text-sm text-slate-500">Manage business bank accounts, deposits, EFTs, and internal transfers.</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsTransferOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-medium text-sm transition-colors"
          >
            <ArrowLeftRight className="w-4 h-4" />
            Internal Transfer
          </button>
          <button
            onClick={() => setIsAddAccountOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium text-sm transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add Bank Account
          </button>
        </div>
      </div>

      {/* Bank Account Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {accounts.map((acc) => {
          const isSelected = acc.id === selectedAccountId;
          return (
            <div
              key={acc.id}
              onClick={() => setSelectedAccountId(acc.id)}
              className={`cursor-pointer p-5 rounded-2xl border transition-all ${
                isSelected 
                  ? "border-blue-500 bg-blue-50/20 ring-2 ring-blue-500/20 shadow-md" 
                  : "border-slate-200 bg-white hover:border-slate-300 shadow-xs"
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  {acc.bankName}
                </span>
                <span className="text-xs font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">
                  •••{acc.accountNumber.slice(-4)}
                </span>
              </div>

              <h3 className="font-bold text-slate-900 text-base">{acc.accountName}</h3>
              <p className="text-xs text-slate-500 mb-4">{acc.branch || "Head Office Branch"}</p>

              <div className="border-t border-slate-100 pt-3 flex items-center justify-between">
                <span className="text-xs text-slate-400 font-medium">Current Balance</span>
                <span className="text-xl font-extrabold font-mono text-slate-900">
                  ${acc.currentBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Account Ledger Section */}
      {selectedAccount && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <History className="w-4 h-4 text-blue-600" />
                <span>Bank Statement Ledger — {selectedAccount.accountName}</span>
              </h2>
              <p className="text-xs text-slate-500 font-mono">Acc #: {selectedAccount.accountNumber} ({selectedAccount.currency})</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => refetchLedger()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Refresh
              </button>
            </div>
          </div>

          {isLoadingLedger ? (
            <div className="p-12 text-center text-slate-400 text-sm">Loading statement ledger...</div>
          ) : ledgerEntries.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-sm">
              No transactions recorded for this bank account yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 text-xs font-semibold">
                  <tr>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Ref Serial</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Description</th>
                    <th className="py-3 px-4 text-right">Debit (Inflow)</th>
                    <th className="py-3 px-4 text-right">Credit (Outflow)</th>
                    <th className="py-3 px-4 text-right">Running Balance</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-xs">
                  {ledgerEntries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-slate-50/80">
                      <td className="py-3 px-4 text-slate-600">{entry.date}</td>
                      <td className="py-3 px-4 font-bold text-blue-700">{entry.referenceDoc}</td>
                      <td className="py-3 px-4 font-sans text-slate-700">{entry.transactionType}</td>
                      <td className="py-3 px-4 font-sans text-slate-600 max-w-xs truncate">{entry.description}</td>
                      <td className="py-3 px-4 text-right font-semibold text-emerald-600">
                        {entry.debit > 0 ? `+$${entry.debit.toFixed(2)}` : "-"}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-amber-600">
                        {entry.credit > 0 ? `-$${entry.credit.toFixed(2)}` : "-"}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900">
                        ${entry.runningBalance.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="inline-flex items-center gap-1 text-[10px] font-sans font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                          Reconciled
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Add Bank Account Modal */}
      {isAddAccountOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base">Register New Bank Account</h3>
              <button onClick={() => setIsAddAccountOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleCreateAccount} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Account Name / Purpose</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Chase Main Operations"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Bank Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. JPMorgan Chase"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Account Number</label>
                  <input
                    type="text"
                    required
                    placeholder="123456789"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Branch</label>
                  <input
                    type="text"
                    placeholder="Main Branch"
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Initial Opening Balance ($)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={initialBalance}
                  onChange={(e) => setInitialBalance(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddAccountOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createAccountMutation.isPending}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors"
                >
                  {createAccountMutation.isPending ? "Registering..." : "Save Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Internal Transfer Modal */}
      {isTransferOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base">Execute Internal Funds Transfer</h3>
              <button onClick={() => setIsTransferOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleTransfer} className="space-y-4">
              {/* FROM SOURCE */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">From (Source)</label>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={fromType}
                    onChange={(e) => setFromType(e.target.value as any)}
                    className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs bg-white"
                  >
                    <option value="Bank">Bank Account</option>
                    <option value="Cash">Cash Book Drawer</option>
                  </select>
                  {fromType === "Bank" && (
                    <select
                      value={fromId}
                      onChange={(e) => setFromId(e.target.value)}
                      className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs bg-white"
                    >
                      <option value="">Select Bank...</option>
                      {accounts.map(a => (
                        <option key={a.id} value={a.id}>{a.bankName} (${a.currentBalance})</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              {/* TO DESTINATION */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">To (Destination)</label>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={toType}
                    onChange={(e) => setToType(e.target.value as any)}
                    className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs bg-white"
                  >
                    <option value="Bank">Bank Account</option>
                    <option value="Cash">Cash Book Drawer</option>
                  </select>
                  {toType === "Bank" && (
                    <select
                      value={toId}
                      onChange={(e) => setToId(e.target.value)}
                      className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs bg-white"
                    >
                      <option value="">Select Bank...</option>
                      {accounts.map(a => (
                        <option key={a.id} value={a.id}>{a.bankName} (${a.currentBalance})</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Transfer Amount ($)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Description / Memo</label>
                <input
                  type="text"
                  placeholder="e.g. Sweep revenue to main ops"
                  value={transferDesc}
                  onChange={(e) => setTransferDesc(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsTransferOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={transferMutation.isPending}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm"
                >
                  {transferMutation.isPending ? "Executing..." : "Confirm Transfer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
