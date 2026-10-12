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
  financialService,
  supplierService
} from "../services/api";
import { Invoice, Quotation, Customer, Product, BankAccount, Supplier } from "../types";
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
  Send,
  Package,
  Layers,
  AlertTriangle
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { UnifiedDocumentModal } from "../components/UnifiedDocumentModal";
import { ProductAutocompleteSelect } from "../components/ProductAutocompleteSelect";

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

  // Delete Invoice state
  const [invoiceToDelete, setInvoiceToDelete] = useState<Invoice | null>(null);

  // Reverse Payment state
  const [invoiceToReversePayment, setInvoiceToReversePayment] = useState<Invoice | null>(null);
  const [reversalNotes, setReversalNotes] = useState("");

  // Sourcing Details state
  const [sourcingInvoice, setSourcingInvoice] = useState<Invoice | null>(null);
  const [isSourcingModalOpen, setIsSourcingModalOpen] = useState(false);
  const [sourcingGeneralNotes, setSourcingGeneralNotes] = useState("");
  const [sourcingLineFormState, setSourcingLineFormState] = useState<Record<string, {
    sourcingSupplier: string;
    sourcingReference: string;
    sourcingDate: string;
    sourcingCost: number;
    sourcingNotes: string;
    adjustInventoryStock: boolean;
  }>>({});

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

  const { data: suppliers = [] } = useQuery({
    queryKey: ["suppliers"],
    queryFn: () => supplierService.getAll(),
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
      enableTax: false,
      taxRate: 0,
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
      const cust = customers.find(c => c.id === data.customerId);
      if (!cust) {
        showToast("Selected customer record could not be resolved. Please select a valid customer.", "error");
        throw new Error("Invalid customer selected.");
      }
      return invoiceService.create({
        customerId: data.customerId,
        customerName: cust.name,
        customerEmail: cust.email,
        customerPhone: cust.phone,
        customerAddress: cust.address,
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
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      showToast(`Invoice #${newInv.invoiceNumber} successfully generated. Product stock automatically deducted.`, "success");
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
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["quotations"] });
      queryClient.invalidateQueries({ queryKey: ["systemLogs"] });
      showToast(`Quotation converted to Invoice #${newInv.invoiceNumber}! Stock automatically deducted.`, "success");
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

  // Delete Invoice mutation (automatically restores deducted stock)
  const deleteInvoiceMutation = useMutation({
    mutationFn: (id: string) => invoiceService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["quotations"] });
      queryClient.invalidateQueries({ queryKey: ["systemLogs"] });
      showToast(`Invoice #${invoiceToDelete?.invoiceNumber} deleted and stock quantities restored to inventory!`, "success");
      setInvoiceToDelete(null);
      if (view === "view") {
        setView("list");
      }
    },
    onError: (err: any) => {
      showToast(err.message || "Failed to delete invoice.", "error");
    }
  });

  // Reverse Payment mutation (e.g. if user made a mistake and clicked Paid)
  const reversePaymentMutation = useMutation({
    mutationFn: ({ id, notes }: { id: string; notes?: string }) => invoiceService.reversePayment(id, notes),
    onSuccess: (updatedInv) => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["receipts"] });
      queryClient.invalidateQueries({ queryKey: ["cashBook"] });
      queryClient.invalidateQueries({ queryKey: ["bankAccounts"] });
      queryClient.invalidateQueries({ queryKey: ["financialSummary"] });
      queryClient.invalidateQueries({ queryKey: ["systemLogs"] });
      showToast(`Payment on Invoice #${updatedInv.invoiceNumber} reversed! Status reset to Issued with full outstanding balance ($${(updatedInv.total || 0).toFixed(2)}).`, "success");
      setInvoiceToReversePayment(null);
      setReversalNotes("");
    },
    onError: (err: any) => {
      showToast(err.message || "Failed to reverse invoice payment.", "error");
    }
  });

  // Update Sourcing Details mutation
  const updateSourcingMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) => invoiceService.updateSourcingDetails(id, payload),
    onSuccess: (updatedInv) => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["systemLogs"] });
      showToast(`Sourcing & item origin details saved for Invoice #${updatedInv.invoiceNumber}!`, "success");
      setIsSourcingModalOpen(false);
      setSourcingInvoice(null);
    },
    onError: (err: any) => {
      showToast(err.message || "Failed to save sourcing details.", "error");
    }
  });

  const handleOpenSourcingModal = (inv: Invoice) => {
    setSourcingInvoice(inv);
    setSourcingGeneralNotes(inv.sourcingNotes || "");
    const initialLineState: Record<string, any> = {};
    inv.lines.forEach((l) => {
      initialLineState[l.productId] = {
        sourcingSupplier: l.sourcingSupplier || "",
        sourcingReference: l.sourcingReference || "",
        sourcingDate: l.sourcingDate || new Date().toISOString().split("T")[0],
        sourcingCost: l.sourcingCost !== undefined ? l.sourcingCost : l.unitPrice,
        sourcingNotes: l.sourcingNotes || "",
        adjustInventoryStock: Boolean(l.isOverOrdered && (l.deficitQty || 0) > 0),
      };
    });
    setSourcingLineFormState(initialLineState);
    setIsSourcingModalOpen(true);
  };

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
                    <tr 
                      key={inv.id} 
                      className={`transition-colors ${
                        inv.hasStockDeficit && !inv.sourcingResolved 
                          ? 'bg-amber-50/40 hover:bg-amber-50/80 border-l-4 border-l-amber-500' 
                          : 'hover:bg-slate-50/80'
                      }`}
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span>{inv.invoiceNumber}</span>
                            {inv.hasStockDeficit && (
                              <span 
                                title={
                                  inv.sourcingResolved 
                                    ? "External origin & supplier references recorded" 
                                    : "Stock Deficit: Item quantity exceeded warehouse inventory at dispatch"
                                }
                                className={`px-1.5 py-0.5 rounded text-3xs font-sans font-bold flex items-center gap-0.5 ${
                                  inv.sourcingResolved 
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                                    : 'bg-amber-100 text-amber-900 border border-amber-300'
                                }`}
                              >
                                <AlertTriangle size={10} className={inv.sourcingResolved ? 'text-emerald-700' : 'text-amber-600'} />
                                {inv.sourcingResolved ? "Sourced" : "Deficit"}
                              </span>
                            )}
                          </div>
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
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          {/* View Detail */}
                          <button
                            onClick={() => { setSelectedInvoiceId(inv.id); setView("view"); }}
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors cursor-pointer"
                            title="View Invoice Details"
                          >
                            <Eye size={14} />
                          </button>

                          {/* Print / Download PDF */}
                          <button
                            onClick={() => { setPreviewDocument({ type: "invoice", data: inv }); setIsPreviewModalOpen(true); }}
                            className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition-colors cursor-pointer border border-blue-200"
                            title="Print & Download PDF"
                          >
                            <Printer size={14} />
                          </button>

                          {/* Record Payment (if outstanding) */}
                          {inv.status !== "Paid" && inv.status !== "Cancelled" && inv.status !== "Void" && (
                            <button
                              onClick={() => handleOpenPaymentModal(inv)}
                              className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-3xs font-bold transition-colors cursor-pointer flex items-center gap-1 shadow-xs"
                              title="Record Settlement / Generate Receipt"
                            >
                              <ReceiptIcon size={12} />
                              Pay
                            </button>
                          )}

                          {/* Reverse Payment (if any payment was recorded or marked Paid by mistake) */}
                          {((inv.amountPaid || 0) > 0 || inv.status === "Paid" || inv.status === "Partially Paid") && (
                            <button
                              onClick={() => {
                                setInvoiceToReversePayment(inv);
                                setReversalNotes("");
                              }}
                              className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg text-3xs font-bold transition-colors cursor-pointer border border-amber-300 flex items-center gap-1"
                              title="Reverse payment back to Unpaid/Issued (e.g. if clicked Paid by mistake)"
                            >
                              <RefreshCw size={11} className="text-amber-600" />
                              Reverse
                            </button>
                          )}

                          {/* Sourcing Details (if stock deficit flagged) */}
                          {inv.hasStockDeficit && (
                            <button
                              onClick={() => handleOpenSourcingModal(inv)}
                              className={`p-1.5 rounded-lg transition-colors cursor-pointer border ${
                                inv.sourcingResolved
                                  ? 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200'
                                  : 'bg-amber-100 hover:bg-amber-200 text-amber-900 border-amber-300'
                              }`}
                              title={inv.sourcingResolved ? "Edit Sourcing Details" : "Record Supplier / Sourcing Details for Deficit Items"}
                            >
                              <Building2 size={13} />
                            </button>
                          )}

                          {/* Delete Invoice (restores stock) */}
                          <button
                            onClick={() => setInvoiceToDelete(inv)}
                            className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-700 rounded-lg transition-colors cursor-pointer border border-rose-200"
                            title="Delete Invoice and restore product quantities to inventory"
                          >
                            <Trash2 size={14} />
                          </button>
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
              Create New Sales Invoice
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
                      <ProductAutocompleteSelect
                        products={products}
                        value={prodId || ""}
                        onChange={(newId) => {
                          setValue(`items.${idx}.productId`, newId, { shouldValidate: true, shouldDirty: true });
                        }}
                        placeholder="Search product name, SKU, or keywords..."
                        autoFocus={!prodId}
                        error={(errors.items as any)?.[idx]?.productId?.message}
                        id={`invoice-item-select-${idx}`}
                      />
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

                    {/* Stock Deficit Warning (non-blocking) */}
                    {selectedProd && qty > selectedProd.quantity && (
                      <div className="col-span-12 px-3 py-1.5 bg-amber-50/90 border border-amber-200/90 rounded-lg flex items-center justify-between text-3xs font-medium text-amber-900 animate-fadeIn">
                        <span className="flex items-center gap-1.5 font-bold">
                          <AlertTriangle size={13} className="text-amber-600 shrink-0" />
                          Stock Deficit Notice: Ordered {qty} units, but only {selectedProd.quantity} currently on-hand in inventory.
                        </span>
                        <span className="bg-amber-200 text-amber-950 font-bold px-2 py-0.5 rounded text-3xs">
                          +{qty - selectedProd.quantity} will be flagged for external sourcing
                        </span>
                      </div>
                    )}
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

              <div className="flex items-center gap-2 flex-wrap">
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

                {/* Reverse Payment (if marked Paid by mistake) */}
                {((selectedInvoice.amountPaid || 0) > 0 || selectedInvoice.status === "Paid" || selectedInvoice.status === "Partially Paid") && (
                  <button
                    onClick={() => {
                      setInvoiceToReversePayment(selectedInvoice);
                      setReversalNotes("");
                    }}
                    className="px-4 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 border border-amber-300"
                    title="Reverse payment back to Unpaid/Issued"
                  >
                    <RefreshCw size={14} className="text-amber-600" /> Reverse Payment
                  </button>
                )}

                {/* Delete Invoice (restores stock) */}
                <button
                  onClick={() => setInvoiceToDelete(selectedInvoice)}
                  className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 border border-rose-200"
                  title="Delete invoice and restore product quantities to warehouse inventory"
                >
                  <Trash2 size={14} className="text-rose-600" /> Delete Invoice
                </button>
              </div>
            </div>

            {/* Stock Deficit / Special Order Banner */}
            {selectedInvoice.hasStockDeficit && (
              <div className="p-4 bg-amber-50/90 border border-amber-300 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs text-amber-900 animate-fadeIn">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 bg-amber-100 text-amber-800 rounded-xl mt-0.5">
                    <AlertTriangle size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold text-amber-950 text-sm">Stock Deficit / Special Order Flagged</h4>
                      {selectedInvoice.sourcingResolved ? (
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-3xs font-bold flex items-center gap-1">
                          <CheckCircle2 size={11} className="text-emerald-700" /> Sourcing Origin Logged
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-amber-200 text-amber-950 rounded-full text-3xs font-bold animate-pulse">
                          Action Needed: Record Item Origin
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                      {selectedInvoice.sourcingResolved
                        ? `External procurement origin and supplier references have been recorded for this order.`
                        : `This invoice was dispatched with quantities exceeding on-hand warehouse stock. You can record where the items were obtained (supplier, reference, cost) to keep inventory traceable.`}
                    </p>
                    {selectedInvoice.sourcingNotes && (
                      <p className="text-3xs font-mono text-amber-900 mt-2 bg-amber-100/70 p-2 rounded-lg border border-amber-200">
                        <strong>Procurement Log:</strong> {selectedInvoice.sourcingNotes}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleOpenSourcingModal(selectedInvoice)}
                  className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs shrink-0 flex items-center gap-1.5 cursor-pointer"
                >
                  <Building2 size={14} />
                  {selectedInvoice.sourcingResolved ? "Edit Sourcing Details" : "Log Sourcing Details"}
                </button>
              </div>
            )}

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
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">Invoice Line Items & Dispatch Status</h3>
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
                      <tr key={idx} className={line.isOverOrdered ? "bg-amber-50/20" : ""}>
                        <td className="py-3 px-4 font-bold text-slate-800">
                          <div className="flex flex-col">
                            <span>{line.productName}</span>
                            {line.isOverOrdered && (
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                <span className="px-1.5 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 rounded text-3xs font-bold flex items-center gap-1">
                                  <AlertTriangle size={10} className="text-amber-600" />
                                  Ordered &gt; stock (+{line.deficitQty} deficit units)
                                </span>
                                {line.sourcingSupplier && (
                                  <span className="text-3xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded font-mono font-medium">
                                    Supplier: <strong>{line.sourcingSupplier}</strong> {line.sourcingReference ? `(Ref: ${line.sourcingReference})` : ""}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-bold">{line.quantity}</td>
                        <td className="py-3 px-4 text-right font-mono">${line.unitPrice.toFixed(2)}</td>
                        <td className="py-3 px-4 text-right font-bold text-slate-900 font-mono">${line.totalPrice.toFixed(2)}</td>
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
                Select an existing sales quotation to convert into an official invoice. All items, customer info, discounts, and terms will be seamlessly copied.
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

      {/* ============================================================= */}
      {/* MODAL: REVERSE PAYMENT                                        */}
      {/* ============================================================= */}
      <AnimatePresence>
        {invoiceToReversePayment && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2 text-amber-600">
                  <RefreshCw size={20} />
                  <h3 className="font-bold text-slate-900 text-base">Reverse Invoice Payment</h3>
                </div>
                <button
                  onClick={() => setInvoiceToReversePayment(null)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 space-y-2 text-xs text-amber-900">
                <p className="font-bold text-amber-950 flex items-center gap-1.5">
                  <AlertTriangle size={15} className="text-amber-600 shrink-0" />
                  Made a mistake clicking &apos;Paid&apos;?
                </p>
                <p className="leading-relaxed">
                  Reversing this payment will reset the paid amount on Invoice <strong className="font-mono">#{invoiceToReversePayment.invoiceNumber}</strong> from <strong className="font-mono">${(invoiceToReversePayment.amountPaid || 0).toFixed(2)}</strong> back to <strong className="font-mono">$0.00</strong>, revert its status to <strong className="font-semibold">Issued (Unpaid)</strong>, and void linked payment receipt records.
                </p>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest">
                  Reason for Payment Reversal (Optional)
                </label>
                <input
                  type="text"
                  value={reversalNotes}
                  onChange={(e) => setReversalNotes(e.target.value)}
                  placeholder="e.g. Marked Paid by accident, payment check bounced, etc."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setInvoiceToReversePayment(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={reversePaymentMutation.isPending}
                  onClick={() => reversePaymentMutation.mutate({ id: invoiceToReversePayment.id, notes: reversalNotes })}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-xs disabled:opacity-50 flex items-center gap-2 cursor-pointer transition-colors"
                >
                  {reversePaymentMutation.isPending ? <Loader2 className="animate-spin" size={15} /> : <RefreshCw size={15} />}
                  Confirm Reversal & Mark Unpaid
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ============================================================= */}
      {/* MODAL: DELETE INVOICE (RESTORES INVENTORY STOCK)              */}
      {/* ============================================================= */}
      <AnimatePresence>
        {invoiceToDelete && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2 text-rose-600">
                  <Trash2 size={20} />
                  <h3 className="font-bold text-slate-900 text-base">Delete Sales Invoice</h3>
                </div>
                <button
                  onClick={() => setInvoiceToDelete(null)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs">
                <div className="flex justify-between text-slate-700 font-bold">
                  <span>Invoice Number:</span>
                  <span className="font-mono text-slate-900">#{invoiceToDelete.invoiceNumber}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Customer:</span>
                  <span>{invoiceToDelete.customerName}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Invoice Amount:</span>
                  <span className="font-mono font-bold">${(invoiceToDelete.total || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Current Status:</span>
                  <span className="font-semibold">{invoiceToDelete.status}</span>
                </div>
              </div>

              {/* Stock Return Guarantee Alert */}
              <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-900 space-y-1">
                <p className="font-bold text-emerald-950 flex items-center gap-1.5">
                  <Package size={15} className="text-emerald-700 shrink-0" />
                  Automatic Warehouse Stock Return
                </p>
                <p className="leading-relaxed">
                  Deleting this invoice will automatically replenish and restore all <strong className="font-mono font-bold">{invoiceToDelete.lines?.reduce((acc, l) => acc + (l.quantity || 0), 0) || 0} unit(s)</strong> back into your product inventory.
                </p>
              </div>

              {((invoiceToDelete.amountPaid || 0) > 0 || invoiceToDelete.status === "Paid") && (
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-3xs text-amber-900 leading-relaxed">
                  ⚠️ <strong>Notice:</strong> This invoice currently has recorded payments (${(invoiceToDelete.amountPaid || 0).toFixed(2)}). Deleting it will void the associated transaction records.
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setInvoiceToDelete(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={deleteInvoiceMutation.isPending}
                  onClick={() => deleteInvoiceMutation.mutate(invoiceToDelete.id)}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs disabled:opacity-50 flex items-center gap-2 cursor-pointer transition-colors"
                >
                  {deleteInvoiceMutation.isPending ? <Loader2 className="animate-spin" size={15} /> : <Trash2 size={15} />}
                  Delete & Restore Stock
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ============================================================= */}
      {/* MODAL: SOURCING & PROCUREMENT ORIGIN DETAILS                  */}
      {/* ============================================================= */}
      <AnimatePresence>
        {isSourcingModalOpen && sourcingInvoice && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-5 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2 text-amber-600">
                  <Building2 size={20} />
                  <h3 className="font-bold text-slate-900 text-base">
                    Sourcing & Origin Details — #{sourcingInvoice.invoiceNumber}
                  </h3>
                </div>
                <button
                  onClick={() => { setIsSourcingModalOpen(false); setSourcingInvoice(null); }}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 leading-relaxed">
                <p className="font-bold text-amber-950 flex items-center gap-1.5 mb-1">
                  <AlertTriangle size={14} className="text-amber-700" />
                  Special Order & External Stock Fulfillment
                </p>
                Record supplier names, procurement references, or purchase notes for items dispatched to satisfy this order. You can also replenish warehouse inventory if you have received the supplier delivery.
              </div>

              {/* General Sourcing Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                  General Procurement & Fulfillment Notes
                </label>
                <textarea
                  rows={2}
                  value={sourcingGeneralNotes}
                  onChange={(e) => setSourcingGeneralNotes(e.target.value)}
                  placeholder="e.g. Specially procured from local distributors to fulfill customer requirement..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs focus:outline-hidden text-slate-900 font-medium"
                />
              </div>

              {/* Line-by-Line Sourcing Configuration */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Itemized Sourcing Details
                </h4>

                {sourcingInvoice.lines.map((line) => {
                  const state = sourcingLineFormState[line.productId] || {
                    sourcingSupplier: "",
                    sourcingReference: "",
                    sourcingDate: new Date().toISOString().split("T")[0],
                    sourcingCost: line.unitPrice,
                    sourcingNotes: "",
                    adjustInventoryStock: Boolean(line.isOverOrdered && (line.deficitQty || 0) > 0),
                  };

                  return (
                    <div 
                      key={line.productId} 
                      className={`p-4 rounded-xl border space-y-3 text-xs ${
                        line.isOverOrdered 
                          ? 'bg-amber-50/40 border-amber-200' 
                          : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div>
                          <strong className="text-slate-900 text-xs">{line.productName}</strong>
                          <span className="text-slate-500 font-mono ml-2">(Qty: {line.quantity})</span>
                        </div>
                        {line.isOverOrdered && (
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-900 rounded-full text-3xs font-bold border border-amber-300">
                            +{line.deficitQty} deficit units backordered
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-3xs font-bold text-slate-400 uppercase mb-1">
                            Supplier / Sourcing Channel
                          </label>
                          <input
                            type="text"
                            list={`suppliers-list-${line.productId}`}
                            value={state.sourcingSupplier}
                            onChange={(e) => {
                              const val = e.target.value;
                              setSourcingLineFormState(prev => ({
                                ...prev,
                                [line.productId]: { ...state, sourcingSupplier: val }
                              }));
                            }}
                            placeholder="Supplier or distributor name..."
                            className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-semibold focus:outline-hidden"
                          />
                          <datalist id={`suppliers-list-${line.productId}`}>
                            {suppliers.map(s => (
                              <option key={s.id} value={s.name} />
                            ))}
                          </datalist>
                        </div>

                        <div>
                          <label className="block text-3xs font-bold text-slate-400 uppercase mb-1">
                            PO / Delivery / Sourcing Reference #
                          </label>
                          <input
                            type="text"
                            value={state.sourcingReference}
                            onChange={(e) => {
                              const val = e.target.value;
                              setSourcingLineFormState(prev => ({
                                ...prev,
                                [line.productId]: { ...state, sourcingReference: val }
                              }));
                            }}
                            placeholder="e.g. PO-8921 or DN-441"
                            className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-mono font-bold focus:outline-hidden"
                          />
                        </div>

                        <div>
                          <label className="block text-3xs font-bold text-slate-400 uppercase mb-1">
                            Sourcing / Order Date
                          </label>
                          <input
                            type="date"
                            value={state.sourcingDate}
                            onChange={(e) => {
                              const val = e.target.value;
                              setSourcingLineFormState(prev => ({
                                ...prev,
                                [line.productId]: { ...state, sourcingDate: val }
                              }));
                            }}
                            className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs focus:outline-hidden"
                          />
                        </div>

                        <div>
                          <label className="block text-3xs font-bold text-slate-400 uppercase mb-1">
                            Cost Price per Unit ($)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={state.sourcingCost}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              setSourcingLineFormState(prev => ({
                                ...prev,
                                [line.productId]: { ...state, sourcingCost: val }
                              }));
                            }}
                            className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-mono font-bold focus:outline-hidden"
                          />
                        </div>
                      </div>

                      {/* Checkbox to replenish stock for this deficit */}
                      {Boolean(line.isOverOrdered && (line.deficitQty || 0) > 0) && (
                        <div className="pt-2 border-t border-amber-200/80 flex items-center gap-2">
                          <input
                            type="checkbox"
                            id={`replenish-${line.productId}`}
                            checked={state.adjustInventoryStock}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setSourcingLineFormState(prev => ({
                                ...prev,
                                [line.productId]: { ...state, adjustInventoryStock: checked }
                              }));
                            }}
                            className="h-4 w-4 rounded text-blue-600 border-slate-300 cursor-pointer"
                          />
                          <label htmlFor={`replenish-${line.productId}`} className="text-xs text-slate-700 cursor-pointer font-medium select-none">
                            Received incoming stock: Replenish warehouse inventory (+{line.deficitQty} units)
                          </label>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => { setIsSourcingModalOpen(false); setSourcingInvoice(null); }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={updateSourcingMutation.isPending}
                  onClick={() => {
                    const lineUpdates = Object.keys(sourcingLineFormState).map(pId => ({
                      productId: pId,
                      ...sourcingLineFormState[pId]
                    }));
                    updateSourcingMutation.mutate({
                      id: sourcingInvoice.id,
                      payload: {
                        sourcingNotes: sourcingGeneralNotes,
                        lineUpdates
                      }
                    });
                  }}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-xs disabled:opacity-50 flex items-center gap-2 cursor-pointer transition-colors"
                >
                  {updateSourcingMutation.isPending ? <Loader2 className="animate-spin" size={15} /> : <CheckCircle2 size={15} />}
                  Save Sourcing & Origin Details
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
