import React, { useEffect, useState, useRef } from "react";
import QRCode from "qrcode";
import { 
  X, 
  Printer, 
  Download, 
  CheckCircle2, 
  AlertCircle, 
  MapPin, 
  User, 
  Phone, 
  FileText, 
  ShieldCheck, 
  Copy, 
  Check,
  Package,
  Calendar,
  Store
} from "lucide-react";
import { CollectionTicket, FulfilmentOrder } from "../../types";

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticket?: CollectionTicket | null;
  order?: FulfilmentOrder | null;
}

export const QRCodeModal: React.FC<QRCodeModalProps> = ({
  isOpen,
  onClose,
  ticket,
  order
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const verificationToken = ticket?.token || order?.ticketToken || `tk_${order?.id || "unknown"}`;
  const ticketNumber = ticket?.ticketNumber || order?.ticketNumber || "PD-PASS";
  const customerName = ticket?.customerName || order?.customerName || "Customer";
  const customerPhone = ticket?.customerPhone || order?.customerPhone || "";
  const invoiceNumber = ticket?.invoiceNumber || order?.invoiceNumber || "";
  const pickupLocation = ticket?.pickupLocation || order?.pickupLocation || "Main Collection Desk";
  const totalAmount = ticket?.totalAmount ?? order?.totalAmount ?? 0;
  const outstanding = ticket?.outstandingBalance ?? order?.outstandingBalance ?? 0;
  const amountPaid = ticket?.amountPaid ?? order?.amountPaid ?? 0;
  const isPaid = outstanding <= 0.01;

  const items = ticket?.items || order?.items?.map(i => ({
    productName: i.productName,
    quantity: i.orderedQty,
    unitPrice: i.unitPrice
  })) || [];

  useEffect(() => {
    if (isOpen && verificationToken) {
      // Generate QR Code payload (Secure verification token and ticket identifier)
      // Keeps customer personal details secure while providing instant scanner lookup
      const payload = JSON.stringify({
        t: verificationToken,
        n: ticketNumber,
        inv: invoiceNumber
      });

      QRCode.toDataURL(payload, {
        width: 320,
        margin: 2,
        color: {
          dark: "#0f172a",
          light: "#ffffff"
        },
        errorCorrectionLevel: "H"
      })
        .then(url => setQrDataUrl(url))
        .catch(err => console.error("Error generating QR code:", err));
    }
  }, [isOpen, verificationToken, ticketNumber, invoiceNumber]);

  if (!isOpen) return null;

  const handleCopyToken = () => {
    navigator.clipboard.writeText(verificationToken);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadQR = () => {
    if (!qrDataUrl) return;
    const link = document.createElement("a");
    link.href = qrDataUrl;
    link.download = `QR-Pass-${ticketNumber}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600/30 border border-blue-400/40 flex items-center justify-center text-blue-400">
              <Store size={18} />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-white tracking-tight">Customer Collection Pass</h3>
              <p className="text-[11px] text-slate-400">Ticket #{ticketNumber} • Invoice #{invoiceNumber}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Printable Ticket Pass Content */}
        <div ref={printRef} className="p-6 space-y-6">
          
          {/* Status Alert Banner */}
          <div className={`p-3.5 rounded-2xl border flex items-center justify-between ${
            isPaid 
              ? "bg-emerald-50 border-emerald-200 text-emerald-800" 
              : "bg-amber-50 border-amber-200 text-amber-900"
          }`}>
            <div className="flex items-center gap-2.5">
              {isPaid ? (
                <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle size={18} className="text-amber-600 shrink-0" />
              )}
              <div>
                <p className="text-xs font-bold leading-tight">
                  {isPaid ? "Fully Paid — Ready for Handover" : `Payment Required at Collection: $${outstanding.toFixed(2)}`}
                </p>
                <p className="text-[10px] opacity-80 mt-0.5">
                  {isPaid ? "No balance due from customer." : `Total: $${totalAmount.toFixed(2)} • Paid: $${amountPaid.toFixed(2)}`}
                </p>
              </div>
            </div>
            <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider ${
              isPaid ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
            }`}>
              {isPaid ? "Paid" : "Balance Due"}
            </span>
          </div>

          {/* QR Code Display Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-3xl p-5 text-center flex flex-col items-center justify-center relative">
            <div className="bg-white p-3 rounded-2xl shadow-xs border border-slate-200">
              {qrDataUrl ? (
                <img 
                  src={qrDataUrl} 
                  alt={`QR Code Pass for ${ticketNumber}`} 
                  className="w-48 h-48 object-contain"
                />
              ) : (
                <div className="w-48 h-48 flex items-center justify-center text-slate-400 text-xs font-medium">
                  Generating QR...
                </div>
              )}
            </div>

            <div className="mt-3 space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Pickup Pass Token</span>
              <div className="flex items-center justify-center gap-2">
                <code className="text-xs font-mono font-bold text-slate-800 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                  {verificationToken}
                </code>
                <button
                  onClick={handleCopyToken}
                  className="p-1 text-slate-400 hover:text-slate-700 transition-colors"
                  title="Copy Token"
                >
                  {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                </button>
              </div>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-1">
              <div className="flex items-center gap-1.5 text-slate-400 font-semibold text-[11px]">
                <User size={13} />
                <span>Customer</span>
              </div>
              <p className="font-bold text-slate-800">{customerName}</p>
              {customerPhone && <p className="text-[11px] text-slate-500">{customerPhone}</p>}
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-1">
              <div className="flex items-center gap-1.5 text-slate-400 font-semibold text-[11px]">
                <MapPin size={13} />
                <span>Collection Point</span>
              </div>
              <p className="font-bold text-slate-800 leading-snug">{pickupLocation}</p>
            </div>
          </div>

          {/* Order Items Preview */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              <span>Items for Handover</span>
              <span>{items.length} items</span>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-2xl divide-y divide-slate-100 max-h-36 overflow-y-auto text-xs">
              {items.map((it, idx) => (
                <div key={idx} className="px-3.5 py-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-blue-600">{it.quantity}x</span>
                    <span className="font-medium text-slate-700">{it.productName}</span>
                  </div>
                  <span className="font-semibold text-slate-900">${(it.quantity * it.unitPrice).toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Security Guarantee Note */}
          <div className="flex items-start gap-2 text-[11px] text-slate-500 bg-blue-50/60 border border-blue-100 p-2.5 rounded-xl">
            <ShieldCheck size={15} className="text-blue-600 shrink-0 mt-0.5" />
            <span>Present this QR code or Ticket #{ticketNumber} at the collection desk. The agent will scan it to verify and release your order items.</span>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleDownloadQR}
            className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition-colors shadow-2xs cursor-pointer"
          >
            <Download size={14} />
            Download QR
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-all shadow-xs cursor-pointer"
            >
              <Printer size={14} />
              Print Pass
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
