import axios from "axios";
import { 
  AuthResponse, 
  Product, 
  ProductResponse, 
  Customer, 
  Supplier, 
  User, 
  Quotation, 
  Receipt, 
  DashboardSummary, 
  RecentActivity,
  InventoryAlertsResponse,
  StockAlertItem,
  CompanySettings,
  InsightsFilterParams,
  InventoryInsightsResponse,
  DetailedProductView,
  SystemLog,
  SystemLogsResponse,
  DocumentAnalysisResult
} from "../types";

// Fallback relative path allows the Vite server proxying to handle same-origin seamlessly
const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || "/api/v1";

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Configure authorization token injection
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("volt_auth_token");
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

import { dummyAuthApi } from "./dummyAuthApi";

// Central URL API requests
export const authService = {
  login: async (credentials: { email: string; password?: string }) => {
    return dummyAuthApi.login(credentials);
  },
  getMe: async () => {
    return dummyAuthApi.getMe();
  },
};

export const dashboardService = {
  getSummary: async (): Promise<DashboardSummary> => {
    const response = await api.get<DashboardSummary>("/dashboard/summary");
    return response.data;
  },
  getActivity: async (): Promise<RecentActivity> => {
    const response = await api.get<RecentActivity>("/dashboard/activity");
    return response.data;
  },
  getAlerts: async (params?: { multiplier?: number }): Promise<InventoryAlertsResponse> => {
    const response = await api.get<InventoryAlertsResponse>("/dashboard/alerts", { params });
    return response.data;
  },
};

export const productService = {
  getAll: async (params?: { search?: string; status?: string; sortBy?: string; order?: string }): Promise<ProductResponse> => {
    const response = await api.get<ProductResponse>("/products", { params });
    return response.data;
  },
  getOne: async (id: string): Promise<Product> => {
    const response = await api.get<Product>(`/products/${id}`);
    return response.data;
  },
  create: async (data: Omit<Product, "id" | "status">): Promise<Product> => {
    const response = await api.post<Product>("/products", data);
    return response.data;
  },
  update: async (id: string, data: Partial<Product>): Promise<Product> => {
    const response = await api.put<Product>(`/products/${id}`, data);
    return response.data;
  },
  delete: async (id: string): Promise<{ message: string; product: Product }> => {
    const response = await api.delete<{ message: string; product: Product }>(`/products/${id}`);
    return response.data;
  },
  restock: async (id: string, data: { addQuantity: number; newMinStock?: number }): Promise<{ message: string; product: Product }> => {
    const response = await api.post<{ message: string; product: Product }>(`/products/${id}/restock`, data);
    return response.data;
  },
  batchDelete: async (ids: string[]): Promise<{ message: string; deletedCount: number }> => {
    const response = await api.post<{ message: string; deletedCount: number }>("/products/batch-delete", { ids });
    return response.data;
  },
  batchUpdateStock: async (data: { ids: string[]; mode: "set" | "add" | "minStock"; value: number }): Promise<{ message: string; updatedCount: number }> => {
    const response = await api.post<{ message: string; updatedCount: number }>("/products/batch-update-stock", data);
    return response.data;
  },
};

export const customerService = {
  getAll: async (search?: string): Promise<Customer[]> => {
    const response = await api.get<Customer[]>("/customers", { params: { search } });
    return response.data;
  },
  create: async (data: Omit<Customer, "id">): Promise<Customer> => {
    const response = await api.post<Customer>("/customers", data);
    return response.data;
  },
  update: async (id: string, data: Partial<Customer>): Promise<Customer> => {
    const response = await api.put<Customer>(`/customers/${id}`, data);
    return response.data;
  },
  delete: async (id: string): Promise<any> => {
    const response = await api.delete(`/customers/${id}`);
    return response.data;
  },
};

export const supplierService = {
  getAll: async (): Promise<Supplier[]> => {
    const response = await api.get<Supplier[]>("/suppliers");
    return response.data;
  },
  create: async (data: Omit<Supplier, "id">): Promise<Supplier> => {
    const response = await api.post<Supplier>("/suppliers", data);
    return response.data;
  },
  update: async (id: string, data: Partial<Supplier>): Promise<Supplier> => {
    const response = await api.put<Supplier>(`/suppliers/${id}`, data);
    return response.data;
  },
  delete: async (id: string): Promise<any> => {
    const response = await api.delete(`/suppliers/${id}`);
    return response.data;
  },
};

