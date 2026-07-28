import React, { useState } from "react";
import { 
  Printer, 
  X, 
  CheckCircle2, 
  AlertTriangle, 
  FileText, 
  User, 
  DollarSign, 
  ShieldCheck, 
  Building2, 
  Calendar, 
  PackageCheck,
  ArrowRight
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Quotation, Receipt } from "../types";

interface PrintConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmPrint: () => void;
  documentData: {
    type: "quotation" | "receipt";
    data: Quotation | Receipt;
    customerName?: string;
    docNumber?: string;
  } | null;
}

export const PrintConfirmationModal: React.FC<PrintConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirmPrint,
  documentData
}) => {
  const [isChecked, setIsChecked] = useState<boolean>(true);

  if (!isOpen || !documentData) return null;

  const isQuotation = documentData.type === "quotation";
  const doc = documentData.data;

  const quoteData = isQuotation ? (doc as Quotation) : null;
  const receiptData = !isQuotation ? (doc as Receipt) : null;

  const docNumber = documentData.docNumber || (isQuotation ? quoteData?.quotationNumber : receiptData?.receiptNumber) || "N/A";
  const customerName = documentData.customerName || (isQuotation ? quoteData?.customerName : receiptData?.customerName) || "Valued Customer";
  const customerEmail = isQuotation ? quoteData?.customerEmail : "billing@client.com";
  const date = doc.date || new Date().toISOString().split("T")[0];
  const lines = doc.lines || [];
  const subtotal = doc.subtotal || 0;
  const taxAmount = doc.taxAmount || 0;
  const discountAmount = doc.discountAmount || 0;
  const total = doc.total || 0;

  const handleConfirm = () => {
    onConfirmPrint();
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs print:hidden">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600 rounded-xl text-white shadow-xs">
                <Printer size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-extrabold text-base tracking-tight">Print Verification Checklist</h2>
                  <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 font-bold text-[10px] rounded-md border border-amber-500/30">
                    Verification Required
                  </span>
                </div>
                <p className="text-xs text-slate-400">Confirm quotation values before opening browser print layout</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 overflow-y-auto space-y-5 text-xs">
            
            {/* Warning Banner */}
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3 text-amber-900">
              <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <span className="font-extrabold text-xs">Please verify all proposal specifications</span>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  Printed documents carry official binding quotes for customers. Ensure quantities, unit prices, and tax rates are accurate prior to dispatch.
                </p>
              </div>
            </div>

            {/* Document Overview Header Box */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Document Ref</span>
                <span className="font-mono font-extrabold text-slate-900 text-sm">{docNumber}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Customer / Account</span>
                <span className="font-bold text-slate-900">{customerName}</span>
                {customerEmail && <span className="block text-slate-500 text-[10px] truncate">{customerEmail}</span>}
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Issue Date</span>
                <span className="font-bold text-slate-900">{date}</span>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                  <PackageCheck size={14} className="text-blue-600" />
                  <span>Itemized Hardware Line Items ({lines.length})</span>
                </span>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-500 font-extrabold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-2 px-3">Item Description</th>
                      <th className="py-2 px-3 text-center">Qty</th>
                      <th className="py-2 px-3 text-right">Unit Price</th>
                      <th className="py-2 px-3 text-right">Line Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                    {lines.map((line, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="py-2 px-3 font-semibold text-slate-900">{line.productName}</td>
                        <td className="py-2 px-3 text-center font-bold font-mono">{line.quantity}</td>
                        <td className="py-2 px-3 text-right font-mono">${line.unitPrice.toFixed(2)}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-950">${line.totalPrice.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Financial Summary */}
            <div className="bg-slate-900 text-white rounded-xl p-4 space-y-2 font-mono text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Subtotal:</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-rose-400">
                  <span>Discount Applied:</span>
                  <span>-${discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-400">
                <span>Tax / VAT (15%):</span>
                <span>+${taxAmount.toFixed(2)}</span>
              </div>
              <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-sm font-black">
                <span className="font-sans text-slate-300 uppercase">Grand Total Due:</span>
                <span className="text-blue-400 text-base">${total.toFixed(2)}</span>
              </div>
            </div>

            {/* Verification Checkbox */}
            <label className="flex items-center gap-2.5 p-3 bg-blue-50/60 border border-blue-200 rounded-xl cursor-pointer hover:bg-blue-50 transition-colors">
              <input
                type="checkbox"
                checked={isChecked}
                onChange={(e) => setIsChecked(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
              />
              <span className="text-slate-800 font-semibold text-xs leading-snug">
                I confirm that all customer information, line items, quantities, and totals listed above have been verified.
              </span>
            </label>

          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold rounded-xl text-xs transition-all"
            >
              Back / Make Edits
            </button>

            <button
              type="button"
              onClick={handleConfirm}
              disabled={!isChecked}
              id="btn-confirm-and-print"
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-extrabold rounded-xl text-xs transition-all shadow-md flex items-center gap-2"
            >
              <Printer size={15} />
              <span>Confirm & Print Document</span>
              <ArrowRight size={14} />
            </button>
          </div>

        </motion.div>
      </div>
    </AnimatePresence>
  );
};
