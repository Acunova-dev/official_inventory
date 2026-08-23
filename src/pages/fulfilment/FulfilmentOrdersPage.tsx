import React, { useState, useEffect } from "react";
import { 
  Package, 
  Search, 
  Filter, 
  RefreshCw, 
  QrCode, 
  Truck, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Store, 
  Plus, 
  ArrowUpDown,
  FileText,
  ChevronRight,
  Eye,
  Check
} from "lucide-react";
import { FulfilmentOrder, CollectionTicket } from "../../types";
import { fulfilmentService } from "../../services/api";
import { PrepareOrderModal } from "../../components/fulfilment/PrepareOrderModal";
import { QRCodeModal } from "../../components/fulfilment/QRCodeModal";
import { RecordCollectionModal } from "../../components/fulfilment/RecordCollectionModal";
import { useToast } from "../../components/Layout";

export const FulfilmentOrdersPage: React.FC = () => {
  const { showToast } = useToast();
  const [orders, setOrders] = useState<FulfilmentOrder[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");
  
  // Modal states
  const [selectedOrderForPrepare, setSelectedOrderForPrepare] = useState<FulfilmentOrder | null>(null);
  const [selectedOrderForQR, setSelectedOrderForQR] = useState<FulfilmentOrder | null>(null);
  const [selectedOrderForHandover, setSelectedOrderForHandover] = useState<FulfilmentOrder | null>(null);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const data = await fulfilmentService.getOrders({
        status: statusFilter === "All" ? undefined : statusFilter,
        search: searchQuery || undefined
      });
      setOrders(data);
    } catch (err: any) {
      console.error("Error loading fulfilment orders:", err);
      showToast("Failed to load fulfilment orders", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadOrders();
  };

  const handleSyncInvoices = async () => {
    try {
      setLoading(true);
      const synced = await fulfilmentService.syncFromInvoices();
      showToast(`Synchronized ${synced.length} fulfilment orders from sales invoices.`, "success");
      loadOrders();
    } catch (err: any) {
      showToast("Sync failed", "error");
    } finally {
      setLoading(false);
    }
  };

  const statusBadges: Record<string, { bg: string; text: string; border: string }> = {
    "Ready to Prepare": { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
    "Awaiting Stock": { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200" },
    "Prepared": { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
    "Ready for Collection": { bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-200" },
    "Assigned to Batch": { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
    "In Transit": { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
    "At Pickup Point": { bg: "bg-teal-50", text: "text-teal-700", border: "border-teal-200" },
    "Collected": { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
    "Not Collected": { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200" },
    "Cancelled": { bg: "bg-slate-50", text: "text-slate-600", border: "border-slate-200" },
  };

  const filteredOrders = orders.filter(o => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const match = 
        o.orderNumber.toLowerCase().includes(q) ||
        o.customerName.toLowerCase().includes(q) ||
        o.invoiceNumber.toLowerCase().includes(q) ||
        (o.ticketNumber && o.ticketNumber.toLowerCase().includes(q));
      if (!match) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 font-sans">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Package className="text-blue-600" size={26} />
            Orders & Packaging
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Stage customer orders from invoices, assign packing bays, and issue collection tickets.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSyncInvoices}
            disabled={loading}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 shadow-2xs transition-all cursor-pointer"
            title="Scan Invoices to auto-create missing fulfilment consignments"
          >
            <RefreshCw size={14} className={loading ? "animate-spin text-blue-600" : "text-slate-500"} />
            Sync from Invoices
          </button>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs space-y-4">
        
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 text-xs font-bold scrollbar-none">
          {[
            { id: "All", label: "All Consignments" },
            { id: "Ready to Prepare", label: "Ready to Prepare" },
            { id: "Prepared", label: "Prepared & Staged" },
            { id: "In Transit", label: "In Transit" },
            { id: "At Pickup Point", label: "At Collection Desk" },
            { id: "Collected", label: "Handed Over" },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3.5 py-1.5 rounded-xl whitespace-nowrap transition-all cursor-pointer ${
                statusFilter === tab.id
                  ? "bg-slate-900 text-white shadow-xs"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search row */}
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Order #, Customer, Ticket #, or Invoice..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
          >
            Search
          </button>
        </form>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs font-medium flex flex-col items-center gap-2">
            <RefreshCw className="animate-spin text-blue-600" size={24} />
            Loading fulfilment orders...
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs space-y-2">
            <Package size={36} className="mx-auto text-slate-300" />
            <p className="font-bold text-slate-600">No fulfilment orders found.</p>
            <p className="text-[11px]">Click "Sync from Invoices" above to import orders from your confirmed sales invoices.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 text-slate-400 font-bold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Consignment / Ticket</th>
                  <th className="py-3 px-4">Customer & Invoice</th>
                  <th className="py-3 px-4">Items / Staging</th>
                  <th className="py-3 px-4">Inventory Status</th>
                  <th className="py-3 px-4">Balance / Payment</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredOrders.map(order => {
                  const badge = statusBadges[order.status] || { bg: "bg-slate-50", text: "text-slate-600", border: "border-slate-200" };
                  const isPaid = (order.outstandingBalance || 0) <= 0.01;
                  const canPrepare = order.status === "Ready to Prepare" || order.status === "Awaiting Stock";
                  const isHandedOver = order.status === "Collected";

                  return (
                    <tr key={order.id} className="hover:bg-slate-50/70 transition-colors">
                      
                      {/* Consignment & Ticket */}
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-slate-900 block">{order.orderNumber}</span>
                        {order.ticketNumber ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200 mt-1">
                            <QrCode size={10} />
                            #{order.ticketNumber}
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 block mt-0.5">Ticket pending prep</span>
                        )}
                      </td>

                      {/* Customer & Invoice */}
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-slate-800 block">{order.customerName}</span>
                        <span className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <FileText size={11} className="text-slate-400" />
                          {order.invoiceNumber}
                        </span>
                      </td>

                      {/* Items & Staging */}
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-slate-700 block">
                          {order.items.length} items ({order.items.reduce((s, i) => s + i.orderedQty, 0)} units)
                        </span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          {order.stagingBay || order.pickupLocation}
                        </span>
                      </td>

                      {/* Stock Status */}
                      <td className="py-3.5 px-4">
                        {order.stockStatus === "Deficit" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-50 text-amber-700 border border-amber-200">
                            <AlertCircle size={10} />
                            Deficit / Procure
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 size={10} />
                            Stock Ready
                          </span>
                        )}
                      </td>

                      {/* Balance & Payment */}
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-slate-900 block">${order.totalAmount.toFixed(2)}</span>
                        {isPaid ? (
                          <span className="text-[10px] font-bold text-emerald-600 block mt-0.5">Paid in Full</span>
                        ) : (
                          <span className="text-[10px] font-extrabold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 inline-block mt-0.5">
                            Due: ${order.outstandingBalance.toFixed(2)}
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-extrabold border ${badge.bg} ${badge.text} ${badge.border}`}>
                          {order.status}
                        </span>
                      </td>

                      {/* Action buttons */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {canPrepare && (
                            <button
                              onClick={() => setSelectedOrderForPrepare(order)}
                              className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-all shadow-2xs cursor-pointer flex items-center gap-1"
                              title="Stage Order & Generate Ticket"
                            >
                              <Package size={12} />
                              Prepare
                            </button>
                          )}

                          {order.ticketNumber && (
                            <button
                              onClick={() => setSelectedOrderForQR(order)}
                              className="p-1.5 bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 rounded-xl transition-colors border border-slate-200 cursor-pointer"
                              title="View Customer QR Pass"
                            >
                              <QrCode size={14} />
                            </button>
                          )}

                          {!isHandedOver && order.status !== "Ready to Prepare" && order.status !== "Awaiting Stock" && (
                            <button
                              onClick={() => setSelectedOrderForHandover(order)}
                              className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-all shadow-2xs cursor-pointer flex items-center gap-1"
                              title="Record Handover"
                            >
                              <Store size={12} />
                              Handover
                            </button>
                          )}
                        </div>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Prepare Modal */}
      {selectedOrderForPrepare && (
        <PrepareOrderModal
          isOpen={true}
          order={selectedOrderForPrepare}
          onClose={() => setSelectedOrderForPrepare(null)}
          onSuccess={(updatedOrder, ticket) => {
            loadOrders();
            setSelectedOrderForQR(updatedOrder);
          }}
        />
      )}

      {/* QR Code Pass Modal */}
      {selectedOrderForQR && (
        <QRCodeModal
          isOpen={true}
          order={selectedOrderForQR}
          onClose={() => setSelectedOrderForQR(null)}
        />
      )}

      {/* Record Handover Modal */}
      {selectedOrderForHandover && (
        <RecordCollectionModal
          isOpen={true}
          order={selectedOrderForHandover}
          onClose={() => setSelectedOrderForHandover(null)}
          onSuccess={() => loadOrders()}
        />
      )}

    </div>
  );
};
