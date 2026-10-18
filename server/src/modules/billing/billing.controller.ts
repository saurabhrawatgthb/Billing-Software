import type { Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "../../middleware/auth.js";
import { getFranchiseId } from "../../middleware/auth.js";
import {
  createInvoiceForOrder,
  createInvoiceSchema,
  getInvoiceById,
  listInvoices,
  markInvoiceDormant,
  markDormantSchema,
  verifyDormantInvoice,
  verifyDormantSchema,
  getGstAuditReport,
  deleteInvoice,
} from "./billing.service.js";
import { AppError } from "../../middleware/error.js";

export async function list(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const franchiseId = getFranchiseId(req);
    const filters = {
      startDate: req.query.startDate as string | undefined,
      endDate: req.query.endDate as string | undefined,
      isDormant: req.query.isDormant as string | undefined,
      dormantStatus: req.query.dormantStatus as string | undefined,
      orderSource: req.query.orderSource as string | undefined,
    };
    const invoices = await listInvoices(franchiseId, filters, req.user?.role);
    return res.json({ success: true, data: invoices });
  } catch (error) {
    next(error);
  }
}

export async function get(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const id = req.params.id as string;
    const franchiseId = getFranchiseId(req);
    const invoice = await getInvoiceById(id, franchiseId, req.user?.role);
    return res.json({ success: true, data: invoice });
  } catch (error) {
    next(error);
  }
}

export async function create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const franchiseId = getFranchiseId(req);
    if (!franchiseId) throw new AppError("Franchise ID is required", 400);
    const validated = createInvoiceSchema.parse(req.body);
    const invoice = await createInvoiceForOrder(validated, franchiseId, req.user?.userId);
    return res.status(201).json({ success: true, data: invoice });
  } catch (error) {
    next(error);
  }
}

export async function markDormant(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const id = req.params.id as string;
    const franchiseId = getFranchiseId(req);
    const validated = markDormantSchema.parse(req.body);

    const invoice = await markInvoiceDormant(
      id,
      franchiseId,
      validated.reason,
      {
        id: req.user?.id || req.user?.userId,
        name: req.user?.name || req.user?.email || "Staff Manager",
        role: req.user?.role,
      }
    );

    return res.json({
      success: true,
      data: invoice,
      message: "Bill marked as DORMANT and queued for Super Admin audit review",
    });
  } catch (error) {
    next(error);
  }
}

export async function verifyDormant(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const id = req.params.id as string;
    const validated = verifyDormantSchema.parse(req.body);

    const invoice = await verifyDormantInvoice(
      id,
      validated.action,
      validated.notes || "",
      {
        id: req.user?.id || req.user?.userId,
        name: req.user?.name || req.user?.email || "Super Admin",
        role: req.user?.role,
      }
    );

    return res.json({
      success: true,
      data: invoice,
      message: validated.action === "REINSTATE"
        ? "Bill successfully reinstated to active status"
        : "Bill void successfully verified and approved by Super Admin",
    });
  } catch (error) {
    next(error);
  }
}

export async function getGstAudit(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const franchiseId = getFranchiseId(req);
    const filters = {
      startDate: req.query.startDate as string | undefined,
      endDate: req.query.endDate as string | undefined,
      includeDormant: req.query.includeDormant as string | undefined,
    };

    const report = await getGstAuditReport(franchiseId, filters, req.user?.role);
    return res.json({
      success: true,
      data: report,
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteInvoiceHandler(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const id = req.params.id as string;
    const franchiseId = req.user?.role === "SUPER_ADMIN" ? null : getFranchiseId(req);
    const result = await deleteInvoice(id, franchiseId, req.user?.id || req.user?.userId);
    return res.json({
      success: true,
      data: result,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
}

