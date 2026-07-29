import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { purchasingService } from "../../services/api";
import { GoodsReceivedNote, PurchaseOrder } from "../../types";
import { useToast } from "../../components/Layout";
import { 
  Truck, 
  PlusCircle, 
  Search, 
  PackageCheck, 
  AlertTriangle, 
  CheckCircle2, 
  Printer, 
  FileText,
  Warehouse
} from "lucide-react";
import { UnifiedDocumentModal } from "../../components/UnifiedDocumentModal";

export const GoodsReceivedPage: React.FC = () => {
  const { addToast } = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // GRN Form State
  const [poId, setPoId] = useState("");
  const [deliveryNoteNumber, setDeliveryNoteNumber] = useState("");
  const [warehouseLocation, setWarehouseLocation] = useState("Main Warehouse Bay A");
  const [notes, setNotes] = useState("");

  const [receivedItems, setReceivedItems] = useState<Array<{
    productId: string;
    productName: string;
    sku: string;
    orderedQty: number;
    receivedQty: number;
    acceptedQty: number;
    rejectedQty: number;
    damagedQty: number;
  }>>([]);

  const { data: grnList = [], isLoading } = useQuery({
    queryKey: ["goodsReceived"],
    queryFn: purchasingService.getGoodsReceived,
  });

  const { data: orders = [] } = useQuery({
    queryKey: ["purchaseOrders"],
    queryFn: purchasingService.getOrders,
  });

  const approvedOrders = orders.filter(po => po.status === "Approved" || po.status === "Partially Received");

  const createGrnMutation = useMutation({
    mutationFn: purchasingService.createGoodsReceived,
    onSuccess: (grn) => {
      queryClient.invalidateQueries({ queryKey: ["goodsReceived"] });
      queryClient.invalidateQueries({ queryKey: ["purchaseOrders"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardSummary"] });
      addToast(`Goods Received Note ${grn.grnNumber} issued! Inventory restocked.`, "success");
      setIsCreateModalOpen(false);
      resetForm();
    },
    onError: (err: any) => {
      addToast(err?.response?.data?.error || "Failed to create GRN", "error");
    }
  });

  const resetForm = () => {
    setPoId("");
    setDeliveryNoteNumber("");
    setWarehouseLocation("Main Warehouse Bay A");
    setNotes("");
    setReceivedItems([]);
  };

  const handleSelectPO = (selectedPoId: string) => {
    setPoId(selectedPoId);
    const po = approvedOrders.find(o => o.id === selectedPoId);
    if (po) {
      const initialItems = po.items.map(item => ({
        productId: item.productId,
        productName: item.productName,
        sku: item.sku,
        orderedQty: item.quantity,
        receivedQty: item.quantity,
        acceptedQty: item.quantity,
        rejectedQty: 0,
        damagedQty: 0
      }));
      setReceivedItems(initialItems);
    } else {
      setReceivedItems([]);
    }
  };

  const handleItemQtyChange = (index: number, field: string, value: number) => {
    setReceivedItems(prev => prev.map((item, i) => {
      if (i === index) {
        const updated = { ...item, [field]: value };
        // Auto balance accepted = received - rejected - damaged
        if (field === "receivedQty" || field === "rejectedQty" || field === "damagedQty") {
          const rec = field === "receivedQty" ? value : updated.receivedQty;
          const rej = field === "rejectedQty" ? value : updated.rejectedQty;
          const dam = field === "damagedQty" ? value : updated.damagedQty;
          updated.acceptedQty = Math.max(0, rec - rej - dam);
        }
        return updated;
      }
      return item;
    }));
  };

  const handleCreateGRN = (e: React.FormEvent) => {
    e.preventDefault();
    if (!poId) {
      addToast("Please select a Purchase Order to receive against", "warning");
      return;
    }
    if (receivedItems.length === 0) {
      addToast("No items found on this purchase order", "warning");
      return;
    }

    createGrnMutation.mutate({
      poId,
      deliveryNoteNumber,
      warehouseLocation,
      items: receivedItems.map(i => ({
        productId: i.productId,
        receivedQty: i.receivedQty,
        acceptedQty: i.acceptedQty,
        rejectedQty: i.rejectedQty,
        damagedQty: i.damagedQty
      })),
      notes
    });
  };

  const filteredGrnList = grnList.filter((grn) => 
    grn.grnNumber.toLowerCase().includes(search.toLowerCase()) ||
    grn.poNumber.toLowerCase().includes(search.toLowerCase()) ||
    grn.supplierName.toLowerCase().includes(search.toLowerCase())
  );

  const [selectedGrnForPrint, setSelectedGrnForPrint] = useState<GoodsReceivedNote | null>(null);

  const handlePrintGRN = (grn: GoodsReceivedNote) => {
    setSelectedGrnForPrint(grn);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Goods Received Book (GRN)</h1>
            <p className="text-sm text-slate-500">Inspect stock deliveries, record accepted/damaged quantities, and restock inventory.</p>
          </div>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold text-sm transition-colors shadow-sm"
        >
          <PlusCircle className="w-4 h-4" />
          Log Goods Delivery (GRN)
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search GRN #, PO #, supplier..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* GRN List Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400 text-sm">Loading Goods Received Notes...</div>
        ) : filteredGrnList.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">No Goods Received Notes found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 text-xs font-semibold">
                <tr>
                  <th className="py-3 px-4">GRN Serial #</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">PO Ref Serial</th>
                  <th className="py-3 px-4">Supplier</th>
                  <th className="py-3 px-4">Warehouse</th>
                  <th className="py-3 px-4 text-center">Items Received</th>
                  <th className="py-3 px-4 text-center">Stock Restocked</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-xs">
                {filteredGrnList.map((grn) => {
                  const totalAccepted = grn.items.reduce((sum, i) => sum + i.acceptedQty, 0);
                  return (
                    <tr key={grn.id} className="hover:bg-slate-50/80">
                      <td className="py-3 px-4 font-bold text-emerald-700">{grn.grnNumber}</td>
                      <td className="py-3 px-4 text-slate-600">{grn.date}</td>
                      <td className="py-3 px-4 font-bold text-blue-700">{grn.poNumber}</td>
                      <td className="py-3 px-4 font-sans font-semibold text-slate-800">{grn.supplierName}</td>
                      <td className="py-3 px-4 font-sans text-slate-600">{grn.warehouseLocation || "Main Warehouse"}</td>
                      <td className="py-3 px-4 text-center font-sans font-medium">{grn.items.length} Lines</td>
                      <td className="py-3 px-4 text-center">
                        <span className="inline-flex items-center gap-1 text-[10px] font-sans font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                          +{totalAccepted} Units
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handlePrintGRN(grn)}
                          title="Print GRN Voucher"
                          className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create GRN Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full p-6 space-y-4 border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base">Issue Goods Received Note (GRN)</h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleCreateGRN} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Select Approved Purchase Order *</label>
                <select
                  required
                  value={poId}
                  onChange={(e) => handleSelectPO(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">Select Order...</option>
                  {approvedOrders.map((po) => (
                    <option key={po.id} value={po.id}>
                      {po.poNumber} — {po.supplierName} (${po.totalAmount})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Delivery Note / Waybill #</label>
                  <input
                    type="text"
                    placeholder="e.g. DN-88120"
                    value={deliveryNoteNumber}
                    onChange={(e) => setDeliveryNoteNumber(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Receiving Warehouse Bay</label>
                  <input
                    type="text"
                    placeholder="e.g. Main Warehouse Bay A"
                    value={warehouseLocation}
                    onChange={(e) => setWarehouseLocation(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Items Inspection Section */}
              {receivedItems.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-600 block">
                    Stock Delivery Inspection & Verification
                  </span>
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 text-slate-600 font-semibold">
                        <tr>
                          <th className="py-2.5 px-3">Product Name</th>
                          <th className="py-2.5 px-3 text-center">Ordered</th>
                          <th className="py-2.5 px-3 text-center">Received</th>
                          <th className="py-2.5 px-3 text-center text-emerald-700">Accepted</th>
                          <th className="py-2.5 px-3 text-center text-amber-700">Rejected</th>
                          <th className="py-2.5 px-3 text-center text-red-700">Damaged</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono">
                        {receivedItems.map((item, idx) => (
                          <tr key={idx}>
                            <td className="py-2.5 px-3 font-sans font-semibold text-slate-800">
                              {item.productName}
                              <span className="block text-[10px] font-mono text-slate-400 font-normal">{item.sku}</span>
                            </td>
                            <td className="py-2.5 px-3 text-center font-bold text-slate-600">{item.orderedQty}</td>
                            <td className="py-2.5 px-3 text-center">
                              <input
                                type="number"
                                min={0}
                                value={item.receivedQty}
                                onChange={(e) => handleItemQtyChange(idx, "receivedQty", Number(e.target.value))}
                                className="w-16 border border-slate-200 rounded-lg px-2 py-1 text-center text-xs font-bold"
                              />
                            </td>
                            <td className="py-2.5 px-3 text-center font-bold text-emerald-700 bg-emerald-50/50">
                              {item.acceptedQty}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <input
                                type="number"
                                min={0}
                                value={item.rejectedQty}
                                onChange={(e) => handleItemQtyChange(idx, "rejectedQty", Number(e.target.value))}
                                className="w-14 border border-slate-200 rounded-lg px-2 py-1 text-center text-xs text-amber-700"
                              />
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <input
                                type="number"
                                min={0}
                                value={item.damagedQty}
                                onChange={(e) => handleItemQtyChange(idx, "damagedQty", Number(e.target.value))}
                                className="w-14 border border-slate-200 rounded-lg px-2 py-1 text-center text-xs text-red-700"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Inspection Notes / Remarks</label>
                <textarea
                  rows={2}
                  placeholder="e.g. All cartons received intact. Quality verified."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500"
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
                  disabled={createGrnMutation.isPending || receivedItems.length === 0}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm disabled:opacity-50"
                >
                  {createGrnMutation.isPending ? "Restocking..." : "Post GRN & Restock Inventory"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Unified Branded Document Modal */}
      <UnifiedDocumentModal
        isOpen={!!selectedGrnForPrint}
        onClose={() => setSelectedGrnForPrint(null)}
        document={selectedGrnForPrint ? { type: "grn", data: selectedGrnForPrint } : null}
      />
    </div>
  );
};
