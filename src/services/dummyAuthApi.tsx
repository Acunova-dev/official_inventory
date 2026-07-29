import { AuthUser } from "../types";
import { ROLE_DEFINITIONS, AppRole } from "../types/rbac";

export interface DummyAuthResponse {
  token: string;
  user: AuthUser;
}

const STORAGE_KEY = "dummy_auth_session";

export const PRESET_ACCOUNTS: Array<{
  id: string;
  name: string;
  email: string;
  role: AppRole;
  status: "Active" | "Inactive";
  lastLogin: string;
  createdDate: string;
}> = [
  {
    id: "usr-admin-100",
    name: "Eleanor Vance (Principal Admin)",
    email: "admin@volt.com",
    role: "Principal Admin",
    status: "Active",
    lastLogin: new Date().toISOString(),
    createdDate: "2026-01-10T08:00:00.000Z"
  },
  {
    id: "usr-inv-102",
    name: "Marcus Thorne (Inventory Manager)",
    email: "inventory@volt.com",
    role: "Inventory Manager",
    status: "Active",
    lastLogin: new Date().toISOString(),
    createdDate: "2026-02-14T09:30:00.000Z"
  },
  {
    id: "usr-sales-103",
    name: "Sarah Jenkins (Sales Person)",
    email: "sales@volt.com",
    role: "Sales Person",
    status: "Active",
    lastLogin: new Date().toISOString(),
    createdDate: "2026-03-01T11:15:00.000Z"
  },
  {
    id: "usr-staff-101",
    name: "David Chen (Staff Member)",
    email: "staff@volt.com",
    role: "Staff Member",
    status: "Active",
    lastLogin: new Date().toISOString(),
    createdDate: "2026-03-20T14:22:00.000Z"
  },
  {
    id: "usr-inactive-104",
    name: "John Inactive (Suspended Account)",
    email: "inactive@volt.com",
    role: "Sales Person",
    status: "Inactive",
    lastLogin: "2026-05-01T10:00:00.000Z",
    createdDate: "2026-04-10T10:00:00.000Z"
  }
];

export const dummyAuthApi = {
  /**
   * Dummy login handler - accepts preset emails or role keywords
   */
  async login(credentials: { email: string; password?: string }): Promise<DummyAuthResponse> {
    await new Promise((resolve) => setTimeout(resolve, 150));

    const emailInput = (credentials.email || "admin@volt.com").trim().toLowerCase();

    let matched = PRESET_ACCOUNTS.find(a => a.email.toLowerCase() === emailInput);

    if (!matched) {
      if (emailInput.includes("sales")) {
        matched = PRESET_ACCOUNTS.find(a => a.role === "Sales Person");
      } else if (emailInput.includes("inventory") || emailInput.includes("warehouse")) {
        matched = PRESET_ACCOUNTS.find(a => a.role === "Inventory Manager");
      } else if (emailInput.includes("inactive") || emailInput.includes("suspended")) {
        matched = PRESET_ACCOUNTS.find(a => a.status === "Inactive");
      } else if (emailInput.includes("staff")) {
        matched = PRESET_ACCOUNTS.find(a => a.role === "Staff Member");
      } else {
        matched = PRESET_ACCOUNTS[0]; // Principal Admin default
      }
    }

    if (matched && (matched.status as string) === "Inactive") {
      throw new Error("Account Disabled: Your login credential has been suspended by a Principal Administrator.");
    }

    const user: AuthUser = {
      id: matched.id,
      name: matched.name,
      email: matched.email,
      role: matched.role,
      status: matched.status,
      disabled: (matched.status as string) === "Inactive",
      lastLogin: new Date().toISOString(),
      createdDate: matched.createdDate,
      customPermissions: ROLE_DEFINITIONS[matched.role]?.permissions
    };

    const token = `dummy-token-${user.id}-${Date.now()}`;
    const response: DummyAuthResponse = { token, user };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(response));

    // Audit log
    fetch("/api/v1/system-logs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        category: "User Authentication",
        action: "USER_LOGIN_SUCCESS",
        userEmail: user.email,
        userName: user.name,
        userRole: user.role,
        details: `User '${user.name}' logged in successfully under role '${user.role}'.`,
        targetId: user.id,
        severity: "success"
      })
    }).catch(() => {});

    return response;
  },

  /**
   * Retrieves active user session from local state
   */
  async getMe(): Promise<{ user: AuthUser }> {
    await new Promise((resolve) => setTimeout(resolve, 50));
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // Default auto-login as Principal Admin if empty
      const defaultUser = PRESET_ACCOUNTS[0];
      const user: AuthUser = {
        id: defaultUser.id,
        name: defaultUser.name,
        email: defaultUser.email,
        role: defaultUser.role,
        status: defaultUser.status,
        disabled: false,
        lastLogin: new Date().toISOString(),
        createdDate: defaultUser.createdDate,
        customPermissions: ROLE_DEFINITIONS[defaultUser.role]?.permissions
      };
      const response: DummyAuthResponse = { token: `dummy-token-${user.id}`, user };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(response));
      return { user };
    }
    const session: DummyAuthResponse = JSON.parse(raw);
    return { user: session.user };
  },

  /**
   * Clears dummy user session
   */
  async logout(): Promise<void> {
    localStorage.removeItem(STORAGE_KEY);
  }
};

