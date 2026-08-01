import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { categoryService, productService } from "../services/api";
import { ProductCategory, Product } from "../types";
import { useAuth } from "../context/AuthContext";
import { useToast } from "./Layout";
import { hasPermission } from "../types/rbac";
import { 
  FolderPlus, 
  Edit3, 
  Trash2, 
  X, 
  Plus, 
  Search, 
  Loader2, 
  AlertTriangle, 
  Check, 
  Tag,
  Package,
  ShieldAlert,
  Layers
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface CategoryManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
}

export const CategoryManagementModal: React.FC<CategoryManagementModalProps> = ({
  isOpen,
  onClose,
  products = []
}) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { showToast } = useToast();

  const canManageCategories = 
    user?.role === "Principal Admin" || 
    user?.role === "Inventory Manager" || 
    hasPermission(user?.role, "products.create" as any, user?.customPermissions);

  const [searchQuery, setSearchQuery] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ProductCategory | null>(null);

  // Form State
  const [formData, setFormData] = useState<{
    name: string;
    description: string;
    status: "Active" | "Inactive";
  }>({
    name: "",
    description: "",
    status: "Active"
  });
  const [formError, setFormError] = useState<string | null>(null);

  // Delete / Reassign State
  const [deletingCategory, setDeletingCategory] = useState<ProductCategory | null>(null);
  const [reassignTargetId, setReassignTargetId] = useState<string>("");

  // Fetch Categories
  const { data: categories = [], isLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: categoryService.getAll,
    enabled: isOpen
  });

  // Reset form when modal opens or closes
  useEffect(() => {
    if (!isOpen) {
      setIsFormOpen(false);
      setEditingCategory(null);
      setDeletingCategory(null);
      setFormError(null);
      setSearchQuery("");
    }
  }, [isOpen]);

  // Handle Keyboard Esc
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        if (deletingCategory) {
          setDeletingCategory(null);
        } else if (isFormOpen) {
          setIsFormOpen(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isFormOpen, deletingCategory, onClose]);

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: { name: string; description?: string; status: "Active" | "Inactive" }) =>
      categoryService.create(data),
    onSuccess: (newCat) => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      showToast(`Category '${newCat.name}' created successfully!`, "success");
      handleCloseForm();
    },
    onError: (err: any) => {
      setFormError(err.message || "Failed to create category");
      showToast(err.message || "Failed to create category", "error");
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name: string; description?: string; status: "Active" | "Inactive" } }) =>
      categoryService.update(id, data),
    onSuccess: (updatedCat) => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      showToast(`Category '${updatedCat.name}' updated successfully!`, "success");
      handleCloseForm();
    },
    onError: (err: any) => {
      setFormError(err.message || "Failed to update category");
      showToast(err.message || "Failed to update category", "error");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => categoryService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      showToast("Category deleted successfully!", "success");
      setDeletingCategory(null);
    },
    onError: (err: any) => {
      showToast(err.message || "Failed to delete category", "error");
    }
  });

  const reassignAndDeleteMutation = useMutation({
    mutationFn: ({ categoryIdToDelete, targetCategoryId, targetCategoryName }: { categoryIdToDelete: string; targetCategoryId: string; targetCategoryName: string }) =>
      categoryService.reassignAndDelete(categoryIdToDelete, targetCategoryId, targetCategoryName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      showToast("Products reassigned and category deleted successfully!", "success");
      setDeletingCategory(null);
    },
    onError: (err: any) => {
      showToast(err.message || "Failed to reassign products and delete category", "error");
    }
  });

  // Calculate Product Count per Category
  const getProductCountForCategory = (cat: ProductCategory) => {
    return products.filter(
      p => (p.categoryId && p.categoryId === cat.id) || (p.category && p.category.toLowerCase() === cat.name.toLowerCase())
    ).length;
  };

  const handleOpenAddForm = () => {
    setEditingCategory(null);
    setFormData({ name: "", description: "", status: "Active" });
    setFormError(null);
    setIsFormOpen(true);
  };

  const handleOpenEditForm = (cat: ProductCategory) => {
    setEditingCategory(cat);
    setFormData({
      name: cat.name,
      description: cat.description || "",
      status: cat.status || "Active"
    });
    setFormError(null);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingCategory(null);
    setFormData({ name: "", description: "", status: "Active" });
    setFormError(null);
  };

  const handleSaveCategory = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const trimmedName = formData.name.trim();
    if (!trimmedName) {
      setFormError("Category Name is required and cannot be blank.");
      return;
    }

    // Case-insensitive uniqueness check
    const isDuplicate = categories.some(
      c => c.name.toLowerCase() === trimmedName.toLowerCase() && c.id !== editingCategory?.id
    );

    if (isDuplicate) {
      setFormError(`A category named '${trimmedName}' already exists.`);
      return;
    }

    if (editingCategory) {
      updateMutation.mutate({
        id: editingCategory.id,
        data: {
          name: trimmedName,
          description: formData.description.trim(),
          status: formData.status
        }
      });
    } else {
      createMutation.mutate({
        name: trimmedName,
        description: formData.description.trim(),
        status: formData.status
      });
    }
  };

  const handleOpenDelete = (cat: ProductCategory) => {
    setDeletingCategory(cat);
    // Pre-select first available active category excluding this one for reassignment
    const available = categories.filter(c => c.id !== cat.id && c.status === "Active");
    if (available.length > 0) {
      setReassignTargetId(available[0].id);
    } else {
      setReassignTargetId("");
    }
  };

  const handleConfirmDelete = () => {
    if (!deletingCategory) return;
    const count = getProductCountForCategory(deletingCategory);

    if (count === 0) {
      deleteMutation.mutate(deletingCategory.id);
    } else {
      if (!reassignTargetId) {
        showToast("Please select a target category to move products to.", "warning");
        return;
      }
      const targetCat = categories.find(c => c.id === reassignTargetId);
      if (!targetCat) {
        showToast("Selected target category is invalid.", "error");
        return;
      }
      reassignAndDeleteMutation.mutate({
        categoryIdToDelete: deletingCategory.id,
        targetCategoryId: targetCat.id,
        targetCategoryName: targetCat.name
      });
    }
  };

  const filteredCategories = categories.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.description && c.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-lg">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Product Category Management</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Add, edit, status control, and reassign categories seamlessly within Products</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action & Search Toolbar */}
        <div className="px-6 py-3 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text"
              placeholder="Search categories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {canManageCategories ? (
            <button
              onClick={handleOpenAddForm}
              className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-all shadow-sm shadow-blue-500/20 active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add Category</span>
            </button>
          ) : (
            <div className="flex items-center text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-3 py-1.5 rounded-lg border border-amber-200 dark:border-amber-900">
              <ShieldAlert className="w-3.5 h-3.5 mr-1.5" />
              <span>View-only permission (inventory management access required to modify)</span>
            </div>
          )}
        </div>

        {/* Add / Edit Inline Form Container */}
        <AnimatePresence>
          {isFormOpen && (
            <motion.form
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              onSubmit={handleSaveCategory}
              className="px-6 py-4 bg-blue-50/50 dark:bg-blue-950/20 border-b border-blue-200 dark:border-blue-900/50 overflow-hidden"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-blue-900 dark:text-blue-200 flex items-center gap-2">
                  <FolderPlus className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  {editingCategory ? `Edit Category: ${editingCategory.name}` : "Create New Product Category"}
                </h3>
                <button
                  type="button"
                  onClick={handleCloseForm}
                  className="text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                >
                  Cancel
                </button>
              </div>

              {formError && (
                <div className="mb-3 p-2.5 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 rounded-lg text-xs text-red-600 dark:text-red-400 flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-1">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Category Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Wireless Audio"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div className="sm:col-span-1">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Description <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Brief category description..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div className="sm:col-span-1">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as "Active" | "Inactive" })}
                    className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="mt-3 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={handleCloseForm}
                  className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors"
                >
                  {(createMutation.isPending || updateMutation.isPending) ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>{editingCategory ? "Update Category" : "Save Category"}</span>
                    </>
                  )}
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        {/* Content Table */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              <p className="text-sm font-medium">Loading category registry from Firestore...</p>
            </div>
          ) : filteredCategories.length === 0 ? (
            <div className="py-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
              <Tag className="w-10 h-10 text-slate-400 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">No Product Categories Found</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1 mb-4">
                {searchQuery ? `No categories match query '${searchQuery}'` : "Create your first category to start organizing catalog items efficiently."}
              </p>
              {canManageCategories && !searchQuery && (
                <button
                  onClick={handleOpenAddForm}
                  className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Add Category</span>
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Category Name</th>
                    <th className="px-4 py-3">Description</th>
                    <th className="px-4 py-3 text-center">Products Using Category</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-800 dark:text-slate-200 font-medium">
                  {filteredCategories.map((cat) => {
                    const productCount = getProductCountForCategory(cat);
                    const isActive = cat.status === "Active";

                    return (
                      <tr key={cat.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="px-4 py-3.5">
                          <div className="flex items-center space-x-2">
                            <span className="w-2 h-2 rounded-full bg-blue-500" />
                            <span className="font-bold text-slate-900 dark:text-white">{cat.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-xs text-slate-500 dark:text-slate-400 max-w-xs truncate">
                          {cat.description || <span className="italic text-slate-400">No description</span>}
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <span className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            productCount > 0 
                              ? "bg-blue-50 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300 border border-blue-200 dark:border-blue-900" 
                              : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                          }`}>
                            <Package className="w-3 h-3 mr-1" />
                            <span>{productCount} {productCount === 1 ? "Product" : "Products"}</span>
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            isActive 
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900" 
                              : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
                          }`}>
                            {isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right space-x-1">
                          {canManageCategories ? (
                            <>
                              <button
                                onClick={() => handleOpenEditForm(cat)}
                                className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded-lg transition-colors"
                                title="Edit Category"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleOpenDelete(cat)}
                                className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-lg transition-colors"
                                title="Delete Category"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          ) : (
                            <span className="text-xs text-slate-400 italic">Protected</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Delete / Reassign Modal Overlay */}
        <AnimatePresence>
          {deletingCategory && (
            <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 max-w-md w-full shadow-2xl space-y-4"
              >
                <div className="flex items-start space-x-3">
                  <div className="p-3 bg-red-100 dark:bg-red-900/40 text-red-600 rounded-full shrink-0">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                      Delete Category: '{deletingCategory.name}'?
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {getProductCountForCategory(deletingCategory) > 0 ? (
                        <span className="text-amber-600 dark:text-amber-400 font-semibold">
                          This category is currently assigned to {getProductCountForCategory(deletingCategory)} product(s).
                        </span>
                      ) : (
                        "This action will permanently delete the category."
                      )}
                    </p>
                  </div>
                </div>

                {getProductCountForCategory(deletingCategory) > 0 && (
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-lg space-y-2">
                    <label className="block text-xs font-bold text-amber-900 dark:text-amber-300">
                      Reassign Products to Another Category <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={reassignTargetId}
                      onChange={(e) => setReassignTargetId(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-800 rounded-lg text-sm font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none"
                    >
                      <option value="" disabled>-- Select Target Category --</option>
                      {categories
                        .filter(c => c.id !== deletingCategory.id && c.status === "Active")
                        .map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))
                      }
                    </select>
                    <p className="text-[11px] text-amber-700 dark:text-amber-400">
                      All {getProductCountForCategory(deletingCategory)} product records will be updated to the selected target category before deletion.
                    </p>
                  </div>
                )}

                <div className="flex justify-end space-x-2 pt-2">
                  <button
                    onClick={() => setDeletingCategory(null)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmDelete}
                    disabled={deleteMutation.isPending || reassignAndDeleteMutation.isPending || (getProductCountForCategory(deletingCategory) > 0 && !reassignTargetId)}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-colors shadow-sm"
                  >
                    {(deleteMutation.isPending || reassignAndDeleteMutation.isPending) ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Processing...</span>
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>
                          {getProductCountForCategory(deletingCategory) > 0 
                            ? "Reassign & Delete Category" 
                            : "Delete Category"}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};
