import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { financialService } from "../../services/api";
import { DocumentSequenceConfig } from "../../types";
import { useToast } from "../../components/Layout";
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Settings, 
  Wallet, 
  Building2, 
  Download, 
  CheckCircle2, 
  Save,
  FileSpreadsheet
} from "lucide-react";

export const FinancialReportsPage: React.FC = () => {
  const { addToast } = useToast();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<"summary" | "numbering">("summary");

  const { data: summary, isLoading: isLoadingSummary } = useQuery({
    queryKey: ["financialSummary"],
    queryFn: financialService.getSummary,
  });

  const { data: sequences = [], isLoading: isLoadingSeq } = useQuery({
    queryKey: ["documentSequences"],
    queryFn: financialService.getNumberingSequences,
  });

  const [localSeqs, setLocalSeqs] = useState<DocumentSequenceConfig[]>([]);

  React.useEffect(() => {
    if (sequences.length > 0) {
      setLocalSeqs(sequences);
    }
  }, [sequences]);

  const updateSeqMutation = useMutation({
    mutationFn: financialService.updateNumberingSequences,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documentSequences"] });
      addToast("Document numbering formats updated successfully", "success");
    },
    onError: (err: any) => {
      addToast(err?.response?.data?.error || "Failed to update document numbering", "error");
    }
  });

  const handleSeqChange = (documentType: string, field: string, val: any) => {
    setLocalSeqs(prev => prev.map(s => {
      if (s.documentType === documentType) {
        return { ...s, [field]: val };
      }
      return s;
    }));
  };

  const handleSaveSequences = (e: React.FormEvent) => {
    e.preventDefault();
    updateSeqMutation.mutate(localSeqs);
  };

  const exportSummaryCSV = () => {
    if (!summary) return;
    const lines = [
      "Financial Books Executive Summary Report",
      `Generated Date,${new Date().toLocaleDateString()}`,
      "",
      "Liquidity Balances",
      `Cash Book Balance,$${summary.cashBalance.toFixed(2)}`,
      `Bank Accounts Total,$${summary.bankBalance.toFixed(2)}`,
      `Petty Cash Float,$${summary.pettyCashBalance.toFixed(2)}`,
      `Total Liquid Reserves,$${summary.totalLiquidReserves.toFixed(2)}`,
      "",
      "Sales Receipts (30 Days)",
      `Total Collected,$${summary.totalReceiptsCollected.toFixed(2)}`,
      `Receipts Count,${summary.totalReceiptsCount}`,
      "",
      "Vendor Outflows (30 Days)",
      `Total Disbursed,$${summary.totalDisbursements.toFixed(2)}`,
      `Payment Vouchers Count,${summary.totalPaymentVouchersCount}`,
      "",
      "Net Cash Flow,$" + (summary.totalReceiptsCollected - summary.totalDisbursements).toFixed(2)
    ];

    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Financial_Summary_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Financial Reports & Control</h1>
            <p className="text-sm text-slate-500">Executive cash position, ledger audit trails, and document serial formatting.</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveTab("summary")}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-colors ${
              activeTab === "summary"
                ? "bg-indigo-600 text-white shadow-sm"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            Financial Summary
          </button>
          <button
            onClick={() => setActiveTab("numbering")}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-colors ${
              activeTab === "numbering"
                ? "bg-indigo-600 text-white shadow-sm"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            Document Serialization Config
          </button>
        </div>
      </div>

      {activeTab === "summary" ? (
        <div className="space-y-6">
          {isLoadingSummary ? (
            <div className="p-12 text-center text-slate-400 text-sm">Loading financial summary...</div>
          ) : summary ? (
            <>
              {/* Top Row Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between text-slate-400 mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider">Total Liquid Reserves</span>
                    <Wallet className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div className="text-3xl font-extrabold text-slate-900 font-mono">
                    ${summary.totalLiquidReserves.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                  <p className="text-xs text-slate-400 mt-2">Cash + Bank + Petty Cash</p>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between text-slate-400 mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider">Cash Book Balance</span>
                    <Wallet className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="text-2xl font-bold text-emerald-700 font-mono">
                    ${summary.cashBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                  <p className="text-xs text-slate-400 mt-2">Physical drawer cash</p>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between text-slate-400 mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider">Bank Accounts</span>
                    <Building2 className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="text-2xl font-bold text-blue-700 font-mono">
                    ${summary.bankBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                  <p className="text-xs text-slate-400 mt-2">Commercial accounts total</p>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between text-slate-400 mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider">Petty Cash Float</span>
                    <Wallet className="w-4 h-4 text-amber-600" />
                  </div>
                  <div className="text-2xl font-bold text-amber-700 font-mono">
                    ${summary.pettyCashBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                  <p className="text-xs text-slate-400 mt-2">Operational petty float</p>
                </div>
              </div>

              {/* Inflow vs Outflow Overview */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2 text-emerald-700 font-bold text-base">
                      <TrendingUp className="w-5 h-5" />
                      <span>Sales Receipts Collection</span>
                    </div>
                    <span className="text-xs font-bold font-mono bg-emerald-50 text-emerald-700 px-2 py-1 rounded-md">
                      {summary.totalReceiptsCount} Issued
                    </span>
                  </div>

                  <div className="text-3xl font-extrabold text-emerald-700 font-mono">
                    +${summary.totalReceiptsCollected.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                  <p className="text-xs text-slate-500">
                    Total revenue collected through customer sales receipts linked directly to Cash Book or Bank ledger accounts.
                  </p>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2 text-amber-700 font-bold text-base">
                      <TrendingDown className="w-5 h-5" />
                      <span>Vendor Payment Vouchers</span>
                    </div>
                    <span className="text-xs font-bold font-mono bg-amber-50 text-amber-700 px-2 py-1 rounded-md">
                      {summary.totalPaymentVouchersCount} Disbursed
                    </span>
                  </div>

                  <div className="text-3xl font-extrabold text-amber-700 font-mono">
                    -${summary.totalDisbursements.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                  <p className="text-xs text-slate-500">
                    Total vendor payouts disbursed through approved payment vouchers, subtracting supplier liabilities.
                  </p>
                </div>
              </div>

              {/* Export Action */}
              <div className="flex justify-end">
                <button
                  onClick={exportSummaryCSV}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-sm transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Export Full Executive Financial Audit (CSV)
                </button>
              </div>
            </>
          ) : null}
        </div>
      ) : (
        /* Document Serialization Config Tab */
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Settings className="w-5 h-5 text-indigo-600" />
                <span>Document Serial Numbering Rules</span>
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Configure auto-incrementing serial formats (e.g. REC-2026-000001, PV-2026-000001) and annual reset policies.
              </p>
            </div>
          </div>

          {isLoadingSeq ? (
            <div className="p-12 text-center text-slate-400 text-sm">Loading numbering configurations...</div>
          ) : (
            <form onSubmit={handleSaveSequences} className="space-y-6">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 text-xs font-semibold">
                    <tr>
                      <th className="py-3 px-4">Document Type</th>
                      <th className="py-3 px-4">Prefix</th>
                      <th className="py-3 px-4">Include Year?</th>
                      <th className="py-3 px-4">Zero Padding Digits</th>
                      <th className="py-3 px-4">Next Serial #</th>
                      <th className="py-3 px-4">Annual Reset?</th>
                      <th className="py-3 px-4">Sample Output</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono text-xs">
                    {localSeqs.map((seq) => {
                      const yearStr = seq.includeYear ? `${new Date().getFullYear()}-` : "";
                      const paddedNum = String(seq.nextNumber).padStart(seq.paddingDigits, "0");
                      const previewSerial = `${seq.prefix}-${yearStr}${paddedNum}`;

                      return (
                        <tr key={seq.documentType} className="hover:bg-slate-50/80">
                          <td className="py-3 px-4 font-sans font-bold text-slate-800">
                            {seq.documentType.replace("_", " ").toUpperCase()}
                          </td>
                          <td className="py-3 px-4">
                            <input
                              type="text"
                              value={seq.prefix}
                              onChange={(e) => handleSeqChange(seq.documentType, "prefix", e.target.value)}
                              className="w-20 border border-slate-200 rounded-lg px-2 py-1 text-xs uppercase"
                            />
                          </td>
                          <td className="py-3 px-4 font-sans">
                            <label className="inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={seq.includeYear}
                                onChange={(e) => handleSeqChange(seq.documentType, "includeYear", e.target.checked)}
                                className="rounded text-indigo-600 focus:ring-indigo-500"
                              />
                              <span className="ml-1.5 text-xs text-slate-600">{new Date().getFullYear()}</span>
                            </label>
                          </td>
                          <td className="py-3 px-4">
                            <input
                              type="number"
                              min={3}
                              max={10}
                              value={seq.paddingDigits}
                              onChange={(e) => handleSeqChange(seq.documentType, "paddingDigits", Number(e.target.value))}
                              className="w-16 border border-slate-200 rounded-lg px-2 py-1 text-xs"
                            />
                          </td>
                          <td className="py-3 px-4">
                            <input
                              type="number"
                              min={1}
                              value={seq.nextNumber}
                              onChange={(e) => handleSeqChange(seq.documentType, "nextNumber", Number(e.target.value))}
                              className="w-24 border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-indigo-700"
                            />
                          </td>
                          <td className="py-3 px-4 font-sans">
                            <label className="inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={seq.resetAnnually}
                                onChange={(e) => handleSeqChange(seq.documentType, "resetAnnually", e.target.checked)}
                                className="rounded text-indigo-600 focus:ring-indigo-500"
                              />
                              <span className="ml-1.5 text-xs text-slate-600">Jan 1 Reset</span>
                            </label>
                          </td>
                          <td className="py-3 px-4">
                            <span className="bg-indigo-50 text-indigo-700 font-bold px-2.5 py-1 rounded-md border border-indigo-100">
                              {previewSerial}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-end pt-4 border-t border-slate-100">
                <button
                  type="submit"
                  disabled={updateSeqMutation.isPending}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm"
                >
                  <Save className="w-4 h-4" />
                  {updateSeqMutation.isPending ? "Saving..." : "Save Serialization Rules"}
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
};
