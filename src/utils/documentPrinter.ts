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

/**
 * Transforms any serialized document data into a normalized document structure for printing.
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
        metaFields: [
          { label: "Document ID", value: q.id },
          { label: "Customer ID", value: q.customerId },
          { label: "Valid Until", value: "14 Days from date of issue" }
        ],
        lines: (q.lines || []).map((line, idx) => ({
          id: line.productId || `q-line-${idx}`,
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

export type PaperSize = "a4" | "a5" | "letter" | "thermal";
export type PageOrientation = "portrait" | "landscape";

/**
 * Downloads the specified HTML element as a branded PDF formatted for the selected size and orientation.
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

  const paperSize = options?.paperSize || "a4";
  const orientation = options?.orientation || "portrait";

  // Generate canvas with elevated quality
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
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
    pdfWidth = 80; // 80mm thermal width
    const calculatedHeight = (canvas.height * pdfWidth) / canvas.width;
    pdfPageHeight = Math.max(120, calculatedHeight);
    format = [pdfWidth, pdfPageHeight];
  } else {
    // default a4
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

  pdf.save(fileName);
}

/**
 * Triggers document printing via browser print dialog.
 */
export function triggerDocumentPrint(): void {
  setTimeout(() => {
    window.print();
  }, 100);
}
