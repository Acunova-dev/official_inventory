import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supplierService } from "../services/api";
import { Supplier } from "../types";
import { useToast } from "../components/Layout";
import { 
  Building2, 
  Plus, 
  Trash2, 
  Edit3, 
  Loader2, 
  AlertTriangle 
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

const supplierSchema = z.object({
  name: z.string().min(2, { message: "Name is required." }),
  phone: z.string().min(5, { message: "Phone number is too short." }),
  email: z.string().email({ message: "Invalid email formatting." }),
  address: z.string().min(5, { message: "Physical address is required." }),
});

type SupplierFormValues = z.infer<typeof supplierSchema>;

export const Suppliers: React.FC = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: rawSuppliers, isLoading } = useQuery({
    queryKey: ["suppliers"],
    queryFn: supplierService.getAll,
  });
  const suppliers = Array.isArray(rawSuppliers) ? rawSuppliers : [];

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierSchema),
  });

  const createMutation = useMutation({
    mutationFn: supplierService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      showToast("Supplier catalog record added!", "success");
      handleCloseForm();
    },
    onError: (err: any) => {
      showToast(err.response?.data?.error || "Error adding supplier partner", "error");
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<Supplier> }) => supplierService.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      showToast("Supplier partner updated!", "success");
      handleCloseForm();
    },
    onError: (err: any) => {
      showToast(err.response?.data?.error || "Error updating supplier contact properties", "error");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: supplierService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      showToast("Supplier removed from current operator node.", "success");
      setDeleteId(null);
    },
    onError: (err: any) => {
      showToast(err.response?.data?.error || "Error deauthorizing supplier", "error");
    }
  });

  const handleOpenAddForm = () => {
    setEditingSupplier(null);
    reset({
      name: "",
      phone: "",
      email: "",
      address: "",
    });
    setIsFormOpen(true);
  };

  const handleOpenEditForm = (supp: Supplier) => {
    setEditingSupplier(supp);
    reset({
      name: supp.name,
      phone: supp.phone,
      email: supp.email,
      address: supp.address,
    });
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingSupplier(null);
    reset();
  };

  const handleFormSubmit = (values: SupplierFormValues) => {
    if (editingSupplier) {
      updateMutation.mutate({ id: editingSupplier.id, payload: values });
    } else {
      createMutation.mutate(values);
    }
  };

  return (
    <div className="space-y-6">
      
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Supplier Directory</h1>
          <p className="text-sm text-slate-500 mt-1">
            Maintain wholesale hardware channels, parts importers, and distributor routes.
          </p>
        </div>

        <button
          onClick={handleOpenAddForm}
          id="btn-add-supplier"
          className="flex items-center gap-2 px-4 py-2.5 bg-slate-905 text-white text-xs font-bold rounded-xl shadow-md uppercase tracking-wider transition-all self-start sm:self-center"
        >
          <Plus size={15} />
          <span>New Supplier</span>
        </button>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="animate-spin text-blue-600" size={32} />
          <p className="text-slate-400 text-sm font-semibold">Retrieving wholesale partner lists...</p>
        </div>
      ) : suppliers.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {suppliers.map((s) => (
            <motion.div
              key={s.id}
              layout
              className="bg-white p-6 rounded-2xl border border-slate-200/95 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group relative"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="h-10 w-10 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center text-slate-700">
                    <Building2 size={18} className="text-blue-600" />
                  </div>

                  <div className="flex items-center gap-1 opacity-45 group-hover:opacity-100 transition-all">
                    <button
                      onClick={() => handleOpenEditForm(s)}
                      className="p-1.5 rounded-lg text-slate-605 hover:bg-slate-100"
                      title="Edit Contractor"
                      id={`btn-edit-sup-${s.id}`}
                    >
                      <Edit3 size={14} />
                    </button>
                    <button
                      onClick={() => setDeleteId(s.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                      title="Remove Contractor"
                      id={`btn-delete-sup-${s.id}`}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <h2 className="font-extrabold text-slate-900 group-hover:text-blue-605 transition-colors mt-4 text-base leading-snug">
                  {s.name}
                </h2>
              </div>

              <div className="mt-5 pt-4 border-t border-slate-50 space-y-2 text-xs font-medium text-slate-500">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Email:</span>
                  <span className="font-mono text-slate-750">{s.email}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Phone:</span>
                  <span className="font-mono text-slate-750">{s.phone}</span>
                </div>
                <div className="flex items-start justify-between gap-4 pt-1">
                  <span className="text-[10px] text-slate-400 font-bold uppercase shrink-0">Address:</span>
                  <span className="text-right text-slate-700">{s.address}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3 bg-white rounded-2xl border border-slate-200">
          <Building2 size={40} className="stroke-1 text-slate-300" />
          <p className="text-sm font-semibold">No wholesale suppliers added yet</p>
        </div>
      )}

      <AnimatePresence>
        {isFormOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-sm w-full overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-slate-150 bg-slate-50 flex items-center justify-between">
                <h3 className="font-black text-slate-900 tracking-tight text-lg">
                  {editingSupplier ? "Configure Partner Details" : "Register Distributor Partner"}
                </h3>
                <button onClick={handleCloseForm} className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              <form onSubmit={handleSubmit(handleFormSubmit)} className="p-6 space-y-4">
                
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Corporate Registrations Name</label>
                  <input
                    type="text"
                    {...register("name")}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500 font-semibold"
                    placeholder="e.g. Phoenix Silicon Imp Corp"
                  />
                  {errors.name && <p className="text-xs text-rose-500 mt-1 font-semibold">{errors.name.message}</p>}
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Official E-mail address</label>
                  <input
                    type="email"
                    {...register("email")}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500 font-mono"
                    placeholder="sales@phoenixchip.com"
                  />
                  {errors.email && <p className="text-xs text-rose-500 mt-1">{errors.email.message}</p>}
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Active Contact Phone</label>
                  <input
                    type="text"
                    {...register("phone")}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500 font-mono"
                    placeholder="+852-2195-2000"
                  />
                  {errors.phone && <p className="text-xs text-rose-500 mt-1">{errors.phone.message}</p>}
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Full Logistics Address</label>
                  <textarea
                    rows={3}
                    {...register("address")}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500"
                    placeholder="e.g. Warehouse Block 4, Karon Bay Trade Terminal, HK"
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
                    id="btn-supplier-submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 bg-slate-905 text-white text-xs font-bold rounded-xl shadow-md uppercase tracking-wider transition-all"
                  >
                    {isSubmitting ? "Processing..." : editingSupplier ? "Save details" : "Register Supplier"}
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
                <h4 className="font-black text-slate-900 text-lg">Remove partner?</h4>
                <p className="text-xs text-slate-500">This action permanently deletes the selected wholesale supplier record from your active branch catalog node.</p>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteId(null)}
                  className="flex-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-705 text-sm font-bold rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => deleteMutation.mutate(deleteId)}
                  id="btn-supplier-delete-confirm"
                  className="flex-1 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold rounded-lg shadow-md transition-colors"
                >
                  Confirms Demount
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
