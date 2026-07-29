import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit 
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, auth, storage, handleFirestoreError, OperationType } from "../lib/firebase";
import { 
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
  SystemLog,
  SystemLogsResponse,
  PurchaseOrder,
  GoodsReceivedNote,
  StockMovementItem
} from "../types";

import { DEFAULT_COMPANY_SETTINGS, getMergedCompanySettings } from "../constants/defaultSettings";
import { ROLE_DEFINITIONS, AppRole } from "../types/rbac";

// Helper for Firebase Storage upload
export async function uploadImageToStorage(file: File, folder: string = "products"): Promise<string> {
  const fileExt = file.name.split(".").pop();
  const fileName = `${folder}/${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
  const storageRef = ref(storage, fileName);
  await uploadBytes(storageRef, file);
  return await getDownloadURL(storageRef);
}

// -------------------------------------------------------------
// PRODUCT SERVICE
// -------------------------------------------------------------
export const productService = {
  getAll: async (businessId: string, params?: { search?: string; status?: string; sortBy?: string; order?: string }): Promise<ProductResponse> => {
    const path = `businesses/${businessId}/products`;
    try {
      const q = query(collection(db, path));
      const snapshot = await getDocs(q);
      let products: Product[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));

      if (params?.search) {
        const s = params.search.toLowerCase();
        products = products.filter(p => 
          p.name.toLowerCase().includes(s) || 
          p.category.toLowerCase().includes(s) ||
          (p.sku && p.sku.toLowerCase().includes(s)) ||
          (p.barcode && p.barcode.toLowerCase().includes(s))
        );
      }

      if (params?.status && params.status !== "All") {
        products = products.filter(p => p.status === params.status);
      }

      if (params?.sortBy) {
        const field = params.sortBy as keyof Product;
        const isDesc = params.order === "desc";
        products.sort((a, b) => {
          const valA = a[field] ?? "";
          const valB = b[field] ?? "";
          if (valA < valB) return isDesc ? 1 : -1;
          if (valA > valB) return isDesc ? -1 : 1;
          return 0;
        });
      }

      const totalCost = products.reduce((acc, p) => acc + ((p.costPrice || 0) * (p.quantity || 0)), 0);
      const totalSelling = products.reduce((acc, p) => acc + ((p.sellingPrice || 0) * (p.quantity || 0)), 0);

      return {
        products,
        valuation: {
          totalCost,
          totalSelling,
          expectedProfit: totalSelling - totalCost
        }
      };
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, path);
    }
  },

  getOne: async (businessId: string, id: string): Promise<Product> => {
    const path = `businesses/${businessId}/products/${id}`;
    try {
      const docSnap = await getDoc(doc(db, "businesses", businessId, "products", id));
      if (!docSnap.exists()) {
        throw new Error("Product not found");
      }
      return { id: docSnap.id, ...docSnap.data() } as Product;
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, path);
    }
  },

  create: async (businessId: string, data: Omit<Product, "id" | "status">, userName: string = "Admin"): Promise<Product> => {
    const id = `prod-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const path = `businesses/${businessId}/products/${id}`;
    
    let status: Product["status"] = "In Stock";
    if (data.quantity <= 0) status = "Out Of Stock";
    else if (data.quantity <= data.minStock) status = "Low Stock";

    const product: Product = {
      ...data,
      id,
      status,
      costPrice: Number(data.costPrice) || 0,
      sellingPrice: Number(data.sellingPrice) || 0,
      quantity: Number(data.quantity) || 0,
      minStock: Number(data.minStock) || 0,
      location: data.location || "Main Warehouse",
      createdDate: new Date().toISOString()
    };

    try {
      await setDoc(doc(db, "businesses", businessId, "products", id), {
        ...product,
        businessId,
        updatedAt: new Date().toISOString(),
      });

      if (product.quantity > 0) {
        await stockMovementService.record(businessId, {
          productId: id,
          productName: product.name,
          movementType: "Purchase",
          quantity: product.quantity,
          previousStock: 0,
          newStock: product.quantity,
          reason: "Initial Product Creation Inventory",
          referenceNumber: `INIT-${id.slice(-6)}`,
          userId: "current-user",
          userName,
        });
      }

      await systemLogService.logAction(businessId, {
        category: "Product Catalog",
        action: "PRODUCT_CREATED",
        userEmail: userName,
        userName,
        userRole: "Staff",
        details: `Created product '${product.name}' with initial stock of ${product.quantity} units.`,
        targetId: id,
        severity: "info",
      });

      return product;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, path);
    }
  },

  update: async (businessId: string, id: string, data: Partial<Product>, userName: string = "Admin"): Promise<Product> => {
    const path = `businesses/${businessId}/products/${id}`;
    try {
      const refDoc = doc(db, "businesses", businessId, "products", id);
      const snap = await getDoc(refDoc);
      if (!snap.exists()) throw new Error("Product not found");

      const existing = snap.data() as Product;
      const newQty = data.quantity !== undefined ? Number(data.quantity) : existing.quantity;
      const newMin = data.minStock !== undefined ? Number(data.minStock) : existing.minStock;

      let status: Product["status"] = existing.status;
      if (newQty <= 0) status = "Out Of Stock";
      else if (newQty <= newMin) status = "Low Stock";
      else status = "In Stock";

      const updatedPayload = {
        ...data,
        status,
        updatedAt: new Date().toISOString(),
      };

      await updateDoc(refDoc, updatedPayload);

      if (data.quantity !== undefined && data.quantity !== existing.quantity) {
        const diff = newQty - existing.quantity;
        await stockMovementService.record(businessId, {
          productId: id,
          productName: data.name || existing.name,
          movementType: diff > 0 ? "Purchase" : "Adjustment",
          quantity: Math.abs(diff),
          previousStock: existing.quantity,
          newStock: newQty,
          reason: "Manual Stock Quantity Update",
          referenceNumber: `ADJ-${Date.now().toString().slice(-6)}`,
          userId: "current-user",
          userName,
        });
      }

      return { ...existing, ...updatedPayload };
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
  },

  delete: async (businessId: string, id: string, userName: string = "Admin"): Promise<{ message: string; product: Product }> => {
    const path = `businesses/${businessId}/products/${id}`;
    try {
      const refDoc = doc(db, "businesses", businessId, "products", id);
      const snap = await getDoc(refDoc);
      if (!snap.exists()) throw new Error("Product not found");

      const product = { id: snap.id, ...snap.data() } as Product;
      await deleteDoc(refDoc);

      await systemLogService.logAction(businessId, {
        category: "Product Catalog",
        action: "PRODUCT_DELETED",
        userEmail: userName,
        userName,
        userRole: "Staff",
        details: `Deleted product '${product.name}' (SKU: ${product.sku || 'N/A'}).`,
        targetId: id,
        severity: "warning",
      });

      return { message: "Product deleted successfully", product };
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  },

  restock: async (businessId: string, id: string, data: { addQuantity: number; newMinStock?: number }, userName: string = "Admin"): Promise<{ message: string; product: Product }> => {
    const path = `businesses/${businessId}/products/${id}`;
    try {
      const refDoc = doc(db, "businesses", businessId, "products", id);
      const snap = await getDoc(refDoc);
      if (!snap.exists()) throw new Error("Product not found");

      const existing = snap.data() as Product;
      const addQty = Number(data.addQuantity) || 0;
      const newQty = existing.quantity + addQty;
      const newMin = data.newMinStock !== undefined ? Number(data.newMinStock) : existing.minStock;

      let status: Product["status"] = "In Stock";
      if (newQty <= 0) status = "Out Of Stock";
      else if (newQty <= newMin) status = "Low Stock";

      await updateDoc(refDoc, {
        quantity: newQty,
        minStock: newMin,
        status,
        updatedAt: new Date().toISOString(),
      });

      await stockMovementService.record(businessId, {
        productId: id,
        productName: existing.name,
        movementType: "Purchase",
        quantity: addQty,
        previousStock: existing.quantity,
        newStock: newQty,
        reason: "Inventory Restock Action",
        referenceNumber: `RESTOCK-${Date.now().toString().slice(-6)}`,
        userId: "current-user",
        userName,
      });

      const updatedProduct = { ...existing, quantity: newQty, minStock: newMin, status };
      return { message: "Stock replenished successfully", product: updatedProduct };
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
  },

  batchDelete: async (businessId: string, ids: string[]): Promise<{ message: string; deletedCount: number }> => {
    let count = 0;
    for (const id of ids) {
      try {
        await deleteDoc(doc(db, "businesses", businessId, "products", id));
        count++;
      } catch (err) {
        console.error(`Failed to delete product ${id}:`, err);
      }
    }
    return { message: `Deleted ${count} products`, deletedCount: count };
  },

  batchUpdateStock: async (businessId: string, data: { ids: string[]; mode: "set" | "add" | "minStock"; value: number }): Promise<{ message: string; updatedCount: number }> => {
    let count = 0;
    for (const id of data.ids) {
      try {
        const refDoc = doc(db, "businesses", businessId, "products", id);
        const snap = await getDoc(refDoc);
        if (snap.exists()) {
          const prod = snap.data() as Product;
          let newQty = prod.quantity;
          let newMin = prod.minStock;

          if (data.mode === "set") newQty = data.value;
          else if (data.mode === "add") newQty += data.value;
          else if (data.mode === "minStock") newMin = data.value;

          let status: Product["status"] = "In Stock";
          if (newQty <= 0) status = "Out Of Stock";
          else if (newQty <= newMin) status = "Low Stock";

          await updateDoc(refDoc, { quantity: newQty, minStock: newMin, status, updatedAt: new Date().toISOString() });
          count++;
        }
      } catch (err) {
        console.error(`Failed to update product ${id}:`, err);
      }
    }
    return { message: `Updated ${count} products`, updatedCount: count };
  }
};

// -------------------------------------------------------------
// CATEGORY SERVICE
// -------------------------------------------------------------
export interface CategoryItem {
  id: string;
  name: string;
  description?: string;
  createdAt?: string;
}

export const categoryService = {
  getAll: async (businessId: string): Promise<CategoryItem[]> => {
    const path = `businesses/${businessId}/categories`;
    try {
      const snapshot = await getDocs(collection(db, path));
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CategoryItem));
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, path);
    }
  },
  create: async (businessId: string, data: { name: string; description?: string }): Promise<CategoryItem> => {
    const id = `cat-${Date.now()}`;
    const path = `businesses/${businessId}/categories/${id}`;
    const item: CategoryItem = { id, name: data.name, description: data.description, createdAt: new Date().toISOString() };
    try {
      await setDoc(doc(db, "businesses", businessId, "categories", id), { ...item, businessId });
      return item;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, path);
    }
  },
  delete: async (businessId: string, id: string): Promise<void> => {
    const path = `businesses/${businessId}/categories/${id}`;
    try {
      await deleteDoc(doc(db, "businesses", businessId, "categories", id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  }
};

// -------------------------------------------------------------
// STOCK MOVEMENTS SERVICE
// -------------------------------------------------------------
export const stockMovementService = {
  record: async (businessId: string, movement: { productId: string; productName: string; movementType: "Sale" | "Purchase" | "Adjustment" | "Transfer" | "Return"; quantity: number; previousStock: number; newStock: number; reason: string; referenceNumber: string; userId: string; userName: string }) => {
    const id = `mov-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const path = `businesses/${businessId}/stockMovements/${id}`;
    const record = {
      ...movement,
      id,
      businessId,
      date: new Date().toISOString(),
      type: movement.movementType,
      quantityChange: movement.movementType === "Sale" ? -movement.quantity : movement.quantity,
      reference: movement.referenceNumber,
      warehouse: "Main Warehouse",
      user: movement.userName,
      notes: movement.reason
    };
    try {
      await setDoc(doc(db, "businesses", businessId, "stockMovements", id), record);
      return record;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, path);
    }
  },

  getAll: async (businessId: string): Promise<StockMovementItem[]> => {
    const path = `businesses/${businessId}/stockMovements`;
    try {
      const snapshot = await getDocs(query(collection(db, path), orderBy("date", "desc"), limit(100)));
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StockMovementItem));
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, path);
    }
  }
};

// -------------------------------------------------------------
// CUSTOMER SERVICE
// -------------------------------------------------------------
export const customerService = {
  getAll: async (businessId: string, search?: string): Promise<Customer[]> => {
    const path = `businesses/${businessId}/customers`;
    try {
      const snapshot = await getDocs(collection(db, path));
      let list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer));
      if (search) {
        const s = search.toLowerCase();
        list = list.filter(c => 
          (c.name || "").toLowerCase().includes(s) || 
          (c.email || "").toLowerCase().includes(s) || 
          (c.phone || "").includes(s)
        );
      }
      return list;
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, path);
    }
  },

  create: async (businessId: string, data: Omit<Customer, "id">): Promise<Customer> => {
    const id = `cust-${Date.now()}`;
    const path = `businesses/${businessId}/customers/${id}`;
    const currUser = auth.currentUser;
    const userUid = currUser?.uid || "unknown";
    const userEmail = currUser?.email || "";
    const userName = currUser?.displayName || (userEmail ? userEmail.split("@")[0] : "Staff");
    const nowIso = new Date().toISOString();

    const customer: Customer = { id, ...data };
    try {
      await setDoc(doc(db, "businesses", businessId, "customers", id), {
        ...customer,
        createdByUid: userUid,
        createdByName: userName,
        createdByEmail: userEmail,
        createdAt: nowIso,
        updatedByUid: userUid,
        updatedByName: userName,
        updatedByEmail: userEmail,
        updatedAt: nowIso,
      });

      await systemLogService.logAction(businessId, {
        category: "System Settings",
        action: "CUSTOMER_CREATED",
        userEmail,
        userName,
        details: `Added new customer '${customer.name}' (${customer.type})`,
        targetId: id,
        severity: "info"
      });

      return customer;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, path);
    }
  },

  update: async (businessId: string, id: string, data: Partial<Customer>): Promise<Customer> => {
    const path = `businesses/${businessId}/customers/${id}`;
    try {
      const currUser = auth.currentUser;
      const userUid = currUser?.uid || "unknown";
      const userEmail = currUser?.email || "";
      const userName = currUser?.displayName || (userEmail ? userEmail.split("@")[0] : "Staff");
      const nowIso = new Date().toISOString();

      const refDoc = doc(db, "businesses", businessId, "customers", id);
      const updateData = {
        ...data,
        updatedByUid: userUid,
        updatedByName: userName,
        updatedByEmail: userEmail,
        updatedAt: nowIso
      };
      await updateDoc(refDoc, updateData);
      const snap = await getDoc(refDoc);
      const updatedCustomer = { id: snap.id, ...snap.data() } as Customer;

      await systemLogService.logAction(businessId, {
        category: "System Settings",
        action: "CUSTOMER_UPDATED",
        userEmail,
        userName,
        details: `Updated details for customer '${updatedCustomer.name}'`,
        targetId: id,
        severity: "info"
      });

      return updatedCustomer;
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
  },

  delete: async (businessId: string, id: string): Promise<any> => {
    const path = `businesses/${businessId}/customers/${id}`;
    try {
      await deleteDoc(doc(db, "businesses", businessId, "customers", id));
      return { success: true };
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  }
};

// -------------------------------------------------------------
// SUPPLIER SERVICE
// -------------------------------------------------------------
export const supplierService = {
  getAll: async (businessId: string): Promise<Supplier[]> => {
    const path = `businesses/${businessId}/suppliers`;
    try {
      const snapshot = await getDocs(collection(db, path));
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Supplier));
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, path);
    }
  },

  create: async (businessId: string, data: Omit<Supplier, "id">): Promise<Supplier> => {
    const id = `sup-${Date.now()}`;
    const path = `businesses/${businessId}/suppliers/${id}`;
    const supplier: Supplier = { id, ...data };
    try {
      await setDoc(doc(db, "businesses", businessId, "suppliers", id), {
        ...supplier,
        createdAt: new Date().toISOString(),
      });
      return supplier;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, path);
    }
  },

  update: async (businessId: string, id: string, data: Partial<Supplier>): Promise<Supplier> => {
    const path = `businesses/${businessId}/suppliers/${id}`;
    try {
      const refDoc = doc(db, "businesses", businessId, "suppliers", id);
      await updateDoc(refDoc, data);
      const snap = await getDoc(refDoc);
      return { id: snap.id, ...snap.data() } as Supplier;
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
  },

  delete: async (businessId: string, id: string): Promise<any> => {
    const path = `businesses/${businessId}/suppliers/${id}`;
    try {
      await deleteDoc(doc(db, "businesses", businessId, "suppliers", id));
      return { success: true };
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  }
};

// -------------------------------------------------------------
// QUOTATION SERVICE
// -------------------------------------------------------------
export const quotationService = {
  getAll: async (businessId: string): Promise<Quotation[]> => {
    const path = `businesses/${businessId}/quotations`;
    try {
      const snapshot = await getDocs(collection(db, path));
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Quotation));
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, path);
    }
  },

  calculate: async (payload: { items: Array<{ productId: string; quantity: number }>; discountRate: number; taxRate?: number }) => {
    let subtotal = 0;
    for (const item of payload.items) {
      subtotal += item.quantity * 100;
    }
    const discountAmount = subtotal * (payload.discountRate || 0);
    const afterDiscount = subtotal - discountAmount;
    const taxRate = payload.taxRate || 0;
    const taxAmount = afterDiscount * taxRate;
    const total = afterDiscount + taxAmount;
    return {
      lines: payload.items.map(i => ({ productId: i.productId, productName: "Product", quantity: i.quantity, unitPrice: 100, totalPrice: i.quantity * 100 })),
      subtotal,
      discountRate: payload.discountRate,
      discountAmount,
      taxRate,
      taxAmount,
      total,
    };
  },

  create: async (businessId: string, payload: { customerId: string; customerName?: string; customerEmail?: string; customerPhone?: string; customerAddress?: string; items: Array<{ productId: string; quantity: number }>; discountRate: number; taxRate?: number; notes?: string; status?: string }): Promise<Quotation> => {
    const id = `quote-${Date.now()}`;
    const quotationNumber = `QT-${Date.now().toString().slice(-6)}`;
    const path = `businesses/${businessId}/quotations/${id}`;
    
    let customerName = payload.customerName || "";
    let customerEmail = payload.customerEmail || "";
    let customerPhone = payload.customerPhone || "";
    let customerAddress = payload.customerAddress || "";

    if (payload.customerId) {
      try {
        const custSnap = await getDoc(doc(db, "businesses", businessId, "customers", payload.customerId));
        if (custSnap.exists()) {
          const cust = custSnap.data() as Customer;
          if (!customerName || customerName === "Customer") customerName = cust.name;
          if (!customerEmail) customerEmail = cust.email || "";
          if (!customerPhone) customerPhone = cust.phone || "";
          if (!customerAddress) customerAddress = cust.address || "";
        }
      } catch (err) {
        console.warn("Could not fetch customer details for quote creation:", err);
      }
    }

    if (!customerName) customerName = "Valued Customer";

    const lines = [];
    let subtotal = 0;

    for (const item of payload.items) {
      try {
        const prodSnap = await getDoc(doc(db, "businesses", businessId, "products", item.productId));
        if (prodSnap.exists()) {
          const prod = prodSnap.data() as Product;
          const lineTotal = item.quantity * prod.sellingPrice;
          subtotal += lineTotal;
          lines.push({
            productId: item.productId,
            productName: prod.name,
            quantity: item.quantity,
            unitPrice: prod.sellingPrice,
            totalPrice: lineTotal
          });
        }
      } catch {
        lines.push({ productId: item.productId, productName: "Item", quantity: item.quantity, unitPrice: 50, totalPrice: item.quantity * 50 });
        subtotal += item.quantity * 50;
      }
    }

    const discountRate = payload.discountRate || 0;
    const discountAmount = subtotal * discountRate;
    const afterDiscount = subtotal - discountAmount;
    const taxRate = payload.taxRate || 0.15;
    const taxAmount = afterDiscount * taxRate;
    const total = afterDiscount + taxAmount;

    const currentUser = auth.currentUser;
    const userName = currentUser?.displayName || (currentUser?.email ? currentUser.email.split("@")[0] : "User");
    const userEmail = currentUser?.email || "";
    const userUid = currentUser?.uid || "unknown";
    const nowIso = new Date().toISOString();

    const quote: Quotation = {
      id,
      quotationNumber,
      customerId: payload.customerId,
      customerName,
      customerEmail,
      customerPhone,
      customerAddress,
      date: new Date().toISOString().split("T")[0],
      expiryDate: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
      lines,
      subtotal,
      taxRate,
      taxAmount,
      discountRate,
      discountAmount,
      total,
      status: (payload.status as any) || "Draft",
      notes: payload.notes || "",
      createdByUid: userUid,
      createdByName: userName,
      createdByEmail: userEmail,
      createdAt: nowIso,
      updatedByUid: userUid,
      updatedByName: userName,
      updatedByEmail: userEmail,
      updatedAt: nowIso
    };

    try {
      await setDoc(doc(db, "businesses", businessId, "quotations", id), { ...quote, businessId });
      
      await systemLogService.logAction(businessId, {
        category: "Quotation Management",
        action: "QUOTATION_CREATED",
        userEmail,
        userName,
        details: `Created Quotation #${quotationNumber} for '${customerName}' (Total: $${total.toFixed(2)})`,
        targetId: id,
        severity: "info"
      });

      return quote;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, path);
    }
  },

  getOne: async (businessId: string, id: string): Promise<Quotation> => {
    const path = `businesses/${businessId}/quotations/${id}`;
    try {
      const snap = await getDoc(doc(db, "businesses", businessId, "quotations", id));
      if (!snap.exists()) throw new Error("Quotation not found");
      return { id: snap.id, ...snap.data() } as Quotation;
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, path);
    }
  },

  update: async (businessId: string, id: string, payload: Partial<Quotation>): Promise<Quotation> => {
    const path = `businesses/${businessId}/quotations/${id}`;
    try {
      const currentUser = auth.currentUser;
      const userName = currentUser?.displayName || (currentUser?.email ? currentUser.email.split("@")[0] : "User");
      const userEmail = currentUser?.email || "";
      const userUid = currentUser?.uid || "unknown";
      const nowIso = new Date().toISOString();

      const refDoc = doc(db, "businesses", businessId, "quotations", id);
      const updateData = {
        ...payload,
        updatedByUid: userUid,
        updatedByName: userName,
        updatedByEmail: userEmail,
        updatedAt: nowIso
      };
      await updateDoc(refDoc, updateData);
      const snap = await getDoc(refDoc);
      const updatedQuote = { id: snap.id, ...snap.data() } as Quotation;

      await systemLogService.logAction(businessId, {
        category: "Quotation Management",
        action: payload.status ? `QUOTATION_STATUS_${payload.status.toUpperCase()}` : "QUOTATION_UPDATED",
        userEmail,
        userName,
        details: `Updated Quotation #${updatedQuote.quotationNumber}${payload.status ? ` status to '${payload.status}'` : ""}`,
        targetId: id,
        severity: payload.status === "Accepted" ? "success" : "info"
      });

      return updatedQuote;
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
  },

  delete: async (businessId: string, id: string): Promise<any> => {
    const path = `businesses/${businessId}/quotations/${id}`;
    try {
      await deleteDoc(doc(db, "businesses", businessId, "quotations", id));
      return { success: true };
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  }
};

// -------------------------------------------------------------
// RECEIPT SERVICE
// -------------------------------------------------------------
export const receiptService = {
  getAll: async (businessId: string): Promise<Receipt[]> => {
    const path = `businesses/${businessId}/receipts`;
    try {
      const snapshot = await getDocs(collection(db, path));
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Receipt));
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, path);
    }
  },

  calculate: async (payload: { items: Array<{ productId: string; quantity: number }>; discountRate: number; taxRate?: number }) => {
    return quotationService.calculate(payload);
  },

  create: async (businessId: string, payload: { customerId: string; customerName?: string; customerEmail?: string; customerPhone?: string; customerAddress?: string; items: Array<{ productId: string; quantity: number }>; discountRate: number; taxRate?: number; paymentMethod?: string; bankAccountId?: string; referenceNumber?: string; notes?: string }, userName: string = "Cashier"): Promise<Receipt> => {
    const id = `rec-${Date.now()}`;
    const receiptNumber = `REC-${Date.now().toString().slice(-6)}`;
    const path = `businesses/${businessId}/receipts/${id}`;

    let customerName = payload.customerName || "";
    let customerEmail = payload.customerEmail || "";
    let customerPhone = payload.customerPhone || "";
    let customerAddress = payload.customerAddress || "";

    if (payload.customerId) {
      try {
        const custSnap = await getDoc(doc(db, "businesses", businessId, "customers", payload.customerId));
        if (custSnap.exists()) {
          const cust = custSnap.data() as Customer;
          if (!customerName || customerName === "Customer") customerName = cust.name;
          if (!customerEmail) customerEmail = cust.email || "";
          if (!customerPhone) customerPhone = cust.phone || "";
          if (!customerAddress) customerAddress = cust.address || "";
        }
      } catch (err) {
        console.warn("Could not fetch customer info for receipt creation:", err);
      }
    }

    if (!customerName) customerName = "Valued Customer";

    const lines = [];
    let subtotal = 0;

    for (const item of payload.items) {
      const prodRef = doc(db, "businesses", businessId, "products", item.productId);
      const prodSnap = await getDoc(prodRef);
      if (prodSnap.exists()) {
        const prod = prodSnap.data() as Product;
        const lineTotal = item.quantity * prod.sellingPrice;
        subtotal += lineTotal;
        lines.push({
          productId: item.productId,
          productName: prod.name,
          quantity: item.quantity,
          unitPrice: prod.sellingPrice,
          totalPrice: lineTotal
        });

        const newQty = Math.max(0, prod.quantity - item.quantity);
        let status: Product["status"] = "In Stock";
        if (newQty <= 0) status = "Out Of Stock";
        else if (newQty <= prod.minStock) status = "Low Stock";

        await updateDoc(prodRef, { quantity: newQty, status, updatedAt: new Date().toISOString() });

        await stockMovementService.record(businessId, {
          productId: item.productId,
          productName: prod.name,
          movementType: "Sale",
          quantity: item.quantity,
          previousStock: prod.quantity,
          newStock: newQty,
          reason: `Customer Sales Receipt #${receiptNumber}`,
          referenceNumber: receiptNumber,
          userId: "current-user",
          userName,
        });
      }
    }

    const discountRate = payload.discountRate || 0;
    const discountAmount = subtotal * discountRate;
    const afterDiscount = subtotal - discountAmount;
    const taxRate = payload.taxRate || 0.15;
    const taxAmount = afterDiscount * taxRate;
    const total = afterDiscount + taxAmount;

    const currentUser = auth.currentUser;
    const userUid = currentUser?.uid || "unknown";
    const userEmail = currentUser?.email || "";
    const activeUserName = currentUser?.displayName || (userEmail ? userEmail.split("@")[0] : userName);
    const nowIso = new Date().toISOString();

    const receipt: Receipt = {
      id,
      receiptNumber,
      customerId: payload.customerId,
      customerName,
      customerEmail,
      customerPhone,
      customerAddress,
      date: new Date().toISOString().split("T")[0],
      lines,
      subtotal,
      taxRate,
      taxAmount,
      discountRate,
      discountAmount,
      total,
      paymentMethod: payload.paymentMethod || "Cash",
      bankAccountId: payload.bankAccountId,
      referenceNumber: payload.referenceNumber || "",
      notes: payload.notes || "",
      createdBy: activeUserName,
      createdByUid: userUid,
      createdByName: activeUserName,
      createdByEmail: userEmail,
      createdDate: nowIso,
      createdAt: nowIso,
      updatedByUid: userUid,
      updatedByName: activeUserName,
      updatedByEmail: userEmail,
      updatedAt: nowIso,
      approvalStatus: "Approved"
    };

    try {
      await setDoc(doc(db, "businesses", businessId, "receipts", id), { ...receipt, businessId });

      await systemLogService.logAction(businessId, {
        category: "Receipt & Sales",
        action: "RECEIPT_CREATED",
        userEmail,
        userName: activeUserName,
        userRole: "Staff",
        details: `Issued Sales Receipt #${receiptNumber} for $${total.toFixed(2)} to ${receipt.customerName}.`,
        targetId: id,
        severity: "success",
      });

      return receipt;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, path);
    }
  },

  getOne: async (businessId: string, id: string): Promise<Receipt> => {
    const path = `businesses/${businessId}/receipts/${id}`;
    try {
      const snap = await getDoc(doc(db, "businesses", businessId, "receipts", id));
      if (!snap.exists()) throw new Error("Receipt not found");
      return { id: snap.id, ...snap.data() } as Receipt;
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, path);
    }
  },

  reverse: async (businessId: string, id: string, reason: string, userName: string = "Admin"): Promise<Receipt> => {
    const path = `businesses/${businessId}/receipts/${id}`;
    try {
      const refDoc = doc(db, "businesses", businessId, "receipts", id);
      const snap = await getDoc(refDoc);
      if (!snap.exists()) throw new Error("Receipt not found");
      const receipt = snap.data() as Receipt;

      for (const line of receipt.lines) {
        const prodRef = doc(db, "businesses", businessId, "products", line.productId);
        const prodSnap = await getDoc(prodRef);
        if (prodSnap.exists()) {
          const prod = prodSnap.data() as Product;
          const newQty = prod.quantity + line.quantity;
          let status: Product["status"] = "In Stock";
          if (newQty <= 0) status = "Out Of Stock";
          else if (newQty <= prod.minStock) status = "Low Stock";

          await updateDoc(prodRef, { quantity: newQty, status, updatedAt: new Date().toISOString() });

          await stockMovementService.record(businessId, {
            productId: line.productId,
            productName: prod.name,
            movementType: "Return",
            quantity: line.quantity,
            previousStock: prod.quantity,
            newStock: newQty,
            reason: `Receipt Reversal: ${reason}`,
            referenceNumber: `REV-${receipt.receiptNumber}`,
            userId: "current-user",
            userName,
          });
        }
      }

      const currUser = auth.currentUser;
      const userUid = currUser?.uid || "unknown";
      const userEmail = currUser?.email || "";
      const activeUserName = currUser?.displayName || (userEmail ? userEmail.split("@")[0] : userName);
      const nowIso = new Date().toISOString();

      const updateData = { 
        approvalStatus: "Reversed" as const, 
        reversalReason: reason,
        updatedByUid: userUid,
        updatedByName: activeUserName,
        updatedByEmail: userEmail,
        updatedAt: nowIso
      };
      await updateDoc(refDoc, updateData);

      await systemLogService.logAction(businessId, {
        category: "Receipt & Sales",
        action: "RECEIPT_REVERSED",
        userEmail,
        userName: activeUserName,
        userRole: "Staff",
        details: `Reversed Receipt #${receipt.receiptNumber} (Reason: ${reason}). Stock quantities returned.`,
        targetId: id,
        severity: "warning",
      });

      return { ...receipt, ...updateData };
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
  }
};

