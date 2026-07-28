import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { productService } from "../services/api";
import { Product } from "../types";
import { useToast } from "../components/Layout";
import { 
  Plus, 
  Search, 
  Trash2, 
  Edit3, 
  Loader2, 
  Package, 
  AlertTriangle,
  ChevronUp,
  ChevronDown,
  Info,
  Sliders,
  Check,
  X,
  CheckSquare,
  Barcode,
  Camera,
  Wand2,
  ScanLine
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { BarcodeScannerModal } from "../components/BarcodeScannerModal";
import { SkuGeneratorModal } from "../components/SkuGeneratorModal";
import { DocumentOcrModal } from "../components/DocumentOcrModal";

const productSchema = z.object({
  name: z.string().min(3, { message: "Product Name must be at least 3 characters." }),
  category: z.string().min(2, { message: "Category is required." }),
  costPrice: z.coerce.number().min(0.01, { message: "Cost price must be positive." }),
  sellingPrice: z.coerce.number().min(0.01, { message: "Selling price must be positive." }),
  quantity: z.coerce.number().int().min(0, { message: "Quantity must be at least 0." }),
  minStock: z.coerce.number().int().min(0, { message: "Min stock must be at least 0." }),
  location: z.string().default("Storage Area"),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  brand: z.string().optional(),
});

type ProductFormValues = z.infer<typeof productSchema>;

export const Products: React.FC = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sortBy, setSortBy] = useState("name");
  const [order, setOrder] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const itemsPerPage = 8;

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Multi-select state
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
  const [isBulkStockOpen, setIsBulkStockOpen] = useState(false);
  const [bulkStockMode, setBulkStockMode] = useState<"set" | "add" | "minStock">("add");
  const [bulkStockValue, setBulkStockValue] = useState<number>(10);

  const { data, isLoading } = useQuery({
    queryKey: ["products", search, statusFilter, sortBy, order],
    queryFn: () => productService.getAll({ search, status: statusFilter, sortBy, order }),
  });

  const productsList = data?.products || [];
  const valuation = data?.valuation;

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<any>({
    resolver: zodResolver(productSchema) as any,
  });

  const createMutation = useMutation({
    mutationFn: productService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-activity"] });
      showToast("Product added successfully to inventory catalog!", "success");
      handleCloseForm();
    },
    onError: (err: any) => {
      showToast(err.response?.data?.error || "Error cataloguing product", "error");
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<Product> }) => productService.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      showToast("Product updated successfully!", "success");
      handleCloseForm();
    },
    onError: (err: any) => {
      showToast(err.response?.data?.error || "Error updating product details", "error");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: productService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-activity"] });
      showToast("Product deleted from current branch catalog", "success");
      setDeleteId(null);
    },
    onError: (err: any) => {
      showToast(err.response?.data?.error || "Failed to remove product from catalog", "error");
    }
  });

  const batchDeleteMutation = useMutation({
    mutationFn: (ids: string[]) => productService.batchDelete(ids),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-activity"] });
      showToast(`Successfully deleted ${res.deletedCount} products!`, "success");
      setSelectedProductIds([]);
      setIsBulkDeleteOpen(false);
    },
    onError: (err: any) => {
      showToast(err.response?.data?.error || "Failed to execute bulk deletion", "error");
    }
  });

  const batchStockMutation = useMutation({
    mutationFn: (data: { ids: string[]; mode: "set" | "add" | "minStock"; value: number }) => productService.batchUpdateStock(data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-activity"] });
      showToast(`Updated stock levels for ${res.updatedCount} items!`, "success");
      setSelectedProductIds([]);
      setIsBulkStockOpen(false);
    },
    onError: (err: any) => {
      showToast(err.response?.data?.error || "Failed to bulk update stock levels", "error");
    }
  });

  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isSkuGeneratorOpen, setIsSkuGeneratorOpen] = useState(false);
  const [isDocumentOcrOpen, setIsDocumentOcrOpen] = useState(false);

  const handleOpenAddForm = () => {
    setEditingProduct(null);
    reset({
      name: "",
      category: "Laptops",
      costPrice: 0,
      sellingPrice: 0,
      quantity: 5,
      minStock: 2,
      location: "",
      sku: "",
      barcode: "",
      brand: "",
    });
    setIsFormOpen(true);
  };

  const handleOpenAddWithBarcode = (code: string) => {
    setEditingProduct(null);
    reset({
      name: "",
      category: "Peripherals",
      costPrice: 0,
      sellingPrice: 0,
      quantity: 5,
      minStock: 2,
      location: "General Aisle",
      sku: code,
      barcode: code,
      brand: "",
    });
    setIsFormOpen(true);
    showToast(`Pre-filled barcode ${code} in new product registration form`, "info");
  };

  const handleOpenEditForm = (prod: Product) => {
    setEditingProduct(prod);
    reset({
      name: prod.name,
      category: prod.category,
      costPrice: prod.costPrice,
      sellingPrice: prod.sellingPrice,
      quantity: prod.quantity,
      minStock: prod.minStock,
      location: prod.location,
      sku: prod.sku || "",
      barcode: prod.barcode || "",
      brand: prod.brand || "",
    });
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingProduct(null);
    reset();
  };

  const handleFormSubmit = (values: ProductFormValues) => {
    if (editingProduct) {
      updateMutation.mutate({ id: editingProduct.id, payload: values });
    } else {
      createMutation.mutate(values);
    }
  };

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setOrder(order === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setOrder("asc");
    }
    setPage(1);
  };

  const totalItems = productsList.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const startIndex = (page - 1) * itemsPerPage;
  const paginatedProducts = productsList.slice(startIndex, startIndex + itemsPerPage);

  // Multi-select helpers
  const allPaginatedSelected = paginatedProducts.length > 0 && paginatedProducts.every((p) => selectedProductIds.includes(p.id));
  const somePaginatedSelected = paginatedProducts.some((p) => selectedProductIds.includes(p.id)) && !allPaginatedSelected;

  const handleToggleSelectAllPaginated = () => {
    if (allPaginatedSelected) {
      setSelectedProductIds((prev) => prev.filter((id) => !paginatedProducts.some((p) => p.id === id)));
    } else {
      const pageIds = paginatedProducts.map((p) => p.id);
      setSelectedProductIds((prev) => Array.from(new Set([...prev, ...pageIds])));
    }
  };

  const handleToggleSelectProduct = (id: string) => {
    setSelectedProductIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSelectAllFiltered = () => {
    setSelectedProductIds(productsList.map((p) => p.id));
  };

  return (
    <div className="space-y-6">
      
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Product Catalog</h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage electronics inventory listings, storage slots, and profit-margins.
          </p>
        </div>
        
        <div className="flex items-center gap-2.5 self-start sm:self-center">
          <button
            type="button"
            onClick={() => setIsDocumentOcrOpen(true)}
            id="btn-scan-document-products"
            className="flex items-center gap-2 px-3.5 py-2.5 bg-blue-50 border border-blue-200 hover:bg-blue-100 text-blue-700 text-sm font-bold rounded-xl shadow-xs transition-all"
          >
            <ScanLine size={16} className="text-blue-600" />
            <span>Scan Document Photo</span>
          </button>

          <button
            type="button"
            onClick={() => setIsSkuGeneratorOpen(true)}
            id="btn-sku-generator-products"
            className="flex items-center gap-2 px-3.5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 text-sm font-bold rounded-xl shadow-xs transition-all"
          >
            <Wand2 size={16} className="text-blue-600" />
            <span>SKU Generator</span>
          </button>

          <button
            type="button"
            onClick={() => setIsScannerOpen(true)}
            id="btn-scan-barcode-products"
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold rounded-xl shadow-md transition-all"
          >
            <Barcode size={18} className="text-blue-400" />
            <span>Scan Barcode</span>
          </button>

          <button
            onClick={handleOpenAddForm}
            id="btn-add-product"
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-md shadow-blue-500/25 transition-all"
          >
            <Plus size={16} />
            <span>Add Product</span>
          </button>
        </div>
      </div>

      {valuation && (
        <div className="bg-slate-900 text-white rounded-2xl p-5 border border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-6 shadow-xl">
          <div className="flex flex-col">
            <span className="text-xs text-slate-400 font-semibold tracking-wider uppercase">Catalog Valuation (Cost)</span>
            <span className="text-xl font-bold mt-1 font-mono text-slate-100">${valuation.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            <span className="text-[10px] text-slate-500 mt-0.5">Asset purchase total</span>
          </div>
          <div className="flex flex-col border-t border-slate-800 pt-4 md:border-t-0 md:pt-0 md:border-x md:border-slate-800 md:px-6">
            <span className="text-xs text-slate-400 font-semibold tracking-wider uppercase">Retail Valuation (Selling)</span>
            <span className="text-xl font-bold mt-1 font-mono text-slate-100">${valuation.totalSelling.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            <span className="text-[10px] text-slate-500 mt-0.5">Asset sell value</span>
          </div>
          <div className="flex flex-col pt-4 md:pt-0">
            <span className="text-xs text-slate-400 font-semibold tracking-wider uppercase">Projected Profit Margin</span>
            <span className="text-xl font-bold mt-1 font-mono text-emerald-400">${valuation.expectedProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            <span className="text-[10px] text-zinc-500 mt-0.5">Pre-tax surplus</span>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:max-w-md">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 pointer-events-none">
            <Search size={16} />
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-10 py-2.5 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500 transition-all font-medium"
            placeholder="Search by name, SKU, barcode, brand or category..."
          />
          <button
            type="button"
            onClick={() => setIsScannerOpen(true)}
            title="Scan barcode with camera"
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-blue-600 transition-colors"
          >
            <Camera size={18} />
          </button>
        </div>

        <div className="flex flex-wrap gap-3 items-center w-full md:w-auto">
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 p-1 rounded-xl">
            {["All", "In Stock", "Low Stock", "Out Of Stock"].map((status) => (
              <button
                key={status}
                onClick={() => { setStatusFilter(status); setPage(1); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  statusFilter === status 
                    ? "bg-slate-900 text-white shadow-xs" 
                    : "text-slate-600 hover:text-slate-905"
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Multi-Select Bulk Action Banner */}
      <AnimatePresence>
        {selectedProductIds.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="bg-slate-900 text-white p-3.5 px-5 rounded-2xl shadow-xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3"
          >
            <div className="flex flex-wrap items-center gap-3">
              <span className="bg-blue-600 text-white font-mono font-black text-xs px-2.5 py-1 rounded-lg flex items-center gap-1.5 shadow-xs">
                <CheckSquare size={13} />
                <span>{selectedProductIds.length} Selected</span>
              </span>
              <span className="text-xs text-slate-300 font-medium">
                Bulk actions available for selected items
              </span>
              {selectedProductIds.length < productsList.length && (
                <button
                  onClick={handleSelectAllFiltered}
                  className="text-xs font-bold text-blue-400 hover:text-blue-300 underline cursor-pointer"
                >
                  Select all {productsList.length} matching products
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsBulkStockOpen(true)}
                id="btn-bulk-stock-update"
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
              >
                <Sliders size={14} />
                <span>Update Stock Levels</span>
              </button>

              <button
                onClick={() => setIsBulkDeleteOpen(true)}
                id="btn-bulk-delete"
                className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
              >
                <Trash2 size={14} />
                <span>Delete ({selectedProductIds.length})</span>
              </button>

              <button
                onClick={() => setSelectedProductIds([])}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                title="Clear selection"
              >
                <X size={16} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-white rounded-2xl border border-slate-200/95 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="animate-spin text-blue-600" size={32} />
            <p className="text-slate-400 text-sm font-semibold">Loading product database catalog...</p>
          </div>
        ) : paginatedProducts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-200/80 text-xs font-bold text-slate-500 uppercase font-mono tracking-wider">
                  <th className="py-4 px-4 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={allPaginatedSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = somePaginatedSelected;
                      }}
                      onChange={handleToggleSelectAllPaginated}
                      className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer accent-blue-600"
                      title="Select / Deselect page items"
                      id="checkbox-select-all"
                    />
                  </th>
                  <th className="py-4 px-6 cursor-pointer hover:text-slate-900" onClick={() => handleSort("name")}>
                    <div className="flex items-center gap-1">
                      Product {sortBy === "name" && (order === "asc" ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                    </div>
                  </th>
                  <th className="py-4 px-6 cursor-pointer hover:text-slate-900" onClick={() => handleSort("category")}>
                    <div className="flex items-center gap-1">
                      Category {sortBy === "category" && (order === "asc" ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                    </div>
                  </th>
                  <th className="py-4 px-6 text-right cursor-pointer hover:text-slate-900" onClick={() => handleSort("costPrice")}>
                    <div className="flex items-center gap-1 justify-end">
                      Cost {sortBy === "costPrice" && (order === "asc" ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                    </div>
                  </th>
                  <th className="py-4 px-6 text-right cursor-pointer hover:text-slate-900" onClick={() => handleSort("sellingPrice")}>
                    <div className="flex items-center gap-1 justify-end">
                      Retail {sortBy === "sellingPrice" && (order === "asc" ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                    </div>
                  </th>
                  <th className="py-4 px-6 text-right cursor-pointer hover:text-slate-900" onClick={() => handleSort("quantity")}>
                    <div className="flex items-center gap-1 justify-end">
                      Stock {sortBy === "quantity" && (order === "asc" ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                    </div>
                  </th>
                  <th className="py-4 px-6 text-center">Status</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-700 font-medium whitespace-nowrap">
                {paginatedProducts.map((p) => {
                  const isSelected = selectedProductIds.includes(p.id);
                  return (
                    <tr 
                      key={p.id} 
                      className={`transition-colors ${isSelected ? "bg-blue-50/70" : "hover:bg-slate-50/50"}`}
                    >
                      <td className="py-4 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectProduct(p.id)}
                          className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer accent-blue-600"
                          id={`checkbox-select-${p.id}`}
                        />
                      </td>
                      <td className="py-4 px-6">
                      <div className="font-semibold text-slate-900 max-w-xs sm:max-w-md truncate" title={p.name}>
                        {p.name}
                      </div>
                      <div className="text-slate-400 text-xs mt-0.5 flex items-center gap-1">
                        <span className="font-semibold text-[10px] bg-slate-100 px-1 py-0.5 rounded-sm">SLOT:</span>
                        <span className="font-mono">{p.location || "General Shelf"}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-slate-500 font-mono text-xs">{p.category}</td>
                    <td className="py-4 px-6 text-right font-mono">${p.costPrice.toFixed(2)}</td>
                    <td className="py-4 px-6 text-right font-mono text-slate-900 font-bold">${p.sellingPrice.toFixed(2)}</td>
                    <td className="py-4 px-6 text-right font-mono">
                      <span>{p.quantity}</span>
                      <span className="text-xs text-slate-400 block mt-0.5">Min: {p.minStock}</span>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black ${
                        p.status === "In Stock" 
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-100" 
                          : p.status === "Low Stock" 
                          ? "bg-amber-50 text-amber-700 border border-amber-100" 
                          : "bg-rose-50 text-rose-700 border border-rose-100"
                      }`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${
                          p.status === "In Stock" ? "bg-emerald-500" : p.status === "Low Stock" ? "bg-amber-500" : "bg-rose-500"
                        }`}></span>
                        {p.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenEditForm(p)}
                          className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
                          title="Edit Product"
                          id={`btn-edit-${p.id}`}
                        >
                          <Edit3 size={15} />
                        </button>
                        <button
                          onClick={() => setDeleteId(p.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                          title="Delete Product"
                          id={`btn-delete-${p.id}`}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
            <Package size={40} className="stroke-1 text-slate-300" />
            <p className="text-sm font-semibold">No products found matching your search</p>
            <button 
              onClick={() => { setSearch(""); setStatusFilter("All"); }}
              className="text-xs font-bold text-blue-600 hover:underline"
            >
              Clear filters
            </button>
          </div>
        )}

        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">
              Showing <span className="font-semibold text-slate-700">{startIndex + 1}</span> to <span className="font-semibold text-slate-700">{Math.min(startIndex + itemsPerPage, totalItems)}</span> of <span className="font-bold text-slate-700">{totalItems}</span> matching products
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(p - 1, 1))}
                disabled={page === 1}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold bg-white disabled:opacity-40 hover:bg-slate-50 transition-colors"
                id="btn-page-prev"
              >
                Previous
              </button>
              <span className="text-xs font-bold text-slate-700 font-mono">Page {page} of {totalPages}</span>
              <button
                onClick={() => setPage(p => Math.min(p + 1, totalPages))}
                disabled={page === totalPages}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold bg-white disabled:opacity-40 hover:bg-slate-50 transition-colors"
                id="btn-page-next"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {isFormOpen && (
          <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-slate-150 bg-slate-50 flex items-center justify-between">
                <h3 className="font-black text-slate-900 tracking-tight text-lg">
                  {editingProduct ? "Modify Product Listing" : "Catalogue New Product"}
                </h3>
                <button onClick={handleCloseForm} className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              <form onSubmit={handleSubmit(handleFormSubmit)} className="p-6 space-y-4">
                
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Product Display Name</label>
                  <input
                    type="text"
                    {...register("name")}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500 font-semibold"
                    placeholder="e.g. Asus ROG Strix G16 Wireless Adapter"
                  />
                  {errors.name && <p className="text-xs text-rose-500 mt-1 font-semibold">{errors.name.message}</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Category</label>
                    <select
                      {...register("category")}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-semibold focus:outline-hidden"
                    >
                      <option value="Laptops">Laptops</option>
                      <option value="Audio">Audio</option>
                      <option value="Displays">Displays</option>
                      <option value="Development Boards">Development Boards</option>
                      <option value="Power Accessories">Power Accessories</option>
                      <option value="Peripherals">Peripherals</option>
                      <option value="Storage">Storage</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Storage Location Slot</label>
                    <input
                      type="text"
                      {...register("location")}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500"
                      placeholder="e.g. Drawer 3A, Locker A"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">SKU / Stock Code</label>
                      <button
                        type="button"
                        onClick={() => setIsSkuGeneratorOpen(true)}
                        className="text-[11px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors"
                      >
                        <Wand2 size={12} />
                        <span>Auto-Generate</span>
                      </button>
                    </div>
                    <input
                      type="text"
                      {...register("sku")}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-mono focus:outline-hidden"
                      placeholder="e.g. APL-MBP16-01"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Barcode Tag Value</label>
                    <input
                      type="text"
                      {...register("barcode")}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-mono focus:outline-hidden"
                      placeholder="e.g. 7350053850012"
                    />
                  </div>
                </div>

                <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl flex gap-2 text-blue-900 text-xs font-medium">
                  <span className="shrink-0 text-blue-500">ℹ</span>
                  <p>VAT estimations (15%) are automatically determined, catalog cost and retail prices must exclude VAT.</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Wholesale Cost Price ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      {...register("costPrice")}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-hidden font-mono"
                      placeholder="0.00"
                    />
                    {errors.costPrice && <p className="text-xs text-rose-500 mt-1">{errors.costPrice.message}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1">Retail Selling Price ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      {...register("sellingPrice")}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-hidden font-mono"
                      placeholder="0.00"
                    />
                    {errors.sellingPrice && <p className="text-xs text-rose-500 mt-1">{errors.sellingPrice.message}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Opening Quantity</label>
                    <input
                      type="number"
                      {...register("quantity")}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-hidden font-mono"
                      placeholder="e.g. 10"
                    />
                    {errors.quantity && <p className="text-xs text-rose-500 mt-1">{errors.quantity.message}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Min Threshold Alert</label>
                    <input
                      type="number"
                      {...register("minStock")}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-hidden font-mono"
                      placeholder="e.g. 3"
                    />
                    {errors.minStock && <p className="text-xs text-rose-500 mt-1">{errors.minStock.message}</p>}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={handleCloseForm}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    id="btn-catalog-submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-lg shadow-md hover:shadow-lg transition-all"
                  >
                    {isSubmitting ? "Saving changes..." : editingProduct ? "Save Updates" : "Register Product"}
                  </button>
                </div>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleteId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl border border-slate-200 p-6 max-w-sm w-full text-center space-y-4"
            >
              <div className="mx-auto w-12 h-12 bg-rose-50 border border-rose-200 rounded-full flex items-center justify-center text-rose-500">
                <AlertTriangle size={24} />
              </div>
              <div className="space-y-1">
                <h4 className="font-black text-slate-900 text-lg">Remove listing?</h4>
                <p className="text-xs text-slate-500">This action permanently deletes the selected electronic hardware item from the VoltSync catalog database.</p>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteId(null)}
                  className="flex-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => deleteMutation.mutate(deleteId)}
                  id="btn-delete-confirm"
                  className="flex-1 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold rounded-lg shadow-md transition-colors cursor-pointer"
                >
                  Deauthorize
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Bulk Delete Confirmation Modal */}
      <AnimatePresence>
        {isBulkDeleteOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl border border-slate-200 p-6 max-w-md w-full space-y-4 shadow-2xl"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-center text-rose-600 shrink-0">
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <h4 className="font-black text-slate-900 text-lg">Bulk Delete Products?</h4>
                  <p className="text-xs text-slate-500">
                    Permanently remove <strong className="text-slate-900 font-mono">{selectedProductIds.length} selected products</strong> from inventory.
                  </p>
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl max-h-40 overflow-y-auto space-y-1 text-xs">
                <span className="text-[10px] uppercase font-mono font-bold text-slate-400 block mb-1">Target Products:</span>
                {productsList
                  .filter((p) => selectedProductIds.includes(p.id))
                  .map((p) => (
                    <div key={p.id} className="flex justify-between items-center text-slate-700 font-medium py-1 border-b border-slate-100 last:border-0">
                      <span className="truncate max-w-[220px] font-semibold text-slate-900">{p.name}</span>
                      <span className="font-mono text-slate-400 text-[11px]">{p.category}</span>
                    </div>
                  ))}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsBulkDeleteOpen(false)}
                  className="flex-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => batchDeleteMutation.mutate(selectedProductIds)}
                  disabled={batchDeleteMutation.isPending}
                  id="btn-confirm-bulk-delete"
                  className="flex-1 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold rounded-xl shadow-md transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  {batchDeleteMutation.isPending ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Trash2 size={16} />
                  )}
                  <span>Delete ({selectedProductIds.length})</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Bulk Stock Update Modal */}
      <AnimatePresence>
        {isBulkStockOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl border border-slate-200 p-6 max-w-md w-full space-y-5 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-blue-50 text-blue-600 border border-blue-200 rounded-xl">
                    <Sliders size={18} />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 text-base">Bulk Stock Update</h3>
                    <p className="text-xs text-slate-500">Applying inventory batch edit to {selectedProductIds.length} items</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsBulkStockOpen(false)} 
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Mode Selection */}
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Stock Update Operation</label>
                <div className="grid grid-cols-1 gap-2">
                  <label className={`p-3 rounded-xl border text-xs font-semibold flex items-center gap-3 cursor-pointer transition-all ${
                    bulkStockMode === "add" ? "bg-blue-50/80 border-blue-500 text-blue-900 shadow-xs" : "bg-slate-50 border-slate-200 text-slate-700"
                  }`}>
                    <input
                      type="radio"
                      name="stockMode"
                      checked={bulkStockMode === "add"}
                      onChange={() => setBulkStockMode("add")}
                      className="text-blue-600 accent-blue-600"
                    />
                    <div>
                      <span className="font-bold block">Add / Restock Quantity</span>
                      <span className="text-[11px] text-slate-500 font-normal">Adds specified units to current stock level</span>
                    </div>
                  </label>

                  <label className={`p-3 rounded-xl border text-xs font-semibold flex items-center gap-3 cursor-pointer transition-all ${
                    bulkStockMode === "set" ? "bg-blue-50/80 border-blue-500 text-blue-900 shadow-xs" : "bg-slate-50 border-slate-200 text-slate-700"
                  }`}>
                    <input
                      type="radio"
                      name="stockMode"
                      checked={bulkStockMode === "set"}
                      onChange={() => setBulkStockMode("set")}
                      className="text-blue-600 accent-blue-600"
                    />
                    <div>
                      <span className="font-bold block">Set Exact Stock Quantity</span>
                      <span className="text-[11px] text-slate-500 font-normal">Sets explicit stock count for all selected items</span>
                    </div>
                  </label>

                  <label className={`p-3 rounded-xl border text-xs font-semibold flex items-center gap-3 cursor-pointer transition-all ${
                    bulkStockMode === "minStock" ? "bg-blue-50/80 border-blue-500 text-blue-900 shadow-xs" : "bg-slate-50 border-slate-200 text-slate-700"
                  }`}>
                    <input
                      type="radio"
                      name="stockMode"
                      checked={bulkStockMode === "minStock"}
                      onChange={() => setBulkStockMode("minStock")}
                      className="text-blue-600 accent-blue-600"
                    />
                    <div>
                      <span className="font-bold block">Set Min Stock Threshold</span>
                      <span className="text-[11px] text-slate-500 font-normal">Updates minimum reorder warning trigger limit</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Value Input */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  {bulkStockMode === "add" ? "Units to Add (+)" : bulkStockMode === "set" ? "New Fixed Stock Count" : "New Min Stock Threshold"}
                </label>
                <input
                  type="number"
                  value={bulkStockValue}
                  onChange={(e) => setBulkStockValue(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-mono font-bold focus:outline-hidden focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500"
                  placeholder="10"
                  id="input-bulk-stock-value"
                />
              </div>

              {/* Preview List */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs">
                <span className="text-[10px] uppercase font-mono font-bold text-slate-400 block">Stock Update Preview:</span>
                <div className="max-h-28 overflow-y-auto space-y-1">
                  {productsList
                    .filter((p) => selectedProductIds.includes(p.id))
                    .map((p) => {
                      const newQty = bulkStockMode === "add" ? p.quantity + bulkStockValue : bulkStockMode === "set" ? bulkStockValue : p.quantity;
                      return (
                        <div key={p.id} className="flex justify-between items-center text-slate-700 text-[11px] font-mono">
                          <span className="truncate max-w-[200px] font-sans font-semibold text-slate-900">{p.name}</span>
                          <span className="shrink-0">
                            {p.quantity} → <strong className="text-blue-600 font-bold">{newQty} units</strong>
                          </span>
                        </div>
                      );
                    })}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsBulkStockOpen(false)}
                  className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  id="btn-confirm-bulk-stock-update"
                  onClick={() => batchStockMutation.mutate({ ids: selectedProductIds, mode: bulkStockMode, value: bulkStockValue })}
                  disabled={batchStockMutation.isPending}
                  className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-md transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  {batchStockMutation.isPending ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Check size={16} />
                  )}
                  <span>Apply Stock Batch</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Camera Barcode Scanner Modal */}
      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        products={productsList}
        onSelectProduct={(prod) => {
          handleOpenEditForm(prod);
        }}
        onScannedBarcode={(scannedCode) => {
          setSearch(scannedCode);
        }}
        onCreateProductWithBarcode={(scannedCode) => {
          handleOpenAddWithBarcode(scannedCode);
        }}
        title="Product Catalog Camera Scanner"
      />

      {/* Automated SKU Generator Modal */}
      <SkuGeneratorModal
        isOpen={isSkuGeneratorOpen}
        onClose={() => setIsSkuGeneratorOpen(false)}
        existingProducts={productsList}
        initialCategory={watch("category") || "Laptops"}
        initialBrand={watch("brand") || "Apple Inc."}
        onApplySku={(generatedSku, categoryChoice, brandChoice) => {
          if (!isFormOpen) {
            handleOpenAddForm();
          }
          setTimeout(() => {
            setValue("sku", generatedSku);
            if (categoryChoice) setValue("category", categoryChoice);
            if (brandChoice) setValue("brand", brandChoice);
          }, 50);
          showToast(`Applied generated SKU '${generatedSku}' to product form!`, "success");
        }}
      />

      {/* Automated Document OCR Extractor Modal */}
      <DocumentOcrModal
        isOpen={isDocumentOcrOpen}
        onClose={() => setIsDocumentOcrOpen(false)}
      />

    </div>
  );
};
