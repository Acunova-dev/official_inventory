import React, { useState, useEffect } from "react";
import { 
  Truck, 
  Plus, 
  MapPin, 
  User, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  Printer, 
  ArrowRight, 
  RefreshCw,
  Package,
  Layers,
  ChevronRight
} from "lucide-react";
import { PickAndDropBatch, FulfilmentOrder, BatchStatus } from "../../types";
import { fulfilmentService } from "../../services/api";
import { CreateBatchModal } from "../../components/fulfilment/CreateBatchModal";
import { BatchManifestModal } from "../../components/fulfilment/BatchManifestModal";
import { useToast } from "../../components/Layout";

export const PickDropBatchesPage: React.FC = () => {
  const { showToast } = useToast();
  const [batches, setBatches] = useState<PickAndDropBatch[]>([]);
  const [preparedOrders, setPreparedOrders] = useState<FulfilmentOrder[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  
  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [selectedBatchForManifest, setSelectedBatchForManifest] = useState<PickAndDropBatch | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [batchList, orderList] = await Promise.all([
        fulfilmentService.getBatches(),
        fulfilmentService.getOrders({ status: "Prepared" })
      ]);
      setBatches(batchList);
      setPreparedOrders(orderList);
    } catch (err: any) {
      console.error("Error loading batches:", err);
      showToast("Failed to load dispatch batches", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleUpdateStatus = async (batchId: string, newStatus: BatchStatus) => {
    try {
      await fulfilmentService.updateBatchStatus(batchId, newStatus);
      showToast(`Batch updated to "${newStatus}"`, "success");
      loadData();
    } catch (err: any) {
      showToast(err?.message || "Failed to update status", "error");
    }
  };

  const statusColors: Record<BatchStatus, { bg: string; text: string; border: string }> = {
    "Draft": { bg: "bg-slate-50", text: "text-slate-700", border: "border-slate-200" },
    "Preparing": { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
    "Ready for Dispatch": { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
    "In Transit": { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
    "At Pickup Point": { bg: "bg-teal-50", text: "text-teal-700", border: "border-teal-200" },
    "Completed": { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
    "Closed": { bg: "bg-slate-100", text: "text-slate-600", border: "border-slate-300" },
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 font-sans">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Truck className="text-purple-600" size={26} />
            Pick & Drop Batches
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage dispatch batches, driver assignments, manifests, and transit status to pickup points.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            disabled={loading}
            className="p-2 bg-white hover:bg-slate-50 text-slate-600 rounded-xl border border-slate-200 shadow-2xs transition-colors cursor-pointer"
            title="Refresh Batches"
          >
            <RefreshCw size={15} className={loading ? "animate-spin text-purple-600" : ""} />
          </button>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <Plus size={15} />
            New Dispatch Batch
            {preparedOrders.length > 0 && (
              <span className="bg-purple-800 text-purple-200 text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ml-1">
                {preparedOrders.length} Ready
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Batches Grid */}
      {loading ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center text-slate-400 text-xs font-medium flex flex-col items-center gap-2">
          <RefreshCw className="animate-spin text-purple-600" size={24} />
          Loading batches...
        </div>
      ) : batches.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center text-slate-400 text-xs space-y-3">
          <Truck size={40} className="mx-auto text-slate-300" />
          <div>
            <p className="font-bold text-slate-700 text-sm">No Dispatch Batches Created Yet</p>
            <p className="text-[11px] text-slate-400 max-w-sm mx-auto mt-1">
              Create a batch to group prepared orders, assign drivers, and generate a printable manifest for collection points.
            </p>
          </div>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
          >
            Create First Batch
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {batches.map(batch => {
            const badge = statusColors[batch.status] || { bg: "bg-slate-50", text: "text-slate-700", border: "border-slate-200" };
            
            return (
              <div 
                key={batch.id} 
                className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between space-y-4"
              >
                {/* Batch Card Header */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-base text-slate-900">{batch.batchNumber}</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${badge.bg} ${badge.text} ${badge.border}`}>
                        {batch.status}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                      <Calendar size={11} />
                      {new Date(batch.createdAt).toLocaleDateString()} at {new Date(batch.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <button
                    onClick={() => setSelectedBatchForManifest(batch)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-purple-50 text-slate-700 hover:text-purple-700 border border-slate-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                    title="Print Dispatch Manifest"
                  >
                    <Printer size={13} />
                    Manifest
                  </button>
                </div>

                {/* Logistics Info Row */}
                <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-3 rounded-2xl border border-slate-100">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Destination Point</span>
                    <span className="font-bold text-slate-800 flex items-center gap-1 mt-0.5">
                      <MapPin size={12} className="text-blue-600 shrink-0" />
                      {batch.pickupLocation}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Driver / Vehicle</span>
                    <span className="font-bold text-slate-800 flex items-center gap-1 mt-0.5">
                      <User size={12} className="text-purple-600 shrink-0" />
                      {batch.driverName || "Direct Carrier"} {batch.vehicleReg ? `(${batch.vehicleReg})` : ""}
                    </span>
                  </div>
                </div>

                {/* Orders Overview in this batch */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
                    <span>Consignments ({batch.totalOrders} orders • {batch.totalItems} items)</span>
                  </div>
                  
                  <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
                    {batch.orders.map((ord, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-slate-50 border border-slate-100">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-blue-600 text-[11px]">{ord.ticketNumber || ord.fulfilmentOrderNumber}</span>
                          <span className="font-medium text-slate-700 truncate max-w-[150px]">{ord.customerName}</span>
                        </div>
                        <span className="text-[11px] font-semibold text-slate-500">
                          {ord.outstandingBalance > 0 ? `$${ord.outstandingBalance.toFixed(2)} due` : "Paid"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Status Advancement Controls */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <span className="text-[11px] text-slate-400">
                    Next step in transit lifecycle:
                  </span>

                  <div className="flex items-center gap-1.5">
                    {batch.status === "Ready for Dispatch" && (
                      <button
                        onClick={() => handleUpdateStatus(batch.id, "In Transit")}
                        className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <Truck size={12} />
                        Dispatch Out
                      </button>
                    )}

                    {batch.status === "In Transit" && (
                      <button
                        onClick={() => handleUpdateStatus(batch.id, "At Pickup Point")}
                        className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <MapPin size={12} />
                        Arrived at Depot
                      </button>
                    )}

                    {batch.status === "At Pickup Point" && (
                      <button
                        onClick={() => handleUpdateStatus(batch.id, "Completed")}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <CheckCircle2 size={12} />
                        Mark Completed
                      </button>
                    )}
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Create Batch Modal */}
      <CreateBatchModal
        isOpen={isCreateModalOpen}
        preparedOrders={preparedOrders}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => loadData()}
      />

      {/* Printable Manifest Modal */}
      {selectedBatchForManifest && (
        <BatchManifestModal
          isOpen={true}
          batch={selectedBatchForManifest}
          onClose={() => setSelectedBatchForManifest(null)}
        />
      )}

    </div>
  );
};
