import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { quotationService, customerService, productService, settingsService, aiCopilotService } from "../services/api";
import logoImg from "../pic.png";
import { Quotation, Customer, Product } from "../types";
import { useToast } from "../components/Layout";
import { 
  FileText, 
  Plus, 
  Search, 
  Trash2, 
  Eye, 
  Loader2, 
  ArrowLeft,
  ChevronRight,
  Sparkles,
  Download,
  Printer,
  X,
  CreditCard,
  Building,
  Calendar,
  AlertCircle,
  FileCheck2,
  FileHeart,
  ScanLine
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { UnifiedDocumentModal } from "../components/UnifiedDocumentModal";
import { DocumentOcrModal } from "../components/DocumentOcrModal";
import { PrintConfirmationModal } from "../components/PrintConfirmationModal";
import { getMergedCompanySettings } from "../constants/defaultSettings";
import { normalizeDocument, exportDocumentToPdf } from "../utils/documentPrinter";

// Form validation schema
const quotationFormSchema = z.object({
  customerId: z.string().min(1, { message: "Please select a customer trade partner." }),
  discountRate: z.coerce.number().min(0).max(0.9, { message: "Discount cannot exceed 90%." }),
  enableTax: z.boolean().default(false),
  taxRate: z.coerce.number().min(0).max(100).default(0),
  notes: z.string().optional(),
  status: z.enum(["Draft", "Sent", "Accepted", "Rejected", "Expired"]).default("Draft"),
  items: z.array(
    z.object({
      productId: z.string().min(1, { message: "Select a component" }),
      quantity: z.coerce.number().int().min(1, { message: "Qty must be at least 1" }),
    })
  ).min(1, { message: "You must add at least one electronics item to the quotation." }),
});

type QuotationFormValues = z.infer<typeof quotationFormSchema>;

export const Quotations: React.FC = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const [view, setView] = useState<"list" | "create" | "view">("list");
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null);
  const [isOcrModalOpen, setIsOcrModalOpen] = useState(false);
  
  // AI assist state
  const [isGeneratingAiCover, setIsGeneratingAiCover] = useState(false);
  const [aiCoverLetter, setAiCoverLetter] = useState<string | null>(null);

  // PDF Preview Modal State
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [pdfPreviewData, setPdfPreviewData] = useState<{ type: "quotation" | "receipt"; data: Quotation; aiCoverNote?: string | null } | null>(null);

  // Direct Print Verification Modal State
  const [isDirectPrintConfirmOpen, setIsDirectPrintConfirmOpen] = useState(false);
  const [directPrintData, setDirectPrintData] = useState<{ type: "quotation"; data: Quotation } | null>(null);

  const getEnrichedQuote = (quote: Quotation): Quotation => {
    const cust = customers.find(c => c.id === quote.customerId || c.name === quote.customerName);
    return {
      ...quote,
      customerName: quote.customerName && quote.customerName !== "Customer" ? quote.customerName : (cust?.name || "Valued Customer"),
      customerEmail: quote.customerEmail || cust?.email || "",
      customerPhone: quote.customerPhone || cust?.phone || "",
      customerAddress: quote.customerAddress || cust?.address || "",
    };
  };

  const openPdfPreviewModal = (quote: Quotation) => {
    const enriched = getEnrichedQuote(quote);
    setPdfPreviewData({
      type: "quotation",
      data: enriched,
      aiCoverNote: quote.id === selectedQuoteId ? aiCoverLetter : null,
    });
    setIsPreviewModalOpen(true);
  };

  const handleOpenDirectPrint = (quote: Quotation) => {
    const enriched = getEnrichedQuote(quote);
    setDirectPrintData({ type: "quotation", data: enriched });
    setIsDirectPrintConfirmOpen(true);
  };

  // Queries
  const { data: rawQuotations, isLoading: isQuotesLoading } = useQuery({
    queryKey: ["quotations"],
    queryFn: quotationService.getAll,
  });
  const quotations = Array.isArray(rawQuotations) ? rawQuotations : [];

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
    mutationFn: (data: QuotationFormValues) => {
      const isTaxEnabled = data.enableTax;
      let effectiveTax = 0;
      if (isTaxEnabled) {
        let tr = data.taxRate || 0;
        effectiveTax = tr > 1 ? tr / 100 : tr;
      }
      const selectedCust = customers.find(c => c.id === data.customerId);
      return quotationService.create({
        customerId: data.customerId,
        customerName: selectedCust?.name,
        customerEmail: selectedCust?.email,
        customerPhone: selectedCust?.phone,
        customerAddress: selectedCust?.address,
        items: data.items,
        discountRate: data.discountRate,
        taxRate: effectiveTax,
        notes: data.notes,
        status: data.status,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quotations"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-activity"] });
      showToast("Professional quotation created & stored successfully!", "success");
      setView("list");
    },
    onError: (err: any) => {
      showToast(err.response?.data?.error || "Error compiling quote", "error");
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: Quotation["status"] }) => 
      quotationService.update(id, { status }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["quotations"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-activity"] });
      showToast(`Quotation status updated to ${data.status}!`, "success");
    },
    onError: (err: any) => {
      showToast(err.response?.data?.error || "Failed to update quotation", "error");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: quotationService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quotations"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      showToast("Quotation successfully deleted.", "success");
      setView("list");
    },
    onError: () => {
      showToast("Unauthorized delete check failed", "error");
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
    resolver: zodResolver(quotationFormSchema) as any,
    defaultValues: {
      customerId: "",
      discountRate: 0,
      enableTax: false,
      taxRate: 0,
      notes: "",
      status: "Draft",
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
    name: "items"
  });

  const location = useLocation();

  useEffect(() => {
    if (location.state?.importFromOcr && Array.isArray(location.state.items)) {
      setView("create");
      const ocrItems = location.state.items;
      const formatted = ocrItems.map((item: any) => ({
        productId: item.productId || (products[0]?.id || ""),
        quantity: item.quantity || 1
      }));
      setValue("items", formatted.length > 0 ? formatted : [{ productId: "", quantity: 1 }]);
      if (location.state.vendorOrCustomer) {
        setValue("notes", `Imported from OCR document photo for: ${location.state.vendorOrCustomer}`);
      }
      showToast(`Loaded ${formatted.length} OCR extracted line items into quotation!`, "success");
    }
  }, [location.state, products]);

  const formItems = watch("items");
  const formDiscountRate = watch("discountRate") || 0;
  const formCustomerId = watch("customerId");
  const formEnableTax = watch("enableTax");
  const formTaxRateInput = watch("taxRate") || 0;
  const effectiveFormTaxRate = formEnableTax ? (formTaxRateInput > 1 ? formTaxRateInput / 100 : formTaxRateInput) : 0;

  // Live Calculations Preview Query (computed on express backend asynchronously!)
  const { data: calculationPreview } = useQuery({
    queryKey: ["quote-preview", formItems, formDiscountRate, effectiveFormTaxRate],
    queryFn: () => quotationService.calculate({ items: formItems, discountRate: formDiscountRate, taxRate: effectiveFormTaxRate }),
    enabled: formItems.length > 0 && formItems.every(i => i.productId && i.quantity > 0),
  });

  const handleOpenDraftPrint = () => {
    if (!calculationPreview) {
      showToast("Please select line items and valid quantities to initiate pricing calculators.", "info");
      return;
    }
    const cust = customers.find(c => c.id === formCustomerId);
    const draftQuote: Quotation = {
      id: "DRAFT-TEMP",
      quotationNumber: `QT-DRAFT-${Date.now().toString().slice(-4)}`,
      customerId: formCustomerId || "CUST-DRAFT",
      customerName: cust?.name || "Draft Trade Partner",
      customerEmail: cust?.email || "billing@client.com",
      date: new Date().toISOString().split("T")[0],
      expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      status: "Draft",
      lines: calculationPreview.lines || [],
      subtotal: calculationPreview.subtotal || 0,
      taxRate: effectiveFormTaxRate,
      discountRate: formDiscountRate,
      discountAmount: calculationPreview.discountAmount || 0,
      taxAmount: calculationPreview.taxAmount || 0,
      total: calculationPreview.total || 0,
      notes: watch("notes") || "Draft quotation specification"
    };
    handleOpenDirectPrint(draftQuote);
  };

  const selectedQuote = quotations.find(q => q.id === selectedQuoteId);

  // Trigger professional cover notes via server-hosted Gemini AI 3.5
  const generateAiCoverLetter = async () => {
    if (!selectedQuote) return;
    setIsGeneratingAiCover(true);
    setAiCoverLetter(null);
    try {
      const itemsList = selectedQuote.lines.map(l => `${l.quantity}x ${l.productName}`).join(", ");
      const promptText = `Write a professional quote intro pitch for customer '${selectedQuote.customerName}' regarding quotation ${selectedQuote.quotationNumber} covering parts: ${itemsList}. Mention the grand total is $${selectedQuote.total.toFixed(2)} with a standard 30 day lock-in. Mention our technician can handle setup if requested. No filler text, keep it warm and business-like.`;
      
      const response = await aiCopilotService.getHelp(promptText, "quote");
      setAiCoverLetter(response.text);
    } catch (err) {
      setAiCoverLetter("✨ Acu-invent Assistant: We're currently experiencing high traffic volumes, but your quotation documents are fully prepared. You can download the physical file directly.");
    } finally {
      setIsGeneratingAiCover(false);
    }
  };

  const submitQuotation = (values: QuotationFormValues) => {
    createMutation.mutate(values);
  };

  // PDF document generator & downloader
  const downloadSimulatedPdf = async (quote: Quotation) => {
    try {
      showToast("Generating official quote PDF...", "info");
      const companySettings = getMergedCompanySettings(serverSettings);
      const enrichedQuote = getEnrichedQuote(quote);
      const normDoc = normalizeDocument("quotation", enrichedQuote, companySettings.currency || "USD");
      const fileName = `${companySettings.companyName.replace(/\s+/g, '_')}_QUOTATION_${quote.quotationNumber}.pdf`;
      await exportDocumentToPdf(normDoc, companySettings, fileName, { paperSize: "a4", orientation: "portrait" });
      showToast("PDF document downloaded successfully!", "success");
    } catch (err: any) {
      console.error("Failed to generate quote PDF:", err);
      showToast("Failed to generate PDF quote.", "error");
    }
  };

  const printDocument = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      
      {/* 1. LIST VIEW */}
      {view === "list" && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Proposals & Quotations</h1>
              <p className="text-sm text-slate-500 mt-1">
                Draft new quotations, execute calculations on the backend, and trace multi-company proposals.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsOcrModalOpen(true)}
                id="btn-import-ocr-quotation"
                className="flex items-center gap-2 px-3.5 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-sm font-bold rounded-xl border border-blue-200 transition-all shadow-2xs"
              >
                <ScanLine size={16} className="text-blue-600" />
                <span>Import from Document Image</span>
              </button>

              <button
                onClick={() => { setView("create"); }}
                id="btn-new-quote"
                className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-md cursor-pointer transition-all"
              >
                <Plus size={16} />
                <span>Draft Quotation</span>
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            {isQuotesLoading ? (
              <div className="py-20 flex flex-col items-center justify-center gap-4 text-slate-400">
                <Loader2 className="animate-spin text-blue-600" size={32} />
                <p className="text-sm font-semibold">Loading proposal histories...</p>
              </div>
            ) : quotations.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-xs font-bold text-slate-500 uppercase font-mono tracking-wider border-b border-slate-200">
                      <th className="py-4 px-6">Quote Number</th>
                      <th className="py-4 px-6">Client Customer</th>
                      <th className="py-4 px-6">Created Date</th>
                      <th className="py-4 px-6 text-right">Items Price</th>
                      <th className="py-4 px-6 text-right">Total (Incl. VAT)</th>
                      <th className="py-4 px-6 text-center">Status</th>
                      <th className="py-4 px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm font-medium whitespace-nowrap">
                    {quotations.map((q) => (
                      <tr key={q.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-4 px-6 font-bold text-slate-900 font-mono text-sm">{q.quotationNumber}</td>
                        <td className="py-4 px-6 text-slate-800">{q.customerName}</td>
                        <td className="py-4 px-6 text-slate-400 font-mono text-xs">{q.date}</td>
                        <td className="py-4 px-6 text-right text-slate-500 font-mono">{q.lines.length} Parts</td>
                        <td className="py-4 px-6 text-right font-black text-slate-900 font-mono">${q.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        <td className="py-4 px-6 text-center">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                            q.status === "Accepted" 
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-100" 
                              : q.status === "Sent" 
                              ? "bg-blue-50 text-blue-700 border border-blue-100" 
                              : q.status === "Draft" 
                              ? "bg-slate-100 text-slate-600/90 border border-slate-200"
                              : q.status === "Expired"
                              ? "bg-zinc-100 text-zinc-500/90"
                              : "bg-rose-50 text-rose-700 border border-rose-100"
                          }`}>
                            {q.status}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => { setSelectedQuoteId(q.id); setView("view"); }}
                              className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-all font-bold text-xs inline-flex items-center gap-1.5 border border-slate-200 shadow-3xs cursor-pointer"
                              id={`btn-view-${q.id}`}
                              title="View Document Details"
                            >
                              <Eye size={13} />
                              <span>Details</span>
                            </button>
                            <button
                              onClick={() => openPdfPreviewModal(q)}
                              className="p-1.5 rounded-lg text-blue-600 bg-blue-50/80 hover:bg-blue-600 hover:text-white transition-all font-bold text-xs inline-flex items-center gap-1.5 border border-blue-200/80 shadow-3xs cursor-pointer"
                              id={`btn-pdf-preview-${q.id}`}
                              title="Preview Generated PDF & Print"
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
                <FileText size={40} className="stroke-1 text-slate-300 animate-pulse" />
                <p className="text-sm font-semibold">No quotations logged under this tenant organization</p>
                <button onClick={() => setView("create")} className="text-xs font-bold text-blue-600 hover:underline">Draft your first quote proposal</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. CREATE VIEW (STEPPED WIZARD ARITHMETIC WITH THE SERVER) */}
      {view === "create" && (
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => { setView("list"); }}
              className="p-2 border border-slate-200 bg-white rounded-xl text-slate-500 hover:text-slate-900 transition-colors"
              title="Return to list"
            >
              <ArrowLeft size={16} />
            </button>
            <div>
              <h1 className="text-xl font-black text-slate-950 tracking-tight">Draft New Sales Quotation</h1>
              <p className="text-xs text-slate-400 mt-0.5 font-mono">Stepped configuration — All total pricing computed by custom backend</p>
            </div>
          </div>

          <form onSubmit={handleSubmit(submitQuotation)} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Step form input space */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Step 1: Select Customer */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
                <div className="flex items-center gap-2 text-indigo-900 pb-3 border-b border-slate-100">
                  <span className="h-6 w-6 rounded-md bg-indigo-50 border border-indigo-100 font-bold font-mono text-xs flex items-center justify-center text-indigo-600">1</span>
                  <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider">Select Customer Partner</h3>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Trade Account Name</label>
                  <select
                    id="sel-customer"
                    {...register("customerId")}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm font-semibold focus:outline-hidden"
                  >
                    <option value="">-- Choose Account --</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>{c.name} ({c.type})</option>
                    ))}
                  </select>
                  {errors.customerId && <p className="text-xs text-rose-500 mt-1 font-semibold">{errors.customerId.message}</p>}
                </div>
              </div>

              {/* Step 2: Add Products */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2 text-indigo-900">
                    <span className="h-6 w-6 rounded-md bg-indigo-50 border border-indigo-100 font-bold font-mono text-xs flex items-center justify-center text-indigo-600">2</span>
                    <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider">Line Items catalog</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => append({ productId: "", quantity: 1 })}
                    className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:bg-blue-50 px-2.5 py-1.5 rounded-lg border border-blue-100"
                    id="btn-add-line"
                  >
                    <Plus size={12} />
                    <span>Add Item Line</span>
                  </button>
                </div>

                {errors.items && <p className="text-xs text-rose-500 font-semibold">{errors.items.message}</p>}

                <div className="space-y-3">
                  {fields.map((field, index) => (
                    <div key={field.id} className="flex gap-4 items-center bg-slate-50/50 p-3 rounded-xl border border-slate-150 relative">
                      <div className="flex-1">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Electronics Part</label>
                        <select
                          {...register(`items.${index}.productId`, { required: true })}
                          className="w-full bg-white border border-slate-200 rounded-lg px-2 py-2 text-xs font-semibold focus:outline-hidden"
                        >
                          <option value="">-- Choose Hardware --</option>
                          {products.map(p => (
                            <option key={p.id} value={p.id} disabled={p.quantity <= 0}>
                              {p.name} (${p.sellingPrice}) {p.quantity <= 0 ? "[OUT OF STOCK]" : ""}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="w-24">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Quantity</label>
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

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-slate-100">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Trade Discount (0 - 0.9)</label>
                    <input
                      type="number"
                      step="0.05"
                      placeholder="e.g. 0.1 for 10%"
                      {...register("discountRate", { valueAsNumber: true })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs font-mono"
                    />
                    {errors.discountRate && <p className="text-xs text-rose-500 mt-1">{errors.discountRate.message}</p>}
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest">Tax / VAT (%)</label>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="checkbox"
                          id="quoteEnableTaxCheckbox"
                          {...register("enableTax")}
                          className="w-3.5 h-3.5 text-blue-600 rounded border-slate-300 cursor-pointer"
                        />
                        <label htmlFor="quoteEnableTaxCheckbox" className="text-[10px] font-bold text-slate-600 cursor-pointer">Charge Tax</label>
                      </div>
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        max="100"
                        placeholder="15"
                        disabled={!formEnableTax}
                        {...register("taxRate", { valueAsNumber: true })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs font-mono font-bold disabled:bg-slate-100 disabled:text-slate-400"
                      />
                      <span className="absolute right-3 top-2.5 text-xs font-mono text-slate-400 font-bold">%</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Status Code</label>
                    <select
                      {...register("status")}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs font-semibold"
                    >
                      <option value="Draft">Draft</option>
                      <option value="Sent">Sent to Client</option>
                      <option value="Accepted">Accepted / Deposit Paid</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Internal Sales Cover Notes</label>
                  <textarea
                    rows={3}
                    placeholder="Provide additional instructions, delivery slot locks, or setup details..."
                    {...register("notes")}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs focus:outline-hidden"
                  />
                </div>
              </div>
            </div>

            {/* Live Pricing Summary Block - Server authoritative */}
            <div className="space-y-6">
              <div className="bg-slate-900 text-white rounded-2xl p-6 border border-slate-800 space-y-6 sticky top-24 shadow-xl">
                <div className="pb-3 border-b border-slate-800">
                  <h3 className="font-extrabold text-sm uppercase tracking-widest text-slate-300">AUTHORITATIVE PRICING</h3>
                  <p className="text-[10px] text-slate-500 mt-0.5">Calculations computed on Server Node API</p>
                </div>

                {calculationPreview ? (
                  <div className="space-y-4">
                    <div className="space-y-2 border-b border-slate-800 pb-4 text-xs font-medium font-mono text-slate-300">
                      {calculationPreview.lines.map((l: any, idx: number) => (
                        <div key={idx} className="flex justify-between gap-4">
                          <span className="truncate max-w-[150px]">{l.productName}</span>
                          <span className="text-slate-500">x{l.quantity}</span>
                          <span className="text-slate-100">${l.totalPrice.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-2 text-xs font-medium font-mono">
                      <div className="flex justify-between text-slate-400">
                        <span>Cart Subtotal</span>
                        <span>${calculationPreview.subtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Discount ({formDiscountRate * 100}%)</span>
                        <span className="text-rose-400">-${calculationPreview.discountAmount.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>VAT ({(effectiveFormTaxRate * 100).toFixed(1)}%)</span>
                        <span className="text-slate-300">+${calculationPreview.taxAmount.toFixed(2)}</span>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-800 flex justify-between items-center">
                      <span className="text-xs uppercase font-extrabold tracking-wider text-slate-400 font-sans">Grand Total</span>
                      <span className="text-2xl font-black font-mono text-blue-400">${calculationPreview.total.toFixed(2)}</span>
                    </div>
                  </div>
                ) : (
                  <div className="py-8 flex flex-col items-center justify-center text-center gap-2 text-slate-500">
                    <AlertCircle size={32} />
                    <p className="text-xs">Add products and valid quantities to initiate pricing calculators.</p>
                  </div>
                )}

                <div className="flex flex-col gap-2 pt-2">
                  <button
                    type="submit"
                    id="btn-quote-submit"
                    disabled={createMutation.isPending || !calculationPreview}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-sm font-bold text-white rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {createMutation.isPending ? "Compiling on Server..." : "Submit & Save Quote"}
                  </button>
                  <button
                    type="button"
                    onClick={handleOpenDraftPrint}
                    disabled={!calculationPreview}
                    id="btn-verify-print-builder"
                    className="w-full py-2 bg-slate-800 hover:bg-slate-700/90 disabled:opacity-40 text-xs text-slate-200 font-bold rounded-xl transition-all border border-slate-700/80 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Printer size={13} />
                    <span>Verify & Print Draft</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setView("list")}
                    className="w-full py-2 bg-slate-800/60 hover:bg-slate-700/60 text-xs text-slate-400 font-bold rounded-xl transition-all border border-slate-800"
                  >
                    Cancel Draft
                  </button>
                </div>
              </div>
            </div>

          </form>
        </div>
      )}

      {/* 3. DETAIL PREVIEW VIEW & PRINTING CANVAS */}
      {view === "view" && selectedQuote && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <button
              onClick={() => { setView("list"); setAiCoverLetter(null); }}
              className="px-3 py-1.5 border border-slate-200 bg-white rounded-lg text-slate-700 hover:text-slate-900 text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <ArrowLeft size={14} />
              <span>Catalog list</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleOpenDirectPrint(selectedQuote)}
                id="btn-direct-verify-print"
                className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                title="Verify proposal details before printing"
              >
                <Printer size={14} />
                <span>Verify & Print</span>
              </button>
              <button
                onClick={() => downloadSimulatedPdf(selectedQuote)}
                className="px-3 py-1.5 border border-slate-200 bg-white rounded-lg text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-all hover:bg-slate-50 cursor-pointer"
              >
                <Download size={14} />
                <span>PDF Invoice</span>
              </button>
              <button
                onClick={() => openPdfPreviewModal(selectedQuote)}
                id="btn-preview-and-print-quote"
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
              >
                <Printer size={14} />
                <span>Preview PDF & Print</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* The beautiful printable formal letterhead paper */}
            <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-10 space-y-8 print:border-0 print:shadow-none print:p-0" id="quotation-print-area">
              
              {/* Formal Letterhead */}
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 pb-6 border-b border-slate-100">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <img src={logoImg} alt="Acu-invent Logo" className="h-8 w-auto object-contain rounded-md" />
                    <span className="font-extrabold text-xl text-slate-950 tracking-tight">Acu-invent <span className="font-light text-slate-500 text-xs">Inventory Ltd</span></span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-medium font-sans">
                    900 Technology Way, Suite 101, CA<br />
                    Licence No: ACU-2026-CA | +1-800-555-8800
                  </p>
                </div>

                <div className="text-left sm:text-right">
                  <span className="text-xs uppercase font-serif text-slate-400 tracking-widest font-bold">Formal Sales Quotation</span>
                  <h2 className="text-xl font-bold font-mono text-slate-900 mt-1">{selectedQuote.quotationNumber}</h2>
                  <div className="text-xs text-slate-400 font-mono mt-1 space-y-0.5">
                    <p>Date Generated: {selectedQuote.date}</p>
                    <p>Expires On: {selectedQuote.expiryDate}</p>
                  </div>
                </div>
              </div>

              {/* Client addresses specs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase block mb-1">Prepared For Spec:</span>
                  <p className="font-bold text-slate-950">{selectedQuote.customerName}</p>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">{selectedQuote.customerEmail}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase block mb-1">Status & Validity</span>
                  <p className="text-xs font-bold text-slate-700">Account Owner: Acu-invent Systems</p>
                  <p className="text-xs mt-1">Validity Lock: <span className="font-semibold text-rose-600">30 Days reserved on hardware</span></p>
                </div>
              </div>

              {/* Itemized Table */}
              <div className="space-y-3">
                <span className="text-[11px] font-bold text-slate-400 tracking-wider uppercase block">Ordered Electronics Breakdown</span>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 font-bold uppercase tracking-wider text-slate-500">
                        <th className="py-3 px-4">Line Item Part Description</th>
                        <th className="py-3 px-4 text-center">Qty</th>
                        <th className="py-3 px-4 text-right">Unit Net ($)</th>
                        <th className="py-3 px-4 text-right">Total Net ($)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700 font-mono">
                      {selectedQuote.lines.map((line, idx) => (
                        <tr key={idx}>
                          <td className="py-3.5 px-4 font-sans text-slate-900 font-semibold">{line.productName}</td>
                          <td className="py-3.5 px-4 text-center font-bold">{line.quantity}</td>
                          <td className="py-3.5 px-4 text-right">${line.unitPrice.toFixed(2)}</td>
                          <td className="py-3.5 px-4 text-right text-slate-950 font-bold">${line.totalPrice.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Calculation Summary Footer */}
              <div className="grid grid-cols-1 md:grid-cols-2 pt-6 border-t border-slate-150 gap-6">
                <div className="text-xs text-slate-400 leading-relaxed font-sans">
                  <p className="font-semibold text-slate-600 uppercase tracking-widest text-[9px] mb-1">Important Notice</p>
                  <p>VAT is locked on this invoice profile. Bank Wire instructions: VoltSync Billing Core Acct #8849-002-CA, routing code 1210-99. Goods are subject to storage limits.</p>
                  {selectedQuote.notes && (
                    <div className="mt-3 p-2.5 bg-slate-50/50 rounded-xl border border-dashed border-slate-200 font-semibold text-slate-700 text-xs">
                      Internal: {selectedQuote.notes}
                    </div>
                  )}
                </div>

                <div className="space-y-2 text-right text-xs font-mono font-medium">
                  <div className="flex justify-between text-slate-400">
                    <span>Net Subtotal</span>
                    <span>${selectedQuote.subtotal.toFixed(2)}</span>
                  </div>
                  {selectedQuote.discountAmount > 0 && (
                    <div className="flex justify-between text-slate-400">
                      <span>Enterprise Discount ({selectedQuote.discountRate * 100}%)</span>
                      <span className="text-rose-500">-${selectedQuote.discountAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-400">
                    <span>Applicable VAT (15%)</span>
                    <span>+${selectedQuote.taxAmount.toFixed(2)}</span>
                  </div>
                  <div className="h-[1px] bg-slate-100 my-2"></div>
                  <div className="flex justify-between items-center text-sm font-black pt-1">
                    <span className="font-sans text-slate-400 uppercase tracking-wide">GRAND TOTAL DUE ($)</span>
                    <span className="text-xl text-blue-600 font-mono">${selectedQuote.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Document Interactive Controls & Gemini AI Generative Copilot */}
            <div className="space-y-6">
              
              {/* Proposal Actions */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
                <div className="pb-3 border-b border-slate-100">
                  <h3 className="font-bold text-slate-900 text-xs uppercase tracking-widest">Proposal Operations</h3>
                </div>

                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Transition Status Code</span>
                  <div className="grid grid-cols-2 gap-2">
                    {["Sent", "Accepted", "Rejected", "Expired"].map((st) => (
                      <button
                        key={st}
                        onClick={() => updateStatusMutation.mutate({ id: selectedQuote.id, status: st as any })}
                        className={`py-1.5 rounded-lg text-xs font-bold transition-all border border-slate-200 ${
                          selectedQuote.status === st 
                            ? "bg-slate-900 text-white border-transparent" 
                            : "bg-white text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100">
                  <button
                    onClick={() => {
                      if (window.confirm("Verify: Delete this quotation profile permanently?")) {
                        deleteMutation.mutate(selectedQuote.id);
                      }
                    }}
                    id="btn-delete-quote"
                    className="w-full py-2 bg-rose-50 text-rose-600 border border-rose-100 hover:bg-rose-100 transition-colors rounded-xl text-xs font-bold"
                  >
                    Delete Proposal
                  </button>
                </div>
              </div>

              {/* Gemini AI Cover Letter Generator */}
              <div className="bg-gradient-to-br from-slate-905 to-slate-950 text-white rounded-2xl p-5 border border-slate-800 space-y-4 shadow-xl">
                <div className="flex gap-2 items-center text-blue-400">
                  <Sparkles size={16} />
                  <span className="font-black text-xs uppercase tracking-widest text-slate-200">Acu-invent Assistant</span>
                </div>
                
                <p className="text-[11px] text-slate-400 leading-normal">
                  Auto-generate a highly persuasive, personalized pitch cover letter tailored to this specific customer and quotation breakdown using server-side Gemini 3.5.
                </p>

                <button
                  type="button"
                  onClick={generateAiCoverLetter}
                  id="btn-ai-assist"
                  disabled={isGeneratingAiCover}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isGeneratingAiCover ? (
                    <>
                      <Loader2 size={13} className="animate-spin" />
                      <span>Writing Cover Pitch...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={13} />
                      <span>Draft Pitch Pitch</span>
                    </>
                  )}
                </button>

                {aiCoverLetter && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl text-[11px] text-slate-300 font-sans leading-relaxed text-left whitespace-pre-line select-text"
                  >
                    {aiCoverLetter}
                  </motion.div>
                )}
              </div>

            </div>

          </div>
        </div>
      )}

      {/* 4. UNIFIED BRANDED PDF PREVIEW MODAL */}
      <UnifiedDocumentModal
        isOpen={isPreviewModalOpen}
        onClose={() => setIsPreviewModalOpen(false)}
        document={pdfPreviewData ? { type: "quotation", data: pdfPreviewData.data } : null}
      />

      {/* 5. DOCUMENT OCR MODAL */}
      <DocumentOcrModal
        isOpen={isOcrModalOpen}
        onClose={() => setIsOcrModalOpen(false)}
      />

      {/* 6. DIRECT PRINT CONFIRMATION MODAL */}
      <PrintConfirmationModal
        isOpen={isDirectPrintConfirmOpen}
        onClose={() => setIsDirectPrintConfirmOpen(false)}
        onConfirmPrint={() => setTimeout(() => window.print(), 150)}
        documentData={directPrintData}
      />

    </div>
  );
};
