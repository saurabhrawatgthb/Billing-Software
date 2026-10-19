import { Router } from "express";
import { authenticate, authorizeRole, authorizeWithPermission } from "../../middleware/auth.js";
import { UserRole } from "@prisma/client";
import {
  getInventoryItemsHandler,
  createInventoryItemHandler,
  updateInventoryItemHandler,
  stockInHandler,
  adjustStockHandler,
  getTransactionsHandler,
  getStatsHandler,
} from "./inventory.controller.js";

const router = Router();

router.use(authenticate);

// List & Stats - Cashier, Chef, Manager, Super Admin
router.get("/", authorizeRole(UserRole.SUPER_ADMIN, UserRole.FRANCHISE_MANAGER, UserRole.CASHIER, UserRole.CHEF), getInventoryItemsHandler);
router.get("/stats", authorizeRole(UserRole.SUPER_ADMIN, UserRole.FRANCHISE_MANAGER, UserRole.CASHIER), getStatsHandler);
router.get("/transactions", authorizeRole(UserRole.SUPER_ADMIN, UserRole.FRANCHISE_MANAGER, UserRole.CASHIER), getTransactionsHandler);

// Stock-In (Cashier and Manager with permission can log fresh inventory)
router.post("/stock-in", authorizeWithPermission("canManageInventory", "CASHIER"), stockInHandler);

// Create item, update, adjust (Protected by canManageInventory permission)
router.post("/", authorizeWithPermission("canManageInventory"), createInventoryItemHandler);
router.put("/:id", authorizeWithPermission("canManageInventory"), updateInventoryItemHandler);
router.post("/adjust", authorizeWithPermission("canManageInventory", "CASHIER"), adjustStockHandler);

export default router;