export const quotationService = {
  getAll: async (): Promise<Quotation[]> => {
    const response = await api.get<Quotation[]>("/quotations");
    return response.data;
  },
  calculate: async (payload: { items: Array<{ productId: string; quantity: number }>; discountRate: number; taxRate?: number }): Promise<Omit<Quotation, "id" | "quotationNumber" | "customerId" | "customerName" | "customerEmail" | "date" | "expiryDate" | "status">> => {
    const response = await api.post("/quotations/calculate", payload);
    return response.data;
  },
  create: async (payload: { customerId: string; items: Array<{ productId: string; quantity: number }>; discountRate: number; taxRate?: number; notes?: string; status?: string }): Promise<Quotation> => {
    const response = await api.post<Quotation>("/quotations", payload);
    return response.data;
  },
  getOne: async (id: string): Promise<Quotation> => {
    const response = await api.get<Quotation>(`/quotations/${id}`);
    return response.data;
  },
  update: async (id: string, payload: Partial<Quotation> & { items?: Array<{ productId: string; quantity: number }> }): Promise<Quotation> => {
    const response = await api.put<Quotation>(`/quotations/${id}`, payload);
    return response.data;
  },
  delete: async (id: string): Promise<any> => {
    const response = await api.delete(`/quotations/${id}`);
    return response.data;
  },
};

export const receiptService = {
  getAll: async (): Promise<Receipt[]> => {
    const response = await api.get<Receipt[]>("/receipts");
    return response.data;
  },
  calculate: async (payload: { items: Array<{ productId: string; quantity: number }>; discountRate: number; taxRate?: number }): Promise<Omit<Receipt, "id" | "receiptNumber" | "customerId" | "customerName" | "date">> => {
    const response = await api.post("/receipts/calculate", payload);
    return response.data;
  },
  create: async (payload: { customerId: string; items: Array<{ productId: string; quantity: number }>; discountRate: number; taxRate?: number }): Promise<Receipt> => {
    const response = await api.post<Receipt>("/receipts", payload);
    return response.data;
  },
  getOne: async (id: string): Promise<Receipt> => {
    const response = await api.get<Receipt>(`/receipts/${id}`);
    return response.data;
  },
};

export const userService = {
  getAll: async (): Promise<User[]> => {
    const response = await api.get<User[]>("/users");
    return response.data;
  },
  create: async (data: Omit<User, "id" | "disabled">): Promise<User> => {
    const response = await api.post<User>("/users", data);
    return response.data;
  },
  update: async (id: string, data: Partial<User>): Promise<User> => {
    const response = await api.put<User>(`/users/${id}`, data);
    return response.data;
  },
};

export const settingsService = {
  get: async (): Promise<CompanySettings> => {
    const response = await api.get<CompanySettings>("/settings");
    return response.data;
  },
  update: async (data: Partial<CompanySettings>): Promise<CompanySettings> => {
    const response = await api.put<CompanySettings>("/settings", data);
    return response.data;
  },
};

export const inventoryInsightsService = {
  getInsights: async (params?: InsightsFilterParams): Promise<InventoryInsightsResponse> => {
    const response = await api.get<InventoryInsightsResponse>("/inventory/insights", { params });
    return response.data;
  },
  getProductDetails: async (productId: string): Promise<DetailedProductView> => {
    const response = await api.get<DetailedProductView>(`/inventory/insights/products/${productId}`);
    return response.data;
  },
};

export const aiCopilotService = {
  getHelp: async (prompt: string, type: "quote" | "stock" | "general"): Promise<{ text: string }> => {
    const response = await api.post<{ text: string }>("/gemini/assist", { prompt, type });
    return response.data;
  }
};

export const systemLogService = {
  getAll: async (params?: { category?: string; severity?: string; search?: string }): Promise<SystemLogsResponse> => {
    const response = await api.get<SystemLogsResponse>("/system-logs", { params });
    return response.data;
  },
  logAction: async (logData: Omit<SystemLog, "id" | "timestamp">): Promise<SystemLog> => {
    const response = await api.post<SystemLog>("/system-logs", logData);
    return response.data;
  }
};

export const documentOcrService = {
  analyzeDocumentImage: async (imageBase64: string, mimeType?: string): Promise<DocumentAnalysisResult> => {
    const response = await api.post<DocumentAnalysisResult>("/gemini/analyze-document", { imageBase64, mimeType });
    return response.data;
  },
  bulkRestockFromOcr: async (items: Array<{ productId?: string; productName: string; sku?: string; quantityToAdd: number; costPrice?: number; sellingPrice?: number }>, note?: string) => {
    const response = await api.post<{ success: boolean; updatedCount: number; createdCount: number; message: string }>("/inventory/bulk-restock", { items, note });
    return response.data;
  }
};
