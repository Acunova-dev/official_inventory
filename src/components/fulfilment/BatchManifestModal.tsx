import React, { useRef } from "react";
import { 
  X, 
  Printer, 
  Truck, 
  MapPin, 
  Calendar, 
  User, 
  Phone, 
  Package, 
  CheckCircle2, 
  FileText,
  DollarSign
} from "lucide-react";
import { PickAndDropBatch } from "../../types";

interface BatchManifestModalProps {
  isOpen: boolean;
  onClose: () => void;
  batch: PickAndDropBatch | null;
}

export const BatchManifestModal: React.FC<BatchManifestModalProps> = ({
  isOpen,
  onClose,
  batch
}) => {
  const printRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !batch) return null;

  const handlePrint = () => {
    window.print();
  };

  const totalOutstanding = batch.orders.reduce((sum, o) => sum + (o.outstandingBalance || 0), 0);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-600/30 border border-purple-400/40 flex items-center justify-center text-purple-300">
              <Truck size={18} />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-white tracking-tight">Pick & Drop Dispatch Manifest</h3>
              <p className="text-[11px] text-slate-400">Batch #{batch.batchNumber} • Status: {batch.status}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Manifest Printable Body */}
        <div ref={printRef} className="p-6 overflow-y-auto space-y-6 text-slate-800">
          
          {/* Manifest Header Summary */}
          <div className="border border-slate-200 rounded-2xl p-5 bg-slate-50 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-3">
              <div>
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Manifest Reference</span>
                <h2 className="text-xl font-extrabold text-slate-900">{batch.batchNumber}</h2>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Date Dispatched</span>
                <p className="text-xs font-bold text-slate-800">{new Date(batch.createdAt).toLocaleDateString()} {new Date(batch.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 block uppercase">Destination Point</span>
                <span className="font-bold text-slate-800 flex items-center gap-1 mt-0.5">
                  <MapPin size={12} className="text-blue-600 shrink-0" />
                  {batch.pickupLocation}
                </span>
              </div>

              <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 block uppercase">Driver / Courier</span>
                <span className="font-bold text-slate-800 flex items-center gap-1 mt-0.5">
                  <User size={12} className="text-purple-600 shrink-0" />
                  {batch.driverName || "Standard Dispatch"}
                </span>
                {batch.driverPhone && <span className="text-[10px] text-slate-400 block">{batch.driverPhone}</span>}
              </div>

              <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 block uppercase">Vehicle Reg</span>
                <span className="font-bold text-slate-800 mt-0.5 block">{batch.vehicleReg || "N/A"}</span>
              </div>

              <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 block uppercase">Total Orders</span>
                <span className="font-bold text-slate-800 mt-0.5 block">{batch.totalOrders} Orders ({batch.totalItems} Items)</span>
              </div>
            </div>
          </div>

          {/* Orders Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">Dispatched Consignments & Tickets</h4>
              <span className="text-xs font-semibold text-slate-500">
                Pending Depot Collections: ${totalOutstanding.toFixed(2)}
              </span>
            </div>

            <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 text-slate-500 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">Ticket / Order</th>
                    <th className="py-2.5 px-3">Customer</th>
                    <th className="py-2.5 px-3">Invoice</th>
                    <th className="py-2.5 px-3 text-center">Items</th>
                    <th className="py-2.5 px-3 text-right">To Collect</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {batch.orders.map((ord, idx) => (
                    <tr key={ord.fulfilmentOrderId} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-semibold text-slate-400">{idx + 1}</td>
                      <td className="py-2.5 px-3">
                        <span className="font-mono font-bold text-blue-600 block">{ord.ticketNumber || ord.fulfilmentOrderNumber}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{ord.fulfilmentOrderNumber}</span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="font-bold text-slate-800 block">{ord.customerName}</span>
                        {ord.customerPhone && <span className="text-[10px] text-slate-400">{ord.customerPhone}</span>}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-slate-600">
                        {ord.invoiceNumber}
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold text-slate-700">
                        {ord.itemCount}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {ord.outstandingBalance > 0 ? (
                          <span className="font-extrabold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200">
                            ${ord.outstandingBalance.toFixed(2)}
                          </span>
                        ) : (
                          <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                            Paid
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                          {ord.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Handover & Sign-off Blocks */}
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-200 text-xs">
            <div className="border border-slate-200 rounded-2xl p-4 space-y-4">
              <span className="font-bold text-slate-700 block text-xs">Warehouse Dispatch Officer</span>
              <div className="h-12 border-b border-dashed border-slate-300"></div>
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>Signature & Stamp</span>
                <span>Date: ____________</span>
              </div>
            </div>

            <div className="border border-slate-200 rounded-2xl p-4 space-y-4">
              <span className="font-bold text-slate-700 block text-xs">Collection Depot / Driver Receiver</span>
              <div className="h-12 border-b border-dashed border-slate-300"></div>
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>Signature & Receiver Name</span>
                <span>Date: ____________</span>
              </div>
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-500 font-medium">
            Keep one copy for warehouse audit, one copy for courier handover.
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl transition-all shadow-xs cursor-pointer"
            >
              <Printer size={14} />
              Print Manifest
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
