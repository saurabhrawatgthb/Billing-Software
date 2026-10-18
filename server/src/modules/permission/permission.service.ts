import { UserRole } from "@prisma/client";
import prisma from "../../lib/prisma.js";
import { logAudit } from "../../lib/audit.js";
import { emitToFranchise, broadcastEvent } from "../../lib/socket.js";

export interface PermissionSettings {
  canEditMenu?: boolean;
  canEditPrices?: boolean;
  canVoidBills?: boolean;
  canManageInventory?: boolean;
  canManageEmployees?: boolean;
  canViewReports?: boolean;
  canManageCRM?: boolean;
  canManagePrinters?: boolean;
  canManageTables?: boolean;
  canApplyDiscounts?: boolean;
  maxDiscountPercent?: number;
}

const DEFAULT_PERMISSIONS = {
  canEditMenu: true,
  canEditPrices: true,
  canVoidBills: false,
  canManageInventory: true,
  canManageEmployees: true,
  canViewReports: true,
  canManageCRM: true,
  canManagePrinters: true,
  canManageTables: true,
  canApplyDiscounts: true,
  maxDiscountPercent: 20.0,
};

export async function getPermissionsForRole(
  franchiseId: string | null | undefined,
  role: UserRole = UserRole.FRANCHISE_MANAGER
) {
  if (franchiseId) {
    const custom = await prisma.rolePermission.findFirst({
      where: {
        franchiseId,
        role,
      },
    });
    if (custom) return custom;
  }

  // Fallback to global defaults if any configured
  const globalDef = await prisma.rolePermission.findFirst({
    where: {
      franchiseId: null,
      role,
    },
  });

  if (globalDef) return globalDef;

  return {
    id: "default",
    franchiseId: franchiseId ?? null,
    role,
    ...DEFAULT_PERMISSIONS,
  };
}

export async function listAllPermissions() {
  const permissions = await prisma.rolePermission.findMany({
    include: {
      franchise: {
        select: { id: true, name: true, code: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  return permissions;
}

export async function updatePermissionsForRole(
  franchiseId: string | null | undefined,
  role: UserRole,
  settings: PermissionSettings,
  currentUserId?: string
) {
  const fId = franchiseId || null;

  const existing = await prisma.rolePermission.findFirst({
    where: {
      franchiseId: fId,
      role,
    },
  });

  let saved;
  if (existing) {
    saved = await prisma.rolePermission.update({
      where: { id: existing.id },
      data: {
        canEditMenu: settings.canEditMenu ?? existing.canEditMenu,
        canEditPrices: settings.canEditPrices ?? existing.canEditPrices,
        canVoidBills: settings.canVoidBills ?? existing.canVoidBills,
        canManageInventory: settings.canManageInventory ?? existing.canManageInventory,
        canManageEmployees: settings.canManageEmployees ?? existing.canManageEmployees,
        canViewReports: settings.canViewReports ?? existing.canViewReports,
        canManageCRM: settings.canManageCRM ?? existing.canManageCRM,
        canManagePrinters: settings.canManagePrinters ?? existing.canManagePrinters,
        canManageTables: settings.canManageTables ?? existing.canManageTables,
        canApplyDiscounts: settings.canApplyDiscounts ?? existing.canApplyDiscounts,
        maxDiscountPercent: settings.maxDiscountPercent ?? existing.maxDiscountPercent,
      },
      include: {
        franchise: { select: { id: true, name: true, code: true } },
      },
    });
  } else {
    saved = await prisma.rolePermission.create({
      data: {
        franchiseId: fId,
        role,
        canEditMenu: settings.canEditMenu ?? DEFAULT_PERMISSIONS.canEditMenu,
        canEditPrices: settings.canEditPrices ?? DEFAULT_PERMISSIONS.canEditPrices,
        canVoidBills: settings.canVoidBills ?? DEFAULT_PERMISSIONS.canVoidBills,
        canManageInventory: settings.canManageInventory ?? DEFAULT_PERMISSIONS.canManageInventory,
        canManageEmployees: settings.canManageEmployees ?? DEFAULT_PERMISSIONS.canManageEmployees,
        canViewReports: settings.canViewReports ?? DEFAULT_PERMISSIONS.canViewReports,
        canManageCRM: settings.canManageCRM ?? DEFAULT_PERMISSIONS.canManageCRM,
        canManagePrinters: settings.canManagePrinters ?? DEFAULT_PERMISSIONS.canManagePrinters,
        canManageTables: settings.canManageTables ?? DEFAULT_PERMISSIONS.canManageTables,
        canApplyDiscounts: settings.canApplyDiscounts ?? DEFAULT_PERMISSIONS.canApplyDiscounts,
        maxDiscountPercent: settings.maxDiscountPercent ?? DEFAULT_PERMISSIONS.maxDiscountPercent,
      },
      include: {
        franchise: { select: { id: true, name: true, code: true } },
      },
    });
  }

  await logAudit({
    franchiseId: fId,
    userId: currentUserId,
    action: "UPDATE_PERMISSIONS",
    entity: "RolePermission",
    entityId: saved.id,
    newData: settings,
  });

  if (fId) {
    emitToFranchise(fId, "permissions:updated", saved);
  } else {
    broadcastEvent("permissions:updated", saved);
  }

  return saved;
}
