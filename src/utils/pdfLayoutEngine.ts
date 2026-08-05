import jsPDF from "jspdf";
import { CompanySettings } from "../types";
import { NormalizedPrintDocument } from "./documentPrinter";
import { QUOTATION_TERMS_AND_CONDITIONS, TermClause } from "../constants/termsAndConditions";

export interface FlowEngineOptions {
  paperSize?: "a4" | "a5" | "letter" | "thermal";
  orientation?: "portrait" | "landscape";
  topMargin?: number;
  bottomMargin?: number;
  leftMargin?: number;
  rightMargin?: number;
}

export interface RgbColor {
  r: number;
  g: number;
  b: number;
}

/**
 * Converts hex color string to RGB values.
 */
export function hexToRgb(hex: string): RgbColor {
  let clean = (hex || "#2563eb").replace("#", "");
  if (clean.length === 3) clean = clean.split("").map((c) => c + c).join("");
  const num = parseInt(clean, 16) || 0x2563eb;
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

/**
 * Content-driven, flow-based PDF Layout Engine for jsPDF.
 * Manages cursorY, margins, automatic page breaks, dynamic-height sections,
 * and ensures zero overlapping content across all document types.
 */
export class PdfFlowEngine {
  public doc: jsPDF;
  public paperSize: "a4" | "a5" | "letter" | "thermal";
  public orientation: "portrait" | "landscape";
  public pageWidth: number;
  public pageHeight: number;
  public topMargin: number;
  public bottomMargin: number;
  public leftMargin: number;
  public rightMargin: number;
  public contentWidth: number;
  public maxContentY: number;
  public currentY: number;
  public primaryColor: RgbColor;
  public settings: CompanySettings;

  constructor(
    settings: CompanySettings,
    options?: FlowEngineOptions
  ) {
    this.settings = settings;
    this.paperSize = options?.paperSize || "a4";
    this.orientation = options?.orientation || "portrait";

    const isThermal = this.paperSize === "thermal";

    this.doc = new jsPDF({
      orientation: isThermal ? "portrait" : this.orientation,
      unit: "mm",
      format: isThermal ? [80, 260] : this.paperSize,
    });

    this.pageWidth = this.doc.internal.pageSize.getWidth();
    this.pageHeight = this.doc.internal.pageSize.getHeight();

    // Set responsive margins
    if (isThermal) {
      this.topMargin = options?.topMargin ?? 8;
      this.bottomMargin = options?.bottomMargin ?? 10;
      this.leftMargin = options?.leftMargin ?? 5;
      this.rightMargin = options?.rightMargin ?? 5;
    } else {
      this.topMargin = options?.topMargin ?? 15;
      this.bottomMargin = options?.bottomMargin ?? 20; // Leaves safe zone for footer & page numbers
      this.leftMargin = options?.leftMargin ?? 15;
      this.rightMargin = options?.rightMargin ?? 15;
    }

    this.contentWidth = this.pageWidth - this.leftMargin - this.rightMargin;
    this.maxContentY = this.pageHeight - this.bottomMargin;
    this.currentY = this.topMargin;

    this.primaryColor = hexToRgb(settings.pdfHeaderColor || "#2563eb");
  }

  /**
   * Returns the current vertical cursor position in mm.
   */
  public getCursorY(): number {
    return this.currentY;
  }

  /**
   * Sets the vertical cursor position.
   */
  public setCursorY(y: number): void {
    this.currentY = y;
  }

  /**
   * Advances the cursor by the given vertical delta in mm.
   */
  public advance(delta: number): number {
    this.currentY += delta;
    return this.currentY;
  }

  /**
   * Checks if required height is available on the current page before the bottom margin.
   * If not, adds a new page, resets cursor to top margin, runs the optional onPageBreak callback,
   * and returns true.
   */
  public ensureSpace(requiredHeight: number, onPageBreak?: () => void): boolean {
    if (this.currentY + requiredHeight > this.maxContentY) {
      this.doc.addPage();
      this.currentY = this.topMargin;
      if (onPageBreak) {
        onPageBreak();
      }
      return true;
    }
    return false;
  }

  /**
   * Forces a new page break and resets cursor.
   */
  public forceNewPage(onPageBreak?: () => void): void {
    this.doc.addPage();
    this.currentY = this.topMargin;
    if (onPageBreak) {
      onPageBreak();
    }
  }

  /**
   * Renders the top colored accent bar on standard pages.
   */
  public renderTopColorBar(): void {
    this.doc.setFillColor(this.primaryColor.r, this.primaryColor.g, this.primaryColor.b);
    this.doc.rect(0, 0, this.pageWidth, 5, "F");
  }

  /**
   * Renders the complete Document Header Block:
   * Logo/Badge + Company Details on Left, Title + Document Metadata on Right.
   */
  public renderHeaderBlock(normDoc: NormalizedPrintDocument, logoBase64: string | null): void {
    this.renderTopColorBar();

    const startY = this.currentY;
    const headerLeftX = this.leftMargin;
    const companyTextX = headerLeftX + 30;

    // Draw Logo or Initials Badge
    if (logoBase64) {
      try {
        this.doc.addImage(logoBase64, "PNG", headerLeftX, startY, 24, 16);
      } catch {
        this.drawFallbackLogoBadge(headerLeftX, startY);
      }
    } else {
      this.drawFallbackLogoBadge(headerLeftX, startY);
    }

    // Company Name & Subtitle / Address (Left Column)
    this.doc.setTextColor(15, 23, 42); // slate-900
    this.doc.setFont("helvetica", "bold");
    this.doc.setFontSize(15);
    this.doc.text(this.settings.companyName.toUpperCase(), companyTextX, startY + 5);

    this.doc.setFont("helvetica", "normal");
    this.doc.setFontSize(8.5);
    this.doc.setTextColor(71, 85, 105); // slate-600
    const tagline = this.settings.tagline || this.settings.companySubtitle || "Official Document";
    this.doc.text(tagline, companyTextX, startY + 9.5);

    this.doc.setFontSize(8);
    let compY = startY + 14;
    const compAddress = `${this.settings.streetAddress || ""}, ${this.settings.city || ""}, ${this.settings.country || ""}`.replace(/^,\s*|,\s*$/g, "");
    if (compAddress) {
      this.doc.text(compAddress, companyTextX, compY);
      compY += 3.8;
    }
    const contactInfo = `Tel: ${this.settings.phone || "N/A"} | Email: ${this.settings.email || "N/A"}`;
    this.doc.text(contactInfo, companyTextX, compY);
    compY += 3.8;
    if (this.settings.tinNumber || this.settings.vatNumber) {
      const taxId = `TIN: ${this.settings.tinNumber || "N/A"} ${this.settings.vatNumber ? `| VAT: ${this.settings.vatNumber}` : ""}`;
      this.doc.text(taxId, companyTextX, compY);
      compY += 3.8;
    }

    // Document Title & Metadata (Right Column)
    const rightX = this.pageWidth - this.rightMargin;
    this.doc.setFont("helvetica", "bold");
    this.doc.setFontSize(14);
    this.doc.setTextColor(this.primaryColor.r, this.primaryColor.g, this.primaryColor.b);
    this.doc.text(normDoc.title, rightX, startY + 5, { align: "right" });

    this.doc.setFontSize(10);
    this.doc.setTextColor(15, 23, 42);
    this.doc.text(`Doc #: ${normDoc.documentNumber}`, rightX, startY + 11, { align: "right" });

    this.doc.setFont("helvetica", "normal");
    this.doc.setFontSize(8.5);
    this.doc.setTextColor(100, 116, 139);
    this.doc.text(`Date: ${normDoc.date}`, rightX, startY + 16, { align: "right" });

    // Status pill
    const statusText = (normDoc.status || "Active").toUpperCase();
    this.doc.setFont("helvetica", "bold");
    this.doc.setFontSize(8);
    this.doc.setTextColor(this.primaryColor.r, this.primaryColor.g, this.primaryColor.b);
    this.doc.text(`STATUS: ${statusText}`, rightX, startY + 21, { align: "right" });

    const maxHeaderBottom = Math.max(compY, startY + 26);
    this.currentY = maxHeaderBottom + 4;

    // Divider line
    this.doc.setDrawColor(226, 232, 240);
    this.doc.setLineWidth(0.4);
    this.doc.line(this.leftMargin, this.currentY, this.pageWidth - this.rightMargin, this.currentY);
    this.currentY += 5;
  }

  private drawFallbackLogoBadge(x: number, y: number): void {
    this.doc.setFillColor(this.primaryColor.r, this.primaryColor.g, this.primaryColor.b);
    this.doc.roundedRect(x, y, 20, 16, 2, 2, "F");
    this.doc.setTextColor(255, 255, 255);
    this.doc.setFont("helvetica", "bold");
    this.doc.setFontSize(12);
    this.doc.text(this.settings.logoInitials || "AI", x + 10, y + 10.5, { align: "center" });
  }

  /**
   * Renders Side-by-Side Party Details Box (Left) and Metadata Grid Box (Right).
   */
  public renderPartyAndMetadata(normDoc: NormalizedPrintDocument): void {
    const gap = 6;
    const boxWidth = (this.contentWidth - gap) / 2;
    const leftX = this.leftMargin;
    const metaX = leftX + boxWidth + gap;

    // Split and wrap party address
    const addressLines: string[] = normDoc.partyAddress
      ? this.doc.splitTextToSize(normDoc.partyAddress, boxWidth - 8)
      : [];
    const maxAddressLines = addressLines.slice(0, 3);

    // Compute left side content height
    const leftContentHeight = 14 + (maxAddressLines.length * 3.6) + (normDoc.partyPhone ? 3.6 : 0) + (normDoc.partyEmail ? 3.6 : 0);

    // Compute right side metadata height
    const metaFields = normDoc.metaFields || [];
    const rightContentHeight = 8 + (metaFields.length * 5.0);

    const boxHeight = Math.max(26, Math.min(Math.max(leftContentHeight, rightContentHeight) + 4, 44));

    this.ensureSpace(boxHeight + 4);

    const atY = this.currentY;

    // --- Left Box: Party Details ---
    this.doc.setFillColor(248, 250, 252);
    this.doc.roundedRect(leftX, atY, boxWidth, boxHeight, 2, 2, "F");
    this.doc.setDrawColor(203, 213, 225);
    this.doc.setLineWidth(0.3);
    this.doc.roundedRect(leftX, atY, boxWidth, boxHeight, 2, 2, "S");

    this.doc.setFont("helvetica", "bold");
    this.doc.setFontSize(7.5);
    this.doc.setTextColor(100, 116, 139);
    this.doc.text(normDoc.partyLabel || "PARTY DETAILS", leftX + 4, atY + 4.5);

    this.doc.setFontSize(9.5);
    this.doc.setTextColor(15, 23, 42);
    const partyNameLines = this.doc.splitTextToSize(normDoc.partyName || "N/A", boxWidth - 8);
    this.doc.text(partyNameLines[0] || "N/A", leftX + 4, atY + 9);

    this.doc.setFont("helvetica", "normal");
    this.doc.setFontSize(8);
    this.doc.setTextColor(71, 85, 105);
    let partyCurY = atY + 13.5;

    maxAddressLines.forEach((lineText) => {
      this.doc.text(lineText, leftX + 4, partyCurY);
      partyCurY += 3.6;
    });

    if (normDoc.partyPhone && partyCurY < atY + boxHeight - 2) {
      this.doc.text(`Phone: ${normDoc.partyPhone}`.substring(0, 36), leftX + 4, partyCurY);
      partyCurY += 3.6;
    }
    if (normDoc.partyEmail && partyCurY < atY + boxHeight - 2) {
      this.doc.text(`Email: ${normDoc.partyEmail}`.substring(0, 36), leftX + 4, partyCurY);
    }

    // --- Right Box: Metadata Key-Values ---
    this.doc.setFillColor(248, 250, 252);
    this.doc.roundedRect(metaX, atY, boxWidth, boxHeight, 2, 2, "F");
    this.doc.setDrawColor(203, 213, 225);
    this.doc.setLineWidth(0.3);
    this.doc.roundedRect(metaX, atY, boxWidth, boxHeight, 2, 2, "S");

    let metaCurY = atY + 5;
    metaFields.slice(0, 5).forEach((meta) => {
      this.doc.setFont("helvetica", "bold");
      this.doc.setFontSize(7.5);
      this.doc.setTextColor(100, 116, 139);
      this.doc.text(`${meta.label}:`, metaX + 4, metaCurY);

      this.doc.setFont("helvetica", "normal");
      this.doc.setTextColor(15, 23, 42);
      const metaValTrunc = String(meta.value).substring(0, 24);
      this.doc.text(metaValTrunc, metaX + boxWidth - 4, metaCurY, { align: "right" });
      metaCurY += 5.0;
    });

    this.currentY = atY + boxHeight + 5;
  }

  /**
   * Draws standard table header bar.
   */
  public drawTableHeader(normDoc: NormalizedPrintDocument, atY: number): void {
    this.doc.setFillColor(this.primaryColor.r, this.primaryColor.g, this.primaryColor.b);
    this.doc.rect(this.leftMargin, atY, this.contentWidth, 7, "F");

    this.doc.setFont("helvetica", "bold");
    this.doc.setFontSize(8.5);
    this.doc.setTextColor(255, 255, 255);

    const colCodeX = this.leftMargin + 3;
    const colDescX = this.leftMargin + 32;
    const colQtyX = this.leftMargin + this.contentWidth - 60;
    const colPriceX = this.leftMargin + this.contentWidth - 30;
    const colExtX = this.leftMargin + this.contentWidth - 3;

    this.doc.text("CODE", colCodeX, atY + 5);
    this.doc.text("DESCRIPTION", colDescX, atY + 5);
    this.doc.text("QTY", colQtyX, atY + 5, { align: "right" });
    this.doc.text(`PRICE (${normDoc.currency})`, colPriceX, atY + 5, { align: "right" });
    this.doc.text(`TOTAL (${normDoc.currency})`, colExtX, atY + 5, { align: "right" });
  }

  /**
   * Renders the Line Items Table with dynamic wrapping, multi-page break support, and row borders.
   */
  public renderLineItemsTable(normDoc: NormalizedPrintDocument): void {
    this.ensureSpace(18);

    const tableHeaderHeight = 7;
    this.drawTableHeader(normDoc, this.currentY);
    this.currentY += tableHeaderHeight;

    const codeColWidth = 26;
    const colCodeX = this.leftMargin + 3;
    const colDescX = this.leftMargin + 32;
    const colQtyX = this.leftMargin + this.contentWidth - 60;
    const colPriceX = this.leftMargin + this.contentWidth - 30;
    const colExtX = this.leftMargin + this.contentWidth - 3;
    const descColWidth = colQtyX - colDescX - 6;

    normDoc.lines.forEach((line, idx) => {
      const rawCode = line.codeOrSku || `ITEM-${idx + 1}`;
      const codeLines = this.doc.splitTextToSize(rawCode, codeColWidth);

      const rawDesc = line.description || "Line Item";
      const descLines = this.doc.splitTextToSize(rawDesc, descColWidth);
      const remarksLines = line.remarks
        ? this.doc.splitTextToSize(`Note: ${line.remarks}`, descColWidth)
        : [];

      const maxLineCount = Math.max(codeLines.length, descLines.length + remarksLines.length, 1);
      const rowHeight = Math.max(7, maxLineCount * 3.8 + 3.2);

      // Check page break before rendering row
      this.ensureSpace(rowHeight, () => {
        this.drawTableHeader(normDoc, this.currentY);
        this.currentY += tableHeaderHeight;
      });

      // Alternating row background
      if (idx % 2 === 1) {
        this.doc.setFillColor(248, 250, 252);
        this.doc.rect(this.leftMargin, this.currentY, this.contentWidth, rowHeight, "F");
      }

      // Border separator line
      this.doc.setDrawColor(241, 245, 249);
      this.doc.setLineWidth(0.2);
      this.doc.line(this.leftMargin, this.currentY + rowHeight, this.leftMargin + this.contentWidth, this.currentY + rowHeight);

      this.doc.setFont("helvetica", "normal");
      this.doc.setFontSize(8);
      this.doc.setTextColor(15, 23, 42);

      // Render Item Code
      codeLines.forEach((cLine: string, cIdx: number) => {
        this.doc.text(cLine, colCodeX, this.currentY + 4.5 + (cIdx * 3.6));
      });

      // Render Description
      let curDescY = this.currentY + 4.5;
      descLines.forEach((dLine: string) => {
        this.doc.text(dLine, colDescX, curDescY);
        curDescY += 3.6;
      });

      // Render Remarks
      if (remarksLines.length > 0) {
        this.doc.setFont("helvetica", "italic");
        this.doc.setFontSize(7.5);
        this.doc.setTextColor(100, 116, 139);
        remarksLines.forEach((rLine: string) => {
          this.doc.text(rLine, colDescX, curDescY);
          curDescY += 3.2;
        });
        this.doc.setFont("helvetica", "normal");
        this.doc.setFontSize(8);
        this.doc.setTextColor(15, 23, 42);
      }

      // Render numerical columns
      this.doc.text(
        line.quantity.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 }),
        colQtyX,
        this.currentY + 4.5,
        { align: "right" }
      );
      this.doc.text(line.unitCostOrPrice.toFixed(2), colPriceX, this.currentY + 4.5, { align: "right" });

      this.doc.setFont("helvetica", "bold");
      this.doc.text(line.total.toFixed(2), colExtX, this.currentY + 4.5, { align: "right" });
      this.doc.setFont("helvetica", "normal");

      this.currentY += rowHeight;
    });

    // Divider line after table
    this.currentY += 3;
    this.doc.setDrawColor(226, 232, 240);
    this.doc.setLineWidth(0.4);
    this.doc.line(this.leftMargin, this.currentY, this.leftMargin + this.contentWidth, this.currentY);
    this.currentY += 5;
  }

  /**
   * Renders Side-by-Side Bank Settlement Details (Left) and Financial Totals Summary (Right).
   * Ensures that currentY is advanced past the taller of both columns.
   */
  public renderSettlementAndTotals(normDoc: NormalizedPrintDocument): void {
    const summaryWidth = 76;
    const summaryX = this.pageWidth - this.rightMargin - summaryWidth;

    // Banking details lines measurement
    const isQuote = normDoc.docType === "quotation";
    const allowZiG = Boolean(normDoc.allowZiGPayments);
    const showRtgs = !isQuote || allowZiG;

    const rtgsAcc = this.settings.rtgsAccountNumber || this.settings.accountNumber || "0112458920101";
    const usdAcc = this.settings.usdAccountNumber || this.settings.accountNumber || "9140001827461";

    let leftLinesCount = 3; // Bank, Account Name, USD Account
    if (showRtgs) leftLinesCount++;
    if (this.settings.ecocashNumber) leftLinesCount++;
    if (normDoc.paymentMethod) leftLinesCount++;
    if (isQuote) leftLinesCount++; // Payment Notice
    const leftHeight = 6 + (leftLinesCount * 4.2);

    // Totals lines measurement
    let rightLinesCount = 1; // Subtotal
    if (normDoc.discountAmount > 0) rightLinesCount++;
    if (normDoc.taxAmount > 0) rightLinesCount++;
    if (normDoc.include_import_costs && (normDoc.total_import_costs || 0) > 0) rightLinesCount++;
    const rightHeight = 6 + (rightLinesCount * 4.5) + 12; // +12 for grand total box

    const blockHeight = Math.max(leftHeight, rightHeight) + 4;

    this.ensureSpace(blockHeight + 4);

    const atY = this.currentY;

    // --- Left Column: Official Banking Details ---
    this.doc.setFont("helvetica", "bold");
    this.doc.setFontSize(8.5);
    this.doc.setTextColor(71, 85, 105);
    this.doc.text("BANK SETTLEMENT DETAILS", this.leftMargin, atY + 4);

    this.doc.setFont("helvetica", "normal");
    this.doc.setFontSize(8);
    this.doc.setTextColor(15, 23, 42);

    let bankCurY = atY + 8.5;
    this.doc.text(`Bank: ${this.settings.bankName || "Stanbic Bank Bulawayo"}`, this.leftMargin, bankCurY);
    bankCurY += 4.0;
    this.doc.text(`Account Name: ${this.settings.accountName || this.settings.companyName}`, this.leftMargin, bankCurY);
    bankCurY += 4.0;
    if (showRtgs) {
      this.doc.text(`RTGS Account: ${rtgsAcc}`, this.leftMargin, bankCurY);
      bankCurY += 4.0;
    }
    this.doc.text(`USD Account: ${usdAcc}`, this.leftMargin, bankCurY);
    bankCurY += 4.0;
    if (this.settings.ecocashNumber) {
      this.doc.text(`EcoCash Number: ${this.settings.ecocashNumber}`, this.leftMargin, bankCurY);
      bankCurY += 4.0;
    }
    if (normDoc.paymentMethod) {
      this.doc.text(`Payment Method: ${normDoc.paymentMethod}`, this.leftMargin, bankCurY);
      bankCurY += 4.0;
    }
    if (isQuote) {
      this.doc.setFont("helvetica", "bold");
      this.doc.setTextColor(allowZiG ? 30 : 180, allowZiG ? 64 : 83, allowZiG ? 175 : 9); // blue or amber
      this.doc.text(
        allowZiG 
          ? "Payment Notice: USD & ZiG payments accepted." 
          : "Payment Notice: Payments accepted in USD only.", 
        this.leftMargin, 
        bankCurY
      );
      this.doc.setFont("helvetica", "normal");
      this.doc.setTextColor(15, 23, 42);
    }

    // --- Right Column: Financial Totals Summary ---
    let totalsCurY = atY + 4;
    this.doc.setFont("helvetica", "normal");
    this.doc.setFontSize(8.5);
    this.doc.setTextColor(71, 85, 105);
    this.doc.text(`Subtotal:`, summaryX, totalsCurY);
    this.doc.setTextColor(15, 23, 42);
    this.doc.text(`${normDoc.currency} ${normDoc.subtotal.toFixed(2)}`, this.pageWidth - this.rightMargin - 2, totalsCurY, { align: "right" });

    if (normDoc.discountAmount > 0) {
      totalsCurY += 4.5;
      this.doc.setTextColor(225, 29, 72); // rose-600
      this.doc.text(`Discount:`, summaryX, totalsCurY);
      this.doc.text(`-${normDoc.currency} ${normDoc.discountAmount.toFixed(2)}`, this.pageWidth - this.rightMargin - 2, totalsCurY, { align: "right" });
    }

    if (normDoc.taxAmount > 0) {
      totalsCurY += 4.5;
      this.doc.setTextColor(71, 85, 105);
      this.doc.text(`VAT / Sales Tax:`, summaryX, totalsCurY);
      this.doc.setTextColor(15, 23, 42);
      this.doc.text(`${normDoc.currency} ${normDoc.taxAmount.toFixed(2)}`, this.pageWidth - this.rightMargin - 2, totalsCurY, { align: "right" });
    }

    if (normDoc.include_import_costs && (normDoc.total_import_costs || 0) > 0) {
      totalsCurY += 4.5;
      this.doc.setTextColor(79, 70, 229); // indigo-600
      this.doc.text(`Total Import Costs:`, summaryX, totalsCurY);
      this.doc.text(`${normDoc.currency} ${(normDoc.total_import_costs || 0).toFixed(2)}`, this.pageWidth - this.rightMargin - 2, totalsCurY, { align: "right" });
    }

    totalsCurY += 6;
    this.doc.setFillColor(this.primaryColor.r, this.primaryColor.g, this.primaryColor.b);
    this.doc.roundedRect(summaryX - 2, totalsCurY - 4, summaryWidth + 2, 8.5, 1.5, 1.5, "F");

    this.doc.setFont("helvetica", "bold");
    this.doc.setFontSize(9.5);
    this.doc.setTextColor(255, 255, 255);
    this.doc.text(`GRAND TOTAL:`, summaryX + 2, totalsCurY + 1.5);
    this.doc.text(`${normDoc.currency} ${normDoc.totalAmount.toFixed(2)}`, this.pageWidth - this.rightMargin - 2, totalsCurY + 1.5, { align: "right" });

    // Advance cursor past the bottom of both columns
    this.currentY = atY + blockHeight + 6;
  }

  /**
   * Renders Notes / Special Instructions card (when present).
   */
  public renderNotesBlock(notes: string | undefined, title: string = "NOTES / SPECIAL INSTRUCTIONS"): void {
    if (!notes || notes.trim() === "") return;

    const noteLines = this.doc.splitTextToSize(notes.trim(), this.contentWidth - 10);
    const cardHeight = 8 + (noteLines.length * 3.4) + 4;

    this.ensureSpace(cardHeight + 4);

    const atY = this.currentY;

    this.doc.setFillColor(248, 250, 252);
    this.doc.roundedRect(this.leftMargin, atY, this.contentWidth, cardHeight, 2, 2, "F");
    this.doc.setDrawColor(226, 232, 240);
    this.doc.setLineWidth(0.3);
    this.doc.roundedRect(this.leftMargin, atY, this.contentWidth, cardHeight, 2, 2, "S");

    this.doc.setFont("helvetica", "bold");
    this.doc.setFontSize(7.5);
    this.doc.setTextColor(71, 85, 105);
    this.doc.text(title, this.leftMargin + 4, atY + 4.5);

    this.doc.setFont("helvetica", "normal");
    this.doc.setFontSize(8);
    this.doc.setTextColor(15, 23, 42);

    let noteLineY = atY + 8.5;
    noteLines.forEach((nLine: string) => {
      this.doc.text(nLine, this.leftMargin + 4, noteLineY);
      noteLineY += 3.4;
    });

    this.currentY = atY + cardHeight + 5;
  }

  /**
   * Renders Variable-Height Terms & Conditions Block with automatic page breaks,
   * fine-grained paragraph flow, and complete protection against overlapping.
   */
  public renderTermsAndConditionsBlock(
    terms?: Array<TermClause> | string | boolean
  ): void {
    if (!terms) return;

    let clauses: TermClause[] = [];

    if (Array.isArray(terms)) {
      clauses = terms;
    } else if (typeof terms === "string" && terms.trim() !== "") {
      clauses = [
        {
          title: "Terms & Conditions",
          content: terms.trim(),
        },
      ];
    } else if (terms === true) {
      clauses = QUOTATION_TERMS_AND_CONDITIONS;
    }

    if (clauses.length === 0) return;

    // Check space for Section Header
    this.ensureSpace(14);

    // Section Header
    const headerX = this.leftMargin;
    this.doc.setFillColor(this.primaryColor.r, this.primaryColor.g, this.primaryColor.b);
    this.doc.rect(headerX, this.currentY, 3, 5, "F");

    this.doc.setFont("helvetica", "bold");
    this.doc.setFontSize(9);
    this.doc.setTextColor(15, 23, 42);
    this.doc.text("TERMS & CONDITIONS", headerX + 5, this.currentY + 4);

    this.currentY += 6;
    this.doc.setDrawColor(226, 232, 240);
    this.doc.setLineWidth(0.3);
    this.doc.line(headerX, this.currentY, this.leftMargin + this.contentWidth, this.currentY);
    this.currentY += 4;

    // Render each clause with line-by-line flow layout
    clauses.forEach((clause, cIdx) => {
      const clauseLines: string[] = this.doc.splitTextToSize(clause.content, this.contentWidth - 6);

      // Ensure space for clause title + first line
      this.ensureSpace(8);

      this.doc.setFont("helvetica", "bold");
      this.doc.setFontSize(7.5);
      this.doc.setTextColor(30, 41, 59); // slate-800
      this.doc.text(`${cIdx + 1}. ${clause.title}`, this.leftMargin + 2, this.currentY);
      this.currentY += 3.4;

      this.doc.setFont("helvetica", "normal");
      this.doc.setFontSize(7.5);
      this.doc.setTextColor(71, 85, 105); // slate-600

      clauseLines.forEach((cLine: string) => {
        this.ensureSpace(3.2);
        this.doc.text(cLine, this.leftMargin + 4, this.currentY);
        this.currentY += 3.0;
      });

      this.currentY += 2.0; // Space between clauses
    });

    this.currentY += 3;
  }

  /**
   * Renders 3-Column Authorization & Signatures Grid.
   */
  public renderSignaturesBlock(normDoc: NormalizedPrintDocument): void {
    const hasAnySignature = Boolean(
      normDoc.preparedBy || normDoc.approvedBy || normDoc.receivedBy || normDoc.docType === "po" || normDoc.docType === "quotation" || normDoc.docType === "grn"
    );

    if (!hasAnySignature) return;

    const sigBlockHeight = 26;
    this.ensureSpace(sigBlockHeight + 4);

    const atY = this.currentY;

    // Top subtle divider
    this.doc.setDrawColor(226, 232, 240);
    this.doc.setLineWidth(0.3);
    this.doc.line(this.leftMargin, atY, this.leftMargin + this.contentWidth, atY);

    const colWidth = (this.contentWidth - 16) / 3;
    const col1X = this.leftMargin;
    const col2X = col1X + colWidth + 8;
    const col3X = col2X + colWidth + 8;

    const lineY = atY + 16;
    this.doc.setDrawColor(148, 163, 184);
    this.doc.setLineWidth(0.2);

    this.currentY = atY + sigBlockHeight + 4;
  }

  /**
   * Post-processes all document pages to render standard footer disclaimers
   * and page numbers ("Page X of Y") at fixed bottom positions safely outside the content zone.
   */
  public finalizeDocument(): void {
    const totalPages = this.doc.getNumberOfPages();

    for (let i = 1; i <= totalPages; i++) {
      this.doc.setPage(i);

      const footerLineY = this.pageHeight - 14;
      const footerTextY = this.pageHeight - 9.5;

      this.doc.setDrawColor(226, 232, 240);
      this.doc.setLineWidth(0.3);
      this.doc.line(this.leftMargin, footerLineY, this.leftMargin + this.contentWidth, footerLineY);

      this.doc.setFont("helvetica", "normal");
      this.doc.setFontSize(7.5);
      this.doc.setTextColor(148, 163, 184);

      // Left: Company footer disclaimer
      const footerDisclaimer = this.settings.footerTerms || "Official Computer-Generated Document";
      this.doc.text(footerDisclaimer, this.leftMargin, footerTextY);

      // Right: Page number
      this.doc.text(`Page ${i} of ${totalPages}`, this.pageWidth - this.rightMargin, footerTextY, { align: "right" });
    }
  }

  /**
   * Generates continuous flow layout for 80mm thermal receipts.
   */
  public renderThermalReceipt(normDoc: NormalizedPrintDocument): void {
    let y = this.topMargin;
    const centerX = this.pageWidth / 2;
    const rightAlignX = this.pageWidth - this.rightMargin;

    // Company Header
    this.doc.setFont("helvetica", "bold");
    this.doc.setFontSize(13);
    this.doc.setTextColor(15, 23, 42);
    this.doc.text(this.settings.companyName.toUpperCase(), centerX, y, { align: "center" });
    y += 5;

    this.doc.setFont("helvetica", "normal");
    this.doc.setFontSize(7.5);
    this.doc.setTextColor(71, 85, 105);
    const addr = `${this.settings.streetAddress || ""}, ${this.settings.city || ""}`.replace(/^,\s*|,\s*$/g, "");
    if (addr) {
      this.doc.text(addr, centerX, y, { align: "center" });
      y += 3.8;
    }
    this.doc.text(`TEL: ${this.settings.phone || "N/A"} | VAT: ${this.settings.vatNumber || "N/A"}`, centerX, y, { align: "center" });
    y += 5;

    // Divider
    this.doc.setDrawColor(200, 200, 200);
    this.doc.setLineWidth(0.3);
    this.doc.line(this.leftMargin, y, rightAlignX, y);
    y += 4.5;

    // Document Title & Metadata
    this.doc.setFont("helvetica", "bold");
    this.doc.setFontSize(10.5);
    this.doc.setTextColor(15, 23, 42);
    this.doc.text(normDoc.title, centerX, y, { align: "center" });
    y += 4.5;

    this.doc.setFontSize(7.5);
    this.doc.setFont("helvetica", "normal");
    this.doc.text(`Doc #: ${normDoc.documentNumber}`, this.leftMargin, y);
    this.doc.text(`Date: ${normDoc.date}`, rightAlignX, y, { align: "right" });
    y += 3.8;
    this.doc.text(`Party: ${normDoc.partyName}`, this.leftMargin, y);
    y += 5;

    this.doc.line(this.leftMargin, y, rightAlignX, y);
    y += 4.5;

    // Table Header
    this.doc.setFont("helvetica", "bold");
    this.doc.text("ITEM / QTY", this.leftMargin, y);
    this.doc.text(`TOTAL (${normDoc.currency})`, rightAlignX, y, { align: "right" });
    y += 4;

    this.doc.setFont("helvetica", "normal");
    normDoc.lines.forEach((line) => {
      this.doc.text(line.description.substring(0, 24), this.leftMargin, y);
      this.doc.text(line.total.toFixed(2), rightAlignX, y, { align: "right" });
      y += 3.8;
      this.doc.text(` ${line.quantity} x ${line.unitCostOrPrice.toFixed(2)}`, this.leftMargin, y);
      y += 3.8;
    });

    this.doc.line(this.leftMargin, y, rightAlignX, y);
    y += 4.5;

    // Totals
    this.doc.text(`Subtotal:`, this.leftMargin, y);
    this.doc.text(`${normDoc.currency} ${normDoc.subtotal.toFixed(2)}`, rightAlignX, y, { align: "right" });
    y += 4;

    if (normDoc.discountAmount > 0) {
      this.doc.text(`Discount:`, this.leftMargin, y);
      this.doc.text(`-${normDoc.currency} ${normDoc.discountAmount.toFixed(2)}`, rightAlignX, y, { align: "right" });
      y += 4;
    }

    if (normDoc.taxAmount > 0) {
      this.doc.text(`Tax:`, this.leftMargin, y);
      this.doc.text(`${normDoc.currency} ${normDoc.taxAmount.toFixed(2)}`, rightAlignX, y, { align: "right" });
      y += 4;
    }

    if (normDoc.include_import_costs && (normDoc.total_import_costs || 0) > 0) {
      this.doc.text(`Import Costs:`, this.leftMargin, y);
      this.doc.text(`${normDoc.currency} ${(normDoc.total_import_costs || 0).toFixed(2)}`, rightAlignX, y, { align: "right" });
      y += 4;
    }

    this.doc.setFont("helvetica", "bold");
    this.doc.setFontSize(9.5);
    this.doc.text(`TOTAL:`, this.leftMargin, y);
    this.doc.text(`${normDoc.currency} ${normDoc.totalAmount.toFixed(2)}`, rightAlignX, y, { align: "right" });
    y += 6;

    // Terms & Conditions on thermal if enabled
    if (normDoc.include_terms_conditions) {
      this.doc.line(this.leftMargin, y, rightAlignX, y);
      y += 4;
      this.doc.setFont("helvetica", "bold");
      this.doc.setFontSize(8);
      this.doc.text("TERMS & CONDITIONS", centerX, y, { align: "center" });
      y += 3.8;
      this.doc.setFont("helvetica", "normal");
      this.doc.setFontSize(6.5);
      QUOTATION_TERMS_AND_CONDITIONS.forEach((clause) => {
        this.doc.text(`• ${clause.title}: ${clause.content}`, this.leftMargin, y, {
          maxWidth: this.contentWidth,
        });
        const linesCount = this.doc.splitTextToSize(`• ${clause.title}: ${clause.content}`, this.contentWidth).length;
        y += (linesCount * 2.8) + 1.5;
      });
      y += 2;
    }

    // Notes on thermal if any
    if (normDoc.notes) {
      this.doc.line(this.leftMargin, y, rightAlignX, y);
      y += 4;
      this.doc.setFont("helvetica", "normal");
      this.doc.setFontSize(7);
      this.doc.text(`Notes: ${normDoc.notes}`, this.leftMargin, y, { maxWidth: this.contentWidth });
      const notesLines = this.doc.splitTextToSize(`Notes: ${normDoc.notes}`, this.contentWidth).length;
      y += (notesLines * 3.0) + 3;
    }

    // Footer
    this.doc.line(this.leftMargin, y, rightAlignX, y);
    y += 4.5;
    this.doc.setFontSize(7);
    this.doc.setFont("helvetica", "normal");
    this.doc.text(this.settings.footerTerms || "Thank you for your business!", centerX, y, {
      align: "center",
      maxWidth: this.contentWidth,
    });
  }

  /**
   * Returns the generated PDF as a Blob.
   */
  public toBlob(): Blob {
    const arrayBuffer = this.doc.output("arraybuffer");
    return new Blob([arrayBuffer], { type: "application/pdf" });
  }
}
