import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { financialService, supplierService, purchasingService } from "../../services/api";
import { PaymentVoucher } from "../../types";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../components/Layout";
import { 
  FileText, 
  PlusCircle, 
  RotateCcw, 
  Search, 
  Building, 
  Printer, 
  ShieldAlert, 
  CheckCircle2, 
  XCircle,
  Download
} from "lucide-react";
import { UnifiedDocumentModal } from "../../components/UnifiedDocumentModal";

export const PaymentVouchersPage: React.FC = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isReverseModalOpen, setIsReverseModalOpen] = useState(false);
  const [activeVoucherForReverse, setActiveVoucherForReverse] = useState<PaymentVoucher | null>(null);
  const [reversalReason, setReversalReason] = useState("");
  const [viewVoucher, setViewVoucher] = useState<PaymentVoucher | null>(null);

  // Form State
  const [supplierId, setSupplierId] = useState("");
  const [poId, setPoId] = useState("");
  const [supplierInvoiceNo, setSupplierInvoiceNo] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [bankAccountId, setBankAccountId] = useState("");
  const [amount, setAmount] = useState("");
  const [purpose, setPurpose] = useState("");
  const [notes, setNotes] = useState("");

  const { data: vouchers = [], isLoading } = useQuery({
    queryKey: ["paymentVouchers"],
    queryFn: financialService.getPaymentVouchers,
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ["suppliers"],
    queryFn: supplierService.getAll,
  });

  const { data: bankAccounts = [] } = useQuery({
    queryKey: ["bankAccounts"],
    queryFn: financialService.getBankAccounts,
  });

  const { data: purchaseOrders = [] } = useQuery({
    queryKey: ["purchaseOrders"],
    queryFn: purchasingService.getOrders,
  });

  const createMutation = useMutation({
    mutationFn: financialService.createPaymentVoucher,
    onSuccess: (pv) => {
      queryClient.invalidateQueries({ queryKey: ["paymentVouchers"] });
      queryClient.invalidateQueries({ queryKey: ["cashbook"] });
      queryClient.invalidateQueries({ queryKey: ["bankAccounts"] });
      queryClient.invalidateQueries({ queryKey: ["financialSummary"] });
      addToast(`Payment Voucher ${pv.voucherNumber} created & disbursed successfully!`, "success");
      setIsCreateModalOpen(false);
      resetForm();
    },
    onError: (err: any) => {
      addToast(err?.response?.data?.error || "Failed to create Payment Voucher", "error");
    }
  });

  const reverseMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => 
      financialService.reversePaymentVoucher(id, reason),
    onSuccess: (pv) => {
      queryClient.invalidateQueries({ queryKey: ["paymentVouchers"] });
      queryClient.invalidateQueries({ queryKey: ["cashbook"] });
      queryClient.invalidateQueries({ queryKey: ["bankAccounts"] });
      addToast(`Payment Voucher ${pv.voucherNumber} has been reversed`, "success");
      setIsReverseModalOpen(false);
      setActiveVoucherForReverse(null);
      setReversalReason("");
    },
    onError: (err: any) => {
      addToast(err?.response?.data?.error || "Failed to reverse voucher", "error");
    }
  });

  const resetForm = () => {
    setSupplierId("");
    setPoId("");
    setSupplierInvoiceNo("");
    setPaymentMethod("Cash");
    setBankAccountId("");
    setAmount("");
    setPurpose("");
    setNotes("");
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierId) {
      addToast("Please select a vendor / supplier", "warning");
      return;
    }
    if (!amount || Number(amount) <= 0) {
      addToast("Please enter a valid disbursement amount", "warning");
      return;
    }
    createMutation.mutate({
      supplierId,
      poId: poId || undefined,
      supplierInvoiceNo: supplierInvoiceNo || undefined,
      paymentMethod,
      amount: Number(amount),
      bankAccountId: paymentMethod !== "Cash" ? bankAccountId : undefined,
      purpose,
      notes
    });
  };

  const filteredVouchers = vouchers.filter((pv) => {
    const matchesSearch = 
      pv.voucherNumber.toLowerCase().includes(search.toLowerCase()) ||
      pv.supplierName.toLowerCase().includes(search.toLowerCase()) ||
      (pv.supplierInvoiceNo && pv.supplierInvoiceNo.toLowerCase().includes(search.toLowerCase())) ||
      (pv.purpose && pv.purpose.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus = statusFilter === "All" || pv.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const [selectedPvForPrint, setSelectedPvForPrint] = useState<PaymentVoucher | null>(null);

  const handlePrint = (pv: PaymentVoucher) => {
    setSelectedPvForPrint(pv);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Payment Vouchers (Order Payouts)</h1>
            <p className="text-sm text-slate-500">Serialized document control for vendor disbursements & supplier payments.</p>
          </div>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-sm transition-colors shadow-sm"
        >
          <PlusCircle className="w-4 h-4" />
          Issue Payment Voucher
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search voucher #, vendor, invoice..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs font-semibold text-slate-500">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-slate-200 rounded-xl text-xs px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="All">All Statuses</option>
            <option value="Issued">Issued</option>
            <option value="Reversed">Reversed</option>
          </select>
        </div>
      </div>

      {/* Vouchers Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400 text-sm">Loading payment vouchers...</div>
        ) : filteredVouchers.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">No payment vouchers found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 text-xs font-semibold">
                <tr>
                  <th className="py-3 px-4">Voucher Serial #</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Vendor / Supplier</th>
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-4">Payment Method</th>
                  <th className="py-3 px-4 text-right">Disbursed Amount</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-xs">
                {filteredVouchers.map((pv) => (
                  <tr key={pv.id} className="hover:bg-slate-50/80">
                    <td className="py-3 px-4 font-bold text-blue-700">
                      {pv.voucherNumber}
                    </td>
                    <td className="py-3 px-4 text-slate-600">{pv.date}</td>
                    <td className="py-3 px-4 font-sans font-semibold text-slate-800">{pv.supplierName}</td>
                    <td className="py-3 px-4 text-slate-600">{pv.supplierInvoiceNo || "-"}</td>
                    <td className="py-3 px-4 font-sans text-slate-700">{pv.paymentMethod}</td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900 font-mono">
                      ${pv.amount.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-sans font-bold px-2.5 py-0.5 rounded-full ${
                        pv.status === "Issued"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-red-50 text-red-700 border border-red-200 line-through"
                      }`}>
                        {pv.status === "Issued" ? <CheckCircle2 className="w-3 h-3 text-emerald-500" /> : <XCircle className="w-3 h-3 text-red-500" />}
                        {pv.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2 font-sans">
                        <button
                          onClick={() => handlePrint(pv)}
                          title="Print Official Voucher"
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        
                        {pv.status === "Issued" && (user?.role === "Principal Admin" || user?.role === "Inventory Manager") && (
                          <button
                            onClick={() => {
                              setActiveVoucherForReverse(pv);
                              setIsReverseModalOpen(true);
                            }}
                            title="Reverse Payment Voucher"
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Payment Voucher Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 space-y-4 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base">Issue Serialized Payment Voucher</h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Supplier / Vendor *</label>
                <select
                  required
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Vendor...</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>{s.name} ({s.companyName || "Vendor"})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Link Purchase Order (Optional)</label>
                  <select
                    value={poId}
                    onChange={(e) => setPoId(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">None / Standalone</option>
                    {purchaseOrders.map((po) => (
                      <option key={po.id} value={po.id}>{po.poNumber} (${po.totalAmount})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Supplier Invoice No</label>
                  <input
                    type="text"
                    placeholder="e.g. INV-9982"
                    value={supplierInvoiceNo}
                    onChange={(e) => setSupplierInvoiceNo(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Disbursement Channel *</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Cash">Cash Book (Physical Drawer)</option>
                    <option value="Bank Transfer">Bank Transfer (EFT / Wire)</option>
                    <option value="Cheque">Corporate Cheque</option>
                  </select>
                </div>

                {paymentMethod !== "Cash" && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Disbursing Bank Account *</label>
                    <select
                      required
                      value={bankAccountId}
                      onChange={(e) => setBankAccountId(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Bank...</option>
                      {bankAccounts.map((b) => (
                        <option key={b.id} value={b.id}>{b.accountName} (${b.currentBalance})</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Amount ($) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Purpose / Explanation</label>
                <input
                  type="text"
                  placeholder="e.g. Full settlement for stock delivery"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm"
                >
                  {createMutation.isPending ? "Disbursing..." : "Generate Voucher"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reversal Confirmation Modal */}
      {isReverseModalOpen && activeVoucherForReverse && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4 border border-slate-200">
            <div className="flex items-center gap-3 text-red-600">
              <ShieldAlert className="w-6 h-6" />
              <h3 className="font-bold text-slate-900 text-base">Reverse Payment Voucher</h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to reverse payment voucher <strong className="text-slate-900">{activeVoucherForReverse.voucherNumber}</strong> (${activeVoucherForReverse.amount.toFixed(2)})? This will automatically post a credit reversal to the corresponding Cash Book or Bank Ledger.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Audit Reversal Reason *</label>
              <textarea
                required
                rows={2}
                placeholder="Reason for payment voucher cancellation..."
                value={reversalReason}
                onChange={(e) => setReversalReason(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsReverseModalOpen(false);
                  setActiveVoucherForReverse(null);
                }}
                className="px-4 py-2 text-xs font-semibold text-slate-600"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={reverseMutation.isPending || !reversalReason.trim()}
                onClick={() => reverseMutation.mutate({ id: activeVoucherForReverse.id, reason: reversalReason })}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm disabled:opacity-50"
              >
                {reverseMutation.isPending ? "Reversing..." : "Confirm Reversal"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unified Branded Document Modal */}
      <UnifiedDocumentModal
        isOpen={!!selectedPvForPrint}
        onClose={() => setSelectedPvForPrint(null)}
        document={selectedPvForPrint ? { type: "payment_voucher", data: selectedPvForPrint } : null}
      />
    </div>
  );
};
