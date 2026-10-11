import { CompanySettings } from "../types";

export const DEFAULT_QUOTATION_TERMS = `1. Quotation Validity
This quotation is valid for 30 calendar days from the date of issue unless otherwise stated.

2. Pricing, Taxes & Duties
All prices quoted are in United States Dollars (USD). Import costs, including freight, customs duties, and related charges where applicable, are indicated separately and are based on estimates available at the time of quotation. Actual import costs will be confirmed once the shipment has been received and processed by the freight forwarder. Where actual import costs differ from the estimate, the customer will be advised before the order is finalized.

3. Availability of Goods
The items quoted may be supplied from existing stock and/or procured specifically for this order. Availability of specially procured items is subject to supplier confirmation at the time of order.

4. Order Confirmation, Lead Time & Delivery
Procurement of goods will commence upon receipt of an official Purchase Order (PO) and fulfillment of agreed payment terms. Estimated delivery periods are generally 14–30 working days unless otherwise specified. Delivery periods are estimates only and subject to freight and customs clearance.

5. Payment Terms, Warranty & Inspection
Full payment must be made before delivery of goods unless otherwise agreed in writing by Acunova Pvt Ltd. Products are supplied with applicable manufacturer warranty where available. Inspection must be performed upon delivery and shortages reported within 48 hours.

6. Acceptance
Acceptance of this quotation or issuance of a Purchase Order constitutes acceptance of these Terms & Conditions.`;

export const DEFAULT_INVOICE_TERMS = `1. Payment Due
Payment is due within 14 calendar days of the invoice date unless otherwise specified on the invoice.

2. Settlement & Currencies
Payments may be deposited into the designated POSB USD or RTGS accounts, or settled via EcoCash as specified on this invoice.

3. Title & Risk
All supplied equipment and components remain the legal property of Acunova Pvt Ltd until the invoice amount is fully settled.

4. Overdue Accounts
Late payments beyond the agreed credit period may result in suspension of further dispatches and credit facilities.`;

export const DEFAULT_RECEIPT_TERMS = `1. Official Proof of Payment
This document serves as an official computer-generated receipt of payment for the items and amounts recorded.

2. Returns & Inspection Policy
Goods once inspected and released cannot be returned after 48 hours without prior authorization and valid proof of purchase.

3. Warranty Claims
Manufacturer warranty applies to eligible components upon presentation of this receipt and matching serial numbers.`;

export const DEFAULT_PURCHASE_ORDER_TERMS = `1. Purchase Order Acceptance
Acceptance of this Purchase Order constitutes agreement to deliver specified components at the agreed unit prices.

2. Quality & Authenticity
All components supplied must be genuine, new, and conform strictly to the specified technical ratings and packaging standards.

3. Delivery Inspection
Acunova Pvt Ltd reserves the right to reject items that do not meet required specifications or are visibly damaged in transit.`;

export const DEFAULT_DELIVERY_TERMS = `1. Receipt in Good Order
The consignee acknowledges receipt of the specified goods in full quantity and sound condition upon signing this delivery note.

2. Discrepancies & Shortages
Any damage, shortages, or delivery discrepancies must be noted immediately and reported to our office within 48 hours.

3. Risk Transfer
Risk of loss or damage passes to the customer or authorized receiver upon handover and counter-signature.`;

export const DEFAULT_GENERAL_TERMS = `1. General Trading Conditions
All transactions and quotations conducted with Acunova Pvt Ltd are subject to our standard commercial trading conditions.

2. Force Majeure
Neither party shall be liable for failure or delay in performance caused by circumstances beyond reasonable control, including freight disruption or customs delays.`;

export const DEFAULT_COMPANY_SETTINGS: CompanySettings = {
  companyName: "Acunova Pvt Ltd",
  companySubtitle: "Electronics & Components Supplier",
  tagline: "Suppliers of High-Quality Electronics & Components",
  logoUrl: "",
  logoInitials: "AN",
  streetAddress: "Lobengula West",
  city: "Bulawayo",
  country: "Zimbabwe",
  address: "70905 Lobengula West, Bulawayo, Zimbabwe",
  email: "acunovapvtltd@gmail.com",
  phone: "+263 715 436 611",
  tel: "",
  mobile: "+263 715 436 6111",
  mobile2: "+263 774 938 581",
  vatNumber: "",
  enableVat: false,
  taxRate: 0,
  tinNumber: "2002535002",
  registrationNumber: "",
  bankName: "POSB",
  accountName: "Acunova Pvt Ltd",
  accountNumber: "500009804419",
  rtgsAccountNumber: "500009804419",
  usdAccountNumber: "500009804436",
  ecocashNumber: "+263 774 938 581",
  currency: "USD",
  salesType: "ALL",
  doneBy: "Sales Dept",
  pdfHeaderColor: "#2563eb",
  footerTerms: "PRICES QUOTED IN USD DOLLAR. Thank you for doing business with us. Official computer-generated document.",
  quotationStyle: "corporate_modern",
  quotationTerms: DEFAULT_QUOTATION_TERMS,
  invoiceTerms: DEFAULT_INVOICE_TERMS,
  receiptTerms: DEFAULT_RECEIPT_TERMS,
  purchaseOrderTerms: DEFAULT_PURCHASE_ORDER_TERMS,
  deliveryTerms: DEFAULT_DELIVERY_TERMS,
  generalTerms: DEFAULT_GENERAL_TERMS
};

