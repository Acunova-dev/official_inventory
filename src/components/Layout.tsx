import React, { useState, createContext, useContext } from "react";
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
  UserCheck,
  ChevronDown,
  Shield
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { GlobalSearch } from "./GlobalSearch";
import { DocumentOcrModal } from "./DocumentOcrModal";

// Light Toast Notification Context for quick feedbacks
interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}

interface ToastContextType {
  showToast: (message: string, type: "success" | "error" | "info") => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within ToastProvider");
  return context;
};

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isOcrModalOpen, setIsOcrModalOpen] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (message: string, type: "success" | "error" | "info") => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const menuItems: Array<{
    name: string;
    path: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
    permission: Permission;
  }> = [
    { name: "Dashboard", path: "/", icon: LayoutDashboard, permission: "account.view" },
    { name: "Products", path: "/products", icon: Package, permission: "products.view" },
    { name: "Customers", path: "/customers", icon: Users, permission: "sales.view" },
    { name: "Suppliers", path: "/suppliers", icon: Truck, permission: "purchasing.view" },
    { name: "Quotations", path: "/quotations", icon: FileText, permission: "sales.view" },
    { name: "Invoices", path: "/invoices", icon: FileCheck, permission: "sales.view" },
    { name: "Receipts", path: "/receipts", icon: Receipt, permission: "receipts.view" },
    
    // Financial Books Section
    { name: "Cash Book", path: "/financial/cashbook", icon: Wallet, permission: "financials.view" },
    { name: "Bank Accounts", path: "/financial/banks", icon: Building2, permission: "financials.view" },
    { name: "Petty Cash", path: "/financial/petty-cash", icon: Coins, permission: "financials.view" },
    { name: "Payment Vouchers", path: "/financial/payment-vouchers", icon: CreditCard, permission: "financials.view" },
    { name: "Financial Control", path: "/financial/reports", icon: BarChart3, permission: "reports.view.financial" },

    // Purchasing Section
    { name: "Order Book (PO)", path: "/purchasing/orders", icon: ShoppingBag, permission: "purchasing.view" },
    { name: "Goods Received (GRN)", path: "/purchasing/grn", icon: PackageCheck, permission: "purchasing.receive" },

    { name: "Inventory", path: "/inventory", icon: Activity, permission: "stock.view" },
    { name: "Inventory Insights", path: "/inventory-insights", icon: BarChart3, permission: "reports.view.inventory" },
    { name: "Users", path: "/users", icon: UserCog, permission: "users.manage" },
    { name: "System Logs", path: "/system-logs", icon: ShieldCheck, permission: "system_logs.view" },
    { name: "Settings", path: "/settings", icon: Settings, permission: "settings.manage" },
  ];

  // Dynamically filter menu items using RBAC permission evaluations
  const allowedItems = menuItems.filter(item => 
    hasPermission(user?.role, item.permission, user?.customPermissions)
  );

  const currentRoleDef = ROLE_DEFINITIONS[user?.role as AppRole] || ROLE_DEFINITIONS["Sales Person"];

  return (
    <ToastContext.Provider value={{ showToast }}>
      <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
        
        {/* Top Navbar */}
        <header className="bg-white border-b border-slate-200 h-16 fixed top-0 left-0 right-0 z-30 flex items-center justify-between px-4 sm:px-6 shadow-xs">
          <div className="flex items-center gap-4">
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
              <span className="font-extrabold text-lg text-slate-900 tracking-tight hidden sm:inline-block">
                Acu-invent <span className="font-medium text-slate-500 text-xs">Inventory Manager</span>
              </span>
            </Link>
          </div>

          {/* Global Search Bar */}
          <div className="flex-1 max-w-md mx-2 sm:mx-4">
            <GlobalSearch />
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => setIsOcrModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-extrabold text-xs rounded-xl border border-blue-200 transition-all shadow-2xs shrink-0 cursor-pointer"
              title="Upload photo or document to extract text with Gemini Pro"
              id="btn-header-ocr-scan"
            >
              <ScanLine size={15} className="text-blue-600" />
              <span className="hidden sm:inline">Scan Photo</span>
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

            <div className="flex items-center gap-2">
              <div className="h-9 w-9 bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center rounded-full font-bold text-sm shadow-xs">
                {user?.name ? user.name.split(" ").map(n => n[0]).join("") : "U"}
              </div>
              <div className="hidden lg:block text-left">
                <p className="text-xs font-extrabold text-slate-900 leading-tight">{user?.name}</p>
                <p className="text-[11px] text-slate-400 truncate max-w-[130px] font-mono">{user?.email}</p>
              </div>
            </div>

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

        {/* Sidebar Container */}
        <div className="flex flex-1 pt-16 min-h-screen">
          
          {/* Drawer Sidebar */}
          <aside 
            className={`bg-white border-r border-slate-200 fixed top-16 bottom-0 left-0 z-20 transition-all duration-300 shadow-xs flex flex-col justify-between ${
              isSidebarOpen ? "w-64" : "w-0 -translate-x-64 lg:w-16 lg:translate-x-0"
            }`}
          >
            <div className="py-4 overflow-y-auto overflow-x-hidden flex-1 px-3 space-y-1">
              <div className="px-3 mb-2 hidden lg:block">
                {isSidebarOpen ? (
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">Role Modules</p>
                    <span className="text-[10px] font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-500 font-bold">{allowedItems.length} active</span>
                  </div>
                ) : (
                  <div className="h-4"></div>
                )}
              </div>

              <nav className="space-y-1">
                {allowedItems.map((item) => {
                  const isActive = location.pathname === item.path || (item.path !== "/" && location.pathname.startsWith(item.path));
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
                      <Icon size={17} className={`shrink-0 ${isActive ? 'text-blue-400' : 'text-slate-400 group-hover:text-slate-900'}`} />
                      <span className={`transition-opacity duration-200 ${!isSidebarOpen ? "lg:opacity-0 lg:w-0 overflow-hidden" : "opacity-100"}`}>
                        {item.name}
                      </span>
                      {!isSidebarOpen && (
                        <div className="absolute left-16 bg-slate-900 text-white text-xs py-1.5 px-2.5 rounded-md opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap shadow-md">
                          {item.name}
                        </div>
                      )}
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* Sidebar Footer */}
            {isSidebarOpen && (
              <div className="p-3 border-t border-slate-100 bg-slate-50/50 text-[11px] text-slate-400 shrink-0">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-700">{user?.role}</span>
                  <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5 truncate font-mono">Scope: {allowedItems.length} module permissions</p>
              </div>
            )}
          </aside>

          {/* Main Space */}
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
                    : "bg-blue-50 border-blue-200 text-blue-900"
                }`}
              >
                <div className={`mt-0.5 rounded-full p-1 ${
                  toast.type === "success" ? "bg-emerald-100 text-emerald-600" : toast.type === "error" ? "bg-rose-100 text-rose-600" : "bg-blue-100 text-blue-600"
                }`}>
                  {toast.type === "success" ? <Sparkles size={16} /> : toast.type === "error" ? <ShieldAlert size={16} /> : <Info size={16} />}
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
