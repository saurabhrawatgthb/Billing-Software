import { Router } from "express";
import { authenticate, authorize, authorizeWithPermission } from "../../middleware/auth.js";
import {
  searchCustomers,
  lookupByPhone,
  getCustomer,
  createCustomer,
  updateCustomer,
  getAnalytics,
  recalculateSegments,
  listCampaigns,
  createCampaign,
  previewCampaign,
  executeCampaign,
  listLogs,
} from "./crm.controller.js";

const router = Router();

// Protect all CRM endpoints
router.use(authenticate);

// Quick POS Lookup (accessible by Cashier, Waiter, Manager, Super Admin)
router.get("/lookup", authorize("SUPER_ADMIN", "FRANCHISE_MANAGER", "CASHIER", "WAITER"), lookupByPhone);

// Customer Creation (accessible at POS or Manager portal)
router.post(
  "/customers",
  authorize("SUPER_ADMIN", "FRANCHISE_MANAGER", "CASHIER", "WAITER"),
  createCustomer
);

// Customer Directory & Profiles (Manager and Super Admin)
router.get("/customers", authorize("SUPER_ADMIN", "FRANCHISE_MANAGER"), searchCustomers);
router.get("/customers/:id", authorize("SUPER_ADMIN", "FRANCHISE_MANAGER"), getCustomer);
router.put("/customers/:id", authorizeWithPermission("canManageCRM"), updateCustomer);

// RFM Analytics & Segment Recalculation
router.get("/analytics", authorize("SUPER_ADMIN", "FRANCHISE_MANAGER"), getAnalytics);
router.post("/recalculate-segments", authorizeWithPermission("canManageCRM"), recalculateSegments);

// Campaigns & Automations
router.get("/campaigns", authorize("SUPER_ADMIN", "FRANCHISE_MANAGER"), listCampaigns);
router.post("/campaigns", authorizeWithPermission("canManageCRM"), createCampaign);
router.post("/campaigns/preview", authorizeWithPermission("canManageCRM"), previewCampaign);
router.post("/campaigns/:id/execute", authorizeWithPermission("canManageCRM"), executeCampaign);

// Audit & Communication Logs
router.get("/logs", authorize("SUPER_ADMIN", "FRANCHISE_MANAGER"), listLogs);

export default router;