/**
 * Returns merged settings where any missing/empty string property in target
 * is safely filled with the default canonical setting value.
 */
export function getMergedCompanySettings(settings?: Partial<CompanySettings> | null): CompanySettings {
  if (!settings) return DEFAULT_COMPANY_SETTINGS;
  const legacyAccount = settings.accountNumber || DEFAULT_COMPANY_SETTINGS.accountNumber;
  return {
    companyName: settings.companyName || DEFAULT_COMPANY_SETTINGS.companyName,
    companySubtitle: settings.companySubtitle || DEFAULT_COMPANY_SETTINGS.companySubtitle,
    tagline: settings.tagline || DEFAULT_COMPANY_SETTINGS.tagline,
    logoUrl: settings.logoUrl || DEFAULT_COMPANY_SETTINGS.logoUrl,
    logoInitials: settings.logoInitials || (settings.companyName ? settings.companyName.substring(0, 2).toUpperCase() : DEFAULT_COMPANY_SETTINGS.logoInitials),
    streetAddress: settings.streetAddress || DEFAULT_COMPANY_SETTINGS.streetAddress,
    city: settings.city || DEFAULT_COMPANY_SETTINGS.city,
    country: settings.country || DEFAULT_COMPANY_SETTINGS.country,
    address: settings.address || DEFAULT_COMPANY_SETTINGS.address,
    email: settings.email || DEFAULT_COMPANY_SETTINGS.email,
    phone: settings.phone || settings.mobile || DEFAULT_COMPANY_SETTINGS.phone,
    tel: settings.tel || DEFAULT_COMPANY_SETTINGS.tel,
    mobile: settings.mobile || settings.phone || DEFAULT_COMPANY_SETTINGS.mobile,
    mobile2: settings.mobile2 || DEFAULT_COMPANY_SETTINGS.mobile2,
    vatNumber: settings.vatNumber || DEFAULT_COMPANY_SETTINGS.vatNumber,
    enableVat: settings.enableVat ?? DEFAULT_COMPANY_SETTINGS.enableVat,
    taxRate: settings.taxRate !== undefined ? settings.taxRate : DEFAULT_COMPANY_SETTINGS.taxRate,
    tinNumber: settings.tinNumber || settings.registrationNumber || DEFAULT_COMPANY_SETTINGS.tinNumber,
    registrationNumber: settings.registrationNumber || settings.tinNumber || DEFAULT_COMPANY_SETTINGS.registrationNumber,
    bankName: settings.bankName || DEFAULT_COMPANY_SETTINGS.bankName,
    accountName: settings.accountName || settings.companyName || DEFAULT_COMPANY_SETTINGS.accountName,
    accountNumber: settings.accountNumber || DEFAULT_COMPANY_SETTINGS.accountNumber,
    rtgsAccountNumber: settings.rtgsAccountNumber || settings.accountNumber || DEFAULT_COMPANY_SETTINGS.rtgsAccountNumber,
    usdAccountNumber: settings.usdAccountNumber || DEFAULT_COMPANY_SETTINGS.usdAccountNumber,
    ecocashNumber: settings.ecocashNumber || DEFAULT_COMPANY_SETTINGS.ecocashNumber,
    currency: settings.currency || DEFAULT_COMPANY_SETTINGS.currency,
    salesType: settings.salesType || DEFAULT_COMPANY_SETTINGS.salesType,
    doneBy: settings.doneBy || DEFAULT_COMPANY_SETTINGS.doneBy,
    pdfHeaderColor: settings.pdfHeaderColor || DEFAULT_COMPANY_SETTINGS.pdfHeaderColor,
    footerTerms: settings.footerTerms || DEFAULT_COMPANY_SETTINGS.footerTerms,
    quotationStyle: settings.quotationStyle || DEFAULT_COMPANY_SETTINGS.quotationStyle,
    quotationTerms: settings.quotationTerms || DEFAULT_COMPANY_SETTINGS.quotationTerms,
    invoiceTerms: settings.invoiceTerms || DEFAULT_COMPANY_SETTINGS.invoiceTerms,
    receiptTerms: settings.receiptTerms || DEFAULT_COMPANY_SETTINGS.receiptTerms,
    purchaseOrderTerms: settings.purchaseOrderTerms || DEFAULT_COMPANY_SETTINGS.purchaseOrderTerms,
    deliveryTerms: settings.deliveryTerms || DEFAULT_COMPANY_SETTINGS.deliveryTerms,
    generalTerms: settings.generalTerms || DEFAULT_COMPANY_SETTINGS.generalTerms
  };
}
