import React, { useState, useEffect } from "react";
import { 
  Wand2, 
  X, 
  Check, 
  Copy, 
  RefreshCw, 
  Sparkles, 
  AlertCircle, 
  Sliders, 
  Layers, 
  Building2, 
  Tag, 
  Hash, 
  ListFilter,
  ArrowRight
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Product } from "../types";

interface SkuGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplySku?: (sku: string, category?: string, brand?: string) => void;
  existingProducts?: Product[];
  initialCategory?: string;
  initialBrand?: string;
}

interface CategoryMap {
  [key: string]: {
    prefix: string;
    subcategories: { name: string; prefix: string }[];
  };
}

const CATEGORY_MAP: CategoryMap = {
  Laptops: {
    prefix: "LAP",
    subcategories: [
      { name: "Workstation", prefix: "WRK" },
      { name: "Ultrabook", prefix: "ULT" },
      { name: "Gaming", prefix: "GME" },
      { name: "Convertible 2-in-1", prefix: "CNV" },
      { name: "Chromebook", prefix: "CHR" }
    ]
  },
  Audio: {
    prefix: "AUD",
    subcategories: [
      { name: "Wireless Headphones", prefix: "WRL" },
      { name: "Noise Cancelling", prefix: "ANC" },
      { name: "In-Ear Monitors", prefix: "IEM" },
      { name: "Studio Monitors", prefix: "STD" },
      { name: "Bluetooth Speaker", prefix: "SPK" }
    ]
  },
  Displays: {
    prefix: "DSP",
    subcategories: [
      { name: "4K Curved", prefix: "4KC" },
      { name: "Gaming High-Hz", prefix: "144" },
      { name: "OLED Portable", prefix: "OLD" },
      { name: "Ultrawide Productivity", prefix: "ULT" },
      { name: "Standard Desktop", prefix: "STD" }
    ]
  },
  "Development Boards": {
    prefix: "DEV",
    subcategories: [
      { name: "Single-Board Computer", prefix: "SBC" },
      { name: "ARM Microcontroller", prefix: "MCU" },
      { name: "IoT Sensor Kit", prefix: "IOT" },
      { name: "FPGA Prototyping", prefix: "FPG" },
      { name: "Robotics Expansion", prefix: "ROB" }
    ]
  },
  "Power Accessories": {
    prefix: "PWR",
    subcategories: [
      { name: "GaN Fast Charger", prefix: "GAN" },
      { name: "Power Bank Portable", prefix: "BNK" },
      { name: "USB-C Multi-Hub", prefix: "HUB" },
      { name: "Magsafe Wireless Pad", prefix: "MAG" },
      { name: "Heavy Duty Cable", prefix: "CBL" }
    ]
  },
  Peripherals: {
    prefix: "PER",
    subcategories: [
      { name: "Mechanical Keyboard", prefix: "KBD" },
      { name: "Ergonomic Optical Mouse", prefix: "MSE" },
      { name: "Ultra HD Webcam", prefix: "CAM" },
      { name: "Thunderbolt Dock", prefix: "DCK" },
      { name: "Gaming Controller", prefix: "PAD" }
    ]
  },
  Storage: {
    prefix: "STR",
    subcategories: [
      { name: "NVMe M.2 SSD", prefix: "SSD" },
      { name: "External Rugged Drive", prefix: "EXT" },
      { name: "MicroSD UHS-II Card", prefix: "SDC" },
      { name: "RAID NAS Storage", prefix: "NAS" },
      { name: "USB 3.2 Flash Drive", prefix: "USB" }
    ]
  }
};

const POPULAR_SUPPLIERS = [
  { name: "Apple Inc.", code: "APL" },
  { name: "Sony Corporation", code: "SNY" },
  { name: "Dell Technologies", code: "DEL" },
  { name: "Raspberry Pi Ltd", code: "RPI" },
  { name: "Anker Innovations", code: "ANK" },
  { name: "Logitech International", code: "LOG" },
  { name: "Samsung Electronics", code: "SSG" },
  { name: "ASUSTeK Computer", code: "ASU" },
  { name: "Corsair Gaming", code: "CRS" },
  { name: "Generic / OEM", code: "OEM" }
];

