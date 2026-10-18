import type { Response, NextFunction } from "express";
import { z } from "zod";
import { UserRole } from "@prisma/client";
import type { AuthenticatedRequest } from "../../middleware/auth.js";
import {
  getPermissionsForRole,
  listAllPermissions,
  updatePermissionsForRole,
} from "./permission.service.js";

const updatePermissionSchema = z.object({
  franchiseId: z.string().nullable().optional(),
  role: z.nativeEnum(UserRole).default(UserRole.FRANCHISE_MANAGER),
  canEditMenu: z.boolean().optional(),
  canEditPrices: z.boolean().optional(),
  canVoidBills: z.boolean().optional(),
  canManageInventory: z.boolean().optional(),
  canManageEmployees: z.boolean().optional(),
  canViewReports: z.boolean().optional(),
  canManageCRM: z.boolean().optional(),
  canManagePrinters: z.boolean().optional(),
  canManageTables: z.boolean().optional(),
  canApplyDiscounts: z.boolean().optional(),
  maxDiscountPercent: z.number().min(0).max(100).optional(),
});

export async function getPermissions(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const franchiseId = (req.query.franchiseId as string) || req.user?.franchiseId || null;
    const roleParam = (req.query.role as UserRole) || UserRole.FRANCHISE_MANAGER;
    const permissions = await getPermissionsForRole(franchiseId, roleParam);
    return res.json({ success: true, data: permissions });
  } catch (error) {
    next(error);
  }
}

export async function getAll(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const permissions = await listAllPermissions();
    return res.json({ success: true, data: permissions });
  } catch (error) {
    next(error);
  }
}

export async function updatePermissions(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const validated = updatePermissionSchema.parse(req.body);
    const targetFranchiseId =
      req.user?.role === "SUPER_ADMIN" ? validated.franchiseId : req.user?.franchiseId;

    const result = await updatePermissionsForRole(
      targetFranchiseId,
      validated.role,
      validated,
      req.user?.userId
    );

    return res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}