// -------------------------------------------------------------
// DASHBOARD SERVICE
// -------------------------------------------------------------
export const dashboardService = {
  getSummary: async (businessId: string): Promise<DashboardSummary> => {
    const productsRes = await productService.getAll(businessId);
    const customers = await customerService.getAll(businessId);
    const quotations = await quotationService.getAll(businessId);
    const receipts = await receiptService.getAll(businessId);
    const suppliers = await supplierService.getAll(businessId);

    const lowStockProducts = productsRes.products.filter(p => p.status === "Low Stock" || p.status === "Out Of Stock").length;

    return {
      totalProducts: productsRes.products.length,
      totalCustomers: customers.length,
      totalQuotations: quotations.length,
      totalReceipts: receipts.length,
      totalSuppliers: suppliers.length,
      lowStockProducts,
      company: "Acu-invent Business",
    };
  },

  getActivity: async (businessId: string): Promise<RecentActivity> => {
    const productsRes = await productService.getAll(businessId);
    const quotations = await quotationService.getAll(businessId);
    const receipts = await receiptService.getAll(businessId);

    return {
      recentlyAddedProducts: productsRes.products.slice(-5),
      recentlyCreatedQuotations: quotations.slice(-5),
      recentlyCreatedReceipts: receipts.slice(-5),
    };
  },

  getAlerts: async (businessId: string, params?: { multiplier?: number }): Promise<InventoryAlertsResponse> => {
    const productsRes = await productService.getAll(businessId);
    const mult = params?.multiplier || 1.0;

    const alerts: StockAlertItem[] = productsRes.products
      .filter(p => p.quantity <= (p.minStock * mult))
      .map(p => {
        const deficit = Math.max(0, p.minStock - p.quantity);
        const severity: StockAlertItem["alertSeverity"] = p.quantity === 0 ? "OUT_OF_STOCK" : p.quantity <= (p.minStock / 2) ? "CRITICAL" : "WARNING";
        return {
          ...p,
          alertSeverity: severity,
          stockDeficit: deficit,
          deficit,
          suggestedRestock: Math.max(10, (p.minStock * 2) - p.quantity),
          effectiveThreshold: p.minStock,
          unit: "units"
        };
      });

    const outOfStockCount = alerts.filter(a => a.alertSeverity === "OUT_OF_STOCK").length;
    const criticalCount = alerts.filter(a => a.alertSeverity === "CRITICAL").length;
    const warningCount = alerts.filter(a => a.alertSeverity === "WARNING").length;

    return {
      summary: {
        totalAlerts: alerts.length,
        outOfStockCount,
        criticalCount,
        warningCount,
        totalDeficitUnits: alerts.reduce((acc, a) => acc + a.stockDeficit, 0)
      },
      alerts
    };
  }
};

