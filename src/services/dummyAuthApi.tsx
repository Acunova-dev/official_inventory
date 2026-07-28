import { AuthUser } from "../types";

export interface DummyAuthResponse {
  token: string;
  user: AuthUser;
}

const STORAGE_KEY = "dummy_auth_session";

/**
 * Custom 1-file Dummy Auth API
 * Replaces server login APIs until real authentication is re-implemented.
 */
export const dummyAuthApi = {
  /**
   * Dummy login handler - accepts any credentials and generates a dummy session
   */
  async login(credentials: { email: string; password?: string }): Promise<DummyAuthResponse> {
    // Simulate brief asynchronous API delay
    await new Promise((resolve) => setTimeout(resolve, 200));

    const emailInput = (credentials.email || "admin@company.com").trim().toLowerCase();
    const isStaff = emailInput.includes("staff");

    const user: AuthUser = {
      id: isStaff ? "usr-staff-101" : "usr-admin-100",
      name: isStaff ? "Sales Staff Member" : "Principal Admin",
      email: emailInput.includes("@") ? emailInput : `${emailInput}@company.com`,
      role: isStaff ? "Staff" : "Principal Admin",
    };

    const token = `dummy-token-${isStaff ? "staff" : "admin"}-${Date.now()}`;
    const response: DummyAuthResponse = { token, user };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(response));

    // Async record login audit log
    fetch("/api/v1/system-logs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        category: "User Authentication",
        action: "USER_LOGIN_SUCCESS",
        userEmail: user.email,
        userName: user.name,
        userRole: user.role,
        details: `User '${user.name}' authenticated successfully into workspace session.`,
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
    await new Promise((resolve) => setTimeout(resolve, 100));
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      throw new Error("No active session");
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
