import type { Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "../../middleware/auth.js";
import {
  getAllOrganizations,
  updateOrganizationPlan,
  getAllDemoRequests,
  updateDemoRequestStatus,
} from "./saas.service.js";

export async function listOrganizations(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const list = await getAllOrganizations();
    return res.json({ success: true, data: list });
  } catch (error) {
    next(error);
  }
}

export async function updateOrg(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const id = req.params.id as string;
    const updated = await updateOrganizationPlan(id, req.body);
    return res.json({
      success: true,
      data: updated,
      message: "Restaurant tenant subscription & plan updated successfully",
    });
  } catch (error) {
    next(error);
  }
}

export async function listDemoRequests(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const leads = await getAllDemoRequests();
    return res.json({ success: true, data: leads });
  } catch (error) {
    next(error);
  }
}

export async function updateLeadStatus(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const id = req.params.id as string;
    const { status, notes } = req.body;
    const updated = await updateDemoRequestStatus(id, status, notes);
    return res.json({
      success: true,
      data: updated,
      message: "Demo lead status updated successfully",
    });
  } catch (error) {
    next(error);
  }
}
