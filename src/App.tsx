import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { Layout } from "./components/Layout";
import { Login } from "./pages/Login";
import { Dashboard } from "./pages/Dashboard";
import { Products } from "./pages/Products";
import { Customers } from "./pages/Customers";
import { Suppliers } from "./pages/Suppliers";
import { Quotations } from "./pages/Quotations";
import { Receipts } from "./pages/Receipts";
import { Inventory } from "./pages/Inventory";
import { InventoryInsights } from "./pages/InventoryInsights";
import { UsersManagement } from "./pages/Users";
import { Settings } from "./pages/Settings";
import { SystemLogs } from "./pages/SystemLogs";
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

// Route Guard component: Checks auth status and role
const ProtectedRoute: React.FC<{ children: React.ReactNode; allowedRoles?: string[] }> = ({ 
  children, 
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

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
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

            {/* Protected Enterprise Routes */}
            <Route 
              path="/" 
              element={
                <ProtectedRoute allowedRoles={["Principal Admin", "Staff Member"]}>
                  <Dashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/products" 
              element={
                <ProtectedRoute allowedRoles={["Principal Admin", "Staff Member"]}>
                  <Products />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/customers" 
              element={
                <ProtectedRoute allowedRoles={["Principal Admin", "Staff Member"]}>
                  <Customers />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/suppliers" 
              element={
                <ProtectedRoute allowedRoles={["Principal Admin", "Staff Member"]}>
                  <Suppliers />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/quotations" 
              element={
                <ProtectedRoute allowedRoles={["Principal Admin", "Staff Member"]}>
                  <Quotations />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/receipts" 
              element={
                <ProtectedRoute allowedRoles={["Principal Admin", "Staff Member"]}>
                  <Receipts />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/inventory" 
              element={
                <ProtectedRoute allowedRoles={["Principal Admin", "Staff Member"]}>
                  <Inventory />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/inventory-insights" 
              element={
                <ProtectedRoute allowedRoles={["Principal Admin", "Staff Member"]}>
                  <InventoryInsights />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/users" 
              element={
                <ProtectedRoute allowedRoles={["Principal Admin"]}>
                  <UsersManagement />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/settings" 
              element={
                <ProtectedRoute allowedRoles={["Principal Admin", "Staff Member"]}>
                  <Settings />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/system-logs" 
              element={
                <ProtectedRoute allowedRoles={["Principal Admin", "Staff Member"]}>
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
