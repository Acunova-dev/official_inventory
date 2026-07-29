import { CompanySettings } from "../types";

export const DEFAULT_COMPANY_SETTINGS: CompanySettings = {
  companyName: "Acunova Pvt Ltd",
  companySubtitle: "Electronics & Components Supplier",
  tagline: "Suppliers of High-Quality Electronics & Components",
  logoUrl: "",
  logoInitials: "AN",
  streetAddress: "100 Corporate Parkway, Suite 400",
  city: "San Francisco, CA",
  country: "United States",
  address: "100 Corporate Parkway, Suite 400, San Francisco, CA",
  email: "acunovapvtltd@gmail.com",
  phone: "+1 (800) 555-8800",
  tel: "+263 ",
  mobile: "+1 (800) 555-8800",
  mobile2: "",
  vatNumber: "VAT-998877",
  enableVat: false,
  taxRate: 0,
  tinNumber: "TIN-100482910",
  registrationNumber: "REG-112233",
  bankName: "",
  accountName: "Acunova Pvt Ltd",
  accountNumber: "0112458920101",
  ecocashNumber: "*151*2*2*123456#",
  currency: "USD",
  salesType: "ALL",
  doneBy: "Sales Dept",
  pdfHeaderColor: "#2563eb",
  footerTerms: "PRICES QUOTED IN USD DOLLAR. Thank you for doing business with us. Official computer-generated document.",
  quotationStyle: "corporate_modern"
};

/**
 * Returns merged settings where any missing/empty string property in target
 * is safely filled with the default canonical setting value.
 */
export function getMergedCompanySettings(settings?: Partial<CompanySettings> | null): CompanySettings {
  if (!settings) return DEFAULT_COMPANY_SETTINGS;
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
    ecocashNumber: settings.ecocashNumber || DEFAULT_COMPANY_SETTINGS.ecocashNumber,
    currency: settings.currency || DEFAULT_COMPANY_SETTINGS.currency,
    salesType: settings.salesType || DEFAULT_COMPANY_SETTINGS.salesType,
    doneBy: settings.doneBy || DEFAULT_COMPANY_SETTINGS.doneBy,
    pdfHeaderColor: settings.pdfHeaderColor || DEFAULT_COMPANY_SETTINGS.pdfHeaderColor,
    footerTerms: settings.footerTerms || DEFAULT_COMPANY_SETTINGS.footerTerms,
    quotationStyle: settings.quotationStyle || DEFAULT_COMPANY_SETTINGS.quotationStyle,
  };
}
