import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import type { AuthenticatedRequest } from "../../middleware/auth.js";
import { getCurrentUser, loginUser } from "./auth.service.js";

const loginSchema = z.object({
  email: z.string().trim().email("Please provide a valid email address"),
  password: z.string().min(1, "Password is required"),
  selectedAccountId: z.string().optional(),
});

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password, selectedAccountId } = loginSchema.parse(req.body);
    const data = await loginUser(email, password, selectedAccountId);
    return res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function me(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user?.userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    const user = await getCurrentUser(req.user.userId);
    return res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
}

export async function getLinkedProfiles(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user?.userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    const currentUser = await getCurrentUser(req.user.userId);
    const accounts = await (await import("./auth.service.js")).getLinkedAccounts(currentUser.email);
    return res.json({ success: true, data: accounts });
  } catch (error) {
    next(error);
  }
}

const switchSchema = z.object({
  targetAccountId: z.string().min(1, "Target account ID is required"),
});

export async function switchProfile(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user?.userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    const { targetAccountId } = switchSchema.parse(req.body);
    const data = await (await import("./auth.service.js")).switchUserAccount(req.user.userId, targetAccountId);
    return res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}