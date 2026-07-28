import React, { createContext, useContext, useState, useEffect } from "react";
import { AuthUser } from "../types";
import { dummyAuthApi } from "../services/dummyAuthApi";

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  login: (credentials: { email: string; password?: string }) => Promise<void>;
  logout: () => void;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Auto-authenticate with stored dummy session
    const initializeAuth = async () => {
      try {
        const data = await dummyAuthApi.getMe();
        setUser(data.user);
        setToken("dummy-active-token");
      } catch {
        logout();
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = async (credentials: { email: string; password?: string }) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await dummyAuthApi.login(credentials);
      setToken(data.token);
      setUser(data.user);
    } catch (err: any) {
      const msg = err.message || "Failed to log in via dummy API.";
      setError(msg);
      throw new Error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    dummyAuthApi.logout();
    setToken(null);
    setUser(null);
    setError(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout, error }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
