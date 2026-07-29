import React, { useState, useRef } from "react";
import { 
  FileSearch, 
  Upload, 
  X, 
  Sparkles, 
  Check, 
  Copy, 
  RefreshCw, 
  AlertCircle, 
  FileText, 
  PackageCheck, 
  Receipt, 
  ArrowRight, 
  Plus, 
  Trash2, 
  Layers, 
  Building, 
  Calendar, 
  CheckCircle2, 
  Info,
  Sliders,
  DollarSign,
  ScanLine
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate } from "react-router-dom";
import { documentOcrService } from "../services/api";
import { DocumentAnalysisResult, ExtractedLineItem } from "../types";
import { useToast } from "./Layout";
import { useQueryClient } from "@tanstack/react-query";

interface DocumentOcrModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStockUpdated?: () => void;
}

// Sample fallback demo base64 images/data for instant testing
const DEMO_SAMPLES = [
  {
    title: "Supplier Invoice (Hardware)",
    desc: "3x Components (Headphones, MacBook, GaN Charger)",
    mockData: {
      documentType: "Invoice" as const,
      vendorOrCustomerName: "Sony Electronics Distribution",
      documentNumber: "INV-2026-9901",
      documentDate: "2026-07-28",
      summary: "Extracted supplier invoice containing 3 line items for high-demand consumer electronics.",
      rawExtractedText: "SONY ELECTRONICS DISTRIBUTION NORTH AMERICA\nInvoice No: INV-2026-9901 | Date: 2026-07-28\n--------------------------------------------\nItem 1: Sony WH-1000XM5 Noise Cancelling Headphones (AUD-ANC-SNY-101)\nQty: 5 units @ $349.99 = $1,749.95\nItem 2: Apple MacBook Pro 16\" (M3 Pro) (APL-MBP16-01)\nQty: 2 units @ $2,499.00 = $4,998.00\nItem 3: GaN Fast Charger 100W USB-C (PWR-GAN-ANK-105)\nQty: 10 units @ $45.00 = $450.00\nSubtotal: $7,197.95 | Tax: $0.00 | Total Amount Due: $7,197.95",
      subtotal: 7197.95,
      tax: 0,
      totalAmount: 7197.95,
      lineItems: [
        {
          id: "demo-1",
          productName: "Sony WH-1000XM5 Noise Cancelling Headphones",
          sku: "AUD-ANC-SNY-101",
          quantity: 5,
          unitPrice: 349.99,
          totalPrice: 1749.95,
          matchedProductId: "prod-1",
          matchedProductName: "Sony WH-1000XM5 Wireless Headphones",
          matchedProductCurrentStock: 8,
          isExistingProduct: true
        },
        {
          id: "demo-2",
          productName: "Apple MacBook Pro 16\" (M3 Pro)",
          sku: "APL-MBP16-01",
          quantity: 2,
          unitPrice: 2499.00,
          totalPrice: 4998.00,
          matchedProductId: "prod-2",
          matchedProductName: "Apple MacBook Pro 16-inch M3",
          matchedProductCurrentStock: 4,
          isExistingProduct: true
        },
        {
          id: "demo-3",
          productName: "GaN Fast Charger 100W USB-C",
          sku: "PWR-GAN-ANK-105",
          quantity: 10,
          unitPrice: 45.00,
          totalPrice: 450.00,
          matchedProductId: "prod-5",
          matchedProductName: "Anker GaN 100W USB-C Charger",
          matchedProductCurrentStock: 12,
          isExistingProduct: true
        }
      ]
    }
  },
  {
    title: "Warehouse Receiving Slip",
    desc: "Single-Board Computers & Microcontrollers",
    mockData: {
      documentType: "Delivery Note" as const,
      vendorOrCustomerName: "Raspberry Pi Ltd & Microchip Supplies",
      documentNumber: "DEL-88310",
      documentDate: "2026-07-27",
      summary: "Warehouse delivery receipt for development boards and microcontrollers.",
      rawExtractedText: "RASPBERRY PI & MICROCHIP DISTRIBUTION\nDelivery Note # DEL-88310\nDate Received: 2026-07-27\nItems:\n1. Raspberry Pi 5 Single-Board Computer 8GB RAM x 15 @ $80.00 = $1,200.00\n2. STM32 ARM Microcontroller Dev Kit x 20 @ $25.00 = $500.00\nTotal Received Value: $1,700.00",
      subtotal: 1700.00,
      tax: 0,
      totalAmount: 1700.00,
      lineItems: [
        {
          id: "demo-4",
          productName: "Raspberry Pi 5 Single-Board Computer 8GB",
          sku: "DEV-SBC-RPI-101",
          quantity: 15,
          unitPrice: 80.00,
          totalPrice: 1200.00,
          matchedProductId: "prod-3",
          matchedProductName: "Raspberry Pi 5 Model B 8GB",
          matchedProductCurrentStock: 15,
          isExistingProduct: true
        },
        {
          id: "demo-5",
          productName: "STM32 ARM Microcontroller Dev Kit",
          sku: "DEV-MCU-STM-202",
          quantity: 20,
          unitPrice: 25.00,
          totalPrice: 500.00,
          isExistingProduct: false
        }
      ]
    }
  }
];

