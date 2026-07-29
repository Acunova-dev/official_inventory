import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { 
  PurchaseOrder, 
  Receipt, 
  PaymentVoucher, 
  GoodsReceivedNote, 
  Quotation, 
  CompanySettings 
} from "../types";
import { DEFAULT_COMPANY_SETTINGS, getMergedCompanySettings } from "../constants/defaultSettings";

export type SupportedDocumentType = 
  | "po" 
  | "receipt" 
  | "payment_voucher" 
  | "grn" 
  | "quotation";

export interface NormalizedDocumentLine {
  id: string;
  codeOrSku?: string;
  description: string;
  quantity: number;
  unitCostOrPrice: number;
  discountRate?: number;
  taxRate?: number;
  total: number;
  acceptedQty?: number;
  rejectedQty?: number;
  remarks?: string;
}

export interface NormalizedPrintDocument {
  docType: SupportedDocumentType;
  title: string;
  documentNumber: string;
  date: string;
  status: string;
  
  // Entity Info
  partyLabel: string; // e.g. "SUPPLIER DETAILS", "CUSTOMER / CLIENT", "PAYEE DETAILS"
  partyName: string;
  partyPhone?: string;
  partyEmail?: string;
  partyAddress?: string;
  
  // Secondary metadata grid
  metaFields: Array<{ label: string; value: string }>;

  // Itemized Lines
  lines: NormalizedDocumentLine[];

  // Financial Summaries
  currency: string;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  paymentMethod?: string;
  bankAccountName?: string;
  
  // Authorization / Signatures
  preparedBy?: string;
  approvedBy?: string;
  receivedBy?: string;
  notes?: string;
  reversalReason?: string;
}

export type PaperSize = "a4" | "a5" | "letter" | "thermal";
export type PageOrientation = "portrait" | "landscape";

/**
 * Transforms any document data structure into a normalized print representation.
 */
