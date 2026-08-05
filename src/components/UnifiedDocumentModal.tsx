import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  X, 
  Printer, 
  Download, 
  ZoomIn, 
  ZoomOut, 
  FileText, 
  ShieldCheck, 
  Building2, 
  AlertCircle, 
  QrCode, 
  Loader2, 
  Share2, 
  Check,
  FileCode,
  Maximize2,
  SlidersHorizontal,
  Smartphone,
  Receipt as ReceiptIcon
} from "lucide-react";
import { settingsService, customerService, supplierService, productService } from "../services/api";
import { getMergedCompanySettings } from "../constants/defaultSettings";
import { QUOTATION_TERMS_AND_CONDITIONS } from "../constants/termsAndConditions";
import { 
  SupportedDocumentType, 
  normalizeDocument,
  enrichDocumentData,
  exportDocumentToPdf, 
  exportElementToPdf, 
  triggerDocumentPrint,
  PaperSize,
  PageOrientation
} from "../utils/documentPrinter";

interface UnifiedDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: {
    type: SupportedDocumentType;
    data: any;
  } | null;
}

export const UnifiedDocumentModal: React.FC<UnifiedDocumentModalProps> = ({
  isOpen,
  onClose,
  document
}) => {
  const [zoom, setZoom] = useState<number>(100);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  // Print Preview Format Options
  const initialPaperSize: PaperSize = document?.type === "receipt" ? "thermal" : document?.type === "payment_voucher" ? "a5" : "a4";
  const initialOrientation: PageOrientation = document?.type === "payment_voucher" ? "landscape" : "portrait";

  const [paperSize, setPaperSize] = useState<PaperSize>(initialPaperSize);
  const [orientation, setOrientation] = useState<PageOrientation>(initialOrientation);

  const { data: settings } = useQuery({
    queryKey: ["company-settings"],
    queryFn: settingsService.get
  });

  const { data: rawCustomers } = useQuery({
    queryKey: ["customers-dropdown"],
    queryFn: () => customerService.getAll(),
  });
  const customers = Array.isArray(rawCustomers) ? rawCustomers : [];

  const { data: rawSuppliers } = useQuery({
    queryKey: ["suppliers"],
    queryFn: () => supplierService.getAll(),
  });
  const suppliers = Array.isArray(rawSuppliers) ? rawSuppliers : [];

  const { data: productsData } = useQuery({
    queryKey: ["products-dropdown"],
    queryFn: () => productService.getAll(),
  });
  const products = Array.isArray(productsData?.products) ? productsData.products : [];

  if (!isOpen || !document || !document.data) return null;

  const companySettings = getMergedCompanySettings(settings);
  const currencyDefault = companySettings.currency || "USD";
  const enrichedData = enrichDocumentData(document.type, document.data, { customers, suppliers, products });
  const normDoc = normalizeDocument(document.type, enrichedData, currencyDefault);

  // Company Brand Data
  const companyName = companySettings.companyName;
  const tagline = companySettings.tagline;
  const logoUrl = companySettings.logoUrl;
  const logoInitials = companySettings.logoInitials;
  const streetAddress = companySettings.streetAddress;
  const city = companySettings.city;
  const country = companySettings.country;
  const email = companySettings.email;
  const phone = companySettings.phone;
  const vatNumber = companySettings.vatNumber;
  const tinNumber = companySettings.tinNumber;
  const bankName = companySettings.bankName;
  const accountName = companySettings.accountName;
  const accountNumber = companySettings.accountNumber;
  const rtgsAccountNumber = companySettings.rtgsAccountNumber || companySettings.accountNumber;
  const usdAccountNumber = companySettings.usdAccountNumber || companySettings.accountNumber;
  const ecocashNumber = companySettings.ecocashNumber;
  const footerTerms = companySettings.footerTerms;

  const printableElementId = `printable-doc-${normDoc.documentNumber.replace(/[^a-zA-Z0-9]/g, '-')}`;
  const fileName = `${companyName.replace(/\s+/g, '_')}_${normDoc.docType.toUpperCase()}_${normDoc.documentNumber}_${paperSize.toUpperCase()}.pdf`;

  const handleDownloadPdf = async () => {
    try {
      setIsDownloading(true);
      await exportDocumentToPdf(normDoc, companySettings, fileName, { paperSize, orientation }, printableElementId);
    } catch (err) {
      console.error("Failed to export PDF:", err);
    } finally {
      setIsDownloading(false);
    }
  };

  const handlePrint = () => {
    triggerDocumentPrint();
  };

  const handleCopySummary = () => {
    const summaryText = `Document: ${normDoc.title}\nNumber: ${normDoc.documentNumber}\nParty: ${normDoc.partyName}\nTotal: ${normDoc.currency} $ ${normDoc.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}\nDate: ${normDoc.date}`;
    navigator.clipboard.writeText(summaryText);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 15, 150));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 15, 60));

  // Determine Sheet Max Width based on Paper Size & Orientation
  const getSheetDimensionsClass = () => {
    if (paperSize === "thermal") return "max-w-[360px] p-5 text-xs";
    if (paperSize === "a5") {
      return orientation === "landscape" ? "max-w-[760px] min-h-[520px] p-6 sm:p-8" : "max-w-[540px] min-h-[760px] p-6 sm:p-8";
    }
    if (paperSize === "letter") {
      return orientation === "landscape" ? "max-w-[1020px] min-h-[780px] p-8 sm:p-10" : "max-w-[780px] min-h-[1020px] p-8 sm:p-10";
    }
    // Default A4
    return orientation === "landscape" ? "max-w-[1040px] min-h-[740px] p-8 sm:p-10" : "max-w-[820px] min-h-[1080px] p-8 sm:p-12";
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950/90 backdrop-blur-md transition-all duration-200 print:bg-white print:p-0 print:static print:inset-auto print:block">
      
      {/* Native Browser Print Injector CSS */}
      <style>{`
        @media print {
          @page {
            size: ${paperSize === "thermal" ? "80mm auto" : `${paperSize} ${orientation}`};
            margin: ${paperSize === "thermal" ? "2mm" : "6mm"};
          }
          body {
            background: white !important;
            color: black !important;
          }
        }
      `}</style>

      {/* 1. TOP TOOLBAR & PRINT PREVIEW CONFIGURATION BAR */}
      <div className="flex-none bg-slate-900 border-b border-slate-800 px-4 py-3 shadow-xl text-white print:hidden space-y-3">
        
        {/* Row 1: Header Title & Main Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Document Info */}
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-xl shrink-0">
              <FileText size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-sm tracking-tight text-white font-mono">{normDoc.documentNumber}</h3>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border bg-blue-500/10 text-blue-300 border-blue-500/30">
                  {normDoc.title}
                </span>
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                  normDoc.status === "Approved" || normDoc.status === "Completed" || normDoc.status === "Received & Verified"
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                    : normDoc.status === "Reversed"
                    ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
                    : "bg-amber-500/10 text-amber-300 border-amber-500/30"
                }`}>
                  {normDoc.status}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Print Preview & Format Configuration Studio
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopySummary}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
              title="Copy Summary details to clipboard"
            >
              {copiedLink ? <Check size={14} className="text-emerald-400" /> : <Share2 size={14} />}
              <span className="hidden sm:inline">{copiedLink ? "Copied!" : "Share"}</span>
            </button>

            <button
              onClick={handleDownloadPdf}
              disabled={isDownloading}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm disabled:opacity-50"
            >
              {isDownloading ? <Loader2 size={14} className="animate-spin text-blue-400" /> : <Download size={14} />}
              <span className="hidden sm:inline">{isDownloading ? "Exporting..." : "Download PDF"}</span>
            </button>

            <button
              onClick={handlePrint}
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

        {/* Row 2: Print Settings Controls (Paper Size & Orientation) */}
        <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          
          {/* Format Settings Group */}
          <div className="flex flex-wrap items-center gap-3">
            
            {/* Paper Size Selector */}
            <div className="flex items-center gap-1.5 bg-slate-950/80 p-1 rounded-xl border border-slate-800">
              <span className="text-[10px] uppercase font-bold text-slate-400 px-2 font-mono flex items-center gap-1">
                <SlidersHorizontal size={12} className="text-blue-400" /> Paper:
              </span>
              <button
                onClick={() => setPaperSize("a4")}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                  paperSize === "a4" ? "bg-blue-600 text-white shadow-xs" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                A4
              </button>
              <button
                onClick={() => setPaperSize("a5")}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                  paperSize === "a5" ? "bg-blue-600 text-white shadow-xs" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                A5 Voucher
              </button>
              <button
                onClick={() => setPaperSize("letter")}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                  paperSize === "letter" ? "bg-blue-600 text-white shadow-xs" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Letter
              </button>
              <button
                onClick={() => setPaperSize("thermal")}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                  paperSize === "thermal" ? "bg-amber-600 text-white shadow-xs" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <ReceiptIcon size={12} /> Thermal 80mm
              </button>
            </div>

            {/* Page Orientation Selector (Disabled for POS Thermal) */}
            {paperSize !== "thermal" && (
              <div className="flex items-center gap-1.5 bg-slate-950/80 p-1 rounded-xl border border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-400 px-2 font-mono">
                  Orientation:
                </span>
                <button
                  onClick={() => setOrientation("portrait")}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                    orientation === "portrait" ? "bg-blue-600 text-white shadow-xs" : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <span className="text-xs">📄</span> Portrait
                </button>
                <button
                  onClick={() => setOrientation("landscape")}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                    orientation === "landscape" ? "bg-blue-600 text-white shadow-xs" : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <span className="text-xs">🖼️</span> Landscape
                </button>
              </div>
            )}
          </div>

          {/* Zoom & Reset Controls */}
          <div className="flex items-center gap-2 bg-slate-950/80 border border-slate-800 rounded-xl px-2.5 py-1 text-slate-300">
            <button 
              onClick={handleZoomOut} 
              disabled={zoom <= 60}
              className="p-1 hover:bg-slate-800 rounded transition-colors disabled:opacity-40"
              title="Zoom Out"
            >
              <ZoomOut size={14} />
            </button>
            <span className="font-mono font-bold w-10 text-center text-blue-400 text-xs">{zoom}%</span>
            <button 
              onClick={handleZoomIn} 
              disabled={zoom >= 150}
              className="p-1 hover:bg-slate-800 rounded transition-colors disabled:opacity-40"
              title="Zoom In"
            >
              <ZoomIn size={14} />
            </button>
            <div className="h-3 w-px bg-slate-800 mx-1" />
            <button
              onClick={() => setZoom(100)}
              className="text-[10px] font-mono text-slate-400 hover:text-white transition-colors"
            >
              Reset
            </button>
          </div>

        </div>
      </div>

      {/* 2. PRINTABLE DOCUMENT CANVAS CONTAINER */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-8 flex justify-center items-start custom-scrollbar print:p-0 print:overflow-visible">
        
        {/* Render Paper Sheet based on Format Selection */}
        <div 
          id={printableElementId}
          style={{ transform: `scale(${zoom / 100})`, transformOrigin: "top center" }}
          className={`bg-white text-slate-900 shadow-2xl border border-slate-200/80 w-full ${getSheetDimensionsClass()} space-y-6 transition-all duration-150 relative overflow-hidden print:shadow-none print:border-none print:max-w-none print:w-full print:p-0 print:m-0 print:rounded-none font-sans`}
        >
          {/* Document Reversal Warning Banner (If Voided/Reversed) */}
          {normDoc.reversalReason && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 flex items-start gap-2.5 text-xs text-rose-800 print:border-rose-300">
              <AlertCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">DOCUMENT VOIDED / REVERSED:</span> {normDoc.reversalReason}
              </div>
            </div>
          )}

          {/* IF THERMAL 80MM RECEIPT FORMAT */}
          {paperSize === "thermal" ? (
            <div className="font-mono text-slate-950 space-y-4 text-xs">
              {/* Thermal Logo & Header */}
              <div className="text-center space-y-1 border-b-2 border-dashed border-slate-800 pb-3">
                <h2 className="font-black text-base uppercase tracking-wider">{companyName}</h2>
                <p className="text-[10px] text-slate-700">{streetAddress}, {city}</p>
                <p className="text-[10px] text-slate-700">TEL: {phone}</p>
                <p className="text-[10px] text-slate-700">VAT: {vatNumber}</p>
                <div className="pt-2">
                  <span className="inline-block bg-slate-950 text-white font-bold px-3 py-1 text-[11px] uppercase tracking-widest rounded-sm">
                    {normDoc.title}
                  </span>
                </div>
              </div>

              {/* Thermal Metadata */}
              <div className="space-y-1 text-[11px] border-b border-dashed border-slate-400 pb-3">
                <div className="flex justify-between">
                  <span className="text-slate-600">SERIAL #:</span>
                  <span className="font-bold">{normDoc.documentNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">DATE:</span>
                  <span>{normDoc.date}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">PARTY:</span>
                  <span className="font-bold">{normDoc.partyName}</span>
                </div>
                {normDoc.paymentMethod && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">METHOD:</span>
                    <span>{normDoc.paymentMethod}</span>
                  </div>
                )}
              </div>

              {/* Thermal Lines Table */}
              <div className="space-y-2 border-b-2 border-dashed border-slate-800 pb-3">
                <div className="flex justify-between font-bold text-[10px] uppercase border-b border-slate-300 pb-1">
                  <span>ITEM / QTY</span>
                  <span>TOTAL ({normDoc.currency})</span>
                </div>
                {normDoc.lines.map((line, idx) => (
                  <div key={line.id || idx} className="space-y-0.5 text-[11px]">
                    <div className="flex justify-between font-semibold">
                      <span className="truncate max-w-[200px]">{line.description}</span>
                      <span>{line.total.toFixed(2)}</span>
                    </div>
                    <div className="text-[10px] text-slate-600 pl-2">
                      {line.quantity} x ${line.unitCostOrPrice.toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>

              {/* Thermal Totals */}
              <div className="space-y-1 text-xs border-b-2 border-slate-900 pb-3">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{normDoc.currency} ${normDoc.subtotal.toFixed(2)}</span>
                </div>
                {normDoc.discountAmount > 0 && (
                  <div className="flex justify-between text-rose-600">
                    <span>Discount:</span>
                    <span>-${normDoc.discountAmount.toFixed(2)}</span>
                  </div>
                )}
                {normDoc.taxAmount > 0 && (
                  <div className="flex justify-between">
                    <span>Tax:</span>
                    <span>${normDoc.taxAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-black text-sm pt-1 border-t border-slate-800">
                  <span>TOTAL:</span>
                  <span>{normDoc.currency} ${normDoc.totalAmount.toFixed(2)}</span>
                </div>
              </div>

              {/* Thermal Footer Stamp */}
              <div className="text-center space-y-2 pt-2">
                <QrCode size={40} className="mx-auto text-slate-900" />
                <p className="text-[9px] font-bold text-slate-700 uppercase">OFFICIAL SYSTEM GENERATED SLIP</p>
                <p className="text-[9px] text-slate-500">Thank you for your business!</p>
              </div>
            </div>

          ) : (

            /* STANDARD A4 / A5 / LETTER SHEET FORMAT */
            <>
              {/* Company Brand Header */}
              <div className="flex justify-between items-start border-b border-slate-900/80 pb-5">
                <div className="space-y-1.5 max-w-[60%]">
                  <div className="flex items-center gap-3">
                    {logoUrl ? (
                      <img src={logoUrl} alt="Company Logo" className="h-10 object-contain" />
                    ) : (
                      <div className="px-3 py-1.5 bg-slate-900 text-white font-black rounded-lg text-sm tracking-widest font-mono">
                        {logoInitials}
                      </div>
                    )}
                    <div>
                      <h1 className="font-extrabold text-xl text-slate-950 uppercase tracking-tight leading-none">
                        {companyName}
                      </h1>
                      <p className="text-[11px] font-semibold text-slate-600 tracking-normal pt-0.5">
                        {tagline}
                      </p>
                    </div>
                  </div>

                  <div className="text-[11px] font-mono text-slate-600 space-y-0.5 pt-2 leading-relaxed">
                    <p className="uppercase font-medium">{streetAddress}, {city}, {country}</p>
                    <p><span className="font-bold text-slate-700">Phone:</span> {phone} | <span className="font-bold text-slate-700">Email:</span> {email}</p>
                    <p><span className="font-bold text-slate-700">VAT Reg:</span> {vatNumber} | <span className="font-bold text-slate-700">TIN:</span> {tinNumber}</p>
                  </div>
                </div>

                {/* Document Title & Number Badge */}
                <div className="text-right space-y-2">
                  <div className="inline-block bg-slate-950 text-white px-4 py-1.5 rounded-lg text-xs font-black tracking-widest uppercase font-mono shadow-sm">
                    {normDoc.title}
                  </div>
                  <div className="font-mono text-right">
                    <p className="text-lg font-black text-slate-900 tracking-tight">{normDoc.documentNumber}</p>
                    <p className="text-[11px] text-slate-500 font-semibold">Date: {normDoc.date}</p>
                  </div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold border uppercase font-mono bg-slate-100 text-slate-800 border-slate-300">
                    <ShieldCheck size={13} className="text-blue-600" />
                    <span>Status: {normDoc.status}</span>
                  </div>
                </div>
              </div>

              {/* Party Details & Metadata Box Grid */}
              <div className="grid grid-cols-2 gap-6 bg-slate-50/80 rounded-xl p-4 border border-slate-200/80 text-xs font-mono">
                {/* Left: Party Info - wrapped and contained */}
                <div className="space-y-1 min-w-0 overflow-hidden break-words">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{normDoc.partyLabel}</p>
                  <h4 className="font-black text-sm text-slate-900 uppercase tracking-tight break-words">{normDoc.partyName}</h4>
                  {normDoc.partyAddress && (
                    <p className="text-slate-600 break-words whitespace-normal leading-relaxed">{normDoc.partyAddress}</p>
                  )}
                  {normDoc.partyPhone && (
                    <p className="text-slate-600 break-all"><span className="font-semibold text-slate-800">Phone:</span> {normDoc.partyPhone}</p>
                  )}
                  {normDoc.partyEmail && (
                    <p className="text-slate-600 break-all"><span className="font-semibold text-slate-800">Email:</span> {normDoc.partyEmail}</p>
                  )}
                </div>

                {/* Right: Metadata Grid */}
                <div className="space-y-1.5 border-l border-slate-200/80 pl-6 min-w-0">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">DOCUMENT METADATA</p>
                  <div className="grid grid-cols-1 gap-1 text-[11px]">
                    {normDoc.metaFields.map((field, idx) => (
                      <div key={idx} className="flex justify-between items-center border-b border-slate-200/50 pb-0.5 gap-2">
                        <span className="text-slate-500 font-medium whitespace-nowrap">{field.label}:</span>
                        <span className="font-bold text-slate-900 text-right truncate">{field.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Itemized Table - Strict column widths and text wrapping */}
              <div className="space-y-2">
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                  <table className="w-full table-fixed text-xs font-mono text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-900 text-white font-bold uppercase text-[10px] tracking-wider">
                        <th className="py-2.5 px-3 w-10 text-center border-r border-slate-800">#</th>
                        <th className="py-2.5 px-3 border-r border-slate-800">Item Description</th>
                        {normDoc.lines.some(l => l.codeOrSku) && (
                          <th className="py-2.5 px-3 w-32 border-r border-slate-800">SKU / Code</th>
                        )}
                        <th className="py-2.5 px-3 w-16 text-center border-r border-slate-800">Qty</th>
                        <th className="py-2.5 px-3 w-28 text-right border-r border-slate-800">Unit ({normDoc.currency})</th>
                        <th className="py-2.5 px-3 w-32 text-right">EXT ({normDoc.currency})</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {normDoc.lines.map((line, idx) => (
                        <tr key={line.id || idx} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                          <td className="py-2.5 px-3 text-center text-slate-500 font-medium border-r border-slate-200/60 align-top">{idx + 1}</td>
                          <td className="py-2.5 px-3 border-r border-slate-200/60 font-medium text-slate-900 align-top break-words whitespace-normal">
                            <div className="break-words">{line.description}</div>
                            {line.remarks && (
                              <div className="text-[10px] text-slate-500 italic pt-0.5 break-words">{line.remarks}</div>
                            )}
                          </td>
                          {normDoc.lines.some(l => l.codeOrSku) && (
                            <td className="py-2.5 px-3 font-mono text-slate-600 border-r border-slate-200/60 align-top break-all whitespace-normal">
                              {line.codeOrSku || "-"}
                            </td>
                          )}
                          <td className="py-2.5 px-3 text-center font-bold text-slate-800 border-r border-slate-200/60 align-top whitespace-nowrap">
                            {line.quantity}
                          </td>
                          <td className="py-2.5 px-3 text-right text-slate-700 border-r border-slate-200/60 font-mono align-top whitespace-nowrap">
                            {line.unitCostOrPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="py-2.5 px-3 text-right font-black text-slate-900 font-mono align-top whitespace-nowrap">
                            {line.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Financial Summary & Banking Section */}
              <div className="grid grid-cols-12 gap-6 pt-2 font-mono">
                {/* Left Column: Bank / Payment Details */}
                <div className="col-span-7 bg-slate-50/90 rounded-xl p-4 border border-slate-200/80 space-y-2 text-[11px]">
                  <p className="font-extrabold text-slate-900 uppercase tracking-tight flex items-center gap-1.5">
                    <Building2 size={14} className="text-blue-600" />
                    <span>OFFICIAL BANKING & PAYMENT DETAILS</span>
                  </p>
                  <div className="space-y-1 text-slate-700 font-mono text-[11px]">
                    <p><span className="font-bold text-slate-900">Bank:</span> {bankName}</p>
                    <p><span className="font-bold text-slate-900">Account Name:</span> {accountName}</p>
                    <p><span className="font-bold text-slate-900">RTGS:</span> <span className="font-bold text-slate-900">{rtgsAccountNumber}</span></p>
                    <p><span className="font-bold text-slate-900">USD:</span> <span className="font-bold text-slate-900">{usdAccountNumber}</span></p>
                    {ecocashNumber && (
                      <p><span className="font-bold text-slate-900">EcoCash Number:</span> <span className="font-bold text-slate-900">{ecocashNumber}</span></p>
                    )}
                  </div>
                  {normDoc.notes && (
                    <div className="pt-2 border-t border-slate-200/80 text-[10px] text-slate-600">
                      <span className="font-bold text-slate-800 uppercase">Notes / Instructions:</span> {normDoc.notes}
                    </div>
                  )}
                </div>

                {/* Right Column: Financial Totals Box */}
                <div className="col-span-5 space-y-1.5 text-xs font-mono">
                  <div className="flex justify-between py-1 text-slate-600 border-b border-slate-200">
                    <span>Subtotal:</span>
                    <span className="font-bold text-slate-900">{normDoc.currency} $ {normDoc.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  {normDoc.discountAmount > 0 && (
                    <div className="flex justify-between py-1 text-rose-600 border-b border-slate-200">
                      <span>Discount:</span>
                      <span className="font-bold">- {normDoc.currency} $ {normDoc.discountAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                  )}
                  {normDoc.taxAmount > 0 && (
                    <div className="flex justify-between py-1 text-slate-600 border-b border-slate-200">
                      <span>VAT / Sales Tax:</span>
                      <span className="font-bold text-slate-900">{normDoc.currency} $ {normDoc.taxAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                  )}
                  {normDoc.include_import_costs && (normDoc.total_import_costs || 0) > 0 && (
                    <div className="flex justify-between py-1 text-slate-600 border-b border-slate-200">
                      <span>Total Import Costs:</span>
                      <span className="font-bold text-slate-900">{normDoc.currency} $ {(normDoc.total_import_costs || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                  )}
                  <div className="flex justify-between py-2 bg-slate-950 text-white rounded-xl px-3 font-black text-sm shadow-sm mt-2">
                    <span>GRAND TOTAL:</span>
                    <span className="font-mono text-emerald-400">{normDoc.currency} $ {normDoc.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>

              {/* Terms & Conditions Section (When enabled for Quotations) */}
              {normDoc.include_terms_conditions && (
                <div className="pt-5 border-t border-slate-200 space-y-3">
                  <div className="flex items-center gap-2 pb-1.5 border-b border-slate-200">
                    <FileText size={14} className="text-blue-600" />
                    <h5 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider">Terms & Conditions</h5>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[10px] text-slate-600 leading-relaxed font-sans">
                    {QUOTATION_TERMS_AND_CONDITIONS.map((clause, idx) => (
                      <div key={idx} className="space-y-0.5 bg-slate-50/70 p-2.5 rounded-lg border border-slate-200/60">
                        <p className="font-bold text-slate-800 text-[10px]">{clause.title}</p>
                        <p className="text-slate-600 text-[9.5px] leading-relaxed">{clause.content}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Authorization & Signatures Grid */}
              <div className="pt-6 border-t border-slate-200">
                <div className="grid grid-cols-3 gap-6 text-center font-mono">
                  <div className="space-y-6">
                    <div className="h-10 border-b border-slate-400 border-dashed flex items-end justify-center pb-1">
                      <span className="text-[11px] font-bold text-slate-800">{normDoc.preparedBy || "System User"}</span>
                    </div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">PREPARED / ISSUED BY</p>
                  </div>

                  <div className="space-y-6">
                    <div className="h-10 border-b border-slate-400 border-dashed flex items-end justify-center pb-1">
                      <span className="text-[11px] font-bold text-slate-800">{normDoc.approvedBy || "Authorized Manager"}</span>
                    </div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">APPROVED & STAMPED BY</p>
                  </div>

                  <div className="space-y-6">
                    <div className="h-10 border-b border-slate-400 border-dashed flex items-end justify-center pb-1">
                      <span className="text-[11px] font-bold text-slate-800">{normDoc.receivedBy || "Client / Receiver Sign"}</span>
                    </div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">RECEIVED / ACKNOWLEDGED BY</p>
                  </div>
                </div>
              </div>

              {/* Security Watermark & Footer Terms */}
              <div className="pt-4 border-t border-slate-200 flex justify-between items-center text-[10px] text-slate-500 font-mono">
                <div className="flex items-center gap-2">
                  <QrCode size={28} className="text-slate-800 shrink-0" />
                  <div className="space-y-0.5">
                    <p className="font-bold text-slate-700 uppercase">VOLT SECURITY STAMP: VERIFIED</p>
                    <p>{footerTerms}</p>
                  </div>
                </div>

                <div className="text-right space-y-0.5">
                  <p className="font-bold text-slate-700">PAGE 1 OF 1 ({paperSize.toUpperCase()})</p>
                  <p className="text-[9px] text-slate-400">UUID: {normDoc.documentNumber.toLowerCase()}-sec-cert</p>
                </div>
              </div>
            </>
          )}

        </div>
      </div>

    </div>
  );
};