// -------------------------------------------------------------
// SYSTEM LOG SERVICE
// -------------------------------------------------------------
export const systemLogService = {
  getAll: async (businessId: string, params?: { category?: string; severity?: string; search?: string }): Promise<SystemLogsResponse> => {
    const path = `businesses/${businessId}/systemLogs`;
    try {
      const snapshot = await getDocs(query(collection(db, path), orderBy("timestamp", "desc"), limit(200)));
      let logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SystemLog));

      if (params?.category && params.category !== "All") {
        logs = logs.filter(l => l.category === params.category);
      }
      if (params?.severity && params.severity !== "All") {
        logs = logs.filter(l => l.severity === params.severity);
      }
      if (params?.search) {
        const s = params.search.toLowerCase();
        logs = logs.filter(l => l.details.toLowerCase().includes(s) || l.action.toLowerCase().includes(s) || l.userName.toLowerCase().includes(s));
      }

      return {
        logs,
        total: logs.length,
        stats: {
          totalLogs: logs.length,
          inventoryLogsCount: logs.filter(l => l.category.includes("Catalog") || l.category.includes("Inventory")).length,
          authLogsCount: logs.filter(l => l.category.includes("Auth")).length,
          quotationLogsCount: logs.filter(l => l.category.includes("Quotation") || l.category.includes("Receipt")).length,
          dangerActionsCount: logs.filter(l => l.severity === "danger" || l.severity === "warning").length
        }
      };
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, path);
    }
  },

  logAction: async (businessId: string, logData: Partial<SystemLog> & Pick<SystemLog, "action" | "category" | "details">): Promise<SystemLog> => {
    const id = `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const path = `businesses/${businessId}/systemLogs/${id}`;
    const currUser = auth.currentUser;
    const defaultName = currUser?.displayName || (currUser?.email ? currUser.email.split("@")[0] : "System User");
    const defaultEmail = currUser?.email || "user@business.internal";

    const logItem: SystemLog = {
      id,
      timestamp: new Date().toISOString(),
      category: logData.category,
      action: logData.action,
      userEmail: logData.userEmail || defaultEmail,
      userName: logData.userName || defaultName,
      userRole: logData.userRole || "Staff",
      details: logData.details,
      targetId: logData.targetId,
      severity: logData.severity || "info"
    };
    try {
      await setDoc(doc(db, "businesses", businessId, "systemLogs", id), { ...logItem, businessId });
      return logItem;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, path);
    }
  }
};

// -------------------------------------------------------------
// SETTINGS SERVICE
// -------------------------------------------------------------
export const settingsService = {
  get: async (businessId: string): Promise<CompanySettings> => {
    const path = `businesses/${businessId}/settings/company`;
    try {
      const snap = await getDoc(doc(db, "businesses", businessId, "settings", "company"));
      if (snap.exists()) {
        return getMergedCompanySettings(snap.data() as CompanySettings);
      }
      const defaultSettings = DEFAULT_COMPANY_SETTINGS;
      await setDoc(doc(db, "businesses", businessId, "settings", "company"), defaultSettings);
      return defaultSettings;
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, path);
      return DEFAULT_COMPANY_SETTINGS;
    }
  },

  update: async (businessId: string, data: Partial<CompanySettings>): Promise<CompanySettings> => {
    const path = `businesses/${businessId}/settings/company`;
    try {
      const refDoc = doc(db, "businesses", businessId, "settings", "company");
      await setDoc(refDoc, data, { merge: true });
      const snap = await getDoc(refDoc);
      return getMergedCompanySettings(snap.data() as CompanySettings);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
      return DEFAULT_COMPANY_SETTINGS;
    }
  }
};

// -------------------------------------------------------------
// USER MANAGEMENT SERVICE
// -------------------------------------------------------------
export const userService = {
  getAll: async (businessId: string): Promise<User[]> => {
    const path = `users`;
    try {
      const q = query(collection(db, "users"), where("businessId", "==", businessId));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, path);
    }
  },

  create: async (businessId: string, data: Omit<User, "id" | "disabled">): Promise<User> => {
    const id = `usr-${Date.now()}`;
    const path = `users/${id}`;
    const perms = data.customPermissions || ROLE_DEFINITIONS[data.role as AppRole]?.permissions || [];
    const newUser: User = {
      ...data,
      id,
      businessId,
      disabled: false,
      status: "Active",
      customPermissions: perms,
      createdDate: new Date().toISOString()
    };
    try {
      await setDoc(doc(db, "users", id), newUser);
      
      const currUser = auth.currentUser;
      const adminEmail = currUser?.email || "";
      const adminName = currUser?.displayName || (adminEmail ? adminEmail.split("@")[0] : "Admin");

      await systemLogService.logAction(businessId, {
        category: "User Management",
        action: "USER_PROVISIONED",
        userEmail: adminEmail,
        userName: adminName,
        details: `Provisioned staff profile for '${newUser.name}' (${newUser.email}) with role '${newUser.role}'`,
        targetId: id,
        severity: "info"
      });

      return newUser;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, path);
    }
  },

  update: async (businessId: string, id: string, data: Partial<User>): Promise<User> => {
    const path = `users/${id}`;
    try {
      const refDoc = doc(db, "users", id);
      const updatePayload: Partial<User> = { ...data };
      if (data.role && !data.customPermissions) {
        updatePayload.customPermissions = ROLE_DEFINITIONS[data.role as AppRole]?.permissions || [];
      }
      await updateDoc(refDoc, updatePayload);
      const snap = await getDoc(refDoc);
      const updatedUser = { id: snap.id, ...snap.data() } as User;

      const currUser = auth.currentUser;
      const adminEmail = currUser?.email || "";
      const adminName = currUser?.displayName || (adminEmail ? adminEmail.split("@")[0] : "Admin");

      await systemLogService.logAction(businessId, {
        category: "User Management",
        action: data.disabled !== undefined ? "USER_STATUS_TOGGLED" : "USER_UPDATED",
        userEmail: adminEmail,
        userName: adminName,
        details: data.disabled !== undefined 
          ? `${data.disabled ? "Disabled" : "Restored"} account login access for '${updatedUser.name}'`
          : `Updated user profile for '${updatedUser.name}' (${updatedUser.role})`,
        targetId: id,
        severity: data.disabled ? "warning" : "info"
      });

      return updatedUser;
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
  }
};

// -------------------------------------------------------------
// PURCHASING SERVICE
// -------------------------------------------------------------
export const purchasingService = {
  getOrders: async (businessId: string): Promise<PurchaseOrder[]> => {
    const path = `businesses/${businessId}/purchaseOrders`;
    try {
      const snapshot = await getDocs(collection(db, path));
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PurchaseOrder));
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, path);
    }
  },

  createOrder: async (businessId: string, payload: { supplierId: string; supplierName?: string; expectedDeliveryDate?: string; items: Array<{ productId: string; quantity: number; unitCost?: number }>; notes?: string }, userName: string = "Purchasing Agent"): Promise<PurchaseOrder> => {
    const id = `po-${Date.now()}`;
    const poNumber = `PO-${Date.now().toString().slice(-6)}`;
    const path = `businesses/${businessId}/purchaseOrders/${id}`;

    const items = [];
    let subtotal = 0;
    for (const item of payload.items) {
      const unitCost = item.unitCost || 50;
      const itemSubtotal = item.quantity * unitCost;
      subtotal += itemSubtotal;
      items.push({
        productId: item.productId,
        productName: "Item",
        sku: `SKU-${item.productId.slice(-4)}`,
        quantity: item.quantity,
        receivedQuantity: 0,
        unitCost,
        subtotal: itemSubtotal,
        taxRate: 0.15,
        total: itemSubtotal * 1.15
      });
    }

    const taxAmount = subtotal * 0.15;
    const totalAmount = subtotal + taxAmount;

    const order: PurchaseOrder = {
      id,
      poNumber,
      supplierId: payload.supplierId,
      supplierName: payload.supplierName || "Supplier",
      date: new Date().toISOString().split("T")[0],
      orderDate: new Date().toISOString().split("T")[0],
      expectedDeliveryDate: payload.expectedDeliveryDate || new Date(Date.now() + 7*86400000).toISOString().split("T")[0],
      status: "Approved",
      items,
      subtotal,
      taxAmount,
      totalAmount,
      notes: payload.notes || "",
      createdBy: userName,
      createdDate: new Date().toISOString()
    };

    try {
      await setDoc(doc(db, "businesses", businessId, "purchaseOrders", id), { ...order, businessId });
      return order;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, path);
    }
  },

  approveOrder: async (businessId: string, id: string): Promise<PurchaseOrder> => {
    const path = `businesses/${businessId}/purchaseOrders/${id}`;
    try {
      const refDoc = doc(db, "businesses", businessId, "purchaseOrders", id);
      await updateDoc(refDoc, { status: "Approved" });
      const snap = await getDoc(refDoc);
      return { id: snap.id, ...snap.data() } as PurchaseOrder;
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
  },

  getGoodsReceived: async (businessId: string): Promise<GoodsReceivedNote[]> => {
    const path = `businesses/${businessId}/goodsReceivedNotes`;
    try {
      const snapshot = await getDocs(collection(db, path));
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as GoodsReceivedNote));
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, path);
    }
  },

  createGoodsReceived: async (businessId: string, payload: { poId: string; deliveryNoteNumber?: string; warehouseLocation?: string; items: Array<{ productId: string; receivedQty: number; acceptedQty?: number; rejectedQty?: number; damagedQty?: number }>; notes?: string }, userName: string = "Warehouse"): Promise<GoodsReceivedNote> => {
    const id = `grn-${Date.now()}`;
    const grnNumber = `GRN-${Date.now().toString().slice(-6)}`;
    const path = `businesses/${businessId}/goodsReceivedNotes/${id}`;

    for (const item of payload.items) {
      const prodRef = doc(db, "businesses", businessId, "products", item.productId);
      const prodSnap = await getDoc(prodRef);
      if (prodSnap.exists()) {
        const prod = prodSnap.data() as Product;
        const addQty = item.acceptedQty !== undefined ? item.acceptedQty : item.receivedQty;
        const newQty = prod.quantity + addQty;
        
        let status: Product["status"] = "In Stock";
        if (newQty <= 0) status = "Out Of Stock";
        else if (newQty <= prod.minStock) status = "Low Stock";

        await updateDoc(prodRef, { quantity: newQty, status, updatedAt: new Date().toISOString() });

        await stockMovementService.record(businessId, {
          productId: item.productId,
          productName: prod.name,
          movementType: "Purchase",
          quantity: addQty,
          previousStock: prod.quantity,
          newStock: newQty,
          reason: `Goods Received Note #${grnNumber} (PO #${payload.poId})`,
          referenceNumber: grnNumber,
          userId: "current-user",
          userName,
        });
      }
    }

    const grn: GoodsReceivedNote = {
      id,
      grnNumber,
      poId: payload.poId,
      poNumber: `PO-${payload.poId.slice(-6)}`,
      supplierId: "sup-1",
      supplierName: "Supplier",
      deliveryNoteNumber: payload.deliveryNoteNumber || `DN-${Date.now().toString().slice(-6)}`,
      date: new Date().toISOString().split("T")[0],
      dateReceived: new Date().toISOString().split("T")[0],
      receivedBy: userName,
      receiverName: userName,
      warehouseLocation: payload.warehouseLocation || "Main Warehouse",
      items: payload.items.map(i => ({
        productId: i.productId,
        productName: "Item",
        sku: `SKU-${i.productId.slice(-4)}`,
        orderedQty: i.receivedQty,
        receivedQty: i.receivedQty,
        acceptedQty: i.acceptedQty ?? i.receivedQty,
        rejectedQty: i.rejectedQty ?? 0,
        damagedQty: i.damagedQty ?? 0,
        unitCost: 50
      })),
      status: "Approved",
      notes: payload.notes || "",
      createdBy: userName,
      createdDate: new Date().toISOString()
    };

    try {
      await setDoc(doc(db, "businesses", businessId, "goodsReceivedNotes", id), { ...grn, businessId });
      return grn;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, path);
    }
  }
};
