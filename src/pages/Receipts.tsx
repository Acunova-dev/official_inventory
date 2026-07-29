import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { receiptService, customerService, productService, settingsService } from "../services/api";
import { Receipt, Customer, Product } from "../types";
import { useToast } from "../components/Layout";
import { 
  Receipt as ReceiptIcon, 
  Plus, 
  Search, 
  Trash2, 
  Eye, 
  Loader2, 
  ArrowLeft,
  ChevronRight,
  Download,
  Printer,
  X,
  CreditCard,
  Building,
  Calendar,
  AlertCircle,
  TrendingDown
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { UnifiedDocumentModal } from "../components/UnifiedDocumentModal";
import { getMergedCompanySettings } from "../constants/defaultSettings";
import { normalizeDocument, exportDocumentToPdf } from "../utils/documentPrinter";

const receiptFormSchema = z.object({
  customerId: z.string().min(1, { message: "Please select a checkout customer account." }),
  paymentMethod: z.string().default("Cash"),
  bankAccountId: z.string().optional(),
  discountRate: z.coerce.number().min(0).max(0.5, { message: "Discount cannot exceed 50% for standard sales." }),
  enableTax: z.boolean().default(false),
  taxRate: z.coerce.number().min(0).max(100).default(0),
  items: z.array(
    z.object({
      productId: z.string().min(1, { message: "Select a component" }),
      quantity: z.coerce.number().int().min(1, { message: "Qty must be at least 1" }),
    })
  ).min(1, { message: "A receipt requires at least 1 hardware product." }),
});

type ReceiptFormValues = z.infer<typeof receiptFormSchema>;

export const Receipts: React.FC = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const [view, setView] = useState<"list" | "create" | "view">("list");
  const [selectedReceiptId, setSelectedReceiptId] = useState<string | null>(null);

  // PDF Preview Modal State
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [pdfPreviewData, setPdfPreviewData] = useState<{ type: "receipt"; data: Receipt } | null>(null);

  const openPdfPreviewModal = (rec: Receipt) => {
    setPdfPreviewData({
      type: "receipt",
      data: rec,
    });
    setIsPreviewModalOpen(true);
  };

  // Queries
  const { data: rawReceipts, isLoading: isReceiptsLoading } = useQuery({
    queryKey: ["receipts"],
    queryFn: receiptService.getAll,
  });
  const receipts = Array.isArray(rawReceipts) ? rawReceipts : [];

  const { data: rawCustomers } = useQuery({
    queryKey: ["customers-dropdown"],
    queryFn: () => customerService.getAll(),
  });
  const customers = Array.isArray(rawCustomers) ? rawCustomers : [];

  const { data: productsData } = useQuery({
    queryKey: ["products-dropdown"],
    queryFn: () => productService.getAll(),
  });
  const products = Array.isArray(productsData?.products) ? productsData.products : [];

  const { data: serverSettings } = useQuery({
    queryKey: ["company-settings"],
    queryFn: () => settingsService.get(),
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (payload: { customerId: string; items: Array<{ productId: string; quantity: number }>; discountRate: number; taxRate?: number; paymentMethod?: string; bankAccountId?: string }) => receiptService.create(payload),
    onSuccess: (newRec) => {
      queryClient.invalidateQueries({ queryKey: ["receipts"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["cashbook"] });
      queryClient.invalidateQueries({ queryKey: ["bankAccounts"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-activity"] });
      showToast(`Sale finalized & receipt ${newRec.receiptNumber} compiled & logged to ledger!`, "success");
      setView("list");
    },
    onError: (err: any) => {
      const msg = err.response?.data?.error || "Error executing checkout transaction";
      showToast(msg, "error");
    }
  });

  const reverseMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => receiptService.reverse(id, reason),
    onSuccess: (reversed) => {
      queryClient.invalidateQueries({ queryKey: ["receipts"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["cashbook"] });
      queryClient.invalidateQueries({ queryKey: ["bankAccounts"] });
      showToast(`Receipt ${reversed.receiptNumber} reversed and stock returned`, "success");
    },
    onError: (err: any) => {
      showToast(err.response?.data?.error || "Failed to reverse receipt", "error");
    }
  });

  // react hook form configuration
  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<any>({
    resolver: zodResolver(receiptFormSchema) as any,
    defaultValues: {
      customerId: "",
      discountRate: 0,
      enableTax: false,
      taxRate: 0,
      items: [{ productId: "", quantity: 1 }],
    }
  });

  useEffect(() => {
    if (serverSettings) {
      const isTaxOn = serverSettings.enableVat ?? false;
      const defaultRate = serverSettings.taxRate !== undefined ? serverSettings.taxRate : 0;
      setValue("enableTax", isTaxOn);
      setValue("taxRate", defaultRate);
    }
  }, [serverSettings, setValue]);

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items",
  });

  const formItems = watch("items");
  const formDiscountRate = watch("discountRate") || 0;
  const formEnableTax = watch("enableTax");
  const formTaxRateInput = watch("taxRate") || 0;
  const effectiveFormTaxRate = formEnableTax ? (formTaxRateInput > 1 ? formTaxRateInput / 100 : formTaxRateInput) : 0;

  // Live total calculations calculated on system backend
  const { data: calculationPreview } = useQuery({
    queryKey: ["receipt-preview", formItems, formDiscountRate, effectiveFormTaxRate],
    queryFn: () => receiptService.calculate({ items: formItems, discountRate: formDiscountRate, taxRate: effectiveFormTaxRate }),
    enabled: formItems.length > 0 && formItems.every(i => i.productId && i.quantity > 0),
  });

  const selectedReceipt = receipts.find(r => r.id === selectedReceiptId);

  const checkoutReceipt = (values: any) => {
    const isTaxOn = values.enableTax;
    let tr = 0;
    if (isTaxOn) {
      const input = values.taxRate || 0;
      tr = input > 1 ? input / 100 : input;
    }
    createMutation.mutate({
      customerId: values.customerId,
      paymentMethod: values.paymentMethod || "Cash",
      bankAccountId: values.bankAccountId,
      items: values.items,
      discountRate: values.discountRate,
      taxRate: tr
    });
  };

  // PDF receipt document downloader
  const downloadSimulatedPdf = async (rec: Receipt) => {
    try {
      showToast("Generating official receipt PDF...", "info");
      const companySettings = getMergedCompanySettings(serverSettings);
      const normDoc = normalizeDocument("receipt", rec, companySettings.currency || "USD");
      const fileName = `${companySettings.companyName.replace(/\s+/g, '_')}_RECEIPT_${rec.receiptNumber}.pdf`;
      await exportDocumentToPdf(normDoc, companySettings, fileName, { paperSize: "a4", orientation: "portrait" });
      showToast("Receipt PDF downloaded successfully!", "success");
    } catch (err: any) {
      console.error("Failed to generate receipt PDF:", err);
      showToast("Failed to generate receipt PDF.", "error");
    }
  };

  const printDocument = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      
      {/* 1. RECEIPTS INDEX TABLE */}
      {view === "list" && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Receipt Records</h1>
              <p className="text-sm text-slate-500 mt-1">
                Process walk-in transactions, generate professional paid receipts, and review finalized billings.
              </p>
            </div>
            <button
              onClick={() => { setView("create"); }}
              id="btn-manual-receipt"
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-950 text-white text-sm font-bold rounded-xl shadow-md transition-all uppercase tracking-wider text-xs"
            >
              <Plus size={15} />
              <span>Checkout Order</span>
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            {isReceiptsLoading ? (
              <div className="py-20 flex flex-col items-center justify-center gap-4 text-slate-400">
                <Loader2 className="animate-spin text-blue-600" size={32} />
                <p className="text-sm font-semibold">Retrieving terminal logs...</p>
              </div>
            ) : receipts.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-xs font-bold text-slate-500 uppercase font-mono tracking-wider border-b border-slate-200">
                      <th className="py-4 px-6">Receipt Number</th>
                      <th className="py-4 px-6">Customer Name</th>
                      <th className="py-4 px-6">Checkout Date</th>
                      <th className="py-4 px-6 text-right">Items purchased</th>
                      <th className="py-4 px-6 text-right">Paid Amount</th>
                      <th className="py-4 px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm font-medium whitespace-nowrap">
                    {receipts.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-4 px-6 font-bold text-blue-600 font-mono text-sm">{r.receiptNumber}</td>
                        <td className="py-4 px-6 text-slate-800">{r.customerName}</td>
                        <td className="py-4 px-6 text-slate-400 font-mono text-xs">{r.date}</td>
                        <td className="py-4 px-6 text-right text-slate-500 font-mono">{r.lines.length} categories</td>
                        <td className="py-4 px-6 text-right font-black text-slate-900 font-mono">${r.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        <td className="py-4 px-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => { setSelectedReceiptId(r.id); setView("view"); }}
                              className="p-1.5 rounded-lg text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-all font-bold text-xs inline-flex items-center gap-1.5 border border-slate-200 shadow-3xs cursor-pointer"
                              id={`btn-view-${r.id}`}
                              title="View Receipt Details"
                            >
                              <Eye size={13} />
                              <span>Details</span>
                            </button>
                            <button
                              onClick={() => openPdfPreviewModal(r)}
                              className="p-1.5 rounded-lg text-emerald-700 bg-emerald-50/80 hover:bg-emerald-600 hover:text-white transition-all font-bold text-xs inline-flex items-center gap-1.5 border border-emerald-200/80 shadow-3xs cursor-pointer"
                              id={`btn-pdf-preview-receipt-${r.id}`}
                              title="Preview Generated PDF Receipt & Print"
                            >
                              <Printer size={13} />
                              <span>PDF & Print</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
                <ReceiptIcon size={40} className="stroke-1 text-slate-300 animate-bounce" />
                <p className="text-sm font-semibold">No checkout transactions recorded today</p>
                <button onClick={() => setView("create")} className="text-xs font-bold text-blue-600 hover:underline">Launch sales terminal checkout</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. CREATE SALES TERMINAL TRANSACTION */}
      {view === "create" && (
        <div className="space-y-6 font-sans">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => { setView("list"); }}
              className="p-2 border border-slate-200 bg-white rounded-xl text-slate-500 hover:text-slate-905 transition-colors"
              title="Return to transactions list"
            >
              <ArrowLeft size={16} />
            </button>
            <div>
              <h1 className="text-xl font-black text-slate-950 tracking-tight">Checkout Order Terminal</h1>
              <p className="text-xs text-slate-400 mt-0.5 font-mono">Deducts quantity and updates stock metrics instantly on submit</p>
            </div>
          </div>

          <form onSubmit={handleSubmit(checkoutReceipt)} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            <div className="lg:col-span-2 space-y-6">
              
              {/* Customer selection */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-4 shadow-3xs">
                <div className="flex items-center gap-2 text-emerald-900 pb-3 border-b border-slate-100">
                  <span className="h-6 w-6 rounded-md bg-emerald-50 border border-emerald-100 font-bold font-mono text-xs flex items-center justify-center text-emerald-600">1</span>
                  <h3 className="font-bold text-slate-950 text-sm uppercase tracking-wider">Select Checkout Customer</h3>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Trade Contact Name</label>
                  <select
                    {...register("customerId")}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm font-semibold focus:outline-hidden"
                  >
                    <option value="">-- Choose Walk-in / Company Account --</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  {errors.customerId && <p className="text-xs text-rose-500 mt-1 font-semibold">{errors.customerId.message}</p>}
                </div>
              </div>

              {/* Products selections */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-4 shadow-3xs">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2 text-emerald-950">
                    <span className="h-6 w-6 rounded-md bg-emerald-50 border border-emerald-100 font-bold font-mono text-xs flex items-center justify-center text-emerald-600">2</span>
                    <h3 className="font-bold text-slate-950 text-sm uppercase tracking-wider">Hardware Cart Selection</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => append({ productId: "", quantity: 1 })}
                    className="flex items-center gap-1 text-xs font-bold text-emerald-600 hover:bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-100"
                    id="btn-add-receipt-line"
                  >
                    <Plus size={12} />
                    <span>Append Part</span>
                  </button>
                </div>

                {errors.items && <p className="text-xs text-rose-500 font-semibold">{errors.items.message}</p>}

                <div className="space-y-3">
                  {fields.map((field, index) => (
                    <div key={field.id} className="flex gap-4 items-center bg-slate-50/50 p-3 rounded-xl border border-slate-150 relative">
                      <div className="flex-1">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-0.5">Hardware Item Selection</label>
                        <select
                          {...register(`items.${index}.productId`, { required: true })}
                          className="w-full bg-white border border-slate-200 rounded-lg px-2 py-2 text-xs font-semibold focus:outline-hidden"
                        >
                          <option value="">-- Choose Stock --</option>
                          {products.map(p => (
                            <option key={p.id} value={p.id} disabled={p.quantity <= 0}>
                              {p.name} (${p.sellingPrice}) — {p.quantity} left
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="w-24">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-0.5">Quantity</label>
                        <input
                          type="number"
                          min="1"
                          {...register(`items.${index}.quantity`, { required: true, valueAsNumber: true })}
                          className="w-full bg-white border border-slate-200 rounded-lg px-2 py-2 text-xs text-center font-bold font-mono focus:outline-hidden"
                        />
                      </div>

                      {fields.length > 1 && (
                        <button
                          type="button"
                          onClick={() => remove(index)}
                          className="mt-4 p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Apply Immediate Cash Discount (0 - 0.5)</label>
                  <input
                    type="number"
                    step="0.05"
                    placeholder="e.g. 0.05 for 5%"
                    {...register("discountRate", { valueAsNumber: true })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs font-mono"
                  />
                  {errors.discountRate && <p className="text-xs text-rose-500 mt-1">{errors.discountRate.message}</p>}
                </div>
              </div>
            </div>

            {/* Authorization Calculations Block */}
            <div className="space-y-6">
              <div className="bg-slate-900 text-white rounded-2xl p-6 border border-slate-800 space-y-6 sticky top-24 shadow-xl">
                <div className="pb-3 border-b border-slate-800">
                  <h3 className="font-extrabold text-sm uppercase tracking-widest text-slate-300">SALE BILL DETAILS</h3>
                  <p className="text-[10px] text-slate-500 mt-0.5">Arithmetic resolved by terminal controller</p>
                </div>

                {calculationPreview ? (
                  <div className="space-y-4 font-mono text-xs">
                    <div className="space-y-2 border-b border-slate-800 pb-4 text-slate-300 font-medium">
                      {calculationPreview.lines.map((l: any, idx: number) => (
                        <div key={idx} className="flex justify-between gap-4">
                          <span className="truncate max-w-[150px]">{l.productName}</span>
                          <span className="text-slate-500">x{l.quantity}</span>
                          <span className="text-slate-100">${l.totalPrice.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-2 font-medium">
                      <div className="flex justify-between text-slate-400">
                        <span>Terminal Subtotal</span>
                        <span>${calculationPreview.subtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Terminal Cash Discount</span>
                        <span className="text-rose-400">-${calculationPreview.discountAmount.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Terminal VAT (15.0%)</span>
                        <span className="text-slate-300">+${calculationPreview.taxAmount.toFixed(2)}</span>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-800 flex justify-between items-center">
                      <span className="text-xs font-sans uppercase font-extrabold tracking-wider text-slate-400">Amt Paid Due</span>
                      <span className="text-2xl font-black font-mono text-teal-400">${calculationPreview.total.toFixed(2)}</span>
                    </div>
                  </div>
                ) : (
                  <div className="py-8 flex flex-col items-center justify-center text-center gap-2 text-slate-500">
                    <AlertCircle size={32} />
                    <p className="text-xs">Select active components to trigger terminal calculation engines.</p>
                  </div>
                )}

                <div className="flex flex-col gap-2 pt-2">
                  <button
                    type="submit"
                    id="btn-receipt-submit"
                    disabled={createMutation.isPending || !calculationPreview}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-sm font-bold text-white rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {createMutation.isPending ? "Executing transaction..." : "Deduct Stock & Issue Receipt"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setView("list")}
                    className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 font-bold rounded-xl transition-all border border-slate-705"
                  >
                    Discard Transaction
                  </button>
                </div>
              </div>
            </div>

          </form>
        </div>
      )}

      {/* 3. PAID RECEIPT PREVIEW SHEET */}
      {view === "view" && selectedReceipt && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <button
              onClick={() => { setView("list"); }}
              className="px-3 py-1.5 border border-slate-200 bg-white rounded-lg text-slate-700 hover:text-slate-905 text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <ArrowLeft size={14} />
              <span>Receipt Ledger</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={() => downloadSimulatedPdf(selectedReceipt)}
                className="px-3 py-1.5 border border-slate-200 bg-white text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all hover:bg-slate-50 cursor-pointer"
              >
                <Download size={14} />
                <span>Download Slip</span>
              </button>
              <button
                onClick={() => openPdfPreviewModal(selectedReceipt)}
                id="btn-preview-and-print-receipt"
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
              >
                <Printer size={14} />
                <span>Preview PDF & Print</span>
              </button>
            </div>
          </div>

          {/* Printable Thermal Receipt / Invoicing */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm max-w-2xl mx-auto p-6 sm:p-10 space-y-8 font-sans print:border-0 print:shadow-none print:p-0" id="receipt-print-area">
            
            <div className="text-center space-y-2 pb-6 border-b border-dashed border-slate-200">
              <div className="inline-flex items-center gap-1 bg-emerald-50 border border-emerald-100 uppercase font-black text-[10px] tracking-widest text-emerald-700 px-3 py-1 rounded-full">
                ★★★ OFFICIAL PAID TAX RECEIPT ★★★
              </div>
              <h2 className="text-2xl font-black text-slate-950 tracking-tight">Acu-invent Systems Corp</h2>
              <p className="text-xs text-slate-400 font-medium leading-relaxed">
                900 Technology Way, CA, 94301<br />
                Ph: +1-800-555-8800 | GST ID: CA-8892401-ACU
              </p>
            </div>

            <div className="grid grid-cols-2 text-xs font-mono font-medium text-slate-500 gap-4 py-2 border-b border-slate-100">
              <div className="space-y-1">
                <p>RECEIPT REF: <span className="font-bold text-slate-900">{selectedReceipt.receiptNumber}</span></p>
                <p>BUYER NAME: <span className="font-bold text-slate-900">{selectedReceipt.customerName}</span></p>
              </div>
              <div className="space-y-1 text-right">
                <p>TRANSACTION DATE: <span className="font-bold text-slate-900">{selectedReceipt.date}</span></p>
                <p>PAY SYSTEM: <span className="font-bold text-emerald-600">PAID FULL (CASH/WIRE)</span></p>
              </div>
            </div>

            {/* List Table */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">CHECKOUT PARTICULARS</span>
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 font-bold">
                    <th className="py-2">Item Part Name</th>
                    <th className="py-2 text-center">Qty</th>
                    <th className="py-2 text-right">Selling Rate</th>
                    <th className="py-2 text-right">Total Net</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-slate-800 font-medium">
                  {selectedReceipt.lines.map((l, index) => (
                    <tr key={index}>
                      <td className="py-3.5 font-sans font-semibold text-slate-950">{l.productName}</td>
                      <td className="py-3.5 text-center font-bold text-slate-900">{l.quantity}</td>
                      <td className="py-3.5 text-right">${l.unitPrice.toFixed(2)}</td>
                      <td className="py-3.5 text-right font-bold text-slate-950">${l.totalPrice.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Formula Summarry */}
            <div className="border-t border-dashed border-slate-200 pt-6 space-y-2 text-xs font-mono font-medium text-right max-w-sm ml-auto">
              <div className="flex justify-between text-slate-400">
                <span>Total Net Items</span>
                <span>${selectedReceipt.subtotal.toFixed(2)}</span>
              </div>
              {selectedReceipt.discountAmount > 0 && (
                <div className="flex justify-between text-slate-400">
                  <span>Cash Applied Discount ({selectedReceipt.discountRate * 100}%)</span>
                  <span className="text-rose-500">-${selectedReceipt.discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-400">
                <span>Calculated VAT (15%)</span>
                <span>+${selectedReceipt.taxAmount.toFixed(2)}</span>
              </div>
              <div className="border-t border-slate-200 my-2 pt-2 flex justify-between items-center text-sm font-black">
                <span className="font-sans text-slate-400 uppercase tracking-wider text-xs">TOTAL FINAL SURPLUS PAID</span>
                <span className="text-2xl text-emerald-600 font-mono">${selectedReceipt.total.toFixed(2)}</span>
              </div>
            </div>

            <div className="text-center pt-8 border-t border-slate-100">
              <p className="text-xs font-bold text-slate-400">★★★ Thank you for doing business with Acu-invent ★★★</p>
              <p className="text-[10px] text-slate-400 font-mono mt-1">Authorized terminal node signature verified</p>
            </div>

          </div>
        </div>
      )}

      {/* 4. UNIFIED BRANDED PDF PREVIEW MODAL */}
      <UnifiedDocumentModal
        isOpen={isPreviewModalOpen}
        onClose={() => setIsPreviewModalOpen(false)}
        document={pdfPreviewData ? { type: "receipt", data: pdfPreviewData.data } : null}
      />

    </div>
  );
};
