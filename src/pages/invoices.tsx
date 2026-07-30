import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { 
  invoiceService, 
  quotationService, 
  customerService, 
  productService, 
  settingsService, 
  financialService 
} from "../services/api";
import { Invoice, Quotation, Customer, Product, BankAccount } from "../types";
import { useToast } from "../components/Layout";
import { 
  FileCheck, 
  Plus, 
  Search, 
  Trash2, 
  Eye, 
  Loader2, 
  ArrowLeft, 
  ChevronRight, 
  Printer, 
  Download, 
  X, 
  CreditCard, 
  Building2, 
  Calendar, 
  AlertCircle, 
  Receipt as ReceiptIcon, 
  CheckCircle2, 
  Clock, 
  ArrowUpRight, 
  Filter, 
  DollarSign, 
  FileText,
  RefreshCw,
  UserCheck,
  Send
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { UnifiedDocumentModal } from "../components/UnifiedDocumentModal";

// Invoice Form Schema
const invoiceFormSchema = z.object({
  customerId: z.string().min(1, { message: "Please select a customer." }),
  dueDate: z.string().optional(),
  discountRate: z.coerce.number().min(0).max(0.9, { message: "Discount cannot exceed 90%." }),
  enableTax: z.boolean().default(true),
  taxRate: z.coerce.number().min(0).max(100).default(15),
  notes: z.string().optional(),
  termsAndConditions: z.string().optional(),
  status: z.enum(["Draft", "Issued", "Partially Paid", "Paid", "Overdue", "Cancelled", "Void"]).default("Issued"),
  items: z.array(
    z.object({
      productId: z.string().min(1, { message: "Select an item" }),
      quantity: z.coerce.number().int().min(1, { message: "Qty must be at least 1" }),
    })
  ).min(1, { message: "You must add at least one line item to the invoice." }),
});

type InvoiceFormValues = z.infer<typeof invoiceFormSchema>;

export const Invoices: React.FC = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const location = useLocation();

  // Primary view state
  const [view, setView] = useState<"list" | "create" | "view">("list");
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [customerFilter, setCustomerFilter] = useState<string>("All");

  // Modals
  const [isConvertQuotationModalOpen, setIsConvertQuotationModalOpen] = useState(false);
  const [selectedQuoteToConvert, setSelectedQuoteToConvert] = useState<Quotation | null>(null);
  const [quotationSearch, setQuotationSearch] = useState("");

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentInvoice, setPaymentInvoice] = useState<Invoice | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<string>("Cash");
  const [selectedBankAccountId, setSelectedBankAccountId] = useState<string>("");
  const [paymentNotes, setPaymentNotes] = useState<string>("");

  // Document PDF Preview Modal
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewDocument, setPreviewDocument] = useState<{ type: "invoice"; data: Invoice } | null>(null);

  // Fetch queries
  const { data: invoices = [], isLoading: isLoadingInvoices } = useQuery({
    queryKey: ["invoices"],
    queryFn: () => invoiceService.getAll(),
  });

  const { data: quotations = [] } = useQuery({
    queryKey: ["quotations"],
    queryFn: () => quotationService.getAll(),
  });

  const { data: customers = [] } = useQuery({
    queryKey: ["customers"],
    queryFn: () => customerService.getAll(),
  });

  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: () => productService.getAll().then(res => res.products || []),
  });

  const { data: bankAccounts = [] } = useQuery({
    queryKey: ["bankAccounts"],
    queryFn: () => financialService.getBankAccounts(),
  });

  // Handle navigate state (e.g. converted quotation from Quotations page)
  useEffect(() => {
    if (location.state && (location.state as any).selectedInvoiceId) {
      setSelectedInvoiceId((location.state as any).selectedInvoiceId);
      setView("view");
    }
  }, [location.state]);

  // Form Setup
  const { register, control, handleSubmit, watch, reset, setValue, formState: { errors } } = useForm<any>({
    resolver: zodResolver(invoiceFormSchema) as any,
    defaultValues: {
      customerId: "",
      dueDate: new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0],
      discountRate: 0,
      enableTax: true,
      taxRate: 15,
      notes: "Thank you for your business!",
      termsAndConditions: "Payment is due within 14 days of invoice date.",
      status: "Issued",
      items: [{ productId: "", quantity: 1 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items",
  });

  const watchedItems = watch("items");
  const watchedDiscountRate = watch("discountRate") || 0;
  const watchedEnableTax = watch("enableTax");
  const watchedTaxRate = watch("taxRate") || 0;

  // Invoice creation mutation
  const createInvoiceMutation = useMutation({
    mutationFn: (data: InvoiceFormValues) => {
      return invoiceService.create({
        customerId: data.customerId,
        dueDate: data.dueDate,
        items: data.items,
        discountRate: Number(data.discountRate),
        taxRate: data.enableTax ? Number(data.taxRate) / 100 : 0,
        notes: data.notes,
        termsAndConditions: data.termsAndConditions,
        status: data.status,
      });
    },
    onSuccess: (newInv) => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      showToast(`Invoice #${newInv.invoiceNumber} successfully generated.`, "success");
      reset();
      setView("list");
    },
    onError: (err: any) => {
      showToast(err.message || "Failed to create invoice.", "error");
    },
  });

  // Convert Quotation mutation
  const convertQuotationMutation = useMutation({
    mutationFn: (quotationId: string) => quotationService.convertToInvoice(quotationId),
    onSuccess: (newInv) => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["quotations"] });
      queryClient.invalidateQueries({ queryKey: ["systemLogs"] });
      showToast(`Quotation converted to Invoice #${newInv.invoiceNumber}!`, "success");
      setIsConvertQuotationModalOpen(false);
      setSelectedQuoteToConvert(null);
      setSelectedInvoiceId(newInv.id);
      setView("view");
    },
    onError: (err: any) => {
      showToast(err.message || "Failed to convert quotation.", "error");
    },
  });

  // Record Payment / Generate Receipt mutation
  const recordPaymentMutation = useMutation({
    mutationFn: (payload: { invoiceId: string; amountReceived: number; paymentMethod: string; bankAccountId?: string; notes?: string }) => {
      return invoiceService.generateReceipt(payload);
    },
    onSuccess: ({ receipt, invoice }) => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["receipts"] });
      queryClient.invalidateQueries({ queryKey: ["cashBook"] });
      queryClient.invalidateQueries({ queryKey: ["bankAccounts"] });
      queryClient.invalidateQueries({ queryKey: ["financialSummary"] });
      queryClient.invalidateQueries({ queryKey: ["systemLogs"] });

      showToast(`Payment of $${paymentAmount.toFixed(2)} recorded! Receipt #${receipt.receiptNumber} generated. Status: ${invoice.status}`, "success");
      setIsPaymentModalOpen(false);
      setPaymentInvoice(null);
    },
    onError: (err: any) => {
      showToast(err.message || "Failed to record payment.", "error");
    },
  });

  // Calculate live totals for form
  const subtotal = watchedItems.reduce((acc, item) => {
    const p = products.find((prod) => prod.id === item.productId);
    return acc + (p ? p.sellingPrice * (item.quantity || 0) : 0);
  }, 0);
  const discountAmount = subtotal * (watchedDiscountRate || 0);
  const afterDiscount = subtotal - discountAmount;
  const taxAmount = watchedEnableTax ? afterDiscount * ((watchedTaxRate || 0) / 100) : 0;
  const grandTotal = afterDiscount + taxAmount;

  // Filtered invoices
  const filteredInvoices = invoices.filter((inv) => {
    const matchesSearch = 
      inv.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
      inv.customerName.toLowerCase().includes(search.toLowerCase()) ||
      (inv.notes && inv.notes.toLowerCase().includes(search.toLowerCase())) ||
      (inv.quotationNumber && inv.quotationNumber.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus = statusFilter === "All" || inv.status === statusFilter;
    const matchesCustomer = customerFilter === "All" || inv.customerId === customerFilter;

    return matchesSearch && matchesStatus && matchesCustomer;
  });

  // Summary KPIs
  const totalInvoiced = invoices.reduce((sum, i) => sum + (i.total || 0), 0);
  const totalPaid = invoices.reduce((sum, i) => sum + (i.amountPaid || 0), 0);
  const totalOutstanding = invoices.reduce((sum, i) => sum + (i.outstandingBalance || 0), 0);
  const overdueCount = invoices.filter(i => i.status === "Overdue" || (i.status !== "Paid" && i.status !== "Cancelled" && i.dueDate < new Date().toISOString().split("T")[0])).length;

  // Open Payment modal
  const handleOpenPaymentModal = (inv: Invoice) => {
    setPaymentInvoice(inv);
    setPaymentAmount(inv.outstandingBalance || inv.total);
    setPaymentMethod("Cash");
    setSelectedBankAccountId("");
    setPaymentNotes(`Settlement for Invoice #${inv.invoiceNumber}`);
    setIsPaymentModalOpen(true);
  };

  // Selected Invoice detail
  const selectedInvoice = invoices.find((i) => i.id === selectedInvoiceId);

  // Status Badge Colors
  const getStatusBadge = (status: Invoice["status"]) => {
    switch (status) {
      case "Paid":
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1 w-fit"><CheckCircle2 size={12}/> Paid</span>;
      case "Partially Paid":
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1 w-fit"><Clock size={12}/> Partially Paid</span>;
      case "Issued":
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1 w-fit"><Send size={12}/> Issued</span>;
      case "Draft":
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200 flex items-center gap-1 w-fit">Draft</span>;
      case "Overdue":
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1 w-fit"><AlertCircle size={12}/> Overdue</span>;
      case "Cancelled":
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-200 text-slate-500 line-through border border-slate-300 w-fit">Cancelled</span>;
      case "Void":
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200 w-fit">Void</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700">{status}</span>;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-3xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
              <FileCheck size={22} />
            </span>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Sales Invoices</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Manage tax invoices, convert quotations, and track full or partial settlements with audit continuity.
          </p>
        </div>

        {view === "list" && (
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setIsConvertQuotationModalOpen(true)}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer border border-slate-200"
            >
              <RefreshCw size={15} className="text-blue-600" />
              Convert Quotation
            </button>
            
            <button
              onClick={() => { reset(); setView("create"); }}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer shadow-xs"
            >
              <Plus size={16} />
              New Invoice
            </button>
          </div>
        )}

        {view !== "list" && (
          <button
            onClick={() => setView("list")}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer"
          >
            <ArrowLeft size={16} />
            Back to Invoices List
          </button>
        )}
      </div>

      {/* KPI Overview Cards (List view only) */}
      {view === "list" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-3xs flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Invoiced</p>
              <p className="text-xl font-black text-slate-900 mt-1">${totalInvoiced.toFixed(2)}</p>
              <p className="text-3xs text-slate-400 mt-1">{invoices.length} total documents</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-xl text-blue-600 border border-blue-100">
              <FileCheck size={20} />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-3xs flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Collected</p>
              <p className="text-xl font-black text-emerald-600 mt-1">${totalPaid.toFixed(2)}</p>
              <p className="text-3xs text-emerald-600 font-medium mt-1">Settled into cash & bank</p>
            </div>
            <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600 border border-emerald-100">
              <DollarSign size={20} />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-3xs flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Outstanding Due</p>
              <p className="text-xl font-black text-amber-600 mt-1">${totalOutstanding.toFixed(2)}</p>
              <p className="text-3xs text-amber-600 font-medium mt-1">Receivable balance</p>
            </div>
            <div className="p-3 bg-amber-50 rounded-xl text-amber-600 border border-amber-100">
              <Clock size={20} />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-3xs flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Overdue Alerts</p>
              <p className="text-xl font-black text-rose-600 mt-1">{overdueCount}</p>
              <p className="text-3xs text-rose-500 font-medium mt-1">Require settlement follow-up</p>
            </div>
            <div className="p-3 bg-rose-50 rounded-xl text-rose-600 border border-rose-100">
              <AlertCircle size={20} />
            </div>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* LIST VIEW                                                     */}
      {/* ============================================================= */}
      {view === "list" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-3xs overflow-hidden">
          
          {/* Controls & Filter Bar */}
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Search invoice #, customer, notes..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              {/* Customer Filter */}
              <select
                value={customerFilter}
                onChange={(e) => setCustomerFilter(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-600 focus:outline-hidden"
              >
                <option value="All">All Customers</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-600 focus:outline-hidden"
              >
                <option value="All">All Statuses</option>
                <option value="Draft">Draft</option>
                <option value="Issued">Issued</option>
                <option value="Partially Paid">Partially Paid</option>
                <option value="Paid">Paid</option>
                <option value="Overdue">Overdue</option>
                <option value="Cancelled">Cancelled</option>
                <option value="Void">Void</option>
              </select>
            </div>
          </div>

          {/* Table */}
          {isLoadingInvoices ? (
            <div className="py-20 text-center">
              <Loader2 className="animate-spin text-blue-600 mx-auto" size={32} />
              <p className="text-xs font-bold text-slate-400 mt-2 uppercase tracking-widest">Loading invoice registry...</p>
            </div>
          ) : filteredInvoices.length === 0 ? (
            <div className="py-20 text-center px-4">
              <div className="p-4 bg-slate-100 rounded-full w-14 h-14 mx-auto flex items-center justify-center text-slate-400 mb-3">
                <FileCheck size={28} />
              </div>
              <h3 className="text-sm font-bold text-slate-800">No invoices match your criteria</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Create a new invoice or convert an existing quotation to get started.
              </p>
              <div className="mt-4 flex items-center justify-center gap-3">
                <button
                  onClick={() => setIsConvertQuotationModalOpen(true)}
                  className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-xl border border-blue-200"
                >
                  Convert Quotation
                </button>
                <button
                  onClick={() => { reset(); setView("create"); }}
                  className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl shadow-xs"
                >
                  Create Invoice
                </button>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-3xs">
                    <th className="py-3 px-4">Invoice #</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Issue Date</th>
                    <th className="py-3 px-4">Due Date</th>
                    <th className="py-3 px-4 text-right">Total</th>
                    <th className="py-3 px-4 text-right">Paid</th>
                    <th className="py-3 px-4 text-right">Outstanding</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        <div className="flex flex-col">
                          <span>{inv.invoiceNumber}</span>
                          {inv.quotationNumber && (
                            <span className="text-3xs text-blue-600 font-sans flex items-center gap-0.5">
                              From {inv.quotationNumber}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-800">
                        {inv.customerName}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500">{inv.date}</td>
                      <td className="py-3.5 px-4 text-slate-500">{inv.dueDate}</td>
                      <td className="py-3.5 px-4 text-right font-bold text-slate-900">${(inv.total || 0).toFixed(2)}</td>
                      <td className="py-3.5 px-4 text-right font-bold text-emerald-600">${(inv.amountPaid || 0).toFixed(2)}</td>
                      <td className="py-3.5 px-4 text-right font-bold text-amber-600">${(inv.outstandingBalance || 0).toFixed(2)}</td>
                      <td className="py-3.5 px-4">{getStatusBadge(inv.status)}</td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* View Detail */}
                          <button
                            onClick={() => { setSelectedInvoiceId(inv.id); setView("view"); }}
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors cursor-pointer"
                            title="View Invoice Details"
                          >
                            <Eye size={15} />
                          </button>

                          {/* Print / Download PDF */}
                          <button
                            onClick={() => { setPreviewDocument({ type: "invoice", data: inv }); setIsPreviewModalOpen(true); }}
                            className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition-colors cursor-pointer border border-blue-200"
                            title="Print & Download PDF"
                          >
                            <Printer size={15} />
                          </button>

                          {/* Record Payment (if outstanding) */}
                          {inv.status !== "Paid" && inv.status !== "Cancelled" && inv.status !== "Void" && (
                            <button
                              onClick={() => handleOpenPaymentModal(inv)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-3xs font-bold transition-colors cursor-pointer flex items-center gap-1 shadow-xs"
                              title="Record Settlement / Generate Receipt"
                            >
                              <ReceiptIcon size={13} />
                              Pay
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
      )}

      {/* ============================================================= */}
      {/* CREATE INVOICE VIEW                                           */}
      {/* ============================================================= */}
      {view === "create" && (
        <form onSubmit={handleSubmit((data) => createInvoiceMutation.mutate(data))} className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-3xs space-y-6">
            <h2 className="font-bold text-slate-900 text-base pb-3 border-b border-slate-100 flex items-center gap-2">
              <Plus size={18} className="text-blue-600" />
              Create New Tax Invoice
            </h2>

            {/* Customer & Dates Header */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Customer / Trade Partner *</label>
                <select
                  {...register("customerId")}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold focus:outline-hidden"
                >
                  <option value="">-- Select Customer --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>{c.name} ({c.type})</option>
                  ))}
                </select>
                {errors.customerId && <p className="text-xs text-rose-500 mt-1">{errors.customerId.message}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Payment Due Date</label>
                <input
                  type="date"
                  {...register("dueDate")}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Initial Invoice Status</label>
                <select
                  {...register("status")}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold focus:outline-hidden"
                >
                  <option value="Issued">Issued (Active)</option>
                  <option value="Draft">Draft</option>
                </select>
              </div>
            </div>

            {/* Itemized Lines */}
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Line Items & Products</h3>
                <button
                  type="button"
                  onClick={() => append({ productId: "", quantity: 1 })}
                  className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold hover:bg-blue-100 transition-colors cursor-pointer flex items-center gap-1"
                >
                  <Plus size={14} /> Add Line Item
                </button>
              </div>

              {fields.map((field, idx) => {
                const prodId = watchedItems[idx]?.productId;
                const selectedProd = products.find((p) => p.id === prodId);
                const unitPrice = selectedProd ? selectedProd.sellingPrice : 0;
                const qty = watchedItems[idx]?.quantity || 0;
                const lineTotal = unitPrice * qty;

                return (
                  <div key={field.id} className="grid grid-cols-12 gap-3 items-center bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <div className="col-span-6 md:col-span-6">
                      <label className="block text-3xs font-bold text-slate-400 uppercase mb-1">Product Component</label>
                      <select
                        {...register(`items.${idx}.productId` as const)}
                        className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-semibold focus:outline-hidden"
                      >
                        <option value="">-- Choose Product --</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>{p.name} - ${p.sellingPrice.toFixed(2)} (In Stock: {p.quantity})</option>
                        ))}
                      </select>
                    </div>

                    <div className="col-span-3 md:col-span-2">
                      <label className="block text-3xs font-bold text-slate-400 uppercase mb-1">Quantity</label>
                      <input
                        type="number"
                        min="1"
                        {...register(`items.${idx}.quantity` as const)}
                        className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-semibold text-center focus:outline-hidden"
                      />
                    </div>

                    <div className="col-span-2 md:col-span-3 text-right">
                      <label className="block text-3xs font-bold text-slate-400 uppercase mb-1">Line Total</label>
                      <p className="font-mono font-bold text-slate-900 text-xs py-2">${lineTotal.toFixed(2)}</p>
                    </div>

                    <div className="col-span-1 text-center">
                      {fields.length > 1 && (
                        <button
                          type="button"
                          onClick={() => remove(idx)}
                          className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
              {errors.items && <p className="text-xs text-rose-500">{errors.items.message}</p>}
            </div>

            {/* Calculations & Discounts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Discount Rate</label>
                  <select
                    {...register("discountRate")}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold focus:outline-hidden"
                  >
                    <option value="0">0% - Standard Rate</option>
                    <option value="0.05">5% Trade Discount</option>
                    <option value="0.10">10% Corporate Discount</option>
                    <option value="0.15">15% Bulk Partner Discount</option>
                  </select>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="enableTax"
                    {...register("enableTax")}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="enableTax" className="text-xs font-bold text-slate-700">Apply Standard VAT / Tax Rate (15%)</label>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Notes & References</label>
                  <textarea
                    rows={2}
                    {...register("notes")}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs focus:outline-hidden"
                    placeholder="Customer purchase order reference, project name, etc."
                  />
                </div>
              </div>

              {/* Total Calculation Panel */}
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3 font-medium text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal:</span>
                  <span className="font-mono font-bold">${subtotal.toFixed(2)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-bold">
                    <span>Discount:</span>
                    <span className="font-mono">-${discountAmount.toFixed(2)}</span>
                  </div>
                )}
                {watchedEnableTax && (
                  <div className="flex justify-between text-slate-600">
                    <span>VAT (15%):</span>
                    <span className="font-mono font-bold">${taxAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="pt-3 border-t border-slate-200 flex justify-between text-slate-900 font-black text-sm">
                  <span>Grand Total:</span>
                  <span className="font-mono text-blue-600 text-base">${grandTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setView("list")}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createInvoiceMutation.isPending}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer flex items-center gap-2"
              >
                {createInvoiceMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : <FileCheck size={16} />}
                Generate & Save Invoice
              </button>
            </div>
          </div>
        </form>
      )}

      {/* ============================================================= */}
      {/* INVOICE DETAIL VIEW                                           */}
      {/* ============================================================= */}
      {view === "view" && selectedInvoice && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-3xs space-y-6">
            
            {/* Header info */}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-6 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-black text-slate-900 font-mono">{selectedInvoice.invoiceNumber}</h2>
                  {getStatusBadge(selectedInvoice.status)}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Issued to <strong className="text-slate-800">{selectedInvoice.customerName}</strong> on {selectedInvoice.date} (Due: {selectedInvoice.dueDate})
                </p>
                {selectedInvoice.quotationNumber && (
                  <p className="text-xs text-blue-600 font-semibold mt-1 flex items-center gap-1">
                    <FileText size={13}/> Generated from Source Quotation #{selectedInvoice.quotationNumber}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2">
                {/* Print PDF */}
                <button
                  onClick={() => { setPreviewDocument({ type: "invoice", data: selectedInvoice }); setIsPreviewModalOpen(true); }}
                  className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-2 border border-blue-200"
                >
                  <Printer size={15} /> Print / Export PDF
                </button>

                {/* Record Settlement */}
                {selectedInvoice.status !== "Paid" && selectedInvoice.status !== "Cancelled" && (
                  <button
                    onClick={() => handleOpenPaymentModal(selectedInvoice)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-2 shadow-xs"
                  >
                    <ReceiptIcon size={15} /> Record Payment
                  </button>
                )}
              </div>
            </div>

            {/* Financial Summary Box */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div>
                <span className="text-3xs font-bold text-slate-400 uppercase tracking-widest">Total Invoice Amount</span>
                <p className="text-lg font-black text-slate-900 font-mono">${(selectedInvoice.total || 0).toFixed(2)}</p>
              </div>
              <div>
                <span className="text-3xs font-bold text-slate-400 uppercase tracking-widest">Amount Paid to Date</span>
                <p className="text-lg font-black text-emerald-600 font-mono">${(selectedInvoice.amountPaid || 0).toFixed(2)}</p>
              </div>
              <div>
                <span className="text-3xs font-bold text-slate-400 uppercase tracking-widest">Outstanding Balance</span>
                <p className="text-lg font-black text-amber-600 font-mono">${(selectedInvoice.outstandingBalance || 0).toFixed(2)}</p>
              </div>
            </div>

            {/* Itemized table */}
            <div>
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">Invoice Line Items</h3>
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-slate-500 font-bold uppercase tracking-wider text-3xs">
                      <th className="py-2.5 px-4">Item Description</th>
                      <th className="py-2.5 px-4 text-center">Qty</th>
                      <th className="py-2.5 px-4 text-right">Unit Price</th>
                      <th className="py-2.5 px-4 text-right">Line Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {selectedInvoice.lines.map((line, idx) => (
                      <tr key={idx}>
                        <td className="py-3 px-4 font-bold text-slate-800">{line.productName}</td>
                        <td className="py-3 px-4 text-center">{line.quantity}</td>
                        <td className="py-3 px-4 text-right">${line.unitPrice.toFixed(2)}</td>
                        <td className="py-3 px-4 text-right font-bold text-slate-900">${line.totalPrice.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Linked Receipts Payment History */}
            {selectedInvoice.receiptNumbers && selectedInvoice.receiptNumbers.length > 0 && (
              <div className="pt-4 border-t border-slate-100 space-y-2">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                  <ReceiptIcon size={14} className="text-emerald-600" /> Linked Payment Receipts
                </h3>
                <div className="flex flex-wrap gap-2">
                  {selectedInvoice.receiptNumbers.map((rcpNum, idx) => (
                    <span key={idx} className="px-3 py-1.5 bg-emerald-50 text-emerald-800 rounded-lg text-xs font-mono font-bold border border-emerald-200 flex items-center gap-1.5">
                      <CheckCircle2 size={13} className="text-emerald-600" /> Receipt #{rcpNum}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* MODAL: CONVERT QUOTATION TO INVOICE                           */}
      {/* ============================================================= */}
      <AnimatePresence>
        {isConvertQuotationModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2 text-blue-600">
                  <RefreshCw size={20} />
                  <h3 className="font-bold text-slate-900 text-base">Generate Invoice from Quotation</h3>
                </div>
                <button
                  onClick={() => setIsConvertQuotationModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                >
                  <X size={18} />
                </button>
              </div>

              <p className="text-xs text-slate-500">
                Select an existing sales quotation to convert into an official tax invoice. All items, customer info, discounts, and terms will be seamlessly copied.
              </p>

              {/* Quotation Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                <input
                  type="text"
                  placeholder="Search quotation # or customer..."
                  value={quotationSearch}
                  onChange={(e) => setQuotationSearch(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs font-medium focus:outline-hidden"
                />
              </div>

              {/* Quotation List */}
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {quotations
                  .filter((q) => 
                    q.quotationNumber.toLowerCase().includes(quotationSearch.toLowerCase()) ||
                    q.customerName.toLowerCase().includes(quotationSearch.toLowerCase())
                  )
                  .map((q) => {
                    const isAlreadyConverted = q.isConverted || q.status === "Converted";
                    const isSelected = selectedQuoteToConvert?.id === q.id;

                    return (
                      <div
                        key={q.id}
                        onClick={() => setSelectedQuoteToConvert(q)}
                        className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                          isSelected
                            ? "bg-blue-50 border-blue-500 shadow-3xs"
                            : "bg-slate-50/70 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-xs text-slate-900">{q.quotationNumber}</span>
                            {isAlreadyConverted ? (
                              <span className="px-2 py-0.5 rounded-md text-3xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                Converted ({q.invoiceNumber || "INV"})
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-md text-3xs font-bold bg-blue-100 text-blue-800">
                                {q.status}
                              </span>
                            )}
                          </div>
                          <p className="text-xs font-bold text-slate-700 mt-0.5">{q.customerName}</p>
                          <p className="text-3xs text-slate-400">{q.lines?.length || 0} line items | Issued {q.date}</p>
                        </div>

                        <div className="text-right">
                          <p className="font-mono font-bold text-xs text-slate-900">${(q.total || 0).toFixed(2)}</p>
                          <span className="text-3xs font-bold text-blue-600">
                            {isSelected ? "Selected ✓" : "Click to select"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
              </div>

              {/* Convert Confirmation Actions */}
              {selectedQuoteToConvert && (
                <div className="p-4 bg-blue-50/80 rounded-xl border border-blue-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-900">Selected: #{selectedQuoteToConvert.quotationNumber}</span>
                    <span className="font-mono font-bold text-blue-900">${(selectedQuoteToConvert.total || 0).toFixed(2)}</span>
                  </div>
                  {selectedQuoteToConvert.isConverted && (
                    <p className="text-xs text-amber-700 font-medium">
                      ⚠️ Note: This quotation has already been converted to Invoice #{selectedQuoteToConvert.invoiceNumber}. Converting again will open the existing document or update references.
                    </p>
                  )}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  onClick={() => setIsConvertQuotationModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  disabled={!selectedQuoteToConvert || convertQuotationMutation.isPending}
                  onClick={() => selectedQuoteToConvert && convertQuotationMutation.mutate(selectedQuoteToConvert.id)}
                  className="px-5 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl shadow-xs disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                >
                  {convertQuotationMutation.isPending ? <Loader2 className="animate-spin" size={15} /> : <FileCheck size={15} />}
                  Convert to Invoice
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ============================================================= */}
      {/* MODAL: RECORD PAYMENT & GENERATE RECEIPT                     */}
      {/* ============================================================= */}
      <AnimatePresence>
        {isPaymentModalOpen && paymentInvoice && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2 text-emerald-600">
                  <ReceiptIcon size={20} />
                  <h3 className="font-bold text-slate-900 text-base">Record Payment & Issue Receipt</h3>
                </div>
                <button
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Invoice snapshot info */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs">
                <div className="flex justify-between font-bold text-slate-800">
                  <span>Invoice #:</span>
                  <span className="font-mono">{paymentInvoice.invoiceNumber}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Customer:</span>
                  <span>{paymentInvoice.customerName}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Invoice Total:</span>
                  <span className="font-mono font-bold">${paymentInvoice.total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-amber-600 font-bold pt-1 border-t border-slate-200">
                  <span>Current Outstanding Balance:</span>
                  <span className="font-mono">${paymentInvoice.outstandingBalance.toFixed(2)}</span>
                </div>
              </div>

              {/* Payment Input Fields */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">
                    Amount Received ($) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={paymentInvoice.outstandingBalance}
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(Number(e.target.value))}
                    className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-sm font-mono font-bold text-slate-900 focus:outline-hidden"
                  />
                  <p className="text-3xs text-slate-400 mt-1">
                    Partial payments are supported. Remaining balance after this payment: ${(Math.max(0, paymentInvoice.outstandingBalance - paymentAmount)).toFixed(2)}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Payment Method</label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold focus:outline-hidden"
                    >
                      <option value="Cash">Physical Cash (Drawer)</option>
                      <option value="Bank Transfer">Bank Transfer (EFT)</option>
                      <option value="Card">Debit / Credit Card</option>
                      <option value="Cheque">Bank Cheque</option>
                      <option value="Mobile Money">Mobile Money</option>
                    </select>
                  </div>

                  {paymentMethod !== "Cash" && (
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Bank Account</label>
                      <select
                        value={selectedBankAccountId}
                        onChange={(e) => setSelectedBankAccountId(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold focus:outline-hidden"
                      >
                        <option value="">-- Main Bank Account --</option>
                        {bankAccounts.map((b) => (
                          <option key={b.id} value={b.id}>{b.accountName} ({b.bankName})</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Payment Reference / Notes</label>
                  <input
                    type="text"
                    value={paymentNotes}
                    onChange={(e) => setPaymentNotes(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs focus:outline-hidden"
                    placeholder="Transaction reference number..."
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  disabled={recordPaymentMutation.isPending || paymentAmount <= 0}
                  onClick={() => {
                    recordPaymentMutation.mutate({
                      invoiceId: paymentInvoice.id,
                      amountReceived: paymentAmount,
                      paymentMethod,
                      bankAccountId: selectedBankAccountId || undefined,
                      notes: paymentNotes,
                    });
                  }}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                >
                  {recordPaymentMutation.isPending ? <Loader2 className="animate-spin" size={15} /> : <ReceiptIcon size={15} />}
                  Confirm Payment & Issue Receipt
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Unified Document Print & PDF Modal */}
      {previewDocument && (
        <UnifiedDocumentModal
          isOpen={isPreviewModalOpen}
          onClose={() => { setIsPreviewModalOpen(false); setPreviewDocument(null); }}
          document={previewDocument}
        />
      )}
    </div>
  );
};
