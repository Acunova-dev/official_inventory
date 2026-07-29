import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { 
  Search, 
  X, 
  Package, 
  Users, 
  FileText, 
  ArrowRight, 
  CornerDownLeft, 
  Loader2,
  Tag,
  CheckCircle2,
  Clock
} from "lucide-react";
import { productService, customerService, quotationService } from "../services/api";
import { Product, Customer, Quotation } from "../types";

export const GlobalSearch: React.FC = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<"all" | "products" | "customers" | "quotations">("all");
  const [selectedIndex, setSelectedIndex] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch Products
  const { data: rawProducts, isLoading: isProductsLoading } = useQuery({
    queryKey: ["global-search-products"],
    queryFn: () => productService.getAll(),
    enabled: isOpen,
  });

  // Fetch Customers
  const { data: rawCustomers, isLoading: isCustomersLoading } = useQuery({
    queryKey: ["global-search-customers"],
    queryFn: () => customerService.getAll(),
    enabled: isOpen,
  });

  // Fetch Quotations
  const { data: rawQuotations, isLoading: isQuotationsLoading } = useQuery({
    queryKey: ["global-search-quotations"],
    queryFn: () => quotationService.getAll(),
    enabled: isOpen,
  });

  const products: Product[] = useMemo(() => {
    if (!rawProducts) return [];
    return Array.isArray(rawProducts) ? rawProducts : (rawProducts.products || []);
  }, [rawProducts]);

  const customers: Customer[] = useMemo(() => {
    if (!rawCustomers) return [];
    return Array.isArray(rawCustomers) ? rawCustomers : [];
  }, [rawCustomers]);

  const quotations: Quotation[] = useMemo(() => {
    if (!rawQuotations) return [];
    return Array.isArray(rawQuotations) ? rawQuotations : [];
  }, [rawQuotations]);

  const isLoading = isProductsLoading || isCustomersLoading || isQuotationsLoading;

  // Filter items based on search query
  const filteredResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      // Show top recent items when no query entered
      return {
        products: products.slice(0, 3),
        customers: customers.slice(0, 3),
        quotations: quotations.slice(0, 3),
      };
    }

    const filteredProds = products.filter((p) => 
      p.name?.toLowerCase().includes(q) ||
      p.category?.toLowerCase().includes(q) ||
      p.location?.toLowerCase().includes(q)
    );

    const filteredCusts = customers.filter((c) =>
      c.name?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.type?.toLowerCase().includes(q) ||
      c.phone?.toLowerCase().includes(q)
    );

    const filteredQuotes = quotations.filter((qt) =>
      qt.quotationNumber?.toLowerCase().includes(q) ||
      qt.customerName?.toLowerCase().includes(q) ||
      qt.customerEmail?.toLowerCase().includes(q) ||
      qt.status?.toLowerCase().includes(q)
    );

    return {
      products: filteredProds,
      customers: filteredCusts,
      quotations: filteredQuotes,
    };
  }, [query, products, customers, quotations]);

  // Combined flat list for keyboard arrow navigation
  const flatResultList = useMemo(() => {
    const list: Array<{
      id: string;
      title: string;
      subtitle: string;
      category: "products" | "customers" | "quotations";
      url: string;
      meta?: string;
      badge?: string;
      badgeColor?: string;
    }> = [];

    if (activeCategory === "all" || activeCategory === "products") {
      filteredResults.products.forEach((p) => {
        list.push({
          id: `prod-${p.id}`,
          title: p.name,
          subtitle: `Loc: ${p.location || "Default Warehouse"} • ${p.category || "General"}`,
          category: "products",
          url: "/products",
          meta: `$${p.sellingPrice.toFixed(2)}`,
          badge: `${p.quantity} in stock`,
          badgeColor: p.quantity <= p.minStock ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"
        });
      });
    }

    if (activeCategory === "all" || activeCategory === "customers") {
      filteredResults.customers.forEach((c) => {
        list.push({
          id: `cust-${c.id}`,
          title: c.name,
          subtitle: `${c.email}${c.address ? ` • ${c.address}` : ""}`,
          category: "customers",
          url: "/customers",
          meta: c.phone || "No phone",
          badge: c.type || "Individual",
          badgeColor: "bg-blue-100 text-blue-800"
        });
      });
    }

    if (activeCategory === "all" || activeCategory === "quotations") {
      filteredResults.quotations.forEach((q) => {
        list.push({
          id: `quote-${q.id}`,
          title: q.quotationNumber,
          subtitle: `Client: ${q.customerName} (${q.date})`,
          category: "quotations",
          url: "/quotations",
          meta: `$${q.total.toFixed(2)}`,
          badge: q.status.toUpperCase(),
          badgeColor: q.status === "Approved" ? "bg-emerald-100 text-emerald-800" : q.status === "Pending" ? "bg-amber-100 text-amber-800" : "bg-rose-100 text-rose-800"
        });
      });
    }

    return list;
  }, [filteredResults, activeCategory]);

  // Reset keyboard selection index when results or category change
  useEffect(() => {
    setSelectedIndex(0);
  }, [query, activeCategory]);

  // Global Keyboard listener (Cmd+K or Ctrl+K or '/')
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsOpen(true);
        setTimeout(() => inputRef.current?.focus(), 50);
      } else if (e.key === "/" && !["INPUT", "TEXTAREA", "SELECT"].includes((e.target as HTMLElement).tagName)) {
        e.preventDefault();
        setIsOpen(true);
        setTimeout(() => inputRef.current?.focus(), 50);
      } else if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Keyboard navigation within search popup
  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < flatResultList.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : flatResultList.length - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (flatResultList[selectedIndex]) {
        handleSelectItem(flatResultList[selectedIndex].url);
      }
    }
  };

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectItem = (url: string) => {
    setIsOpen(false);
    setQuery("");
    navigate(url);
  };

  const totalResultsCount = filteredResults.products.length + filteredResults.customers.length + filteredResults.quotations.length;

  return (
    <div className="relative w-full max-w-xs sm:max-w-md lg:max-w-lg" ref={containerRef}>
      
      {/* Search Input Bar */}
      <div className="relative flex items-center">
        <Search className="absolute left-3.5 text-slate-400 pointer-events-none" size={16} />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleInputKeyDown}
          placeholder="Quick search products, customers, quotes... (⌘K)"
          id="global-search-input"
          className="w-full pl-10 pr-20 py-2 bg-slate-100 hover:bg-slate-100/80 focus:bg-white text-slate-800 text-xs rounded-xl border border-transparent focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all placeholder:text-slate-400 font-medium"
        />

        <div className="absolute right-2.5 flex items-center gap-1">
          {query ? (
            <button
              onClick={() => {
                setQuery("");
                inputRef.current?.focus();
              }}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-md transition-colors"
              title="Clear search"
            >
              <X size={14} />
            </button>
          ) : (
            <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono font-bold text-slate-400 bg-white border border-slate-200 rounded-md shadow-2xs">
              <span className="text-[11px]">⌘</span>K
            </kbd>
          )}
        </div>
      </div>

      {/* Popover Results Dropdown */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl shadow-2xl border border-slate-200/90 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          
          {/* Category Filter Tabs */}
          <div className="p-2 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between text-xs">
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
              <button
                onClick={() => setActiveCategory("all")}
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                  activeCategory === "all"
                    ? "bg-slate-900 text-white shadow-xs"
                    : "text-slate-600 hover:bg-slate-200/60"
                }`}
              >
                All ({totalResultsCount})
              </button>
              <button
                onClick={() => setActiveCategory("products")}
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] flex items-center gap-1 transition-all cursor-pointer ${
                  activeCategory === "products"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-slate-600 hover:bg-slate-200/60"
                }`}
              >
                <Package size={12} />
                <span>Products ({filteredResults.products.length})</span>
              </button>
              <button
                onClick={() => setActiveCategory("customers")}
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] flex items-center gap-1 transition-all cursor-pointer ${
                  activeCategory === "customers"
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "text-slate-600 hover:bg-slate-200/60"
                }`}
              >
                <Users size={12} />
                <span>Customers ({filteredResults.customers.length})</span>
              </button>
              <button
                onClick={() => setActiveCategory("quotations")}
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] flex items-center gap-1 transition-all cursor-pointer ${
                  activeCategory === "quotations"
                    ? "bg-purple-600 text-white shadow-xs"
                    : "text-slate-600 hover:bg-slate-200/60"
                }`}
              >
                <FileText size={12} />
                <span>Quotations ({filteredResults.quotations.length})</span>
              </button>
            </div>

            {isLoading && (
              <div className="flex items-center gap-1 text-slate-400 font-mono text-[10px] shrink-0 pl-2">
                <Loader2 size={12} className="animate-spin text-blue-600" />
                <span>Searching...</span>
              </div>
            )}
          </div>

          {/* Results List Viewport */}
          <div className="max-h-80 overflow-y-auto p-2 divide-y divide-slate-100 custom-scrollbar">
            {flatResultList.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <div className="p-3 bg-slate-100 text-slate-400 rounded-full w-10 h-10 mx-auto flex items-center justify-center">
                  <Search size={18} />
                </div>
                <p className="text-sm font-bold text-slate-800">No matching records found</p>
                <p className="text-xs text-slate-400 max-w-xs mx-auto">
                  Try searching for product names, customer emails, SKU codes, or quotation numbers.
                </p>
              </div>
            ) : (
              flatResultList.map((item, index) => {
                const isSelected = index === selectedIndex;
                const isProd = item.category === "products";
                const isCust = item.category === "customers";

                return (
                  <div
                    key={item.id}
                    onClick={() => handleSelectItem(item.url)}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={`p-2.5 rounded-xl flex items-center justify-between cursor-pointer transition-all ${
                      isSelected ? "bg-blue-50/80 border border-blue-200/80 shadow-2xs" : "hover:bg-slate-50 border border-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`p-2 rounded-lg shrink-0 ${
                        isProd 
                          ? "bg-blue-100/80 text-blue-700" 
                          : isCust 
                          ? "bg-indigo-100/80 text-indigo-700" 
                          : "bg-purple-100/80 text-purple-700"
                      }`}>
                        {isProd ? <Package size={16} /> : isCust ? <Users size={16} /> : <FileText size={16} />}
                      </div>

                      <div className="min-w-0 space-y-0.5">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold text-slate-900 truncate">{item.title}</p>
                          {item.badge && (
                            <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md ${item.badgeColor}`}>
                              {item.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 truncate">{item.subtitle}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 ml-2">
                      <span className="font-mono font-bold text-xs text-slate-700">{item.meta}</span>
                      <div className={`p-1 rounded-md transition-all ${isSelected ? "text-blue-600 bg-blue-100" : "text-slate-300"}`}>
                        <ArrowRight size={14} />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Keyboard Navigation Shortcuts */}
          <div className="px-3 py-2 bg-slate-50 border-t border-slate-100 text-[10px] text-slate-400 font-mono flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 bg-white border border-slate-200 rounded">↑↓</kbd> Navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 bg-white border border-slate-200 rounded">↵</kbd> Select
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 bg-white border border-slate-200 rounded">ESC</kbd> Close
              </span>
            </div>
            <span className="font-bold text-slate-500">Acu-invent Search</span>
          </div>

        </div>
      )}

    </div>
  );
};
