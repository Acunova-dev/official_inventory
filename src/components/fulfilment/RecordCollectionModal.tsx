import React, { useState, useEffect } from "react";
import { 
  X, 
  CheckCircle2, 
  AlertCircle, 
  DollarSign, 
  CreditCard, 
  User, 
  Phone, 
  FileText, 
  ShieldCheck, 
  RotateCcw,
  Store,
  Layers,
  Banknote,
  Building2,
  Lock
} from "lucide-react";
import { FulfilmentOrder, BankAccount } from "../../types";
import { fulfilmentService, financialService } from "../../services/api";
import { useToast } from "../Layout";

interface RecordCollectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: FulfilmentOrder | null;
  onSuccess: () => void;
}

export const RecordCollectionModal: React.FC<RecordCollectionModalProps> = ({
  isOpen,
  onClose,
  order,
  onSuccess
}) => {
  const { showToast } = useToast();
  
  // Handover details
  const [outcome, setOutcome] = useState<"Collected" | "Not Collected">("Collected");
  const [recipientName, setRecipientName] = useState<string>("");
  const [recipientPhone, setRecipientPhone] = useState<string>("");
  const [recipientNationalId, setRecipientNationalId] = useState<string>("");
  const [signatureCaptured, setSignatureCaptured] = useState<boolean>(true);
  
  // Payment settlement
  const [collectPayment, setCollectPayment] = useState<boolean>(false);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<string>("Cash");
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [bankAccountId, setBankAccountId] = useState<string>("");
  
  // Order adjustments / return reasons
  const [notCollectedReason, setNotCollectedReason] = useState<string>("Customer requested cancellation");
  const [notes, setNotes] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (order) {
      setRecipientName(order.customerName || "");
      setRecipientPhone(order.customerPhone || "");
      const outstanding = order.outstandingBalance || 0;
      if (outstanding > 0) {
        setCollectPayment(true);
        setPaymentAmount(outstanding);
      } else {
        setCollectPayment(false);
        setPaymentAmount(0);
      }
    }

    financialService.getBankAccounts()
      .then(res => {
        const accounts = Array.isArray(res) ? res : (res as any)?.data || [];
        setBankAccounts(accounts);
        if (accounts.length > 0) {
          setBankAccountId(accounts[0].id);
        }
      })
      .catch(() => {});
  }, [order, isOpen]);

  if (!isOpen || !order) return null;

  const outstanding = order.outstandingBalance || 0;
  const isPaid = outstanding <= 0.01;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);

      const payload = {
        fulfilmentOrderId: order.id,
        outcome,
        recipientName: recipientName.trim() || order.customerName,
        recipientPhone: recipientPhone.trim() || order.customerPhone,
        recipientNationalId: recipientNationalId.trim() || undefined,
        signatureCaptured,
        paymentAmount: collectPayment ? Number(paymentAmount) : 0,
        paymentMethod: collectPayment ? paymentMethod : undefined,
        bankAccountId: collectPayment && paymentMethod !== "Cash" ? bankAccountId : undefined,
        notCollectedReason: outcome === "Not Collected" ? notCollectedReason : undefined,
        notes: notes.trim() || undefined
      };

      const res = await fulfilmentService.recordCollection(payload);

      if (outcome === "Collected") {
        showToast(`Order ${order.orderNumber} successfully handed over to ${recipientName || order.customerName}!`, "success");
      } else {
        showToast(`Order ${order.orderNumber} marked as Not Collected. Stock return recorded.`, "info");
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error("Error recording collection:", err);
      showToast(err?.message || "Failed to record collection", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-600/30 border border-emerald-400/40 flex items-center justify-center text-emerald-400">
              <Store size={18} />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-white tracking-tight">Record Customer Handover</h3>
              <p className="text-[11px] text-slate-400">Ticket #{order.ticketNumber || order.orderNumber} • {order.customerName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5">
          
          {/* Outcome Selection */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setOutcome("Collected")}
              className={`p-3 rounded-2xl border flex items-center gap-3 font-bold text-xs transition-all cursor-pointer ${
                outcome === "Collected"
                  ? "bg-emerald-50 border-emerald-300 text-emerald-800 ring-2 ring-emerald-500/20"
                  : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
              }`}
            >
              <CheckCircle2 size={18} className={outcome === "Collected" ? "text-emerald-600" : "text-slate-400"} />
              <div className="text-left">
                <span>Handover Completed</span>
                <span className="block text-[10px] font-normal text-slate-400">Customer received items</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setOutcome("Not Collected")}
              className={`p-3 rounded-2xl border flex items-center gap-3 font-bold text-xs transition-all cursor-pointer ${
                outcome === "Not Collected"
                  ? "bg-rose-50 border-rose-300 text-rose-800 ring-2 ring-rose-500/20"
                  : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
              }`}
            >
              <RotateCcw size={18} className={outcome === "Not Collected" ? "text-rose-600" : "text-slate-400"} />
              <div className="text-left">
                <span>Not Collected / Return</span>
                <span className="block text-[10px] font-normal text-slate-400">Restock items to warehouse</span>
              </div>
            </button>
          </div>

          {outcome === "Collected" ? (
            <>
              {/* Payment Settlement Alert if balance is due */}
              {outstanding > 0 ? (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertCircle size={16} className="text-amber-600" />
                      <span className="font-extrabold text-xs text-amber-900">
                        Outstanding Balance Due: ${outstanding.toFixed(2)}
                      </span>
                    </div>
                    <label className="flex items-center gap-1.5 text-xs font-bold text-amber-900 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={collectPayment}
                        onChange={(e) => setCollectPayment(e.target.checked)}
                        className="rounded text-amber-600 focus:ring-amber-500"
                      />
                      Collect Payment Now
                    </label>
                  </div>

                  {collectPayment && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-amber-200 text-xs">
                      <div>
                        <label className="font-bold text-slate-700 block mb-1">Amount ($)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={paymentAmount}
                          onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                          className="w-full px-2.5 py-1.5 bg-white border border-amber-300 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                          required
                        />
                      </div>

                      <div>
                        <label className="font-bold text-slate-700 block mb-1">Payment Method</label>
                        <select
                          value={paymentMethod}
                          onChange={(e) => setPaymentMethod(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white border border-amber-300 rounded-xl font-medium text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                        >
                          <option value="Cash">Cash (Counter Cash Drawer)</option>
                          <option value="Card">Credit/Debit Card</option>
                          <option value="Bank Transfer">Bank Transfer / EFT</option>
                          <option value="Mobile Money">Mobile Money</option>
                        </select>
                      </div>

                      {paymentMethod !== "Cash" && (
                        <div>
                          <label className="font-bold text-slate-700 block mb-1">Bank Account</label>
                          <select
                            value={bankAccountId}
                            onChange={(e) => setBankAccountId(e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-white border border-amber-300 rounded-xl font-medium text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                          >
                            {bankAccounts.map(b => (
                              <option key={b.id} value={b.id}>{b.bankName} ({b.accountNumber.slice(-4)})</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between text-xs text-emerald-800 font-bold">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-emerald-600" />
                    <span>Payment Status: Fully Paid ($0.00 Due)</span>
                  </div>
                  <span className="text-[10px] bg-emerald-100 px-2 py-0.5 rounded-full uppercase">Settled</span>
                </div>
              )}

              {/* Recipient Verification */}
              <div className="space-y-3">
                <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider block">
                  Recipient Identity & Handover Verification
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">
                      Recipient / Collector Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={recipientName}
                      onChange={(e) => setRecipientName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                      placeholder="Name of person collecting"
                      required
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">
                      Contact Phone #
                    </label>
                    <input
                      type="tel"
                      value={recipientPhone}
                      onChange={(e) => setRecipientPhone(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                      placeholder="e.g. +1 555 0192"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">
                      National ID / Driver License #
                    </label>
                    <input
                      type="text"
                      value={recipientNationalId}
                      onChange={(e) => setRecipientNationalId(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                      placeholder="Optional ID for verification"
                    />
                  </div>

                  <div className="flex items-center pt-5">
                    <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={signatureCaptured}
                        onChange={(e) => setSignatureCaptured(e.target.checked)}
                        className="rounded text-emerald-600 focus:ring-emerald-500"
                      />
                      <span>Physical/Digital Signature Verified</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Items Verification Checklist */}
              <div className="space-y-2">
                <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider block">
                  Items to Hand Over ({order.items.length} items)
                </label>
                <div className="border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100 max-h-36 overflow-y-auto text-xs">
                  {order.items.map((it, idx) => (
                    <div key={idx} className="p-2.5 flex items-center justify-between bg-slate-50">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                        <span className="font-bold text-slate-800">{it.orderedQty}x {it.productName}</span>
                      </div>
                      <span className="text-[11px] font-mono text-slate-500">${(it.orderedQty * it.unitPrice).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            /* Not Collected / Return Reason */
            <div className="space-y-3">
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-900">
                <p className="font-bold">Goods Return & Restock</p>
                <p className="text-[11px] opacity-90 mt-0.5">
                  Items will be marked as Not Collected and returned to available inventory in the main warehouse.
                </p>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1 text-xs">
                  Reason for Return <span className="text-rose-500">*</span>
                </label>
                <select
                  value={notCollectedReason}
                  onChange={(e) => setNotCollectedReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 text-xs focus:bg-white focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
                  required
                >
                  <option value="Customer requested cancellation">Customer requested cancellation</option>
                  <option value="Expired pickup window / Unclaimed">Expired pickup window / Unclaimed</option>
                  <option value="Payment declined by customer">Payment declined by customer</option>
                  <option value="Damaged during handling">Damaged during handling</option>
                  <option value="Incorrect specification supplied">Incorrect specification supplied</option>
                </select>
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="text-xs">
            <label className="font-bold text-slate-700 block mb-1">
              Handover Remarks
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden placeholder:text-slate-400"
              placeholder="e.g. Package inspected by customer."
            />
          </div>

          {/* Action Footer */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-between shrink-0">
            <span className="text-[11px] text-slate-400">
              Synchronizes order status, receipts, and audit trail instantly.
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className={`flex items-center gap-1.5 px-4 py-2 text-white font-bold text-xs rounded-xl transition-all shadow-xs cursor-pointer disabled:opacity-50 ${
                  outcome === "Collected"
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-rose-600 hover:bg-rose-700"
                }`}
              >
                <CheckCircle2 size={14} />
                {isSubmitting 
                  ? "Recording..." 
                  : outcome === "Collected" ? "Confirm Handover & Release" : "Mark as Not Collected"}
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
};
