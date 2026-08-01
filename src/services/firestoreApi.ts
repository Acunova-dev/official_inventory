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
  limit,
  runTransaction 
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, auth, storage, handleFirestoreError, OperationType } from "../lib/firebase";
import { 
  Product, 
  ProductCategory,
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
  StockMovementItem,
  CashBookEntry,
  BankAccount,
  BankLedgerEntry,
  FinancialSummaryReport,
  Invoice,
  InvoiceLine,
  PaymentVoucher
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
export type CategoryItem = ProductCategory;

const DEFAULT_CATEGORIES = [
  { name: "Laptops", description: "Portable laptops & notebooks" },
  { name: "Audio", description: "Headphones, speakers & microphones" },
  { name: "Displays", description: "Monitors & video displays" },
  { name: "Development Boards", description: "Microcontrollers & dev kits" },
  { name: "Power Accessories", description: "Chargers, cables & adapters" },
  { name: "Peripherals", description: "Keyboards, mice & accessories" },
  { name: "Storage", description: "SSDs, HDDs & flash drives" },
];

export const categoryService = {
  getAll: async (businessId: string): Promise<ProductCategory[]> => {
    const path = `businesses/${businessId}/productCategories`;
    try {
      const snapshot = await getDocs(collection(db, path));
      let list: ProductCategory[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ProductCategory));

      // If productCategories is empty, seed defaults
      if (list.length === 0) {
        const legacyPath = `businesses/${businessId}/categories`;
        const legacySnap = await getDocs(collection(db, legacyPath));
        if (legacySnap.docs.length > 0) {
          list = legacySnap.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              name: data.name,
              description: data.description || "",
              status: (data.status as any) || "Active",
              createdAt: data.createdAt || new Date().toISOString(),
              updatedAt: data.updatedAt || new Date().toISOString(),
              createdBy: "System",
            } as ProductCategory;
          });
        } else {
          // Seed standard default categories
          const now = new Date().toISOString();
          for (const def of DEFAULT_CATEGORIES) {
            const id = `cat-${def.name.toLowerCase().replace(/[^\w]+/g, "-")}`;
            const item: ProductCategory = {
              id,
              name: def.name,
              description: def.description,
              status: "Active",
              createdAt: now,
              updatedAt: now,
              createdBy: "System",
            };
            await setDoc(doc(db, "businesses", businessId, "productCategories", id), {
              ...item,
              businessId,
            });
            list.push(item);
          }
        }
      }

      // Sort alphabetically by name
      return list.sort((a, b) => a.name.localeCompare(b.name));
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, path);
    }
  },

  create: async (
    businessId: string, 
    data: { name: string; description?: string; status?: "Active" | "Inactive" }, 
    userName: string = "Admin"
  ): Promise<ProductCategory> => {
    const trimmedName = data.name.trim();
    if (!trimmedName) throw new Error("Category Name cannot be blank.");

    const existing = await categoryService.getAll(businessId);
    if (existing.some(c => c.name.toLowerCase() === trimmedName.toLowerCase())) {
      throw new Error(`A category named '${trimmedName}' already exists.`);
    }

    const id = `cat-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const path = `businesses/${businessId}/productCategories/${id}`;
    const now = new Date().toISOString();
    
    const item: ProductCategory = {
      id,
      name: trimmedName,
      description: data.description?.trim() || "",
      status: data.status || "Active",
      createdAt: now,
      updatedAt: now,
      createdBy: userName,
    };

    try {
      await setDoc(doc(db, "businesses", businessId, "productCategories", id), {
        ...item,
        businessId,
      });

      await systemLogService.logAction(businessId, {
        category: "Product Catalog",
        action: "Category Created",
        userEmail: userName,
        userName,
        userRole: "Staff",
        details: `Category Created: '${trimmedName}' (${item.status})`,
        targetId: id,
        severity: "info",
      });

      return item;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, path);
    }
  },

  update: async (
    businessId: string,
    id: string,
    data: { name: string; description?: string; status?: "Active" | "Inactive" },
    userName: string = "Admin"
  ): Promise<ProductCategory> => {
    const trimmedName = data.name.trim();
    if (!trimmedName) throw new Error("Category Name cannot be blank.");

    const existing = await categoryService.getAll(businessId);
    if (existing.some(c => c.id !== id && c.name.toLowerCase() === trimmedName.toLowerCase())) {
      throw new Error(`A category named '${trimmedName}' already exists.`);
    }

    const targetCat = existing.find(c => c.id === id);
    const oldName = targetCat?.name;

    const path = `businesses/${businessId}/productCategories/${id}`;
    const now = new Date().toISOString();

    const updatedItem: ProductCategory = {
      id,
      name: trimmedName,
      description: data.description?.trim() || "",
      status: data.status || "Active",
      createdAt: targetCat?.createdAt || now,
      updatedAt: now,
      createdBy: targetCat?.createdBy || userName,
    };

    try {
      await setDoc(doc(db, "businesses", businessId, "productCategories", id), {
        ...updatedItem,
        businessId,
      });

      // If category name changed, update products referencing this category
      if (oldName && oldName !== trimmedName) {
        const prodSnapshot = await getDocs(collection(db, `businesses/${businessId}/products`));
        const updates = prodSnapshot.docs.filter(docSnap => {
          const p = docSnap.data();
          return p.categoryId === id || p.category === oldName;
        });

        for (const docSnap of updates) {
          await updateDoc(doc(db, `businesses/${businessId}/products`, docSnap.id), {
            category: trimmedName,
            categoryId: id,
            updatedAt: now,
          });
        }
      }

      await systemLogService.logAction(businessId, {
        category: "Product Catalog",
        action: "Category Updated",
        userEmail: userName,
        userName,
        userRole: "Staff",
        details: `Category Updated: '${trimmedName}' (Status: ${updatedItem.status})`,
        targetId: id,
        severity: "info",
      });

      return updatedItem;
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
  },

  delete: async (businessId: string, id: string, userName: string = "Admin"): Promise<void> => {
    const existing = await categoryService.getAll(businessId);
    const cat = existing.find(c => c.id === id);
    const catName = cat?.name || id;
    const path = `businesses/${businessId}/productCategories/${id}`;

    try {
      await deleteDoc(doc(db, "businesses", businessId, "productCategories", id));
      // Clean up legacy collection if present
      try {
        await deleteDoc(doc(db, "businesses", businessId, "categories", id));
      } catch (e) {
        // ignore legacy doc deletion error
      }

      await systemLogService.logAction(businessId, {
        category: "Product Catalog",
        action: "Category Deleted",
        userEmail: userName,
        userName,
        userRole: "Staff",
        details: `Category Deleted: '${catName}'`,
        targetId: id,
        severity: "warning",
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  },

  reassignAndDelete: async (
    businessId: string, 
    categoryIdToDelete: string, 
    targetCategoryId: string, 
    targetCategoryName: string, 
    userName: string = "Admin"
  ): Promise<void> => {
    const existing = await categoryService.getAll(businessId);
    const catToDelete = existing.find(c => c.id === categoryIdToDelete);
    const oldName = catToDelete?.name || categoryIdToDelete;
    const now = new Date().toISOString();

    try {
      // Reassign products to target category
      const prodSnapshot = await getDocs(collection(db, `businesses/${businessId}/products`));
      const affectedProds = prodSnapshot.docs.filter(docSnap => {
        const p = docSnap.data();
        return p.categoryId === categoryIdToDelete || p.category === oldName;
      });

      for (const docSnap of affectedProds) {
        await updateDoc(doc(db, `businesses/${businessId}/products`, docSnap.id), {
          categoryId: targetCategoryId,
          category: targetCategoryName,
          updatedAt: now,
        });
      }

      // Delete the category document
      await deleteDoc(doc(db, "businesses", businessId, "productCategories", categoryIdToDelete));
      try {
        await deleteDoc(doc(db, "businesses", businessId, "categories", categoryIdToDelete));
      } catch (e) {
        // ignore
      }

      await systemLogService.logAction(businessId, {
        category: "Product Catalog",
        action: "Category Deleted",
        userEmail: userName,
        userName,
        userRole: "Staff",
        details: `Category Deleted: '${oldName}' - ${affectedProds.length} products reassigned to '${targetCategoryName}'`,
        targetId: categoryIdToDelete,
        severity: "warning",
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `businesses/${businessId}/productCategories/${categoryIdToDelete}`);
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
    const taxRate = 0;
    const taxAmount = 0;
    const total = afterDiscount;
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
    const taxRate = 0;
    const taxAmount = 0;
    const total = afterDiscount;

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
  },

  convertQuotationToInvoice: async (businessId: string, quotationId: string): Promise<Invoice> => {
    return invoiceService.convertQuotationToInvoice(businessId, quotationId);
  }
};

// -------------------------------------------------------------
// FINANCIAL SERVICE (Cash Book, Bank Accounts, Transfers)
// -------------------------------------------------------------
export const financialService = {
  getNextSequenceNumber: async (businessId: string, bookType: string, prefix: string): Promise<string> => {
    const counterRef = doc(db, "businesses", businessId, "counters", bookType);
    let nextCount = 1;
    await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(counterRef);
      if (snap.exists()) {
        nextCount = (snap.data().currentCount || 0) + 1;
      }
      transaction.set(counterRef, { currentCount: nextCount, updatedAt: new Date().toISOString() }, { merge: true });
    });
    const year = new Date().getFullYear();
    return `${prefix}-${year}-${String(nextCount).padStart(6, "0")}`;
  },

  getCashBook: async (businessId: string): Promise<CashBookEntry[]> => {
    const path = `businesses/${businessId}/cashBook`;
    try {
      const snap = await getDocs(collection(db, path));
      const entries = snap.docs.map(d => ({ id: d.id, ...d.data() } as CashBookEntry & { createdAt?: string }));
      entries.sort((a, b) => {
        const dA = a.createdAt || a.date;
        const dB = b.createdAt || b.date;
        return dA.localeCompare(dB);
      });
      let running = 0;
      return entries.map(e => {
        const net = (e.debit || 0) - (e.credit || 0);
        running += net;
        return {
          ...e,
          runningBalance: running
        };
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, path);
    }
  },

  createCashAdjustment: async (businessId: string, payload: { type: "Debit" | "Credit"; amount: number; category?: string; description?: string; date?: string; referenceDoc?: string; customerId?: string; supplierId?: string; paymentMethod?: string }): Promise<CashBookEntry> => {
    const path = `businesses/${businessId}/cashBook`;
    const id = `cb-${Date.now()}`;
    const referenceDoc = payload.referenceDoc || await financialService.getNextSequenceNumber(businessId, "cashBook", "CB");
    const amount = Number(payload.amount || 0);
    const debit = payload.type === "Debit" ? amount : 0;
    const credit = payload.type === "Credit" ? amount : 0;
    
    const existing = await financialService.getCashBook(businessId);
    const lastBalance = existing.length > 0 ? existing[existing.length - 1].runningBalance : 0;
    const runningBalance = lastBalance + debit - credit;

    const currentUser = auth.currentUser;
    const userUid = currentUser?.uid || "unknown";
    const userEmail = currentUser?.email || "";
    const activeUserName = currentUser?.displayName || (userEmail ? userEmail.split("@")[0] : "Admin");
    const nowIso = new Date().toISOString();

    const entry: CashBookEntry & { businessId: string; createdByUid?: string; createdByEmail?: string; createdAt?: string } = {
      id,
      date: payload.date || new Date().toISOString().split("T")[0],
      referenceDoc,
      description: payload.description || "Cash Movement",
      debit,
      credit,
      runningBalance,
      category: payload.category || (debit > 0 ? "Cash Inflow" : "Cash Outflow"),
      createdBy: activeUserName,
      createdByUid: userUid,
      createdByEmail: userEmail,
      createdAt: nowIso,
      businessId
    };

    try {
      await setDoc(doc(db, "businesses", businessId, "cashBook", id), entry);

      await systemLogService.logAction(businessId, {
        category: "Financial Management",
        action: "CASH_ENTRY_POSTED",
        userEmail,
        userName: activeUserName,
        details: `Posted Cash ${payload.type} of $${amount.toFixed(2)} [Ref: ${referenceDoc}].`,
        targetId: id,
        severity: "info"
      });

      return entry;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, path);
    }
  },

  getBankAccounts: async (businessId: string): Promise<BankAccount[]> => {
    const path = `businesses/${businessId}/bankAccounts`;
    try {
      const snap = await getDocs(collection(db, path));
      const accounts = snap.docs.map(d => ({ id: d.id, ...d.data() } as BankAccount));
      if (accounts.length === 0) {
        const defaultBank: BankAccount & { businessId: string; createdAt: string } = {
          id: `bank-main-${Date.now()}`,
          accountName: "Main Operations Account",
          accountNumber: "1098234567",
          bankName: "First National Bank",
          branch: "Headquarters",
          currency: "$",
          initialBalance: 0,
          currentBalance: 0,
          status: "Active",
          businessId,
          createdAt: new Date().toISOString()
        };
        await setDoc(doc(db, "businesses", businessId, "bankAccounts", defaultBank.id), defaultBank);
        return [defaultBank];
      }
      return accounts;
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, path);
    }
  },

  createBankAccount: async (businessId: string, payload: { accountName: string; accountNumber: string; bankName: string; branch?: string; initialBalance?: number; currency?: string }): Promise<BankAccount> => {
    const path = `businesses/${businessId}/bankAccounts`;
    const id = `bank-${Date.now()}`;
    const initialBalance = Number(payload.initialBalance || 0);

    const currentUser = auth.currentUser;
    const userEmail = currentUser?.email || "";
    const activeUserName = currentUser?.displayName || (userEmail ? userEmail.split("@")[0] : "Admin");

    const bankAcc: BankAccount & { businessId: string; createdBy?: string; createdAt: string } = {
      id,
      accountName: payload.accountName,
      accountNumber: payload.accountNumber,
      bankName: payload.bankName,
      branch: payload.branch || "Main Branch",
      currency: payload.currency || "$",
      initialBalance,
      currentBalance: initialBalance,
      status: "Active",
      businessId,
      createdBy: activeUserName,
      createdAt: new Date().toISOString()
    };

    try {
      await setDoc(doc(db, "businesses", businessId, "bankAccounts", id), bankAcc);

      if (initialBalance > 0) {
        const entryId = `bank-txn-init-${Date.now()}`;
        const refDoc = await financialService.getNextSequenceNumber(businessId, "bankTxn", "BNK");
        await setDoc(doc(db, "businesses", businessId, "bankTransactions", entryId), {
          id: entryId,
          bankAccountId: id,
          bankAccountName: payload.accountName,
          date: new Date().toISOString().split("T")[0],
          referenceDoc: refDoc,
          description: "Initial Account Opening Balance",
          debit: initialBalance,
          credit: 0,
          runningBalance: initialBalance,
          transactionType: "Deposit",
          reconciliationStatus: "Reconciled",
          createdBy: activeUserName,
          createdAt: new Date().toISOString(),
          businessId
        });
      }

      await systemLogService.logAction(businessId, {
        category: "Bank Account Management",
        action: "BANK_ACCOUNT_CREATED",
        userEmail,
        userName: activeUserName,
        details: `Created Bank Account '${payload.accountName}' (${payload.bankName}) with initial balance $${initialBalance.toFixed(2)}.`,
        targetId: id,
        severity: "success"
      });

      return bankAcc;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, path);
    }
  },

  getBankLedger: async (businessId: string, accountId: string): Promise<BankLedgerEntry[]> => {
    const path = `businesses/${businessId}/bankTransactions`;
    try {
      const snap = await getDocs(collection(db, path));
      const entries = snap.docs
        .map(d => ({ id: d.id, ...d.data() } as BankLedgerEntry & { createdAt?: string }))
        .filter(e => e.bankAccountId === accountId);

      entries.sort((a, b) => {
        const dA = a.createdAt || a.date;
        const dB = b.createdAt || b.date;
        return dA.localeCompare(dB);
      });

      let running = 0;
      return entries.map(e => {
        const net = (e.debit || 0) - (e.credit || 0);
        running += net;
        return {
          ...e,
          runningBalance: running
        };
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, path);
    }
  },

  recordBankTransaction: async (businessId: string, payload: { bankAccountId: string; type: "Deposit" | "Withdrawal" | "EFT Payment" | "Transfer" | "Bank Charge" | "Interest" | "Reversal"; amount: number; description: string; referenceDoc?: string; date?: string }): Promise<BankLedgerEntry> => {
    const bankDocRef = doc(db, "businesses", businessId, "bankAccounts", payload.bankAccountId);
    const bankSnap = await getDoc(bankDocRef);
    if (!bankSnap.exists()) throw new Error("Target bank account not found.");
    const account = bankSnap.data() as BankAccount;

    const amount = Number(payload.amount || 0);
    const isIncrease = payload.type === "Deposit" || payload.type === "Interest";
    const debit = isIncrease ? amount : 0;
    const credit = !isIncrease ? amount : 0;
    const newBalance = account.currentBalance + debit - credit;

    await updateDoc(bankDocRef, { currentBalance: newBalance, updatedAt: new Date().toISOString() });

    const currentUser = auth.currentUser;
    const userEmail = currentUser?.email || "";
    const activeUserName = currentUser?.displayName || (userEmail ? userEmail.split("@")[0] : "Admin");

    const entryId = `bank-txn-${Date.now()}`;
    const refDoc = payload.referenceDoc || await financialService.getNextSequenceNumber(businessId, "bankTxn", "BNK");

    const entry: BankLedgerEntry & { businessId: string; createdAt: string } = {
      id: entryId,
      bankAccountId: payload.bankAccountId,
      bankAccountName: account.accountName,
      date: payload.date || new Date().toISOString().split("T")[0],
      referenceDoc: refDoc,
      description: payload.description,
      debit,
      credit,
      runningBalance: newBalance,
      transactionType: payload.type,
      reconciliationStatus: "Reconciled",
      createdBy: activeUserName,
      createdAt: new Date().toISOString(),
      businessId
    };

    await setDoc(doc(db, "businesses", businessId, "bankTransactions", entryId), entry);

    await systemLogService.logAction(businessId, {
      category: "Bank Account Management",
      action: `BANK_${payload.type.toUpperCase()}`,
      userEmail,
      userName: activeUserName,
      details: `Recorded ${payload.type} of $${amount.toFixed(2)} on account ${account.accountName}. New balance: $${newBalance.toFixed(2)}.`,
      targetId: entryId,
      severity: "info"
    });

    return entry;
  },

  transferFunds: async (businessId: string, payload: { fromType: "Bank" | "Cash"; fromId?: string; toType: "Bank" | "Cash"; toId?: string; amount: number; description?: string }) => {
    const amount = Number(payload.amount || 0);
    if (amount <= 0) throw new Error("Transfer amount must be greater than zero.");

    if (payload.fromType === payload.toType && payload.fromId === payload.toId) {
      throw new Error("Source and destination accounts must be different.");
    }

    const currentUser = auth.currentUser;
    const userEmail = currentUser?.email || "";
    const activeUserName = currentUser?.displayName || (userEmail ? userEmail.split("@")[0] : "Admin");
    const desc = payload.description || "Internal Funds Transfer";

    let sourceName = "Cash Drawer";
    if (payload.fromType === "Bank") {
      if (!payload.fromId) throw new Error("Please select source bank account.");
      const srcRef = doc(db, "businesses", businessId, "bankAccounts", payload.fromId);
      const srcSnap = await getDoc(srcRef);
      if (!srcSnap.exists()) throw new Error("Source bank account not found.");
      const srcAcc = srcSnap.data() as BankAccount;
      if (srcAcc.currentBalance < amount) throw new Error(`Insufficient funds in source account '${srcAcc.accountName}'. Current balance: $${srcAcc.currentBalance.toFixed(2)}`);

      sourceName = srcAcc.accountName;
      const newSrcBal = srcAcc.currentBalance - amount;
      await updateDoc(srcRef, { currentBalance: newSrcBal, updatedAt: new Date().toISOString() });

      const txnId = `bank-transfer-out-${Date.now()}`;
      const refDoc = await financialService.getNextSequenceNumber(businessId, "bankTxn", "TRF");
      await setDoc(doc(db, "businesses", businessId, "bankTransactions", txnId), {
        id: txnId,
        bankAccountId: payload.fromId,
        bankAccountName: srcAcc.accountName,
        date: new Date().toISOString().split("T")[0],
        referenceDoc: refDoc,
        description: `Transfer Out to ${payload.toType === "Bank" ? "Bank" : "Cash Drawer"}: ${desc}`,
        debit: 0,
        credit: amount,
        runningBalance: newSrcBal,
        transactionType: "Transfer",
        reconciliationStatus: "Reconciled",
        createdBy: activeUserName,
        createdAt: new Date().toISOString(),
        businessId
      });
    } else {
      await financialService.createCashAdjustment(businessId, {
        type: "Credit",
        amount,
        category: "Internal Transfer",
        description: `Cash Transfer Out to ${payload.toType === "Bank" ? "Bank Account" : "Other Cash"}: ${desc}`
      });
    }

    if (payload.toType === "Bank") {
      if (!payload.toId) throw new Error("Please select destination bank account.");
      const destRef = doc(db, "businesses", businessId, "bankAccounts", payload.toId);
      const destSnap = await getDoc(destRef);
      if (!destSnap.exists()) throw new Error("Destination bank account not found.");
      const destAcc = destSnap.data() as BankAccount;

      const newDestBal = destAcc.currentBalance + amount;
      await updateDoc(destRef, { currentBalance: newDestBal, updatedAt: new Date().toISOString() });

      const txnId = `bank-transfer-in-${Date.now()}`;
      const refDoc = await financialService.getNextSequenceNumber(businessId, "bankTxn", "TRF");
      await setDoc(doc(db, "businesses", businessId, "bankTransactions", txnId), {
        id: txnId,
        bankAccountId: payload.toId,
        bankAccountName: destAcc.accountName,
        date: new Date().toISOString().split("T")[0],
        referenceDoc: refDoc,
        description: `Transfer In from ${sourceName}: ${desc}`,
        debit: amount,
        credit: 0,
        runningBalance: newDestBal,
        transactionType: "Transfer",
        reconciliationStatus: "Reconciled",
        createdBy: activeUserName,
        createdAt: new Date().toISOString(),
        businessId
      });
    } else {
      await financialService.createCashAdjustment(businessId, {
        type: "Debit",
        amount,
        category: "Internal Transfer",
        description: `Cash Deposit In from ${sourceName}: ${desc}`
      });
    }

    await systemLogService.logAction(businessId, {
      category: "Financial Management",
      action: "FUNDS_TRANSFERRED",
      userEmail,
      userName: activeUserName,
      details: `Transferred $${amount.toFixed(2)} from ${sourceName} to ${payload.toType}.`,
      severity: "success"
    });

    return { success: true };
  },

  getSummary: async (businessId: string): Promise<FinancialSummaryReport> => {
    const cashEntries = await financialService.getCashBook(businessId);
    const bankAccounts = await financialService.getBankAccounts(businessId);
    const receipts = await receiptService.getAll(businessId);
    const vouchers = await financialService.getPaymentVouchers(businessId);

    const cashBalance = cashEntries.length > 0 ? cashEntries[cashEntries.length - 1].runningBalance : 0;
    const totalBankBalance = bankAccounts.reduce((sum, b) => sum + (b.currentBalance || 0), 0);
    const totalLiquidReserves = cashBalance + totalBankBalance;

    const validReceipts = receipts.filter(r => r.approvalStatus !== "Reversed");
    const totalReceiptsCollected = validReceipts.reduce((sum, r) => sum + (r.total || 0), 0);
    const totalReceiptsCount = validReceipts.length;

    const validVouchers = vouchers.filter(v => v.status !== "Reversed");
    const totalVouchersAmount = validVouchers.reduce((sum, v) => sum + (v.amount || 0), 0);

    const totalCashInflow = cashEntries.reduce((sum, e) => sum + (e.debit || 0), 0);
    const totalCashOutflow = cashEntries.reduce((sum, e) => sum + (e.credit || 0), 0);

    return {
      totalReceipts: totalReceiptsCollected,
      totalPayments: totalCashOutflow,
      totalCashBalance: cashBalance,
      totalBankBalance,
      totalPettyCashBalance: 0,
      cashBalance,
      bankBalance: totalBankBalance,
      pettyCashBalance: 0,
      totalLiquidReserves,
      totalReceiptsCollected,
      totalReceiptsCount,
      totalDisbursements: totalCashOutflow,
      totalPaymentVouchersCount: validVouchers.length,
      outstandingSupplierPayments: totalVouchersAmount,
      netCashFlow: totalCashInflow - totalCashOutflow
    };
  },

  getPaymentVouchers: async (businessId: string): Promise<PaymentVoucher[]> => {
    const path = `businesses/${businessId}/paymentVouchers`;
    try {
      const snap = await getDocs(collection(db, path));
      const vouchers = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as PaymentVoucher));
      vouchers.sort((a, b) => (b.createdDate || b.date).localeCompare(a.createdDate || a.date));
      return vouchers;
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, path);
    }
  },

  createPaymentVoucher: async (
    businessId: string, 
    payload: { 
      supplierId: string; 
      supplierName?: string;
      poId?: string;
      poNumber?: string;
      supplierInvoiceNo?: string;
      paymentMethod?: string;
      amount: number;
      bankAccountId?: string;
      purpose?: string;
      notes?: string;
    },
    userName: string = "Admin"
  ): Promise<PaymentVoucher> => {
    const id = `pv-${Date.now()}`;
    const voucherNumber = await financialService.getNextSequenceNumber(businessId, "paymentVouchers", "PV");
    const path = `businesses/${businessId}/paymentVouchers/${id}`;

    let supplierName = payload.supplierName || "";
    let supplierEmail = "";
    let supplierPhone = "";
    let supplierAddress = "";

    if (payload.supplierId) {
      try {
        const supSnap = await getDoc(doc(db, "businesses", businessId, "suppliers", payload.supplierId));
        if (supSnap.exists()) {
          const sup = supSnap.data() as Supplier;
          supplierName = sup.companyName || sup.name || supplierName;
          supplierEmail = sup.email || "";
          supplierPhone = sup.phone || "";
          supplierAddress = sup.address || "";
        }
      } catch (err) {
        console.warn("Could not fetch supplier details for payment voucher:", err);
      }
    }
    if (!supplierName) supplierName = "Supplier";

    let poNumber = payload.poNumber || "";
    if (payload.poId && !poNumber) {
      try {
        const poSnap = await getDoc(doc(db, "businesses", businessId, "purchaseOrders", payload.poId));
        if (poSnap.exists()) {
          poNumber = (poSnap.data() as PurchaseOrder).poNumber;
        }
      } catch (e) {
        console.warn("Could not fetch PO for payment voucher:", e);
      }
    }

    let bankAccountName = "";
    if (payload.bankAccountId && payload.paymentMethod !== "Cash") {
      try {
        const bankSnap = await getDoc(doc(db, "businesses", businessId, "bankAccounts", payload.bankAccountId));
        if (bankSnap.exists()) {
          const b = bankSnap.data() as BankAccount;
          bankAccountName = `${b.bankName} (${b.accountNumber})`;
        }
      } catch (e) {
        console.warn("Could not fetch bank account for payment voucher:", e);
      }
    }

    const pv: PaymentVoucher = {
      id,
      voucherNumber,
      supplierId: payload.supplierId,
      supplierName,
      supplierEmail,
      supplierPhone,
      supplierAddress,
      poId: payload.poId,
      poNumber: poNumber || undefined,
      supplierInvoiceNo: payload.supplierInvoiceNo,
      date: new Date().toISOString().split("T")[0],
      paymentDate: new Date().toISOString().split("T")[0],
      paymentMethod: payload.paymentMethod || "Cash",
      amount: Number(payload.amount),
      currency: "$",
      purpose: payload.purpose || `Vendor payment to ${supplierName}`,
      bankAccountId: payload.bankAccountId,
      bankAccountName: bankAccountName || undefined,
      paidBy: userName,
      status: "Issued",
      notes: payload.notes || "",
      createdBy: userName,
      createdDate: new Date().toISOString()
    };

    try {
      await setDoc(doc(db, "businesses", businessId, "paymentVouchers", id), { ...pv, businessId });

      if (payload.paymentMethod === "Cash") {
        await financialService.createCashAdjustment(businessId, {
          type: "Credit",
          amount: Number(payload.amount),
          category: "Vendor Payment",
          description: `Payment Voucher #${voucherNumber} (${supplierName})`,
          referenceDoc: voucherNumber,
          date: pv.date,
          supplierId: payload.supplierId,
          paymentMethod: "Cash"
        });
      } else if (payload.bankAccountId) {
        await financialService.recordBankTransaction(businessId, {
          bankAccountId: payload.bankAccountId,
          type: "EFT Payment",
          amount: Number(payload.amount),
          description: `Disbursement Payment Voucher #${voucherNumber} to ${supplierName}`,
          referenceDoc: voucherNumber,
          date: pv.date
        });
      }

      return pv;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, path);
    }
  },

  reversePaymentVoucher: async (businessId: string, id: string, reason: string, userName: string = "Admin"): Promise<PaymentVoucher> => {
    const path = `businesses/${businessId}/paymentVouchers/${id}`;
    try {
      const refDoc = doc(db, "businesses", businessId, "paymentVouchers", id);
      const snap = await getDoc(refDoc);
      if (!snap.exists()) throw new Error("Payment Voucher not found");

      const pv = snap.data() as PaymentVoucher;
      if (pv.status === "Reversed") throw new Error("Payment Voucher is already reversed");

      await updateDoc(refDoc, {
        status: "Reversed",
        reversalReason: reason,
        updatedAt: new Date().toISOString()
      });

      if (pv.paymentMethod === "Cash") {
        await financialService.createCashAdjustment(businessId, {
          type: "Debit",
          amount: pv.amount,
          category: "Voucher Reversal",
          description: `Reversal of Payment Voucher #${pv.voucherNumber}: ${reason}`,
          referenceDoc: `REV-${pv.voucherNumber}`,
          date: new Date().toISOString().split("T")[0],
          supplierId: pv.supplierId,
          paymentMethod: "Cash"
        });
      } else if (pv.bankAccountId) {
        await financialService.recordBankTransaction(businessId, {
          bankAccountId: pv.bankAccountId,
          type: "Reversal",
          amount: pv.amount,
          description: `Reversal of Payment Voucher #${pv.voucherNumber}: ${reason}`,
          referenceDoc: `REV-${pv.voucherNumber}`,
          date: new Date().toISOString().split("T")[0]
        });
      }

      return { ...pv, status: "Reversed", reversalReason: reason };
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
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
    const receiptNumber = await financialService.getNextSequenceNumber(businessId, "receipts", "REC");
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
    const taxRate = 0;
    const taxAmount = 0;
    const total = afterDiscount;

    let bankAccountName = "";
    if (payload.bankAccountId) {
      try {
        const bSnap = await getDoc(doc(db, "businesses", businessId, "bankAccounts", payload.bankAccountId));
        if (bSnap.exists()) {
          bankAccountName = (bSnap.data() as BankAccount).accountName;
        }
      } catch (e) {
        console.warn("Could not fetch bank account for receipt:", e);
      }
    }

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
      bankAccountName: bankAccountName || undefined,
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

      // Post financial transaction to source of truth
      if (payload.bankAccountId && payload.paymentMethod !== "Cash") {
        try {
          await financialService.recordBankTransaction(businessId, {
            bankAccountId: payload.bankAccountId,
            type: "Deposit",
            amount: total,
            description: `Customer payment for Receipt #${receiptNumber} (${customerName})`,
            referenceDoc: receiptNumber,
            date: receipt.date
          });
        } catch (fErr) {
          console.warn("Failed to post bank transaction for receipt:", fErr);
        }
      } else {
        try {
          await financialService.createCashAdjustment(businessId, {
            type: "Debit",
            amount: total,
            category: "Customer Sale",
            description: `Sales receipt #${receiptNumber} (${customerName})`,
            referenceDoc: receiptNumber,
            date: receipt.date,
            customerId: payload.customerId
          });
        } catch (fErr) {
          console.warn("Failed to post cash entry for receipt:", fErr);
        }
      }

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

      // Reverse financial entry
      if (receipt.bankAccountId && receipt.paymentMethod !== "Cash") {
        try {
          await financialService.recordBankTransaction(businessId, {
            bankAccountId: receipt.bankAccountId,
            type: "Reversal",
            amount: receipt.total,
            description: `Reversal of Receipt #${receipt.receiptNumber}: ${reason}`,
            referenceDoc: `REV-${receipt.receiptNumber}`,
            date: new Date().toISOString().split("T")[0]
          });
        } catch (fErr) {
          console.warn("Failed to reverse bank transaction for receipt:", fErr);
        }
      } else {
        try {
          await financialService.createCashAdjustment(businessId, {
            type: "Credit",
            amount: receipt.total,
            category: "Sales Reversal",
            description: `Reversal of Receipt #${receipt.receiptNumber}: ${reason}`,
            referenceDoc: `REV-${receipt.receiptNumber}`,
            date: new Date().toISOString().split("T")[0],
            customerId: receipt.customerId
          });
        } catch (fErr) {
          console.warn("Failed to reverse cash entry for receipt:", fErr);
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
        details: `Reversed Receipt #${receipt.receiptNumber} (Reason: ${reason}). Stock quantities returned and financial ledger updated.`,
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
// INVOICE SERVICE
// -------------------------------------------------------------
export const invoiceService = {
  getAll: async (businessId: string): Promise<Invoice[]> => {
    const path = `businesses/${businessId}/invoices`;
    try {
      const snapshot = await getDocs(collection(db, path));
      const invoices = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Invoice));
      invoices.sort((a, b) => (b.createdAt || b.date).localeCompare(a.createdAt || a.date));
      return invoices;
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, path);
    }
  },

  getOne: async (businessId: string, id: string): Promise<Invoice> => {
    const path = `businesses/${businessId}/invoices/${id}`;
    try {
      const snap = await getDoc(doc(db, "businesses", businessId, "invoices", id));
      if (!snap.exists()) throw new Error("Invoice not found");
      return { id: snap.id, ...snap.data() } as Invoice;
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, path);
    }
  },

  create: async (businessId: string, payload: {
    customerId: string;
    customerName?: string;
    customerEmail?: string;
    customerPhone?: string;
    customerAddress?: string;
    quotationId?: string;
    quotationNumber?: string;
    dueDate?: string;
    items: Array<{ productId: string; quantity: number }>;
    discountRate: number;
    taxRate?: number;
    notes?: string;
    termsAndConditions?: string;
    status?: Invoice["status"];
  }): Promise<Invoice> => {
    const id = `inv-${Date.now()}`;
    const invoiceNumber = await financialService.getNextSequenceNumber(businessId, "invoices", "INV");
    const path = `businesses/${businessId}/invoices/${id}`;

    let customerName = payload.customerName || "";
    let customerEmail = payload.customerEmail || "";
    let customerPhone = payload.customerPhone || "";
    let customerAddress = payload.customerAddress || "";

    if (payload.customerId) {
      try {
        const custSnap = await getDoc(doc(db, "businesses", businessId, "customers", payload.customerId));
        if (custSnap.exists()) {
          const cust = custSnap.data() as Customer;
          if (!customerName) customerName = cust.name;
          if (!customerEmail) customerEmail = cust.email || "";
          if (!customerPhone) customerPhone = cust.phone || "";
          if (!customerAddress) customerAddress = cust.address || "";
        }
      } catch (err) {
        console.warn("Could not fetch customer details for invoice creation:", err);
      }
    }

    if (!customerName) customerName = "Valued Customer";

    const lines: InvoiceLine[] = [];
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
    const taxRate = 0;
    const taxAmount = 0;
    const total = afterDiscount;

    const currentUser = auth.currentUser;
    const userName = currentUser?.displayName || (currentUser?.email ? currentUser.email.split("@")[0] : "Admin");
    const userEmail = currentUser?.email || "";
    const userUid = currentUser?.uid || "unknown";
    const nowIso = new Date().toISOString();

    const invoice: Invoice = {
      id,
      invoiceNumber,
      quotationId: payload.quotationId,
      quotationNumber: payload.quotationNumber,
      customerId: payload.customerId,
      customerName,
      customerEmail,
      customerPhone,
      customerAddress,
      date: new Date().toISOString().split("T")[0],
      dueDate: payload.dueDate || new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0],
      lines,
      subtotal,
      taxRate,
      taxAmount,
      discountRate,
      discountAmount,
      total,
      amountPaid: 0,
      outstandingBalance: total,
      status: payload.status || "Issued",
      notes: payload.notes || "",
      termsAndConditions: payload.termsAndConditions || "Payment is due within 14 days of invoice date.",
      currency: "$",
      paymentIds: [],
      receiptNumbers: [],
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
      await setDoc(doc(db, "businesses", businessId, "invoices", id), { ...invoice, businessId });

      await systemLogService.logAction(businessId, {
        category: "Invoice Management",
        action: "INVOICE_CREATED",
        userEmail,
        userName,
        details: `Created Invoice #${invoiceNumber} for '${customerName}' (Total: $${total.toFixed(2)})`,
        targetId: id,
        severity: "info"
      });

      return invoice;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, path);
    }
  },

  update: async (businessId: string, id: string, payload: Partial<Invoice>): Promise<Invoice> => {
    const path = `businesses/${businessId}/invoices/${id}`;
    try {
      const currentUser = auth.currentUser;
      const userName = currentUser?.displayName || (currentUser?.email ? currentUser.email.split("@")[0] : "Admin");
      const userEmail = currentUser?.email || "";
      const userUid = currentUser?.uid || "unknown";
      const nowIso = new Date().toISOString();

      const refDoc = doc(db, "businesses", businessId, "invoices", id);
      const updateData = {
        ...payload,
        updatedByUid: userUid,
        updatedByName: userName,
        updatedByEmail: userEmail,
        updatedAt: nowIso
      };
      await updateDoc(refDoc, updateData);
      const snap = await getDoc(refDoc);
      const updatedInv = { id: snap.id, ...snap.data() } as Invoice;

      await systemLogService.logAction(businessId, {
        category: "Invoice Management",
        action: payload.status ? `INVOICE_STATUS_${payload.status.toUpperCase()}` : "INVOICE_UPDATED",
        userEmail,
        userName,
        details: `Updated Invoice #${updatedInv.invoiceNumber}${payload.status ? ` status to '${payload.status}'` : ""}`,
        targetId: id,
        severity: "info"
      });

      return updatedInv;
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
  },

  convertQuotationToInvoice: async (businessId: string, quotationId: string): Promise<Invoice> => {
    const quoteSnap = await getDoc(doc(db, "businesses", businessId, "quotations", quotationId));
    if (!quoteSnap.exists()) throw new Error("Quotation not found.");
    const quote = { id: quoteSnap.id, ...quoteSnap.data() } as Quotation;

    if (quote.isConverted || quote.invoiceId) {
      try {
        const existingInvSnap = await getDoc(doc(db, "businesses", businessId, "invoices", quote.invoiceId!));
        if (existingInvSnap.exists()) {
          return { id: existingInvSnap.id, ...existingInvSnap.data() } as Invoice;
        }
      } catch {
        // Fallthrough if invoice was deleted
      }
    }

    const payloadItems = quote.lines.map(l => ({
      productId: l.productId,
      quantity: l.quantity
    }));

    const invoice = await invoiceService.create(businessId, {
      customerId: quote.customerId,
      customerName: quote.customerName,
      customerEmail: quote.customerEmail,
      customerPhone: quote.customerPhone,
      customerAddress: quote.customerAddress,
      quotationId: quote.id,
      quotationNumber: quote.quotationNumber,
      items: payloadItems,
      discountRate: quote.discountRate,
      taxRate: quote.taxRate,
      notes: quote.notes || `Generated from Quotation #${quote.quotationNumber}`,
      status: "Issued"
    });

    const currentUser = auth.currentUser;
    const userName = currentUser?.displayName || (currentUser?.email ? currentUser.email.split("@")[0] : "Admin");
    const userEmail = currentUser?.email || "";

    await updateDoc(doc(db, "businesses", businessId, "quotations", quote.id), {
      status: "Converted",
      isConverted: true,
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      updatedAt: new Date().toISOString()
    });

    await systemLogService.logAction(businessId, {
      category: "Quotation Management",
      action: "QUOTATION_CONVERTED_TO_INVOICE",
      userEmail,
      userName,
      details: `Converted Quotation #${quote.quotationNumber} to Invoice #${invoice.invoiceNumber}`,
      targetId: quote.id,
      severity: "success"
    });

    return invoice;
  },

  generateReceiptFromInvoice: async (businessId: string, payload: {
    invoiceId: string;
    amountReceived: number;
    paymentMethod: string;
    bankAccountId?: string;
    paymentDate?: string;
    referenceNumber?: string;
    notes?: string;
  }): Promise<{ receipt: Receipt; invoice: Invoice }> => {
    const invSnap = await getDoc(doc(db, "businesses", businessId, "invoices", payload.invoiceId));
    if (!invSnap.exists()) throw new Error("Invoice not found.");
    const inv = { id: invSnap.id, ...invSnap.data() } as Invoice;

    if (inv.status === "Paid" || inv.outstandingBalance <= 0) {
      throw new Error("This invoice is already fully paid.");
    }

    const payAmount = Number(payload.amountReceived);
    if (isNaN(payAmount) || payAmount <= 0) {
      throw new Error("Payment amount must be greater than zero.");
    }

    const receiptItems = inv.lines.map(line => ({
      productId: line.productId,
      quantity: line.quantity
    }));

    const currentUser = auth.currentUser;
    const activeUserName = currentUser?.displayName || (currentUser?.email ? currentUser.email.split("@")[0] : "Cashier");

    const receipt = await receiptService.create(businessId, {
      customerId: inv.customerId,
      customerName: inv.customerName,
      customerEmail: inv.customerEmail,
      customerPhone: inv.customerPhone,
      customerAddress: inv.customerAddress,
      items: receiptItems,
      discountRate: inv.discountRate || 0,
      taxRate: inv.taxRate || 0,
      paymentMethod: payload.paymentMethod || "Cash",
      bankAccountId: payload.bankAccountId,
      referenceNumber: payload.referenceNumber || `INV-${inv.invoiceNumber}`,
      notes: payload.notes || `Payment for Invoice #${inv.invoiceNumber}`
    }, activeUserName);

    await updateDoc(doc(db, "businesses", businessId, "receipts", receipt.id), {
      relatedInvoiceIds: [inv.id]
    });

    const newAmountPaid = (inv.amountPaid || 0) + payAmount;
    const newOutstanding = Math.max(0, (inv.total || 0) - newAmountPaid);
    const newStatus: Invoice["status"] = newOutstanding <= 0.001 ? "Paid" : "Partially Paid";

    const updatedPaymentIds = Array.from(new Set([...(inv.paymentIds || []), receipt.id]));
    const updatedReceiptNumbers = Array.from(new Set([...(inv.receiptNumbers || []), receipt.receiptNumber]));

    const invRef = doc(db, "businesses", businessId, "invoices", inv.id);
    await updateDoc(invRef, {
      amountPaid: newAmountPaid,
      outstandingBalance: newOutstanding,
      status: newStatus,
      paymentIds: updatedPaymentIds,
      receiptNumbers: updatedReceiptNumbers,
      updatedAt: new Date().toISOString()
    });

    const updatedInvSnap = await getDoc(invRef);
    const updatedInvoice = { id: updatedInvSnap.id, ...updatedInvSnap.data() } as Invoice;

    const userEmail = currentUser?.email || "";
    await systemLogService.logAction(businessId, {
      category: "Invoice Management",
      action: newStatus === "Paid" ? "INVOICE_FULLY_PAID" : "INVOICE_PARTIALLY_PAID",
      userEmail,
      userName: activeUserName,
      details: `Recorded payment of $${payAmount.toFixed(2)} on Invoice #${inv.invoiceNumber} via Receipt #${receipt.receiptNumber}. Remaining balance: $${newOutstanding.toFixed(2)}.`,
      targetId: inv.id,
      severity: "success"
    });

    return { receipt, invoice: updatedInvoice };
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

  createOrder: async (businessId: string, payload: { supplierId: string; supplierName?: string; supplierEmail?: string; supplierPhone?: string; supplierAddress?: string; expectedDeliveryDate?: string; items: Array<{ productId: string; productName?: string; sku?: string; quantity: number; unitCost?: number }>; notes?: string }, userName: string = "Purchasing Agent"): Promise<PurchaseOrder> => {
    const id = `po-${Date.now()}`;
    const poNumber = await financialService.getNextSequenceNumber(businessId, "purchaseOrders", "PO");
    const path = `businesses/${businessId}/purchaseOrders/${id}`;

    let supplierName = payload.supplierName || "";
    let supplierEmail = payload.supplierEmail || "";
    let supplierPhone = payload.supplierPhone || "";
    let supplierAddress = payload.supplierAddress || "";

    if (payload.supplierId) {
      try {
        const supSnap = await getDoc(doc(db, "businesses", businessId, "suppliers", payload.supplierId));
        if (supSnap.exists()) {
          const sup = supSnap.data() as Supplier;
          supplierName = sup.companyName || sup.name || supplierName;
          supplierEmail = sup.email || supplierEmail;
          supplierPhone = sup.phone || supplierPhone;
          supplierAddress = sup.address || supplierAddress;
        }
      } catch (err) {
        console.warn("Could not fetch supplier details for PO creation:", err);
      }
    }
    if (!supplierName) supplierName = "Supplier";

    const items = [];
    let subtotal = 0;
    for (const item of payload.items) {
      let prodName = item.productName || "";
      let sku = item.sku || "";
      let unitCost = item.unitCost || 0;

      if (item.productId) {
        try {
          const prodSnap = await getDoc(doc(db, "businesses", businessId, "products", item.productId));
          if (prodSnap.exists()) {
            const prod = prodSnap.data() as Product;
            prodName = prodName || prod.name;
            sku = sku || prod.sku || prod.barcode || `SKU-${prod.id.slice(-4)}`;
            if (!unitCost) unitCost = prod.costPrice || prod.sellingPrice || 0;
          }
        } catch (e) {
          console.warn("Could not fetch product for PO item:", e);
        }
      }
      if (!prodName) prodName = "Item";
      if (!sku) sku = item.productId ? `SKU-${item.productId.slice(-4)}` : "SKU-001";
      if (!unitCost) unitCost = 50;

      const itemSubtotal = item.quantity * unitCost;
      subtotal += itemSubtotal;
      items.push({
        productId: item.productId,
        productName: prodName,
        sku,
        quantity: item.quantity,
        receivedQuantity: 0,
        unitCost,
        subtotal: itemSubtotal,
        taxRate: 0,
        total: itemSubtotal
      });
    }

    const taxAmount = 0;
    const totalAmount = subtotal;

    const order: PurchaseOrder = {
      id,
      poNumber,
      supplierId: payload.supplierId,
      supplierName,
      supplierEmail,
      supplierPhone,
      supplierAddress,
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
    const grnNumber = await financialService.getNextSequenceNumber(businessId, "goodsReceivedNotes", "GRN");
    const path = `businesses/${businessId}/goodsReceivedNotes/${id}`;

    let poNumber = `PO-${payload.poId.slice(-6)}`;
    let supplierId = "";
    let supplierName = "Supplier";
    let supplierEmail = "";
    let supplierPhone = "";
    let supplierAddress = "";
    const poItemsMap: Record<string, any> = {};

    try {
      const poSnap = await getDoc(doc(db, "businesses", businessId, "purchaseOrders", payload.poId));
      if (poSnap.exists()) {
        const po = poSnap.data() as PurchaseOrder;
        poNumber = po.poNumber;
        supplierId = po.supplierId;
        supplierName = po.supplierName;
        supplierEmail = po.supplierEmail || "";
        supplierPhone = po.supplierPhone || "";
        supplierAddress = po.supplierAddress || "";
        (po.items || []).forEach(it => {
          poItemsMap[it.productId] = it;
        });
      }
    } catch (e) {
      console.warn("Could not fetch PO for GRN:", e);
    }

    const grnItems = [];
    for (const item of payload.items) {
      const prodRef = doc(db, "businesses", businessId, "products", item.productId);
      const prodSnap = await getDoc(prodRef);
      let prodName = "Item";
      let sku = `SKU-${item.productId.slice(-4)}`;
      let unitCost = 50;
      let orderedQty = item.receivedQty;

      if (poItemsMap[item.productId]) {
        const poIt = poItemsMap[item.productId];
        prodName = poIt.productName || prodName;
        sku = poIt.sku || sku;
        unitCost = poIt.unitCost || unitCost;
        orderedQty = poIt.quantity || orderedQty;
      }

      if (prodSnap.exists()) {
        const prod = prodSnap.data() as Product;
        prodName = prod.name || prodName;
        sku = prod.sku || prod.barcode || sku;
        if (!unitCost) unitCost = prod.costPrice || prod.sellingPrice || 50;

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
          reason: `Goods Received Note #${grnNumber} (PO #${poNumber})`,
          referenceNumber: grnNumber,
          userId: "current-user",
          userName,
        });
      }

      grnItems.push({
        productId: item.productId,
        productName: prodName,
        sku,
        orderedQty,
        receivedQty: item.receivedQty,
        acceptedQty: item.acceptedQty ?? item.receivedQty,
        rejectedQty: item.rejectedQty ?? 0,
        damagedQty: item.damagedQty ?? 0,
        unitCost
      });
    }

    const grn: GoodsReceivedNote = {
      id,
      grnNumber,
      poId: payload.poId,
      poNumber,
      supplierId,
      supplierName,
      supplierEmail,
      supplierPhone,
      supplierAddress,
      deliveryNoteNumber: payload.deliveryNoteNumber || `DN-${Date.now().toString().slice(-6)}`,
      date: new Date().toISOString().split("T")[0],
      dateReceived: new Date().toISOString().split("T")[0],
      receivedBy: userName,
      receiverName: userName,
      warehouseLocation: payload.warehouseLocation || "Main Warehouse",
      items: grnItems,
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
