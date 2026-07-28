import React, { useState, createContext, useContext } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { 
  LayoutDashboard, 
  Package, 
  Users, 
  Truck, 
  FileText, 
  Receipt, 
  Activity, 
  BarChart3,
  UserCog, 
  Settings, 
  ShieldCheck,
  LogOut, 
  Menu, 
  X, 
  Bell, 
  Sun,
  ShieldAlert,
  Sparkles,
  Info,
  ScanLine
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

  const menuItems = [
    { name: "Dashboard", path: "/", icon: LayoutDashboard, roles: ["Principal Admin", "Staff"] },
    { name: "Products", path: "/products", icon: Package, roles: ["Principal Admin", "Staff"] },
    { name: "Customers", path: "/customers", icon: Users, roles: ["Principal Admin", "Staff"] },
    { name: "Suppliers", path: "/suppliers", icon: Truck, roles: ["Principal Admin", "Staff"] },
    { name: "Quotations", path: "/quotations", icon: FileText, roles: ["Principal Admin", "Staff"] },
    { name: "Receipts", path: "/receipts", icon: Receipt, roles: ["Principal Admin", "Staff"] },
    { name: "Inventory", path: "/inventory", icon: Activity, roles: ["Principal Admin", "Staff"] },
    { name: "Inventory Insights", path: "/inventory-insights", icon: BarChart3, roles: ["Principal Admin", "Staff"] },
    { name: "Users", path: "/users", icon: UserCog, roles: ["Principal Admin"] },
    { name: "System Logs", path: "/system-logs", icon: ShieldCheck, roles: ["Principal Admin", "Staff", "Staff Member"] },
    { name: "Settings", path: "/settings", icon: Settings, roles: ["Principal Admin", "Staff", "Staff Member"] },
  ];

  const allowedItems = menuItems.filter(item => item.roles.includes(user?.role || ""));

  return (
    <ToastContext.Provider value={{ showToast }}>
      <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
        
        {/* Top Navbar */}
        <header className="bg-white border-b border-slate-200 h-16 fixed top-0 left-0 right-0 z-30 flex items-center justify-between px-4 sm:px-6 shadow-xs">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors focus:outline-hidden"
              aria-label="Toggle Sidebar"
              id="btn-sidebar-toggle"
            >
              {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            
            <Link to="/" className="flex items-center gap-2">
              <span className="p-1.5 bg-blue-600 rounded-lg text-white font-black tracking-wider shadow-md shadow-blue-200 text-sm">VS</span>
              <span className="font-bold text-lg text-slate-900 tracking-tight hidden sm:inline-block">VoltSync <span className="font-medium text-slate-500 text-sm">ERP</span></span>
            </Link>
          </div>

          {/* Global Search Bar */}
          <div className="flex-1 max-w-md mx-2 sm:mx-4">
            <GlobalSearch />
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsOcrModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-extrabold text-xs rounded-xl border border-blue-200 transition-all shadow-2xs shrink-0"
              title="Upload photo or document to extract text with Gemini 3.1 Pro"
              id="btn-header-ocr-scan"
            >
              <ScanLine size={15} className="text-blue-600" />
              <span className="hidden sm:inline">Scan Document Photo</span>
            </button>

            <div className="hidden md:flex flex-col text-right">
              <span className="text-xs font-semibold text-blue-600 uppercase tracking-widest">{user?.role}</span>
              <span className="text-xs text-slate-500 font-mono">Tenant ID: VOLTSYNC-CORP</span>
            </div>

            <div className="h-8 w-[1px] bg-slate-200 mr-1 hidden md:block"></div>

            <div className="flex items-center gap-3">
              <div className="h-9 w-9 bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center rounded-full font-bold text-sm shadow-xs">
                {user?.name ? user.name.split(" ").map(n => n[0]).join("") : "U"}
              </div>
              <div className="hidden lg:block text-left">
                <p className="text-sm font-semibold text-slate-900 leading-tight">{user?.name}</p>
                <p className="text-xs text-slate-400 truncate max-w-[150px]">{user?.email}</p>
              </div>
            </div>

            <button 
              onClick={handleLogout}
              className="p-2 rounded-lg text-red-500 hover:bg-red-50 hover:text-red-700 transition-all focus:outline-hidden"
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
            <div className="py-6 overflow-y-auto overflow-x-hidden flex-1 px-3 space-y-1">
              <div className="px-3 mb-4 hidden lg:block">
                {isSidebarOpen ? (
                  <p className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">Navigation Hub</p>
                ) : (
                  <div className="h-4"></div>
                )}
              </div>

              <nav className="space-y-1.5">
                {allowedItems.map((item) => {
                  const isActive = location.pathname === item.path || (item.path !== "/" && location.pathname.startsWith(item.path));
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.name}
                      to={item.path}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group relative ${
                        isActive 
                          ? "bg-slate-900 text-white shadow-md shadow-slate-900/10" 
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
                      }`}
                      title={!isSidebarOpen ? item.name : undefined}
                    >
                      <Icon size={18} className={`shrink-0 ${isActive ? 'text-blue-400' : 'text-slate-400 group-hover:text-slate-900'}`} />
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
              <div className="p-4 border-t border-slate-100 bg-slate-50/50 text-xs text-slate-400 shrink-0 font-mono">
                <p>© 2026 VoltSync Ltd.</p>
                <p className="text-[10px] text-slate-300 mt-1">Status: Fully Operational</p>
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
