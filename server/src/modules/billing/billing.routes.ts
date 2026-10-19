import { Router } from "express";
import { authenticate, authorize, authorizeWithPermission } from "../../middleware/auth.js";
import {
  create,
  get,
  list,
  markDormant,
  verifyDormant,
  getGstAudit,
  deleteInvoiceHandler,
  fastBillHandler,
} from "./billing.controller.js";

const router = Router();

router.use(authenticate);

// High-speed POS atomic fast billing & printing
router.post("/fast-bill", authorize("SUPER_ADMIN", "FRANCHISE_MANAGER", "CASHIER"), fastBillHandler);

// Super Admin & Accountant GST Tax Audit Center
router.get("/gst-audit", authorize("SUPER_ADMIN", "ACCOUNTANT"), getGstAudit);

// Standard Invoicing
router.get("/invoices", authorize("SUPER_ADMIN", "FRANCHISE_MANAGER", "CASHIER", "ACCOUNTANT"), list);
router.get("/invoices/:id", authorize("SUPER_ADMIN", "FRANCHISE_MANAGER", "CASHIER", "ACCOUNTANT"), get);
router.post("/invoices", authorize("SUPER_ADMIN", "FRANCHISE_MANAGER", "CASHIER"), create);

// Anti-fraud dormant marking (Branch staff & Super Admin)
router.post("/invoices/:id/dormant", authorize("SUPER_ADMIN", "FRANCHISE_MANAGER", "CASHIER"), markDormant);

// Super Admin dormant audit verification & reinstatement
router.post("/invoices/:id/verify-dormant", authorize("SUPER_ADMIN"), verifyDormant);

// Permanent bill deletion (Super Admin or authorized Franchise Manager)
router.delete("/invoices/:id", authorizeWithPermission("canVoidBills"), deleteInvoiceHandler);

export default router;