export function normalizeDocument(
  type: SupportedDocumentType,
  docData: any,
  currencyDefault: string = "USD"
): NormalizedPrintDocument {
  const currency = docData.currency || currencyDefault;

  switch (type) {
    case "po": {
      const po = docData as PurchaseOrder;
      return {
        docType: "po",
        title: "PURCHASE ORDER",
        documentNumber: po.poNumber,
        date: po.date || po.orderDate,
        status: po.status,
        partyLabel: "SUPPLIER / VENDOR DETAILS",
        partyName: po.supplierName,
        metaFields: [
          { label: "Expected Delivery Date", value: po.expectedDeliveryDate || "N/A" },
          { label: "Order Date", value: po.orderDate || po.createdDate || "N/A" },
          { label: "Created By", value: po.createdBy || "System Admin" },
        ],
        lines: (po.items || []).map((item, idx) => ({
          id: item.productId || `item-${idx}`,
          codeOrSku: item.sku || `SKU-${idx + 1}`,
          description: item.productName,
          quantity: item.quantity,
          unitCostOrPrice: item.unitCost,
          total: item.total || item.subtotal || (item.quantity * item.unitCost),
          remarks: item.receivedQuantity > 0 ? `Received: ${item.receivedQuantity}` : undefined
        })),
        currency,
        subtotal: po.subtotal || po.totalAmount,
        discountAmount: 0,
        taxAmount: po.taxAmount || 0,
        totalAmount: po.totalAmount,
        preparedBy: po.createdBy,
        approvedBy: po.approvedBy || "Procurement Mgr",
        notes: po.notes
      };
    }

    case "receipt": {
      const rec = docData as Receipt;
      return {
        docType: "receipt",
        title: "OFFICIAL SALES RECEIPT",
        documentNumber: rec.receiptNumber,
        date: rec.date || rec.createdDate,
        status: rec.approvalStatus || "Approved",
        partyLabel: "CUSTOMER / ACCOUNT DETAILS",
        partyName: rec.customerName,
        partyEmail: rec.customerEmail,
        partyPhone: rec.customerPhone,
        partyAddress: rec.customerAddress,
        metaFields: [
          { label: "Payment Method", value: rec.paymentMethod || "Cash" },
          { label: "Bank Account", value: rec.bankAccountName || "N/A" },
          { label: "Reference #", value: rec.referenceNumber || "N/A" },
          { label: "Cashier / Served By", value: rec.createdBy || "Store Clerk" }
        ],
        lines: (rec.lines || []).map((line, idx) => ({
          id: line.productId || `line-${idx}`,
          codeOrSku: `ITEM-${idx + 1}`,
          description: line.productName,
          quantity: line.quantity,
          unitCostOrPrice: line.unitPrice,
          total: line.totalPrice
        })),
        currency,
        subtotal: rec.subtotal,
        discountAmount: rec.discountAmount || 0,
        taxAmount: rec.taxAmount || 0,
        totalAmount: rec.total,
        paymentMethod: rec.paymentMethod,
        bankAccountName: rec.bankAccountName,
        preparedBy: rec.createdBy,
        reversalReason: rec.reversalReason,
        notes: rec.notes
      };
    }

    case "payment_voucher": {
      const pv = docData as PaymentVoucher;
      return {
        docType: "payment_voucher",
        title: "PAYMENT VOUCHER",
        documentNumber: pv.voucherNumber,
        date: pv.date || pv.paymentDate,
        status: pv.status,
        partyLabel: "PAYEE / BENEFICIARY DETAILS",
        partyName: pv.supplierName,
        metaFields: [
          { label: "Payment Method", value: pv.paymentMethod },
          { label: "Purpose / Description", value: pv.purpose },
          { label: "Paid From Account", value: pv.bankAccountName || "Cash Account" },
          { label: "Related PO #", value: pv.poNumber || "N/A" },
          { label: "Invoice #", value: pv.supplierInvoiceNo || "N/A" }
        ],
        lines: [
          {
            id: pv.id,
            description: pv.purpose,
            quantity: 1,
            unitCostOrPrice: pv.amount,
            total: pv.amount,
            remarks: `Payment for ${pv.supplierName} via ${pv.paymentMethod}`
          }
        ],
        currency: pv.currency || currency,
        subtotal: pv.amount,
        discountAmount: 0,
        taxAmount: 0,
        totalAmount: pv.amount,
        paymentMethod: pv.paymentMethod,
        bankAccountName: pv.bankAccountName,
        preparedBy: pv.paidBy || pv.createdBy,
        approvedBy: pv.approvedBy || "Finance Director",
        receivedBy: pv.supplierName,
        reversalReason: pv.reversalReason,
        notes: pv.notes
      };
    }

    case "grn": {
      const grn = docData as GoodsReceivedNote;
      const computedTotal = (grn.items || []).reduce((sum, i) => sum + (i.receivedQty * (i.unitCost || 0)), 0);

      return {
        docType: "grn",
        title: "GOODS RECEIVED NOTE (GRN)",
        documentNumber: grn.grnNumber,
        date: grn.date || grn.dateReceived,
        status: "Received & Verified",
        partyLabel: "SUPPLIER DETAILS",
        partyName: grn.supplierName,
        metaFields: [
          { label: "Related PO #", value: grn.poNumber },
          { label: "Delivery Note #", value: grn.deliveryNoteNumber || "N/A" },
          { label: "Warehouse Location", value: grn.warehouseLocation || "Main Warehouse" },
          { label: "Received By", value: grn.receivedBy || grn.receiverName || "Warehouse Supervisor" }
        ],
        lines: (grn.items || []).map((item, idx) => ({
          id: item.productId || `grn-item-${idx}`,
          codeOrSku: item.sku || `SKU-${idx + 1}`,
          description: item.productName,
          quantity: item.receivedQty,
          unitCostOrPrice: item.unitCost || 0,
          total: (item.receivedQty * (item.unitCost || 0)),
          acceptedQty: item.acceptedQty,
          rejectedQty: item.rejectedQty,
          remarks: (item.rejectedQty || item.damagedQty) ? `Rejected/Damaged: ${(item.rejectedQty || 0) + (item.damagedQty || 0)}` : "Inspected OK"
        })),
        currency,
        subtotal: computedTotal,
        discountAmount: 0,
        taxAmount: 0,
        totalAmount: computedTotal,
        preparedBy: grn.receivedBy || grn.receiverName,
        approvedBy: "Store Manager",
        notes: grn.notes
      };
    }

    case "quotation": {
      const q = docData as Quotation;
      return {
        docType: "quotation",
        title: "SALES QUOTATION",
        documentNumber: q.quotationNumber,
        date: q.date,
        status: q.status || "Active",
        partyLabel: "CUSTOMER DETAILS",
        partyName: q.customerName,
        partyEmail: q.customerEmail,
        partyPhone: q.customerPhone,
        partyAddress: q.customerAddress,
        metaFields: [
          { label: "Quotation #", value: q.quotationNumber },
          { label: "Date Issued", value: q.date },
          { label: "Valid Until", value: q.expiryDate || "14 Days from date of issue" }
        ],
        lines: (q.lines || []).map((line, idx) => ({
          id: line.productId || `q-line-${idx}`,
          codeOrSku: `ITEM-${1000 + idx}`,
          description: line.productName,
          quantity: line.quantity,
          unitCostOrPrice: line.unitPrice,
          total: line.totalPrice
        })),
        currency,
        subtotal: q.subtotal,
        discountAmount: q.discountAmount || 0,
        taxAmount: q.taxAmount || 0,
        totalAmount: q.total,
        preparedBy: "Sales Department",
        notes: q.notes
      };
    }

    default:
      throw new Error(`Unsupported document type: ${type}`);
  }
}

