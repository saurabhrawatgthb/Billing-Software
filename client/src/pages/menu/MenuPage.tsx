import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Plus, Search, Edit2, Trash2, CheckCircle2, XCircle, Tag, ChefHat, Building2, Copy, RefreshCw } from "lucide-react";
import { api, extractErrorMessage } from "../../services/api.js";
import { useAuthStore } from "../../store/authStore.js";
import type { Category, MenuItem, PreparationStation, Franchise } from "../../types/index.js";
import { Card } from "../../components/common/Card.js";
import { Button } from "../../components/common/Button.js";
import { Input } from "../../components/common/Input.js";
import { Select } from "../../components/common/Select.js";
import { Modal } from "../../components/common/Modal.js";
import { Badge } from "../../components/common/Badge.js";
import { LoadingState } from "../../components/common/LoadingState.js";
import { EmptyState } from "../../components/common/EmptyState.js";
import { CloneMenuModal } from "../../components/menu/CloneMenuModal.js";
import { usePermissions } from "../../hooks/usePermissions.js";

export const MenuPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { selectedFranchiseId, setSelectedFranchise, user } = useAuthStore();
  const { isSuperAdmin, canEditMenu, canEditPrices } = usePermissions();
  const canModifyMenu = isSuperAdmin || canEditMenu;
  const canModifyDishes = isSuperAdmin || canEditMenu || canEditPrices;
  const isBrandOwner = isSuperAdmin;

  const [activeTab, setActiveTab] = useState<"items" | "categories">("items");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("");
  const [isCloneModalOpen, setIsCloneModalOpen] = useState(false);
  const [cloneNotification, setCloneNotification] = useState<string | null>(null);

  // Item Modal State
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [itemFormData, setItemFormData] = useState({
    categoryId: "",
    stationId: "",
    name: "",
    code: "",
    description: "",
    price: 150,
    hasSizes: false,
    priceSmall: "" as number | string,
    priceMedium: "" as number | string,
    priceLarge: "" as number | string,
    isAvailable: true,
  });

  // Category Modal State
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryFormData, setCategoryFormData] = useState({
    name: "",
    description: "",
    isActive: true,
  });

  const [formError, setFormError] = useState<string | null>(null);
  const [targetFranchiseId, setTargetFranchiseId] = useState<string>("");

  // Fetch Franchises for Brand Owner
  const { data: franchises = [] } = useQuery<Franchise[]>({
    queryKey: ["menu-franchises"],
    queryFn: async () => {
      const res = await api.get("/franchises");
      return res.data.data;
    },
    enabled: isBrandOwner,
  });

  // Effective franchise context: selected in navbar, or chosen in modal, or user's assigned franchise, or sole franchise
  const effectiveFranchiseId = selectedFranchiseId || user?.franchiseId || targetFranchiseId || franchises[0]?.id || "";

  // Fetch Categories
  const { data: categories = [], isFetching: isFetchingCats } = useQuery<Category[]>({
    queryKey: ["categories", effectiveFranchiseId],
    queryFn: async () => {
      const url = effectiveFranchiseId
        ? `/menu/categories?franchiseId=${effectiveFranchiseId}`
        : "/menu/categories";
      const res = await api.get(url);
      return res.data.data;
    },
  });

  // Fetch Preparation Stations
  const { data: stations = [] } = useQuery<PreparationStation[]>({
    queryKey: ["stations", effectiveFranchiseId],
    queryFn: async () => {
      const url = effectiveFranchiseId
        ? `/menu/stations?franchiseId=${effectiveFranchiseId}`
        : "/menu/stations";
      const res = await api.get(url);
      return res.data.data;
    },
  });

  // Fetch Menu Items
  const { data: menuItems = [], isLoading, isFetching: isFetchingItems } = useQuery<MenuItem[]>({
    queryKey: ["menu-items", effectiveFranchiseId, selectedCategoryFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (effectiveFranchiseId) params.append("franchiseId", effectiveFranchiseId);
      if (selectedCategoryFilter) params.append("categoryId", selectedCategoryFilter);
      const url = params.toString() ? `/menu/items?${params.toString()}` : "/menu/items";
      const res = await api.get(url);
      return res.data.data;
    },
  });

  const isMenuSyncing = isFetchingCats || isFetchingItems;

  // Item Mutation
  const saveItemMutation = useMutation({
    mutationFn: async (data: typeof itemFormData) => {
      const franchiseToUse = targetFranchiseId || selectedFranchiseId || user?.franchiseId || franchises[0]?.id;
      const basePrice = data.hasSizes
        ? Number(data.priceMedium || data.priceSmall || data.priceLarge || data.price || 0)
        : Number(data.price);

      const payload = {
        categoryId: data.categoryId,
        stationId: data.stationId || null,
        name: data.name,
        code: data.code.trim().toUpperCase(),
        description: data.description || null,
        price: basePrice > 0 ? basePrice : 100,
        hasSizes: Boolean(data.hasSizes),
        priceSmall: data.hasSizes && data.priceSmall !== "" ? Number(data.priceSmall) : null,
        priceMedium: data.hasSizes && data.priceMedium !== "" ? Number(data.priceMedium) : null,
        priceLarge: data.hasSizes && data.priceLarge !== "" ? Number(data.priceLarge) : null,
        isAvailable: data.isAvailable,
        franchiseId: franchiseToUse,
      };
      if (editingItem) {
        return api.put(`/menu/items/${editingItem.id}`, payload);
      }
      return api.post("/menu/items", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["menu-items"] });
      setIsItemModalOpen(false);
    },
    onError: (err) => setFormError(extractErrorMessage(err)),
  });

  // Toggle Availability Mutation
  const toggleAvailabilityMutation = useMutation({
    mutationFn: async ({ id, isAvailable }: { id: string; isAvailable: boolean }) => {
      return api.patch(`/menu/items/${id}/availability`, { isAvailable });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["menu-items"] });
    },
  });

  // Category Mutation
  const saveCategoryMutation = useMutation({
    mutationFn: async (data: typeof categoryFormData) => {
      const franchiseToUse = targetFranchiseId || selectedFranchiseId || user?.franchiseId || franchises[0]?.id;
      const payload = {
        ...data,
        franchiseId: franchiseToUse,
      };
      if (editingCategory) {
        return api.put(`/menu/categories/${editingCategory.id}`, payload);
      }
      return api.post("/menu/categories", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      setIsCategoryModalOpen(false);
    },
    onError: (err) => setFormError(extractErrorMessage(err)),
  });

  // Delete Category Mutation
  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/menu/categories/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
    onError: (err) => alert(extractErrorMessage(err)),
  });

  const handleOpenCreateItem = (forcePizza = false) => {
    setEditingItem(null);
    setTargetFranchiseId(selectedFranchiseId || franchises[0]?.id || "");
    const pizzaCat = categories.find((c) => c.name.toLowerCase().includes("pizza"));
    const defaultCat = forcePizza && pizzaCat
      ? pizzaCat.id
      : (selectedCategoryFilter || (pizzaCat ? pizzaCat.id : categories[0]?.id || ""));
    const catName = categories.find((c) => c.id === defaultCat)?.name || "";
    const isPizza = forcePizza || catName.toLowerCase().includes("pizza");

    setItemFormData({
      categoryId: defaultCat,
      stationId: stations[0]?.id || "",
      name: "",
      code: isPizza ? `PIZ-${Math.floor(100 + Math.random() * 900)}` : "",
      description: "",
      price: 200,
      hasSizes: isPizza,
      priceSmall: 150,
      priceMedium: 250,
      priceLarge: 350,
      isAvailable: true,
    });
    setFormError(null);
    setIsItemModalOpen(true);
  };

  const handleOpenEditItem = (item: MenuItem) => {
    setEditingItem(item);
    setTargetFranchiseId(item.franchiseId || selectedFranchiseId || user?.franchiseId || franchises[0]?.id || "");
    const isPizza =
      Boolean(item.hasSizes) ||
      item.name.toLowerCase().includes("pizza") ||
      Boolean(item.category?.name?.toLowerCase().includes("pizza"));

    setItemFormData({
      categoryId: item.categoryId,
      stationId: item.stationId || "",
      name: item.name,
      code: item.code || "",
      description: item.description || "",
      price: Number(item.price),
      hasSizes: isPizza,
      priceSmall: item.priceSmall != null ? item.priceSmall : (isPizza ? Number(item.price) : 150),
      priceMedium: item.priceMedium != null ? item.priceMedium : (isPizza ? Number(item.price) : 250),
      priceLarge: item.priceLarge != null ? item.priceLarge : (isPizza ? Number(item.price) : 350),
      isAvailable: item.isAvailable,
    });
    setFormError(null);
    setIsItemModalOpen(true);
  };

  const handleOpenCreateCategory = () => {
    setEditingCategory(null);
    setTargetFranchiseId(selectedFranchiseId || user?.franchiseId || franchises[0]?.id || "");
    setCategoryFormData({ name: "", description: "", isActive: true });
    setFormError(null);
    setIsCategoryModalOpen(true);
  };

  const handleOpenEditCategory = (cat: Category) => {
    setEditingCategory(cat);
    setTargetFranchiseId(cat.franchiseId || selectedFranchiseId || user?.franchiseId || franchises[0]?.id || "");
    setCategoryFormData({
      name: cat.name,
      description: cat.description || "",
      isActive: cat.isActive,
    });
    setFormError(null);
    setIsCategoryModalOpen(true);
  };

  const filteredItems = menuItems.filter(
    (i) =>
      i.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (i.code || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (i.category?.name || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Menu Management</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Configure dishes, categories, pricing, kitchen station routing, and live availability
          </p>
        </div>

        {canModifyMenu || canModifyDishes ? (
          <div className="flex flex-wrap items-center gap-3">
            {isSuperAdmin && franchises.length > 0 && (
              <div className="flex items-center gap-1.5 bg-indigo-50 border border-indigo-100 rounded-lg px-2.5 py-1 text-xs text-indigo-900">
                <Building2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <span className="font-semibold text-gray-700">Outlet:</span>
                <select
                  value={selectedFranchiseId || ""}
                  onChange={(e) => setSelectedFranchise(e.target.value || null)}
                  className="bg-white border border-indigo-200 rounded px-2 py-0.5 text-xs font-bold text-gray-800 cursor-pointer focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="">All Outlets (Consolidated)</option>
                  {franchises.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} ({f.code})
                    </option>
                  ))}
                </select>
              </div>
            )}
            <Button
              variant="outline"
              disabled={isMenuSyncing}
              onClick={async () => {
                await Promise.all([
                  queryClient.invalidateQueries({ queryKey: ["categories"] }),
                  queryClient.invalidateQueries({ queryKey: ["menu-items"] }),
                  queryClient.invalidateQueries({ queryKey: ["stations"] }),
                ]);
              }}
              icon={<RefreshCw className={`w-4 h-4 text-indigo-600 ${isMenuSyncing ? "animate-spin" : ""}`} />}
            >
              {isMenuSyncing ? "Refreshing..." : "Refresh"}
            </Button>
            {isSuperAdmin && franchises.length > 1 && (
              <Button
                variant="outline"
                onClick={() => setIsCloneModalOpen(true)}
                icon={<Copy className="w-4 h-4 text-indigo-600" />}
              >
                Copy Menu Across Outlets
              </Button>
            )}
            {canModifyMenu && (
              <>
                <Button
                  variant="outline"
                  onClick={handleOpenCreateCategory}
                  icon={<Tag className="w-4 h-4" />}
                  disabled={!effectiveFranchiseId}
                >
                  Add Category
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleOpenCreateItem(true)}
                  className="border-amber-300 bg-amber-50 text-amber-950 hover:bg-amber-100 font-bold shadow-xs"
                  icon={<span className="text-base leading-none">🍕</span>}
                  disabled={!effectiveFranchiseId}
                >
                  Add Pizza (S/M/L)
                </Button>
                <Button
                  variant="primary"
                  onClick={() => handleOpenCreateItem(false)}
                  icon={<Plus className="w-4 h-4" />}
                  disabled={!effectiveFranchiseId}
                >
                  Add Menu Item
                </Button>
              </>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              disabled={isMenuSyncing}
              onClick={async () => {
                await Promise.all([
                  queryClient.invalidateQueries({ queryKey: ["categories"] }),
                  queryClient.invalidateQueries({ queryKey: ["menu-items"] }),
                ]);
              }}
              icon={<RefreshCw className={`w-4 h-4 text-indigo-600 ${isMenuSyncing ? "animate-spin" : ""}`} />}
            >
              {isMenuSyncing ? "Refreshing..." : "Refresh Menu"}
            </Button>
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-center gap-2 max-w-md">
              <Tag className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Menu is centrally managed. Contact brand owner for dish addition permissions.</span>
            </div>
          </div>
        )}
      </div>

      {/* Cloned Notification Banner */}
      {cloneNotification && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between gap-3 text-emerald-800 text-sm font-medium shadow-xs">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{cloneNotification}</span>
          </div>
          <button
            onClick={() => setCloneNotification(null)}
            className="text-xs text-emerald-700 hover:text-emerald-900 font-semibold cursor-pointer underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Zero Franchises Alert */}
      {isBrandOwner && franchises.length === 0 && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-amber-900 shadow-xs">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-amber-100 rounded-lg text-amber-700 mt-0.5 shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-semibold text-sm text-amber-950">No Franchise Outlets Found</h4>
              <p className="text-xs text-amber-800 mt-0.5">
                Every category, dish price, and kitchen station belongs to a franchise branch. Please create your first Franchise Branch (e.g. "Main Outlet" or "Flagship Store") first before adding categories or menu items.
              </p>
            </div>
          </div>
          <Link to="/franchises">
            <Button variant="primary" size="sm" icon={<Plus className="w-4 h-4" />}>
              Create Franchise Outlet
            </Button>
          </Link>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab("items")}
          className={`px-6 py-3 font-semibold text-sm border-b-2 transition-colors cursor-pointer ${
            activeTab === "items"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Dishes & Items ({menuItems.length})
        </button>
        <button
          onClick={() => setActiveTab("categories")}
          className={`px-6 py-3 font-semibold text-sm border-b-2 transition-colors cursor-pointer ${
            activeTab === "categories"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Categories ({categories.length})
        </button>
      </div>

      {/* ================= ITEMS TAB ================= */}
      {activeTab === "items" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center gap-4 bg-white p-4 rounded-xl border border-gray-200/80 shadow-xs">
            <Input
              placeholder="Search dish by name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              leftIcon={<Search className="w-4 h-4 text-gray-400" />}
              className="w-full sm:max-w-md"
            />
            <Select
              options={[
                { value: "", label: "All Categories" },
                ...categories.map((c) => ({ value: c.id, label: c.name })),
              ]}
              value={selectedCategoryFilter}
              onChange={(e) => setSelectedCategoryFilter(e.target.value)}
              className="w-full sm:w-56"
            />
          </div>

          {isLoading ? (
            <LoadingState message="Loading menu catalog..." />
          ) : filteredItems.length === 0 ? (
            <EmptyState
              title="No Dishes Found"
              description="Create menu items and assign them to categories and kitchen stations."
              actionLabel={canModifyMenu ? "Add Dish" : undefined}
              onAction={canModifyMenu ? () => handleOpenCreateItem(false) : undefined}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredItems.map((item) => (
                <Card
                  key={item.id}
                  className="hover:shadow-md transition-shadow"
                  title={
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-900">{item.name}</span>
                      {item.code && (
                        <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200">
                          {item.code}
                        </span>
                      )}
                    </div>
                  }
                  action={
                    item.hasSizes ? (
                      <div className="text-right">
                        <span className="text-[10px] font-bold text-indigo-600 block uppercase tracking-wider">
                          S / M / L
                        </span>
                        <span className="font-bold text-emerald-600 text-xs font-mono">
                          ₹{Number(item.priceSmall || 0)} / ₹{Number(item.priceMedium || 0)} / ₹{Number(item.priceLarge || 0)}
                        </span>
                      </div>
                    ) : (
                      <span className="font-bold text-emerald-600 text-base">
                        ₹{Number(item.price).toFixed(2)}
                      </span>
                    )
                  }
                >
                  <div className="space-y-3">
                    <p className="text-xs text-gray-500 min-h-[32px] line-clamp-2">
                      {item.description || "No description provided."}
                    </p>

                    <div className="flex items-center justify-between text-xs pt-2 border-t border-gray-100">
                      <Badge variant="primary">{item.category?.name || "Uncategorized"}</Badge>
                      {item.station && (
                        <div className="flex items-center gap-1 text-gray-500 text-[11px] font-medium">
                          <ChefHat className="w-3.5 h-3.5 text-amber-500" />
                          <span>{item.station.name}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                      <button
                        onClick={() =>
                          toggleAvailabilityMutation.mutate({
                            id: item.id,
                            isAvailable: !item.isAvailable,
                          })
                        }
                        className={`text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${
                          item.isAvailable ? "text-emerald-600 hover:text-emerald-700" : "text-rose-600 hover:text-rose-700"
                        }`}
                      >
                        {item.isAvailable ? (
                          <>
                            <CheckCircle2 className="w-4 h-4" /> Available (In Stock)
                          </>
                        ) : (
                          <>
                            <XCircle className="w-4 h-4" /> Out of Stock
                          </>
                        )}
                      </button>

                      {canModifyDishes && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenEditItem(item)}
                          icon={<Edit2 className="w-3.5 h-3.5" />}
                        >
                          Edit
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ================= CATEGORIES TAB ================= */}
      {activeTab === "categories" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {categories.map((cat) => (
            <Card
              key={cat.id}
              title={<span className="font-bold text-gray-900">{cat.name}</span>}
              action={
                <Badge variant={cat.isActive ? "success" : "danger"} dot>
                  {cat.isActive ? "Active" : "Disabled"}
                </Badge>
              }
            >
              <div className="space-y-3">
                <p className="text-xs text-gray-500 min-h-[32px]">
                  {cat.description || "No category description."}
                </p>

                <div className="flex items-center justify-between text-xs pt-2 border-t border-gray-100 font-medium text-gray-600">
                  <span>{cat._count?.menuItems || 0} Menu Items</span>
                  {canModifyMenu && (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenEditCategory(cat)}
                        icon={<Edit2 className="w-3.5 h-3.5" />}
                      >
                        Edit
                      </Button>
                      <button
                        onClick={() => {
                          if (confirm(`Delete category "${cat.name}"?`)) {
                            deleteCategoryMutation.mutate(cat.id);
                          }
                        }}
                        className="text-rose-600 hover:text-rose-700 p-1.5 rounded hover:bg-rose-50 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Item Modal */}
      <Modal
        isOpen={isItemModalOpen}
        onClose={() => setIsItemModalOpen(false)}
        title={editingItem ? "Edit Dish" : "Add New Dish"}
        maxWidth="md"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setFormError(null);
            if (itemFormData.hasSizes) {
              const pSmall = Number(itemFormData.priceSmall);
              const pMedium = Number(itemFormData.priceMedium);
              const pLarge = Number(itemFormData.priceLarge);
              if (!pSmall || pSmall <= 0 || !pMedium || pMedium <= 0 || !pLarge || pLarge <= 0) {
                setFormError("Please enter valid positive rates for all 3 options: Small, Medium, and Large.");
                return;
              }
            } else {
              const p = Number(itemFormData.price);
              if (!p || p <= 0) {
                setFormError("Please enter a valid price greater than 0.");
                return;
              }
            }
            saveItemMutation.mutate(itemFormData);
          }}
          className="space-y-4"
        >
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs font-medium">
              {formError}
            </div>
          )}

          {isBrandOwner && franchises.length > 0 && (
            <Select
              label="Franchise Outlet *"
              required
              options={franchises.map((f) => ({ value: f.id, label: `🏬 ${f.name} (${f.code})` }))}
              value={targetFranchiseId}
              onChange={(e) => setTargetFranchiseId(e.target.value)}
            />
          )}

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Dish Name *"
              required
              placeholder="e.g. Farmhouse Pizza"
              value={itemFormData.name}
              onChange={(e) => {
                const val = e.target.value;
                const isPizza = val.toLowerCase().includes("pizza");
                const pizzaCat = categories.find((c) => c.name.toLowerCase().includes("pizza"));
                setItemFormData((prev) => {
                  let nextCat = prev.categoryId;
                  if (isPizza && pizzaCat && (!prev.categoryId || prev.categoryId === categories[0]?.id)) {
                    nextCat = pizzaCat.id;
                  }
                  let nextCode = prev.code;
                  if (isPizza && (!nextCode || nextCode.startsWith("PIZ-"))) {
                    const cleanName = val.replace(/[^a-zA-Z0-9]/g, "").slice(0, 4).toUpperCase();
                    nextCode = cleanName ? `PIZ-${cleanName}` : prev.code;
                  }
                  return {
                    ...prev,
                    name: val,
                    categoryId: nextCat,
                    code: nextCode,
                    hasSizes: isPizza ? true : prev.hasSizes,
                    priceSmall: isPizza && !prev.priceSmall ? 150 : prev.priceSmall,
                    priceMedium: isPizza && !prev.priceMedium ? 250 : prev.priceMedium,
                    priceLarge: isPizza && !prev.priceLarge ? 350 : prev.priceLarge,
                  };
                });
              }}
            />

            <Input
              label="Dish Code (Unique) *"
              required
              placeholder="e.g. DISH-PBM01"
              value={itemFormData.code}
              onChange={(e) => setItemFormData({ ...itemFormData, code: e.target.value.toUpperCase() })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Category *"
              options={categories.map((c) => ({ value: c.id, label: c.name }))}
              value={itemFormData.categoryId}
              onChange={(e) => {
                const catId = e.target.value;
                const catName = categories.find((c) => c.id === catId)?.name || "";
                const isPizza = catName.toLowerCase().includes("pizza");
                setItemFormData((prev) => ({
                  ...prev,
                  categoryId: catId,
                  hasSizes: isPizza ? true : prev.hasSizes,
                  code: isPizza && !prev.code ? `PIZ-${Math.floor(100 + Math.random() * 900)}` : prev.code,
                  priceSmall: isPizza && !prev.priceSmall ? 150 : prev.priceSmall,
                  priceMedium: isPizza && !prev.priceMedium ? 250 : prev.priceMedium,
                  priceLarge: isPizza && !prev.priceLarge ? 350 : prev.priceLarge,
                }));
              }}
            />

            <Select
              label="Kitchen Prep Station"
              options={[
                { value: "", label: "Standard / Any Station" },
                ...stations.map((s) => ({ value: s.id, label: s.name })),
              ]}
              value={itemFormData.stationId}
              onChange={(e) => setItemFormData({ ...itemFormData, stationId: e.target.value })}
            />
          </div>

          {/* RATE & PRICING CONFIGURATION */}
          <div className="p-4 bg-slate-50/90 border-2 border-indigo-200/90 rounded-2xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-indigo-100">
              <div>
                <label className="text-xs font-black text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                  <span>Rate / Pricing Section *</span>
                  {itemFormData.hasSizes && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-400 text-amber-950 uppercase shadow-xs">
                      🍕 3 Sizes Active
                    </span>
                  )}
                </label>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  Choose single standard rate or 3 size rates (Small, Medium, Large) for Pizzas
                </p>
              </div>
            </div>

            {/* TWO LARGE SELECTOR CARDS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Option 1: Standard Rate */}
              <button
                type="button"
                onClick={() => setItemFormData((prev) => ({ ...prev, hasSizes: false }))}
                className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer flex items-start gap-3 ${
                  !itemFormData.hasSizes
                    ? "border-indigo-600 bg-white ring-2 ring-indigo-200 shadow-sm"
                    : "border-gray-200 bg-white/70 hover:bg-white hover:border-gray-300"
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 font-bold text-sm ${
                    !itemFormData.hasSizes ? "bg-indigo-600 text-white shadow-xs" : "bg-gray-100 text-gray-600"
                  }`}
                >
                  ₹
                </div>
                <div>
                  <span className="text-xs font-black text-gray-900 block">Single Standard Rate</span>
                  <span className="text-[11px] text-gray-500 block leading-tight mt-0.5">
                    Fixed single price (Dosa, Beverages, Thali, etc.)
                  </span>
                </div>
              </button>

              {/* Option 2: 3 Sizes (Small, Medium, Large) */}
              <button
                type="button"
                onClick={() =>
                  setItemFormData((prev) => ({
                    ...prev,
                    hasSizes: true,
                    priceSmall: prev.priceSmall || 150,
                    priceMedium: prev.priceMedium || 250,
                    priceLarge: prev.priceLarge || 350,
                  }))
                }
                className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer flex items-start gap-3 ${
                  itemFormData.hasSizes
                    ? "border-amber-500 bg-amber-50/60 ring-2 ring-amber-200 shadow-sm"
                    : "border-gray-200 bg-white/70 hover:bg-white hover:border-gray-300"
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 text-base ${
                    itemFormData.hasSizes ? "bg-amber-500 text-white shadow-xs" : "bg-gray-100"
                  }`}
                >
                  🍕
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-black text-gray-900 block">3 Sizes: Small, Medium, Large</span>
                  </div>
                  <span className="text-[11px] text-amber-900 font-semibold block leading-tight mt-0.5">
                    Recommended for Pizza items
                  </span>
                </div>
              </button>
            </div>

            {/* THREE RATE OPTIONS FOR SMALL, MEDIUM, LARGE */}
            {itemFormData.hasSizes ? (
              <div className="pt-2 border-t border-indigo-100 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-indigo-950 flex items-center gap-1.5">
                    <span>🍕 Enter Rates for all 3 Size Options:</span>
                  </span>
                  <span className="text-[10px] text-indigo-700 font-bold bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
                    Small, Medium & Large required
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Option 1: Small Size */}
                  <div className="p-3.5 bg-white rounded-xl border-2 border-indigo-200 shadow-xs space-y-2 hover:border-indigo-400 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-800 font-black text-[10px] flex items-center justify-center">
                          1
                        </span>
                        <span className="text-xs font-black text-gray-900">Option 1: Small</span>
                      </div>
                      <span className="text-[10px] font-bold text-gray-500 font-mono bg-gray-50 px-1.5 py-0.5 rounded border border-gray-200">
                        7" inch
                      </span>
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-indigo-950 block mb-1">
                        🍕 Small Rate (₹) *
                      </label>
                      <Input
                        type="number"
                        min="1"
                        step="0.01"
                        required={itemFormData.hasSizes}
                        placeholder="e.g. 150"
                        value={itemFormData.priceSmall}
                        onChange={(e) => setItemFormData({ ...itemFormData, priceSmall: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Option 2: Medium Size */}
                  <div className="p-3.5 bg-white rounded-xl border-2 border-indigo-500 shadow-xs space-y-2 ring-1 ring-indigo-300">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-black text-[10px] flex items-center justify-center">
                          2
                        </span>
                        <span className="text-xs font-black text-indigo-950">Option 2: Medium</span>
                      </div>
                      <span className="text-[10px] font-bold text-indigo-700 font-mono bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">
                        10" inch
                      </span>
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-indigo-950 block mb-1">
                        🍕 Medium Rate (₹) *
                      </label>
                      <Input
                        type="number"
                        min="1"
                        step="0.01"
                        required={itemFormData.hasSizes}
                        placeholder="e.g. 250"
                        value={itemFormData.priceMedium}
                        onChange={(e) => setItemFormData({ ...itemFormData, priceMedium: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Option 3: Large Size */}
                  <div className="p-3.5 bg-white rounded-xl border-2 border-indigo-200 shadow-xs space-y-2 hover:border-indigo-400 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-800 font-black text-[10px] flex items-center justify-center">
                          3
                        </span>
                        <span className="text-xs font-black text-gray-900">Option 3: Large</span>
                      </div>
                      <span className="text-[10px] font-bold text-gray-500 font-mono bg-gray-50 px-1.5 py-0.5 rounded border border-gray-200">
                        12" inch
                      </span>
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-indigo-950 block mb-1">
                        🍕 Large Rate (₹) *
                      </label>
                      <Input
                        type="number"
                        min="1"
                        step="0.01"
                        required={itemFormData.hasSizes}
                        placeholder="e.g. 350"
                        value={itemFormData.priceLarge}
                        onChange={(e) => setItemFormData({ ...itemFormData, priceLarge: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="pt-2 border-t border-indigo-100">
                <Input
                  label="Standard Rate / Price (₹) *"
                  type="number"
                  min="1"
                  step="0.01"
                  required={!itemFormData.hasSizes}
                  placeholder="e.g. 250.00"
                  value={itemFormData.price}
                  onChange={(e) => setItemFormData({ ...itemFormData, price: Number(e.target.value) })}
                />
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              Description / Ingredients
            </label>
            <textarea
              rows={2}
              placeholder="Fresh cottage cheese cooked in aromatic tomato gravy..."
              className="block w-full rounded-lg border border-gray-300 text-sm p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              value={itemFormData.description}
              onChange={(e) => setItemFormData({ ...itemFormData, description: e.target.value })}
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
            <Button variant="outline" type="button" onClick={() => setIsItemModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={saveItemMutation.isPending}>
              {editingItem ? "Save Dish" : "Create Dish"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Category Modal */}
      <Modal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        title={editingCategory ? "Edit Category" : "Add Menu Category"}
        maxWidth="sm"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setFormError(null);
            saveCategoryMutation.mutate(categoryFormData);
          }}
          className="space-y-4"
        >
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs font-medium">
              {formError}
            </div>
          )}

          {isBrandOwner && franchises.length > 0 && (
            <Select
              label="Franchise Outlet *"
              required
              options={franchises.map((f) => ({ value: f.id, label: `🏬 ${f.name} (${f.code})` }))}
              value={targetFranchiseId}
              onChange={(e) => setTargetFranchiseId(e.target.value)}
            />
          )}

          <Input
            label="Category Name *"
            required
            placeholder="e.g. Starters, Desserts, Beverages"
            value={categoryFormData.name}
            onChange={(e) => setCategoryFormData({ ...categoryFormData, name: e.target.value })}
          />

          <Input
            label="Description"
            placeholder="Appetizers and snacks"
            value={categoryFormData.description}
            onChange={(e) => setCategoryFormData({ ...categoryFormData, description: e.target.value })}
          />

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
            <Button variant="outline" type="button" onClick={() => setIsCategoryModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={saveCategoryMutation.isPending}>
              Save Category
            </Button>
          </div>
        </form>
      </Modal>

      {/* Clone Menu Modal */}
      {(isBrandOwner || canModifyMenu) && (
        <CloneMenuModal
          isOpen={isCloneModalOpen}
          onClose={() => setIsCloneModalOpen(false)}
          franchises={franchises}
          initialSourceId={selectedFranchiseId || franchises[0]?.id}
          onSuccess={(result) => {
            setSelectedFranchise(result.targetFranchiseId);
            setCloneNotification(
              `Cloned ${result.totalItems} dishes & ${result.categoriesCount} categories from ${result.sourceFranchiseName} into ${result.targetFranchiseName}. You are now viewing ${result.targetFranchiseName}'s menu!`
            );
          }}
        />
      )}
    </div>
  );
};
