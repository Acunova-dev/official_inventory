import React from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth } from "../context/AuthContext";
import { Lock, Mail, ServerCrash, Key } from "lucide-react";
import { motion } from "motion/react";

const loginSchema = z.object({
  email: z.string().min(1, { message: "Email address is required." }),
  password: z.string().min(1, { message: "Password is required." }),
  rememberMe: z.boolean().optional(),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export const Login: React.FC = () => {
  const { login, error, isLoading } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<any>({
    resolver: zodResolver(loginSchema) as any,
    defaultValues: {
      email: "",
      password: "",
      rememberMe: false,
    },
  });

  const onSubmit = async (values: LoginFormValues) => {
    try {
      await login({ email: values.email, password: values.password });
      navigate("/");
    } catch (err) {
      console.error("Login failed:", err);
    }
  };

  const handleQuickLogin = async (email: string, pass: string) => {
    setValue("email", email);
    setValue("password", pass);
    try {
      await login({ email, password: pass });
      navigate("/");
    } catch (err) {
      console.error("Quick login failed:", err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      
      {/* Decorative background vectors */}
      <div className="absolute top-[20%] left-[10%] w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
      <div className="absolute bottom-[20%] right-[10%] w-80 h-80 bg-teal-500 rounded-full mix-blend-multiply filter blur-3xl opacity-15 animate-delay-1000"></div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex justify-center">
          <div className="flex items-center gap-3 bg-slate-800 border border-slate-700 px-5 py-2.5 rounded-2xl shadow-xl">
            <span className="p-2 bg-blue-500 rounded-xl text-white font-black tracking-wider shadow-lg shadow-blue-500/25">VS</span>
            <span className="font-extrabold text-2xl text-white tracking-tight">VoltSync <span className="font-light text-slate-400">ERP</span></span>
          </div>
        </div>
        <h2 className="mt-8 text-center text-3xl font-extrabold text-white tracking-tight">
          Sign in to your dashboard
        </h2>
        <p className="mt-2 text-center text-sm text-slate-400">
          Multi-tenant Hardware & Billing Manager
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <motion.div 
          className="bg-slate-800/90 backdrop-blur-md py-8 px-4 shadow-2xl rounded-2xl sm:px-10 border border-slate-700"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          {error && (
            <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm rounded-xl flex items-center gap-3">
              <ServerCrash className="shrink-0 text-rose-400" size={18} />
              <p>{error}</p>
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            <div>
              <label className="block text-sm font-semibold text-slate-300">
                Email Address
              </label>
              <div className="mt-1 relative rounded-lg shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Mail size={16} />
                </div>
                <input
                  type="email"
                  id="inp-email"
                  {...register("email")}
                  className="block w-full pl-10 pr-3 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-all"
                  placeholder="name@company.com"
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-xs text-rose-400 font-medium">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-300">
                Password
              </label>
              <div className="mt-1 relative rounded-lg shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Lock size={16} />
                </div>
                <input
                  type="password"
                  id="inp-password"
                  {...register("password")}
                  className="block w-full pl-10 pr-3 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-all"
                  placeholder="••••••••"
                />
              </div>
              {errors.password && (
                <p className="mt-1 text-xs text-rose-400 font-medium">{errors.password.message}</p>
              )}
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  type="checkbox"
                  {...register("rememberMe")}
                  className="h-4 w-4 bg-slate-900 border-slate-700 text-blue-600 focus:ring-blue-500 rounded-sm"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-slate-300 select-none">
                  Remember me
                </label>
              </div>

              <div className="text-sm">
                <span className="font-medium text-slate-400 hover:text-white cursor-pointer select-none transition-colors">
                  Forgot password?
                </span>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-md text-sm font-extrabold text-white bg-blue-600 hover:bg-blue-700 focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all cursor-pointer"
            >
              {isLoading ? "Authenticating security..." : "Verify Identity"}
            </button>
          </form>

          {/* Quick Demo logins block */}
          <div className="mt-6 pt-6 border-t border-slate-705">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-3">Enterprise Access nodes for Demo:</span>
            <div className="space-y-2">
              <button 
                type="button" 
                onClick={() => handleQuickLogin("admin@company.com", "admin123")}
                className="w-full flex items-center justify-between px-3 py-2 bg-slate-900/60 hover:bg-slate-900 text-xs rounded-xl font-medium border border-slate-700 border-dashed text-slate-300 hover:text-white transition-all text-left"
              >
                <div className="flex items-center gap-2">
                  <Key size={12} className="text-purple-400" />
                  <span>Principal Admin</span>
                </div>
                <span className="text-[10px] font-mono text-blue-400 font-bold">Click to Sign In &rarr;</span>
              </button>

              <button 
                type="button" 
                onClick={() => handleQuickLogin("staff@company.com", "staff123")}
                className="w-full flex items-center justify-between px-3 py-2 bg-slate-900/60 hover:bg-slate-900 text-xs rounded-xl font-medium border border-slate-700 border-dashed text-slate-300 hover:text-white transition-all text-left cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Key size={12} className="text-emerald-400" />
                  <span>Sales Staff Member</span>
                </div>
                <span className="text-[10px] font-mono text-emerald-400 font-bold">Click to Sign In &rarr;</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>

    </div>
  );
};
