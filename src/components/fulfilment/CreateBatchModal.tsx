import React, { useState } from "react";
import { 
  X, 
  Truck, 
  CheckCircle2, 
  MapPin, 
  User, 
  Phone, 
  Car, 
  Package, 
  AlertCircle, 
  Layers
} from "lucide-react";
import { FulfilmentOrder, PickAndDropBatch } from "../../types";
import { fulfilmentService } from "../../services/api";
import { useToast } from "../Layout";

interface CreateBatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  preparedOrders: FulfilmentOrder[];
  onSuccess: (newBatch: PickAndDropBatch) => void;
}

export const CreateBatchModal: React.FC<CreateBatchModalProps> = ({
  isOpen,
  onClose,
  preparedOrders,
  onSuccess
}) => {
  const { showToast } = useToast();
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>(
    preparedOrders.slice(0, 10).map(o => o.id)
  );
  const [pickupLocation, setPickupLocation] = useState<string>("Main Collection Desk");
  const [driverName, setDriverName] = useState<string>("");
  const [driverPhone, setDriverPhone] = useState<string>("");
  const [vehicleReg, setVehicleReg] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleToggleOrder = (id: string) => {
    setSelectedOrderIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedOrderIds.length === preparedOrders.length) {
      setSelectedOrderIds([]);
    } else {
      setSelectedOrderIds(preparedOrders.map(o => o.id));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedOrderIds.length === 0) {
      showToast("Please select at least one order to include in the dispatch batch.", "warning");
      return;
    }

    try {
      setIsSubmitting(true);
      const newBatch = await fulfilmentService.createBatch({
        pickupLocation,
        originLocation: "Main Central Warehouse",
        driverName: driverName.trim() || undefined,
        driverPhone: driverPhone.trim() || undefined,
        vehicleReg: vehicleReg.trim() || undefined,
        orderIds: selectedOrderIds,
        notes: notes.trim() || undefined
      });

      showToast(`Dispatch Batch ${newBatch.batchNumber} created with ${newBatch.totalOrders} orders!`, "success");
      onSuccess(newBatch);
      onClose();
    } catch (err: any) {
      console.error("Error creating batch:", err);
      showToast(err?.message || "Failed to create dispatch batch", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-600/30 border border-purple-400/40 flex items-center justify-center text-purple-300">
              <Truck size={18} />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-white tracking-tight">Create Pick & Drop Batch</h3>
              <p className="text-[11px] text-slate-400">Group staged consignments for transport to pickup point</p>
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
          
          {/* Destination & Courier Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="font-bold text-slate-700 block mb-1.5">
                Destination Collection Point <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <MapPin size={14} className="absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={pickupLocation}
                  onChange={(e) => setPickupLocation(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
                  placeholder="e.g., Main Collection Desk"
                  required
                />
              </div>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1.5">
                Driver / Courier Name
              </label>
              <div className="relative">
                <User size={14} className="absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
                  placeholder="e.g., John Doe"
                />
              </div>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1.5">
                Driver Contact Phone
              </label>
              <div className="relative">
                <Phone size={14} className="absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="tel"
                  value={driverPhone}
                  onChange={(e) => setDriverPhone(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
                  placeholder="e.g., +1 234 567 890"
                />
              </div>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1.5">
                Vehicle Registration #
              </label>
              <div className="relative">
                <Car size={14} className="absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={vehicleReg}
                  onChange={(e) => setVehicleReg(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
                  placeholder="e.g., KBC-1234"
                />
              </div>
            </div>
          </div>

          {/* Orders Selection List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider block">
                Select Orders to Include ({selectedOrderIds.length} of {preparedOrders.length} selected)
              </label>
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-xs font-bold text-purple-600 hover:text-purple-700 cursor-pointer"
              >
                {selectedOrderIds.length === preparedOrders.length ? "Deselect All" : "Select All"}
              </button>
            </div>

            {preparedOrders.length === 0 ? (
              <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl text-center text-slate-400 text-xs">
                No prepared orders available for dispatch. Please prepare customer orders first.
              </div>
            ) : (
              <div className="border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100 max-h-52 overflow-y-auto">
                {preparedOrders.map((ord) => {
                  const isChecked = selectedOrderIds.includes(ord.id);
                  return (
                    <div 
                      key={ord.id}
                      onClick={() => handleToggleOrder(ord.id)}
                      className={`p-3 flex items-center justify-between cursor-pointer transition-colors text-xs ${
                        isChecked ? "bg-purple-50/70" : "hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}} // Handled by div onClick
                          className="w-4 h-4 rounded-md text-purple-600 focus:ring-purple-500 border-slate-300"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900">{ord.customerName}</span>
                            <span className="text-[10px] font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200 text-slate-600 font-bold">
                              {ord.ticketNumber || ord.orderNumber}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-400">
                            Invoice: {ord.invoiceNumber} • {ord.items.length} items
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="font-bold text-slate-800 block text-xs">
                          ${ord.totalAmount.toFixed(2)}
                        </span>
                        <span className={`text-[10px] font-extrabold ${ord.outstandingBalance > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                          {ord.outstandingBalance > 0 ? `Due: $${ord.outstandingBalance.toFixed(2)}` : "Paid"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="text-xs">
            <label className="font-bold text-slate-700 block mb-1.5">
              Batch Manifest Notes
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-purple-500 focus:outline-hidden placeholder:text-slate-400"
              placeholder="e.g., Morning dispatch route 1. Handle with care."
            />
          </div>

          {/* Footer */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-between shrink-0">
            <span className="text-[11px] text-slate-400">
              Changes order status to "In Transit" upon dispatch.
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
                disabled={isSubmitting || selectedOrderIds.length === 0}
                className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl transition-all shadow-xs cursor-pointer disabled:opacity-50"
              >
                <Truck size={14} />
                {isSubmitting ? "Creating Batch..." : `Create Batch (${selectedOrderIds.length} Orders)`}
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
};