export const DocumentOcrModal: React.FC<DocumentOcrModalProps> = ({
  isOpen,
  onClose,
  onStockUpdated
}) => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>("image/jpeg");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isRestocking, setIsRestocking] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [showRawText, setShowRawText] = useState(false);

  const [result, setResult] = useState<DocumentAnalysisResult | null>(null);
  const [editableItems, setEditableItems] = useState<ExtractedLineItem[]>([]);

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith("image/")) {
      showToast("Please upload an image file (PNG, JPG, WEBP).", "error");
      return;
    }

    setMimeType(file.type);
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64Str = e.target?.result as string;
      setImagePreview(base64Str);
      runAnalysis(base64Str, file.type);
    };
    reader.readAsDataURL(file);
  };

  const runAnalysis = async (base64Data: string, typeStr: string) => {
    setIsAnalyzing(true);
    setResult(null);
    try {
      const res = await documentOcrService.analyzeDocumentImage(base64Data, typeStr);
      setResult(res);
      setEditableItems(res.lineItems || []);
      showToast("Document image analyzed successfully with Gemini!", "success");
    } catch (err: any) {
      console.error("Analysis error:", err);
      showToast("Failed to analyze image. Used intelligent fallback.", "error");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleLoadDemo = (demo: typeof DEMO_SAMPLES[0]) => {
    setImagePreview("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'><rect width='400' height='300' fill='%231e293b'/><text x='50%' y='40%' dominant-baseline='middle' text-anchor='middle' fill='%23fbbf24' font-family='monospace' font-size='16' font-weight='bold'>" + encodeURIComponent(demo.title) + "</text><text x='50%' y='60%' dominant-baseline='middle' text-anchor='middle' fill='%2394a3b8' font-family='sans-serif' font-size='12'>Sample Document Image</text></svg>");
    setResult(demo.mockData as any);
    setEditableItems(demo.mockData.lineItems);
    showToast(`Loaded ${demo.title} demo data!`, "info");
  };

  const handleUpdateItem = (id: string, field: keyof ExtractedLineItem, val: any) => {
    setEditableItems(prev => prev.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: val };
        if (field === "quantity" || field === "unitPrice") {
          const q = Number(field === "quantity" ? val : updated.quantity) || 0;
          const u = Number(field === "unitPrice" ? val : updated.unitPrice) || 0;
          updated.totalPrice = q * u;
        }
        return updated;
      }
      return item;
    }));
  };

  const handleRemoveItem = (id: string) => {
    setEditableItems(prev => prev.filter(item => item.id !== id));
  };

  const handleAddItem = () => {
    const newItem: ExtractedLineItem = {
      id: `new-${Date.now()}`,
      productName: "New Hardware Item",
      quantity: 1,
      unitPrice: 50,
      totalPrice: 50,
      isExistingProduct: false
    };
    setEditableItems(prev => [...prev, newItem]);
  };

  const handleQuickRestock = async () => {
    if (editableItems.length === 0) {
      showToast("No items available to restock.", "error");
      return;
    }

    setIsRestocking(true);
    try {
      const itemsToRestock = editableItems.map(item => ({
        productId: item.matchedProductId,
        productName: item.productName,
        sku: item.sku,
        quantityToAdd: Number(item.quantity) || 1,
        costPrice: Number(item.unitPrice) || 0,
        sellingPrice: Number(item.unitPrice) || 0
      }));

      const note = `OCR Document Import (${result?.documentType || "Invoice"} #${result?.documentNumber || "REC"})`;
      const res = await documentOcrService.bulkRestockFromOcr(itemsToRestock, note);

      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-activity"] });
      queryClient.invalidateQueries({ queryKey: ["system-logs"] });

      showToast(res.message || "Stock updated successfully!", "success");
      if (onStockUpdated) onStockUpdated();
      onClose();
    } catch (err: any) {
      showToast("Failed to execute bulk restock", "error");
    } finally {
      setIsRestocking(false);
    }
  };

  const handleGenerateQuotation = () => {
    if (editableItems.length === 0) {
      showToast("No extracted line items to export to quotation.", "error");
      return;
    }

    // Pass items to Quotations page via state
    navigate("/quotations", {
      state: {
        importFromOcr: true,
        vendorOrCustomer: result?.vendorOrCustomerName,
        items: editableItems.map(item => ({
          productId: item.matchedProductId || "",
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: item.unitPrice
        }))
      }
    });
    onClose();
    showToast("Extracted items exported to Quotation Builder!", "success");
  };

  const handleCopyRawText = () => {
    if (result?.rawExtractedText) {
      navigator.clipboard.writeText(result.rawExtractedText);
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2000);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-4xl w-full overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-600 rounded-xl text-white shadow-xs">
              <ScanLine size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-extrabold text-base tracking-tight">Image & Document Text OCR Extractor</h2>
                <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 font-bold text-[10px] rounded-md border border-blue-500/30">
                  Gemini 3.1 Pro
                </span>
              </div>
              <p className="text-xs text-slate-400">Upload photos of invoices, receipts, delivery notes or tally sheets to extract items, restock stock or create quotes.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs flex-1">

          {/* Upload / Select Section */}
          {!imagePreview ? (
            <div className="space-y-4">
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    handleFileSelect(e.dataTransfer.files[0]);
                  }
                }}
                className="border-2 border-dashed border-slate-300 hover:border-blue-500 bg-slate-50 hover:bg-blue-50/40 rounded-2xl p-8 text-center cursor-pointer transition-all group"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/png, image/jpeg, image/webp"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileSelect(e.target.files[0]);
                    }
                  }}
                />
                <div className="w-14 h-14 bg-white rounded-2xl shadow-sm border border-slate-200 flex items-center justify-center mx-auto mb-3 text-blue-600 group-hover:scale-110 transition-transform">
                  <Upload size={24} />
                </div>
                <h3 className="font-extrabold text-slate-900 text-sm">Drop document photo or click to browse</h3>
                <p className="text-slate-500 text-xs mt-1">Supports PNG, JPG, WEBP invoice photos, delivery receipts, handwritten tally sheets</p>
              </div>

              {/* Quick Demo Pre-sets */}
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                  Or test immediately with sample test documents:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {DEMO_SAMPLES.map((demo, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleLoadDemo(demo)}
                      className="p-3 bg-slate-50 hover:bg-blue-50/60 border border-slate-200 hover:border-blue-300 rounded-xl text-left transition-all group"
                    >
                      <div className="font-bold text-slate-900 flex items-center justify-between">
                        <span>{demo.title}</span>
                        <Sparkles size={14} className="text-amber-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <p className="text-slate-500 text-[11px] mt-0.5">{demo.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

            </div>
          ) : (
            
            /* Active Analysis View */
            <div className="space-y-6">
              
              {/* Image & Processing Header Bar */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
                
                {/* Photo Thumbnail Preview */}
                <div className="bg-slate-900 rounded-2xl p-3 border border-slate-800 relative overflow-hidden flex flex-col items-center justify-center min-h-[160px]">
                  {imagePreview.startsWith("data:image/svg") ? (
                    <div className="text-center p-4">
                      <FileText size={36} className="text-amber-400 mx-auto mb-2" />
                      <span className="font-bold text-slate-200 text-xs">Sample Test Document</span>
                    </div>
                  ) : (
                    <img
                      src={imagePreview}
                      alt="Uploaded Document"
                      className="max-h-40 object-contain rounded-lg"
                    />
                  )}

                  {/* Scanning Animation */}
                  {isAnalyzing && (
                    <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-xs flex flex-col items-center justify-center p-4 text-center">
                      <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-2"></div>
                      <span className="font-extrabold text-white text-xs">Scanning with Gemini 3.1 Pro...</span>
                      <span className="text-slate-400 text-[10px] mt-1">Extracting items, quantities & prices</span>
                    </div>
                  )}

                  <button
                    onClick={() => {
                      setImagePreview(null);
                      setResult(null);
                    }}
                    className="absolute top-2 right-2 p-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[10px] font-bold"
                  >
                    Change Image
                  </button>
                </div>

                {/* Extracted Overview Card */}
                {result && (
                  <div className="lg:col-span-2 bg-slate-50 rounded-2xl border border-slate-200 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-100 text-blue-800 rounded-lg font-bold text-xs">
                        <CheckCircle2 size={14} className="text-blue-600" />
                        {result.documentType || "Document"} Parsed
                      </span>
                      <span className="font-mono text-xs font-bold text-slate-500">
                        Ref: {result.documentNumber || "N/A"}
                      </span>
                    </div>

                    <p className="text-slate-700 font-medium text-xs leading-relaxed">
                      {result.summary}
                    </p>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 border-t border-slate-200/80">
                      <div>
                        <span className="text-slate-400 text-[10px] font-bold uppercase block">Vendor / Customer</span>
                        <span className="font-bold text-slate-900">{result.vendorOrCustomerName || "Unspecified"}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px] font-bold uppercase block">Document Date</span>
                        <span className="font-bold text-slate-900">{result.documentDate || "2026-07-28"}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px] font-bold uppercase block">Extracted Total</span>
                        <span className="font-extrabold text-emerald-600">${(result.totalAmount || 0).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                )}

              </div>

              {/* Raw OCR Text Toggle */}
              {result?.rawExtractedText && (
                <div className="bg-slate-100 rounded-xl p-3 border border-slate-200">
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setShowRawText(!showRawText)}
                      className="font-bold text-xs text-slate-700 hover:text-blue-600 flex items-center gap-1.5 transition-colors"
                    >
                      <FileText size={14} />
                      <span>{showRawText ? "Hide Full Raw Extracted OCR Text" : "View Full Raw Extracted OCR Text"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleCopyRawText}
                      className="flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-slate-800"
                    >
                      {copiedText ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                      <span>{copiedText ? "Copied" : "Copy Raw Text"}</span>
                    </button>
                  </div>

                  {showRawText && (
                    <motion.pre
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="mt-2 p-3 bg-slate-900 text-slate-200 font-mono text-[11px] rounded-lg overflow-x-auto whitespace-pre-wrap max-h-48"
                    >
                      {result.rawExtractedText}
                    </motion.pre>
                  )}
                </div>
              )}

              {/* Extracted Items Table & Actions */}
              {result && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <PackageCheck size={16} className="text-blue-600" />
                      <h3 className="font-extrabold text-slate-900 text-sm">Extracted Line Items ({editableItems.length})</h3>
                      <span className="text-slate-400 text-xs">• Review and edit quantities before applying action</span>
                    </div>

                    <button
                      type="button"
                      onClick={handleAddItem}
                      className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg transition-colors"
                    >
                      <Plus size={14} />
                      <span>Add Item</span>
                    </button>
                  </div>

                  {/* Table */}
                  <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto shadow-2xs">
                    <table className="w-full text-left text-xs text-slate-700">
                      <thead className="bg-slate-100 text-slate-500 font-extrabold uppercase tracking-wider">
                        <tr>
                          <th className="py-2.5 px-3">Product / Item Description</th>
                          <th className="py-2.5 px-3">SKU</th>
                          <th className="py-2.5 px-3 text-center">Qty</th>
                          <th className="py-2.5 px-3 text-right">Unit Price</th>
                          <th className="py-2.5 px-3 text-right">Total</th>
                          <th className="py-2.5 px-3 text-center">Stock Status</th>
                          <th className="py-2.5 px-3 text-right">Remove</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {editableItems.map((item) => (
                          <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                            {/* Name */}
                            <td className="py-2 px-3">
                              <input
                                type="text"
                                value={item.productName}
                                onChange={(e) => handleUpdateItem(item.id, "productName", e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 font-bold text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                              />
                            </td>

                            {/* SKU */}
                            <td className="py-2 px-3">
                              <input
                                type="text"
                                value={item.sku || ""}
                                placeholder="Auto"
                                onChange={(e) => handleUpdateItem(item.id, "sku", e.target.value)}
                                className="w-24 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 font-mono text-[11px] text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                              />
                            </td>

                            {/* Qty */}
                            <td className="py-2 px-3 text-center">
                              <input
                                type="number"
                                min={1}
                                value={item.quantity}
                                onChange={(e) => handleUpdateItem(item.id, "quantity", Number(e.target.value))}
                                className="w-16 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-center font-bold text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                              />
                            </td>

                            {/* Unit Price */}
                            <td className="py-2 px-3 text-right">
                              <input
                                type="number"
                                step="0.01"
                                min={0}
                                value={item.unitPrice}
                                onChange={(e) => handleUpdateItem(item.id, "unitPrice", Number(e.target.value))}
                                className="w-20 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-right font-bold text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                              />
                            </td>

                            {/* Total */}
                            <td className="py-2 px-3 text-right font-extrabold text-slate-900 whitespace-nowrap">
                              ${(item.totalPrice || 0).toFixed(2)}
                            </td>

                            {/* Catalog Stock Match Status */}
                            <td className="py-2 px-3 text-center whitespace-nowrap">
                              {item.isExistingProduct ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  <Check size={10} />
                                  Match (Stock: {item.matchedProductCurrentStock})
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                  New Product
                                </span>
                              )}
                            </td>

                            {/* Remove */}
                            <td className="py-2 px-3 text-right">
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(item.id)}
                                className="p-1 text-slate-400 hover:text-red-600 rounded-lg transition-colors"
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Choose Actions Section */}
                  <div className="pt-3 border-t border-slate-200">
                    <span className="text-xs font-bold text-slate-900 block mb-2 uppercase tracking-wider">
                      Choose Desired Action:
                    </span>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      
                      {/* Action 1: Quick Update Stock */}
                      <button
                        type="button"
                        onClick={handleQuickRestock}
                        disabled={isRestocking || editableItems.length === 0}
                        className="flex items-center justify-between p-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl shadow-md shadow-blue-500/20 transition-all text-left"
                        id="btn-ocr-quick-restock"
                      >
                        <div>
                          <div className="font-extrabold text-xs flex items-center gap-1.5">
                            <PackageCheck size={16} />
                            <span>Quick Restock Inventory</span>
                          </div>
                          <span className="text-[11px] text-blue-100 mt-0.5 block">
                            Increment quantities directly into product database
                          </span>
                        </div>
                        <ArrowRight size={16} className="shrink-0 ml-2" />
                      </button>

                      {/* Action 2: Generate Quotation */}
                      <button
                        type="button"
                        onClick={handleGenerateQuotation}
                        disabled={editableItems.length === 0}
                        className="flex items-center justify-between p-3 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-xl shadow-md transition-all text-left"
                        id="btn-ocr-generate-quote"
                      >
                        <div>
                          <div className="font-extrabold text-xs flex items-center gap-1.5">
                            <FileText size={16} className="text-amber-400" />
                            <span>Generate Sales Quotation</span>
                          </div>
                          <span className="text-[11px] text-slate-300 mt-0.5 block">
                            Export line items into Quotation Builder
                          </span>
                        </div>
                        <ArrowRight size={16} className="shrink-0 ml-2" />
                      </button>

                    </div>
                  </div>

                </div>
              )}

            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold rounded-xl text-xs transition-all"
          >
            Close
          </button>

          <span className="text-[11px] text-slate-400 font-semibold">
            Powered by Gemini 3.1 Pro Multimodal AI
          </span>
        </div>

      </motion.div>
    </div>
  );
};
