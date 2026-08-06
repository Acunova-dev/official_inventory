import React, { useState, useEffect, useRef, useMemo } from "react";
import { Search, ChevronDown, Check, X, Package, AlertCircle } from "lucide-react";
import { Product } from "../types";

interface ProductAutocompleteSelectProps {
  products: Product[];
  value: string; // productId
  onChange: (productId: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  disabled?: boolean;
  error?: string;
  id?: string;
}

export const ProductAutocompleteSelect: React.FC<ProductAutocompleteSelectProps> = ({
  products,
  value,
  onChange,
  placeholder = "Search product name, SKU, or keyword...",
  autoFocus = false,
  disabled = false,
  error,
  id
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Find currently selected product
  const selectedProduct = useMemo(() => {
    return products.find((p) => p.id === value) || null;
  }, [products, value]);

  // Filter products based on search query
  const filteredProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return products;
    }

    const queryParts = query.split(/\s+/).filter(Boolean);

    return products.filter((p) => {
      const name = (p.name || "").toLowerCase();
      const sku = (p.sku || "").toLowerCase();
      const category = (p.category || "").toLowerCase();
      const description = (p.description || "").toLowerCase();

      // Check if all query parts match anywhere in name, sku, category, or description
      return queryParts.every(
        (part) =>
          name.includes(part) ||
          sku.includes(part) ||
          category.includes(part) ||
          description.includes(part)
      );
    });
  }, [products, searchQuery]);

  // Reset highlighted index when filter results change
  useEffect(() => {
    setHighlightedIndex(0);
  }, [filteredProducts]);

  // Handle outside clicks to close the dropdown
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [isOpen]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 30);
    }
  }, [isOpen]);

  // Auto-focus if requested on initial render
  useEffect(() => {
    if (autoFocus && !value) {
      setIsOpen(true);
    }
  }, [autoFocus, value]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (isOpen && listRef.current) {
      const activeEl = listRef.current.children[highlightedIndex] as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({ block: "nearest" });
      }
    }
  }, [highlightedIndex, isOpen]);

  const handleSelectProduct = (product: Product) => {
    onChange(product.id);
    setIsOpen(false);
    setSearchQuery("");
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("");
    setSearchQuery("");
    setIsOpen(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < filteredProducts.length - 1 ? prev + 1 : 0
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev > 0 ? prev - 1 : filteredProducts.length - 1
        );
        break;
      case "Enter":
        e.preventDefault();
        if (filteredProducts.length > 0 && highlightedIndex >= 0 && highlightedIndex < filteredProducts.length) {
          handleSelectProduct(filteredProducts[highlightedIndex]);
        }
        break;
      case "Escape":
        e.preventDefault();
        setIsOpen(false);
        break;
      case "Tab":
        setIsOpen(false);
        break;
      default:
        break;
    }
  };

  return (
    <div ref={containerRef} className="relative w-full" id={id}>
      {/* Closed State / Trigger Display */}
      {!isOpen ? (
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            if (!disabled) {
              setIsOpen(true);
              setSearchQuery("");
            }
          }}
          className={`w-full text-left bg-white border ${
            error ? "border-rose-400 bg-rose-50/20" : "border-slate-200 hover:border-slate-300"
          } rounded-xl px-3 py-2 text-xs flex items-center justify-between gap-2 shadow-2xs transition-all focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500`}
        >
          {selectedProduct ? (
            <div className="flex items-center justify-between gap-2 flex-1 min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <Package size={14} className="text-blue-600 shrink-0" />
                <span className="font-semibold text-slate-900 truncate">
                  {selectedProduct.name}
                </span>
                {selectedProduct.sku && (
                  <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
                    [{selectedProduct.sku}]
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="font-bold text-slate-950 font-mono">
                  ${selectedProduct.sellingPrice.toFixed(2)}
                </span>
                {selectedProduct.quantity <= 0 ? (
                  <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                    Out of Stock – Special Order
                  </span>
                ) : (
                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 font-mono">
                    In Stock ({selectedProduct.quantity})
                  </span>
                )}
                {!disabled && (
                  <span
                    onClick={handleClear}
                    title="Change product"
                    className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    <X size={13} />
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-slate-400 flex-1">
              <Search size={14} />
              <span>{placeholder}</span>
            </div>
          )}
          <ChevronDown size={14} className="text-slate-400 shrink-0" />
        </button>
      ) : (
        /* Open State: Searchable Input with Dropdown */
        <div className="relative">
          <div className="flex items-center gap-2 bg-white border-2 border-blue-500 rounded-xl px-3 py-1.5 shadow-md">
            <Search size={14} className="text-blue-600 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className="w-full bg-transparent border-0 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-hidden"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X size={13} />
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-[10px] font-bold text-slate-400 hover:text-slate-700 uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-100"
            >
              Esc
            </button>
          </div>

          {/* Autocomplete Suggestions Dropdown List */}
          <div className="absolute z-50 left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl max-h-64 overflow-y-auto divide-y divide-slate-100 font-sans">
            <ul ref={listRef} className="py-1">
              {filteredProducts.length > 0 ? (
                filteredProducts.map((product, idx) => {
                  const isSelected = product.id === value;
                  const isHighlighted = idx === highlightedIndex;

                  return (
                    <li
                      key={product.id}
                      onClick={() => handleSelectProduct(product)}
                      onMouseEnter={() => setHighlightedIndex(idx)}
                      className={`px-3 py-2 cursor-pointer flex items-center justify-between gap-3 text-xs transition-colors ${
                        isHighlighted
                          ? "bg-blue-50 text-blue-900"
                          : isSelected
                          ? "bg-slate-50 text-slate-900"
                          : "text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`font-bold truncate ${isHighlighted ? "text-blue-950" : "text-slate-900"}`}>
                            {product.name}
                          </span>
                          {product.sku && (
                            <span className="text-[10px] text-slate-400 font-mono shrink-0">
                              [{product.sku}]
                            </span>
                          )}
                        </div>
                        {product.category && (
                          <span className="text-[10px] text-slate-400 block truncate mt-0.5">
                            {product.category}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2.5 shrink-0 text-right">
                        <div className="flex flex-col items-end gap-1">
                          <span className="font-extrabold font-mono text-slate-950 block">
                            ${product.sellingPrice.toFixed(2)}
                          </span>
                          {product.quantity <= 0 ? (
                            <span className="text-[9px] font-bold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                              Out of Stock – Special Order
                            </span>
                          ) : (
                            <span className="text-[9px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 font-mono">
                              In Stock ({product.quantity})
                            </span>
                          )}
                        </div>
                        {isSelected && <Check size={14} className="text-blue-600 shrink-0" />}
                      </div>
                    </li>
                  );
                })
              ) : (
                <li className="px-4 py-6 text-center text-xs text-slate-400 space-y-1">
                  <AlertCircle size={18} className="mx-auto text-slate-300" />
                  <p className="font-semibold text-slate-600">No products found</p>
                  <p className="text-[11px]">No products match "{searchQuery}"</p>
                </li>
              )}
            </ul>
            <div className="px-3 py-1.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-mono">
              <span>{filteredProducts.length} items available</span>
              <span>↑↓ Navigate • ↵ Select • Esc Close</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
