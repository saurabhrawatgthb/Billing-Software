import { useQuery } from "@tanstack/react-query";
import { api } from "../services/api.js";
import { useAuthStore } from "../store/authStore.js";

export interface UserPermissions {
  isSuperAdmin: boolean;
  canEditMenu: boolean;
  canEditPrices: boolean;
  canVoidBills: boolean;
  canManageInventory: boolean;
  canManageEmployees: boolean;
  canViewReports: boolean;
  canManageCRM: boolean;
  canManagePrinters: boolean;
  canManageTables: boolean;
  canApplyDiscounts: boolean;
  maxDiscountPercent: number;
}

export function usePermissions(): UserPermissions {
  const { user, selectedFranchiseId } = useAuthStore();
  const franchiseId = selectedFranchiseId || user?.franchiseId;
  const isSuperAdmin = user?.role === "SUPER_ADMIN";

  const { data: perm } = useQuery({
    queryKey: ["role-permissions", franchiseId],
    queryFn: async () => {
      if (isSuperAdmin) return null;
      const url = franchiseId ? `/permissions?franchiseId=${franchiseId}` : "/permissions";
      const res = await api.get(url);
      return res.data.data;
    },
    enabled: !!user && !isSuperAdmin,
    staleTime: 5000,
  });

  return {
    isSuperAdmin,
    canEditMenu: isSuperAdmin || (perm?.canEditMenu ?? true),
    canEditPrices: isSuperAdmin || (perm?.canEditPrices ?? true),
    canVoidBills: isSuperAdmin || (perm?.canVoidBills ?? false),
    canManageInventory: isSuperAdmin || (perm?.canManageInventory ?? true),
    canManageEmployees: isSuperAdmin || (perm?.canManageEmployees ?? true),
    canViewReports: isSuperAdmin || (perm?.canViewReports ?? true),
    canManageCRM: isSuperAdmin || (perm?.canManageCRM ?? true),
    canManagePrinters: isSuperAdmin || (perm?.canManagePrinters ?? true),
    canManageTables: isSuperAdmin || (perm?.canManageTables ?? true),
    canApplyDiscounts: isSuperAdmin || (perm?.canApplyDiscounts ?? true),
    maxDiscountPercent: isSuperAdmin ? 100 : (perm?.maxDiscountPercent ?? 20),
  };
}
