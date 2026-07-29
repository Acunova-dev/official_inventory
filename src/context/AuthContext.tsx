import React, { createContext, useContext, useState, useEffect } from "react";
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut as firebaseSignOut, 
  User as FirebaseUser 
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, googleProvider, db, handleFirestoreError, OperationType } from "../lib/firebase";
import { AuthUser } from "../types";
import { ROLE_DEFINITIONS } from "../types/rbac";

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  loading: boolean;
  login: (credentials: { email: string; password?: string }) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  signUp: (credentials: { email: string; password: string; name: string; businessName?: string }) => Promise<void>;
  logout: () => Promise<void>;
  switchAccount?: (email: string) => Promise<void>;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Sync user state with Firebase Auth observer
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        try {
          const userDocRef = doc(db, "users", firebaseUser.uid);
          const userSnap = await getDoc(userDocRef);

          if (userSnap.exists()) {
            const userData = userSnap.data() as AuthUser;
            if (userData.disabled) {
              await firebaseSignOut(auth);
              setUser(null);
              setToken(null);
              setError("Account Disabled: Access suspended by Administrator.");
            } else {
              setUser(userData);
              const idToken = await firebaseUser.getIdToken();
              setToken(idToken);
            }
          } else {
            // First time Firebase Auth user - provision default business and user profile
            const businessId = `biz-${firebaseUser.uid}`;
            const businessName = `${firebaseUser.displayName || firebaseUser.email?.split("@")[0] || 'My'} Business`;

            // Create Business
            await setDoc(doc(db, "businesses", businessId), {
              id: businessId,
              name: businessName,
              ownerId: firebaseUser.uid,
              currency: "$",
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            });

            // Create Company Settings
            await setDoc(doc(db, "businesses", businessId, "settings", "company"), {
              businessId,
              companyName: businessName,
              companySubtitle: "Inventory & Billing",
              tagline: "Precision Stock Audit",
              currency: "$",
              email: firebaseUser.email || ""
            });

            // Create User Profile
            const newUser: AuthUser = {
              id: firebaseUser.uid,
              name: firebaseUser.displayName || firebaseUser.email?.split("@")[0] || "Admin",
              email: firebaseUser.email || "",
              role: "Principal Admin",
              businessId,
              status: "Active",
              disabled: false,
              lastLogin: new Date().toISOString(),
              createdDate: new Date().toISOString(),
              customPermissions: ROLE_DEFINITIONS["Principal Admin"]?.permissions
            };

            await setDoc(doc(db, "users", firebaseUser.uid), newUser);
            setUser(newUser);
            const idToken = await firebaseUser.getIdToken();
            setToken(idToken);
          }
        } catch (err) {
          console.error("Error fetching Firebase Auth user profile:", err);
        }
      } else {
        setUser(null);
        setToken(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      const msg = err.message || "Google Sign-In failed.";
      setError(msg);
      setIsLoading(false);
      throw new Error(msg);
    }
  };

  const login = async (credentials: { email: string; password?: string }) => {
    setIsLoading(true);
    setError(null);
    try {
      if (credentials.password) {
        await signInWithEmailAndPassword(auth, credentials.email, credentials.password);
      } else {
        // Fallback email attempt with default pass or prompt
        await signInWithEmailAndPassword(auth, credentials.email, "Password123!");
      }
    } catch (err: any) {
      const msg = err.message || "Login failed. Check your email and password.";
      setError(msg);
      setIsLoading(false);
      throw new Error(msg);
    }
  };

  const signUp = async (credentials: { email: string; password: string; name: string; businessName?: string }) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await createUserWithEmailAndPassword(auth, credentials.email, credentials.password);
      const firebaseUser = res.user;

      const businessId = `biz-${firebaseUser.uid}`;
      const bName = credentials.businessName || `${credentials.name}'s Business`;

      // Provision Business
      await setDoc(doc(db, "businesses", businessId), {
        id: businessId,
        name: bName,
        ownerId: firebaseUser.uid,
        currency: "$",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      // Provision User Profile
      const newUser: AuthUser = {
        id: firebaseUser.uid,
        name: credentials.name,
        email: credentials.email,
        role: "Principal Admin",
        businessId,
        status: "Active",
        disabled: false,
        lastLogin: new Date().toISOString(),
        createdDate: new Date().toISOString(),
        customPermissions: ROLE_DEFINITIONS["Principal Admin"]?.permissions
      };

      await setDoc(doc(db, "users", firebaseUser.uid), newUser);
      setUser(newUser);
      const idToken = await firebaseUser.getIdToken();
      setToken(idToken);
    } catch (err: any) {
      const msg = err.message || "Registration failed.";
      setError(msg);
      setIsLoading(false);
      throw new Error(msg);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await firebaseSignOut(auth);
      setUser(null);
      setToken(null);
      setError(null);
    } catch (err: any) {
      console.error("Logout error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider 
      value={{ 
        user, 
        token, 
        isLoading, 
        loading: isLoading, 
        login, 
        loginWithGoogle, 
        signUp, 
        logout, 
        error 
      }}
    >
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
