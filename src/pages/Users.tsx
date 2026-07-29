import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { userService } from "../services/api";
import { User } from "../types";
import { useToast } from "../components/Layout";
import { useAuth } from "../context/AuthContext";
import { 
  Users, 
  Shield, 
  Plus, 
  Edit3, 
  Loader2, 
  Lock,
  AlertOctagon
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

const userSchema = z.object({
  name: z.string().min(3, { message: "Name must be at least 3 characters." }),
  email: z.string().email({ message: "Invalid email formatting." }),
  role: z.enum(["Principal Admin", "Inventory Manager", "Sales Person", "Staff Member", "Staff"]),
  password: z.string().min(4, { message: "Specify password of at least 4 characters." }).optional().or(z.literal("")),
});

type UserFormValues = z.infer<typeof userSchema>;

export const UsersManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { user: currentAuthUser } = useAuth();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Load backend corporate personnel list
  const { data: rawUsers, isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: userService.getAll,
  });
  const users = Array.isArray(rawUsers) ? rawUsers : [];

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
  });

  const createMutation = useMutation({
    mutationFn: userService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      showToast("Employee account provisioned and active!", "success");
      handleCloseForm();
    },
    onError: (err: any) => {
      showToast(err.response?.data?.error || "Error provisioning account", "error");
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<User> }) => userService.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      showToast("Personnel security credentials saved!", "success");
      handleCloseForm();
    },
    onError: (err: any) => {
      showToast(err.response?.data?.error || "Error updating employee profile", "error");
    }
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, disabled }: { id: string; disabled: boolean }) => userService.update(id, { disabled }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      showToast(`Account login capability ${data.disabled ? "safely revoked" : "fully restored"}.`, "success");
    },
    onError: (err: any) => {
      showToast(err.response?.data?.error || "Error toggling credential access", "error");
    }
  });

  const handleOpenAddForm = () => {
    setEditingUser(null);
    reset({
      name: "",
      email: "",
      role: "Staff",
      password: "",
    });
    setIsFormOpen(true);
  };

  const handleOpenEditForm = (u: User) => {
    setEditingUser(u);
    reset({
      name: u.name,
      email: u.email,
      role: u.role as any,
      password: "",
    });
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingUser(null);
    reset();
  };

  const handleFormSubmit = (values: UserFormValues) => {
    const payload: Partial<User> & { password?: string } = {
      name: values.name,
      email: values.email,
      role: values.role,
    };
    if (values.password) {
      payload.password = values.password;
    }

    if (editingUser) {
      updateMutation.mutate({ id: editingUser.id, payload });
    } else {
      if (!values.password) {
        showToast("Prohibitive: Password is required for initial provisioning.", "error");
        return;
      }
      createMutation.mutate(payload as any);
    }
  };

  // Restrict view if Staff somehow breaches routing guard
  if (currentAuthUser?.role !== "Principal Admin") {
    return (
      <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm max-w-lg mx-auto text-center space-y-4 my-10">
        <div className="h-12 w-12 bg-rose-50 border border-rose-200 rounded-full flex items-center justify-center text-rose-500 mx-auto">
          <AlertOctagon size={24} />
        </div>
        <h2 className="text-lg font-black text-slate-900 tracking-tight">Security Access Exception</h2>
        <p className="text-xs text-slate-500 leading-relaxed">
          The requested administration console is restricted exclusively to <strong>Principal Administrators</strong>. If you believe this is an error, re-log with administrative credentials.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">User Administration</h1>
          <p className="text-sm text-slate-500 mt-1">
            Provision staff profiles, manage organizational scopes, and suspend login capability instantly.
          </p>
        </div>

        <button
          onClick={handleOpenAddForm}
          id="btn-add-user"
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-md transition-all self-start sm:self-center cursor-pointer"
        >
          <Plus size={16} />
          <span>Provision User</span>
        </button>
      </div>

      {/* Admin Personnel List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-4 text-slate-400">
            <Loader2 className="animate-spin text-blue-600" size={32} />
            <p className="text-sm font-semibold">Reading user access levels...</p>
          </div>
        ) : users.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-xs font-bold text-slate-500 uppercase font-mono tracking-wider border-b border-slate-200">
                  <th className="py-4 px-6">Account Operator</th>
                  <th className="py-4 px-6">Direct Email</th>
                  <th className="py-4 px-6">User Role</th>
                  <th className="py-4 px-6 text-center">Login Status</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm font-medium whitespace-nowrap">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 bg-slate-100 border border-slate-200 rounded-xl flex items-center justify-center text-slate-700 font-bold font-mono">
                          {u.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-extrabold text-slate-900">{u.name}</p>
                          <span className="text-[10px] text-slate-400 font-mono">ID: {u.id.substring(0, 8)}...</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-slate-600 font-mono text-xs">{u.email}</td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${
                        u.role === "Principal Admin" 
                          ? "bg-purple-50 text-purple-700 border border-purple-100" 
                          : "bg-blue-50 text-blue-700 border border-blue-100"
                      }`}>
                        <Shield size={12} />
                        <span>{u.role === "Staff" ? "Staff Member" : u.role}</span>
                      </span>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${
                        !u.disabled 
                          ? "bg-emerald-50 text-emerald-700" 
                          : "bg-rose-50 text-rose-700"
                      }`}>
                        {!u.disabled ? "Active Link" : "Credential Suspended"}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {currentAuthUser?.id !== u.id && (
                          <button
                            onClick={() => toggleStatusMutation.mutate({ id: u.id, disabled: !u.disabled })}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                              !u.disabled 
                                ? "bg-rose-50 border-rose-100 text-rose-600 hover:bg-rose-100" 
                                : "bg-emerald-50 border-emerald-100 text-emerald-600 hover:bg-emerald-100"
                            }`}
                          >
                            {!u.disabled ? "Suspend" : "Activate"}
                          </button>
                        )}
                        <button
                          onClick={() => handleOpenEditForm(u)}
                          className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors border border-slate-100"
                          id={`btn-edit-user-${u.id}`}
                        >
                          <Edit3 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
            <Users size={40} className="stroke-1 text-slate-300" />
            <p className="text-sm font-semibold">No active staff directories found</p>
          </div>
        )}
      </div>

      {/* Add / Edit user form */}
      <AnimatePresence>
        {isFormOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-slate-150 bg-slate-50 flex items-center justify-between">
                <h3 className="font-black text-slate-900 tracking-tight text-lg">
                  {editingUser ? "Modify Credential Properties" : "Provision Staff Account"}
                </h3>
                <button onClick={handleCloseForm} className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              <form onSubmit={handleSubmit(handleFormSubmit)} className="p-6 space-y-4">
                
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Interactive Name</label>
                  <input
                    type="text"
                    {...register("name" as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500/25 font-semibold"
                    placeholder="e.g. Josh Repair"
                  />
                  {errors.name && <p className="text-xs text-rose-500 mt-1 font-semibold">{errors.name.message}</p>}
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Company E-mail address</label>
                  <input
                    type="email"
                    {...register("email" as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500/25 font-mono"
                    placeholder="operator@vync.com"
                  />
                  {errors.email && <p className="text-xs text-rose-500 mt-1">{errors.email.message}</p>}
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Security Access Role</label>
                  <select
                    {...register("role" as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-semibold focus:outline-hidden"
                  >
                    <option value="Inventory Manager">Inventory Manager (Stock Control, POs, GRN)</option>
                    <option value="Sales Person">Sales Person (Quotations, Receipts, Customers)</option>
                    <option value="Staff Member">Staff Member (General Operations)</option>
                    <option value="Principal Admin">Principal Admin (Full Access & Security)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                    {editingUser ? "Reset Password (Leave blank to keep existing)" : "Operator Security Password"}
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                      <Lock size={14} />
                    </span>
                    <input
                      type="password"
                      {...register("password" as any)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2.5 text-sm focus:outline-hidden font-mono"
                      placeholder="••••••••"
                    />
                  </div>
                  {errors.password && <p className="text-xs text-rose-500 mt-1">{errors.password.message}</p>}
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={handleCloseForm}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    id="btn-user-submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-lg shadow-md hover:shadow-lg transition-all"
                  >
                    {isSubmitting ? "Provisioning..." : editingUser ? "Save credentials" : "Create operator profile"}
                  </button>
                </div>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
