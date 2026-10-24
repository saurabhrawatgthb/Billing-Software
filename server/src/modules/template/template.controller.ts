import type { Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "../../middleware/auth.js";
import { getTemplates, getDefaultTemplate, upsertTemplate } from "./template.service.js";

export async function listTemplates(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const orgId = req.user?.organizationId;
    if (!orgId) {
      return res.status(400).json({ success: false, message: "Organization required" });
    }
    const templates = await getTemplates(orgId);
    return res.json({ success: true, data: templates });
  } catch (error) {
    next(error);
  }
}

export async function getActiveTemplate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const orgId = req.user?.organizationId;
    if (!orgId) {
      return res.status(400).json({ success: false, message: "Organization required" });
    }
    const template = await getDefaultTemplate(orgId);
    return res.json({ success: true, data: template });
  } catch (error) {
    next(error);
  }
}

export async function saveTemplate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const orgId = req.user?.organizationId;
    if (!orgId) {
      return res.status(400).json({ success: false, message: "Organization required" });
    }
    const template = await upsertTemplate(orgId, req.body);
    return res.json({
      success: true,
      data: template,
      message: "Receipt template saved successfully",
    });
  } catch (error) {
    next(error);
  }
}
