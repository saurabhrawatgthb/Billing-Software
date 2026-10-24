import type { Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "./auth.js";
import prisma from "../lib/prisma.js";

/**
 * Validates that the active tenant's subscription includes the requested feature entitlement.
 * Platform SUPER_ADMIN bypasses entitlement checks.
 */
export function requireFeature(featureKey: string) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ success: false, message: "Authentication required" });
      }

      // Platform Super Admin has universal access
      if (user.role === "SUPER_ADMIN" && !user.organizationId) {
        return next();
      }

      if (!user.organizationId) {
        return next(); // Standalone or unlinked account
      }

      const org = await prisma.organization.findUnique({
        where: { id: user.organizationId },
        include: { commercialPlan: true },
      });

      if (!org) {
        return res.status(403).json({ success: false, message: "Organization not found" });
      }

      // Check if subscription has expired
      if (org.subscriptionStatus === "EXPIRED" || org.subscriptionStatus === "CANCELLED") {
        return res.status(403).json({
          success: false,
          code: "SUBSCRIPTION_EXPIRED",
          message: "Your restaurant subscription has expired. Please renew to access this module.",
          upgradeUrl: "/pricing",
        });
      }

      // Check feature entitlements
      const planFeatures: string[] = org.commercialPlan?.features || [];
      const customFeatures: string[] = (org.featureFlags as any)?.features || [];
      const effectiveFeatures = new Set([...planFeatures, ...customFeatures]);

      if (effectiveFeatures.size > 0 && !effectiveFeatures.has(featureKey)) {
        return res.status(403).json({
          success: false,
          code: "FEATURE_LOCKED",
          requiredFeature: featureKey,
          message: `The '${featureKey}' module is not included in your active '${org.commercialPlan?.name || org.plan}' subscription. Upgrade to unlock.`,
          upgradeUrl: "/pricing",
        });
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Checks outlet/branch count against plan limits before creating a new franchise
 */
export async function checkOutletLimit(organizationId: string): Promise<boolean> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    include: {
      commercialPlan: true,
      _count: { select: { franchises: true } },
    },
  });

  if (!org) return false;

  const maxOutlets = org.commercialPlan?.includedOutlets || 1;
  return org._count.franchises < maxOutlets;
}
