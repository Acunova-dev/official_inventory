import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth } from "../context/AuthContext";
import { Lock, Mail, ServerCrash, Building2, User as UserIcon, LogIn, UserPlus } from "lucide-react";
import { motion } from "motion/react";
import logoImg from "../pic.png";

const loginSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
});

const signUpSchema = z.object({
  name: z.string().min(2, { message: "Name is required." }),
  businessName: z.string().min(2, { message: "Business name is required." }),
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
});

export const Login: React.FC = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const { login, loginWithGoogle, signUp, error, isLoading } = useAuth();
  const navigate = useNavigate();

  const {
    register: registerLogin,
    handleSubmit: handleSubmitLogin,
    formState: { errors: loginErrors },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const {
    register: registerSignUp,
    handleSubmit: handleSubmitSignUp,
    formState: { errors: signUpErrors },
  } = useForm({
    resolver: zodResolver(signUpSchema),
    defaultValues: { name: "", businessName: "", email: "", password: "" },
  });

  const onLoginSubmit = async (values: any) => {
    try {
      await login({ email: values.email, password: values.password });
      navigate("/");
    } catch (err) {
      console.error("Login failed:", err);
    }
  };

  const onSignUpSubmit = async (values: any) => {
    try {
      await signUp({
        email: values.email,
        password: values.password,
        name: values.name,
        businessName: values.businessName,
      });
      navigate("/");
    } catch (err) {
      console.error("Sign-up failed:", err);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      await loginWithGoogle();
      navigate("/");
    } catch (err) {
      console.error("Google login failed:", err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      
      {/* Background radial blurs */}
      <div className="absolute top-[20%] left-[10%] w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
      <div className="absolute bottom-[20%] right-[10%] w-80 h-80 bg-teal-500 rounded-full mix-blend-multiply filter blur-3xl opacity-15"></div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex justify-center">
          <div className="flex items-center gap-3 bg-slate-800 border border-slate-700 px-5 py-2.5 rounded-2xl shadow-xl">
            <img src={logoImg} alt="Acu-invent Logo" className="h-10 w-auto object-contain rounded-md" />
            <span className="font-extrabold text-2xl text-white tracking-tight">Acu-invent <span className="font-light text-slate-400 text-sm">Inventory Manager</span></span>
          </div>
        </div>
        <h2 className="mt-8 text-center text-3xl font-extrabold text-white tracking-tight">
          {isSignUp ? "Create a Business Account" : "Sign in to your Business"}
        </h2>
        <p className="mt-2 text-center text-sm text-slate-400">
          Persistent Cloud Firestore Inventory & Multi-Tenant Management
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <motion.div 
          className="bg-slate-800/90 backdrop-blur-md py-8 px-4 shadow-2xl rounded-2xl sm:px-10 border border-slate-700"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          {/* Mode Selector Tabs */}
          <div className="flex p-1 bg-slate-900 rounded-xl mb-6">
            <button
              type="button"
              onClick={() => setIsSignUp(false)}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
                !isSignUp ? "bg-blue-600 text-white shadow-md" : "text-slate-400 hover:text-white"
              }`}
            >
              <LogIn size={14} />
              <span>Sign In</span>
            </button>
            <button
              type="button"
              onClick={() => setIsSignUp(true)}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
                isSignUp ? "bg-blue-600 text-white shadow-md" : "text-slate-400 hover:text-white"
              }`}
            >
              <UserPlus size={14} />
              <span>Register Business</span>
            </button>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm rounded-xl flex items-center gap-3">
              <ServerCrash className="shrink-0 text-rose-400" size={18} />
              <p className="text-xs leading-relaxed">{error}</p>
            </div>
          )}

          {/* Google SSO Button */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-3 py-2.5 px-4 bg-white hover:bg-slate-100 text-slate-800 text-sm font-bold rounded-xl shadow-md transition-all cursor-pointer mb-6"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            <span>Continue with Google</span>
          </button>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-700"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-slate-800 px-3 text-slate-400 font-semibold">Or with Email</span>
            </div>
          </div>

          {!isSignUp ? (
            /* Sign In Form */
            <form className="space-y-4" onSubmit={handleSubmitLogin(onLoginSubmit)}>
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Email Address
                </label>
                <div className="relative rounded-xl shadow-xs">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <Mail size={16} />
                  </div>
                  <input
                    type="email"
                    {...registerLogin("email")}
                    className="block w-full pl-10 pr-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="admin@business.com"
                  />
                </div>
                {loginErrors.email && (
                  <p className="mt-1 text-xs text-rose-400 font-medium">{loginErrors.email.message as string}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Password
                </label>
                <div className="relative rounded-xl shadow-xs">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <Lock size={16} />
                  </div>
                  <input
                    type="password"
                    {...registerLogin("password")}
                    className="block w-full pl-10 pr-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="••••••••"
                  />
                </div>
                {loginErrors.password && (
                  <p className="mt-1 text-xs text-rose-400 font-medium">{loginErrors.password.message as string}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 flex justify-center py-3 px-4 rounded-xl shadow-md text-sm font-extrabold text-white bg-blue-600 hover:bg-blue-700 transition-all cursor-pointer"
              >
                {isLoading ? "Signing In..." : "Sign In"}
              </button>
            </form>
          ) : (
            /* Sign Up / Registration Form */
            <form className="space-y-4" onSubmit={handleSubmitSignUp(onSignUpSubmit)}>
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Your Full Name
                </label>
                <div className="relative rounded-xl shadow-xs">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <UserIcon size={16} />
                  </div>
                  <input
                    type="text"
                    {...registerSignUp("name")}
                    className="block w-full pl-10 pr-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="Jane Doe"
                  />
                </div>
                {signUpErrors.name && (
                  <p className="mt-1 text-xs text-rose-400 font-medium">{signUpErrors.name.message as string}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Business / Company Name
                </label>
                <div className="relative rounded-xl shadow-xs">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <Building2 size={16} />
                  </div>
                  <input
                    type="text"
                    {...registerSignUp("businessName")}
                    className="block w-full pl-10 pr-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="Acu Hardware Ltd"
                  />
                </div>
                {signUpErrors.businessName && (
                  <p className="mt-1 text-xs text-rose-400 font-medium">{signUpErrors.businessName.message as string}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Email Address
                </label>
                <div className="relative rounded-xl shadow-xs">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <Mail size={16} />
                  </div>
                  <input
                    type="email"
                    {...registerSignUp("email")}
                    className="block w-full pl-10 pr-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="jane@company.com"
                  />
                </div>
                {signUpErrors.email && (
                  <p className="mt-1 text-xs text-rose-400 font-medium">{signUpErrors.email.message as string}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Password
                </label>
                <div className="relative rounded-xl shadow-xs">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <Lock size={16} />
                  </div>
                  <input
                    type="password"
                    {...registerSignUp("password")}
                    className="block w-full pl-10 pr-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="••••••••"
                  />
                </div>
                {signUpErrors.password && (
                  <p className="mt-1 text-xs text-rose-400 font-medium">{signUpErrors.password.message as string}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 flex justify-center py-3 px-4 rounded-xl shadow-md text-sm font-extrabold text-white bg-blue-600 hover:bg-blue-700 transition-all cursor-pointer"
              >
                {isLoading ? "Creating Business..." : "Register & Launch Business"}
              </button>
            </form>
          )}
        </motion.div>
      </div>

    </div>
  );
};
