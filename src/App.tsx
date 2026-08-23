import React from "react";
import { BrowserRouter, Routes, Route, Navigate, Link } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { Layout } from "./components/Layout";
import { Login } from "./pages/Login";
import { Dashboard } from "./pages/Dashboard";
import { Products } from "./pages/Products";
import { Customers } from "./pages/Customers";
import { Suppliers } from "./pages/Suppliers";
import { Quotations } from "./pages/Quotations";
import { Invoices } from "./pages/Invoices";
import { Receipts } from "./pages/Receipts";
import { Inventory } from "./pages/Inventory";
import { InventoryInsights } from "./pages/InventoryInsights";
import { UsersManagement } from "./pages/Users";
import { Settings } from "./pages/Settings";
import { SystemLogs } from "./pages/SystemLogs";
import { FinancialOverviewPage } from "./pages/financial/FinancialOverviewPage";
import { CashBookPage } from "./pages/financial/CashBookPage";
import { BankAccountsPage } from "./pages/financial/BankAccountsPage";
import { PettyCashPage } from "./pages/financial/PettyCashPage";
import { PaymentVouchersPage } from "./pages/financial/PaymentVouchersPage";
import { FinancialReportsPage } from "./pages/financial/FinancialReportsPage";
import { FulfilmentPage } from "./pages/FulfilmentPage";
import { FulfilmentOrdersPage } from "./pages/fulfilment/FulfilmentOrdersPage";
import { PickDropBatchesPage } from "./pages/fulfilment/PickDropBatchesPage";
import { CollectionDeskScanPage } from "./pages/fulfilment/CollectionDeskScanPage";
import { CollectionTicketsPage } from "./pages/fulfilment/CollectionTicketsPage";
import { OrderBookPage } from "./pages/purchasing/OrderBookPage";
import { GoodsReceivedPage } from "./pages/purchasing/GoodsReceivedPage";
import { Loader2 } from "lucide-react";

// Create TanStack Query Client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

import { AccessDenied } from "./pages/AccessDenied";
import { hasPermission, Permission } from "./types/rbac";

