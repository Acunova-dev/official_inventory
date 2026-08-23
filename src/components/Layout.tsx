import React, { useState, createContext, useContext, useRef, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import logoImg from "../pic.png";
import { useAuth } from "../context/AuthContext";
import { hasPermission, Permission, ROLE_DEFINITIONS, AppRole } from "../types/rbac";
import { 
  LayoutDashboard, 
  Package, 
  Users, 
  Truck, 
  FileText, 
  Receipt, 
  FileCheck,
  Activity, 
  BarChart3,
  UserCog, 
  Settings, 
  ShieldCheck,
  LogOut, 
  Menu, 
  X, 
  ShieldAlert,
  Sparkles,
  Info,
  ScanLine,
  Wallet,
  Building2,
  Coins,
  CreditCard,
  ShoppingBag,
  PackageCheck,
  ChevronDown,
  Shield,
  Plus,
  ArrowLeft,
  Store,
  Layers,
  ChevronRight,
  TrendingUp,
  FolderSync,
  QrCode,
  Ticket,
  CheckCircle2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { GlobalSearch } from "./GlobalSearch";
import { DocumentOcrModal } from "./DocumentOcrModal";

// Light Toast Notification Context for quick feedback
interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info" | "warning";
}

interface ToastContextType {
  showToast: (message: string, type?: "success" | "error" | "info" | "warning") => void;
  addToast: (message: string, type?: "success" | "error" | "info" | "warning") => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within ToastProvider");
  return context;
};

interface NavItem {
  name: string;
  path: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  permission: Permission;
  badge?: string;
  badgeColor?: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isOcrModalOpen, setIsOcrModalOpen] = useState(false);
  const [isQuickActionsOpen, setIsQuickActionsOpen] = useState(false);
  const quickActionsRef = useRef<HTMLDivElement>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Detect whether we are in the dedicated Financial / Accounts workspace
  const isAccountsWorkspace = location.pathname.startsWith("/financial");

  // Close quick actions dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (quickActionsRef.current && !quickActionsRef.current.contains(event.target as Node)) {
        setIsQuickActionsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const showToast = (message: string, type: "success" | "error" | "info" | "warning" = "info") => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  // Main Operations & Supply Sections
  const operationalSections: NavSection[] = [
    {
      title: "OPERATIONS",
      items: [
        { name: "Quotations", path: "/quotations", icon: FileText, permission: "sales.view" },
        { name: "Invoices", path: "/invoices", icon: FileCheck, permission: "sales.view" },
        { name: "Receipts", path: "/receipts", icon: Receipt, permission: "receipts.view" },
        { name: "Customers", path: "/customers", icon: Users, permission: "sales.view" },
      ]
    },
    {
      title: "INVENTORY & SUPPLY",
      items: [
        { name: "Products", path: "/products", icon: Package, permission: "products.view" },
        { name: "Stock Levels", path: "/inventory", icon: Activity, permission: "stock.view" },
        { name: "Purchase Orders", path: "/purchasing/orders", icon: ShoppingBag, permission: "purchasing.view" },
        { name: "Goods Received (GRN)", path: "/purchasing/grn", icon: PackageCheck, permission: "purchasing.receive" },
        { name: "Suppliers", path: "/suppliers", icon: Truck, permission: "purchasing.view" },
      ]
    },
    {
      title: "FULFILMENT",
      items: [
        { name: "Fulfilment Hub", path: "/fulfilment", icon: Store, permission: "fulfilment.view" },
        { name: "Orders to Prepare", path: "/fulfilment/orders", icon: Package, permission: "fulfilment.prepare" },
        { name: "Pick & Drop Batches", path: "/fulfilment/batches", icon: Truck, permission: "fulfilment.dispatch" },
        { name: "Collection Desk (Scan QR)", path: "/fulfilment/scan", icon: QrCode, permission: "fulfilment.collect", badge: "Scan", badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200" },
        { name: "Collection Tickets", path: "/fulfilment/collections", icon: Ticket, permission: "fulfilment.view" },
      ]
    },
    {
      title: "REPORTS & ANALYTICS",
      items: [
        { name: "Inventory Insights", path: "/inventory-insights", icon: BarChart3, permission: "reports.view.inventory" },
      ]
    },
    {
      title: "SYSTEM & ADMIN",
      items: [
        { name: "Users & Roles", path: "/users", icon: UserCog, permission: "users.manage" },
        { name: "Security Audit Logs", path: "/system-logs", icon: ShieldCheck, permission: "system_logs.view" },
        { name: "System Settings", path: "/settings", icon: Settings, permission: "settings.manage" },
      ]
    }
  ];

  // Dedicated Accounts Workspace Navigation Items
  const accountsNavItems: NavItem[] = [
    { name: "Financial Overview", path: "/financial", icon: LayoutDashboard, permission: "financials.view" },
    { name: "Cash Book Ledger", path: "/financial/cashbook", icon: Wallet, permission: "financials.view" },
    { name: "Bank Accounts", path: "/financial/banks", icon: Building2, permission: "financials.view" },
    { name: "Petty Cash Fund", path: "/financial/petty-cash", icon: Coins, permission: "financials.view" },
    { name: "Payment Vouchers", path: "/financial/payment-vouchers", icon: CreditCard, permission: "financials.view" },
    { name: "Financial Reports & P&L", path: "/financial/reports", icon: BarChart3, permission: "reports.view.financial" },
  ];

  const currentRoleDef = ROLE_DEFINITIONS[user?.role as AppRole] || ROLE_DEFINITIONS["Sales Person"];
  const canAccessAccounts = hasPermission(user?.role, "financials.view", user?.customPermissions);

  return (
    <ToastContext.Provider value={{ showToast, addToast: showToast }}>
      <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
        
        {/* Top Navbar */}
        <header className="bg-white border-b border-slate-200 h-16 fixed top-0 left-0 right-0 z-30 flex items-center justify-between px-4 sm:px-6 shadow-xs">
          <div className="flex items-center gap-3 sm:gap-4">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors focus:outline-hidden cursor-pointer"
              aria-label="Toggle Sidebar"
              id="btn-sidebar-toggle"
            >
              {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            
            <Link to="/" className="flex items-center gap-3">
              <img src={logoImg} alt="Acu-invent Logo" className="h-8 w-auto object-contain rounded-md" />
              <div className="hidden sm:block">
                <span className="font-extrabold text-base text-slate-900 tracking-tight block leading-tight">
                  Acu-invent
                </span>
                <span className="font-medium text-slate-400 text-[10px] uppercase tracking-wider block">
                  {isAccountsWorkspace ? "Financials Workspace" : "Operations Suite"}
                </span>
              </div>
            </Link>
          </div>

          {/* Global Search Bar */}
          <div className="flex-1 max-w-md mx-2 sm:mx-4">
            <GlobalSearch />
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            
            {/* Quick Action (+ New) Dropdown */}
            <div className="relative" ref={quickActionsRef}>
              <button
                type="button"
                onClick={() => setIsQuickActionsOpen(!isQuickActionsOpen)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded-xl transition-all shadow-xs cursor-pointer"
                id="btn-quick-actions"
                title="Quick Daily Operations"
              >
                <Plus size={15} />
                <span className="hidden md:inline">Quick Action</span>
                <ChevronDown size={13} className={`text-slate-400 transition-transform ${isQuickActionsOpen ? "rotate-180" : ""}`} />
              </button>

              {isQuickActionsOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 py-2 divide-y divide-slate-100 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Daily Sales & Operations
                  </div>
                  <div className="py-1">
                    <button
                      onClick={() => { setIsQuickActionsOpen(false); navigate("/quotations", { state: { openCreateModal: true } }); }}
                      className="w-full text-left px-3 py-2 text-xs font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-700 flex items-center gap-2.5 transition-colors cursor-pointer"
                    >
                      <FileText size={15} className="text-indigo-600" />
                      New Quotation
                    </button>
                    <button
                      onClick={() => { setIsQuickActionsOpen(false); navigate("/invoices", { state: { openCreateModal: true } }); }}
                      className="w-full text-left px-3 py-2 text-xs font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-700 flex items-center gap-2.5 transition-colors cursor-pointer"
                    >
                      <FileCheck size={15} className="text-blue-600" />
                      New Tax Invoice
                    </button>
                    <button
                      onClick={() => { setIsQuickActionsOpen(false); navigate("/receipts"); }}
                      className="w-full text-left px-3 py-2 text-xs font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-700 flex items-center gap-2.5 transition-colors cursor-pointer"
                    >
                      <Receipt size={15} className="text-emerald-600" />
                      Record Sales Receipt
                    </button>
                  </div>

                  <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Fulfilment & Dispatch
                  </div>
                  <div className="py-1">
                    <button
                      onClick={() => { setIsQuickActionsOpen(false); navigate("/fulfilment/scan"); }}
                      className="w-full text-left px-3 py-2 text-xs font-bold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 flex items-center gap-2.5 transition-colors cursor-pointer"
                    >
                      <QrCode size={15} className="text-emerald-600" />
                      Scan Collection QR
                    </button>
                    <button
                      onClick={() => { setIsQuickActionsOpen(false); navigate("/fulfilment/orders"); }}
                      className="w-full text-left px-3 py-2 text-xs font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-700 flex items-center gap-2.5 transition-colors cursor-pointer"
                    >
                      <Package size={15} className="text-blue-600" />
                      Prepare Customer Orders
                    </button>
                    <button
                      onClick={() => { setIsQuickActionsOpen(false); navigate("/fulfilment/batches"); }}
                      className="w-full text-left px-3 py-2 text-xs font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-700 flex items-center gap-2.5 transition-colors cursor-pointer"
                    >
                      <Truck size={15} className="text-purple-600" />
                      New Dispatch Batch
                    </button>
                  </div>

                  <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Inventory & Purchasing
                  </div>
                  <div className="py-1">
                    <button
                      onClick={() => { setIsQuickActionsOpen(false); navigate("/purchasing/orders"); }}
                      className="w-full text-left px-3 py-2 text-xs font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-700 flex items-center gap-2.5 transition-colors cursor-pointer"
                    >
                      <ShoppingBag size={15} className="text-amber-600" />
                      New Purchase Order
                    </button>
                    <button
                      onClick={() => { setIsQuickActionsOpen(false); navigate("/purchasing/grn"); }}
                      className="w-full text-left px-3 py-2 text-xs font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-700 flex items-center gap-2.5 transition-colors cursor-pointer"
                    >
                      <PackageCheck size={15} className="text-teal-600" />
                      Receive Goods (GRN)
                    </button>
                    <button
                      onClick={() => { setIsQuickActionsOpen(false); navigate("/products"); }}
                      className="w-full text-left px-3 py-2 text-xs font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-700 flex items-center gap-2.5 transition-colors cursor-pointer"
                    >
                      <Package size={15} className="text-slate-600" />
                      Add Product SKU
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* OCR Document Scanner */}
            <button
              type="button"
              onClick={() => setIsOcrModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-extrabold text-xs rounded-xl border border-blue-200 transition-all shadow-2xs shrink-0 cursor-pointer"
              title="Upload document or photo to extract text with Gemini Pro"
              id="btn-header-ocr-scan"
            >
              <ScanLine size={15} className="text-blue-600" />
              <span className="hidden sm:inline">OCR Scan</span>
            </button>

            {/* System Role Badge */}
            <div 
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-xs font-bold ${currentRoleDef?.badgeColor || 'bg-blue-50 text-blue-700 border-blue-200'}`}
              title="Assigned System Role"
            >
              <Shield size={13} className="shrink-0" />
              <span className="hidden md:inline font-mono uppercase tracking-wider">{user?.role || "Role"}</span>
            </div>

            <div className="hidden md:block h-8 w-[1px] bg-slate-200 mx-1"></div>

            {/* User Profile */}
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center rounded-full font-bold text-sm shadow-xs">
                {user?.name ? user.name.split(" ").map(n => n[0]).join("") : "U"}
              </div>
              <div className="hidden lg:block text-left">
                <p className="text-xs font-extrabold text-slate-900 leading-tight">{user?.name}</p>
                <p className="text-[11px] text-slate-400 truncate max-w-[130px] font-mono">{user?.email}</p>
              </div>
            </div>

            {/* Logout */}
            <button 
              onClick={handleLogout}
              className="p-2 rounded-lg text-red-500 hover:bg-red-50 hover:text-red-700 transition-all focus:outline-hidden cursor-pointer"
              title="Sign Out"
              id="btn-logout"
            >
              <LogOut size={18} />
            </button>
          </div>
        </header>

        {/* Workspace Shell */}
        <div className="flex flex-1 pt-16 min-h-screen">
          
          {/* Drawer / Sidebar */}
          <aside 
            className={`bg-white border-r border-slate-200 fixed top-16 bottom-0 left-0 z-20 transition-all duration-300 shadow-xs flex flex-col justify-between ${
              isSidebarOpen ? "w-64" : "w-0 -translate-x-64 lg:w-16 lg:translate-x-0"
            }`}
          >
            <div className="py-3 overflow-y-auto overflow-x-hidden flex-1 px-3 space-y-4">
              
              {/* Workspace Switcher Header */}
              {isSidebarOpen ? (
                <div className="pt-1 px-1">
                  {isAccountsWorkspace ? (
                    <div className="bg-gradient-to-r from-amber-500/10 to-indigo-500/10 border border-amber-200/80 rounded-2xl p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                          <Wallet size={13} className="text-amber-600" />
                          Accounts Workspace
                        </span>
                      </div>
                      <Link
                        to="/"
                        className="flex items-center justify-center gap-2 w-full py-1.5 px-3 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold rounded-xl border border-slate-200 shadow-2xs transition-all"
                      >
                        <ArrowLeft size={13} />
                        Back to Operations
                      </Link>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between px-2 text-[10px] font-bold text-slate-400 tracking-wider uppercase">
                      <span>Business Workspaces</span>
                      <span className="text-[9px] font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 font-bold">Standard</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-2"></div>
              )}

              {/* Primary Dashboard Link (Only in Operations mode) */}
              {!isAccountsWorkspace && (
                <div>
                  <Link
                    to="/"
                    className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-extrabold transition-all group relative ${
                      location.pathname === "/" 
                        ? "bg-slate-900 text-white shadow-md shadow-slate-900/10" 
                        : "text-slate-700 hover:bg-slate-100 hover:text-slate-950"
                    }`}
                    title={!isSidebarOpen ? "Dashboard" : undefined}
                  >
                    <LayoutDashboard size={17} className={`shrink-0 ${location.pathname === "/" ? 'text-blue-400' : 'text-slate-400 group-hover:text-slate-900'}`} />
                    <span className={`transition-opacity duration-200 ${!isSidebarOpen ? "lg:opacity-0 lg:w-0 overflow-hidden" : "opacity-100"}`}>
                      Dashboard
                    </span>
                  </Link>
                </div>
              )}

              {/* Accounts Workspace Navigation List (Active when in Accounts Mode) */}
              {isAccountsWorkspace ? (
                <div className="space-y-1">
                  <div className="px-2 mb-2">
                    <p className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">Financial Ledgers</p>
                  </div>
                  {accountsNavItems
                    .filter(item => hasPermission(user?.role, item.permission, user?.customPermissions))
                    .map((item) => {
                      const isActive = location.pathname === item.path;
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.name}
                          to={item.path}
                          className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-extrabold transition-all group relative ${
                            isActive 
                              ? "bg-slate-900 text-white shadow-md shadow-slate-900/10" 
                              : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
                          }`}
                          title={!isSidebarOpen ? item.name : undefined}
                        >
                          <Icon size={17} className={`shrink-0 ${isActive ? 'text-amber-400' : 'text-slate-400 group-hover:text-slate-900'}`} />
                          <span className={`transition-opacity duration-200 ${!isSidebarOpen ? "lg:opacity-0 lg:w-0 overflow-hidden" : "opacity-100"}`}>
                            {item.name}
                          </span>
                        </Link>
                      );
                    })}
                </div>
              ) : (
                /* Standard Operations & Supply Sections */
                <div className="space-y-4">
                  {operationalSections.map((section) => {
                    const visibleItems = section.items.filter(item => 
                      hasPermission(user?.role, item.permission, user?.customPermissions)
                    );

                    if (visibleItems.length === 0) return null;

                    return (
                      <div key={section.title} className="space-y-1">
                        {isSidebarOpen && (
                          <div className="px-2 pt-1">
                            <p className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">{section.title}</p>
                          </div>
                        )}

                        <nav className="space-y-0.5">
                          {visibleItems.map((item) => {
                            const isActive = location.pathname === item.path || (item.path !== "/" && location.pathname.startsWith(item.path));
                            const Icon = item.icon;
                            return (
                              <Link
                                key={item.name}
                                to={item.path}
                                className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-extrabold transition-all group relative ${
                                  isActive 
                                    ? "bg-slate-900 text-white shadow-md shadow-slate-900/10" 
                                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
                                }`}
                                title={!isSidebarOpen ? item.name : undefined}
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <Icon size={17} className={`shrink-0 ${isActive ? 'text-blue-400' : 'text-slate-400 group-hover:text-slate-900'}`} />
                                  <span className={`truncate transition-opacity duration-200 ${!isSidebarOpen ? "lg:opacity-0 lg:w-0 overflow-hidden" : "opacity-100"}`}>
                                    {item.name}
                                  </span>
                                </div>
                                {item.badge && isSidebarOpen && (
                                  <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border uppercase ${item.badgeColor || 'bg-slate-100 text-slate-500'}`}>
                                    {item.badge}
                                  </span>
                                )}
                              </Link>
                            );
                          })}
                        </nav>
                      </div>
                    );
                  })}

                  {/* Dedicated ACCOUNTS Workspace Entry Point */}
                  {canAccessAccounts && (
                    <div className="pt-2 border-t border-slate-100">
                      {isSidebarOpen ? (
                        <Link
                          to="/financial"
                          className="block p-3 rounded-2xl bg-gradient-to-r from-slate-900 to-indigo-950 text-white hover:shadow-md transition-all group relative overflow-hidden"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              <div className="p-1.5 bg-amber-500/20 text-amber-300 rounded-lg">
                                <Wallet size={16} />
                              </div>
                              <div>
                                <h4 className="text-xs font-black text-white">Accounts Workspace</h4>
                                <p className="text-[10px] text-slate-400">Cash book, banks & P&L</p>
                              </div>
                            </div>
                            <ChevronRight size={15} className="text-slate-400 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
                          </div>
                        </Link>
                      ) : (
                        <Link
                          to="/financial"
                          className="flex items-center justify-center p-2 rounded-xl text-amber-600 hover:bg-amber-50 transition-all"
                          title="Accounts Workspace"
                        >
                          <Wallet size={18} />
                        </Link>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Sidebar Footer */}
            {isSidebarOpen && (
              <div className="p-3 border-t border-slate-100 bg-slate-50/50 text-[11px] text-slate-400 shrink-0">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-700 truncate">{user?.role}</span>
                  <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0"></span>
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5 truncate font-mono">
                  {isAccountsWorkspace ? "Financial Control Mode" : "Operations Suite"}
                </p>
              </div>
            )}
          </aside>

          {/* Main Content Area */}
          <main 
            className={`flex-1 min-w-0 transition-all duration-300 p-4 sm:p-6 lg:p-8 bg-slate-50/60 overflow-y-auto ${
              isSidebarOpen ? "lg:ml-64" : "lg:ml-16"
            }`}
          >
            {children}
          </main>
        </div>

        {/* Document OCR Extractor Modal */}
        <DocumentOcrModal
          isOpen={isOcrModalOpen}
          onClose={() => setIsOcrModalOpen(false)}
        />

        {/* Toast Canvas Notifications */}
        <div className="fixed bottom-5 right-5 z-50 space-y-2 pointer-events-none max-w-sm w-full">
          <AnimatePresence>
            {toasts.map((toast) => (
              <motion.div
                key={toast.id}
                initial={{ opacity: 0, y: 30, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.2 } }}
                className={`p-4 rounded-xl shadow-lg border flex items-start gap-3 pointer-events-auto ${
                  toast.type === "success" 
                    ? "bg-emerald-50 border-emerald-200 text-emerald-900" 
                    : toast.type === "error" 
                    ? "bg-rose-50 border-rose-200 text-rose-900" 
                    : toast.type === "warning"
                    ? "bg-amber-50 border-amber-200 text-amber-900"
                    : "bg-blue-50 border-blue-200 text-blue-900"
                }`}
              >
                <div className={`mt-0.5 rounded-full p-1 ${
                  toast.type === "success" ? "bg-emerald-100 text-emerald-600" : 
                  toast.type === "error" ? "bg-rose-100 text-rose-600" : 
                  toast.type === "warning" ? "bg-amber-100 text-amber-600" : "bg-blue-100 text-blue-600"
                }`}>
                  {toast.type === "success" ? <Sparkles size={16} /> : 
                   toast.type === "error" ? <ShieldAlert size={16} /> : 
                   toast.type === "warning" ? <ShieldAlert size={16} /> : <Info size={16} />}
                </div>
                <div className="flex-1 text-sm font-medium">
                  {toast.message}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

      </div>
    </ToastContext.Provider>
  );
};