/**
 * Validates that a Blob contains a valid binary PDF document starting with "%PDF-".
 */
export async function validatePdfBlob(blob: Blob): Promise<boolean> {
  if (!blob || blob.size < 100) return false;
  try {
    const slice = blob.slice(0, 5);
    const text = await slice.text();
    return text.startsWith("%PDF-");
  } catch {
    return false;
  }
}

/**
 * Converts a remote or Data URL image into a clean base64 data URL for jsPDF embedding,
 * gracefully returning null if image loading or CORS fails.
 */
async function getBase64ImageFromUrl(url: string | undefined): Promise<string | null> {
  if (!url) return null;
  if (url.startsWith("data:image")) return url;
  try {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    return await new Promise((resolve) => {
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = img.naturalWidth || img.width;
          canvas.height = img.naturalHeight || img.height;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            resolve(canvas.toDataURL("image/png"));
          } else {
            resolve(null);
          }
        } catch {
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      img.src = url;
    });
  } catch {
    return null;
  }
}

/**
 * Programmatically generates a vector PDF Blob using jsPDF and the merged company settings.
 */
export async function generatePdfBlob(
  normDoc: NormalizedPrintDocument,
  rawSettings?: Partial<CompanySettings> | null,
  options?: { paperSize?: PaperSize; orientation?: PageOrientation }
): Promise<Blob> {
  const settings = getMergedCompanySettings(rawSettings);
  const paperSize = options?.paperSize || "a4";
  const orientation = options?.orientation || "portrait";

  console.log("[PDF Generator] Building PDF with data:", {
    documentNumber: normDoc.documentNumber,
    docType: normDoc.docType,
    companyName: settings.companyName,
    paperSize,
    orientation
  });

  const doc = new jsPDF({
    orientation: paperSize === "thermal" ? "portrait" : orientation,
    unit: "mm",
    format: paperSize === "thermal" ? [80, 200] : paperSize
  });

  const primaryColor = settings.pdfHeaderColor || "#2563eb";

  // Parse hex color to RGB
  const hexToRgb = (hex: string) => {
    let clean = hex.replace("#", "");
    if (clean.length === 3) clean = clean.split("").map(c => c + c).join("");
    const num = parseInt(clean, 16);
    return {
      r: (num >> 16) & 255,
      g: (num >> 8) & 255,
      b: num & 255
    };
  };

  const rgb = hexToRgb(primaryColor);

  // Thermal 80mm format
  if (paperSize === "thermal") {
    let y = 10;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(settings.companyName.toUpperCase(), 40, y, { align: "center" });
    y += 5;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(`${settings.streetAddress}, ${settings.city}`, 40, y, { align: "center" });
    y += 4;
    doc.text(`TEL: ${settings.phone} | VAT: ${settings.vatNumber}`, 40, y, { align: "center" });
    y += 6;

    doc.setDrawColor(200, 200, 200);
    doc.line(5, y, 75, y);
    y += 5;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(normDoc.title, 40, y, { align: "center" });
    y += 5;

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(`Doc #: ${normDoc.documentNumber}`, 5, y);
    doc.text(`Date: ${normDoc.date}`, 45, y);
    y += 4;
    doc.text(`Party: ${normDoc.partyName}`, 5, y);
    y += 6;

    doc.line(5, y, 75, y);
    y += 5;

    doc.setFont("helvetica", "bold");
    doc.text("ITEM / QTY", 5, y);
    doc.text(`TOTAL (${normDoc.currency})`, 75, y, { align: "right" });
    y += 4;

    doc.setFont("helvetica", "normal");
    normDoc.lines.forEach(line => {
      doc.text(line.description.substring(0, 22), 5, y);
      doc.text(line.total.toFixed(2), 75, y, { align: "right" });
      y += 4;
      doc.text(` ${line.quantity} x ${line.unitCostOrPrice.toFixed(2)}`, 5, y);
      y += 4;
    });

    doc.line(5, y, 75, y);
    y += 5;

    doc.text(`Subtotal:`, 5, y);
    doc.text(`${normDoc.currency} ${normDoc.subtotal.toFixed(2)}`, 75, y, { align: "right" });
    y += 4;
    if (normDoc.taxAmount > 0) {
      doc.text(`Tax:`, 5, y);
      doc.text(`${normDoc.currency} ${normDoc.taxAmount.toFixed(2)}`, 75, y, { align: "right" });
      y += 4;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(`TOTAL:`, 5, y);
    doc.text(`${normDoc.currency} ${normDoc.totalAmount.toFixed(2)}`, 75, y, { align: "right" });
    y += 8;

    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text(settings.footerTerms, 40, y, { align: "center", maxWidth: 70 });

    const arrayBuffer = doc.output("arraybuffer");
    return new Blob([arrayBuffer], { type: "application/pdf" });
  }

  // Standard A4 / A5 / Letter format
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 15;

  // Header Color Bar
  doc.setFillColor(rgb.r, rgb.g, rgb.b);
  doc.rect(0, 0, pageWidth, 5, "F");

  // Logo / Initials Badge
  const logoBase64 = await getBase64ImageFromUrl(settings.logoUrl);
  if (logoBase64) {
    try {
      doc.addImage(logoBase64, "PNG", 15, y, 24, 16);
    } catch {
      doc.setFillColor(rgb.r, rgb.g, rgb.b);
      doc.roundedRect(15, y, 16, 16, 2, 2, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text(settings.logoInitials || "AI", 23, y + 10, { align: "center" });
    }
  } else {
    doc.setFillColor(rgb.r, rgb.g, rgb.b);
    doc.roundedRect(15, y, 16, 16, 2, 2, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(settings.logoInitials || "AI", 23, y + 10, { align: "center" });
  }

  // Company Name & Subtitle
  const headerX = 45;
  doc.setTextColor(15, 23, 42); // slate-900
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(settings.companyName.toUpperCase(), headerX, y + 5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105); // slate-600
  doc.text(settings.tagline || settings.companySubtitle, headerX, y + 10);

  doc.setFontSize(8);
  doc.text(`${settings.streetAddress}, ${settings.city}, ${settings.country}`, headerX, y + 15);
  doc.text(`Tel: ${settings.phone} | Email: ${settings.email}`, headerX, y + 19);
  doc.text(`VAT Reg: ${settings.vatNumber} | TIN: ${settings.tinNumber}`, headerX, y + 23);

  // Document Title & Number (Right Side)
  const rightX = pageWidth - 15;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(rgb.r, rgb.g, rgb.b);
  doc.text(normDoc.title, rightX, y + 5, { align: "right" });

  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(`Doc #: ${normDoc.documentNumber}`, rightX, y + 11, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Date: ${normDoc.date}`, rightX, y + 16, { align: "right" });
  doc.text(`Status: ${normDoc.status}`, rightX, y + 21, { align: "right" });

  y += 32;

  // Divider line
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.4);
  doc.line(15, y, pageWidth - 15, y);
  y += 6;

  // Customer / Party Box
  const boxHeight = 26;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(15, y, (pageWidth - 36) / 2, boxHeight, 2, 2, "F");
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(15, y, (pageWidth - 36) / 2, boxHeight, 2, 2, "S");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(normDoc.partyLabel, 18, y + 5);
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text(normDoc.partyName || "N/A", 18, y + 10);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  let partyY = y + 14.5;
  if (normDoc.partyAddress) {
    doc.text(normDoc.partyAddress.substring(0, 40), 18, partyY);
    partyY += 3.8;
  }
  if (normDoc.partyPhone) {
    doc.text(`Phone: ${normDoc.partyPhone}`, 18, partyY);
    partyY += 3.8;
  }
  if (normDoc.partyEmail) {
    doc.text(`Email: ${normDoc.partyEmail}`, 18, partyY);
  }

  // Meta Fields Box (Right)
  const metaX = 15 + (pageWidth - 36) / 2 + 6;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(metaX, y, (pageWidth - 36) / 2, boxHeight, 2, 2, "F");
  doc.roundedRect(metaX, y, (pageWidth - 36) / 2, boxHeight, 2, 2, "S");

  let metaY = y + 5;
  normDoc.metaFields.slice(0, 3).forEach(meta => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`${meta.label}:`, metaX + 3, metaY);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(15, 23, 42);
    doc.text(String(meta.value), metaX + 40, metaY);
    metaY += 5;
  });

  y += 28;

  // Table Header
  doc.setFillColor(rgb.r, rgb.g, rgb.b);
  doc.rect(15, y, pageWidth - 30, 7, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  doc.text("CODE", 18, y + 5);
  doc.text("DESCRIPTION", 42, y + 5);
  doc.text("QTY", pageWidth - 80, y + 5, { align: "right" });
  doc.text("PRICE", pageWidth - 50, y + 5, { align: "right" });
  doc.text("TOTAL", pageWidth - 18, y + 5, { align: "right" });

  y += 7;

  // Table Lines
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);

  normDoc.lines.forEach((line, idx) => {
    if (idx % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(15, y, pageWidth - 30, 7, "F");
    }
    doc.text(line.codeOrSku || `ITEM-${idx + 1}`, 18, y + 5);
    doc.text(line.description.substring(0, 45), 42, y + 5);
    doc.text(line.quantity.toString(), pageWidth - 80, y + 5, { align: "right" });
    doc.text(line.unitCostOrPrice.toFixed(2), pageWidth - 50, y + 5, { align: "right" });
    doc.text(line.total.toFixed(2), pageWidth - 18, y + 5, { align: "right" });
    y += 7;
  });

  y += 4;
  doc.setDrawColor(226, 232, 240);
  doc.line(15, y, pageWidth - 15, y);
  y += 6;

  // Bank Info & Summary
  const summaryWidth = 70;
  const summaryX = pageWidth - 15 - summaryWidth;

  // Banking Details (Left)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text("BANK SETTLEMENT DETAILS", 15, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text(`Bank: ${settings.bankName}`, 15, y + 4);
  doc.text(`Account Name: ${settings.accountName}`, 15, y + 8);
  doc.text(`Account #: ${settings.accountNumber}`, 15, y + 12);
  if (settings.ecocashNumber) {
    doc.text(`EcoCash Code: ${settings.ecocashNumber}`, 15, y + 16);
  }

  // Totals Summary (Right)
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text(`Subtotal:`, summaryX, y);
  doc.text(`${normDoc.currency} ${normDoc.subtotal.toFixed(2)}`, pageWidth - 18, y, { align: "right" });
  
  if (normDoc.taxAmount > 0) {
    y += 4;
    doc.text(`Tax:`, summaryX, y);
    doc.text(`${normDoc.currency} ${normDoc.taxAmount.toFixed(2)}`, pageWidth - 18, y, { align: "right" });
  }

  y += 6;
  doc.setFillColor(rgb.r, rgb.g, rgb.b);
  doc.roundedRect(summaryX - 2, y - 4, summaryWidth + 2, 8, 1, 1, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text(`TOTAL:`, summaryX, y + 1);
  doc.text(`${normDoc.currency} ${normDoc.totalAmount.toFixed(2)}`, pageWidth - 18, y + 1, { align: "right" });

  // Footer Disclaimer
  const footerY = doc.internal.pageSize.getHeight() - 12;
  doc.setDrawColor(226, 232, 240);
  doc.line(15, footerY - 4, pageWidth - 15, footerY - 4);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text(settings.footerTerms, pageWidth / 2, footerY, { align: "center" });

  const arrayBuffer = doc.output("arraybuffer");
  return new Blob([arrayBuffer], { type: "application/pdf" });
}

/**
 * Downloads a Blob as a file with proper Object URL creation and clean teardown.
 */
export function downloadPdfBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 10000);
}

/**
 * High-level function to export either a DOM element or programmatic PDF,
 * verifying binary signature before download.
 */
export async function exportDocumentToPdf(
  normDoc: NormalizedPrintDocument,
  rawSettings?: Partial<CompanySettings> | null,
  fileName: string = "Document.pdf",
  options?: { paperSize?: PaperSize; orientation?: PageOrientation },
  elementId?: string
): Promise<void> {
  let blob: Blob | null = null;
  const settings = getMergedCompanySettings(rawSettings);

  if (elementId) {
    const element = document.getElementById(elementId);
    if (element) {
      try {
        const paperSize = options?.paperSize || "a4";
        const orientation = options?.orientation || "portrait";

        const canvas = await html2canvas(element, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          logging: false,
          backgroundColor: "#ffffff",
          windowWidth: paperSize === "thermal" ? 400 : (orientation === "landscape" ? 1400 : 1000),
        });

        const imgData = canvas.toDataURL("image/png");
        let format: string | [number, number] = "a4";
        let pdfWidth = 210;
        let pdfPageHeight = 297;

        if (paperSize === "a5") {
          format = "a5";
          pdfWidth = orientation === "landscape" ? 210 : 148;
          pdfPageHeight = orientation === "landscape" ? 148 : 210;
        } else if (paperSize === "letter") {
          format = "letter";
          pdfWidth = orientation === "landscape" ? 279.4 : 215.9;
          pdfPageHeight = orientation === "landscape" ? 215.9 : 279.4;
        } else if (paperSize === "thermal") {
          pdfWidth = 80;
          const calculatedHeight = (canvas.height * pdfWidth) / canvas.width;
          pdfPageHeight = Math.max(120, calculatedHeight);
          format = [pdfWidth, pdfPageHeight];
        } else {
          format = "a4";
          pdfWidth = orientation === "landscape" ? 297 : 210;
          pdfPageHeight = orientation === "landscape" ? 210 : 297;
        }

        const pdf = new jsPDF({
          orientation: paperSize === "thermal" ? "portrait" : orientation,
          unit: "mm",
          format,
        });

        const imgHeight = (canvas.height * pdfWidth) / canvas.width;

        if (paperSize === "thermal") {
          pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, imgHeight);
        } else {
          let heightLeft = imgHeight;
          let position = 0;
          pdf.addImage(imgData, "PNG", 0, position, pdfWidth, imgHeight);
          heightLeft -= pdfPageHeight;

          while (heightLeft > 0) {
            position = heightLeft - pdfPageHeight;
            pdf.addPage();
            pdf.addImage(imgData, "PNG", 0, position, pdfWidth, imgHeight);
            heightLeft -= pdfPageHeight;
          }
        }

        const arrayBuf = pdf.output("arraybuffer");
        blob = new Blob([arrayBuf], { type: "application/pdf" });
      } catch (err) {
        console.warn("[PDF Renderer] DOM canvas capture failed, falling back to vector renderer:", err);
      }
    }
  }

  if (!blob) {
    blob = await generatePdfBlob(normDoc, settings, options);
  }

  const isValid = await validatePdfBlob(blob);
  if (!isValid) {
    throw new Error("PDF Validation Failed: Generated output is not a valid binary PDF document.");
  }

  downloadPdfBlob(blob, fileName);
}

/**
 * Downloads the specified HTML element as a branded PDF. (Legacy wrapper)
 */
export async function exportElementToPdf(
  elementId: string,
  fileName: string = "Document.pdf",
  options?: {
    paperSize?: PaperSize;
    orientation?: PageOrientation;
  }
): Promise<void> {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error(`Document container with ID '${elementId}' not found for PDF export.`);
  }

  const dummyNormDoc: NormalizedPrintDocument = {
    docType: "quotation",
    title: "DOCUMENT",
    documentNumber: "DOC-001",
    date: new Date().toISOString().split("T")[0],
    status: "Active",
    partyLabel: "DETAILS",
    partyName: "Client",
    metaFields: [],
    lines: [],
    currency: "USD",
    subtotal: 0,
    discountAmount: 0,
    taxAmount: 0,
    totalAmount: 0
  };

  await exportDocumentToPdf(dummyNormDoc, DEFAULT_COMPANY_SETTINGS, fileName, options, elementId);
}

/**
 * Triggers document printing via browser print dialog.
 */
export function triggerDocumentPrint(): void {
  setTimeout(() => {
    window.print();
  }, 100);
}
