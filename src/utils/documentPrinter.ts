import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { 
  PurchaseOrder, 
  Receipt, 
  PaymentVoucher, 
  GoodsReceivedNote, 
  Quotation, 
  Invoice,
  CompanySettings,
  Supplier,
  Customer,
  Product
} from "../types";
import { DEFAULT_COMPANY_SETTINGS, getMergedCompanySettings } from "../constants/defaultSettings";
import { QUOTATION_TERMS_AND_CONDITIONS, TermClause } from "../constants/termsAndConditions";
import { PdfFlowEngine } from "./pdfLayoutEngine";

export type SupportedDocumentType = 
  | "po" 
  | "receipt" 
  | "payment_voucher" 
  | "grn" 
  | "quotation"
  | "invoice";

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
  
  // Quotation and Document specific configuration & terms
  include_terms_conditions?: boolean;
  terms_and_conditions?: Array<TermClause> | string;
  include_import_costs?: boolean;
  total_import_costs?: number;

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
 * Enriches document data by resolving missing supplier, customer, and product fields against stored DB records.
 */
export function enrichDocumentData(
  type: SupportedDocumentType,
  data: any,
  lookup?: {
    suppliers?: Supplier[];
    customers?: Customer[];
    products?: Product[];
  }
) {
  if (!data) return data;
  const enriched = { ...data };
  const suppliers = lookup?.suppliers || [];
  const customers = lookup?.customers || [];
  const products = lookup?.products || [];

  // 1. Supplier Resolution (for PO, GRN, Payment Voucher)
  if (type === "po" || type === "grn" || type === "payment_voucher") {
    const supId = enriched.supplierId;
    const supName = enriched.supplierName;
    const foundSup = suppliers.find(
      (s) => (supId && s.id === supId) || (supName && (s.companyName === supName || s.name === supName))
    );
    if (foundSup) {
      if (!enriched.supplierName || enriched.supplierName === "Supplier" || enriched.supplierName === "Vendor") {
        enriched.supplierName = foundSup.companyName || foundSup.name || enriched.supplierName;
      }
      enriched.supplierEmail = enriched.supplierEmail || foundSup.email || "";
      enriched.supplierPhone = enriched.supplierPhone || foundSup.phone || "";
      enriched.supplierAddress = enriched.supplierAddress || foundSup.address || "";
    }
  }

  // 2. Customer Resolution (for Receipt, Quotation, Invoice)
  if (type === "receipt" || type === "quotation" || type === "invoice") {
    const custId = enriched.customerId;
    const custName = enriched.customerName;
    const foundCust = customers.find(
      (c) => (custId && c.id === custId) || (custName && c.name === custName)
    );
    if (foundCust) {
      if (!enriched.customerName || enriched.customerName === "Customer" || enriched.customerName === "Valued Customer") {
        enriched.customerName = foundCust.name || enriched.customerName;
      }
      enriched.customerEmail = enriched.customerEmail || foundCust.email || "";
      enriched.customerPhone = enriched.customerPhone || foundCust.phone || "";
      enriched.customerAddress = enriched.customerAddress || foundCust.address || "";
    }
  }

  // 3. Line Items Product Resolution
  // Purchase Order & GRN items
  if (Array.isArray(enriched.items)) {
    enriched.items = enriched.items.map((item: any) => {
      const prod = products.find(
        (p) => (item.productId && p.id === item.productId) || (item.productName && p.name === item.productName)
      );
      const productName =
        item.productName && item.productName !== "Item" && item.productName !== "Product"
          ? item.productName
          : prod?.name || item.productName || "Item";
      let sku = item.sku;
      if (!sku || sku.includes("--")) {
        sku = prod?.sku || prod?.barcode || (item.productId ? `SKU-${item.productId.replace(/^[^\w]+/, '').slice(-4)}` : undefined);
      }

      return {
        ...item,
        productName,
        sku,
        unitCost: item.unitCost ?? prod?.costPrice ?? prod?.sellingPrice ?? 0,
      };
    });
  }

  // Quotation, Invoice, Receipt lines
  if (Array.isArray(enriched.lines)) {
    enriched.lines = enriched.lines.map((line: any) => {
      const prod = products.find(
        (p) => (line.productId && p.id === line.productId) || (line.productName && p.name === line.productName)
      );
      const productName =
        line.productName && line.productName !== "Item" && line.productName !== "Product"
          ? line.productName
          : prod?.name || line.productName || "Item";
      let sku = line.sku;
      if (!sku || sku.includes("--")) {
        sku = prod?.sku || prod?.barcode || (line.productId ? `SKU-${line.productId.replace(/^[^\w]+/, '').slice(-4)}` : undefined);
      }

      return {
        ...line,
        productName,
        sku,
        unitPrice: line.unitPrice ?? prod?.sellingPrice ?? 0,
      };
    });
  }

  return enriched;
}

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
        partyName: po.supplierName || "Supplier",
        partyEmail: po.supplierEmail,
        partyPhone: po.supplierPhone,
        partyAddress: po.supplierAddress,
        metaFields: [
          { label: "Expected Delivery Date", value: po.expectedDeliveryDate || "N/A" },
          { label: "Order Date", value: po.orderDate || po.createdDate || "N/A" },
          { label: "Created By", value: po.createdBy || "System Admin" },
        ],
        lines: (po.items || []).map((item, idx) => {
          const rawSku = item.sku || (item.productId ? `SKU-${item.productId.replace(/^[^\w]+/, '').slice(-4)}` : `SKU-${idx + 1}`);
          const cleanSku = rawSku.replace(/SKU-+/g, 'SKU-');
          return {
            id: item.productId || `item-${idx}`,
            codeOrSku: cleanSku,
            description: item.productName || "Item",
            quantity: item.quantity,
            unitCostOrPrice: item.unitCost,
            total: item.total || item.subtotal || (item.quantity * item.unitCost),
            remarks: item.receivedQuantity > 0 ? `Received: ${item.receivedQuantity}` : undefined
          };
        }),
        currency,
        subtotal: po.subtotal || po.totalAmount,
        discountAmount: 0,
        taxAmount: 0,
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
        partyName: rec.customerName || "Valued Customer",
        partyEmail: rec.customerEmail,
        partyPhone: rec.customerPhone,
        partyAddress: rec.customerAddress,
        metaFields: [
          { label: "Payment Method", value: rec.paymentMethod || "Cash" },
          { label: "Bank Account", value: rec.bankAccountName || "N/A" },
          { label: "Reference #", value: rec.referenceNumber || "N/A" },
          { label: "Cashier / Served By", value: rec.createdBy || "Store Clerk" }
        ],
        lines: (rec.lines || []).map((line, idx) => {
          const rawSku = line.sku || (line.productId ? `SKU-${line.productId.replace(/^[^\w]+/, '').slice(-4)}` : `ITEM-${idx + 1}`);
          const cleanSku = rawSku.replace(/SKU-+/g, 'SKU-');
          return {
            id: line.productId || `line-${idx}`,
            codeOrSku: cleanSku,
            description: line.productName || "Item",
            quantity: line.quantity,
            unitCostOrPrice: line.unitPrice,
            total: line.totalPrice
          };
        }),
        currency,
        subtotal: rec.subtotal,
        discountAmount: rec.discountAmount || 0,
        taxAmount: 0,
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
        partyEmail: pv.supplierEmail,
        partyPhone: pv.supplierPhone,
        partyAddress: pv.supplierAddress,
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
        partyEmail: grn.supplierEmail,
        partyPhone: grn.supplierPhone,
        partyAddress: grn.supplierAddress,
        metaFields: [
          { label: "Related PO #", value: grn.poNumber },
          { label: "Delivery Note #", value: grn.deliveryNoteNumber || "N/A" },
          { label: "Warehouse Location", value: grn.warehouseLocation || "Main Warehouse" },
          { label: "Received By", value: grn.receivedBy || grn.receiverName || "Warehouse Supervisor" }
        ],
        lines: (grn.items || []).map((item, idx) => ({
          id: item.productId || `grn-item-${idx}`,
          codeOrSku: item.sku || (item.productId ? `SKU-${item.productId.slice(-4)}` : `SKU-${idx + 1}`),
          description: item.productName || "Item",
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
      const incTerms = Boolean(q.include_terms_conditions ?? q.includeTermsConditions);
      const incImport = Boolean(q.include_import_costs ?? q.includeImportCosts);
      const importCost = incImport ? Number(q.total_import_costs ?? q.totalImportCosts ?? 0) : 0;

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
          { label: "Valid Until", value: q.expiryDate || "30 Days from date of issue" }
        ],
        lines: (q.lines || []).map((line, idx) => ({
          id: line.productId || `q-line-${idx}`,
          codeOrSku: line.sku || (line.productId ? `SKU-${line.productId.slice(-4)}` : `ITEM-${1000 + idx}`),
          description: line.productName || "Item",
          quantity: line.quantity,
          unitCostOrPrice: line.unitPrice,
          total: line.totalPrice
        })),
        currency,
        subtotal: q.subtotal,
        discountAmount: q.discountAmount || 0,
        taxAmount: q.taxAmount || 0,
        totalAmount: q.total,
        include_terms_conditions: incTerms,
        include_import_costs: incImport,
        total_import_costs: importCost,
        preparedBy: "Sales Department",
        notes: q.notes
      };
    }

    case "invoice": {
      const inv = docData as Invoice;
      const metaFields = [
        { label: "Invoice #", value: inv.invoiceNumber },
        { label: "Date Issued", value: inv.date },
        { label: "Payment Due Date", value: inv.dueDate || "Upon Receipt" },
      ];
      if (inv.quotationNumber) {
        metaFields.push({ label: "Source Quotation #", value: inv.quotationNumber });
      }
      if (inv.amountPaid !== undefined) {
        metaFields.push({ label: "Amount Paid", value: `${currency} ${inv.amountPaid.toFixed(2)}` });
      }
      if (inv.outstandingBalance !== undefined) {
        metaFields.push({ label: "Balance Due", value: `${currency} ${inv.outstandingBalance.toFixed(2)}` });
      }

      return {
        docType: "invoice",
        title: "SALES INVOICE",
        documentNumber: inv.invoiceNumber,
        date: inv.date,
        status: inv.status || "Issued",
        partyLabel: "BILLED TO (CUSTOMER)",
        partyName: inv.customerName,
        partyEmail: inv.customerEmail,
        partyPhone: inv.customerPhone,
        partyAddress: inv.customerAddress,
        metaFields,
        lines: (inv.lines || []).map((line, idx) => ({
          id: line.productId || `inv-line-${idx}`,
          codeOrSku: line.sku || (line.productId ? `SKU-${line.productId.slice(-4)}` : `ITEM-${1000 + idx}`),
          description: line.productName || "Item",
          quantity: line.quantity,
          unitCostOrPrice: line.unitPrice,
          total: line.totalPrice
        })),
        currency,
        subtotal: inv.subtotal,
        discountAmount: inv.discountAmount || 0,
        taxAmount: inv.taxAmount || 0,
        totalAmount: inv.total,
        preparedBy: inv.createdByName || "Accounts Department",
        notes: inv.notes,
        terms_and_conditions: inv.termsAndConditions
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
 * Programmatically generates a vector PDF Blob using PdfFlowEngine and the merged company settings.
 * Fully content-driven flow layout preventing any overlapping sections.
 */
export async function generatePdfBlob(
  normDoc: NormalizedPrintDocument,
  rawSettings?: Partial<CompanySettings> | null,
  options?: { paperSize?: PaperSize; orientation?: PageOrientation }
): Promise<Blob> {
  const settings = getMergedCompanySettings(rawSettings);
  const paperSize = options?.paperSize || "a4";
  const orientation = options?.orientation || "portrait";

  const engine = new PdfFlowEngine(settings, { paperSize, orientation });

  // 1. Thermal roll format handling
  if (paperSize === "thermal") {
    engine.renderThermalReceipt(normDoc);
    return engine.toBlob();
  }

  // 2. Preload logo for standard vector pages
  let logoBase64: string | null = null;
  if (settings.logoUrl) {
    logoBase64 = await getBase64ImageFromUrl(settings.logoUrl);
  }

  // 3. Document Header Block (Color bar, logo/badge, company details, title, metadata)
  engine.renderHeaderBlock(normDoc, logoBase64);

  // 4. Party Details Box (Left) & Metadata Key-Values Box (Right)
  engine.renderPartyAndMetadata(normDoc);

  // 5. Itemized Table (Dynamic row height, wrapped text, headers on multi-page breaks)
  engine.renderLineItemsTable(normDoc);

  // 6. Bank Settlement Details (Left) & Totals Breakdown Summary (Right)
  engine.renderSettlementAndTotals(normDoc);

  // 7. Transaction Reversal Reason (when present)
  if (normDoc.reversalReason) {
    engine.renderNotesBlock(normDoc.reversalReason, "TRANSACTION REVERSAL REASON");
  }

  // 8. Notes & Special Instructions (when present)
  if (normDoc.notes) {
    engine.renderNotesBlock(normDoc.notes, "NOTES / SPECIAL INSTRUCTIONS");
  }

  // 9. Terms & Conditions (Flow-driven, variable-height, line-by-line page break protection)
  if (normDoc.include_terms_conditions || normDoc.terms_and_conditions) {
    engine.renderTermsAndConditionsBlock(normDoc.terms_and_conditions || normDoc.include_terms_conditions);
  }

  // 10. Authorization & Signatures Grid (Prepared By, Approved By, Received By)
  engine.renderSignaturesBlock(normDoc);

  // 11. Document-wide Footer & Page Numbering Finalizer
  engine.finalizeDocument();

  return engine.toBlob();
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
 * High-level function to export vector PDF with proper flow layout,
 * verifying binary signature before download.
 */
export async function exportDocumentToPdf(
  normDoc: NormalizedPrintDocument,
  rawSettings?: Partial<CompanySettings> | null,
  fileName: string = "Document.pdf",
  options?: { paperSize?: PaperSize; orientation?: PageOrientation; useDomCapture?: boolean },
  elementId?: string
): Promise<void> {
  let blob: Blob | null = null;
  const settings = getMergedCompanySettings(rawSettings);

  // 1. Primary: Generate pure vector PDF via content-driven PdfFlowEngine
  if (!options?.useDomCapture) {
    try {
      blob = await generatePdfBlob(normDoc, settings, options);
    } catch (err) {
      console.warn("[PDF Renderer] Vector engine error, attempting DOM canvas fallback:", err);
    }
  }

  // 2. Fallback: If DOM capture is explicitly requested or vector failed
  if (!blob && elementId) {
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

  // 3. Final Fallback: Guarantee blob creation
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
