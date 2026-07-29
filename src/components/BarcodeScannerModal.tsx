import React, { useEffect, useRef, useState } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { 
  Camera, 
  X, 
  Zap, 
  ZapOff, 
  RefreshCw, 
  Search, 
  CheckCircle2, 
  AlertTriangle, 
  Package, 
  Plus, 
  Minus, 
  MapPin, 
  ExternalLink,
  Volume2,
  VolumeX,
  Sparkles,
  Barcode as BarcodeIcon,
  Tag
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Product } from "../types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { productService } from "../services/api";

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  onSelectProduct?: (product: Product) => void;
  onScannedBarcode?: (barcode: string) => void;
  onCreateProductWithBarcode?: (barcode: string) => void;
  title?: string;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  products,
  onSelectProduct,
  onScannedBarcode,
  onCreateProductWithBarcode,
  title = "Camera Barcode & SKU Scanner"
}) => {
  const queryClient = useQueryClient();
  const scannerContainerId = "barcode-scanner-viewport";
  const html5QrcodeRef = useRef<Html5Qrcode | null>(null);

  const [isScanning, setIsScanning] = useState(false);
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>("");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Manual code fallback input
  const [manualCode, setManualCode] = useState("");

  // Scanned result state
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);
  const [matchedProduct, setMatchedProduct] = useState<Product | null>(null);
  const [adjustQtyValue, setAdjustQtyValue] = useState<number>(0);
  const [isSavingStock, setIsSavingStock] = useState(false);

  // Play audio beep synthesized with Web Audio API
  const playBeep = () => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(1046.5, ctx.currentTime); // C6 note
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch {
      // Audio fallback silent ignore
    }
  };

  // Stock update mutation
  const updateStockMutation = useMutation({
    mutationFn: ({ id, quantity }: { id: string; quantity: number }) => 
      productService.update(id, { quantity }),
    onSuccess: (updatedProd) => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-monitoring"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      setMatchedProduct(updatedProd);
      setAdjustQtyValue(updatedProd.quantity);
      setIsSavingStock(false);
    },
    onError: () => {
      setIsSavingStock(false);
    }
  });

  // Handle scanned barcode lookup
  const processBarcodeMatch = (code: string) => {
    const trimmed = code.trim();
    if (!trimmed) return;

    playBeep();
    setLastScannedCode(trimmed);
    if (onScannedBarcode) {
      onScannedBarcode(trimmed);
    }

    // Try exact or partial match: sku, barcode, id, or name
    const query = trimmed.toLowerCase();
    const found = products.find(p => 
      (p.sku && p.sku.toLowerCase() === query) ||
      (p.barcode && p.barcode.toLowerCase() === query) ||
      p.id.toLowerCase() === query ||
      (p.sku && p.sku.toLowerCase().includes(query)) ||
      (p.barcode && p.barcode.toLowerCase().includes(query)) ||
      p.name.toLowerCase() === query
    ) || products.find(p => p.name.toLowerCase().includes(query));

    if (found) {
      setMatchedProduct(found);
      setAdjustQtyValue(found.quantity);
      if (onSelectProduct) {
        onSelectProduct(found);
      }
    } else {
      setMatchedProduct(null);
    }
  };

  // Initialize camera and scanner instance
  const startScanner = async (cameraId?: string) => {
    setCameraError(null);
    setIsScanning(false);

    try {
      // Ensure existing instance stopped
      if (html5QrcodeRef.current) {
        if (html5QrcodeRef.current.isScanning) {
          await html5QrcodeRef.current.stop();
        }
        html5QrcodeRef.current.clear();
      }

      // Query camera devices if not queried yet
      const devices = await Html5Qrcode.getCameras();
      if (devices && devices.length > 0) {
        setCameras(devices);
        const targetCamId = cameraId || selectedCameraId || devices[0].id;
        setSelectedCameraId(targetCamId);

        const html5Qrcode = new Html5Qrcode(scannerContainerId, {
          formatsToSupport: [
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.QR_CODE,
            Html5QrcodeSupportedFormats.DATA_MATRIX,
            Html5QrcodeSupportedFormats.ITF,
          ],
          verbose: false
        });

        html5QrcodeRef.current = html5Qrcode;

        const config = {
          fps: 15,
          qrbox: { width: 280, height: 160 },
          aspectRatio: 1.333333
        };

        await html5Qrcode.start(
          targetCamId,
          config,
          (decodedText) => {
            processBarcodeMatch(decodedText);
          },
          () => {
            // Frame detection error, ignore silent frames
          }
        );

        setIsScanning(true);

        // Check torch support
        try {
          const track = html5Qrcode.getRunningTrackCameraCapabilities();
          if ((track as any)?.torchFeature?.isSupported()) {
            setHasTorch(true);
          }
        } catch {
          setHasTorch(false);
        }
      } else {
        setCameraError("No video camera hardware detected on this device.");
      }
    } catch (err: any) {
      console.error("Camera scanner error:", err);
      if (err?.name === "NotAllowedError" || err?.toString().includes("Permission")) {
        setCameraError("Camera access permission was denied. Please allow camera permissions in your browser bar.");
      } else {
        setCameraError(err?.message || "Could not start camera feed.");
      }
    }
  };

  const stopScanner = async () => {
    if (html5QrcodeRef.current) {
      try {
        if (html5QrcodeRef.current.isScanning) {
          await html5QrcodeRef.current.stop();
        }
        html5QrcodeRef.current.clear();
      } catch (err) {
        console.warn("Failed to stop scanner cleanly:", err);
      }
      html5QrcodeRef.current = null;
    }
    setIsScanning(false);
  };

  useEffect(() => {
    if (isOpen) {
      // Delay slightly for modal element mounting in DOM
      const timer = setTimeout(() => {
        startScanner();
      }, 200);
      return () => {
        clearTimeout(timer);
        stopScanner();
      };
    } else {
      stopScanner();
      setLastScannedCode(null);
      setMatchedProduct(null);
    }
  }, [isOpen]);

  const handleCameraChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const camId = e.target.value;
    setSelectedCameraId(camId);
    startScanner(camId);
  };

  const toggleTorch = async () => {
    if (!html5QrcodeRef.current || !hasTorch) return;
    try {
      const nextState = !torchOn;
      await html5QrcodeRef.current.applyVideoConstraints({
        advanced: [{ torch: nextState }] as any
      });
      setTorchOn(nextState);
    } catch (e) {
      console.warn("Torch toggle failed:", e);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode) {
      processBarcodeMatch(manualCode);
      setManualCode("");
    }
  };

  const handleQuickStockChange = (delta: number) => {
    if (!matchedProduct) return;
    const newQty = Math.max(0, matchedProduct.quantity + delta);
    setIsSavingStock(true);
    updateStockMutation.mutate({ id: matchedProduct.id, quantity: newQty });
  };

  const handleSetExactStock = () => {
    if (!matchedProduct) return;
    setIsSavingStock(true);
    updateStockMutation.mutate({ id: matchedProduct.id, quantity: Math.max(0, adjustQtyValue) });
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-2xl overflow-hidden my-auto"
        >
          {/* Header */}
          <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-blue-500/20 text-blue-400 rounded-xl border border-blue-500/30">
                <BarcodeIcon size={20} />
              </div>
              <div>
                <h2 className="font-bold text-base text-white">{title}</h2>
                <p className="text-xs text-slate-400">Scan barcode, QR code, or SKU tag to instantly lookup & adjust stock</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`p-2 rounded-xl transition-colors ${
                  soundEnabled ? "bg-slate-800 text-blue-400 hover:bg-slate-700" : "bg-slate-800 text-slate-500 hover:bg-slate-700"
                }`}
                title={soundEnabled ? "Mute scan sound" : "Enable scan audio feedback"}
              >
                {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
              </button>

              <button
                type="button"
                onClick={onClose}
                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Main Body */}
          <div className="p-6 space-y-6 max-h-[85vh] overflow-y-auto">
            {/* Camera Viewport Area */}
            <div className="relative bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-inner min-h-[260px] flex flex-col justify-between">
              
              {/* Scanner Video Mounting Element */}
              <div id={scannerContainerId} className="w-full h-full min-h-[260px]" />

              {/* Laser Scanning Overlay Animation */}
              {isScanning && !lastScannedCode && (
                <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-6">
                  {/* Framing Bounding Box */}
                  <div className="w-64 h-36 border-2 border-dashed border-blue-400/80 rounded-2xl relative shadow-[0_0_20px_rgba(59,130,246,0.3)]">
                    {/* Animated Scanning Line */}
                    <div className="absolute inset-x-2 h-0.5 bg-gradient-to-r from-transparent via-blue-400 to-transparent shadow-[0_0_12px_#3b82f6] animate-[pulse_1.5s_infinite]" style={{
                      animation: "scanLine 2s ease-in-out infinite alternate"
                    }} />
                    
                    {/* Corner Accents */}
                    <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-blue-500" />
                    <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-blue-500" />
                    <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-blue-500" />
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-blue-500" />
                  </div>
                  <p className="text-[11px] font-mono text-blue-300/90 mt-3 bg-slate-900/80 px-3 py-1 rounded-full border border-blue-500/20">
                    Align barcode inside camera target
                  </p>
                </div>
              )}

              {/* Camera Error Banner */}
              {cameraError && (
                <div className="p-6 text-center text-slate-300 space-y-3 bg-slate-900/90">
                  <AlertTriangle size={32} className="text-amber-400 mx-auto" />
                  <p className="text-xs text-amber-200 font-medium max-w-sm mx-auto">{cameraError}</p>
                  <button
                    type="button"
                    onClick={() => startScanner()}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-md inline-flex items-center gap-1.5"
                  >
                    <RefreshCw size={14} /> Retry Camera
                  </button>
                </div>
              )}

              {/* Camera Controls Bar Overlay */}
              <div className="relative z-10 bg-slate-900/90 border-t border-slate-800 p-3 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-300">
                <div className="flex items-center gap-2">
                  <Camera size={14} className="text-blue-400" />
                  {cameras.length > 1 ? (
                    <select
                      value={selectedCameraId}
                      onChange={handleCameraChange}
                      className="bg-slate-800 border border-slate-700 text-white text-xs rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 max-w-[200px] truncate"
                    >
                      {cameras.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.label || `Camera ${c.id.slice(0, 5)}...`}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="font-mono text-[11px] text-slate-400">
                      {cameras[0]?.label || "Default Device Camera"}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {hasTorch && (
                    <button
                      type="button"
                      onClick={toggleTorch}
                      className={`px-2.5 py-1 rounded-lg font-medium text-[11px] flex items-center gap-1 transition-colors ${
                        torchOn ? "bg-amber-500/20 text-amber-300 border border-amber-500/40" : "bg-slate-800 hover:bg-slate-700 text-slate-300"
                      }`}
                    >
                      {torchOn ? <Zap size={12} className="text-amber-400" /> : <ZapOff size={12} />}
                      Torch
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => startScanner(selectedCameraId)}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[11px] font-medium flex items-center gap-1 transition-colors"
                  >
                    <RefreshCw size={12} /> Restart Camera
                  </button>
                </div>
              </div>
            </div>

            {/* Manual Code Entry Fallback */}
            <form onSubmit={handleManualSubmit} className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
                  <Search size={15} />
                </span>
                <input
                  type="text"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder="Or enter Barcode / SKU / Model code manually..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-mono font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
              <button
                type="submit"
                disabled={!manualCode.trim()}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition-all"
              >
                Lookup
              </button>
            </form>

            {/* Scanned Result Card Area */}
            {lastScannedCode && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4 pt-2 border-t border-slate-100"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-500">Scanned Tag / Barcode:</span>
                    <span className="font-mono text-xs font-bold bg-slate-100 text-slate-900 px-2.5 py-1 rounded-lg border border-slate-200">
                      {lastScannedCode}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setLastScannedCode(null);
                      setMatchedProduct(null);
                    }}
                    className="text-xs text-blue-600 hover:text-blue-800 font-semibold"
                  >
                    Scan Another Tag
                  </button>
                </div>

                {/* MATCHED PRODUCT RESULT */}
                {matchedProduct ? (
                  <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-2xl p-5 space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md font-mono">
                            {matchedProduct.category}
                          </span>
                          <span className="text-[10px] font-bold text-slate-500 font-mono">
                            SKU: {matchedProduct.sku || matchedProduct.id}
                          </span>
                        </div>
                        <h3 className="text-base font-bold text-slate-900 leading-snug">
                          {matchedProduct.name}
                        </h3>
                        <div className="flex items-center gap-3 text-xs text-slate-600 pt-0.5">
                          <span className="flex items-center gap-1 font-medium">
                            <MapPin size={13} className="text-slate-400" />
                            {matchedProduct.location || "Storage Bay"}
                          </span>
                          <span className="font-bold text-slate-900 font-mono">
                            ${matchedProduct.sellingPrice.toFixed(2)}
                          </span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Current Stock</span>
                        <span className={`text-2xl font-black font-mono ${
                          matchedProduct.quantity <= matchedProduct.minStock ? "text-amber-600" : "text-emerald-700"
                        }`}>
                          {matchedProduct.quantity}
                        </span>
                      </div>
                    </div>

                    {/* Stock Quick Adjustment Section */}
                    <div className="pt-3 border-t border-emerald-200/60 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-700">Quick Adjust:</span>
                        <div className="flex items-center bg-white rounded-xl border border-slate-200 shadow-3xs p-0.5">
                          <button
                            type="button"
                            onClick={() => handleQuickStockChange(-1)}
                            disabled={isSavingStock || matchedProduct.quantity <= 0}
                            className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-40"
                            title="Decrease 1 unit"
                          >
                            <Minus size={14} />
                          </button>
                          
                          <input
                            type="number"
                            value={adjustQtyValue}
                            onChange={(e) => setAdjustQtyValue(Number(e.target.value) || 0)}
                            className="w-14 text-center font-mono font-bold text-xs text-slate-900 focus:outline-none"
                          />

                          <button
                            type="button"
                            onClick={() => handleQuickStockChange(1)}
                            disabled={isSavingStock}
                            className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-40"
                            title="Add 1 unit"
                          >
                            <Plus size={14} />
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={handleSetExactStock}
                          disabled={isSavingStock}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs"
                        >
                          Save Stock
                        </button>
                      </div>

                      {/* Action buttons */}
                      {onSelectProduct && (
                        <button
                          type="button"
                          onClick={() => {
                            onSelectProduct(matchedProduct);
                            onClose();
                          }}
                          className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5"
                        >
                          View Details <ExternalLink size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  /* UNMATCHED BARCODE RESULT */
                  <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-5 space-y-3">
                    <div className="flex items-start gap-3">
                      <AlertTriangle size={20} className="text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-sm font-bold text-amber-900">Unrecognized Barcode / Tag</h4>
                        <p className="text-xs text-amber-800 mt-0.5">
                          No existing inventory item matched code <span className="font-mono font-bold">"{lastScannedCode}"</span>.
                        </p>
                      </div>
                    </div>

                    {onCreateProductWithBarcode && (
                      <div className="pt-2 flex justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            onCreateProductWithBarcode(lastScannedCode);
                            onClose();
                          }}
                          className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs"
                        >
                          <Plus size={14} /> Catalog New Product with this Barcode
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
