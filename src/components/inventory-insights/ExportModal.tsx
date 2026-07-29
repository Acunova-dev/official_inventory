import React, { useState } from "react";
import { 
  Download, 
  FileSpreadsheet, 
  FileText, 
  X, 
  CheckSquare, 
  Square, 
  Layers, 
  TrendingUp, 
  Package, 
  Activity,
  Check
} from "lucide-react";
import { InventoryInsightsResponse } from "../../types";
import { ExportOptions, generateExportData } from "../../utils/exportHelper";

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: InventoryInsightsResponse | null;
}

export const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose, data }) => {
  const [format, setFormat] = useState<"excel" | "csv">("excel");
  const [includeSummary, setIncludeSummary] = useState(true);
  const [includeProducts, setIncludeProducts] = useState(true);
  const [includeTrends, setIncludeTrends] = useState(true);
  const [includeAbc, setIncludeAbc] = useState(true);
  const [includeStockHealth, setIncludeStockHealth] = useState(true);
  const [includeMovement, setIncludeMovement] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  if (!isOpen || !data) return null;

  const totalProducts = data.productPerformance?.length || 0;
  const totalRevenue = data.executiveSummary?.revenue?.value || 0;

  const handleSelectAll = (select: boolean) => {
    setIncludeSummary(select);
    setIncludeProducts(select);
    setIncludeTrends(select);
    setIncludeAbc(select);
    setIncludeStockHealth(select);
    setIncludeMovement(select);
  };

  const handleDownload = () => {
    setIsExporting(true);
    const options: ExportOptions = {
      format,
      includeSummary,
      includeProducts,
      includeTrends,
      includeAbc,
      includeStockHealth,
      includeMovement,
    };

    setTimeout(() => {
      generateExportData(data, options);
      setIsExporting(false);
      setExportSuccess(true);
      setTimeout(() => {
        setExportSuccess(false);
        onClose();
      }, 1200);
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-6 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600/30 text-blue-400 rounded-2xl border border-blue-500/30">
              <Download size={22} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">Export Dashboard Data</h2>
              <p className="text-xs text-slate-400">Generate external reporting spreadsheets & CSV documents</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Format Selection */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
              1. Choose Export File Format
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFormat("excel")}
                className={`p-4 rounded-2xl border text-left flex items-start gap-3.5 transition-all ${
                  format === "excel"
                    ? "bg-emerald-50/80 border-emerald-500 ring-2 ring-emerald-500/20 text-emerald-950 shadow-xs"
                    : "bg-slate-50 border-slate-200 hover:border-slate-300 text-slate-700"
                }`}
              >
                <div className={`p-2.5 rounded-xl ${format === "excel" ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-600"}`}>
                  <FileSpreadsheet size={20} />
                </div>
                <div>
                  <div className="font-bold text-sm flex items-center gap-1.5">
                    Excel Workbook
                    <span className="text-[10px] bg-emerald-200 text-emerald-800 px-1.5 py-0.5 rounded font-mono font-bold">.xls</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">Multi-tab workbook formatted with formatted headers and gridlines.</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setFormat("csv")}
                className={`p-4 rounded-2xl border text-left flex items-start gap-3.5 transition-all ${
                  format === "csv"
                    ? "bg-blue-50/80 border-blue-500 ring-2 ring-blue-500/20 text-blue-950 shadow-xs"
                    : "bg-slate-50 border-slate-200 hover:border-slate-300 text-slate-700"
                }`}
              >
                <div className={`p-2.5 rounded-xl ${format === "csv" ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-600"}`}>
                  <FileText size={20} />
                </div>
                <div>
                  <div className="font-bold text-sm flex items-center gap-1.5">
                    CSV Document
                    <span className="text-[10px] bg-blue-200 text-blue-800 px-1.5 py-0.5 rounded font-mono font-bold">.csv</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">Universal comma-separated text standard compatible with all systems.</p>
                </div>
              </button>
            </div>
          </div>

          {/* Section Selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                2. Select Sections to Include
              </label>
              <div className="flex gap-2 text-[11px] font-semibold text-blue-600">
                <button type="button" onClick={() => handleSelectAll(true)} className="hover:underline">Select All</button>
                <span>•</span>
                <button type="button" onClick={() => handleSelectAll(false)} className="hover:underline">Deselect All</button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <label 
                onClick={() => setIncludeSummary(!includeSummary)}
                className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                  includeSummary ? "bg-slate-900 border-slate-900 text-white" : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Activity size={16} className={includeSummary ? "text-blue-400" : "text-slate-400"} />
                  <span className="font-semibold">Executive KPI Summary</span>
                </div>
                {includeSummary ? <CheckSquare size={16} className="text-blue-400" /> : <Square size={16} className="text-slate-400" />}
              </label>

              <label 
                onClick={() => setIncludeProducts(!includeProducts)}
                className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                  includeProducts ? "bg-slate-900 border-slate-900 text-white" : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Package size={16} className={includeProducts ? "text-blue-400" : "text-slate-400"} />
                  <span className="font-semibold">Product Performance ({totalProducts})</span>
                </div>
                {includeProducts ? <CheckSquare size={16} className="text-blue-400" /> : <Square size={16} className="text-slate-400" />}
              </label>

              <label 
                onClick={() => setIncludeTrends(!includeTrends)}
                className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                  includeTrends ? "bg-slate-900 border-slate-900 text-white" : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <TrendingUp size={16} className={includeTrends ? "text-blue-400" : "text-slate-400"} />
                  <span className="font-semibold">Historical Sales Trends</span>
                </div>
                {includeTrends ? <CheckSquare size={16} className="text-blue-400" /> : <Square size={16} className="text-slate-400" />}
              </label>

              <label 
                onClick={() => setIncludeAbc(!includeAbc)}
                className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                  includeAbc ? "bg-slate-900 border-slate-900 text-white" : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Layers size={16} className={includeAbc ? "text-blue-400" : "text-slate-400"} />
                  <span className="font-semibold">ABC Analysis Classes</span>
                </div>
                {includeAbc ? <CheckSquare size={16} className="text-blue-400" /> : <Square size={16} className="text-slate-400" />}
              </label>

              <label 
                onClick={() => setIncludeStockHealth(!includeStockHealth)}
                className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                  includeStockHealth ? "bg-slate-900 border-slate-900 text-white" : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Activity size={16} className={includeStockHealth ? "text-blue-400" : "text-slate-400"} />
                  <span className="font-semibold">Stock Health Thresholds</span>
                </div>
                {includeStockHealth ? <CheckSquare size={16} className="text-blue-400" /> : <Square size={16} className="text-slate-400" />}
              </label>

              <label 
                onClick={() => setIncludeMovement(!includeMovement)}
                className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                  includeMovement ? "bg-slate-900 border-slate-900 text-white" : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Package size={16} className={includeMovement ? "text-blue-400" : "text-slate-400"} />
                  <span className="font-semibold">Fast/Slow/Dead Stock</span>
                </div>
                {includeMovement ? <CheckSquare size={16} className="text-blue-400" /> : <Square size={16} className="text-slate-400" />}
              </label>
            </div>
          </div>

          {/* Report Metadata Preview */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs flex items-center justify-between text-slate-600 font-mono">
            <div>
              <span className="text-slate-400 font-sans font-semibold block">Included Products:</span>
              <span className="font-bold text-slate-900">{totalProducts} SKUs</span>
            </div>
            <div>
              <span className="text-slate-400 font-sans font-semibold block">Tracked Revenue:</span>
              <span className="font-bold text-emerald-600">${totalRevenue.toLocaleString()}</span>
            </div>
            <div>
              <span className="text-slate-400 font-sans font-semibold block">Format Target:</span>
              <span className="font-bold text-blue-600 uppercase">{format}</span>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-100 transition-all"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleDownload}
            disabled={isExporting || (!includeSummary && !includeProducts && !includeTrends && !includeAbc && !includeStockHealth && !includeMovement)}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {exportSuccess ? (
              <>
                <Check size={16} className="text-emerald-300" />
                <span>Export Downloaded!</span>
              </>
            ) : isExporting ? (
              <span>Preparing Report...</span>
            ) : (
              <>
                <Download size={16} />
                <span>Generate & Download {format.toUpperCase()}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
