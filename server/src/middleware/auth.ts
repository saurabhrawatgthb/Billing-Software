import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

function getJwtSecret() {
  return process.env.JWT_SECRET ?? "development-secret";
}

export interface AuthenticatedUser {
  userId: string;
  id?: string;
  role: string;
  franchiseId: string | null;
  name?: string;
  email?: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

export function authenticate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, getJwtSecret());

    if (typeof decoded !== "object" || !decoded) {
      return res.status(401).json({
        success: false,
        message: "Invalid authentication token",
      });
    }

    const payload = decoded as any;
    req.user = {
      userId: payload.userId || payload.id,
      id: payload.userId || payload.id,
      role: payload.role,
      franchiseId: payload.franchiseId,
      name: payload.name,
      email: payload.email,
    };
    next();
  } catch {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired authentication token",
    });
  }
}

export function authorize(...roles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to perform this action",
      });
    }
    next();
  };
}

export const authorizeRole = authorize;

/**
 * Evaluates dynamic role permissions configured by Super Admin (e.g. canEditMenu, canEditPrices, canVoidBills).
 * - SUPER_ADMIN is always authorized.
 * - FRANCHISE_MANAGER is checked against active franchise RolePermission in the database.
 * - extraRoles (e.g. CHEF) can also be authorized if specified.
 */
export function authorizeWithPermission(
  permissionKey: keyof import("../modules/permission/permission.service.js").PermissionSettings,
  ...extraRoles: string[]
) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    // Super Admin has all permissions globally
    if (req.user.role === "SUPER_ADMIN" || extraRoles.includes(req.user.role)) {
      return next();
    }

    if (req.user.role === "FRANCHISE_MANAGER") {
      try {
        const { getPermissionsForRole } = await import("../modules/permission/permission.service.js");
        const franchiseId = getFranchiseId(req) || req.user.franchiseId;
        const perms = await getPermissionsForRole(franchiseId, req.user.role as any);
        if (perms && (perms as any)[permissionKey]) {
          return next();
        }
      } catch (err) {
        console.warn("Permission check error:", err);
      }
    }

    return res.status(403).json({
      success: false,
      message: `You do not have permission to perform this action (${String(permissionKey)})`,
    });
  };
}

export function getFranchiseId(req: AuthenticatedRequest): string | null {
  if (req.user?.role === "SUPER_ADMIN") {
    const queryFranchise = req.query.franchiseId;
    if (
      typeof queryFranchise === "string" &&
      queryFranchise.trim() !== "" &&
      queryFranchise !== "all" &&
      queryFranchise !== "null" &&
      queryFranchise !== "undefined"
    ) {
      return queryFranchise;
    }

    const headerFranchise = req.headers["x-franchise-id"];
    if (
      typeof headerFranchise === "string" &&
      headerFranchise.trim() !== "" &&
      headerFranchise !== "all" &&
      headerFranchise !== "null" &&
      headerFranchise !== "undefined"
    ) {
      return headerFranchise;
    }

    const bodyFranchise = (req.body as any)?.franchiseId;
    if (
      typeof bodyFranchise === "string" &&
      bodyFranchise.trim() !== "" &&
      bodyFranchise !== "all" &&
      bodyFranchise !== "null" &&
      bodyFranchise !== "undefined"
    ) {
      return bodyFranchise;
    }

    return req.user.franchiseId ?? null;
  }
  return req.user?.franchiseId ?? null;
}