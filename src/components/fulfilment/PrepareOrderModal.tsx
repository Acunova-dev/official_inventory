import React, { useState } from "react";
import { 
  X, 
  Package, 
  CheckCircle2, 
  AlertCircle, 
  MapPin, 
  Layers, 
  FileText, 
  ArrowRight, 
  Sparkles,
  Store
} from "lucide-react";
import { FulfilmentOrder, CollectionTicket } from "../../types";
import { fulfilmentService } from "../../services/api";
import { useToast } from "../Layout";

interface PrepareOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: FulfilmentOrder | null;
  onSuccess: (updatedOrder: FulfilmentOrder, ticket: CollectionTicket) => void;
}

export const PrepareOrderModal: React.FC<PrepareOrderModalProps> = ({
  isOpen,
  onClose,
  order,
  onSuccess
}) => {
  const { showToast } = useToast();
  const [stagingBay, setStagingBay] = useState<string>("Bay A-1 (Main Dispatch)");
  const [pickupLocation, setPickupLocation] = useState<string>(order?.pickupLocation || "Main Collection Desk");
  const [notes, setNotes] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!isOpen || !order) return null;

  const hasDeficit = order.stockStatus === "Deficit" || order.items.some(i => i.stockAvailable < i.orderedQty);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      const res = await fulfilmentService.prepareOrder(order.id, {
        stagingBay,
        pickupLocation,
        notes
      });
      showToast(`Order ${order.orderNumber} successfully prepared! Collection Ticket ${res.ticket.ticketNumber} generated.`, "success");
      onSuccess(res.order, res.ticket);
      onClose();
    } catch (err: any) {
      console.error("Error preparing order:", err);
      showToast(err?.message || "Failed to prepare order", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600/30 border border-blue-400/40 flex items-center justify-center text-blue-400">
              <Package size={18} />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-white tracking-tight">Stage & Prepare Order</h3>
              <p className="text-[11px] text-slate-400">{order.orderNumber} • {order.customerName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          
          {/* Deficit warning if stock is lower than quoted/invoiced */}
          {hasDeficit && (
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-2.5 text-amber-900 text-xs">
              <AlertCircle size={17} className="text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Stock Deficit Notice</p>
                <p className="text-[11px] opacity-90 mt-0.5">
                  Some items in this order exceed current on-hand inventory. The system will record inventory movement for available quantities and allocate the rest for procurement.
                </p>
              </div>
            </div>
          )}

          {/* Items to Pack List */}
          <div className="space-y-2">
            <label className="text-xs font-extrabold text-slate-600 uppercase tracking-wider block">
              Items to Pack & Stage ({order.items.length} items)
            </label>
            <div className="border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100 max-h-48 overflow-y-auto text-xs">
              {order.items.map((item, idx) => {
                const isShort = item.stockAvailable < item.orderedQty;
                return (
                  <div key={idx} className="p-3 flex items-center justify-between hover:bg-slate-50">
                    <div>
                      <span className="font-bold text-slate-800 block">{item.productName}</span>
                      <span className="text-[11px] text-slate-400 font-mono">SKU: {item.sku}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-extrabold text-slate-900 block text-xs">
                        Qty: {item.orderedQty}
                      </span>
                      <span className={`text-[10px] font-bold ${isShort ? "text-amber-600" : "text-emerald-600"}`}>
                        Stock: {item.stockAvailable} available
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Staging & Drop point selections */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="font-bold text-slate-700 block mb-1.5">
                Staging Bay / Packing Shelf <span className="text-rose-500">*</span>
              </label>
              <select
                value={stagingBay}
                onChange={(e) => setStagingBay(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                required
              >
                <option value="Bay A-1 (Main Dispatch)">Bay A-1 (Main Dispatch)</option>
                <option value="Bay A-2 (Heavy Goods)">Bay A-2 (Heavy Goods)</option>
                <option value="Bay B-1 (Fast Moving)">Bay B-1 (Fast Moving)</option>
                <option value="Bay C-1 (Express Hold)">Bay C-1 (Express Hold)</option>
                <option value="Shelf S-04 (Small Parcels)">Shelf S-04 (Small Parcels)</option>
                <option value="Secure Cage (High Value)">Secure Cage (High Value)</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1.5">
                Collection Point <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={pickupLocation}
                onChange={(e) => setPickupLocation(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                placeholder="e.g., Main Collection Desk"
                required
              />
            </div>
          </div>

          {/* Preparation Notes */}
          <div className="text-xs">
            <label className="font-bold text-slate-700 block mb-1.5">
              Packing Notes & Instructions
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden placeholder:text-slate-400"
              placeholder="e.g., Packed in 2 sealed boxes. Fragile glassware included."
            />
          </div>

          {/* Action Footer */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-between gap-3">
            <span className="text-[11px] text-slate-400">
              Generates customer collection pass & QR token automatically.
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
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-all shadow-xs cursor-pointer disabled:opacity-50"
              >
                <CheckCircle2 size={14} />
                {isSubmitting ? "Processing..." : "Confirm & Issue Pass"}
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
};
