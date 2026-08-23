import React, { useState, useEffect, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { 
  QrCode, 
  Camera, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  User, 
  Phone, 
  FileText, 
  MapPin, 
  DollarSign, 
  Package, 
  Store, 
  RotateCcw,
  Sparkles,
  ShieldCheck,
  RefreshCw
} from "lucide-react";
import { FulfilmentOrder, CollectionTicket, Invoice } from "../../types";
import { fulfilmentService } from "../../services/api";
import { RecordCollectionModal } from "../../components/fulfilment/RecordCollectionModal";
import { useToast } from "../../components/Layout";

export const CollectionDeskScanPage: React.FC = () => {
  const { showToast } = useToast();
  const [searchToken, setSearchToken] = useState<string>("");
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [scannerError, setScannerError] = useState<string | null>(null);

  // Scanned order result
  const [scannedResult, setScannedResult] = useState<{
    ticket: CollectionTicket;
    order: FulfilmentOrder;
    invoice?: Invoice;
  } | null>(null);

  // Modal
  const [isHandoverModalOpen, setIsHandoverModalOpen] = useState<boolean>(false);

  const scannerRef = useRef<Html5Qrcode | null>(null);

  const handleLookup = async (tokenQuery: string) => {
    if (!tokenQuery.trim()) return;
    try {
      setLoading(true);
      setScannerError(null);
      const res = await fulfilmentService.getTicketByToken(tokenQuery.trim());
      if (!res) {
        showToast("No ticket found matching the provided token or number.", "warning");
        setScannedResult(null);
      } else {
        setScannedResult(res);
        showToast(`Found Ticket #${res.ticket.ticketNumber} for ${res.ticket.customerName}`, "success");
      }
    } catch (err: any) {
      console.error("Lookup error:", err);
      showToast("Error looking up collection ticket", "error");
    } finally {
      setLoading(false);
    }
  };

  const startScanner = async () => {
    try {
      setScannerError(null);
      setIsScanning(true);
      const html5QrCode = new Html5Qrcode("reader");
      scannerRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          // Success callback
          stopScanner();
          try {
            // Check if JSON payload or raw token
            let token = decodedText;
            if (decodedText.startsWith("{") && decodedText.endsWith("}")) {
              const parsed = JSON.parse(decodedText);
              token = parsed.t || parsed.n || decodedText;
            }
            setSearchToken(token);
            handleLookup(token);
          } catch {
            setSearchToken(decodedText);
            handleLookup(decodedText);
          }
        },
        (errorMessage) => {
          // Parse errors are expected while searching for QR
        }
      );
    } catch (err: any) {
      console.error("Scanner start error:", err);
      setScannerError("Could not access camera. Please enter ticket number or token manually below.");
      setIsScanning(false);
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current && isScanning) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch (err) {
        console.error("Error stopping scanner:", err);
      }
      setIsScanning(false);
    }
  };

  useEffect(() => {
    return () => {
      if (scannerRef.current && isScanning) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, [isScanning]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleLookup(searchToken);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12 font-sans">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <QrCode className="text-emerald-600" size={26} />
            Collection Desk & Scanner
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Scan customer QR collection pass or enter ticket number to verify items and release goods.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!isScanning ? (
            <button
              onClick={startScanner}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <Camera size={15} />
              Launch Camera Scanner
            </button>
          ) : (
            <button
              onClick={stopScanner}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer"
            >
              Close Camera
            </button>
          )}
        </div>
      </div>

      {/* Camera Live View Box if scanning */}
      {isScanning && (
        <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-xl border border-slate-800 flex flex-col items-center justify-center space-y-4">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
            Point camera at Customer QR Collection Pass
          </div>
          
          <div id="reader" className="w-full max-w-sm rounded-2xl overflow-hidden bg-black"></div>
        </div>
      )}

      {scannerError && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-amber-900 text-xs flex items-center gap-3">
          <AlertCircle size={18} className="text-amber-600 shrink-0" />
          <span>{scannerError}</span>
        </div>
      )}

      {/* Manual Input Search Box */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3">
        <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider block">
          Manual Ticket or Token Lookup
        </label>
        <form onSubmit={handleManualSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3.5 top-3.5 text-slate-400" />
            <input
              type="text"
              value={searchToken}
              onChange={(e) => setSearchToken(e.target.value)}
              placeholder="Enter Ticket # (e.g. PD-042), Token (tk_...), or Order #"
              className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
          >
            {loading ? <RefreshCw size={14} className="animate-spin" /> : <Search size={14} />}
            Verify Ticket
          </button>
        </form>
      </div>

      {/* Scanned Order Card */}
      {scannedResult && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          
          {/* Header Banner */}
          <div className="p-6 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  Verified Collection Pass
                </span>
                <span className="text-xs text-slate-400 font-mono">Token: {scannedResult.ticket.token}</span>
              </div>
              <h2 className="text-xl font-extrabold text-white">
                Ticket #{scannedResult.ticket.ticketNumber}
              </h2>
              <p className="text-xs text-slate-400">
                Linked to Invoice #{scannedResult.ticket.invoiceNumber} • Consignment #{scannedResult.order.orderNumber}
              </p>
            </div>

            {/* Status Badge */}
            <div className="text-right">
              <span className={`inline-block px-3 py-1 rounded-full text-xs font-extrabold border ${
                scannedResult.order.status === "Collected"
                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                  : "bg-blue-500/20 text-blue-300 border-blue-500/30"
              }`}>
                {scannedResult.order.status}
              </span>
              <span className="text-[10px] text-slate-400 block mt-1">
                Staged at: {scannedResult.order.stagingBay || scannedResult.ticket.pickupLocation}
              </span>
            </div>
          </div>

          <div className="p-6 space-y-6">
            
            {/* Payment & Customer Summary Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
                <div className="flex items-center gap-1.5 text-slate-400 font-semibold text-[11px]">
                  <User size={13} />
                  <span>Customer Identity</span>
                </div>
                <p className="font-bold text-slate-900 text-sm">{scannedResult.ticket.customerName}</p>
                {scannedResult.ticket.customerPhone && (
                  <p className="text-xs text-slate-500">{scannedResult.ticket.customerPhone}</p>
                )}
              </div>

              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
                <div className="flex items-center gap-1.5 text-slate-400 font-semibold text-[11px]">
                  <MapPin size={13} />
                  <span>Collection Desk</span>
                </div>
                <p className="font-bold text-slate-900 text-sm">{scannedResult.ticket.pickupLocation}</p>
                <p className="text-[11px] text-slate-500">Pick & Drop Station</p>
              </div>

              <div className={`p-3.5 border rounded-2xl space-y-1 ${
                scannedResult.ticket.outstandingBalance <= 0.01
                  ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                  : "bg-amber-50 border-amber-200 text-amber-900"
              }`}>
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span>Settlement Status</span>
                  <span>{scannedResult.ticket.outstandingBalance <= 0.01 ? "PAID" : "BALANCE DUE"}</span>
                </div>
                <p className="font-extrabold text-base">
                  {scannedResult.ticket.outstandingBalance <= 0.01
                    ? "$0.00 Due"
                    : `$${scannedResult.ticket.outstandingBalance.toFixed(2)} Pending`}
                </p>
                <p className="text-[10px] opacity-80">
                  Total Order Value: ${scannedResult.ticket.totalAmount.toFixed(2)}
                </p>
              </div>
            </div>

            {/* Already Collected Alert */}
            {scannedResult.order.status === "Collected" && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-emerald-900 text-xs font-medium">
                <CheckCircle2 size={20} className="text-emerald-600 shrink-0" />
                <div>
                  <p className="font-bold">Goods Already Released</p>
                  <p className="text-[11px]">
                    This ticket was collected on {new Date(scannedResult.order.updatedAt).toLocaleString()} by {scannedResult.order.recipientDetails?.name || scannedResult.ticket.customerName}.
                  </p>
                </div>
              </div>
            )}

            {/* Items Checklist Table */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                  Consignment Items ({scannedResult.order.items.length} items)
                </h4>
                <span className="text-xs font-semibold text-slate-500">
                  Verify physical items before releasing
                </span>
              </div>

              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Item Description</th>
                      <th className="py-2.5 px-3">SKU</th>
                      <th className="py-2.5 px-3 text-center">Ordered Qty</th>
                      <th className="py-2.5 px-3 text-right">Unit Price</th>
                      <th className="py-2.5 px-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {scannedResult.order.items.map((it, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-bold text-slate-800">
                          {it.productName}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-500 text-[11px]">
                          {it.sku}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="font-extrabold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                            {it.orderedQty}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-600">
                          ${it.unitPrice.toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                          ${(it.orderedQty * it.unitPrice).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Handover Action Footer */}
            <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <ShieldCheck size={16} className="text-emerald-600" />
                <span>Handover records timestamp, clerk signature, and receipt ledger sync.</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsHandoverModalOpen(true)}
                  className="flex items-center gap-1.5 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
                >
                  <CheckCircle2 size={16} />
                  {scannedResult.order.status === "Collected" ? "View / Update Handover" : "Record Customer Handover"}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Handover Modal */}
      {isHandoverModalOpen && scannedResult && (
        <RecordCollectionModal
          isOpen={true}
          order={scannedResult.order}
          onClose={() => setIsHandoverModalOpen(false)}
          onSuccess={() => {
            handleLookup(scannedResult.ticket.token);
          }}
        />
      )}

    </div>
  );
};
