export type Permission =
  // Product Catalog & Stock
  | "products.view"
  | "products.create"
  | "products.edit"
  | "products.delete"
  | "categories.manage"
  | "stock.view"
  | "stock.adjust"
  | "stock.transfer"
  
  // Sales Operations
  | "sales.view"
  | "sales.create"
  | "sales.edit_draft"
  | "sales.delete_draft"
  | "receipts.view"
  | "receipts.create"
  
  // Purchasing & Vendors
  | "purchasing.view"
  | "purchasing.create"
  | "purchasing.receive"
  | "suppliers.manage"
  
  // Financial Ledgers & Cashflow
  | "financials.view"
  | "financials.manage"
  | "vouchers.approve"
  
  // Reporting & Insights
  | "reports.view.sales"
  | "reports.view.inventory"
  | "reports.view.financial"
  
  // Administration & Security
  | "users.manage"
  | "settings.manage"
  | "system_logs.view"
  | "account.view";

export type AppRole = 
  | "Principal Admin"
  | "Inventory Manager"
  | "Sales Person"
  | "Staff Member"
  | "Accountant"
  | "Warehouse Clerk"
  | "Procurement Officer";

export interface RoleDefinition {
  name: AppRole;
  description: string;
  badgeColor: string;
  permissions: Permission[];
}

export const ROLE_DEFINITIONS: Record<AppRole, RoleDefinition> = {
  "Principal Admin": {
    name: "Principal Admin",
    description: "Full system control with unrestricted access to all modules, financial ledgers, and user management.",
    badgeColor: "bg-purple-100 text-purple-800 border-purple-200",
    permissions: [
      "products.view", "products.create", "products.edit", "products.delete", "categories.manage",
      "stock.view", "stock.adjust", "stock.transfer",
      "sales.view", "sales.create", "sales.edit_draft", "sales.delete_draft", "receipts.view", "receipts.create",
      "purchasing.view", "purchasing.create", "purchasing.receive", "suppliers.manage",
      "financials.view", "financials.manage", "vouchers.approve",
      "reports.view.sales", "reports.view.inventory", "reports.view.financial",
      "users.manage", "settings.manage", "system_logs.view", "account.view"
    ]
  },
  "Sales Person": {
    name: "Sales Person",
    description: "Customer-facing role focused on quotations, sales receipts, customer management, and stock availability checks.",
    badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-200",
    permissions: [
      "sales.view", "sales.create", "sales.edit_draft",
      "receipts.view", "receipts.create",
      "products.view", "stock.view",
      "reports.view.sales",
      "account.view"
    ]
  },
  "Inventory Manager": {
    name: "Inventory Manager",
    description: "Warehouse and stock control role managing product catalog, reorder levels, purchase orders, and goods receiving (GRN).",
    badgeColor: "bg-blue-100 text-blue-800 border-blue-200",
    permissions: [
      "products.view", "products.create", "products.edit", "products.delete", "categories.manage",
      "stock.view", "stock.adjust", "stock.transfer",
      "purchasing.view", "purchasing.create", "purchasing.receive", "suppliers.manage",
      "reports.view.inventory",
      "account.view"
    ]
  },
  "Staff Member": {
    name: "Staff Member",
    description: "Standard operational role with access to everyday front-line tasks.",
    badgeColor: "bg-slate-100 text-slate-800 border-slate-200",
    permissions: [
      "products.view", "stock.view",
      "sales.view", "sales.create", "sales.edit_draft",
      "receipts.view", "receipts.create",
      "purchasing.view",
      "reports.view.sales",
      "account.view"
    ]
  },
  "Accountant": {
    name: "Accountant",
    description: "Financial management role overseeing cash books, bank accounts, payment vouchers, and financial reports.",
    badgeColor: "bg-amber-100 text-amber-800 border-amber-200",
    permissions: [
      "financials.view", "financials.manage", "vouchers.approve",
      "sales.view", "receipts.view",
      "purchasing.view",
      "reports.view.sales", "reports.view.inventory", "reports.view.financial",
      "account.view"
    ]
  },
  "Warehouse Clerk": {
    name: "Warehouse Clerk",
    description: "Operational warehouse role handling stock transfers, count adjustments, and goods receiving verification.",
    badgeColor: "bg-indigo-100 text-indigo-800 border-indigo-200",
    permissions: [
      "products.view", "stock.view", "stock.adjust", "stock.transfer",
      "purchasing.view", "purchasing.receive",
      "reports.view.inventory",
      "account.view"
    ]
  },
  "Procurement Officer": {
    name: "Procurement Officer",
    description: "Vendor and purchasing specialist responsible for supplier relations and purchase order lifecycles.",
    badgeColor: "bg-teal-100 text-teal-800 border-teal-200",
    permissions: [
      "purchasing.view", "purchasing.create", "suppliers.manage",
      "products.view", "stock.view",
      "reports.view.inventory",
      "account.view"
    ]
  }
};

/**
 * Checks whether a given user role (and optional custom overrides) possesses a target permission.
 */
export function hasPermission(
  role: string | undefined | null,
  permission: Permission,
  customPermissions?: Permission[]
): boolean {
  if (!role) return false;

  // Custom permission overrides take immediate precedence
  if (customPermissions && customPermissions.includes(permission)) {
    return true;
  }

  const roleDef = ROLE_DEFINITIONS[role as AppRole];
  if (!roleDef) {
    // Fallback logic for legacy role names
    if (role === "Principal Admin") return true;
    if (role === "Staff" || role === "Staff Member") {
      return ROLE_DEFINITIONS["Staff Member"].permissions.includes(permission);
    }
    return false;
  }

  return roleDef.permissions.includes(permission);
}
