import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { customerService } from "../services/api";
import { Customer } from "../types";
import { useToast } from "../components/Layout";
import { 
  Users, 
  Search, 
  Plus, 
  Trash2, 
  Edit3, 
  Loader2, 
  Mail, 
  Phone, 
  MapPin, 
  Building,
  GraduationCap,
  Store,
  User,
  AlertTriangle
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

const customerSchema = z.object({
  name: z.string().min(2, { message: "Name is required." }),
  type: z.enum(["Individual", "School", "Shop", "Company"]),
  phone: z.string().min(5, { message: "Phone number is too short." }),
  email: z.string().email({ message: "Invalid email formatting." }),
  address: z.string().min(5, { message: "Physical address is required limit details." }),
});

type CustomerFormValues = z.infer<typeof customerSchema>;

export const Customers: React.FC = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const [search, setSearch] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: rawCustomers, isLoading } = useQuery({
    queryKey: ["customers", search],
    queryFn: () => customerService.getAll(search),
  });
  const customers = Array.isArray(rawCustomers) ? rawCustomers : [];

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
  });

  const createMutation = useMutation({
    mutationFn: customerService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      showToast("Customer profile successfully added!", "success");
      handleCloseForm();
    },
    onError: (err: any) => {
      showToast(err.response?.data?.error || "Error adding corporate customer", "error");
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<Customer> }) => customerService.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      showToast("Customer profile updated!", "success");
      handleCloseForm();
    },
    onError: (err: any) => {
      showToast(err.response?.data?.error || "Error updating customer details", "error");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: customerService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      showToast("Customer profile removed from system catalog.", "success");
      setDeleteId(null);
    },
    onError: (err: any) => {
      showToast(err.response?.data?.error || "Error authenticating delete access", "error");
    }
  });

  const handleOpenAddForm = () => {
    setEditingCustomer(null);
    reset({
      name: "",
      type: "Company",
      phone: "",
      email: "",
      address: "",
    });
    setIsFormOpen(true);
  };

  const handleOpenEditForm = (cust: Customer) => {
    setEditingCustomer(cust);
    reset({
      name: cust.name,
      type: cust.type,
      phone: cust.phone,
      email: cust.email,
      address: cust.address,
    });
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingCustomer(null);
    reset();
  };

  const handleFormSubmit = (values: CustomerFormValues) => {
    if (editingCustomer) {
      updateMutation.mutate({ id: editingCustomer.id, payload: values });
    } else {
      createMutation.mutate(values);
    }
  };

  const getTypeIcon = (type: Customer["type"]) => {
    switch (type) {
      case "Company": return <Building size={16} className="text-blue-500" />;
      case "School": return <GraduationCap size={16} className="text-indigo-500" />;
      case "Shop": return <Store size={16} className="text-emerald-500" />;
      case "Individual": return <User size={16} className="text-amber-500" />;
    }
  };

  return (
    <div className="space-y-6">
      
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Customer Directory</h1>
          <p className="text-sm text-slate-500 mt-1">
            Browse trade accounts, educational buyers, local repair stores and individuals.
          </p>
        </div>

        <button
          onClick={handleOpenAddForm}
          id="btn-add-customer"
          className="flex items-center gap-2 px-4 py-2.5 bg-slate-905 text-white text-xs font-bold rounded-xl shadow-md uppercase tracking-wider transition-all self-start sm:self-center"
        >
          <Plus size={15} />
          <span>New Customer</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/95 shadow-xs p-4 flex gap-4 items-center justify-between">
        <div className="relative w-full max-w-md">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 pointer-events-none">
            <Search size={16} />
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500 transition-all font-medium"
            placeholder="Search customer brand name or email..."
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="animate-spin text-blue-600" size={32} />
          <p className="text-slate-400 text-sm font-semibold">Loading customer database records...</p>
        </div>
      ) : customers.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {customers.map((c) => (
            <motion.div
              key={c.id}
              layout
              className="bg-white p-5 rounded-2xl border border-slate-200/95 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group relative"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-bold bg-slate-50 border border-slate-100 text-slate-700 capitalize">
                    {getTypeIcon(c.type)}
                    <span>{c.type}</span>
                  </span>

                  <div className="flex items-center gap-0.5 opacity-40 group-hover:opacity-100 transition-all">
                    <button
                      onClick={() => handleOpenEditForm(c)}
                      className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-colors"
                      title="Edit Profile"
                      id={`btn-edit-cust-${c.id}`}
                    >
                      <Edit3 size={14} />
                    </button>
                    <button
                      onClick={() => setDeleteId(c.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                      title="Delete Profile"
                      id={`btn-delete-cust-${c.id}`}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <h2 className="font-extrabold text-slate-900 group-hover:text-blue-600 transition-colors mt-3 text-base leading-snug">
                  {c.name}
                </h2>
              </div>

              <div className="mt-5 space-y-2 text-xs font-medium text-slate-500">
                <div className="flex items-center gap-2">
                  <span className="truncate" title={c.email}>{c.email || "No Email"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>{c.phone}</span>
                </div>
                <div className="flex items-start gap-2 pt-1 border-t border-slate-50 mt-1 lines-clamp-2 min-h-[36px]">
                  <span className="leading-normal">{c.address}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3 bg-white rounded-2xl border border-slate-200">
          <Users size={40} className="stroke-1 text-slate-300" />
          <p className="text-sm font-semibold">No registered customers match your search criteria</p>
        </div>
      )}

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
                  {editingCustomer ? "Update Contact Profile" : "Register Trade Customer"}
                </h3>
                <button onClick={handleCloseForm} className="text-slate-400 hover:text-slate-650 transition-colors p-1 rounded-lg">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              <form onSubmit={handleSubmit(handleFormSubmit)} className="p-6 space-y-4">
                
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Company / Individual Name</label>
                  <input
                    type="text"
                    {...register("name")}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500 font-semibold"
                    placeholder="e.g. Stanford Medical Labs Inc"
                  />
                  {errors.name && <p className="text-xs text-rose-500 mt-1 font-semibold">{errors.name.message}</p>}
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Customer Account Type</label>
                  <select
                    {...register("type")}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-semibold focus:outline-hidden"
                  >
                    <option value="Company">Company / Enterprise</option>
                    <option value="School">School / College</option>
                    <option value="Shop">Retail Repair Shop</option>
                    <option value="Individual">Individual Walk-in</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Direct e-mail</label>
                    <input
                      type="email"
                      {...register("email")}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500 font-mono"
                      placeholder="buyer@client.com"
                    />
                    {errors.email && <p className="text-xs text-rose-500 mt-1">{errors.email.message}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Phone Number</label>
                    <input
                      type="text"
                      {...register("phone")}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500 font-mono"
                      placeholder="+1 (555) 0120"
                    />
                    {errors.phone && <p className="text-xs text-rose-500 mt-1">{errors.phone.message}</p>}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Physical Delivery / Billing Address</label>
                  <textarea
                    rows={3}
                    {...register("address")}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500"
                    placeholder="e.g. 100 Corporate Pkwy, Suite 400, Cupertino, CA"
                  />
                  {errors.address && <p className="text-xs text-rose-500 mt-1 font-semibold">{errors.address.message}</p>}
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
                    id="btn-customer-submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-950 text-white text-sm font-bold rounded-lg shadow-md transition-all"
                  >
                    {isSubmitting ? "Processing..." : editingCustomer ? "Save Changes" : "Create Account"}
                  </button>
                </div>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleteId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl border border-slate-200 p-6 max-w-sm w-full text-center space-y-4"
            >
              <div className="mx-auto w-12 h-12 bg-rose-50 border border-rose-200 rounded-full flex items-center justify-center text-rose-500">
                <AlertTriangle size={24} />
              </div>
              <div className="space-y-1">
                <h4 className="font-black text-slate-900 text-lg">Remove Trade Cust?</h4>
                <p className="text-xs text-slate-500">This action permanently deletes the selected client account record from your local enterprise node.</p>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteId(null)}
                  className="flex-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => deleteMutation.mutate(deleteId)}
                  id="btn-confirm-delete-cust"
                  className="flex-1 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold rounded-lg shadow-md transition-colors"
                >
                  Confirm Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
