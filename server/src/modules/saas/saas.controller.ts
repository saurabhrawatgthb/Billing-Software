import type { Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "../../middleware/auth.js";
import {
  getAllOrganizations,
  updateOrganizationPlan,
  getAllDemoRequests,
  updateDemoRequestStatus,
  getPlatformOverviewStats,
  getAllCoupons,
  createCoupon,
} from "./saas.service.js";

export async function listOrganizations(_req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const orgs = await getAllOrganizations();
    return res.json({ success: true, data: orgs });
  } catch (error) {
    next(error);
  }
}

export async function getOverviewStats(_req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const stats = await getPlatformOverviewStats();
    return res.json({ success: true, data: stats });
  } catch (error) {
    next(error);
  }
}

export async function patchOrganization(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const id = String(req.params.id);
    const adminUserId = req.user?.userId;
    const updated = await updateOrganizationPlan(id, req.body, adminUserId);
    return res.json({
      success: true,
      data: updated,
      message: "Organization subscription updated successfully",
    });
  } catch (error) {
    next(error);
  }
}

export async function listCoupons(_req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const coupons = await getAllCoupons();
    return res.json({ success: true, data: coupons });
  } catch (error) {
    next(error);
  }
}

export async function handleCreateCoupon(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { code, description, discountType, discountValue, maxRedemptions, campaignTag, validUntil } = req.body;
    if (!code || !description || !discountType || discountValue === undefined) {
      return res.status(400).json({
        success: false,
        message: "Code, description, discountType, and discountValue are required.",
      });
    }

    const created = await createCoupon({
      code,
      description,
      discountType,
      discountValue,
      maxRedemptions,
      campaignTag,
      validUntil,
    });

    return res.status(201).json({
      success: true,
      data: created,
      message: "Coupon created successfully",
    });
  } catch (error) {
    next(error);
  }
}

export async function listDemoRequests(_req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const leads = await getAllDemoRequests();
    return res.json({ success: true, data: leads });
  } catch (error) {
    next(error);
  }
}

export async function patchDemoRequest(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const id = String(req.params.id);
    const { status, notes } = req.body;
    const updated = await updateDemoRequestStatus(id, status, notes);
    return res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
}