export const SkuGeneratorModal: React.FC<SkuGeneratorModalProps> = ({
  isOpen,
  onClose,
  onApplySku,
  existingProducts = [],
  initialCategory = "Laptops",
  initialBrand = "Apple Inc."
}) => {
  const [category, setCategory] = useState<string>(initialCategory);
  const [subCategory, setSubCategory] = useState<string>("");
  const [supplierName, setSupplierName] = useState<string>(initialBrand);
  const [customSupplierCode, setCustomSupplierCode] = useState<string>("");
  const [patternFormat, setPatternFormat] = useState<"standard" | "compact" | "detailed">("standard");
  const [sequenceNumber, setSequenceNumber] = useState<number>(101);
  const [generatedSku, setGeneratedSku] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [batchSkus, setBatchSkus] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<"single" | "batch">("single");

  // Keep category in sync when modal opens
  useEffect(() => {
    if (initialCategory && CATEGORY_MAP[initialCategory]) {
      setCategory(initialCategory);
    }
  }, [initialCategory]);

  // Update default subcategory when category changes
  useEffect(() => {
    if (CATEGORY_MAP[category]) {
      setSubCategory(CATEGORY_MAP[category].subcategories[0].name);
    }
  }, [category]);

  // Derive supplier prefix code
  const getSupplierCode = (): string => {
    if (customSupplierCode.trim()) {
      return customSupplierCode.trim().substring(0, 3).toUpperCase();
    }
    const found = POPULAR_SUPPLIERS.find(s => s.name === supplierName);
    if (found) return found.code;
    return supplierName.substring(0, 3).toUpperCase() || "OEM";
  };

  // Derive subcategory prefix
  const getSubCatPrefix = (): string => {
    const catData = CATEGORY_MAP[category];
    if (!catData) return "GEN";
    const sub = catData.subcategories.find(s => s.name === subCategory);
    return sub ? sub.prefix : "GEN";
  };

  // Generate SKU logic
  const produceSku = (seq: number): string => {
    const catCode = CATEGORY_MAP[category]?.prefix || "CAT";
    const subCode = getSubCatPrefix();
    const suppCode = getSupplierCode();

    if (patternFormat === "compact") {
      return `${catCode.substring(0,2)}${subCode.substring(0,2)}${suppCode.substring(0,2)}-${seq}`.toUpperCase();
    }
    if (patternFormat === "detailed") {
      return `${suppCode}_${catCode}_${subCode}_${seq.toString().padStart(3, "0")}`.toUpperCase();
    }
    // Standard: CAT-SUBCAT-SUPP-SEQ
    return `${catCode}-${subCode}-${suppCode}-${seq}`.toUpperCase();
  };

  // Re-calculate SKU whenever options change
  useEffect(() => {
    const mainSku = produceSku(sequenceNumber);
    setGeneratedSku(mainSku);

    // Generate batch
    const list: string[] = [];
    for (let i = 0; i < 5; i++) {
      list.push(produceSku(sequenceNumber + i));
    }
    setBatchSkus(list);
  }, [category, subCategory, supplierName, customSupplierCode, patternFormat, sequenceNumber]);

  const isDuplicate = existingProducts.some(
    p => p.sku?.toUpperCase() === generatedSku.toUpperCase()
  );

  const handleRandomizeSeq = () => {
    const randSeq = Math.floor(100 + Math.random() * 899);
    setSequenceNumber(randSeq);
  };

  const handleCopy = (skuText: string) => {
    navigator.clipboard.writeText(skuText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleApply = (skuToApply: string) => {
    if (onApplySku) {
      onApplySku(skuToApply, category, supplierName);
    }
    onClose();
  };

  if (!isOpen) return null;

  const currentCatData = CATEGORY_MAP[category] || CATEGORY_MAP["Laptops"];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-600 rounded-xl text-white">
              <Wand2 size={18} />
            </div>
            <div>
              <h2 className="font-extrabold text-base tracking-tight">Automated SKU Generator</h2>
              <p className="text-xs text-slate-400">Structured catalog naming using category, sub-category & supplier metadata</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="px-6 pt-4 pb-0 flex gap-2 border-b border-slate-100 bg-slate-50/50">
          <button
            onClick={() => setActiveTab("single")}
            className={`px-4 py-2 text-xs font-bold rounded-t-xl transition-all border-b-2 ${
              activeTab === "single"
                ? "border-blue-600 text-blue-600 bg-white shadow-2xs"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            Single SKU Builder
          </button>
          <button
            onClick={() => setActiveTab("batch")}
            className={`px-4 py-2 text-xs font-bold rounded-t-xl transition-all border-b-2 ${
              activeTab === "batch"
                ? "border-blue-600 text-blue-600 bg-white shadow-2xs"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            Batch SKU Series (5x)
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs flex-1">
          
          {/* Metadata Selector Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Category Select */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1 flex items-center gap-1.5">
                <Layers size={13} className="text-blue-500" />
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/25"
              >
                {Object.keys(CATEGORY_MAP).map(catKey => (
                  <option key={catKey} value={catKey}>
                    {catKey} ({CATEGORY_MAP[catKey].prefix})
                  </option>
                ))}
              </select>
            </div>

            {/* Sub-Category Select */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1 flex items-center gap-1.5">
                <ListFilter size={13} className="text-indigo-500" />
                Sub-Category
              </label>
              <select
                value={subCategory}
                onChange={(e) => setSubCategory(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/25"
              >
                {currentCatData.subcategories.map(sub => (
                  <option key={sub.name} value={sub.name}>
                    {sub.name} [{sub.prefix}]
                  </option>
                ))}
              </select>
            </div>

            {/* Supplier / Vendor Selector */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1 flex items-center gap-1.5">
                <Building2 size={13} className="text-emerald-500" />
                Supplier / Brand
              </label>
              <select
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/25"
              >
                {POPULAR_SUPPLIERS.map(s => (
                  <option key={s.name} value={s.name}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>
            </div>

            {/* Custom Supplier Prefix Override */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1 flex items-center gap-1.5">
                <Hash size={13} className="text-amber-500" />
                Custom Supplier Code (Optional)
              </label>
              <input
                type="text"
                maxLength={4}
                value={customSupplierCode}
                onChange={(e) => setCustomSupplierCode(e.target.value)}
                placeholder="e.g. APL, SNY, HP"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-mono font-bold uppercase text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/25"
              />
            </div>

          </div>

          {/* Pattern Format Choices */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
              <Sliders size={13} className="text-purple-500" />
              Identifier Naming Pattern
            </label>

            <div className="grid grid-cols-3 gap-3">
              
              <button
                type="button"
                onClick={() => setPatternFormat("standard")}
                className={`p-3 rounded-xl border text-left transition-all ${
                  patternFormat === "standard"
                    ? "border-blue-600 bg-blue-50/50 ring-2 ring-blue-500/20"
                    : "border-slate-200 bg-slate-50/50 hover:bg-slate-100"
                }`}
              >
                <div className="font-extrabold text-slate-900 text-xs">Standard Hyphen</div>
                <div className="text-[10px] font-mono text-blue-700 mt-1 font-bold">CAT-SUBCAT-SUPP-101</div>
              </button>

              <button
                type="button"
                onClick={() => setPatternFormat("compact")}
                className={`p-3 rounded-xl border text-left transition-all ${
                  patternFormat === "compact"
                    ? "border-blue-600 bg-blue-50/50 ring-2 ring-blue-500/20"
                    : "border-slate-200 bg-slate-50/50 hover:bg-slate-100"
                }`}
              >
                <div className="font-extrabold text-slate-900 text-xs">Compact Code</div>
                <div className="text-[10px] font-mono text-indigo-700 mt-1 font-bold">CASUSU-101</div>
              </button>

              <button
                type="button"
                onClick={() => setPatternFormat("detailed")}
                className={`p-3 rounded-xl border text-left transition-all ${
                  patternFormat === "detailed"
                    ? "border-blue-600 bg-blue-50/50 ring-2 ring-blue-500/20"
                    : "border-slate-200 bg-slate-50/50 hover:bg-slate-100"
                }`}
              >
                <div className="font-extrabold text-slate-900 text-xs">Underscore Extended</div>
                <div className="text-[10px] font-mono text-purple-700 mt-1 font-bold">SUPP_CAT_SUBCAT_001</div>
              </button>

            </div>
          </div>

          {/* Generated Result Box */}
          {activeTab === "single" ? (
            <div className="p-4 bg-slate-900 text-white rounded-2xl border border-slate-800 shadow-md space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles size={13} className="text-amber-400" />
                  Suggested Stock Keeping Unit
                </span>
                
                <button
                  type="button"
                  onClick={handleRandomizeSeq}
                  className="flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[11px] font-bold transition-all"
                >
                  <RefreshCw size={12} />
                  <span>Next ID</span>
                </button>
              </div>

              <div className="flex items-center justify-between gap-4 bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                <div className="font-mono text-xl font-black text-amber-400 tracking-wider">
                  {generatedSku}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleCopy(generatedSku)}
                    className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors"
                    title="Copy to clipboard"
                  >
                    {copied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
                  </button>
                </div>
              </div>

              {/* Segment Breakdown */}
              <div className="grid grid-cols-4 gap-2 pt-1 text-[10px]">
                <div className="bg-slate-800/80 p-2 rounded-lg text-center">
                  <span className="text-slate-400 block font-bold">Cat Code</span>
                  <span className="font-mono text-blue-300 font-extrabold">{CATEGORY_MAP[category]?.prefix}</span>
                </div>
                <div className="bg-slate-800/80 p-2 rounded-lg text-center">
                  <span className="text-slate-400 block font-bold">Sub-Cat</span>
                  <span className="font-mono text-indigo-300 font-extrabold">{getSubCatPrefix()}</span>
                </div>
                <div className="bg-slate-800/80 p-2 rounded-lg text-center">
                  <span className="text-slate-400 block font-bold">Supplier</span>
                  <span className="font-mono text-emerald-300 font-extrabold">{getSupplierCode()}</span>
                </div>
                <div className="bg-slate-800/80 p-2 rounded-lg text-center">
                  <span className="text-slate-400 block font-bold">Index</span>
                  <span className="font-mono text-amber-300 font-extrabold">#{sequenceNumber}</span>
                </div>
              </div>

              {/* Duplicate check indicator */}
              {isDuplicate && (
                <div className="p-2.5 bg-rose-950/80 border border-rose-800 rounded-xl text-rose-300 flex items-center gap-2 text-xs font-semibold">
                  <AlertCircle size={15} className="shrink-0" />
                  <span>Warning: This SKU already exists in your product database! Click 'Next ID' to increment index.</span>
                </div>
              )}
            </div>
          ) : (
            /* Batch SKU View */
            <div className="p-4 bg-slate-900 text-white rounded-2xl border border-slate-800 shadow-md space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Tag size={13} className="text-blue-400" />
                  Sequential Batch Series (5 Variants)
                </span>
                <span className="text-[11px] text-slate-400">Click any row to select</span>
              </div>

              <div className="space-y-1.5">
                {batchSkus.map((bSku, idx) => (
                  <div
                    key={bSku}
                    onClick={() => handleApply(bSku)}
                    className="flex items-center justify-between p-2.5 bg-slate-950 hover:bg-blue-950/50 border border-slate-800 hover:border-blue-700/60 rounded-xl cursor-pointer transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-mono text-slate-500 font-bold w-4">#{idx + 1}</span>
                      <span className="font-mono font-bold text-amber-400 text-sm">{bSku}</span>
                    </div>

                    <span className="text-xs font-bold text-blue-400 group-hover:text-blue-300 flex items-center gap-1 opacity-80 group-hover:opacity-100">
                      Use SKU <ArrowRight size={13} />
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold rounded-xl text-xs transition-all"
          >
            Cancel
          </button>

          {onApplySku && (
            <button
              type="button"
              disabled={isDuplicate}
              onClick={() => handleApply(generatedSku)}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-extrabold rounded-xl text-xs shadow-md shadow-blue-500/25 transition-all"
            >
              <Check size={16} />
              <span>Apply SKU To Product</span>
            </button>
          )}
        </div>

      </motion.div>
    </div>
  );
};
