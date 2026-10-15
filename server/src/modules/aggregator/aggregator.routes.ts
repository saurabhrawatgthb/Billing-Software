import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth.js";
import {
  getSettings,
  updateSettings,
  getPendingOrders,
  acceptOrder,
  rejectOrder,
  simulateOrder,
  webhookIngest,
} from "./aggregator.controller.js";

const router = Router();

// Public webhook ingestion endpoint for external Swiggy / Zomato cloud servers
router.post("/webhook/:platform/:franchiseId", webhookIngest);

// Protected endpoints for restaurant staff & admin
router.use(authenticate);

router.get("/settings", authorize("SUPER_ADMIN", "FRANCHISE_MANAGER"), getSettings);
router.put("/settings", authorize("SUPER_ADMIN", "FRANCHISE_MANAGER"), updateSettings);

router.get("/pending", authorize("SUPER_ADMIN", "FRANCHISE_MANAGER", "CASHIER"), getPendingOrders);
router.post("/orders/:orderId/accept", authorize("SUPER_ADMIN", "FRANCHISE_MANAGER", "CASHIER"), acceptOrder);
router.post("/orders/:orderId/reject", authorize("SUPER_ADMIN", "FRANCHISE_MANAGER", "CASHIER"), rejectOrder);
router.post("/simulate", authorize("SUPER_ADMIN", "FRANCHISE_MANAGER", "CASHIER"), simulateOrder);

export default router;
