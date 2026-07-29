import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { purchasingService, supplierService, productService } from "../../services/api";
import { PurchaseOrder, Supplier, Product } from "../../types";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../components/Layout";
import { 
  ShoppingBag, 
  PlusCircle, 
  Search, 
  CheckCircle2, 
  Clock, 
  Printer, 
  Trash2, 
  Plus,
  Building,
  Package,
  Calendar,
  FileText
} from "lucide-react";
import { UnifiedDocumentModal } from "../../components/UnifiedDocumentModal";

export const OrderBookPage: React.FC = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState("");
  const [notes, setNotes] = useState("");

  // Line items state
  const [orderItems, setOrderItems] = useState<Array<{ productId: string; quantity: number; unitCost: number }>>([]);
  const [newItemProductId, setNewItemProductId] = useState("");
  const [newItemQty, setNewItemQty] = useState(1);
  const [newItemCost, setNewItemCost] = useState(0);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["purchaseOrders"],
    queryFn: purchasingService.getOrders,
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ["suppliers"],
    queryFn: supplierService.getAll,
  });

  const { data: productsData } = useQuery({
    queryKey: ["products"],
    queryFn: () => productService.getAll(),
  });
  const products = productsData?.products || [];

  const createMutation = useMutation({
    mutationFn: purchasingService.createOrder,
    onSuccess: (po) => {
      queryClient.invalidateQueries({ queryKey: ["purchaseOrders"] });
      addToast(`Purchase Order ${po.poNumber} created successfully!`, "success");
      setIsCreateModalOpen(false);
      resetForm();
    },
    onError: (err: any) => {
      addToast(err?.response?.data?.error || "Failed to create Purchase Order", "error");
    }
  });

  const approveMutation = useMutation({
    mutationFn: purchasingService.approveOrder,
    onSuccess: (po) => {
      queryClient.invalidateQueries({ queryKey: ["purchaseOrders"] });
      addToast(`Purchase Order ${po.poNumber} approved!`, "success");
    },
    onError: (err: any) => {
      addToast(err?.response?.data?.error || "Failed to approve Purchase Order", "error");
    }
  });

  const resetForm = () => {
    setSelectedSupplierId("");
    setExpectedDeliveryDate("");
    setNotes("");
    setOrderItems([]);
    setNewItemProductId("");
    setNewItemQty(1);
    setNewItemCost(0);
  };

  const handleProductSelect = (pId: string) => {
    setNewItemProductId(pId);
    const prod = products.find(p => p.id === pId);
    if (prod) {
      setNewItemCost(prod.costPrice || prod.sellingPrice || 0);
    }
  };

  const handleAddLineItem = () => {
    if (!newItemProductId) {
      addToast("Please select a product to add", "warning");
      return;
    }
    if (newItemQty <= 0) {
      addToast("Quantity must be greater than zero", "warning");
      return;
    }

    setOrderItems(prev => [
      ...prev,
      { productId: newItemProductId, quantity: newItemQty, unitCost: newItemCost }
    ]);

    setNewItemProductId("");
    setNewItemQty(1);
    setNewItemCost(0);
  };

  const handleRemoveLineItem = (index: number) => {
    setOrderItems(prev => prev.filter((_, i) => i !== index));
  };

  const calculateTotal = () => {
    return orderItems.reduce((sum, item) => sum + (item.quantity * item.unitCost), 0);
  };

  const handleCreateOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplierId) {
      addToast("Please select a supplier", "warning");
      return;
    }
    if (orderItems.length === 0) {
      addToast("Please add at least one line item to the order", "warning");
      return;
    }

    createMutation.mutate({
      supplierId: selectedSupplierId,
      expectedDeliveryDate: expectedDeliveryDate || undefined,
      items: orderItems,
      notes
    });
  };

  const filteredOrders = orders.filter((po) => {
    const matchesSearch = 
      po.poNumber.toLowerCase().includes(search.toLowerCase()) ||
      po.supplierName.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "All" || po.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const [selectedPoForPrint, setSelectedPoForPrint] = useState<PurchaseOrder | null>(null);

  const handlePrintPO = (po: PurchaseOrder) => {
    setSelectedPoForPrint(po);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Purchase Order Book</h1>
            <p className="text-sm text-slate-500">Serialized procurement control, draft approval workflows, and supplier line items.</p>
          </div>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-sm transition-colors shadow-sm"
        >
          <PlusCircle className="w-4 h-4" />
          Create Purchase Order
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search PO #, supplier..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs font-semibold text-slate-500">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-slate-200 rounded-xl text-xs px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="All">All Statuses</option>
            <option value="Draft">Draft</option>
            <option value="Approved">Approved</option>
            <option value="Partially Received">Partially Received</option>
            <option value="Fulfilled">Fulfilled</option>
          </select>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400 text-sm">Loading purchase orders...</div>
        ) : filteredOrders.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">No purchase orders found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 text-xs font-semibold">
                <tr>
                  <th className="py-3 px-4">PO Serial #</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Supplier / Vendor</th>
                  <th className="py-3 px-4 text-center">Items Count</th>
                  <th className="py-3 px-4 text-right">Total Cost</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-xs">
                {filteredOrders.map((po) => (
                  <tr key={po.id} className="hover:bg-slate-50/80">
                    <td className="py-3 px-4 font-bold text-blue-700">{po.poNumber}</td>
                    <td className="py-3 px-4 text-slate-600">{po.date}</td>
                    <td className="py-3 px-4 font-sans font-semibold text-slate-800">{po.supplierName}</td>
                    <td className="py-3 px-4 text-center font-sans font-medium text-slate-600">
                      {po.items.length} SKUs
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900 font-mono">
                      ${po.totalAmount.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-sans font-bold px-2.5 py-0.5 rounded-full ${
                        po.status === "Approved"
                          ? "bg-blue-50 text-blue-700 border border-blue-200"
                          : po.status === "Fulfilled"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : po.status === "Partially Received"
                          ? "bg-amber-50 text-amber-700 border border-amber-200"
                          : "bg-slate-100 text-slate-600 border border-slate-200"
                      }`}>
                        {po.status === "Draft" && <Clock className="w-3 h-3 text-slate-400" />}
                        {po.status === "Approved" && <CheckCircle2 className="w-3 h-3 text-blue-500" />}
                        {po.status === "Fulfilled" && <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
                        {po.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2 font-sans">
                        <button
                          onClick={() => handlePrintPO(po)}
                          title="Print PO"
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Printer className="w-4 h-4" />
                        </button>

                        {po.status === "Draft" && (user?.role === "Principal Admin" || user?.role === "Inventory Manager") && (
                          <button
                            onClick={() => approveMutation.mutate(po.id)}
                            disabled={approveMutation.isPending}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors"
                          >
                            Approve
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Purchase Order Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full p-6 space-y-4 border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base">New Serialized Purchase Order</h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleCreateOrder} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Select Supplier *</label>
                  <select
                    required
                    value={selectedSupplierId}
                    onChange={(e) => setSelectedSupplierId(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Vendor...</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>{s.name} ({s.companyName || "Supplier"})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Expected Delivery Date</label>
                  <input
                    type="date"
                    value={expectedDeliveryDate}
                    onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Add Line Item Box */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600 block">Add Line Item</span>
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                  <div className="sm:col-span-5">
                    <select
                      value={newItemProductId}
                      onChange={(e) => handleProductSelect(e.target.value)}
                      className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs bg-white"
                    >
                      <option value="">Select Product...</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-3">
                    <input
                      type="number"
                      min={1}
                      placeholder="Qty"
                      value={newItemQty}
                      onChange={(e) => setNewItemQty(Number(e.target.value))}
                      className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs bg-white"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Unit Cost ($)"
                      value={newItemCost}
                      onChange={(e) => setNewItemCost(Number(e.target.value))}
                      className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs bg-white"
                    />
                  </div>

                  <div className="sm:col-span-1">
                    <button
                      type="button"
                      onClick={handleAddLineItem}
                      className="w-full h-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center justify-center py-1.5"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Added Line Items Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-600 font-semibold">
                    <tr>
                      <th className="py-2 px-3">Product Name</th>
                      <th className="py-2 px-3 text-center">Qty</th>
                      <th className="py-2 px-3 text-right">Unit Cost</th>
                      <th className="py-2 px-3 text-right">Subtotal</th>
                      <th className="py-2 px-3 text-center">Remove</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {orderItems.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-4 text-center text-slate-400 font-sans">
                          No items added yet. Use the control above to append SKUs.
                        </td>
                      </tr>
                    ) : (
                      orderItems.map((item, idx) => {
                        const prod = products.find(p => p.id === item.productId);
                        const subtotal = item.quantity * item.unitCost;
                        return (
                          <tr key={idx}>
                            <td className="py-2 px-3 font-sans font-medium text-slate-800">
                              {prod?.name || item.productId}
                            </td>
                            <td className="py-2 px-3 text-center font-bold">{item.quantity}</td>
                            <td className="py-2 px-3 text-right">${item.unitCost.toFixed(2)}</td>
                            <td className="py-2 px-3 text-right font-bold text-slate-900">${subtotal.toFixed(2)}</td>
                            <td className="py-2 px-3 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveLineItem(idx)}
                                className="text-slate-400 hover:text-red-600"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-sm font-semibold text-slate-600">Total Purchase Value:</span>
                <span className="text-xl font-extrabold text-slate-900 font-mono">
                  ${calculateTotal().toFixed(2)}
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Notes / Shipping Terms</label>
                <textarea
                  rows={2}
                  placeholder="Special instructions or delivery notes..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
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
                  disabled={createMutation.isPending}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm"
                >
                  {createMutation.isPending ? "Creating..." : "Save Draft PO"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Unified Branded Document Modal */}
      <UnifiedDocumentModal
        isOpen={!!selectedPoForPrint}
        onClose={() => setSelectedPoForPrint(null)}
        document={selectedPoForPrint ? { type: "po", data: selectedPoForPrint } : null}
      />
    </div>
  );
};
