import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  X, 
  Printer, 
  Download, 
  ZoomIn, 
  ZoomOut, 
  FileText, 
  CheckCircle2, 
  ShieldCheck, 
  Building2, 
  Mail, 
  Calendar,
  Sparkles,
  Phone,
  AlertCircle
} from "lucide-react";
import { Quotation, Receipt } from "../types";
import { settingsService } from "../services/api";
import { getMergedCompanySettings } from "../constants/defaultSettings";
import { QUOTATION_TERMS_AND_CONDITIONS } from "../constants/termsAndConditions";
import { PrintConfirmationModal } from "./PrintConfirmationModal";

interface PdfPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: {
    type: "quotation" | "receipt";
    data: Quotation | Receipt;
    aiCoverNote?: string | null;
  } | null;
  onDownload?: () => void;
}

export const PdfPreviewModal: React.FC<PdfPreviewModalProps> = ({
  isOpen,
  onClose,
  document,
  onDownload
}) => {
  const [zoom, setZoom] = useState<number>(100);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState<boolean>(false);

  const { data: settings } = useQuery({
    queryKey: ["company-settings"],
    queryFn: settingsService.get
  });

  if (!isOpen || !document) return null;

  const companySettings = getMergedCompanySettings(settings);
  const companyName = companySettings.companyName;
  const companySubtitle = companySettings.companySubtitle;
  const tagline = companySettings.tagline;
  const logoUrl = companySettings.logoUrl;
  const logoInitials = companySettings.logoInitials;
  const streetAddress = companySettings.streetAddress;
  const city = companySettings.city;
  const country = companySettings.country;
  const email = companySettings.email;
  const tel = companySettings.tel;
  const mobile = companySettings.mobile;
  const mobile2 = companySettings.mobile2;
  const vatNumber = companySettings.vatNumber;
  const tinNumber = companySettings.tinNumber;
  const bankName = companySettings.bankName;
  const accountName = companySettings.accountName;
  const accountNumber = companySettings.accountNumber;
  const rtgsAccountNumber = companySettings.rtgsAccountNumber || companySettings.accountNumber || "0112458920101";
  const usdAccountNumber = companySettings.usdAccountNumber || companySettings.accountNumber || "9140001827461";
  const ecocashNumber = companySettings.ecocashNumber;
  const currency = companySettings.currency;
  const salesType = companySettings.salesType;
  const doneBy = companySettings.doneBy;
  const footerTerms = companySettings.footerTerms;

  const isQuotation = document.type === "quotation";
  const quoteData = isQuotation ? (document.data as Quotation) : null;
  const receiptData = !isQuotation ? (document.data as Receipt) : null;

  const docNumber = isQuotation ? quoteData?.quotationNumber : receiptData?.receiptNumber;
  const customerName = isQuotation ? quoteData?.customerName : receiptData?.customerName;
  const customerEmail = isQuotation ? quoteData?.customerEmail : receiptData?.customerEmail;
  const customerPhone = isQuotation ? quoteData?.customerPhone : receiptData?.customerPhone;
  const customerAddress = isQuotation ? quoteData?.customerAddress : receiptData?.customerAddress;
  const isDraftQuote = isQuotation && quoteData?.status === "Draft" && !quoteData?.date;
  const date = isDraftQuote ? "Draft (Pending Issue)" : (document.data.date || "Pending Issue");
  const expiryDate = (!isDraftQuote && quoteData?.date) ? (quoteData.expiryDate || "30 Days from date of issue") : "30 Days from date of issue";
  const lines = document.data.lines || [];
  const subtotal = document.data.subtotal || 0;
  const taxAmount = document.data.taxAmount || 0;
  const discountAmount = document.data.discountAmount || 0;
  const total = document.data.total || 0;

  const fileName = `${companyName.replace(/\s+/g, '_')}_${isQuotation ? "Quotation" : "Receipt"}_${docNumber}.pdf`;

  const handlePrint = () => {
    setIsConfirmDialogOpen(true);
  };

  const handleExecutePrint = () => {
    setTimeout(() => {
      window.print();
    }, 150);
  };

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 15, 150));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 15, 70));

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950/80 backdrop-blur-md transition-all duration-200 print:bg-white print:p-0 print:static print:inset-auto print:block">
      
      {/* 1. PDF VIEWER HEADER / TOOLBAR (Hidden during print) */}
      <div className="flex-none bg-slate-900 border-b border-slate-800 px-4 py-3 flex items-center justify-between shadow-lg text-white print:hidden">
        
        {/* Document Info Title */}
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-xl">
            <FileText size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm tracking-tight text-white font-mono">{fileName}</h3>
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                isQuotation 
                  ? "bg-purple-500/10 text-purple-300 border-purple-500/30" 
                  : "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
              }`}>
                {isQuotation ? "PDF Quote Preview" : "PDF Receipt Preview"}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Ready for high-resolution vector printing & client dispatch
            </p>
          </div>
        </div>

        {/* Zoom & Page Navigation Controls */}
        <div className="hidden md:flex items-center gap-2 bg-slate-800/80 border border-slate-700/60 rounded-xl px-3 py-1.5 text-xs text-slate-300">
          <button 
            onClick={handleZoomOut} 
            disabled={zoom <= 70}
            className="p-1 hover:bg-slate-700 rounded transition-colors disabled:opacity-40"
            title="Zoom Out"
          >
            <ZoomOut size={14} />
          </button>
          <span className="font-mono font-bold w-12 text-center text-blue-400">{zoom}%</span>
          <button 
            onClick={handleZoomIn} 
            disabled={zoom >= 150}
            className="p-1 hover:bg-slate-700 rounded transition-colors disabled:opacity-40"
            title="Zoom In"
          >
            <ZoomIn size={14} />
          </button>
          <div className="h-3 w-px bg-slate-700 mx-1" />
          <span className="text-[11px] font-mono text-slate-400">Page 1 of 1</span>
        </div>

        {/* Action Controls (Download, Trigger Print Command, Close) */}
        <div className="flex items-center gap-2">
          {onDownload && (
            <button
              onClick={onDownload}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
            >
              <Download size={14} />
              <span className="hidden sm:inline">Download PDF</span>
            </button>
          )}

          <button
            onClick={handlePrint}
            id="btn-trigger-pdf-print"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-md shadow-blue-900/40"
          >
            <Printer size={15} />
            <span>Print Document</span>
          </button>

          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition-colors ml-1"
            title="Close Preview"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* 2. PDF VIEWER CANVAS VIEWPORT */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-8 flex justify-center items-start custom-scrollbar print:p-0 print:overflow-visible">
        
        {/* Printable PDF Document Sheet (A4 Paper Aspect & Style) */}
        <div 
          id="pdf-document-printable-area"
          style={{ transform: `scale(${zoom / 100})`, transformOrigin: "top center" }}
          className="bg-white text-slate-900 rounded-none sm:rounded-2xl shadow-2xl border border-slate-200/80 w-full max-w-[800px] p-6 sm:p-10 space-y-5 transition-transform duration-150 relative overflow-hidden print:shadow-none print:border-none print:max-w-none print:w-full print:p-0 print:m-0 print:rounded-none font-sans"
        >
          {/* Top Title Bar */}
          <div className="text-center space-y-1 pb-1">
            <h1 className="font-extrabold text-2xl text-slate-950 uppercase tracking-wide">
              {companyName}
            </h1>
            <div className="w-full border-b border-slate-900" />
            <p className="font-bold text-xs text-slate-800 uppercase tracking-tight">
              {companySubtitle || companyName}
            </p>
          </div>

          {/* Header Grid: Left (Logo & Address) | Right (Phone, Tax IDs) */}
          <div className="grid grid-cols-2 gap-4 text-xs font-mono">
            {/* Left Column */}
            <div className="space-y-2">
              {logoUrl ? (
                <img src={logoUrl} alt="Company Logo" className="h-10 object-contain" />
              ) : (
                <div className="inline-block px-3 py-1 bg-blue-900 text-white font-black rounded-xs text-xs">
                  {logoInitials}
                </div>
              )}
              <div className="space-y-0.5 text-slate-800 uppercase font-bold text-[11px] leading-snug">
                <p>{streetAddress}</p>
                <p>{city}</p>
                <p>{country}</p>
                <p className="normal-case pt-1 text-slate-700 font-semibold"><span className="font-mono text-slate-500 font-bold">Email:</span> {email}</p>
              </div>
            </div>

            {/* Right Column */}
            <div className="text-right space-y-1 text-slate-800 text-[11px]">
              <div className="flex justify-end gap-2">
                <span className="text-slate-500 font-bold font-mono">Tel:</span>
                <span className="font-mono">{tel}</span>
              </div>
              <div className="flex justify-end gap-2">
                <span className="text-slate-500 font-bold font-mono">Mobile:</span>
                <div className="text-right font-mono">
                  <p>{mobile}</p>
                  {mobile2 && <p>{mobile2}</p>}
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <span className="text-slate-500 font-bold font-mono">VAT No:</span>
                <span className="font-mono font-bold">{vatNumber}</span>
              </div>
              <div className="flex justify-end gap-2">
                <span className="text-slate-500 font-bold font-mono">TIN No:</span>
                <span className="font-mono font-bold">{tinNumber}</span>
              </div>
            </div>
          </div>

          {/* Tagline Slogan Line */}
          {tagline && (
            <div className="text-center">
              <p className="text-xs font-serif italic text-slate-800 border-t border-b border-slate-300 py-1 font-medium">
                {tagline}
              </p>
            </div>
          )}

          {/* Centered Document Type Banner */}
          <div className="text-center pt-1">
            <h2 className="text-base font-extrabold tracking-widest uppercase text-slate-950 font-mono">
              {isQuotation ? "QUOTATION" : "RECEIPT"}
            </h2>
          </div>

          {/* Side-by-Side Customer & Quotation Detail Boxes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Customer Box */}
            <div className="border border-amber-900/40 rounded-xl p-3.5 space-y-1 font-mono text-xs text-slate-900 bg-amber-50/10 min-w-0 overflow-hidden break-words">
              <div className="flex gap-2 min-w-0">
                <span className="text-slate-500 font-bold w-20 shrink-0">Customer:</span>
                <span className="font-extrabold text-slate-950 break-words">{customerName || "Valued Customer"}</span>
              </div>
              {customerAddress && (
                <div className="flex gap-2 min-w-0">
                  <span className="text-slate-500 font-bold w-20 shrink-0">Address:</span>
                  <span className="break-words whitespace-normal leading-relaxed">{customerAddress}</span>
                </div>
              )}
              {customerPhone && (
                <div className="flex gap-2 min-w-0">
                  <span className="text-slate-500 font-bold w-20 shrink-0">Phone:</span>
                  <span className="break-all">{customerPhone}</span>
                </div>
              )}
              {customerEmail && (
                <div className="flex gap-2 min-w-0">
                  <span className="text-slate-500 font-bold w-20 shrink-0">Email:</span>
                  <span className="break-all">{customerEmail}</span>
                </div>
              )}
            </div>

            {/* Document Metadata Box */}
            <div className="space-y-2 min-w-0">
              <div className="border border-amber-900/40 rounded-xl p-3.5 space-y-1 font-mono text-xs text-slate-900 bg-amber-50/10">
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500 font-bold whitespace-nowrap">{isQuotation ? "Quotation No:" : "Receipt No:"}</span>
                  <span className="font-extrabold text-slate-950 truncate">{docNumber}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500 font-bold whitespace-nowrap">{isQuotation ? "Date Issued:" : "Date:"}</span>
                  <span>{date}</span>
                </div>
                {isQuotation && (
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-500 font-bold whitespace-nowrap">Valid Until:</span>
                    <span>{expiryDate}</span>
                  </div>
                )}
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500 font-bold whitespace-nowrap">Sales Type:</span>
                  <span>{salesType}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500 font-bold whitespace-nowrap">Done By:</span>
                  <span className="font-bold">{doneBy}</span>
                </div>
              </div>

              <div className="border border-amber-900/40 rounded-lg p-2 px-4 flex justify-between font-mono text-xs font-bold text-slate-950 bg-amber-50/20">
                <span>Currency:</span>
                <span className="text-blue-900">{currency}</span>
              </div>
            </div>
          </div>

          {/* AI Cover Note if available */}
          {document.aiCoverNote && (
            <div className="bg-blue-50/60 border border-blue-200 p-3 rounded-xl space-y-1">
              <div className="flex items-center gap-1.5 text-blue-900 font-bold text-xs">
                <Sparkles size={14} className="text-blue-600" />
                <span>Executive Summary / Context</span>
              </div>
              <p className="text-xs text-slate-800 italic font-serif leading-relaxed">
                "{document.aiCoverNote}"
              </p>
            </div>
          )}

          {/* Line Items Table - Fixed width and dynamic text wrapping */}
          <div className="pt-2">
            <table className="w-full table-fixed text-left border-collapse font-mono text-xs">
              <thead>
                <tr className="border-t-2 border-b-2 border-slate-900 text-slate-900 font-extrabold">
                  <th className="py-2 pr-2 w-28">Item Code</th>
                  <th className="py-2 px-2">Item Description</th>
                  <th className="py-2 px-2 w-20 text-center">Quantity</th>
                  <th className="py-2 px-2 w-24 text-right">Price (Incl)</th>
                  <th className="py-2 px-2 w-20 text-right">Tax</th>
                  <th className="py-2 pl-2 w-28 text-right">EXT (Incl)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-900">
                {lines.map((line, index) => {
                  const lineTax = line.totalPrice * 0.15;
                  const itemCode = `ITEM-${1000 + index}`;
                  return (
                    <tr key={index} className="hover:bg-slate-50">
                      <td className="py-2 pr-2 text-slate-500 font-mono text-[11px] align-top break-all whitespace-normal">{itemCode}</td>
                      <td className="py-2 px-2 font-sans font-bold text-slate-900 uppercase text-[11px] align-top break-words whitespace-normal">
                        {line.productName}
                      </td>
                      <td className="py-2 px-2 text-center font-bold align-top whitespace-nowrap">{line.quantity.toFixed(2)}</td>
                      <td className="py-2 px-2 text-right align-top whitespace-nowrap">{line.unitPrice.toFixed(2)}</td>
                      <td className="py-2 px-2 text-right text-slate-600 align-top whitespace-nowrap">{lineTax.toFixed(2)}</td>
                      <td className="py-2 pl-2 text-right font-bold text-slate-950 align-top whitespace-nowrap">
                        {line.totalPrice.toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Subtotals & Banking / Payment Footer Details */}
          <div className="pt-4 border-t-2 border-slate-900 space-y-4 font-mono text-xs">
            
            {/* Totals Summary */}
            <div className="space-y-1.5 bg-slate-50 p-3 rounded-lg border border-slate-200">
              <div className="flex justify-between items-center text-slate-600 text-xs">
                <span>Subtotal:</span>
                <span className="font-bold text-slate-900">{currency} {subtotal.toFixed(2)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between items-center text-rose-600 text-xs">
                  <span>Discount:</span>
                  <span className="font-bold">- {currency} {discountAmount.toFixed(2)}</span>
                </div>
              )}
              {taxAmount > 0 && (
                <div className="flex justify-between items-center text-slate-600 text-xs">
                  <span>VAT / Sales Tax:</span>
                  <span className="font-bold text-slate-900">{currency} {taxAmount.toFixed(2)}</span>
                </div>
              )}
              {isQuotation && (quoteData?.include_import_costs || quoteData?.includeImportCosts) && (quoteData?.total_import_costs || quoteData?.totalImportCosts || 0) > 0 && (
                <div className="flex justify-between items-center text-slate-600 text-xs">
                  <span>Total Import Costs:</span>
                  <span className="font-bold text-slate-900">{currency} {(quoteData?.total_import_costs ?? quoteData?.totalImportCosts ?? 0).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between items-center text-slate-900 font-extrabold text-sm pt-1 border-t border-slate-200">
                <span className="uppercase tracking-wide">{footerTerms}</span>
                <span className="text-base text-blue-900">{currency} {total.toFixed(2)}</span>
              </div>
            </div>

            {/* Payment & Settlement Details Box */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 bg-slate-50/60 rounded-xl text-[11px] text-slate-800 border border-slate-200">
              <div className="space-y-1 font-mono">
                <p className="font-bold text-slate-900 uppercase text-xs flex items-center gap-1">
                  <Building2 size={13} className="text-blue-700" /> Bank Settlement Details
                </p>
                <p><span className="text-slate-500 font-bold">Bank:</span> {bankName}</p>
                <p><span className="text-slate-500 font-bold">Account Name:</span> {accountName}</p>
                {(!isQuotation || Boolean(quoteData?.allowZiGPayments ?? quoteData?.allow_zig_payments)) && (
                  <p><span className="text-slate-500 font-bold">RTGS:</span> <strong className="text-slate-900 font-mono">{rtgsAccountNumber}</strong></p>
                )}
                <p><span className="text-slate-500 font-bold">USD:</span> <strong className="text-slate-900 font-mono">{usdAccountNumber}</strong></p>
              </div>

              <div className="space-y-1 font-mono sm:text-right">
                <p className="font-bold text-slate-900 uppercase text-xs flex items-center sm:justify-end gap-1">
                  Mobile Merchant
                </p>
                {ecocashNumber && (
                  <>
                    <p><span className="text-slate-500 font-bold">EcoCash Number:</span></p>
                    <p className="font-bold font-mono text-slate-950 text-xs bg-slate-100 px-2 py-0.5 rounded inline-block">
                      {ecocashNumber}
                    </p>
                  </>
                )}
              </div>
            </div>

            {/* Full-Width Official Quotation Payment Notice Panel (Positioned after Bank Settlement Details, before Terms & Conditions) */}
            {isQuotation && (
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-300 space-y-2 font-mono text-xs text-slate-900">
                <div className="font-extrabold uppercase text-[11px] tracking-wider text-slate-900 flex items-center gap-1.5 border-b border-slate-200 pb-1.5">
                  <AlertCircle size={14} className="text-blue-700 shrink-0" />
                  <span>PAYMENT NOTICE</span>
                </div>
                <div className="space-y-1">
                  <p className="font-semibold text-slate-900 leading-relaxed">
                    {Boolean(quoteData?.allowZiGPayments ?? quoteData?.allow_zig_payments) ? (
                      <>Payments in <strong className="font-extrabold text-slate-950">ZiG and USD are permitted</strong>.</>
                    ) : (
                      <>Payments accepted in <strong className="font-extrabold text-slate-950">USD only</strong>.</>
                    )}
                  </p>
                  <p className="text-slate-700 leading-relaxed text-[11px]">
                    A <strong className="font-bold text-slate-950">3% withdrawal fee</strong> applies to USD payments made via <strong className="font-bold text-slate-950">EcoCash or other applicable electronic wallet services</strong>.
                  </p>
                </div>
              </div>
            )}

            {/* Terms & Conditions (Quotation Only when enabled) */}
            {isQuotation && (quoteData?.include_terms_conditions || quoteData?.includeTermsConditions) && (
              <div className="pt-2 border-t border-slate-300 space-y-2">
                <p className="font-bold text-xs text-slate-900 uppercase tracking-wider">Terms & Conditions</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-[9.5px] font-sans text-slate-600 leading-relaxed">
                  {QUOTATION_TERMS_AND_CONDITIONS.map((clause, idx) => (
                    <div key={idx} className="bg-slate-50/80 p-2 rounded border border-slate-200/70">
                      <p className="font-bold text-slate-800 text-[10px]">{clause.title}</p>
                      <p className="text-slate-600">{clause.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Official Computer Generated Disclaimer */}
            <div className="text-center pt-2 text-[10px] text-slate-400 uppercase font-mono">
              *** Official Computer Generated Document. Valid Without Physical Stamp ***
            </div>

          </div>

        </div>
      </div>

      {/* Verification Dialog before triggering browser print */}
      <PrintConfirmationModal
        isOpen={isConfirmDialogOpen}
        onClose={() => setIsConfirmDialogOpen(false)}
        onConfirmPrint={handleExecutePrint}
        documentData={document}
      />
    </div>
  );
};
