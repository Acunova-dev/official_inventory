import React, { createContext, useContext, useState, useEffect } from "react";
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut as firebaseSignOut, 
  User as FirebaseUser 
} from "firebase/auth";
import { doc, getDoc, setDoc, collection, query, where, getDocs, deleteDoc } from "firebase/firestore";
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
            // Check if user account was pre-provisioned by an Administrator for an existing business
            let preProvisionedUser: AuthUser | null = null;
            if (firebaseUser.email) {
              try {
                const q = query(collection(db, "users"), where("email", "==", firebaseUser.email));
                const qSnap = await getDocs(q);
                if (!qSnap.empty) {
                  const provDoc = qSnap.docs[0];
                  const provData = provDoc.data() as AuthUser;
                  preProvisionedUser = {
                    ...provData,
                    id: firebaseUser.uid,
                    status: "Active",
                    disabled: false,
                    lastLogin: new Date().toISOString(),
                    customPermissions: provData.customPermissions || ROLE_DEFINITIONS[provData.role as keyof typeof ROLE_DEFINITIONS]?.permissions
                  };
                  if (provDoc.id !== firebaseUser.uid) {
                    try {
                      await deleteDoc(doc(db, "users", provDoc.id));
                    } catch (e) {
                      console.warn("Could not delete temp provisioned user doc:", e);
                    }
                  }
                }
              } catch (e) {
                console.warn("Pre-provisioned user check skipped:", e);
              }
            }

            if (preProvisionedUser) {
              await setDoc(doc(db, "users", firebaseUser.uid), preProvisionedUser);
              if (preProvisionedUser.disabled) {
                await firebaseSignOut(auth);
                setUser(null);
                setToken(null);
                setError("Account Disabled: Access suspended by Administrator.");
              } else {
                setUser(preProvisionedUser);
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
    const pass = credentials.password || "Password123!";
    try {
      await signInWithEmailAndPassword(auth, credentials.email, pass);
    } catch (err: any) {
      // Check if user account was pre-provisioned in Firestore by an Administrator
      if (credentials.email) {
        try {
          const q = query(collection(db, "users"), where("email", "==", credentials.email));
          const qSnap = await getDocs(q);
          if (!qSnap.empty) {
            const provDoc = qSnap.docs[0].data() as AuthUser & { password?: string };
            if (provDoc.disabled) {
              const msg = "Account Disabled: Access suspended by Administrator.";
              setError(msg);
              setIsLoading(false);
              throw new Error(msg);
            }

            // Verify password if provisioned
            if (provDoc.password && provDoc.password !== pass) {
              const msg = "Invalid email or password.";
              setError(msg);
              setIsLoading(false);
              throw new Error(msg);
            }

            // Provision Firebase Auth identity for the pre-provisioned account
            await createUserWithEmailAndPassword(auth, credentials.email, pass);
            return;
          }
        } catch (provErr: any) {
          if (provErr.message?.includes("Account Disabled") || provErr.message?.includes("Invalid email")) {
            throw provErr;
          }
          console.warn("Pre-provisioned login attempt fallback note:", provErr);
        }
      }

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
      let isPreProvisioned = false;
      try {
        const q = query(collection(db, "users"), where("email", "==", credentials.email));
        const qSnap = await getDocs(q);
        if (!qSnap.empty) {
          isPreProvisioned = true;
        }
      } catch (e) {
        console.warn("Pre-provision check during signup error:", e);
      }

      const res = await createUserWithEmailAndPassword(auth, credentials.email, credentials.password);
      const firebaseUser = res.user;

      if (!isPreProvisioned) {
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

        // Provision Company Settings
        await setDoc(doc(db, "businesses", businessId, "settings", "company"), {
          businessId,
          companyName: bName,
          companySubtitle: "Inventory & Billing",
          tagline: "Precision Stock Audit",
          currency: "$",
          email: credentials.email
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
      }
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