// Route Guard component: Checks auth status and permission key
const ProtectedRoute: React.FC<{ 
  children: React.ReactNode; 
  requiredPermission?: Permission;
  moduleName?: string;
  allowedRoles?: string[];
}> = ({ 
  children, 
  requiredPermission,
  moduleName,
  allowedRoles 
}) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4 text-slate-500">
        <Loader2 className="animate-spin text-blue-600" size={36} />
        <p className="text-sm font-semibold font-mono uppercase tracking-widest text-slate-400">Restoring auth session...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.disabled || user.status === "Inactive") {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-center text-white">
        <div className="p-4 bg-rose-500/20 border border-rose-500/40 rounded-full text-rose-400 mb-4">
          <Loader2 className="animate-spin text-rose-400" size={32} />
        </div>
        <h1 className="text-xl font-black">Account Suspended</h1>
        <p className="text-sm text-slate-400 mt-2 max-w-md">
          Your operator account ({user.email}) has been deactivated by a Principal Administrator.
        </p>
        <Link to="/login" className="mt-6 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-bold rounded-xl text-slate-200">
          Sign In with Another Account
        </Link>
      </div>
    );
  }

  // Check role or granular permission
  if (requiredPermission && !hasPermission(user.role, requiredPermission, user.customPermissions)) {
    return (
      <Layout>
        <AccessDenied requiredPermission={requiredPermission} moduleName={moduleName} />
      </Layout>
    );
  }

  if (allowedRoles && !allowedRoles.includes(user.role) && user.role !== "Principal Admin") {
    return (
      <Layout>
        <AccessDenied requiredPermission="restricted_role_scope" moduleName={moduleName} />
      </Layout>
    );
  }

  return <Layout>{children}</Layout>;
};

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Entry Routes */}
            <Route path="/login" element={<Login />} />

            {/* Role Tailored Dashboard */}
            <Route 
              path="/" 
              element={
                <ProtectedRoute requiredPermission="account.view" moduleName="Dashboard">
                  <Dashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/products" 
              element={
                <ProtectedRoute requiredPermission="products.view" moduleName="Product Catalog">
                  <Products />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/customers" 
              element={
                <ProtectedRoute requiredPermission="sales.view" moduleName="Customer Relations">
                  <Customers />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/suppliers" 
              element={
                <ProtectedRoute requiredPermission="purchasing.view" moduleName="Suppliers & Vendors">
                  <Suppliers />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/quotations" 
              element={
                <ProtectedRoute requiredPermission="sales.view" moduleName="Quotations & Proposals">
                  <Quotations />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/invoices" 
              element={
                <ProtectedRoute requiredPermission="sales.view" moduleName="Sales & Tax Invoices">
                  <Invoices />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/receipts" 
              element={
                <ProtectedRoute requiredPermission="receipts.view" moduleName="Sales Receipts & Counter Collections">
                  <Receipts />
                </ProtectedRoute>
              } 
            />

            {/* Financial Overview & Ledgers Workspace */}
            <Route 
              path="/financial" 
              element={
                <ProtectedRoute requiredPermission="financials.view" moduleName="Financial Overview & Hub">
                  <FinancialOverviewPage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/financial/cashbook" 
              element={
                <ProtectedRoute requiredPermission="financials.view" moduleName="Cash Book Drawer">
                  <CashBookPage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/financial/banks" 
              element={
                <ProtectedRoute requiredPermission="financials.view" moduleName="Bank Accounts & Transfers">
                  <BankAccountsPage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/financial/petty-cash" 
              element={
                <ProtectedRoute requiredPermission="financials.view" moduleName="Petty Cash Ledger">
                  <PettyCashPage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/financial/payment-vouchers" 
              element={
                <ProtectedRoute requiredPermission="financials.view" moduleName="Payment Vouchers">
                  <PaymentVouchersPage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/financial/reports" 
              element={
                <ProtectedRoute requiredPermission="reports.view.financial" moduleName="Financial Control Reports">
                  <FinancialReportsPage />
                </ProtectedRoute>
              } 
            />

            {/* Fulfilment & Logistics Workspace */}
            <Route 
              path="/fulfilment" 
              element={
                <ProtectedRoute requiredPermission="fulfilment.view" moduleName="Fulfilment & Distribution Hub">
                  <FulfilmentPage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/fulfilment/orders" 
              element={
                <ProtectedRoute requiredPermission="fulfilment.prepare" moduleName="Fulfilment Orders & Preparation">
                  <FulfilmentOrdersPage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/fulfilment/batches" 
              element={
                <ProtectedRoute requiredPermission="fulfilment.dispatch" moduleName="Pick & Drop Dispatch Batches">
                  <PickDropBatchesPage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/fulfilment/scan" 
              element={
                <ProtectedRoute requiredPermission="fulfilment.collect" moduleName="Collection Desk & Scanner">
                  <CollectionDeskScanPage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/fulfilment/collections" 
              element={
                <ProtectedRoute requiredPermission="fulfilment.view" moduleName="Customer Collection Tickets">
                  <CollectionTicketsPage />
                </ProtectedRoute>
              } 
            />

            {/* Purchasing Routes */}
            <Route 
              path="/purchasing/orders" 
              element={
                <ProtectedRoute requiredPermission="purchasing.view" moduleName="Purchase Order Book">
                  <OrderBookPage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/purchasing/grn" 
              element={
                <ProtectedRoute requiredPermission="purchasing.receive" moduleName="Goods Received Notes (GRN)">
                  <GoodsReceivedPage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/inventory" 
              element={
                <ProtectedRoute requiredPermission="stock.view" moduleName="Stock Levels & Movements">
                  <Inventory />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/inventory-insights" 
              element={
                <ProtectedRoute requiredPermission="reports.view.inventory" moduleName="Inventory Performance Analytics">
                  <InventoryInsights />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/users" 
              element={
                <ProtectedRoute requiredPermission="users.manage" moduleName="User Security Administration">
                  <UsersManagement />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/settings" 
              element={
                <ProtectedRoute requiredPermission="settings.manage" moduleName="System Settings">
                  <Settings />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/system-logs" 
              element={
                <ProtectedRoute requiredPermission="system_logs.view" moduleName="Security Audit Logs">
                  <SystemLogs />
                </ProtectedRoute>
              } 
            />

            {/* Catch/Redirect All Wildcards */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
