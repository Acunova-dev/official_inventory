import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "../components/Layout";
import { settingsService } from "../services/api";
import { CompanySettings } from "../types";
import { DEFAULT_COMPANY_SETTINGS, getMergedCompanySettings } from "../constants/defaultSettings";
import { 
  Percent, 
  CloudLightning, 
  Building, 
  FileText,
  Upload,
  Image as ImageIcon,
  Trash2,
  Check,
  Eye,
  Building2,
  Mail,
  Phone,
  FileCheck,
  Loader2,
  Palette,
  Sparkles
} from "lucide-react";

const PRESET_COLORS = [
  { name: "Volt Blue", value: "#2563eb" },
  { name: "Emerald Green", value: "#059669" },
  { name: "Royal Purple", value: "#7c3aed" },
  { name: "Slate Dark", value: "#0f172a" },
  { name: "Ruby Red", value: "#dc2626" },
  { name: "Amber Gold", value: "#d97706" },
];

export const Settings: React.FC = () => {
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const { data: serverSettings, isLoading } = useQuery({
    queryKey: ["company-settings"],
    queryFn: settingsService.get,
  });

  const [formState, setFormState] = useState<CompanySettings>(DEFAULT_COMPANY_SETTINGS);

  useEffect(() => {
    if (serverSettings) {
      setFormState(getMergedCompanySettings(serverSettings));
    }
  }, [serverSettings]);

  const updateMutation = useMutation({
    mutationFn: (data: CompanySettings) => settingsService.update(data),
    onSuccess: (updated) => {
      queryClient.setQueryData(["company-settings"], updated);
      queryClient.invalidateQueries({ queryKey: ["company-settings"] });
      showToast("PDF document branding & header settings saved successfully!", "success");
    },
    onError: (err: any) => {
      showToast(err.response?.data?.error || "Failed to update system settings", "error");
    }
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      showToast("Logo file size must be smaller than 2MB", "error");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setFormState((prev) => ({ ...prev, logoUrl: reader.result as string }));
      showToast("Custom logo uploaded to header preview!", "success");
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setFormState((prev) => ({ ...prev, logoUrl: "" }));
    showToast("Custom logo removed. Reverted to logo initials.", "info");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(formState);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-500 font-mono text-xs">
        <Loader2 size={28} className="animate-spin text-blue-600" />
        <span>Loading system branding configuration...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl">
      
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">System Settings & PDF Branding</h1>
        <p className="text-sm text-slate-500 mt-1">
          Customize company logo, official contact information, tax IDs, and header styling rendered on PDF quotations and cash receipts.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        
        {/* PDF Branding & Header Customization Configuration Panel */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
          
          <div className="bg-slate-900 text-white p-6 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-600/30 text-blue-400 border border-blue-500/30 rounded-xl">
                <FileText size={20} />
              </div>
              <div>
                <h2 className="font-extrabold text-base tracking-tight text-white">PDF Quotation & Receipt Branding Panel</h2>
                <p className="text-xs text-slate-400">
                  Manage letterhead company logo, official title, address, tax registration, and footer disclaimer.
                </p>
              </div>
            </div>
            <span className="hidden sm:inline-block text-[10px] font-mono uppercase tracking-widest px-3 py-1 bg-slate-800 border border-slate-700 text-blue-400 rounded-full font-bold">
              PDF Header Config v2.4
            </span>
          </div>

          <div className="p-6 space-y-8">

            {/* Logo & Visual Identity */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <ImageIcon size={16} className="text-blue-600" />
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-900">1. Company Logo & Header Accent Theme</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Logo Upload Box */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700">Company Logo Image</label>
                  
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center gap-4">
                    {formState.logoUrl ? (
                      <div className="relative group shrink-0">
                        <img
                          src={formState.logoUrl}
                          alt="Logo Preview"
                          className="w-16 h-16 object-contain bg-white rounded-xl border border-slate-200 p-1 shadow-xs"
                        />
                        <button
                          type="button"
                          onClick={handleRemoveLogo}
                          className="absolute -top-2 -right-2 bg-rose-600 hover:bg-rose-700 text-white p-1 rounded-full shadow-md transition-transform group-hover:scale-110 cursor-pointer"
                          title="Remove logo"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ) : (
                      <div 
                        style={{ backgroundColor: formState.pdfHeaderColor }} 
                        className="w-16 h-16 rounded-xl flex items-center justify-center text-white font-black text-xl font-mono shadow-xs shrink-0"
                      >
                        {formState.logoInitials || "VS"}
                      </div>
                    )}

                    <div className="space-y-1.5 flex-1">
                      <p className="text-xs font-bold text-slate-800">
                        {formState.logoUrl ? "Custom Logo Active" : "Default Initial Badge Active"}
                      </p>
                      <p className="text-[11px] text-slate-500 leading-tight">
                        PNG, JPG, or SVG format (Max 2MB).
                      </p>

                      <div className="flex items-center gap-2 pt-1">
                        <label className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg text-xs font-bold text-slate-700 cursor-pointer flex items-center gap-1.5 transition-colors shadow-2xs">
                          <Upload size={13} />
                          <span>{formState.logoUrl ? "Change Logo" : "Upload Logo"}</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleLogoUpload}
                            className="hidden"
                          />
                        </label>

                        {formState.logoUrl && (
                          <button
                            type="button"
                            onClick={handleRemoveLogo}
                            className="px-2.5 py-1.5 text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                          >
                            Reset
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Logo Fallback Initials & Accent Color */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Logo Initials Badge (Fallback)</label>
                    <input
                      type="text"
                      name="logoInitials"
                      value={formState.logoInitials}
                      onChange={handleInputChange}
                      maxLength={4}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-mono font-bold uppercase focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      placeholder="VS"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                      <Palette size={13} className="text-blue-600" />
                      <span>PDF Header Accent Color</span>
                    </label>
                    <div className="flex items-center gap-2 flex-wrap">
                      {PRESET_COLORS.map((c) => (
                        <button
                          key={c.value}
                          type="button"
                          onClick={() => setFormState((prev) => ({ ...prev, pdfHeaderColor: c.value }))}
                          style={{ backgroundColor: c.value }}
                          className={`w-7 h-7 rounded-full flex items-center justify-center text-white transition-transform cursor-pointer ${
                            formState.pdfHeaderColor === c.value ? "ring-2 ring-offset-2 ring-slate-900 scale-110 shadow-md" : "hover:scale-105"
                          }`}
                          title={c.name}
                        >
                          {formState.pdfHeaderColor === c.value && <Check size={14} />}
                        </button>
                      ))}
                      <div className="flex items-center gap-1.5 ml-1">
                        <span className="text-[11px] font-mono text-slate-400">Hex:</span>
                        <input
                          type="text"
                          name="pdfHeaderColor"
                          value={formState.pdfHeaderColor}
                          onChange={handleInputChange}
                          className="w-20 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-mono font-bold"
                        />
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* Corporate Name & Tagline */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <Building size={16} className="text-blue-600" />
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-900">2. Company Name & Business Tagline</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Company Name</label>
                  <input
                    type="text"
                    name="companyName"
                    value={formState.companyName}
                    onChange={handleInputChange}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    placeholder="e.g. Acunova Pvt Ltd"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Header Subtitle Line</label>
                  <input
                    type="text"
                    name="companySubtitle"
                    value={formState.companySubtitle}
                    onChange={handleInputChange}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    placeholder="e.g. Electronics & Components Supplier"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Company Slogan / Tagline</label>
                  <input
                    type="text"
                    name="tagline"
                    value={formState.tagline}
                    onChange={handleInputChange}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    placeholder="e.g. Suppliers of High-Quality Electronics & Components"
                  />
                </div>
              </div>
            </div>

            {/* Address & Physical Location */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <Building2 size={16} className="text-blue-600" />
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-900">3. Physical Location & Address</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Street Address / Building</label>
                  <input
                    type="text"
                    name="streetAddress"
                    value={formState.streetAddress || ""}
                    onChange={handleInputChange}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    placeholder="e.g. Lobengula West"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">City / Town</label>
                  <input
                    type="text"
                    name="city"
                    value={formState.city || ""}
                    onChange={handleInputChange}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    placeholder="e.g. Bulawayo"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Country</label>
                  <input
                    type="text"
                    name="country"
                    value={formState.country || ""}
                    onChange={handleInputChange}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    placeholder="e.g. Zimbabwe"
                  />
                </div>
              </div>
            </div>

            {/* Official Contact Numbers & Email */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <Phone size={16} className="text-blue-600" />
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-900">4. Contact Info (Tel, Mobile & Email)</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tel (Landline)</label>
                  <input
                    type="text"
                    name="tel"
                    value={formState.tel || ""}
                    onChange={handleInputChange}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    placeholder="e.g. 0"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Mobile 1 (Primary)</label>
                  <input
                    type="text"
                    name="mobile"
                    value={formState.mobile || ""}
                    onChange={handleInputChange}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    placeholder="e.g. +263 715 436 611"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Mobile 2 (Secondary)</label>
                  <input
                    type="text"
                    name="mobile2"
                    value={formState.mobile2 || ""}
                    onChange={handleInputChange}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    placeholder="e.g. +263 774 938 581"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Official Email</label>
                  <input
                    type="email"
                    name="email"
                    value={formState.email}
                    onChange={handleInputChange}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    placeholder="acunovapvtltd@gmail.com"
                  />
                </div>
              </div>
            </div>

            {/* Tax IDs & VAT Configuration */}
            <div className="space-y-4 bg-slate-50/80 p-4 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <Percent size={16} className="text-blue-600" />
                  <h3 className="font-bold text-xs uppercase tracking-wider text-slate-900">5. Registration & Identifiers</h3>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">TIN No / Tax ID</label>
                  <input
                    type="text"
                    name="tinNumber"
                    value={formState.tinNumber}
                    onChange={handleInputChange}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    placeholder="2002535002"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Company Registration No</label>
                  <input
                    type="text"
                    name="registrationNumber"
                    value={formState.registrationNumber}
                    onChange={handleInputChange}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    placeholder="e.g. REG-112233"
                  />
                </div>
              </div>
            </div>

            {/* Payment & Banking Information (Bank Account / EcoCash / Currency) */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <Building size={16} className="text-amber-600" />
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-900">6. Payment Details (Bank Account, EcoCash & Currency)</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Bank Name & Branch</label>
                  <input
                    type="text"
                    name="bankName"
                    value={formState.bankName || ""}
                    onChange={handleInputChange}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    placeholder="e.g. Stanbic Bank Bulawayo"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Account Name</label>
                  <input
                    type="text"
                    name="accountName"
                    value={formState.accountName || ""}
                    onChange={handleInputChange}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    placeholder="e.g. Shield Hardware Pvt Ltd"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">RTGS Account Number</label>
                  <input
                    type="text"
                    name="rtgsAccountNumber"
                    value={formState.rtgsAccountNumber || formState.accountNumber || ""}
                    onChange={handleInputChange}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    placeholder="e.g. 0112458920101"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">USD Account Number</label>
                  <input
                    type="text"
                    name="usdAccountNumber"
                    value={formState.usdAccountNumber || formState.accountNumber || ""}
                    onChange={handleInputChange}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    placeholder="e.g. 9140001827461"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">EcoCash Number</label>
                  <input
                    type="text"
                    name="ecocashNumber"
                    value={formState.ecocashNumber || ""}
                    onChange={handleInputChange}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    placeholder="e.g. *151*2*2*123456# / +263 773 360 800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Default Quotation Currency</label>
                  <select
                    name="currency"
                    value={formState.currency || "USD"}
                    onChange={handleInputChange}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="USD">USD (US Dollar)</option>
                    <option value="ZiG">ZiG (Zimbabwe Gold)</option>
                    <option value="ZWL">ZWL (Zimbabwe Dollar)</option>
                    <option value="ZAR">ZAR (South African Rand)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Sales Person / Done By</label>
                  <input
                    type="text"
                    name="doneBy"
                    value={formState.doneBy || ""}
                    onChange={handleInputChange}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    placeholder="e.g. LMAKONO"
                  />
                </div>
              </div>
            </div>

            {/* Quotation Style & Terms */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <Sparkles size={16} className="text-blue-600" />
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-900">7. Quotation Layout Format & Footer Note</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Document Layout Style</label>
                  <select
                    name="quotationStyle"
                    value={formState.quotationStyle || "minimalist_authentic"}
                    onChange={handleInputChange}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="minimalist_authentic">Minimalist Authentic (Matches Official Reference Invoice)</option>
                    <option value="corporate_modern">Modern Corporate Layout</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Footer Note / Disclaimer</label>
                  <input
                    type="text"
                    name="footerTerms"
                    value={formState.footerTerms}
                    onChange={handleInputChange}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    placeholder="PRICES QUOTED IN USD DOLLAR"
                  />
                </div>
              </div>
            </div>

            {/* LIVE REAL-TIME PDF LETTERHEAD PREVIEW CARD */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div className="flex items-center gap-2 text-slate-900 font-extrabold text-xs uppercase tracking-wider">
                  <Eye size={16} className="text-blue-600" />
                  <span>Real-Time Quotation Live Preview</span>
                </div>
                <span className="text-[11px] font-mono font-bold text-slate-500">Document Layout Preview</span>
              </div>

              {/* Minimalist Authentic Template Box */}
              <div className="bg-white rounded-lg border border-slate-300 p-6 space-y-4 shadow-sm font-sans text-xs text-slate-900">
                
                {/* Top Title & Underline */}
                <div className="text-center pb-1">
                  <h3 className="font-sans font-bold text-base text-slate-900 uppercase tracking-wide">
                    {formState.companyName || "SHIELD HARDWARE"}
                  </h3>
                  <div className="w-full border-b border-slate-900 mt-1" />
                  <p className="font-sans text-[11px] font-bold text-slate-800 uppercase tracking-tight mt-0.5">
                    {formState.companySubtitle || formState.companyName || "SHIELD HARDWARE"}
                  </p>
                </div>

                {/* Header Grid: Logo & Address Left | Contact & Tax Right */}
                <div className="grid grid-cols-2 gap-4 text-[11px] font-mono pt-1">
                  
                  {/* Left Column: Logo + Street Address + Email */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      {formState.logoUrl ? (
                        <img
                          src={formState.logoUrl}
                          alt="Logo Preview"
                          className="h-10 object-contain"
                        />
                      ) : (
                        <div className="px-2.5 py-1 bg-blue-900 text-white font-bold rounded-xs font-sans text-xs">
                          {formState.logoInitials || "SH"}
                        </div>
                      )}
                    </div>
                    <div className="space-y-0.5 text-slate-800 uppercase leading-snug">
                      <p>{formState.streetAddress || "NO. 57 FORT STREET"}</p>
                      <p>{formState.city || "BULAWAYO"}</p>
                      <p>{formState.country || "ZIMBABWE"}</p>
                      <p className="normal-case pt-1"><span className="font-bold">Email:</span> {formState.email || "shieldhardware57@gmail.com"}</p>
                    </div>
                  </div>

                  {/* Right Column: Tel, Mobile, VAT, TIN */}
                  <div className="text-right space-y-1 text-slate-800">
                    <div className="flex justify-end gap-2">
                      <span className="text-slate-500 font-bold">Tel:</span>
                      <span>{formState.tel || "0"}</span>
                    </div>
                    <div className="flex justify-end gap-2">
                      <span className="text-slate-500 font-bold">Mobile:</span>
                      <div className="text-right">
                        <p>{formState.mobile || "+263 715 436 611"}</p>
                        {formState.mobile2 && <p>{formState.mobile2}</p>}
                      </div>
                    </div>
                    {formState.vatNumber && (
                      <div className="flex justify-end gap-2 pt-1">
                        <span className="text-slate-500 font-bold">VAT No:</span>
                        <span>{formState.vatNumber}</span>
                      </div>
                    )}
                    <div className="flex justify-end gap-2">
                      <span className="text-slate-500 font-bold">TIN No:</span>
                      <span>{formState.tinNumber || formState.registrationNumber || "2002535002"}</span>
                    </div>
                  </div>

                </div>

                {/* Tagline / Slogan Subheader */}
                <div className="text-center pt-1">
                  <p className="text-[11px] font-sans font-semibold text-slate-800 italic border-t border-b border-slate-300 py-1">
                    {formState.tagline || "Suppliers of Plumbing, Electrical & General Hardware"}
                  </p>
                </div>

                {/* Centered Document Type */}
                <div className="text-center pt-2">
                  <h2 className="text-sm font-bold font-sans tracking-widest uppercase text-slate-900">QUOTATION</h2>
                </div>

                {/* Two side-by-side Rounded Boxes */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  {/* Customer Box */}
                  <div className="border border-amber-800/60 rounded-xl p-3 space-y-1 font-mono text-[10px] text-slate-800 min-w-0 overflow-hidden break-words">
                    <p><span className="text-slate-500 font-bold">Customer:</span> 1000</p>
                    <p className="font-bold text-slate-950 break-words">MR T. SIALUMBA</p>
                    <p className="break-words leading-relaxed"><span className="text-slate-500 font-bold">Address:</span> Stand 4022 Kelvin North, Bulawayo</p>
                    <p className="break-all"><span className="text-slate-500 font-bold">Mobile:</span> 077 493 8581</p>
                  </div>

                  {/* Quotation Metadata Box */}
                  <div className="space-y-2 min-w-0">
                    <div className="border border-amber-800/60 rounded-xl p-3 space-y-1 font-mono text-[10px] text-slate-800">
                      <div className="flex justify-between gap-1">
                        <span className="text-slate-500 font-bold whitespace-nowrap">Quotation No:</span>
                        <span className="font-bold text-slate-950 truncate">SHW6342</span>
                      </div>
                      <div className="flex justify-between gap-1">
                        <span className="text-slate-500 font-bold whitespace-nowrap">Quotation Date:</span>
                        <span>25/06/2026</span>
                      </div>
                      <div className="flex justify-between gap-1">
                        <span className="text-slate-500 font-bold whitespace-nowrap">Sales Type:</span>
                        <span>{formState.salesType || "ALL"}</span>
                      </div>
                      <div className="flex justify-between gap-1">
                        <span className="text-slate-500 font-bold whitespace-nowrap">Done By:</span>
                        <span className="font-bold">{formState.doneBy || "LMAKONO"}</span>
                      </div>
                    </div>

                    <div className="border border-amber-800/60 rounded-lg p-1.5 px-3 flex justify-between font-mono text-[10px] font-bold text-slate-900">
                      <span>Currency:</span>
                      <span>{formState.currency || "USD"}</span>
                    </div>
                  </div>
                </div>

                {/* Table Preview */}
                <div className="pt-2">
                  <table className="w-full table-fixed text-left border-collapse font-mono text-[10px]">
                    <thead>
                      <tr className="border-t border-b border-slate-900 text-slate-800 font-bold">
                        <th className="py-1 w-16">Item Code</th>
                        <th className="py-1">Item Description</th>
                        <th className="py-1 w-12 text-center">Qty</th>
                        <th className="py-1 w-14 text-right">Price</th>
                        <th className="py-1 w-14 text-right">EXT</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-900">
                      <tr>
                        <td className="py-1 align-top break-all">2253</td>
                        <td className="py-1 font-sans font-semibold align-top break-words">500ML WOOD GLUE</td>
                        <td className="py-1 text-center align-top whitespace-nowrap">1.00</td>
                        <td className="py-1 text-right align-top whitespace-nowrap">2.00</td>
                        <td className="py-1 text-right font-bold align-top whitespace-nowrap">2.00</td>
                      </tr>
                      <tr>
                        <td className="py-1 align-top break-all">2885</td>
                        <td className="py-1 font-sans font-semibold align-top break-words">BLACK SPRAY PAINT</td>
                        <td className="py-1 text-center align-top whitespace-nowrap">3.00</td>
                        <td className="py-1 text-right align-top whitespace-nowrap">2.00</td>
                        <td className="py-1 text-right font-bold align-top whitespace-nowrap">6.00</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Banking Settlement Details Preview */}
                <div className="pt-2 border-t border-slate-200 text-[10px] font-mono text-slate-800 space-y-0.5">
                  <p><span className="text-slate-500 font-bold">Bank:</span> {formState.bankName || "Stanbic Bank Bulawayo"}</p>
                  <p><span className="text-slate-500 font-bold">Account Name:</span> {formState.accountName || "Shield Hardware Pvt Ltd"}</p>
                  <p><span className="text-slate-500 font-bold">RTGS:</span> <span className="font-bold text-slate-950">{formState.rtgsAccountNumber || formState.accountNumber || "0112458920101"}</span></p>
                  <p><span className="text-slate-500 font-bold">USD:</span> <span className="font-bold text-slate-950">{formState.usdAccountNumber || formState.accountNumber || "9140001827461"}</span></p>
                  {formState.ecocashNumber && (
                    <p><span className="text-slate-500 font-bold">EcoCash Number:</span> <span className="font-bold text-slate-950">{formState.ecocashNumber}</span></p>
                  )}
                </div>

                {/* Bottom Footer Band */}
                <div className="pt-2 border-t border-slate-300 flex justify-between items-center font-mono text-[11px] font-bold">
                  <span className="text-slate-600 uppercase">{formState.footerTerms || "PRICES QUOTED IN"}</span>
                  <span className="text-slate-950 font-black text-xs">{formState.currency || "USD"} DOLLAR 8.00</span>
                </div>

              </div>
            </div>

          </div>

          <div className="bg-slate-50 border-t border-slate-200 p-4 px-6 flex justify-end gap-3">
            <button
              type="submit"
              disabled={updateMutation.isPending}
              id="btn-save-company-settings"
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs uppercase tracking-widest font-black rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {updateMutation.isPending ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Check size={16} />
              )}
              <span>Save PDF Branding & Settings</span>
            </button>
          </div>

        </div>

        {/* System Configuration Status Card */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border border-slate-200/90 p-6 space-y-4 shadow-3xs">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100 text-slate-900">
              <Percent size={18} className="text-blue-500" />
              <h3 className="font-extrabold text-xs uppercase tracking-wider">System Default Configurations</h3>
            </div>
            <div className="space-y-3 text-xs font-medium">
              <div>
                <label className="block text-slate-400 font-bold uppercase text-[10px] mb-1">Quotation Valid Days Limit</label>
                <select
                  defaultValue="30"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-semibold text-slate-800"
                >
                  <option value="15">15 Business Days</option>
                  <option value="30">30 Calendar Days (Default)</option>
                  <option value="60">60 Calendar Days (Bulk Account)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 text-white rounded-2xl p-6 border border-slate-800 space-y-4 shadow-xl">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-800 text-blue-400">
              <CloudLightning size={16} />
              <span className="font-bold text-xs uppercase tracking-widest text-slate-350">Service API Logs & Tunnel status</span>
            </div>

            <div className="space-y-3 text-xs font-medium font-mono">
              <div>
                <span className="text-[10px] text-slate-500 block mb-0.5">ENVIRONMENT NODE</span>
                <p className="text-slate-100">CLOUD-DOCKER_RUN</p>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block mb-0.5">FAST_API TUNNEL</span>
                <p className="text-emerald-400 flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping"></span>
                  <span>ONLINE_200_OK</span>
                </p>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block mb-0.5">ACTIVE CACHE SCHEMA</span>
                <p className="text-blue-400">Local JSON DB Store</p>
              </div>
            </div>
          </div>
        </div>

      </form>

    </div>
  );
};
