import type { Response, NextFunction } from "express";
import { z } from "zod";
import type { AuthenticatedRequest } from "../../middleware/auth.js";
import {
  closeRegister,
  getCurrentRegister,
  getRegisterHistory,
  openRegister,
} from "./register.service.js";

const openSchema = z.object({
  franchiseId: z.string().optional(),
  openingFloat: z.number().min(0, "Opening float cannot be negative").default(0),
  notes: z.string().optional(),
});

const closeSchema = z.object({
  registerId: z.string().min(1, "Register ID is required"),
  closingCash: z.number().min(0, "Closing cash cannot be negative"),
  notes: z.string().optional(),
});

export async function getCurrent(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const franchiseId =
      (req.query.franchiseId as string) ||
      (req.headers["x-franchise-id"] as string) ||
      req.user?.franchiseId;

    if (!franchiseId) {
      return res.json({ success: true, data: null });
    }

    const register = await getCurrentRegister(franchiseId);
    return res.json({ success: true, data: register });
  } catch (error) {
    next(error);
  }
}

export async function open(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { franchiseId: bodyFranchiseId, openingFloat, notes } = openSchema.parse(req.body);
    const franchiseId =
      bodyFranchiseId ||
      (req.headers["x-franchise-id"] as string) ||
      req.user?.franchiseId;

    if (!franchiseId) {
      return res.status(400).json({ success: false, message: "Franchise ID is required" });
    }

    const register = await openRegister(franchiseId, req.user!.userId, openingFloat, notes);
    return res.status(201).json({ success: true, data: register });
  } catch (error) {
    next(error);
  }
}

export async function close(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { registerId, closingCash, notes } = closeSchema.parse(req.body);
    const register = await closeRegister(registerId, req.user!.userId, closingCash, notes);
    return res.json({ success: true, data: register });
  } catch (error) {
    next(error);
  }
}

export async function history(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const franchiseId =
      (req.query.franchiseId as string) ||
      (req.headers["x-franchise-id"] as string) ||
      (req.user?.role !== "SUPER_ADMIN" ? req.user?.franchiseId : undefined);

    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 30;
    const historyList = await getRegisterHistory(franchiseId || null, limit);
    return res.json({ success: true, data: historyList });
  } catch (error) {
    next(error);
  }
}
